import { describe, it, expect } from 'vitest';
import {
  openApi,
  brandPayoutExamples,
  validateBrandPayoutCommand,
  validateBrandPayoutPreviewInput,
  validateBrandPayoutFilter,
  validateBrandDuesFilter,
  validateWalletStatementFilter,
  validatePayoutCalendarFilter,
  validateBrandWalletViews,
  validateBrandPayoutViews,
  type DispatchPrice,
} from '@shahn/contracts';
import type { OutcomeRecord } from '@shahn/contracts/execution';
import { walletAmounts } from '@shahn/domain';
import { commercialAllocation } from '../../../apps/api/src/modules/execution/visit-facts.service.js';
import { amountsFromTotals } from '../../../apps/api/src/modules/finance/brand-wallet/queries.js';
import {
  addDays,
  nextPayoutDate,
  walletReasons,
  weekdayOf,
} from '../../../apps/api/src/modules/finance/brand-wallet/wallet.service.js';
const command = brandPayoutExamples.command;
describe('P17 closed payout contracts', () => {
  it('accepts the documented commands and rejects client-supplied eligibility or wallet totals', () => {
    expect(validateBrandPayoutCommand(command)).toBe(true);
    expect(validateBrandPayoutCommand(brandPayoutExamples.offDayCommand)).toBe(true);
    for (const forged of [
      { eligible: true },
      { readiness: 'eligible' },
      { eligibleToPayMinor: '10000' },
      { holdIds: [] },
      { allocations: [] },
    ])
      expect(validateBrandPayoutCommand({ ...command, ...forged })).toBe(false);
  });
  it('requires positive integer piastres and rejects floats, signs, zero and leading zeroes', () => {
    for (const amountMinor of ['0', '-1', '+1', '01', '1.5', '1e3', ' 1', '10000000000000000000'])
      expect(validateBrandPayoutCommand({ ...command, amountMinor })).toBe(false);
    expect(validateBrandPayoutCommand({ ...command, amountMinor: '1' })).toBe(true);
  });
  it('keeps the transfer reference optional and the off-day reason meaningful', () => {
    const { externalReference: _r, ...noReference } = brandPayoutExamples.offDayCommand;
    expect(validateBrandPayoutCommand(noReference)).toBe(true);
    for (const offDayReason of ['', '   ', '\u0000سبب'])
      expect(validateBrandPayoutCommand({ ...command, offDayReason })).toBe(false);
    expect(validateBrandPayoutCommand({ ...command, externalReference: 'line\nbreak' })).toBe(
      false,
    );
    expect(validateBrandPayoutCommand({ ...command, externalReference: 'x'.repeat(121) })).toBe(
      false,
    );
  });
  it('requires a readiness revision and supported Cash/Bank deposit/InstaPay methods only', () => {
    const { expectedReadinessRevision: _e, ...missing } = command;
    expect(validateBrandPayoutCommand(missing)).toBe(false);
    expect(validateBrandPayoutCommand({ ...command, method: 'card' })).toBe(false);
    for (const method of ['cash', 'bank_deposit', 'instapay'])
      expect(validateBrandPayoutCommand({ ...command, method })).toBe(true);
    const {
      schemaVersion: _s,
      type: _t,
      commandId: _c,
      expectedReadinessRevision: _x,
      ...scope
    } = command;
    expect(validateBrandPayoutPreviewInput(scope)).toBe(true);
    expect(validateBrandPayoutPreviewInput({ ...scope, offDayReason: 'x' })).toBe(false);
  });
  it('closes every list filter and rejects unknown filters', () => {
    const companyId = command.companyId;
    expect(validateBrandPayoutFilter({ companyId, dateBasis: 'recorded', offDay: 'true' })).toBe(
      true,
    );
    expect(validateBrandPayoutFilter({ companyId, amount: '1' })).toBe(false);
    expect(validateBrandDuesFilter({ companyId, state: 'payable', scheduled: 'today' })).toBe(true);
    expect(validateBrandDuesFilter({ companyId, state: 'eligible' })).toBe(false);
    expect(validateWalletStatementFilter({ companyId, kind: 'payout', basis: 'paying' })).toBe(
      true,
    );
    expect(validatePayoutCalendarFilter({ companyId, from: '2026-10-01' })).toBe(false);
  });
  it('publishes closed OpenAPI paths for every P17 route', () => {
    const paths = Object.keys(openApi.paths as object).filter((p) =>
      /brand-(wallets|payouts)/.test(p),
    );
    expect(paths.sort()).toEqual(
      [
        '/api/v1/finance/brand-payouts',
        '/api/v1/finance/brand-payouts/catalog',
        '/api/v1/finance/brand-payouts/commands',
        '/api/v1/finance/brand-payouts/commands/{commandId}',
        '/api/v1/finance/brand-payouts/preview',
        '/api/v1/finance/brand-payouts/{payoutId}',
        '/api/v1/finance/brand-wallets',
        '/api/v1/finance/brand-wallets/calendar',
        '/api/v1/finance/brand-wallets/{brandId}',
        '/api/v1/finance/brand-wallets/{brandId}/lots',
        '/api/v1/finance/brand-wallets/{brandId}/statement',
      ].sort(),
    );
    const post = (
      openApi.paths as Record<
        string,
        {
          post: {
            requestBody: { content: Record<string, { schema: { additionalProperties: boolean } }> };
          };
        }
      >
    )['/api/v1/finance/brand-payouts/commands']!.post;
    expect(post.requestBody.content['application/json']!.schema.additionalProperties).toBe(false);
  });
  it('rejects a view that hides a hold or reports a negative payable', () => {
    const amounts = {
      eligibleMinor: '10000',
      pendingMinor: '0',
      debitsMinor: '0',
      heldMinor: '0',
      coverMinor: '0',
      signedEntitlementMinor: '10000',
      eligibleToPayMinor: '10000',
      paidMinor: '0',
    };
    const { heldMinor: _h, ...hidden } = amounts;
    const dues = (a: unknown) =>
      validateBrandWalletViews.dues({
        items: [
          {
            brandId: command.brandId,
            brandName: 'ب',
            active: true,
            payoutWeekdays: [0],
            scheduledToday: true,
            nextPayoutDate: '2026-10-04',
            amounts: a,
            reasons: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 25,
        today: '2026-10-04',
      });
    expect(dues(amounts)).toBe(true);
    expect(dues(hidden)).toBe(false);
    expect(dues({ ...amounts, eligibleToPayMinor: '-1' })).toBe(false);
    expect(
      validateBrandPayoutViews.error({
        code: 'WALLET_CHANGED',
        correlationId: command.commandId,
        details: { amounts },
      }),
    ).toBe(true);
  });
});
describe('P17 wallet formula against the approved lot model', () => {
  const price = (goodsDueMinor: string, recipientShippingMinor: string, tariffMinor = '5000') =>
    ({ tariffMinor, waiverMinor: '0', goodsDueMinor, recipientShippingMinor }) as DispatchPrice;
  const outcome = (goods: number, shipping: number, kind: OutcomeRecord['outcome'] = 'full') =>
    ({
      outcome: kind,
      collection: {
        reported: { currency: 'EGP', exponent: 2, amountMinor: goods + shipping },
        goods: { currency: 'EGP', exponent: 2, amountMinor: goods },
        shipping: { currency: 'EGP', exponent: 2, amountMinor: shipping },
      },
    }) as unknown as OutcomeRecord;
  it('goods 250 + recipient shipping 50: brand credit 250 and no second shipping deduction', () => {
    expect(commercialAllocation(price('25000', '5000'), outcome(25000, 5000))).toEqual({
      goods: '25000',
      fee: '0',
    });
  });
  it('goods and shipping prepaid to the brand: zero goods credit and one brand shipping debit', () => {
    expect(commercialAllocation(price('0', '0'), outcome(0, 0))).toEqual({
      goods: '0',
      fee: '5000',
    });
  });
  it('rejects a double shipping collection that would exceed the tariff instead of debiting twice', () => {
    expect(() => commercialAllocation(price('25000', '5000'), outcome(25000, 10000))).toThrow(
      'OUTCOME_PRICE_CONFLICT',
    );
  });
  it('pending credit with debt: signed 200, payable 0; after release payable 200', () => {
    expect(walletAmounts(0n, 25000n, 5000n, 0n, 0n)).toMatchObject({
      signedEntitlement: '20000',
      eligibleToPay: '0',
    });
    expect(walletAmounts(25000n, 0n, 5000n, 0n, 0n)).toMatchObject({
      signedEntitlement: '20000',
      eligibleToPay: '20000',
    });
  });
  it('held credit and shipping cover are encumbrances, not spendable credit', () => {
    expect(walletAmounts(10000n, 0n, 0n, 10000n, 0n).eligibleToPay).toBe('0');
    expect(walletAmounts(10000n, 0n, 0n, 0n, 5000n).eligibleToPay).toBe('5000');
  });
  it('a consumed lot is removed once by allocation; the payout is not subtracted again', () => {
    // Lot 250, payout allocation 100 → remaining E = 150; paid history is shown separately.
    const after = amountsFromTotals({
      brand_id: 'b',
      e: '15000',
      p: '0',
      h: '0',
      d: '0',
      c: '0',
      paid: '10000',
    });
    expect(after).toMatchObject({
      eligibleMinor: '15000',
      eligibleToPayMinor: '15000',
      signedEntitlementMinor: '15000',
      paidMinor: '10000',
    });
  });
  it('clamps payable at zero while the signed entitlement keeps the debt visible', () => {
    expect(
      amountsFromTotals({ brand_id: 'b', e: '1000', p: '0', h: '0', d: '6000', c: '0', paid: '0' }),
    ).toMatchObject({ signedEntitlementMinor: '-5000', eligibleToPayMinor: '0' });
    expect(
      walletReasons(
        amountsFromTotals({
          brand_id: 'b',
          e: '1000',
          p: '0',
          h: '0',
          d: '6000',
          c: '0',
          paid: '0',
        }),
      ),
    ).toEqual(['DEBT']);
  });
  it('rejects unsafe intermediate values instead of losing precision', () => {
    expect(() => walletAmounts(9223372036854775807n, 1n, 0n, 0n, 0n)).toThrow('MONEY_OVERFLOW');
  });
});
describe('P17 agreed weekday calendar', () => {
  it('uses Sunday = 0 like brand setup and finds the next agreed day', () => {
    expect(weekdayOf('2024-01-07')).toBe(0);
    expect(weekdayOf('2024-01-13')).toBe(6);
    expect(nextPayoutDate('2024-01-07', [0])).toBe('2024-01-07');
    expect(nextPayoutDate('2024-01-08', [0, 3])).toBe('2024-01-10');
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01');
  });
  it('explains why money is not payable', () => {
    expect(
      walletReasons({
        eligibleMinor: '10000',
        pendingMinor: '25000',
        debitsMinor: '0',
        heldMinor: '5000',
        coverMinor: '5000',
        signedEntitlementMinor: '35000',
        eligibleToPayMinor: '0',
        paidMinor: '0',
      }),
    ).toEqual(['PENDING_REMITTANCE', 'HELD_FOR_REVIEW', 'SHIPPING_COVER']);
  });
});
