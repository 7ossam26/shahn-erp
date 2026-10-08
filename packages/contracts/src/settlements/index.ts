import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import {
  closedObject,
  dateSchema,
  nonnegativeMinorSchema,
  positiveMinorSchema,
  signedMinorSchema,
  uuidSchema,
} from '../finance/brand-wallet/index.js';
import { paymentMethods, type PaymentMethod } from '../finance/index.js';
import { incidentReportSchema, type IncidentReport } from '../incidents/index.js';

/**
 * UI-ADJUSTMENT-001 `/settlements` and UI-OPENING-001 `/settings/opening-balances` (ERP-D-109/
 * 118/119/121/124/125/132/133/174, ERP-R-115/125/126/129/133/134/141/142/183). A typed operation is
 * chosen from a closed catalog; the browser never submits a table, ledger kind or balance.
 */
export const settlementTargetKinds = [
  'product',
  'account',
  'brand',
  'employee',
  'parcel',
  'source',
  'storage',
] as const;
export type SettlementTargetKind = (typeof settlementTargetKinds)[number];
export const settlementOperationNames = [
  'product.observe',
  'account.observe',
  'account.resolve',
  'brand.correct',
  'brand.adjust',
  'employee.adjust',
  'source.resolve',
  'incident.resolve',
  'storage.refund',
  'parcel.incident',
  'parcel.cancel',
] as const;
export type SettlementOperationName = (typeof settlementOperationNames)[number];
export const settlementClassifications = [
  'stock_observation',
  'account_observation',
  'missed_expense',
  'missed_general_movement',
  'company_loss_unclassified',
  'employee_liability',
  'brand_correction',
  'brand_commercial_unclassified',
  'payroll_addition',
  'payroll_earning_deduction',
  'source_review_correction',
  'source_review_retained',
  'incident_review_correction',
  'incident_review_retained',
  'storage_credit_refund',
  'parcel_incident_report',
  'parcel_cancellation',
] as const;
export type SettlementClassification = (typeof settlementClassifications)[number];
export type AccountResolution =
  | {
      kind: 'missed_expense';
      amountMinor: string;
      branchId: string;
      categoryId: string;
      description: string;
      method: PaymentMethod;
      actualDate: string;
    }
  | {
      kind: 'missed_movement';
      amountMinor: string;
      branchId: string;
      method: PaymentMethod;
      actualDate: string;
    }
  | { kind: 'company_loss'; amountMinor: string; branchId: string; actualDate: string }
  | {
      kind: 'employee_liability';
      amountMinor: string;
      branchId: string;
      employeeId: string;
      month: string;
      actualDate: string;
    };
export type SettlementOperation =
  | {
      operation: 'product.observe';
      branchId: string;
      brandId: string;
      variantId: string;
      condition: 'sound' | 'unavailable';
      observedQuantity: number;
      actualDate: string;
    }
  | {
      operation: 'account.observe';
      accountId: string;
      branchId: string;
      observedMinor: string;
      actualDate: string;
    }
  | { operation: 'account.resolve'; caseId: string; resolution: AccountResolution }
  | {
      operation: 'brand.correct';
      brandId: string;
      effectId: string;
      amountMinor: string;
      actualDate: string;
    }
  | {
      operation: 'brand.adjust';
      brandId: string;
      branchId: string;
      direction: 'credit' | 'debit';
      amountMinor: string;
      agreementReference: string;
      actualDate: string;
    }
  | {
      operation: 'employee.adjust';
      employeeId: string;
      month: string;
      kind: 'bonus' | 'overtime' | 'earning_deduction';
      amountMinor: string;
      workDate: string;
    }
  | {
      operation: 'source.resolve';
      reviewId: string;
      decision: 'apply_effective' | 'retain_original';
      actualDate: string;
    }
  | {
      operation: 'incident.resolve';
      incidentId: string;
      decision: 'retain_original';
      actualDate: string;
    }
  | {
      operation: 'incident.resolve';
      incidentId: string;
      decision: 'correct_compensation';
      compensationDeltaMinor: string;
      actualDate: string;
    }
  | {
      operation: 'storage.refund';
      brandId: string;
      branchId: string;
      accountId: string;
      method: PaymentMethod;
      amountMinor: string;
      actualDate: string;
      externalReference: string;
      /** Explicit assertion that the cash actually left the funding account. */
      confirmCashOut: true;
    }
  | { operation: 'parcel.incident'; report: IncidentReport }
  | { operation: 'parcel.cancel'; shipmentId: string };
