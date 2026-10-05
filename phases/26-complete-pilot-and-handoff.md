# P26 — Complete V1 pilot, coverage audit and operator handoff

**Git workflow (owner instruction, 2026-10-05):** Execute P26 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 26: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Result and limits

Execute this phase only after its prerequisites exist. Demonstrate the complete agreed shipping-company ERP in one isolated pilot environment with consistent identities, stock, money and history across modules. Reconcile every current requirement/decision, screen, selected operation/event and important failure case with actual evidence. Deliver a truthful readiness report and repeatable owner walkthrough. This phase fixes bounded integration defects found by the pilot; it does not silently redefine product scope or turn unresolved contract paths into successful tests.

Model: `gpt-6-astra`, `xhigh`, checked2026-10-03. The work compares many sources and can expose contradictions between individually passing modules. Select manually from [model guidance](MODEL-GUIDANCE.md); report the actual setting used.

Coverage: all current included ERP-R/ERP-D cases, with explicit exclusion/supersession treatment in [traceability](../REQUIREMENTS-TRACEABILITY.md). ERP-R-001/002/003/005/007/008/154/156/165/168/178/207/208/214 and ERP-D-001/002/003/006/145/147/159/169/198/199/205 are cross-domain anchors, not a substitute for the complete matrix. Every selected screen and every selected service operation/event needs owning and final verification evidence.

## Required reading and prerequisite evidence

Read the approved master plan and all domain/data/screen/integration/architecture specifications, the phase catalog, [execution contract](EXECUTION-CONTRACT.md), report catalog, baseline/change log, [contract coverage](../docs/planning/INTEGRATION-CONTRACT-COVERAGE.md) and all P01–P25 execution records. Inspect actual failures/skips and their affected acceptance. A file saying complete is not enough; run the bounded prerequisite checks needed for the pilot and inspect the real services, migrations and version manifest.

Required runtime: independent ERP web/API/worker/database; actual configured test issuer; adopted Tawsel public service/test identity and separate persistence; complete native workflows; report exports; P25 restore evidence. The selected Tawsel contract must include any required accepted reason extension. CHECK-003 must have authoritative evidence or a deliberately unresolved readiness result for that specific redispatch path. Do not alter Tawsel or invent an endpoint inside this phase. Existing ordinary flows can be demonstrated independently, but the complete V1 claim remains conditional on every required path's result.

## Pilot fixture and expected outcomes

Create a versioned isolated `P26` fixture through actual commands or a documented seed procedure, never direct production edits. Use branches A/B/C; scoped users A-only, B-only, multi-branch, a company admin and separate developer support; at least two operational drivers explicitly linked to employee terms. Configure one ready-parcel brand, one company-packed brand and one stored-stock brand, manual tiers and governorate/area rates. Include allow-negative and no-negative brands, payout weekdays and bank/cash accounts with funds. Accounts have traceable opening/funding sources outside operating profit.

Record the fixed business dates, price/source revisions and seed identities so arithmetic can be independently reproduced. Use canonical EGP minor units in assertions and readable EGP in the manual sheet. Keep test time controlled with actual Cairo boundaries and avoid silently modifying host time.

Required connected journeys:

1. Register goods100+150 with shipping50, dispatch through the permitted real interface and record actual delivery/payment300 in Tawsel. ERP initially shows goods250 pending. Confirm full remittance300, then brand payout100: eligible remaining150; shipping revenue50; cash account net increase200 after payout. Replay events and the remittance/payout commands: all totals remain unchanged.
2. Company-packed goods with base50/uplift5: refused reached visit with no payment followed by another eligible visit. Earn55 each visit; attribute each to its historical work branch and actual driver; percentage commission uses50. Unvisited postponement earns no visit fee. Do not add the excluded previously-paid-attempt shipping scenario.
3. Register stored-stock order while two requests compete for its last unit. Only one confirmation reserves it. Complete preparation, actual handover, actual return receipt and condition inspection. Sound quantity becomes reusable only through the proper release/disposition; damaged quantity remains unavailable. A prepared-order claim is not duplicated by branch transfer.
4. Transfer loose stock10 from A to B: receive8 sound/1 damaged/1 unresolved missing. Source and destination availability/custody reconcile; no brand transfer charge or extra commission. In a separate manifest transfer a named whole ready-parcel shipment from A to B; search that shipment reference from C and see its full operational journey, while C cannot mutate its goods without assigned scope. Demonstrate lawful before-handover cancel and actual source-return recovery after handover.
5. Full driver remittance1000 as800 cash+200 InstaPay succeeds once.999 rejects with no receipt. Source evidence changing at confirmation causes a reviewed refresh/hold. A zero-due round does not manufacture cash or block unrelated zero-remittance prepaid work. Later correction after payout preserves the original payment and creates the bounded review.
6. Eligible wallet100 plus known brand-paid shipping cover50 leaves50 available. Race a60 payout against the cover: do not spend the same credit twice. Pending goods cannot provide cover. Consume the fee and release its reservation together, without double subtraction.
7. Confirm a goods400 incident split company200/employee200: brand eligible credit400, employee linked obligation200, net incident cost200 counted once. Create linked replacement with goods due250 and company-funded shipping waiver50: recipient pays250 goods only, net shipping revenue0, normal commission remains. Suspected incident alone posts nothing.
8. Storage310 forJanuary20–February19 earns310 in January and0 in February for that period. Partial100 leaves210 due. In a separate fixture, advance500 before start creates cash/credit500 and revenue0; period start uses310, earns310 and leaves190. Stop retains residual credit. Explicit refund of unallocated credit posts real cash once without reversing unrelated service revenue.
9. Salary6000, entitlement deduction200, advance1000 yields payout4800 and employee cost5800. A separate earnings3000/obligations3500 month yields zero payout and carry500; next month earnings3000 leaves2500 absent other entries. Race duplicate payouts and later term changes; one payout, protected past/paid calculation and retained historical rate/branch.
10. Paid expense with historical date, general funding, treasury full transfer, opening entries and typed correction feed cash and profit correctly. Generic funding/transfers/openings/brand goods do not become income. The approved aggregate profit example remains6200. Every selected report filters/exports/prints the same authorized snapshot and explains any incomplete source.

## Failures that must cross module boundaries

Inject a lost response after local commit, worker death after external acceptance, duplicate/out-of-order event, source revision conflict, signing-key rotation, authentication expiry, receiver restart, compaction/reconciliation and permission change before export download. Use P22's exact public cases. Known gaps hold affected eligibility without freezing unrelated brands. Historical `held` state with zero effective held quantity is not a fabricated stock hold. No receiver acknowledgement is reported as an applied projection.

For at least one stock race and one money race use independent committed PostgreSQL connections and deterministic barriers in both orders. Inspect ledger/custody/source identities after both finish. Crash/restart evidence must name the interruption point and show durable state, not only a mocked timeout. Database ACID never proves the physical movement happened; confirmations and recovery screens must make that distinction clear to staff.

Exercise ordinary access, treasury scope exceptions, company-wide tracking read, shared-wallet payout and support audit separately. A broad tracking grant cannot expose payroll/contact/export permissions implicitly. Direct forged requests, revoked grants and foreign-company IDs must fail even when the corresponding UI button is hidden.

## Ordered checkpoints and completion criteria

