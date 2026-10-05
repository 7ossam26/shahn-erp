import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transaction, sourceByCompany } from '@shahn/database';
import { returnFixture } from './fixtures.js';
import { postReturnTransition } from '../../../apps/api/src/modules/returns/receipt.service.js';
import { ProjectionWorker } from '../../../apps/api/src/modules/execution/projection-worker.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof returnFixture>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await returnFixture(db.pool);
});
afterAll(async () => {
  await db?.dispose();
});
it('accepted full history has no return offer; refused history keeps the entire dispatch in driver custody', async () => {
  const full = await f.setup({ outcome: 'full' }),
    refused = await f.setup({ outcome: 'refused' });
  expect(
    (
      await db.pool.query(`SELECT count(*)::int n FROM returns.item WHERE shipment_id=$1`, [
        full.s.shipmentId,
      ])
    ).rows[0].n,
  ).toBe(0);
  expect((await f.readRequest(refused.request.requestId)).items[0]).toMatchObject({
    requested: 3,
    received: 0,
    unresolved: 3,
  });
});
it('correction before receipt invalidates old outcome; correction after actual receipt cannot rewrite physical stock history', async () => {
  for (const receiptFirst of [false, true]) {
    const x = await f.setup();
    if (receiptFirst) await f.receipt(x.request);
    const revised = structuredClone(x.outcome);
    revised.outcomeId = randomUUID();
    revised.revision = 2;
    revised.outcome = 'full';
    revised.returnRequired = false;
    revised.lines[0]!.delivered = 3;
    revised.lines[0]!.heldReturnRequired = 0;
    revised.collection.goods.amountMinor = 30000;
    revised.collection.reported!.amountMinor = 30000 + revised.collection.shipping.amountMinor;
    revised.time = f.time();
    const correction = {
      correctionId: randomUUID(),
      previousOutcomeId: x.outcome.outcomeId,
      previousRevision: 1,
      outcome: revised,
      evidenceActionId: null,
      evidenceReceiptId: null,
    };
    const e = f.event(
      'outcome.corrected',
      { correction, previousOutcome: x.outcome },
      x.task.taskId,
      2,
    );
    await f.receive(e);
    await f.drain();
    if (receiptFirst) {
      expect(
        (
          await db.pool.query(`SELECT pending_reason FROM integration.inbox WHERE event_id=$1`, [
            e.eventId,
          ])
        ).rows[0].pending_reason,
      ).toBe('CORRECTION_AFTER_RETURN_REQUIRES_REVIEW');
      expect((await f.readRequest(x.request.requestId)).items[0]!.received).toBe(1);
    } else
      await expect(f.commands.execute(f.admin.token, f.receiveInput(x.request))).rejects.toThrow();
  }
});
it('out-of-order offer waits for outcome and never creates stock', async () => {
  const x = await f.setup({ early: true });
  expect(
    (
      await db.pool.query(`SELECT count(*)::int n FROM returns.item WHERE request_id=$1`, [
        x.request.requestId,
      ])
    ).rows[0].n,
  ).toBe(0);
  await f.receive(x.oe);
  await f.drain();
  expect((await f.readRequest(x.request.requestId)).items[0]!.unresolved).toBe(2);
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int n FROM returns.return_receipt_line WHERE shipment_id=$1`,
        [x.s.shipmentId],
      )
    ).rows[0].n,
  ).toBe(0);
});
it('subset receipt result/event/replay and concurrent same transition create one actual receipt; late offer cannot reset counters', async () => {
  const x = await f.setup(),
    input = f.receiveInput(x.request);
  await f.commands.execute(f.admin.token, input);
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int n FROM returns.return_receipt_line WHERE shipment_id=$1`,
        [x.s.shipmentId],
      )
    ).rows[0].n,
  ).toBe(0);
  const a = await f.accept(),
    t = a.body.transitions[0]!;
  await Promise.all(
    [0, 1].map(() =>
      transaction(db.pool, async (c) => {
        const s = (await sourceByCompany(c, f.company, true))!;
        await postReturnTransition(c, s, t);
      }),
    ),
  );
  const e = f.event(
    'return.subsetReceived',
    { transition: t },
    x.request.requestId,
    2,
    'return-request',
  );
  await f.receive(e);
  await f.drain();
  await f.receive(e);
  await f.drain();
  await f.merge(x.request);
  expect((await f.readRequest(x.request.requestId)).items[0]).toMatchObject({
    received: 1,
    unresolved: 1,
  });
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int n FROM returns.return_receipt_line WHERE shipment_id=$1`,
        [x.s.shipmentId],
      )
    ).rows[0].n,
  ).toBe(1);
  expect((await f.commands.execute(f.admin.token, input)).status).toBe(202);
});
it('rollback after transition/receipt posting leaves no stock, fact or applied marker; retry succeeds', async () => {
  const x = await f.setup();
  await f.commands.execute(f.admin.token, f.receiveInput(x.request));
  const lease = (await f.sourceWorker.claim())!,
    body = await f.resultFor(JSON.parse(lease.request_body)),
    t = body.transitions[0]!;
  await f.receive(
    f.event('return.subsetReceived', { transition: t }, x.request.requestId, 2, 'return-request'),
  );
  await expect(
    (async () => {
      const crashingWorker = new ProjectionWorker(db.pool, {
        failAfterPosting: () => {
          throw Error('P14_INJECTED_ROLLBACK');
        },
      });
      for (let n = 0; n < 20; n++) await crashingWorker.runOne();
    })(),
  ).rejects.toThrow('P14_INJECTED_ROLLBACK');
  expect((await f.readRequest(x.request.requestId)).items[0]!.received).toBe(0);
  await f.drain();
  expect((await f.readRequest(x.request.requestId)).items[0]!.received).toBe(1);
  // Finish this controlled lease to keep subsequent fixtures independent.
  const { acceptedResult } = await import('../p11/fixtures.js');
  const result = acceptedResult(JSON.parse(lease.request_body));
  result.response!.body = { ...body };
  await f.sourceWorker.complete(lease, { result, status: 200 });
});
it('wrong branch, excess, duplicate and stale input have no physical effect', async () => {
  const x = await f.setup(),
    input = f.receiveInput(x.request);
  for (const changed of [
    { branchId: f.b },
    { items: [{ ...(input.type === 'return.receive' ? input.items[0] : {}), quantity: 3 }] },
    { items: input.type === 'return.receive' ? [...input.items, ...input.items] : [] },
    { items: input.type === 'return.receive' ? [{ ...input.items[0], expectedRevision: 99 }] : [] },
  ]) {
    await expect(
      f.commands.execute(f.admin.token, {
        ...input,
        ...changed,
        commandId: randomUUID(),
      } as typeof input),
    ).rejects.toThrow();
  }
  expect((await f.readRequest(x.request.requestId)).items[0]!.received).toBe(0);
});
it('parcel brand handover consumes custody once, creates no SKU stock or money', async () => {
  const x = await f.setup(),
    a = await f.receipt(x.request),
    line = a.body.transitions[0]!.transitionId;
  const command = f.command({
    type: 'return.brandHandover',
    brandId: f.seed.brand,
    recipientName: 'ممثل البراند أحمد',
    actualAt: new Date().toISOString(),
    actualHandover: true,
    allocations: [{ receiptLineId: line, expectedVersion: 1, quantity: 1 }],
  });
  await f.commands.execute(f.admin.token, command);
  await f.commands.execute(f.admin.token, command);
  expect(
    (await db.pool.query(`SELECT consumed FROM returns.return_receipt_line WHERE id=$1`, [line]))
      .rows[0].consumed,
  ).toBe(1);
  await expect(
    f.commands.execute(f.admin.token, { ...command, commandId: randomUUID() }),
  ).rejects.toThrow();
  expect(
    (await db.pool.query(`SELECT count(*)::int n FROM inventory.stock_position`)).rows[0].n,
  ).toBe(0);
});
it('two receipt-funded redispatches race: one allocation, immutable old history and distinct fresh cycle', async () => {
  const x = await f.setup(),
    a = await f.receipt(x.request),
    line = a.body.transitions[0]!.transitionId;
  const old = (
    await db.pool.query(`SELECT id FROM dispatch.cycle WHERE shipment_id=$1`, [x.s.shipmentId])
  ).rows[0].id;
  const input = () =>
    f.command({
      type: 'return.redispatch',
      previousCycleId: old,
      driverId: f.driver,
      allocations: [{ receiptLineId: line, expectedVersion: 1, quantity: 1 }],
    });
  const results = await Promise.allSettled([
    f.commands.execute(f.admin.token, input()),
    f.commands.execute(f.admin.token, input()),
  ]);
  expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  const fresh = await f.redispatch();
  expect(fresh.task.dispatchCycleId).not.toBe(x.task.dispatchCycleId);
  expect(fresh.task.snapshot.lines[0]!.quantity).toBe(1);
  expect(fresh.task.snapshot.totalDue.amountMinor).toBe(15000);
  expect(
    (
      await db.pool.query(`SELECT count(*)::int n FROM dispatch.cycle WHERE shipment_id=$1`, [
        x.s.shipmentId,
      ])
    ).rows[0].n,
  ).toBe(2);
  await f.completeNext();
  const intent = (
      await db.pool.query(
        `SELECT current_intent_id FROM dispatch.cycle WHERE shipment_id=$1 AND latest`,
        [x.s.shipmentId],
      )
    ).rows[0].current_intent_id,
    d = await f.detail(intent);
  const { dispatchCommands } =
    await import('../../../apps/api/src/modules/dispatch/dispatch.service.js');
  await dispatchCommands(db.pool).execute(f.admin.token, {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'dispatch.receive',
    intentId: intent,
    expectedVersion: d.version,
    receiptAsserted: true,
  });
  await f.completeNext();
  expect((await f.detail(intent)).state).toBe('accepted');
});
it('stored stock: offer stays at zero, sound subset becomes available, damaged subset remains unavailable without compensation', async () => {
  const x = await f.setup({ stock: true });
  const position = async () =>
    (
      await db.pool.query(
        `SELECT sound_on_hand::text sound,unavailable_on_hand::text unavailable,(SELECT COALESCE(sum(quantity),0)::text FROM inventory.stock_reservation r WHERE r.variant_id=p.variant_id AND r.active) reserved FROM inventory.stock_position p WHERE variant_id=$1`,
        [x.variant],
      )
    ).rows[0];
  expect(await position()).toMatchObject({ sound: '0', unavailable: '0' });
  await f.commands.execute(f.admin.token, f.receiveInput(x.request, 1, 'sound', true));
  expect(await position()).toMatchObject({ sound: '0' });
  await f.accept();
  expect(await position()).toMatchObject({ sound: '1', unavailable: '0' });
  const current = await f.readRequest(x.request.requestId);
  await f.commands.execute(f.admin.token, f.receiveInput(current, 1, 'damaged', true));
  await f.accept();
  expect(await position()).toMatchObject({ sound: '1', unavailable: '1' });
  const lines = (
    await db.pool.query(
      `SELECT id,condition FROM returns.return_receipt_line WHERE shipment_id=$1`,
      [x.s.shipmentId],
    )
  ).rows;
  await expect(
    f.commands.execute(
      f.admin.token,
      f.command({
        type: 'return.brandHandover',
        brandId: f.seed.brand,
        recipientName: 'مستلم',
        actualAt: new Date().toISOString(),
        actualHandover: true,
        allocations: [
          {
            receiptLineId: lines.find((l) => l.condition === 'damaged').id,
            expectedVersion: 1,
            quantity: 1,
          },
        ],
      }),
    ),
  ).rejects.toThrow();
  const old = (
    await db.pool.query(`SELECT id FROM dispatch.cycle WHERE shipment_id=$1`, [x.s.shipmentId])
  ).rows[0].id;
  await f.commands.execute(
    f.admin.token,
    f.command({
      type: 'return.redispatch',
      previousCycleId: old,
      driverId: f.driver,
      allocations: [
        {
          receiptLineId: lines.find((l) => l.condition === 'sound').id,
          expectedVersion: 1,
          quantity: 1,
        },
      ],
    }),
  );
  expect(await position()).toMatchObject({ sound: '1', reserved: '1' });
  await f.redispatch();
  await f.completeNext();
  const intent = (
      await db.pool.query(
        `SELECT current_intent_id FROM dispatch.cycle WHERE shipment_id=$1 AND latest`,
        [x.s.shipmentId],
      )
    ).rows[0].current_intent_id,
    d = await f.detail(intent);
  const { dispatchCommands } =
    await import('../../../apps/api/src/modules/dispatch/dispatch.service.js');
  await dispatchCommands(db.pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'dispatch.receive',
    intentId: intent,
    expectedVersion: d.version,
    receiptAsserted: true,
  });
  await f.completeNext();
  expect(await position()).toMatchObject({ sound: '0', reserved: '0', unavailable: '1' });
});
it('legitimate disposition races receipt: one immutable pending subset; losing command cannot retry a changed payload', async () => {
  const x = await f.setup({ outcome: 'refused' }),
    decisionId = randomUUID();
  const { UnitOfWork } = await import('../../../apps/api/src/modules/kernel/unit-of-work.js');
  const { recordApprovedDisposition } =
    await import('../../../apps/api/src/modules/returns/disposition.service.js');
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'returns', (u) =>
    recordApprovedDisposition(u, {
      decisionId,
      incidentId: randomUUID(),
      requestId: x.request.requestId,
      branchId: f.a,
      disposition: 'lost',
      items: [{ itemId: x.request.items[0]!.itemId, expectedRevision: 0, quantity: 1 }],
    }),
  );
  const results = await Promise.allSettled([
    f.commands.execute(f.admin.token, f.receiveInput(x.request)),
    f.commands.execute(
      f.admin.token,
      f.command({ type: 'return.dispose', requestId: x.request.requestId, decisionId }),
    ),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  await f.accept();
  const c = (await f.readRequest(x.request.requestId)).items[0]!;
  expect(c.received + c.lost).toBe(1);
  expect(c.unresolved).toBe(2);
});
it('transfer reservation and actual brand handover compete with redispatch for one receipt quantity', async () => {
  const x = await f.setup(),
    receipt = await f.receipt(x.request),
    line = receipt.body.transitions[0]!.transitionId;
  const { UnitOfWork } = await import('../../../apps/api/src/modules/kernel/unit-of-work.js');
  const { lockReceiptAllocation, consumeReceiptAllocation } =
    await import('../../../apps/api/src/modules/returns/brand-handover.service.js');
  const selections = [{ receiptLineId: line, expectedVersion: 1, quantity: 1 }];
  const transfer = () =>
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'returns', async (u) => {
      const rows = await lockReceiptAllocation(u, f.a, selections);
      await consumeReceiptAllocation(u, rows, selections, 'transfer', randomUUID());
    });
  const handover = () =>
    f.commands.execute(
      f.admin.token,
      f.command({
        type: 'return.brandHandover',
        brandId: f.seed.brand,
        recipientName: 'ممثل البراند',
        actualAt: new Date().toISOString(),
        actualHandover: true,
        allocations: selections,
      }),
    );
  expect(
    (await Promise.allSettled([transfer(), handover()])).filter((r) => r.status === 'fulfilled'),
  ).toHaveLength(1);
  expect(
    (
      await db.pool.query(
        `SELECT sum(quantity)::int n FROM returns.receipt_allocation WHERE receipt_line_id=$1`,
        [line],
      )
    ).rows[0].n,
  ).toBe(1);
});
