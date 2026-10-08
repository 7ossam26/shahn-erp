import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  transaction,
  sourceByCompany,
  recoveryStream,
  insertReplayedEvent,
  type IntegrationSource,
  type StreamRow,
  type TransactionClient,
} from '@shahn/database';
import {
  validateReplayPage,
  validateSnapshot,
  type ReconciliationSnapshot,
  type ReplayPage,
  type AggregateIdentity,
  canonicalTawselJson as canonical,
} from '@shahn/contracts/tawsel';
import { claimWork, lockLease, type Lease } from '../kernel/work.js';
import {
  RecoveryClient,
  RecoveryFailure,
  classifyRecoveryFailure,
  type Retrieved,
} from './recovery-client.js';
import { recoveryConnection } from './recovery.service.js';
import type { IntegrationRuntime } from './config.js';

const baseline = '32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada';
const hashes = {
  replay: 'acae29b68e9e267b2d1f495c6904880f421f3959684a3c14c8fa7c40f34bbf5b',
  reconcile: 'cbff563ea8ea28a6af9f557e85bab0097c89a095d2cb6ca74e3d066d26352fe1',
};
export interface RecoveryJobRow {
  company_id: string;
  source_id: string;
  id: string;
  aggregate_type: AggregateIdentity['type'];
  aggregate_id: string;
  kind: 'replay' | 'reconcile';
  next_after: string;
  page_count: number;
  work_id: string;
  state: string;
}
export interface RecoveryBasis {
  source: IntegrationSource;
  job: RecoveryJobRow;
  checkpoint: StreamRow;
}
export type RecoveryResult = Retrieved<ReplayPage> | Retrieved<ReconciliationSnapshot>;
/** Snapshot state is exported separately. It is never an invented receipt, visit or money entry. */
export async function validateNativeSnapshot(
  c: TransactionClient,
  s: IntegrationSource,
  v: ReconciliationSnapshot,
) {
  if (v.aggregate.type === 'task' && !v.state.task)
    throw new RecoveryFailure('invalid-response', 'SNAPSHOT_TASK_STATE_MISSING');
  if (v.aggregate.type === 'return-request' && !v.state.returnRequest)
    throw new RecoveryFailure('invalid-response', 'SNAPSHOT_RETURN_STATE_MISSING');
  if (v.state.task) {
    const t = v.state.task;
    const cycle = (
      await c.query(
        `SELECT * FROM dispatch.cycle WHERE company_id=$1 AND source_id=$2 AND task_id=$3 FOR UPDATE`,
        [s.company_id, s.id, t.taskId],
      )
    ).rows[0];
    if (
      !cycle ||
      cycle.external_id !== t.externalId ||
      cycle.source_cycle_id !== t.sourceDispatchCycleId ||
      Number(cycle.accepted_revision) !== t.sourceRevision ||
      cycle.remote_cycle_id !== t.dispatchCycleId ||
      (cycle.task && canonical(cycle.task.snapshot) !== canonical(t.snapshot))
    )
      throw new RecoveryFailure('semantic-conflict', 'SNAPSHOT_NATIVE_SOURCE_MISMATCH');
    if (cycle.task && Number(cycle.task.assignmentRevision) > t.assignmentRevision)
      throw new RecoveryFailure('basis-changed', 'SNAPSHOT_ASSIGNMENT_STALE');
  }
  for (const o of v.state.outcomes) {
    const cycle = (
      await c.query(
        `SELECT accepted_revision,external_id,source_cycle_id FROM dispatch.cycle WHERE company_id=$1 AND source_id=$2 AND task_id=$3 AND remote_cycle_id=$4 FOR UPDATE`,
        [s.company_id, s.id, o.taskId, o.dispatchCycleId],
      )
    ).rows[0];
    if (
      !cycle ||
      cycle.external_id !== o.sourceReference?.externalId ||
      cycle.source_cycle_id !== o.sourceDispatchCycleId ||
      Number(cycle.accepted_revision) !== o.sourceRevision
    )
      throw new RecoveryFailure('semantic-conflict', 'SNAPSHOT_OUTCOME_SOURCE_MISMATCH');
    const confirmed = (
      await c.query(
        `SELECT outcome_id,revision,record FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND task_id=$3 AND attempt_id=$4 ORDER BY revision DESC LIMIT 1`,
        [s.company_id, s.id, o.taskId, o.attemptId],
      )
    ).rows[0];
    if (
      confirmed &&
      (Number(confirmed.revision) > o.revision ||
        (Number(confirmed.revision) === o.revision && canonical(confirmed.record) !== canonical(o)))
    )
      throw new RecoveryFailure('semantic-conflict', 'SNAPSHOT_OUTCOME_CONFLICT');
  }
  if (v.aggregate.type === 'task') {
    const known = (
      await c.query(
        `SELECT DISTINCT ON(attempt_id) attempt_id,revision FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND task_id=$3 ORDER BY attempt_id,revision DESC`,
        [s.company_id, s.id, v.aggregate.id],
      )
    ).rows;
    if (
      known.some(
        (k) =>
          !v.state.outcomes.some(
            (o) => o.attemptId === k.attempt_id && o.revision >= Number(k.revision),
          ),
      )
    )
      throw new RecoveryFailure('invalid-response', 'SNAPSHOT_EFFECTIVE_OUTCOME_MISSING');
  }
  if (v.state.returnRequest) {
    const r = v.state.returnRequest;
    const request = (
      await c.query(
        `SELECT original FROM returns.request WHERE company_id=$1 AND source_id=$2 AND id=$3 FOR UPDATE`,
        [s.company_id, s.id, r.requestId],
      )
    ).rows[0];
    if (!request || canonical(request.original) !== canonical(r))
      throw new RecoveryFailure('semantic-conflict', 'SNAPSHOT_RETURN_IDENTITY_MISMATCH');
    const items = (
      await c.query(
        `SELECT id,requested,received,lost,damaged,unresolved FROM returns.item WHERE company_id=$1 AND source_id=$2 AND request_id=$3 ORDER BY id FOR UPDATE`,
        [s.company_id, s.id, r.requestId],
      )
    ).rows;
    for (const item of items) {
      const balance = v.state.returnItems.find((i) => i.itemId === item.id);
      if (
        !balance ||
        balance.requested !== item.requested ||
        balance.received < item.received ||
        balance.lost < item.lost ||
        balance.damaged < item.damaged
      )
        throw new RecoveryFailure('semantic-conflict', 'SNAPSHOT_RETURN_BALANCE_REGRESSION');
    }
  }
}
export class RecoveryWorker {
  readonly owner = randomUUID();
  constructor(
    readonly pool: Pool,
    readonly runtime: IntegrationRuntime,
    readonly clientFactory = (s: IntegrationSource) =>
      new RecoveryClient(recoveryConnection(runtime, s)),
    readonly beforeCommit?: () => Promise<void>,
  ) {}
  async basis(work: Lease): Promise<RecoveryBasis> {
    return transaction(this.pool, async (c) => {
      const source = await sourceByCompany(c, work.company_id, true);
      if (!(await lockLease(c, work, this.owner)))
        throw new RecoveryFailure('basis-changed', 'RECOVERY_LEASE_EXPIRED');
      const job = (
        await c.query<RecoveryJobRow>(
          `SELECT * FROM integration.recovery_job WHERE company_id=$1 AND work_id=$2`,
          [work.company_id, work.id],
        )
      ).rows[0];
      if (!source || !job) throw new RecoveryFailure('configuration', 'RECOVERY_SOURCE_REQUIRED');
      const cp = await recoveryStream(c, source.company_id, source.id, {
        type: job.aggregate_type,
        id: job.aggregate_id,
      });
      if (!cp || cp.rebuild_required)
        throw new RecoveryFailure('semantic-conflict', 'CHECKPOINT_REBUILD_REQUIRED');
      await c.query(
        `UPDATE integration.recovery_job SET state='running',last_attempt_at=clock_timestamp() WHERE company_id=$1 AND id=$2`,
        [work.company_id, job.id],
      );
      return { source, job, checkpoint: cp };
    });
  }
  async commit(work: Lease, basis: RecoveryBasis, result: RecoveryResult) {
    return transaction(this.pool, async (c) => {
      const source = await sourceByCompany(c, work.company_id, true);
      if (!(await lockLease(c, work, this.owner))) return false;
      if (!source?.enabled) throw new RecoveryFailure('configuration', 'SOURCE_DISABLED');
      const { job } = basis,
        a = { type: job.aggregate_type, id: job.aggregate_id };
      const scope = { tenantId: source.tenant_id, integrationId: source.integration_id };
      if (
        canonical(JSON.parse(result.rawBody.toString('utf8'))) !== canonical(result.body) ||
        !(job.kind === 'replay'
          ? validateReplayPage(result.body, scope, a, Number(job.next_after))
          : validateSnapshot(result.body, scope, a))
      )
        throw new RecoveryFailure('invalid-response', 'RECOVERY_RESPONSE_INVALID');
      const cp = (await recoveryStream(c, source.company_id, source.id, a, true))!;
      if (cp.rebuild_required || cp.revision !== basis.checkpoint.revision)
        throw new RecoveryFailure('basis-changed', 'RECOVERY_BASIS_CHANGED');
      if (job.page_count >= 100)
        throw new RecoveryFailure('reconstruction-limit', 'RECOVERY_PAGE_LIMIT');
      let through: number, next: number | null;
      if (job.kind === 'replay') {
        const page = result.body as ReplayPage;
        through = page.events.at(-1)?.aggregate.recipientSequence ?? Number(job.next_after);
        next = page.nextAfterSequence;
        if (next === null && through < Number(cp.received_high))
          throw new RecoveryFailure('invalid-response', 'REPLAY_INCOMPLETE_KNOWN_RANGE');
        for (const e of page.events) await insertReplayedEvent(c, source, e);
      } else {
        const v = result.body as ReconciliationSnapshot;
        through = v.throughSequence;
        next = null;
        if (through < Number(cp.projected_through) || through < Number(cp.received_high))
          throw new RecoveryFailure('basis-changed', 'SNAPSHOT_COVERAGE_STALE');
        await validateNativeSnapshot(c, source, v);
      }
      const evidenceId = randomUUID();
      await c.query(
        `INSERT INTO integration.recovery_evidence(company_id,id,source_id,job_id,aggregate_type,aggregate_id,kind,requested_after,through_sequence,next_after,basis_revision,raw_body,body_hash,body,baseline,schema_hash,retrieved_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          source.company_id,
          evidenceId,
          source.id,
          job.id,
          a.type,
          a.id,
          job.kind,
          job.next_after,
          through,
          next,
          cp.revision,
          result.rawBody,
          createHash('sha256').update(result.rawBody).digest('hex'),
          JSON.stringify(result.body),
          baseline,
          hashes[job.kind],
          result.retrievedAt,
        ],
      );
      if (job.kind === 'reconcile') {
        const v = result.body as ReconciliationSnapshot;
        const old = (
          await c.query(
            `SELECT through_sequence,state FROM integration.current_projection WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 FOR UPDATE`,
            [source.company_id, source.id, a.type, a.id],
          )
        ).rows[0];
        if (
          old &&
          Number(old.through_sequence) === through &&
          canonical(old.state) !== canonical(v.state)
        )
          throw new RecoveryFailure('semantic-conflict', 'SNAPSHOT_COVERAGE_COLLISION');
        await c.query(
          `INSERT INTO integration.current_projection(company_id,source_id,aggregate_type,aggregate_id,through_sequence,state,evidence_id) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(company_id,source_id,aggregate_type,aggregate_id) DO UPDATE SET through_sequence=EXCLUDED.through_sequence,state=EXCLUDED.state,evidence_id=EXCLUDED.evidence_id`,
          [
            source.company_id,
            source.id,
            a.type,
            a.id,
            through,
            JSON.stringify(v.state),
            evidenceId,
          ],
        );
        await c.query(
          `UPDATE integration.checkpoint SET snapshot_through=$5,projected_through=GREATEST(projected_through,$5),updated_at=clock_timestamp() WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4`,
          [source.company_id, source.id, a.type, a.id, through],
        );
      }
      await this.beforeCommit?.();
      await c.query(
        `UPDATE integration.recovery_job SET next_after=$3,page_count=page_count+1,state=$4,failure_class=NULL,last_error=NULL,http_status=200,last_attempt_at=clock_timestamp(),completed_at=CASE WHEN $4='complete' THEN clock_timestamp() ELSE NULL END WHERE company_id=$1 AND id=$2`,
        [
          source.company_id,
          job.id,
          next ?? Math.max(Number(job.next_after), through),
          next === null ? 'complete' : 'pending',
        ],
      );
      await c.query(
        `UPDATE work_item SET state=$2,attempts=0,available_at=clock_timestamp(),lease_owner=NULL,lease_until=NULL,completed_at=CASE WHEN $2='ready' THEN clock_timestamp() ELSE NULL END,last_error=NULL WHERE id=$1`,
        [work.id, next === null ? 'ready' : 'pending'],
      );
      return true;
    });
  }
  async fail(work: Lease, error: unknown) {
    const f = classifyRecoveryFailure(error);
    return transaction(this.pool, async (c) => {
      await sourceByCompany(c, work.company_id, true);
      if (!(await lockLease(c, work, this.owner))) return false;
      const retry =
        ['outage', 'basis-changed', 'reconstruction-limit'].includes(f.failureClass) &&
        work.attempts < 5;
      const state =
        f.failureClass === 'history-expired'
          ? 'expired'
          : ['authentication', 'configuration'].includes(f.failureClass)
            ? 'configuration-blocked'
            : retry
              ? 'retryable'
              : 'review-required';
      await c.query(
        `UPDATE integration.recovery_job SET state=$3,failure_class=$4,last_error=$5,http_status=$6,last_attempt_at=clock_timestamp() WHERE company_id=$1 AND work_id=$2`,
        [work.company_id, work.id, state, f.failureClass, f.code, f.httpStatus],
      );
      await c.query(
        `UPDATE work_item SET state=$2,last_error=$3,lease_owner=NULL,lease_until=NULL,available_at=clock_timestamp()+($4*interval '1 second') WHERE id=$1`,
        [work.id, retry ? 'pending' : 'failed', f.code, Math.min(300, 2 ** work.attempts)],
      );
      return true;
    });
  }
  async runOne(kind?: 'replay' | 'reconcile') {
    const work = await claimWork(
      this.pool,
      this.owner,
      kind ? ['integration.' + kind] : ['integration.replay', 'integration.reconcile'],
      60,
    );
    if (!work) return false;
    try {
      const basis = await this.basis(work),
        a = { type: basis.job.aggregate_type, id: basis.job.aggregate_id },
        client = this.clientFactory(basis.source);
      const result =
        basis.job.kind === 'replay'
          ? await client.replay(a, Number(basis.job.next_after))
          : await client.reconciliation(a);
      await this.commit(work, basis, result);
    } catch (error) {
      await this.fail(work, error);
    }
    return true;
  }
}
