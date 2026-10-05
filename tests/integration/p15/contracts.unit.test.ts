import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { validateGoodsTransferCommand } from '@shahn/contracts';
import { validFixtures, invalidFixtures } from '../p11/fixtures.js';
import { tawselValidator } from '@shahn/contracts/tawsel';

const id = () => randomUUID();
const base = { schemaVersion: 1, commandId: id(), companyId: id(), branchId: id() };
it('requires whole positive reserved quantities and closed manifest commands', () => {
  const command = {
    ...base,
    type: 'goods.create',
    destinationBranchId: id(),
    driverId: id(),
    plannedAt: new Date().toISOString(),
    lines: [{ kind: 'loose', brandId: id(), variantId: id(), quantity: 3 }],
  };
  expect(validateGoodsTransferCommand(command)).toBe(true);
  expect(
    validateGoodsTransferCommand({ ...command, lines: [{ ...command.lines[0], quantity: 0 }] }),
  ).toBe(false);
  expect(
    validateGoodsTransferCommand({ ...command, lines: [{ ...command.lines[0], quantity: 1.5 }] }),
  ).toBe(false);
  expect(validateGoodsTransferCommand({ ...command, transportFee: 1 })).toBe(false);
});
it('requires explicit counted or exterior inspection and no inferred received quantity', () => {
  const command = {
    ...base,
    type: 'goods.receive',
    manifestId: id(),
    expectedVersion: 2,
    actualAt: new Date().toISOString(),
    lines: [
      {
        lineId: id(),
        sound: 1,
        damaged: 0,
        uncertain: 0,
        inspection: 'parcel-exterior',
        suspectedInternalIssue: false,
      },
    ],
  };
  expect(validateGoodsTransferCommand(command)).toBe(true);
  expect(validateGoodsTransferCommand({ ...command, lines: [] })).toBe(false);
  expect(
    validateGoodsTransferCommand({ ...command, lines: [{ ...command.lines[0], sound: 0.5 }] }),
  ).toBe(false);
  expect(
    validateGoodsTransferCommand({ ...command, lines: [{ ...command.lines[0], missing: 1 }] }),
  ).toBe(false);
});
for (const fixture of [...validFixtures, ...invalidFixtures].filter((x) =>
  x.id.startsWith('monitoring-'),
))
  it(`${fixture.valid ? 'accepts' : 'rejects'} pinned ${fixture.id}`, () => {
    expect(tawselValidator(fixture.schema)(fixture.data)).toBe(fixture.valid);
  });
