import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { executionFixture } from '../p13/fixtures.js';
it('populated P17 upgrade preserves ordinary source money/custody/journals without compensation or waiver backfill', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(
      db.pool,
      (await readMigrations()).filter((m) => m.version < '0022'),
    );
    const f = await executionFixture(db.pool);
    await f.received();
    const capture = async () => {
      const data: Record<string, unknown> = {};
      for (const table of [
        'shipments.shipment',
        'shipments.price_snapshot',
        'shipments.parcel_custody',
        'kernel.journal_effect',
        'kernel.credit_lot',
        'dispatch.cycle',
        'command_record',
        'access.role_grant',
      ])
        data[table] = (
          await db.pool.query(`SELECT to_jsonb(t) row FROM ${table} t ORDER BY to_jsonb(t)::text`)
        ).rows;
      return data;
    };
    const before = await capture();
    expect((await migrate(db.pool)).state).toBe('current');
    expect(await capture()).toEqual(before);
    for (const table of [
      'incidents.incident',
      'incidents.replacement',
      'employees.incident_obligation',
    ])
      expect((await db.pool.query('SELECT * FROM ' + table)).rowCount).toBe(0);
  } finally {
    await db.dispose();
  }
});
