import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import {
  migrate,
  readMigrations,
  readShipment,
  transferIncidentCandidates,
  transferView,
} from '@shahn/database';
import type { GoodsTransferCommand, GoodsTransferResult } from '@shahn/contracts';
import { dispatchCommands } from '../../../apps/api/src/modules/dispatch/dispatch.service.js';
import { transferFixture } from './fixtures.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof transferFixture>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 18));
  await migrate(db.pool);
  f = await transferFixture(db.pool);
});
afterAll(async () => {
  await db?.dispose();
});
describe('one physical manifest with immutable custody', () => {
  it('moves a prepared two-unit parcel and three loose units only at handover and actual receipt', async () => {
    const lines = [
      { kind: 'parcel', shipmentId: f.parcel.shipmentId, expectedVersion: f.parcel.version },
      { kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 3 },
    ] as const;
    const cancelled = await f.create([...lines]);
    await f.send.execute(
      f.admin.token,
      f.command({
        type: 'goods.cancel',
        manifestId: cancelled.manifestId,
        expectedVersion: cancelled.version,
        actualAt: new Date().toISOString(),
      }),
    );
    expect(await f.position(f.a)).toMatchObject({ sound: '10', reserved: '2' });
    const manifest = await f.create([...lines]);
    expect(manifest.state).toBe('prepared');
    expect(await f.position(f.a)).toMatchObject({ sound: '10', reserved: '5' });
    expect(await f.position(f.b)).toBeUndefined();
    const h = f.command({
      type: 'goods.handover',
      manifestId: manifest.manifestId,
      expectedVersion: manifest.version,
      actualAt: new Date().toISOString(),
    });
    const handed = (await f.send.execute(f.admin.token, h)).body as GoodsTransferResult;
    expect(handed.state).toBe('in_transit');
    expect((await f.send.execute(f.admin.token, h)).body).toEqual(handed);
    expect(await f.position(f.a)).toMatchObject({ sound: '5', reserved: '0' });
    expect(await f.position(f.b)).toBeUndefined();
    const view = (await transferView(db.pool, f.company, manifest.manifestId))!;
    const parcel = view.lines.find((l) => l.kind === 'parcel')!,
      loose = view.lines.find((l) => l.kind === 'loose')!;
    const receipt = f.command({
      type: 'goods.receive',
      branchId: f.b,
      manifestId: manifest.manifestId,
      expectedVersion: handed.version,
      actualAt: new Date().toISOString(),
      lines: [
        {
          lineId: parcel.id,
          sound: 1,
          damaged: 0,
          uncertain: 0,
          inspection: 'parcel-exterior',
          suspectedInternalIssue: false,
        },
        {
          lineId: loose.id,
          sound: 2,
          damaged: 0,
          uncertain: 0,
          inspection: 'counted-pieces',
          suspectedInternalIssue: false,
        },
      ],
    });
    await expect(f.receive.execute(f.staffA.token, receipt)).rejects.toMatchObject({
      code: 'FORBIDDEN_SCOPE',
    });
    const posted = (await f.receive.execute(f.staffB.token, receipt)).body as GoodsTransferResult;
    expect(posted.state).toBe('in_transit');
    expect((await f.receive.execute(f.staffB.token, receipt)).body).toEqual(posted);
    expect(await f.position(f.b)).toMatchObject({ sound: '4', reserved: '2' });
    expect(
      (await transferView(db.pool, f.company, manifest.manifestId))!.lines.find(
        (l) => l.id === loose.id,
      )?.remaining,
    ).toBe(1);
    expect(await transferIncidentCandidates(db.pool, f.company, manifest.manifestId)).toMatchObject(
      [{ lineId: loose.id, carrierRemaining: 1, suspectedInternalIssue: false }],
    );
    await expect(
      f.receive.execute(
        f.staffB.token,
        f.command({
          type: 'goods.receive',
          branchId: f.b,
          manifestId: manifest.manifestId,
          expectedVersion: posted.version,
          actualAt: new Date().toISOString(),
          lines: [
            {
              lineId: loose.id,
              sound: 2,
              damaged: 0,
              uncertain: 0,
              inspection: 'counted-pieces',
              suspectedInternalIssue: false,
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'RECEIPT_QUANTITY_EXCEEDED' });
    const sourceReturn = (
      await f.receive.execute(
        f.staffA.token,
        f.command({
          type: 'goods.sourceReturn',
          manifestId: manifest.manifestId,
          expectedVersion: posted.version,
          actualAt: new Date().toISOString(),
          lines: [
            {
              lineId: loose.id,
              sound: 1,
              damaged: 0,
              uncertain: 0,
              inspection: 'counted-pieces',
              suspectedInternalIssue: false,
            },
          ],
        }),
      )
    ).body as GoodsTransferResult;
    expect(sourceReturn.state).toBe('closed');
    expect(await f.position(f.a)).toMatchObject({ sound: '6', reserved: '0' });
    expect((await transferView(db.pool, f.company, manifest.manifestId))!.receipts).toHaveLength(2);
    const money = await db.pool
      .query(`SELECT (SELECT count(*)::int FROM kernel.journal_effect WHERE source_id IN
      (SELECT id FROM kernel.source_record WHERE system='goods-transfer')) AS effects`);
    expect(money.rows[0].effects).toBe(0);
    const movedParcel = (await readShipment(db.pool, f.company, f.parcel.shipmentId))!;
    expect(movedParcel.fields.branchId).toBe(f.b);
    await dispatchCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'dispatch.prepare',
      branchId: f.b,
      driverId: f.driver,
      items: [{ shipmentId: f.parcel.shipmentId, expectedVersion: movedParcel.version }],
    });
    const snapshot = (
      await db.pool.query<{ sourceBranchExternalId: string; externalId: string }>(
        `SELECT i.snapshot->>'sourceBranchExternalId' AS "sourceBranchExternalId",
        i.snapshot->>'externalId' AS "externalId" FROM dispatch.item i
       WHERE i.company_id=$1 AND i.shipment_id=$2 ORDER BY i.intent_id DESC LIMIT 1`,
        [f.company, f.parcel.shipmentId],
      )
    ).rows[0]!;
    expect(snapshot.sourceBranchExternalId).toBe('branch:' + f.b);
    expect(snapshot.externalId).toBe('shipment:' + f.parcel.shipmentId);
  });
  it('cancels a prepared reservation without moving physical stock and retains command payload identity', async () => {
    const m = await f.create([
      { kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 2 },
    ]);
    expect(await f.position(f.a)).toMatchObject({ sound: '6', reserved: '2' });
    const cancel = f.command({
      type: 'goods.cancel',
      manifestId: m.manifestId,
      expectedVersion: m.version,
      actualAt: new Date().toISOString(),
    });
    const result = (await f.send.execute(f.admin.token, cancel)).body as GoodsTransferResult;
    expect(result.state).toBe('cancelled');
    expect(await f.position(f.a)).toMatchObject({ sound: '6', reserved: '0' });
    await expect(
      f.send.execute(f.admin.token, {
        ...cancel,
        actualAt: new Date(Date.now() - 1000).toISOString(),
      } as GoodsTransferCommand),
    ).rejects.toMatchObject({ code: 'COMMAND_PAYLOAD_CONFLICT' });
  });
  it('rejects an invalid final line without reserving an earlier valid line or creating a manifest', async () => {
    const before = await db.pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM goods_transfer.manifest WHERE company_id=$1',
      [f.company],
    );
    await expect(
      f.send.execute(
        f.admin.token,
        f.command({
          type: 'goods.create',
          destinationBranchId: f.b,
          driverId: f.driver,
          plannedAt: new Date().toISOString(),
          lines: [
            { kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 2 },
            { kind: 'loose', brandId: f.brand, variantId: randomUUID(), quantity: 1 },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'STOCK_VARIANT_UNAVAILABLE' });
    expect(await f.position(f.a)).toMatchObject({ sound: '6', reserved: '0' });
    const after = await db.pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM goods_transfer.manifest WHERE company_id=$1',
      [f.company],
    );
    expect(after.rows[0]!.count).toBe(before.rows[0]!.count);
  });
  it('serializes two competing manifest reservations and rejects wrong scope or same branch', async () => {
    const build = () =>
      f.command({
        type: 'goods.create',
        destinationBranchId: f.b,
        driverId: f.driver,
        plannedAt: new Date().toISOString(),
        lines: [{ kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 4 }],
      });
    const outcomes = await Promise.allSettled([
      f.send.execute(f.admin.token, build()),
      f.send.execute(f.admin.token, build()),
    ]);
    expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await f.position(f.a)).toMatchObject({ sound: '6', reserved: '4' });
    await expect(
      f.send.execute(
        f.admin.token,
        f.command({
          type: 'goods.create',
          destinationBranchId: f.a,
          driverId: f.driver,
          plannedAt: new Date().toISOString(),
          lines: [{ kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 1 }],
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DESTINATION_BRANCH' });
    await expect(
      f.send.execute(
        f.admin.token,
        f.command({
          type: 'goods.create',
          destinationBranchId: f.foreign,
          driverId: f.driver,
          plannedAt: new Date().toISOString(),
          lines: [{ kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 1 }],
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DESTINATION_BRANCH' });
    await expect(
      f.send.execute(
        f.staffB.token,
        f.command({
          type: 'goods.create',
          destinationBranchId: f.a,
          driverId: f.driver,
          plannedAt: new Date().toISOString(),
          lines: [{ kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 1 }],
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_SCOPE' });
  });
  it('lets exactly one overlapping destination/source receipt win and leaves damaged stock unavailable', async () => {
    const m = await f.create([
      { kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 2 },
    ]);
    const h = (
      await f.send.execute(
        f.admin.token,
        f.command({
          type: 'goods.handover',
          manifestId: m.manifestId,
          expectedVersion: m.version,
          actualAt: new Date().toISOString(),
        }),
      )
    ).body as GoodsTransferResult;
    const line = (await transferView(db.pool, f.company, m.manifestId))!.lines[0]!;
    const at = new Date().toISOString();
    const destination = f.command({
      type: 'goods.receive',
      branchId: f.b,
      manifestId: m.manifestId,
      expectedVersion: h.version,
      actualAt: at,
      lines: [
        {
          lineId: line.id,
          sound: 0,
          damaged: 2,
          uncertain: 0,
          inspection: 'counted-pieces',
          suspectedInternalIssue: false,
        },
      ],
    });
    const source = f.command({
      type: 'goods.sourceReturn',
      manifestId: m.manifestId,
      expectedVersion: h.version,
      actualAt: at,
      lines: [
        {
          lineId: line.id,
          sound: 2,
          damaged: 0,
          uncertain: 0,
          inspection: 'counted-pieces',
          suspectedInternalIssue: false,
        },
      ],
    });
    const outcomes = await Promise.allSettled([
      f.receive.execute(f.staffB.token, destination),
      f.receive.execute(f.staffA.token, source),
    ]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((o) => o.status === 'rejected')).toHaveLength(1);
    const view = (await transferView(db.pool, f.company, m.manifestId))!;
    expect(view.state).toBe('closed');
    expect(view.receipts).toHaveLength(1);
    expect(view.lines[0]!.remaining).toBe(0);
    if (outcomes[0]!.status === 'fulfilled') {
      expect(await f.position(f.b)).toMatchObject({ sound: '4', unavailable: '2', reserved: '2' });
      expect(await f.position(f.a)).toMatchObject({ sound: '4', reserved: '4' });
    } else {
      expect(await f.position(f.a)).toMatchObject({ sound: '6', reserved: '4' });
    }
  });
  it('rechecks active carrier at handover and serializes cancellation against departure', async () => {
    const otherDb = await isolatedPostgres();
    try {
      await migrate(otherDb.pool);
      const g = await transferFixture(otherDb.pool);
      const manifest = await g.create([
        { kind: 'loose', brandId: g.brand, variantId: g.variant, quantity: 1 },
      ]);
      await otherDb.pool.query(
        'UPDATE employees.operational_driver SET active=false WHERE company_id=$1 AND id=$2',
        [g.company, g.driver],
      );
      const action = g.command({
        type: 'goods.handover',
        manifestId: manifest.manifestId,
        expectedVersion: manifest.version,
        actualAt: new Date().toISOString(),
      });
      await expect(g.send.execute(g.admin.token, action)).rejects.toMatchObject({
        code: 'DRIVER_INACTIVE',
      });
      expect(await g.position(g.a)).toMatchObject({ sound: '10', reserved: '3' });
      await otherDb.pool.query(
        'UPDATE employees.operational_driver SET active=true WHERE company_id=$1 AND id=$2',
        [g.company, g.driver],
      );
      await expect(g.send.execute(g.admin.token, action)).rejects.toMatchObject({
        code: 'DRIVER_INACTIVE',
      });
      const cancel = g.command({
        type: 'goods.cancel',
        manifestId: manifest.manifestId,
        expectedVersion: manifest.version,
        actualAt: new Date().toISOString(),
      });
      const departure = g.command({
        type: 'goods.handover',
        manifestId: manifest.manifestId,
        expectedVersion: manifest.version,
        actualAt: new Date().toISOString(),
      });
      const outcomes = await Promise.allSettled([
        g.send.execute(g.admin.token, cancel),
        g.send.execute(g.admin.token, departure),
      ]);
      expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
      const view = (await transferView(otherDb.pool, g.company, manifest.manifestId))!;
      expect(['cancelled', 'in_transit']).toContain(view.state);
      expect(view.handoverAt === null).toBe(view.state === 'cancelled');
      expect(await g.position(g.a)).toMatchObject(
        view.state === 'cancelled' ? { sound: '10', reserved: '2' } : { sound: '9', reserved: '2' },
      );
    } finally {
      await otherDb.dispose();
    }
  });
});
