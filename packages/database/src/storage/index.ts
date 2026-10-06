import type { TransactionClient } from '../transaction.js';
/**
 * P19 storage repositories. Every function joins the caller's checked-out client; none begins or
 * commits a transaction. Callers acquire locks in the documented order: command/source identity →
 * storage agreement → storage credit account (then receipt/period rows through SQL guards) →
 * money accounts → append-only effects. Lock helpers sort IDs within a class.
 */
export interface StorageAgreementRow {
  companyId: string;
  id: string;
  brandId: string;
  brandName: string;
  startDate: string;
  anchorDay: number;
  firstBillableIndex: number;
  entryDate: string;
  state: 'active' | 'stopped';
  stopBoundary: string | null;
  version: number;
  origin: 'brand_setup' | 'p04_configuration';
  creditVersion: number;
  lastIndex: number | null;
  periodCount: number;
}
const agreementColumns = `a.company_id AS "companyId",a.id,a.brand_id AS "brandId",b.name AS "brandName",
 a.start_date::text AS "startDate",a.anchor_day::int AS "anchorDay",a.first_billable_index AS "firstBillableIndex",
 a.entry_date::text AS "entryDate",a.state,a.stop_boundary::text AS "stopBoundary",a.version,a.origin,
 COALESCE(c.version,1) AS "creditVersion",
 (SELECT max(p.period_index) FROM storage.period p WHERE p.company_id=a.company_id AND p.agreement_id=a.id) AS "lastIndex",
 (SELECT count(*)::int FROM storage.period p WHERE p.company_id=a.company_id AND p.agreement_id=a.id) AS "periodCount"`;
const agreementFrom = `FROM storage.agreement a JOIN commercial.brand b ON(b.company_id,b.id)=(a.company_id,a.brand_id)
 LEFT JOIN storage.credit_account c ON(c.company_id,c.brand_id)=(a.company_id,a.brand_id)`;
