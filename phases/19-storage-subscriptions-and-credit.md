# P19 — Storage subscriptions, partial payments and advance credit

**Git workflow (owner instruction, 2026-10-05):** Execute P19 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 19: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Execute this phase only

Deliver one brand storage agreement with anniversary periods, automatic durable renewal, visible arrears, manual partial/advance receipts and explicit refund of unallocated storage credit. The complete fixed period fee is earned when that period starts. Cash receipt, credit allocation and earned revenue are separate facts. Staff must be able to explain every pound from agreement through receipt/allocation/refund without touching the brand payout wallet.

Authority: PLAN-001 approved by ERP-D-205 / ERP-R-214, including P-DOM-05's exact allocation/refund mechanics. These mechanics were plan proposals before approval; do not falsely attribute all of them to the narrower discovery answer ERP-D-204. Recommended model: **gpt-6-astra, xhigh** for calendar recurrence, credit races and financial classification. Availability was checked 2026-10-03 in [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md); the owner selects the setting manually.

## Required reading and traceability

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md), current workspace instructions and prerequisites' evidence. Read [Domain specification](../docs/planning/ERP-DOMAIN-SPEC.md) section 12, report formula, DOM-15, DOM-21, DOM-22 and P-DOM-02/P-DOM-05. Read [Data specification](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) storage aggregates, section 6.2, all three storage transaction rows, idempotency/locking and migration/reporting integrity. Read [Screen specification](../docs/planning/ERP-SCREEN-SPEC.md) UI-STORAGE-001, brand agreement setup and session024 financial forms. Read [Report catalog](../ERP-REPORT-CATALOG.md) storage/cash/profit meanings so this module supplies the exact future report facts. Use the [UI brief](../UI-DESIGN-BRIEF.md) and [review](../UI-REVIEW-LOG.md) for actual layout.

Requirements: ERP-R-050, ERP-R-073, ERP-R-074, ERP-R-092, ERP-R-148, ERP-R-149, ERP-R-150, ERP-R-181, ERP-R-201, ERP-R-210, ERP-R-213. Governing decisions: ERP-D-048, ERP-D-067, ERP-D-073, ERP-D-090, ERP-D-122, ERP-D-139, ERP-D-140, ERP-D-141, ERP-D-172, ERP-D-192, ERP-D-201, ERP-D-204. ERP-D-201 expressly rejects daily revenue allocation; ERP-D-204 expressly rejects a full-period-only payment restriction. Do not revive either earlier proposal.

## Observable prerequisites

P04 provides an actual company-level brand and configured storage agreement data/reference, without duplicate subscriptions per stock branch. P03 supplies durable worker jobs/leases, command identity, typed revenue/credit journals, exact Money and shared transactions. P09 supplies permitted branch cash/company bank accounts, checked actual-money credit/debit services and funds holds. P02 provides storage/brand/account authority; P01 provides actual Arabic RTL screens and test runners. Inspect migrations and current interfaces before extending them.

Run `db:status`, the actual-money atomic posting test, a worker claim/restart test and a scoped brand/account query. Confirm a storage receipt service can join the caller's transaction instead of posting cash in a separate commit. Seed only isolated test accounts with known funds through the existing safe harness. Missing account authority, durable jobs or transaction ownership is material; do not substitute browser totals or an in-memory cron timer and claim correct billing. A small missing exported service is repairable within scope with recorded verification.

## Agreement and date rules

One company brand has one storage subscription agreement with fixed negotiated EGP fee, original local start date/anniversary day, responsible revenue branch, active state and prospective changes. Stock may be held at several branches; that does not multiply subscriptions. Renewal continues even with zero stock and overdue charges until explicit stop. Arrears do not automatically block shipping or debit the brand payout wallet.

