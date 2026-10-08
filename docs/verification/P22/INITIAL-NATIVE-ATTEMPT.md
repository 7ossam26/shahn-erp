# P22 verification

Date: 2026-10-08 (Africa/Cairo). **Verified within the implemented native script scope; required public and dependent contract acceptance blocked. P22 is not complete.** Browser testing is excluded by the owner's later instruction to focus on scripts. No fresh browser/manual pass is claimed.

Started on clean `main`, `03bd15385a71413e71ea79825de491e8ee594fce`, equal to fetched `origin/main` (0/0). No owner changes, branch, worktree, staging, commit or push. Agent: Codex/GPT-6; exact model selector/effort is not independently exposed. The recommended model in the prompt was not treated as a model change. No subagents, Tawsel repository edits, production access or P23 work.

## Implementation and invariants

Migration `0026_p22_recovery.sql` adds recovery intent/evidence, current projections, checkpoint revisions/rebuild flags and report-outbox association. Jobs use P03 `work_item` leases/fences. Reports and delivery retries use P11's source outbox. A populated 0025 database with posted remittance/payout was upgraded: inconsistent counters were preserved and marked `rebuild_required`, with compared business rows unchanged. No financial-history backfill or second job framework.

Replay uses the six exact aggregate types, begins after the committed applied prefix and follows `nextAfterSequence`. Each page allows 100 events, a job 100 pages, and automatic classified retry five attempts. Network reads precede source/lease/checkpoint/native-basis revalidation. Inbox, evidence and cursor commit atomically; injected failure rolls them back, old fenced responses cannot write, and a live callback invalidates a stale basis. A competing worker cannot claim a lease while the first network read is held.

Callbacks/replay share concrete inbox and semantic identities. Replay records unsigned HTTP provenance; the first subsequent signed callback binds immutable authenticated bytes. Later signed body collisions fail. Sequence 3 before 1/2 updates received high without inventing contiguous receipt/application. A snapshot through 3 leaves application at zero/history incomplete; late history records one visit without extra money. Snapshots validate closed identity/version/current source/cycle/assignment/outcome compatibility and original return identity. Accumulated `returnItems` cannot be reset using original zero counters. Current state/provenance is exported separately; no missing receipt, paid entry, historical fee or event is synthesized.

Native HTTP checks current sessions/company/branches, origin/CSRF and closed requests/responses. Revoked cached-job access is rechecked. Sender delivery queries have no branch selector and require all-company-branch authority; unmapped known streams do too. Accepted native commands establish streams even before callbacks/list reads; guessed UUIDs do not. Sender `received` means durable receipt and `projectionStatus` remains `unknown`. Reports contain committed counters and are `receiver-reported`; reporting never advances local application.

`/integration/recovery` and detail expose independent coverage, gaps, classified errors/attempts, shipment links and safe next actions. Filters include aggregate, authorized branch, state, failure and Cairo time. Unknown requests retain identity; known input rejection releases it for a reviewed new intent. Existing source/event/identity pages remain linked. No force success, arbitrary JSON mutation, bulk receipt or manual money controls. Final UI browser review is excluded; code is built/typechecked.

## Runtime and source provenance

Observed tools: Node `v24.19.0`, npm `11.1.0`, native PostgreSQL `18.3`, Vitest `5.0.3`. Engine declarations remain Node `24.21.0`/npm `12.2.0`; this mismatch is recorded, no toolchain upgrade performed. Tests create isolated disposable clusters with real commits/independent connections and native fixture sessions. No production data or live issuer is substituted.

