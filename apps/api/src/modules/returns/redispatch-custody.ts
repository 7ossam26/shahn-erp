import { randomUUID } from 'node:crypto';
import {
  StockPositionRepository,
  positionKey,
  safeStockNumber,
  type ReceiptLineRow,
} from '@shahn/database';
import { AccessError, cairoDate } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { releaseStockReservation } from '../inventory/service.js';
type Allocation = ReceiptLineRow & {
  allocated: number;
  reservation_id: string | null;
  active: boolean | null;
  shortage_held: boolean | null;
};
export async function assertRedispatchGoods(u: UnitOfWork, cycle: string) {
  const rows = (
    await u.client.query<Allocation>(
      `SELECT l.*,a.quantity AS allocated,a.reservation_id,r.active,r.shortage_held FROM returns.receipt_allocation a JOIN returns.return_receipt_line l ON(l.company_id,l.id)=(a.company_id,a.receipt_line_id) LEFT JOIN inventory.stock_reservation r ON(r.company_id,r.id)=(a.company_id,a.reservation_id) WHERE a.company_id=$1 AND a.cycle_id=$2 AND a.kind='redispatch' ORDER BY l.branch_id,l.brand_id,l.variant_id,l.id`,
      [u.access.companyId, cycle],
    )
  ).rows;
  if (
    !rows.length ||
    rows.some((l) => l.condition !== 'sound' || (l.variant_id && (!l.active || l.shortage_held)))
  )
    throw new AccessError('RETURN_STOCK_UNAVAILABLE', 409);
  for (const l of rows) u.assertBranch(l.branch_id);
  const keys = rows
    .filter((l) => l.variant_id)
    .map((l) => ({ branchId: l.branch_id, brandId: l.brand_id, variantId: l.variant_id! }));
  for (const k of keys) u.lockOrder('stock', positionKey(k));
  const pos = await new StockPositionRepository().lock(u.client, u.access.companyId, keys);
  if (pos.some((p) => safeStockNumber(p.sound) < safeStockNumber(p.reserved)))
    throw new AccessError('RETURN_STOCK_UNAVAILABLE', 409);
  return rows;
}
export async function handoverRedispatchGoods(u: UnitOfWork, cycle: string, receivedAt: string) {
  const rows = await assertRedispatchGoods(u, cycle),
    repo = new StockPositionRepository(),
    source = randomUUID();
  if (rows.some((l) => l.variant_id))
    await u.client.query(
      `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'order','redispatch-handover',$3,1)`,
      [u.access.companyId, source, cycle],
    );
  for (const l of rows.filter((l) => l.variant_id)) {
    const key = { branchId: l.branch_id, brandId: l.brand_id, variantId: l.variant_id! };
    await releaseStockReservation(u, key, l.reservation_id!, source);
    const pos = (await repo.lock(u.client, u.access.companyId, [key]))[0]!;
    await u.client.query(
      `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,$4,$5,$6,$7,'sound',$8,0,$9)`,
      [
        u.access.companyId,
        randomUUID(),
        source,
        l.id,
        l.branch_id,
        l.brand_id,
        l.variant_id,
        -l.allocated,
        cairoDate(new Date(receivedAt)),
      ],
    );
    await repo.update(
      u.client,
      u.access.companyId,
      pos,
      safeStockNumber(pos.sound) - l.allocated,
      safeStockNumber(pos.unavailable),
    );
  }
}
