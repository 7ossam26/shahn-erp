import { AccessError, addMinor, minor, type JournalEffect } from '@shahn/domain';
import type {
  BrandWalletAmounts,
  BrandWalletBranch,
  BrandWalletSummary,
  WalletReason,
} from '@shahn/contracts';
import { readBrand } from '@shahn/database';
import { canonical, digest } from '../../access/crypto.js';
import { JournalPosting, resourceKey } from '../../kernel/journals.js';
import { WalletService } from '../../kernel/wallet.js';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';

/** Cairo business calendar helpers shared by preview, confirmation and calendar views. */
export async function cairoToday(u: UnitOfWork): Promise<string> {
  return (
    await u.client.query<{ today: string }>(
      `SELECT (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date::text AS today`,
    )
  ).rows[0]!.today;
}
/** 0 = Sunday … 6 = Saturday, matching the P04 brand setup labels. */
export function weekdayOf(date: string): number {
  return new Date(date + 'T00:00:00Z').getUTCDay();
}
export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function nextPayoutDate(today: string, weekdays: readonly number[]): string {
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    if (weekdays.includes(weekdayOf(date))) return date;
  }
  throw new Error('PAYOUT_WEEKDAYS_REQUIRED');
}
export function walletReasons(a: BrandWalletAmounts): WalletReason[] {
  const reasons: WalletReason[] = [];
  if (a.pendingMinor !== '0') reasons.push('PENDING_REMITTANCE');
  if (a.heldMinor !== '0') reasons.push('HELD_FOR_REVIEW');
  if (a.coverMinor !== '0') reasons.push('SHIPPING_COVER');
  if (a.debitsMinor !== '0' || minor(a.signedEntitlementMinor) < 0n) reasons.push('DEBT');
  if (a.eligibleMinor === '0' && a.pendingMinor === '0') reasons.push('NO_ELIGIBLE_CREDIT');
  return reasons;
}
export interface PayoutAllocationRow {
  lotId: string;
  amountMinor: string;
  lotKind: 'goods' | 'compensation' | 'opening' | 'correction' | 'adjustment';
  sourceBranchId: string;
  effectiveDate: string;
}
export interface WalletReadiness {
  amounts: BrandWalletAmounts;
  revision: string;
  activeHolds: number;
  openReviews: number;
  policyVersion: number;
}
/**
 * Stable P17 interface over the one P03 shared brand wallet. Construct only after the caller
 * holds the brand resource lock (`BrandWalletService.lock`). Every method joins the caller's
 * UnitOfWork transaction; none starts, commits or retries a transaction.
 *
 * signed entitlement = E + P - D; eligible to pay = max(0, E - D - H - C), where consumed
 * credit is removed from E by immutable allocations and is never subtracted a second time.
 */
