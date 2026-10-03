import type { Pool } from 'pg';
import type { ShipmentCommand, ShipmentFields, ShipmentResult } from '@shahn/contracts';
import { readTariffs, readBrand } from '@shahn/database';
import { digest } from '../access/crypto.js';
import { shipmentCommands } from './service.js';
/** Repeatable isolated manual fixtures. Never called at application startup or in production. */
export async function seedShipments(
  pool: Pool,
  token: string,
  input: { companyId: string; branchId: string; brandId: string; governorateId: string },
  environment: string,
) {
  if (!['development', 'test'].includes(environment))
    throw Error('SHIPMENT_SEED_PRODUCTION_REFUSED');
  const brand = await readBrand(pool, input.companyId, input.brandId),
    tariff = (await readTariffs(pool, input.companyId)).find(
      (t) =>
        t.tierId === brand?.tierId &&
        t.governorateId === input.governorateId &&
        t.areaId === null &&
        t.active,
    );
  if (!brand || !tariff) throw Error('SHIPMENT_SEED_PRICE_REQUIRED');
  const identity = (key: string) => {
    const h = digest(input.companyId + ':P06:' + key);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
  };
  const results: Record<string, ShipmentResult> = {},
    service = shipmentCommands(pool);
  for (const [key, packed, prepaid, shippingPaid] of [
    ['ready', false, false, false],
    ['packed', true, false, false],
    ['shippingOnly', false, true, false],
    ['fullyPaid', false, true, true],
  ] as const) {
    const fields: ShipmentFields = {
      branchId: input.branchId,
      brandId: input.brandId,
      service: packed ? 'company_packed' : 'brand_packed',
      brandReference: 'P06-' + key,
      recipientName: 'مستلم تجربة ' + key,
      phoneDisplay: '٠١٠ ١٢٣٤ ٥٦٧٨',
      address: 'عنوان تجربة القاهرة — من البوليصة',
      governorateId: input.governorateId,
      areaId: null,
      locationUrl: '',
      inspectionAllowed: true,
      comment: 'بيانات شركة الاختبار فقط',
      shippingPayer: shippingPaid ? 'brand' : 'recipient',
      recipientShippingDue: null,
      lines: [
        {
          id: identity(key + '-line1'),
          description: 'قطعة أولى',
          quantity: 1,
          unitDue: { currency: 'EGP', amountMinor: prepaid ? '0' : '10000' },
        },
        {
          id: identity(key + '-line2'),
          description: 'قطعة ثانية',
          quantity: 1,
          unitDue: { currency: 'EGP', amountMinor: prepaid ? '0' : '15000' },
        },
      ],
    };
    const command: ShipmentCommand = {
      schemaVersion: 1,
      companyId: input.companyId,
      commandId: identity(key),
      type: 'shipment.confirm',
      fields,
      actualReceipt: true,
      duplicateAcknowledged: false,
      expectedPolicyVersion: brand.version,
      expectedTariffVersion: tariff.version,
      expectedTariffId: tariff.id,
    };
    results[key] = (await service.execute(token, command)).body as ShipmentResult;
  }
  return results;
}
