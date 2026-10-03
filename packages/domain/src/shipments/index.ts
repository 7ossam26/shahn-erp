import type {
  ShipmentFields,
  ShipmentPrice,
  ShipmentLine,
  PreparationState,
  BrandRecord,
  TariffRecord,
} from '@shahn/contracts';
import { AccessError } from '../access.js';
import { minor, addMinor } from '../kernel.js';
import { calculatePrice } from '../brands.js';
export class ShipmentFieldError extends AccessError {
  constructor(
    code: string,
    readonly field: string,
    status = 400,
  ) {
    super(code, status);
  }
}
export const normalizeShipmentDigits = (value: string) =>
  value.replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632)));
export function recipientPhone(display: string) {
  const phone = normalizeShipmentDigits(display).replace(/[ ()\-]/g, '');
  if (!/^(?:\+[1-9][0-9]{7,14}|01[0125][0-9]{8})$/.test(phone))
    throw new ShipmentFieldError('INVALID_RECIPIENT_PHONE', 'phoneDisplay');
  return phone;
}
export function shipmentGoods(lines: ShipmentLine[]) {
  let total = 0n;
  const ids = new Set<string>();
  for (const [i, line] of lines.entries()) {
    if (ids.has(line.id)) throw new ShipmentFieldError('DUPLICATE_LINE_ID', `lines.${i}.id`);
    ids.add(line.id);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000000)
      throw new ShipmentFieldError('INVALID_QUANTITY', `lines.${i}.quantity`);
    const unit = minor(line.unitDue.amountMinor, 'nonnegative');
    const product = unit * BigInt(line.quantity);
    if (unit > BigInt(Number.MAX_SAFE_INTEGER) || product > BigInt(Number.MAX_SAFE_INTEGER))
      throw new ShipmentFieldError('SOURCE_MONEY_OVERFLOW', `lines.${i}.unitDue`);
    total = addMinor(total, product);
    if (total > BigInt(Number.MAX_SAFE_INTEGER))
      throw new ShipmentFieldError('SOURCE_MONEY_OVERFLOW', 'lines');
  }
  return total.toString();
}
export function validateShipmentInput(fields: ShipmentFields) {
  const phone = recipientPhone(fields.phoneDisplay);
  if (fields.locationUrl) {
    try {
      const url = new URL(fields.locationUrl);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        !url.hostname ||
        fields.locationUrl !== fields.locationUrl.trim()
      )
        throw Error();
    } catch {
      throw new ShipmentFieldError('UNSAFE_LOCATION_URL', 'locationUrl');
    }
  }
  shipmentGoods(fields.lines);
  return phone;
}
export function shipmentPrice(
  price: Omit<ShipmentPrice, 'agreedPackingUpliftMinor' | 'brandShippingMinor' | 'shippingPayer'>,
  agreedUplift: string,
  fields: ShipmentFields,
): ShipmentPrice {
  const goods = shipmentGoods(fields.lines),
    recipientShipping =
      fields.shippingPayer === 'recipient'
        ? price.tariffMinor
        : fields.shippingPayer === 'brand'
          ? '0'
          : fields.recipientShippingDue?.amountMinor;
  if (
    recipientShipping === undefined ||
    (fields.shippingPayer !== 'shared' && fields.recipientShippingDue !== null)
  )
    throw new ShipmentFieldError('INVALID_SHIPPING_DUE', 'recipientShippingDue');
  if (minor(recipientShipping, 'nonnegative') > BigInt(price.tariffMinor))
    throw new ShipmentFieldError('SHIPPING_DUE_EXCEEDS_TARIFF', 'recipientShippingDue');
  const due = addMinor(BigInt(goods), BigInt(recipientShipping));
  if (due > BigInt(Number.MAX_SAFE_INTEGER))
    throw new ShipmentFieldError('SOURCE_MONEY_OVERFLOW', 'lines');
  return {
    ...price,
    agreedPackingUpliftMinor: agreedUplift,
    goodsDueMinor: goods,
    recipientShippingMinor: recipientShipping,
    recipientDueMinor: due.toString(),
    brandShippingMinor: (BigInt(price.tariffMinor) - BigInt(recipientShipping)).toString(),
    shippingPayer: fields.shippingPayer,
  };
}
/** Connected pure contract used by preview and committed confirmation; reference validity is checked in the transaction. */
export function intakePrice(
  policy: BrandRecord,
  fields: ShipmentFields,
  rates: TariffRecord[],
  context: Omit<
    ShipmentPrice,
    | 'baseShippingMinor'
    | 'packingUpliftMinor'
    | 'tariffMinor'
    | 'commissionBaseMinor'
    | 'goodsDueMinor'
    | 'recipientShippingMinor'
    | 'recipientDueMinor'
    | 'source'
    | 'tariffId'
    | 'tariffVersion'
    | 'agreedPackingUpliftMinor'
    | 'brandShippingMinor'
    | 'shippingPayer'
  >,
) {
  validateShipmentInput(fields);
  const selected = calculatePrice(
    policy,
    { ...fields, goodsDueMinor: shipmentGoods(fields.lines), recipientShippingMinor: '0' },
    rates,
  );
  return shipmentPrice({ ...context, ...selected }, policy.packingUpliftMinor, fields);
}
export const preparationFor = (service: ShipmentFields['service']): PreparationState =>
  service === 'brand_packed' ? 'not_required' : 'awaiting_preparation';
export function correctedPrice(old: ShipmentPrice, fields: ShipmentFields) {
  const uplift = fields.service === 'brand_packed' ? '0' : old.agreedPackingUpliftMinor;
  const tariff = addMinor(BigInt(old.baseShippingMinor), BigInt(uplift)).toString();
  return shipmentPrice(
    {
      ...old,
      branchId: fields.branchId,
      service: fields.service,
      packingUpliftMinor: uplift,
      tariffMinor: tariff,
      capturedAt: new Date().toISOString(),
    },
    old.agreedPackingUpliftMinor,
    fields,
  );
}
export function assertLocalTransition(
  state: { state: string; sourceState: string; handedOver: boolean },
  expected: number,
  version: number,
) {
  if (expected !== version) throw new AccessError('REVISION_CONFLICT', 409, version);
  if (state.handedOver) throw new AccessError('HANDED_OVER_PROTECTED', 409);
  if (state.sourceState !== 'local') throw new AccessError('SOURCE_ADAPTER_REQUIRED', 409);
  if (state.state !== 'active') throw new AccessError('SHIPMENT_CANCELLED', 409);
  if (version === 2147483647) throw new AccessError('REVISION_OVERFLOW', 409);
}
