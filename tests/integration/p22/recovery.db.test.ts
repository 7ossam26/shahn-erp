import { beforeEach, afterEach, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import {
  migrate,
  readMigrations,
  transaction,
  sourceByCompany,
  insertReplayedEvent,
  insertReceivedEvent,
} from '@shahn/database';
import type {
  ReplayPage,
  ReconciliationSnapshot,
  AggregateIdentity,
} from '@shahn/contracts/tawsel';
import { executionFixture } from '../p13/fixtures.js';
import { RecoveryWorker } from '../../../apps/api/src/modules/integration/recovery-worker.js';
import {
  RecoveryClient,
  RecoveryFailure,
} from '../../../apps/api/src/modules/integration/recovery-client.js';
import { recoveryCommands } from '../../../apps/api/src/modules/integration/recovery.service.js';
import { claimWork } from '../../../apps/api/src/modules/kernel/work.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { recoveryDetail } from '../../../apps/api/src/modules/integration/recovery.service.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { validateRecoveryView, validateRecoveryDetail } from '@shahn/contracts';
import { mappedEvents } from '../p11/mapped-events.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof executionFixture>>;
beforeEach(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 16));
  f = await executionFixture(db.pool);
  await migrate(db.pool);
});
afterEach(async () => {
  await db?.dispose();
});
const drain = async () => {
  for (let i = 0; i < 20; i++) if (!(await f.worker.runOne())) break;
};
const cp = async (id: string) =>
  (
    await db.pool.query(
      `SELECT * FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 AND aggregate_id=$3`,
      [f.company, f.sourceId, id],
    )
  ).rows[0];
const command = async (
  type: 'recovery.replay' | 'recovery.reconcile' | 'recovery.report',
  id: string,
) =>
  (
    await recoveryCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type,
      aggregateType: 'task',
      aggregateId: id,
    })
  ).body as { jobId: string; actionId: string };