export interface SettlementVersion {
  key: string;
  version: string;
}
export interface SettlementFact {
  key: string;
  unit: 'minor' | 'quantity' | 'date' | 'text';
  before: string | null;
  after: string | null;
}
export interface SettlementEffect {
  ledger:
    | 'stock'
    | 'money'
    | 'brand'
    | 'employee'
    | 'operating'
    | 'storage'
    | 'hold'
    | 'review'
    | 'incident'
    | 'shipment';
  kind: string;
  label: string;
  amountMinor: string | null;
  quantity: number | null;
  effectiveDate: string;
}
export interface SettlementDependent {
  kind: string;
  id: string;
  label: string;
  state: string;
}
export interface SettlementPreview {
  operation: SettlementOperationName;
  classification: SettlementClassification;
  target: {
    kind: SettlementTargetKind;
    id: string;
    label: string;
    branchId: string;
    branchName: string;
  };
  facts: SettlementFact[];
  effects: SettlementEffect[];
  dependents: SettlementDependent[];
  warnings: string[];
  blockers: string[];
  versions: SettlementVersion[];
  digest: string;
}
export interface SettlementPrepareInput {
  companyId: string;
  operation: SettlementOperation;
}
export interface SettlementCommand {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
  type: 'settlement.confirm';
  reason: string;
  operation: SettlementOperation;
  expectedVersions: SettlementVersion[];
  expectedDigest: string;
}
export interface SettlementLink {
  role: 'original' | 'dependent' | 'result';
  entityKind: string;
  entityId: string;
  label: string;
}
export interface SettlementResult {
  commandId: string;
  caseId: string;
  caseReference: string;
  resolutionId: string;
  operation: SettlementOperationName;
  classification: SettlementClassification;
  state: 'open' | 'resolved';
  preview: SettlementPreview;
  links: SettlementLink[];
}
export interface SettlementCaseSummary {
  id: string;
  reference: string;
  targetKind: SettlementTargetKind;
  targetId: string;
  operation: SettlementOperationName;
  state: 'open' | 'resolved';
  branchId: string;
  branchName: string;
  reason: string;
  actualDate: string;
  recordedAt: string;
  actorName: string;
  version: number;
}
export interface SettlementPendingReview {
  kind: 'source' | 'incident';
  id: string;
  label: string;
  branchId: string;
  createdAt: string;
  heldMinor: string;
}
export interface SettlementCaseList {
  items: SettlementCaseSummary[];
  total: number;
  page: number;
  limit: number;
  pendingReviews: SettlementPendingReview[];
}
export type SettlementObservation =
  | {
      kind: 'stock';
      branchId: string;
      brandId: string;
      variantId: string;
      variantLabel: string;
      condition: 'sound' | 'unavailable';
      recordedQuantity: number;
      observedQuantity: number;
      delta: number;
      reservedQuantity: number;
      shortageAfter: number;
      currentSound: number;
      currentReserved: number;
      currentShortage: number;
      heldReservations: number;
      observedDate: string;
    }
  | {
      kind: 'account';
      accountId: string;
      accountName: string;
      bookAtObservationMinor: string;
      observedMinor: string;
      differenceMinor: string;
      holdOriginalMinor: string;
      holdActiveMinor: string;
      resolvedMinor: string;
      remainingMinor: string;
      bookNowMinor: string;
      estimatedActualMinor: string;
      availableNowMinor: string;
      observedDate: string;
    };
export interface SettlementResolutionView {
  id: string;
  operation: string;
  classification: SettlementClassification;
  amountMinor: string | null;
  quantity: number | null;
  reason: string;
  actualDate: string;
  recordedAt: string;
  actorName: string;
  digest: string;
  preview: SettlementPreview;
}
export interface SettlementCaseDetail {
  case: SettlementCaseSummary;
  observation: SettlementObservation | null;
  resolutions: SettlementResolutionView[];
  links: SettlementLink[];
}
export interface SettlementCatalog {
  branches: { id: string; name: string }[];
  grants: string[];
  accounts: { id: string; name: string; type: 'cash' | 'bank'; branchIds: string[] }[];
  brands: { id: string; name: string }[];
  employees: { id: string; name: string; branchId: string }[];
  categories: { id: string; name: string }[];
  variants: { variantId: string; brandId: string; label: string }[];
  today: string;
}
export interface SettlementCaseFilter {
  companyId: string;
  targetKind?: SettlementTargetKind | 'all';
  state?: 'all' | 'open' | 'resolved';
  branchId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
}
export const openingLineClassifications = [
  'account_balance',
  'brand_eligible_credit',
  'brand_pending_driver_held',
  'brand_debt',
  'employee_obligation',
  'employee_entitlement',
  'stock_sound',
  'stock_unavailable',
] as const;
export type OpeningLine =
  | { classification: 'account_balance'; accountId: string; branchId: string; amountMinor: string }
  | {
      classification: 'brand_eligible_credit' | 'brand_pending_driver_held' | 'brand_debt';
      brandId: string;
      branchId: string;
      amountMinor: string;
    }
  | {
      classification: 'employee_obligation' | 'employee_entitlement';
      employeeId: string;
      branchId: string;
      month: string;
      amountMinor: string;
    }
  | {
      classification: 'stock_sound' | 'stock_unavailable';
      brandId: string;
      variantId: string;
      branchId: string;
      quantity: number;
    };
