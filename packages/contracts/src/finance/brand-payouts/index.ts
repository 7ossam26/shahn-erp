import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import { financeViewSchemas, paymentMethods, type Account, type PaymentMethod } from '../index.js';
import {
  brandWalletAmountsSchema,
  brandWalletErrorSchema,
  brandWalletSummarySchema,
  closedObject,
  dateSchema,
  nonnegativeMinorSchema,
  positiveMinorSchema,
  signedMinorSchema,
  uuidSchema,
  type BrandWalletSummary,
  type WalletLink,
} from '../brand-wallet/index.js';
/**
 * Company-to-brand payout ("tahseel", ERP-D-038). Partial amounts are allowed; the server owns
 * eligibility, the off-day decision and allocation. There is no client eligibility/hold field.
 */
export interface BrandPayoutScope {
  companyId: string;
  brandId: string;
  payingBranchId: string;
  accountId: string;
  method: PaymentMethod;
  amountMinor: string;
  actualDate: string;
}
export interface BrandPayoutCommand extends BrandPayoutScope {
  schemaVersion: 1;
  type: 'brand.payout.confirm';
  commandId: string;
  /** Optional transfer reference; never a proof of provider settlement. */
  externalReference?: string;
  /** Required exactly when the actual date is not one of the brand's agreed weekdays. */
  offDayReason?: string;
  /** Digest returned by the reviewed preview; a changed wallet fails without effects. */
  expectedReadinessRevision: string;
}
export const payoutBlockers = [
  'INSUFFICIENT_ELIGIBLE_CREDIT',
  'INSUFFICIENT_FUNDS',
  'ACCOUNT_INACTIVE',
  'ACCOUNT_USAGE_FORBIDDEN',
  'METHOD_ACCOUNT_MISMATCH',
  'FUTURE_PAYMENT_DATE',
  'ACCOUNT_RECONCILIATION_REQUIRED',
] as const;
export interface BrandPayoutPreview {
  brandId: string;
  amountMinor: string;
  wallet: BrandWalletSummary;
  account: {
    id: string;
    name: string;
    type: 'cash' | 'bank';
    active: boolean;
    availableMinor: string;
  };
  weekday: number;
  offDay: boolean;
  blockers: (typeof payoutBlockers)[number][];
  eligibleToPayAfterMinor: string | null;
  readinessRevision: string;
}
export interface BrandPayoutResult {
  commandId: string;
  payoutId: string;
  reference: string;
  brandId: string;
  amountMinor: string;
  actualDate: string;
  movementId: string;
  eligibleToPayAfterMinor: string;
  signedEntitlementAfterMinor: string;
}
export interface BrandPayoutAllocation {
  lotId: string;
  amountMinor: string;
  lotKind: 'goods' | 'compensation' | 'opening' | 'correction';
  sourceBranchId: string;
  sourceBranchName: string;
  effectiveDate: string;
  shipment: WalletLink | null;
}
export interface BrandPayoutDetail extends BrandPayoutResult {
  brandName: string;
  payingBranchId: string;
  payingBranchName: string;
  accountId: string;
  accountName: string;
  method: PaymentMethod;
  recordedAt: string;
  externalReference: string;
  weekday: number;
  scheduledWeekdays: number[];
  offDay: boolean;
  offDayReason: string | null;
  actorName: string;
  eligibleToPayBeforeMinor: string;
  allocations: BrandPayoutAllocation[];
  reviews: {
    id: string;
    state: 'open' | 'resolved';
    visitId: string;
    lotId: string;
    createdAt: string;
  }[];
}
export interface BrandPayoutListItem {
  payoutId: string;
  reference: string;
  brandId: string;
  brandName: string;
  amountMinor: string;
  payingBranchId: string;
  payingBranchName: string;
  accountName: string;
  method: PaymentMethod;
  actualDate: string;
  recordedAt: string;
  externalReference: string;
  offDay: boolean;
  actorName: string;
}
export interface BrandPayoutList {
  items: BrandPayoutListItem[];
  total: number;
  page: number;
  limit: number;
}
export interface BrandPayoutCatalog {
  branches: { id: string; name: string }[];
  accounts: Account[];
  brands: { id: string; name: string; active: boolean; payoutWeekdays: number[] }[];
}
const method = { type: 'string', enum: paymentMethods },
  revision = { type: 'string', pattern: '^[a-f0-9]{64}$' },
  reference = { type: 'string', pattern: '^[0-9]{1,30}$' },
  instant = { type: 'string', format: 'date-time' },
  name = { type: 'string', minLength: 1, maxLength: 180 },
  weekday = { type: 'integer', minimum: 0, maximum: 6 },
  weekdays = { type: 'array', items: weekday, minItems: 1, maxItems: 7, uniqueItems: true },
  // Printable text only: no control characters; whitespace-only reasons are rejected.
  externalReference = {
    type: 'string',
    minLength: 1,
    maxLength: 120,
    pattern: '^[^\\u0000-\\u001f\\u007f]*[^\\s\\u0000-\\u001f\\u007f][^\\u0000-\\u001f\\u007f]*$',
  },
  // Line breaks/tabs are allowed inside a reason; other control characters are not.
  offDayReason = {
    type: 'string',
    minLength: 1,
    maxLength: 500,
    pattern:
      '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]*[^\\s\\u0000-\\u001f\\u007f][^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]*$',
  };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const scope = {
  companyId: uuidSchema,
  brandId: uuidSchema,
  payingBranchId: uuidSchema,
  accountId: uuidSchema,
  method,
  amountMinor: positiveMinorSchema,
  actualDate: dateSchema,
};
export const brandPayoutPreviewInputSchema = closedObject(scope);
export const brandPayoutCommandSchema = closedObject(
  {
    schemaVersion: { type: 'integer', const: 1 },
    type: { type: 'string', const: 'brand.payout.confirm' },
    commandId: uuidSchema,
    ...scope,
    externalReference,
    offDayReason,
    expectedReadinessRevision: revision,
  },
  ['schemaVersion', 'type', 'commandId', ...Object.keys(scope), 'expectedReadinessRevision'],
);
export const brandPayoutPreviewSchema = closedObject({
  brandId: uuidSchema,
  amountMinor: positiveMinorSchema,
  wallet: brandWalletSummarySchema,
  account: closedObject({
    id: uuidSchema,
    name,
    type: { type: 'string', enum: ['cash', 'bank'] },
    active: { type: 'boolean' },
    availableMinor: nonnegativeMinorSchema,
  }),
  weekday,
  offDay: { type: 'boolean' },
  blockers: { type: 'array', items: { type: 'string', enum: payoutBlockers }, uniqueItems: true },
  eligibleToPayAfterMinor: nullable(nonnegativeMinorSchema),
  readinessRevision: revision,
});
export const brandPayoutResultSchema = closedObject({
  commandId: uuidSchema,
  payoutId: uuidSchema,
  reference,
  brandId: uuidSchema,
  amountMinor: positiveMinorSchema,
  actualDate: dateSchema,
  movementId: uuidSchema,
  eligibleToPayAfterMinor: nonnegativeMinorSchema,
  signedEntitlementAfterMinor: signedMinorSchema,
});
const linkSchema = nullable(closedObject({ id: uuidSchema, reference }));
export const brandPayoutDetailSchema = closedObject({
  ...brandPayoutResultSchema.properties,
  brandName: name,
  payingBranchId: uuidSchema,
  payingBranchName: name,
  accountId: uuidSchema,
  accountName: name,
  method,
  recordedAt: instant,
  externalReference: { type: 'string', maxLength: 120 },
  weekday,
  scheduledWeekdays: weekdays,
  offDay: { type: 'boolean' },
  offDayReason: nullable({ type: 'string', maxLength: 500 }),
  actorName: { type: 'string', maxLength: 180 },
  eligibleToPayBeforeMinor: nonnegativeMinorSchema,
  allocations: {
    type: 'array',
    items: closedObject({
      lotId: uuidSchema,
      amountMinor: positiveMinorSchema,
      lotKind: { type: 'string', enum: ['goods', 'compensation', 'opening', 'correction'] },
      sourceBranchId: uuidSchema,
      sourceBranchName: name,
      effectiveDate: dateSchema,
      shipment: linkSchema,
    }),
  },
  reviews: {
    type: 'array',
    items: closedObject({
      id: uuidSchema,
      state: { type: 'string', enum: ['open', 'resolved'] },
      visitId: uuidSchema,
      lotId: uuidSchema,
      createdAt: instant,
    }),
  },
});
const listItemSchema = closedObject({
  payoutId: uuidSchema,
  reference,
  brandId: uuidSchema,
  brandName: name,
  amountMinor: positiveMinorSchema,
  payingBranchId: uuidSchema,
  payingBranchName: name,
  accountName: name,
  method,
  actualDate: dateSchema,
  recordedAt: instant,
  externalReference: { type: 'string', maxLength: 120 },
  offDay: { type: 'boolean' },
  actorName: { type: 'string', maxLength: 180 },
});
export const brandPayoutListSchema = closedObject({
  items: { type: 'array', items: listItemSchema },
  total: { type: 'integer', minimum: 0, maximum: 2147483647 },
  page: { type: 'integer', minimum: 1, maximum: 999999 },
  limit: { type: 'integer', minimum: 1, maximum: 100 },
});
export const brandPayoutCatalogSchema = closedObject({
  branches: { type: 'array', items: closedObject({ id: uuidSchema, name }) },
  accounts: { type: 'array', items: financeViewSchemas.account },
  brands: {
    type: 'array',
    items: closedObject({
      id: uuidSchema,
      name,
      active: { type: 'boolean' },
      payoutWeekdays: weekdays,
    }),
  },
});
export const brandPayoutFilterSchema = closedObject(
  {
    companyId: uuidSchema,
    brandId: uuidSchema,
    payingBranchId: uuidSchema,
    sourceBranchId: uuidSchema,
    method: { type: 'string', enum: ['all', ...paymentMethods] },
    dateBasis: { type: 'string', enum: ['actual', 'recorded'] },
    from: dateSchema,
    to: dateSchema,
    search: { type: 'string', maxLength: 120 },
    offDay: { type: 'string', enum: ['all', 'true', 'false'] },
    page: { type: 'string', pattern: '^[1-9][0-9]{0,5}$' },
  },
  ['companyId'],
);
export const brandPayoutErrorSchema = brandWalletErrorSchema;
const ajv = new AjvModule.default({ strict: true, allErrors: true });
formatsModule.default(ajv);
export const validateBrandPayoutPreviewInput = ajv.compile<BrandPayoutScope>(
  brandPayoutPreviewInputSchema,
);
export const validateBrandPayoutCommand = ajv.compile<BrandPayoutCommand>(brandPayoutCommandSchema);
export const validateBrandPayoutFilter = ajv.compile(brandPayoutFilterSchema);
export const validateBrandPayoutViews = {
  preview: ajv.compile<BrandPayoutPreview>(brandPayoutPreviewSchema),
  result: ajv.compile<BrandPayoutResult>(brandPayoutResultSchema),
  detail: ajv.compile<BrandPayoutDetail>(brandPayoutDetailSchema),
  list: ajv.compile<BrandPayoutList>(brandPayoutListSchema),
  catalog: ajv.compile<BrandPayoutCatalog>(brandPayoutCatalogSchema),
  error: ajv.compile(brandPayoutErrorSchema),
};
export const brandPayoutExamples = {
  command: {
    schemaVersion: 1,
    type: 'brand.payout.confirm',
    commandId: '7d6d3f0e-6c55-4f5f-9c55-0a3b7c0e2a11',
    companyId: '0b7c8f86-0d5c-4ad0-9f77-3a2f3a9c1e01',
    brandId: '4e0f6b1a-1f7e-4c55-8d5d-1b7a2c9e3f02',
    payingBranchId: '8a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c04',
    accountId: '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e06',
    method: 'cash',
    amountMinor: '10000',
    actualDate: '2026-10-04',
    expectedReadinessRevision: 'a'.repeat(64),
  } satisfies BrandPayoutCommand,
  offDayCommand: {
    schemaVersion: 1,
    type: 'brand.payout.confirm',
    commandId: '9e8d7c6b-5a49-4382-9170-6f5e4d3c2b10',
    companyId: '0b7c8f86-0d5c-4ad0-9f77-3a2f3a9c1e01',
    brandId: '4e0f6b1a-1f7e-4c55-8d5d-1b7a2c9e3f02',
    payingBranchId: '8a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c04',
    accountId: '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e06',
    method: 'instapay',
    amountMinor: '5000',
    actualDate: '2026-10-05',
    externalReference: 'IP-778812',
    offDayReason: 'طلب البراند صرفًا عاجلًا بموافقة الإدارة',
    expectedReadinessRevision: 'b'.repeat(64),
  } satisfies BrandPayoutCommand,
};
const pathId = (parameter: string) => ({
  name: parameter,
  in: 'path',
  required: true,
  schema: uuidSchema,
});
const companyQuery = { name: 'companyId', in: 'query', required: true, schema: uuidSchema };
const errorResponses = (extra: Record<string, string> = {}) => ({
  '400': {
    description: 'Invalid closed input or future actual date; no effects',
    content: { 'application/json': { schema: brandPayoutErrorSchema } },
  },
  '401': { description: 'Authentication required' },
  '403': {
    description: 'Grant, paying branch or CSRF denied',
    content: { 'application/json': { schema: brandPayoutErrorSchema } },
  },
  '404': {
    description: 'Not found within current authorization',
    content: { 'application/json': { schema: brandPayoutErrorSchema } },
  },
  ...Object.fromEntries(
    Object.entries(extra).map(([status, description]) => [
      status,
      { description, content: { 'application/json': { schema: brandPayoutErrorSchema } } },
    ]),
  ),
});
const json = (schema: object) => ({ 'application/json': { schema } });
export const brandPayoutPaths = {
  '/api/v1/finance/brand-payouts': {
    get: {
      summary: 'Actual brand payout history (REP-10) with source/paying-branch filters',
      security: [{ erpSession: [] }],
      parameters: Object.entries(brandPayoutFilterSchema.properties).map(([key, value]) => ({
        name: key,
        in: 'query',
        required: key === 'companyId',
        schema: value,
      })),
      responses: {
        '200': { description: 'Paginated immutable history', content: json(brandPayoutListSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/finance/brand-payouts/catalog': {
    get: {
      summary: 'Assigned paying branches, permitted funding accounts and company brands',
      security: [{ erpSession: [] }],
      parameters: [companyQuery],
      responses: {
        '200': { description: 'Catalog', content: json(brandPayoutCatalogSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/finance/brand-payouts/{payoutId}': {
    get: {
      summary: 'Committed payout with source allocations and later linked reviews',
      security: [{ erpSession: [] }],
      parameters: [pathId('payoutId'), companyQuery],
      responses: {
        '200': { description: 'Payout detail', content: json(brandPayoutDetailSchema) },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/finance/brand-payouts/preview': {
    post: {
      summary: 'Locked read of eligibility, cover, holds, funds and off-day status; no effects',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(brandPayoutPreviewInputSchema) },
      responses: {
        '200': {
          description: 'Preview and readiness revision',
          content: json(brandPayoutPreviewSchema),
        },
        ...errorResponses(),
      },
    },
  },
  '/api/v1/finance/brand-payouts/commands': {
    post: {
      summary: 'Confirm one actual full or partial brand payout from a permitted funded account',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: { required: true, content: json(brandPayoutCommandSchema) },
      responses: {
        '200': {
          description: 'Committed payout (or retained original result)',
          content: json(brandPayoutResultSchema),
        },
        ...errorResponses({
          '409':
            'Retained rejection: insufficient eligibility/funds, missing off-day reason, changed wallet, or changed payload for the same commandId',
        }),
      },
    },
  },
  '/api/v1/finance/brand-payouts/commands/{commandId}': {
    get: {
      summary: 'Recover the original result for the same principal after an unknown outcome',
      security: [{ erpSession: [] }],
      parameters: [pathId('commandId'), companyQuery],
      responses: {
        '200': { description: 'Retained committed result', content: json(brandPayoutResultSchema) },
        ...errorResponses({ '409': 'Retained original rejection' }),
      },
    },
  },
};
export { brandWalletAmountsSchema };
