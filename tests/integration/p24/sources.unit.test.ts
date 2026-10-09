import { describe, expect, it } from 'vitest';
import { profitCategories, type EconomicEffect, type ProfitCategory } from '@shahn/contracts';
import { partitionEconomicEffects } from '../../../apps/api/src/modules/reporting/profit-sources.js';
import { summarizeProfit } from '../../../apps/api/src/modules/reporting/profit-read.js';

const company = '11111111-1111-4111-a111-111111111111';
const branchA = '22222222-2222-4222-a222-222222222222';
const branchB = '33333333-3333-4333-a333-333333333333';
const names = new Map([
  [branchA, 'فرع أ'],
  [branchB, 'فرع ب'],
]);
const exclusions = {
  advanceIssuedMinor: '10000',
  advanceRecoveredMinor: '100000',
  incidentRecoveredMinor: '10000',
  actualSalaryPayoutMinor: '470000',
};
function effect(
  category: ProfitCategory,
  amountMinor: string,
  suffix: string = category,
): EconomicEffect {
  return {
    companyId: company,
    sourceId: 'source:' + suffix,
    effectId: 'effect:' + suffix,
    category,
    amountMinor,
    effectiveDate: '2026-01-20',
    recordedAt: '2026-01-20T12:00:00Z',
    historicalBranchId: branchA,
    postingBatchId: 'batch:' + suffix,
    correctionOf: [],
    revision: '1',
    sourceCapability: 'reports',
    sourcePath: null,
  };
}

