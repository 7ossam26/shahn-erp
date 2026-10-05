import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { accessFixture } from '../../support/access.js';
import { shipmentFields } from '../../support/shipments.js';
import { seedCommercial } from '../../../apps/api/src/modules/brands/seed.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
it('upgrades a populated P13 database without changing native identity, prices, balances or grants', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool, (await readMigrations()).slice(0, 17));
    const f = await accessFixture(db.pool),
      seed = await seedCommercial(db.pool, f.admin.token, f.company, f.a, 'test');
    await shipmentCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'shipment.confirm',
      fields: shipmentFields({ branchId: f.a, brandId: seed.brand, governorateId: seed.cairo }),
      actualReceipt: true,
      duplicateAcknowledged: false,
      expectedPolicyVersion: 1,
      expectedTariffVersion: 1,
      expectedTariffId: seed.base,
    });
    const capture = async () => {
      const rows: Record<string, unknown> = {};
      for (const table of [
        'shipments.shipment',
        'shipments.price_snapshot',
        'command_record',
        'kernel.resource',
        'kernel.journal_effect',
        'access.role_grant',
      ])
        rows[table] = (
          await db.pool.query(
            `SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`,
          )
        ).rows;
      return rows;
    };
    const before = await capture();
    await migrate(db.pool);
    expect(await capture()).toEqual(before);
    expect(
      (await db.pool.query('SELECT source_state,handed_over FROM shipments.shipment')).rows,
    ).toEqual([{ source_state: 'local', handed_over: false }]);
    expect(
      (await db.pool.query('SELECT holder,driver_id FROM shipments.parcel_custody')).rows,
    ).toEqual([{ holder: 'branch', driver_id: null }]);
    expect((await db.pool.query('SELECT * FROM returns.return_receipt')).rowCount).toBe(0);
  } finally {
    await db.dispose();
  }
});
