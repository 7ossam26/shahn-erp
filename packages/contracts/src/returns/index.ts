import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import type { ReturnItem } from '../tawsel/returns.js';
export type ReturnCondition = 'sound' | 'damaged' | 'uncertain';
export type ReceiptSelection = {
  itemId: string;
  expectedRevision: number;
  quantity: number;
  condition: ReturnCondition;
  inspection: 'counted-pieces' | 'parcel-exterior';
  suspectedShortage: boolean;
};
export type ReceiptAllocation = {
  receiptLineId: string;
  expectedVersion: number;
  quantity: number;
};
export type ReturnCommand = {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
  branchId: string;
} & (
  | {
      type: 'return.receive';
      requestId: string;
      actualReceipt: true;
      observedAt: string;
      items: ReceiptSelection[];
    }
  | {
      type: 'return.redispatch';
      previousCycleId: string;
      driverId: string;
      allocations: ReceiptAllocation[];
    }
  | {
      type: 'return.brandHandover';
      brandId: string;
      recipientName: string;
      actualAt: string;
      actualHandover: true;
      allocations: ReceiptAllocation[];
    }
  | { type: 'return.dispose'; requestId: string; decisionId: string }
);
export interface ReturnResult {
  commandId: string;
  entityId: string;
  branchId: string;
  actionId: string | null;
  dispatchIntentId: string | null;
}
export interface ReturnLineView {
  id: string;
  shipmentId: string;
  cycleId: string;
  reference: string;
  description: string;
  brandId: string;
  brandName: string;
  current: ReturnItem;
  inspection: 'counted-pieces' | 'parcel-exterior';
  observations: {
    id: string;
    state: string;
    quantity: number;
    condition: ReturnCondition | null;
    observedAt: string;
    lastError: string | null;
  }[];
  receipts: {
    id: string;
    quantity: number;
    consumed: number;
    condition: ReturnCondition;
    version: number;
    receivedAt: string;
  }[];
}
export interface ReturnRequestView {
  id: string;
  branchId: string;
  branchName: string;
  driverId: string;
  driverName: string;
  requestedAt: string;
  checkedAt: string;
  dispositions: {
    id: string;
    kind: 'lost' | 'damaged';
    incidentId: string;
    items: { itemId: string; expectedRevision: number; quantity: number }[];
  }[];
  items: ReturnLineView[];
}
export interface ReturnDesk {
  branches: { id: string; name: string }[];
  drivers: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  items: ReturnRequestView[];
  total: number;
  page: number;
}
export interface ReturnFilter {
  branchId: string;
  driverId: string;
  brands: string[];
  search: string;
  state: 'all' | 'unresolved' | 'received' | 'pending' | 'settled';
  condition: 'all' | ReturnCondition;
  dateBasis: 'request' | 'receipt';
  from: string | null;
  to: string | null;
  page: number;
}
const uuid = { type: 'string', format: 'uuid' },
  whole = { type: 'integer', minimum: 1, maximum: 1000000 },
  rev = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const condition = { type: 'string', enum: ['sound', 'damaged', 'uncertain'] };
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const array = (items: unknown, minItems = 0) => ({ type: 'array', items, minItems });
const allocation = obj({
  receiptLineId: uuid,
  expectedVersion: { ...rev, minimum: 1 },
  quantity: whole,
});
const common = { schemaVersion: { const: 1 }, commandId: uuid, companyId: uuid, branchId: uuid };
export const returnCommandSchema = {
  oneOf: [
    obj({
      ...common,
      type: { const: 'return.receive' },
      requestId: uuid,
      actualReceipt: { const: true },
      observedAt: { type: 'string', format: 'date-time' },
      items: array(
        obj({
          itemId: uuid,
          expectedRevision: rev,
          quantity: whole,
          condition,
          inspection: { enum: ['counted-pieces', 'parcel-exterior'] },
          suspectedShortage: { type: 'boolean' },
        }),
        1,
      ),
    }),
    obj({
      ...common,
      type: { const: 'return.redispatch' },
      previousCycleId: uuid,
      driverId: uuid,
      allocations: array(allocation, 1),
    }),
    obj({
      ...common,
      type: { const: 'return.brandHandover' },
      brandId: uuid,
      recipientName: { type: 'string', minLength: 1, maxLength: 200, pattern: '\\S' },
      actualAt: { type: 'string', format: 'date-time' },
      actualHandover: { const: true },
      allocations: array(allocation, 1),
    }),
    obj({ ...common, type: { const: 'return.dispose' }, requestId: uuid, decisionId: uuid }),
  ],
};
export const returnFilterSchema = obj({
  branchId: uuid,
  driverId: uuid,
  brands: array(uuid),
  search: { type: 'string', maxLength: 200 },
  state: { enum: ['all', 'unresolved', 'received', 'pending', 'settled'] },
  condition: { enum: ['all', 'sound', 'damaged', 'uncertain'] },
  dateBasis: { enum: ['request', 'receipt'] },
  from: { type: ['string', 'null'], format: 'date' },
  to: { type: ['string', 'null'], format: 'date' },
  page: { type: 'integer', minimum: 1, maximum: 1000000 },
});
const ajv = new AjvModule.default({ allErrors: true, strict: false });
formatsModule.default(ajv);
export const validateReturnNativeCommand = ajv.compile<ReturnCommand>(returnCommandSchema);
export const validateReturnFilter = ajv.compile<ReturnFilter>(returnFilterSchema);
export const returnResultSchema = obj({
  commandId: uuid,
  entityId: uuid,
  branchId: uuid,
  actionId: { ...uuid, type: ['string', 'null'] },
  dispatchIntentId: { ...uuid, type: ['string', 'null'] },
});
const str = { type: 'string' },
  date = { type: 'string', format: 'date-time' },
  count = { type: 'integer', minimum: 0 },
  named = obj({ id: uuid, name: str });
