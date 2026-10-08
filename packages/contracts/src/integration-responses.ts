import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
const s = { type: 'string' },
  n = { type: 'integer', minimum: 0 },
  b = { type: 'boolean' },
  u = { type: 'string', format: 'uuid' },
  t = { type: 'string', format: 'date-time' },
  revision = { type: 'string', pattern: '^[0-9]+$' };
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const list = (items: object) => ({ type: 'array', items });
const closed = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const sourceConfiguration = closed({
  identity: closed({
    mode: { const: 'service-operation' },
    tenantId: u,
    integrationId: u,
    actorId: { type: 'null' },
  }),
  issuer: s,
  supportedVersions: list(s),
  allowedOperations: list(s),
  humanDelegation: { const: false },
});
const choice = { id: u, name: s, active: b };
const command = {
  actionId: u,
  operationId: s,
  state: {
    enum: [
      'pending',
      'sending',
      'accepted',
      'rejected',
      'review-required',
      'unknown',
      'retryable',
      'configuration-blocked',
    ],
  },
  sourceRevision: nullable(revision),
  lastError: nullable(s),
  createdAt: t,
  authority: { enum: ['service', 'operator'] },
  entity: nullable(s),
  nativeId: nullable(u),
  acceptedRevision: nullable(revision),
  attempts: n,
};
const event = {
  eventId: u,
  eventType: s,
  aggregateType: s,
  aggregateId: u,
  sequence: revision,
  applicationState: { enum: ['pending', 'applied'] },
  pendingReason: s,
  receivedAt: t,
};
export const integrationReplySchema = closed({
  schemaVersion: { const: 1 },
  commandId: u,
  sourceId: u,
  actionId: nullable(u),
  state: { const: 'pending' },
});
export const integrationViewSchema = closed({
  source: nullable(
    closed({
      id: u,
      tenantId: u,
      integrationId: u,
      baseUrl: s,
      issuer: s,
      enabled: b,
      configuration: nullable(sourceConfiguration),
      lastError: nullable(s),
    }),
  ),
  connections: list(closed({ selector: s, baseUrl: s, issuer: s })),
  catalog: closed({
    branches: list(closed(choice)),
    roles: list(closed(choice)),
    users: list(
      closed({
        ...choice,
        roleId: u,
        subject: nullable(s),
        issuer: nullable(s),
        branchIds: list(u),
      }),
    ),
    drivers: list(closed({ ...choice, branchId: u })),
  }),
  bindings: list(
    closed({
      entity: s,
      nativeId: u,
      externalId: s,
      resourceId: nullable(u),
      version: n,
      submittedRevision: revision,
      acceptedRevision: revision,
      issuerStatus: s,
      enabled: nullable(b),
      checkedAt: nullable(t),
    }),
  ),
  commands: list(closed({ ...command, version: nullable(n), leaseUntil: nullable(t) })),
  events: list(closed(event)),
  checkpoints: list(
    closed({
      aggregateType: s,
      aggregateId: u,
      receivedThrough: revision,
      receivedHigh: revision,
      appliedThrough: revision,
      historyComplete: b,
    }),
  ),
  keys: list(closed({ keyId: s, activeFrom: t, verifyUntil: nullable(t) })),
  page: { type: 'integer', minimum: 1 },
});
export const integrationCommandDetailSchema = closed({
  ...command,
  commandId: u,
  requestHash: s,
  httpStatus: nullable(n),
  retention: nullable({ enum: ['full', 'compacted'] }),
  receiptId: nullable(u),
});
export const integrationEventDetailSchema = closed({
  ...event,
  bodyHash: s,
  appliedAt: nullable(t),
  keyId: nullable(s),
});
export const integrationRefreshSchema = closed({ state: { const: 'refreshed' }, identities: n });
export const integrationErrorSchema = closed(
  { code: s, messageKey: s, correlationId: u, commandId: u, currentVersion: n },
  ['code', 'messageKey', 'correlationId'],
);
const Ajv = AjvModule.default ?? AjvModule,
  formats = formatsModule.default ?? formatsModule,
  ajv = new Ajv({ strict: false });
formats(ajv);
export const validateIntegrationReply = ajv.compile(integrationReplySchema);
export const validateIntegrationView = ajv.compile(integrationViewSchema);
export const validateIntegrationCommandDetail = ajv.compile(integrationCommandDetailSchema);
export const validateIntegrationEventDetail = ajv.compile(integrationEventDetailSchema);
export const validateIntegrationRefresh = ajv.compile(integrationRefreshSchema);
export const validateIntegrationError = ajv.compile(integrationErrorSchema);
export const integrationResponse = (description: string, schema: object) => ({
  description,
  content: { 'application/json': { schema } },
});
