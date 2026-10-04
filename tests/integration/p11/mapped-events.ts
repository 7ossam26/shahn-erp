import type { SenderEvent } from '@shahn/contracts/tawsel';
import { senderFixture, validFixtures } from './fixtures.js';
type Obj = Record<string, unknown>;
const data = (id: string) => structuredClone(validFixtures.find((f) => f.id === id)!.data) as Obj;
/** Synthetic envelopes around pinned payload fixtures; never evidence of a live Tawsel send. */
export function mappedEvents(): SenderEvent[] {
  const result: SenderEvent[] = [];
  const add = (type: string, payload: Obj, aggregateType: string, aggregateId: string) => {
    const event = senderFixture();
    event.eventType = type;
    event.payload = payload;
    const normalize = (v: unknown) => {
      if (!v || typeof v !== 'object') return;
      for (const [k, x] of Object.entries(v)) {
        if (k === 'tenantId') (v as Obj)[k] = event.tenantId;
        else if (k === 'integrationId') (v as Obj)[k] = event.recipientIntegrationId;
        else normalize(x);
      }
    };
    normalize(payload);
    event.aggregate = {
      type: aggregateType,
      id: aggregateType === 'integration' ? event.recipientIntegrationId : aggregateId,
      recipientSequence: 1,
    };
    const record = (payload.task ??
      payload.location ??
      payload.outcome ??
      payload.change ??
      payload.request ??
      payload.transition ??
      payload.correction ??
      payload) as Obj;
    const source = (record.outcome ?? record) as Obj;
    event.resources = {};
    event.versions = {};
    if (typeof source.sourceRevision === 'number')
      event.versions.sourceRevision = source.sourceRevision;
    event.correlation = {
      actionId: String(
        payload.actionId ?? (source.time as Obj | undefined)?.actionId ?? event.eventId,
      ),
    };
    for (const key of ['taskId', 'attemptId', 'dispatchCycleId', 'workdayId', 'planId'])
      if (typeof source[key] === 'string') event.resources[key] = source[key] as string;
    if (source.roundId || source.endedRoundId)
      event.resources.tripId = String(source.roundId ?? source.endedRoundId);
    result.push(event);
  };
  const existing = [
    'provisioning.changed',
    'task.snapshotAccepted',
    'assignment.received',
    'round.started',
    'outcome.recorded',
    'outcome.corrected',
    'return.requested',
    'return.subsetReceived',
    'plan.revisionPublished',
  ];
  for (const type of existing) result.push(senderFixture('p25-' + type));
  for (const type of [
    'assignment.prepared',
    'assignment.withdrawn',
    'assignment.reassigned',
    'task.urgencyChanged',
    'dispatch.createdFromReceipt',
  ]) {
    const e = senderFixture('p25-task.snapshotAccepted');
    e.eventType = type;
    result.push(e);
  }
  for (const [type, id] of [
    ['task.retryAdmitted', 'p18-event-0'],
    ['task.deferred', 'p18-event-1'],
    ['task.deferredActivated', 'p18-event-1'],
    ['task.driverUrgencyChanged', 'p18-event-2'],
  ] as const) {
    const payload = data(id);
    if (type === 'task.deferredActivated') {
      (payload.change as Obj).operationId = 'task.activateDeferred';
      (payload.change as Obj).deferred = false;
    }
    add(type, payload, 'task', String((payload.change as Obj).taskId));
  }
  for (const [type, id, aggregate, key] of [
    ['round.ended', 'p19-round-event', 'trip', 'endedRoundId'],
    ['workday.ended', 'p19-day-event', 'workday', 'workdayId'],
    ['branch.roundInterrupted', 'p22-event-0', 'trip', 'roundId'],
    ['branch.arrivalRecorded', 'p22-event-1', 'trip', 'roundId'],
    ['branch.roundResumed', 'p22-event-3', 'trip', 'roundId'],
  ] as const) {
    const payload = data(id);
    add(type, payload, aggregate, String(payload[key]));
  }
  const disposition = data('p21-dispositionRecorded');
  add(
    'return.dispositionRecorded',
    disposition,
    'return-request',
    String((disposition.transition as Obj).requestId),
  );
  const outcome = senderFixture('p25-outcome.recorded').payload.outcome as Obj;
  for (const [type, stage] of [
    ['current.headingSelected', 'heading'],
    ['current.arrivalRecorded', 'arrived'],
  ] as const)
    add(
      type,
      {
        roundId: outcome.roundId,
        driverId: outcome.driverId,
        taskId: outcome.taskId,
        attemptId: outcome.attemptId,
        activityRevision: 1,
        stage,
        time: outcome.time,
      },
      'task',
      String(outcome.taskId),
    );
  const task = senderFixture('p25-task.snapshotAccepted').payload.task as Obj,
    snapshot = task.snapshot as Obj;
  add(
    'location.pinConfirmed',
    {
      actionId: result[0]!.eventId,
      location: {
        taskId: task.taskId,
        recipientName: snapshot.recipientName,
        original: snapshot.destination,
        sourceRevision: 1,
        locationRevision: 1,
        pin: null,
        locationReadiness: 'confirmed',
        editable: true,
        planningInputRevision: 1,
        planningStatus: 'not-requested',
      },
    },
    'task',
    String(task.taskId),
  );
  return result;
}