export class BrandWalletService {
  readonly kernel: WalletService;
  constructor(
    readonly u: UnitOfWork,
    readonly brandId: string,
  ) {
    this.kernel = new WalletService(u, brandId);
  }
  /** Locks sorted shared wallets in the P03 `wallet` class; reused locks are no-ops. */
  static async lock(u: UnitOfWork, brandIds: readonly string[]) {
    const posting = new JournalPosting(u);
    for (const id of [...new Set(brandIds)].sort()) await posting.lock('brand', id);
  }
  private check() {
    this.u.requireLock('wallet', resourceKey('brand', this.brandId));
  }
  async amounts(): Promise<BrandWalletAmounts> {
    const a = await this.kernel.amounts();
    const paid = (
      await this.u.client.query<{ paid: string }>(
        `SELECT COALESCE(-sum(amount_minor),0)::text AS paid FROM kernel.journal_effect
         WHERE company_id=$1 AND family='brand' AND kind='payout' AND subject_id=$2`,
        [this.u.access.companyId, this.brandId],
      )
    ).rows[0]!.paid;
    return {
      eligibleMinor: a.eligible,
      pendingMinor: a.pending,
      debitsMinor: a.debits,
      heldMinor: a.held,
      coverMinor: a.cover,
      signedEntitlementMinor: a.signedEntitlement,
      eligibleToPayMinor: a.eligibleToPay,
      paidMinor: minor(paid, 'nonnegative').toString(),
    };
  }
  /** Locked readiness digest: every fact that can change what may be paid or allocated. */
  async readiness(): Promise<WalletReadiness> {
    this.check();
    const { companyId } = this.u.access;
    const amounts = await this.amounts();
    const brand = await readBrand(this.u.client, companyId, this.brandId);
    if (!brand) throw new AccessError('NOT_FOUND', 404);
    const holds = (
      await this.u.client.query<{ id: string }>(
        `SELECT h.id FROM kernel.wallet_hold h JOIN kernel.credit_lot l ON(l.company_id,l.id)=(h.company_id,h.lot_id)
         WHERE h.company_id=$1 AND l.brand_id=$2
         AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id) ORDER BY h.id`,
        [companyId, this.brandId],
      )
    ).rows.map((r) => r.id);
    const covers = (
      await this.u.client.query<{ id: string }>(
        `SELECT c.id FROM kernel.shipping_cover c WHERE c.company_id=$1 AND c.brand_id=$2
         AND NOT EXISTS(SELECT 1 FROM kernel.cover_close x WHERE x.company_id=c.company_id AND x.cover_id=c.id) ORDER BY c.id`,
        [companyId, this.brandId],
      )
    ).rows.map((r) => r.id);
    const openReviews = Number(
      (
        await this.u.client.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id)
           WHERE r.company_id=$1 AND v.brand_id=$2 AND r.state='open'`,
          [companyId, this.brandId],
        )
      ).rows[0]!.n,
    );
    // Pending credit and signed entitlement are displayed but cannot change payability.
    const revision = digest(
      canonical({
        brandId: this.brandId,
        policyVersion: brand.version,
        weekdays: [...brand.payoutWeekdays].sort(),
        eligible: amounts.eligibleMinor,
        debits: amounts.debitsMinor,
        held: amounts.heldMinor,
        cover: amounts.coverMinor,
        eligibleToPay: amounts.eligibleToPayMinor,
        holds,
        covers,
        openReviews,
      }),
    );
    return {
      amounts,
      revision,
      activeHolds: holds.length,
      openReviews,
      policyVersion: brand.version,
    };
  }
  /** Source-branch breakdown of the same lot/debit/cover rows; totals equal the wallet totals. */
  async branches(): Promise<BrandWalletBranch[]> {
    this.check();
    return (
      await this.u.client.query<BrandWalletBranch>(
        `WITH lots AS (
          SELECT e.branch_id, l.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=l.company_id AND a.lot_id=l.id),0) AS remaining,
           COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=l.company_id AND h.lot_id=l.id
             AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id)),0) AS held,
           (l.readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release cr WHERE cr.company_id=l.company_id AND cr.lot_id=l.id)) AS eligible
          FROM kernel.credit_lot l JOIN kernel.journal_effect e ON(e.company_id,e.id)=(l.company_id,l.id)
          WHERE l.company_id=$1 AND l.brand_id=$2),
         debits AS (
          SELECT e.branch_id,-e.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=e.company_id AND a.effect_id=e.id),0) AS remaining
          FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=$2 AND e.amount_minor<0 AND e.kind<>'payout'),
         covers AS (
          SELECT i.branch_id,c.amount_minor FROM kernel.shipping_cover c
          LEFT JOIN dispatch.item di ON(di.company_id,di.cover_id)=(c.company_id,c.id)
          LEFT JOIN dispatch.intent i ON(i.company_id,i.id)=(di.company_id,di.intent_id)
          WHERE c.company_id=$1 AND c.brand_id=$2 AND NOT EXISTS(SELECT 1 FROM kernel.cover_close x WHERE x.company_id=c.company_id AND x.cover_id=c.id)),
         rows AS (
          SELECT branch_id,CASE WHEN eligible THEN remaining ELSE 0 END e,CASE WHEN eligible THEN 0 ELSE remaining END p,CASE WHEN eligible THEN held ELSE 0 END h,0 d,0 c FROM lots
          UNION ALL SELECT branch_id,0,0,0,remaining,0 FROM debits
          UNION ALL SELECT branch_id,0,0,0,0,amount_minor FROM covers)
         SELECT r.branch_id AS "branchId",COALESCE(b.name,'غير محدد') AS "branchName",
          sum(e)::text AS "eligibleMinor",sum(p)::text AS "pendingMinor",sum(h)::text AS "heldMinor",
          sum(d)::text AS "debitsMinor",sum(c)::text AS "coverMinor"
         FROM rows r LEFT JOIN access.branch b ON(b.company_id,b.id)=($1,r.branch_id)
         GROUP BY r.branch_id,b.name HAVING sum(e)+sum(p)+sum(h)+sum(d)+sum(c)>0
         ORDER BY b.name NULLS LAST,r.branch_id NULLS LAST`,
        [this.u.access.companyId, this.brandId],
      )
    ).rows;
  }
  async summary(): Promise<BrandWalletSummary> {
    const brand = await readBrand(this.u.client, this.u.access.companyId, this.brandId);
    if (!brand) throw new AccessError('NOT_FOUND', 404);
    const readiness = await this.readiness(),
      today = await cairoToday(this.u);
    return {
      brandId: this.brandId,
      brandName: brand.name,
      active: brand.active,
      allowNegativeBalance: brand.allowNegativeBalance,
      payoutWeekdays: [...brand.payoutWeekdays].sort(),
      policyVersion: brand.version,
      amounts: readiness.amounts,
      readinessRevision: readiness.revision,
      branches: await this.branches(),
      reasons: walletReasons(readiness.amounts),
      today,
      scheduledToday: brand.payoutWeekdays.includes(weekdayOf(today)),
      nextPayoutDate: nextPayoutDate(today, brand.payoutWeekdays),
      openReviews: readiness.openReviews,
      activeHolds: readiness.activeHolds,
    };
  }
  /** Journal-versus-lot reconciliation: sum of signed brand effects must equal E + P - D. */
  async reconcile(): Promise<{ journalMinor: string; lotModelMinor: string; reconciled: boolean }> {
    const amounts = await this.amounts();
    const journal = (
      await this.u.client.query<{ total: string }>(
        `SELECT COALESCE(sum(amount_minor),0)::text AS total FROM kernel.journal_effect WHERE company_id=$1 AND family='brand' AND subject_id=$2`,
        [this.u.access.companyId, this.brandId],
      )
    ).rows[0]!.total;
    return {
      journalMinor: journal,
      lotModelMinor: amounts.signedEntitlementMinor,
      reconciled: journal === amounts.signedEntitlementMinor,
    };
  }
  /**
   * P18 typed producer: a confirmed compensation is independently eligible (ERP-D-099). The caller
   * owns the source identity/batch and may add its other same-source effects (employee obligation,
   * operating cost) after locking their resources. The browser can never request eligibility.
   */
  async postCompensation(input: {
    sourceId: string;
    recordId: string;
    amountMinor: string;
    branchId: string;
    effectiveDate: string;
    reason?: string | null;
    additionalEffects?: readonly JournalEffect[];
  }): Promise<{ lotId: string; effectIds: string[] }> {
    this.check();
    const amount = minor(input.amountMinor, 'positive').toString();
    const posted = await new JournalPosting(this.u).append(input.sourceId, input.recordId, [
      {
        family: 'brand',
        kind: 'compensation',
        subjectId: this.brandId,
        amountMinor: amount,
        branchId: input.branchId,
        effectiveDate: input.effectiveDate,
        supersedesId: null,
        reason: input.reason ?? null,
      },
      ...(input.additionalEffects ?? []),
    ]);
    const lotId = posted.ids[0]!;
    await this.kernel.credit(lotId, 'eligible');
    // Existing debt is offset first, oldest eligible effective date then movement ID.
    await this.kernel.offsetDebits();
    return { lotId, effectIds: posted.ids };
  }
  hold(lotId: string, sourceId: string, amountMinor: string, reason: string) {
    this.check();
    return this.kernel.hold(lotId, sourceId, amountMinor, reason);
  }
  releaseHold(holdId: string, sourceId: string) {
    return this.kernel.releaseHold(holdId, sourceId);
  }
  /** P12 cover entry point; payout, cover and fees serialize on this same wallet row lock. */
  reserveCover(sourceId: string, amountMinor: string, allowNegative: boolean) {
    return this.kernel.reserve(sourceId, amountMinor, allowNegative);
  }
  closeCover(coverSourceId: string, sourceId: string, effectId: string | null, reason: string) {
    return this.kernel.closeCover(coverSourceId, sourceId, effectId, reason);
  }
  /**
   * Consumes eligible lots for an already appended brand `payout` effect: existing debits are
   * offset first, then oldest eligible effective date, then movement ID. Pending, held and
   * cover-encumbered credit is never spent.
   */
  async allocatePayout(effectId: string, amountMinor: string): Promise<PayoutAllocationRow[]> {
    this.check();
    await this.kernel.payout(effectId, minor(amountMinor, 'positive').toString());
    const rows = (
      await this.u.client.query<PayoutAllocationRow>(
        `SELECT a.lot_id AS "lotId",a.amount_minor::text AS "amountMinor",l.kind AS "lotKind",l.branch_id AS "sourceBranchId",l.effective_date::text AS "effectiveDate"
         FROM kernel.lot_allocation a JOIN kernel.journal_effect l ON(l.company_id,l.id)=(a.company_id,a.lot_id)
         WHERE a.company_id=$1 AND a.effect_id=$2 ORDER BY l.effective_date,l.id`,
        [this.u.access.companyId, effectId],
      )
    ).rows;
    const total = rows.reduce((n, r) => addMinor(n, minor(r.amountMinor, 'positive')), 0n);
    if (total.toString() !== minor(amountMinor, 'positive').toString())
      throw new Error('ALLOCATION_INVARIANT');
    return rows;
  }
}
