import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  PayrollCommand,
  PayrollFunding,
  PayrollMonth,
  PayrollPreview,
  PayrollPreviewInput,
  PayrollResult,
  PaymentFields,
} from '@shahn/contracts';
import { validatePayrollCommand } from '@shahn/contracts';
import { AccessError, minor, resolveEffective } from '@shahn/domain';
import { readEmployee, reservePayroll } from '@shahn/database';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { JournalPosting } from '../kernel/journals.js';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { AccountFundsService } from '../finance/accounts/service.js';
import {
  payrollMonth,
  editablePayroll,
  databasePayrollClock,
  type PayrollClock,
} from './payroll-period.service.js';
export { payrollMonth } from './payroll-period.service.js';
export { acceptIncidentPayrollObligation } from '@shahn/database';
export const payrollFamily = 'employees.payroll';
export interface PayrollHooks {
  afterLock?: (u: UnitOfWork, input: PayrollCommand) => Promise<void>;
  fault?: (stage: 'advance-debit' | 'allocations' | 'cash' | 'result') => Promise<void>;
}
const fields = (funding: PayrollFunding, amountMinor: string): PaymentFields => ({
  ...funding,
  currency: 'EGP',
  amountMinor,
});
function expected(p: PayrollMonth, input: { expectedVersion: number; expectedDigest: string }) {
  if (p.version !== input.expectedVersion || p.digest !== input.expectedDigest)
    throw new AccessError('PAYROLL_REVISED', 409, p.version);
}
async function fundingDate(u: UnitOfWork, f: PayrollFunding, clock: PayrollClock) {
  const now = await clock(u.client);
  if (f.actualDate > now.today) throw new AccessError('FUTURE_PAYMENT_DATE', 409);
}
export async function payrollPreview(
  u: UnitOfWork,
  employee: string,
  month: string,
  input: PayrollPreviewInput,
  clock: PayrollClock = databasePayrollClock,
): Promise<PayrollPreview> {
  const p = await payrollMonth(u, employee, month, clock);
  expected(p, input);
  const accounts = new AccountFundsService(u);
  await accounts.lock([input.funding.accountId]);
  const account = await accounts.use(fields(input.funding, p.calculation.netPayable));
  await fundingDate(u, input.funding, clock);
  const available = await accounts.available(account.id),
    blockers = [...p.blockers];
  if (p.payment) blockers.push('ALREADY_PAID');
  if (p.month > p.currentMonth) blockers.push('FUTURE_PAYROLL');
  if (p.calculation.netPayable === '0') blockers.push('USE_ZERO_CLOSE');
  if (available < minor(p.calculation.netPayable)) blockers.push('INSUFFICIENT_FUNDS');
  return {
    month: p,
    funding: input.funding,
    accountName: account.name,
    availableMinor: String(available),
    blockers,
  };
}
export function payrollCommands(
  pool: Pool,
  hooks: PayrollHooks = {},
  clock: PayrollClock = databasePayrollClock,
) {
  const definitions: CommandDefinition<PayrollCommand>[] = (
    [
      'payroll.advance',
      'payroll.adjustment',
      'payroll.resolve',
      'payroll.payout',
      'payroll.zero-close',
    ] as const
  ).map((kind) => ({
    kind,
    family: payrollFamily,
    capability: 'employees',
    prepareProtectedHistory: async (u, input) => {
      if (
        validatePayrollCommand(input) &&
        ['payroll.advance', 'payroll.adjustment', 'payroll.resolve'].includes(input.type) &&
        input.month < (await clock(u.client)).month
      ) {
        // Keep lawful historical materialization when the attempted edit is rejected. The
        // command's source identity is locked first, preserving the global lock order.
        await new JournalPosting(u).source(
          { system: 'erp', identity: input.commandId, kind: input.type, revision: '1' },
          input,
        );
        await payrollMonth(u, input.employeeId, input.month, clock);
      }
    },
    authorize: async (u, value) => {
      const id = value.employeeId;
      if (typeof id !== 'string') throw new AccessError('VALIDATION_FAILED', 400);
      const e = await readEmployee(u.client, u.access.companyId, id);
      if (!e) throw new AccessError('NOT_FOUND', 404);
      u.assertBranch(e.branch_id);
      const branches = await u.client.query<{ branch_id: string }>(
        `SELECT branch_id FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2 UNION SELECT branch_id FROM employees.payroll_obligation WHERE company_id=$1 AND employee_id=$2 UNION SELECT branch_id FROM employees.payroll_adjustment WHERE company_id=$1 AND employee_id=$2`,
        [u.access.companyId, id],
      );
      for (const b of branches.rows) u.assertBranch(b.branch_id);
      if ('funding' in value && value.funding)
        u.assertBranch((value.funding as PayrollFunding).branchId);
      if ('branchIds' in value) for (const b of value.branchIds as string[]) u.assertBranch(b);
    },
    rejectionReference: async (input, u) => ({
      entityId: input.employeeId,
      branchId: (await readEmployee(u.client, u.access.companyId, input.employeeId))!.branch_id,
    }),
    resolve: async (u, ref) =>
      (
        await u.client.query<{ result: PayrollResult }>(
          'SELECT result FROM employees.payroll_outcome WHERE company_id=$1 AND command_record_id=$2',
          [u.access.companyId, ref.recordId],
        )
      ).rows[0]!.result,
    execute: async (u, input, recordId) => {
      if (!validatePayrollCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
      const posting = new JournalPosting(u),
        company = u.access.companyId;
      const source = await posting.source(
        { system: 'erp', identity: input.commandId, kind: input.type, revision: '1' },
        input,
      );
      const p = await payrollMonth(u, input.employeeId, input.month, clock);
      await hooks.afterLock?.(u, input);
      if (p.payment && (input.type === 'payroll.payout' || input.type === 'payroll.zero-close'))
        throw new AccessError('ALREADY_PAID', 409);
      expected(p, input);
      if (p.blockers.length) throw new AccessError('PAYROLL_REVIEW_REQUIRED', 409);
      await posting.lock('employee', input.employeeId);
      const id = randomUUID();
      let amount = '0';
      if (
        input.type === 'payroll.advance' ||
        input.type === 'payroll.adjustment' ||
        input.type === 'payroll.resolve'
      ) {
        await editablePayroll(u.client, company, input.employeeId, input.month, clock);
        if (input.type === 'payroll.advance') {
          amount = minor(input.amountMinor, 'positive').toString();
          await fundingDate(u, input.funding, clock);
          const accounts = new AccountFundsService(u);
          await accounts.lock([input.funding.accountId]);
          const movement = await accounts.post({
            sourceId: source.id,
            recordId,
            fields: fields(input.funding, amount),
            direction: 'withdrawal',
            sourceKind: 'employee_advance',
            reason: 'سلفة موظف ' + input.funding.reference,
            additionalEffects: [
              {
                family: 'employee',
                kind: 'obligation',
                subjectId: input.employeeId,
                amountMinor: amount,
                branchId: p.branchId,
                effectiveDate: input.funding.actualDate,
                supersedesId: null,
                reason: 'Actual employee advance',
              },
            ],
          });
          await hooks.fault?.('advance-debit');
          await u.client.query(
            `INSERT INTO employees.advance(company_id,id,employee_id,month,amount_minor,actual_date,reference,branch_id,source_id,movement_id,command_record_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              company,
              id,
              input.employeeId,
              input.month + '-01',
              amount,
              input.funding.actualDate,
              input.funding.reference,
              p.branchId,
              source.id,
              movement.id,
              recordId,
            ],
          );
          await u.client.query(
            `INSERT INTO employees.payroll_obligation(company_id,id,employee_id,month,kind,amount_minor,effective_date,branch_id,source_id,advance_id) VALUES($1,$2,$3,$4,'advance',$5,$6,$7,$8,$2)`,
            [
              company,
              id,
              input.employeeId,
              input.month + '-01',
              amount,
              input.funding.actualDate,
              p.branchId,
              source.id,
            ],
          );
        } else {
          let workDate: string,
            branchId: string,
            visitId: string | null = null;
          const adjustmentKind =
            input.type === 'payroll.resolve' ? 'earning_correction' : input.kind;
          if (input.type === 'payroll.resolve') {
            const review = p.reviews.find((r) => r.id === input.reviewId);
            if (
              !review ||
              review.kind !== 'late_commission' ||
              review.resolvedMonth ||
              review.amountMinor === null
            )
              throw new AccessError('SOURCE_REVIEW_NOT_RESOLVABLE', 409);
            amount = minor(review.amountMinor, 'positive').toString();
            workDate = review.workDate;
            branchId = review.branchId;
            visitId = review.visitId;
          } else {
            amount = minor(input.amountMinor, 'positive').toString();
            workDate = input.workDate;
            if (workDate.slice(0, 7) !== input.month)
              throw new AccessError('LINKED_OLD_WORK_REQUIRED', 409);
            const history = (
              await u.client.query<{ branch_id: string; from: string; to: string | null }>(
                `SELECT branch_id,effective_from::text AS "from",effective_to::text AS "to" FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2 AND NOT superseded`,
                [company, input.employeeId],
              )
            ).rows;
            const branch = resolveEffective(history, workDate);
            if (branch.status !== 'resolved')
              throw new AccessError('EMPLOYEE_BRANCH_UNRESOLVED', 409);
            branchId = branch.value.branch_id;
          }
          u.assertBranch(branchId);
          await posting.append(source.id, recordId, [
            {
              family: 'employee',
              kind: adjustmentKind === 'earning_deduction' ? 'obligation' : 'earning',
              subjectId: input.employeeId,
              amountMinor: amount,
              branchId,
              effectiveDate: workDate,
              supersedesId: null,
              reason: input.reason,
            },
          ]);
          await u.client.query(
            `INSERT INTO employees.payroll_adjustment(company_id,id,employee_id,month,kind,amount_minor,reason,work_date,branch_id,source_id,command_record_id,visit_id,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              company,
              id,
              input.employeeId,
              input.month + '-01',
              adjustmentKind,
              amount,
              input.reason,
              workDate,
              branchId,
              source.id,
              recordId,
              visitId,
              u.access.principalId,
            ],
          );
          if (adjustmentKind === 'earning_deduction')
            await u.client.query(
              `INSERT INTO employees.payroll_obligation(company_id,id,employee_id,month,kind,amount_minor,effective_date,branch_id,source_id,adjustment_id) VALUES($1,$2,$3,$4,'earning_deduction',$5,$6,$7,$8,$2)`,
              [
                company,
                id,
                input.employeeId,
                input.month + '-01',
                amount,
                workDate,
                branchId,
                source.id,
              ],
            );
        }
        await u.client.query(
          'UPDATE employees.payroll_period SET version=version+1 WHERE company_id=$1 AND employee_id=$2 AND month=$3',
          [company, input.employeeId, input.month + '-01'],
        );
      } else {
        const now = await clock(u.client);
        if (input.month > now.month) throw new AccessError('FUTURE_PAYROLL', 409);
        amount = p.calculation.netPayable;
        if ((input.type === 'payroll.zero-close') !== (amount === '0'))
          throw new AccessError(amount === '0' ? 'USE_ZERO_CLOSE' : 'PAY_FULL_NET', 409);
        const accounts = new AccountFundsService(u);
        if (input.type === 'payroll.payout') {
          await fundingDate(u, input.funding, clock);
          await accounts.lock([input.funding.accountId]);
          await accounts.use(fields(input.funding, amount));
          await accounts.requireFunds(input.funding.accountId, amount);
        }
        if (!p.frozenAt) await reservePayroll(u.client, company, p);
        await hooks.fault?.('allocations');
        // Conversion retains the immutable period/original/amount; it produces no cash receipt.
        await u.client.query(
          `UPDATE employees.payroll_recovery SET state='settled',settled_at=clock_timestamp() WHERE company_id=$1 AND employee_id=$2 AND month=$3 AND state='reserved'`,
          [company, input.employeeId, input.month + '-01'],
        );
        const effects =
          p.calculation.recoveryThisPeriod === '0'
            ? []
            : [
                {
                  family: 'employee' as const,
                  kind: 'recovery' as const,
                  subjectId: input.employeeId,
                  amountMinor: String(-minor(p.calculation.recoveryThisPeriod)),
                  branchId: p.branchId,
                  effectiveDate: input.month + '-01',
                  supersedesId: null,
                  reason: 'Payroll recovery; originals retained in period allocations',
                },
              ];
        let movementId: string | null = null;
        if (input.type === 'payroll.payout')
          movementId = (
            await accounts.post({
              sourceId: source.id,
              recordId,
              fields: fields(input.funding, amount),
              direction: 'withdrawal',
              sourceKind: 'salary_payout',
              reason: 'صافي راتب ' + input.month,
              additionalEffects: effects,
            })
          ).id;
        else if (effects.length) await posting.append(source.id, recordId, effects);
        await hooks.fault?.('cash');
        const f = input.type === 'payroll.payout' ? input.funding : null;
        await u.client.query(
          `INSERT INTO employees.salary_payment(company_id,id,employee_id,month,command_id,command_record_id,source_id,amount_minor,actual_date,account_id,method,movement_id,reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            company,
            id,
            input.employeeId,
            input.month + '-01',
            input.commandId,
            recordId,
            source.id,
            amount,
            f?.actualDate ?? now.today,
            f?.accountId ?? null,
            f?.method ?? null,
            movementId,
            f?.reference ?? '',
          ],
        );
        await u.client.query(
          'UPDATE employees.payroll_period SET state=$4,version=version+1 WHERE company_id=$1 AND employee_id=$2 AND month=$3',
          [
            company,
            input.employeeId,
            input.month + '-01',
            amount === '0' ? 'zero_net_closed' : 'paid',
          ],
        );
      }
      const result: PayrollResult = {
        commandId: input.commandId,
        employeeId: input.employeeId,
        month: input.month,
        recordId: id,
        kind: input.type,
        amountMinor: amount,
      };
      await hooks.fault?.('result');
      await u.client.query(
        'INSERT INTO employees.payroll_outcome(company_id,command_record_id,result) VALUES($1,$2,$3)',
        [company, recordId, JSON.stringify(result)],
      );
      const finalVersion = (
        await u.client.query<{ version: number }>(
          'SELECT version FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2 AND month=$3',
          [company, input.employeeId, input.month + '-01'],
        )
      ).rows[0]!.version;
      return {
        reply: { status: 200, body: result },
        reference: {
          recordId,
          employeeId: input.employeeId,
          branchIds: [
            ...new Set([
              p.branchId,
              ...p.earnings.map((e) => e.branchId),
              ...p.obligations.map((o) => o.branchId),
              ...('funding' in input ? [input.funding.branchId] : []),
            ]),
          ],
        },
        entityId: input.employeeId,
        beforeVersion: p.version,
        afterVersion: finalVersion,
      };
    },
  }));
  return new CommandService(pool, definitions);
}
