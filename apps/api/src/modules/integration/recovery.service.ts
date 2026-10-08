import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  sourceByCompany,
  recoveryStream,
  registerKnownStreams,
  committedCheckpoint,
  type IntegrationSource,
  type StreamRow,
} from '@shahn/database';
import { AccessError } from '@shahn/domain';
import {
  validateRecoveryCommand,
  type RecoveryCommand,
  type RecoveryStream,
  type RecoveryJob,
  type RecoveryDetail,
} from '@shahn/contracts';
import {
  validateReportCommand,
  validateDeliveryCommand,
  type AggregateIdentity,
  type SourceEnvelope,
  type ReconciliationState,
} from '@shahn/contracts/tawsel';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { DurableWork } from '../kernel/work.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { canonical, digest } from '../access/crypto.js';
import type { IntegrationRuntime } from './config.js';
import { RecoveryClient } from './recovery-client.js';

export const recoveryWorkRegistry = [
  { kind: 'integration.replay', lane: 'inbox' as const },
  { kind: 'integration.reconcile', lane: 'inbox' as const },
  { kind: 'integration.source', lane: 'source' as const },
];
export function recoveryConnection(runtime: IntegrationRuntime, s: IntegrationSource) {
  const c = runtime.connections.find(
    (c) =>
      c.companyId === s.company_id &&
      c.selector === s.selector &&
      c.tenantId === s.tenant_id &&
      c.integrationId === s.integration_id &&
      c.baseUrl === s.base_url &&
      c.issuer === s.issuer,
  );
  if (!c || !s.enabled) throw new AccessError('CONNECTION_CONFIGURATION_REQUIRED', 409);
  return c;
}
/** An unmapped stream needs company-wide branch authority. A guessed UUID never creates a stream. */
export async function authorizeRecoveryStream(
  u: UnitOfWork,
  s: IntegrationSource,
  a: AggregateIdentity,
) {
  let cp = await recoveryStream(u.client, u.access.companyId, s.id, a);
  const branches = (
    await u.client.query<{ branch_id: string }>(
      `SELECT branch_id FROM dispatch.cycle WHERE company_id=$1 AND source_id=$2 AND task_id=$3 AND $4='task'
    UNION SELECT branch_id FROM returns.request WHERE company_id=$1 AND source_id=$2 AND id=$3 AND $4='return-request'`,
      [s.company_id, s.id, a.id, a.type],
    )
  ).rows;
  if (branches.length) for (const b of branches) u.assertBranch(b.branch_id);
  else {
    const inaccessible = await u.client.query(
      `SELECT 1 FROM access.branch WHERE company_id=$1 AND NOT id=ANY($2::uuid[]) LIMIT 1`,
      [s.company_id, u.access.assignedBranches.map((b) => b.id)],
    );
    if (inaccessible.rowCount) throw new AccessError('FORBIDDEN_SCOPE');
  }
  if (!cp) {
    if (!branches.length) throw new AccessError('KNOWN_STREAM_REQUIRED', 404);
    // Accepted native commands establish a known stream even before a callback
    // or the operational list has been read. Serialize registry writes in the
    // same source-before-stream order as receivers and projection workers.
    await sourceByCompany(u.client, s.company_id, true);
    await registerKnownStreams(u.client, s);
    cp = await recoveryStream(u.client, s.company_id, s.id, a);
    if (!cp) throw new AccessError('KNOWN_STREAM_REQUIRED', 404);
  }
  return cp;
}
export async function queueRecoverySource(
  u: UnitOfWork,
  s: IntegrationSource,
  recordId: string,
  envelope: SourceEnvelope,
  work: DurableWork,
) {
  const workId = await work.enqueue(u.client, {
    companyId: s.company_id,
    principalId: u.access.principalId,
    commandRecordId: recordId,
    entityId: envelope.actionId,
    entityVersion: 1,
    kind: 'integration.source',
    sourceIdentity: envelope.actionId,
    payload: { sourceId: s.id, actionId: envelope.actionId },
  });
  const raw = canonical(envelope);
  await u.client.query(
    `INSERT INTO integration.source_command(company_id,source_id,action_id,command_record_id,operation_id,request_body,request_hash,work_id,authority) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'service')`,
    [
      s.company_id,
      s.id,
      envelope.actionId,
      recordId,
      envelope.operationId,
      raw,
      digest(raw),
      workId,
    ],
  );
  return envelope.actionId;
}
function sourceEnvelope(
  s: IntegrationSource,
  operationId: string,
  payload: Record<string, unknown>,
): SourceEnvelope {
  return {
    schemaVersion: '1.0.0',
    payloadVersion: '1.0.0',
    actionId: randomUUID(),
    operationId,
    context: { kind: 'integration', tenantId: s.tenant_id, integrationId: s.integration_id },
    resources: {},
    baseVersions: {},
    dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' } },
    payload,
  };
}
export function recoveryCommands(pool: Pool) {
  const work = new DurableWork(pool, recoveryWorkRegistry);
  const definitions: CommandDefinition<RecoveryCommand>[] = [
    'recovery.replay',
    'recovery.reconcile',
    'recovery.report',
    'recovery.retry',
    'recovery.retryDelivery',
  ].map((kind) => ({
    family: 'integration-recovery',
    kind,
    capability: 'integration',
    authorize: async (u, v, recover) => {
      if (!recover && !validateRecoveryCommand(v)) throw new AccessError('VALIDATION_FAILED', 400);
      const s = await sourceByCompany(u.client, u.access.companyId);
      if (!s) throw new AccessError('CONNECTION_REQUIRED', 409);
      if (typeof v.aggregateId === 'string')
        await authorizeRecoveryStream(u, s, {
          type: v.aggregateType as AggregateIdentity['type'],
          id: v.aggregateId,
        });
      if (typeof v.jobId === 'string') {
        const j = (
          await u.client.query(
            `SELECT aggregate_type,aggregate_id FROM integration.recovery_job WHERE company_id=$1 AND id=$2`,
            [s.company_id, v.jobId],
          )
        ).rows[0];
        if (!j) throw new AccessError('NOT_FOUND', 404);
        await authorizeRecoveryStream(u, s, { type: j.aggregate_type, id: j.aggregate_id });
      }
      if (typeof v.eventId === 'string') {
        const e = (
          await u.client.query(
            `SELECT aggregate_type,aggregate_id FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND event_id=$3`,
            [s.company_id, s.id, v.eventId],
          )
        ).rows[0];
        if (e) await authorizeRecoveryStream(u, s, { type: e.aggregate_type, id: e.aggregate_id });
        else if (
          (
            await u.client.query(
              `SELECT 1 FROM access.branch WHERE company_id=$1 AND NOT id=ANY($2::uuid[]) LIMIT 1`,
              [s.company_id, u.access.assignedBranches.map((b) => b.id)],
            )
          ).rowCount
        )
          throw new AccessError('FORBIDDEN_SCOPE');
      }
    },
    execute: async (u, input, recordId) => {
      u.lockOrder('aggregate', 'integration');
      const s = (await sourceByCompany(u.client, u.access.companyId, true))!;
      if (!s.enabled) throw new AccessError('SOURCE_DISABLED', 409);
      let jobId: string | null = null,
        actionId: string | null = null;
      if (input.type === 'recovery.retry') {
        const j = (
          await u.client.query(
            `SELECT * FROM integration.recovery_job WHERE company_id=$1 AND id=$2 FOR UPDATE`,
            [s.company_id, input.jobId],
          )
        ).rows[0];
        if (!j || j.state === 'complete') throw new AccessError('RECOVERY_NOT_RETRYABLE', 409);
        if (j.state === 'expired') throw new AccessError('HISTORY_EXPIRED_REQUIRES_SUPPORT', 409);
        const changed = await u.client.query(
          `UPDATE work_item SET state='pending',attempts=0,available_at=clock_timestamp(),last_error=NULL WHERE id=$1 AND (state<>'leased' OR lease_until<=clock_timestamp()) RETURNING id`,
          [j.work_id],
        );
        if (!changed.rowCount) throw new AccessError('WORK_IN_PROGRESS', 409);
        await u.client.query(
          `UPDATE integration.recovery_job SET state='pending',failure_class=NULL,last_error=NULL,completed_at=NULL WHERE company_id=$1 AND id=$2`,
          [s.company_id, j.id],
        );
        jobId = j.id;
      } else if (input.type === 'recovery.retryDelivery') {
        const e = sourceEnvelope(s, 'integration.retryDelivery', { eventId: input.eventId });
        if (!validateDeliveryCommand(e)) throw new AccessError('VALIDATION_FAILED', 400);
        actionId = await queueRecoverySource(u, s, recordId, e, work);
      } else {
        const a = { type: input.aggregateType!, id: input.aggregateId! };
        const cp = (await recoveryStream(u.client, s.company_id, s.id, a, true))!;
        if (cp.rebuild_required) throw new AccessError('CHECKPOINT_REBUILD_REQUIRED', 409);
        if (input.type === 'recovery.report') {
          const prior = (
            await u.client.query<{ action_id: string }>(
              `SELECT action_id FROM integration.checkpoint_report WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 AND revision=$5`,
              [s.company_id, s.id, a.type, a.id, cp.revision],
            )
          ).rows[0];
          if (prior) actionId = prior.action_id;
          else {
            const checkpoint = await committedCheckpoint(u.client, s, cp);
            const e = sourceEnvelope(s, 'integration.reportAppliedCheckpoint', { ...checkpoint });
            if (!validateReportCommand(e)) throw new AccessError('CHECKPOINT_REPORT_INVALID', 409);
            actionId = await queueRecoverySource(u, s, recordId, e, work);
            await u.client.query(
              `INSERT INTO integration.checkpoint_report(company_id,source_id,aggregate_type,aggregate_id,revision,action_id,checkpoint) VALUES($1,$2,$3,$4,$5,$6,$7)`,
              [s.company_id, s.id, a.type, a.id, cp.revision, actionId, JSON.stringify(checkpoint)],
            );
          }
        } else {
          const kind = input.type === 'recovery.replay' ? 'replay' : 'reconcile';
          const active = (
            await u.client.query(
              `SELECT id FROM integration.recovery_job WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 AND kind=$5 AND state IN ('pending','running','retryable')`,
              [s.company_id, s.id, a.type, a.id, kind],
            )
          ).rows[0];
          if (active) jobId = active.id;
          else {
            jobId = randomUUID();
            // Start before the earliest unapplied fact, including holes inside the received high.
            const after = Number(cp.applied_through);
            const workId = await work.enqueue(u.client, {
              companyId: s.company_id,
              principalId: u.access.principalId,
              commandRecordId: recordId,
              entityId: a.id,
              entityVersion: 1,
              kind: 'integration.' + kind,
              sourceIdentity: jobId,
              payload: { sourceId: s.id, jobId },
            });
            await u.client.query(
              `INSERT INTO integration.recovery_job(company_id,source_id,id,aggregate_type,aggregate_id,kind,work_id,requested_after,next_after) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
              [s.company_id, s.id, jobId, a.type, a.id, kind, workId, after],
            );
          }
        }
      }
      const body = {
        schemaVersion: 1,
        commandId: input.commandId,
        jobId,
        actionId,
        state: 'pending',
      };
      return {
        reply: { status: 202, body },
        reference: {
          ...body,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          eventId: input.eventId,
        },
        entityId: jobId ?? actionId!,
        beforeVersion: null,
        afterVersion: null,
      };
    },
    resolve: async (_u, r) => ({
      schemaVersion: 1,
      commandId: r.commandId,
      jobId: r.jobId,
      actionId: r.actionId,
      state: 'pending',
    }),
    rejectionReference: async (i, u) => ({
      entityId: i.aggregateId ?? i.jobId ?? i.eventId ?? u.access.companyId,
      branchId: u.access.companyId,
    }),
  }));
  return new CommandService(pool, definitions);
}

export function recoveryStreamView(
  cp: StreamRow,
  pendingReason: string | null = null,
): RecoveryStream {
  const prefix = BigInt(cp.received_through),
    high =
      BigInt(cp.received_high) > BigInt(cp.snapshot_through)
        ? BigInt(cp.received_high)
        : BigInt(cp.snapshot_through);
  return {
    aggregateType: cp.aggregate_type,
    aggregateId: cp.aggregate_id,
    revision: cp.revision,
    receivedThrough: cp.received_through,
    receivedHigh: cp.received_high,
    appliedThrough: cp.applied_through,
    snapshotThrough: cp.snapshot_through,
    projectedThrough: cp.projected_through,
    historyComplete: cp.history_complete,
    rebuildRequired: cp.rebuild_required,
    updatedAt: cp.updated_at.toISOString(),
    missingFrom: prefix < high ? (prefix + 1n).toString() : null,
    missingTo: prefix < high ? high.toString() : null,
    pendingReason,
  };
}
export async function recoveryJobView(u: UnitOfWork, id: string): Promise<RecoveryJob> {
  const j = (
    await u.client.query(
      `SELECT j.*,w.attempts FROM integration.recovery_job j JOIN work_item w ON w.id=j.work_id WHERE j.company_id=$1 AND j.id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!j) throw new AccessError('NOT_FOUND', 404);
  const s = (await sourceByCompany(u.client, u.access.companyId))!;
  await authorizeRecoveryStream(u, s, { type: j.aggregate_type, id: j.aggregate_id });
  return {
    id: j.id,
    aggregateType: j.aggregate_type,
    aggregateId: j.aggregate_id,
    kind: j.kind,
    requestedAfter: j.requested_after,
    nextAfter: j.next_after,
    pageCount: j.page_count,
    state: j.state,
    failureClass: j.failure_class,
    lastError: j.last_error,
    httpStatus: j.http_status,
    attempts: j.attempts,
    createdAt: j.created_at.toISOString(),
    lastAttemptAt: j.last_attempt_at?.toISOString() ?? null,
    completedAt: j.completed_at?.toISOString() ?? null,
  };
}
export async function recoveryList(
  u: UnitOfWork,
  filter: {
    page: number;
    aggregateType?: string | undefined;
    aggregateId?: string | undefined;
    state?: string | undefined;
    failureClass?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    branchId?: string | undefined;
  },
) {
  const s = await sourceByCompany(u.client, u.access.companyId);
  if (!s) return { streams: [], jobs: [], page: filter.page, hasMore: false };
  await registerKnownStreams(u.client, s);
  if (filter.branchId) u.assertBranch(filter.branchId);
  const scopeJoin = (
    alias: string,
  ) => `LEFT JOIN LATERAL(SELECT array_agg(branch_id) branches FROM (
    SELECT branch_id FROM dispatch.cycle WHERE company_id=${alias}.company_id AND source_id=${alias}.source_id AND task_id=${alias}.aggregate_id AND ${alias}.aggregate_type='task'
    UNION SELECT branch_id FROM returns.request WHERE company_id=${alias}.company_id AND source_id=${alias}.source_id AND id=${alias}.aggregate_id AND ${alias}.aggregate_type='return-request') b) scope ON true`;
  const visible = (branches: string, branch: string) =>
    `(CASE WHEN scope.branches IS NULL THEN NOT EXISTS(SELECT 1 FROM access.branch WHERE company_id=$1 AND NOT id=ANY(${branches}::uuid[])) ELSE scope.branches <@ ${branches}::uuid[] END) AND (${branch}::uuid IS NULL OR ${branch}::uuid=ANY(scope.branches))`;
  const rows = (
    await u.client.query<StreamRow>(
      `SELECT cp.* FROM integration.checkpoint cp ${scopeJoin('cp')} WHERE cp.company_id=$1 AND cp.source_id=$2 AND ($3::text IS NULL OR cp.aggregate_type=$3) AND ($4::uuid IS NULL OR cp.aggregate_id=$4) AND ${visible('$5', '$6')} ORDER BY cp.updated_at DESC,cp.aggregate_type,cp.aggregate_id LIMIT 101 OFFSET $7`,
      [
        s.company_id,
        s.id,
        filter.aggregateType ?? null,
        filter.aggregateId ?? null,
        u.access.assignedBranches.map((b) => b.id),
        filter.branchId ?? null,
        (filter.page - 1) * 100,
      ],
    )
  ).rows;
  const streams: RecoveryStream[] = [];
  for (const cp of rows.slice(0, 100))
    try {
      await authorizeRecoveryStream(u, s, { type: cp.aggregate_type, id: cp.aggregate_id });
      const reason =
        (
          await u.client.query(
            `SELECT pending_reason FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 AND application_state='pending' ORDER BY recipient_sequence LIMIT 1`,
            [s.company_id, s.id, cp.aggregate_type, cp.aggregate_id],
          )
        ).rows[0]?.pending_reason ?? null;
      streams.push(recoveryStreamView(cp, reason));
    } catch (e) {
      if (!(e instanceof AccessError && e.code === 'FORBIDDEN_SCOPE')) throw e;
    }
  const candidates = (
    await u.client.query<{ id: string }>(
      `SELECT j.id FROM integration.recovery_job j ${scopeJoin('j')} WHERE j.company_id=$1 AND j.source_id=$2 AND ($3::text IS NULL OR j.aggregate_type=$3) AND ($4::uuid IS NULL OR j.aggregate_id=$4) AND ($5::text IS NULL OR j.state=$5) AND ($6::text IS NULL OR j.failure_class=$6) AND ($7::timestamptz IS NULL OR j.created_at>=$7) AND ($8::timestamptz IS NULL OR j.created_at<$8) AND ${visible('$9', '$10')} ORDER BY j.created_at DESC,j.id LIMIT 26 OFFSET $11`,
      [
        s.company_id,
        s.id,
        filter.aggregateType ?? null,
        filter.aggregateId ?? null,
        filter.state ?? null,
        filter.failureClass ?? null,
        filter.from ?? null,
        filter.to ?? null,
        u.access.assignedBranches.map((b) => b.id),
        filter.branchId ?? null,
        (filter.page - 1) * 25,
      ],
    )
  ).rows;
  const jobs: RecoveryJob[] = [];
  for (const c of candidates.slice(0, 25))
    try {
      jobs.push(await recoveryJobView(u, c.id));
    } catch (e) {
      if (!(e instanceof AccessError && e.code === 'FORBIDDEN_SCOPE')) throw e;
    }
  return {
    streams,
    jobs,
    page: filter.page,
    hasMore: candidates.length > 25 || rows.length > 100,
  };
}
export async function recoveryDetail(u: UnitOfWork, id: string): Promise<RecoveryDetail> {
  const job = await recoveryJobView(u, id),
    s = (await sourceByCompany(u.client, u.access.companyId))!;
  const a = { type: job.aggregateType, id: job.aggregateId },
    cp = await authorizeRecoveryStream(u, s, a);
  const relatedShipments = (
    await u.client.query<{ id: string; reference: string; cycleId: string; branchId: string }>(
      `SELECT DISTINCT sh.id,sh.reference,d.id AS "cycleId",d.branch_id AS "branchId" FROM dispatch.cycle d
    JOIN shipments.shipment sh ON(sh.company_id,sh.id)=(d.company_id,d.shipment_id)
    WHERE d.company_id=$1 AND d.source_id=$2 AND
      ($3='task' AND d.task_id=$4 OR $3='return-request' AND EXISTS(SELECT 1 FROM returns.item i WHERE i.company_id=d.company_id AND i.source_id=d.source_id AND i.request_id=$4 AND i.cycle_id=d.id))
    ORDER BY sh.reference,d.id`,
      [s.company_id, s.id, a.type, a.id],
    )
  ).rows;
  for (const shipment of relatedShipments) u.assertBranch(shipment.branchId);
  // Find holes from known sequence boundaries, without enumerating a potentially
  // enormous sequence range. Snapshot coverage includes history still absent.
  const missing = (
    await u.client.query<{ from: string; to: string }>(
      `WITH known AS (SELECT 0::bigint n UNION SELECT recipient_sequence FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4
      UNION SELECT greatest($5::bigint,$6::bigint)+1), pairs AS(SELECT n,lead(n) OVER(ORDER BY n) following FROM known)
      SELECT (n+1)::text AS "from",(following-1)::text AS "to" FROM pairs WHERE following>n+1 ORDER BY n LIMIT 101`,
      [s.company_id, s.id, a.type, a.id, cp.received_high, cp.snapshot_through],
    )
  ).rows;
  const pendingReason =
    (
      await u.client.query<{ pending_reason: string }>(
        `SELECT pending_reason FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 AND application_state='pending' ORDER BY recipient_sequence LIMIT 1`,
        [s.company_id, s.id, a.type, a.id],
      )
    ).rows[0]?.pending_reason ?? null;
  const evidence = (
    await u.client.query(
      `SELECT id,kind,requested_after AS "requestedAfter",through_sequence AS "throughSequence",body_hash AS "bodyHash",baseline,schema_hash AS "schemaHash",retrieved_at AS "retrievedAt" FROM integration.recovery_evidence WHERE company_id=$1 AND job_id=$2 ORDER BY recorded_at LIMIT 100`,
      [s.company_id, id],
    )
  ).rows.map((r) => ({ ...r, retrievedAt: r.retrievedAt.toISOString() }));
  const projection =
    (
      await u.client.query(
        `SELECT p.state,p.through_sequence AS "throughSequence",e.body->>'history' AS history,e.body->>'capturedAt' AS "capturedAt" FROM integration.current_projection p JOIN integration.recovery_evidence e ON e.company_id=p.company_id AND e.id=p.evidence_id WHERE p.company_id=$1 AND p.source_id=$2 AND p.aggregate_type=$3 AND p.aggregate_id=$4`,
        [s.company_id, s.id, a.type, a.id],
      )
    ).rows[0] ?? null;
  const state = projection?.state as ReconciliationState | undefined;
  const current =
    projection && state
      ? {
          throughSequence: projection.throughSequence,
          history: projection.history,
          capturedAt: projection.capturedAt,
          taskState: state.task?.state ?? null,
          effectiveOutcomes: state.outcomes.map((o) => ({
            attemptId: o.attemptId,
            outcome: o.outcome,
            revision: o.revision,
          })),
          returnBalances: state.returnItems.map((i) => ({
            itemId: i.itemId,
            sourceLineId: i.sourceLineId,
            received: i.received,
            lost: i.lost,
            damaged: i.damaged,
            unresolved: i.unresolved,
          })),
        }
      : null;
  return {
    job,
    stream: recoveryStreamView(cp, pendingReason),
    relatedShipments,
    missingRanges: missing.slice(0, 100),
    moreMissingRanges: missing.length > 100,
    evidence,
    current,
  };
}
export async function readReportedCheckpoint(
  pool: Pool,
  token: string,
  companyId: string,
  runtime: IntegrationRuntime,
  a: AggregateIdentity,
) {
  const authorize = () =>
    UnitOfWork.run(pool, token, companyId, 'integration', async (u) => {
      const s = await sourceByCompany(u.client, companyId);
      if (!s) throw new AccessError('CONNECTION_REQUIRED', 409);
      await authorizeRecoveryStream(u, s, a);
      return s;
    });
  const s = await authorize();
  const result = await new RecoveryClient(recoveryConnection(runtime, s)).appliedCheckpoint(a);
  const current = await authorize();
  if (current.id !== s.id || !current.enabled) throw new AccessError('FORBIDDEN_SCOPE');
  return result.body;
}
