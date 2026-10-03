import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import {
  migrate,
  readMigrations,
  migrationStatus,
  transaction,
  StockPositionRepository,
  positionKey,
  readProducts,
} from '@shahn/database';
import type { InventoryCommand, InventoryResult, InventoryFilter } from '@shahn/contracts';
import { cairoDate } from '@shahn/domain';
import {
  inventoryCommands,
  inventoryList,
  defaultInventoryFilter,
  receiptDetail,
  reserveStock,
  releaseStockReservation,
  changeStockCondition,
} from '../../apps/api/src/modules/inventory/service.js';
import { commercialCommands } from '../../apps/api/src/modules/brands/service.js';
import { seedCommercial } from '../../apps/api/src/modules/brands/seed.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
import { compactCommandResults } from '../../apps/api/src/modules/kernel/commands.js';
import { createApplication } from '../../apps/api/src/app.js';
import { accessFixture } from '../support/access.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof accessFixture>>,
  seed: Awaited<ReturnType<typeof seedCommercial>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string,
  service: ReturnType<typeof inventoryCommands>;
let product: string, blue: string, red: string, receipt: string;
const cmd = (value: object): InventoryCommand =>
  ({
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    ...value,
  }) as InventoryCommand;
const run = async (value: InventoryCommand, token = f.admin.token) =>
  (await service.execute(token, value)).body as InventoryResult;
const receive = (variantId: string, quantity: number, extra: object = {}) =>
  cmd({
    type: 'stock.receive',
    branchId: f.a,
    brandId: seed.brand,
    actualDate: cairoDate(new Date()),
    lines: [{ variantId, quantity, condition: 'sound' }],
    ...extra,
  });
const list = (extra: Partial<InventoryFilter> = {}, token = f.admin.token) =>
  UnitOfWork.run(db.pool, token, f.company, 'inventory', (uow) =>
    inventoryList(uow, { ...defaultInventoryFilter([f.a]), ...extra }),
  );
