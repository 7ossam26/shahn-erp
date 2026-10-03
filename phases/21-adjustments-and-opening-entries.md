# P21 — Typed settlements, corrections and optional opening entries

Status: standalone implementation prompt under approved PLAN-001, ERP-D-205 / ERP-R-214. Implement the approved adjustment mechanics, not an unrestricted record editor. External Tawsel capability remains bounded by the adopted contract.

## 1. Goal and complete result

Deliver the daily Settlements operating page and optional opening-entry page. Staff can identify an actual discrepancy, inspect original evidence and dependent records, preview lawful typed effects, then commit a reasoned correction with permanent links. Money, inventory and payroll remain reconcilable after human mistakes, late source facts and duplicate submissions.

Own UI-ADJUSTMENT-001 and UI-OPENING-001. Integrate existing stock, parcel, treasury, remittance, wallet, incidents, storage and payroll services. Do not rebuild their normal workflows, add formal inventory counts, edit departed Tawsel outcomes, reopen paid payroll or restore excluded partial remittance/treasury receipt. A selected target is not authority to rewrite its balances directly.

## 2. Model

Recommended **gpt-6-astra / xhigh** for corrections crossing multiple ledgers, custody and locked periods. [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md) records the2026-10-03 availability and official guidance. The owner chooses the actual setting in Codex. Record it; no model choice substitutes for real database evidence.

## 3. Read and verify before edits

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md); [master-plan.md](../master-plan.md) Incidents and legitimate correction, Data and transactions and Verification; [ERP-DOMAIN-SPEC.md](../docs/planning/ERP-DOMAIN-SPEC.md) sections7/9/10/11/12/13.4/14/15/17; [ERP-DATA-AND-TRANSACTIONS.md](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) sections4.2/5/6/7–9 and concurrency acceptance; [ERP-SCREEN-SPEC.md](../docs/planning/ERP-SCREEN-SPEC.md) opening setup, Settlements, financial forms and interactions; [ERP-TAWSEL-INTEGRATION-PLAN.md](../ERP-TAWSEL-INTEGRATION-PLAN.md) sections8/12–16/18; and the relevant AC cases in REQUIREMENTS-TRACEABILITY.md.

Inspect P03–P20 actual services and execution records. Required consumers are P05 inventory/reservations, P06/P07 shipment/custody, P08/P20 employee periods/obligations, P09/P10 account/transfer journals, P11–P14 effective source/correction/return state, P15 physical transfers, P16 remittance evidence/coverage, P17 wallet allocations, P18 incidents and P19 storage credit/refunds. Run their relevant targeted suites and migration status. Verify each supplies transaction-taking application services and current version/source identities; never update another module through ad hoc SQL.

If one target subsystem is materially absent, record the precise unavailable target/cases and implement independent targets without presenting the missing one as working. Do not accept an untyped fallback adjustment to compensate for a missing subsystem. Small adapter/registration repairs are allowed and recorded.

## 4. Rules and coverage

Own ERP-R-115/125/126/129/133/134/141/142/183 and AC equivalents. Decisions: ERP-D-109/118/119/121/124/125/132/133/174/202/204. Consume ERP-R-085/090/103/105/106/123/128/139/154/170/175/177/190/195/209/211/212/213.

Use a target-first catalog with these bounded operations:

| Target | Lawful result | Required protection |
| --- | --- | --- |
| Brand | Linked reversal/correction of a typed movement, or independently agreed commercial adjustment with source/reason | Preserve original payout allocations and eligibility basis; no fabricated cash, remittance or refund |
| Employee | Current-unpaid/future typed addition/deduction or correction, linked obligation/carry | Past/paid calculations stay immutable; entitlement deductions, advance recovery and incident recovery keep different cost meanings |
| Account | Observed book/actual difference, followed by a linked missed movement, company loss or explicit liability | No automatic profit/penalty; actual funds and uncertainty remain visible |
| Product | Observed quantity against a validated version, calculated delta and condition | Preserve physical truth, reservations and targeted shortage holds; no silent stock receipt or release |
| Parcel | Specific loss/damage/missed actual receipt/duplicate or incorrect record case | Delegate to legitimate incident/receipt/correction service; no deletion or physical teleportation |
| Source difference | Old/effective Tawsel facts, dependent posted money and allowed linked resolution | No connector impersonation, automatic refund, paid-history rewrite or global financial freeze |
| Opening | Dated existing account/brand/employee/stock balance with batch/source and explicit meaning | No operating earning, duplicate opening, mandatory setup or Excel intake engine |

