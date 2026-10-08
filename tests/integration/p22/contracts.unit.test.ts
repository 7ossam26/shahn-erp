import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  validateReplayPage,
  validateSnapshot,
  validateDeliveryCommand,
  checkpointCountersValid,
  validateReportCommand,
  type SourceEnvelope,
  type AggregateIdentity,
} from '@shahn/contracts/tawsel';
import { validateRecoveryCommand } from '@shahn/contracts';
import { senderFixture, signatureVector, validFixtures } from '../p11/fixtures.js';
import {
  signatureFor,
  securityHeaders,
  verifySignature,
} from '../../../apps/api/src/modules/integration/signature-verifier.js';
import { recoveryNextAction } from '../../../apps/web/src/features/integration/recovery/recovery.js';
import { mappedEvents } from '../p11/mapped-events.js';
import { senderEventTypes } from '@shahn/contracts/tawsel';
import { SourceFailure } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { classifyRecoveryFailure } from '../../../apps/api/src/modules/integration/recovery-client.js';
it('classifies source uncertainty, expiry, invalid result and semantic conflict separately', () => {
  expect(
    classifyRecoveryFailure(new SourceFailure('review-required', 'IDEMPOTENCY_CONFLICT', 409)),
  ).toMatchObject({ failureClass: 'semantic-conflict', httpStatus: 409 });
  expect(
    classifyRecoveryFailure(new SourceFailure('pending', 'REMOTE_PENDING', 202)),
  ).toMatchObject({ failureClass: 'outage', code: 'REMOTE_PENDING', httpStatus: 202 });
  expect(
    classifyRecoveryFailure(new SourceFailure('configuration-blocked', 'AUTHORIZATION_EXPIRED')),
  ).toMatchObject({ failureClass: 'authentication' });
  expect(
    classifyRecoveryFailure(
      new SourceFailure('configuration-blocked', 'UNSUPPORTED_CONFIGURATION'),
    ),
  ).toMatchObject({ failureClass: 'configuration' });
  expect(
    classifyRecoveryFailure(new SourceFailure('unknown', 'INVALID_REMOTE_RESULT')),
  ).toMatchObject({ failureClass: 'invalid-response' });
  expect(
    classifyRecoveryFailure(new SourceFailure('unknown', 'REMOTE_RESULT_TOO_LARGE')),
  ).toMatchObject({ failureClass: 'reconstruction-limit' });
});
it('all 27 sender variants enter the concrete replay boundary; generated envelopes are distinct from nine captured sender examples', () => {
  const events = mappedEvents();
  expect(events.map((e) => e.eventType).sort()).toEqual([...senderEventTypes].sort());
  for (const e of events) {
    const a = { type: e.aggregate.type as AggregateIdentity['type'], id: e.aggregate.id },
      scope = { tenantId: e.tenantId, integrationId: e.recipientIntegrationId },
      page = {
        events: [e],
        nextAfterSequence: null,
        retention: 'indefinite-no-purge',
        projectionStatus: 'unknown',
      };
    expect(validateReplayPage(page, scope, a, e.aggregate.recipientSequence - 1), e.eventType).toBe(
      true,
    );
    expect(
      validateReplayPage(
        { ...page, events: [{ ...e, payloadVersion: '2.0.0' }] },
        scope,
        a,
        e.aggregate.recipientSequence - 1,
      ),
      e.eventType,
    ).toBe(false);
    expect(
      validateReplayPage(
        { ...page, events: [{ ...e, tenantId: randomUUID() }] },
        scope,
        a,
        e.aggregate.recipientSequence - 1,
      ),
      e.eventType,
    ).toBe(false);
    expect(
      validateReplayPage(
        { ...page, events: [{ ...e, payload: { ...e.payload, injectedField: true } }] },
        scope,
        a,
        e.aggregate.recipientSequence - 1,
      ),
      e.eventType,
    ).toBe(false);
  }
});
const e = senderFixture(),
  a = { type: 'integration' as const, id: e.recipientIntegrationId },
  scope = { tenantId: e.tenantId, integrationId: e.recipientIntegrationId };
