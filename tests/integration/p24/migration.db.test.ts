import { it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, migrationStatus } from '@shahn/database';
import { profitFixture } from './fixtures.js';
it('additive0028 upgrades populated0027 without changing sources, money, payroll or grants and is idempotent', async () => {
  const db = await isolatedPostgres();
  try {
    const all = await readMigrations();
    await migrate(
      db.pool,
      all.filter((m) => m.version < '0028'),
    );
    const f = await profitFixture(db.pool);
    const tables = [
      'kernel.journal_effect',
      'kernel.source_record',
      'kernel.lot_allocation',
      'execution.visit_fact',
      'finance.paid_cost',
      'employees.payroll_period',
      'employees.payroll_obligation',
      'storage.period',
      'storage.allocation',
      'access.role_grant',
    ];
    const capture = async () =>
      Object.fromEntries(
        await Promise.all(
          tables.map(async (t) => [
            t,
            createHash('sha256')
              .update(
                JSON.stringify(
                  (
                    await db.pool.query(
                      `SELECT to_jsonb(t) AS row FROM ${t} t ORDER BY to_jsonb(t)::text`,
                    )
                  ).rows,
                ),
              )
              .digest('hex'),
          ]),
        ),
      );
    const before = await capture();
    const applied = await migrate(db.pool);
    expect(await capture()).toEqual(before);
    expect(await migrate(db.pool)).toEqual(applied);
    expect((await migrationStatus(db.pool)).state).toBe('current');
    const result = await f.report();
    expect((result.snapshot.context['profit'] as { profitMinor: string }).profitMinor).toBe(
      '620000',
    );
    await mkdir('docs/verification/P24', { recursive: true });
    await writeFile(
      'docs/verification/P24/migration.json',
      JSON.stringify(
        { applied, unchangedSourceHashes: before, snapshotId: result.snapshot.id },
        null,
        2,
      ),
    );
  } finally {
    await db.dispose();
  }
}, 120000);
