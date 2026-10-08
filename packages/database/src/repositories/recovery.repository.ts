import type { TransactionClient } from '../transaction.js';
import type { IntegrationSource } from './integration.repository.js';
import type {
  AppliedCheckpoint,
  AggregateIdentity,
  ReconciliationState,
} from '@shahn/contracts/tawsel';
export interface StreamRow {
  company_id: string;
  source_id: string;
  aggregate_type: AggregateIdentity['type'];
  aggregate_id: string;
  received_through: string;
  received_high: string;
  applied_through: string;
  snapshot_through: string;
  projected_through: string;
  history_complete: boolean;
  rebuild_required: boolean;
  revision: string;
  updated_at: Date;
}
export async function currentRecoveryProjection(
  c: TransactionClient,
  s: IntegrationSource,
  a: AggregateIdentity,
) {
  const row = (
    await c.query<{ through_sequence: string; state: ReconciliationState; evidence_id: string }>(
      `SELECT through_sequence,state,evidence_id FROM integration.current_projection WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4`,
      [s.company_id, s.id, a.type, a.id],
    )
  ).rows[0];
  return row
    ? {
        aggregate: a,
        throughSequence: Number(row.through_sequence),
        history: 'current-state-only' as const,
        state: row.state,
        evidenceId: row.evidence_id,
      }
    : null;
}
export async function recoveryStream(
  c: TransactionClient,
  company: string,
  source: string,
  a: AggregateIdentity,
  lock = false,
) {
  return (
    (
      await c.query<StreamRow>(
        `SELECT * FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4${lock ? ' FOR UPDATE' : ''}`,
        [company, source, a.type, a.id],
      )
    ).rows[0] ?? null
  );
}
/** Known accepted native identities only; counters begin at zero, with no inferred receipt. */
export async function registerKnownStreams(c: TransactionClient, s: IntegrationSource) {
  await c.query(
    `INSERT INTO integration.checkpoint(company_id,source_id,aggregate_type,aggregate_id)
    SELECT company_id,source_id,'task',task_id FROM dispatch.cycle WHERE company_id=$1 AND source_id=$2 AND task_id IS NOT NULL AND accepted_revision>0
    UNION SELECT company_id,source_id,'return-request',id FROM returns.request WHERE company_id=$1 AND source_id=$2
    ON CONFLICT DO NOTHING`,
    [s.company_id, s.id],
  );
}
export async function committedCheckpoint(
  c: TransactionClient,
  s: IntegrationSource,
  cp: StreamRow,
): Promise<AppliedCheckpoint> {
  const meta = (
    await c.query<{
      pending: number;
      received: Date | null;
      applied: Date | null;
      reason: string | null;
    }>(
      `SELECT count(*) FILTER(WHERE application_state='pending')::int pending,max(received_at) received,max(applied_at) applied,(array_agg(pending_reason ORDER BY recipient_sequence) FILTER(WHERE application_state='pending'))[1] reason FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4`,
      [s.company_id, s.id, cp.aggregate_type, cp.aggregate_id],
    )
  ).rows[0]!;
  return {
    schemaVersion: '1.0.0',
    tenantId: s.tenant_id,
    recipientIntegrationId: s.integration_id,
    aggregate: { type: cp.aggregate_type, id: cp.aggregate_id },
    revision: Number(cp.revision),
    receivedThrough: Number(cp.received_through),
    receivedHigh: Number(cp.received_high),
    appliedThrough: Number(cp.applied_through),
    projectedThrough: Number(cp.projected_through),
    snapshotThrough: Number(cp.snapshot_through),
    historyComplete: cp.history_complete,
    pendingCount: meta.pending,
    receivedAt: meta.received?.toISOString() ?? null,
    appliedAt: meta.applied?.toISOString() ?? null,
    lastError: cp.rebuild_required
      ? 'projection_failed'
      : Number(cp.received_through) <
          Math.max(Number(cp.received_high), Number(cp.snapshot_through))
        ? 'sequence_gap'
        : meta.pending
          ? 'dependency_missing'
          : cp.history_complete
            ? null
            : 'history_unavailable',
  };
}