Persist periods as Cairo local half-open dates `[periodStart, nextPeriodStart)`. A January 20 start covers January 20 through February 19. Compute boundaries from the original start and period index, preserving original anchor day: January 31 → February 28/29 → March 31. Do not repeatedly add a month to February's clamped day. Test leap years and relevant Cairo calendar boundaries; do not hardcode a fixed UTC offset.

A new period is generated only when its start date has arrived. Creating a future agreement or receiving advance money does not earn that future period. At period start, snapshot the full fee and agreement branch, make the charge due, and post exactly one complete earned-fee fact effective on the start date. Fee 310 for January 20–February 19 means January revenue 310 and February revenue zero from that period, independently of cash. There are no daily accrual rows, daily proration or receipt-date revenue substitutes.

Price changes apply from the next subscription period, preserving previous snapshots. Agreement revenue-branch changes likewise take effect prospectively at the next period under the approved plan. Stop records the current protected period's exclusive end and prevents generation of any next period beginning at or after that boundary. It does not erase due periods, unallocated credit or payment history. It does not automatically refund or prorate the current period. A future agreement stopped before its first period creates no earned charge; keep the stopped configuration and any credit for truthful refund handling.

The renewal worker must recover missed boundaries after downtime one period at a time. Each period's charge, complete earning, credit allocation and audit commit atomically. A crash after one catch-up period must not roll it back logically or skip later periods on restart. Unique company/agreement/period-start identity prevents duplicate renewal from two workers. Record job lease/fencing and source identity; an expired worker cannot overwrite a newer completion.

## Storage credit, payments, allocations and refunds

Create a dedicated `(company, brand)` storage-credit account/subledger. It is separate from brand goods entitlement, eligible payout, shipping cover and employee/company actual-money journals. Display charge, paid allocation, remaining due and unallocated credit separately. Money uses the standard EGP integer-string API and bigint arithmetic; no floating-point balance calculation.

An actual manually recorded storage payment requires brand, positive amount, actual date, Cash/Bank deposit/InstaPay method, permitted receiving account and optional reference. Staff confirm receipt actually occurred; no provider verification or proof image is invented. Post one company account credit and one equal storage-credit receipt. Then allocate existing available credit to unpaid periods in ascending due date and period ID, capped by remaining charge. Show that deterministic allocation in preview. Partial payments are valid; surplus stays unallocated advance credit. A repeated transport request does not add a second receipt.

When a period begins, post its complete charge/earning once and apply existing credit using the same oldest-due rule. Allocation is neither another cash receipt nor another earning. Persist source receipt-to-period amounts so outstanding credit can be traced; consume unallocated receipt lots in their effective receipt date/ID order for deterministic evidence, without changing the approved oldest-due period rule. Preserve recorded time separately from actual receipt date. A later backdated receipt is entered once now and allocated against the locked current outstanding periods; it does not rewrite historical allocations or pretend the cash arrived through a past database transaction.

```text
periodOutstanding = periodFee + linkedChargeAdjustments - netPaymentAllocations
unallocatedCredit = actualStorageReceipts + linkedCreditCorrections
                    - netPeriodAllocations - actualCreditRefunds
```

Neither allocations nor refunds may make unallocated credit negative. Period allocations cannot exceed its corrected outstanding charge. Example A: fee 310 starts January 20; actual partial receipt 100 leaves due 210 and January revenue 310. Example B: receive advance 500 before any period starts; cash +500, credit 500, revenue 0. First period starts for 310; revenue +310, allocate 310, remaining credit 190, cash unchanged at this step. Neither example creates brand payout eligibility.

Refund is a separate focused action against **unallocated** credit. Require amount, funding account, actual payment date/method, reason, source-credit allocation and explicit actual cash-out confirmation. Under one transaction recheck credit, funds, scope and revisions, then post storage-credit debit/refund and actual account debit. The account may be another permitted funded account; preserve both original receipts and actual refund account. Refund creates no automatic service-revenue reversal and no wallet payout. Stopping is not a refund. Money already allocated to an earned period requires an independently justified linked charge/deallocation correction through P21 before ordinary refund; do not provide an unallocate button that bypasses this policy.

