import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import type { BrandRecord, ReferenceRecord, TariffRecord, PriceSnapshot } from '../brands.js';
import { commercialViews } from '../brands.js';
export interface ShipmentMoney {
  currency: 'EGP';
  amountMinor: string;
}
export interface ShipmentLine {
  id: string;
  variantId?: string;
  description: string;
  quantity: number;
  unitDue: ShipmentMoney;
}
export interface ShipmentFields {
  replacement?: { incidentId: string; payer: 'recipient' | 'brand' | 'company'; reason: string };
  branchId: string;
  brandId: string;
  service: 'brand_packed' | 'company_packed' | 'stored_stock';
  brandReference: string;
  recipientName: string;
  phoneDisplay: string;
  address: string;
  governorateId: string;
  areaId: string | null;
  locationUrl: string;
  lines: ShipmentLine[];
  shippingPayer: 'recipient' | 'brand' | 'shared';
  recipientShippingDue: ShipmentMoney | null;
  inspectionAllowed: boolean;
  comment: string;
}
export interface ShipmentPrice extends PriceSnapshot {
  waiverMinor?: string;
  incidentAgreement?: {
    incidentId: string;
    confirmationId: string;
    originalShipmentId: string | null;
    payer: 'recipient' | 'brand' | 'company';
    reason: string;
  };
  agreedPackingUpliftMinor: string;
  brandShippingMinor: string;
  shippingPayer: 'recipient' | 'brand' | 'shared';
}
export type PreparationState = 'not_required' | 'awaiting_preparation' | 'complete';
type Envelope = { schemaVersion: 1; companyId: string; commandId: string };
export type ShipmentCommand = Envelope &
  (
    | {
        type: 'shipment.confirm';
        fields: ShipmentFields;
        actualReceipt: boolean;
        duplicateAcknowledged: boolean;
        expectedPolicyVersion: number;
        expectedTariffVersion: number;
        expectedTariffId: string;
      }
    | {
        type: 'shipment.correct';
        shipmentId: string;
        expectedVersion: number;
        fields: ShipmentFields;
        reason: string;
        actualAtCorrectedBranch: boolean;
        duplicateAcknowledged: boolean;
      }
    | { type: 'shipment.cancel'; shipmentId: string; expectedVersion: number; reason: string }
    | {
        type: 'shipment.unpack';
        shipmentId: string;
        expectedVersion: number;
        reason: string;
        lines: {
          pendingId: string;
          expectedRemaining: number;
          sound: number;
          damaged: number;
          uncertain: number;
        }[];
      }
    | { type: 'shipment.prepare'; shipmentId: string; expectedVersion: number }
  );
