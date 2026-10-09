import { it, expect } from 'vitest';
import { randomUUID, createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, createPool, migrationStatus } from '@shahn/database';
import { accessFixture } from '../../support/access.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { financeFamily, type FinanceCommand, type FinanceResult } from '@shahn/contracts';
import { assertBinaryCompatibility } from '../../../deploy/release-compatibility.mjs';
import { SourceCommandWorker } from '../../../apps/api/src/modules/integration/source-command.service.js';
import { RecoveryWorker } from '../../../apps/api/src/modules/integration/recovery-worker.js';
import { ProjectionWorker } from '../../../apps/api/src/modules/execution/projection-worker.js';
import { ExportWorker } from '../../../apps/api/src/modules/reporting/exports.js';
import { StorageRenewalService } from '../../../apps/api/src/modules/storage/renewal.js';
it('concurrent migration, committed command recovery, local readiness and restore-mode service/HTTP guards', async () => {
  const db = await isolatedPostgres();
  const second = createPool(db.url);
  const password = randomBytes(24).toString('hex');
  const migrationUrl = new URL(db.url),
    runtimeUrl = new URL(db.url);
  migrationUrl.username = 'shahn_migration';
  migrationUrl.password = password;
  runtimeUrl.username = 'shahn_runtime';
  runtimeUrl.password = randomBytes(24).toString('hex');
  const migrationPool = createPool(migrationUrl.href),
    runtimePool = createPool(runtimeUrl.href);
  let app: Awaited<ReturnType<typeof createApplication>> | undefined;
  try {
    const migrations = await readMigrations();
    await db.pool
      .query(`CREATE ROLE shahn_migration LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
      CREATE ROLE shahn_runtime LOGIN PASSWORD '${runtimeUrl.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      GRANT CREATE ON SCHEMA public TO shahn_migration;
      ALTER DEFAULT PRIVILEGES FOR ROLE shahn_migration GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO shahn_runtime;
      ALTER DEFAULT PRIVILEGES FOR ROLE shahn_migration GRANT USAGE,SELECT ON SEQUENCES TO shahn_runtime;`);
    const databaseName = (await db.pool.query('SELECT current_database() AS name')).rows[0]
      .name as string;
    await db.pool.query(
      `GRANT CREATE,CONNECT ON DATABASE "${databaseName.replaceAll('"', '""')}" TO shahn_migration`,
    );
    // The migration pool checks out independent connections; both contend on the real migration lock.
    const migrationClients = await Promise.all([migrationPool.connect(), migrationPool.connect()]);
    for (const client of migrationClients) {
      await client.query("SET statement_timeout='250ms'; SET lock_timeout='2s'");
      client.release();
    }
    await Promise.all([migrate(migrationPool), migrate(migrationPool)]);
    const restoredSettings = await Promise.all([migrationPool.connect(), migrationPool.connect()]);
    for (const client of restoredSettings) {
      try {
        expect((await client.query('SHOW statement_timeout')).rows[0].statement_timeout).toBe(
          '250ms',
        );
        expect((await client.query('SHOW lock_timeout')).rows[0].lock_timeout).toBe('2s');
        // Grants/fixture setup use the usual runtime budget after proving restoration.
        await client.query("SET statement_timeout='5s'; RESET lock_timeout");
      } finally {
        client.release();
      }
    }
    await migrationPool.query(await readFile('deploy/postgres/grants.sql', 'utf8'));
    await expect(
      runtimePool.query('CREATE TABLE public.p25_forbidden(id int)'),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      runtimePool.query('DELETE FROM erp_infrastructure.migrations'),
    ).rejects.toMatchObject({ code: '42501' });
    expect(
      (await db.pool.query('SELECT count(*) FROM erp_infrastructure.migrations')).rows[0].count,
    ).toBe(String(migrations.length));
    const f = await accessFixture(runtimePool);
    const command = {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'account.create',
      fields: {
        name: 'P25 isolated recovery cash',
        type: 'cash',
        currency: 'EGP',
        branchIds: [f.a],
        active: true,
        bankDescription: '',
      },
    } as FinanceCommand;
    const result = await financeCommands(runtimePool).execute(f.admin.token, command);
    const tables = ['kernel.journal_effect', 'kernel.source_record', 'command_record', 'work_item'];
    const capture = async () =>
      Object.fromEntries(
        await Promise.all(
          tables.map(async (table) => [
            table,
            createHash('sha256')
              .update(
                JSON.stringify(
                  (
                    await db.pool.query(
                      `SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`,
                    )
                  ).rows,
                ),
              )
              .digest('hex'),
          ]),
        ),
      );
    const before = await capture();
    const versions = migrations.map(({ version, checksum }) => ({ version, checksum }));
    expect(() =>
      assertBinaryCompatibility({ migrations: versions.slice(0, -1) }, { migrations: versions }),
    ).toThrow('INCOMPATIBLE_BINARY_ROLLBACK');
    expect(() =>
      assertBinaryCompatibility({ migrations: versions }, { migrations: versions }),
    ).not.toThrow();
    app = await createApplication(
      { environment: 'test', runtimeUrl: runtimeUrl.href, migrationUrl: migrationUrl.href },
      f.config,
      { connections: [] },
    );
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl();
    process.env['OPERATIONS_MODE'] = 'restore';
    // No issuer or Tawsel network is needed for these local reads; the outage does not make /ready fail.
    expect((await fetch(origin + '/api/v1/readiness')).status).toBe(200);
    expect((await (await fetch(origin + '/api/v1/operations')).json()).mutationsEnabled).toBe(
      false,
    );
    const recovered = await financeCommands(second).recover(
      f.admin.token,
      f.company,
      financeFamily(command.type),
      command.commandId,
    );
    expect(recovered).toEqual(result);
    expect((recovered.body as FinanceResult).entityId).toBeTruthy();
    await expect(
      Promise.resolve().then(() =>
        financeCommands(second).execute(f.admin.token, { ...command, commandId: randomUUID() }),
      ),
    ).rejects.toMatchObject({ code: 'RESTORE_REVIEW_REQUIRED' });
    const blocked = await fetch(origin + '/api/v1/finance/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    expect(blocked.status).toBe(503);
    expect(
      await Promise.all([
        new SourceCommandWorker(runtimePool, { connections: [] }).runOne(),
        new RecoveryWorker(runtimePool, { connections: [] }).runOne(),
        new ProjectionWorker(runtimePool).runOne(),
        new ExportWorker(runtimePool).runOne(),
        new StorageRenewalService(runtimePool).runOne(),
      ]),
    ).toEqual([false, false, false, false, null]);
    expect(await capture()).toEqual(before);
    expect((await migrationStatus(db.pool)).state).toBe('current');
    await mkdir('docs/verification/P25', { recursive: true });
    await writeFile(
      'docs/verification/P25/lifecycle.json',
      JSON.stringify(
        {
          migrations: versions,
          unchanged: before,
          localReadinessWithoutRemote: 200,
          restoreMutationStatus: 503,
          runtimeDdlDenied: true,
          runtimeMigrationMetadataWriteDenied: true,
          restoreWorkersClaimedNothing: true,
          migrationSessionTimeoutsRestored: true,
          recoveredCommandId: command.commandId,
        },
        null,
        2,
      ),
    );
  } finally {
    delete process.env['OPERATIONS_MODE'];
    await app?.close();
    await second.end();
    await runtimePool.end();
    await migrationPool.end();
    await db.dispose();
  }
}, 120000);
