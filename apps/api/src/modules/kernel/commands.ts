import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError, type Capability } from '@shahn/domain';
import { canonical, digest } from '../access/crypto.js';
import { appendAudit } from '../access/repository.js';
import { UnitOfWork } from './unit-of-work.js';

export interface CommandInput {
  commandId: string;
  companyId: string;
  schemaVersion: 1;
  type: string;
}
export interface CommandReply {
  status: number;
  body: unknown;
}
export interface CommandRecord {
  state: string;
  id: string;
  kind: string;
  capability: Capability;
  payload_digest: string;
  result: unknown | null;
  result_reference: Record<string, unknown>;
  response_status: number;
  compacted_at: Date | null;
}
export interface CommandDefinition<I extends CommandInput> {
  family: string;
  kind: string;
  capability: Capability;
  authorize(uow: UnitOfWork, value: I | Record<string, unknown>, recovery: boolean): Promise<void>;
  /** Optional protected-history maintenance after identity locking but before business effects.
   * May materialize existing past facts; must never perform the requested money mutation. */
  prepareProtectedHistory?(uow: UnitOfWork, input: I): Promise<void>;
  execute(
    uow: UnitOfWork,
    input: I,
    recordId: string,
  ): Promise<{
    reply: CommandReply;
    reference: Record<string, unknown>;
    entityId: string;
    beforeVersion: number | null;
    afterVersion: number | null;
  }>;
  resolve(uow: UnitOfWork, reference: Record<string, unknown>, status: number): Promise<unknown>;
  rejectionReference(
    input: I,
    uow: UnitOfWork,
  ): { entityId: string; branchId: string } | Promise<{ entityId: string; branchId: string }>;
}
export class RetainedCommandError extends AccessError {
  constructor(readonly reply: CommandReply) {
    super((reply.body as { code: string }).code, reply.status);
  }
}
function retainedBody(
  row: CommandRecord,
  uow: UnitOfWork,
  definition: CommandDefinition<CommandInput>,
): Promise<unknown> | unknown {
  if (!row.compacted_at) return row.result;
  return row.state === 'rejected'
    ? row.result_reference.rejection
    : definition.resolve(uow, row.result_reference, row.response_status);
}
/** Server-registered commands only. No effect-list HTTP endpoint. */
export class CommandService<I extends CommandInput> {
  constructor(
    readonly pool: Pool,
    readonly definitions: readonly CommandDefinition<I>[],
  ) {
    if (new Set(definitions.map((d) => d.kind)).size !== definitions.length)
      throw new Error('DUPLICATE_COMMAND_KIND');
  }
  private definition(kind: string) {
    const definition = this.definitions.find((d) => d.kind === kind);
    if (!definition) throw new AccessError('UNKNOWN_COMMAND_KIND', 400);
    return definition;
  }
  execute(token: string, input: I): Promise<CommandReply> {
    const definition = this.definition(input.type);
    return UnitOfWork.run(this.pool, token, input.companyId, definition.capability, async (uow) => {
      const { client, access } = uow;
      await definition.authorize(uow, input, false);
      uow.lockOrder('identity', 'command');
      const payload = canonical(input),
        hash = digest(payload),
        recordId = randomUUID();
      const inserted = await client.query(
        `INSERT INTO command_record(id,company_id,principal_id,command_id,family,kind,capability,
          payload_digest,payload,result,state,response_status,result_reference)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'{}','pending',202,'{}')
         ON CONFLICT(company_id,principal_id,family,command_id) DO NOTHING RETURNING id`,
        [
          recordId,
          access.companyId,
          access.principalId,
          input.commandId,
          definition.family,
          definition.kind,
          definition.capability,
          hash,
          payload,
        ],
      );
      const row = (
        await client.query<CommandRecord>(
          `SELECT * FROM command_record WHERE company_id=$1 AND principal_id=$2 AND family=$3 AND command_id=$4 FOR UPDATE`,
          [access.companyId, access.principalId, definition.family, input.commandId],
        )
      ).rows[0]!;
      if (!inserted.rowCount) {
        if (row.kind !== input.type || row.payload_digest !== hash)
          throw new AccessError('COMMAND_PAYLOAD_CONFLICT', 409);
        await definition.authorize(uow, row.result_reference, true);
        return { status: row.response_status, body: await retainedBody(row, uow, definition) };
      }
      await definition.prepareProtectedHistory?.(uow, input);
      await client.query('SAVEPOINT command_effects');
      let result;
      try {
        result = await definition.execute(uow, input, recordId);
      } catch (error) {
        if (!(error instanceof AccessError) || error.status !== 409) throw error;
        await client.query('ROLLBACK TO SAVEPOINT command_effects');
        const reference = await definition.rejectionReference(input, uow);
        const body = {
          code: error.code,
          messageKey: 'kernel.' + error.code.toLowerCase(),
          commandId: input.commandId,
          correlationId: randomUUID(),
          ...('details' in error ? { details: error.details } : {}),
          ...(error.currentVersion === undefined ? {} : { currentVersion: error.currentVersion }),
        };
        await client.query(
          `UPDATE command_record SET state='rejected',result=$1,response_status=409,result_reference=$2 WHERE id=$3`,
          [JSON.stringify(body), JSON.stringify({ ...reference, rejection: body }), recordId],
        );
        await appendAudit(
          client,
          access,
          access.companyId,
          definition.kind + '.rejected',
          reference.entityId,
          recordId,
          null,
          null,
          { code: error.code },
        );
        return { status: 409, body };
      }
      await appendAudit(
        client,
        access,
        access.companyId,
        definition.kind,
        result.entityId,
        recordId,
        result.beforeVersion,
        result.afterVersion,
        { resultReference: result.reference },
      );
      await client.query(
        `UPDATE command_record SET state='completed',result=$1,response_status=$2,
        result_reference=$3 WHERE id=$4`,
        [
          JSON.stringify(result.reply.body),
          result.reply.status,
          JSON.stringify(result.reference),
          recordId,
        ],
      );
      return result.reply;
    }).then((reply) => {
      if (reply.status >= 400) throw new RetainedCommandError(reply);
      return reply;
    });
  }
  async recover(
    token: string,
    companyId: string,
    family: string,
    commandId: string,
  ): Promise<CommandReply> {
    const candidates = this.definitions.filter((d) => d.family === family);
    if (!candidates[0]) throw new AccessError('NOT_FOUND', 404);
    return UnitOfWork.run(this.pool, token, companyId, candidates[0].capability, async (uow) => {
      const row = (
        await uow.client.query<CommandRecord>(
          `SELECT * FROM command_record WHERE company_id=$1 AND principal_id=$2 AND family=$3 AND command_id=$4`,
          [companyId, uow.access.principalId, family, commandId],
        )
      ).rows[0];
      if (!row) throw new AccessError('NOT_FOUND', 404);
      const definition = this.definition(row.kind);
      if (!uow.access.grants.includes(definition.capability))
        throw new AccessError('FORBIDDEN_SCOPE');
      await definition.authorize(uow, row.result_reference, true);
      return { status: row.response_status, body: await retainedBody(row, uow, definition) };
    });
  }
}

/** Pending commands and all business/audit records remain untouched. */
export async function compactCommandResults(pool: Pool): Promise<number> {
  const result =
    await pool.query(`UPDATE command_record SET payload=NULL,result=NULL,compacted_at=clock_timestamp()
    WHERE state IN ('completed','rejected') AND compacted_at IS NULL AND retain_until<=clock_timestamp()
      AND result_reference <> '{}'::jsonb`);
  return result.rowCount ?? 0;
}
