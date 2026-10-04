import { tawselValidator } from './validation.js';
import type { SourceEnvelope } from './provisioning.js';
export const deliveryOperations = {
  'integration.configureWebhook': 'ConfigureWebhookCommand',
  'integration.rotateSigningKey': 'RotateSigningKeyCommand',
  'integration.retryDelivery': 'RetryDeliveryCommand',
} as const;
const validators = Object.fromEntries(
  Object.entries(deliveryOperations).map(([op, def]) => [
    op,
    tawselValidator<SourceEnvelope>('outbox.schema.json#/$defs/' + def),
  ]),
);
export const validateDeliveryCommand = (value: unknown): value is SourceEnvelope => {
  const op = (value as SourceEnvelope | null)?.operationId;
  return typeof op === 'string' && Object.hasOwn(validators, op) && !!validators[op]!(value);
};
export interface ReceiptAcknowledgement {
  schemaVersion: '1.0.0';
  tenantId: string;
  recipientIntegrationId: string;
  eventId: string;
  acknowledgement: 'received';
}
export interface KeyRotation {
  keyId: string;
  activatedAt: string;
  previousKeyId: string | null;
  verifyUntil: string | null;
}
export const validateAcknowledgement = tawselValidator<ReceiptAcknowledgement>(
  'outbox.schema.json#/$defs/Acknowledgement',
);
export const validateKeyRotation = tawselValidator<KeyRotation>(
  'outbox.schema.json#/$defs/KeyRotation',
);
export const maxWebhookBytes = 2 * 1024 * 1024;
