# P24 connected browser and output verification

The connected browser gate passes **3/3 journeys** against the actual ERP API, services,
immutable report snapshots, export worker and an isolated labelled PostgreSQL18 cluster.
The cluster is disposed by the harness. The browser uses Chromium, Arabic locale,
Africa/Cairo and reduced motion. This is automated local evidence; physical phone and
owner manual review remain unrun.

Command: dot-source `scripts/use-pinned-runtime.ps1`, set
`SHAHN_TEST_PG_BIN` to the resolved `.tools/p18-postgresql/pgsql/bin`, then run
`npm run test:p24:browser`. Actual runtime: Node24.21.0/npm12.2.0. The focused UI
rerun passes3/3 in37.1seconds; final result and build output:
[UI-final-focus-rerun.txt](UI-final-focus-rerun.txt),
[browser-results.json](browser-results.json). The first attempt failed because
Playwright's API request context did not send the fixture's Secure session cookie
over localhost HTTP, while the actual browser UI did. Explicit session-cookie headers
in the harness's direct HTTP assertions resolved the test setup; the failure remains
in [browser-attempt-1.txt](browser-attempt-1.txt).

Earlier connected3/3 evidence remains in [browser-attempt-2.txt](browser-attempt-2.txt).
The final focused-summary attempt initially failed at a newly added ordinary source
navigation assertion: tracking shows the numeric shipment reference and operational
journey, while the brand reference lives in the linked ordinary shipment detail.
The corrected journey opens both actual records and checks their visible fields.
That early stop also prevented its later10EGP expense, revealing an unintended test
sequence dependency in the large-value expectation. The large journey now compares
its own frozen starting report against the exact31 newly posted expense commands
and source-count delta. Neither API behavior nor numeric checks were weakened.
Those failures remain in [UI-final-focus.txt](UI-final-focus.txt); the corrected
connected rerun is the37.1second pass above.

## Recorded journeys

- The real A01 fixture displays6200 EGP. Category selection preserves snapshot, filters
  and period, opens its permitted source rows, opens original effect identity/source
  path, and returns to the same category and summary. It follows the actual shipping
  source into the tracking journey and ordinary shipment record with its brand
  reference, follows the expense source into its ordinary paid-expense record, and
  follows the storage source into its agreement/period screen. The XLSX contains all eight
  sources and the same6200 total, and the PDF contains the same snapshot and values.
- A later actual paid expense of10 EGP retains the old6200 snapshot after reload.
  An explicit new snapshot shows6190. The earlier one-day report exposes the later
  entry notice. A2099 empty period retains its selected dates and shows an empty state.
  IDs, frozen payloads and results: [browser-snapshots.json](browser-snapshots.json).
- A reports-only user can read the authorized summary but receives403 on ordinary
  salary source details. Summary rows omit private provenance. A forged branchB
  request by branchA staff receives403. Revoking the employee capability denies
  existing salary detail and export download; revoking the report grant denies
  existing snapshot and download. Evidence:
  [browser-authorization.json](browser-authorization.json).
- An isolated account cache fault of123 minor shows1.23 EGP exact delta with source
  version and the existing lawful review path. The reviewed account rebuild primitive
  restores agreement while keeping source cash untouched. Thirty-one new domain
  expense commands include an exact9007199254740993 minor amount, produce forty
  economic sources and preserve all sources in exports. A known source checkpoint
  gap marks the report incomplete while valid category amounts and source counts
  stay unchanged and available through category navigation. The paid-expense source
  list paginates25+8 rows; exports preserve the entire forty-source snapshot. Evidence:
  [browser-reconciliation-and-large.json](browser-reconciliation-and-large.json).

## Responsive and visual evidence

The journeys check no horizontal document overflow at1440×1050,390×844,320×844 and
768×1050, with normal and long Arabic branch names and large signed amounts. Controls
have labels and44px minimum targets; keyboard Tab moves focus from the document.
The current focused Arabic RTL shell and reversible white/lime palette are retained.

