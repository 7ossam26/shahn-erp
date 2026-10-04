import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { validFixtures, invalidFixtures } from '../p11/fixtures.js';
import {
  tawselValidator,
  validSnapshotSemantics,
  validateIntakeCommand,
  type SourceSnapshot,
  type SourceEnvelope,
} from '@shahn/contracts/tawsel';
import { validateDispatchCommand } from '@shahn/contracts';
import {
  wireMoney,
  dispatchPrice,
  buildSourceSnapshot,
} from '../../../apps/api/src/modules/dispatch/snapshot.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
describe('P12 closed canonical intake', () => {
  it('retains a correlated definite HTTP Problem without fabricating an acceptance receipt', async () => {
    const envelope = structuredClone(
      validFixtures.find((f) => f.id === 'p10-SourceSnapshot')!.data,
    ) as SourceEnvelope;
    const connection = {
      selector: 'unit',
      companyId: randomUUID(),
      tenantId: envelope.context.tenantId,
      integrationId: envelope.context.integrationId,
      externalId: 'unit',
      baseUrl: 'https://tawsel.example.com',
      issuer: 'https://issuer.example.com',
      serviceBearer: 'unit-only',
      serviceExpiresAt: null,
      signingKeys: {},
      initialKeyId: 'unit',
      allowedCallbackUrls: [],
    };
    const problem = {
      type: 'https://schemas.tawsel.invalid/problems/stale-revision',
      title: 'Stale',
      status: 409,
      code: 'stale_revision',
      correlationId: randomUUID(),
      actionId: envelope.actionId,
      retryable: false,
    };
    const client = new TawselClient(
      connection,
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).endsWith('/configuration')
              ? {
                  identity: {
                    mode: 'service-operation',
                    tenantId: connection.tenantId,
                    integrationId: connection.integrationId,
                    actorId: null,
                  },
                  issuer: connection.issuer,
                  supportedVersions: ['1.0.0'],
                  allowedOperations: [envelope.operationId],
                  humanDelegation: false,
                }
              : problem,
          ),
          { status: String(url).endsWith('/configuration') ? 200 : 409 },
        ),
    );
    await expect(client.send(envelope, JSON.stringify(envelope))).rejects.toMatchObject({
      kind: 'review-required',
      code: 'stale_revision',
      problem,
    });
    const pending = new TawselClient(
      connection,
      async () =>
        new Response(JSON.stringify({ actionId: envelope.actionId, status: 'pending' }), {
          status: 202,
        }),
    );
    expect(await pending.intakeResult(envelope)).toBeNull();
  });
  for (const f of [...validFixtures, ...invalidFixtures].filter((x) => x.id.startsWith('p10-')))
    it(f.id, () => expect(!!tawselValidator(f.schema)(f.data)).toBe(f.valid));
  const base = () =>
    structuredClone(
      (
        validFixtures.find((f) => f.id === 'p10-SourceSnapshot')!.data as {
          payload: SourceSnapshot;
        }
      ).payload,
    );
  it('rejects products and sums exceeding safe wire integers without rounding', () => {
    const s = base();
    s.lines[0]!.unitDue.amountMinor = Number.MAX_SAFE_INTEGER;
    expect(validSnapshotSemantics(s)).toBe(false);
    expect(() => wireMoney('9007199254740992')).toThrow();
    for (const v of ['-1', '1.0', '01', '1e3', ' 1']) expect(() => wireMoney(v)).toThrow();
    expect(wireMoney('9007199254740991').amountMinor).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('rejects incorrect sums and repeated stable lines', () => {
    const s = base();
    s.totalDue.amountMinor++;
    expect(validSnapshotSemantics(s)).toBe(false);
    s.lines.push(s.lines[0]!);
    expect(validSnapshotSemantics(s)).toBe(false);
  });
  it('forbids staff waiver, human actor and unasserted receipt', () => {
    const c = structuredClone(
      validFixtures.find((f) => f.id === 'p10-ReceiveBatch')!.data,
    ) as Record<string, unknown>;
    c.actorId = randomUUID();
    expect(validateIntakeCommand(c)).toBe(false);
    expect(
      validateDispatchCommand({
        schemaVersion: 1,
        companyId: randomUUID(),
        commandId: randomUUID(),
        type: 'dispatch.receive',
        intentId: randomUUID(),
        expectedVersion: 1,
        receiptAsserted: false,
      }),
    ).toBe(false);
    expect(
      validateDispatchCommand({
        schemaVersion: 1,
        companyId: randomUUID(),
        commandId: randomUUID(),
        type: 'dispatch.prepare',
        branchId: randomUUID(),
        driverId: randomUUID(),
        items: [{ shipmentId: randomUUID(), expectedVersion: 1 }],
        waiver: true,
      }),
    ).toBe(false);
  });
  it('preserves goods while representing an approved incident shipping waiver', () => {
    const id = randomUUID(),
      price = {
        currency: 'EGP',
        tariffMinor: '5000',
        baseShippingMinor: '5000',
        packingUpliftMinor: '0',
        goodsDueMinor: '25000',
        recipientShippingMinor: '5000',
        recipientDueMinor: '30000',
        brandShippingMinor: '0',
        partialDelivery: true,
      } as Parameters<typeof dispatchPrice>[0];
    const p = dispatchPrice(price, id, {
      incidentId: randomUUID(),
      approvalId: randomUUID(),
      originalShipmentId: randomUUID(),
      replacementShipmentId: id,
    });
    const d = {
      fields: {
        recipientName: 'مستلم',
        phoneDisplay: '٠١٠ ١٢٣٤ ٥٦٧٨',
        address: 'عنوان مؤكد نصياً',
        locationUrl: 'https://maps.example.com/somewhere',
        inspectionAllowed: true,
        comment: 'تعليمات إضافية',
        brandReference: '',
        lines: [
          { id: randomUUID(), description: 'قطعة', quantity: 1, unitDue: { amountMinor: '25000' } },
        ],
      },
    } as Parameters<typeof buildSourceSnapshot>[0];
    const s = buildSourceSnapshot(d, p, {
      externalId: 'shipment:' + id,
      sourceDispatchCycleId: 'cycle:one',
      sourceBranchExternalId: 'branch:a',
      sourceRevision: 1,
      expectedSourceRevision: 0,
    });
    expect(s.totalDue.amountMinor).toBe(25000);
    expect(s.shippingDue.amountMinor).toBe(0);
    expect(p).toMatchObject({
      tariffMinor: '5000',
      waiverMinor: '5000',
      brandShippingMinor: '0',
      commissionPolicy: 'normal',
    });
    expect(s.destination.kind).toBe('address');
    expect(s.recipientPhone).toBe('01012345678');
    expect(s.instructions).toContain('المعاينة');
    expect(s).not.toHaveProperty('waiver');
  });
});
