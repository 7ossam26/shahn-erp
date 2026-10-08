import { randomUUID } from 'node:crypto';
import {
  AccessError,
  cairoDate,
  minor,
  sourceReviewDelta,
  type JournalEffect,
} from '@shahn/domain';
import type { SettlementOperation } from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { JournalPosting } from '../../kernel/journals.js';
import { BrandWalletService } from '../../finance/brand-wallet/wallet.service.js';
import { resolveSettlementReview } from '../../execution/settlement-review.service.js';
import { branchName, rejection, type PreviewBody, type Resolver } from '../framework.js';
import { applyBrandEffect, brandOriginal, walletAfter, walletFacts } from './brand-wallet-plan.js';

type SourceResolve = Extract<SettlementOperation, { operation: 'source.resolve' }>;
interface ReviewRow {
  id: string;
  state: string;
  visit_id: string;
  branch_id: string;
  brand_id: string;
  shipment_id: string;
  reference: string;
  basis: {
    previous?: {
      goods_minor: string;
      brand_fee_minor: string;
      goods_effect_id: string | null;
      fee_effect_id: string | null;
    } | null;
    basis: { goods: string; fee: string };
    outcome: { revision: number; outcome?: string };
    remittanceId?: string | null;
    reason?: string;
  };
}
async function review(u: UnitOfWork, reviewId: string) {
  const r = (
    await u.client.query<ReviewRow>(
      `SELECT r.id,r.state,r.visit_id,r.basis,v.branch_id,v.brand_id,v.shipment_id,s.reference
       FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id)
       JOIN shipments.shipment s ON(s.company_id,s.id)=(v.company_id,v.shipment_id)
       WHERE r.company_id=$1 AND r.id=$2 FOR UPDATE OF r`,
      [u.access.companyId, reviewId],
    )
  ).rows[0];
  if (!r) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(r.branch_id);
  return r;
}
async function reviewHolds(u: UnitOfWork, r: ReviewRow) {
  const lot = r.basis.previous?.goods_effect_id ?? null;
  if (!lot) return [];
  return (
    await u.client.query<{ id: string; amount: string }>(
      `SELECT h.id,h.amount_minor::text AS amount FROM kernel.wallet_hold h JOIN kernel.source_record sr ON(sr.company_id,sr.id)=(h.company_id,h.source_id)
       WHERE h.company_id=$1 AND sr.system='execution' AND sr.kind='outcome' AND sr.revision=$2 AND h.lot_id=$3
       AND NOT EXISTS(SELECT 1 FROM kernel.hold_release x WHERE x.company_id=h.company_id AND x.hold_id=h.id) ORDER BY h.id`,
      [u.access.companyId, String(r.basis.outcome.revision), lot],
    )
  ).rows;
}
interface PlannedEffect {
  key: 'goods' | 'fee';
  kind: 'correction' | 'goods' | 'fee';
  amountMinor: string;
  supersedesId: string | null;
}
function planned(r: ReviewRow, decision: SourceResolve['decision']): PlannedEffect[] {
  if (decision === 'retain_original') return [];
  const prev = r.basis.previous ?? null;
  const d = sourceReviewDelta(
    { goodsMinor: prev?.goods_minor ?? '0', feeMinor: prev?.brand_fee_minor ?? '0' },
    { goodsMinor: r.basis.basis.goods, feeMinor: r.basis.basis.fee },
  );
  const out: PlannedEffect[] = [];
  if (d.goodsDeltaMinor !== '0')
    out.push(
      prev?.goods_effect_id
        ? {
            key: 'goods',
            kind: 'correction',
            amountMinor: d.goodsDeltaMinor,
            supersedesId: prev.goods_effect_id,
          }
        : { key: 'goods', kind: 'goods', amountMinor: d.goodsDeltaMinor, supersedesId: null },
    );
  if (d.feeDeltaMinor !== '0')
    out.push(
      prev?.fee_effect_id
        ? {
            key: 'fee',
            kind: 'correction',
            amountMinor: d.feeDeltaMinor,
            supersedesId: prev.fee_effect_id,
          }
        : { key: 'fee', kind: 'fee', amountMinor: d.feeDeltaMinor, supersedesId: null },
    );
  return out;
}
async function dependents(u: UnitOfWork, r: ReviewRow) {
  const company = u.access.companyId,
    out: PreviewBody['dependents'] = [];
  if (r.basis.remittanceId)
    out.push({
      kind: 'remittance',
      id: r.basis.remittanceId,
      label: 'استلام أموال المندوب المؤكد',
      state: 'retained',
    });
  for (const p of (
    await u.client.query<{ kind: string; reference_id: string }>(
      'SELECT kind,reference_id FROM execution.protected_basis WHERE company_id=$1 AND visit_id=$2 ORDER BY kind',
      [company, r.visit_id],
    )
  ).rows)
    out.push({
      kind: 'protected_' + p.kind,
      id: p.reference_id,
      label: 'سجل محمي: ' + p.kind,
      state: 'retained',
    });
  const lot = r.basis.previous?.goods_effect_id;
  if (lot)
    for (const p of (
      await u.client.query<{ id: string; reference: string; amount: string }>(
        `SELECT p.id,p.reference,a.amount_minor::text AS amount FROM kernel.lot_allocation a JOIN finance.brand_payout p ON(p.company_id,p.effect_id)=(a.company_id,a.effect_id)
         WHERE a.company_id=$1 AND a.lot_id=$2 ORDER BY p.reference`,
        [company, lot],
      )
    ).rows)
      out.push({
        kind: 'brand_payout',
        id: p.id,
        label: `تحصيل رقم ${p.reference} · ${p.amount}`,
        state: 'retained',
      });
  return out;
}
async function body(u: UnitOfWork, op: SourceResolve, r: ReviewRow) {
  const wallet = new BrandWalletService(u, r.brand_id),
    readiness = await wallet.readiness();
  const holds = await reviewHolds(u, r),
    released = holds.reduce((t, h) => t + minor(h.amount, 'positive'), 0n).toString();
  const effects = planned(r, op.decision);
  const blockers: string[] = [],
    warnings: string[] = [];
  if (r.state !== 'open') blockers.push('SETTLEMENT_ALREADY_RESOLVED');
  if (op.actualDate > cairoDate(new Date())) blockers.push('FUTURE_ACTUAL_DATE');
  if (op.decision === 'apply_effective' && !effects.length)
    blockers.push('NO_MONEY_DIFFERENCE_RETAIN');
  // Project sequentially. The review hold sits on the previous goods lot and is released first.
  let after = readiness.amounts,
    pendingRelease = released;
  for (const e of effects) {
    const original = e.supersedesId ? await brandOriginal(u, r.brand_id, e.supersedesId) : null;
    const onHeldLot = !!e.supersedesId && e.supersedesId === r.basis.previous?.goods_effect_id;
    try {
      after = walletAfter(after, {
        original,
        deltaMinor: e.amountMinor,
        ...(e.kind === 'goods' ? { readiness: 'pending' as const } : {}),
        releasedHoldMinor: onHeldLot ? pendingRelease : '0',
      });
      if (onHeldLot) pendingRelease = '0';
    } catch (x) {
      if (!(x instanceof AccessError)) throw x;
      blockers.push(x.code);
    }
  }
  if (pendingRelease !== '0')
    after = walletAfter(after, {
      original: null,
      deltaMinor: '0',
      releasedHoldMinor: pendingRelease,
    });
  if (op.decision === 'apply_effective' && r.basis.remittanceId)
    warnings.push('RECEIVED_CASH_RETAINED_REVIEW_ACCOUNT');
  if (effects.some((e) => e.kind === 'goods')) warnings.push('NEW_GOODS_PENDING_ACTUAL_RECEIPT');
  if (minor(after.signedEntitlementMinor) < 0n) warnings.push('BRAND_DEBT_AFTER_CORRECTION');
  const prev = r.basis.previous ?? null;
  const b: PreviewBody = {
    operation: 'source.resolve',
    classification:
      op.decision === 'apply_effective' ? 'source_review_correction' : 'source_review_retained',
    target: {
      kind: 'source',
      id: r.id,
      label: 'شحنة ' + r.reference,
      branchId: r.branch_id,
      branchName: branchName(u, r.branch_id),
    },
    facts: [
      {
        key: 'sourceGoods',
        unit: 'minor',
        before: prev?.goods_minor ?? '0',
        after: op.decision === 'apply_effective' ? r.basis.basis.goods : (prev?.goods_minor ?? '0'),
      },
      {
        key: 'sourceBrandFee',
        unit: 'minor',
        before: prev?.brand_fee_minor ?? '0',
        after:
          op.decision === 'apply_effective' ? r.basis.basis.fee : (prev?.brand_fee_minor ?? '0'),
      },
      ...walletFacts(readiness.amounts, after),
    ],
    effects: [
      ...effects.map((e) => ({
        ledger: 'brand' as const,
        kind: e.kind,
        label:
          e.key === 'goods'
            ? 'فرق مستحقات البضاعة حسب الحقيقة الفعالة'
            : 'فرق رسوم الشحن على البراند',
        amountMinor: e.amountMinor,
        quantity: null,
        effectiveDate: op.actualDate,
      })),
      ...holds.map((h) => ({
        ledger: 'hold' as const,
        kind: 'review_hold_release',
        label: 'إلغاء إيقاف الأهلية المرتبط بهذه المراجعة فقط',
        amountMinor: h.amount,
        quantity: null,
        effectiveDate: op.actualDate,
      })),
      {
        ledger: 'review',
        kind: 'resolved',
        label: r.basis.reason ?? 'مراجعة فرق المصدر',
        amountMinor: null,
        quantity: null,
        effectiveDate: op.actualDate,
      },
    ],
    dependents: await dependents(u, r),
    warnings,
    blockers,
    versions: [
      { key: 'brand.wallet', version: readiness.revision },
      { key: 'source.review', version: r.state },
    ],
  };
  return { body: b, effects, holds };
}
/**
 * Source difference (ERP-D-174, ERP-R-183): old posted allocation versus accepted effective Tawsel
 * facts. Either keep the posted original or post the exact linked goods/fee difference; payouts,
 * remittance cash and paid payroll stay; only this review's hold is released. No Tawsel call.
 */
