import { type ReturnDesk, type ReturnFilter, type ReturnRequestView } from '@shahn/contracts';
import { returnItems, type ReturnRequestRow } from '@shahn/database';
import { AccessError, cairoDayRange } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
export async function returnDesk(
  u: UnitOfWork,
  f: ReturnFilter | null,
  id?: string,
): Promise<ReturnDesk> {
  const company = u.access.companyId;
  const branches = u.access.assignedBranches;
  const drivers = (
    await u.client.query(
      `SELECT id,name FROM employees.operational_driver WHERE company_id=$1 ORDER BY name,id`,
      [company],
    )
  ).rows;
  const brands = (
    await u.client.query(
      `SELECT id,name FROM commercial.brand WHERE company_id=$1 ORDER BY name,id`,
      [company],
    )
  ).rows;
  if (!f && !id) return { branches, drivers, brands, items: [], total: 0, page: 1 };
  if (f) {
    u.assertBranch(f.branchId);
    if (f.from && f.to && f.from > f.to) throw new AccessError('INVALID_DATE_RANGE', 400);
  }
  const records = (
    await u.client.query<ReturnRequestRow & { branch_name: string; driver_name: string }>(
      `SELECT r.*,b.name AS branch_name,d.name AS driver_name FROM returns.request r JOIN access.branch b ON(b.company_id,b.id)=(r.company_id,r.branch_id) JOIN employees.operational_driver d ON(d.company_id,d.id)=(r.company_id,r.driver_id) WHERE r.company_id=$1 AND r.branch_id=ANY($2::uuid[]) AND ($3::uuid IS NULL OR r.id=$3) AND ($4::uuid IS NULL OR r.branch_id=$4 AND r.driver_id=$5) ORDER BY r.requested_at DESC,r.id`,
      [company, branches.map((b) => b.id), id ?? null, f?.branchId ?? null, f?.driverId ?? null],
    )
  ).rows;
  if (id && !records.length) throw new AccessError('NOT_FOUND', 404);
  const data: ReturnRequestView[] = [];
  for (const r of records) {
    const items: ReturnRequestView['items'] = [];
    for (const i of await returnItems(u.client, company, r.source_id, r.id)) {
      const sh = (
        await u.client.query(
          `SELECT s.reference,v.fields->>'service' AS service,s.brand_id,b.name AS brand_name,l.description FROM shipments.shipment s JOIN shipments.revision v ON(v.company_id,v.shipment_id,v.revision)=(s.company_id,s.id,s.revision) JOIN commercial.brand b ON(b.company_id,b.id)=(s.company_id,s.brand_id) JOIN shipments.line l ON(l.company_id,l.shipment_id,l.revision)=(s.company_id,s.id,s.revision) WHERE s.company_id=$1 AND s.id=$2 AND l.id::text=$3`,
          [company, i.shipment_id, i.source_line_id],
        )
      ).rows[0];
      const observations = (
        await u.client.query(
          `SELECT n.id,n.state,o.quantity,o.condition,n.observed_at AS "observedAt",n.last_error AS "lastError" FROM returns.observation_line o JOIN returns.intent n ON(n.company_id,n.id)=(o.company_id,o.intent_id) WHERE o.company_id=$1 AND o.source_id=$2 AND o.item_id=$3 ORDER BY n.created_at`,
          [company, r.source_id, i.id],
        )
      ).rows.map((o) => ({ ...o, observedAt: o.observedAt.toISOString() }));
      const receipts = (
        await u.client.query(
          `SELECT l.id,l.quantity,l.consumed,l.condition,l.version,r.accepted_at AS "receivedAt",COALESCE((SELECT jsonb_agg(jsonb_build_object('branchId',m.destination_branch_id,'branchName',b.name,'quantity',a.quantity)) FROM returns.receipt_allocation a JOIN goods_transfer.manifest m ON(m.company_id,m.id)=(a.company_id,a.owner_id) JOIN access.branch b ON(b.company_id,b.id)=(m.company_id,m.destination_branch_id) WHERE a.company_id=l.company_id AND a.receipt_line_id=l.id AND a.kind='transfer' AND m.state='closed' AND m.destination_branch_id=ANY($4::uuid[]) AND EXISTS(SELECT 1 FROM goods_transfer.line tl JOIN goods_transfer.receipt tr ON(tr.company_id,tr.manifest_id)=(tl.company_id,tl.manifest_id) JOIN goods_transfer.receipt_line dr ON(dr.company_id,dr.receipt_id,dr.line_id)=(tr.company_id,tr.id,tl.id) WHERE tl.company_id=m.company_id AND tl.manifest_id=m.id AND tr.kind='destination' AND dr.sound=tl.quantity AND dr.damaged=0 AND dr.uncertain=0 AND NOT dr.suspected_internal_issue AND (tl.shipment_id=l.shipment_id OR tl.kind='loose' AND (tl.brand_id,tl.variant_id)=(l.brand_id,l.variant_id))) AND NOT EXISTS(SELECT 1 FROM dispatch.transferred_return_allocation x WHERE x.company_id=l.company_id AND x.receipt_line_id=l.id)),'[]'::jsonb) AS "transferredTo" FROM returns.return_receipt_line l JOIN returns.return_receipt r ON(r.company_id,r.id)=(l.company_id,l.receipt_id) WHERE l.company_id=$1 AND l.source_id=$2 AND l.item_id=$3 ORDER BY r.accepted_at,l.id`,
          [company, r.source_id, i.id, branches.map((b) => b.id)],
        )
      ).rows.map((x) => ({ ...x, receivedAt: x.receivedAt.toISOString() }));
      const sourceVersion = (
        await u.client.query(
          "SELECT configuration->>'interopVersion' AS version FROM integration.source WHERE company_id=$1 AND id=$2",
          [company, r.source_id],
        )
      ).rows[0]?.version;
      if (sourceVersion !== '2.0.0') for (const receipt of receipts) receipt.transferredTo = [];
      else
        for (const receipt of receipts) {
          for (const destination of receipt.transferredTo) {
            const witness = (
              await u.client.query<{ owner_id: string; kind: string }>(
                `SELECT a.owner_id,tl.kind FROM returns.receipt_allocation a JOIN goods_transfer.manifest m ON(m.company_id,m.id)=(a.company_id,a.owner_id) JOIN goods_transfer.line tl ON(tl.company_id,tl.manifest_id)=(m.company_id,m.id) WHERE a.company_id=$1 AND a.receipt_line_id=$2 AND a.kind='transfer' AND m.state='closed' AND m.destination_branch_id=$3 AND (tl.kind='parcel' AND tl.shipment_id=$4 OR tl.kind='loose' AND (tl.brand_id,tl.variant_id)=(SELECT brand_id,variant_id FROM returns.return_receipt_line WHERE company_id=$1 AND id=$2)) ORDER BY m.created_at DESC LIMIT 1`,
                [company, receipt.id, destination.branchId, i.shipment_id],
              )
            ).rows[0]!;
            destination.wholeParcel = witness.kind === 'parcel';
            destination.contents =
              witness.kind === 'parcel'
                ? (
                    await u.client.query(
                      `SELECT l.id AS "receiptLineId",l.version AS "expectedVersion",a.quantity,sl.description FROM returns.receipt_allocation a JOIN returns.return_receipt_line l ON(l.company_id,l.id)=(a.company_id,a.receipt_line_id) JOIN shipments.shipment s ON(s.company_id,s.id)=(l.company_id,l.shipment_id) JOIN shipments.line sl ON(sl.company_id,sl.shipment_id,sl.revision,sl.id::text)=(s.company_id,s.id,s.revision,l.source_line_id) WHERE a.company_id=$1 AND a.kind='transfer' AND a.owner_id=$2 AND l.shipment_id=$3 ORDER BY l.source_line_id,l.id`,
                      [company, witness.owner_id, i.shipment_id],
                    )
                  ).rows
                : [];
          }
        }
      if (f) {
        if (f.brands.length && !f.brands.includes(sh.brand_id)) continue;
        const digits = (v: string) =>
          v
            .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
            .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776));
        if (f.search && !digits(sh.reference).includes(digits(f.search.trim()))) continue;
        if (
          (f.state === 'unresolved' && !i.unresolved) ||
          (f.state === 'received' && !i.received) ||
          (f.state === 'settled' && i.unresolved) ||
          (f.state === 'pending' && !observations.some((o) => o.state === 'pending'))
        )
          continue;
        if (
          f.condition !== 'all' &&
          !receipts.some((x) => x.condition === f.condition) &&
          !observations.some((x) => x.condition === f.condition)
        )
          continue;
        const dates =
          f.dateBasis === 'request'
            ? [r.requested_at]
            : receipts.map((x) => new Date(x.receivedAt));
        if (
          (f.from || f.to) &&
          !dates.some(
            (date) =>
              (!f.from || date >= new Date(cairoDayRange(f.from).start)) &&
              (!f.to || date < new Date(cairoDayRange(f.to).end)),
          )
        )
          continue;
      }
      items.push({
        id: i.id,
        shipmentId: i.shipment_id,
        cycleId: i.cycle_id,
        reference: sh.reference,
        description: sh.description,
        brandId: sh.brand_id,
        brandName: sh.brand_name,
        inspection: sh.service === 'stored_stock' ? 'counted-pieces' : 'parcel-exterior',
        current: i.current_data,
        observations,
        receipts,
      });
    }
    if (items.length)
      data.push({
        id: r.id,
        branchId: r.branch_id,
        branchName: r.branch_name,
        driverId: r.driver_id,
        driverName: r.driver_name,
        requestedAt: r.requested_at.toISOString(),
        checkedAt: r.checked_at.toISOString(),
        dispositions: (
          await u.client.query(
            `SELECT id,decision->>'disposition' AS kind,incident_id AS "incidentId",decision->'items' AS items FROM returns.disposition_decision WHERE company_id=$1 AND source_id=$2 AND request_id=$3 ORDER BY recorded_at,id`,
            [company, r.source_id, r.id],
          )
        ).rows,
        items,
      });
  }
  const page = f?.page ?? 1;
  return {
    branches,
    drivers,
    brands,
    items: data.slice((page - 1) * 25, page * 25),
    total: data.length,
    page,
  };
}
