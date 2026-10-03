import type { TransactionClient } from '../transaction.js';
import type { StockAllocation, UnpackRemaining } from '@shahn/contracts';
export async function readShipmentStock(client: TransactionClient, company: string, id: string) {
  const allocations = (
    await client.query<StockAllocation>(
      `SELECT r.id AS "reservationId",r.branch_id AS "branchId",r.variant_id AS "variantId",concat_ws(' · ',p.name,v.name) AS "variantName",r.quantity::float8 AS quantity,r.active,r.shortage_held AS held,a.revision,GREATEST(0,(SELECT COALESCE(sum(x.quantity),0) FROM inventory.stock_reservation x WHERE (x.company_id,x.branch_id,x.brand_id,x.variant_id)=(r.company_id,r.branch_id,r.brand_id,r.variant_id) AND x.active)-s.sound_on_hand)::float8 AS shortage FROM shipments.stock_allocation a JOIN inventory.stock_reservation r ON (r.company_id,r.id)=(a.company_id,a.reservation_id) JOIN inventory.stock_position s ON (s.company_id,s.branch_id,s.brand_id,s.variant_id)=(r.company_id,r.branch_id,r.brand_id,r.variant_id) JOIN inventory.product_variant v ON (v.company_id,v.id)=(r.company_id,r.variant_id) JOIN inventory.product p ON (p.company_id,p.id)=(v.company_id,v.product_id) WHERE a.company_id=$1 AND a.shipment_id=$2 ORDER BY a.revision,r.variant_id`,
      [company, id],
    )
  ).rows;
  const unpack = (
    await client.query<UnpackRemaining>(
      `SELECT u.id AS "pendingId",u.branch_id AS "branchId",u.variant_id AS "variantId",concat_ws(' · ',p.name,v.name) AS "variantName",u.quantity::float8 AS quantity,(u.quantity-COALESCE(i.sound,0)-COALESCE(i.damaged,0)-COALESCE(i.uncertain,0))::float8 AS remaining,COALESCE(i.sound,0)::float8 AS sound,COALESCE(i.damaged,0)::float8 AS damaged,COALESCE(i.uncertain,0)::float8 AS uncertain FROM shipments.unpack_pending u JOIN inventory.product_variant v ON (v.company_id,v.id)=(u.company_id,u.variant_id) JOIN inventory.product p ON (p.company_id,p.id)=(v.company_id,v.product_id) LEFT JOIN LATERAL(SELECT sum(sound) AS sound,sum(damaged) AS damaged,sum(uncertain) AS uncertain FROM shipments.unpack_inspection i WHERE i.company_id=u.company_id AND i.pending_id=u.id) i ON true WHERE u.company_id=$1 AND u.shipment_id=$2 ORDER BY u.shipment_version,u.variant_id`,
      [company, id],
    )
  ).rows;
  return {
    allocations,
    unpack,
    eligible: allocations.every((a) => !a.active || (!a.held && a.shortage === 0)),
  };
}
