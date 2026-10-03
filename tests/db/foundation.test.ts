import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { createPool, migrate, migrationStatus, readMigrations, transaction } from '@shahn/database';
import { createApplication, DatabaseLifecycle } from '../../apps/api/src/app.js';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
let db: Awaited<ReturnType<typeof isolatedPostgres>>;
beforeAll(async () => {
  db = await isolatedPostgres();
});
afterAll(async () => {
  await db?.dispose();
});
describe('Real isolated PostgreSQL foundation', () => {
  it('status is read-only and reports schema missing before a migration', async () => {
    expect((await migrationStatus(db.pool)).state).toBe('missing');
    expect(
      (await db.pool.query("SELECT to_regnamespace('erp_infrastructure') AS schema")).rows[0]
        .schema,
    ).toBeNull();
  });
  it('two migration runners wait for one lock and cannot apply a migration twice', async () => {
    const blocker = await db.pool.connect();
    const other = createPool(db.url);
    await blocker.query('SELECT pg_advisory_lock(158197198)');
    const first = migrate(db.pool);
    const second = migrate(other);
    try {
      let waiting = 0;
      for (let attempt = 0; attempt < 100; attempt++) {
        waiting = Number(
          (
            await blocker.query(
              "SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND objid=158197198 AND NOT granted",
            )
          ).rows[0].count,
        );
        if (waiting === 2) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(2);
      await blocker.query('SELECT pg_advisory_unlock(158197198)');
      const result = await Promise.all([first, second]);
      expect(result.map((r) => r.state)).toEqual(['current', 'current']);
      expect(
        (await db.pool.query('SELECT count(*) FROM erp_infrastructure.migrations')).rows[0].count,
      ).toBe('1');
      expect(
        (await db.pool.query('SELECT count(*) FROM erp_infrastructure.schema_identity')).rows[0]
          .count,
      ).toBe('1');
      expect((await migrate(db.pool)).applied).toHaveLength(1);
    } finally {
      await blocker.query('SELECT pg_advisory_unlock_all()');
      blocker.release();
      await Promise.allSettled([first, second]);
      await other.end();
    }
  });
  it('rejects modified applied SQL checksum and restores only the test source fixture', async () => {
    const original = await readMigrations();
    const fixture = await mkdtemp(join(tmpdir(), 'shahn-p01-migration-'));
    let modified;
    try {
      for (const migration of original)
        await writeFile(
          join(fixture, `${migration.version}.sql`),
          migration.sql + '\n-- deliberately modified fixture',
        );
      modified = await readMigrations(pathToFileURL(fixture + '/'));
    } finally {
      for (const migration of original) await unlink(join(fixture, `${migration.version}.sql`));
      await rmdir(fixture);
    }
    await expect(migrate(db.pool, modified)).rejects.toThrow(
      'MIGRATION_CHECKSUM_OR_ORDER_MISMATCH',
    );
    expect((await migrationStatus(db.pool, modified)).state).toBe('incompatible');
    expect((await migrationStatus(db.pool, original)).state).toBe('current');
    expect(
      (await db.pool.query('SELECT checksum FROM erp_infrastructure.migrations')).rows[0].checksum,
    ).toBe(original[0]?.checksum);
    expect(modified[0]?.checksum).toBe(createHash('sha256').update(modified[0]!.sql).digest('hex'));
  });
  it('commits once, rolls back actual writes, always releases and rejects a nested transaction', async () => {
    await db.pool.query('CREATE TABLE p01_transaction_probe (id integer PRIMARY KEY)');
    const pool = createPool(db.url, 1);
    try {
      await transaction(pool, async (client) => {
        await client.query('INSERT INTO p01_transaction_probe VALUES (1)');
      });
      expect((await db.pool.query('SELECT id FROM p01_transaction_probe')).rows).toEqual([
        { id: 1 },
      ]);
      await expect(
        transaction(pool, async (client) => {
          await client.query('INSERT INTO p01_transaction_probe VALUES (2)');
          throw new Error('controlled failure');
        }),
      ).rejects.toThrow('controlled failure');
      expect(
        (await db.pool.query('SELECT id FROM p01_transaction_probe ORDER BY id')).rows,
      ).toEqual([{ id: 1 }]);
      expect(pool.idleCount).toBe(1);
      expect(pool.waitingCount).toBe(0);
      await expect(
        transaction(pool, async (client) => {
          await client.query('INSERT INTO p01_transaction_probe VALUES (3)');
          await transaction(db.pool, async () => undefined);
        }),
      ).rejects.toThrow('NESTED_INDEPENDENT_TRANSACTION_FORBIDDEN');
      expect(
        (await db.pool.query('SELECT id FROM p01_transaction_probe ORDER BY id')).rows,
      ).toEqual([{ id: 1 }]);
      await expect(pool.query('SELECT 1 AS reusable')).resolves.toHaveProperty('rows', [
        { reusable: 1 },
      ]);
    } finally {
      await pool.end();
      await db.pool.query('DROP TABLE p01_transaction_probe');
    }
  });
  it('real HTTP reports ready, missing/incompatible schema and down; liveness stays honest; shutdown releases clients', async () => {
    const app = await createApplication({
      environment: 'test',
      runtimeUrl: db.url,
      migrationUrl: db.url,
    });
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl();
    const request = async (path: string) => {
      const response = await fetch(origin + path);
      return { status: response.status, body: await response.json() };
    };
    try {
      expect((await request('/api/v1/readiness')).body.status).toBe('ready');
      const runtime = app.get(DatabaseLifecycle).pool;
      await db.pool.query(
        'ALTER TABLE erp_infrastructure.schema_identity RENAME TO schema_identity_missing',
      );
      expect((await request('/api/v1/readiness')).body.migrations.state).toBe('incompatible');
      await db.pool.query(
        'ALTER TABLE erp_infrastructure.schema_identity_missing RENAME TO schema_identity',
      );
      await db.pool.query('ALTER TABLE erp_infrastructure.migrations RENAME TO migrations_missing');
      expect((await request('/api/v1/readiness')).body.migrations.state).toBe('missing');
      await db.pool.query('ALTER TABLE erp_infrastructure.migrations_missing RENAME TO migrations');
      await db.stop();
      const down = await request('/api/v1/readiness');
      expect(down.status).toBe(503);
      expect(down.body.database).toBe('unavailable');
      const live = await request('/api/v1/health');
      expect(live.status).toBe(200);
      expect(live.body.dependenciesChecked).toBe(false);
      expect(JSON.stringify(down)).not.toContain(db.url);
      expect(JSON.stringify(down)).not.toMatch(/password|ECONN|SELECT|stack/i);
      await db.start();
      let recovered = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        if ((await request('/api/v1/readiness')).status === 200) {
          recovered = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      expect(recovered).toBe(true);
      const idleResponse = await fetch(origin + '/api/v1/health');
      await app.close();
      expect((await idleResponse.json()).status).toBe('alive');
      expect(runtime.totalCount).toBe(0);
      expect(runtime.waitingCount).toBe(0);
    } finally {
      await app.close();
    }
  });
});
