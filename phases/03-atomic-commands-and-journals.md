# P03 — Atomic commands, durable jobs and shared posting primitives

## Observable result

Implement this phase only. Prove a reusable transaction boundary that later money and custody workflows can use without duplicate or partial effects. A controlled development command must persist its result, audit and typed effects atomically; after a lost response/restart, the same command returns the same authorized result. This is infrastructure with demonstrable invariants, not a general accounting product or an arbitrary balance-editing screen.

Model: `gpt-6-astra`, `xhigh`, checked2026-10-03. Source identities, lock order, money precision and crash recovery determine later financial correctness. Select the model manually; [model evidence](MODEL-GUIDANCE.md) supplies availability and alternatives.

Relevant rules: ERP-D-002/006/028/145/146/164/168/200/205; ERP-R-002/005/055/075/091/154/155/168/169/173/177/209/214 and their exact AC-R cases. This phase owns the shared kernel, while business phases prove actual remittance/payout/stock outcomes. It must not claim AC-R-055 complete without P16.

## Reading and prerequisite checks

Read [execution contract](EXECUTION-CONTRACT.md), [data specification](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) sections1/2/5/7/8/9/11, [architecture](../docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md) API/jobs/transactions and [integration plan](../ERP-TAWSEL-INTEGRATION-PLAN.md) sections3/9/10/13. Read domain sections9.2/9.3 for wallet meaning and the current decision rows. Inspect P01/P02 migrations and actual test evidence. Run their registered checks relevant to transaction helper/access before extending shared storage.

Prerequisites: real PostgreSQL18, one-client transaction helper, migration checksums, authenticated `AccessContext`, and P02's existing command/audit/work records. Reuse and extend those records with an additive migration; do not leave two unrelated idempotency or audit systems. A narrow schema/export repair is permitted and recorded; missing authenticated scope or real persistence is a material dependency.

## Persistence and public interfaces

Implement `UnitOfWork`, `CommandService`, `JournalPosting`, wallet locking/allocation, generic durable work leasing and audit packages with explicit TypeScript interfaces and SQL repositories. A caller passes one transaction client and access context through all required modules. No module commits early or performs network I/O inside the transaction. Domain-specific command names and effects are registered explicitly; do not accept an arbitrary client-supplied effect list as a production API.

Native mutation identity is `(companyId, principalId, commandFamily, commandId)` with command kind and canonical payload digest. Same identity/same payload returns the retained result after current authorization; same identity/different payload rejects. `expectedVersion` conflicts before related writes. Persist response status/body or result reference and retain a compact permanent identity even after full response retention expires. Use the adopted30-day full-result retention plus permanent compact identity; after compaction resolve by authorized domain result instead of executing again. No business/audit movement deletion follows response compaction.

Use signed bigint minor units in PostgreSQL and closed native EGP integer-string money schemas. Validate parsing, overflow of every intermediate calculation and each positive/nonnegative/signed operation input. Reject float, exponent, whitespace, leading zeros and negative zero according to the data specification. Human references are unique digits-only database-issued strings; UUID and Tawsel identities remain separate. Rolled-back numeric sequence gaps are allowed and never reused. Cairo half-open dates and UTC audit instants must preserve DST and entry/effective distinction.

Create typed append-only posting batches and narrowly registered journal families for brand entitlement, company actual money, employee earning/obligation, operating-result facts and storage credit. This is not a chart of accounts or statutory general ledger. Each effect has source system/identity/kind/revision plus explicit supersession, business branch, effective date, recorded UTC time and actor. Uniqueness at the source-effect level prevents duplicates delivered through different request IDs or polling/event channels. Corrections append linked facts; they never mutate committed source amounts invisibly.

Provide one materialized lock row per `(company, brand)` wallet, safely created by P04's brand transaction. It supplies remaining eligible/pending credit lots, unallocated debits, source-specific holds, shipping-cover reservations and immutable allocations. Use `eligible_to_pay = max(0, E-D-H-C)` and preserve `signed_entitlement = E+P-D`; payouts already allocated out of remaining lots are not subtracted again. Allocate oldest eligible effective date then movement ID. Pending goods and storage credit cannot cover a payout or shipping reservation. Handover cover and payout use this same lock, not cached frontend totals.

