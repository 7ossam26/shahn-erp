import { AccessError } from '@shahn/domain';
import type { FinanceFilter, MoneyMovement } from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { authorizedAccount } from '../accounts/service.js';
export const movementColumns = `m.id,m.account_id AS "accountId",m.branch_id AS "branchId",m.source_id AS "sourceId",m.effect_id AS "effectId",m.source_kind AS "sourceKind",m.direction,m.amount_minor::text AS "amountMinor",m.currency,m.method,m.actual_date::text AS "actualDate",m.reason,m.account_name AS "accountName",m.branch_name AS "branchName",m.actor_id AS "actorId",m.actor_name AS "actorName",m.recorded_at AS "recordedAt"`;
export async function movementDetail(u: UnitOfWork, id: string): Promise<MoneyMovement> {
  const row = (
    await u.client.query<MoneyMovement>(
      `SELECT ${movementColumns} FROM finance.money_movement m WHERE m.company_id=$1 AND m.id=$2 AND m.branch_id=ANY($3::uuid[])`,
      [u.access.companyId, id, u.access.assignedBranches.map((b) => b.id)],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  return { ...row, recordedAt: new Date(row.recordedAt).toISOString() };
}
export async function financePredicates(u: UnitOfWork, f: FinanceFilter, expense: boolean) {
  if (f.branchId) u.assertBranch(f.branchId);
  if (f.accountId) await authorizedAccount(u, f.accountId);
  if (f.from && f.to && f.from > f.to) throw new AccessError('VALIDATION_FAILED', 400);
  if (
    f.categoryId &&
    !(
      await u.client.query(
        `SELECT 1 FROM commercial.reference WHERE company_id=$1 AND id=$2 AND kind='expense_category'`,
        [u.access.companyId, f.categoryId],
      )
    ).rowCount
  )
    throw new AccessError('NOT_FOUND', 404);
  if (
    f.actorId &&
    !(
      await u.client.query(
        `SELECT 1 FROM finance.money_movement WHERE company_id=$1 AND actor_id=$2 AND branch_id=ANY($3::uuid[]) LIMIT 1`,
        [u.access.companyId, f.actorId, u.access.assignedBranches.map((b) => b.id)],
      )
    ).rowCount
  )
    throw new AccessError('NOT_FOUND', 404);
  const date =
    f.dateBasis === 'actual'
      ? 'm.actual_date'
      : `(${expense ? 'e' : 'm'}.recorded_at AT TIME ZONE 'Africa/Cairo')::date`;
  return {
    sql: `m.company_id=$1 AND m.branch_id=ANY($2::uuid[])
    AND ($3::uuid IS NULL OR m.branch_id=$3) AND ($4::uuid IS NULL OR m.account_id=$4)
    AND ($5='all' OR m.method=$5) AND ($6='all' OR m.direction=$6)
    AND ($7::uuid IS NULL OR m.actor_id=$7) AND ($8::date IS NULL OR ${date}>=$8::date)
    AND ($9::date IS NULL OR ${date}<($9::date+1))
    AND strpos(translate(lower(${expense ? 'e.description' : 'm.reason'}),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),lower($10))>0
    ${expense ? 'AND ($11::uuid IS NULL OR e.category_id=$11)' : ''}`,
    args: [
      u.access.companyId,
      u.access.assignedBranches.map((b) => b.id),
      f.branchId,
      f.accountId,
      f.method,
      f.direction,
      f.actorId,
      f.from,
      f.to,
      f.search,
      ...(expense ? [f.categoryId] : []),
    ],
  };
}
export async function movementList(u: UnitOfWork, f: FinanceFilter) {
  if (f.categoryId) throw new AccessError('VALIDATION_FAILED', 400);
  const p = await financePredicates(u, f, false),
    n = p.args.length;
  const rows = await u.client.query<MoneyMovement & { total: string }>(
    `SELECT ${movementColumns},count(*) OVER()::text AS total FROM finance.money_movement m WHERE ${p.sql} ORDER BY m.actual_date DESC,m.recorded_at DESC,m.id DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
    [...p.args, f.limit, (f.page - 1) * f.limit],
  );
  const total =
    rows.rows[0]?.total ??
    (
      await u.client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM finance.money_movement m WHERE ${p.sql}`,
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
