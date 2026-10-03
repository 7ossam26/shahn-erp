import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, migrationStatus, readShipment } from '@shahn/database';
import type {
  ShipmentCommand,
  ShipmentResult,
  ShipmentFields,
  ParcelList,
  ShipmentPreview,
} from '@shahn/contracts';
import {
  shipmentCommands,
  shipmentDetail,
  listShipmentParcels,
  defaultShipmentFilter,
  sourceReadyShipment,
} from '../../apps/api/src/modules/shipments/service.js';
import { seedCommercial } from '../../apps/api/src/modules/brands/seed.js';
import { commercialCommands } from '../../apps/api/src/modules/brands/service.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
import { compactCommandResults } from '../../apps/api/src/modules/kernel/commands.js';
import { createApplication } from '../../apps/api/src/app.js';
import { accessFixture } from '../support/access.js';
import { shipmentFields } from '../support/shipments.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof accessFixture>>,
  seed: Awaited<ReturnType<typeof seedCommercial>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string,
  service: ReturnType<typeof shipmentCommands>;
const command = (input: object): ShipmentCommand =>
  ({
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    ...input,
  }) as ShipmentCommand;
const fields = (extra: Partial<ShipmentFields> = {}) =>
  shipmentFields({ branchId: f.a, brandId: seed.brand, governorateId: seed.cairo }, extra);
const confirm = (extra: Partial<ShipmentFields> = {}, more: object = {}) =>
  command({
    type: 'shipment.confirm',
    fields: fields(extra),
    actualReceipt: true,
    duplicateAcknowledged: false,
    expectedPolicyVersion: 1,
    expectedTariffVersion: 1,
    expectedTariffId: seed.base,
    ...more,
  });
const run = async (input: ShipmentCommand, token = f.admin.token) =>
  (await service.execute(token, input)).body as ShipmentResult;
const detail = (r: ShipmentResult, token = f.admin.token) =>
  UnitOfWork.run(db.pool, token, f.company, 'intake', (uow) => shipmentDetail(uow, r.shipmentId));
