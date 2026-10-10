import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { randomBytes, randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { setupFixture } from './setup-fixture.js';
import { authoritativeRuntime } from '../../../apps/api/src/modules/integration/connection-provider.js';
import { registerConnectionSetup } from '../../../apps/api/src/modules/integration/connection-setup.http.js';
import {
  enrollmentCommands,
  recordEnrollmentOperatorResult,
} from '../../../apps/api/src/modules/integration/enrollment.service.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { acceptedResult } from '../p11/fixtures.js';
import type { SourceEnvelope } from '@shahn/contracts/tawsel';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof setupFixture>>,
  app: ReturnType<typeof Fastify>,
  url: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await setupFixture(db.pool);
  app = Fastify({ logger: false });
  registerConnectionSetup(
    app,
    db.pool,
    f.config.origin,
    f.installation,
    authoritativeRuntime(db.pool, { connections: [] }, f.installation),
    f.service,
  );
  url = await app.listen({ host: '127.0.0.1', port: 0 });
});
afterAll(async () => {
  await app?.close();
  await db?.dispose();
});
async function post(
  path: string,
  body: unknown,
  user = f.support,
  csrf = user.csrfToken,
  origin = f.config.origin,
) {
  return fetch(url + '/api/v1/integration/connection/' + path, {
    method: 'POST',
    headers: {
      cookie: 'erp_session=' + user.token,
      origin,
      'content-type': 'application/json',
      'x-csrf-token': csrf,
    },
    body: JSON.stringify(body),
  });
}
it('actual HTTP rejects spoofed/wrong-company, CSRF and extra fields; responses and retained payloads never expose package secrets', async () => {
  const malformed = await fetch(url + '/api/v1/integration/connection/import', {
    method: 'POST',
    headers: {
      cookie: 'erp_session=' + f.support.token,
      origin: f.config.origin,
      'content-type': 'application/json',
      'x-csrf-token': f.support.csrfToken,
    },
    body: f.p.credential.bearer,
  });
  expect(malformed.status).toBe(400);
  const malformedError = await malformed.text();
  expect(malformedError).not.toContain(f.p.credential.bearer);
  expect(malformedError).toContain('CONNECTION_REQUEST_INVALID');
  const input = {
    companyId: f.company,
    importId: randomUUID(),
    origin: f.p.metadata.apiUrl,
    package: f.p,
  };
  for (const [csrf, origin] of [
    ['wrong', f.config.origin],
    [f.support.csrfToken, 'https://foreign.example'],
  ])
    expect((await post('import', input, f.support, csrf, origin)).status).toBe(403);
  expect((await post('import', { ...input, companyId: f.other })).status).toBe(403);
  expect((await post('import', { ...input, arbitrary: true })).status).toBe(400);
  const r = await post('import', input);
  expect(r.status).toBe(200);
  const safe = await r.text();
  expect(safe).not.toContain(f.p.credential.bearer);
  expect(safe).not.toContain(f.p.signingKeys[0]!.secret);
  const confirm = {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'integration.confirmConnection',
    importId: input.importId,
  };
  expect((await post('confirm', { ...confirm, package: f.p })).status).toBe(400);
  expect((await post('confirm', confirm)).status).toBe(200);
  const status = await fetch(url + '/api/v1/integration/connection/status?companyId=' + f.company, {
    headers: { cookie: 'erp_session=' + f.support.token },
  });
  expect(status.status).toBe(200);
  expect((await status.json()).receipt).toEqual({ lastSignedReceipt: null, applied: 0 });
  const retained = JSON.stringify(
    (await db.pool.query('SELECT payload,result FROM command_record')).rows,
  );
  expect(retained).not.toContain(f.p.credential.bearer);
  expect(retained).not.toContain(f.p.signingKeys[0]!.secret);
});
it('rotation recovers the exact opaque command, preserves old keys and survives independent provider restart with versioned encryption', async () => {
  const old = f.p.signingKeys[0]!,
    next = {
      ...structuredClone(f.p),
      credential: {
        bearer: 'twp_' + randomUUID() + '.' + randomBytes(32).toString('hex'),
        expiresAt: '2027-10-02T00:00:00Z',
      },
      signingKeys: [
        { ...old, verifyUntil: new Date(Date.now() + 86400000).toISOString() },
        { keyId: 'next', secret: randomBytes(32).toString('hex') },
      ],
    };
  f.installation.keys['v2'] = randomBytes(32);
  f.installation.currentKeyVersion = 'v2';
  const id = randomUUID();
  await f.service.import(f.support.token, f.company, id, next.metadata.apiUrl, next);
  const input = {
      schemaVersion: 1 as const,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'integration.confirmConnection' as const,
      importId: id,
    },
    result = await f.service.confirm(f.support.token, input);
  expect(await f.service.confirm(f.support.token, input)).toEqual(result);
  const restarted = await authoritativeRuntime(
    db.pool,
    { connections: [] },
    { ...f.installation, keys: { ...f.installation.keys } },
  ).resolve!(f.company);
  expect(restarted!.serviceBearer).toBe(next.credential.bearer);
  expect(restarted!.signingKeys).toEqual({
    initial: old.secret,
    next: next.signingKeys[1]!.secret,
  });
  expect(
    (await db.pool.query('SELECT count(*)::int n FROM integration.connection_revision')).rows[0].n,
  ).toBe(2);
  await expect(
    authoritativeRuntime(
      db.pool,
      { connections: [] },
      { ...f.installation, keys: { v2: f.installation.keys['v2']! } },
    ).resolve!(f.company),
  ).rejects.toThrow('INTEGRATION_SECRET_RECOVERY_REQUIRED');
  const conflict = {
      ...next,
      signingKeys: [
        { ...next.signingKeys[0]!, secret: randomBytes(32).toString('hex') },
        next.signingKeys[1]!,
      ],
    },
    bad = randomUUID();
  await f.service.import(f.support.token, f.company, bad, next.metadata.apiUrl, conflict);
  await expect(
    f.service.confirm(f.support.token, { ...input, commandId: randomUUID(), importId: bad }),
  ).rejects.toMatchObject({ code: 'IMMUTABLE_SIGNING_KEY_ID' });
});
it('batched operator-assisted enrollment retains separate principal/correlation identities and accepted source evidence never grants a driver', async () => {
  const commands = enrollmentCommands(db.pool),
    input = {
      schemaVersion: 1 as const,
      type: 'integration.requestEnrollment' as const,
      commandId: randomUUID(),
      companyId: f.company,
      principalIds: [f.admin.id, f.staffA.id],
    };
  await expect(commands.execute(f.admin.token, input)).rejects.toMatchObject({
    code: 'CONNECTION_SETUP_AUTHORITY_REQUIRED',
  });
  const r = await commands.execute(f.support.token, input),
    batch = r.body as {
      requestId: string;
      requests: { erpPrincipalId: string; erpCorrelationId: string; subject: string }[];
    };
  expect(batch.requests).toHaveLength(2);
  expect(batch.requests.every((x) => x.erpPrincipalId !== x.erpCorrelationId)).toBe(true);
  expect(await commands.recover(f.support.token, f.company, 'enrollment', input.commandId)).toEqual(
    r,
  );
  const action = randomUUID(),
    status = {
      entity: 'source' as const,
      externalId: f.p.metadata.sourceExternalId,
      resourceId: f.p.metadata.integrationId,
      sourceRevision: 8,
      lastActionId: action,
      issuerStatus: 'not-required' as const,
      enabled: true,
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    };
  const spy = vi.spyOn(TawselClient.prototype, 'status').mockResolvedValue(status);
  const configuration = vi.spyOn(TawselClient.prototype, 'configuration').mockResolvedValue({
    identity: {
      mode: 'service-operation',
      tenantId: f.p.metadata.tenantId,
      integrationId: f.p.metadata.integrationId,
      actorId: null,
    },
    issuer: f.config.issuer,
    erpCompanyId: f.company,
    interopVersion: '2.0.0',
    supportedVersions: ['1.0.0', '2.0.0'],
    allowedOperations: [],
    humanDelegation: false,
    serviceCapabilities: f.p.metadata.capabilities,
  });
  try {
    const result = acceptedResult({
      actionId: action,
      operationId: 'integration.bindSource',
    } as SourceEnvelope);
    result.summary = {
      entity: 'source',
      externalId: status.externalId,
      resourceId: status.resourceId,
      sourceRevision: 8,
      issuerStatus: 'not-required',
    };
    expect(
      (
        await recordEnrollmentOperatorResult(
          db.pool,
          authoritativeRuntime(db.pool, { connections: [] }, f.installation),
          f.support.token,
          f.company,
          batch.requestId,
          result,
        )
      ).state,
    ).toBe('operator-result-recorded-awaiting-user-provision');
    expect(
      (
        await db.pool.query(
          "SELECT count(*)::int n FROM integration.binding WHERE entity IN('user','driver')",
        )
      ).rows[0].n,
    ).toBe(0);
    expect(
      (
        await db.pool.query(
          "SELECT accepted_revision FROM integration.binding WHERE company_id=$1 AND entity='source'",
          [f.company],
        )
      ).rows[0].accepted_revision,
    ).toBe('8');
  } finally {
    spy.mockRestore();
    configuration.mockRestore();
  }
});
