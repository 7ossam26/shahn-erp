# P24 connected numeric acceptance

Executed 2026-10-08 using pinned Node24.21.0/npm12.2.0 and an explicitly selected native PostgreSQL18.3 test cluster. Every test provisions an isolated company/database, invokes the implemented native services, commits their actual source facts, creates REP-15 snapshots and disposes only that cluster. No production money, customer data or Tawsel repository is changed. The P13/P12 source command responses and canonical events are controlled test fixtures, not an independent live Tawsel acceptance claim.

The authoritative latest fixture IDs, snapshot IDs, source/effect IDs, historical branches and dates are in [numeric-acceptance.json](numeric-acceptance.json). Look under `A02`, `A03`, `A04` and `A05-native-late`; reruns create new isolated identities. A01/A06/A07 and other source/reconciliation cases are recorded in the separate P24 database/browser evidence, not asserted by this four-case suite.

## Expected and observed values

All amounts below are EGP; the contracts and source rows retain integer minor units.

| Case | Actual native setup and selected period | Expected and observed |
| --- | --- | --- |
| A02 advance | P04 storage agreement at A starts2027-01-20, fee310. Real P19 receipt500 at B on the controlled2027-01-01 storage business date; no period exists yet. | January storage revenue0; separate storage credit500. |
| A02 start | Run the actual P19 renewal worker at controlled2027-01-20; read2027-01-01–31. | Revenue310 at A; B operating contribution0; credit190; due0. B cash is unchanged by starting the period. |
| A02 February | Read2027-02-01–19 without creating another period. | Revenue0 from the January20–February19 period. No daily apportionment. |
| A02 partial | A second real310 period at A receives100 at B. Repeat each original receipt command. | Combined January revenue620 from exactly2 economic sources; storage due210, credit190. Replays create no additional receipt/revenue. |
| A02 allocation fan-out | Record a distinct further50 receipt against the second310 period. | Its2 real receipts/allocations change combined due to160; combined revenue stays620 and its source count stays2. |
| A03 entitlement | Configure the actual custodian employee salary6000 using P08, issue advance1000 using P20 and approve entitlement deduction200. | Native preview net4800 and employee cost5800; advance recovery1000 and entitlement deduction200 stay separate. |
| A03 incident/recovery | Confirm a real incident with employee share100 linked to that custodian. Pay the full reviewed P20 net, then retry the same payout and read the next month. | Native net4700; REP-15 employee cost5800, salary6000, entitlement deduction200, advance recovery1000, incident withheld100 and actual payout4700. The incident share is one distinct100 profit source. One incident recovery allocation remains after retry/carry. |
| A04 ordinary | Register/pack at A, use real P15 handover and receipt to B, then P12 dispatch/P13 actual visit at B with base50/uplift5. | Internal transport and preparation earn0 visit revenue. Actual visit earns55 at B; commission5 uses base50. |
| A04 replacement | Confirm a separate native incident; pack its company-funded replacement at A, transfer to B and execute its actual visit. | Preserve gross tariff55 and linked waiver−55 at B: replacement net shipping0, commission5, goods due250 and actual reported goods250. Goods principal is absent from operating revenue. Combined ordinary+replacement gross110, waiver−55, net55 and commissions10. |
| A04 historical tariff | Change the native tariff after both visits and refresh. | Both prior shipping effects retain the captured tariff/branch and the same gross/waiver/net totals. Repeated outcome events do not create another visit or commission. |
| A05 coherent correction | Zero-close the original current payroll period; receive a later actual packed visit, then resolve its P20 protected-period commission review into a future settlement month. Race that actual resolution against REP-15 generation on independent connections. | Original snapshot stays0. The racing snapshot retains shipping55/cost0 with unresolved commission notice; fresh snapshot adds the linked commission cost5 and becomes50. The correction retains its original work date, source visit ancestry and current recorded timestamp. Same resolution retry leaves totals unchanged. |

Salary belongs to its complete payroll month. A03 selects the complete month, including the genuine helper deduction work date on its15th. A filter ending on the host's current8th correctly excludes that future dated deduction; this was a test-filter error, not an authorization to move its recorded work date.

## Source identity, dates and boundaries

| Economic input | Service/source | Period and branch |
| --- | --- | --- |
| Storage revenue | `commercialCommands` agreement setup, `StorageRenewalService`, immutable `storage.period.revenue_effect_id` | Full fee at period start, agreement branch A. Receipts and allocations use separate source identities. |
| Salary | `employeeCommands`, P20 materialization/payout, frozen `employees.payroll_period.calculation.earnings` | Payroll month and snapshotted employee branch; payment funding does not relocate cost. |
| Entitlement deduction | `payroll.adjustment` with `earning_deduction` and original work date | One employee earning-cost reduction; advance/incident obligation recovery is excluded from this category. |
| Incident share | `incident.report`/`incident.confirm`, retained confirmation/share/obligation links | Incident confirmation and responsible branch; later payroll withholding creates no second profit gain. |
| Shipping/waiver/commission | Actual `goods.create`/`goods.handover`/`goods.receive`, `dispatch.prepare`/`dispatch.receive`, accepted P13 arrival/outcome | Actual evidenced visit identity and B work branch; captured tariff55, base50; waiver follows the approved incident link. |
| Late earning | Actual `payroll.resolve` of a P13 `late_commission` review | Future employee settlement month while `workDate` and the original visit identity remain in the original operating period. |

