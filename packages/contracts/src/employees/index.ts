import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import { commercialFailureSchema } from '../brands.js';
export interface EmployeeMoney {
  currency: 'EGP';
  amountMinor: string;
}
export type SalaryTerms =
  { enabled: false; monthly: null } | { enabled: true; monthly: EmployeeMoney };
export type CommissionTerms =
  | { enabled: false; formula: null; basisPoints: null; perVisit: null }
  | { enabled: true; formula: 'percentage'; basisPoints: number; perVisit: null }
  | { enabled: true; formula: 'fixed'; basisPoints: null; perVisit: EmployeeMoney };
export interface EmployeeFields {
  name: string;
  contact: string;
  active: boolean;
  employmentStart: string;
  employmentEnd: string | null;
  branchId: string;
  workDays: number[];
  hoursPerDay: number;
  weeklyDayOff: number | null;
}
export interface EmployeeTerms {
  salary: SalaryTerms;
  commission: CommissionTerms;
}
export interface TermChange {
  salary: { month: string; terms: SalaryTerms } | null;
  commission: { effectiveDate: string; terms: CommissionTerms } | null;
  reason: string;
}
type Envelope = { schemaVersion: 1; companyId: string; commandId: string };
export type EmployeeCommand = Envelope &
  (
    | { type: 'employee.create'; fields: EmployeeFields; terms: EmployeeTerms }
    | {
        type: 'employee.update';
        employeeId: string;
        expectedVersion: number;
        fields: EmployeeFields;
        branchEffectiveDate: string | null;
        reason: string;
      }
    | { type: 'employee.deactivate'; employeeId: string; expectedVersion: number; reason: string }
    | { type: 'employee.terms'; employeeId: string; expectedVersion: number; change: TermChange }
    | {
        type: 'employee.link';
        employeeId: string;
        expectedVersion: number;
        effectiveDate: string;
        endDate: string | null;
        driverId: string | null;
        localDriver: { name: string; branchId: string } | null;
        reason: string;
      }
  );
