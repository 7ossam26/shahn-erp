import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { sourceByCompany } from '@shahn/database';
import { AccessError, addMinor, minor } from '@shahn/domain';
import type { RemittanceScope, RemittanceSource, RemittanceWitness } from '@shahn/contracts';
import { canonical, digest } from '../../access/crypto.js';
import { UnitOfWork } from '../../kernel/unit-of-work.js';
import { MonitoringReader } from '../../execution/monitoring-reader.service.js';
import {
  RoundEvidenceService,
  assertRoundEvidenceBasis,
} from '../../execution/round-evidence.service.js';

export async function authorizeRound(u: UnitOfWork, scope: RemittanceScope) {
  u.assertBranch(scope.branchId);
  const row = (
    await u.client.query<{ source_id: string; data: { driverId: string; taskIds: string[] } }>(
      `SELECT st.source_id,st.data FROM execution.state st JOIN integration.binding b
     ON b.company_id=st.company_id AND b.source_id=st.source_id AND b.entity='driver' AND b.resource_id=(st.data->>'driverId')::uuid
     WHERE st.company_id=$1 AND st.kind='round' AND st.identity=$2 AND b.native_id=$3`,
      [u.access.companyId, scope.roundId, scope.driverId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  const outside = await u.client.query(
    `SELECT 1 FROM dispatch.cycle c WHERE c.company_id=$1 AND c.source_id=$2 AND c.task_id=ANY($3::uuid[]) AND NOT(c.branch_id=ANY($4::uuid[]))`,
    [
      u.access.companyId,
      row.source_id,
      row.data.taskIds,
      u.access.assignedBranches.map((b) => b.id),
    ],
  );
  if (outside.rowCount) throw new AccessError('FORBIDDEN_SCOPE');
  return row;
}
export async function currentSources(
  u: UnitOfWork,
  sourceId: string,
  roundId: string,
): Promise<RemittanceSource[]> {
  const rows = (
    await u.client.query<RemittanceSource>(
      `WITH effective AS (
    SELECT DISTINCT ON(attempt_id) * FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND round_id=$3 ORDER BY attempt_id,revision DESC)
    SELECT o.task_id AS "taskId",o.cycle_id AS "cycleId",o.attempt_id AS "attemptId",o.outcome_id AS "outcomeId",o.revision::text AS "outcomeRevision",
    v.id AS "visitId",s.brand_id AS "brandId",c.branch_id AS "branchId",c.shipment_id AS "shipmentId",s.reference AS "shipmentReference",
    m.reported_minor::text AS "reportedMinor",m.goods_minor::text AS "goodsMinor",m.shipping_minor::text AS "shippingMinor",a.goods_effect_id AS "creditLotId",
    EXISTS(SELECT 1 FROM finance.remittance_source rs WHERE rs.company_id=o.company_id AND rs.source_id=o.source_id AND rs.task_id=o.task_id AND rs.cycle_id=o.cycle_id AND rs.attempt_id=o.attempt_id) AS covered
    FROM effective o JOIN dispatch.cycle c ON(c.company_id,c.id)=(o.company_id,o.cycle_id)
    JOIN shipments.shipment s ON(s.company_id,s.id)=(c.company_id,c.shipment_id)
    JOIN execution.reported_money_fact m ON(m.company_id,m.source_id,m.outcome_id,m.revision)=(o.company_id,o.source_id,o.outcome_id,o.revision)
    LEFT JOIN execution.visit_fact v ON(v.company_id,v.source_id,v.task_id,v.attempt_id)=(o.company_id,o.source_id,o.task_id,o.attempt_id)
    LEFT JOIN execution.allocation a ON(a.company_id,a.visit_id,a.outcome_id,a.outcome_revision)=(o.company_id,v.id,o.outcome_id,o.revision)
    ORDER BY o.task_id,o.attempt_id`,
      [u.access.companyId, sourceId, roundId],
    )
  ).rows;
  for (const r of rows) u.assertBranch(r.branchId);
  return rows;
}
export function expectedSources(sources: RemittanceSource[]) {
  return sources
    .filter((s) => !s.covered)
    .reduce((sum, s) => addMinor(sum, minor(s.reportedMinor ?? '0', 'nonnegative')), 0n)
    .toString();
}
export async function readWitness(u: UnitOfWork, id: string): Promise<RemittanceWitness> {
  const row = (
    await u.client.query<RemittanceWitness>(
      `SELECT id,company_id AS "companyId",driver_id AS "driverId",round_id AS "roundId",branch_id AS "branchId",revision::text,digest,expected_minor::text AS "expectedMinor",blockers,sources,created_at AS "createdAt",basis_revision::text AS "basisRevision",basis_digest AS "basisDigest",true AS "receivedEvidenceOnly" FROM finance.remittance_witness WHERE company_id=$1 AND id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  await authorizeRound(u, row);
  for (const s of row.sources) u.assertBranch(s.branchId);
  return row;
}
export class RemittanceEvidenceService {
  readonly basis: RoundEvidenceService;
  constructor(
    readonly pool: Pool,
    reader: MonitoringReader,
  ) {
    this.basis = new RoundEvidenceService(pool, reader, 'remittances');
  }
  async refresh(token: string, scope: RemittanceScope) {
    await UnitOfWork.run(this.pool, token, scope.companyId, 'remittances', (u) =>
      authorizeRound(u, scope),
    );
    // Every HTTP page is fetched before acquiring financial locks.
    const basis = await this.basis.refresh(token, scope.companyId, scope.roundId);
    return UnitOfWork.run(this.pool, token, scope.companyId, 'remittances', async (u) => {
      const source = await sourceByCompany(u.client, scope.companyId, true);
      if (!source) throw new AccessError('SOURCE_NOT_READY', 409);
      await authorizeRound(u, scope);
      const sources = await currentSources(u, source.id, scope.roundId),
        blockers = [...basis.blockers];
      if (!blockers.length)
        await assertRoundEvidenceBasis(u, scope.roundId, basis.revision, basis.digest);
      const trip = basis.basis.trip as {
        body?: {
          driverId?: string;
          round?: { roundId?: string; workdayId?: string; endedAt?: string | null };
        };
      } | null;
      const closure = (
        basis.basis.closure as {
          data?: {
            driverId?: string;
            endedRoundId?: string;
            workdayId?: string;
            roundEndedAt?: string;
          };
        } | null
      )?.data;
      const state = (await authorizeRound(u, scope)).data;
      if (
        trip?.body?.driverId !== state.driverId ||
        !trip.body.round?.endedAt ||
        closure?.driverId !== state.driverId ||
        closure?.endedRoundId !== scope.roundId ||
        closure?.workdayId !== trip.body.round.workdayId ||
        Date.parse(closure?.roundEndedAt ?? '') !== Date.parse(trip.body.round.endedAt)
      )
        blockers.push('ROUND_END_EVIDENCE_CONFLICT');
      if (sources.some((s) => !s.covered && BigInt(s.reportedMinor ?? '0') > 0n && !s.visitId))
        blockers.push('VISIT_EVIDENCE_REQUIRED');
      if (sources.some((s) => !s.covered && BigInt(s.goodsMinor) > 0n && !s.creditLotId))
        blockers.push('GOODS_CREDIT_BASIS_REQUIRED');
      if (
        sources.some(
          (s) =>
            s.reportedMinor !== null &&
            BigInt(s.reportedMinor) !== BigInt(s.goodsMinor) + BigInt(s.shippingMinor),
        )
      )
        blockers.push('PAYMENT_COMPONENT_CONFLICT');
      const expected = expectedSources(sources),
        semantic = {
          ...scope,
          basisRevision: basis.revision,
          basisDigest: basis.digest,
          sources,
          expected,
          blockers,
        };
      const hash = digest(canonical(semantic));
      const previous = (
        await u.client.query<{ id: string; revision: string; digest: string }>(
          `SELECT id,revision::text,digest FROM finance.remittance_witness WHERE company_id=$1 AND source_id=$2 AND round_id=$3 AND branch_id=$4 ORDER BY revision DESC LIMIT 1`,
          [scope.companyId, source.id, scope.roundId, scope.branchId],
        )
      ).rows[0];
      const id = previous?.digest === hash ? previous.id : randomUUID();
      if (previous?.digest !== hash)
        await u.client.query(
          `INSERT INTO finance.remittance_witness(company_id,id,source_id,round_id,driver_id,branch_id,revision,basis_revision,basis_digest,digest,expected_minor,basis,sources,blockers,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [
            scope.companyId,
            id,
            source.id,
            scope.roundId,
            scope.driverId,
            scope.branchId,
            (BigInt(previous?.revision ?? '0') + 1n).toString(),
            basis.revision,
            basis.digest,
            hash,
            expected,
            JSON.stringify(basis.basis),
            JSON.stringify(sources),
            JSON.stringify(blockers),
            u.access.principalId,
          ],
        );
      const refreshId = randomUUID();
      await u.client.query(
        `INSERT INTO finance.remittance_refresh(company_id,id,witness_id,actor_id) VALUES($1,$2,$3,$4)`,
        [scope.companyId, refreshId, id, u.access.principalId],
      );
      return { witness: await readWitness(u, id), refreshId };
    });
  }
}
