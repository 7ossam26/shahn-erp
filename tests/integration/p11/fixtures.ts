import { readFileSync } from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import type { SenderEvent, SourceEnvelope, ActionResult } from '@shahn/contracts/tawsel';
import type { IntegrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { provisioningCommands } from '../../../apps/api/src/modules/integration/provisioning.service.js';
import { accessFixture, fixtureConfig } from '../../support/access.js';
export interface CanonicalFixture {
  id: string;
  schema: string;
  valid: boolean;
  data: unknown;
  keyword?: string;
}
export const validFixtures = JSON.parse(
  readFileSync('packages/test-support/fixtures/tawsel/valid.json', 'utf8'),
) as CanonicalFixture[];
export const invalidFixtures = JSON.parse(
  readFileSync('packages/test-support/fixtures/tawsel/invalid.json', 'utf8'),
) as CanonicalFixture[];
export const signatureVector = JSON.parse(
  readFileSync('packages/test-support/fixtures/tawsel/webhook-signature.v1.json', 'utf8'),
) as {
  scope: { tenantId: string; integrationId: string };
  keyId: string;
  secret: string;
  timestamp: string;
  bodyBase64: string;
  prefix: string;
  signature: string;
};
export function senderFixture(id = 'p25-provisioning.changed'): SenderEvent {
  return structuredClone(validFixtures.find((f) => f.id === id)!.data) as SenderEvent;
}
export function acceptedResult(e: SourceEnvelope): ActionResult {
  return {
    receipt: {
      schemaVersion: '1.0.0',
      receiptId: randomUUID(),
      actionId: e.actionId,
      evidenceStatus: 'received',
      businessStatus: 'accepted',
      receivedAt: new Date().toISOString(),
      committedAt: new Date().toISOString(),
      resourceVersions: {},
    },
    operationId: e.operationId,
    retention: 'full',
    summary: {},
    response: { status: 200, body: {} },
  };
}
export async function integrationFixture(
  pool: Pool,
  origin = 'http://127.0.0.1:5317',
  baseUrl = 'http://127.0.0.1:1',
) {
  const f = await accessFixture(pool, fixtureConfig(origin));
  await pool.query(
    `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'integration') ON CONFLICT DO NOTHING`,
    [f.company, f.adminRole],
  );
  const driver = randomUUID();
  await pool.query(
    `INSERT INTO employees.operational_driver(company_id,id,name,branch_id) VALUES($1,$2,'سائق التجربة',$3)`,
    [f.company, driver, f.a],
  );
  const event = senderFixture(),
    secret = randomBytes(32).toString('hex');
  const connection = {
    selector: 'local-trial',
    companyId: f.company,
    tenantId: event.tenantId,
    integrationId: event.recipientIntegrationId,
    externalId: 'erp-trial',
    baseUrl,
    issuer: f.config.issuer,
    serviceBearer: 'twp_' + randomUUID() + '.' + randomBytes(32).toString('hex'),
    serviceExpiresAt: '2027-10-04T00:00:00Z',
    signingKeys: { trial: secret, next: randomBytes(32).toString('hex') },
    initialKeyId: 'trial',
    allowedCallbackUrls: ['https://erp.example.com/api/v1/consumer/events'],
  };
  const runtime: IntegrationRuntime = { connections: [connection] },
    commands = provisioningCommands(pool, runtime);
  const setup = (
    await commands.execute(f.admin.token, {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'integration.setup',
      selector: connection.selector,
    })
  ).body as { sourceId: string };
  return { ...f, driver, event, secret, connection, runtime, commands, sourceId: setup.sourceId };
}
