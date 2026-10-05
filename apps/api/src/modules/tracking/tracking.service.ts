import { AccessError, cairoDayRange } from '@shahn/domain';
import type {
  TrackingFilter,
  TrackingList,
  TrackingRow,
  TrackingDetail,
} from '@shahn/contracts/execution';
import { UnitOfWork } from '../kernel/unit-of-work.js';
const digits = (v: string) =>
  v
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776));
const base = `SELECT s.id,s.reference,s.brand_id AS "brandId",b.name AS "brandName",pc.branch_id AS "branchId",br.name AS "branchName",
 r.fields->>'recipientName' AS "recipientName",r.fields->>'phoneDisplay' AS phone,r.fields->>'service' AS service,
 COALESCE(eo.record->>'outcome',st.data->'record'->>'outcome',st.data->>'type',s.preparation) AS state,
 CASE WHEN pc.transfer_id IS NOT NULL THEN 'transfer' WHEN COALESCE(eo.record->>'outcome',st.data->'record'->>'outcome')='full' THEN 'recipient' ELSE COALESCE(pc.holder,'unknown') END AS custodian,
 COALESCE(ed.name,d.name) AS "driverName",s.received_at AS "createdAt",te.at AS "lastEventAt",
 EXISTS(SELECT 1 FROM integration.inbox ib WHERE ib.company_id=s.company_id AND ib.source_id=cy.source_id AND (ib.aggregate_id=cy.task_id OR ib.aggregate_id IN(SELECT identity FROM execution.state rs WHERE rs.company_id=s.company_id AND rs.source_id=cy.source_id AND rs.kind='round' AND rs.data->'taskIds' ? cy.task_id::text) OR ib.aggregate_id IN(SELECT (rs.data->>'workdayId')::uuid FROM execution.state rs WHERE rs.company_id=s.company_id AND rs.source_id=cy.source_id AND rs.kind='round' AND rs.data->'taskIds' ? cy.task_id::text)) AND ib.application_state='pending') AS pending,
 r.fields,cy.source_id,cy.task_id,s.branch_id AS native_branch
 FROM shipments.shipment s JOIN shipments.revision r ON(r.company_id,r.shipment_id,r.revision)=(s.company_id,s.id,s.revision)
 JOIN commercial.brand b ON(b.company_id,b.id)=(s.company_id,s.brand_id)
 LEFT JOIN shipments.parcel_custody pc ON(pc.company_id,pc.shipment_id)=(s.company_id,s.id)
 LEFT JOIN access.branch br ON(br.company_id,br.id)=(s.company_id,pc.branch_id)
 LEFT JOIN employees.operational_driver d ON(d.company_id,d.id)=(s.company_id,pc.driver_id)
 LEFT JOIN dispatch.cycle cy ON(cy.company_id,cy.shipment_id)=(s.company_id,s.id) AND cy.latest
 LEFT JOIN execution.state st ON(st.company_id,st.source_id,st.kind,st.identity)=(s.company_id,cy.source_id,'task',cy.task_id) AND (st.data->'record'->>'dispatchCycleId' IS NULL OR st.data->'record'->>'dispatchCycleId'=cy.remote_cycle_id::text)
 LEFT JOIN LATERAL(SELECT record FROM execution.outcome_fact ofa WHERE ofa.company_id=s.company_id AND ofa.source_id=cy.source_id AND ofa.task_id=cy.task_id AND ofa.cycle_id=cy.id AND (st.data->'record'->>'attemptId' IS NULL OR ofa.attempt_id=(st.data->'record'->>'attemptId')::uuid) ORDER BY (record->'time'->>'recordedAt')::timestamptz DESC,revision DESC LIMIT 1)eo ON true
 LEFT JOIN integration.binding eb ON(eb.company_id,eb.source_id,eb.entity,eb.resource_id)=(s.company_id,cy.source_id,'driver',COALESCE(eo.record->>'driverId',st.data->'record'->>'driverId')::uuid)
 LEFT JOIN employees.operational_driver ed ON(ed.company_id,ed.id)=(eb.company_id,eb.native_id)
 LEFT JOIN LATERAL(SELECT max(confirmed_at) AS at FROM execution.timeline t WHERE t.company_id=s.company_id AND t.source_id=cy.source_id AND t.task_id=cy.task_id)te ON true`;
