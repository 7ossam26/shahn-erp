import { AccessError, assertCapability } from '@shahn/domain';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { AccountFundsService } from './service.js';
import { appendAudit } from '../../access/repository.js';
/** Reviewed maintenance primitive, deliberately absent from reporting HTTP. It changes only
 * the rebuildable account cache, holds the ordinary account writer lock and appends audit.
 * Caller supplies observed source/projection totals; a stale finding cannot overwrite funds. */
export async function rebuildAccountProjection(
  u: UnitOfWork,
  input: {
    accountId: string;
    expectedProjectionMinor: string;
    expectedJournalMinor: string;
    expectedProjectionVersion: string;
    reason: string;
  },
) {
  assertCapability(u.access, 'finance.accounts');
  assertCapability(u.access, 'settlements');
  if (!input.reason.trim()) throw new AccessError('VALIDATION_FAILED', 400);
  const funds = new AccountFundsService(u);
  await funds.lock([input.accountId]);
  const account = await funds.read(input.accountId);
  if (account.branchIds.some((b) => !u.access.assignedBranches.some((a) => a.id === b)))
    throw new AccessError('FORBIDDEN_SCOPE');
  const result = (
    await u.client.query<{ amount: string; count: string }>(
      `SELECT COALESCE(sum(amount_minor),0)::text AS amount,count(*)::text AS count FROM kernel.journal_effect WHERE company_id=$1 AND family='money' AND subject_id=$2`,
      [u.access.companyId, input.accountId],
    )
  ).rows[0]!;
  if (
    account.balanceMinor !== input.expectedProjectionMinor ||
    result.amount !== input.expectedJournalMinor ||
    `${account.version}:${result.count}` !== input.expectedProjectionVersion
  )
    throw new AccessError('REVISION_CONFLICT', 409);
  if (BigInt(result.amount) < 0n) throw new AccessError('ACCOUNT_RECONCILIATION_REQUIRED', 409);
  await u.client.query(
    'UPDATE finance.account_balance SET amount_minor=$3 WHERE company_id=$1 AND account_id=$2',
    [u.access.companyId, input.accountId, result.amount],
  );
  if (account.balanceMinor !== result.amount)
    await appendAudit(
      u.client,
      u.access,
      u.access.companyId,
      'account.projection.rebuild',
      input.accountId,
      null,
      null,
      null,
      {
        beforeMinor: account.balanceMinor,
        afterMinor: result.amount,
        journalCount: result.count,
        reason: input.reason,
      },
    );
  return {
    accountId: input.accountId,
    beforeMinor: account.balanceMinor,
    afterMinor: result.amount,
    journalCount: result.count,
  };
}
