import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import {
  closedObject,
  dateSchema,
  uuidSchema,
  nonnegativeMinorSchema,
  positiveMinorSchema,
} from '../../finance/brand-wallet/index.js';
import { paymentMethods, type PaymentMethod } from '../../finance/index.js';
import type { PayrollState } from '../index.js';
import { commissionTermsSchema } from '../index.js';

export type PayrollObligationKind = 'advance' | 'earning_deduction' | 'incident';
export type PayrollAdditionKind = 'bonus' | 'overtime' | 'earning_correction';
export interface PayrollObligation {
  id: string;
  kind: PayrollObligationKind;
  sourceId: string;
  sourceLabel: string;
  month: string;
  effectiveDate: string;
  recordedAt: string;
  branchId: string;
  amountMinor: string;
  outstandingAmount: string;
  reservedForFrozenPeriods: string;
  availableForNewAllocation: string;
  advancePayment?: {
    branchId: string;
    accountId: string;
    method: PaymentMethod;
    actualDate: string;
    movementId: string;
    reference: string;
  } | null;
  recoveries?: { month: string; state: 'reserved' | 'settled'; amountMinor: string }[];
}
export interface PayrollEarning {
  id: string;
  kind: 'salary' | 'commission' | PayrollAdditionKind | 'earning_deduction';
  amountMinor: string;
  branchId: string;
  workDate: string;
  recordedAt: string;
  sourceId: string;
  label: string;
  visitId: string | null;
  policyId: string | null;
  commissionBasis?: { baseMinor: string; terms: import('../index.js').CommissionTerms } | null;
}
export interface PayrollAllocation {
  obligationId: string;
  kind: PayrollObligationKind;
  amountMinor: string;
  remainingMinor: string;
}
export interface PayrollCalculation {
  salary: string;
  commission: string;
  bonus: string;
  overtime: string;
  positiveEarningAdjustments: string;
  grossEarning: string;
  newAdvancesDue: string;
  newOrdinaryDeductions: string;
  newIncidentDeductions: string;
  priorCarriedUnrecoveredObligations: string;
  obligations: string;
  recoveryThisPeriod: string;
  earningDeductionsRecovered: string;
  advanceRecovered: string;
  incidentRecovered: string;
  outstandingAmount: string;
  reservedForFrozenPeriods: string;
  availableForNewAllocation: string;
  netPayable: string;
  carryRemaining: string;
  employeeCost: string;
  allocations: PayrollAllocation[];
}
export interface PayrollReview {
  id: string;
  visitId: string;
  workMonth: string;
  workDate: string;
  branchId: string;
  kind: 'late_commission' | 'source_conflict';
  amountMinor: string | null;
  postedMinor: string;
  reason: string;
  resolvedMonth: string | null;
}
export interface PayrollPayment {
  branchId?: string | null;
  id: string;
  commandId: string;
  amountMinor: string;
  actualDate: string;
  accountId: string | null;
  method: PaymentMethod | null;
  movementId: string | null;
  reference: string;
  recordedAt: string;
}
export interface PayrollMonth {
  employeeId: string;
  employeeName: string;
  branchId: string;
  month: string;
  currentMonth: string;
  state: PayrollState;
  version: number;
  digest: string;
  frozenAt: string | null;
  calculation: PayrollCalculation;
  earnings: PayrollEarning[];
  obligations: PayrollObligation[];
  reviews: PayrollReview[];
  blockers: string[];
  payment: PayrollPayment | null;
}
export interface PayrollFunding {
  accountId: string;
  branchId: string;
  method: PaymentMethod;
  actualDate: string;
  reference: string;
}
export interface PayrollPreviewInput {
  companyId: string;
  expectedVersion: number;
  expectedDigest: string;
  funding: PayrollFunding;
}
export interface PayrollPreview {
  month: PayrollMonth;
  funding: PayrollFunding;
  accountName: string;
  availableMinor: string;
  blockers: string[];
}
interface PayrollEnvelope {
  schemaVersion: 1;
  companyId: string;
  commandId: string;
  employeeId: string;
  month: string;
  expectedVersion: number;
  expectedDigest: string;
}
export type PayrollCommand =
  | (PayrollEnvelope & { type: 'payroll.advance'; amountMinor: string; funding: PayrollFunding })
  | (PayrollEnvelope & {
      type: 'payroll.adjustment';
      kind: 'bonus' | 'overtime' | 'earning_deduction';
      amountMinor: string;
      reason: string;
      workDate: string;
    })
  | (PayrollEnvelope & { type: 'payroll.resolve'; reviewId: string; reason: string })
  | (PayrollEnvelope & { type: 'payroll.payout'; funding: PayrollFunding })
  | (PayrollEnvelope & { type: 'payroll.zero-close' });