const http = async (
  path: string,
  body?: InventoryCommand,
  user = f.admin,
  method = body ? 'POST' : 'GET',
) => {
  const response = await fetch(origin + '/api/v1' + path, {
    method,
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
const counts = async () =>
  (
    await db.pool.query(
      `SELECT (SELECT count(*)::int FROM inventory.stock_receipt) AS receipts,(SELECT count(*)::int FROM inventory.stock_movement) AS movements,(SELECT count(*)::int FROM inventory.stock_position) AS positions,(SELECT count(*)::int FROM audit_entry) AS audits`,
    )
  ).rows[0];
beforeAll(async () => {
  db = await isolatedPostgres();
  const migrations = await readMigrations();
  await migrate(db.pool, migrations.slice(0, 8));
  f = await accessFixture(db.pool);
  seed = await seedCommercial(db.pool, f.admin.token, f.company, f.a, 'test');
  await migrate(db.pool);
  expect((await migrationStatus(db.pool)).state).toBe('current');
  expect(
    (await db.pool.query('SELECT count(*)::int AS n FROM inventory.stock_position')).rows[0].n,
  ).toBe(0);
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
  await writeFile('docs/verification/P05/07-live-db-status.txt', status.stdout);
  service = inventoryCommands(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  try {
    if (f) {
      await mkdir('docs/verification/P05', { recursive: true });
      await writeFile(
        `docs/verification/P05/database-results-${Date.now()}.json`,
        JSON.stringify(
          {
            company: f.company,
            branchA: f.a,
            branchB: f.b,
            staffA: f.staffA.id,
            staffAB: f.staffAB.id,
            brand: seed.brand,
            product,
            blue,
            red,
            receipt,
            postgres: (await db.pool.query('SHOW server_version')).rows[0],
            counts: await counts(),
            positions: (await db.pool.query('SELECT * FROM inventory.stock_position')).rows,
            reconciliation: (
              await db.pool.query(
                `SELECT s.variant_id,s.sound_on_hand::text,s.unavailable_on_hand::text,COALESCE(sum(m.sound_delta),0)::text AS movement_sound,COALESCE(sum(m.unavailable_delta),0)::text AS movement_unavailable FROM inventory.stock_position s LEFT JOIN inventory.stock_movement m USING(company_id,branch_id,brand_id,variant_id) GROUP BY s.company_id,s.branch_id,s.brand_id,s.variant_id`,
              )
            ).rows,
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await app?.close();
    await db?.dispose();
  }
});
describe('P05 committed inventory and real authenticated HTTP', () => {
  it('creates immutable product/variant IDs without stock or financial effects', async () => {
    const before = await counts();
    const result = await http(
      `/brands/${seed.brand}/products`,
      cmd({
        type: 'product.create',
        brandId: seed.brand,
        fields: {
          name: 'قميص التجربة',
          active: true,
          variants: [
            { name: 'Blue', options: 'أزرق · مقاس كبير', active: true },
            { name: 'Red', options: 'أحمر', active: true },
          ],
        },
      }),
      f.staffA,
    );
    expect(result.status).toBe(200);
    product = result.body.entityId;
    const p = (
      await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', (u) =>
        readProducts(u.client, f.company),
      )
    ).find((p) => p.id === product)!;
    blue = p.variants.find((v) => v.name === 'Blue')!.id;
    red = p.variants.find((v) => v.name === 'Red')!.id;
    expect(await counts()).toMatchObject({
      receipts: before.receipts,
      movements: before.movements,
      positions: before.positions,
    });
    const zero = (await list()).items;
    expect(zero.every((r) => r.physicalOnHand === 0)).toBe(true);
    expect(
      (await db.pool.query('SELECT count(*)::int AS n FROM kernel.journal_effect')).rows[0].n,
    ).toBe(0);
  });
  it('receives Blue 10 sound/2 damaged and Red 3 all in one real API commit', async () => {
    const input = receive(blue, 10, {
      actualDate: '2026-01-02',
      lines: [
        { variantId: blue, quantity: 10, condition: 'sound' },
        { variantId: blue, quantity: 2, condition: 'damaged' },
        { variantId: red, quantity: 3, condition: 'sound' },
      ],
    });
    const result = await http('/inventory/receipts', input, f.staffA);
    expect(result.status).toBe(200);
    receipt = result.body.entityId;
    expect((await list({ variantId: blue })).items[0]).toMatchObject({
      soundOnHand: 10,
      physicalOnHand: 12,
      unavailableOnHand: 2,
      available: 10,
      reserved: 0,
    });
    const detail = await http(
      `/inventory/receipts/${receipt}?companyId=${f.company}`,
      undefined,
      f.staffA,
    );
    expect(detail.status).toBe(200);
    expect(detail.body.lines).toHaveLength(3);
    expect(detail.body.actualDate).toBe('2026-01-02');
    expect(detail.body.recordedAt.startsWith('2026-01-02')).toBe(false);
  });
  it('replays lost response once, rejects changed payload, and recovers compacted original reference', async () => {
    const input = receive(red, 1),
      first = await run(input);
    expect(await run(input)).toEqual(first);
    await expect(
      run({
        ...input,
        ...{ lines: [{ variantId: red, quantity: 2, condition: 'sound' }] },
      } as InventoryCommand),
    ).rejects.toThrow('COMMAND_PAYLOAD_CONFLICT');
    await db.pool.query('ALTER TABLE command_record DISABLE TRIGGER immutable_command');
    try {
      await db.pool.query(
        "UPDATE command_record SET retain_until=clock_timestamp()-interval '1 day' WHERE company_id=$1 AND command_id=$2",
        [f.company, input.commandId],
      );
    } finally {
      await db.pool.query('ALTER TABLE command_record ENABLE TRIGGER immutable_command');
    }
    await compactCommandResults(db.pool);
    expect(
      (await service.recover(f.admin.token, f.company, 'inventory.receipt', input.commandId)).body,
    ).toEqual(first);
    expect((await list({ variantId: red })).items[0]!.soundOnHand).toBe(4);
  });
  it('allows two independent first-receipt transactions to add exactly 3+4 into absent position', async () => {
    const result = await run(
      cmd({
        type: 'product.create',
        brandId: seed.brand,
        fields: {
          name: 'سباق أول استلام',
          active: true,
          variants: [{ name: 'افتراضي', options: '', active: true }],
        },
      }),
    );
    const p = (
        await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', (u) =>
          readProducts(u.client, f.company),
        )
      ).find((p) => p.id === result.entityId)!,
      id = p.variants[0]!.id;
    let arrivals = 0,
      release!: () => void;
    const barrier = new Promise<void>((r) => (release = r));
    const concurrent = inventoryCommands(db.pool, {
      afterValidateReceipt: async () => {
        arrivals++;
        if (arrivals === 2) release();
        await barrier;
      },
    });
    const results = await Promise.all([
      concurrent.execute(f.staffA.token, receive(id, 3)),
      concurrent.execute(f.staffAB.token, receive(id, 4)),
    ]);
    expect(results[0]!.body).not.toEqual(results[1]!.body);
    expect((await list({ variantId: id })).items[0]!.soundOnHand).toBe(7);
    expect(
      (
        await db.pool.query(
          'SELECT count(*)::int AS n FROM inventory.stock_position WHERE variant_id=$1',
          [id],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it('interrupts after first movement with zero committed receipt/position/audit/result effects', async () => {
    const before = await counts(),
      initial = (await list({ variantId: blue })).items[0]!.soundOnHand;
    const input = receive(blue, 1, {
      lines: [
        { variantId: blue, quantity: 1, condition: 'sound' },
        { variantId: red, quantity: 1, condition: 'uncertain' },
      ],
    });
    await expect(
      inventoryCommands(db.pool, {
        afterLine: async (i) => {
          if (i === 0) throw Error('INJECTED_BEFORE_COMMIT');
        },
      }).execute(f.admin.token, input),
    ).rejects.toThrow('INJECTED_BEFORE_COMMIT');
    expect(await counts()).toEqual(before);
    expect((await list({ variantId: blue })).items[0]!.soundOnHand).toBe(initial);
    expect(
      (await db.pool.query('SELECT id FROM command_record WHERE command_id=$1', [input.commandId]))
        .rowCount,
    ).toBe(0);
  });
  it('rejects fractional, negative, future, mixed-brand and forbidden branches without effects', async () => {
    const before = await counts();
    for (const quantity of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect((await http('/inventory/receipts', receive(blue, quantity))).status).toBe(400);
    expect(
      (await http('/inventory/receipts', receive(blue, 1, { actualDate: '2099-01-01' }))).status,
    ).toBe(400);
    expect(
      (await http('/inventory/receipts', receive(blue, 1, { branchId: f.b }), f.staffA)).status,
    ).toBe(403);
    const mixed = await http(
      '/inventory/receipts',
      receive(blue, 1, {
        lines: [
          { variantId: blue, quantity: 1, condition: 'sound' },
          { variantId: randomUUID(), quantity: 1, condition: 'sound' },
        ],
      }),
    );
    expect(mixed.status).toBe(409);
    expect(await counts()).toMatchObject({
      receipts: before.receipts,
      movements: before.movements,
      positions: before.positions,
    });
  });
  it('denies branch B query, receipt/history/name leakage despite company tracking grant', async () => {
    for (const user of [f.staffA, f.staffAB])
      expect(
        (await http(`/inventory/products?companyId=${f.company}&branches=${f.a}`, undefined, user))
          .status,
      ).toBe(200);
    const denied = await http(
      `/inventory/products?companyId=${f.company}&branches=${f.b}`,
      undefined,
      f.staffA,
    );
    expect(denied.status).toBe(403);
    expect(JSON.stringify(denied.body)).not.toContain('الفرع ب');
    expect(
      (
        await http(
          `/inventory/variants/${blue}/history?companyId=${f.company}&branchId=${f.b}`,
          undefined,
          f.staffA,
        )
      ).status,
    ).toBe(403);
    expect(
      (await http(`/inventory/products?companyId=${f.company}&branches=${f.foreign}`)).status,
    ).toBe(403);
  });
  it('reauthorizes revoked branch before duplicate/recovery/detail read, then restores isolated fixture', async () => {
    const input = receive(red, 1),
      result = await run(input, f.staffAB.token);
    await db.pool.query('DELETE FROM access.user_branch WHERE user_id=$1 AND branch_id=$2', [
      f.staffAB.id,
      f.a,
    ]);
    try {
      await expect(
        service.recover(f.staffAB.token, f.company, 'inventory.receipt', input.commandId),
      ).rejects.toThrow('FORBIDDEN_SCOPE');
      await expect(run(input, f.staffAB.token)).rejects.toThrow('FORBIDDEN_SCOPE');
      expect(
        (
          await http(
            `/inventory/receipts/${result.entityId}?companyId=${f.company}`,
            undefined,
            f.staffAB,
          )
        ).status,
      ).toBe(403);
    } finally {
      await db.pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [
        f.company,
        f.staffAB.id,
        f.a,
      ]);
    }
  });
  it('keeps stable variants through rename, stale rejection and deactivation with retained receipt snapshots', async () => {
    const old = (
      await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', (u) =>
        readProducts(u.client, f.company),
      )
    ).find((p) => p.id === product)!;
    const fields = {
      name: 'قميص بعد تغيير الاسم',
      active: true,
      variants: old.variants.map((v) => ({ ...v, name: v.id === blue ? 'أزرق جديد' : v.name })),
    };
    const input = cmd({
      type: 'product.update',
      productId: product,
      expectedVersion: old.version,
      fields,
    });
    expect((await http(`/products/${product}`, input, f.admin, 'PATCH')).status).toBe(200);
    expect(
      (
        await http(
          `/products/${product}`,
          cmd({ type: 'product.update', productId: product, expectedVersion: old.version, fields }),
          f.admin,
          'PATCH',
        )
      ).status,
    ).toBe(409);
    const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', (u) =>
      receiptDetail(u, receipt),
    );
    expect(detail.lines.find((l) => l.variantId === blue)!.variantName).toBe('Blue');
    await run(
      cmd({
        type: 'product.update',
        productId: product,
        expectedVersion: 2,
        fields: { ...fields, active: false },
      }),
    );
    await expect(run(receive(blue, 1))).rejects.toThrow('INACTIVE_OR_UNKNOWN_VARIANT');
    expect((await list({ variantId: blue })).items[0]!.physicalOnHand).toBe(12);
    await run(cmd({ type: 'product.update', productId: product, expectedVersion: 3, fields }));
  });
  it('represents actual 5/reserved 7, holds all affected sources, replenishes atomically and leaves unrelated usable', async () => {
    const result = await run(
        cmd({
          type: 'product.create',
          brandId: seed.brand,
          fields: {
            name: 'نموذج العجز',
            active: true,
            variants: [{ name: 'عجز', options: '', active: true }],
          },
        }),
      ),
      p = (
        await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', (u) =>
          readProducts(u.client, f.company),
        )
      ).find((p) => p.id === result.entityId)!,
      id = p.variants[0]!.id,
      key = { branchId: f.a, brandId: seed.brand, variantId: id };
    await run(receive(id, 7));
    await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', async (uow) => {
      uow.lockOrder('stock', positionKey(key));
      for (const [i, quantity] of [4, 3].entries()) {
        const source = randomUUID();
        await uow.client.query(
          `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2::uuid,'order','P05-fixture',$2::uuid::text,1)`,
          [f.company, source],
        );
        await reserveStock(uow, key, {
          sourceId: source,
          kind: 'order',
          lineKey: String(i),
          quantity,
        });
      }
    });
    // Explicit test observation; no P21 adjustment endpoint is claimed.
    await transaction(db.pool, async (client) => {
      const repo = new StockPositionRepository(),
        pos = (await repo.lock(client, f.company, [key]))[0]!;
      const source = randomUUID();
      await client.query(
        `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2::uuid,'adjustment','P05-fixture',$2::uuid::text,1)`,
        [f.company, source],
      );
      await client.query(
        `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,'observed', $4,$5,$6,'sound',-2,0,$7)`,
        [f.company, randomUUID(), source, f.a, seed.brand, id, cairoDate(new Date())],
      );
      await repo.update(client, f.company, pos, 5, 0);
    });
    expect((await list({ variantId: id })).items[0]).toMatchObject({
      physicalOnHand: 5,
      reserved: 7,
      available: 0,
      reservationShortage: 2,
    });
    expect(
      (
        await db.pool.query(
          'SELECT shortage_held FROM inventory.stock_reservation WHERE variant_id=$1',
          [id],
        )
      ).rows.every((r) => r.shortage_held),
    ).toBe(true);
    expect((await list({ variantId: red })).items[0]!.available).toBeGreaterThan(0);
    await run(receive(id, 2));
    expect(
      (
        await db.pool.query(
          'SELECT shortage_held FROM inventory.stock_reservation WHERE variant_id=$1',
          [id],
        )
      ).rows.every((r) => !r.shortage_held),
    ).toBe(true);
  });
  it('bounds aggregate quantities beyond SQL integer range and rolls back safe-integer overflow', async () => {
    const result = await run(
        cmd({
          type: 'product.create',
          brandId: seed.brand,
          fields: {
            name: 'كمية كبيرة',
            active: true,
            variants: [{ name: 'حد', options: '', active: true }],
          },
        }),
      ),
      p = (
        await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', (u) =>
          readProducts(u.client, f.company),
        )
      ).find((p) => p.id === result.entityId)!,
      id = p.variants[0]!.id;
    await run(receive(id, Number.MAX_SAFE_INTEGER));
    expect((await list({ variantId: id })).items[0]!.soundOnHand).toBe(Number.MAX_SAFE_INTEGER);
    const before = await counts();
    await expect(run(receive(id, 1))).rejects.toThrow('QUANTITY_OVERFLOW');
    expect(await counts()).toMatchObject({
      receipts: before.receipts,
      movements: before.movements,
      positions: before.positions,
    });
  });
  it('ANDs fields, ORs categories, uses current balances under movement-date filter and stable pagination', async () => {
    expect(
      (
        await list({
          search: 'أزرق جديد',
          categories: ['available', 'unavailable'],
          movementFrom: cairoDate(new Date()),
          movementTo: cairoDate(new Date()),
        })
      ).items[0],
    ).toMatchObject({ physicalOnHand: 12, available: 10 });
    expect((await list({ search: 'أزرق جديد', categories: ['reserved'] })).total).toBe(0);
    expect(
      (await list({ search: 'أزرق جديد', movementFrom: '2026-01-02', movementTo: '2026-01-02' }))
        .total,
    ).toBe(0);
    expect((await list()).items.map((i) => i.variantId)).toEqual(
      (await list()).items.map((i) => i.variantId),
    );
    expect(
      (await http(`/inventory/products?companyId=${f.company}&branches=${f.a}&sort=sql`)).status,
    ).toBe(400);
    expect(
      (await http(`/inventory/products?companyId=${f.company}&branches=${f.a}&search=%25`)).body
        .total,
    ).toBe(0);
  });
  it('enforces same company/brand constraints, immutable history and source-effect uniqueness in SQL', async () => {
    await expect(
      db.pool.query(
        'INSERT INTO inventory.stock_position(company_id,branch_id,brand_id,variant_id) VALUES($1,$2,$3,$4)',
        [f.other, f.foreign, seed.brand, blue],
      ),
    ).rejects.toThrow();
    await expect(
      db.pool.query(
        'INSERT INTO inventory.stock_position(company_id,branch_id,brand_id,variant_id) VALUES($1,$2,$3,$4)',
        [f.company, f.b, randomUUID(), blue],
      ),
    ).rejects.toThrow();
    await expect(
      db.pool.query('UPDATE inventory.stock_receipt_line SET quantity=1 WHERE receipt_id=$1', [
        receipt,
      ]),
    ).rejects.toThrow('INVENTORY_HISTORY_IMMUTABLE');
    await expect(
      db.pool.query(
        'INSERT INTO inventory.stock_movement SELECT company_id,$1,source_id,effect_key,branch_id,brand_id,variant_id,receipt_line_id,condition,sound_delta,unavailable_delta,actual_date,recorded_at FROM inventory.stock_movement LIMIT 1',
        [randomUUID()],
      ),
    ).rejects.toThrow();
    await expect(
      db.pool.query('DELETE FROM inventory.product WHERE id=$1', [product]),
    ).rejects.toThrow('INVENTORY_HISTORY_IMMUTABLE');
  });
  it('rejects real mixed-brand variants and repeated display names remain separate identities', async () => {
    const newBrand = (
      await commercialCommands(db.pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'brand.create',
        fields: { ...seed.brandFields, name: 'براند مستقل' },
      })
    ).body as { entityId: string };
    const made = await run(
      cmd({
        type: 'product.create',
        brandId: newBrand.entityId,
        fields: {
          name: 'منتج مستقل',
          active: true,
          variants: [{ name: 'Blue', options: '', active: true }],
        },
      }),
    );
    const p = (
      await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', (u) =>
        readProducts(u.client, f.company),
      )
    ).find((p) => p.id === made.entityId)!;
    const before = await counts();
    await expect(
      run(
        receive(blue, 1, {
          lines: [
            { variantId: blue, quantity: 1, condition: 'sound' },
            { variantId: p.variants[0]!.id, quantity: 1, condition: 'sound' },
          ],
        }),
      ),
    ).rejects.toThrow('INACTIVE_OR_UNKNOWN_VARIANT');
    expect(await counts()).toMatchObject({
      receipts: before.receipts,
      movements: before.movements,
      positions: before.positions,
    });
    const duplicate = await run(
      cmd({
        type: 'product.create',
        brandId: newBrand.entityId,
        fields: {
          name: p.name,
          active: true,
          variants: p.variants.map((v) => ({ name: v.name, options: v.options, active: true })),
        },
      }),
    );
    expect(duplicate.entityId).not.toBe(p.id);
    expect(duplicate.warnings).toEqual(['DUPLICATE_DISPLAY']);
  });
  it('shared reserve/release/condition interfaces conserve units, retain history and deduplicate source effects', async () => {
    const key = { branchId: f.a, brandId: seed.brand, variantId: blue },
      source = randomUUID();
    await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', async (uow) => {
      uow.lockOrder('stock', positionKey(key));
      const repo = new StockPositionRepository(),
        pos = (await repo.lock(uow.client, f.company, [key]))[0]!;
      await uow.client.query(
        `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2::uuid,'condition','P05-fixture',$2::uuid::text,1)`,
        [f.company, source],
      );
      const input = {
        sourceId: source,
        effectKey: 'inspection',
        expectedVersion: pos.version,
        quantity: 1,
        to: 'sound' as const,
        actualDate: cairoDate(new Date()),
      };
      await changeStockCondition(uow, key, input);
      await changeStockCondition(uow, key, input);
      await expect(changeStockCondition(uow, key, { ...input, quantity: 2 })).rejects.toThrow(
        'SOURCE_EFFECT_CONFLICT',
      );
    });
    expect((await list({ variantId: blue })).items[0]).toMatchObject({
      soundOnHand: 11,
      unavailableOnHand: 1,
      physicalOnHand: 12,
    });
    const reserveSource = randomUUID();
    await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', async (uow) => {
      uow.lockOrder('stock', positionKey(key));
      await uow.client.query(
        `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2::uuid,'order','P05-fixture',$2::uuid::text,1)`,
        [f.company, reserveSource],
      );
      await reserveStock(uow, key, {
        sourceId: reserveSource,
        kind: 'order',
        lineKey: '1',
        quantity: 2,
      });
    });
    const reservation = (
      await db.pool.query<{ id: string }>(
        'SELECT id FROM inventory.stock_reservation WHERE source_id=$1',
        [reserveSource],
      )
    ).rows[0]!.id;
    await UnitOfWork.run(db.pool, f.admin.token, f.company, 'inventory', async (uow) => {
      uow.lockOrder('stock', positionKey(key));
      await releaseStockReservation(uow, key, reservation, reserveSource);
      await releaseStockReservation(uow, key, reservation, reserveSource);
    });
    expect(
      (
        await db.pool.query(
          'SELECT kind FROM inventory.reservation_event WHERE reservation_id=$1 ORDER BY recorded_at',
          [reservation],
        )
      ).rows.map((r) => r.kind),
    ).toEqual(['reserved', 'released']);
    expect((await list({ variantId: blue })).items[0]!.reserved).toBe(0);
  });
  it('rejects absent module grant and missing CSRF on mutations', async () => {
    const response = await fetch(origin + '/api/v1/inventory/receipts', {
      method: 'POST',
      headers: {
        cookie: 'erp_session=' + f.admin.token,
        'Content-Type': 'application/json',
        origin: f.config.origin,
      },
      body: JSON.stringify(receive(red, 1)),
    });
    expect(response.status).toBe(403);
    await db.pool.query("INSERT INTO access.user_exception VALUES($1,$2,'inventory','deny')", [
      f.company,
      f.staffA.id,
    ]);
    try {
      expect(
        (
          await http(
            `/inventory/products?companyId=${f.company}&branches=${f.a}`,
            undefined,
            f.staffA,
          )
        ).status,
      ).toBe(403);
      expect((await http('/inventory/receipts', receive(red, 1), f.staffA)).status).toBe(403);
    } finally {
      await db.pool.query(
        "DELETE FROM access.user_exception WHERE user_id=$1 AND capability='inventory'",
        [f.staffA.id],
      );
    }
  });
  it('returns truthful authorized parcel boundary and reconciles every persisted position to movements', async () => {
    expect(
      (
        await http(
          `/inventory/parcels?companyId=${f.company}&branches=${f.a}&custody=external`,
          undefined,
          f.staffA,
        )
      ).body,
    ).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
      boundary: 'LOCAL_CUSTODY_ONLY',
      custody: 'external',
    });
    expect(
      (await http(`/inventory/parcels?companyId=${f.company}&branches=${f.b}`, undefined, f.staffA))
        .status,
    ).toBe(403);
    const mismatch = await db.pool.query(
      `SELECT s.variant_id FROM inventory.stock_position s LEFT JOIN inventory.stock_movement m USING(company_id,branch_id,brand_id,variant_id) GROUP BY s.company_id,s.branch_id,s.brand_id,s.variant_id HAVING s.sound_on_hand<>COALESCE(sum(m.sound_delta),0) OR s.unavailable_on_hand<>COALESCE(sum(m.unavailable_delta),0)`,
    );
    expect(mismatch.rows).toEqual([]);
  });
});
