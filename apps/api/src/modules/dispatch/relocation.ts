import { AccessError } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import type { IntegrationSource } from '@shahn/database';
import { readyBinding } from './dispatch.service.js';
import type { SourceConfiguration } from '@shahn/contracts/tawsel';

export async function actualParcelTransfer(
  u: UnitOfWork,
  s: IntegrationSource,
  shipment: string,
  originBranch: string,
  destinationBranch: string,
) {
  const config = s.configuration as SourceConfiguration;
  if (config.interopVersion !== '2.0.0') throw new AccessError('TAWSEL_CHECK_003', 409);
  const witness = (
    await u.client.query<{ transferId: string; destinationReceiptId: string; lineId: string }>(
      `SELECT m.id AS "transferId",r.id AS "destinationReceiptId",l.id AS "lineId" FROM goods_transfer.manifest m JOIN goods_transfer.line l ON(l.company_id,l.manifest_id)=(m.company_id,m.id) JOIN goods_transfer.receipt r ON(r.company_id,r.manifest_id)=(m.company_id,m.id) JOIN goods_transfer.receipt_line rl ON(rl.company_id,rl.receipt_id,rl.line_id)=(r.company_id,r.id,l.id) WHERE m.company_id=$1 AND l.shipment_id=$2 AND m.source_branch_id=$3 AND m.destination_branch_id=$4 AND m.state='closed' AND r.kind='destination' AND rl.sound=1 AND rl.damaged=0 AND rl.uncertain=0 AND NOT rl.suspected_internal_issue AND EXISTS(SELECT 1 FROM goods_transfer.action_fact f WHERE f.company_id=m.company_id AND f.manifest_id=m.id AND f.kind='handover') ORDER BY r.actual_at DESC LIMIT 1`,
      [u.access.companyId, shipment, originBranch, destinationBranch],
    )
  ).rows[0];
  if (!witness) throw new AccessError('ACTUAL_DESTINATION_RECEIPT_REQUIRED', 409);
  const custody = (
    await u.client.query(
      `SELECT 1 FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2 AND branch_id=$3 AND holder='branch' AND transfer_id IS NULL AND exterior_condition='sound'`,
      [u.access.companyId, shipment, destinationBranch],
    )
  ).rowCount;
  if (!custody) throw new AccessError('BRANCH_CUSTODY_REQUIRED', 409);
  const origin = await readyBinding(u.client, u.access.companyId, s.id, 'branch', originBranch);
  return {
    ...witness,
    sourceBranchExternalId: origin.external_id,
    receivedAtDestination: true as const,
  };
}