const retrieved = <T>(body: T) => ({
  body,
  rawBody: Buffer.from(JSON.stringify(body)),
  retrievedAt: new Date().toISOString(),
});
// Protocol harness only: public HTTP semantics/authority are a separately required suite.
class HarnessClient extends RecoveryClient {
  constructor(readonly page: ReplayPage | ReconciliationSnapshot | RecoveryFailure) {
    super(f.connection);
  }
  override async replay(_a: AggregateIdentity, _after: number) {
    if (this.page instanceof RecoveryFailure) throw this.page;
    return retrieved(this.page as ReplayPage);
  }
  override async reconciliation(_a: AggregateIdentity) {
    if (this.page instanceof RecoveryFailure) throw this.page;
    return retrieved(this.page as ReconciliationSnapshot);
  }
}
it('sequence 3, current snapshot through 3, late events 1/2 and live/replay duplicate yield one visit and no cash', async () => {
  const x = await f.received(),
    arrival = x.arrival(),
    duplicate = {
      ...arrival,
      eventId: randomUUID(),
      aggregate: { ...arrival.aggregate, recipientSequence: 2 },
    },
    outcome = await x.outcome('no-answer'),
    third = f.event('outcome.recorded', { outcome }, x.task.taskId, 3);
  await f.receive(third);
  expect(await cp(x.task.taskId)).toMatchObject({
    received_through: '0',
    received_high: '3',
    applied_through: '0',
    history_complete: false,
  });
  await command('recovery.reconcile', x.task.taskId);
  const snapshot: ReconciliationSnapshot = {
    schemaVersion: '1.0.0',
    tenantId: f.connection.tenantId,
    recipientIntegrationId: f.connection.integrationId,
    aggregate: { type: 'task', id: x.task.taskId },
    throughSequence: 3,
    capturedAt: new Date().toISOString(),
    state: { task: x.task, outcomes: [outcome], returnRequest: null, returnItems: [], notices: [] },
    history: 'current-state-only',
    retention: 'indefinite-no-purge',
  };
  // The concrete location notice permits fractional coordinates. Recovery must
  // compare wire JSON without the integer-only native command canonicalizer.
  const pin = mappedEvents().find((e) => e.eventType === 'location.pinConfirmed')!;
  pin.tenantId = f.connection.tenantId;
  pin.recipientIntegrationId = f.connection.integrationId;
  pin.aggregate = { type: 'task', id: x.task.taskId, recipientSequence: 2 };
  pin.resources.taskId = x.task.taskId;
  (pin.payload.location as { taskId: string }).taskId = x.task.taskId;
  snapshot.state.notices = [{ key: 'generated-fractional-pin', event: pin }];
  await new RecoveryWorker(db.pool, f.runtime, () => new HarnessClient(snapshot)).runOne();
  expect(await cp(x.task.taskId)).toMatchObject({
    snapshot_through: '3',
    projected_through: '3',
    applied_through: '0',
    history_complete: false,
  });
  // A closed-schema-valid but different accepted commercial basis cannot replace
  // the known source snapshot under the same revision.
  const conflicting = structuredClone(snapshot);
  conflicting.state.task!.snapshot.recipientName = 'different accepted basis';
  const conflictJob = await command('recovery.reconcile', x.task.taskId);
  const gappedDetail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'integration', (u) =>
    recoveryDetail(u, conflictJob.jobId),
  );
  expect(gappedDetail.missingRanges).toEqual([{ from: '1', to: '2' }]);
  expect(gappedDetail.moreMissingRanges).toBe(false);
  await new RecoveryWorker(db.pool, f.runtime, () => new HarnessClient(conflicting)).runOne();
  expect(
    (
      await db.pool.query(`SELECT state,last_error FROM integration.recovery_job WHERE id=$1`, [
        conflictJob.jobId,
      ])
    ).rows[0],
  ).toEqual({ state: 'review-required', last_error: 'SNAPSHOT_NATIVE_SOURCE_MISMATCH' });
  const before = (
    await db.pool.query(`SELECT count(*)::int n FROM kernel.journal_effect WHERE family='money'`)
  ).rows[0].n;
  await command('recovery.replay', x.task.taskId);
  await new RecoveryWorker(
    db.pool,
    f.runtime,
    () =>
      new HarnessClient({
        events: [arrival, duplicate, third],
        nextAfterSequence: null,
        retention: 'indefinite-no-purge',
        projectionStatus: 'unknown',
      }),
  ).runOne();
  await drain();
  await f.receive(arrival);
  await drain();
  expect(await cp(x.task.taskId)).toMatchObject({
    received_through: '3',
    applied_through: '3',
    projected_through: '3',
    snapshot_through: '3',
    history_complete: true,
  });
  expect(
    (
      await db.pool.query(`SELECT count(*)::int n FROM execution.visit_fact WHERE task_id=$1`, [
        x.task.taskId,
      ])
    ).rows[0].n,
  ).toBe(1);
  expect(
    (await db.pool.query(`SELECT count(*)::int n FROM kernel.journal_effect WHERE family='money'`))
      .rows[0].n,
  ).toBe(before);
  const report = await command('recovery.report', x.task.taskId),
    again = await command('recovery.report', x.task.taskId);
  expect(again.actionId).toBe(report.actionId);
  const r = (
    await db.pool.query(`SELECT request_body FROM integration.source_command WHERE action_id=$1`, [
      report.actionId,
    ])
  ).rows[0];
  expect(JSON.parse(r.request_body).payload).toMatchObject({
    appliedThrough: 3,
    historyComplete: true,
    snapshotThrough: 3,
  });
});
it('rolls back inbox, evidence and cursor together; ignores an old fenced response', async () => {
  const x = await f.received(),
    arrival = x.arrival();
  await transaction(db.pool, async (c) => {
    const s = (await sourceByCompany(c, f.company))!;
    await c.query(
      `INSERT INTO integration.checkpoint(company_id,source_id,aggregate_type,aggregate_id) VALUES($1,$2,'task',$3) ON CONFLICT DO NOTHING`,
      [s.company_id, s.id, x.task.taskId],
    );
  });
  const j = await command('recovery.replay', x.task.taskId),
    worker = new RecoveryWorker(
      db.pool,
      f.runtime,
      () =>
        new HarnessClient({
          events: [arrival],
          nextAfterSequence: null,
          retention: 'indefinite-no-purge',
          projectionStatus: 'unknown',
        }),
      async () => {
        throw Error('P22_INJECTED_ROLLBACK');
      },
    );
  const lease = (await claimWork(db.pool, worker.owner, ['integration.replay']))!,
    basis = await worker.basis(lease);
  const result = retrieved({
    events: [arrival],
    nextAfterSequence: null,
    retention: 'indefinite-no-purge' as const,
    projectionStatus: 'unknown' as const,
  });
  await expect(worker.commit(lease, basis, result)).rejects.toThrow('P22_INJECTED_ROLLBACK');
  expect(await cp(x.task.taskId)).toMatchObject({ received_high: '0' });
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int n FROM integration.recovery_evidence WHERE job_id=$1`,
        [j.jobId],
      )
    ).rows[0].n,
  ).toBe(0);
  await db.pool.query(
    `UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1`,
    [lease.id],
  );
  await claimWork(db.pool, randomUUID(), ['integration.replay']);
  expect(await worker.commit(lease, basis, result)).toBe(false);
  expect(await cp(x.task.taskId)).toMatchObject({ received_high: '0' });
});
it('persists 410 as expired and bounds 503 retry without altering confirmed counters', async () => {
  const x = await f.received();
  await f.receive(x.arrival());
  await drain();
  const j = await command('recovery.replay', x.task.taskId),
    worker = new RecoveryWorker(
      db.pool,
      f.runtime,
      () => new HarnessClient(new RecoveryFailure('history-expired', 'replay_expired', 410)),
    );
  await worker.runOne();
  expect(
    (
      await db.pool.query(`SELECT state,failure_class FROM integration.recovery_job WHERE id=$1`, [
        j.jobId,
      ])
    ).rows[0],
  ).toEqual({ state: 'expired', failure_class: 'history-expired' });
  const j2 = await command('recovery.reconcile', x.task.taskId),
    w2 = new RecoveryWorker(
      db.pool,
      f.runtime,
      () => new HarnessClient(new RecoveryFailure('outage', 'RECOVERY_UNAVAILABLE', 503)),
    );
  for (let i = 0; i < 5; i++) {
    await w2.runOne();
    await db.pool.query(
      `UPDATE work_item SET available_at=clock_timestamp() WHERE id=(SELECT work_id FROM integration.recovery_job WHERE id=$1)`,
      [j2.jobId],
    );
  }
  expect(
    (
      await db.pool.query(`SELECT state,failure_class FROM integration.recovery_job WHERE id=$1`, [
        j2.jobId,
      ])
    ).rows[0],
  ).toEqual({ state: 'review-required', failure_class: 'outage' });
  expect(await cp(x.task.taskId)).toMatchObject({ applied_through: '1', snapshot_through: '0' });
});
it('follows bounded replay pages with competing workers and revalidates a changed live basis', async () => {
  const x = await f.received(),
    first = x.arrival(),
    second = {
      ...first,
      eventId: randomUUID(),
      aggregate: { ...first.aggregate, recipientSequence: 2 },
    },
    third = {
      ...first,
      eventId: randomUUID(),
      aggregate: { ...first.aggregate, recipientSequence: 3 },
    };
  const j = await command('recovery.replay', x.task.taskId);
  let reads = 0;
  let entered!: () => void, release!: () => void;
  const atRead = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  class HeldClient extends HarnessClient {
    override async replay(a: AggregateIdentity, after: number) {
      entered();
      await held;
      return super.replay(a, after);
    }
  }
  const factory = () => {
    reads++;
    return new HeldClient({
      events: [first],
      nextAfterSequence: 1,
      retention: 'indefinite-no-purge',
      projectionStatus: 'unknown',
    });
  };
  const one = new RecoveryWorker(db.pool, f.runtime, factory),
    two = new RecoveryWorker(db.pool, f.runtime, factory);
  const firstRun = one.runOne();
  await atRead;
  expect(await two.runOne()).toBe(false);
  release();
  expect(await firstRun).toBe(true);
  expect(reads).toBe(1);
  const lease = (await claimWork(db.pool, two.owner, ['integration.replay']))!,
    basis = await two.basis(lease);
  expect(basis.job.next_after).toBe('1');
  await f.receive(third);
  await expect(
    two.commit(
      lease,
      basis,
      retrieved({
        events: [second, third],
        nextAfterSequence: null,
        retention: 'indefinite-no-purge',
        projectionStatus: 'unknown',
      }),
    ),
  ).rejects.toThrow('RECOVERY_BASIS_CHANGED');
  expect(
    (
      await db.pool.query(
        `SELECT next_after,page_count FROM integration.recovery_job WHERE id=$1`,
        [j.jobId],
      )
    ).rows[0],
  ).toEqual({ next_after: '1', page_count: 1 });
  await two.fail(lease, new RecoveryFailure('basis-changed', 'RECOVERY_BASIS_CHANGED'));
  await db.pool.query(`UPDATE work_item SET available_at=clock_timestamp() WHERE id=$1`, [
    lease.id,
  ]);
  await new RecoveryWorker(
    db.pool,
    f.runtime,
    () =>
      new HarnessClient({
        events: [second, third],
        nextAfterSequence: null,
        retention: 'indefinite-no-purge',
        projectionStatus: 'unknown',
      }),
  ).runOne();
  await drain();
  expect(await cp(x.task.taskId)).toMatchObject({
    applied_through: '3',
    received_high: '3',
    history_complete: true,
  });
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int n FROM integration.recovery_evidence WHERE job_id=$1`,
        [j.jobId],
      )
    ).rows[0].n,
  ).toBe(2);
  expect(
    (
      await db.pool.query(`SELECT count(*)::int n FROM execution.visit_fact WHERE task_id=$1`, [
        x.task.taskId,
      ])
    ).rows[0].n,
  ).toBe(1);
});
it('binds authenticated bytes after replay, rejects subsequent byte collisions and rechecks cached job access', async () => {
  const x = await f.received(),
    a = x.arrival();
  await transaction(db.pool, async (c) =>
    insertReplayedEvent(c, (await sourceByCompany(c, f.company))!, a),
  );
  await f.receive(a);
  await expect(
    transaction(db.pool, async (c) =>
      insertReceivedEvent(
        c,
        (await sourceByCompany(c, f.company))!,
        a,
        Buffer.from(JSON.stringify(a, null, 2)),
        { keyId: 'trial', deliveryTimestamp: String(Date.now()) },
      ),
    ),
  ).rejects.toThrow('payload_mismatch');
  const j = await command('recovery.replay', x.task.taskId);
  const detail = () =>
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'integration', (u) =>
      recoveryDetail(u, j.jobId),
    );
  expect((await detail()).job.id).toBe(j.jobId);
  const app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  );
  try {
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl(),
      h = { cookie: 'erp_session=' + f.admin.token };
    const view = await fetch(
      origin + '/api/v1/integration/recovery?companyId=' + f.company + '&branchId=' + f.a,
      { headers: h },
    );
    expect(view.status).toBe(200);
    expect(validateRecoveryView(await view.json())).toBe(true);
    const d = await fetch(
      origin + '/api/v1/integration/recovery/jobs/' + j.jobId + '?companyId=' + f.company,
      { headers: h },
    );
    expect(d.status).toBe(200);
    expect(validateRecoveryDetail(await d.json())).toBe(true);
    const body = {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'recovery.replay',
      aggregateType: 'task',
      aggregateId: x.task.taskId,
    };
    const post = (value: unknown, csrf = f.admin.csrfToken) =>
      fetch(origin + '/api/v1/integration/recovery/commands', {
        method: 'POST',
        headers: {
          ...h,
          Origin: f.config.origin,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify(value),
      });
    expect((await post(body, 'invalid')).status).toBe(403);
    expect((await post({ ...body, forceSuccess: true })).status).toBe(400);
    const first = await post(body);
    expect(first.status).toBe(202);
    expect((await first.json()).jobId).toBe(j.jobId);
    const second = await post(body);
    expect(second.status).toBe(202);
    expect((await second.json()).jobId).toBe(j.jobId);
  } finally {
    await app.close();
  }
  await db.pool.query(
    `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='integration'`,
    [f.company, f.adminRole],
  );
  await expect(detail()).rejects.toThrow();
});
