# P18 — Loss/damage incidents, compensation and replacement shipping

## Execute this phase only

Deliver a complete incident journey: report affected goods, review actual custody and value, explicitly confirm company/employee responsibility, post one eligible brand compensation credit and any linked employee obligation, then create an ordinary replacement shipment when needed. Support the approved company-funded replacement shipping waiver without erasing genuine goods due or driver commission. Keep original financial/custody records and correction links visible.

Authority is approved PLAN-001, ERP-D-205 / ERP-R-214. Recommended model: **gpt-6-astra, xhigh**, because this phase joins custody, brand eligibility, employee obligations, historical profit attribution and canonical source money. Availability was checked 2026-10-03 in [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md). The owner selects the setting manually; retain every acceptance check if using a supported alternative.

## Required sources and identifiers

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md), current instructions and direct dependency evidence. Read [Domain specification](../docs/planning/ERP-DOMAIN-SPEC.md) sections 7–11, 14–17, particularly DOM-12, DOM-19, DOM-24 and P-DOM-04/P-DOM-07. Read [Data specification](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) incident aggregates, typed journal/eligibility definitions, payroll obligation model, Confirm incident boundary and correction/locking sections. PLAN-001 approval adopts the proposed deterministic incident-branch attribution; do not present it as an earlier discovery answer.

Read [Screen specification](../docs/planning/ERP-SCREEN-SPEC.md) UI-INCIDENT-001, incident-linked replacement form, shipment detail, financial form states and scope. Read [Integration plan](../ERP-TAWSEL-INTEGRATION-PLAN.md), incident/disposition and company-funded replacement mapping, IP-AC-22 and relevant failure paths; [contract coverage](../docs/planning/INTEGRATION-CONTRACT-COVERAGE.md); [baseline](../TAWSEL-BASELINE.md). Open the pinned exact SourceSnapshot/Money and permitted return-disposition schema/accepted/rejected examples before implementing their adapters. No guessed endpoint or invented canonical field is allowed.

Requirements: ERP-R-097, ERP-R-098, ERP-R-102, ERP-R-103, ERP-R-104, ERP-R-105, ERP-R-107, ERP-R-108, ERP-R-109, ERP-R-110, ERP-R-116, ERP-R-126, ERP-R-140, ERP-R-177, ERP-R-211, ERP-R-212. Governing decisions: ERP-D-095, ERP-D-098, ERP-D-099, ERP-D-100, ERP-D-101, ERP-D-102, ERP-D-103, ERP-D-104, ERP-D-105, ERP-D-110, ERP-D-119, ERP-D-131, ERP-D-168, ERP-D-194, ERP-D-202, ERP-D-203. D203 is the explicit waiver exception to D194's full per-visit tariff, not permission to waive every ordinary delivery.

## Observable prerequisites and boundary

P03 must provide atomic commands, typed journal batches, wallet locking/eligible credit lots, audit and persistent result recovery. P05–P07 provide truthful stock/parcel custody and normal new-shipment entry. P08 provides employee associations, period guard and terms. P09 provides company accounts/actual-money primitives; this phase's compensation confirmation itself is **not cash payment**. P11–P14 provide real public integration, effective visit/fee/commission facts and documented return/disposition action recovery. P15 supplies transfer discrepancy/custody facts where the incident came from an internal trip. P17 supplies actual brand payout, separately from compensation eligibility.

Inspect their execution records and verify a real shipment/custody query, wallet posting rollback, historical employee resolver and actual permitted disposition evidence. Read current external baseline status. A material missing disposition contract or zero-shipping acceptance test blocks that specific connected outcome, not native incident reporting/confirmation. Continue independent work, record exact owner/dependency and affected acceptance IDs, and do not certify end-to-end integration from JSON fixtures. Never modify Tawsel as a side effect of P18.

## Exact incident rules

A report identifies brand, affected shipment or stock variant/subset, known holder/location, condition/cause, quantities, actual observation time and evidence/comments. It can hold unsafe affected material immediately, but creates no compensation, employee deduction, account receipt/payment or profit fact. The reported quantity cannot exceed currently unresolved affected goods and cannot be compensated again through a second incident. Use source allocations per shipment line/stock movement/transfer discrepancy; locking only one incident row is insufficient to prevent two different incident IDs claiming the same unit.

