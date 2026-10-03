# P03 shared kernel handoff

The server entry point is `@shahn/api/kernel`. Browser-safe money, wallet formulas, effect classifications and work outcomes are exported by `@shahn/domain`; closed HTTP schemas are in `@shahn/contracts`. These primitives do not create commercial screens or assert physical payment.

## One transaction and current authority

`UnitOfWork.run(pool, token, companyId, capability, operation)` loads P02's current `AccessContext` inside the checked-out transaction. It holds a shared company authorization lock, then passes `uow.client` and `uow.access` to every local service. No service opens another transaction. Only PostgreSQL `40001` and `40P01` are retried, at most three attempts, under the original intent. Network I/O and physical actions are outside this callback. A connection loss with an unknown commit outcome is not automatically replayed.

Authorization is a preamble. Domain order is command/source identity → business aggregate → stock → brand/storage → employee → money → effects. `uow.lockOrder(class,id)` enforces ascending classes and ascending IDs within a class; already-held rows can be reused. `JournalPosting.lock(family,id,expectedVersion?)` takes the actual row lock and rejects a stale version before effects. Gather and sort all resources within a class before calling services. Raw SQL consumers must follow the same order.

`CommandService(pool, definitions)` accepts only registered command kinds. Each definition supplies family, capability, current resource authorization, execution, compacted-result resolution and an explicit rejection reference. The primary identity remains P02's `(company, principal, family, commandId)` in `command_record`; the kind and canonical payload digest must also match. Authorized 409 domain rejections are retained with their own audit after rolling back the effects savepoint. Transient failures roll back the whole command. `RetainedCommandError.reply` carries the exact saved status/body for an HTTP adapter.

`recover(token,companyId,family,commandId)` rechecks the original principal's current capability and resource scope. `compactCommandResults(pool)` removes only expired, resolved payload/response bodies after the 30-day window. The permanent identity/digest/status/reference stays; unresolved work is never compacted. Definitions resolve compacted success through authorized domain records. The P02 compatibility adapter retains its already-small affected-record/outcome reference. No audit or economic record is deleted.

## Posting and numeric identity

`JournalPosting.source({system,identity,kind,revision},semanticPayload)` safely materializes and locks source identity before business resources. A changed digest conflicts. `duplicate:true` means the caller resolves the existing outcome; it must not invent another revision or append again. Semantic payload excludes request transport IDs and includes every economic choice. Polling and event delivery must normalize to the same source identity.

`createResource(family,id,fixture=false)` belongs in the owning master-data creation transaction. P04 creates the `brand` lock with its company brand; P09 creates the `money` lock with its account. There is one lock row per `(company,id,family)`. Future master tables must link this identity and add their domain-specific constraints, not introduce another wallet or money lock. `fixture:true` records are reserved for isolated tests.

`append(sourceId,commandRecordId,effects)` writes one immutable posting batch and typed effects. Every effect includes family/kind, subject, signed integer-string amount, branch, effective Cairo date, optional supersession/reason; database time and authenticated actor are recorded separately. Brand, actual money, employee earning/obligation, operating facts and storage credit are independent classifications. Unique source/family/kind/subject keys prevent repeated effects. Corrections require a retained, same-company source; the service also checks family/subject. Later business owners define correction policy and permissible periods.

`minor`, `checkedMinor`, `addMinor`, `subtractMinor`, `multiplyMinor` enforce signed PostgreSQL bigint bounds, including intermediate calculations. Positive/nonnegative input modes reject zero or negatives where appropriate; wire schemas reject floats, exponents, whitespace, leading zeros and negative zero. `cairoDayRange` retains half-open UTC boundaries across DST. `kernel.human_reference` is a database sequence; consume `nextval(...)::text` and constrain the consumer's reference unique/digits-only. Rollback gaps are never reused. UUID/source IDs remain separate.

## Wallet, source holds and shipping cover

Construct `WalletService(uow,brandId)` only after locking the shared brand resource. The exact read is `E + P - D` for signed entitlement, and `max(0,E-D-H-C)` for payout availability. Every total and arithmetic step is checked. Immutable allocations remove consumed credit and offset debits, so payouts are never subtracted twice.

- `credit(effectId,'eligible'|'pending')` creates a positive source lot. P16 alone will supply the real full-remittance evidence behind `releaseCredit(lotId,sourceId)`.
- `offsetDebits()` and `payout(effectId,positiveMinor)` consume oldest eligible effective date, then movement UUID. Pending and held credit are excluded. Allocation triggers enforce company/brand/sign/readiness/bounds.
- `hold(lotId,sourceId,positiveMinor,reason)` and `releaseHold(holdId,sourceId)` retain the affected source and append release history. Already-paid exposure requires later domain review rather than rewriting a lot.
- `reserve(sourceId,nonnegativeMinor,allowNegative)` uses the same lock as payout. A no-negative brand needs nonnegative signed entitlement and enough eligible cover, including for a zero-required-cover handover. Allow-negative skips the commercial gate only.
- `closeCover(coverSourceId,sourceId,feeEffectId|null,reason)` appends exactly one consume/release fact. Post the real fee, close cover and offset its debit in one transaction. Fees above the estimate still post; uncovered actual facts are posted without inventing a reservation. A closed cover cannot be consumed again under a new source.
- P09/P17 must also lock the actual funding resource and call `JournalPosting.requireFunds(accountId,positiveMinor)` before outward money. The trial's money account is explicitly artificial.

Storage resources/effects are separate from brand resources/effects even when their subject UUID is the same. No storage balance can become payout eligibility automatically. Employee periods/obligations and storage-period detail/allocation policy belong to P08/P18–P20.

## Durable work

`DurableWork(pool,registry)` registers concrete kinds/lanes. `enqueue(client,intent)` joins the caller's transaction and deduplicates immutable source identity/payload. `claim(seconds=60)` uses `FOR UPDATE SKIP LOCKED`, increments attempts/fence, and commits before returning. External work follows that committed claim.

`finish(lease,outcome,apply?)` locks and validates owner, fence, state and lease expiry before the database-only completion callback. Stale/expired leases return false without invoking it. Outcomes are success, retryable, definite or unknown; only a bounded uppercase safe code is retained. Retryable/unknown return to pending with backoff capped at 300 seconds; definite failure is terminal. The worker caller owns bounded concurrency. P11 supplies actual transport/signatures/inbox ordering and dependency rules.

P02's `IdentityWorker` now uses the same claim and lease validation functions. Its issuer HTTP stays outside a transaction and its existing correlation/recovery behavior remains intact.

## Consumer ownership

| Phase | Consume here | Still owned there |
| --- | --- | --- |
| P04 | Brand resource creation in its master transaction | Actual brand schema, policies and pricing |
| P09 | Money lock, funds check, typed money/cost facts | Accounts, receipts, expenses and account authority |
| P11 | Source identity, command recovery, durable work | Canonical HTTP/signatures/inbox and ordering |
| P12 | Shared wallet lock and shipping reservation | Actual dispatch state, brand policy and canonical acceptance |
| P13 | Source uniqueness and atomic typed posting | Authoritative visit/outcome/revision interpretation |
| P16 | Pending lot release and money posting | Full real remittance and source completeness witness |
| P17 | Wallet allocation plus funding lock | Real payout confirmation, off-day reason and account scope |

P03 does not complete AC-R-055. It does not implement real payout, remittance, chart-of-accounts, payroll, storage billing, Tawsel connector or production rollout.
