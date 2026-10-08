import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { minor } from '@shahn/domain';
import type {
  SettlementOperation,
  StorageRefundCommand,
  StorageRefundPreview,
  StorageRefundResult,
} from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { StorageService } from '../../storage/service.js';
import { databaseStorageClock, type StorageClock } from '../../storage/clock.js';
import { branchName, type PreviewBody, type Resolver } from '../framework.js';

type Refund = Extract<SettlementOperation, { operation: 'storage.refund' }>;
const scope = (u: UnitOfWork, op: Refund) => ({
  companyId: u.access.companyId,
  brandId: op.brandId,
  branchId: op.branchId,
  accountId: op.accountId,
  method: op.method,
  amountMinor: op.amountMinor,
  actualDate: op.actualDate,
});
function body(u: UnitOfWork, op: Refund, p: StorageRefundPreview): PreviewBody {
  const amount = minor(op.amountMinor, 'positive');
  const available = minor(p.account.availableMinor, 'nonnegative');
  return {
    operation: 'storage.refund',
    classification: 'storage_credit_refund',
    target: {
      kind: 'storage',
      id: op.brandId,
      label: p.agreement.brandName,
      branchId: op.branchId,
      branchName: branchName(u, op.branchId),
    },
    facts: [
      {
        key: 'unallocatedStorageCredit',
        unit: 'minor',
        before: p.unallocatedBeforeMinor,
        after: p.unallocatedAfterMinor,
      },
      {
        key: 'allocatedStorageCredit',
        unit: 'minor',
        before: p.allocatedMinor,
        after: p.allocatedMinor,
      },
      {
        key: 'availableFunds',
        unit: 'minor',
        before: available.toString(),
        after: (available > amount ? available - amount : 0n).toString(),
      },
      { key: 'earnedStorageRevenue', unit: 'text', before: 'unchanged', after: 'unchanged' },
    ],
    effects: [
      {
        ledger: 'money',
        kind: 'payment',
        label: p.account.name,
        amountMinor: '-' + op.amountMinor,
        quantity: null,
        effectiveDate: op.actualDate,
      },
      {
        ledger: 'storage',
        kind: 'refund',
        label: 'استرداد من رصيد التخزين غير المخصص فقط',
        amountMinor: '-' + op.amountMinor,
        quantity: null,
        effectiveDate: op.actualDate,
      },
    ],
    dependents: p.sources.map((s) => ({
      kind: 'storage_receipt',
      id: s.receiptId,
      label: `إيصال ${s.receiptReference} · ${s.amountMinor}`,
      state: 'refund_source',
    })),
    warnings: ['STORAGE_CREDIT_SEPARATE_FROM_BRAND_WALLET'],
    blockers: [...p.blockers],
    versions: [{ key: 'storage.credit', version: String(p.creditVersion) }],
  };
}
/**
 * Storage target delegates to P19's own refund (ERP-D-204/205): unallocated credit only, actual
 * cash-out assertion, funds/credit lock and oldest-receipt sources. Allocated money first needs a
 * justified linked charge/allocation correction, which is not offered here.
 */
export function storageRefundResolver(
  pool: Pool,
  clock: StorageClock = databaseStorageClock,
): Resolver<Refund> {
  return {
    operation: 'storage.refund',
    targetKind: 'storage',
    capabilities: ['storage'],
    allowedStates: 'A brand storage agreement with unallocated advance/partial credit.',
    forbidden: [
      'refund of credit already allocated to an earned period — STORAGE_CREDIT_ALLOCATED',
      'revenue reversal or brand-wallet payout — none is posted',
      'stop treated as refund — stop is a separate P19 action',
      'competing allocation or refund — STORAGE_CREDIT_CHANGED',
    ],
    matches: (op): op is Refund => op.operation === 'storage.refund',
    branchOf: async (_u, op) => op.branchId,
    preview: async (u, op) =>
      body(u, op, await new StorageService(pool, clock).refundPreviewIn(u, scope(u, op))),
    confirm: async (u, op, ctx) => {
      const reviewed = ctx.expectedVersions.find((v) => v.key === 'storage.credit')?.version ?? '0';
      const input: StorageRefundCommand = {
        ...scope(u, op),
        schemaVersion: 1,
        type: 'storage.credit.refund',
        commandId: randomUUID(),
        reason: ctx.reason,
        ...(op.externalReference ? { externalReference: op.externalReference } : {}),
        expectedCreditVersion: Number(reviewed),
        confirmCashOut: true,
      };
      // Verify inside P19's own lock sequence (agreement → credit), before its account/effects.
      const delegate = new StorageService(pool, clock, {
        afterCreditLock: async (inner, kind) => {
          if (kind !== 'refund') return;
          const preview = await ctx.verify(
            body(
              inner,
              op,
              await new StorageService(pool, clock).refundPreviewIn(inner, scope(inner, op)),
            ),
          );
          await ctx.record({
            classification: preview.classification,
            amountMinor: op.amountMinor,
            quantity: null,
            sourceId: null,
          });
        },
      });
      const definition = delegate.refundDefinition();
      await definition.authorize(u, input, false);
      const reply = await definition.execute(u, input, ctx.recordId);
      await ctx.hooks.fault?.('effects');
      const result = reply.reply.body as StorageRefundResult;
      ctx.link('original', 'brand', op.brandId, 'اتفاق التخزين');
      ctx.link('result', 'storage_refund', result.refundId, 'استرداد رقم ' + result.reference);
      ctx.link('result', 'money_movement', result.movementId, 'صرف فعلي من الحساب');
      for (const s of result.sources)
        ctx.link('dependent', 'storage_receipt', s.receiptId, 'إيصال ' + s.receiptReference);
      return { state: 'resolved' };
    },
  };
}
