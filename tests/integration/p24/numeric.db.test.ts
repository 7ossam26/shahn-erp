import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { afterAll, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transferView, readShipment } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type {
  DispatchResult,
  GoodsTransferCommand,
  GoodsTransferResult,
  ProfitActualMoney,
  ProfitSummary,
  ReportFilters,
  ReportPage,
  ExportJob,
} from '@shahn/contracts';
import type { OutcomeRecord } from '@shahn/contracts/execution';
import { storageFixture } from '../p19/fixtures.js';
import { payrollFixture, offsetMonth, deferred } from '../p20/fixtures.js';
import { incidentFixture } from '../p18/fixtures.js';
import { ReportingService } from '../../../apps/api/src/modules/reporting/service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import {
  ExportWorker,
  exportCommands,
  downloadExport,
} from '../../../apps/api/src/modules/reporting/exports.js';
import { goodsTransferCommands } from '../../../apps/api/src/modules/goods-transfers/transfer.service.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
import { dispatchCommands } from '../../../apps/api/src/modules/dispatch/dispatch.service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { employeeCommands } from '../../../apps/api/src/modules/employees/service.js';

const evidence: Record<string, unknown> = {};
afterAll(async () => {
  await mkdir('docs/verification/P24', { recursive: true });
  await writeFile(
    'docs/verification/P24/numeric-acceptance.json',
    JSON.stringify(evidence, null, 2),
  );
});
const profit = (r: ReportPage) => r.snapshot.context['profit'] as ProfitSummary;
const money = (r: ReportPage) => r.snapshot.context['actualMoney'] as ProfitActualMoney;
const category = (r: ReportPage, key: string) =>
  profit(r).categories.find((c) => c.category === key)!;

it('A02 complete storage fee belongs to January/agreement A despite advance and partial receipts at B; persisted XLSX/PDF use the same rows', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const f = await storageFixture(db.pool),
      reporting = new ReportingService(db.pool);
    const report = (filters: ReportFilters) =>
      reporting.create(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'report.snapshot',
        reportId: 'REP-15',
        filters,
        sort: 'dateAsc',
      });
    const brand = await f.brand('P24-A02 اشتراك يناير', '2027-01-20', '31000', f.a);
    const receipt = await f.pay(f.storB, f.scope(brand.brandId, f.b, f.bCash, '50000'));
    expect((await f.detail(brand.agreementId)).credit.unallocatedMinor).toBe('50000');
    const before = await report({ from: '2027-01-01', to: '2027-01-31' });
    expect(category(before, 'storage_revenue').amountMinor).toBe('0');
    expect(money(before).storageCreditMinor).toBe('50000');
    const cashBeforeStart = await f.balance(f.bCash);
    f.clock.today = '2027-01-20';
    await f.renewAll();
    const jan = await report({ from: '2027-01-01', to: '2027-01-31' });
    expect(category(jan, 'storage_revenue').amountMinor).toBe('31000');
    expect(profit(jan).branches.find((b) => b.branchId === f.a)?.profitMinor).toBe('31000');
    expect(profit(jan).branches.find((b) => b.branchId === f.b)?.profitMinor).toBe('0');
    expect(money(jan).storageCreditMinor).toBe('19000');
    expect(money(jan).storageDueMinor).toBe('0');
    expect(await f.balance(f.bCash)).toBe(cashBeforeStart);
    const feb = await report({ from: '2027-02-01', to: '2027-02-19' });
    expect(category(feb, 'storage_revenue').amountMinor).toBe('0');
    // Second genuine period: a partial100 receipt changes due only; recognition stays310.
    const partial = await f.brand('P24-A02 سداد جزئي', '2027-01-20', '31000', f.a);
    await f.renewAll();
    const paid = await f.pay(f.storB, f.scope(partial.brandId, f.b, f.bCash, '10000'));
    await f.service().recordPayment(f.storB.token, paid.command);
    await f.service().recordPayment(f.storB.token, receipt.command);
    const partialReport = await report({ from: '2027-01-01', to: '2027-01-31' });
    expect(category(partialReport, 'storage_revenue')).toMatchObject({
      amountMinor: '62000',
      sourceCount: 2,
    });
    expect(money(partialReport).storageDueMinor).toBe('21000');
    expect(money(partialReport).storageCreditMinor).toBe('19000');
    expect(new Set(partialReport.rows.map((r) => r.id)).size).toBe(partialReport.rows.length);
    const artifacts: Record<string, unknown> = {};
    for (const format of ['xlsx', 'pdf'] as const) {
      const job = (
        await exportCommands(db.pool).execute(f.admin.token, {
          schemaVersion: 1,
          commandId: randomUUID(),
          companyId: f.company,
          type: 'report.export',
          snapshotId: partialReport.snapshot.id,
          filterDigest: partialReport.snapshot.filterDigest,
          format,
        })
      ).body as ExportJob;
      await new ExportWorker(db.pool).runOne();
      const artifact = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'reports', (u) =>
        downloadExport(u, job.id),
      );
      if (format === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Uint8Array.from(artifact.bytes!).buffer);
        const sourceSheet = workbook.getWorksheet('المصادر')!;
        expect(sourceSheet.rowCount).toBe(partialReport.rows.length + 1);
        const main = workbook.getWorksheet('التقرير')!;
        expect(String(main.getCell('A5').value)).toContain(partialReport.snapshot.id);
        expect(main.getCell('C8').value).toBe('310.00');
        expect(main.getCell('C9').value).toBe('310.00');
      } else expect(artifact.bytes!.subarray(0, 5).toString()).toBe('%PDF-');
      await writeFile(`docs/verification/P24/storage-january-620.${format}`, artifact.bytes!);
      artifacts[format] = { jobId: job.id, sha256: artifact.sha256, bytes: artifact.bytes!.length };
    }
    const secondPartial = await f.pay(f.storB, f.scope(partial.brandId, f.b, f.bCash, '5000'));
    const fanout = await report({ from: '2027-01-01', to: '2027-01-31' });
    expect(category(fanout, 'storage_revenue')).toMatchObject({
      amountMinor: '62000',
      sourceCount: 2,
    });
    expect(money(fanout).storageDueMinor).toBe('16000');
    expect(money(fanout).storageCreditMinor).toBe('19000');
    expect((await f.detail(partial.agreementId)).receipts.map((r) => r.receiptId)).toHaveLength(2);
    evidence['A02'] = {
      companyId: f.company,
      agreementBranch: f.a,
      paymentBranch: f.b,
      brand,
      partial,
      before,
      jan,
      feb,
      partialReport,
      cashBeforeStart,
      artifacts,
      fanout,
      secondPartialCommandId: secondPartial.command.commandId,
    };
  } finally {
    await db.dispose();
  }
}, 120000);

