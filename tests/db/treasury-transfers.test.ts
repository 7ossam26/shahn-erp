import { randomUUID } from 'node:crypto';
import { fork, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, migrationStatus } from '@shahn/database';
import type { TreasuryCommand, TreasuryResult, TreasuryFilter } from '@shahn/contracts';
import { createApplication } from '../../apps/api/src/app.js';
import { treasuryFixture } from '../support/treasury.js';
import {
  treasuryCommands,
  transferDetail,
  transferList,
  treasuryCatalog,
} from '../../apps/api/src/modules/finance/treasury-transfers/service.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
import { compactCommandResults } from '../../apps/api/src/modules/kernel/commands.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof treasuryFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  service: ReturnType<typeof treasuryCommands>,
  origin: string,
  transferId: string;
const evidence: Record<string, unknown> = {};
const balance = async (id: string) =>
  (
    await db.pool.query(
      'SELECT amount_minor::text AS amount FROM finance.account_balance WHERE account_id=$1',
      [id],
    )
  ).rows[0].amount;
const detail = (id: string, token = f.staffB.token) =>
  UnitOfWork.run(db.pool, token, f.company, 'treasury.receive', (u) =>
    transferDetail(u, id, 'receive'),
  );
const filter = (x: object = {}): TreasuryFilter => ({
  search: '',
  sourceBranchId: null,
  destinationBranchId: null,
  state: 'all',
  dateBasis: 'sent',
  from: null,
  to: null,
  page: 1,
  limit: 25,
  ...x,
});
const run = async (c: TreasuryCommand, token = f.staffA.token) =>
  (await service.execute(token, c)).body as TreasuryResult;
const totals = async () =>
  (
    await db.pool.query(
      `SELECT (SELECT COALESCE(sum(amount_minor),0)::text FROM finance.account_balance WHERE company_id=$1) AS accounts,
 (SELECT COALESCE(sum(amount_minor),0)::text FROM finance.treasury_transit_movement WHERE company_id=$1) AS transit,
 (SELECT count(*)::int FROM kernel.journal_effect WHERE company_id=$1 AND family='operating') AS "profitFacts"`,
      [f.company],
    )
  ).rows[0];
const journalPosition = async (sourceId: string, destinationId: string) =>
  (
    await db.pool.query(
      `SELECT
 (SELECT COALESCE(sum(amount_minor),0)::text FROM kernel.journal_effect WHERE company_id=$1 AND family='money' AND subject_id=$2) AS source,
 (SELECT COALESCE(sum(amount_minor),0)::text FROM kernel.journal_effect WHERE company_id=$1 AND family='money' AND subject_id=$3) AS destination,
 (SELECT COALESCE(sum(amount_minor),0)::text FROM finance.treasury_transit_movement WHERE company_id=$1) AS transit`,
      [f.company, sourceId, destinationId],
    )
  ).rows[0];
