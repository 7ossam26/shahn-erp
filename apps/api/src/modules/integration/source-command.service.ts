import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  transaction,
  type TransactionClient,
  type IntegrationSource,
  type IntegrationBinding,
} from '@shahn/database';
import {
  validateProvisioningCommand,
  validateDeliveryCommand,
  validateKeyRotation,
  validateIntakeCommand,
  intakeOperations,
  type IntakeTask,
  type SourceEnvelope,
  type ActionResult,
  type ProvisioningStatus,
  type SourceConfiguration,
} from '@shahn/contracts/tawsel';
import { lockLease, type Lease } from '../kernel/work.js';
import type { IntegrationRuntime, IntegrationConnection } from './config.js';
import { TawselClient, SourceFailure } from './tawsel-client.js';
import { applyDispatchAcceptance, applyOneDispatchEvent } from '../dispatch/acceptance.js';
export interface SourceLease extends Lease {
  source_id: string;
  action_id: string;
  request_body: string;
  authority: string;
  binding_id: string | null;
  operation_id: string;
}
export async function recordProvisioningStatus(
  client: TransactionClient,
  source: IntegrationSource,
  status: ProvisioningStatus,
) {
  const b = (
    await client.query<IntegrationBinding>(
      `SELECT * FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity=$3 AND external_id=$4 FOR UPDATE`,
      [source.company_id, source.id, status.entity, status.externalId],
    )
  ).rows[0];
  if (!b) return false;
  // No inference from similar names, nor authoritative adoption of an unrecorded action/revision.
  const action = (
    await client.query(
      `SELECT 1 FROM integration.source_command WHERE company_id=$1 AND source_id=$2 AND binding_id=$3 AND action_id=$4 AND source_revision=$5 AND state='accepted'`,
      [source.company_id, source.id, b.id, status.lastActionId, status.sourceRevision],
    )
  ).rowCount;
  if (
    !action ||
    status.sourceRevision < Number(b.accepted_revision) ||
    status.sourceRevision > Number(b.submitted_revision) ||
    (b.resource_id && b.resource_id !== status.resourceId)
  )
    return false;
  await client.query(
    `UPDATE integration.binding SET resource_id=$1,accepted_revision=$2,issuer_status=$3,enabled=$4,last_action_id=$5,evidence=$6,checked_at=clock_timestamp() WHERE company_id=$7 AND id=$8`,
    [
      status.resourceId,
      status.sourceRevision,
      status.issuerStatus,
      status.enabled,
      status.lastActionId,
      JSON.stringify(status),
      source.company_id,
      b.id,
    ],
  );
  if (status.entity === 'driver')
    await client.query(
      `UPDATE employees.operational_driver SET tawsel_driver_id=$1,external_mapping='mapped' WHERE company_id=$2 AND id=$3 AND (tawsel_driver_id IS NULL OR tawsel_driver_id=$1)`,
      [status.resourceId, source.company_id, b.native_id],
    );
  return true;
}
export class SourceCommandWorker {
  readonly owner = randomUUID();
  constructor(
    readonly pool: Pool,
    readonly runtime: IntegrationRuntime,
    readonly clientFor: (c: IntegrationConnection) => TawselClient = (c) => new TawselClient(c),
    readonly operatorToken?: string,
  ) {}
  async claim(seconds = 60): Promise<SourceLease | null> {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300)
      throw new Error('INVALID_LEASE_DURATION');
    return transaction(this.pool, async (c) => {
      const row = (
        await c.query<SourceLease>(
          `WITH candidate AS (
        SELECT w.id FROM work_item w JOIN integration.source_command s ON s.work_id=w.id
        WHERE s.authority=$2 AND ((w.state='pending' AND w.available_at<=clock_timestamp()) OR(w.state='leased' AND w.lease_until<=clock_timestamp()))
        ORDER BY w.available_at,w.created_at,w.id FOR UPDATE OF w SKIP LOCKED LIMIT 1)
        UPDATE work_item w SET state='leased',lease_owner=$1,lease_until=clock_timestamp()+($3*interval '1 second'),fence=fence+1,attempts=attempts+1
        FROM candidate c WHERE w.id=c.id RETURNING w.*`,
          [this.owner, this.operatorToken ? 'operator' : 'service', seconds],
        )
      ).rows[0];
      if (!row) return null;
      const command = (
        await c.query(
          `UPDATE integration.source_command SET state='sending' WHERE company_id=$1 AND work_id=$2 RETURNING source_id,action_id,request_body,authority,binding_id,operation_id`,
          [row.company_id, row.id],
        )
      ).rows[0];
      return { ...row, ...command };
    });
  }
  async complete(
    work: SourceLease,
    outcome: {
      result?: ActionResult;
      status?: number;
      configuration?: SourceConfiguration | null;
      identity?: ProvisioningStatus;
      failure?: SourceFailure;
      tasks?: IntakeTask[];
    },
  ): Promise<boolean> {
    return transaction(this.pool, async (c) => {
      // Same lock order as native enqueue/retry, then lease fencing before any effect.
      const source = (
        await c.query<IntegrationSource>(
          'SELECT * FROM integration.source WHERE company_id=$1 AND id=$2 FOR UPDATE',
          [work.company_id, work.source_id],
        )
      ).rows[0]!;
      if (!(await lockLease(c, work, this.owner))) return false;
      if (Object.hasOwn(intakeOperations, work.operation_id))
        await applyDispatchAcceptance(this.pool, c, work, outcome.result, outcome.tasks);
      if (outcome.failure?.kind === 'review-required')
        await c.query(
          `UPDATE dispatch.intent i SET state='review-required',last_error=$1,version=version+1 FROM dispatch.action a WHERE a.company_id=$2 AND a.action_id=$3 AND(i.company_id,i.id)=(a.company_id,a.intent_id) AND i.state<>'accepted'`,
          [outcome.failure.code, work.company_id, work.action_id],
        );
      const result = outcome.result,
        state = result?.receipt.businessStatus ?? outcome.failure?.kind ?? 'unknown',
        code = result?.receipt.problem?.code ?? outcome.failure?.code ?? null;
      await c.query(
        `UPDATE integration.source_command SET state=$1,remote_result=$2,last_error=$3,http_status=$4,completed_at=CASE WHEN $2::jsonb IS NULL THEN NULL ELSE clock_timestamp() END WHERE company_id=$5 AND action_id=$6`,
        [
          state,
          result
            ? JSON.stringify(result)
            : outcome.failure?.problem
              ? JSON.stringify(outcome.failure.problem)
              : null,
          code,
          outcome.status ?? outcome.failure?.httpStatus ?? null,
          work.company_id,
          work.action_id,
        ],
      );
      const terminal = !!result || outcome.failure?.kind === 'review-required',
        blocked = state === 'configuration-blocked';
      await c.query(
        `UPDATE work_item SET state=$1,outcome_kind=$2,last_error=$3,lease_owner=NULL,lease_until=NULL,completed_at=CASE WHEN $4 THEN clock_timestamp() ELSE NULL END,available_at=clock_timestamp()+($5*interval '1 second') WHERE id=$6`,
        [
          terminal ? 'ready' : blocked ? 'failed' : 'pending',
          terminal ? 'success' : state === 'unknown' ? 'unknown' : 'retryable',
          code,
          terminal,
          Math.min(300, 2 ** Math.min(work.attempts, 8)),
          work.id,
        ],
      );
      if (outcome.configuration)
        await c.query(
          'UPDATE integration.source SET configuration=$1,configuration_checked_at=clock_timestamp(),last_error=NULL WHERE company_id=$2 AND id=$3',
          [JSON.stringify(outcome.configuration), work.company_id, source.id],
        );
      if (outcome.failure)
        await c.query('UPDATE integration.source SET last_error=$1 WHERE company_id=$2 AND id=$3', [
          outcome.failure.code,
          work.company_id,
          source.id,
        ]);
      if (result?.receipt.businessStatus === 'accepted') {
        if (outcome.identity) await recordProvisioningStatus(c, source, outcome.identity);
        if (work.operation_id === 'integration.disableSource')
          await c.query(
            'UPDATE integration.source SET enabled=false WHERE company_id=$1 AND id=$2',
            [work.company_id, source.id],
          );
        if (work.operation_id === 'integration.rotateSigningKey') {
          const rotation = result.response?.body;
          if (validateKeyRotation(rotation)) {
            const expected = (JSON.parse(work.request_body) as SourceEnvelope).payload.keyId;
            if (rotation.keyId !== expected) throw new Error('ROTATION_IDENTITY_MISMATCH');
            await c.query(
              `UPDATE integration.verification_key SET active_from=$1,verify_until=NULL WHERE company_id=$2 AND source_id=$3 AND key_id=$4`,
              [rotation.activatedAt, work.company_id, source.id, rotation.keyId],
            );
            if (rotation.previousKeyId && rotation.verifyUntil)
              await c.query(
                'UPDATE integration.verification_key SET verify_until=$1 WHERE company_id=$2 AND source_id=$3 AND key_id=$4',
                [rotation.verifyUntil, work.company_id, source.id, rotation.previousKeyId],
              );
          } else {
            // A compacted result remains final. Without authoritative overlap metadata,
            // fail closed on old keys and surface reconciliation instead of repeating rotation.
            const expected = (JSON.parse(work.request_body) as SourceEnvelope).payload.keyId;
            await c.query(
              `UPDATE integration.verification_key SET verify_until=GREATEST(active_from,clock_timestamp()) WHERE company_id=$1 AND source_id=$2 AND key_id<>$3 AND verify_until IS NULL`,
              [work.company_id, source.id, expected],
            );
            await c.query(
              `UPDATE integration.source SET last_error='KEY_ROTATION_RECONCILIATION_REQUIRED' WHERE company_id=$1 AND id=$2`,
              [work.company_id, source.id],
            );
          }
        }
      }
      return true;
    });
  }
  async runOne(): Promise<boolean> {
    if (await applyOneDispatchEvent(this.pool)) return true;
    const work = await this.claim();
    if (!work) return false;
    await this.deliver(work);
    return true;
  }
  async deliver(work: SourceLease) {
    try {
      const source = (
        await this.pool.query<IntegrationSource>(
          'SELECT * FROM integration.source WHERE company_id=$1 AND id=$2',
          [work.company_id, work.source_id],
        )
      ).rows[0];
      const connection = this.runtime.connections.find(
        (c) =>
          c.selector === source?.selector &&
          c.companyId === source.company_id &&
          c.tenantId === source.tenant_id &&
          c.integrationId === source.integration_id &&
          c.baseUrl === source.base_url &&
          c.issuer === source.issuer,
      );
      if (!connection)
        throw new SourceFailure('configuration-blocked', 'CONNECTION_CONFIGURATION_REQUIRED');
      const envelope = JSON.parse(work.request_body) as SourceEnvelope;
      if (
        !validateProvisioningCommand(envelope) &&
        !validateDeliveryCommand(envelope) &&
        !validateIntakeCommand(envelope)
      )
        throw new SourceFailure('configuration-blocked', 'IMMUTABLE_REQUEST_INVALID');
      const client = this.clientFor(connection);
      const recovered =
        Object.hasOwn(intakeOperations, work.operation_id) && work.attempts > 1
          ? await client.intakeResult(envelope)
          : null;
      const outcome = recovered
        ? { result: recovered, status: 200, configuration: null }
        : await client.send(envelope, work.request_body, this.operatorToken);
      const tasks: IntakeTask[] = [];
      if (
        Object.hasOwn(intakeOperations, work.operation_id) &&
        outcome.result.receipt.businessStatus === 'accepted'
      ) {
        const refs = Array.isArray(envelope.payload.items)
          ? (envelope.payload.items as { externalId: string }[])
          : [envelope.payload as { externalId: string }];
        for (const ref of refs) tasks.push(await client.intakeTask(ref.externalId));
      }
      let identity: ProvisioningStatus | undefined;
      if (outcome.result.receipt.businessStatus === 'accepted' && work.binding_id) {
        const b = (
          await this.pool.query<IntegrationBinding>(
            'SELECT * FROM integration.binding WHERE company_id=$1 AND id=$2',
            [work.company_id, work.binding_id],
          )
        ).rows[0];
        if (b)
          try {
            identity = await client.status(b.entity, b.external_id);
          } catch {
            /* Accepted command remains accepted; readiness awaits a later authorized status refresh. */
          }
      }
      return this.complete(work, { ...outcome, tasks, ...(identity ? { identity } : {}) });
    } catch (error) {
      return this.complete(work, {
        failure:
          error instanceof SourceFailure
            ? error
            : new SourceFailure('unknown', 'REMOTE_RESULT_UNKNOWN'),
      });
    }
  }
}
