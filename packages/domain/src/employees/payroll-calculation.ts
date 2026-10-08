import type { PayrollCalculation, PayrollEarning, PayrollObligation } from '@shahn/contracts';
import { AccessError } from '../access.js';
import { addMinor, minor, subtractMinor } from '../kernel.js';

/** Nonbinding preview. Only persistence under P08's shared guard can reserve these allocations. */
export function calculatePayroll(
  month: string,
  earnings: readonly PayrollEarning[],
  originals: readonly PayrollObligation[],
): PayrollCalculation {
  const sum = (values: readonly string[]) =>
    values.reduce((a, b) => addMinor(a, minor(b, 'nonnegative')), 0n);
  if (
    new Set(originals.map((o) => o.id)).size !== originals.length ||
    new Set(earnings.map((e) => e.id)).size !== earnings.length
  )
    throw new AccessError('DUPLICATE_PAYROLL_SOURCE', 409);
  const category = (kind: PayrollEarning['kind']) =>
    sum(earnings.filter((e) => e.kind === kind).map((e) => e.amountMinor));
  const salary = category('salary'),
    commission = category('commission'),
    bonus = category('bonus'),
    overtime = category('overtime'),
    positiveEarningAdjustments = category('earning_correction'),
    // P21: a pre-ERP entitlement is paid once through payroll but is not current earning cost.
    openingEntitlement = category('opening_entitlement');
  const gross = sum(
    [salary, commission, bonus, overtime, positiveEarningAdjustments, openingEntitlement].map(
      String,
    ),
  );
  const due = originals
    .filter((o) => o.month <= month)
    .sort(
      (a, b) =>
        a.effectiveDate.localeCompare(b.effectiveDate) ||
        a.recordedAt.localeCompare(b.recordedAt) ||
        a.id.localeCompare(b.id),
    );
  for (const o of due) {
    if (
      minor(o.outstandingAmount, 'nonnegative') > minor(o.amountMinor, 'positive') ||
      subtractMinor(
        minor(o.outstandingAmount),
        minor(o.reservedForFrozenPeriods, 'nonnegative'),
      ) !== minor(o.availableForNewAllocation, 'nonnegative')
    )
      throw new AccessError('OBLIGATION_RECONCILIATION_REQUIRED', 409);
  }
  const newCategory = (kind: PayrollObligation['kind']) =>
    sum(
      due
        .filter((o) => o.kind === kind && o.month === month)
        .map((o) => o.availableForNewAllocation),
    );
  const obligations = sum(due.map((o) => o.availableForNewAllocation));
  let net = gross;
  const allocations: PayrollCalculation['allocations'] = [];
  for (const o of due) {
    const available = minor(o.availableForNewAllocation),
      take = available < net ? available : net;
    if (take > 0n)
      allocations.push({
        obligationId: o.id,
        kind: o.kind,
        amountMinor: String(take),
        remainingMinor: String(available - take),
      });
    net -= take;
  }
  const recovered = (kind: PayrollObligation['kind']) =>
    sum(allocations.filter((a) => a.kind === kind).map((a) => a.amountMinor));
  return {
    salary: String(salary),
    commission: String(commission),
    bonus: String(bonus),
    overtime: String(overtime),
    positiveEarningAdjustments: String(positiveEarningAdjustments),
    grossEarning: String(gross),
    newAdvancesDue: String(newCategory('advance')),
    newOrdinaryDeductions: String(newCategory('earning_deduction')),
    newIncidentDeductions: String(newCategory('incident')),
    priorCarriedUnrecoveredObligations: String(
      sum(due.filter((o) => o.month < month).map((o) => o.availableForNewAllocation)),
    ),
    obligations: String(obligations),
    recoveryThisPeriod: String(gross - net),
    earningDeductionsRecovered: String(recovered('earning_deduction')),
    advanceRecovered: String(recovered('advance')),
    incidentRecovered: String(recovered('incident')),
    openingEntitlement: String(openingEntitlement),
    newSettlementObligations: String(newCategory('settlement')),
    settlementRecovered: String(recovered('settlement')),
    outstandingAmount: String(sum(due.map((o) => o.outstandingAmount))),
    reservedForFrozenPeriods: String(sum(due.map((o) => o.reservedForFrozenPeriods))),
    availableForNewAllocation: String(obligations),
    netPayable: String(net),
    carryRemaining: String(obligations - (gross - net)),
    employeeCost: String(
      subtractMinor(subtractMinor(gross, category('earning_deduction')), openingEntitlement),
    ),
    allocations,
  };
}
