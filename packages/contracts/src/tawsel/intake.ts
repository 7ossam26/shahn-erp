import { tawselValidator } from './validation.js';
import type { ActionResult, SourceEnvelope } from './provisioning.js';
export interface WireMoney {
  amountMinor: number;
  currency: 'EGP';
  exponent: 2;
}
export interface SourceSnapshot {
  externalId: string;
  sourceDispatchCycleId: string;
  sourceRevision: number;
  expectedSourceRevision: number;
  sourceBranchExternalId: string;
  recipientName: string;
  recipientPhone: string;
  destination:
    | { kind: 'address'; addressText: string }
    | {
        kind: 'confirmed-pin';
        coordinates: { latitude: number; longitude: number };
        addressText?: string;
      };
  splittingAllowed: boolean;
  allocation: 'exact-outstanding-per-unit';
  lines: { sourceLineId: string; description: string; quantity: number; unitDue: WireMoney }[];
  shippingDue: WireMoney;
  totalDue: WireMoney;
  priority: 'ordinary' | 'urgent';
  sourceOrderReference?: string;
  earliestAt?: string;
  instructions?: string;
}
export interface AssignmentReference {
  externalId: string;
  sourceDispatchCycleId: string;
  expectedSourceRevision: number;
  expectedAssignmentRevision: number;
  assignmentRevision: number;
}
export interface IntakeTask {
  taskId: string;
  dispatchCycleId: string;
  externalId: string;
  sourceDispatchCycleId: string;
  sourceRevision: number;
  assignmentRevision: number;
  state: 'unassigned' | 'prepared' | 'held' | 'withdrawn';
  driverId: string | null;
  driverExternalId: string | null;
  receivedAt: string | null;
  editable: boolean;
  planningEligible: boolean;
  planningStatus:
    'not-requested' | 'pending' | 'running' | 'complete' | 'partial' | 'failed' | 'superseded';
  locationReadiness: 'needs-resolution' | 'confirmed';
  snapshot: SourceSnapshot;
  previousDispatchCycleId?: string | null;
  latest?: boolean;
}
export const intakeOperations = {
  'intake.submitSnapshot': 'SourceSnapshotCommand',
  'intake.prepare': 'PrepareCommand',
  'assignment.receiveBatch': 'ReceiveBatchCommand',
  'assignment.withdraw': 'WithdrawCommand',
  'assignment.reassignBeforeDeparture': 'ReassignCommand',
  'intake.setUrgencyBeforeDeparture': 'UrgencyCommand',
} as const;
const validators = Object.fromEntries(
  Object.entries(intakeOperations).map(([op, def]) => [
    op,
    tawselValidator<SourceEnvelope>('b2b-intake.schema.json#/$defs/' + def),
  ]),
);
export const validateIntakeCommand = (value: unknown): value is SourceEnvelope => {
  const op = (value as SourceEnvelope | null)?.operationId;
  return (
    typeof op === 'string' &&
    Object.hasOwn(validators, op) &&
    !!validators[op]!(value) &&
    (op !== 'intake.submitSnapshot' || validSnapshotSemantics((value as SourceEnvelope).payload))
  );
};
export const validateSourceSnapshot = tawselValidator<SourceSnapshot>(
  'b2b-intake.schema.json#/$defs/SourceSnapshot',
);
export const validateIntakeTask = tawselValidator<IntakeTask>('b2b-intake.schema.json#/$defs/Task');
export const validateIntakeTaskList = tawselValidator<{ items: IntakeTask[]; nextCursor?: string }>(
  'b2b-intake.schema.json#/$defs/TaskList',
);
export const validateIntakeBatchResult = tawselValidator<{
  actionId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'review-required';
  result?: ActionResult;
}>('b2b-intake.schema.json#/$defs/BatchResult');
export function validSnapshotSemantics(value: unknown): value is SourceSnapshot {
  if (!validateSourceSnapshot(value)) return false;
  if (new Set(value.lines.map((l) => l.sourceLineId)).size !== value.lines.length) return false;
  let sum = BigInt(value.shippingDue.amountMinor);
  for (const line of value.lines) {
    const product = BigInt(line.quantity) * BigInt(line.unitDue.amountMinor);
    if (product > BigInt(Number.MAX_SAFE_INTEGER)) return false;
    sum += product;
    if (sum > BigInt(Number.MAX_SAFE_INTEGER)) return false;
  }
  return (
    sum === BigInt(value.totalDue.amountMinor) &&
    value.sourceRevision > value.expectedSourceRevision
  );
}
