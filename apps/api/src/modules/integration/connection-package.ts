import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {
  tawselValidator,
  tawselUuid,
  adoptedTawselRelease,
  type SourceConfiguration,
  type ProvisioningStatus,
} from '@shahn/contracts/tawsel';
import { approvedOrigin } from './approved-transport.js';
import type { IntegrationConnection } from './config.js';

export interface ConnectionMetadata {
  packageVersion: '1.0.0';
  tenantId: string;
  integrationId: string;
  erpCompanyId: string;
  sourceExternalId: string;
  issuer: string;
  apiUrl: string;
  callbackUrl: string;
  companyCode: string;
  sourceCommit: string;
  contractSha256: string;
  interopVersion: '1.0.0' | '2.0.0';
  capabilities: string[];
  enrollmentMode: 'operator-assisted-exact-subjects';
  bootstrapActionId: string;
}
export interface PrivateConnectionPackage {
  metadata: ConnectionMetadata;
  credential: { bearer: string; expiresAt: string };
  signingKeys: { keyId: string; secret: string; verifyUntil?: string }[];
  setup: { state: 'prepared-for-erp-import'; actions: string[] };
}
export type InstallationApproval = Omit<
  ConnectionMetadata,
  'packageVersion' | 'bootstrapActionId' | 'capabilities' | 'enrollmentMode' | 'interopVersion'
>;
/** A protected file can retain current and separately reviewed replacement records.
 * Select by the entire immutable package identity, never by company or host alone. */
export function matchingInstallationApproval(
  approvals: InstallationApproval[],
  metadata: ConnectionMetadata,
): InstallationApproval | undefined {
  return approvals.find(
    (a) =>
      validInstallationApproval(a) &&
      Object.entries(a).every(
        ([field, value]) => metadata[field as keyof ConnectionMetadata] === value,
      ),
  );
}
export function validInstallationApprovals(
  approvals: unknown,
): approvals is InstallationApproval[] {
  if (!Array.isArray(approvals) || approvals.some((a) => !validInstallationApproval(a)))
    return false;
  const identities = approvals.map((a) =>
    JSON.stringify(Object.entries(a).sort(([a], [b]) => a.localeCompare(b))),
  );
  if (new Set(identities).size !== identities.length) return false;
  const immutable = [
    'tenantId',
    'integrationId',
    'sourceExternalId',
    'companyCode',
    'issuer',
    'callbackUrl',
  ] as const;
  return approvals.every((a) =>
    approvals.every(
      (b) => a.erpCompanyId !== b.erpCompanyId || immutable.every((field) => a[field] === b[field]),
    ),
  );
}
export function validInstallationApproval(value: unknown): value is InstallationApproval {
  if (!value || typeof value !== 'object') return false;
  const a = value as InstallationApproval;
  if (
    Object.keys(a).sort().join(',') !==
      'apiUrl,callbackUrl,companyCode,contractSha256,erpCompanyId,integrationId,issuer,sourceCommit,sourceExternalId,tenantId' ||
    ![a.erpCompanyId, a.tenantId, a.integrationId].every((x) => tawselUuid(x)) ||
    !/^[a-f0-9]{40}$/.test(a.sourceCommit) ||
    !/^[a-f0-9]{64}$/.test(a.contractSha256) ||
    !a.sourceExternalId ||
    !a.companyCode
  )
    return false;
  try {
    approvedOrigin(a.apiUrl);
    const issuer = new URL(a.issuer),
      callback = new URL(a.callbackUrl);
    return [issuer, callback].every(
      (x) =>
        x.protocol === 'https:' &&
        !x.port &&
        !x.username &&
        !x.password &&
        !x.search &&
        !x.hash &&
        x.href === (x === issuer ? a.issuer : a.callbackUrl),
    );
  } catch {
    return false;
  }
}
const privateValidator = tawselValidator<PrivateConnectionPackage>(
  'connection-package.schema.json#/$defs/Private',
);
export const validatePrivatePackage = (value: unknown): value is PrivateConnectionPackage =>
  privateValidator(value);
