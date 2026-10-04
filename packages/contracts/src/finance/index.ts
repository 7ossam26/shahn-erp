import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
export const paymentMethods = ['cash', 'bank_deposit', 'instapay'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export interface AccountFields {
  name: string;
  type: 'cash' | 'bank';
  currency: 'EGP';
  branchIds: string[];
  active: boolean;
  bankDescription: string;
}
export interface Account extends AccountFields {
  id: string;
  version: number;
  balanceMinor: string;
}
export interface PaymentFields {
  accountId: string;
  branchId: string;
  currency: 'EGP';
  amountMinor: string;
  actualDate: string;
  method: PaymentMethod;
}
export type FinanceCommand = { schemaVersion: 1; companyId: string; commandId: string } & (
  | { type: 'account.create'; fields: AccountFields }
  | { type: 'account.update'; accountId: string; expectedVersion: number; fields: AccountFields }
  | { type: 'account.deactivate'; accountId: string; expectedVersion: number }
  | { type: 'expense.create'; fields: PaymentFields & { categoryId: string; description: string } }
  | {
      type: 'movement.create';
      fields: PaymentFields & { direction: 'deposit' | 'withdrawal'; reason: string };
    }
);
export interface FinanceResult {
  commandId: string;
  entityId: string;
  version: number;
  movementId: string | null;
}
export interface MoneyMovement extends PaymentFields {
  id: string;
  sourceId: string;
  effectId: string;
  direction: 'deposit' | 'withdrawal';
  sourceKind: 'expense' | 'general' | 'treasury_send' | 'treasury_receive';
  accountName: string;
  branchName: string;
  reason: string;
  actorId: string;
  actorName: string;
  recordedAt: string;
}
export interface PaidExpense extends PaymentFields {
  id: string;
  movementId: string;
  sourceId: string;
  costEffectId: string;
  categoryId: string;
  categoryName: string;
  description: string;
  accountName: string;
  branchName: string;
  actorId: string;
  actorName: string;
  recordedAt: string;
}
export interface FinanceFilter {
  search: string;
  branchId: string | null;
  accountId: string | null;
  categoryId: string | null;
  method: PaymentMethod | 'all';
  direction: 'deposit' | 'withdrawal' | 'all';
  actorId: string | null;
  dateBasis: 'actual' | 'recorded';
  from: string | null;
  to: string | null;
  page: number;
  limit: number;
}
export interface FinanceList<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface FinanceCatalog {
  accounts: Account[];
  categories: { id: string; name: string; active: boolean; version: number }[];
  branches: { id: string; name: string }[];
}
const uuid = { type: 'string', format: 'uuid' },
  date = { type: 'string', format: 'date' },
  text = { type: 'string', minLength: 1, maxLength: 180, pattern: '\\S' },
  note = { type: 'string', maxLength: 1000 },
  version = { type: 'integer', minimum: 1, maximum: 2147483647 },
  amount = { type: 'string', pattern: '^[1-9][0-9]{0,18}$' },
  nonnegative = { type: 'string', pattern: '^(0|[1-9][0-9]{0,18})$' },
  method = { type: 'string', enum: paymentMethods },
  direction = { type: 'string', enum: ['deposit', 'withdrawal'] };
const nullable = (s: object) => ({ anyOf: [s, { type: 'null' }] });
const array = (items: object) => ({ type: 'array', items });
const closed = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});
const accountFields = {
  name: text,
  type: { type: 'string', enum: ['cash', 'bank'] },
  currency: { type: 'string', const: 'EGP' },
  branchIds: { type: 'array', items: uuid, minItems: 1, maxItems: 100, uniqueItems: true },
  active: { type: 'boolean' },
  bankDescription: note,
};
const paymentFields = {
  accountId: uuid,
  branchId: uuid,
  currency: { type: 'string', const: 'EGP' },
  amountMinor: amount,
  actualDate: date,
  method,
};
const common = { schemaVersion: { type: 'integer', const: 1 }, companyId: uuid, commandId: uuid };
const variants = {
  'account.create': { fields: closed(accountFields) },
  'account.update': { accountId: uuid, expectedVersion: version, fields: closed(accountFields) },
  'account.deactivate': { accountId: uuid, expectedVersion: version },
  'expense.create': {
    fields: closed({
      ...paymentFields,
      categoryId: uuid,
      description: { ...note, minLength: 1, pattern: '\\S' },
    }),
  },
  'movement.create': { fields: closed({ ...paymentFields, direction, reason: note }) },
};
export const financeCommandSchema = {
  oneOf: Object.entries(variants).map(([type, fields]) =>
    closed({ ...common, type: { type: 'string', const: type }, ...fields }),
  ),
};
const resultSchema = closed({
  commandId: uuid,
  entityId: uuid,
  version,
  movementId: nullable(uuid),
});
const accountSchema = closed({ ...accountFields, id: uuid, version, balanceMinor: nonnegative });
const historical = {
  accountName: text,
  branchName: text,
  actorId: uuid,
  actorName: text,
  recordedAt: { type: 'string', format: 'date-time' },
};
const movementSchema = closed({
  ...paymentFields,
  ...historical,
  id: uuid,
  sourceId: uuid,
  effectId: uuid,
  direction,
  sourceKind: { type: 'string', enum: ['expense', 'general', 'treasury_send', 'treasury_receive'] },
  reason: note,
});
const expenseSchema = closed({
  ...paymentFields,
  ...historical,
  id: uuid,
  movementId: uuid,
  sourceId: uuid,
  costEffectId: uuid,
  categoryId: uuid,
  categoryName: text,
  description: note,
});
const list = (items: object) =>
  closed({
    items: array(items),
    total: { type: 'integer', minimum: 0 },
    page: version,
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  });
export const financeFilterSchema = closed({
  search: { type: 'string', maxLength: 180 },
  branchId: nullable(uuid),
  accountId: nullable(uuid),
  categoryId: nullable(uuid),
  actorId: nullable(uuid),
  method: { type: 'string', enum: ['all', ...paymentMethods] },
  direction: { type: 'string', enum: ['all', 'deposit', 'withdrawal'] },
  dateBasis: { type: 'string', enum: ['actual', 'recorded'] },
  from: nullable(date),
  to: nullable(date),
  page: version,
  limit: { type: 'integer', minimum: 1, maximum: 100 },
});
export const financeViewSchemas = {
  result: resultSchema,
  account: accountSchema,
  accounts: list(accountSchema),
  movement: movementSchema,
  expense: expenseSchema,
  movements: list(movementSchema),
  expenses: list(expenseSchema),
  catalog: closed({
    accounts: array(accountSchema),
    categories: array(closed({ id: uuid, name: text, active: { type: 'boolean' }, version })),
    branches: array(closed({ id: uuid, name: text })),
  }),
};
export const financeErrorSchema = {
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
    details: closed({
      obligations: array(closed({ owner: { type: 'string' }, sourceIdentity: { type: 'string' } })),
    }),
  },
};
const ajv = new AjvModule.default({ strict: true, allErrors: true });
formatsModule.default(ajv);
export const validateFinanceCommand = ajv.compile<FinanceCommand>(financeCommandSchema);
export const validateFinanceFilter = ajv.compile<FinanceFilter>(financeFilterSchema);
export const validateFinanceViews = Object.fromEntries(
  Object.entries(financeViewSchemas).map(([key, schema]) => [key, ajv.compile(schema)]),
);
export const financeFamily = (type: string) =>
  type.startsWith('account.')
    ? 'finance.accounts'
    : type.startsWith('expense.')
      ? 'finance.expenses'
      : 'finance.movements';
