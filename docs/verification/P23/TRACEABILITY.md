# P23 bounded traceability

The exact current assertions in `REQUIREMENTS-TRACEABILITY.md` govern this slice. These script results do not mark whole cross-domain requirements or later profit/external/manual slices complete. Owner excluded final browser testing on2026-10-08. Evidence: [README](README.md), phase script logs, immutable fixture JSON, actual artifacts and [P24 handoff](HANDOFF-P24.md).

| Assigned requirement / decision | Implemented or consumed P23 slice | Evidence / exclusions |
| --- | --- | --- |
| ERP-R-014; ERP-R-068; ERP-D-063 | Source-linked order/shipment reports and immutable agreed tier/tariff snapshot; no report changes the manually selected tier | Native shipment/price test; REP-01 counts identities, not automatic price selection |
| ERP-R-099/100; ERP-D-096 | Useful selected picker, company/branch/date authority and detailed registry-owned dimensions | Closed schema/SQL/HTTP and script UI; no every-catalog or BI product |
| ERP-R-111; ERP-D-106 | Selected screen/snapshot/XLSX/readable RTL PDF parity | All nine real worker jobs, every workbook cell/source/total parsed, same snapshot in PDF, independent PDF inspection; final UI browser review excluded |
| ERP-R-112; ERP-D-107 amended | REP-01/05/07/08/09/10/12/14/18 only | Registry exclusion test; REP-15 explicitly P24, formal REP-20 excluded |
| ERP-R-113; ERP-D-111 | Actual money position separated from operating profit | REP-12 signed cash book/held/available/transit/observations; no funding/transfer income; profit formula P24 |
| ERP-R-114; ERP-D-108 | Combined REP-09/10 brand payout surface; REP-24/25 remain HR histories | Existing payout wrapper and picker placement; no duplicate report/HR pages |
| ERP-R-118; ERP-D-112/129 | Separate paid-expense report, actual/recorded dates, historical category/account/actor and filters | Real P09 expense200/backdated fixtures, detail/filter UI scripts, actual date totals; configuring categories remains P04/P09 |
| ERP-R-171; ERP-D-162 | Exclusion check | No service invoice/tax/e-invoice implementation |
| ERP-R-173; ERP-D-164 | Cairo midnight day ranges with timezone rules; one round retained across its dates | 23/25-hour tests, native work dates, date basis registry; monthly profit/payroll slices retain their owners |
| ERP-R-208; ERP-D-199 | Focused frequent/collapsed advanced filters, URL retained state, reset/page/back, unknown/error/gap state | Three UI script cases plus closed real HTTP; no final browser/device pass |
| ERP-D-120 | Current inventory monitoring, not formal count sessions |10/reserve4/transit2/conservation, prepared claim, separate sealed parcels; no count lock/freeze |

Additional prompt-owned/consumed slices: ERP-R-127/131 current stock/branch scope, R-029/106/117/132/139/140/143/169/170/177/186/196 and D-108/112/120/123/187/199 are consumed through the implemented prior stock, return, transfer, money, source, HR and permission services. The193-case prerequisite rerun verifies those sources within their native scope. No new driver location, visit from a transfer, blanket shipment delivery from a round closure, stock from an offered return, paid-expense from unpaid obligations, or cash from pending driver money. R-173 daily dates are independent from P24 profit calculations.

AC-REP-01/05/07/08/09/10/12/14/18 map to the nine registry rows and dedicated fixture results in README. P23-A01–A09 map to its acceptance table: all-row same-snapshot parity; real scoped API/export/download denial; tracking-only denial; preserved/reset filters;27≠25; actual process death/retry/fence; old-link revocation; distinct custody/visit facts; immutable old and refreshed late-entry/correction snapshots.

Deferred named Tawsel gates remain CR-001 approved baseline/07/IP-AC-18, CHECK-003 exact accepted-A→B and receipt-A→cycle-B sequence, and the complete jointly reviewed43+1/27 index. Their owners/closure artifacts stay in [TAWSEL-CHANGE-REQUESTS.md](../../../TAWSEL-CHANGE-REQUESTS.md), not a second phase-specific integration handoff. Available existing live P22 checks8/8 pass separately. No new Tawsel call/code/adoption or full integration-readiness claim. Owner physical trial/device review is unrun. P24–P26 have not started.
