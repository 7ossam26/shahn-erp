import { AccessError, minor } from '@shahn/domain';
import type {
  BrandDue,
  BrandDuesList,
  BrandWalletAmounts,
  PayoutCalendar,
  WalletLotList,
  WalletStatement,
} from '@shahn/contracts';
import { readBrand } from '@shahn/database';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import {
  BrandWalletService,
  addDays,
  cairoToday,
  nextPayoutDate,
  walletReasons,
  weekdayOf,
} from './wallet.service.js';

const PAGE = 25;
/**
 * One-statement (single snapshot) evaluation of the same P03 lot formula for many brands, used
 * only by unlocked list/calendar reads. Locked payout decisions always use BrandWalletService.
 */
const amountsSql = `
 lot AS (
  SELECT l.brand_id,
   l.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=l.company_id AND a.lot_id=l.id),0) AS remaining,
   COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=l.company_id AND h.lot_id=l.id
     AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id)),0) AS held,
   (l.readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release cr WHERE cr.company_id=l.company_id AND cr.lot_id=l.id)) AS eligible
  FROM kernel.credit_lot l WHERE l.company_id=$1),
 deb AS (
  SELECT e.subject_id AS brand_id,-e.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=e.company_id AND a.effect_id=e.id),0) AS remaining
  FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.amount_minor<0 AND e.kind<>'payout'),
 cov AS (
  SELECT c.brand_id,c.amount_minor FROM kernel.shipping_cover c WHERE c.company_id=$1
  AND NOT EXISTS(SELECT 1 FROM kernel.cover_close x WHERE x.company_id=c.company_id AND x.cover_id=c.id)),
 paid AS (
  SELECT subject_id AS brand_id,-sum(amount_minor) AS amount FROM kernel.journal_effect
  WHERE company_id=$1 AND family='brand' AND kind='payout' GROUP BY subject_id),
 totals AS (
  SELECT b.id AS brand_id,
   COALESCE((SELECT sum(remaining) FROM lot WHERE lot.brand_id=b.id AND eligible),0) AS e,
   COALESCE((SELECT sum(remaining) FROM lot WHERE lot.brand_id=b.id AND NOT eligible),0) AS p,
   COALESCE((SELECT sum(held) FROM lot WHERE lot.brand_id=b.id AND eligible),0) AS h,
   COALESCE((SELECT sum(remaining) FROM deb WHERE deb.brand_id=b.id),0) AS d,
   COALESCE((SELECT sum(amount_minor) FROM cov WHERE cov.brand_id=b.id),0) AS c,
   COALESCE((SELECT amount FROM paid WHERE paid.brand_id=b.id),0) AS paid
  FROM commercial.brand b WHERE b.company_id=$1)`;
