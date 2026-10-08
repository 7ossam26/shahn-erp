import { AccessError } from '../access.js';
import { addMinor, minor, subtractMinor } from '../kernel.js';
import { addQuantity, wholeQuantity } from '../inventory/index.js';

/**
 * P21 typed settlement arithmetic (ERP-D-118/124/132/133, ERP-R-133/141/142). Pure rules only:
 * the owning services lock, validate scope and post the typed effects.
 */
export type ObservedCondition = 'sound' | 'unavailable';
export interface StockObservationResult {
  recorded: number;
  observed: number;
  delta: number;
  soundBefore: number;
  unavailableBefore: number;
  soundAfter: number;
  unavailableAfter: number;
  reserved: number;
  availableBefore: number;
  availableAfter: number;
  shortageBefore: number;
  shortageAfter: number;
}
/** Observed quantity for one condition against the locked position. Reserved is never forced down. */
export function stockObservation(input: {
  soundOnHand: number;
  unavailableOnHand: number;
  reserved: number;
  condition: ObservedCondition;
  observed: number;
}): StockObservationResult {
  const sound = wholeQuantity(input.soundOnHand),
    unavailable = wholeQuantity(input.unavailableOnHand),
    reserved = wholeQuantity(input.reserved),
    observed = wholeQuantity(input.observed);
  if (!['sound', 'unavailable'].includes(input.condition))
    throw new AccessError('INVALID_CONDITION', 400);
  const recorded = input.condition === 'sound' ? sound : unavailable;
  if (observed === recorded) throw new AccessError('NO_DIFFERENCE', 409);
  const soundAfter = input.condition === 'sound' ? observed : sound,
    unavailableAfter = input.condition === 'unavailable' ? observed : unavailable;
  addQuantity(soundAfter, unavailableAfter);
  return {
    recorded,
    observed,
    delta: observed - recorded,
    soundBefore: sound,
    unavailableBefore: unavailable,
    soundAfter,
    unavailableAfter,
    reserved,
    availableBefore: Math.max(sound - reserved, 0),
    availableAfter: Math.max(soundAfter - reserved, 0),
    shortageBefore: Math.max(reserved - sound, 0),
    shortageAfter: Math.max(reserved - soundAfter, 0),
  };
}
export interface AccountObservationResult {
  differenceMinor: string;
  holdMinor: string;
  surplusMinor: string;
}
/** Book versus observed actual. A shortage holds funds; a surplus never becomes spendable. */
export function accountObservation(
  bookMinor: string,
  observedMinor: string,
): AccountObservationResult {
  const book = minor(bookMinor, 'nonnegative'),
    observed = minor(observedMinor, 'nonnegative');
  if (book === observed) throw new AccessError('NO_DIFFERENCE', 409);
  const difference = subtractMinor(observed, book);
  return {
    differenceMinor: difference.toString(),
    holdMinor: (difference < 0n ? -difference : 0n).toString(),
    surplusMinor: (difference > 0n ? difference : 0n).toString(),
  };
}
/** Rolling position: later genuine movements change book; the unexplained hold amount does not. */
export function accountPosition(bookMinor: string, activeHoldMinor: string) {
  const book = minor(bookMinor, 'nonnegative'),
    hold = minor(activeHoldMinor, 'nonnegative'),
    estimated = subtractMinor(book, hold);
  return {
    bookMinor: book.toString(),
    holdMinor: hold.toString(),
    availableMinor: (estimated > 0n ? estimated : 0n).toString(),
    estimatedActualMinor: estimated.toString(),
  };
}
/** A linked correction keeps its original sign: credit cannot become debit or vice versa. */
export function correctedAmount(
  originalMinor: string,
  priorCorrectionsMinor: string,
  deltaMinor: string,
) {
  const original = minor(originalMinor),
    delta = minor(deltaMinor);
  if (original === 0n || delta === 0n) throw new AccessError('INVALID_CORRECTION_AMOUNT', 400);
  const after = addMinor(addMinor(original, minor(priorCorrectionsMinor)), delta);
  if ((original > 0n && after < 0n) || (original < 0n && after > 0n))
    throw new AccessError('CORRECTION_CHANGES_CLASS', 409);
  return after.toString();
}
/** Difference between the protected posted allocation and the accepted effective basis. */
export function sourceReviewDelta(
  previous: { goodsMinor: string; feeMinor: string },
  effective: { goodsMinor: string; feeMinor: string },
) {
  const goods = subtractMinor(
      minor(effective.goodsMinor, 'nonnegative'),
      minor(previous.goodsMinor, 'nonnegative'),
    ),
    fee = subtractMinor(
      minor(effective.feeMinor, 'nonnegative'),
      minor(previous.feeMinor, 'nonnegative'),
    );
  // Brand view: more goods credit is positive; a larger brand fee is a further brand debit.
  return { goodsDeltaMinor: goods.toString(), feeDeltaMinor: (-fee).toString() };
}
export const openingClassifications = [
  'account_balance',
  'brand_eligible_credit',
  'brand_pending_driver_held',
  'brand_debt',
  'employee_obligation',
  'employee_entitlement',
  'stock_sound',
  'stock_unavailable',
] as const;
export type OpeningClassification = (typeof openingClassifications)[number];
export interface OpeningTarget {
  classification: OpeningClassification;
  branchId: string;
  accountId?: string;
  brandId?: string;
  employeeId?: string;
  variantId?: string;
}
/** One opening per account, brand class, employee class or stock position/condition. */
export function openingTargetKey(t: OpeningTarget): string {
  switch (t.classification) {
    case 'account_balance':
      return 'account:' + t.accountId;
    case 'brand_eligible_credit':
    case 'brand_pending_driver_held':
    case 'brand_debt':
      return 'brand:' + t.brandId + ':' + t.classification;
    case 'employee_obligation':
    case 'employee_entitlement':
      return 'employee:' + t.employeeId + ':' + t.classification;
    case 'stock_sound':
    case 'stock_unavailable':
      return `stock:${t.branchId}:${t.brandId}:${t.variantId}:${t.classification}`;
    default:
      throw new AccessError('INVALID_OPENING_CLASSIFICATION', 400);
  }
}
/** Signed journal amount for a money opening line; openings never create operating facts. */
export function openingSignedMinor(classification: OpeningClassification, amountMinor: string) {
  const amount = minor(amountMinor, 'positive');
  if (classification === 'brand_debt' || classification === 'employee_obligation')
    return (-amount).toString();
  if (classification === 'stock_sound' || classification === 'stock_unavailable')
    throw new AccessError('INVALID_OPENING_CLASSIFICATION', 400);
  return amount.toString();
}
export function assertUniqueOpeningTargets(targets: readonly OpeningTarget[]) {
  if (!targets.length || targets.length > 200) throw new AccessError('VALIDATION_FAILED', 400);
  const keys = targets.map(openingTargetKey);
  if (new Set(keys).size !== keys.length) throw new AccessError('DUPLICATE_OPENING_TARGET', 409);
  return keys;
}
