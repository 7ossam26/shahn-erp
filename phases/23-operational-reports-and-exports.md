# P23 — Selected operational reports and reliable exports

**Git workflow (owner instruction, 2026-10-05):** Execute P23 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 23: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

Status: standalone implementation prompt under approved PLAN-001, ERP-D-205 / ERP-R-214. Build the selected operating reports and export system only. P24 separately delivers operating profit; do not populate a pretend profit report here.

## 1. Result and scope

Deliver a focused report picker and working shipment register, driver activity/rounds, returns/brand handover, brand statement, combined eligible-dues/payout history, company cash/bank movements, paid expenses and stock monitoring reports. Every authorized filtered view can produce a real XLSX and readable Arabic RTL print/PDF with the same snapshot, formulas, rows and totals.

Own UI-REPORTS-001 and export adapters for the selected existing operational surfaces. Selected items here are REP-01/05/07/08/09/10/12/14/18. REP-09/10 stay together on the brand payout surface, not duplicate unrelated pages. REP-24/25 remain HR histories. REP-15 has a declared P24 dependency; no fake zero or untested formula implies completion. Do not add every unselected catalog report, a BI product, saved filters, a brand portal or Excel intake.

## 2. Execution model

Recommended **gpt-6.1-sol / high** for a broad but bounded set of settled queries, formatting and browser paths. Reconciliation still requires independent numeric tests. Availability and official guidance checked2026-10-03 are in [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md). The owner selects the setting; the prompt does not change it. Record actual model/effort.

## 3. Required reading and prerequisite evidence

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md) Reports, User experience and Verification; [ERP-REPORT-CATALOG.md](../ERP-REPORT-CATALOG.md) current selection/shared constraints and each selected row; [ERP-DOMAIN-SPEC.md](../docs/planning/ERP-DOMAIN-SPEC.md) sections9/13/15; [ERP-DATA-AND-TRANSACTIONS.md](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) entities, journal formulas, dates/corrections and query constraints; [ERP-SCREEN-SPEC.md](../docs/planning/ERP-SCREEN-SPEC.md) report catalog, advanced filters, printable output and design acceptance; [ERP-ARCHITECTURE-AND-OPERATIONS.md](../docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md) workers, API conventions, capacity and exports; and UI-REVIEW-LOG.md.

Verify actual outputs/execution records of P09/P10/P13/P16/P17/P19/P20/P21/P22 and underlying P05/P14/P15 stock/return/transfer read models. Run their focused query/source suites and migration status. Required evidence includes immutable source IDs, actual/effective/recorded dates, report authorization, current custody quantities, pending versus eligible money and source freshness/gaps. Totals without provenance cannot support these reports.

Verify P01 browser tests and worker lanes, P02 permission revocation, and P03 command/source identity. Export work must not starve inbox application. A missing small query adapter can be added and recorded. A missing return/custody/finance subsystem is a material dependency; do not substitute fixture totals and declare its report real.

## 4. Requirements and exact meanings

Own ERP-R-014/099/100/111/112/114/127/131/208 and AC-REP-01/05/07/08/09/10/12/14/18. Decisions: ERP-D-096/106/107 as amended/108/112/120/123/187/199. Consume ERP-R-029/106/117/132/139/140/143/169/170/173/177/186/196, plus each underlying domain case.

Count shipments by shipment identity and visits by actual evidenced visit identity. Round closure does not mean every shipment delivered. A transfer during a driver round is distinct internal work, not an extra customer visit. Current state and history retain original/effective source distinctions.

Returns report offered, actually received, condition and brand handover separately. Offered2/received1 does not mean two units are at the branch. Stock separates on-hand, reserved, available, unavailable and carrier/transit; a prepared shipment's components retain their order claim and are not counted as a second inventory.

Brand statement reconciles credits, fees, compensation, adjustments and payouts. Dues show pending/held/cover/eligible separately; history shows actual full/partial brand payout. Cash report separates actual balances, transit and pending discrepancies. Expenses use actual paid date and retain entry time; they are not unpaid obligations. No report infers income from all positive cash movements.

Enforce the declared report/surface scope on queries, totals, source detail, export creation and download. Company-wide tracking does not grant report/export access. Combined payout views retain their approved shared-brand financial scope; account and unrelated report scope remain independent. Display company totals only under the approved complete branch scope. User-provided filters cannot widen authority.

Each report declares business date basis: shipment creation/last state, actual visit, round, return receipt, payout, expense actual date or current stock as appropriate. Cairo day ranges become half-open UTC bounds using timezone rules. Current stock is not the sum of movements in a selected period. Unknown/gapped data is visibly incomplete rather than silently zero.

## 5. Query, snapshot and export implementation

Create apps/api/src/modules/reporting and packages/contracts/src/reporting with a typed report registry: selected report ID, allowed filters/sorts, scope resolver, date meaning, columns, source formulas, totals and drill-down definitions. Query through explicit read services and parameterized SQL. No arbitrary SQL/filter/column supplied by the client.

Implement bounded pagination with stable tie-breakers. OR within a multi-selection, AND between fields; inclusive integer amount bounds where relevant. Reset pagination on filter changes. Normalize Arabic digits for reference/phone searches but retain original display text. Empty/error states preserve the chosen query and distinguish no data from load failure.

A displayed/exported report needs one identifiable authorized data snapshot. Materialize the selected values/totals or an equivalent proven stable snapshot with source revision/coverage, asOf, normalized filter digest and authorization scope. Do not hold a database transaction open while uploading/rendering a file, and do not silently recompute later export rows from newer mutable projections. New data may require an explicit refresh/new snapshot.

