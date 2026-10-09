import {
  profitCategories,
  type EconomicEffect,
  type ProfitActualMoney,
  type ReportFilters,
} from '@shahn/contracts';
import type { UnitOfWork } from '../kernel/unit-of-work.js';

export interface SourceIssue {
  code: string;
  targetKind: string;
  targetId: string;
  branchId: string | null;
  sourceIds: string[];
  observedVersion: string;
  deltaMinor: string | null;
  effectiveDate: string | null;
  recordedAt: string | null;
  message: string;
  sourceCapability: string;
  sourcePath: string | null;
}
export interface PayrollExclusions {
  advanceIssuedMinor: string;
  advanceRecoveredMinor: string;
  incidentRecoveredMinor: string;
  actualSalaryPayoutMinor: string;
}

/** Native source rows, never cash-direction inference. Each branch/date comes from its historical
 * domain record. Corrections inherit a classified original's business period and category. No
 * payments, allocations, payout components or payroll recovery joins can multiply an earning. */
const profitNativeSql = `WITH RECURSIVE native AS (
 SELECT e.company_id,e.source_id,e.id AS effect_id,
  CASE WHEN e.kind='shipping' THEN 'shipping_gross' ELSE 'shipping_waiver' END AS category,
  e.amount_minor,(v.work_at AT TIME ZONE 'Africa/Cairo')::date AS effective_date,e.recorded_at,v.branch_id,
  e.batch_id,ARRAY[]::uuid[] AS correction_ids,'1'::text AS revision,'tracking'::text AS capability,
  '/tracking/'||v.shipment_id AS path,v.shipment_id,NULL::uuid AS period_id,NULL::uuid AS employee_id,
  (v.price->'incidentAgreement'->>'incidentId')::uuid AS incident_id,1::bigint AS multiplier
 FROM execution.visit_fact v JOIN kernel.journal_effect e
  ON e.company_id=v.company_id AND e.source_id=v.source_record_id AND e.subject_id=v.id
  AND e.family='operating' AND e.kind IN ('shipping','waiver') WHERE v.company_id=$1
 UNION ALL
 SELECT p.company_id,p.source_id,e.id,'storage_revenue',e.amount_minor,p.start_date,e.recorded_at,p.branch_id,
  e.batch_id,ARRAY[]::uuid[],'1','storage','/storage/'||p.agreement_id,NULL,p.id,NULL,NULL,1
 FROM storage.period p JOIN kernel.journal_effect e ON(e.company_id,e.id)=(p.company_id,p.revenue_effect_id)
  AND e.family='operating' AND e.kind='storage' WHERE p.company_id=$1
 UNION ALL
 SELECT p.company_id,p.source_id,e.id,'paid_expense',e.amount_minor,p.actual_date,e.recorded_at,p.branch_id,
  e.batch_id,ARRAY[]::uuid[],'1','expenses','/expenses/'||p.expense_id,NULL,NULL,NULL,NULL,1
 FROM finance.paid_cost p JOIN kernel.journal_effect e ON(e.company_id,e.id)=(p.company_id,p.effect_id)
  AND e.family='operating' AND e.kind='cost' WHERE p.company_id=$1
 UNION ALL
 SELECT c.company_id,c.source_id,e.id,
  CASE WHEN e.kind='cost' THEN 'brand_compensation' ELSE 'employee_compensation_share' END,
  e.amount_minor,(c.confirmed_at AT TIME ZONE 'Africa/Cairo')::date,e.recorded_at,c.responsible_branch_id,
  e.batch_id,ARRAY[]::uuid[],'1','incidents','/incidents/'||c.incident_id,NULL,NULL,c.employee_id,c.incident_id,1
 FROM incidents.confirmation c JOIN kernel.journal_effect e ON e.company_id=c.company_id AND e.source_id=c.source_id
  AND e.subject_id=c.incident_id AND e.family='operating' AND e.kind IN ('cost','employee_compensation_share') WHERE c.company_id=$1
 UNION ALL
 SELECT a.company_id,a.source_id,e.id,
  CASE WHEN a.kind='earning_deduction' THEN 'employee_entitlement_deduction'
   WHEN a.kind='earning_correction' THEN 'employee_commission' ELSE 'employee_addition' END,
  CASE WHEN a.kind='earning_deduction' THEN a.amount_minor ELSE -a.amount_minor END,a.work_date,a.recorded_at,a.branch_id,
  e.batch_id,CASE WHEN a.visit_id IS NULL THEN ARRAY[]::uuid[] ELSE ARRAY[a.visit_id] END,'1','employees',
  '/employees/'||a.employee_id||'/months/'||to_char(a.month,'YYYY-MM'),v.shipment_id,NULL,a.employee_id,NULL,
  CASE WHEN a.kind='earning_deduction' THEN 1 ELSE -1 END
 FROM employees.payroll_adjustment a JOIN kernel.journal_effect e ON e.company_id=a.company_id AND e.source_id=a.source_id
  AND e.family='employee' AND e.subject_id=a.employee_id AND e.kind IN ('earning','obligation')
 LEFT JOIN execution.visit_fact v ON(v.company_id,v.id)=(a.company_id,a.visit_id)
 WHERE a.company_id=$1 AND a.kind<>'opening_entitlement'
 UNION ALL
 SELECT v.company_id,v.source_record_id,e.id,'employee_commission',-b.amount_minor,
  (v.work_at AT TIME ZONE 'Africa/Cairo')::date,b.created_at,v.branch_id,e.batch_id,ARRAY[]::uuid[],'1','employees',
  '/employees/'||(b.resolution->>'employeeId')||'/months/'||to_char(v.work_at AT TIME ZONE 'Africa/Cairo','YYYY-MM'),
  v.shipment_id,NULL,(b.resolution->>'employeeId')::uuid,NULL,-1
 FROM execution.earning_basis b JOIN execution.visit_fact v ON(v.company_id,v.id)=(b.company_id,b.visit_id)
 JOIN kernel.journal_effect e ON(e.company_id,e.id)=(b.company_id,b.journal_effect_id)
 WHERE b.company_id=$1 AND b.resolution->>'status'='resolved'
), mapped AS (
 SELECT * FROM native
 UNION ALL
 SELECT e.company_id,e.source_id,e.id,m.category,e.amount_minor*m.multiplier,m.effective_date,e.recorded_at,
  m.branch_id,e.batch_id,m.correction_ids||m.effect_id,s.revision,m.capability,m.path,m.shipment_id,m.period_id,m.employee_id,m.incident_id,m.multiplier
 FROM mapped m JOIN kernel.journal_effect e ON(e.company_id,e.supersedes_id)=(m.company_id,m.effect_id)
 JOIN kernel.source_record s ON(s.company_id,s.id)=(e.company_id,e.source_id)
 WHERE e.kind='correction' AND e.family IN ('operating','employee') AND NOT e.id=ANY(m.correction_ids)
 AND EXISTS(SELECT 1 FROM kernel.journal_effect original
   WHERE (original.company_id,original.id)=(m.company_id,m.effect_id)
   AND original.family=e.family AND original.subject_id=e.subject_id)
), salaries AS (
 SELECT p.company_id,(a->>'sourceId')::uuid AS source_id,(a->>'id')::uuid AS effect_id,
  'employee_salary'::text AS category,-(a->>'amountMinor')::bigint AS amount_minor,p.month AS effective_date,
  p.frozen_at AS recorded_at,(a->>'branchId')::uuid AS branch_id,NULL::uuid AS batch_id,
  ARRAY[]::uuid[] AS correction_ids,p.source_digest AS revision,'employees'::text AS capability,
  '/employees/'||p.employee_id||'/months/'||to_char(p.month,'YYYY-MM') AS path,
  NULL::uuid AS shipment_id,NULL::uuid AS period_id,p.employee_id,NULL::uuid AS incident_id,-1::bigint AS multiplier
 FROM employees.payroll_period p CROSS JOIN LATERAL jsonb_array_elements(p.calculation->'earnings') a
 WHERE p.company_id=$1 AND a->>'kind'='salary'
), all_effects AS (SELECT * FROM mapped UNION ALL SELECT * FROM salaries)`;
export const profitEffectsSql = `${profitNativeSql}
 SELECT company_id AS "companyId",source_id AS "sourceId",effect_id AS "effectId",category,
  amount_minor::text AS "amountMinor",effective_date::text AS "effectiveDate",
  to_char(recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "recordedAt",
  branch_id AS "historicalBranchId",batch_id AS "postingBatchId",correction_ids AS "correctionOf",revision,
  capability AS "sourceCapability",path AS "sourcePath",shipment_id AS "shipmentId",period_id AS "periodId",
  employee_id AS "employeeId",incident_id AS "incidentId"
 FROM all_effects WHERE (branch_id=ANY($2::uuid[]) OR (branch_id IS NULL AND $6::boolean))
 AND (recorded_at IS NULL OR effective_date IS NULL OR $3::date IS NULL OR CASE WHEN $5='recorded' THEN (recorded_at AT TIME ZONE 'Africa/Cairo')::date ELSE effective_date END >=$3)
 AND (recorded_at IS NULL OR effective_date IS NULL OR $4::date IS NULL OR CASE WHEN $5='recorded' THEN (recorded_at AT TIME ZONE 'Africa/Cairo')::date ELSE effective_date END <=$4)
 ORDER BY effective_date,recorded_at,category,effect_id`;

