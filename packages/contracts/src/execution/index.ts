import { validateSenderEvent, type SenderEvent } from '../tawsel/sender-event.js';
export * from './tracking.js';

/** Ownership is deliberately exhaustive. Receipt never implies domain application. */
export const executionEventOwners = {
  'provisioning.changed': 'provisioning',
  'task.snapshotAccepted': 'dispatch',
  'assignment.prepared': 'dispatch',
  'assignment.received': 'dispatch',
  'assignment.withdrawn': 'dispatch',
  'assignment.reassigned': 'dispatch',
  'task.urgencyChanged': 'dispatch',
  'dispatch.createdFromReceipt': 'dispatch',
  'location.pinConfirmed': 'execution',
  'plan.revisionPublished': 'execution',
  'round.started': 'execution',
  'current.headingSelected': 'execution',
  'current.arrivalRecorded': 'execution',
  'outcome.recorded': 'execution',
  'task.deferred': 'execution',
  'task.retryAdmitted': 'execution',
  'task.deferredActivated': 'execution',
  'task.driverUrgencyChanged': 'execution',
  'round.ended': 'execution',
  'workday.ended': 'execution',
  'return.requested': 'pending-return-handler',
  'return.subsetReceived': 'pending-return-handler',
  'return.dispositionRecorded': 'pending-return-handler',
  'branch.roundInterrupted': 'execution',
  'branch.arrivalRecorded': 'execution',
  'branch.roundResumed': 'execution',
  'outcome.corrected': 'correction',
} as const;
export type ExecutionEventType = keyof typeof executionEventOwners;
export interface ActionTime {
  actionId: string;
  recordedAt: string;
  observation: { observedAt: string | null; clock: Record<string, unknown> };
}
export interface ReportedMoney {
  currency: 'EGP';
  exponent: 2;
  amountMinor: number;
}
export interface OutcomeRecord {
  kind: 'company' | 'personal';
  outcome: 'full' | 'partial' | 'refused' | 'no-answer';
  outcomeId: string;
  revision: number;
  taskId: string;
  attemptId: string;
  dispatchCycleId: string | null;
  sourceDispatchCycleId: string | null;
  roundId: string;
  workdayId: string;
  driverId: string;
  branchId: string | null;
  sourceRevision: number;
  assignmentRevision: number;
  sourceReference: { tenantId: string; integrationId: string; externalId: string } | null;
  time: ActionTime;
  heading: ActionTime | null;
  arrival: ActionTime | null;
  returnRequired: boolean;
  lines: {
    sourceLineId: string;
    sourceQuantity: number;
    delivered: number;
    heldReturnRequired: number;
    unitDue: ReportedMoney;
  }[];
  collection: {
    reported: ReportedMoney | null;
    goods: ReportedMoney;
    shipping: ReportedMoney;
    unpaidShipping: ReportedMoney;
    shippingStatus:
      'collected' | 'explicitly-unpaid' | 'not-attempted' | 'not-due' | 'not-applicable';
  };
}
export interface CorrectionRecord {
  correctionId: string;
  previousOutcomeId: string | null;
  previousRevision: number;
  outcome: OutcomeRecord;
  evidenceActionId: string | null;
  evidenceReceiptId: string | null;
}
export interface NormalizedExecutionEvent {
  event: SenderEvent;
  type: ExecutionEventType;
  owner: (typeof executionEventOwners)[ExecutionEventType];
  stream: {
    tenantId: string;
    recipientIntegrationId: string;
    aggregateType: string;
    aggregateId: string;
    sequence: number;
  };
  taskIds: string[];
  taskId: string | null;
  attemptId: string | null;
  dispatchCycleId: string | null;
  roundId: string | null;
  workdayId: string | null;
  driverId: string | null;
  actionId: string | null;
  time: ActionTime | null;
  outcome: OutcomeRecord | null;
  correction: CorrectionRecord | null;
  record: Record<string, unknown>;
}
const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const id = (v: unknown) => (typeof v === 'string' ? v : null);
/** Decode only the pinned closed sender union; no generic successful fallback. */
export function normalizeExecutionEvent(value: unknown): NormalizedExecutionEvent {
  if (!validateSenderEvent(value) || !Object.hasOwn(executionEventOwners, value.eventType))
    throw new Error('INVALID_EXECUTION_EVENT');
  const type = value.eventType as ExecutionEventType,
    p = value.payload;
  const correction =
    type === 'outcome.corrected' ? (p.correction as unknown as CorrectionRecord) : null;
  const outcome =
    correction?.outcome ??
    (type === 'outcome.recorded' ? (p.outcome as unknown as OutcomeRecord) : null);
  const record = object(
    outcome ?? p.task ?? p.location ?? p.change ?? p.request ?? p.transition ?? p,
  );
  const expectedOperation = (
    {
      'task.deferred': 'task.deferWhole',
      'task.retryAdmitted': 'task.retryWhole',
      'task.deferredActivated': 'task.activateDeferred',
      'task.driverUrgencyChanged': 'task.setDriverUrgency',
    } as Record<string, string>
  )[type];
  if (expectedOperation && record.operationId !== expectedOperation)
    throw new Error('EVENT_OPERATION_MISMATCH');
  if (
    correction &&
    (correction.previousOutcomeId === null ||
      correction.outcome.revision <= correction.previousRevision)
  )
    throw new Error('CORRECTION_PREDECESSOR_REQUIRED');
  const taskId = id(record.taskId);
  const taskIds = taskId
    ? [taskId]
    : Array.isArray(record.taskIds)
      ? (record.taskIds as string[])
      : Array.isArray(record.tasks)
        ? record.tasks.map((x) => String(object(x).taskId))
        : [];
  return {
    event: value,
    type,
    owner: executionEventOwners[type],
    stream: {
      tenantId: value.tenantId,
      recipientIntegrationId: value.recipientIntegrationId,
      aggregateType: value.aggregate.type,
      aggregateId: value.aggregate.id,
      sequence: value.aggregate.recipientSequence,
    },
    taskId,
    taskIds,
    attemptId: id(record.attemptId),
    dispatchCycleId: id(record.dispatchCycleId),
    roundId: id(record.roundId ?? record.endedRoundId),
    workdayId: id(record.workdayId),
    driverId: id(record.driverId),
    actionId: id(p.actionId ?? object(record.time).actionId ?? value.correlation.actionId),
    time: record.time ? (record.time as unknown as ActionTime) : null,
    outcome,
    correction,
    record,
  };
}
