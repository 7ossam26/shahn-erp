import { tawselValidator } from './validation.js';
import { validateSenderEvent, type SenderEvent } from './sender-event.js';
import type { IntakeTask } from './intake.js';
import { snapshotReturnBalances, type ReturnRequest } from './returns.js';
import type { OutcomeRecord } from '../execution/index.js';
import type { SourceEnvelope } from './provisioning.js';

export const aggregateTypes = [
  'task',
  'assignment',
  'trip',
  'workday',
  'return-request',
  'integration',
] as const;
export type AggregateType = (typeof aggregateTypes)[number];
export interface AggregateIdentity {
  type: AggregateType;
  id: string;
}
export interface ReplayPage {
  events: SenderEvent[];
  nextAfterSequence: number | null;
  retention: 'indefinite-no-purge';
  projectionStatus: 'unknown';
}
export interface ReconciliationState {
  task: IntakeTask | null;
  outcomes: OutcomeRecord[];
  returnRequest: ReturnRequest | null;
  returnItems: {
    itemId: string;
    taskId: string;
    sourceLineId: string;
    requested: number;
    received: number;
    lost: number;
    damaged: number;
    unresolved: number;
  }[];
  notices: { key: string; event: SenderEvent }[];
}
export interface ReconciliationSnapshot {
  schemaVersion: '1.0.0';
  tenantId: string;
  recipientIntegrationId: string;
  aggregate: AggregateIdentity;
  throughSequence: number;
  capturedAt: string;
  state: ReconciliationState;
  history: 'current-state-only';
  retention: 'indefinite-no-purge';
}
export interface AppliedCheckpoint {
  schemaVersion: '1.0.0';
  tenantId: string;
  recipientIntegrationId: string;
  aggregate: AggregateIdentity;
  revision: number;
  receivedThrough: number;
  receivedHigh: number;
  appliedThrough: number;
  projectedThrough: number;
  snapshotThrough: number;
  historyComplete: boolean;
  pendingCount: number;
  receivedAt: string | null;
  appliedAt: string | null;
  lastError:
    | 'sequence_gap'
    | 'dependency_missing'
    | 'projection_failed'
    | 'projection_limit'
    | 'history_unavailable'
    | null;
}
export interface AppliedReportRead {
  report: {
    checkpoint: AppliedCheckpoint;
    reportedAt: string;
    evidence: 'receiver-reported';
  } | null;
}
export interface Delivery {
  eventId: string;
  eventType: string;
  aggregate: SenderEvent['aggregate'];
  createdAt: string;
  status: 'pending' | 'sending' | 'failed' | 'received';
  attempts: number;
  nextAttemptAt: string;
  leaseUntil: string | null;
  receivedAt: string | null;
  lastError: string | null;
  projectionStatus: 'unknown';
  blockedBy: string | null;
}
export interface DeliveryQueue {
  items: Delivery[];
  nextCursor: string | null;
  counts: Record<Delivery['status'], number>;
  oldestUnreceivedAt: string | null;
  projectionStatus: 'unknown';
}
export interface DeliveryDetail {
  delivery: Delivery;
  attempts: {
    attemptId: string;
    number: number;
    startedAt: string;
    finishedAt: string | null;
    keyId: string | null;
    deliveryTimestamp: string;
    result: 'sending' | 'received' | 'failed' | 'lease-expired';
    errorCode: string | null;
    httpStatus: number | null;
  }[];
  nextAttemptBefore: number | null;
}
export const validateReplaySchema = tawselValidator<ReplayPage>('outbox.schema.json#/$defs/Replay');
export const validateSnapshotSchema = tawselValidator<ReconciliationSnapshot>(
  'consumer.schema.json#/$defs/Snapshot',
);
export const validateCheckpoint = tawselValidator<AppliedCheckpoint>(
  'consumer.schema.json#/$defs/Checkpoint',
);
export const validateReportCommand = tawselValidator<SourceEnvelope>(
  'consumer.schema.json#/$defs/ReportCommand',
);
export const validateReportRead = tawselValidator<AppliedReportRead>(
  'consumer.schema.json#/$defs/ReportRead',
);
export const validateAppliedReport = tawselValidator<NonNullable<AppliedReportRead['report']>>(
  'consumer.schema.json#/$defs/Report',
);
export const validateDeliveryQueue = tawselValidator<DeliveryQueue>(
  'outbox.schema.json#/$defs/Queue',
);
export const validateDeliveryDetail = tawselValidator<DeliveryDetail>(
  'outbox.schema.json#/$defs/Detail',
);
export const validateRetryResult = tawselValidator<{ eventId: string; scheduled: boolean }>(
  'outbox.schema.json#/$defs/RetryResult',
);
export function checkpointCountersValid(c: AppliedCheckpoint) {
  return (
    c.appliedThrough <= c.receivedThrough &&
    c.receivedThrough <= c.receivedHigh &&
    c.projectedThrough >= c.appliedThrough &&
    c.projectedThrough >= c.snapshotThrough &&
    (!c.historyComplete || c.appliedThrough >= Math.max(c.receivedHigh, c.projectedThrough))
  );
}
export function validateReplayPage(
  v: unknown,
  scope: { tenantId: string; integrationId: string },
  aggregate: AggregateIdentity,
  after: number,
): v is ReplayPage {
  if (!validateReplaySchema(v)) return false;
  let prior = after;
  for (const e of v.events) {
    if (
      !validateSenderEvent(e) ||
      e.tenantId !== scope.tenantId ||
      e.recipientIntegrationId !== scope.integrationId ||
      e.aggregate.type !== aggregate.type ||
      e.aggregate.id !== aggregate.id ||
      e.aggregate.recipientSequence !== prior + 1
    )
      return false;
    prior = e.aggregate.recipientSequence;
  }
  return v.nextAfterSequence === null || (v.events.length > 0 && v.nextAfterSequence === prior);
}
export function validateSnapshot(
  v: unknown,
  scope: { tenantId: string; integrationId: string },
  aggregate: AggregateIdentity,
): v is ReconciliationSnapshot {
  if (
    !validateSnapshotSchema(v) ||
    v.tenantId !== scope.tenantId ||
    v.recipientIntegrationId !== scope.integrationId ||
    v.aggregate.type !== aggregate.type ||
    v.aggregate.id !== aggregate.id
  )
    return false;
  const s = v.state;
  if (
    s.task &&
    (s.task.sourceRevision !== s.task.snapshot.sourceRevision ||
      s.task.externalId !== s.task.snapshot.externalId ||
      s.task.sourceDispatchCycleId !== s.task.snapshot.sourceDispatchCycleId ||
      (aggregate.type === 'task' && s.task.taskId !== aggregate.id))
  )
    return false;
  if (
    s.outcomes.some(
      (o) =>
        o.kind !== 'company' ||
        o.sourceReference?.tenantId !== scope.tenantId ||
        o.sourceReference.integrationId !== scope.integrationId ||
        (aggregate.type === 'task' && o.taskId !== aggregate.id),
    )
  )
    return false;
  if (
    new Set(s.outcomes.map((o) => o.attemptId)).size !== s.outcomes.length ||
    new Set(s.returnItems.map((i) => i.itemId)).size !== s.returnItems.length ||
    new Set(s.notices.map((n) => n.key)).size !== s.notices.length
  )
    return false;
  if (s.returnRequest) {
    if (
      s.returnRequest.integrationId !== scope.integrationId ||
      (aggregate.type === 'return-request' && s.returnRequest.requestId !== aggregate.id)
    )
      return false;
    try {
      if (snapshotReturnBalances(s).length !== s.returnRequest.items.length) return false;
    } catch {
      return false;
    }
  } else if (s.returnItems.length) return false;
  return s.notices.every(
    (n) =>
      validateSenderEvent(n.event) &&
      n.event.tenantId === scope.tenantId &&
      n.event.recipientIntegrationId === scope.integrationId &&
      n.event.aggregate.type === aggregate.type &&
      n.event.aggregate.id === aggregate.id &&
      n.event.aggregate.recipientSequence <= v.throughSequence,
  );
}
