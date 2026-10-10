import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { sourceByCompany } from '@shahn/database';
import { AccessError } from '@shahn/domain';
import {
  tawselValidator,
  tawselUuid,
  validateActionResult,
  type ActionResult,
} from '@shahn/contracts/tawsel';
import { CommandService, type CommandDefinition, type CommandInput } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { appendAudit } from '../access/repository.js';
import { requireConnectionAuthority } from './setup-authority.js';
import { connectionFor, type IntegrationRuntime } from './config.js';
import { TawselClient } from './tawsel-client.js';
import { recordProvisioningStatus } from './source-command.service.js';
export interface EnrollmentRequest {
  requestVersion: '1.0.0';
  state: 'pending-operator-reservation';
  tenantId: string;
  integrationId: string;
  erpCompanyId: string;
  issuer: string;
  subject: string;
  erpPrincipalId: string;
  erpCorrelationId: string;
}
const validRequest = tawselValidator<EnrollmentRequest>(
  'connection-package.schema.json#/$defs/EnrollmentRequest',
);
interface Prepare extends CommandInput {
  type: 'integration.requestEnrollment';
  principalIds: string[];
}
export function enrollmentCommands(pool: Pool) {
  const definition: CommandDefinition<Prepare> = {
    family: 'enrollment',
    kind: 'integration.requestEnrollment',
    capability: 'integration',
    authorize: async (u, input, recovery) => {
      requireConnectionAuthority(u);
      if (
        !recovery &&
        (Object.keys(input).sort().join(',') !==
          'commandId,companyId,principalIds,schemaVersion,type' ||
          input.schemaVersion !== 1 ||
          !tawselUuid(input.commandId) ||
          !Array.isArray(input.principalIds) ||
          input.principalIds.length < 1 ||
          input.principalIds.length > 100 ||
          input.principalIds.some((x) => !tawselUuid(x)) ||
          new Set(input.principalIds).size !== input.principalIds.length)
      )
        throw new AccessError('VALIDATION_FAILED', 400);
    },
    execute: async (u, input, record) => {
      const source = await sourceByCompany(u.client, u.access.companyId, true);
      if (!source) throw new AccessError('SOURCE_NOT_READY', 409);
      const users = (
        await u.client.query<{
          id: string;
          correlation_id: string;
          subject: string;
          issuer: string;
        }>(
          `SELECT u.id,u.correlation_id,b.subject,b.issuer FROM access.ordinary_user u JOIN access.issuer_binding b ON b.principal_id=u.id WHERE u.company_id=$1 AND u.id=ANY($2::uuid[]) AND u.active AND u.identity_state='ready'`,
          [u.access.companyId, input.principalIds],
        )
      ).rows;
      if (users.length !== input.principalIds.length)
        throw new AccessError('ISSUER_BINDING_REQUIRED', 409);
      const requests = users.map((x) => ({
        requestVersion: '1.0.0' as const,
        state: 'pending-operator-reservation' as const,
        tenantId: source.tenant_id,
        integrationId: source.integration_id,
        erpCompanyId: source.company_id,
        issuer: source.issuer,
        subject: x.subject,
        erpPrincipalId: x.id,
        erpCorrelationId: x.correlation_id,
      }));
      if (users.some((x) => x.issuer !== source.issuer) || requests.some((x) => !validRequest(x)))
        throw new AccessError('ISSUER_BINDING_REQUIRED', 409);
      const id = randomUUID();
      await u.client.query(
        'INSERT INTO integration.enrollment_request(company_id,id,source_id,command_record_id,requests) VALUES($1,$2,$3,$4,$5)',
        [u.access.companyId, id, source.id, record, JSON.stringify(requests)],
      );
      const body = { requestId: id, state: 'awaiting-tawsel-identity-authorization', requests };
      return {
        reply: { status: 200, body },
        reference: body,
        entityId: id,
        beforeVersion: null,
        afterVersion: 1,
      };
    },
    resolve: async (_u, reference) => reference,
    rejectionReference: async (input, u) => ({
      entityId: input.commandId,
      branchId: u.access.companyId,
    }),
  };
  return new CommandService(pool, [definition]);
}
/** An operator result is evidence, never a local grant. Actual user.provision and
 * issuer reconciliation must still accept the exact subject before driver use. */
