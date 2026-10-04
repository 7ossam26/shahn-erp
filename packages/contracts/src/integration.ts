import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import {
  integrationReplySchema,
  integrationViewSchema,
  integrationCommandDetailSchema,
  integrationEventDetailSchema,
  integrationRefreshSchema,
  integrationErrorSchema,
  integrationResponse as response,
} from './integration-responses.js';
export * from './integration-responses.js';
export interface IntegrationCommand {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
  type: 'integration.setup' | 'integration.queue' | 'integration.retry';
  selector?: string;
  operationId?: string;
  nativeId?: string;
  expectedVersion?: number;
  payload?: Record<string, unknown>;
  actionId?: string;
}
export interface IntegrationNativeChoice {
  id: string;
  name: string;
  active: boolean;
  roleId?: string;
  subject?: string | null;
  issuer?: string | null;
  branchIds?: string[];
  branchId?: string;
}
export interface IntegrationBindingView {
  entity: string;
  nativeId: string;
  externalId: string;
  resourceId: string | null;
  version: number;
  submittedRevision: string;
  acceptedRevision: string;
  issuerStatus: string;
  enabled: boolean | null;
  checkedAt: string | null;
}
export interface IntegrationCommandView {
  actionId: string;
  operationId: string;
  state: string;
  sourceRevision: string | null;
  lastError: string | null;
  createdAt: string;
  authority: string;
  entity: string | null;
  nativeId: string | null;
  version: number | null;
  acceptedRevision: string | null;
  attempts: number;
  leaseUntil: string | null;
}
export interface IntegrationEventView {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  sequence: string;
  applicationState: string;
  pendingReason: string;
  receivedAt: string;
}
export interface IntegrationView {
  source: {
    id: string;
    tenantId: string;
    integrationId: string;
    baseUrl: string;
    issuer: string;
    enabled: boolean;
    configuration: unknown;
    lastError: string | null;
  } | null;
  connections: { selector: string; baseUrl: string; issuer: string }[];
  catalog: {
    branches: IntegrationNativeChoice[];
    roles: IntegrationNativeChoice[];
    users: IntegrationNativeChoice[];
    drivers: IntegrationNativeChoice[];
  };
  bindings: IntegrationBindingView[];
  commands: IntegrationCommandView[];
  events: IntegrationEventView[];
  checkpoints: {
    aggregateType: string;
    aggregateId: string;
    receivedThrough: string;
    receivedHigh: string;
    appliedThrough: string;
    historyComplete: boolean;
  }[];
  keys: { keyId: string; activeFrom: string; verifyUntil: string | null }[];
  page: number;
}
const uuid = { type: 'string', format: 'uuid' };
const shared = { schemaVersion: { const: 1 }, commandId: uuid, companyId: uuid };
const variant = (type: string, fields: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  properties: { ...shared, type: { const: type }, ...fields },
  required: [...Object.keys(shared), 'type', ...Object.keys(fields)],
});
export const integrationCommandSchema = {
  oneOf: [
    variant('integration.setup', {
      selector: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,64}$' },
    }),
    variant('integration.queue', {
      operationId: { type: 'string', maxLength: 128 },
      nativeId: uuid,
      expectedVersion: { type: 'integer', minimum: 0, maximum: 2147483646 },
      payload: { type: 'object' },
    }),
    variant('integration.retry', { actionId: uuid }),
  ],
};
const Ajv = AjvModule.default ?? AjvModule,
  formats = formatsModule.default ?? formatsModule;
const ajv = new Ajv({ strict: false });
formats(ajv);
export const validateIntegrationCommand = ajv.compile<IntegrationCommand>(integrationCommandSchema);
export const integrationPaths = {
  '/api/v1/integration/commands': {
    post: {
      operationId: 'erp.integration.command',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: integrationCommandSchema } },
      },
      responses: {
        '202': response('Durable local intent; remote acceptance pending', integrationReplySchema),
        '400': response('Invalid command', integrationErrorSchema),
        '403': response('Current access/CSRF denied', integrationErrorSchema),
        '409': response('Revision or immutable intent conflict', integrationErrorSchema),
      },
    },
  },
  '/api/v1/integration': {
    get: {
      operationId: 'erp.integration.status',
      responses: {
        '200': response(
          'Safe connection, identities, outgoing and received/pending state',
          integrationViewSchema,
        ),
        '403': response('Current scope denied', integrationErrorSchema),
      },
    },
  },
  '/api/v1/integration/commands/{id}': {
    get: {
      operationId: 'erp.integration.commandDetail',
      responses: {
        '200': response('Safe retained action metadata', integrationCommandDetailSchema),
      },
    },
  },
  '/api/v1/integration/events/{id}': {
    get: {
      operationId: 'erp.integration.eventDetail',
      responses: {
        '200': response('Receipt and application separately', integrationEventDetailSchema),
      },
    },
  },
  '/api/v1/integration/results/{id}': {
    get: {
      operationId: 'erp.integration.recoverNative',
      responses: {
        '202': response('Same native intent', integrationReplySchema),
        '409': response('Retained rejection', integrationErrorSchema),
      },
    },
  },
  '/api/v1/integration/refresh': {
    post: {
      operationId: 'erp.integration.refresh',
      responses: {
        '200': response(
          'Authoritative configuration and identity status',
          integrationRefreshSchema,
        ),
      },
    },
  },
  '/api/v1/consumer/events': {
    post: {
      operationId: 'consumer.receiveSignedEvent',
      responses: {
        '200': { description: 'Committed receipt acknowledgement only' },
        '401': { description: 'Invalid exact-byte signature' },
        '409': { description: 'Event identity or sequence conflict' },
        '413': { description: 'Body exceeds 2 MiB' },
        '422': { description: 'Unsupported closed sender schema' },
        '503': { description: 'Receipt unavailable' },
      },
    },
  },
};