Serialize renewal, payment, stop/rate change and refund through the agreement/credit aggregate locks in the documented order. All paths first lock the relevant agreement identity, then dedicated storage-credit account and period/receipt allocations in a consistent order, then money accounts. Preview captures agreement/credit versions; stale user confirmation explains changed allocation and asks for a new review. Worker renewal uses its stable period source identity rather than a browser version. Do not make an outbound HTTP call inside the transaction.

## Exact implementation targets

- `packages/database/migrations/0019_p19_storage.sql`: extend/reuse `storage_agreement`, dated rate/branch revisions, `storage_period`, dedicated credit account/movements, receipt lots, allocation and refund relationships. Add one-active-agreement/brand protection, unique period start, valid interval/nonnegative amount checks, same-company FKs and source-effect uniqueness. No seed/backfill may mark existing configurations paid or earn future periods. Record an explicit safe migration policy for any P04 agreement data: configuration carries over; actual historical periods/receipts require existing evidence or the later opening/adjustment flow.
- `packages/domain/src/storage/`: original-anchor boundary generation, fee/credit formulas, stop rules and deterministic allocation planning using exact integer money.
- `packages/database/src/storage/`: transaction-aware agreement/period/credit repositories and sorted lock acquisition. SQL checks prevent over-allocation and duplicate period effects even when two processes race.
- `packages/contracts/src/storage/`: schemas/examples for `GET /api/v1/storage/agreements`, agreement detail/update, `POST /api/v1/storage/agreements/{id}/stop`, `POST /api/v1/storage/payments/preview`, `POST /api/v1/storage/payments`, `POST /api/v1/storage/credit-refunds/preview`, `POST /api/v1/storage/credit-refunds`. All consequential mutations use native command identity/current revision. Do not expose an unrestricted public generate-arbitrary-period endpoint.
- `apps/api/src/modules/storage/`: command/read services joining P03/P09 interfaces; explicit business dates, account authority, classification and audit. Keep native payment result recovery separate from canonical Tawsel; storage makes no Tawsel money command.
- `apps/worker/src/jobs/storage-renewal.ts`: durable scheduled due-agreement discovery, one-period commands, catch-up and retry/fencing with observable queue age/error. Use the existing PostgreSQL lane, not Redis or a second scheduler.
- `apps/web/src/features/storage/`: `/storage` and focused agreement/detail/payment/refund pages. Reuse brand setup for terms, showing future effect instead of silently updating old periods. Main action is Record payment; refunds/stops live in clear secondary flows, not a row of risky adjacent buttons.

Each period row shows inclusive display range, due date, snapshotted fee, allocation and remainder. Show unapplied credit in a separate panel and overdue status without inventing full payment. Filters are brand, assigned agreement/revenue branch, active/stopped, unpaid/partial/paid, due period and actual-payment date with explicit basis. Account receipt branch never silently filters earned revenue branch. Preserve filters on detail/back and show unavailable/loading/unknown results honestly. A payment timeout retains its command identity and resolves the committed receipt before allowing a deliberate new receipt.

## Ordered checkpoints

1. **Calendar and accounting examples.** Implement connected Vitest for original anchor, leap years, stop, price revisions and the 310/100/500 examples. Prove future cash produces credit without future earned fees before enabling renewal.
2. **Schema and atomic credit.** Apply migration on fresh and prior-phase databases. Test partial receipt, allocation and refund against real committed journals. Inject failure after account movement but before credit allocation; every dependent effect must roll back.
3. **Worker recovery/races.** Run two real worker/database connections against the same due agreement. Kill after period commit before job acknowledgement; restart and show one charge/earning/allocation. Race renewal versus refund/payment and assert no negative credit or duplicated cash in either lock order.
4. **Complete UI.** Implement actual forms, prospective terms, arrears and refund preview. Run desktop/mobile browser journeys, stale preview, denied account and lost-response recovery; capture clear charge/cash/credit distinctions.
5. **Report/handoff reconciliation.** Reconcile period revenue, receipt cash, credit and allocations from immutable rows. Expose the typed facts for P24 profit and P21 correction; register P19 suites and run focused checks/typecheck/lint/build.

