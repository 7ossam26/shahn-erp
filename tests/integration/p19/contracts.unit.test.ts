import { describe, expect, it } from 'vitest';
import {
  openApi,
  storageExamples,
  validateStorageAgreementFilter,
  validateStoragePaymentCommand,
  validateStoragePaymentPreviewInput,
  validateStorageRefundCommand,
  validateStorageStopCommand,
  validateStorageViews,
} from '@shahn/contracts';
describe('P19 closed storage contracts', () => {
  it('accepts the documented partial, advance, refund and stop examples', () => {
    expect(validateStoragePaymentCommand(storageExamples.partialPayment)).toBe(true);
    expect(validateStoragePaymentCommand(storageExamples.advancePayment)).toBe(true);
    expect(validateStorageRefundCommand(storageExamples.refund)).toBe(true);
    expect(validateStorageStopCommand(storageExamples.stop)).toBe(true);
  });
  it('rejects client-supplied revenue, allocations, periods or credit totals', () => {
    for (const forged of [
      { allocations: [] },
      { periodId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c75' },
      { revenueMinor: '31000' },
      { unallocatedCreditMinor: '0' },
      { walletBrandId: storageExamples.partialPayment.brandId },
    ]) {
      expect(validateStoragePaymentCommand({ ...storageExamples.partialPayment, ...forged })).toBe(
        false,
      );
      expect(validateStorageRefundCommand({ ...storageExamples.refund, ...forged })).toBe(false);
    }
  });
  it('requires exact positive integer piastres and explicit actual-money confirmations', () => {
    for (const amountMinor of ['0', '-1', '+1', '01', '1.5', '1e3', ' 1', '10000000000000000000'])
      expect(
        validateStoragePaymentCommand({ ...storageExamples.partialPayment, amountMinor }),
      ).toBe(false);
    expect(
      validateStoragePaymentCommand({ ...storageExamples.partialPayment, confirmReceived: false }),
    ).toBe(false);
    const { confirmReceived: _r, ...noReceipt } = storageExamples.partialPayment;
    expect(validateStoragePaymentCommand(noReceipt)).toBe(false);
    expect(validateStorageRefundCommand({ ...storageExamples.refund, confirmCashOut: false })).toBe(
      false,
    );
    const { reason: _reason, ...noReason } = storageExamples.refund;
    expect(validateStorageRefundCommand(noReason)).toBe(false);
    for (const reason of ['', '   ', '\u0000bad'])
      expect(validateStorageRefundCommand({ ...storageExamples.refund, reason })).toBe(false);
    expect(validateStorageStopCommand({ ...storageExamples.stop, confirmStop: false })).toBe(false);
    const { expectedCreditVersion: _v, ...unversioned } = storageExamples.partialPayment;
    expect(validateStoragePaymentCommand(unversioned)).toBe(false);
  });
  it('previews accept only the money scope; methods and dates are closed', () => {
    const {
      schemaVersion: _s,
      type: _t,
      commandId: _c,
      expectedCreditVersion: _e,
      confirmReceived: _r,
      ...scope
    } = storageExamples.partialPayment;
    expect(validateStoragePaymentPreviewInput(scope)).toBe(true);
    expect(validateStoragePaymentPreviewInput({ ...scope, method: 'card' })).toBe(false);
    expect(validateStoragePaymentPreviewInput({ ...scope, actualDate: '2027-02-30' })).toBe(false);
  });
  it('filters are explicit: revenue branch, state, payment status, due and payment date basis', () => {
    const companyId = storageExamples.stop.companyId;
    expect(validateStorageAgreementFilter({ companyId })).toBe(true);
    expect(
      validateStorageAgreementFilter({
        companyId,
        branchId: companyId,
        state: 'stopped',
        payment: 'partial',
        overdue: 'true',
        dueFrom: '2027-01-01',
        dueTo: '2027-01-31',
        paymentBasis: 'recorded',
        paidFrom: '2027-01-01',
        page: '2',
      }),
    ).toBe(true);
    expect(validateStorageAgreementFilter({ companyId, receiptBranchId: companyId })).toBe(false);
    expect(validateStorageAgreementFilter({ companyId, payment: 'overpaid' })).toBe(false);
  });
  it('error bodies are closed and OpenAPI has no arbitrary period generation endpoint', () => {
    expect(
      validateStorageViews.error({
        code: 'STORAGE_CREDIT_CHANGED',
        messageKey: 'kernel.storage_credit_changed',
        commandId: storageExamples.stop.commandId,
        correlationId: storageExamples.stop.commandId,
        details: { creditVersion: 3, agreementVersion: 1 },
      }),
    ).toBe(true);
    expect(
      validateStorageViews.error({
        code: 'X',
        correlationId: storageExamples.stop.commandId,
        details: { secret: 1 },
      }),
    ).toBe(false);
    const paths = Object.keys(openApi.paths as object).filter((p) =>
      p.startsWith('/api/v1/storage'),
    );
    expect(paths.length).toBe(12);
    expect(paths.some((p) => /period|renew/.test(p))).toBe(false);
  });
});
