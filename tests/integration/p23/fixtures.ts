import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  FinanceCommand,
  FinanceResult,
  ReportCommand,
  ReportFilters,
  ReportId,
  RemittanceCommand,
  TreasuryCommand,
  BrandPayoutResult,
} from '@shahn/contracts';
import { payoutFixture } from '../p17/fixtures.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { treasuryCommands } from '../../../apps/api/src/modules/finance/treasury-transfers/service.js';
import { ReportingService } from '../../../apps/api/src/modules/reporting/service.js';

export async function reportFixture(pool: Pool, origin = 'http://127.0.0.1:5431') {
  const f = await payoutFixture(pool, origin),
    finance = financeCommands(pool);
  const env = (o: object) => ({
    schemaVersion: 1 as const,
    companyId: f.company,
    commandId: randomUUID(),
    ...o,
  });
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
  const aCash = await account('P23 Cash A', f.a),
    bCash = await account('P23 Cash B', f.b);
  await f.deposit(aCash, f.a, '100000');
  const category = (
    (
      await commercialCommands(pool).execute(
        f.admin.token,
        env({
          type: 'reference.create',
          fields: {
            kind: 'expense_category',
            name: 'P23 مصروف مدفوع',
            active: true,
            parentId: null,
            volumeRange: null,
          },
        }) as never,
      )
    ).body as { entityId: string }
  ).entityId;
  const expense = async (
    amount = '20000',
    actualDate = f.today,
    branchId = f.a,
    description = '=SUM(A1:A2) مصروف P23 طويل لا ينفذ معادلة',
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
            amountMinor: amount,
            currency: 'EGP',
            method: 'cash',
            actualDate,
            description,
          },
        }) as FinanceCommand,
      )
    ).body as FinanceResult;
  const paidExpense = await expense();
  const treasury = treasuryCommands(pool),
    transferId = randomUUID(),
    actualSentAt = new Date().toISOString();
  await treasury.execute(
    f.admin.token,
    env({
      type: 'treasury.send',
      transferId,
      sourceAccountId: aCash,
      destinationAccountId: bCash,
      sourceBranchId: f.a,
      destinationBranchId: f.b,
      amountMinor: '30000',
      currency: 'EGP',
      actualSentAt,
      expectedSourceVersion: 1,
      expectedDestinationVersion: 1,
    }) as TreasuryCommand,
  );
  await treasury.execute(
    f.admin.token,
    env({
      type: 'treasury.receive',
      transferId,
      expectedVersion: 1,
      actualReceivedAt: new Date().toISOString(),
      confirmFullReceipt: true,
    }) as TreasuryCommand,
  );
  const brand = await f.brand('P23 البراند المستحق'),
    round = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
  const witness = await f.prepare(round.scope);
  await f.service.confirm(f.admin.token, {
    ...round.scope,
    schemaVersion: 1,
    commandId: randomUUID(),
    type: 'remittance.confirm',
    witnessId: witness.id,
    expectedRevision: witness.revision,
    expectedDigest: witness.digest,
    actualDate: f.today,
    components: [{ method: 'cash', accountId: aCash, amountMinor: '30000' }],
  } as RemittanceCommand);
  const payoutScope = f.scope(brand, '10000', { payingBranchId: f.a, accountId: aCash });
  const payout = (await f.payoutService.confirm(f.admin.token, await f.command(payoutScope)))
    .body as BrandPayoutResult;
  const shipments = [];
  for (let i = 0; i < 27; i++)
    shipments.push(
      await f.create({
        brandReference: 'P23-REGISTER-' + String(i).padStart(2, '0'),
        recipientName: 'عميل P23 ' + i + ' اسم طويل لاختبار العربية والتفاف السطر',
        phoneDisplay: i === 0 ? '٠١٠١٢٣٤٥٦٧٨' : '01012345678',
      }),
    );
  const scopedRole = randomUUID();
  await pool.query(
    `INSERT INTO access.role(id,company_id,name) VALUES($1,$2,'P23 report only A')`,
    [scopedRole, f.company],
  );
  for (const cap of ['reports', 'finance.accounts', 'brand.payout'])
    await pool.query(`INSERT INTO access.role_grant VALUES($1,$2,$3)`, [
      f.company,
      scopedRole,
      cap,
    ]);
  const reportA = await f.make('p23-a', [f.a], scopedRole),
    trackingOnly = await f.make('p23-tracking', [f.a], f.staffRole);
  const reporting = new ReportingService(pool),
    command = (reportId: ReportId, filters: ReportFilters = {}): ReportCommand =>
      env({ type: 'report.snapshot', reportId, filters, sort: 'dateAsc' }) as ReportCommand;
  const report = (reportId: ReportId, filters: ReportFilters = {}, token = f.admin.token) =>
    reporting.create(token, command(reportId, filters));
  return {
    ...f,
    aCash,
    bCash,
    category,
    paidExpense,
    expense,
    transferId,
    createBrand: f.brand,
    brand,
    round,
    payout,
    shipments,
    reportA,
    trackingOnly,
    scopedRole,
    reporting,
    command,
    report,
  };
}