## Acceptance matrix

| ID | Given / When | Then and verification |
| --- | --- | --- |
| P19-AC-01 | Anchor January 31 with worker runs through March. | February clamps and March restores 31; unique nonoverlapping periods, no daily allocation. DOM-15, Vitest/DB. |
| P19-AC-02 | January 20–February 19 fee 310, partial receipt 100. | January revenue 310, February 0, cash 100, outstanding 210. DOM-21, DB/browser. |
| P19-AC-03 | Advance 500 before service start, then first fee 310. | Before: credit 500/revenue 0. After: allocation 310/credit 190/revenue 310 with no new cash. DOM-22. |
| P19-AC-04 | Two unpaid periods and a receipt too small to pay both. | Oldest due first, exact source allocations, visible remaining due; no wallet offset. |
| P19-AC-05 | Stop with due periods and unallocated credit, then worker retries. | No next renewal; arrears/credit/history persist, no automatic refund or revenue reversal. |
| P19-AC-06 | Refund races renewal for the same available credit. | One serialized valid allocation/refund result; no overspend, partial journals or negative credit. Independent DB connections. |
| P19-AC-07 | Duplicate receipt after dropped response and duplicate renewal after worker restart. | Original receipt recovered, one account credit; one period/charge/earning. |
| P19-AC-08 | Attempt refund of allocated money, beyond credit/funds, stale preview or forbidden account. | Whole refund rejected and original credit/cash/history unchanged. |
| P19-AC-09 | Agreement branch A, actual receipt account/branch B. | Revenue remains A and actual cash remains B; no duplicate subscription for stock at B. |

Use `npm run test:phase -- P19` with meaningful connected Vitest, real PostgreSQL commit/restart/race tests and actual browser interaction. Zero matching tests is failure. Record any skipped worker or browser evidence; do not replace it with a screenshot of fixtures.

## Manual trial, deliverables and stop

In isolated test data with controlled clock, create a January 20 agreement at 310 and branch A. Generate its due period, receive 100 into a permitted B account and inspect period due 210/revenue 310/cash 100. For a second future-start brand receive advance 500, confirm no earned revenue, advance the test clock to its start and inspect allocation 310/remainder 190 without new cash. Stop after the current period; verify credit survives. Refund 50 of unallocated credit through actual test account confirmation, then retry its dropped response and verify one cash outflow. Attempt a refund of allocated funds and inspect rejection. Run the January 31 boundary sample and worker restart with recorded IDs.

Deliver source, migrations, schemas, worker, tests and `docs/verification/P19/`; update `phases/execution/P19.md`, status and traceability with actual commands, source versions, skipped checks and precise P21/P24 interfaces. **Stop after P19 and its truthful handoff. Do not start P20, alter Tawsel, move real money, deploy, publish, purchase or merge automatically.**

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-050`, `ERP-R-073`, `ERP-R-074`, `ERP-R-092`, `ERP-R-123`, `ERP-R-130`, `ERP-R-148`, `ERP-R-149`, `ERP-R-150`, `ERP-R-152`, `ERP-R-181`, `ERP-R-201`, `ERP-R-208`, `ERP-R-210`, `ERP-R-213`.

Decisions: `ERP-D-048`, `ERP-D-067`, `ERP-D-073`, `ERP-D-090`, `ERP-D-117`, `ERP-D-122`, `ERP-D-139`, `ERP-D-140`, `ERP-D-141`, `ERP-D-143`, `ERP-D-172`, `ERP-D-190`, `ERP-D-192`, `ERP-D-199`, `ERP-D-201`, `ERP-D-202`, `ERP-D-204`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