export async function readStorageAgreement(
  c: TransactionClient,
  companyId: string,
  key: { id: string } | { brandId: string },
): Promise<StorageAgreementRow | null> {
  const byId = 'id' in key;
  return (
    (
      await c.query<StorageAgreementRow>(
        `SELECT ${agreementColumns} ${agreementFrom} WHERE a.company_id=$1 AND ${byId ? 'a.id' : 'a.brand_id'}=$2`,
        [companyId, byId ? key.id : key.brandId],
      )
    ).rows[0] ?? null
  );
}
/** Row lock on the agreement aggregate; the caller registers its lock-order position first. */
export async function lockStorageAgreementRow(
  c: TransactionClient,
  companyId: string,
  id: string,
): Promise<StorageAgreementRow | null> {
  const locked = await c.query(
    `SELECT id FROM storage.agreement WHERE company_id=$1 AND id=$2 FOR UPDATE`,
    [companyId, id],
  );
  if (!locked.rowCount) return null;
  return readStorageAgreement(c, companyId, { id });
}
/** Credit-account row lock; returns its current version. */
export async function lockStorageCreditRow(
  c: TransactionClient,
  companyId: string,
  brandId: string,
): Promise<number | null> {
  return (
    (
      await c.query<{ version: number }>(
        `SELECT version FROM storage.credit_account WHERE company_id=$1 AND brand_id=$2 FOR UPDATE`,
        [companyId, brandId],
      )
    ).rows[0]?.version ?? null
  );
}
export async function bumpStorageCreditVersion(
  c: TransactionClient,
  companyId: string,
  brandId: string,
): Promise<number> {
  return (
    await c.query<{ version: number }>(
      `UPDATE storage.credit_account SET version=version+1 WHERE company_id=$1 AND brand_id=$2 RETURNING version`,
      [companyId, brandId],
    )
  ).rows[0]!.version;
}
export interface StorageRevisionRow {
  revision: number;
  effectivePeriodIndex: number;
  feeMinor: string;
  branchId: string;
  branchName: string;
  origin: 'brand_setup' | 'p04_configuration';
  commandRecordId: string | null;
  actorId: string | null;
  actorName: string;
  recordedAt: Date;
}
export async function readStorageRevisions(
  c: TransactionClient,
  companyId: string,
  agreementId: string,
): Promise<StorageRevisionRow[]> {
  return (
    await c.query<StorageRevisionRow>(
      `SELECT r.revision,r.effective_period_index AS "effectivePeriodIndex",r.fee_minor::text AS "feeMinor",
       r.branch_id AS "branchId",b.name AS "branchName",r.origin,r.command_record_id AS "commandRecordId",
       r.actor_id AS "actorId",r.actor_name AS "actorName",r.recorded_at AS "recordedAt"
       FROM storage.agreement_revision r JOIN access.branch b ON(b.company_id,b.id)=(r.company_id,r.branch_id)
       WHERE r.company_id=$1 AND r.agreement_id=$2 ORDER BY r.revision`,
      [companyId, agreementId],
    )
  ).rows;
}
export interface StoragePeriodRow {
  id: string;
  periodIndex: number;
  startDate: string;
  nextStartDate: string;
  feeMinor: string;
  branchId: string;
  branchName: string;
  revision: number;
  allocatedMinor: string;
  outstandingMinor: string;
  generatedOn: string;
  recordedAt: Date;
}
export async function readStoragePeriods(
  c: TransactionClient,
  companyId: string,
  brandId: string,
): Promise<StoragePeriodRow[]> {
  return (
    await c.query<StoragePeriodRow>(
      `SELECT p.id,p.period_index AS "periodIndex",p.start_date::text AS "startDate",p.next_start_date::text AS "nextStartDate",
       p.fee_minor::text AS "feeMinor",p.branch_id AS "branchId",b.name AS "branchName",p.revision,
       COALESCE(x.total,0)::text AS "allocatedMinor",(p.fee_minor-COALESCE(x.total,0))::text AS "outstandingMinor",
       p.generated_on::text AS "generatedOn",p.recorded_at AS "recordedAt"
       FROM storage.period p JOIN access.branch b ON(b.company_id,b.id)=(p.company_id,p.branch_id)
       LEFT JOIN (SELECT period_id,sum(amount_minor) AS total FROM storage.allocation WHERE company_id=$1 GROUP BY period_id) x ON x.period_id=p.id
       WHERE p.company_id=$1 AND p.brand_id=$2 ORDER BY p.start_date,p.id`,
      [companyId, brandId],
    )
  ).rows;
}
export interface StorageLotRow {
  id: string;
  reference: string;
  actualDate: string;
  amountMinor: string;
  allocatedMinor: string;
  refundedMinor: string;
  unallocatedMinor: string;
}
/** Receipt lots in effective receipt date then ID order, with exact remaining unallocated credit. */
export async function readStorageLots(
  c: TransactionClient,
  companyId: string,
  brandId: string,
): Promise<StorageLotRow[]> {
  return (
    await c.query<StorageLotRow>(
      `SELECT r.id,r.reference,r.actual_date::text AS "actualDate",r.amount_minor::text AS "amountMinor",
       COALESCE(a.total,0)::text AS "allocatedMinor",COALESCE(f.total,0)::text AS "refundedMinor",
       (r.amount_minor-COALESCE(a.total,0)-COALESCE(f.total,0))::text AS "unallocatedMinor"
       FROM storage.receipt r
       LEFT JOIN (SELECT receipt_id,sum(amount_minor) AS total FROM storage.allocation WHERE company_id=$1 GROUP BY receipt_id) a ON a.receipt_id=r.id
       LEFT JOIN (SELECT receipt_id,sum(amount_minor) AS total FROM storage.refund_source WHERE company_id=$1 GROUP BY receipt_id) f ON f.receipt_id=r.id
       WHERE r.company_id=$1 AND r.brand_id=$2 ORDER BY r.actual_date,r.id`,
      [companyId, brandId],
    )
  ).rows;
}
export interface StorageAllocationInput {
  receiptId: string;
  periodId: string;
  amountMinor: string;
}
export async function insertStorageAllocations(
  c: TransactionClient,
  companyId: string,
  brandId: string,
  input: {
    sourceId: string;
    effectId: string;
    triggerKind: 'payment' | 'renewal';
    allocations: readonly (StorageAllocationInput & { id: string })[];
  },
): Promise<void> {
  for (const a of input.allocations)
    await c.query(
      `INSERT INTO storage.allocation(company_id,id,receipt_id,period_id,brand_id,amount_minor,trigger_kind,source_id,effect_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        companyId,
        a.id,
        a.receiptId,
        a.periodId,
        brandId,
        a.amountMinor,
        input.triggerKind,
        input.sourceId,
        input.effectId,
      ],
    );
}
/** Durable renewal queue status (queue age/error observability) for one company or agreement. */
export async function storageRenewalStatus(
  c: TransactionClient,
  companyId: string,
  agreementId?: string,
) {
  const row = (
    await c.query<{
      pending: number;
      leased: number;
      failed: number;
      oldestPendingSince: Date | null;
      lastError: string | null;
      lastCompletedAt: Date | null;
    }>(
      `SELECT count(*) FILTER(WHERE state='pending')::int AS pending,count(*) FILTER(WHERE state='leased')::int AS leased,
       count(*) FILTER(WHERE state='failed')::int AS failed,
       min(created_at) FILTER(WHERE state IN ('pending','leased')) AS "oldestPendingSince",
       (SELECT w2.last_error FROM work_item w2 WHERE w2.company_id=$1 AND w2.kind='storage.renew' AND w2.last_error IS NOT NULL
        AND ($2::uuid IS NULL OR w2.entity_id=$2) AND w2.state<>'ready' ORDER BY w2.created_at DESC LIMIT 1) AS "lastError",
       max(completed_at) FILTER(WHERE state='ready') AS "lastCompletedAt"
       FROM work_item w WHERE w.company_id=$1 AND w.kind='storage.renew' AND ($2::uuid IS NULL OR w.entity_id=$2)`,
      [companyId, agreementId ?? null],
    )
  ).rows[0]!;
  return {
    pending: row.pending,
    leased: row.leased,
    failed: row.failed,
    oldestPendingSince: row.oldestPendingSince?.toISOString() ?? null,
    lastError: row.lastError,
    lastCompletedAt: row.lastCompletedAt?.toISOString() ?? null,
  };
}
export interface StorageDiscoveryRow {
  companyId: string;
  id: string;
  brandId: string;
  startDate: string;
  anchorDay: number;
  firstBillableIndex: number;
  stopBoundary: string | null;
  lastIndex: number | null;
}
/** Agreements across companies without an in-flight renewal job (worker discovery only). */
export async function storageDiscoveryCandidates(
  c: TransactionClient,
  limit = 500,
): Promise<StorageDiscoveryRow[]> {
  return (
    await c.query<StorageDiscoveryRow>(
      `SELECT a.company_id AS "companyId",a.id,a.brand_id AS "brandId",a.start_date::text AS "startDate",
       a.anchor_day::int AS "anchorDay",a.first_billable_index AS "firstBillableIndex",a.stop_boundary::text AS "stopBoundary",
       (SELECT max(p.period_index) FROM storage.period p WHERE p.company_id=a.company_id AND p.agreement_id=a.id) AS "lastIndex"
       FROM storage.agreement a
       WHERE NOT EXISTS(SELECT 1 FROM work_item w WHERE w.company_id=a.company_id AND w.kind='storage.renew'
        AND w.entity_id=a.id AND w.state IN ('pending','leased'))
       ORDER BY a.company_id,a.id LIMIT $1`,
      [limit],
    )
  ).rows;
}

// ---- Typed facts for P24 (operating profit) and P21 (corrections) ----------------------------

export interface StorageRevenueFact {
  periodId: string;
  agreementId: string;
  brandId: string;
  /** Agreement (revenue) branch snapshotted on the period; never the receiving account branch. */
  branchId: string;
  /** = period start: the complete fee is earned in this Cairo calendar month (ERP-D-201). */
  effectiveDate: string;
  amountMinor: string;
  effectId: string;
}
/** Complete period-start storage earnings in `[from, to)`, read from immutable journal effects. */
export async function storageRevenueFacts(
  c: TransactionClient,
  companyId: string,
  range: { from: string; to: string },
): Promise<StorageRevenueFact[]> {
  return (
    await c.query<StorageRevenueFact>(
      `SELECT p.id AS "periodId",p.agreement_id AS "agreementId",p.brand_id AS "brandId",e.branch_id AS "branchId",
       e.effective_date::text AS "effectiveDate",e.amount_minor::text AS "amountMinor",e.id AS "effectId"
       FROM storage.period p JOIN kernel.journal_effect e ON(e.company_id,e.id)=(p.company_id,p.revenue_effect_id)
       WHERE p.company_id=$1 AND e.effective_date>=$2::date AND e.effective_date<$3::date
       ORDER BY e.effective_date,p.id`,
      [companyId, range.from, range.to],
    )
  ).rows;
}
export interface StorageCashFact {
  kind: 'receipt' | 'refund';
  id: string;
  brandId: string;
  accountId: string;
  /** Actual receiving/paying branch: a cash-location fact, not revenue attribution. */
  branchId: string;
  actualDate: string;
  recordedAt: Date;
  /** Signed actual-money amount: receipts positive, refunds negative. */
  amountMinor: string;
  movementId: string;
}
export async function storageCashFacts(
  c: TransactionClient,
  companyId: string,
  range: { from: string; to: string },
): Promise<StorageCashFact[]> {
  return (
    await c.query<StorageCashFact>(
      `SELECT 'receipt' AS kind,id,brand_id AS "brandId",account_id AS "accountId",branch_id AS "branchId",actual_date::text AS "actualDate",
       recorded_at AS "recordedAt",amount_minor::text AS "amountMinor",movement_id AS "movementId"
       FROM storage.receipt WHERE company_id=$1 AND actual_date>=$2::date AND actual_date<$3::date
       UNION ALL
       SELECT 'refund',id,brand_id,account_id,branch_id,actual_date::text,recorded_at,(-amount_minor)::text,movement_id
       FROM storage.refund WHERE company_id=$1 AND actual_date>=$2::date AND actual_date<$3::date
       ORDER BY 6,1,2`,
      [companyId, range.from, range.to],
    )
  ).rows;
}
export interface StorageReconciliationRow {
  brandId: string;
  receiptsMinor: string;
  journalReceiptsMinor: string;
  allocationsMinor: string;
  journalAllocationsMinor: string;
  refundsMinor: string;
  journalRefundsMinor: string;
  unallocatedMinor: string;
  chargedMinor: string;
  journalRevenueMinor: string;
  outstandingMinor: string;
  movementReceiptsMinor: string;
  movementRefundsMinor: string;
}
/**
 * Rebuild every storage amount from immutable rows and compare with the typed journals and the
 * actual-money movements. Any difference is an integrity failure, never a display adjustment.
 */
export async function reconcileStorage(
  c: TransactionClient,
  companyId: string,
): Promise<StorageReconciliationRow[]> {
  return (
    await c.query<StorageReconciliationRow>(
      `WITH brands AS (SELECT brand_id FROM storage.credit_account WHERE company_id=$1),
       rec AS (SELECT brand_id,sum(amount_minor) t FROM storage.receipt WHERE company_id=$1 GROUP BY brand_id),
       alc AS (SELECT brand_id,sum(amount_minor) t FROM storage.allocation WHERE company_id=$1 GROUP BY brand_id),
       ref AS (SELECT brand_id,sum(amount_minor) t FROM storage.refund WHERE company_id=$1 GROUP BY brand_id),
       per AS (SELECT brand_id,sum(fee_minor) t FROM storage.period WHERE company_id=$1 GROUP BY brand_id),
       jr AS (SELECT subject_id brand_id,sum(amount_minor) FILTER(WHERE kind='receipt') r,-sum(amount_minor) FILTER(WHERE kind='allocation') a,
        -sum(amount_minor) FILTER(WHERE kind='refund') f FROM kernel.journal_effect WHERE company_id=$1 AND family='storage' GROUP BY subject_id),
       rv AS (SELECT p.brand_id,sum(e.amount_minor) t FROM storage.period p JOIN kernel.journal_effect e ON(e.company_id,e.id)=(p.company_id,p.revenue_effect_id)
        WHERE p.company_id=$1 GROUP BY p.brand_id),
       mv AS (SELECT r.brand_id,sum(m.amount_minor) t FROM storage.receipt r JOIN finance.money_movement m ON(m.company_id,m.id)=(r.company_id,r.movement_id)
        WHERE r.company_id=$1 GROUP BY r.brand_id),
       mf AS (SELECT r.brand_id,sum(m.amount_minor) t FROM storage.refund r JOIN finance.money_movement m ON(m.company_id,m.id)=(r.company_id,r.movement_id)
        WHERE r.company_id=$1 GROUP BY r.brand_id)
       SELECT b.brand_id AS "brandId",COALESCE(rec.t,0)::text AS "receiptsMinor",COALESCE(jr.r,0)::text AS "journalReceiptsMinor",
        COALESCE(alc.t,0)::text AS "allocationsMinor",COALESCE(jr.a,0)::text AS "journalAllocationsMinor",
        COALESCE(ref.t,0)::text AS "refundsMinor",COALESCE(jr.f,0)::text AS "journalRefundsMinor",
        (COALESCE(rec.t,0)-COALESCE(alc.t,0)-COALESCE(ref.t,0))::text AS "unallocatedMinor",
        COALESCE(per.t,0)::text AS "chargedMinor",COALESCE(rv.t,0)::text AS "journalRevenueMinor",
        (COALESCE(per.t,0)-COALESCE(alc.t,0))::text AS "outstandingMinor",
        COALESCE(mv.t,0)::text AS "movementReceiptsMinor",COALESCE(mf.t,0)::text AS "movementRefundsMinor"
       FROM brands b LEFT JOIN rec USING(brand_id) LEFT JOIN alc USING(brand_id) LEFT JOIN ref USING(brand_id)
        LEFT JOIN per USING(brand_id) LEFT JOIN jr USING(brand_id) LEFT JOIN rv USING(brand_id) LEFT JOIN mv USING(brand_id) LEFT JOIN mf USING(brand_id)
       ORDER BY b.brand_id`,
      [companyId],
    )
  ).rows;
}
