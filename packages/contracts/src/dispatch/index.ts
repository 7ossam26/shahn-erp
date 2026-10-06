import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import type { ShipmentPrice } from '../shipments/index.js';
export interface ApprovedShippingWaiver {
  incidentId: string;
  approvalId: string;
  originalShipmentId: string | null;
  replacementShipmentId: string;
}
export interface DispatchPrice extends ShipmentPrice {
  waiverMinor: string;
  waiver: ApprovedShippingWaiver | null;
  commissionPolicy: 'normal';
}
export type DispatchState =
  | 'synchronizing'
  | 'preparing'
  | 'prepared'
  | 'receiving'
  | 'accepted'
  | 'rejected'
  | 'withdrawing'
  | 'withdrawn'
  | 'reassigning'
  | 'review-required';
export type DispatchCommand = { schemaVersion: 1; commandId: string; companyId: string } & (
  | {
      type: 'dispatch.prepare';
      branchId: string;
      driverId: string;
      items: { shipmentId: string; expectedVersion: number }[];
    }
  | { type: 'dispatch.receive'; intentId: string; expectedVersion: number; receiptAsserted: true }
  | { type: 'dispatch.withdraw'; intentId: string; expectedVersion: number; actualAtBranch: true }
  | { type: 'dispatch.reassign'; intentId: string; expectedVersion: number; driverId: string }
  | { type: 'dispatch.review'; intentId: string; expectedVersion: number }
  | { type: 'dispatch.retry'; intentId: string; actionId: string; expectedVersion: number }
);
export interface DispatchResult {
  commandId: string;
  intentId: string;
  branchId: string;
}
export interface DispatchRow {
  id: string;
  reference: string;
  version: number;
  brandId: string;
  brandName: string;
  branchId: string;
  branchName: string;
  recipientName: string;
  service: string;
  preparation: string;
  quantity: number;
  recipientDueMinor: string;
  brandShippingMinor: string;
  tariffMinor: string;
  eligibleToPay: string;
  pendingCredit: string;
  blockers: string[];
  intentId: string | null;
  dispatchState: DispatchState | null;
  synchronization: string;
  createdAt: string;
}
export interface DispatchDriver {
  id: string;
  name: string;
  ready: boolean;
  checkedAt: string | null;
}
export interface DispatchList {
  items: DispatchRow[];
  total: number;
  page: number;
  branches: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  drivers: DispatchDriver[];
}
export interface DispatchDetail {
  id: string;
  branchId: string;
  branchName: string;
  driverId: string;
  driverName: string;
  version: number;
  state: DispatchState;
  lastError: string | null;
  createdAt: string;
  items: {
    shipmentId: string;
    reference: string;
    recipientName: string;
    quantity: number;
    recipientDueMinor: string;
    tariffMinor: string;
    waiverMinor: string;
    brandShippingMinor: string;
    coverMinor: string;
    acceptedRevision: number;
    pendingRevision: number | null;
    desiredRevision: number;
    assignmentRevision: number;
    taskId: string | null;
    sourceCycleId: string;
    planningStatus: string;
    locationReadiness: string;
  }[];
  actions: {
    actionId: string;
    commandId: string;
    operation: string;
    state: string;
    error: string | null;
  }[];
}
export interface DispatchFilter {
  branches: string[];
  brands: string[];
  preparations: string[];
  blockers: string[];
  services: string[];
  drivers: string[];
  from: string | null;
  to: string | null;
  page: number;
}
const uuid = { type: 'string', format: 'uuid' },
  version = { type: 'integer', minimum: 1, maximum: 2147483647 },
  text = { type: 'string' },
  nullable = (x: object) => ({ anyOf: [x, { type: 'null' }] }),
  array = (x: object) => ({ type: 'array', items: x }),
  closed = (properties: Record<string, unknown>) => ({
    type: 'object',
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  }),
  envelope = { schemaVersion: { const: 1 }, commandId: uuid, companyId: uuid };
const command = (type: string, props: Record<string, unknown>) =>
  closed({ ...envelope, type: { const: type }, ...props });
export const dispatchCommandSchema = {
  oneOf: [
    command('dispatch.prepare', {
      branchId: uuid,
      driverId: uuid,
      items: {
        ...array(closed({ shipmentId: uuid, expectedVersion: version })),
        minItems: 1,
        maxItems: 100,
      },
    }),
    command('dispatch.receive', {
      intentId: uuid,
      expectedVersion: version,
      receiptAsserted: { const: true },
    }),
    command('dispatch.withdraw', {
      intentId: uuid,
      expectedVersion: version,
      actualAtBranch: { const: true },
    }),
    command('dispatch.reassign', { intentId: uuid, expectedVersion: version, driverId: uuid }),
    command('dispatch.review', { intentId: uuid, expectedVersion: version }),
    command('dispatch.retry', { intentId: uuid, expectedVersion: version, actionId: uuid }),
  ],
};
export const dispatchFilterSchema = closed({
  branches: array(uuid),
  brands: array(uuid),
  preparations: array({ enum: ['not_required', 'complete', 'awaiting_preparation'] }),
  blockers: array(text),
  services: array({ enum: ['brand_packed', 'company_packed', 'stored_stock'] }),
  drivers: array(uuid),
  from: nullable({ type: 'string', format: 'date' }),
  to: nullable({ type: 'string', format: 'date' }),
  page: version,
});
const Ajv = AjvModule.default ?? AjvModule,
  formats = formatsModule.default ?? formatsModule;
