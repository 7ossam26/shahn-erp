import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import {
  tawselValidator,
  validateSenderEvent,
  adoptedTawselRelease,
} from '@shahn/contracts/tawsel';
import { rejectionDisplay } from '@shahn/contracts/execution';
import {
  approvedOrigin,
  approvedTransport,
} from '../../../apps/api/src/modules/integration/approved-transport.js';
import {
  validatePackageApproval,
  validateRemotePackage,
  sealPackage,
  openPackage,
  type PrivateConnectionPackage,
} from '../../../apps/api/src/modules/integration/connection-package.js';
const root = `docs/integration/tawsel-baseline/${adoptedTawselRelease.sourceCommit}/contracts/examples/`;
const examples = (name: string) =>
  JSON.parse(readFileSync(root + name + '.json', 'utf8')) as {
    id: string;
    schema: string;
    data: unknown;
  }[];
for (const x of examples('valid'))
  it('candidate valid ' + x.id, () => expect(tawselValidator(x.schema)(x.data)).toBe(true));
for (const x of examples('invalid'))
  it('candidate invalid ' + x.id, () => expect(tawselValidator(x.schema)(x.data)).toBe(false));
it('validates both sender versions without changing publisher bytes and rejects unsupported versions', () => {
  for (const x of examples('valid').filter((x) => x.schema.startsWith('events/sender-event.'))) {
    expect(validateSenderEvent(x.data), x.id).toBe(true);
    expect(validateSenderEvent({ ...(x.data as object), payloadVersion: '3.0.0' })).toBe(false);
  }
});
it('keeps legacy/unavailable/unknown and Other display distinct', () => {
  expect(rejectionDisplay({ outcome: 'refused' }).reasonState).toBe('legacy');
  expect(rejectionDisplay(null).reasonState).toBe('unavailable');
  expect(rejectionDisplay({ outcome: 'no-answer' }).reasonState).toBe('not-applicable');
  expect(
    rejectionDisplay({
      outcome: 'partial',
      rejection: { catalogVersion: '1.0.0', code: 'other', detail: 'المقاس' },
    }),
  ).toMatchObject({ reasonState: 'known', reasonDetail: 'المقاس' });
  expect(
    rejectionDisplay({
      outcome: 'refused',
      rejection: { catalogVersion: '1.0.0', code: 'new-code' },
    }).reasonState,
  ).toBe('unknown-code');
});
it.each([
  'http://routing.example/',
  'https://user:password@routing.example/',
  'https://routing.example/path',
  'https://routing.example/?x=1',
  'https://routing.example/#x',
  'https://routing.example:8443/',
])('rejects noncanonical origin %s', (url) => expect(() => approvedOrigin(url)).toThrow());
it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1'])(
  'never attaches credentials to private DNS %s',
  async (address) => {
    const resolve = (async () => [
      { address, family: address.includes(':') ? 6 : 4 },
    ]) as unknown as typeof import('node:dns/promises').lookup;
    await expect(
      approvedTransport('https://routing.example/', resolve)(
        'https://routing.example/api/v1/provisioning/configuration',
        { headers: { authorization: 'Bearer private-test' } },
      ),
    ).rejects.toThrow('UNAPPROVED_ADDRESS');
  },
);
it('refuses replacement hosts before DNS/credential forwarding', async () => {
  let calls = 0;
  const resolve = (async () => {
    calls++;
    return [{ address: '8.8.8.8', family: 4 }];
  }) as unknown as typeof import('node:dns/promises').lookup;
  await expect(
    approvedTransport('https://routing.example/', resolve)('https://foreign.example/', {
      headers: { authorization: 'Bearer private-test' },
    }),
  ).rejects.toThrow('UNAPPROVED_ORIGIN');
  expect(calls).toBe(0);
});
it('authenticated encryption binds the company/import/key version and supports retained key recovery', () => {
  const metadata = structuredClone(
    examples('valid').find((x) => x.schema === 'connection-package.schema.json#/$defs/Metadata')!
      .data,
  ) as PrivateConnectionPackage['metadata'];
  // The publisher example uses an illustrative callback. The ERP destination is fixed.
  metadata.callbackUrl = 'https://shahn.example.com/api/v1/consumer/events';
  metadata.sourceCommit = adoptedTawselRelease.sourceCommit;
  metadata.contractSha256 = adoptedTawselRelease.contractSha256;
  const p: PrivateConnectionPackage = {
    metadata,
    credential: {
      bearer: 'twp_' + randomUUID() + '.' + randomBytes(32).toString('hex'),
      expiresAt: '2027-10-01T00:00:00Z',
    },
    signingKeys: [{ keyId: 'test', secret: randomBytes(32).toString('hex') }],
    setup: {
      state: 'prepared-for-erp-import',
      actions: [metadata.bootstrapActionId, randomUUID(), randomUUID()],
    },
  };
  const key = randomBytes(32),
    aad = metadata.erpCompanyId + ':' + randomUUID() + ':v1',
    sealed = sealPackage(p, key, aad);
  expect(sealed.toString()).not.toContain(p.credential.bearer);
  expect(openPackage(sealed, key, aad)).toEqual(p);
  expect(() => openPackage(sealed, key, aad + 'foreign')).toThrow(
    'INTEGRATION_SECRET_RECOVERY_REQUIRED',
  );
  expect(() => openPackage(sealed, randomBytes(32), aad)).toThrow(
    'INTEGRATION_SECRET_RECOVERY_REQUIRED',
  );
  const {
    packageVersion,
    bootstrapActionId,
    capabilities,
    enrollmentMode,
    interopVersion,
    ...approval
  } = metadata;
  void packageVersion;
  void bootstrapActionId;
  void capabilities;
  void enrollmentMode;
  void interopVersion;
  expect(
    validatePackageApproval(
      p,
      approval,
      metadata.erpCompanyId,
      new URL(metadata.callbackUrl).origin,
      metadata.issuer,
    ),
  ).toEqual(p);
  expect(() =>
    validatePackageApproval(
      p,
      approval,
      randomUUID(),
      new URL(metadata.callbackUrl).origin,
      metadata.issuer,
    ),
  ).toThrow();
  expect(() =>
    validateRemotePackage(
      p,
      {
        identity: {
          mode: 'service-operation',
          tenantId: metadata.tenantId,
          integrationId: metadata.integrationId,
          actorId: null,
        },
        issuer: metadata.issuer,
        supportedVersions: ['1.0.0', '2.0.0'],
        allowedOperations: [],
        humanDelegation: false,
        erpCompanyId: metadata.erpCompanyId,
        interopVersion: metadata.interopVersion,
        serviceCapabilities: [],
      },
      {
        entity: 'source',
        externalId: metadata.sourceExternalId,
        resourceId: metadata.integrationId,
        sourceRevision: 5,
        lastActionId: metadata.bootstrapActionId,
        issuerStatus: 'not-required',
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
        enabled: true,
      },
    ),
  ).toThrow('REMOTE_SCOPE_OR_GRANTS_MISMATCH');
});
