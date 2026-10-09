import { it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
it('encrypted full/differential/WAL restore, lost native cash movement, wrong key and actual archive failure', async () => {
  const distribution = process.env['SHAHN_TEST_DOCKER_WSL_DISTRIBUTION'];
  const viaWsl = process.platform === 'win32' && distribution;
  if (viaWsl && !/^[a-zA-Z0-9._-]{1,64}$/.test(distribution))
    throw Error('INVALID_TEST_WSL_DISTRIBUTION');
  const isolatedRunner =
    'docker run --rm --label shahn.phase=P25-test --user root --network host --entrypoint node ' +
    '-v /usr/bin/docker:/usr/bin/docker:ro -v /var/run/docker.sock:/var/run/docker.sock -v /var/lib/shahn-p25-rehearsals:/var/lib/shahn-p25-rehearsals ' +
    '-v "$PWD/tests:/app/tests:ro" -v "$PWD/scripts:/app/scripts:ro" -v "$PWD/deploy:/app/deploy:ro" ' +
    '-v "$PWD/apps:/app/apps:ro" -v "$PWD/packages:/app/packages:ro" ' +
    '-v "$PWD/docs/verification/P25:/app/docs/verification/P25" ' +
    '-e APP_ENV=test -e NODE_ENV=test -e DEPLOYMENT_MANAGED=false -e P25_ISOLATED_REHEARSAL=true ' +
    '-e P25_POSTGRES_IMAGE=shahn-p25-postgres shahn-p25-verification --import tsx scripts/verification/p25-backup.ts';
  const command = await promisify(execFile)(
    viaWsl ? 'wsl.exe' : process.execPath,
    viaWsl
      ? ['-d', distribution, '-u', 'root', '--cd', process.cwd(), '--', 'sh', '-lc', isolatedRunner]
      : ['--import', 'tsx', 'scripts/verification/p25-backup.ts'],
    {
      env: {
        ...process.env,
        APP_ENV: 'test',
        P25_ISOLATED_REHEARSAL: 'true',
        P25_POSTGRES_IMAGE: 'shahn-p25-postgres',
      },
      timeout: 300000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  expect(command.stdout).toContain('"passed":true');
  const evidence = JSON.parse(
    await readFile('docs/verification/P25/backup-rehearsal.json', 'utf8'),
  );
  expect(evidence.restore.equal).toBe(true);
  expect(evidence.restore.lostMovementAbsent).toBe(true);
  expect(evidence.wrongEncryptionKeyRejected).toBe(true);
  expect(evidence.failedArchiveAlert.state).toBe('review-required');
}, 360000);
