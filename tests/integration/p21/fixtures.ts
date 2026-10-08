import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { readProducts } from '@shahn/database';
import { cairoDate, cairoWorkDate } from '@shahn/domain';
import type {
  EmployeeResult,
  FinanceResult,
  InventoryCommand,
  InventoryResult,
  OpeningCommand,
  OpeningLine,
  OpeningPreview,
  SettlementCommand,
  SettlementOperation,
  SettlementPreview,
  SettlementResult,
  ShipmentCommand,
  ShipmentFields,
  ShipmentResult,
} from '@shahn/contracts';
import { employeeExamples } from '@shahn/contracts';
import { accessFixture, fixtureConfig } from '../../support/access.js';
import { shipmentFields } from '../../support/shipments.js';
import { seedCommercial } from '../../../apps/api/src/modules/brands/seed.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { inventoryCommands } from '../../../apps/api/src/modules/inventory/service.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { employeeCommands } from '../../../apps/api/src/modules/employees/service.js';
import { controlledPayrollClock } from '../../../apps/api/src/modules/employees/payroll-period.service.js';
import { SettlementService } from '../../../apps/api/src/modules/settlements/service.js';
import {
  OpeningService,
  type OpeningHooks,
} from '../../../apps/api/src/modules/settlements/opening.service.js';
import type { SettlementHooks } from '../../../apps/api/src/modules/settlements/framework.js';

