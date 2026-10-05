import { transferView } from '@shahn/database';
import { AccessError, cairoDayRange } from '@shahn/domain';
import type { GoodsTransferDesk } from '@shahn/contracts';
import type { UnitOfWork } from '../kernel/unit-of-work.js';

export interface TransferFilter {
  branchId?: string;
  sourceBranchId?: string;
  destinationBranchId?: string;
  driverId?: string;
  brandId?: string;
  kind?: 'all' | 'parcel' | 'loose';
  state?: 'all' | 'prepared' | 'in_transit' | 'closed' | 'cancelled';
  search?: string;
  dateBasis?: 'handover' | 'receipt';
  from?: string;
  to?: string;
  discrepancy?: boolean;
  page?: number;
}
export async function eligibleTransferContents(u: UnitOfWork, branchId: string) {
  u.assertBranch(branchId);
  const stock = (
    await u.client.query<{
      brandId: string;
      brandName: string;
      variantId: string;
      variantName: string;
      sound: string;
      reserved: string;
    }>(
      `SELECT p.brand_id AS "brandId",b.name AS "brandName",p.variant_id AS "variantId",v.name AS "variantName",
     p.sound_on_hand::text AS sound,COALESCE(sum(r.quantity),0)::text AS reserved
     FROM inventory.stock_position p JOIN commercial.brand b ON(b.company_id,b.id)=(p.company_id,p.brand_id)
     JOIN inventory.product_variant v ON(v.company_id,v.id)=(p.company_id,p.variant_id)
     LEFT JOIN inventory.stock_reservation r ON(r.company_id,r.branch_id,r.brand_id,r.variant_id)=(p.company_id,p.branch_id,p.brand_id,p.variant_id) AND r.active
     WHERE p.company_id=$1 AND p.branch_id=$2 AND p.sound_on_hand>0 AND v.active
     GROUP BY p.company_id,p.branch_id,p.brand_id,p.variant_id,b.name,v.name
     HAVING p.sound_on_hand>COALESCE(sum(r.quantity),0) ORDER BY b.name,v.name`,
      [u.access.companyId, branchId],
    )
  ).rows.map((r) => ({
    brandId: r.brandId,
    brandName: r.brandName,
    variantId: r.variantId,
    variantName: r.variantName,
    available: Number(BigInt(r.sound) - BigInt(r.reserved)),
  }));
  const parcels = (
    await u.client.query<{
      shipmentId: string;
      reference: string;
      brandId: string;
      brandName: string;
      version: number;
      service: string;
      returned: boolean;
    }>(
      `SELECT s.id AS "shipmentId",s.reference,s.brand_id AS "brandId",b.name AS "brandName",s.version,
     v.fields->>'service' AS service,s.handed_over AS returned
     FROM shipments.shipment s JOIN shipments.revision v ON(v.company_id,v.shipment_id,v.revision)=(s.company_id,s.id,s.revision)
     JOIN commercial.brand b ON(b.company_id,b.id)=(s.company_id,s.brand_id)
     LEFT JOIN shipments.parcel_claim cl ON(cl.company_id,cl.shipment_id)=(s.company_id,s.id)
     LEFT JOIN shipments.parcel_custody pc ON(pc.company_id,pc.shipment_id)=(s.company_id,s.id)
     WHERE s.company_id=$1 AND s.branch_id=$2 AND s.state='active' AND s.preparation<>'awaiting_preparation'
     AND ((NOT s.handed_over AND cl.shipment_id IS NULL AND pc.holder='branch' AND pc.exterior_condition='sound')
       OR (s.handed_over AND cl.kind='dispatch' AND NOT EXISTS(
         SELECT 1 FROM shipments.line l WHERE l.company_id=s.company_id AND l.shipment_id=s.id AND l.revision=s.revision
         AND l.quantity<>(SELECT COALESCE(sum(rr.quantity),0) FROM returns.return_receipt_line rr
           JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(rr.company_id,rr.cycle_id)
           WHERE rr.company_id=s.company_id AND rr.shipment_id=s.id AND rr.source_line_id=l.id::text
             AND rr.branch_id=$2 AND rr.condition='sound' AND rr.consumed=0 AND cy.latest))))
     ORDER BY s.reference`,
      [u.access.companyId, branchId],
    )
  ).rows;
  return { stock, parcels };
}
export async function transferDesk(
  u: UnitOfWork,
  screen: 'send' | 'receive' | 'source_return',
  f: TransferFilter,
): Promise<GoodsTransferDesk> {
  if (f.branchId) u.assertBranch(f.branchId);
  if (f.from && f.to && f.from > f.to) throw new AccessError('INVALID_DATE_RANGE', 400);
  const page = f.page ?? 1;
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
    throw new AccessError('VALIDATION_FAILED', 400);
  const branches = u.access.assignedBranches.map((b) => b.id);
  const from = f.from ? cairoDayRange(f.from).start : null,
    to = f.to ? cairoDayRange(f.to).end : null;
  const scopedColumn = screen === 'receive' ? 'm.destination_branch_id' : 'm.source_branch_id';
  const where = `m.company_id=$1 AND ${scopedColumn}=ANY($2::uuid[])
    AND($3::uuid IS NULL OR ${scopedColumn}=$3)
    AND($4::uuid IS NULL OR m.source_branch_id=$4)
    AND($5::uuid IS NULL OR m.destination_branch_id=$5)
    AND($6::uuid IS NULL OR m.driver_id=$6)
    AND($7::uuid IS NULL OR EXISTS(SELECT 1 FROM goods_transfer.line l WHERE l.company_id=m.company_id AND l.manifest_id=m.id AND l.brand_id=$7))
    AND($8='all' OR EXISTS(SELECT 1 FROM goods_transfer.line l WHERE l.company_id=m.company_id AND l.manifest_id=m.id AND l.kind=$8))
    AND($9='all' OR m.state=$9)
    AND($10='' OR m.reference=$10 OR EXISTS(SELECT 1 FROM goods_transfer.line l JOIN shipments.shipment s ON(s.company_id,s.id)=(l.company_id,l.shipment_id) WHERE l.company_id=m.company_id AND l.manifest_id=m.id AND s.reference=$10))
    AND(NOT $11::boolean OR (m.state='in_transit' AND EXISTS(SELECT 1 FROM goods_transfer.line l WHERE l.company_id=m.company_id AND l.manifest_id=m.id AND l.remaining>0)))
    AND($12::timestamptz IS NULL OR (CASE WHEN $14='handover' THEN (SELECT actual_at FROM goods_transfer.action_fact a WHERE a.company_id=m.company_id AND a.manifest_id=m.id AND a.kind='handover') ELSE (SELECT max(actual_at) FROM goods_transfer.receipt r WHERE r.company_id=m.company_id AND r.manifest_id=m.id) END)>=$12)
    AND($13::timestamptz IS NULL OR (CASE WHEN $14='handover' THEN (SELECT actual_at FROM goods_transfer.action_fact a WHERE a.company_id=m.company_id AND a.manifest_id=m.id AND a.kind='handover') ELSE (SELECT max(actual_at) FROM goods_transfer.receipt r WHERE r.company_id=m.company_id AND r.manifest_id=m.id) END)<$13)`;
  const args = [
    u.access.companyId,
    branches,
    f.branchId ?? null,
    f.sourceBranchId ?? null,
    f.destinationBranchId ?? null,
    f.driverId ?? null,
    f.brandId ?? null,
    f.kind ?? 'all',
    f.state ?? 'all',
    f.search?.trim() ?? '',
    f.discrepancy ?? false,
    from,
    to,
    f.dateBasis ?? 'handover',
  ];
  const ids = (
    await u.client.query<{ id: string }>(
      `SELECT m.id FROM goods_transfer.manifest m WHERE ${where} ORDER BY m.created_at DESC,m.id DESC LIMIT 25 OFFSET $15`,
      [...args, (page - 1) * 25],
    )
  ).rows;
  const total = Number(
    (
      await u.client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM goods_transfer.manifest m WHERE ${where}`,
        args,
      )
    ).rows[0]!.total,
  );
  const items = [];
  for (const row of ids) {
    const view = await transferView(u.client, u.access.companyId, row.id);
    if (view) items.push(view);
  }
  const drivers = (
    await u.client.query<{ id: string; name: string; branchId: string }>(
      `SELECT id,name,branch_id AS "branchId" FROM employees.operational_driver WHERE company_id=$1 AND active ORDER BY name,id`,
      [u.access.companyId],
    )
  ).rows.map((d) => ({
    ...d,
    atSourceBranch: null,
    round: null,
    evidenceAt: null,
    status: 'unknown' as const,
  }));
  const brands = (
    await u.client.query<{ id: string; name: string }>(
      `SELECT id,name FROM commercial.brand WHERE company_id=$1 ORDER BY name,id`,
      [u.access.companyId],
    )
  ).rows;
  return {
    assignedBranches: u.access.assignedBranches,
    companyBranches: u.access.companyBranches,
    brands,
    drivers,
    items,
    total,
    page,
  };
}
