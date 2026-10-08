import {
  validateReplayPage,
  validateSnapshot,
  validateDeliveryQueue,
  validateDeliveryDetail,
  validateReportRead,
  checkpointCountersValid,
  tawselValidator,
  type AggregateIdentity,
  type ReplayPage,
  type ReconciliationSnapshot,
  type DeliveryQueue,
  type DeliveryDetail,
  type AppliedReportRead,
} from '@shahn/contracts/tawsel';
import { TawselClient, SourceFailure } from './tawsel-client.js';
export type RecoveryFailureClass =
  | 'outage'
  | 'authentication'
  | 'configuration'
  | 'semantic-conflict'
  | 'history-expired'
  | 'reconstruction-limit'
  | 'invalid-response'
  | 'basis-changed';
export class RecoveryFailure extends Error {
  constructor(
    readonly failureClass: RecoveryFailureClass,
    readonly code: string,
    readonly httpStatus: number | null = null,
  ) {
    super(code);
  }
}
const problem = tawselValidator<{ code: string; status: number; retryable: boolean }>(
  'common.schema.json#/$defs/Problem',
);
export const classifyRecoveryFailure = (e: unknown): RecoveryFailure =>
  e instanceof RecoveryFailure
    ? e
    : e instanceof SourceFailure
      ? new RecoveryFailure(
          e.kind === 'configuration-blocked'
            ? e.code === 'AUTHORIZATION_EXPIRED'
              ? 'authentication'
              : 'configuration'
            : e.kind === 'review-required'
              ? 'semantic-conflict'
              : e.code === 'REMOTE_RESULT_TOO_LARGE'
                ? 'reconstruction-limit'
                : e.code === 'INVALID_REMOTE_RESULT'
                  ? 'invalid-response'
                  : 'outage',
          e.code,
          e.httpStatus,
        )
      : new RecoveryFailure('outage', 'RECOVERY_TRANSPORT_UNAVAILABLE');
export interface Retrieved<T> {
  body: T;
  rawBody: Buffer;
  retrievedAt: string;
}
export class RecoveryClient extends TawselClient {
  async read<T>(path: string, validate: (v: unknown) => v is T): Promise<Retrieved<T>> {
    // configuration() verifies current service authority, source/issuer and supported versions.
    // The pinned integration catalog is separate from the provisioning advertisement.
    await this.configuration();
    const r = await this.request(path, undefined, undefined, 16777216);
    if (r.status === 401 || r.status === 403)
      throw new RecoveryFailure('authentication', 'RECOVERY_AUTHORIZATION_BLOCKED', r.status);
    if (r.status === 410 && problem(r.body) && r.body.code === 'replay_expired')
      throw new RecoveryFailure('history-expired', 'replay_expired', 410);
    if (r.status === 503) throw new RecoveryFailure('outage', 'RECOVERY_UNAVAILABLE', 503);
    if (r.status >= 500 || r.status === 202)
      throw new RecoveryFailure('outage', 'RECOVERY_UNAVAILABLE', r.status);
    if (r.status === 404)
      throw new RecoveryFailure('semantic-conflict', 'SCOPED_RESOURCE_UNAVAILABLE', 404);
    if (r.status === 409 || r.status === 422 || r.status === 400)
      throw new RecoveryFailure('semantic-conflict', 'RECOVERY_REQUEST_CONFLICT', r.status);
    if (r.status !== 200 || !validate(r.body))
      throw new RecoveryFailure('invalid-response', 'RECOVERY_RESPONSE_INVALID', r.status);
    return { body: r.body, rawBody: r.rawBody, retrievedAt: r.retrievedAt };
  }
  replay(aggregate: AggregateIdentity, afterSequence: number, limit = 100) {
    const q = new URLSearchParams({
      aggregateType: aggregate.type,
      aggregateId: aggregate.id,
      afterSequence: String(afterSequence),
      limit: String(limit),
    });
    return this.read<ReplayPage>('/api/v1/integration/replay?' + q, (v) =>
      validateReplayPage(
        v,
        { tenantId: this.connection.tenantId, integrationId: this.connection.integrationId },
        aggregate,
        afterSequence,
      ),
    );
  }
  reconciliation(aggregate: AggregateIdentity) {
    return this.read<ReconciliationSnapshot>(
      '/api/v1/integration/reconciliation?' +
        new URLSearchParams({ aggregateType: aggregate.type, aggregateId: aggregate.id }),
      (v) =>
        validateSnapshot(
          v,
          { tenantId: this.connection.tenantId, integrationId: this.connection.integrationId },
          aggregate,
        ),
    );
  }
  deliveries(limit = 25, cursor?: string) {
    return this.read<DeliveryQueue>(
      '/api/v1/integration/deliveries?' +
        new URLSearchParams({ limit: String(limit), ...(cursor ? { cursor } : {}) }),
      validateDeliveryQueue,
    );
  }
  delivery(eventId: string, limit = 25, beforeAttempt?: number) {
    return this.read<DeliveryDetail>(
      '/api/v1/integration/deliveries/' +
        encodeURIComponent(eventId) +
        '?' +
        new URLSearchParams({
          limit: String(limit),
          ...(beforeAttempt === undefined ? {} : { beforeAttempt: String(beforeAttempt) }),
        }),
      (v): v is DeliveryDetail => validateDeliveryDetail(v) && v.delivery.eventId === eventId,
    );
  }
  appliedCheckpoint(aggregate: AggregateIdentity) {
    return this.read<AppliedReportRead>(
      '/api/v1/integration/applied-checkpoint?' +
        new URLSearchParams({ aggregateType: aggregate.type, aggregateId: aggregate.id }),
      (v): v is AppliedReportRead =>
        validateReportRead(v) &&
        (!v.report ||
          (v.report.checkpoint.tenantId === this.connection.tenantId &&
            v.report.checkpoint.recipientIntegrationId === this.connection.integrationId &&
            v.report.checkpoint.aggregate.type === aggregate.type &&
            v.report.checkpoint.aggregate.id === aggregate.id &&
            checkpointCountersValid(v.report.checkpoint))),
    );
  }
}
