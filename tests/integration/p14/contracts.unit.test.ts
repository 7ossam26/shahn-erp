import { it, expect } from 'vitest';
import { validFixtures, invalidFixtures } from '../p11/fixtures.js';
import {
  tawselValidator,
  validateReturnCommand,
  snapshotReturnBalances,
} from '@shahn/contracts/tawsel';
for (const f of [...validFixtures, ...invalidFixtures].filter((x) => /^p2[12]-/.test(x.id)))
  it((f.valid ? 'accepts ' : 'rejects ') + f.id, () => {
    expect(tawselValidator(f.schema)(f.data)).toBe(f.valid);
  });
it('source validator cannot manufacture a driver offer or asserted human', () => {
  expect(validateReturnCommand(validFixtures.find((x) => x.id === 'p21-offer-command')!.data)).toBe(
    false,
  );
  expect(
    validateReturnCommand(invalidFixtures.find((x) => x.id === 'p21-forged-human')!.data),
  ).toBe(false);
});
it('P26 uses accumulated returnItems without resetting to original zero received', () => {
  const data = validFixtures.find((x) => x.id === 'p26-captured-current-return-request-4')!
    .data as { state: Parameters<typeof snapshotReturnBalances>[0] };
  const [item] = snapshotReturnBalances(data.state);
  expect(item!.original.received).toBe(0);
  expect(item!.current.received).toBe(1);
});
