import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  AccessError,
  addCalendarDays,
  addMinor,
  minor,
  periodStart,
  planStorageAllocations,
  planStorageRefundSources,
  revisionFor,
  stopBoundary,
  subtractMinor,
} from '@shahn/domain';
import {
  bumpStorageCreditVersion,
  insertStorageAllocations,
  readStorageAgreement,
  readStorageLots,
  readStoragePeriods,
  readStorageRevisions,
  type StorageAgreementRow,
  type StorageLotRow,
  type StoragePeriodRow,
} from '@shahn/database';
import {
  validateStoragePaymentCommand,
  validateStorageRefundCommand,
  validateStorageStopCommand,
  type PaymentFields,
  type StorageAccountView,
  type StorageAllocationPlanItem,
  type StoragePaymentCommand,
  type StoragePaymentPreview,
  type StoragePaymentResult,
  type StoragePaymentScope,
  type StorageRefundCommand,
  type StorageRefundPreview,
  type StorageRefundResult,
  type StorageRefundScope,
  type StorageRefundSourceView,
  type StorageStopCommand,
  type StorageStopPreview,
  type StorageStopResult,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { JournalPosting } from '../kernel/journals.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { AccountFundsService } from '../finance/accounts/service.js';
import {
  agreementSummary,
  creditOf,
  currentPeriodIndex,
  lockAgreement,
  lockCredit,
} from './agreements.js';
import { databaseStorageClock, type StorageClock } from './clock.js';

export const storagePaymentFamily = 'storage.payments';
export const storageRefundFamily = 'storage.refunds';
export const storageAgreementFamily = 'storage.agreements';
export type StorageFaultStage = 'movement' | 'receipt' | 'allocation' | 'refund' | 'result';
export interface StorageHooks {
  /** Test-only seams inside the single posting transaction; production passes none. */
  fault?: (stage: StorageFaultStage) => Promise<void>;
  afterCreditLock?: (u: UnitOfWork, kind: 'payment' | 'refund') => Promise<void>;
}
function rejection(code: string, details: Record<string, unknown>) {
  return Object.assign(new AccessError(code, 409), { details });
}
const fieldsOf = (input: StoragePaymentScope | StorageRefundScope): PaymentFields => ({
  accountId: input.accountId,
  branchId: input.branchId,
  currency: 'EGP',
  amountMinor: input.amountMinor,
  actualDate: input.actualDate,
  method: input.method,
});
const total = (values: readonly string[]) =>
  values.reduce((t, v) => addMinor(t, minor(v, 'nonnegative')), 0n);
const ACCOUNT_BLOCKERS = ['ACCOUNT_USAGE_FORBIDDEN', 'ACCOUNT_INACTIVE', 'METHOD_ACCOUNT_MISMATCH'];
/** Deterministic oldest-due plan over the locked current state; the new lot joins in date/ID order. */
function planPayment(
  periods: readonly StoragePeriodRow[],
  lots: readonly StorageLotRow[],
  incoming: { id: string; actualDate: string; amountMinor: string } | null,
) {
  const open = periods.filter((p) => p.outstandingMinor !== '0');
  const plan = planStorageAllocations(
    open.map((p) => ({ id: p.id, dueDate: p.startDate, outstandingMinor: p.outstandingMinor })),
    [
      ...lots
        .filter((l) => l.unallocatedMinor !== '0')
        .map((l) => ({ id: l.id, actualDate: l.actualDate, unallocatedMinor: l.unallocatedMinor })),
      ...(incoming
        ? [
            {
              id: incoming.id,
              actualDate: incoming.actualDate,
              unallocatedMinor: incoming.amountMinor,
            },
          ]
        : []),
    ],
  );
  const items: StorageAllocationPlanItem[] = [];
  for (const p of open) {
    const amount = plan.allocations
      .filter((a) => a.periodId === p.id)
      .reduce((t, a) => addMinor(t, BigInt(a.amountMinor)), 0n);
    if (amount === 0n) continue;
    items.push({
      periodId: p.id,
      periodIndex: p.periodIndex,
      startDate: p.startDate,
      endDate: addCalendarDays(p.nextStartDate, -1),
      dueDate: p.startDate,
      outstandingBeforeMinor: p.outstandingMinor,
      amountMinor: amount.toString(),
      outstandingAfterMinor: plan.outstandingAfter[p.id]!,
    });
  }
  return { plan, items };
}
async function accountView(
  accounts: AccountFundsService,
  accountId: string,
  blockers: string[],
): Promise<StorageAccountView> {
  const account = await accounts.read(accountId);
  let available = minor(account.balanceMinor, 'nonnegative');
  try {
    available = await accounts.available(accountId);
  } catch (e) {
    if (!(e instanceof AccessError) || e.code !== 'ACCOUNT_RECONCILIATION_REQUIRED') throw e;
    blockers.push('ACCOUNT_RECONCILIATION_REQUIRED');
  }
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    active: account.active,
    availableMinor: available.toString(),
  };
}
async function storedResult<T>(
  u: UnitOfWork,
  table: 'receipt' | 'refund' | 'stop_record',
  id: unknown,
): Promise<T> {
  const row = (
    await u.client.query<{ result: T }>(
      `SELECT result FROM storage.${table} WHERE company_id=$1 AND id=$2`,
      [u.access.companyId, String(id)],
    )
  ).rows[0];
  if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
  return row.result;
}
async function agreementByBrand(u: UnitOfWork, brandId: string): Promise<StorageAgreementRow> {
  const row = await readStorageAgreement(u.client, u.access.companyId, { brandId });
  if (!row) {
    const brand = await u.client.query(
      `SELECT 1 FROM commercial.brand WHERE company_id=$1 AND id=$2`,
      [u.access.companyId, brandId],
    );
    if (!brand.rowCount) throw new AccessError('NOT_FOUND', 404);
    throw rejection('STORAGE_AGREEMENT_REQUIRED', {});
  }
  return row;
}
export class StorageService {
  constructor(
    readonly pool: Pool,
    readonly clock: StorageClock = databaseStorageClock,
    readonly hooks: StorageHooks = {},
  ) {}
  private paymentCommands() {
    const { clock, hooks } = this;
    const definition: CommandDefinition<StoragePaymentCommand> = {
      family: storagePaymentFamily,
      kind: 'storage.payment.record',
      capability: 'storage',
      authorize: async (u, value, recovery) => {
        if (!recovery && !validateStoragePaymentCommand(value))
          throw new AccessError('VALIDATION_FAILED', 400);
        const branch = (value as { branchId?: unknown }).branchId;
        if (typeof branch !== 'string') throw new AccessError('FORBIDDEN_SCOPE');
        // Receiving (or recovering a receipt at) a branch requires current assignment to it.
        u.assertBranch(branch);
      },
      rejectionReference: (input) => ({
        entityId: input.brandId,
        branchId: input.branchId,
        brandId: input.brandId,
      }),
      resolve: (u, reference) => storedResult(u, 'receipt', reference.receiptId),
      execute: async (u, input, recordId) => {
        const c = u.client,
          company = u.access.companyId,
          today = await clock.today(c);
        if (input.actualDate > today) throw rejection('FUTURE_PAYMENT_DATE', { today });
        const amount = minor(input.amountMinor, 'positive');
        const receiptId = randomUUID(),
          posting = new JournalPosting(u);
        // Lock order: command → receipt source → agreement → storage credit → account → effects.
        const source = await posting.source(
          { system: 'storage-payment', identity: receiptId, kind: 'receipt', revision: '1' },
          {
            brandId: input.brandId,
            branchId: input.branchId,
            accountId: input.accountId,
            method: input.method,
            amountMinor: amount.toString(),
            actualDate: input.actualDate,
            externalReference: input.externalReference ?? '',
          },
        );
        const found = await agreementByBrand(u, input.brandId);
        const agreement = await lockAgreement(u, found.id);
        const versionBefore = await lockCredit(u, input.brandId);
        await hooks.afterCreditLock?.(u, 'payment');
        if (versionBefore !== input.expectedCreditVersion)
          throw rejection('STORAGE_CREDIT_CHANGED', {
            creditVersion: versionBefore,
            agreementVersion: agreement.version,
          });
        const accounts = new AccountFundsService(u);
        await accounts.lock([input.accountId]);
        const fields = fieldsOf(input),
          account = await accounts.use(fields);
        const periods = await readStoragePeriods(c, company, input.brandId),
          lots = await readStorageLots(c, company, input.brandId);
        const { plan, items } = planPayment(periods, lots, {
          id: receiptId,
          actualDate: input.actualDate,
          amountMinor: amount.toString(),
        });
        const reference = (
          await c.query<{ reference: string }>(
            `SELECT nextval('storage.receipt_reference_seq')::text AS reference`,
          )
        ).rows[0]!.reference;
        const allocated = BigInt(plan.totalMinor),
          movementId = randomUUID();
        // One posting batch: actual account credit, equal storage-credit receipt and (when dues
        // exist) one allocation effect. No revenue and no brand payout wallet effect.
        await accounts.post({
          sourceId: source.id,
          recordId,
          movementId,
          fields,
          direction: 'deposit',
          sourceKind: 'storage_receipt',
          reason: `تحصيل اشتراك تخزين ${agreement.brandName} رقم ${reference}`,
          additionalEffects: [
            {
              family: 'storage',
              kind: 'receipt',
              subjectId: input.brandId,
              amountMinor: amount.toString(),
              branchId: input.branchId,
              effectiveDate: input.actualDate,
              supersedesId: null,
              reason: null,
            },
            ...(allocated > 0n
              ? [
                  {
                    family: 'storage' as const,
                    kind: 'allocation' as const,
                    subjectId: input.brandId,
                    amountMinor: (-allocated).toString(),
                    branchId: input.branchId,
                    effectiveDate: today,
                    supersedesId: null,
                    reason: null,
                  },
                ]
              : []),
          ],
        });
        await hooks.fault?.('movement');
        const effects = (
          await c.query<{ id: string; kind: string }>(
            `SELECT id,kind FROM kernel.journal_effect WHERE company_id=$1 AND source_id=$2 AND family='storage'`,
            [company, source.id],
          )
        ).rows;
        const lotsAfter = lots.map((l) => l.unallocatedMinor);
        const outstandingAfter = subtractMinor(
          total(periods.map((p) => p.outstandingMinor)),
          allocated,
        );
        const unallocatedAfter = subtractMinor(addMinor(total(lotsAfter), amount), allocated);
        const result: StoragePaymentResult = {
          commandId: input.commandId,
          receiptId,
          reference,
          agreementId: agreement.id,
          brandId: input.brandId,
          amountMinor: amount.toString(),
          actualDate: input.actualDate,
          movementId,
          allocations: items,
          allocatedMinor: allocated.toString(),
          outstandingAfterMinor: outstandingAfter.toString(),
          unallocatedCreditAfterMinor: unallocatedAfter.toString(),
        };
        await c.query(
          `INSERT INTO storage.receipt(company_id,id,reference,brand_id,agreement_id,amount_minor,actual_date,method,account_id,account_name,
           branch_id,branch_name,external_reference,source_id,command_record_id,movement_id,credit_effect_id,credit_version_before,result,actor_id,actor_name)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
          [
            company,
            receiptId,
            reference,
            input.brandId,
            agreement.id,
            amount.toString(),
            input.actualDate,
            input.method,
            input.accountId,
            account.name,
            input.branchId,
            u.access.assignedBranches.find((b) => b.id === input.branchId)!.name,
            input.externalReference?.trim() ?? '',
            source.id,
            recordId,
            movementId,
            effects.find((e) => e.kind === 'receipt')!.id,
            versionBefore,
            JSON.stringify(result),
            u.access.principalId,
            u.access.displayName,
          ],
        );
        await hooks.fault?.('receipt');
        if (allocated > 0n)
          await insertStorageAllocations(c, company, input.brandId, {
            sourceId: source.id,
            effectId: effects.find((e) => e.kind === 'allocation')!.id,
            triggerKind: 'payment',
            allocations: plan.allocations.map((a) => ({ ...a, id: randomUUID() })),
          });
        await hooks.fault?.('allocation');
        await bumpStorageCreditVersion(c, company, input.brandId);
        await hooks.fault?.('result');
        return {
          reply: { status: 200, body: result },
          reference: { receiptId, brandId: input.brandId, branchId: input.branchId },
          entityId: receiptId,
          beforeVersion: versionBefore,
          afterVersion: versionBefore + 1,
        };
      },
    };
    return new CommandService(this.pool, [definition]);
  }
  private refundCommands() {
    const { clock, hooks } = this;
    const definition: CommandDefinition<StorageRefundCommand> = {
      family: storageRefundFamily,
      kind: 'storage.credit.refund',
      capability: 'storage',
      authorize: async (u, value, recovery) => {
        if (!recovery && !validateStorageRefundCommand(value))
          throw new AccessError('VALIDATION_FAILED', 400);
        const branch = (value as { branchId?: unknown }).branchId;
        if (typeof branch !== 'string') throw new AccessError('FORBIDDEN_SCOPE');
        u.assertBranch(branch);
      },
      rejectionReference: (input) => ({
        entityId: input.brandId,
        branchId: input.branchId,
        brandId: input.brandId,
      }),
      resolve: (u, reference) => storedResult(u, 'refund', reference.refundId),
      execute: async (u, input, recordId) => {
        const c = u.client,
          company = u.access.companyId,
          today = await clock.today(c);
        if (input.actualDate > today) throw rejection('FUTURE_PAYMENT_DATE', { today });
        const amount = minor(input.amountMinor, 'positive');
        const refundId = randomUUID(),
          posting = new JournalPosting(u);
        const source = await posting.source(
          { system: 'storage-refund', identity: refundId, kind: 'refund', revision: '1' },
          {
            brandId: input.brandId,
            branchId: input.branchId,
            accountId: input.accountId,
            method: input.method,
            amountMinor: amount.toString(),
            actualDate: input.actualDate,
            reason: input.reason.trim(),
            externalReference: input.externalReference ?? '',
          },
        );
        const found = await agreementByBrand(u, input.brandId);
        const agreement = await lockAgreement(u, found.id);
        const versionBefore = await lockCredit(u, input.brandId);
        await hooks.afterCreditLock?.(u, 'refund');
        if (versionBefore !== input.expectedCreditVersion)
          throw rejection('STORAGE_CREDIT_CHANGED', {
            creditVersion: versionBefore,
            agreementVersion: agreement.version,
          });
        const accounts = new AccountFundsService(u);
        await accounts.lock([input.accountId]);
        const fields = fieldsOf(input),
          account = await accounts.use(fields);
        // Recheck credit and funds under the same locks as every competing storage writer.
        const lots = await readStorageLots(c, company, input.brandId),
          credit = creditOf(lots),
          unallocated = BigInt(credit.unallocatedMinor);
        if (amount > unallocated)
          throw rejection(
            amount <= unallocated + BigInt(credit.allocatedMinor)
              ? 'STORAGE_CREDIT_ALLOCATED'
              : 'INSUFFICIENT_STORAGE_CREDIT',
            { unallocatedMinor: credit.unallocatedMinor, allocatedMinor: credit.allocatedMinor },
          );
        const available = await accounts.available(input.accountId);
        if (available < amount)
          throw rejection('INSUFFICIENT_FUNDS', { availableMinor: available.toString() });
        const plan = planStorageRefundSources(
          lots.map((l) => ({
            id: l.id,
            actualDate: l.actualDate,
            unallocatedMinor: l.unallocatedMinor,
          })),
          amount.toString(),
        );
        const sources: StorageRefundSourceView[] = plan.map((s) => {
          const lot = lots.find((l) => l.id === s.receiptId)!;
          return {
            receiptId: s.receiptId,
            receiptReference: lot.reference,
            receiptActualDate: lot.actualDate,
            amountMinor: s.amountMinor,
          };
        });
        const reference = (
          await c.query<{ reference: string }>(
            `SELECT nextval('storage.refund_reference_seq')::text AS reference`,
          )
        ).rows[0]!.reference;
        const movementId = randomUUID();
        // Actual cash-out plus the storage-credit refund; no revenue reversal, no wallet payout.
        await accounts.post({
          sourceId: source.id,
          recordId,
          movementId,
          fields,
          direction: 'withdrawal',
          sourceKind: 'storage_refund',
          reason: `استرداد رصيد تخزين ${agreement.brandName} رقم ${reference}`,
          additionalEffects: [
            {
              family: 'storage',
              kind: 'refund',
              subjectId: input.brandId,
              amountMinor: (-amount).toString(),
              branchId: input.branchId,
              effectiveDate: input.actualDate,
              supersedesId: null,
              reason: input.reason.trim(),
            },
          ],
        });
        await hooks.fault?.('movement');
        const effectId = (
          await c.query<{ id: string }>(
            `SELECT id FROM kernel.journal_effect WHERE company_id=$1 AND source_id=$2 AND family='storage' AND kind='refund'`,
            [company, source.id],
          )
        ).rows[0]!.id;
        const after = unallocated - amount;
        const result: StorageRefundResult = {
          commandId: input.commandId,
          refundId,
          reference,
          agreementId: agreement.id,
          brandId: input.brandId,
          amountMinor: amount.toString(),
          actualDate: input.actualDate,
          movementId,
          sources,
          unallocatedCreditAfterMinor: after.toString(),
        };
        await c.query(
          `INSERT INTO storage.refund(company_id,id,reference,brand_id,agreement_id,amount_minor,actual_date,method,account_id,account_name,
           branch_id,branch_name,reason,external_reference,cash_out_confirmed,unallocated_before_minor,unallocated_after_minor,source_id,
           command_record_id,movement_id,refund_effect_id,credit_version_before,result,actor_id,actor_name)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
          [
            company,
            refundId,
            reference,
            input.brandId,
            agreement.id,
            amount.toString(),
            input.actualDate,
            input.method,
            input.accountId,
            account.name,
            input.branchId,
            u.access.assignedBranches.find((b) => b.id === input.branchId)!.name,
            input.reason.trim(),
            input.externalReference?.trim() ?? '',
            unallocated.toString(),
            after.toString(),
            source.id,
            recordId,
            movementId,
            effectId,
            versionBefore,
            JSON.stringify(result),
            u.access.principalId,
            u.access.displayName,
          ],
        );
        for (const s of plan)
          await c.query(
            `INSERT INTO storage.refund_source(company_id,refund_id,receipt_id,brand_id,amount_minor) VALUES($1,$2,$3,$4,$5)`,
            [company, refundId, s.receiptId, input.brandId, s.amountMinor],
          );
        await hooks.fault?.('refund');
        await bumpStorageCreditVersion(c, company, input.brandId);
        await hooks.fault?.('result');
        return {
          reply: { status: 200, body: result },
          reference: { refundId, brandId: input.brandId, branchId: input.branchId },
          entityId: refundId,
          beforeVersion: versionBefore,
          afterVersion: versionBefore + 1,
        };
      },
    };
    return new CommandService(this.pool, [definition]);
  }
  private stopCommands() {
    const { clock } = this;
    const definition: CommandDefinition<StorageStopCommand> = {
      family: storageAgreementFamily,
      kind: 'storage.agreement.stop',
      capability: 'storage',
      authorize: async (u, value, recovery) => {
        if (!recovery) {
          if (!validateStorageStopCommand(value)) throw new AccessError('VALIDATION_FAILED', 400);
          return;
        }
        const branch = (value as { branchId?: unknown }).branchId;
        if (typeof branch !== 'string') throw new AccessError('FORBIDDEN_SCOPE');
        u.assertBranch(branch);
      },
      rejectionReference: async (input, u) => {
        const row = await readStorageAgreement(u.client, u.access.companyId, {
          id: input.agreementId,
        });
        const terms = row
          ? revisionFor(
              await readStorageRevisions(u.client, u.access.companyId, row.id),
              currentPeriodIndex(row, await clock.today(u.client)),
            )
          : null;
        return { entityId: input.agreementId, branchId: terms?.branchId ?? input.companyId };
      },
      resolve: (u, reference) => storedResult(u, 'stop_record', reference.stopId),
      execute: async (u, input, recordId) => {
        const c = u.client,
          company = u.access.companyId,
          today = await clock.today(c);
        const agreement = await lockAgreement(u, input.agreementId);
        const terms = revisionFor(
          await readStorageRevisions(c, company, agreement.id),
          currentPeriodIndex(agreement, today),
        );
        // Stopping changes the revenue branch's agreement: require current assignment to it.
        u.assertBranch(terms.branchId);
        if (agreement.version !== input.expectedVersion)
          throw new AccessError('REVISION_CONFLICT', 409, agreement.version);
        if (agreement.state === 'stopped') throw rejection('STORAGE_ALREADY_STOPPED', {});
        // Never cut off an already generated period, even with a controlled clock.
        let boundary = stopBoundary(agreement.startDate, agreement.anchorDay, today);
        if (agreement.lastIndex !== null) {
          const generatedEnd = periodStart(
            agreement.startDate,
            agreement.anchorDay,
            agreement.lastIndex + 1,
          );
          if (generatedEnd > boundary) boundary = generatedEnd;
        }
        await c.query(
          `UPDATE storage.agreement SET state='stopped',stop_boundary=$3,version=version+1 WHERE company_id=$1 AND id=$2`,
          [company, agreement.id, boundary],
        );
        const stopId = randomUUID(),
          summary = await agreementSummary(
            u,
            (await readStorageAgreement(c, company, { id: agreement.id }))!,
            today,
          );
        const result: StorageStopResult = {
          commandId: input.commandId,
          agreementId: agreement.id,
          brandId: agreement.brandId,
          stopBoundary: boundary,
          lastServiceDate: addCalendarDays(boundary, -1),
          version: agreement.version + 1,
          outstandingMinor: summary.charges.outstandingMinor,
          unallocatedCreditMinor: summary.credit.unallocatedMinor,
        };
        await c.query(
          `INSERT INTO storage.stop_record(company_id,id,agreement_id,brand_id,stop_boundary,requested_on,reason,version_before,command_record_id,result,actor_id,actor_name)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            company,
            stopId,
            agreement.id,
            agreement.brandId,
            boundary,
            today,
            input.reason?.trim() ?? '',
            agreement.version,
            recordId,
            JSON.stringify(result),
            u.access.principalId,
            u.access.displayName,
          ],
        );
        return {
          reply: { status: 200, body: result },
          reference: { stopId, agreementId: agreement.id, branchId: terms.branchId },
          entityId: agreement.id,
          beforeVersion: agreement.version,
          afterVersion: agreement.version + 1,
        };
      },
    };
    return new CommandService(this.pool, [definition]);
  }
  recordPayment(token: string, input: StoragePaymentCommand) {
    if (!validateStoragePaymentCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
    return this.paymentCommands().execute(token, input);
  }
  recoverPayment(token: string, companyId: string, commandId: string) {
    return this.paymentCommands().recover(token, companyId, storagePaymentFamily, commandId);
  }
  refund(token: string, input: StorageRefundCommand) {
    if (!validateStorageRefundCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
    return this.refundCommands().execute(token, input);
  }
  recoverRefund(token: string, companyId: string, commandId: string) {
    return this.refundCommands().recover(token, companyId, storageRefundFamily, commandId);
  }
  stop(token: string, input: StorageStopCommand) {
    if (!validateStorageStopCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
    return this.stopCommands().execute(token, input);
  }
  recoverStop(token: string, companyId: string, commandId: string) {
    return this.stopCommands().recover(token, companyId, storageAgreementFamily, commandId);
  }
  /** Locked read under the same locks as the payment; no journal, money or command effect. */
  paymentPreview(token: string, input: StoragePaymentScope): Promise<StoragePaymentPreview> {
    return UnitOfWork.run(this.pool, token, input.companyId, 'storage', async (u) => {
      u.assertBranch(input.branchId);
      const c = u.client,
        company = u.access.companyId,
        today = await this.clock.today(c),
        amount = minor(input.amountMinor, 'positive');
      const found = await agreementByBrand(u, input.brandId).catch((e: unknown) => {
        if (e instanceof AccessError && e.code === 'STORAGE_AGREEMENT_REQUIRED')
          throw new AccessError('STORAGE_AGREEMENT_REQUIRED', 409);
        throw e;
      });
      const agreement = await lockAgreement(u, found.id),
        creditVersion = await lockCredit(u, input.brandId);
      const accounts = new AccountFundsService(u);
      await accounts.lock([input.accountId]);
      const blockers: StoragePaymentPreview['blockers'] = [];
      try {
        await accounts.use(fieldsOf(input));
      } catch (e) {
        if (e instanceof AccessError && ACCOUNT_BLOCKERS.includes(e.code))
          blockers.push(e.code as StoragePaymentPreview['blockers'][number]);
        else throw e;
      }
      const account = await accountView(accounts, input.accountId, blockers as string[]);
      if (input.actualDate > today) blockers.push('FUTURE_PAYMENT_DATE');
      const periods = await readStoragePeriods(c, company, input.brandId),
        lots = await readStorageLots(c, company, input.brandId);
      const { plan, items } = planPayment(periods, lots, {
        id: 'ffffffff-ffff-4fff-bfff-ffffffffffff',
        actualDate: input.actualDate,
        amountMinor: amount.toString(),
      });
      const outstanding = total(periods.map((p) => p.outstandingMinor)),
        unallocated = total(lots.map((l) => l.unallocatedMinor)),
        allocated = BigInt(plan.totalMinor);
      return {
        agreement: await agreementSummary(u, agreement, today),
        account,
        amountMinor: amount.toString(),
        blockers,
        allocations: items,
        allocatedMinor: allocated.toString(),
        outstandingBeforeMinor: outstanding.toString(),
        outstandingAfterMinor: (outstanding - allocated).toString(),
        unallocatedBeforeMinor: unallocated.toString(),
        unallocatedAfterMinor: (unallocated + amount - allocated).toString(),
        creditVersion,
        today,
      };
    });
  }
  refundPreview(token: string, input: StorageRefundScope): Promise<StorageRefundPreview> {
    return UnitOfWork.run(this.pool, token, input.companyId, 'storage', async (u) => {
      u.assertBranch(input.branchId);
      const c = u.client,
        company = u.access.companyId,
        today = await this.clock.today(c),
        amount = minor(input.amountMinor, 'positive');
      const found = await agreementByBrand(u, input.brandId).catch((e: unknown) => {
        if (e instanceof AccessError && e.code === 'STORAGE_AGREEMENT_REQUIRED')
          throw new AccessError('STORAGE_AGREEMENT_REQUIRED', 409);
        throw e;
      });
      const agreement = await lockAgreement(u, found.id),
        creditVersion = await lockCredit(u, input.brandId);
      const accounts = new AccountFundsService(u);
      await accounts.lock([input.accountId]);
      const blockers: StorageRefundPreview['blockers'] = [];
      try {
        await accounts.use(fieldsOf(input));
      } catch (e) {
        if (e instanceof AccessError && ACCOUNT_BLOCKERS.includes(e.code))
          blockers.push(e.code as StorageRefundPreview['blockers'][number]);
        else throw e;
      }
      const account = await accountView(accounts, input.accountId, blockers as string[]);
      if (input.actualDate > today) blockers.push('FUTURE_PAYMENT_DATE');
      const lots = await readStorageLots(c, company, input.brandId),
        credit = creditOf(lots),
        unallocated = BigInt(credit.unallocatedMinor);
      let sources: StorageRefundSourceView[] = [];
      if (amount > unallocated)
        blockers.push(
          amount <= unallocated + BigInt(credit.allocatedMinor)
            ? 'STORAGE_CREDIT_ALLOCATED'
            : 'INSUFFICIENT_STORAGE_CREDIT',
        );
      else
        sources = planStorageRefundSources(
          lots.map((l) => ({
            id: l.id,
            actualDate: l.actualDate,
            unallocatedMinor: l.unallocatedMinor,
          })),
          amount.toString(),
        ).map((s) => {
          const lot = lots.find((l) => l.id === s.receiptId)!;
          return {
            receiptId: s.receiptId,
            receiptReference: lot.reference,
            receiptActualDate: lot.actualDate,
            amountMinor: s.amountMinor,
          };
        });
      if (BigInt(account.availableMinor) < amount) blockers.push('INSUFFICIENT_FUNDS');
      return {
        agreement: await agreementSummary(u, agreement, today),
        account,
        amountMinor: amount.toString(),
        blockers,
        sources,
        unallocatedBeforeMinor: unallocated.toString(),
        unallocatedAfterMinor: amount <= unallocated ? (unallocated - amount).toString() : null,
        allocatedMinor: credit.allocatedMinor,
        creditVersion,
        today,
      };
    });
  }
  stopPreview(token: string, companyId: string, agreementId: string): Promise<StorageStopPreview> {
    return UnitOfWork.run(this.pool, token, companyId, 'storage', async (u) => {
      const today = await this.clock.today(u.client),
        agreement = await lockAgreement(u, agreementId);
      let boundary =
        agreement.stopBoundary ?? stopBoundary(agreement.startDate, agreement.anchorDay, today);
      if (!agreement.stopBoundary && agreement.lastIndex !== null) {
        const generatedEnd = periodStart(
          agreement.startDate,
          agreement.anchorDay,
          agreement.lastIndex + 1,
        );
        if (generatedEnd > boundary) boundary = generatedEnd;
      }
      const firstBillable = periodStart(
        agreement.startDate,
        agreement.anchorDay,
        agreement.firstBillableIndex,
      );
      return {
        agreement: await agreementSummary(u, agreement, today),
        stopBoundary: boundary,
        lastServiceDate: addCalendarDays(boundary, -1),
        generatesNoPeriod: agreement.lastIndex === null && boundary <= firstBillable,
        today,
      };
    });
  }
}
