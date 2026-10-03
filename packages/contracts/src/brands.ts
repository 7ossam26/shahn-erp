import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
export const serviceKeys = ['brand_packed', 'company_packed', 'stored_stock'] as const;
export type ServiceKey = (typeof serviceKeys)[number];
export type ReferenceKind = 'governorate' | 'area' | 'tier';
export interface ReferenceFields {
  kind: ReferenceKind;
  name: string;
  active: boolean;
  parentId: string | null;
  volumeRange: string | null;
}
export interface ReferenceRecord extends ReferenceFields {
  id: string;
  version: number;
}
export interface StorageAgreement {
  monthlyFeeMinor: string;
  startDate: string;
  anniversaryDay: number;
  branchId: string;
  active: boolean;
  stopDate: string | null;
}
export interface BrandFields {
  name: string;
  active: boolean;
  contact: string | null;
  externalReference: string | null;
  services: ServiceKey[];
  defaultService: ServiceKey;
  tierId: string;
  packingUpliftMinor: string;
  partialDelivery: boolean;
  payoutWeekdays: number[];
  allowNegativeBalance: boolean;
  storage: StorageAgreement | null;
}
export interface BrandRecord extends BrandFields {
  id: string;
  version: number;
}
export interface TariffFields {
  tierId: string;
  governorateId: string;
  areaId: string | null;
  amountMinor: string;
  active: boolean;
}
export interface TariffRecord extends TariffFields {
  id: string;
  version: number;
}
export interface PricingInput {
  brandId: string;
  branchId: string;
  service: ServiceKey;
  governorateId: string;
  areaId: string | null;
  goodsDueMinor: string;
  recipientShippingMinor: string;
}
export interface PriceSnapshot {
  schemaVersion: 1;
  currency: 'EGP';
  companyId: string;
  brandId: string;
  brandName: string;
  policyVersion: number;
  branchId: string;
  service: ServiceKey;
  partialDelivery: boolean;
  tierId: string;
  tierName: string;
  governorateId: string;
  governorateName: string;
  areaId: string | null;
  areaName: string | null;
  tariffId: string;
  tariffVersion: number;
  source: 'area_override' | 'governorate';
  baseShippingMinor: string;
  packingUpliftMinor: string;
  tariffMinor: string;
  commissionBaseMinor: string;
  goodsDueMinor: string;
  recipientShippingMinor: string;
  recipientDueMinor: string;
  capturedAt: string;
}
type Common = { schemaVersion: 1; companyId: string; commandId: string };
type Edit = { entityId: string; expectedVersion: number };
export type CommercialCommand = Common &
  (
    | { type: 'brand.create'; fields: BrandFields }
    | ({ type: 'brand.update'; fields: BrandFields } & Edit)
    | { type: 'reference.create'; fields: ReferenceFields }
    | ({ type: 'reference.update'; fields: ReferenceFields } & Edit)
    | { type: 'tariff.create'; fields: TariffFields }
    | ({ type: 'tariff.update'; fields: TariffFields } & Edit)
    | { type: 'pricing.snapshot'; input: PricingInput }
  );
export interface CommercialResult {
  commandId: string;
  entityId: string;
  version: number;
  snapshot: PriceSnapshot | null;
}
export interface CommercialFailure {
  code: string;
  messageKey: string;
  commandId: string | null;
  correlationId: string;
  currentVersion?: number;
}
export interface ReferenceCatalog {
  references: ReferenceRecord[];
  tariffs: TariffRecord[];
  branches: { id: string; name: string }[];
}
export interface BrandDetail {
  brand: BrandRecord;
  history: BrandRecord[];
}
export interface BrandList {
  items: BrandRecord[];
  total: number;
  page: number;
  limit: number;
}
export interface BrandFilter {
  search: string;
  active: 'all' | 'true' | 'false';
  service: ServiceKey | 'all';
  tierId: string | null;
  partial: 'all' | 'true' | 'false';
  page: number;
  limit: number;
}
const uuid = { type: 'string', format: 'uuid' },
  text = { type: 'string', minLength: 1, maxLength: 180, pattern: '\\S' },
  bool = { type: 'boolean' },
  version = { type: 'integer', minimum: 1, maximum: 2147483647 },
  minor = { type: 'string', pattern: '^(0|[1-9][0-9]{0,18})$' },
  service = { type: 'string', enum: serviceKeys };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const array = (items: object) => ({ type: 'array', items });