1. **Coverage and environment inventory.** Compare every current matrix row to owning phase evidence and actual executable suite. Produce a machine-readable/readable gap list. Verify baseline hashes, migrations, service identities and exact versions. Missing required external artifacts remain named blockers.
2. **Seed and reconciled starting state.** Establish all fixtures with invariant snapshots and expected numeric totals. Validate no seed creates real customer data or an unrecorded opening balance. Continue only with an independently reviewable starting state.
3. **Connected business journeys.** Execute the ten groups above through real UI/API/public Tawsel paths. Record resulting references, quantities, journals and screenshots. Fix bounded defects in their owning module and rerun the affected cases plus necessary dependent regressions; do not replace them with feature flags that erase scope.
4. **Failure and isolation matrix.** Run the cross-boundary races/crashes/permission checks. Compare committed identities and balances with independent expected values. Keep unrun hardware/provider tests explicit.
5. **Operator walkthrough and UI comparison.** Compare every important screen against UI-REV-001 at desktop/mobile widths, including advanced filters, long Arabic content, loading/empty/stale/unknown/denied states and keyboard paths. Complete at least one actual phone trial if a device is available; viewport emulation alone must be labeled accordingly.
6. **Readiness handoff.** Reconcile traceability, all44 named operations (43 scoped service operations, including conditional urgency, plus one operator bootstrap) and27 events, screenshots, reports and P25 operations evidence. Mark individual cases verified only within their evidence scope. A complete V1 statement requires no unmet required acceptance; otherwise state the exact blocked features and supported results.

Every important journey has connected Vitest and appropriate real PostgreSQL/browser/public integration tests; retain the meaningful prior suites instead of rewriting mirrors of implementation. Register P26 end-to-end assertions in the phase runner. Do not claim new tests merely because older suites passed, and do not rerun irrelevant exhaustive checks without a concrete reason.

## Owner manual pack and delivered records

Deliver `docs/verification/P26/PILOT-GUIDE.md` with actual URLs, accounts/roles without passwords, setup commands, numeric references, actions, expected amounts/states and one rejection/recovery per result. Deliver `READINESS.md`, `COVERAGE-RESULTS.md`, actual test outputs/screenshots, baseline/version manifest and remaining-blocker owner/action list. Include a concise operator glossary distinguishing recipient payment, driver remittance, brand payout, storage credit and payroll advance. The owner must reproduce the demonstrated result without reading chat history.

Update [P26 execution](execution/P26.md), every materially affected earlier execution record, catalog, implementation status and traceability evidence links. Do not delete superseded decisions or claim every source reference was read/tested without actual coverage. Keep business/audit history intact and retain the final phase's full detail.

Stop after the pilot report and handoff. No production rollout, automatic next task, purchase, payment, external message, merge or Tawsel code change is authorized by this phase.

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-001`, `ERP-R-004`, `ERP-R-005`, `ERP-R-008`, `ERP-R-016`, `ERP-R-039`, `ERP-R-043`, `ERP-R-044`, `ERP-R-045`, `ERP-R-046`, `ERP-R-052`, `ERP-R-057`, `ERP-R-061`, `ERP-R-082`, `ERP-R-083`, `ERP-R-100`, `ERP-R-101`, `ERP-R-109`, `ERP-R-128`, `ERP-R-154`, `ERP-R-156`, `ERP-R-160`, `ERP-R-165`, `ERP-R-168`, `ERP-R-171`, `ERP-R-178`, `ERP-R-204`, `ERP-R-206`, `ERP-R-207`, `ERP-R-208`, `ERP-R-214`.

Decisions: `ERP-D-001`, `ERP-D-003`, `ERP-D-004`, `ERP-D-005`, `ERP-D-006`, `ERP-D-009`, `ERP-D-010`, `ERP-D-014`, `ERP-D-017`, `ERP-D-029`, `ERP-D-038`, `ERP-D-042`, `ERP-D-043`, `ERP-D-044`, `ERP-D-045`, `ERP-D-050`, `ERP-D-056`, `ERP-D-060`, `ERP-D-061`, `ERP-D-062`, `ERP-D-080`, `ERP-D-081`, `ERP-D-096`, `ERP-D-097`, `ERP-D-104`, `ERP-D-107`, `ERP-D-120`, `ERP-D-145`, `ERP-D-147`, `ERP-D-151`, `ERP-D-156`, `ERP-D-159`, `ERP-D-162`, `ERP-D-169`, `ERP-D-170`, `ERP-D-195`, `ERP-D-197`, `ERP-D-198`, `ERP-D-199`, `ERP-D-205`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
