import { it, expect } from 'vitest';
import { validateIncidentShares } from '@shahn/domain';
import {
  tawselValidator,
  validSnapshotSemantics,
  type SourceSnapshot,
} from '@shahn/contracts/tawsel';
import type { IncidentConfirmation } from '@shahn/contracts';
import { validFixtures, invalidFixtures } from '../p11/fixtures.js';
for (const f of [...validFixtures, ...invalidFixtures].filter((f) =>
  [
    'p10-SourceSnapshot',
    'p10-explicit-prepaid',
    'p10-ambiguous-deposit',
    'p21-loss-command',
    'p21-loss-as-receipt',
    'p21-forged-human',
  ].includes(f.id),
))
  it('pinned schema only: ' + f.id, () => {
    expect(tawselValidator(f.schema)(f.data)).toBe(f.valid);
  });
it('canonical zero shipping preserves 250 goods, exact total, safe integers and closed fields; not a runtime acceptance claim', () => {
  const p = structuredClone(
    validFixtures.find((f) => f.id === 'p10-explicit-prepaid')!.data,
  ) as SourceSnapshot;
  p.lines = [
    { ...p.lines[0]!, quantity: 1, unitDue: { currency: 'EGP', exponent: 2, amountMinor: 25000 } },
  ];
  p.totalDue.amountMinor = 25000;
  expect(validSnapshotSemantics(p)).toBe(true);
  expect(validSnapshotSemantics({ ...p, totalDue: { ...p.totalDue, amountMinor: 0 } })).toBe(false);
  expect(validSnapshotSemantics({ ...p, waiverMinor: 5000 })).toBe(false);
  expect(
    validSnapshotSemantics({
      ...p,
      lines: [
        {
          ...p.lines[0]!,
          unitDue: { currency: 'EGP', exponent: 2, amountMinor: 9007199254740992 },
        },
      ],
    }),
  ).toBe(false);
});
it('goods-only shares are exact nonnegative integers; warehouse loss and zero-compensation boundaries', () => {
  const c: IncidentConfirmation = {
    expectedVersion: 1,
    goodsValueMinor: '40000',
    compensationMinor: '40000',
    companyShareMinor: '20000',
    employeeShareMinor: '20000',
    responsibleBranchId: 'b',
    branchReason: '',
    employeeId: 'e',
    payrollMonth: '2026-10',
    agreementReason: 'agreed',
  };
  expect(() => validateIncidentShares(c, false)).not.toThrow();
  for (const changes of [
    { companyShareMinor: '19900' },
    { companyShareMinor: '-1' },
    { compensationMinor: '45000' },
    { compensationMinor: '0' },
    { employeeId: null },
    { payrollMonth: null },
  ])
    expect(() => validateIncidentShares({ ...c, ...changes }, false)).toThrow();
  expect(() => validateIncidentShares(c, true)).toThrow('WAREHOUSE_LOSS_COMPANY_RESPONSIBILITY');
});
