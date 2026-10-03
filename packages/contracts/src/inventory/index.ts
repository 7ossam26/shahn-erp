import AjvModule from 'ajv';
import { parcelListSchema } from '../shipments/index.js';
import formatsModule from 'ajv-formats';
export type StockCondition = 'sound' | 'damaged' | 'uncertain';
export interface VariantFields {
  id?: string;
  name: string;
  options: string;
  active: boolean;
}
export interface ProductFields {
  name: string;
  active: boolean;
  variants: VariantFields[];
}
export interface ProductRecord {
  id: string;
  brandId: string;
  name: string;
  active: boolean;
  version: number;
  variants: (VariantFields & { id: string })[];
}
export type InventoryCommand = { companyId: string; commandId: string; schemaVersion: 1 } & (
  | { type: 'product.create'; brandId: string; fields: ProductFields }
  | { type: 'product.update'; productId: string; expectedVersion: number; fields: ProductFields }
  | {
      type: 'stock.receive';
      branchId: string;
      brandId: string;
      actualDate: string;
      lines: { variantId: string; quantity: number; condition: StockCondition }[];
    }
);
export interface InventoryResult {
  commandId: string;
  entityId: string;
  version: number;
  branchId: string | null;
  warnings: string[];
}
export interface StockBalance {
  soundOnHand: number;
  unavailableOnHand: number;
  physicalOnHand: number;
  reserved: number;
  available: number;
  reservationShortage: number;
}
export interface StockRow extends StockBalance {
  branchId: string;
  branchName: string;
  brandId: string;
  brandName: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  options: string;
  active: boolean;
  version: number;
  lastMovementAt: string | null;
}
export interface InventoryFilter {
  branches: string[];
  brands: string[];
  search: string;
  productId: string | null;
  variantId: string | null;
  categories: ('available' | 'reserved' | 'unavailable' | 'shortage')[];
  noAvailable: boolean;
  movementFrom: string | null;
  movementTo: string | null;
  page: number;
  limit: number;
}
export interface StockList {
  items: StockRow[];
  total: number;
  page: number;
  limit: number;
  asOf: string;
}
export interface InventoryCatalog {
  brands: { id: string; name: string; active: boolean }[];
  branches: { id: string; name: string }[];
  products: ProductRecord[];
}
export interface ReceiptDetail {
  id: string;
  reference: string;
  branchId: string;
  branchName: string;
  brandId: string;
  brandName: string;
  actualDate: string;
  recordedAt: string;
  actorName: string;
  lines: {
    id: string;
    variantId: string;
    productName: string;
    variantName: string;
    options: string;
    quantity: number;
    condition: StockCondition;
  }[];
}
export interface Movement {
  id: string;
  receiptId: string;
  reference: string;
  condition: StockCondition;
  quantity: number;
  actualDate: string;
  recordedAt: string;
  productName: string;
  variantName: string;
  options: string;
}
export interface VariantHistory {
  position: StockRow;
  movements: Movement[];
  total: number;
  page: number;
  limit: number;
}
const uuid = { type: 'string', format: 'uuid' },
  text = { type: 'string', minLength: 1, maxLength: 180, pattern: '\\S' },
  bool = { type: 'boolean' },
  version = { type: 'integer', minimum: 1, maximum: 2147483647 },
  date = { type: 'string', format: 'date' },
  instant = { type: 'string', format: 'date-time' };
const closed = (properties: Record<string, unknown>, optional: string[] = []) => ({
  type: 'object',
  properties,
  additionalProperties: false,
  required: Object.keys(properties).filter((k) => !optional.includes(k)),
});
const array = (items: object, minItems = 0, maxItems = 100) => ({
  type: 'array',
  items,
  minItems,
  maxItems,
});
const nullable = (value: object) => ({ anyOf: [value, { type: 'null' }] });
export const quantitySchema = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const positive = { ...quantitySchema, minimum: 1 },
  condition = { type: 'string', enum: ['sound', 'damaged', 'uncertain'] },
  options = { type: 'string', maxLength: 180 };