describe('P24 typed source arithmetic and completeness', () => {
  it('uses all formula terms with branch sums equal to the approved 6200 result', () => {
    const records = [
      effect('shipping_gross', '1000000'),
      effect('storage_revenue', '200000'),
      effect('employee_salary', '-400000'),
      effect('paid_expense', '-150000'),
      effect('brand_compensation', '-50000'),
      effect('employee_compensation_share', '20000'),
    ];
    records[0]!.historicalBranchId = branchB;
    const summary = summarizeProfit(records, names, exclusions, true, '2026-01-31');
    expect(summary.profitMinor).toBe('620000');
    expect(summary.branches.reduce((n, b) => n + BigInt(b.profitMinor), 0n)).toBe(620000n);
    expect(summary.categories.reduce((n, c) => n + BigInt(c.amountMinor), 0n)).toBe(620000n);
    expect(summary.calculationComplete).toBe(true);
  });

  it('retains gross55 and waiver55 with zero net shipping and normal commission5', () => {
    const summary = summarizeProfit(
      [
        effect('shipping_gross', '5500'),
        effect('shipping_waiver', '-5500'),
        effect('employee_commission', '-500'),
      ],
      names,
      exclusions,
      true,
    );
    expect(summary.shipping).toEqual({ grossMinor: '5500', waiverMinor: '-5500', netMinor: '0' });
    expect(summary.payroll.commissionMinor).toBe('500');
    expect(summary.profitMinor).toBe('-500');
  });

  it('deduction200 reduces salary6000 cost to5800 while advance and linked incident withholding only explain payout4700', () => {
    const records = [
      effect('employee_salary', '-600000'),
      effect('employee_entitlement_deduction', '20000'),
      effect('employee_compensation_share', '10000'),
    ];
    const summary = summarizeProfit(records, names, exclusions, true);
    expect(summary.payroll).toMatchObject({
      salaryMinor: '600000',
      entitlementDeductionsMinor: '20000',
      employeeCostMinor: '580000',
      advanceRecoveryMinor: '100000',
      incidentRecoveryWithheldMinor: '10000',
      payoutMinor: '470000',
    });
    expect(summary.profitMinor).toBe('-570000');
    expect(
      summarizeProfit(
        records,
        names,
        {
          ...exclusions,
          advanceIssuedMinor: '999999999',
          advanceRecoveredMinor: '77777',
          incidentRecoveredMinor: '0',
          actualSalaryPayoutMinor: '0',
        },
        true,
      ).profitMinor,
    ).toBe('-570000');
  });

  it('counts one linked late earning correction in its original work period without changing the retained prior input', () => {
    const old = [effect('employee_commission', '-500')];
    const before = JSON.stringify(old);
    const correction = {
      ...effect('employee_commission', '-100', 'late'),
      recordedAt: '2026-02-02T10:00:00Z',
      correctionOf: [old[0]!.effectId],
      revision: '2',
    };
    const previous = summarizeProfit(old, names, exclusions, true, '2026-01-31');
    const next = summarizeProfit([...old, correction], names, exclusions, true, '2026-01-31');
    expect(previous.profitMinor).toBe('-500');
    expect(previous.laterEntryCount).toBe(0);
    expect(next.profitMinor).toBe('-600');
    expect(next.laterEntryCount).toBe(1);
    expect(JSON.stringify(old)).toBe(before);
  });

  it('uses Cairo midnight for the later-entry notice', () => {
    const early = {
      ...effect('paid_expense', '-100', 'early'),
      recordedAt: '2026-01-31T21:59:59Z',
    };
    const late = { ...effect('paid_expense', '-200', 'late'), recordedAt: '2026-01-31T22:00:00Z' };
    expect(
      summarizeProfit([early, late], names, exclusions, true, '2026-01-31').laterEntryCount,
    ).toBe(1);
  });

  it('preserves known amounts and explicit unattributed branch exceptions', () => {
    const unknown = { ...effect('storage_revenue', '31000'), historicalBranchId: null };
    const partition = partitionEconomicEffects([unknown, effect('paid_expense', '-100')]);
    expect(partition.issues).toHaveLength(1);
    expect(partition.issues[0]).toMatchObject({
      code: 'UNATTRIBUTED_ECONOMIC_SOURCE',
      deltaMinor: '31000',
      branchId: null,
    });
    const summary = summarizeProfit(partition.effects, names, exclusions, false);
    expect(summary.profitMinor).toBe('30900');
    expect(summary.calculationComplete).toBe(false);
    expect(summary.branches.find((b) => b.branchId === null)?.profitMinor).toBe('31000');
  });

  it('retains unrelated sources when one source has no recorded date or identity', () => {
    const invalid = {
      ...effect('employee_salary', '-600000'),
      recordedAt: null,
    } as unknown as EconomicEffect;
    const partition = partitionEconomicEffects([invalid, effect('storage_revenue', '31000')]);
    expect(partition.effects.map((e) => e.category)).toEqual(['storage_revenue']);
    expect(partition.issues[0]).toMatchObject({
      code: 'ECONOMIC_SOURCE_MAPPING_REQUIRED',
      recordedAt: null,
      deltaMinor: '-600000',
    });
    expect(summarizeProfit(partition.effects, names, exclusions, false).profitMinor).toBe('31000');
  });

  it('rejects duplicate identities at the arithmetic boundary and excludes all invalid copies before query summary', () => {
    const duplicate = effect('shipping_gross', '5500');
    expect(() => summarizeProfit([duplicate, duplicate], names, exclusions, true)).toThrow(
      'DUPLICATE_ECONOMIC_EFFECT',
    );
    const partition = partitionEconomicEffects([
      duplicate,
      duplicate,
      effect('storage_revenue', '31000'),
    ]);
    expect(partition.effects.map((e) => e.category)).toEqual(['storage_revenue']);
    expect(partition.issues[0]).toMatchObject({
      code: 'DUPLICATE_ECONOMIC_EFFECT',
      observedVersion: '2',
      deltaMinor: '11000',
    });
    expect(summarizeProfit(partition.effects, names, exclusions, false).profitMinor).toBe('31000');
  });

  it.each([
    'generic_deposit',
    'brand_goods',
    'brand_payout',
    'treasury_transfer',
    'opening_balance',
    'employee_advance',
    'salary_cash_payout',
  ])('cannot infer a profit category from excluded %s movement', (category) => {
    const invalid = { ...effect('shipping_gross', '70000'), category } as EconomicEffect;
    expect(() => summarizeProfit([invalid], names, exclusions, true)).toThrow(
      'ECONOMIC_SOURCE_MAPPING_REQUIRED',
    );
    expect(partitionEconomicEffects([invalid]).effects).toEqual([]);
    expect(partitionEconomicEffects([invalid]).issues[0]?.code).toBe(
      'ECONOMIC_SOURCE_MAPPING_REQUIRED',
    );
  });

  it('preserves integer precision for all closed categories and additions', () => {
    const amount = '90071992547409912345';
    const summary = summarizeProfit(
      profitCategories.map((c, i) => effect(c, i === 0 ? amount : '0')),
      names,
      exclusions,
      true,
    );
    expect(summary.profitMinor).toBe(amount);
    expect(summary.categories).toHaveLength(profitCategories.length);
    const addition = summarizeProfit(
      [effect('employee_addition', '-2500')],
      names,
      exclusions,
      true,
    );
    expect(addition.payroll.additionsMinor).toBe('2500');
  });
});
