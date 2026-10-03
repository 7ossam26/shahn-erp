import { randomUUID, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { createPool } from '@shahn/database';
const exec = promisify(execFile);
export async function docker(args: string[]): Promise<string> {
  try {
    return (await exec('docker', args, { timeout: 90000, maxBuffer: 1024 * 1024 })).stdout.trim();
  } catch {
    throw new Error(
      'Isolated P01 Docker operation failed; verify Docker and the pinned PostgreSQL image. No fallback database is used.',
    );
  }
}
export async function isolatedPostgres() {
  const name = `shahn-p01-test-${randomUUID()}`;
  const password = randomBytes(24).toString('hex');
  const { readFile } = await import('node:fs/promises');
  const image = (
    await readFile(new URL('../../../deploy/postgres-image.txt', import.meta.url), 'utf8')
  ).trim();
  // Docker Desktop can change an automatically published port on restart. Pin a free
  // loopback port for the lifetime of this isolated fixture so recovery tests are real.
  const port = await new Promise<number>((resolve, reject) => {
    const reservation = createServer();
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', () => {
      const address = reservation.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Cannot reserve isolated test port'));
        return;
      }
      reservation.close(() => resolve(address.port));
    });
  });
  // Credentials are random and never committed, printed, or taken from a production DSN.
  await docker([
    'run',
    '-d',
    '--name',
    name,
    '--label',
    'shahn.phase=P01-test',
    '-e',
    'POSTGRES_DB=shahn_p01_test',
    '-e',
    'POSTGRES_USER=shahn_p01_test',
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-p',
    `127.0.0.1:${port}:5432`,
    image,
  ]);
  let pool;
  try {
    const url = `postgresql://shahn_p01_test:${password}@127.0.0.1:${port}/shahn_p01_test`;
    pool = createPool(url);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        await pool.query('SELECT 1');
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    if (!ready) throw new Error('Isolated PostgreSQL did not become ready');
    const ownedPool = pool;
    return {
      name,
      url,
      pool: ownedPool,
      stop: () => docker(['stop', '-t', '1', name]),
      start: () => docker(['start', name]),
      dispose: async () => {
        await ownedPool.end();
        await docker(['rm', '-f', '-v', name]);
      },
    };
  } catch (error) {
    await pool?.end();
    await docker(['rm', '-f', '-v', name]);
    throw error;
  }
}
