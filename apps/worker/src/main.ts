import {
  createPool,
  databaseConfig,
  loadEnvironment,
  deploymentConfiguration,
  mutationsEnabled,
} from '@shahn/database';
import { identityConfig, IdentityWorker, KeycloakIdentityAdapter } from '@shahn/api/access';
import { integrationRuntime, SourceCommandWorker, RecoveryWorker } from '@shahn/api/integration';
import { ProjectionWorker } from '@shahn/api/execution';
import { StorageRenewalJob } from './jobs/storage-renewal.js';
import { ExportWorker } from '@shahn/api/reporting';
loadEnvironment();
try {
  const deployment = deploymentConfiguration();
  const db = databaseConfig(process.env, 'runtime'),
    identity = identityConfig(),
    integration = integrationRuntime();
  if (
    deployment &&
    (!integration.connections.length ||
      integration.connections.some(
        (c) => c.companyId !== deployment.companyId || c.issuer !== identity?.issuer,
      ))
  )
    throw new Error('Configuration: Tawsel company/issuer does not match this ERP deployment');
  const pool = createPool(db.runtimeUrl);
  const sourceWorker = new SourceCommandWorker(pool, integration);
  const recoveryWorker = new RecoveryWorker(pool, integration);
  const projectionWorker = new ProjectionWorker(pool);
  // P19: scheduled storage renewal on the same PostgreSQL work lane.
  const storageRenewal = new StorageRenewalJob(pool);
  const exportWorker = new ExportWorker(pool);
  let exporting = false;
  const worker =
    pool && identity ? new IdentityWorker(pool, new KeycloakIdentityAdapter(identity)) : null;
  let working = false;
  let stopping = false;
  const report = (state: string) =>
    console.log(
      JSON.stringify({
        service: 'worker',
        state,
        checkedAt: new Date().toISOString(),
        businessQueues: worker ? 6 : 5,
      }),
    );
  report('started');
  const heartbeat = setInterval(() => report('idle'), 30000);
  const poll = setInterval(() => {
    if (!mutationsEnabled()) return;
    // Export formatting has its own bounded lane. An export never gates inbox polling.
    if (!exporting && !stopping) {
      exporting = true;
      void exportWorker
        .runOne()
        .then(() => exportWorker.expire())
        .catch(() => report('export_retry'))
        .finally(() => {
          exporting = false;
        });
    }
    if (!working && !stopping) {
      working = true;
      void Promise.allSettled([
        worker?.runOne(),
        sourceWorker.runOne(),
        recoveryWorker.runOne(),
        projectionWorker.runOne(),
        storageRenewal.runOne(),
      ])
        .then((results) => {
          if (results.some((result) => result.status === 'rejected')) report('durable_work_retry');
        })
        .finally(() => {
          working = false;
        });
    }
  }, 1000);
  // Allow every durable worker to finish its transaction before closing the pool.
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    report('stopping');
    clearInterval(heartbeat);
    clearInterval(poll);
    while (working || exporting) await new Promise((resolve) => setTimeout(resolve, 50));
    await pool?.end();
    report('stopped');
    if (process.connected) process.disconnect();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  // Portable graceful shutdown for the development supervisor and Windows test harness.
  process.on('message', (message) => {
    if (message === 'shutdown') stop();
  });
} catch (error) {
  console.error(
    error instanceof Error && error.message.startsWith('Configuration:')
      ? error.message
      : 'Worker startup failed.',
  );
  process.exitCode = 1;
}
