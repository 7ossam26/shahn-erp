import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { createPool } from '@shahn/database';

const exec = promisify(execFile);
/** Explicit opt-in. Never connects to or stops an installed database service. */
export async function isolatedNativePostgres(bin: string) {
  const executable = (name: string) =>
    join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
  const version = (await exec(executable('postgres'), ['--version'])).stdout.trim();
  if (!/PostgreSQL\) 18\./.test(version)) throw new Error('TEST_POSTGRES_18_REQUIRED');
  const parent = await realpath(tmpdir());
  const directory = await mkdtemp(join(parent, 'shahn-p03-test-'));
  const data = join(directory, 'data');
  const passwordFile = join(directory, 'password');
  const password = randomBytes(32).toString('hex');
  const port = await new Promise<number>((accept, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('NO_TEST_PORT'));
      server.close(() => accept(address.port));
    });
  });
  await writeFile(passwordFile, password, { mode: 0o600 });
  await exec(
    executable('initdb'),
    [
      '-D',
      data,
      '-U',
      'shahn_test',
      '--pwfile',
      passwordFile,
      '--auth=scram-sha-256',
      '--encoding=UTF8',
      '--locale=C',
    ],
    { timeout: 60000 },
  );
  await rm(passwordFile);
  const control = (args: string[]) =>
    exec(executable('pg_ctl'), ['-D', data, ...args], { timeout: 30000 });
  const start = async () =>
    (
      await control([
        '-l',
        join(directory, 'postgres.log'),
        '-o',
        `-p ${port} -h 127.0.0.1 -c fsync=on -c synchronous_commit=on`,
        '-w',
        'start',
      ])
    ).stdout;
  const stop = async () => (await control(['-m', 'fast', '-w', 'stop'])).stdout;
  await start();
  const url = `postgresql://shahn_test:${password}@127.0.0.1:${port}/postgres`;
  const pool = createPool(url);
  return {
    name: directory,
    url,
    pool,
    start,
    stop,
    dispose: async () => {
      await pool.end();
      await stop();
      const target = await realpath(directory);
      if (!target.startsWith(parent + sep) || !resolve(target).includes('shahn-p03-test-'))
        throw new Error('UNSAFE_TEST_CLEANUP');
      await rm(target, { recursive: true, force: true });
    },
  };
}
