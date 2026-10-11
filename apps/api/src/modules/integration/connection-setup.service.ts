import { createHmac, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import { sourceByCompany } from '@shahn/database';
import { tawselUuid } from '@shahn/contracts/tawsel';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { CommandService, type CommandDefinition, type CommandInput } from '../kernel/commands.js';
import { appendAudit } from '../access/repository.js';
import { type ConnectionInstallation } from './connection-provider.js';
import {
  openPackage,
  sealPackage,
  validatePackageApproval,
  validateRemotePackage,
  packageConnection,
  matchingInstallationApproval,
  validatePrivatePackage,
  type PrivateConnectionPackage,
} from './connection-package.js';
import { TawselClient } from './tawsel-client.js';
import { recordProvisioningStatus } from './source-command.service.js';
import { requireConnectionAuthority } from './setup-authority.js';
import { integrationRuntime, type IntegrationRuntime } from './config.js';
export { requireConnectionAuthority } from './setup-authority.js';

interface ImportRow {
  id: string;
  principal_id: string;
  key_version: string;
  ciphertext: Buffer;
  metadata: PrivateConnectionPackage['metadata'];
  credential_expires_at: Date;
  configuration: unknown;
  source_status: unknown;
}
export interface ConfirmConnection extends CommandInput {
  type: 'integration.confirmConnection';
  importId: string;
}
export class ConnectionSetup {
  constructor(
    readonly pool: Pool,
    readonly installation: ConnectionInstallation,
    readonly clientFor = (p: PrivateConnectionPackage) => new TawselClient(packageConnection(p)),
    readonly legacy: IntegrationRuntime = integrationRuntime(),
  ) {}
  async read(token: string, company: string, id: string) {
    return UnitOfWork.run(this.pool, token, company, 'integration', async (u) => {
      requireConnectionAuthority(u);
      const row = (
        await u.client.query<ImportRow>(
          `SELECT p.*,v.configuration,v.source_status FROM integration.protected_import p LEFT JOIN integration.import_verification v ON(v.company_id,v.import_id)=(p.company_id,p.id) WHERE p.company_id=$1 AND p.id=$2`,
          [company, id],
        )
      ).rows[0];
      if (!row) throw new AccessError('NOT_FOUND', 404);
      return row;
    });
  }
  async import(token: string, company: string, id: string, origin: string, value: unknown) {
    if (!tawselUuid(company) || !tawselUuid(id)) throw new AccessError('VALIDATION_FAILED', 400);
    await UnitOfWork.run(this.pool, token, company, 'integration', async (u) => {
      requireConnectionAuthority(u);
      const approval = this.installation.approvals.find(
        (a) => a.erpCompanyId === company && a.apiUrl === origin,
      );
      if (!approval || origin !== approval.apiUrl)
        throw new AccessError('INSTALLATION_APPROVAL_REQUIRED', 409);
      let p: PrivateConnectionPackage;
      try {
        const exact = validatePrivatePackage(value)
          ? matchingInstallationApproval(this.installation.approvals, value.metadata)
          : undefined;
        p = validatePackageApproval(
          value,
          exact ?? approval,
          company,
          this.installation.publicOrigin,
          this.installation.issuer,
        );
      } catch {
        throw new AccessError('PRIVATE_PACKAGE_VALIDATION_FAILED', 400);
      }
      const companyCode = (
        await u.client.query<{ code: string }>('SELECT code FROM access.company WHERE id=$1', [
          company,
        ])
      ).rows[0]?.code;
      // Native login codes are lowercase; publisher company codes are uppercase.
      // Compare the lossless case mapping, never truncate or alter company identity.
      if (companyCode?.toUpperCase() !== p.metadata.companyCode)
        throw new AccessError('PACKAGE_COMPANY_MISMATCH', 400);
      const source = await sourceByCompany(u.client, company, true);
      if (
        source &&
        (source.tenant_id !== p.metadata.tenantId ||
          source.integration_id !== p.metadata.integrationId ||
          source.external_id !== p.metadata.sourceExternalId ||
          source.issuer !== p.metadata.issuer)
      )
        throw new AccessError('IMMUTABLE_SOURCE_SCOPE_MISMATCH', 409);
      const version = this.installation.currentKeyVersion,
        key = this.installation.keys[version]!;
      const fingerprint = createHmac('sha256', key).update(JSON.stringify(p)).digest('hex');
      const inserted = await u.client.query(
        `INSERT INTO integration.protected_import(company_id,id,principal_id,key_version,ciphertext,fingerprint,metadata,credential_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,
        [
          company,
          id,
          u.access.principalId,
          version,
          sealPackage(p, key, company + ':' + id + ':' + version),
          fingerprint,
          JSON.stringify(p.metadata),
          p.credential.expiresAt,
        ],
      );
      if (!inserted.rowCount) {
        const prior = (
          await u.client.query<{ ciphertext: Buffer; key_version: string }>(
            'SELECT ciphertext,key_version FROM integration.protected_import WHERE company_id=$1 AND id=$2',
            [company, id],
          )
        ).rows[0]!;
        const priorKey = this.installation.keys[prior.key_version];
        if (
          !priorKey ||
          JSON.stringify(
            openPackage(prior.ciphertext, priorKey, company + ':' + id + ':' + prior.key_version),
          ) !== JSON.stringify(p)
        )
          throw new AccessError('IMPORT_IDENTITY_CONFLICT', 409);
      } else
        await appendAudit(
          u.client,
          u.access,
          company,
          'integration.secretImported',
          id,
          null,
          null,
          null,
          { importId: id, metadata: p.metadata, keyVersion: version },
        );
    });
    return this.safe(await this.read(token, company, id));
  }
  safe(row: ImportRow) {
    return {
      importId: row.id,
      metadata: row.metadata,
      credentialExpiresAt: row.credential_expires_at.toISOString(),
      state: row.configuration ? 'source-verified' : 'imported-awaiting-verification',
      signing: 'awaiting-signed-callback',
    };
  }
  async verify(token: string, company: string, id: string) {
    const row = await this.read(token, company, id);
    const key = this.installation.keys[row.key_version];
    if (!key) throw new AccessError('INTEGRATION_SECRET_RECOVERY_REQUIRED', 503);
    const p = openPackage(row.ciphertext, key, company + ':' + id + ':' + row.key_version);
    const approval = matchingInstallationApproval(this.installation.approvals, p.metadata);
    if (!approval) throw new AccessError('INSTALLATION_APPROVAL_REQUIRED', 409);
    // Revalidate protected policy on recovery, before attaching any credential.
    validatePackageApproval(
      p,
      approval,
      company,
      this.installation.publicOrigin,
      this.installation.issuer,
    );
    const client = this.clientFor(p);
    const configuration = await client.configuration(),
      status = await client.status('source', p.metadata.sourceExternalId);
    validateRemotePackage(p, configuration, status);
    if (row.configuration) {
      // JSONB changes order; compare structural values, preserving the original evidence.
      const same = await this.pool.query(
        `SELECT 1 FROM integration.import_verification WHERE company_id=$1 AND import_id=$2 AND source_status=$3::jsonb AND configuration=$4::jsonb`,
        [company, id, JSON.stringify(status), JSON.stringify(configuration)],
      );
      if (!same.rowCount) throw new AccessError('REMOTE_SETUP_CHANGED_REIMPORT_REQUIRED', 409);
    }
    await UnitOfWork.run(this.pool, token, company, 'integration', async (u) => {
      requireConnectionAuthority(u);
      await u.client.query(
        `INSERT INTO integration.import_verification(company_id,import_id,configuration,source_status) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [company, id, JSON.stringify(configuration), JSON.stringify(status)],
      );
      await appendAudit(
        u.client,
        u.access,
        company,
        'integration.sourceVerified',
        id,
        null,
        null,
        null,
        {
          importId: id,
          sourceRevision: status.sourceRevision,
          remoteActionId: status.lastActionId,
        },
      );
    });
    return this.safe(await this.read(token, company, id));
  }
  async confirm(token: string, input: ConfirmConnection) {
    // Recover committed results before contacting a possibly rotated/expired remote.
    // Unexecuted confirmations perform fresh canonical reads outside the native transaction.
    const retained = await UnitOfWork.run(
      this.pool,
      token,
      input.companyId,
      'integration',
      async (u) => {
        requireConnectionAuthority(u);
        if (
          input.schemaVersion !== 1 ||
          input.type !== 'integration.confirmConnection' ||
          !tawselUuid(input.commandId) ||
          !tawselUuid(input.importId) ||
          Object.keys(input).sort().join(',') !== 'commandId,companyId,importId,schemaVersion,type'
        )
          throw new AccessError('VALIDATION_FAILED', 400);
        return Boolean(
          (
            await u.client.query(
              "SELECT 1 FROM command_record WHERE company_id=$1 AND principal_id=$2 AND family='connection' AND command_id=$3",
              [input.companyId, u.access.principalId, input.commandId],
            )
          ).rowCount,
        );
      },
    );
    if (!retained) await this.verify(token, input.companyId, input.importId);
    return this.commands().execute(token, input);
  }
  commands() {
    const definition: CommandDefinition<ConfirmConnection> = {
      family: 'connection',
      kind: 'integration.confirmConnection',
      capability: 'integration',
      authorize: async (u, input, recovery) => {
        requireConnectionAuthority(u);
        if (
          !tawselUuid(input.importId) ||
          (!recovery &&
            (input.schemaVersion !== 1 ||
              !tawselUuid(input.commandId) ||
              Object.keys(input).sort().join(',') !==
                'commandId,companyId,importId,schemaVersion,type'))
        )
          throw new AccessError('VALIDATION_FAILED', 400);
      },
      execute: async (u, input, recordId) => {
        const company = u.access.companyId;
        const row = (
          await u.client.query<ImportRow>(
            `SELECT p.*,v.configuration,v.source_status FROM integration.protected_import p JOIN integration.import_verification v ON(v.company_id,v.import_id)=(p.company_id,p.id) WHERE p.company_id=$1 AND p.id=$2`,
            [company, input.importId],
          )
        ).rows[0];
        if (!row) throw new AccessError('SOURCE_VERIFICATION_REQUIRED', 409);
        const key = this.installation.keys[row.key_version];
        if (!key) throw new AccessError('INTEGRATION_SECRET_RECOVERY_REQUIRED', 503);
        const p = openPackage(row.ciphertext, key, company + ':' + row.id + ':' + row.key_version);
        const approval = matchingInstallationApproval(this.installation.approvals, p.metadata);
        if (!approval) throw new AccessError('INSTALLATION_APPROVAL_REQUIRED', 409);
        validatePackageApproval(
          p,
          approval,
          company,
          this.installation.publicOrigin,
          this.installation.issuer,
        );
        const already = await u.client.query(
          'SELECT 1 FROM integration.connection_revision WHERE company_id=$1 AND import_id=$2',
          [company, input.importId],
        );
        if (already.rowCount) throw new AccessError('ORIGINAL_CONNECTION_INTENT_REQUIRED', 409);
        const m = row.metadata,
          status = row.source_status as {
            sourceRevision: number;
            lastActionId: string;
            resourceId: string;
            issuerStatus: string;
            enabled: boolean;
          };
        let source = await sourceByCompany(u.client, company, true);
        if (!source) {
          const id = randomUUID();
          await u.client.query(
            `INSERT INTO integration.source(company_id,id,tenant_id,integration_id,selector,external_id,base_url,issuer,configuration,configuration_checked_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp())`,
            [
              company,
              id,
              m.tenantId,
              m.integrationId,
              'import-' + company,
              m.sourceExternalId,
              m.apiUrl,
              m.issuer,
              JSON.stringify(row.configuration),
            ],
          );
          source = (await sourceByCompany(u.client, company, true))!;
        }
        if (
          source.tenant_id !== m.tenantId ||
          source.integration_id !== m.integrationId ||
          source.external_id !== m.sourceExternalId ||
          source.issuer !== m.issuer
        )
          throw new AccessError('IMMUTABLE_SOURCE_SCOPE_MISMATCH', 409);
        await u.client.query(
          'UPDATE integration.source SET configuration=$1,configuration_checked_at=clock_timestamp(),last_error=NULL WHERE company_id=$2 AND id=$3',
          [JSON.stringify(row.configuration), company, source.id],
        );
        const unresolved = await u.client.query(
          `SELECT 1 FROM integration.source_command WHERE company_id=$1 AND source_id=$2 AND binding_id IN(SELECT id FROM integration.binding WHERE company_id=$1 AND entity='source') AND state NOT IN('accepted','rejected','review-required') LIMIT 1`,
          [company, source.id],
        );
        if (unresolved.rowCount) throw new AccessError('SOURCE_INTENT_RECOVERY_REQUIRED', 409);
        const oldKeys = (
          await u.client.query<{ key_id: string; verify_until: Date | null }>(
            'SELECT key_id,verify_until FROM integration.verification_key WHERE company_id=$1 AND source_id=$2',
            [company, source.id],
          )
        ).rows;
        const file = this.legacy.connections.find((c) => c.companyId === company);
        if (file) {
          if (
            file.selector !== source.selector ||
            file.tenantId !== source.tenant_id ||
            file.integrationId !== source.integration_id ||
            file.externalId !== source.external_id ||
            file.issuer !== source.issuer
          )
            throw new AccessError('IMMUTABLE_SOURCE_SCOPE_MISMATCH', 409);
          for (const [keyId, secret] of Object.entries(file.signingKeys)) {
            const replacement = p.signingKeys.find((k) => k.keyId === keyId);
            if (!replacement) throw new AccessError('LEGACY_SIGNING_KEYS_REQUIRED', 409);
            if (replacement.secret !== secret)
              throw new AccessError('IMMUTABLE_SIGNING_KEY_ID', 409);
          }
        }
        const anchor = (
          await u.client.query<{ accepted_revision: string; last_action_id: string | null }>(
            "SELECT accepted_revision,last_action_id FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='source'",
            [company, source.id],
          )
        ).rows[0];
        if (
          anchor &&
          (Number(anchor.accepted_revision) > status.sourceRevision ||
            (Number(anchor.accepted_revision) === status.sourceRevision &&
              anchor.last_action_id !== status.lastActionId))
        )
          throw new AccessError('REMOTE_SETUP_IDENTITY_MISMATCH', 409);
        for (const old of oldKeys) {
          const replacement = p.signingKeys.find((k) => k.keyId === old.key_id);
          if (!replacement && (!old.verify_until || old.verify_until.getTime() > Date.now()))
            throw new AccessError('OLD_SIGNING_OVERLAP_REQUIRED', 409);
          if (replacement && old.key_id !== p.signingKeys.at(-1)!.keyId && !replacement.verifyUntil)
            throw new AccessError('OLD_SIGNING_OVERLAP_REQUIRED', 409);
          if (
            replacement &&
            old.verify_until &&
            (!replacement.verifyUntil ||
              Date.parse(replacement.verifyUntil) > old.verify_until.getTime())
          )
            throw new AccessError('SIGNING_OVERLAP_EXTENSION_REQUIRES_REVIEW', 409);
        }
        const earlier = (
          await u.client.query<{ id: string; ciphertext: Buffer; key_version: string }>(
            `SELECT p.* FROM integration.connection_revision r JOIN integration.protected_import p ON(p.company_id,p.id)=(r.company_id,r.import_id) WHERE r.company_id=$1`,
            [company],
          )
        ).rows;
        for (const prior of earlier) {
          const oldKey = this.installation.keys[prior.key_version];
          if (!oldKey) throw new AccessError('INTEGRATION_SECRET_RECOVERY_REQUIRED', 503);
          for (const previous of openPackage(
            prior.ciphertext,
            oldKey,
            company + ':' + prior.id + ':' + prior.key_version,
          ).signingKeys) {
            const replacement = p.signingKeys.find((k) => k.keyId === previous.keyId);
            if (replacement && replacement.secret !== previous.secret)
              throw new AccessError('IMMUTABLE_SIGNING_KEY_ID', 409);
          }
        }
        const revision =
          Number(
            (
              await u.client.query<{ revision: number }>(
                `SELECT max(revision) AS revision FROM integration.connection_revision WHERE company_id=$1 AND source_id=$2`,
                [company, source.id],
              )
            ).rows[0]?.revision ?? 0,
          ) + 1;
        await u.client.query(
          `INSERT INTO integration.connection_revision(company_id,source_id,revision,import_id,command_record_id) VALUES($1,$2,$3,$4,$5)`,
          [company, source.id, revision, input.importId, recordId],
        );
        await u.client.query(
          `INSERT INTO integration.binding(company_id,source_id,id,entity,native_id,external_id,submitted_revision,accepted_revision,resource_id,issuer_status,last_action_id,enabled,evidence,checked_at) VALUES($1,$2,$3,'source',$1,$4,$5,$5,$6,$7,$8,$9,$10,clock_timestamp()) ON CONFLICT(company_id,source_id,entity,native_id) DO NOTHING`,
          [
            company,
            source.id,
            randomUUID(),
            m.sourceExternalId,
            status.sourceRevision,
            status.resourceId,
            status.issuerStatus,
            status.lastActionId,
            status.enabled,
            JSON.stringify(row.source_status),
          ],
        );
        await recordProvisioningStatus(
          u.client,
          source,
          row.source_status as Parameters<typeof recordProvisioningStatus>[2],
        );
        for (const k of p.signingKeys)
          await u.client.query(
            `INSERT INTO integration.verification_key(company_id,source_id,key_id,active_from,verify_until) VALUES($1,$2,$3,'1970-01-01',$4) ON CONFLICT(company_id,source_id,key_id) DO UPDATE SET verify_until=EXCLUDED.verify_until`,
            [company, source.id, k.keyId, k.verifyUntil ?? null],
          );
        // No accepted source command is invented. Remote status/action is retained as evidence.
        const body = {
          importId: input.importId,
          commandId: input.commandId,
          sourceId: source.id,
          configurationRevision: revision,
          state: 'connected-awaiting-signed-callback',
        };
        return {
          reply: { status: 200, body },
          reference: body,
          entityId: source.id,
          beforeVersion: revision - 1,
          afterVersion: revision,
        };
      },
      resolve: async (_u, reference) => reference,
      rejectionReference: async (input, u) => ({
        entityId: input.importId,
        branchId: u.access.companyId,
      }),
    };
    return new CommandService(this.pool, [definition]);
  }
}
