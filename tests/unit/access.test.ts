import { describe, it, expect } from 'vitest';
import {
  authorizeResource,
  effectiveGrants,
  scopedBranches,
  provisioningOutcome,
  type AccessContext,
  type Capability,
} from '@shahn/domain';
import { validateAccessCommand, validateLogin } from '@shahn/contracts';
const context = (grants: Capability[], branches = ['A']): AccessContext => ({
  principalId: 'u',
  principalKind: 'staff',
  sessionId: 's',
  companyId: 'c',
  companyName: 'company',
  companyActive: true,
  userActive: true,
  issuer: 'https://issuer',
  subject: 'subject',
  displayName: 'arbitrary title',
  authorizationRevision: '1',
  grants,
  assignedBranches: branches.map((id) => ({ id, name: id })),
  companyBranches: ['A', 'B'].map((id) => ({ id, name: id })),
  supportSessionId: null,
  supportExpiresAt: null,
});
describe('P02 complete authority and explicit scope policies', () => {
  for (const role of [false, true])
    for (const exception of ['inherit', 'allow', 'deny'] as const)
      it(`role ${role} with ${exception}`, () =>
        expect(
          effectiveGrants(role ? ['intake'] : [], { intake: exception }).includes('intake'),
        ).toBe(exception === 'deny' ? false : exception === 'allow' || role));
  for (const branches of [['A'], ['B'], ['A', 'B']])
    for (const capability of [
      'intake',
      'inventory',
      'expenses',
      'goods.send',
      'goods.receive',
      'employees',
      'payroll',
      'reports',
    ] as Capability[])
      it(`${capability} query narrows to ${branches.join('+')}`, () =>
        expect(scopedBranches(context([capability], branches), capability)).toEqual(branches));
  it('tracking is only company operational read, with no payroll, write, export or cross-company widening', () => {
    const ctx = context(['tracking']);
    const scope = {
      companyId: 'c',
      branchId: 'B',
      operation: 'read' as const,
      dataClass: 'operational' as const,
      stateAllowed: true,
    };
    expect(() => authorizeResource(ctx, 'tracking', scope)).not.toThrow();
    for (const change of [
      { companyId: 'other' },
      { operation: 'write' as const },
      { operation: 'export' as const },
      { dataClass: 'employee' as const },
      { dataClass: 'money' as const },
      { stateAllowed: false },
    ])
      expect(() => authorizeResource(ctx, 'tracking', { ...scope, ...change })).toThrow(
        'FORBIDDEN_SCOPE',
      );
  });
  it('goods source/receipt stay assigned; active other destination can be company-wide', () => {
    const ctx = context(['goods.send', 'goods.receive']);
    const resource = {
      companyId: 'c',
      branchId: 'A',
      destinationBranchId: 'B',
      operation: 'write' as const,
      dataClass: 'operational' as const,
      stateAllowed: true,
    };
    expect(() => authorizeResource(ctx, 'goods.send', resource)).not.toThrow();
    expect(() =>
      authorizeResource(ctx, 'goods.send', {
        ...resource,
        branchId: 'B',
        destinationBranchId: 'A',
      }),
    ).toThrow();
    expect(() =>
      authorizeResource(ctx, 'goods.send', { ...resource, destinationBranchId: 'C' }),
    ).toThrow();
    expect(() =>
      authorizeResource(ctx, 'goods.receive', {
        companyId: 'c',
        branchId: 'B',
        operation: 'write',
        dataClass: 'operational',
        stateAllowed: true,
      }),
    ).toThrow();
  });
  it('treasury receipt and send have independent company-wide grants', () => {
    expect(scopedBranches(context(['treasury.receive']), 'treasury.receive')).toEqual(['A', 'B']);
    expect(() => scopedBranches(context(['treasury.send']), 'treasury.receive')).toThrow();
    expect(() => scopedBranches(context(['treasury.receive']), 'expenses')).toThrow();
  });
  it('shared accessible wallet still requires separate funding authority and state', () => {
    const ctx = context(['brand.payout']),
      scope = {
        companyId: 'c',
        operation: 'read' as const,
        dataClass: 'money' as const,
        stateAllowed: true,
        brandAccessible: true,
      };
    expect(() => authorizeResource(ctx, 'brand.payout', scope)).not.toThrow();
    expect(() =>
      authorizeResource(ctx, 'brand.payout', { ...scope, operation: 'write' }),
    ).toThrow();
    expect(() =>
      authorizeResource(ctx, 'brand.payout', {
        ...scope,
        operation: 'write',
        fundingAllowed: true,
      }),
    ).not.toThrow();
  });
  it('support cannot bypass company or business state, and no title or branch implies driver presence', () => {
    const ctx = { ...context(['intake']), principalKind: 'support' as const };
    expect(() =>
      authorizeResource(ctx, 'intake', {
        companyId: 'c',
        branchId: 'A',
        operation: 'write',
        dataClass: 'operational',
        stateAllowed: false,
      }),
    ).toThrow();
    expect(Object.keys(ctx)).not.toContain('driverPresent');
    for (const invalid of [
      { companyActive: false },
      { userActive: false },
      { issuer: '' },
      { subject: '' },
    ])
      expect(() => scopedBranches({ ...ctx, ...invalid }, 'intake')).toThrow();
  });
  it('unknown/timeout remains pending, invalid remains failed, reconciled success is ready', () => {
    expect(
      ['unknown', 'unavailable', 'invalid', 'success'].map((k) =>
        provisioningOutcome(k as Parameters<typeof provisioningOutcome>[0]),
      ),
    ).toEqual(['pending', 'pending', 'failed', 'ready']);
  });
  it('closed schemas reject support-role self-grant and unrecognized company fields', () => {
    const command = {
      schemaVersion: 1,
      commandId: '6e531903-d5ab-4c41-ae1a-c05c1d54f391',
      companyId: '6e531903-d5ab-4c41-ae1a-c05c1d54f392',
      type: 'role.create',
      name: 'custom',
      active: true,
      grants: ['access.users'],
    };
    expect(validateAccessCommand(command)).toBe(true);
    expect(validateAccessCommand({ ...command, grants: ['support'] })).toBe(false);
    expect(validateAccessCommand({ ...command, support: true })).toBe(false);
    expect(
      validateLogin({
        companyCode: 'unknown',
        username: 'unknown',
        support: false,
        returnPath: '/',
      }),
    ).toBe(true);
    expect(
      validateLogin({
        companyCode: 'unknown',
        username: 'unknown',
        support: false,
        returnPath: '//evil',
      }),
    ).toBe(false);
  });
});