it('generated replay pages enforce exact scope, continuity and continuation, including empty pages', () => {
  const page = {
    events: [{ ...e, aggregate: { ...e.aggregate, recipientSequence: 1 } }],
    nextAfterSequence: null,
    retention: 'indefinite-no-purge',
    projectionStatus: 'unknown',
  };
  expect(validateReplayPage(page, scope, a, 0)).toBe(true);
  expect(validateReplayPage(page, scope, a, 1)).toBe(false);
  expect(validateReplayPage({ ...page, nextAfterSequence: 3 }, scope, a, 0)).toBe(false);
  expect(validateReplayPage({ ...page, events: [], nextAfterSequence: 0 }, scope, a, 0)).toBe(
    false,
  );
  expect(validateReplayPage({ ...page, events: [] }, scope, a, 0)).toBe(true);
  expect(validateReplayPage(page, { ...scope, integrationId: randomUUID() }, a, 0)).toBe(false);
});
it('uses supplied P26 closed snapshots without treating current state as historical evidence', () => {
  const v = structuredClone(
    validFixtures.find((f) => f.id === 'p26-reconciliation-current-state')?.data ??
      validFixtures.find((f) => f.id.startsWith('p26-') && f.schema.endsWith('/Snapshot'))?.data,
  ) as Parameters<typeof validateSnapshot>[0];
  expect(v).toBeDefined();
  const s = v as { tenantId: string; recipientIntegrationId: string; aggregate: typeof a };
  expect(
    validateSnapshot(
      v,
      { tenantId: s.tenantId, integrationId: s.recipientIntegrationId },
      s.aggregate,
    ),
  ).toBe(true);
  expect(validateSnapshot({ ...s, history: 'complete' }, scope, a)).toBe(false);
});
it('generates exact configure, signing rotation and retry command fixtures and rejects injected business fields', () => {
  const base: SourceEnvelope = {
    schemaVersion: '1.0.0',
    payloadVersion: '1.0.0',
    actionId: randomUUID(),
    operationId: 'integration.retryDelivery',
    context: { kind: 'integration', ...scope },
    resources: {},
    baseVersions: {},
    dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' } },
    payload: {},
  };
  for (const [operationId, payload] of [
    ['integration.retryDelivery', { eventId: e.eventId }],
    [
      'integration.configureWebhook',
      { url: 'https://receiver.example/api/callback', enabled: true, expectedRevision: 0 },
    ],
    ['integration.rotateSigningKey', { keyId: 'preprovisioned', overlapSeconds: 300 }],
  ] as const) {
    expect(validateDeliveryCommand({ ...base, operationId, payload }), operationId).toBe(true);
    expect(
      validateDeliveryCommand({
        ...base,
        operationId,
        payload: { ...payload, forceApplied: true },
      }),
    ).toBe(false);
  }
});
it('recomputes the supplied raw-byte signature vector, boundary and duplicate header rejection', () => {
  const v = signatureVector,
    bytes = Buffer.from(v.bodyBase64, 'base64'),
    sig = signatureFor(bytes, v.scope, v.keyId, v.timestamp, v.secret);
  expect(sig).toBe(v.signature);
  const headers = [
    'x-tawsel-tenant-id',
    v.scope.tenantId,
    'x-tawsel-integration-id',
    v.scope.integrationId,
    'x-tawsel-key-id',
    v.keyId,
    'x-tawsel-delivery-timestamp',
    v.timestamp,
    'x-tawsel-signature',
    sig,
  ];
  expect(() =>
    verifySignature(
      bytes,
      headers,
      v.scope,
      [{ keyId: v.keyId, secretHex: v.secret, verifyUntil: null }],
      Number(v.timestamp) + 300000,
    ),
  ).not.toThrow();
  expect(() =>
    verifySignature(
      bytes,
      headers,
      v.scope,
      [{ keyId: v.keyId, secretHex: v.secret, verifyUntil: null }],
      Number(v.timestamp) + 300001,
    ),
  ).toThrow();
  expect(() =>
    verifySignature(
      Buffer.concat([bytes, Buffer.from(' ')]),
      headers,
      v.scope,
      [{ keyId: v.keyId, secretHex: v.secret, verifyUntil: null }],
      Number(v.timestamp),
    ),
  ).toThrow();
  expect(() => securityHeaders([...headers, 'X-Tawsel-Key-Id', v.keyId])).toThrow();
});
it('requires independent application/history counters and offers no expired-history retry', () => {
  const c = {
    schemaVersion: '1.0.0' as const,
    tenantId: scope.tenantId,
    recipientIntegrationId: scope.integrationId,
    aggregate: a,
    revision: 1,
    receivedThrough: 0,
    receivedHigh: 3,
    appliedThrough: 0,
    projectedThrough: 3,
    snapshotThrough: 3,
    historyComplete: false,
    pendingCount: 1,
    receivedAt: null,
    appliedAt: null,
    lastError: 'sequence_gap' as const,
  };
  expect(checkpointCountersValid(c)).toBe(true);
  expect(checkpointCountersValid({ ...c, historyComplete: true })).toBe(false);
  const report = {
    schemaVersion: '1.0.0',
    payloadVersion: '1.0.0',
    actionId: randomUUID(),
    operationId: 'integration.reportAppliedCheckpoint',
    context: { kind: 'integration', ...scope },
    resources: {},
    baseVersions: {},
    dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' } },
    payload: c,
  };
  expect(validateReportCommand(report)).toBe(true);
  expect(validateReportCommand({ ...report, payload: { checkpoint: c } })).toBe(false);
  expect(
    validateRecoveryCommand({
      schemaVersion: 1,
      companyId: randomUUID(),
      commandId: randomUUID(),
      type: 'recovery.replay',
      aggregateType: 'global',
      aggregateId: randomUUID(),
    }),
  ).toBe(false);
  expect(recoveryNextAction({ state: 'expired', failureClass: 'history-expired' })).toContain(
    'الحالة الحالية فقط',
  );
});