Confirmation is a separate explicit command on UI-INCIDENT-001. It shows affected goods value, compensation amount, responsible branch, company/employee shares, target employee/allowed payroll period where relevant and resulting wallet/obligation effects. The screen grant permits reporting and confirmation without a mandatory second person or hardcoded manager title; scope and state still apply. Dismissal requires a reason and creates no money.

Compensate **affected goods value only**. Goods worth 400 plus shipping 50 means compensation 400. Partial damage compensates only the affected subset. Do not infer compensation from recipient outstanding: fully prepaid goods may have recipient due zero and still need agreed compensation 400. If the amount is not already reliable, staff enter the agreed amount at confirmation. Do not add a compulsory intake valuation field or complicated prepaid-loss submodule. Validate nonnegative shares that sum exactly to confirmed positive compensation; a zero-value report can be dismissed/recorded without fabricating a positive claim.

Warehouse loss is company responsibility. Driver-held damage may be fully employee-funded or split by the agreement. A confirmed compensation of 400/company 200/employee 200 atomically creates eligible brand credit 400, employee incident obligation 200 and operating-result facts: compensation cost 400 plus employee compensation share 200, both attributed to the confirmed responsible incident branch. The brand does not wait for payroll recovery. A subsequent recovery of that 200 neither reduces salary earning cost again nor adds a second profit gain. No money account changes at compensation confirmation.

Default responsible incident branch from the last accountable custody/dispatch branch. Staff may explicitly correct it to an authorized branch with a reason before confirmation. Preserve that snapshot separately from the employee's payroll branch and the future brand payout's paying branch. This is the approved P-DOM-07 plan allocation; do not relocate old incident profit when an employee or account moves branches.

Employee liability is an ordinary linked obligation in an allowed current unpaid or future payroll period. If the proposed period is protected, show the allowed choice; do not credit the brand while silently dropping the employee share or reopening past payroll. Confirmation commits all local liability effects or none. P20 will recover the original obligation with carry; P18 must provide the typed original identity, amount, effective/recorded dates, incident link and classification it needs. There is no inferred separate cash repayment.

Incident confirmation does not manufacture actual return receipt. For ERP-only lost/damaged custody, record the legitimate affected disposition/condition under the existing conservation service. For driver-held Tawsel returns, use only the exact documented return-request/revision and permitted disposition command supplied by P14. Queue it durably with the stable canonical action identity; pending/unknown remote status stays visible and does not create available stock. Report/financial confirmation and accepted physical disposition remain distinguishable. No blanket clearing of all driver returns is permitted.

Confirmed entries are immutable. Corrections preserve original confirmation, credit, obligation and source allocations and use linked reversing/correcting effects through the P21 adjustment service when available. Expose dependent payouts/recovery and the affected review/hold now; do not ship a direct edit/delete shortcut. A duplicate command cannot confirm twice. A competing second incident cannot reuse an already confirmed affected quantity. Dedicated found-after-compensation processing is excluded; do not automatically reverse payouts or recreate stock when staff write a note that goods were found.

## Replacement shipment and waiver

Use the existing ordinary shipment form with a visible incident/original-shipment link and a new numeric reference. Actual new intake/stock availability, allowed service, recipient input and valid configured tariff are all still required. Do not reopen the old execution attempt or clone old custody into a received replacement.

Approved payer choices are ordinary recipient-funded, ordinary brand-funded and incident-agreed company-funded shipping. **Employee-funded replacement shipping is not selected and must not appear.** For company-funded replacement preserve the standard base/uplift/complete tariff and explicit waiver relation. Set recipient shipping due to zero and brand shipping liability to zero. Preserve actual goods outstanding. Goods due 250 plus standard shipping 50 waived means recipient total **250**, not zero.

