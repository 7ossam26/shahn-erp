import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, readMigrations, transaction } from '@shahn/database';
import {
  commercialCommands,
  pricing,
  brandDetail,
} from '../../apps/api/src/modules/brands/service.js';
import { seedCommercial } from '../../apps/api/src/modules/brands/seed.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
import { compactCommandResults } from '../../apps/api/src/modules/kernel/commands.js';
import { createApplication } from '../../apps/api/src/app.js';
import { accessFixture } from '../support/access.js';
import type { CommercialCommand, CommercialResult, PricingInput } from '@shahn/contracts';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof accessFixture>>,
  s: Awaited<ReturnType<typeof seedCommercial>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
let service: ReturnType<typeof commercialCommands>;
const command = (value: object) =>
  ({
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    ...value,
  }) as CommercialCommand;
const run = async (value: CommercialCommand) =>
  (await service.execute(f.admin.token, value)).body as CommercialResult;
const priceInput = (extra: Partial<PricingInput> = {}): PricingInput => ({
  brandId: s.brand,
  branchId: f.a,
  service: 'brand_packed',
  governorateId: s.cairo,
  areaId: null,
  goodsDueMinor: '25000',
  recipientShippingMinor: '5000',
  ...extra,
});
const preview = (extra: Partial<PricingInput> = {}) =>
  UnitOfWork.run(db.pool, f.admin.token, f.company, 'brands', (uow) =>
    pricing(uow, priceInput(extra)),
  );
