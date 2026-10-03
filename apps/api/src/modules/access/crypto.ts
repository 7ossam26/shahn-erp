import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
export const secret = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0))
      throw new Error('INVALID_CANONICAL_NUMBER');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') throw new Error('INVALID_CANONICAL_JSON');
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error('INVALID_CANONICAL_OBJECT');
  return (
    '{' +
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
      .join(',') +
    '}'
  );
}
export function encrypt(value: string, key: string): string {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  return Buffer.concat([
    iv,
    cipher.update(value, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64url');
}
export function decrypt(value: string, key: string): string {
  const data = Buffer.from(value, 'base64url'),
    decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([decipher.update(data.subarray(12, -16)), decipher.final()]).toString(
    'utf8',
  );
}