Every correction needs original/reference where applicable, reason, current version, actual/effective and recorded dates, actor and typed effects. Show historical and new records together. Reversing accounting evidence does not assert physical cash or goods returned. A past-dated paid expense may alter its reporting month, but it cannot unlock payroll.

For stock recorded12/actual10, show delta-2. When actual sound5 is below reserved7, retain shortage2 and hold all unhanded reservations involving that affected variant until replenishment or explicit revision/cancellation resolves it. Do not assign loss arbitrarily to one order or freeze unrelated variants. A stale observed count cannot overwrite later legitimate movements.

For account book1000/observed900, retain observation and create unexplained-shortage hold100; available is900 until resolution. A positive observation does not create spendable funds by itself. A subsequent actual transaction changes the rolling comparison; do not overwrite its history with the old observed total. Resolution replaces the hold with its typed posting, never both deductions. This cannot accept short driver remittance or partial transfer receipt.

Opening is optional. A zero-start company skips it. Use separate target forms and one reviewed atomic batch. Brand opening distinguishes already eligible liability from unresolved driver-held proceeds; never default an unknown total to eligible. Employee opening distinguishes obligation from entitlement; stock opening names branch/brand/variant/condition. Retain duplicate batch/target guards and links for later correction.

Storage credit stays separate from the brand wallet. Ordinary refund is only against unallocated storage credit, with actual cash-out assertion, funds/credit lock, reason and source allocation. Already allocated payment requires the justified linked charge/allocation correction first. Stop alone is neither refund nor revenue reversal. Consume P19's service instead of a second refund implementation.

## 5. Implementation and source interfaces

Add adjustment_case, typed adjustment_resolution, effect preview/version digest, source/dependent links, observation records and opening_batch/lines migrations under packages/database/migrations, extending P03 journals. Every money/stock effect retains posting_batch_id and source uniqueness. Preserve completed source records; no destructive migration or backfill that silently declares old unknown values settled.

Implement apps/api/src/modules/settlements with a typed resolver registry. Each resolver declares required screen/resource scope, source evidence, allowed states, preview formula, locks, posting services and forbidden transitions. Register resolvers explicitly; do not execute arbitrary table/column/type names from the client. A preview token binds target versions/effects. Confirm reauthorizes and recalculates within one UnitOfWork. Record conflicts instead of applying a stale preview.

Write packages/contracts/src/settlements closed schemas for case list/detail, prepare, confirm and opening entry. Discriminated target/operation payloads exclude unrelated fields. Every confirmation carries commandId, expected target versions and the prepared effect digest; persist its canonical payload identity and result. Unknown command results use shared command recovery. Typed accounting classification must preserve a corrected source's class; independent unclassified adjustments remain visibly outside operating profit until justified classification, as the approved plan states. Do not infer income from a positive amount.

Integrate the P13/P16/P17 review-item schema and affected holds; resolving it appends history and releases only the resolved hold when its dependencies are safe. P22 will add wider recovery screens but must consume the same cases. Build apps/web/src/features/settlements with target selection, focused operation form, before/after preview, dependent-record warnings and one confirmation. Add optional UI-OPENING-001 separately, not as a mandatory onboarding step.

## 6. Checkpoints with validation

