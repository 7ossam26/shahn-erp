import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { validateSenderEvent, type SenderEvent } from '@shahn/contracts/tawsel';
import type { OutcomeRecord } from '@shahn/contracts/execution';
import { executionFixture } from '../p13/fixtures.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { signatureFor } from '../../../apps/api/src/modules/integration/signature-verifier.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { protectVisitBasis } from '../../../apps/api/src/modules/execution/settlement-review.service.js';
import { trackingDetail } from '../../../apps/api/src/modules/tracking/tracking.service.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof executionFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await executionFixture(db.pool);
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
async function drain() {
  for (let n = 0; n < 20; n++) if (!(await f.worker.runOne())) break;
}
async function signed(e: SenderEvent, body = Buffer.from(JSON.stringify(e))) {
  const ts = String(Date.now());
  return fetch(origin + '/api/v1/consumer/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tawsel-tenant-id': f.connection.tenantId,
      'x-tawsel-integration-id': f.connection.integrationId,
      'x-tawsel-key-id': 'trial',
      'x-tawsel-delivery-timestamp': ts,
      'x-tawsel-signature': signatureFor(
        body,
        { tenantId: f.connection.tenantId, integrationId: f.connection.integrationId },
        'trial',
        ts,
        f.secret,
      ),
    },
    body,
  });
}
function legacy(o: OutcomeRecord) {
  const x = structuredClone(o);
  delete x.rejection;
  delete x.recordVersion;
  return x;
}
function recorded(o: OutcomeRecord, sequence: number) {
  const e = f.event('outcome.recorded', { outcome: legacy(o) }, o.taskId, sequence);
  e.payloadVersion = '2.0.0';
  e.payload = { outcome: o };
  expect(validateSenderEvent(e)).toBe(true);
  return e;
}
async function money() {
  return {
    journals: (
      await db.pool.query('SELECT row_to_json(x) v FROM kernel.journal_effect x ORDER BY id')
    ).rows,
    wallet: await f.wallet(),
    earnings: (
      await db.pool.query(
        'SELECT row_to_json(x) v FROM execution.earning_basis x ORDER BY visit_id',
      )
    ).rows,
    cash: (
      await db.pool.query("SELECT count(*)::int n FROM kernel.journal_effect WHERE family='money'")
    ).rows[0],
  };
}
it('signed v2 driver Other reaches authorized history through a gap; reason correction preserves protected money and original raw bytes', async () => {
  const x = await f.received(),
    arrival = x.arrival(),
    o = await x.outcome('refused');
  o.arrival = (arrival.payload as { time: OutcomeRecord['arrival'] }).time;
  o.recordVersion = '2.0.0';
  o.rejection = { catalogVersion: '1.0.0', code: 'other', detail: 'المقاس غير مناسب' };
  const e = recorded(o, 2),
    raw = Buffer.from(JSON.stringify(e, null, 2) + '\r\n');
  expect((await signed(e, raw)).status).toBe(200);
  await drain();
  expect(
    (
      await db.pool.query('SELECT application_state FROM integration.inbox WHERE event_id=$1', [
        e.eventId,
      ])
    ).rows[0].application_state,
  ).toBe('pending');
  expect((await signed(arrival)).status).toBe(200);
  await drain();
  const visit = (
    await db.pool.query('SELECT id FROM execution.visit_fact WHERE task_id=$1', [o.taskId])
  ).rows[0].id;
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'integration', (u) =>
    protectVisitBasis(u, visit, 'payroll', randomUUID()),
  );
  const before = await money();
  const revised = {
    ...structuredClone(o),
    outcomeId: randomUUID(),
    revision: 2,
    time: f.time(),
    rejection: { catalogVersion: '1.0.0' as const, code: 'changed-mind' },
  };
  const correction = {
    correctionId: randomUUID(),
    previousOutcomeId: o.outcomeId,
    previousRevision: 1,
    outcome: revised,
    evidenceActionId: null,
    evidenceReceiptId: null,
  };
  const corrected = f.event(
    'outcome.corrected',
    { correction: { ...correction, outcome: legacy(revised) }, previousOutcome: legacy(o) },
    o.taskId,
    3,
  );
  corrected.payloadVersion = '2.0.0';
  corrected.payload = { correction, previousOutcome: o };
  expect(validateSenderEvent(corrected)).toBe(true);
  expect((await signed(corrected)).status).toBe(200);
  await drain();
  expect((await signed(corrected)).status).toBe(200);
  await drain();
  expect(await money()).toEqual(before);
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM execution.settlement_review WHERE visit_id=$1',
        [visit],
      )
    ).rows[0].n,
  ).toBe(0);
  const allocations = (
    await db.pool.query(
      'SELECT goods_effect_id,fee_effect_id FROM execution.allocation WHERE visit_id=$1 ORDER BY outcome_revision',
      [visit],
    )
  ).rows;
  expect(allocations).toHaveLength(2);
  expect(allocations[1]).toEqual(allocations[0]);
  expect(
    (await db.pool.query('SELECT raw_body FROM integration.inbox WHERE event_id=$1', [e.eventId]))
      .rows[0].raw_body,
  ).toEqual(raw);
  const view = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'tracking', (u) =>
    trackingDetail(u, x.s.shipmentId),
  );
  expect(view.attempts[0]).toMatchObject({ reasonState: 'known', reasonDetail: null });
  expect(view.attempts[0]!.history).toHaveLength(2);
  expect(view.attempts[0]!.history[0]).toMatchObject({
    reasonDetail: 'المقاس غير مناسب',
    correctionId: null,
  });
  // Tracking is a company-wide operational grant. Native financial/detail links
  // retain their separate branch authority; this read contains no editable reason.
  const operational = await UnitOfWork.run(db.pool, f.staffB.token, f.company, 'tracking', (u) =>
    trackingDetail(u, x.s.shipmentId),
  );
  expect(operational.detailPath).toBeNull();
});
it('unsupported new signed event and missing Other detail are rejected without durable application', async () => {
  const x = await f.received(),
    o = await x.outcome('refused');
  o.recordVersion = '2.0.0';
  o.rejection = { catalogVersion: '1.0.0', code: 'other', detail: 'سبب' };
  const e = recorded(o, 2),
    unsupported = { ...e, payloadVersion: '3.0.0' } as unknown as SenderEvent;
  expect((await signed(unsupported)).status).toBe(422);
  delete o.rejection.detail;
  e.eventId = randomUUID();
  expect((await signed(e)).status).toBe(422);
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM integration.inbox WHERE event_id=ANY($1::uuid[])',
        [[unsupported.eventId, e.eventId]],
      )
    ).rows[0].n,
  ).toBe(0);
});
it('real signed application displays a v2 partial driver reason, retained legacy refusal and no-answer with authoritative arrival as distinct states', async () => {
  for (const kind of ['partial', 'refused', 'no-answer'] as const) {
    const x = await f.received(),
      arrival = x.arrival(),
      o = await x.outcome(kind);
    o.arrival = (arrival.payload as { time: OutcomeRecord['arrival'] }).time;
    if (kind === 'partial') {
      const rejected = o.lines.at(-1)!;
      rejected.delivered = 0;
      rejected.heldReturnRequired = rejected.sourceQuantity;
      o.collection.goods.amountMinor -= rejected.sourceQuantity * rejected.unitDue.amountMinor;
      o.collection.reported!.amountMinor =
        o.collection.goods.amountMinor + o.collection.shipping.amountMinor;
      o.recordVersion = '2.0.0';
      o.rejection = { catalogVersion: '1.0.0', code: 'missing-pieces' };
    }
    const event =
      kind === 'partial'
        ? recorded(o, 2)
        : f.event('outcome.recorded', { outcome: legacy(o) }, o.taskId, 2);
    expect(validateSenderEvent(event)).toBe(true);
    expect((await signed(arrival)).status).toBe(200);
    expect((await signed(event)).status).toBe(200);
    await drain();
    const view = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'tracking', (u) =>
      trackingDetail(u, x.s.shipmentId),
    );
    expect(view.attempts[0]).toMatchObject({
      outcome: kind,
      visitKnown: true,
      reasonState: kind === 'partial' ? 'known' : kind === 'refused' ? 'legacy' : 'not-applicable',
    });
    if (kind === 'partial') expect(view.attempts[0]!.reason).toBe('قطع ناقصة');
    expect(
      (
        await db.pool.query('SELECT application_state FROM integration.inbox WHERE event_id=$1', [
          event.eventId,
        ])
      ).rows[0].application_state,
    ).toBe('applied');
  }
});
