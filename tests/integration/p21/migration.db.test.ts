import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { validatePayrollMonth } from '@shahn/contracts';
import { incidentFixture } from '../p18/fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { payrollMonth } from '../../../apps/api/src/modules/employees/payroll.service.js';
import { OpeningService } from '../../../apps/api/src/modules/settlements/opening.service.js';

it('populated P20 upgrade keeps originals, money and journals unchanged; no opening or settlement is backfilled', async () => {
  const db = await isolatedPostgres();
  try {
    // Populate through code paths that exist before 0025 (P12–P18 custody, visits, incident originals).
    await migrate(
      db.pool,
      (await readMigrations()).filter((m) => m.version < '0025'),
    );
    const f = await incidentFixture(db.pool, 'http://127.0.0.1:5426'),
      x = await f.shipment(),
      r = await f.report(x.s.shipmentId);
    await f.confirm(r.result.incidentId);
    const snapshot = async () => ({
      obligations: (
        await db.pool.query(
          'SELECT row_to_json(o) r FROM employees.payroll_obligation o WHERE company_id=$1 ORDER BY id',
          [f.company],
        )
      ).rows,
      movements: (
        await db.pool.query(
          'SELECT row_to_json(m) r FROM finance.money_movement m WHERE company_id=$1 ORDER BY id',
          [f.company],
        )
      ).rows,
      effects: (
        await db.pool.query(
          'SELECT row_to_json(j) r FROM kernel.journal_effect j WHERE company_id=$1 ORDER BY id',
          [f.company],
        )
      ).rows,
      lots: (
        await db.pool.query(
          'SELECT row_to_json(l) r FROM kernel.credit_lot l WHERE company_id=$1 ORDER BY id',
          [f.company],
        )
      ).rows,
      balances: (
        await db.pool.query(
          'SELECT row_to_json(b) r FROM finance.account_balance b WHERE company_id=$1 ORDER BY account_id',
          [f.company],
        )
      ).rows,
      stock: (
        await db.pool.query(
          'SELECT row_to_json(s) r FROM inventory.stock_position s WHERE company_id=$1 ORDER BY branch_id,variant_id',
          [f.company],
        )
      ).rows,
    });
    const before = await snapshot();
    expect(before.obligations.length).toBeGreaterThan(0);
    const status = await migrate(db.pool);
    expect(status.state).toBe('current');
    expect(status.applied.at(-1)?.version).toBe('0025_p21_settlements');
    const after = await snapshot();
    // payroll_obligation gains one nullable original-link column; every prior value is unchanged.
    const strip = (rows: { r: Record<string, unknown> }[]) =>
      rows.map(({ r }) =>
        Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'settlement_obligation_id')),
      );
    expect(strip(after.obligations)).toEqual(strip(before.obligations));
    expect(after.obligations.every((x) => x.r.settlement_obligation_id === null)).toBe(true);
    expect({ ...after, obligations: [] }).toEqual({ ...before, obligations: [] });
    for (const table of [
      'adjustment_case',
      'resolution',
      'opening_batch',
      'opening_line',
      'account_hold',
      'employee_obligation',
    ])
      expect((await db.pool.query(`SELECT 1 FROM settlements.${table}`)).rowCount).toBe(0);
    // The upgraded company reads its P20 month (original incident obligation intact) and may
    // optionally open a balance afterwards once an administrator grants the opening screen.
    const employee = f.employee.employeeId,
      month = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }).slice(0, 7);
    const p = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'employees', (u) =>
      payrollMonth(u, employee, month),
    );
    expect(validatePayrollMonth(p)).toBe(true);
    expect(p.obligations.map((o) => o.kind)).toContain('incident');
    await db.pool.query(
      `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'opening')`,
      [f.company, f.adminRole],
    );
    const service = new OpeningService(db.pool);
    const lines = [
      {
        classification: 'brand_pending_driver_held' as const,
        brandId: (await f.read(x.s.shipmentId))!.fields.brandId,
        branchId: f.a,
        amountMinor: '1000',
      },
    ];
    const preview = await service.prepare(f.admin.token, {
      companyId: f.company,
      openingDate: month + '-01',
      lines,
    });
    expect(preview.blockers).toEqual([]);
    await service.confirm(f.admin.token, {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'opening.confirm',
      openingDate: month + '-01',
      description: 'مستحقات براند قديمة لدى المناديب غير محصلة',
      evidence: '',
      lines,
      expectedDigest: preview.digest,
    });
    await expect(
      db.pool.query('UPDATE settlements.opening_line SET amount_minor=2'),
    ).rejects.toThrow('IMMUTABLE_KERNEL_HISTORY');
    await expect(db.pool.query('DELETE FROM settlements.opening_batch')).rejects.toThrow(
      'IMMUTABLE_KERNEL_HISTORY',
    );
    const cli = await promisify(execFile)(
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
    expect(cli.stdout).toContain('0025_p21_settlements');
  } finally {
    await db.dispose();
  }
});
it('fresh migration creates the closed settlement schema and refuses an unclassified journal kind', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const caps = (
      await db.pool.query(
        `SELECT id,route,policy,implemented FROM access.screen_capability WHERE id IN ('settlements','opening') ORDER BY id`,
      )
    ).rows;
    expect(caps).toEqual([
      { id: 'opening', route: '/settings/opening-balances', policy: 'assigned', implemented: true },
      { id: 'settlements', route: '/settlements', policy: 'assigned', implemented: true },
    ]);
    const check = (
      await db.pool.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid='kernel.journal_effect'::regclass AND conname='p21_journal_classification'`,
      )
    ).rows[0].def as string;
    expect(check).toContain('adjustment');
    expect(check).not.toContain("'profit'");
  } finally {
    await db.dispose();
  }
});