export interface EmployeeResult {
  commandId: string;
  employeeId: string;
  reference: string;
  version: number;
  branchId: string;
}
export interface PolicyRecord {
  id: string;
  axis: 'salary' | 'commission';
  from: string;
  to: string | null;
  superseded: boolean;
  terms: SalaryTerms | CommissionTerms;
  reason: string;
  recordedAt: string;
}
export interface DriverRecord {
  id: string;
  name: string;
  branchId: string;
  active: boolean;
  externalMapping: 'pending' | 'mapped';
}
export interface LinkRecord {
  id: string;
  driverId: string;
  from: string;
  to: string | null;
  driverName: string;
  externalMapping: 'pending' | 'mapped';
}
export type PayrollState = 'editable_unpaid' | 'frozen_unpaid' | 'paid' | 'zero_net_closed';
export interface EmployeeRecord {
  id: string;
  reference: string;
  version: number;
  fields: EmployeeFields;
  terms: EmployeeTerms;
  association: 'none' | 'pending_external_mapping' | 'mapped';
  currentBranchName: string;
}
export interface EmployeeDetail extends EmployeeRecord {
  policies: PolicyRecord[];
  branches: {
    id: string;
    branchId: string;
    branchName: string;
    from: string;
    to: string | null;
    reason: string;
  }[];
  links: LinkRecord[];
  revisions: {
    version: number;
    fields: EmployeeFields;
    reason: string;
    at: string;
    actor: string;
  }[];
  periods: { month: string; state: PayrollState; version: number }[];
  boundaries: { currentMonth: string; earliestCommissionDate: string; salaryExplanation: string };
}
export interface EmployeeFilter {
  search: string;
  branchId: string | null;
  active: 'all' | 'true' | 'false';
  salary: 'all' | 'enabled' | 'disabled';
  commission: 'all' | 'disabled' | 'percentage' | 'fixed';
  effectiveDate: string | null;
  page: number;
  limit: number;
}
export interface EmployeeList {
  items: EmployeeRecord[];
  total: number;
  page: number;
  limit: number;
}
export interface EmployeeCatalog {
  companyId: string;
  branches: { id: string; name: string }[];
  drivers: DriverRecord[];
  currentMonth: string;
  today: string;
}
export interface TermsPreview {
  employeeId: string;
  version: number;
  before: EmployeeTerms;
  after: EmployeeTerms;
  salaryMonth: string | null;
  commissionDate: string | null;
  allowed: boolean;
  protectedReason: string | null;
  base: EmployeeMoney;
  packingUplift: EmployeeMoney;
  commission: EmployeeMoney;
  effects: string[];
}
const uuid = { type: 'string', format: 'uuid' };
const date = { type: 'string', format: 'date' };
const month = { type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' };
const text = (maxLength = 180) => ({ type: 'string', minLength: 1, maxLength, pattern: '\\S' });
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const object = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
export const employeeMoneySchema = object({
  currency: { const: 'EGP', type: 'string' },
  amountMinor: { type: 'string', pattern: '^(0|[1-9][0-9]*)$', maxLength: 19 },
});
export const salaryTermsSchema = {
  oneOf: [
    object({ enabled: { const: false, type: 'boolean' }, monthly: { type: 'null' } }),
    object({ enabled: { const: true, type: 'boolean' }, monthly: employeeMoneySchema }),
  ],
};
export const commissionTermsSchema = {
  oneOf: [
    object({
      enabled: { const: false, type: 'boolean' },
      formula: { type: 'null' },
      basisPoints: { type: 'null' },
      perVisit: { type: 'null' },
    }),
    object({
      enabled: { const: true, type: 'boolean' },
      formula: { const: 'percentage', type: 'string' },
      basisPoints: { type: 'integer', minimum: 0, maximum: 10000 },
      perVisit: { type: 'null' },
    }),
    object({
      enabled: { const: true, type: 'boolean' },
      formula: { const: 'fixed', type: 'string' },
      basisPoints: { type: 'null' },
      perVisit: employeeMoneySchema,
    }),
  ],
};
export const employeeFieldsSchema = object({
  name: text(),
  contact: { type: 'string', maxLength: 180 },
  active: { type: 'boolean' },
  employmentStart: date,
  employmentEnd: nullable(date),
  branchId: uuid,
  workDays: {
    type: 'array',
    uniqueItems: true,
    maxItems: 7,
    items: { type: 'integer', minimum: 0, maximum: 6 },
  },
  hoursPerDay: { type: 'number', minimum: 0, maximum: 24, multipleOf: 0.5 },
  weeklyDayOff: nullable({ type: 'integer', minimum: 0, maximum: 6 }),
});
const terms = object({ salary: salaryTermsSchema, commission: commissionTermsSchema });
export const termChangeSchema = object({
  salary: nullable(object({ month, terms: salaryTermsSchema })),
  commission: nullable(object({ effectiveDate: date, terms: commissionTermsSchema })),
  reason: text(1000),
});
const envelope = { schemaVersion: { type: 'integer', const: 1 }, companyId: uuid, commandId: uuid };
const edit = { employeeId: uuid, expectedVersion: { type: 'integer', minimum: 1 } };
const command = (type: string, props: Record<string, unknown>) =>
  object({ ...envelope, type: { type: 'string', const: type }, ...props });
export const employeeCommandSchema = {
  oneOf: [
    command('employee.create', { fields: employeeFieldsSchema, terms }),
    command('employee.update', {
      ...edit,
      fields: employeeFieldsSchema,
      branchEffectiveDate: nullable(date),
      reason: text(1000),
    }),
    command('employee.deactivate', { ...edit, reason: text(1000) }),
    command('employee.terms', { ...edit, change: termChangeSchema }),
    command('employee.link', {
      ...edit,
      effectiveDate: date,
      endDate: nullable(date),
      driverId: nullable(uuid),
      localDriver: nullable(object({ name: text(), branchId: uuid })),
      reason: text(1000),
    }),
  ],
};
const result = object({
  commandId: uuid,
  employeeId: uuid,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  version: { type: 'integer', minimum: 1 },
  branchId: uuid,
});
const policy = object({
  id: uuid,
  axis: { type: 'string', enum: ['salary', 'commission'] },
  from: date,
  to: nullable(date),
  superseded: { type: 'boolean' },
  terms: { oneOf: [salaryTermsSchema, commissionTermsSchema] },
  reason: { type: 'string' },
  recordedAt: { type: 'string', format: 'date-time' },
});
const externalMapping = { type: 'string', enum: ['pending', 'mapped'] };
const recordProps = {
  id: uuid,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  version: { type: 'integer', minimum: 1 },
  fields: employeeFieldsSchema,
  terms,
  association: { type: 'string', enum: ['none', 'pending_external_mapping', 'mapped'] },
  currentBranchName: { type: 'string' },
};
const array = (items: object) => ({ type: 'array', items });
export const employeeViews = {
  error: commercialFailureSchema,
  result,
  catalog: object({
    companyId: uuid,
    branches: array(object({ id: uuid, name: { type: 'string' } })),
    drivers: array(
      object({
        id: uuid,
        name: { type: 'string' },
        branchId: uuid,
        active: { type: 'boolean' },
        externalMapping,
      }),
    ),
    currentMonth: month,
    today: date,
  }),
  list: object({
    items: array(object(recordProps)),
    total: { type: 'integer', minimum: 0 },
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  }),
  detail: object({
    ...recordProps,
    policies: array(policy),
    branches: array(
      object({
        id: uuid,
        branchId: uuid,
        branchName: { type: 'string' },
        from: date,
        to: nullable(date),
        reason: { type: 'string' },
      }),
    ),
    links: array(
      object({
        id: uuid,
        driverId: uuid,
        from: date,
        to: nullable(date),
        driverName: { type: 'string' },
        externalMapping,
      }),
    ),
    revisions: array(
      object({
        version: { type: 'integer' },
        fields: employeeFieldsSchema,
        reason: { type: 'string' },
        at: { type: 'string', format: 'date-time' },
        actor: { type: 'string' },
      }),
    ),
    periods: array(
      object({
        month,
        state: {
          type: 'string',
          enum: ['editable_unpaid', 'frozen_unpaid', 'paid', 'zero_net_closed'],
        },
        version: { type: 'integer', minimum: 1 },
      }),
    ),
    boundaries: object({
      currentMonth: month,
      earliestCommissionDate: date,
      salaryExplanation: { type: 'string' },
    }),
  }),
  preview: object({
    employeeId: uuid,
    version: { type: 'integer', minimum: 1 },
    before: terms,
    after: terms,
    salaryMonth: nullable(month),
    commissionDate: nullable(date),
    allowed: { type: 'boolean' },
    protectedReason: nullable({ type: 'string' }),
    base: employeeMoneySchema,
    packingUplift: employeeMoneySchema,
    commission: employeeMoneySchema,
    effects: array({ type: 'string' }),
  }),
};
export const employeeFilterSchema = object({
  search: { type: 'string', maxLength: 180 },
  branchId: nullable(uuid),
  active: { type: 'string', enum: ['all', 'true', 'false'] },
  salary: { type: 'string', enum: ['all', 'enabled', 'disabled'] },
  commission: { type: 'string', enum: ['all', 'disabled', 'percentage', 'fixed'] },
  effectiveDate: nullable(date),
  page: { type: 'integer', minimum: 1 },
  limit: { type: 'integer', minimum: 1, maximum: 100 },
});
export const employeePreviewInputSchema = object({
  companyId: uuid,
  expectedVersion: edit.expectedVersion,
  change: termChangeSchema,
  base: employeeMoneySchema,
  packingUplift: employeeMoneySchema,
});
const ajv = new AjvModule.default({ allErrors: true, strict: true });
formatsModule.default(ajv);
export const validateEmployeeCommand = ajv.compile<EmployeeCommand>(employeeCommandSchema);
export const validateEmployeeTerms = ajv.compile<EmployeeTerms>(terms);
export const validateEmployeeFields = ajv.compile<EmployeeFields>(employeeFieldsSchema);
export const validateTermChange = ajv.compile<TermChange>(termChangeSchema);
export const validateEmployeeFilter = ajv.compile<EmployeeFilter>(employeeFilterSchema);
export const validateEmployeePreviewInput = ajv.compile<{
  companyId: string;
  expectedVersion: number;
  change: TermChange;
  base: EmployeeMoney;
  packingUplift: EmployeeMoney;
}>(employeePreviewInputSchema);
export const validateEmployeeViews: Record<
  string,
  ReturnType<typeof ajv.compile>
> = Object.fromEntries(
  Object.entries(employeeViews).map(([key, schema]) => [key, ajv.compile(schema)]),
);
export const employeeExamples = {
  off: {
    salary: { enabled: false, monthly: null },
    commission: { enabled: false, formula: null, basisPoints: null, perVisit: null },
  },
  salary: {
    salary: { enabled: true, monthly: { currency: 'EGP', amountMinor: '600000' } },
    commission: { enabled: false, formula: null, basisPoints: null, perVisit: null },
  },
  fixed: {
    salary: { enabled: false, monthly: null },
    commission: {
      enabled: true,
      formula: 'fixed',
      basisPoints: null,
      perVisit: { currency: 'EGP', amountMinor: '700' },
    },
  },
  combined: {
    salary: { enabled: true, monthly: { currency: 'EGP', amountMinor: '600000' } },
    commission: { enabled: true, formula: 'percentage', basisPoints: 1000, perVisit: null },
  },
} satisfies Record<string, EmployeeTerms>;
const response = (schema: object) => ({
  description: 'Closed employee response',
  content: { 'application/json': { schema } },
});
const errors = Object.fromEntries(
  ['400', '401', '403', '404', '409', '500'].map((code) => [
    code,
    response(commercialFailureSchema),
  ]),
);
const write = {
  summary: 'Employee setup command; no money posting',
  requestBody: {
    required: true,
    content: { 'application/json': { schema: employeeCommandSchema } },
  },
  responses: { '200': response(result), ...errors },
};
export const employeePaths = {
  '/api/v1/employees': { get: { responses: { '200': response(employeeViews.list) } }, post: write },
  '/api/v1/employees/catalog': { get: { responses: { '200': response(employeeViews.catalog) } } },
  '/api/v1/employees/{id}': {
    get: { responses: { '200': response(employeeViews.detail) } },
    post: write,
  },
  '/api/v1/employees/{id}/terms': { post: write },
  '/api/v1/employees/{id}/driver-links': { post: write },
  '/api/v1/employees/{id}/terms/preview': {
    post: {
      requestBody: {
        required: true,
        content: { 'application/json': { schema: employeePreviewInputSchema } },
      },
      responses: { '200': response(employeeViews.preview) },
    },
  },
  '/api/v1/employees/commands/{commandId}': { get: { responses: { '200': response(result) } } },
};