interface TotalsRow {
  brand_id: string;
  e: string;
  p: string;
  h: string;
  d: string;
  c: string;
  paid: string;
}
export function amountsFromTotals(r: TotalsRow): BrandWalletAmounts {
  const e = minor(r.e, 'nonnegative'),
    p = minor(r.p, 'nonnegative'),
    h = minor(r.h, 'nonnegative'),
    d = minor(r.d, 'nonnegative'),
    c = minor(r.c, 'nonnegative'),
    payable = e - d - h - c;
  return {
    eligibleMinor: e.toString(),
    pendingMinor: p.toString(),
    debitsMinor: d.toString(),
    heldMinor: h.toString(),
    coverMinor: c.toString(),
    signedEntitlementMinor: (e + p - d).toString(),
    eligibleToPayMinor: (payable > 0n ? payable : 0n).toString(),
    paidMinor: minor(r.paid, 'nonnegative').toString(),
  };
}
/** Unlocked company-wide totals for list/calendar reads (same formula; single SQL snapshot). */
export async function walletTotals(u: UnitOfWork, brandIds?: readonly string[]) {
  const rows = (
    await u.client.query<TotalsRow>(
      `WITH ${amountsSql} SELECT brand_id,e::text,p::text,h::text,d::text,c::text,paid::text FROM totals
       WHERE $2::uuid[] IS NULL OR brand_id=ANY($2::uuid[])`,
      [u.access.companyId, brandIds ?? null],
    )
  ).rows;
  return new Map(rows.map((r) => [r.brand_id, amountsFromTotals(r)]));
}
export async function brandDues(
  u: UnitOfWork,
  filter: { search?: string; state?: string; scheduled?: string; page?: string },
): Promise<BrandDuesList> {
  const today = await cairoToday(u),
    page = Number(filter.page ?? 1);
  const rows = (
    await u.client.query<
      TotalsRow & {
        name: string;
        active: boolean;
        weekdays: number[];
        total: string;
      }
    >(
      `WITH ${amountsSql},
       listed AS (
        SELECT b.id,b.name,b.active,ARRAY(SELECT jsonb_array_elements_text(p.fields->'payoutWeekdays')::int) AS weekdays,t.*
        FROM commercial.brand b JOIN commercial.brand_policy p ON(p.company_id,p.brand_id,p.version)=(b.company_id,b.id,b.version)
        JOIN totals t ON t.brand_id=b.id
        WHERE b.company_id=$1
        AND strpos(translate(lower(b.name),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),
          translate(lower($2),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'))>0
        AND ($3='all' OR ($3='payable' AND t.e-t.d-t.h-t.c>0) OR ($3='pending' AND t.p>0) OR ($3='held' AND t.h>0)
          OR ($3='debt' AND (t.d>0 OR t.e+t.p-t.d<0)))
        AND ($4='all' OR (p.fields->'payoutWeekdays') @> to_jsonb(EXTRACT(dow FROM $5::date)::int)))
       SELECT id AS brand_id,name,active,weekdays,e::text,p::text,h::text,d::text,c::text,paid::text,count(*) OVER()::text AS total
       FROM listed ORDER BY (e-d-h-c>0) DESC,lower(name),id LIMIT ${PAGE} OFFSET $6`,
      [
        u.access.companyId,
        filter.search ?? '',
        filter.state ?? 'all',
        filter.scheduled ?? 'all',
        today,
        (page - 1) * PAGE,
      ],
    )
  ).rows;
  const items: BrandDue[] = rows.map((r) => {
    const amounts = amountsFromTotals(r),
      weekdays = [...r.weekdays].sort();
    return {
      brandId: r.brand_id,
      brandName: r.name,
      active: r.active,
      payoutWeekdays: weekdays,
      scheduledToday: weekdays.includes(weekdayOf(today)),
      nextPayoutDate: nextPayoutDate(today, weekdays),
      amounts,
      reasons: walletReasons(amounts),
    };
  });
  return { items, total: Number(rows[0]?.total ?? 0), page, limit: PAGE, today };
}
async function requireBrand(u: UnitOfWork, brandId: string) {
  const brand = await readBrand(u.client, u.access.companyId, brandId);
  if (!brand) throw new AccessError('NOT_FOUND', 404);
  return brand;
}
const linkSql = {
  shipment: (
    lot: string,
  ) => `(SELECT json_build_object('id',s.id,'reference',s.reference) FROM execution.allocation al
     JOIN execution.visit_fact v ON(v.company_id,v.id)=(al.company_id,al.visit_id)
     JOIN shipments.shipment s ON(s.company_id,s.id)=(v.company_id,v.shipment_id)
     WHERE al.company_id=$1 AND (al.goods_effect_id=${lot} OR al.fee_effect_id=${lot} OR al.source_record_id=e.source_id) LIMIT 1)`,
  remittance: (
    lot: string,
  ) => `(SELECT json_build_object('id',r.id,'reference',r.reference) FROM finance.remittance_source rs
     JOIN finance.remittance r ON(r.company_id,r.id)=(rs.company_id,rs.remittance_id)
     WHERE rs.company_id=$1 AND rs.credit_lot_id=${lot} LIMIT 1)`,
};
export async function walletLots(
  u: UnitOfWork,
  brandId: string,
  filter: { state?: string; branchId?: string; page?: string },
): Promise<WalletLotList> {
  await requireBrand(u, brandId);
  const page = Number(filter.page ?? 1);
  const rows = (
    await u.client.query(
      `WITH lots AS (
        SELECT l.id,e.kind,e.branch_id,e.effective_date,l.amount_minor,e.source_id,
         COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=l.company_id AND a.lot_id=l.id),0) AS allocated,
         COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=l.company_id AND h.lot_id=l.id
           AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id)),0) AS held,
         (l.readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release cr WHERE cr.company_id=l.company_id AND cr.lot_id=l.id)) AS eligible
        FROM kernel.credit_lot l JOIN kernel.journal_effect e ON(e.company_id,e.id)=(l.company_id,l.id)
        WHERE l.company_id=$1 AND l.brand_id=$2 AND ($3::uuid IS NULL OR e.branch_id=$3)),
       states AS (
        SELECT *,CASE WHEN NOT eligible THEN 'pending' WHEN amount_minor-allocated=0 THEN 'consumed'
         WHEN held>0 THEN 'held' ELSE 'eligible' END AS state FROM lots)
       SELECT st.id AS "lotId",st.kind,st.branch_id AS "branchId",b.name AS "branchName",st.effective_date::text AS "effectiveDate",
        st.amount_minor::text AS "amountMinor",st.allocated::text AS "allocatedMinor",st.held::text AS "heldMinor",
        (st.amount_minor-st.allocated)::text AS "remainingMinor",CASE WHEN st.eligible THEN 'eligible' ELSE 'pending' END AS readiness,
        st.state,
        ${linkSql.shipment('st.id')} AS shipment,
        ${linkSql.remittance('st.id')} AS remittance,
        COALESCE((SELECT json_agg(json_build_object('id',h.id,'amountMinor',h.amount_minor::text,'reason',h.reason,
          'active',NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id)) ORDER BY h.id)
          FROM kernel.wallet_hold h WHERE h.company_id=$1 AND h.lot_id=st.id),'[]'::json) AS holds,
        count(*) OVER()::text AS total
       FROM states st JOIN kernel.journal_effect e ON(e.company_id,e.id)=($1,st.id)
       JOIN access.branch b ON(b.company_id,b.id)=($1,st.branch_id)
       WHERE $4='all' OR st.state=$4
       ORDER BY st.effective_date DESC,st.id DESC LIMIT ${PAGE} OFFSET $5`,
      [
        u.access.companyId,
        brandId,
        filter.branchId ?? null,
        filter.state ?? 'all',
        (page - 1) * PAGE,
      ],
    )
  ).rows as (WalletLotList['items'][number] & { total?: string })[];
  const total = Number(rows[0]?.total ?? 0);
  return {
    items: rows.map(({ total: _t, ...item }) => item),
    total,
    page,
    limit: PAGE,
  };
}
const STATEMENT_PAGE = 50;
export async function walletStatement(
  u: UnitOfWork,
  brandId: string,
  filter: {
    from?: string;
    to?: string;
    kind?: string;
    branchId?: string;
    basis?: string;
    page?: string;
  },
): Promise<WalletStatement> {
  const brand = await requireBrand(u, brandId);
  // Locked current wallet: the statement's closing balance and the payable view come from the
  // same committed state, so the displayed history explains the totals to the piastre.
  await BrandWalletService.lock(u, [brandId]);
  const wallet = new BrandWalletService(u, brandId),
    current = await wallet.amounts(),
    rec = await wallet.reconcile();
  const page = Number(filter.page ?? 1),
    kind = filter.kind ?? 'all',
    basis = filter.basis ?? 'all',
    filtered = kind !== 'all' || basis !== 'all' || !!filter.branchId;
  const args = [
    u.access.companyId,
    brandId,
    filter.from ?? null,
    filter.to ?? null,
    kind,
    filter.branchId ?? null,
    basis,
  ];
  const where = `($3::date IS NULL OR m.effective_date>=$3) AND ($4::date IS NULL OR m.effective_date<=$4)
     AND ($5='all' OR m.kind=$5) AND ($6::uuid IS NULL OR m.branch_id=$6)
     AND ($7='all' OR ($7='paying')=(m.kind='payout'))`;
  const ordered = `WITH m AS (
     SELECT e.*,sum(e.amount_minor) OVER(ORDER BY e.effective_date,e.recorded_at,e.id) AS balance_after
     FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=$2)`;
  const totals = (
    await u.client.query<{
      opening: string;
      closing: string;
      credits: string;
      debits: string;
      total: string;
    }>(
      `${ordered}
       SELECT COALESCE((SELECT sum(amount_minor) FROM m WHERE $3::date IS NOT NULL AND effective_date<$3),0)::text AS opening,
        COALESCE((SELECT sum(amount_minor) FROM m WHERE $4::date IS NULL OR effective_date<=$4),0)::text AS closing,
        COALESCE((SELECT sum(amount_minor) FROM m WHERE ${where} AND amount_minor>0),0)::text AS credits,
        COALESCE((SELECT -sum(amount_minor) FROM m WHERE ${where} AND amount_minor<0),0)::text AS debits,
        (SELECT count(*) FROM m WHERE ${where})::text AS total`,
      args,
    )
  ).rows[0]!;
  const items = (
    await u.client.query(
      `${ordered}
       SELECT m.id,m.kind,m.amount_minor::text AS "amountMinor",m.balance_after::text AS "balanceAfterMinor",
        m.effective_date::text AS "effectiveDate",m.recorded_at AS "recordedAt",m.branch_id AS "branchId",b.name AS "branchName",
        CASE WHEN m.kind='payout' THEN 'paying' ELSE 'source' END AS basis,
        (SELECT CASE WHEN l.readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release cr WHERE cr.company_id=l.company_id AND cr.lot_id=l.id)
          THEN 'eligible' ELSE 'pending' END FROM kernel.credit_lot l WHERE l.company_id=$1 AND l.id=m.id) AS readiness,
        (SELECT json_build_object('id',p.id,'reference',p.reference) FROM finance.brand_payout p WHERE p.company_id=$1 AND p.effect_id=m.id) AS payout,
        ${linkSql.shipment('m.id').replaceAll('e.source_id', 'm.source_id')} AS shipment,
        ${linkSql.remittance('m.id')} AS remittance,
        m.supersedes_id AS "supersedesId",m.reason
       FROM m JOIN access.branch b ON(b.company_id,b.id)=($1,m.branch_id)
       WHERE ${where}
       ORDER BY m.effective_date,m.recorded_at,m.id LIMIT ${STATEMENT_PAGE} OFFSET $8`,
      [...args, (page - 1) * STATEMENT_PAGE],
    )
  ).rows as WalletStatement['items'];
  return {
    brandId,
    brandName: brand.name,
    from: filter.from ?? null,
    to: filter.to ?? null,
    filtered,
    openingMinor: totals.opening,
    closingMinor: totals.closing,
    creditsMinor: totals.credits,
    debitsMinor: totals.debits,
    items: items.map((i) => ({ ...i, recordedAt: new Date(i.recordedAt).toISOString() })),
    total: Number(totals.total),
    page,
    limit: STATEMENT_PAGE,
    current,
    journalMinor: rec.journalMinor,
    reconciled: rec.reconciled,
  };
}
export async function payoutCalendar(
  u: UnitOfWork,
  filter: { from: string; to: string; brandId?: string },
): Promise<PayoutCalendar> {
  if (filter.from > filter.to) throw new AccessError('VALIDATION_FAILED', 400);
  const days: string[] = [];
  for (let d = filter.from; d <= filter.to; d = addDays(d, 1)) {
    days.push(d);
    if (days.length > 42) throw new AccessError('VALIDATION_FAILED', 400);
  }
  if (filter.brandId) await requireBrand(u, filter.brandId);
  const brands = (
    await u.client.query<{ id: string; name: string; weekdays: number[] }>(
      `SELECT b.id,b.name,ARRAY(SELECT jsonb_array_elements_text(p.fields->'payoutWeekdays')::int) AS weekdays
       FROM commercial.brand b JOIN commercial.brand_policy p ON(p.company_id,p.brand_id,p.version)=(b.company_id,b.id,b.version)
       WHERE b.company_id=$1 AND b.active AND ($2::uuid IS NULL OR b.id=$2) ORDER BY lower(b.name),b.id`,
      [u.access.companyId, filter.brandId ?? null],
    )
  ).rows;
  const totals = await walletTotals(
    u,
    brands.map((b) => b.id),
  );
  const payouts = (
    await u.client.query<{
      id: string;
      reference: string;
      brandId: string;
      brandName: string;
      amountMinor: string;
      offDay: boolean;
      actualDate: string;
    }>(
      `SELECT id,reference,brand_id AS "brandId",brand_name AS "brandName",amount_minor::text AS "amountMinor",off_day AS "offDay",actual_date::text AS "actualDate"
       FROM finance.brand_payout WHERE company_id=$1 AND actual_date BETWEEN $2 AND $3 AND ($4::uuid IS NULL OR brand_id=$4)
       ORDER BY actual_date,recorded_at,id`,
      [u.access.companyId, filter.from, filter.to, filter.brandId ?? null],
    )
  ).rows;
  return {
    from: filter.from,
    to: filter.to,
    today: await cairoToday(u),
    days: days.map((date) => {
      const weekday = weekdayOf(date);
      return {
        date,
        weekday,
        scheduled: brands
          .filter((b) => b.weekdays.includes(weekday))
          .map((b) => ({
            brandId: b.id,
            brandName: b.name,
            eligibleToPayMinor: totals.get(b.id)?.eligibleToPayMinor ?? '0',
          })),
        payouts: payouts.filter((p) => p.actualDate === date).map(({ actualDate: _a, ...p }) => p),
      };
    }),
  };
}
