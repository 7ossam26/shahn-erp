import { randomUUID } from 'node:crypto';
import {
  StockPositionRepository,
  positionKey,
  safeStockNumber,
  type PositionKey,
  type LockedPosition,
} from '@shahn/database';
import {
  stockRequirements,
  StockEligibilityError,
  AccessError,
  cairoDate,
  addQuantity,
  assertUnpackTransition,
} from '@shahn/domain';
import type { ShipmentFields, ShipmentDetail, ShipmentCommand } from '@shahn/contracts';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { reserveStock, releaseStockReservation, changeStockCondition } from './service.js';
const keyFor = (f: ShipmentFields, variantId: string): PositionKey => ({
  branchId: f.branchId,
  brandId: f.brandId,
  variantId,
});
export async function validateStockVariants(uow: UnitOfWork, fields: ShipmentFields) {
  for (const requirement of stockRequirements(fields)) {
    const row = (
      await uow.client.query(
        `SELECT v.id FROM inventory.product_variant v JOIN inventory.product p ON (p.company_id,p.id)=(v.company_id,v.product_id) WHERE v.company_id=$1 AND v.brand_id=$2 AND v.id=$3 AND v.active AND p.active`,
        [uow.access.companyId, fields.brandId, requirement.variantId],
      )
    ).rows[0];
    if (!row) throw new AccessError('STOCK_VARIANT_UNAVAILABLE', 409);
  }
}
export async function lockOrderPositions(uow: UnitOfWork, keys: PositionKey[]) {
  const unique = [...new Map(keys.map((k) => [positionKey(k), k])).values()].sort((a, b) =>
    positionKey(a).localeCompare(positionKey(b)),
  );
  for (const key of unique) {
    uow.assertBranch(key.branchId);
    uow.lockOrder('stock', positionKey(key));
  }
  return new StockPositionRepository().lock(uow.client, uow.access.companyId, unique);
}
async function stockSource(
  uow: UnitOfWork,
  id: string,
  revision: number,
  kind: 'order' | 'condition',
) {
  const source = randomUUID();
  await uow.client.query(
    `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,$3,'shipment',$4,$5)`,
    [uow.access.companyId, source, kind, id, revision],
  );
  return source;
}
export async function reserveOrder(
  uow: UnitOfWork,
  id: string,
  revision: number,
  fields: ShipmentFields,
) {
  await validateStockVariants(uow, fields);
  const requirements = stockRequirements(fields);
  const positions = await lockOrderPositions(
    uow,
    requirements.map((r) => keyFor(fields, r.variantId)),
  );
  await assertRequirements(uow, fields, positions);
  if (!requirements.length) return;
  const sourceId = await stockSource(uow, id, revision, 'order');
  for (const req of requirements) {
    await reserveStock(uow, keyFor(fields, req.variantId), {
      sourceId,
      kind: 'order',
      lineKey: req.variantId,
      quantity: req.quantity,
    });
    await uow.client.query(
      `INSERT INTO shipments.stock_allocation(company_id,shipment_id,revision,branch_id,brand_id,variant_id,reservation_id) SELECT company_id,$2,$3,branch_id,brand_id,variant_id,id FROM inventory.stock_reservation WHERE company_id=$1 AND source_id=$4 AND variant_id=$5`,
      [uow.access.companyId, id, revision, sourceId, req.variantId],
    );
  }
}
async function assertRequirements(
  uow: UnitOfWork,
  fields: ShipmentFields,
  positions: LockedPosition[],
) {
  const errors = [];
  for (const r of stockRequirements(fields)) {
    const pos = positions.find((p) => positionKey(p) === positionKey(keyFor(fields, r.variantId)))!;
    const available = Math.max(safeStockNumber(pos.sound) - safeStockNumber(pos.reserved), 0);
    if (r.quantity > available) {
      const name = (
        await uow.client.query(
          `SELECT concat_ws(' · ',p.name,v.name) AS name FROM inventory.product_variant v JOIN inventory.product p ON (p.company_id,p.id)=(v.company_id,v.product_id) WHERE v.company_id=$1 AND v.id=$2`,
          [uow.access.companyId, r.variantId],
        )
      ).rows[0].name;
      errors.push({
        variantId: r.variantId,
        variantName: name,
        required: r.quantity,
        available,
        shortage: r.quantity - available,
      });
    }
  }
  if (errors.length) throw new StockEligibilityError('STOCK_SHORTAGE', errors);
}
export async function assertStockPreparation(uow: UnitOfWork, d: ShipmentDetail) {
  if (d.fields.service !== 'stored_stock') return;
  const active = d.stock.allocations.filter((a) => a.active);
  const positions = await lockOrderPositions(
    uow,
    active.map((a) => keyFor({ ...d.fields, branchId: a.branchId }, a.variantId)),
  );
  const errors = [];
  for (const r of stockRequirements(d.fields)) {
    const a = active.find((a) => a.variantId === r.variantId && a.branchId === d.fields.branchId);
    const pos = positions.find(
      (p) => positionKey(p) === positionKey(keyFor(d.fields, r.variantId)),
    );
    const shortage = pos
      ? Math.max(safeStockNumber(pos.reserved) - safeStockNumber(pos.sound), 0)
      : r.quantity;
    if (!a || a.quantity !== r.quantity || shortage > 0)
      errors.push({
        variantId: r.variantId,
        variantName: a?.variantName ?? r.variantId,
        required: r.quantity,
        available: pos ? safeStockNumber(pos.sound) : 0,
        shortage,
      });
  }
  if (errors.length) throw new StockEligibilityError('PREPARATION_HELD', errors);
}
export async function releaseOrder(uow: UnitOfWork, d: ShipmentDetail, version: number) {
  const active = d.stock.allocations.filter((a) => a.active);
  if (!active.length) return;
  await lockOrderPositions(
    uow,
    active.map((a) => keyFor({ ...d.fields, branchId: a.branchId }, a.variantId)),
  );
  const source = await stockSource(uow, d.id, version, 'condition');
  for (const a of active) {
    const key = keyFor({ ...d.fields, branchId: a.branchId }, a.variantId);
    await releaseStockReservation(uow, key, a.reservationId, source);
    if (d.preparation === 'complete') {
      const pos = (
        await new StockPositionRepository().lock(uow.client, uow.access.companyId, [key])
      )[0]!;
      await changeStockCondition(uow, key, {
        sourceId: source,
        effectKey: a.variantId,
        expectedVersion: pos.version,
        quantity: a.quantity,
        to: 'unavailable',
        actualDate: cairoDate(new Date()),
      });
      await uow.client.query(
        `INSERT INTO shipments.unpack_pending(company_id,id,shipment_id,shipment_version,branch_id,brand_id,variant_id,quantity) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          uow.access.companyId,
          randomUUID(),
          d.id,
          version,
          a.branchId,
          d.fields.brandId,
          a.variantId,
          a.quantity,
        ],
      );
    }
  }
}
export async function replaceOrder(
  uow: UnitOfWork,
  d: ShipmentDetail,
  fields: ShipmentFields,
  version: number,
) {
  const old = d.stock.allocations
    .filter((a) => a.active)
    .map((a) => keyFor({ ...d.fields, branchId: a.branchId }, a.variantId));
  const next = stockRequirements(fields).map((r) => keyFor(fields, r.variantId));
  await validateStockVariants(uow, fields);
  await lockOrderPositions(uow, [...old, ...next]);
  await releaseOrder(uow, d, version);
  await reserveOrder(uow, d.id, d.revision + 1, fields);
}
export async function unpackOrder(
  uow: UnitOfWork,
  d: ShipmentDetail,
  input: Extract<ShipmentCommand, { type: 'shipment.unpack' }>,
  recordId: string,
) {
  assertUnpackTransition(d, input.expectedVersion);
  const ids = new Set<string>();
  const selected = input.lines.map((line) => {
    const p = d.stock.unpack.find((p) => p.pendingId === line.pendingId);
    if (!p || ids.has(line.pendingId) || p.remaining !== line.expectedRemaining)
      throw new AccessError('UNPACK_REMAINING_CONFLICT', 409, d.version);
    ids.add(line.pendingId);
    const total = addQuantity(addQuantity(line.sound, line.damaged), line.uncertain);
    if (total < 1 || total > p.remaining) throw new AccessError('UNPACK_QUANTITY_EXCEEDED', 409);
    return { p, line };
  });
  await lockOrderPositions(
    uow,
    selected.map(({ p }) => keyFor({ ...d.fields, branchId: p.branchId }, p.variantId)),
  );
  const source = await stockSource(uow, d.id, d.version + 1, 'condition');
  for (const { p, line } of selected) {
    if (line.sound) {
      const key = keyFor({ ...d.fields, branchId: p.branchId }, p.variantId);
      const pos = (
        await new StockPositionRepository().lock(uow.client, uow.access.companyId, [key])
      )[0]!;
      await changeStockCondition(uow, key, {
        sourceId: source,
        effectKey: p.pendingId,
        expectedVersion: pos.version,
        quantity: line.sound,
        to: 'sound',
        actualDate: cairoDate(new Date()),
      });
    }
    await uow.client.query(
      `INSERT INTO shipments.unpack_inspection(company_id,pending_id,command_record_id,sound,damaged,uncertain,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uow.access.companyId,
        p.pendingId,
        recordId,
        line.sound,
        line.damaged,
        line.uncertain,
        uow.access.principalId,
        input.reason,
      ],
    );
  }
}