const counts = async () =>
  (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM shipments.shipment) AS shipments,(SELECT count(*)::int FROM shipments.receipt) AS receipts,(SELECT count(*)::int FROM shipments.parcel_custody) AS custody,(SELECT count(*)::int FROM shipments.event) AS events,(SELECT count(*)::int FROM inventory.stock_receipt) AS stock_receipts,(SELECT count(*)::int FROM kernel.journal_effect) AS journal`,
    )
  ).rows[0];
const http = async (path: string, body?: unknown, user = f.admin) => {
  const response = await fetch(origin + '/api/v1' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      cookie: 'erp_session=' + user.token,
      ...(body
        ? {
            'Content-Type': 'application/json',
            origin: f.config.origin,
            'x-csrf-token': user.csrfToken,
          }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
};
beforeAll(async () => {
  await mkdir('docs/verification/P06', { recursive: true });
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 9));
  f = await accessFixture(db.pool);
  seed = await seedCommercial(db.pool, f.admin.token, f.company, f.a, 'test');
  const before = await db.pool.query('SELECT count(*)::int AS n FROM kernel.journal_effect');
  await migrate(db.pool);
  expect((await migrationStatus(db.pool)).state).toBe('current');
  expect((await counts()).shipments).toBe(0);
  expect((await counts()).journal).toBe(before.rows[0].n);
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
  await writeFile('docs/verification/P06/live-db-status.txt', status.stdout);
  service = shipmentCommands(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  try {
    if (db && f)
      await writeFile(
        `docs/verification/P06/database-results-${Date.now()}.json`,
        JSON.stringify(
          {
            company: f.company,
            branchA: f.a,
            branchB: f.b,
            brand: seed.brand,
            postgres: (await db.pool.query('SHOW server_version')).rows[0],
            counts: await counts(),
            shipments: (
              await db.pool.query(
                'SELECT id,reference,version,state,preparation FROM shipments.shipment ORDER BY reference',
              )
            ).rows,
          },
          null,
          2,
        ),
      );
  } finally {
    await app?.close();
    await db?.dispose();
  }
});
describe('P06 real PostgreSQL atomic shipment confirmation and authenticated HTTP', () => {
  it('commits ready 300 and packed 305 as distinct numeric references without loose stock or earned money', async () => {
    const before = await counts(),
      ready = await http('/shipments', confirm()),
      packed = await run(confirm({ service: 'company_packed' }));
    expect(ready.status).toBe(200);
    const d = await detail(ready.body),
      p = await detail(packed);
    expect(d.price.recipientDueMinor).toBe('30000');
    expect(d.preparation).toBe('not_required');
    expect(p.price.recipientDueMinor).toBe('30500');
    expect(p.preparation).toBe('awaiting_preparation');
    expect(d.reference).toMatch(/^\d+$/);
    expect(d.reference).not.toBe(p.reference);
    expect(d.phoneCanonical).toBe('01012345678');
    expect(d.fields.phoneDisplay).toBe('٠١٠ ١٢٣٤ ٥٦٧٨');
    const after = await counts();
    expect(after.receipts - before.receipts).toBe(2);
    expect(after.custody - before.custody).toBe(2);
    expect(after.stock_receipts).toBe(before.stock_receipts);
    expect(after.journal).toBe(before.journal);
  });
  it('blocks missing tariff with zero business effects and permits explicit zero', async () => {
    const before = await counts(),
      missing = await http('/shipments', confirm({ governorateId: seed.giza }));
    expect(missing.status).toBe(409);
    expect(missing.body.fieldErrors.governorateId).toBe('PRICE_MISSING');
    expect(await counts()).toEqual(before);
    const tariff = (
      await commercialCommands(db.pool).execute(f.admin.token, {
        schemaVersion: 1,
        commandId: randomUUID(),
        companyId: f.company,
        type: 'tariff.create',
        fields: {
          tierId: seed.tier,
          governorateId: seed.giza,
          areaId: null,
          amountMinor: '0',
          active: true,
        },
      })
    ).body as { entityId: string };
    const result = await run(
      confirm({ governorateId: seed.giza }, { expectedTariffId: tariff.entityId }),
    );
    expect((await detail(result)).price.tariffMinor).toBe('0');
  });
  it('rolls back shipment, receipt, custody, queue, audit and successful command after injected receipt failure', async () => {
    const before = await counts(),
      audit = (await db.pool.query('SELECT count(*)::int AS n FROM audit_entry')).rows[0].n,
      input = confirm({ service: 'company_packed' });
    await expect(
      shipmentCommands(db.pool, {
        afterReceipt: async () => {
          throw Error('INJECTED_AFTER_RECEIPT');
        },
      }).execute(f.admin.token, input),
    ).rejects.toThrow('INJECTED_AFTER_RECEIPT');
    expect(await counts()).toEqual(before);
    expect((await db.pool.query('SELECT count(*)::int AS n FROM audit_entry')).rows[0].n).toBe(
      audit,
    );
    expect(
      (await db.pool.query('SELECT id FROM command_record WHERE command_id=$1', [input.commandId]))
        .rowCount,
    ).toBe(0);
  });
  it('creates concurrent legitimate references and replays concurrent same-command only once', async () => {
    const before = await counts(),
      input = confirm(),
      results = await Promise.all([run(confirm()), run(confirm()), run(input), run(input)]);
    expect(new Set(results.map((r) => r.reference)).size).toBe(3);
    expect(results[2]).toEqual(results[3]);
    expect((await counts()).receipts - before.receipts).toBe(3);
    const conflict = await http('/shipments', {
      ...input,
      fields: {
        ...(input.type === 'shipment.confirm' ? input.fields : fields()),
        recipientName: 'تغيير الحمولة',
      },
    });
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('COMMAND_PAYLOAD_CONFLICT');
  });
  it('warns repeated brand reference, requires deliberate acknowledgement and keeps order identities independent', async () => {
    const input = confirm({ brandReference: 'BR-DUP' }),
      first = await run(input),
      before = await counts();
    const second = await http('/shipments', confirm({ brandReference: 'BR-DUP' }));
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('DUPLICATE_BRAND_REFERENCE');
    expect(await counts()).toEqual(before);
    const next = await run(confirm({ brandReference: 'BR-DUP' }, { duplicateAcknowledged: true }));
    expect(first.reference).not.toBe(next.reference);
    expect((await run(input)).reference).toBe(first.reference);
  });
  it('prepaid goods and prepaid-all retain tariff without goods credit or fictitious receipt', async () => {
    const before = await counts(),
      lines = fields().lines.map((l) => ({
        ...l,
        unitDue: { currency: 'EGP' as const, amountMinor: '0' },
      })),
      shipping = await detail(await run(confirm({ lines }))),
      paid = await detail(await run(confirm({ lines, shippingPayer: 'brand' })));
    expect(shipping.price.recipientDueMinor).toBe('5000');
    expect(paid.price.recipientDueMinor).toBe('0');
    expect(paid.price.brandShippingMinor).toBe('5000');
    expect(paid.price.tariffMinor).toBe('5000');
    expect((await counts()).journal).toBe(before.journal);
  });
  it('stores exact partial shipping remainder and exposes immutable native source-ready revisions', async () => {
    const result = await run(
        confirm({
          shippingPayer: 'shared',
          recipientShippingDue: { currency: 'EGP', amountMinor: '2000' },
        }),
      ),
      d = await detail(result);
    expect(d.price.recipientDueMinor).toBe('27000');
    expect(d.price.brandShippingMinor).toBe('3000');
    const native = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'intake', (uow) =>
      sourceReadyShipment(uow, result.shipmentId, 1),
    );
    expect(Object.isFrozen(native.fields.lines[0])).toBe(true);
    expect(native.fields.lines[0]?.id).toBe(d.fields.lines[0]?.id);
    expect(native.phoneCanonical).toBe('01012345678');
    expect(d.sourceState).toBe('local');
    expect(
      (
        await http(
          '/shipments',
          confirm({
            shippingPayer: 'shared',
            recipientShippingDue: { currency: 'EGP', amountMinor: '5001' },
          }),
        )
      ).body.code,
    ).toBe('SHIPPING_DUE_EXCEEDS_TARIFF');
    const ready = await run(confirm()),
      queue = await http(
        `/preparation?companyId=${f.company}&branches=${f.a}&search=${ready.reference}`,
      );
    expect(queue.body.total).toBe(0);
  });
  it('completes packing once; replay does not duplicate completion, custody or fee', async () => {
    const packed = await run(confirm({ service: 'company_packed' })),
      input = command({
        type: 'shipment.prepare',
        shipmentId: packed.shipmentId,
        expectedVersion: 1,
      }),
      before = await counts(),
      result = await run(input);
    expect(await run(input)).toEqual(result);
    expect((await detail(result)).preparation).toBe('complete');
    expect((await counts()).events - before.events).toBe(1);
    expect((await counts()).receipts).toBe(before.receipts);
    expect((await counts()).journal).toBe(before.journal);
    const second = await http(
      `/shipments/${packed.shipmentId}/preparation/complete`,
      command({ type: 'shipment.prepare', shipmentId: packed.shipmentId, expectedVersion: 2 }),
    );
    expect(second.body.code).toBe('PREPARATION_NOT_WAITING');
  });
  it('cancellation retains prepared external custody; stale cancellation/completion races have one winner', async () => {
    for (const reverse of [false, true]) {
      const r = await run(confirm({ service: 'company_packed' })),
        cancel = command({
          type: 'shipment.cancel',
          shipmentId: r.shipmentId,
          expectedVersion: 1,
          reason: 'البراند طلب الإلغاء',
        }),
        prepare = command({
          type: 'shipment.prepare',
          shipmentId: r.shipmentId,
          expectedVersion: 1,
        }),
        results = await Promise.allSettled(
          (reverse ? [prepare, cancel] : [cancel, prepare]).map((c) => run(c)),
        );
      expect(results.filter((v) => v.status === 'fulfilled')).toHaveLength(1);
      expect((await detail(r)).version).toBe(2);
      expect(
        (
          await db.pool.query(
            'SELECT branch_id FROM shipments.parcel_custody WHERE shipment_id=$1',
            [r.shipmentId],
          )
        ).rows[0].branch_id,
      ).toBe(f.a);
    }
    const r = await run(confirm({ service: 'company_packed' }));
    await run(command({ type: 'shipment.prepare', shipmentId: r.shipmentId, expectedVersion: 1 }));
    await run(
      command({
        type: 'shipment.cancel',
        shipmentId: r.shipmentId,
        expectedVersion: 2,
        reason: 'إلغاء بعد التجهيز',
      }),
    );
    expect((await detail(r)).state).toBe('cancelled');
    expect(
      (
        await db.pool.query('SELECT * FROM shipments.parcel_custody WHERE shipment_id=$1', [
          r.shipmentId,
        ])
      ).rowCount,
    ).toBe(1);
  });
  it('corrects branch only on actual assertion, with immutable original receipt and reviewed preparation effects', async () => {
    const r = await run(confirm()),
      d = await detail(r),
      newFields = { ...d.fields, branchId: f.b, service: 'company_packed' as const },
      request = {
        companyId: f.company,
        shipmentId: r.shipmentId,
        expectedVersion: 1,
        fields: newFields,
        actualAtCorrectedBranch: false,
      };
    const rejected = await http(`/shipments/${r.shipmentId}/corrections/preview`, request);
    expect(rejected.body.code).toBe('ACTUAL_BRANCH_ASSERTION_REQUIRED');
    const before = await counts();
    const preview = await http(`/shipments/${r.shipmentId}/corrections/preview`, {
      ...request,
      actualAtCorrectedBranch: true,
    });
    expect(preview.status).toBe(200);
    expect((preview.body as ShipmentPreview).after.tariffMinor).toBe('5500');
    expect(await counts()).toEqual(before);
    const result = await run(
      command({
        type: 'shipment.correct',
        shipmentId: r.shipmentId,
        expectedVersion: 1,
        fields: newFields,
        actualAtCorrectedBranch: true,
        duplicateAcknowledged: false,
        reason: 'الاستلام سجل في فرع خاطئ',
      }),
    );
    expect((await detail(result)).fields.branchId).toBe(f.b);
    expect((await detail(result)).revisions).toHaveLength(2);
    expect(
      (
        await db.pool.query('SELECT branch_id FROM shipments.receipt WHERE shipment_id=$1', [
          r.shipmentId,
        ])
      ).rows[0].branch_id,
    ).toBe(f.a);
    expect(
      (
        await db.pool.query('SELECT branch_id FROM shipments.parcel_custody WHERE shipment_id=$1', [
          r.shipmentId,
        ])
      ).rows[0].branch_id,
    ).toBe(f.b);
  });
  it('rejects invalid phones/URLs/line quantities, unsafe money and unknown fields without business effects', async () => {
    const before = await counts();
    for (const extra of [
      { phoneDisplay: '123' },
      { phoneDisplay: '01012345678,01112345678' },
      { locationUrl: 'javascript:alert(1)' },
      { recipientName: 'a'.repeat(201) },
      { lines: [{ ...fields().lines[0]!, quantity: 1000001 }] },
      {
        lines: [
          {
            ...fields().lines[0]!,
            quantity: 2,
            unitDue: { currency: 'EGP' as const, amountMinor: '9007199254740991' },
          },
        ],
      },
    ]) {
      expect((await http('/shipments', confirm(extra))).status).toBe(400);
    }
    expect((await http('/shipments', { ...confirm(), unapproved: true })).status).toBe(400);
    expect(await counts()).toEqual(before);
  });
  it('enforces current assigned branches, company/module scope and CSRF for write/read/recovery', async () => {
    expect((await http('/shipments', confirm({ branchId: f.b }), f.staffA)).status).toBe(403);
    const r = await run(confirm());
    expect((await http(`/shipments/${r.reference}?companyId=${f.other}`)).status).toBe(403);
    await db.pool.query('DELETE FROM access.user_branch WHERE user_id=$1 AND branch_id=$2', [
      f.admin.id,
      f.a,
    ]);
    try {
      expect((await http(`/shipments/commands/${r.commandId}?companyId=${f.company}`)).status).toBe(
        403,
      );
      expect((await http(`/shipments/${r.reference}?companyId=${f.company}`)).status).toBe(403);
    } finally {
      await db.pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [
        f.company,
        f.admin.id,
        f.a,
      ]);
    }
    const noCsrf = await fetch(origin + '/api/v1/shipments', {
      method: 'POST',
      headers: {
        cookie: 'erp_session=' + f.admin.token,
        'Content-Type': 'application/json',
        origin: f.config.origin,
      },
      body: JSON.stringify(confirm()),
    });
    expect(noCsrf.status).toBe(403);
    await db.pool.query("INSERT INTO access.user_exception VALUES($1,$2,'intake','deny')", [
      f.company,
      f.staffA.id,
    ]);
    try {
      expect((await http('/shipments', confirm(), f.staffA)).status).toBe(403);
      expect(
        (await http(`/shipments/${r.reference}?companyId=${f.company}`, undefined, f.staffA))
          .status,
      ).toBe(200);
      expect(
        (
          await http(
            `/shipments/commands/${r.commandId}?companyId=${f.company}`,
            undefined,
            f.staffA,
          )
        ).status,
      ).toBe(403);
    } finally {
      await db.pool.query(
        "DELETE FROM access.user_exception WHERE user_id=$1 AND capability='intake'",
        [f.staffA.id],
      );
    }
  });
  it('recovers committed same reference after compaction and retains stale rejection authoritatively', async () => {
    const input = confirm(),
      r = await run(input);
    await db.pool.query('ALTER TABLE command_record DISABLE TRIGGER immutable_command');
    try {
      await db.pool.query(
        "UPDATE command_record SET retain_until=clock_timestamp()-interval '1 second' WHERE command_id=$1",
        [input.commandId],
      );
    } finally {
      await db.pool.query('ALTER TABLE command_record ENABLE TRIGGER immutable_command');
    }
    await compactCommandResults(db.pool);
    expect(
      (await http(`/shipments/commands/${input.commandId}?companyId=${f.company}`)).body,
    ).toEqual(r);
    expect(await run(input)).toEqual(r);
    const stale = command({
      type: 'shipment.cancel',
      shipmentId: r.shipmentId,
      expectedVersion: 2,
      reason: 'طلب قديم',
    });
    expect((await http(`/shipments/${r.shipmentId}/cancel`, stale)).body.code).toBe(
      'REVISION_CONFLICT',
    );
    expect(
      (await http(`/shipments/commands/${stale.commandId}?companyId=${f.company}`)).body.code,
    ).toBe('REVISION_CONFLICT');
  });
  it('P05 Parcels reads real custody with AND/OR filters, Arabic search and retained cancelled parcels', async () => {
    const r = await run(
      confirm({ recipientName: 'مستلم للبحث الطويل', brandReference: 'FILTER-X' }),
    );
    const listed = await http(
      `/inventory/parcels?companyId=${f.company}&branches=${f.a}&search=${encodeURIComponent(r.reference.replace(/[0-9]/g, (c) => '٠١٢٣٤٥٦٧٨٩'[Number(c)]!))}`,
    );
    expect(listed.status).toBe(200);
    expect((listed.body as ParcelList).items[0]?.id).toBe(r.shipmentId);
    expect(
      (await http(`/inventory/parcels?companyId=${f.company}&branches=${f.b}`, undefined, f.staffA))
        .status,
    ).toBe(403);
    const list = await UnitOfWork.run(db.pool, f.staffA.token, f.company, 'inventory', (uow) =>
      listShipmentParcels(uow, {
        ...defaultShipmentFilter([f.a]),
        brands: [seed.brand, randomUUID()],
        search: 'FILTER-X',
        service: 'brand_packed',
      }),
    );
    expect(list.total).toBe(1);
  });
  it('protects immutable revisions, identities and real same-company/brand foreign keys', async () => {
    const r = await run(confirm());
    await expect(
      db.pool.query(
        'INSERT INTO shipments.line(company_id,shipment_id,revision,id,description,quantity,unit_due_minor) VALUES($1,$2,1,$3,$4,1,0)',
        [f.company, r.shipmentId, randomUUID(), 'قطعة لا تنتمي إلى النسخة المسجلة'],
      ),
    ).rejects.toThrow('SHIPMENT_LINE_TOTAL_MISMATCH');
    await expect(
      db.pool.query(
        "UPDATE shipments.revision SET phone_canonical='01012345678' WHERE shipment_id=$1",
        [r.shipmentId],
      ),
    ).rejects.toThrow('SHIPMENT_HISTORY_IMMUTABLE');
    await expect(
      db.pool.query(
        "UPDATE shipments.shipment SET reference='77777',version=version+1 WHERE id=$1",
        [r.shipmentId],
      ),
    ).rejects.toThrow('SHIPMENT_IDENTITY_IMMUTABLE');
    await expect(
      db.pool.query('UPDATE shipments.parcel_custody SET branch_id=$2 WHERE shipment_id=$1', [
        r.shipmentId,
        f.foreign,
      ]),
    ).rejects.toThrow();
  });
  it('rejects integrated or handed-over correction/cancel/packing without shortcuts', async () => {
    for (const marker of ["source_state='integrated'", 'handed_over=true']) {
      const r = await run(confirm({ service: 'company_packed' }));
      await db.pool.query(`UPDATE shipments.shipment SET ${marker},version=version+1 WHERE id=$1`, [
        r.shipmentId,
      ]);
      const result = await http(
        `/shipments/${r.shipmentId}/cancel`,
        command({
          type: 'shipment.cancel',
          shipmentId: r.shipmentId,
          expectedVersion: 2,
          reason: 'محاولة محمية',
        }),
      );
      expect(result.body.code).toBe(
        marker.startsWith('source') ? 'SOURCE_ADAPTER_REQUIRED' : 'HANDED_OVER_PROTECTED',
      );
    }
  });
  it('tariff/policy edits never reprice old order; explicit service correction uses captured agreement', async () => {
    const r = await run(confirm()),
      before = await detail(r),
      commercial = commercialCommands(db.pool);
    await commercial.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'tariff.update',
      entityId: seed.base,
      expectedVersion: 1,
      fields: {
        tierId: seed.tier,
        governorateId: seed.cairo,
        areaId: null,
        amountMinor: '9900',
        active: true,
      },
    });
    await commercial.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'brand.update',
      entityId: seed.brand,
      expectedVersion: 1,
      fields: { ...seed.brandFields, packingUpliftMinor: '900' },
    });
    expect((await detail(r)).price).toEqual(before.price);
    const changed = await run(
      command({
        type: 'shipment.correct',
        shipmentId: r.shipmentId,
        expectedVersion: 1,
        fields: { ...before.fields, service: 'company_packed' },
        reason: 'الخدمة سجلت خطأ',
        actualAtCorrectedBranch: false,
        duplicateAcknowledged: false,
      }),
    );
    expect((await detail(changed)).price.tariffMinor).toBe('5500');
    expect((await detail(changed)).price.agreedPackingUpliftMinor).toBe('500');
    expect((await http('/shipments', confirm())).body.code).toBe('PRICING_REVISION_CONFLICT');
    const newer = await detail(
      await run(confirm({}, { expectedPolicyVersion: 2, expectedTariffVersion: 2 })),
    );
    expect(newer.price.baseShippingMinor).toBe('9900');
    expect(newer.price.recipientDueMinor).toBe('34900');
    expect((await readShipment(db.pool, f.company, r.shipmentId))?.price.baseShippingMinor).toBe(
      '5000',
    );
  });
});
