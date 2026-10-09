import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  FinanceCommand,
  FinanceResult,
  ReportCommand,
  ReportFilters,
  CommercialCommand,
  BrandFields,
  BrandPayoutScope,
  TreasuryCommand,
} from '@shahn/contracts';
import { cairoDate } from '@shahn/domain';
import { incidentFixture } from '../p18/fixtures.js';
import { payrollFixture, offsetMonth } from '../p20/fixtures.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { controlledStorageClock } from '../../../apps/api/src/modules/storage/clock.js';
import { BrandPayoutService } from '../../../apps/api/src/modules/finance/brand-payouts/service.js';
import { treasuryCommands } from '../../../apps/api/src/modules/finance/treasury-transfers/service.js';
import { ReportingService } from '../../../apps/api/src/modules/reporting/service.js';
import { StorageRenewalService } from '../../../apps/api/src/modules/storage/renewal.js';

/** All economic inputs use the same production command services in an isolated labelled company. */
export async function profitFixture(pool: Pool, origin = 'http://127.0.0.1:5441') {
  const f = await incidentFixture(pool, origin);
  const today = cairoDate(new Date()),
    month = today.slice(0, 7);
  await pool.query(
    "UPDATE access.company SET name='P24 isolated operating profit acceptance company' WHERE id=$1",
    [f.company],
  );
  const env = (o: object) => ({
    schemaVersion: 1 as const,
    companyId: f.company,
    commandId: randomUUID(),
    ...o,
  });
  const finance = financeCommands(pool);
  const account = async (name: string, branchId: string) =>
    (
      (
        await finance.execute(
          f.admin.token,
          env({
            type: 'account.create',
            fields: {
              name,
              type: 'cash',
              currency: 'EGP',
              branchIds: [branchId],
              active: true,
              bankDescription: '',
            },
          }) as FinanceCommand,
        )
      ).body as FinanceResult
    ).entityId;
  const aCash = await account('P24 خزنة أ', f.a),
    bCash = await account('P24 خزنة ب', f.b);
  const deposit = (accountId = aCash, branchId = f.a, amountMinor = '70000') =>
    finance.execute(
      f.admin.token,
      env({
        type: 'movement.create',
        fields: {
          accountId,
          branchId,
          currency: 'EGP',
          amountMinor,
          actualDate: today,
          method: 'cash',
          direction: 'deposit',
          reason: 'P24 isolated generic test funding',
        },
      }) as FinanceCommand,
    );
  await deposit(aCash, f.a, '10000000');
  const storageClock = controlledStorageClock(() => today),
    brands = commercialCommands(pool, { storageClock });
  const commercial = (o: object) => brands.execute(f.admin.token, env(o) as CommercialCommand);
  const category = (
    (
      await commercial({
        type: 'reference.create',
        fields: {
          kind: 'expense_category',
          name: 'P24 مصروف تشغيل موثق',
          active: true,
          parentId: null,
          volumeRange: null,
        },
      })
    ).body as { entityId: string }
  ).entityId;
  const expense = async (
    amountMinor = '150000',
    actualDate = today,
    branchId = f.a,
    description = 'P24 مصروف مدفوع موثق',
    token = f.admin.token,
  ) =>
    (
      await finance.execute(
        token,
        env({
          type: 'expense.create',
          fields: {
            branchId,
            accountId: branchId === f.a ? aCash : bCash,
            categoryId: category,
            amountMinor,
            currency: 'EGP',
            method: 'cash',
            actualDate,
            description,
          },
        }) as FinanceCommand,
      )
    ).body as FinanceResult;
  const paidExpense = await expense();
  await commercial({
    type: 'tariff.update',
    entityId: f.seed.base,
    expectedVersion: 1,
    fields: {
      tierId: f.seed.tier,
      governorateId: f.seed.cairo,
      areaId: null,
      amountMinor: '1000000',
      active: true,
    },
  });
  const visit = await f.received({
    brandReference: 'P24-A01-SHIPPING',
    lines: [
      {
        id: randomUUID(),
        description: 'بضاعة تخص البراند ولا تدخل الربح',
        quantity: 1,
        unitDue: { currency: 'EGP', amountMinor: '25000' },
      },
    ],
  });
  const arrival = visit.arrival();
  await f.receive(arrival);
  await f.drain();
  const outcome = await visit.outcome('full'),
    event = f.event('outcome.recorded', { outcome }, visit.task.taskId, 2);
  await f.receive(event);
  await f.drain();
  const payroll = await payrollFixture(pool, origin, f),
    salaryEmployee = await payroll.create('P24 راتب أساسي ٣٠٠٠', '300000');
  const damaged = await f.received({
    brandReference: 'P24-A01-INCIDENT',
    lines: [
      {
        id: randomUUID(),
        description: 'بضاعة حادث مؤكد',
        quantity: 1,
        unitDue: { currency: 'EGP', amountMinor: '50000' },
      },
    ],
  });
  const incidentReport = await f.report(damaged.s.shipmentId);
  const incidentConfirmation = f.confirmation({
    goodsValueMinor: '50000',
    compensationMinor: '50000',
    companyShareMinor: '30000',
    employeeShareMinor: '20000',
    employeeId: f.employee.employeeId,
    payrollMonth: month,
  });
  await f.confirm(incidentReport.result.incidentId, incidentConfirmation);
  const storageFields: BrandFields = {
    ...f.seed.brandFields,
    name: 'P24 اشتراك تخزين ٢٠٠٠',
    services: ['brand_packed', 'stored_stock'],
    defaultService: 'brand_packed',
    payoutWeekdays: [0, 1, 2, 3, 4, 5, 6],
    storage: {
      monthlyFeeMinor: '200000',
      branchId: f.a,
      startDate: today,
      anniversaryDay: Number(today.slice(-2)),
      active: true,
      stopDate: null,
    },
  };
  const storageBrand = (
    (await commercial({ type: 'brand.create', fields: storageFields })).body as { entityId: string }
  ).entityId;
  const renewal = new StorageRenewalService(pool, { clock: storageClock });
  await renewal.discover();
  while (await renewal.runOne()) {
    /* real idempotent period generation */
  }
  // A nonbinding preview is not a persisted cost. Freeze the actual source snapshots through P20's materializer.
  payroll.now.today = offsetMonth(month, 1) + '-01';
  await payroll.read(salaryEmployee.employeeId, month);
  await payroll.read(f.employee.employeeId, month);
  payroll.now.today = today;
  const scopedRole = randomUUID(),
    reportsOnlyRole = randomUUID();
  await pool.query(
    "INSERT INTO access.role(id,company_id,name) VALUES($1,$3,'P24 report A'),($2,$3,'P24 report summary only')",
    [scopedRole, reportsOnlyRole, f.company],
  );
  await pool.query('INSERT INTO access.role_grant SELECT $1,$2,id FROM access.screen_capability', [
    f.company,
    scopedRole,
  ]);
  await pool.query("INSERT INTO access.role_grant VALUES($1,$2,'reports')", [
    f.company,
    reportsOnlyRole,
  ]);
  const reportA = await f.make('p24-report-a', [f.a], scopedRole),
    reportsOnly = await f.make('p24-summary-only', [f.a, f.b], reportsOnlyRole),
    trackingOnly = await f.make('p24-tracking', [f.a], f.staffRole);
  const reporting = new ReportingService(pool),
    command = (filters: ReportFilters = {}): ReportCommand =>
      env({
        type: 'report.snapshot',
        reportId: 'REP-15',
        filters: { from: month + '-01', to: today, ...filters },
        sort: 'dateAsc',
      }) as ReportCommand;
  const report = (filters: ReportFilters = {}, token = f.admin.token) =>
    reporting.create(token, command(filters));
  const transfer = async (amountMinor = '30000') => {
    const svc = treasuryCommands(pool),
      transferId = randomUUID();
    const versions = (
      await pool.query(
        'SELECT id AS account_id,version FROM finance.account WHERE company_id=$1 AND id=ANY($2::uuid[])',
        [f.company, [aCash, bCash]],
      )
    ).rows;
    const version = (id: string) => Number(versions.find((r) => r.account_id === id).version);
    await svc.execute(
      f.admin.token,
      env({
        type: 'treasury.send',
        transferId,
        sourceAccountId: aCash,
        destinationAccountId: bCash,
        sourceBranchId: f.a,
        destinationBranchId: f.b,
        amountMinor,
        currency: 'EGP',
        actualSentAt: new Date().toISOString(),
        expectedSourceVersion: version(aCash),
        expectedDestinationVersion: version(bCash),
      }) as TreasuryCommand,
    );
    await svc.execute(
      f.admin.token,
      env({
        type: 'treasury.receive',
        transferId,
        expectedVersion: 1,
        actualReceivedAt: new Date().toISOString(),
        confirmFullReceipt: true,
      }) as TreasuryCommand,
    );
    return transferId;
  };
  const payout = async (amountMinor = '10000') => {
    const svc = new BrandPayoutService(pool),
      scope: BrandPayoutScope = {
        companyId: f.company,
        brandId: f.seed.brand,
        payingBranchId: f.a,
        accountId: aCash,
        amountMinor,
        actualDate: today,
        method: 'cash',
      };
    const preview = await svc.preview(f.admin.token, scope);
    return svc.confirm(f.admin.token, {
      ...env({}),
      ...scope,
      type: 'brand.payout.confirm',
      expectedReadinessRevision: preview.readinessRevision,
      ...(preview.offDay ? { offDayReason: 'P24 trial actual payment' } : {}),
    });
  };
  const revoke = (actor: 'reports' | 'source', active = false) =>
    actor === 'reports'
      ? pool.query(
          active
            ? "INSERT INTO access.role_grant VALUES($1,$2,'reports') ON CONFLICT DO NOTHING"
            : "DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='reports'",
          [f.company, scopedRole],
        )
      : pool.query(
          active
            ? "INSERT INTO access.role_grant VALUES($1,$2,'employees') ON CONFLICT DO NOTHING"
            : "DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='employees'",
          [f.company, scopedRole],
        );
  const gap = () =>
    pool.query(
      'UPDATE integration.checkpoint SET received_high=received_high+1 WHERE company_id=$1',
      [f.company],
    );
  const fault = () =>
    pool.query(
      'UPDATE finance.account_balance SET amount_minor=amount_minor+123 WHERE company_id=$1 AND account_id=$2',
      [f.company, aCash],
    );
  return {
    ...f,
    today,
    month,
    from: month + '-01',
    to: today,
    env,
    finance,
    account,
    aCash,
    bCash,
    deposit,
    category,
    expense,
    paidExpense,
    commercial,
    storageBrand,
    payroll,
    salaryEmployee,
    visit,
    arrival,
    outcome,
    event,
    incidentId: incidentReport.result.incidentId,
    incidentConfirmation,
    reportA,
    reportsOnly,
    trackingOnly,
    scopedRole,
    reportsOnlyRole,
    reporting,
    command,
    report,
    transfer,
    payout,
    revoke,
    gap,
    fault,
    incidentReport: f.report,
  };
}
export type ProfitFixture = Awaited<ReturnType<typeof profitFixture>>;
