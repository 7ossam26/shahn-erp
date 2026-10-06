import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { ShipmentCommand } from '@shahn/contracts';
import { incidentFixture } from './fixtures.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof incidentFixture>>,
  incidentId: string;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await incidentFixture(db.pool);
  const x = await f.shipment(),
    r = await f.report(x.s.shipmentId);
  incidentId = r.result.incidentId;
  await f.confirm(incidentId);
});
afterAll(async () => {
  await db?.dispose();
});
const replacement = () => ({
  incidentId,
  payer: 'company' as const,
  reason: 'الشركة تتحمل شحن البديل بموجب الاتفاق المؤكد',
});
const lines = () => [
  {
    id: randomUUID(),
    description: 'بضاعة بديلة بعهدة جديدة',
    quantity: 1,
    unitDue: { currency: 'EGP' as const, amountMinor: '25000' },
  },
];
it('P18-AC-06/07 ordinary new receipt snapshots 250 goods / zero recipient shipping; real P13 projection posts one fee+waiver+commission and no brand shipping debit', async () => {
  const before = await f.counts();
  const x = await f.received({ replacement: replacement(), lines: lines() });
  const d = (await f.read(x.s.shipmentId))!;
  expect(d.price).toMatchObject({
    goodsDueMinor: '25000',
    recipientShippingMinor: '0',
    brandShippingMinor: '0',
    waiverMinor: '5000',
    recipientDueMinor: '25000',
  });
  expect(d.price.incidentAgreement?.incidentId).toBe(incidentId);
  expect(x.task.snapshot.shippingDue).toEqual({ currency: 'EGP', exponent: 2, amountMinor: 0 });
  expect(x.task.snapshot.lines[0]!.unitDue.amountMinor).toBe(25000);
  expect((await f.counts()).effects).toBe(before.effects); // creation/dispatch earns nothing
  const arrival = x.arrival();
  await f.receive(arrival);
  await f.drain();
  const outcome = await x.outcome('full');
  const event = f.event('outcome.recorded', { outcome }, x.task.taskId, 2);
  await f.receive(event);
  await f.drain();
  expect(outcome.collection).toMatchObject({
    goods: { amountMinor: 25000 },
    shipping: { amountMinor: 0 },
    reported: { amountMinor: 25000 },
  });
  const effects = async () =>
    (
      await db.pool.query(
        `SELECT e.family,e.kind,e.amount_minor::text amount FROM kernel.journal_effect e JOIN execution.visit_fact v ON(v.company_id,v.source_record_id)=(e.company_id,e.source_id) WHERE v.task_id=$1 ORDER BY e.family,e.kind`,
        [x.task.taskId],
      )
    ).rows;
  expect(await effects()).toEqual([
    { family: 'employee', kind: 'earning', amount: '500' },
    { family: 'operating', kind: 'shipping', amount: '5000' },
    { family: 'operating', kind: 'waiver', amount: '-5000' },
  ]);
  const count = await f.counts();
  await f.receive(arrival);
  await f.receive(event);
  await f.drain();
  expect(await f.counts()).toEqual(count);
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int n FROM kernel.journal_effect e JOIN execution.allocation a ON(a.company_id,a.source_record_id)=(e.company_id,e.source_id) JOIN execution.visit_fact v ON(v.company_id,v.id)=(a.company_id,a.visit_id) WHERE v.task_id=$1 AND e.kind='fee'`,
        [x.task.taskId],
      )
    ).rows[0].n,
  ).toBe(0);
});
it('P18-AC-07 replacement lost response recovers one reference; no cloned receipt and no unsupported payer', async () => {
  const original = await f.create({ replacement: replacement(), lines: lines() });
  const row = (
    await db.pool.query(
      `SELECT c.command_id FROM command_record c JOIN shipments.shipment s ON(s.company_id,s.command_record_id)=(c.company_id,c.id) WHERE s.id=$1`,
      [original.shipmentId],
    )
  ).rows[0];
  // Recover by persisted command identity, without resubmitting changed intake.
  const recovered = await shipmentCommands(db.pool).recover(
    f.admin.token,
    f.company,
    'shipment',
    row.command_id,
  );
  expect(recovered.body).toEqual(original);
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM incidents.replacement WHERE shipment_id=$1',
        [original.shipmentId],
      )
    ).rows[0].n,
  ).toBe(1);
  await expect(
    f.create({ replacement: { ...replacement(), payer: 'employee' as never }, lines: lines() }),
  ).rejects.toThrow();
  const d = (await f.read(original.shipmentId))!;
  const input: ShipmentCommand = {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'shipment.confirm',
    fields: { ...d.fields, lines: lines() },
    actualReceipt: false,
    duplicateAcknowledged: false,
    expectedPolicyVersion: d.price.policyVersion,
    expectedTariffVersion: d.price.tariffVersion,
    expectedTariffId: d.price.tariffId,
  };
  await expect(shipmentCommands(db.pool).execute(f.admin.token, input)).rejects.toThrow();
  expect((await f.incidentDetail(incidentId)).replacements.map((x) => x.id)).toContain(
    original.shipmentId,
  );
});
