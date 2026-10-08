import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import { aggregateTypes, type AggregateType } from './tawsel/recovery.js';
import { canonicalSchemas } from './tawsel/registry.js';
export interface RecoveryCommand {
  schemaVersion: 1;
  companyId: string;
  commandId: string;
  type:
    | 'recovery.replay'
    | 'recovery.reconcile'
    | 'recovery.report'
    | 'recovery.retry'
    | 'recovery.retryDelivery';
  aggregateType?: AggregateType;
  aggregateId?: string;
  jobId?: string;
  eventId?: string;
}
const uuid = { type: 'string', format: 'uuid' };
const shared = { schemaVersion: { const: 1 }, companyId: uuid, commandId: uuid };
const variant = (type: string, fields: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  properties: { ...shared, type: { const: type }, ...fields },
  required: [...Object.keys(shared), 'type', ...Object.keys(fields)],
});
const aggregate = { aggregateType: { enum: aggregateTypes }, aggregateId: uuid };
export const recoveryCommandSchema = {
  oneOf: [
    ...['recovery.replay', 'recovery.reconcile', 'recovery.report'].map((t) =>
      variant(t, aggregate),
    ),
    variant('recovery.retry', { jobId: uuid }),
    variant('recovery.retryDelivery', { eventId: uuid }),
  ],
};
export interface RecoveryStream {
  aggregateType: AggregateType;
  aggregateId: string;
  revision: string;
  receivedThrough: string;
  receivedHigh: string;
  appliedThrough: string;
  snapshotThrough: string;
  projectedThrough: string;
  historyComplete: boolean;
  rebuildRequired: boolean;
  updatedAt: string;
  missingFrom: string | null;
  missingTo: string | null;
  pendingReason: string | null;
}
export interface RecoveryJob {
  id: string;
  aggregateType: AggregateType;
  aggregateId: string;
  kind: 'replay' | 'reconcile';
  requestedAfter: string;
  nextAfter: string;
  pageCount: number;
  state: string;
  failureClass: string | null;
  lastError: string | null;
  httpStatus: number | null;
  attempts: number;
  createdAt: string;
  lastAttemptAt: string | null;
  completedAt: string | null;
}
export interface RecoveryView {
  streams: RecoveryStream[];
  jobs: RecoveryJob[];
  page: number;
  hasMore: boolean;
}
export interface RecoveryReply {
  schemaVersion: 1;
  commandId: string;
  jobId: string | null;
  actionId: string | null;
  state: 'pending';
}
const nullable = (s: object) => ({ anyOf: [s, { type: 'null' }] });
const text = { type: 'string' },
  counter = { type: 'string', pattern: '^[0-9]+$' },
  date = { type: 'string', format: 'date-time' };
