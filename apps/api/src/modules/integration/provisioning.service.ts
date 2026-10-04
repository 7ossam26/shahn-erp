import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { sourceByCompany, type IntegrationSource, type IntegrationBinding } from '@shahn/database';
import { AccessError } from '@shahn/domain';
import { validateIntegrationCommand, type IntegrationCommand } from '@shahn/contracts';
import {
  validateProvisioningCommand,
  validateDeliveryCommand,
  provisioningOperations,
  type ProvisioningOperation,
  type SourceEnvelope,
  type BindingKind,
} from '@shahn/contracts/tawsel';
import { canonical, digest } from '../access/crypto.js';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { DurableWork } from '../kernel/work.js';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import type { IntegrationRuntime } from './config.js';
import { callbackShape } from './callback-policy.js';
export const sourceWorkRegistry = [{ kind: 'integration.source', lane: 'source' as const }];
const nativeTables = {
  branch: 'access.branch',
  role: 'access.role',
  user: 'access.ordinary_user',
  driver: 'employees.operational_driver',
} as const;
export async function requireNative(u: UnitOfWork, entity: BindingKind, id: string) {
  if (entity === 'source') {
    if (id !== u.access.companyId) throw new AccessError('FORBIDDEN_SCOPE');
    return { id, active: true, name: u.access.companyName };
  }
  const row = (
    await u.client.query<Record<string, unknown>>(
      `SELECT * FROM ${nativeTables[entity]} WHERE company_id=$1 AND id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  if (entity === 'branch') u.assertBranch(id);
  if (entity === 'driver') u.assertBranch(String(row.branch_id));
  if (entity === 'user') {
    const branches = (
      await u.client.query<{ branch_id: string }>(
        'SELECT branch_id FROM access.user_branch WHERE company_id=$1 AND user_id=$2',
        [u.access.companyId, id],
      )
    ).rows;
    for (const b of branches) u.assertBranch(b.branch_id);
  }
  return row;
}
async function bindingFor(
  u: UnitOfWork,
  source: IntegrationSource,
  entity: BindingKind,
  id: string,
) {
  await requireNative(u, entity, id);
  const external = entity === 'source' ? source.external_id : `${entity}:${id}`;
  await u.client.query(
    `INSERT INTO integration.binding(company_id,source_id,id,entity,native_id,external_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(company_id,source_id,entity,native_id) DO NOTHING`,
    [u.access.companyId, source.id, randomUUID(), entity, id, external],
  );
  return (
    await u.client.query<IntegrationBinding>(
      'SELECT * FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity=$3 AND native_id=$4 FOR UPDATE',
      [u.access.companyId, source.id, entity, id],
    )
  ).rows[0]!;
}
async function verifyReferences(
  u: UnitOfWork,
  source: IntegrationSource,
  entity: BindingKind,
  nativeId: string,
  operation: string,
  payload: Record<string, unknown>,
) {
  const native = await requireNative(u, entity, nativeId);
  if (operation.endsWith('.disable')) {
    if (entity !== 'source' && native.active) throw new AccessError('NATIVE_DISABLE_REQUIRED', 409);
  } else if (entity !== 'source' && !native.active)
    throw new AccessError('REFERENCE_DISABLED', 409);
  if (payload.name !== undefined && payload.name !== native.name)
    throw new AccessError('NATIVE_REFERENCE_MISMATCH', 409);
  if (payload.enabled !== undefined && payload.enabled !== native.active)
    throw new AccessError('NATIVE_REFERENCE_MISMATCH', 409);
  if (entity === 'user' && payload.subject !== undefined) {
    const row = (
      await u.client.query(
        'SELECT issuer,subject FROM access.issuer_binding WHERE principal_id=$1',
        [nativeId],
      )
    ).rows[0];
    if (!row || row.issuer !== source.issuer || row.subject !== payload.subject)
      throw new AccessError('ISSUER_BINDING_REQUIRED', 409);
  }
  const refs: [BindingKind, string][] = [];
  if (typeof payload.roleExternalId === 'string') refs.push(['role', payload.roleExternalId]);
  if (typeof payload.userExternalId === 'string') refs.push(['user', payload.userExternalId]);
  if (Array.isArray(payload.branchExternalIds))
    for (const id of payload.branchExternalIds) refs.push(['branch', String(id)]);
  for (const [kind, external] of refs) {
    const row = (
      await u.client.query<IntegrationBinding>(
        `SELECT * FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity=$3 AND external_id=$4`,
        [u.access.companyId, source.id, kind, external],
      )
    ).rows[0];
    if (!row || !row.resource_id || Number(row.accepted_revision) === 0 || row.enabled === false)
      throw new AccessError('REFERENCE_NOT_READY', 409);
    const refNative = await requireNative(u, kind, row.native_id);
    if (!refNative.active) throw new AccessError('REFERENCE_DISABLED', 409);
    if (kind === 'user' && row.issuer_status !== 'ready')
      throw new AccessError('ISSUER_NOT_READY', 409);
    if (entity === 'user' && kind === 'role' && row.native_id !== native.role_id)
      throw new AccessError('NATIVE_REFERENCE_MISMATCH', 409);
  }
  if (entity === 'user' && payload.branchExternalIds) {
    const rows = (
      await u.client.query<{ branch_id: string }>(
        'SELECT branch_id FROM access.user_branch WHERE company_id=$1 AND user_id=$2',
        [u.access.companyId, nativeId],
      )
    ).rows;
    const expected = rows.map((x) => 'branch:' + x.branch_id).sort();
    if (canonical(expected) !== canonical([...(payload.branchExternalIds as string[])].sort()))
      throw new AccessError('NATIVE_REFERENCE_MISMATCH', 409);
  }
}
export function provisioningCommands(pool: Pool, runtime: IntegrationRuntime) {
  const work = new DurableWork(pool, sourceWorkRegistry);
  const definitions: CommandDefinition<IntegrationCommand>[] = [
    'integration.setup',
    'integration.queue',
    'integration.retry',
  ].map((kind) => ({
    family: 'integration',
    kind,
    capability: 'integration',
    authorize: async (u, value, recovery) => {
      if (!recovery && !validateIntegrationCommand(value))
        throw new AccessError('VALIDATION_FAILED', 400);
      if (
        typeof value.nativeId === 'string' &&
        'entity' in value &&
        typeof value.entity === 'string'
      )
        await requireNative(u, value.entity as BindingKind, value.nativeId);
      if (recovery && typeof value.actionId === 'string') {
        const row = (
          await u.client.query(
            `SELECT b.entity,b.native_id FROM integration.source_command c LEFT JOIN integration.binding b ON b.company_id=c.company_id AND b.id=c.binding_id WHERE c.company_id=$1 AND c.action_id=$2`,
            [u.access.companyId, value.actionId],
          )
        ).rows[0];
        if (row?.entity) await requireNative(u, row.entity, row.native_id);
      }
    },
    execute: async (u, input, recordId) => {
      u.lockOrder('aggregate', 'integration');
      const company = u.access.companyId;
      if (input.type === 'integration.setup') {
        const c = runtime.connections.find(
          (c) => c.selector === input.selector && c.companyId === company,
        );
        if (!c) throw new AccessError('CONNECTION_CONFIGURATION_REQUIRED', 409);
        const id = randomUUID();
        const inserted = await u.client.query(
          `INSERT INTO integration.source(company_id,id,tenant_id,integration_id,selector,external_id,base_url,issuer) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(company_id) DO NOTHING RETURNING id`,
          [company, id, c.tenantId, c.integrationId, c.selector, c.externalId, c.baseUrl, c.issuer],
        );
        if (!inserted.rowCount) throw new AccessError('CONNECTION_ALREADY_EXISTS', 409);
        if (c.initialKeyId)
          await u.client.query(
            'INSERT INTO integration.verification_key(company_id,source_id,key_id,active_from) VALUES($1,$2,$3,clock_timestamp())',
            [company, id, c.initialKeyId],
          );
        const body = {
          schemaVersion: 1,
          commandId: input.commandId,
          sourceId: id,
          state: 'pending',
          actionId: null,
        };
        return {
          reply: { status: 202, body },
          reference: body,
          entityId: id,
          beforeVersion: null,
          afterVersion: 1,
        };
      }
      const source = await sourceByCompany(u.client, company, true);
      if (!source) throw new AccessError('CONNECTION_REQUIRED', 409);
      if (input.type === 'integration.retry') {
        const row = (
          await u.client.query(
            `SELECT c.*,b.entity,b.native_id FROM integration.source_command c LEFT JOIN integration.binding b ON b.company_id=c.company_id AND b.id=c.binding_id WHERE c.company_id=$1 AND c.action_id=$2 FOR UPDATE OF c`,
            [company, input.actionId],
          )
        ).rows[0];
        if (!row) throw new AccessError('NOT_FOUND', 404);
        if (row.entity) await requireNative(u, row.entity, row.native_id);
        if (['accepted', 'rejected', 'review-required'].includes(row.state))
          throw new AccessError('DEFINITE_RESULT_REQUIRES_REVIEW', 409);
        const changed = await u.client.query(
          `UPDATE work_item SET state='pending',available_at=clock_timestamp(),last_error=NULL WHERE id=$1 AND (state<>'leased' OR lease_until<=clock_timestamp()) RETURNING id`,
          [row.work_id],
        );
        if (!changed.rowCount) throw new AccessError('WORK_IN_PROGRESS', 409);
        await u.client.query(
          `UPDATE integration.source_command SET state='pending',last_error=NULL WHERE company_id=$1 AND action_id=$2`,
          [company, input.actionId],
        );
        const body = {
          schemaVersion: 1,
          commandId: input.commandId,
          sourceId: source.id,
          actionId: input.actionId,
          state: 'pending',
        };
        return {
          reply: { status: 202, body },
          reference: body,
          entityId: input.actionId!,
          beforeVersion: null,
          afterVersion: null,
        };
      }
      if (!source.enabled) throw new AccessError('SOURCE_DISABLED', 409);
      const operation = input.operationId!;
      const mapping = Object.hasOwn(provisioningOperations, operation)
        ? provisioningOperations[operation as ProvisioningOperation]
        : null;
      const binding = mapping ? await bindingFor(u, source, mapping[1], input.nativeId!) : null;
      if (!mapping && input.nativeId !== company) throw new AccessError('FORBIDDEN_SCOPE');
      if (binding && binding.version !== input.expectedVersion)
        throw new AccessError('REVISION_CONFLICT', 409, binding.version);
      if (
        binding &&
        (
          await u.client.query(
            `SELECT 1 FROM integration.source_command WHERE company_id=$1 AND binding_id=$2 AND state NOT IN ('accepted','rejected','review-required')`,
            [company, binding.id],
          )
        ).rowCount
      )
        throw new AccessError('SYNC_REQUIRED', 409);
      if (
        Object.hasOwn(input.payload!, 'externalId') ||
        Object.hasOwn(input.payload!, 'sourceRevision')
      )
        throw new AccessError('VALIDATION_FAILED', 400);
      const revision = binding ? Number(binding.submitted_revision) + 1 : null;
      const envelope: SourceEnvelope = {
        schemaVersion: '1.0.0',
        payloadVersion: '1.0.0',
        actionId: randomUUID(),
        operationId: operation,
        context: {
          kind: 'integration',
          tenantId: source.tenant_id,
          integrationId: source.integration_id,
        },
        resources: {},
        baseVersions: {},
        dependsOnActionIds: [],
        observation: { observedAt: null, clock: { quality: 'unknown' } },
        payload: {
          ...input.payload,
          ...(binding ? { externalId: binding.external_id, sourceRevision: revision } : {}),
        },
      };
      if (!validateProvisioningCommand(envelope) && !validateDeliveryCommand(envelope))
        throw new AccessError('VALIDATION_FAILED', 400);
      if (mapping)
        await verifyReferences(u, source, mapping[1], input.nativeId!, operation, envelope.payload);
      const connection = runtime.connections.find(
        (c) => c.selector === source.selector && c.companyId === company,
      );
      if (operation === 'integration.configureWebhook')
        try {
          callbackShape(String(envelope.payload.url), connection?.allowedCallbackUrls ?? []);
        } catch {
          throw new AccessError('CALLBACK_NOT_ALLOWLISTED', 409);
        }
      if (operation === 'integration.rotateSigningKey') {
        const key = String(envelope.payload.keyId);
        if (!connection?.signingKeys[key])
          throw new AccessError('SIGNING_KEY_NOT_PROVISIONED', 409);
        // The sender can activate before the HTTP response returns. Accept the selected preprovisioned key first.
        await u.client.query(
          `INSERT INTO integration.verification_key(company_id,source_id,key_id,active_from) VALUES($1,$2,$3,clock_timestamp()) ON CONFLICT DO NOTHING`,
          [company, source.id, key],
        );
      }
      if (binding)
        await u.client.query(
          'UPDATE integration.binding SET version=version+1,submitted_revision=$1 WHERE company_id=$2 AND id=$3',
          [revision, company, binding.id],
        );
      const workId = await work.enqueue(u.client, {
        companyId: company,
        principalId: u.access.principalId,
        commandRecordId: recordId,
        entityId: envelope.actionId,
        entityVersion: 1,
        kind: 'integration.source',
        sourceIdentity: envelope.actionId,
        payload: { sourceId: source.id, actionId: envelope.actionId },
      });
      const bodyText = canonical(envelope);
      const authority =
        operation === 'integration.bindSource' ||
        (operation === 'integration.rotateCredential' && envelope.payload.recover === true)
          ? 'operator'
          : 'service';
      await u.client.query(
        `INSERT INTO integration.source_command(company_id,source_id,action_id,command_record_id,binding_id,operation_id,source_revision,request_body,request_hash,work_id,authority) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          company,
          source.id,
          envelope.actionId,
          recordId,
          binding?.id ?? null,
          operation,
          revision,
          bodyText,
          digest(bodyText),
          workId,
          authority,
        ],
      );
      const body = {
        schemaVersion: 1,
        commandId: input.commandId,
        sourceId: source.id,
        actionId: envelope.actionId,
        state: 'pending',
      };
      return {
        reply: { status: 202, body },
        reference: { ...body, nativeId: input.nativeId, entity: binding?.entity ?? 'source' },
        entityId: envelope.actionId,
        beforeVersion: binding?.version ?? null,
        afterVersion: binding ? binding.version + 1 : null,
      };
    },
    resolve: async (_u, reference) => ({
      schemaVersion: reference.schemaVersion,
      commandId: reference.commandId,
      sourceId: reference.sourceId,
      actionId: reference.actionId,
      state: reference.state,
    }),
    rejectionReference: async (input, u) => ({
      entityId: input.nativeId ?? input.actionId ?? u.access.companyId,
      branchId: u.access.companyId,
    }),
  }));
  return new CommandService(pool, definitions);
}
