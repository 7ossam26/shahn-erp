import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { readProducts } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type {
  InventoryCommand,
  InventoryResult,
  ShipmentCommand,
  ShipmentResult,
  ShipmentFields,
} from '@shahn/contracts';
import { inventoryCommands } from '../../apps/api/src/modules/inventory/service.js';
import { shipmentCommands } from '../../apps/api/src/modules/shipments/service.js';
import { shipmentFields } from './shipments.js';
/** Only the isolated P07 test/trial harness calls this. Real P05 receipts and P07 commands. */
export async function seedStockFulfillment(
  pool: Pool,
  token: string,
  companyId: string,
  branchId: string,
  brandId: string,
  governorateId: string,
  tariffId: string,
) {
  const command = (draft: object) => ({
    schemaVersion: 1,
    companyId,
    commandId: randomUUID(),
    ...draft,
  });
  const inv = async (draft: object) =>
    (await inventoryCommands(pool).execute(token, command(draft) as InventoryCommand))
      .body as InventoryResult;
  const result = await inv({
    type: 'product.create',
    brandId,
    fields: {
      name: 'قميص تجربة طلب المخزون — اسم طويل لاختبار الهواتف والفروع والمقاسات المختلفة',
      active: true,
      variants: [
        { name: 'Blue', options: 'أزرق كبير', active: true },
        { name: 'Red', options: 'أحمر', active: true },
        { name: 'Held', options: 'حجز به عجز فعلي', active: true },
      ],
    },
  });
  const p = (await readProducts(pool, companyId, brandId)).find((p) => p.id === result.entityId)!;
  const blue = p.variants.find((v) => v.name === 'Blue')!.id,
    red = p.variants.find((v) => v.name === 'Red')!.id,
    held = p.variants.find((v) => v.name === 'Held')!.id;
  await inv({
    type: 'stock.receive',
    branchId,
    brandId,
    actualDate: cairoDate(new Date()),
    lines: [
      { variantId: blue, quantity: 5, condition: 'sound' },
      { variantId: red, quantity: 3, condition: 'sound' },
      { variantId: held, quantity: 7, condition: 'sound' },
    ],
  });
  const fields: ShipmentFields = shipmentFields(
    { branchId, brandId, governorateId },
    {
      service: 'stored_stock',
      recipientName: 'طلب موقوف — عجز في مكونات المخزون',
      lines: [
        {
          id: randomUUID(),
          variantId: held,
          description: 'Held',
          quantity: 7,
          unitDue: { currency: 'EGP', amountMinor: '0' },
        },
      ],
    },
  );
  const blocked = (
    await shipmentCommands(pool).execute(
      token,
      command({
        type: 'shipment.confirm',
        fields,
        actualReceipt: false,
        duplicateAcknowledged: false,
        expectedPolicyVersion: 2,
        expectedTariffVersion: 1,
        expectedTariffId: tariffId,
      }) as ShipmentCommand,
    )
  ).body as ShipmentResult;
  // Explicitly marked observation fixture; P21's UI is not implemented. Preserve movement reconciliation.
  const source = randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'adjustment','P07 shortage observation fixture',$2::uuid::text,1)",
      [companyId, source],
    );
    await client.query(
      "INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,'observed sound 5',$4,$5,$6,'sound',-2,0,$7)",
      [companyId, randomUUID(), source, branchId, brandId, held, cairoDate(new Date())],
    );
    await client.query(
      'UPDATE inventory.stock_position SET sound_on_hand=5,version=version+1 WHERE company_id=$1 AND variant_id=$2',
      [companyId, held],
    );
    await client.query(
      'UPDATE inventory.stock_reservation SET shortage_held=true,version=version+1 WHERE company_id=$1 AND variant_id=$2 AND active',
      [companyId, held],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return { companyId, branchA: branchId, brand: brandId, product: p.id, blue, red, held, blocked };
}