At each eligible visit covered by this replacement's company-funded agreement, P13's earning operation posts the standard shipping fee and equal linked waiver in one source batch, giving net shipping revenue zero. Normal base/fixed driver commission still accrues. No fee/waiver is earned merely when the replacement is created, and replay creates neither a new fee nor waiver/commission. Persist the commercial agreement snapshot so later incident/profile changes cannot silently change a dispatched replacement's charges. There is no fake paid expense, recipient receipt or employee obligation from the waiver.

The native price snapshot must separate commercial tariff from canonical recipient shipping outstanding. The pinned canonical Money permits zero, but schema validity alone does not prove runtime acceptance. Run IP-AC-22 against actual public processes using the permitted ERP service identity: exact source goods 250 and shipping zero survive task acceptance and outcome projection. Retain canonical safe-integer bounds and existing field names. If external evidence is unavailable, mark the connected waiver dispatch unverified, keep its pending dependency visible and do not silently send 50 instead.

## Planned data/API/UI slices

- `packages/database/migrations/0018_p18_incidents.sql`: incident/report/affected-item/confirmation/share tables, affected-quantity allocation uniqueness, responsible branch snapshot, replacement relation and shipping-waiver source metadata. Reuse P03 journals and P08 employee obligation/control interfaces. Existing ordinary shipments get no waiver and no compensation backfill.
- `packages/domain/src/incidents/` and `packages/database/src/incidents/`: value/share validation, affected-quantity conservation, report/confirmation transitions, deterministic locks and source allocations. Lock incident/affected custody, stock positions where needed, brand wallet, employee period/obligation guard, then append effects under the shared transaction.
- `packages/contracts/src/incidents/`: closed schemas for `POST /api/v1/incidents`, `GET /api/v1/incidents`, `GET /api/v1/incidents/{id}`, `POST /api/v1/incidents/{id}/confirmation-preview`, `POST /api/v1/incidents/{id}/confirm`, `POST /api/v1/incidents/{id}/dismiss`. Extend ordinary shipment-create schema with authorized replacement/waiver references; do not trust arbitrary client `shippingDue: 0` as waiver authority.
- `apps/api/src/modules/incidents/`: orchestrate audit, eligible credit, typed employee obligation, profit facts and disposition intent in one local command. Source/canonical processing remains outside held transactions. Native idempotency is company/principal/family/command, and source uniqueness protects a repeated incident effect via another worker.
- `apps/web/src/features/incidents/`: list, report and focused review/detail pages. Main next action depends on reported versus confirmed state. Show goods basis, share sum and protected-period problem near inputs, and show confirmed effect links instead of editable totals. Preserve sparse RTL layout, responsive forms and clear pending disposition status. Extend replacement entry with explicit standard fee/waiver/goods/commission summary.

Filters: assigned responsible/custody branch, brand, reported/confirmed/dismissed, loss/damage, affected shipment/employee and observed/confirmed date basis. Server filters must not expose another branch's compensation through company-wide operational tracking. A tracking timeline may expose the permitted operational incident milestone; financial share detail requires the financial/incident screen scope.

## Ordered checkpoints

1. **Source and effect design:** verify prerequisites, define exact compensation/share/waiver examples and canonical mapping. Connected Vitest proves report has no financial effect and confirmation has its complete typed effect set.
2. **Atomic incident persistence:** migrate real PostgreSQL, test failure after wallet posting before obligation write, and test two incidents claiming the same affected subset. No partial confirmation or double compensation may commit.
3. **Replacement adapter:** extend common source snapshot and visit posting without duplicating P13 logic. Run real public accepted/rejected zero-shipping checks and replay. Keep any unsupported contract branch explicitly blocked.
4. **Actual UI:** run report→confirm→eligible credit→replacement entry, protected-period and unknown-response paths against real APIs. Capture desktop/mobile, long reasons and partial-damage lines. Verify confirmation is understandable before the user clicks it.
5. **Correction/handoff:** verify linked source history and review handoff for already-paid/recovered amounts. Register P18 suites, run scoped tests/typecheck/lint/build and document P20/P21 interfaces and unresolved integration evidence.

## Acceptance and failure cases