const variant = closed({ id: uuid, name: text, options, active: bool }, ['id']);
export const productFieldsSchema = closed({
  name: text,
  active: bool,
  variants: array(variant, 1),
});
const product = closed({
  id: uuid,
  brandId: uuid,
  name: text,
  active: bool,
  version,
  variants: array(closed({ id: uuid, name: text, options, active: bool }), 1),
});
const envelope = { companyId: uuid, commandId: uuid, schemaVersion: { const: 1 } };
export const inventoryCommandSchema = {
  oneOf: [
    closed({
      ...envelope,
      type: { const: 'product.create' },
      brandId: uuid,
      fields: productFieldsSchema,
    }),
    closed({
      ...envelope,
      type: { const: 'product.update' },
      productId: uuid,
      expectedVersion: version,
      fields: productFieldsSchema,
    }),
    closed({
      ...envelope,
      type: { const: 'stock.receive' },
      branchId: uuid,
      brandId: uuid,
      actualDate: date,
      lines: array(closed({ variantId: uuid, quantity: positive, condition }), 1),
    }),
  ],
};
export const inventoryFilterSchema = closed({
  branches: { ...array(uuid, 1), uniqueItems: true },
  brands: { ...array(uuid), uniqueItems: true },
  search: { type: 'string', maxLength: 180 },
  productId: nullable(uuid),
  variantId: nullable(uuid),
  categories: {
    ...array({ type: 'string', enum: ['available', 'reserved', 'unavailable', 'shortage'] }, 0, 4),
    uniqueItems: true,
  },
  noAvailable: bool,
  movementFrom: nullable(date),
  movementTo: nullable(date),
  page: { type: 'integer', minimum: 1, maximum: 1000000 },
  limit: { type: 'integer', enum: [25, 50, 100] },
});
const stock = closed({
  branchId: uuid,
  branchName: text,
  brandId: uuid,
  brandName: text,
  productId: uuid,
  productName: text,
  variantId: uuid,
  variantName: text,
  options,
  active: bool,
  version: { ...quantitySchema, maximum: 2147483647 },
  lastMovementAt: nullable(instant),
  soundOnHand: quantitySchema,
  unavailableOnHand: quantitySchema,
  physicalOnHand: quantitySchema,
  reserved: quantitySchema,
  available: quantitySchema,
  reservationShortage: quantitySchema,
});
const pagination = {
  total: quantitySchema,
  page: positive,
  limit: { type: 'integer', enum: [25, 50, 100] },
};
export const inventoryViews = {
  result: closed({
    commandId: uuid,
    entityId: uuid,
    version,
    branchId: nullable(uuid),
    warnings: array({ type: 'string', enum: ['DUPLICATE_DISPLAY'] }),
  }),
  catalog: closed({
    brands: array(closed({ id: uuid, name: text, active: bool }), 0, 100000),
    branches: array(closed({ id: uuid, name: text })),
    products: array(product, 0, 100000),
  }),
  products: closed({ items: array(stock), ...pagination, asOf: instant }),
  parcels: parcelListSchema,
  product: closed({
    product,
    history: array(
      closed({ version, recordedAt: instant, fields: productFieldsSchema }),
      0,
      100000,
    ),
  }),
  receipt: closed({
    id: uuid,
    reference: { type: 'string', pattern: '^[0-9]+$' },
    branchId: uuid,
    branchName: text,
    brandId: uuid,
    brandName: text,
    actualDate: date,
    recordedAt: instant,
    actorName: text,
    lines: array(
      closed({
        id: uuid,
        variantId: uuid,
        productName: text,
        variantName: text,
        options,
        quantity: positive,
        condition,
      }),
      1,
    ),
  }),
  history: closed({
    position: stock,
    movements: array(
      closed({
        id: uuid,
        receiptId: uuid,
        reference: { type: 'string', pattern: '^[0-9]+$' },
        condition,
        quantity: positive,
        actualDate: date,
        recordedAt: instant,
        productName: text,
        variantName: text,
        options,
      }),
    ),
    ...pagination,
  }),
  error: closed(
    {
      code: { type: 'string' },
      messageKey: { type: 'string' },
      commandId: nullable(uuid),
      correlationId: uuid,
      currentVersion: version,
    },
    ['currentVersion'],
  ),
};
const Ajv = AjvModule.default,
  addFormats = formatsModule.default;
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
export const validateInventoryCommand = ajv.compile<InventoryCommand>(inventoryCommandSchema);
export const validateInventoryFilter = ajv.compile<InventoryFilter>(inventoryFilterSchema);
export const validateInventoryViews = Object.fromEntries(
  Object.entries(inventoryViews).map(([key, schema]) => [key, ajv.compile(schema)]),
);
const inventoryRouteEntries = [
  ['post', '/api/v1/brands/{brandId}/products', 'result', 'product.create'],
  ['patch', '/api/v1/products/{productId}', 'result', 'product.update'],
  ['post', '/api/v1/inventory/receipts', 'result', 'stock.receive'],
  ['get', '/api/v1/inventory/catalog', 'catalog'],
  ['get', '/api/v1/inventory/products', 'products'],
  ['get', '/api/v1/inventory/parcels', 'parcels'],
  ['get', '/api/v1/inventory/receipts/{id}', 'receipt'],
  ['get', '/api/v1/products/{productId}', 'product'],
  ['get', '/api/v1/inventory/variants/{id}/history', 'history'],
  ['get', '/api/v1/inventory/commands/{commandId}', 'result'],
].map(([method, path, view, kind]): [string, Record<string, unknown>] => [
  path!,
  {
    [method!]: {
      summary: `P05 ${view}; authenticated module and assigned inventory branches`,
      security: [{ erpSession: [], ...(method !== 'get' ? { csrfToken: [] } : {}) }],
      parameters: [
        ...[...path!.matchAll(/\{(\w+)\}/g)].map((m) => ({
          in: 'path',
          name: m[1],
          required: true,
          schema: uuid,
        })),
        ...(method === 'get'
          ? [
              { in: 'query', name: 'companyId', required: true, schema: uuid },
              ...(view === 'products'
                ? Object.entries(inventoryFilterSchema.properties).map(([name, schema]) => ({
                    in: 'query',
                    name,
                    schema,
                  }))
                : []),
              ...(view === 'history'
                ? [
                    { in: 'query', name: 'branchId', required: true, schema: uuid },
                    { in: 'query', name: 'page', schema: positive },
                    {
                      in: 'query',
                      name: 'limit',
                      schema: { type: 'integer', enum: [25, 50, 100] },
                    },
                  ]
                : []),
              ...(view === 'parcels'
                ? [
                    { in: 'query', name: 'branches', required: true, schema: array(uuid, 1) },
                    {
                      in: 'query',
                      name: 'custody',
                      schema: { type: 'string', enum: ['branch', 'external'] },
                    },
                  ]
                : []),
              ...(view === 'result'
                ? [
                    {
                      in: 'query',
                      name: 'family',
                      required: true,
                      schema: {
                        type: 'string',
                        enum: ['inventory.product', 'inventory.receipt'],
                      },
                    },
                  ]
                : []),
            ]
          : []),
      ],
      ...(method !== 'get'
        ? {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: inventoryCommandSchema.oneOf.find(
                    (s) => (s.properties.type as { const: string }).const === kind,
                  ),
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
                ? 'Persisted authorized result'
                : 'Typed rejection; unknown transport outcome must recover original command',
            content: {
              'application/json': {
                schema:
                  inventoryViews[
                    status === '200' ? (view as keyof typeof inventoryViews) : 'error'
                  ],
              },
            },
          },
        ]),
      ),
    },
  },
]);
export const inventoryPaths: Record<string, Record<string, unknown>> = {};
for (const [path, methods] of inventoryRouteEntries)
  inventoryPaths[path] = { ...inventoryPaths[path], ...methods };
