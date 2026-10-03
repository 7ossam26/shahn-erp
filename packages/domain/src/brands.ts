import type {
  BrandFields,
  PricingInput,
  PriceSnapshot,
  ReferenceFields,
  TariffRecord,
} from '@shahn/contracts';
import { AccessError } from './access.js';
import { addMinor, minor } from './kernel.js';
export function validateReference(fields: ReferenceFields) {
  if (
    (fields.kind === 'area') !== (fields.parentId !== null) ||
    (fields.kind !== 'tier' && fields.volumeRange !== null)
  )
    throw new AccessError('INVALID_REFERENCE', 409);
}
export function validateBrand(fields: BrandFields) {
  if (
    !fields.services.length ||
    new Set(fields.services).size !== fields.services.length ||
    !fields.services.includes(fields.defaultService)
  )
    throw new AccessError('INVALID_DEFAULT_SERVICE', 409);
  minor(fields.packingUpliftMinor, 'nonnegative');
  if (fields.services.includes('stored_stock') && !fields.storage)
    throw new AccessError('STORAGE_REQUIRED', 409);
  if (fields.storage) {
    const s = fields.storage;
    minor(s.monthlyFeeMinor, 'nonnegative');
    if (
      Number(s.startDate.slice(8)) !== s.anniversaryDay ||
      (s.stopDate !== null && s.stopDate < s.startDate) ||
      s.active === (s.stopDate !== null)
    )
      throw new AccessError('INVALID_STORAGE_AGREEMENT', 409);
  }
}
/** Pure exact-money selection; persisted references/active scope are checked by the repository. */
export function calculatePrice(
  policy: BrandFields,
  input: PricingInput,
  tariffs: TariffRecord[],
): Pick<
  PriceSnapshot,
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
> {
  if (!policy.active || !policy.services.includes(input.service))
    throw new AccessError('SERVICE_UNAVAILABLE', 409);
  if (input.service === 'stored_stock' && !policy.storage?.active)
    throw new AccessError('SERVICE_UNAVAILABLE', 409);
  const applicable = tariffs.filter(
    (r) => r.active && r.tierId === policy.tierId && r.governorateId === input.governorateId,
  );
  const selected =
    (input.areaId ? applicable.find((r) => r.areaId === input.areaId) : undefined) ??
    applicable.find((r) => r.areaId === null);
  if (!selected) throw new AccessError('PRICE_MISSING', 409);
  const base = minor(selected.amountMinor, 'nonnegative').toString(),
    uplift =
      input.service === 'brand_packed'
        ? '0'
        : minor(policy.packingUpliftMinor, 'nonnegative').toString();
  minor(input.goodsDueMinor, 'nonnegative');
  minor(input.recipientShippingMinor, 'nonnegative');
  return {
    baseShippingMinor: base,
    packingUpliftMinor: uplift,
    tariffMinor: addMinor(BigInt(base), BigInt(uplift)).toString(),
    commissionBaseMinor: base,
    goodsDueMinor: input.goodsDueMinor,
    recipientShippingMinor: input.recipientShippingMinor,
    recipientDueMinor: addMinor(
      BigInt(input.goodsDueMinor),
      BigInt(input.recipientShippingMinor),
    ).toString(),
    source: selected.areaId ? 'area_override' : 'governorate',
    tariffId: selected.id,
    tariffVersion: selected.version,
  };
}
