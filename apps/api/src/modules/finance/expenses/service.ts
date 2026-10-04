import { AccessError } from '@shahn/domain';
import type { PaidExpense, FinanceFilter } from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { financePredicates } from '../money-movements/service.js';
const columns = `e.id,e.movement_id AS "movementId",e.source_id AS "sourceId",c.effect_id AS "costEffectId",e.category_id AS "categoryId",e.category_name AS "categoryName",e.description,
  m.account_id AS "accountId",m.branch_id AS "branchId",m.amount_minor::text AS "amountMinor",m.currency,m.method,m.actual_date::text AS "actualDate",m.account_name AS "accountName",m.branch_name AS "branchName",m.actor_id AS "actorId",m.actor_name AS "actorName",e.recorded_at AS "recordedAt"`;
const joins = `finance.paid_expense e JOIN finance.money_movement m ON m.company_id=e.company_id AND m.id=e.movement_id JOIN finance.paid_cost c ON c.company_id=e.company_id AND c.expense_id=e.id`;
export async function expenseDetail(u: UnitOfWork, id: string): Promise<PaidExpense> {
  const row = (
    await u.client.query<PaidExpense>(
      `SELECT ${columns} FROM ${joins} WHERE m.company_id=$1 AND e.id=$2 AND m.branch_id=ANY($3::uuid[])`,
      [u.access.companyId, id, u.access.assignedBranches.map((b) => b.id)],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  return { ...row, recordedAt: new Date(row.recordedAt).toISOString() };
}
export async function expenseList(u: UnitOfWork, f: FinanceFilter) {
  const p = await financePredicates(u, f, true),
    n = p.args.length;
  const rows = await u.client.query<PaidExpense & { total: string }>(
    `SELECT ${columns},count(*) OVER()::text AS total FROM ${joins} WHERE ${p.sql} ORDER BY m.actual_date DESC,m.recorded_at DESC,e.id DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
    [...p.args, f.limit, (f.page - 1) * f.limit],
  );
  const total =
    rows.rows[0]?.total ??
    (
      await u.client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM ${joins} WHERE ${p.sql}`,
        p.args,
      )
    ).rows[0]!.total;
  return {
    items: rows.rows.map(({ total: _total, ...r }) => ({
      ...r,
      recordedAt: new Date(r.recordedAt).toISOString(),
    })),
    total: Number(total),
    page: f.page,
    limit: f.limit,
  };
}