export interface OpeningPrepareInput {
  companyId: string;
  openingDate: string;
  lines: OpeningLine[];
}
export interface OpeningPreviewLine {
  lineNumber: number;
  classification: (typeof openingLineClassifications)[number];
  targetKey: string;
  label: string;
  branchName: string;
  amountMinor: string | null;
  quantity: number | null;
  ledger: 'money' | 'brand' | 'employee' | 'stock';
  readiness:
    'eligible' | 'pending' | 'debt' | 'obligation' | 'entitlement' | 'available' | 'unavailable';
}
export interface OpeningPreview {
  openingDate: string;
  lines: OpeningPreviewLine[];
  totals: {
    moneyMinor: string;
    brandEligibleMinor: string;
    brandPendingMinor: string;
    brandDebtMinor: string;
    employeeObligationMinor: string;
    employeeEntitlementMinor: string;
    stockQuantity: number;
  };
  existing: { targetKey: string; batchReference: string }[];
  blockers: string[];
  digest: string;
}
export interface OpeningCommand {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
  type: 'opening.confirm';
  openingDate: string;
  description: string;
  evidence: string;
  lines: OpeningLine[];
  expectedDigest: string;
}
export interface OpeningResult {
  commandId: string;
  batchId: string;
  reference: string;
  openingDate: string;
  lines: {
    lineNumber: number;
    classification: (typeof openingLineClassifications)[number];
    targetKey: string;
    effectId: string | null;
    stockSourceId: string | null;
  }[];
  preview: OpeningPreview;
}
export interface OpeningBatchSummary {
  id: string;
  reference: string;
  openingDate: string;
  description: string;
  evidence: string;
  lineCount: number;
  recordedAt: string;
  actorName: string;
}
export interface OpeningBatchList {
  items: OpeningBatchSummary[];
}
export interface OpeningBatchDetail {
  batch: OpeningBatchSummary;
  preview: OpeningPreview;
  lines: OpeningResult['lines'];
}

const text = (max: number, min = 0) =>
  min
    ? { type: 'string', minLength: min, maxLength: max, pattern: '\\S' }
    : { type: 'string', maxLength: max };
