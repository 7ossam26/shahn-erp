import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { RemittanceCommand, RemittanceScope, FinanceResult } from '@shahn/contracts';
import type { OutcomeRecord } from '@shahn/contracts/execution';
import { executionFixture } from '../p13/fixtures.js';
import { validFixtures } from '../p11/fixtures.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { MonitoringReader } from '../../../apps/api/src/modules/execution/monitoring-reader.service.js';
import { RemittanceEvidenceService } from '../../../apps/api/src/modules/finance/remittances/evidence.service.js';
import { RemittanceService } from '../../../apps/api/src/modules/finance/remittances/service.js';
type Round = {
  roundId: string;
  workdayId: string;
  outcomes: OutcomeRecord[];
  startedAt: string;
  endedAt: string;
  taskIds: string[];
};
export async function remittanceFixture(pool: Pool, origin = 'http://127.0.0.1:5361') {
  const rounds = new Map<string, Round>();
  let mode = 'ok',
    requests = 0,
    restarts = 0;
  const server = createServer((req, res) => {
    requests++;
    res.setHeader('content-type', 'application/json');
    if (req.headers.authorization !== 'Bearer ' + fixture.connection.serviceBearer) {
      res.statusCode = 401;
      res.end('{}');
      return;
    }
    if (['401', '403', '404', '503'].includes(mode)) {
      res.statusCode = Number(mode);
      res.end('{}');
      return;
    }
    const url = new URL(req.url!, 'http://localhost'),
      history = url.pathname.endsWith('/history'),
      id = url.pathname.split('/').at(history ? -2 : -1)!;
    const round =
      [...rounds.values()].find(
        (r) => r.roundId === id || r.workdayId === id || r.taskIds.includes(id),
      ) ?? [...rounds.values()].at(-1)!;
    const body = structuredClone(
      validFixtures.find((f) => f.id === (history ? 'monitoring-history' : 'monitoring-scoped'))!
        .data,
    ) as Record<string, unknown>;
    body.scopeKey = 'p16:' + id;
    body.snapshotRevision = round.outcomes.reduce((n, o) => n + o.revision, 1);
    body.nextCursor = null;
    body.freshness = {
      refreshedAt: new Date().toISOString(),
      receivedEvidenceOnly: true,
      deviceContactAt: null,
      lastReceivedActionAt: null,
      integrationDelivery: 'unavailable',
    };
    if (history) {
      body.resourceId = id;
      body.items = round.outcomes
        .filter((o) => id === round.workdayId || o.taskId === id)
        .map((outcome) => ({ kind: 'outcome', outcome, effective: true }));
    } else {
      body.driverId = fixture.driverResource;
      body.round = {
        roundId: round.roundId,
        workdayId: round.workdayId,
        startedAt: round.startedAt,
        endedAt:
          mode === 'end-conflict'
            ? new Date(Date.parse(round.endedAt) + 1000).toISOString()
            : round.endedAt,
      };
      body.workday = { workdayId: round.workdayId, openedAt: round.startedAt, endedAt: null };
      body.items = [];
    }
    res.setHeader('etag', '"' + id + ':' + body.snapshotRevision + '"');
    res.setHeader('x-snapshot-scope', String(body.scopeKey));
    res.setHeader('x-snapshot-revision', String(body.snapshotRevision));
    res.setHeader('x-refreshed-at', new Date().toISOString());
    if (mode === '304' && req.headers['if-none-match']) {
      res.statusCode = 304;
      res.end();
      return;
    }
    if (mode === 'pagination' && url.searchParams.has('cursor') && !restarts++) {
      res.statusCode = 409;
      res.end('{}');
      return;
    }
    if ((mode === 'pagination' || mode === 'missing-page') && !url.searchParams.has('cursor')) {
      body.nextCursor = 'second';
      if (history) body.items = [];
    }
    if (mode === 'missing-page' && url.searchParams.has('cursor')) {
      res.statusCode = 503;
      res.end('{}');
      return;
    }
    res.end(JSON.stringify(body));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const fixture = await executionFixture(
    pool,
    origin,
    'http://127.0.0.1:' + (server.address() as { port: number }).port,
  );
  const f = fixture;
  await commercialCommands(pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'tariff.create',
    fields: {
      tierId: f.seed.tier,
      governorateId: f.seed.giza,
      areaId: null,
      amountMinor: '10000',
      active: true,
    },
  });
  const money = financeCommands(pool),
    accounts: string[] = [];
  for (const [type, name] of [
    ['cash', 'الخزنة'],
    ['bank', 'البنك'],
  ] as const) {
    const r = (
      await money.execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'account.create',
        fields: {
          name,
          type,
          currency: 'EGP',
          branchIds: [f.a],
          active: true,
          bankDescription: '',
        },
      })
    ).body as FinanceResult;
    accounts.push(r.entityId);
  }
  const reader = new MonitoringReader(pool, f.runtime),
    evidence = new RemittanceEvidenceService(pool, reader),
    service = new RemittanceService(pool, evidence);
  const makeRound = async (
    kinds: ('full' | 'refused' | 'no-answer')[] = ['full', 'full'],
    options: { prepaid?: 'goods' | 'all'; crossMidnight?: boolean } = {},
  ) => {
    const taskData = [];
    for (let i = 0; i < kinds.length; i++)
      taskData.push(
        await f.received({
          governorateId: i === 1 ? f.seed.giza : f.seed.cairo,
          areaId: null,
          ...(options.prepaid === 'all' ? { shippingPayer: 'brand' as const } : {}),
          lines: [
            {
              id: randomUUID(),
              description: 'بضاعة',
              quantity: 1,
              unitDue: {
                currency: 'EGP',
                amountMinor: options.prepaid ? '0' : i === 1 ? '60000' : '25000',
              },
            },
          ],
        }),
      );
    const round: Round = {
      roundId: randomUUID(),
      workdayId: randomUUID(),
      outcomes: [],
      taskIds: taskData.map((x) => x.task.taskId),
      startedAt: new Date(Date.now() - (options.crossMidnight ? 86400000 : 0)).toISOString(),
      endedAt: new Date().toISOString(),
    };
    await f.receive(
      f.event(
        'round.started',
        {
          roundId: round.roundId,
          workdayId: round.workdayId,
          driverId: f.driverResource,
          startedAt: round.startedAt,
          firstPlanId: randomUUID(),
          firstForecastId: randomUUID(),
          firstWorkloadId: randomUUID(),
          taskIds: round.taskIds,
        },
        round.roundId,
        1,
        'trip',
      ),
    );
    await f.worker.runOne();
    for (let i = 0; i < taskData.length; i++) {
      const x = taskData[i]!,
        a = x.arrival();
      a.payload.roundId = round.roundId;
      await f.receive(a);
      await f.worker.runOne();
      const o = await x.outcome(kinds[i]);
      o.roundId = round.roundId;
      o.workdayId = round.workdayId;
      round.outcomes.push(o);
      await f.receive(f.event('outcome.recorded', { outcome: o }, o.taskId, 2));
      await f.worker.runOne();
    }
    await f.receive(
      f.event(
        'round.ended',
        {
          closureId: randomUUID(),
          driverId: f.driverResource,
          workdayId: round.workdayId,
          endedRoundId: round.roundId,
          roundEndedAt: round.endedAt,
          workdayEndedAt: null,
          time: f.time(),
          tasks: round.outcomes.map((o) => ({
            taskId: o.taskId,
            dispatchCycleId: o.dispatchCycleId,
            sourceReference: o.sourceReference,
            sourceDispatchCycleId: o.sourceDispatchCycleId,
          })),
        },
        round.roundId,
        2,
        'trip',
      ),
    );
    await f.worker.runOne();
    rounds.set(round.roundId, round);
    return {
      round,
      scope: {
        companyId: f.company,
        branchId: f.a,
        driverId: f.driver,
        roundId: round.roundId,
      } satisfies RemittanceScope,
    };
  };
  const prepare = async (scope: RemittanceScope) =>
    (await evidence.refresh(f.admin.token, scope)).witness;
  const input = async (
    scope: RemittanceScope,
    amounts = ['80000', '20000'],
  ): Promise<RemittanceCommand> => {
    const w = await prepare(scope);
    return {
      ...scope,
      schemaVersion: 1,
      type: 'remittance.confirm',
      commandId: randomUUID(),
      witnessId: w.id,
      expectedRevision: w.revision,
      expectedDigest: w.digest,
      actualDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date()),
      components: amounts.map((amountMinor, i) => ({
        amountMinor,
        accountId: accounts[i % 2]!,
        method: i % 2 ? 'instapay' : 'cash',
      })),
    };
  };
  const correct = async (round: Round, index = 0, beforeApply?: () => Promise<void>) => {
    const prior = round.outcomes[index]!,
      o = structuredClone(prior);
    o.outcomeId = randomUUID();
    o.revision++;
    o.time = f.time();
    o.outcome = 'refused';
    o.returnRequired = true;
    for (const l of o.lines) {
      l.heldReturnRequired = l.sourceQuantity;
      l.delivered = 0;
    }
    o.collection.goods.amountMinor = 0;
    o.collection.shipping.amountMinor = 0;
    o.collection.reported = { currency: 'EGP', exponent: 2, amountMinor: 0 };
    o.collection.unpaidShipping.amountMinor = prior.collection.shipping.amountMinor;
    o.collection.shippingStatus = 'explicitly-unpaid';
    const correction = {
      correctionId: randomUUID(),
      previousOutcomeId: prior.outcomeId,
      previousRevision: prior.revision,
      outcome: o,
      evidenceActionId: null,
      evidenceReceiptId: null,
    };
    const event = f.event(
      'outcome.corrected',
      { correction, previousOutcome: prior },
      o.taskId,
      o.revision + 1,
    );
    await beforeApply?.();
    await f.receive(event);
    await f.worker.runOne();
    round.outcomes[index] = o;
    return event;
  };
  return {
    ...f,
    reader,
    evidence,
    service,
    accounts,
    rounds,
    makeRound,
    prepare,
    input,
    correct,
    setMode: (v: string) => {
      mode = v;
      requests = 0;
      restarts = 0;
    },
    requestCount: () => requests,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
