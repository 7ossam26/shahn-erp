import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import {
  integrationErrorSchema,
  integrationResponse,
  integrationSourceConfigurationSchema,
} from './integration-responses.js';
const u = { type: 'string', format: 'uuid' },
  s = { type: 'string' },
  t = { type: 'string', format: 'date-time' };
const closed = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const metadata = closed({
  packageVersion: { const: '1.0.0' },
  tenantId: u,
  integrationId: u,
  erpCompanyId: u,
  sourceExternalId: s,
  issuer: s,
  apiUrl: s,
  callbackUrl: s,
  companyCode: s,
  sourceCommit: s,
  contractSha256: s,
  interopVersion: { enum: ['1.0.0', '2.0.0'] },
  capabilities: { type: 'array', items: s },
  enrollmentMode: { const: 'operator-assisted-exact-subjects' },
  bootstrapActionId: u,
});
const safeImport = closed({
  importId: u,
  metadata,
  credentialExpiresAt: t,
  state: { enum: ['source-verified', 'imported-awaiting-verification'] },
  signing: { const: 'awaiting-signed-callback' },
});
const confirmed = closed({
  importId: u,
  commandId: u,
  sourceId: u,
  configurationRevision: { type: 'integer', minimum: 1 },
  state: { const: 'connected-awaiting-signed-callback' },
});
const enrollment = closed({
  requestVersion: { const: '1.0.0' },
  state: { const: 'pending-operator-reservation' },
  tenantId: u,
  integrationId: u,
  erpCompanyId: u,
  issuer: s,
  subject: s,
  erpPrincipalId: u,
  erpCorrelationId: u,
});
const requests = { type: 'array', items: enrollment, minItems: 1, maxItems: 100 };
const confirmation = closed({
  schemaVersion: { const: 1 },
  companyId: u,
  commandId: u,
  type: { const: 'integration.confirmConnection' },
  importId: u,
});
const status = closed({
  state: { enum: ['configured', 'setup-required'] },
  connection: {
    anyOf: [
      closed({
        revision: { type: 'integer', minimum: 1 },
        metadata,
        key_version: s,
        credentialExpiresAt: t,
        configuration: integrationSourceConfigurationSchema,
        configuration_checked_at: t,
        enabled: { type: 'boolean' },
        last_error: { anyOf: [s, { type: 'null' }] },
      }),
      { type: 'null' },
    ],
  },
  receipt: closed({
    lastSignedReceipt: { anyOf: [t, { type: 'null' }] },
    applied: { type: 'integer', minimum: 0 },
  }),
  grantsRequired: { type: 'array', items: s },
  enrollment: { const: 'operator-assisted-exact-subjects' },
  issuerIndependent: { const: true },
});
export const connectionSetupRequests = {
  import: closed({ companyId: u, importId: u, origin: s, package: { type: 'object' } }),
  verify: closed({ companyId: u, importId: u }),
  confirm: confirmation,
  enrollment: closed({
    schemaVersion: { const: 1 },
    companyId: u,
    commandId: u,
    type: { const: 'integration.requestEnrollment' },
    principalIds: { type: 'array', items: u, minItems: 1, maxItems: 100, uniqueItems: true },
  }),
  'enrollment-result': closed({ companyId: u, requestId: u, result: { type: 'object' } }),
};
export const connectionSetupResponses = {
  status: {
    anyOf: [
      status,
      safeImport,
      closed({ state: { const: 'operator-installation-required' }, configured: { const: false } }),
    ],
  },
  import: safeImport,
  verify: safeImport,
  confirm: confirmed,
  result: { anyOf: [confirmed, integrationErrorSchema] },
  enrollment: closed({
    requestId: u,
    state: { const: 'awaiting-tawsel-identity-authorization' },
    requests,
  }),
  'enrollment-result': closed({
    requestId: u,
    state: { const: 'operator-result-recorded-awaiting-user-provision' },
    actionId: u,
  }),
  'enrollment-status': closed({
    items: {
      type: 'array',
      items: closed({
        requestId: u,
        requests,
        actionId: { anyOf: [u, { type: 'null' }] },
        state: {
          enum: [
            'awaiting-tawsel-identity-authorization',
            'operator-result-recorded-awaiting-user-provision',
          ],
        },
      }),
    },
  }),
};
const Ajv = AjvModule.default ?? AjvModule,
  formats = formatsModule.default ?? formatsModule,
  ajv = new Ajv({ strict: false });
formats(ajv);
export const validateConnectionSetupRequests = Object.fromEntries(
  Object.entries(connectionSetupRequests).map(([k, v]) => [k, ajv.compile(v)]),
);
export const validateConnectionSetupResponses = Object.fromEntries(
  Object.entries(connectionSetupResponses).map(([k, v]) => [k, ajv.compile(v)]),
);
export const connectionSetupPaths = Object.fromEntries(
  [
    'status',
    'import',
    'verify',
    'confirm',
    'result',
    'enrollment',
    'enrollment-result',
    'enrollment-status',
    'enrollment-recover',
  ].map((operation) => {
    const method = ['status', 'result', 'enrollment-status', 'enrollment-recover'].includes(
      operation,
    )
      ? 'get'
      : 'post';
    return [
      '/api/v1/integration/connection/' + operation,
      {
        [method]: {
          operationId: 'erp.connection.' + operation,
          summary:
            'Protected MFA selected-company support connection administration; no raw secret response',
          ...(method === 'post'
            ? {
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema:
                        connectionSetupRequests[operation as keyof typeof connectionSetupRequests],
                    },
                  },
                },
              }
            : {
                parameters: [
                  { in: 'query', name: 'companyId', required: true, schema: u },
                  ...(['result', 'enrollment-recover'].includes(operation)
                    ? [{ in: 'query', name: 'commandId', required: true, schema: u }]
                    : []),
                ],
              }),
          responses: {
            '200': integrationResponse(
              'Safe retained state; durable receipt and application remain distinct',
              connectionSetupResponses[operation as keyof typeof connectionSetupResponses] ??
                closed({ state: s, configured: { type: 'boolean' } }),
            ),
            '400': integrationResponse(
              'Invalid closed or canonical package/result',
              integrationErrorSchema,
            ),
            '403': integrationResponse(
              'Current support authority or CSRF denied',
              integrationErrorSchema,
            ),
            '409': integrationResponse(
              'Original identity or remote setup requires reconciliation',
              integrationErrorSchema,
            ),
            '503': integrationResponse(
              'Protected key or bounded remote IO unavailable',
              integrationErrorSchema,
            ),
          },
        },
      },
    ];
  }),
);
