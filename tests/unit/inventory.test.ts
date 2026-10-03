import { describe, it, expect } from 'vitest';
import { addQuantity, stockBalance, receiptEffect, wholeQuantity } from '@shahn/domain';
import { validateInventoryCommand, validateInventoryFilter } from '@shahn/contracts';
const id = '11111111-1111-4111-8111-111111111111';
const receipt = {
  schemaVersion: 1,
  commandId: id,
  companyId: id,
  type: 'stock.receive',
  branchId: id,
  brandId: id,
  actualDate: '2026-10-03',
  lines: [
    { variantId: id, quantity: 10, condition: 'sound' },
    { variantId: id, quantity: 2, condition: 'damaged' },
  ],
};
describe('P05 exact whole pieces and closed shared contracts', () => {
  it('mixed receipt separates physical units and claims', () => {
    const sound = receiptEffect(10, 'sound'),
      damage = receiptEffect(2, 'damaged');
    expect(stockBalance(addQuantity(sound.sound, damage.sound), damage.unavailable)).toEqual({
      soundOnHand: 10,
      unavailableOnHand: 2,
      physicalOnHand: 12,
      reserved: 0,
      available: 10,
      reservationShortage: 0,
    });
    expect(receiptEffect(1, 'uncertain').unavailable).toBe(1);
  });
  it('shows sound 5 reserved 7 as shortage 2 without inventing physical units', () => {
    expect(stockBalance(5, 0, 4, 3)).toMatchObject({
      physicalOnHand: 5,
      reserved: 7,
      available: 0,
      reservationShortage: 2,
    });
    expect(stockBalance(3, 0).available).toBe(3);
  });
  it('rejects negative/fractional/unsafe/non-finite quantities and checked sum overflow', () => {
    for (const n of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN])
      expect(() => wholeQuantity(n, true)).toThrow();
    expect(() => addQuantity(Number.MAX_SAFE_INTEGER, 1)).toThrow('QUANTITY_OVERFLOW');
    expect(() => stockBalance(Number.MAX_SAFE_INTEGER, 1)).toThrow('QUANTITY_OVERFLOW');
  });
  it('rejects unknown fields, invalid dates, branchless queries and unsafe JSON', () => {
    expect(validateInventoryCommand(receipt)).toBe(true);
    for (const quantity of [-1, 0, 0.5, Number.MAX_SAFE_INTEGER + 1])
      expect(
        validateInventoryCommand({
          ...receipt,
          lines: [{ variantId: id, quantity, condition: 'sound' }],
        }),
      ).toBe(false);
    expect(validateInventoryCommand({ ...receipt, actualDate: '2026-02-30' })).toBe(false);
    expect(validateInventoryCommand({ ...receipt, profit: 10 })).toBe(false);
    expect(validateInventoryFilter({ branches: [] })).toBe(false);
  });
});
