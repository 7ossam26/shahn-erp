import { AccessError, minor, walletAmounts, type JournalEffect } from '@shahn/domain';
import type { BrandWalletAmounts, SettlementFact } from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { JournalPosting } from '../../kernel/journals.js';
import { BrandWalletService } from '../../finance/brand-wallet/wallet.service.js';

/** The original brand posting a linked correction supersedes, with its lot readiness. */
export interface BrandOriginal {
  id: string;
  kind: string;
  amountMinor: string;
  branchId: string;
  effectiveDate: string;
  sourceId: string;
  lot: null | {
    eligible: boolean;
    remainingMinor: string;
    heldMinor: string;
  };
  priorCorrectionsMinor: string;
}
export async function brandOriginal(u: UnitOfWork, brandId: string, effectId: string) {
  const row = (
    await u.client.query<{
      id: string;
      kind: string;
      amount_minor: string;
      branch_id: string;
      effective_date: string;
      source_id: string;
      lot_id: string | null;
      eligible: boolean | null;
      remaining: string | null;
      held: string | null;
      prior: string;
    }>(
      `SELECT e.id,e.kind,e.amount_minor::text,e.branch_id,e.effective_date::text,e.source_id,l.id AS lot_id,
       (l.readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release r WHERE r.company_id=l.company_id AND r.lot_id=l.id)) AS eligible,
       (l.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=l.company_id AND a.lot_id=l.id),0))::text AS remaining,
       COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=l.company_id AND h.lot_id=l.id
        AND NOT EXISTS(SELECT 1 FROM kernel.hold_release x WHERE x.company_id=h.company_id AND x.hold_id=h.id)),0)::text AS held,
       COALESCE((SELECT sum(c.amount_minor) FROM kernel.journal_effect c WHERE c.company_id=e.company_id AND c.supersedes_id=e.id AND c.family='brand'),0)::text AS prior
       FROM kernel.journal_effect e LEFT JOIN kernel.credit_lot l ON(l.company_id,l.id)=(e.company_id,e.id)
       WHERE e.company_id=$1 AND e.id=$2 AND e.family='brand' AND e.subject_id=$3`,
      [u.access.companyId, effectId, brandId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  return {
    id: row.id,
    kind: row.kind,
    amountMinor: row.amount_minor,
    branchId: row.branch_id,
    effectiveDate: row.effective_date,
    sourceId: row.source_id,
    lot: row.lot_id
      ? { eligible: !!row.eligible, remainingMinor: row.remaining!, heldMinor: row.held! }
      : null,
    priorCorrectionsMinor: row.prior,
  } satisfies BrandOriginal;
}
/** Deterministic projection of the shared-wallet formula after one typed linked change. */
export function walletAfter(
  before: BrandWalletAmounts,
  change: {
    original: BrandOriginal | null;
    deltaMinor: string;
    /** For an independent credit/new effect without original: its readiness. */
    readiness?: 'eligible' | 'pending';
    releasedHoldMinor?: string;
  },
) {
  let e = minor(before.eligibleMinor, 'nonnegative'),
    p = minor(before.pendingMinor, 'nonnegative'),
    d = minor(before.debitsMinor, 'nonnegative'),
    h = minor(before.heldMinor, 'nonnegative');
  const c = minor(before.coverMinor, 'nonnegative'),
    delta = minor(change.deltaMinor),
    released = minor(change.releasedHoldMinor ?? '0', 'nonnegative');
  h -= released;
  const lot = change.original?.lot ?? null;
  if (delta < 0n) {
    const amount = -delta;
    if (lot && !lot.eligible) {
      if (amount > minor(lot.remainingMinor, 'nonnegative'))
        throw new AccessError('PENDING_CORRECTION_EXCEEDS_LOT', 409);
      p -= amount;
    } else if (lot) {
      const lotHeld = minor(lot.heldMinor, 'nonnegative') - released;
      const free = minor(lot.remainingMinor, 'nonnegative') - (lotHeld > 0n ? lotHeld : 0n);
      const consumed = free > 0n ? (free < amount ? free : amount) : 0n;
      e -= consumed;
      d += amount - consumed;
    } else d += amount;
  } else if (delta > 0n) {
    const readiness =
      change.readiness ?? (lot ? (lot.eligible ? 'eligible' : 'pending') : 'eligible');
    if (readiness === 'pending') p += delta;
    else e += delta;
  }
  const a = walletAmounts(e, p, d, h < 0n ? 0n : h, c);
  return {
    ...before,
    eligibleMinor: a.eligible,
    pendingMinor: a.pending,
    debitsMinor: a.debits,
    heldMinor: a.held,
    signedEntitlementMinor: a.signedEntitlement,
    eligibleToPayMinor: a.eligibleToPay,
  } satisfies BrandWalletAmounts;
}
export function walletFacts(
  before: BrandWalletAmounts,
  after: BrandWalletAmounts,
): SettlementFact[] {
  return (
    [
      ['eligibleCredit', 'eligibleMinor'],
      ['pendingCredit', 'pendingMinor'],
      ['brandDebits', 'debitsMinor'],
      ['heldCredit', 'heldMinor'],
      ['signedEntitlement', 'signedEntitlementMinor'],
      ['eligibleToPay', 'eligibleToPayMinor'],
      ['paidToBrand', 'paidMinor'],
    ] as const
  ).map(([key, field]) => ({ key, unit: 'minor', before: before[field], after: after[field] }));
}
/** Apply one linked brand effect and its lot consequence through the P03/P17 wallet APIs only. */
export async function applyBrandEffect(
  u: UnitOfWork,
  brandId: string,
  effect: { id: string; amountMinor: string },
  original: BrandOriginal | null,
  readiness?: 'eligible' | 'pending',
) {
  const kernel = new BrandWalletService(u, brandId).kernel,
    amount = minor(effect.amountMinor);
  const lot = original?.lot ?? null;
  if (amount > 0n)
    await kernel.credit(
      effect.id,
      readiness ?? (lot ? (lot.eligible ? 'eligible' : 'pending') : 'eligible'),
    );
  else if (lot && !lot.eligible)
    await kernel.cancelPendingCredit(original!.id, effect.id, (-amount).toString());
  else if (lot) await kernel.allocateCorrection(original!.id, effect.id);
}
export async function appendBrand(
  u: UnitOfWork,
  sourceId: string,
  recordId: string,
  effects: JournalEffect[],
) {
  return new JournalPosting(u).append(sourceId, recordId, effects);
}
