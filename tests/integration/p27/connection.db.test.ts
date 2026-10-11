import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { accessFixture, fixtureConfig } from '../../support/access.js';
import { AccessRepository } from '../../../apps/api/src/modules/access/repository.js';
import { ConnectionSetup } from '../../../apps/api/src/modules/integration/connection-setup.service.js';
import {
  authoritativeRuntime,
  type ConnectionInstallation,
} from '../../../apps/api/src/modules/integration/connection-provider.js';
import {
  packageConnection,
  requiredGrants,
  type PrivateConnectionPackage,
} from '../../../apps/api/src/modules/integration/connection-package.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import {
  adoptedTawselRelease,
  type SourceConfiguration,
  type ProvisioningStatus,
} from '@shahn/contracts/tawsel';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof accessFixture>>,
  installation: ConnectionInstallation,
  p: PrivateConnectionPackage,
  service: ConnectionSetup;
let calls = 0,
  fail = false,
  configuration: SourceConfiguration,
  status: ProvisioningStatus;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await accessFixture(
    db.pool,
    fixtureConfig('https://erp.example', 'https://identity.example/realms/company'),
  );
  await new AccessRepository(db.pool).command(f.support.token, {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'support.start',
    reason: 'Protected P27 isolated installation checks',
  });
  p = {
    metadata: {
      packageVersion: '1.0.0',
      tenantId: randomUUID(),
      integrationId: randomUUID(),
      erpCompanyId: f.company,
      sourceExternalId: 'shahn',
      issuer: f.config.issuer,
      apiUrl: 'https://routing.example/',
      callbackUrl: f.config.origin + '/api/v1/consumer/events',
      companyCode: 'TRIAL',
      sourceCommit: adoptedTawselRelease.sourceCommit,
      contractSha256: adoptedTawselRelease.contractSha256,
      interopVersion: '2.0.0',
      capabilities: requiredGrants,
      enrollmentMode: 'operator-assisted-exact-subjects',
      bootstrapActionId: randomUUID(),
    },
    credential: {
      bearer: 'twp_' + randomUUID() + '.' + randomBytes(32).toString('hex'),
      expiresAt: '2027-10-01T00:00:00Z',
    },
    signingKeys: [{ keyId: 'initial', secret: randomBytes(32).toString('hex') }],
    setup: { state: 'prepared-for-erp-import', actions: [] },
  };
  p.setup.actions = [p.metadata.bootstrapActionId, randomUUID(), randomUUID()];
  const {
    packageVersion,
    bootstrapActionId,
    capabilities,
    enrollmentMode,
    interopVersion,
    ...approval
  } = p.metadata;
  void packageVersion;
  void bootstrapActionId;
  void capabilities;
  void enrollmentMode;
  void interopVersion;
  installation = {
    approvals: [approval],
    keys: { v1: randomBytes(32) },
    currentKeyVersion: 'v1',
    publicOrigin: f.config.origin,
    issuer: f.config.issuer,
  };
  configuration = {
    identity: {
      mode: 'service-operation',
      tenantId: p.metadata.tenantId,
      integrationId: p.metadata.integrationId,
      actorId: null,
    },
    issuer: p.metadata.issuer,
    supportedVersions: ['1.0.0', '2.0.0'],
    allowedOperations: [],
    humanDelegation: false,
    erpCompanyId: f.company,
    interopVersion: '2.0.0',
    serviceCapabilities: requiredGrants,
  };
  status = {
    entity: 'source',
    externalId: 'shahn',
    resourceId: p.metadata.integrationId,
    sourceRevision: 7,
    lastActionId: p.metadata.bootstrapActionId,
    issuerStatus: 'not-required',
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    enabled: true,
  };
  // Controlled canonical remote reader; these tests claim native DB boundary evidence only.
  service = new ConnectionSetup(db.pool, installation, (value) => {
    const client = new TawselClient(packageConnection(value));
    client.configuration = async () => {
      calls++;
      if (fail) throw Error('lost response');
      return configuration;
    };
    client.status = async () => status;
    return client;
  });
});
afterAll(async () => {
  await db?.dispose();
});
it('rejects ordinary screen grants, foreign package/company/issuer and unapproved origin before remote IO', async () => {
  await expect(
    service.import(f.admin.token, f.company, randomUUID(), p.metadata.apiUrl, p),
  ).rejects.toMatchObject({ code: 'CONNECTION_SETUP_AUTHORITY_REQUIRED' });
  await expect(
    service.import(f.support.token, f.other, randomUUID(), p.metadata.apiUrl, p),
  ).rejects.toBeDefined();
  for (const changed of [
    { ...p, metadata: { ...p.metadata, erpCompanyId: f.other } },
    { ...p, metadata: { ...p.metadata, issuer: 'https://foreign.example/' } },
    { ...p, metadata: { ...p.metadata, sourceExternalId: 'foreign' } },
  ])
    await expect(
      service.import(f.support.token, f.company, randomUUID(), p.metadata.apiUrl, changed),
    ).rejects.toMatchObject({ code: 'PRIVATE_PACKAGE_VALIDATION_FAILED' });
  await expect(
    service.import(f.support.token, f.company, randomUUID(), 'https://replacement.example/', p),
  ).rejects.toMatchObject({ code: 'INSTALLATION_APPROVAL_REQUIRED' });
  expect(calls).toBe(0);
  expect(
    (await db.pool.query('SELECT count(*)::int n FROM integration.protected_import')).rows[0].n,
  ).toBe(0);
});
it('recovers encrypted import and exact confirmation after a lost response; anchors revision seven without a fake command', async () => {
  const id = randomUUID();
  await service.import(f.support.token, f.company, id, p.metadata.apiUrl, p);
  await service.import(f.support.token, f.company, id, p.metadata.apiUrl, p);
  await expect(
    service.import(f.support.token, f.company, id, p.metadata.apiUrl, {
      ...p,
      credential: {
        ...p.credential,
        bearer: 'twp_' + randomUUID() + '.' + randomBytes(32).toString('hex'),
      },
    }),
  ).rejects.toMatchObject({ code: 'IMPORT_IDENTITY_CONFLICT' });
  fail = true;
  await expect(service.verify(f.support.token, f.company, id)).rejects.toThrow('lost response');
  fail = false;
  await service.verify(f.support.token, f.company, id);
  const input = {
    schemaVersion: 1 as const,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'integration.confirmConnection' as const,
    importId: id,
  };
  const reply = await service.commands().execute(f.support.token, input);
  expect(reply.status).toBe(200);
  expect(
    await service.commands().recover(f.support.token, f.company, 'connection', input.commandId),
  ).toEqual(reply);
  expect(await service.commands().execute(f.support.token, input)).toEqual(reply);
  const binding = (
    await db.pool.query(
      "SELECT submitted_revision::text,accepted_revision::text,last_action_id FROM integration.binding WHERE entity='source'",
    )
  ).rows[0];
  expect(binding).toEqual({
    submitted_revision: '7',
    accepted_revision: '7',
    last_action_id: p.metadata.bootstrapActionId,
  });
  expect(
    (await db.pool.query('SELECT count(*)::int n FROM integration.source_command')).rows[0].n,
  ).toBe(0);
  const safe = JSON.stringify(
    await service.read(f.support.token, f.company, id).then((x) => service.safe(x)),
  );
  const retained =
    JSON.stringify((await db.pool.query('SELECT row_to_json(c) data FROM command_record c')).rows) +
    (await db.pool.query('SELECT row_to_json(a) data FROM audit_entry a')).rows
      .map((x) => JSON.stringify(x))
      .join('');
  for (const secret of [p.credential.bearer, p.signingKeys[0]!.secret]) {
    expect(safe).not.toContain(secret);
    expect(retained).not.toContain(secret);
  }
  const cipher = (
    await db.pool.query('SELECT ciphertext FROM integration.protected_import WHERE id=$1', [id])
  ).rows[0].ciphertext as Buffer;
  expect(cipher.toString()).not.toContain(p.credential.bearer);
  const api = authoritativeRuntime(db.pool, { connections: [] }, installation),
    worker = authoritativeRuntime(
      db.pool,
      { connections: [] },
      { ...installation, keys: { ...installation.keys } },
    );
  expect(await api.resolve!(f.company)).toEqual(await worker.resolve!(f.company));
  expect((await worker.resolve!(f.company))!.serviceBearer).toBe(p.credential.bearer);
  await expect(
    authoritativeRuntime(db.pool, { connections: [] }, { ...installation, keys: {} }).resolve!(
      f.company,
    ),
  ).rejects.toThrow('INTEGRATION_SECRET_RECOVERY_REQUIRED');
  await expect(
    db.pool.query('UPDATE integration.protected_import SET metadata=metadata WHERE id=$1', [id]),
  ).rejects.toThrow('IMMUTABLE_PROTECTED_CONNECTION');
  await expect(
    db.pool.query(
      "UPDATE integration.source SET base_url='https://replacement.example/' WHERE company_id=$1",
      [f.company],
    ),
  ).rejects.toThrow();
});
it('does not confirm missing grants or invented bootstrap status', async () => {
  const id = randomUUID();
  await service.import(f.support.token, f.company, id, p.metadata.apiUrl, p);
  configuration = { ...configuration, serviceCapabilities: ['integration.manage'] };
  await expect(service.verify(f.support.token, f.company, id)).rejects.toThrow(
    'REMOTE_SCOPE_OR_GRANTS_MISMATCH',
  );
  configuration = { ...configuration, serviceCapabilities: requiredGrants };
  status = { ...status, lastActionId: randomUUID() };
  await expect(service.verify(f.support.token, f.company, id)).rejects.toThrow(
    'REMOTE_SETUP_IDENTITY_MISMATCH',
  );
  status = { ...status, lastActionId: p.metadata.bootstrapActionId };
});
it('fails closed when the selected-company support session expires', async () => {
  await db.pool.query(
    "UPDATE access.support_session SET expires_at=clock_timestamp()-interval '1 second' WHERE principal_id=$1",
    [f.support.id],
  );
  await expect(
    service.import(f.support.token, f.company, randomUUID(), p.metadata.apiUrl, p),
  ).rejects.toBeDefined();
});
