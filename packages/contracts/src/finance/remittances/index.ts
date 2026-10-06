import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import { financeViewSchemas, type PaymentMethod } from '../index.js';
export interface RemittanceScope {
  companyId: string;
  driverId: string;
  roundId: string;
  branchId: string;
}
export interface RemittanceComponent {
  method: PaymentMethod;
  accountId: string;
  amountMinor: string;
  reference?: string;
}
export interface RemittanceCommand extends RemittanceScope {
  schemaVersion: 1;
  type: 'remittance.confirm';
  commandId: string;
  witnessId: string;
  expectedRevision: string;
  expectedDigest: string;
  actualDate: string;
  components: RemittanceComponent[];
}
export interface RemittanceSource {
  taskId: string;
  cycleId: string;
  attemptId: string;
  outcomeId: string;
  outcomeRevision: string;
  visitId: string | null;
  brandId: string;
  branchId: string;
  shipmentId: string;
  shipmentReference: string;
  reportedMinor: string | null;
  goodsMinor: string;
  shippingMinor: string;
  creditLotId: string | null;
  covered: boolean;
}
export interface RemittanceWitness extends RemittanceScope {
  id: string;
  revision: string;
  digest: string;
  expectedMinor: string;
  blockers: string[];
  sources: RemittanceSource[];
  createdAt: string;
  receivedEvidenceOnly: true;
  basisRevision: string;
  basisDigest: string;
}
export interface RemittanceResult {
  commandId: string;
  id: string;
  reference: string;
  kind: 'received' | 'checked';
  amountMinor: string;
}
export interface RemittanceDetail extends RemittanceResult, RemittanceScope {
  actualDate: string;
  recordedAt: string;
  actorName: string;
  witness: RemittanceWitness;
  components: (RemittanceComponent & { movementId: string; accountName: string })[];
  reviews: { id: string; state: 'open' | 'resolved'; visitId: string; createdAt: string }[];
}
const uuid = { type: 'string', format: 'uuid' },
  amount = { type: 'string', pattern: '^[1-9][0-9]{0,18}$' };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});
const scope = { companyId: uuid, driverId: uuid, roundId: uuid, branchId: uuid };
export const remittanceScopeSchema = object(scope);
export const remittanceFilterSchema = object(
  {
    companyId: uuid,
    driverId: uuid,
    roundId: uuid,
    branchId: uuid,
    state: { enum: ['all', 'unremitted', 'received', 'checked'] },
    from: { type: 'string', format: 'date' },
    to: { type: 'string', format: 'date' },
    page: { type: 'string', pattern: '^[1-9][0-9]{0,5}$' },
  },
  ['companyId'],
);
export const remittanceComponentSchema = object(
  {
    method: { enum: ['cash', 'bank_deposit', 'instapay'] },
    accountId: uuid,
    amountMinor: amount,
    reference: { type: 'string', maxLength: 250 },
  },
  ['method', 'accountId', 'amountMinor'],
);
export const remittanceCommandSchema = object({
  ...scope,
  schemaVersion: { const: 1 },
  type: { const: 'remittance.confirm' },
  commandId: uuid,
  witnessId: uuid,
  expectedRevision: { type: 'string', pattern: '^[1-9][0-9]{0,18}$' },
  expectedDigest: { type: 'string', pattern: '^[a-f0-9]{64}$' },
  actualDate: { type: 'string', format: 'date' },
  components: { type: 'array', maxItems: 100, items: remittanceComponentSchema },
});
const ajv = new AjvModule.default({ allErrors: true });
formatsModule.default(ajv);
export const validateRemittanceScope = ajv.compile<RemittanceScope>(remittanceScopeSchema);
export const validateRemittanceCommand = ajv.compile<RemittanceCommand>(remittanceCommandSchema);
export const validateRemittanceFilter = ajv.compile(remittanceFilterSchema);
const nonnegative = { type: 'string', pattern: '^(0|[1-9][0-9]{0,18})$' },
  nullableUuid = { anyOf: [uuid, { type: 'null' }] },
  instant = { type: 'string', format: 'date-time' };
