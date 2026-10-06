import { describe, it, expect } from 'vitest';
import {
  AccessError,
  cairoDate,
  changeEffectiveIndex,
  firstBillableIndex,
  isOverdue,
  nextDuePeriod,
  periodIndexOn,
  periodOutstanding,
  periodPaymentStatus,
  periodRange,
  periodStart,
  planStorageAllocations,
  planStorageRefundSources,
  revisionFor,
  stopBoundary,
  unallocatedCredit,
} from '@shahn/domain';

/** Checkpoint 1: calendar and accounting rules proven before any persistence or renewal. */
describe('P19 anniversary calendar (ERP-D-192 / ERP-R-201, DOM-15)', () => {
  it('January 20 covers January 20 through February 19 as a half-open local range', () => {
    expect(periodRange('2027-01-20', 20, 0)).toEqual({
      index: 0,
      startDate: '2027-01-20',
      nextStartDate: '2027-02-20',
      endDate: '2027-02-19',
      dueDate: '2027-01-20',
    });
  });
  it('anchor 31 clamps to February and restores March 31 from the original anchor', () => {
    const starts = [0, 1, 2, 3, 4, 12, 13].map((i) => periodStart('2027-01-31', 31, i));
    expect(starts).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
      '2027-05-31',
      '2028-01-31',
      '2028-02-29',
    ]);
    // Repeatedly adding one month to the clamped February date would drift to March 28.
    expect(periodStart('2027-01-31', 31, 2)).not.toBe('2027-03-28');
  });
  it('handles leap and century rules without permanent drift', () => {
    expect(periodStart('2028-01-31', 31, 1)).toBe('2028-02-29');
    expect(periodStart('2028-02-29', 29, 12)).toBe('2029-02-28');
    expect(periodStart('2028-02-29', 29, 13)).toBe('2029-03-29');
    expect(periodStart('2028-02-29', 29, 48)).toBe('2032-02-29');
    expect(periodStart('2099-12-31', 31, 2)).toBe('2100-02-28');
    expect(periodStart('2399-12-30', 30, 2)).toBe('2400-02-29');
  });
  it('produces unique, contiguous, non-overlapping periods over long runs', () => {
    for (const [start, anchor] of [
      ['2027-01-31', 31],
      ['2027-01-30', 30],
      ['2028-02-29', 29],
      ['2027-01-20', 20],
    ] as const) {
      let previous = periodRange(start, anchor, 0);
      for (let i = 1; i < 240; i++) {
        const current = periodRange(start, anchor, i);
        expect(current.startDate).toBe(previous.nextStartDate);
        expect(current.startDate > previous.startDate).toBe(true);
        expect(Number(current.startDate.slice(8))).toBe(
          Math.min(
            anchor,
            new Date(
              Date.UTC(+current.startDate.slice(0, 4), +current.startDate.slice(5, 7), 0),
            ).getUTCDate(),
          ),
        );
        expect(periodIndexOn(start, anchor, current.startDate)).toBe(i);
        expect(periodIndexOn(start, anchor, current.endDate)).toBe(i);
        previous = current;
      }
    }
  });
  it('rejects a start date whose day is not the anchor, impossible dates and unsafe indexes', () => {
    expect(() => periodStart('2027-01-30', 31, 0)).toThrow('INVALID_STORAGE_ANCHOR');
    expect(() => periodStart('2027-02-30', 30, 0)).toThrow('INVALID_CALENDAR_DATE');
    expect(() => periodStart('2027-01-31', 31, -1)).toThrow('INVALID_STORAGE_PERIOD_INDEX');
    expect(() => periodStart('2027-01-31', 31, 1.5)).toThrow('INVALID_STORAGE_PERIOD_INDEX');
    expect(() => periodStart('2027-01-31', 31, 12001)).toThrow('INVALID_STORAGE_PERIOD_INDEX');
  });
  it('uses the Cairo calendar date, including summer time, never a fixed UTC offset', () => {
    // Winter: UTC+2. 22:30Z on January 19 is already January 20 in Cairo.
    expect(cairoDate('2027-01-19T22:30:00Z')).toBe('2027-01-20');
    expect(cairoDate('2027-01-19T21:59:59Z')).toBe('2027-01-19');
    // Summer: UTC+3. 21:30Z is 00:30 the next local day; a fixed +2 offset would say 23:30.
    expect(cairoDate('2027-07-19T21:30:00Z')).toBe('2027-07-20');
    expect(cairoDate('2027-07-19T20:59:59Z')).toBe('2027-07-19');
  });
});

