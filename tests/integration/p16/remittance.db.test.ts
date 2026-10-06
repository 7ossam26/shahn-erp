import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { RemittanceResult } from '@shahn/contracts';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import {
  RemittanceService,
  remittanceDetail,
} from '../../../apps/api/src/modules/finance/remittances/service.js';
import { remittanceFixture } from './fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof remittanceFixture>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await remittanceFixture(db.pool);
});
afterAll(async () => {
  await f?.close();
  await db?.dispose();
});
const count = async (table: string) =>
  Number((await db.pool.query(`SELECT count(*) n FROM ${table}`)).rows[0].n);
it('A01 counts eight effective paid reports among ten assigned, preserving null versus explicit zero', async () => {
  const x = await f.makeRound([
    'full',
    'full',
    'full',
    'full',
    'full',
    'full',
    'full',
    'full',
    'refused',
    'no-answer',
  ]);
  const w = await f.prepare(x.scope);
  expect(w.blockers).toEqual([]);
  expect(w.expectedMinor).toBe('280000');
  expect(
    w.sources.filter((s) => s.reportedMinor !== null && BigInt(s.reportedMinor) > 0n),
  ).toHaveLength(8);
  expect(w.sources.filter((s) => s.reportedMinor === null)).toHaveLength(1);
  expect(w.sources.filter((s) => s.reportedMinor === '0')).toHaveLength(1);
});
it('A02/A03 exact 800 cash + 200 InstaPay releases only 850 goods, with immutable unique coverage', async () => {
  const x = await f.makeRound(),
    input = await f.input(x.scope),
    before = await count('finance.remittance');
  const short = {
    ...input,
    commandId: randomUUID(),
    components: [{ ...input.components[0]!, amountMinor: '99900' }],
  };
  await expect(f.service.confirm(f.admin.token, short)).rejects.toMatchObject({
    code: 'EXACT_REMITTANCE_REQUIRED',
  });
  expect(await count('finance.remittance')).toBe(before);
  await expect(
    f.service.confirm(f.admin.token, {
      ...short,
      commandId: randomUUID(),
      components: [{ ...short.components[0]!, amountMinor: '100100' }],
    }),
  ).rejects.toMatchObject({ code: 'EXACT_REMITTANCE_REQUIRED' });
  const r = (await f.service.confirm(f.admin.token, input)).body as RemittanceResult;
  expect(r.amountMinor).toBe('100000');
  expect(
    (
      await db.pool.query(
        `SELECT amount_minor::text FROM finance.account_balance WHERE account_id=ANY($1::uuid[]) ORDER BY amount_minor`,
        [f.accounts],
      )
    ).rows.map((r) => r.amount_minor),
  ).toEqual(['20000', '80000']);
  expect(
    (
      await db.pool.query(
        `SELECT sum(l.amount_minor)::text AS amount FROM kernel.credit_release cr JOIN kernel.credit_lot l ON(l.company_id,l.id)=(cr.company_id,cr.lot_id) JOIN finance.remittance_source s ON(s.company_id,s.credit_lot_id)=(l.company_id,l.id) WHERE s.remittance_id=$1`,
        [r.id],
      )
    ).rows[0].amount,
  ).toBe('85000');
  expect((await f.service.confirm(f.admin.token, input)).body).toEqual(r);
  await mkdir('docs/verification/P16', { recursive: true });
  const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'remittances', (u) =>
    remittanceDetail(u, r.id),
  );
  await writeFile(
    'docs/verification/P16/native-journal-evidence.json',
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        provenance:
          'Isolated real PostgreSQL and native services; controlled source HTTP fixtures, not public Tawsel acceptance',
        postgres: (await db.pool.query('SHOW server_version')).rows[0],
        detail,
        accounts: (
          await db.pool.query(
            'SELECT account_id,amount_minor::text FROM finance.account_balance WHERE account_id=ANY($1::uuid[])',
            [f.accounts],
          )
        ).rows,
        releases: (
          await db.pool.query(
            'SELECT l.id,l.amount_minor::text,cr.source_id FROM kernel.credit_release cr JOIN kernel.credit_lot l ON(l.company_id,l.id)=(cr.company_id,cr.lot_id) JOIN finance.remittance_source s ON(s.company_id,s.credit_lot_id)=(l.company_id,l.id) WHERE s.remittance_id=$1',
            [r.id],
          )
        ).rows,
      },
      null,
      2,
    ) + '\n',
  );
  expect((await f.prepare(x.scope)).expectedMinor).toBe('0');
  await expect(
    f.service.confirm(f.admin.token, { ...input, actualDate: '2026-01-01' }),
  ).rejects.toMatchObject({ code: 'COMMAND_PAYLOAD_CONFLICT' });
  await expect(
    db.pool.query(`UPDATE finance.remittance SET amount_minor=1 WHERE id=$1`, [r.id]),
  ).rejects.toThrow('IMMUTABLE');
});
it('A04 source pages/409/304/denial/outage retain uncertainty and do not certify partial data', async () => {
  const x = await f.makeRound();
  f.setMode('pagination');
  const w = await f.prepare(x.scope);
  expect(w.blockers).toEqual([]);
  expect(f.requestCount()).toBeGreaterThan(5);
  f.setMode('304');
  expect((await f.prepare(x.scope)).digest).toBe(w.digest);
  for (const mode of ['missing-page', '401', '403', '404', '503', 'end-conflict']) {
    f.setMode(mode);
    expect((await f.prepare(x.scope)).blockers.length).toBeGreaterThan(0);
  }
  f.setMode('ok');
  expect((await f.prepare(x.scope)).blockers).toEqual([]);
});
it('A05 different commands racing one round produce one receipt and one coverage set', async () => {
  const x = await f.makeRound(),
    input = await f.input(x.scope),
    before = await count('finance.remittance');
  const result = await Promise.allSettled([
    f.service.confirm(f.admin.token, input),
    f.service.confirm(f.admin.token, { ...input, commandId: randomUUID() }),
  ]);
  expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await count('finance.remittance')).toBe(before + 1);
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int n FROM finance.remittance_source WHERE task_id=ANY($1::uuid[])`,
        [x.round.taskIds],
      )
    ).rows[0].n,
  ).toBe(2);
});
it('A06 correction before confirmation rejects stale witness and accepts the reviewed amount', async () => {
  const x = await f.makeRound(),
    input = await f.input(x.scope);
  await f.correct(x.round);
  await expect(f.service.confirm(f.admin.token, input)).rejects.toMatchObject({
    code: 'REMITTANCE_WITNESS_CHANGED',
  });
  const newInput = await f.input(x.scope, ['70000']);
  expect(newInput.witnessId).not.toBe(input.witnessId);
  expect(
    ((await f.service.confirm(f.admin.token, newInput)).body as RemittanceResult).amountMinor,
  ).toBe('70000');
});
it('A07 accepted correction after receipt preserves cash and creates one linked review and affected hold', async () => {
  const x = await f.makeRound(),
    input = await f.input(x.scope),
    r = (await f.service.confirm(f.admin.token, input)).body as RemittanceResult;
  const money = await count('finance.money_movement'),
    event = await f.correct(x.round);
  await f.receive(event);
  await f.worker.runOne();
  const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'remittances', (u) =>
    remittanceDetail(u, r.id),
  );
  expect(detail.reviews).toHaveLength(1);
  expect(detail.amountMinor).toBe('100000');
  expect(await count('finance.money_movement')).toBe(money);
  expect(
    (
      await db.pool.query(
        `SELECT sum(h.amount_minor)::text amount FROM kernel.wallet_hold h JOIN finance.remittance_source s ON(s.company_id,s.credit_lot_id)=(h.company_id,h.lot_id) WHERE s.remittance_id=$1`,
        [r.id],
      )
    ).rows[0].amount,
  ).toBe('25000');
});
it('A08 explicit zero and unreported no-answer are checked without account movement or credit release', async () => {
  const x = await f.makeRound(['refused', 'no-answer']),
    input = await f.input(x.scope, []),
    money = await count('finance.money_movement'),
    credits = await count('kernel.credit_release');
  expect(((await f.service.confirm(f.admin.token, input)).body as RemittanceResult).kind).toBe(
    'checked',
  );
  expect(await count('finance.money_movement')).toBe(money);
  expect(await count('kernel.credit_release')).toBe(credits);
});
it('rolls all effects back at coverage, money, release and result fault boundaries', async () => {
  const x = await f.makeRound();
  for (const stage of ['coverage', 'money', 'release', 'result'] as const) {
    const input = await f.input(x.scope),
      before = await count('finance.remittance'),
      money = await count('finance.money_movement'),
      credits = await count('kernel.credit_release');
    const service = new RemittanceService(db.pool, f.evidence, {
      fault: async (at) => {
        if (at === stage) throw Error('INJECTED_' + stage);
      },
    });
    await expect(service.confirm(f.admin.token, input)).rejects.toThrow('INJECTED_');
    expect(await count('finance.remittance')).toBe(before);
    expect(await count('finance.money_movement')).toBe(money);
    expect(await count('kernel.credit_release')).toBe(credits);
    expect(
      (await db.pool.query('SELECT 1 FROM command_record WHERE command_id=$1', [input.commandId]))
        .rowCount,
    ).toBe(0);
  }
});
it('rechecks native branch/grant for review and retained result', async () => {
  const x = await f.makeRound(),
    input = await f.input(x.scope),
    r = await f.service.confirm(f.admin.token, input);
  await expect(f.evidence.refresh(f.staffB.token, x.scope)).rejects.toMatchObject({
    code: 'FORBIDDEN_SCOPE',
  });
  await db.pool.query(
    `INSERT INTO access.user_exception(company_id,user_id,capability,effect) VALUES($1,$2,'remittances','deny')`,
    [f.company, f.admin.id],
  );
  await expect(f.service.recover(f.admin.token, f.company, input.commandId)).rejects.toMatchObject({
    code: 'FORBIDDEN_SCOPE',
  });
  await db.pool.query(
    `DELETE FROM access.user_exception WHERE company_id=$1 AND user_id=$2 AND capability='remittances'`,
    [f.company, f.admin.id],
  );
  expect((await f.service.recover(f.admin.token, f.company, input.commandId)).body).toEqual(r.body);
});
it('A09 a process dies after commit; a separate restarted process recovers the same receipt', async () => {
  const x = await f.makeRound(),
    input = await f.input(x.scope),
    before = await count('finance.remittance');
  const child = (mode: 'commit' | 'recover') =>
    new Promise<{ code: number | null; stdout: string }>((resolve, reject) => {
      const proc = spawn(
        process.execPath,
        ['--import', 'tsx', 'tests/integration/p16/restart-child.ts'],
        { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
      );
      let stdout = '',
        stderr = '';
      proc.stdout.on('data', (x) => (stdout += String(x)));
      proc.stderr.on('data', (x) => (stderr += String(x)));
      proc.on('error', reject);
      proc.on('close', (code) =>
        code === 0 || code === 88 ? resolve({ code, stdout }) : reject(Error(stderr)),
      );
      proc.stdin.end(
        JSON.stringify({ mode, url: db.url, token: f.admin.token, runtime: f.runtime, input }),
      );
    });
  expect((await child('commit')).code).toBe(88);
  const recovered = JSON.parse((await child('recover')).stdout);
  expect(recovered.body.commandId).toBe(input.commandId);
  expect(await count('finance.remittance')).toBe(before + 1);
  expect((await f.service.confirm(f.admin.token, input)).body).toEqual(recovered.body);
});
it('confirmation wins the source lock; concurrently received correction follows with one review and unchanged cash', async () => {
  const x = await f.makeRound(),
    input = await f.input(x.scope);
  let entered!: () => void, release!: () => void, received!: () => void;
  const locked = new Promise<void>((r) => (entered = r)),
    proceed = new Promise<void>((r) => (release = r)),
    inbox = new Promise<void>((r) => (received = r));
  const service = new RemittanceService(db.pool, f.evidence, {
    fault: async (stage) => {
      if (stage === 'coverage') {
        entered();
        await proceed;
      }
    },
  });
  const confirming = service.confirm(f.admin.token, input);
  await locked;
  const correcting = f.correct(x.round, 0, async () => {
    received();
  });
  await inbox;
  release();
  const result = (await confirming).body as RemittanceResult;
  await correcting;
  const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'remittances', (u) =>
    remittanceDetail(u, result.id),
  );
  expect(detail.amountMinor).toBe('100000');
  expect(detail.reviews).toHaveLength(1);
  expect(
    (
      await db.pool.query(
        'SELECT sum(amount_minor)::text total FROM finance.remittance_component WHERE remittance_id=$1',
        [result.id],
      )
    ).rows[0].total,
  ).toBe('100000');
});
it('correction commits after remote refresh but before confirmation locks; stale money cannot post', async () => {
  const x = await f.makeRound(),
    input = await f.input(x.scope),
    before = await count('finance.remittance');
  const original = f.evidence.refresh.bind(f.evidence);
  f.evidence.refresh = async (token, scope) => {
    const read = await original(token, scope);
    await f.correct(x.round);
    return read;
  };
  try {
    await expect(f.service.confirm(f.admin.token, input)).rejects.toMatchObject({
      code: 'ROUND_BASIS_CHANGED_OR_INCOMPLETE',
    });
  } finally {
    f.evidence.refresh = original;
  }
  expect(await count('finance.remittance')).toBe(before);
});
it('a known predecessor gap blocks only its round, leaving an unrelated round usable', async () => {
  const x = await f.makeRound(),
    y = await f.makeRound();
  const task = x.round.taskIds[0]!;
  await db.pool.query(
    'UPDATE integration.checkpoint SET received_high=received_high+1 WHERE company_id=$1 AND aggregate_id=$2',
    [f.company, task],
  );
  try {
    expect((await f.prepare(x.scope)).blockers).toContain('KNOWN_STREAM_GAP');
    expect((await f.prepare(y.scope)).blockers).toEqual([]);
    expect(
      ((await f.service.confirm(f.admin.token, await f.input(y.scope))).body as RemittanceResult)
        .amountMinor,
    ).toBe('100000');
  } finally {
    await db.pool.query(
      'UPDATE integration.checkpoint SET received_high=received_high-1 WHERE company_id=$1 AND aggregate_id=$2',
      [f.company, task],
    );
  }
});
it('prepaid goods release no second goods credit; one round crossing Cairo midnight keeps its complete shipping-only receipt', async () => {
  const x = await f.makeRound(['full', 'full'], { prepaid: 'goods', crossMidnight: true }),
    w = await f.prepare(x.scope);
  expect(w.expectedMinor).toBe('15000');
  expect(w.sources.every((s) => s.goodsMinor === '0' && s.creditLotId === null)).toBe(true);
  const releases = await count('kernel.credit_release');
  expect(
    (
      (await f.service.confirm(f.admin.token, await f.input(x.scope, ['15000'])))
        .body as RemittanceResult
    ).amountMinor,
  ).toBe('15000');
  expect(await count('kernel.credit_release')).toBe(releases);
  const y = await f.makeRound(['full'], { prepaid: 'all' });
  expect((await f.prepare(y.scope)).expectedMinor).toBe('0');
  expect(
    ((await f.service.confirm(f.admin.token, await f.input(y.scope, []))).body as RemittanceResult)
      .kind,
  ).toBe('checked');
  expect(await count('kernel.credit_release')).toBe(releases);
});
