import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const build = spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const children = [
  spawn(process.execPath, ['apps/api/dist/main.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  }),
  spawn(process.execPath, ['apps/worker/dist/main.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  }),
  spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--config',
      'apps/web/vite.config.ts',
      '--host',
      '127.0.0.1',
      '--port',
      process.env['WEB_PORT'] ?? '5173',
      '--strictPort',
    ],
    { stdio: 'inherit' },
  ),
];
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.connected) child.send('shutdown');
    else child.kill('SIGTERM');
  }
  const deadline = setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  }, 8000);
  deadline.unref();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children)
  child.once('exit', (code) => {
    if (!stopping) {
      process.exitCode = code || 1;
      stop();
    }
  });
