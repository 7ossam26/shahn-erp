import type { Pool } from 'pg';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { AccessError } from '@shahn/domain';
import { dispatchSource } from '../dispatch/dispatch.service.js';
import { queueReturnIntent } from './receipt.service.js';
/** Only an owning incident/adjustment service may persist this decision in its existing transaction.
 * It has no public decision-creation route and authorizes no compensation or deduction. */
export interface ApprovedReturnDisposition {
  decisionId: string;
  incidentId: string;
  requestId: string;
  branchId: string;
  disposition: 'lost' | 'damaged';
  items: { itemId: string; expectedRevision: number; quantity: number }[];
}
export async function recordApprovedDisposition(
  u: UnitOfWork,
  decision: ApprovedReturnDisposition,
) {
  u.assertBranch(decision.branchId);
  const s = await dispatchSource(u.client, u.access.companyId);
  await u.client.query(
    `INSERT INTO returns.disposition_decision(company_id,id,source_id,request_id,incident_id,decision,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [
      u.access.companyId,
      decision.decisionId,
      s.id,
      decision.requestId,
      decision.incidentId,
      JSON.stringify(decision),
      u.access.principalId,
    ],
  );
}
export async function queueDisposition(
  pool: Pool,
  u: UnitOfWork,
  requestId: string,
  branchId: string,
  decisionId: string,
  recordId: string,
) {
  const d = (
    await u.client.query<{ decision: ApprovedReturnDisposition }>(
      `SELECT decision FROM returns.disposition_decision WHERE company_id=$1 AND id=$2 AND request_id=$3`,
      [u.access.companyId, decisionId, requestId],
    )
  ).rows[0]?.decision;
  if (!d || d.branchId !== branchId) throw new AccessError('APPROVED_DISPOSITION_REQUIRED', 409);
  return queueReturnIntent(
    pool,
    u,
    { requestId, branchId, observedAt: new Date().toISOString(), items: d.items },
    recordId,
    { kind: d.disposition, decisionId },
  );
}