export const requiredGrants = [
  'identity.provision',
  'integration.manage',
  'intake.prepare',
  'assignment.manage',
  'monitor.read',
  'return.receive',
  'return.dispose',
];
export function validatePackageApproval(
  value: unknown,
  approval: InstallationApproval,
  company: string,
  publicOrigin: string,
  issuer: string,
): PrivateConnectionPackage {
  if (!validatePrivatePackage(value)) throw Error('INVALID_PRIVATE_PACKAGE');
  if (!validInstallationApproval(approval)) throw Error('INSTALLATION_APPROVAL_MISMATCH');
  const p = value;
  if (
    p.metadata.sourceCommit !== adoptedTawselRelease.sourceCommit ||
    p.metadata.contractSha256 !== adoptedTawselRelease.contractSha256
  )
    throw Error('UNREVIEWED_PACKAGE_CONTRACT');
  if (requiredGrants.some((g) => !p.metadata.capabilities.includes(g)))
    throw Error('REQUIRED_PACKAGE_GRANTS_MISSING');
  approvedOrigin(approval.apiUrl);
  if (
    approval.erpCompanyId !== company ||
    approval.issuer !== issuer ||
    approval.callbackUrl !== approvedOrigin(publicOrigin + '/').origin + '/api/v1/consumer/events'
  )
    throw Error('INSTALLATION_APPROVAL_MISMATCH');
  for (const key of Object.keys(approval) as (keyof InstallationApproval)[])
    if (p.metadata[key] !== approval[key]) throw Error('PACKAGE_SCOPE_MISMATCH');
  if (Date.parse(p.credential.expiresAt) <= Date.now()) throw Error('CREDENTIAL_EXPIRED');
  if (
    new Set(p.signingKeys.map((k) => k.keyId)).size !== p.signingKeys.length ||
    !p.setup.actions.includes(p.metadata.bootstrapActionId)
  )
    throw Error('SETUP_IDENTITY_MISMATCH');
  if (
    p.signingKeys.at(-1)!.verifyUntil &&
    Date.parse(p.signingKeys.at(-1)!.verifyUntil!) <= Date.now()
  )
    throw Error('SIGNING_KEY_EXPIRED');
  return p;
}
export function validateRemotePackage(
  p: PrivateConnectionPackage,
  c: SourceConfiguration,
  status: ProvisioningStatus,
) {
  const m = p.metadata;
  if (
    c.identity.tenantId !== m.tenantId ||
    c.identity.integrationId !== m.integrationId ||
    c.erpCompanyId !== m.erpCompanyId ||
    c.issuer !== m.issuer ||
    c.interopVersion !== m.interopVersion ||
    c.humanDelegation !== false ||
    !c.supportedVersions.includes(m.interopVersion) ||
    requiredGrants.some((g) => !c.serviceCapabilities?.includes(g))
  )
    throw Error('REMOTE_SCOPE_OR_GRANTS_MISMATCH');
  if (
    status.entity !== 'source' ||
    status.externalId !== m.sourceExternalId ||
    status.resourceId !== m.integrationId ||
    !status.enabled ||
    status.sourceRevision < 1 ||
    status.lastActionId !== m.bootstrapActionId
  )
    throw Error('REMOTE_SETUP_IDENTITY_MISMATCH');
}
export function packageConnection(p: PrivateConnectionPackage): IntegrationConnection {
  const m = p.metadata;
  return {
    selector: 'import-' + m.erpCompanyId,
    companyId: m.erpCompanyId,
    tenantId: m.tenantId,
    integrationId: m.integrationId,
    externalId: m.sourceExternalId,
    baseUrl: m.apiUrl,
    issuer: m.issuer,
    serviceBearer: p.credential.bearer,
    serviceExpiresAt: p.credential.expiresAt,
    signingKeys: Object.fromEntries(p.signingKeys.map((k) => [k.keyId, k.secret])),
    initialKeyId: p.signingKeys.at(-1)!.keyId,
    allowedCallbackUrls: [m.callbackUrl],
    approvedOrigin: m.apiUrl,
  };
}
export function sealPackage(p: PrivateConnectionPackage, key: Buffer, aad: string): Buffer {
  if (key.length !== 32) throw Error('INTEGRATION_KEY_REQUIRED');
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(p), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]);
}
export function openPackage(bytes: Buffer, key: Buffer, aad: string): PrivateConnectionPackage {
  try {
    const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    cipher.setAAD(Buffer.from(aad));
    cipher.setAuthTag(bytes.subarray(12, 28));
    const p: unknown = JSON.parse(
      Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8'),
    );
    if (!validatePrivatePackage(p)) throw Error();
    return p;
  } catch {
    throw Error('INTEGRATION_SECRET_RECOVERY_REQUIRED');
  }
}
