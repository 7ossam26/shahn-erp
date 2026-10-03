import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  AccessError,
  addQuantity,
  stockBalance,
  receiptEffect,
  validateProduct,
  cairoDate,
  cairoDayRange,
  wholeQuantity,
} from '@shahn/domain';
import {
  readProducts,
  readStock,
  safeStockNumber,
  StockPositionRepository,
  positionKey,
  type PositionKey,
} from '@shahn/database';
import {
  validateInventoryCommand,
  type InventoryCommand,
  type InventoryResult,
  type InventoryFilter,
  type InventoryCatalog,
  type ReceiptDetail,
  type ProductFields,
  type VariantHistory,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { configurationLock } from '../reference-data/service.js';
export const defaultInventoryFilter = (branches: string[]): InventoryFilter => ({
  branches,
  brands: [],
  search: '',
  productId: null,
  variantId: null,
  categories: [],
  noAvailable: false,
  movementFrom: null,
  movementTo: null,
  page: 1,
  limit: 25,
});
export function authorizeInventoryBranches(uow: UnitOfWork, branches: string[]) {
  for (const id of branches) uow.assertBranch(id);
}
export async function inventoryCatalog(uow: UnitOfWork): Promise<InventoryCatalog> {
  return {
    brands: (
      await uow.client.query<{ id: string; name: string; active: boolean }>(
        'SELECT id,name,active FROM commercial.brand WHERE company_id=$1 ORDER BY name,id',
        [uow.access.companyId],
      )
    ).rows,
    branches: uow.access.assignedBranches,
    products: await readProducts(uow.client, uow.access.companyId),
  };
}
export async function inventoryList(uow: UnitOfWork, filter: InventoryFilter) {
  authorizeInventoryBranches(uow, filter.branches);
  if (filter.movementFrom && filter.movementTo && filter.movementFrom > filter.movementTo)
    throw new AccessError('INVALID_DATE_RANGE', 400);
  return readStock(
    uow.client,
    uow.access.companyId,
    filter,
    filter.movementFrom ? cairoDayRange(filter.movementFrom).start : null,
    filter.movementTo ? cairoDayRange(filter.movementTo).end : null,
  );
}
export async function productDetail(uow: UnitOfWork, id: string) {
  const product = (await readProducts(uow.client, uow.access.companyId)).find((p) => p.id === id);
  if (!product) throw new AccessError('NOT_FOUND', 404);
  const rows = (
    await uow.client.query<{ version: number; recorded_at: Date; fields: ProductFields }>(
      'SELECT version,recorded_at,fields FROM inventory.product_revision WHERE company_id=$1 AND product_id=$2 ORDER BY version DESC',
      [uow.access.companyId, id],
    )
  ).rows;
  return {
    product,
    history: rows.map((r) => ({
      version: r.version,
      recordedAt: r.recorded_at.toISOString(),
      fields: r.fields,
    })),
  };
}
export async function receiptDetail(uow: UnitOfWork, id: string): Promise<ReceiptDetail> {
  const row = (
    await uow.client.query<{
      id: string;
      reference: string;
      branch_id: string;
      branch_name: string;
      brand_id: string;
      brand_name: string;
      actual_date: string;
      recorded_at: Date;
      actor_name: string;
    }>(
      `SELECT r.*,br.name AS branch_name,b.name AS brand_name,r.actual_date::text FROM inventory.stock_receipt r JOIN access.branch br ON (br.company_id,br.id)=(r.company_id,r.branch_id) JOIN commercial.brand b ON (b.company_id,b.id)=(r.company_id,r.brand_id) WHERE r.company_id=$1 AND r.id=$2`,
      [uow.access.companyId, id],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  uow.assertBranch(row.branch_id);
  const lines = (
    await uow.client.query<{
      id: string;
      variantId: string;
      productName: string;
      variantName: string;
      options: string;
      quantity: string;
      condition: 'sound' | 'damaged' | 'uncertain';
    }>(
      `SELECT id,variant_id AS "variantId",product_name AS "productName",variant_name AS "variantName",options,quantity::text,condition FROM inventory.stock_receipt_line WHERE company_id=$1 AND receipt_id=$2 ORDER BY line_number`,
      [uow.access.companyId, id],
    )
  ).rows;
  return {
    id: row.id,
    reference: row.reference,
    branchId: row.branch_id,
    branchName: row.branch_name,
    brandId: row.brand_id,
    brandName: row.brand_name,
    actualDate: row.actual_date,
    recordedAt: row.recorded_at.toISOString(),
    actorName: row.actor_name,
    lines: lines.map((l) => ({ ...l, quantity: safeStockNumber(l.quantity) })),
  };
}
export async function variantHistory(
  uow: UnitOfWork,
  id: string,
  branch: string,
  page: number,
  limit: number,
): Promise<VariantHistory> {
  uow.assertBranch(branch);
  const filter = { ...defaultInventoryFilter([branch]), variantId: id };
  const position = (await inventoryList(uow, filter)).items[0];
  if (!position) throw new AccessError('NOT_FOUND', 404);
  const row = (
    await uow.client.query<{
      total: string;
      items: {
        id: string;
        receiptId: string;
        reference: string;
        quantity: string;
        condition: 'sound' | 'damaged' | 'uncertain';
        actualDate: string;
        recordedAt: string;
        productName: string;
        variantName: string;
        options: string;
      }[];
    }>(
      `WITH history AS (SELECT m.id,m.source_id AS "receiptId",r.reference,l.quantity::text,m.condition,m.actual_date::text AS "actualDate",m.recorded_at AS "recordedAt",l.product_name AS "productName",l.variant_name AS "variantName",l.options FROM inventory.stock_movement m JOIN inventory.stock_receipt r ON (r.company_id,r.id)=(m.company_id,m.source_id) JOIN inventory.stock_receipt_line l ON (l.company_id,l.id)=(m.company_id,m.receipt_line_id) WHERE m.company_id=$1 AND m.branch_id=$2 AND m.variant_id=$3) SELECT (SELECT count(*)::text FROM history) AS total,COALESCE((SELECT jsonb_agg(t) FROM (SELECT * FROM history ORDER BY "recordedAt" DESC,id DESC LIMIT $4 OFFSET $5) t),'[]') AS items`,
      [uow.access.companyId, branch, id, limit, (page - 1) * limit],
    )
  ).rows[0]!;
  return {
    position,
    movements: row.items.map((m) => ({ ...m, quantity: safeStockNumber(m.quantity) })),
    total: Number(row.total),
    page,
    limit,
  };
}
export function inventoryCommands(
  pool: Pool,
  hooks: {
    afterValidateReceipt?: () => Promise<void>;
    afterLine?: (index: number) => Promise<void>;
  } = {},
) {
  const kinds: InventoryCommand['type'][] = ['product.create', 'product.update', 'stock.receive'];
  const definitions: CommandDefinition<InventoryCommand>[] = kinds.map((kind) => ({
    family: kind === 'stock.receive' ? 'inventory.receipt' : 'inventory.product',
    kind,
    capability: 'inventory',
    authorize: async (uow, value) => {
      if ('branchId' in value && typeof value.branchId === 'string')
        uow.assertBranch(value.branchId);
    },
    rejectionReference: (input) => ({
      entityId: 'productId' in input ? input.productId : input.commandId,
      branchId: 'branchId' in input ? input.branchId : input.companyId,
    }),
    resolve: async (uow, ref) => {
      const row = (
        await uow.client.query<{ body: unknown }>(
          'SELECT body FROM inventory.command_outcome WHERE company_id=$1 AND id=$2',
          [uow.access.companyId, ref.outcomeId],
        )
      ).rows[0];
      if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
      return row.body;
    },
    execute: async (uow, input, recordId) => {
      if (!validateInventoryCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
      await configurationLock(uow, input.type !== 'stock.receive');
      const company = uow.access.companyId,
        client = uow.client;
      let entityId: string = randomUUID(),
        beforeVersion: number | null = null,
        version = 1,
        branchId: string | null = null;
      const warnings: string[] = [];
      if (input.type === 'stock.receive') {
        branchId = input.branchId;
        uow.assertBranch(branchId);
        if (input.actualDate > cairoDate(new Date()))
          throw new AccessError('FUTURE_RECEIPT_DATE', 400);
        const branch = (
          await client.query(
            'SELECT id FROM access.branch WHERE company_id=$1 AND id=$2 AND active',
            [company, branchId],
          )
        ).rows[0];
        if (!branch) throw new AccessError('FORBIDDEN_SCOPE');
        const brand = (
          await client.query(
            'SELECT id FROM commercial.brand WHERE company_id=$1 AND id=$2 AND active',
            [company, input.brandId],
          )
        ).rows[0];
        if (!brand) throw new AccessError('INACTIVE_OR_UNKNOWN_BRAND', 409);
        const ids = [...new Set(input.lines.map((l) => l.variantId))];
        const variants = (
          await client.query<{ id: string; product_name: string; name: string; options: string }>(
            `SELECT v.id,p.name AS product_name,v.name,v.options FROM inventory.product_variant v JOIN inventory.product p ON (p.company_id,p.id)=(v.company_id,v.product_id) WHERE v.company_id=$1 AND v.brand_id=$2 AND v.id=ANY($3::uuid[]) AND v.active AND p.active`,
            [company, input.brandId, ids],
          )
        ).rows;
        if (variants.length !== ids.length)
          throw new AccessError('INACTIVE_OR_UNKNOWN_VARIANT', 409);
        // Check aggregate command quantities, including repeated variants/conditions.
        const additions = new Map<string, { sound: number; unavailable: number }>();
        for (const line of input.lines) {
          const delta = receiptEffect(line.quantity, line.condition),
            old = additions.get(line.variantId) ?? { sound: 0, unavailable: 0 };
          additions.set(line.variantId, {
            sound: addQuantity(old.sound, delta.sound),
            unavailable: addQuantity(old.unavailable, delta.unavailable),
          });
        }
        await hooks.afterValidateReceipt?.();
        const repo = new StockPositionRepository(),
          keys = ids
            .map((variantId) => ({ branchId: input.branchId, brandId: input.brandId, variantId }))
            .sort((a, b) => positionKey(a).localeCompare(positionKey(b)));
        for (const key of keys) uow.lockOrder('stock', positionKey(key));
        const positions = await repo.lock(client, company, keys);
        await client.query(
          `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2::uuid,'receipt','erp',$2::uuid::text,1)`,
          [company, entityId],
        );
        await client.query(
          `INSERT INTO inventory.stock_receipt(company_id,id,branch_id,brand_id,actual_date,actor_id,actor_name) VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [
            company,
            entityId,
            branchId,
            input.brandId,
            input.actualDate,
            uow.access.principalId,
            uow.access.displayName,
          ],
        );
        for (let index = 0; index < input.lines.length; index++) {
          const line = input.lines[index]!,
            variant = variants.find((v) => v.id === line.variantId)!,
            lineId = randomUUID(),
            delta = receiptEffect(line.quantity, line.condition);
          await client.query(
            `INSERT INTO inventory.stock_receipt_line(company_id,id,receipt_id,branch_id,brand_id,variant_id,line_number,quantity,condition,product_name,variant_name,options) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              company,
              lineId,
              entityId,
              branchId,
              input.brandId,
              line.variantId,
              index + 1,
              line.quantity,
              line.condition,
              variant.product_name,
              variant.name,
              variant.options,
            ],
          );
          await client.query(
            `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,receipt_line_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              company,
              randomUUID(),
              entityId,
              String(index + 1),
              branchId,
              input.brandId,
              line.variantId,
              lineId,
              line.condition,
              delta.sound,
              delta.unavailable,
              input.actualDate,
            ],
          );
          await hooks.afterLine?.(index);
        }
        for (const position of positions) {
          const delta = additions.get(position.variantId)!,
            sound = addQuantity(safeStockNumber(position.sound), delta.sound),
            unavailable = addQuantity(safeStockNumber(position.unavailable), delta.unavailable);
          stockBalance(sound, unavailable, safeStockNumber(position.reserved));
          await repo.update(client, company, position, sound, unavailable);
        }
      } else {
        validateProduct(input.fields);
        let brandId: string;
        if (input.type === 'product.update') {
          entityId = input.productId;
          const old = (await readProducts(client, company)).find((p) => p.id === entityId);
          if (!old) throw new AccessError('NOT_FOUND', 404);
          if (old.version !== input.expectedVersion)
            throw new AccessError('REVISION_CONFLICT', 409, old.version);
          if (old.version === 2147483647) throw new AccessError('REVISION_OVERFLOW', 409);
          beforeVersion = old.version;
          version = old.version + 1;
          brandId = old.brandId;
          const oldIds = old.variants.map((v) => v.id),
            newIds = input.fields.variants.map((v) => v.id).filter(Boolean);
          if (
            oldIds.some((id) => !newIds.includes(id)) ||
            newIds.some((id) => !oldIds.includes(id!))
          )
            throw new AccessError('VARIANT_HISTORY_REQUIRED', 409);
        } else {
          brandId = input.brandId;
          if (input.fields.variants.some((v) => v.id))
            throw new AccessError('INVALID_VARIANT_ID', 400);
        }
        const brand = (
          await client.query<{ active: boolean }>(
            'SELECT active FROM commercial.brand WHERE company_id=$1 AND id=$2',
            [company, brandId],
          )
        ).rows[0];
        if (!brand || (!brand.active && input.fields.active))
          throw new AccessError('INACTIVE_OR_UNKNOWN_BRAND', 409);
        const fields = {
          ...input.fields,
          variants: input.fields.variants.map((v) => ({ ...v, id: v.id ?? randomUUID() })),
        };
        const existing = await readProducts(client, company, brandId),
          displays = new Set<string>();
        for (const variant of fields.variants) {
          const key =
            fields.name.trim() + '\u0000' + variant.name.trim() + '\u0000' + variant.options.trim();
          if (
            displays.has(key) ||
            existing.some(
              (p) =>
                p.id !== entityId &&
                p.name.trim() === fields.name.trim() &&
                p.variants.some(
                  (v) =>
                    v.name.trim() === variant.name.trim() &&
                    v.options.trim() === variant.options.trim(),
                ),
            )
          )
            warnings.push('DUPLICATE_DISPLAY');
          displays.add(key);
        }
        if (input.type === 'product.create')
          await client.query(
            'INSERT INTO inventory.product(company_id,brand_id,id,name,active,version) VALUES($1,$2,$3,$4,$5,$6)',
            [company, brandId, entityId, fields.name, fields.active, version],
          );
        else
          await client.query(
            'UPDATE inventory.product SET name=$3,active=$4,version=$5,updated_at=clock_timestamp() WHERE company_id=$1 AND id=$2',
            [company, entityId, fields.name, fields.active, version],
          );
        for (const variant of fields.variants)
          await client.query(
            `INSERT INTO inventory.product_variant(company_id,brand_id,product_id,id,name,options,active,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(company_id,id) DO UPDATE SET name=$5,options=$6,active=$7,version=$8,updated_at=clock_timestamp()`,
            [
              company,
              brandId,
              entityId,
              variant.id,
              variant.name,
              variant.options,
              variant.active,
              version,
            ],
          );
        await client.query(
          'INSERT INTO inventory.product_revision(company_id,product_id,version,fields) VALUES($1,$2,$3,$4)',
          [company, entityId, version, JSON.stringify(fields)],
        );
      }
      const body: InventoryResult = {
          commandId: input.commandId,
          entityId,
          version,
          branchId,
          warnings: [...new Set(warnings)],
        },
        outcomeId = randomUUID();
      await client.query(
        'INSERT INTO inventory.command_outcome(company_id,id,command_record_id,body) VALUES($1,$2,$3,$4)',
        [company, outcomeId, recordId, JSON.stringify(body)],
      );
      return {
        reply: { status: 200, body },
        reference: { outcomeId, entityId, ...(branchId ? { branchId } : {}) },
        entityId,
        beforeVersion,
        afterVersion: version,
      };
    },
  }));
  return new CommandService(pool, definitions);
}
/** P07/P15/P21 call with an already locked position in their UnitOfWork; no HTTP or nested tx. */
export async function reserveStock(
  uow: UnitOfWork,
  key: PositionKey,
  input: { sourceId: string; kind: 'order' | 'loose_transfer'; lineKey: string; quantity: number },
) {
  uow.assertBranch(key.branchId);
  uow.requireLock('stock', positionKey(key));
  wholeQuantity(input.quantity, true);
  const repo = new StockPositionRepository(),
    position = (await repo.lock(uow.client, uow.access.companyId, [key]))[0]!;
  const balance = stockBalance(
    safeStockNumber(position.sound),
    safeStockNumber(position.unavailable),
    safeStockNumber(position.reserved),
  );
  if (input.quantity > balance.available) throw new AccessError('STOCK_SHORTAGE', 409);
  addQuantity(balance.reserved, input.quantity);
  const id = randomUUID();
  await uow.client.query(
    `INSERT INTO inventory.stock_reservation(company_id,id,source_id,source_kind,line_key,branch_id,brand_id,variant_id,quantity) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      uow.access.companyId,
      id,
      input.sourceId,
      input.kind,
      input.lineKey,
      key.branchId,
      key.brandId,
      key.variantId,
      input.quantity,
    ],
  );
  await uow.client.query(
    `INSERT INTO inventory.reservation_event(company_id,id,reservation_id,kind,source_id) VALUES($1,$2,$3,'reserved',$4)`,
    [uow.access.companyId, randomUUID(), id, input.sourceId],
  );
  await uow.client.query(
    'UPDATE inventory.stock_position SET version=version+1,updated_at=clock_timestamp() WHERE company_id=$1 AND branch_id=$2 AND brand_id=$3 AND variant_id=$4',
    [uow.access.companyId, key.branchId, key.brandId, key.variantId],
  );
  await repo.refreshHolds(uow.client, uow.access.companyId, key);
}
export async function releaseStockReservation(
  uow: UnitOfWork,
  key: PositionKey,
  reservationId: string,
  sourceId: string,
) {
  uow.assertBranch(key.branchId);
  uow.requireLock('stock', positionKey(key));
  const company = uow.access.companyId,
    repo = new StockPositionRepository();
  await repo.lock(uow.client, company, [key]);
  const row = (
    await uow.client.query<{ active: boolean }>(
      `SELECT active FROM inventory.stock_reservation WHERE company_id=$1 AND id=$2 AND branch_id=$3 AND brand_id=$4 AND variant_id=$5 FOR UPDATE`,
      [company, reservationId, key.branchId, key.brandId, key.variantId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  if (!row.active) return;
  await uow.client.query(
    'UPDATE inventory.stock_reservation SET active=false,shortage_held=false,version=version+1,updated_at=clock_timestamp() WHERE company_id=$1 AND id=$2',
    [company, reservationId],
  );
  await uow.client.query(
    `INSERT INTO inventory.reservation_event(company_id,id,reservation_id,kind,source_id) VALUES($1,$2,$3,'released',$4)`,
    [company, randomUUID(), reservationId, sourceId],
  );
  await uow.client.query(
    'UPDATE inventory.stock_position SET version=version+1,updated_at=clock_timestamp() WHERE company_id=$1 AND branch_id=$2 AND brand_id=$3 AND variant_id=$4',
    [company, key.branchId, key.brandId, key.variantId],
  );
  await repo.refreshHolds(uow.client, company, key);
}
/** Reusable inspection effect only; P21 owns reasons/actual-fact confirmation and its UI/audit. */
export async function changeStockCondition(
  uow: UnitOfWork,
  key: PositionKey,
  input: {
    sourceId: string;
    effectKey: string;
    expectedVersion: number;
    quantity: number;
    to: 'sound' | 'unavailable';
    actualDate: string;
  },
) {
  uow.assertBranch(key.branchId);
  uow.requireLock('stock', positionKey(key));
  wholeQuantity(input.quantity, true);
  if (input.actualDate > cairoDate(new Date())) throw new AccessError('FUTURE_RECEIPT_DATE', 400);
  const company = uow.access.companyId,
    repo = new StockPositionRepository(),
    pos = (await repo.lock(uow.client, company, [key]))[0]!;
  const delta = input.to === 'sound' ? input.quantity : -input.quantity;
  const prior = (
    await uow.client.query<{
      branch_id: string;
      brand_id: string;
      variant_id: string;
      sound_delta: string;
      unavailable_delta: string;
      actual_date: string;
    }>(
      `SELECT branch_id,brand_id,variant_id,sound_delta::text,unavailable_delta::text,actual_date::text FROM inventory.stock_movement WHERE company_id=$1 AND source_id=$2 AND effect_key=$3`,
      [company, input.sourceId, input.effectKey],
    )
  ).rows[0];
  if (prior) {
    if (
      prior.branch_id !== key.branchId ||
      prior.brand_id !== key.brandId ||
      prior.variant_id !== key.variantId ||
      prior.sound_delta !== String(delta) ||
      prior.unavailable_delta !== String(-delta) ||
      prior.actual_date !== input.actualDate
    )
      throw new AccessError('SOURCE_EFFECT_CONFLICT', 409);
    return;
  }
  if (pos.version !== input.expectedVersion)
    throw new AccessError('REVISION_CONFLICT', 409, pos.version);
  const sound = safeStockNumber(pos.sound),
    unavailable = safeStockNumber(pos.unavailable);
  if ((input.to === 'sound' ? unavailable : sound) < input.quantity)
    throw new AccessError('STOCK_SHORTAGE', 409);
  const nextSound =
      input.to === 'sound' ? addQuantity(sound, input.quantity) : sound - input.quantity,
    nextUnavailable =
      input.to === 'sound'
        ? unavailable - input.quantity
        : addQuantity(unavailable, input.quantity);
  stockBalance(nextSound, nextUnavailable, safeStockNumber(pos.reserved));
  await uow.client.query(
    `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      company,
      randomUUID(),
      input.sourceId,
      input.effectKey,
      key.branchId,
      key.brandId,
      key.variantId,
      input.to === 'sound' ? 'sound' : 'uncertain',
      delta,
      -delta,
      input.actualDate,
    ],
  );
  await repo.update(uow.client, company, pos, nextSound, nextUnavailable);
}