export interface PayrollResult {
  commandId: string;
  employeeId: string;
  month: string;
  recordId: string;
  kind: PayrollCommand['type'];
  amountMinor: string;
}
const month = { type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' };
const str = { type: 'string' };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const version = { type: 'integer', minimum: 1 };
const digest = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const reason = { type: 'string', minLength: 1, maxLength: 1000, pattern: '\\S' };
const funding = closedObject({
  accountId: uuidSchema,
  branchId: uuidSchema,
  method: { enum: paymentMethods },
  actualDate: dateSchema,
  reference: { type: 'string', maxLength: 180 },
});
const envelope = {
  schemaVersion: { const: 1 },
  companyId: uuidSchema,
  commandId: uuidSchema,
  employeeId: uuidSchema,
  month,
  expectedVersion: version,
  expectedDigest: digest,
};
export const payrollCommandSchema = {
  oneOf: [
    closedObject({
      ...envelope,
      type: { const: 'payroll.advance' },
      amountMinor: positiveMinorSchema,
      funding,
    }),
    closedObject({
      ...envelope,
      type: { const: 'payroll.adjustment' },
      kind: { enum: ['bonus', 'overtime', 'earning_deduction'] },
      amountMinor: positiveMinorSchema,
      reason,
      workDate: dateSchema,
    }),
    closedObject({ ...envelope, type: { const: 'payroll.resolve' }, reviewId: uuidSchema, reason }),
    closedObject({ ...envelope, type: { const: 'payroll.payout' }, funding }),
    closedObject({ ...envelope, type: { const: 'payroll.zero-close' } }),
  ],
};
const minor = nonnegativeMinorSchema;
const calculation = closedObject({
  ...Object.fromEntries(
    [
      'salary',
      'commission',
      'bonus',
      'overtime',
      'positiveEarningAdjustments',
      'grossEarning',
      'newAdvancesDue',
      'newOrdinaryDeductions',
      'newIncidentDeductions',
      'priorCarriedUnrecoveredObligations',
      'obligations',
      'recoveryThisPeriod',
      'earningDeductionsRecovered',
      'advanceRecovered',
      'incidentRecovered',
      'outstandingAmount',
      'reservedForFrozenPeriods',
      'availableForNewAllocation',
      'netPayable',
      'carryRemaining',
    ].map((k) => [k, minor]),
  ),
  employeeCost: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
  allocations: {
    type: 'array',
    items: closedObject({
      obligationId: uuidSchema,
      kind: { enum: ['advance', 'earning_deduction', 'incident'] },
      amountMinor: positiveMinorSchema,
      remainingMinor: minor,
    }),
  },
});
const earning = closedObject({
  id: uuidSchema,
  kind: {
    enum: ['salary', 'commission', 'bonus', 'overtime', 'earning_correction', 'earning_deduction'],
  },
  amountMinor: minor,
  branchId: uuidSchema,
  workDate: dateSchema,
  recordedAt: str,
  sourceId: uuidSchema,
  label: str,
  visitId: nullable(uuidSchema),
  policyId: nullable(uuidSchema),
  commissionBasis: nullable(closedObject({ baseMinor: minor, terms: commissionTermsSchema })),
});
earning.required = earning.required.filter((k) => k !== 'commissionBasis');
const obligation = closedObject({
  id: uuidSchema,
  kind: { enum: ['advance', 'earning_deduction', 'incident'] },
  sourceId: uuidSchema,
  sourceLabel: str,
  month,
  effectiveDate: dateSchema,
  recordedAt: str,
  branchId: uuidSchema,
  amountMinor: positiveMinorSchema,
  outstandingAmount: minor,
  reservedForFrozenPeriods: minor,
  availableForNewAllocation: minor,
  advancePayment: nullable(
    closedObject({
      branchId: uuidSchema,
      accountId: uuidSchema,
      method: { enum: paymentMethods },
      actualDate: dateSchema,
      movementId: uuidSchema,
      reference: str,
    }),
  ),
  recoveries: {
    type: 'array',
    items: closedObject({
      month,
      state: { enum: ['reserved', 'settled'] },
      amountMinor: positiveMinorSchema,
    }),
  },
});
obligation.required = obligation.required.filter(
  (k) => !['advancePayment', 'recoveries'].includes(k),
);
const review = closedObject({
  id: uuidSchema,
  visitId: uuidSchema,
  workMonth: month,
  workDate: dateSchema,
  branchId: uuidSchema,
  kind: { enum: ['late_commission', 'source_conflict'] },
  amountMinor: nullable(minor),
  postedMinor: minor,
  reason: str,
  resolvedMonth: nullable(month),
});
const payment = closedObject({
  branchId: nullable(uuidSchema),
  id: uuidSchema,
  commandId: uuidSchema,
  amountMinor: minor,
  actualDate: dateSchema,
  accountId: nullable(uuidSchema),
  method: nullable({ enum: paymentMethods }),
  movementId: nullable(uuidSchema),
  reference: str,
  recordedAt: str,
});
payment.required = payment.required.filter((k) => k !== 'branchId');
export const payrollMonthSchema = closedObject({
  employeeId: uuidSchema,
  employeeName: str,
  branchId: uuidSchema,
  month,
  currentMonth: month,
  state: { enum: ['editable_unpaid', 'frozen_unpaid', 'paid', 'zero_net_closed'] },
  version,
  digest,
  frozenAt: nullable(str),
  calculation,
  earnings: { type: 'array', items: earning },
  obligations: { type: 'array', items: obligation },
  reviews: { type: 'array', items: review },
  blockers: { type: 'array', items: str },
  payment: nullable(payment),
});
export const payrollPreviewInputSchema = closedObject({
  companyId: uuidSchema,
  expectedVersion: version,
  expectedDigest: digest,
  funding,
});
export const payrollResultSchema = closedObject({
  commandId: uuidSchema,
  employeeId: uuidSchema,
  month,
  recordId: uuidSchema,
  kind: {
    enum: [
      'payroll.advance',
      'payroll.adjustment',
      'payroll.resolve',
      'payroll.payout',
      'payroll.zero-close',
    ],
  },
  amountMinor: minor,
});
export const payrollPreviewSchema = closedObject({
  month: payrollMonthSchema,
  funding,
  accountName: str,
  availableMinor: minor,
  blockers: { type: 'array', items: str },
});
const ajv = new AjvModule.default({ allErrors: true, strict: false });
formatsModule.default(ajv);
export const validatePayrollCommand = ajv.compile<PayrollCommand>(payrollCommandSchema);
export const validatePayrollMonth = ajv.compile<PayrollMonth>(payrollMonthSchema);
export const validatePayrollPreviewInput =
  ajv.compile<PayrollPreviewInput>(payrollPreviewInputSchema);
export const validatePayrollPreview = ajv.compile<PayrollPreview>(payrollPreviewSchema);
export const validatePayrollResult = ajv.compile<PayrollResult>(payrollResultSchema);
export interface PayrollCatalog {
  accounts: {
    id: string;
    name: string;
    type: 'cash' | 'bank';
    balanceMinor: string;
    branchIds: string[];
  }[];
}
export const payrollCatalogSchema = closedObject({
  accounts: {
    type: 'array',
    items: closedObject({
      id: uuidSchema,
      name: str,
      type: { enum: ['cash', 'bank'] },
      balanceMinor: minor,
      branchIds: { type: 'array', items: uuidSchema },
    }),
  },
});
export const validatePayrollCatalog = ajv.compile<PayrollCatalog>(payrollCatalogSchema);
const exampleId = '00000000-0000-4000-a000-000000000020';
const exampleEnvelope = {
  schemaVersion: 1 as const,
  companyId: exampleId,
  commandId: exampleId,
  employeeId: exampleId,
  month: '2026-10',
  expectedVersion: 1,
  expectedDigest: 'a'.repeat(64),
};
const exampleFunding: PayrollFunding = {
  accountId: exampleId,
  branchId: exampleId,
  method: 'cash',
  actualDate: '2026-10-07',
  reference: 'Actual payment reference',
};
/** Illustrative identities only; clients must use the returned version/digest and a new command ID. */
export const payrollExamples: Record<string, PayrollCommand> = {
  advance: {
    ...exampleEnvelope,
    type: 'payroll.advance',
    amountMinor: '100000',
    funding: exampleFunding,
  },
  deduction: {
    ...exampleEnvelope,
    type: 'payroll.adjustment',
    kind: 'earning_deduction',
    amountMinor: '20000',
    reason: 'Staff-calculated partial-month deduction',
    workDate: '2026-10-07',
  },
  bonus: {
    ...exampleEnvelope,
    type: 'payroll.adjustment',
    kind: 'bonus',
    amountMinor: '10000',
    reason: 'Approved monetary bonus',
    workDate: '2026-10-07',
  },
  overtime: {
    ...exampleEnvelope,
    type: 'payroll.adjustment',
    kind: 'overtime',
    amountMinor: '10000',
    reason: 'Approved monetary overtime',
    workDate: '2026-10-07',
  },
  review: {
    ...exampleEnvelope,
    type: 'payroll.resolve',
    reviewId: exampleId,
    reason: 'Accept captured late work amount',
  },
  payout: { ...exampleEnvelope, type: 'payroll.payout', funding: exampleFunding },
  zeroClose: { ...exampleEnvelope, type: 'payroll.zero-close' },
};
const pathParameter = (name: string, schema: object) => ({
  in: 'path',
  name,
  required: true,
  schema,
});
const companyQuery = { in: 'query', name: 'companyId', required: true, schema: uuidSchema };
const readOperation = (schema: object, parameters: object[]) => ({
  tags: ['Employees payroll'],
  parameters,
  responses: {
    '200': {
      description: 'Authoritative scoped payroll data',
      content: { 'application/json': { schema } },
    },
    '403': { description: 'Employee and historical source branch scope denied' },
  },
});
const operation = (schema: object, response: object) => ({
  tags: ['Employees payroll'],
  parameters: [
    { in: 'header', name: 'X-CSRF-Token', required: true, schema: str },
    { in: 'header', name: 'Origin', required: true, schema: str },
  ],
  requestBody: { required: true, content: { 'application/json': { schema } } },
  responses: {
    '200': {
      description: 'Authoritative payroll result',
      content: { 'application/json': { schema: response } },
    },
    '400': { description: 'Closed schema rejects partial payment or invalid amount' },
    '403': { description: 'Scope or CSRF denied' },
    '409': { description: 'Revised/protected calculation, funds or source review conflict' },
  },
});
export const payrollPaths = {
  '/api/v1/employees/payroll/catalog': { get: readOperation(payrollCatalogSchema, [companyQuery]) },
  '/api/v1/employees/payroll/commands/{commandId}': {
    get: readOperation(payrollResultSchema, [pathParameter('commandId', uuidSchema), companyQuery]),
  },
  '/api/v1/employees/{id}/months/{month}': {
    parameters: [pathParameter('id', uuidSchema), pathParameter('month', month), companyQuery],
    get: {
      tags: ['Employees payroll'],
      responses: {
        '200': {
          description: 'Full month with immutable source categories',
          content: { 'application/json': { schema: payrollMonthSchema } },
        },
      },
    },
  },
  ...Object.fromEntries(
    [
      'advances',
      'period-adjustments',
      'source-reviews/resolve',
      'months/{month}/payout',
      'months/{month}/zero-close',
    ].map((path) => [
      '/api/v1/employees/{id}/' + path,
      {
        parameters: [
          pathParameter('id', uuidSchema),
          ...(path.includes('{month}') ? [pathParameter('month', month)] : []),
        ],
        post: operation(payrollCommandSchema, payrollResultSchema),
      },
    ]),
  ),
  '/api/v1/employees/{id}/months/{month}/payout-preview': {
    parameters: [pathParameter('id', uuidSchema), pathParameter('month', month)],
    post: operation(payrollPreviewInputSchema, payrollPreviewSchema),
  },
};
