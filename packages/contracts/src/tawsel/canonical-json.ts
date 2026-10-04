/** Canonical source JSON preserves permitted fractional coordinates. Concrete schemas validate
 * integer money/revisions before this serializer; native command hashing remains unchanged. */
export function canonicalTawselJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw Error('INVALID_SOURCE_JSON_NUMBER');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') throw Error('INVALID_SOURCE_JSON');
  if (Array.isArray(value)) return '[' + value.map(canonicalTawselJson).join(',') + ']';
  if (Object.getPrototypeOf(value) !== Object.prototype) throw Error('INVALID_SOURCE_JSON_OBJECT');
  return (
    '{' +
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => JSON.stringify(k) + ':' + canonicalTawselJson(v))
      .join(',') +
    '}'
  );
}
