import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { cairoDate, firstBillableIndex, periodStart } from '@shahn/domain';
import type { BrandFields, FinanceResult } from '@shahn/contracts';
import { accessFixture } from '../../support/access.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { controlledStorageClock } from '../../../apps/api/src/modules/storage/clock.js';
import { StorageRenewalService } from '../../../apps/api/src/modules/storage/renewal.js';
it('populated P18 upgrade carries P04 storage configuration only: nothing paid, received or earned', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(
      db.pool,
      (await readMigrations()).filter((m) => m.version < '0023'),
    );
    const f = await accessFixture(db.pool);
    const commands = commercialCommands(db.pool);
    const run = async (input: object) =>
      (
        await commands.execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          ...input,
        } as never)
      ).body as { entityId: string };
    const tier = (
      await run({
        type: 'reference.create',
        fields: { kind: 'tier', name: 'شريحة', active: true, parentId: null, volumeRange: null },
      })
    ).entityId;
    const fields = (name: string, storage: BrandFields['storage']): BrandFields => ({
      name,
      active: true,
      contact: null,
      externalReference: null,
      services: storage ? ['brand_packed', 'stored_stock'] : ['brand_packed'],
      defaultService: 'brand_packed',
      tierId: tier,
      packingUpliftMinor: '0',
      partialDelivery: false,
      payoutWeekdays: [0, 1, 2, 3, 4, 5, 6],
      allowNegativeBalance: false,
      storage,
    });
    // P04-era data entered through the real P04 brand command (storage schema not yet installed).
    const active = (
      await run({
        type: 'brand.create',
        fields: fields('براند تخزين قائم', {
          monthlyFeeMinor: '31000',
          startDate: '2026-01-31',
          anniversaryDay: 31,
          branchId: f.a,
          active: true,
          stopDate: null,
        }),
      })
    ).entityId;
    const stopped = (
      await run({
        type: 'brand.create',
        fields: fields('براند تخزين موقوف', {
          monthlyFeeMinor: '20000',
          startDate: '2026-03-10',
          anniversaryDay: 10,
          branchId: f.b,
          active: false,
          stopDate: '2026-06-30',
        }),
      })
    ).entityId;
    const plain = (await run({ type: 'brand.create', fields: fields('براند بلا تخزين', null) }))
      .entityId;
    const money = financeCommands(db.pool);
    const cash = (
      (
        await money.execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'account.create',
          fields: {
            name: 'خزنة قائمة',
            type: 'cash',
            currency: 'EGP',
            branchIds: [f.a],
            active: true,
            bankDescription: '',
          },
        })
      ).body as FinanceResult
    ).entityId;
    await money.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'movement.create',
      fields: {
        accountId: cash,
        branchId: f.a,
        currency: 'EGP',
        amountMinor: '50000',
        actualDate: cairoDate(new Date()),
        method: 'cash',
        direction: 'deposit',
        reason: 'رصيد قبل الترقية',
      },
    });
    const capture = async () => {
      const rows: Record<string, unknown> = {};
      for (const table of [
        'commercial.brand',
        'commercial.brand_policy',
        'finance.account_balance',
        'finance.money_movement',
        'kernel.journal_effect',
        'kernel.credit_lot',
        'command_record',
      ])
        rows[table] = (
          await db.pool.query(
            `SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`,
          )
        ).rows;
      return rows;
    };
    const before = await capture();
    const today = (
      await db.pool.query<{ d: string }>(
        `SELECT (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date::text AS d`,
      )
    ).rows[0]!.d;
    const status = await migrate(db.pool);
    expect(status.state).toBe('current');
    expect(await capture()).toEqual(before);
    const agreements = (
      await db.pool.query(
        `SELECT brand_id AS "brandId",start_date::text AS start,anchor_day AS anchor,first_billable_index AS "firstBillable",
         entry_date::text AS entry,state,stop_boundary::text AS boundary,origin,version FROM storage.agreement ORDER BY start_date`,
      )
    ).rows;
    expect(agreements).toEqual([
      {
        brandId: active,
        start: '2026-01-31',
        anchor: 31,
        firstBillable: firstBillableIndex('2026-01-31', 31, today),
        entry: today,
        state: 'active',
        boundary: null,
        origin: 'p04_configuration',
        version: 1,
      },
      {
        brandId: stopped,
        start: '2026-03-10',
        anchor: 10,
        firstBillable: firstBillableIndex('2026-03-10', 10, today),
        entry: today,
        state: 'stopped',
        boundary: '2026-03-10',
        origin: 'p04_configuration',
        version: 1,
      },
    ]);
    const revisions = (
      await db.pool.query(
        `SELECT a.brand_id AS "brandId",r.revision,r.effective_period_index AS eff,r.fee_minor::text AS fee,r.branch_id AS branch,
         r.command_record_id IS NOT NULL AS authorized FROM storage.agreement_revision r JOIN storage.agreement a ON a.id=r.agreement_id ORDER BY a.start_date`,
      )
    ).rows;
    expect(revisions).toEqual([
      { brandId: active, revision: 1, eff: 0, fee: '31000', branch: f.a, authorized: true },
      { brandId: stopped, revision: 1, eff: 0, fee: '20000', branch: f.b, authorized: true },
    ]);
    for (const table of [
      'period',
      'receipt',
      'allocation',
      'refund',
      'refund_source',
      'stop_record',
    ])
      expect((await db.pool.query(`SELECT 1 FROM storage.${table}`)).rowCount).toBe(0);
    expect(
      (await db.pool.query(`SELECT brand_id FROM storage.credit_account ORDER BY brand_id`)).rows
        .map((r) => r.brand_id)
        .sort(),
    ).toEqual([active, stopped].sort());
    expect(
      (await db.pool.query(`SELECT 1 FROM storage.agreement WHERE brand_id=$1`, [plain])).rowCount,
    ).toBe(0);
    expect(
      (await db.pool.query(`SELECT implemented FROM access.screen_capability WHERE id='storage'`))
        .rows,
    ).toEqual([{ implemented: true }]);
    // The renewal worker bills only from the first period starting on/after the migration date:
    // historical anniversary periods are never fabricated.
    const firstBillable = periodStart('2026-01-31', 31, agreements[0].firstBillable);
    const renewal = new StorageRenewalService(db.pool, {
      clock: controlledStorageClock(firstBillable),
    });
    await renewal.discover();
    const outcome = await renewal.runOne();
    expect(outcome).toMatchObject({ status: 'generated', startDate: firstBillable });
    expect(await renewal.runOne()).toBeNull();
    expect(
      (await db.pool.query(`SELECT period_index,start_date::text AS start FROM storage.period`))
        .rows,
    ).toEqual([{ period_index: agreements[0].firstBillable, start: firstBillable }]);
    const dbStatus = await promisify(execFile)(
      process.execPath,
      ['packages/database/dist/cli.js', 'status'],
      {
        env: {
          ...process.env,
          APP_ENV: 'test',
          DATABASE_URL: db.url,
          MIGRATION_DATABASE_URL: db.url,
        },
      },
    );
    expect(dbStatus.stdout).toContain('"state": "current"');
    expect(dbStatus.stdout).toContain('0023_p19_storage');
    await writeFile('docs/verification/P19/migration-upgrade-db-status.txt', dbStatus.stdout);
  } finally {
    await db.dispose();
  }
});
