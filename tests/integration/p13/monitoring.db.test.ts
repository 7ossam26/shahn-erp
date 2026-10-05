import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { executionFixture } from './fixtures.js';
import { MonitoringReader } from '../../../apps/api/src/modules/execution/monitoring-reader.service.js';
import {
  RoundEvidenceService,
  assertRoundEvidenceBasis,
} from '../../../apps/api/src/modules/execution/round-evidence.service.js';
import { HistoryEvidenceService } from '../../../apps/api/src/modules/execution/history-evidence.service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { validFixtures } from '../p11/fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof executionFixture>>,
  reader: MonitoringReader;
let mode = 'ok',
  requests = 0,
  restarts = 0;
let historyItems: Record<string, unknown>[] | null = null;
const original = validFixtures.find((x) => x.id === 'monitoring-scoped')!.data as Record<
  string,
  unknown
>;
const body = structuredClone(original) as {
  driverId: string;
  scopeKey: string;
  snapshotRevision: number;
  nextCursor: string | null;
  items: unknown[];
  freshness: { refreshedAt: string };
  round: { roundId: string; workdayId: string; startedAt: string; endedAt: string | null };
  workday: { workdayId: string; openedAt: string; endedAt: string | null };
};
const server = createServer((req, res) => {
  requests++;
  res.setHeader('content-type', 'application/json');
  res.setHeader('etag', '"p13"');
  res.setHeader('x-snapshot-scope', body.scopeKey);
  res.setHeader('x-snapshot-revision', String(body.snapshotRevision));
  res.setHeader('x-refreshed-at', new Date().toISOString());
  if (mode === '304') {
    res.statusCode = 304;
    res.end();
    return;
  }
  if (['404', '503'].includes(mode)) {
    res.statusCode = Number(mode);
    res.end('{}');
    return;
  }
  const url = new URL(req.url!, 'http://localhost');
  if (historyItems && url.pathname.endsWith('/history')) {
    const h = structuredClone(
      validFixtures.find((x) => x.id === 'monitoring-history')!.data,
    ) as Record<string, unknown>;
    h.resourceId = url.pathname.split('/').at(-2);
    h.items = historyItems;
    h.snapshotRevision = body.snapshotRevision;
    h.nextCursor = null;
    res.end(JSON.stringify(h));
    return;
  }
  if (mode === 'pagination' && url.searchParams.has('cursor') && !restarts++) {
    res.statusCode = 409;
    res.end('{}');
    return;
  }
  const response = structuredClone(body);
  if (mode === 'pagination' && !url.searchParams.has('cursor')) response.nextCursor = 'page-two';
  if (mode === 'scope-conflict' && url.searchParams.has('cursor')) response.scopeKey = 'different';
  if (mode === 'foreign')
    response.items = [
      {
        ...(original.items as Record<string, unknown>[])[0],
        integrationId: '11111111-1111-4111-8111-111111111111',
      },
    ];
  res.end(JSON.stringify(response));
});
beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await executionFixture(db.pool, 'http://127.0.0.1:5331', 'http://127.0.0.1:' + port);
  reader = new MonitoringReader(db.pool, f.runtime);
  body.items = [];
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
  await db?.dispose();
});
it('fetches authorized scoped HTTP data, retains body on 304 and updates refresh metadata', async () => {
  const a = await reader.read(f.admin.token, f.company, 'drivers', body.driverId);
  expect(a.stale).toBe(false);
  mode = '304';
  const b = await reader.read(f.admin.token, f.company, 'drivers', body.driverId);
  expect(b.body).toEqual(a.body);
  expect(b.status).toBe(304);
  expect(b.refreshedAt).not.toBeNull();
});
it('keeps 503 visibly stale; hides cached source body on 404 without deleting native history', async () => {
  mode = '503';
  const a = await reader.read(f.admin.token, f.company, 'drivers', body.driverId);
  expect(a.stale).toBe(true);
  expect(a.body).not.toBeNull();
  mode = '404';
  expect((await reader.read(f.admin.token, f.company, 'drivers', body.driverId)).body).toBeNull();
  expect(
    (await db.pool.query('SELECT count(*)::int n FROM execution.monitoring_cache')).rows[0].n,
  ).toBe(1);
});
it('discards a partial 409 page set and restarts under a stable scope/revision', async () => {
  mode = 'pagination';
  requests = 0;
  restarts = 0;
  const a = await reader.read(f.admin.token, f.company, 'drivers', body.driverId);
  expect(a.stale).toBe(false);
  expect(a.pages).toBe(2);
  expect(requests).toBe(4);
});
it('rejects foreign source filtering and requires sourceId for action reads', async () => {
  mode = 'foreign';
  await expect(reader.read(f.admin.token, f.company, 'drivers', body.driverId)).rejects.toThrow(
    'MONITORING_SOURCE_CONFLICT',
  );
  await expect(reader.read(f.admin.token, f.company, 'actions', body.driverId)).rejects.toThrow(
    'VALIDATION_FAILED',
  );
});
it('a quiet inbox and snapshot cannot certify a round without a closure and complete history', async () => {
  mode = 'ok';
  const service = new RoundEvidenceService(db.pool, reader);
  await expect(service.refresh(f.admin.token, f.company, body.round.roundId)).rejects.toThrow(
    'INVALID_MONITORING_RESPONSE',
  );
});
it('recovers a missing predecessor from complete authorized history without inventing event sequence; witness invalidates on later correction', async () => {
  mode = 'ok';
  const x = await f.received({
    lines: [
      {
        id: randomUUID(),
        description: 'قطعتان',
        quantity: 2,
        unitDue: { currency: 'EGP', amountMinor: '12500' },
      },
    ],
  });
  await f.receive(x.arrival());
  await f.worker.runOne();
  const o = await x.outcome('full'),
    revised = structuredClone(o);
  revised.outcome = 'partial';
  revised.outcomeId = randomUUID();
  revised.revision = 2;
  revised.lines[0]!.delivered = 1;
  revised.lines[0]!.heldReturnRequired = 1;
  revised.returnRequired = true;
  revised.collection.goods.amountMinor = 12500;
  revised.collection.reported!.amountMinor = 17500;
  revised.time = f.time();
  const correction = {
    correctionId: randomUUID(),
    previousOutcomeId: o.outcomeId,
    previousRevision: 1,
    outcome: revised,
    evidenceActionId: null,
    evidenceReceiptId: null,
  };
  await f.receive(
    f.event('outcome.corrected', { correction, previousOutcome: o }, x.task.taskId, 2),
  );
  await f.worker.runOne();
  expect(
    (
      await db.pool.query(
        `SELECT pending_reason FROM integration.inbox WHERE aggregate_id=$1 AND recipient_sequence=2`,
        [x.task.taskId],
      )
    ).rows[0].pending_reason,
  ).toBe('PREDECESSOR_OUTCOME_REQUIRED');
  historyItems = [{ kind: 'outcome', outcome: o, effective: true }];
  const history = new HistoryEvidenceService(db.pool, reader);
  expect((await history.refresh(f.admin.token, f.company, x.task.taskId)).pending).toEqual([]);
  expect(
    (
      await db.pool.query(
        `SELECT event_id,evidence_id FROM execution.outcome_fact WHERE outcome_id=$1`,
        [o.outcomeId],
      )
    ).rows[0],
  ).toMatchObject({ event_id: null, evidence_id: expect.any(String) });
  await f.worker.runOne();
  expect(
    (
      await db.pool.query(
        `SELECT applied_through::text FROM integration.checkpoint WHERE aggregate_id=$1`,
        [x.task.taskId],
      )
    ).rows[0].applied_through,
  ).toBe('2');
  historyItems = [
    { kind: 'outcome', outcome: o, effective: false },
    { kind: 'outcome', outcome: revised, effective: true },
    { kind: 'correction', correction },
  ];
  await history.refresh(f.admin.token, f.company, x.task.taskId);
  expect(
    (
      await db.pool.query(`SELECT count(*)::int n FROM execution.visit_fact WHERE task_id=$1`, [
        x.task.taskId,
      ])
    ).rows[0].n,
  ).toBe(1);
  body.driverId = f.driverResource;
  body.round = {
    roundId: x.roundId,
    workdayId: x.workdayId,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
  };
  body.workday = { workdayId: x.workdayId, openedAt: new Date().toISOString(), endedAt: null };
  body.items = [];
  const closure = f.event(
    'round.ended',
    {
      closureId: randomUUID(),
      driverId: f.driverResource,
      workdayId: x.workdayId,
      endedRoundId: x.roundId,
      roundEndedAt: new Date().toISOString(),
      workdayEndedAt: null,
      time: f.time(),
      tasks: [
        {
          taskId: x.task.taskId,
          dispatchCycleId: x.task.dispatchCycleId,
          sourceReference: o.sourceReference,
          sourceDispatchCycleId: x.task.sourceDispatchCycleId,
        },
      ],
    },
    x.roundId,
    2,
    'trip',
  );
  await f.receive(closure);
  await f.worker.runOne();
  const service = new RoundEvidenceService(db.pool, reader),
    a = await service.refresh(f.admin.token, f.company, x.roundId);
  expect(a.blockers).toEqual([]);
  expect(a.expectedRecipientMinor).toBe('17500');
  const guard = () =>
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'integration', (u) =>
      assertRoundEvidenceBasis(u, x.roundId, a.revision, a.digest),
    );
  await guard();
  const later = structuredClone(o);
  later.outcomeId = randomUUID();
  later.revision = 3;
  later.time = f.time();
  const next = {
    ...correction,
    correctionId: randomUUID(),
    previousOutcomeId: revised.outcomeId,
    previousRevision: 2,
    outcome: later,
  };
  await f.receive(
    f.event('outcome.corrected', { correction: next, previousOutcome: revised }, x.task.taskId, 3),
  );
  await f.worker.runOne();
  await expect(guard()).rejects.toThrow('ROUND_BASIS_CHANGED_OR_INCOMPLETE');
  body.snapshotRevision++;
  historyItems = [
    { kind: 'outcome', outcome: o, effective: false },
    { kind: 'outcome', outcome: revised, effective: false },
    { kind: 'outcome', outcome: later, effective: true },
    { kind: 'correction', correction },
    { kind: 'correction', correction: next },
  ];
  const b = await service.refresh(f.admin.token, f.company, x.roundId);
  expect(b.revision).not.toBe(a.revision);
  expect(b.expectedRecipientMinor).toBe('30000');
});
it('history-only outcome followed by delayed arrival retains outcome state and posts one allocation', async () => {
  mode = 'ok';
  const x = await f.received(),
    o = await x.outcome('full');
  historyItems = [{ kind: 'outcome', outcome: o, effective: true }];
  await new HistoryEvidenceService(db.pool, reader).refresh(
    f.admin.token,
    f.company,
    x.task.taskId,
  );
  expect(
    (
      await db.pool.query(`SELECT count(*)::int n FROM execution.visit_fact WHERE task_id=$1`, [
        x.task.taskId,
      ])
    ).rows[0].n,
  ).toBe(0);
  await f.receive(x.arrival());
  await f.worker.runOne();
  expect(
    (
      await db.pool.query(
        `SELECT st.data,a.goods_minor::text FROM execution.state st JOIN execution.visit_fact v ON(v.company_id,v.task_id)=(st.company_id,st.identity::uuid) JOIN execution.allocation a ON(a.company_id,a.visit_id)=(v.company_id,v.id) WHERE st.kind='task' AND st.identity=$1`,
        [x.task.taskId],
      )
    ).rows[0],
  ).toMatchObject({
    data: { type: 'outcome.recorded', record: { outcome: 'full' } },
    goods_minor: '25000',
  });
  expect(
    (
      await db.pool.query(`SELECT event_id FROM execution.outcome_fact WHERE outcome_id=$1`, [
        o.outcomeId,
      ])
    ).rows[0].event_id,
  ).toBeNull();
});
it('rechecks native authorization before returning cached data after revocation', async () => {
  await db.pool.query(`INSERT INTO access.user_exception VALUES($1,$2,'integration','deny')`, [
    f.company,
    f.admin.id,
  ]);
  mode = '304';
  await expect(reader.read(f.admin.token, f.company, 'drivers', body.driverId)).rejects.toThrow(
    'FORBIDDEN_SCOPE',
  );
});
