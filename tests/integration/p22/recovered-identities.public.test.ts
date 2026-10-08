import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createPool } from '@shahn/database';

async function liveDatabase() {
  const file = process.env['TAWSEL_P22_TRIAL_FILE'];
  if (!file) throw Error('BLOCKED: actual approved P22 trial is required; no fixture substituted.');
  const trial = JSON.parse(await readFile(file, 'utf8')) as {
    approvedTestEnvironment: boolean;
    companyId: string;
    nativeDatabaseReference: string;
  };
  const native = JSON.parse(
    await readFile(resolve(dirname(file), trial.nativeDatabaseReference), 'utf8'),
  ) as { databaseUrl: string; databaseName: string };
  if (
    !trial.approvedTestEnvironment ||
    new URL(native.databaseUrl).hostname !== '127.0.0.1' ||
    !native.databaseName.includes('shahn-p03-test-')
  )
    throw Error('P22_OWNED_ISOLATED_TRIAL_REQUIRED');
  return { company: trial.companyId, pool: createPool(native.databaseUrl) };
}
it('checks committed identities from actual human no-answer, whole retry, correction and service replay', async () => {
  const s = await liveDatabase();
  try {
    const e = JSON.parse(await readFile('docs/verification/P22/live-whole-retry.json', 'utf8'));
    expect(e.evidenceKind).toBe('actual-http');
    expect(e.firstAttemptId).not.toBe(e.secondAttemptId);
    expect(e.duplicateRetainedHumanResultsEqual).toBe(true);
    expect(e.after.visits).toEqual(e.before.visits);
    expect(e.after.earnings).toEqual(e.before.earnings);
    expect(e.postedFeeLineage.afterReplay).toEqual(e.postedFeeLineage.beforeReplay);
    const visits = (
      await s.pool.query(
        'SELECT attempt_id FROM execution.visit_fact WHERE company_id=$1 AND task_id=$2 ORDER BY attempt_id',
        [s.company, e.taskId],
      )
    ).rows.map((r) => r.attempt_id);
    expect(visits).toEqual([e.firstAttemptId, e.secondAttemptId].sort());
    const earnings = (
      await s.pool.query(
        'SELECT e.amount_minor::text FROM execution.earning_basis e JOIN execution.visit_fact v ON(v.company_id,v.id)=(e.company_id,e.visit_id) WHERE v.company_id=$1 AND v.task_id=$2',
        [s.company, e.taskId],
      )
    ).rows;
    expect(earnings).toEqual([{ amount_minor: '500' }, { amount_minor: '500' }]);
    const fee = (
      await s.pool.query(
        "SELECT sum(e.amount_minor)::text amount FROM kernel.journal_effect e JOIN kernel.source_record r ON(r.company_id,r.id)=(e.company_id,e.source_id) WHERE r.company_id=$1 AND r.identity LIKE $2 AND e.family='brand'",
        [s.company, '%:' + e.taskId + ':%'],
      )
    ).rows[0];
    expect(fee.amount).toBe('-10000');
    expect(e.postedFeeLineage.brandNetMinor).toBe(-10000);
  } finally {
    await s.pool.end();
  }
});
it('checks actual source acceptance survived a process exit before native completion without a new action', async () => {
  const s = await liveDatabase();
  try {
    const e = JSON.parse(
      await readFile('docs/verification/P22/live-source-interruption.json', 'utf8'),
    );
    expect(e.evidenceKind).toBe('actual-http');
    expect(e.childExitCode).toBe(76);
    expect(e.uncertain.state).toBe('sending');
    expect(e.uncertain.remote_result).toBeNull();
    expect(Number(e.after.fence)).toBeGreaterThan(Number(e.uncertain.fence));
    expect(e.recoveryCalls).toEqual(['retained-result:' + e.actionId]);
    const rows = (
      await s.pool.query(
        'SELECT state,request_body,remote_result FROM integration.source_command WHERE company_id=$1 AND action_id=$2',
        [s.company, e.actionId],
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe('accepted');
    expect(rows[0].remote_result.receipt.receiptId).toBe(e.remoteReceiptId);
    expect(createHash('sha256').update(rows[0].request_body).digest('hex')).toBe(e.requestSha256);
    expect(
      (
        await s.pool.query(
          'SELECT task_id FROM dispatch.cycle WHERE company_id=$1 AND shipment_id=$2',
          [s.company, e.shipmentId],
        )
      ).rows,
    ).toEqual([{ task_id: e.cycles[0].task_id }]);
  } finally {
    await s.pool.end();
  }
});
it('checks the actual committed 3-before-1/2 stream retains incomplete history until public replay', async () => {
  const s = await liveDatabase();
  try {
    const e = JSON.parse(await readFile('docs/verification/P22/live-reorder.json', 'utf8'));
    expect(e.evidenceKind).toBe('actual-http');
    expect(e.actualEvents.map((r: { sequence: number }) => r.sequence).sort()).toEqual([1, 2, 3]);
    expect(Number(e.gapped.received_high)).toBe(3);
    expect(Number(e.gapped.received_through)).toBe(0);
    expect(Number(e.gapped.applied_through)).toBe(0);
    expect(Number(e.current.stream.snapshotThrough)).toBe(3);
    expect(e.current.stream.historyComplete).toBe(false);
    expect(e.businessAfter).toEqual(e.businessBefore);
    const checkpoint = (
      await s.pool.query(
        'SELECT applied_through,history_complete FROM integration.checkpoint WHERE company_id=$1 AND aggregate_id=$2',
        [s.company, e.taskId],
      )
    ).rows[0];
    expect(Number(checkpoint.applied_through)).toBe(3);
    expect(checkpoint.history_complete).toBe(true);
    expect(
      (
        await s.pool.query(
          'SELECT count(*)::int n FROM integration.inbox WHERE company_id=$1 AND aggregate_id=$2',
          [s.company, e.taskId],
        )
      ).rows[0].n,
    ).toBe(3);
  } finally {
    await s.pool.end();
  }
});
