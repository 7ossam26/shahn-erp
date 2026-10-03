import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { calculatePrice, validateBrand, validateReference } from '@shahn/domain';
import {
  validateCommercialCommand,
  validateCommercialViews,
  type BrandFields,
  type PricingInput,
  type TariffRecord,
} from '@shahn/contracts';
const tier = randomUUID(),
  gov = randomUUID(),
  area = randomUUID();
const policy: BrandFields = {
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
const input: PricingInput = {
  brandId: randomUUID(),
  branchId: randomUUID(),
  service: 'brand_packed',
  governorateId: gov,
  areaId: null,
  goodsDueMinor: '25000',
  recipientShippingMinor: '5000',
};
const base: TariffRecord = {
  id: randomUUID(),
  version: 1,
  tierId: tier,
  governorateId: gov,
  areaId: null,
  amountMinor: '5000',
  active: true,
};
describe('P04 exact commercial validation and price selection', () => {
  it('chooses the selected tier governorate and optional matching area; keeps base commission separate', () => {
    const rates = [base, { ...base, id: randomUUID(), areaId: area, amountMinor: '6000' }];
    expect(calculatePrice(policy, input, rates)).toMatchObject({
      tariffMinor: '5000',
      recipientDueMinor: '30000',
      source: 'governorate',
    });
    expect(calculatePrice(policy, { ...input, areaId: area }, rates)).toMatchObject({
      tariffMinor: '6000',
      source: 'area_override',
    });
    expect(
      calculatePrice(policy, { ...input, areaId: randomUUID(), service: 'company_packed' }, rates),
    ).toMatchObject({
      tariffMinor: '5500',
      baseShippingMinor: '5000',
      packingUpliftMinor: '500',
      commissionBaseMinor: '5000',
    });
  });
  it('rejects missing rates and disabled services while accepting configured zero', () => {
    expect(() => calculatePrice(policy, input, [{ ...base, tierId: randomUUID() }])).toThrow(
      'PRICE_MISSING',
    );
    expect(() => calculatePrice(policy, { ...input, service: 'stored_stock' }, [base])).toThrow(
      'SERVICE_UNAVAILABLE',
    );
    expect(calculatePrice(policy, input, [{ ...base, amountMinor: '0' }]).tariffMinor).toBe('0');
  });
  it('checks every intermediate integer overflow and storage anchor', () => {
    expect(() =>
      calculatePrice(
        {
          ...policy,
          services: ['stored_stock'],
          defaultService: 'stored_stock',
          storage: {
            monthlyFeeMinor: '0',
            startDate: '2026-01-31',
            anniversaryDay: 31,
            branchId: input.branchId,
            active: false,
            stopDate: '2026-10-03',
          },
        },
        { ...input, service: 'stored_stock' },
        [base],
      ),
    ).toThrow('SERVICE_UNAVAILABLE');
    expect(() =>
      calculatePrice(
        { ...policy, packingUpliftMinor: '9223372036854775807' },
        { ...input, service: 'company_packed' },
        [base],
      ),
    ).toThrow();
    expect(() =>
      calculatePrice(policy, { ...input, goodsDueMinor: '9223372036854775807' }, [base]),
    ).toThrow();
    expect(() =>
      validateBrand({ ...policy, services: ['stored_stock'], defaultService: 'stored_stock' }),
    ).toThrow('STORAGE_REQUIRED');
    expect(() => validateBrand({ ...policy, defaultService: 'stored_stock' })).toThrow(
      'INVALID_DEFAULT_SERVICE',
    );
    expect(() =>
      validateBrand({
        ...policy,
        storage: {
          monthlyFeeMinor: '0',
          startDate: '2026-01-31',
          anniversaryDay: 30,
          branchId: input.branchId,
          active: true,
          stopDate: null,
        },
      }),
    ).toThrow('INVALID_STORAGE_AGREEMENT');
    expect(() =>
      validateReference({
        kind: 'area',
        name: 'area',
        active: true,
        parentId: null,
        volumeRange: null,
      }),
    ).toThrow('INVALID_REFERENCE');
  });
  it('closes commands and views against extra fields, inspection, invalid money, missing defaults and external identity', () => {
    const command = {
      schemaVersion: 1,
      companyId: randomUUID(),
      commandId: randomUUID(),
      type: 'brand.create',
      fields: policy,
    };
    expect(validateCommercialCommand(command)).toBe(true);
    for (const amount of ['01', '1.0', '-0', '1e2', ' 5'])
      expect(
        validateCommercialCommand({
          ...command,
          fields: { ...policy, packingUpliftMinor: amount },
        }),
      ).toBe(false);
    expect(validateCommercialCommand({ ...command, fields: { ...policy, inspection: true } })).toBe(
      false,
    );
    expect(validateCommercialCommand({ ...command, entityId: randomUUID() })).toBe(false);
    expect(
      validateCommercialViews.error!({
        code: 'REVISION_CONFLICT',
        messageKey: 'brands.stale',
        commandId: command.commandId,
        correlationId: randomUUID(),
        currentVersion: 2,
      }),
    ).toBe(true);
  });
});