const month = { type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' };
const quantity = { type: 'integer', minimum: 0, maximum: 9007199254740991 };
const positiveQuantity = { type: 'integer', minimum: 1, maximum: 9007199254740991 };
const instant = { type: 'string', format: 'date-time' };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const method = { type: 'string', enum: paymentMethods };
const reasonSchema = text(1000, 1);
const accountResolutionSchema = {
  oneOf: [
    closedObject({
      kind: { const: 'missed_expense' },
      amountMinor: positiveMinorSchema,
      branchId: uuidSchema,
      categoryId: uuidSchema,
      description: text(1000, 1),
      method,
      actualDate: dateSchema,
    }),
    closedObject({
      kind: { const: 'missed_movement' },
      amountMinor: positiveMinorSchema,
      branchId: uuidSchema,
      method,
      actualDate: dateSchema,
    }),
    closedObject({
      kind: { const: 'company_loss' },
      amountMinor: positiveMinorSchema,
      branchId: uuidSchema,
      actualDate: dateSchema,
    }),
    closedObject({
      kind: { const: 'employee_liability' },
      amountMinor: positiveMinorSchema,
      branchId: uuidSchema,
      employeeId: uuidSchema,
      month,
      actualDate: dateSchema,
    }),
  ],
};
export const settlementOperationSchema = {
  oneOf: [
    closedObject({
      operation: { const: 'product.observe' },
      branchId: uuidSchema,
      brandId: uuidSchema,
      variantId: uuidSchema,
      condition: { enum: ['sound', 'unavailable'] },
      observedQuantity: quantity,
      actualDate: dateSchema,
    }),
    closedObject({
      operation: { const: 'account.observe' },
      accountId: uuidSchema,
      branchId: uuidSchema,
      observedMinor: nonnegativeMinorSchema,
      actualDate: dateSchema,
    }),
    closedObject({
      operation: { const: 'account.resolve' },
      caseId: uuidSchema,
      resolution: accountResolutionSchema,
    }),
    closedObject({
      operation: { const: 'brand.correct' },
      brandId: uuidSchema,
      effectId: uuidSchema,
      amountMinor: { type: 'string', pattern: '^-?[1-9][0-9]{0,18}$' },
      actualDate: dateSchema,
    }),
    closedObject({
      operation: { const: 'brand.adjust' },
      brandId: uuidSchema,
      branchId: uuidSchema,
      direction: { enum: ['credit', 'debit'] },
      amountMinor: positiveMinorSchema,
      agreementReference: text(300, 1),
      actualDate: dateSchema,
    }),
    closedObject({
      operation: { const: 'employee.adjust' },
      employeeId: uuidSchema,
      month,
      kind: { enum: ['bonus', 'overtime', 'earning_deduction'] },
      amountMinor: positiveMinorSchema,
      workDate: dateSchema,
    }),
    closedObject({
      operation: { const: 'source.resolve' },
      reviewId: uuidSchema,
      decision: { enum: ['apply_effective', 'retain_original'] },
      actualDate: dateSchema,
    }),
    closedObject({
      operation: { const: 'incident.resolve' },
      incidentId: uuidSchema,
      decision: { const: 'retain_original' },
      actualDate: dateSchema,
    }),
    closedObject({
      operation: { const: 'incident.resolve' },
      incidentId: uuidSchema,
      decision: { const: 'correct_compensation' },
      compensationDeltaMinor: { type: 'string', pattern: '^-?[1-9][0-9]{0,18}$' },
      actualDate: dateSchema,
    }),
    closedObject({
      operation: { const: 'storage.refund' },
      brandId: uuidSchema,
      branchId: uuidSchema,
      accountId: uuidSchema,
      method,
      amountMinor: positiveMinorSchema,
      actualDate: dateSchema,
      externalReference: text(120),
      confirmCashOut: { const: true },
    }),
    closedObject({ operation: { const: 'parcel.incident' }, report: incidentReportSchema }),
    closedObject({ operation: { const: 'parcel.cancel' }, shipmentId: uuidSchema }),
  ],
};
const versionSchema = closedObject({
  key: { type: 'string', pattern: '^[a-z][a-zA-Z0-9_.:-]{0,159}$' },
  version: { type: 'string', pattern: '^[a-zA-Z0-9_.:-]{1,160}$' },
});
const digestSchema = { type: 'string', pattern: '^[a-f0-9]{64}$' };
export const settlementPrepareInputSchema = closedObject({
  companyId: uuidSchema,
  operation: settlementOperationSchema,
});
export const settlementCommandSchema = closedObject({
  schemaVersion: { const: 1 },
  commandId: uuidSchema,
  companyId: uuidSchema,
  type: { const: 'settlement.confirm' },
  reason: reasonSchema,
  operation: settlementOperationSchema,
  expectedVersions: { type: 'array', items: versionSchema, maxItems: 40 },
  expectedDigest: digestSchema,
});
const label = text(400);
const factSchema = closedObject({
  key: { type: 'string', pattern: '^[a-z][a-zA-Z0-9]{0,59}$' },
  unit: { enum: ['minor', 'quantity', 'date', 'text'] },
  before: nullable(text(400)),
  after: nullable(text(400)),
});
const effectSchema = closedObject({
  ledger: {
    enum: [
      'stock',
      'money',
      'brand',
      'employee',
      'operating',
      'storage',
      'hold',
      'review',
      'incident',
      'shipment',
    ],
  },
  kind: { type: 'string', pattern: '^[a-z][a-z_]{0,59}$' },
  label,
  amountMinor: nullable(signedMinorSchema),
  quantity: nullable({ type: 'integer', minimum: -9007199254740991, maximum: 9007199254740991 }),
  effectiveDate: dateSchema,
});
const dependentSchema = closedObject({
  kind: { type: 'string', pattern: '^[a-z][a-z_]{0,59}$' },
  id: uuidSchema,
  label,
  state: text(80),
});
const codeList = {
  type: 'array',
  items: { type: 'string', pattern: '^[A-Z][A-Z0-9_]{0,79}$' },
  maxItems: 40,
};
export const settlementPreviewSchema = closedObject({
  operation: { enum: settlementOperationNames },
  classification: { enum: settlementClassifications },
  target: closedObject({
    kind: { enum: settlementTargetKinds },
    id: uuidSchema,
    label,
    branchId: uuidSchema,
    branchName: label,
  }),
  facts: { type: 'array', items: factSchema, maxItems: 40 },
  effects: { type: 'array', items: effectSchema, maxItems: 60 },
  dependents: { type: 'array', items: dependentSchema, maxItems: 200 },
  warnings: codeList,
  blockers: codeList,
  versions: { type: 'array', items: versionSchema, maxItems: 40 },
  digest: digestSchema,
});
const linkSchema = closedObject({
  role: { enum: ['original', 'dependent', 'result'] },
  entityKind: { type: 'string', pattern: '^[a-z_]{1,60}$' },
  entityId: uuidSchema,
  label: text(300),
});
export const settlementResultSchema = closedObject({
  commandId: uuidSchema,
  caseId: uuidSchema,
  caseReference: { type: 'string', pattern: '^[0-9]+$' },
  resolutionId: uuidSchema,
  operation: { enum: settlementOperationNames },
  classification: { enum: settlementClassifications },
  state: { enum: ['open', 'resolved'] },
  preview: settlementPreviewSchema,
  links: { type: 'array', items: linkSchema, maxItems: 400 },
});
const caseSummarySchema = closedObject({
  id: uuidSchema,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  targetKind: { enum: settlementTargetKinds },
  targetId: uuidSchema,
  operation: { enum: settlementOperationNames },
  state: { enum: ['open', 'resolved'] },
  branchId: uuidSchema,
  branchName: label,
  reason: text(1000),
  actualDate: dateSchema,
  recordedAt: instant,
  actorName: label,
  version: { type: 'integer', minimum: 1 },
});
export const settlementCaseListSchema = closedObject({
  items: { type: 'array', items: caseSummarySchema },
  total: { type: 'integer', minimum: 0 },
  page: { type: 'integer', minimum: 1 },
  limit: { type: 'integer', minimum: 1, maximum: 100 },
  pendingReviews: {
    type: 'array',
    items: closedObject({
      kind: { enum: ['source', 'incident'] },
      id: uuidSchema,
      label,
      branchId: uuidSchema,
      createdAt: instant,
      heldMinor: nonnegativeMinorSchema,
    }),
  },
});
const observationSchema = {
  oneOf: [
    closedObject({
      kind: { const: 'stock' },
      branchId: uuidSchema,
      brandId: uuidSchema,
      variantId: uuidSchema,
      variantLabel: label,
      condition: { enum: ['sound', 'unavailable'] },
      recordedQuantity: quantity,
      observedQuantity: quantity,
      delta: { type: 'integer', minimum: -9007199254740991, maximum: 9007199254740991 },
      reservedQuantity: quantity,
      shortageAfter: quantity,
      currentSound: quantity,
      currentReserved: quantity,
      currentShortage: quantity,
      heldReservations: quantity,
      observedDate: dateSchema,
    }),
    closedObject({
      kind: { const: 'account' },
      accountId: uuidSchema,
      accountName: label,
      bookAtObservationMinor: nonnegativeMinorSchema,
      observedMinor: nonnegativeMinorSchema,
      differenceMinor: signedMinorSchema,
      holdOriginalMinor: nonnegativeMinorSchema,
      holdActiveMinor: nonnegativeMinorSchema,
      resolvedMinor: nonnegativeMinorSchema,
      remainingMinor: nonnegativeMinorSchema,
      bookNowMinor: nonnegativeMinorSchema,
      estimatedActualMinor: signedMinorSchema,
      availableNowMinor: nonnegativeMinorSchema,
      observedDate: dateSchema,
    }),
  ],
};
export const settlementCaseDetailSchema = closedObject({
  case: caseSummarySchema,
  observation: nullable(observationSchema),
  resolutions: {
    type: 'array',
    items: closedObject({
      id: uuidSchema,
      operation: { type: 'string', maxLength: 60 },
      classification: { enum: settlementClassifications },
      amountMinor: nullable(signedMinorSchema),
      quantity: nullable({
        type: 'integer',
        minimum: -9007199254740991,
        maximum: 9007199254740991,
      }),
      reason: text(1000),
      actualDate: dateSchema,
      recordedAt: instant,
      actorName: label,
      digest: digestSchema,
      preview: settlementPreviewSchema,
    }),
  },
  links: { type: 'array', items: linkSchema },
});
const idName = closedObject({ id: uuidSchema, name: label });
export const settlementCatalogSchema = closedObject({
  branches: { type: 'array', items: idName },
  grants: { type: 'array', items: { type: 'string', maxLength: 60 } },
  accounts: {
    type: 'array',
    items: closedObject({
      id: uuidSchema,
      name: label,
      type: { enum: ['cash', 'bank'] },
      branchIds: { type: 'array', items: uuidSchema },
    }),
  },
  brands: { type: 'array', items: idName },
  employees: {
    type: 'array',
    items: closedObject({ id: uuidSchema, name: label, branchId: uuidSchema }),
  },
  categories: { type: 'array', items: idName },
  variants: {
    type: 'array',
    items: closedObject({ variantId: uuidSchema, brandId: uuidSchema, label }),
  },
  today: dateSchema,
});
export const settlementCaseFilterSchema = closedObject(
  {
    companyId: uuidSchema,
    targetKind: { enum: ['all', ...settlementTargetKinds] },
    state: { enum: ['all', 'open', 'resolved'] },
    branchId: uuidSchema,
    search: { type: 'string', maxLength: 40, pattern: '^[0-9٠-٩]*$' },
    from: dateSchema,
    to: dateSchema,
    page: { type: 'string', pattern: '^[1-9][0-9]{0,5}$' },
    limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' },
  },
  ['companyId'],
);
export const openingLineSchema = {
  oneOf: [
    closedObject({
      classification: { const: 'account_balance' },
      accountId: uuidSchema,
      branchId: uuidSchema,
      amountMinor: positiveMinorSchema,
    }),
    closedObject({
      classification: {
        enum: ['brand_eligible_credit', 'brand_pending_driver_held', 'brand_debt'],
      },
      brandId: uuidSchema,
      branchId: uuidSchema,
      amountMinor: positiveMinorSchema,
    }),
    closedObject({
      classification: { enum: ['employee_obligation', 'employee_entitlement'] },
      employeeId: uuidSchema,
      branchId: uuidSchema,
      month,
      amountMinor: positiveMinorSchema,
    }),
    closedObject({
      classification: { enum: ['stock_sound', 'stock_unavailable'] },
      brandId: uuidSchema,
      variantId: uuidSchema,
      branchId: uuidSchema,
      quantity: positiveQuantity,
    }),
  ],
};
const openingLines = { type: 'array', items: openingLineSchema, minItems: 1, maxItems: 200 };
export const openingPrepareInputSchema = closedObject({
  companyId: uuidSchema,
  openingDate: dateSchema,
  lines: openingLines,
});
export const openingCommandSchema = closedObject({
  schemaVersion: { const: 1 },
  commandId: uuidSchema,
  companyId: uuidSchema,
  type: { const: 'opening.confirm' },
  openingDate: dateSchema,
  description: text(1000, 1),
  evidence: text(500),
  lines: openingLines,
  expectedDigest: digestSchema,
});
export const openingPreviewSchema = closedObject({
  openingDate: dateSchema,
  lines: {
    type: 'array',
    items: closedObject({
      lineNumber: { type: 'integer', minimum: 1, maximum: 200 },
      classification: { enum: openingLineClassifications },
      targetKey: text(300, 1),
      label,
      branchName: label,
      amountMinor: nullable(positiveMinorSchema),
      quantity: nullable(positiveQuantity),
      ledger: { enum: ['money', 'brand', 'employee', 'stock'] },
      readiness: {
        enum: [
          'eligible',
          'pending',
          'debt',
          'obligation',
          'entitlement',
          'available',
          'unavailable',
        ],
      },
    }),
  },
  totals: closedObject({
    moneyMinor: nonnegativeMinorSchema,
    brandEligibleMinor: nonnegativeMinorSchema,
    brandPendingMinor: nonnegativeMinorSchema,
    brandDebtMinor: nonnegativeMinorSchema,
    employeeObligationMinor: nonnegativeMinorSchema,
    employeeEntitlementMinor: nonnegativeMinorSchema,
    stockQuantity: quantity,
  }),
  existing: {
    type: 'array',
    items: closedObject({
      targetKey: text(300, 1),
      batchReference: { type: 'string', pattern: '^[0-9]+$' },
    }),
  },
  blockers: codeList,
  digest: digestSchema,
});
const openingResultLines = {
  type: 'array',
  items: closedObject({
    lineNumber: { type: 'integer', minimum: 1, maximum: 200 },
    classification: { enum: openingLineClassifications },
    targetKey: text(300, 1),
    effectId: nullable(uuidSchema),
    stockSourceId: nullable(uuidSchema),
  }),
};
export const openingResultSchema = closedObject({
  commandId: uuidSchema,
  batchId: uuidSchema,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  openingDate: dateSchema,
  lines: openingResultLines,
  preview: openingPreviewSchema,
});
const batchSummarySchema = closedObject({
  id: uuidSchema,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  openingDate: dateSchema,
  description: text(1000),
  evidence: text(500),
  lineCount: { type: 'integer', minimum: 1, maximum: 200 },
  recordedAt: instant,
  actorName: label,
});
export const openingBatchListSchema = closedObject({
  items: { type: 'array', items: batchSummarySchema },
});
export const openingBatchDetailSchema = closedObject({
  batch: batchSummarySchema,
  preview: openingPreviewSchema,
  lines: openingResultLines,
});
export const settlementErrorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['code'],
  properties: {
    code: { type: 'string', pattern: '^[A-Z][A-Z0-9_]{0,79}$' },
    messageKey: { type: 'string', maxLength: 120 },
    commandId: uuidSchema,
    correlationId: uuidSchema,
    currentVersion: { type: 'integer' },
    details: { type: 'object' },
  },
};

