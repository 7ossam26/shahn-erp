// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  employeeExamples,
  validateEmployeeTerms,
  validateEmployeeCommand,
  employeeCommandSchema,
  validateEmployeeFields,
} from '@shahn/contracts';
import {
  commissionPerVisit,
  validateCompensation,
  resolveEffective,
  resolvePolicy,
  cairoWorkDate,
  payrollEditReason,
  validateEmployeeProfile,
} from '@shahn/domain';
import type { CommissionTerms, PolicyRecord } from '@shahn/contracts';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
// Resolve the pinned workspace AJV8 used by the generated schemas, rather than ESLint's root AJV6.
const require = createRequire(resolve('packages/contracts/package.json'));
const Ajv = require('ajv') as new (options: object) => {
  compile: (schema: object) => (data: unknown) => boolean;
};
const formats = require('ajv-formats') as (ajv: unknown) => void;
const fields = {
  name: 'سلمى',
  contact: '01000000000',
  active: true,
  employmentStart: '2026-10-01',
  employmentEnd: null,
  branchId: 'a1111111-1111-4111-8111-111111111111',
  workDays: [0, 1, 2, 3, 4],
  hoursPerDay: 8,
  weeklyDayOff: 5,
};
const envelope = {
  companyId: 'b1111111-1111-4111-8111-111111111111',
  commandId: 'c1111111-1111-4111-8111-111111111111',
  schemaVersion: 1,
  type: 'employee.create',
  fields,
};
describe('P08 connected contracts and domain', () => {
  it.each(Object.entries(employeeExamples))(
    'accepts independent %s configuration through generated/client schema and domain',
    (name, terms) => {
      const ajv = new Ajv({ strict: true });
      formats(ajv);
      const client = ajv.compile(employeeCommandSchema),
        command = { ...envelope, terms };
      expect(client(command)).toBe(true);
      expect(validateEmployeeCommand(command)).toBe(true);
      expect(() => validateCompensation(terms)).not.toThrow();
      expect(name).toBeTruthy();
    },
  );
  it('rejects ambiguity, unset salary, wrong units, decimal bp and excess properties on both sides', () => {
    const ajv = new Ajv({ strict: true });
    formats(ajv);
    const client = ajv.compile(employeeCommandSchema);
    for (const terms of [
      { ...employeeExamples.salary, salary: { enabled: true, monthly: null } },
      {
        ...employeeExamples.fixed,
        commission: { ...employeeExamples.fixed.commission, basisPoints: 1000 },
      },
      {
        ...employeeExamples.combined,
        commission: { enabled: true, formula: 'percentage', basisPoints: 10.5, perVisit: null },
      },
      {
        ...employeeExamples.combined,
        commission: { enabled: true, formula: 'percentage', basisPoints: 10001, perVisit: null },
      },
      {
        ...employeeExamples.salary,
        salary: { enabled: true, monthly: { currency: 'USD', amountMinor: '600000' } },
      },
      {
        ...employeeExamples.salary,
        salary: { enabled: true, monthly: { currency: 'EGP', amountMinor: '6000.00' } },
      },
      {
        ...employeeExamples.off,
        salary: { enabled: false, monthly: { currency: 'EGP', amountMinor: '0' } },
      },
    ]) {
      expect(validateEmployeeTerms(terms)).toBe(false);
      expect(validateEmployeeCommand({ ...envelope, terms })).toBe(false);
      expect(client({ ...envelope, terms })).toBe(false);
    }
    expect(
      validateEmployeeCommand({ ...envelope, terms: employeeExamples.off, loginId: 'fake' }),
    ).toBe(false);
    const zero = {
      ...employeeExamples.salary,
      salary: { enabled: true as const, monthly: { currency: 'EGP' as const, amountMinor: '0' } },
    };
    expect(validateEmployeeTerms(zero)).toBe(true);
  });
  it('uses base-only piastres, half-up per visit and exact bigint at range limit', () => {
    expect(commissionPerVisit('5000', employeeExamples.combined.commission)).toBe('500');
    expect(commissionPerVisit('5000', employeeExamples.fixed.commission)).toBe('700');
    const half: CommissionTerms = {
      enabled: true,
      formula: 'percentage',
      basisPoints: 5000,
      perVisit: null,
    };
    expect(commissionPerVisit('1', half)).toBe('1');
    expect(BigInt(commissionPerVisit('1', half)) * 2n).toBe(2n);
    expect(commissionPerVisit('9223372036854775807', { ...half, basisPoints: 10000 })).toBe(
      '9223372036854775807',
    );
    expect(() => commissionPerVisit('9223372036854775808', half)).toThrow('MONEY_OVERFLOW');
    for (const kind of ['assignment', 'preparation', 'internal_transfer'] as const)
      expect(commissionPerVisit('5000', employeeExamples.fixed.commission, kind)).toBe('0');
  });
  it('resolves half-open work-time history and explicitly refuses missing/overlapping associations', () => {
    const rows = [
      { from: '2026-10-01', to: '2026-11-01', rate: 1000 },
      { from: '2026-11-01', to: null, rate: 2000 },
    ];
    expect(resolveEffective(rows, '2026-10-31')).toEqual({ status: 'resolved', value: rows[0] });
    expect(resolveEffective(rows, '2026-11-01')).toEqual({ status: 'resolved', value: rows[1] });
    expect(resolveEffective(rows, '2026-09-30')).toEqual({
      status: 'unresolved',
      reason: 'missing',
    });
    expect(
      resolveEffective([...rows, { from: '2026-10-20', to: null, rate: 3000 }], '2026-10-31'),
    ).toEqual({ status: 'unresolved', reason: 'overlap' });
    const policies = rows.map((r, i) => ({
      ...r,
      id: String(i),
      axis: 'commission' as const,
      superseded: false,
      terms: employeeExamples.fixed.commission,
      reason: 'test',
      recordedAt: '2026-10-04T00:00:00Z',
    })) as PolicyRecord[];
    expect(resolvePolicy(policies, 'salary', '2026-10-04')).toEqual({
      status: 'unresolved',
      reason: 'missing',
    });
  });
  it('guards Cairo boundary and protects past month even with no period record', () => {
    const now = new Date('2026-10-31T22:30:00Z');
    expect(cairoWorkDate(now)).toBe('2026-11-01');
    expect(payrollEditReason('2026-10', null, now)).toBe('PAST_PAYROLL_PROTECTED');
    expect(payrollEditReason('2026-11', 'editable_unpaid', now)).toBeNull();
    for (const state of ['frozen_unpaid', 'paid', 'zero_net_closed'] as const)
      expect(payrollEditReason('2026-11', state, now)).toBe('PAYROLL_PERIOD_PROTECTED');
    expect(payrollEditReason('2026-12', null, now)).toBeNull();
  });
  it('keeps descriptive schedules valid without introducing attendance or proration', () => {
    expect(validateEmployeeFields(fields)).toBe(true);
    expect(() => validateEmployeeProfile(fields)).not.toThrow();
    expect(() => validateEmployeeProfile({ ...fields, weeklyDayOff: 0 })).toThrow(
      'INVALID_EMPLOYEE_PROFILE',
    );
    expect(() => validateEmployeeProfile({ ...fields, employmentEnd: '2026-09-01' })).toThrow(
      'INVALID_EMPLOYEE_PROFILE',
    );
    expect(validateEmployeeFields({ ...fields, workDays: [1, 1] })).toBe(false);
  });
});
