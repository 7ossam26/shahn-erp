# P23 — selected reports and reliable exports

2026-10-08. ERP implementation verified within the owner-requested script scope. The owner instructed **“skip browser testing , focus on the scripts”** during this execution. Final browser/device review and the owner physical trial are unrun, not passes. Named inherited Tawsel acceptance remains deferred under the 2026-10-08 exception; the single external handoff is [TAWSEL-CHANGE-REQUESTS.md](../../../TAWSEL-CHANGE-REQUESTS.md). No full integration-readiness or production-capacity claim.

Actual task rollout metadata: **gpt-6.1-sol / high**. Existing `main` started clean at `fb641940b60458de81ef186878a4717cb85ef2a4`; fetched origin was equal (0 ahead / 0 behind). No branch/worktree, owner file discard, deployment, public file publication, Tawsel code edit or P24 work. The phase commit includes these pre-commit records; its actual hash and push result are reported in chat.

## Delivered interface

`packages/contracts/src/reporting` owns the closed nine-report registry, accepted dimensions, date meaning, columns, source formulas, totals, response schemas and generated OpenAPI. `apps/api/src/modules/reporting` owns explicit parameterized read services, scope resolution, immutable snapshots, fenced export jobs, renderers and authenticated downloads. Migration `0027_p23_reporting.sql` is additive to populated0026, changes no old financial/custody history, and enables the existing reports screen. `apps/web/src/features/reports` supplies the focused RTL picker, frequent/collapsed advanced filters, URL-preserved paging/detail/back state, explicit refresh and retained export progress/recovery. Operational surfaces link to their authorized frozen reports. REP-09/10 remain within `/brand-payouts` with its shared-brand financial grant; REP-24/25 remain the existing HR histories. REP-15 is explicitly unavailable until P24.

| Report | Source / meaning | Scope and date basis |
| --- | --- | --- |
| REP-01 | Shipment identity, immutable price/revision, original/effective outcome and current custody separately | `reports`, assigned branches; creation or last state |
| REP-05 | One evidenced visit identity; separate round and internal-transfer records; round closure never fabricates delivery | `reports`, assigned branches; actual visit or round start; a cross-midnight round retains one identity |
| REP-07 | Offered item, actual receipt quantities/condition and actual brand handover separately | `reports`, assigned branches; receipt or offer; unreceived date remains unknown |
| REP-08 | Signed brand journal; scoped opening + selected movements = filtered closing; credits/fees/compensation/adjustments/payouts retain source IDs | `reports`, assigned branches; effective or recorded |
| REP-09 | Existing wallet formula `max(0,E−D−H−C)`, pending/held/cover/eligible and cumulative paid money; branch-source breakdown | `reports` + `brand.payout`, approved shared company-brand wallet; current snapshot |
| REP-10 | Actual full/partial brand payouts once, paying branch/account/method and immutable source identity | Same approved shared wallet, independent from account/unrelated report grants; actual or recorded |
| REP-12 | Signed money journal, current book/held/available, treasury in transit and unresolved account observations; no revenue inferred | `reports` + `finance.accounts`, assigned branches and existing account usage; actual or recorded |
| REP-14 | Actual paid expenses, historical category/method/account/actor and retained entry timestamp; no unpaid obligations | `reports`, assigned branches; actual paid or recorded |
| REP-18 | Current physical stock, reservations, sound availability, unavailable pieces and separate carrier custody; sealed parcels have separate units | `reports`, assigned branches; current snapshot, never period movement sums |

Lists use OR within a dimension and AND between dimensions, inclusive integer minor bounds and normalized Arabic/Persian search digits. All SQL/column/sort fragments are server-owned. Dates use Africa/Cairo half-open UTC bounds including 23/25-hour timezone transitions. Materialized rows use deterministic date/identity/branch ordering; pagination25/50/100 reads frozen ordinals. Limit20,000 rows /24MiB serialized source rows, artifacts64MiB: oversized queries fail with a narrowing instruction rather than silently truncate exports. Source coverage records immutable source/checkpoint identity, revision, received/applied sequence, history/readiness and update time; gaps/unknown dates remain visible. Coverage truncation is explicitly flagged.

