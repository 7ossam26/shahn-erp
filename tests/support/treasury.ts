import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { FinanceCommand, FinanceResult, TreasuryCommand } from '@shahn/contracts';
import { accessFixture, fixtureConfig } from './access.js';
import { seedFinance } from '../../apps/api/src/modules/finance/seed.js';
import { financeCommands } from '../../apps/api/src/modules/finance/service.js';
export async function treasuryFixture(pool: Pool, origin?: string) {
  const f = await accessFixture(pool, fixtureConfig(origin)),
    c = randomUUID();
  await pool.query("UPDATE access.company SET name='P09 P10 isolated test company' WHERE id=$1", [
    f.company,
  ]);
  const finance = financeCommands(pool);
  const seed = await seedFinance(pool, f.admin.token, f.company, { a: f.a, b: f.b }, 'test');
  const base = { schemaVersion: 1 as const, companyId: f.company };
  const create = async (name: string, branchId = f.a) =>
    (
      await finance.execute(f.admin.token, {
        ...base,
        commandId: randomUUID(),
        type: 'account.create',
        fields: {
          name,
          type: 'cash',
          currency: 'EGP',
          branchIds: [branchId],
          active: true,
          bankDescription: '',
        },
      })
    ).body as FinanceResult;
  const source = await create('P10 خزينة أ — الأموال الفعلية المرسلة بين الفروع');
  const deposit = async (accountId: string, branchId = f.a, amountMinor = '100000') =>
    finance.execute(f.admin.token, {
      ...base,
      commandId: randomUUID(),
      type: 'movement.create',
      fields: {
        accountId,
        branchId,
        amountMinor,
        currency: 'EGP',
        actualDate: '2026-09-01',
        method: 'cash',
        direction: 'deposit',
        reason: 'P10 إيداع نقدي فعلي تجريبي، ليس رصيدًا افتتاحيًا',
      },
    });
  await deposit(source.entityId);
  await pool.query(
    "INSERT INTO access.branch(id,company_id,name) VALUES($1,$2,'الفرع ج — مسند لموظفي التحويل فقط')",
    [c, f.company],
  );
  for (const user of [f.staffA, f.staffB]) {
    await pool.query('DELETE FROM access.user_branch WHERE company_id=$1 AND user_id=$2', [
      f.company,
      user.id,
    ]);
    await pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [f.company, user.id, c]);
    await pool.query("INSERT INTO access.user_exception VALUES($1,$2,'expenses','allow')", [
      f.company,
      user.id,
    ]);
  }
  await pool.query(
    "INSERT INTO access.user_exception VALUES($1,$2,'treasury.send','allow'),($1,$3,'treasury.receive','allow'),($1,$4,'treasury.send','allow'),($1,$4,'treasury.receive','allow'),($1,$4,'finance.movements','allow')",
    [f.company, f.staffA.id, f.staffB.id, f.staffAB.id],
  );
  const send = (overrides: object = {}) =>
    ({
      ...base,
      commandId: randomUUID(),
      type: 'treasury.send',
      transferId: randomUUID(),
      sourceAccountId: source.entityId,
      destinationAccountId: seed.cash.entityId,
      sourceBranchId: f.a,
      destinationBranchId: f.b,
      amountMinor: '30000',
      currency: 'EGP',
      actualSentAt: '2026-09-01T10:00:00Z',
      expectedSourceVersion: 1,
      expectedDestinationVersion: 1,
      ...overrides,
    }) as TreasuryCommand;
  const receive = (transferId: string, overrides: object = {}) =>
    ({
      ...base,
      commandId: randomUUID(),
      type: 'treasury.receive',
      transferId,
      expectedVersion: 1,
      actualReceivedAt: '2026-09-01T11:00:00Z',
      confirmFullReceipt: true,
      ...overrides,
    }) as TreasuryCommand;
  const withdrawal = (accountId: string, branchId = f.a, amountMinor = '70000') =>
    ({
      ...base,
      commandId: randomUUID(),
      type: 'movement.create',
      fields: {
        accountId,
        branchId,
        amountMinor,
        currency: 'EGP',
        actualDate: '2026-09-01',
        method: 'cash',
        direction: 'withdrawal',
        reason: 'P10 competing actual withdrawal',
      },
    }) as FinanceCommand;
  return { ...f, c, seed, source, finance, create, deposit, send, receive, withdrawal };
}
