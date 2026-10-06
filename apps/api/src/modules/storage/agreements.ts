import { randomUUID } from 'node:crypto';
import {
  AccessError,
  addCalendarDays,
  addMinor,
  changeEffectiveIndex,
  firstBillableIndex,
  isOverdue,
  minor,
  periodIndexOn,
  periodPaymentStatus,
  periodStart,
  revisionFor,
} from '@shahn/domain';
import {
  lockStorageAgreementRow,
  lockStorageCreditRow,
  readStorageAgreement,
  readStorageLots,
  readStoragePeriods,
  readStorageRevisions,
  storageRenewalStatus,
  type StorageAgreementRow,
  type StorageLotRow,
  type StoragePeriodRow,
  type StorageRevisionRow,
} from '@shahn/database';
import type {
  StorageAgreement,
  StorageAgreementDetail,
  StorageAgreementList,
  StorageAgreementSummary,
  StorageCatalog,
  StoragePeriodView,
  StorageReceiptView,
  StorageRefundView,
} from '@shahn/contracts';
import { JournalPosting } from '../kernel/journals.js';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { accountList } from '../finance/service.js';
import type { StorageClock } from './clock.js';

/**
 * Aggregate lock key for a storage agreement. It sorts after the shared commercial configuration
 * lock (brand setup takes both) and before each period's operating resource ('operating:<id>').
 */
