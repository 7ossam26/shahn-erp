import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transferView } from '@shahn/database';
import type { GoodsTransferCommand, GoodsTransferResult } from '@shahn/contracts';
import { returnFixture } from '../p14/fixtures.js';
import { goodsTransferCommands } from '../../../apps/api/src/modules/goods-transfers/transfer.service.js';
import { returnCommands } from '../../../apps/api/src/modules/returns/returns.service.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: Awaited<ReturnType<typeof returnFixture>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await returnFixture(db.pool);
});
afterAll(async () => {
  await db?.dispose();
});
it('moves only an entirely sound accepted customer return, reserves its receipt against brand handover, and leaves CHECK-003 disabled', async () => {
  const x = await f.setup({ outcome: 'refused' });
  await f.commands.execute(f.admin.token, f.receiveInput(x.request, 3));
  await f.accept();
  const accepted = await db.pool.query<{ id: string; consumed: number; version: number }>(
    `SELECT id,consumed,version FROM returns.return_receipt_line WHERE company_id=$1 AND shipment_id=$2`,
    [f.company, x.s.shipmentId],
  );
  expect(accepted.rows[0]?.consumed).toBe(0);
  const send = goodsTransferCommands(db.pool, 'send'),
    receive = goodsTransferCommands(db.pool, 'receive');
  const command = (v: object) =>
    ({
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      branchId: f.a,
      ...v,
    }) as GoodsTransferCommand;
  const created = (
    await send.execute(
      f.admin.token,
      command({
        type: 'goods.create',
        destinationBranchId: f.b,
        driverId: f.driver,
        plannedAt: new Date().toISOString(),
        lines: [
          {
            kind: 'parcel',
            shipmentId: x.s.shipmentId,
            expectedVersion: (await f.read(x.s.shipmentId))!.version,
          },
        ],
      }),
    )
  ).body as GoodsTransferResult;
  expect(created.state).toBe('prepared');
  await expect(
    returnCommands(db.pool).execute(
      f.admin.token,
      f.command({
        type: 'return.brandHandover',
        brandId: f.seed.brand,
        recipientName: 'Brand',
        actualAt: new Date().toISOString(),
        actualHandover: true,
        allocations: [
          {
            receiptLineId: accepted.rows[0]!.id,
            expectedVersion: accepted.rows[0]!.version,
            quantity: 3,
          },
        ],
      }),
    ),
  ).rejects.toMatchObject({ code: 'RETURN_ALREADY_ALLOCATED' });
  const handed = (
    await send.execute(
      f.admin.token,
      command({
        type: 'goods.handover',
        manifestId: created.manifestId,
        expectedVersion: created.version,
        actualAt: new Date().toISOString(),
      }),
    )
  ).body as GoodsTransferResult;
  expect(
    (
      await db.pool.query(`SELECT consumed FROM returns.return_receipt_line WHERE id=$1`, [
        accepted.rows[0]!.id,
      ])
    ).rows[0].consumed,
  ).toBe(3);
  const line = (await transferView(db.pool, f.company, created.manifestId))!.lines[0]!;
  const posted = (
    await receive.execute(
      f.staffB.token,
      command({
        type: 'goods.receive',
        branchId: f.b,
        manifestId: created.manifestId,
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
    )
  ).body as GoodsTransferResult;
  expect(posted.state).toBe('closed');
  expect((await f.read(x.s.shipmentId))?.fields.branchId).toBe(f.b);
  expect(
    (
      await db.pool.query(
        `SELECT holder,branch_id FROM shipments.parcel_custody WHERE shipment_id=$1`,
        [x.s.shipmentId],
      )
    ).rows[0],
  ).toMatchObject({ holder: 'branch', branch_id: f.b });
  // The native move does not claim a public A-to-B Tawsel cycle transition.
  const oldCycle = (
    await db.pool.query<{ id: string }>(
      `SELECT id FROM dispatch.cycle WHERE company_id=$1 AND shipment_id=$2 AND latest`,
      [f.company, x.s.shipmentId],
    )
  ).rows[0]!.id;
  await expect(
    f.commands.execute(
      f.admin.token,
      f.command({
        type: 'return.redispatch',
        branchId: f.b,
        previousCycleId: oldCycle,
        driverId: f.driver,
        allocations: [
          {
            receiptLineId: accepted.rows[0]!.id,
            expectedVersion: accepted.rows[0]!.version + 1,
            quantity: 3,
          },
        ],
      }),
    ),
  ).rejects.toMatchObject({ code: 'TAWSEL_CHECK_003' });
});
it('claims an accepted partial stored-stock return before moving loose goods, so later replenishment cannot reuse its receipt', async () => {
  const x = await f.setup({ stock: true, outcome: 'partial' });
  await f.commands.execute(f.admin.token, f.receiveInput(x.request, 1, 'sound', true));
  await f.accept();
  const receipt = (
    await db.pool.query<{ id: string; consumed: number; version: number }>(
      `SELECT id,consumed,version FROM returns.return_receipt_line WHERE company_id=$1 AND shipment_id=$2`,
      [f.company, x.s.shipmentId],
    )
  ).rows[0]!;
  expect(receipt.consumed).toBe(0);
  const send = goodsTransferCommands(db.pool, 'send');
  const command = (v: object) =>
    ({
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      branchId: f.a,
      ...v,
    }) as GoodsTransferCommand;
  const created = (
    await send.execute(
      f.admin.token,
      command({
        type: 'goods.create',
        destinationBranchId: f.b,
        driverId: f.driver,
        plannedAt: new Date().toISOString(),
        lines: [{ kind: 'loose', brandId: f.seed.brand, variantId: x.variant!, quantity: 1 }],
      }),
    )
  ).body as GoodsTransferResult;
  expect(
    (
      await db.pool.query(
        `SELECT quantity FROM goods_transfer.return_claim WHERE company_id=$1 AND receipt_line_id=$2`,
        [f.company, receipt.id],
      )
    ).rows[0]?.quantity,
  ).toBe(1);
  await expect(
    returnCommands(db.pool).execute(
      f.admin.token,
      f.command({
        type: 'return.brandHandover',
        brandId: f.seed.brand,
        recipientName: 'Brand',
        actualAt: new Date().toISOString(),
        actualHandover: true,
        allocations: [{ receiptLineId: receipt.id, expectedVersion: receipt.version, quantity: 1 }],
      }),
    ),
  ).rejects.toMatchObject({ code: 'RETURN_ALREADY_ALLOCATED' });
  await send.execute(
    f.admin.token,
    command({
      type: 'goods.handover',
      manifestId: created.manifestId,
      expectedVersion: created.version,
      actualAt: new Date().toISOString(),
    }),
  );
  expect(
    (
      await db.pool.query(
        `SELECT consumed FROM returns.return_receipt_line WHERE company_id=$1 AND id=$2`,
        [f.company, receipt.id],
      )
    ).rows[0]?.consumed,
  ).toBe(1);
});
