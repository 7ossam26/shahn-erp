import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Pool, PoolClient } from 'pg';
export interface Migration {
  version: string;
  sql: string;
  checksum: string;
}
export interface AppliedMigration {
  version: string;
  checksum: string;
  appliedAt: string;
}
export interface MigrationStatus {
  state: 'current' | 'missing' | 'incompatible';
  applied: AppliedMigration[];
  required: string[];
}
const lock = 158197198;
export async function readMigrations(
  directory: URL = new URL('../migrations/', import.meta.url),
): Promise<Migration[]> {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  if (!files.length) throw new Error('NO_REGISTERED_MIGRATIONS');
  const migrations = await Promise.all(
    files.map(async (file) => {
      if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(file)) throw new Error('INVALID_MIGRATION_NAME');
      const sql = await readFile(new URL(file, directory), 'utf8');
      return {
        version: file.slice(0, -4),
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );
  migrations.forEach((migration, index) => {
    if (Number(migration.version.slice(0, 4)) !== index + 1) throw new Error('MIGRATION_ORDER_GAP');
  });
  return migrations;
}
async function statusOn(
  client: Pick<PoolClient, 'query'>,
  migrations: Migration[],
): Promise<MigrationStatus> {
  const required = migrations.map((migration) => migration.version);
  const exists = await client.query<{ present: string | null }>(
    "SELECT to_regclass('erp_infrastructure.migrations')::text AS present",
  );
  if (!exists.rows[0]?.present) return { state: 'missing', applied: [], required };
  const records = await client.query<{ version: string; checksum: string; applied_at: Date }>(
    'SELECT version, checksum, applied_at FROM erp_infrastructure.migrations ORDER BY version',
  );
  const applied = records.rows.map((row) => ({
    version: row.version,
    checksum: row.checksum,
    appliedAt: row.applied_at.toISOString(),
  }));
  const incompatible = applied.some(
    (record, index) =>
      record.version !== migrations[index]?.version ||
      record.checksum !== migrations[index]?.checksum,
  );
  return {
    state: incompatible
      ? 'incompatible'
      : applied.length === migrations.length
        ? 'current'
        : 'missing',
    applied,
    required,
  };
}
/** Read-only: never creates tracking tables, obtains a migration lock, or applies SQL. */
export async function migrationStatus(
  pool: Pool,
  migrations?: Migration[],
): Promise<MigrationStatus> {
  const registered = migrations ?? (await readMigrations());
  return statusOn(pool, registered);
}
export async function migrate(pool: Pool, migrations?: Migration[]): Promise<MigrationStatus> {
  const registered = migrations ?? (await readMigrations());
  const client = await pool.connect();
  let locked = false;
  let broken = false;
  try {
    await client.query("SET lock_timeout = '15s'");
    await client.query('SELECT pg_advisory_lock($1)', [lock]);
    locked = true;
    await client.query('CREATE SCHEMA IF NOT EXISTS erp_infrastructure');
    await client.query(
      'CREATE TABLE IF NOT EXISTS erp_infrastructure.migrations (version text PRIMARY KEY, checksum text NOT NULL CHECK(length(checksum)=64), applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const previous = await statusOn(client, registered);
    if (previous.state === 'incompatible') throw new Error('MIGRATION_CHECKSUM_OR_ORDER_MISMATCH');
    for (const migration of registered.slice(previous.applied.length)) {
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO erp_infrastructure.migrations (version,checksum) VALUES ($1,$2)',
          [migration.version, migration.checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          broken = true;
        }
        throw error;
      }
    }
    return await statusOn(client, registered);
  } finally {
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [lock]);
        await client.query('RESET lock_timeout');
      } catch {
        broken = true;
      }
    }
    client.release(broken);
  }
}