const closed = (p: Record<string, unknown>) => ({
  type: 'object',
  properties: p,
  required: Object.keys(p),
  additionalProperties: false,
});
export const recoveryStreamSchema = closed({
  aggregateType: { enum: aggregateTypes },
  aggregateId: uuid,
  revision: counter,
  receivedThrough: counter,
  receivedHigh: counter,
  appliedThrough: counter,
  snapshotThrough: counter,
  projectedThrough: counter,
  historyComplete: { type: 'boolean' },
  rebuildRequired: { type: 'boolean' },
  updatedAt: date,
  missingFrom: nullable(counter),
  missingTo: nullable(counter),
  pendingReason: nullable(text),
});
export const recoveryJobSchema = closed({
  id: uuid,
  aggregateType: { enum: aggregateTypes },
  aggregateId: uuid,
  kind: { enum: ['replay', 'reconcile'] },
  requestedAfter: counter,
  nextAfter: counter,
  pageCount: { type: 'integer', minimum: 0, maximum: 100 },
  state: {
    enum: [
      'pending',
      'running',
      'complete',
      'retryable',
      'expired',
      'configuration-blocked',
      'review-required',
    ],
  },
  failureClass: nullable(text),
  lastError: nullable(text),
  httpStatus: nullable({ type: 'integer', minimum: 100, maximum: 599 }),
  attempts: { type: 'integer', minimum: 0 },
  createdAt: date,
  lastAttemptAt: nullable(date),
  completedAt: nullable(date),
});
export const recoveryViewSchema = closed({
  streams: { type: 'array', maxItems: 100, items: recoveryStreamSchema },
  jobs: { type: 'array', maxItems: 25, items: recoveryJobSchema },
  page: { type: 'integer', minimum: 1 },
  hasMore: { type: 'boolean' },
});
export const recoveryReplySchema = closed({
  schemaVersion: { const: 1 },
  commandId: uuid,
  jobId: nullable(uuid),
  actionId: nullable(uuid),
  state: { const: 'pending' },
});
export interface RecoveryDetail {
  job: RecoveryJob;
  stream: RecoveryStream;
  relatedShipments: { id: string; reference: string; cycleId: string; branchId: string }[];
  missingRanges: { from: string; to: string }[];
  moreMissingRanges: boolean;
  evidence: {
    id: string;
    kind: string;
    requestedAfter: string;
    throughSequence: string;
    bodyHash: string;
    baseline: string;
    schemaHash: string;
    retrievedAt: string;
  }[];
  current: {
    throughSequence: string;
    history: 'current-state-only';
    capturedAt: string;
    taskState: string | null;
    effectiveOutcomes: { attemptId: string; outcome: string; revision: number }[];
    returnBalances: {
      itemId: string;
      sourceLineId: string;
      received: number;
      lost: number;
      damaged: number;
      unresolved: number;
    }[];
  } | null;
}
export const recoveryDetailSchema = closed({
  job: recoveryJobSchema,
  stream: recoveryStreamSchema,
  relatedShipments: {
    type: 'array',
    items: closed({
      id: uuid,
      reference: { type: 'string', pattern: '^[0-9]+$' },
      cycleId: uuid,
      branchId: uuid,
    }),
  },
  missingRanges: { type: 'array', maxItems: 100, items: closed({ from: counter, to: counter }) },
  moreMissingRanges: { type: 'boolean' },
  evidence: {
    type: 'array',
    maxItems: 100,
    items: closed({
      id: uuid,
      kind: { enum: ['replay', 'reconcile'] },
      requestedAfter: counter,
      throughSequence: counter,
      bodyHash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      baseline: text,
      schemaHash: text,
      retrievedAt: date,
    }),
  },
  current: nullable(
    closed({
      throughSequence: counter,
      history: { const: 'current-state-only' },
      capturedAt: date,
      taskState: nullable({ enum: ['unassigned', 'prepared', 'held', 'withdrawn'] }),
      effectiveOutcomes: {
        type: 'array',
        items: closed({
          attemptId: uuid,
          outcome: text,
          revision: { type: 'integer', minimum: 0 },
        }),
      },
      returnBalances: {
        type: 'array',
        items: closed({
          itemId: uuid,
          sourceLineId: text,
          received: { type: 'integer', minimum: 0 },
          lost: { type: 'integer', minimum: 0 },
          damaged: { type: 'integer', minimum: 0 },
          unresolved: { type: 'integer', minimum: 0 },
        }),
      },
    }),
  ),
});
const Ajv = AjvModule.default ?? AjvModule,
  formats = formatsModule.default ?? formatsModule;
