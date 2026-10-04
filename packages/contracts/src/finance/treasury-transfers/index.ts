import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import type { Account, FinanceList } from '../index.js';
import { financeViewSchemas, financeErrorSchema } from '../index.js';

export type TreasuryScreen = 'send' | 'receive';
export const treasuryFamily = (type: TreasuryCommand['type']) => type;
export type TreasuryCommand = { schemaVersion: 1; commandId: string; companyId: string } & (
  | {
      type: 'treasury.send';
      transferId: string;
      sourceAccountId: string;
      destinationAccountId: string;
      sourceBranchId: string;
      destinationBranchId: string;
      amountMinor: string;
      currency: 'EGP';
      actualSentAt: string;
      expectedSourceVersion: number;
      expectedDestinationVersion: number;
    }
  | {
      type: 'treasury.receive';
      transferId: string;
      expectedVersion: number;
      actualReceivedAt: string;
      confirmFullReceipt: true;
    }
);
export interface TreasuryResult {
  commandId: string;
  transferId: string;
  version: number;
  state: 'sent' | 'received';
  outcome: 'sent' | 'received' | 'already_received';
}
export interface TreasuryHistory {
  phase: 'send' | 'receive';
  sourceId: string;
  movementId: string;
  effectId: string;
  transitId: string;
  commandRecordId: string;
  actorId: string;
  actorName: string;
  actualAt: string;
  recordedAt: string;
}
export interface TreasuryTransfer {
  id: string;
  reference: string;
  state: 'sent' | 'received';
  version: number;
  sourceAccountId: string;
  destinationAccountId: string;
  sourceBranchId: string;
  destinationBranchId: string;
  sourceAccountName: string;
  destinationAccountName: string;
  sourceBranchName: string;
  destinationBranchName: string;
  amountMinor: string;
  currency: 'EGP';
  transitMinor: string;
  actualSentAt: string;
  recordedAt: string;
  senderId: string;
  senderName: string;
  receipt: {
    actualReceivedAt: string;
    recordedAt: string;
    receiverId: string;
    receiverName: string;
  } | null;
  history: TreasuryHistory[];
}
export interface TreasuryFilter {
  search: string;
  sourceBranchId: string | null;
  destinationBranchId: string | null;
  state: 'all' | 'sent' | 'received';
  dateBasis: 'sent' | 'received' | 'recorded';
  from: string | null;
  to: string | null;
  page: number;
  limit: number;
}
export type TreasuryList = FinanceList<TreasuryTransfer> & { transitMinor: string };
export interface TreasuryCatalog {
  accounts: Account[];
  branches: { id: string; name: string }[];
}
const uuid = { type: 'string', format: 'uuid' },
  time = { type: 'string', format: 'date-time' },
  date = { type: 'string', format: 'date' },
  text = { type: 'string', minLength: 1, maxLength: 180 },
  version = { type: 'integer', minimum: 1, maximum: 2147483647 },
  amount = { type: 'string', pattern: '^[1-9][0-9]{0,18}$' },
  nonnegative = { type: 'string', pattern: '^(0|[1-9][0-9]*)$' };