const datePredicate = (actual: string, recorded: string) =>
  `($3::date IS NULL OR CASE WHEN $5='recorded' THEN (${recorded} AT TIME ZONE 'Africa/Cairo')::date ELSE ${actual} END >=$3)
   AND ($4::date IS NULL OR CASE WHEN $5='recorded' THEN (${recorded} AT TIME ZONE 'Africa/Cairo')::date ELSE ${actual} END <=$4)`;

function issue(
  input: Partial<SourceIssue> & Pick<SourceIssue, 'code' | 'targetKind' | 'targetId' | 'message'>,
): SourceIssue {
  return {
    branchId: null,
    sourceIds: [],
    observedVersion: '1',
    deltaMinor: null,
    effectiveDate: null,
    recordedAt: null,
    sourceCapability: 'settlements',
    sourcePath: '/settlements',
    ...input,
  };
}

/** A corrupt source does not wipe other valid sources. Reject every occurrence of a duplicated
 * identity, rather than picking an arbitrary version or allowing summary/detail disagreement. */
export function partitionEconomicEffects(raw: EconomicEffect[]) {
  const issues: SourceIssue[] = [],
    counts = new Map<string, EconomicEffect[]>();
  for (const e of raw) {
    const key = e.companyId + ':' + e.effectId;
    counts.set(key, [...(counts.get(key) ?? []), e]);
  }
  const effects: EconomicEffect[] = [];
  for (const records of counts.values()) {
    const e = records[0]!;
    if (records.length > 1) {
      issues.push(
        issue({
          code: 'DUPLICATE_ECONOMIC_EFFECT',
          targetKind: 'effect',
          targetId: e.effectId,
          branchId: e.historicalBranchId,
          sourceIds: [...new Set(records.map((r) => r.sourceId))],
          observedVersion: String(records.length),
          deltaMinor: records.reduce((n, r) => n + BigInt(r.amountMinor), 0n).toString(),
          effectiveDate: e.effectiveDate,
          recordedAt: e.recordedAt,
          sourceCapability: e.sourceCapability,
          sourcePath: e.sourcePath,
          message: 'نفس هوية الأثر الاقتصادي ظهرت أكثر من مرة؛ استبعدت كل نسخه حتى مراجعة المصدر.',
        }),
      );
      continue;
    }
    if (
      !profitCategories.includes(e.category) ||
      !e.companyId ||
      !e.sourceId ||
      !e.effectId ||
      !e.effectiveDate ||
      !e.recordedAt
    ) {
      issues.push(
        issue({
          code: 'ECONOMIC_SOURCE_MAPPING_REQUIRED',
          targetKind: 'effect',
          targetId: e.effectId,
          branchId: e.historicalBranchId,
          sourceIds: [e.sourceId],
          deltaMinor: e.amountMinor,
          effectiveDate: e.effectiveDate || null,
          recordedAt: e.recordedAt || null,
          sourceCapability: e.sourceCapability,
          sourcePath: e.sourcePath,
          message: 'المصدر بلا تصنيف أو تاريخ اقتصادي مكتمل؛ خارج الربح حتى المراجعة.',
        }),
      );
      continue;
    }
    effects.push(e);
    if (e.historicalBranchId === null)
      issues.push(
        issue({
          code: 'UNATTRIBUTED_ECONOMIC_SOURCE',
          targetKind: 'effect',
          targetId: e.effectId,
          sourceIds: [e.sourceId],
          deltaMinor: e.amountMinor,
          effectiveDate: e.effectiveDate,
          recordedAt: e.recordedAt,
          sourceCapability: e.sourceCapability,
          sourcePath: e.sourcePath,
          message:
            'المبلغ مثبت لكن فرعه التاريخي غير معروف؛ يظهر في جزء غير منسوب ولا يوزع على الفروع.',
        }),
      );
  }
  return { effects, issues };
}