describe('generation, stop and prospective terms', () => {
  const schedule = {
    startDate: '2027-01-31',
    anchorDay: 31,
    firstBillableIndex: 0,
    stopBoundary: null,
    lastGeneratedIndex: null,
  };
  it('generates a period only when its start date has arrived, one boundary at a time', () => {
    expect(nextDuePeriod(schedule, '2027-01-30')).toBeNull();
    expect(nextDuePeriod(schedule, '2027-01-31')?.index).toBe(0);
    expect(nextDuePeriod({ ...schedule, lastGeneratedIndex: 0 }, '2027-02-27')).toBeNull();
    expect(nextDuePeriod({ ...schedule, lastGeneratedIndex: 0 }, '2027-02-28')?.startDate).toBe(
      '2027-02-28',
    );
    // Catch-up after downtime still yields one period per call, oldest first.
    expect(nextDuePeriod(schedule, '2027-06-15')?.index).toBe(0);
    expect(nextDuePeriod({ ...schedule, lastGeneratedIndex: 3 }, '2027-06-15')?.startDate).toBe(
      '2027-05-31',
    );
    expect(nextDuePeriod({ ...schedule, lastGeneratedIndex: 4 }, '2027-06-15')).toBeNull();
  });
  it('stop protects the current period and prevents any period at or after its boundary', () => {
    expect(stopBoundary('2027-01-31', 31, '2027-02-10')).toBe('2027-02-28');
    expect(stopBoundary('2027-01-31', 31, '2027-02-28')).toBe('2027-03-31');
    const stopped = { ...schedule, stopBoundary: '2027-02-28', lastGeneratedIndex: 0 };
    expect(nextDuePeriod(stopped, '2027-12-31')).toBeNull();
    // A future agreement stopped before its first period never earns a charge.
    const future = stopBoundary('2027-01-31', 31, '2026-12-01');
    expect(future).toBe('2027-01-31');
    expect(nextDuePeriod({ ...schedule, stopBoundary: future }, '2027-03-01')).toBeNull();
    // Worker downtime: the current-by-date period is still protected and generated.
    expect(
      nextDuePeriod(
        { ...schedule, stopBoundary: '2027-03-31', lastGeneratedIndex: 0 },
        '2027-03-05',
      )?.startDate,
    ).toBe('2027-02-28');
  });
  it('a price/branch change applies from the next period and preserves earlier snapshots', () => {
    // DOM-15: change entered during January's period applies from the February renewal.
    expect(changeEffectiveIndex('2027-01-31', 31, '2027-02-10')).toBe(1);
    expect(changeEffectiveIndex('2027-01-31', 31, '2026-12-01')).toBe(0);
    const revisions = [
      { revision: 1, effectivePeriodIndex: 0, feeMinor: '31000', branchId: 'A' },
      { revision: 2, effectivePeriodIndex: 1, feeMinor: '35000', branchId: 'A' },
      { revision: 3, effectivePeriodIndex: 1, feeMinor: '36000', branchId: 'B' },
      { revision: 4, effectivePeriodIndex: 3, feeMinor: '40000', branchId: 'B' },
    ];
    expect(revisionFor(revisions, 0).feeMinor).toBe('31000');
    expect(revisionFor(revisions, 1)).toMatchObject({ feeMinor: '36000', branchId: 'B' });
    expect(revisionFor(revisions, 2).feeMinor).toBe('36000');
    expect(revisionFor(revisions, 3).feeMinor).toBe('40000');
    expect(() => revisionFor([], 0)).toThrow('STORAGE_TERMS_MISSING');
  });
  it('earlier anniversary periods before a backdated entry are historical, not auto-earned', () => {
    expect(firstBillableIndex('2027-01-20', 20, '2027-01-20')).toBe(0);
    expect(firstBillableIndex('2027-01-20', 20, '2026-12-01')).toBe(0);
    expect(firstBillableIndex('2027-01-20', 20, '2027-01-21')).toBe(1);
    expect(firstBillableIndex('2026-01-31', 31, '2026-10-07')).toBe(9);
    expect(periodStart('2026-01-31', 31, 9)).toBe('2026-10-31');
  });
});

