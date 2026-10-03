import { AccessError } from './access.js';

export const MIN_MINOR = -9223372036854775808n;
export const MAX_MINOR = 9223372036854775807n;
export type MoneySign = 'signed' | 'nonnegative' | 'positive';
export function checkedMinor(value: bigint): bigint {
  if (value < MIN_MINOR || value > MAX_MINOR) throw new AccessError('MONEY_OVERFLOW', 400);
  return value;
}
export function minor(value: unknown, sign: MoneySign = 'signed'): bigint {
  const pattern =
    sign === 'positive'
      ? /^[1-9][0-9]*$/
      : sign === 'nonnegative'
        ? /^(0|[1-9][0-9]*)$/
        : /^(0|-?[1-9][0-9]*)$/;
  if (typeof value !== 'string' || value.length > 20 || !pattern.test(value))
    throw new AccessError('INVALID_MONEY', 400);
  return checkedMinor(BigInt(value));
}
export const addMinor = (a: bigint, b: bigint) => checkedMinor(checkedMinor(a) + checkedMinor(b));
export const subtractMinor = (a: bigint, b: bigint) =>
  checkedMinor(checkedMinor(a) - checkedMinor(b));
export const multiplyMinor = (a: bigint, b: bigint) =>
  checkedMinor(checkedMinor(a) * checkedMinor(b));
export interface WalletAmounts {
  eligible: string;
  pending: string;
  debits: string;
  held: string;
  cover: string;
  signedEntitlement: string;
  eligibleToPay: string;
}
export function walletAmounts(
  e: bigint,
  p: bigint,
  d: bigint,
  h: bigint,
  c: bigint,
): WalletAmounts {
  for (const amount of [e, p, d, h, c]) minor(amount.toString(), 'nonnegative');
  const payable = subtractMinor(subtractMinor(subtractMinor(e, d), h), c);
  return {
    eligible: e.toString(),
    pending: p.toString(),
    debits: d.toString(),
    held: h.toString(),
    cover: c.toString(),
    signedEntitlement: subtractMinor(addMinor(e, p), d).toString(),
    eligibleToPay: (payable > 0n ? payable : 0n).toString(),
  };
}

/** Fixed semantic classes; a source owner selects one, never the browser. */
export const journalKinds = {
  brand: {
    goods: 'positive',
    compensation: 'positive',
    fee: 'negative',
    payout: 'negative',
    correction: 'signed',
    opening: 'signed',
  },
  money: {
    receipt: 'positive',
    payment: 'negative',
    transfer_in: 'positive',
    transfer_out: 'negative',
    correction: 'signed',
    opening: 'signed',
  },
  employee: {
    earning: 'positive',
    obligation: 'positive',
    recovery: 'negative',
    correction: 'signed',
  },
  operating: {
    shipping: 'positive',
    storage: 'positive',
    cost: 'negative',
    waiver: 'negative',
    correction: 'signed',
  },
  storage: {
    receipt: 'positive',
    allocation: 'negative',
    refund: 'negative',
    correction: 'signed',
  },
} as const;
export type JournalFamily = keyof typeof journalKinds;
export type JournalEffect = {
  [F in JournalFamily]: {
    family: F;
    kind: keyof (typeof journalKinds)[F];
    subjectId: string;
    amountMinor: string;
    branchId: string;
    effectiveDate: string;
    supersedesId: string | null;
    reason: string | null;
  };
}[JournalFamily];
export function validateEffect(effect: JournalEffect): bigint {
  const kinds: Readonly<Record<string, string>> = journalKinds[effect.family];
  const sign = kinds?.[effect.kind];
  if (!sign) throw new AccessError('INVALID_JOURNAL_KIND', 400);
  const amount = minor(effect.amountMinor);
  if (amount === 0n || (sign === 'positive' && amount < 0n) || (sign === 'negative' && amount > 0n))
    throw new AccessError('INVALID_JOURNAL_SIGN', 400);
  if (effect.kind === 'correction' && (!effect.supersedesId || !effect.reason?.trim()))
    throw new AccessError('CORRECTION_LINK_REQUIRED', 400);
  return amount;
}
export type WorkOutcome =
  { kind: 'success' } | { kind: 'retryable' | 'definite' | 'unknown'; code: string };
export function workState(outcome: WorkOutcome): 'ready' | 'failed' | 'pending' {
  if (outcome.kind !== 'success' && !/^[A-Z][A-Z0-9_]{0,79}$/.test(outcome.code))
    throw new AccessError('UNSAFE_DIAGNOSTIC', 400);
  return outcome.kind === 'success' ? 'ready' : outcome.kind === 'definite' ? 'failed' : 'pending';
}