Add durable export_job/snapshot/artifact metadata through migrations where P01/P22 have not already supplied them. Export creation carries commandId and a canonical snapshot/filter payload digest; a lost response recovers the original job instead of silently creating another. Use bounded worker lanes, leases/fencing, retry-safe artifact publication and source/result identity. Authorize at creation and download; revoke access even when a link remains. Files expire after the approved24-hour default while underlying business history remains. Store nonpublic artifacts; no public bucket link bypasses the ERP authorization endpoint.

Use the established compatible XLSX/print tools, or pin a maintained local writer/rendering dependency after checking its actual documentation and license. Produce real XLSX, not renamed CSV. Protect user-controlled text from spreadsheet formula execution. Preserve long numeric shipment references as text and exact EGP semantics; do not corrupt values beyond spreadsheet numeric precision. Create readable RTL print/PDF, repeated headers, page numbers, date/filter/unit context and unclipped totals. Export every selected row, not just the current25-row page.

Build apps/web/src/features/reports using the approved focused shell, compact frequent filters and collapsed advanced controls. Report picker links to the combined payout surface where appropriate. Show progress, expired/failed artifact and safe retry; never announce download success before a file exists. Screens, Excel and print use the same registry/snapshot.

Inspect real query plans for the principal company/branch/date filters and document chosen indexes. Verify deterministic pagination with equal timestamps and independent rows committed during export preparation. Summary and details must derive from one materialized snapshot, not separate reads at different moments. Release database transactions before formatting files or publishing a job result. Measure export completion while an inbox fixture continues applying; report the observed sample size and timing without claiming those measurements establish production capacity.

## 6. Checkpoints

1. Inspect actual sources and define report registry/formulas/scope/date/filter contracts. Seed independently calculated fixtures. Vitest must catch double-counted visits, offered returns as stock, prepaid goods credits and driver transit presented as available.
2. Implement real database queries/indexes and snapshot persistence. Compare row IDs and totals with independent SQL/oracle sums. Exercise late correction, backdated expense and concurrent source application; a completed snapshot remains internally consistent.
3. Implement durable XLSX/PDF jobs and authorized downloads. Kill worker before/after artifact publication; retry returns one completed artifact identity without phantom success. Test authorization revoked after creation and expired jobs/files.
4. Build all selected screens/adapters with combined9/10 and existing HR-history placement. Test advanced filters, pagination, reset, back navigation, unknown dates, incomplete-source flags and filtered drill-down under actual permissions.
5. Parse generated XLSX content and compare totals/rows to the snapshot; render/inspect PDF pages at long content and multipage sizes. Browser tests cover real backend exports on RTL desktop/phone and formula-like user text.
6. Register npm run test:phase -- P23. Run important Vitest, PostgreSQL query/snapshot/restart and browser suites plus relevant typecheck/lint/build. Record exact artifact paths and tested row counts.

## 7. Acceptance and manual trial

Required cases: P23-A01 filtered screen/XLSX/PDF same rows/totals; A02 unauthorized branch rejected on API/export/download; A03 tracking grant alone cannot export company shipments; A04 query/page changes do not lose filters; A05: 27 rows export27, not25; A06 worker restart produces one retrievable artifact; A07 revoked permission denies an old download; A08 stock/returns/rounds preserve distinct facts; A09 late-entry report refresh changes its new snapshot while an existing snapshot stays coherent.

Seed an isolated P23 company using real prior workflows. A Cash starts1000 and B Cash0. Record paid expense200 atA, transfer300 A→B and confirm receipt, remit300 from goods250/shipping50 intoA, then pay the brand100 fromA. Expected A Cash700, B Cash300, brand eligible150, actual payout100 and paid expense200. The cash report explains each movement without calling the1000 funding or300 internal transfer revenue.

Receive stock10 atA, reserve4, then transfer loose2 to a carrier without destination receipt. ReportA on-hand8/reserved4/available4, carrier2 and destination availability0. After receipt, destination has2; company quantity is conserved. Use a separate supported return fixture offered2/received1 to verify its report columns. Capture driver activity from actual P13 evidence, not fabricated location.

Filter expenses byA and its actual date; open detail and return with filters intact. Export the same snapshot to XLSX and PDF and compare200. Seed enough labelled shipments for more than one page and verify full export count. Repeat from a user withoutB report scope and test forged filters/downloads. Record screenshots and actual workbook/PDF inspection, not merely HTTP200.

## 8. Handoff, evidence and stop

Deliver report registry, authorized queries/indexes, snapshot/export jobs, real artifacts, pages, tests and docs/verification/P23. Document the renderer/query/snapshot interface P24 will use for REP-15. Update phases/execution/P23.md, catalog and IMPLEMENTATION-STATUS.md with actual model, commands, source fixtures, artifact paths, failures/reruns and limitations. REP-15 remains explicitly owned by P24.

Complete P23 only and stop. Do not build profit by guessing, start P24 automatically, buy BI/storage services, publish files publicly, deploy, send reports to others, purchase or merge.




## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-014`, `ERP-R-068`, `ERP-R-099`, `ERP-R-100`, `ERP-R-111`, `ERP-R-112`, `ERP-R-113`, `ERP-R-114`, `ERP-R-118`, `ERP-R-171`, `ERP-R-173`, `ERP-R-208`.

Decisions: `ERP-D-063`, `ERP-D-096`, `ERP-D-106`, `ERP-D-107`, `ERP-D-108`, `ERP-D-111`, `ERP-D-112`, `ERP-D-120`, `ERP-D-129`, `ERP-D-162`, `ERP-D-164`, `ERP-D-199`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