export async function recordEnrollmentOperatorResult(
  pool: Pool,
  runtime: IntegrationRuntime,
  token: string,
  company: string,
  requestId: string,
  value: unknown,
) {
  if (
    !tawselUuid(requestId) ||
    !validateActionResult(value) ||
    value.retention !== 'full' ||
    value.operationId !== 'integration.bindSource' ||
    value.receipt.businessStatus !== 'accepted'
  )
    throw new AccessError('ACCEPTED_OPERATOR_RESULT_REQUIRED', 400);
  const result: ActionResult = value;
  const saved = await UnitOfWork.run(pool, token, company, 'integration', async (u) => {
    requireConnectionAuthority(u);
    const request = (
      await u.client.query<{ requests: EnrollmentRequest[] }>(
        'SELECT requests FROM integration.enrollment_request WHERE company_id=$1 AND id=$2',
        [company, requestId],
      )
    ).rows[0];
    if (!request) throw new AccessError('NOT_FOUND', 404);
    return { request, source: await sourceByCompany(u.client, company) };
  });
  const connection = await connectionFor(runtime, company);
  if (!connection || !saved.source) throw new AccessError('SOURCE_NOT_READY', 409);
  const client = new TawselClient(connection),
    configuration = await client.configuration(),
    status = await client.status('source', saved.source.external_id);
  if (
    configuration.erpCompanyId !== company ||
    !configuration.serviceCapabilities?.includes('identity.provision')
  )
    throw new AccessError('REMOTE_SCOPE_OR_GRANTS_MISMATCH', 409);
  const summary = result.summary;
  if (
    summary.entity !== 'source' ||
    summary.externalId !== saved.source.external_id ||
    summary.resourceId !== saved.source.integration_id ||
    summary.sourceRevision !== status.sourceRevision ||
    status.lastActionId !== result.receipt.actionId ||
    !status.enabled
  )
    throw new AccessError('REMOTE_SETUP_IDENTITY_MISMATCH', 409);
  // Retain only the canonical source summary/receipt. Arbitrary response fields
  // cannot smuggle private material through this nonsecret result boundary.
  const safe = {
    operationId: result.operationId,
    receipt: {
      actionId: result.receipt.actionId,
      receiptId: result.receipt.receiptId,
      businessStatus: result.receipt.businessStatus,
      committedAt: result.receipt.committedAt,
    },
    summary: {
      entity: summary.entity,
      externalId: summary.externalId,
      resourceId: summary.resourceId,
      sourceRevision: summary.sourceRevision,
    },
  };
  return UnitOfWork.run(pool, token, company, 'integration', async (u) => {
    requireConnectionAuthority(u);
    for (const x of saved.request.requests) {
      const row = await u.client.query(
        `SELECT 1 FROM access.ordinary_user p JOIN access.issuer_binding b ON b.principal_id=p.id WHERE p.company_id=$1 AND p.id=$2 AND p.correlation_id=$3 AND b.issuer=$4 AND b.subject=$5 AND p.active AND p.identity_state='ready'`,
        [company, x.erpPrincipalId, x.erpCorrelationId, x.issuer, x.subject],
      );
      if (!row.rowCount) throw new AccessError('ISSUER_BINDING_CHANGED', 409);
    }
    const inserted = await u.client.query(
      `INSERT INTO integration.enrollment_operator_result(company_id,request_id,action_id,result,source_status,principal_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
      [
        company,
        requestId,
        status.lastActionId,
        JSON.stringify(safe),
        JSON.stringify(status),
        u.access.principalId,
      ],
    );
    if (
      !inserted.rowCount &&
      !(
        await u.client.query(
          'SELECT 1 FROM integration.enrollment_operator_result WHERE company_id=$1 AND request_id=$2 AND action_id=$3',
          [company, requestId, status.lastActionId],
        )
      ).rowCount
    )
      throw new AccessError('IMPORT_IDENTITY_CONFLICT', 409);
    await appendAudit(
      u.client,
      u.access,
      company,
      'integration.operatorEnrollmentResult',
      requestId,
      null,
      null,
      null,
      { requestId, actionId: status.lastActionId, sourceRevision: status.sourceRevision },
    );
    await recordProvisioningStatus(u.client, saved.source!, status);
    return {
      requestId,
      state: 'operator-result-recorded-awaiting-user-provision',
      actionId: status.lastActionId,
    };
  });
}