const closed = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});
const referenceProperties = {
  kind: { type: 'string', enum: ['governorate', 'area', 'tier'] },
  name: text,
  active: bool,
  parentId: nullable(uuid),
  volumeRange: nullable({ type: 'string', maxLength: 180 }),
};
export const referenceFieldsSchema = closed(referenceProperties);
export const storageSchema = closed({
  monthlyFeeMinor: minor,
  startDate: { type: 'string', format: 'date' },
  anniversaryDay: { type: 'integer', minimum: 1, maximum: 31 },
  branchId: uuid,
  active: bool,
  stopDate: nullable({ type: 'string', format: 'date' }),
});
const brandProperties = {
  name: text,
  active: bool,
  contact: nullable({ type: 'string', maxLength: 180 }),
  externalReference: nullable({ type: 'string', maxLength: 180 }),
  services: { type: 'array', items: service, minItems: 1, maxItems: 3, uniqueItems: true },
  defaultService: service,
  tierId: uuid,
  packingUpliftMinor: minor,
  partialDelivery: bool,
  payoutWeekdays: {
    type: 'array',
    items: { type: 'integer', minimum: 0, maximum: 6 },
    minItems: 1,
    maxItems: 7,
    uniqueItems: true,
  },
  allowNegativeBalance: bool,
  storage: nullable(storageSchema),
};
export const brandFieldsSchema = closed(brandProperties);
const tariffProperties = {
  tierId: uuid,
  governorateId: uuid,
  areaId: nullable(uuid),
  amountMinor: minor,
  active: bool,
};
const tariffSchema = closed(tariffProperties);
export const pricingInputSchema = closed({
  brandId: uuid,
  branchId: uuid,
  service,
  governorateId: uuid,
  areaId: nullable(uuid),
  goodsDueMinor: minor,
  recipientShippingMinor: minor,
});
export const priceSnapshotSchema = closed({
  schemaVersion: { const: 1, type: 'integer' },
  currency: { const: 'EGP', type: 'string' },
  companyId: uuid,
  brandId: uuid,
  brandName: text,
  policyVersion: version,
  branchId: uuid,
  service,
  partialDelivery: bool,
  tierId: uuid,
  tierName: text,
  governorateId: uuid,
  governorateName: text,
  areaId: nullable(uuid),
  areaName: nullable(text),
  tariffId: uuid,
  tariffVersion: version,
  source: { type: 'string', enum: ['area_override', 'governorate'] },
  baseShippingMinor: minor,
  packingUpliftMinor: minor,
  tariffMinor: minor,
  commissionBaseMinor: minor,
  goodsDueMinor: minor,
  recipientShippingMinor: minor,
  recipientDueMinor: minor,
  capturedAt: { type: 'string', format: 'date-time' },
});
const common = { schemaVersion: { const: 1, type: 'integer' }, companyId: uuid, commandId: uuid },
  edit = { entityId: uuid, expectedVersion: version };
