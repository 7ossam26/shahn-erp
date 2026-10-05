import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
export interface TrackingFilter {
  query: string;
  brands: string[];
  branches: string[];
  custodians: string[];
  states: string[];
  services: string[];
  governorates: string[];
  areas: string[];
  dateBasis: 'created' | 'last-event';
  from: string | null;
  to: string | null;
  page: number;
}
export interface TrackingRow {
  id: string;
  reference: string;
  brandId: string;
  brandName: string;
  branchId: string;
  branchName: string;
  recipientName: string;
  phone: string;
  service: string;
  state: string;
  custodian: string;
  driverName: string | null;
  createdAt: string;
  lastEventAt: string | null;
  pending: boolean;
}
export interface TrackingList {
  items: TrackingRow[];
  total: number;
  page: number;
  branches: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  governorates: { id: string; name: string }[];
  areas: { id: string; name: string }[];
}
export interface TrackingDetail {
  shipment: TrackingRow;
  address: string;
  nextAction: string;
  detailPath: string | null;
  returns: {
    requestId: string;
    path: string | null;
    requested: number;
    received: number;
    unresolved: number;
    lost: number;
    damaged: number;
  }[];
  timeline: {
    id: string;
    origin: 'ERP' | 'Tawsel';
    kind: string;
    recordedAt: string | null;
    observedAt: string | null;
    receivedAt: string | null;
    observationUnknown: boolean;
  }[];
  attempts: {
    attemptId: string;
    outcome: string | null;
    visitKnown: boolean;
    reason: 'legacy reason unavailable';
  }[];
  pendingReasons: string[];
  evidenceReceivedOnly: true;
  cashReceiptKnown: false;
}
const uuid = { type: 'string', format: 'uuid' },
  text = { type: 'string' },
  nullable = { anyOf: [text, { type: 'null' }] },
  ids = { type: 'array', items: uuid, uniqueItems: true, maxItems: 100 };
const closed = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
export const trackingFilterSchema = closed({
  query: { type: 'string', maxLength: 256 },
  brands: ids,
  branches: ids,
  custodians: {
    type: 'array',
    items: { enum: ['branch', 'driver', 'recipient', 'unknown'] },
    uniqueItems: true,
  },
  states: { type: 'array', items: text, maxItems: 30 },
  services: {
    type: 'array',
    items: { enum: ['brand_packed', 'company_packed', 'stored_stock'] },
    uniqueItems: true,
  },
  governorates: ids,
  areas: ids,
  dateBasis: { enum: ['created', 'last-event'] },
  from: { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] },
  to: { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] },
  page: { type: 'integer', minimum: 1, maximum: 100000 },
});
const row = closed({
  id: uuid,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  brandId: uuid,
  brandName: text,
  branchId: uuid,
  branchName: text,
  recipientName: text,
  phone: text,
  service: text,
  state: text,
  custodian: text,
  driverName: nullable,
  createdAt: text,
  lastEventAt: nullable,
  pending: { type: 'boolean' },
});
const catalog = { type: 'array', items: closed({ id: uuid, name: text }) };
export const trackingListSchema = closed({
  items: { type: 'array', items: row },
  total: { type: 'integer', minimum: 0 },
  page: { type: 'integer', minimum: 1 },
  branches: catalog,
  brands: catalog,
  governorates: catalog,
  areas: catalog,
});
export const trackingDetailSchema = closed({
  shipment: row,
  address: text,
  nextAction: text,
  detailPath: nullable,
  returns: {
    type: 'array',
    items: closed({
      requestId: uuid,
      path: nullable,
      requested: { type: 'integer', minimum: 1 },
      received: { type: 'integer', minimum: 0 },
      unresolved: { type: 'integer', minimum: 0 },
      lost: { type: 'integer', minimum: 0 },
      damaged: { type: 'integer', minimum: 0 },
    }),
  },
  timeline: {
    type: 'array',
    items: closed({
      id: text,
      origin: { enum: ['ERP', 'Tawsel'] },
      kind: text,
      recordedAt: nullable,
      observedAt: nullable,
      receivedAt: nullable,
      observationUnknown: { type: 'boolean' },
    }),
  },
  attempts: {
    type: 'array',
    items: closed({
      attemptId: uuid,
      outcome: nullable,
      visitKnown: { type: 'boolean' },
      reason: { const: 'legacy reason unavailable' },
    }),
  },
  pendingReasons: { type: 'array', items: text },
  evidenceReceivedOnly: { const: true },
  cashReceiptKnown: { const: false },
});
const Ajv = AjvModule.default ?? AjvModule,
  formats = formatsModule.default ?? formatsModule,
  ajv = new Ajv({ allErrors: false });
formats(ajv);
export const validateTrackingFilter = ajv.compile<TrackingFilter>(trackingFilterSchema),
  validateTrackingList = ajv.compile<TrackingList>(trackingListSchema),
  validateTrackingDetail = ajv.compile<TrackingDetail>(trackingDetailSchema);
export const executionRecordSchemas = {
  earnings: closed({
    page: { type: 'integer', minimum: 1 },
    items: {
      type: 'array',
      items: closed({
        id: uuid,
        reference: text,
        workAt: text,
        branchId: uuid,
        amountMinor: nullable,
        status: text,
        reason: nullable,
        employeeName: nullable,
      }),
    },
  }),
  reviews: closed({
    page: { type: 'integer', minimum: 1 },
    items: {
      type: 'array',
      items: closed({
        id: uuid,
        shipmentId: uuid,
        reference: text,
        state: { enum: ['open', 'resolved'] },
        createdAt: text,
        reason: { const: 'legacy reason unavailable' },
      }),
    },
  }),
};
export const validateExecutionRecords = {
  earnings: ajv.compile(executionRecordSchemas.earnings),
  reviews: ajv.compile(executionRecordSchemas.reviews),
};
export const trackingPaths = {
  '/api/v1/execution/earnings': {
    get: {
      summary: 'Branch-scoped employee visit earning basis; employees grant',
      responses: {
        '200': {
          description: 'Earning basis',
          content: { 'application/json': { schema: executionRecordSchemas.earnings } },
        },
        '403': { description: 'Permission denied' },
      },
    },
  },
  '/api/v1/execution/reviews': {
    get: {
      summary: 'Scoped correction reviews; integration grant',
      responses: {
        '200': {
          description: 'Operational review queue',
          content: { 'application/json': { schema: executionRecordSchemas.reviews } },
        },
        '403': { description: 'Permission denied' },
      },
    },
  },
  '/api/v1/tracking': {
    get: {
      summary: 'Company-wide operational search; tracking grant required',
      responses: {
        '200': {
          description: 'Operational results',
          content: { 'application/json': { schema: trackingListSchema } },
        },
        '400': { description: 'Invalid filters' },
        '403': { description: 'Tracking grant required' },
      },
    },
  },
  '/api/v1/tracking/{id}': {
    get: {
      summary: 'Operational timeline without wallet, HR or mutation authority',
      parameters: [{ in: 'path', name: 'id', required: true, schema: uuid }],
      responses: {
        '200': {
          description: 'Operational detail',
          content: { 'application/json': { schema: trackingDetailSchema } },
        },
        '403': { description: 'Tracking grant required' },
        '404': { description: 'Unknown or foreign-company shipment' },
      },
    },
  },
};
