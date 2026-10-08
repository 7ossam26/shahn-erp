import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError, calculatePayroll, payrollEditReason } from '@shahn/domain';
import type {
  PayrollCommand,
  PayrollEarning,
  PayrollObligation,
  PayrollResult,
  SettlementOperation,
} from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { JournalPosting } from '../../kernel/journals.js';
import { payrollCommands, payrollMonth } from '../../employees/payroll.service.js';
import { databasePayrollClock, type PayrollClock } from '../../employees/payroll-period.service.js';
import { branchName, type PreviewBody, type Resolver } from '../framework.js';

type Adjust = Extract<SettlementOperation, { operation: 'employee.adjust' }>;
const synthetic = '00000000-0000-4000-8000-0000000000a1';
function payrollInput(
  u: UnitOfWork,
  op: Adjust,
  p: { version: number; digest: string },
  commandId: string,
  reason: string,
): Extract<PayrollCommand, { type: 'payroll.adjustment' }> {
  return {
    schemaVersion: 1,
    companyId: u.access.companyId,
    commandId,
    type: 'payroll.adjustment',
    employeeId: op.employeeId,
    month: op.month,
    expectedVersion: p.version,
    expectedDigest: p.digest,
    kind: op.kind,
    amountMinor: op.amountMinor,
    reason,
    workDate: op.workDate,
  };
}
async function body(u: UnitOfWork, op: Adjust, clock: PayrollClock): Promise<PreviewBody> {
  const p = await payrollMonth(u, op.employeeId, op.month, clock),
    now = await clock(u.client);
  const blockers: string[] = [];
  const reason = payrollEditReason(op.month, p.state, now.now);
  if (reason) blockers.push(reason);
  if (p.payment) blockers.push('PAYROLL_PERIOD_PROTECTED');
  if (p.blockers.length) blockers.push('PAYROLL_REVIEW_REQUIRED');
  if (op.workDate.slice(0, 7) !== op.month) blockers.push('LINKED_OLD_WORK_REQUIRED');
  const earnings: PayrollEarning[] = [...p.earnings],
    obligations: PayrollObligation[] = [...p.obligations];
  const row = {
    id: synthetic,
    amountMinor: op.amountMinor,
    branchId: p.branchId,
    recordedAt: '9999-12-31T00:00:00.000Z',
    sourceId: synthetic,
  };
  earnings.push({
    ...row,
    kind: op.kind,
    workDate: op.workDate,
    label: 'preview',
    visitId: null,
    policyId: null,
  });
  if (op.kind === 'earning_deduction')
    obligations.push({
      ...row,
      kind: 'earning_deduction',
      sourceLabel: 'preview',
      month: op.month,
      effectiveDate: op.workDate,
      outstandingAmount: op.amountMinor,
      reservedForFrozenPeriods: '0',
      availableForNewAllocation: op.amountMinor,
    });
  const after = blockers.length ? p.calculation : calculatePayroll(op.month, earnings, obligations);
  const facts = (
    [
      ['grossEarning', 'grossEarning'],
      ['payrollRecovery', 'recoveryThisPeriod'],
      ['netPayable', 'netPayable'],
      ['carryRemaining', 'carryRemaining'],
      ['employeeCost', 'employeeCost'],
    ] as const
  ).map(([key, field]) => ({
    key,
    unit: 'minor' as const,
    before: p.calculation[field],
    after: after[field],
  }));
  return {
    operation: 'employee.adjust',
    classification:
      op.kind === 'earning_deduction' ? 'payroll_earning_deduction' : 'payroll_addition',
    target: {
      kind: 'employee',
      id: op.employeeId,
      label: `${p.employeeName} · ${op.month}`,
      branchId: p.branchId,
      branchName: branchName(u, p.branchId),
    },
    facts,
    effects: [
      {
        ledger: 'employee',
        kind: op.kind === 'earning_deduction' ? 'obligation' : 'earning',
        label:
          op.kind === 'bonus'
            ? 'مكافأة في شهر حالي غير مدفوع أو مستقبلي'
            : op.kind === 'overtime'
              ? 'وقت إضافي'
              : 'خصم استحقاق يخفض تكلفة الموظف',
        amountMinor: op.amountMinor,
        quantity: null,
        effectiveDate: op.workDate,
      },
    ],
    dependents: p.payment
      ? [{ kind: 'salary_payment', id: p.payment.id, label: 'راتب مدفوع محمي', state: 'retained' }]
      : [],
    warnings: op.kind === 'earning_deduction' ? ['DEDUCTION_IS_NOT_ADVANCE_RECOVERY'] : [],
    blockers,
    versions: [{ key: 'payroll.period', version: `${p.version}:${p.digest}` }],
  };
}
/**
 * Employee target through P20's own typed adjustment path: current-unpaid or future month only.
 * A past, frozen or paid calculation is never edited (ERP-D-083/191, ERP-R-085); no cash moves.
 */
export function employeeAdjustResolver(
  pool: Pool,
  clock: PayrollClock = databasePayrollClock,
): Resolver<Adjust> {
  const definition = payrollCommands(pool, {}, clock).definitions.find(
    (d) => d.kind === 'payroll.adjustment',
  )!;
  return {
    operation: 'employee.adjust',
    targetKind: 'employee',
    capabilities: ['employees'],
    allowedStates: 'An editable unpaid current or future payroll month without source review.',
    forbidden: [
      'paid, zero-closed, frozen or past month — PAST_PAYROLL_PROTECTED/PAYROLL_PERIOD_PROTECTED',
      'partial salary payout or cash repayment from a deduction',
      'advance or incident recovery reclassified as an entitlement deduction',
    ],
    matches: (op): op is Adjust => op.operation === 'employee.adjust',
    branchOf: async (u, op) => {
      const row = (
        await u.client.query<{ branch_id: string }>(
          'SELECT branch_id FROM employees.employee WHERE company_id=$1 AND id=$2',
          [u.access.companyId, op.employeeId],
        )
      ).rows[0];
      if (!row) throw new AccessError('NOT_FOUND', 404);
      return row.branch_id;
    },
    preview: (u, op) => body(u, op, clock),
    confirm: async (u, op, ctx) => {
      const commandId = randomUUID();
      // P20 rechecks the reviewed month version/digest under its own locks; its command source
      // identity is locked first, and its execute reuses that same identity and payload.
      const reviewed = ctx.expectedVersions.find((v) => v.key === 'payroll.period')?.version ?? '';
      const [version, digest] = reviewed.split(':');
      const input = payrollInput(
        u,
        op,
        { version: Number(version) || 0, digest: digest ?? '' },
        commandId,
        ctx.reason,
      );
      const source = await new JournalPosting(u).source(
        { system: 'erp', identity: commandId, kind: 'payroll.adjustment', revision: '1' },
        input,
      );
      const preview = await ctx.verify(await body(u, op, clock));
      await ctx.record({
        classification: preview.classification,
        amountMinor: op.amountMinor,
        quantity: null,
        sourceId: source.id,
      });
      await definition.authorize(u, input, false);
      const reply = await definition.execute(u, input, ctx.recordId);
      await ctx.hooks.fault?.('effects');
      const result = reply.reply.body as PayrollResult;
      ctx.link('original', 'employee', op.employeeId, preview.target.label);
      ctx.link('result', 'payroll_adjustment', result.recordId, preview.effects[0]!.label);
      return { state: 'resolved' };
    },
  };
}