export async function loadProfitSources(
  u: UnitOfWork,
  branches: readonly string[],
  f: ReportFilters,
) {
  const args = [
    u.access.companyId,
    branches,
    f.from ?? null,
    f.to ?? null,
    f.dateBasis ?? 'effective',
  ];
  const completeCompany = u.access.companyBranches.every((b) => branches.includes(b.id));
  const raw = (await u.client.query<EconomicEffect>(profitEffectsSql, [...args, completeCompany]))
    .rows;
  // Optional related IDs are omitted; source identifiers themselves remain explicit and unique.
  const partition = partitionEconomicEffects(
    raw.map(
      (r) =>
        Object.fromEntries(
          Object.entries(r).filter(
            ([k, v]) =>
              v !== null || !['shipmentId', 'periodId', 'employeeId', 'incidentId'].includes(k),
          ),
        ) as unknown as EconomicEffect,
    ),
  );
  let effects = partition.effects;
  const issues = partition.issues;
  // A recorded-date window can contain only a late correction. Validate its native ancestors
  // too: an original recorded outside that window must not lend a category to a corrupt total.
  const missing = (
    await u.client.query<{
      kind: string;
      id: string;
      source_id: string;
      effect_id: string | null;
      branch_id: string;
      date: string;
      recorded: string;
      expected: string;
      observed: string | null;
      capability: string;
      path: string;
    }>(
      `${profitNativeSql}, required AS (
    SELECT 'visit_shipping'::text AS kind,v.id,v.source_record_id AS source_id,e.id AS effect_id,v.branch_id,
      (v.work_at AT TIME ZONE 'Africa/Cairo')::date AS effective_date,v.created_at AS recorded_at,
      (v.price->>'tariffMinor')::bigint AS expected,e.amount_minor AS observed,'tracking'::text AS capability,
      '/tracking/'||v.shipment_id AS path,
      e.branch_id IS DISTINCT FROM v.branch_id OR e.effective_date IS DISTINCT FROM (v.work_at AT TIME ZONE 'Africa/Cairo')::date AS invalid
    FROM execution.visit_fact v LEFT JOIN kernel.journal_effect e ON e.company_id=v.company_id
      AND e.source_id=v.source_record_id AND e.family='operating' AND e.kind='shipping' AND e.subject_id=v.id
    WHERE v.company_id=$1 AND (v.price->>'tariffMinor')::bigint>0
    UNION ALL
    SELECT 'visit_waiver',v.id,v.source_record_id,e.id,v.branch_id,(v.work_at AT TIME ZONE 'Africa/Cairo')::date,v.created_at,
      -(v.price->>'waiverMinor')::bigint,e.amount_minor,'tracking','/tracking/'||v.shipment_id,
      e.branch_id IS DISTINCT FROM v.branch_id OR e.effective_date IS DISTINCT FROM (v.work_at AT TIME ZONE 'Africa/Cairo')::date
    FROM execution.visit_fact v LEFT JOIN kernel.journal_effect e ON e.company_id=v.company_id
      AND e.source_id=v.source_record_id AND e.family='operating' AND e.kind='waiver' AND e.subject_id=v.id
    WHERE v.company_id=$1 AND COALESCE((v.price->>'waiverMinor')::bigint,0)>0
    UNION ALL
    SELECT 'storage_period',p.id,p.source_id,e.id,p.branch_id,p.start_date,p.recorded_at,p.fee_minor,e.amount_minor,'storage','/storage/'||p.agreement_id,
      e.source_id IS DISTINCT FROM p.source_id OR e.family IS DISTINCT FROM 'operating' OR e.kind IS DISTINCT FROM 'storage'
      OR e.branch_id IS DISTINCT FROM p.branch_id OR e.effective_date IS DISTINCT FROM p.start_date
    FROM storage.period p LEFT JOIN kernel.journal_effect e ON(e.company_id,e.id)=(p.company_id,p.revenue_effect_id)
    WHERE p.company_id=$1 AND p.fee_minor>0
    UNION ALL
    SELECT 'paid_expense',p.id,p.source_id,e.id,p.branch_id,p.actual_date,p.recorded_at,-p.amount_minor,e.amount_minor,'expenses','/expenses/'||p.id,
      e.source_id IS DISTINCT FROM p.source_id OR e.family IS DISTINCT FROM 'operating' OR e.kind IS DISTINCT FROM 'cost'
      OR e.branch_id IS DISTINCT FROM p.branch_id OR e.effective_date IS DISTINCT FROM p.actual_date
    FROM finance.paid_expense p LEFT JOIN finance.paid_cost c ON(c.company_id,c.expense_id)=(p.company_id,p.id)
    LEFT JOIN kernel.journal_effect e ON(e.company_id,e.id)=(c.company_id,c.effect_id) WHERE p.company_id=$1
    UNION ALL
    SELECT 'incident_compensation',c.incident_id,c.source_id,e.id,c.responsible_branch_id,(c.confirmed_at AT TIME ZONE 'Africa/Cairo')::date,c.confirmed_at,
      -c.compensation_minor,e.amount_minor,'incidents','/incidents/'||c.incident_id,e.branch_id IS DISTINCT FROM c.responsible_branch_id
    FROM incidents.confirmation c LEFT JOIN kernel.journal_effect e ON e.company_id=c.company_id AND e.source_id=c.source_id
      AND e.family='operating' AND e.kind='cost' AND e.subject_id=c.incident_id WHERE c.company_id=$1
    UNION ALL
    SELECT 'incident_employee_share',c.incident_id,c.source_id,e.id,c.responsible_branch_id,(c.confirmed_at AT TIME ZONE 'Africa/Cairo')::date,c.confirmed_at,
      c.employee_share_minor,e.amount_minor,'incidents','/incidents/'||c.incident_id,e.branch_id IS DISTINCT FROM c.responsible_branch_id
    FROM incidents.confirmation c LEFT JOIN kernel.journal_effect e ON e.company_id=c.company_id AND e.source_id=c.source_id
      AND e.family='operating' AND e.kind='employee_compensation_share' AND e.subject_id=c.incident_id
    WHERE c.company_id=$1 AND c.employee_share_minor>0
    UNION ALL
    SELECT 'visit_commission',v.id,v.source_record_id,e.id,v.branch_id,(v.work_at AT TIME ZONE 'Africa/Cairo')::date,b.created_at,
      -b.amount_minor,-e.amount_minor,'employees','/employees/'||(b.resolution->>'employeeId'),
      e.source_id IS DISTINCT FROM v.source_record_id OR e.family IS DISTINCT FROM 'employee' OR e.kind IS DISTINCT FROM 'earning'
      OR e.branch_id IS DISTINCT FROM v.branch_id OR e.effective_date IS DISTINCT FROM (v.work_at AT TIME ZONE 'Africa/Cairo')::date
    FROM execution.earning_basis b JOIN execution.visit_fact v ON(v.company_id,v.id)=(b.company_id,b.visit_id)
    LEFT JOIN kernel.journal_effect e ON(e.company_id,e.id)=(b.company_id,b.journal_effect_id)
    WHERE b.company_id=$1 AND b.resolution->>'status'='resolved' AND b.amount_minor>0
    UNION ALL
    SELECT 'payroll_adjustment',a.id,a.source_id,e.id,a.branch_id,a.work_date,a.recorded_at,
      CASE WHEN a.kind='earning_deduction' THEN a.amount_minor ELSE -a.amount_minor END,
      CASE WHEN a.kind='earning_deduction' THEN e.amount_minor ELSE -e.amount_minor END,'employees','/employees/'||a.employee_id,
      e.branch_id IS DISTINCT FROM a.branch_id OR e.effective_date IS DISTINCT FROM a.work_date
    FROM employees.payroll_adjustment a LEFT JOIN kernel.journal_effect e ON e.company_id=a.company_id AND e.source_id=a.source_id
      AND e.family='employee' AND e.subject_id=a.employee_id AND e.kind=CASE WHEN a.kind='earning_deduction' THEN 'obligation' ELSE 'earning' END
    WHERE a.company_id=$1 AND a.kind<>'opening_entitlement'
    ) SELECT kind,id,source_id,effect_id,branch_id,effective_date::text AS date,
      to_char(recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS recorded,
      expected::text,observed::text,capability,path FROM required
    WHERE branch_id=ANY($2::uuid[]) AND (effect_id IS NULL OR expected IS DISTINCT FROM observed OR invalid)
      AND (${datePredicate('effective_date', 'recorded_at')} OR EXISTS(
        SELECT 1 FROM all_effects chosen WHERE required.effect_id=ANY(chosen.correction_ids)
        AND (chosen.branch_id=ANY($2::uuid[]) OR (chosen.branch_id IS NULL AND $6::boolean))
        AND ${datePredicate('chosen.effective_date', 'chosen.recorded_at')}))
    ORDER BY effective_date,kind,id`,
      [...args, completeCompany],
    )
  ).rows;
  const invalidEffectIds = new Set(missing.flatMap((m) => (m.effect_id ? [m.effect_id] : [])));
  // Descendant corrections cannot repair an unknown original by silently supplying a total.
  effects = effects.filter(
    (e) =>
      !invalidEffectIds.has(e.effectId) && !e.correctionOf.some((id) => invalidEffectIds.has(id)),
  );
  for (const m of missing)
    issues.push(
      issue({
        code: m.effect_id ? 'ECONOMIC_SOURCE_MISMATCH' : 'MISSING_ECONOMIC_EFFECT',
        targetKind: m.kind,
        targetId: m.id,
        branchId: m.branch_id,
        sourceIds: [m.source_id, ...(m.effect_id ? [m.effect_id] : [])],
        observedVersion: 'source:' + m.expected + ':effect:' + (m.observed ?? 'missing'),
        deltaMinor: (BigInt(m.observed ?? '0') - BigInt(m.expected)).toString(),
        effectiveDate: m.date,
        recordedAt: m.recorded,
        sourceCapability: m.capability,
        sourcePath: m.path,
        message:
          'المصدر الاقتصادي وأثره لا يتطابقان؛ الجزء المتأثر خارج الحساب حتى مراجعة السجل الأصلي.',
      }),
    );
  const unknown = (
    await u.client.query<{
      id: string;
      source_id: string;
      branch_id: string;
      amount: string;
      date: string;
      recorded: string;
      revision: string;
    }>(
      `${profitNativeSql} SELECT e.id,e.source_id,e.branch_id,e.amount_minor::text AS amount,e.effective_date::text AS date,
      to_char(e.recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS recorded,s.revision
    FROM kernel.journal_effect e JOIN kernel.source_record s ON(s.company_id,s.id)=(e.company_id,e.source_id)
    WHERE e.company_id=$1 AND e.branch_id=ANY($2::uuid[]) AND e.family='operating'
    AND NOT EXISTS(SELECT 1 FROM mapped m WHERE(m.company_id,m.effect_id)=(e.company_id,e.id))
    AND ${datePredicate('e.effective_date', 'e.recorded_at')}
    ORDER BY e.effective_date,e.id`,
      args,
    )
  ).rows;
  for (const e of unknown)
    issues.push(
      issue({
        code: 'UNCLASSIFIED_OPERATING_EFFECT',
        targetKind: 'effect',
        targetId: e.id,
        branchId: e.branch_id,
        sourceIds: [e.source_id],
        observedVersion: e.revision,
        deltaMinor: e.amount,
        effectiveDate: e.date,
        recordedAt: e.recorded,
        message: 'أثر تشغيل بلا مصدر اقتصادي مصنف؛ خارج الربح لحين تسوية مبررة.',
      }),
    );
  const unresolved = (
    await u.client.query<{
      id: string;
      source_id: string;
      branch_id: string;
      date: string;
      recorded: string;
      reason: string;
    }>(
      `
    SELECT v.id,v.source_record_id AS source_id,v.branch_id,(v.work_at AT TIME ZONE 'Africa/Cairo')::date::text AS date,
      to_char(COALESCE(b.created_at,v.created_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS recorded,COALESCE(b.resolution->>'reason','earning_basis_missing') AS reason
    FROM execution.visit_fact v LEFT JOIN execution.earning_basis b ON(b.company_id,b.visit_id)=(v.company_id,v.id)
    WHERE v.company_id=$1 AND v.branch_id=ANY($2::uuid[]) AND (b.visit_id IS NULL OR b.resolution->>'status'<>'resolved')
    AND NOT EXISTS(SELECT 1 FROM employees.payroll_adjustment a WHERE a.company_id=$1 AND a.visit_id=v.id AND a.kind='earning_correction')
    AND ${datePredicate("(v.work_at AT TIME ZONE 'Africa/Cairo')::date", 'COALESCE(b.created_at,v.created_at)')} ORDER BY v.work_at,v.id`,
      args,
    )
  ).rows;
  for (const e of unresolved)
    issues.push(
      issue({
        code: 'COMMISSION_SOURCE_UNRESOLVED',
        targetKind: 'visit',
        targetId: e.id,
        branchId: e.branch_id,
        sourceIds: [e.source_id],
        effectiveDate: e.date,
        recordedAt: e.recorded,
        sourceCapability: 'employees',
        sourcePath: '/employees',
        message: 'استحقاق عمولة الزيارة غير محسوم؛ لم يعامل كصفر (' + e.reason + ').',
      }),
    );
  const unclassified = (
    await u.client.query<{
      id: string;
      source_id: string;
      branch_id: string;
      amount: string;
      date: string;
      recorded: string;
      classification: string;
    }>(
      `
    SELECT r.id,r.source_id,c.branch_id,r.amount_minor::text AS amount,r.actual_date::text AS date,
      to_char(r.recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS recorded,r.classification
    FROM settlements.resolution r JOIN settlements.adjustment_case c ON(c.company_id,c.id)=(r.company_id,r.case_id)
    WHERE r.company_id=$1 AND c.branch_id=ANY($2::uuid[])
    AND r.classification IN ('company_loss_unclassified','brand_commercial_unclassified')
    AND ${datePredicate('r.actual_date', 'r.recorded_at')} ORDER BY r.actual_date,r.id`,
      args,
    )
  ).rows;
  for (const e of unclassified)
    issues.push(
      issue({
        code: 'UNRESOLVED_CLASSIFICATION',
        targetKind: 'resolution',
        targetId: e.id,
        branchId: e.branch_id,
        sourceIds: e.source_id ? [e.source_id] : [],
        deltaMinor: e.amount,
        effectiveDate: e.date,
        recordedAt: e.recorded,
        message:
          'تسوية ' + e.classification + ' غير مصنفة اقتصادياً؛ لا تعد إيراداً أو تكلفة تلقائياً.',
      }),
    );
  const missingPayroll = (
    await u.client.query<{
      id: string;
      branch_id: string;
      month: string;
      version: string;
      recorded: string;
    }>(
      `
    SELECT e.id,b.branch_id,to_char(m.month,'YYYY-MM-DD') AS month,COALESCE(p.version,0)::text AS version,
     to_char(e.recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS recorded
    FROM employees.employee e CROSS JOIN LATERAL generate_series(
      date_trunc('month',COALESCE($3::date,e.employment_start)),
      date_trunc('month',COALESCE($4::date,(transaction_timestamp() AT TIME ZONE 'Africa/Cairo')::date)),interval '1 month') m(month)
    JOIN employees.compensation_policy cp ON cp.company_id=e.company_id AND cp.employee_id=e.id AND cp.axis='salary'
      AND NOT cp.superseded AND cp.enabled AND cp.monthly_minor>0 AND cp.effective_from<=m.month
      AND (cp.effective_to IS NULL OR cp.effective_to>m.month)
    LEFT JOIN employees.employee_branch_history b ON b.company_id=e.company_id AND b.employee_id=e.id AND NOT b.superseded
      AND b.effective_from<=greatest(m.month::date,e.employment_start) AND (b.effective_to IS NULL OR b.effective_to>greatest(m.month::date,e.employment_start))
    LEFT JOIN employees.payroll_period p ON(p.company_id,p.employee_id,p.month)=(e.company_id,e.id,m.month::date)
    WHERE e.company_id=$1 AND (b.branch_id=ANY($2::uuid[]) OR (b.branch_id IS NULL AND $6::boolean))
      AND e.employment_start < m.month+interval '1 month' AND (e.employment_end IS NULL OR e.employment_end>=m.month)
      AND p.calculation IS NULL AND $5::text IS NOT NULL
      AND ($3::date IS NULL OR $5='recorded' OR m.month::date >=$3) ORDER BY m.month,e.id`,
      [...args, completeCompany],
    )
  ).rows;
  for (const p of missingPayroll)
    issues.push(
      issue({
        code: 'PAYROLL_NOT_MATERIALIZED',
        targetKind: 'employee',
        targetId: p.id,
        branchId: p.branch_id,
        observedVersion: p.version,
        effectiveDate: p.month,
        recordedAt: p.recorded,
        sourceCapability: 'employees',
        sourcePath: '/employees/' + p.id + '/months/' + p.month.slice(0, 7),
        message:
          'الراتب الشهري لم يحفظ في حساب رواتب مثبت؛ الربح المعروف جزئي حتى معالجة الفترة في الموارد البشرية.',
      }),
    );
  const actualMoney = await loadActualMoney(u, branches);
  const payrollExclusions = (
    await u.client.query<PayrollExclusions>(
      `SELECT
    COALESCE((SELECT sum(a.amount_minor) FROM employees.advance a WHERE a.company_id=$1 AND a.branch_id=ANY($2::uuid[]) AND ${datePredicate('a.actual_date', 'a.recorded_at')}),0)::text AS "advanceIssuedMinor",
    COALESCE((SELECT sum(r.amount_minor) FROM employees.payroll_recovery r JOIN employees.payroll_obligation o ON(o.company_id,o.id)=(r.company_id,r.obligation_id) WHERE r.company_id=$1 AND o.branch_id=ANY($2::uuid[]) AND o.kind='advance' AND r.state='settled' AND ${datePredicate('r.month', 'r.recorded_at')}),0)::text AS "advanceRecoveredMinor",
    COALESCE((SELECT sum(r.amount_minor) FROM employees.payroll_recovery r JOIN employees.payroll_obligation o ON(o.company_id,o.id)=(r.company_id,r.obligation_id) WHERE r.company_id=$1 AND o.branch_id=ANY($2::uuid[]) AND o.kind='incident' AND r.state='settled' AND ${datePredicate('r.month', 'r.recorded_at')}),0)::text AS "incidentRecoveredMinor",
    COALESCE((SELECT sum(p.amount_minor) FROM employees.salary_payment p JOIN employees.payroll_period c ON(c.company_id,c.employee_id,c.month)=(p.company_id,p.employee_id,p.month) WHERE p.company_id=$1 AND (c.calculation->>'branchId')::uuid=ANY($2::uuid[]) AND ${datePredicate('p.actual_date', 'p.recorded_at')}),0)::text AS "actualSalaryPayoutMinor"`,
      args,
    )
  ).rows[0]!;
  return { effects, issues, actualMoney, payrollExclusions };
}