it('A05 native late earning resolves into a future payroll month while retaining its original work period; racing frozen reports stay coherent', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const incidents = await incidentFixture(db.pool),
      f = await payrollFixture(db.pool, undefined, incidents);
    const employeeId = incidents.employee.employeeId;
    const employeeVersion = (
      await db.pool.query('SELECT version FROM employees.employee WHERE company_id=$1 AND id=$2', [
        f.company,
        employeeId,
      ])
    ).rows[0].version;
    await expect(
      employeeCommands(db.pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'employee.link',
        employeeId,
        expectedVersion: employeeVersion,
        effectiveDate: '2026-01-01',
        endDate: null,
        driverId: incidents.driver,
        localDriver: null,
        reason: 'P24 historical setup boundary: no fabricated backdated driver link',
      }),
    ).rejects.toThrow('WORK_DATE_PROTECTED');
    const initial = await f.read(employeeId);
    expect(initial.calculation.netPayable).toBe('0');
    await f.service().execute(f.admin.token, f.command(initial, { type: 'payroll.zero-close' }));
    const monthEnd = new Date(Date.UTC(Number(f.month.slice(0, 4)), Number(f.month.slice(5, 7)), 0))
      .toISOString()
      .slice(0, 10);
    const filters: ReportFilters = { from: f.month + '-01', to: monthEnd };
    const reporting = new ReportingService(db.pool),
      command = () => ({
        schemaVersion: 1 as const,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'report.snapshot' as const,
        reportId: 'REP-15' as const,
        filters,
        sort: 'dateAsc' as const,
      });
    const original = await reporting.create(f.admin.token, command());
    expect(profit(original).profitMinor).toBe('0');
    const visit = await incidents.received({
      service: 'company_packed',
      brandReference: 'P24-A05-LATE-COMMISSION',
    });
    const arrival = visit.arrival();
    await incidents.receive(arrival);
    await incidents.drain();
    const current = await f.read(employeeId);
    const review = current.reviews.find((r) => r.kind === 'late_commission' && !r.resolvedMonth)!;
    expect(review).toMatchObject({
      workMonth: f.month,
      workDate: f.now.today,
      amountMinor: '500',
      postedMinor: '0',
    });
    expect(current.calculation).toEqual(initial.calculation);
    const next = await f.read(employeeId, offsetMonth(f.month, 1));
    const correction = f.command(next, {
      type: 'payroll.resolve',
      reviewId: review.id,
      reason: 'P24 late immutable visit earning linked to original work period',
    });
    const writer = await f.make('p24-independent-earning-corrector', [f.a, f.b], f.adminRole);
    const atSource = deferred(),
      release = deferred();
    const racing = new ReportingService(db.pool, {
      afterSourceRead: async () => {
        atSource.resolve();
        await release.promise;
      },
    });
    const pending = racing.create(f.admin.token, command());
    await atSource.promise;
    let corrected: unknown;
    try {
      corrected = await f.service().execute(writer.token, correction);
    } finally {
      release.resolve();
    }
    const before = await pending;
    expect(profit(before).shipping.grossMinor).toBe('5500');
    expect(profit(before).payroll.commissionMinor).toBe('0');
    expect(profit(before).calculationComplete).toBe(false);
    const fresh = await reporting.create(f.admin.token, command());
    expect(profit(fresh).shipping.grossMinor).toBe('5500');
    expect(profit(fresh).payroll.commissionMinor).toBe('500');
    expect(profit(fresh).profitMinor).toBe('5000');
    expect(profit(fresh).calculationComplete).toBe(true);
    const detail = await reporting.category(
      f.admin.token,
      f.company,
      fresh.snapshot.id,
      'employee_commission',
    );
    expect(detail.rows).toHaveLength(1);
    expect(detail.rows[0]!.economicEffect).toMatchObject({
      amountMinor: '-500',
      effectiveDate: review.workDate,
      employeeId,
      correctionOf: [review.visitId],
    });
    expect(Date.parse(detail.rows[0]!.economicEffect!.recordedAt)).toBeGreaterThan(
      Date.parse(before.snapshot.asOf),
    );
    const rereadOriginal = await reporting.page(f.admin.token, f.company, original.snapshot.id);
    const rereadRace = await reporting.page(f.admin.token, f.company, before.snapshot.id);
    expect(profit(rereadOriginal)).toEqual(profit(original));
    expect(profit(rereadRace)).toEqual(profit(before));
    expect(rereadRace.snapshot.dataDigest).toBe(before.snapshot.dataDigest);
    expect(await f.service().execute(writer.token, correction)).toEqual(corrected);
    expect(profit(await reporting.create(f.admin.token, command()))).toEqual(profit(fresh));
    evidence['A05-native-late'] = {
      companyId: f.company,
      employeeId,
      originalWorkMonth: f.month,
      settlementMonth: offsetMonth(f.month, 1),
      historicalSetupRejection: 'WORK_DATE_PROTECTED for January2026 employee/driver link',
      review,
      original,
      before,
      fresh,
      detail,
      calendarExampleLimitation:
        'The real database clock is October2026. The native connected test uses original October work and a future November payroll settlement. January-effective/February-recorded arithmetic is separately unit-tested; no fabricated February database recorded timestamp is claimed.',
    };
  } finally {
    await db.dispose();
  }
}, 120000);

