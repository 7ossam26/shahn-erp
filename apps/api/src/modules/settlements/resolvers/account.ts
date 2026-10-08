import { randomUUID } from 'node:crypto';
import {
  AccessError,
  accountObservation,
  accountPosition,
  addMinor,
  assertCapability,
  cairoDate,
  minor,
  subtractMinor,
  type Capability,
} from '@shahn/domain';
import type { AccountResolution, SettlementOperation, PaymentFields } from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { JournalPosting } from '../../kernel/journals.js';
import { AccountFundsService, authorizedAccount } from '../../finance/accounts/service.js';
import { recordPaidMoney } from '../../finance/service.js';
import { configurationLock, requireReference } from '../../reference-data/service.js';
import type { PayrollClock } from '../../employees/payroll-period.service.js';
import {
  branchName,
  lockCaseRow,
  rejection,
  type PreviewBody,
  type Resolver,
  type CaseRow,
} from '../framework.js';
import {
  createSettlementObligation,
  employeeLabel,
  lockEmployeeForSettlement,
  payrollMonthBlocker,
} from '../payroll-links.js';

type Observe = Extract<SettlementOperation, { operation: 'account.observe' }>;
type Resolve = Extract<SettlementOperation, { operation: 'account.resolve' }>;
export const settlementObligationOwner = 'settlements.account_observation';
async function movementCount(u: UnitOfWork, accountId: string) {
  return Number(
    (
      await u.client.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM kernel.journal_effect WHERE company_id=$1 AND family='money' AND subject_id=$2`,
        [u.access.companyId, accountId],
      )
    ).rows[0]!.n,
  );
}
async function openObservation(u: UnitOfWork, accountId: string) {
  return (
    await u.client.query<{ reference: string }>(
      `SELECT c.reference FROM settlements.account_observation o JOIN settlements.adjustment_case c ON(c.company_id,c.id)=(o.company_id,o.case_id)
       WHERE o.company_id=$1 AND o.account_id=$2 AND c.state='open' LIMIT 1`,
      [u.access.companyId, accountId],
    )
  ).rows[0];
}
async function observeBody(u: UnitOfWork, op: Observe): Promise<PreviewBody> {
  u.assertBranch(op.branchId);
  const account = await authorizedAccount(u, op.accountId);
  const funds = new AccountFundsService(u);
  await funds.lock([op.accountId]);
  if (!account.branchIds.includes(op.branchId)) throw new AccessError('ACCOUNT_USAGE_FORBIDDEN');
  const book = await funds.book(op.accountId),
    held = await funds.held(op.accountId),
    count = await movementCount(u, op.accountId);
  const plan = accountObservation(book.toString(), op.observedMinor);
  const before = accountPosition(book.toString(), held.toString()),
    after = accountPosition(book.toString(), addMinor(held, minor(plan.holdMinor)).toString());
  const blockers: string[] = [],
    warnings: string[] = [];
  if (op.actualDate > cairoDate(new Date())) blockers.push('FUTURE_ACTUAL_DATE');
  if (await openObservation(u, op.accountId)) blockers.push('ACCOUNT_OBSERVATION_OPEN');
  if (!account.active) blockers.push('ACCOUNT_INACTIVE');
  if (plan.surplusMinor !== '0') warnings.push('POSITIVE_OBSERVATION_NOT_SPENDABLE');
  else warnings.push('UNEXPLAINED_SHORTAGE_HELD_UNTIL_RESOLVED');
  return {
    operation: 'account.observe',
    classification: 'account_observation',
    target: {
      kind: 'account',
      id: op.accountId,
      label: account.name,
      branchId: op.branchId,
      branchName: branchName(u, op.branchId),
    },
    facts: [
      { key: 'bookBalance', unit: 'minor', before: before.bookMinor, after: after.bookMinor },
      { key: 'observedActual', unit: 'minor', before: null, after: op.observedMinor },
      { key: 'difference', unit: 'minor', before: null, after: plan.differenceMinor },
      { key: 'discrepancyHold', unit: 'minor', before: before.holdMinor, after: after.holdMinor },
      {
        key: 'availableFunds',
        unit: 'minor',
        before: before.availableMinor,
        after: after.availableMinor,
      },
    ],
    effects:
      plan.holdMinor !== '0'
        ? [
            {
              ledger: 'hold',
              kind: 'unexplained_shortage_hold',
              label: 'حجز العجز غير المفسر من الرصيد المتاح حتى تسويته',
              amountMinor: '-' + plan.holdMinor,
              quantity: null,
              effectiveDate: op.actualDate,
            },
          ]
        : [
            {
              ledger: 'hold',
              kind: 'surplus_pending_explanation',
              label: 'فائض مسجل للمراجعة فقط؛ لا يضيف رصيدًا قابلًا للصرف',
              amountMinor: plan.surplusMinor,
              quantity: null,
              effectiveDate: op.actualDate,
            },
          ],
    dependents: [],
    warnings,
    blockers,
    versions: [{ key: 'money.account.effects', version: String(count) }],
  };
}
/** Actual-balance observation (ERP-D-133, ERP-R-142): retained observation and a shortage hold. */
export const accountObserveResolver: Resolver<Observe> = {
  operation: 'account.observe',
  targetKind: 'account',
  capabilities: ['finance.accounts'],
  allowedStates: 'Active account usable by an assigned branch, with no other open observation.',
  forbidden: [
    'automatic gain, loss, receipt or employee penalty from the difference',
    'spendable funds from a positive observation',
    'a second open observation for the same account — ACCOUNT_OBSERVATION_OPEN',
    'accepting a short driver remittance or partial treasury receipt',
  ],
  matches: (op): op is Observe => op.operation === 'account.observe',
  branchOf: async (_u, op) => op.branchId,
  preview: (u, op) => observeBody(u, op),
  confirm: async (u, op, ctx) => {
    const preview = await ctx.verify(await observeBody(u, op));
    const difference = preview.facts.find((f) => f.key === 'difference')!.after!;
    const book = preview.facts.find((f) => f.key === 'bookBalance')!.before!;
    const recorded = await ctx.record({
      classification: 'account_observation',
      amountMinor: difference,
      quantity: null,
      sourceId: null,
    });
    const company = u.access.companyId;
    await u.client.query(
      `INSERT INTO settlements.account_observation(company_id,case_id,account_id,branch_id,book_minor,observed_minor,difference_minor,movement_count,observed_date)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        company,
        recorded.caseId,
        op.accountId,
        op.branchId,
        book,
        op.observedMinor,
        difference,
        Number(preview.versions[0]!.version),
        op.actualDate,
      ],
    );
    if (minor(difference) < 0n) {
      await u.client.query(
        `INSERT INTO settlements.account_hold(company_id,id,case_id,account_id,amount_minor) VALUES($1,$2,$3,$4,$5)`,
        [company, randomUUID(), recorded.caseId, op.accountId, (-minor(difference)).toString()],
      );
    }
    await ctx.hooks.fault?.('effects');
    // P09 account obligation: the account cannot be deactivated while the case is open.
    await new AccountFundsService(u).registerObligation(
      op.accountId,
      settlementObligationOwner,
      recorded.caseId,
    );
    ctx.link('original', 'money_account', op.accountId, preview.target.label);
    return { state: 'open' };
  },
};
const resolutionGrant: Record<AccountResolution['kind'], Capability> = {
  missed_expense: 'expenses',
  missed_movement: 'finance.movements',
  company_loss: 'finance.accounts',
  employee_liability: 'employees',
};
const classificationOf = {
  missed_expense: 'missed_expense',
  missed_movement: 'missed_general_movement',
  company_loss: 'company_loss_unclassified',
  employee_liability: 'employee_liability',
} as const;
interface ObservationRow {
  account_id: string;
  branch_id: string;
  difference_minor: string;
  resolved: string;
  hold_id: string | null;
  hold_active: string | null;
}
async function observationOf(u: UnitOfWork, caseRow: CaseRow) {
  if (caseRow.operation !== 'account.observe') throw new AccessError('NOT_FOUND', 404);
  return (
    await u.client.query<ObservationRow>(
      `SELECT o.account_id,o.branch_id,o.difference_minor::text,
       COALESCE((SELECT sum(r.amount_minor) FROM settlements.resolution r WHERE r.company_id=o.company_id AND r.case_id=o.case_id AND r.classification<>'account_observation'),0)::text AS resolved,
       h.id AS hold_id,h.active_minor::text AS hold_active
       FROM settlements.account_observation o LEFT JOIN settlements.account_hold_balance h ON(h.company_id,h.case_id)=(o.company_id,o.case_id)
       WHERE o.company_id=$1 AND o.case_id=$2`,
      [u.access.companyId, caseRow.id],
    )
  ).rows[0]!;
}
function moneyFields(
  accountId: string,
  r: Exclude<AccountResolution, { kind: 'company_loss' | 'employee_liability' }>,
): PaymentFields {
  return {
    accountId,
    branchId: r.branchId,
    currency: 'EGP',
    amountMinor: r.amountMinor,
    actualDate: r.actualDate,
    method: r.method,
  };
}
async function resolveBody(
  u: UnitOfWork,
  op: Resolve,
  caseRow: CaseRow,
  clock?: PayrollClock,
): Promise<PreviewBody> {
  const r = op.resolution;
  assertCapability(u.access, resolutionGrant[r.kind]);
  u.assertBranch(r.branchId);
  const o = await observationOf(u, caseRow);
  const account = await authorizedAccount(u, o.account_id);
  const funds = new AccountFundsService(u);
  await funds.lock([o.account_id]);
  if (!account.branchIds.includes(r.branchId)) throw new AccessError('ACCOUNT_USAGE_FORBIDDEN');
  const difference = minor(o.difference_minor),
    shortage = difference < 0n,
    total = shortage ? -difference : difference,
    remaining = subtractMinor(total, minor(o.resolved, 'nonnegative')),
    amount = minor(r.amountMinor, 'positive');
  const book = await funds.book(o.account_id),
    held = await funds.held(o.account_id),
    count = await movementCount(u, o.account_id);
  const blockers: string[] = [],
    warnings: string[] = [];
  if (caseRow.state !== 'open') blockers.push('SETTLEMENT_ALREADY_RESOLVED');
  if (r.actualDate > cairoDate(new Date())) blockers.push('FUTURE_ACTUAL_DATE');
  if (!shortage && r.kind !== 'missed_movement') blockers.push('RESOLUTION_KIND_NOT_LAWFUL');
  if (amount > remaining) blockers.push('RESOLUTION_EXCEEDS_DIFFERENCE');
  if (r.kind === 'missed_expense') await requireReference(u, r.categoryId, 'expense_category');
  if ('method' in r && (account.type === 'cash') !== (r.method === 'cash'))
    blockers.push('METHOD_ACCOUNT_MISMATCH');
  let employeeVersion: string | null = null,
    employeeName = '';
  if (r.kind === 'employee_liability') {
    const e = await employeeLabel(u, r.employeeId);
    employeeName = e.name;
    const m = await payrollMonthBlocker(u, r.employeeId, r.month, clock);
    if (m.blocker) blockers.push(m.blocker);
    employeeVersion = `${m.month.version}:${m.month.digest}`;
  }
  const release = shortage ? amount : 0n,
    bookAfter = shortage ? subtractMinor(book, amount) : addMinor(book, amount),
    heldAfter = subtractMinor(held, release > held ? held : release);
  if (shortage && bookAfter < 0n) blockers.push('INSUFFICIENT_FUNDS');
  const before = accountPosition(book.toString(), held.toString()),
    after = accountPosition(
      (bookAfter < 0n ? 0n : bookAfter).toString(),
      (heldAfter < 0n ? 0n : heldAfter).toString(),
    );
  if (r.kind === 'company_loss') warnings.push('UNCLASSIFIED_OUTSIDE_OPERATING_PROFIT');
  if (r.kind === 'missed_movement') warnings.push('GENERAL_MOVEMENT_OUTSIDE_OPERATING_PROFIT');
  const signed = (shortage ? -amount : amount).toString(),
    effects: PreviewBody['effects'] = [
      {
        ledger: 'money',
        kind: r.kind === 'missed_movement' ? (shortage ? 'payment' : 'receipt') : 'payment',
        label: account.name,
        amountMinor: signed,
        quantity: null,
        effectiveDate: r.actualDate,
      },
    ];
  if (r.kind === 'missed_expense')
    effects.push({
      ledger: 'operating',
      kind: 'cost',
      label: r.description,
      amountMinor: '-' + amount.toString(),
      quantity: null,
      effectiveDate: r.actualDate,
    });
  if (r.kind === 'employee_liability')
    effects.push({
      ledger: 'employee',
      kind: 'obligation',
      label: `${employeeName} · ${r.month}`,
      amountMinor: amount.toString(),
      quantity: null,
      effectiveDate: r.actualDate,
    });
  if (release > 0n)
    effects.push({
      ledger: 'hold',
      kind: 'shortage_hold_release',
      label: 'استبدال الحجز بالترحيل المحدد',
      amountMinor: release.toString(),
      quantity: null,
      effectiveDate: r.actualDate,
    });
  return {
    operation: 'account.resolve',
    classification: classificationOf[r.kind],
    target: {
      kind: 'account',
      id: o.account_id,
      label: account.name,
      branchId: caseRow.branch_id,
      branchName: branchName(u, caseRow.branch_id),
    },
    facts: [
      { key: 'bookBalance', unit: 'minor', before: before.bookMinor, after: after.bookMinor },
      { key: 'discrepancyHold', unit: 'minor', before: before.holdMinor, after: after.holdMinor },
      {
        key: 'availableFunds',
        unit: 'minor',
        before: before.availableMinor,
        after: after.availableMinor,
      },
      {
        key: 'unexplainedRemaining',
        unit: 'minor',
        before: remaining.toString(),
        after: (amount > remaining ? 0n : remaining - amount).toString(),
      },
    ],
    effects,
    dependents: [],
    warnings,
    blockers,
    versions: [
      { key: 'settlement.case', version: String(caseRow.version) },
      { key: 'money.account.effects', version: String(count) },
      ...(employeeVersion ? [{ key: 'payroll.period', version: employeeVersion }] : []),
    ],
  };
}
/**
 * Resolution of an open account observation by one legitimate typed path: a genuinely missed paid
 * expense (P09 path), a missed general movement, an explicit company loss (unclassified, outside
 * operating profit) or an authorized employee liability (P20 recovery). The hold is replaced by the
 * typed posting in the same transaction, never deducted twice.
 */