export interface ShipmentResult {
  commandId: string;
  shipmentId: string;
  reference: string;
  version: number;
  branchId: string;
}
export interface ShipmentDetail {
  id: string;
  reference: string;
  version: number;
  revision: number;
  fields: ShipmentFields;
  phoneCanonical: string;
  price: ShipmentPrice;
  state: 'active' | 'cancelled';
  preparation: PreparationState;
  branchName: string;
  receivedAt: string;
  sourceState: 'local' | 'integrated';
  handedOver: boolean;
  timeline: {
    version: number;
    kind:
      | 'received'
      | 'reserved'
      | 'corrected'
      | 'prepared'
      | 'cancelled'
      | 'unpack_inspected'
      | 'transfer_handover'
      | 'transfer_received'
      | 'transfer_source_return';
    at: string;
    actor: string;
    reason: string;
  }[];
  stock: { allocations: StockAllocation[]; unpack: UnpackRemaining[]; eligible: boolean };
  revisions: {
    revision: number;
    fields: ShipmentFields;
    price: ShipmentPrice;
    phoneCanonical: string;
  }[];
}
export interface ShipmentPreview {
  expectedVersion: number;
  before: ShipmentPrice;
  after: ShipmentPrice;
  beforeBranchId: string;
  afterBranchId: string;
  beforePreparation: PreparationState;
  afterPreparation: PreparationState;
  custodyEffect: 'unchanged' | 'recorded_branch_correction';
  duplicateReference: boolean;
  stockDelta: {
    branchId: string;
    variantId: string;
    before: number;
    after: number;
    available: number;
    shortage: number;
  }[];
}
export interface ShipmentCatalog {
  companyId: string;
  brands: BrandRecord[];
  references: ReferenceRecord[];
  tariffs: TariffRecord[];
  branches: { id: string; name: string }[];
}
export interface ParcelItem {
  id: string;
  reference: string;
  brandId: string;
  brandName: string;
  recipientName: string;
  branchId: string;
  branchName: string;
  service: 'brand_packed' | 'company_packed' | 'stored_stock';
  state: 'active' | 'cancelled';
  preparation: PreparationState;
  receivedAt: string;
  ageDays: number;
  blocked: boolean;
  custody: 'branch' | 'transfer';
  transferId: string | null;
}
export interface ParcelList {
  items: ParcelItem[];
  total: number;
  page: number;
  limit: number;
  custody: 'branch' | 'external';
  boundary: 'LOCAL_CUSTODY_ONLY' | 'NATIVE_TRANSFER_ONLY';
}
export interface ShipmentFilter {
  branches: string[];
  brands: string[];
  service: 'all' | 'brand_packed' | 'company_packed' | 'stored_stock';
  preparation: 'all' | 'blocked' | PreparationState;
  state: 'all' | 'active' | 'cancelled';
  search: string;
  from: string | null;
  to: string | null;
  page: number;
  limit: number;
}
const uuid = { type: 'string', format: 'uuid' },
  version = { type: 'integer', minimum: 1, maximum: 2147483647 },
  bool = { type: 'boolean' },
  text = (maxLength: number, required = true) => ({
    type: 'string',
    maxLength,
    ...(required ? { minLength: 1, pattern: '\\S' } : {}),
  }),
  nullable = (s: object) => ({ anyOf: [s, { type: 'null' }] }),
  closed = (properties: Record<string, unknown>) => ({
    type: 'object',
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  }),
  array = (items: object) => ({ type: 'array', items }),
  service = { enum: ['brand_packed', 'company_packed', 'stored_stock'] },
  prep = { enum: ['not_required', 'awaiting_preparation', 'complete'] },
  minor = { type: 'string', pattern: '^(0|[1-9][0-9]{0,18})$' };
export const shipmentMoneySchema = closed({ currency: { const: 'EGP' }, amountMinor: minor });
const quantity = { type: 'integer', minimum: 0, maximum: 9007199254740991 };
export interface StockAllocation {
  reservationId: string;
  branchId: string;
  variantId: string;
  variantName: string;
  quantity: number;
  active: boolean;
  held: boolean;
  shortage: number;
  revision: number;
}
export interface UnpackRemaining {
  pendingId: string;
  branchId: string;
  variantId: string;
  variantName: string;
  remaining: number;
  quantity: number;
  sound: number;
  damaged: number;
  uncertain: number;
}
export const shipmentLineSchema = closed({
  id: uuid,
  description: text(200),
  quantity: { type: 'integer', minimum: 1, maximum: 1000000 },
  unitDue: shipmentMoneySchema,
});
shipmentLineSchema.properties['variantId'] = uuid;
export const shipmentFieldsSchema = closed({
  branchId: uuid,
  brandId: uuid,
  service,
  brandReference: text(256, false),
  recipientName: text(200),
  phoneDisplay: text(100),
  address: text(500),
  governorateId: uuid,
  areaId: nullable(uuid),
  locationUrl: text(2048, false),
  lines: { ...array(shipmentLineSchema), minItems: 1, maxItems: 100 },
  shippingPayer: { enum: ['recipient', 'brand', 'shared'] },
  recipientShippingDue: nullable(shipmentMoneySchema),
  inspectionAllowed: bool,
  comment: text(1000, false),
});
shipmentFieldsSchema.properties['replacement'] = closed({
  incidentId: uuid,
  payer: { enum: ['recipient', 'brand', 'company'] },
  reason: text(2000),
});
const envelope = { schemaVersion: { const: 1 }, companyId: uuid, commandId: uuid },
  edit = { shipmentId: uuid, expectedVersion: version };