export const commercialCommandSchema = {
  oneOf: Object.entries({
    'brand.create': { fields: brandFieldsSchema },
    'brand.update': { ...edit, fields: brandFieldsSchema },
    'reference.create': { fields: referenceFieldsSchema },
    'reference.update': { ...edit, fields: referenceFieldsSchema },
    'tariff.create': { fields: tariffSchema },
    'tariff.update': { ...edit, fields: tariffSchema },
    'pricing.snapshot': { input: pricingInputSchema },
  }).map(([type, fields]) =>
    closed({ ...common, type: { const: type, type: 'string' }, ...fields }),
  ),
};
export const commercialResultSchema = closed({
  commandId: uuid,
  entityId: uuid,
  version,
  snapshot: nullable(priceSnapshotSchema),
});
export const commercialFailureSchema = {
  ...closed({
    code: { type: 'string' },
    messageKey: { type: 'string' },
    commandId: nullable(uuid),
    correlationId: uuid,
  }),
  properties: {
    code: { type: 'string' },
    messageKey: { type: 'string' },
    commandId: nullable(uuid),
    correlationId: uuid,
    currentVersion: version,
  },
};
const brandRecordSchema = closed({ id: uuid, version, ...brandProperties });
export const commercialViews = {
  catalog: closed({
    references: array(closed({ id: uuid, version, ...referenceProperties })),
    tariffs: array(closed({ id: uuid, version, ...tariffProperties })),
    branches: array(closed({ id: uuid, name: text })),
  }),
  detail: closed({ brand: brandRecordSchema, history: array(brandRecordSchema) }),
  list: closed({
    items: array(brandRecordSchema),
    total: { type: 'integer', minimum: 0 },
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  }),
  preview: priceSnapshotSchema,
  result: commercialResultSchema,
  error: commercialFailureSchema,
};
export const brandFilterSchema = closed({
  search: { type: 'string', maxLength: 180 },
  active: { type: 'string', enum: ['all', 'true', 'false'] },
  service: { type: 'string', enum: ['all', ...serviceKeys] },
  tierId: nullable(uuid),
  partial: { type: 'string', enum: ['all', 'true', 'false'] },
  page: { type: 'integer', minimum: 1, maximum: 1000000 },
  limit: { type: 'integer', minimum: 1, maximum: 100 },
});
const ajv = new AjvModule.default({ allErrors: true, strict: true });
formatsModule.default(ajv);
export const validateCommercialCommand = ajv.compile<CommercialCommand>(commercialCommandSchema);
export const validatePricingInput = ajv.compile<PricingInput>(pricingInputSchema);
export const validateBrandFilter = ajv.compile<BrandFilter>(brandFilterSchema);
export const validateCommercialViews = Object.fromEntries(
  Object.entries(commercialViews).map(([key, schema]) => [key, ajv.compile(schema)]),
);
export const commercialPaths = Object.fromEntries(
  [
    ['/api/v1/brands', 'get', 'list'],
    ['/api/v1/brands/{id}', 'get', 'detail'],
    ['/api/v1/reference-data', 'get', 'catalog'],
    ['/api/v1/brands/catalog', 'get', 'catalog'],
    ['/api/v1/brands/pricing-preview', 'post', 'preview'],
    ['/api/v1/brands/commands', 'post', 'result'],
    ['/api/v1/brands/commands/{commandId}', 'get', 'result'],
  ].map(([path, method, view]) => [
    path,
    {
      [method!]: {
        security: [{ erpSession: [], ...(method === 'post' ? { csrfToken: [] } : {}) }],
        parameters:
          method === 'get'
            ? [
                { in: 'query', name: 'companyId', required: true, schema: uuid },
                ...(path!.includes('{')
                  ? [
                      {
                        in: 'path',
                        name: path!.includes('{id}') ? 'id' : 'commandId',
                        required: true,
                        schema: uuid,
                      },
                    ]
                  : []),
                ...(view === 'list'
                  ? Object.entries(brandFilterSchema.properties).map(([name, schema]) => ({
                      in: 'query',
                      name,
                      schema,
                    }))
                  : []),
                ...(view === 'result'
                  ? [
                      {
                        in: 'query',
                        name: 'family',
                        required: true,
                        schema: {
                          type: 'string',
                          enum: [
                            'commercial.brand',
                            'commercial.reference',
                            'commercial.tariff',
                            'commercial.snapshot',
                          ],
                        },
                      },
                    ]
                  : []),
              ]
            : [],
        ...(method === 'post'
          ? {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema:
                      view === 'preview'
                        ? closed({ companyId: uuid, input: pricingInputSchema })
                        : commercialCommandSchema,
                  },
                },
              },
            }
          : {}),
        responses: Object.fromEntries(
          ['200', '400', '401', '403', '404', '409', '500'].map((status) => [
            status,
            {
              description:
                status === '200'
                  ? 'Authorized persisted commercial configuration or explanatory preview'
                  : 'Typed rejection; stale edits include currentVersion',
              content: {
                'application/json': {
                  schema:
                    commercialViews[
                      status === '200' ? (view as keyof typeof commercialViews) : 'error'
                    ],
                },
              },
            },
          ]),
        ),
      },
    },
  ]),
);
