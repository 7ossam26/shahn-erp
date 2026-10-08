import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError, type Capability } from '@shahn/domain';
import { canonical } from '../access/crypto.js';
import { canonicalTawselJson } from '@shahn/contracts/tawsel';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { sourceByCompany } from '@shahn/database';
import { MonitoringReader, type MonitoringRead } from './monitoring-reader.service.js';
export interface RoundEvidenceBasis {
  revision: string;
  digest: string;
  roundId: string;
  expectedRecipientMinor: string;
  blockers: string[];
  receivedEvidenceOnly: true;
  basis: Record<string, unknown>;
}
export class RoundEvidenceService {
  constructor(
    readonly pool: Pool,
    readonly reader: MonitoringReader,
    readonly capability: Capability = 'integration',
  ) {}
  async refresh(token: string, company: string, roundId: string): Promise<RoundEvidenceBasis> {
    const options = { capability: this.capability };
    const trip = await this.reader.read(token, company, 'trips', roundId, options);
    const workdayId = trip.body?.round?.workdayId;
    const day = workdayId
      ? await this.reader.read(token, company, 'workdays', workdayId, options)
      : null;
    const known = await UnitOfWork.run(
      this.pool,
      token,
      company,
      this.capability,
      async (u) =>
        (
          await u.client.query(
            `SELECT st.data,cl.data AS closure FROM execution.state st JOIN integration.source s ON(s.company_id,s.id)=(st.company_id,st.source_id) LEFT JOIN execution.state cl ON (cl.company_id,cl.source_id,cl.identity)=(st.company_id,st.source_id,st.identity) AND cl.kind='round.ended' WHERE st.company_id=$1 AND st.kind='round' AND st.identity=$2`,
            [company, roundId],
          )
        ).rows.flatMap((r) => [
          ...(r.data?.taskIds ?? []),
          ...(r.closure?.tasks ?? []).map((t: { taskId: string }) => t.taskId),
        ]) as string[],
    );
    const dayTasks = (day?.body?.items ?? []).flatMap((x) => {
      const fact = (x.outcome ?? x.attempt) as { roundId?: string; taskId?: string } | undefined;
      return fact?.roundId === roundId && fact.taskId ? [fact.taskId] : [];
    });
    const taskIds = [
      ...new Set<string>([
        ...known,
        ...dayTasks,
        ...(trip.body?.items ?? []).map((x) => String(x.taskId)),
      ]),
    ].sort();
    const histories: (MonitoringRead & { taskId: string })[] = [];
    let denied = [401, 403].includes(trip.status) || [401, 403].includes(day?.status ?? 0);
    for (const id of taskIds) {
      if (denied) break;
      const history = await this.reader.read(token, company, 'tasks', id, options);
      histories.push({ taskId: id, ...history });
      denied = [401, 403].includes(history.status);
    }
    return UnitOfWork.run(this.pool, token, company, this.capability, async (u) => {
      const s = await sourceByCompany(u.client, company, true);
      if (!s) throw new AccessError('SOURCE_NOT_READY', 409);
      const blockers: string[] = [];
      if (trip.stale || !trip.body) blockers.push('TRIP_EVIDENCE_UNAVAILABLE');
      if (!day || day.stale || !day.body) blockers.push('WORKDAY_EVIDENCE_UNAVAILABLE');
      if (histories.some((h) => h.stale || !h.body)) blockers.push('TASK_HISTORY_INCOMPLETE');
      if (denied || histories.length !== taskIds.length) blockers.push('TASK_HISTORY_INCOMPLETE');
      const closure = (
        await u.client.query(
          `SELECT data,event_id FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round.ended' AND identity=$3`,
          [company, s.id, roundId],
        )
      ).rows[0];
      if (!closure) blockers.push('ACCEPTED_CLOSURE_REQUIRED');
      const checkpoints = (
        await u.client.query(
          `SELECT aggregate_type,aggregate_id,received_through::text,received_high::text,applied_through::text,projected_through::text,snapshot_through::text,history_complete FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 AND (aggregate_id=$3 OR aggregate_id=$4 OR aggregate_id=ANY($5::uuid[])) ORDER BY aggregate_type,aggregate_id`,
          [company, s.id, roundId, workdayId ?? null, taskIds],
        )
      ).rows;
      if (
        checkpoints.some(
          (c) =>
            c.received_through !== c.received_high ||
            c.applied_through !== c.received_through ||
            !c.history_complete,
        )
      )
        blockers.push('KNOWN_STREAM_GAP');
      const outcomes = (
        await u.client.query(
          `SELECT DISTINCT ON(attempt_id) task_id,cycle_id,attempt_id,outcome_id,revision::text,record FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND round_id=$3 ORDER BY attempt_id,revision DESC`,
          [company, s.id, roundId],
        )
      ).rows;
      const fetched = histories
        .flatMap((h) =>
          (h.body?.items ?? [])
            .filter((x) => x.kind === 'outcome' && x.effective)
            .map((x) => x.outcome as Record<string, unknown>),
        )
        .filter((o) => o.roundId === roundId);
      if (
        fetched.length !== outcomes.length ||
        fetched.some(
          (o) =>
            !outcomes.some(
              (x) => x.outcome_id === o.outcomeId && Number(x.revision) === o.revision,
            ),
        )
      )
        blockers.push('HISTORY_PROJECTION_DIFFERENCE');
      const dayOutcomes = (day?.body?.items ?? [])
        .filter((x) => x.kind === 'outcome' && x.effective)
        .map((x) => x.outcome as Record<string, unknown>)
        .filter((o) => o.roundId === roundId);
      if (
        dayOutcomes.length !== outcomes.length ||
        dayOutcomes.some(
          (o) =>
            !outcomes.some(
              (x) => x.outcome_id === o.outcomeId && Number(x.revision) === o.revision,
            ),
        )
      )
        blockers.push('WORKDAY_HISTORY_DIFFERENCE');
      if (
        (trip.body?.items ?? []).some(
          (t) =>
            t.outcome !== null &&
            !outcomes.some(
              (o) =>
                o.task_id === t.taskId &&
                o.attempt_id === t.attemptId &&
                Number(o.revision) === t.outcomeRevision,
            ),
        )
      )
        blockers.push('TRIP_OUTCOME_DIFFERENCE');
      const reviews = (
        await u.client.query(
          `SELECT r.id FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id) WHERE r.company_id=$1 AND v.source_id=$2 AND v.round_id=$3 AND r.state='open' ORDER BY r.id`,
          [company, s.id, roundId],
        )
      ).rows;
      if (reviews.length) blockers.push('SETTLEMENT_REVIEW_REQUIRED');
      const expected = outcomes
        .reduce((sum, o) => sum + BigInt(o.record.collection.reported?.amountMinor ?? 0), 0n)
        .toString();
      const version = (r: typeof trip | null) =>
        r?.body
          ? { scopeKey: r.body.scopeKey, snapshotRevision: r.body.snapshotRevision, body: r.body }
          : null;
      // Exclude refresh/observation wall clocks from the semantic digest.
      const stable = (value: unknown): unknown =>
        Array.isArray(value)
          ? value.map(stable)
          : value && typeof value === 'object'
            ? Object.fromEntries(
                Object.entries(value)
                  .filter(([k]) => k !== 'freshness')
                  .map(([k, v]) => [k, stable(v)]),
              )
            : value;
      const basis = stable({
        roundId,
        workdayId: workdayId ?? null,
        taskIds,
        closure: closure ?? null,
        checkpoints,
        outcomes,
        reviews,
        trip: version(trip),
        day: version(day),
        histories: histories.map((h) => ({ taskId: h.taskId, evidence: version(h) })),
        expectedRecipientMinor: expected,
        blockers,
        receivedEvidenceOnly: true,
      }) as Record<string, unknown>;
      const digest = createHash('sha256').update(canonicalTawselJson(basis)).digest('hex');
      const previous = (
        await u.client.query(
          `SELECT revision::text,digest FROM execution.round_evidence_basis WHERE company_id=$1 AND source_id=$2 AND round_id=$3 ORDER BY revision DESC LIMIT 1`,
          [company, s.id, roundId],
        )
      ).rows[0];
      const revision =
        previous?.digest === digest
          ? previous.revision
          : (BigInt(previous?.revision ?? '0') + 1n).toString();
      if (previous?.digest !== digest)
        await u.client.query(
          `INSERT INTO execution.round_evidence_basis(company_id,source_id,round_id,revision,digest,basis) VALUES($1,$2,$3,$4,$5,$6)`,
          [company, s.id, roundId, revision, digest, JSON.stringify(basis)],
        );
      return {
        revision,
        digest,
        roundId,
        expectedRecipientMinor: expected,
        blockers,
        receivedEvidenceOnly: true,
        basis,
      };
    });
  }
}
/** P16 calls after a fresh authorized refresh, in its posting UnitOfWork under the source lock. */
export async function assertRoundEvidenceBasis(
  u: UnitOfWork,
  roundId: string,
  revision: string,
  digest: string,
) {
  const source = await sourceByCompany(u.client, u.access.companyId, true);
  if (!source) throw new AccessError('SOURCE_NOT_READY', 409);
  const saved = (
    await u.client.query(
      `SELECT * FROM execution.round_evidence_basis WHERE company_id=$1 AND source_id=$2 AND round_id=$3 ORDER BY revision DESC LIMIT 1`,
      [u.access.companyId, source.id, roundId],
    )
  ).rows[0];
  if (
    !saved ||
    String(saved.revision) !== revision ||
    saved.digest !== digest ||
    saved.basis.blockers.length
  )
    throw new AccessError('ROUND_BASIS_CHANGED_OR_INCOMPLETE', 409);
  const now = (
    await u.client.query(
      `SELECT DISTINCT ON(attempt_id) task_id,cycle_id,attempt_id,outcome_id,revision::text,record FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND round_id=$3 ORDER BY attempt_id,revision DESC`,
      [u.access.companyId, source.id, roundId],
    )
  ).rows;
  const gaps = (
    await u.client.query(
      `SELECT 1 FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 AND (aggregate_id=$3 OR aggregate_id=$4 OR aggregate_id=ANY($5::uuid[])) AND (received_through<>received_high OR applied_through<>received_through OR NOT history_complete)`,
      [u.access.companyId, source.id, roundId, saved.basis.workdayId, saved.basis.taskIds],
    )
  ).rowCount;
  const reviews = (
    await u.client.query(
      `SELECT r.id FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id) WHERE r.company_id=$1 AND v.source_id=$2 AND v.round_id=$3 AND r.state='open' ORDER BY r.id`,
      [u.access.companyId, source.id, roundId],
    )
  ).rows;
  const closure = (
    await u.client.query(
      `SELECT data,event_id FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round.ended' AND identity=$3`,
      [u.access.companyId, source.id, roundId],
    )
  ).rows[0];
  if (
    gaps ||
    canonical(now) !== canonical(saved.basis.outcomes) ||
    canonical(reviews) !== canonical(saved.basis.reviews) ||
    canonical(closure ?? null) !== canonical(saved.basis.closure)
  )
    throw new AccessError('ROUND_BASIS_CHANGED_OR_INCOMPLETE', 409);
}