const ajv = new Ajv({ allErrors: true });
formats(ajv);
export const validateDispatchCommand = ajv.compile<DispatchCommand>(dispatchCommandSchema);
export const validateDispatchFilter = ajv.compile<DispatchFilter>(dispatchFilterSchema);
export const dispatchResultSchema = closed({ commandId: uuid, intentId: uuid, branchId: uuid });
const money = { type: 'string', pattern: '^(0|[1-9][0-9]*)$' },
  integer = { type: 'integer', minimum: 0, maximum: 9007199254740991 },
  rowSchema = closed({
    id: uuid,
    reference: text,
    version,
    brandId: uuid,
    brandName: text,
    branchId: uuid,
    branchName: text,
    recipientName: text,
    service: text,
    preparation: text,
    quantity: integer,
    recipientDueMinor: money,
    brandShippingMinor: money,
    tariffMinor: money,
    eligibleToPay: money,
    pendingCredit: money,
    blockers: array(text),
    intentId: nullable(uuid),
    dispatchState: nullable(text),
    synchronization: text,
    createdAt: text,
  });
export const dispatchListSchema = closed({
  items: array(rowSchema),
  total: integer,
  page: version,
  branches: array(closed({ id: uuid, name: text })),
  brands: array(closed({ id: uuid, name: text })),
  drivers: array(
    closed({ id: uuid, name: text, ready: { type: 'boolean' }, checkedAt: nullable(text) }),
  ),
});
export const dispatchDetailSchema = closed({
  id: uuid,
  branchId: uuid,
  branchName: text,
  driverId: uuid,
  driverName: text,
  version,
  state: text,
  lastError: nullable(text),
  createdAt: text,
  items: array(
    closed({
      shipmentId: uuid,
      reference: text,
      recipientName: text,
      quantity: integer,
      recipientDueMinor: money,
      tariffMinor: money,
      waiverMinor: money,
      brandShippingMinor: money,
      coverMinor: money,
      acceptedRevision: integer,
      pendingRevision: nullable(integer),
      desiredRevision: integer,
      assignmentRevision: integer,
      taskId: nullable(uuid),
      sourceCycleId: text,
      planningStatus: text,
      locationReadiness: text,
    }),
  ),
  actions: array(
    closed({
      actionId: uuid,
      commandId: uuid,
      operation: text,
      state: text,
      error: nullable(text),
    }),
  ),
});
export const validateDispatchList = ajv.compile<DispatchList>(dispatchListSchema),
  validateDispatchDetail = ajv.compile<DispatchDetail>(dispatchDetailSchema);
const response = (schema: object) => ({
  description: 'Current authorized dispatch state',
  content: { 'application/json': { schema } },
});
export const dispatchPaths = {
  '/api/v1/dispatch': {
    get: {
      parameters: [
        { in: 'query', name: 'companyId', required: true, schema: uuid },
        ...['branches', 'brands', 'preparations', 'blockers', 'services', 'drivers'].map(
          (name) => ({
            in: 'query',
            name,
            description: 'Comma-separated values; OR within field, AND across fields',
            schema: text,
          }),
        ),
        ...['from', 'to'].map((name) => ({
          in: 'query',
          name,
          schema: { type: 'string', format: 'date' },
        })),
        { in: 'query', name: 'page', schema: version },
      ],
      responses: { '200': response(dispatchListSchema) },
    },
  },
  '/api/v1/dispatch/{id}': {
    get: {
      parameters: [
        { in: 'path', name: 'id', required: true, schema: uuid },
        { in: 'query', name: 'companyId', required: true, schema: uuid },
      ],
      responses: { '200': response(dispatchDetailSchema) },
    },
  },
  '/api/v1/dispatch/commands': {
    post: {
      requestBody: {
        required: true,
        content: { 'application/json': { schema: dispatchCommandSchema } },
      },
      responses: {
        '202': response(dispatchResultSchema),
        '400': { description: 'Invalid closed request' },
        '403': { description: 'Current access or CSRF denied' },
        '409': { description: 'Retained version, physical stock, identity or cover rejection' },
      },
    },
  },
  '/api/v1/dispatch/commands/{commandId}': {
    get: {
      parameters: [
        { in: 'path', name: 'commandId', required: true, schema: uuid },
        { in: 'query', name: 'companyId', required: true, schema: uuid },
      ],
      responses: {
        '200': response(dispatchResultSchema),
        '404': { description: 'No retained command' },
      },
    },
  },
};
