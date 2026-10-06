import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { readBrand } from '@shahn/database';
import { AccessError, minor, subtractMinor } from '@shahn/domain';
import {
  validateBrandPayoutCommand,
  type BrandPayoutCatalog,
  type BrandPayoutCommand,
  type BrandPayoutDetail,
  type BrandPayoutList,
  type BrandPayoutPreview,
  type BrandPayoutResult,
  type BrandPayoutScope,
  type BrandWalletAmounts,
  type PaymentFields,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../../kernel/commands.js';
import { JournalPosting } from '../../kernel/journals.js';
import { UnitOfWork } from '../../kernel/unit-of-work.js';
import { configurationLock } from '../../reference-data/service.js';
import { AccountFundsService } from '../accounts/service.js';
import { accountList } from '../service.js';
import { BrandWalletService, cairoToday, weekdayOf } from '../brand-wallet/wallet.service.js';

export const brandPayoutFamily = 'brand.payouts';
export type BrandPayoutStage = 'debit' | 'allocation' | 'payout' | 'result';
export type BrandPayoutHooks = {
  /** Test-only seams inside the single posting transaction; production passes none. */
  fault?: (stage: BrandPayoutStage) => Promise<void>;
  afterWalletLock?: (u: UnitOfWork, input: BrandPayoutCommand) => Promise<void>;
};
function rejection(
  code: string,
  details: { amounts?: BrandWalletAmounts; readinessRevision?: string; availableMinor?: string },
) {
  return Object.assign(new AccessError(code, 409), { details });
}
const fieldsOf = (input: BrandPayoutScope): PaymentFields => ({
  accountId: input.accountId,
  branchId: input.payingBranchId,
  currency: 'EGP',
  amountMinor: input.amountMinor,
  actualDate: input.actualDate,
  method: input.method,
});
async function payoutResult(u: UnitOfWork, payoutId: string): Promise<BrandPayoutResult> {
  const row = (
    await u.client.query<BrandPayoutResult & { payingBranchId: string }>(
      `SELECT c.command_id AS "commandId",p.id AS "payoutId",p.reference,p.brand_id AS "brandId",p.amount_minor::text AS "amountMinor",
       p.actual_date::text AS "actualDate",p.movement_id AS "movementId",p.eligible_after_minor::text AS "eligibleToPayAfterMinor",
       p.signed_after_minor::text AS "signedEntitlementAfterMinor",p.paying_branch_id AS "payingBranchId"
       FROM finance.brand_payout p JOIN command_record c ON c.id=p.command_record_id WHERE p.company_id=$1 AND p.id=$2`,
      [u.access.companyId, payoutId],
    )
  ).rows[0];
  if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
  const { payingBranchId: _branch, ...result } = row;
  return result;
}
/** Shared brand payout history is readable by the payout screen (ERP-D-161), never editable. */
export async function payoutDetail(u: UnitOfWork, payoutId: string): Promise<BrandPayoutDetail> {
  const row = (
    await u.client.query<
      Omit<BrandPayoutDetail, 'allocations' | 'reviews' | 'commandId' | 'recordedAt'> & {
        commandId: string;
        recordedAt: Date;
      }
    >(
      `SELECT c.command_id AS "commandId",p.id AS "payoutId",p.reference,p.brand_id AS "brandId",p.brand_name AS "brandName",
       p.amount_minor::text AS "amountMinor",p.actual_date::text AS "actualDate",p.movement_id AS "movementId",
       p.eligible_after_minor::text AS "eligibleToPayAfterMinor",p.signed_after_minor::text AS "signedEntitlementAfterMinor",
       p.eligible_before_minor::text AS "eligibleToPayBeforeMinor",p.paying_branch_id AS "payingBranchId",
       p.paying_branch_name AS "payingBranchName",p.account_id AS "accountId",p.account_name AS "accountName",p.method,
       p.recorded_at AS "recordedAt",p.external_reference AS "externalReference",p.weekday::int AS weekday,
       ARRAY(SELECT x::int FROM unnest(p.scheduled_weekdays) x ORDER BY x) AS "scheduledWeekdays",p.off_day AS "offDay",
       p.off_day_reason AS "offDayReason",p.actor_name AS "actorName"
       FROM finance.brand_payout p JOIN command_record c ON c.id=p.command_record_id WHERE p.company_id=$1 AND p.id=$2`,
      [u.access.companyId, payoutId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  const allocations = (
    await u.client.query<BrandPayoutDetail['allocations'][number]>(
      `SELECT x.lot_id AS "lotId",x.amount_minor::text AS "amountMinor",x.lot_kind AS "lotKind",x.source_branch_id AS "sourceBranchId",
       b.name AS "sourceBranchName",x.lot_effective_date::text AS "effectiveDate",
       (SELECT json_build_object('id',s.id,'reference',s.reference) FROM execution.allocation al
        JOIN execution.visit_fact v ON(v.company_id,v.id)=(al.company_id,al.visit_id)
        JOIN shipments.shipment s ON(s.company_id,s.id)=(v.company_id,v.shipment_id)
        WHERE al.company_id=x.company_id AND al.goods_effect_id=x.lot_id LIMIT 1) AS shipment
       FROM finance.payout_allocation x JOIN access.branch b ON(b.company_id,b.id)=(x.company_id,x.source_branch_id)
       WHERE x.company_id=$1 AND x.payout_id=$2 ORDER BY x.lot_effective_date,x.lot_id`,
      [u.access.companyId, payoutId],
    )
  ).rows;
  // A later accepted correction is linked to this payout through the consumed lot; the original
  // payout stays unchanged and the exposure is resolved only through P21 Settlements.
  const reviews = (
    await u.client.query<{
      id: string;
      state: 'open' | 'resolved';
      visitId: string;
      lotId: string;
      createdAt: Date;
    }>(
      `SELECT r.id,r.state,r.visit_id AS "visitId",x.lot_id AS "lotId",r.created_at AS "createdAt"
       FROM finance.payout_allocation x JOIN execution.allocation al ON al.company_id=x.company_id AND al.goods_effect_id=x.lot_id
       JOIN execution.settlement_review r ON(r.company_id,r.visit_id)=(al.company_id,al.visit_id)
       WHERE x.company_id=$1 AND x.payout_id=$2 AND r.basis->'previous'->>'goods_effect_id'=x.lot_id::text
       GROUP BY r.id,r.state,r.visit_id,x.lot_id,r.created_at ORDER BY r.created_at,r.id`,
      [u.access.companyId, payoutId],
    )
  ).rows;
  return {
    ...row,
    recordedAt: row.recordedAt.toISOString(),
    allocations,
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}
const PAGE = 25;
export async function payoutList(
  u: UnitOfWork,
  f: {
    brandId?: string;
    payingBranchId?: string;
    sourceBranchId?: string;
    method?: string;
    dateBasis?: string;
    from?: string;
    to?: string;
    search?: string;
    offDay?: string;
    page?: string;
  },
): Promise<BrandPayoutList> {
  const page = Number(f.page ?? 1),
    recorded = f.dateBasis === 'recorded';
  const rows = (
    await u.client.query<BrandPayoutList['items'][number] & { total: string; recordedAt: Date }>(
      `SELECT p.id AS "payoutId",p.reference,p.brand_id AS "brandId",p.brand_name AS "brandName",p.amount_minor::text AS "amountMinor",
       p.paying_branch_id AS "payingBranchId",p.paying_branch_name AS "payingBranchName",p.account_name AS "accountName",p.method,
       p.actual_date::text AS "actualDate",p.recorded_at AS "recordedAt",p.external_reference AS "externalReference",
       p.off_day AS "offDay",p.actor_name AS "actorName",count(*) OVER()::text AS total
       FROM finance.brand_payout p WHERE p.company_id=$1
       AND ($2::uuid IS NULL OR p.brand_id=$2) AND ($3::uuid IS NULL OR p.paying_branch_id=$3)
       AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM finance.payout_allocation x WHERE x.company_id=p.company_id AND x.payout_id=p.id AND x.source_branch_id=$4))
       AND ($5='all' OR p.method=$5)
       AND ($6::date IS NULL OR (CASE WHEN $8 THEN p.recorded_at>=($6::date::timestamp AT TIME ZONE 'Africa/Cairo') ELSE p.actual_date>=$6 END))
       AND ($7::date IS NULL OR (CASE WHEN $8 THEN p.recorded_at<(($7::date+1)::timestamp AT TIME ZONE 'Africa/Cairo') ELSE p.actual_date<=$7 END))
       AND ($9='' OR p.reference=$9 OR strpos(lower(p.external_reference),lower($9))>0 OR strpos(lower(p.brand_name),lower($9))>0)
       AND ($10='all' OR p.off_day=($10='true'))
       ORDER BY CASE WHEN $8 THEN NULL ELSE p.actual_date END DESC NULLS LAST,p.recorded_at DESC,p.id DESC
       LIMIT ${PAGE} OFFSET $11`,
      [
        u.access.companyId,
        f.brandId ?? null,
        f.payingBranchId ?? null,
        f.sourceBranchId ?? null,
        f.method ?? 'all',
        f.from ?? null,
        f.to ?? null,
        recorded,
        (f.search ?? '').trim(),
        f.offDay ?? 'all',
        (page - 1) * PAGE,
      ],
    )
  ).rows;
  return {
    items: rows.map(({ total: _t, recordedAt, ...r }) => ({
      ...r,
      recordedAt: recordedAt.toISOString(),
    })),
    total: Number(rows[0]?.total ?? 0),
    page,
    limit: PAGE,
  };
}
export async function payoutCatalog(u: UnitOfWork): Promise<BrandPayoutCatalog> {
  await configurationLock(u);
  return {
    branches: u.access.assignedBranches,
    accounts: (await accountList(u)).items,
    brands: (
      await u.client.query<{ id: string; name: string; active: boolean; payoutWeekdays: number[] }>(
        `SELECT b.id,b.name,b.active,ARRAY(SELECT x::int FROM jsonb_array_elements_text(p.fields->'payoutWeekdays') x ORDER BY x::int) AS "payoutWeekdays"
         FROM commercial.brand b JOIN commercial.brand_policy p ON(p.company_id,p.brand_id,p.version)=(b.company_id,b.id,b.version)
         WHERE b.company_id=$1 ORDER BY lower(b.name),b.id`,
        [u.access.companyId],
      )
    ).rows,
  };
}
export class BrandPayoutService {
  constructor(
    readonly pool: Pool,
    readonly hooks: BrandPayoutHooks = {},
  ) {}
  private commands() {
    const hooks = this.hooks;
    const definition: CommandDefinition<BrandPayoutCommand> = {
      family: brandPayoutFamily,
      kind: 'brand.payout.confirm',
      capability: 'brand.payout',
      authorize: async (u, value, recovery) => {
        if (!recovery && !validateBrandPayoutCommand(value))
          throw new AccessError('VALIDATION_FAILED', 400);
        const branch = (value as { payingBranchId?: unknown }).payingBranchId;
        if (typeof branch !== 'string') throw new AccessError('FORBIDDEN_SCOPE');
        // Paying from (or recovering a payout of) a branch requires current assignment to it.
        u.assertBranch(branch);
      },
      rejectionReference: (input) => ({
        entityId: input.brandId,
        branchId: input.payingBranchId,
        payingBranchId: input.payingBranchId,
        brandId: input.brandId,
      }),
      resolve: async (u, reference) => payoutResult(u, String(reference.payoutId)),
      execute: async (u, input, recordId) => {
        const today = await cairoToday(u);
        if (input.actualDate > today) throw new AccessError('FUTURE_PAYMENT_DATE', 400);
        const amount = minor(input.amountMinor, 'positive');
        const payoutId = randomUUID(),
          posting = new JournalPosting(u);
        // Lock order: command → payout source → shared configuration → brand wallet → account.
        const source = await posting.source(
          { system: 'brand-payout', identity: payoutId, kind: 'payout', revision: '1' },
          {
            brandId: input.brandId,
            payingBranchId: input.payingBranchId,
            accountId: input.accountId,
            method: input.method,
            amountMinor: amount.toString(),
            actualDate: input.actualDate,
            externalReference: input.externalReference ?? '',
            offDayReason: input.offDayReason ?? null,
          },
        );
        await configurationLock(u);
        const brand = await readBrand(u.client, u.access.companyId, input.brandId);
        if (!brand) throw new AccessError('NOT_FOUND', 404);
        await BrandWalletService.lock(u, [input.brandId]);
        await hooks.afterWalletLock?.(u, input);
        const accounts = new AccountFundsService(u);
        await accounts.lock([input.accountId]);
        const fields = fieldsOf(input),
          account = await accounts.use(fields);
        const weekday = weekdayOf(input.actualDate),
          offDay = !brand.payoutWeekdays.includes(weekday);
        // A reason organizes an exception; it never bypasses eligibility, holds or funds.
        if (offDay && input.offDayReason === undefined)
          throw new AccessError('OFF_DAY_REASON_REQUIRED', 409);
        if (!offDay && input.offDayReason !== undefined)
          throw new AccessError('OFF_DAY_REASON_NOT_APPLICABLE', 409);
        const wallet = new BrandWalletService(u, input.brandId),
          before = await wallet.readiness();
        if (amount > minor(before.amounts.eligibleToPayMinor, 'nonnegative'))
          throw rejection('INSUFFICIENT_ELIGIBLE_CREDIT', {
            amounts: before.amounts,
            readinessRevision: before.revision,
          });
        if (before.revision !== input.expectedReadinessRevision)
          throw rejection('WALLET_CHANGED', {
            amounts: before.amounts,
            readinessRevision: before.revision,
          });
        const available = await accounts.available(input.accountId);
        if (available < amount)
          throw rejection('INSUFFICIENT_FUNDS', { availableMinor: available.toString() });
        const reference = (
          await u.client.query<{ reference: string }>(
            `SELECT nextval('finance.brand_payout_reference_seq')::text AS reference`,
          )
        ).rows[0]!.reference;
        const movementId = randomUUID();
        // One posting batch: actual account debit and the brand payout movement.
        await accounts.post({
          sourceId: source.id,
          recordId,
          movementId,
          fields,
          direction: 'withdrawal',
          sourceKind: 'brand_payout',
          reason: `تحصيل ${brand.name} رقم ${reference}`,
          additionalEffects: [
            {
              family: 'brand',
              kind: 'payout',
              subjectId: input.brandId,
              amountMinor: (-amount).toString(),
              branchId: input.payingBranchId,
              effectiveDate: input.actualDate,
              supersedesId: null,
              reason: null,
            },
          ],
        });
        await hooks.fault?.('debit');
        const effectId = (
          await u.client.query<{ id: string }>(
            `SELECT id FROM kernel.journal_effect WHERE company_id=$1 AND source_id=$2 AND family='brand' AND kind='payout'`,
            [u.access.companyId, source.id],
          )
        ).rows[0]!.id;
        const allocations = await wallet.allocatePayout(effectId, amount.toString());
        await hooks.fault?.('allocation');
        const after = await wallet.amounts();
        const eligibleAfter = subtractMinor(
          minor(before.amounts.eligibleToPayMinor, 'nonnegative'),
          amount,
        );
        if (after.eligibleToPayMinor !== eligibleAfter.toString())
          throw new Error('PAYOUT_ELIGIBILITY_INVARIANT');
        await u.client.query(
          `INSERT INTO finance.brand_payout(company_id,id,reference,brand_id,brand_name,policy_version,scheduled_weekdays,source_id,
           command_record_id,effect_id,movement_id,paying_branch_id,paying_branch_name,account_id,account_name,method,amount_minor,
           actual_date,weekday,off_day,off_day_reason,external_reference,eligible_before_minor,eligible_after_minor,signed_after_minor,
           readiness_revision,actor_id,actor_name)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
          [
            u.access.companyId,
            payoutId,
            reference,
            input.brandId,
            brand.name,
            brand.version,
            [...brand.payoutWeekdays].sort(),
            source.id,
            recordId,
            effectId,
            movementId,
            input.payingBranchId,
            u.access.assignedBranches.find((b) => b.id === input.payingBranchId)!.name,
            input.accountId,
            account.name,
            input.method,
            amount.toString(),
            input.actualDate,
            weekday,
            offDay,
            offDay ? input.offDayReason!.trim() : null,
            input.externalReference?.trim() ?? '',
            before.amounts.eligibleToPayMinor,
            after.eligibleToPayMinor,
            after.signedEntitlementMinor,
            before.revision,
            u.access.principalId,
            u.access.displayName,
          ],
        );
        for (const a of allocations)
          await u.client.query(
            `INSERT INTO finance.payout_allocation(company_id,payout_id,lot_id,effect_id,amount_minor,lot_kind,source_branch_id,lot_effective_date)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              u.access.companyId,
              payoutId,
              a.lotId,
              effectId,
              a.amountMinor,
              a.lotKind,
              a.sourceBranchId,
              a.effectiveDate,
            ],
          );
        await hooks.fault?.('payout');
        const result: BrandPayoutResult = {
          commandId: input.commandId,
          payoutId,
          reference,
          brandId: input.brandId,
          amountMinor: amount.toString(),
          actualDate: input.actualDate,
          movementId,
          eligibleToPayAfterMinor: after.eligibleToPayMinor,
          signedEntitlementAfterMinor: after.signedEntitlementMinor,
        };
        await hooks.fault?.('result');
        return {
          reply: { status: 200, body: result },
          reference: {
            payoutId,
            brandId: input.brandId,
            payingBranchId: input.payingBranchId,
          },
          entityId: payoutId,
          beforeVersion: null,
          afterVersion: 1,
        };
      },
    };
    return new CommandService(this.pool, [definition]);
  }
  confirm(token: string, input: BrandPayoutCommand) {
    if (!validateBrandPayoutCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
    return this.commands().execute(token, input);
  }
  recover(token: string, companyId: string, commandId: string) {
    return this.commands().recover(token, companyId, brandPayoutFamily, commandId);
  }
  /** Locked read under the same locks as confirmation; no journal, money or command effect. */
  preview(token: string, input: BrandPayoutScope): Promise<BrandPayoutPreview> {
    return UnitOfWork.run(this.pool, token, input.companyId, 'brand.payout', async (u) => {
      u.assertBranch(input.payingBranchId);
      await configurationLock(u);
      const brand = await readBrand(u.client, u.access.companyId, input.brandId);
      if (!brand) throw new AccessError('NOT_FOUND', 404);
      await BrandWalletService.lock(u, [input.brandId]);
      const accounts = new AccountFundsService(u);
      await accounts.lock([input.accountId]);
      const account = await accounts.read(input.accountId),
        blockers: BrandPayoutPreview['blockers'] = [];
      const amount = minor(input.amountMinor, 'positive');
      try {
        await accounts.use(fieldsOf(input));
      } catch (e) {
        if (
          e instanceof AccessError &&
          ['ACCOUNT_USAGE_FORBIDDEN', 'ACCOUNT_INACTIVE', 'METHOD_ACCOUNT_MISMATCH'].includes(
            e.code,
          )
        )
          blockers.push(e.code as BrandPayoutPreview['blockers'][number]);
        else throw e;
      }
      let available = minor(account.balanceMinor, 'nonnegative');
      try {
        available = await accounts.available(input.accountId);
      } catch (e) {
        if (!(e instanceof AccessError) || e.code !== 'ACCOUNT_RECONCILIATION_REQUIRED') throw e;
        blockers.push('ACCOUNT_RECONCILIATION_REQUIRED');
      }
      const wallet = await new BrandWalletService(u, input.brandId).summary();
      const payable = minor(wallet.amounts.eligibleToPayMinor, 'nonnegative');
      if (amount > payable) blockers.push('INSUFFICIENT_ELIGIBLE_CREDIT');
      if (available < amount) blockers.push('INSUFFICIENT_FUNDS');
      if (input.actualDate > wallet.today) blockers.push('FUTURE_PAYMENT_DATE');
      const weekday = weekdayOf(input.actualDate);
      return {
        brandId: input.brandId,
        amountMinor: amount.toString(),
        wallet,
        account: {
          id: account.id,
          name: account.name,
          type: account.type,
          active: account.active,
          availableMinor: available.toString(),
        },
        weekday,
        offDay: !brand.payoutWeekdays.includes(weekday),
        blockers,
        eligibleToPayAfterMinor: amount <= payable ? (payable - amount).toString() : null,
        readinessRevision: wallet.readinessRevision,
      };
    });
  }
}
