import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { ReturnResult, ReceiptAllocation } from '@shahn/contracts';
import { returnFixture } from '../p14/fixtures.js';
import { returnedParcel, moveReturnedParcel } from './returned-parcel-fixture.js';
import { dispatchCommands } from '../../../apps/api/src/modules/dispatch/dispatch.service.js';
import { SourceFailure } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { returnDesk } from '../../../apps/api/src/modules/returns/query.service.js';
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
async function allocations(shipment: string): Promise<ReceiptAllocation[]> {
  return (
    await db.pool.query(
      'SELECT id AS "receiptLineId",version AS "expectedVersion",quantity FROM returns.return_receipt_line WHERE company_id=$1 AND shipment_id=$2 ORDER BY source_line_id',
      [f.company, shipment],
    )
  ).rows;
}
function redispatch(previous: string, selections: ReceiptAllocation[]) {
  return f.commands.execute(
    f.admin.token,
    f.command({
      type: 'return.redispatch',
      branchId: f.b,
      previousCycleId: previous,
      driverId: f.driver,
      allocations: selections,
    }),
  );
}
it('rejects a single commercial line of a whole transferred parcel without a cycle, allocation or physical claim', async () => {
  const x = await returnedParcel(db.pool, f);
  await moveReturnedParcel(db.pool, f, x.s.shipmentId);
  const all = await allocations(x.s.shipmentId);
  await expect(redispatch(x.previous, all.slice(0, 1))).rejects.toMatchObject({
    code: 'COMPLETE_TRANSFER_ALLOCATION_REQUIRED',
  });
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM dispatch.transferred_return_allocation WHERE receipt_line_id=ANY($1::uuid[])',
        [all.map((a) => a.receiptLineId)],
      )
    ).rows[0].n,
  ).toBe(0);
  expect(
    (
      await db.pool.query('SELECT count(*)::int n FROM dispatch.cycle WHERE shipment_id=$1', [
        x.s.shipmentId,
      ])
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await db.pool.query(
        'SELECT holder,branch_id FROM shipments.parcel_custody WHERE shipment_id=$1',
        [x.s.shipmentId],
      )
    ).rows[0],
  ).toEqual({ holder: 'branch', branch_id: f.b });
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM shipments.parcel_claim WHERE shipment_id=$1',
        [x.s.shipmentId],
      )
    ).rows[0].n,
  ).toBe(0);
});
it('rejects duplicate IDs, reduced parcel quantity, missing receipts and stale versions without consuming native custody', async () => {
  const x = await returnedParcel(db.pool, f);
  await moveReturnedParcel(db.pool, f, x.s.shipmentId);
  const all = await allocations(x.s.shipmentId);
  const cases = [
    { selections: [all[0]!, all[0]!], code: 'DUPLICATE_RECEIPT_ALLOCATION' },
    {
      selections: all.map((a) => ({ ...a, quantity: 1 })),
      code: 'COMPLETE_TRANSFER_ALLOCATION_REQUIRED',
    },
    {
      selections: all.map((a, index) => ({
        ...a,
        receiptLineId: index === 0 ? randomUUID() : a.receiptLineId,
      })),
      code: 'NOT_FOUND',
    },
    {
      selections: all.map((a, index) => ({
        ...a,
        expectedVersion: a.expectedVersion - (index === 0 ? 1 : 0),
      })),
      code: 'TRANSFER_RECEIPT_ALLOCATION_CONFLICT',
    },
  ];
  for (const c of cases)
    await expect(redispatch(x.previous, c.selections)).rejects.toMatchObject({ code: c.code });
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM dispatch.transferred_return_allocation WHERE receipt_line_id=ANY($1::uuid[])',
        [all.map((a) => a.receiptLineId)],
      )
    ).rows[0].n,
  ).toBe(0);
  expect(
    (
      await db.pool.query('SELECT holder FROM shipments.parcel_custody WHERE shipment_id=$1', [
        x.s.shipmentId,
      ])
    ).rows[0].holder,
  ).toBe('branch');
  const view = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'returns', (u) =>
    returnDesk(u, null, x.request.requestId),
  );
  const destination = view.items[0]!.items[0]!.receipts[0]!.transferredTo[0]!;
  expect(destination.wholeParcel).toBe(true);
  expect(
    destination.contents
      .map(({ description: _description, ...a }) => a)
      .sort((a, b) => a.receiptLineId.localeCompare(b.receiptLineId)),
  ).toEqual([...all].sort((a, b) => a.receiptLineId.localeCompare(b.receiptLineId)));
});
it.each(['damaged', 'uncertain', 'suspected'] as const)(
  'keeps a destination parcel with %s evidence unavailable to customer redispatch',
  async (condition) => {
    const x = await returnedParcel(db.pool, f);
    await moveReturnedParcel(db.pool, f, x.s.shipmentId, condition);
    await expect(redispatch(x.previous, await allocations(x.s.shipmentId))).rejects.toMatchObject({
      code: 'ACTUAL_DESTINATION_RECEIPT_REQUIRED',
    });
    expect(
      (
        await db.pool.query('SELECT count(*)::int n FROM dispatch.cycle WHERE shipment_id=$1', [
          x.s.shipmentId,
        ])
      ).rows[0].n,
    ).toBe(1);
  },
);
it('competing whole-parcel redispatches allocate each original receipt exactly once and unknown results retain the original parcel fence and source identity', async () => {
  const x = await returnedParcel(db.pool, f, 'repeated');
  await moveReturnedParcel(db.pool, f, x.s.shipmentId);
  const all = await allocations(x.s.shipmentId);
  const outcomes = await Promise.allSettled([
    redispatch(x.previous, all),
    redispatch(x.previous, all),
  ]);
  expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
  const made = outcomes.find((o) => o.status === 'fulfilled') as PromiseFulfilledResult<{
    body: unknown;
  }>;
  const r = made.value.body as ReturnResult;
  const lease = (await f.sourceWorker.claim())!;
  await f.sourceWorker.complete(lease, {
    failure: new SourceFailure('unknown', 'REMOTE_RESULT_UNKNOWN'),
  });
  expect(
    (
      await db.pool.query('SELECT owner_id FROM shipments.parcel_claim WHERE shipment_id=$1', [
        x.s.shipmentId,
      ])
    ).rows[0].owner_id,
  ).toBe(r.dispatchIntentId);
  expect(
    (
      await db.pool.query('SELECT holder FROM shipments.parcel_custody WHERE shipment_id=$1', [
        x.s.shipmentId,
      ])
    ).rows[0].holder,
  ).toBe('branch');
  await expect(redispatch(x.previous, all)).rejects.toMatchObject({
    code: 'CURRENT_CYCLE_REQUIRED',
  });
  await db.pool.query('UPDATE work_item SET available_at=clock_timestamp() WHERE id=$1', [
    lease.id,
  ]);
  const accepted = await f.redispatch();
  expect(accepted.lease.action_id).toBe(lease.action_id);
  expect(accepted.lease.request_body).toBe(lease.request_body);
  await f.completeNext();
  expect((await f.detail(r.dispatchIntentId!)).state).toBe('prepared');
  expect(
    (
      await db.pool.query(
        'SELECT sum(quantity)::int n,count(*)::int lines FROM dispatch.transferred_return_allocation WHERE cycle_id=$1',
        [r.entityId],
      )
    ).rows[0],
  ).toEqual({ n: 3, lines: 2 });
});
it('definitively rejected remote preparation retains the complete physical claim and cannot hand stock or parcel to a driver', async () => {
  const x = await returnedParcel(db.pool, f, 'repeated');
  await moveReturnedParcel(db.pool, f, x.s.shipmentId);
  const r = (await redispatch(x.previous, await allocations(x.s.shipmentId))).body as ReturnResult;
  await f.completeNext({ reject: 'RETURN_REVISION_CONFLICT' });
  const detail = await f.detail(r.dispatchIntentId!);
  expect(detail.state).toBe('rejected');
  await expect(
    dispatchCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'dispatch.receive',
      intentId: detail.id,
      expectedVersion: detail.version,
      receiptAsserted: true,
    }),
  ).rejects.toMatchObject({ code: 'ACCEPTED_PREPARATION_REQUIRED' });
  expect(
    (
      await db.pool.query('SELECT holder FROM shipments.parcel_custody WHERE shipment_id=$1', [
        x.s.shipmentId,
      ])
    ).rows[0].holder,
  ).toBe('branch');
  expect(
    (
      await db.pool.query(
        'SELECT sound_on_hand::text n FROM inventory.stock_position WHERE branch_id=$1 AND variant_id=$2',
        [f.b, x.variants[0]],
      )
    ).rows[0].n,
  ).toBe('3');
  expect(
    (
      await db.pool.query('SELECT owner_id FROM shipments.parcel_claim WHERE shipment_id=$1', [
        x.s.shipmentId,
      ])
    ).rows[0].owner_id,
  ).toBe(detail.id);
});
it.each(['repeated', 'distinct', 'packed'] as const)(
  'hands over complete %s stock with separate captured commercial identities/prices and one total physical movement',
  async (stock) => {
    const x = await returnedParcel(db.pool, f, stock);
    await moveReturnedParcel(db.pool, f, x.s.shipmentId);
    const all = await allocations(x.s.shipmentId);
    const r = (await redispatch(x.previous, all)).body as ReturnResult;
    const accepted = await f.redispatch();
    await f.completeNext();
    expect(accepted.task.snapshot.lines).toHaveLength(2);
    for (const line of x.lines)
      expect(accepted.task.snapshot.lines.find((l) => l.sourceLineId === line.id)).toMatchObject({
        quantity: line.quantity,
        unitDue: { amountMinor: Number(line.unitDue.amountMinor) },
      });
    expect(
      (await db.pool.query('SELECT price FROM dispatch.item WHERE cycle_id=$1', [r.entityId]))
        .rows[0].price.goodsDueMinor,
    ).toBe('50000');
    const detail = await f.detail(r.dispatchIntentId!);
    await dispatchCommands(db.pool).execute(f.admin.token, {
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
          'SELECT receipt_line_id,quantity FROM dispatch.transferred_return_allocation WHERE cycle_id=$1 ORDER BY receipt_line_id',
          [r.entityId],
        )
      ).rows,
    ).toEqual(
      all
        .map((a) => ({ receipt_line_id: a.receiptLineId, quantity: a.quantity }))
        .sort((a, b) => a.receipt_line_id.localeCompare(b.receipt_line_id)),
    );
    expect(
      (
        await db.pool.query(
          'SELECT holder,branch_id,driver_id FROM shipments.parcel_custody WHERE shipment_id=$1',
          [x.s.shipmentId],
        )
      ).rows[0],
    ).toEqual({ holder: 'driver', branch_id: f.b, driver_id: f.driver });
    if (stock !== 'packed') {
      expect(
        (
          await db.pool.query(
            'SELECT sum(sound_on_hand)::text n FROM inventory.stock_position WHERE branch_id=$1 AND variant_id=ANY($2::uuid[])',
            [f.b, x.variants],
          )
        ).rows[0].n,
      ).toBe('0');
      expect(
        (
          await db.pool.query(
            "SELECT sum(m.sound_delta)::text n FROM inventory.stock_movement m JOIN inventory.stock_source s ON(s.company_id,s.id)=(m.company_id,m.source_id) WHERE s.source_system='redispatch-handover' AND s.source_identity=$1",
            [r.entityId],
          )
        ).rows[0].n,
      ).toBe('-3');
      expect(
        (
          await db.pool.query(
            'SELECT count(*)::int n FROM inventory.stock_reservation WHERE variant_id=ANY($1::uuid[]) AND active',
            [x.variants],
          )
        ).rows[0].n,
      ).toBe(0);
    }
  },
);
