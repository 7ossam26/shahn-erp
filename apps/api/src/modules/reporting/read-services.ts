import type { ReportFilters, ReportId, ReportRow } from '@shahn/contracts';
import { reportDefinition } from '@shahn/contracts';
import { AccessError, cairoDayRange } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { walletTotals } from '../finance/brand-wallet/queries.js';

/** All SQL fragments below are server-owned. Outer predicates are closed registry dimensions. */
const scope = (alias: string, field = 'branch_id') =>
  `${alias}.company_id=$1 AND ${alias}.${field}=ANY($2::uuid[])`;
const stamp = (expr: string) =>
  `to_char(${expr} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const actual = (expr: string) => `(${expr}::timestamp AT TIME ZONE 'Africa/Cairo')`;
const branch = (expr: string) =>
  `(SELECT name FROM access.branch WHERE company_id=$1 AND id=${expr})`;
const brand = (expr: string) =>
  `(SELECT name FROM commercial.brand WHERE company_id=$1 AND id=${expr})`;
const sources: Partial<Record<ReportId, string>> = {
  'REP-01': `SELECT s.id::text AS id,s.branch_id,s.brand_id,NULL::uuid AS driver_id,NULL::uuid AS account_id,NULL::uuid AS category_id,
    r.fields->>'service' AS service,s.state AS status,NULL::text AS kind,NULL::text AS method,NULL::text AS condition,
    r.fields->>'governorateId' AS governorate_id,r.fields->>'areaId' AS area_id,
    concat_ws(' ',s.reference,r.fields->>'brandReference',r.fields->>'recipientName',r.fields->>'phoneDisplay') AS search,
    CASE WHEN $3='lastState' THEN greatest((SELECT max(e.recorded_at) FROM shipments.event e WHERE e.company_id=$1 AND e.shipment_id=s.id),(SELECT max(t.confirmed_at) FROM execution.timeline t WHERE t.company_id=$1 AND t.source_id=cy.source_id AND t.task_id=cy.task_id)) ELSE s.received_at END AS date_at,
    NULL::bigint AS amount_minor,
    jsonb_build_object('reference',s.reference,'branch',${branch('s.branch_id')},'brand',${brand('s.brand_id')},'recipient',r.fields->>'recipientName','phone',r.fields->>'phoneDisplay','service',r.fields->>'service','status',s.state,
      'execution',COALESCE(oc.record->>'outcome',cy.task->>'state','local'),
      'custody',CASE WHEN c.transfer_id IS NOT NULL THEN 'transfer' WHEN oc.record->>'outcome'='full' THEN 'recipient' ELSE COALESCE(c.holder,'unknown') END,'custodyBranch',${branch('c.branch_id')},'originalOutcome',first_o.record->>'outcome','effectiveOutcome',oc.record->>'outcome',
      'tier',price.snapshot->>'tierName','tariffMinor',price.snapshot->>'tariffMinor','tariffRevision',concat(price.tariff_id,':',price.tariff_version),
      'date',${stamp('s.received_at')},'recordedAt',${stamp('s.received_at')}) AS values,
    ARRAY[s.id::text,s.command_record_id::text,COALESCE(cy.task_id::text,''),COALESCE(oc.outcome_id::text,''),COALESCE(first_o.outcome_id::text,'')] AS source_ids,concat(s.revision,':',COALESCE(oc.revision,0)) AS revision,COALESCE((oc.record->'time'->>'recordedAt')::timestamptz,s.received_at) AS effective_at,COALESCE(oc.created_at,s.received_at) AS recorded_at,'/shipments/'||s.id AS detail
    FROM shipments.shipment s JOIN shipments.revision r ON(r.company_id,r.shipment_id,r.revision)=(s.company_id,s.id,s.revision)
    JOIN shipments.price_snapshot price ON(price.company_id,price.shipment_id,price.revision)=(s.company_id,s.id,s.revision)
    LEFT JOIN shipments.parcel_custody c ON(c.company_id,c.shipment_id)=(s.company_id,s.id)
    LEFT JOIN dispatch.cycle cy ON(cy.company_id,cy.shipment_id)=(s.company_id,s.id) AND cy.latest
    LEFT JOIN LATERAL(SELECT outcome_id,revision,record,created_at FROM execution.outcome_fact o WHERE o.company_id=$1 AND o.source_id=cy.source_id AND o.cycle_id=cy.id ORDER BY (record->'time'->>'recordedAt')::timestamptz DESC,revision DESC,outcome_id LIMIT 1) oc ON true
    LEFT JOIN LATERAL(SELECT outcome_id,record FROM execution.outcome_fact o WHERE o.company_id=$1 AND o.source_id=cy.source_id AND o.cycle_id=cy.id ORDER BY created_at,revision,outcome_id LIMIT 1) first_o ON true WHERE ${scope('s')}`,
  'REP-14': `SELECT e.id::text AS id,e.branch_id,NULL::uuid AS brand_id,NULL::uuid AS driver_id,e.account_id,e.category_id,
    NULL::text AS service,NULL::text AS status,'expense'::text AS kind,m.method,NULL::text AS condition,NULL::text AS governorate_id,NULL::text AS area_id,
    concat_ws(' ',e.description,e.category_name,m.reason) AS search,CASE WHEN $3='recorded' THEN e.recorded_at ELSE ${actual('e.actual_date')} END AS date_at,e.amount_minor,
    jsonb_build_object('branch',m.branch_name,'category',e.category_name,'account',m.account_name,'method',m.method,'description',e.description,'amountMinor',e.amount_minor::text,'actor',m.actor_name,'date',e.actual_date::text,'recordedAt',${stamp('e.recorded_at')}) AS values,
    ARRAY[e.source_id::text,e.movement_id::text,c.effect_id::text] AS source_ids,'1'::text AS revision,${actual('e.actual_date')} AS effective_at,e.recorded_at,'/finance/expenses/'||e.id AS detail
    FROM finance.paid_expense e JOIN finance.money_movement m ON(m.company_id,m.id)=(e.company_id,e.movement_id) JOIN finance.paid_cost c ON(c.company_id,c.expense_id)=(e.company_id,e.id) WHERE ${scope('e')}`,
  'REP-08': `SELECT e.id::text AS id,e.branch_id,e.subject_id AS brand_id,NULL::uuid AS driver_id,NULL::uuid AS account_id,NULL::uuid AS category_id,
    NULL::text AS service,NULL::text AS status,e.kind,NULL::text AS method,NULL::text AS condition,NULL::text AS governorate_id,NULL::text AS area_id,
    concat_ws(' ',e.kind,e.reason,${brand('e.subject_id')}) AS search,CASE WHEN $3='recorded' THEN e.recorded_at ELSE ${actual('e.effective_date')} END AS date_at,e.amount_minor,
    jsonb_build_object('branch',${branch('e.branch_id')},'brand',${brand('e.subject_id')},'kind',e.kind,'amountMinor',e.amount_minor::text,'reason',e.reason,'date',e.effective_date::text,'recordedAt',${stamp('e.recorded_at')}) AS values,
    ARRAY[e.source_id::text,e.id::text,COALESCE(e.supersedes_id::text,'')] AS source_ids,'1'::text AS revision,${actual('e.effective_date')} AS effective_at,e.recorded_at,'/brand-payouts/brands/'||e.subject_id AS detail
    FROM kernel.journal_effect e WHERE ${scope('e')} AND e.family='brand'`,
  'REP-10': `SELECT p.id::text AS id,p.paying_branch_id AS branch_id,p.brand_id,NULL::uuid AS driver_id,p.account_id,NULL::uuid AS category_id,
    NULL::text AS service,NULL::text AS status,'payout'::text AS kind,p.method,NULL::text AS condition,NULL::text AS governorate_id,NULL::text AS area_id,
    concat_ws(' ',p.reference,p.brand_name,p.external_reference) AS search,CASE WHEN $3='recorded' THEN p.recorded_at ELSE ${actual('p.actual_date')} END AS date_at,p.amount_minor,
    jsonb_build_object('branch',p.paying_branch_name,'brand',p.brand_name,'reference',p.reference::text,'account',p.account_name,'payoutExtent',CASE WHEN p.amount_minor=p.eligible_before_minor THEN 'full' ELSE 'partial' END,'method',p.method,'amountMinor',p.amount_minor::text,'reason',p.off_day_reason,'date',p.actual_date::text,'recordedAt',${stamp('p.recorded_at')}) AS values,
    ARRAY[p.source_id::text,p.effect_id::text,p.movement_id::text] AS source_ids,'1'::text AS revision,${actual('p.actual_date')} AS effective_at,p.recorded_at,'/brand-payouts/payouts/'||p.id AS detail
    FROM finance.brand_payout p WHERE ${scope('p', 'paying_branch_id')}`,
  'REP-12': `SELECT e.id::text AS id,e.branch_id,NULL::uuid AS brand_id,NULL::uuid AS driver_id,e.subject_id AS account_id,NULL::uuid AS category_id,
    NULL::text AS service,NULL::text AS status,COALESCE(m.source_kind,e.kind) AS kind,m.method,NULL::text AS condition,NULL::text AS governorate_id,NULL::text AS area_id,
    concat_ws(' ',e.reason,a.name,m.reason) AS search,CASE WHEN $3='recorded' THEN e.recorded_at ELSE ${actual('e.effective_date')} END AS date_at,e.amount_minor,
    jsonb_build_object('account',a.name,'branch',${branch('e.branch_id')},'kind',COALESCE(m.source_kind,e.kind),'method',m.method,'amountMinor',e.amount_minor::text,'reason',e.reason,'date',e.effective_date::text,'recordedAt',${stamp('e.recorded_at')}) AS values,
    ARRAY[e.source_id::text,e.id::text] AS source_ids,'1'::text AS revision,${actual('e.effective_date')} AS effective_at,e.recorded_at,NULL::text AS detail
    FROM kernel.journal_effect e JOIN finance.account a ON(a.company_id,a.id)=(e.company_id,e.subject_id)
    LEFT JOIN finance.money_movement m ON(m.company_id,m.effect_id)=(e.company_id,e.id)
    WHERE ${scope('e')} AND e.family='money' AND EXISTS(SELECT 1 FROM finance.account_usage au WHERE au.company_id=$1 AND au.account_id=a.id AND au.branch_id=ANY($2::uuid[]))`,
  'REP-07': `SELECT i.id::text AS id,r.branch_id,s.brand_id,r.driver_id,NULL::uuid AS account_id,NULL::uuid AS category_id,
    NULL::text AS service,NULL::text AS status,'return'::text AS kind,NULL::text AS method,
    CASE WHEN x.bad>0 THEN 'damaged' WHEN x.sound>0 THEN 'sound' ELSE 'unknown' END AS condition,NULL::text AS governorate_id,NULL::text AS area_id,s.reference AS search,
    CASE WHEN $3='offered' THEN r.requested_at ELSE x.received_at END AS date_at,NULL::bigint AS amount_minor,
    jsonb_build_object('reference',s.reference,'branch',${branch('r.branch_id')},'brand',${brand('s.brand_id')},'offered',i.requested::text,'received',COALESCE(x.received,0)::text,'sound',COALESCE(x.sound,0)::text,'damaged',COALESCE(x.bad,0)::text,'handed',COALESCE(x.handed,0)::text,'handoverAt',${stamp('x.handover_at')},'date',${stamp('x.received_at')},'recordedAt',${stamp('r.checked_at')}) AS values,
    ARRAY[i.id::text,r.id::text]||COALESCE(x.ids,ARRAY[]::text[]) AS source_ids,i.revision::text AS revision,x.received_at AS effective_at,r.checked_at AS recorded_at,'/returns/'||r.id AS detail
    FROM returns.item i JOIN returns.request r ON(r.company_id,r.source_id,r.id)=(i.company_id,i.source_id,i.request_id)
    JOIN shipments.shipment s ON(s.company_id,s.id)=(i.company_id,i.shipment_id)
    LEFT JOIN LATERAL(SELECT sum(l.quantity) AS received,sum(l.quantity) FILTER(WHERE l.condition='sound') AS sound,sum(l.quantity) FILTER(WHERE l.condition<>'sound') AS bad,
      max(COALESCE(rr.observed_at,rr.accepted_at)) AS received_at,array_agg(rr.id::text) AS ids,
      sum(COALESCE((SELECT sum(al.quantity) FROM returns.receipt_allocation al WHERE al.company_id=$1 AND al.receipt_line_id=l.id AND al.kind='brand-handover'),0)) AS handed,
      max((SELECT max(h.actual_at) FROM returns.receipt_allocation al JOIN returns.brand_handover h ON(h.company_id,h.id)=(al.company_id,al.owner_id) WHERE al.company_id=$1 AND al.receipt_line_id=l.id AND al.kind='brand-handover')) AS handover_at
      FROM returns.return_receipt_line l JOIN returns.return_receipt rr ON(rr.company_id,rr.id)=(l.company_id,l.receipt_id) WHERE l.company_id=$1 AND l.source_id=i.source_id AND l.item_id=i.id) x ON true WHERE ${scope('r')}`,
};

const workColumns = (
  kind: string,
  alias: string,
  date: string,
  driver: string,
  status: string,
  reference: string,
  visits: string,
  end: string,
  ids: string,
  revision: string,
  detail: string,
  brandId = 'NULL::uuid',
  shipments = "'1'",
  effective = date,
) => `
  ${alias}.id::text AS id,${alias}.branch_id,${brandId} AS brand_id,${driver} AS driver_id,NULL::uuid AS account_id,NULL::uuid AS category_id,
  NULL::text AS service,${status} AS status,'${kind}'::text AS kind,NULL::text AS method,NULL::text AS condition,NULL::text AS governorate_id,NULL::text AS area_id,${reference} AS search,${date} AS date_at,NULL::bigint AS amount_minor,
  jsonb_build_object('kind','${kind}','reference',${reference},'branch',${branch(alias + '.branch_id')},'brand',${brand(brandId)},'driver',(SELECT name FROM employees.operational_driver WHERE company_id=$1 AND id=${driver}),'status',${status},'visits','${visits}','shipments',${shipments}::text,'endAt',${end},'date',${stamp(date)},'recordedAt',${stamp(alias + '.recorded_at')}) AS values,
  ${ids} AS source_ids,${revision} AS revision,${effective} AS effective_at,${alias}.recorded_at,${detail} AS detail`;
sources['REP-05'] = `
  SELECT ${workColumns('visit', 'v', "CASE WHEN $3='round' THEN (rs.data->>'startedAt')::timestamptz ELSE v.work_at END", 'v.driver_id', "COALESCE(o.record->>'outcome','unknown')", 's.reference', '1', 'NULL', "ARRAY[v.id::text,v.source_record_id::text,v.source_id::text,v.task_id::text,v.round_id::text,COALESCE(o.outcome_id::text,''),v.shipment_id::text]", "COALESCE(o.revision::text,'0')", "'/tracking/'||v.shipment_id", 'v.brand_id', "'1'", 'v.work_at')}
  FROM (SELECT v.*,v.created_at AS recorded_at FROM execution.visit_fact v) v JOIN shipments.shipment s ON(s.company_id,s.id)=(v.company_id,v.shipment_id)
  LEFT JOIN execution.state rs ON(rs.company_id,rs.source_id,rs.identity)=(v.company_id,v.source_id,v.round_id) AND rs.kind='round'
  LEFT JOIN LATERAL(SELECT outcome_id,revision,record FROM execution.outcome_fact o WHERE o.company_id=$1 AND o.source_id=v.source_id AND o.task_id=v.task_id AND o.attempt_id=v.attempt_id ORDER BY revision DESC LIMIT 1) o ON true WHERE ${scope('v')}
  UNION ALL
  SELECT ${workColumns('round', 'r', "(r.data->>'startedAt')::timestamptz", 'r.driver_id', "CASE WHEN r.closed IS NULL THEN 'open' ELSE 'closed' END", 'r.id::text', '0', "r.closed->>'roundEndedAt'", 'ARRAY[r.id::text,r.source_id::text,r.event_id::text]', 'r.revision::text', 'NULL', 'NULL::uuid', 'r.shipment_count')}
  FROM (SELECT st.identity AS id,st.company_id,st.source_id,st.event_id,st.revision,st.data,c.data AS closed,
    b.native_id AS driver_id,cy.branch_id,cy.shipment_count,ib.received_at AS recorded_at
    FROM execution.state st JOIN integration.binding b ON b.company_id=st.company_id AND b.source_id=st.source_id AND b.resource_id=(st.data->>'driverId')::uuid AND b.entity='driver'
    CROSS JOIN LATERAL(SELECT dc.branch_id,count(DISTINCT dc.shipment_id) AS shipment_count FROM dispatch.cycle dc WHERE dc.company_id=$1 AND dc.source_id=st.source_id AND dc.task_id::text IN (SELECT jsonb_array_elements_text(st.data->'taskIds')) GROUP BY dc.branch_id) cy
    JOIN integration.inbox ib ON(ib.company_id,ib.source_id,ib.event_id)=(st.company_id,st.source_id,st.event_id)
    LEFT JOIN execution.state c ON(c.company_id,c.source_id,c.identity)=(st.company_id,st.source_id,st.identity) AND c.kind='round.ended'
    WHERE st.company_id=$1 AND st.kind='round') r WHERE ${scope('r')}
  UNION ALL
  SELECT ${workColumns('internal_transfer', 'm', 'm.planned_at', 'm.driver_id', 'm.state', 'm.reference', '0', 'NULL', 'ARRAY[m.id::text,m.created_command_id::text]', 'm.version::text', "'/goods-transfers/'||m.id", 'NULL::uuid', '(SELECT count(DISTINCT l.shipment_id) FROM goods_transfer.line l WHERE l.company_id=$1 AND l.manifest_id=m.id)')}
  FROM (SELECT g.*,g.source_branch_id AS branch_id,g.created_at AS recorded_at FROM goods_transfer.manifest g) m WHERE ${scope('m')}`;

sources['REP-18'] =
  `SELECT concat(p.branch_id,':',p.variant_id) AS id,p.branch_id,p.brand_id,NULL::uuid AS driver_id,NULL::uuid AS account_id,NULL::uuid AS category_id,
  NULL::text AS service,NULL::text AS status,'stock'::text AS kind,NULL::text AS method,
  CASE WHEN p.unavailable_on_hand>0 THEN 'damaged' ELSE 'sound' END AS condition,NULL::text AS governorate_id,NULL::text AS area_id,concat_ws(' ',pr.name,v.name,v.options) AS search,
  NULL::timestamptz AS date_at,NULL::bigint AS amount_minor,
  jsonb_build_object('kind','stock','reference',concat_ws(' / ',pr.name,v.name),'branch',${branch('p.branch_id')},'brand',${brand('p.brand_id')},'onHand',(p.sound_on_hand+p.unavailable_on_hand)::text,'reserved',r.n::text,'available',greatest(0,p.sound_on_hand-r.n)::text,'unavailable',p.unavailable_on_hand::text,'carrier',COALESCE(t.n,0)::text) AS values,
  ARRAY[p.variant_id::text]||ARRAY(SELECT id::text FROM inventory.stock_movement sm WHERE sm.company_id=$1 AND sm.branch_id=p.branch_id AND sm.variant_id=p.variant_id)||ARRAY(SELECT id::text FROM inventory.stock_reservation sr WHERE sr.company_id=$1 AND sr.branch_id=p.branch_id AND sr.variant_id=p.variant_id AND sr.active)||COALESCE(t.ids,ARRAY[]::text[]) AS source_ids,
  p.version::text AS revision,p.last_movement_at AS effective_at,p.updated_at AS recorded_at,'/inventory/variants/'||p.variant_id AS detail
  FROM inventory.stock_position p JOIN inventory.product_variant v ON(v.company_id,v.id)=(p.company_id,p.variant_id) JOIN inventory.product pr ON(pr.company_id,pr.id)=(v.company_id,v.product_id)
  CROSS JOIN LATERAL(SELECT COALESCE(sum(quantity),0) AS n FROM inventory.stock_reservation sr WHERE sr.company_id=$1 AND sr.branch_id=p.branch_id AND sr.variant_id=p.variant_id AND sr.active) r
  LEFT JOIN LATERAL(SELECT sum(n) AS n,array_agg(id::text) AS ids FROM (
    SELECT l.remaining::bigint AS n,l.id FROM goods_transfer.line l JOIN goods_transfer.manifest gm ON(gm.company_id,gm.id)=(l.company_id,l.manifest_id) WHERE l.company_id=$1 AND l.variant_id=p.variant_id AND gm.source_branch_id=p.branch_id AND gm.state='in_transit' AND l.kind='loose'
    UNION ALL
    SELECT gc.quantity::bigint*l.remaining,gc.line_id FROM goods_transfer.component gc JOIN goods_transfer.line l ON(l.company_id,l.id)=(gc.company_id,gc.line_id) JOIN goods_transfer.manifest gm ON(gm.company_id,gm.id)=(l.company_id,l.manifest_id) WHERE gc.company_id=$1 AND gc.variant_id=p.variant_id AND gm.source_branch_id=p.branch_id AND gm.state='in_transit'
    UNION ALL
    SELECT COALESCE(ri.unresolved,(ol.line->>'heldReturnRequired')::bigint,sl.quantity)::bigint,dc.id
      FROM dispatch.cycle dc JOIN shipments.parcel_custody pc ON(pc.company_id,pc.shipment_id)=(dc.company_id,dc.shipment_id)
      JOIN shipments.shipment ss ON(ss.company_id,ss.id)=(dc.company_id,dc.shipment_id)
      JOIN shipments.revision srv ON(srv.company_id,srv.shipment_id,srv.revision)=(ss.company_id,ss.id,ss.revision)
      CROSS JOIN LATERAL(SELECT (line->>'id')::uuid AS id,(line->>'quantity')::bigint AS quantity,(line->>'variantId')::uuid AS variant_id FROM jsonb_array_elements(srv.fields->'lines') line) sl
      LEFT JOIN returns.item ri ON ri.company_id=$1 AND ri.cycle_id=dc.id AND ri.source_line_id=sl.id::text
      LEFT JOIN LATERAL(SELECT o.record FROM execution.outcome_fact o WHERE o.company_id=$1 AND o.source_id=dc.source_id AND o.cycle_id=dc.id ORDER BY (record->'time'->>'recordedAt')::timestamptz DESC,revision DESC LIMIT 1) ofa ON true
      LEFT JOIN LATERAL(SELECT line FROM jsonb_array_elements(ofa.record->'lines') line WHERE line->>'sourceLineId'=sl.id::text) ol ON true
      WHERE dc.company_id=$1 AND dc.latest AND dc.branch_id=p.branch_id AND sl.variant_id=p.variant_id AND pc.holder='driver' AND pc.transfer_id IS NULL
  ) carrier) t ON true
  WHERE ${scope('p')}
  UNION ALL
  SELECT 'parcel:'||s.id,c.branch_id,s.brand_id,c.driver_id,NULL::uuid,NULL::uuid,NULL::text,s.state,'parcel',NULL::text,NULL::text,NULL::text,NULL::text,s.reference,NULL::timestamptz,NULL::bigint,
  jsonb_build_object('kind','parcel','reference',s.reference,'branch',${branch('c.branch_id')},'brand',${brand('s.brand_id')},'onHand',CASE WHEN c.holder='branch' AND NOT s.handed_over THEN '1' ELSE '0' END,'reserved','0','available','0','unavailable','0','carrier',CASE WHEN c.holder='driver' THEN '1' ELSE '0' END),
  ARRAY[s.id::text,c.receipt_id::text],c.version::text,s.received_at,s.received_at,'/shipments/'||s.id
  FROM shipments.parcel_custody c JOIN shipments.shipment s ON(s.company_id,s.id)=(c.company_id,c.shipment_id)
  JOIN shipments.revision rev ON(rev.company_id,rev.shipment_id,rev.revision)=(s.company_id,s.id,s.revision)
  WHERE ${scope('c')} AND rev.fields->>'service'<>'stored_stock' AND s.state='active' AND NOT EXISTS(SELECT 1 FROM dispatch.cycle dc JOIN execution.outcome_fact o ON(o.company_id,o.source_id,o.cycle_id)=(dc.company_id,dc.source_id,dc.id) WHERE dc.company_id=$1 AND dc.shipment_id=s.id AND dc.latest AND o.record->>'outcome'='full' AND NOT EXISTS(SELECT 1 FROM execution.outcome_fact newer WHERE (newer.company_id,newer.source_id,newer.cycle_id)=(o.company_id,o.source_id,o.cycle_id) AND ((newer.record->'time'->>'recordedAt')::timestamptz,newer.revision) > ((o.record->'time'->>'recordedAt')::timestamptz,o.revision)))`;

export interface RawRow {
  id: string;
  branch_id: string;
  brand_id: string | null;
  values: ReportRow['values'];
  source_ids: string[];
  revision: string;
  effective_at: Date | null;
  recorded_at: Date | null;
  date_at: Date | null;
  detail: string | null;
  amount_minor: string | null;
}
export function queryPlan(
  reportId: ReportId,
  company: string,
  branches: string[],
  filters: ReportFilters,
  sort: string,
) {
  const sql = sources[reportId];
  if (!sql) throw new Error('REPORT_QUERY_NOT_REGISTERED');
  const d = reportDefinition(reportId),
    basis = filters.dateBasis ?? d.dateBases[0]!;
  const args: unknown[] = [company, branches, basis];
  const predicates: string[] = ['$3::text IS NOT NULL'];
  const add = (value: unknown, predicate: (parameter: string) => string) => {
    args.push(value);
    predicates.push(predicate('$' + args.length));
  };
  const dimensions = {
    brandIds: 'brand_id',
    driverIds: 'driver_id',
    accountIds: 'account_id',
    categoryIds: 'category_id',
    services: 'service',
    statuses: 'status',
    methods: 'method',
    governorateIds: 'governorate_id',
    areaIds: 'area_id',
    conditions: 'condition',
    kinds: 'kind',
  } as const;
  for (const [key, column] of Object.entries(dimensions)) {
    const values = filters[key as keyof typeof dimensions];
    if (values?.length) add(values, (p) => `${column}::text=ANY(${p}::text[])`);
  }
  if (filters.from) add(cairoDayRange(filters.from).start, (p) => `date_at>=${p}::timestamptz`);
  if (filters.to) add(cairoDayRange(filters.to).end, (p) => `date_at<${p}::timestamptz`);
  if (filters.search)
    add(
      filters.search,
      (p) =>
        `strpos(translate(lower(search),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),${p})>0`,
    );
  if (filters.minMinor) add(filters.minMinor, (p) => `amount_minor>=${p}::bigint`);
  if (filters.maxMinor) add(filters.maxMinor, (p) => `amount_minor<=${p}::bigint`);
  return {
    sql: `WITH raw AS (${sql}) SELECT * FROM raw ${predicates.length ? 'WHERE ' + predicates.join(' AND ') : ''} ORDER BY date_at ${sort === 'dateDesc' ? 'DESC' : 'ASC'} NULLS LAST,id,branch_id LIMIT 20001`,
    args,
  };
}
export async function readReport(
  u: UnitOfWork,
  id: ReportId,
  branches: string[],
  f: ReportFilters,
  sort: string,
): Promise<{ rows: ReportRow[]; context: Record<string, unknown> }> {
  if (id === 'REP-09') {
    const totals = await walletTotals(u, f.brandIds?.length ? f.brandIds : undefined);
    const brands = (
      await u.client.query<{ id: string; name: string; weekdays: string; revision: string }>(
        `SELECT b.id,b.name,p.fields->>'payoutWeekdays' AS weekdays,b.version::text AS revision FROM commercial.brand b JOIN commercial.brand_policy p ON(p.company_id,p.brand_id,p.version)=(b.company_id,b.id,b.version) WHERE b.company_id=$1 AND ($2::uuid[] IS NULL OR b.id=ANY($2::uuid[])) AND ($3::text IS NULL OR strpos(translate(lower(b.name),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),$3)>0) ORDER BY lower(b.name),b.id LIMIT 20001`,
        [u.access.companyId, f.brandIds?.length ? f.brandIds : null, f.search ?? null],
      )
    ).rows;
    if (brands.length > 20000) throw new AccessError('REPORT_TOO_LARGE_NARROW_FILTERS', 409);
    const rows = brands
      .filter((b) => totals.has(b.id))
      .flatMap((b) => {
        const t = totals.get(b.id)!;
        const state =
          BigInt(t.eligibleToPayMinor) > 0n
            ? 'eligible'
            : BigInt(t.heldMinor) > 0n
              ? 'held'
              : BigInt(t.pendingMinor) > 0n
                ? 'pending'
                : 'empty';
        if (f.statuses?.length && !f.statuses.includes(state)) return [];
        return [
          {
            id: b.id,
            values: {
              brand: b.name,
              weekdays: b.weekdays,
              signedMinor: t.signedEntitlementMinor,
              pendingMinor: t.pendingMinor,
              heldMinor: t.heldMinor,
              coverMinor: t.coverMinor,
              eligibleMinor: t.eligibleToPayMinor,
              paidMinor: t.paidMinor,
            },
            sourceIds: [b.id],
            revision: b.revision,
            effectiveAt: null,
            recordedAt: null,
            detail: '/brand-payouts/brands/' + b.id,
          },
        ];
      });
    const provenance = (
      await u.client.query<{ brand_id: string; ids: string[] }>(
        `SELECT subject_id AS brand_id,array_agg(id::text)||array_agg(source_id::text) AS ids FROM kernel.journal_effect WHERE company_id=$1 AND family='brand' GROUP BY subject_id`,
        [u.access.companyId],
      )
    ).rows;
    for (const row of rows)
      row.sourceIds.push(...(provenance.find((p) => p.brand_id === row.id)?.ids ?? []));
    const branchWallets = (
      await u.client.query(
        `WITH lots AS (
      SELECT l.brand_id,e.branch_id,l.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=l.company_id AND a.lot_id=l.id),0) AS remaining,
      COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=l.company_id AND h.lot_id=l.id AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id)),0) AS held,
      l.readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release cr WHERE cr.company_id=l.company_id AND cr.lot_id=l.id) AS eligible
      FROM kernel.credit_lot l JOIN kernel.journal_effect e ON(e.company_id,e.id)=(l.company_id,l.id) WHERE l.company_id=$1 AND l.brand_id=ANY($2::uuid[])),
      parts AS (SELECT brand_id,branch_id,CASE WHEN eligible THEN remaining ELSE 0 END e,CASE WHEN eligible THEN 0 ELSE remaining END p,CASE WHEN eligible THEN held ELSE 0 END h,0 d,0 c FROM lots
      UNION ALL SELECT subject_id,branch_id,0,0,0,-amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=j.company_id AND a.effect_id=j.id),0),0 FROM kernel.journal_effect j WHERE company_id=$1 AND family='brand' AND subject_id=ANY($2::uuid[]) AND amount_minor<0 AND kind<>'payout'
      UNION ALL SELECT c.brand_id,i.branch_id,0,0,0,0,c.amount_minor FROM kernel.shipping_cover c LEFT JOIN dispatch.item di ON(di.company_id,di.cover_id)=(c.company_id,c.id) LEFT JOIN dispatch.intent i ON(i.company_id,i.id)=(di.company_id,di.intent_id) WHERE c.company_id=$1 AND c.brand_id=ANY($2::uuid[]) AND NOT EXISTS(SELECT 1 FROM kernel.cover_close x WHERE x.company_id=c.company_id AND x.cover_id=c.id))
      SELECT brand_id AS "brandId",branch_id AS "branchId",COALESCE(b.name,'غير محدد') AS "branchName",sum(e)::text AS "eligibleMinor",sum(p)::text AS "pendingMinor",sum(h)::text AS "heldMinor",sum(d)::text AS "debitsMinor",sum(c)::text AS "coverMinor" FROM parts LEFT JOIN access.branch b ON(b.company_id,b.id)=($1,branch_id) GROUP BY brand_id,branch_id,b.name ORDER BY brand_id,branch_id`,
        [u.access.companyId, rows.map((r) => r.id)],
      )
    ).rows;
    return {
      rows,
      context: { walletScope: 'shared-company-brand', period: 'current', branchWallets },
    };
  }
  const p = queryPlan(id, u.access.companyId, branches, f, sort);
  const raw = (await u.client.query<RawRow>(p.sql, p.args)).rows;
  const rows: ReportRow[] = raw.map((r) => ({
    id: r.id + ':' + r.branch_id,
    values: {
      ...r.values,
      ...(reportDefinition(id).dateBases[0] !== 'current'
        ? { date: r.date_at?.toISOString() ?? null }
        : {}),
    },
    sourceIds: r.source_ids.filter(Boolean),
    revision: r.revision,
    effectiveAt: r.effective_at?.toISOString() ?? null,
    recordedAt: r.recorded_at?.toISOString() ?? null,
    detail: r.detail,
  }));
  const context: Record<string, unknown> = {};
  if (id === 'REP-08') {
    // Opening excludes current filters other than brand and branch; period movement totals
    // remain filtered and explain the closing of that filtered statement explicitly.
    const opening = (
      await u.client.query<{ subject_id: string; amount: string }>(
        `SELECT subject_id,COALESCE(sum(amount_minor),0)::text AS amount FROM kernel.journal_effect WHERE company_id=$1 AND family='brand' AND branch_id=ANY($2::uuid[]) AND ($3::uuid[] IS NULL OR subject_id=ANY($3::uuid[])) AND $4::date IS NOT NULL AND CASE WHEN $5='recorded' THEN recorded_at<($4::date::timestamp AT TIME ZONE 'Africa/Cairo') ELSE effective_date<$4::date END GROUP BY subject_id`,
        [
          u.access.companyId,
          branches,
          f.brandIds?.length ? f.brandIds : null,
          f.from ?? null,
          f.dateBasis ?? 'effective',
        ],
      )
    ).rows;
    const balance = new Map(opening.map((x) => [x.subject_id, BigInt(x.amount)]));
    // Running balance always follows business ascending order, regardless of display order.
    const ordered = raw
      .map((r, i) => ({ r, i }))
      .sort(
        (a, b) =>
          (a.r.date_at?.getTime() ?? Infinity) - (b.r.date_at?.getTime() ?? Infinity) ||
          a.r.id.localeCompare(b.r.id),
      );
    for (const { r, i } of ordered) {
      const n = (balance.get(r.brand_id!) ?? 0n) + BigInt(r.amount_minor!);
      balance.set(r.brand_id!, n);
      rows[i]!.values['balanceMinor'] = n.toString();
    }
    context['openingByBrand'] = Object.fromEntries(opening.map((x) => [x.subject_id, x.amount]));
    context['closingByBrand'] = Object.fromEntries([...balance].map(([k, v]) => [k, v.toString()]));
    context['filteredStatement'] = !!(f.kinds?.length || f.search || f.minMinor || f.maxMinor);
  }
  if (id === 'REP-12') {
    const opening = (
      await u.client.query<{ id: string; amount: string }>(
        `SELECT subject_id AS id,sum(amount_minor)::text AS amount FROM kernel.journal_effect e WHERE company_id=$1 AND family='money' AND branch_id=ANY($2::uuid[]) AND ($3::uuid[] IS NULL OR subject_id=ANY($3::uuid[])) AND $4::timestamptz IS NOT NULL AND CASE WHEN $5='recorded' THEN recorded_at ELSE ${actual('effective_date')} END<$4::timestamptz AND EXISTS(SELECT 1 FROM finance.account_usage au WHERE au.company_id=$1 AND au.account_id=e.subject_id AND au.branch_id=ANY($2::uuid[])) GROUP BY subject_id`,
        [
          u.access.companyId,
          branches,
          f.accountIds?.length ? f.accountIds : null,
          f.from ? cairoDayRange(f.from).start : null,
          f.dateBasis ?? 'actual',
        ],
      )
    ).rows;
    const closing = new Map(opening.map((x) => [x.id, BigInt(x.amount)]));
    for (const r of raw) {
      const id = (r as RawRow & { account_id: string }).account_id;
      closing.set(id, (closing.get(id) ?? 0n) + BigInt(r.amount_minor!));
    }
    context['openingByAccount'] = Object.fromEntries(opening.map((x) => [x.id, x.amount]));
    context['closingByAccount'] = Object.fromEntries(
      [...closing].map(([k, v]) => [k, v.toString()]),
    );
    context['filteredStatement'] = !!(
      f.kinds?.length ||
      f.methods?.length ||
      f.search ||
      f.minMinor ||
      f.maxMinor
    );
    context['accounts'] = (
      await u.client.query(
        `SELECT a.id,a.name,b.amount_minor::text AS "bookMinor",COALESCE((SELECT sum(active_minor) FROM settlements.account_hold_balance h WHERE h.company_id=$1 AND h.account_id=a.id),0)::text AS "heldMinor",greatest(0,b.amount_minor-COALESCE((SELECT sum(active_minor) FROM settlements.account_hold_balance h WHERE h.company_id=$1 AND h.account_id=a.id),0))::text AS "availableMinor" FROM finance.account a JOIN finance.account_balance b ON(b.company_id,b.account_id)=(a.company_id,a.id) WHERE a.company_id=$1 AND EXISTS(SELECT 1 FROM finance.account_usage au WHERE au.company_id=$1 AND au.account_id=a.id AND au.branch_id=ANY($2::uuid[])) AND ($3::uuid[] IS NULL OR a.id=ANY($3::uuid[])) ORDER BY a.id`,
        [u.access.companyId, branches, f.accountIds?.length ? f.accountIds : null],
      )
    ).rows;
    context['transit'] = (
      await u.client.query(
        `SELECT id,source_account_name AS "sourceAccount",destination_account_name AS "destinationAccount",amount_minor::text AS "amountMinor",${stamp('actual_sent_at')} AS "sentAt" FROM finance.treasury_transfer WHERE company_id=$1 AND state='sent' AND source_branch_id=ANY($2::uuid[]) AND ($3::uuid[] IS NULL OR source_account_id=ANY($3::uuid[]) OR destination_account_id=ANY($3::uuid[])) ORDER BY id`,
        [u.access.companyId, branches, f.accountIds?.length ? f.accountIds : null],
      )
    ).rows;
    context['discrepancies'] = (
      await u.client.query(
        `SELECT o.case_id AS "caseId",a.name AS account,o.book_minor::text AS "bookAtObservationMinor",o.observed_minor::text AS "observedMinor",o.difference_minor::text AS "differenceMinor",COALESCE(h.active_minor,0)::text AS "heldMinor",o.observed_date::text AS "actualDate"
         FROM settlements.account_observation o JOIN settlements.adjustment_case c ON(c.company_id,c.id)=(o.company_id,o.case_id)
         JOIN finance.account a ON(a.company_id,a.id)=(o.company_id,o.account_id)
         LEFT JOIN settlements.account_hold_balance h ON(h.company_id,h.case_id)=(o.company_id,o.case_id)
         WHERE o.company_id=$1 AND c.state='open' AND o.branch_id=ANY($2::uuid[]) AND ($3::uuid[] IS NULL OR o.account_id=ANY($3::uuid[]))
         AND EXISTS(SELECT 1 FROM finance.account_usage au WHERE au.company_id=$1 AND au.account_id=o.account_id AND au.branch_id=ANY($2::uuid[])) ORDER BY o.case_id`,
        [u.access.companyId, branches, f.accountIds?.length ? f.accountIds : null],
      )
    ).rows;
  }
  if (rows.length > 20000) throw new AccessError('REPORT_TOO_LARGE_NARROW_FILTERS', 409);
  return { rows, context };
}
