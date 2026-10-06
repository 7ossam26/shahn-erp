import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { accessFixture } from '../../support/access.js';
import { seedCommercial } from '../../../apps/api/src/modules/brands/seed.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
it('populated P15 upgrade preserves wallets, accounts, movements and identities without fictional receipts', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(
      db.pool,
      // Apply only the state before 0020; later migrations exist after P16.
      (await readMigrations()).filter((m) => m.version < '0020'),
    );
    const f = await accessFixture(db.pool);
    await seedCommercial(db.pool, f.admin.token, f.company, f.a, 'test');
    await financeCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'account.create',
      fields: {
        name: 'حساب قائم',
        type: 'cash',
        currency: 'EGP',
        branchIds: [f.a],
        active: true,
        bankDescription: '',
      },
    });
    const capture = async () => {
      const result: Record<string, unknown> = {};
      for (const table of [
        'finance.account',
        'finance.account_balance',
        'finance.money_movement',
        'kernel.credit_lot',
        'kernel.credit_release',
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
    await migrate(db.pool);
    expect(await capture()).toEqual(before);
    expect((await db.pool.query('SELECT * FROM finance.remittance')).rowCount).toBe(0);
  } finally {
    await db.dispose();
  }
});
