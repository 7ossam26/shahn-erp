import type { IncidentCandidate, IncidentSelection } from '@shahn/contracts';
import type { TransactionClient } from '../transaction.js';
import { readShipment } from '../shipments/index.js';
import { safeStockNumber } from '../inventory/index.js';

export const incidentSourceKey = (s: Pick<IncidentSelection, 'kind' | 'sourceId' | 'lineId'>) =>
  s.kind + ':' + s.sourceId + (s.lineId ? ':' + s.lineId : '');
/** Read current physical evidence. It does not infer valuation from recipient debt. */
export async function incidentCandidate(
  c: TransactionClient,
  company: string,
  s: Pick<IncidentSelection, 'kind' | 'sourceId' | 'lineId'>,
): Promise<IncidentCandidate | null> {
  let value: IncidentCandidate;
  const common = {
    kind: s.kind,
    sourceId: s.sourceId,
    lineId: s.lineId,
    key: incidentSourceKey(s),
    returnRequestId: null,
    returnItemId: null,
    returnRevision: null,
    claimed: [],
  };
  if (s.kind === 'shipment_line') {
    if (!s.lineId) return null;
    const d = await readShipment(c, company, s.sourceId),
      l = d?.fields.lines.find((x) => x.id === s.lineId);
    if (!d || !l) return null;
    const pc = (
      await c.query<{
        branch_id: string;
        holder: 'branch' | 'driver';
        driver_id: string | null;
        transfer_id: string | null;
        exterior_condition: string;
      }>('SELECT * FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2', [
        company,
        d.id,
      ])
    ).rows[0];
    if (!pc) return null;
    const returned = (
      await c.query<{ request_id: string; id: string; revision: string; unresolved: number }>(
        `SELECT ri.request_id,ri.id,ri.revision::text,ri.unresolved FROM returns.item ri JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(ri.company_id,ri.cycle_id) WHERE ri.company_id=$1 AND ri.shipment_id=$2 AND ri.source_line_id=$3 AND cy.latest ORDER BY ri.revision DESC LIMIT 1`,
        [company, d.id, l.id],
      )
    ).rows[0];
    const outcome = (
      await c.query<{
        record: {
          lines: { sourceLineId: string; delivered: number; heldReturnRequired: number }[];
        };
      }>(
        `SELECT o.record FROM execution.outcome_fact o JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(o.company_id,o.cycle_id) WHERE o.company_id=$1 AND cy.shipment_id=$2 AND cy.latest ORDER BY (o.record->'time'->>'recordedAt')::timestamptz DESC,o.revision DESC LIMIT 1`,
        [company, d.id],
      )
    ).rows[0];
    const ol = outcome?.record.lines.find((x) => x.sourceLineId === l.id);
    const received = (
      await c.query<{ quantity: string }>(
        `SELECT COALESCE(sum(quantity-consumed),0)::text quantity FROM returns.return_receipt_line WHERE company_id=$1 AND shipment_id=$2 AND source_line_id=$3 AND branch_id=$4`,
        [company, d.id, l.id, pc.branch_id],
      )
    ).rows[0]!;
    const disposed = (
      await c.query<{ quantity: string }>(
        `SELECT COALESCE(sum(a.quantity),0)::text quantity FROM incidents.affected_item a JOIN incidents.disposition d ON(d.company_id,d.affected_item_id)=(a.company_id,a.id) JOIN returns.intent r ON(r.company_id,r.id)=(d.company_id,d.return_intent_id) WHERE a.company_id=$1 AND a.source_key=$2 AND r.state='accepted'`,
        [company, common.key],
      )
    ).rows[0]!;
    const capacity =
      pc.holder === 'driver'
        ? pc.transfer_id
          ? l.quantity
          : (returned?.unresolved ?? (ol ? ol.heldReturnRequired : l.quantity)) +
            Number(disposed.quantity)
        : returned || ol
          ? Number(received.quantity)
          : l.quantity;
    value = {
      ...common,
      brandId: d.fields.brandId,
      branchId: pc.branch_id,
      shipmentId: d.id,
      label: d.reference + ' · ' + l.description,
      capacity,
      holder: pc.holder,
      driverId: pc.driver_id,
      variantId: l.variantId ?? null,
      sourceCondition: pc.exterior_condition === 'sound' ? 'sound' : 'unavailable',
      ...(returned && pc.holder === 'driver' && !pc.transfer_id
        ? {
            returnRequestId: returned.request_id,
            returnItemId: returned.id,
            returnRevision: Number(returned.revision),
          }
        : {}),
    };
  } else if (s.kind === 'stock_movement') {
    if (s.lineId !== null) return null;
    const m = (
      await c.query<{
        brand_id: string;
        branch_id: string;
        variant_id: string;
        quantity: string;
        condition: string;
        label: string;
      }>(
        `SELECT m.brand_id,m.branch_id,m.variant_id,(m.sound_delta+m.unavailable_delta)::text AS quantity,m.condition,p.name||' · '||v.name AS label FROM inventory.stock_movement m JOIN inventory.product_variant v ON(v.company_id,v.id)=(m.company_id,m.variant_id) JOIN inventory.product p ON(p.company_id,p.id)=(v.company_id,v.product_id) WHERE m.company_id=$1 AND m.id=$2 AND m.sound_delta+m.unavailable_delta>0`,
        [company, s.sourceId],
      )
    ).rows[0];
    if (!m) return null;
    value = {
      ...common,
      brandId: m.brand_id,
      branchId: m.branch_id,
      shipmentId: null,
      label: m.label,
      capacity: safeStockNumber(m.quantity),
      holder: 'branch',
      driverId: null,
      variantId: m.variant_id,
      sourceCondition: m.condition === 'sound' ? 'sound' : 'unavailable',
    };
  } else {
    if (s.lineId !== null) return null;
    const l = (
      await c.query<{
        brand_id: string;
        shipment_id: string | null;
        variant_id: string | null;
        remaining: number;
        quantity: number;
        source_branch_id: string;
        driver_id: string;
        reference: string;
        kind: string;
      }>(
        `SELECT l.*,m.source_branch_id,m.driver_id,m.reference FROM goods_transfer.line l JOIN goods_transfer.manifest m ON(m.company_id,m.id)=(l.company_id,l.manifest_id) WHERE l.company_id=$1 AND l.id=$2 AND m.state='in_transit'`,
        [company, s.sourceId],
      )
    ).rows[0];
    if (!l || l.kind === 'parcel') return null; // Parcel piece claims use shipment lines after actual receiving inspection.
    value = {
      ...common,
      brandId: l.brand_id,
      branchId: l.source_branch_id,
      shipmentId: l.shipment_id,
      label: 'نقل ' + l.reference,
      capacity:
        l.remaining +
        Number(
          (
            await c.query<{ quantity: string }>(
              `SELECT COALESCE(sum(a.quantity),0)::text quantity FROM incidents.affected_item a JOIN incidents.incident i ON(i.company_id,i.id)=(a.company_id,a.incident_id) WHERE a.company_id=$1 AND a.source_key=$2 AND i.state='confirmed' AND i.kind='loss'`,
              [company, common.key],
            )
          ).rows[0]!.quantity,
        ),
      holder: 'driver',
      driverId: l.driver_id,
      variantId: l.variant_id,
      sourceCondition: 'sound',
    };
  }
  value.claimed = (
    await c.query<{ offset: string; quantity: string }>(
      'SELECT unit_offset::text AS offset,quantity::text FROM incidents.affected_item WHERE company_id=$1 AND source_key=$2 AND NOT released ORDER BY unit_offset',
      [company, value.key],
    )
  ).rows.map((x) => ({ offset: safeStockNumber(x.offset), quantity: safeStockNumber(x.quantity) }));
  return value;
}
export async function assertNoIncidentHold(
  c: TransactionClient,
  company: string,
  shipment: string,
) {
  // Supports populated pre-P18 upgrade fixtures; production API requires current migrations.
  if (
    !(await c.query("SELECT to_regclass('incidents.shipment_hold') AS relation")).rows[0].relation
  )
    return true;
  return !(
    await c.query(
      `SELECT 1 FROM incidents.shipment_hold h JOIN incidents.incident i
       ON(i.company_id,i.id)=(h.company_id,h.incident_id)
       WHERE h.company_id=$1 AND h.shipment_id=$2 AND i.state<>'dismissed'`,
      [company, shipment],
    )
  ).rowCount;
}
