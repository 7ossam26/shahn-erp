import { randomUUID } from 'node:crypto';
import { AccessError } from '@shahn/domain';
import {
  receiptLines,
  claimParcel,
  StockPositionRepository,
  positionKey,
  type IntegrationSource,
  type ReceiptLineRow,
} from '@shahn/database';
import type { ReceiptAllocation } from '@shahn/contracts';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { readyBinding } from '../dispatch/dispatch.service.js';
import { reserveStock } from '../inventory/service.js';
export interface TransferredFunding {
  transferId: string;
  destinationReceiptId: string;
  sourceBranchExternalId: string;
  receivedAtDestination: true;
  parcel: boolean;
  lineIds: Record<string, string>;
}
export async function transferredReceiptAllocation(
  u: UnitOfWork,
  s: IntegrationSource,
  shipment: string,
  originBranch: string,
  destinationBranch: string,
  selections: ReceiptAllocation[],
) {
  if ((s.configuration as { interopVersion?: string }).interopVersion !== '2.0.0')
    throw new AccessError('TAWSEL_CHECK_003', 409);
  u.assertBranch(originBranch);
  u.assertBranch(destinationBranch);
  u.lockOrder('aggregate', 'shipment:' + shipment);
  await u.client.query(
    'SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE',
    [u.access.companyId, shipment],
  );
  if (
    !selections.length ||
    new Set(selections.map((x) => x.receiptLineId)).size !== selections.length
  )
    throw new AccessError('DUPLICATE_RECEIPT_ALLOCATION', 400);
  const rows = await receiptLines(
    u.client,
    u.access.companyId,
    selections.map((x) => x.receiptLineId),
    true,
  );
  if (rows.length !== selections.length) throw new AccessError('NOT_FOUND', 404);
  type Witness = {
    receipt_line_id: string;
    quantity: number;
    transferId: string;
    destinationReceiptId: string;
    lineId: string;
    kind: 'parcel' | 'loose';
  };
  const witnesses = (
    await u.client.query<Witness>(
      `SELECT a.receipt_line_id,a.quantity,m.id AS "transferId",d.id AS "destinationReceiptId",l.id AS "lineId",l.kind FROM returns.receipt_allocation a JOIN returns.return_receipt_line r ON(r.company_id,r.id)=(a.company_id,a.receipt_line_id) JOIN goods_transfer.manifest m ON(m.company_id,m.id)=(a.company_id,a.owner_id) JOIN goods_transfer.line l ON(l.company_id,l.manifest_id)=(m.company_id,m.id) AND (l.kind='parcel' AND l.shipment_id=r.shipment_id OR l.kind='loose' AND (l.brand_id,l.variant_id)=(r.brand_id,r.variant_id)) JOIN goods_transfer.receipt d ON(d.company_id,d.manifest_id)=(m.company_id,m.id) AND d.kind='destination' JOIN goods_transfer.receipt_line dl ON(dl.company_id,dl.receipt_id,dl.line_id)=(d.company_id,d.id,l.id) WHERE a.company_id=$1 AND a.kind='transfer' AND a.receipt_line_id=ANY($2::uuid[]) AND m.source_branch_id=$3 AND m.destination_branch_id=$4 AND m.state='closed' AND dl.sound=l.quantity AND dl.damaged=0 AND dl.uncertain=0 AND NOT dl.suspected_internal_issue AND EXISTS(SELECT 1 FROM goods_transfer.action_fact h WHERE h.company_id=m.company_id AND h.manifest_id=m.id AND h.kind='handover') ORDER BY d.actual_at DESC`,
      [u.access.companyId, rows.map((r) => r.id), originBranch, destinationBranch],
    )
  ).rows;
  const first = witnesses[0];
  if (!first) throw new AccessError('ACTUAL_DESTINATION_RECEIPT_REQUIRED', 409);
  const chosen = witnesses.filter(
    (w) =>
      w.transferId === first.transferId && w.destinationReceiptId === first.destinationReceiptId,
  );
  if (
    chosen.length !== rows.length ||
    new Set(chosen.map((w) => w.receipt_line_id)).size !== rows.length
  )
    throw new AccessError('COMPLETE_TRANSFER_ALLOCATION_REQUIRED', 409);
  const parcel = chosen.every((w) => w.kind === 'parcel');
  if (!parcel && chosen.some((w) => w.kind === 'parcel'))
    throw new AccessError('INCOMPATIBLE_RETURN_LINES', 409);
  if (parcel) {
    // The physical claim covers the entire parcel, including receipt lines the
    // caller omitted. Its immutable transfer allocation is the funding boundary.
    const contents = (
      await u.client.query<{ receipt_line_id: string; quantity: number }>(
        `SELECT a.receipt_line_id,a.quantity FROM returns.receipt_allocation a JOIN returns.return_receipt_line r ON(r.company_id,r.id)=(a.company_id,a.receipt_line_id) WHERE a.company_id=$1 AND a.kind='transfer' AND a.owner_id=$2 AND r.shipment_id=$3 ORDER BY a.receipt_line_id`,
        [u.access.companyId, first.transferId, shipment],
      )
    ).rows;
    if (
      contents.length !== selections.length ||
      contents.some(
        (c) =>
          !selections.some(
            (a) => a.receiptLineId === c.receipt_line_id && a.quantity === c.quantity,
          ),
      )
    )
      throw new AccessError('COMPLETE_TRANSFER_ALLOCATION_REQUIRED', 409);
  }
  for (const r of rows) {
    const selected = selections.find((x) => x.receiptLineId === r.id)!,
      w = chosen.find((x) => x.receipt_line_id === r.id)!;
    if (
      r.shipment_id !== shipment ||
      r.branch_id !== originBranch ||
      r.condition !== 'sound' ||
      r.version !== selected.expectedVersion ||
      r.consumed < w.quantity ||
      !Number.isSafeInteger(selected.quantity) ||
      selected.quantity < 1 ||
      selected.quantity > w.quantity ||
      (parcel && selected.quantity !== w.quantity)
    )
      throw new AccessError('TRANSFER_RECEIPT_ALLOCATION_CONFLICT', 409);
  }
  if (
    (
      await u.client.query(
        'SELECT 1 FROM dispatch.transferred_return_allocation WHERE company_id=$1 AND receipt_line_id=ANY($2::uuid[])',
        [u.access.companyId, rows.map((r) => r.id)],
      )
    ).rowCount
  )
    throw new AccessError('RETURN_ALREADY_ALLOCATED', 409);
  if (
    parcel &&
    !(
      await u.client.query(
        `SELECT 1 FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2 AND branch_id=$3 AND holder='branch' AND transfer_id IS NULL AND exterior_condition='sound'`,
        [u.access.companyId, shipment, destinationBranch],
      )
    ).rowCount
  )
    throw new AccessError('BRANCH_CUSTODY_REQUIRED', 409);
  const origin = await readyBinding(u.client, u.access.companyId, s.id, 'branch', originBranch);
  const transfer: TransferredFunding = {
    transferId: first.transferId,
    destinationReceiptId: first.destinationReceiptId,
    sourceBranchExternalId: origin.external_id,
    receivedAtDestination: true,
    parcel,
    lineIds: Object.fromEntries(chosen.map((w) => [w.receipt_line_id, w.lineId])),
  };
  return { transfer, rows: rows.map((r) => ({ ...r, branch_id: destinationBranch })) };
}
export async function allocateTransferredReturn(
  u: UnitOfWork,
  cycle: string,
  intent: string,
  shipment: string,
  rows: ReceiptLineRow[],
  selections: ReceiptAllocation[],
  transfer: TransferredFunding,
) {
  if (
    transfer.parcel &&
    !(await claimParcel(u.client, u.access.companyId, shipment, 'dispatch', intent))
  )
    throw new AccessError('COMPETING_PARCEL_CLAIM', 409);
  const keys = [
    ...new Map(
      rows
        .filter((r) => r.variant_id)
        .map((r) => ({ branchId: r.branch_id, brandId: r.brand_id, variantId: r.variant_id! }))
        .map((k) => [positionKey(k), k]),
    ).values(),
  ].sort((a, b) => positionKey(a).localeCompare(positionKey(b)));
  for (const k of keys) u.lockOrder('stock', positionKey(k));
  await new StockPositionRepository().lock(u.client, u.access.companyId, keys);
  const parcelReservations = new Map<string, string>();
  if (transfer.parcel) {
    for (const k of keys) {
      const required = rows
        .filter(
          (r) =>
            r.branch_id === k.branchId && r.brand_id === k.brandId && r.variant_id === k.variantId,
        )
        .reduce(
          (total, r) => total + selections.find((a) => a.receiptLineId === r.id)!.quantity,
          0,
        );
      const reservations = (
        await u.client.query<{ id: string; quantity: string }>(
          `SELECT r.id,r.quantity FROM shipments.stock_allocation a JOIN shipments.shipment s ON(s.company_id,s.id,s.revision)=(a.company_id,a.shipment_id,a.revision) JOIN inventory.stock_reservation r ON(r.company_id,r.id)=(a.company_id,a.reservation_id) WHERE s.company_id=$1 AND s.id=$2 AND (a.branch_id,a.brand_id,a.variant_id)=($3,$4,$5) AND r.active AND NOT r.shortage_held FOR UPDATE OF r`,
          [u.access.companyId, shipment, k.branchId, k.brandId, k.variantId],
        )
      ).rows;
      if (reservations.length !== 1 || Number(reservations[0]!.quantity) !== required)
        throw new AccessError('DESTINATION_RESERVATION_REQUIRED', 409);
      parcelReservations.set(positionKey(k), reservations[0]!.id);
    }
  }
  for (const r of rows) {
    const quantity = selections.find((x) => x.receiptLineId === r.id)!.quantity;
    let reservation: string | null = null;
    if (r.variant_id) {
      if (transfer.parcel) {
        reservation = parcelReservations.get(
          positionKey({ branchId: r.branch_id, brandId: r.brand_id, variantId: r.variant_id }),
        )!;
      } else {
        const source = randomUUID();
        await u.client.query(
          `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'order','transferred-return-redispatch',$3,1)`,
          [u.access.companyId, source, cycle + ':' + r.id],
        );
        await reserveStock(
          u,
          { branchId: r.branch_id, brandId: r.brand_id, variantId: r.variant_id },
          { sourceId: source, kind: 'order', lineKey: r.id, quantity },
        );
        reservation = (
          await u.client.query<{ id: string }>(
            'SELECT id FROM inventory.stock_reservation WHERE company_id=$1 AND source_id=$2 AND line_key=$3',
            [u.access.companyId, source, r.id],
          )
        ).rows[0]!.id;
      }
    } else if (!transfer.parcel) throw new AccessError('INCOMPATIBLE_RETURN_LINES', 409);
    await u.client.query(
      `INSERT INTO dispatch.transferred_return_allocation(company_id,cycle_id,receipt_line_id,destination_receipt_id,transfer_line_id,branch_id,quantity,reservation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        u.access.companyId,
        cycle,
        r.id,
        transfer.destinationReceiptId,
        transfer.lineIds[r.id],
        r.branch_id,
        quantity,
        reservation,
      ],
    );
  }
}
