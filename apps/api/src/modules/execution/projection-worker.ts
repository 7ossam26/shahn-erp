import type { Pool } from 'pg';
import { transaction, type TransactionClient } from '@shahn/database';
import { normalizeExecutionEvent, type NormalizedExecutionEvent } from '@shahn/contracts/execution';
import { applyOneDispatchEvent } from '../dispatch/acceptance.js';
import { applyReturnEvent } from '../returns/return-events.js';
import {
  executionCycle,
  applyVisitAndOutcome,
  ExecutionDependency,
} from './visit-facts.service.js';

async function state(
  c: TransactionClient,
  company: string,
  source: string,
  kind: string,
  identity: string,
  revision: number,
  data: unknown,
  event: string,
) {
  await c.query(
    `INSERT INTO execution.state(company_id,source_id,kind,identity,revision,data,event_id) VALUES($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(company_id,source_id,kind,identity) DO UPDATE SET revision=EXCLUDED.revision,data=EXCLUDED.data,event_id=EXCLUDED.event_id
    WHERE execution.state.revision<EXCLUDED.revision`,
    [company, source, kind, identity, revision, JSON.stringify(data), event],
  );
}
async function applyExecution(
  c: TransactionClient,
  company: string,
  source: string,
  n: NormalizedExecutionEvent,
  fault?: () => void,
) {
  let p = n.record;
  const sequence = n.stream.sequence;
  if (n.owner === 'returns') return applyReturnEvent(c, company, source, n, fault);
  if (n.owner === 'provisioning') {
    const accepted = (
      await c.query(
        `SELECT 1 FROM integration.source_command a LEFT JOIN integration.binding b ON(b.company_id,b.id)=(a.company_id,a.binding_id)
      WHERE a.company_id=$1 AND a.source_id=$2 AND a.action_id=$3 AND a.state='accepted'
      AND (b.resource_id=$4 AND b.accepted_revision>=$5 AND b.entity=$6 AND b.external_id=$7
        OR a.binding_id IS NULL AND $6='source')`,
        [company, source, p.actionId, p.resourceId, p.sourceRevision, p.entity, p.externalId],
      )
    ).rowCount;
    if (!accepted) throw new ExecutionDependency('P11_PROVISIONING_ACCEPTANCE_REQUIRED');
    return;
  }
  if (n.owner === 'dispatch') {
    const cy = await executionCycle(c, company, source, n.taskId!, n.dispatchCycleId);
    if (
      Number(cy.accepted_revision) < Number(p.sourceRevision) ||
      Number(cy.assignment_revision) < Number(p.assignmentRevision)
    )
      throw new ExecutionDependency('P12_ACCEPTANCE_REQUIRED');
    await state(
      c,
      company,
      source,
      'assignment',
      n.taskId!,
      Number(p.assignmentRevision),
      p,
      n.event.eventId,
    );
    return;
  }
  if (n.type === 'plan.revisionPublished') {
    if (
      !(
        await c.query(
          `SELECT 1 FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='driver' AND resource_id=$3`,
          [company, source, n.driverId],
        )
      ).rowCount
    )
      throw new ExecutionDependency('DRIVER_MAPPING_REQUIRED');
    await state(
      c,
      company,
      source,
      'planning',
      String(p.planId),
      Number(p.revision),
      p,
      n.event.eventId,
    );
    await state(c, company, source, 'planning-current', n.driverId!, sequence, p, n.event.eventId);
    return;
  }
  if (n.type === 'round.started') {
    if (
      !(
        await c.query(
          `SELECT 1 FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='driver' AND resource_id=$3`,
          [company, source, n.driverId],
        )
      ).rowCount
    )
      throw new ExecutionDependency('DRIVER_MAPPING_REQUIRED');
    for (const task of n.taskIds) await executionCycle(c, company, source, task);
    await state(c, company, source, 'round', n.roundId!, sequence, p, n.event.eventId);
    return;
  }
  if (n.type === 'round.ended' || n.type === 'workday.ended' || n.type.startsWith('branch.')) {
    if (
      n.type.startsWith('branch.') &&
      !(
        await c.query(
          `SELECT 1 FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='branch' AND resource_id=$3`,
          [company, source, p.sourceBranchId],
        )
      ).rowCount
    )
      throw new ExecutionDependency('BRANCH_MAPPING_REQUIRED');
    for (const task of n.taskIds) await executionCycle(c, company, source, task);
    const round = n.roundId
      ? (
          await c.query(
            `SELECT data FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round' AND identity=$3`,
            [company, source, n.roundId],
          )
        ).rows[0]
      : null;
    if (n.roundId && !round) throw new ExecutionDependency('ROUND_HISTORY_REQUIRED');
    await state(
      c,
      company,
      source,
      n.type,
      n.roundId ?? n.workdayId!,
      sequence,
      p,
      n.event.eventId,
    );
    return;
  }
  const cy = await executionCycle(c, company, source, n.taskId!, n.dispatchCycleId);
  if (n.type === 'location.pinConfirmed') {
    await state(
      c,
      company,
      source,
      'location',
      n.taskId!,
      Number(p.locationRevision),
      p,
      n.event.eventId,
    );
    return;
  }
  const round = (
    await c.query<{ data: { workdayId: string; driverId: string; taskIds: string[] } }>(
      `SELECT data FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round' AND identity=$3`,
      [company, source, n.roundId],
    )
  ).rows[0]?.data;
  if (!round) throw new ExecutionDependency('ROUND_HISTORY_REQUIRED');
  if (round.driverId !== n.driverId) throw new ExecutionDependency('ROUND_DRIVER_CONFLICT');
  if (!round.taskIds.includes(n.taskId!)) throw new ExecutionDependency('ROUND_TASK_CONFLICT');
  if (n.outcome && n.outcome.workdayId !== round.workdayId)
    throw new ExecutionDependency('WORKDAY_IDENTITY_CONFLICT');
  if (n.type === 'current.arrivalRecorded' || n.outcome) {
    let priorEvidence: NormalizedExecutionEvent | null = null;
    if (n.type === 'current.arrivalRecorded') {
      const prior = (
        await c.query(
          `SELECT b.envelope,o.record,o.correction_id,e.payload AS history FROM execution.outcome_fact o LEFT JOIN integration.inbox b ON(b.company_id,b.source_id,b.event_id)=(o.company_id,o.source_id,o.event_id) LEFT JOIN execution.source_evidence e ON(e.company_id,e.id)=(o.company_id,o.evidence_id) WHERE o.company_id=$1 AND o.source_id=$2 AND o.task_id=$3 AND o.attempt_id=$4 ORDER BY o.revision DESC LIMIT 1`,
          [company, source, n.taskId, n.attemptId],
        )
      ).rows[0];
      if (prior?.envelope) priorEvidence = normalizeExecutionEvent(prior.envelope);
      else if (prior) {
        const correction = prior.correction_id
          ? prior.history.items.find(
              (x: { correction?: { correctionId: string } }) =>
                x.correction?.correctionId === prior.correction_id,
            )?.correction
          : null;
        if (prior.correction_id && !correction)
          throw new ExecutionDependency('CORRECTION_HISTORY_REQUIRED');
        const previousOutcome = correction
          ? (
              await c.query(
                `SELECT record FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND outcome_id=$3 AND revision=$4`,
                [company, source, correction.previousOutcomeId, correction.previousRevision],
              )
            ).rows[0]?.record
          : null;
        // Local composite: the arrival retains its actual event identity; recovered outcomes
        // keep their immutable history provenance and never acquire a fabricated sequence.
        priorEvidence = {
          ...n,
          type: correction ? 'outcome.corrected' : 'outcome.recorded',
          outcome: prior.record,
          correction,
          record: prior.record,
          time: prior.record.time,
          event: { ...n.event, payload: { ...n.event.payload, previousOutcome } },
        };
      }
    }
    await applyVisitAndOutcome(
      c,
      cy,
      priorEvidence
        ? {
            ...priorEvidence,
            type: 'current.arrivalRecorded',
            time: n.time,
            event: {
              ...n.event,
              payload: {
                ...n.event.payload,
                previousOutcome: priorEvidence.event.payload.previousOutcome,
              },
            },
          }
        : n,
      round,
      fault,
    );
    if (priorEvidence) {
      n = priorEvidence;
      p = n.record;
    }
  }
  // Per-family revisions remain independent; sequence only orders this recipient task stream.
  const kind = n.outcome ? 'outcome' : n.type.startsWith('current.') ? 'activity' : 'eligibility';
  const rev = n.outcome?.revision ?? Number(p.activityRevision ?? p.revision ?? sequence);
  await state(
    c,
    company,
    source,
    kind,
    n.outcome ? n.attemptId! : n.taskId!,
    rev,
    p,
    n.event.eventId,
  );
  const current = (
    await c.query(
      `SELECT data FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='task' AND identity=$3`,
      [company, source, n.taskId],
    )
  ).rows[0];
  if (!n.correction || !current || current.data.record.attemptId === n.attemptId)
    await state(
      c,
      company,
      source,
      'task',
      n.taskId!,
      sequence,
      { type: n.type, record: p },
      n.event.eventId,
    );
}

