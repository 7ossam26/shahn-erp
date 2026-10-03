# P24 — Operating profit and reconciliation

Status: standalone implementation prompt under approved PLAN-001, ERP-D-205 / ERP-R-214. Implement the selected company/branch operating-profit report and evidence-backed reconciliations. Approval of this plan is not proof that a source contract, runtime or production recovery target has passed.

## 1. Goal and bounded result

Deliver REP-15 inside UI-REPORTS-001, with truthful operating-period profit, branch attribution, source drill-down, a distinct actual-money view and matching Excel/Arabic RTL print/PDF. An authorized owner can explain every amount using the recorded business events rather than a cash-balance guess. Include read-only checks for journal/projection agreement and duplicate or missing economic sources; route discrepancies to existing settlement/recovery workflows.

Do not build a general ledger, tax accounting, brand/area margin reports, forecasting, automatic reconciliation adjustments or an unselected report catalog. The company records ordinary expenses when paid, so the result cannot include unpaid costs that were never entered. Preserve this limitation next to the formula explanation. The report must not turn an unresolved source gap into a zero or erase unrelated valid results.

## 2. Recommended execution model

Use **gpt-6-astra / xhigh**: economic classification, historical attribution, period boundaries and correction races span several modules and require careful reconciliation. Model availability and official guidance were checked on 2026-10-03 in [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md). The owner manually selects the model and effort. The text does not change the running model; record the actual setting and any later availability difference.

## 3. Required reading and actual prerequisites

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md); [master-plan.md](../master-plan.md), Reports, Data and transactions, Integration and Verification; [ERP-DOMAIN-SPEC.md](../docs/planning/ERP-DOMAIN-SPEC.md), sections8–15 and bounded policy decisions; [ERP-DATA-AND-TRANSACTIONS.md](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md), sections5–9 and Migration and reporting integrity; [ERP-REPORT-CATALOG.md](../ERP-REPORT-CATALOG.md), current selection, REP-15 and latest financial amendments; [ERP-SCREEN-SPEC.md](../docs/planning/ERP-SCREEN-SPEC.md), reports, money explanations, filters and output rules; [ERP-ARCHITECTURE-AND-OPERATIONS.md](../docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md), workers, authorization and exports; and the traceability cases named below.

Verify actual P18 incident/replacement effects, P19 storage periods/credit, P20 classified payroll, P21 typed adjustments and P23 authorized snapshots/export infrastructure. Also verify their upstream P09/P10 accounts/transit, P13 visit facts, P16 remittance and P17 wallet source interfaces. Read execution records, inspect schema and run relevant focused suites. Required source rows include unique identity, classification, amount, work/service date, recorded date, historical branch and reversal/correction links. A net balance with no provenance is insufficient.

Repair a small missing query or source-field export and record it. Do not reimplement incomplete payroll, invent recognized storage revenue from receipts or simulate a missing integration subsystem to mark this report complete. Continue independent query/UI work when possible and record affected dependency cases. Preserve owner edits and existing dependency pins.

## 4. Rules and traceability

Implement ERP-R-113/117/152/181/199/210/211/212/213 and AC-R equivalents, AC-REP-15 and the selected-scope/filter/export requirements ERP-R-014/099/111/112. Follow ERP-D-111/131/134/143/164/172/190/201/202/203/204 and their current refinements. ERP-D-205 adopts the documented detailed plan mechanics. Historical superseded formulas do not override these rules.

The formula is:

`earned shipping including packing - approved replacement shipping waivers + full storage fees earned at period start - employee earning cost after entitlement deductions but before advance recovery - paid ordinary expenses - confirmed brand compensation + approved employee compensation share counted once`.

