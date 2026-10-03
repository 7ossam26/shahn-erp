import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
const db = await isolatedPostgres();
await migrate(db.pool);
const environment = {
  ...process.env,
  APP_ENV: 'test',
  DATABASE_URL: db.url,
  MIGRATION_DATABASE_URL: db.url,
  API_HOST: '127.0.0.1',
  API_PORT: '4201',
  APP_ORIGIN: 'http://127.0.0.1:5201',
  API_PROXY_TARGET: 'http://127.0.0.1:4201',
  VITE_ENABLE_DEMOS: 'true',
};
const children = [
  spawn(process.execPath, ['apps/api/dist/main.js'], {
    env: environment,
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  }),
  spawn(process.execPath, ['apps/worker/dist/main.js'], {
    env: environment,
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  }),
  spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--config',
      'apps/web/vite.config.ts',
      '--port',
      '5201',
      '--strictPort',
    ],
    { env: environment, stdio: 'inherit' },
  ),
  spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      'preview',
      '--config',
      'apps/web/vite.config.ts',
      '--host',
      '127.0.0.1',
      '--port',
      '5202',
      '--strictPort',
    ],
    { env: environment, stdio: 'inherit' },
  ),
];
for (const url of [
  'http://127.0.0.1:4201/api/v1/readiness',
  'http://127.0.0.1:5201',
  'http://127.0.0.1:5202',
]) {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Await real services. */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error('Actual browser web/API process did not become ready');
}
// Harness-only loopback control. It can stop only the UUID-owned test database.
const control = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/health') {
      response.end('ready');
      return;
    }
    if (request.method === 'POST' && request.url === '/shutdown') {
      await stop();
      response.end('cleaned');
      return;
    }
    if (request.method === 'POST' && request.url === '/database/stop') {
      await db.stop();
      response.end('stopped');
      return;
    }
    if (request.method === 'POST' && request.url === '/database/start') {
      await db.start();
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          await db.pool.query('SELECT 1');
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
      response.end('started');
      return;
    }
    response.statusCode = 404;
    response.end();
  } catch {
    response.statusCode = 500;
    response.end('Test control failed');
  }
});
control.listen(4202, '127.0.0.1');
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  control.close();
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null) {
            resolve();
            return;
          }
          child.once('exit', resolve);
          if (child.connected) child.send('shutdown');
          else child.kill('SIGTERM');
        }),
    ),
  );
  await db.dispose();
};
process.on('SIGTERM', () => {
  void stop();
});
process.on('SIGINT', () => {
  void stop();
});
for (const child of children)
  child.once('exit', (code) => {
    if (!stopping) {
      console.error('Test service exited unexpectedly');
      process.exitCode = code || 1;
      void stop();
    }
  });
