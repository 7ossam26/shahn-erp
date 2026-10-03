const MAX_MINOR = 9223372036854775807n;
const MIN_MINOR = -9223372036854775808n;
export interface Money {
  currency: 'EGP';
  amountMinor: string;
}

/** Exact decimal conversion, without Number arithmetic or rounding. */
export function parseEgpDecimal(value: string): Money {
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) throw new Error('INVALID_EGP_DECIMAL');
  const negative = value.startsWith('-');
  const [whole = '', fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const absolute = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (negative && absolute === 0n) throw new Error('NEGATIVE_ZERO');
  const minor = negative ? -absolute : absolute;
  if (minor > MAX_MINOR || minor < MIN_MINOR) throw new Error('EGP_OVERFLOW');
  return { currency: 'EGP', amountMinor: minor.toString() };
}

export function egpDecimal(money: Money): string {
  if (money.currency !== 'EGP' || !/^(?:0|-?[1-9]\d*)$/.test(money.amountMinor))
    throw new Error('INVALID_MONEY');
  const minor = BigInt(money.amountMinor);
  if (minor > MAX_MINOR || minor < MIN_MINOR) throw new Error('EGP_OVERFLOW');
  const absolute = minor < 0n ? -minor : minor;
  return `${minor < 0n ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

const cairo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export function cairoDate(instant: string | Date): string {
  if (typeof instant === 'string' && !/(?:Z|[+-]\d{2}:\d{2})$/.test(instant))
    throw new Error('INSTANT_REQUIRES_ZONE');
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID_INSTANT');
  const parts = cairo.formatToParts(date);
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join('-');
}

/** First instant in a Cairo date, including dates whose midnight is skipped by DST. */
export function cairoDayRange(day: string): { start: string; end: string } {
  const base = new Date(`${day}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(base.getTime()) ||
    base.toISOString().slice(0, 10) !== day
  )
    throw new Error('INVALID_CALENDAR_DATE');
  const firstInstant = (target: string, center: number) => {
    let low = center - 36 * 3600000;
    let high = center + 36 * 3600000;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (cairoDate(new Date(middle)) < target) low = middle + 1;
      else high = middle;
    }
    return new Date(low).toISOString();
  };
  const next = new Date(base.getTime() + 86400000);
  return {
    start: firstInstant(day, base.getTime()),
    end: firstInstant(next.toISOString().slice(0, 10), next.getTime()),
  };
}
