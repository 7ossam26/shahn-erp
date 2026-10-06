import type { ShipmentFields, ShipmentPrice, ApprovedShippingWaiver } from '@shahn/contracts';
import { AccessError, assertCapability } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
/** Called by ordinary intake, before its stock locks. Client zero shipping is never authority. */
export async function authorizeReplacement(
  u: UnitOfWork,
  fields: ShipmentFields,
): Promise<ShipmentPrice['incidentAgreement']> {
  const agreement = fields.replacement;
  if (!agreement) return undefined;
  assertCapability(u.access, 'incidents');
  const r = (
    await u.client.query<{
      id: string;
      brand_id: string;
      custody_branch_id: string;
      responsible_branch_id: string;
      original: string | null;
    }>(
      `SELECT c.id,i.brand_id,i.custody_branch_id,i.responsible_branch_id,(SELECT a.snapshot->>'shipmentId' FROM incidents.affected_item a WHERE a.company_id=i.company_id AND a.incident_id=i.id AND a.snapshot->>'shipmentId' IS NOT NULL ORDER BY a.id LIMIT 1) AS original FROM incidents.incident i JOIN incidents.confirmation c ON(c.company_id,c.incident_id)=(i.company_id,i.id) WHERE i.company_id=$1 AND i.id=$2 AND i.state='confirmed' AND NOT EXISTS(SELECT 1 FROM incidents.review r WHERE r.company_id=i.company_id AND r.incident_id=i.id) FOR SHARE OF i`,
      [u.access.companyId, agreement.incidentId],
    )
  ).rows[0];
  if (!r || r.brand_id !== fields.brandId)
    throw new AccessError('CONFIRMED_INCIDENT_REQUIRED', 409);
  u.assertBranch(r.custody_branch_id);
  u.assertBranch(r.responsible_branch_id);
  if (
    !agreement.reason.trim() ||
    fields.shippingPayer !== (agreement.payer === 'brand' ? 'brand' : 'recipient') ||
    fields.recipientShippingDue !== null
  )
    throw new AccessError('REPLACEMENT_PAYER_MISMATCH', 409);
  return {
    incidentId: agreement.incidentId,
    confirmationId: r.id,
    originalShipmentId: r.original,
    payer: agreement.payer,
    reason: agreement.reason,
  };
}
export async function recordReplacement(u: UnitOfWork, shipmentId: string, price: ShipmentPrice) {
  const a = price.incidentAgreement;
  if (!a) return;
  await u.client.query(
    'INSERT INTO incidents.replacement(company_id,shipment_id,incident_id,confirmation_id,original_shipment_id,payer,agreement_reason,price_snapshot,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [
      u.access.companyId,
      shipmentId,
      a.incidentId,
      a.confirmationId,
      a.originalShipmentId,
      a.payer,
      a.reason,
      JSON.stringify(price),
      u.access.principalId,
    ],
  );
}
/** Immutable creation agreement, independent of later incident/profile edits. */
export async function replacementWaiver(
  u: UnitOfWork,
  shipmentId: string,
): Promise<ApprovedShippingWaiver | undefined> {
  if (
    !(await u.client.query("SELECT to_regclass('incidents.replacement') AS relation")).rows[0]
      .relation
  )
    return undefined;
  const r = (
    await u.client.query<{
      incident_id: string;
      confirmation_id: string;
      original_shipment_id: string | null;
    }>(
      `SELECT * FROM incidents.replacement WHERE company_id=$1 AND shipment_id=$2 AND payer='company'`,
      [u.access.companyId, shipmentId],
    )
  ).rows[0];
  return r
    ? {
        incidentId: r.incident_id,
        approvalId: r.confirmation_id,
        originalShipmentId: r.original_shipment_id,
        replacementShipmentId: shipmentId,
      }
    : undefined;
}
