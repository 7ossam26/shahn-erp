import { loadEnvironment } from '@shahn/database';
import { createApplication } from './app.js';
loadEnvironment();
try {
  const host = process.env['API_HOST'];
  const portText = process.env['API_PORT'];
  const origin = process.env['APP_ORIGIN'];
  if (!host) throw new Error('Configuration: API_HOST is required');
  if (!portText || !/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535)
    throw new Error('Configuration: API_PORT must be a valid port');
  if (!origin) throw new Error('Configuration: APP_ORIGIN is required');
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error();
  } catch {
    throw new Error('Configuration: APP_ORIGIN must be an HTTP(S) origin');
  }
  const app = await createApplication();
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onClose', () => {
      console.log('{"event":"api_stopped"}');
    });
  await app.listen(Number(portText), host);
  process.on('message', (message) => {
    if (message === 'shutdown')
      void app.close().then(() => {
        if (process.connected) process.disconnect();
      });
  });
  console.log(JSON.stringify({ event: 'api_started', port: Number(portText) }));
} catch (error) {
  console.error(
    error instanceof Error && error.message.startsWith('Configuration:')
      ? error.message
      : 'API startup failed; check local configuration and port availability.',
  );
  process.exitCode = 1;
}
