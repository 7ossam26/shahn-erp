import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { SourceEnvelope } from '@shahn/contracts/tawsel';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { acceptedResult, validFixtures } from '../p11/fixtures.js';

it('uses the closed outbox catalog with fresh service configuration; does not broaden intake authority', async () => {
  const command: SourceEnvelope = {
    schemaVersion: '1.0.0',
    payloadVersion: '1.0.0',
    actionId: randomUUID(),
    operationId: 'integration.rotateSigningKey',
    context: { kind: 'integration', tenantId: randomUUID(), integrationId: randomUUID() },
    resources: {},
    baseVersions: {},
    dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' } },
    payload: { keyId: 'test-key', overlapSeconds: 300 },
  };
  const connection = {
    selector: 'unit',
    companyId: randomUUID(),
    ...command.context,
    externalId: 'unit',
    baseUrl: 'https://tawsel.example.com',
    issuer: 'https://issuer.example.com',
    serviceBearer: 'unit-only',
    serviceExpiresAt: null,
    signingKeys: {},
    initialKeyId: 'test-key',
    allowedCallbackUrls: [],
  };
  const configuration = {
    identity: {
      mode: 'service-operation',
      tenantId: connection.tenantId,
      integrationId: connection.integrationId,
      actorId: null,
    },
    issuer: connection.issuer,
    supportedVersions: ['1.0.0'],
    allowedOperations: ['branch.provision'],
    humanDelegation: false,
  };
  const paths: string[] = [];
  let denied = false;
  const client = new TawselClient(connection, async (url) => {
    paths.push(new URL(String(url)).pathname);
    const config = String(url).endsWith('/configuration');
    return new Response(
      JSON.stringify(config ? configuration : denied ? {} : acceptedResult(command)),
      { status: config ? 200 : denied ? 403 : 200 },
    );
  });
  expect((await client.send(command, JSON.stringify(command))).result.receipt.businessStatus).toBe(
    'accepted',
  );
  expect(paths).toEqual([
    '/api/v1/provisioning/configuration',
    '/api/v1/integration/commands/integration.rotateSigningKey',
  ]);
  denied = true;
  await expect(client.send(command, JSON.stringify(command))).rejects.toMatchObject({
    code: 'AUTHORIZATION_EXPIRED',
  });
  configuration.identity.integrationId = randomUUID();
  await expect(client.send(command, JSON.stringify(command))).rejects.toMatchObject({
    code: 'SOURCE_CONFIGURATION_MISMATCH',
  });
  configuration.identity.integrationId = connection.integrationId;
  const intake = structuredClone(
    validFixtures.find((f) => f.id === 'p10-SourceSnapshot')!.data,
  ) as SourceEnvelope;
  intake.context = command.context;
  paths.length = 0;
  await expect(client.send(intake, JSON.stringify(intake))).rejects.toMatchObject({
    code: 'OPERATION_NOT_ALLOWED',
  });
  expect(paths).toEqual(['/api/v1/provisioning/configuration']);
});
