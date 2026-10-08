import type { Pool } from 'pg';
import { AccessError, assertCapability } from '@shahn/domain';
import {
  validateSettlementCommand,
  validateSettlementPrepareInput,
  type SettlementCommand,
  type SettlementPrepareInput,
  type SettlementPreview,
  type SettlementResult,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import {
  assertResolverGrants,
  confirmContext,
  finishPreview,
  newConfirmState,
  type SettlementHooks,
} from './framework.js';
import {
  resolverByName,
  resolverFor,
  settlementRegistry,
  type SettlementClocks,
} from './registry.js';

export const settlementFamily = 'settlements';
/**
 * UI-ADJUSTMENT-001 application service. Prepare is a locked read; confirm reauthorizes,
 * recalculates the same typed plan under the resolver's locks and commits case, resolution,
 * typed effects, links, audit and retained result in one UnitOfWork.
 */
export class SettlementService {
  readonly registry;
  constructor(
    readonly pool: Pool,
    readonly hooks: SettlementHooks = {},
    readonly clocks: SettlementClocks = {},
  ) {
    this.registry = settlementRegistry(pool, clocks);
  }
  async prepare(token: string, input: SettlementPrepareInput): Promise<SettlementPreview> {
    if (!validateSettlementPrepareInput(input)) throw new AccessError('VALIDATION_FAILED', 400);
    const resolver = resolverFor(this.registry, input.operation);
    return UnitOfWork.run(this.pool, token, input.companyId, 'settlements', async (u) => {
      assertResolverGrants(u, resolver);
      return finishPreview(input.operation, await resolver.preview(u, input.operation));
    });
  }
  commands() {
    const { hooks, registry } = this;
    const definition: CommandDefinition<SettlementCommand> = {
      family: settlementFamily,
      kind: 'settlement.confirm',
      capability: 'settlements',
      authorize: async (u, value, recovery) => {
        if (recovery) {
          const ref = value as { branchId?: unknown; operation?: unknown };
          if (typeof ref.branchId !== 'string' || typeof ref.operation !== 'string')
            throw new AccessError('FORBIDDEN_SCOPE');
          u.assertBranch(ref.branchId);
          const r = resolverByName(registry, ref.operation);
          if (!r) throw new AccessError('FORBIDDEN_SCOPE');
          assertResolverGrants(u, r);
          return;
        }
        if (!validateSettlementCommand(value)) throw new AccessError('VALIDATION_FAILED', 400);
        assertResolverGrants(u, resolverFor(registry, value.operation));
      },
      rejectionReference: async (input, u) => {
        const r = resolverFor(registry, input.operation);
        let branchId = u.access.assignedBranches[0]?.id ?? '';
        try {
          branchId = await r.branchOf(u, input.operation);
        } catch {
          /* The original scope check already decided access; keep a readable reference. */
        }
        return { entityId: input.commandId, branchId, operation: r.operation };
      },
      resolve: async (u, ref) => {
        const row = (
          await u.client.query<{ result: SettlementResult }>(
            'SELECT result FROM settlements.command_outcome WHERE company_id=$1 AND command_record_id=$2',
            [u.access.companyId, ref.recordId],
          )
        ).rows[0];
        if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
        return row.result;
      },
      execute: async (u, input, recordId) => {
        if (!validateSettlementCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
        const resolver = resolverFor(registry, input.operation);
        assertResolverGrants(u, resolver);
        const state = newConfirmState();
        const ctx = confirmContext(
          u,
          input.operation,
          {
            recordId,
            reason: input.reason.trim(),
            expectedVersions: input.expectedVersions,
            expectedDigest: input.expectedDigest,
            hooks,
            resolver,
          },
          state,
        );
        const outcome = await resolver.confirm(u, input.operation, ctx);
        if (!state.caseId || !state.resolutionId || !state.preview)
          throw new Error('SETTLEMENT_NOT_RECORDED');
        const company = u.access.companyId;
        for (const l of state.links)
          await u.client.query(
            `INSERT INTO settlements.case_link(company_id,case_id,resolution_id,role,entity_kind,entity_id,label) VALUES($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT DO NOTHING`,
            [company, state.caseId, state.resolutionId, l.role, l.entityKind, l.entityId, l.label],
          );
        await hooks.fault?.('links');
        const before = (
          await u.client.query<{ version: number }>(
            'SELECT version FROM settlements.adjustment_case WHERE company_id=$1 AND id=$2',
            [company, state.caseId],
          )
        ).rows[0]!.version;
        let after = before;
        if (outcome.state === 'resolved') {
          await u.client.query(
            `UPDATE settlements.adjustment_case SET state='resolved',version=version+1,resolved_at=clock_timestamp() WHERE company_id=$1 AND id=$2 AND state='open'`,
            [company, state.caseId],
          );
          after = before + 1;
        }
        const result: SettlementResult = {
          commandId: input.commandId,
          caseId: state.caseId,
          caseReference: state.caseReference!,
          resolutionId: state.resolutionId,
          operation: resolver.operation,
          classification: state.preview.classification,
          state: outcome.state,
          preview: state.preview,
          links: state.links,
        };
        await u.client.query(
          'INSERT INTO settlements.command_outcome(company_id,command_record_id,result) VALUES($1,$2,$3)',
          [company, recordId, JSON.stringify(result)],
        );
        await hooks.fault?.('result');
        return {
          reply: { status: 200, body: result },
          reference: {
            recordId,
            caseId: state.caseId,
            branchId: state.preview.target.branchId,
            operation: resolver.operation,
          },
          entityId: state.caseId,
          beforeVersion: before,
          afterVersion: after,
        };
      },
    };
    return new CommandService(this.pool, [definition]);
  }
  async confirm(token: string, input: SettlementCommand) {
    if (!validateSettlementCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
    return this.commands().execute(token, input);
  }
  recover(token: string, companyId: string, commandId: string) {
    return this.commands().recover(token, companyId, settlementFamily, commandId);
  }
  /** Read access for a stored case: the same grants its typed operation needs. */
  assertCaseGrants(u: UnitOfWork, operation: string) {
    assertCapability(u.access, 'settlements');
    const r = resolverByName(this.registry, operation);
    if (!r) throw new AccessError('NOT_FOUND', 404);
    for (const c of r.capabilities) assertCapability(u.access, c);
  }
}
