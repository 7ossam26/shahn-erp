import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
/**
 * Shared company-level brand wallet views (UI-BRAND-PAYOUT-001, REP-08/09).
 * Every amount is server-derived from the P03 lot model; the browser never submits eligibility.
 */
export const walletLotKinds = [
  'goods',
  'compensation',
  'opening',
  'correction',
  'adjustment',
] as const;
export const walletMovementKinds = [
  'goods',
  'compensation',
  'fee',
  'payout',
  'correction',
  'opening',
  'adjustment',
] as const;
export const walletReasons = [
  'PENDING_REMITTANCE',
  'HELD_FOR_REVIEW',
  'SHIPPING_COVER',
  'DEBT',
  'NO_ELIGIBLE_CREDIT',
] as const;
export type WalletReason = (typeof walletReasons)[number];
export type WalletMovementKind = (typeof walletMovementKinds)[number];
export interface BrandWalletAmounts {
  /** E: remaining eligible positive credit, including held portions. */
  eligibleMinor: string;
  /** P: remaining credit still waiting for its producer (e.g. full driver remittance). */
  pendingMinor: string;
  /** D: posted brand debits not yet offset against eligible credit. */
  debitsMinor: string;
  /** H: eligible credit held by an affected source review/gap. */
  heldMinor: string;
  /** C: active known brand-paid shipping-cover reservations. */
  coverMinor: string;
  /** E + P - D; may be negative. */
  signedEntitlementMinor: string;
  /** max(0, E - D - H - C). */
  eligibleToPayMinor: string;
  /** Historical actual payouts, already removed from E by immutable allocations. */
  paidMinor: string;
}
export interface BrandWalletBranch {
  branchId: string | null;
  branchName: string;
  eligibleMinor: string;
  pendingMinor: string;
  heldMinor: string;
  debitsMinor: string;
  coverMinor: string;
}
export interface BrandWalletSummary {
  brandId: string;
  brandName: string;
  active: boolean;
  allowNegativeBalance: boolean;
  payoutWeekdays: number[];
  policyVersion: number;
  amounts: BrandWalletAmounts;
  readinessRevision: string;
  branches: BrandWalletBranch[];
  reasons: WalletReason[];
  today: string;
  scheduledToday: boolean;
  nextPayoutDate: string;
  openReviews: number;
  activeHolds: number;
}
export interface BrandDue {
  brandId: string;
  brandName: string;
  active: boolean;
  payoutWeekdays: number[];
  scheduledToday: boolean;
  nextPayoutDate: string;
  amounts: BrandWalletAmounts;
  reasons: WalletReason[];
}
export interface BrandDuesList {
  items: BrandDue[];
  total: number;
  page: number;
  limit: number;
  today: string;
}
export interface WalletLink {
  id: string;
  reference: string;
}
export interface WalletLot {
  lotId: string;
  kind: (typeof walletLotKinds)[number];
  branchId: string;
  branchName: string;
  effectiveDate: string;
  amountMinor: string;
  allocatedMinor: string;
  heldMinor: string;
  remainingMinor: string;
  readiness: 'pending' | 'eligible';
  state: 'pending' | 'eligible' | 'held' | 'consumed';
  shipment: WalletLink | null;
  remittance: WalletLink | null;
  holds: { id: string; amountMinor: string; reason: string; active: boolean }[];
}
export interface WalletLotList {
  items: WalletLot[];
  total: number;
  page: number;
  limit: number;
}
export interface WalletMovement {
  id: string;
  kind: WalletMovementKind;
  amountMinor: string;
  balanceAfterMinor: string;
  effectiveDate: string;
  recordedAt: string;
  branchId: string;
  branchName: string;
  basis: 'source' | 'paying';
  readiness: 'pending' | 'eligible' | null;
  payout: WalletLink | null;
  shipment: WalletLink | null;
  remittance: WalletLink | null;
  supersedesId: string | null;
  reason: string | null;
}
export interface WalletStatement {
  brandId: string;
  brandName: string;
  from: string | null;
  to: string | null;
  filtered: boolean;
  openingMinor: string;
  closingMinor: string;
  creditsMinor: string;
  debitsMinor: string;
  items: WalletMovement[];
  total: number;
  page: number;
  limit: number;
  current: BrandWalletAmounts;
  journalMinor: string;
  reconciled: boolean;
}
export interface PayoutCalendar {
  from: string;
  to: string;
  today: string;
  days: {
    date: string;
    weekday: number;
    scheduled: { brandId: string; brandName: string; eligibleToPayMinor: string }[];
    payouts: {
      id: string;
      reference: string;
      brandId: string;
      brandName: string;
      amountMinor: string;
      offDay: boolean;
    }[];
  }[];
}
export const uuidSchema = { type: 'string', format: 'uuid' } as const;
export const dateSchema = { type: 'string', format: 'date' } as const;
export const nonnegativeMinorSchema = {
  type: 'string',
  pattern: '^(0|[1-9][0-9]{0,18})$',
} as const;
export const signedMinorSchema = { type: 'string', pattern: '^(0|-?[1-9][0-9]{0,18})$' } as const;
export const positiveMinorSchema = { type: 'string', pattern: '^[1-9][0-9]{0,18}$' } as const;
const pageQuery = { type: 'string', pattern: '^[1-9][0-9]{0,5}$' },
  instant = { type: 'string', format: 'date-time' },
  text = { type: 'string', maxLength: 500 },
  name = { type: 'string', minLength: 1, maxLength: 180 },
  count = { type: 'integer', minimum: 0, maximum: 2147483647 },
  weekdays = {
    type: 'array',
    items: { type: 'integer', minimum: 0, maximum: 6 },
    minItems: 1,
    maxItems: 7,
    uniqueItems: true,
  };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
