import { databaseConfig, loadEnvironment } from '@shahn/database';
loadEnvironment();
try {
  databaseConfig();
  let stopping = false;
  const report = (state: string) =>
    console.log(
      JSON.stringify({
        service: 'worker',
        state,
        checkedAt: new Date().toISOString(),
        businessQueues: 0,
      }),
    );
  report('started');
  const heartbeat = setInterval(() => report('idle'), 30000);
  // P01 owns lifecycle only; no durable jobs/leases or fabricated business queues.
  const stop = () => {
    if (stopping) return;
    stopping = true;
    report('stopping');
    clearInterval(heartbeat);
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
