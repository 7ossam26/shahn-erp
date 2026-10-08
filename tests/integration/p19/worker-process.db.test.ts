import { execFileSync, spawn } from 'node:child_process';
import { expect, it } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { storageFixture } from './fixtures.js';
it('the actual worker process discovers and renews a due agreement with the Cairo database date, then stops cleanly', async () => {
  // The worker resolves @shahn/api through its built package output.
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-b', 'apps/worker'], {
    stdio: 'inherit',
  });
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const f = await storageFixture(db.pool);
    const today = (
      await db.pool.query<{ d: string }>(
        `SELECT (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date::text AS d`,
      )
    ).rows[0]!.d;
    f.clock.today = today;
    const b = await f.brand('براند العامل الفعلي', today, '31000');
    const worker = spawn(process.execPath, ['--import', 'tsx', 'apps/worker/src/main.ts'], {
      env: {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_URL: db.url,
        MIGRATION_DATABASE_URL: db.url,
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    worker.stdout!.on('data', (chunk) => (output += String(chunk)));
    worker.stderr!.on('data', (chunk) => (output += String(chunk)));
    let period: { start: string; fee: string } | undefined;
    for (let i = 0; i < 60 && !period; i++) {
      await new Promise((r) => setTimeout(r, 500));
      period = (
        await db.pool.query(
          `SELECT start_date::text AS start,fee_minor::text AS fee FROM storage.period WHERE agreement_id=$1`,
          [b.agreementId],
        )
      ).rows[0];
    }
    const exited = new Promise<number | null>((resolve) => worker.once('exit', resolve));
    worker.send('shutdown');
    expect(await exited).toBe(0);
    expect(period).toEqual({ start: today, fee: '31000' });
    expect(output).toContain('"businessQueues":4');
    expect(output).toContain('"state":"stopped"');
    expect(output).not.toContain(db.url);
    const job = (
      await db.pool.query(
        `SELECT state,fence,lane FROM work_item WHERE kind='storage.renew' AND entity_id=$1`,
        [b.agreementId],
      )
    ).rows;
    expect(job).toEqual([{ state: 'ready', fence: 1, lane: 'storage' }]);
    expect(await f.revenueByMonth(b.brandId)).toEqual({ [today.slice(0, 7)]: '31000' });
  } finally {
    await db.dispose();
  }
}, 90000);