/** Current funds/obligations are a separate frozen view, not terms of operating profit. Shared
 * accounts require all their configured usage branches in scope; withheld values stay unknown. */
async function loadActualMoney(
  u: UnitOfWork,
  branches: readonly string[],
): Promise<ProfitActualMoney> {
  const args = [u.access.companyId, branches],
    notes: string[] = [];
  const money: ProfitActualMoney = {
    asOf: (
      await u.client.query<{ at: Date }>('SELECT transaction_timestamp() AS at')
    ).rows[0]!.at.toISOString(),
    dateBasis: 'current',
    accounts: [],
    fundsInTransitMinor: null,
    heldDiscrepanciesMinor: null,
    unremittedRecipientMinor: null,
    brandLiabilitiesMinor: null,
    brandPendingMinor: null,
    brandHeldMinor: null,
    storageDueMinor: null,
    storageCreditMinor: null,
    notes,
  };
  if (u.access.grants.includes('finance.accounts')) {
    money.accounts = (
      await u.client.query<ProfitActualMoney['accounts'][number]>(
        `SELECT a.id,a.name,a.type,
      b.amount_minor::text AS "bookMinor",COALESCE((SELECT sum(e.amount_minor) FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='money' AND e.subject_id=a.id),0)::text AS "journalMinor",
      COALESCE((SELECT sum(h.active_minor) FROM settlements.account_hold_balance h WHERE h.company_id=$1 AND h.account_id=a.id),0)::text AS "heldMinor",
      greatest(0,b.amount_minor-COALESCE((SELECT sum(h.active_minor) FROM settlements.account_hold_balance h WHERE h.company_id=$1 AND h.account_id=a.id),0))::text AS "availableMinor",
      a.version::text||':'||(SELECT count(*) FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='money' AND e.subject_id=a.id)::text AS "projectionVersion"
      FROM finance.account a JOIN finance.account_balance b ON(b.company_id,b.account_id)=(a.company_id,a.id)
      WHERE a.company_id=$1 AND EXISTS(SELECT 1 FROM finance.account_usage au WHERE au.company_id=$1 AND au.account_id=a.id AND au.branch_id=ANY($2::uuid[]))
      AND NOT EXISTS(SELECT 1 FROM finance.account_usage au WHERE au.company_id=$1 AND au.account_id=a.id AND NOT au.branch_id=ANY($2::uuid[])) ORDER BY a.id`,
        args,
      )
    ).rows;
    const totals = (
      await u.client.query<{ transit: string; held: string }>(
        `SELECT
      COALESCE((SELECT sum(amount_minor) FROM finance.treasury_transfer WHERE company_id=$1 AND source_branch_id=ANY($2::uuid[]) AND state='sent'),0)::text AS transit,
      COALESCE((SELECT sum(active_minor) FROM settlements.account_hold_balance h WHERE h.company_id=$1 AND h.account_id=ANY($3::uuid[])),0)::text AS held`,
        [...args, money.accounts.map((a) => a.id)],
      )
    ).rows[0]!;
    money.fundsInTransitMinor = totals.transit;
    money.heldDiscrepanciesMinor = totals.held;
    notes.push(
      'الأرصدة الحالية للحسابات التي تقع جميع فروع استخدامها داخل النطاق؛ الحساب المشترك الأوسع لا يعرض جزئياً.',
    );
  } else notes.push('أرصدة النقدية والبنوك محجوبة لعدم وجود صلاحية الحسابات.');
  if (u.access.grants.includes('remittances')) {
    const unremitted = (
      await u.client.query<{ n: string; unknown: string }>(
        `WITH latest AS(
      SELECT DISTINCT ON(o.source_id,o.task_id,o.attempt_id) o.* FROM execution.outcome_fact o
      JOIN dispatch.cycle c ON(c.company_id,c.id)=(o.company_id,o.cycle_id)
      WHERE o.company_id=$1 AND c.branch_id=ANY($2::uuid[]) ORDER BY o.source_id,o.task_id,o.attempt_id,o.revision DESC)
      SELECT COALESCE(sum(m.reported_minor),0)::text AS n,count(*) FILTER(WHERE m.reported_minor IS NULL)::text AS unknown FROM latest o JOIN execution.reported_money_fact m
      ON(m.company_id,m.source_id,m.outcome_id,m.revision)=(o.company_id,o.source_id,o.outcome_id,o.revision)
      WHERE NOT EXISTS(SELECT 1 FROM finance.remittance_source r WHERE r.company_id=$1 AND r.source_id=o.source_id AND r.task_id=o.task_id AND r.attempt_id=o.attempt_id)`,
        args,
      )
    ).rows[0]!;
    money.unremittedRecipientMinor = unremitted.unknown === '0' ? unremitted.n : null;
    if (unremitted.unknown !== '0')
      notes.push(
        'توجد مبالغ مستلم غير محسومة؛ إجمالي غير المورد مجهول حتى اكتمال المصدر، وليس صفراً.',
      );
  } else notes.push('الأموال غير الموردة محجوبة لعدم وجود صلاحية التوريدات.');
  if (u.access.grants.includes('brand.payout')) {
    const totals = (
      await u.client.query<{ liability: string; pending: string; held: string }>(
        `WITH lots AS(
      SELECT l.brand_id,l.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=$1 AND a.lot_id=l.id),0) AS remaining,
       l.readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release r WHERE r.company_id=$1 AND r.lot_id=l.id) AS eligible,
       COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=$1 AND h.lot_id=l.id AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=$1 AND r.hold_id=h.id)),0) AS held
      FROM kernel.credit_lot l JOIN kernel.journal_effect e ON(e.company_id,e.id)=(l.company_id,l.id)
      WHERE l.company_id=$1 AND e.branch_id=ANY($2::uuid[])), debits AS(
      SELECT e.subject_id AS brand_id,-e.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=$1 AND a.effect_id=e.id),0) AS remaining
      FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.amount_minor<0 AND e.kind<>'payout' AND e.branch_id=ANY($2::uuid[])), signed AS(
      SELECT brand_id,sum(n) AS n FROM(SELECT brand_id,remaining AS n FROM lots UNION ALL SELECT brand_id,-remaining FROM debits) x GROUP BY brand_id)
      SELECT COALESCE((SELECT sum(greatest(0,n)) FROM signed),0)::text AS liability,
       COALESCE((SELECT sum(remaining) FROM lots WHERE NOT eligible),0)::text AS pending,
       COALESCE((SELECT sum(held) FROM lots WHERE eligible),0)::text AS held`,
        args,
      )
    ).rows[0]!;
    money.brandLiabilitiesMinor = totals.liability;
    money.brandPendingMinor = totals.pending;
    money.brandHeldMinor = totals.held;
    notes.push(
      'التزامات البراند من الدفعات المتبقية وديون مصادر الفروع المحددة؛ صرف أي فرع يستهلك المصدر الأصلي مرة واحدة.',
    );
  } else notes.push('التزامات محفظة البراند محجوبة لعدم وجود صلاحية صرف البراند.');
  if (u.access.grants.includes('storage')) {
    const totals = (
      await u.client.query<{ due: string; credit: string }>(
        `SELECT
      COALESCE((SELECT sum(p.fee_minor-COALESCE((SELECT sum(a.amount_minor) FROM storage.allocation a WHERE a.company_id=$1 AND a.period_id=p.id),0)) FROM storage.period p WHERE p.company_id=$1 AND p.branch_id=ANY($2::uuid[])),0)::text AS due,
      COALESCE((SELECT sum(r.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM storage.allocation a WHERE a.company_id=$1 AND a.receipt_id=r.id),0)-COALESCE((SELECT sum(s.amount_minor) FROM storage.refund_source s WHERE s.company_id=$1 AND s.receipt_id=r.id),0))
       FROM storage.receipt r JOIN storage.agreement g ON(g.company_id,g.id)=(r.company_id,r.agreement_id)
       JOIN LATERAL(SELECT branch_id FROM storage.agreement_revision ar WHERE ar.company_id=$1 AND ar.agreement_id=g.id ORDER BY revision DESC LIMIT 1) ar ON true
       WHERE r.company_id=$1 AND ar.branch_id=ANY($2::uuid[])),0)::text AS credit`,
        args,
      )
    ).rows[0]!;
    money.storageDueMinor = totals.due;
    money.storageCreditMinor = totals.credit;
    notes.push(
      'مستحق التخزين حسب فرع الفترة، والائتمان غير المخصص حسب فرع الاتفاق؛ استلام المال في فرع آخر لا يغير الإيراد.',
    );
  } else notes.push('مستحق وائتمان التخزين محجوبان لعدم وجود صلاحية التخزين.');
  return money;
}