export const shipmentCommandSchema = {
  oneOf: [
    closed({
      ...envelope,
      type: { const: 'shipment.confirm' },
      fields: shipmentFieldsSchema,
      actualReceipt: bool,
      duplicateAcknowledged: bool,
      expectedPolicyVersion: version,
      expectedTariffVersion: version,
      expectedTariffId: uuid,
    }),
    closed({
      ...envelope,
      ...edit,
      type: { const: 'shipment.correct' },
      fields: shipmentFieldsSchema,
      reason: text(1000),
      actualAtCorrectedBranch: bool,
      duplicateAcknowledged: bool,
    }),
    closed({ ...envelope, ...edit, type: { const: 'shipment.cancel' }, reason: text(1000) }),
    closed({ ...envelope, ...edit, type: { const: 'shipment.prepare' } }),
    closed({
      ...envelope,
      ...edit,
      type: { const: 'shipment.unpack' },
      reason: text(1000),
      lines: {
        ...array(
          closed({
            pendingId: uuid,
            expectedRemaining: { ...quantity, minimum: 1 },
            sound: quantity,
            damaged: quantity,
            uncertain: quantity,
          }),
        ),
        minItems: 1,
        maxItems: 100,
        uniqueItems: true,
      },
    }),
  ],
};
export const shipmentPreviewRequestSchema = closed({
  companyId: uuid,
  ...edit,
  fields: shipmentFieldsSchema,
  actualAtCorrectedBranch: bool,
});
export const shipmentFilterSchema = closed({
  branches: { ...array(uuid), minItems: 1, maxItems: 100, uniqueItems: true },
  brands: { ...array(uuid), maxItems: 100, uniqueItems: true },
  service: { enum: ['all', 'brand_packed', 'company_packed', 'stored_stock'] },
  preparation: { enum: ['all', 'not_required', 'awaiting_preparation', 'complete', 'blocked'] },
  state: { enum: ['all', 'active', 'cancelled'] },
  search: text(256, false),
  from: nullable({ type: 'string', format: 'date' }),
  to: nullable({ type: 'string', format: 'date' }),
  page: { type: 'integer', minimum: 1, maximum: 1000000 },
  limit: { enum: [25, 50, 100] },
});
export const shipmentPriceSchema = closed({
  schemaVersion: { const: 1 },
  currency: { const: 'EGP' },
  companyId: uuid,
  brandId: uuid,
  brandName: text(180),
  policyVersion: version,
  branchId: uuid,
  service,
  partialDelivery: bool,
  tierId: uuid,
  tierName: text(180),
  governorateId: uuid,
  governorateName: text(180),
  areaId: nullable(uuid),
  areaName: nullable(text(180)),
  tariffId: uuid,
  tariffVersion: version,
  source: { enum: ['area_override', 'governorate'] },
  baseShippingMinor: minor,
  packingUpliftMinor: minor,
  tariffMinor: minor,
  commissionBaseMinor: minor,
  goodsDueMinor: minor,
  recipientShippingMinor: minor,
  recipientDueMinor: minor,
  capturedAt: { type: 'string', format: 'date-time' },
  agreedPackingUpliftMinor: minor,
  brandShippingMinor: minor,
  shippingPayer: { enum: ['recipient', 'brand', 'shared'] },
});
shipmentPriceSchema.properties['incidentAgreement'] = closed({
  incidentId: uuid,
  confirmationId: uuid,
  originalShipmentId: nullable(uuid),
  payer: { enum: ['recipient', 'brand', 'company'] },
  reason: text(2000),
});
shipmentPriceSchema.properties['waiverMinor'] = minor;
const resultSchema = closed({
  commandId: uuid,
  shipmentId: uuid,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  version,
  branchId: uuid,
});
const parcelSchema = closed({
  id: uuid,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  brandId: uuid,
  brandName: text(180),
  recipientName: text(200),
  branchId: uuid,
  branchName: text(180),
  service,
  state: { enum: ['active', 'cancelled'] },
  preparation: prep,
  receivedAt: { type: 'string', format: 'date-time' },
  ageDays: { type: 'integer', minimum: 0 },
  blocked: bool,
  custody: { enum: ['branch', 'transfer'] },
  transferId: nullable(uuid),
});
export const parcelListSchema = closed({
  items: array(parcelSchema),
  total: { type: 'integer', minimum: 0 },
  page: { type: 'integer', minimum: 1 },
  limit: { enum: [25, 50, 100] },
  custody: { enum: ['branch', 'external'] },
  boundary: { enum: ['LOCAL_CUSTODY_ONLY', 'NATIVE_TRANSFER_ONLY'] },
});
const allocationSchema = closed({
  reservationId: uuid,
  branchId: uuid,
  variantId: uuid,
  variantName: text(400),
  quantity,
  active: bool,
  held: bool,
  shortage: quantity,
  revision: version,
});
const unpackSchema = closed({
  pendingId: uuid,
  branchId: uuid,
  variantId: uuid,
  variantName: text(400),
  remaining: quantity,
  quantity,
  sound: quantity,
  damaged: quantity,
  uncertain: quantity,
});
const detailSchema = closed({
  id: uuid,
  reference: text(20),
  version,
  revision: version,
  fields: shipmentFieldsSchema,
  phoneCanonical: { type: 'string', pattern: '^(?:\\+[1-9][0-9]{7,14}|01[0125][0-9]{8})$' },
  price: shipmentPriceSchema,
  state: { enum: ['active', 'cancelled'] },
  preparation: prep,
  branchName: text(180),
  receivedAt: { type: 'string', format: 'date-time' },
  sourceState: { enum: ['local', 'integrated'] },
  handedOver: bool,
  stock: closed({
    allocations: array(allocationSchema),
    unpack: array(unpackSchema),
    eligible: bool,
  }),
  timeline: array(
    closed({
      version,
      kind: {
        enum: [
          'received',
          'reserved',
          'corrected',
          'prepared',
          'cancelled',
          'unpack_inspected',
          'transfer_handover',
          'transfer_received',
          'transfer_source_return',
        ],
      },
      at: { type: 'string', format: 'date-time' },
      actor: text(200),
      reason: text(1000, false),
    }),
  ),
  revisions: array(
    closed({
      revision: version,
      fields: shipmentFieldsSchema,
      price: shipmentPriceSchema,
      phoneCanonical: text(16),
    }),
  ),
});
const previewSchema = closed({
  expectedVersion: version,
  before: shipmentPriceSchema,
  after: shipmentPriceSchema,
  beforeBranchId: uuid,
  afterBranchId: uuid,
  beforePreparation: prep,
  afterPreparation: prep,
  custodyEffect: { enum: ['unchanged', 'recorded_branch_correction'] },
  duplicateReference: bool,
  stockDelta: array(
    closed({
      branchId: uuid,
      variantId: uuid,
      before: quantity,
      after: quantity,
      available: quantity,
      shortage: quantity,
    }),
  ),
});
const failureSchema = closed({
  code: text(100),
  messageKey: text(150),
  commandId: nullable(uuid),
  correlationId: uuid,
  fieldErrors: { type: 'object', additionalProperties: { type: 'string' } },
});
failureSchema.properties['details'] = array(
  closed({
    variantId: uuid,
    variantName: text(400),
    required: quantity,
    available: quantity,
    shortage: quantity,
  }),
);
// currentVersion is optional for stale-state failures.
failureSchema.properties['currentVersion'] = version;
const Ajv = AjvModule.default ?? AjvModule,
  formats = formatsModule.default ?? formatsModule,
  ajv = new Ajv({ allErrors: true, strict: false });
