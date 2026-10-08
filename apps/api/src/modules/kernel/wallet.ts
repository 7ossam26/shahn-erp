import { randomUUID } from 'node:crypto';
import { AccessError, addMinor, minor, subtractMinor, walletAmounts } from '@shahn/domain';
import { UnitOfWork } from './unit-of-work.js';
import { resourceKey } from './journals.js';
interface Lot {
  id: string;
  remaining: string;
  held: string;
  eligible: boolean;
}
export class WalletService {
  constructor(
    readonly uow: UnitOfWork,
    readonly brandId: string,
  ) {}
  private check() {
    this.uow.requireLock('wallet', resourceKey('brand', this.brandId));
  }
  private async lots(): Promise<Lot[]> {
    this.check();
    return (
      await this.uow.client.query<Lot>(
        `SELECT l.id,
      (l.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=l.company_id AND a.lot_id=l.id),0))::text AS remaining,
      COALESCE((SELECT sum(h.amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=l.company_id AND h.lot_id=l.id
        AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id)),0)::text AS held,
      (l.readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release r WHERE r.company_id=l.company_id AND r.lot_id=l.id)) AS eligible
      FROM kernel.credit_lot l WHERE l.company_id=$1 AND l.brand_id=$2 ORDER BY l.effective_date,l.id`,
        [this.uow.access.companyId, this.brandId],
      )
    ).rows;
  }
  private async debits() {
    return (
      await this.uow.client.query<{ id: string; remaining: string }>(
        `SELECT e.id,
      (-e.amount_minor::numeric-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=e.company_id AND a.effect_id=e.id),0))::text AS remaining
      FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.subject_id=$2 AND e.family='brand' AND e.amount_minor<0 AND e.kind<>'payout'
      ORDER BY e.effective_date,e.id`,
        [this.uow.access.companyId, this.brandId],
      )
    ).rows;
  }
  async amounts() {
    const lots = await this.lots();
    let e = 0n,
      p = 0n,
      h = 0n,
      d = 0n,
      c = 0n;
    for (const lot of lots) {
      const remaining = minor(lot.remaining, 'nonnegative');
      if (lot.eligible) {
        e = addMinor(e, remaining);
        h = addMinor(h, minor(lot.held, 'nonnegative'));
      } else p = addMinor(p, remaining);
    }
    for (const debit of await this.debits()) d = addMinor(d, minor(debit.remaining, 'nonnegative'));
    const covers = await this.uow.client.query<{ amount_minor: string }>(
      `SELECT amount_minor FROM kernel.shipping_cover c
      WHERE company_id=$1 AND brand_id=$2 AND NOT EXISTS(SELECT 1 FROM kernel.cover_close x WHERE x.company_id=c.company_id AND x.cover_id=c.id)`,
      [this.uow.access.companyId, this.brandId],
    );
    for (const cover of covers.rows) c = addMinor(c, minor(cover.amount_minor, 'nonnegative'));
    return walletAmounts(e, p, d, h, c);
  }
  async credit(effectId: string, readiness: 'eligible' | 'pending') {
    this.check();
    const result = await this.uow.client.query(
      `INSERT INTO kernel.credit_lot(company_id,id,brand_id,amount_minor,readiness,effective_date)
      SELECT company_id,id,subject_id,amount_minor,$4,effective_date FROM kernel.journal_effect
      WHERE company_id=$1 AND id=$2 AND subject_id=$3 AND family='brand' AND amount_minor>0 RETURNING id`,
      [this.uow.access.companyId, effectId, this.brandId, readiness],
    );
    if (!result.rowCount) throw new AccessError('INVALID_CREDIT_SOURCE', 409);
  }
  async releaseCredit(lotId: string, sourceId: string) {
    this.check();
    const lot = (await this.lots()).find((l) => l.id === lotId);
    if (!lot) throw new AccessError('NOT_FOUND', 404);
    await this.uow.client.query(
      `INSERT INTO kernel.credit_release(company_id,lot_id,source_id) VALUES($1,$2,$3)
      ON CONFLICT(company_id,lot_id) DO NOTHING`,
      [this.uow.access.companyId, lotId, sourceId],
    );
  }
  /** Cancel only the unreleased pending lot through its exact linked correction.
   * This is a source revaluation, never a payment or eligibility release. */
  async cancelPendingCredit(lotId: string, correctionEffectId: string, amount: string) {
    this.check();
    const valid = await this.uow.client.query(
      `SELECT 1 FROM kernel.credit_lot l JOIN kernel.journal_effect e ON e.company_id=l.company_id
       AND e.id=$3 AND e.family='brand' AND e.kind='correction' AND e.supersedes_id=l.id
       AND e.amount_minor=-$4::bigint
       WHERE l.company_id=$1 AND l.brand_id=$2 AND l.id=$5 AND l.readiness='pending'
       AND NOT EXISTS(SELECT 1 FROM kernel.credit_release r WHERE r.company_id=l.company_id AND r.lot_id=l.id)`,
      [this.uow.access.companyId, this.brandId, correctionEffectId, amount, lotId],
    );
    if (!valid.rowCount) throw new AccessError('PENDING_CORRECTION_REQUIRES_REVIEW', 409);
    await this.uow.client.query(
      `INSERT INTO kernel.lot_allocation(id,company_id,lot_id,effect_id,amount_minor) VALUES($1,$2,$3,$4,$5)`,
      [randomUUID(), this.uow.access.companyId, lotId, correctionEffectId, amount],
    );
  }
  /** P21: a linked negative correction first consumes the free remainder of the lot it supersedes.
   * Any excess stays an ordinary unallocated debit; paid allocations are never touched. */
  async allocateCorrection(lotId: string, correctionEffectId: string): Promise<string> {
    this.check();
    const row = (
      await this.uow.client.query<{ amount: string }>(
        `SELECT (-e.amount_minor)::text AS amount FROM kernel.journal_effect e JOIN kernel.credit_lot l
         ON l.company_id=e.company_id AND l.id=e.supersedes_id
         WHERE e.company_id=$1 AND e.id=$2 AND e.family='brand' AND e.kind='correction' AND e.amount_minor<0
         AND l.id=$3 AND l.brand_id=$4`,
        [this.uow.access.companyId, correctionEffectId, lotId, this.brandId],
      )
    ).rows[0];
    if (!row) throw new AccessError('INVALID_CORRECTION_SOURCE', 409);
    const lot = (await this.lots()).find((l) => l.id === lotId)!;
    const free = subtractMinor(minor(lot.remaining, 'nonnegative'), minor(lot.held, 'nonnegative'));
    const wanted = minor(row.amount, 'positive'),
      amount = free < wanted ? free : wanted;
    if (amount > 0n)
      await this.uow.client.query(
        `INSERT INTO kernel.lot_allocation(id,company_id,lot_id,effect_id,amount_minor) VALUES($1,$2,$3,$4,$5)`,
        [randomUUID(), this.uow.access.companyId, lotId, correctionEffectId, amount.toString()],
      );
    return (amount > 0n ? amount : 0n).toString();
  }
  private async allocate(effectId: string, requested: bigint): Promise<bigint> {
    let remaining = requested;
    for (const lot of await this.lots()) {
      if (!lot.eligible || remaining === 0n) continue;
      const free = subtractMinor(
        minor(lot.remaining, 'nonnegative'),
        minor(lot.held, 'nonnegative'),
      );
      if (free <= 0n) continue;
      const amount = remaining < free ? remaining : free;
      await this.uow.client.query(
        `INSERT INTO kernel.lot_allocation(id,company_id,lot_id,effect_id,amount_minor) VALUES($1,$2,$3,$4,$5)`,
        [randomUUID(), this.uow.access.companyId, lot.id, effectId, amount.toString()],
      );
      remaining = subtractMinor(remaining, amount);
    }
    return remaining;
  }
  async offsetDebits() {
    this.check();
    for (const debit of await this.debits()) {
      const amount = minor(debit.remaining, 'nonnegative');
      if (amount > 0n) await this.allocate(debit.id, amount);
    }
  }
  async requirePayout(amount: string) {
    this.check();
    if (minor((await this.amounts()).eligibleToPay) < minor(amount, 'positive'))
      throw new AccessError('INSUFFICIENT_ELIGIBLE_CREDIT', 409);
  }
  async payout(effectId: string, amount: string) {
    await this.requirePayout(amount);
    await this.offsetDebits();
    if ((await this.allocate(effectId, minor(amount, 'positive'))) !== 0n)
      throw new Error('ALLOCATION_INVARIANT');
  }
  async reserve(sourceId: string, amount: string, allowNegative: boolean) {
    this.check();
    const wanted = minor(amount, 'nonnegative'),
      totals = await this.amounts();
    if (
      !allowNegative &&
      (minor(totals.signedEntitlement) < 0n || minor(totals.eligibleToPay) < wanted)
    )
      throw new AccessError('INSUFFICIENT_SHIPPING_COVER', 409);
    // Allow-negative bypasses only the handover gate; no eligible credit is fabricated.
    await this.uow.client.query(
      `INSERT INTO kernel.shipping_cover(id,company_id,brand_id,source_id,amount_minor) VALUES($1,$2,$3,$4,$5)`,
      [
        randomUUID(),
        this.uow.access.companyId,
        this.brandId,
        sourceId,
        allowNegative ? '0' : amount,
      ],
    );
  }
  async closeCover(
    coverSourceId: string,
    sourceId: string,
    effectId: string | null,
    reason: string,
  ) {
    this.check();
    const cover = (
      await this.uow.client.query<{ id: string }>(
        `SELECT id FROM kernel.shipping_cover
      WHERE company_id=$1 AND brand_id=$2 AND source_id=$3`,
        [this.uow.access.companyId, this.brandId, coverSourceId],
      )
    ).rows[0];
    if (!cover) throw new AccessError('COVER_NOT_FOUND', 404);
    const closed = await this.uow.client.query(
      `INSERT INTO kernel.cover_close(company_id,cover_id,source_id,kind,effect_id,reason)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(company_id,cover_id) DO NOTHING RETURNING cover_id`,
      [
        this.uow.access.companyId,
        cover.id,
        sourceId,
        effectId ? 'consume' : 'release',
        effectId,
        reason,
      ],
    );
    if (!closed.rowCount) throw new AccessError('COVER_ALREADY_CLOSED', 409);
  }
  async hold(lotId: string, sourceId: string, amount: string, reason: string) {
    const wanted = minor(amount, 'positive'),
      lot = (await this.lots()).find((l) => l.id === lotId);
    if (!lot?.eligible || subtractMinor(minor(lot.remaining), minor(lot.held)) < wanted)
      throw new AccessError('HOLD_REQUIRES_REVIEW', 409);
    const id = randomUUID();
    await this.uow.client.query(
      `INSERT INTO kernel.wallet_hold(id,company_id,lot_id,source_id,amount_minor,reason) VALUES($1,$2,$3,$4,$5,$6)`,
      [id, this.uow.access.companyId, lotId, sourceId, amount, reason],
    );
    return id;
  }
  async releaseHold(holdId: string, sourceId: string) {
    this.check();
    const result = await this.uow.client.query(
      `INSERT INTO kernel.hold_release(company_id,hold_id,source_id)
      SELECT h.company_id,h.id,$3 FROM kernel.wallet_hold h JOIN kernel.credit_lot l ON (l.company_id,l.id)=(h.company_id,h.lot_id)
      WHERE h.company_id=$1 AND h.id=$2 AND l.brand_id=$4 ON CONFLICT DO NOTHING RETURNING hold_id`,
      [this.uow.access.companyId, holdId, sourceId, this.brandId],
    );
    if (!result.rowCount) throw new AccessError('HOLD_NOT_ACTIVE', 409);
  }
}
