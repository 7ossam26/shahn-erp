import { describe, it, expect } from 'vitest';
import {
  addMinor,
  subtractMinor,
  multiplyMinor,
  minor,
  MAX_MINOR,
  MIN_MINOR,
  walletAmounts,
  validateEffect,
  workState,
  cairoDayRange,
} from '@shahn/domain';
import { validateKernelCommand } from '@shahn/contracts';
import { randomUUID } from 'node:crypto';
describe('P03 exact native money and typed journal policy', () => {
  it.each([
    '01',
    '-0',
    '+1',
    '1.0',
    '1e3',
    ' 1',
    '1 ',
    '',
    '9223372036854775808',
    '-9223372036854775809',
  ])('rejects %j', (value) => expect(() => minor(value)).toThrow());
  it('round-trips signed bigint bounds and checks every intermediate', () => {
    expect(minor(MAX_MINOR.toString())).toBe(MAX_MINOR);
    expect(minor(MIN_MINOR.toString())).toBe(MIN_MINOR);
    expect(() => addMinor(MAX_MINOR, 1n)).toThrow('MONEY_OVERFLOW');
    expect(() => subtractMinor(MIN_MINOR, 1n)).toThrow('MONEY_OVERFLOW');
    expect(() => multiplyMinor(MAX_MINOR, 2n)).toThrow('MONEY_OVERFLOW');
    expect(() => minor('0', 'positive')).toThrow();
    expect(() => minor('-1', 'nonnegative')).toThrow();
    expect(() => minor(1)).toThrow();
  });
  it('keeps pending and cover out of payout; fee consumption deducts once', () => {
    expect(walletAmounts(10000n, 25000n, 0n, 0n, 5000n).eligibleToPay).toBe('5000');
    expect(walletAmounts(5000n, 25000n, 0n, 0n, 0n).eligibleToPay).toBe('5000');
    expect(walletAmounts(0n, 25000n, 5000n, 0n, 0n)).toMatchObject({
      signedEntitlement: '20000',
      eligibleToPay: '0',
    });
    expect(() => walletAmounts(MAX_MINOR, 1n, 1n, 0n, 0n)).toThrow('MONEY_OVERFLOW');
  });
  it('rejects unsupported currency and arbitrary effects in the closed command', () => {
    const value = {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: randomUUID(),
      brandId: randomUUID(),
      branchId: randomUUID(),
      sourceId: randomUUID(),
      type: 'kernel.reserve',
      expectedVersion: 1,
      money: { currency: 'EGP', amountMinor: '5000' },
    };
    expect(validateKernelCommand(value)).toBe(true);
    expect(validateKernelCommand({ ...value, effects: [] })).toBe(false);
    expect(
      validateKernelCommand({ ...value, money: { currency: 'USD', amountMinor: '5000' } }),
    ).toBe(false);
    expect(validateKernelCommand({ ...value, money: { currency: 'EGP', amountMinor: 50 } })).toBe(
      false,
    );
  });
  it('requires typed signs and linked corrections', () => {
    const base = {
      subjectId: randomUUID(),
      branchId: randomUUID(),
      effectiveDate: '2026-10-03',
      supersedesId: null,
      reason: null,
    };
    expect(() =>
      validateEffect({ ...base, family: 'brand', kind: 'fee', amountMinor: '1' }),
    ).toThrow('INVALID_JOURNAL_SIGN');
    expect(() =>
      validateEffect({ ...base, family: 'operating', kind: 'correction', amountMinor: '1' }),
    ).toThrow('CORRECTION_LINK_REQUIRED');
    expect(workState({ kind: 'unknown', code: 'TIMEOUT' })).toBe('pending');
    expect(workState({ kind: 'definite', code: 'REJECTED' })).toBe('failed');
    expect(() => workState({ kind: 'retryable', code: 'password=secret' })).toThrow(
      'UNSAFE_DIAGNOSTIC',
    );
  });
  it('preserves a half-open Cairo DST day independently of UTC recording', () => {
    const range = cairoDayRange('2026-04-24');
    expect(Date.parse(range.end) - Date.parse(range.start)).toBe(23 * 3600000);
  });
});
