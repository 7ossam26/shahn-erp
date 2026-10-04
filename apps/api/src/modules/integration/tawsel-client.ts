import {
  validateSourceConfiguration,
  validateProvisioningStatus,
  validateActionResult,
  validateProvisioningCommand,
  validateDeliveryCommand,
  provisioningOperations,
  type SourceEnvelope,
  type SourceConfiguration,
  type ProvisioningStatus,
  type ActionResult,
} from '@shahn/contracts/tawsel';
import { canonical } from '../access/crypto.js';
import { validatePublicCallback } from './callback-policy.js';
import type { IntegrationConnection } from './config.js';
export class SourceFailure extends Error {
  constructor(
    readonly kind: 'unknown' | 'retryable' | 'configuration-blocked',
    readonly code: string,
    readonly httpStatus: number | null = null,
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
      (!validateProvisioningCommand(envelope) && !validateDeliveryCommand(envelope)) ||
      envelope.context.tenantId !== this.connection.tenantId ||
      envelope.context.integrationId !== this.connection.integrationId ||
      canonical(JSON.parse(raw)) !== canonical(envelope)
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
      if (!configuration.allowedOperations.includes(envelope.operationId))
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
    const family = Object.hasOwn(provisioningOperations, envelope.operationId)
      ? 'provisioning'
      : 'integration';
    const r = await this.request(
      `/api/v1/${family}/commands/${envelope.operationId}`,
      raw,
      operator,
    );
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
}