const current = obj({
  itemId: uuid,
  taskId: uuid,
  dispatchCycleId: uuid,
  outcomeId: uuid,
  attemptId: uuid,
  sourceLineId: str,
  externalId: str,
  sourceDispatchCycleId: str,
  sourceRevision: rev,
  revision: rev,
  requested: whole,
  received: count,
  lost: count,
  damaged: count,
  unresolved: count,
  eligibility: { enum: ['pending', 'settled', 'superseded'] },
  custody: obj({
    sourceQuantity: whole,
    delivered: count,
    held: count,
    received: count,
    lost: count,
    damaged: count,
  }),
});
export const returnDeskSchema = obj({
  branches: array(named),
  drivers: array(named),
  brands: array(named),
  total: count,
  page: { type: 'integer', minimum: 1 },
  items: array(
    obj({
      id: uuid,
      branchId: uuid,
      branchName: str,
      driverId: uuid,
      driverName: str,
      requestedAt: date,
      checkedAt: date,
      dispositions: array(
        obj({
          id: uuid,
          kind: { enum: ['lost', 'damaged'] },
          incidentId: uuid,
          items: array(obj({ itemId: uuid, expectedRevision: rev, quantity: whole }), 1),
        }),
      ),
      items: array(
        obj({
          id: uuid,
          shipmentId: uuid,
          cycleId: uuid,
          reference: str,
          description: str,
          brandId: uuid,
          brandName: str,
          current,
          inspection: { enum: ['counted-pieces', 'parcel-exterior'] },
          observations: array(
            obj({
              id: uuid,
              state: { enum: ['pending', 'accepted', 'rejected', 'review-required'] },
              quantity: whole,
              condition: {
                ...condition,
                type: ['string', 'null'],
                enum: ['sound', 'damaged', 'uncertain', null],
              },
              observedAt: date,
              lastError: { type: ['string', 'null'] },
            }),
          ),
          receipts: array(
            obj({
              id: uuid,
              quantity: whole,
              consumed: count,
              condition,
              version: { type: 'integer', minimum: 1 },
              receivedAt: date,
            }),
          ),
        }),
      ),
    }),
  ),
});
export const validateReturnDesk = ajv.compile<ReturnDesk>(returnDeskSchema);
export const validateReturnResult = ajv.compile<ReturnResult>(returnResultSchema);
export const returnRefreshSchema = obj({ companyId: uuid, branchId: uuid, driverId: uuid });
export const validateReturnRefresh = ajv.compile<{
  companyId: string;
  branchId: string;
  driverId: string;
}>(returnRefreshSchema);
export const returnRefreshResultSchema = obj({
  checked: { const: true },
  requests: { type: 'integer', minimum: 0 },
});
export const returnsPaths = {
  '/api/v1/returns': {
    get: {
      summary: 'Assigned source branch and driver return desk',
      responses: {
        '200': {
          description: 'Scoped requests and actual receipts',
          content: { 'application/json': { schema: returnDeskSchema } },
        },
      },
    },
  },
  '/api/v1/returns/requests/{id}': {
    get: {
      summary: 'Scoped current quantities, physical observations and immutable receipt history',
      responses: {
        '200': {
          description: 'Return detail',
          content: { 'application/json': { schema: returnDeskSchema } },
        },
      },
    },
  },
  '/api/v1/returns/commands': {
    post: {
      summary: 'Actual subset receipt, eligible redispatch or actual brand handover',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: returnCommandSchema } },
      },
      responses: {
        '202': {
          description: 'Durable intent; receipt pending source acceptance',
          content: { 'application/json': { schema: returnResultSchema } },
        },
        '200': {
          description: 'Actual native handover recorded',
          content: { 'application/json': { schema: returnResultSchema } },
        },
        '400': { description: 'Invalid subset' },
        '403': { description: 'Screen or branch denied' },
        '409': { description: 'Revision, custody or allocation conflict' },
      },
    },
  },
  '/api/v1/returns/commands/{commandId}': {
    get: {
      summary: 'Reauthorized native command recovery',
      responses: {
        '200': { description: 'Original result' },
        '403': { description: 'Current access denied' },
      },
    },
  },
  '/api/v1/returns/refresh': {
    post: {
      summary: 'Read every scoped pending page and current request revisions; no physical receipt',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: returnRefreshSchema } },
      },
      responses: {
        '200': {
          description: 'Refreshed authoritative request state',
          content: { 'application/json': { schema: returnRefreshResultSchema } },
        },
        '503': { description: 'Incomplete source read; retain previous facts' },
      },
    },
  },
};