| ID | Given / When | Then |
| --- | --- | --- |
| P18-AC-01 | Report goods loss 400 with shipping 50, without confirming. | Affected goods held/reported; wallet, obligations, profit and cash unchanged. |
| P18-AC-02 | Confirm company 200/employee 200. | Eligible brand credit 400, obligation 200, compensation cost 400/recovery share 200 at incident branch, no cash. DOM-12; real DB. |
| P18-AC-03 | Recipient goods due zero but agreed affected value 400. | Compensation basis 400, not zero; no compulsory intake valuation. |
| P18-AC-04 | Shares sum 399, period protected, scope wrong or affected quantity already claimed. | Whole confirmation rejected; no partial wallet/profit/obligation effects. |
| P18-AC-05 | Two connections confirm overlapping incidents; drop winner's response and retry. | At most one claim per affected quantity; original winner recovered once, no second compensation. |
| P18-AC-06 | Company-funded replacement standard fee 50, goods outstanding 250. | Canonical shipping 0/goods 250, recipient total 250; visit fee 50/waiver 50/net 0, normal commission, brand shipping debit 0. DOM-24/IP-AC-22. |
| P18-AC-07 | Visit event replay or replacement form resubmission after lost response. | One source earning/waiver/commission and one new shipment reference. |
| P18-AC-08 | Confirm compensation while documented disposition is pending. | Financial confirmation and pending physical resolution shown separately; no invented receipt/available stock. |
| P18-AC-09 | Attempt employee-funded payer or edit already-paid compensation directly. | Unsupported payer rejected; posted history retained and legitimate adjustment review required. |

Use meaningful Vitest orchestration checks, committed real PostgreSQL tests, actual canonical HTTP tests where claimed, and browser/manual evidence. Never report mock acceptance as an integrated connector. Run `npm run test:phase -- P18` and record exactly which suites ran.

## Manual trial, deliverables and stop

In a safe seeded company create an actual received shipment with goods value 400/shipping 50 and a linked commissioned employee. Report partial/complete damage and verify no initial money. Confirm a 200/200 split in an allowed period; inspect brand eligible 400, employee obligation 200 and zero account movement. Open payout through P17 to show compensation is eligible independently of recovery; use test funds only. Create its ordinary replacement with goods due 250 and company-funded fee 50, review the 250 recipient total and dispatch only through the implemented test integration. Apply an actual visit and inspect fee/waiver/commission once, then replay. Repeat a lost confirmation response and an invalid protected-period case.

Deliver code, migration, schemas, tests and evidence under `docs/verification/P18/`; update `phases/execution/P18.md`, status/traceability and integration coverage with actual versions/results. Include skipped canonical cases and exact material dependencies. **Stop after P18. Do not run storage/payroll, alter Tawsel, issue real money, deploy, publish, purchase or merge automatically.**

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-055`, `ERP-R-060`, `ERP-R-065`, `ERP-R-097`, `ERP-R-098`, `ERP-R-102`, `ERP-R-103`, `ERP-R-104`, `ERP-R-105`, `ERP-R-107`, `ERP-R-108`, `ERP-R-109`, `ERP-R-110`, `ERP-R-116`, `ERP-R-134`, `ERP-R-152`, `ERP-R-190`, `ERP-R-197`, `ERP-R-203`, `ERP-R-208`, `ERP-R-211`, `ERP-R-212`.

Decisions: `ERP-D-053`, `ERP-D-054`, `ERP-D-059`, `ERP-D-066`, `ERP-D-069`, `ERP-D-070`, `ERP-D-071`, `ERP-D-076`, `ERP-D-095`, `ERP-D-098`, `ERP-D-099`, `ERP-D-100`, `ERP-D-101`, `ERP-D-102`, `ERP-D-103`, `ERP-D-104`, `ERP-D-105`, `ERP-D-110`, `ERP-D-125`, `ERP-D-138`, `ERP-D-143`, `ERP-D-161`, `ERP-D-172`, `ERP-D-181`, `ERP-D-188`, `ERP-D-190`, `ERP-D-194`, `ERP-D-199`, `ERP-D-201`, `ERP-D-202`, `ERP-D-203`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
