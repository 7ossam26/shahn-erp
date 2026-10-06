import { trackingPaths } from './execution/tracking.js';
import { goodsTransferPaths } from './goods-transfers/index.js';
export * from './goods-transfers/index.js';
import { dispatchPaths } from './dispatch/index.js';
export * from './dispatch/index.js';
import { financePaths } from './finance/index.js';
import { integrationPaths } from './integration.js';
export * from './integration.js';
import { treasuryPaths } from './finance/treasury-transfers/index.js';
export * from './finance/treasury-transfers/index.js';
export * from './finance/index.js';
import AjvModule, { type JSONSchemaType } from 'ajv';
import formatsModule from 'ajv-formats';
import { accessPaths } from './access.js';
import { accessReadPaths, accessAuthPaths } from './access-views.js';
import { kernelPaths } from './kernel.js';
import { commercialPaths } from './brands.js';
import { inventoryPaths } from './inventory/index.js';
import { shipmentPaths } from './shipments/index.js';
import { employeePaths } from './employees/index.js';
export * from './employees/index.js';
export * from './shipments/index.js';
export * from './brands.js';
export * from './kernel.js';
export * from './access.js';
export * from './access-views.js';

export interface Liveness {
  schemaVersion: 1;
  service: 'api';
  status: 'alive';
  dependenciesChecked: false;
  checkedAt: string;
}
export interface Readiness {
  schemaVersion: 1;
  service: 'api';
  status: 'ready' | 'not_ready';
  checkedAt: string;
  database: 'connected' | 'unavailable';
  migrations: {
    state: 'current' | 'missing' | 'incompatible' | 'unknown';
    applied: string[];
    required: string[];
  };
}
export interface DemoValues {
  label: string;
  amount: string;
  notes: string;
}
export const demoFormSchema: JSONSchemaType<DemoValues> = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'amount', 'notes'],
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 180, pattern: '\\S' },
    amount: { type: 'string', pattern: '^(?:0|[1-9]\\d*)(?:\\.\\d{1,2})?$' },
    notes: { type: 'string', maxLength: 1000 },
  },
};
export const livenessSchema: JSONSchemaType<Liveness> = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'service', 'status', 'dependenciesChecked', 'checkedAt'],
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    service: { type: 'string', const: 'api' },
    status: { type: 'string', const: 'alive' },
    dependenciesChecked: { type: 'boolean', const: false },
    checkedAt: { type: 'string', format: 'date-time' },
  },
};
export const readinessSchema: JSONSchemaType<Readiness> = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'service', 'status', 'checkedAt', 'database', 'migrations'],
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    service: { type: 'string', const: 'api' },
    status: { type: 'string', enum: ['ready', 'not_ready'] },
    checkedAt: { type: 'string', format: 'date-time' },
    database: { type: 'string', enum: ['connected', 'unavailable'] },
    migrations: {
      type: 'object',
      additionalProperties: false,
      required: ['state', 'applied', 'required'],
      properties: {
        state: { type: 'string', enum: ['current', 'missing', 'incompatible', 'unknown'] },
        applied: { type: 'array', items: { type: 'string' } },
        required: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};
// CJS interop is explicit under NodeNext and works in the browser bundle as well.
const Ajv = AjvModule.default;
const addFormats = formatsModule.default;
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const demoValidator = ajv.compile<DemoValues>(demoFormSchema);
export function demoFieldErrors(data: unknown): Partial<Record<keyof DemoValues, string>> {
  if (demoValidator(data)) return {};
  const messages = {
    label: 'اكتب عنوان المثال (حتى 180 حرفًا)',
    amount: 'أدخل مبلغًا صحيحًا، مثل 50.5، بمنزلتين عشريتين كحد أقصى',
    notes: 'الملاحظات أطول من 1000 حرف',
  };
  const errors: Partial<Record<keyof DemoValues, string>> = {};
  for (const error of demoValidator.errors ?? []) {
    const field = error.instancePath.slice(1) || String(error.params['missingProperty'] ?? '');
    if (field in messages) errors[field as keyof DemoValues] = messages[field as keyof DemoValues];
  }
  return errors;
}
const readinessValidator = ajv.compile<Readiness>(readinessSchema);
const livenessValidator = ajv.compile<Liveness>(livenessSchema);
export function validateReadiness(data: unknown): data is Readiness {
  return readinessValidator(data);
}
export function validateLiveness(data: unknown): data is Liveness {
  return livenessValidator(data);
}
export const openApi: Record<string, unknown> = {
  openapi: '3.1.0',
  info: { title: 'Shahn ERP foundation', version: '1.0.0' },
  components: {
    securitySchemes: {
      erpSession: { type: 'apiKey', in: 'cookie', name: 'erp_session' },
      csrfToken: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
    },
  },
  paths: {
    ...brandWalletPaths,
    ...brandPayoutPaths,
    ...remittancePaths,
    ...goodsTransferPaths,
    ...treasuryPaths,
    ...financePaths,
    ...integrationPaths,
    ...dispatchPaths,
    ...returnsPaths,
    ...trackingPaths,
    ...employeePaths,
    ...shipmentPaths,
    ...commercialPaths,
    ...inventoryPaths,
    ...kernelPaths,
    ...accessPaths,
    ...accessReadPaths,
    ...accessAuthPaths,
    '/api/v1/health': {
      get: {
        summary: 'Process liveness; dependencies are unchecked',
        responses: {
          '200': {
            description: 'Alive',
            content: { 'application/json': { schema: livenessSchema } },
          },
        },
      },
    },
    '/api/v1/readiness': {
      get: {
        summary: 'Database and exact required migration state',
        responses: {
          '200': {
            description: 'Ready',
            content: { 'application/json': { schema: readinessSchema } },
          },
          '503': {
            description: 'Not ready; safe dependency state',
            content: { 'application/json': { schema: readinessSchema } },
          },
        },
      },
    },
  },
};

export * from './inventory/index.js';
import { returnsPaths } from './returns/index.js';
export * from './returns/index.js';
import { remittancePaths } from './finance/remittances/index.js';
export * from './finance/remittances/index.js';
import { brandWalletPaths } from './finance/brand-wallet/index.js';
export * from './finance/brand-wallet/index.js';
import { brandPayoutPaths } from './finance/brand-payouts/index.js';
export * from './finance/brand-payouts/index.js';
