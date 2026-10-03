import type { Pool } from 'pg';
import { digest } from '../access/crypto.js';
import { inventoryCommands } from './service.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { readProducts } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type { InventoryCommand, InventoryResult } from '@shahn/contracts';
/** Explicit isolated trial batch only; never called by application startup. */
export async function seedInventory(
  pool: Pool,
  token: string,
  companyId: string,
  branchId: string,
  brandId: string,
  environment: string,
) {
  if (!['test', 'development'].includes(environment))
    throw Error('INVENTORY_SEED_PRODUCTION_REFUSED');
  const company = (
    await pool.query<{ code: string }>('SELECT code FROM access.company WHERE id=$1', [companyId])
  ).rows[0];
  if (company?.code !== 'trial') throw Error('INVENTORY_SEED_ISOLATED_COMPANY_REQUIRED');
  const service = inventoryCommands(pool);
  const run = async (key: string, draft: object) => {
    const h = digest(companyId + ':P05:' + key),
      commandId = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
    return (
      await service.execute(token, {
        schemaVersion: 1,
        commandId,
        companyId,
        ...draft,
      } as InventoryCommand)
    ).body as InventoryResult;
  };
  const result = await run('products', {
    type: 'product.create',
    brandId,
    fields: {
      name: 'قميص التجربة — مجموعة المنتجات والملابس المنزلية ذات الاسم الطويل لجميع الفروع',
      active: true,
      variants: [
        {
          name: 'Blue',
          options: 'أزرق · مقاس كبير · وصف طويل للتحقق من شاشة الهاتف',
          active: true,
        },
        { name: 'Red', options: 'أحمر', active: true },
      ],
    },
  });
  const product = (
      await UnitOfWork.run(pool, token, companyId, 'inventory', (u) =>
        readProducts(u.client, companyId),
      )
    ).find((p) => p.id === result.entityId)!,
    blue = product.variants.find((v) => v.name === 'Blue')!.id,
    red = product.variants.find((v) => v.name === 'Red')!.id;
  const receipt = await run('actual-receipt:' + cairoDate(new Date()), {
    type: 'stock.receive',
    branchId,
    brandId,
    actualDate: cairoDate(new Date()),
    lines: [
      { variantId: blue, quantity: 10, condition: 'sound' },
      { variantId: blue, quantity: 2, condition: 'damaged' },
      { variantId: red, quantity: 3, condition: 'sound' },
    ],
  });
  return {
    companyId,
    branchA: branchId,
    brand: brandId,
    product: product.id,
    blue,
    red,
    receipt: receipt.entityId,
  };
}
