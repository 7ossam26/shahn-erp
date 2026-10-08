import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError, minor, type Capability } from '@shahn/domain';
import {
  validateFinanceCommand,
  financeFamily,
  type FinanceCommand,
  type FinanceResult,
  type FinanceFilter,
  type FinanceCatalog,
  type Account,
  type AccountFields,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { JournalPosting } from '../kernel/journals.js';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { configurationLock, requireReference } from '../reference-data/service.js';
import { readReferences } from '@shahn/database';
import { AccountFundsService, authorizedAccount, accountColumns } from './accounts/service.js';
import { expenseDetail } from './expenses/service.js';
import { movementDetail } from './money-movements/service.js';
export const financeCapability = (type: string): Capability =>
  type.startsWith('account.')
    ? 'finance.accounts'
    : type.startsWith('expense.')
      ? 'expenses'
      : 'finance.movements';
async function fieldsScope(u: UnitOfWork, f: AccountFields) {
  for (const id of f.branchIds) u.assertBranch(id);
  if (f.type === 'cash' && (f.branchIds.length !== 1 || f.bankDescription !== ''))
    throw new AccessError('INVALID_ACCOUNT_SCOPE', 400);
}
export function financeCommands(pool: Pool, hooks: FinanceHooks = {}) {
  const kinds: FinanceCommand['type'][] = [
    'account.create',
    'account.update',
    'account.deactivate',
    'expense.create',
    'movement.create',
  ];
  const definitions: CommandDefinition<FinanceCommand>[] = kinds.map((kind) => ({
    kind,
    family: financeFamily(kind),
    capability: financeCapability(kind),
    authorize: async (u, value, recovery) => {
      const v = value as Record<string, unknown>;
      if (recovery) {
        if (Array.isArray(v.branchIds)) for (const id of v.branchIds) u.assertBranch(String(id));
        if (typeof v.branchId === 'string') u.assertBranch(v.branchId);
        if (typeof v.accountId === 'string') await authorizedAccount(u, v.accountId);
      } else if ('fields' in v && v.fields && typeof v.fields === 'object') {
        const f = v.fields as Record<string, unknown>;
        if (typeof f.branchId === 'string') u.assertBranch(f.branchId);
        if (Array.isArray(f.branchIds)) for (const id of f.branchIds) u.assertBranch(String(id));
        if (typeof f.accountId === 'string') await authorizedAccount(u, f.accountId);
      }
      if (!recovery && 'accountId' in v && typeof v.accountId === 'string') {
        const a = await authorizedAccount(u, v.accountId);
        for (const id of a.branchIds) u.assertBranch(id);
      }
    },
    rejectionReference: async (input, u) => {
      const entityId = 'accountId' in input ? input.accountId : input.commandId;
      if ('fields' in input && 'branchId' in input.fields)
        return { entityId, branchId: input.fields.branchId, accountId: input.fields.accountId };
      const branchIds =
        input.type === 'account.create' || input.type === 'account.update'
          ? input.fields.branchIds
          : 'accountId' in input
            ? (await authorizedAccount(u, input.accountId)).branchIds
            : [];
      return {
        entityId,
        branchId: branchIds[0]!,
        branchIds,
        ...('accountId' in input ? { accountId: input.accountId } : {}),
      };
    },
    resolve: async (u, r) => {
      const row = (
        await u.client.query<{ body: FinanceResult }>(
          'SELECT body FROM finance.command_outcome WHERE company_id=$1 AND id=$2',
          [u.access.companyId, r.outcomeId],
        )
      ).rows[0];
      if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
      return row.body;
    },
    execute: async (u, input, recordId) => {
      if (!validateFinanceCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
      const isAccount = input.type.startsWith('account.');
      const id = 'accountId' in input ? input.accountId : randomUUID(),
        company = u.access.companyId,
        client = u.client;
      const journal = new JournalPosting(u),
        funds = new AccountFundsService(u);
      let sourceId: string | null = null;
      if (!isAccount)
        sourceId = (
          await journal.source(
            { system: 'erp', identity: id, kind: input.type, revision: '1' },
            'fields' in input ? input.fields : null,
          )
        ).id;
      await configurationLock(u, isAccount);
      let beforeVersion: number | null = null,
        version = 1,
        movementId: string | null = null;
      let reference: Record<string, unknown> = { entityId: id };
      if (
        input.type === 'account.create' ||
        input.type === 'account.update' ||
        input.type === 'account.deactivate'
      ) {
        let fields: AccountFields;
        if (input.type === 'account.create') {
          fields = input.fields;
          await fieldsScope(u, fields);
          await journal.createResource('money', id);
          await client.query(
            `INSERT INTO finance.account(company_id,id,name,type,currency,cash_branch_id,active,version,bank_description) VALUES($1,$2,$3,$4,'EGP',$5,$6,1,$7)`,
            [
              company,
              id,
              fields.name,
              fields.type,
              fields.type === 'cash' ? fields.branchIds[0] : null,
              fields.active,
              fields.bankDescription,
            ],
          );
          await client.query(
            `INSERT INTO finance.account_balance(company_id,account_id) VALUES($1,$2)`,
            [company, id],
          );
        } else {
          await funds.lock([id]);
          const old = await funds.read(id);
          for (const b of old.branchIds) u.assertBranch(b);
          if (old.version !== input.expectedVersion)
            throw new AccessError('REVISION_CONFLICT', 409, old.version);
          fields =
            input.type === 'account.deactivate'
              ? {
                  name: old.name,
                  type: old.type,
                  currency: 'EGP',
                  branchIds: old.branchIds,
                  bankDescription: old.bankDescription,
                  active: false,
                }
              : input.fields;
          await fieldsScope(u, fields);
          if (
            fields.type !== old.type ||
            (old.type === 'cash' && fields.branchIds[0] !== old.branchIds[0])
          )
            throw new AccessError('ACCOUNT_IDENTITY_IMMUTABLE', 409);
          if (!fields.active || old.branchIds.some((b) => !fields.branchIds.includes(b)))
            await funds.guardNoObligations(id);
          beforeVersion = old.version;
          version = old.version + 1;
          await client.query(
            `UPDATE finance.account SET name=$3,active=$4,version=$5,bank_description=$6 WHERE company_id=$1 AND id=$2`,
            [company, id, fields.name, fields.active, version, fields.bankDescription],
          );
          await client.query(
            'DELETE FROM finance.account_usage WHERE company_id=$1 AND account_id=$2',
            [company, id],
          );
        }
        for (const branchId of fields.branchIds)
          await client.query('INSERT INTO finance.account_usage VALUES($1,$2,$3)', [
            company,
            id,
            branchId,
          ]);
        await client.query(
          'INSERT INTO finance.account_revision(company_id,account_id,version,fields,actor_id) VALUES($1,$2,$3,$4,$5)',
          [company, id, version, JSON.stringify(fields), u.access.principalId],
        );
        reference = { entityId: id, accountId: id, branchIds: fields.branchIds };
      } else {
        const paid = await recordPaidMoney(u, input, recordId, { id, sourceId: sourceId!, hooks });
        movementId = paid.movementId;
        reference = {
          entityId: id,
          accountId: input.fields.accountId,
          branchId: input.fields.branchId,
        };
      }
      await hooks.beforeResult?.();
      const body: FinanceResult = { commandId: input.commandId, entityId: id, version, movementId },
        outcomeId = randomUUID();
      await client.query('INSERT INTO finance.command_outcome VALUES($1,$2,$3,$4)', [
        company,
        outcomeId,
        recordId,
        JSON.stringify(body),
      ]);
      return {
        reply: { status: 200, body },
        reference: { ...reference, outcomeId },
        entityId: id,
        beforeVersion,
        afterVersion: version,
      };
    },
  }));
  return new CommandService(pool, definitions);
}
export type PaidMoneyCommand = Extract<
  FinanceCommand,
  { type: 'expense.create' | 'movement.create' }
>;
export interface FinanceHooks {
  afterExpenseInsert?: () => Promise<void>;
  afterPosting?: () => Promise<void>;
  beforeResult?: () => Promise<void>;
  afterAccountLock?: () => Promise<void>;
}
/**
 * P09 paid expense / general movement in the caller's UnitOfWork. The P09 command and P21's
 * typed missed-movement resolution share this one path; neither opens a transaction.
 * `beforeFunds` runs after the account lock and before the funds check (P21 hold replacement).
 */
export async function recordPaidMoney(
  u: UnitOfWork,
  input: PaidMoneyCommand,
  recordId: string,
  options: {
    id: string;
    sourceId?: string;
    hooks?: FinanceHooks;
    beforeFunds?: () => Promise<void>;
  },
) {
  const { id, hooks = {} } = options,
    company = u.access.companyId,
    client = u.client,
    journal = new JournalPosting(u),
    funds = new AccountFundsService(u);
  const sourceId =
    options.sourceId ??
    (
      await journal.source(
        { system: 'erp', identity: id, kind: input.type, revision: '1' },
        input.fields,
      )
    ).id;
  await configurationLock(u);
  const f = input.fields;
  minor(f.amountMinor, 'positive');
  u.assertBranch(f.branchId);
  const today = (
    await client.query<{ today: string }>(
      "SELECT (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date::text AS today",
    )
  ).rows[0]!.today;
  if (f.actualDate > today) throw new AccessError('FUTURE_PAYMENT_DATE', 400);
  let movementId = input.type === 'movement.create' ? id : randomUUID();
  let categoryName = '';
  if (input.type === 'expense.create') {
    categoryName = (await requireReference(u, input.fields.categoryId, 'expense_category')).name;
    await journal.createResource('operating', id);
  }
  await funds.lock([f.accountId]);
  await hooks.afterAccountLock?.();
  await funds.use(f);
  await options.beforeFunds?.();
  if (input.type === 'expense.create') {
    await funds.requireFunds(f.accountId, f.amountMinor);
    await client.query(
      `INSERT INTO finance.paid_expense(company_id,id,movement_id,source_id,account_id,branch_id,category_id,category_name,description,amount_minor,currency,actual_date,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'EGP',$11,$12)`,
      [
        company,
        id,
        movementId,
        sourceId,
        f.accountId,
        f.branchId,
        input.fields.categoryId,
        categoryName,
        input.fields.description,
        f.amountMinor,
        f.actualDate,
        u.access.principalId,
      ],
    );
    await hooks.afterExpenseInsert?.();
  }
  const posted = await funds.post({
    sourceId,
    recordId,
    movementId,
    fields: f,
    direction: input.type === 'expense.create' ? 'withdrawal' : input.fields.direction,
    sourceKind: input.type === 'expense.create' ? 'expense' : 'general',
    reason: input.type === 'expense.create' ? input.fields.description : input.fields.reason,
    ...(input.type === 'expense.create'
      ? {
          additionalEffects: [
            {
              family: 'operating',
              kind: 'cost',
              subjectId: id,
              amountMinor: '-' + f.amountMinor,
              branchId: f.branchId,
              effectiveDate: f.actualDate,
              supersedesId: null,
              reason: input.fields.description,
            },
          ],
        }
      : {}),
  });
  let costEffectId: string | null = null;
  if (input.type === 'expense.create') {
    costEffectId = (
      await client.query<{ id: string }>(
        "SELECT id FROM kernel.journal_effect WHERE company_id=$1 AND source_id=$2 AND family='operating'",
        [company, sourceId],
      )
    ).rows[0]!.id;
    await client.query('INSERT INTO finance.paid_cost VALUES($1,$2,$3,$4,$5,$6,$7)', [
      company,
      id,
      sourceId,
      costEffectId,
      f.amountMinor,
      f.actualDate,
      f.branchId,
    ]);
  }
  movementId = posted.id;
  await hooks.afterPosting?.();
  return { id, sourceId, movementId, effectId: posted.effectId, costEffectId };
}
export async function financeCatalog(u: UnitOfWork): Promise<FinanceCatalog> {
  await configurationLock(u);
  return {
    accounts: (await accountList(u)).items,
    categories: (await readReferences(u.client, u.access.companyId))
      .filter((r) => r.kind === 'expense_category')
      .map(({ id, name, active, version }) => ({ id, name, active, version })),
    branches: u.access.assignedBranches,
  };
}
export async function accountList(
  u: UnitOfWork,
  filter?: FinanceFilter & { active?: 'all' | 'true' | 'false' },
) {
  if (filter?.branchId) u.assertBranch(filter.branchId);
  if (filter?.accountId) await authorizedAccount(u, filter.accountId);
  const predicate = `a.company_id=$1 AND EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id AND x.branch_id=ANY($2::uuid[]))
      AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id AND x.branch_id=$3))
      AND ($4::uuid IS NULL OR a.id=$4) AND strpos(translate(lower(a.name),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),lower($5))>0
      AND ($6='all' OR a.active=($6='true'))`;
  const args = [
    u.access.companyId,
    u.access.assignedBranches.map((b) => b.id),
    filter?.branchId ?? null,
    filter?.accountId ?? null,
    filter?.search ?? '',
    filter?.active ?? 'all',
  ];
  const page = filter?.page ?? 1,
    limit = filter?.limit ?? 100;
  const rows = (
    await u.client.query<Account & { total: string }>(
      `SELECT ${accountColumns},count(*) OVER()::text AS total FROM finance.account a JOIN finance.account_balance b ON b.company_id=a.company_id AND b.account_id=a.id WHERE ${predicate} ORDER BY a.name,a.id LIMIT $7 OFFSET $8`,
      [...args, filter ? limit : null, filter ? (page - 1) * limit : 0],
    )
  ).rows;
  const total =
    rows[0]?.total ??
    (
      await u.client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM finance.account a WHERE ${predicate}`,
        args,
      )
    ).rows[0]!.total;
  return { items: rows.map(({ total: _total, ...r }) => r), total: Number(total), page, limit };
}
export { expenseDetail, movementDetail };