export const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { resolve, promise };
};
/** Observe a real independent backend waiting on a PostgreSQL lock; a delay is not race evidence. */
export async function waitForBlocked(pool: Pool) {
  for (let n = 0; n < 200; n++) {
    if (
      (
        await pool.query(
          "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0 LIMIT 1",
        )
      ).rowCount
    )
      return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw Error('Expected independent PostgreSQL lock waiter');
}
/**
 * Isolated P21 company built only through existing P02/P04/P05/P07/P08/P09 application services.
 * Branches A/B, one stored-stock brand, Cash A (1000.00 EGP), shared bank, an expense category.
 */
export async function settlementFixture(pool: Pool, origin = 'http://127.0.0.1:5421') {
  const f = await accessFixture(pool, fixtureConfig(origin));
  const seed = await seedCommercial(pool, f.admin.token, f.company, f.a, 'test');
  const envelope = (o: object) => ({
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    ...o,
  });
  const commercial = commercialCommands(pool);
  await commercial.execute(
    f.admin.token,
    envelope({
      type: 'brand.update',
      entityId: seed.brand,
      expectedVersion: 1,
      fields: {
        ...seed.brandFields,
        services: ['brand_packed', 'company_packed', 'stored_stock'],
        storage: {
          monthlyFeeMinor: '31000',
          branchId: f.a,
          startDate: cairoDate(new Date()),
          anniversaryDay: Number(cairoDate(new Date()).slice(-2)),
          active: true,
          stopDate: null,
        },
      },
    }) as never,
  );
  const category = (
    (
      await commercial.execute(
        f.admin.token,
        envelope({
          type: 'reference.create',
          fields: {
            kind: 'expense_category',
            name: 'P21 مصروف فائت',
            active: true,
            parentId: null,
            volumeRange: null,
          },
        }) as never,
      )
    ).body as { entityId: string }
  ).entityId;
  const today = cairoDate(new Date());
  const money = financeCommands(pool);
  const account = async (name: string, type: 'cash' | 'bank', branchIds: string[]) =>
    (
      (
        await money.execute(
          f.admin.token,
          envelope({
            type: 'account.create',
            fields: { name, type, currency: 'EGP', branchIds, active: true, bankDescription: '' },
          }) as never,
        )
      ).body as FinanceResult
    ).entityId;
  const deposit = (accountId: string, amountMinor: string, branchId = f.a, method = 'cash') =>
    money.execute(
      f.admin.token,
      envelope({
        type: 'movement.create',
        fields: {
          accountId,
          branchId,
          currency: 'EGP',
          amountMinor,
          actualDate: today,
          method,
          direction: 'deposit',
          reason: 'P21 isolated funding',
        },
      }) as never,
    );
  const expense = (accountId: string, amountMinor: string, branchId = f.a) =>
    money.execute(
      f.admin.token,
      envelope({
        type: 'expense.create',
        fields: {
          accountId,
          branchId,
          currency: 'EGP',
          amountMinor,
          actualDate: today,
          method: 'cash',
          categoryId: category,
          description: 'P21 genuine later expense',
        },
      }) as never,
    );
  const inv = async (o: object) =>
    (await inventoryCommands(pool).execute(f.admin.token, envelope(o) as InventoryCommand))
      .body as InventoryResult;
  const product = async (names = ['Blue', 'Red']) => {
    const p = await inv({
      type: 'product.create',
      brandId: seed.brand,
      fields: {
        name: 'P21 product ' + randomUUID().slice(0, 8),
        active: true,
        variants: names.map((name) => ({ name, options: '', active: true })),
      },
    });
    const record = (await readProducts(pool, f.company, seed.brand)).find(
      (x) => x.id === p.entityId,
    )!;
    return Object.fromEntries(names.map((n) => [n, record.variants.find((v) => v.name === n)!.id]));
  };
  const receive = (variantId: string, quantity: number, branchId = f.a) =>
    inv({
      type: 'stock.receive',
      branchId,
      brandId: seed.brand,
      actualDate: today,
      lines: [{ variantId, quantity, condition: 'sound' }],
    });
  const order = async (variantId: string, quantity: number) => {
    const fields: ShipmentFields = shipmentFields(
      { branchId: f.a, brandId: seed.brand, governorateId: seed.cairo },
      {
        service: 'stored_stock',
        lines: [
          {
            id: randomUUID(),
            variantId,
            description: 'P21 stored item',
            quantity,
            unitDue: { currency: 'EGP', amountMinor: '5000' },
          },
        ],
      },
    );
    return (
      await shipmentCommands(pool).execute(
        f.admin.token,
        envelope({
          type: 'shipment.confirm',
          fields,
          actualReceipt: false,
          duplicateAcknowledged: false,
          expectedPolicyVersion: 2,
          expectedTariffVersion: 1,
          expectedTariffId: seed.base,
        }) as ShipmentCommand,
      )
    ).body as ShipmentResult;
  };
  const position = async (variantId: string, branchId = f.a) =>
    (
      await pool.query(
        `SELECT s.sound_on_hand::int AS sound,s.unavailable_on_hand::int AS unavailable,s.version,
         (SELECT COALESCE(sum(quantity),0)::int FROM inventory.stock_reservation r WHERE r.company_id=s.company_id AND r.branch_id=s.branch_id AND r.variant_id=s.variant_id AND active) AS reserved,
         (SELECT count(*)::int FROM inventory.stock_reservation r WHERE r.company_id=s.company_id AND r.branch_id=s.branch_id AND r.variant_id=s.variant_id AND active AND shortage_held) AS held
         FROM inventory.stock_position s WHERE s.company_id=$1 AND s.branch_id=$2 AND s.variant_id=$3`,
        [f.company, branchId, variantId],
      )
    ).rows[0] as {
      sound: number;
      unavailable: number;
      version: number;
      reserved: number;
      held: number;
    };
  const balance = async (accountId: string) =>
    (
      await pool.query<{ amount_minor: string }>(
        'SELECT amount_minor::text FROM finance.account_balance WHERE company_id=$1 AND account_id=$2',
        [f.company, accountId],
      )
    ).rows[0]!.amount_minor;
  const cash = await account('خزنة الفرع أ للتسويات', 'cash', [f.a]),
    bank = await account('بنك التسويات المشترك', 'bank', [f.a, f.b]);
  await deposit(cash, '100000');
  const now = { today: cairoWorkDate(new Date()) };
  const payrollClock = controlledPayrollClock(() => now.today);
  const settlements = (hooks: SettlementHooks = {}) =>
    new SettlementService(pool, hooks, { payrollClock });
  const openings = (hooks: OpeningHooks = {}) => new OpeningService(pool, hooks, payrollClock);
  const prepare = (operation: SettlementOperation, token = f.admin.token) =>
    settlements().prepare(token, { companyId: f.company, operation });
  const command = (
    operation: SettlementOperation,
    preview: SettlementPreview,
    reason = 'سبب تسوية موثق في P21',
  ): SettlementCommand => ({
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'settlement.confirm',
    reason,
    operation,
    expectedVersions: preview.versions,
    expectedDigest: preview.digest,
  });
  const settle = async (
    operation: SettlementOperation,
    options: { token?: string; hooks?: SettlementHooks; reason?: string } = {},
  ) => {
    const preview = await prepare(operation, options.token);
    const input = command(operation, preview, options.reason);
    const reply = await settlements(options.hooks).confirm(options.token ?? f.admin.token, input);
    return { preview, input, result: reply.body as SettlementResult };
  };
  const openingCommand = (
    lines: OpeningLine[],
    preview: OpeningPreview,
    openingDate = today,
  ): OpeningCommand => ({
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'opening.confirm',
    openingDate,
    description: 'أرصدة شركة قائمة قبل التشغيل على النظام',
    evidence: 'دفتر الخزينة الورقي',
    lines,
    expectedDigest: preview.digest,
  });
  const employees = employeeCommands(pool);
  const employee = async (name = 'موظف تسوية', salary = '600000') =>
    (
      await employees.execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'employee.create',
        fields: {
          name,
          contact: '01000000000',
          active: true,
          employmentStart: now.today,
          employmentEnd: null,
          branchId: f.a,
          workDays: [0, 1, 2, 3, 4],
          hoursPerDay: 8,
          weeklyDayOff: 5,
        },
        terms: {
          salary: { enabled: true, monthly: { currency: 'EGP', amountMinor: salary } },
          commission: employeeExamples.off.commission,
        },
      })
    ).body as EmployeeResult;
  const count = async (table: string, where = 'company_id=$1', args: unknown[] = [f.company]) =>
    Number(
      (await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${where}`, args)).rows[0].n,
    );
  return {
    ...f,
    seed,
    envelope,
    category,
    today,
    now,
    payrollClock,
    cash,
    bank,
    account,
    deposit,
    expense,
    product,
    receive,
    order,
    position,
    balance,
    settlements,
    openings,
    prepare,
    command,
    settle,
    openingCommand,
    employee,
    count,
  };
}
