import { readFileSync } from 'node:fs';
import type { Pool } from 'pg';
import type { IntegrationRuntime } from './config.js';
import {
  openPackage,
  packageConnection,
  validInstallationApproval,
  validInstallationApprovals,
  matchingInstallationApproval,
  type InstallationApproval,
} from './connection-package.js';

export interface ConnectionInstallation {
  approvals: InstallationApproval[];
  keys: Record<string, Buffer>;
  currentKeyVersion: string;
  publicOrigin: string;
  issuer: string;
}
export function connectionInstallation(): ConnectionInstallation | null {
  if (!process.env['TAWSEL_INSTALLATION_APPROVAL_FILE']) return null;
  try {
    const approvals = JSON.parse(
      readFileSync(process.env['TAWSEL_INSTALLATION_APPROVAL_FILE'], 'utf8'),
    ) as InstallationApproval[];
    const raw = JSON.parse(readFileSync(process.env['TAWSEL_ENCRYPTION_KEYS_FILE']!, 'utf8')) as {
      current: string;
      keys: Record<string, string>;
    };
    if (
      !validInstallationApprovals(approvals) ||
      typeof raw.current !== 'string' ||
      !/^[A-Za-z0-9._-]{1,64}$/.test(raw.current) ||
      Object.keys(raw.keys).some((v) => !/^[A-Za-z0-9._-]{1,64}$/.test(v)) ||
      !raw.keys[raw.current] ||
      Object.values(raw.keys).some((k) => !/^[a-f0-9]{64}$/.test(k))
    )
      throw Error();
    return {
      approvals,
      currentKeyVersion: raw.current,
      keys: Object.fromEntries(
        Object.entries(raw.keys).map(([v, k]) => [v, Buffer.from(k, 'hex')]),
      ),
      publicOrigin: process.env['APP_ORIGIN']!,
      issuer: process.env['OIDC_ISSUER']!,
    };
  } catch {
    throw Error('Configuration: protected Tawsel installation approval/encryption key is invalid');
  }
}
/** Append-only DB revisions supersede the file input. No process cache or mounted-file writes. */
export function authoritativeRuntime(
  pool: Pool,
  file: IntegrationRuntime,
  installation: ConnectionInstallation | null,
): IntegrationRuntime {
  if (!installation) return file;
  return {
    connections: file.connections,
    resolve: async (companyId) => {
      const row = (
        await pool.query<{ id: string; ciphertext: Buffer; key_version: string }>(
          `SELECT p.id,p.ciphertext,p.key_version FROM integration.connection_revision r JOIN integration.protected_import p ON(p.company_id,p.id)=(r.company_id,r.import_id) WHERE r.company_id=$1 ORDER BY r.revision DESC LIMIT 1`,
          [companyId],
        )
      ).rows[0];
      if (!row) return file.connections.find((c) => c.companyId === companyId);
      const key = installation.keys[row.key_version];
      if (!key) throw Error('INTEGRATION_SECRET_RECOVERY_REQUIRED');
      const c = packageConnection(
        openPackage(row.ciphertext, key, companyId + ':' + row.id + ':' + row.key_version),
      );
      const legacy = file.connections.find((x) => x.companyId === companyId);
      if (legacy)
        for (const [id, secret] of Object.entries(legacy.signingKeys)) {
          if (c.signingKeys[id] && c.signingKeys[id] !== secret)
            throw Error('IMMUTABLE_SIGNING_KEY_ID');
          c.signingKeys[id] = secret;
        }
      const p = openPackage(row.ciphertext, key, companyId + ':' + row.id + ':' + row.key_version);
      const approval = matchingInstallationApproval(installation.approvals, p.metadata);
      if (!approval) throw Error('INSTALLATION_APPROVAL_MISMATCH');
      // Scope/endpoint policy is rechecked even after a process or credential restart.
      // Expired credentials remain recoverable and fail authorization at the client boundary.
      if (
        !validInstallationApproval(approval) ||
        Object.entries(approval).some(
          ([field, value]) => p.metadata[field as keyof typeof p.metadata] !== value,
        ) ||
        p.metadata.issuer !== installation.issuer ||
        p.metadata.callbackUrl !== installation.publicOrigin + '/api/v1/consumer/events'
      )
        throw Error('INSTALLATION_APPROVAL_MISMATCH');
      const old = (
        await pool.query<{ id: string; ciphertext: Buffer; key_version: string }>(
          `SELECT p.id,p.ciphertext,p.key_version FROM integration.connection_revision r JOIN integration.protected_import p ON(p.company_id,p.id)=(r.company_id,r.import_id) WHERE r.company_id=$1 ORDER BY r.revision`,
          [companyId],
        )
      ).rows;
      for (const previous of old) {
        const oldKey = installation.keys[previous.key_version];
        if (!oldKey) throw Error('INTEGRATION_SECRET_RECOVERY_REQUIRED');
        const previousPackage = openPackage(
          previous.ciphertext,
          oldKey,
          companyId + ':' + previous.id + ':' + previous.key_version,
        );
        for (const k of previousPackage.signingKeys) {
          if (c.signingKeys[k.keyId] && c.signingKeys[k.keyId] !== k.secret)
            throw Error('IMMUTABLE_SIGNING_KEY_ID');
          c.signingKeys[k.keyId] = k.secret;
        }
      }
      // The native selector remains immutable when migrating an existing installation.
      const source = (
        await pool.query<{
          selector: string;
          tenant_id: string;
          integration_id: string;
          external_id: string;
          issuer: string;
        }>('SELECT * FROM integration.source WHERE company_id=$1', [companyId])
      ).rows[0];
      if (
        !source ||
        source.tenant_id !== c.tenantId ||
        source.integration_id !== c.integrationId ||
        source.external_id !== c.externalId ||
        source.issuer !== c.issuer
      )
        throw Error('CONNECTION_SCOPE_MISMATCH');
      c.selector = source.selector;
      return c;
    },
  };
}
