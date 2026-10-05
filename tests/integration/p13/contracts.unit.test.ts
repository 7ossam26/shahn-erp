import { describe, it, expect } from 'vitest';
import { senderEventTypes, tawselValidator } from '@shahn/contracts/tawsel';
import { executionEventOwners, normalizeExecutionEvent } from '@shahn/contracts/execution';
import { mappedEvents } from '../p11/mapped-events.js';
import { validFixtures, invalidFixtures } from '../p11/fixtures.js';
describe('P13 pinned execution families', () => {
  it('assigns all 27 current sender events exactly, including three P14 return handlers', () => {
    expect(Object.keys(executionEventOwners).sort()).toEqual([...senderEventTypes].sort());
    expect(Object.values(executionEventOwners).filter((x) => x === 'returns')).toHaveLength(3);
  });
  for (const e of mappedEvents())
    it('normalizes ' + e.eventType + ' without transport identities becoming visits', () => {
      const n = normalizeExecutionEvent(e);
      expect(n.type).toBe(e.eventType);
      expect(n.stream.sequence).toBe(e.aggregate.recipientSequence);
      if (e.eventType === 'plan.revisionPublished') expect(n.taskId).toBeNull();
    });
  it.each([
    'evidence.adoptionResolved',
    'progress.snapshot',
    'integration.applicationReported',
    'outcome.fake',
  ])('rejects non-sender %s', (type) => {
    const e = mappedEvents()[0]!;
    expect(() => normalizeExecutionEvent({ ...e, eventType: type })).toThrow();
  });
  it('does not conflate eligibility operations accepted by the shared Record schema', () => {
    const e = mappedEvents().find((x) => x.eventType === 'task.deferred')!;
    expect(() => normalizeExecutionEvent({ ...e, eventType: 'task.retryAdmitted' })).toThrow(
      'EVENT_OPERATION_MISMATCH',
    );
  });
  const selected = /^(p13-|p15-|p16-|p17-|p18-|p19-|p22-|p23-|monitoring-|location-)/;
  for (const f of [...validFixtures, ...invalidFixtures].filter((x) => selected.test(x.id)))
    it((f.valid ? 'accepts ' : 'rejects ') + f.id, () => {
      expect(
        tawselValidator(
          f.schema
            .replace(/^https:\/\/schemas\.tawsel\.invalid\/v1\//, '')
            .replace(/^contracts\//, ''),
        )(f.data),
      ).toBe(f.valid);
    });
});
