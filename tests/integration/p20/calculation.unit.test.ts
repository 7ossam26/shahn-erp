import { it, expect } from 'vitest';
import { calculatePayroll, commissionPerVisit } from '@shahn/domain';
import {
  validatePayrollCommand,
  payrollExamples,
  type PayrollEarning,
  type PayrollObligation,
} from '@shahn/contracts';
const earnings = (salary = '600000'): PayrollEarning[] => [
  {
    id: 'salary',
    kind: 'salary',
    amountMinor: salary,
    branchId: 'a',
    workDate: '2027-01-01',
    recordedAt: '2027-01-01',
    sourceId: 'salary-policy',
    label: 'Salary',
    visitId: null,
    policyId: 'policy',
  },
];
const obligation = (
  amount = '100000',
  kind: PayrollObligation['kind'] = 'advance',
  id = 'original',
): PayrollObligation => ({
  id,
  kind,
  sourceId: id,
  sourceLabel: id,
  month: '2027-01',
  effectiveDate: '2027-01-01',
  recordedAt: '2027-01-01',
  branchId: 'a',
  amountMinor: amount,
  outstandingAmount: amount,
  reservedForFrozenPeriods: '0',
  availableForNewAllocation: amount,
});
it('disjoint cash and cost formulas, recovery never a second cost', () => {
  const e = earnings();
  expect(calculatePayroll('2027-01', e, [obligation()])).toMatchObject({
    salary: '600000',
    commission: '0',
    grossEarning: '600000',
    netPayable: '500000',
    employeeCost: '600000',
    advanceRecovered: '100000',
  });
  e.push({ ...e[0]!, id: 'deduction', kind: 'earning_deduction', amountMinor: '20000' });
  expect(
    calculatePayroll('2027-01', e, [obligation(), obligation('20000', 'earning_deduction', 'd')]),
  ).toMatchObject({ netPayable: '480000', employeeCost: '580000', newOrdinaryDeductions: '20000' });
  expect(calculatePayroll('2027-01', earnings(), [obligation('20000', 'incident')])).toMatchObject({
    netPayable: '580000',
    employeeCost: '600000',
    incidentRecovered: '20000',
  });
});
it('carry retains originals and reserved amount is unavailable in a later period', () => {
  expect(calculatePayroll('2027-01', earnings('300000'), [obligation('350000')])).toMatchObject({
    netPayable: '0',
    carryRemaining: '50000',
    recoveryThisPeriod: '300000',
  });
  expect(
    calculatePayroll('2027-02', earnings('300000'), [
      { ...obligation('350000'), outstandingAmount: '50000', availableForNewAllocation: '50000' },
    ]),
  ).toMatchObject({
    netPayable: '250000',
    newAdvancesDue: '0',
    priorCarriedUnrecoveredObligations: '50000',
  });
  expect(
    calculatePayroll('2027-02', earnings(), [
      { ...obligation(), reservedForFrozenPeriods: '100000', availableForNewAllocation: '0' },
    ]),
  ).toMatchObject({ netPayable: '600000', reservedForFrozenPeriods: '100000' });
});
it('all earning subtotals remain separate from ordinary, advance and incident recovery', () => {
  const e = earnings();
  for (const [kind, amountMinor] of [
    ['commission', '10000'],
    ['bonus', '20000'],
    ['overtime', '30000'],
    ['earning_correction', '40000'],
    ['earning_deduction', '10000'],
  ] as const)
    e.push({ ...e[0]!, id: kind, kind, amountMinor });
  expect(
    calculatePayroll('2027-01', e, [
      obligation('30000'),
      obligation('10000', 'earning_deduction', 'd'),
      obligation('20000', 'incident', 'i'),
    ]),
  ).toMatchObject({
    salary: '600000',
    commission: '10000',
    bonus: '20000',
    overtime: '30000',
    positiveEarningAdjustments: '40000',
    grossEarning: '700000',
    newOrdinaryDeductions: '10000',
    newAdvancesDue: '30000',
    newIncidentDeductions: '20000',
    earningDeductionsRecovered: '10000',
    advanceRecovered: '30000',
    incidentRecovered: '20000',
    recoveryThisPeriod: '60000',
    netPayable: '640000',
    employeeCost: '690000',
  });
});
it('sort original effective date then creation then ID, cap, reject duplicates and inconsistent debt', () => {
  const a = obligation('400000', 'advance', 'a'),
    b = obligation('400000', 'incident', 'b');
  expect(
    calculatePayroll('2027-01', earnings(), [b, a]).allocations.map((x) => [
      x.obligationId,
      x.amountMinor,
    ]),
  ).toEqual([
    ['a', '400000'],
    ['b', '200000'],
  ]);
  expect(() => calculatePayroll('2027-01', earnings(), [a, a])).toThrow('DUPLICATE_PAYROLL_SOURCE');
  expect(() =>
    calculatePayroll('2027-01', earnings(), [{ ...a, reservedForFrozenPeriods: '1' }]),
  ).toThrow('OBLIGATION_RECONCILIATION_REQUIRED');
});
it('base-only commission and transfer exclusion use exact integer piastres', () => {
  const terms = {
    enabled: true as const,
    formula: 'percentage' as const,
    basisPoints: 1000,
    perVisit: null,
  };
  expect(commissionPerVisit('5000', terms)).toBe('500');
  expect(commissionPerVisit('5000', terms, 'internal_transfer')).toBe('0');
  expect(() =>
    calculatePayroll(
      '2027-01',
      [
        ...earnings('9223372036854775807'),
        { ...earnings()[0]!, id: 'bonus', kind: 'bonus', amountMinor: '1' },
      ],
      [],
    ),
  ).toThrow('MONEY_OVERFLOW');
});
it('closed commands reject partial payout amount, null funding, override, attendance and zero advance', () => {
  for (const example of Object.values(payrollExamples))
    expect(validatePayrollCommand(example)).toBe(true);
  const id = '00000000-0000-4000-a000-000000000001',
    base = {
      schemaVersion: 1,
      companyId: id,
      commandId: id,
      employeeId: id,
      month: '2027-01',
      expectedVersion: 1,
      expectedDigest: 'a'.repeat(64),
      type: 'payroll.payout',
      funding: {
        accountId: id,
        branchId: id,
        method: 'cash',
        actualDate: '2027-01-01',
        reference: '',
      },
    };
  expect(validatePayrollCommand(base)).toBe(true);
  for (const x of [{ amountMinor: '1' }, { salaryOverride: '1' }, { hours: 10 }, { funding: null }])
    expect(validatePayrollCommand({ ...base, ...x })).toBe(false);
  expect(validatePayrollCommand({ ...base, type: 'payroll.advance', amountMinor: '0' })).toBe(
    false,
  );
});