1. Each actual eligible customer visit earns its historical complete tariff, including packing uplift, at its work/dispatch branch. Intake elsewhere and internal branch transport do not create another visit or relocate prior revenue. Preserve visit identity and historical rate even after tariff changes. A company-funded replacement keeps the tariff and equal incident-linked waiver: net shipping revenue is zero. Driver commission remains normal, and any actual goods due remain due.
2. Recognize the entire fixed storage-period fee on its service-start date. A January20–February19 period costing310 gives January revenue310 and February0. Payment date, partial payment and advance allocation do not change recognition. Attribute it to the agreement branch, even when another account or branch receives money. No daily apportionment or cash-based recognition.
3. Employee earning cost is salary/commission/additions less approved entitlement deductions. Advance issuance/recovery changes obligations/cash, not cost. Salary6000, entitlement deduction200 and advance recovery1000 give cash payout4800 and cost5800. Incident recovery has its own linked classification and cannot also reduce salary cost. Carrying an obligation forward cannot create another recovery gain.
4. Paid expense cost uses its actual business date and selected expense branch. Store recorded time separately. Confirmed compensation and its approved employee share use incident confirmation and the responsible incident branch captured by the approved plan. Do not count recovery again when payroll withholds it or the employee later pays.
5. Exclude brand goods principal/payouts, generic funding/withdrawals, treasury transfers, opening balances, employee advances and net salary cash payments from additional profit. Do not infer income from a positive adjustment. Unclassified entries remain visible as unresolved classification, outside computed profit until a justified typed resolution.
6. Actual cash/bank positions, funds in transit, held discrepancies, unremitted recipient amounts, brand liabilities and storage due/credit stay distinct. They explain money movement and outstanding obligations; they are not interchangeable profit categories. A general deposit can improve funds without improving profit.
7. Use Cairo calendar boundaries. Shipping uses actual visit effective date; salary its payroll period; storage period start; incidents confirmation; late earning corrections their original service/work period. Preserve entry time, asOf generation time and a visible indication when later-entered facts changed a prior report period. Do not claim closed accounting periods.

## 5. Data, query, API and user interface

Add the reporting layer under apps/api/src/modules/reporting using typed source adapters and P23 snapshot generation. Define a closed EconomicEffect representation: company, unique source/effect identity, category, signed amountMinor, effectiveDate, recordedAt, historicalBranchId, optional related shipment/period/employee/incident, postingBatchId and correction ancestry. Reuse persisted source effects; do not create a second money journal merely to report them.

Add justified indexes or read-model migrations under packages/database/migrations. If a rebuildable projection is used, record source coverage/checkpoints and make rebuild idempotent; compare it against source sums. Never migrate a historical cash movement into guessed revenue. Parameterize company/scope/date filters and deterministic ordering. Company total must equal the sum of its branch components; omitted/unattributed legacy facts must be explicit exceptions, not silently dropped or spread across branches.

Define packages/contracts/src/reporting profit summary, category/branch breakdown, source drill-down and reconciliation responses. Reuse P23 snapshotId, filter digest, authorization revision and export jobs. Reauthorize reads/downloads; a report grant does not authorize adjustment. Reconciliation findings carry target/source links, observed versions, exact delta, scope and freshness. They create no automatic financial mutation. A refresh may supersede a finding without deleting its evidence.

Extend apps/web/src/features/reports with company/branch, period and explicit date-basis controls. Show a short category waterfall/table, formula help, actual-money section and source completeness notice. Category selection opens a focused detail list with back navigation preserving filters. Distinguish gross tariff, waiver and net shipping; distinguish salary cost, deductions, advance recovery and actual payout. Exports preserve all selected rows, totals and warnings through P23, with readable Arabic layout and numeric IDs as text where necessary. Preserve the approved focused RTL shell; the current white/lime default remains reversible.

## 6. Ordered checkpoints and checks

1. Map every formula term to actual upstream typed sources and write a classification/date/branch table. Vitest each inclusion/exclusion, waiver, deduction and late correction. Reject missing category mappings rather than defaulting to income or zero.
2. Implement real PostgreSQL queries and source reconciliation. Verify category sums, source uniqueness and company-versus-branch totals using committed rows. Test that join fan-out from payment components, partial allocations or correction history cannot multiply revenue.
3. Integrate stable report snapshots. Race correction posting and snapshot generation with independent connections: each result is a coherent before or after version, never mixed summary/detail. Finish a snapshot, then post a late correction; the old snapshot stays reproducible while a new snapshot shows the changed period and recorded date.
4. Implement reconciliation findings for source/effect duplication, missing classification, account journal versus projection, transit, wallet lots and storage credit. Exercise known faults in an isolated database, then use existing lawful repair/rebuild paths. Do not run destructive fault injection outside test data or add a generic balance-edit button.
5. Build browser and export journeys at mobile/desktop sizes. Check denied scope, revoked export permission, empty filters, incomplete evidence, large numbers, long Arabic labels and PDF pagination. Source detail must retain its ordinary permission boundary even when a summary is accessible.
6. Register `npm run test:phase -- P24`; run meaningful connected Vitest, real PostgreSQL races/rebuild checks, browser/export tests and lint/typecheck/build. Report measured query/index behavior and concurrent export/inbox progress without claiming a production capacity guarantee from a small fixture.

