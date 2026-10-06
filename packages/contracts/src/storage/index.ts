import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import {
  financeViewSchemas,
  paymentMethods,
  type Account,
  type PaymentMethod,
} from '../finance/index.js';
import {
  closedObject,
  dateSchema,
  nonnegativeMinorSchema,
  positiveMinorSchema,
  uuidSchema,
} from '../finance/brand-wallet/index.js';
/**
 * P19 storage subscriptions (UI-STORAGE-001). One agreement per company brand; anniversary periods
 * earn their complete fixed fee at the period start; actual receipts, credit allocations, refunds
 * and earned revenue are separate facts. Nothing here touches the brand payout wallet.
 *
 * Terms (fee, revenue branch, original start) are edited through P04 brand setup (`brand.update`),
 * whose storage sync applies them prospectively in the same transaction. There is deliberately no
 * public endpoint that generates an arbitrary period: only the durable renewal worker does.
 */
export const storageStates = ['active', 'stopped'] as const;
export const storagePeriodStatuses = ['unpaid', 'partial', 'paid'] as const;
export type StoragePeriodStatus = (typeof storagePeriodStatuses)[number];
export interface StorageChargeSummary {
  /** Complete fees of generated periods (earned at each period start). */
  chargedMinor: string;
  /** Credit applied to those periods (never another cash receipt or earning). */
  allocatedMinor: string;
  outstandingMinor: string;
  /** Outstanding on periods whose due date has passed. */
  overdueMinor: string;
}
export interface StorageCreditSummary {
  receiptsMinor: string;
  /** P21 linked credit corrections; always 0 until P21 exists. */
  correctionsMinor: string;
  allocatedMinor: string;
  refundedMinor: string;
  unallocatedMinor: string;
}
export interface StorageTermsChange {
  effectivePeriodIndex: number;
  effectiveStartDate: string;
  feeMinor: string;
  branchId: string;
  branchName: string;
}
export interface StorageAgreementSummary {
  agreementId: string;
  brandId: string;
  brandName: string;
  state: (typeof storageStates)[number];
  origin: 'brand_setup' | 'p04_configuration';
  startDate: string;
  anchorDay: number;
  /** First period the system bills; earlier anniversary periods are historical (P21 opening). */
  firstBillableStartDate: string;
  stopBoundary: string | null;
  /** Last protected service date before the stop boundary. */
  lastServiceDate: string | null;
  branchId: string;
  branchName: string;
  currentFeeMinor: string;
  nextChange: StorageTermsChange | null;
  nextPeriodStartDate: string | null;
  charges: StorageChargeSummary;
  credit: StorageCreditSummary;
  overdue: boolean;
  periodCount: number;
  version: number;
  creditVersion: number;
}
export interface StorageRenewalStatus {
  pending: number;
  leased: number;
  failed: number;
  oldestPendingSince: string | null;
  lastError: string | null;
  lastCompletedAt: string | null;
}
export interface StorageAgreementList {
  items: StorageAgreementSummary[];
  total: number;
  page: number;
  limit: number;
  today: string;
  renewal: StorageRenewalStatus;
}
export interface StoragePeriodAllocationView {
  receiptId: string;
  receiptReference: string;
  receiptActualDate: string;
  amountMinor: string;
  triggerKind: 'payment' | 'renewal';
  recordedAt: string;
}
export interface StoragePeriodView {
  periodId: string;
  periodIndex: number;
  startDate: string;
  endDate: string;
  nextStartDate: string;
  dueDate: string;
  feeMinor: string;
  branchId: string;
  branchName: string;
  revision: number;
  /** Calendar month (YYYY-MM) in which the complete fee is earned: the start month. */
  revenueMonth: string;
  allocatedMinor: string;
  outstandingMinor: string;
  status: StoragePeriodStatus;
  overdue: boolean;
  generatedOn: string;
  recordedAt: string;
  allocations: StoragePeriodAllocationView[];
}
export interface StorageReceiptAllocationView {
  periodId: string;
  startDate: string;
  endDate: string;
  amountMinor: string;
  triggerKind: 'payment' | 'renewal';
  recordedAt: string;
}
export interface StorageReceiptView {
  receiptId: string;
  reference: string;
  amountMinor: string;
  actualDate: string;
  recordedAt: string;
  method: PaymentMethod;
  accountId: string;
  accountName: string;
  branchId: string;
  branchName: string;
  externalReference: string;
  actorName: string;
  allocatedMinor: string;
  refundedMinor: string;
  unallocatedMinor: string;
  allocations: StorageReceiptAllocationView[];
}
export interface StorageRefundSourceView {
  receiptId: string;
  receiptReference: string;
  receiptActualDate: string;
  amountMinor: string;
}
export interface StorageRefundView {
  refundId: string;
  reference: string;
  amountMinor: string;
  actualDate: string;
  recordedAt: string;
  method: PaymentMethod;
  accountId: string;
  accountName: string;
  branchId: string;
  branchName: string;
  reason: string;
  externalReference: string;
  actorName: string;
  sources: StorageRefundSourceView[];
}
export interface StorageRevisionView {
  revision: number;
  effectivePeriodIndex: number;
  effectiveStartDate: string;
  feeMinor: string;
  branchId: string;
  branchName: string;
  origin: 'brand_setup' | 'p04_configuration';
  actorName: string;
  recordedAt: string;
}
export interface StorageStopView {
  stopBoundary: string;
  lastServiceDate: string;
  requestedOn: string;
  reason: string;
  actorName: string;
  recordedAt: string;
}
export interface StorageAgreementDetail extends StorageAgreementSummary {
  today: string;
  revisions: StorageRevisionView[];
  periods: StoragePeriodView[];
  receipts: StorageReceiptView[];
  refunds: StorageRefundView[];
  stop: StorageStopView | null;
  renewal: StorageRenewalStatus;
}
export interface StorageCatalog {
  today: string;
  branches: { id: string; name: string }[];
  accounts: Account[];
  agreements: {
    agreementId: string;
    brandId: string;
    brandName: string;
    state: (typeof storageStates)[number];
  }[];
}
export interface StoragePaymentScope {
  companyId: string;
  brandId: string;
  /** Assigned branch where the actual money was received. Never the revenue branch filter. */
  branchId: string;
  accountId: string;
  method: PaymentMethod;
  amountMinor: string;
  actualDate: string;
}
export interface StoragePaymentCommand extends StoragePaymentScope {
  schemaVersion: 1;
  type: 'storage.payment.record';
  commandId: string;
  externalReference?: string;
  /** Credit version shown by the reviewed preview; a changed allocation requires a new review. */
  expectedCreditVersion: number;
  /** Staff confirm the money was actually received; no provider verification is implied. */
  confirmReceived: true;
}
export const storagePaymentBlockers = [
  'STORAGE_AGREEMENT_REQUIRED',
  'ACCOUNT_INACTIVE',
  'ACCOUNT_USAGE_FORBIDDEN',
  'METHOD_ACCOUNT_MISMATCH',
  'FUTURE_PAYMENT_DATE',
  'ACCOUNT_RECONCILIATION_REQUIRED',
] as const;
export interface StorageAllocationPlanItem {
  periodId: string;
  periodIndex: number;
  startDate: string;
  endDate: string;
  dueDate: string;
  outstandingBeforeMinor: string;
  amountMinor: string;
  outstandingAfterMinor: string;
}
export interface StorageAccountView {
  id: string;
  name: string;
  type: 'cash' | 'bank';
  active: boolean;
  availableMinor: string;
}
export interface StoragePaymentPreview {
  agreement: StorageAgreementSummary;
  account: StorageAccountView;
  amountMinor: string;
  blockers: (typeof storagePaymentBlockers)[number][];
  allocations: StorageAllocationPlanItem[];
  allocatedMinor: string;
  outstandingBeforeMinor: string;
  outstandingAfterMinor: string;
  unallocatedBeforeMinor: string;
  unallocatedAfterMinor: string;
  creditVersion: number;
  today: string;
}
export interface StoragePaymentResult {
  commandId: string;
  receiptId: string;
  reference: string;
  agreementId: string;
  brandId: string;
  amountMinor: string;
  actualDate: string;
  movementId: string;
  allocations: StorageAllocationPlanItem[];
  allocatedMinor: string;
  outstandingAfterMinor: string;
  unallocatedCreditAfterMinor: string;
}
export interface StorageRefundScope {
  companyId: string;
  brandId: string;
  /** Assigned branch paying the actual refund. */
  branchId: string;
  accountId: string;
  method: PaymentMethod;
  amountMinor: string;
  actualDate: string;
}
export interface StorageRefundCommand extends StorageRefundScope {
  schemaVersion: 1;
  type: 'storage.credit.refund';
  commandId: string;
  reason: string;
  externalReference?: string;
  expectedCreditVersion: number;
  /** Explicit confirmation that the cash actually left the funding account. */
  confirmCashOut: true;
}
export const storageRefundBlockers = [
  'STORAGE_AGREEMENT_REQUIRED',
  'INSUFFICIENT_STORAGE_CREDIT',
  'STORAGE_CREDIT_ALLOCATED',
  'INSUFFICIENT_FUNDS',
  'ACCOUNT_INACTIVE',
  'ACCOUNT_USAGE_FORBIDDEN',
  'METHOD_ACCOUNT_MISMATCH',
  'FUTURE_PAYMENT_DATE',
  'ACCOUNT_RECONCILIATION_REQUIRED',
] as const;
export interface StorageRefundPreview {
  agreement: StorageAgreementSummary;
  account: StorageAccountView;
  amountMinor: string;
  blockers: (typeof storageRefundBlockers)[number][];
  sources: StorageRefundSourceView[];
  unallocatedBeforeMinor: string;
  unallocatedAfterMinor: string | null;
  allocatedMinor: string;
  creditVersion: number;
  today: string;
}
export interface StorageRefundResult {
  commandId: string;
  refundId: string;
  reference: string;
  agreementId: string;
  brandId: string;
  amountMinor: string;
  actualDate: string;
  movementId: string;
  sources: StorageRefundSourceView[];
  unallocatedCreditAfterMinor: string;
}
export interface StorageStopCommand {
  schemaVersion: 1;
  type: 'storage.agreement.stop';
  commandId: string;
  companyId: string;
  agreementId: string;
  expectedVersion: number;
  reason?: string;
  /** Explicit acknowledgement: stop is not a refund and keeps dues, credit and history. */
  confirmStop: true;
}
export interface StorageStopPreview {
  agreement: StorageAgreementSummary;
  stopBoundary: string;
  lastServiceDate: string;
  generatesNoPeriod: boolean;
  today: string;
}
export interface StorageStopResult {
  commandId: string;
  agreementId: string;
  brandId: string;
  stopBoundary: string;
  lastServiceDate: string;
  version: number;
  outstandingMinor: string;
  unallocatedCreditMinor: string;
}
const method = { type: 'string', enum: paymentMethods },
  reference = { type: 'string', pattern: '^[0-9]{1,30}$' },
  instant = { type: 'string', format: 'date-time' },
  name = { type: 'string', minLength: 1, maxLength: 180 },
  version = { type: 'integer', minimum: 1, maximum: 2147483647 },
  periodIndex = { type: 'integer', minimum: 0, maximum: 12000 },
  count = { type: 'integer', minimum: 0, maximum: 2147483647 },
  month = { type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' },
  origin = { type: 'string', enum: ['brand_setup', 'p04_configuration'] },
  trigger = { type: 'string', enum: ['payment', 'renewal'] },
  // Printable single-line text; whitespace-only and control characters are rejected.
  externalReference = {
    type: 'string',
    minLength: 1,
    maxLength: 120,
    pattern: '^[^\\u0000-\\u001f\\u007f]*[^\\s\\u0000-\\u001f\\u007f][^\\u0000-\\u001f\\u007f]*$',
  },
  // Line breaks/tabs are allowed inside a reason; other control characters are not.
  reason = {
    type: 'string',
    minLength: 1,
    maxLength: 500,
    pattern:
      '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]*[^\\s\\u0000-\\u001f\\u007f][^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]*$',
  };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const chargeSummarySchema = closedObject({
  chargedMinor: nonnegativeMinorSchema,
  allocatedMinor: nonnegativeMinorSchema,
  outstandingMinor: nonnegativeMinorSchema,
  overdueMinor: nonnegativeMinorSchema,
});
const creditSummarySchema = closedObject({
  receiptsMinor: nonnegativeMinorSchema,
  correctionsMinor: { type: 'string', pattern: '^(0|-?[1-9][0-9]{0,18})$' },
  allocatedMinor: nonnegativeMinorSchema,
  refundedMinor: nonnegativeMinorSchema,
  unallocatedMinor: nonnegativeMinorSchema,
});
const renewalStatusSchema = closedObject({
  pending: count,
  leased: count,
  failed: count,
  oldestPendingSince: nullable(instant),
  lastError: nullable({ type: 'string', maxLength: 500 }),
  lastCompletedAt: nullable(instant),
});
export const storageAgreementSummarySchema = closedObject({
  agreementId: uuidSchema,
  brandId: uuidSchema,
  brandName: name,
  state: { type: 'string', enum: storageStates },
  origin,
  startDate: dateSchema,
  anchorDay: { type: 'integer', minimum: 1, maximum: 31 },
  firstBillableStartDate: dateSchema,
  stopBoundary: nullable(dateSchema),
  lastServiceDate: nullable(dateSchema),
  branchId: uuidSchema,
  branchName: name,
  currentFeeMinor: nonnegativeMinorSchema,
  nextChange: nullable(
    closedObject({
      effectivePeriodIndex: periodIndex,
      effectiveStartDate: dateSchema,
      feeMinor: nonnegativeMinorSchema,
      branchId: uuidSchema,
      branchName: name,
    }),
  ),
  nextPeriodStartDate: nullable(dateSchema),
  charges: chargeSummarySchema,
  credit: creditSummarySchema,
  overdue: { type: 'boolean' },
  periodCount: count,
  version,
  creditVersion: version,
});
export const storageAgreementListSchema = closedObject({
  items: { type: 'array', items: storageAgreementSummarySchema },
  total: count,
  page: { type: 'integer', minimum: 1, maximum: 999999 },
  limit: { type: 'integer', minimum: 1, maximum: 100 },
  today: dateSchema,
  renewal: renewalStatusSchema,
});
const periodSchema = closedObject({
  periodId: uuidSchema,
  periodIndex,
  startDate: dateSchema,
  endDate: dateSchema,
  nextStartDate: dateSchema,
  dueDate: dateSchema,
  feeMinor: nonnegativeMinorSchema,
  branchId: uuidSchema,
  branchName: name,
  revision: version,
  revenueMonth: month,
  allocatedMinor: nonnegativeMinorSchema,
  outstandingMinor: nonnegativeMinorSchema,
  status: { type: 'string', enum: storagePeriodStatuses },
  overdue: { type: 'boolean' },
  generatedOn: dateSchema,
  recordedAt: instant,
  allocations: {
    type: 'array',
    items: closedObject({
      receiptId: uuidSchema,
      receiptReference: reference,
      receiptActualDate: dateSchema,
      amountMinor: positiveMinorSchema,
      triggerKind: trigger,
      recordedAt: instant,
    }),
  },
});
const refundSourceSchema = closedObject({
  receiptId: uuidSchema,
  receiptReference: reference,
  receiptActualDate: dateSchema,
  amountMinor: positiveMinorSchema,
});
const receiptSchema = closedObject({
  receiptId: uuidSchema,
  reference,
  amountMinor: positiveMinorSchema,
  actualDate: dateSchema,
  recordedAt: instant,
  method,
  accountId: uuidSchema,
  accountName: name,
  branchId: uuidSchema,
  branchName: name,
  externalReference: { type: 'string', maxLength: 120 },
  actorName: { type: 'string', maxLength: 180 },
  allocatedMinor: nonnegativeMinorSchema,
  refundedMinor: nonnegativeMinorSchema,
  unallocatedMinor: nonnegativeMinorSchema,
  allocations: {
    type: 'array',
    items: closedObject({
      periodId: uuidSchema,
      startDate: dateSchema,
      endDate: dateSchema,
      amountMinor: positiveMinorSchema,
      triggerKind: trigger,
      recordedAt: instant,
    }),
  },
});
const refundSchema = closedObject({
  refundId: uuidSchema,
  reference,
  amountMinor: positiveMinorSchema,
  actualDate: dateSchema,
  recordedAt: instant,
  method,
  accountId: uuidSchema,
  accountName: name,
  branchId: uuidSchema,
  branchName: name,
  reason: { type: 'string', minLength: 1, maxLength: 500 },
  externalReference: { type: 'string', maxLength: 120 },
  actorName: { type: 'string', maxLength: 180 },
  sources: { type: 'array', items: refundSourceSchema },
});
export const storageAgreementDetailSchema = closedObject({
  ...storageAgreementSummarySchema.properties,
  today: dateSchema,
  revisions: {
    type: 'array',
    items: closedObject({
      revision: version,
      effectivePeriodIndex: periodIndex,
      effectiveStartDate: dateSchema,
      feeMinor: nonnegativeMinorSchema,
      branchId: uuidSchema,
      branchName: name,
      origin,
      actorName: { type: 'string', maxLength: 180 },
      recordedAt: instant,
    }),
  },
  periods: { type: 'array', items: periodSchema },
  receipts: { type: 'array', items: receiptSchema },
  refunds: { type: 'array', items: refundSchema },
  stop: nullable(
    closedObject({
      stopBoundary: dateSchema,
      lastServiceDate: dateSchema,
      requestedOn: dateSchema,
      reason: { type: 'string', maxLength: 500 },
      actorName: { type: 'string', maxLength: 180 },
      recordedAt: instant,
    }),
  ),
  renewal: renewalStatusSchema,
});
export const storageCatalogSchema = closedObject({
  today: dateSchema,
  branches: { type: 'array', items: closedObject({ id: uuidSchema, name }) },
  accounts: { type: 'array', items: financeViewSchemas.account },
  agreements: {
    type: 'array',
    items: closedObject({
      agreementId: uuidSchema,
      brandId: uuidSchema,
      brandName: name,
      state: { type: 'string', enum: storageStates },
    }),
  },
});
const scope = {
  companyId: uuidSchema,
  brandId: uuidSchema,
  branchId: uuidSchema,
  accountId: uuidSchema,
  method,
  amountMinor: positiveMinorSchema,
  actualDate: dateSchema,
};
export const storagePaymentPreviewInputSchema = closedObject(scope);
export const storagePaymentCommandSchema = closedObject(
  {
    schemaVersion: { type: 'integer', const: 1 },
    type: { type: 'string', const: 'storage.payment.record' },
    commandId: uuidSchema,
    ...scope,
    externalReference,
    expectedCreditVersion: version,
    confirmReceived: { type: 'boolean', const: true },
  },
  [
    'schemaVersion',
    'type',
    'commandId',
    ...Object.keys(scope),
    'expectedCreditVersion',
    'confirmReceived',
  ],
);
export const storageRefundPreviewInputSchema = closedObject(scope);
export const storageRefundCommandSchema = closedObject(
  {
    schemaVersion: { type: 'integer', const: 1 },
    type: { type: 'string', const: 'storage.credit.refund' },
    commandId: uuidSchema,
    ...scope,
    reason,
    externalReference,
    expectedCreditVersion: version,
    confirmCashOut: { type: 'boolean', const: true },
  },
  [
    'schemaVersion',
    'type',
    'commandId',
    ...Object.keys(scope),
    'reason',
    'expectedCreditVersion',
    'confirmCashOut',
  ],
);
export const storageStopCommandSchema = closedObject(
  {
    schemaVersion: { type: 'integer', const: 1 },
    type: { type: 'string', const: 'storage.agreement.stop' },
    commandId: uuidSchema,
    companyId: uuidSchema,
    agreementId: uuidSchema,
    expectedVersion: version,
    reason,
    confirmStop: { type: 'boolean', const: true },
  },
  [
    'schemaVersion',
    'type',
    'commandId',
    'companyId',
    'agreementId',
    'expectedVersion',
    'confirmStop',
  ],
);
const accountViewSchema = closedObject({
  id: uuidSchema,
  name,
  type: { type: 'string', enum: ['cash', 'bank'] },
  active: { type: 'boolean' },
  availableMinor: nonnegativeMinorSchema,
});
const planItemSchema = closedObject({
  periodId: uuidSchema,
  periodIndex,
  startDate: dateSchema,
  endDate: dateSchema,
  dueDate: dateSchema,
  outstandingBeforeMinor: nonnegativeMinorSchema,
  amountMinor: positiveMinorSchema,
  outstandingAfterMinor: nonnegativeMinorSchema,
});
export const storagePaymentPreviewSchema = closedObject({
  agreement: storageAgreementSummarySchema,
  account: accountViewSchema,
  amountMinor: positiveMinorSchema,
  blockers: {
    type: 'array',
    items: { type: 'string', enum: storagePaymentBlockers },
    uniqueItems: true,
  },
  allocations: { type: 'array', items: planItemSchema },
  allocatedMinor: nonnegativeMinorSchema,
  outstandingBeforeMinor: nonnegativeMinorSchema,
  outstandingAfterMinor: nonnegativeMinorSchema,
  unallocatedBeforeMinor: nonnegativeMinorSchema,
  unallocatedAfterMinor: nonnegativeMinorSchema,
  creditVersion: version,
  today: dateSchema,
});
export const storagePaymentResultSchema = closedObject({
  commandId: uuidSchema,
  receiptId: uuidSchema,
  reference,
  agreementId: uuidSchema,
  brandId: uuidSchema,
  amountMinor: positiveMinorSchema,
  actualDate: dateSchema,
  movementId: uuidSchema,
  allocations: { type: 'array', items: planItemSchema },
  allocatedMinor: nonnegativeMinorSchema,
  outstandingAfterMinor: nonnegativeMinorSchema,
  unallocatedCreditAfterMinor: nonnegativeMinorSchema,
});
export const storageRefundPreviewSchema = closedObject({
  agreement: storageAgreementSummarySchema,
  account: accountViewSchema,
  amountMinor: positiveMinorSchema,
  blockers: {
    type: 'array',
    items: { type: 'string', enum: storageRefundBlockers },
    uniqueItems: true,
  },
  sources: { type: 'array', items: refundSourceSchema },
  unallocatedBeforeMinor: nonnegativeMinorSchema,
  unallocatedAfterMinor: nullable(nonnegativeMinorSchema),
  allocatedMinor: nonnegativeMinorSchema,
  creditVersion: version,
  today: dateSchema,
});
export const storageRefundResultSchema = closedObject({
  commandId: uuidSchema,
  refundId: uuidSchema,
  reference,
  agreementId: uuidSchema,
  brandId: uuidSchema,
  amountMinor: positiveMinorSchema,
  actualDate: dateSchema,
  movementId: uuidSchema,
  sources: { type: 'array', items: refundSourceSchema },
  unallocatedCreditAfterMinor: nonnegativeMinorSchema,
});
export const storageStopPreviewSchema = closedObject({
  agreement: storageAgreementSummarySchema,
  stopBoundary: dateSchema,
  lastServiceDate: dateSchema,
  generatesNoPeriod: { type: 'boolean' },
  today: dateSchema,
});
export const storageStopResultSchema = closedObject({
  commandId: uuidSchema,
  agreementId: uuidSchema,
  brandId: uuidSchema,
  stopBoundary: dateSchema,
  lastServiceDate: dateSchema,
  version,
  outstandingMinor: nonnegativeMinorSchema,
  unallocatedCreditMinor: nonnegativeMinorSchema,
});
export const storageAgreementFilterSchema = closedObject(
  {
    companyId: uuidSchema,
    brandId: uuidSchema,
    /** Agreement (revenue) branch only; a receipt's branch never filters earned revenue. */
    branchId: uuidSchema,
    state: { type: 'string', enum: ['all', ...storageStates] },
    payment: { type: 'string', enum: ['all', ...storagePeriodStatuses] },
    overdue: { type: 'string', enum: ['all', 'true'] },
    dueFrom: dateSchema,
    dueTo: dateSchema,
    paymentBasis: { type: 'string', enum: ['actual', 'recorded'] },
    paidFrom: dateSchema,
    paidTo: dateSchema,
    search: { type: 'string', maxLength: 120 },
    page: { type: 'string', pattern: '^[1-9][0-9]{0,5}$' },
  },
  ['companyId'],
);
export const storageErrorSchema = closedObject(
  {
    code: { type: 'string', pattern: '^[A-Z][A-Z0-9_]{0,79}$' },
    messageKey: { type: 'string', maxLength: 120 },
    commandId: nullable(uuidSchema),
    correlationId: uuidSchema,
    currentVersion: version,
    details: closedObject(
      {
        creditVersion: version,
        agreementVersion: version,
        unallocatedMinor: nonnegativeMinorSchema,
        allocatedMinor: nonnegativeMinorSchema,
        availableMinor: nonnegativeMinorSchema,
        today: dateSchema,
      },
      [],
    ),
  },
  ['code', 'correlationId'],
);
const ajv = new AjvModule.default({ strict: true, allErrors: true });
formatsModule.default(ajv);
export const validateStoragePaymentPreviewInput = ajv.compile<StoragePaymentScope>(
  storagePaymentPreviewInputSchema,
);
export const validateStoragePaymentCommand = ajv.compile<StoragePaymentCommand>(
  storagePaymentCommandSchema,
);
export const validateStorageRefundPreviewInput = ajv.compile<StorageRefundScope>(
  storageRefundPreviewInputSchema,
);
export const validateStorageRefundCommand = ajv.compile<StorageRefundCommand>(
  storageRefundCommandSchema,
);
export const validateStorageStopCommand = ajv.compile<StorageStopCommand>(storageStopCommandSchema);
export const validateStorageAgreementFilter = ajv.compile(storageAgreementFilterSchema);
export const validateStorageViews = {
  list: ajv.compile<StorageAgreementList>(storageAgreementListSchema),
  detail: ajv.compile<StorageAgreementDetail>(storageAgreementDetailSchema),
  catalog: ajv.compile<StorageCatalog>(storageCatalogSchema),
  paymentPreview: ajv.compile<StoragePaymentPreview>(storagePaymentPreviewSchema),
  paymentResult: ajv.compile<StoragePaymentResult>(storagePaymentResultSchema),
  refundPreview: ajv.compile<StorageRefundPreview>(storageRefundPreviewSchema),
  refundResult: ajv.compile<StorageRefundResult>(storageRefundResultSchema),
  stopPreview: ajv.compile<StorageStopPreview>(storageStopPreviewSchema),
  stopResult: ajv.compile<StorageStopResult>(storageStopResultSchema),
  error: ajv.compile(storageErrorSchema),
};
const company = '0b7c8f86-0d5c-4ad0-9f77-3a2f3a9c1e01',
  brand = '4e0f6b1a-1f7e-4c55-8d5d-1b7a2c9e3f02',
  branchB = '8a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c04',
  account = '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e06';
export const storageExamples = {
  /** Example A: partial 100 against the 310 January 20–February 19 period. */
  partialPayment: {
    schemaVersion: 1,
    type: 'storage.payment.record',
    commandId: '6a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c31',
    companyId: company,
    brandId: brand,
    branchId: branchB,
    accountId: account,
    method: 'cash',
    amountMinor: '10000',
    actualDate: '2027-01-25',
    expectedCreditVersion: 2,
    confirmReceived: true,
  } satisfies StoragePaymentCommand,
  /** Example B: advance 500 before the first period starts. */
  advancePayment: {
    schemaVersion: 1,
    type: 'storage.payment.record',
    commandId: '7b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d42',
    companyId: company,
    brandId: brand,
    branchId: branchB,
    accountId: account,
    method: 'instapay',
    amountMinor: '50000',
    actualDate: '2027-01-10',
    externalReference: 'IP-2027-0110',
    expectedCreditVersion: 1,
    confirmReceived: true,
  } satisfies StoragePaymentCommand,
  refund: {
    schemaVersion: 1,
    type: 'storage.credit.refund',
    commandId: '8c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e53',
    companyId: company,
    brandId: brand,
    branchId: branchB,
    accountId: account,
    method: 'cash',
    amountMinor: '5000',
    actualDate: '2027-03-02',
    reason: 'إعادة جزء من رصيد التخزين غير المخصص بطلب البراند',
    expectedCreditVersion: 4,
    confirmCashOut: true,
  } satisfies StorageRefundCommand,
  stop: {
    schemaVersion: 1,
    type: 'storage.agreement.stop',
    commandId: '9d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f64',
    companyId: company,
    agreementId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c75',
    expectedVersion: 1,
    reason: 'أنهى البراند التخزين بعد الفترة الحالية',
    confirmStop: true,
  } satisfies StorageStopCommand,
};
const pathId = (parameter: string) => ({
  name: parameter,
  in: 'path',
  required: true,
  schema: uuidSchema,
});
const companyQuery = { name: 'companyId', in: 'query', required: true, schema: uuidSchema };
const json = (schema: object) => ({ 'application/json': { schema } });
const errorResponses = (extra: Record<string, string> = {}) => ({
  '400': { description: 'Invalid closed input; no effects', content: json(storageErrorSchema) },
  '401': { description: 'Authentication required' },
  '403': {
    description: 'Grant, assigned branch, account usage or CSRF denied; no effects',
    content: json(storageErrorSchema),
  },
  '404': {
    description: 'Not found within current authorization',
    content: json(storageErrorSchema),
  },
  ...Object.fromEntries(
    Object.entries(extra).map(([status, description]) => [
      status,
      { description, content: json(storageErrorSchema) },
    ]),
  ),
});
const recovery = (summary: string, schema: object) => ({
  get: {
    summary,
    security: [{ erpSession: [] }],
    parameters: [pathId('commandId'), companyQuery],
    responses: {
      '200': { description: 'Retained committed result', content: json(schema) },
      ...errorResponses({ '409': 'Retained original rejection' }),
    },
  },
});
export const storagePaths = {
  '/api/v1/storage/agreements': {
    get: {
      summary:
        'Storage agreements with charges, arrears and separate unallocated credit (UI-STORAGE-001)',
      security: [{ erpSession: [] }],
      parameters: Object.entries(storageAgreementFilterSchema.properties).map(([key, value]) => ({
        name: key,
        in: 'query',
        required: key === 'companyId',
        schema: value,
      })),
      responses: {
        '200': { description: 'Paginated agreements', content: json(storageAgreementListSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/storage/catalog': {
    get: {
      summary: 'Assigned receiving/funding branches, permitted accounts and storage agreements',
      security: [{ erpSession: [] }],
      parameters: [companyQuery],
      responses: {
        '200': { description: 'Catalog', content: json(storageCatalogSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/storage/agreements/{agreementId}': {
    get: {
      summary:
        'Agreement terms/revisions, periods, receipts with allocations, refunds, stop and renewal status. Terms are updated prospectively through P04 brand setup (brand.update).',
      security: [{ erpSession: [] }],
      parameters: [pathId('agreementId'), companyQuery],
      responses: {
        '200': { description: 'Agreement detail', content: json(storageAgreementDetailSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/storage/agreements/{agreementId}/stop/preview': {
    get: {
      summary: 'Locked read of the stop boundary; no effects',
      security: [{ erpSession: [] }],
      parameters: [pathId('agreementId'), companyQuery],
      responses: {
        '200': { description: 'Stop preview', content: json(storageStopPreviewSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/storage/agreements/{agreementId}/stop': {
    post: {
      summary:
        'Stop renewal after the current protected period; dues, credit and history are kept; no refund',
      security: [{ erpSession: [], csrfToken: [] }],
      parameters: [pathId('agreementId')],
      requestBody: { required: true, content: json(storageStopCommandSchema) },
      responses: {
        '200': { description: 'Recorded stop', content: json(storageStopResultSchema) },
        ...errorResponses({ '409': 'Retained rejection: stale version or already stopped' }),
      },
    },
  },
  '/api/v1/storage/agreements/commands/{commandId}': recovery(
    'Recover a stop result for the same principal',
    storageStopResultSchema,
  ),
  '/api/v1/storage/payments/preview': {
    post: {
      summary: 'Locked read of the oldest-due allocation plan and resulting credit; no effects',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(storagePaymentPreviewInputSchema) },
      responses: {
        '200': { description: 'Payment preview', content: json(storagePaymentPreviewSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/storage/payments': {
    post: {
      summary:
        'Record one actual partial/full/advance storage receipt and its deterministic allocation',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(storagePaymentCommandSchema) },
      responses: {
        '200': {
          description: 'Committed receipt (or retained original result)',
          content: json(storagePaymentResultSchema),
        },
        ...errorResponses({
          '409':
            'Retained rejection: changed credit/allocation, future date, missing agreement, or changed payload for the same commandId',
        }),
      },
    },
  },
  '/api/v1/storage/payments/commands/{commandId}': recovery(
    'Recover a storage receipt after an unknown outcome',
    storagePaymentResultSchema,
  ),
  '/api/v1/storage/credit-refunds/preview': {
    post: {
      summary:
        'Locked read of refundable unallocated credit, source receipts and funds; no effects',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(storageRefundPreviewInputSchema) },
      responses: {
        '200': { description: 'Refund preview', content: json(storageRefundPreviewSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/storage/credit-refunds': {
    post: {
      summary:
        'Refund unallocated storage credit with an actual cash-out; never allocated money or revenue',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(storageRefundCommandSchema) },
      responses: {
        '200': { description: 'Committed refund', content: json(storageRefundResultSchema) },
        ...errorResponses({
          '409':
            'Retained rejection: insufficient/allocated credit, insufficient funds, changed credit, or changed payload',
        }),
      },
    },
  },
  '/api/v1/storage/credit-refunds/commands/{commandId}': recovery(
    'Recover a storage refund after an unknown outcome',
    storageRefundResultSchema,
  ),
};
