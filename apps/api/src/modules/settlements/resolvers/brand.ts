import { randomUUID } from 'node:crypto';
import { AccessError, cairoDate, correctedAmount, minor, type JournalEffect } from '@shahn/domain';
import type { SettlementOperation } from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { JournalPosting } from '../../kernel/journals.js';
import { BrandWalletService } from '../../finance/brand-wallet/wallet.service.js';
import { branchName, rejection, type PreviewBody, type Resolver } from '../framework.js';
import {
  applyBrandEffect,
  brandOriginal,
  walletAfter,
  walletFacts,
  type BrandOriginal,
} from './brand-wallet-plan.js';

type Correct = Extract<SettlementOperation, { operation: 'brand.correct' }>;
type Adjust = Extract<SettlementOperation, { operation: 'brand.adjust' }>;
type IncidentResolve = Extract<SettlementOperation, { operation: 'incident.resolve' }>;
async function brandName(u: UnitOfWork, brandId: string) {
  const row = (
    await u.client.query<{ name: string }>(
      'SELECT name FROM commercial.brand WHERE company_id=$1 AND id=$2',
      [u.access.companyId, brandId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  return row.name;
}
async function payoutDependents(u: UnitOfWork, lotId: string) {
  return (
    await u.client.query<{ id: string; reference: string; amount: string }>(
      `SELECT p.id,p.reference,a.amount_minor::text AS amount FROM kernel.lot_allocation a
       JOIN finance.brand_payout p ON(p.company_id,p.effect_id)=(a.company_id,a.effect_id)
       WHERE a.company_id=$1 AND a.lot_id=$2 ORDER BY p.reference`,
      [u.access.companyId, lotId],
    )
  ).rows.map((p) => ({
    kind: 'brand_payout',
    id: p.id,
    label: `تحصيل رقم ${p.reference} · ${p.amount}`,
    state: 'retained',
  }));
}
const correctableKinds = ['goods', 'fee', 'opening', 'adjustment'];
async function correctBody(
  u: UnitOfWork,
  op: Correct,
): Promise<{ body: PreviewBody; original: BrandOriginal }> {
  const original = await brandOriginal(u, op.brandId, op.effectId);
  u.assertBranch(original.branchId);
  const wallet = new BrandWalletService(u, op.brandId),
    before = await wallet.amounts(),
    readiness = await wallet.readiness();
  const blockers: string[] = [],
    warnings: string[] = [];
  if (op.actualDate > cairoDate(new Date())) blockers.push('FUTURE_ACTUAL_DATE');
  if (original.kind === 'payout') blockers.push('PAYOUT_CORRECTION_REQUIRES_ACTUAL_RETURN');
  else if (original.kind === 'compensation') blockers.push('USE_INCIDENT_REVIEW');
  else if (original.kind === 'correction') blockers.push('CORRECT_THE_ORIGINAL_MOVEMENT');
  else if (!correctableKinds.includes(original.kind)) blockers.push('MOVEMENT_NOT_CORRECTABLE');
  const openReview = (
    await u.client.query(
      `SELECT 1 FROM execution.allocation a JOIN execution.settlement_review r ON(r.company_id,r.visit_id)=(a.company_id,a.visit_id)
       WHERE a.company_id=$1 AND (a.goods_effect_id=$2 OR a.fee_effect_id=$2) AND r.state='open' LIMIT 1`,
      [u.access.companyId, original.id],
    )
  ).rowCount;
  if (openReview) blockers.push('SOURCE_REVIEW_OPEN');
  let afterAmount = original.amountMinor,
    after = before;
  try {
    afterAmount = correctedAmount(
      original.amountMinor,
      original.priorCorrectionsMinor,
      op.amountMinor,
    );
    after = walletAfter(before, { original, deltaMinor: op.amountMinor });
  } catch (e) {
    if (!(e instanceof AccessError)) throw e;
    blockers.push(e.code);
  }
  if (minor(after.signedEntitlementMinor) < 0n) warnings.push('BRAND_DEBT_AFTER_CORRECTION');
  if (original.lot && !original.lot.eligible) warnings.push('PENDING_CLASS_PRESERVED');
  const name = await brandName(u, op.brandId);
  return {
    original,
    body: {
      operation: 'brand.correct',
      classification: 'brand_correction',
      target: {
        kind: 'brand',
        id: op.brandId,
        label: name,
        branchId: original.branchId,
        branchName: branchName(u, original.branchId),
      },
      facts: [
        {
          key: 'originalMovement',
          unit: 'minor',
          before: (minor(original.amountMinor) + minor(original.priorCorrectionsMinor)).toString(),
          after: afterAmount,
        },
        ...walletFacts(before, after),
      ],
      effects: [
        {
          ledger: 'brand',
          kind: 'correction',
          label: `تصحيح مرتبط لحركة ${original.kind} بتاريخ ${original.effectiveDate}`,
          amountMinor: op.amountMinor,
          quantity: null,
          effectiveDate: op.actualDate,
        },
      ],
      dependents: original.lot ? await payoutDependents(u, original.id) : [],
      warnings,
      blockers,
      versions: [
        { key: 'brand.wallet', version: readiness.revision },
        { key: 'brand.movement.corrections', version: original.priorCorrectionsMinor },
      ],
    },
  };
}
/**
 * Linked reversal/correction of one typed brand movement (ERP-D-119, ERP-R-126). The original and
 * every payout allocation stay; class and readiness are preserved; no cash or refund is inferred.
 */
export const brandCorrectResolver: Resolver<Correct> = {
  operation: 'brand.correct',
  targetKind: 'brand',
  capabilities: ['brand.payout'],
  allowedStates:
    'A goods, fee, opening or commercial-adjustment movement of a company brand in an assigned branch, with no open source review.',
  forbidden: [
    'payout reversal without actual returned money — PAYOUT_CORRECTION_REQUIRES_ACTUAL_RETURN',
    'compensation outside its incident review — USE_INCIDENT_REVIEW',
    'credit becoming debit or debit becoming credit — CORRECTION_CHANGES_CLASS',
    'stale wallet readiness — SETTLEMENT_PREVIEW_STALE',
  ],
  matches: (op): op is Correct => op.operation === 'brand.correct',
  branchOf: async (u, op) => (await brandOriginal(u, op.brandId, op.effectId)).branchId,
  preview: async (u, op) => {
    await BrandWalletService.lock(u, [op.brandId]);
    return (await correctBody(u, op)).body;
  },
  confirm: async (u, op, ctx) => {
    const posting = new JournalPosting(u),
      entityId = randomUUID();
    const source = await posting.source(
      { system: 'settlement', identity: entityId, kind: 'brand.correct', revision: '1' },
      { op, reason: ctx.reason },
    );
    await BrandWalletService.lock(u, [op.brandId]);
    const { body, original } = await correctBody(u, op);
    const preview = await ctx.verify(body);
    await ctx.record({
      classification: 'brand_correction',
      amountMinor: op.amountMinor,
      quantity: null,
      sourceId: source.id,
    });
    const posted = await posting.append(source.id, ctx.recordId, [
      {
        family: 'brand',
        kind: 'correction',
        subjectId: op.brandId,
        amountMinor: op.amountMinor,
        branchId: original.branchId,
        effectiveDate: op.actualDate,
        supersedesId: original.id,
        reason: ctx.reason,
      },
    ]);
    await applyBrandEffect(
      u,
      op.brandId,
      { id: posted.ids[0]!, amountMinor: op.amountMinor },
      original,
    );
    await ctx.hooks.fault?.('effects');
    ctx.link('original', 'brand_movement', original.id, preview.effects[0]!.label);
    for (const d of preview.dependents) ctx.link('dependent', d.kind, d.id, d.label);
    ctx.link('result', 'brand_movement', posted.ids[0]!, 'التصحيح المرتبط');
    ctx.link('result', 'posting_batch', posted.batchId, 'دفعة الترحيل');
    return { state: 'resolved' };
  },
};
async function adjustBody(u: UnitOfWork, op: Adjust): Promise<PreviewBody> {
  u.assertBranch(op.branchId);
  const wallet = new BrandWalletService(u, op.brandId),
    before = await wallet.amounts(),
    readiness = await wallet.readiness();
  const signed = (op.direction === 'credit' ? '' : '-') + op.amountMinor;
  const after = walletAfter(before, { original: null, deltaMinor: signed, readiness: 'eligible' });
  const blockers = op.actualDate > cairoDate(new Date()) ? ['FUTURE_ACTUAL_DATE'] : [];
  return {
    operation: 'brand.adjust',
    classification: 'brand_commercial_unclassified',
    target: {
      kind: 'brand',
      id: op.brandId,
      label: await brandName(u, op.brandId),
      branchId: op.branchId,
      branchName: branchName(u, op.branchId),
    },
    facts: walletFacts(before, after),
    effects: [
      {
        ledger: 'brand',
        kind: 'adjustment',
        label: 'تسوية تجارية متفق عليها · ' + op.agreementReference,
        amountMinor: signed,
        quantity: null,
        effectiveDate: op.actualDate,
      },
    ],
    dependents: [],
    warnings: ['UNCLASSIFIED_OUTSIDE_OPERATING_PROFIT', 'NO_CASH_MOVEMENT'],
    blockers,
    versions: [{ key: 'brand.wallet', version: readiness.revision }],
  };
}
/** Independently agreed commercial credit/debit with source reference; never inferred income. */
export const brandAdjustResolver: Resolver<Adjust> = {
  operation: 'brand.adjust',
  targetKind: 'brand',
  capabilities: ['brand.payout'],
  allowedStates: 'Any company brand; paying/recording branch within assigned branches.',
  forbidden: [
    'cash, remittance or refund — no account effect is posted',
    'operating-profit classification without a justified typed resolution',
  ],
  matches: (op): op is Adjust => op.operation === 'brand.adjust',
  branchOf: async (_u, op) => op.branchId,
  preview: async (u, op) => {
    await BrandWalletService.lock(u, [op.brandId]);
    return adjustBody(u, op);
  },
  confirm: async (u, op, ctx) => {
    const posting = new JournalPosting(u),
      entityId = randomUUID();
    const source = await posting.source(
      { system: 'settlement', identity: entityId, kind: 'brand.adjust', revision: '1' },
      { op, reason: ctx.reason },
    );
    await BrandWalletService.lock(u, [op.brandId]);
    const preview = await ctx.verify(await adjustBody(u, op));
    const signed = preview.effects[0]!.amountMinor!;
    await ctx.record({
      classification: 'brand_commercial_unclassified',
      amountMinor: signed,
      quantity: null,
      sourceId: source.id,
    });
    const posted = await posting.append(source.id, ctx.recordId, [
      {
        family: 'brand',
        kind: 'adjustment',
        subjectId: op.brandId,
        amountMinor: signed,
        branchId: op.branchId,
        effectiveDate: op.actualDate,
        supersedesId: null,
        reason: ctx.reason + ' · ' + op.agreementReference,
      },
    ]);
    await applyBrandEffect(
      u,
      op.brandId,
      { id: posted.ids[0]!, amountMinor: signed },
      null,
      'eligible',
    );
    await ctx.hooks.fault?.('effects');
    ctx.link('result', 'brand_movement', posted.ids[0]!, preview.effects[0]!.label);
    ctx.link('result', 'posting_batch', posted.batchId, 'دفعة الترحيل');
    return { state: 'resolved' };
  },
};
interface IncidentReviewRow {
  review_id: string;
  review_source_id: string;
  incident_id: string;
  reference: string;
  brand_id: string;
  lot_id: string;
  compensation_minor: string;
  employee_share_minor: string;
  responsible_branch_id: string;
  confirmation_source_id: string;
  cost_effect_id: string;
}
async function incidentReview(u: UnitOfWork, incidentId: string) {
  const row = (
    await u.client.query<IncidentReviewRow>(
      `SELECT r.id AS review_id,r.source_id AS review_source_id,i.id AS incident_id,i.reference,i.brand_id,c.lot_id,c.compensation_minor::text,
       c.employee_share_minor::text,c.responsible_branch_id,c.source_id AS confirmation_source_id,e.id AS cost_effect_id
       FROM incidents.review r JOIN incidents.incident i ON(i.company_id,i.id)=(r.company_id,r.incident_id)
       JOIN incidents.confirmation c ON(c.company_id,c.incident_id)=(i.company_id,i.id)
       JOIN kernel.journal_effect e ON e.company_id=c.company_id AND e.source_id=c.source_id AND e.family='operating' AND e.kind='cost'
       WHERE r.company_id=$1 AND r.incident_id=$2 FOR UPDATE OF r`,
      [u.access.companyId, incidentId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(row.responsible_branch_id);
  return row;
}
async function reviewHolds(u: UnitOfWork, r: IncidentReviewRow) {
  return (
    await u.client.query<{ id: string; amount: string }>(
      `SELECT h.id,h.amount_minor::text AS amount FROM kernel.wallet_hold h WHERE h.company_id=$1 AND h.lot_id=$2 AND h.source_id=$3
       AND NOT EXISTS(SELECT 1 FROM kernel.hold_release x WHERE x.company_id=h.company_id AND x.hold_id=h.id) ORDER BY h.id`,
      [u.access.companyId, r.lot_id, r.review_source_id],
    )
  ).rows;
}
async function resolvedAlready(u: UnitOfWork, reviewId: string) {
  return !!(
    await u.client.query(
      `SELECT 1 FROM settlements.case_link l JOIN settlements.adjustment_case c ON(c.company_id,c.id)=(l.company_id,l.case_id)
       WHERE l.company_id=$1 AND l.entity_kind=$2 AND l.entity_id=$3 AND l.role='original' AND c.state='resolved'`,
      [u.access.companyId, 'incident_review', reviewId],
    )
  ).rowCount;
}
async function incidentBody(u: UnitOfWork, op: IncidentResolve) {
  const r = await incidentReview(u, op.incidentId);
  const wallet = new BrandWalletService(u, r.brand_id),
    before = await wallet.amounts(),
    readiness = await wallet.readiness();
  const holds = await reviewHolds(u, r),
    released = holds.reduce((t, h) => t + minor(h.amount, 'positive'), 0n).toString();
  const original = await brandOriginal(u, r.brand_id, r.lot_id);
  const blockers: string[] = [],
    warnings: string[] = [];
  if (op.actualDate > cairoDate(new Date())) blockers.push('FUTURE_ACTUAL_DATE');
  if (await resolvedAlready(u, r.review_id)) blockers.push('SETTLEMENT_ALREADY_RESOLVED');
  const delta = op.decision === 'correct_compensation' ? op.compensationDeltaMinor : '0';
  let after = walletAfter(before, { original, deltaMinor: '0', releasedHoldMinor: released }),
    compensationAfter = r.compensation_minor;
  if (op.decision === 'correct_compensation')
    try {
      compensationAfter = correctedAmount(
        r.compensation_minor,
        original.priorCorrectionsMinor,
        delta,
      );
      if (minor(compensationAfter) < minor(r.employee_share_minor, 'nonnegative'))
        blockers.push('COMPENSATION_BELOW_EMPLOYEE_SHARE');
      after = walletAfter(before, { original, deltaMinor: delta, releasedHoldMinor: released });
    } catch (e) {
      if (!(e instanceof AccessError)) throw e;
      blockers.push(e.code);
    }
  if (minor(after.signedEntitlementMinor) < 0n) warnings.push('BRAND_DEBT_AFTER_CORRECTION');
  const effects: PreviewBody['effects'] = holds.map((h) => ({
    ledger: 'hold' as const,
    kind: 'review_hold_release',
    label: 'إلغاء إيقاف مراجعة الحادث بعد التسوية',
    amountMinor: h.amount,
    quantity: null,
    effectiveDate: op.actualDate,
  }));
  if (op.decision === 'correct_compensation')
    effects.unshift(
      {
        ledger: 'brand',
        kind: 'correction',
        label: `تصحيح تعويض الحادث ${r.reference}`,
        amountMinor: delta,
        quantity: null,
        effectiveDate: op.actualDate,
      },
      {
        ledger: 'operating',
        kind: 'correction',
        label: `تصحيح تكلفة التعويض على فرع الحادث`,
        amountMinor: (-minor(delta)).toString(),
        quantity: null,
        effectiveDate: op.actualDate,
      },
    );
  const body: PreviewBody = {
    operation: 'incident.resolve',
    classification:
      op.decision === 'correct_compensation'
        ? 'incident_review_correction'
        : 'incident_review_retained',
    target: {
      kind: 'brand',
      id: r.brand_id,
      label: (await brandName(u, r.brand_id)) + ' · حادث ' + r.reference,
      branchId: r.responsible_branch_id,
      branchName: branchName(u, r.responsible_branch_id),
    },
    facts: [
      {
        key: 'compensation',
        unit: 'minor',
        before: r.compensation_minor,
        after: compensationAfter,
      },
      {
        key: 'employeeShare',
        unit: 'minor',
        before: r.employee_share_minor,
        after: r.employee_share_minor,
      },
      ...walletFacts(before, after),
    ],
    effects,
    dependents: await payoutDependents(u, r.lot_id),
    warnings,
    blockers,
    versions: [{ key: 'brand.wallet', version: readiness.revision }],
  };
  return { body, r, holds, original };
}
/**
 * P18 incident review resolution: keep the confirmed compensation, or post one linked compensation
 * correction plus its operating-cost correction at the incident branch. The employee share and
 * every payout stay; only the review's own hold is released.
 */
export const incidentResolveResolver: Resolver<IncidentResolve> = {
  operation: 'incident.resolve',
  targetKind: 'brand',
  capabilities: ['incidents', 'brand.payout'],
  allowedStates: 'A confirmed incident with a P18 review awaiting P21 and no prior resolution.',
  forbidden: [
    'second resolution of the same review — SETTLEMENT_ALREADY_RESOLVED',
    'compensation below the approved employee share — COMPENSATION_BELOW_EMPLOYEE_SHARE',
    'reversing paid allocations or inferring cash recovery',
  ],
  matches: (op): op is IncidentResolve => op.operation === 'incident.resolve',
  branchOf: async (u, op) => (await incidentReview(u, op.incidentId)).responsible_branch_id,
  preview: async (u, op) => {
    const r = await incidentReview(u, op.incidentId);
    await new JournalPosting(u).lock('operating', r.incident_id);
    await BrandWalletService.lock(u, [r.brand_id]);
    return (await incidentBody(u, op)).body;
  },
  confirm: async (u, op, ctx) => {
    const posting = new JournalPosting(u),
      entityId = randomUUID();
    const source = await posting.source(
      { system: 'settlement', identity: entityId, kind: 'incident.resolve', revision: '1' },
      { op, reason: ctx.reason },
    );
    const first = await incidentReview(u, op.incidentId);
    await posting.lock('operating', first.incident_id);
    await BrandWalletService.lock(u, [first.brand_id]);
    const { body, r, holds } = await incidentBody(u, op);
    const preview = await ctx.verify(body);
    if (await resolvedAlready(u, r.review_id)) throw rejection('SETTLEMENT_ALREADY_RESOLVED', {});
    await ctx.record({
      classification: body.classification,
      amountMinor: op.decision === 'correct_compensation' ? op.compensationDeltaMinor : null,
      quantity: null,
      sourceId: source.id,
    });
    const kernel = new BrandWalletService(u, r.brand_id).kernel;
    for (const h of holds) await kernel.releaseHold(h.id, source.id);
    if (op.decision === 'correct_compensation') {
      const effects: JournalEffect[] = [
        {
          family: 'brand',
          kind: 'correction',
          subjectId: r.brand_id,
          amountMinor: op.compensationDeltaMinor,
          branchId: r.responsible_branch_id,
          effectiveDate: op.actualDate,
          supersedesId: r.lot_id,
          reason: ctx.reason,
        },
        {
          family: 'operating',
          kind: 'correction',
          subjectId: r.incident_id,
          amountMinor: (-minor(op.compensationDeltaMinor)).toString(),
          branchId: r.responsible_branch_id,
          effectiveDate: op.actualDate,
          supersedesId: r.cost_effect_id,
          reason: ctx.reason,
        },
      ];
      const posted = await posting.append(source.id, ctx.recordId, effects);
      // Releasing this review's hold first lets a reduction consume the lot's free remainder.
      const refreshed = await brandOriginal(u, r.brand_id, r.lot_id);
      await applyBrandEffect(
        u,
        r.brand_id,
        { id: posted.ids[0]!, amountMinor: op.compensationDeltaMinor },
        refreshed,
      );
      ctx.link('result', 'brand_movement', posted.ids[0]!, 'تصحيح التعويض');
      ctx.link('result', 'operating_effect', posted.ids[1]!, 'تصحيح تكلفة الحادث');
      ctx.link('result', 'posting_batch', posted.batchId, 'دفعة الترحيل');
    }
    await ctx.hooks.fault?.('effects');
    ctx.link('original', 'incident', r.incident_id, 'حادث ' + r.reference);
    ctx.link('original', 'incident_review', r.review_id, 'مراجعة الحادث');
    for (const d of preview.dependents) ctx.link('dependent', d.kind, d.id, d.label);
    for (const h of holds) ctx.link('result', 'wallet_hold_release', h.id, 'إلغاء الإيقاف');
    return { state: 'resolved' };
  },
};
