import { randomUUID } from 'node:crypto';
import {
  receiptLines,
  StockPositionRepository,
  positionKey,
  safeStockNumber,
  type ReceiptLineRow,
} from '@shahn/database';
import type { ReceiptAllocation, ReturnCommand } from '@shahn/contracts';
import { AccessError, cairoDate } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
/** Shared P15 consumer: caller holds integration source (if present), then receipt/request and shipment locks.
 * Receipt allocations and stock position locks serialize against redispatch and physical handover. */
export async function lockReceiptAllocation(
  u: UnitOfWork,
  branch: string,
  selections: ReceiptAllocation[],
) {
  u.assertBranch(branch);
  if (
    !selections.length ||
    new Set(selections.map((s) => s.receiptLineId)).size !== selections.length
  )
    throw new AccessError('DUPLICATE_RECEIPT_ALLOCATION', 400);
  // Materialize the same source lock used by canonical acceptance/correction before aggregates.
  await u.client.query(`SELECT id FROM integration.source WHERE company_id=$1 FOR UPDATE`, [
    u.access.companyId,
  ]);
  const preview = await receiptLines(
    u.client,
    u.access.companyId,
    selections.map((s) => s.receiptLineId),
  );
  if (preview.length !== selections.length) throw new AccessError('NOT_FOUND', 404);
  for (const id of [...new Set(preview.map((l) => l.shipment_id))].sort()) {
    u.lockOrder('aggregate', 'shipment:' + id);
    await u.client.query(
      `SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE`,
      [u.access.companyId, id],
    );
  }
  const rows = await receiptLines(
    u.client,
    u.access.companyId,
    selections.map((s) => s.receiptLineId),
    true,
  );
  for (const l of rows) {
    const a = selections.find((x) => x.receiptLineId === l.id)!;
    u.assertBranch(l.branch_id);
    if (l.branch_id !== branch) throw new AccessError('TAWSEL_CHECK_003', 409);
    if (l.version !== a.expectedVersion) throw new AccessError('RECEIPT_ALLOCATION_CONFLICT', 409);
    if (l.condition !== 'sound') throw new AccessError('RETURN_CONDITION_UNAVAILABLE', 409);
    if (!Number.isSafeInteger(a.quantity) || a.quantity < 1 || a.quantity > l.quantity - l.consumed)
      throw new AccessError('RETURN_ALREADY_ALLOCATED', 409);
  }
  const keys = rows
    .filter((l) => l.variant_id)
    .map((l) => ({ branchId: l.branch_id, brandId: l.brand_id, variantId: l.variant_id! }))
    .sort((a, b) => positionKey(a).localeCompare(positionKey(b)));
  for (const k of keys) u.lockOrder('stock', positionKey(k));
  const positions = await new StockPositionRepository().lock(u.client, u.access.companyId, keys);
  for (const p of positions) {
    const required = rows
      .filter(
        (l) =>
          l.variant_id === p.variantId && l.branch_id === p.branchId && l.brand_id === p.brandId,
      )
      .reduce((n, l) => n + selections.find((x) => x.receiptLineId === l.id)!.quantity, 0);
    if (safeStockNumber(p.sound) - safeStockNumber(p.reserved) < required)
      throw new AccessError('RETURN_STOCK_UNAVAILABLE', 409);
  }
  return rows;
}
export async function consumeReceiptAllocation(
  u: UnitOfWork,
  rows: ReceiptLineRow[],
  selections: ReceiptAllocation[],
  kind: 'redispatch' | 'transfer' | 'brand-handover',
  owner: string,
  cycle: string | null = null,
) {
  for (const l of rows) {
    const a = selections.find((x) => x.receiptLineId === l.id)!;
    await u.client.query(
      `UPDATE returns.return_receipt_line SET consumed=consumed+$1,version=version+1 WHERE company_id=$2 AND id=$3`,
      [a.quantity, u.access.companyId, l.id],
    );
    await u.client.query(
      `INSERT INTO returns.receipt_allocation(company_id,id,receipt_line_id,kind,owner_id,cycle_id,quantity) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [u.access.companyId, randomUUID(), l.id, kind, owner, cycle, a.quantity],
    );
  }
}
export async function brandHandover(
  u: UnitOfWork,
  input: Extract<ReturnCommand, { type: 'return.brandHandover' }>,
  recordId: string,
) {
  if (Date.parse(input.actualAt) > Date.now()) throw new AccessError('INVALID_HANDOVER_TIME', 400);
  const rows = await lockReceiptAllocation(u, input.branchId, input.allocations),
    id = randomUUID();
  if (rows.some((l) => l.brand_id !== input.brandId))
    throw new AccessError('BRAND_IDENTITY_CONFLICT', 409);
  await consumeReceiptAllocation(u, rows, input.allocations, 'brand-handover', id);
  const repo = new StockPositionRepository();
  for (const l of rows.filter((l) => l.variant_id)) {
    const key = { branchId: l.branch_id, brandId: l.brand_id, variantId: l.variant_id! },
      pos = (await repo.lock(u.client, u.access.companyId, [key]))[0]!;
    const source = randomUUID(),
      quantity = input.allocations.find((x) => x.receiptLineId === l.id)!.quantity;
    await u.client.query(
      `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'condition','brand-handover',$3,1)`,
      [u.access.companyId, source, id + ':' + l.id],
    );
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
        -quantity,
        cairoDate(new Date(input.actualAt)),
      ],
    );
    await repo.update(
      u.client,
      u.access.companyId,
      pos,
      safeStockNumber(pos.sound) - quantity,
      safeStockNumber(pos.unavailable),
    );
  }
  await u.client.query(
    `INSERT INTO returns.brand_handover(company_id,id,branch_id,brand_id,recipient_name,command_record_id,actor_id,actor_name,actual_at,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      u.access.companyId,
      id,
      input.branchId,
      input.brandId,
      input.recipientName,
      recordId,
      u.access.principalId,
      u.access.displayName,
      input.actualAt,
      JSON.stringify(input.allocations),
    ],
  );
  return { entityId: id, actionId: null, dispatchIntentId: null };
}