export const agreementLockKey = (agreementId: string) => 'contract-storage:' + agreementId;
export async function lockAgreement(u: UnitOfWork, agreementId: string) {
  u.lockOrder('aggregate', agreementLockKey(agreementId));
  const row = await lockStorageAgreementRow(u.client, u.access.companyId, agreementId);
  if (!row) throw new AccessError('NOT_FOUND', 404);
  return row;
}
/** Locks the dedicated (company, brand) storage-credit subledger; never the payout wallet. */
export async function lockCredit(u: UnitOfWork, brandId: string): Promise<number> {
  await new JournalPosting(u).lock('storage', brandId);
  const version = await lockStorageCreditRow(u.client, u.access.companyId, brandId);
  if (version === null) throw new AccessError('STORAGE_AGREEMENT_REQUIRED', 409);
  return version;
}
/** Creates the credit-account lock identity with the brand; wallet lock class, after 'brand:'. */
export async function ensureStorageCreditAccount(u: UnitOfWork, brandId: string) {
  await new JournalPosting(u).createResource('storage', brandId);
  await u.client.query(
    `INSERT INTO storage.credit_account(company_id,brand_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
    [u.access.companyId, brandId],
  );
}
/**
 * P04 brand setup remains the terms editor. Called inside brand.create/brand.update, in the same
 * transaction, after the configuration lock and before any wallet lock. Rules:
 * - first configuration creates the one company-brand agreement (billing starts with the first
 *   period beginning on/after the entry date; earlier periods are historical, P21 opening);
 * - fee/revenue-branch changes append a revision effective from the NEXT period;
 * - the original start may change only before any period exists;
 * - stopping is the dedicated storage action; storage can never be removed once configured.
 */
export async function applyBrandStorageTerms(
  u: UnitOfWork,
  input: {
    brandId: string;
    storage: StorageAgreement | null;
    recordId: string;
    clock: StorageClock;
  },
): Promise<string | null> {
  const company = u.access.companyId,
    c = u.client,
    s = input.storage;
  // Before migration 0023 installs storage, P04's brand policy is the only configuration record
  // and 0023 carries it over (configuration only). Readiness never serves such a schema.
  const installed = (
    await c.query<{ ok: boolean }>(`SELECT to_regclass('storage.agreement') IS NOT NULL AS ok`)
  ).rows[0]!.ok;
  if (!installed) return null;
  const existing = await readStorageAgreement(c, company, { brandId: input.brandId });
  if (!s) {
    if (existing) throw new AccessError('STORAGE_AGREEMENT_RETAINED', 409);
    return null;
  }
  const today = await input.clock.today(c),
    anchor = Number(s.startDate.slice(8));
  const actor = [input.recordId, u.access.principalId, u.access.displayName] as const;
  if (!existing) {
    const id = randomUUID();
    u.lockOrder('aggregate', agreementLockKey(id));
    await c.query(
      `INSERT INTO storage.agreement(company_id,id,brand_id,start_date,anchor_day,first_billable_index,entry_date,state,stop_boundary,origin)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'brand_setup')`,
      [
        company,
        id,
        input.brandId,
        s.startDate,
        anchor,
        firstBillableIndex(s.startDate, anchor, today),
        today,
        s.active ? 'active' : 'stopped',
        s.active ? null : s.startDate,
      ],
    );
    await c.query(
      `INSERT INTO storage.agreement_revision(company_id,agreement_id,revision,effective_period_index,fee_minor,branch_id,origin,command_record_id,actor_id,actor_name)
       VALUES($1,$2,1,0,$3,$4,'brand_setup',$5,$6,$7)`,
      [company, id, s.monthlyFeeMinor, s.branchId, ...actor],
    );
    return id;
  }
  const current = await lockAgreement(u, existing.id);
  let changed = false,
    start = current.startDate,
    anchorDay = current.anchorDay;
  if (s.startDate !== current.startDate) {
    if (current.periodCount > 0 || current.state === 'stopped')
      throw new AccessError('STORAGE_ANCHOR_IMMUTABLE', 409);
    start = s.startDate;
    anchorDay = anchor;
    await c.query(
      `UPDATE storage.agreement SET start_date=$3,anchor_day=$4,first_billable_index=$5,entry_date=$6,version=version+1
       WHERE company_id=$1 AND id=$2`,
      [company, current.id, start, anchorDay, firstBillableIndex(start, anchorDay, today), today],
    );
    changed = true;
  }
  if (!s.active && current.state === 'active')
    throw new AccessError('STORAGE_STOP_USE_STORAGE_FLOW', 409);
  const revisions = await readStorageRevisions(c, company, current.id),
    latest = revisions[revisions.length - 1]!;
  if (latest.feeMinor !== s.monthlyFeeMinor || latest.branchId !== s.branchId) {
    if (current.state === 'stopped') throw new AccessError('STORAGE_AGREEMENT_STOPPED', 409);
    const effective = Math.max(
      changeEffectiveIndex(start, anchorDay, today),
      current.lastIndex === null ? 0 : current.lastIndex + 1,
    );
    await c.query(
      `INSERT INTO storage.agreement_revision(company_id,agreement_id,revision,effective_period_index,fee_minor,branch_id,origin,command_record_id,actor_id,actor_name)
       VALUES($1,$2,$3,$4,$5,$6,'brand_setup',$7,$8,$9)`,
      [
        company,
        current.id,
        latest.revision + 1,
        effective,
        s.monthlyFeeMinor,
        s.branchId,
        ...actor,
      ],
    );
    if (!changed)
      await c.query(
        `UPDATE storage.agreement SET version=version+1 WHERE company_id=$1 AND id=$2`,
        [company, current.id],
      );
  }
  return current.id;
}

// ---- Read models ------------------------------------------------------------------------------

export interface AgreementState {
  row: StorageAgreementRow;
  revisions: StorageRevisionRow[];
  periods: StoragePeriodRow[];
  lots: StorageLotRow[];
  today: string;
}
export async function loadAgreementState(
  u: UnitOfWork,
  row: StorageAgreementRow,
  today: string,
): Promise<AgreementState> {
  const company = u.access.companyId;
  return {
    row,
    today,
    revisions: await readStorageRevisions(u.client, company, row.id),
    periods: await readStoragePeriods(u.client, company, row.brandId),
    lots: await readStorageLots(u.client, company, row.brandId),
  };
}
const sum = (values: readonly string[]) =>
  values.reduce((total, value) => addMinor(total, minor(value, 'nonnegative')), 0n);
/** The period whose terms are "current": today's period, never before the first billable one. */
export function currentPeriodIndex(row: StorageAgreementRow, today: string) {
  return Math.max(row.firstBillableIndex, periodIndexOn(row.startDate, row.anchorDay, today));
}
export function creditOf(lots: readonly StorageLotRow[]) {
  return {
    receiptsMinor: sum(lots.map((l) => l.amountMinor)).toString(),
    correctionsMinor: '0',
    allocatedMinor: sum(lots.map((l) => l.allocatedMinor)).toString(),
    refundedMinor: sum(lots.map((l) => l.refundedMinor)).toString(),
    unallocatedMinor: sum(lots.map((l) => l.unallocatedMinor)).toString(),
  };
}
export function summarize(state: AgreementState): StorageAgreementSummary {
  const { row, revisions, periods, lots, today } = state;
  const index = currentPeriodIndex(row, today),
    current = revisionFor(revisions, index);
  const stopped = (date: string) => row.stopBoundary !== null && date >= row.stopBoundary;
  const nextStart = periodStart(row.startDate, row.anchorDay, index + 1),
    upcoming = revisionFor(revisions, index + 1);
  const nextIndex = row.lastIndex === null ? row.firstBillableIndex : row.lastIndex + 1,
    nextPeriod = periodStart(row.startDate, row.anchorDay, nextIndex);
  const overdue = periods
    .filter((p) => isOverdue(minor(p.outstandingMinor, 'nonnegative'), p.startDate, today))
    .map((p) => p.outstandingMinor);
  return {
    agreementId: row.id,
    brandId: row.brandId,
    brandName: row.brandName,
    state: row.state,
    origin: row.origin,
    startDate: row.startDate,
    anchorDay: row.anchorDay,
    firstBillableStartDate: periodStart(row.startDate, row.anchorDay, row.firstBillableIndex),
    stopBoundary: row.stopBoundary,
    lastServiceDate: row.stopBoundary ? addCalendarDays(row.stopBoundary, -1) : null,
    branchId: current.branchId,
    branchName: current.branchName,
    currentFeeMinor: current.feeMinor,
    nextChange:
      upcoming.revision !== current.revision && !stopped(nextStart)
        ? {
            effectivePeriodIndex: index + 1,
            effectiveStartDate: nextStart,
            feeMinor: upcoming.feeMinor,
            branchId: upcoming.branchId,
            branchName: upcoming.branchName,
          }
        : null,
    nextPeriodStartDate: stopped(nextPeriod) ? null : nextPeriod,
    charges: {
      chargedMinor: sum(periods.map((p) => p.feeMinor)).toString(),
      allocatedMinor: sum(periods.map((p) => p.allocatedMinor)).toString(),
      outstandingMinor: sum(periods.map((p) => p.outstandingMinor)).toString(),
      overdueMinor: sum(overdue).toString(),
    },
    credit: creditOf(lots),
    overdue: overdue.some((v) => v !== '0'),
    periodCount: row.periodCount,
    version: row.version,
    creditVersion: row.creditVersion,
  };
}
export async function storageToday(u: UnitOfWork, clock: StorageClock) {
  return clock.today(u.client);
}
export async function agreementSummary(
  u: UnitOfWork,
  row: StorageAgreementRow,
  today: string,
): Promise<StorageAgreementSummary> {
  return summarize(await loadAgreementState(u, row, today));
}
export async function agreementDetail(
  u: UnitOfWork,
  agreementId: string,
  clock: StorageClock,
): Promise<StorageAgreementDetail> {
  const company = u.access.companyId,
    c = u.client;
  const row = await readStorageAgreement(c, company, { id: agreementId });
  if (!row) throw new AccessError('NOT_FOUND', 404);
  const today = await clock.today(c),
    state = await loadAgreementState(u, row, today);
  const allocations = (
    await c.query<{
      periodId: string;
      receiptId: string;
      receiptReference: string;
      receiptActualDate: string;
      amountMinor: string;
      triggerKind: 'payment' | 'renewal';
      recordedAt: Date;
      startDate: string;
      nextStartDate: string;
    }>(
      `SELECT a.period_id AS "periodId",a.receipt_id AS "receiptId",r.reference AS "receiptReference",
       r.actual_date::text AS "receiptActualDate",a.amount_minor::text AS "amountMinor",a.trigger_kind AS "triggerKind",
       a.recorded_at AS "recordedAt",p.start_date::text AS "startDate",p.next_start_date::text AS "nextStartDate"
       FROM storage.allocation a JOIN storage.receipt r ON(r.company_id,r.id)=(a.company_id,a.receipt_id)
       JOIN storage.period p ON(p.company_id,p.id)=(a.company_id,a.period_id)
       WHERE a.company_id=$1 AND a.brand_id=$2 ORDER BY a.recorded_at,a.id`,
      [company, row.brandId],
    )
  ).rows;
  const periods: StoragePeriodView[] = state.periods.map((p) => {
    const outstanding = minor(p.outstandingMinor, 'nonnegative');
    return {
      periodId: p.id,
      periodIndex: p.periodIndex,
      startDate: p.startDate,
      endDate: addCalendarDays(p.nextStartDate, -1),
      nextStartDate: p.nextStartDate,
      dueDate: p.startDate,
      feeMinor: p.feeMinor,
      branchId: p.branchId,
      branchName: p.branchName,
      revision: p.revision,
      revenueMonth: p.startDate.slice(0, 7),
      allocatedMinor: p.allocatedMinor,
      outstandingMinor: p.outstandingMinor,
      status: periodPaymentStatus(minor(p.feeMinor, 'nonnegative'), outstanding),
      overdue: isOverdue(outstanding, p.startDate, today),
      generatedOn: p.generatedOn,
      recordedAt: p.recordedAt.toISOString(),
      allocations: allocations
        .filter((a) => a.periodId === p.id)
        .map((a) => ({
          receiptId: a.receiptId,
          receiptReference: a.receiptReference,
          receiptActualDate: a.receiptActualDate,
          amountMinor: a.amountMinor,
          triggerKind: a.triggerKind,
          recordedAt: a.recordedAt.toISOString(),
        })),
    };
  });
  const receiptRows = (
    await c.query<
      Omit<
        StorageReceiptView,
        'allocations' | 'allocatedMinor' | 'refundedMinor' | 'unallocatedMinor' | 'recordedAt'
      > & { recordedAt: Date }
    >(
      `SELECT id AS "receiptId",reference,amount_minor::text AS "amountMinor",actual_date::text AS "actualDate",recorded_at AS "recordedAt",
       method,account_id AS "accountId",account_name AS "accountName",branch_id AS "branchId",branch_name AS "branchName",
       external_reference AS "externalReference",actor_name AS "actorName"
       FROM storage.receipt WHERE company_id=$1 AND brand_id=$2 ORDER BY actual_date DESC,recorded_at DESC,id DESC`,
      [company, row.brandId],
    )
  ).rows;
  const receipts: StorageReceiptView[] = receiptRows.map((r) => {
    const lot = state.lots.find((l) => l.id === r.receiptId)!;
    return {
      ...r,
      recordedAt: r.recordedAt.toISOString(),
      allocatedMinor: lot.allocatedMinor,
      refundedMinor: lot.refundedMinor,
      unallocatedMinor: lot.unallocatedMinor,
      allocations: allocations
        .filter((a) => a.receiptId === r.receiptId)
        .map((a) => ({
          periodId: a.periodId,
          startDate: a.startDate,
          endDate: addCalendarDays(a.nextStartDate, -1),
          amountMinor: a.amountMinor,
          triggerKind: a.triggerKind,
          recordedAt: a.recordedAt.toISOString(),
        })),
    };
  });
  const refundRows = (
    await c.query<Omit<StorageRefundView, 'sources' | 'recordedAt'> & { recordedAt: Date }>(
      `SELECT id AS "refundId",reference,amount_minor::text AS "amountMinor",actual_date::text AS "actualDate",recorded_at AS "recordedAt",
       method,account_id AS "accountId",account_name AS "accountName",branch_id AS "branchId",branch_name AS "branchName",
       reason,external_reference AS "externalReference",actor_name AS "actorName"
       FROM storage.refund WHERE company_id=$1 AND brand_id=$2 ORDER BY actual_date DESC,recorded_at DESC,id DESC`,
      [company, row.brandId],
    )
  ).rows;
  const sources = (
    await c.query<{
      refundId: string;
      receiptId: string;
      receiptReference: string;
      receiptActualDate: string;
      amountMinor: string;
    }>(
      `SELECT s.refund_id AS "refundId",s.receipt_id AS "receiptId",r.reference AS "receiptReference",
       r.actual_date::text AS "receiptActualDate",s.amount_minor::text AS "amountMinor"
       FROM storage.refund_source s JOIN storage.receipt r ON(r.company_id,r.id)=(s.company_id,s.receipt_id)
       WHERE s.company_id=$1 AND s.brand_id=$2 ORDER BY r.actual_date,r.id`,
      [company, row.brandId],
    )
  ).rows;
  const stop = (
    await c.query<{
      stopBoundary: string;
      requestedOn: string;
      reason: string;
      actorName: string;
      recordedAt: Date;
    }>(
      `SELECT stop_boundary::text AS "stopBoundary",requested_on::text AS "requestedOn",reason,actor_name AS "actorName",recorded_at AS "recordedAt"
       FROM storage.stop_record WHERE company_id=$1 AND agreement_id=$2`,
      [company, row.id],
    )
  ).rows[0];
  return {
    ...summarize(state),
    today,
    revisions: state.revisions.map((r) => ({
      revision: r.revision,
      effectivePeriodIndex: r.effectivePeriodIndex,
      effectiveStartDate: periodStart(row.startDate, row.anchorDay, r.effectivePeriodIndex),
      feeMinor: r.feeMinor,
      branchId: r.branchId,
      branchName: r.branchName,
      origin: r.origin,
      actorName: r.actorName,
      recordedAt: r.recordedAt.toISOString(),
    })),
    periods,
    receipts,
    refunds: refundRows.map((r) => ({
      ...r,
      recordedAt: r.recordedAt.toISOString(),
      sources: sources.filter((s) => s.refundId === r.refundId).map(({ refundId: _r, ...s }) => s),
    })),
    stop: stop
      ? {
          ...stop,
          lastServiceDate: addCalendarDays(stop.stopBoundary, -1),
          recordedAt: stop.recordedAt.toISOString(),
        }
      : null,
    renewal: await storageRenewalStatus(c, company, row.id),
  };
}
const PAGE = 25;
export async function agreementList(
  u: UnitOfWork,
  f: {
    brandId?: string;
    branchId?: string;
    state?: string;
    payment?: string;
    overdue?: string;
    dueFrom?: string;
    dueTo?: string;
    paymentBasis?: string;
    paidFrom?: string;
    paidTo?: string;
    search?: string;
    page?: string;
  },
  clock: StorageClock,
): Promise<StorageAgreementList> {
  const company = u.access.companyId,
    c = u.client,
    today = await clock.today(c),
    page = Number(f.page ?? 1),
    recorded = f.paymentBasis === 'recorded';
  // The branch filter is the agreement's CURRENT revenue branch; receipt branches never filter it.
  const rows = (
    await c.query<{ id: string; total: string }>(
      `WITH current_terms AS (
        SELECT DISTINCT ON (r.agreement_id) r.agreement_id,r.branch_id FROM storage.agreement_revision r
        JOIN storage.agreement a ON(a.company_id,a.id)=(r.company_id,r.agreement_id)
        CROSS JOIN LATERAL (SELECT ((extract(year FROM $13::date)-extract(year FROM a.start_date))*12
          +extract(month FROM $13::date)-extract(month FROM a.start_date))::int AS months) m
        WHERE r.company_id=$1 AND r.effective_period_index<=GREATEST(a.first_billable_index,
          (SELECT COALESCE(max(k),-1) FROM generate_series(GREATEST(0,m.months-1),GREATEST(0,m.months+1)) k
           WHERE storage.period_start(a.start_date,a.anchor_day,k)<=$13::date))
        ORDER BY r.agreement_id,r.revision DESC),
       period_state AS (
        SELECT p.agreement_id,p.start_date,p.fee_minor,COALESCE(x.total,0) AS allocated FROM storage.period p
        LEFT JOIN (SELECT period_id,sum(amount_minor) AS total FROM storage.allocation WHERE company_id=$1 GROUP BY period_id) x ON x.period_id=p.id
        WHERE p.company_id=$1)
       SELECT a.id,count(*) OVER()::text AS total FROM storage.agreement a
       JOIN commercial.brand b ON(b.company_id,b.id)=(a.company_id,a.brand_id)
       JOIN current_terms t ON t.agreement_id=a.id
       WHERE a.company_id=$1 AND ($2::uuid IS NULL OR a.brand_id=$2) AND ($3::uuid IS NULL OR t.branch_id=$3)
        AND ($4='all' OR a.state=$4)
        AND (($5='all' AND $8::date IS NULL AND $9::date IS NULL) OR EXISTS(SELECT 1 FROM period_state s WHERE s.agreement_id=a.id
          AND ($8::date IS NULL OR s.start_date>=$8) AND ($9::date IS NULL OR s.start_date<=$9)
          AND ($5='all' OR ($5='paid' AND s.allocated=s.fee_minor) OR ($5='unpaid' AND s.allocated=0 AND s.fee_minor>0)
           OR ($5='partial' AND s.allocated>0 AND s.allocated<s.fee_minor))))
        AND ($6='all' OR EXISTS(SELECT 1 FROM period_state s WHERE s.agreement_id=a.id AND s.allocated<s.fee_minor AND s.start_date<$13::date))
        AND (($10::date IS NULL AND $11::date IS NULL) OR EXISTS(SELECT 1 FROM storage.receipt r WHERE r.company_id=a.company_id AND r.brand_id=a.brand_id
          AND ($10::date IS NULL OR (CASE WHEN $12 THEN r.recorded_at>=($10::date::timestamp AT TIME ZONE 'Africa/Cairo') ELSE r.actual_date>=$10 END))
          AND ($11::date IS NULL OR (CASE WHEN $12 THEN r.recorded_at<(($11::date+1)::timestamp AT TIME ZONE 'Africa/Cairo') ELSE r.actual_date<=$11 END))))
        AND ($7='' OR strpos(translate(lower(b.name),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),lower($7))>0)
       ORDER BY lower(b.name),a.id LIMIT ${PAGE} OFFSET $14`,
      [
        company,
        f.brandId ?? null,
        f.branchId ?? null,
        f.state ?? 'all',
        f.payment ?? 'all',
        f.overdue ?? 'all',
        (f.search ?? '').trim(),
        f.dueFrom ?? null,
        f.dueTo ?? null,
        f.paidFrom ?? null,
        f.paidTo ?? null,
        recorded,
        today,
        (page - 1) * PAGE,
      ],
    )
  ).rows;
  const items: StorageAgreementSummary[] = [];
  for (const r of rows) {
    const row = (await readStorageAgreement(c, company, { id: r.id }))!;
    items.push(await agreementSummary(u, row, today));
  }
  return {
    items,
    total: Number(rows[0]?.total ?? 0),
    page,
    limit: PAGE,
    today,
    renewal: await storageRenewalStatus(c, company),
  };
}
export async function storageCatalog(u: UnitOfWork, clock: StorageClock): Promise<StorageCatalog> {
  return {
    today: await clock.today(u.client),
    branches: u.access.assignedBranches,
    accounts: (await accountList(u)).items,
    agreements: (
      await u.client.query<StorageCatalog['agreements'][number]>(
        `SELECT a.id AS "agreementId",a.brand_id AS "brandId",b.name AS "brandName",a.state
         FROM storage.agreement a JOIN commercial.brand b ON(b.company_id,b.id)=(a.company_id,a.brand_id)
         WHERE a.company_id=$1 ORDER BY lower(b.name),a.id`,
        [u.access.companyId],
      )
    ).rows,
  };
}
