import { randomUUID } from 'node:crypto';
import type { ShipmentFields } from '@shahn/contracts';
export function shipmentFields(
  input: { branchId: string; brandId: string; governorateId: string },
  changes: Partial<ShipmentFields> = {},
): ShipmentFields {
  return {
    ...input,
    service: 'brand_packed',
    brandReference: '',
    recipientName: 'مستلم التجربة',
    phoneDisplay: '٠١٠ ١٢٣٤ ٥٦٧٨',
    address: 'عنوان البوليصة المكتوب — القاهرة',
    areaId: null,
    locationUrl: '',
    inspectionAllowed: true,
    comment: '',
    shippingPayer: 'recipient',
    recipientShippingDue: null,
    lines: [
      {
        id: randomUUID(),
        description: 'قطعة أولى',
        quantity: 1,
        unitDue: { currency: 'EGP', amountMinor: '10000' },
      },
      {
        id: randomUUID(),
        description: 'قطعة ثانية',
        quantity: 1,
        unitDue: { currency: 'EGP', amountMinor: '15000' },
      },
    ],
    ...changes,
  };
}
