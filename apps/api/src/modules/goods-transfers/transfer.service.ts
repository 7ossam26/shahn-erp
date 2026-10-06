import { randomUUID } from 'node:crypto';
import { assertNoIncidentHold } from '@shahn/database';
import type { Pool } from 'pg';
import {
  readManifest,
  readTransferLines,
  readShipment,
  positionKey,
  safeStockNumber,
  type TransferLineRow,
  type PositionKey,
} from '@shahn/database';
import { AccessError, stockRequirements } from '@shahn/domain';
import {
  validateGoodsTransferCommand,
  type GoodsTransferCommand,
  type GoodsTransferResult,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { reserveStock, releaseStockReservation } from '../inventory/service.js';
import { lockTransferPositions, postTransferStock, stockSource, type StockDelta } from './stock.js';
import { receiveGoods } from './receipt.service.js';

type Parcel = {
  id: string;
  brandId: string;
  returned: boolean;
  priorDispatchOwnerId: string | null;
  receipts: { id: string; quantity: number }[];
  components: { variantId: string; quantity: number; reservationId: string }[];
};
const validActual = (at: string) => {
  if (!Number.isFinite(Date.parse(at)) || Date.parse(at) > Date.now() + 60000)
    throw new AccessError('INVALID_ACTUAL_TIME', 400);
};
async function lockParcels(u: UnitOfWork, ids: string[]) {
  for (const id of [...new Set(ids)].sort()) {
    u.lockOrder('aggregate', 'shipment:' + id);
    const result = await u.client.query(
      'SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE',
      [u.access.companyId, id],
    );
    if (!result.rowCount) throw new AccessError('NOT_FOUND', 404);
  }
}
async function parcelComponents(u: UnitOfWork, id: string, revision: number) {
  return (
    await u.client.query<{
      variant_id: string;
      quantity: string;
      reservation_id: string;
      active: boolean;
      shortage_held: boolean;
    }>(
      `SELECT a.variant_id,r.quantity::text,r.id AS reservation_id,r.active,r.shortage_held
       FROM shipments.stock_allocation a JOIN inventory.stock_reservation r ON(r.company_id,r.id)=(a.company_id,a.reservation_id)
       WHERE a.company_id=$1 AND a.shipment_id=$2 AND a.revision=$3 ORDER BY a.variant_id`,
      [u.access.companyId, id, revision],
    )
  ).rows;
}
export async function createTransfer(
  u: UnitOfWork,
  input: Extract<GoodsTransferCommand, { type: 'goods.create' }>,
  recordId: string,
) {
  const company = u.access.companyId;
  u.assertBranch(input.branchId);
  if (
    input.branchId === input.destinationBranchId ||
    !u.access.companyBranches.some((b) => b.id === input.destinationBranchId)
  )
    throw new AccessError('INVALID_DESTINATION_BRANCH', 409);
  const driver = (
    await u.client.query<{ active: boolean }>(
      `SELECT active FROM employees.operational_driver WHERE company_id=$1 AND id=$2 FOR SHARE`,
      [company, input.driverId],
    )
  ).rows[0];
  if (!driver?.active) throw new AccessError('DRIVER_INACTIVE', 409);
  const parcelIds = input.lines.filter((l) => l.kind === 'parcel').map((l) => l.shipmentId);
  const looseIds = input.lines
    .filter((l) => l.kind === 'loose')
    .map((l) => `${l.brandId}/${l.variantId}`);
  if (new Set(parcelIds).size !== parcelIds.length || new Set(looseIds).size !== looseIds.length)
    throw new AccessError('DUPLICATE_TRANSFER_LINE', 400);
  // Returned stored-stock receipts are a physical source of otherwise fungible loose stock.
  // Claim their unallocated balances first so later replenishment cannot re-fund the old receipt.
  const looseReturnShipments = looseIds.length
    ? (
        await u.client.query<{ shipment_id: string }>(
          `SELECT DISTINCT r.shipment_id FROM returns.return_receipt_line r
     JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(r.company_id,r.cycle_id)
     WHERE r.company_id=$1 AND r.branch_id=$2 AND r.condition='sound' AND r.variant_id IS NOT NULL
       AND r.consumed<r.quantity AND cy.latest
       AND concat(r.brand_id,'/',r.variant_id)=ANY($3::text[])
       AND NOT EXISTS(SELECT 1 FROM goods_transfer.return_claim q WHERE q.company_id=r.company_id AND q.receipt_line_id=r.id)`,
          [company, input.branchId, looseIds],
        )
      ).rows.map((r) => r.shipment_id)
    : [];
  await lockParcels(u, [...parcelIds, ...looseReturnShipments]);
  const parcels: Parcel[] = [];
  for (const line of input.lines) {
    if (line.kind !== 'parcel') continue;
    const d = await readShipment(u.client, company, line.shipmentId);
    if (!d || d.version !== line.expectedVersion)
      throw new AccessError('REVISION_CONFLICT', 409, d?.version);
    if (
      d.state !== 'active' ||
      d.preparation === 'awaiting_preparation' ||
      d.fields.branchId !== input.branchId
    )
      throw new AccessError('PARCEL_UNAVAILABLE', 409);
    const claim = (
      await u.client.query<{ kind: string; owner_id: string }>(
        'SELECT kind,owner_id FROM shipments.parcel_claim WHERE company_id=$1 AND shipment_id=$2',
        [company, d.id],
      )
    ).rows[0];
    if (!(await assertNoIncidentHold(u.client, company, d.id)))
      throw new AccessError('INCIDENT_CUSTODY_HELD', 409);
    const custody = await u.client.query(
      `SELECT 1 FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2 AND branch_id=$3 AND holder='branch' AND transfer_id IS NULL`,
      [company, d.id, input.branchId],
    );
    const returned = d.handedOver;
    if (returned ? claim?.kind !== 'dispatch' : !!claim)
      throw new AccessError('PARCEL_ALREADY_CLAIMED', 409);
    const receipts = returned
      ? (
          await u.client.query<{
            id: string;
            source_line_id: string;
            quantity: number;
            consumed: number;
          }>(
            `SELECT r.id,r.source_line_id,r.quantity,r.consumed FROM returns.return_receipt_line r
       JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(r.company_id,r.cycle_id)
       WHERE r.company_id=$1 AND r.shipment_id=$2 AND r.branch_id=$3 AND r.condition='sound' AND cy.latest
       ORDER BY r.id FOR UPDATE OF r`,
            [company, d.id, input.branchId],
          )
        ).rows
      : [];
    if (returned) {
      if (
        !receipts.length ||
        d.fields.lines.some(
          (l) =>
            receipts
              .filter((r) => r.source_line_id === l.id)
              .reduce((n, r) => n + r.quantity, 0) !== l.quantity,
        ) ||
        receipts.some((r) => r.consumed !== 0)
      )
        throw new AccessError('RETURN_RECEIPT_REQUIRED', 409);
      const already = await u.client.query(
        `SELECT 1 FROM goods_transfer.return_claim WHERE company_id=$1 AND receipt_line_id=ANY($2::uuid[])`,
        [company, receipts.map((r) => r.id)],
      );
      if (already.rowCount) throw new AccessError('RETURN_ALREADY_ALLOCATED', 409);
    } else if (!custody.rowCount) throw new AccessError('BRANCH_CUSTODY_REQUIRED', 409);
    const components =
      d.fields.service === 'stored_stock' ? await parcelComponents(u, d.id, d.revision) : [];
    const required = d.fields.service === 'stored_stock' ? stockRequirements(d.fields) : [];
    if (
      components.length !== required.length ||
      components.some(
        (c) =>
          (!returned && (!c.active || c.shortage_held)) ||
          !required.some(
            (r) => r.variantId === c.variant_id && r.quantity === safeStockNumber(c.quantity),
          ),
      )
    )
      throw new AccessError('PREPARATION_HELD', 409);
    parcels.push({
      id: d.id,
      brandId: d.fields.brandId,
      returned,
      priorDispatchOwnerId: returned ? claim!.owner_id : null,
      receipts: receipts.map((r) => ({ id: r.id, quantity: r.quantity })),
      components: components.map((c) => ({
        variantId: c.variant_id,
        quantity: safeStockNumber(c.quantity),
        reservationId: c.reservation_id,
      })),
    });
  }
  const loose = input.lines.filter((l) => l.kind === 'loose');
  const parcelReceiptIds = new Set(parcels.flatMap((p) => p.receipts.map((r) => r.id)));
  const looseReturnBalances = looseIds.length
    ? (
        await u.client.query<{
          id: string;
          brand_id: string;
          variant_id: string;
          quantity: number;
          consumed: number;
        }>(
          `SELECT r.id,r.brand_id,r.variant_id,r.quantity,r.consumed FROM returns.return_receipt_line r
     JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(r.company_id,r.cycle_id)
     WHERE r.company_id=$1 AND r.branch_id=$2 AND r.condition='sound' AND r.variant_id IS NOT NULL
       AND r.consumed<r.quantity AND cy.latest
       AND concat(r.brand_id,'/',r.variant_id)=ANY($3::text[])
       AND NOT EXISTS(SELECT 1 FROM goods_transfer.return_claim q WHERE q.company_id=r.company_id AND q.receipt_line_id=r.id)
     ORDER BY r.id FOR UPDATE OF r`,
          [company, input.branchId, looseIds],
        )
      ).rows.filter((r) => !parcelReceiptIds.has(r.id))
    : [];
  const looseClaims = new Map<string, { id: string; quantity: number }[]>();
  for (const l of loose) {
    let remaining = l.quantity;
    const claims: { id: string; quantity: number }[] = [];
    for (const r of looseReturnBalances.filter(
      (r) => r.brand_id === l.brandId && r.variant_id === l.variantId,
    )) {
      if (!remaining) break;
      const quantity = Math.min(remaining, r.quantity - r.consumed);
      if (quantity) claims.push({ id: r.id, quantity });
      remaining -= quantity;
    }
    looseClaims.set(`${l.brandId}/${l.variantId}`, claims);
  }
  for (const l of loose) {
    const variant = await u.client.query(
      `SELECT 1 FROM inventory.product_variant v JOIN inventory.product p ON(p.company_id,p.id)=(v.company_id,v.product_id)
       WHERE v.company_id=$1 AND v.brand_id=$2 AND v.id=$3 AND v.active AND p.active`,
      [company, l.brandId, l.variantId],
    );
    if (!variant.rowCount) throw new AccessError('STOCK_VARIANT_UNAVAILABLE', 409);
  }
  const keys: PositionKey[] = [
    ...parcels.flatMap((p) =>
      p.components.map((c) => ({
        branchId: input.branchId,
        brandId: p.brandId,
        variantId: c.variantId,
      })),
    ),
    ...loose.map((l) => ({ branchId: input.branchId, brandId: l.brandId, variantId: l.variantId })),
  ];
  const positions = await lockTransferPositions(u, keys);
  for (const p of parcels)
    for (const c of p.components) {
      const pos = positions.find(
        (x) =>
          positionKey(x) ===
          positionKey({ branchId: input.branchId, brandId: p.brandId, variantId: c.variantId }),
      )!;
      if (
        safeStockNumber(pos.reserved) > safeStockNumber(pos.sound) ||
        safeStockNumber(pos.sound) < c.quantity
      )
        throw new AccessError('PREPARATION_HELD', 409);
    }
  const newClaims = new Map<string, number>();
  for (const p of parcels.filter((x) => x.returned))
    for (const c of p.components) {
      const k = positionKey({
        branchId: input.branchId,
        brandId: p.brandId,
        variantId: c.variantId,
      });
      newClaims.set(k, (newClaims.get(k) ?? 0) + c.quantity);
    }
  for (const l of loose) {
    const k = positionKey({ branchId: input.branchId, brandId: l.brandId, variantId: l.variantId });
    newClaims.set(k, (newClaims.get(k) ?? 0) + l.quantity);
  }
  for (const p of positions)
    if (
      safeStockNumber(p.sound) - safeStockNumber(p.reserved) <
      (newClaims.get(positionKey(p)) ?? 0)
    )
      throw new AccessError('STOCK_SHORTAGE', 409);
  for (const l of loose) {
    const pos = positions.find(
      (x) =>
        positionKey(x) ===
        positionKey({ branchId: input.branchId, brandId: l.brandId, variantId: l.variantId }),
    )!;
    if (safeStockNumber(pos.sound) - safeStockNumber(pos.reserved) < l.quantity)
      throw new AccessError('STOCK_SHORTAGE', 409);
  }
  const id = randomUUID();
  const manifest = (
    await u.client.query<{ reference: string }>(
      `INSERT INTO goods_transfer.manifest(company_id,id,source_branch_id,destination_branch_id,driver_id,planned_at,created_command_id,actor_id,actor_name)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING reference`,
      [
        company,
        id,
        input.branchId,
        input.destinationBranchId,
        input.driverId,
        input.plannedAt,
        recordId,
        u.access.principalId,
        u.access.displayName,
      ],
    )
  ).rows[0]!;
  const source =
    loose.length || parcels.some((p) => p.returned && p.components.length)
      ? await stockSource(u, id, 1, 'loose_transfer')
      : null;
  for (const line of input.lines) {
    const lineId = randomUUID();
    if (line.kind === 'parcel') {
      const p = parcels.find((x) => x.id === line.shipmentId)!;
      await u.client.query(
        `INSERT INTO goods_transfer.line(company_id,id,manifest_id,kind,brand_id,shipment_id,quantity,remaining,prior_dispatch_owner_id)
        VALUES($1,$2,$3,'parcel',$4,$5,1,1,$6)`,
        [company, lineId, id, p.brandId, p.id, p.priorDispatchOwnerId],
      );
      for (const c of p.components) {
        let transferReservation: string | null = null;
        if (p.returned) {
          await reserveStock(
            u,
            { branchId: input.branchId, brandId: p.brandId, variantId: c.variantId },
            {
              sourceId: source!,
              kind: 'loose_transfer',
              lineKey: lineId + ':' + c.variantId,
              quantity: c.quantity,
            },
          );
          transferReservation = (
            await u.client.query<{ id: string }>(
              `SELECT id FROM inventory.stock_reservation WHERE company_id=$1 AND source_id=$2 AND line_key=$3`,
              [company, source, lineId + ':' + c.variantId],
            )
          ).rows[0]!.id;
        }
        await u.client.query(
          `INSERT INTO goods_transfer.component(company_id,line_id,brand_id,variant_id,quantity,original_reservation_id,transfer_reservation_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [
            company,
            lineId,
            p.brandId,
            c.variantId,
            c.quantity,
            c.reservationId,
            transferReservation,
          ],
        );
      }
      for (const r of p.receipts)
        await u.client.query(
          `INSERT INTO goods_transfer.return_claim(company_id,receipt_line_id,manifest_id,line_id,quantity) VALUES($1,$2,$3,$4,$5)`,
          [company, r.id, id, lineId, r.quantity],
        );
      if (p.returned)
        await u.client.query(
          `UPDATE shipments.parcel_claim SET kind='transfer',owner_id=$3 WHERE company_id=$1 AND shipment_id=$2 AND kind='dispatch' AND owner_id=$4`,
          [company, p.id, id, p.priorDispatchOwnerId],
        );
      else
        await u.client.query(
          `INSERT INTO shipments.parcel_claim(company_id,shipment_id,kind,owner_id) VALUES($1,$2,'transfer',$3)`,
          [company, p.id, id],
        );
    } else {
      const key = { branchId: input.branchId, brandId: line.brandId, variantId: line.variantId };
      await reserveStock(u, key, {
        sourceId: source!,
        kind: 'loose_transfer',
        lineKey: lineId,
        quantity: line.quantity,
      });
      const reservation = (
        await u.client.query<{ id: string }>(
          `SELECT id FROM inventory.stock_reservation WHERE company_id=$1 AND source_id=$2 AND line_key=$3`,
          [company, source, lineId],
        )
      ).rows[0]!;
      await u.client.query(
        `INSERT INTO goods_transfer.line(company_id,id,manifest_id,kind,brand_id,variant_id,quantity,remaining,reservation_id)
        VALUES($1,$2,$3,'loose',$4,$5,$6,$6,$7)`,
        [company, lineId, id, line.brandId, line.variantId, line.quantity, reservation.id],
      );
      for (const r of looseClaims.get(`${line.brandId}/${line.variantId}`) ?? [])
        await u.client.query(
          `INSERT INTO goods_transfer.return_claim(company_id,receipt_line_id,manifest_id,line_id,quantity) VALUES($1,$2,$3,$4,$5)`,
          [company, r.id, id, lineId, r.quantity],
        );
    }
  }
  return { manifestId: id, reference: manifest.reference, version: 1, state: 'prepared' as const };
}

async function lockManifestAndLines(u: UnitOfWork, id: string) {
  u.lockOrder('aggregate', 'manifest:' + id);
  const manifest = await readManifest(u.client, u.access.companyId, id, true);
  if (!manifest) throw new AccessError('NOT_FOUND', 404);
  const lines = await readTransferLines(u.client, u.access.companyId, id);
  await lockParcels(
    u,
    lines.flatMap((l) => (l.shipment_id ? [l.shipment_id] : [])),
  );
  return { manifest, lines };
}
async function releaseReservations(
  u: UnitOfWork,
  lines: TransferLineRow[],
  sourceBranchId: string,
  sourceId: string,
  handedOver: boolean,
) {
  for (const l of lines) {
    if (l.kind === 'loose') {
      await releaseStockReservation(
        u,
        { branchId: sourceBranchId, brandId: l.brand_id, variantId: l.variant_id! },
        l.reservation_id!,
        sourceId,
      );
    } else {
      const components = (
        await u.client.query<{
          variant_id: string;
          original_reservation_id: string;
          transfer_reservation_id: string | null;
        }>(
          `SELECT variant_id,original_reservation_id,transfer_reservation_id FROM goods_transfer.component WHERE company_id=$1 AND line_id=$2 ORDER BY variant_id`,
          [u.access.companyId, l.id],
        )
      ).rows;
      for (const c of components) {
        if (!handedOver && !c.transfer_reservation_id) continue;
        await releaseStockReservation(
          u,
          { branchId: sourceBranchId, brandId: l.brand_id, variantId: c.variant_id },
          c.transfer_reservation_id ?? c.original_reservation_id,
          sourceId,
        );
      }
    }
  }
}
export async function actOnTransfer(
  u: UnitOfWork,
  input: Extract<GoodsTransferCommand, { type: 'goods.handover' | 'goods.cancel' }>,
  recordId: string,
) {
  validActual(input.actualAt);
  const { manifest: m, lines } = await lockManifestAndLines(u, input.manifestId);
  u.assertBranch(m.source_branch_id);
  if (input.branchId !== m.source_branch_id) throw new AccessError('WRONG_SOURCE_BRANCH', 409);
  if (m.version !== input.expectedVersion)
    throw new AccessError('REVISION_CONFLICT', 409, m.version);
  if (m.state !== 'prepared') throw new AccessError('TRANSFER_ALREADY_HANDED_OVER', 409, m.version);
  if (input.type === 'goods.handover') {
    const driver = (
      await u.client.query<{ active: boolean }>(
        `SELECT active FROM employees.operational_driver WHERE company_id=$1 AND id=$2 FOR SHARE`,
        [u.access.companyId, m.driver_id],
      )
    ).rows[0];
    if (!driver?.active) throw new AccessError('DRIVER_INACTIVE', 409);
  }
  const components = (
    await u.client.query<{
      line_id: string;
      brand_id: string;
      variant_id: string;
      quantity: number;
      original_reservation_id: string;
    }>(
      `SELECT c.* FROM goods_transfer.component c JOIN goods_transfer.line l ON(l.company_id,l.id)=(c.company_id,c.line_id)
     WHERE c.company_id=$1 AND l.manifest_id=$2 ORDER BY c.line_id,c.variant_id`,
      [u.access.companyId, m.id],
    )
  ).rows;
  const claims = (
    await u.client.query<{
      receipt_line_id: string;
      line_id: string;
      quantity: number;
      consumed: number;
      total: number;
    }>(
      `SELECT q.receipt_line_id,q.line_id,q.quantity,r.consumed,r.quantity AS total FROM goods_transfer.return_claim q
     JOIN returns.return_receipt_line r ON(r.company_id,r.id)=(q.company_id,q.receipt_line_id)
     WHERE q.company_id=$1 AND q.manifest_id=$2 ORDER BY q.receipt_line_id FOR UPDATE OF r`,
      [u.access.companyId, m.id],
    )
  ).rows;
  if (claims.some((c) => c.consumed + c.quantity > c.total))
    throw new AccessError('RETURN_ALREADY_ALLOCATED', 409);
  const keys = [
    ...lines
      .filter((l) => l.kind === 'loose')
      .map((l) => ({
        branchId: m.source_branch_id,
        brandId: l.brand_id,
        variantId: l.variant_id!,
      })),
    ...components.map((c) => ({
      branchId: m.source_branch_id,
      brandId: c.brand_id,
      variantId: c.variant_id,
    })),
  ];
  const positions = await lockTransferPositions(u, keys);
  if (input.type === 'goods.handover') {
    const requirements = new Map<string, number>();
    for (const l of lines.filter((x) => x.kind === 'loose')) {
      const k = positionKey({
        branchId: m.source_branch_id,
        brandId: l.brand_id,
        variantId: l.variant_id!,
      });
      requirements.set(k, (requirements.get(k) ?? 0) + l.quantity);
    }
    for (const c of components) {
      const k = positionKey({
        branchId: m.source_branch_id,
        brandId: c.brand_id,
        variantId: c.variant_id,
      });
      requirements.set(k, (requirements.get(k) ?? 0) + c.quantity);
    }
    for (const p of positions)
      if (
        safeStockNumber(p.sound) < (requirements.get(positionKey(p)) ?? 0) ||
        safeStockNumber(p.reserved) > safeStockNumber(p.sound)
      )
        throw new AccessError('STOCK_SHORTAGE', 409);
    for (const l of lines)
      if (l.kind === 'parcel') {
        if (!(await assertNoIncidentHold(u.client, u.access.companyId, l.shipment_id!)))
          throw new AccessError('INCIDENT_CUSTODY_HELD', 409);
        const custody = await u.client.query(
          `SELECT 1 FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2 AND branch_id=$3 AND holder='branch' AND transfer_id IS NULL`,
          [u.access.companyId, l.shipment_id, m.source_branch_id],
        );
        const claim = await u.client.query(
          `SELECT 1 FROM shipments.parcel_claim WHERE company_id=$1 AND shipment_id=$2 AND kind='transfer' AND owner_id=$3`,
          [u.access.companyId, l.shipment_id, m.id],
        );
        if ((!custody.rowCount && !claims.some((c) => c.line_id === l.id)) || !claim.rowCount)
          throw new AccessError('PARCEL_UNAVAILABLE', 409);
      }
  }
  const source = await stockSource(u, m.id + ':' + input.type, m.version + 1);
  await releaseReservations(u, lines, m.source_branch_id, source, input.type === 'goods.handover');
  if (input.type === 'goods.handover') {
    for (const c of claims) {
      await u.client.query(
        `UPDATE returns.return_receipt_line SET consumed=consumed+$3,version=version+1 WHERE company_id=$1 AND id=$2`,
        [u.access.companyId, c.receipt_line_id, c.quantity],
      );
      await u.client.query(
        `INSERT INTO returns.receipt_allocation(company_id,id,receipt_line_id,kind,owner_id,quantity)
        VALUES($1,$2,$3,'transfer',$4,$5)`,
        [u.access.companyId, randomUUID(), c.receipt_line_id, m.id, c.quantity],
      );
    }
    await u.client.query(
      `DELETE FROM goods_transfer.return_claim WHERE company_id=$1 AND manifest_id=$2`,
      [u.access.companyId, m.id],
    );
    const deltas: StockDelta[] = [
      ...lines
        .filter((l) => l.kind === 'loose')
        .map((l) => ({
          branchId: m.source_branch_id,
          brandId: l.brand_id,
          variantId: l.variant_id!,
          sound: -l.quantity,
          unavailable: 0,
          effectKey: l.id,
          condition: 'sound' as const,
        })),
      ...components.map((c) => ({
        branchId: m.source_branch_id,
        brandId: c.brand_id,
        variantId: c.variant_id,
        sound: -c.quantity,
        unavailable: 0,
        effectKey: c.line_id + ':' + c.variant_id,
        condition: 'sound' as const,
      })),
    ];
    await postTransferStock(u, source, deltas, input.actualAt);
    for (const l of lines.filter((x) => x.kind === 'parcel')) {
      await u.client.query(
        `UPDATE shipments.parcel_custody SET holder='driver',driver_id=$3,transfer_id=$4,version=version+1 WHERE company_id=$1 AND shipment_id=$2`,
        [u.access.companyId, l.shipment_id, m.driver_id, m.id],
      );
      await u.client.query(
        `UPDATE shipments.shipment SET version=version+1 WHERE company_id=$1 AND id=$2`,
        [u.access.companyId, l.shipment_id],
      );
      await u.client.query(
        `INSERT INTO shipments.event(company_id,shipment_id,version,kind,actor_id,actor_name) SELECT company_id,id,version,'transfer_handover',$3,$4 FROM shipments.shipment WHERE company_id=$1 AND id=$2`,
        [u.access.companyId, l.shipment_id, u.access.principalId, u.access.displayName],
      );
    }
  } else {
    await u.client.query(
      `DELETE FROM goods_transfer.return_claim WHERE company_id=$1 AND manifest_id=$2`,
      [u.access.companyId, m.id],
    );
    for (const l of lines.filter((x) => x.kind === 'parcel')) {
      if (l.prior_dispatch_owner_id)
        await u.client.query(
          `UPDATE shipments.parcel_claim SET kind='dispatch',owner_id=$4 WHERE company_id=$1 AND shipment_id=$2 AND kind='transfer' AND owner_id=$3`,
          [u.access.companyId, l.shipment_id, m.id, l.prior_dispatch_owner_id],
        );
      else
        await u.client.query(
          `DELETE FROM shipments.parcel_claim WHERE company_id=$1 AND shipment_id=$2 AND kind='transfer' AND owner_id=$3`,
          [u.access.companyId, l.shipment_id, m.id],
        );
    }
  }
  await u.client.query(
    `INSERT INTO goods_transfer.action_fact(company_id,id,manifest_id,kind,command_record_id,actor_id,actor_name,actual_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      u.access.companyId,
      randomUUID(),
      m.id,
      input.type === 'goods.handover' ? 'handover' : 'cancel',
      recordId,
      u.access.principalId,
      u.access.displayName,
      input.actualAt,
    ],
  );
  const state = input.type === 'goods.handover' ? 'in_transit' : 'cancelled';
  await u.client.query(
    `UPDATE goods_transfer.manifest SET state=$3,version=version+1 WHERE company_id=$1 AND id=$2`,
    [u.access.companyId, m.id, state],
  );
  return { manifestId: m.id, reference: m.reference, version: m.version + 1, state } as const;
}
export function goodsTransferCommands(pool: Pool, screen: 'send' | 'receive') {
  const definitions: CommandDefinition<GoodsTransferCommand>[] = (
    (screen === 'send'
      ? ['goods.create', 'goods.handover', 'goods.cancel']
      : ['goods.receive', 'goods.sourceReturn']) as GoodsTransferCommand['type'][]
  ).map((kind) => ({
    family: 'goods-transfer-' + screen,
    kind,
    capability:
      kind === 'goods.receive' || kind === 'goods.sourceReturn' ? 'goods.receive' : 'goods.send',
    authorize: async (u, value, recovery) => {
      if (!recovery && !validateGoodsTransferCommand(value))
        throw new AccessError('VALIDATION_FAILED', 400);
      u.assertBranch(String(value.branchId));
      if ('manifestId' in value && typeof value.manifestId === 'string') {
        const m = await readManifest(u.client, u.access.companyId, value.manifestId);
        if (!m) throw new AccessError('NOT_FOUND', 404);
        const branch =
          kind === 'goods.receive'
            ? m.destination_branch_id
            : kind === 'goods.sourceReturn'
              ? m.source_branch_id
              : m.source_branch_id;
        if (value.branchId !== branch) throw new AccessError('FORBIDDEN_SCOPE');
      }
    },
    execute: async (u, input, recordId) => {
      const output =
        input.type === 'goods.create'
          ? await createTransfer(u, input, recordId)
          : input.type === 'goods.handover' || input.type === 'goods.cancel'
            ? await actOnTransfer(u, input, recordId)
            : await receiveGoods(
                u,
                input as Extract<
                  GoodsTransferCommand,
                  { type: 'goods.receive' | 'goods.sourceReturn' }
                >,
                recordId,
              );
      const body: GoodsTransferResult = {
        commandId: input.commandId,
        branchId: input.branchId,
        ...output,
      };
      return {
        reply: { status: 200, body },
        reference: body,
        entityId: body.manifestId,
        beforeVersion: input.type === 'goods.create' ? null : input.expectedVersion,
        afterVersion: body.version,
      };
    },
    resolve: async (_u, reference) => reference,
    rejectionReference: async (input) => ({
      entityId: input.type === 'goods.create' ? input.driverId : input.manifestId,
      branchId: input.branchId,
    }),
  }));
  return new CommandService(pool, definitions);
}
