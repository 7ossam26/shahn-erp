import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readShipment, transferView } from '@shahn/database';
import type { IncidentCommand, IncidentResult, GoodsTransferResult } from '@shahn/contracts';
import { transferFixture } from '../p15/fixtures.js';
import {
  incidentCommands,
  incidentDetail,
} from '../../../apps/api/src/modules/incidents/service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof transferFixture>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await transferFixture(db.pool);
  await db.pool.query(
    `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'incidents') ON CONFLICT DO NOTHING`,
    [f.company, f.adminRole],
  );
});
afterAll(async () => {
  await db?.dispose();
});
const command = (x: object) =>
  ({ schemaVersion: 1, companyId: f.company, commandId: randomUUID(), ...x }) as IncidentCommand;
const report = async (
  kind: string,
  sourceId: string,
  lineId: string | null,
  offset: number,
  quantity: number,
) =>
  (
    await incidentCommands(db.pool).execute(
      f.admin.token,
      command({
        type: 'incident.report',
        report: {
          brandId: f.brand,
          kind: 'loss',
          observedAt: new Date().toISOString(),
          cause: 'عجز فعلي بعد الفحص',
          comment: '',
          evidence: [],
          items: [{ kind, sourceId, lineId, offset, quantity }],
        },
      }),
    )
  ).body as IncidentResult;
const confirm = (r: IncidentResult) =>
  incidentCommands(db.pool).execute(
    f.admin.token,
    command({
      type: 'incident.confirm',
      incidentId: r.incidentId,
      confirmation: {
        expectedVersion: 1,
        goodsValueMinor: '40000',
        compensationMinor: '40000',
        companyShareMinor: '40000',
        employeeShareMinor: '0',
        responsibleBranchId: f.a,
        branchReason: '',
        employeeId: null,
        payrollMonth: null,
        agreementReason: 'الشركة تتحمل الفقد الفعلي',
      },
    }),
  );
it('stock report conserves quantities, excludes reserved goods, confirms loss from unavailable stock without cash', async () => {
  const source = (
    await db.pool.query(
      `SELECT id FROM inventory.stock_movement WHERE company_id=$1 AND sound_delta>0 ORDER BY recorded_at LIMIT 1`,
      [f.company],
    )
  ).rows[0].id;
  const before = await f.position(f.a);
  await expect(report('stock_movement', source, null, 0, 9)).rejects.toThrow(
    'INCIDENT_STOCK_UNAVAILABLE',
  );
  const r = await report('stock_movement', source, null, 0, 2);
  expect(await f.position(f.a)).toMatchObject({
    sound: String(Number(before!.sound) - 2),
    unavailable: '2',
  });
  await confirm(r);
  expect(await f.position(f.a)).toMatchObject({
    sound: String(Number(before!.sound) - 2),
    unavailable: '0',
  });
  await expect(report('stock_movement', source, null, 0, 1)).rejects.toThrow(
    'INCIDENT_QUANTITY_CLAIMED',
  );
});
it('transfer discrepancy uses actual driver custody and source branch, blocks affected receipt, preserves uncompensated remainder', async () => {
  const m = await f.create([
    { kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 3 },
  ]);
  const sent = (
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
  const r = await report('transfer_line', line.id, null, 0, 1);
  await expect(
    f.receive.execute(
      f.admin.token,
      f.command({
        type: 'goods.receive',
        branchId: f.b,
        manifestId: m.manifestId,
        expectedVersion: sent.version,
        actualAt: new Date().toISOString(),
        lines: [
          {
            lineId: line.id,
            sound: 3,
            damaged: 0,
            uncertain: 0,
            inspection: 'counted-pieces',
            suspectedInternalIssue: false,
          },
        ],
      }),
    ),
  ).rejects.toThrow('INCIDENT_CUSTODY_HELD');
  await confirm(r);
  expect((await transferView(db.pool, f.company, m.manifestId))!.lines[0]!.remaining).toBe(2);
  const d = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'incidents', (u) =>
    incidentDetail(u, r.incidentId),
  );
  expect(d.holder).toBe('driver');
  expect(d.responsibleBranchId).toBe(f.a);
  expect(d.disposition.state).toBe('native_recorded');
  const second = await report('transfer_line', line.id, null, 1, 1);
  await confirm(second);
  expect((await transferView(db.pool, f.company, m.manifestId))!.lines[0]!.remaining).toBe(1);
});
it('dismissed parcel incident retains its hold history but permits an actual transfer receipt', async () => {
  const m = await f.create([
    { kind: 'parcel', shipmentId: f.parcel.shipmentId, expectedVersion: f.parcel.version },
  ]);
  const sent = (
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
  const shipment = (await readShipment(db.pool, f.company, f.parcel.shipmentId))!;
  const r = await report('shipment_line', shipment.id, shipment.fields.lines[0]!.id, 0, 1);
  const line = (await transferView(db.pool, f.company, m.manifestId))!.lines[0]!;
  const receipt = f.command({
    type: 'goods.receive',
    branchId: f.b,
    manifestId: m.manifestId,
    expectedVersion: sent.version,
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
  });
  await expect(f.receive.execute(f.admin.token, receipt)).rejects.toThrow('INCIDENT_CUSTODY_HELD');
  await incidentCommands(db.pool).execute(
    f.admin.token,
    command({
      type: 'incident.dismiss',
      incidentId: r.incidentId,
      expectedVersion: 1,
      reason: 'Inspection established no incident claim; ordinary receipt remains required',
    }),
  );
  await expect(f.receive.execute(f.admin.token, receipt)).rejects.toThrow('INCIDENT_CUSTODY_HELD');
  const posted = (await f.receive.execute(f.admin.token, { ...receipt, commandId: randomUUID() }))
    .body as GoodsTransferResult;
  expect(posted.state).toBe('closed');
  expect(
    (
      await db.pool.query(
        'SELECT holder,branch_id FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2',
        [f.company, shipment.id],
      )
    ).rows[0],
  ).toMatchObject({ holder: 'branch', branch_id: f.b });
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM incidents.shipment_hold WHERE company_id=$1 AND incident_id=$2',
        [f.company, r.incidentId],
      )
    ).rows[0].n,
  ).toBe(1);
  expect((await transferView(db.pool, f.company, m.manifestId))!.receipts).toHaveLength(1);
});
