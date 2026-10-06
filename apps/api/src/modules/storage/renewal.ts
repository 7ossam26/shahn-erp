import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction, type TransactionClient } from '@shahn/database';
import {
  bumpStorageCreditVersion,
  insertStorageAllocations,
  readStorageAgreement,
  readStorageLots,
  readStoragePeriods,
  readStorageRevisions,
  storageDiscoveryCandidates,
} from '@shahn/database';
import {
  AccessError,
  nextDuePeriod,
  planStorageAllocations,
  revisionFor,
  type AccessContext,
  type JournalEffect,
  type StoragePeriodRange,
} from '@shahn/domain';
import { appendAudit } from '../access/repository.js';
import { JournalPosting } from '../kernel/journals.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { DurableWork, lockLease, type Lease } from '../kernel/work.js';
import { lockAgreement, lockCredit } from './agreements.js';
import { databaseStorageClock, type StorageClock } from './clock.js';

export const storageRenewalKind = 'storage.renew';
export const storageWorkRegistry = [{ kind: storageRenewalKind, lane: 'storage' as const }];
/** The locked state no longer matches the job's pre-read; roll back and let the job retry. */
export class StorageRenewalStale extends Error {
  constructor() {
    super('STORAGE_RENEWAL_STALE');
  }
}
export type RenewalOutcome =
  | {
      status: 'generated';
      agreementId: string;
      periodId: string;
      periodIndex: number;
      startDate: string;
      feeMinor: string;
      allocatedMinor: string;
    }
  | { status: 'already_generated'; agreementId: string; periodIndex: number }
  | { status: 'not_due'; agreementId: string; periodIndex: number }
  | { status: 'lease_lost' }
  | { status: 'retry'; code: string };
export interface StorageRenewalHooks {
  /** Test seams. Production passes none. */
  beforeAgreementLock?: (work: Lease) => Promise<void>;
  afterPeriodInsert?: (work: Lease) => Promise<void>;
  /** After the renewal transaction committed and before the job acknowledgement. */
  afterCommit?: (outcome: RenewalOutcome, work: Lease) => Promise<void>;
}
interface RenewalPayload {
  agreementId: string;
  periodIndex: number;
  startDate: string;
}
const jobIdentity = (agreementId: string, period: StoragePeriodRange) =>
  `${agreementId}:${period.index}:${period.startDate}`;
/** The renewal acts under the authority of the revision that set the period's terms. */
function renewalAccess(
  companyId: string,
  branches: { id: string; name: string }[],
  actorId: string,
): AccessContext {
  return {
    companyId,
    principalId: actorId,
    displayName: 'تجديد التخزين التلقائي',
    principalKind: 'staff',
    sessionId: '',
    companyName: '',
    companyActive: true,
    userActive: true,
    issuer: 'storage-renewal',
    subject: actorId,
    authorizationRevision: '',
    grants: [],
    assignedBranches: branches,
    companyBranches: branches,
    supportSessionId: null,
    supportExpiresAt: null,
  };
}
function errorCode(error: unknown) {
  if (error instanceof AccessError) return error.code;
  if (error instanceof StorageRenewalStale) return error.message;
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z][A-Z0-9_]{0,79}$/.test(message) ? message : 'STORAGE_RENEWAL_FAILED';
}
/**
 * Durable PostgreSQL-lane renewal: discovery enqueues at most one job per (agreement, period);
 * each job generates exactly one period with its complete earning, credit allocation and audit in
 * one transaction; the job acknowledgement is a separate commit, so a crash in between is
 * recovered by the unique period source identity instead of a second charge.
 */
