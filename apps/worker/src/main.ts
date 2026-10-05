import { createPool, databaseConfig, loadEnvironment } from '@shahn/database';
import { identityConfig, IdentityWorker, KeycloakIdentityAdapter } from '@shahn/api/access';
import { integrationRuntime, SourceCommandWorker } from '@shahn/api/integration';
import { ProjectionWorker } from '@shahn/api/execution';
loadEnvironment();
try {
  const db = databaseConfig(),
    identity = identityConfig();
  const pool = createPool(db.runtimeUrl);
  const sourceWorker = new SourceCommandWorker(pool, integrationRuntime());
  const projectionWorker = new ProjectionWorker(pool);
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
        businessQueues: worker ? 3 : 2,
      }),
    );
  report('started');
  const heartbeat = setInterval(() => report('idle'), 30000);
  const poll = setInterval(() => {
    if (!working && !stopping) {
      working = true;
      void Promise.allSettled([worker?.runOne(), sourceWorker.runOne(), projectionWorker.runOne()])
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
    while (working) await new Promise((resolve) => setTimeout(resolve, 50));
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
