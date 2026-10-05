# P16 — Full driver remittance from verified received evidence

**Git workflow (owner instruction, 2026-10-05):** Execute P16 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 16: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

Status: standalone implementation prompt under approved PLAN-001, ERP-D-205 / ERP-R-214. Native design approval does not prove a stronger Tawsel finality guarantee. Execute this phase only.

## 1. Goal, result and scope

Deliver UI-REMITTANCE-001: after a documented round end, finance reviews the effective recipient money, its source evidence and any known synchronization gaps, then records the complete actual amount received through Cash/Bank deposit/InstaPay components. The transaction credits company accounts and releases the corresponding pending ordinary goods entitlements exactly once. It never charges the driver for assigned-but-unpaid shipments.

Include the evidence refresh/witness, locked confirmation, source coverage, account receipts, eligibility release, histories and user recovery. P13 owns outcomes/visit facts; P17 owns the complete payout interface; P21 owns authorized settlement resolution; P22 expands integration recovery. This phase must create a real review item when later source facts conflict with posted remittance, not a TODO or automatic cash reversal.

## 2. Model

Recommended **gpt-6-astra / xhigh** because received-evidence completeness, source revisions, account transactions and later corrections interact. Read [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md), checked2026-10-03. The owner manually selects this setting. It does not waive tests or establish availability forever; record the actual model/effort.

## 3. Exact reading and prerequisite checks

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md) Integration and Visits/delivery/company receipt; [ERP-DOMAIN-SPEC.md](../docs/planning/ERP-DOMAIN-SPEC.md) sections8/9.1/9.2/14; [ERP-DATA-AND-TRANSACTIONS.md](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) sections5.1–5.3,7–9; [ERP-SCREEN-SPEC.md](../docs/planning/ERP-SCREEN-SPEC.md) remittance and shared interaction/filter rules; [ERP-TAWSEL-INTEGRATION-PLAN.md](../ERP-TAWSEL-INTEGRATION-PLAN.md) sections5,10–14,16–18; and [INTEGRATION-CONTRACT-COVERAGE.md](../docs/planning/INTEGRATION-CONTRACT-COVERAGE.md).

Use the baseline directory identified in TAWSEL-BASELINE.md. Read the complete applicable monitoring.schema.json block in pinned05:7759–8805, outcomes and corrections definitions, and workday-closure.schema.json through its end. In pinned06 read the monitoring positive/negative family, P17 outcomes, P19 closure and P23/P25 corrections required by the cases. Read the matching source-service HTTP branches from pinned04. Keep schema names and current source locations from the coverage ledger; do not mistake human endpoints for connector permission.

Verify real P03 UnitOfWork/JournalPosting/shared-wallet primitives, P04 brand wallet initialization, P09 AccountFundsService, P11 signed inbox/outbox/authenticated read adapter and P13 effective outcome/arrival/round projections. Inspect execution records and run their focused suites. Consume P13's named RoundEvidenceBasis interface and refresh/lock its basis revision and digest at confirmation. P13 must expose source IDs/revisions, goods/shipping reported amounts, pending goods-credit identities, authoritative round end and scoped gap/conflict status. A money total without these identities is a material missing prerequisite.

Verify service credentials can actually read source-filtered task/workday history in the isolated Tawsel test environment. Fixtures alone cannot close IP-GAP-004. Repair a small missing adapter export within scope; record absent external conformance capability and dependent cases honestly, continuing independent native work.

## 4. Approved rules and acceptance links

Own ERP-R-013/040/055/147/151 and AC-R equivalents; follow ERP-D-008/039/053/138/142/174. Consume ERP-R-002/028/051/064/153/154/155/173/183, IP-AC-12/13/14 and IP-GAP-004.

Expected money is the sum of effective positive recipient payments for this driver/round not already covered. It is not assigned order value, company visit revenue, unpaid fees or brand debt. A null collection report is not an explicit zero report; retain the distinction. A round crossing Cairo midnight remains one round. Workday closure is not financial settlement.

