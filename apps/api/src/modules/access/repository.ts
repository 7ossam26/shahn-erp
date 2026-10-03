import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction, type TransactionClient } from '@shahn/database';
import { AccessError, assertCapability, type AccessContext, type Capability } from '@shahn/domain';
import type { AccessCommand, CommandResult, UserFields } from '@shahn/contracts';
import { canonical, digest } from './crypto.js';
import { loadAccess, sessionIdentity, requireMfa, type SessionIdentity } from './sessions.js';

export const commandCapability = (command: AccessCommand): string =>
  command.type.startsWith('role.')
    ? 'access.roles'
    : command.type.startsWith('user.')
      ? 'access.users'
      : 'support';
export async function appendAudit(
  client: TransactionClient,
  actor: {
    principalId: string;
    sessionId: string | null;
    supportSessionId: string | null;
    displayName: string;
  },
  companyId: string,
  action: string,
  entityId: string,
  commandRecordId: string | null,
  before: number | null,
  after: number | null,
  detail: unknown,
) {
  await client.query(
    `INSERT INTO audit_entry(id,company_id,principal_id,session_id,support_session_id,actor_label,action,entity_id,command_record_id,before_version,after_version,detail) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      randomUUID(),
      companyId,
      actor.principalId,
      actor.sessionId,
      actor.supportSessionId,
      actor.displayName,
      action,
      entityId,
      commandRecordId,
      before,
      after,
      JSON.stringify(detail),
    ],
  );
}
async function supportStart(
  client: TransactionClient,
  session: SessionIdentity,
  companyId: string,
  reason: string,
  token: string,
) {
  // Different target companies still share this authenticated support session.
  // Serialize switching it so two concurrent starts cannot leave two active company scopes.
  await client.query('SELECT id FROM access.server_session WHERE id=$1 FOR UPDATE', [session.id]);
  requireMfa(await sessionIdentity(client, token), true);
  await client.query(
    'UPDATE access.support_session SET ended_at=clock_timestamp() WHERE session_id=$1 AND ended_at IS NULL',
    [session.id],
  );
  const id = randomUUID();
  await client.query(
    `INSERT INTO access.support_session(id,session_id,principal_id,company_id,reason,expires_at) VALUES($1,$2,$3,$4,$5,clock_timestamp()+interval '59 minutes 59 seconds')`,
    [id, session.id, session.principal_id, companyId, reason],
  );
  await client.query('UPDATE access.server_session SET company_id=$1 WHERE id=$2', [
    companyId,
    session.id,
  ]);
  return id;
}
async function validateUserLinks(client: TransactionClient, companyId: string, input: UserFields) {
  const role = (
    await client.query('SELECT id FROM access.role WHERE company_id=$1 AND id=$2 AND active', [
      companyId,
      input.roleId,
    ])
  ).rows;
  const branches = (
    await client.query(
      'SELECT id FROM access.branch WHERE company_id=$1 AND id=ANY($2::uuid[]) AND active',
      [companyId, input.branchIds],
    )
  ).rows;
  if (role.length !== 1 || branches.length !== input.branchIds.length)
    throw new AccessError('FORBIDDEN_SCOPE');
}
async function userLinks(
  client: TransactionClient,
  companyId: string,
  userId: string,
  input: UserFields,
) {
  await client.query('DELETE FROM access.user_branch WHERE company_id=$1 AND user_id=$2', [
    companyId,
    userId,
  ]);
  await client.query('DELETE FROM access.user_exception WHERE company_id=$1 AND user_id=$2', [
    companyId,
    userId,
  ]);
  for (const id of input.branchIds)
    await client.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [companyId, userId, id]);
  for (const [capability, effect] of Object.entries(input.exceptions))
    await client.query('INSERT INTO access.user_exception VALUES($1,$2,$3,$4)', [
      companyId,
      userId,
      capability,
      effect,
    ]);
}
export class AccessRepository {
  constructor(readonly pool: Pool) {}
  async context(token: string) {
    return transaction(this.pool, (client) => loadAccess(client, token));
  }
  async read<T>(
    token: string,
    capability: Capability,
    operation: (client: TransactionClient, ctx: AccessContext) => Promise<T>,
  ) {
    return transaction(this.pool, async (client) => {
      const ctx = await loadAccess(client, token);
      assertCapability(ctx, capability);
      return operation(client, ctx);
    });
  }
  async registry(token: string) {
    return transaction(this.pool, async (client) => {
      const ctx = await loadAccess(client, token);
      return {
        context: ctx,
        capabilities: (
          await client.query(
            'SELECT id,title,route,policy,implemented FROM access.screen_capability ORDER BY id',
          )
        ).rows,
      };
    });
  }
  async users(token: string, search = '', page = 0, limit = 25, userId?: string) {
    return this.read(token, 'access.users', async (client, ctx) => {
      const where = `u.company_id=$1 AND (u.name ILIKE $2 OR u.username ILIKE $2) AND ($3::uuid IS NULL OR u.id=$3)`;
      const values = [ctx.companyId, '%' + search.replace(/[\\%_]/g, '\\$&') + '%', userId ?? null];
      const items = (
        await client.query(
          `SELECT u.id,u.name,u.username,u.role_id AS "roleId",u.active,u.version,u.identity_state AS "identityState",u.identity_error AS "identityError",r.name AS "roleName",
        COALESCE((SELECT jsonb_agg(branch_id ORDER BY branch_id) FROM access.user_branch WHERE company_id=u.company_id AND user_id=u.id),'[]') AS "branchIds",
        COALESCE((SELECT jsonb_object_agg(capability,effect) FROM access.user_exception WHERE company_id=u.company_id AND user_id=u.id),'{}') AS exceptions
        FROM access.ordinary_user u JOIN access.role r ON r.company_id=u.company_id AND r.id=u.role_id WHERE ${where} ORDER BY u.name,u.id LIMIT $4 OFFSET $5`,
          [...values, limit, page * limit],
        )
      ).rows;
      if (userId && !items.length) throw new AccessError('NOT_FOUND', 404);
      const total = Number(
        (await client.query(`SELECT count(*) FROM access.ordinary_user u WHERE ${where}`, values))
          .rows[0].count,
      );
      const roles = (
        await client.query(
          `SELECT r.id,r.name,r.active,r.version,COALESCE((SELECT jsonb_agg(capability ORDER BY capability) FROM access.role_grant WHERE company_id=r.company_id AND role_id=r.id),'[]') AS grants FROM access.role r WHERE r.company_id=$1 ORDER BY r.name,r.id`,
          [ctx.companyId],
        )
      ).rows;
      return {
        items,
        total,
        page,
        limit,
        roles,
        branches: ctx.companyBranches,
        authorizationRevision: ctx.authorizationRevision,
      };
    });
  }
  async roles(token: string) {
    return this.read(token, 'access.roles', async (client, ctx) => ({
      items: (
        await client.query(
          `SELECT r.id,r.name,r.active,r.version,COALESCE((SELECT jsonb_agg(capability ORDER BY capability) FROM access.role_grant WHERE company_id=r.company_id AND role_id=r.id),'[]') AS grants FROM access.role r WHERE r.company_id=$1 ORDER BY r.name,r.id`,
          [ctx.companyId],
        )
      ).rows,
      authorizationRevision: ctx.authorizationRevision,
    }));
  }
  async support(token: string) {
    return transaction(this.pool, async (client) => {
      const s = await sessionIdentity(client, token);
      requireMfa(s);
      return {
        companies: (
          await client.query(
            'SELECT id,code,name,active,version FROM access.company ORDER BY name,id',
          )
        ).rows,
      };
    });
  }
  async supportBranches(token: string) {
    return transaction(this.pool, async (client) => {
      const ctx = await loadAccess(client, token);
      if (ctx.principalKind !== 'support') throw new AccessError('FORBIDDEN_SCOPE');
      return {
        items: (
          await client.query(
            'SELECT id,name,active,version FROM access.branch WHERE company_id=$1 ORDER BY name,id',
            [ctx.companyId],
          )
        ).rows,
      };
    });
  }
  async audit(token: string) {
    return this.read(token, 'access.users', async (client, ctx) => ({
      items: (
        await client.query(
          `SELECT a.id,CASE WHEN p.kind='support' THEN 'Technical Support' ELSE 'موظف: ' || a.actor_label END AS actor,a.action,a.entity_id AS "entityId",a.before_version AS "beforeVersion",a.after_version AS "afterVersion",a.occurred_at AS at FROM audit_entry a JOIN access.principal p ON p.id=a.principal_id WHERE a.company_id=$1 ORDER BY a.occurred_at DESC,a.id DESC LIMIT 100`,
          [ctx.companyId],
        )
      ).rows,
    }));
  }
  async recover(token: string, commandId: string) {
    return transaction(this.pool, async (client) => {
      const ctx = await loadAccess(client, token);
      const rows = (
        await client.query<{ capability: string; result: CommandResult }>(
          `SELECT capability,COALESCE(result,result_reference) AS result FROM command_record WHERE company_id=$1 AND principal_id=$2 AND command_id=$3 AND kind NOT LIKE 'kernel.%' ORDER BY created_at DESC LIMIT 2`,
          [ctx.companyId, ctx.principalId, commandId],
        )
      ).rows;
      // Families are part of command identity. Never return an arbitrary other family's result.
      if (rows.length > 1) throw new AccessError('COMMAND_FAMILY_REQUIRED', 409);
      const row = rows[0];
      if (!row) throw new AccessError('NOT_FOUND', 404);
      if (row.capability === 'support') {
        if (ctx.principalKind !== 'support') throw new AccessError('FORBIDDEN_SCOPE');
      } else assertCapability(ctx, row.capability as Capability);
      return row.result;
    });
  }
  async command(token: string, input: AccessCommand): Promise<CommandResult> {
    try {
      const outcome = await transaction<CommandResult | AccessError>(this.pool, async (client) => {
        let s = await sessionIdentity(client, token);
        const capability = commandCapability(input);
        const isStart = input.type === 'company.create' || input.type === 'support.start';
        let ctx: AccessContext | null = null;
        if (isStart) {
          requireMfa(s, true);
          // Advisory scope also serializes first-company creation before a company row exists.
          await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
            input.companyId,
          ]);
          if (input.type === 'support.start') {
            const c = (
              await client.query(
                'SELECT id FROM access.company WHERE id=$1 AND active FOR UPDATE',
                [input.companyId],
              )
            ).rows[0];
            if (!c) throw new AccessError('FORBIDDEN_SCOPE');
          }
          s = await sessionIdentity(client, token);
          requireMfa(s, true);
        } else {
          ctx = await loadAccess(client, token, input.companyId, true);
          if (capability === 'support') {
            if (ctx.principalKind !== 'support') throw new AccessError('FORBIDDEN_SCOPE');
          } else assertCapability(ctx, capability as Capability);
        }
        const payload = canonical(input),
          payloadDigest = digest(payload);
        const prior = (
          await client.query<{ payload_digest: string; result: CommandResult }>(
            'SELECT payload_digest,COALESCE(result,result_reference) AS result FROM command_record WHERE company_id=$1 AND principal_id=$2 AND family=$3 AND command_id=$4',
            [input.companyId, s.principal_id, input.type, input.commandId],
          )
        ).rows[0];
        if (prior) {
          if (prior.payload_digest !== payloadDigest)
            throw new AccessError('COMMAND_PAYLOAD_CONFLICT', 409);
          // Start replay cannot resurrect an expired support session.
          if (isStart) await loadAccess(client, token, input.companyId);
          if (
            prior.result.state === 'rejected' &&
            prior.result.errorCode &&
            ['REVISION_CONFLICT', 'IDENTITY_PENDING', 'IDENTITY_CONFLICT'].includes(
              prior.result.errorCode,
            )
          )
            return new AccessError(prior.result.errorCode, 409);
          return prior.result;
        }
        const recordId = randomUUID();
        let entityId = 'entityId' in input ? input.entityId : randomUUID(),
          version = 1,
          jobId: string | null = null,
          supportId = ctx?.supportSessionId ?? null;
        await client.query('SAVEPOINT access_effects');
        try {
          if (input.type === 'company.create') {
            entityId = input.companyId;
            await client.query('INSERT INTO access.company(id,code,name) VALUES($1,$2,$3)', [
              entityId,
              input.code,
              input.name,
            ]);
            supportId = await supportStart(client, s, entityId, input.reason, token);
          } else if (input.type === 'support.start') {
            supportId = await supportStart(client, s, input.companyId, input.reason, token);
            entityId = supportId;
          } else if (input.type === 'user.create' || input.type === 'user.update') {
            await validateUserLinks(client, input.companyId, input);
            if (input.type === 'user.create') {
              await client.query("INSERT INTO access.principal(id,kind) VALUES($1,'staff')", [
                entityId,
              ]);
              await client.query(
                `INSERT INTO access.ordinary_user(id,company_id,role_id,username,name,active,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,
                [
                  entityId,
                  input.companyId,
                  input.roleId,
                  input.username,
                  input.name,
                  input.active,
                  randomUUID(),
                ],
              );
            } else {
              const pending = (
                await client.query(
                  `SELECT id FROM work_item WHERE company_id=$1 AND entity_id=$2 AND state IN ('pending','leased')`,
                  [input.companyId, entityId],
                )
              ).rows[0];
              if (pending) throw new AccessError('IDENTITY_PENDING', 409);
              const updated = await client.query(
                `UPDATE access.ordinary_user SET name=$1,role_id=$2,active=$3,version=version+1,identity_state='pending',identity_error=NULL WHERE company_id=$4 AND id=$5 AND version=$6 RETURNING version`,
                [
                  input.name,
                  input.roleId,
                  input.active,
                  input.companyId,
                  entityId,
                  input.expectedVersion,
                ],
              );
              if (!updated.rowCount) throw new AccessError('REVISION_CONFLICT', 409);
              version = updated.rows[0].version;
            }
            await userLinks(client, input.companyId, entityId, input);
            jobId = randomUUID();
          } else if (input.type === 'role.create' || input.type === 'role.update') {
            if (input.type === 'role.create')
              await client.query(
                'INSERT INTO access.role(id,company_id,name,active) VALUES($1,$2,$3,$4)',
                [entityId, input.companyId, input.name, input.active],
              );
            else {
              const updated = await client.query(
                'UPDATE access.role SET name=$1,active=$2,version=version+1 WHERE company_id=$3 AND id=$4 AND version=$5 RETURNING version',
                [input.name, input.active, input.companyId, entityId, input.expectedVersion],
              );
              if (!updated.rowCount) throw new AccessError('REVISION_CONFLICT', 409);
              version = updated.rows[0].version;
              await client.query(
                'DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2',
                [input.companyId, entityId],
              );
            }
            for (const grant of input.grants)
              await client.query('INSERT INTO access.role_grant VALUES($1,$2,$3)', [
                input.companyId,
                entityId,
                grant,
              ]);
          } else if (input.type === 'branch.create') {
            await client.query('INSERT INTO access.branch(id,company_id,name) VALUES($1,$2,$3)', [
              entityId,
              input.companyId,
              input.name,
            ]);
          } else if (input.type === 'branch.update') {
            const updated = await client.query(
              'UPDATE access.branch SET name=$1,active=$2,version=version+1 WHERE company_id=$3 AND id=$4 AND version=$5 RETURNING version',
              [input.name, input.active, input.companyId, entityId, input.expectedVersion],
            );
            if (!updated.rowCount) throw new AccessError('REVISION_CONFLICT', 409);
            version = updated.rows[0].version;
          } else if (input.type === 'company.update') {
            entityId = input.companyId;
            const updated = await client.query(
              'UPDATE access.company SET name=$1,active=$2,version=version+1 WHERE id=$3 AND version=$4 RETURNING version',
              [input.name, input.active, input.companyId, input.expectedVersion],
            );
            if (!updated.rowCount) throw new AccessError('REVISION_CONFLICT', 409);
            version = updated.rows[0].version;
          }
          const result: CommandResult = {
            commandId: input.commandId,
            entityId,
            version,
            state: jobId ? 'pending' : 'completed',
            jobId,
            errorCode: null,
          };
          await client.query(
            `INSERT INTO command_record(id,company_id,principal_id,command_id,family,capability,payload_digest,payload,result,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              recordId,
              input.companyId,
              s.principal_id,
              input.commandId,
              input.type,
              capability,
              payloadDigest,
              payload,
              JSON.stringify(result),
              result.state,
            ],
          );
          if (jobId) {
            const user = (
              await client.query<{
                correlation_id: string;
                username: string;
                active: boolean;
                name: string;
              }>(
                'SELECT correlation_id,username,active,name FROM access.ordinary_user WHERE company_id=$1 AND id=$2',
                [input.companyId, entityId],
              )
            ).rows[0]!;
            const company = (
              await client.query<{ code: string }>('SELECT code FROM access.company WHERE id=$1', [
                input.companyId,
              ])
            ).rows[0]!;
            const work = {
              username: user.username,
              name: user.name,
              enabled: user.active,
              correlationId: user.correlation_id,
              companyId: input.companyId,
              companyCode: company.code,
            };
            await client.query(
              `INSERT INTO work_item(id,company_id,principal_id,command_record_id,entity_id,entity_version,lane,correlation_id,payload,payload_digest) VALUES($1,$2,$3,$4,$5,$6,'identity',$7,$8,$9)`,
              [
                jobId,
                input.companyId,
                s.principal_id,
                recordId,
                entityId,
                version,
                user.correlation_id,
                canonical(work),
                digest(canonical(work)),
              ],
            );
          }
          await appendAudit(
            client,
            {
              principalId: s.principal_id,
              sessionId: s.id,
              supportSessionId: supportId,
              displayName: ctx?.displayName ?? 'Technical Support',
            },
            input.companyId,
            input.type,
            entityId,
            recordId,
            'expectedVersion' in input ? input.expectedVersion : null,
            version,
            { ...input },
          );
          await client.query(
            'UPDATE access.company SET authorization_revision=authorization_revision+1 WHERE id=$1',
            [input.companyId],
          );
          return result;
        } catch (error) {
          const rejection =
            error instanceof AccessError
              ? error
              : (error as { code?: string }).code === '23505'
                ? new AccessError('IDENTITY_CONFLICT', 409)
                : null;
          if (!ctx || rejection?.status !== 409) throw error;
          await client.query('ROLLBACK TO SAVEPOINT access_effects');
          const rejected: CommandResult = {
            commandId: input.commandId,
            entityId,
            version: 'expectedVersion' in input ? input.expectedVersion : 1,
            state: 'rejected',
            jobId: null,
            errorCode: rejection.code,
          };
          await client.query(
            `INSERT INTO command_record(id,company_id,principal_id,command_id,family,capability,payload_digest,payload,result,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'rejected')`,
            [
              recordId,
              input.companyId,
              s.principal_id,
              input.commandId,
              input.type,
              capability,
              payloadDigest,
              payload,
              JSON.stringify(rejected),
            ],
          );
          await appendAudit(
            client,
            ctx,
            input.companyId,
            input.type + '.rejected',
            entityId,
            recordId,
            'expectedVersion' in input ? input.expectedVersion : null,
            null,
            { code: rejection.code },
          );
          return rejection;
        }
      });
      if (outcome instanceof AccessError) throw outcome;
      return outcome;
    } catch (error) {
      if (error instanceof AccessError) throw error;
      const code = (error as { code?: string }).code;
      if (code === '23505') throw new AccessError('IDENTITY_CONFLICT', 409);
      if (code === '23503' || code === '23514') throw new AccessError('FORBIDDEN_SCOPE');
      throw error;
    }
  }
}