it('A03 salary6000 minus entitlement200 costs5800; advance1000 and separately linked incident100 yield payout4700 without another profit recovery', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const incidents = await incidentFixture(db.pool),
      f = await payrollFixture(db.pool, undefined, incidents),
      reporting = new ReportingService(db.pool);
    const employee = incidents.employee;
    const version = (
      await db.pool.query('SELECT version FROM employees.employee WHERE company_id=$1 AND id=$2', [
        f.company,
        employee.employeeId,
      ])
    ).rows[0].version;
    await employeeCommands(db.pool).execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'employee.terms',
      employeeId: employee.employeeId,
      expectedVersion: version,
      change: {
        salary: {
          month: f.month,
          terms: { enabled: true, monthly: { currency: 'EGP', amountMinor: '600000' } },
        },
        commission: null,
        reason: 'P24 salary6000 original driver custody',
      },
    });
    await f.issue(employee.employeeId, '100000');
    await f.adjustment(employee.employeeId, '20000');
    const preview = await f.read(employee.employeeId);
    expect(preview.calculation).toMatchObject({
      employeeCost: '580000',
      netPayable: '480000',
      advanceRecovered: '100000',
      earningDeductionsRecovered: '20000',
    });
    const shipment = await incidents.received({
      brandReference: 'P24-A03-INCIDENT',
      lines: [
        {
          id: randomUUID(),
          description: 'حادث بضاعة مع حصة موظف',
          quantity: 1,
          unitDue: { currency: 'EGP', amountMinor: '10000' },
        },
      ],
    });
    const incident = await incidents.report(shipment.s.shipmentId);
    await incidents.confirm(
      incident.result.incidentId,
      incidents.confirmation({
        goodsValueMinor: '10000',
        compensationMinor: '10000',
        companyShareMinor: '0',
        employeeShareMinor: '10000',
        employeeId: employee.employeeId,
        payrollMonth: f.month,
      }),
    );
    const revised = await f.read(employee.employeeId);
    expect(revised.calculation).toMatchObject({
      employeeCost: '580000',
      netPayable: '470000',
      newIncidentDeductions: '10000',
    });
    const command = f.command(revised, { type: 'payroll.payout', funding: f.funding });
    await f.service().execute(f.admin.token, command);
    const monthEnd = new Date(Date.UTC(Number(f.month.slice(0, 4)), Number(f.month.slice(5, 7)), 0))
      .toISOString()
      .slice(0, 10);
    const report = () =>
      reporting.create(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'report.snapshot',
        reportId: 'REP-15',
        filters: { from: f.month + '-01', to: monthEnd },
        sort: 'dateAsc',
      });
    const first = await report();
    expect(profit(first).payroll).toMatchObject({
      salaryMinor: '600000',
      employeeCostMinor: '580000',
      entitlementDeductionsMinor: '20000',
      advanceRecoveryMinor: '100000',
      incidentRecoveryWithheldMinor: '10000',
      payoutMinor: '470000',
    });
    expect(category(first, 'employee_compensation_share')).toMatchObject({
      amountMinor: '10000',
      sourceCount: 1,
    });
    await f.service().execute(f.admin.token, command);
    const next = await f.read(employee.employeeId, offsetMonth(f.month, 1));
    expect(next.calculation.newIncidentDeductions).toBe('0');
    const retry = await report();
    expect(profit(retry)).toEqual(profit(first));
    expect(
      (
        await db.pool.query(
          "SELECT count(*)::int n FROM employees.payroll_recovery r JOIN employees.payroll_obligation o ON(o.company_id,o.id)=(r.company_id,r.obligation_id) WHERE r.company_id=$1 AND r.employee_id=$2 AND o.kind='incident'",
          [f.company, employee.employeeId],
        )
      ).rows[0].n,
    ).toBe(1);
    evidence['A03'] = {
      companyId: f.company,
      employeeId: employee.employeeId,
      incidentId: incident.result.incidentId,
      preview,
      revised,
      first,
      retry,
      next,
    };
  } finally {
    await db.dispose();
  }
}, 120000);

