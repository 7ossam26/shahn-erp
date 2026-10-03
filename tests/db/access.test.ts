import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { authorizeResource } from '@shahn/domain';
import { createApplication } from '../../apps/api/src/app.js';
import { AccessRepository } from '../../apps/api/src/modules/access/repository.js';
import { IdentityWorker } from '../../apps/api/src/modules/access/worker.js';
import { IssuerFailure } from '../../apps/api/src/modules/access/identity.js';
import { bootstrapSupport } from '../../apps/api/src/modules/access/bootstrap.js';
import { createSession } from '../../apps/api/src/modules/access/sessions.js';
import { accessFixture } from '../support/access.js';
import type { AccessCommand } from '@shahn/contracts';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  fixture: Awaited<ReturnType<typeof accessFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  repo: AccessRepository,
  origin: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  fixture = await accessFixture(db.pool);
  repo = new AccessRepository(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    fixture.config,
  );
  // Real HTTP probes are test-only consumers of the production authorization service. No domain workflow is added.
  app
    .getHttpAdapter()
    .getInstance()
    .get('/policy-probe', async (request, reply) => {
      const q = request.query as {
        capability: string;
        branchId: string;
        companyId: string;
        operation: string;
        dataClass: string;
      };
      try {
        return await repo.read(
          String(request.headers['x-test-session']),
          q.capability as 'tracking',
          async (_client, ctx) => {
            authorizeResource(ctx, q.capability as 'tracking', {
              companyId: q.companyId,
              branchId: q.branchId,
              operation: q.operation as 'read',
              dataClass: q.dataClass as 'operational',
              stateAllowed: true,
            });
            return { allowed: true };
          },
        );
      } catch {
        return reply.code(403).send({ code: 'FORBIDDEN_SCOPE' });
      }
    });
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await db?.dispose();
});
const base = () => ({
  schemaVersion: 1 as const,
  commandId: randomUUID(),
  companyId: fixture.company,
});
async function http(
  path: string,
  who = fixture.admin,
  command?: unknown,
  extra: Record<string, string> = {},
) {
  const response = await fetch(origin + '/api/v1/access' + path, {
    method: command ? 'POST' : 'GET',
    headers: {
      cookie: `erp_session=${who.token}`,
      origin: fixture.config.origin,
      'x-csrf-token': who.csrfToken,
      ...(command ? { 'content-type': 'application/json' } : {}),
      ...extra,
    },
    ...(command ? { body: JSON.stringify(command) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
describe('P02 real PostgreSQL and server authorization', () => {
  it('same-company constraints reject cross-branch assignment and ordinary support-account linkage', async () => {
    await expect(
      db.pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [
        fixture.company,
        fixture.staffA.id,
        fixture.foreign,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      db.pool.query(
        "INSERT INTO access.ordinary_user(id,company_id,role_id,username,name,correlation_id) VALUES($1,$2,$3,'support-pretend','support',$4)",
        [fixture.support.id, fixture.company, fixture.adminRole, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });
  it('ordinary branch queries distinguish A, B and A+B; tracking operational read is company-wide', async () => {
    for (const [user, expected] of [
      [fixture.staffA, [fixture.a]],
      [fixture.staffB, [fixture.b]],
      [fixture.staffAB, [fixture.a, fixture.b]],
    ] as const) {
      const result = await http('/scope/inventory', user);
      expect(result.status).toBe(200);
      expect(result.body.branchIds.sort()).toEqual([...expected].sort());
    }
    const probe = async (
      capability: string,
      branchId: string,
      operation = 'read',
      dataClass = 'operational',
      companyId = fixture.company,
    ) =>
      (
        await fetch(
          origin +
            '/policy-probe?' +
            new URLSearchParams({ capability, branchId, operation, dataClass, companyId }),
          { headers: { 'x-test-session': fixture.staffA.token } },
        )
      ).status;
    expect(await probe('inventory', fixture.b)).toBe(403);
    expect(await probe('tracking', fixture.b)).toBe(200);
    expect(await probe('tracking', fixture.b, 'write')).toBe(403);
    expect(await probe('tracking', fixture.b, 'read', 'employee')).toBe(403);
    expect(await probe('tracking', fixture.b, 'export')).toBe(403);
    expect(await probe('tracking', fixture.foreign, 'read', 'operational', fixture.other)).toBe(
      403,
    );
  });
  it('closed API rejects forged headers, support self-grant and missing CSRF with no partial writes', async () => {
    const input = {
      ...base(),
      type: 'role.create',
      name: 'bad',
      grants: ['support'],
      active: true,
    };
    expect((await http('/commands', fixture.admin, input)).status).toBe(400);
    expect(
      (await http('/users', fixture.admin, undefined, { 'x-company-id': fixture.other })).status,
    ).toBe(403);
    expect(
      (
        await http(
          '/commands',
          fixture.admin,
          { ...input, grants: [] },
          { 'x-csrf-token': 'wrong' },
        )
      ).status,
    ).toBe(403);
    expect((await db.pool.query('SELECT count(*) FROM command_record')).rows[0].count).toBe('0');
  });
  it('concurrent duplicate command commits one result and immutable audit; changed payload/stale edit rejected', async () => {
    const cmd: AccessCommand = {
      ...base(),
      type: 'role.create',
      name: 'موظف بدور قابل للتعديل',
      grants: ['access.roles'],
      active: true,
    };
    const [a, b] = await Promise.all([
      repo.command(fixture.admin.token, cmd),
      repo.command(fixture.admin.token, cmd),
    ]);
    expect(a).toEqual(b);
    expect(
      (await db.pool.query('SELECT count(*) FROM audit_entry WHERE entity_id=$1', [a.entityId]))
        .rows[0].count,
    ).toBe('1');
    await expect(
      repo.command(fixture.admin.token, { ...cmd, name: 'different' }),
    ).rejects.toMatchObject({ code: 'COMMAND_PAYLOAD_CONFLICT' });
    const edit: AccessCommand = {
      ...base(),
      type: 'role.update',
      entityId: a.entityId,
      expectedVersion: 1,
      name: 'new',
      grants: [],
      active: true,
    };
    await repo.command(fixture.admin.token, edit);
    const stale = { ...edit, commandId: randomUUID() };
    await expect(repo.command(fixture.admin.token, stale)).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    expect((await repo.recover(fixture.admin.token, stale.commandId)).state).toBe('rejected');
    await expect(
      repo.command(fixture.admin.token, { ...stale, expectedVersion: 2 }),
    ).rejects.toMatchObject({ code: 'COMMAND_PAYLOAD_CONFLICT' });
    await expect(
      db.pool.query('UPDATE audit_entry SET actor_label=$1 WHERE entity_id=$2', [
        'hidden',
        a.entityId,
      ]),
    ).rejects.toThrow('IMMUTABLE_AUDIT');
  });
  it('user creation commits pending native identity, work, command and audit together; unknown stays pending after restart', async () => {
    const cmd: AccessCommand = {
      ...base(),
      type: 'user.create',
      username: 'pending-user',
      name: 'مستخدم منتظر',
      roleId: fixture.staffRole,
      branchIds: [fixture.a],
      exceptions: {},
      active: true,
    };
    const result = await repo.command(fixture.admin.token, cmd);
    expect(result.state).toBe('pending');
    const record = (await db.pool.query('SELECT * FROM work_item WHERE id=$1', [result.jobId]))
      .rows[0];
    expect(record.payload.correlationId).toBeTruthy();
    const worker = new IdentityWorker(db.pool, {
      config: fixture.config,
      reconcile: async () => {
        throw new IssuerFailure('unknown', 'ISSUER_RESULT_UNKNOWN');
      },
    });
    await worker.runOne();
    expect((await repo.recover(fixture.admin.token, cmd.commandId)).state).toBe('pending');
    await db.pool.query('UPDATE work_item SET available_at=clock_timestamp() WHERE id=$1', [
      result.jobId,
    ]);
    const restarted = new IdentityWorker(db.pool, {
      config: fixture.config,
      reconcile: async (intent) => intent.correlationId,
    });
    await restarted.runOne();
    expect((await repo.recover(fixture.admin.token, cmd.commandId)).state).toBe('completed');
    expect(
      (
        await db.pool.query('SELECT subject FROM access.issuer_binding WHERE principal_id=$1', [
          result.entityId,
        ])
      ).rows[0].subject,
    ).toBe(record.payload.correlationId);
    expect((await repo.command(fixture.admin.token, cmd)).entityId).toBe(result.entityId);
  });
  it('a definite invalid issuer intent stays rejected; corrected reviewed intent gets a new command', async () => {
    const cmd: AccessCommand = {
      ...base(),
      type: 'user.create',
      username: 'invalid-user',
      name: 'مراجعة',
      roleId: fixture.staffRole,
      branchIds: [fixture.a],
      exceptions: {},
      active: true,
    };
    const result = await repo.command(fixture.admin.token, cmd);
    const worker = new IdentityWorker(db.pool, {
      config: fixture.config,
      reconcile: async () => {
        throw new IssuerFailure('invalid', 'ISSUER_INVALID_REQUEST');
      },
    });
    await worker.runOne();
    expect((await repo.recover(fixture.admin.token, cmd.commandId)).state).toBe('rejected');
    expect(await worker.runOne()).toBe(false);
    expect((await repo.command(fixture.admin.token, cmd)).state).toBe('rejected');
    const corrected = await repo.command(fixture.admin.token, {
      ...base(),
      type: 'user.update',
      entityId: result.entityId,
      expectedVersion: 1,
      name: 'تمت المراجعة',
      roleId: fixture.staffRole,
      branchIds: [fixture.a],
      exceptions: {},
      active: true,
    });
    expect(corrected.jobId).not.toBe(result.jobId);
    await new IdentityWorker(db.pool, {
      config: fixture.config,
      reconcile: async (i) => i.correlationId,
    }).runOne();
  });
  it('foreign-company user edits roll back every row; bootstrap is durable and has no HTTP endpoint', async () => {
    const before = (await db.pool.query('SELECT count(*) FROM command_record')).rows[0].count;
    await expect(
      repo.command(fixture.admin.token, {
        ...base(),
        type: 'user.create',
        username: 'foreign',
        name: 'bad',
        roleId: fixture.staffRole,
        branchIds: [fixture.foreign],
        exceptions: {},
        active: true,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_SCOPE' });
    expect((await db.pool.query('SELECT count(*) FROM command_record')).rows[0].count).toBe(before);
    await expect(bootstrapSupport(db.pool, fixture.config.issuer, randomUUID())).rejects.toThrow(
      'BOOTSTRAP_ALREADY_COMPLETED',
    );
    expect((await fetch(origin + '/api/v1/access/setup')).status).toBe(404);
  });
  it('support is separate, MFA bound, reasoned, attributed and expires on the next action', async () => {
    const support = fixture.support;
    await repo.command(support.token, {
      ...base(),
      type: 'support.start',
      reason: 'مراجعة إعداد الفروع بطلب الشركة',
    });
    const branch = await repo.command(support.token, {
      ...base(),
      type: 'branch.create',
      name: 'فرع الدعم',
    });
    const audit = (
      await db.pool.query('SELECT * FROM audit_entry WHERE entity_id=$1', [branch.entityId])
    ).rows[0];
    expect(audit.actor_label).toBe('Technical Support');
    expect(audit.principal_id).toBe(support.id);
    expect(audit.support_session_id).toBeTruthy();
    expect((await repo.users(fixture.admin.token)).items.some((u) => u.id === support.id)).toBe(
      false,
    );
    await db.pool.query(
      "UPDATE access.support_session SET expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1",
      [audit.session_id],
    );
    await expect(
      repo.command(support.token, { ...base(), type: 'branch.create', name: 'expired' }),
    ).rejects.toMatchObject({ code: 'SUPPORT_SESSION_REQUIRED' });
    await db.pool.query('UPDATE access.server_session SET mfa=false WHERE id=$1', [
      audit.session_id,
    ]);
    await expect(
      repo.command(support.token, {
        ...base(),
        type: 'support.start',
        reason: 'should require multi factor',
      }),
    ).rejects.toMatchObject({ code: 'SUPPORT_MFA_REQUIRED' });
  });
  it('revocation affects an already open session, totals, recovered results and file downloads', async () => {
    const other = await fixture.make('delegated', [fixture.a], fixture.adminRole);
    const cmd: AccessCommand = {
      ...base(),
      type: 'role.create',
      name: 'made before revocation',
      grants: [],
      active: true,
    };
    await repo.command(other.token, cmd);
    expect((await http('/users', other)).status).toBe(200);
    await db.pool.query(
      "INSERT INTO access.user_exception VALUES($1,$2,'access.roles','deny'),($1,$2,'access.users','deny')",
      [fixture.company, other.id],
    );
    await db.pool.query(
      'UPDATE access.company SET authorization_revision=authorization_revision+1 WHERE id=$1',
      [fixture.company],
    );
    expect((await http('/users', other)).status).toBe(403);
    expect((await http('/commands/' + cmd.commandId, other)).status).toBe(403);
    expect((await http('/commands/' + cmd.commandId + '/download', other)).status).toBe(403);
    expect((await repo.context(other.token)).grants).not.toContain('access.roles');
    await db.pool.query('UPDATE access.ordinary_user SET active=false WHERE id=$1', [other.id]);
    expect((await http('/context', other)).status).toBe(403);
  });
  it('expired idle/absolute sessions cannot read; server-only token ciphertext is absent from API', async () => {
    const user = await fixture.make('expired', [fixture.a]);
    const session = await http('/session', user);
    expect(Object.keys(session.body).sort()).toEqual([
      'companyId',
      'csrfToken',
      'kind',
      'principalId',
    ]);
    await db.pool.query(
      "UPDATE access.server_session SET idle_expires_at=clock_timestamp()-interval '1 second' WHERE principal_id=$1",
      [user.id],
    );
    expect((await http('/context', user)).status).toBe(401);
  });
  it('role revocation through the real command API denies an old session and its retained command result', async () => {
    const role = await repo.command(fixture.admin.token, {
      ...base(),
      type: 'role.create',
      name: 'revocation via API',
      grants: ['access.roles'],
      active: true,
    });
    const user = await fixture.make('role-revoked', [fixture.a], role.entityId);
    const created = await http('/commands', user, {
      ...base(),
      type: 'role.create',
      name: 'before-revocation',
      grants: [],
      active: true,
    });
    expect(created.status).toBe(200);
    expect((await http('/roles', user)).status).toBe(200);
    expect(
      (
        await http('/commands', fixture.admin, {
          ...base(),
          type: 'role.update',
          entityId: role.entityId,
          expectedVersion: 1,
          name: 'revocation via API',
          grants: [],
          active: true,
        })
      ).status,
    ).toBe(200);
    expect((await http('/roles', user)).status).toBe(403);
    expect((await http('/commands/' + created.body.commandId, user)).status).toBe(403);
  });
  it('failure at audit insertion rolls back principal, native user, command and durable job together', async () => {
    await db.pool.query(
      `CREATE FUNCTION access.test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_AUDIT_FAILURE'; END $$; CREATE TRIGGER p02_injected_failure BEFORE INSERT ON audit_entry FOR EACH ROW EXECUTE FUNCTION access.test_audit_failure()`,
    );
    const before = (
      await db.pool.query(
        'SELECT (SELECT count(*) FROM access.principal) AS principals,(SELECT count(*) FROM access.ordinary_user) AS users,(SELECT count(*) FROM command_record) AS commands,(SELECT count(*) FROM work_item) AS jobs',
      )
    ).rows[0];
    try {
      await expect(
        repo.command(fixture.admin.token, {
          ...base(),
          type: 'user.create',
          username: 'atomic-failure',
          name: 'atomic failure',
          roleId: fixture.staffRole,
          branchIds: [fixture.a],
          exceptions: {},
          active: true,
        }),
      ).rejects.toThrow('TEST_AUDIT_FAILURE');
    } finally {
      await db.pool.query(
        'DROP TRIGGER p02_injected_failure ON audit_entry; DROP FUNCTION access.test_audit_failure()',
      );
    }
    expect(
      (
        await db.pool.query(
          'SELECT (SELECT count(*) FROM access.principal) AS principals,(SELECT count(*) FROM access.ordinary_user) AS users,(SELECT count(*) FROM command_record) AS commands,(SELECT count(*) FROM work_item) AS jobs',
        )
      ).rows[0],
    ).toEqual(before);
  });
  it('lease fencing ignores a late worker acknowledgement; no transaction is held during issuer IO', async () => {
    const result = await repo.command(fixture.admin.token, {
      ...base(),
      type: 'user.create',
      username: 'fenced-user',
      name: 'fenced',
      roleId: fixture.staffRole,
      branchIds: [fixture.a],
      exceptions: {},
      active: true,
    });
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>((r) => {
        entered = r;
      }),
      barrier = new Promise<void>((r) => {
        release = r;
      });
    const first = new IdentityWorker(db.pool, {
      config: fixture.config,
      reconcile: async () => {
        entered();
        await barrier;
        return 'late-wrong-subject';
      },
    }).runOne();
    await started;
    expect(
      Number(
        (
          await db.pool.query(
            "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND state='idle in transaction'",
          )
        ).rows[0].count,
      ),
    ).toBe(0);
    await db.pool.query(
      "UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",
      [result.jobId],
    );
    await new IdentityWorker(db.pool, {
      config: fixture.config,
      reconcile: async () => 'winning-subject',
    }).runOne();
    release();
    await first;
    expect(
      (
        await db.pool.query('SELECT subject FROM access.issuer_binding WHERE principal_id=$1', [
          result.entityId,
        ])
      ).rows[0].subject,
    ).toBe('winning-subject');
    expect(
      (await db.pool.query('SELECT fence,state FROM work_item WHERE id=$1', [result.jobId]))
        .rows[0],
    ).toEqual({ fence: 2, state: 'ready' });
    await expect(
      db.pool.query('UPDATE work_item SET entity_id=$1 WHERE id=$2', [
        fixture.staffA.id,
        result.jobId,
      ]),
    ).rejects.toThrow('IMMUTABLE_INTENT');
  });
  it('support start rechecks expiry after waiting for company authority lock', async () => {
    const support = {
      ...fixture.support,
      ...(await createSession(
        db.pool,
        fixture.config,
        {
          issuer: fixture.config.issuer,
          subject: fixture.support.subject,
          mfa: true,
          authenticatedAt: new Date(),
          tokens: {},
        },
        '',
        true,
      )),
    };
    const lock = await db.pool.connect();
    await lock.query('BEGIN');
    await lock.query('SELECT id FROM access.company WHERE id=$1 FOR UPDATE', [fixture.company]);
    const starting = repo
      .command(support.token, {
        ...base(),
        type: 'support.start',
        reason: 'verify expiry while waiting',
      })
      .then(
        () => null,
        (error) => error as Error,
      );
    try {
      // Wait on PostgreSQL's actual lock state rather than guessing a delay.
      for (let attempt = 0; attempt < 100; attempt++) {
        const waiting = await db.pool.query(
          "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
        );
        if (waiting.rows[0].n > 0) break;
        if (attempt === 99) throw new Error('Expected waiting support operation');
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      await db.pool.query(
        "UPDATE access.server_session SET absolute_expires_at=clock_timestamp()-interval '1 second' WHERE principal_id=$1",
        [support.id],
      );
      await lock.query('COMMIT');
      expect((await starting)?.message).toBe('AUTHENTICATION_REQUIRED');
    } finally {
      await lock.query('ROLLBACK');
      lock.release();
    }
  });
  it('command recovery rejects ambiguous cross-family UUID reuse instead of returning a different result', async () => {
    const identity = base();
    const created = await repo.command(fixture.admin.token, {
      ...identity,
      type: 'role.create',
      name: 'family collision',
      grants: [],
      active: true,
    });
    await repo.command(fixture.admin.token, {
      ...identity,
      type: 'role.update',
      entityId: created.entityId,
      expectedVersion: 1,
      name: 'family collision updated',
      grants: [],
      active: true,
    });
    expect((await http('/commands/' + identity.commandId)).status).toBe(409);
    // Explicit original family/payload still resolves to its own retained result.
    expect(
      await repo.command(fixture.admin.token, {
        ...identity,
        type: 'role.create',
        name: 'family collision',
        grants: [],
        active: true,
      }),
    ).toEqual(created);
  });
  it('concurrent support company selection leaves one current scope and rejects the superseded company', async () => {
    const support = {
      ...fixture.support,
      ...(await createSession(
        db.pool,
        fixture.config,
        {
          issuer: fixture.config.issuer,
          subject: fixture.support.subject,
          mfa: true,
          authenticatedAt: new Date(),
          tokens: {},
        },
        '',
        true,
      )),
    };
    await Promise.all(
      [fixture.company, fixture.other].map((companyId) =>
        repo.command(support.token, {
          ...base(),
          companyId,
          type: 'support.start',
          reason: 'Concurrent company selection test',
        }),
      ),
    );
    const current = await repo.context(support.token);
    const sessions = await db.pool.query(
      'SELECT company_id FROM access.support_session WHERE session_id=$1 AND ended_at IS NULL',
      [current.sessionId],
    );
    expect(sessions.rows).toEqual([{ company_id: current.companyId }]);
    const superseded = current.companyId === fixture.company ? fixture.other : fixture.company;
    await expect(
      repo.command(support.token, {
        ...base(),
        companyId: superseded,
        type: 'branch.create',
        name: 'must reject superseded scope',
      }),
    ).rejects.toMatchObject({ code: 'SUPPORT_SESSION_REQUIRED' });
  });
  it('a staff display name cannot masquerade as the support audit actor', async () => {
    const staff = await fixture.make('audit-label', [fixture.a], fixture.adminRole);
    await db.pool.query("UPDATE access.ordinary_user SET name='Technical Support' WHERE id=$1", [
      staff.id,
    ]);
    const created = await repo.command(staff.token, {
      ...base(),
      type: 'role.create',
      name: 'Audit attribution remains real',
      grants: [],
      active: true,
    });
    const audit = await repo.audit(fixture.admin.token);
    expect(audit.items.find((a) => a.entityId === created.entityId)?.actor).toBe(
      'موظف: Technical Support',
    );
  });
});
