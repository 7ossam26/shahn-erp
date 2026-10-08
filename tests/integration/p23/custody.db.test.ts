import { beforeEach, afterEach, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transferView } from '@shahn/database';
import type { GoodsTransferResult, ShipmentCommand } from '@shahn/contracts';
import { transferFixture } from '../p15/fixtures.js';
import { returnFixture } from '../p14/fixtures.js';
import { shipmentFields } from '../../support/shipments.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
import { ReportingService } from '../../../apps/api/src/modules/reporting/service.js';
import { renderXlsx, renderPdf } from '../../../apps/api/src/modules/reporting/render.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>;
const evidence: Record<string, unknown> = {};
beforeEach(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
});
afterEach(async () => {
  await db?.dispose();
});
afterAll(async () => {
  await writeFile('docs/verification/P23/custody.json', JSON.stringify(evidence, null, 2));
});
it('A08 physical10 reserved4 loose2 carrier: A8/4/4, destination0 then2, prepared components remain one claim', async () => {
  const f = await transferFixture(db.pool),
    service = new ReportingService(db.pool);
  await shipmentCommands(db.pool).execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'shipment.confirm',
    fields: shipmentFields(
      { brandId: f.brand, branchId: f.a, governorateId: f.seed.cairo },
      {
        service: 'stored_stock',
        lines: [
          {
            id: randomUUID(),
            variantId: f.variant,
            description: 'P23 reserve another2',
            quantity: 2,
            unitDue: { currency: 'EGP', amountMinor: '10000' },
          },
        ],
      },
    ),
    actualReceipt: false,
    duplicateAcknowledged: false,
    expectedPolicyVersion: 2,
    expectedTariffId: f.seed.base,
    expectedTariffVersion: 1,
  } as ShipmentCommand);
  const manifest = await f.create([
    { kind: 'loose', brandId: f.brand, variantId: f.variant, quantity: 2 },
  ]);
  const handed = (
    await f.send.execute(
      f.admin.token,
      f.command({
        type: 'goods.handover',
        manifestId: manifest.manifestId,
        expectedVersion: manifest.version,
        actualAt: new Date().toISOString(),
      }),
    )
  ).body as GoodsTransferResult;
  const report = (branchIds: string[]) =>
    service.create(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'report.snapshot',
      reportId: 'REP-18',
      filters: { branchIds },
      sort: 'dateAsc',
    });
  const before = await report([f.a, f.b]);
  expect(before.rows.find((r) => r.values['kind'] === 'stock')!.values).toMatchObject({
    onHand: '8',
    reserved: '4',
    available: '4',
    carrier: '2',
  });
  expect(await f.position(f.b)).toBeUndefined();
  const l = (await transferView(db.pool, f.company, manifest.manifestId))!.lines[0]!;
  await f.receive.execute(
    f.staffB.token,
    f.command({
      type: 'goods.receive',
      branchId: f.b,
      manifestId: manifest.manifestId,
      expectedVersion: handed.version,
      actualAt: new Date().toISOString(),
      lines: [
        {
          lineId: l.id,
          sound: 2,
          damaged: 0,
          uncertain: 0,
          inspection: 'counted-pieces',
          suspectedInternalIssue: false,
        },
      ],
    }),
  );
  const after = await report([f.a, f.b]);
  expect(after.snapshot.totals['onHand']).toBe('10');
  expect(after.snapshot.totals['carrier']).toBe('0');
  expect(after.rows.find((r) => r.values['branch'] === 'الفرع ب')!.values['available']).toBe('2');
  expect(
    (await service.page(f.admin.token, f.company, before.snapshot.id)).snapshot.totals['carrier'],
  ).toBe('2');
  evidence.stock = { before, after, variant: f.variant, manifest: manifest.manifestId };
  await writeFile(
    'docs/verification/P23/stock-transit.xlsx',
    await renderXlsx(before.snapshot, before.rows),
  );
  await writeFile(
    'docs/verification/P23/stock-transit.pdf',
    await renderPdf(before.snapshot, before.rows),
  );
});
it('A08 offered2 received1 and brand handover retain separate immutable receipt facts; unreceived date stays unknown', async () => {
  const f = await returnFixture(db.pool),
    x = await f.setup({ stock: true }),
    service = new ReportingService(db.pool);
  const input = {
    schemaVersion: 1 as const,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'report.snapshot' as const,
    reportId: 'REP-07' as const,
    filters: {},
    sort: 'dateAsc' as const,
  };
  const offered = await service.create(f.admin.token, input);
  expect(offered.rows[0]!.values).toMatchObject({ offered: '2', received: '0', date: null });
  expect(offered.snapshot.coverage.flags).toContain('UNKNOWN_BUSINESS_DATE');
  await f.commands.execute(f.admin.token, f.receiveInput(x.request, 1, 'sound', true));
  await f.accept();
  const received = await service.create(f.admin.token, { ...input, commandId: randomUUID() });
  expect(received.rows[0]!.values).toMatchObject({
    offered: '2',
    received: '1',
    sound: '1',
    handed: '0',
  });
  expect(received.rows[0]!.sourceIds.length).toBeGreaterThan(2);
  expect(
    (await service.page(f.admin.token, f.company, offered.snapshot.id)).rows[0]!.values['received'],
  ).toBe('0');
  const stock = await service.create(f.admin.token, {
    ...input,
    commandId: randomUUID(),
    reportId: 'REP-18',
  });
  expect(stock.rows.find((r) => r.values['kind'] === 'stock')!.values).toMatchObject({
    onHand: '1',
    available: '1',
    carrier: '1',
  });
  const lines = (
    await db.pool.query(
      `SELECT id,version,quantity FROM returns.return_receipt_line WHERE company_id=$1 AND shipment_id=$2`,
      [f.company, x.s.shipmentId],
    )
  ).rows;
  await f.commands.execute(
    f.admin.token,
    f.command({
      type: 'return.brandHandover',
      branchId: f.a,
      brandId: f.seed.brand,
      recipientName: 'P23 صاحب البراند',
      actualAt: new Date().toISOString(),
      actualHandover: true,
      allocations: lines.map((l) => ({
        receiptLineId: l.id,
        expectedVersion: l.version,
        quantity: 1,
      })),
    }),
  );
  const handed = await service.create(f.admin.token, { ...input, commandId: randomUUID() });
  expect(handed.rows[0]!.values['handed']).toBe('1');
  expect(handed.rows[0]!.values['handoverAt']).not.toBeNull();
  evidence.returns = { offered, received, handed, stock };
  await writeFile(
    'docs/verification/P23/returns-2-1.xlsx',
    await renderXlsx(handed.snapshot, handed.rows),
  );
  await writeFile(
    'docs/verification/P23/returns-2-1.pdf',
    await renderPdf(handed.snapshot, handed.rows),
  );
});
it('AC-REP-07 offered3 received2 handed1 leaves one received unit at the branch and one unresolved unit with the carrier', async () => {
  const f = await returnFixture(db.pool),
    x = await f.setup({ stock: true, outcome: 'refused' }),
    service = new ReportingService(db.pool);
  await f.commands.execute(f.admin.token, f.receiveInput(x.request, 2, 'sound', true));
  await f.accept();
  const line = (
    await db.pool.query(
      `SELECT id,version FROM returns.return_receipt_line WHERE company_id=$1 AND shipment_id=$2`,
      [f.company, x.s.shipmentId],
    )
  ).rows[0];
  await f.commands.execute(
    f.admin.token,
    f.command({
      type: 'return.brandHandover',
      branchId: f.a,
      brandId: f.seed.brand,
      recipientName: 'P23 صاحب البراند',
      actualAt: new Date().toISOString(),
      actualHandover: true,
      allocations: [{ receiptLineId: line.id, expectedVersion: line.version, quantity: 1 }],
    }),
  );
  const report = async (reportId: 'REP-07' | 'REP-18') =>
    service.create(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'report.snapshot',
      reportId,
      filters: {},
      sort: 'dateAsc',
    });
  const returns = await report('REP-07'),
    stock = await report('REP-18');
  expect(returns.rows[0]!.values).toMatchObject({ offered: '3', received: '2', handed: '1' });
  expect(stock.rows.find((r) => r.values['kind'] === 'stock')!.values).toMatchObject({
    onHand: '1',
    available: '1',
    carrier: '1',
  });
  evidence.return321 = { returns, stock };
});