export class StorageRenewalService {
  readonly work: DurableWork;
  constructor(
    readonly pool: Pool,
    readonly options: {
      clock?: StorageClock;
      leaseSeconds?: number;
      hooks?: StorageRenewalHooks;
    } = {},
  ) {
    this.work = new DurableWork(pool, storageWorkRegistry);
  }
  get clock() {
    return this.options.clock ?? databaseStorageClock;
  }
  private async enqueue(
    c: TransactionClient,
    companyId: string,
    agreementId: string,
    period: StoragePeriodRange,
  ): Promise<boolean> {
    const terms = revisionFor(await readStorageRevisions(c, companyId, agreementId), period.index);
    // A carried-over P04 configuration without a confirming command cannot authorize postings;
    // it stays visible on the agreement until a brand-setup save records an authorized revision.
    if (!terms.commandRecordId || !terms.actorId) return false;
    await this.work.enqueue(c, {
      companyId,
      principalId: terms.actorId,
      commandRecordId: terms.commandRecordId,
      entityId: agreementId,
      entityVersion: period.index + 1,
      kind: storageRenewalKind,
      sourceIdentity: jobIdentity(agreementId, period),
      payload: {
        agreementId,
        periodIndex: period.index,
        startDate: period.startDate,
      } satisfies RenewalPayload,
    });
    return true;
  }
  /** Scheduled discovery of due agreements; enqueues only the next single due period. */
  async discover(limit = 500): Promise<number> {
    return transaction(this.pool, async (c) => {
      const today = await this.clock.today(c);
      let queued = 0;
      for (const a of await storageDiscoveryCandidates(c, limit)) {
        const due = nextDuePeriod({ ...a, lastGeneratedIndex: a.lastIndex }, today);
        if (due && (await this.enqueue(c, a.companyId, a.id, due))) queued++;
      }
      return queued;
    });
  }
  /** One durable job: claim, renew one period, then acknowledge in a separate transaction. */
  async runOne(): Promise<RenewalOutcome | null> {
    const lease = await this.work.claim(this.options.leaseSeconds ?? 60);
    if (!lease) return null;
    let outcome: RenewalOutcome;
    try {
      outcome = await this.renew(lease);
    } catch (error) {
      const code = errorCode(error);
      await this.work.finish(lease, { kind: 'retryable', code });
      return { status: 'retry', code };
    }
    if (outcome.status === 'lease_lost') return outcome;
    await this.options.hooks?.afterCommit?.(outcome, lease);
    await this.work.finish(lease, { kind: 'success' });
    return outcome;
  }
  /** The single renewal transaction for a claimed job; fenced by the job lease. */
  renew(work: Lease): Promise<RenewalOutcome> {
    const hooks = this.options.hooks ?? {};
    return transaction(this.pool, async (c) => {
      // An expired/superseded worker cannot write: the fence and live lease are rechecked here.
      if (!(await lockLease(c, work, this.work.owner))) return { status: 'lease_lost' };
      const payload = work.payload as RenewalPayload,
        company = work.company_id,
        agreementId = payload.agreementId,
        index = payload.periodIndex;
      const generated = await c.query(
        `SELECT id FROM storage.period WHERE company_id=$1 AND agreement_id=$2 AND period_index=$3`,
        [company, agreementId, index],
      );
      if (generated.rowCount)
        return { status: 'already_generated', agreementId, periodIndex: index };
      const today = await this.clock.today(c),
        pre = await readStorageAgreement(c, company, { id: agreementId });
      if (!pre) throw new AccessError('NOT_FOUND', 404);
      const due = nextDuePeriod({ ...pre, lastGeneratedIndex: pre.lastIndex }, today);
      if (!due || due.index !== index || due.startDate !== payload.startDate)
        return { status: 'not_due', agreementId, periodIndex: index };
      const preTerms = revisionFor(await readStorageRevisions(c, company, agreementId), index);
      if (!preTerms.commandRecordId || !preTerms.actorId)
        throw new AccessError('STORAGE_AUTHORIZATION_MISSING', 409);
      const branches = (
        await c.query<{ id: string; name: string }>(
          `SELECT id,name FROM access.branch WHERE company_id=$1 ORDER BY id`,
          [company],
        )
      ).rows;
      const u = new UnitOfWork(c, renewalAccess(company, branches, preTerms.actorId)),
        posting = new JournalPosting(u);
      // Lock order: period source identity → agreement → period operating resource → credit.
      const source = await posting.source(
        {
          system: 'storage',
          identity: `${agreementId}:${index}:${due.startDate}`,
          kind: 'period',
          revision: '1',
        },
        {
          agreementId,
          periodIndex: index,
          startDate: due.startDate,
          nextStartDate: due.nextStartDate,
        },
      );
      if (source.duplicate) return { status: 'already_generated', agreementId, periodIndex: index };
      await hooks.beforeAgreementLock?.(work);
      const agreement = await lockAgreement(u, agreementId);
      const locked = nextDuePeriod(
        { ...agreement, lastGeneratedIndex: agreement.lastIndex },
        today,
      );
      const terms = revisionFor(await readStorageRevisions(c, company, agreementId), index);
      if (
        !locked ||
        locked.index !== index ||
        locked.startDate !== due.startDate ||
        terms.revision !== preTerms.revision
      )
        throw new StorageRenewalStale();
      const periodId = randomUUID();
      await posting.createResource('operating', periodId);
      await lockCredit(u, agreement.brandId);
      const fee = BigInt(terms.feeMinor);
      // Credit applies to all unpaid periods (oldest due first), including this new one.
      const periods = await readStoragePeriods(c, company, agreement.brandId),
        lots = await readStorageLots(c, company, agreement.brandId);
      const plan = planStorageAllocations(
        [
          ...periods
            .filter((p) => p.outstandingMinor !== '0')
            .map((p) => ({ id: p.id, dueDate: p.startDate, outstandingMinor: p.outstandingMinor })),
          ...(fee > 0n
            ? [{ id: periodId, dueDate: due.startDate, outstandingMinor: fee.toString() }]
            : []),
        ],
        lots
          .filter((l) => l.unallocatedMinor !== '0')
          .map((l) => ({
            id: l.id,
            actualDate: l.actualDate,
            unallocatedMinor: l.unallocatedMinor,
          })),
      );
      const allocated = BigInt(plan.totalMinor);
      // One complete period-start earning (agreement branch, effective on the start date) and one
      // credit allocation. Never a cash receipt; never daily rows.
      const effects: JournalEffect[] = [];
      if (fee > 0n)
        effects.push({
          family: 'operating',
          kind: 'storage',
          subjectId: periodId,
          amountMinor: fee.toString(),
          branchId: terms.branchId,
          effectiveDate: due.startDate,
          supersedesId: null,
          reason: null,
        });
      if (allocated > 0n)
        effects.push({
          family: 'storage',
          kind: 'allocation',
          subjectId: agreement.brandId,
          amountMinor: (-allocated).toString(),
          branchId: terms.branchId,
          effectiveDate: due.startDate,
          supersedesId: null,
          reason: null,
        });
      const batch = effects.length
        ? await posting.append(source.id, terms.commandRecordId!, effects)
        : null;
      const revenueEffectId = fee > 0n ? batch!.ids[0]! : null,
        allocationEffectId = allocated > 0n ? batch!.ids[effects.length - 1]! : null;
      await c.query(
        `INSERT INTO storage.period(company_id,id,agreement_id,brand_id,period_index,start_date,next_start_date,fee_minor,branch_id,revision,
         source_id,revenue_effect_id,generated_on,work_item_id,lease_owner,fence)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          company,
          periodId,
          agreementId,
          agreement.brandId,
          index,
          due.startDate,
          due.nextStartDate,
          fee.toString(),
          terms.branchId,
          terms.revision,
          source.id,
          revenueEffectId,
          today,
          work.id,
          this.work.owner,
          work.fence,
        ],
      );
      await hooks.afterPeriodInsert?.(work);
      if (allocationEffectId)
        await insertStorageAllocations(c, company, agreement.brandId, {
          sourceId: source.id,
          effectId: allocationEffectId,
          triggerKind: 'renewal',
          allocations: plan.allocations.map((a) => ({ ...a, id: randomUUID() })),
        });
      await bumpStorageCreditVersion(c, company, agreement.brandId);
      await appendAudit(
        c,
        {
          principalId: terms.actorId!,
          sessionId: null,
          supportSessionId: null,
          displayName: 'تجديد التخزين التلقائي',
        },
        company,
        'storage.period.generated',
        periodId,
        terms.commandRecordId,
        null,
        null,
        {
          agreementId,
          periodIndex: index,
          startDate: due.startDate,
          nextStartDate: due.nextStartDate,
          feeMinor: fee.toString(),
          branchId: terms.branchId,
          revision: terms.revision,
          allocatedMinor: allocated.toString(),
          workItemId: work.id,
          leaseOwner: this.work.owner,
          fence: work.fence,
        },
      );
      // Catch-up after downtime: chain the next due period as its own job.
      const following = nextDuePeriod({ ...agreement, lastGeneratedIndex: index }, today);
      if (following) await this.enqueue(c, company, agreementId, following);
      return {
        status: 'generated',
        agreementId,
        periodId,
        periodIndex: index,
        startDate: due.startDate,
        feeMinor: fee.toString(),
        allocatedMinor: allocated.toString(),
      };
    });
  }
}