const ajv = new Ajv({ strict: false });
formats(ajv);
export const validateRecoveryCommand = ajv.compile<RecoveryCommand>(recoveryCommandSchema);
export const validateRecoveryView = ajv.compile<RecoveryView>(recoveryViewSchema);
export const validateRecoveryReply = ajv.compile<RecoveryReply>(recoveryReplySchema);
export const validateRecoveryDetail = ajv.compile<RecoveryDetail>(recoveryDetailSchema);
const response = (schema: unknown) => ({
  '200': {
    description: 'Authorized current recovery state',
    content: { 'application/json': { schema } },
  },
});
// Inline only selected pinned definitions for standalone OpenAPI. These schema
// identifiers resolve in the local registry, never through the network.
function pinnedSchema(reference: string): unknown {
  const walk = (value: unknown, base: string): unknown => {
    if (Array.isArray(value)) return value.map((v) => walk(v, base));
    if (!value || typeof value !== 'object') return value;
    const object = value as Record<string, unknown>;
    if (typeof object.$ref === 'string') {
      const url = new URL(object.$ref, base),
        fragment = url.hash;
      url.hash = '';
      const schema = canonicalSchemas.find((s) => s.$id === url.toString());
      if (!schema) throw Error('MISSING_PINNED_OPENAPI_SCHEMA');
      let selected: unknown = schema;
      for (const part of fragment.slice(2).split('/')) {
        if (part)
          selected = (selected as Record<string, unknown>)[
            part.replaceAll('~1', '/').replaceAll('~0', '~')
          ];
      }
      if (!selected) throw Error('MISSING_PINNED_OPENAPI_DEFINITION');
      return walk(selected, url.toString());
    }
    return Object.fromEntries(Object.entries(object).map(([k, v]) => [k, walk(v, base)]));
  };
  return walk({ $ref: reference }, 'https://schemas.tawsel.invalid/v1/');
}
const companyParameter = { name: 'companyId', in: 'query', required: true, schema: uuid };
const limitParameter = {
  name: 'limit',
  in: 'query',
  schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
};
const idParameter = { name: 'id', in: 'path', required: true, schema: uuid };
export const recoveryPaths = {
  '/api/v1/integration/recovery': {
    get: { operationId: 'erp.integration.recovery', responses: response(recoveryViewSchema) },
  },
  '/api/v1/integration/recovery/jobs/{id}': {
    get: {
      operationId: 'erp.integration.recoveryDetail',
      responses: response(recoveryDetailSchema),
    },
  },
  '/api/v1/integration/recovery/commands': {
    post: {
      operationId: 'erp.integration.recoveryCommand',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: recoveryCommandSchema } },
      },
      responses: {
        '202': {
          description: 'Durable recovery intent',
          content: { 'application/json': { schema: recoveryReplySchema } },
        },
      },
    },
  },
  '/api/v1/integration/recovery/results/{id}': {
    get: {
      operationId: 'erp.integration.recoveryResult',
      responses: response(recoveryReplySchema),
    },
  },
  '/api/v1/integration/deliveries': {
    get: {
      operationId: 'erp.integration.deliveryStatus',
      description:
        'Current ERP integration permission and authority over every company branch are required. Sender receipt is distinct from ERP application.',
      parameters: [companyParameter, limitParameter, { name: 'cursor', in: 'query', schema: uuid }],
      responses: response(pinnedSchema('outbox.schema.json#/$defs/Queue')),
    },
  },
  '/api/v1/integration/deliveries/{id}': {
    get: {
      operationId: 'erp.integration.deliveryDetail',
      description:
        'Attempts use limit 1–100 and the returned nextAttemptBefore as beforeAttempt. Projection status remains unknown.',
      parameters: [
        companyParameter,
        idParameter,
        limitParameter,
        { name: 'beforeAttempt', in: 'query', schema: { type: 'integer', minimum: 0 } },
      ],
      responses: response(pinnedSchema('outbox.schema.json#/$defs/Detail')),
    },
  },
  '/api/v1/integration/applied-checkpoint': {
    get: {
      operationId: 'erp.integration.reportedCheckpoint',
      description:
        'Inspect the source-retained receiver report for a known authorized stream. This is receiver-reported evidence.',
      parameters: [
        companyParameter,
        { name: 'aggregateType', in: 'query', required: true, schema: { enum: aggregateTypes } },
        { name: 'aggregateId', in: 'query', required: true, schema: uuid },
      ],
      responses: response(pinnedSchema('consumer.schema.json#/$defs/ReportRead')),
    },
  },
};