export function accountResolveResolver(clock?: PayrollClock): Resolver<Resolve> {
  return {
    operation: 'account.resolve',
    targetKind: 'account',
    capabilities: ['finance.accounts'],
    allowedStates: 'An open account observation with an unexplained remainder.',
    forbidden: [
      'resolving more than the observed difference — RESOLUTION_EXCEEDS_DIFFERENCE',
      'loss/expense/liability for a positive observation — RESOLUTION_KIND_NOT_LAWFUL',
      'protected payroll month for a liability — PAST_PAYROLL_PROTECTED/PAYROLL_PERIOD_PROTECTED',
      'resolving an already resolved case — SETTLEMENT_ALREADY_RESOLVED',
    ],
    matches: (op): op is Resolve => op.operation === 'account.resolve',
    branchOf: async (u, op) =>
      (
        await u.client.query<{ branch_id: string }>(
          'SELECT branch_id FROM settlements.adjustment_case WHERE company_id=$1 AND id=$2',
          [u.access.companyId, op.caseId],
        )
      ).rows[0]?.branch_id ?? op.resolution.branchId,
    preview: async (u, op) => {
      const caseRow = await lockCaseRow(u, op.caseId);
      if (op.resolution.kind === 'missed_expense') await configurationLock(u);
      if (op.resolution.kind === 'employee_liability')
        await lockEmployeeForSettlement(u, [op.resolution.employeeId]);
      return resolveBody(u, op, caseRow, clock);
    },
    confirm: async (u, op, ctx) => {
      const r = op.resolution,
        company = u.access.companyId;
      const caseRow = await ctx.lockCase(op.caseId);
      if (caseRow.state !== 'open') throw rejection('SETTLEMENT_ALREADY_RESOLVED', {});
      const o = await observationOf(u, caseRow);
      const posting = new JournalPosting(u),
        entityId = randomUUID();
      let state: 'open' | 'resolved' = 'open';
      // Replace the hold inside the account lock, before any funds check of the typed posting.
      const replaceHold = async (preview: Awaited<ReturnType<typeof ctx.verify>>) => {
        const recorded = await ctx.record({
          classification: classificationOf[r.kind],
          amountMinor: r.amountMinor,
          quantity: null,
          sourceId: sourceId!,
        });
        const amount = minor(r.amountMinor, 'positive');
        if (minor(o.difference_minor) < 0n && o.hold_id && minor(o.hold_active!) > 0n)
          await u.client.query(
            `INSERT INTO settlements.account_hold_release(company_id,id,hold_id,resolution_id,amount_minor) VALUES($1,$2,$3,$4,$5)`,
            [
              company,
              randomUUID(),
              o.hold_id,
              recorded.resolutionId,
              (amount < minor(o.hold_active!) ? amount : minor(o.hold_active!)).toString(),
            ],
          );
        const remaining = preview.facts.find((f) => f.key === 'unexplainedRemaining')!.after;
        if (remaining === '0') {
          state = 'resolved';
          await new AccountFundsService(u).resolveObligation(
            o.account_id,
            settlementObligationOwner,
            caseRow.id,
          );
        }
        return recorded;
      };
      let sourceId: string | null = null;
      if (r.kind === 'missed_expense' || r.kind === 'missed_movement') {
        const shortage = minor(o.difference_minor) < 0n;
        const input =
          r.kind === 'missed_expense'
            ? {
                schemaVersion: 1 as const,
                companyId: company,
                commandId: ctx.recordId,
                type: 'expense.create' as const,
                fields: {
                  ...moneyFields(o.account_id, r),
                  categoryId: r.categoryId,
                  description: r.description,
                },
              }
            : {
                schemaVersion: 1 as const,
                companyId: company,
                commandId: ctx.recordId,
                type: 'movement.create' as const,
                fields: {
                  ...moneyFields(o.account_id, r),
                  direction: shortage ? ('withdrawal' as const) : ('deposit' as const),
                  reason: ctx.reason,
                },
              };
        sourceId = (
          await posting.source(
            { system: 'erp', identity: entityId, kind: input.type, revision: '1' },
            input.fields,
          )
        ).id;
        const paid = await recordPaidMoney(u, input, ctx.recordId, {
          id: entityId,
          sourceId,
          beforeFunds: async () => {
            const preview = await ctx.verify(await resolveBody(u, op, caseRow, clock));
            await replaceHold(preview);
          },
        });
        await ctx.hooks.fault?.('effects');
        ctx.link(
          'result',
          r.kind === 'missed_expense' ? 'paid_expense' : 'money_movement',
          r.kind === 'missed_expense' ? paid.id : paid.movementId,
          r.kind === 'missed_expense' ? r.description : ctx.reason,
        );
        ctx.link('result', 'money_movement', paid.movementId, 'حركة الحساب');
      } else {
        sourceId = (
          await posting.source(
            { system: 'settlement', identity: entityId, kind: 'account.' + r.kind, revision: '1' },
            { caseId: op.caseId, resolution: r, reason: ctx.reason },
          )
        ).id;
        if (r.kind === 'employee_liability') await lockEmployeeForSettlement(u, [r.employeeId]);
        const funds = new AccountFundsService(u);
        await funds.lock([o.account_id]);
        const preview = await ctx.verify(await resolveBody(u, op, caseRow, clock));
        await replaceHold(preview);
        const fields: PaymentFields = {
          accountId: o.account_id,
          branchId: r.branchId,
          currency: 'EGP',
          amountMinor: r.amountMinor,
          actualDate: r.actualDate,
          method:
            (await authorizedAccount(u, o.account_id)).type === 'cash' ? 'cash' : 'bank_deposit',
        };
        const movement = await funds.post({
          sourceId,
          recordId: ctx.recordId,
          fields,
          direction: 'withdrawal',
          sourceKind: 'settlement',
          reason:
            r.kind === 'company_loss'
              ? 'خسارة شركة مؤكدة لفرق حساب: ' + ctx.reason
              : 'التزام موظف معتمد لفرق حساب: ' + ctx.reason,
          ...(r.kind === 'employee_liability'
            ? {
                additionalEffects: [
                  {
                    family: 'employee' as const,
                    kind: 'obligation' as const,
                    subjectId: r.employeeId,
                    amountMinor: r.amountMinor,
                    branchId: r.branchId,
                    effectiveDate: r.actualDate,
                    supersedesId: null,
                    reason: ctx.reason,
                  },
                ],
              }
            : {}),
        });
        if (r.kind === 'employee_liability') {
          await createSettlementObligation(u, {
            id: entityId,
            employeeId: r.employeeId,
            month: r.month,
            amountMinor: r.amountMinor,
            effectiveDate: r.actualDate,
            branchId: r.branchId,
            sourceId,
            kind: 'account_liability',
            label: 'التزام معتمد عن فرق حساب ' + caseRow.reference,
            clock,
          });
          ctx.link(
            'result',
            'employee_obligation',
            entityId,
            'التزام موظف قابل للاسترداد من الراتب',
          );
        }
        await ctx.hooks.fault?.('effects');
        ctx.link('result', 'money_movement', movement.id, 'حركة الحساب');
      }
      ctx.link('original', 'money_account', o.account_id, 'الحساب');
      return { state };
    },
  };
}