describe('exact storage money (ERP-D-201/204, DOM-21/22, AC-R-213)', () => {
  it('Example A: fee 310 from January 20 and partial receipt 100 leave 210 due', () => {
    const plan = planStorageAllocations(
      [{ id: 'p1', dueDate: '2027-01-20', outstandingMinor: '31000' }],
      [{ id: 'r1', actualDate: '2027-01-25', unallocatedMinor: '10000' }],
    );
    expect(plan.allocations).toEqual([{ periodId: 'p1', receiptId: 'r1', amountMinor: '10000' }]);
    expect(plan.outstandingAfter['p1']).toBe('21000');
    expect(periodOutstanding('31000', '0', '10000')).toBe(21000n);
    expect(periodPaymentStatus(31000n, 21000n)).toBe('partial');
    // Revenue is the complete fee at the period start; it is a separate fact from cash.
    const revenue = { january: 31000n, february: 0n };
    expect(revenue.january + revenue.february).toBe(31000n);
  });
  it('Example B: advance 500 before start, then period 310: credit 190, no new cash', () => {
    const before = unallocatedCredit('50000', '0', '0', '0');
    expect(before).toBe(50000n);
    const plan = planStorageAllocations(
      [{ id: 'p1', dueDate: '2027-02-01', outstandingMinor: '31000' }],
      [{ id: 'r1', actualDate: '2027-01-10', unallocatedMinor: '50000' }],
    );
    expect(plan.totalMinor).toBe('31000');
    expect(plan.unallocatedAfter['r1']).toBe('19000');
    expect(unallocatedCredit('50000', '0', plan.totalMinor, '0')).toBe(19000n);
    expect(periodPaymentStatus(31000n, 0n)).toBe('paid');
  });
  it('AC-R-213: receipt 400 against a 1000 period leaves 600 due', () => {
    const plan = planStorageAllocations(
      [{ id: 'p', dueDate: '2027-01-01', outstandingMinor: '100000' }],
      [{ id: 'r', actualDate: '2027-01-02', unallocatedMinor: '40000' }],
    );
    expect(plan.outstandingAfter['p']).toBe('60000');
  });
  it('allocates oldest due date then period ID, consuming lots by receipt date then ID', () => {
    const plan = planStorageAllocations(
      [
        { id: 'p-b', dueDate: '2027-02-20', outstandingMinor: '31000' },
        { id: 'p-z', dueDate: '2027-01-20', outstandingMinor: '31000' },
        { id: 'p-a', dueDate: '2027-02-20', outstandingMinor: '31000' },
      ],
      [
        { id: 'r-2', actualDate: '2027-03-01', unallocatedMinor: '20000' },
        { id: 'r-1', actualDate: '2027-02-25', unallocatedMinor: '25000' },
      ],
    );
    expect(plan.allocations).toEqual([
      { periodId: 'p-z', receiptId: 'r-1', amountMinor: '25000' },
      { periodId: 'p-z', receiptId: 'r-2', amountMinor: '6000' },
      { periodId: 'p-a', receiptId: 'r-2', amountMinor: '14000' },
    ]);
    expect(plan.outstandingAfter).toEqual({ 'p-z': '0', 'p-a': '17000', 'p-b': '31000' });
  });
  it('a surplus remains unallocated advance credit; no allocation without credit or dues', () => {
    expect(
      planStorageAllocations([], [{ id: 'r', actualDate: '2027-01-01', unallocatedMinor: '100' }])
        .unallocatedAfter,
    ).toEqual({ r: '100' });
    expect(
      planStorageAllocations([{ id: 'p', dueDate: '2027-01-01', outstandingMinor: '100' }], [])
        .allocations,
    ).toEqual([]);
  });
  it('refund draws only unallocated credit and never goes negative', () => {
    const lots = [
      { id: 'r-2', actualDate: '2027-02-01', unallocatedMinor: '3000' },
      { id: 'r-1', actualDate: '2027-01-01', unallocatedMinor: '2000' },
      { id: 'r-0', actualDate: '2026-12-01', unallocatedMinor: '0' },
    ];
    expect(planStorageRefundSources(lots, '4000')).toEqual([
      { receiptId: 'r-1', amountMinor: '2000' },
      { receiptId: 'r-2', amountMinor: '2000' },
    ]);
    expect(() => planStorageRefundSources(lots, '5001')).toThrow('INSUFFICIENT_STORAGE_CREDIT');
    expect(() => unallocatedCredit('100', '0', '80', '30')).toThrow('STORAGE_CREDIT_NEGATIVE');
    expect(() => periodOutstanding('100', '0', '101')).toThrow('STORAGE_PERIOD_OVER_ALLOCATED');
  });
  it('uses exact bigint integer piastres; floats, signs and unsafe input are rejected', () => {
    const big = '9000000000000000000';
    expect(periodOutstanding(big, '0', '1')).toBe(8999999999999999999n);
    for (const bad of ['1.5', '-1', '+1', '01', '1e3', ' 1', '99999999999999999999'])
      expect(() => planStorageRefundSources([], bad)).toThrow(AccessError);
  });
  it('marks overdue only after the due date with a remaining charge', () => {
    expect(isOverdue(1n, '2027-01-20', '2027-01-20')).toBe(false);
    expect(isOverdue(1n, '2027-01-20', '2027-01-21')).toBe(true);
    expect(isOverdue(0n, '2027-01-20', '2027-03-01')).toBe(false);
  });
});
