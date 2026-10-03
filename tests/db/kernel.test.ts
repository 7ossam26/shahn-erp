import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, transaction } from '@shahn/database';
import type { KernelCommand } from '@shahn/contracts';
import { accessFixture } from '../support/access.js';
import { AccessRepository } from '../../apps/api/src/modules/access/repository.js';
import { trialCommands } from '../../apps/api/src/modules/kernel/trial.js';
import { DurableWork } from '../../apps/api/src/modules/kernel/work.js';
import { compactCommandResults } from '../../apps/api/src/modules/kernel/commands.js';
import { registerKernel } from '../../apps/api/src/modules/kernel/http.js';
import { createApplication } from '../../apps/api/src/app.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
import { JournalPosting } from '../../apps/api/src/modules/kernel/journals.js';
import { WalletService } from '../../apps/api/src/modules/kernel/wallet.js';
import { canonical, digest } from '../../apps/api/src/modules/access/crypto.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof accessFixture>>;
let service: ReturnType<typeof trialCommands>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
const evidence: unknown[] = [];
const command = (
  type: KernelCommand['type'],
  brandId: string = randomUUID(),
  extra: Partial<KernelCommand> = {},
): KernelCommand => ({
  schemaVersion: 1,
  commandId: randomUUID(),
  companyId: f.company,
  branchId: f.a,
  brandId,
  sourceId: randomUUID(),
  type,
  ...extra,
});
const money = (amountMinor: string) => ({ currency: 'EGP' as const, amountMinor });
const run = (input: KernelCommand) => service.execute(f.admin.token, input);
beforeAll(async () => {
  db = await isolatedPostgres();
  const migrations = await readMigrations();
  await migrate(db.pool, migrations.slice(0, 3));
  f = await accessFixture(db.pool);
  const access = new AccessRepository(db.pool);
  // Real P02-shaped stored fixtures, before any P03 columns exist. Current API
  // code intentionally requires current migrations; it cannot run against P02.
  const old = {
    commandId: randomUUID(),
    entityId: f.staffRole,
    version: 1,
    state: 'completed',
    jobId: null,
    errorCode: null,
  };
  const oldWork = {
    commandId: randomUUID(),
    entityId: f.staffA.id,
    version: 1,
    state: 'pending',
    jobId: randomUUID(),
    errorCode: null,
  };
  const records = [randomUUID(), randomUUID()];
  for (const [index, result] of [old, oldWork].entries()) {
    await db.pool.query(
      `INSERT INTO command_record(id,company_id,principal_id,command_id,family,capability,payload_digest,payload,result,state)
      VALUES($1,$2,$3,$4,$5,'access.users',$6,'{}',$7,$8)`,
      [
        records[index],
        f.company,
        f.admin.id,
        result.commandId,
        index ? 'user.create' : 'role.create',
        'a'.repeat(64),
        JSON.stringify(result),
        result.state,
      ],
    );
    await db.pool.query(
      `INSERT INTO audit_entry(id,company_id,principal_id,actor_label,action,entity_id,command_record_id,detail)
      VALUES($1,$2,$3,'Prior P02 actor','upgrade.fixture',$4,$5,'{}')`,
      [randomUUID(), f.company, f.admin.id, result.entityId, records[index]],
    );
  }
  await db.pool.query(
    `INSERT INTO work_item(id,company_id,principal_id,command_record_id,entity_id,entity_version,lane,correlation_id,payload,payload_digest)
    VALUES($1,$2,$3,$4,$5,1,'identity',$6,'{}',$7)`,
    [oldWork.jobId, f.company, f.admin.id, records[1], f.staffA.id, randomUUID(), 'b'.repeat(64)],
  );
  await migrate(db.pool);
  expect(await access.recover(f.admin.token, old.commandId)).toEqual(old);
  expect(await access.recover(f.admin.token, oldWork.commandId)).toEqual(oldWork);
  const job = (
    await db.pool.query(
      'SELECT kind,source_identity,identity_entity_id FROM work_item WHERE id=$1',
      [oldWork.jobId],
    )
  ).rows[0];
  expect(job.kind).toBe('identity.reconcile');
  expect(job.identity_entity_id).toBe(oldWork.entityId);
  evidence.push({
    upgrade: '0001..0003 fixture to 0004',
    priorCommandsReadable: true,
    priorIdentityJobReadable: true,
    postgres: (await db.pool.query('SHOW server_version')).rows[0],
  });
  service = trialCommands(db.pool, 'test');
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
  );
  registerKernel(app.getHttpAdapter().getInstance(), db.pool, 'test', f.config.origin);
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  try {
    if (
      db &&
      (await db.pool.query("SELECT to_regclass('kernel.journal_effect') AS present")).rows[0]
        .present
    ) {
      evidence.push({
        counts: (
          await db.pool.query(
            `SELECT (SELECT count(*) FROM kernel.journal_effect) AS effects,(SELECT count(*) FROM audit_entry) AS audit,(SELECT count(*) FROM command_record) AS commands`,
          )
        ).rows[0],
      });
      await mkdir('docs/verification/P03', { recursive: true });
      await writeFile(
        'docs/verification/P03/database-results.json',
        JSON.stringify(evidence, null, 2),
      );
      await writeFile(
        `docs/verification/P03/database-results-${Date.now()}.json`,
        JSON.stringify(evidence, null, 2),
      );
    }
  } finally {
    try {
      await app?.close();
    } finally {
      await db?.dispose();
    }
  }
});
const http = async (input: KernelCommand, token = f.admin.token, csrf = f.admin.csrfToken) => {
  const response = await fetch(origin + '/api/v1/kernel/commands', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: f.config.origin,
      cookie: 'erp_session=' + token,
      'x-csrf-token': csrf,
    },
    body: JSON.stringify(input),
  });
  return { status: response.status, body: await response.json() };
};
describe('P03 committed PostgreSQL command/posting kernel', () => {
  it('commits one command/effect set for concurrent identical HTTP requests; rejects changed payload', async () => {
    const seed = command('kernel.seed');
    const outcomes = await Promise.all([http(seed), http(seed)]);
    expect(outcomes[0]).toEqual(outcomes[1]);
    expect(outcomes[0]!.status).toBe(200);
    expect((await http({ ...seed, branchId: f.b })).status).toBe(409);
    expect(
      (
        await db.pool.query('SELECT count(*) FROM command_record WHERE command_id=$1', [
          seed.commandId,
        ])
      ).rows[0].count,
    ).toBe('1');
    expect(
      (
        await db.pool.query('SELECT count(*) FROM kernel.journal_effect WHERE subject_id=$1', [
          seed.brandId,
        ])
      ).rows[0].count,
    ).toBe('3');
    evidence.push({ case: 'duplicate-native-command', commandId: seed.commandId, ...outcomes[0] });
  });
  it('same source through two command IDs posts once and rejects changed source meaning', async () => {
    const seed = command('kernel.seed');
    const first = await run(seed);
    expect(await run({ ...seed, commandId: randomUUID() })).toEqual(first);
    await expect(run({ ...seed, commandId: randomUUID(), brandId: randomUUID() })).rejects.toThrow(
      'SOURCE_PAYLOAD_CONFLICT',
    );
    expect(
      (
        await db.pool.query(
          'SELECT count(*) FROM kernel.posting_batch WHERE source_id IN (SELECT id FROM kernel.source_record WHERE identity=$1)',
          [seed.sourceId],
        )
      ).rows[0].count,
    ).toBe('1');
  });
  it('50 cover and 50 fee leave 50 available; pending 250 stays separate and retry adds nothing', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const reserve = command('kernel.reserve', seed.brandId, {
      expectedVersion: 1,
      money: money('5000'),
    });
    expect((await run(reserve)).body).toMatchObject({
      wallet: { eligibleToPay: '5000', pending: '25000', cover: '5000' },
    });
    await expect(
      run(command('kernel.payout', seed.brandId, { expectedVersion: 2, money: money('6000') })),
    ).rejects.toThrow('INSUFFICIENT_ELIGIBLE_CREDIT');
    await expect(
      run(command('kernel.reserve', seed.brandId, { expectedVersion: 2, money: money('6000') })),
    ).rejects.toThrow('INSUFFICIENT_SHIPPING_COVER');
    const fee = command('kernel.fee', seed.brandId, {
      money: money('5000'),
      coverSourceId: reserve.sourceId,
    });
    const applied = await run(fee);
    expect(applied.body).toMatchObject({
      wallet: { eligibleToPay: '5000', pending: '25000', cover: '0', debits: '0' },
    });
    expect(await run({ ...fee, commandId: randomUUID() })).toEqual(applied);
    evidence.push({
      case: '100 eligible,250 pending,50 cover then fee',
      seed,
      cover: reserve,
      fee,
      result: applied.body,
      journals: (
        await db.pool.query(
          'SELECT id,family,kind,amount_minor,source_id FROM kernel.journal_effect WHERE subject_id=$1 ORDER BY recorded_at,id',
          [seed.brandId],
        )
      ).rows,
    });
  });
  it('rolls back all journals, command, source and audit when interrupted between posting and audit', async () => {
    const seed = command('kernel.seed');
    const failing = trialCommands(db.pool, 'test', {
      afterPosting: async () => {
        throw new Error('FAIL_BEFORE_AUDIT');
      },
    });
    await expect(failing.execute(f.admin.token, seed)).rejects.toThrow('FAIL_BEFORE_AUDIT');
    for (const [table, column, value] of [
      ['command_record', 'command_id', seed.commandId],
      ['kernel.journal_effect', 'subject_id', seed.brandId],
      ['audit_entry', 'entity_id', seed.brandId],
      ['kernel.source_record', 'identity', seed.sourceId],
    ]) {
      expect(
        (await db.pool.query(`SELECT count(*) FROM ${table} WHERE ${column}=$1`, [value])).rows[0]
          .count,
      ).toBe('0');
    }
    expect((await run(seed)).status).toBe(200);
  });
  it.each(['kernel.payout', 'kernel.reserve'] as const)(
    'barrier race, %s owns the wallet first',
    async (firstType) => {
      const seed = command('kernel.seed');
      await run(seed);
      let release!: () => void, locked!: () => void;
      const barrier = new Promise<void>((r) => (release = r)),
        entered = new Promise<void>((r) => (locked = r));
      const first = command(firstType, seed.brandId, { expectedVersion: 1, money: money('6000') });
      const second = command(
        firstType === 'kernel.payout' ? 'kernel.reserve' : 'kernel.payout',
        seed.brandId,
        { expectedVersion: 2, money: money('6000') },
      );
      const blocked = trialCommands(db.pool, 'test', {
        afterWalletLock: async () => {
          locked();
          await barrier;
        },
      });
      const a = blocked.execute(f.admin.token, first);
      await entered;
      // Different principal/session avoids the session touch row becoming the race barrier.
      const bUser = await f.make('race-' + randomUUID().slice(0, 8), [f.a], f.adminRole);
      const b = service.execute(bUser.token, second).then(
        (value) => ({ value, error: null }),
        (error) => ({ value: null, error: (error as Error).message }),
      );
      let waiters = 0;
      try {
        for (let i = 0; i < 150; i++) {
          waiters = Number(
            (
              await db.pool.query(
                `SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE 'SELECT version,fixture FROM kernel.resource%'`,
              )
            ).rows[0].count,
          );
          if (waiters > 0) break;
          await new Promise((r) => setTimeout(r, 10));
        }
        expect(waiters).toBeGreaterThan(0);
      } finally {
        release();
      }
      const one = await a,
        two = await b;
      expect(two.error).toMatch(/INSUFFICIENT/);
      expect(one.body).toMatchObject({ wallet: { eligibleToPay: '4000' } });
      evidence.push({
        case: 'wallet-lock-race',
        barrier: 'after resource FOR UPDATE before effects',
        firstType,
        observedDatabaseLockWaiters: waiters,
        first: one,
        second: two,
        effects: (
          await db.pool.query(
            'SELECT id,source_id,family,kind,amount_minor FROM kernel.journal_effect WHERE subject_id=$1',
            [seed.brandId],
          )
        ).rows,
      });
    },
  );
  it('stale expectedVersion, revoked capability, another principal and changed branch scope cannot expose/reexecute results', async () => {
    const user = await f.make('scope-' + randomUUID().slice(0, 8), [f.a], f.adminRole);
    const seed = command('kernel.seed');
    await service.execute(user.token, seed);
    await expect(
      service.recover(f.admin.token, f.company, 'kernel.trial', seed.commandId),
    ).rejects.toThrow('NOT_FOUND');
    await expect(
      service.execute(
        user.token,
        command('kernel.reserve', seed.brandId, { money: money('1'), expectedVersion: 2 }),
      ),
    ).rejects.toThrow('REVISION_CONFLICT');
    await db.pool.query('DELETE FROM access.user_branch WHERE company_id=$1 AND user_id=$2', [
      f.company,
      user.id,
    ]);
    await expect(
      service.recover(user.token, f.company, 'kernel.trial', seed.commandId),
    ).rejects.toThrow('FORBIDDEN_SCOPE');
    await db.pool.query('UPDATE access.principal SET active=false WHERE id=$1', [user.id]);
    await expect(service.execute(user.token, seed)).rejects.toThrow('AUTHENTICATION_REQUIRED');
  });
  it('compacts only expired resolved responses and recovers the immutable authorized domain result', async () => {
    // Historical fixture created with its real retention deadline before execution.
    const seed = command('kernel.seed'),
      reply = await run(seed);
    // Use a separate historical record; immutable live creation timestamps are never rewritten.
    const id = randomUUID(),
      commandId = randomUUID();
    await db.pool.query(
      `INSERT INTO command_record(id,company_id,principal_id,command_id,family,kind,capability,payload_digest,payload,result,state,
      result_reference,created_at,retain_until,response_status)
      SELECT $1,company_id,principal_id,$2,family,kind,capability,payload_digest,payload,result,state,result_reference,
        clock_timestamp()-interval '31 days',clock_timestamp()-interval '1 day',response_status FROM command_record WHERE command_id=$3`,
      [id, commandId, seed.commandId],
    );
    expect(await compactCommandResults(db.pool)).toBe(1);
    expect(await service.recover(f.admin.token, f.company, 'kernel.trial', commandId)).toEqual(
      reply,
    );
    expect(
      (
        await db.pool.query('SELECT payload,result,compacted_at FROM command_record WHERE id=$1', [
          id,
        ])
      ).rows[0],
    ).toMatchObject({ payload: null, result: null });
    expect(await compactCommandResults(db.pool)).toBe(0);
    const before = (
      await db.pool.query('SELECT count(*) FROM kernel.journal_effect WHERE subject_id=$1', [
        seed.brandId,
      ])
    ).rows[0].count;
    await expect(service.execute(f.admin.token, { ...seed, commandId })).rejects.toThrow(
      'COMMAND_PAYLOAD_CONFLICT',
    );
    expect(
      (
        await db.pool.query('SELECT count(*) FROM kernel.journal_effect WHERE subject_id=$1', [
          seed.brandId,
        ])
      ).rows[0].count,
    ).toBe(before);
  });
  it('rejects cross-company effects and invalid signs at the database boundary; history is append-only', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const row = (
      await db.pool.query('SELECT * FROM kernel.journal_effect WHERE subject_id=$1 LIMIT 1', [
        seed.brandId,
      ])
    ).rows[0];
    await expect(
      db.pool.query('UPDATE kernel.journal_effect SET amount_minor=1 WHERE id=$1', [row.id]),
    ).rejects.toThrow('IMMUTABLE_KERNEL_HISTORY');
    const insert = `INSERT INTO kernel.journal_effect(id,company_id,batch_id,source_id,family,kind,subject_id,amount_minor,branch_id,effective_date,actor_id)
      VALUES($1,$2,$3,$4,'brand','fee',$5,$6,$7,'2026-10-03',$8)`;
    await expect(
      db.pool.query(insert, [
        randomUUID(),
        f.company,
        row.batch_id,
        row.source_id,
        seed.brandId,
        '-1',
        f.foreign,
        f.admin.id,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      db.pool.query(insert, [
        randomUUID(),
        f.company,
        row.batch_id,
        row.source_id,
        seed.brandId,
        '1',
        f.a,
        f.admin.id,
      ]),
    ).rejects.toMatchObject({ code: '23514' });
    const ref = (await db.pool.query("SELECT nextval('kernel.human_reference')::text AS ref"))
      .rows[0].ref;
    await expect(
      transaction(db.pool, async (client) => {
        await client.query("SELECT nextval('kernel.human_reference')");
        throw Error('gap');
      }),
    ).rejects.toThrow('gap');
    expect(
      BigInt(
        (await db.pool.query("SELECT nextval('kernel.human_reference')::text AS ref")).rows[0].ref,
      ),
    ).toBe(BigInt(ref) + 2n);
  });
  it('fences worker A after database-expired lease; B commits, A cannot publish', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const record = (
      await db.pool.query('SELECT id FROM command_record WHERE command_id=$1', [seed.commandId])
    ).rows[0].id;
    const registry = [{ kind: 'kernel.probe', lane: 'kernel' as const }],
      a = new DurableWork(db.pool, registry),
      b = new DurableWork(db.pool, registry);
    await transaction(db.pool, (client) =>
      a.enqueue(client, {
        companyId: f.company,
        principalId: f.admin.id,
        commandRecordId: record,
        entityId: seed.brandId,
        entityVersion: 1,
        kind: 'kernel.probe',
        sourceIdentity: randomUUID(),
        payload: { probe: true },
      }),
    );
    const leaseA = (await a.claim())!;
    await db.pool.query(
      "UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",
      [leaseA.id],
    );
    const leaseB = (await b.claim())!;
    expect(leaseB.fence).toBe(leaseA.fence + 1);
    expect(await b.finish(leaseB, { kind: 'success' })).toBe(true);
    let staleRan = false;
    expect(
      await a.finish(leaseA, { kind: 'definite', code: 'STALE' }, async () => {
        staleRan = true;
      }),
    ).toBe(false);
    expect(staleRan).toBe(false);
    evidence.push({
      case: 'worker-fencing',
      workId: leaseA.id,
      aFence: leaseA.fence,
      bFence: leaseB.fence,
      final: (
        await db.pool.query('SELECT state,fence,outcome_kind FROM work_item WHERE id=$1', [
          leaseA.id,
        ])
      ).rows[0],
    });
  });
  it('holds source-specific eligible lots and keeps pending/storage out of payouts', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    await UnitOfWork.run(db.pool, f.admin.token, f.company, 'access.users', async (uow) => {
      const posting = new JournalPosting(uow);
      const source = await posting.source(
        { system: 'test', identity: randomUUID(), kind: 'hold', revision: '1' },
        {},
      );
      await posting.lock('brand', seed.brandId);
      const wallet = new WalletService(uow, seed.brandId);
      const lot = (
        await uow.client.query(
          "SELECT id FROM kernel.credit_lot WHERE brand_id=$1 AND readiness='eligible'",
          [seed.brandId],
        )
      ).rows[0].id;
      await wallet.hold(lot, source.id, '8000', 'Known affected source');
      expect(await wallet.amounts()).toMatchObject({
        held: '8000',
        eligibleToPay: '2000',
        pending: '25000',
      });
      await expect(wallet.requirePayout('2001')).rejects.toThrow('INSUFFICIENT_ELIGIBLE_CREDIT');
    });
  });
  it('does not register the controlled trial in production', async () => {
    expect(() => trialCommands(db.pool, 'production')).toThrow('KERNEL_FIXTURE_DISABLED');
    const production = await createApplication(
      { environment: 'production', runtimeUrl: db.url, migrationUrl: db.url },
      f.config,
    );
    registerKernel(
      production.getHttpAdapter().getInstance(),
      db.pool,
      'production',
      f.config.origin,
    );
    await production.listen(0, '127.0.0.1');
    try {
      expect((await fetch((await production.getUrl()) + '/api/v1/kernel/commands')).status).toBe(
        404,
      );
    } finally {
      await production.close();
    }
  });
  it('kills the actual API after commit before response, restarts and recovers the same identity', async () => {
    const start = async (crash: boolean, beforeCommit = false) => {
      const child = fork('tests/p03/crash-server.ts', [], {
        execArgv: ['--import', 'tsx'],
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
        env: {
          ...process.env,
          TSX_TSCONFIG_PATH: 'tsconfig.base.json',
          P03_TEST_DATABASE_URL: db.url,
          P03_TEST_ORIGIN: f.config.origin,
          P03_CRASH_AFTER_COMMIT: String(crash),
          P03_CRASH_BEFORE_COMMIT: String(beforeCommit),
        },
      });
      let childOrigin = '';
      await new Promise<void>((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code) => {
          if (!childOrigin) reject(Error('API_START_FAILED_' + code));
        });
        child.on('message', (message) => {
          const value = message as { origin?: string; position?: string };
          if (value.origin) {
            childOrigin = value.origin;
            resolve();
          } else if (value.position) evidence.push({ crashPosition: value.position });
        });
      });
      return { child, origin: childOrigin };
    };
    const early = await start(false, true),
      earlyExit = once(early.child, 'exit'),
      rolledBack = command('kernel.seed');
    await expect(
      fetch(early.origin + '/api/v1/kernel/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: f.config.origin,
          cookie: 'erp_session=' + f.admin.token,
          'x-csrf-token': f.admin.csrfToken,
        },
        body: JSON.stringify(rolledBack),
      }),
    ).rejects.toThrow();
    expect((await earlyExit)[0]).toBe(74);
    expect(
      (
        await db.pool.query('SELECT count(*) FROM command_record WHERE command_id=$1', [
          rolledBack.commandId,
        ])
      ).rows[0].count,
    ).toBe('0');
    expect(
      (
        await db.pool.query('SELECT count(*) FROM kernel.journal_effect WHERE subject_id=$1', [
          rolledBack.brandId,
        ])
      ).rows[0].count,
    ).toBe('0');
    const before = await start(true),
      exit = once(before.child, 'exit'),
      seed = command('kernel.seed');
    await expect(
      fetch(before.origin + '/api/v1/kernel/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: f.config.origin,
          cookie: 'erp_session=' + f.admin.token,
          'x-csrf-token': f.admin.csrfToken,
        },
        body: JSON.stringify(seed),
      }),
    ).rejects.toThrow();
    expect((await exit)[0]).toBe(73);
    const after = await start(false);
    try {
      const recovered = await fetch(
        after.origin + '/api/v1/kernel/commands/' + seed.commandId + '?companyId=' + f.company,
        { headers: { cookie: 'erp_session=' + f.admin.token } },
      );
      expect(recovered.status).toBe(200);
      const body = await recovered.json();
      expect((await run(seed)).body).toEqual(body);
      expect(
        (
          await db.pool.query('SELECT count(*) FROM kernel.journal_effect WHERE subject_id=$1', [
            seed.brandId,
          ])
        ).rows[0].count,
      ).toBe('3');
      evidence.push({
        case: 'actual-api-process-crash-and-restart',
        exitCode: 73,
        commandId: seed.commandId,
        result: body,
      });
    } finally {
      const closed = once(after.child, 'exit');
      after.child.send('stop');
      await closed;
    }
  });
  it('retains an authorized version rejection even after the aggregate reaches that version', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const rejected = command('kernel.reserve', seed.brandId, {
      expectedVersion: 2,
      money: money('1000'),
    });
    const first = await http(rejected);
    expect(first.status).toBe(409);
    await run(
      command('kernel.reserve', seed.brandId, { expectedVersion: 1, money: money('1000') }),
    );
    expect(await http(rejected)).toEqual(first);
    expect(
      await service.recover(f.admin.token, f.company, 'kernel.trial', rejected.commandId),
    ).toEqual(first);
  });
  it('replays an expired compacted identity without executing, and never compacts a pending command', async () => {
    const seed = command('kernel.seed'),
      reply = await run(seed);
    const replay = { ...seed, commandId: randomUUID() },
      payload = canonical(replay);
    await db.pool.query(
      `INSERT INTO command_record(id,company_id,principal_id,command_id,family,kind,capability,payload_digest,payload,result,state,
      result_reference,created_at,retain_until,response_status)
      SELECT $1,company_id,principal_id,$2,family,kind,capability,$3,$4,result,state,result_reference,
        clock_timestamp()-interval '31 days',clock_timestamp()-interval '1 day',response_status FROM command_record WHERE command_id=$5`,
      [randomUUID(), replay.commandId, digest(payload), payload, seed.commandId],
    );
    const pending = randomUUID();
    await db.pool.query(
      `INSERT INTO command_record(id,company_id,principal_id,command_id,family,kind,capability,payload_digest,payload,result,state,result_reference,retain_until)
      VALUES($1,$2,$3,$4,'kernel.trial','kernel.seed','access.users',$5,'{}','{}','pending','{"pending":true}',clock_timestamp()-interval '1 day')`,
      [pending, f.company, f.admin.id, randomUUID(), 'c'.repeat(64)],
    );
    expect(await compactCommandResults(db.pool)).toBe(1);
    expect(await run(replay)).toEqual(reply);
    expect(
      (await db.pool.query('SELECT compacted_at FROM command_record WHERE id=$1', [pending]))
        .rows[0].compacted_at,
    ).toBeNull();
  });
  it('records a fee above its cover as truthful debt and consumes that cover only once', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const cover = command('kernel.reserve', seed.brandId, {
      expectedVersion: 1,
      money: money('5000'),
    });
    await run(cover);
    const fee = command('kernel.fee', seed.brandId, {
      money: money('15000'),
      coverSourceId: cover.sourceId,
    });
    expect((await run(fee)).body).toMatchObject({
      wallet: {
        eligible: '0',
        pending: '25000',
        debits: '5000',
        eligibleToPay: '0',
        cover: '0',
        signedEntitlement: '20000',
      },
    });
    await expect(
      run(
        command('kernel.fee', seed.brandId, { money: money('1'), coverSourceId: cover.sourceId }),
      ),
    ).rejects.toThrow('COVER_ALREADY_CLOSED');
    expect(
      (
        await db.pool.query(
          "SELECT count(*) FROM kernel.journal_effect WHERE subject_id=$1 AND kind='fee'",
          [seed.brandId],
        )
      ).rows[0].count,
    ).toBe('1');
  });
  it('allow-negative only bypasses cover; money funding and payout eligibility still apply', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    await UnitOfWork.run(db.pool, f.admin.token, f.company, 'access.users', async (uow) => {
      const posting = new JournalPosting(uow),
        source = await posting.source(
          { system: 'test', identity: randomUUID(), kind: 'allow-negative', revision: '1' },
          {},
        );
      await posting.lock('brand', seed.brandId);
      await posting.lock('money', seed.brandId);
      const wallet = new WalletService(uow, seed.brandId);
      await wallet.reserve(source.id, '999999', true);
      await expect(wallet.requirePayout('10001')).rejects.toThrow('INSUFFICIENT_ELIGIBLE_CREDIT');
      await expect(posting.requireFunds(seed.brandId, '100001')).rejects.toThrow(
        'INSUFFICIENT_FUNDS',
      );
    });
  });
  it('releases identified holds/pending lots and keeps real storage-class facts outside the wallet', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const commandId = (
      await db.pool.query('SELECT id FROM command_record WHERE command_id=$1', [seed.commandId])
    ).rows[0].id;
    await UnitOfWork.run(db.pool, f.admin.token, f.company, 'access.users', async (uow) => {
      const posting = new JournalPosting(uow),
        source = await posting.source(
          { system: 'test', identity: randomUUID(), kind: 'release-fixture', revision: '1' },
          {},
        );
      await posting.lock('brand', seed.brandId);
      await posting.createResource('storage', seed.brandId, true);
      await posting.lock('storage', seed.brandId);
      await posting.append(source.id, commandId, [
        {
          family: 'storage',
          kind: 'receipt',
          subjectId: seed.brandId,
          amountMinor: '50000',
          branchId: f.a,
          effectiveDate: '2026-10-03',
          supersedesId: null,
          reason: null,
        },
      ]);
      const wallet = new WalletService(uow, seed.brandId);
      expect(await wallet.amounts()).toMatchObject({
        eligible: '10000',
        pending: '25000',
        eligibleToPay: '10000',
      });
      const lots = (
        await uow.client.query('SELECT id,readiness FROM kernel.credit_lot WHERE brand_id=$1', [
          seed.brandId,
        ])
      ).rows;
      const hold = await wallet.hold(
        lots.find((l) => l.readiness === 'eligible').id,
        source.id,
        '6000',
        'Known source',
      );
      expect((await wallet.amounts()).eligibleToPay).toBe('4000');
      await wallet.releaseHold(hold, source.id);
      expect((await wallet.amounts()).eligibleToPay).toBe('10000');
      await wallet.releaseCredit(lots.find((l) => l.readiness === 'pending').id, source.id);
      expect(await wallet.amounts()).toMatchObject({
        eligible: '35000',
        pending: '0',
        eligibleToPay: '35000',
      });
    });
  });
  it('allocates the oldest eligible effective date then movement ID, without subtracting payout twice', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const commandId = (
      await db.pool.query('SELECT id FROM command_record WHERE command_id=$1', [seed.commandId])
    ).rows[0].id;
    const ids = await UnitOfWork.run(
      db.pool,
      f.admin.token,
      f.company,
      'access.users',
      async (uow) => {
        const posting = new JournalPosting(uow),
          source = await posting.source(
            { system: 'test', identity: randomUUID(), kind: 'older-credit', revision: '1' },
            {},
          );
        await posting.lock('brand', seed.brandId);
        const base = {
          family: 'brand' as const,
          subjectId: seed.brandId,
          branchId: f.a,
          effectiveDate: '2020-01-01',
          supersedesId: null,
          reason: null,
        };
        const posted = await posting.append(source.id, commandId, [
          { ...base, kind: 'compensation', amountMinor: '3000' },
          { ...base, kind: 'opening', amountMinor: '2000' },
        ]);
        const wallet = new WalletService(uow, seed.brandId);
        for (const id of posted.ids) await wallet.credit(id, 'eligible');
        return posted.ids;
      },
    );
    expect(
      (
        await run(
          command('kernel.payout', seed.brandId, { expectedVersion: 1, money: money('4000') }),
        )
      ).body,
    ).toMatchObject({
      wallet: { eligible: '11000', eligibleToPay: '11000', signedEntitlement: '36000' },
    });
    const allocations = (
      await db.pool.query(
        `SELECT a.lot_id,a.amount_minor,l.amount_minor AS original FROM kernel.lot_allocation a
      JOIN kernel.credit_lot l ON (l.company_id,l.id)=(a.company_id,a.lot_id) WHERE l.brand_id=$1 ORDER BY l.effective_date,l.id`,
        [seed.brandId],
      )
    ).rows;
    expect(allocations.map((a) => a.lot_id)).toEqual([...ids].sort());
    expect(allocations[0].amount_minor).toBe(allocations[0].original);
    expect(allocations.reduce((sum, a) => sum + BigInt(a.amount_minor), 0n)).toBe(4000n);
  });
  it('appends a linked correction and preserves the original amount and effective date', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const commandId = (
      await db.pool.query('SELECT id FROM command_record WHERE command_id=$1', [seed.commandId])
    ).rows[0].id;
    const original = (
      await db.pool.query(
        "SELECT id,amount_minor FROM kernel.journal_effect WHERE subject_id=$1 AND family='money'",
        [seed.brandId],
      )
    ).rows[0];
    await UnitOfWork.run(db.pool, f.admin.token, f.company, 'access.users', async (uow) => {
      const posting = new JournalPosting(uow),
        source = await posting.source(
          { system: 'test', identity: randomUUID(), kind: 'correction', revision: '2' },
          {},
        );
      await posting.lock('money', seed.brandId);
      const corrected = await posting.append(source.id, commandId, [
        {
          family: 'money',
          kind: 'correction',
          subjectId: seed.brandId,
          amountMinor: '-100',
          branchId: f.a,
          effectiveDate: '2026-09-30',
          supersedesId: original.id,
          reason: 'Isolated correction test',
        },
      ]);
      expect(
        (
          await uow.client.query(
            'SELECT supersedes_id,reason FROM kernel.journal_effect WHERE id=$1',
            [corrected.ids[0]],
          )
        ).rows[0].supersedes_id,
      ).toBe(original.id);
    });
    expect(
      (
        await db.pool.query('SELECT amount_minor FROM kernel.journal_effect WHERE id=$1', [
          original.id,
        ])
      ).rows[0].amount_minor,
    ).toBe(original.amount_minor);
  });
  it('releases cover once; a different release source cannot repeat it', async () => {
    const seed = command('kernel.seed');
    await run(seed);
    const reserve = command('kernel.reserve', seed.brandId, {
      expectedVersion: 1,
      money: money('5000'),
    });
    await run(reserve);
    const release = command('kernel.release', seed.brandId, {
      expectedVersion: 2,
      coverSourceId: reserve.sourceId,
    });
    const result = await run(release);
    expect(result.body).toMatchObject({ wallet: { cover: '0', eligibleToPay: '10000' } });
    expect(await run({ ...release, commandId: randomUUID() })).toEqual(result);
    await expect(
      run({ ...release, commandId: randomUUID(), sourceId: randomUUID(), expectedVersion: 3 }),
    ).rejects.toThrow('COVER_ALREADY_CLOSED');
  });
});
