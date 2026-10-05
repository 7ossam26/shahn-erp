import { tawselValidator } from './validation.js';
import type { ActionResult, SourceEnvelope } from './provisioning.js';
import type { ActionTime } from '../execution/index.js';
export interface PieceBalance {
  sourceQuantity: number;
  delivered: number;
  held: number;
  received: number;
  lost: number;
  damaged: number;
}
export interface ReturnItem {
  itemId: string;
  taskId: string;
  dispatchCycleId: string;
  outcomeId: string;
  attemptId: string;
  sourceLineId: string;
  externalId: string;
  sourceDispatchCycleId: string;
  sourceRevision: number;
  revision: number;
  requested: number;
  received: number;
  lost: number;
  damaged: number;
  unresolved: number;
  eligibility: 'pending' | 'settled' | 'superseded';
  custody: PieceBalance;
}
export interface ReturnRequest {
  requestId: string;
  driverId: string;
  sourceBranchId: string;
  integrationId: string;
  roundId: string;
  requestedAt: string;
  items: ReturnItem[];
  sourceBranchName?: string | null;
}
export interface ReturnTransition {
  transitionId: string;
  requestId: string;
  itemId: string;
  taskId: string;
  dispatchCycleId: string;
  outcomeId: string;
  sourceLineId: string;
  sourceDispatchCycleId: string;
  sourceBranchId: string;
  sourceReference: { tenantId: string; integrationId: string; externalId: string };
  kind: 'received' | 'lost' | 'damaged';
  quantity: number;
  revision: number;
  time: ActionTime;
  identity: { mode: 'service-operation'; tenantId: string; integrationId: string; actorId: null };
}
export interface ReturnCommandResult {
  request: ReturnRequest;
  transitions: ReturnTransition[];
}
export const returnOperations = {
  'return.confirmSubsetReceipt': 'ReceiveCommand',
  'return.recordDisposition': 'DisposeCommand',
} as const;
const validators = Object.fromEntries(
  Object.entries(returnOperations).map(([op, def]) => [
    op,
    tawselValidator<SourceEnvelope>('returns.schema.json#/$defs/' + def),
  ]),
);
export const validateReturnCommand = (v: unknown): v is SourceEnvelope => {
  const x = v as SourceEnvelope | null;
  if (!x || !Object.hasOwn(validators, x.operationId) || !validators[x.operationId]!(v))
    return false;
  const items = x.payload.items as { itemId: string }[];
  return new Set(items.map((i) => i.itemId)).size === items.length;
};
export const validateReturnRequest = tawselValidator<ReturnRequest>(
  'returns.schema.json#/$defs/RequestView',
);
export const validateReturnTransition = tawselValidator<ReturnTransition>(
  'returns.schema.json#/$defs/Transition',
);
export const validateReturnCommandResult = tawselValidator<ReturnCommandResult>(
  'returns.schema.json#/$defs/CommandResult',
);
export const validateReturnList = tawselValidator<{
  items: ReturnRequest[];
  nextCursor: string | null;
}>('returns.schema.json#/$defs/RequestList');
export const validateReturnActionStatus = tawselValidator<{
  actionId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'review-required';
  result?: ActionResult;
}>('returns.schema.json#/$defs/ActionStatus');
export function validReturnBalances(i: ReturnItem) {
  const c = i.custody;
  return (
    i.requested === i.received + i.unresolved + i.lost + i.damaged &&
    c.sourceQuantity === c.delivered + c.held + c.received + c.lost + c.damaged &&
    i.unresolved <= c.held
  );
}
/** P22 consumes current accumulated balances without inventing revisions or receipt facts. */
export function snapshotReturnBalances(state: {
  returnRequest: ReturnRequest | null;
  returnItems: {
    itemId: string;
    taskId: string;
    sourceLineId: string;
    requested: number;
    received: number;
    lost: number;
    damaged: number;
    unresolved: number;
  }[];
}) {
  if (!state.returnRequest) throw Error('RETURN_REQUEST_IDENTITY_REQUIRED');
  return state.returnItems.map((current) => {
    const original = state.returnRequest!.items.find((i) => i.itemId === current.itemId);
    if (
      !original ||
      original.taskId !== current.taskId ||
      original.sourceLineId !== current.sourceLineId ||
      original.requested !== current.requested ||
      current.requested !== current.received + current.unresolved + current.lost + current.damaged
    )
      throw Error('RETURN_SNAPSHOT_CONFLICT');
    return { original, current };
  });
}
