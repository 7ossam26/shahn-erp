import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { readBrand, readProducts, transferView } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type { GoodsTransferCommand, GoodsTransferResult, InventoryResult } from '@shahn/contracts';
import type { ReturnRequest } from '@shahn/contracts/tawsel';
import { returnFixture } from '../p14/fixtures.js';
import { goodsTransferCommands } from '../../../apps/api/src/modules/goods-transfers/transfer.service.js';
import { inventoryCommands } from '../../../apps/api/src/modules/inventory/service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';

export async function returnedParcel(
  pool: Pool,
  f: Awaited<ReturnType<typeof returnFixture>>,
  stock: 'packed' | 'repeated' | 'distinct' = 'packed',
) {
  const variants: string[] = [];
  if (stock !== 'packed') {
    const { id, version, ...fields } = (await readBrand(pool, f.company, f.seed.brand))!;
    if (!fields.services.includes('stored_stock'))
      await commercialCommands(pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'brand.update',
        entityId: id,
        expectedVersion: version,
        fields: {
          ...fields,
          services: ['brand_packed', 'stored_stock'],
          defaultService: 'brand_packed',
          storage: {
            monthlyFeeMinor: '10000',
            branchId: f.a,
            startDate: cairoDate(new Date()),
            anniversaryDay: Number(cairoDate(new Date()).slice(-2)),
            active: true,
            stopDate: null,
          },
        },
      });
    const product = (
      await inventoryCommands(pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'product.create',
        brandId: f.seed.brand,
        fields: {
          name: 'طرد مرتجع متعدد السطور',
          active: true,
          variants: (stock === 'distinct' ? ['الأول', 'الثاني'] : ['المشترك']).map((name) => ({
            name,
            options: '',
            active: true,
          })),
        },
      })
    ).body as InventoryResult;
    variants.push(
      ...(await readProducts(pool, f.company))
        .find((p) => p.id === product.entityId)!
        .variants.map((v) => v.id),
    );
    await inventoryCommands(pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'stock.receive',
      branchId: f.a,
      brandId: f.seed.brand,
      actualDate: cairoDate(new Date()),
      lines: variants.map((variantId, index) => ({
        variantId,
        quantity: stock === 'repeated' ? 3 : index + 1,
        condition: 'sound',
      })),
    });
  }
  const lines = [1, 2].map((quantity, index) => ({
    id: randomUUID(),
    description: 'محتوى الطرد ' + quantity,
    quantity,
    unitDue: { currency: 'EGP' as const, amountMinor: quantity === 1 ? '10000' : '20000' },
    ...(stock === 'packed' ? {} : { variantId: variants[stock === 'repeated' ? 0 : index]! }),
  }));
  const x = await f.received({ lines, ...(stock === 'packed' ? {} : { service: 'stored_stock' }) });
  const outcome = await x.outcome('refused');
  const request: ReturnRequest = {
    requestId: randomUUID(),
    driverId: f.driverResource,
    sourceBranchId: outcome.branchId!,
    integrationId: f.connection.integrationId,
    roundId: x.roundId,
    requestedAt: new Date().toISOString(),
    items: outcome.lines.map((l) => ({
      itemId: randomUUID(),
      taskId: x.task.taskId,
      dispatchCycleId: x.task.dispatchCycleId,
      outcomeId: outcome.outcomeId,
      attemptId: x.attemptId,
      sourceLineId: l.sourceLineId,
      externalId: x.task.externalId,
      sourceDispatchCycleId: x.task.sourceDispatchCycleId,
      sourceRevision: x.task.sourceRevision,
      revision: 0,
      requested: l.heldReturnRequired,
      received: 0,
      lost: 0,
      damaged: 0,
      unresolved: l.heldReturnRequired,
      eligibility: 'pending',
      custody: {
        sourceQuantity: l.sourceQuantity,
        delivered: 0,
        held: l.heldReturnRequired,
        received: 0,
        lost: 0,
        damaged: 0,
      },
    })),
  };
  await f.receive(f.event('outcome.recorded', { outcome }, x.task.taskId, 1));
  await f.drain();
  await f.receive(f.event('return.requested', { request }, request.requestId, 1, 'return-request'));
  await f.drain();
  await f.commands.execute(
    f.admin.token,
    f.command({
      type: 'return.receive',
      requestId: request.requestId,
      actualReceipt: true,
      observedAt: new Date().toISOString(),
      items: request.items.map((i) => ({
        itemId: i.itemId,
        expectedRevision: 0,
        quantity: i.requested,
        condition: 'sound',
        inspection: stock === 'packed' ? 'parcel-exterior' : 'counted-pieces',
        suspectedShortage: false,
      })),
    }),
  );
  await f.accept();
  const previous = (
    await pool.query(
      'SELECT id FROM dispatch.cycle WHERE company_id=$1 AND shipment_id=$2 AND latest',
      [f.company, x.s.shipmentId],
    )
  ).rows[0].id as string;
  return { ...x, request, previous, lines, variants };
}

export async function moveReturnedParcel(
  pool: Pool,
  f: Awaited<ReturnType<typeof returnFixture>>,
  shipmentId: string,
  condition: 'sound' | 'damaged' | 'uncertain' | 'suspected' = 'sound',
) {
  const send = goodsTransferCommands(pool, 'send'),
    receive = goodsTransferCommands(pool, 'receive');
  const command = (v: object) =>
    ({
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      branchId: f.a,
      ...v,
    }) as GoodsTransferCommand;
  const made = (
    await send.execute(
      f.admin.token,
      command({
        type: 'goods.create',
        destinationBranchId: f.b,
        driverId: f.driver,
        plannedAt: new Date().toISOString(),
        lines: [
          { kind: 'parcel', shipmentId, expectedVersion: (await f.read(shipmentId))!.version },
        ],
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
  ).body as GoodsTransferResult;
  const line = (await transferView(pool, f.company, made.manifestId))!.lines[0]!;
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
          sound: condition === 'sound' || condition === 'suspected' ? 1 : 0,
          damaged: condition === 'damaged' ? 1 : 0,
          uncertain: condition === 'uncertain' ? 1 : 0,
          inspection: 'parcel-exterior',
          suspectedInternalIssue: condition === 'suspected',
        },
      ],
    }),
  );
  return made.manifestId;
}
