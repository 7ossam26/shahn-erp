import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  recipientPhone,
  intakePrice,
  correctedPrice,
  preparationFor,
  assertLocalTransition,
  validateShipmentInput,
} from '@shahn/domain';
import {
  validateShipmentFields,
  validateShipmentCommand,
  type BrandRecord,
  type ShipmentFields,
  type TariffRecord,
} from '@shahn/contracts';
import { shipmentFields } from '../support/shipments.js';
const company = randomUUID(),
  brand = randomUUID(),
  branch = randomUUID(),
  gov = randomUUID(),
  tier = randomUUID(),
  area = randomUUID();
const fields = () => shipmentFields({ branchId: branch, brandId: brand, governorateId: gov });
const policy: BrandRecord = {
  id: brand,
  version: 1,
  name: 'براند',
  active: true,
  contact: null,
  externalReference: null,
  services: ['brand_packed', 'company_packed'],
  defaultService: 'brand_packed',
  tierId: tier,
  packingUpliftMinor: '500',
  partialDelivery: true,
  payoutWeekdays: [0],
  allowNegativeBalance: false,
  storage: null,
};
const rates: TariffRecord[] = [
  {
    id: randomUUID(),
    version: 1,
    tierId: tier,
    governorateId: gov,
    areaId: null,
    amountMinor: '5000',
    active: true,
  },
  {
    id: randomUUID(),
    version: 1,
    tierId: tier,
    governorateId: gov,
    areaId: area,
    amountMinor: '6000',
    active: true,
  },
];
const context = {
  schemaVersion: 1 as const,
  currency: 'EGP' as const,
  companyId: company,
  brandId: brand,
  brandName: 'براند',
  policyVersion: 1,
  branchId: branch,
  service: 'brand_packed' as const,
  partialDelivery: true,
  tierId: tier,
  tierName: 'شريحة',
  governorateId: gov,
  governorateName: 'القاهرة',
  areaId: null,
  areaName: null,
  capturedAt: '2026-10-04T00:00:00Z',
};
const price = (f: ShipmentFields, rs = rates) =>
  intakePrice(policy, f, rs, { ...context, service: f.service });