const ajv = new AjvModule.default({ strict: true, allErrors: true });
formatsModule.default(ajv);
export const validateSettlementPrepareInput = ajv.compile<SettlementPrepareInput>(
  settlementPrepareInputSchema,
);
export const validateSettlementCommand = ajv.compile<SettlementCommand>(settlementCommandSchema);
export const validateSettlementCaseFilter = ajv.compile<SettlementCaseFilter>(
  settlementCaseFilterSchema,
);
export const validateOpeningPrepareInput =
  ajv.compile<OpeningPrepareInput>(openingPrepareInputSchema);
export const validateOpeningCommand = ajv.compile<OpeningCommand>(openingCommandSchema);
export const validateSettlementViews = {
  preview: ajv.compile<SettlementPreview>(settlementPreviewSchema),
  result: ajv.compile<SettlementResult>(settlementResultSchema),
  list: ajv.compile<SettlementCaseList>(settlementCaseListSchema),
  detail: ajv.compile<SettlementCaseDetail>(settlementCaseDetailSchema),
  catalog: ajv.compile<SettlementCatalog>(settlementCatalogSchema),
  openingPreview: ajv.compile<OpeningPreview>(openingPreviewSchema),
  openingResult: ajv.compile<OpeningResult>(openingResultSchema),
  openingList: ajv.compile<OpeningBatchList>(openingBatchListSchema),
  openingDetail: ajv.compile<OpeningBatchDetail>(openingBatchDetailSchema),
  error: ajv.compile(settlementErrorSchema),
};

