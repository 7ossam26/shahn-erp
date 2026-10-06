import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type { FinanceResult } from '@shahn/contracts';
import { accessFixture } from '../../support/access.js';
import { seedCommercial } from '../../../apps/api/src/modules/brands/seed.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { JournalPosting } from '../../../apps/api/src/modules/kernel/journals.js';
import { WalletService } from '../../../apps/api/src/modules/kernel/wallet.js';
import { walletTotals } from '../../../apps/api/src/modules/finance/brand-wallet/queries.js';
import { BrandWalletService } from '../../../apps/api/src/modules/finance/brand-wallet/wallet.service.js';
it('populated P16 upgrade adds payout tables only: no eligibility, payout or balance change; projections reconcile to lots', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(
      db.pool,
      (await readMigrations()).filter((m) => m.version < '0021'),
    );
    const f = await accessFixture(db.pool);
    const seed = await seedCommercial(db.pool, f.admin.token, f.company, f.a, 'test');
    const cash = (
      (
        await financeCommands(db.pool).execute(f.admin.token, {
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
    await financeCommands(db.pool).execute(f.admin.token, {
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
    // Pre-P17 wallet state: one eligible lot, one pending lot and a partially offset debit.
    const record = (
      await db.pool.query('SELECT id FROM command_record WHERE company_id=$1 LIMIT 1', [f.company])
    ).rows[0].id as string;
    for (const [kind, amount, readiness] of [
      ['opening', '12000', 'eligible'],
      ['opening', '8000', 'pending'],
      ['fee', '-3000', null],
    ] as const)
      await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brands', async (u) => {
        const p = new JournalPosting(u),
          s = await p.source(
            { system: 'p17-upgrade-fixture', identity: randomUUID(), kind, revision: '1' },
            { amount },
          );
        await p.lock('brand', seed.brand);
        const posted = await p.append(s.id, record, [
          {
            family: 'brand',
            kind,
            subjectId: seed.brand,
            amountMinor: amount,
            branchId: f.a,
            effectiveDate: cairoDate(new Date()),
            supersedesId: null,
            reason: kind === 'opening' ? 'Pre-P17 isolated wallet state' : null,
          } as never,
        ]);
        const w = new WalletService(u, seed.brand);
        if (readiness) await w.credit(posted.ids[0]!, readiness);
        else await w.offsetDebits();
      });
    const capture = async () => {
      const result: Record<string, unknown> = {};
      for (const table of [
        'finance.account',
        'finance.account_balance',
        'finance.money_movement',
        'kernel.credit_lot',
        'kernel.credit_release',
        'kernel.lot_allocation',
        'kernel.wallet_hold',
        'kernel.shipping_cover',
        'kernel.journal_effect',
        'command_record',
        'access.role_grant',
      ])
        result[table] = (
          await db.pool.query(
            `SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`,
          )
        ).rows;
      return result;
    };
    const before = await capture();
    const status = await migrate(db.pool);
    expect(status.state).toBe('current');
    expect(await capture()).toEqual(before);
    expect((await db.pool.query('SELECT * FROM finance.brand_payout')).rowCount).toBe(0);
    expect((await db.pool.query('SELECT * FROM finance.payout_allocation')).rowCount).toBe(0);
    expect(
      (
        await db.pool.query(
          `SELECT implemented FROM access.screen_capability WHERE id='brand.payout'`,
        )
      ).rows[0].implemented,
    ).toBe(true);
    const totals = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', (u) =>
      walletTotals(u),
    );
    const locked = await UnitOfWork.run(
      db.pool,
      f.admin.token,
      f.company,
      'brand.payout',
      async (u) => {
        await BrandWalletService.lock(u, [seed.brand]);
        const w = new BrandWalletService(u, seed.brand);
        return { amounts: await w.amounts(), reconciliation: await w.reconcile() };
      },
    );
    expect(locked.amounts).toMatchObject({
      eligibleMinor: '9000',
      pendingMinor: '8000',
      debitsMinor: '0',
      signedEntitlementMinor: '17000',
      eligibleToPayMinor: '9000',
      paidMinor: '0',
    });
    expect(totals.get(seed.brand)).toEqual(locked.amounts);
    expect(locked.reconciliation).toEqual({
      journalMinor: '17000',
      lotModelMinor: '17000',
      reconciled: true,
    });
  } finally {
    await db.dispose();
  }
});
