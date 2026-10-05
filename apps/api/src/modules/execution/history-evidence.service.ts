import { randomUUID, createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { sourceByCompany } from '@shahn/database';
import { AccessError } from '@shahn/domain';
import { tawselValidator } from '@shahn/contracts/tawsel';
import type { OutcomeRecord, CorrectionRecord } from '@shahn/contracts/execution';
import { canonical } from '../access/crypto.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { MonitoringReader, type MonitoringRead } from './monitoring-reader.service.js';
import {
  applyVisitAndOutcome,
  executionCycle,
  ExecutionDependency,
} from './visit-facts.service.js';
/** Read through the permitted source endpoint. No event ID or recipient sequence is invented. */
export class HistoryEvidenceService {
  constructor(
    readonly pool: Pool,
    readonly reader: MonitoringReader,
  ) {}
  async refresh(token: string, company: string, taskId: string) {
    const history = await this.reader.read(token, company, 'tasks', taskId);
    return this.applyFetched(token, company, taskId, history);
  }
  async applyFetched(token: string, company: string, taskId: string, history: MonitoringRead) {
    if (
      history.stale ||
      !history.body ||
      history.body.nextCursor !== null ||
      history.body.resourceId !== taskId
    )
      throw new AccessError('COMPLETE_HISTORY_REQUIRED', 409);
    const retainedHistory = await UnitOfWork.run(
      this.pool,
      token,
      company,
      'integration',
      async (u) => {
        const s = await sourceByCompany(u.client, company, true);
        if (!s) throw new AccessError('SOURCE_NOT_READY', 409);
        const h = history.body!;
        // Only a body retained by the authorized complete-page reader can enter this gate.
        const retained = (
          await u.client.query(
            `SELECT 1 FROM execution.monitoring_cache WHERE company_id=$1 AND source_id=$2 AND path=$3 AND body=$4::jsonb`,
            [company, s.id, `/api/v1/erp/monitoring/tasks/${taskId}/history?`, JSON.stringify(h)],
          )
        ).rowCount;
        if (!retained) throw new AccessError('AUTHORIZED_HISTORY_REQUIRED', 409);
        const digest = createHash('sha256').update(canonical(h)).digest('hex');
        await u.client.query(
          `INSERT INTO execution.source_evidence(company_id,source_id,id,scope_key,snapshot_revision,resource_id,digest,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
          [
            company,
            s.id,
            randomUUID(),
            h.scopeKey,
            h.snapshotRevision,
            taskId,
            digest,
            JSON.stringify(h),
          ],
        );
        const evidenceId = (
          await u.client.query(
            `SELECT id FROM execution.source_evidence WHERE company_id=$1 AND source_id=$2 AND resource_id=$3 AND digest=$4`,
            [company, s.id, taskId, digest],
          )
        ).rows[0].id as string;
        const records = (h.items ?? [])
            .filter((x) => x.kind === 'outcome')
            .map((x) => x.outcome as unknown as OutcomeRecord),
          corrections = (h.items ?? [])
            .filter((x) => x.kind === 'correction')
            .map((x) => x.correction as unknown as CorrectionRecord);
        const corrected = new Set(corrections.map((x) => x.outcome.outcomeId));
        const ordered = [
          ...records
            .filter((x) => !corrected.has(x.outcomeId))
            .map((outcome) => ({ outcome, correction: null as CorrectionRecord | null })),
          ...corrections.map((correction) => ({ outcome: correction.outcome, correction })),
        ].sort((a, b) => a.outcome.revision - b.outcome.revision);
        return { source: s, evidenceId, ordered, records };
      },
    );
    const { source: s, evidenceId, ordered, records } = retainedHistory;
    const pending: string[] = [];
    // Each semantic fact owns one transaction and one kernel lock sequence.
    // A later dependency cannot undo an earlier durably recovered fact.
    for (const { outcome, correction } of ordered) {
      try {
        await UnitOfWork.run(this.pool, token, company, 'integration', async (u) => {
          const currentSource = await sourceByCompany(u.client, company, true);
          if (currentSource?.id !== s.id) throw new AccessError('SOURCE_CHANGED', 409);
          if (
            !tawselValidator('outcomes.schema.json#/$defs/Record')(outcome) ||
            outcome.taskId !== taskId ||
            outcome.sourceReference?.tenantId !== s.tenant_id ||
            outcome.sourceReference.integrationId !== s.integration_id
          )
            throw new AccessError('HISTORY_IDENTITY_CONFLICT', 409);
          const cy = await executionCycle(u.client, company, s.id, taskId),
            round = (
              await u.client.query(
                `SELECT data FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round' AND identity=$3`,
                [company, s.id, outcome.roundId],
              )
            ).rows[0]?.data;
          if (
            !round ||
            round.driverId !== outcome.driverId ||
            round.workdayId !== outcome.workdayId ||
            !round.taskIds.includes(taskId)
          )
            throw new ExecutionDependency('ROUND_HISTORY_REQUIRED');
          const previous = correction
            ? records.find(
                (x) =>
                  x.outcomeId === correction.previousOutcomeId &&
                  x.revision === correction.previousRevision,
              )
            : undefined;
          if (correction && !previous)
            throw new ExecutionDependency('PREDECESSOR_OUTCOME_REQUIRED');
          await applyVisitAndOutcome(
            u.client,
            cy,
            {
              type: correction ? 'outcome.corrected' : 'outcome.recorded',
              outcome,
              correction,
              attemptId: outcome.attemptId,
              driverId: outcome.driverId,
              roundId: outcome.roundId,
              time: outcome.time,
              event: { eventId: null, payload: { previousOutcome: previous ?? null } },
              evidenceId,
            },
            round,
          );
        });
      } catch (e) {
        if (!(e instanceof ExecutionDependency)) throw e;
        pending.push(e.message);
      }
    }
    return { evidenceId, pending };
  }
}
