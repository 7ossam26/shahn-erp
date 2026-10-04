import { createHmac, timingSafeEqual } from 'node:crypto';
import { tawselUuid } from '@shahn/contracts/tawsel';
export interface SignatureScope {
  tenantId: string;
  integrationId: string;
}
export interface VerificationKey {
  keyId: string;
  secretHex: string;
  verifyUntil: Date | null;
  activeFrom?: Date;
}
export class ReceiverError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
const names = [
  'x-tawsel-tenant-id',
  'x-tawsel-integration-id',
  'x-tawsel-key-id',
  'x-tawsel-delivery-timestamp',
  'x-tawsel-signature',
];
export function securityHeaders(rawHeaders: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const name = rawHeaders[i]!.toLowerCase();
    if (!names.includes(name)) continue;
    if (Object.hasOwn(values, name)) throw new ReceiverError('invalid_signature', 401);
    values[name] = rawHeaders[i + 1] ?? '';
  }
  if (names.some((name) => !values[name])) throw new ReceiverError('invalid_signature', 401);
  return values;
}
export function signatureFor(
  body: Uint8Array,
  scope: SignatureScope,
  keyId: string,
  timestamp: string,
  secretHex: string,
): string {
  if (!/^[a-f0-9]{64}$/.test(secretHex)) throw new Error('INVALID_SIGNING_SECRET');
  return (
    'v1=' +
    createHmac('sha256', Buffer.from(secretHex, 'hex'))
      .update(
        `tawsel-webhook-v1\n${scope.tenantId}\n${scope.integrationId}\n${keyId}\n${timestamp}\n`,
        'utf8',
      )
      .update(body)
      .digest('hex')
  );
}
export function verifySignature(
  body: Uint8Array,
  rawHeaders: readonly string[],
  scope: SignatureScope,
  keys: readonly VerificationKey[],
  now = Date.now(),
) {
  const h = securityHeaders(rawHeaders),
    tenant = h[names[0]!]!,
    integration = h[names[1]!]!,
    keyId = h[names[2]!]!,
    timestamp = h[names[3]!]!,
    signature = h[names[4]!]!;
  if (
    !tawselUuid(tenant) ||
    !tawselUuid(integration) ||
    tenant !== scope.tenantId ||
    integration !== scope.integrationId ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(keyId) ||
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 300000 ||
    !/^v1=[a-f0-9]{64}$/.test(signature)
  )
    throw new ReceiverError('invalid_signature', 401);
  const key = keys.find((k) => k.keyId === keyId);
  if (
    !key ||
    (key.verifyUntil && now > key.verifyUntil.getTime()) ||
    (key.activeFrom && now < key.activeFrom.getTime())
  )
    throw new ReceiverError('invalid_signature', 401);
  const expected = Buffer.from(
      signatureFor(body, scope, keyId, timestamp, key.secretHex).slice(3),
      'hex',
    ),
    given = Buffer.from(signature.slice(3), 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    throw new ReceiverError('invalid_signature', 401);
  return { keyId, deliveryTimestamp: timestamp };
}
