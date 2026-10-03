import { spawnSync } from 'node:child_process';
for (const args of [
  ['scripts/build-packages.mjs'],
  ['node_modules/typescript/bin/tsc', '-b', 'apps/api', 'apps/worker', 'apps/web'],
  ['node_modules/vite/bin/vite.js', 'build', '--config', 'apps/web/vite.config.ts'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
