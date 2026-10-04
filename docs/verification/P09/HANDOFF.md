# P09 finance consumer handoff

Scope: company Cash/Bank setup, actual paid expenses, generic deposits/withdrawals. The three workflows use P02 authority, P03 single-client transactions and permanent command outcomes. No opening entries, transfers, actual remittance/payout/payroll/storage workflows, provider automation or operating-profit dashboard are implemented.

## Contracts and authority

`packages/contracts/src/finance/index.ts` exports closed request/result/view/error/filter schemas, validators, shared TypeScript types, `financeFamily`, valid examples and OpenAPI routes. Generated `packages/contracts/openapi.json` is built from those schemas. Every mutation is POST `/api/v1/finance/commands` with schemaVersion1, commandId and companyId; account changes also require expectedVersion. Recover GET `/api/v1/finance/commands/{commandId}?companyId=…&family=finance.accounts|finance.expenses|finance.movements`. P03 scopes identity by company/principal/family and rejects changed payloads. Browser intent retention is scoped to principal/company/channel and persists the original payload until recovery, including a same-ID replay after an unknown lookup.

| Screen/action | Registry grant | Branch and account scope |
| --- | --- | --- |
| Setup/read accounts | `finance.accounts` | Assigned branch intersects account allowed use; editing existing bank setup requires assignment to every existing allowed branch. Cash type/owning branch are immutable. |
| Paid expense/read expense history | `expenses` | Assigned business branch, independently checked against account allowed use. Shared-bank funding preserves expense branch. |
| Generic deposit/withdrawal/history | `finance.movements` | Assigned business branch and permitted account usage. No expense category or profit effect. |
| Expense-category maintenance | `reference-data` | The P04 company reference catalog and revision editor, kind `expense_category`; no parallel settings tree. |

Account-history GET `/api/v1/finance/accounts/{id}/movements` uses the account-screen grant and filters history to assigned business branches. Catalog GET requires `screen` from the three finance grants. Lists deny forged branch/account/category/actor filters and reject unknown filter names. Lists order by actual date, recorded time and ID; accounts order by name and ID. Expense/movement lists use SQL pagination; dates distinguish actual date from immutable recorded timestamp and use Cairo calendar days with inclusive UI end day converted to a half-open interval. Histories retain snapshotted account/branch/category/actor labels through renaming/deactivation. Current permitted master data is still checked for new use and command recovery.

## Funds service

Import `AccountFundsService`, `authorizedAccount`, and `reconcileAccounts` from `apps/api/src/modules/finance/accounts/service.ts`.

```ts
new AccountFundsService(uow: UnitOfWork)
read(accountId: string): Promise<Account>
lock(accountIds: readonly string[]): Promise<void>
use(fields: PaymentFields): Promise<Account>
available(accountId: string): Promise<bigint>
requireFunds(accountId: string, amountMinor: string): Promise<void>
guardNoObligations(accountId: string): Promise<void>
registerObligation(accountId: string, owner: string, sourceIdentity: string): Promise<void>
resolveObligation(accountId: string, owner: string, sourceIdentity: string): Promise<void>
post(input: {
  sourceId: string; recordId: string; movementId?: string;
  fields: PaymentFields; direction: 'deposit' | 'withdrawal';
  sourceKind: 'general' | 'expense'; reason: string;
  additionalEffects?: readonly JournalEffect[];
}): Promise<{ id: string; effectId: string; costEffectId?: string | null }>
reconcileAccounts(uow): Promise<{
  accountId: string; projectionMinor: string; journalMinor: string
}[]>
```

Every method joins the supplied checked-out transaction client. It never starts or commits a nested transaction. Reads require company and permitted account use; mutation endpoints own the screen grant. `lock` sorts/deduplicates account IDs and locks the existing P03 `kernel.resource` money rows. Call it once with all account IDs after earlier aggregate/wallet/employee locks. `use`, `available`, `requireFunds`, `post` and obligation methods require that same lock. Positive EGP integer strings are checked against bigint bounds; Cash uses a cash account, Bank deposit/InstaPay use a bank account. `available` checks projection against the full money journal and rejects a discrepancy. `post` rechecks availability before an outward effect, rejects inactive ordinary use and verifies retained movement facts before accepting a source duplicate.

Lock order: P03 command identity → P03 source identity → P04 configuration lock → optional operating-cost resource → sorted money account resources → append-only effects. Account setup takes the exclusive P04 configuration lock, while payment commands take its shared lock, so account/category edits cannot interleave with validated new use. P02 authorization is reread under the existing company authority lock. The same login session also serializes its idle-time update; the funds-race evidence uses two distinct persisted sessions and independent competing database connections.

P10's explicit company-wide treasury exception must be integrated through its dedicated grant/scope policy when that phase is implemented; P09 supplies assigned-branch authorization and does not widen it. Likewise, later typed movement sources must extend the closed source-kind schema/migration with their own source references instead of recording a dedicated payment as a second generic withdrawal. These are later workflow integrations, not implemented transfer/payroll APIs.

## Immutable source identities and projections

Native expense/general movement source: `(erp, generatedEntityId, expense.create|movement.create, revision1)`. P03 stores the canonical semantic payload digest. One source has one posting batch, and effect identities are unique by company/source/family/kind/subject. Transport command identity remains a separate company/principal/family key. Source-duplicate testing uses a different supplied command-record ID and returns the original movement without another debit.

A general deposit posts money/receipt; withdrawal posts money/payment. Neither creates operating cost/revenue. A paid expense posts negative money/payment and negative operating/cost in one batch. Its positive source-linked `finance.paid_cost` stores the actual cost, date and business branch for later P24. Deferred constraints require matching expense/payment/cost identities, dates, amounts and branches, with exactly one retained cost and payment source. Audit, outcome, source, journal, expense and projection commit atomically. All movement/expense/cost/revision/outcome histories reject update/delete.

The `finance.project_account_effect` database trigger applies every future journal writer's money effect to an existing finance account projection under the money resource lock. The projection cannot become negative. New accounts create one zero projection and no journal effect; migration0013 does not adopt or replay earlier kernel fixture sources. Retained P03 journal rows remain byte-equivalent JSON after upgrade. There was no old paid-expense dataset requiring a data backfill.

`reconcileAccounts` returns authorized projection-versus-journal values for P24. A report must supply its own consistent read snapshot/authorization and preserve the current date basis. The query does not rebuild projections or manufacture discrepancy resolutions.

## Deactivation and downstream obligations

P10/P16/P17/P19/P20/P21 must register outstanding account uses with `registerObligation` while holding the same money lock and in the same transaction as their own retained source. Resolve only after the corresponding actual completion/legitimate resolution has committed in that transaction. `(company, account, owner, sourceIdentity)` is unique; resolution is one way and obligation history cannot be deleted or reassigned. The database trigger locks the account and rejects new obligations on inactive accounts.

Account deactivation and removal of an allowed branch call `guardNoObligations`. The account trigger also rejects deactivation with unresolved obligations. Tests register a pending transfer owner and an unresolved observation owner, prove either blocks deactivation, then resolve both and retain the balance/history. They certify the shared guard; actual treasury transfers and discrepancy resolution remain P10/P21 work. A genuine past payment exceeding book funds is rejected and directed to discrepancy review; P09 has no overdraft or synthetic reversal bypass.