Require exact complete receipt. Components may combine methods/accounts;800 cash plus200 InstaPay is one1000 receipt.999 or1001 against1000 is rejected without any account or eligibility effect. No shortfall acceptance, brand allocation of incomplete cash, employee deduction, personal top-up module or fake full receipt. A zero-money round may be recorded checked with zero movement; it creates no fictitious remittance or goods eligibility.

Before confirmation, refresh the bounded source-filtered round/workday/task evidence. Store a local witness containing task/cycle/attempt identities, effective outcome IDs/revisions, round-end identity, fetched history/snapshot identities/revisions, relevant stream checkpoints, unresolved gaps/conflicts and expected total. It records what was checked, not a Tawsel global finality token. Neither quiet queue, one page nor round.ended proves absence of unseen device work.

Use permitted integration.getExecutionProjection/getTripProjection/getTaskHistory/getWorkdayHistory operations with monitor.read, and P11's canonical adapters. Complete stable pagination; a changed-snapshot409 restarts the relevant read. A304 retains the previous valid body, not an empty result.401/403 stops authorized refresh;404 may conceal out-of-scope data; network/503 keeps dated uncertainty. Never call human sync/outcome/correction APIs using the connector.

Known missing dependencies block only the affected confirmation/eligibility. At native confirmation, lock the witness/basis version, covered sources, relevant wallets and destination accounts. Recheck digest, grants and component sum. Cash entries, coverage uniqueness, pending-to-eligible transitions, audit and command result commit together. Later accepted correction preserves actual receipt and creates one linked review/affected hold. It never automatically refunds, deletes a payout or freezes unrelated companies/brands.

## 5. Data, services, contracts and screen

Add migrations for remittance, immutable remittance_basis/witness, remittance_source, payment_component and links to account movements/brand-credit lots. Unique source coverage prevents the same effective payment from entering different remittances even under different command IDs. Preserve original witness and later review references; do not edit its historical total.

Implement apps/api/src/modules/finance/remittances and its evidence service with P11/P13 interfaces. Network refresh runs outside held financial transactions, then commits a versioned local witness. Source application and confirmation synchronize through the shared round/basis revision boundary so a concurrent effective correction invalidates or safely follows the chosen witness. Document both race orders.

Define packages/contracts/src/finance/remittances schemas for list/detail, prepare/refresh review and confirm. Preparation accepts scoped driver/round; confirmation carries commandId, expected witness revision/digest, actual date and positive components with method/account/amountMinor/optional reference. No caller-supplied arbitrary expected total or free eligibility flag. Use common authorized command recovery.

Build a focused round list and review/detail form under apps/web/src/features/finance/remittances. Show reported total, component sum, missing remainder, readiness and per-source breakdown separately. Label recipient money and company receipt distinctly from brand payout. Preserve entered components if evidence changes, but force a new review before confirmation. Pending refresh, scoped gap, stale version, no connection, unknown submission and committed result are first-class states. Provide driver/branch/round/date filters with clear date meaning.

## 6. Checkpoints

1. Establish upstream identity/read interfaces and schema fixtures. Vitest validates exact sums, null-versus-zero, covered-source exclusion and authoritative effective revisions. Document witness sufficiency limits before implementing a “ready” badge.
2. Implement real public reads and witness persistence. Exercise multiple pages, changed-snapshot409,304, denial, outage and known predecessor gaps. A missing page cannot yield a confirmable witness. Use the exact allowed service identity.
3. Implement atomic confirmation against real PostgreSQL. Fault-inject between account credits, coverage rows, lot release and result/audit. Verify full rollback and unique source coverage. Race same round confirmations and race correction application against confirmation with independent connections.
4. Implement after-posting review/hold creation through the existing native review primitive, preserving actual account movements. Duplicate corrected events create one review, not additional money effects. A permitted correction before confirmation updates the basis and rejects a stale form.
5. Integrate real browser pages and isolated Tawsel journeys. Use a separately authorized test driver/human actor to produce source facts; the connector never impersonates it. Complete the receipt, reload an unknown result and inspect linked goods eligibility. Do not substitute a handcrafted webhook for the actual public acceptance case.
6. Register npm run test:phase -- P16; run meaningful Vitest, real database, public integration and browser checks plus typecheck/lint/build. Record precise conformance limitations under IP-GAP-004 if not demonstrated.

