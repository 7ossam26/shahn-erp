import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import {
  migrate,
  readMigrations,
  readProducts,
  StockPositionRepository,
  positionKey,
} from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type {
  ShipmentCommand,
  ShipmentFields,
  ShipmentResult,
  InventoryCommand,
  InventoryResult,
} from '@shahn/contracts';
import { accessFixture } from '../support/access.js';
import { shipmentFields } from '../support/shipments.js';
import { seedCommercial } from '../../apps/api/src/modules/brands/seed.js';
import { commercialCommands } from '../../apps/api/src/modules/brands/service.js';
import { inventoryCommands } from '../../apps/api/src/modules/inventory/service.js';
import {
  shipmentCommands,
  shipmentDetail,
  defaultShipmentFilter,
  listShipmentParcels,
  correctionPreview,
} from '../../apps/api/src/modules/shipments/service.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
import { createApplication } from '../../apps/api/src/app.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof accessFixture>>,
  seed: Awaited<ReturnType<typeof seedCommercial>>,
  service: ReturnType<typeof shipmentCommands>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
const envelope = (o: object) => ({
  schemaVersion: 1,
  companyId: f.company,
  commandId: randomUUID(),
  ...o,
});
const run = async (o: object) =>
  (await service.execute(f.admin.token, envelope(o) as ShipmentCommand)).body as ShipmentResult;
const detail = (r: ShipmentResult) =>
  UnitOfWork.run(db.pool, f.admin.token, f.company, 'intake', (u) =>
    shipmentDetail(u, r.shipmentId),
  );
const inv = async (o: object) =>
  (await inventoryCommands(db.pool).execute(f.admin.token, envelope(o) as InventoryCommand))
    .body as InventoryResult;