The profit overview shows the short category list, shipping/payroll distinction,
current money and reconciliation. Individual economic-effect cards and pagination
appear only after selecting a category. The overview does not duplicate the generic
raw context display. Applied period, date basis and authorized branch labels are
human-readable. The empty selected-filter state and known partial totals remain
explicit; hiding the overview source dump does not alter stored rows or exports.

Captures are in `screenshots/`: `profit-{1440,390,320,768}.png`,
`long-large-{1440,390,320,768}.png`, `empty-768.png`, `later-entry-768.png`,
`source-denied.png`, `reconciliation-fault.png` and `incomplete-768.png`.
The final desktop and phone profit pages were visually reviewed, as were all rendered PDF
pages below. Snapshot category focus is a read view; the export action explicitly
states it exports every source selected by the frozen report's filters.

Final full-page capture dimensions are1440×4352,390×5281,320×6278 and768×4538.
The390px capture is2872pixels shorter than the earlier8153px source-card overview
(35% shorter). Large/long captures are1440×4352,390×5391,320×6376 and768×4450.
Arabic labels, signed exact amounts, wrapped formula/limitation and current-money
sections are readable; no clipping or horizontal overflow was observed. The remaining
vertical content consists of the selected categories and distinct actual-money
components, with payroll and branch detail collapsed initially.

## Independent export inspection

The bundled Python/Poppler inspection is
`tests/integration/p24/inspect-artifacts.py <Poppler Library/bin>`.
It parses the XLSX with OpenPyXL and PDF with pypdf; asserts snapshot identity, RTL,
text source IDs, no executable formula cells, economic source/category/branch sum
agreement and presence of every exact source amount and profit total in the PDF.
It renders every page through Poppler.

The four currently generated pairs contain ten pages:

| Pair | Source rows | PDF pages | Profit minor |
| --- | ---: | ---: | ---: |
| browser-profit |8 |2 |620000 |
| browser-long-large |40 |4 |-9007199254124993 |
| operating-profit |9 |2 |630000 |
| storage-january-620 |2 |2 |62000 |

Latest browser evidence records6200 snapshot
`bec1d2bf-3c4b-40f0-94e8-2bbaacc70ac4`, refreshed6190 snapshot
`3c590d22-78c0-4a30-af49-8286567c19bd` and forty-row large snapshot
`eab209c4-0019-4618-9463-6cc17ae7d1cd`. The structured browser files retain the
exact generation dates, scopes and every source effect; subsequent required phase
reruns may generate fresh identities for the same measured acceptance values.

`operating-profit` is the separate connected service fixture after its linked incident
correction; its6300 is not the unchanged A01 sample. The January storage sample
contains two independently earned310 periods. Parsed checks:
[artifact-inspection.json](artifact-inspection.json),
[artifact-inspection-first.txt](artifact-inspection-first.txt).

All ten pages were visually viewed across `pdf-pages/contact-1.png` through
`contact-3.png`. Arabic joins, RTL column order, long branch wrapping, exact signed
values, totals, repeat table headers and page-number/snapshot footers are readable
and unclipped. Table rows do not split across pages. Current-money context continues
on a separate page where needed. Generated local files are verification samples,
not a production-capacity or full integration-readiness claim.

## Owner trial

Run `npm run p24:trial` with the same isolated PostgreSQL configuration. Open
`http://127.0.0.1:5424/api/test/p24-login`, choose Operating profit, and select the
current Cairo month with effective date basis. Expected initial result6200 EGP.
Open shipping:10000 EGP; storage:2000; employee cost:4000; expense:1500;
compensation:500; approved employee share:200. Open a category, then source detail,
and return to verify the period/filter/snapshot identity is preserved. Export XLSX
and PDF and compare the same totals and source count. Use the reports-only test
actor through `?actor=summary` to observe the source-detail denial. The harness's
secret-protected fault controls operate only on isolated test data. No human
completion is claimed by these automated steps.


Final regenerated samples2026-10-09: phase-gate-closed-20261009.txt passes3/3 browser journeys in37.5seconds. artifact-inspection-closed-20261009.txt and artifact-inspection.json refer to these latest frozen snapshot IDs. All ten final pages were visually rechecked through contact1–3; no clipped columns, split rows, lost totals or unreadable Arabic joins were found.
