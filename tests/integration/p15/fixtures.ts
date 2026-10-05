import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { readBrand, readProducts } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type {
  GoodsTransferCommand,
  GoodsTransferResult,
  TransferLineInput,
  InventoryCommand,
  InventoryResult,
  ShipmentCommand,
  ShipmentResult,
} from '@shahn/contracts';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { inventoryCommands } from '../../../apps/api/src/modules/inventory/service.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
import { goodsTransferCommands } from '../../../apps/api/src/modules/goods-transfers/transfer.service.js';
import { shipmentFields } from '../../support/shipments.js';
import { dispatchFixture } from '../p12/fixtures.js';

export async function transferFixture(pool: Pool, origin?: string) {
  const f = await dispatchFixture(pool, origin);
  const original = (await readBrand(pool, f.company, f.seed.brand))!;
  const { id, version, ...fields } = original;
  await commercialCommands(pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'brand.update',
    entityId: id,
    expectedVersion: version,
    fields: {
      ...fields,
      services: ['brand_packed', 'stored_stock'],
      defaultService: 'brand_packed',
      storage: {
        monthlyFeeMinor: '10000',
        branchId: f.a,
        startDate: cairoDate(new Date()),
        anniversaryDay: Number(cairoDate(new Date()).slice(-2)),
        active: true,
        stopDate: null,
      },
    },
  });
  const inv = async (input: object) =>
    (
      await inventoryCommands(pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        ...input,
      } as InventoryCommand)
    ).body as InventoryResult;
  const product = await inv({
    type: 'product.create',
    brandId: id,
    fields: {
      name: 'P15 inventory',
      active: true,
      variants: [{ name: 'Blue', options: '', active: true }],
    },
  });
  const variant = (await readProducts(pool, f.company, id)).find((p) => p.id === product.entityId)!
    .variants[0]!.id;
  await inv({
    type: 'stock.receive',
    brandId: id,
    branchId: f.a,
    actualDate: cairoDate(new Date()),
    lines: [{ variantId: variant, quantity: 10, condition: 'sound' }],
  });
  const fieldsForParcel = shipmentFields(
    { brandId: id, branchId: f.a, governorateId: f.seed.cairo },
    {
      service: 'stored_stock',
      lines: [
        {
          id: randomUUID(),
          variantId: variant,
          description: 'Two units',
          quantity: 2,
          unitDue: { currency: 'EGP', amountMinor: '10000' },
        },
      ],
    },
  );
  const brandVersion = Number(
    (
      await pool.query(`SELECT version FROM commercial.brand WHERE company_id=$1 AND id=$2`, [
        f.company,
        id,
      ])
    ).rows[0].version,
  );
  const s = (
    await shipmentCommands(pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'shipment.confirm',
      fields: fieldsForParcel,
      actualReceipt: false,
      duplicateAcknowledged: false,
      expectedPolicyVersion: brandVersion,
      expectedTariffVersion: 1,
      expectedTariffId: f.seed.base,
    } as ShipmentCommand)
  ).body as ShipmentResult;
  const packed = (
    await shipmentCommands(pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'shipment.prepare',
      shipmentId: s.shipmentId,
      expectedVersion: s.version,
    } as ShipmentCommand)
  ).body as ShipmentResult;
  const send = goodsTransferCommands(pool, 'send'),
    receive = goodsTransferCommands(pool, 'receive');
  const command = (input: object) =>
    ({
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      branchId: f.a,
      ...input,
    }) as GoodsTransferCommand;
  const create = async (lines: TransferLineInput[]) =>
    (
      await send.execute(
        f.admin.token,
        command({
          type: 'goods.create',
          destinationBranchId: f.b,
          driverId: f.driver,
          plannedAt: new Date().toISOString(),
          lines,
        }),
      )
    ).body as GoodsTransferResult;
  const position = async (branch: string) =>
    (
      await pool.query<{ sound: string; unavailable: string; reserved: string }>(
        `SELECT sound_on_hand::text AS sound,unavailable_on_hand::text AS unavailable,
       (SELECT COALESCE(sum(quantity),0)::text FROM inventory.stock_reservation r WHERE (r.company_id,r.branch_id,r.brand_id,r.variant_id)=(p.company_id,p.branch_id,p.brand_id,p.variant_id) AND r.active) AS reserved
     FROM inventory.stock_position p WHERE p.company_id=$1 AND p.branch_id=$2 AND p.brand_id=$3 AND p.variant_id=$4`,
        [f.company, branch, id, variant],
      )
    ).rows[0];
  return { ...f, brand: id, variant, parcel: packed, send, receive, command, create, position };
}
