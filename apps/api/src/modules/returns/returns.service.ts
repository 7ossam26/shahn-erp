import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateReturnNativeCommand,
  type ReturnCommand,
  type ReturnResult,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { queueReturnIntent } from './receipt.service.js';
import { queueDisposition } from './disposition.service.js';
import { brandHandover } from './brand-handover.service.js';
import { prepareReceiptRedispatch } from './redispatch.service.js';
export function returnCommands(pool: Pool) {
  const definitions: CommandDefinition<ReturnCommand>[] = (
    ['return.receive', 'return.dispose', 'return.redispatch', 'return.brandHandover'] as const
  ).map((kind) => ({
    family: 'returns',
    kind,
    capability: 'returns',
    authorize: async (u, input, recovery) => {
      if (!recovery && !validateReturnNativeCommand(input))
        throw new AccessError('VALIDATION_FAILED', 400);
      u.assertBranch(String(input.branchId));
      if (input.type === 'return.redispatch' && !u.access.grants.includes('dispatch'))
        throw new AccessError('FORBIDDEN_SCOPE');
    },
    execute: async (u, input, recordId) => {
      const outcome =
        input.type === 'return.receive'
          ? await queueReturnIntent(pool, u, input, recordId)
          : input.type === 'return.dispose'
            ? await queueDisposition(
                pool,
                u,
                input.requestId,
                input.branchId,
                input.decisionId,
                recordId,
              )
            : input.type === 'return.redispatch'
              ? await prepareReceiptRedispatch(pool, u, input, recordId)
              : await brandHandover(u, input, recordId);
      const body: ReturnResult = {
        commandId: input.commandId,
        branchId: input.branchId,
        ...outcome,
      };
      return {
        reply: { status: input.type === 'return.brandHandover' ? 200 : 202, body },
        reference: { ...body, type: input.type },
        entityId: body.entityId,
        beforeVersion: null,
        afterVersion: 1,
      };
    },
    resolve: async (_u, r) => ({
      commandId: r.commandId,
      entityId: r.entityId,
      branchId: r.branchId,
      actionId: r.actionId,
      dispatchIntentId: r.dispatchIntentId,
    }),
    rejectionReference: async (input) => ({
      entityId:
        'requestId' in input
          ? input.requestId
          : 'previousCycleId' in input
            ? input.previousCycleId
            : input.brandId,
      branchId: input.branchId,
    }),
  }));
  return new CommandService(pool, definitions);
}
