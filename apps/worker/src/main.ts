import { createPool, databaseConfig, loadEnvironment } from '@shahn/database';
import { identityConfig, IdentityWorker, KeycloakIdentityAdapter } from '@shahn/api/access';
import { integrationRuntime, SourceCommandWorker } from '@shahn/api/integration';
loadEnvironment();
try {
  const db = databaseConfig(),
    identity = identityConfig();
  const pool = createPool(db.runtimeUrl);
  const sourceWorker = new SourceCommandWorker(pool, integrationRuntime());
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
        businessQueues: worker ? 2 : 1,
      }),
    );
  report('started');
  const heartbeat = setInterval(() => report('idle'), 30000);
  const poll = setInterval(() => {
    if (!working && !stopping) {
      working = true;
      void Promise.all([worker?.runOne(), sourceWorker.runOne()])
        .catch(() => report('durable_work_retry'))
        .finally(() => {
          working = false;
        });
    }
  }, 1000);
  // Allow both durable workers to release or finish their fenced work before closing the pool.
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