export const closedObject = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) => ({ type: 'object', additionalProperties: false, properties, required });
export const brandWalletAmountsSchema = closedObject({
  eligibleMinor: nonnegativeMinorSchema,
  pendingMinor: nonnegativeMinorSchema,
  debitsMinor: nonnegativeMinorSchema,
  heldMinor: nonnegativeMinorSchema,
  coverMinor: nonnegativeMinorSchema,
  signedEntitlementMinor: signedMinorSchema,
  eligibleToPayMinor: nonnegativeMinorSchema,
  paidMinor: nonnegativeMinorSchema,
});
const reasons = {
  type: 'array',
  items: { type: 'string', enum: walletReasons },
  uniqueItems: true,
};
export const brandWalletSummarySchema = closedObject({
  brandId: uuidSchema,
  brandName: name,
  active: { type: 'boolean' },
  allowNegativeBalance: { type: 'boolean' },
  payoutWeekdays: weekdays,
  policyVersion: { type: 'integer', minimum: 1, maximum: 2147483647 },
  amounts: brandWalletAmountsSchema,
  readinessRevision: { type: 'string', pattern: '^[a-f0-9]{64}$' },
  branches: {
    type: 'array',
    items: closedObject({
      branchId: nullable(uuidSchema),
      branchName: name,
      eligibleMinor: nonnegativeMinorSchema,
      pendingMinor: nonnegativeMinorSchema,
      heldMinor: nonnegativeMinorSchema,
      debitsMinor: nonnegativeMinorSchema,
      coverMinor: nonnegativeMinorSchema,
    }),
  },
  reasons,
  today: dateSchema,
  scheduledToday: { type: 'boolean' },
  nextPayoutDate: dateSchema,
  openReviews: count,
  activeHolds: count,
});
const dueSchema = closedObject({
  brandId: uuidSchema,
  brandName: name,
  active: { type: 'boolean' },
  payoutWeekdays: weekdays,
  scheduledToday: { type: 'boolean' },
  nextPayoutDate: dateSchema,
  amounts: brandWalletAmountsSchema,
  reasons,
});
const list = (items: object, extra: Record<string, unknown> = {}) =>
  closedObject({
    items: { type: 'array', items },
    total: count,
    page: { type: 'integer', minimum: 1, maximum: 999999 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    ...extra,
  });
export const brandDuesListSchema = list(dueSchema, { today: dateSchema });
const link = nullable(
  closedObject({ id: uuidSchema, reference: { type: 'string', pattern: '^[0-9]{1,30}$' } }),
);
export const walletLotSchema = closedObject({
  lotId: uuidSchema,
  kind: { type: 'string', enum: walletLotKinds },
  branchId: uuidSchema,
  branchName: name,
  effectiveDate: dateSchema,
  amountMinor: positiveMinorSchema,
  allocatedMinor: nonnegativeMinorSchema,
  heldMinor: nonnegativeMinorSchema,
  remainingMinor: nonnegativeMinorSchema,
  readiness: { type: 'string', enum: ['pending', 'eligible'] },
  state: { type: 'string', enum: ['pending', 'eligible', 'held', 'consumed'] },
  shipment: link,
  remittance: link,
  holds: {
    type: 'array',
    items: closedObject({
      id: uuidSchema,
      amountMinor: positiveMinorSchema,
      reason: text,
      active: { type: 'boolean' },
    }),
  },
});
export const walletLotListSchema = list(walletLotSchema);
export const walletMovementSchema = closedObject({
  id: uuidSchema,
  kind: { type: 'string', enum: walletMovementKinds },
  amountMinor: signedMinorSchema,
  balanceAfterMinor: signedMinorSchema,
  effectiveDate: dateSchema,
  recordedAt: instant,
  branchId: uuidSchema,
  branchName: name,
  basis: { type: 'string', enum: ['source', 'paying'] },
  readiness: { anyOf: [{ type: 'string', enum: ['pending', 'eligible'] }, { type: 'null' }] },
  payout: link,
  shipment: link,
  remittance: link,
  supersedesId: nullable(uuidSchema),
  reason: nullable({ type: 'string', maxLength: 1000 }),
});
export const walletStatementSchema = closedObject({
  ...list(walletMovementSchema).properties,
  brandId: uuidSchema,
  brandName: name,
  from: nullable(dateSchema),
  to: nullable(dateSchema),
  filtered: { type: 'boolean' },
  openingMinor: signedMinorSchema,
  closingMinor: signedMinorSchema,
  creditsMinor: nonnegativeMinorSchema,
  debitsMinor: nonnegativeMinorSchema,
  current: brandWalletAmountsSchema,
  journalMinor: signedMinorSchema,
  reconciled: { type: 'boolean' },
});
export const payoutCalendarSchema = closedObject({
  from: dateSchema,
  to: dateSchema,
  today: dateSchema,
  days: {
    type: 'array',
    maxItems: 42,
    items: closedObject({
      date: dateSchema,
      weekday: { type: 'integer', minimum: 0, maximum: 6 },
      scheduled: {
        type: 'array',
        items: closedObject({
          brandId: uuidSchema,
          brandName: name,
          eligibleToPayMinor: nonnegativeMinorSchema,
        }),
      },
      payouts: {
        type: 'array',
        items: closedObject({
          id: uuidSchema,
          reference: { type: 'string', pattern: '^[0-9]{1,30}$' },
          brandId: uuidSchema,
          brandName: name,
          amountMinor: positiveMinorSchema,
          offDay: { type: 'boolean' },
        }),
      },
    }),
  },
});
export const brandDuesFilterSchema = closedObject(
  {
    companyId: uuidSchema,
    search: { type: 'string', maxLength: 180 },
    state: { type: 'string', enum: ['all', 'payable', 'pending', 'held', 'debt'] },
    scheduled: { type: 'string', enum: ['all', 'today'] },
    page: pageQuery,
  },
  ['companyId'],
);
export const walletLotFilterSchema = closedObject(
  {
    companyId: uuidSchema,
    state: { type: 'string', enum: ['all', 'pending', 'eligible', 'held', 'consumed'] },
    branchId: uuidSchema,
    page: pageQuery,
  },
  ['companyId'],
);
export const walletStatementFilterSchema = closedObject(
  {
    companyId: uuidSchema,
    from: dateSchema,
    to: dateSchema,
    kind: { type: 'string', enum: ['all', ...walletMovementKinds] },
    branchId: uuidSchema,
    basis: { type: 'string', enum: ['all', 'source', 'paying'] },
    page: pageQuery,
  },
  ['companyId'],
);
export const payoutCalendarFilterSchema = closedObject(
  { companyId: uuidSchema, from: dateSchema, to: dateSchema, brandId: uuidSchema },
  ['companyId', 'from', 'to'],
);
export const brandWalletErrorSchema = closedObject(
  {
    code: { type: 'string', pattern: '^[A-Z][A-Z0-9_]{0,79}$' },
    messageKey: { type: 'string', maxLength: 120 },
    commandId: nullable(uuidSchema),
    correlationId: uuidSchema,
    details: closedObject(
      {
        amounts: brandWalletAmountsSchema,
        readinessRevision: { type: 'string', pattern: '^[a-f0-9]{64}$' },
        availableMinor: nonnegativeMinorSchema,
      },
      [],
    ),
  },
  ['code', 'correlationId'],
);
const ajv = new AjvModule.default({ strict: true, allErrors: true });
formatsModule.default(ajv);
export const validateBrandDuesFilter = ajv.compile(brandDuesFilterSchema);
export const validateWalletLotFilter = ajv.compile(walletLotFilterSchema);
export const validateWalletStatementFilter = ajv.compile(walletStatementFilterSchema);
export const validatePayoutCalendarFilter = ajv.compile(payoutCalendarFilterSchema);
export const validateBrandWalletViews = {
  dues: ajv.compile<BrandDuesList>(brandDuesListSchema),
  summary: ajv.compile<BrandWalletSummary>(brandWalletSummarySchema),
  lots: ajv.compile<WalletLotList>(walletLotListSchema),
  statement: ajv.compile<WalletStatement>(walletStatementSchema),
  calendar: ajv.compile<PayoutCalendar>(payoutCalendarSchema),
  error: ajv.compile(brandWalletErrorSchema),
};
const queryParameters = (schema: { properties: Record<string, unknown>; required: string[] }) =>
  Object.entries(schema.properties).map(([parameter, value]) => ({
    name: parameter,
    in: 'query',
    required: schema.required.includes(parameter),
    schema: value,
  }));
const brandPath = { name: 'brandId', in: 'path', required: true, schema: uuidSchema };
const errors = {
  '400': {
    description: 'Invalid closed query',
    content: { 'application/json': { schema: brandWalletErrorSchema } },
  },
  '401': { description: 'Authentication required' },
  '403': {
    description: 'Brand payout screen grant missing or revoked',
    content: { 'application/json': { schema: brandWalletErrorSchema } },
  },
  '404': {
    description: 'Brand not in this company',
    content: { 'application/json': { schema: brandWalletErrorSchema } },
  },
};
const read = (summary: string, parameters: unknown[], schema: object) => ({
  get: {
    summary,
    security: [{ erpSession: [] }],
    parameters,
    responses: {
      '200': { description: summary, content: { 'application/json': { schema } } },
      ...errors,
    },
  },
});
export const brandWalletPaths = {
  '/api/v1/finance/brand-wallets': read(
    'Shared eligible brand dues (REP-09) with pending, held, cover and debt separated',
    queryParameters(brandDuesFilterSchema),
    brandDuesListSchema,
  ),
  '/api/v1/finance/brand-wallets/calendar': read(
    'Agreed payout weekdays and actual payouts by Cairo date (REP-09)',
    queryParameters(payoutCalendarFilterSchema),
    payoutCalendarSchema,
  ),
  '/api/v1/finance/brand-wallets/{brandId}': read(
    'Locked shared wallet summary with source-branch breakdown and readiness revision',
    [brandPath, { name: 'companyId', in: 'query', required: true, schema: uuidSchema }],
    brandWalletSummarySchema,
  ),
  '/api/v1/finance/brand-wallets/{brandId}/lots': read(
    'Credit lots with pending/eligible/held/consumed state and source links',
    [brandPath, ...queryParameters(walletLotFilterSchema)],
    walletLotListSchema,
  ),
  '/api/v1/finance/brand-wallets/{brandId}/statement': read(
    'Brand account statement (REP-08): opening, signed movements, running balance, closing',
    [brandPath, ...queryParameters(walletStatementFilterSchema)],
    walletStatementSchema,
  ),
};
