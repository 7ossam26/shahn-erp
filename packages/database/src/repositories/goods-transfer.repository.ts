import type { TransactionClient } from '../transaction.js';
import type {
  GoodsTransferView,
  GoodsTransferLineView,
  GoodsTransferIncidentCandidate,
} from '@shahn/contracts';

export interface ManifestRow {
  company_id: string;
  id: string;
  reference: string;
  source_branch_id: string;
  destination_branch_id: string;
  driver_id: string;
  state: GoodsTransferView['state'];
  version: number;
  planned_at: Date;
  created_at: Date;
  handover_at: Date | null;
  source_branch_name: string;
  destination_branch_name: string;
  driver_name: string;
}
export interface TransferLineRow {
  id: string;
  manifest_id: string;
  kind: 'parcel' | 'loose';
  brand_id: string;
  shipment_id: string | null;
  variant_id: string | null;
  quantity: number;
  remaining: number;
  reservation_id: string | null;
  prior_dispatch_owner_id: string | null;
}
export async function readManifest(
  client: TransactionClient,
  company: string,
  id: string,
  lock = false,
): Promise<ManifestRow | undefined> {
  const row = (
    await client.query<ManifestRow>(
      `SELECT m.*,sb.name AS source_branch_name,db.name AS destination_branch_name,d.name AS driver_name,
       (SELECT actual_at FROM goods_transfer.action_fact a WHERE a.company_id=m.company_id AND a.manifest_id=m.id AND a.kind='handover') AS handover_at
       FROM goods_transfer.manifest m JOIN access.branch sb ON(sb.company_id,sb.id)=(m.company_id,m.source_branch_id)
       JOIN access.branch db ON(db.company_id,db.id)=(m.company_id,m.destination_branch_id)
       JOIN employees.operational_driver d ON(d.company_id,d.id)=(m.company_id,m.driver_id)
       WHERE m.company_id=$1 AND m.id=$2 ${lock ? 'FOR UPDATE OF m' : ''}`,
      [company, id],
    )
  ).rows[0];
  return row;
}
export async function readTransferLines(
  client: TransactionClient,
  company: string,
  manifestId: string,
) {
  return (
    await client.query<TransferLineRow>(
      `SELECT id,manifest_id,kind,brand_id,shipment_id,variant_id,quantity,remaining,reservation_id,prior_dispatch_owner_id
       FROM goods_transfer.line WHERE company_id=$1 AND manifest_id=$2 ORDER BY id`,
      [company, manifestId],
    )
  ).rows;
}
export async function transferView(
  client: TransactionClient,
  company: string,
  id: string,
): Promise<GoodsTransferView | undefined> {
  const m = await readManifest(client, company, id);
  if (!m) return undefined;
  const lines = (
    await client.query<
      GoodsTransferLineView & {
        brand_name: string;
        shipment_reference: string | null;
        variant_name: string | null;
      }
    >(
      `SELECT l.id,l.kind,l.brand_id AS "brandId",b.name AS "brandName",l.shipment_id AS "shipmentId",s.reference AS "shipmentReference",
       l.variant_id AS "variantId",v.name AS "variantName",l.quantity,l.remaining
       FROM goods_transfer.line l JOIN commercial.brand b ON(b.company_id,b.id)=(l.company_id,l.brand_id)
       LEFT JOIN shipments.shipment s ON(s.company_id,s.id)=(l.company_id,l.shipment_id)
       LEFT JOIN inventory.product_variant v ON(v.company_id,v.id)=(l.company_id,l.variant_id)
       WHERE l.company_id=$1 AND l.manifest_id=$2 ORDER BY l.id`,
      [company, id],
    )
  ).rows;
  const receipts = (
    await client.query<{
      id: string;
      kind: 'destination' | 'source_return';
      branchId: string;
      actorName: string;
      actualAt: Date;
      lines: {
        lineId: string;
        sound: number;
        damaged: number;
        uncertain: number;
        inspection: 'counted-pieces' | 'parcel-exterior';
        suspectedInternalIssue: boolean;
      }[];
    }>(
      `SELECT r.id,r.kind,r.branch_id AS "branchId",r.actor_name AS "actorName",r.actual_at AS "actualAt",
       COALESCE(jsonb_agg(jsonb_build_object('lineId',l.line_id,'sound',l.sound,'damaged',l.damaged,'uncertain',l.uncertain,
       'inspection',l.inspection,'suspectedInternalIssue',l.suspected_internal_issue) ORDER BY l.line_id) FILTER(WHERE l.line_id IS NOT NULL),'[]') AS lines
       FROM goods_transfer.receipt r LEFT JOIN goods_transfer.receipt_line l ON(l.company_id,l.receipt_id)=(r.company_id,r.id)
       WHERE r.company_id=$1 AND r.manifest_id=$2 GROUP BY r.company_id,r.id ORDER BY r.recorded_at,r.id`,
      [company, id],
    )
  ).rows;
  return {
    id: m.id,
    reference: m.reference,
    sourceBranchId: m.source_branch_id,
    sourceBranchName: m.source_branch_name,
    destinationBranchId: m.destination_branch_id,
    destinationBranchName: m.destination_branch_name,
    driverId: m.driver_id,
    driverName: m.driver_name,
    state: m.state,
    version: m.version,
    plannedAt: m.planned_at.toISOString(),
    createdAt: m.created_at.toISOString(),
    handoverAt: m.handover_at?.toISOString() ?? null,
    lines,
    receipts: receipts.map((r) => ({ ...r, actualAt: r.actualAt.toISOString() })),
  };
}
/** Incident/settlement readers consume facts; they must decide liability in their own workflow. */
export async function transferIncidentCandidates(
  client: TransactionClient,
  company: string,
  manifestId: string,
): Promise<GoodsTransferIncidentCandidate[]> {
  return (
    await client.query<GoodsTransferIncidentCandidate>(
      `SELECT m.id AS "manifestId",l.id AS "lineId",l.shipment_id AS "shipmentId",
      m.source_branch_id AS "sourceBranchId",m.destination_branch_id AS "destinationBranchId",
      m.driver_id AS "driverId",l.remaining AS "carrierRemaining",
      EXISTS(SELECT 1 FROM goods_transfer.receipt_line rl JOIN goods_transfer.receipt r
        ON(r.company_id,r.id)=(rl.company_id,rl.receipt_id)
        WHERE rl.company_id=l.company_id AND rl.line_id=l.id AND r.manifest_id=m.id
          AND rl.suspected_internal_issue) AS "suspectedInternalIssue"
     FROM goods_transfer.manifest m JOIN goods_transfer.line l ON(l.company_id,l.manifest_id)=(m.company_id,m.id)
     WHERE m.company_id=$1 AND m.id=$2 AND m.state IN ('in_transit','closed')
       AND (l.remaining>0 OR EXISTS(SELECT 1 FROM goods_transfer.receipt_line rl
         WHERE rl.company_id=l.company_id AND rl.line_id=l.id AND rl.suspected_internal_issue))
     ORDER BY l.id`,
      [company, manifestId],
    )
  ).rows;
}
