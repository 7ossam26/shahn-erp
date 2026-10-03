import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  stockRequirements,
  preparationFor,
  validateShipmentInput,
  assertUnpackTransition,
} from '@shahn/domain';
import { validateShipmentCommand } from '@shahn/contracts';
import { shipmentFields } from '../support/shipments.js';
const fields = () =>
  shipmentFields(
    { branchId: randomUUID(), brandId: randomUUID(), governorateId: randomUUID() },
    { service: 'stored_stock' },
  );
it('aggregates one variant across commercial values and preserves the original lines', () => {
  const f = fields(),
    v = randomUUID();
  f.lines = f.lines.map((l, i) => ({ ...l, variantId: v, quantity: i ? 4 : 3 }));
  expect(stockRequirements(f)).toEqual([{ variantId: v, quantity: 7 }]);
  expect(f.lines).toHaveLength(2);
  expect(preparationFor(f.service)).toBe('awaiting_preparation');
});
it('rejects missing identity and unsafe accumulation', () => {
  const f = fields();
  expect(() => stockRequirements(f)).toThrow('STOCK_VARIANT_REQUIRED');
  f.lines = f.lines.map((l) => ({ ...l, variantId: randomUUID(), quantity: 0.5 }));
  expect(() => stockRequirements(f)).toThrow('INVALID_QUANTITY');
});
it('closed stored-stock/unpack commands retain exact quantities and money', () => {
  const f = fields();
  f.lines = f.lines.map((l) => ({ ...l, variantId: randomUUID() }));
  validateShipmentInput(f);
  const e = { schemaVersion: 1, companyId: randomUUID(), commandId: randomUUID() };
  expect(
    validateShipmentCommand({
      ...e,
      type: 'shipment.confirm',
      fields: f,
      actualReceipt: false,
      duplicateAcknowledged: false,
      expectedPolicyVersion: 1,
      expectedTariffVersion: 1,
      expectedTariffId: randomUUID(),
    }),
  ).toBe(true);
  const c = {
    ...e,
    type: 'shipment.unpack',
    shipmentId: randomUUID(),
    expectedVersion: 3,
    reason: 'Actual inspection',
    lines: [{ pendingId: randomUUID(), expectedRemaining: 2, sound: 1, damaged: 1, uncertain: 0 }],
  };
  expect(validateShipmentCommand(c)).toBe(true);
  expect(validateShipmentCommand({ ...c, lines: [{ ...c.lines[0], sound: 1.5 }] })).toBe(false);
});
it('unpack permits bounded cancelled-order inspection and guards authority/version', () => {
  expect(() =>
    assertUnpackTransition({ sourceState: 'local', handedOver: false, version: 3 }, 3),
  ).not.toThrow();
  expect(() =>
    assertUnpackTransition({ sourceState: 'local', handedOver: true, version: 3 }, 3),
  ).toThrow('HANDED_OVER_PROTECTED');
  expect(() =>
    assertUnpackTransition({ sourceState: 'local', handedOver: false, version: 3 }, 2),
  ).toThrow('REVISION_CONFLICT');
});