it('A04 actual intake/packing A and internal transfer earn no visit; B earns tariff55 and commission5, replacement waives55 while goods250 remain outside revenue', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const f = await incidentFixture(db.pool),
      reporting = new ReportingService(db.pool),
      today = cairoDate(new Date());
    const report = () =>
      reporting.create(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'report.snapshot',
        reportId: 'REP-15',
        filters: { from: today, to: today },
        sort: 'dateAsc',
      });
    const base = () => ({
      schemaVersion: 1 as const,
      companyId: f.company,
      commandId: randomUUID(),
    });
    const moveAndDispatch = async (extra: Parameters<typeof f.create>[0] = {}) => {
      const shipment = await f.create({
        ...extra,
        service: 'company_packed',
        lines: [
          {
            id: randomUUID(),
            description: 'بضاعة ٢٥٠ مستقلة عن ربح الشحن',
            quantity: 1,
            unitDue: { currency: 'EGP', amountMinor: '25000' },
          },
        ],
      });
      await shipmentCommands(db.pool).execute(f.admin.token, {
        ...base(),
        type: 'shipment.prepare',
        shipmentId: shipment.shipmentId,
        expectedVersion: shipment.version,
      });
      const packed = (await readShipment(db.pool, f.company, shipment.shipmentId))!;
      expect(packed.price.tariffMinor).toBe('5500');
      const send = goodsTransferCommands(db.pool, 'send'),
        receive = goodsTransferCommands(db.pool, 'receive');
      const manifest = (
        await send.execute(f.admin.token, {
          ...base(),
          type: 'goods.create',
          branchId: f.a,
          destinationBranchId: f.b,
          driverId: f.driver,
          plannedAt: new Date().toISOString(),
          lines: [{ kind: 'parcel', shipmentId: packed.id, expectedVersion: packed.version }],
        } as GoodsTransferCommand)
      ).body as GoodsTransferResult;
      const handed = (
        await send.execute(f.admin.token, {
          ...base(),
          type: 'goods.handover',
          branchId: f.a,
          manifestId: manifest.manifestId,
          expectedVersion: manifest.version,
          actualAt: new Date().toISOString(),
        } as GoodsTransferCommand)
      ).body as GoodsTransferResult;
      const view = (await transferView(db.pool, f.company, manifest.manifestId))!;
      await receive.execute(f.admin.token, {
        ...base(),
        type: 'goods.receive',
        branchId: f.b,
        manifestId: manifest.manifestId,
        expectedVersion: handed.version,
        actualAt: new Date().toISOString(),
        lines: [
          {
            lineId: view.lines[0]!.id,
            sound: 1,
            damaged: 0,
            uncertain: 0,
            inspection: 'parcel-exterior',
            suspectedInternalIssue: false,
          },
        ],
      } as GoodsTransferCommand);
      const moved = (await readShipment(db.pool, f.company, shipment.shipmentId))!;
      expect(moved.fields.branchId).toBe(f.b);
      const service = dispatchCommands(db.pool);
      const intent = (
        await service.execute(f.admin.token, {
          ...base(),
          type: 'dispatch.prepare',
          branchId: f.b,
          driverId: f.driver,
          items: [{ shipmentId: moved.id, expectedVersion: moved.version }],
        })
      ).body as DispatchResult;
      await f.completeNext();
      await f.completeNext();
      const accepted = await f.detail(intent.intentId);
      await service.execute(f.admin.token, {
        ...base(),
        type: 'dispatch.receive',
        intentId: accepted.id,
        expectedVersion: accepted.version,
        receiptAsserted: true,
      });
      await f.completeNext();
      const task = f.tasks.get('shipment:' + moved.id)!;
      const roundId = randomUUID(),
        workdayId = randomUUID(),
        attemptId = randomUUID();
      await f.receive(
        f.event(
          'round.started',
          {
            roundId,
            workdayId,
            driverId: f.driverResource,
            startedAt: new Date().toISOString(),
            firstPlanId: randomUUID(),
            firstForecastId: randomUUID(),
            firstWorkloadId: randomUUID(),
            taskIds: [task.taskId],
          },
          roundId,
          1,
          'trip',
        ),
      );
      await f.drain();
      const preVisit = await report();
      await f.receive(
        f.event(
          'current.arrivalRecorded',
          {
            roundId,
            driverId: f.driverResource,
            taskId: task.taskId,
            attemptId,
            activityRevision: 2,
            stage: 'arrived',
            time: f.time(),
          },
          task.taskId,
          1,
        ),
      );
      await f.drain();
      const branch = (
        await db.pool.query(
          "SELECT resource_id FROM integration.binding WHERE company_id=$1 AND entity='branch' AND native_id=$2",
          [f.company, f.b],
        )
      ).rows[0].resource_id;
      const cash = (amountMinor: number) => ({
        currency: 'EGP' as const,
        exponent: 2 as const,
        amountMinor,
      });
      const shipping = task.snapshot.shippingDue.amountMinor;
      const outcome: OutcomeRecord = {
        kind: 'company',
        outcome: 'full',
        outcomeId: randomUUID(),
        revision: 1,
        taskId: task.taskId,
        attemptId,
        dispatchCycleId: task.dispatchCycleId,
        sourceDispatchCycleId: task.sourceDispatchCycleId,
        roundId,
        workdayId,
        driverId: f.driverResource,
        branchId: branch,
        sourceRevision: task.sourceRevision,
        assignmentRevision: task.assignmentRevision,
        sourceReference: {
          tenantId: f.connection.tenantId,
          integrationId: f.connection.integrationId,
          externalId: task.externalId,
        },
        time: f.time(),
        arrival: null,
        heading: null,
        returnRequired: false,
        lines: task.snapshot.lines.map((l) => ({
          sourceQuantity: l.quantity,
          sourceLineId: l.sourceLineId,
          delivered: l.quantity,
          heldReturnRequired: 0,
          unitDue: l.unitDue,
        })),
        collection: {
          reported: cash(25000 + shipping),
          goods: cash(25000),
          shipping: cash(shipping),
          unpaidShipping: cash(0),
          shippingStatus: shipping ? 'collected' : 'not-due',
        },
      };
      const event = f.event('outcome.recorded', { outcome }, task.taskId, 2);
      await f.receive(event);
      await f.drain();
      await f.receive(event);
      await f.drain();
      return { shipmentId: moved.id, manifestId: manifest.manifestId, task, outcome, preVisit };
    };
    const ordinary = await moveAndDispatch({ brandReference: 'P24-A04-B-VISIT' });
    expect(category(ordinary.preVisit, 'shipping_gross').amountMinor).toBe('0');
    const ordinaryReport = await report();
    expect(profit(ordinaryReport).shipping).toEqual({
      grossMinor: '5500',
      waiverMinor: '0',
      netMinor: '5500',
    });
    expect(category(ordinaryReport, 'employee_commission').amountMinor).toBe('-500');
    const shippingDetails = await reporting.category(
      f.admin.token,
      f.company,
      ordinaryReport.snapshot.id,
      'shipping_gross',
    );
    expect(shippingDetails.rows.map((r) => r.economicEffect?.historicalBranchId)).toEqual([f.b]);
    const damaged = await f.create({
      brandReference: 'P24-A04-INCIDENT',
      lines: [
        {
          id: randomUUID(),
          description: 'بضاعة حادث',
          quantity: 1,
          unitDue: { currency: 'EGP', amountMinor: '25000' },
        },
      ],
    });
    const incident = await f.report(damaged.shipmentId);
    await f.confirm(
      incident.result.incidentId,
      f.confirmation({
        goodsValueMinor: '25000',
        compensationMinor: '25000',
        companyShareMinor: '25000',
        employeeShareMinor: '0',
        employeeId: null,
        payrollMonth: null,
      }),
    );
    const replacement = await moveAndDispatch({
      brandReference: 'P24-A04-COMPANY-REPLACEMENT',
      replacement: {
        incidentId: incident.result.incidentId,
        payer: 'company',
        reason: 'شحن البديل على الشركة باتفاق مؤكد',
      },
    });
    expect(replacement.task.snapshot.shippingDue.amountMinor).toBe(0);
    expect(replacement.outcome.collection.goods.amountMinor).toBe(25000);
    const after = await report();
    expect(profit(after).shipping).toEqual({
      grossMinor: '11000',
      waiverMinor: '-5500',
      netMinor: '5500',
    });
    expect(category(after, 'employee_commission').amountMinor).toBe('-1000');
    const details = await Promise.all(
      ['shipping_gross', 'shipping_waiver', 'employee_commission'].map((key) =>
        reporting.category(
          f.admin.token,
          f.company,
          after.snapshot.id,
          key as 'shipping_gross' | 'shipping_waiver' | 'employee_commission',
        ),
      ),
    );
    const replacementRows = details
      .flatMap((r) => r.rows)
      .filter((r) => r.economicEffect?.shipmentId === replacement.shipmentId);
    expect(
      replacementRows
        .filter((r) => ['shipping_gross', 'shipping_waiver'].includes(r.economicEffect!.category))
        .reduce((n, r) => n + BigInt(r.values['amountMinor']!), 0n),
    ).toBe(0n);
    expect(replacementRows.every((r) => r.economicEffect?.historicalBranchId === f.b)).toBe(true);
    await commercialCommands(db.pool).execute(f.admin.token, {
      ...base(),
      type: 'tariff.update',
      entityId: f.seed.base,
      expectedVersion: 1,
      fields: {
        tierId: f.seed.tier,
        governorateId: f.seed.cairo,
        areaId: null,
        amountMinor: '6500',
        active: true,
      },
    });
    expect(profit(await report()).shipping).toEqual(profit(after).shipping);
    evidence['A04'] = {
      companyId: f.company,
      intakeBranch: f.a,
      workBranch: f.b,
      ordinary,
      ordinaryReport,
      replacement,
      after,
    };
  } finally {
    await db.dispose();
  }
}, 120000);