Snapshot creation sets PostgreSQL REPEATABLE READ before authentication/source reads. Rows, totals, context and coverage are persisted together, with principal/company, authorized scope/revision, asOf, normalized filter digest and data digest. An explicit refresh creates another snapshot; later corrections do not rewrite old rows. No transaction remains open during formatting or artifact publication. Snapshot retries retain command identity; exports use P03 command payload identity/result lookup and its bounded lease/fencing lane. Actual child-process exits before/after publication recover a single artifact identity. An independent export poll does not gate inbox processing. Artifacts are nonpublic PostgreSQL bytea behind current authorization; links are reauthorized on each download, denied after revocation, and expire at the approved24-hour default. Expiry removes only bytes, retaining immutable snapshot/business/result metadata.

ExcelJS writes real XLSX, RTL/frozen headers and every snapshot row. Formula-like user text remains a literal string, numeric references remain text, and EGP uses exact decimal text converted with BigInt (including values beyond Excel's numeric precision). Money cells intentionally use text, with exact minor units retained in source sheets; no floating point workbook sum replaces verified snapshot totals. Unknown money remains unknown in both formats. Print/PDF uses local embedded Cairo font, Arabic RTL A3 landscape, wrapping, repeated table headers, page numbers, filters/date/unit/formula context and snapshot totals. Both writers consume the same persisted values. Browser automation here is only the Chromium PDF renderer; the owner excluded UI browser testing.

## Executed evidence and reproduction

Use the pinned runtime and explicitly select the verified native PostgreSQL18.3 binaries on this host:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = (Resolve-Path -LiteralPath '.tools/p18-postgresql/pgsql/bin').Path
npm run test:phase -- P23
npm run test:unit
npm run typecheck
npm run lint
npm run build
git diff --check
```

Final phase28/28 (`phase-gap-final.txt`), full unit676/676 (`unit-regression-final.txt`), runner1/1, typecheck, lint and build logs are stored alongside this document. `phase-final-rerun.txt` records the first correction of the additional cash-observation fixture; the final passing rerun is identified in the execution record. Do not mistake earlier failed attempts for passes.

Prerequisite query/source rerun: `npm run test:db -- tests/db/finance.test.ts tests/db/treasury-transfers.test.ts tests/db/inventory.test.ts tests/db/kernel.test.ts tests/db/access.test.ts tests/integration/p13/execution.db.test.ts tests/integration/p13/monitoring.db.test.ts tests/integration/p14/returns.db.test.ts tests/integration/p15/transfer.db.test.ts tests/integration/p16/remittance.db.test.ts tests/integration/p17/payout.db.test.ts tests/integration/p19/storage.db.test.ts tests/integration/p20/sources.db.test.ts tests/integration/p21/settlements.db.test.ts tests/integration/p22/recovery.db.test.ts`: **193 cases /15 files passed** in [prerequisites-native.txt](prerequisites-native.txt). Includes P02 revocation/P03 command, journals/stock/return/transfer and P09/10/13/16/17/19/20/21/22 real services. A Docker fallback failed; the explicit native rerun passed. Prerequisite-generated old-phase outputs were copied under [prerequisite-evidence](prerequisite-evidence/copied-paths.txt), and original committed phase records restored. No historical phase evidence is replaced by P23.

P01 browser foundation **8 cases passed before the owner's browser exclusion**: [P01-browser.txt](P01-browser.txt). Worker lifecycle/bounded lanes remain covered by the full unit scripts and actual source/export overlap below. Earlier P23 connected-browser attempts produced partial 27-row exports, expense detail/back/refresh and320/390/768/1440 captures but failed selectors/role assertions; retained [browser-first.txt](browser-first.txt), [browser-results.json](browser-results.json) and `screenshots/` are historical, not a passing final browser gate.

Available independent live P22 rerun: `npm run test:p22:public` using owner-provided private configuration paths (not committed): **8 cases /3 files passed**, [prerequisite-live-rerun.txt](prerequisite-live-rerun.txt). The initial7/8 failure was an expired native isolated staff session; [p23-live-session.ts](../../../scripts/verification/p23-live-session.ts) renewed that original unrevoked fixture binding, then the actual suite passed. [live-session-probe.txt](live-session-probe.txt) retains401→200 without secrets. No driver impersonation/new Tawsel integration. This available read/replay/restore/TLS authority evidence does not close CR-001/CHECK-003/joint-index deferrals.

## Numeric and artifact acceptance

The isolated P23 company reuses the P17 fixture, retaining its other funded accounts; the required trial below is independently scoped to the newly created P23 Cash A/B accounts. The all-account format sample therefore includes other genuine fixture funding, not a claim that company-wide money totals1000. The P23 fixture invokes actual prior command services: money funding1000 atA, paid expense200, treasury send300/receipt300 toB, actual P13 goods250/shipping50 execution and P16 remittance300 toA, then brand payout100. Independent journal sums/IDs reconcile **A700, B300, eligible150, actual payout100, expense200**. Funding and internal transfer remain general/transfer movements, not income. [reporting-database.json](reporting-database.json) retains full rows, source identities, scopes/digests and independent oracle. Prepaid zero goods create no goods credit; accepted full→partial correction keeps the original snapshot and one visit identity. Backdated expense appears in its actual day; independent source/expense commits during preparation cannot split summary/detail reads. Negative/positive account observations retain observed differences separately from posted/spendable balances.

[custody.json](custody.json) retains actual receive10/reserve4/loose-transfer2: A on-hand8/reserved4/available4, carrier2, destination availability0; receipt gives destination2 and conserves quantity10. Prepared components keep the original order claim. Separate supported return fixtures offered2/received1/handover1 and offered3/received2/handover1 distinguish carrier remainder from actual branch stock and handover. Positive return/stock artifacts are [returns-2-1.xlsx](returns-2-1.xlsx), [returns-2-1.pdf](returns-2-1.pdf), [stock-transit.xlsx](stock-transit.xlsx), [stock-transit.pdf](stock-transit.pdf).

The labelled shipment filter has **27 distinct rows**, pages25+2, and full XLSX/PDF27. [exports.json](exports.json) retains worker exits76/77, reclaim attempts and exact retained artifact identity, expiry and real PDF/inbox timing. [http-upgrade.json](http-upgrade.json) verifies populated0026→0027/current migration and unchanged journal/source/allocation/stock/visit/expense/grant history, real HTTP closed validation/CSRF/ownership/forged branch/download/revocation and independent account grant rejection.

[all-report-formats.json](all-report-formats.json) identifies eighteen completed real jobs and their snapshot IDs/digests/row IDs/hashes. [reports](reports/) contains each selected report's actual XLSX/PDF. Every workbook data cell, source row identity and declared total is parsed against its materialized snapshot. An empty returns report in the common finance fixture is genuine; the separate return fixture verifies populated facts. `same-snapshot-27.xlsx`/`shipments-27.pdf` and `same-snapshot-expenses.xlsx`/`expenses-200.pdf` share frozen identities. `writer-precision.xlsx` independently proves a long reference900719925474099312345 and EGP92233720368547758.07 remain exact strings. Tests also verify unknown money remains unknown.

Independent output inspection:

```powershell
& 'C:/Users/7OSS/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tests/integration/p23/inspect-artifacts.py 'C:/Users/7OSS/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin'
```

[artifact-inspection.json](artifact-inspection.json) records pypdf/OpenPyXL snapshot checks, all27 PDF references, expense200 and no Excel formula cells. Poppler page PNGs and contact sheets are under `pdf-pages/`. All19 final pages across13 PDFs were visually inspected after the final formatter run through four contact sheets, with cash/return/stock/shipment-final pages also opened at original resolution. Arabic text wraps, repeated headers and all totals remain unclipped, page numbers are present; long tariff/source identifiers wrap within cells. REP-12 context now fits one page, stock parcels two pages, shipment register28 rows four pages, filtered27 rows three pages. This is actual artifact inspection, not merely HTTP200.

Query plans: eight real `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON)` outputs in `reporting-database.json`. The small fixture uses existing company/source/identity and custody/reservation indexes plus additive `p23_visit_scope_date(company,branch,work_at,id)`, `p23_journal_scope_date(company,family,branch,effective_date,id)`, `p23_return_receipt_date(company,branch,observed_at,id)` and export expiry index. These serve principal scope/date and lifecycle predicates. Optimizer scans on small relations are retained, not forced index claims. REP-09 consumes the already-tested wallet read service; no arbitrary SQL engine. Final timing: eleven source events apply in520.66ms during533.64ms overlap; separate27-row PDF completion1029.83ms. These are one-fixture functional samples, not evidence of production export/inbox capacity.

## Acceptance boundaries

| Case | Script evidence |
| --- | --- |
| P23-A01 | Nine report jobs; parsed workbook cells/rows/totals, same snapshot identity in PDF; expense200 and27 shipment references; visual PDF inspection |
| A02/A03 | Real HTTP/service rejects forgedB, other owner/company and tracking-only creation/export/download |
| A04 | Script UI preserves filters/page/detail URL, resets pagination/snapshot on query changes, differentiates empty/error and keeps unknown-response intent |
| A05 |27 selected rows, pages25+2, exports27 |
| A06 | Actual worker process death before/after publish, lease fencing, one retrievable artifact identity |
| A07 | Removed report/account/branch grants deny old authorized links; wallet scope remains independent |
| A08 | Actual separate visit/round/transfer and stock/returns fixture identities/quantities |
| A09 | Independent concurrent late entry and accepted source correction; old immutable snapshot stays coherent, explicit refresh sees new facts |

The UI implementation/script coverage is narrower than browser/device/owner manual acceptance. Owner physical stock/return/driver-location trial remains unrun. Current tests consume actual canonical-shaped P13 source records and native workflows; their native fixtures do not replace the later independent human/Tawsel gates. No operating profit, formal inventory count, invoices/tax, Excel intake, BI, saved filters, portal or unselected catalog page. Dependencies, bounded audit observations and P24 interface are in [DEPENDENCIES.md](DEPENDENCIES.md) and [HANDOFF-P24.md](HANDOFF-P24.md).

Final pre-commit review: all required script gates pass; normal diff check passes and main/origin remain equal before the P23 commit. Credential review scans all changed/new files against16 actual supplied/generated private values, with zero matches. An earlier scanner hit was a public command-type discriminator under a credential-operation key; the retained credential-scan-public-discriminator.json documents that false positive, and the corrected scanner excludes public type/identity labels, not credential bytes. Transcript trailing whitespace/encoding normalization preserves result text/failures and records before/after hashes. Actual lock/migration/export identities are in artifact-identities.json. Final commit/push identities are reported in chat.

Latest post-review correction: cash/current-stock snapshots now visibly flag persisted checkpoint gaps and pending financial readiness. One extra real database boundary case injects only checkpoint coverage (not business facts); P13/P22 independently test actual out-of-order sources. Final phase8 unit/UI +20 database passes in phase-gap-final.txt; latest typecheck/lint/build pass in *-gap-final.txt. All final artifacts were regenerated and all19 pages inspected again; the current19-page ledger supersedes the earlier20-page sample without deleting earlier command logs. Filtered27 rows print on3 pages,28-row register on4, current parcels on2; layout and totals remain unclipped.
