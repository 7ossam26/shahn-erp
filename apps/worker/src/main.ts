import { createPool, databaseConfig, loadEnvironment } from '@shahn/database';
import { identityConfig, IdentityWorker, KeycloakIdentityAdapter } from '@shahn/api/access';
loadEnvironment();
try {
  const db = databaseConfig(),
    identity = identityConfig();
  const pool = identity ? createPool(db.runtimeUrl) : null;
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
        businessQueues: worker ? 1 : 0,
      }),
    );
  report('started');
  const heartbeat = setInterval(() => report('idle'), 30000);
  const poll = setInterval(() => {
    if (worker && !working && !stopping) {
      working = true;
      void worker
        .runOne()
        .catch(() => report('identity_retry'))
        .finally(() => {
          working = false;
        });
    }
  }, 1000);
  // P01 owns lifecycle only; no durable jobs/leases or fabricated business queues.
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
