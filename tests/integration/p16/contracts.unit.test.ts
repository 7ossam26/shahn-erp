import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { validateRemittanceCommand } from '@shahn/contracts';
import { tawselValidator } from '@shahn/contracts/tawsel';
import { validFixtures, invalidFixtures } from '../p11/fixtures.js';
const command = () => ({
  schemaVersion: 1,
  type: 'remittance.confirm',
  companyId: randomUUID(),
  commandId: randomUUID(),
  driverId: randomUUID(),
  roundId: randomUUID(),
  branchId: randomUUID(),
  witnessId: randomUUID(),
  expectedRevision: '1',
  expectedDigest: 'a'.repeat(64),
  actualDate: '2026-10-05',
  components: [
    { method: 'cash', accountId: randomUUID(), amountMinor: '80000' },
    { method: 'instapay', accountId: randomUUID(), amountMinor: '20000' },
  ],
});
it('accepts exact integer components with optional blank or absent references', () =>
  expect(validateRemittanceCommand(command())).toBe(true));
it.each(['0', '-1', '1.5', '١٠٠'])('rejects invalid component %s', (amountMinor) =>
  expect(
    validateRemittanceCommand({
      ...command(),
      components: [{ method: 'cash', accountId: randomUUID(), amountMinor }],
    }),
  ).toBe(false),
);
it('closed input cannot supply expected money, eligibility or a partial acceptance flag', () => {
  for (const key of ['expectedTotal', 'eligible', 'acceptShortfall'])
    expect(validateRemittanceCommand({ ...command(), [key]: true })).toBe(false);
});
it('zero checked command has no fictitious zero component', () =>
  expect(validateRemittanceCommand({ ...command(), components: [] })).toBe(true));
for (const fixture of [...validFixtures, ...invalidFixtures].filter((x) =>
  /^(p17-|p19-|p23-|p25-|monitoring-)/.test(x.id),
))
  it('pinned source fixture: ' + fixture.id, () =>
    expect(tawselValidator(fixture.schema)(fixture.data)).toBe(fixture.valid),
  );