type Row = Omit<TrackingRow, 'createdAt' | 'lastEventAt'> & {
  createdAt: Date;
  lastEventAt: Date | null;
  fields: Record<string, string>;
  source_id: string | null;
  task_id: string | null;
  native_branch: string;
};
function operational(r: Row): TrackingRow {
  return {
    id: r.id,
    reference: r.reference,
    brandId: r.brandId,
    brandName: r.brandName,
    branchId: r.branchId ?? r.native_branch,
    branchName: r.branchName ?? 'غير معروف',
    recipientName: r.recipientName,
    phone: r.phone,
    service: r.service,
    state: r.state,
    custodian: r.custodian,
    driverName: r.custodian === 'driver' || r.custodian === 'transfer' ? r.driverName : null,
    createdAt: r.createdAt.toISOString(),
    lastEventAt: r.lastEventAt?.toISOString() ?? null,
    pending: r.pending,
  };
}
export async function trackingList(u: UnitOfWork, f: TrackingFilter): Promise<TrackingList> {
  if (f.from && f.to && f.from > f.to) throw new AccessError('INVALID_DATE_RANGE', 400);
  const query = digits(f.query.trim()),
    from = f.from ? cairoDayRange(f.from).start : null,
    to = f.to ? cairoDayRange(f.to).end : null;
  const filtered = `WITH rows AS (${base} WHERE s.company_id=$1) SELECT * FROM rows WHERE
    ($2='' OR reference=$2 OR fields->>'brandReference' ILIKE '%'||$2||'%' OR fields->>'recipientName' ILIKE '%'||$2||'%' OR translate(phone,'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789') LIKE '%'||$2||'%')
    AND(cardinality($3::uuid[])=0 OR "brandId"=ANY($3::uuid[])) AND(cardinality($4::uuid[])=0 OR "branchId"=ANY($4::uuid[]))
    AND(cardinality($5::text[])=0 OR custodian=ANY($5)) AND(cardinality($6::text[])=0 OR state=ANY($6))
    AND(cardinality($7::text[])=0 OR service=ANY($7)) AND(cardinality($8::text[])=0 OR fields->>'governorateId'=ANY($8)) AND(cardinality($9::text[])=0 OR fields->>'areaId'=ANY($9))
    AND($10::timestamptz IS NULL OR (CASE WHEN $12='created' THEN "createdAt" ELSE "lastEventAt" END)>=$10)
    AND($11::timestamptz IS NULL OR (CASE WHEN $12='created' THEN "createdAt" ELSE "lastEventAt" END)<$11)`;
  const args = [
    u.access.companyId,
    query,
    f.brands,
    f.branches,
    f.custodians,
    f.states,
    f.services,
    f.governorates,
    f.areas,
    from,
    to,
    f.dateBasis,
  ];
  const rows = (
    await u.client.query<Row>(filtered + ' ORDER BY "createdAt" DESC,id LIMIT 25 OFFSET $13', [
      ...args,
      (f.page - 1) * 25,
    ])
  ).rows;
  const total = Number(
    (await u.client.query('SELECT count(*) AS total FROM (' + filtered + ') x', args)).rows[0]
      .total,
  );
  const brands = (
    await u.client.query<{ id: string; name: string }>(
      'SELECT id,name FROM commercial.brand WHERE company_id=$1 ORDER BY name,id',
      [u.access.companyId],
    )
  ).rows;
  const geo = (
    await u.client.query<{ id: string; name: string; kind: string }>(
      `SELECT id,name,kind FROM commercial.reference WHERE company_id=$1 AND kind IN ('governorate','area') ORDER BY name,id`,
      [u.access.companyId],
    )
  ).rows;
  return {
    items: rows.map(operational),
    total,
    page: f.page,
    brands,
    branches: u.access.companyBranches,
    governorates: geo.filter((x) => x.kind === 'governorate').map(({ id, name }) => ({ id, name })),
    areas: geo.filter((x) => x.kind === 'area').map(({ id, name }) => ({ id, name })),
  };
}
export async function trackingDetail(u: UnitOfWork, id: string): Promise<TrackingDetail> {
  const company = u.access.companyId,
    r = (await u.client.query<Row>(base + ' WHERE s.company_id=$1 AND s.id=$2', [company, id]))
      .rows[0];
  if (!r) throw new AccessError('NOT_FOUND', 404);
  const native = (
    await u.client.query<{ version: number; kind: string; recorded_at: Date }>(
      `SELECT version,kind,recorded_at FROM shipments.event WHERE company_id=$1 AND shipment_id=$2 ORDER BY version`,
      [company, id],
    )
  ).rows;
  const remote = (
    await u.client.query<{
      event_id: string;
      event_type: string;
      action_id: string | null;
      recorded_at: Date | null;
      observed_at: Date | null;
      received_at: Date;
      observation: unknown;
    }>(
      `SELECT * FROM execution.timeline WHERE company_id=$1 AND source_id=$2 AND (task_id=$3 OR task_id IS NULL AND round_id IN(SELECT identity FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round' AND data->'taskIds' ? $3::text)) ORDER BY confirmed_at,event_id`,
      [company, r.source_id, r.task_id],
    )
  ).rows;
  const attempts = (
    await u.client.query<{ attemptId: string; outcome: string | null; visitKnown: boolean }>(
      `WITH ids AS(SELECT attempt_id FROM execution.visit_fact WHERE company_id=$1 AND source_id=$2 AND task_id=$3 UNION SELECT attempt_id FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND task_id=$3) SELECT ids.attempt_id AS "attemptId",o.record->>'outcome' AS outcome,EXISTS(SELECT 1 FROM execution.visit_fact v WHERE v.company_id=$1 AND v.source_id=$2 AND v.task_id=$3 AND v.attempt_id=ids.attempt_id) AS "visitKnown" FROM ids LEFT JOIN LATERAL(SELECT record FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND task_id=$3 AND attempt_id=ids.attempt_id ORDER BY revision DESC LIMIT 1)o ON true ORDER BY ids.attempt_id`,
      [company, r.source_id, r.task_id],
    )
  ).rows;
  const acceptances = (
    await u.client.query<{
      action_id: string;
      operation_id: string;
      recorded_at: Date;
      canonical_at: string | null;
    }>(
      `SELECT a.action_id,a.operation_id,a.recorded_at,sc.remote_result->'receipt'->>'committedAt' AS canonical_at FROM dispatch.acceptance a JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(a.company_id,a.cycle_id) JOIN integration.source_command sc ON(sc.company_id,sc.action_id)=(a.company_id,a.action_id) WHERE a.company_id=$1 AND cy.shipment_id=$2 ORDER BY a.recorded_at`,
      [company, id],
    )
  ).rows;
  const pending = (
    await u.client.query<{ pending_reason: string }>(
      `SELECT DISTINCT pending_reason FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND (aggregate_id=$3 OR aggregate_id IN(SELECT identity FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round' AND data->'taskIds' ? $3::text) OR aggregate_id IN(SELECT (data->>'workdayId')::uuid FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round' AND data->'taskIds' ? $3::text)) AND application_state='pending'`,
      [company, r.source_id, r.task_id],
    )
  ).rows;
  const gaps = (
    await u.client.query(
      `SELECT 1 FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 AND (aggregate_id=$3 OR aggregate_id IN(SELECT identity FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round' AND data->'taskIds' ? $3::text) OR aggregate_id IN(SELECT (data->>'workdayId')::uuid FROM execution.state WHERE company_id=$1 AND source_id=$2 AND kind='round' AND data->'taskIds' ? $3::text)) AND received_through<received_high`,
      [company, r.source_id, r.task_id],
    )
  ).rowCount;
  const recovered = (
    await u.client.query(
      `SELECT o.outcome_id,o.revision::text,o.record,o.correction_id,e.received_at FROM execution.outcome_fact o JOIN execution.source_evidence e ON(e.company_id,e.id)=(o.company_id,o.evidence_id) WHERE o.company_id=$1 AND o.source_id=$2 AND o.task_id=$3 AND o.event_id IS NULL`,
      [company, r.source_id, r.task_id],
    )
  ).rows;
  const returns = (
    await u.client.query<{
      requestId: string;
      branch_id: string;
      requested: number;
      received: number;
      unresolved: number;
      lost: number;
      damaged: number;
    }>(
      `SELECT r.id AS "requestId",r.branch_id,sum(i.requested)::int requested,sum(i.received)::int received,sum(i.unresolved)::int unresolved,sum(i.lost)::int lost,sum(i.damaged)::int damaged FROM returns.item i JOIN returns.request r ON(r.company_id,r.source_id,r.id)=(i.company_id,i.source_id,i.request_id) WHERE i.company_id=$1 AND i.shipment_id=$2 GROUP BY r.id,r.branch_id ORDER BY r.id`,
      [company, id],
    )
  ).rows;
  const returnFacts = (
    await u.client.query(
      `SELECT t.id,t.kind,t.fact,t.recorded_at FROM returns.transition t JOIN returns.item i ON(i.company_id,i.source_id,i.id)=(t.company_id,t.source_id,t.item_id) WHERE i.company_id=$1 AND i.shipment_id=$2`,
      [company, id],
    )
  ).rows;
  const transferFacts = (
    await u.client.query<{
      id: string;
      kind: string;
      actual_at: Date;
      recorded_at: Date;
    }>(
      `SELECT a.id,'goods.handover' AS kind,a.actual_at,a.recorded_at FROM goods_transfer.action_fact a
     JOIN goods_transfer.line l ON(l.company_id,l.manifest_id)=(a.company_id,a.manifest_id)
     WHERE a.company_id=$1 AND l.shipment_id=$2 AND a.kind='handover'
     UNION ALL
     SELECT r.id,CASE WHEN r.kind='destination' THEN 'goods.receive' ELSE 'goods.sourceReturn' END,
       r.actual_at,r.recorded_at FROM goods_transfer.receipt r
     JOIN goods_transfer.line l ON(l.company_id,l.manifest_id)=(r.company_id,r.manifest_id)
     JOIN goods_transfer.receipt_line rl ON(rl.company_id,rl.receipt_id,rl.line_id)=(r.company_id,r.id,l.id)
     WHERE r.company_id=$1 AND l.shipment_id=$2`,
      [company, id],
    )
  ).rows;
  // Local same-clock readable observation; remote clock subtraction is deliberately absent.
  await u.client.query(
    `UPDATE execution.timeline SET first_read_at=clock_timestamp() WHERE company_id=$1 AND source_id=$2 AND task_id=$3 AND first_read_at IS NULL`,
    [company, r.source_id, r.task_id],
  );
  return {
    shipment: operational(r),
    returns: returns.map(({ branch_id, ...x }) => ({
      ...x,
      path:
        u.access.grants.includes('returns') &&
        u.access.assignedBranches.some((b) => b.id === branch_id)
          ? '/returns/' + x.requestId
          : null,
    })),
    address: r.fields.address!,
    nextAction: r.pending
      ? 'بانتظار اكتمال دليل التنفيذ'
      : r.custodian === 'recipient'
        ? 'تم التسليم حسب التقرير؛ توريد الأموال مسار منفصل'
        : r.custodian === 'driver'
          ? 'بانتظار تحديث المندوب أو الاستلام الفعلي للمرتجع'
          : r.custodian === 'transfer'
            ? 'مع ناقل الرحلة الداخلية؛ بانتظار الاستلام الفعلي في الفرع'
            : 'راجع تجهيز الشحنة وتسليمها',
    detailPath:
      u.access.grants.includes('intake') &&
      u.access.assignedBranches.some((b) => b.id === r.native_branch)
        ? '/shipments/' + r.reference
        : null,
    timeline: [
      ...transferFacts.map((t) => ({
        id: 'transfer:' + t.id,
        origin: 'ERP' as const,
        kind: t.kind,
        recordedAt: t.actual_at.toISOString(),
        observedAt: t.actual_at.toISOString(),
        receivedAt: t.recorded_at.toISOString(),
        observationUnknown: false,
      })),
      ...returnFacts
        .filter((t) => !remote.some((e) => e.action_id === t.fact.time.actionId))
        .map((t) => ({
          id: 'return:' + t.id,
          origin: 'Tawsel' as const,
          kind: t.kind === 'received' ? 'return.subsetReceived' : 'return.dispositionRecorded',
          recordedAt: t.fact.time.recordedAt,
          observedAt: t.fact.time.observation.observedAt,
          receivedAt: t.recorded_at.toISOString(),
          observationUnknown: t.fact.time.observation.observedAt === null,
        })),
      ...recovered.map((e) => ({
        id: 'history:' + e.outcome_id + ':' + e.revision,
        origin: 'Tawsel' as const,
        kind: e.correction_id ? 'outcome.corrected' : 'outcome.recorded',
        recordedAt: e.record.time.recordedAt,
        observedAt: e.record.time.observation.observedAt,
        receivedAt: e.received_at.toISOString(),
        observationUnknown: e.record.time.observation.observedAt === null,
      })),
      ...native
        .filter((e) => !e.kind.startsWith('transfer_'))
        .map((e) => ({
          id: 'native:' + e.version,
          origin: 'ERP' as const,
          kind: e.kind,
          recordedAt: e.recorded_at.toISOString(),
          observedAt: null,
          receivedAt: null,
          observationUnknown: true,
        })),
      ...remote.map((e) => ({
        id: e.event_id,
        origin: 'Tawsel' as const,
        kind: e.event_type,
        recordedAt: e.recorded_at?.toISOString() ?? null,
        observedAt: e.observed_at?.toISOString() ?? null,
        receivedAt: e.received_at.toISOString(),
        observationUnknown: e.observed_at === null,
      })),
      ...acceptances
        .filter((a) => !remote.some((e) => e.action_id === a.action_id))
        .map((a) => ({
          id: 'acceptance:' + a.action_id,
          origin: 'Tawsel' as const,
          kind:
            (
              {
                'intake.submitSnapshot': 'task.snapshotAccepted',
                'intake.prepare': 'assignment.prepared',
                'assignment.receiveBatch': 'assignment.received',
              } as Record<string, string>
            )[a.operation_id] ?? a.operation_id,
          recordedAt: a.canonical_at,
          observedAt: null,
          receivedAt: a.recorded_at.toISOString(),
          observationUnknown: true,
        })),
    ].sort((a, b) =>
      (a.recordedAt ?? a.receivedAt ?? '').localeCompare(b.recordedAt ?? b.receivedAt ?? ''),
    ),
    attempts: attempts.map((a) => ({ ...a, reason: 'legacy reason unavailable' })),
    pendingReasons: [
      ...pending.map((p) => p.pending_reason),
      ...(gaps ? ['KNOWN_STREAM_GAP'] : []),
    ],
    evidenceReceivedOnly: true,
    cashReceiptKnown: false,
  };
}
