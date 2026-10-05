import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, employeeClock } from '@shahn/database';
import { employeeCommands } from '../../../apps/api/src/modules/employees/service.js';
import type { EmployeeResult } from '@shahn/contracts';
import { executionFixture } from './fixtures.js';
import { ProjectionWorker } from '../../../apps/api/src/modules/execution/projection-worker.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { signatureFor } from '../../../apps/api/src/modules/integration/signature-verifier.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { protectVisitBasis } from '../../../apps/api/src/modules/execution/settlement-review.service.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof executionFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 16));
  f = await executionFixture(db.pool);
  await migrate(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await db?.dispose();
});
const drain = async () => {
  for (let n = 0; n < 12; n++) if (!(await f.worker.runOne())) break;
};
const facts = async (task: string) =>
  (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM execution.visit_fact WHERE task_id=$1) visits,(SELECT count(*)::int FROM execution.outcome_fact WHERE task_id=$1) outcomes,(SELECT sum(e.amount_minor)::text FROM kernel.journal_effect e JOIN execution.visit_fact v ON(v.company_id,v.source_record_id)=(e.company_id,e.source_id) WHERE v.task_id=$1 AND e.family='operating') revenue,(SELECT sum(e.amount_minor)::text FROM execution.earning_basis e JOIN execution.visit_fact v ON(v.company_id,v.id)=(e.company_id,e.visit_id) WHERE v.task_id=$1) commission,(SELECT count(*)::int FROM kernel.journal_effect WHERE family='money') cash`,
      [task],
    )
  ).rows[0];
it('arrival earns once, keeps payer pending, and no-answer allocates brand fee while canonical report stays null', async () => {
  const x = await f.received(),
    a = x.arrival();
  await f.receive(a);
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({
    visits: 1,
    revenue: '5000',
    commission: '500',
    outcomes: 0,
    cash: 0,
  });
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int n FROM execution.allocation a JOIN execution.visit_fact v ON(v.company_id,v.id)=(a.company_id,a.visit_id) WHERE v.task_id=$1`,
        [x.task.taskId],
      )
    ).rows[0].n,
  ).toBe(0);
  const o = await x.outcome('no-answer');
  const e = f.event('outcome.recorded', { outcome: o }, x.task.taskId, 2);
  await f.receive(e);
  await drain();
  await f.receive(e);
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({
    visits: 1,
    outcomes: 1,
    revenue: '5000',
    cash: 0,
  });
  const r = (
    await db.pool.query(
      `SELECT reported_minor,canonical_collection FROM execution.reported_money_fact WHERE outcome_id=$1`,
      [o.outcomeId],
    )
  ).rows[0];
  expect(r.reported_minor).toBeNull();
  expect(r.canonical_collection).toEqual(o.collection);
  expect((await f.wallet()).debits).toBe('5000');
});
it('buffers sequence 3 before 1/2 and commits one visit with two workers and independent transactions', async () => {
  const x = await f.received(),
    o = await x.outcome('full');
  await f.receive(f.event('outcome.recorded', { outcome: o }, x.task.taskId, 3));
  await drain();
  expect((await facts(x.task.taskId)).visits).toBe(0);
  const a = x.arrival();
  await f.receive({
    ...a,
    eventType: 'current.headingSelected',
    payload: { ...a.payload, stage: 'heading' },
    aggregate: { ...a.aggregate, recipientSequence: 1 },
  });
  await f.receive({
    ...a,
    eventId: randomUUID(),
    aggregate: { ...a.aggregate, recipientSequence: 2 },
  });
  await Promise.all([
    new ProjectionWorker(db.pool).runOne(),
    new ProjectionWorker(db.pool).runOne(),
  ]);
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({
    visits: 1,
    outcomes: 1,
    revenue: '5000',
    cash: 0,
  });
  expect(
    (
      await db.pool.query(
        `SELECT applied_through::text,received_high::text FROM integration.checkpoint WHERE aggregate_id=$1`,
        [x.task.taskId],
      )
    ).rows[0],
  ).toEqual({ applied_through: '3', received_high: '3' });
});
it('failure after journal posting rolls back facts, sources and applied marker; retry succeeds', async () => {
  const x = await f.received();
  await f.receive(x.arrival());
  const failing = new ProjectionWorker(db.pool, {
    failAfterPosting: () => {
      throw Error('INJECTED_AFTER_POST');
    },
  });
  await expect(failing.runOne()).rejects.toThrow('INJECTED_AFTER_POST');
  expect((await facts(x.task.taskId)).visits).toBe(0);
  await drain();
  expect((await facts(x.task.taskId)).visits).toBe(1);
});
it('an outcome without arrival waits for visit evidence and later arrival completes exactly one allocation', async () => {
  const x = await f.received(),
    o = await x.outcome('full');
  await f.receive(f.event('outcome.recorded', { outcome: o }, x.task.taskId, 1));
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({ visits: 0, outcomes: 1, revenue: null });
  const a = x.arrival();
  await f.receive({ ...a, aggregate: { ...a.aggregate, recipientSequence: 2 } });
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({ visits: 1, outcomes: 1, revenue: '5000' });
});
it('a real signed receiver request establishes a packed 55 visit and 5 commission, while phone defer earns nothing', async () => {
  const x = await f.received({ service: 'company_packed' }),
    a = x.arrival(),
    raw = Buffer.from(JSON.stringify(a)),
    timestamp = String(Date.now());
  const r = await fetch(origin + '/api/v1/consumer/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tawsel-Tenant-Id': f.connection.tenantId,
      'X-Tawsel-Integration-Id': f.connection.integrationId,
      'X-Tawsel-Key-Id': 'trial',
      'X-Tawsel-Delivery-Timestamp': timestamp,
      'X-Tawsel-Signature': signatureFor(
        raw,
        { tenantId: f.connection.tenantId, integrationId: f.connection.integrationId },
        'trial',
        timestamp,
        f.secret,
      ),
    },
    body: new Uint8Array(raw),
  });
  expect(r.status).toBe(200);
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({
    visits: 1,
    revenue: '5500',
    commission: '500',
    cash: 0,
  });
  const y = await f.received();
  await f.receive(
    f.event(
      'task.deferred',
      {
        change: {
          operationId: 'task.deferWhole',
          roundId: y.roundId,
          driverId: f.driverResource,
          taskId: y.task.taskId,
          previousAttemptId: y.attemptId,
          attemptId: y.attemptId,
          revision: 1,
          earliestAt: null,
          urgency: 'ordinary',
          deferred: true,
          time: f.time(),
          sourceReference: {
            tenantId: f.connection.tenantId,
            integrationId: f.connection.integrationId,
            externalId: y.task.externalId,
          },
          sourceDispatchCycleId: y.task.sourceDispatchCycleId,
          sourceRevision: 1,
          assignmentRevision: y.task.assignmentRevision,
          dispatchCycleId: y.task.dispatchCycleId,
        },
      },
      y.task.taskId,
      1,
    ),
  );
  await drain();
  expect(await facts(y.task.taskId)).toMatchObject({ visits: 0, revenue: null, commission: null });
});
it('a permitted partial correction reverses only unremitted basis and retains one earning and original outcome', async () => {
  const x = await f.received({
      lines: [
        {
          id: randomUUID(),
          description: 'قطعتان',
          quantity: 2,
          unitDue: { currency: 'EGP', amountMinor: '12500' },
        },
      ],
    }),
    a = x.arrival();
  await f.receive(a);
  await drain();
  const o = await x.outcome('full');
  await f.receive(f.event('outcome.recorded', { outcome: o }, x.task.taskId, 2));
  await drain();
  const revised = structuredClone(o);
  revised.outcome = 'partial';
  revised.outcomeId = randomUUID();
  revised.revision = 2;
  revised.returnRequired = true;
  revised.lines[0]!.delivered = 1;
  revised.lines[0]!.heldReturnRequired = 1;
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
    f.event('outcome.corrected', { correction, previousOutcome: o }, x.task.taskId, 3),
  );
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({
    visits: 1,
    outcomes: 2,
    commission: '500',
    cash: 0,
  });
  const allocation = (
    await db.pool.query(
      `SELECT goods_minor::text FROM execution.allocation a JOIN execution.visit_fact v ON(v.company_id,v.id)=(a.company_id,a.visit_id) WHERE v.task_id=$1 ORDER BY outcome_revision DESC LIMIT 1`,
      [x.task.taskId],
    )
  ).rows[0];
  expect(allocation.goods_minor).toBe('12500');
  const cancelled = (
    await db.pool.query(
      `SELECT sum(la.amount_minor)::text total FROM kernel.lot_allocation la JOIN kernel.journal_effect e ON(e.company_id,e.id)=(la.company_id,la.effect_id) WHERE e.reason='Accepted Tawsel outcome correction'`,
    )
  ).rows[0];
  expect(cancelled.total).toBe('25000');
});
it('tracking permits another assigned branch but never returns wallet/HR data or expands native shipment mutation scope', async () => {
  const x = await f.received({ recipientName: 'اسم طويل جداً '.repeat(10) });
  const headers = { Cookie: 'erp_session=' + f.staffB.token };
  const r = await fetch(
    origin + '/api/v1/tracking?companyId=' + f.company + '&query=' + x.s.reference,
    { headers },
  );
  expect(r.status).toBe(200);
  const b = await r.json();
  expect(b.items[0].reference).toBe(x.s.reference);
  expect(b.items[0]).not.toHaveProperty('price');
  const d = await fetch(origin + '/api/v1/tracking/' + x.s.shipmentId + '?companyId=' + f.company, {
    headers,
  });
  expect(d.status).toBe(200);
  expect((await d.json()).detailPath).toBeNull();
  const native = await fetch(
    origin + '/api/v1/shipments/' + x.s.reference + '?companyId=' + f.company,
    { headers },
  );
  expect([403, 404]).toContain(native.status);
  await db.pool.query(`INSERT INTO access.user_exception VALUES($1,$2,'tracking','deny')`, [
    f.company,
    f.staffB.id,
  ]);
  expect(
    (await fetch(origin + '/api/v1/tracking?companyId=' + f.company, { headers })).status,
  ).toBe(403);
});
it('company-funded replacement preserves goods 250, tariff 50, waiver 50 and normal commission without cash', async () => {
  const x = await f.received({}, true),
    a = x.arrival();
  await f.receive(a);
  await drain();
  const o = await x.outcome('full');
  expect(o.collection.goods.amountMinor).toBe(25000);
  expect(o.collection.shipping.amountMinor).toBe(0);
  await f.receive(f.event('outcome.recorded', { outcome: o }, x.task.taskId, 2));
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({
    visits: 1,
    revenue: '0',
    commission: '500',
    cash: 0,
  });
  expect(
    (
      await db.pool.query(
        `SELECT a.goods_minor::text,a.brand_fee_minor::text FROM execution.allocation a JOIN execution.visit_fact v ON(v.company_id,v.id)=(a.company_id,a.visit_id) WHERE v.task_id=$1`,
        [x.task.taskId],
      )
    ).rows[0],
  ).toEqual({ goods_minor: '25000', brand_fee_minor: '0' });
});
it('committed visit survives database restart and lost worker acknowledgement without another earning', async () => {
  const x = await f.received(),
    a = x.arrival();
  await f.receive(a);
  await drain();
  const before = await facts(x.task.taskId);
  await db.stop();
  await db.start();
  await f.receive(a);
  await drain();
  expect(await facts(x.task.taskId)).toEqual(before);
});
it('another driver on a distinct retry earns only after their own arrival; an absent employee link stays unresolved', async () => {
  const x = await f.received({ service: 'company_packed' });
  await f.receive(x.arrival());
  await drain();
  const native = randomUUID(),
    remote = randomUUID(),
    roundId = randomUUID(),
    workdayId = randomUUID(),
    attemptId = randomUUID();
  await db.pool.query(
    `INSERT INTO employees.operational_driver(company_id,id,name,branch_id) VALUES($1,$2,'مندوب ثانٍ',$3)`,
    [f.company, native, f.a],
  );
  await db.pool.query(
    `INSERT INTO integration.binding(company_id,source_id,id,entity,native_id,external_id,resource_id,submitted_revision,accepted_revision) SELECT company_id,source_id,$2,'driver',$3,$4,$5,1,1 FROM integration.binding WHERE company_id=$1 AND entity='driver' LIMIT 1`,
    [f.company, randomUUID(), native, 'driver:' + native, remote],
  );
  const secondStart = { ...x.start.payload, roundId, workdayId, driverId: remote };
  await db.pool.query(
    `UPDATE employees.operational_driver SET external_mapping='mapped',tawsel_driver_id=$3 WHERE company_id=$1 AND id=$2`,
    [f.company, native, remote],
  );
  await f.receive(f.event('round.started', secondStart, roundId, 1, 'trip'));
  await drain();
  expect((await facts(x.task.taskId)).visits).toBe(1);
  const today = (await employeeClock(db.pool)).today,
    ec = employeeCommands(db.pool);
  const employee = (
    await ec.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'employee.create',
      fields: {
        name: 'موظف ثانٍ',
        contact: '',
        active: true,
        employmentStart: today,
        employmentEnd: null,
        branchId: f.a,
        workDays: [0, 1, 2, 3, 4],
        hoursPerDay: 8,
        weeklyDayOff: 5,
      },
      terms: {
        salary: { enabled: false, monthly: null },
        commission: { enabled: true, formula: 'percentage', basisPoints: 1000, perVisit: null },
      },
    })
  ).body as EmployeeResult;
  await ec.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'employee.link',
    employeeId: employee.employeeId,
    expectedVersion: employee.version,
    effectiveDate: today,
    endDate: null,
    driverId: native,
    localDriver: null,
    reason: 'Explicit second-driver test mapping',
  });
  const a = x.arrival();
  await f.receive(
    f.event(
      'current.arrivalRecorded',
      { ...a.payload, roundId, driverId: remote, attemptId, time: f.time() },
      x.task.taskId,
      2,
    ),
  );
  await drain();
  expect(await facts(x.task.taskId)).toMatchObject({
    visits: 2,
    revenue: '11000',
    commission: '1000',
    cash: 0,
  });
  expect(
    (
      await db.pool.query(
        `SELECT count(DISTINCT driver_id)::int n FROM execution.visit_fact WHERE task_id=$1`,
        [x.task.taskId],
      )
    ).rows[0].n,
  ).toBe(2);
  const y = await f.received(),
    unlinked = randomUUID(),
    unlinkedRemote = randomUUID(),
    unlinkedRound = randomUUID();
  await db.pool.query(
    `INSERT INTO employees.operational_driver(company_id,id,name,branch_id) VALUES($1,$2,'بدون ارتباط',$3)`,
    [f.company, unlinked, f.a],
  );
  await db.pool.query(
    `INSERT INTO integration.binding(company_id,source_id,id,entity,native_id,external_id,resource_id,submitted_revision,accepted_revision) SELECT company_id,source_id,$2,'driver',$3,$4,$5,1,1 FROM integration.binding WHERE company_id=$1 AND entity='driver' LIMIT 1`,
    [f.company, randomUUID(), unlinked, 'driver:' + unlinked, unlinkedRemote],
  );
  await f.receive(
    f.event(
      'round.started',
      { ...y.start.payload, roundId: unlinkedRound, driverId: unlinkedRemote },
      unlinkedRound,
      1,
      'trip',
    ),
  );
  await drain();
  await f.receive(
    f.event(
      'current.arrivalRecorded',
      { ...y.arrival().payload, roundId: unlinkedRound, driverId: unlinkedRemote },
      y.task.taskId,
      1,
    ),
  );
  await drain();
  expect(
    (
      await db.pool.query(
        `SELECT e.amount_minor,e.journal_effect_id,e.resolution FROM execution.earning_basis e JOIN execution.visit_fact v ON(v.company_id,v.id)=(e.company_id,e.visit_id) WHERE v.task_id=$1`,
        [y.task.taskId],
      )
    ).rows[0],
  ).toMatchObject({
    amount_minor: null,
    journal_effect_id: null,
    resolution: { status: 'unresolved' },
  });
});
it('a protected correction retains prior postings, creates one review and never moves company cash', async () => {
  const x = await f.received(),
    a = x.arrival();
  await f.receive(a);
  await drain();
  const o = await x.outcome('full');
  await f.receive(f.event('outcome.recorded', { outcome: o }, x.task.taskId, 2));
  await drain();
  const visit = (
    await db.pool.query(`SELECT id FROM execution.visit_fact WHERE task_id=$1`, [x.task.taskId])
  ).rows[0].id;
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'integration', (u) =>
    protectVisitBasis(u, visit, 'payroll', randomUUID()),
  );
  const revised = await x.outcome('refused');
  revised.revision = 2;
  const correction = {
      correctionId: randomUUID(),
      previousOutcomeId: o.outcomeId,
      previousRevision: 1,
      outcome: revised,
      evidenceActionId: null,
      evidenceReceiptId: null,
    },
    e = f.event('outcome.corrected', { correction, previousOutcome: o }, x.task.taskId, 3);
  await f.receive(e);
  await drain();
  await f.receive(e);
  await drain();
  expect(
    (
      await db.pool.query(
        `SELECT (SELECT count(*)::int FROM execution.allocation WHERE visit_id=$1) allocations,(SELECT count(*)::int FROM execution.settlement_review WHERE visit_id=$1 AND state='open') reviews`,
        [visit],
      )
    ).rows[0],
  ).toEqual({ allocations: 1, reviews: 1 });
  expect(await facts(x.task.taskId)).toMatchObject({
    visits: 1,
    outcomes: 2,
    commission: '500',
    cash: 0,
  });
});
it('rejects an arrival attached to a different known round without posting or advancing', async () => {
  const x = await f.received(),
    y = await f.received();
  await drain();
  const a = x.arrival(),
    e = f.event('current.arrivalRecorded', { ...a.payload, roundId: y.roundId }, x.task.taskId, 1);
  await f.receive(e);
  await drain();
  expect((await facts(x.task.taskId)).visits).toBe(0);
  expect(
    (
      await db.pool.query(
        `SELECT application_state,pending_reason FROM integration.inbox WHERE event_id=$1`,
        [e.eventId],
      )
    ).rows[0],
  ).toMatchObject({ application_state: 'pending', pending_reason: 'ROUND_TASK_CONFLICT' });
  expect(
    (
      await db.pool.query(
        `SELECT applied_through::text FROM integration.checkpoint WHERE aggregate_id=$1`,
        [x.task.taskId],
      )
    ).rows[0].applied_through,
  ).toBe('0');
});
it('keeps P14 events pending and never advances an applied checkpoint', async () => {
  const { mappedEvents } = await import('../p11/mapped-events.js');
  const e = mappedEvents().find((e) => e.eventType === 'return.requested')!;
  const replace = (v: unknown): void => {
    if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) {
        if (k === 'tenantId') (v as Record<string, unknown>)[k] = f.connection.tenantId;
        else if (k === 'integrationId' || k === 'recipientIntegrationId')
          (v as Record<string, unknown>)[k] = f.connection.integrationId;
        else replace(x);
      }
  };
  replace(e);
  await f.receive(e);
  await drain();
  expect(
    (
      await db.pool.query(
        'SELECT application_state,pending_reason FROM integration.inbox WHERE event_id=$1',
        [e.eventId],
      )
    ).rows[0],
  ).toMatchObject({ application_state: 'pending', pending_reason: 'P14_PENDING_DOMAIN_HANDLER' });
});
