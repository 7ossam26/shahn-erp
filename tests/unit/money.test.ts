import { describe, expect, it } from 'vitest';
import { parseEgpDecimal, egpDecimal, cairoDate, cairoDayRange, type Money } from '@shahn/domain';
describe('Exact EGP string money', () => {
  it('connects entered decimal to integer minor units and visible round trip', () => {
    const money = parseEgpDecimal('50.5');
    expect(money).toEqual({ currency: 'EGP', amountMinor: '5050' });
    expect(egpDecimal(money)).toBe('50.50');
    expect(parseEgpDecimal(egpDecimal(money))).toEqual(money);
    expect(parseEgpDecimal('0.01').amountMinor).toBe('1');
    expect(parseEgpDecimal('0.10').amountMinor).toBe('10');
    expect(parseEgpDecimal('-12.34').amountMinor).toBe('-1234');
  });
  it.each([
    '',
    ' ',
    ' 50.5',
    '01',
    '1e2',
    '+1',
    '1.234',
    '1.',
    'NaN',
    '٥٠٫٥',
    '-0',
    '-0.0',
    '-0.00',
  ])('rejects malformed decimal or negative zero %s', (value) =>
    expect(() => parseEgpDecimal(value)).toThrow(),
  );
  it('checks both PostgreSQL bigint boundaries without losing a piastre', () => {
    expect(parseEgpDecimal('92233720368547758.07').amountMinor).toBe('9223372036854775807');
    expect(parseEgpDecimal('-92233720368547758.08').amountMinor).toBe('-9223372036854775808');
    expect(() => parseEgpDecimal('92233720368547758.08')).toThrow('EGP_OVERFLOW');
    expect(() => parseEgpDecimal('-92233720368547758.09')).toThrow('EGP_OVERFLOW');
    expect(egpDecimal(parseEgpDecimal('92233720368547758.07'))).toBe('92233720368547758.07');
  });
  it.each([
    { currency: 'USD', amountMinor: '50' },
    { currency: 'EGP', amountMinor: '-0' },
    { currency: 'EGP', amountMinor: '01' },
    { currency: 'EGP', amountMinor: '1.5' },
    { currency: 'EGP', amountMinor: '9223372036854775808' },
  ])('rejects unsupported money %j', (money) => expect(() => egpDecimal(money as Money)).toThrow());
});
describe('UTC instants and Cairo calendars', () => {
  it('uses real Cairo winter and summer zone rules', () => {
    expect(cairoDate('2026-01-15T21:30:00Z')).toBe('2026-01-15');
    expect(cairoDate('2026-07-15T21:30:00Z')).toBe('2026-07-16');
    expect(cairoDayRange('2026-01-15')).toEqual({
      start: '2026-01-14T22:00:00.000Z',
      end: '2026-01-15T22:00:00.000Z',
    });
    expect(cairoDayRange('2026-07-15')).toEqual({
      start: '2026-07-14T21:00:00.000Z',
      end: '2026-07-15T21:00:00.000Z',
    });
  });
  it('handles a skipped midnight and rejects impossible or unzoned input', () => {
    const range = cairoDayRange('2026-04-24');
    expect(Date.parse(range.end) - Date.parse(range.start)).toBe(23 * 3600000);
    expect(cairoDate(range.start)).toBe('2026-04-24');
    expect(cairoDate(new Date(Date.parse(range.start) - 1))).toBe('2026-04-23');
    expect(() => cairoDayRange('2026-02-30')).toThrow();
    expect(() => cairoDate('2026-07-15T21:30:00')).toThrow();
  });
});
