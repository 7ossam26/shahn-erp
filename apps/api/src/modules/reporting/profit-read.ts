import {
  profitCategories,
  type EconomicEffect,
  type ProfitSummary,
  type ReportFilters,
  type ReportRow,
} from '@shahn/contracts';
import { cairoDayRange } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { loadProfitSources, type PayrollExclusions } from './profit-sources.js';
import { loadProfitReconciliation } from './profit-reconciliation.js';

/** Pure arithmetic over typed historical sources. A missing mapping is an error, never income. */
export function summarizeProfit(
  effects: EconomicEffect[],
  branchNames: Map<string, string>,
  exclusions: PayrollExclusions,
  complete: boolean,
  periodEnd?: string,
): ProfitSummary {
  const categories = profitCategories.map((category) => ({
    category,
    amountMinor: '0',
    sourceCount: 0,
  }));
  const branches = new Map<string | null, bigint>([...branchNames.keys()].map((id) => [id, 0n]));
  const seen = new Set<string>();
  let profit = 0n,
    late = 0;
  for (const e of effects) {
    const c = categories.find((c) => c.category === e.category);
    if (!c || !e.effectiveDate || !e.recordedAt) throw Error('ECONOMIC_SOURCE_MAPPING_REQUIRED');
    if (seen.has(e.effectId)) throw Error('DUPLICATE_ECONOMIC_EFFECT');
    seen.add(e.effectId);
    const n = BigInt(e.amountMinor);
    c.amountMinor = (BigInt(c.amountMinor) + n).toString();
    c.sourceCount++;
    profit += n;
    branches.set(e.historicalBranchId, (branches.get(e.historicalBranchId) ?? 0n) + n);
    const month = e.effectiveDate.slice(0, 7),
      next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1))
        .toISOString()
        .slice(0, 10);
    if (
      new Date(e.recordedAt) >= new Date(cairoDayRange(next).start) ||
      (periodEnd && new Date(e.recordedAt) >= new Date(cairoDayRange(periodEnd).end))
    )
      late++;
  }
  const sum = (key: (typeof profitCategories)[number]) =>
    BigInt(categories.find((c) => c.category === key)!.amountMinor);
  const salary = -sum('employee_salary'),
    commission = -sum('employee_commission'),
    addition = -sum('employee_addition'),
    deduction = sum('employee_entitlement_deduction');
  return {
    profitMinor: profit.toString(),
    categories,
    branches: [...branches].map(([id, n]) => ({
      branchId: id,
      branchName: id === null ? 'فرع تاريخي غير منسوب' : (branchNames.get(id) ?? id),
      profitMinor: n.toString(),
    })),
    shipping: {
      grossMinor: sum('shipping_gross').toString(),
      waiverMinor: sum('shipping_waiver').toString(),
      netMinor: (sum('shipping_gross') + sum('shipping_waiver')).toString(),
    },
    payroll: {
      salaryMinor: salary.toString(),
      commissionMinor: commission.toString(),
      additionsMinor: addition.toString(),
      entitlementDeductionsMinor: deduction.toString(),
      employeeCostMinor: (salary + commission + addition - deduction).toString(),
      advanceRecoveryMinor: exclusions.advanceRecoveredMinor,
      incidentRecoveryWithheldMinor: exclusions.incidentRecoveredMinor,
      payoutMinor: exclusions.actualSalaryPayoutMinor,
    },
    laterEntryCount: late,
    calculationComplete: complete,
    limitations: [
      'المصروفات العادية تدخل عند دفعها فقط؛ التكاليف غير المدفوعة التي لم تسجل غير مشمولة. لا إقفال محاسبي للفترة.',
      ...(complete
        ? []
        : [
            'النتيجة جزئية: المبالغ المكتملة ظاهرة، والمصادر غير المحسومة خارج الحساب حتى المعالجة.',
          ]),
    ],
  };
}
export async function readProfit(
  u: UnitOfWork,
  branches: string[],
  filters: ReportFilters,
  sort: string,
) {
  const { effects, issues, actualMoney, payrollExclusions } = await loadProfitSources(
    u,
    branches,
    filters,
  );
  const names = new Map(
    u.access.companyBranches.filter((b) => branches.includes(b.id)).map((b) => [b.id, b.name]),
  );
  const findings = await loadProfitReconciliation(u, branches, issues, actualMoney);
  const summary = summarizeProfit(effects, names, payrollExclusions, !issues.length, filters.to);
  const rows: ReportRow[] = effects
    .sort((a, b) => {
      const da = filters.dateBasis === 'recorded' ? a.recordedAt : a.effectiveDate,
        db = filters.dateBasis === 'recorded' ? b.recordedAt : b.effectiveDate;
      return (
        (sort === 'dateDesc' ? -1 : 1) * da.localeCompare(db) ||
        a.effectId.localeCompare(b.effectId)
      );
    })
    .map((e, i) => ({
      id: e.effectId,
      ordinal: i + 1,
      economicEffect: e,
      values: {
        category: e.category,
        branch: e.historicalBranchId
          ? (names.get(e.historicalBranchId) ?? e.historicalBranchId)
          : 'غير منسوب',
        amountMinor: e.amountMinor,
        date: filters.dateBasis === 'recorded' ? e.recordedAt : e.effectiveDate,
        recordedAt: e.recordedAt,
      },
      sourceIds: [
        e.sourceId,
        e.effectId,
        ...e.correctionOf,
        ...(e.postingBatchId ? [e.postingBatchId] : []),
      ],
      revision: e.revision,
      effectiveAt: cairoDayRange(e.effectiveDate).start,
      recordedAt: e.recordedAt,
      detail: e.sourcePath,
    }));
  return {
    rows,
    context: { profit: summary, actualMoney, sourceIssues: issues, reconciliation: findings },
  };
}