formats(ajv);
export const validateShipmentCommand = ajv.compile<ShipmentCommand>(shipmentCommandSchema);
export const validateShipmentFields = ajv.compile<ShipmentFields>(shipmentFieldsSchema);
export const validateShipmentFilter = ajv.compile<ShipmentFilter>(shipmentFilterSchema);
export const validateShipmentPreviewRequest = ajv.compile<{
  companyId: string;
  shipmentId: string;
  expectedVersion: number;
  fields: ShipmentFields;
  actualAtCorrectedBranch: boolean;
}>(shipmentPreviewRequestSchema);
export const shipmentCatalogSchema = closed({
  companyId: uuid,
  ...commercialViews.catalog.properties,
  brands: commercialViews.list.properties.items,
});
export const validateShipmentViews: Record<string, (v: unknown) => boolean> = {
  catalog: ajv.compile(shipmentCatalogSchema),
  result: ajv.compile(resultSchema),
  detail: ajv.compile(detailSchema),
  preview: ajv.compile(previewSchema),
  list: ajv.compile(parcelListSchema),
  error: ajv.compile(failureSchema),
};
export const shipmentPaths = Object.fromEntries(
  [
    ['post', '/api/v1/shipments', 'result', shipmentCommandSchema],
    ['get', '/api/v1/shipments/catalog', 'catalog', null],
    ['get', '/api/v1/shipments/{reference}', 'detail', null],
    ['post', '/api/v1/shipments/{id}/corrections/preview', 'preview', shipmentPreviewRequestSchema],
    ['post', '/api/v1/shipments/{id}/corrections', 'result', shipmentCommandSchema],
    ['post', '/api/v1/shipments/{id}/cancel', 'result', shipmentCommandSchema],
    ['post', '/api/v1/shipments/{id}/unpack-inspection', 'result', shipmentCommandSchema],
    ['get', '/api/v1/preparation', 'list', null],
    ['post', '/api/v1/shipments/{id}/preparation/complete', 'result', shipmentCommandSchema],
    ['get', '/api/v1/shipments/commands/{commandId}', 'result', null],
  ].map(([method, path, view, request]) => [
    path,
    {
      [method as string]: {
        security: [{ erpSession: [], ...(method === 'post' ? { csrfToken: [] } : {}) }],
        parameters: [
          ...(method === 'get'
            ? [{ in: 'query', name: 'companyId', required: true, schema: uuid }]
            : []),
          ...(String(path).includes('{')
            ? [
                {
                  in: 'path',
                  name: String(path).includes('{reference}')
                    ? 'reference'
                    : String(path).includes('{commandId}')
                      ? 'commandId'
                      : 'id',
                  required: true,
                  schema: String(path).includes('{reference}')
                    ? { type: 'string', pattern: '^[0-9]+$' }
                    : uuid,
                },
              ]
            : []),
          ...(view === 'list'
            ? Object.entries(shipmentFilterSchema.properties).map(([name, schema]) => ({
                in: 'query',
                name,
                required: false,
                schema,
              }))
            : []),
        ],
        ...(request
          ? {
              requestBody: { required: true, content: { 'application/json': { schema: request } } },
            }
          : {}),
        responses: Object.fromEntries(
          ['200', '400', '403', '404', '409'].map((code) => [
            code,
            {
              description: code === '200' ? view : 'Typed field/scope/state error',
              content: {
                'application/json': {
                  schema:
                    code === '200'
                      ? (
                          {
                            result: resultSchema,
                            detail: detailSchema,
                            preview: previewSchema,
                            list: parcelListSchema,
                            catalog: shipmentCatalogSchema,
                          } as Record<string, unknown>
                        )[view as string]
                      : failureSchema,
                },
              },
            },
          ]),
        ),
      },
    },
  ]),
);
