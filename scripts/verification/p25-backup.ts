/** Actual local pgBackRest drill. Run ONLY in the documented isolated Linux verification image. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, realpath, chmod } from 'node:fs/promises';
import { createServer } from 'node:net';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { join } from 'node:path';
import { createPool, migrate, archiveHealth } from '@shahn/database';
import { profitFixture } from '../../tests/integration/p24/fixtures.js';
import { financeCommands } from '../../apps/api/src/modules/finance/service.js';
import type { FinanceCommand } from '@shahn/contracts';
const exec = promisify(execFile);
if (
  process.env['APP_ENV'] !== 'test' ||
  process.env['P25_ISOLATED_REHEARSAL'] !== 'true' ||
  process.platform !== 'linux'
)
  throw new Error('P25 refuses any target except an explicitly isolated Linux test');
const image = process.env['P25_POSTGRES_IMAGE'];
if (!image || !/^shahn-p25-postgres(?::[a-z0-9_-]+)?$/.test(image))
  throw new Error('P25 isolated test image required');
const scratchRoot = '/var/lib/shahn-p25-rehearsals';
await mkdir(scratchRoot, { recursive: true, mode: 0o700 });
if ((await realpath(scratchRoot)) !== scratchRoot) throw Error('UNSAFE_REHEARSAL_PATH');
await chmod(scratchRoot, 0o700);
const scratch = await mkdtemp(scratchRoot + '/rehearsal-');
if (!(await realpath(scratch)).startsWith(scratchRoot + '/rehearsal-'))
  throw new Error('UNSAFE_REHEARSAL_PATH');
const name = 'shahn-p25-' + randomUUID(),
  network = name + '-net',
  source = name + '-source',
  restored = name + '-restored';
const docker = async (args: string[]) => {
  try {
    return (
      await exec('docker', args, { maxBuffer: 8 * 1024 * 1024, timeout: 180000 })
    ).stdout.trim();
  } catch (error) {
    const code = (error as { code?: string | number }).code;
    throw new Error(
      'P25 Docker operation failed: ' +
        args[0] +
        ' exit=' +
        (typeof code === 'number' || (typeof code === 'string' && /^[A-Z_]{1,32}$/.test(code))
          ? code
          : 'unknown') +
        ' (credentials and output withheld)',
    );
  }
};
const port = () =>
  new Promise<number>((accept, reject) => {
    const s = createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const a = s.address();
      if (!a || typeof a === 'string') return reject(Error('PORT'));
      s.close(() => accept(a.port));
    });
  });
const password = randomBytes(32).toString('hex'),
  key = randomBytes(32).toString('hex');
await mkdir(join(scratch, 'keys'));
await mkdir(join(scratch, 'repository'));
const conf = (path: string) =>
  `[global]\nrepo1-path=/p25/repository\nrepo1-cipher-type=aes-256-cbc\nrepo1-cipher-pass=${key}\nrepo1-retention-full-type=time\nrepo1-retention-full=30\nstart-fast=y\nprocess-max=2\nlog-level-console=error\nlog-level-file=off\nlock-path=/tmp/pgbackrest\n[erp]\npg1-path=${path}\npg1-user=shahn_backup\npg1-database=shahn_p25_test\npg1-socket-path=/var/run/postgresql\n`;
await writeFile(join(scratch, 'keys/source.conf'), conf('/var/lib/postgresql/18/docker'), {
  mode: 0o600,
});
await writeFile(join(scratch, 'keys/restore.conf'), conf('/restore'), { mode: 0o600 });
const owned: string[] = [];
let pool: ReturnType<typeof createPool> | undefined,
  restoredPool: ReturnType<typeof createPool> | undefined;
let fixture: Awaited<ReturnType<typeof profitFixture>> | undefined;
const evidence: Record<string, unknown> = {
  boundary:
    'Local encrypted POSIX repository; no offsite provider, production, live issuer or live Tawsel acceptance',
  scratch,
};
const pgbackrest = (container: string, args: string[]) =>
  docker([
    'exec',
    '-u',
    'postgres',
    container,
    'pgbackrest',
    '--config=/p25/keys/source.conf',
    '--stanza=erp',
    ...args,
  ]);
const waitReady = async (p: ReturnType<typeof createPool>) => {
  for (let n = 0; n < 60; n++) {
    try {
      await p.query('SELECT 1');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw Error('TEST_DATABASE_UNAVAILABLE');
};
try {
  evidence.step = 'isolated-database-bootstrap';
  await docker(['network', 'create', '--internal', '--label', 'shahn.phase=P25-test', network]);
  const sourcePort = await port();
  await docker([
    'run',
    '-d',
    '--name',
    source,
    '--label',
    'shahn.phase=P25-test',
    '--network',
    network,
    '-p',
    `127.0.0.1:${sourcePort}:5432`,
    '-e',
    'POSTGRES_DB=shahn_p25_test',
    '-e',
    'POSTGRES_USER=shahn_test',
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-v',
    scratch + ':/p25',
    image,
    'postgres',
  ]);
  owned.push(source);
  const sourceAddress = await docker([
    'inspect',
    '--format',
    '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',
    source,
  ]);
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(sourceAddress))
    throw Error('ISOLATED_DATABASE_ADDRESS_REQUIRED');
  pool = createPool(`postgresql://shahn_test:${password}@${sourceAddress}:5432/shahn_p25_test`);
  await waitReady(pool);
  await docker(['exec', source, 'chown', '-R', 'postgres:postgres', '/p25']);
  await pool.query(`CREATE ROLE shahn_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
    GRANT pg_read_all_settings,pg_read_all_stats TO shahn_backup;
    GRANT EXECUTE ON FUNCTION pg_backup_start(text,boolean),pg_backup_stop(boolean),pg_switch_wal(),pg_create_restore_point(text) TO shahn_backup`);
  await migrate(pool);
  fixture = await profitFixture(pool);
  const f = fixture;
  await pgbackrest(source, ['stanza-create']);
  // Bootstrap before enabling archiving: Docker's temporary init server must not wait for an absent stanza.
  await pool.query("ALTER SYSTEM SET archive_mode='on'");
  await pool.query("ALTER SYSTEM SET archive_timeout='60s'");
  await pool.query(
    "ALTER SYSTEM SET archive_command='pgbackrest --config=/p25/keys/source.conf --stanza=erp archive-push %p'",
  );
  await docker(['restart', source]);
  await waitReady(pool);
  await pgbackrest(source, ['check']);
  evidence.step = 'full-and-differential-backups';
  await pgbackrest(source, ['--type=full', 'backup']);
  await f.expense('1700');
  await pgbackrest(source, ['--type=diff', 'backup']);
  const info = JSON.parse(await pgbackrest(source, ['--output=json', 'info']));
  const backups = info[0].backup;
  if (
    !backups.some((b: { type: string }) => b.type === 'full') ||
    !backups.some((b: { type: string }) => b.type === 'diff')
  )
    throw Error('BACKUP_CHAIN_MISSING');
  evidence.backups = backups.map(
    (b: { label: string; type: string; timestamp: unknown; archive: unknown }) => ({
      label: b.label,
      type: b.type,
      timestamp: b.timestamp,
      archive: b.archive,
    }),
  );
  const tables = [
    'kernel.source_record',
    'kernel.journal_effect',
    'kernel.credit_lot',
    'kernel.wallet_hold',
    'kernel.lot_allocation',
    'kernel.shipping_cover',
    'finance.paid_expense',
    'finance.account_balance',
    'finance.brand_payout',
    'employees.payroll_obligation',
    'storage.period',
    'storage.receipt',
    'inventory.stock_position',
    'inventory.stock_reservation',
    'shipments.parcel_custody',
    'command_record',
    'integration.source_command',
    'integration.inbox',
    'integration.checkpoint',
    'work_item',
  ];
  const capture = async (p: ReturnType<typeof createPool>) =>
    Object.fromEntries(
      await Promise.all(
        tables.map(async (table) => {
          const rows = (
            await p.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)
          ).rows;
          return [
            table,
            {
              count: rows.length,
              hash: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
            },
          ];
        }),
      ),
    );
  const before = await capture(pool);
  const checkpoint = 'p25_' + randomUUID().replaceAll('-', '');
  const checkpointAt = (
    await pool.query('SELECT clock_timestamp() AS now')
  ).rows[0].now.toISOString();
  await pool.query('SELECT pg_create_restore_point($1)', [checkpoint]);
  await new Promise((r) => setTimeout(r, 30));
  const late: FinanceCommand = {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'movement.create',
    fields: {
      accountId: f.aCash,
      branchId: f.a,
      currency: 'EGP',
      amountMinor: '2300',
      actualDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }),
      method: 'cash',
      direction: 'withdrawal',
      reason: 'P25 deliberate ERP-only cash after recovery point',
    },
  };
  await financeCommands(pool).execute(f.admin.token, late);
  const afterLate = await capture(pool);
  if (afterLate['finance.account_balance']?.hash === before['finance.account_balance']?.hash)
    throw Error('LATE_MOVEMENT_NOT_COMMITTED');
  await pool.query('SELECT pg_switch_wal()');
  await pgbackrest(source, ['check']);
  const t0 = performance.now();
  const restoreName = name + '-restore-tool';
  await docker([
    'run',
    '--rm',
    '--label',
    'shahn.phase=P25-test',
    '--network',
    'none',
    '-v',
    name + '-data:/restore',
    '--entrypoint',
    'chown',
    image,
    'postgres:postgres',
    '/restore',
  ]);
  await docker([
    'run',
    '--rm',
    '--name',
    restoreName,
    '--label',
    'shahn.phase=P25-test',
    '--network',
    'none',
    '-u',
    'postgres',
    '-v',
    scratch + ':/p25',
    '-v',
    name + '-data:/restore',
    '--entrypoint',
    'pgbackrest',
    image,
    '--config=/p25/keys/restore.conf',
    '--stanza=erp',
    '--type=name',
    '--target=' + checkpoint,
    '--target-action=promote',
    'restore',
  ]);
  const restoredPort = await port();
  await docker([
    'run',
    '-d',
    '--name',
    restored,
    '--label',
    'shahn.phase=P25-test',
    '--network',
    network,
    '-p',
    `127.0.0.1:${restoredPort}:5432`,
    '-v',
    scratch + ':/p25',
    '-v',
    name + '-data:/restore',
    '--entrypoint',
    'postgres',
    '-u',
    'postgres',
    image,
    '-D',
    '/restore',
    '-c',
    'archive_mode=off',
  ]);
  owned.push(restored);
  const restoredAddress = await docker([
    'inspect',
    '--format',
    '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}',
    restored,
  ]);
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(restoredAddress))
    throw Error('ISOLATED_DATABASE_ADDRESS_REQUIRED');
  restoredPool = createPool(
    `postgresql://shahn_test:${password}@${restoredAddress}:5432/shahn_p25_test`,
  );
  await waitReady(restoredPool);
  const after = await capture(restoredPool);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('RESTORED_CHECKPOINT_MISMATCH');
  const missing =
    (
      await restoredPool.query('SELECT id FROM command_record WHERE command_id=$1', [
        late.commandId,
      ])
    ).rowCount === 0;
  if (!missing) throw Error('ERP_ONLY_MOVEMENT_REAPPEARED');
  evidence.restore = {
    checkpoint,
    checkpointAt,
    elapsedMs: Math.round(performance.now() - t0),
    before,
    after,
    equal: true,
    lostNativeCommandId: late.commandId,
    lostAmountMinor: '2300',
    lostMovementAbsent: true,
    lastVerifiedRecoveryPoint: checkpointAt,
    uncertainIntervalStart: checkpointAt,
    humanDecision:
      'External cash evidence and typed reconciliation are mandatory before disbursement; Tawsel cannot reconstruct this withdrawal.',
  };
  evidence.step = 'wrong-key-refusal';
  // Prove repository ciphertext cannot be read with a wrong key, using a separate tool config.
  await writeFile(
    join(scratch, 'keys/wrong.conf'),
    conf('/restore').replace(key, randomBytes(32).toString('hex')),
    { mode: 0o600 },
  );
  await docker(['exec', source, 'chown', 'postgres:postgres', '/p25/keys/wrong.conf']);
  let wrongKeyRejected = false;
  try {
    await exec(
      'docker',
      [
        'exec',
        '-u',
        'postgres',
        source,
        'pgbackrest',
        '--config=/p25/keys/wrong.conf',
        '--stanza=erp',
        '--pg1-path=/tmp/p25-wrong-key-restore',
        'restore',
      ],
      { timeout: 60000, maxBuffer: 1024 * 1024 },
    );
  } catch (error) {
    const result = error as { code?: number; stdout?: string; stderr?: string };
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    evidence.wrongKeyFailure = {
      exitCode: result.code ?? null,
      kind: /CryptoError|CipherError|unable to decrypt/i.test(output)
        ? 'decryption'
        : /permission denied/i.test(output)
          ? 'permission'
          : /missing file/i.test(output)
            ? 'missing-file'
            : 'other',
    };
    wrongKeyRejected =
      result.code !== 0 && /CryptoError|CipherError|unable to decrypt/i.test(output);
    if (!wrongKeyRejected && result.code === 75) {
      // Some wrong AES-CBC keys produce invalid plaintext reported as FormatError.
      // Require both restore refusal and a repository-info error, never generic unavailability.
      const wrongInfo = await docker([
        'exec',
        '-u',
        'postgres',
        source,
        'pgbackrest',
        '--config=/p25/keys/wrong.conf',
        '--stanza=erp',
        'info',
      ]);
      wrongKeyRejected =
        /status: error/.test(wrongInfo) &&
        /FormatError/.test(wrongInfo) &&
        /unable to load info file.*backup\.info/.test(wrongInfo);
      if (wrongKeyRejected)
        evidence.wrongKeyFailure = {
          exitCode: result.code,
          kind: 'invalid-decrypted-repository-info',
        };
    }
  }
  if (!wrongKeyRejected) throw Error('WRONG_KEY_NOT_REJECTED');
  evidence.wrongEncryptionKeyRejected = true;
  evidence.wrongKeyStatus =
    'Actual restore refused and repository info could not be decrypted/parsed with the wrong key; correct-key retrieval and restore passed. No key or raw error logged.';
  evidence.step = 'intentional-archive-failure';
  await pool.query("ALTER SYSTEM SET archive_command='false'");
  await pool.query('SELECT pg_reload_conf()');
  await pool.query("SELECT pg_create_restore_point('p25_archive_failure')");
  await pool.query('SELECT pg_switch_wal()');
  let row:
    { last_archived_time: Date; last_failed_time: Date | null; failed_count: string } | undefined;
  for (let n = 0; n < 50; n++) {
    row = (await pool.query('SELECT * FROM pg_stat_archiver')).rows[0];
    if (row?.last_failed_time) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!row?.last_failed_time) throw Error('ARCHIVE_FAILURE_NOT_OBSERVED');
  const alert = archiveHealth({
    lastArchivedAt: row.last_archived_time?.toISOString() ?? null,
    lastFailureAt: row.last_failed_time.toISOString(),
    failedCount: Number(row.failed_count),
    latestBackupStop: null,
  });
  if (alert.state !== 'review-required') throw Error('ARCHIVE_FAILURE_NOT_ALERTED');
  evidence.failedArchiveAlert = { ...alert, lastVerifiedRecoveryPoint: checkpointAt };
  evidence.step = 'archive-recovery-check';
  await pool.query(
    "ALTER SYSTEM SET archive_command='pgbackrest --config=/p25/keys/source.conf --stanza=erp archive-push %p'",
  );
  await pool.query('SELECT pg_reload_conf()');
  await pgbackrest(source, ['check']);
  evidence.archivingRecovered = true;
  evidence.secretBoundary =
    'Encryption configs are in a separate keys directory; repository contains no decryption/issuer material. Local test key retention is operator-controlled.';
} catch (error) {
  evidence.failure = error instanceof Error ? error.message : 'P25 rehearsal failed';
  evidence.databaseLogs = Object.fromEntries(
    await Promise.all(
      owned.map(async (container) => [
        container,
        (await docker(['logs', container]).catch(() => 'No startup log available'))
          .replaceAll(password, '[redacted]')
          .replaceAll(key, '[redacted]'),
      ]),
    ),
  );
  process.exitCode = 1;
} finally {
  const cleanupErrors: string[] = [];
  await restoredPool?.end().catch(() => cleanupErrors.push('restored-pool-close'));
  await pool?.end().catch(() => cleanupErrors.push('source-pool-close'));
  for (const container of owned) {
    try {
      const label = await docker([
        'inspect',
        '--format',
        '{{index .Config.Labels "shahn.phase"}}',
        container,
      ]);
      if (label !== 'P25-test') throw Error('UNOWNED_TEST_CONTAINER');
      await docker(['rm', '-f', container]);
    } catch {
      cleanupErrors.push('owned-container-cleanup-unverified');
    }
  }
  // Retain the encrypted repository/keys and restored volume privately for review, never in Git.
  await docker(['network', 'rm', network]).catch(() => {});
  if (cleanupErrors.length) {
    evidence.cleanupErrors = cleanupErrors;
    evidence.failure ??= 'CLEANUP_NOT_VERIFIED';
    process.exitCode = 1;
  }
  await mkdir('docs/verification/P25', { recursive: true });
  await writeFile('docs/verification/P25/backup-rehearsal.json', JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify({
      passed: !evidence.failure,
      evidence: 'docs/verification/P25/backup-rehearsal.json',
    }),
  );
}
