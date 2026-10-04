import { tawselValidator } from './validation.js';
export const provisioningOperations = {
  'integration.bindSource': ['BindSourceCommand', 'source'],
  'integration.rotateCredential': ['RotateCredentialCommand', 'source'],
  'integration.disableSource': ['DisableSourceCommand', 'source'],
  'branch.provision': ['BranchCommand', 'branch'],
  'branch.disable': ['DisableBranchCommand', 'branch'],
  'role.defineCapabilities': ['RoleCommand', 'role'],
  'user.provision': ['UserCommand', 'user'],
  'user.setRole': ['UserRoleCommand', 'user'],
  'user.setCapabilityExceptions': ['UserExceptionsCommand', 'user'],
  'user.setBranchMemberships': ['UserBranchesCommand', 'user'],
  'user.disable': ['DisableUserCommand', 'user'],
  'driver.provisionReference': ['DriverCommand', 'driver'],
} as const;
export type ProvisioningOperation = keyof typeof provisioningOperations;
export type BindingKind = 'source' | 'branch' | 'role' | 'user' | 'driver';
export interface SourceEnvelope {
  schemaVersion: '1.0.0';
  payloadVersion: '1.0.0';
  actionId: string;
  operationId: string;
  context: { kind: 'integration'; tenantId: string; integrationId: string };
  resources: Record<string, never>;
  baseVersions: Record<string, never>;
  dependsOnActionIds: [];
  observation: { observedAt: string | null; clock: { quality: 'known' | 'uncertain' | 'unknown' } };
  payload: Record<string, unknown>;
}
export interface ProvisioningStatus {
  entity: BindingKind;
  externalId: string;
  resourceId: string;
  sourceRevision: number;
  lastActionId: string;
  issuerStatus: 'not-required' | 'pending' | 'running' | 'retry' | 'ready';
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  enabled: boolean | null;
}
export interface SourceConfiguration {
  identity: { mode: 'service-operation'; tenantId: string; integrationId: string; actorId: null };
  issuer: string;
  supportedVersions: string[];
  allowedOperations: string[];
  humanDelegation: false;
}
export interface ActionResult {
  receipt: {
    schemaVersion: '1.0.0';
    receiptId: string;
    actionId: string;
    evidenceStatus: 'received';
    businessStatus: 'accepted' | 'rejected' | 'review-required';
    receivedAt: string;
    committedAt?: string;
    resourceVersions?: Record<string, number>;
    problem?: { code: string; [key: string]: unknown };
  };
  operationId: string;
  retention: 'full' | 'compacted';
  summary: Record<string, unknown>;
  response?: { status: number; body: Record<string, unknown> };
}
const validators = Object.fromEntries(
  Object.entries(provisioningOperations).map(([op, [def]]) => [
    op,
    tawselValidator<SourceEnvelope>('provisioning.schema.json#/$defs/' + def),
  ]),
);
export const validateProvisioningCommand = (value: unknown): value is SourceEnvelope => {
  const op = (value as SourceEnvelope | null)?.operationId;
  return typeof op === 'string' && Object.hasOwn(validators, op) && !!validators[op]!(value);
};
export const validateSourceConfiguration = tawselValidator<SourceConfiguration>(
  'provisioning.schema.json#/$defs/SourceConfiguration',
);
export const validateProvisioningStatus = tawselValidator<ProvisioningStatus>(
  'provisioning.schema.json#/$defs/ProvisioningStatus',
);
export const validateActionResult = tawselValidator<ActionResult>('action-result.v1.schema.json');