const json = (schema: object) => ({ 'application/json': { schema } });
const errorResponses = (extra: Record<string, string> = {}) => ({
  '400': { description: 'Closed-schema validation failure', content: json(settlementErrorSchema) },
  '401': { description: 'Authentication required', content: json(settlementErrorSchema) },
  '403': {
    description: 'Missing screen/resource grant, branch scope or CSRF',
    content: json(settlementErrorSchema),
  },
  '404': {
    description: 'Target unavailable within current scope',
    content: json(settlementErrorSchema),
  },
  ...Object.fromEntries(
    Object.entries(extra).map(([code, description]) => [
      code,
      { description, content: json(settlementErrorSchema) },
    ]),
  ),
});
const recovery = (summary: string, schema: object) => ({
  get: {
    summary,
    security: [{ erpSession: [] }],
    parameters: [
      { name: 'commandId', in: 'path', required: true, schema: uuidSchema },
      { name: 'companyId', in: 'query', required: true, schema: uuidSchema },
    ],
    responses: {
      '200': { description: 'Retained committed result', content: json(schema) },
      ...errorResponses({ '409': 'Retained definite rejection for this identity' }),
    },
  },
});
const companyQuery = [{ name: 'companyId', in: 'query', required: true, schema: uuidSchema }];
export const settlementPaths = {
  '/api/v1/settlements/catalog': {
    get: {
      summary: 'Targets the current user may correct (granted screens and assigned branches only)',
      security: [{ erpSession: [] }],
      parameters: companyQuery,
      responses: {
        '200': { description: 'Catalog', content: json(settlementCatalogSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/settlements/cases': {
    get: {
      summary: 'Settlement cases plus pending source/incident reviews awaiting a linked resolution',
      security: [{ erpSession: [] }],
      parameters: Object.keys(settlementCaseFilterSchema.properties).map((name) => ({
        name,
        in: 'query',
        required: name === 'companyId',
        schema: (settlementCaseFilterSchema.properties as Record<string, object>)[name],
      })),
      responses: {
        '200': { description: 'Case list', content: json(settlementCaseListSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/settlements/cases/{caseId}': {
    get: {
      summary: 'Case detail with original/dependent/result links and observation position',
      security: [{ erpSession: [] }],
      parameters: [
        { name: 'caseId', in: 'path', required: true, schema: uuidSchema },
        ...companyQuery,
      ],
      responses: {
        '200': { description: 'Case detail', content: json(settlementCaseDetailSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/settlements/prepare': {
    post: {
      summary:
        'Locked read of a typed operation: before/after facts, typed effects, dependents and a digest. No effects.',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(settlementPrepareInputSchema) },
      responses: {
        '200': { description: 'Preview', content: json(settlementPreviewSchema) },
        ...errorResponses({ '409': 'Operation not lawful in the current state' }),
      },
    },
  },
  '/api/v1/settlements/commands': {
    post: {
      summary:
        'Reauthorize, recalculate under the same locks and commit the previewed typed effects atomically',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(settlementCommandSchema) },
      responses: {
        '200': {
          description: 'Committed result (or retained original)',
          content: json(settlementResultSchema),
        },
        ...errorResponses({
          '409':
            'Retained rejection: stale preview/versions, already resolved, protected period, insufficient funds/credit or changed payload',
        }),
      },
    },
  },
  '/api/v1/settlements/commands/{commandId}': recovery(
    'Recover a settlement confirmation after an unknown outcome',
    settlementResultSchema,
  ),
  '/api/v1/settlements/opening/catalog': {
    get: {
      summary: 'Opening targets within assigned branches under the opening-entry screen grant',
      security: [{ erpSession: [] }],
      parameters: companyQuery,
      responses: {
        '200': { description: 'Catalog', content: json(settlementCatalogSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/settlements/opening/batches': {
    get: {
      summary: 'Committed optional opening batches',
      security: [{ erpSession: [] }],
      parameters: companyQuery,
      responses: {
        '200': { description: 'Batches', content: json(openingBatchListSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/settlements/opening/batches/{batchId}': {
    get: {
      summary: 'Opening batch detail and its exact reviewed preview',
      security: [{ erpSession: [] }],
      parameters: [
        { name: 'batchId', in: 'path', required: true, schema: uuidSchema },
        ...companyQuery,
      ],
      responses: {
        '200': { description: 'Batch detail', content: json(openingBatchDetailSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/settlements/opening/prepare': {
    post: {
      summary: 'Preview an opening batch; openings create no operating revenue or cost',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(openingPrepareInputSchema) },
      responses: {
        '200': { description: 'Opening preview', content: json(openingPreviewSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/settlements/opening/commands': {
    post: {
      summary: 'Commit one reviewed opening batch atomically; a target can open only once',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(openingCommandSchema) },
      responses: {
        '200': { description: 'Committed batch', content: json(openingResultSchema) },
        ...errorResponses({ '409': 'Duplicate target, stale preview or changed payload' }),
      },
    },
  },
  '/api/v1/settlements/opening/commands/{commandId}': recovery(
    'Recover an opening batch after an unknown outcome',
    openingResultSchema,
  ),
};
export const settlementExamples = {
  productObservation: {
    schemaVersion: 1,
    commandId: '00000000-0000-4000-8000-000000000021',
    companyId: '00000000-0000-4000-8000-000000000001',
    type: 'settlement.confirm',
    reason: 'جرد يدوي خارج النظام: الموجود الفعلي 10 بدلًا من 12',
    operation: {
      operation: 'product.observe',
      branchId: '00000000-0000-4000-8000-000000000002',
      brandId: '00000000-0000-4000-8000-000000000003',
      variantId: '00000000-0000-4000-8000-000000000004',
      condition: 'sound',
      observedQuantity: 10,
      actualDate: '2026-10-08',
    },
    expectedVersions: [{ key: 'stock.position', version: '3' }],
    expectedDigest: 'a'.repeat(64),
  } satisfies SettlementCommand,
};
