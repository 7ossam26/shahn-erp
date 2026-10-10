import { randomUUID } from 'node:crypto';
import {
  appendShipmentRevision,
  StockPositionRepository,
  safeStockNumber,
  type DispatchItemRow,
} from '@shahn/database';
import type { ShipmentDetail } from '@shahn/contracts';
import { cairoDate } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { reserveStock } from '../inventory/service.js';
/** The native actor asserted an actual whole parcel receipt at A before enqueue.
 * Only accepted withdrawal releases its existing dispatch fence. No Tawsel return
 * receipt is invented and unknown/rejected withdrawals keep goods unavailable. */
export async function acceptPredepartureReceipt(
  u: UnitOfWork,
  item: DispatchItemRow,
  d: ShipmentDetail,
) {
  const receipt = (
    await u.client.query<{ actual_at: Date; snapshot: unknown; command_record_id: string }>(
      'SELECT * FROM dispatch.predeparture_receipt WHERE company_id=$1 AND cycle_id=$2',
      [u.access.companyId, item.cycle_id],
    )
  ).rows[0];
  if (!receipt || !d.handedOver) throw Error('ACTUAL_PREDEPARTURE_RECEIPT_REQUIRED');
  const revision = d.revision + 1,
    source = randomUUID();
  await appendShipmentRevision(
    u.client,
    u.access.companyId,
    d.id,
    revision,
    d.fields,
    d.phoneCanonical,
    d.price,
  );
  if (d.stock.allocations.length)
    await u.client.query(
      `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'order','predeparture-receipt',$3,$4)`,
      [u.access.companyId, source, item.cycle_id, revision],
    );
  for (const a of d.stock.allocations) {
    if (a.active) throw Error('PREDEPARTURE_STOCK_CONFLICT');
    const key = { branchId: a.branchId, brandId: d.fields.brandId, variantId: a.variantId },
      repo = new StockPositionRepository(),
      p = (await repo.lock(u.client, u.access.companyId, [key]))[0]!;
    await u.client.query(
      `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,$4,$5,$6,$7,'sound',$8,0,$9)`,
      [
        u.access.companyId,
        randomUUID(),
        source,
        a.variantId,
        a.branchId,
        d.fields.brandId,
        a.variantId,
        a.quantity,
        cairoDate(receipt.actual_at),
      ],
    );
    await repo.update(
      u.client,
      u.access.companyId,
      p,
      safeStockNumber(p.sound) + a.quantity,
      safeStockNumber(p.unavailable),
    );
    await reserveStock(u, key, {
      sourceId: source,
      kind: 'order',
      lineKey: a.variantId,
      quantity: a.quantity,
    });
    await u.client.query(
      `INSERT INTO shipments.stock_allocation(company_id,shipment_id,revision,brand_id,branch_id,variant_id,reservation_id) SELECT $1,$2,$3,$4,$5,$6,id FROM inventory.stock_reservation WHERE company_id=$1 AND source_id=$7 AND line_key=$6::text`,
      [u.access.companyId, d.id, revision, d.fields.brandId, a.branchId, a.variantId, source],
    );
  }
  const moved = await u.client.query(
    `UPDATE shipments.parcel_custody SET holder='branch',driver_id=NULL,version=version+1 WHERE company_id=$1 AND shipment_id=$2 AND holder='driver' AND branch_id=$3 AND transfer_id IS NULL RETURNING shipment_id`,
    [u.access.companyId, d.id, d.fields.branchId],
  );
  if (!moved.rowCount) throw Error('PREDEPARTURE_CUSTODY_CONFLICT');
  await u.client.query(
    'UPDATE shipments.shipment SET revision=$1,handed_over=false,version=version+1 WHERE company_id=$2 AND id=$3',
    [revision, u.access.companyId, d.id],
  );
}