## 7. Numeric acceptance and owner trial

P24-A01 / AC-R-152: seed an isolated labelled test company through existing domain commands or documented test helpers invoking the same services. Produce shipping10000, storage2000, employee cost4000, paid expenses1500, confirmed compensation500 and approved employee recovery200. Profit must be6200. There is no invented “income total” screen or direct balance edit for this setup. Each total must drill down to real source IDs.

Then add a generic deposit700, treasury transfer300, brand payout100 and employee advance100 in the same period. Funds/obligations change appropriately, but profit remains6200. Recover the already approved incident200 through payroll: profit still remains6200 because it was already counted once. Retry source commands/events and refresh the report; totals do not double.

P24-A02: in a separate fixture, agreement branchA has period January20–February19 fee310. Receive advance500 through branchB before service begins: revenue0 and storage credit500. Start the period: January revenue310 atA, credit190, no new cash. February shows0 from that period. Separately receive100 against a new charge310: due210, revenue310, not100. Export screen/XLSX/PDF and compare values.

P24-A03: salary6000, entitlement deduction200 and advance recovery1000 give employee cost5800 and net pay4800. A further linked incident recovery100 reduces net pay to4700 but leaves cost5800; it appears exactly once in incident recovery. Payroll carry-forward or payment retries do not add another cost reduction.

P24-A04: register/pack a shipment atA and dispatch its recipient visit atB with base shipping50 and uplift5. Revenue55 belongs toB; commission at10% of base is5. On a separate company-funded replacement, retain tariff55 and waiver55, goods due250, net shipping0 and commission5. Goods money250 is not revenue. Inspect both cases and an internal transfer, which earns no visit revenue.

P24-A05: generate a January snapshot, then post a justified January earning correction in February. The first snapshot stays unchanged; a new January snapshot includes the linked correction and later-entry notice. P24-A06: revoke report/download grant and verify server denial. P24-A07: deliberately break a test projection; the reconciliation shows the exact delta and a documented rebuild restores agreement without posting new cash. Record fixture IDs, expected and observed numbers and screenshots in docs/verification/P24.

## 8. Completion and stop boundary

Deliver query/source adapters, necessary migrations, report/reconciliation contracts, focused pages, export integration, tests and formula/source documentation. Update phases/execution/P24.md, phase catalog and IMPLEMENTATION-STATUS.md with actual model, prerequisites, commands, failures/reruns, screenshots, generated sample files and unrun dependencies. All source classifications and historic branch/date rules must have connected evidence; a mocked6200 summary alone is insufficient.

Stop after P24. Do not automatically begin deployment, execute real payments, alter Tawsel, buy services, publish, merge or claim production readiness. Preserve any external evidence limitations explicitly; a readable report cannot close an untested public-contract scenario.


## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-014`, `ERP-R-099`, `ERP-R-111`, `ERP-R-112`, `ERP-R-113`, `ERP-R-117`, `ERP-R-139`, `ERP-R-140`, `ERP-R-143`, `ERP-R-152`, `ERP-R-171`, `ERP-R-173`, `ERP-R-181`, `ERP-R-192`, `ERP-R-199`, `ERP-R-208`, `ERP-R-210`, `ERP-R-211`, `ERP-R-212`, `ERP-R-213`.

Decisions: `ERP-D-090`, `ERP-D-096`, `ERP-D-103`, `ERP-D-106`, `ERP-D-107`, `ERP-D-111`, `ERP-D-112`, `ERP-D-114`, `ERP-D-120`, `ERP-D-130`, `ERP-D-131`, `ERP-D-134`, `ERP-D-143`, `ERP-D-162`, `ERP-D-164`, `ERP-D-172`, `ERP-D-183`, `ERP-D-190`, `ERP-D-194`, `ERP-D-199`, `ERP-D-201`, `ERP-D-202`, `ERP-D-203`, `ERP-D-204`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