## 7. Required cases

| Case | Expected result |
| --- | --- |
| P16-A01 ten assigned, eight paid | Only the eight effective reports contribute; unpaid visit fees do not become driver cash. |
| P16-A02 expected1000, components800+200 | One complete receipt, exact account credits and mapped goods eligibility release. |
| P16-A03 expected1000, actual999 | No receipt, cash movement, partial eligibility or payroll shortage. |
| P16-A04 known missing outcome/page | Confirmation blocked with affected evidence reason; unrelated round remains usable. |
| P16-A05 duplicate and different-command race | One effective source coverage and one set of funds/eligibility effects. |
| P16-A06 correction before confirm | Old witness rejected; reviewed effective amount replaces the prepared basis. |
| P16-A07 correction after confirm | Actual cash unchanged; one linked review and scoped hold, no automatic refund. |
| P16-A08 zero-money round | Checked state with zero movements, no fictional waiting-for-cash gate. |
| P16-A09 crash after commit before response | Original command recovers across restart with identical source coverage. |

## 8. Manual trial

Use an isolated company with a real test driver and company Cash/Bank accounts initially zero. Through legitimate Tawsel test-driver flows, produce two paid deliveries in one round: goods250+shipping50=300 and goods600+shipping100=700. End the round while retaining any contract-permitted correction window. P13 shows pending goods credits850 and reports1000.

Temporarily withhold a required event/page in the test harness: review must show its gap and refuse confirmation. Recover through the permitted read/replay path. Try999 total and observe no movements. Record800 Cash and200 InstaPay into Bank with optional reference blank. Expect accounts800/200, remittance1000 and goods850 newly eligible, never1000 brand credit. Reload/retry the command and confirm no duplication.

In a separate valid correction fixture, deliver a permitted later correction after receipt. Show the immutable original remittance, one review item and affected hold; other brand money remains usable. If the current source lifecycle rejects that producer correction, preserve its rejection and use a genuinely supported sequence rather than bypassing Tawsel. Capture witness source revisions, actual API results, browser states and committed journal queries.

## 9. Handoff and stop

Deliver source witness service, contracts, migrations, confirmation and review hooks, real screen, tests and docs/verification/P16. Document the immutable receipt/eligibility API consumed by P17 and review records consumed by P21/P22. Update phases/execution/P16.md, catalog and IMPLEMENTATION-STATUS.md with actual commands, tested source baseline, failures, skipped external cases and actual model.

Completion requires the native invariant evidence and demonstrated public witness behavior for the selected supported path; record any remaining external condition instead of claiming global financial finality. Execute P16 only, then stop. Do not implement payout/settlement phases next, change Tawsel contracts, transfer real money, deploy, purchase, publish or merge.



## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-012`, `ERP-R-013`, `ERP-R-039`, `ERP-R-040`, `ERP-R-051`, `ERP-R-055`, `ERP-R-057`, `ERP-R-064`, `ERP-R-147`, `ERP-R-151`, `ERP-R-153`, `ERP-R-183`, `ERP-R-208`.

Decisions: `ERP-D-008`, `ERP-D-023`, `ERP-D-026`, `ERP-D-034`, `ERP-D-038`, `ERP-D-039`, `ERP-D-049`, `ERP-D-053`, `ERP-D-054`, `ERP-D-056`, `ERP-D-064`, `ERP-D-075`, `ERP-D-138`, `ERP-D-142`, `ERP-D-144`, `ERP-D-161`, `ERP-D-174`, `ERP-D-199`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
