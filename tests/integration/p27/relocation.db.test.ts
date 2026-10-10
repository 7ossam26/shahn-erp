import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transferView } from '@shahn/database';
import type {
  GoodsTransferCommand,
  GoodsTransferResult,
  DispatchResult,
  DispatchCommand,
  ReturnResult,
  ShipmentResult,
} from '@shahn/contracts';
import type { SourceEnvelope, IntakeTask } from '@shahn/contracts/tawsel';
import { returnFixture } from '../p14/fixtures.js';
import { goodsTransferCommands } from '../../../apps/api/src/modules/goods-transfers/transfer.service.js';
import { dispatchCommands } from '../../../apps/api/src/modules/dispatch/dispatch.service.js';
import { SourceFailure } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { acceptedResult } from '../p11/fixtures.js';
import { dispatchDetail } from '../../../apps/api/src/modules/dispatch/dispatch-query.service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof returnFixture>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await returnFixture(db.pool);
  await db.pool.query(
    `UPDATE integration.source SET configuration=configuration||'{"interopVersion":"2.0.0","supportedVersions":["1.0.0","2.0.0"]}'::jsonb WHERE company_id=$1`,
    [f.company],
  );
});
afterAll(async () => {
  await db?.dispose();
});
const dc = () => dispatchCommands(db.pool);
const command = (v: object) =>
  ({
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    branchId: f.a,
    ...v,
  }) as GoodsTransferCommand;
