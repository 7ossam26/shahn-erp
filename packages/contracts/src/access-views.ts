// Closed response schemas shared by HTTP output validation, OpenAPI and the typed web adapter.
import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import { capabilityIds, commandResultSchema, accessErrorSchema } from './access.js';
const uuid = { type: 'string', format: 'uuid' },
  string = { type: 'string' },
  boolean = { type: 'boolean' },
  integer = { type: 'integer' },
  nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const object = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const array = (items: object) => ({ type: 'array', items });
const capability = { type: 'string', enum: capabilityIds },
  grants = array(capability),
  branch = object({ id: uuid, name: string }),
  branches = array(branch);
const exceptions = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    capabilityIds.map((id) => [id, { type: 'string', enum: ['inherit', 'allow', 'deny'] }]),
  ),
};
const role = object({ id: uuid, name: string, active: boolean, version: integer, grants });
const context = object({
  principalId: uuid,
  principalKind: { type: 'string', enum: ['staff', 'support'] },
  sessionId: uuid,
  companyId: uuid,
  companyName: string,
  companyActive: boolean,
  userActive: boolean,
  issuer: string,
  subject: string,
  displayName: string,
  authorizationRevision: string,
  grants,
  assignedBranches: branches,
  companyBranches: branches,
  supportSessionId: nullable(uuid),
  supportExpiresAt: nullable({ type: 'string', format: 'date-time' }),
});
const user = object({
  id: uuid,
  name: string,
  username: string,
  roleId: uuid,
  roleName: string,
  active: boolean,
  version: integer,
  identityState: { type: 'string', enum: ['pending', 'failed', 'ready'] },
  identityError: nullable(string),
  branchIds: array(uuid),
  exceptions,
});
export const accessResponseSchemas = {
  login: object({ url: { type: 'string', format: 'uri' } }),
  session: object({
    principalId: uuid,
    csrfToken: string,
    kind: { type: 'string', enum: ['staff', 'support'] },
    companyId: nullable(uuid),
  }),
  context: object({
    context,
    capabilities: array(
      object({
        id: capability,
        title: string,
        route: string,
        policy: { type: 'string', enum: ['company', 'assigned', 'tracking', 'treasury', 'wallet'] },
        implemented: boolean,
      }),
    ),
  }),
  users: object({
    items: array(user),
    total: integer,
    page: integer,
    limit: integer,
    roles: array(role),
    branches,
    authorizationRevision: string,
  }),
  roles: object({ items: array(role), authorizationRevision: string }),
  support: object({
    companies: array(
      object({ id: uuid, code: string, name: string, active: boolean, version: integer }),
    ),
  }),
  supportBranches: object({
    items: array(object({ id: uuid, name: string, active: boolean, version: integer })),
  }),
  audit: object({
    items: array(
      object({
        id: uuid,
        actor: string,
        action: string,
        entityId: uuid,
        beforeVersion: nullable(integer),
        afterVersion: nullable(integer),
        at: { type: 'string', format: 'date-time' },
      }),
    ),
  }),
  scope: object({ branchIds: array(uuid), authorizationRevision: string }),
  command: commandResultSchema,
  logout: object({ url: string }),
  error: accessErrorSchema,
};
const ajv = new AjvModule.default({ strict: true, allErrors: true });
formatsModule.default(ajv);
export const validateAccessResponse = Object.fromEntries(
  Object.entries(accessResponseSchemas).map(([key, schema]) => [key, ajv.compile(schema)]),
);
export function accessResponseKey(path: string): string {
  const url = path.split('?')[0]!;
  return url.startsWith('/commands')
    ? 'command'
    : url.startsWith('/scope/')
      ? 'scope'
      : url.startsWith('/users')
        ? 'users'
        : url === '/support/branches'
          ? 'supportBranches'
          : url === '/global-signout'
            ? 'logout'
            : url.slice(1);
}
const routeSchemas: Record<string, keyof typeof accessResponseSchemas> = {
  session: 'session',
  context: 'context',
  users: 'users',
  'users/{id}': 'users',
  roles: 'roles',
  support: 'support',
  'support/branches': 'supportBranches',
  audit: 'audit',
  'scope/{capability}': 'scope',
  'commands/{id}': 'command',
  'commands/{id}/download': 'command',
};
export const accessReadPaths = Object.fromEntries(
  Object.entries(routeSchemas).map(([path, schema]) => [
    '/api/v1/access/' + path,
    {
      get: {
        summary: 'Server-authorized ' + path,
        security: [{ erpSession: [] }],
        parameters: [
          ...(path === 'users'
            ? [
                {
                  in: 'query',
                  name: 'search',
                  required: false,
                  schema: { type: 'string', maxLength: 180 },
                  description: 'Literal name/username substring; wildcard characters are escaped.',
                },
                {
                  in: 'query',
                  name: 'page',
                  required: false,
                  schema: { type: 'integer', minimum: 0, maximum: 99999, default: 0 },
                },
                {
                  in: 'query',
                  name: 'limit',
                  required: false,
                  schema: { type: 'integer', enum: [25, 50, 100], default: 25 },
                },
              ]
            : []),
          ...(path.includes('{id}')
            ? [{ in: 'path', name: 'id', required: true, schema: uuid }]
            : []),
          ...(path.includes('{capability}')
            ? [{ in: 'path', name: 'capability', required: true, schema: capability }]
            : []),
        ],
        responses: {
          '200': {
            description: 'Current authorized response',
            content: { 'application/json': { schema: accessResponseSchemas[schema] } },
          },
          '401': {
            description: 'Reauthentication required',
            content: { 'application/json': { schema: accessErrorSchema } },
          },
          '403': {
            description: 'Current authority denies access',
            content: { 'application/json': { schema: accessErrorSchema } },
          },
          ...Object.fromEntries(
            ['400', '404', '409', '500'].map((status) => [
              status,
              {
                description:
                  'Closed typed validation, lookup, ambiguous command identity or server failure',
                content: { 'application/json': { schema: accessErrorSchema } },
              },
            ]),
          ),
        },
      },
    },
  ]),
);
export const accessAuthPaths = {
  '/api/v1/access/callback': {
    get: {
      summary:
        'OIDC callback: single-use state, browser binding, PKCE, nonce, issuer, audience and signature validation',
      parameters: ['state', 'code', 'iss', 'error', 'session_state'].map((name) => ({
        in: 'query',
        name,
        required: false,
        schema: string,
      })),
      responses: {
        '302': { description: 'Authorized local return route or generic login failure' },
      },
    },
  },
  ...Object.fromEntries(
    ['logout', 'global-signout'].map((path) => [
      '/api/v1/access/' + path,
      {
        post: {
          summary:
            path === 'logout'
              ? 'End ERP session only'
              : 'Explicit global identity signout; no ID token in browser URL',
          security: [{ erpSession: [], csrfToken: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: object({}) } } },
          responses: {
            '200': {
              description: 'Redirect target',
              content: { 'application/json': { schema: accessResponseSchemas.logout } },
            },
            '401': {
              description: 'Session expired',
              content: { 'application/json': { schema: accessErrorSchema } },
            },
            '403': {
              description: 'CSRF or scope denied',
              content: { 'application/json': { schema: accessErrorSchema } },
            },
          },
        },
      },
    ]),
  ),
};