const counts = async () =>
  (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM shipments.shipment) AS orders,(SELECT count(*)::int FROM shipments.receipt) AS receipts,(SELECT count(*)::int FROM inventory.stock_receipt) AS inbound,(SELECT count(*)::int FROM inventory.stock_reservation) AS reservations,(SELECT count(*)::int FROM shipments.parcel_custody) AS custody,(SELECT count(*)::int FROM kernel.journal_effect) AS money`,
    )
  ).rows[0];
async function stock(blue = 5, red = 3) {
  const p = await inv({
    type: 'product.create',
    brandId: seed.brand,
    fields: {
      name: 'P07 actual receipt ' + randomUUID(),
      active: true,
      variants: [
        { name: 'Blue', options: '', active: true },
        { name: 'Red', options: '', active: true },
      ],
    },
  });
  const product = (await readProducts(db.pool, f.company, seed.brand)).find(
    (x) => x.id === p.entityId,
  )!;
  const b = product.variants.find((v) => v.name === 'Blue')!.id,
    r = product.variants.find((v) => v.name === 'Red')!.id;
  await inv({
    type: 'stock.receive',
    branchId: f.a,
    brandId: seed.brand,
    actualDate: cairoDate(new Date()),
    lines: [
      ...(blue ? [{ variantId: b, quantity: blue, condition: 'sound' }] : []),
      ...(red ? [{ variantId: r, quantity: red, condition: 'sound' }] : []),
    ],
  });
  const fields = shipmentFields(
    { branchId: f.a, brandId: seed.brand, governorateId: seed.cairo },
    {
      service: 'stored_stock',
      lines: [
        {
          id: randomUUID(),
          variantId: b,
          description: 'Blue',
          quantity: 2,
          unitDue: { currency: 'EGP', amountMinor: '5000' },
        },
        {
          id: randomUUID(),
          variantId: r,
          description: 'Red',
          quantity: 1,
          unitDue: { currency: 'EGP', amountMinor: '15000' },
        },
      ],
    },
  );
  return { b, r, fields };
}
const confirm = (fields: ShipmentFields) => ({
  type: 'shipment.confirm',
  fields,
  actualReceipt: false,
  duplicateAcknowledged: false,
  expectedPolicyVersion: 2,
  expectedTariffVersion: 1,
  expectedTariffId: seed.base,
});
const balance = async (v: string, branch = f.a) =>
  (
    await db.pool.query(
      `SELECT s.sound_on_hand::int AS sound,s.unavailable_on_hand::int AS unavailable,(SELECT COALESCE(sum(quantity),0)::int FROM inventory.stock_reservation r WHERE r.company_id=s.company_id AND r.branch_id=s.branch_id AND r.variant_id=s.variant_id AND active) AS reserved FROM inventory.stock_position s WHERE s.company_id=$1 AND s.branch_id=$2 AND s.variant_id=$3`,
      [f.company, branch, v],
    )
  ).rows[0];
beforeAll(async () => {
  await mkdir('docs/verification/P07', { recursive: true });
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 10));
  f = await accessFixture(db.pool);
  seed = await seedCommercial(db.pool, f.admin.token, f.company, f.a, 'test');
  await commercialCommands(db.pool).execute(
    f.admin.token,
    envelope({
      type: 'brand.update',
      entityId: seed.brand,
      expectedVersion: 1,
      fields: {
        ...seed.brandFields,
        services: ['brand_packed', 'company_packed', 'stored_stock'],
        storage: {
          monthlyFeeMinor: '10000',
          branchId: f.a,
          startDate: '2026-10-01',
          anniversaryDay: 1,
          active: true,
          stopDate: null,
        },
      },
    }) as never,
  );
  const before = await counts();
  await migrate(db.pool);
  expect(await counts()).toEqual(before);
  const status = await promisify(execFile)(
    process.execPath,
    ['packages/database/dist/cli.js', 'status'],
    {
      env: {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_URL: db.url,
        MIGRATION_DATABASE_URL: db.url,
      },
    },
  );
  await writeFile('docs/verification/P07/live-db-status.txt', status.stdout);
  service = shipmentCommands(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  if (db && f)
    await writeFile(
      'docs/verification/P07/db-results.json',
      JSON.stringify(
        { counts: await counts(), postgres: (await db.pool.query('SHOW server_version')).rows[0] },
        null,
        2,
      ),
    );
  await app?.close();
  await db?.dispose();
});
it('P07-AC-01 reserves 2/1 at 305, without a second receipt or physical/money effect', async () => {
  const { b, r, fields } = await stock(),
    before = await counts();
  const result = await run(confirm(fields)),
    d = await detail(result);
  expect(d.price.recipientDueMinor).toBe('30500');
  expect(d.preparation).toBe('awaiting_preparation');
  expect(d.stock.allocations).toHaveLength(2);
  expect(d.timeline[0]!.kind).toBe('reserved');
  expect(await balance(b)).toEqual({ sound: 5, unavailable: 0, reserved: 2 });
  expect(await balance(r)).toEqual({ sound: 3, unavailable: 0, reserved: 1 });
  expect(await counts()).toEqual({
    ...before,
    orders: before.orders + 1,
    reservations: before.reservations + 2,
    custody: before.custody + 1,
  });
  const q = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'intake', (u) =>
    listShipmentParcels(u, { ...defaultShipmentFilter([f.a]), service: 'stored_stock' }),
  );
  expect(q.items.some((x) => x.id === result.shipmentId)).toBe(true);
});
it('P07-AC-02/04 missing tariff and summed duplicate commercial lines reject all effects with named shortage', async () => {
  const { fields } = await stock();
  const before = await counts();
  await expect(run(confirm({ ...fields, governorateId: seed.giza }))).rejects.toMatchObject({
    code: 'PRICE_MISSING',
  });
  const duplicate = {
    ...fields,
    lines: [
      fields.lines[0]!,
      {
        ...fields.lines[0]!,
        id: randomUUID(),
        quantity: 4,
        unitDue: { currency: 'EGP' as const, amountMinor: '1' },
      },
    ],
  };
  await expect(run(confirm(duplicate))).rejects.toMatchObject({
    reply: {
      body: { code: 'STOCK_SHORTAGE', details: [{ required: 6, available: 5, shortage: 1 }] },
    },
  });
  expect(await counts()).toEqual(before);
});
it('P07-AC-03 independent command transactions contend behind a database barrier; last unit succeeds once', async () => {
  const { b, fields } = await stock(1, 1);
  const one = { ...fields, lines: [{ ...fields.lines[0]!, quantity: 1 }] };
  const blocker = await db.pool.connect();
  await blocker.query('BEGIN');
  await blocker.query(
    'SELECT * FROM inventory.stock_position WHERE company_id=$1 AND variant_id=$2 FOR UPDATE',
    [f.company, b],
  );
  const before = await counts();
  const racers = [run(confirm(one)), run(confirm({ ...one, brandReference: 'independent' }))];
  // The first transaction waits on the stock row; the second waits on the brand row. Both are independent DB clients.
  let waiting = 0;
  for (let i = 0; i < 100; i++) {
    waiting = Number(
      (
        await db.pool.query(
          "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
        )
      ).rows[0].n,
    );
    if (waiting >= 2) break;
    await new Promise((r) => setTimeout(r, 10));
  }
  expect(waiting).toBeGreaterThanOrEqual(2);
  await blocker.query('COMMIT');
  blocker.release();
  const result = await Promise.allSettled(racers);
  expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(result.find((r) => r.status === 'rejected')).toMatchObject({
    reason: { code: 'STOCK_SHORTAGE' },
  });
  expect(await balance(b)).toEqual({ sound: 1, unavailable: 0, reserved: 1 });
  const after = await counts();
  expect(after.orders - before.orders).toBe(1);
  expect(after.reservations - before.reservations).toBe(1);
});
it('P07-AC-03 reverse multi-line contention has no partial losing reservations', async () => {
  const { b, r, fields } = await stock(2, 1);
  const outcomes = await Promise.allSettled([
    run(confirm(fields)),
    run(confirm({ ...fields, lines: [...fields.lines].reverse() })),
  ]);
  expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect(await balance(b)).toEqual({ sound: 2, unavailable: 0, reserved: 2 });
  expect(await balance(r)).toEqual({ sound: 1, unavailable: 0, reserved: 1 });
});
it('P07-AC-05 preparation moves no stock; prepared cancellation and partial sound unpack conserve physical quantity', async () => {
  const { b, r, fields } = await stock();
  let result = await run(confirm(fields));
  const before = await balance(b);
  result = await run({
    type: 'shipment.prepare',
    shipmentId: result.shipmentId,
    expectedVersion: 1,
  });
  expect(await balance(b)).toEqual(before);
  result = await run({
    type: 'shipment.cancel',
    shipmentId: result.shipmentId,
    expectedVersion: 2,
    reason: 'Actual packed cancellation',
  });
  expect(await balance(b)).toEqual({ sound: 3, unavailable: 2, reserved: 0 });
  expect(await balance(r)).toEqual({ sound: 2, unavailable: 1, reserved: 0 });
  const d = await detail(result),
    pending = d.stock.unpack.find((x) => x.variantId === b)!;
  await run({
    type: 'shipment.unpack',
    shipmentId: d.id,
    expectedVersion: 3,
    reason: 'Actual unpack inspected',
    lines: [
      { pendingId: pending.pendingId, expectedRemaining: 2, sound: 1, damaged: 1, uncertain: 0 },
    ],
  });
  expect(await balance(b)).toEqual({ sound: 4, unavailable: 1, reserved: 0 });
  expect((await detail(result)).stock.unpack.find((x) => x.variantId === b)).toMatchObject({
    remaining: 0,
    sound: 1,
    damaged: 1,
  });
});
it('P07-AC-06 failed increase retains old revision/claim; branch delta uses actual destination stock', async () => {
  const { b, fields } = await stock();
  const result = await run(confirm(fields)),
    d = await detail(result);
  const next = { ...fields, lines: [{ ...fields.lines[0]!, quantity: 6 }, fields.lines[1]!] };
  const preview = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'intake', (u) =>
    correctionPreview(u, d, next, 1, false),
  );
  expect(preview.stockDelta.find((x) => x.variantId === b)).toMatchObject({
    before: 2,
    after: 6,
    shortage: 1,
  });
  await expect(
    run({
      type: 'shipment.correct',
      shipmentId: d.id,
      expectedVersion: 1,
      fields: next,
      reason: 'Increase',
      actualAtCorrectedBranch: false,
      duplicateAcknowledged: false,
    }),
  ).rejects.toMatchObject({ code: 'STOCK_SHORTAGE' });
  expect((await detail(result)).revision).toBe(1);
  expect((await balance(b)).reserved).toBe(2);
  await expect(
    run({
      type: 'shipment.correct',
      shipmentId: d.id,
      expectedVersion: 1,
      fields: { ...fields, branchId: f.b },
      reason: 'Change branch',
      actualAtCorrectedBranch: false,
      duplicateAcknowledged: false,
    }),
  ).rejects.toMatchObject({ code: 'STOCK_SHORTAGE' });
  await inv({
    type: 'stock.receive',
    branchId: f.b,
    brandId: seed.brand,
    actualDate: cairoDate(new Date()),
    lines: fields.lines.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      condition: 'sound',
    })),
  });
  await run({
    type: 'shipment.correct',
    shipmentId: d.id,
    expectedVersion: 1,
    fields: { ...fields, branchId: f.b },
    reason: 'Actual destination stock',
    actualAtCorrectedBranch: false,
    duplicateAcknowledged: false,
  });
  expect((await balance(b)).reserved).toBe(0);
  expect((await balance(b, f.b)).reserved).toBe(2);
});
it('P07-AC-07 truthful 5/7 holds every affected order but permits unrelated preparation', async () => {
  const { b, fields } = await stock(7, 3);
  const one = await run(confirm({ ...fields, lines: [{ ...fields.lines[0]!, quantity: 4 }] })),
    two = await run(confirm({ ...fields, lines: [{ ...fields.lines[0]!, quantity: 3 }] })),
    other = await run(confirm({ ...fields, lines: [fields.lines[1]!] }));
  await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', async (u) => {
    const key = { branchId: f.a, brandId: seed.brand, variantId: b };
    u.lockOrder('stock', positionKey(key));
    const p = (await new StockPositionRepository().lock(u.client, f.company, [key]))[0]!;
    const source = randomUUID();
    await u.client.query(
      "INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'adjustment','P07 observation model fixture',$2::uuid::text,1)",
      [f.company, source],
    );
    await u.client.query(
      "INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,'actual observed 5',$4,$5,$6,'sound',-2,0,$7)",
      [f.company, randomUUID(), source, f.a, seed.brand, b, cairoDate(new Date())],
    );
    await new StockPositionRepository().update(u.client, f.company, p, 5, 0);
  });
  for (const x of [one, two]) {
    expect((await detail(x)).stock).toMatchObject({
      eligible: false,
      allocations: [{ held: true, shortage: 2 }],
    });
    await expect(
      run({ type: 'shipment.prepare', shipmentId: x.shipmentId, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: 'PREPARATION_HELD' });
  }
  await run({ type: 'shipment.prepare', shipmentId: other.shipmentId, expectedVersion: 1 });
  await inv({
    type: 'stock.receive',
    branchId: f.a,
    brandId: seed.brand,
    actualDate: cairoDate(new Date()),
    lines: [{ variantId: b, quantity: 2, condition: 'sound' }],
  });
  expect((await detail(one)).stock.eligible).toBe(true);
  await run({ type: 'shipment.prepare', shipmentId: one.shipmentId, expectedVersion: 1 });
});
it('P07-AC-08 lost response/replay creates one reference, changed payload conflicts', async () => {
  const { fields } = await stock();
  const input = envelope(confirm(fields)) as ShipmentCommand;
  const result = await service.execute(f.admin.token, input),
    before = await counts();
  expect(await service.execute(f.admin.token, input)).toEqual(result);
  expect(await service.recover(f.admin.token, f.company, 'shipment', input.commandId)).toEqual(
    result,
  );
  expect(await counts()).toEqual(before);
  await expect(
    service.execute(f.admin.token, {
      ...input,
      fields: { ...fields, comment: 'Changed' },
    } as ShipmentCommand),
  ).rejects.toMatchObject({ code: 'COMMAND_PAYLOAD_CONFLICT' });
});
it('P07-AC-09 stale/handover and scope denial retain all claims; authenticated HTTP has typed shortage details', async () => {
  const { b, fields } = await stock();
  const result = await run(confirm(fields)),
    before = await balance(b);
  await expect(
    run({
      type: 'shipment.cancel',
      shipmentId: result.shipmentId,
      expectedVersion: 99,
      reason: 'stale',
    }),
  ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  await db.pool.query(
    'UPDATE shipments.shipment SET handed_over=true,version=version+1 WHERE company_id=$1 AND id=$2',
    [f.company, result.shipmentId],
  );
  await expect(
    run({
      type: 'shipment.cancel',
      shipmentId: result.shipmentId,
      expectedVersion: 2,
      reason: 'departed',
    }),
  ).rejects.toMatchObject({ code: 'HANDED_OVER_PROTECTED' });
  expect(await balance(b)).toEqual(before);
  const response = await fetch(origin + '/api/v1/shipments', {
    method: 'POST',
    headers: {
      cookie: 'erp_session=' + f.admin.token,
      origin: f.config.origin,
      'x-csrf-token': f.admin.csrfToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      envelope(confirm({ ...fields, lines: [{ ...fields.lines[0]!, quantity: 8 }] })),
    ),
  });
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({
    code: 'STOCK_SHORTAGE',
    details: [{ variantId: b, shortage: 5 }],
  });
  await db.pool.query('DELETE FROM access.user_branch WHERE user_id=$1 AND branch_id=$2', [
    f.staffA.id,
    f.a,
  ]);
  await expect(
    service.execute(f.staffA.token, envelope(confirm(fields)) as ShipmentCommand),
  ).rejects.toMatchObject({ code: 'FORBIDDEN_SCOPE' });
});
it('unprepared cancellation releases all stock; zero recipient due still requires tariff and real stock', async () => {
  const { b, fields } = await stock();
  const paid = {
    ...fields,
    shippingPayer: 'brand' as const,
    lines: fields.lines.map((l) => ({
      ...l,
      unitDue: { currency: 'EGP' as const, amountMinor: '0' },
    })),
  };
  const result = await run(confirm(paid));
  expect((await detail(result)).price).toMatchObject({
    recipientDueMinor: '0',
    tariffMinor: '5500',
  });
  await run({
    type: 'shipment.cancel',
    shipmentId: result.shipmentId,
    expectedVersion: 1,
    reason: 'Unpacked',
  });
  expect(await balance(b)).toEqual({ sound: 5, unavailable: 0, reserved: 0 });
  expect((await detail(result)).stock.unpack).toHaveLength(0);
  await expect(run(confirm({ ...paid, governorateId: seed.giza }))).rejects.toMatchObject({
    code: 'PRICE_MISSING',
  });
});
it('prepared quantity correction retires old contents to actual unpack, renews preparation, and reuses old tariff', async () => {
  const { b, fields } = await stock();
  const result = await run(confirm(fields));
  await run({ type: 'shipment.prepare', shipmentId: result.shipmentId, expectedVersion: 1 });
  const d = await detail(result),
    next = { ...fields, lines: [{ ...fields.lines[0]!, quantity: 1 }, fields.lines[1]!] };
  await run({
    type: 'shipment.correct',
    shipmentId: d.id,
    expectedVersion: 2,
    fields: next,
    reason: 'Changed actual packed contents',
    actualAtCorrectedBranch: false,
    duplicateAcknowledged: false,
  });
  expect(await balance(b)).toEqual({ sound: 3, unavailable: 2, reserved: 1 });
  const after = await detail(result);
  expect(after.preparation).toBe('awaiting_preparation');
  expect(after.price.baseShippingMinor).toBe('5000');
  expect(after.stock.unpack.find((x) => x.variantId === b)).toMatchObject({ remaining: 2 });
});
it('two commercial values share one claim; bounded inspection rejects excessive/stale quantities and replays once', async () => {
  const { b, fields } = await stock();
  const result = await run(
    confirm({
      ...fields,
      lines: [
        fields.lines[0]!,
        {
          ...fields.lines[0]!,
          id: randomUUID(),
          quantity: 1,
          unitDue: { currency: 'EGP', amountMinor: '100' },
        },
      ],
    }),
  );
  const d = await detail(result);
  expect(d.fields.lines).toHaveLength(2);
  expect(d.stock.allocations).toMatchObject([{ quantity: 3 }]);
  await run({ type: 'shipment.prepare', shipmentId: d.id, expectedVersion: 1 });
  await run({ type: 'shipment.cancel', shipmentId: d.id, expectedVersion: 2, reason: 'Packed' });
  const pending = (await detail(result)).stock.unpack[0]!;
  await expect(
    run({
      type: 'shipment.unpack',
      shipmentId: d.id,
      expectedVersion: 3,
      reason: 'Excess',
      lines: [
        { pendingId: pending.pendingId, expectedRemaining: 3, sound: 4, damaged: 0, uncertain: 0 },
      ],
    }),
  ).rejects.toMatchObject({ code: 'UNPACK_QUANTITY_EXCEEDED' });
  const input = envelope({
    type: 'shipment.unpack',
    shipmentId: d.id,
    expectedVersion: 3,
    reason: 'Actual sound subset',
    lines: [
      { pendingId: pending.pendingId, expectedRemaining: 3, sound: 1, damaged: 0, uncertain: 0 },
    ],
  }) as ShipmentCommand;
  const inspection = await service.execute(f.admin.token, input);
  const before = await balance(b);
  expect(await service.execute(f.admin.token, input)).toEqual(inspection);
  expect(await balance(b)).toEqual(before);
  expect((await detail(result)).stock.unpack[0]!.remaining).toBe(2);
  await expect(
    run({ ...input, commandId: randomUUID(), expectedVersion: 4 }),
  ).rejects.toMatchObject({ code: 'UNPACK_REMAINING_CONFLICT' });
});
it('atomic rollback after reservations leaves no order/allocation/custody, with preserved immutable histories', async () => {
  const { fields } = await stock(),
    before = await counts();
  const fault = shipmentCommands(db.pool, {
    afterReceipt: async () => {
      throw Error('Injected failure after allocation');
    },
  });
  await expect(
    fault.execute(f.admin.token, envelope(confirm(fields)) as ShipmentCommand),
  ).rejects.toThrow('Injected failure');
  expect(await counts()).toEqual(before);
  const result = await run(confirm(fields));
  await expect(
    db.pool.query(
      'UPDATE shipments.stock_allocation SET revision=revision+1 WHERE company_id=$1 AND shipment_id=$2',
      [f.company, result.shipmentId],
    ),
  ).rejects.toThrow('SHIPMENT_HISTORY_IMMUTABLE');
});
it('variant deactivated after selection rejects the complete command on the server', async () => {
  const { b, fields } = await stock(),
    before = await counts();
  await db.pool.query(
    'UPDATE inventory.product_variant SET active=false,version=version+1 WHERE company_id=$1 AND id=$2',
    [f.company, b],
  );
  await expect(run(confirm(fields))).rejects.toMatchObject({ code: 'STOCK_VARIANT_UNAVAILABLE' });
  expect(await counts()).toEqual(before);
});
it('service correction shares custody, requires actual external intake and never repeats its receipt', async () => {
  const { b, fields } = await stock();
  const result = await run(confirm(fields));
  const external: ShipmentFields = {
    ...fields,
    service: 'brand_packed',
    lines: fields.lines.map(({ variantId: _variantId, ...line }) => line),
  };
  const correction = (next: ShipmentFields, expectedVersion: number, actual = false) => ({
    type: 'shipment.correct',
    shipmentId: result.shipmentId,
    expectedVersion,
    fields: next,
    reason: 'Actual service change',
    actualAtCorrectedBranch: actual,
    duplicateAcknowledged: false,
  });
  const before = await counts();
  await expect(run(correction(external, 1))).rejects.toMatchObject({
    code: 'ACTUAL_BRANCH_ASSERTION_REQUIRED',
  });
  expect(await counts()).toEqual(before);
  await run(correction(external, 1, true));
  expect(await balance(b)).toEqual({ sound: 5, unavailable: 0, reserved: 0 });
  expect((await counts()).receipts - before.receipts).toBe(1);
  await run(correction(fields, 2));
  expect(await balance(b)).toEqual({ sound: 5, unavailable: 0, reserved: 2 });
  await run({ type: 'shipment.prepare', shipmentId: result.shipmentId, expectedVersion: 3 });
  await run(correction(external, 4, true));
  expect(await balance(b)).toEqual({ sound: 3, unavailable: 2, reserved: 0 });
  const after = await counts();
  expect(after.receipts - before.receipts).toBe(1);
  expect(after.custody).toBe(before.custody);
  expect(after.inbound).toBe(before.inbound);
  expect(after.money).toBe(before.money);
  expect((await detail(result)).stock.unpack.find((p) => p.variantId === b)?.remaining).toBe(2);
});