const queryProperties = financeFilterSchema.properties;
export const financePaths = Object.fromEntries(
  [
    ['/api/v1/finance/accounts', 'accounts'],
    ['/api/v1/finance/accounts/{id}', 'account'],
    ['/api/v1/finance/accounts/{id}/movements', 'movements'],
    ['/api/v1/finance/expenses', 'expenses'],
    ['/api/v1/finance/expenses/{id}', 'expense'],
    ['/api/v1/finance/movements', 'movements'],
    ['/api/v1/finance/movements/{id}', 'movement'],
    ['/api/v1/finance/catalog', 'catalog'],
    ['/api/v1/finance/commands/{commandId}', 'result'],
    ['/api/v1/finance/commands', 'result'],
  ].map(([path, view]) => [
    path,
    {
      [path === '/api/v1/finance/commands' ? 'post' : 'get']: {
        security: [
          { erpSession: [], ...(path === '/api/v1/finance/commands' ? { csrfToken: [] } : {}) },
        ],
        parameters:
          path === '/api/v1/finance/commands'
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
                        schema: {
                          type: 'string',
                          enum: ['finance.accounts', 'finance.expenses', 'finance.movements'],
                        },
                      },
                    ]
                  : []),
                ...(['expenses', 'movements', 'accounts'].includes(view!)
                  ? Object.entries(queryProperties)
                      .filter(
                        ([name]) =>
                          view !== 'accounts' ||
                          ['search', 'branchId', 'accountId', 'page', 'limit'].includes(name),
                      )
                      .map(([name, schema]) => ({
                        name,
                        in: 'query',
                        required: false,
                        schema,
                      }))
                  : []),
                ...(view === 'accounts'
                  ? [
                      {
                        name: 'active',
                        in: 'query',
                        required: false,
                        schema: { type: 'string', enum: ['all', 'true', 'false'] },
                      },
                    ]
                  : []),
                ...(view === 'catalog'
                  ? [
                      {
                        name: 'screen',
                        in: 'query',
                        required: true,
                        schema: {
                          type: 'string',
                          enum: ['expenses', 'finance.accounts', 'finance.movements'],
                        },
                      },
                    ]
                  : []),
              ],
        ...(path === '/api/v1/finance/commands'
          ? {
              requestBody: {
                required: true,
                content: { 'application/json': { schema: financeCommandSchema } },
              },
            }
          : {}),
        responses: Object.fromEntries(
          ['200', '400', '401', '403', '404', '409', '500', '503'].map((status) => [
            status,
            {
              description:
                status === '200'
                  ? 'Authorized persisted finance result'
                  : 'Typed rejection; 5xx requires command recovery',
              content: {
                'application/json': {
                  schema:
                    status === '200'
                      ? financeViewSchemas[view as keyof typeof financeViewSchemas]
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
export const financeExamples = {
  account: {
    type: 'account.create',
    fields: {
      name: 'خزينة ب',
      type: 'cash',
      currency: 'EGP',
      branchIds: ['00000000-0000-4000-8000-000000000002'],
      active: true,
      bankDescription: '',
    },
  },
  deposit: {
    type: 'movement.create',
    fields: {
      accountId: '00000000-0000-4000-8000-000000000001',
      branchId: '00000000-0000-4000-8000-000000000002',
      currency: 'EGP',
      amountMinor: '100000',
      actualDate: '2026-09-01',
      method: 'cash',
      direction: 'deposit',
      reason: '',
    },
  },
} as const;