1. Inventory actual target APIs and implement a resolver authority/state/effect matrix. Vitest each typed preview and every prohibited transition. Record any remaining external CHECK-003 dependency rather than inventing branch revision support.
2. Migrate case/opening/observation records, implement stable preview/result identities and source links. Test duplicate opening and resolution under different command IDs, not only HTTP retries.
3. Implement stock and account observations. Race actual movement versus observation confirmation; stale preview fails. Test actual5/reserved7, targeted holds, replenishment release, book1000/actual900 and legitimate resolution replacing the hold.
4. Integrate brand/payroll/incidents/storage/source-difference resolution through existing services. Fault-inject after each related effect before commit; no partial cash/wallet/stock/audit result survives. Race storage refund against period allocation and wallet correction against payout.
5. Build the two real browser surfaces and exercise normal, denied, stale, blocked, unknown-result and already-resolved states at desktop/mobile sizes. Keep reasons mandatory for adjustments but do not impose them on unrelated routine actions.
6. Register npm run test:phase -- P21. Run connected Vitest, independent-connection PostgreSQL races/restart, relevant real public-contract cases and browser tests plus lint/typecheck/build. Separate native coverage from an unavailable external source sequence.

## 7. Acceptance and manual verification

Core automated cases: P21-A01 quantity12→10 posts one delta-2; A02 actual5/reserved7 keeps shortage2 and targeted holds; A03 cash1000/actual900 hold100 then missed-expense100 resolution leaves book900/hold0, not800; A04 paid payroll edit rejected; A05 source correction after payout retains the payout and creates/resolves one linked review; A06 duplicate opening/resolution posts once; A07 storage credit190 refund100 leaves90 and debits account100 without changing earned revenue; A08 missing/out-of-scope source or unsupported Tawsel mutation rejects atomically.

For the owner trial, seed an isolated P21 company through existing helpers. Receive product12, reserve7, then observe actual5. Preview delta-7 and shortage2; confirm and verify all affected unhanded reservations are held, while another variant still dispatches. Add a legitimate receipt2: shortage clears without deleting the observation.

Fund cash1000, observe900 and inspect book/actual/hold/available. Resolve a genuinely missed paid expense100 through the typed expense path; expect book900, hold0 and one cost100. Repeat the same resolution and confirm no second debit. Try editing a paid payroll period: no bypass is offered.

Create an opening batch in a separate clean test company: Cash500, eligible brand liability200, employee obligation100 and stock3. Confirm twice using the same identity; each opening exists once, no operating-profit fact is created. An unresolved brand amount entered separately remains pending, not payout-ready. Inspect source links and mobile before/after previews. Record exact fixture IDs, actions and expected rows.

## 8. Completion, deliverables and stop

Deliver contracts, migrations, typed resolvers, observation/hold logic, opening forms, actual pages, tests and docs/verification/P21. Document each supported target and any blocked contract-dependent transition. Update phases/execution/P21.md, catalog and IMPLEMENTATION-STATUS.md with actual commands, model, source baseline, failures/reruns and limitations. P23/P24 receive immutable classifications and source links; P22 receives the same recoverable case/hold interface.

Do not mark a target complete through a free-form edit fallback. Complete P21's selected lawful results and stop. Do not start recovery/report phases, modify Tawsel, send real payments, run production cleanup, deploy, purchase, publish or merge automatically.



## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-054`, `ERP-R-085`, `ERP-R-095`, `ERP-R-115`, `ERP-R-123`, `ERP-R-125`, `ERP-R-126`, `ERP-R-128`, `ERP-R-129`, `ERP-R-133`, `ERP-R-134`, `ERP-R-141`, `ERP-R-142`, `ERP-R-158`, `ERP-R-159`, `ERP-R-183`, `ERP-R-208`.

Decisions: `ERP-D-052`, `ERP-D-083`, `ERP-D-093`, `ERP-D-107`, `ERP-D-109`, `ERP-D-117`, `ERP-D-118`, `ERP-D-119`, `ERP-D-120`, `ERP-D-121`, `ERP-D-124`, `ERP-D-125`, `ERP-D-132`, `ERP-D-133`, `ERP-D-149`, `ERP-D-150`, `ERP-D-174`, `ERP-D-191`, `ERP-D-199`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
