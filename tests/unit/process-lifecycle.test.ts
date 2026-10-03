// @vitest-environment node
import { spawn, spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
it('worker starts idle and gracefully stops its actual process without a fabricated queue', async () => {
  const worker = spawn(process.execPath, ['--import', 'tsx', 'apps/worker/src/main.ts'], {
    env: {
      ...process.env,
      APP_ENV: 'test',
      DATABASE_URL: 'postgres://test:LOCAL_SENTINEL@127.0.0.1/unused',
      MIGRATION_DATABASE_URL: 'postgres://test:LOCAL_SENTINEL@127.0.0.1/unused',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  let errors = '';
  worker.stdout!.on('data', (chunk) => {
    output += String(chunk);
  });
  worker.stderr!.on('data', (chunk) => {
    errors += String(chunk);
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('worker did not start')), 5000);
    worker.stdout!.on('data', () => {
      if (output.includes('"state":"started"')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    worker.once('error', reject);
  });
  const stopped = new Promise<number | null>((resolve) => worker.once('exit', resolve));
  worker.send('shutdown');
  expect(await stopped).toBe(0);
  expect(output).toContain('"state":"stopping"');
  expect(output).toContain('"state":"stopped"');
  expect(output).toContain('"businessQueues":0');
  expect(output + errors).not.toContain('LOCAL_SENTINEL');
});
it('missing mandatory worker variable has a readable failure without a secret', () => {
  const env = {
    ...process.env,
    APP_ENV: 'test',
    DATABASE_URL: 'postgres://test:LOCAL_SENTINEL@127.0.0.1/unused',
  };
  delete env['MIGRATION_DATABASE_URL' as keyof typeof env];
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'apps/worker/src/main.ts'], {
    env,
    encoding: 'utf8',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('MIGRATION_DATABASE_URL is required');
  expect(result.stderr).not.toContain('LOCAL_SENTINEL');
});
it('seed refuses production before attempting any database access', () => {
  const result = spawnSync(process.execPath, ['packages/database/dist/cli.js', 'seed'], {
    env: {
      ...process.env,
      APP_ENV: 'production',
      DATABASE_URL: 'postgres://test:LOCAL_SENTINEL@127.0.0.1/unused',
      MIGRATION_DATABASE_URL: 'postgres://test:LOCAL_SENTINEL@127.0.0.1/unused',
    },
    encoding: 'utf8',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('seed:dev refuses non-development');
  expect(result.stderr).not.toContain('LOCAL_SENTINEL');
});