describe('P06 connected intake pricing, native money and source bounds', () => {
  it('preserves all four commercial/outstanding examples and base-only commission', () => {
    const ready = price(fields()),
      packing = price({ ...fields(), service: 'company_packed' }),
      prepaidFields = fields();
    prepaidFields.lines = prepaidFields.lines.map((l) => ({
      ...l,
      unitDue: { currency: 'EGP', amountMinor: '0' },
    }));
    const shippingOnly = price(prepaidFields),
      fullyPaid = price({ ...prepaidFields, shippingPayer: 'brand' });
    expect([
      ready.recipientDueMinor,
      packing.recipientDueMinor,
      shippingOnly.recipientDueMinor,
      fullyPaid.recipientDueMinor,
    ]).toEqual(['30000', '30500', '5000', '0']);
    expect(packing.commissionBaseMinor).toBe('5000');
    expect(fullyPaid.brandShippingMinor).toBe('5000');
    expect(ready.agreedPackingUpliftMinor).toBe('500');
  });
  it('selects exact area override and governorate fallback; missing never means configured zero', () => {
    expect(price({ ...fields(), areaId: area }).baseShippingMinor).toBe('6000');
    expect(price({ ...fields(), areaId: randomUUID() }).baseShippingMinor).toBe('5000');
    expect(() => price(fields(), [])).toThrow('PRICE_MISSING');
    expect(price(fields(), [{ ...rates[0]!, amountMinor: '0' }]).recipientDueMinor).toBe('25000');
  });
  it('preserves exact brand-declared shipping remainder independently of goods', () => {
    const p = price({
      ...fields(),
      shippingPayer: 'shared',
      recipientShippingDue: { currency: 'EGP', amountMinor: '2000' },
    });
    expect(p.recipientDueMinor).toBe('27000');
    expect(p.brandShippingMinor).toBe('3000');
    expect(() =>
      price({
        ...fields(),
        shippingPayer: 'shared',
        recipientShippingDue: { currency: 'EGP', amountMinor: '5001' },
      }),
    ).toThrow('SHIPPING_DUE_EXCEEDS_TARIFF');
  });
  it.each(['01012345678', '+201012345678', '٠١٠ (١٢٣٤) ٥٦٧٨', '۰۱۰-۱۲۳۴-۵۶۷۸'])(
    'normalizes supported display phone %s',
    (phone) => expect(recipientPhone(phone)).toMatch(/^(01012345678|\+201012345678)$/),
  );
  it.each(['', '123', 'call me', '01012345678,01112345678', '010\t12345678'])(
    'rejects invalid phone %s before pricing',
    (phone) =>
      expect(() => price({ ...fields(), phoneDisplay: phone })).toThrow('INVALID_RECIPIENT_PHONE'),
  );
  it('keeps inspection independent, preserves safe location links and rejects unsafe/userinfo URLs', () => {
    expect(
      validateShipmentInput({
        ...fields(),
        inspectionAllowed: false,
        comment: 'مسموح بالفحص',
        locationUrl: 'https://maps.example.test/a',
      }),
    ).toBe('01012345678');
    for (const locationUrl of [
      'javascript:alert(1)',
      'file:///a',
      'https://user:pass@example.test',
      ' https://example.test',
    ])
      expect(() => price({ ...fields(), locationUrl })).toThrow('UNSAFE_LOCATION_URL');
  });
  it('rejects fractional/bounded quantity, overlong lines, unknown fields and duplicate stable identities', () => {
    for (const quantity of [0, -1, 1.5, 1000001])
      expect(
        validateShipmentFields({ ...fields(), lines: [{ ...fields().lines[0]!, quantity }] }),
      ).toBe(false);
    expect(validateShipmentFields({ ...fields(), recipientName: 'a'.repeat(201) })).toBe(false);
    expect(
      validateShipmentFields({
        ...fields(),
        lines: Array.from({ length: 101 }, () => fields().lines[0]!),
      }),
    ).toBe(false);
    const line = fields().lines[0]!;
    expect(() => price({ ...fields(), lines: [line, line] })).toThrow('DUPLICATE_LINE_ID');
    expect(
      validateShipmentCommand({
        schemaVersion: 1,
        companyId: company,
        commandId: randomUUID(),
        type: 'shipment.prepare',
        shipmentId: randomUUID(),
        expectedVersion: 1,
        fakeFee: '500',
      }),
    ).toBe(false);
  });
  it('checks per-unit, products and totals before canonical number conversion', () => {
    expect(() =>
      price({
        ...fields(),
        lines: [
          {
            ...fields().lines[0]!,
            quantity: 2,
            unitDue: { currency: 'EGP', amountMinor: '9007199254740991' },
          },
        ],
      }),
    ).toThrow('SOURCE_MONEY_OVERFLOW');
    expect(() =>
      price({
        ...fields(),
        lines: [
          { ...fields().lines[0]!, unitDue: { currency: 'EGP', amountMinor: '9007199254740991' } },
        ],
      }),
    ).toThrow('SOURCE_MONEY_OVERFLOW');
  });
  it('service correction retains captured base and agreed uplift after later tariff/policy edits', () => {
    const original = price(fields());
    const corrected = correctedPrice(original, { ...fields(), service: 'company_packed' });
    expect(corrected.tariffMinor).toBe('5500');
    expect(corrected.tariffVersion).toBe(original.tariffVersion);
    expect(correctedPrice(corrected, fields()).tariffMinor).toBe('5000');
    expect(preparationFor('brand_packed')).toBe('not_required');
    expect(preparationFor('company_packed')).toBe('awaiting_preparation');
    expect(() =>
      price({ ...fields(), service: 'stored_stock' as ShipmentFields['service'] }),
    ).toThrow('SERVICE_UNAVAILABLE');
  });
  it('guards stale, cancelled, handed-over and integrated transitions', () => {
    const state = { state: 'active', sourceState: 'local', handedOver: false };
    expect(() => assertLocalTransition(state, 1, 2)).toThrow('REVISION_CONFLICT');
    expect(() => assertLocalTransition({ ...state, handedOver: true }, 1, 1)).toThrow(
      'HANDED_OVER_PROTECTED',
    );
    expect(() => assertLocalTransition({ ...state, sourceState: 'integrated' }, 1, 1)).toThrow(
      'SOURCE_ADAPTER_REQUIRED',
    );
    expect(() => assertLocalTransition({ ...state, state: 'cancelled' }, 1, 1)).toThrow(
      'SHIPMENT_CANCELLED',
    );
  });
});