async function http(path: string, body?: unknown, who = f.staffA) {
  const r = await fetch(origin + '/api/v1/treasury' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: 'erp_session=' + who.token,
      ...(body
        ? {
            'Content-Type': 'application/json',
            Origin: f.config.origin,
            'X-CSRF-Token': who.csrfToken,
          }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, body: await r.json() };
}
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 13));
  f = await treasuryFixture(db.pool);
  const old = (
    await db.pool.query('SELECT to_jsonb(j) AS body FROM kernel.journal_effect j ORDER BY id')
  ).rows;
  try {
    await migrate(db.pool);
  } catch (error) {
    const e = error as {
      position?: string;
      internalPosition?: string;
      internalQuery?: string;
      where?: string;
    };
    console.error({
      position: e.position,
      internalPosition: e.internalPosition,
      internalQuery: e.internalQuery,
      where: e.where,
    });
    throw error;
  }
  expect((await migrationStatus(db.pool)).state).toBe('current');
  expect(
    (await db.pool.query('SELECT to_jsonb(j) AS body FROM kernel.journal_effect j ORDER BY id'))
      .rows,
  ).toEqual(old);
  const cli = await promisify(execFile)(
    process.execPath,
    ['packages/database/dist/cli.js', 'status'],
    {
      env: {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_URL: db.url,
        MIGRATION_DATABASE_URL: db.url,
      },
    },
  );
  await writeFile('docs/verification/P10/04-isolated-db-status.txt', cli.stdout);
  evidence.upgrade = {
    retainedJournalRows: old.length,
    migrations: (await migrationStatus(db.pool)).required,
  };
  service = treasuryCommands(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
}, 90000);
afterAll(async () => {
  if (db)
    await writeFile(
      'docs/verification/P10/database-results.json',
      JSON.stringify(evidence, null, 2),
    );
  await app?.close();
  await db?.dispose();
}, 60000);
it('A01 sends300 across unrelated assigned C, debits only source and conserves source+transit+destination', async () => {
  const c = f.send();
  transferId = c.transferId;
  const r = await run(c);
  expect(r.state).toBe('sent');
  expect(await balance(f.source.entityId)).toBe('70000');
  expect(await balance(f.seed.cash.entityId)).toBe('0');
  expect(await totals()).toEqual({ accounts: '70000', transit: '30000', profitFacts: 0 });
  expect(await run(c)).toEqual(r);
  expect((await run({ ...c, commandId: randomUUID() })).transferId).toBe(transferId);
  await expect(run({ ...c, amountMinor: '30001' } as TreasuryCommand)).rejects.toThrow(
    'COMMAND_PAYLOAD_CONFLICT',
  );
  await expect(
    run({ ...c, commandId: randomUUID(), amountMinor: '30001' } as TreasuryCommand),
  ).rejects.toThrow('SOURCE_PAYLOAD_CONFLICT');
  const t = await detail(transferId);
  expect(t.transitMinor).toBe('30000');
  expect(t.receipt).toBeNull();
  expect(t.history).toHaveLength(1);
  evidence.A01 = { totals: await totals(), transfer: t };
  expect(await journalPosition(f.source.entityId, f.seed.cash.entityId)).toEqual({
    source: '70000',
    destination: '0',
    transit: '30000',
  });
  evidence.A01Journal = await journalPosition(f.source.entityId, f.seed.cash.entityId);
});
it('A02/A05 receives exactly300 at any company destination; separate grant and unrelated expense denied', async () => {
  const c = f.receive(transferId),
    r = await run(c, f.staffB.token);
  expect(r.outcome).toBe('received');
  expect(await balance(f.source.entityId)).toBe('70000');
  expect(await balance(f.seed.cash.entityId)).toBe('30000');
  expect(await totals()).toEqual({ accounts: '100000', transit: '0', profitFacts: 0 });
  const t = await detail(transferId);
  expect(t.history).toHaveLength(2);
  expect(t.receipt?.receiverId).toBe(f.staffB.id);
  expect(t.senderId).toBe(f.staffA.id);
  expect(await run(f.receive(transferId), f.staffB.token)).toMatchObject({
    outcome: 'already_received',
  });
  await expect(
    f.finance.execute(f.staffB.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'expense.create',
      fields: {
        accountId: f.seed.cash.entityId,
        branchId: f.b,
        amountMinor: '100',
        currency: 'EGP',
        method: 'cash',
        actualDate: '2026-09-01',
        categoryId: f.seed.categoryId,
        description: 'Forbidden B expense',
      },
    }),
  ).rejects.toThrow('FORBIDDEN_SCOPE');
  evidence.A02 = { totals: await totals(), transfer: t };
  expect(await journalPosition(f.source.entityId, f.seed.cash.entityId)).toEqual({
    source: '70000',
    destination: '30000',
    transit: '0',
  });
  evidence.A02Journal = await journalPosition(f.source.entityId, f.seed.cash.entityId);
});
it('A06 rejects sender-only receipt, receiver-only send, cross-company IDs and revoked recovery', async () => {
  await expect(run(f.receive(transferId))).rejects.toThrow('FORBIDDEN_SCOPE');
  await expect(run(f.send(), f.staffB.token)).rejects.toThrow('FORBIDDEN_SCOPE');
  expect((await http('/receipts?companyId=' + f.company)).status).toBe(403);
  expect((await http('/transfers?companyId=' + f.other)).status).toBe(403);
  expect((await http('/commands', f.send({ destinationAccountId: randomUUID() }))).status).toBe(
    404,
  );
  expect((await http('/commands', f.send({ destinationBranchId: f.foreign }))).status).toBe(403);
  const user = await f.make('revoked-treasury', [f.c]);
  await db.pool.query("INSERT INTO access.user_exception VALUES($1,$2,'treasury.send','allow')", [
    f.company,
    user.id,
  ]);
  const c = f.send({ amountMinor: '100' });
  await run(c, user.token);
  await db.pool.query(
    "UPDATE access.user_exception SET effect='deny' WHERE company_id=$1 AND user_id=$2 AND capability='treasury.send'",
    [f.company, user.id],
  );
  await expect(
    service.recover(user.token, f.company, 'treasury.send', c.commandId),
  ).rejects.toThrow('FORBIDDEN_SCOPE');
});
it('A07 rejects partial amount, altered destination, same accounts, inactive accounts and stale versions before any effects', async () => {
  const before = await totals();
  for (const extra of [
    { amountMinor: '29900' },
    { destinationAccountId: f.source.entityId },
    { confirmFullReceipt: false },
    { reject: true },
  ])
    expect((await http('/commands', { ...f.receive(transferId), ...extra }, f.staffB)).status).toBe(
      400,
    );
  expect(
    (await http('/commands', f.send({ destinationAccountId: f.source.entityId }))).body.code,
  ).toBe('SAME_TRANSFER_SCOPE');
  expect((await http('/commands', f.send({ sourceBranchId: f.b }))).body.code).toBe(
    'SAME_TRANSFER_SCOPE',
  );
  await expect(run(f.send({ expectedSourceVersion: 2 }))).rejects.toThrow('REVISION_CONFLICT');
  const inactive = await f.create('P10 inactive', f.b);
  await f.finance.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'account.deactivate',
    accountId: inactive.entityId,
    expectedVersion: 1,
  });
  await expect(
    run(f.send({ destinationAccountId: inactive.entityId, expectedDestinationVersion: 2 })),
  ).rejects.toThrow('ACCOUNT_INACTIVE');
  await expect(run(f.send({ amountMinor: '9223372036854775808' }))).rejects.toThrow(
    'MONEY_OVERFLOW',
  );
  expect(await totals()).toEqual(before);
});
it.each(['afterDebit', 'afterTransfer', 'afterTransit', 'beforeResult'] as const)(
  'rolls back send source, transfer, transit, audit, outcome and balance on %s failure',
  async (hook) => {
    const c = f.send({ amountMinor: '100' }),
      before = await totals();
    const failing = treasuryCommands(db.pool, {
      [hook]: async () => {
        throw Error('INJECTED_FAILURE');
      },
    });
    await expect(failing.execute(f.staffA.token, c)).rejects.toThrow('INJECTED_FAILURE');
    expect(await totals()).toEqual(before);
    for (const [table, column] of [
      ['command_record', 'command_id'],
      ['finance.treasury_transfer', 'id'],
      ['kernel.source_record', 'identity'],
    ])
      expect(
        (
          await db.pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${column}=$1`, [
            column === 'command_id' ? c.commandId : c.transferId,
          ])
        ).rows[0].n,
      ).toBe(0);
  },
);
it.each(['afterDebit', 'afterTransfer', 'afterTransit', 'beforeResult'] as const)(
  'rolls back full receipt and keeps pending obligations on %s failure',
  async (hook) => {
    const sent = await run(f.send({ amountMinor: '100' })),
      c = f.receive(sent.transferId),
      before = await totals();
    await expect(
      treasuryCommands(db.pool, {
        [hook]: async () => {
          throw Error('INJECTED_RECEIPT_FAILURE');
        },
      }).execute(f.staffB.token, c),
    ).rejects.toThrow('INJECTED_RECEIPT_FAILURE');
    expect(await totals()).toEqual(before);
    expect((await detail(sent.transferId)).state).toBe('sent');
    expect(
      (
        await db.pool.query('SELECT count(*)::int AS n FROM command_record WHERE command_id=$1', [
          c.commandId,
        ])
      ).rows[0].n,
    ).toBe(0);
    await run(c, f.staffB.token);
  },
);
async function waitingFor(fragment: string) {
  for (let i = 0; i < 150; i++) {
    if (
      (
        await db.pool.query(
          "SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND strpos(query,$1)>0 AND pid<>pg_backend_pid()",
          [fragment],
        )
      ).rowCount
    )
      return true;
    await new Promise((r) => setTimeout(r, 10));
  }
  return false;
}
function barrier() {
  let release!: () => void, entered!: () => void;
  const hold = new Promise<void>((r) => (release = r)),
    ready = new Promise<void>((r) => (entered = r));
  return {
    release,
    ready,
    hook: async () => {
      entered();
      await hold;
    },
  };
}
it('A03 serializes two committed receipts with distinct commands and connections to one destination effect', async () => {
  const c = f.send({ amountMinor: '100' });
  await run(c);
  const start = await balance(f.seed.cash.entityId),
    b = barrier();
  const first = treasuryCommands(db.pool, { afterAccountLock: b.hook }).execute(
    f.staffB.token,
    f.receive(c.transferId),
  );
  await Promise.race([b.ready, first]);
  const second = service.execute(f.staffAB.token, f.receive(c.transferId));
  const waiting = await waitingFor('kernel.source_record');
  b.release();
  const results = await Promise.all([first, second]);
  expect(waiting).toBe(true);
  expect(results.map((r) => (r.body as TreasuryResult).outcome).sort()).toEqual([
    'already_received',
    'received',
  ]);
  expect(await balance(f.seed.cash.entityId)).toBe((BigInt(start) + 100n).toString());
  expect((await detail(c.transferId)).history).toHaveLength(2);
  evidence.A03 = { waiting, results: results.map((r) => r.body) };
});
it.each(['send', 'withdrawal'] as const)(
  'send/withdrawal independent race: %s first cannot spend beyond1000',
  async (firstKind) => {
    const account = await f.create('P10 race ' + firstKind);
    await f.deposit(account.entityId);
    const send = f.send({ sourceAccountId: account.entityId, amountMinor: '70000' }),
      withdraw = f.withdrawal(account.entityId),
      b = barrier();
    const first =
      firstKind === 'send'
        ? treasuryCommands(db.pool, { afterAccountLock: b.hook }).execute(f.staffA.token, send)
        : (await import('../../apps/api/src/modules/finance/service.js'))
            .financeCommands(db.pool, { afterAccountLock: b.hook })
            .execute(f.admin.token, withdraw);
    await Promise.race([b.ready, first]);
    const second = (
      firstKind === 'send'
        ? f.finance.execute(f.staffAB.token, withdraw)
        : service.execute(f.staffAB.token, send)
    ).catch((e) => e);
    const waiting = await waitingFor('kernel.resource');
    b.release();
    await first;
    expect((await second).code).toBe('INSUFFICIENT_FUNDS');
    expect(waiting).toBe(true);
    expect(await balance(account.entityId)).toBe('30000');
    evidence['race-' + firstKind] = { waiting, sourceMinor: '30000' };
  },
);
it('A04 races two sends700 against1000, one committed source debit/transit', async () => {
  const account = await f.create('P10 two sends');
  await f.deposit(account.entityId);
  const b = barrier(),
    one = f.send({ sourceAccountId: account.entityId, amountMinor: '70000' }),
    two = f.send({ sourceAccountId: account.entityId, amountMinor: '70000' });
  const p1 = treasuryCommands(db.pool, { afterAccountLock: b.hook }).execute(f.staffA.token, one);
  await Promise.race([b.ready, p1]);
  const p2 = service.execute(f.staffAB.token, two).catch((e) => e);
  const waiting = await waitingFor('kernel.resource');
  b.release();
  await p1;
  expect((await p2).code).toBe('INSUFFICIENT_FUNDS');
  expect(waiting).toBe(true);
  expect(await balance(account.entityId)).toBe('30000');
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int AS n,sum(amount_minor)::text AS amount FROM finance.treasury_transfer WHERE source_account_id=$1',
        [account.entityId],
      )
    ).rows[0],
  ).toEqual({ n: 1, amount: '70000' });
  evidence.A04 = { waiting, sourceMinor: '30000', transitMinor: '70000' };
});
it('blocks unsafe source/destination deactivation and usage removal with transfer reference; immutable snapshots survive renaming', async () => {
  const a = await f.create('P10 lifecycle A'),
    b = await f.create('P10 lifecycle B', f.b);
  await f.deposit(a.entityId);
  const t = await run(f.send({ sourceAccountId: a.entityId, destinationAccountId: b.entityId }));
  for (const id of [a.entityId, b.entityId]) {
    const response = await f.finance
      .execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'account.deactivate',
        accountId: id,
        expectedVersion: 1,
      })
      .catch((e) => e);
    expect(response.reply.body.code).toBe('ACCOUNT_OBLIGATIONS_PENDING');
    expect(response.reply.body.details.obligations).toContainEqual({
      owner: 'treasury_transfer',
      sourceIdentity: t.transferId,
    });
  }
  await f.finance.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'account.update',
    accountId: b.entityId,
    expectedVersion: 1,
    fields: {
      name: 'P10 renamed B',
      type: 'cash',
      currency: 'EGP',
      branchIds: [f.b],
      active: true,
      bankDescription: '',
    },
  });
  expect((await detail(t.transferId)).destinationAccountName).toBe('P10 lifecycle B');
  await run(f.receive(t.transferId), f.staffB.token);
  await f.finance.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'account.deactivate',
    accountId: b.entityId,
    expectedVersion: 2,
  });
  expect((await detail(t.transferId)).receipt).not.toBeNull();
  await expect(
    db.pool.query('DELETE FROM finance.treasury_transfer WHERE id=$1', [t.transferId]),
  ).rejects.toThrow('TRANSFER_HISTORY_RETAINED');
  await expect(
    db.pool.query(
      'UPDATE finance.treasury_transit_movement SET amount_minor=1 WHERE transfer_id=$1',
      [t.transferId],
    ),
  ).rejects.toThrow('IMMUTABLE_KERNEL_HISTORY');
});
it('serves closed HTTP pending/detail/filter queries without granting general account history; unknown/stale receipt safe', async () => {
  const c = f.send({ amountMinor: '100' });
  await run(c);
  const q = `?companyId=${f.company}&sourceBranchId=${f.a}&destinationBranchId=${f.b}&state=sent&dateBasis=sent&from=2026-09-01&to=2026-09-01&limit=1`;
  const list = await http('/receipts' + q, undefined, f.staffB);
  expect(list.status).toBe(200);
  expect(list.body.items).toHaveLength(1);
  expect(list.body.total).toBeGreaterThan(1);
  expect(
    (
      await http(
        '/receipts?companyId=' + f.company + '&destinationBranchId=' + f.foreign,
        undefined,
        f.staffB,
      )
    ).status,
  ).toBe(403);
  expect(
    (await http('/receipts?companyId=' + f.company + '&accountHistory=true', undefined, f.staffB))
      .status,
  ).toBe(400);
  expect((await http('/commands', f.receive(randomUUID()), f.staffB)).status).toBe(404);
  expect(
    (await http('/commands', f.receive(c.transferId, { expectedVersion: 2 }), f.staffB)).body,
  ).toMatchObject({ code: 'REVISION_CONFLICT', currentVersion: 1 });
  expect(
    (
      await http(
        '/commands',
        f.receive(c.transferId, { actualReceivedAt: '2026-08-31T00:00:00Z' }),
        f.staffB,
      )
    ).body.code,
  ).toBe('RECEIPT_BEFORE_SEND');
  expect((await http('/commands', f.send(), { ...f.staffA, csrfToken: 'bad' })).status).toBe(403);
  const r = await fetch(
    origin + '/api/v1/finance/accounts/' + f.source.entityId + '/movements?companyId=' + f.company,
    { headers: { Cookie: 'erp_session=' + f.staffA.token } },
  );
  expect(r.status).toBe(403);
  const catalog = await UnitOfWork.run(
    db.pool,
    f.staffB.token,
    f.company,
    'treasury.receive',
    (u) => treasuryCatalog(u, 'receive'),
  );
  expect(catalog.accounts).toEqual([]);
  const search = await UnitOfWork.run(db.pool, f.staffA.token, f.company, 'treasury.send', (u) =>
    transferList(u, filter({ search: list.body.items[0].reference as string }), 'send'),
  );
  expect(search.total).toBe(1);
});
it('protects actual shared-bank allowed usage and pending obligations against API and direct SQL removal', async () => {
  const sent = await run(
    f.send({ destinationAccountId: f.seed.bank.entityId, amountMinor: '100' }),
  );
  await expect(
    f.finance.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'account.update',
      accountId: f.seed.bank.entityId,
      expectedVersion: 1,
      fields: {
        name: 'P09 بنك الشركة',
        type: 'bank',
        currency: 'EGP',
        branchIds: [f.a],
        active: true,
        bankDescription: 'حساب تجريبي',
      },
    }),
  ).rejects.toThrow('ACCOUNT_OBLIGATIONS_PENDING');
  await expect(
    db.pool.query(
      'DELETE FROM finance.account_usage WHERE company_id=$1 AND account_id=$2 AND branch_id=$3',
      [f.company, f.seed.bank.entityId, f.b],
    ),
  ).rejects.toThrow('ACCOUNT_OBLIGATIONS_PENDING');
  await expect(
    db.pool.query(
      "UPDATE finance.account_obligation SET resolved_at=clock_timestamp() WHERE company_id=$1 AND source_identity=$2 AND owner='treasury_transfer'",
      [f.company, sent.transferId],
    ),
  ).rejects.toThrow('TRANSFER_OBLIGATION_STILL_PENDING');
  await run(f.receive(sent.transferId), f.staffB.token);
  expect((await detail(sent.transferId)).transitMinor).toBe('0');
});
it('enforces SQL positive amount, source uniqueness, same-company FKs and immutable scope snapshots', async () => {
  const t = (
    await db.pool.query('SELECT * FROM finance.treasury_transfer WHERE id=$1', [transferId])
  ).rows[0];
  await expect(
    db.pool.query('UPDATE finance.treasury_transfer SET destination_account_name=$2 WHERE id=$1', [
      transferId,
      'tampered',
    ]),
  ).rejects.toThrow('IMMUTABLE_TRANSFER');
  await expect(
    db.pool.query(
      `INSERT INTO finance.treasury_transit_movement(company_id,id,transfer_id,phase,amount_minor,source_id,money_effect_id)
 SELECT company_id,$2,transfer_id,phase,amount_minor,source_id,money_effect_id FROM finance.treasury_transit_movement WHERE transfer_id=$1 AND phase='receive'`,
      [transferId, randomUUID()],
    ),
  ).rejects.toThrow('duplicate key');
  const columns =
    'company_id,id,source_account_id,destination_account_id,source_branch_id,destination_branch_id,source_account_name,destination_account_name,source_branch_name,destination_branch_name,amount_minor,currency,actual_sent_at,sender_id,sender_name,send_source_id,send_movement_id,send_command_record_id';
  for (const invalid of ['negative', 'company'] as const)
    await expect(
      db.pool.query(
        `INSERT INTO finance.treasury_transfer(${columns}) VALUES($1,$2,$3,$4,$5,$6,'a','b','A','B',$7,'EGP',$8,$9,'actor',$10,$11,$12)`,
        [
          invalid === 'company' ? f.other : f.company,
          randomUUID(),
          f.source.entityId,
          f.seed.cash.entityId,
          f.a,
          f.b,
          invalid === 'negative' ? '-1' : '1',
          t.actual_sent_at,
          f.staffA.id,
          randomUUID(),
          randomUUID(),
          randomUUID(),
        ],
      ),
    ).rejects.toThrow(invalid === 'negative' ? 'check constraint' : 'foreign key');
});
it('same person with both grants sends/receives, permanent command outcomes recover after compaction without credit twice', async () => {
  const sent = await run(f.send({ amountMinor: '100' }), f.staffAB.token),
    c = f.receive(sent.transferId),
    r = await run(c, f.staffAB.token);
  await db.pool.query('ALTER TABLE command_record DISABLE TRIGGER immutable_command');
  try {
    await db.pool.query(
      "UPDATE command_record SET retain_until=clock_timestamp()-interval '1 day' WHERE command_id=$1",
      [c.commandId],
    );
  } finally {
    await db.pool.query('ALTER TABLE command_record ENABLE TRIGGER immutable_command');
  }
  await compactCommandResults(db.pool);
  expect(
    (await service.recover(f.staffAB.token, f.company, 'treasury.receive', c.commandId)).body,
  ).toEqual(r);
  expect(await run(c, f.staffAB.token)).toEqual(r);
  expect((await detail(sent.transferId)).history).toHaveLength(2);
});
it('A08 crashes actual receipt process before/after commit, restarts and recovers one source/transit/destination result', async () => {
  const sent = await run(f.send({ amountMinor: '100' })),
    c = f.receive(sent.transferId),
    before = await balance(f.seed.cash.entityId);
  const start = async (mode: string) => {
    const child = fork('tests/p10/crash-server.ts', [], {
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: 'tsconfig.base.json',
        P10_TEST_DATABASE_URL: db.url,
        P10_CRASH: mode,
      },
      windowsHide: true,
    });
    const childOrigin = await new Promise<string>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) => reject(Error('CRASH_START_' + code)));
      child.on('message', (m) => {
        if ((m as { origin?: string }).origin) resolve((m as { origin: string }).origin);
      });
    });
    return { child, origin: childOrigin };
  };
  const request = (url: string) =>
    fetch(url + '/api/test/treasury-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: f.staffB.token, command: c }),
    });
  const early = await start('before'),
    earlyExit = once(early.child, 'exit');
  await expect(request(early.origin)).rejects.toThrow();
  expect((await earlyExit)[0]).toBe(74);
  expect(await balance(f.seed.cash.entityId)).toBe(before);
  expect((await detail(sent.transferId)).state).toBe('sent');
  const late = await start('after'),
    lateExit = once(late.child, 'exit');
  await expect(request(late.origin)).rejects.toThrow();
  expect((await lateExit)[0]).toBe(73);
  const restarted = await start('none');
  try {
    const reply = await (await request(restarted.origin)).json();
    expect(reply).toMatchObject({ outcome: 'received', commandId: c.commandId });
    expect(
      (await service.recover(f.staffB.token, f.company, 'treasury.receive', c.commandId)).body,
    ).toEqual(reply);
    expect(await balance(f.seed.cash.entityId)).toBe((BigInt(before) + 100n).toString());
    expect((await detail(sent.transferId)).history).toHaveLength(2);
    evidence.A08 = {
      beforeExit: 74,
      afterExit: 73,
      recovered: reply,
      transfer: await detail(sent.transferId),
    };
  } finally {
    const exit = once(restarted.child, 'exit');
    restarted.child.send('stop');
    await exit;
  }
}, 60000);
