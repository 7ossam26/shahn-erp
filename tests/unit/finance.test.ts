import { describe, it, expect } from 'vitest';
import {
  financeExamples,
  validateFinanceCommand,
  validateFinanceFilter,
  financeFamily,
} from '@shahn/contracts';
import { minor, validateReference, validateEffect } from '@shahn/domain';
const base = {
  schemaVersion: 1,
  companyId: '00000000-0000-4000-8000-000000000010',
  commandId: '00000000-0000-4000-8000-000000000011',
};
describe('P09 connected finance contracts and classifications', () => {
  it('accepts zero-start account setup without opening fields', () => {
    expect(validateFinanceCommand({ ...base, ...financeExamples.account })).toBe(true);
    expect(
      validateFinanceCommand({
        ...base,
        ...financeExamples.account,
        fields: { ...financeExamples.account.fields, balanceMinor: '100' },
      }),
    ).toBe(false);
  });
  it.each(['0', '-1', '1.5', '1e3', '+10', '01'])(
    'rejects invalid payment amount %s',
    (amountMinor) => {
      expect(
        validateFinanceCommand({
          ...base,
          ...financeExamples.deposit,
          fields: { ...financeExamples.deposit.fields, amountMinor },
        }),
      ).toBe(false);
    },
  );
  it('checks bigint bounds and unsupported currency', () => {
    expect(() => minor('9223372036854775808', 'positive')).toThrow('MONEY_OVERFLOW');
    expect(
      validateFinanceCommand({
        ...base,
        ...financeExamples.deposit,
        fields: { ...financeExamples.deposit.fields, currency: 'USD' },
      }),
    ).toBe(false);
  });
  it('accepts blank general reason and a prior-month date, rejects impossible dates', () => {
    expect(validateFinanceCommand({ ...base, ...financeExamples.deposit })).toBe(true);
    expect(
      validateFinanceCommand({
        ...base,
        ...financeExamples.deposit,
        fields: { ...financeExamples.deposit.fields, actualDate: '2026-02-30' },
      }),
    ).toBe(false);
    expect(
      validateFinanceCommand({
        ...base,
        ...financeExamples.deposit,
        fields: { ...financeExamples.deposit.fields, categoryId: base.commandId },
      }),
    ).toBe(false);
  });
  it('uses the P04 reference rules for addable expense categories', () => {
    expect(() =>
      validateReference({
        kind: 'expense_category',
        name: 'إيجار',
        active: true,
        parentId: null,
        volumeRange: null,
      }),
    ).not.toThrow();
    expect(() =>
      validateReference({
        kind: 'expense_category',
        name: 'إيجار',
        active: true,
        parentId: base.commandId,
        volumeRange: null,
      }),
    ).toThrow();
  });
  it('keeps money funding and paid cost in different journal families', () => {
    expect(financeFamily('expense.create')).toBe('finance.expenses');
    expect(
      validateEffect({
        family: 'money',
        kind: 'receipt',
        subjectId: base.commandId,
        branchId: base.companyId,
        amountMinor: '100000',
        effectiveDate: '2026-09-01',
        supersedesId: null,
        reason: null,
      }),
    ).toBe(100000n);
    expect(() =>
      validateEffect({
        family: 'operating',
        kind: 'cost',
        subjectId: base.commandId,
        branchId: base.companyId,
        amountMinor: '20000',
        effectiveDate: '2026-09-01',
        supersedesId: null,
        reason: null,
      }),
    ).toThrow();
  });
  it('closes filter names, date basis and pagination bounds', () => {
    const f = {
      search: '',
      branchId: null,
      accountId: null,
      categoryId: null,
      actorId: null,
      method: 'all',
      direction: 'all',
      dateBasis: 'actual',
      from: null,
      to: null,
      page: 1,
      limit: 25,
    };
    expect(validateFinanceFilter(f)).toBe(true);
    expect(validateFinanceFilter({ ...f, sort: 'balance' })).toBe(false);
    expect(validateFinanceFilter({ ...f, limit: 101 })).toBe(false);
  });
});
