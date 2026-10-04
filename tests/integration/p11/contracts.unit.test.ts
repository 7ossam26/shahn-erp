// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  tawselValidator,
  validateProvisioningCommand,
  validateDeliveryCommand,
  validateSenderSchema,
  validateSenderEvent,
  senderEventTypes,
  maxWebhookBytes,
} from '@shahn/contracts/tawsel';
import {
  signatureFor,
  verifySignature,
} from '../../../apps/api/src/modules/integration/signature-verifier.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { validFixtures, invalidFixtures, signatureVector, senderFixture } from './fixtures.js';
import { mappedEvents } from './mapped-events.js';
import {
  callbackShape,
  publicUnicast,
} from '../../../apps/api/src/modules/integration/callback-policy.js';
const selected = (id: string) => /^(p08-|p25-|p26-|action-result-|money-)/.test(id);
describe('P11 pinned public contracts and signatures', () => {
  for (const event of mappedEvents())
    it('validates mapped sender payload ' + event.eventType, () => {
      expect(validateSenderEvent(event), JSON.stringify(validateSenderSchema.errors)).toBe(true);
      const mismatch = structuredClone(event);
      mismatch.aggregate.id = mismatch.eventId;
      expect(validateSenderEvent(mismatch)).toBe(false);
      const unsupported = structuredClone(event);
      unsupported.payloadVersion = '2.0.0' as '1.0.0';
      expect(validateSenderEvent(unsupported)).toBe(false);
    });
  it('requires exact public HTTPS callbacks and excludes private/special IPv4 and IPv6', () => {
    const good = 'https://erp.example.com/api/v1/consumer/events';
    expect(callbackShape(good, [good]).href).toBe(good);
    for (const value of [
      'http://erp.example.com/callback',
      good + '?x=1',
      good + '#x',
      'https://user:password@erp.example.com/callback',
      'https://erp.example.com:444/callback',
    ])
      expect(() => callbackShape(value, [value])).toThrow();
    for (const address of [
      '127.0.0.1',
      '10.0.0.2',
      '169.254.169.254',
      '100.64.0.1',
      '192.0.2.1',
      '198.51.100.1',
      '203.0.113.1',
      '224.0.0.1',
      '::1',
      '::ffff:127.0.0.1',
      '2001:0000::1',
      '2001:db8::1',
      'fc00::1',
      'fe80::1',
      '3fff::1',
    ])
      expect(publicUnicast(address), address).toBe(false);
    expect(publicUnicast('8.8.8.8')).toBe(true);
    expect(publicUnicast('2606:4700:4700::1111')).toBe(true);
  });
  for (const f of [...validFixtures, ...invalidFixtures].filter((f) => selected(f.id)))
    it(`${f.id}: ${f.valid ? 'accept' : 'reject'} pinned fixture`, () => {
      expect(tawselValidator(f.schema)(f.data)).toBe(f.valid);
    });
  it('validates all 27 closed mappings and nested sender identity', () => {
    expect(senderEventTypes).toHaveLength(27);
    for (const f of validFixtures.filter((f) => f.schema === 'events/sender-event.v1.schema.json'))
      expect(validateSenderEvent(f.data), f.id).toBe(true);
    const event = senderFixture();
    event.aggregate.id = event.eventId;
    expect(validateSenderSchema(event)).toBe(true);
    expect(validateSenderEvent(event)).toBe(false);
  });
  it('rejects spoofed service context, unknown operation and unsafe feature money', () => {
    const command = structuredClone(
      validFixtures.find((f) => f.id === 'p08-branch.provision')!.data,
    ) as Record<string, unknown>;
    (command.context as Record<string, unknown>).assertedActorId = signatureVector.scope.tenantId;
    expect(validateProvisioningCommand(command)).toBe(false);
    command.operationId = 'outcome.recordFull';
    expect(validateProvisioningCommand(command)).toBe(false);
    const e = senderFixture('p25-task.snapshotAccepted');
    const task = e.payload.task as { snapshot: { lines: { unitDue: { amountMinor: number } }[] } };
    task.snapshot.lines[0]!.unitDue.amountMinor = 9007199254740992;
    expect(validateSenderSchema(e)).toBe(false);
  });
  it('constructs exact delivery command shapes and enforces signing overlap', () => {
    const base = structuredClone(
      validFixtures.find((f) => f.id === 'p08-branch.provision')!.data,
    ) as Record<string, unknown>;
    for (const [operation, payload] of [
      [
        'integration.configureWebhook',
        {
          url: 'https://erp.example.com/api/v1/consumer/events',
          enabled: true,
          expectedRevision: 0,
        },
      ],
      ['integration.rotateSigningKey', { keyId: 'next', overlapSeconds: 300 }],
      ['integration.retryDelivery', { eventId: signatureVector.scope.tenantId }],
    ] as const)
      expect(validateDeliveryCommand({ ...base, operationId: operation, payload })).toBe(true);
    expect(
      validateDeliveryCommand({
        ...base,
        operationId: 'integration.rotateSigningKey',
        payload: { keyId: 'next', overlapSeconds: 299 },
      }),
    ).toBe(false);
  });
  const v = signatureVector,
    raw = Buffer.from(v.bodyBase64, 'base64'),
    now = Number(v.timestamp),
    key = { keyId: v.keyId, secretHex: v.secret, verifyUntil: null };
  const headers = [
    'X-Tawsel-Tenant-Id',
    v.scope.tenantId,
    'X-Tawsel-Integration-Id',
    v.scope.integrationId,
    'X-Tawsel-Key-Id',
    v.keyId,
    'X-Tawsel-Delivery-Timestamp',
    v.timestamp,
    'X-Tawsel-Signature',
    v.signature,
  ];
  it('recomputes the published UTF-8 signing vector exactly', () => {
    expect(signatureFor(raw, v.scope, v.keyId, v.timestamp, v.secret)).toBe(v.signature);
    expect(verifySignature(raw, headers, v.scope, [key], now).keyId).toBe(v.keyId);
  });
  it('rejects byte changes, duplicate security headers, scope, keys, clock and expired overlap', () => {
    for (const delta of [
      Buffer.concat([raw, Buffer.from('\n')]),
      Buffer.from(raw.toString().replace('task.snapshotAccepted', 'task.urgencyChanged')),
    ])
      expect(() => verifySignature(delta, headers, v.scope, [key], now)).toThrow(
        'invalid_signature',
      );
    expect(() =>
      verifySignature(raw, [...headers, 'x-TAWSEL-signature', v.signature], v.scope, [key], now),
    ).toThrow();
    expect(() =>
      verifySignature(raw, headers, { ...v.scope, integrationId: v.scope.tenantId }, [key], now),
    ).toThrow();
    expect(() => verifySignature(raw, headers, v.scope, [], now)).toThrow();
    expect(() => verifySignature(raw, headers, v.scope, [key], now + 300001)).toThrow();
    expect(() =>
      verifySignature(raw, headers, v.scope, [{ ...key, verifyUntil: new Date(now - 1) }], now),
    ).toThrow();
    expect(
      verifySignature(raw, headers, v.scope, [{ ...key, verifyUntil: new Date(now) }], now).keyId,
    ).toBe(v.keyId);
    expect(maxWebhookBytes).toBe(2097152);
  });
  it('does not expose operator credentials to service discovery or permit impersonation', async () => {
    const client = new TawselClient({
      selector: 'x',
      companyId: v.scope.tenantId,
      tenantId: v.scope.tenantId,
      integrationId: v.scope.integrationId,
      externalId: 'erp',
      baseUrl: 'http://127.0.0.1',
      issuer: 'https://issuer.example.com',
      serviceBearer: null,
      serviceExpiresAt: null,
      signingKeys: {},
      initialKeyId: null,
      allowedCallbackUrls: [],
    });
    await expect(client.configuration()).rejects.toMatchObject({
      kind: 'configuration-blocked',
      code: 'AUTHORIZATION_EXPIRED',
    });
  });
});
