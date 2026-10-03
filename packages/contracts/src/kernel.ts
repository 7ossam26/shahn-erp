import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
export const kernelOperations = [
  'kernel.seed',
  'kernel.reserve',
  'kernel.fee',
  'kernel.release',
  'kernel.payout',
] as const;
export type KernelOperation = (typeof kernelOperations)[number];
export interface KernelCommand {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
  type: KernelOperation;
  brandId: string;
  branchId: string;
  sourceId: string;
  expectedVersion?: number;
  money?: { currency: 'EGP'; amountMinor: string };
  coverSourceId?: string;
}
export const moneySchema = (sign: 'signed' | 'nonnegative' | 'positive') => ({
  type: 'object',
  additionalProperties: false,
  required: ['currency', 'amountMinor'],
  properties: {
    currency: { type: 'string', const: 'EGP' },
    amountMinor: {
      type: 'string',
      maxLength: 20,
      pattern:
        sign === 'signed'
          ? '^(0|-?[1-9][0-9]*)$'
          : sign === 'positive'
            ? '^[1-9][0-9]*$'
            : '^(0|[1-9][0-9]*)$',
    },
  },
});
const uuid = { type: 'string', format: 'uuid' };
export const kernelCommandSchema = {
  oneOf: kernelOperations.map((type) => {
    const versioned = ['kernel.reserve', 'kernel.release', 'kernel.payout'].includes(type);
    const money = ['kernel.reserve', 'kernel.fee', 'kernel.payout'].includes(type);
    const cover = ['kernel.fee', 'kernel.release'].includes(type);
    return {
      type: 'object',
      additionalProperties: false,
      required: [
        'schemaVersion',
        'commandId',
        'companyId',
        'type',
        'brandId',
        'branchId',
        'sourceId',
        ...(versioned ? ['expectedVersion'] : []),
        ...(money ? ['money'] : []),
        ...(cover ? ['coverSourceId'] : []),
      ],
      properties: {
        schemaVersion: { type: 'integer', const: 1 },
        commandId: uuid,
        companyId: uuid,
        type: { type: 'string', const: type },
        brandId: uuid,
        branchId: uuid,
        sourceId: uuid,
        ...(versioned
          ? { expectedVersion: { type: 'integer', minimum: 1, maximum: 2147483646 } }
          : {}),
        ...(money ? { money: moneySchema('positive') } : {}),
        ...(cover ? { coverSourceId: uuid } : {}),
      },
    };
  }),
};
const minor = { type: 'string', pattern: '^(0|[1-9][0-9]*)$', maxLength: 19 };
export const walletSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'eligible',
    'pending',
    'debits',
    'held',
    'cover',
    'signedEntitlement',
    'eligibleToPay',
  ],
  properties: {
    eligible: minor,
    pending: minor,
    debits: minor,
    held: minor,
    cover: minor,
    signedEntitlement: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$', maxLength: 20 },
    eligibleToPay: minor,
  },
};
export const kernelResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['fixture', 'resultId', 'brandId', 'branchId', 'version', 'wallet', 'reference'],
  properties: {
    fixture: { const: true, type: 'boolean' },
    resultId: uuid,
    brandId: uuid,
    branchId: uuid,
    version: { type: 'integer', minimum: 1 },
    wallet: walletSchema,
    reference: { type: 'string', pattern: '^[1-9][0-9]*$' },
  },
};
export const kernelErrorSchema = {
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
const ajv = new AjvModule.default({ strict: true, allErrors: true });
formatsModule.default(ajv);
export const validateKernelCommand = ajv.compile<KernelCommand>(kernelCommandSchema);
export const validateKernelResult = ajv.compile(kernelResultSchema);
export const validateKernelError = ajv.compile(kernelErrorSchema);
const response = (schema: unknown) => ({
  description: 'Authorized outcome',
  content: { 'application/json': { schema } },
});
const errors = Object.fromEntries(
  ['400', '401', '403', '404', '409', '500'].map((code) => [code, response(kernelErrorSchema)]),
);
export const kernelPaths = {
  '/api/v1/kernel/commands': {
    post: {
      summary: 'Isolated kernel trial; absent in production',
      security: [{ erpSession: [], csrfToken: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: kernelCommandSchema } },
      },
      responses: { '200': response(kernelResultSchema), ...errors },
    },
  },
  '/api/v1/kernel/commands/{commandId}': {
    get: {
      summary: 'Currently authorized trial command recovery',
      security: [{ erpSession: [] }],
      parameters: [
        { in: 'path', name: 'commandId', required: true, schema: uuid },
        { in: 'query', name: 'companyId', required: true, schema: uuid },
      ],
      responses: { '200': response(kernelResultSchema), ...errors },
    },
  },
};
