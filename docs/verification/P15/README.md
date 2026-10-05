# P15 — actual inter-branch goods transfers

Execution date: 2026-10-05. **Native implementation with local checks; required independent Tawsel and owner manual acceptance blocked. No phase-completion commit or push.** Work began on clean `main` at `0a81328b577883099ecc58e15716eb6cf854553a`, equal to fetched `origin/main`. No branch or worktree was created. The pinned Tawsel source is `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`; this implementation does not edit it.

## Bounded behavior

- Migration `0019_p15_goods_transfers.sql` adds a numeric reference sequence, company-scoped manifest/line/component/return-claim records, immutable actual handover/receipt facts, separately identified native commands, carrier custody, condition and receipt-line lineage. Historical rows are not backfilled as received. The P03 `UnitOfWork`, access grants, audit and command ledger remain authoritative.
- Source staff reserve a whole prepared parcel with its original order allocation or sound unreserved loose stock. A manifest can mix brands. Creation and cancellation leave physical source stock unchanged; handover consumes the claims and moves source physical stock to the manifest carrier. Destination or genuine source-return receipts add only actual sound/damaged/uncertain quantities and preserve the remaining carrier balance. A sealed parcel stays one identity, is inspected externally and never manufactures loose SKU stock. Suspected internal trouble is an incident candidate, not a financial decision.
- The same command ID returns the recorded result; a changed payload conflicts. Manifest version and row locks serialize cancellation/handover and competing receipts. Existing stock positions are locked in sorted branch/brand/variant order. Returned whole parcels require accepted, fully sound, unallocated P14 receipts; transfer claims block competing redispatch/brand handover. Accepted sound loose return balances are claimed when that stock is reserved for transfer, and actual handover consumes the claimed receipt quantity. Physical transfer does not authorize a new Tawsel customer cycle from B.
- Drivers on Tawsel rounds remain selectable. Carrier ranking uses P13 source-filtered received monitoring evidence when configured; stale/unknown evidence is labeled as such and never treated as GPS or a reservation. Native driver activity is checked again at actual handover. ERP transfer produces no Tawsel transport task, customer charge, visit, brand wallet movement or driver commission.
- `/goods-transfers` and `/goods-receipts` use assigned branch and separate screen grants, actual quantity inspection, advanced filters, Arabic RTL and explicit physical actions. Inventory shows native transfer parcels in an outside-branch view; shipment tracking includes transfer facts and current carrier. A-only staff cannot confirm B receipt. A prepared shipment received at B gains a new native shipment branch/revision before its first customer snapshot. Already-accepted A-to-B customer redispatch remains CHECK-003 disabled.

## Reproducible local evidence

Run from the repository root in PowerShell:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run lint
npm run typecheck
npm run build
npm run test:phase -- P15
```

Versions: Node 24.21.0, npm 12.2.0, PostgreSQL 18.6 in disposable clusters, Vitest 5.0.3, Playwright 1.63.0 and TypeScript 6.0.3. The registered phase runner requires unit, real PostgreSQL, connected browser/API and independent public layers. Its output is saved in [phase-run.txt](phase-run.txt), browser machine results in [browser-results.json](browser-results.json), and responsive captures in [screenshots](screenshots/). The public layer fails with `BLOCKED P15 publicIntegration: missing TAWSEL_CONFIG_FILE, TAWSEL_P15_TRIAL_FILE`; it is not silently skipped or replaced with a fixture.

Final checks: lint, typecheck and build passed; the registered phase command passed 12 unit, 8 real-PostgreSQL and 1 connected browser case, then exited 1 at its required public case. P12/P14 regression passed 31 real-PostgreSQL cases in [dependency-regression.txt](dependency-regression.txt). `git diff --check` passed. No completion commit or push was made.

The exact changed-file inventory is in [changed-paths.txt](changed-paths.txt); this includes schema, contracts, services, screens, tests and evidence artifacts.

| Case | Local observation |
| --- | --- |
| Mixed parcel + loose trip | With A holding ten sound units, two allocated to a prepared parcel, reserving the parcel plus three loose leaves A physical ten and reserves five. Handover leaves A physical five, B zero and five with the carrier. B accepts the whole parcel and two loose sound units: B physical four, two order reserved, two available; one loose remains with the carrier. Same command echo has no second movement. A separately receives that unresolved unit without editing the original trip. |
| Cancellation and identity | Prepared cancellation releases reservations without stock movement. Changed payload under the same command ID conflicts. Two competing four-unit manifests admit one reservation. A wrong-branch receiver is denied. |
| Receipt competition and condition | Destination and source-return receipts with the same expected version have one winner. A damaged receipt increases only unavailable stock. Excess receipt is rejected without earlier-line movement. |
| Prior customer return | A full sound P14 return can be claimed for physical transfer; a simultaneous brand handover cannot claim it. Customer redispatch from B remains CHECK-003 blocked. |
| Partial returned loose stock | An accepted sound receipt is claimed when its physical loose stock is reserved for transfer; brand handover cannot claim it concurrently, and actual handover consumes that receipt quantity once. |
| Browser/API | The real API and PostgreSQL browser journey creates/hands over/partially receives a mixed manifest. A-only API access to B receipt is 403. The 320, 390, 768 and 1440 layouts have no horizontal document overflow. The carrier is labeled unknown when live monitoring is absent. |

Local test corrections are preserved in the run history: an early P15 phase invocation omitted `SHAHN_TEST_PG_BIN`, so the Docker-only fallback failed and DB cases were setup-skipped; the pinned native PostgreSQL rerun passed. The first browser script targeted text rather than its labeled checkbox; the locator was corrected and the full real-backend journey passed. An initial lint run found two unused imports; these were removed. Later changes require the final rerun results stated in the execution record; do not infer success from an earlier run.

## Outstanding acceptance and handoff

No `TAWSEL_CONFIG_FILE` or `TAWSEL_P15_TRIAL_FILE` was supplied. A real source-filtered active-round read, real human driver round, and the first Tawsel customer snapshot from B after physical transfer were therefore not observed. The owner manual trial, including a driver on a live round and physical parcel inspection, was not performed. Controlled fixtures prove only ERP behavior. CHECK-003 still requires the documented public A-to-B accepted/return redispatch sequence, revisions, line/quantity/receipt compatibility, positive and negative cases and uncertain-response recovery; no such evidence was supplied.

For P18/P21, `transferIncidentCandidates` exports unresolved carrier balances and suspected internal issues without assigning liability. For P12, shipment branch/revision changes after actual prepared-parcel arrival allow the ordinary first snapshot from B; accepted A-cycle customer redispatch remains blocked. For P22, source-filtered monitoring is consumed through `MonitoringReader`; native transfer facts are not Tawsel events. See [handoff](HANDOFF.md), [bounded traceability](TRACEABILITY.md) and [execution record](../../../phases/execution/P15.md).
