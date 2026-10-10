import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { accessFixture, fixtureConfig } from '../../support/access.js';
import { AccessRepository } from '../../../apps/api/src/modules/access/repository.js';
import { ConnectionSetup } from '../../../apps/api/src/modules/integration/connection-setup.service.js';
import {
  packageConnection,
  requiredGrants,
  type PrivateConnectionPackage,
} from '../../../apps/api/src/modules/integration/connection-package.js';
import type { ConnectionInstallation } from '../../../apps/api/src/modules/integration/connection-provider.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
export async function setupFixture(pool: Pool, origin = 'http://127.0.0.1:5337') {
  const f = await accessFixture(
    pool,
    fixtureConfig(origin, 'https://identity.example/realms/company'),
  );
  await new AccessRepository(pool).command(f.support.token, {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'support.start',
    reason: 'P27 disposable protected setup trial',
  });
  const p: PrivateConnectionPackage = {
    metadata: {
      packageVersion: '1.0.0',
      tenantId: randomUUID(),
      integrationId: randomUUID(),
      erpCompanyId: f.company,
      sourceExternalId: 'shahn',
      issuer: f.config.issuer,
      apiUrl: 'https://routing.example/',
      callbackUrl: 'https://erp.example/api/v1/consumer/events',
      companyCode: 'TRIAL',
      sourceCommit: 'fff79bcb90aaba5676bbc0cd64d78d9ce93845b2',
      contractSha256: '1da953c86788247a1deaad49bec0c87b5170ab9d795cac8a50dc84c4a0cf869a',
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
  const installation: ConnectionInstallation = {
    approvals: [approval],
    keys: { v1: randomBytes(32) },
    currentKeyVersion: 'v1',
    publicOrigin: 'https://erp.example',
    issuer: f.config.issuer,
  };
  const client = (value: PrivateConnectionPackage) => {
    const c = new TawselClient(packageConnection(value));
    c.configuration = async () => ({
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
    });
    c.status = async () => ({
      entity: 'source',
      externalId: 'shahn',
      resourceId: p.metadata.integrationId,
      sourceRevision: 7,
      lastActionId: value.metadata.bootstrapActionId,
      issuerStatus: 'not-required',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      enabled: true,
    });
    return c;
  };
  return { ...f, p, installation, service: new ConnectionSetup(pool, installation, client) };
}
