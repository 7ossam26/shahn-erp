import { tawselValidator } from './validation.js';
import sender from './canonical/events/sender-event.v1.schema.json' with { type: 'json' };
export interface SenderEvent {
  schemaVersion: '1.0.0';
  payloadVersion: '1.0.0';
  eventId: string;
  eventType: string;
  eventKind: 'transition';
  tenantId: string;
  recipientIntegrationId: string;
  aggregate: { type: string; id: string; recipientSequence: number };
  resources: Record<string, string>;
  versions: Record<string, number>;
  correlation: {
    actionId?: string;
    sourceReference?: { tenantId: string; integrationId: string; externalId: string };
  };
  committedAt: string;
  payload: Record<string, unknown>;
}
export const senderEventTypes = sender.oneOf.map((x) => x.properties.eventType.const);
export const validateSenderSchema = tawselValidator<SenderEvent>(
  'events/sender-event.v1.schema.json',
);
type Obj = Record<string, unknown>;
const object = (v: unknown): Obj =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};
/** Schema validation alone cannot compare nested source, resource, aggregate and action identities. */
export function senderIdentityValid(e: SenderEvent): boolean {
  let valid = true;
  const scope = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (k === 'tenantId' && x !== e.tenantId) valid = false;
      if (
        (k === 'integrationId' || k === 'recipientIntegrationId') &&
        x !== e.recipientIntegrationId
      )
        valid = false;
      scope(x);
    }
  };
  scope(e.payload);
  scope(e.correlation);
  const p = e.payload,
    type = e.eventType;
  const record = object(
    p.task ?? p.location ?? p.outcome ?? p.change ?? p.request ?? p.transition ?? p.correction ?? p,
  );
  const outcome = object(record.outcome);
  let aggregateType = 'task',
    aggregateId: unknown = record.taskId ?? outcome.taskId;
  if (type === 'provisioning.changed' || type === 'plan.revisionPublished') {
    aggregateType = 'integration';
    aggregateId = e.recipientIntegrationId;
  } else if (type.startsWith('return.')) {
    aggregateType = 'return-request';
    aggregateId = record.requestId;
  } else if (type === 'round.started' || type === 'round.ended' || type.startsWith('branch.')) {
    aggregateType = 'trip';
    aggregateId = record.roundId ?? record.endedRoundId;
  } else if (type === 'workday.ended') {
    aggregateType = 'workday';
    aggregateId = record.workdayId;
  }
  if (e.aggregate.type !== aggregateType || e.aggregate.id !== aggregateId) valid = false;
  const action = p.actionId ?? object(record.time).actionId ?? object(outcome.time).actionId;
  if (action !== undefined && action !== e.correlation.actionId) valid = false;
  const resource = (key: string, expected: unknown) => {
    if (
      e.resources[key] !== undefined &&
      expected !== undefined &&
      expected !== null &&
      e.resources[key] !== expected
    )
      valid = false;
  };
  for (const key of ['taskId', 'attemptId', 'dispatchCycleId', 'workdayId', 'planId'])
    resource(key, record[key] ?? outcome[key]);
  resource('tripId', record.roundId ?? record.endedRoundId ?? outcome.roundId);
  const reference = object(record.sourceReference ?? outcome.sourceReference);
  if (
    e.correlation.sourceReference &&
    reference.externalId !== undefined &&
    e.correlation.sourceReference.externalId !== reference.externalId
  )
    valid = false;
  for (const key of [
    'sourceRevision',
    'assignmentRevision',
    'locationRevision',
    'activityRevision',
  ]) {
    const expected = record[key] ?? outcome[key];
    if (e.versions[key] !== undefined && expected !== undefined && e.versions[key] !== expected)
      valid = false;
  }
  if (
    type === 'outcome.recorded' &&
    e.versions.outcomeRevision !== undefined &&
    e.versions.outcomeRevision !== record.revision
  )
    valid = false;
  if (type === 'outcome.corrected') {
    const previous = object(p.previousOutcome);
    for (const key of ['taskId', 'attemptId', 'dispatchCycleId', 'workdayId', 'roundId'])
      if (previous[key] !== outcome[key]) valid = false;
    if (
      record.previousOutcomeId !== previous.outcomeId ||
      record.previousRevision !== previous.revision
    )
      valid = false;
    if (e.versions.outcomeRevision !== undefined && e.versions.outcomeRevision !== outcome.revision)
      valid = false;
  }
  if (type === 'provisioning.changed' && e.versions.sourceRevision !== record.sourceRevision)
    valid = false;
  const stage = (
    {
      'branch.roundInterrupted': 'heading',
      'branch.arrivalRecorded': 'arrived',
      'branch.roundResumed': 'resumed',
    } as Record<string, string>
  )[type];
  if (stage && record.stage !== stage) valid = false;
  if (p.task) {
    const snapshot = object(record.snapshot);
    for (const k of ['externalId', 'sourceRevision', 'sourceDispatchCycleId'])
      if (record[k] !== snapshot[k]) valid = false;
    if (e.versions.sourceRevision !== record.sourceRevision) valid = false;
  }
  return valid;
}
export function validateSenderEvent(value: unknown): value is SenderEvent {
  return validateSenderSchema(value) && senderIdentityValid(value);
}
