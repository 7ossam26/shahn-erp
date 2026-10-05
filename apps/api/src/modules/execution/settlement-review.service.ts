import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { AccessError } from '@shahn/domain';
/** P16/P17/P20 join their own posting transaction after locking source/visit/brand. */
export async function protectVisitBasis(
  u: UnitOfWork,
  visitId: string,
  kind: 'remittance' | 'payout' | 'payroll',
  referenceId: string,
) {
  const visit = (
    await u.client.query(
      `SELECT * FROM execution.visit_fact WHERE company_id=$1 AND id=$2 FOR UPDATE`,
      [u.access.companyId, visitId],
    )
  ).rows[0];
  if (!visit) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(visit.branch_id);
  if (
    (
      await u.client.query(
        `SELECT 1 FROM execution.settlement_review WHERE company_id=$1 AND visit_id=$2 AND state='open'`,
        [u.access.companyId, visitId],
      )
    ).rowCount
  )
    throw new AccessError('SETTLEMENT_REVIEW_REQUIRED', 409);
  await u.client.query(
    `INSERT INTO execution.protected_basis(company_id,visit_id,kind,reference_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
    [u.access.companyId, visitId, kind, referenceId],
  );
}
export interface SettlementResolution {
  reviewId: string;
  resolutionSourceId: string;
  linkedAdjustmentIds: string[];
  holdReleaseIds: string[];
}
/** P21 must supply its authorized typed adjustment transaction; no public automatic resolution. */
export async function resolveSettlementReview(u: UnitOfWork, resolution: SettlementResolution) {
  const r = (
    await u.client.query(
      `SELECT r.*,v.branch_id FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id) WHERE r.company_id=$1 AND r.id=$2 FOR UPDATE OF r`,
      [u.access.companyId, resolution.reviewId],
    )
  ).rows[0];
  if (!r) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(r.branch_id);
  if (r.state !== 'open') throw new AccessError('REVIEW_ALREADY_RESOLVED', 409);
  if (!resolution.linkedAdjustmentIds.length)
    throw new AccessError('LINKED_RESOLUTION_REQUIRED', 409);
  const count = (
    await u.client.query(
      `SELECT count(*)::int n FROM kernel.journal_effect WHERE company_id=$1 AND source_id=$2 AND id=ANY($3::uuid[]) AND kind='correction' AND branch_id=$4 AND supersedes_id=ANY($5::uuid[])`,
      [
        u.access.companyId,
        resolution.resolutionSourceId,
        resolution.linkedAdjustmentIds,
        r.branch_id,
        [r.basis.previous?.goods_effect_id, r.basis.previous?.fee_effect_id].filter(Boolean),
      ],
    )
  ).rows[0].n;
  if (count !== resolution.linkedAdjustmentIds.length)
    throw new AccessError('LINKED_RESOLUTION_REQUIRED', 409);
  const holds = (
    await u.client.query(
      `SELECT h.id,hr.source_id AS release_source FROM kernel.wallet_hold h JOIN kernel.source_record sr ON(sr.company_id,sr.id)=(h.company_id,h.source_id) LEFT JOIN kernel.hold_release hr ON(hr.company_id,hr.hold_id)=(h.company_id,h.id) WHERE h.company_id=$1 AND sr.system='execution' AND sr.kind='outcome' AND sr.revision=$2 AND h.lot_id=$3`,
      [
        u.access.companyId,
        String(r.basis.outcome.revision),
        r.basis.previous?.goods_effect_id ?? null,
      ],
    )
  ).rows;
  if (
    holds.length !== new Set(resolution.holdReleaseIds).size ||
    holds.some(
      (h) =>
        !resolution.holdReleaseIds.includes(h.id) ||
        h.release_source !== resolution.resolutionSourceId,
    )
  )
    throw new AccessError('LINKED_HOLD_RELEASE_REQUIRED', 409);
  await u.client.query(
    `INSERT INTO execution.review_resolution(company_id,review_id,source_record_id,details) VALUES($1,$2,$3,$4)`,
    [
      u.access.companyId,
      resolution.reviewId,
      resolution.resolutionSourceId,
      JSON.stringify(resolution),
    ],
  );
  await u.client.query(
    `UPDATE execution.settlement_review SET state='resolved',resolved_at=clock_timestamp() WHERE company_id=$1 AND id=$2 AND state='open'`,
    [u.access.companyId, resolution.reviewId],
  );
}
