/** Closed, signed operating-result facts. Money movement direction never selects a category. */
export const profitCategories = [
  'shipping_gross',
  'shipping_waiver',
  'storage_revenue',
  'employee_salary',
  'employee_commission',
  'employee_addition',
  'employee_entitlement_deduction',
  'paid_expense',
  'brand_compensation',
  'employee_compensation_share',
] as const;
export type ProfitCategory = (typeof profitCategories)[number];
export const profitCategoryLabels: Record<ProfitCategory, string> = {
  shipping_gross: 'تعريفة الشحن والتغليف',
  shipping_waiver: 'إعفاء شحن البديل المعتمد',
  storage_revenue: 'رسوم التخزين المكتسبة',
  employee_salary: 'الراتب المكتسب',
  employee_commission: 'العمولة المكتسبة',
  employee_addition: 'إضافات الاستحقاق',
  employee_entitlement_deduction: 'خصومات الاستحقاق',
  paid_expense: 'المصروف المدفوع',
  brand_compensation: 'تعويض البراند المؤكد',
  employee_compensation_share: 'حصة الموظف المعتمدة من التعويض',
};
export interface EconomicEffect {
  companyId: string;
  sourceId: string;
  effectId: string;
  category: ProfitCategory;
  amountMinor: string;
  effectiveDate: string;
  recordedAt: string;
  historicalBranchId: string | null;
  postingBatchId: string | null;
  correctionOf: string[];
  revision: string;
  sourceCapability: string;
  sourcePath: string | null;
  shipmentId?: string;
  periodId?: string;
  employeeId?: string;
  incidentId?: string;
}
export interface ProfitSourceIssue {
  code: string;
  targetKind: string;
  targetId: string;
  branchId: string | null;
  sourceIds: string[];
  observedVersion: string;
  deltaMinor: string | null;
  effectiveDate: string | null;
  recordedAt: string | null;
  message: string;
  sourceCapability: string;
  sourcePath: string | null;
}
export interface ProfitActualMoney {
  asOf: string;
  dateBasis: 'current';
  accounts: {
    id: string;
    name: string;
    type: string;
    bookMinor: string;
    journalMinor: string;
    heldMinor: string;
    availableMinor: string;
    projectionVersion: string;
  }[];
  fundsInTransitMinor: string | null;
  heldDiscrepanciesMinor: string | null;
  unremittedRecipientMinor: string | null;
  brandLiabilitiesMinor: string | null;
  brandPendingMinor: string | null;
  brandHeldMinor: string | null;
  storageDueMinor: string | null;
  storageCreditMinor: string | null;
  notes: string[];
}
export interface ProfitReconciliationFinding {
  id: string;
  kind: string;
  targetType: string;
  targetId: string;
  sourceIds: string[];
  observedVersion: string;
  expectedMinor: string | null;
  observedMinor: string | null;
  deltaMinor: string | null;
  asOf: string;
  branchIds: string[];
  recoveryPath: string | null;
  message: string;
  sourceCapability: string;
}
export interface ProfitSummary {
  profitMinor: string;
  categories: { category: ProfitCategory; amountMinor: string; sourceCount: number }[];
  branches: { branchId: string | null; branchName: string; profitMinor: string }[];
  shipping: { grossMinor: string; waiverMinor: string; netMinor: string };
  payroll: {
    salaryMinor: string;
    commissionMinor: string;
    additionsMinor: string;
    entitlementDeductionsMinor: string;
    employeeCostMinor: string;
    advanceRecoveryMinor: string;
    incidentRecoveryWithheldMinor: string;
    payoutMinor: string;
  };
  laterEntryCount: number;
  calculationComplete: boolean;
  limitations: string[];
}
const text = { type: 'string' },
  uuid = { type: 'string', format: 'uuid' },
  nullableText = { type: ['string', 'null'] },
  date = { type: 'string', format: 'date' },
  dateTime = { type: 'string', format: 'date-time' },
  minor = { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
  nullableMinor = { type: ['string', 'null'], pattern: '^(0|-?[1-9][0-9]*)$' };
const array = (items: unknown) => ({ type: 'array', items });
const closed = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});
const amountFields = (names: string[], nullable = false) =>
  Object.fromEntries(names.map((n) => [n, nullable ? nullableMinor : minor]));
export const economicEffectSchema = closed(
  {
    companyId: uuid,
    sourceId: text,
    effectId: text,
    category: { enum: profitCategories },
    amountMinor: minor,
    effectiveDate: date,
    recordedAt: dateTime,
    historicalBranchId: { type: ['string', 'null'], format: 'uuid' },
    postingBatchId: nullableText,
    correctionOf: array(text),
    revision: text,
    sourceCapability: text,
    sourcePath: nullableText,
    shipmentId: uuid,
    periodId: text,
    employeeId: uuid,
    incidentId: uuid,
  },
  [
    'companyId',
    'sourceId',
    'effectId',
    'category',
    'amountMinor',
    'effectiveDate',
    'recordedAt',
    'historicalBranchId',
    'postingBatchId',
    'correctionOf',
    'revision',
    'sourceCapability',
    'sourcePath',
  ],
);
export const profitSourceIssueSchema = closed({
  code: text,
  targetKind: text,
  targetId: text,
  branchId: { type: ['string', 'null'], format: 'uuid' },
  sourceIds: array(text),
  observedVersion: text,
  deltaMinor: nullableMinor,
  effectiveDate: { type: ['string', 'null'], format: 'date' },
  recordedAt: { type: ['string', 'null'], format: 'date-time' },
  message: text,
  sourceCapability: text,
  sourcePath: nullableText,
});
export const profitActualMoneySchema = closed({
  asOf: dateTime,
  dateBasis: { const: 'current' },
  accounts: array(
    closed({
      id: uuid,
      name: text,
      type: text,
      ...amountFields(['bookMinor', 'journalMinor', 'heldMinor', 'availableMinor']),
      projectionVersion: text,
    }),
  ),
  ...amountFields(
    [
      'fundsInTransitMinor',
      'heldDiscrepanciesMinor',
      'unremittedRecipientMinor',
      'brandLiabilitiesMinor',
      'brandPendingMinor',
      'brandHeldMinor',
      'storageDueMinor',
      'storageCreditMinor',
    ],
    true,
  ),
  notes: array(text),
});
export const profitReconciliationFindingSchema = closed({
  id: text,
  kind: text,
  targetType: text,
  targetId: text,
  sourceIds: array(text),
  observedVersion: text,
  ...amountFields(['expectedMinor', 'observedMinor', 'deltaMinor'], true),
  asOf: dateTime,
  branchIds: array(uuid),
  recoveryPath: nullableText,
  message: text,
  sourceCapability: text,
});
export const profitSummarySchema = closed({
  profitMinor: minor,
  categories: array(
    closed({
      category: { enum: profitCategories },
      amountMinor: minor,
      sourceCount: { type: 'integer', minimum: 0 },
    }),
  ),
  branches: array(
    closed({
      branchId: { type: ['string', 'null'], format: 'uuid' },
      branchName: text,
      profitMinor: minor,
    }),
  ),
  shipping: closed(amountFields(['grossMinor', 'waiverMinor', 'netMinor'])),
  payroll: closed(
    amountFields([
      'salaryMinor',
      'commissionMinor',
      'additionsMinor',
      'entitlementDeductionsMinor',
      'employeeCostMinor',
      'advanceRecoveryMinor',
      'incidentRecoveryWithheldMinor',
      'payoutMinor',
    ]),
  ),
  laterEntryCount: { type: 'integer', minimum: 0 },
  calculationComplete: { type: 'boolean' },
  limitations: array(text),
});
