import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import {
  migrate,
  readMigrations,
  migrationStatus,
  claimParcel,
  transaction,
} from '@shahn/database';
import type {
  DispatchResult,
  CommercialCommand,
  InventoryCommand,
  InventoryResult,
  ShipmentResult,
} from '@shahn/contracts';
import type { SourceEnvelope, SenderEvent } from '@shahn/contracts/tawsel';
import { dispatchFixture, acceptedResult } from './fixtures.js';
import { SourceCommandWorker } from '../../../apps/api/src/modules/integration/source-command.service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { JournalPosting } from '../../../apps/api/src/modules/kernel/journals.js';
import { WalletService } from '../../../apps/api/src/modules/kernel/wallet.js';
import { cairoDate } from '@shahn/domain';
import { createApplication } from '../../../apps/api/src/app.js';
import { applyOneDispatchEvent } from '../../../apps/api/src/modules/dispatch/acceptance.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { inventoryCommands } from '../../../apps/api/src/modules/inventory/service.js';
import { readProducts } from '@shahn/database';
import { shipmentFields } from '../../support/shipments.js';
import { dispatchCommands } from '../../../apps/api/src/modules/dispatch/dispatch.service.js';
import { signatureFor } from '../../../apps/api/src/modules/integration/signature-verifier.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof dispatchFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 15));
  await migrate(db.pool);
  f = await dispatchFixture(db.pool);
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
const counts = async () =>
  (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM dispatch.intent) AS intents,(SELECT count(*)::int FROM dispatch.custody_effect) AS custody,(SELECT count(*)::int FROM integration.source_command) AS actions,(SELECT count(*)::int FROM kernel.shipping_cover) AS cover,(SELECT count(*)::int FROM audit_entry) AS audit`,
    )
  ).rows[0];
const receive = async (id: string) => {
  const d = await f.detail(id);
  return f.commands.execute(
    f.admin.token,
    f.command({
      type: 'dispatch.receive',
      intentId: id,
      expectedVersion: d.version,
      receiptAsserted: true,
    }),
  );
};
it('migrates additively with native prices and explicit unsynchronized identity', async () => {
  expect((await migrationStatus(db.pool)).state).toBe('current');
  const s = await f.create();
  const d = await f.read(s.shipmentId);
  expect(d?.price.recipientDueMinor).toBe('30000');
  expect(d?.sourceState).toBe('local');
  expect(d?.handedOver).toBe(false);
});
it('separates snapshot, preparation, actual handover, and planning failure', async () => {
  const s = await f.create(),
    d = await f.prepared([s]);
  expect(d.state).toBe('prepared');
  expect((await f.read(s.shipmentId))?.handedOver).toBe(false);
  const a = await receive(d.id);
  expect(a.status).toBe(202);
  expect((await f.detail(d.id)).state).toBe('receiving');
  await f.completeNext({ planningFailed: true });
  const accepted = await f.detail(d.id);
  expect(accepted.state).toBe('accepted');
  expect(accepted.items[0]).toMatchObject({
    recipientDueMinor: '30000',
    tariffMinor: '5000',
    planningStatus: 'failed',
  });
  expect((await f.read(s.shipmentId))?.handedOver).toBe(true);
});
it.each([
  { shippingPayer: 'recipient', goods: '0', shipping: '5000', total: '5000' },
  { shippingPayer: 'brand', goods: '0', shipping: '0', total: '0' },
] as const)('keeps explicit prepaid goods and $shippingPayer shipping', async (x) => {
  const s = await f.create({
    shippingPayer: x.shippingPayer,
    lines: [
      {
        id: randomUUID(),
        description: 'مدفوع للبراند',
        quantity: 1,
        unitDue: { currency: 'EGP', amountMinor: x.goods },
      },
    ],
  });
  const r = (await f.commands.execute(f.admin.token, f.prepareInput([s]))).body as DispatchResult;
  await f.completeNext();
  await f.completeNext();
  const row = (
    await db.pool.query('SELECT snapshot FROM dispatch.item WHERE intent_id=$1', [r.intentId])
  ).rows[0].snapshot;
  expect(row.shippingDue.amountMinor).toBe(Number(x.shipping));
  expect(row.totalDue.amountMinor).toBe(Number(x.total));
});
it('native duplicate returns one intent; changed payload under the same ID conflicts', async () => {
  const s = await f.create(),
    input = f.prepareInput([s]),
    a = await f.commands.execute(f.admin.token, input),
    before = await counts();
  expect(await f.commands.execute(f.admin.token, input)).toEqual(a);
  expect(await counts()).toEqual(before);
  await expect(
    f.commands.execute(f.admin.token, { ...input, driverId: randomUUID() } as typeof input),
  ).rejects.toThrow('COMMAND_PAYLOAD_CONFLICT');
  await f.completeNext();
  await f.completeNext();
});
it('blocks stale version, incomplete packing, competing claim, and disabled driver', async () => {
  const s = await f.create({ service: 'company_packed' });
  await expect(f.commands.execute(f.admin.token, f.prepareInput([s]))).rejects.toThrow(
    'PREPARATION_REQUIRED',
  );
  const ready = await f.create();
  await expect(
    f.commands.execute(f.admin.token, f.prepareInput([{ ...ready, version: 99 }])),
  ).rejects.toThrow('REVISION_CONFLICT');
  await transaction(db.pool, (c) =>
    claimParcel(c, f.company, ready.shipmentId, 'transfer', randomUUID()),
  );
  await expect(f.commands.execute(f.admin.token, f.prepareInput([ready]))).rejects.toThrow(
    'COMPETING_PARCEL_CLAIM',
  );
  await db.pool.query('UPDATE employees.operational_driver SET active=false WHERE id=$1', [
    f.driver,
  ]);
  await expect(
    f.commands.execute(f.admin.token, f.prepareInput([await f.create()])),
  ).rejects.toThrow('DRIVER_NOT_READY');
  await db.pool.query('UPDATE employees.operational_driver SET active=true WHERE id=$1', [
    f.driver,
  ]);
});
it('competing independent parcel dispatch and transfer transactions have one winner', async () => {
  const s = await f.create();
  const transfer = transaction(db.pool, async (c) => {
    await c.query('SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE', [
      f.company,
      s.shipmentId,
    ]);
    return claimParcel(c, f.company, s.shipmentId, 'transfer', randomUUID());
  });
  const out = await Promise.allSettled([
    f.commands.execute(f.admin.token, f.prepareInput([s])),
    transfer,
  ]);
  const dispatched = out[0]!.status === 'fulfilled',
    transferred = out[1]!.status === 'fulfilled' && out[1]!.value === true;
  expect(Number(dispatched) + Number(transferred)).toBe(1);
  if (dispatched) {
    await f.completeNext();
    await f.completeNext();
  }
});
it('reserves eligible 60 from 100, excludes pending 500 and rejects competing payout 60', async () => {
  await f.credit(f.seed.brand);
  const s = await f.create({ areaId: f.seed.dokki, shippingPayer: 'brand' }),
    d = await f.prepared([s]);
  await receive(d.id);
  expect(await f.wallet()).toMatchObject({
    eligible: '10000',
    pending: '50000',
    cover: '6000',
    eligibleToPay: '4000',
  });
  await expect(
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'dispatch', async (u) => {
      await new JournalPosting(u).lock('brand', f.seed.brand);
      await new WalletService(u, f.seed.brand).requirePayout('6000');
    }),
  ).rejects.toThrow('INSUFFICIENT_ELIGIBLE_CREDIT');
  await f.completeNext();
  expect((await f.detail(d.id)).items[0]?.coverMinor).toBe('6000');
});
it('rollback after an injected outbox insert failure leaves no cover, intent audit or stock effect', async () => {
  const d = await f.prepared([await f.create()]),
    before = await counts();
  await db.pool.query(
    `CREATE FUNCTION dispatch.test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'P12_INJECTED_OUTBOX'; END $$; CREATE TRIGGER p12_failure BEFORE INSERT ON integration.source_command FOR EACH ROW EXECUTE FUNCTION dispatch.test_fail()`,
  );
  try {
    await expect(receive(d.id)).rejects.toThrow('P12_INJECTED_OUTBOX');
    expect(await counts()).toEqual(before);
    expect((await f.detail(d.id)).state).toBe('prepared');
  } finally {
    await db.pool.query(
      'DROP TRIGGER p12_failure ON integration.source_command; DROP FUNCTION dispatch.test_fail()',
    );
  }
});
it('unknown handover keeps immutable action, cover and unavailable goods; late lease cannot apply', async () => {
  const s = await f.create(),
    d = await f.prepared([s]);
  await receive(d.id);
  const old = (await f.worker.claim())!,
    request = old.request_body;
  await db.pool.query(
    `UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1`,
    [old.id],
  );
  const worker = new SourceCommandWorker(db.pool, f.runtime),
    next = (await worker.claim())!;
  expect(next.action_id).toBe(old.action_id);
  expect(next.request_body).toBe(request);
  expect(
    await f.worker.complete(old, {
      result: acceptedResult(JSON.parse(request) as SourceEnvelope),
      status: 200,
    }),
  ).toBe(false);
  expect((await f.detail(d.id)).state).toBe('receiving');
  await expect(
    shipmentCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      type: 'shipment.cancel',
      shipmentId: s.shipmentId,
      expectedVersion: (await f.read(s.shipmentId))!.version,
      reason: 'Timeout is not return',
    }),
  ).rejects.toThrow('DISPATCH_OR_TRANSFER_PENDING');
  await worker.complete(next, {
    failure: new (
      await import('../../../apps/api/src/modules/integration/tawsel-client.js')
    ).SourceFailure('unknown', 'REMOTE_RESULT_UNKNOWN'),
  });
  await db.pool.query('UPDATE work_item SET available_at=clock_timestamp() WHERE id=$1', [next.id]);
  await f.completeNext();
  expect((await f.detail(d.id)).state).toBe('accepted');
});
it('accepted result then signed event echo creates one local custody effect', async () => {
  const s = await f.create(),
    d = await f.prepared([s]);
  await receive(d.id);
  const lease = (await f.completeNext())!,
    task = f.tasks.get('shipment:' + s.shipmentId)!,
    before = await counts();
  const event: SenderEvent = {
    schemaVersion: '1.0.0',
    payloadVersion: '1.0.0',
    eventId: randomUUID(),
    eventType: 'assignment.received',
    eventKind: 'transition',
    tenantId: f.connection.tenantId,
    recipientIntegrationId: f.connection.integrationId,
    aggregate: { type: 'task', id: task.taskId, recipientSequence: 1 },
    resources: { taskId: task.taskId, dispatchCycleId: task.dispatchCycleId },
    versions: { sourceRevision: task.sourceRevision },
    correlation: { actionId: lease.action_id },
    committedAt: new Date().toISOString(),
    payload: { actionId: lease.action_id, task },
  };
  const raw = Buffer.from(JSON.stringify(event)),
    timestamp = String(Date.now());
  const response = await fetch(origin + '/api/v1/consumer/events', {
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
  expect(response.status).toBe(200);
  expect(await applyOneDispatchEvent(db.pool)).toBe(true);
  expect((await counts()).custody).toBe(before.custody);
  expect((await f.detail(d.id)).state).toBe('accepted');
});
it('retains atomic capacity rejection for a two-parcel batch without local custody', async () => {
  const a = await f.create(),
    b = await f.create(),
    d = await f.prepared([a, b]),
    before = await counts();
  await receive(d.id);
  await f.completeNext({ reject: 'capacity_exceeded' });
  expect((await f.detail(d.id)).state).toBe('rejected');
  expect((await counts()).custody).toBe(before.custody);
  expect((await f.read(a.shipmentId))?.handedOver).toBe(false);
  expect((await f.read(b.shipmentId))?.handedOver).toBe(false);
});
it('native HTTP enforces current grants, scope, CSRF and closed responses', async () => {
  const get = (path: string, token = f.admin.token) =>
    fetch(origin + '/api/v1/dispatch' + path, { headers: { cookie: 'erp_session=' + token } });
  const r = await get('?companyId=' + f.company);
  expect(r.status).toBe(200);
  expect(JSON.stringify(await r.json())).not.toContain(f.connection.serviceBearer);
  expect((await get('?companyId=' + f.company, f.staffA.token)).status).toBe(403);
  expect((await get('?companyId=' + f.other)).status).toBe(403);
  expect(
    (
      await fetch(origin + '/api/v1/dispatch/commands', {
        method: 'POST',
        headers: { cookie: 'erp_session=' + f.admin.token, 'Content-Type': 'application/json' },
        body: '{}',
      })
    ).status,
  ).toBe(403);
  const d = await f.prepared([await f.create()]);
  await db.pool.query(
    `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='dispatch'`,
    [f.company, f.adminRole],
  );
  expect((await get('/' + d.id + '?companyId=' + f.company)).status).toBe(403);
  await db.pool.query(`INSERT INTO access.role_grant VALUES($1,$2,'dispatch')`, [
    f.company,
    f.adminRole,
  ]);
});
it('persists exact prices, source bytes and quantities after PostgreSQL restart', async () => {
  const before = (
    await db.pool.query('SELECT snapshot,price FROM dispatch.item ORDER BY intent_id,shipment_id')
  ).rows;
  await db.stop();
  await db.start();
  expect(
    (await db.pool.query('SELECT snapshot,price FROM dispatch.item ORDER BY intent_id,shipment_id'))
      .rows,
  ).toEqual(before);
  expect((await f.wallet()).cover).toBe('6000');
});
const newBrand = async (extra: object = {}) =>
  (
    await commercialCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'brand.create',
      fields: { ...f.seed.brandFields, name: 'P12 ' + randomUUID(), ...extra },
    } as CommercialCommand)
  ).body as { entityId: string };
it('pending 500 alone cannot reserve 60, while allow-negative creates no payout cash', async () => {
  const brand = (await newBrand()).entityId;
  await f.credit(brand, '0', '50000');
  const d = await f.prepared([
    await f.create({ brandId: brand, areaId: f.seed.dokki, shippingPayer: 'brand' }),
  ]);
  const before = (await counts()).cover;
  await expect(receive(d.id)).rejects.toThrow('INSUFFICIENT_SHIPPING_COVER');
  expect((await counts()).cover).toBe(before);
  expect(await f.wallet(brand)).toMatchObject({ pending: '50000', eligibleToPay: '0' });
  const negative = (await newBrand({ allowNegativeBalance: true })).entityId,
    d2 = await f.prepared([await f.create({ brandId: negative, shippingPayer: 'brand' })]);
  await receive(d2.id);
  expect((await f.wallet(negative)).cover).toBe('0');
  await expect(
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'dispatch', async (u) => {
      await new JournalPosting(u).lock('brand', negative);
      await new WalletService(u, negative).requirePayout('1');
    }),
  ).rejects.toThrow('INSUFFICIENT_ELIGIBLE_CREDIT');
  await f.completeNext();
});
it('independent cover and payout-allocation transactions cannot both spend 60 of eligible 100', async () => {
  const brand = (await newBrand()).entityId;
  await f.credit(brand);
  const d = await f.prepared([
    await f.create({ brandId: brand, areaId: f.seed.dokki, shippingPayer: 'brand' }),
  ]);
  const payout = () =>
    UnitOfWork.run(db.pool, f.admin.token, f.company, 'dispatch', async (u) => {
      const p = new JournalPosting(u),
        s = await p.source(
          {
            system: 'p12-fixture',
            identity: randomUUID(),
            kind: 'payout-contention',
            revision: '1',
          },
          { amount: '6000' },
        );
      await p.lock('brand', brand);
      const w = new WalletService(u, brand);
      await w.requirePayout('6000');
      const cr = (
        await u.client.query('SELECT id FROM command_record WHERE company_id=$1 LIMIT 1', [
          f.company,
        ])
      ).rows[0].id;
      const e = await p.append(s.id, cr, [
        {
          family: 'brand',
          kind: 'payout',
          subjectId: brand,
          amountMinor: '-6000',
          branchId: f.a,
          effectiveDate: cairoDate(new Date()),
          supersedesId: null,
          reason: 'P12 primitive contention test; no physical payout',
        },
      ]);
      await w.payout(e.ids[0]!, '6000');
    });
  const outcomes = await Promise.allSettled([receive(d.id), payout()]);
  expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect((await f.wallet(brand)).eligibleToPay).toBe('4000');
  if (outcomes[0]!.status === 'fulfilled') await f.completeNext();
});
it('stored-stock receipt, reservation, packing and accepted handover consume the same physical units once', async () => {
  const brand = (
    await newBrand({
      services: ['stored_stock'],
      defaultService: 'stored_stock',
      storage: {
        monthlyFeeMinor: '10000',
        branchId: f.a,
        startDate: '2026-10-01',
        anniversaryDay: 1,
        active: true,
        stopDate: null,
      },
    })
  ).entityId;
  const inv = async (v: object) =>
    (
      await inventoryCommands(db.pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        ...v,
      } as InventoryCommand)
    ).body as InventoryResult;
  const product = await inv({
      type: 'product.create',
      brandId: brand,
      fields: {
        name: 'P12 physical stock',
        active: true,
        variants: [{ name: 'Blue', options: '', active: true }],
      },
    }),
    variant = (await readProducts(db.pool, f.company, brand)).find(
      (x) => x.id === product.entityId,
    )!.variants[0]!.id;
  await inv({
    type: 'stock.receive',
    brandId: brand,
    branchId: f.a,
    actualDate: cairoDate(new Date()),
    lines: [{ variantId: variant, quantity: 3, condition: 'sound' }],
  });
  const s = (
    await shipmentCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'shipment.confirm',
      fields: shipmentFields(
        { brandId: brand, branchId: f.a, governorateId: f.seed.cairo },
        {
          service: 'stored_stock',
          lines: [
            {
              id: randomUUID(),
              variantId: variant,
              description: 'Blue',
              quantity: 2,
              unitDue: { currency: 'EGP', amountMinor: '12500' },
            },
          ],
        },
      ),
      actualReceipt: false,
      duplicateAcknowledged: false,
      expectedPolicyVersion: 1,
      expectedTariffVersion: 1,
      expectedTariffId: f.seed.base,
    })
  ).body as ShipmentResult;
  const packed = (
    await shipmentCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'shipment.prepare',
      shipmentId: s.shipmentId,
      expectedVersion: s.version,
    })
  ).body as ShipmentResult;
  const d = await f.prepared([packed]);
  await receive(d.id);
  expect(
    (
      await db.pool.query(
        'SELECT sound_on_hand::text FROM inventory.stock_position WHERE variant_id=$1',
        [variant],
      )
    ).rows[0].sound_on_hand,
  ).toBe('3');
  await f.completeNext();
  expect(
    (
      await db.pool.query(
        'SELECT sound_on_hand::text FROM inventory.stock_position WHERE variant_id=$1',
        [variant],
      )
    ).rows[0].sound_on_hand,
  ).toBe('1');
  expect((await f.read(s.shipmentId))?.stock.allocations.every((x) => !x.active)).toBe(true);
  expect(
    (
      await db.pool.query(
        `SELECT sum(sound_delta)::text AS n FROM inventory.stock_movement WHERE variant_id=$1`,
        [variant],
      )
    ).rows[0].n,
  ).toBe('1');
});
it('approved typed waiver journey preserves goods and commission without brand shipping cover', async () => {
  const s = await f.create(),
    waiver = {
      incidentId: randomUUID(),
      approvalId: randomUUID(),
      originalShipmentId: randomUUID(),
      replacementShipmentId: s.shipmentId,
    };
  const commands = dispatchCommands(db.pool, {
      approvedWaivers: new Map([[s.shipmentId, waiver]]),
    }),
    r = (await commands.execute(f.admin.token, f.prepareInput([s]))).body as DispatchResult;
  await f.completeNext();
  await f.completeNext();
  await receive(r.intentId);
  await f.completeNext();
  const d = await f.detail(r.intentId);
  expect(d.items[0]).toMatchObject({
    recipientDueMinor: '25000',
    tariffMinor: '5000',
    waiverMinor: '5000',
    brandShippingMinor: '0',
    coverMinor: '0',
  });
  expect((await f.read(s.shipmentId))?.price.recipientDueMinor).toBe('30000');
});
it('definite rejection requires reread and a new native intent; old action JSON stays unchanged', async () => {
  const brand = (await newBrand()).entityId;
  await f.credit(brand);
  const d = await f.prepared([await f.create({ brandId: brand, shippingPayer: 'brand' })]);
  await receive(d.id);
  const old = (await f.completeNext({ reject: 'stale_revision' }))!,
    before = old.request_body,
    now = await f.detail(d.id),
    input = f.command({ type: 'dispatch.review', intentId: d.id, expectedVersion: now.version });
  const task = f.tasks.get(
    (
      await db.pool.query('SELECT external_id FROM dispatch.cycle WHERE current_intent_id=$1', [
        d.id,
      ])
    ).rows[0].external_id,
  )!;
  await dispatchCommands(db.pool, {
    review: { commandId: input.commandId, tasks: [task] },
  }).execute(f.admin.token, input);
  await receive(d.id);
  await f.completeNext();
  expect((await f.detail(d.id)).state).toBe('accepted');
  expect(
    (
      await db.pool.query(
        'SELECT request_body FROM integration.source_command WHERE action_id=$1',
        [old.action_id],
      )
    ).rows[0].request_body,
  ).toBe(before);
  expect((await f.wallet(brand)).cover).toBe('5000');
});
it('authorized predeparture withdrawal releases unused cover once and retains original cycle for another preparation', async () => {
  const brand = (await newBrand()).entityId;
  await f.credit(brand);
  const s = await f.create({ brandId: brand, shippingPayer: 'brand' }),
    d = await f.prepared([s]);
  await receive(d.id);
  await f.completeNext({ reject: 'capacity_exceeded' });
  const r = await f.detail(d.id);
  await f.commands.execute(
    f.admin.token,
    f.command({
      type: 'dispatch.withdraw',
      intentId: r.id,
      expectedVersion: r.version,
      actualAtBranch: true,
    }),
  );
  await f.completeNext();
  expect((await f.detail(d.id)).state).toBe('withdrawn');
  expect((await f.wallet(brand)).cover).toBe('0');
  const current = (await f.read(s.shipmentId))!,
    newInput = f.prepareInput([{ ...s, version: current.version }]);
  const next = (await f.commands.execute(f.admin.token, newInput)).body as DispatchResult;
  await f.completeNext();
  const newDetail = await f.detail(next.intentId);
  expect(newDetail.state).toBe('prepared');
  expect(newDetail.items[0]?.sourceCycleId).toBe(r.items[0]?.sourceCycleId);
});
