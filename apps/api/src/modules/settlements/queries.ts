import { AccessError, accountPosition, cairoDayRange, minor, subtractMinor } from '@shahn/domain';
import type {
  SettlementCaseDetail,
  SettlementCaseFilter,
  SettlementCaseList,
  SettlementCaseSummary,
  SettlementCatalog,
  SettlementLink,
  SettlementObservation,
  SettlementPendingReview,
  SettlementResolutionView,
} from '@shahn/contracts';
import { readProducts, readReferences, safeStockNumber } from '@shahn/database';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { accountList } from '../finance/service.js';
import { resolverByName, type settlementRegistry } from './registry.js';

type Registry = ReturnType<typeof settlementRegistry>;
const caseColumns = `c.id,c.reference,c.target_kind AS "targetKind",c.target_id AS "targetId",c.operation,c.state,c.branch_id AS "branchId",
 br.name AS "branchName",c.reason,c.actual_date::text AS "actualDate",c.recorded_at AS "recordedAt",c.actor_name AS "actorName",c.version`;
/** Operations whose screen grants the caller holds; cases of other operations stay invisible. */
function visibleOperations(u: UnitOfWork, registry: Registry) {
  return registry
    .filter((r) => r.capabilities.every((c) => u.access.grants.includes(c)))
    .map((r) => r.operation);
}
const toSummary = (r: SettlementCaseSummary & { recordedAt: Date | string }) => ({
  ...r,
  recordedAt: new Date(r.recordedAt).toISOString(),
});
export async function caseList(
  u: UnitOfWork,
  registry: Registry,
  f: SettlementCaseFilter,
): Promise<SettlementCaseList> {
  if (f.branchId) u.assertBranch(f.branchId);
  if (f.from && f.to && f.from > f.to) throw new AccessError('INVALID_DATE_RANGE', 400);
  const page = Number(f.page ?? 1),
    limit = Number(f.limit ?? 25),
    branches = u.access.assignedBranches.map((b) => b.id);
  const search = (f.search ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const args = [
    u.access.companyId,
    f.branchId ? [f.branchId] : branches,
    visibleOperations(u, registry),
    f.targetKind && f.targetKind !== 'all' ? f.targetKind : null,
    f.state && f.state !== 'all' ? f.state : null,
    search,
    f.from ? cairoDayRange(f.from).start : null,
    f.to ? cairoDayRange(f.to).end : null,
  ];
  const where = `c.company_id=$1 AND c.branch_id=ANY($2::uuid[]) AND c.operation=ANY($3::text[]) AND ($4::text IS NULL OR c.target_kind=$4)
   AND ($5::text IS NULL OR c.state=$5) AND ($6='' OR c.reference=$6) AND ($7::timestamptz IS NULL OR c.recorded_at>=$7) AND ($8::timestamptz IS NULL OR c.recorded_at<$8)`;
  const row = (
    await u.client.query<{
      total: string;
      items: (SettlementCaseSummary & { recordedAt: string })[];
    }>(
      `WITH filtered AS (SELECT ${caseColumns} FROM settlements.adjustment_case c JOIN access.branch br ON(br.company_id,br.id)=(c.company_id,c.branch_id) WHERE ${where})
       SELECT (SELECT count(*)::text FROM filtered) AS total,
       COALESCE((SELECT jsonb_agg(t) FROM (SELECT * FROM filtered ORDER BY state DESC,"recordedAt" DESC,id LIMIT $9 OFFSET $10) t),'[]') AS items`,
      [...args, limit, (page - 1) * limit],
    )
  ).rows[0]!;
  const pending: SettlementPendingReview[] = [];
  if (u.access.grants.includes('brand.payout'))
    pending.push(
      ...(
        await u.client.query<SettlementPendingReview & { createdAt: Date }>(
          `SELECT 'source' AS kind,r.id,'شحنة ' || s.reference || ' · ' || COALESCE(r.basis->>'reason','فرق مصدر') AS label,v.branch_id AS "branchId",r.created_at AS "createdAt",
           COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h JOIN kernel.source_record sr ON(sr.company_id,sr.id)=(h.company_id,h.source_id)
             WHERE h.company_id=r.company_id AND sr.system='execution' AND sr.kind='outcome' AND sr.revision=r.basis->'outcome'->>'revision' AND h.lot_id::text=r.basis->'previous'->>'goods_effect_id'
             AND NOT EXISTS(SELECT 1 FROM kernel.hold_release x WHERE x.company_id=h.company_id AND x.hold_id=h.id)),0)::text AS "heldMinor"
           FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id)
           JOIN shipments.shipment s ON(s.company_id,s.id)=(v.company_id,v.shipment_id)
           WHERE r.company_id=$1 AND r.state='open' AND v.branch_id=ANY($2::uuid[]) ORDER BY r.created_at,r.id LIMIT 100`,
          [u.access.companyId, branches],
        )
      ).rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
    );
  if (u.access.grants.includes('incidents') && u.access.grants.includes('brand.payout'))
    pending.push(
      ...(
        await u.client.query<SettlementPendingReview & { createdAt: Date }>(
          `SELECT 'incident' AS kind,i.id,'حادث ' || i.reference || ' · ' || r.reason AS label,i.responsible_branch_id AS "branchId",r.recorded_at AS "createdAt",
           COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=r.company_id AND h.source_id=r.source_id
             AND NOT EXISTS(SELECT 1 FROM kernel.hold_release x WHERE x.company_id=h.company_id AND x.hold_id=h.id)),0)::text AS "heldMinor"
           FROM incidents.review r JOIN incidents.incident i ON(i.company_id,i.id)=(r.company_id,r.incident_id)
           WHERE r.company_id=$1 AND i.responsible_branch_id=ANY($2::uuid[])
           AND NOT EXISTS(SELECT 1 FROM settlements.case_link l JOIN settlements.adjustment_case c ON(c.company_id,c.id)=(l.company_id,l.case_id)
             WHERE l.company_id=r.company_id AND l.entity_kind='incident_review' AND l.entity_id=r.id AND c.state='resolved')
           ORDER BY r.recorded_at,r.id LIMIT 100`,
          [u.access.companyId, branches],
        )
      ).rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
    );
  return {
    items: row.items.map(toSummary),
    total: Number(row.total),
    page,
    limit,
    pendingReviews: pending,
  };
}
async function observation(u: UnitOfWork, caseId: string): Promise<SettlementObservation | null> {
  const company = u.access.companyId;
  const s = (
    await u.client.query<{
      branch_id: string;
      brand_id: string;
      variant_id: string;
      label: string;
      condition: 'sound' | 'unavailable';
      recorded_quantity: string;
      observed_quantity: string;
      delta: string;
      reserved_quantity: string;
      shortage_after: string;
      observed_date: string;
      current_sound: string;
      current_reserved: string;
      held: string;
    }>(
      `SELECT o.branch_id,o.brand_id,o.variant_id,concat_ws(' · ',b.name,p.name,v.name) AS label,o.condition,o.recorded_quantity::text,o.observed_quantity::text,
       o.delta::text,o.reserved_quantity::text,o.shortage_after::text,o.observed_date::text,s.sound_on_hand::text AS current_sound,
       COALESCE((SELECT sum(r.quantity) FROM inventory.stock_reservation r WHERE (r.company_id,r.branch_id,r.brand_id,r.variant_id)=(o.company_id,o.branch_id,o.brand_id,o.variant_id) AND r.active),0)::text AS current_reserved,
       (SELECT count(*) FROM inventory.stock_reservation r WHERE (r.company_id,r.branch_id,r.brand_id,r.variant_id)=(o.company_id,o.branch_id,o.brand_id,o.variant_id) AND r.active AND r.shortage_held)::text AS held
       FROM settlements.stock_observation o JOIN inventory.stock_position s ON(s.company_id,s.branch_id,s.brand_id,s.variant_id)=(o.company_id,o.branch_id,o.brand_id,o.variant_id)
       JOIN inventory.product_variant v ON(v.company_id,v.id)=(o.company_id,o.variant_id) JOIN inventory.product p ON(p.company_id,p.id)=(v.company_id,v.product_id)
       JOIN commercial.brand b ON(b.company_id,b.id)=(o.company_id,o.brand_id) WHERE o.company_id=$1 AND o.case_id=$2`,
      [company, caseId],
    )
  ).rows[0];
  if (s) {
    const sound = safeStockNumber(s.current_sound),
      reserved = safeStockNumber(s.current_reserved);
    return {
      kind: 'stock',
      branchId: s.branch_id,
      brandId: s.brand_id,
      variantId: s.variant_id,
      variantLabel: s.label,
      condition: s.condition,
      recordedQuantity: safeStockNumber(s.recorded_quantity),
      observedQuantity: safeStockNumber(s.observed_quantity),
      delta: Number(s.delta),
      reservedQuantity: safeStockNumber(s.reserved_quantity),
      shortageAfter: safeStockNumber(s.shortage_after),
      currentSound: sound,
      currentReserved: reserved,
      currentShortage: Math.max(reserved - sound, 0),
      heldReservations: safeStockNumber(s.held),
      observedDate: s.observed_date,
    };
  }
  const a = (
    await u.client.query<{
      account_id: string;
      name: string;
      book_minor: string;
      observed_minor: string;
      difference_minor: string;
      hold_original: string;
      hold_active: string;
      resolved: string;
      book_now: string;
      account_hold: string;
      observed_date: string;
    }>(
      `SELECT o.account_id,a.name,o.book_minor::text,o.observed_minor::text,o.difference_minor::text,
       COALESCE(h.amount_minor,0)::text AS hold_original,COALESCE(h.active_minor,0)::text AS hold_active,
       COALESCE((SELECT sum(r.amount_minor) FROM settlements.resolution r WHERE r.company_id=o.company_id AND r.case_id=o.case_id AND r.classification<>'account_observation'),0)::text AS resolved,
       b.amount_minor::text AS book_now,
       COALESCE((SELECT sum(x.active_minor) FROM settlements.account_hold_balance x WHERE x.company_id=o.company_id AND x.account_id=o.account_id),0)::text AS account_hold,
       o.observed_date::text
       FROM settlements.account_observation o JOIN finance.account a ON(a.company_id,a.id)=(o.company_id,o.account_id)
       JOIN finance.account_balance b ON(b.company_id,b.account_id)=(o.company_id,o.account_id)
       LEFT JOIN settlements.account_hold_balance h ON(h.company_id,h.case_id)=(o.company_id,o.case_id)
       WHERE o.company_id=$1 AND o.case_id=$2`,
      [company, caseId],
    )
  ).rows[0];
  if (!a) return null;
  const position = accountPosition(a.book_now, a.account_hold);
  const total =
    minor(a.difference_minor) < 0n ? -minor(a.difference_minor) : minor(a.difference_minor);
  return {
    kind: 'account',
    accountId: a.account_id,
    accountName: a.name,
    bookAtObservationMinor: a.book_minor,
    observedMinor: a.observed_minor,
    differenceMinor: a.difference_minor,
    holdOriginalMinor: a.hold_original,
    holdActiveMinor: a.hold_active,
    resolvedMinor: a.resolved,
    remainingMinor: subtractMinor(total, minor(a.resolved, 'nonnegative')).toString(),
    bookNowMinor: a.book_now,
    estimatedActualMinor: position.estimatedActualMinor,
    availableNowMinor: position.availableMinor,
    observedDate: a.observed_date,
  };
}
export async function caseDetail(
  u: UnitOfWork,
  registry: Registry,
  caseId: string,
): Promise<SettlementCaseDetail> {
  const row = (
    await u.client.query<SettlementCaseSummary & { recordedAt: Date }>(
      `SELECT ${caseColumns} FROM settlements.adjustment_case c JOIN access.branch br ON(br.company_id,br.id)=(c.company_id,c.branch_id) WHERE c.company_id=$1 AND c.id=$2`,
      [u.access.companyId, caseId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(row.branchId);
  const r = resolverByName(registry, row.operation);
  if (!r || !r.capabilities.every((c) => u.access.grants.includes(c)))
    throw new AccessError('NOT_FOUND', 404);
  const resolutions = (
    await u.client.query<SettlementResolutionView & { recordedAt: Date }>(
      `SELECT id,operation,classification,amount_minor::text AS "amountMinor",quantity::float8 AS quantity,reason,actual_date::text AS "actualDate",
       recorded_at AS "recordedAt",actor_name AS "actorName",effect_digest AS digest,preview FROM settlements.resolution WHERE company_id=$1 AND case_id=$2 ORDER BY recorded_at,id`,
      [u.access.companyId, caseId],
    )
  ).rows.map((x) => ({ ...x, recordedAt: new Date(x.recordedAt).toISOString() }));
  const links = (
    await u.client.query<SettlementLink>(
      `SELECT role,entity_kind AS "entityKind",entity_id AS "entityId",label FROM settlements.case_link WHERE company_id=$1 AND case_id=$2 ORDER BY recorded_at,role,entity_kind,entity_id`,
      [u.access.companyId, caseId],
    )
  ).rows;
  return {
    case: toSummary(row),
    observation: await observation(u, caseId),
    resolutions,
    links,
  };
}
/** Opening setup is one screen grant over every target type, still scoped to assigned branches. */
export async function settlementCatalog(
  u: UnitOfWork,
  mode: 'settlements' | 'opening' = 'settlements',
): Promise<SettlementCatalog> {
  const g = (c: string) => mode === 'opening' || u.access.grants.includes(c as never);
  const company = u.access.companyId,
    branches = u.access.assignedBranches.map((b) => b.id);
  const accounts =
    g('finance.accounts') || g('expenses') || g('finance.movements')
      ? (await accountList(u)).items.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          branchIds: a.branchIds,
        }))
      : [];
  const brands = (
    await u.client.query<{ id: string; name: string }>(
      'SELECT id,name FROM commercial.brand WHERE company_id=$1 ORDER BY name,id',
      [company],
    )
  ).rows;
  const employees = g('employees')
    ? (
        await u.client.query<{ id: string; name: string; branchId: string }>(
          `SELECT id,name,branch_id AS "branchId" FROM employees.employee WHERE company_id=$1 AND branch_id=ANY($2::uuid[]) ORDER BY name,id`,
          [company, branches],
        )
      ).rows
    : [];
  const categories = g('expenses')
    ? (await readReferences(u.client, company))
        .filter((r) => r.kind === 'expense_category' && r.active)
        .map(({ id, name }) => ({ id, name }))
    : [];
  const variants = g('inventory')
    ? (await readProducts(u.client, company)).flatMap((p) =>
        p.variants.map((v) => ({
          variantId: v.id,
          brandId: p.brandId,
          label: [p.name, v.name, v.options].filter(Boolean).join(' · '),
        })),
      )
    : [];
  const today = (
    await u.client.query<{ today: string }>(
      `SELECT (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date::text AS today`,
    )
  ).rows[0]!.today;
  return {
    branches: u.access.assignedBranches,
    grants: [...u.access.grants],
    accounts,
    brands,
    employees,
    categories,
    variants,
    today,
  };
}
