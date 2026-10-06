import {
  validateSourceConfiguration,
  validateProvisioningStatus,
  validateActionResult,
  validateProvisioningCommand,
  validateDeliveryCommand,
  provisioningOperations,
  deliveryOperations,
  validateIntakeCommand,
  validateReturnCommand,
  returnOperations,
  validateReturnActionStatus,
  validateReturnList,
  validateReturnRequest,
  validateCycleList,
  type ReturnRequest,
  validateIntakeTask,
  validateIntakeTaskList,
  validateIntakeBatchResult,
  intakeOperations,
  tawselValidator,
  canonicalTawselJson,
  type IntakeTask,
  type SourceEnvelope,
  type SourceConfiguration,
  type ProvisioningStatus,
  type ActionResult,
} from '@shahn/contracts/tawsel';
import { validatePublicCallback } from './callback-policy.js';
import type { IntegrationConnection } from './config.js';
const validateProblem = tawselValidator<{
  actionId?: string;
  status: number;
  retryable: boolean;
  code: string;
}>('common.schema.json#/$defs/Problem');
export class SourceFailure extends Error {
  constructor(
    readonly kind: 'unknown' | 'retryable' | 'configuration-blocked' | 'review-required',
    readonly code: string,
    readonly httpStatus: number | null = null,
    readonly problem?: unknown,
  ) {
    super(code);
  }
}
export class TawselClient {
  constructor(
    readonly connection: IntegrationConnection,
    readonly transport: typeof fetch = fetch,
  ) {}
  async request(
    path: string,
    body?: string,
    operator?: string,
  ): Promise<{ status: number; body: unknown }> {
    const token = operator ?? this.connection.serviceBearer;
    if (
      !token ||
      (!operator &&
        this.connection.serviceExpiresAt &&
        Date.parse(this.connection.serviceExpiresAt) <= Date.now())
    )
      throw new SourceFailure('configuration-blocked', 'AUTHORIZATION_EXPIRED');
    try {
      const response = await this.transport(new URL(path, this.connection.baseUrl), {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: 'Bearer ' + token,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body }),
      });
      // Bound untrusted result bodies as well as requests. No remote text enters logs/UI.
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 2097152) {
            await reader.cancel();
            throw new SourceFailure('unknown', 'REMOTE_RESULT_TOO_LARGE');
          }
          chunks.push(value);
        }
      }
      let result: unknown;
      try {
        result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw new SourceFailure('unknown', 'INVALID_REMOTE_RESULT', response.status);
      }
      return { status: response.status, body: result };
    } catch (error) {
      if (error instanceof SourceFailure) throw error;
      throw new SourceFailure('unknown', 'REMOTE_RESULT_UNKNOWN');
    }
  }
  async configuration(): Promise<SourceConfiguration> {
    const r = await this.request('/api/v1/provisioning/configuration');
    if (r.status === 401 || r.status === 403)
      throw new SourceFailure('configuration-blocked', 'AUTHORIZATION_EXPIRED', r.status);
    if (r.status !== 200)
      throw new SourceFailure('retryable', 'CONFIGURATION_UNAVAILABLE', r.status);
    if (
      !validateSourceConfiguration(r.body) ||
      r.body.identity.tenantId !== this.connection.tenantId ||
      r.body.identity.integrationId !== this.connection.integrationId ||
      r.body.issuer !== this.connection.issuer ||
      !r.body.supportedVersions.includes('1.0.0')
    )
      throw new SourceFailure('configuration-blocked', 'SOURCE_CONFIGURATION_MISMATCH', r.status);
    return r.body;
  }
  async status(entity: string, externalId: string): Promise<ProvisioningStatus> {
    const r = await this.request(
      '/api/v1/provisioning/status?' + new URLSearchParams({ entity, externalId }),
    );
    if (
      r.status !== 200 ||
      !validateProvisioningStatus(r.body) ||
      r.body.entity !== entity ||
      r.body.externalId !== externalId
    )
      throw new SourceFailure(
        r.status === 401 || r.status === 403 ? 'configuration-blocked' : 'retryable',
        'IDENTITY_STATUS_UNAVAILABLE',
        r.status,
      );
    return r.body;
  }
  async send(
    envelope: SourceEnvelope,
    raw: string,
    operator?: string,
  ): Promise<{ result: ActionResult; status: number; configuration: SourceConfiguration | null }> {
    if (
      (!validateProvisioningCommand(envelope) &&
        !validateDeliveryCommand(envelope) &&
        !validateIntakeCommand(envelope) &&
        !validateReturnCommand(envelope)) ||
      envelope.context.tenantId !== this.connection.tenantId ||
      envelope.context.integrationId !== this.connection.integrationId ||
      canonicalTawselJson(JSON.parse(raw)) !== canonicalTawselJson(envelope)
    )
      throw new SourceFailure('configuration-blocked', 'IMMUTABLE_REQUEST_INVALID');
    if (envelope.operationId === 'integration.configureWebhook')
      try {
        await validatePublicCallback(
          String(envelope.payload.url),
          this.connection.allowedCallbackUrls,
        );
      } catch {
        throw new SourceFailure('configuration-blocked', 'CALLBACK_NOT_PUBLIC');
      }
    let configuration: SourceConfiguration | null = null;
    if (!operator) {
      configuration = await this.configuration();
      // The pinned provisioning advertisement covers provisioning/intake/returns.
      // The separate closed outbox catalog authorizes these commands through
      // integration.manage, which configuration() itself requires remotely.
      // Tawsel still enforces the service grant, destination and key selectors.
      if (
        !Object.hasOwn(deliveryOperations, envelope.operationId) &&
        !configuration.allowedOperations.includes(envelope.operationId)
      )
        throw new SourceFailure('configuration-blocked', 'OPERATION_NOT_ALLOWED');
    }
    if (
      operator &&
      envelope.operationId !== 'integration.bindSource' &&
      !(
        envelope.operationId === 'integration.rotateCredential' && envelope.payload.recover === true
      )
    )
      throw new SourceFailure('configuration-blocked', 'OPERATOR_OPERATION_FORBIDDEN');
    const family = Object.hasOwn(returnOperations, envelope.operationId)
      ? 'erp/returns'
      : Object.hasOwn(intakeOperations, envelope.operationId)
        ? 'intake'
        : Object.hasOwn(provisioningOperations, envelope.operationId)
          ? 'provisioning'
          : 'integration';
    const r = await this.request(
      `/api/v1/${family}/commands/${envelope.operationId}`,
      raw,
      operator,
    );
    // A correlated, definite Problem is retained as a problem, never a fabricated receipt.
    if (
      ['intake', 'erp/returns'].includes(family) &&
      [400, 409, 422].includes(r.status) &&
      validateProblem(r.body) &&
      r.body.actionId === envelope.actionId &&
      r.body.status === r.status &&
      !r.body.retryable
    )
      throw new SourceFailure('review-required', r.body.code, r.status, r.body);
    if (
      !validateActionResult(r.body) ||
      r.body.operationId !== envelope.operationId ||
      r.body.receipt.actionId !== envelope.actionId
    )
      throw new SourceFailure(
        r.status === 401 || r.status === 403 ? 'configuration-blocked' : 'unknown',
        r.status === 401 || r.status === 403 ? 'AUTHORIZATION_EXPIRED' : 'REMOTE_RESULT_UNKNOWN',
        r.status,
      );
    return { result: r.body, status: r.status, configuration };
  }
  async intakeResult(envelope: SourceEnvelope): Promise<ActionResult | null> {
    const r = await this.request('/api/v1/intake/results/' + envelope.actionId);
    if (r.status === 401 || r.status === 403)
      throw new SourceFailure('configuration-blocked', 'AUTHORIZATION_EXPIRED', r.status);
    if (r.status === 404) return null;
    if (!validateIntakeBatchResult(r.body) || r.body.actionId !== envelope.actionId)
      throw new SourceFailure('unknown', 'INVALID_INTAKE_RESULT', r.status);
    if (r.status === 202 || r.body.status === 'pending') return null;
    if (
      r.status !== 200 ||
      !r.body.result ||
      r.body.result.operationId !== envelope.operationId ||
      r.body.result.receipt.actionId !== envelope.actionId ||
      r.body.result.receipt.businessStatus !== r.body.status
    )
      throw new SourceFailure('unknown', 'INVALID_INTAKE_RESULT', r.status);
    return r.body.result;
  }
  async returnResult(envelope: SourceEnvelope): Promise<ActionResult | null> {
    const r = await this.request('/api/v1/erp/returns/actions/' + envelope.actionId);
    if (r.status === 401 || r.status === 403)
      throw new SourceFailure('configuration-blocked', 'AUTHORIZATION_EXPIRED', r.status);
    if (!validateReturnActionStatus(r.body) || r.body.actionId !== envelope.actionId)
      throw new SourceFailure('unknown', 'INVALID_RETURN_RESULT', r.status);
    if (r.status === 202 || r.body.status === 'pending') return null;
    if (
      r.status !== 200 ||
      !r.body.result ||
      r.body.result.operationId !== envelope.operationId ||
      r.body.result.receipt.actionId !== envelope.actionId ||
      r.body.result.receipt.businessStatus !== r.body.status
    )
      throw new SourceFailure('unknown', 'INVALID_RETURN_RESULT', r.status);
    return r.body.result;
  }
  async returnRequest(requestId: string): Promise<ReturnRequest> {
    const r = await this.request('/api/v1/erp/returns/requests/' + encodeURIComponent(requestId));
    if (
      r.status !== 200 ||
      !validateReturnRequest(r.body) ||
      r.body.requestId !== requestId ||
      r.body.integrationId !== this.connection.integrationId
    )
      throw new SourceFailure(
        r.status === 401 || r.status === 403 ? 'configuration-blocked' : 'unknown',
        'RETURN_REQUEST_UNAVAILABLE',
        r.status,
      );
    return r.body;
  }
  async pendingReturns(driverId: string, sourceBranchId: string): Promise<ReturnRequest[]> {
    const items: ReturnRequest[] = [],
      seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({
        driverId,
        sourceBranchId,
        ...(cursor ? { cursor } : {}),
      });
      const r = await this.request('/api/v1/erp/returns/pending?' + query);
      if (
        r.status !== 200 ||
        !validateReturnList(r.body) ||
        r.body.items.length > 100 ||
        r.body.items.some(
          (x) =>
            x.driverId !== driverId ||
            x.sourceBranchId !== sourceBranchId ||
            x.integrationId !== this.connection.integrationId,
        )
      )
        throw new SourceFailure(
          r.status === 401 || r.status === 403 ? 'configuration-blocked' : 'unknown',
          'RETURN_LIST_INCOMPLETE',
          r.status,
        );
      for (const item of r.body.items) {
        if (seen.has(item.requestId)) throw new SourceFailure('unknown', 'RETURN_PAGE_CHANGED');
        seen.add(item.requestId);
        items.push(item);
      }
      cursor = r.body.nextCursor;
      if (cursor && r.body.items.length === 0)
        throw new SourceFailure('unknown', 'RETURN_CURSOR_INVALID');
    } while (cursor);
    return items;
  }
  async intakeCycles(externalId: string): Promise<IntakeTask[]> {
    const items: IntakeTask[] = [],
      seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const r = await this.request(
        '/api/v1/intake/cycles?' +
          new URLSearchParams({ externalId, ...(cursor ? { cursor } : {}) }),
      );
      if (
        r.status !== 200 ||
        !validateCycleList(r.body) ||
        r.body.items.some((t) => t.externalId !== externalId)
      )
        throw new SourceFailure('unknown', 'CYCLE_LIST_INCOMPLETE', r.status);
      for (const t of r.body.items) {
        if (seen.has(t.dispatchCycleId)) throw new SourceFailure('unknown', 'CYCLE_PAGE_CHANGED');
        seen.add(t.dispatchCycleId);
        items.push(t);
      }
      cursor = r.body.nextCursor;
      if (cursor && r.body.items.length === 0)
        throw new SourceFailure('unknown', 'CYCLE_CURSOR_INVALID');
    } while (cursor);
    return items;
  }
  async intakeTask(externalId: string): Promise<IntakeTask> {
    const r = await this.request('/api/v1/intake/task?' + new URLSearchParams({ externalId }));
    if (r.status !== 200 || !validateIntakeTask(r.body) || r.body.externalId !== externalId)
      throw new SourceFailure('unknown', 'INTAKE_TASK_UNAVAILABLE', r.status);
    return r.body;
  }
  async intakeTasks(
    filters: {
      state?: IntakeTask['state'];
      driverExternalId?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ) {
    const query = new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)]));
    const r = await this.request('/api/v1/intake/tasks?' + query);
    if (r.status !== 200 || !validateIntakeTaskList(r.body))
      throw new SourceFailure('unknown', 'INTAKE_TASKS_UNAVAILABLE', r.status);
    return r.body;
  }
}
