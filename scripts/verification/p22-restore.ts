import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createPool } from '@shahn/database';
import type { Pool } from 'pg';
const exec = promisify(execFile);
const tables = [
  'kernel.source_record',
  'kernel.journal_effect',
  'kernel.shipping_cover',
  'kernel.credit_lot',
  'kernel.credit_release',
  'kernel.lot_allocation',
  'kernel.wallet_hold',
  'kernel.hold_release',
  'kernel.cover_close',
  'shipments.parcel_custody',
  'inventory.stock_movement',
  'inventory.stock_position',
  'inventory.stock_reservation',
  'execution.visit_fact',
  'execution.outcome_fact',
  'execution.earning_basis',
  'execution.allocation',
  'execution.settlement_review',
  'returns.request',
  'returns.item',
  'returns.return_receipt',
  'returns.return_receipt_line',
  'returns.receipt_allocation',
  'returns.transition',
  'dispatch.cycle',
  'finance.remittance',
  'finance.brand_payout',
  'finance.payout_allocation',
  'finance.remittance_source',
  'finance.remittance_component',
  'finance.movement',
  'finance.account_balance',
  'employees.payroll_outcome',
  'employees.salary_payment',
  'employees.payroll_recovery',
  'integration.source_command',
];
export async function normalizedRecoveryState(pool: Pool, company: string) {
  const result: Record<string, { count: number; hash: string }> = {};
  for (const table of tables) {
    if (!(await pool.query(`SELECT to_regclass($1) present`, [table])).rows[0].present) continue;
    const rows = (
      await pool.query(
        `SELECT to_jsonb(t) body FROM ${table} t WHERE company_id=$1 ORDER BY to_jsonb(t)::text`,
        [company],
      )
    ).rows.map((r) => r.body);
    result[table] = {
      count: rows.length,
      hash: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    };
  }
  return result;
}
/** Only a freshly created isolatedPostgres native fixture can be passed; no arbitrary DB CLI target. */
export async function restoreIsolatedRecoveryDatabase(
  db: { name: string; url: string; pool: Pool },
  company: string,
  verify: (restored: Pool, url: string) => Promise<void>,
) {
  const bin = process.env['SHAHN_TEST_PG_BIN'];
  if (!bin)
    throw Error(
      'BLOCKED P22 restore: native PostgreSQL 18 dump/restore tools required; no mock or production target used.',
    );
  const source = new URL(db.url),
    owned = await realpath(db.name),
    parent = await realpath(tmpdir());
  if (
    !owned.startsWith(parent + sep) ||
    !owned.includes('shahn-p03-test-') ||
    source.hostname !== '127.0.0.1' ||
    source.pathname !== '/postgres'
  )
    throw Error('P22_RESTORE_REQUIRES_OWNED_DISPOSABLE_FIXTURE');
  const directory = await mkdtemp(join(parent, 'shahn-p22-backup-')),
    target = 'p22_restore_' + randomUUID().replaceAll('-', ''),
    dump = join(directory, 'erp.dump');
  const exe = (name: string) => join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
  const args = [
    '--host',
    source.hostname,
    '--port',
    source.port,
    '--username',
    decodeURIComponent(source.username),
  ];
  const env = { ...process.env, PGPASSWORD: decodeURIComponent(source.password) };
  const point = (await db.pool.query(`SELECT clock_timestamp() point`)).rows[0].point.toISOString(),
    before = await normalizedRecoveryState(db.pool, company),
    start = performance.now();
  let restored: Pool | null = null,
    created = false;
  try {
    try {
      await exec(
        exe('pg_dump'),
        [
          ...args,
          '--dbname',
          'postgres',
          '--format=custom',
          '--no-owner',
          '--no-acl',
          '--file',
          dump,
        ],
        { env, windowsHide: true, maxBuffer: 1048576 },
      );
    } catch {
      throw Error('P22_TEST_BACKUP_FAILED');
    }
    await db.pool.query(`CREATE DATABASE ${target}`);
    created = true;
    try {
      await exec(
        exe('pg_restore'),
        [...args, '--dbname', target, '--no-owner', '--no-acl', '--exit-on-error', dump],
        { env, windowsHide: true, maxBuffer: 1048576 },
      );
    } catch {
      throw Error('P22_TEST_RESTORE_FAILED');
    }
    const url = new URL(db.url);
    url.pathname = '/' + target;
    restored = createPool(url.toString());
    const afterRestore = await normalizedRecoveryState(restored, company);
    if (JSON.stringify(before) !== JSON.stringify(afterRestore))
      throw Error('P22_RESTORE_COMPARISON_MISMATCH');
    await verify(restored, url.toString());
    const afterRedelivery = await normalizedRecoveryState(restored, company);
    if (JSON.stringify(before) !== JSON.stringify(afterRedelivery))
      throw Error('P22_REDELIVERY_ADDED_BUSINESS_EFFECT');
    return {
      backupPoint: point,
      elapsedMs: Math.round(performance.now() - start),
      before,
      afterRestore,
      afterRedelivery,
      equal: true,
      testBoundary:
        'Separate test database; original committed events only. No claim beyond backup point or live Tawsel/issuer restart.',
    };
  } finally {
    await restored?.end();
    if (created) {
      // Only the owned disposable DB is dropped. Give PostgreSQL's database cleanup its
      // own bounded administrative timeout; the ERP's normal 5s statement limit remains.
      const cleanup = await db.pool.connect();
      try {
        await cleanup.query('SET statement_timeout=30000');
        await cleanup.query(`DROP DATABASE ${target} WITH (FORCE)`);
      } finally {
        await cleanup.query('SET statement_timeout=5000');
        cleanup.release();
      }
    }
    const resolved = await realpath(directory);
    if (resolved.startsWith(parent + sep) && resolved.includes('shahn-p22-backup-'))
      await rm(resolved, { recursive: true, force: true });
  }
}
