import Ajv2020Module from 'ajv/dist/2020.js';
import formatsModule from 'ajv-formats';
import type { ValidateFunction } from 'ajv';
import { canonicalSchemas } from './registry.js';
const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const formats = formatsModule.default ?? formatsModule;
const ajv = new Ajv2020({ strict: false, allErrors: false, validateFormats: true });
formats(ajv);
for (const schema of canonicalSchemas) ajv.addSchema(schema);
export function tawselValidator<T = unknown>(reference: string): ValidateFunction<T> {
  const validator = ajv.getSchema<T>('https://schemas.tawsel.invalid/v1/' + reference);
  if (!validator) throw new Error('MISSING_PINNED_SCHEMA');
  return validator;
}
export const tawselUuid = tawselValidator<string>('common.schema.json#/$defs/Uuid');