async function transfer(shipment: string) {
  const send = goodsTransferCommands(db.pool, 'send'),
    receive = goodsTransferCommands(db.pool, 'receive');
  const input = command({
    type: 'goods.create',
    destinationBranchId: f.b,
    driverId: f.driver,
    plannedAt: new Date().toISOString(),
    lines: [
      { kind: 'parcel', shipmentId: shipment, expectedVersion: (await f.read(shipment))!.version },
    ],
  });
  const made = (await send.execute(f.admin.token, input)).body as GoodsTransferResult;
  const handed = (
    await send.execute(
      f.admin.token,
      command({
        type: 'goods.handover',
        manifestId: made.manifestId,
        expectedVersion: made.version,
        actualAt: new Date().toISOString(),
      }),
    )
  ).body as GoodsTransferResult;
  const line = (await transferView(db.pool, f.company, made.manifestId))!.lines[0]!;
  await receive.execute(
    f.staffB.token,
    command({
      type: 'goods.receive',
      branchId: f.b,
      manifestId: made.manifestId,
      expectedVersion: handed.version,
      actualAt: new Date().toISOString(),
      lines: [
        {
          lineId: line.id,
          sound: 1,
          damaged: 0,
          uncertain: 0,
          inspection: 'parcel-exterior',
          suspectedInternalIssue: false,
        },
      ],
    }),
  );
  return made.manifestId;
}
async function prepareB(s: ShipmentResult) {
  const input = f.prepareInput([
    { ...s, version: (await f.read(s.shipmentId))!.version },
  ]) as Extract<DispatchCommand, { type: 'dispatch.prepare' }>;
  return (await dc().execute(f.admin.token, { ...input, branchId: f.b })).body as DispatchResult;
}
async function acceptNewCycle() {
  const lease = (await f.sourceWorker.claim())!,
    e = JSON.parse(lease.request_body) as SourceEnvelope,
    snapshot = e.payload.snapshot as IntakeTask['snapshot'],
    old = f.tasks.get(snapshot.externalId)!;
  const task: IntakeTask = {
    ...old,
    dispatchCycleId: randomUUID(),
    sourceDispatchCycleId: snapshot.sourceDispatchCycleId,
    sourceRevision: snapshot.sourceRevision,
    snapshot,
    previousDispatchCycleId: old.dispatchCycleId,
    latest: true,
    state: 'unassigned',
    assignmentRevision: 0,
    driverId: null,
    driverExternalId: null,
    receivedAt: null,
    planningEligible: false,
    planningStatus: 'not-requested',
  };
  f.tasks.set(task.externalId, task);
  const result = acceptedResult(e);
  await f.sourceWorker.complete(lease, { result, status: 200, tasks: [task] });
  return { lease, e, task, result };
}
it('pending/lost withdrawal keeps the physical fence; accepted original result permits actual A→B relocation with stable shipment/price and isolated cycle scope', async () => {
  const s = await f.create(),
    d = await f.prepared([s]);
  const old = (
    await db.pool.query('SELECT * FROM dispatch.cycle WHERE shipment_id=$1', [s.shipmentId])
  ).rows[0];
  await dc().execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'dispatch.withdraw',
    intentId: d.id,
    expectedVersion: d.version,
    actualAtBranch: true,
  });
  await expect(transfer(s.shipmentId)).rejects.toMatchObject({ code: 'PARCEL_ALREADY_CLAIMED' });
  const lease = (await f.sourceWorker.claim())!,
    e = JSON.parse(lease.request_body) as SourceEnvelope;
  await f.sourceWorker.complete(lease, {
    failure: new SourceFailure('unknown', 'REMOTE_RESULT_UNKNOWN'),
  });
  await expect(transfer(s.shipmentId)).rejects.toMatchObject({ code: 'PARCEL_ALREADY_CLAIMED' });
  const withdrawn = {
    ...f.tasks.get(old.external_id)!,
    state: 'withdrawn' as const,
    assignmentRevision: Number(e.payload.assignmentRevision),
    driverId: null,
    driverExternalId: null,
  };
  f.tasks.set(old.external_id, withdrawn);
  // A late authoritative result uses the original retained request and action.
  expect(
    await f.sourceWorker.complete(lease, {
      result: acceptedResult(e),
      status: 200,
      tasks: [withdrawn],
    }),
  ).toBe(false);
  await db.pool.query('UPDATE work_item SET available_at=clock_timestamp() WHERE id=$1', [
    lease.id,
  ]);
  const recovery = (await f.sourceWorker.claim())!;
  expect(recovery.action_id).toBe(lease.action_id);
  expect(recovery.request_body).toBe(lease.request_body);
  await f.sourceWorker.complete(recovery, {
    result: acceptedResult(e),
    status: 200,
    tasks: [withdrawn],
  });
  const moved = await transfer(s.shipmentId),
    b = await prepareB(s),
    accepted = await acceptNewCycle();
  expect(accepted.e).toMatchObject({
    payloadVersion: '2.0.0',
    operationId: 'dispatch.relocateBeforeDeparture',
    payload: {
      externalId: 'shipment:' + s.shipmentId,
      previousDispatchCycleId: old.remote_cycle_id,
      transfer: { transferId: moved, receivedAtDestination: true },
    },
  });
  expect(accepted.task.taskId).toBe(old.task_id);
  expect(accepted.task.sourceRevision).toBe(Number(old.accepted_revision) + 1);
  await f.completeNext();
  await expect(
    UnitOfWork.run(db.pool, f.staffA.token, f.company, 'dispatch', (u) =>
      dispatchDetail(u, b.intentId),
    ),
  ).rejects.toBeDefined();
  const current = (
    await db.pool.query('SELECT * FROM dispatch.cycle WHERE shipment_id=$1 AND latest', [
      s.shipmentId,
    ])
  ).rows[0];
  expect(current.branch_id).toBe(f.b);
  expect(current.previous_cycle_id).toBe(old.id);
  const prices = (
    await db.pool.query('SELECT price FROM dispatch.item WHERE shipment_id=$1 ORDER BY intent_id', [
      s.shipmentId,
    ])
  ).rows.map((r) => r.price);
  expect(prices.every((x) => JSON.stringify(x) === JSON.stringify(prices[0]))).toBe(true);
  await f.sourceWorker.complete(accepted.lease, {
    result: accepted.result,
    status: 200,
    tasks: [accepted.task],
  });
  expect(
    (
      await db.pool.query('SELECT branch_id FROM dispatch.cycle WHERE shipment_id=$1 AND latest', [
        s.shipmentId,
      ])
    ).rows[0].branch_id,
  ).toBe(f.b);
  expect(
    (
      await db.pool.query('SELECT count(*)::int n FROM shipments.shipment WHERE id=$1', [
        s.shipmentId,
      ])
    ).rows[0].n,
  ).toBe(1);
});
it('unassigned source registration permits transfer without fictitious withdrawal and competing customer dispatch loses the native claim race', async () => {
  const s = await f.create(),
    input = { ...f.prepareInput([s]), prepareAssignment: false };
  const staged = (await dc().execute(f.admin.token, input)).body as DispatchResult;
  await f.completeNext();
  expect((await f.detail(staged.intentId)).state).toBe('unassigned');
  const send = goodsTransferCommands(db.pool, 'send'),
    create = command({
      type: 'goods.create',
      destinationBranchId: f.b,
      driverId: f.driver,
      plannedAt: new Date().toISOString(),
      lines: [
        {
          kind: 'parcel',
          shipmentId: s.shipmentId,
          expectedVersion: (await f.read(s.shipmentId))!.version,
        },
      ],
    });
  const outcomes = await Promise.allSettled([
    send.execute(f.admin.token, create),
    dc().execute(
      f.admin.token,
      f.prepareInput([{ ...s, version: (await f.read(s.shipmentId))!.version }]),
    ),
  ]);
  expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  for (let n = 0; n < 10; n++) if (!(await f.completeNext())) break;
  expect(
    (
      await db.pool.query(
        "SELECT count(*)::int n FROM integration.source_command WHERE operation_id='assignment.withdraw' AND request_body LIKE $1",
        ['%' + s.shipmentId + '%'],
      )
    ).rows[0].n,
  ).toBe(0);
});
it('held before departure requires actual branch receipt plus accepted withdrawal before A→B movement, without a Tawsel return receipt', async () => {
  const s = await f.create(),
    d = await f.prepared([s]);
  await dc().execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'dispatch.receive',
    intentId: d.id,
    expectedVersion: d.version,
    receiptAsserted: true,
  });
  await f.completeNext();
  const held = await f.detail(d.id);
  expect((await f.read(s.shipmentId))!.handedOver).toBe(true);
  await dc().execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'dispatch.withdraw',
    intentId: d.id,
    expectedVersion: held.version,
    actualAtBranch: true,
  });
  await expect(transfer(s.shipmentId)).rejects.toMatchObject({ code: 'RETURN_RECEIPT_REQUIRED' });
  await f.completeNext();
  expect((await f.read(s.shipmentId))!.handedOver).toBe(false);
  await transfer(s.shipmentId);
  const b = await prepareB(s);
  await acceptNewCycle();
  await f.completeNext();
  expect((await f.detail(b.intentId)).state).toBe('prepared');
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM returns.return_receipt_line WHERE shipment_id=$1',
        [s.shipmentId],
      )
    ).rows[0].n,
  ).toBe(0);
});
it('actual partial stored-stock return/loose B receipt funds only eligible quantity and never charges collected recipient shipping again', async () => {
  const x = await f.setup({ stock: true, outcome: 'partial' });
  await f.commands.execute(f.admin.token, f.receiveInput(x.request, 1, 'sound', true));
  await f.accept();
  const receipt = (
      await db.pool.query(
        'SELECT id,version FROM returns.return_receipt_line WHERE shipment_id=$1',
        [x.s.shipmentId],
      )
    ).rows[0],
    old = (
      await db.pool.query('SELECT * FROM dispatch.cycle WHERE shipment_id=$1 AND latest', [
        x.s.shipmentId,
      ])
    ).rows[0];
  const send = goodsTransferCommands(db.pool, 'send'),
    receive = goodsTransferCommands(db.pool, 'receive');
  const made = (
    await send.execute(
      f.admin.token,
      command({
        type: 'goods.create',
        destinationBranchId: f.b,
        driverId: f.driver,
        plannedAt: new Date().toISOString(),
        lines: [{ kind: 'loose', brandId: f.seed.brand, variantId: x.variant, quantity: 1 }],
      }),
    )
  ).body as GoodsTransferResult;
  const handed = (
      await send.execute(
        f.admin.token,
        command({
          type: 'goods.handover',
          manifestId: made.manifestId,
          expectedVersion: made.version,
          actualAt: new Date().toISOString(),
        }),
      )
    ).body as GoodsTransferResult,
    line = (await transferView(db.pool, f.company, made.manifestId))!.lines[0]!;
  const attempt = () =>
    f.commands.execute(
      f.admin.token,
      f.command({
        type: 'return.redispatch',
        branchId: f.b,
        previousCycleId: old.id,
        driverId: f.driver,
        allocations: [
          { receiptLineId: receipt.id, expectedVersion: receipt.version + 1, quantity: 1 },
        ],
      }),
    );
  await expect(attempt()).rejects.toMatchObject({ code: 'ACTUAL_DESTINATION_RECEIPT_REQUIRED' });
  await receive.execute(
    f.staffB.token,
    command({
      type: 'goods.receive',
      branchId: f.b,
      manifestId: made.manifestId,
      expectedVersion: handed.version,
      actualAt: new Date().toISOString(),
      lines: [
        {
          lineId: line.id,
          sound: 1,
          damaged: 0,
          uncertain: 0,
          inspection: 'counted-pieces',
          suspectedInternalIssue: false,
        },
      ],
    }),
  );
  const r = (await attempt()).body as ReturnResult,
    accepted = await acceptNewCycle();
  expect(accepted.task.snapshot.shippingDue.amountMinor).toBe(0);
  expect(accepted.task.snapshot.lines[0]!.quantity).toBe(1);
  await f.completeNext();
  const detail = await f.detail(r.dispatchIntentId!);
  await dc().execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'dispatch.receive',
    intentId: detail.id,
    expectedVersion: detail.version,
    receiptAsserted: true,
  });
  await f.completeNext();
  expect((await f.detail(detail.id)).state).toBe('accepted');
  expect(
    (
      await db.pool.query('SELECT branch_id FROM shipments.parcel_custody WHERE shipment_id=$1', [
        x.s.shipmentId,
      ])
    ).rows[0].branch_id,
  ).toBe(f.a);
  expect(
    (
      await db.pool.query(
        'SELECT quantity,branch_id FROM dispatch.transferred_return_allocation WHERE receipt_line_id=$1',
        [receipt.id],
      )
    ).rows[0],
  ).toEqual({ quantity: 1, branch_id: f.b });
});
it('actual sound return at A funds native B transfer and fresh B cycle without fabricating a B return receipt', async () => {
  const x = await f.setup({ outcome: 'refused' });
  await f.commands.execute(f.admin.token, f.receiveInput(x.request, 3));
  await f.accept();
  const receipt = (
    await db.pool.query(
      'SELECT id,version,consumed,branch_id FROM returns.return_receipt_line WHERE shipment_id=$1',
      [x.s.shipmentId],
    )
  ).rows[0];
  const old = (
    await db.pool.query('SELECT * FROM dispatch.cycle WHERE shipment_id=$1 AND latest', [
      x.s.shipmentId,
    ])
  ).rows[0];
  await transfer(x.s.shipmentId);
  const r = (
    await f.commands.execute(
      f.admin.token,
      f.command({
        type: 'return.redispatch',
        branchId: f.b,
        previousCycleId: old.id,
        driverId: f.driver,
        allocations: [
          { receiptLineId: receipt.id, expectedVersion: receipt.version + 1, quantity: 3 },
        ],
      }),
    )
  ).body as ReturnResult;
  const accepted = await acceptNewCycle();
  expect(accepted.e.operationId).toBe('dispatch.createFromReceipt');
  expect(accepted.e.payloadVersion).toBe('2.0.0');
  await f.completeNext();
  const detail = await f.detail(r.dispatchIntentId!);
  expect(detail.state).toBe('prepared');
  await dc().execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'dispatch.receive',
    intentId: detail.id,
    expectedVersion: detail.version,
    receiptAsserted: true,
  });
  await f.completeNext();
  expect((await f.detail(detail.id)).state).toBe('accepted');
  expect(
    (
      await db.pool.query(
        'SELECT branch_id,consumed FROM returns.return_receipt_line WHERE id=$1',
        [receipt.id],
      )
    ).rows[0],
  ).toEqual({ branch_id: f.a, consumed: 3 });
  expect(
    (
      await db.pool.query(
        'SELECT branch_id,quantity FROM dispatch.transferred_return_allocation WHERE receipt_line_id=$1',
        [receipt.id],
      )
    ).rows[0],
  ).toEqual({ branch_id: f.b, quantity: 3 });
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM returns.return_receipt_line WHERE shipment_id=$1',
        [x.s.shipmentId],
      )
    ).rows[0].n,
  ).toBe(1);
});