const sourceSchema = object({
  taskId: uuid,
  cycleId: uuid,
  attemptId: uuid,
  outcomeId: uuid,
  outcomeRevision: nonnegative,
  visitId: nullableUuid,
  brandId: uuid,
  branchId: uuid,
  shipmentId: uuid,
  shipmentReference: { type: 'string', pattern: '^[0-9]+$' },
  reportedMinor: { anyOf: [nonnegative, { type: 'null' }] },
  goodsMinor: nonnegative,
  shippingMinor: nonnegative,
  creditLotId: nullableUuid,
  covered: { type: 'boolean' },
});
export const remittanceWitnessSchema = object({
  ...scope,
  id: uuid,
  revision: nonnegative,
  digest: { type: 'string', pattern: '^[a-f0-9]{64}$' },
  expectedMinor: nonnegative,
  blockers: { type: 'array', items: { type: 'string' } },
  sources: { type: 'array', items: sourceSchema },
  createdAt: instant,
  receivedEvidenceOnly: { const: true },
  basisRevision: nonnegative,
  basisDigest: { type: 'string', pattern: '^[a-f0-9]{64}$' },
});
export const remittanceResultSchema = object({
  commandId: uuid,
  id: uuid,
  reference: { type: 'string', pattern: '^[0-9]+$' },
  kind: { enum: ['received', 'checked'] },
  amountMinor: nonnegative,
});
export const remittanceDetailSchema = object({
  ...remittanceResultSchema.properties,
  ...scope,
  actualDate: { type: 'string', format: 'date' },
  recordedAt: instant,
  actorName: { type: 'string' },
  witness: remittanceWitnessSchema,
  components: {
    type: 'array',
    items: object({
      ...remittanceComponentSchema.properties,
      movementId: uuid,
      accountName: { type: 'string' },
    }),
  },
  reviews: {
    type: 'array',
    items: object({
      id: uuid,
      state: { enum: ['open', 'resolved'] },
      visitId: uuid,
      createdAt: instant,
    }),
  },
});
export const remittanceRoundsSchema = object({
  items: {
    type: 'array',
    items: object({
      roundId: uuid,
      driverId: uuid,
      driverName: { type: 'string' },
      startedAt: instant,
      endedAt: { anyOf: [instant, { type: 'null' }] },
      remittanceId: nullableUuid,
      reference: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      state: { enum: ['received', 'checked', null] },
      receivedMinor: { anyOf: [nonnegative, { type: 'null' }] },
    }),
  },
  page: { type: 'integer', minimum: 1 },
  limit: { const: 25 },
});
export const validateRemittanceViews = {
  witness: ajv.compile<RemittanceWitness>(remittanceWitnessSchema),
  result: ajv.compile<RemittanceResult>(remittanceResultSchema),
  detail: ajv.compile<RemittanceDetail>(remittanceDetailSchema),
  rounds: ajv.compile(remittanceRoundsSchema),
};
export const remittancePaths = Object.fromEntries(
  [
    ['/api/v1/finance/remittances', 'get'],
    ['/api/v1/finance/remittances/catalog', 'get'],
    ['/api/v1/finance/remittances/{id}', 'get'],
    ['/api/v1/finance/remittances/rounds', 'get'],
    ['/api/v1/finance/remittances/review', 'post'],
    ['/api/v1/finance/remittances/commands', 'post'],
    ['/api/v1/finance/remittances/commands/{commandId}', 'get'],
  ].map(([path, method]) => [
    path,
    {
      [method!]: {
        summary: 'Authorized full driver remittance from received evidence',
        security: [{ erpSession: [] }],
        parameters: [
          ...(method === 'get'
            ? Object.entries(remittanceFilterSchema.properties).map(([name, schema]) => ({
                name,
                in: 'query',
                required: name === 'companyId',
                schema,
              }))
            : []),
          ...(path!.includes('{')
            ? [
                {
                  name: path!.includes('{id}') ? 'id' : 'commandId',
                  in: 'path',
                  required: true,
                  schema: uuid,
                },
              ]
            : []),
        ],
        ...(method === 'post'
          ? {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: path!.endsWith('/review')
                      ? remittanceScopeSchema
                      : remittanceCommandSchema,
                  },
                },
              },
            }
          : {}),
        responses: {
          '200': {
            description: 'Scoped remittance evidence or committed result',
            content: {
              'application/json': {
                schema: path!.endsWith('/review')
                  ? remittanceWitnessSchema
                  : path!.includes('commands')
                    ? remittanceResultSchema
                    : path!.endsWith('/{id}')
                      ? remittanceDetailSchema
                      : path!.endsWith('/catalog')
                        ? financeViewSchemas.catalog
                        : remittanceRoundsSchema,
              },
            },
          },
          '400': { description: 'Invalid closed input' },
          '403': { description: 'Grant or branch denied' },
          '409': { description: 'Evidence changed, incomplete receipt or already covered' },
          '503': { description: 'Source unavailable; no receipt posted' },
        },
      },
    },
  ]),
);