Expose primitives to reserve/consume/release known shipping cover once under source identity. It is an encumbrance, not earned fee/revenue. With eligible100 and cover50, payout-available50; when the fee consumes cover, remove the cover and post the50 debit atomically, leaving50 rather than0. Allow-negative skips only the commercial handover gate, not outward cash funds checks or payout eligibility. Current fees remain truthful even when incurred unexpectedly; do not reject already-occurring external facts because an earlier cover estimate was insufficient.

Money-account creation and actual receipt/expense screens belong to P09. Supply shared typed append/lock contracts it will consume; do not create an alternate generic financial endpoint. Employee and storage detail schemas extend these types in P08/P18–P20. Keep source journals independently meaningful so reports never treat brand goods or advances as revenue.

## Locking and durable work

Enforce the documented order: command/source identity, business aggregate, stock positions, brand/storage credit locks, employee period/obligations, money accounts, then effects. Sort IDs within a class. Missing aggregate rows require safe upsert/unique identity before locking; locking an empty result is insufficient. Use row locks and constraints by default; serializable mode only for a demonstrated invariant, with bounded same-intent retry of serialization/deadlock errors.

General work records have kind, source identity, state, attempt count, available-at, lease owner/expiry and fencing version. Claim due work with database locking, commit claim before external work and accept completion only from the current lease token. A stale worker cannot overwrite a newer result. Classify retryable/definite/unknown; preserve diagnostic data without secrets. P11 owns actual canonical HTTP/signatures/inbox semantics, using these primitives; a generic job does not imply a valid connector.

## Checkpoints and continuation conditions

1. **Schema extension.** Inspect P02 records, add constraints/indexes/result retention/source links with a migration and backfill compatible with existing identity jobs. Migrate fresh and upgraded fixtures; existing users/audit/jobs remain readable.
2. **Command contract.** Implement digest/result/version handling and authorized recovery endpoint. Test duplicate/same payload, payload mismatch, expired/compacted result and revoked principal against actual API/database. Continue only if no path re-executes a committed identity.
3. **Posting and wallet primitives.** Add typed services and exact formulas. Prove atomic multi-journal failure rollback and source-effect deduplication; test both orderings of competing cover/payout transactions using separate connections and barriers.
4. **Worker fencing.** Pause worker A after lease expiry, let B complete, then resume A. Reject A's stale completion. Interrupt after business commit/before response and recover on process restart. The controlled development command is unavailable in production.
5. **Consumer handoff.** Document exact signatures and add integration tests through a representative application command, not just disconnected helper assertions. Register P03 tests and record evidence/known limits.

## Concrete acceptance and manual trial

Vitest: native money round-trip/bounds, wallet formulas, valid state transitions and typed source classifications. Real PostgreSQL: two commands using the same identity yield one posting; same source with two command IDs yields one economic effect; failure between posting and audit leaves neither; commits remain after restarting the process; old lease token cannot publish completion. Database constraints reject cross-company relation and invalid signed input. Querying another user's command result without current scope fails.

Seed a test brand wallet through a clearly isolated kernel fixture with eligible100, pending250 and no debit. In the documented development inspection tool, reserve50 cover and observe eligible-to-pay50 while pending250 stays separate. Concurrently attempt payout60 and another cover60; neither can consume unavailable credit. Apply the original50 fee, consuming its cover once; available remains50. Retry the same source and show unchanged totals. Disable the API response after commit, restart and recover the result by commandId. The fixture must not masquerade as a recorded real payout and must be unavailable in production.

Completion requires actual committed database evidence. An outer rollback test, sleep-only race or mocked queue cannot prove these claims. Record the barrier/crash positions, both final transactions and journal identities, not merely a success toast.

## Outputs and stop

Deliver shared services/contracts, additive migration, source uniqueness/lock documentation, test support, `docs/verification/P03/README.md` and actual results. Update [P03 record](execution/P03.md), catalog and implementation status. Hand off named primitives to P04/P09/P11/P12/P13/P16/P17 without a second wallet or command journal. Preserve unavailable checks as pending.

Stop after this phase. Do not implement later business screens, modify Tawsel, deploy production, purchase, pay or merge.

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-091`, `ERP-R-096`, `ERP-R-126`, `ERP-R-153`, `ERP-R-154`, `ERP-R-155`, `ERP-R-169`, `ERP-R-177`, `ERP-R-209`.

Decisions: `ERP-D-089`, `ERP-D-094`, `ERP-D-102`, `ERP-D-119`, `ERP-D-144`, `ERP-D-145`, `ERP-D-146`, `ERP-D-160`, `ERP-D-168`, `ERP-D-200`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
