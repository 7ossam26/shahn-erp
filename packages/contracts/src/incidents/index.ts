import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import {
  closedObject as obj,
  uuidSchema as uuid,
  nonnegativeMinorSchema as money,
} from '../finance/brand-wallet/index.js';

export type IncidentSourceKind = 'shipment_line' | 'stock_movement' | 'transfer_line';
export interface IncidentSelection {
  kind: IncidentSourceKind;
  sourceId: string;
  lineId: string | null;
  offset: number;
  quantity: number;
}
export interface IncidentReport {
  brandId: string;
  kind: 'loss' | 'damage';
  observedAt: string;
  cause: string;
  comment: string;
  evidence: string[];
  items: IncidentSelection[];
}
export interface IncidentConfirmation {
  expectedVersion: number;
  goodsValueMinor: string;
  compensationMinor: string;
  companyShareMinor: string;
  employeeShareMinor: string;
  responsibleBranchId: string;
  branchReason: string;
  employeeId: string | null;
  payrollMonth: string | null;
  agreementReason: string;
}
export type IncidentCommand = { schemaVersion: 1; companyId: string; commandId: string } & (
  | { type: 'incident.report'; report: IncidentReport }
  | { type: 'incident.confirm'; incidentId: string; confirmation: IncidentConfirmation }
  | { type: 'incident.dismiss'; incidentId: string; expectedVersion: number; reason: string }
  | { type: 'incident.review'; incidentId: string; expectedVersion: number; reason: string }
  | { type: 'incident.disposition'; incidentId: string; expectedVersion: number; reason: string }
);
export interface IncidentCandidate {
  kind: IncidentSourceKind;
  sourceId: string;
  lineId: string | null;
  key: string;
  brandId: string;
  branchId: string;
  shipmentId: string | null;
  label: string;
  capacity: number;
  holder: 'branch' | 'driver';
  driverId: string | null;
  variantId: string | null;
  sourceCondition: 'sound' | 'unavailable';
  returnRequestId: string | null;
  returnItemId: string | null;
  returnRevision: number | null;
  claimed: { offset: number; quantity: number }[];
}
export interface IncidentResult {
  incidentId: string;
  reference: string;
  version: number;
  commandId: string;
}
export interface IncidentDetail {
  id: string;
  reference: string;
  version: number;
  state: 'reported' | 'confirmed' | 'dismissed';
  brandId: string;
  brandName: string;
  custodyBranchId: string;
  responsibleBranchId: string;
  branchName: string;
  holder: 'branch' | 'driver';
  driverId: string | null;
  report: IncidentReport;
  items: (IncidentSelection & { snapshot: IncidentCandidate })[];
  recordedAt: string;
  actorName: string;
  dismissalReason: string | null;
  confirmation:
    | (IncidentConfirmation & {
        id: string;
        sourceId: string;
        lotId: string;
        obligationId: string | null;
        employeePayrollBranchId: string | null;
        confirmedAt: string;
        actorName: string;
        effects: {
          id: string;
          family: string;
          kind: string;
          amountMinor: string;
          branchId: string;
        }[];
      })
    | null;
  disposition: {
    state:
      | 'not_confirmed'
      | 'native_recorded'
      | 'awaiting_request'
      | 'awaiting_dependency'
      | 'pending'
      | 'accepted'
      | 'review';
    actionIds: string[];
  };
  replacements: { id: string; reference: string; payer: 'recipient' | 'brand' | 'company' }[];
  payouts: { id: string; reference: string; amountMinor: string }[];
  review: {
    id: string;
    reason: string;
    holdMinor: string;
    status: 'awaiting_p21';
    recordedAt: string;
  } | null;
  recovery: { obligationId: string | null; status: 'awaiting_p20'; amountMinor: string };
}
export interface IncidentPreview {
  confirmation: IncidentConfirmation;
  blockers: string[];
  allowedPayrollMonth: string | null;
  walletCreditMinor: string;
  employeeObligationMinor: string;
  compensationCostMinor: string;
  employeeCompensationShareMinor: string;
  cashMinor: '0';
}
export interface IncidentCatalog {
  branches: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  employees: { id: string; name: string; branchId: string }[];
  currentMonth: string;
}
export type IncidentFilter = {
  companyId: string;
  branchId?: string;
  brandId?: string;
  state?: 'reported' | 'confirmed' | 'dismissed';
  kind?: 'loss' | 'damage';
  shipmentId?: string;
  employeeId?: string;
  dateBasis?: 'observed' | 'confirmed';
  from?: string;
  to?: string;
  page?: string;
};
const text = { type: 'string', maxLength: 2000 };
const reason = { ...text, minLength: 1, pattern: '\\S' };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const version = { type: 'integer', minimum: 1, maximum: 2147483647 };
const instant = { type: 'string', format: 'date-time' };
const selection = obj({
  kind: { enum: ['shipment_line', 'stock_movement', 'transfer_line'] },
  sourceId: uuid,
  lineId: nullable(uuid),
  offset: { type: 'integer', minimum: 0, maximum: 9007198254740991 },
  quantity: { type: 'integer', minimum: 1, maximum: 1000000 },
});
export const incidentReportSchema = obj({
  brandId: uuid,
  kind: { enum: ['loss', 'damage'] },
  observedAt: instant,
  cause: reason,
  comment: text,
  evidence: { type: 'array', maxItems: 10, items: reason },
  items: { type: 'array', minItems: 1, maxItems: 100, items: selection },
});
export const incidentConfirmationSchema = obj({
  expectedVersion: version,
  goodsValueMinor: money,
  compensationMinor: money,
  companyShareMinor: money,
  employeeShareMinor: money,
  responsibleBranchId: uuid,
  branchReason: text,
  employeeId: nullable(uuid),
  payrollMonth: nullable({ type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' }),
  agreementReason: reason,
});
const envelope = { schemaVersion: { const: 1 }, companyId: uuid, commandId: uuid };
export const incidentCommandSchema = {
  oneOf: [
    obj({ ...envelope, type: { const: 'incident.report' }, report: incidentReportSchema }),
    obj({
      ...envelope,
      type: { const: 'incident.confirm' },
      incidentId: uuid,
      confirmation: incidentConfirmationSchema,
    }),
    ...['incident.dismiss', 'incident.review', 'incident.disposition'].map((type) =>
      obj({
        ...envelope,
        type: { const: type },
        incidentId: uuid,
        expectedVersion: version,
        reason,
      }),
    ),
  ],
};
const pair = obj({
  offset: { type: 'integer', minimum: 0 },
  quantity: { type: 'integer', minimum: 1 },
});
export const incidentCandidateSchema = obj({
  kind: selection.properties.kind,
  sourceId: uuid,
  lineId: nullable(uuid),
  key: text,
  brandId: uuid,
  branchId: uuid,
  shipmentId: nullable(uuid),
  label: text,
  capacity: { type: 'integer', minimum: 0, maximum: 9007199254740991 },
  holder: { enum: ['branch', 'driver'] },
  driverId: nullable(uuid),
  variantId: nullable(uuid),
  sourceCondition: { enum: ['sound', 'unavailable'] },
  returnRequestId: nullable(uuid),
  returnItemId: nullable(uuid),
  returnRevision: nullable({ type: 'integer', minimum: 0, maximum: 9007199254740991 }),
  claimed: { type: 'array', items: pair },
});
export const incidentResultSchema = obj({
  incidentId: uuid,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  version,
  commandId: uuid,
});
const effect = obj({
  id: uuid,
  family: text,
  kind: text,
  amountMinor: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
  branchId: uuid,
});
const review = obj({
  id: uuid,
  reason,
  holdMinor: money,
  status: { const: 'awaiting_p21' },
  recordedAt: instant,
});
export const incidentDetailSchema = obj({
  id: uuid,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  version,
  state: { enum: ['reported', 'confirmed', 'dismissed'] },
  brandId: uuid,
  brandName: text,
  custodyBranchId: uuid,
  responsibleBranchId: uuid,
  branchName: text,
  holder: { enum: ['branch', 'driver'] },
  driverId: nullable(uuid),
  report: incidentReportSchema,
  items: {
    type: 'array',
    items: obj({ ...selection.properties, snapshot: incidentCandidateSchema }),
  },
  recordedAt: instant,
  actorName: text,
  dismissalReason: nullable(reason),
  confirmation: nullable(
    obj({
      ...incidentConfirmationSchema.properties,
      id: uuid,
      sourceId: uuid,
      lotId: uuid,
      obligationId: nullable(uuid),
      employeePayrollBranchId: nullable(uuid),
      confirmedAt: instant,
      actorName: text,
      effects: { type: 'array', items: effect },
    }),
  ),
  disposition: obj({
    state: {
      enum: [
        'not_confirmed',
        'native_recorded',
        'awaiting_request',
        'awaiting_dependency',
        'pending',
        'accepted',
        'review',
      ],
    },
    actionIds: { type: 'array', items: uuid },
  }),
  replacements: {
    type: 'array',
    items: obj({
      id: uuid,
      reference: { type: 'string' },
      payer: { enum: ['recipient', 'brand', 'company'] },
    }),
  },
  payouts: {
    type: 'array',
    items: obj({ id: uuid, reference: { type: 'string' }, amountMinor: money }),
  },
  review: nullable(review),
  recovery: obj({
    obligationId: nullable(uuid),
    status: { const: 'awaiting_p20' },
    amountMinor: money,
  }),
});
export const incidentPreviewSchema = obj({
  confirmation: incidentConfirmationSchema,
  blockers: { type: 'array', items: { type: 'string' } },
  allowedPayrollMonth: nullable({ type: 'string' }),
  walletCreditMinor: money,
  employeeObligationMinor: money,
  compensationCostMinor: money,
  employeeCompensationShareMinor: money,
  cashMinor: { const: '0' },
});
const named = obj({ id: uuid, name: text });
export const incidentCatalogSchema = obj({
  branches: { type: 'array', items: named },
  brands: { type: 'array', items: named },
  employees: { type: 'array', items: obj({ id: uuid, name: text, branchId: uuid }) },
  currentMonth: { type: 'string' },
});
export const incidentFilterSchema = obj(
  {
    companyId: uuid,
    branchId: uuid,
    brandId: uuid,
    state: { enum: ['reported', 'confirmed', 'dismissed'] },
    kind: { enum: ['loss', 'damage'] },
    shipmentId: uuid,
    employeeId: uuid,
    dateBasis: { enum: ['observed', 'confirmed'] },
    from: { type: 'string', format: 'date' },
    to: { type: 'string', format: 'date' },
    page: { type: 'string', pattern: '^[1-9][0-9]{0,5}$' },
  },
  ['companyId'],
);
const ajv = new AjvModule.default({ allErrors: true, strict: true });
formatsModule.default(ajv);
export const validateIncidentCommand = ajv.compile<IncidentCommand>(incidentCommandSchema);
export const validateIncidentFilter = ajv.compile<IncidentFilter>(incidentFilterSchema);
export const incidentPreviewInputSchema = obj({
  companyId: uuid,
  confirmation: incidentConfirmationSchema,
});
export const validateIncidentPreviewInput = ajv.compile<{
  companyId: string;
  confirmation: IncidentConfirmation;
}>(incidentPreviewInputSchema);
export const incidentViews = {
  detail: incidentDetailSchema,
  result: incidentResultSchema,
  preview: incidentPreviewSchema,
  catalog: incidentCatalogSchema,
  list: obj({
    items: { type: 'array', items: incidentDetailSchema },
    total: { type: 'integer', minimum: 0 },
  }),
  candidates: obj({ items: { type: 'array', items: incidentCandidateSchema } }),
};
export const validateIncidentViews = Object.fromEntries(
  Object.entries(incidentViews).map(([k, s]) => [k, ajv.compile(s)]),
);
export const incidentPaths = Object.fromEntries(
  [
    ['', 'get', null, incidentViews.list],
    ['', 'post', incidentCommandSchema, incidentResultSchema],
    ['/catalog', 'get', null, incidentCatalogSchema],
    ['/candidates', 'get', null, incidentViews.candidates],
    ['/{id}', 'get', null, incidentDetailSchema],
    ['/commands/{commandId}', 'get', null, incidentResultSchema],
    ['/{id}/confirmation-preview', 'post', incidentPreviewInputSchema, incidentPreviewSchema],
    ...['confirm', 'dismiss', 'review', 'disposition'].map((x) => [
      '/{id}/' + x,
      'post',
      incidentCommandSchema,
      incidentResultSchema,
    ]),
  ].reduce<[string, Record<string, unknown>][]>((rows, [suffix, method, input, output]) => {
    const path = '/api/v1/incidents' + suffix;
    let row = rows.find((r) => r[0] === path);
    if (!row) {
      row = [path, {}];
      rows.push(row);
    }
    row[1][String(method)] = {
      summary: 'Scoped incident journey',
      ...(input
        ? { requestBody: { required: true, content: { 'application/json': { schema: input } } } }
        : {}),
      responses: {
        '200': {
          description: 'Authorized incident result',
          content: { 'application/json': { schema: output } },
        },
        '400': { description: 'Invalid closed input' },
        '403': { description: 'Scope denied' },
        '409': { description: 'State, quantity, shares or protected period conflict' },
      },
    };
    return rows;
  }, []),
);
