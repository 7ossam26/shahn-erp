import { randomUUID } from 'node:crypto';
import { AccessError, assertCapability, minor, addMinor, type JournalEffect } from '@shahn/domain';
import type { Account, PaymentFields } from '@shahn/contracts';
import { JournalPosting, resourceKey } from '../../kernel/journals.js';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
export const accountColumns = `a.id,a.name,a.type,a.currency,a.active,a.version,a.bank_description AS "bankDescription",b.amount_minor::text AS "balanceMinor",
 ARRAY(SELECT branch_id::text FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id ORDER BY branch_id) AS "branchIds"`;
export async function authorizedAccount(u: UnitOfWork, id: string): Promise<Account> {
  const r = (
    await u.client.query<Account>(
      `SELECT ${accountColumns} FROM finance.account a JOIN finance.account_balance b ON b.company_id=a.company_id AND b.account_id=a.id
    WHERE a.company_id=$1 AND a.id=$2 AND EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id AND x.branch_id=ANY($3::uuid[]))`,
      [u.access.companyId, id, u.access.assignedBranches.map((b) => b.id)],
    )
  ).rows[0];
  if (!r) throw new AccessError('NOT_FOUND', 404);
  return r;
}
/** All methods join the caller's checked-out client. None begins or commits a transaction. */
export class AccountFundsService {
  constructor(
    readonly uow: UnitOfWork,
    private readonly treasuryScope?: 'treasury.send' | 'treasury.receive',
  ) {}
  async read(id: string): Promise<Account> {
    if (!this.treasuryScope) return authorizedAccount(this.uow, id);
    assertCapability(this.uow.access, this.treasuryScope);
    const row = (
      await this.uow.client.query<Account>(
        `SELECT ${accountColumns} FROM finance.account a JOIN finance.account_balance b ON b.company_id=a.company_id AND b.account_id=a.id WHERE a.company_id=$1 AND a.id=$2`,
        [this.uow.access.companyId, id],
      )
    ).rows[0];
    if (!row) throw new AccessError('NOT_FOUND', 404);
    return row;
  }
  async lock(accountIds: readonly string[]) {
    for (const id of [...new Set(accountIds)].sort()) {
      await this.read(id);
      await new JournalPosting(this.uow).lock('money', id);
    }
  }
  async use(fields: PaymentFields) {
    this.uow.requireLock('money', resourceKey('money', fields.accountId));
    if (this.treasuryScope) {
      assertCapability(this.uow.access, this.treasuryScope);
      if (!this.uow.access.companyBranches.some((b) => b.id === fields.branchId))
        throw new AccessError('FORBIDDEN_SCOPE');
    } else this.uow.assertBranch(fields.branchId);
    const account = await this.read(fields.accountId);
    if (!account.branchIds.includes(fields.branchId))
      throw new AccessError('ACCOUNT_USAGE_FORBIDDEN');
    if (!account.active) throw new AccessError('ACCOUNT_INACTIVE', 409);
    if (fields.currency !== 'EGP') throw new AccessError('INVALID_MONEY', 400);
    if ((account.type === 'cash') !== (fields.method === 'cash'))
      throw new AccessError('METHOD_ACCOUNT_MISMATCH', 409);
    return account;
  }
  async available(accountId: string) {
    this.uow.requireLock('money', resourceKey('money', accountId));
    const account = await this.read(accountId);
    const journal = await new JournalPosting(this.uow).moneyBalance(accountId);
    if (journal.toString() !== account.balanceMinor)
      throw new AccessError('ACCOUNT_RECONCILIATION_REQUIRED', 409);
    return journal;
  }
  async requireFunds(accountId: string, amountMinor: string) {
    if ((await this.available(accountId)) < minor(amountMinor, 'positive'))
      throw new AccessError('INSUFFICIENT_FUNDS', 409);
  }
  async guardNoObligations(accountId: string) {
    this.uow.requireLock('money', resourceKey('money', accountId));
    const obligations = (
      await this.uow.client.query<{ owner: string; sourceIdentity: string }>(
        `SELECT owner,source_identity AS "sourceIdentity" FROM finance.account_obligation WHERE company_id=$1 AND account_id=$2 AND resolved_at IS NULL ORDER BY owner,source_identity LIMIT 25`,
        [this.uow.access.companyId, accountId],
      )
    ).rows;
    if (obligations.length)
      throw Object.assign(new AccessError('ACCOUNT_OBLIGATIONS_PENDING', 409), {
        details: { obligations },
      });
  }
  async registerObligation(accountId: string, owner: string, sourceIdentity: string) {
    this.uow.requireLock('money', resourceKey('money', accountId));
    if (!(await this.read(accountId)).active) throw new AccessError('ACCOUNT_INACTIVE', 409);
    await this.uow.client.query(
      `INSERT INTO finance.account_obligation(company_id,account_id,owner,source_identity) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [this.uow.access.companyId, accountId, owner, sourceIdentity],
    );
  }
  async resolveObligation(accountId: string, owner: string, sourceIdentity: string) {
    this.uow.requireLock('money', resourceKey('money', accountId));
    await this.uow.client.query(
      `UPDATE finance.account_obligation SET resolved_at=clock_timestamp() WHERE company_id=$1 AND account_id=$2 AND owner=$3 AND source_identity=$4 AND resolved_at IS NULL`,
      [this.uow.access.companyId, accountId, owner, sourceIdentity],
    );
  }
  async post(input: {
    sourceId: string;
    recordId: string;
    movementId?: string;
    fields: PaymentFields;
    direction: 'deposit' | 'withdrawal';
    sourceKind:
      | 'general'
      | 'expense'
      | 'remittance'
      | 'brand_payout'
      | 'storage_receipt'
      | 'storage_refund'
      | 'employee_advance'
      | 'salary_payout';
    reason: string;
    additionalEffects?: readonly JournalEffect[];
  }) {
    if (this.treasuryScope) throw new AccessError('FORBIDDEN_SCOPE');
    return this.postMovement(input);
  }
  async postTransfer(input: {
    sourceId: string;
    recordId: string;
    fields: PaymentFields;
    reason: string;
  }) {
    if (!this.treasuryScope) throw new AccessError('FORBIDDEN_SCOPE');
    return this.postMovement({
      ...input,
      direction: this.treasuryScope === 'treasury.send' ? 'withdrawal' : 'deposit',
      sourceKind: this.treasuryScope === 'treasury.send' ? 'treasury_send' : 'treasury_receive',
    });
  }
  private async postMovement(input: {
    sourceId: string;
    recordId: string;
    movementId?: string;
    fields: PaymentFields;
    direction: 'deposit' | 'withdrawal';
    sourceKind:
      | 'general'
      | 'expense'
      | 'treasury_send'
      | 'treasury_receive'
      | 'remittance'
      | 'brand_payout'
      | 'storage_receipt'
      | 'storage_refund'
      | 'employee_advance'
      | 'salary_payout';
    reason: string;
    additionalEffects?: readonly JournalEffect[];
  }) {
    const { uow: u } = this,
      { fields: f } = input;
    u.requireLock('money', resourceKey('money', f.accountId));
    const previous = (
      await u.client.query<{
        id: string;
        effectId: string;
        branchId: string;
        amountMinor: string;
        actualDate: string;
        method: string;
        direction: string;
        reason: string;
        sourceKind: string;
      }>(
        `SELECT id,effect_id AS "effectId",branch_id AS "branchId",amount_minor::text AS "amountMinor",actual_date::text AS "actualDate",method,direction,reason,source_kind AS "sourceKind" FROM finance.money_movement WHERE company_id=$1 AND source_id=$2 AND account_id=$3`,
        [u.access.companyId, input.sourceId, f.accountId],
      )
    ).rows[0];
    if (previous) {
      if (
        previous.branchId !== f.branchId ||
        previous.amountMinor !== f.amountMinor ||
        previous.actualDate !== f.actualDate ||
        previous.method !== f.method ||
        previous.direction !== input.direction ||
        previous.reason !== input.reason ||
        previous.sourceKind !== input.sourceKind ||
        f.currency !== 'EGP'
      )
        throw new AccessError('SOURCE_PAYLOAD_CONFLICT', 409);
      return { id: previous.id, effectId: previous.effectId };
    }
    const account = await this.use(f);
    const amount = minor(f.amountMinor, 'positive');
    if (input.direction === 'withdrawal') await this.requireFunds(f.accountId, f.amountMinor);
    else addMinor(await this.available(f.accountId), amount);
    const signed = (input.direction === 'deposit' ? amount : -amount).toString();
    const posting = await new JournalPosting(u).append(
      input.sourceId,
      input.recordId,
      [
        {
          family: 'money',
          kind: this.treasuryScope
            ? input.direction === 'deposit'
              ? 'transfer_in'
              : 'transfer_out'
            : input.direction === 'deposit'
              ? 'receipt'
              : 'payment',
          subjectId: f.accountId,
          amountMinor: signed,
          branchId: f.branchId,
          effectiveDate: f.actualDate,
          supersedesId: null,
          reason: input.reason || null,
        },
        ...(input.additionalEffects ?? []),
      ],
      this.treasuryScope,
    );
    const id = input.movementId ?? randomUUID(),
      effectId = posting.ids[0]!;
    await u.client.query(
      `INSERT INTO finance.money_movement(company_id,id,account_id,branch_id,source_id,effect_id,source_kind,direction,amount_minor,currency,method,actual_date,reason,account_name,branch_name,actor_id,actor_name)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'EGP',$10,$11,$12,$13,$14,$15,$16)`,
      [
        u.access.companyId,
        id,
        f.accountId,
        f.branchId,
        input.sourceId,
        effectId,
        input.sourceKind,
        input.direction,
        f.amountMinor,
        f.method,
        f.actualDate,
        input.reason,
        account.name,
        (this.treasuryScope ? u.access.companyBranches : u.access.assignedBranches).find(
          (b) => b.id === f.branchId,
        )!.name,
        u.access.principalId,
        u.access.displayName,
      ],
    );
    return { id, effectId, costEffectId: posting.ids[1] ?? null };
  }
}
/** P24 must run under an authorized snapshot; no mutation or projection rebuild here. */
export async function reconcileAccounts(u: UnitOfWork) {
  return (
    await u.client.query<{ accountId: string; projectionMinor: string; journalMinor: string }>(
      `SELECT a.id AS "accountId",b.amount_minor::text AS "projectionMinor",COALESCE(sum(j.amount_minor),0)::text AS "journalMinor"
    FROM finance.account a JOIN finance.account_balance b ON b.company_id=a.company_id AND b.account_id=a.id
    LEFT JOIN kernel.journal_effect j ON j.company_id=a.company_id AND j.subject_id=a.id AND j.family='money'
    WHERE a.company_id=$1 AND EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id AND x.branch_id=ANY($2::uuid[]))
    GROUP BY a.id,b.amount_minor ORDER BY a.id`,
      [u.access.companyId, u.access.assignedBranches.map((b) => b.id)],
    )
  ).rows;
}
