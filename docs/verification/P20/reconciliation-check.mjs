import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('./', import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const money = (value) => BigInt(value);
const sum = (rows, field = 'amount_minor') => rows.reduce((total, row) => total + money(row[field]), 0n);
const db = load('native-reconciliation.json');
const sources = load('native-sources.json');
const periodKey = (row) => row.employee_id + ':' + row.month;
assert.equal(new Set(db.payments.map(periodKey)).size, db.payments.length);
for (const original of db.obligations) {
  const allocations = db.recoveries.filter((row) => row.obligation_id === original.id);
  const settled = sum(allocations.filter((row) => row.state === 'settled'));
  const reserved = sum(allocations.filter((row) => row.state === 'reserved'));
  assert.equal(money(original.amount_minor), money(original.outstanding_amount) + settled);
  assert.equal(money(original.reserved_for_frozen_periods), reserved);
  assert.equal(money(original.outstanding_amount), reserved + money(original.available_for_new_allocation));
  if (original.kind === 'advance') {
    assert.equal(original.id, original.advance_id);
    const cash = db.cash.filter((row) => row.source_id === original.source_id);
    assert.equal(cash.length, 1);
    assert.equal(cash[0].source_kind, 'employee_advance');
    assert.equal(cash[0].amount_minor, original.amount_minor);
  }
}
for (const period of db.periods.filter((row) => row.calculation)) {
  const snapshot = period.calculation;
  const c = snapshot.calculation;
  const allocations = db.recoveries.filter((row) => periodKey(row) === periodKey(period));
  assert.equal(money(c.grossEarning), money(c.recoveryThisPeriod) + money(c.netPayable));
  assert.equal(money(c.carryRemaining), money(c.obligations) - money(c.recoveryThisPeriod));
  assert.equal(money(c.recoveryThisPeriod), sum(allocations));
  assert.equal(money(c.employeeCost), money(c.grossEarning) - sum(snapshot.earnings.filter((row) => row.kind === 'earning_deduction'), 'amountMinor'));
  assert.equal(allocations.length, c.allocations.length);
  for (const allocation of c.allocations) {
    const saved = allocations.find((row) => row.obligation_id === allocation.obligationId);
    assert.ok(saved);
    assert.equal(saved.amount_minor, allocation.amountMinor);
    assert.equal(saved.state, period.state === 'frozen_unpaid' ? 'reserved' : 'settled');
  }
  if (period.state !== 'frozen_unpaid') {
    const payment = db.payments.find((row) => periodKey(row) === periodKey(period));
    assert.ok(payment);
    assert.equal(payment.amount_minor, c.netPayable);
    if (payment.amount_minor === '0') {
      assert.equal(payment.account_id, null);
      assert.equal(payment.method, null);
      assert.equal(payment.movement_id, null);
    } else {
      const cash = db.cash.find((row) => row.id === payment.movement_id);
      assert.ok(cash);
      assert.equal(cash.source_kind, 'salary_payout');
      assert.equal(cash.amount_minor, payment.amount_minor);
      assert.equal(cash.account_id, payment.account_id);
      assert.equal(cash.method, payment.method);
      assert.equal(cash.actual_date, payment.actual_date);
    }
  }
}
assert.ok(db.cash.every((row) => row.direction === 'withdrawal'));
assert.equal(db.cash.filter((row) => row.source_kind === 'salary_payout').length, db.payments.filter((row) => row.amount_minor !== '0').length);
assert.equal(new Set(sources.incidents.map((row) => row.id)).size, sources.incidents.length);
assert.equal(new Set(sources.incidents.map((row) => row.effect_id)).size, sources.incidents.length);
const commissions = sources.costSources.filter((row) => row.kind === 'commission');
assert.equal(commissions.length, 2);
assert.ok(commissions.every((row) => row.amount_minor === '500' && row.branch_id === sources.workBranch));
assert.ok(sources.costSources.every((row) => ['salary', 'commission', 'bonus', 'overtime', 'earning_deduction', 'earning_correction'].includes(row.kind)));
assert.equal(new Set(sources.costSources.map((row) => row.source_id)).size, sources.costSources.length);
const result = {
  result: 'passed',
  companyId: db.companyId,
  sourceCompanyId: sources.companyId,
  frozenCalculations: db.periods.filter((row) => row.calculation).length,
  originalObligations: db.obligations.length,
  recoveryAllocations: db.recoveries.length,
  positivePayouts: db.payments.filter((row) => row.amount_minor !== '0').length,
  zeroClosures: db.payments.filter((row) => row.amount_minor === '0').length,
  advanceCashMinor: String(sum(db.cash.filter((row) => row.source_kind === 'employee_advance'))),
  salaryCashMinor: String(sum(db.cash.filter((row) => row.source_kind === 'salary_payout'))),
  repaymentCashReceipts: 0,
  sourceCostKinds: [...new Set(sources.costSources.map((row) => row.kind))],
  sourceEmployeeCostMinor: String(sum(sources.costSources)),
};
writeFileSync(new URL('reconciliation-summary.json', root), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
