import { sourceByCompany, type IntegrationBinding } from '@shahn/database';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import type { ProvisioningStatus } from '@shahn/contracts/tawsel';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { UnitOfWork as Uow } from '../kernel/unit-of-work.js';
import type { IntegrationRuntime } from './config.js';
import { TawselClient, SourceFailure } from './tawsel-client.js';
import { recordProvisioningStatus } from './source-command.service.js';
import { requireNative } from './provisioning.service.js';
export interface IntegrationFilter {
  entity: string;
  state: string;
  from: string | null;
  to: string | null;
  page: number;
}
const visibleBinding = (parameter: string) => `(b.id IS NULL OR b.entity IN ('source','role')
 OR (b.entity='branch' AND b.native_id=ANY(${parameter}::uuid[]))
 OR (b.entity='driver' AND EXISTS(SELECT 1 FROM employees.operational_driver d WHERE d.company_id=b.company_id AND d.id=b.native_id AND d.branch_id=ANY(${parameter}::uuid[])))
 OR (b.entity='user' AND NOT EXISTS(SELECT 1 FROM access.user_branch ub WHERE ub.company_id=b.company_id AND ub.user_id=b.native_id AND NOT ub.branch_id=ANY(${parameter}::uuid[]))))`;
export async function integrationStatus(
  u: UnitOfWork,
  runtime: IntegrationRuntime,
  filter: IntegrationFilter,
) {
  const source = await sourceByCompany(u.client, u.access.companyId);
  const connections = runtime.connections
    .filter((c) => c.companyId === u.access.companyId)
    .map((c) => ({ selector: c.selector, baseUrl: c.baseUrl, issuer: c.issuer }));
  const catalog = await integrationCatalog(u);
  if (!source)
    return {
      source: null,
      connections,
      catalog,
      bindings: [],
      commands: [],
      events: [],
      checkpoints: [],
      keys: [],
      page: filter.page,
    };
  const params = [
    u.access.companyId,
    source.id,
    filter.entity,
    filter.state,
    filter.from,
    filter.to,
    (filter.page - 1) * 25,
    u.access.assignedBranches.map((b) => b.id),
  ];
  const commands = (
    await u.client.query(
      `SELECT c.action_id AS "actionId",c.operation_id AS "operationId",c.state,c.source_revision::text AS "sourceRevision",c.last_error AS "lastError",c.created_at AS "createdAt",c.authority,
    b.entity,b.native_id AS "nativeId",b.version,b.accepted_revision::text AS "acceptedRevision",w.attempts,w.lease_until AS "leaseUntil"
    FROM integration.source_command c JOIN work_item w ON w.id=c.work_id LEFT JOIN integration.binding b ON b.company_id=c.company_id AND b.id=c.binding_id
    WHERE c.company_id=$1 AND c.source_id=$2 AND ($3='all' OR b.entity=$3 OR ($3='source' AND b.id IS NULL)) AND ($4='all' OR c.state=$4)
    AND ${visibleBinding('$8')}
    AND ($5::timestamptz IS NULL OR c.created_at>=$5::timestamptz) AND ($6::timestamptz IS NULL OR c.created_at<$6::timestamptz)
    ORDER BY c.created_at DESC,c.action_id LIMIT 25 OFFSET $7`,
      params,
    )
  ).rows;
  const events = (
    await u.client.query(
      `SELECT event_id AS "eventId",event_type AS "eventType",aggregate_type AS "aggregateType",aggregate_id AS "aggregateId",recipient_sequence::text AS sequence,application_state AS "applicationState",pending_reason AS "pendingReason",received_at AS "receivedAt" FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND ($3='all' OR application_state=$3) AND ($4::timestamptz IS NULL OR received_at>=$4::timestamptz) AND ($5::timestamptz IS NULL OR received_at<$5::timestamptz) AND ($7='all' OR (event_type='provisioning.changed' AND envelope->'payload'->>'entity'=$7)) ORDER BY received_at DESC,event_id LIMIT 25 OFFSET $6`,
      [params[0], params[1], filter.state, filter.from, filter.to, params[6], filter.entity],
    )
  ).rows;
  const bindings = (
    await u.client.query(
      `SELECT entity,native_id AS "nativeId",external_id AS "externalId",resource_id AS "resourceId",version,submitted_revision::text AS "submittedRevision",accepted_revision::text AS "acceptedRevision",issuer_status AS "issuerStatus",enabled,checked_at AS "checkedAt" FROM integration.binding b WHERE company_id=$1 AND source_id=$2 AND ${visibleBinding('$3')} ORDER BY entity,external_id LIMIT 100`,
      [params[0], params[1], params[7]],
    )
  ).rows;
  const checkpoints = (
    await u.client.query(
      `SELECT aggregate_type AS "aggregateType",aggregate_id AS "aggregateId",received_through::text AS "receivedThrough",received_high::text AS "receivedHigh",applied_through::text AS "appliedThrough",history_complete AS "historyComplete" FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 ORDER BY updated_at DESC LIMIT 100`,
      params.slice(0, 2),
    )
  ).rows;
  const keys = (
    await u.client.query(
      'SELECT key_id AS "keyId",active_from AS "activeFrom",verify_until AS "verifyUntil" FROM integration.verification_key WHERE company_id=$1 AND source_id=$2',
      params.slice(0, 2),
    )
  ).rows;
  return {
    source: {
      id: source.id,
      tenantId: source.tenant_id,
      integrationId: source.integration_id,
      baseUrl: source.base_url,
      issuer: source.issuer,
      enabled: source.enabled,
      configuration: source.configuration,
      lastError: source.last_error,
    },
    connections,
    catalog,
    bindings,
    commands,
    events,
    checkpoints,
    keys,
    page: filter.page,
  };
}
export async function integrationCatalog(u: UnitOfWork) {
  const c = u.access.companyId;
  const branches = (
    await u.client.query(
      'SELECT id,name,active FROM access.branch WHERE company_id=$1 AND id=ANY($2::uuid[]) ORDER BY name',
      [c, u.access.assignedBranches.map((b) => b.id)],
    )
  ).rows;
  const roles = (
    await u.client.query(
      'SELECT id,name,active FROM access.role WHERE company_id=$1 ORDER BY name',
      [c],
    )
  ).rows;
  const users = (
    await u.client.query(
      `SELECT u.id,u.name,u.active,u.role_id AS "roleId",i.subject,i.issuer,ARRAY(SELECT branch_id FROM access.user_branch b WHERE b.company_id=u.company_id AND b.user_id=u.id ORDER BY branch_id) AS "branchIds" FROM access.ordinary_user u LEFT JOIN access.issuer_binding i ON i.principal_id=u.id WHERE u.company_id=$1 AND NOT EXISTS(SELECT 1 FROM access.user_branch b WHERE b.company_id=u.company_id AND b.user_id=u.id AND NOT b.branch_id=ANY($2::uuid[])) ORDER BY u.name`,
      [c, u.access.assignedBranches.map((b) => b.id)],
    )
  ).rows;
  const drivers = (
    await u.client.query(
      'SELECT id,name,active,branch_id AS "branchId" FROM employees.operational_driver WHERE company_id=$1 AND branch_id=ANY($2::uuid[]) ORDER BY name',
      [c, u.access.assignedBranches.map((b) => b.id)],
    )
  ).rows;
  return { branches, roles, users, drivers };
}
export async function integrationDetail(u: UnitOfWork, id: string, kind: 'commands' | 'events') {
  if (kind === 'events') {
    const row = (
      await u.client.query(
        `SELECT event_id AS "eventId",event_type AS "eventType",aggregate_type AS "aggregateType",aggregate_id AS "aggregateId",recipient_sequence::text AS sequence,body_hash AS "bodyHash",application_state AS "applicationState",pending_reason AS "pendingReason",received_at AS "receivedAt",applied_at AS "appliedAt",key_id AS "keyId" FROM integration.inbox WHERE company_id=$1 AND event_id=$2`,
        [u.access.companyId, id],
      )
    ).rows[0];
    if (!row) throw new AccessError('NOT_FOUND', 404);
    return row;
  }
  const row = (
    await u.client.query(
      `SELECT c.action_id AS "actionId",r.command_id AS "commandId",c.operation_id AS "operationId",c.state,c.authority,c.request_hash AS "requestHash",c.source_revision::text AS "sourceRevision",c.last_error AS "lastError",c.http_status AS "httpStatus",c.created_at AS "createdAt",b.entity,b.native_id AS "nativeId",b.accepted_revision::text AS "acceptedRevision",w.attempts,c.remote_result->>'retention' AS retention,c.remote_result->'receipt'->>'receiptId' AS "receiptId" FROM integration.source_command c JOIN command_record r ON r.company_id=c.company_id AND r.id=c.command_record_id JOIN work_item w ON w.id=c.work_id LEFT JOIN integration.binding b ON b.company_id=c.company_id AND b.id=c.binding_id WHERE c.company_id=$1 AND c.action_id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  if (row.entity) await requireNative(u, row.entity, row.nativeId);
  return row;
}
export async function refreshIntegration(
  pool: Pool,
  token: string,
  companyId: string,
  runtime: IntegrationRuntime,
) {
  const source = await Uow.run(pool, token, companyId, 'integration', (u) =>
    sourceByCompany(u.client, companyId),
  );
  if (!source) throw new AccessError('CONNECTION_REQUIRED', 409);
  const c = runtime.connections.find(
    (c) =>
      c.companyId === companyId &&
      c.selector === source.selector &&
      c.tenantId === source.tenant_id &&
      c.integrationId === source.integration_id &&
      c.baseUrl === source.base_url &&
      c.issuer === source.issuer,
  );
  if (!c) throw new AccessError('CONNECTION_CONFIGURATION_REQUIRED', 409);
  const client = new TawselClient(c);
  try {
    const configuration = await client.configuration();
    const bindings = await Uow.run(
      pool,
      token,
      companyId,
      'integration',
      async (u) =>
        (
          await u.client.query<IntegrationBinding>(
            `SELECT * FROM integration.binding b WHERE company_id=$1 AND source_id=$2 AND ${visibleBinding('$3')} ORDER BY checked_at NULLS FIRST LIMIT 20`,
            [companyId, source.id, u.access.assignedBranches.map((b) => b.id)],
          )
        ).rows,
    );
    const statuses: ProvisioningStatus[] = [];
    for (const b of bindings)
      try {
        statuses.push(await client.status(b.entity, b.external_id));
      } catch {
        /* Each missing status remains pending and keeps previous authoritative evidence. */
      }
    await Uow.run(pool, token, companyId, 'integration', async (u) => {
      await u.client.query(
        'UPDATE integration.source SET configuration=$1,configuration_checked_at=clock_timestamp(),last_error=NULL WHERE company_id=$2 AND id=$3',
        [JSON.stringify(configuration), companyId, source.id],
      );
      for (const status of statuses) await recordProvisioningStatus(u.client, source, status);
    });
    return { state: 'refreshed', identities: statuses.length };
  } catch (error) {
    const code = error instanceof SourceFailure ? error.code : 'CONNECTION_UNAVAILABLE';
    await Uow.run(pool, token, companyId, 'integration', async (u) => {
      await u.client.query(
        'UPDATE integration.source SET last_error=$1 WHERE company_id=$2 AND id=$3',
        [code, companyId, source.id],
      );
    });
    throw new AccessError(code, 503);
  }
}
