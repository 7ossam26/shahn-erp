import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  AccessError,
  cairoDate,
  cairoDayRange,
  minor,
  validateIncidentShares,
  type JournalEffect,
} from '@shahn/domain';
import {
  employeeClock,
  lockEmployeeCompany,
  incidentCandidate,
  incidentSourceKey,
  StockPositionRepository,
  positionKey,
  safeStockNumber,
} from '@shahn/database';
import {
  validateIncidentCommand,
  type IncidentCandidate,
  type IncidentCommand,
  type IncidentConfirmation,
  type IncidentDetail,
  type IncidentFilter,
  type IncidentPreview,
  type IncidentResult,
  type IncidentCatalog,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { JournalPosting } from '../kernel/journals.js';
import { BrandWalletService } from '../finance/brand-wallet/wallet.service.js';
import { guardEditablePayrollPeriod, resolveEmployeeTermsAt } from '../employees/service.js';
import { changeStockCondition } from '../inventory/service.js';
import { recordApprovedDisposition, queueDisposition } from '../returns/disposition.service.js';

export interface IncidentHooks {
  afterWallet?: () => Promise<void>;
  afterObligation?: () => Promise<void>;
  beforeResult?: () => Promise<void>;
}
interface Row {
  id: string;
  reference: string;
  version: number;
  state: IncidentDetail['state'];
  brand_id: string;
  custody_branch_id: string;
  responsible_branch_id: string;
  holder: 'branch' | 'driver';
  driver_id: string | null;
  report: IncidentDetail['report'];
  recorded_at: Date;
  actor_name: string;
  dismissal_reason: string | null;
  brand_name: string;
  branch_name: string;
}
async function row(u: UnitOfWork, id: string, lock = false): Promise<Row> {
  const r = (
    await u.client.query<Row>(
      `SELECT i.*,b.name AS brand_name,br.name AS branch_name FROM incidents.incident i JOIN commercial.brand b ON(b.company_id,b.id)=(i.company_id,i.brand_id) JOIN access.branch br ON(br.company_id,br.id)=(i.company_id,i.responsible_branch_id) WHERE i.company_id=$1 AND i.id=$2 ${lock ? 'FOR UPDATE OF i' : ''}`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!r) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(r.custody_branch_id);
  u.assertBranch(r.responsible_branch_id);
  return r;
}
export async function incidentDetail(u: UnitOfWork, id: string): Promise<IncidentDetail> {
  const i = await row(u, id),
    company = u.access.companyId;
  const c = (
    await u.client.query<{
      id: string;
      source_id: string;
      lot_id: string;
      obligation_id: string | null;
      employee_payroll_branch_id: string | null;
      fields: IncidentConfirmation;
      confirmed_at: Date;
      actor_name: string;
    }>('SELECT * FROM incidents.confirmation WHERE company_id=$1 AND incident_id=$2', [company, id])
  ).rows[0];
  const items = (
    await u.client.query<{
      selection: IncidentDetail['report']['items'][number];
      snapshot: IncidentCandidate;
    }>(
      'SELECT selection,snapshot FROM incidents.affected_item WHERE company_id=$1 AND incident_id=$2 ORDER BY source_key,unit_offset',
      [company, id],
    )
  ).rows.map((x) => ({ ...x.selection, snapshot: x.snapshot }));
  const dispositions = (
    await u.client.query<{ handling: string; action_id: string | null; state: string | null }>(
      `SELECT CASE WHEN a.action_id IS NOT NULL THEN 'canonical' ELSE d.handling END handling,COALESCE(a.action_id,d.action_id) action_id,r.state FROM incidents.disposition d LEFT JOIN incidents.disposition_attempt a ON(a.company_id,a.affected_item_id)=(d.company_id,d.affected_item_id) LEFT JOIN returns.intent r ON(r.company_id,r.id)=(d.company_id,COALESCE(a.return_intent_id,d.return_intent_id)) WHERE d.company_id=$1 AND d.incident_id=$2`,
      [company, id],
    )
  ).rows;
  const state: IncidentDetail['disposition']['state'] = !c
    ? 'not_confirmed'
    : dispositions.some((x) => x.handling === 'awaiting_dependency')
      ? 'awaiting_dependency'
      : dispositions.some((x) => x.handling === 'awaiting_request')
        ? 'awaiting_request'
        : dispositions.some((x) => x.state === 'rejected' || x.state === 'review-required')
          ? 'review'
          : dispositions.some((x) => x.handling === 'canonical' && x.state !== 'accepted')
            ? 'pending'
            : dispositions.some((x) => x.handling === 'canonical')
              ? 'accepted'
              : 'native_recorded';
  const review = (
    await u.client.query<{ id: string; reason: string; hold_minor: string; recorded_at: Date }>(
      'SELECT * FROM incidents.review WHERE company_id=$1 AND incident_id=$2',
      [company, id],
    )
  ).rows[0];
  return {
    id: i.id,
    reference: i.reference,
    version: i.version,
    state: i.state,
    brandId: i.brand_id,
    brandName: i.brand_name,
    custodyBranchId: i.custody_branch_id,
    responsibleBranchId: i.responsible_branch_id,
    branchName: i.branch_name,
    holder: i.holder,
    driverId: i.driver_id,
    report: i.report,
    items,
    recordedAt: i.recorded_at.toISOString(),
    actorName: i.actor_name,
    dismissalReason: i.dismissal_reason,
    confirmation: c
      ? {
          ...c.fields,
          id: c.id,
          sourceId: c.source_id,
          lotId: c.lot_id,
          obligationId: c.obligation_id,
          employeePayrollBranchId: c.employee_payroll_branch_id,
          confirmedAt: c.confirmed_at.toISOString(),
          actorName: c.actor_name,
          effects: (
            await u.client.query<{
              id: string;
              family: string;
              kind: string;
              amountMinor: string;
              branchId: string;
            }>(
              'SELECT id,family,kind,amount_minor::text AS "amountMinor",branch_id AS "branchId" FROM kernel.journal_effect WHERE company_id=$1 AND source_id=$2 ORDER BY family,kind',
              [company, c.source_id],
            )
          ).rows,
        }
      : null,
    disposition: {
      state,
      actionIds: dispositions.flatMap((x) => (x.action_id ? [x.action_id] : [])),
    },
    replacements: (
      await u.client.query<IncidentDetail['replacements'][number]>(
        `SELECT s.id,s.reference,r.payer FROM incidents.replacement r JOIN shipments.shipment s ON(s.company_id,s.id)=(r.company_id,r.shipment_id) WHERE r.company_id=$1 AND r.incident_id=$2 ORDER BY r.recorded_at`,
        [company, id],
      )
    ).rows,
    payouts: c
      ? (
          await u.client.query<IncidentDetail['payouts'][number]>(
            `SELECT p.id,p.reference,a.amount_minor::text AS "amountMinor" FROM finance.payout_allocation a JOIN finance.brand_payout p ON(p.company_id,p.id)=(a.company_id,a.payout_id) WHERE a.company_id=$1 AND a.lot_id=$2 AND p.paying_branch_id=ANY($3::uuid[])`,
            [company, c.lot_id, u.access.assignedBranches.map((b) => b.id)],
          )
        ).rows
      : [],
    review: review
      ? {
          id: review.id,
          reason: review.reason,
          holdMinor: review.hold_minor,
          status: 'awaiting_p21',
          recordedAt: review.recorded_at.toISOString(),
        }
      : null,
    recovery: {
      obligationId: c?.obligation_id ?? null,
      status: 'awaiting_p20',
      amountMinor: c?.fields.employeeShareMinor ?? '0',
    },
  };
}
export async function incidentCatalog(u: UnitOfWork): Promise<IncidentCatalog> {
  return {
    branches: u.access.assignedBranches,
    brands: (
      await u.client.query<{ id: string; name: string }>(
        'SELECT id,name FROM commercial.brand WHERE company_id=$1 ORDER BY name',
        [u.access.companyId],
      )
    ).rows,
    employees: (
      await u.client.query<IncidentCatalog['employees'][number]>(
        'SELECT id,name,branch_id AS "branchId" FROM employees.employee WHERE company_id=$1 AND branch_id=ANY($2::uuid[]) ORDER BY name',
        [u.access.companyId, u.access.assignedBranches.map((b) => b.id)],
      )
    ).rows,
    currentMonth: (await employeeClock(u.client)).month,
  };
}
export async function incidentCandidates(u: UnitOfWork, brandId: string, shipmentId?: string) {
  const company = u.access.companyId,
    branches = u.access.assignedBranches.map((b) => b.id);
  const selections = (
    await u.client.query<{
      kind: IncidentCandidate['kind'];
      sourceId: string;
      lineId: string | null;
    }>(
      `SELECT 'shipment_line' AS kind,s.id AS "sourceId",l.id AS "lineId" FROM shipments.shipment s JOIN shipments.line l ON(l.company_id,l.shipment_id,l.revision)=(s.company_id,s.id,s.revision) JOIN shipments.parcel_custody pc ON(pc.company_id,pc.shipment_id)=(s.company_id,s.id) WHERE s.company_id=$1 AND s.brand_id=$2 AND pc.branch_id=ANY($3::uuid[]) AND ($4::uuid IS NULL OR s.id=$4)
 UNION ALL SELECT 'stock_movement',m.id,NULL::uuid FROM inventory.stock_movement m WHERE m.company_id=$1 AND m.brand_id=$2 AND m.branch_id=ANY($3::uuid[]) AND m.sound_delta+m.unavailable_delta>0 AND $4::uuid IS NULL
 UNION ALL SELECT 'transfer_line',l.id,NULL::uuid FROM goods_transfer.line l JOIN goods_transfer.manifest m ON(m.company_id,m.id)=(l.company_id,l.manifest_id) WHERE l.company_id=$1 AND l.brand_id=$2 AND m.source_branch_id=ANY($3::uuid[]) AND l.kind='loose' AND l.remaining>0 AND m.state='in_transit' AND $4::uuid IS NULL LIMIT 500`,
      [company, brandId, branches, shipmentId ?? null],
    )
  ).rows;
  const items = [];
  for (const s of selections) {
    const v = await incidentCandidate(u.client, company, s);
    if (v && v.capacity > 0) items.push(v);
  }
  return { items };
}
export async function incidentList(u: UnitOfWork, f: IncidentFilter) {
  if (f.branchId) u.assertBranch(f.branchId);
  if (f.from && f.to && f.from > f.to) throw new AccessError('INVALID_DATE_RANGE', 400);
  const rows = (
    await u.client.query<{ id: string; total: string }>(
      `SELECT i.id,count(*) OVER()::text AS total FROM incidents.incident i LEFT JOIN incidents.confirmation c ON(c.company_id,c.incident_id)=(i.company_id,i.id) WHERE i.company_id=$1 AND i.custody_branch_id=ANY($2::uuid[]) AND i.responsible_branch_id=ANY($2::uuid[]) AND ($3::uuid IS NULL OR i.custody_branch_id=$3 OR i.responsible_branch_id=$3) AND ($4::uuid IS NULL OR i.brand_id=$4) AND ($5::text IS NULL OR i.state=$5) AND ($6::text IS NULL OR i.kind=$6) AND ($7::uuid IS NULL OR EXISTS(SELECT 1 FROM incidents.affected_item a WHERE a.company_id=i.company_id AND a.incident_id=i.id AND a.snapshot->>'shipmentId'=$7::text)) AND ($8::uuid IS NULL OR c.employee_id=$8) AND ($9::timestamptz IS NULL OR (CASE WHEN $11='confirmed' THEN c.confirmed_at ELSE i.observed_at END)>=$9) AND ($10::timestamptz IS NULL OR (CASE WHEN $11='confirmed' THEN c.confirmed_at ELSE i.observed_at END)<$10) ORDER BY i.recorded_at DESC,i.id LIMIT 25 OFFSET $12`,
      [
        u.access.companyId,
        u.access.assignedBranches.map((b) => b.id),
        f.branchId ?? null,
        f.brandId ?? null,
        f.state ?? null,
        f.kind ?? null,
        f.shipmentId ?? null,
        f.employeeId ?? null,
        f.from ? cairoDayRange(f.from).start : null,
        f.to ? cairoDayRange(f.to).end : null,
        f.dateBasis ?? 'observed',
        (Number(f.page ?? 1) - 1) * 25,
      ],
    )
  ).rows;
  const items = [];
  for (const r of rows) items.push(await incidentDetail(u, r.id));
  return { items, total: Number(rows[0]?.total ?? 0) };
}
async function validateConfirmation(u: UnitOfWork, i: Row, c: IncidentConfirmation, lock: boolean) {
  u.assertBranch(c.responsibleBranchId);
  if (i.version !== c.expectedVersion) throw new AccessError('REVISION_CONFLICT', 409, i.version);
  if (i.state !== 'reported') throw new AccessError('INCIDENT_ALREADY_RESOLVED', 409);
  validateIncidentShares(c, i.holder === 'branch' && i.report.kind === 'loss');
  if (c.responsibleBranchId !== i.custody_branch_id && !c.branchReason.trim())
    throw new AccessError('INCIDENT_BRANCH_REASON_REQUIRED', 409);
  if (
    !(
      await u.client.query('SELECT 1 FROM access.branch WHERE company_id=$1 AND id=$2 AND active', [
        u.access.companyId,
        c.responsibleBranchId,
      ])
    ).rowCount
  )
    throw new AccessError('FORBIDDEN_SCOPE');
  let payrollBranch: string | null = null;
  if (c.employeeId) {
    if (lock) {
      u.lockOrder('employee', '0:company:' + u.access.companyId);
      await lockEmployeeCompany(u.client, u.access.companyId);
    }
    const e = (
      await u.client.query<{ branch_id: string }>(
        'SELECT branch_id FROM employees.employee WHERE company_id=$1 AND id=$2',
        [u.access.companyId, c.employeeId],
      )
    ).rows[0];
    if (!e) throw new AccessError('EMPLOYEE_NOT_FOUND', 409);
    u.assertBranch(e.branch_id);
    payrollBranch = e.branch_id;
    if (!i.driver_id) throw new AccessError('INCIDENT_EMPLOYEE_CUSTODY_REQUIRED', 409);
    const historical = await resolveEmployeeTermsAt(
      u.client,
      u.access.companyId,
      i.driver_id,
      new Date(i.report.observedAt),
    );
    if (historical.status !== 'resolved' || historical.employeeId !== c.employeeId)
      throw new AccessError('INCIDENT_EMPLOYEE_LINK_UNRESOLVED', 409);
    u.assertBranch(historical.employeeBranchId);
    if (lock) {
      await new JournalPosting(u).lock('employee', c.employeeId);
      await guardEditablePayrollPeriod(u.client, u.access.companyId, c.employeeId, c.payrollMonth!);
    } else {
      const now = await employeeClock(u.client);
      const p = (
        await u.client.query<{ state: string }>(
          'SELECT state FROM employees.payroll_period WHERE company_id=$1 AND employee_id=$2 AND month=$3',
          [u.access.companyId, c.employeeId, c.payrollMonth + '-01'],
        )
      ).rows[0];
      if (c.payrollMonth! < now.month || (p && p.state !== 'editable_unpaid'))
        throw new AccessError('PAYROLL_PERIOD_PROTECTED', 409);
    }
  }
  return payrollBranch;
}
export async function incidentPreview(
  u: UnitOfWork,
  id: string,
  c: IncidentConfirmation,
): Promise<IncidentPreview> {
  const i = await row(u, id),
    blockers: string[] = [];
  let allowedPayrollMonth: string | null = null;
  try {
    await validateConfirmation(u, i, c, false);
  } catch (e) {
    if (!(e instanceof AccessError) || e.status !== 409) throw e;
    blockers.push(e.code);
  }
  if (c.employeeId) {
    const now = await employeeClock(u.client);
    const p = (
      await u.client.query<{ month: string }>(
        `SELECT to_char(d,'YYYY-MM') AS month FROM generate_series($3::date,$3::date+interval '120 months',interval '1 month') d WHERE NOT EXISTS(SELECT 1 FROM employees.payroll_period p WHERE p.company_id=$1 AND p.employee_id=$2 AND p.month=d::date AND p.state<>'editable_unpaid') ORDER BY d LIMIT 1`,
        [u.access.companyId, c.employeeId, now.month + '-01'],
      )
    ).rows[0];
    allowedPayrollMonth = p?.month ?? null;
  }
  return {
    confirmation: c,
    blockers,
    allowedPayrollMonth,
    walletCreditMinor: c.compensationMinor,
    employeeObligationMinor: c.employeeShareMinor,
    compensationCostMinor: c.compensationMinor,
    employeeCompensationShareMinor: c.employeeShareMinor,
    cashMinor: '0',
  };
}
async function lockSources(u: UnitOfWork, items: IncidentDetail['report']['items']) {
  for (const key of [...new Set(items.map(incidentSourceKey))].sort()) {
    u.lockOrder('aggregate', 'affected:' + key);
    await u.client.query(
      'INSERT INTO incidents.affected_source(company_id,source_key) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [u.access.companyId, key],
    );
    await u.client.query(
      'SELECT source_key FROM incidents.affected_source WHERE company_id=$1 AND source_key=$2 FOR UPDATE',
      [u.access.companyId, key],
    );
  }
}
async function lockPhysical(u: UnitOfWork, items: IncidentDetail['report']['items']) {
  // Source lock is already held. P14/P15 use source → manifest/return → shipment → stock.
  const shipments = items.filter((x) => x.kind === 'shipment_line').map((x) => x.sourceId);
  await u.client.query(
    `SELECT m.id FROM goods_transfer.manifest m JOIN shipments.parcel_custody p ON(p.company_id,p.transfer_id)=(m.company_id,m.id) WHERE p.company_id=$1 AND p.shipment_id=ANY($2::uuid[]) ORDER BY m.id FOR UPDATE OF m`,
    [u.access.companyId, shipments],
  );
  for (const id of [
    ...new Set(items.filter((x) => x.kind === 'transfer_line').map((x) => x.sourceId)),
  ].sort())
    await u.client.query(
      'SELECT m.id FROM goods_transfer.manifest m JOIN goods_transfer.line l ON(l.company_id,l.manifest_id)=(m.company_id,m.id) WHERE l.company_id=$1 AND l.id=$2 FOR UPDATE OF m,l',
      [u.access.companyId, id],
    );
  for (const id of [
    ...new Set(items.filter((x) => x.kind === 'shipment_line').map((x) => x.sourceId)),
  ].sort())
    await u.client.query(
      'SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE',
      [u.access.companyId, id],
    );
}
async function holdStock(
  u: UnitOfWork,
  id: string,
  items: { selection: IncidentDetail['report']['items'][number]; snapshot: IncidentCandidate }[],
  observedAt: string,
) {
  const relevant = items.filter((x) => x.snapshot.holder === 'branch' && x.snapshot.variantId);
  const groups = new Map<
    string,
    {
      key: { branchId: string; brandId: string; variantId: string };
      sound: number;
      unavailable: number;
      looseSound: number;
    }
  >();
  for (const { selection: s, snapshot: v } of relevant) {
    const key = { branchId: v.branchId, brandId: v.brandId, variantId: v.variantId! },
      k = positionKey(key),
      g = groups.get(k) ?? { key, sound: 0, unavailable: 0, looseSound: 0 };
    g[v.sourceCondition] += s.quantity;
    if (s.kind === 'stock_movement' && v.sourceCondition === 'sound') g.looseSound += s.quantity;
    groups.set(k, g);
  }
  const repo = new StockPositionRepository();
  for (const [k, g] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    u.lockOrder('stock', k);
    const p = (await repo.lock(u.client, u.access.companyId, [g.key]))[0]!;
    const existing = (
      await u.client.query<{ quantity: string }>(
        `SELECT COALESCE(sum(a.quantity),0)::text AS quantity FROM incidents.affected_item a JOIN incidents.incident i ON(i.company_id,i.id)=(a.company_id,a.incident_id) WHERE a.company_id=$1 AND a.snapshot->>'variantId'=$2 AND a.snapshot->>'branchId'=$3 AND a.snapshot->>'holder'='branch' AND i.state<>'dismissed' AND NOT(i.state='confirmed' AND i.kind='loss')`,
        [u.access.companyId, g.key.variantId, g.key.branchId],
      )
    ).rows[0]!;
    if (
      g.sound > safeStockNumber(p.sound) ||
      g.looseSound > Math.max(0, safeStockNumber(p.sound) - safeStockNumber(p.reserved)) ||
      g.unavailable > Math.max(0, safeStockNumber(p.unavailable) - Number(existing.quantity))
    )
      throw new AccessError('INCIDENT_STOCK_UNAVAILABLE', 409);
    if (g.sound) {
      const source = randomUUID();
      await u.client.query(
        `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'condition','incident',$3,1)`,
        [u.access.companyId, source, id + ':' + k],
      );
      await changeStockCondition(u, g.key, {
        sourceId: source,
        effectKey: 'report-hold',
        expectedVersion: p.version,
        quantity: g.sound,
        to: 'unavailable',
        actualDate: cairoDate(new Date(observedAt)),
      });
    }
  }
}
async function permitsDisposition(u: UnitOfWork) {
  return !!(
    await u.client.query(
      `SELECT 1 FROM integration.source WHERE company_id=$1 AND configuration->'allowedOperations' ? 'return.recordDisposition'`,
      [u.access.companyId],
    )
  ).rowCount;
}
function dispositionItems(
  group: { selection: IncidentDetail['report']['items'][number]; snapshot: IncidentCandidate }[],
) {
  const items = new Map<string, { itemId: string; expectedRevision: number; quantity: number }>();
  for (const a of group) {
    const id = a.snapshot.returnItemId!;
    const item = items.get(id) ?? {
      itemId: id,
      expectedRevision: a.snapshot.returnRevision!,
      quantity: 0,
    };
    item.quantity += a.selection.quantity;
    items.set(id, item);
  }
  return [...items.values()];
}
export function incidentCommands(pool: Pool, hooks: IncidentHooks = {}) {
  const definition = (kind: IncidentCommand['type']): CommandDefinition<IncidentCommand> => ({
    family: 'incidents',
    kind,
    capability: 'incidents',
    authorize: async (u, value, recovery) => {
      if (recovery) {
        const ref = value as Record<string, unknown>;
        if (typeof ref.incidentId === 'string') await row(u, ref.incidentId);
        else if (typeof ref.branchId === 'string') u.assertBranch(ref.branchId);
        return;
      }
      const input = value as IncidentCommand;
      if (!validateIncidentCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
      if (input.type === 'incident.report') {
        for (const s of input.report.items) {
          const v = await incidentCandidate(u.client, u.access.companyId, s);
          if (!v) throw new AccessError('INCIDENT_SOURCE_UNAVAILABLE', 409);
          u.assertBranch(v.branchId);
        }
      } else {
        await row(u, input.incidentId);
        if (input.type === 'incident.confirm')
          u.assertBranch(input.confirmation.responsibleBranchId);
      }
    },
    rejectionReference: async (input, u) => ({
      entityId: input.type === 'incident.report' ? input.report.brandId : input.incidentId,
      branchId:
        input.type === 'incident.report'
          ? (await incidentCandidate(u.client, u.access.companyId, input.report.items[0]!))!
              .branchId
          : (await row(u, input.incidentId)).custody_branch_id,
    }),
    resolve: async (u, ref) => {
      const r = (
        await u.client.query<{ result: IncidentResult }>(
          'SELECT result FROM incidents.command_outcome WHERE company_id=$1 AND command_record_id=$2',
          [u.access.companyId, ref.recordId],
        )
      ).rows[0];
      if (!r) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
      return r.result;
    },
    execute: async (u, input, recordId) => {
      const company = u.access.companyId,
        id = input.type === 'incident.report' ? randomUUID() : input.incidentId,
        posting = new JournalPosting(u);
      // Common integration guard is optional for native-only companies; no external I/O.
      await u.client.query('SELECT id FROM integration.source WHERE company_id=$1 FOR UPDATE', [
        company,
      ]);
      const source =
        input.type === 'incident.confirm' || input.type === 'incident.review'
          ? await posting.source(
              {
                system: 'incident',
                identity: id,
                kind: input.type === 'incident.confirm' ? 'confirmation' : 'review',
                revision: '1',
              },
              input.type === 'incident.confirm' ? input.confirmation : { reason: input.reason },
            )
          : null;
      let before: number | null = null,
        version = 1,
        reference: string;
      if (input.type === 'incident.report') {
        const r = input.report;
        if (Date.parse(r.observedAt) > Date.now())
          throw new AccessError('FUTURE_INCIDENT_OBSERVATION', 409);
        await lockSources(u, r.items);
        await lockPhysical(u, r.items);
        const items: {
          selection: IncidentDetail['report']['items'][number];
          snapshot: IncidentCandidate;
        }[] = [];
        for (const s of r.items) {
          const v = await incidentCandidate(u.client, company, s);
          if (!v || v.brandId !== r.brandId)
            throw new AccessError('INCIDENT_SOURCE_UNAVAILABLE', 409);
          u.assertBranch(v.branchId);
          if (
            s.offset + s.quantity > v.capacity ||
            v.claimed.some(
              (a) => s.offset < a.offset + a.quantity && a.offset < s.offset + s.quantity,
            ) ||
            items.some(
              (a) =>
                a.snapshot.key === v.key &&
                s.offset < a.selection.offset + a.selection.quantity &&
                a.selection.offset < s.offset + s.quantity,
            )
          )
            throw new AccessError('INCIDENT_QUANTITY_CLAIMED', 409);
          items.push({ selection: s, snapshot: v });
        }
        const first = items[0]!.snapshot;
        if (
          items.some(
            (x) =>
              x.snapshot.branchId !== first.branchId ||
              x.snapshot.holder !== first.holder ||
              x.snapshot.driverId !== first.driverId,
          )
        )
          throw new AccessError('INCIDENT_CUSTODY_MUST_MATCH', 409);
        await holdStock(u, id, items, r.observedAt);
        reference = (
          await u.client.query<{ reference: string }>(
            `INSERT INTO incidents.incident(company_id,id,brand_id,custody_branch_id,responsible_branch_id,holder,driver_id,report,observed_at,kind,command_record_id,actor_id,actor_name) VALUES($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING reference`,
            [
              company,
              id,
              r.brandId,
              first.branchId,
              first.holder,
              first.driverId,
              JSON.stringify(r),
              r.observedAt,
              r.kind,
              recordId,
              u.access.principalId,
              u.access.displayName,
            ],
          )
        ).rows[0]!.reference;
        for (const a of items) {
          await u.client.query(
            'INSERT INTO incidents.affected_item(company_id,id,incident_id,source_key,selection,snapshot,unit_offset,quantity) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
            [
              company,
              randomUUID(),
              id,
              a.snapshot.key,
              JSON.stringify(a.selection),
              JSON.stringify(a.snapshot),
              a.selection.offset,
              a.selection.quantity,
            ],
          );
          if (a.snapshot.shipmentId)
            await u.client.query(
              'INSERT INTO incidents.shipment_hold(company_id,shipment_id,incident_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
              [company, a.snapshot.shipmentId, id],
            );
        }
      } else {
        const old = await row(u, id);
        await lockSources(u, old.report.items);
        u.lockOrder('aggregate', 'incident:' + id);
        const i = await row(u, id, true);
        before = i.version;
        version = i.version;
        reference = i.reference;
        const expected =
          input.type === 'incident.confirm'
            ? input.confirmation.expectedVersion
            : input.expectedVersion;
        if (expected !== i.version) throw new AccessError('REVISION_CONFLICT', 409, i.version);
        if (input.type === 'incident.dismiss') {
          if (i.state !== 'reported') throw new AccessError('INCIDENT_ALREADY_RESOLVED', 409);
          version++;
          await u.client.query(
            `UPDATE incidents.incident SET state='dismissed',dismissal_reason=$3,version=version+1 WHERE company_id=$1 AND id=$2`,
            [company, id, input.reason],
          );
          await u.client.query(
            'UPDATE incidents.affected_item SET released=true WHERE company_id=$1 AND incident_id=$2',
            [company, id],
          );
        } else if (input.type === 'incident.review') {
          if (i.state !== 'confirmed') throw new AccessError('CONFIRMED_INCIDENT_REQUIRED', 409);
          if (
            (
              await u.client.query(
                'SELECT 1 FROM incidents.review WHERE company_id=$1 AND incident_id=$2',
                [company, id],
              )
            ).rowCount
          )
            throw new AccessError('INCIDENT_REVIEW_EXISTS', 409);
          await BrandWalletService.lock(u, [i.brand_id]);
          const c = (
            await u.client.query<{ lot_id: string }>(
              'SELECT lot_id FROM incidents.confirmation WHERE company_id=$1 AND incident_id=$2',
              [company, id],
            )
          ).rows[0]!;
          const remaining = (
            await u.client.query<{ amount: string }>(
              `SELECT GREATEST(0,l.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=l.company_id AND a.lot_id=l.id),0)-COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=l.company_id AND h.lot_id=l.id AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id)),0))::text AS amount FROM kernel.credit_lot l WHERE l.company_id=$1 AND l.id=$2`,
              [company, c.lot_id],
            )
          ).rows[0]!.amount;
          if (minor(remaining) > 0n)
            await new BrandWalletService(u, i.brand_id).hold(
              c.lot_id,
              source!.id,
              remaining,
              input.reason,
            );
          await u.client.query(
            'INSERT INTO incidents.review(company_id,id,incident_id,source_id,reason,hold_minor,command_record_id) VALUES($1,$2,$3,$4,$5,$6,$7)',
            [company, randomUUID(), id, source!.id, input.reason, remaining, recordId],
          );
        } else if (input.type === 'incident.disposition') {
          if (i.state !== 'confirmed') throw new AccessError('CONFIRMED_INCIDENT_REQUIRED', 409);
          if (!(await permitsDisposition(u)))
            throw new AccessError('DISPOSITION_DEPENDENCY_PENDING', 409);
          await lockPhysical(u, i.report.items);
          const pending = (
            await u.client.query<{
              id: string;
              selection: IncidentDetail['report']['items'][number];
              snapshot: IncidentCandidate;
            }>(
              `SELECT a.id,a.selection,a.snapshot FROM incidents.affected_item a JOIN incidents.disposition d ON(d.company_id,d.affected_item_id)=(a.company_id,a.id) WHERE a.company_id=$1 AND a.incident_id=$2 AND d.handling IN ('awaiting_request','awaiting_dependency') AND NOT EXISTS(SELECT 1 FROM incidents.disposition_attempt p WHERE p.company_id=a.company_id AND p.affected_item_id=a.id) ORDER BY a.source_key,a.unit_offset`,
              [company, id],
            )
          ).rows;
          if (!pending.length) throw new AccessError('DISPOSITION_ALREADY_QUEUED', 409);
          const groups = new Map<string, typeof pending>();
          for (const a of pending) {
            const fresh = await incidentCandidate(u.client, company, a.selection);
            if (!fresh?.returnRequestId) throw new AccessError('DISPOSITION_REQUEST_PENDING', 409);
            if (fresh.holder !== 'driver' || fresh.branchId !== i.custody_branch_id)
              throw new AccessError('INCIDENT_CUSTODY_CHANGED', 409);
            a.snapshot = fresh;
            const group = groups.get(fresh.returnRequestId) ?? [];
            group.push(a);
            groups.set(fresh.returnRequestId, group);
          }
          for (const [requestId, group] of [...groups.entries()].sort(([a], [b]) =>
            a.localeCompare(b),
          )) {
            const decisionId = randomUUID();
            await recordApprovedDisposition(u, {
              decisionId,
              incidentId: id,
              requestId,
              branchId: i.custody_branch_id,
              disposition: i.report.kind === 'loss' ? 'lost' : 'damaged',
              items: dispositionItems(group),
            });
            const result = await queueDisposition(
              pool,
              u,
              requestId,
              i.custody_branch_id,
              decisionId,
              recordId,
            );
            for (const a of group)
              await u.client.query(
                'INSERT INTO incidents.disposition_attempt(company_id,affected_item_id,return_intent_id,action_id,command_record_id,reason) VALUES($1,$2,$3,$4,$5,$6)',
                [company, a.id, result.entityId, result.actionId, recordId, input.reason],
              );
          }
        } else {
          const c = input.confirmation;
          if (i.state !== 'reported') throw new AccessError('INCIDENT_ALREADY_RESOLVED', 409);
          await posting.createResource('operating', id);
          await lockPhysical(u, i.report.items);
          const affected = (
            await u.client.query<{
              id: string;
              selection: IncidentDetail['report']['items'][number];
              snapshot: IncidentCandidate;
            }>(
              'SELECT id,selection,snapshot FROM incidents.affected_item WHERE company_id=$1 AND incident_id=$2 AND NOT released ORDER BY source_key,unit_offset',
              [company, id],
            )
          ).rows;
          if (affected.length !== i.report.items.length)
            throw new AccessError('INCIDENT_QUANTITY_CLAIMED', 409);
          const confirmationId = randomUUID(),
            dispositions = new Map<string, { entityId: string; actionId: string }>();
          const nativeTransfers = new Set<string>();
          const dispositionPermitted = await permitsDisposition(u);
          // Queue the exact P14 subset under its source/request locks, before wallet/employee effects.
          const returnGroups = new Map<string, typeof affected>();
          for (const a of affected) {
            if (a.snapshot.holder === 'driver' && a.selection.kind === 'shipment_line') {
              const fresh = await incidentCandidate(u.client, company, a.selection);
              if (!fresh || fresh.holder !== 'driver' || fresh.branchId !== i.custody_branch_id)
                throw new AccessError('INCIDENT_CUSTODY_CHANGED', 409);
              if (a.selection.offset + a.selection.quantity > fresh.capacity)
                throw new AccessError('INCIDENT_CUSTODY_CHANGED', 409);
              if (
                (
                  await u.client.query(
                    'SELECT 1 FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2 AND transfer_id IS NOT NULL',
                    [company, a.selection.sourceId],
                  )
                ).rowCount
              )
                nativeTransfers.add(a.id);
              if (fresh.returnRequestId && dispositionPermitted) {
                a.snapshot = fresh;
                const group = returnGroups.get(fresh.returnRequestId) ?? [];
                group.push(a);
                returnGroups.set(fresh.returnRequestId, group);
              }
            }
          }
          for (const [requestId, group] of [...returnGroups.entries()].sort(([a], [b]) =>
            a.localeCompare(b),
          )) {
            const decisionId = randomUUID();
            await recordApprovedDisposition(u, {
              decisionId,
              incidentId: id,
              requestId,
              branchId: i.custody_branch_id,
              disposition: i.report.kind === 'loss' ? 'lost' : 'damaged',
              items: dispositionItems(group),
            });
            const result = await queueDisposition(
              pool,
              u,
              requestId,
              i.custody_branch_id,
              decisionId,
              recordId,
            );
            for (const a of group) dispositions.set(a.id, result);
          }
          const repo = new StockPositionRepository();
          for (const a of affected
            .filter((x) => x.snapshot.holder === 'branch' && x.snapshot.variantId)
            .sort((a, b) =>
              positionKey({
                branchId: a.snapshot.branchId,
                brandId: i.brand_id,
                variantId: a.snapshot.variantId!,
              }).localeCompare(
                positionKey({
                  branchId: b.snapshot.branchId,
                  brandId: i.brand_id,
                  variantId: b.snapshot.variantId!,
                }),
              ),
            )) {
            const key = {
              branchId: a.snapshot.branchId,
              brandId: i.brand_id,
              variantId: a.snapshot.variantId!,
            };
            u.lockOrder('stock', positionKey(key));
            const p = (await repo.lock(u.client, company, [key]))[0]!;
            if (safeStockNumber(p.unavailable) < a.selection.quantity)
              throw new AccessError('INCIDENT_CUSTODY_CHANGED', 409);
            if (i.report.kind === 'loss') {
              const ss = randomUUID();
              await u.client.query(
                `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'adjustment','incident',$3,1)`,
                [company, ss, a.id],
              );
              await u.client.query(
                `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,'confirmed-loss',$4,$5,$6,'uncertain',0,$7,$8)`,
                [
                  company,
                  randomUUID(),
                  ss,
                  key.branchId,
                  key.brandId,
                  key.variantId,
                  -a.selection.quantity,
                  cairoDate(new Date(i.report.observedAt)),
                ],
              );
              await repo.update(
                u.client,
                company,
                p,
                safeStockNumber(p.sound),
                safeStockNumber(p.unavailable) - a.selection.quantity,
              );
            }
          }
          for (const a of affected) {
            if (a.selection.kind === 'transfer_line' && i.report.kind === 'loss') {
              const updated = await u.client.query(
                'UPDATE goods_transfer.line SET remaining=remaining-$3 WHERE company_id=$1 AND id=$2 AND remaining>=$3',
                [company, a.selection.sourceId, a.selection.quantity],
              );
              if (!updated.rowCount) throw new AccessError('INCIDENT_CUSTODY_CHANGED', 409);
            }
            const d = dispositions.get(a.id),
              handling = d
                ? 'canonical'
                : a.snapshot.holder === 'driver' &&
                    a.selection.kind === 'shipment_line' &&
                    !nativeTransfers.has(a.id)
                  ? dispositionPermitted
                    ? 'awaiting_request'
                    : 'awaiting_dependency'
                  : 'native_recorded';
            await u.client.query(
              'INSERT INTO incidents.disposition(company_id,incident_id,affected_item_id,kind,handling,return_intent_id,action_id) VALUES($1,$2,$3,$4,$5,$6,$7)',
              [
                company,
                id,
                a.id,
                i.report.kind === 'loss' ? 'lost' : 'damaged',
                handling,
                d?.entityId ?? null,
                d?.actionId ?? null,
              ],
            );
          }
          await BrandWalletService.lock(u, [i.brand_id]);
          const payrollBranch = await validateConfirmation(u, i, c, true),
            obligationId = c.employeeId ? randomUUID() : null;
          const effect = (
            family: JournalEffect['family'],
            kind: string,
            subjectId: string,
            amountMinor: string,
          ): JournalEffect =>
            ({
              family,
              kind,
              subjectId,
              amountMinor,
              branchId: c.responsibleBranchId,
              effectiveDate: cairoDate(new Date(i.report.observedAt)),
              supersedesId: null,
              reason: c.agreementReason,
            }) as JournalEffect;
          const effects = [
            effect('operating', 'cost', id, (-minor(c.compensationMinor)).toString()),
          ];
          if (c.employeeId)
            effects.push(
              effect('employee', 'obligation', c.employeeId, c.employeeShareMinor),
              effect('operating', 'employee_compensation_share', id, c.employeeShareMinor),
            );
          const posted = await new BrandWalletService(u, i.brand_id).postCompensation({
            sourceId: source!.id,
            recordId,
            amountMinor: c.compensationMinor,
            branchId: c.responsibleBranchId,
            effectiveDate: cairoDate(new Date(i.report.observedAt)),
            reason: c.agreementReason,
            additionalEffects: effects,
          });
          await hooks.afterWallet?.();
          if (c.employeeId)
            await u.client.query(
              'INSERT INTO employees.incident_obligation(company_id,id,incident_id,confirmation_id,employee_id,payroll_month,payroll_branch_id,incident_branch_id,amount_minor,effect_id,source_id,effective_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
              [
                company,
                obligationId,
                id,
                confirmationId,
                c.employeeId,
                c.payrollMonth + '-01',
                payrollBranch,
                c.responsibleBranchId,
                c.employeeShareMinor,
                posted.effectIds[2],
                source!.id,
                cairoDate(new Date(i.report.observedAt)),
              ],
            );
          await hooks.afterObligation?.();
          await u.client.query(
            'INSERT INTO incidents.confirmation(company_id,id,incident_id,source_id,command_record_id,fields,goods_value_minor,compensation_minor,company_share_minor,employee_share_minor,responsible_branch_id,employee_id,employee_payroll_branch_id,payroll_month,lot_id,obligation_id,actor_id,actor_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)',
            [
              company,
              confirmationId,
              id,
              source!.id,
              recordId,
              JSON.stringify(c),
              c.goodsValueMinor,
              c.compensationMinor,
              c.companyShareMinor,
              c.employeeShareMinor,
              c.responsibleBranchId,
              c.employeeId,
              payrollBranch,
              c.payrollMonth ? c.payrollMonth + '-01' : null,
              posted.lotId,
              obligationId,
              u.access.principalId,
              u.access.displayName,
            ],
          );
          await u.client.query(
            `UPDATE incidents.incident SET state='confirmed',responsible_branch_id=$3,version=version+1 WHERE company_id=$1 AND id=$2`,
            [company, id, c.responsibleBranchId],
          );
          version++;
        }
      }
      const result: IncidentResult = {
        incidentId: id,
        reference,
        version,
        commandId: input.commandId,
      };
      await hooks.beforeResult?.();
      await u.client.query(
        'INSERT INTO incidents.command_outcome(company_id,command_record_id,result) VALUES($1,$2,$3)',
        [company, recordId, JSON.stringify(result)],
      );
      return {
        reply: { status: 200, body: result },
        reference: { incidentId: id, recordId },
        entityId: id,
        beforeVersion: before,
        afterVersion: version,
      };
    },
  });
  return new CommandService(
    pool,
    (
      [
        'incident.report',
        'incident.confirm',
        'incident.dismiss',
        'incident.review',
        'incident.disposition',
      ] as const
    ).map(definition),
  );
}