A02 uses the literal January20–February19 calendar example under the existing P19 controlled business clock; it does not change the PostgreSQL clock. A05's connected fixture uses the real current October2026 original work period and a future November payroll settlement. The real database records the correction in October. It does **not** pretend that its current source was recorded in February. The pure source/arithmetic suite separately verifies January effective dates with February entry dates and the later-entry notice.

The native P08 historical setup boundary is executed: attempting an employee/driver link effective2026-01-01 now rejects `WORK_DATE_PROTECTED`. The test retains this observation in `A05-native-late.historicalSetupRejection` and uses lawful current-period source setup. No guard, policy date or historical link is rewritten to manufacture the calendar example. Protected original payroll stays unchanged.

## Exports

[storage-january-620.xlsx](storage-january-620.xlsx) and [storage-january-620.pdf](storage-january-620.pdf) come from the **same** persisted A02 partial-payment snapshot, before the distinct additional50 receipt. Its recorded values are revenue620, due210 and credit190. Both jobs retain that snapshot ID/filter digest; the workbook parser checks its full source row count, both310.00 data cells and snapshot identity. The real PDF worker produces `%PDF-` bytes using the shared persisted rows. PDF visual/page inspection is recorded separately by the P24 artifact verification.

## Commands and failure history

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = (Resolve-Path -LiteralPath '.tools/p18-postgresql/pgsql/bin').Path
npm run test:db -- tests/integration/p24/numeric.db.test.ts
```

The test implementation is [numeric.db.test.ts](../../../tests/integration/p24/numeric.db.test.ts). Its immutable source helpers are existing P18/P19/P20 services and fixtures; no balance edit is used to produce a numeric result.

| Evidence | Result / change |
| --- | --- |
| [numeric-typecheck-first.txt](numeric-typecheck-first.txt) | Two local test mistakes: invalid constructor type utility and incorrect storage detail field; corrected to the actual contract before runtime. |
| [numeric-first.txt](numeric-first.txt) | A02 passed. A03 incorrectly assigned incident liability to an employee without custody; P18 rejected it. A04 initially read source provenance from the public summary rows where it is intentionally redacted. |
| [numeric-second.txt](numeric-second.txt) | A02/A04 passed after using the actual custodian and authorized category drill-down. A03 selected a period ending before the deduction's actual work date, so it observed cost6000 rather than5800. |
| [numeric-third.txt](numeric-third.txt) |3/3 passed with the complete payroll period. |
| [numeric-fourth.txt](numeric-fourth.txt) |4/4 passed after adding the real late earning/snapshot race. |
| [numeric-a05-boundary.txt](numeric-a05-boundary.txt) | npm12 rejected an attempted forwarded `-t` argument before any tests ran; no pass/skip claim from that attempt. |
| [numeric-fifth.txt](numeric-fifth.txt) |4/4 passed with the explicit historical P08 link rejection. |
| [numeric-sixth.txt](numeric-sixth.txt) |4/4 passed in33.88s after adding a distinct second partial receipt to exercise allocation fan-out. |
| [numeric-typecheck-second.txt](numeric-typecheck-second.txt) | Type errors in the concurrent source unit helper, outside numeric test code, retained and later corrected by its owner. |
| [numeric-typecheck-third.txt](numeric-typecheck-third.txt) | Connected test-project typecheck passed. |

The prerequisite run in [prerequisites-first.txt](prerequisites-first.txt) passed145 cases/13 files covering actual P09/P10/P13/P16/P17/P18/P19/P20/P21/P23 services. Prior phase records are restored; the changed generated P10 status artifact is preserved under [prerequisite-evidence/copied-paths.txt](prerequisite-evidence/copied-paths.txt).

## Owner trial

The physical device/owner walkthrough is **unrun**. The browser suite is a separate automated gate and is not a human sign-off.

For the already implemented P24 browser harness, start its isolated application using the P24 browser command/configuration, open the displayed reports page, choose operating profit and keep the runtime company's displayed period/branches. Expected seeded A01 profit is6200. Open each nonzero category, inspect source IDs and original branch/date, use Back and confirm filters remain; export XLSX/PDF and compare the displayed snapshot identity, totals and warnings. Use the ordinary money section to inspect cash, transit, obligations and storage balances separately. Test the report-only actor and a revoked actor through the harness's existing local login controls; summary access must not open protected payroll/source detail, and revoked report access must fail on the server.

For A02–A04 on a disposable owner trial company, enter the numbers and domain actions above through the Storage, Employees/Payroll, Incidents, intake/preparation, internal transport and customer dispatch screens. January fixture dates require the existing isolated controlled storage-clock setup; they must not be entered as a browser-controlled production recognition clock. On a live clock use the company's actual dates and preserve the same period-start/branch rules. Show preview4800/cost5800 before approving the incident100, then preview4700/cost5800 and pay exactly the reviewed full net. Inspect the ordinary and replacement B visit sources individually before changing the tariff. Record company/source IDs, displayed values, device sizes, downloads and any discrepancy. Do not run real payments or source dispatches for this verification.
