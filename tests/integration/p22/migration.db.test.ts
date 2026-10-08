import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations } from '@shahn/database';
import { payoutFixture } from '../p17/fixtures.js';
import { normalizedRecoveryState } from '../../../scripts/verification/p22-restore.js';
it('detects inconsistent old checkpoints without rewriting counters or posted remittance, payout and custody', async () => {
  const db = await isolatedPostgres();
  let f: Awaited<ReturnType<typeof payoutFixture>> | undefined;
  try {
    await migrate(db.pool, (await readMigrations()).slice(0, 25));
    f = await payoutFixture(db.pool);
    const brand = await f.brand('P22 populated upgrade');
    const round = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
    await f.remit(round.scope);
    await f.payoutService.confirm(
      f.payB.token,
      await f.command(f.scope(brand, '10000'), {}, f.payB.token),
    );
    const before = await normalizedRecoveryState(db.pool, f.company);
    const old = (
      await db.pool.query(
        `UPDATE integration.checkpoint SET received_high=received_high+1 WHERE company_id=$1 RETURNING aggregate_type,aggregate_id,received_through,received_high,applied_through,projected_through,snapshot_through`,
        [f.company],
      )
    ).rows;
    expect(old.length).toBeGreaterThan(0);
    await migrate(db.pool);
    const now = (
      await db.pool.query(
        `SELECT aggregate_type,aggregate_id,received_through,received_high,applied_through,projected_through,snapshot_through,rebuild_required,history_complete FROM integration.checkpoint WHERE company_id=$1`,
        [f.company],
      )
    ).rows;
    for (const c of now) {
      expect(c.rebuild_required).toBe(true);
      expect(c.history_complete).toBe(false);
      const { rebuild_required: _rebuild, history_complete: _history, ...counters } = c;
      expect(old).toContainEqual(counters);
    }
    expect(await normalizedRecoveryState(db.pool, f.company)).toEqual(before);
    expect(before['finance.remittance']?.count).toBe(1);
    expect(before['finance.brand_payout']?.count).toBe(1);
  } finally {
    await f?.close();
    await db.dispose();
  }
});