Pinned baseline: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`, version `1.0.0`. [Integrity evidence](baseline-integrity.json) verifies 29 schemas and three fixture/vector files, accounting for LF/CRLF. Consumer SHA-256 `cbff563ea8ea28a6af9f557e85bab0097c89a095d2cb6ca74e3d066d26352fe1`; outbox `acae29b68e9e267b2d1f495c6904880f421f3959684a3c14c8fa7c40f34bbf5b`; sender `cbce5b5128d8d2f5cf6c58668c989e6b403876531703921a16834dbcf9fb1f06`. No new baseline was supplied/adopted.

Reading: 01/02/03/07 fully; 04 authority 11–139, sender 141–173, delivery/replay 196–550, monitoring 5476–5981, reconciliation 5982–6158 and selected external receiver/security; 05 consumer 2765–3287, envelope 6236–6379, sender 6381–7022 and outbox 8807–9526. Concrete intake/returns/outcome/correction/current/eligibility/closure and selected notice dependencies were inspected through hash-verified local definitions. P25/P26, monitoring fixtures and signature vector were inspected in focused batches. Some combined outputs were truncated; no claim that all of 04–06 or every nested/example body was independently read in this task. Historical complete selected static-reading evidence retains its own provenance, unrelated sections remain index-only, and runtime conformance is still pending.

The [44-operation/27-event ledger](OPERATION-EVENT-EVIDENCE.md) distinguishes definitions, nine supplied sender examples, eighteen generated envelopes and local HTTP/database proof. Every variant has positive, concrete extra-field negative, scope and unsupported-version validation. Configure/rotate/retry fixtures are generated from exact definitions. Parser tests do not prove real service/human authority. P11–P21 retain ownership of their business cases.

## Commands and results

```powershell
$env:SHAHN_TEST_PG_BIN=Join-Path (Get-Location) '.tools/p18-postgresql/pgsql/bin'
npm run test:phase -- P22
```

Latest recorded phase run: **7 unit / 8 real PostgreSQL cases pass**, browser **NOT APPLICABLE by owner instruction**, then **3 blocked/failing public cases**; command exits nonzero. [Final phase transcript](phase-last.txt). Earlier attempts and subsequent affected checks are preserved separately. Required gates were not converted to mocks/skips to get a green phase.

| Command | Actual result and boundary |
| --- | --- |
| `npm run test:unit` | 667/667 passed before the later one-case classifier addition; native regression, not public authority. [Transcript](unit-regression.txt). |
| `npm run test:db -- tests/integration/p11/boundary.db.test.ts tests/integration/p13/execution.db.test.ts tests/integration/p14/returns.db.test.ts tests/integration/p20/sources.db.test.ts` | 47/47 pass: receiver/source-worker/DB restarts, visit/correction, return receipt/disposition/redispatch races and protected payroll. [Transcript](regression-rerun.txt). |
| Targeted P13/P16/P17 money selection | Four selected cases pass: visit, late correction after remittance, late correction after payout, payout/cover contention. Initial P20 isolated selection failed because it excluded its fixture-producing earlier test; full P20 sources passed in the 47-case rerun. [Initial transcript](regressions.txt), [payout](payout-regression.json), [payroll](payroll-regression.json). |
| `npm run test:db -- tests/integration/p19/worker-process.db.test.ts` | 1/1 pass: actual worker process, four queues, clean shutdown. [Transcript](worker-process.txt). |
| `node scripts/verification/p22-audit.mjs` | 44 operations, 27 events, 32 immutable files verified; counting/integrity only. |
| `npm run lint`, `npm run typecheck`, `npm run build` | Final passes: [lint](lint-last.txt), [typecheck](typecheck-complete.txt), [build](build-last.txt). Build warns about the existing large application chunk. |

Earlier failed attempts remain in transcripts. Initial phase ordering hit public absence first; ordering changed without removing gates. Initial fixture/schema errors were corrected. Expanded restore cleanup exceeded ERP's 5-second statement timeout; only owned disposable DB cleanup received a bounded 30-second administrative timeout. Pagination exposed missing registration before a callback; accepted native commands now populate the registry under source locking. A second assertion incorrectly prohibited another worker from claiming a newly available next page; holding the network read now proves concurrent exclusion. A later shipment-detail query referenced a nonexistent return-item column; it now uses the actual native cycle foreign key, with task/return detail regressions. No money/custody invariant was relaxed.

Earlier browser attempts found a display/input date-converter bug (fixed), then expected 403 where grant revocation correctly revoked the session (401). Failures/screenshots are retained; corrected browser assertion was not rerun after owner exclusion. Widths 1440/390/320/768 and expired detail captures are historical native API evidence, not final acceptance.

## Restore and acceptance limits

[Restore comparison](restore-comparison.json) records backup database-clock point/duration. `pg_dump`/`pg_restore` targets a separate generated database. Actual native remittance `30000` minor units and payout `10000`, one visit/earning/allocation and parcel custody existed before backup. Fresh API/worker instances accept every original message twice through signed HTTP. Normalized source/journal/wallet/cover/custody/stock/return/visit/outcome/allocation/remittance/payout/payroll hashes/counts match before backup, after restore and after redelivery. Empty categories are visible; not every return/payroll category is populated in this backup fixture. A separate nonempty stored-stock return/snapshot test proves receipt deduplication.

Arbitrary/production targets are refused; cleanup is confined to verified owned temporary fixture paths/database. Needed durable test connection/key references stay in the fixture in memory. No production secret restore, OS API/worker or live Tawsel/issuer restart claim. Recovery covers the committed backup point, not zero loss after it. Restore duration is not projection latency.

| Owner | Observed missing prerequisite | Affected gate |
| --- | --- | --- |
| Test-environment operator | No `TAWSEL_CONFIG_FILE`, `TAWSEL_P22_TRIAL_FILE`, active dedicated scoped service/issuer, separate human sessions or allowed callback. P18 pilot source/user disabled and temporary callbacks/keys removed during cleanup. Current runtime commit/version and real proxy/body limits unavailable. | Applicable current public IP-AC-01–15/19/20; IP-GAP-003/004/006. |
| Tawsel contract owner | Approved CR-001 replacement baseline/07 adoption absent; legacy closed schemas have no approved reason/Other fields. | IP-AC-18 / IP-GAP-001. |
| Tawsel engineering/contract owner | CHECK-003 exact accepted A→B and A-receipt→B new-cycle sequence/revisions/allocations/positive-negative artifacts absent. | Affected IP-AC-11 / IP-GAP-002. Independent physical transfer is not disproved. |
| Acceptance reviewer/operator | Reviewed current producer/authority/recovery/rotation/proxy/latency/restore evidence index absent. | Public completion gate; local fixtures cannot substitute. |

ERP-R-029: **sample count 0 actual accepted public events this run**. Representative concurrency/body/network, clock offsets, cold/warm p50/p95/max and confirmation→receipt→commit→authorized-read/visible timings are unmeasured. The approximately five-second healthy target remains an explicit performance item; no local timer/restore time is presented as its guarantee. Outage/backlog tests are separately labelled harness cases.

The complete requested P16 shipment/round → dropped callback → gap/replay → duplicate return/visit → restore → later real correction → authorized P21 resolution → stale monitoring/expired credential manual trial was **not executed**. Script components prove narrower invariants. With an approved isolated live environment, follow the phase's ordered manual trial with identified actual shipment/round and separate human producers; record cash/payout/stock/fee/commission/review/hold/source-range differences. P21 typed resolution remains its existing workflow, never an integration override.

`TAWSEL_P22_ACCEPTANCE_FILE` is a native evidence index, not a Tawsel wire extension: kind `reviewed-public-trial`, baseline/runtime full commits, reviewer/date, unique records (id, passed result, actual-http or reviewed-contract kind, relative path, SHA-256). The public suite checks each inventory/gap/performance/restore and CR-001/CHECK-003 record's provenance and executes scoped public reads. It does not execute all human producers or certify their reviewed records itself. No index is fabricated from local passes. A changed baseline must first be adopted through 07 and adapters revalidated.

See [traceability](TRACEABILITY.md), [consumer handoff](HANDOFF.md), [execution](../../../phases/execution/P22.md). Required failed/blocked gates prevent a completion commit/push. Work is preserved on `main`; stop after P22.