const http = async (path: string, body?: unknown, token?: string, csrf?: string) => {
  const response = await fetch(origin + '/api/v1' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      cookie: 'erp_session=' + (token ?? f.admin.token),
      ...(body
        ? {
            'Content-Type': 'application/json',
            origin: f.config.origin,
            'x-csrf-token': csrf ?? f.admin.csrfToken,
          }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
};
beforeAll(async () => {
  db = await isolatedPostgres();
  const migrations = await readMigrations();
  await migrate(db.pool, migrations.slice(0, 7));
  f = await accessFixture(db.pool);
  const empty = randomUUID();
  await db.pool.query("INSERT INTO kernel.resource(company_id,id,family) VALUES($1,$2,'brand')", [
    f.company,
    empty,
  ]);
  await migrate(db.pool);
  expect(
    (await db.pool.query('SELECT id FROM kernel.resource WHERE id=$1', [empty])).rows[0].id,
  ).toBe(empty);
  expect(
    (await db.pool.query('SELECT id FROM access.ordinary_user WHERE id=$1', [f.admin.id])).rows[0]
      .id,
  ).toBe(f.admin.id);
  for (const cap of ['brands', 'reference-data'])
    await db.pool.query('INSERT INTO access.role_grant VALUES($1,$2,$3)', [
      f.company,
      f.adminRole,
      cap,
    ]);
  service = commercialCommands(db.pool);
  s = await seedCommercial(db.pool, f.admin.token, f.company, f.a, 'test');
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  try {
    if (s) {
      await mkdir('docs/verification/P04', { recursive: true });
      const facts = {
        seed: s,
        postgres: (await db.pool.query('SHOW server_version')).rows[0],
        snapshots: (
          await db.pool.query('SELECT id,body FROM commercial.price_snapshot ORDER BY recorded_at')
        ).rows,
        counts: (
          await db.pool.query(
            `SELECT (SELECT count(*) FROM commercial.brand) AS brands,(SELECT count(*) FROM commercial.brand_policy) AS policies,(SELECT count(*) FROM kernel.journal_effect) AS effects,(SELECT count(*) FROM audit_entry) AS audits`,
          )
        ).rows[0],
      };
      await writeFile(
        `docs/verification/P04/database-results-${Date.now()}.json`,
        JSON.stringify(facts, null, 2),
      );
    }
  } finally {
    try {
      await app?.close();
    } finally {
      await db?.dispose();
    }
  }
});
describe('P04 committed commercial configuration, history and HTTP', () => {
  it('runs 50/60/55 lookup, wrong-parent rejection, fallback and explicit zero through server pricing', async () => {
    expect((await preview()).tariffMinor).toBe('5000');
    expect((await preview({ areaId: s.dokki })).tariffMinor).toBe('6000');
    expect(await preview({ service: 'company_packed' })).toMatchObject({
      tariffMinor: '5500',
      baseShippingMinor: '5000',
      packingUpliftMinor: '500',
      commissionBaseMinor: '5000',
    });
    await expect(preview({ areaId: s.foreignArea })).rejects.toThrow('INVALID_GEOGRAPHY_OR_TIER');
    await run(
      command({
        type: 'tariff.update',
        entityId: s.override,
        expectedVersion: 1,
        fields: {
          tierId: s.tier,
          governorateId: s.cairo,
          areaId: s.dokki,
          amountMinor: '6000',
          active: false,
        },
      }),
    );
    expect((await preview({ areaId: s.dokki })).tariffMinor).toBe('5000');
    await run(
      command({
        type: 'tariff.update',
        entityId: s.override,
        expectedVersion: 2,
        fields: {
          tierId: s.tier,
          governorateId: s.cairo,
          areaId: s.dokki,
          amountMinor: '0',
          active: true,
        },
      }),
    );
    expect((await preview({ areaId: s.dokki })).tariffMinor).toBe('0');
  });
  it('creates one empty shared wallet and immutable policy with concurrent lost-response replay', async () => {
    const input = command({ type: 'brand.create', fields: { ...s.brandFields, name: 'متزامن' } });
    const replies = await Promise.all([
      http('/brands/commands', input),
      http('/brands/commands', input),
    ]);
    expect(replies[0]).toEqual(replies[1]);
    expect(replies[0].status).toBe(200);
    const id = replies[0].body.entityId;
    expect(
      (
        await db.pool.query(
          "SELECT count(*) FROM kernel.resource WHERE company_id=$1 AND id=$2 AND family='brand' AND NOT fixture",
          [f.company, id],
        )
      ).rows[0].count,
    ).toBe('1');
    expect(
      (await db.pool.query('SELECT count(*) FROM kernel.journal_effect WHERE subject_id=$1', [id]))
        .rows[0].count,
    ).toBe('0');
    expect(
      (
        await http(
          `/brands/commands/${input.commandId}?companyId=${f.company}&family=commercial.brand`,
        )
      ).body,
    ).toEqual(replies[0].body);
    expect(
      (
        await http('/brands/commands', {
          ...input,
          fields: { ...s.brandFields, name: 'different' },
        })
      ).status,
    ).toBe(409);
    await db.pool.query('ALTER TABLE command_record DISABLE TRIGGER immutable_command');
    try {
      await db.pool.query(
        "UPDATE command_record SET retain_until=clock_timestamp()-interval '1 day' WHERE command_id=$1",
        [input.commandId],
      );
    } finally {
      await db.pool.query('ALTER TABLE command_record ENABLE TRIGGER immutable_command');
    }
    await compactCommandResults(db.pool);
    expect(
      (
        await http(
          `/brands/commands/${input.commandId}?companyId=${f.company}&family=commercial.brand`,
        )
      ).body,
    ).toEqual(replies[0].body);
  });
  it('rolls back brand, policy, wallet, command and audit on failure after insert', async () => {
    const input = command({ type: 'brand.create', fields: { ...s.brandFields, name: 'rollback' } }),
      before = (await db.pool.query('SELECT count(*) FROM audit_entry')).rows[0].count;
    await expect(
      commercialCommands(db.pool, {
        afterBrandInsert: async () => {
          throw Error('INJECTED_AFTER_BRAND');
        },
      }).execute(f.admin.token, input),
    ).rejects.toThrow('INJECTED_AFTER_BRAND');
    expect(
      (await db.pool.query("SELECT count(*) FROM commercial.brand WHERE name='rollback'")).rows[0]
        .count,
    ).toBe('0');
    expect(
      (
        await db.pool.query('SELECT count(*) FROM command_record WHERE command_id=$1', [
          input.commandId,
        ])
      ).rows[0].count,
    ).toBe('0');
    expect((await db.pool.query('SELECT count(*) FROM audit_entry')).rows[0].count).toBe(before);
  });
  it('retains snapshots A/B across rate and manually chosen tier changes; no measured-volume input exists', async () => {
    const a = await run(command({ type: 'pricing.snapshot', input: priceInput() }));
    await run(
      command({
        type: 'tariff.update',
        entityId: s.base,
        expectedVersion: 1,
        fields: {
          tierId: s.tier,
          governorateId: s.cairo,
          areaId: null,
          amountMinor: '7000',
          active: true,
        },
      }),
    );
    await run(
      command({
        type: 'brand.update',
        entityId: s.brand,
        expectedVersion: 1,
        fields: { ...s.brandFields, tierId: s.otherTier },
      }),
    );
    const b = await run(command({ type: 'pricing.snapshot', input: priceInput() }));
    expect(a.snapshot?.tariffMinor).toBe('5000');
    expect(b.snapshot).toMatchObject({
      tariffMinor: '7000',
      tierId: s.otherTier,
      policyVersion: 2,
    });
    expect(
      (await db.pool.query('SELECT body FROM commercial.price_snapshot WHERE id=$1', [a.entityId]))
        .rows[0].body,
    ).toEqual(a.snapshot);
    await expect(
      db.pool.query("UPDATE commercial.price_snapshot SET body='{}' WHERE id=$1", [a.entityId]),
    ).rejects.toThrow('IMMUTABLE_COMMERCIAL_HISTORY');
  });
  it('accepts one concurrent policy edit and reports currentVersion without losing the rejected intent', async () => {
    const fields = { ...s.brandFields, tierId: s.otherTier };
    const inputs = [
      command({
        type: 'brand.update',
        entityId: s.brand,
        expectedVersion: 2,
        fields: { ...fields, name: 'session A' },
      }),
      command({
        type: 'brand.update',
        entityId: s.brand,
        expectedVersion: 2,
        fields: { ...fields, name: 'session B' },
      }),
    ];
    const replies = await Promise.all(inputs.map((c) => http('/brands/commands', c)));
    expect(replies.map((r) => r.status).sort()).toEqual([200, 409]);
    const index = replies.findIndex((r) => r.status === 409);
    expect(replies[index]!.body.currentVersion).toBe(3);
    const saved = (
      await db.pool.query('SELECT payload FROM command_record WHERE command_id=$1', [
        inputs[index]!.commandId,
      ])
    ).rows[0].payload;
    expect(saved).toEqual(inputs[index]);
    expect(
      (
        await UnitOfWork.run(db.pool, f.admin.token, f.company, 'brands', (u) =>
          brandDetail(u, s.brand),
        )
      ).history,
    ).toHaveLength(3);
  });
  it('rejects missing base at snapshot creation without a snapshot or commercial writes', async () => {
    const created = await run(
      command({ type: 'brand.create', fields: { ...s.brandFields, tierId: s.tier } }),
    );
    await run(
      command({
        type: 'tariff.update',
        entityId: s.base,
        expectedVersion: 2,
        fields: {
          tierId: s.tier,
          governorateId: s.cairo,
          areaId: null,
          amountMinor: '7000',
          active: false,
        },
      }),
    );
    const input = command({
      type: 'pricing.snapshot',
      input: priceInput({ brandId: created.entityId }),
    });
    const reply = await http('/brands/commands', input);
    expect(reply.status).toBe(409);
    expect(reply.body.code).toBe('PRICE_MISSING');
    expect(
      (
        await db.pool.query('SELECT count(*) FROM commercial.price_snapshot WHERE brand_id=$1', [
          created.entityId,
        ])
      ).rows[0].count,
    ).toBe('0');
  });
  it('enforces same-company tier/area/branch, immutable reference keys and SQL uniqueness/defaults', async () => {
    await expect(
      run(command({ type: 'brand.create', fields: { ...s.brandFields, tierId: randomUUID() } })),
    ).rejects.toThrow('INVALID_GEOGRAPHY_OR_TIER');
    await expect(
      run(
        command({
          type: 'brand.create',
          fields: {
            ...s.brandFields,
            services: ['stored_stock'],
            defaultService: 'stored_stock',
            storage: {
              monthlyFeeMinor: '10000',
              branchId: f.foreign,
              startDate: '2026-01-31',
              anniversaryDay: 31,
              active: true,
              stopDate: null,
            },
          },
        }),
      ),
    ).rejects.toThrow('INVALID_STORAGE_BRANCH');
    const result = await http(
      '/brands/commands',
      command({
        type: 'tariff.create',
        fields: {
          tierId: s.tier,
          governorateId: s.cairo,
          areaId: null,
          amountMinor: '0',
          active: true,
        },
      }),
    );
    expect(result.body.code).toBe('TARIFF_KEY_EXISTS');
    await expect(
      db.pool.query(
        'INSERT INTO commercial.tariff(company_id,id,tier_id,governorate_id,area_id,version,active,amount_minor) VALUES($1,$2,$3,$4,NULL,1,true,0)',
        [f.company, randomUUID(), s.tier, s.cairo],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      transaction(db.pool, (c) =>
        c.query(
          `INSERT INTO commercial.brand_policy(company_id,brand_id,version,tier_id,services,default_service,packing_uplift_minor,fields) VALUES($1,$2,99,$3,ARRAY['brand_packed'],'stored_stock',0,'{}')`,
          [f.company, s.brand, s.tier],
        ),
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      db.pool.query('DELETE FROM commercial.reference WHERE company_id=$1 AND id=$2', [
        f.company,
        s.cairo,
      ]),
    ).rejects.toThrow('DEACTIVATE_MASTER');
  });
  it('uses screen grants, current branch scope, closed schemas and real CSRF on every query/recovery', async () => {
    expect(
      (await http('/reference-data?companyId=' + f.company, undefined, f.staffA.token)).status,
    ).toBe(403);
    await db.pool.query("INSERT INTO access.user_exception VALUES($1,$2,'brands','allow')", [
      f.company,
      f.staffA.id,
    ]);
    expect((await http('/brands?companyId=' + f.company, undefined, f.staffA.token)).status).toBe(
      200,
    );
    expect(
      (
        await http(
          '/brands/pricing-preview',
          { companyId: f.company, input: priceInput({ branchId: f.b }) },
          f.staffA.token,
          f.staffA.csrfToken,
        )
      ).status,
    ).toBe(403);
    expect((await http('/brands?companyId=' + f.other)).status).toBe(403);
    expect((await http('/brands?companyId=' + f.company + '&arbitrary=1')).status).toBe(400);
    expect(
      (
        await http(
          '/brands/commands',
          command({ type: 'brand.create', fields: s.brandFields }),
          undefined,
          'bad',
        )
      ).status,
    ).toBe(403);
    const result = await http('/brands?companyId=' + f.company + '&search=session&limit=1');
    expect(result.body.items).toHaveLength(1);
    expect(result.body.limit).toBe(1);
  });
  it('rejects actual foreign company references at PostgreSQL composite foreign keys', async () => {
    const foreignTier = randomUUID(),
      foreignGov = randomUUID();
    await transaction(db.pool, async (client) => {
      for (const [id, kind] of [
        [foreignTier, 'tier'],
        [foreignGov, 'governorate'],
      ]) {
        await client.query(
          'INSERT INTO commercial.reference(company_id,id,kind,name,active,version) VALUES($1,$2,$3,$3,true,1)',
          [f.other, id, kind],
        );
        await client.query(
          "INSERT INTO commercial.reference_revision(company_id,entity_id,version,fields) VALUES($1,$2,1,'{}')",
          [f.other, id],
        );
      }
    });
    await expect(
      db.pool.query(
        "INSERT INTO commercial.reference(company_id,id,kind,name,active,version,parent_id) VALUES($1,$2,'area','foreign parent',true,1,$3)",
        [f.company, randomUUID(), foreignGov],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      db.pool.query(
        'INSERT INTO commercial.tariff(company_id,id,tier_id,governorate_id,version,active,amount_minor) VALUES($1,$2,$3,$4,1,true,0)',
        [f.company, randomUUID(), foreignTier, s.cairo],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      db.pool.query(
        "INSERT INTO commercial.brand_policy(company_id,brand_id,version,tier_id,services,default_service,packing_uplift_minor,storage_fee_minor,storage_branch_id,storage_start,anniversary_day,fields) VALUES($1,$2,99,$3,ARRAY['stored_stock'],'stored_stock',0,100,$4,'2026-01-31',31,'{}')",
        [f.company, s.brand, s.otherTier, f.foreign],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      db.pool.query(
        'INSERT INTO commercial.tariff(company_id,id,tier_id,governorate_id,area_id,version,active,amount_minor) VALUES($1,$2,$3,$4,$5,1,true,0)',
        [f.company, randomUUID(), s.tier, s.cairo, s.foreignArea],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });
  it('preserves snapshot labels across renaming/deactivation and allows referenced masters to stop', async () => {
    const before = (
      await db.pool.query(
        'SELECT id,body FROM commercial.price_snapshot WHERE brand_id=$1 ORDER BY recorded_at LIMIT 1',
        [s.brand],
      )
    ).rows[0];
    await run(
      command({
        type: 'reference.update',
        entityId: s.cairo,
        expectedVersion: 1,
        fields: {
          kind: 'governorate',
          name: 'القاهرة بعد تغيير الاسم',
          active: false,
          parentId: null,
          volumeRange: null,
        },
      }),
    );
    await expect(preview()).rejects.toThrow('INVALID_GEOGRAPHY_OR_TIER');
    expect(
      (await db.pool.query('SELECT body FROM commercial.price_snapshot WHERE id=$1', [before.id]))
        .rows[0].body,
    ).toEqual(before.body);
    expect(before.body.governorateName).toBe('القاهرة');
    await run(
      command({
        type: 'reference.update',
        entityId: s.cairo,
        expectedVersion: 2,
        fields: {
          kind: 'governorate',
          name: 'القاهرة',
          active: true,
          parentId: null,
          volumeRange: null,
        },
      }),
    );
    const brand = await run(
      command({
        type: 'brand.create',
        fields: { ...s.brandFields, tierId: s.otherTier, name: 'إيقاف اتفاق محفوظ' },
      }),
    );
    const snapshot = await run(
      command({ type: 'pricing.snapshot', input: priceInput({ brandId: brand.entityId }) }),
    );
    await run(
      command({
        type: 'brand.update',
        entityId: brand.entityId,
        expectedVersion: 1,
        fields: { ...s.brandFields, tierId: s.otherTier, name: 'إيقاف اتفاق محفوظ', active: false },
      }),
    );
    await expect(preview({ brandId: brand.entityId })).rejects.toThrow('SERVICE_UNAVAILABLE');
    expect(
      (
        await db.pool.query('SELECT body FROM commercial.price_snapshot WHERE id=$1', [
          snapshot.entityId,
        ])
      ).rows[0].body,
    ).toEqual(snapshot.snapshot);
    await expect(
      db.pool.query('DELETE FROM commercial.brand WHERE id=$1', [brand.entityId]),
    ).rejects.toThrow('DEACTIVATE_MASTER');
  });
  it('reauthorizes snapshot result recovery after branch revocation; ordinary reference staff need no support', async () => {
    const input = command({ type: 'pricing.snapshot', input: priceInput() });
    const accepted = await http('/brands/commands', input, f.staffA.token, f.staffA.csrfToken);
    expect(accepted.status).toBe(200);
    await db.pool.query(
      'DELETE FROM access.user_branch WHERE company_id=$1 AND user_id=$2 AND branch_id=$3',
      [f.company, f.staffA.id, f.a],
    );
    expect(
      (
        await http(
          `/brands/commands/${input.commandId}?companyId=${f.company}&family=commercial.snapshot`,
          undefined,
          f.staffA.token,
        )
      ).status,
    ).toBe(403);
    await db.pool.query(
      "INSERT INTO access.user_exception VALUES($1,$2,'reference-data','allow')",
      [f.company, f.staffB.id],
    );
    const referenceOnly = await http(
      '/reference-data?companyId=' + f.company,
      undefined,
      f.staffB.token,
    );
    expect(referenceOnly.status).toBe(200);
    expect(referenceOnly.body.references.length).toBeGreaterThan(0);
    expect(referenceOnly.body.tariffs).toEqual([]);
    expect(
      (await http('/brands/catalog?companyId=' + f.company, undefined, f.staffB.token)).status,
    ).toBe(403);
    expect(
      (
        await http(
          '/brands/commands',
          command({
            type: 'reference.create',
            fields: {
              kind: 'tier',
              name: 'صلاحية المرجع العادية',
              active: true,
              parentId: null,
              volumeRange: null,
            },
          }),
          f.staffB.token,
          f.staffB.csrfToken,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await http(
          '/brands/commands',
          command({
            type: 'tariff.create',
            fields: {
              tierId: s.otherTier,
              governorateId: s.giza,
              areaId: null,
              amountMinor: '0',
              active: true,
            },
          }),
          f.staffB.token,
          f.staffB.csrfToken,
        )
      ).status,
    ).toBe(403);
  });
  it('returns retained stale rejection and repeatable seed identity without additional master rows', async () => {
    const stale = command({
      type: 'brand.update',
      entityId: s.brand,
      expectedVersion: 1,
      fields: s.brandFields,
    });
    const first = await http('/brands/commands', stale);
    expect(first.status).toBe(409);
    expect(
      await http(
        `/brands/commands/${stale.commandId}?companyId=${f.company}&family=commercial.brand`,
      ),
    ).toEqual(first);
    const before = (await db.pool.query('SELECT count(*) FROM commercial.brand')).rows[0].count;
    expect((await seedCommercial(db.pool, f.admin.token, f.company, f.a, 'test')).brand).toBe(
      s.brand,
    );
    expect((await db.pool.query('SELECT count(*) FROM commercial.brand')).rows[0].count).toBe(
      before,
    );
    expect((await db.pool.query('SELECT count(*) FROM kernel.journal_effect')).rows[0].count).toBe(
      '0',
    );
  });
  it('normalizes Arabic digits for indexed brand search and treats wildcard input literally', async () => {
    const created = await run(
      command({
        type: 'brand.create',
        fields: { ...s.brandFields, name: 'متجر ١٢٣ للملابس', externalReference: 'مرجع ٤٥٦' },
      }),
    );
    const result = await http('/brands?companyId=' + f.company + '&search=123');
    expect(result.body.items.map((b: { id: string }) => b.id)).toContain(created.entityId);
    const reference = await http(
      '/brands?companyId=' + f.company + '&search=' + encodeURIComponent('٤٥٦'),
    );
    expect(reference.body.items.map((b: { id: string }) => b.id)).toContain(created.entityId);
    expect((await http('/brands?companyId=' + f.company + '&search=%25')).body.total).toBe(0);
  });
});
