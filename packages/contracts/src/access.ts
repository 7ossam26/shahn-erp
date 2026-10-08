import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
export const capabilityIds = [
  'settlements',
  'opening',
  'storage',
  'incidents',
  'remittances',
  'returns',
  'integration',
  'dispatch',
  'brands',
  'reference-data',
  'access.users',
  'access.roles',
  'intake',
  'inventory',
  'expenses',
  'finance.accounts',
  'finance.movements',
  'goods.send',
  'goods.receive',
  'treasury.send',
  'treasury.receive',
  'tracking',
  'brand.payout',
  'employees',
  'payroll',
  'reports',
] as const;
export type CapabilityId = (typeof capabilityIds)[number];
export type Exceptions = Partial<Record<CapabilityId, 'inherit' | 'allow' | 'deny'>>;
export interface AccessSession {
  principalId: string;
  csrfToken: string;
  kind: 'staff' | 'support';
  companyId: string | null;
}
export interface AccessUser {
  id: string;
  name: string;
  username: string;
  roleId: string;
  roleName: string;
  active: boolean;
  version: number;
  identityState: 'pending' | 'failed' | 'ready';
  identityError: string | null;
  branchIds: string[];
  exceptions: Exceptions;
}
export interface AccessRole {
  id: string;
  name: string;
  active: boolean;
  version: number;
  grants: CapabilityId[];
}
export interface AccessUsers {
  items: AccessUser[];
  total: number;
  page: number;
  limit: number;
  roles: AccessRole[];
  branches: { id: string; name: string }[];
  authorizationRevision: string;
}
export interface AccessRegistry<TContext> {
  context: TContext;
  capabilities: {
    id: CapabilityId;
    title: string;
    route: string;
    policy: string;
    implemented: boolean;
  }[];
}
export interface CommandBase {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
}
export interface UserFields {
  name: string;
  roleId: string;
  branchIds: string[];
  exceptions: Exceptions;
  active: boolean;
}
export type AccessCommand = CommandBase &
  (
    | ({ type: 'user.create'; username: string } & UserFields)
    | ({ type: 'user.update'; entityId: string; expectedVersion: number } & UserFields)
    | { type: 'role.create'; name: string; grants: CapabilityId[]; active: boolean }
    | {
        type: 'role.update';
        entityId: string;
        expectedVersion: number;
        name: string;
        grants: CapabilityId[];
        active: boolean;
      }
    | { type: 'branch.create'; name: string }
    | {
        type: 'branch.update';
        entityId: string;
        expectedVersion: number;
        name: string;
        active: boolean;
      }
    | { type: 'company.update'; expectedVersion: number; name: string; active: boolean }
    | { type: 'company.create'; name: string; code: string; reason: string }
    | { type: 'support.start'; reason: string }
  );
export interface CommandResult {
  commandId: string;
  entityId: string;
  version: number;
  state: 'pending' | 'completed' | 'rejected';
  jobId: string | null;
  errorCode: string | null;
}
export interface AccessFailure {
  code: string;
  messageKey: string;
  commandId: string | null;
  correlationId: string;
}
const uuid = { type: 'string', format: 'uuid' };
const name = { type: 'string', minLength: 1, maxLength: 180, pattern: '\\S' };
const active = { type: 'boolean' };
const version = { type: 'integer', minimum: 1, maximum: 2147483647 };
const common = { schemaVersion: { const: 1, type: 'integer' }, commandId: uuid, companyId: uuid };
const edit = { entityId: uuid, expectedVersion: version };
const grants = {
  type: 'array',
  uniqueItems: true,
  maxItems: capabilityIds.length,
  items: { type: 'string', enum: capabilityIds },
};
const user = {
  name,
  roleId: uuid,
  active,
  branchIds: { type: 'array', items: uuid, minItems: 1, maxItems: 100, uniqueItems: true },
  exceptions: {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(
      capabilityIds.map((id) => [id, { type: 'string', enum: ['inherit', 'allow', 'deny'] }]),
    ),
  },
};
const reason = { type: 'string', minLength: 10, maxLength: 1000, pattern: '\\S' };
const variants = {
  'user.create': { ...user, username: { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]{1,79}$' } },
  'user.update': { ...user, ...edit },
  'role.create': { name, active, grants },
  'role.update': { ...edit, name, active, grants },
  'branch.create': { name },
  'branch.update': { ...edit, name, active },
  'company.update': { name, active, expectedVersion: version },
  'company.create': {
    name,
    code: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{1,39}$' },
    reason,
  },
  'support.start': { reason },
};
export const accessCommandSchema = {
  oneOf: Object.entries(variants).map(([type, fields]) => ({
    type: 'object',
    additionalProperties: false,
    properties: { ...common, type: { type: 'string', const: type }, ...fields },
    required: [...Object.keys(common), 'type', ...Object.keys(fields)],
  })),
};
export const commandResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['commandId', 'entityId', 'version', 'state', 'jobId', 'errorCode'],
  properties: {
    commandId: uuid,
    entityId: uuid,
    version,
    state: { type: 'string', enum: ['pending', 'completed', 'rejected'] },
    jobId: { anyOf: [uuid, { type: 'null' }] },
    errorCode: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
};
export const accessErrorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'messageKey', 'commandId', 'correlationId'],
  properties: {
    code: { type: 'string' },
    messageKey: { type: 'string' },
    commandId: { anyOf: [uuid, { type: 'null' }] },
    correlationId: uuid,
  },
};
export const loginSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['companyCode', 'username', 'support', 'returnPath'],
  properties: {
    companyCode: { type: 'string', maxLength: 40 },
    username: { type: 'string', maxLength: 80 },
    support: { type: 'boolean' },
    returnPath: { type: 'string', maxLength: 200, pattern: '^/(?!/)' },
  },
};
export interface LoginInput {
  companyCode: string;
  username: string;
  support: boolean;
  returnPath: string;
}
const ajv = new AjvModule.default({ allErrors: true, strict: true });
formatsModule.default(ajv);
export const validateAccessCommand = ajv.compile<AccessCommand>(accessCommandSchema);
export const validateCommandResult = ajv.compile<CommandResult>(commandResultSchema);
export const validateLogin = ajv.compile<LoginInput>(loginSchema);
export const accessPaths = {
  '/api/v1/access/commands': {
    post: {
      summary: 'Atomic company-scoped administration; CSRF and fresh server authorization required',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: accessCommandSchema } },
      },
      responses: Object.fromEntries(
        ['200', '400', '401', '403', '409', '500', '503'].map((status) => [
          status,
          {
            description:
              status === '200'
                ? 'Persisted result; pending identity work is explicit'
                : 'Typed rejection',
            content: {
              'application/json': {
                schema: status === '200' ? commandResultSchema : accessErrorSchema,
              },
            },
          },
        ]),
      ),
    },
  },
  '/api/v1/access/login': {
    post: {
      summary: 'Uniform issuer redirect; no company/user existence lookup',
      requestBody: { required: true, content: { 'application/json': { schema: loginSchema } } },
      responses: {
        '200': {
          description: 'Issuer redirect URL',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['url'],
                properties: { url: { type: 'string', format: 'uri' } },
              },
            },
          },
        },
        ...Object.fromEntries(
          ['400', '403', '503'].map((status) => [
            status,
            {
              description: 'Typed rejection',
              content: { 'application/json': { schema: accessErrorSchema } },
            },
          ]),
        ),
      },
    },
  },
};
