import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { incidentFixture } from '../p18/fixtures.js';
it('populated P19 upgrade preserves P18 original obligations and all actual money; migration fabricates no advance or salary', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(
      db.pool,
      (await readMigrations()).filter((m) => m.version < '0024'),
    );
    const f = await incidentFixture(db.pool),
      x = await f.shipment(),
      r = await f.report(x.s.shipmentId);
    await f.confirm(r.result.incidentId);
    const before = (
      await db.pool.query(
        'SELECT row_to_json(o) AS original FROM employees.incident_obligation o WHERE company_id=$1',
        [f.company],
      )
    ).rows;
    const cash = (
      await db.pool.query(
        'SELECT row_to_json(m) AS movement FROM finance.money_movement m WHERE company_id=$1 ORDER BY id',
        [f.company],
      )
    ).rows;
    const status = await migrate(db.pool);
    expect(status.state).toBe('current');
    expect(status.applied.at(-1)?.version).toBe('0024_p20_payroll');
    expect(
      (
        await db.pool.query(
          'SELECT row_to_json(o) AS original FROM employees.incident_obligation o WHERE company_id=$1',
          [f.company],
        )
      ).rows,
    ).toEqual(before);
    expect(
      (
        await db.pool.query(
          'SELECT row_to_json(m) AS movement FROM finance.money_movement m WHERE company_id=$1 ORDER BY id',
          [f.company],
        )
      ).rows,
    ).toEqual(cash);
    const original = before[0]!.original;
    expect(
      (
        await db.pool.query(
          'SELECT id,incident_obligation_id,amount_minor,outstanding_amount,reserved_for_frozen_periods,available_for_new_allocation FROM employees.obligation_balance WHERE company_id=$1',
          [f.company],
        )
      ).rows,
    ).toEqual([
      {
        id: original.id,
        incident_obligation_id: original.id,
        amount_minor: '20000',
        outstanding_amount: '20000',
        reserved_for_frozen_periods: '0',
        available_for_new_allocation: '20000',
      },
    ]);
    for (const table of ['advance', 'salary_payment', 'payroll_recovery', 'payroll_adjustment'])
      expect((await db.pool.query(`SELECT 1 FROM employees.${table}`)).rowCount).toBe(0);
    await expect(
      db.pool.query('UPDATE employees.payroll_obligation SET amount_minor=1 WHERE company_id=$1', [
        f.company,
      ]),
    ).rejects.toThrow('EMPLOYEE_HISTORY_IMMUTABLE');
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
    expect(cli.stdout).toContain('"state": "current"');
    await writeFile('docs/verification/P20/migration-status.json', cli.stdout);
  } finally {
    await db.dispose();
  }
});