export const sourceResolveResolver: Resolver<SourceResolve> = {
  operation: 'source.resolve',
  targetKind: 'source',
  capabilities: ['brand.payout'],
  allowedStates: 'An open P13/P16/P17 settlement review in an assigned visit branch.',
  forbidden: [
    'automatic refund, cash withdrawal or Tawsel mutation — none is offered',
    'rewriting payouts, remittance or paid payroll — originals retained',
    'resolving twice — SETTLEMENT_ALREADY_RESOLVED',
    'an empty money difference posted as a correction — NO_MONEY_DIFFERENCE_RETAIN',
  ],
  matches: (op): op is SourceResolve => op.operation === 'source.resolve',
  branchOf: async (u, op) => (await review(u, op.reviewId)).branch_id,
  preview: async (u, op) => {
    const r = await review(u, op.reviewId);
    await BrandWalletService.lock(u, [r.brand_id]);
    return (await body(u, op, r)).body;
  },
  confirm: async (u, op, ctx) => {
    const posting = new JournalPosting(u),
      entityId = randomUUID();
    // Two sources at most (sorted identity order): one brand can need both goods and fee corrections.
    const primary = await posting.source(
      { system: 'settlement', identity: entityId + ':a', kind: 'source.resolve', revision: '1' },
      { op, reason: ctx.reason, part: 'a' },
    );
    const first = await review(u, op.reviewId);
    const needed = planned(first, op.decision);
    const split = needed.filter((e) => e.kind === 'correction').length > 1;
    const secondary = split
      ? await posting.source(
          {
            system: 'settlement',
            identity: entityId + ':b',
            kind: 'source.resolve',
            revision: '1',
          },
          { op, reason: ctx.reason, part: 'b' },
        )
      : null;
    await BrandWalletService.lock(u, [first.brand_id]);
    const r = await review(u, op.reviewId);
    if (r.state !== 'open') throw rejection('SETTLEMENT_ALREADY_RESOLVED', {});
    const { body: b, effects, holds } = await body(u, op, r);
    const preview = await ctx.verify(b);
    await ctx.record({
      classification: b.classification,
      amountMinor: null,
      quantity: null,
      sourceId: primary.id,
    });
    const kernel = new BrandWalletService(u, r.brand_id).kernel;
    for (const h of holds) await kernel.releaseHold(h.id, primary.id);
    const linked: string[] = [];
    // One posting batch per source: the second correction for the same brand uses the second source.
    let correctionsUsed = 0;
    const groups = new Map<string, PlannedEffect[]>();
    for (const e of effects) {
      const source = e.kind === 'correction' && correctionsUsed++ > 0 ? secondary! : primary;
      groups.set(source.id, [...(groups.get(source.id) ?? []), e]);
    }
    for (const [sourceId, group] of groups) {
      const posted = await posting.append(
        sourceId,
        ctx.recordId,
        group.map(
          (e) =>
            ({
              family: 'brand',
              kind: e.kind,
              subjectId: r.brand_id,
              amountMinor: e.amountMinor,
              branchId: r.branch_id,
              effectiveDate: op.actualDate,
              supersedesId: e.supersedesId,
              reason: ctx.reason,
            }) as JournalEffect,
        ),
      );
      for (let i = 0; i < group.length; i++) {
        const e = group[i]!,
          id = posted.ids[i]!;
        const original = e.supersedesId ? await brandOriginal(u, r.brand_id, e.supersedesId) : null;
        await applyBrandEffect(
          u,
          r.brand_id,
          { id, amountMinor: e.amountMinor },
          original,
          e.kind === 'goods' ? 'pending' : undefined,
        );
        linked.push(id);
        ctx.link('result', 'brand_movement', id, e.key === 'goods' ? 'فرق البضاعة' : 'فرق الرسوم');
      }
      ctx.link('result', 'posting_batch', posted.batchId, 'دفعة الترحيل');
    }
    await ctx.hooks.fault?.('effects');
    await resolveSettlementReview(u, {
      reviewId: r.id,
      resolutionSourceId: primary.id,
      ...(secondary ? { additionalSourceIds: [secondary.id] } : {}),
      linkedAdjustmentIds: linked,
      holdReleaseIds: holds.map((h) => h.id),
      mode: op.decision === 'apply_effective' ? 'linked_adjustment' : 'retain_original',
    });
    ctx.link('original', 'settlement_review', r.id, 'مراجعة فرق المصدر');
    ctx.link('original', 'shipment', r.shipment_id, 'شحنة ' + r.reference);
    for (const d of preview.dependents) ctx.link('dependent', d.kind, d.id, d.label);
    return { state: 'resolved' };
  },
};
