import AjvModule from 'ajv';
const Ajv = AjvModule.default;
export const operationsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'mode', 'mutationsEnabled', 'releaseId', 'releaseAuthority'],
  properties: {
    schemaVersion: { const: 1 },
    mode: { enum: ['normal', 'restore', 'read-only'] },
    mutationsEnabled: { type: 'boolean' },
    releaseId: { type: ['string', 'null'], maxLength: 128 },
    releaseAuthority: { const: 'company operator after documented reconciliation' },
  },
} as const;
export const validateOperations = new Ajv({ strict: false }).compile(operationsSchema);
export const operationsPaths = {
  '/api/v1/operations': {
    get: {
      summary: 'Safe local restore restrictions; no credentials or business detail',
      responses: {
        '200': {
          description: 'Local deployment mode',
          content: { 'application/json': { schema: operationsSchema } },
        },
      },
    },
  },
};
