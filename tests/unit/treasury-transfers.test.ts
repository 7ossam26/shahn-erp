import { it, expect } from 'vitest';
import {
  validateTreasuryCommand,
  validateTreasuryFilter,
  treasuryViewSchemas,
} from '@shahn/contracts';
import { minor, authorizeResource, type AccessContext } from '@shahn/domain';
import {
  cairoInput,
  cairoTimestamp,
} from '../../apps/web/src/features/finance/treasury-transfers/time.js';
const id = '00000000-0000-4000-8000-000000000001',
  other = '00000000-0000-4000-8000-000000000002';
const base = { schemaVersion: 1, commandId: id, companyId: id, transferId: id };
const send = {
  ...base,
  type: 'treasury.send',
  sourceAccountId: id,
  destinationAccountId: other,
  sourceBranchId: id,
  destinationBranchId: other,
  amountMinor: '30000',
  currency: 'EGP',
  actualSentAt: '2026-09-01T10:00:00Z',
  expectedSourceVersion: 1,
  expectedDestinationVersion: 1,
};
const receive = {
  ...base,
  type: 'treasury.receive',
  expectedVersion: 1,
  actualReceivedAt: '2026-09-01T11:00:00Z',
  confirmFullReceipt: true,
};
it('converts Cairo local assertion times independently of host timezone across summer/winter', () => {
  expect(cairoTimestamp('2026-09-01T13:00')).toBe('2026-09-01T10:00:00.000Z');
  expect(cairoTimestamp('2026-01-01T13:00')).toBe('2026-01-01T11:00:00.000Z');
  expect(cairoInput(new Date('2026-09-01T10:00:00Z'))).toBe('2026-09-01T13:00');
  expect(() => cairoTimestamp('2026-02-30T13:00')).toThrow('INVALID_ACTUAL_TIME');
});
it('accepts exact native send and full receipt with distinct source and transport identity', () => {
  expect(validateTreasuryCommand(send)).toBe(true);
  expect(validateTreasuryCommand(receive)).toBe(true);
  expect(Object.keys(treasuryViewSchemas)).toEqual(['result', 'detail', 'list', 'catalog']);
});
it.each(['0', '-1', '299.5', '1e3', '01', '+300'])(
  'rejects invalid minor amount %s',
  (amountMinor) => expect(validateTreasuryCommand({ ...send, amountMinor })).toBe(false),
);
it('checks bounds, currency, timestamp offsets and mandatory versions', () => {
  expect(() => minor('9223372036854775808', 'positive')).toThrow('MONEY_OVERFLOW');
  expect(validateTreasuryCommand({ ...send, currency: 'USD' })).toBe(false);
  expect(validateTreasuryCommand({ ...send, actualSentAt: '2026-09-01T10:00:00' })).toBe(false);
  expect(validateTreasuryCommand({ ...send, expectedSourceVersion: 0 })).toBe(false);
});
it.each([
  { amountMinor: '29900' },
  { destinationAccountId: other },
  { sourceAccountId: other },
  { confirmFullReceipt: false },
  { reject: true },
])('closes receipt payload against alteration: %j', (extra) =>
  expect(validateTreasuryCommand({ ...receive, ...extra })).toBe(false),
);
it('keeps treasury company reach separate from assigned expense authority', () => {
  const ctx = {
    issuer: 'issuer',
    subject: 'subject',
    companyId: id,
    userActive: true,
    companyActive: true,
    grants: ['treasury.send', 'treasury.receive', 'expenses'],
    assignedBranches: [],
    companyBranches: [{ id: other, name: 'B' }],
  } as unknown as AccessContext;
  const resource = {
    companyId: id,
    branchId: other,
    operation: 'write',
    dataClass: 'money',
    stateAllowed: true,
  } as const;
  expect(() => authorizeResource(ctx, 'treasury.send', resource)).not.toThrow();
  expect(() => authorizeResource(ctx, 'treasury.receive', resource)).not.toThrow();
  expect(() => authorizeResource(ctx, 'expenses', resource)).toThrow('FORBIDDEN_SCOPE');
  expect(() =>
    authorizeResource(ctx, 'treasury.receive', { ...resource, companyId: other }),
  ).toThrow('FORBIDDEN_SCOPE');
  expect(() =>
    authorizeResource({ ...ctx, grants: ['treasury.send'] }, 'treasury.receive', resource),
  ).toThrow('FORBIDDEN_SCOPE');
});
it('closes combined filter criteria and rejects history leakage fields', () => {
  const f = {
    search: '١٠٠',
    sourceBranchId: null,
    destinationBranchId: other,
    state: 'sent',
    dateBasis: 'sent',
    from: '2026-09-01',
    to: '2026-09-30',
    page: 1,
    limit: 25,
  };
  expect(validateTreasuryFilter(f)).toBe(true);
  expect(validateTreasuryFilter({ ...f, accountHistory: true })).toBe(false);
  expect(validateTreasuryFilter({ ...f, from: '2026-02-30' })).toBe(false);
});