const closed = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const common = {
  schemaVersion: { type: 'integer', const: 1 },
  commandId: uuid,
  companyId: uuid,
  transferId: uuid,
};
export const treasuryCommandSchema = {
  oneOf: [
    closed({
      ...common,
      type: { const: 'treasury.send', type: 'string' },
      sourceAccountId: uuid,
      destinationAccountId: uuid,
      sourceBranchId: uuid,
      destinationBranchId: uuid,
      amountMinor: amount,
      currency: { type: 'string', const: 'EGP' },
      actualSentAt: time,
      expectedSourceVersion: version,
      expectedDestinationVersion: version,
    }),
    closed({
      ...common,
      type: { const: 'treasury.receive', type: 'string' },
      expectedVersion: version,
      actualReceivedAt: time,
      confirmFullReceipt: { type: 'boolean', const: true },
    }),
  ],
};
const history = closed({
  phase: { type: 'string', enum: ['send', 'receive'] },
  sourceId: uuid,
  movementId: uuid,
  effectId: uuid,
  transitId: uuid,
  commandRecordId: uuid,
  actorId: uuid,
  actorName: text,
  actualAt: time,
  recordedAt: time,
});
const transfer = closed({
  id: uuid,
  reference: { type: 'string', pattern: '^[1-9][0-9]*$' },
  state: { type: 'string', enum: ['sent', 'received'] },
  version,
  sourceAccountId: uuid,
  destinationAccountId: uuid,
  sourceBranchId: uuid,
  destinationBranchId: uuid,
  sourceAccountName: text,
  destinationAccountName: text,
  sourceBranchName: text,
  destinationBranchName: text,
  amountMinor: amount,
  currency: { type: 'string', const: 'EGP' },
  transitMinor: nonnegative,
  actualSentAt: time,
  recordedAt: time,
  senderId: uuid,
  senderName: text,
  receipt: nullable(
    closed({ actualReceivedAt: time, recordedAt: time, receiverId: uuid, receiverName: text }),
  ),
  history: { type: 'array', items: history, minItems: 1, maxItems: 2 },
});
export const treasuryFilterSchema = closed({
  search: { type: 'string', maxLength: 180 },
  sourceBranchId: nullable(uuid),
  destinationBranchId: nullable(uuid),
  state: { type: 'string', enum: ['all', 'sent', 'received'] },
  dateBasis: { type: 'string', enum: ['sent', 'received', 'recorded'] },
  from: nullable(date),
  to: nullable(date),
  page: version,
  limit: { type: 'integer', minimum: 1, maximum: 100 },
});
export const treasuryViewSchemas = {
  result: closed({
    commandId: uuid,
    transferId: uuid,
    version,
    state: { type: 'string', enum: ['sent', 'received'] },
    outcome: { type: 'string', enum: ['sent', 'received', 'already_received'] },
  }),
  detail: transfer,
  list: closed({
    items: { type: 'array', items: transfer },
    total: { type: 'integer', minimum: 0 },
    page: version,
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    transitMinor: nonnegative,
  }),
  catalog: closed({
    accounts: { type: 'array', items: financeViewSchemas.account },
    branches: { type: 'array', items: closed({ id: uuid, name: text }) },
  }),
};
const ajv = new AjvModule.default({ strict: true, allErrors: true });
formatsModule.default(ajv);
export const validateTreasuryCommand = ajv.compile<TreasuryCommand>(treasuryCommandSchema);
export const validateTreasuryFilter = ajv.compile<TreasuryFilter>(treasuryFilterSchema);
export const validateTreasuryViews = Object.fromEntries(
  Object.entries(treasuryViewSchemas).map(([name, schema]) => [name, ajv.compile(schema)]),
);
export const treasuryPaths = Object.fromEntries(
  [
    ['/api/v1/treasury/commands', 'result'],
    ['/api/v1/treasury/commands/{commandId}', 'result'],
    ['/api/v1/treasury/catalog', 'catalog'],
    ['/api/v1/treasury/transfers', 'list'],
    ['/api/v1/treasury/transfers/{id}', 'detail'],
    ['/api/v1/treasury/receipts', 'list'],
    ['/api/v1/treasury/receipts/{id}', 'detail'],
  ].map(([path, view]) => [
    path,
    {
      [path === '/api/v1/treasury/commands' ? 'post' : 'get']: {
        security: [
          { erpSession: [], ...(path === '/api/v1/treasury/commands' ? { csrfToken: [] } : {}) },
        ],
        parameters:
          path === '/api/v1/treasury/commands'
            ? []
            : [
                { name: 'companyId', in: 'query', required: true, schema: uuid },
                ...(path!.includes('{')
                  ? [
                      {
                        name: view === 'result' ? 'commandId' : 'id',
                        in: 'path',
                        required: true,
                        schema: uuid,
                      },
                    ]
                  : []),
                ...(view === 'result'
                  ? [
                      {
                        name: 'family',
                        in: 'query',
                        required: true,
                        schema: { type: 'string', enum: ['treasury.send', 'treasury.receive'] },
                      },
                    ]
                  : []),
                ...(view === 'catalog'
                  ? [
                      {
                        name: 'screen',
                        in: 'query',
                        required: true,
                        schema: { type: 'string', enum: ['send', 'receive'] },
                      },
                    ]
                  : []),
                ...(view === 'list'
                  ? Object.entries(treasuryFilterSchema.properties).map(([name, schema]) => ({
                      name,
                      in: 'query',
                      required: false,
                      schema,
                    }))
                  : []),
              ],
        ...(path === '/api/v1/treasury/commands'
          ? {
              requestBody: {
                required: true,
                content: { 'application/json': { schema: treasuryCommandSchema } },
              },
            }
          : {}),
        responses: Object.fromEntries(
          ['200', '400', '401', '403', '404', '409', '500', '503'].map((status) => [
            status,
            {
              description:
                status === '200'
                  ? 'Persisted authorized treasury result'
                  : 'Typed rejection; unknown mutation results require recovery',
              content: {
                'application/json': {
                  schema:
                    status === '200'
                      ? treasuryViewSchemas[view as keyof typeof treasuryViewSchemas]
                      : financeErrorSchema,
                },
              },
            },
          ]),
        ),
      },
    },
  ]),
);