export class ProjectionWorker {
  constructor(
    readonly pool: Pool,
    readonly options: { failAfterPosting?: () => void } = {},
  ) {}
  async runOne(): Promise<boolean> {
    // P12 resolves its own result echoes; the ordered pass below incorporates that marker.
    await applyOneDispatchEvent(this.pool);
    const worked = await transaction(this.pool, async (c) => {
      const candidate = (
        await c.query(`SELECT cp.* FROM integration.checkpoint cp
        JOIN integration.inbox b ON(b.company_id,b.source_id,b.aggregate_type,b.aggregate_id,b.recipient_sequence)=
        (cp.company_id,cp.source_id,cp.aggregate_type,cp.aggregate_id,cp.applied_through+1)
        WHERE cp.applied_through<cp.received_through AND (to_jsonb(cp)->>'rebuild_required')::boolean IS DISTINCT FROM true
        ORDER BY cp.updated_at,b.received_at LIMIT 1`)
      ).rows[0];
      if (!candidate) return false;
      // Same source lock as P11/P12 prevents inversion with dispatch acceptance.
      await c.query(`SELECT id FROM integration.source WHERE company_id=$1 AND id=$2 FOR UPDATE`, [
        candidate.company_id,
        candidate.source_id,
      ]);
      const key = [
        candidate.company_id,
        candidate.source_id,
        candidate.aggregate_type,
        candidate.aggregate_id,
      ];
      const cp = (
        await c.query(
          `SELECT * FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 FOR UPDATE`,
          key,
        )
      ).rows[0];
      const row = (
        await c.query(
          `SELECT * FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 AND recipient_sequence=$5 FOR UPDATE`,
          [...key, Number(cp.applied_through) + 1],
        )
      ).rows[0];
      if (!row) return false;
      await c.query('SAVEPOINT execution_event');
      try {
        let n: NormalizedExecutionEvent;
        try {
          n = normalizeExecutionEvent(row.envelope);
        } catch {
          throw new ExecutionDependency('EVENT_SEMANTIC_REVIEW_REQUIRED');
        }
        if (row.application_state !== 'applied')
          await applyExecution(c, row.company_id, row.source_id, n, this.options.failAfterPosting);
        await c.query(
          `INSERT INTO execution.timeline(company_id,source_id,event_id,task_id,round_id,workday_id,event_type,action_id,recorded_at,observed_at,observation,confirmed_at,received_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING`,
          [
            row.company_id,
            row.source_id,
            row.event_id,
            n.taskId,
            n.roundId,
            n.workdayId,
            n.type,
            n.actionId,
            n.time?.recordedAt ?? null,
            n.time?.observation.observedAt ?? null,
            n.time ? JSON.stringify(n.time.observation) : null,
            n.event.committedAt,
            row.received_at,
          ],
        );
        await c.query(
          `UPDATE integration.inbox SET application_state='applied',applied_at=clock_timestamp(),pending_reason='' WHERE company_id=$1 AND source_id=$2 AND event_id=$3`,
          [row.company_id, row.source_id, row.event_id],
        );
        await c.query(
          `UPDATE integration.checkpoint SET applied_through=$5,projected_through=GREATEST(projected_through,$5),updated_at=clock_timestamp() WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4`,
          [...key, row.recipient_sequence],
        );
      } catch (error) {
        if (!(error instanceof ExecutionDependency)) throw error;
        await c.query('ROLLBACK TO SAVEPOINT execution_event');
        await c.query(
          `UPDATE integration.inbox SET pending_reason=$4 WHERE company_id=$1 AND source_id=$2 AND event_id=$3`,
          [row.company_id, row.source_id, row.event_id, error.message],
        );
        await c.query(
          `UPDATE integration.checkpoint SET updated_at=clock_timestamp() WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4`,
          key,
        );
      }
      return true;
    });
    // An observer after COMMIT, on the same database clock as receipt/read observations.
    // This bounds commit visibility; projected_at above is the in-transaction write time.
    await this.pool.query(
      `UPDATE execution.timeline SET projection_commit_observed_at=clock_timestamp() WHERE projection_commit_observed_at IS NULL`,
    );
    return worked;
  }
}
