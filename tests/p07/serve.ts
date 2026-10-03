import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { createApplication } from '../../apps/api/src/app.js';
import { seedStockFulfillment } from '../support/stock-fulfillment.js';
import { seedInventory } from '../../apps/api/src/modules/inventory/seed.js';
import { seedCommercial } from '../../apps/api/src/modules/brands/seed.js';
import { seedShipments } from '../../apps/api/src/modules/shipments/seed.js';
import { commercialCommands } from '../../apps/api/src/modules/brands/service.js';
import { readTariffs } from '@shahn/database';
import { randomUUID } from 'node:crypto';
import { cookie } from '../../apps/api/src/modules/access/http.js';
import { accessFixture, fixtureConfig } from '../support/access.js';
const origin = 'http://127.0.0.1:5309',
  secret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
try {
  await migrate(db.pool);
} catch (error) {
  await db.dispose();
  throw error;
}
const fixture = await accessFixture(db.pool, fixtureConfig(origin));
const app = await createApplication(
  { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
  fixture.config,
);
const seed = await seedCommercial(db.pool, fixture.admin.token, fixture.company, fixture.a, 'test');
await commercialCommands(db.pool).execute(fixture.admin.token, {
  schemaVersion: 1,
  companyId: fixture.company,
  commandId: randomUUID(),
  type: 'brand.update',
  entityId: seed.brand,
  expectedVersion: 1,
  fields: {
    ...seed.brandFields,
    services: ['brand_packed', 'company_packed', 'stored_stock'],
    storage: {
      monthlyFeeMinor: '10000',
      branchId: fixture.a,
      startDate: '2026-10-01',
      anniversaryDay: 1,
      active: true,
      stopDate: null,
    },
  },
});
const stockSeed = await seedStockFulfillment(
  db.pool,
  fixture.admin.token,
  fixture.company,
  fixture.a,
  seed.brand,
  seed.cairo,
  seed.base,
);
const inventorySeed = await seedInventory(
  db.pool,
  fixture.admin.token,
  fixture.company,
  fixture.a,
  seed.brand,
  'test',
);
const shipmentSeed = await seedShipments(
  db.pool,
  fixture.admin.token,
  {
    companyId: fixture.company,
    branchId: fixture.a,
    brandId: seed.brand,
    governorateId: seed.cairo,
  },
  'test',
);
// This disposable harness alone exposes fixture login; the API application never does.
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/intake-login', async (_request, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', fixture.admin.token, 1800));
    return reply.redirect('/shipments/new');
  });
app
  .getHttpAdapter()
  .getInstance()
  .get('/api/test/intake-staff-login', async (_request, reply) => {
    reply.header('Set-Cookie', cookie('erp_session', fixture.staffA.token, 1800));
    return reply.redirect('/');
  });
await writeFile(
  `docs/verification/P07/seed-ids-${Date.now()}.json`,
  JSON.stringify(
    {
      ...inventorySeed,
      stockSeed,
      shipmentSeed,
      branchB: fixture.b,
      staffA: fixture.staffA.id,
      staffAB: fixture.staffAB.id,
    },
    null,
    2,
  ),
);
await app.listen(4309, '127.0.0.1');
const web = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'apps/web/vite.config.ts',
    '--port',
    '5309',
    '--strictPort',
  ],
  {
    env: {
      ...process.env,
      API_PROXY_TARGET: 'http://127.0.0.1:4309',
    },
    stdio: 'ignore',
    windowsHide: true,
  },
);
await writeFile(
  'tests/.p07-runtime.json',
  JSON.stringify({
    token: fixture.admin.token,
    companyId: fixture.company,
    csrfToken: fixture.admin.csrfToken,
    staffToken: fixture.staffA.token,
    seed,
    inventorySeed,
    stockSeed,
    shipmentSeed,
    branchB: fixture.b,
    secret,
  }),
  { mode: 0o600 },
);
let stopping = false;
const control = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.end('ready');
    return;
  }
  if (req.headers['x-test-secret'] !== secret) {
    res.statusCode = 403;
    res.end();
    return;
  }
  if (req.url === '/stop') {
    res.end('stopping');
    void stop();
    return;
  }
  if (req.url === '/statistics') {
    const counts = (
      await db.pool.query(
        `SELECT (SELECT count(*)::int FROM shipments.shipment) AS shipments,(SELECT count(*)::int FROM shipments.receipt) AS receipts,(SELECT count(*)::int FROM shipments.event WHERE kind='prepared') AS completions,(SELECT count(*)::int FROM kernel.journal_effect) AS journal`,
      )
    ).rows[0];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(counts));
    return;
  }
  if (req.url === '/change-tariff') {
    const tariff = (await readTariffs(db.pool, fixture.company)).find((t) => t.id === seed.base)!;
    await commercialCommands(db.pool).execute(fixture.admin.token, {
      schemaVersion: 1,
      companyId: fixture.company,
      commandId: randomUUID(),
      type: 'tariff.update',
      entityId: tariff.id,
      expectedVersion: tariff.version,
      fields: {
        tierId: tariff.tierId,
        governorateId: tariff.governorateId,
        areaId: null,
        amountMinor: '9900',
        active: true,
      },
    });
    res.end('fixture tariff edited');
    return;
  }
  if (req.url === '/revoke-a' || req.url === '/restore-a') {
    if (req.url === '/revoke-a')
      await db.pool.query('DELETE FROM access.user_branch WHERE user_id=$1 AND branch_id=$2', [
        fixture.admin.id,
        fixture.a,
      ]);
    else
      await db.pool.query(
        'INSERT INTO access.user_branch VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [fixture.company, fixture.admin.id, fixture.a],
      );
    res.end('fixture scope changed');
    return;
  }
  res.statusCode = 404;
  res.end();
});
async function stop() {
  if (stopping) return;
  stopping = true;
  web.kill();
  await app.close();
  await db.dispose();
  await unlink('tests/.p07-runtime.json').catch(() => {});
  control.close();
  process.exit(0);
}
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {}
  if (i === 99) {
    await stop();
    throw Error('TRIAL_WEB_START_FAILED');
  }
  await new Promise((r) => setTimeout(r, 200));
}
control.listen(4310, '127.0.0.1');
if (process.env['P07_MANUAL_TRIAL'] === 'true')
  console.log(
    'Isolated P07 trial: http://127.0.0.1:5309/api/test/intake-login — Ctrl+C stops this fixture.',
  );
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
