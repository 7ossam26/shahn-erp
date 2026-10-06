import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, employeeClock } from '@shahn/database';
import { validateIncidentViews, type IncidentResult } from '@shahn/contracts';
import { incidentFixture } from './fixtures.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof incidentFixture>>;
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await incidentFixture(db.pool);
});
afterAll(async () => {
  await db?.dispose();
});
it('dismissal releases an ordinary shipment hold while retaining history; another active report still blocks correction', async () => {
  const s = await f.create({
    lines: [
      {
        id: randomUUID(),
        description: 'Two inspected units',
        quantity: 2,
        unitDue: { currency: 'EGP', amountMinor: '20000' },
      },
    ],
  });
  const d = (await f.read(s.shipmentId))!;
  const correction = {
    schemaVersion: 1 as const,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'shipment.correct' as const,
    shipmentId: s.shipmentId,
    expectedVersion: d.version,
    fields: { ...d.fields, comment: 'Inspection completed without a compensation claim' },
    actualAtCorrectedBranch: false,
    duplicateAcknowledged: false,
    reason: 'Recorded inspection result',
  };
  const first = await f.report(s.shipmentId, { quantity: 1 });
  await expect(shipmentCommands(db.pool).execute(f.admin.token, correction)).rejects.toThrow(
    'INCIDENT_CUSTODY_HELD',
  );
  const second = await f.report(s.shipmentId, { offset: 1, quantity: 1 });
  const before = await f.counts();
  const dismiss = (id: string) =>
    f.service().execute(
      f.admin.token,
      f.incidentCommand({
        type: 'incident.dismiss',
        incidentId: id,
        expectedVersion: 1,
        reason: 'No confirmed claim after inspection',
      }),
    );
  await dismiss(first.result.incidentId);
  await expect(
    shipmentCommands(db.pool).execute(f.admin.token, { ...correction, commandId: randomUUID() }),
  ).rejects.toThrow('INCIDENT_CUSTODY_HELD');
  await dismiss(second.result.incidentId);
  // Rejected command results remain immutable; the changed state needs a new command.
  await expect(shipmentCommands(db.pool).execute(f.admin.token, correction)).rejects.toThrow(
    'INCIDENT_CUSTODY_HELD',
  );
  await shipmentCommands(db.pool).execute(f.admin.token, {
    ...correction,
    commandId: randomUUID(),
  });
  expect((await f.read(s.shipmentId))!.fields.comment).toBe(correction.fields.comment);
  expect(await f.counts()).toEqual(before);
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM incidents.shipment_hold WHERE company_id=$1 AND shipment_id=$2',
        [f.company, s.shipmentId],
      )
    ).rows[0].n,
  ).toBe(2);
  expect((await f.incidentDetail(first.result.incidentId)).state).toBe('dismissed');
});
it('P18-AC-01/02 report has no money; explicit 400/200/200 confirmation atomically posts eligible credit and original classified debt, no cash', async () => {
  const x = await f.shipment(),
    before = await f.counts(),
    r = await f.report(x.s.shipmentId);
  expect(await f.counts()).toEqual(before);
  const d = await f.incidentDetail(r.result.incidentId);
  expect(
    validateIncidentViews.detail!(d),
    JSON.stringify(validateIncidentViews.detail!.errors),
  ).toBe(true);
  expect(d.confirmation).toBeNull();
  expect((await f.preview(d.id)).blockers).toEqual([]);
  await f.confirm(d.id);
  const after = await f.incidentDetail(d.id);
  expect(after.confirmation?.effects.map((e) => [e.family, e.kind, e.amountMinor])).toEqual([
    ['brand', 'compensation', '40000'],
    ['employee', 'obligation', '20000'],
    ['operating', 'cost', '-40000'],
    ['operating', 'employee_compensation_share', '20000'],
  ]);
  expect(after.disposition.state).toBe('awaiting_request');
  expect(await f.counts()).toEqual({
    effects: before.effects + 4,
    lots: before.lots + 1,
    obligations: before.obligations + 1,
    cash: before.cash,
  });
  expect(
    (
      await db.pool.query(
        'SELECT readiness,amount_minor::text FROM kernel.credit_lot WHERE id=$1',
        [after.confirmation!.lotId],
      )
    ).rows[0],
  ).toEqual({ readiness: 'eligible', amount_minor: '40000' });
});
it('P18-AC-03 zero recipient goods still permits agreed 400 compensation; original branch is snapshotted', async () => {
  const x = await f.shipment(true),
    r = await f.report(x.s.shipmentId);
  expect((await f.read(x.s.shipmentId))!.price.goodsDueMinor).toBe('0');
  await f.confirm(
    r.result.incidentId,
    f.confirmation({ responsibleBranchId: f.b, branchReason: 'فرع المسؤولية الفعلي بحسب التحقيق' }),
  );
  const d = await f.incidentDetail(r.result.incidentId);
  expect(d.confirmation!.effects.every((e) => e.branchId === f.b)).toBe(true);
  expect(d.confirmation!.employeePayrollBranchId).toBe(f.a);
});
it('P18-AC-04 injected failure after wallet posting rolls back obligation, wallet, disposition and confirmation together', async () => {
  const x = await f.shipment(),
    r = await f.report(x.s.shipmentId),
    before = await f.counts();
  await expect(
    f.confirm(r.result.incidentId, undefined, {
      afterWallet: async () => {
        throw Error('P18_AFTER_WALLET');
      },
    }),
  ).rejects.toThrow('P18_AFTER_WALLET');
  expect(await f.counts()).toEqual(before);
  expect((await f.incidentDetail(r.result.incidentId)).state).toBe('reported');
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM incidents.disposition WHERE incident_id=$1',
        [r.result.incidentId],
      )
    ).rows[0].n,
  ).toBe(0);
});
it('P18-AC-04 rejects 399 shares, protected payroll, wrong scope and a second claimed subset without partial effects', async () => {
  const x = await f.shipment(),
    r = await f.report(x.s.shipmentId),
    before = await f.counts();
  await expect(
    f.confirm(r.result.incidentId, f.confirmation({ companyShareMinor: '19900' })),
  ).rejects.toThrow('INCIDENT_SHARES_MISMATCH');
  const month = (await employeeClock(db.pool)).month;
  await db.pool.query(
    `INSERT INTO employees.payroll_period(company_id,employee_id,month,state) VALUES($1,$2,$3,'frozen_unpaid') ON CONFLICT(company_id,employee_id,month) DO UPDATE SET state='frozen_unpaid',version=employees.payroll_period.version+1`,
    [f.company, f.employee.employeeId, month + '-01'],
  );
  const p = await f.preview(r.result.incidentId);
  expect(p.blockers).toContain('PAYROLL_PERIOD_PROTECTED');
  expect(p.allowedPayrollMonth! > month).toBe(true);
  await expect(f.confirm(r.result.incidentId)).rejects.toThrow();
  expect(await f.counts()).toEqual(before);
  await expect(f.report(x.s.shipmentId)).rejects.toThrow('INCIDENT_QUANTITY_CLAIMED');
  await f.confirm(r.result.incidentId, f.confirmation({ payrollMonth: p.allowedPayrollMonth }));
});
it('P18-AC-05 competing reports cannot reserve the same units; lost confirm response recovers one original result', async () => {
  const x = await f.shipment(),
    a = await Promise.allSettled([f.report(x.s.shipmentId), f.report(x.s.shipmentId)]);
  expect(a.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  const r = a.find((x) => x.status === 'fulfilled');
  if (r?.status !== 'fulfilled') throw Error('NO_WINNER');
  const p = await f.preview(r.value.result.incidentId);
  const input = f.incidentCommand({
    type: 'incident.confirm',
    incidentId: r.value.result.incidentId,
    confirmation: f.confirmation({ payrollMonth: p.allowedPayrollMonth }),
  });
  const replies = await Promise.all([
    f.service().execute(f.admin.token, input),
    f.service().execute(f.admin.token, input),
  ]);
  expect(replies[0]).toEqual(replies[1]);
  expect(await f.service().recover(f.admin.token, f.company, 'incidents', input.commandId)).toEqual(
    replies[0],
  );
  await expect(
    f.service().execute(f.admin.token, { ...input, commandId: randomUUID() }),
  ).rejects.toThrow('REVISION_CONFLICT');
});
it('P18-AC-08 P14 exact disposition queues durably without receipt or available stock; financial confirmation remains separate', async () => {
  const x = await f.setup({ outcome: 'refused' }),
    r = await f.report(x.s.shipmentId, { quantity: 1 }),
    p = await f.preview(r.result.incidentId);
  await f.confirm(r.result.incidentId, f.confirmation({ payrollMonth: p.allowedPayrollMonth }));
  const d = await f.incidentDetail(r.result.incidentId);
  expect(d.disposition.state).toBe('pending');
  expect(d.disposition.actionIds).toHaveLength(1);
  const command = (
    await db.pool.query('SELECT request_body FROM integration.source_command WHERE action_id=$1', [
      d.disposition.actionIds[0],
    ])
  ).rows[0];
  expect(JSON.parse(command.request_body).operationId).toBe('return.recordDisposition');
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int n FROM returns.return_receipt_line WHERE shipment_id=$1',
        [x.s.shipmentId],
      )
    ).rows[0].n,
  ).toBe(0);
  await f.accept();
  expect((await f.incidentDetail(d.id)).disposition.state).toBe('accepted');
});
it('P18-AC-09 immutable history and affected credit hold route to P21 review; dismissal and zero-value reporting create no money', async () => {
  const x = await f.shipment(),
    r = await f.report(x.s.shipmentId),
    p = await f.preview(r.result.incidentId);
  await f.confirm(r.result.incidentId, f.confirmation({ payrollMonth: p.allowedPayrollMonth }));
  const d = await f.incidentDetail(r.result.incidentId);
  await expect(
    db.pool.query('UPDATE incidents.confirmation SET compensation_minor=1 WHERE incident_id=$1', [
      d.id,
    ]),
  ).rejects.toThrow();
  await f.service().execute(
    f.admin.token,
    f.incidentCommand({
      type: 'incident.review',
      incidentId: d.id,
      expectedVersion: 2,
      reason: 'مراجعة تصحيح مرتبط دون تعديل الأصل',
    }),
  );
  const review = await f.incidentDetail(d.id);
  expect(review.review?.holdMinor).toBe('40000');
  expect(review.confirmation).toEqual(d.confirmation);
  const y = await f.shipment(true),
    z = await f.report(y.s.shipmentId),
    before = await f.counts();
  await expect(
    f.confirm(
      z.result.incidentId,
      f.confirmation({
        compensationMinor: '0',
        goodsValueMinor: '0',
        companyShareMinor: '0',
        employeeShareMinor: '0',
        employeeId: null,
        payrollMonth: null,
      }),
    ),
  ).rejects.toThrow();
  const input = f.incidentCommand({
    type: 'incident.dismiss',
    incidentId: z.result.incidentId,
    expectedVersion: 1,
    reason: 'لا توجد مطالبة مالية مؤكدة',
  });
  await f.service().execute(f.admin.token, input);
  expect((await f.incidentDetail(z.result.incidentId)).state).toBe('dismissed');
  expect(await f.counts()).toEqual(before);
});
it('warehouse loss cannot charge an employee and holds original shipment from ordinary dispatch/edit', async () => {
  const s = await f.create({
      lines: [
        {
          id: randomUUID(),
          description: 'بضاعة',
          quantity: 1,
          unitDue: { currency: 'EGP', amountMinor: '40000' },
        },
      ],
    }),
    r = await f.report(s.shipmentId, { kind: 'loss' });
  await expect(f.confirm(r.result.incidentId)).rejects.toThrow(
    'WAREHOUSE_LOSS_COMPANY_RESPONSIBILITY',
  );
  await f.confirm(
    r.result.incidentId,
    f.confirmation({
      companyShareMinor: '40000',
      employeeShareMinor: '0',
      employeeId: null,
      payrollMonth: null,
    }),
  );
  const d = await f.incidentDetail(r.result.incidentId);
  expect(d.confirmation!.effects).toHaveLength(2);
  const { dispatchCommands } =
    await import('../../../apps/api/src/modules/dispatch/dispatch.service.js');
  await expect(
    dispatchCommands(db.pool).execute(f.admin.token, f.prepareInput([s])),
  ).rejects.toThrow('INCIDENT_CUSTODY_HELD');
  expect(
    (await f.service().recover(f.admin.token, f.company, 'incidents', r.input.commandId))
      .body as IncidentResult,
  ).toEqual(r.result);
});
it('unavailable source operation does not drop local compensation; explicit follow-up queues the same affected subset with no second money', async () => {
  const x = await f.setup({ outcome: 'refused' }),
    r = await f.report(x.s.shipmentId, { quantity: 1 });
  await db.pool.query(
    `UPDATE integration.source SET configuration=jsonb_set(configuration,'{allowedOperations}',(configuration->'allowedOperations')-'return.recordDisposition') WHERE company_id=$1`,
    [f.company],
  );
  const p = await f.preview(r.result.incidentId);
  await f.confirm(r.result.incidentId, f.confirmation({ payrollMonth: p.allowedPayrollMonth }));
  const d = await f.incidentDetail(r.result.incidentId);
  expect(d.disposition.state).toBe('awaiting_dependency');
  const before = await f.counts();
  await db.pool.query(
    `UPDATE integration.source SET configuration=jsonb_set(configuration,'{allowedOperations}',(configuration->'allowedOperations')||'["return.recordDisposition"]'::jsonb) WHERE company_id=$1`,
    [f.company],
  );
  const input = f.incidentCommand({
    type: 'incident.disposition',
    incidentId: d.id,
    expectedVersion: 2,
    reason: 'إتاحة العملية المسموحة',
  });
  const first = await f.service().execute(f.admin.token, input);
  expect(await f.service().execute(f.admin.token, input)).toEqual(first);
  expect(await f.counts()).toEqual(before);
  expect((await f.incidentDetail(d.id)).disposition.state).toBe('pending');
  await f.accept();
  expect((await f.incidentDetail(d.id)).disposition.state).toBe('accepted');
});
