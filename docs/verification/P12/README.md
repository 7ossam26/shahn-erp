# P12 — Customer dispatch and shipping cover

2026-10-04. **Implemented locally; required independent Tawsel acceptance remains blocked.** This is a bounded P12 result, not full integration or production approval. P13 has not started.

## Delivered behavior

- `/dispatch` and `/dispatch/:id` provide authorized Arabic RTL selection, driver readiness, preparation, separate physical receipt, pending/rejected/accepted states, same-action retry, reviewed reread, and predeparture withdrawal/reassignment. Filters use OR within a field and AND across fields, Cairo creation dates, pagination reset and Back restoration.
- Native intent/cycle, immutable source JSON, price/waiver and cover references commit with audit/outbox. HTTP occurs after commit. Whole-parcel claims block competing dispatch/transfer and local cancellation while unresolved. Accepted receipt moves driver custody and consumes the original stored-stock allocations once. Planning failure does not reverse receipt.
- Known brand-paid shipping uses the existing P03 wallet lock/reservation: eligible 100 + pending 500 − cover 60 = eligible payout 40. Pending proceeds do not fund cover; allow-negative does not create payout cash. Only an accepted, physically truthful predeparture withdrawal closes unused cover here. Visit consumption belongs to P13.
- Exact canonical snapshots retain line identities, inspection/comment, prepaid amounts, tariff and original commercial prices. The typed approved-waiver interface preserves goods 250, tariff 50 and waiver 50 while sending shipping 0/total 250. There is no staff HTTP waiver switch or incident approval UI.

## Evidence

| Check | Result and evidence |
| --- | --- |
| Prerequisite PostgreSQL services | 71 P03/P06/P07/P09 cases passed in [01](01-prerequisites.txt). P11 initially failed because the new migration referenced the wrong source table; fixed to `kernel.source_record`. [08](08-database-retry.txt) then passed all 19 P11 and the original 14 P12 cases. Copies of this turn's generated prerequisite records are in [prerequisites](prerequisites/). Earlier phase evidence was restored; pre-existing P10 changes were preserved. |
| Contract and money tests | [33](33-phase-verified-local.txt): 23 P12 tests. P10 valid/invalid fixtures, exact totals/overflow, stable lines, prohibited actor/waiver fields, prepaid/waiver mapping, pending result and correlated definite Problem handling. [36](36-contract-regression.txt): all121 P11/P12 contract cases passed after the pin-coordinate fix recorded in23. |
| Real PostgreSQL and native HTTP | [33](33-phase-verified-local.txt): all22 cases across dispatch, populated upgrade and process/HTTP transport suites passed. Includes independent parcel/transfer and cover/payout races, stock handover, rollback, retained rejection, stale lease, exact restart persistence and authorization/CSRF. Earlier runs17/25 also passed these22 cases. |
| Process interruption over HTTP | `transport.db.test.ts` kills a real child worker after a controlled HTTP fixture commits receipt without replying. A new worker reads the retained result, preserves identical action bytes, performs no second POST and produces one custody effect. This is fixture transport evidence, **not** real Tawsel execution. |
| Actual signed callback echo | [29](29-signed-echo.txt) strengthens the result/event case through the real receiver with HMAC headers; acceptance remains one custody effect. |
| Browser / visual | [33](33-phase-verified-local.txt), [browser-results](browser-results.json): all5 real ERP API/DB browser journeys passed. Selection1440×1050,390×844,320px/long Arabic text; receipt gate/cover; lost native response/reload; unknown remote detail/Back; stale permission. Recovery also exercises actual-at-branch withdrawal. Log25 exposed a test advance-before-commit race;33 waits for the persisted withdrawal state first. A final label correction distinguishes accepted source commands from accepted driver receipt; [39](39-browser-label.txt) verifies the affected page. Screenshots are under [screenshots](screenshots/). |
| Static/build | [34](34-lint.txt), [35](35-typecheck.txt), [38](38-build-final.txt); the registered browser layer also builds the application. No dependencies upgraded. |
| Public integration | [33](33-phase-verified-local.txt): the phase passed all50 local cases then exited1 at its mandatory publicIntegration test, explicitly naming absent `TAWSEL_CONFIG_FILE` and `TAWSEL_P12_TRIAL_FILE`. No independent test Tawsel/issuer/credentials were available. The phase must not be marked fully verified. |

Earlier failed logs02–07,10–11,17–18,20,23 and25 remain. They record type/harness fixes, missing PostgreSQL test environment, asynchronous checkbox/withdrawal assertions and the source pin-number defect. They are not replaced with passing output. [database-results.json](database-results.json) maps individual database case groups to the final all-passed run.

## Reproduce locally

From the repository in PowerShell:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run test:phase -- P12
```

The pinned runtime is Node 24.21.0/npm 12.2.0; this host's isolated PostgreSQL is 18.3. The test support creates separate temporary clusters and never stops the installed database service. The phase includes unit, PostgreSQL, browser and required public HTTP layers; missing public runtime is a failing blocked gate, not a skipped success.

## Owner trial — not yet owner-reviewed

Run `npm run p12:trial` with the same runtime/environment. Open `http://127.0.0.1:5321/api/test/p12-login/admin`. This is an isolated test session, not a real issuer login. Seed identities are recorded in [seed-ids.json](seed-ids.json); secrets are confined to ignored `tests/.p12-runtime.json` while running.

1. Select the ordinary goods-250/shipping-50 parcel and ready driver. Confirm preparation. Its native intent remains separate from receipt. The controlled completion used by the browser test sends the canonical snapshot total 300, then prepares the assignment.
2. Select the brand-paid-shipping-60 parcel. Verify eligible 100 and pending 500 before handover. Physical confirmation reserves 60 and shows payout availability 40 while waiting for source acknowledgement. No visit earnings or company cash movement is posted.
3. The browser harness advances its explicitly controlled source fixture through the authenticated local `/advance` test endpoint; consult `dispatch.spec.ts`. Do not describe this as a Tawsel device journey. To exercise the same assertions automatically, run `npm run test:p12:browser`.
4. The DB cases `reserves eligible 60`, `pending 500 alone`, and `independent cover and payout-allocation` demonstrate rejected payout60, pending-only cover rejection, and contention without balance drift. They call the existing wallet primitive; no physical payout occurs.
5. `transport.db.test.ts` demonstrates response loss/restart. The unknown detail never offers another physical handover. `approved typed waiver journey` proves goods250/shipping0 through the internal service fixture; P18 still owns real incident approval.

## Required external acceptance still unrun

The environment owner must supply an approved independently running Tawsel and issuer, private service configuration, a live native ERP worker, ready/enabled test driver and reachable allowlisted signed callback. Prior P11 evidence already records that these were unavailable; this turn did not ask again or use production credentials.

`TAWSEL_P12_TRIAL_FILE` is a private JSON file with `approvedTestEnvironment:true`, `erpOrigin`, `companyId`, `sessionToken`, `csrfToken`, and four `cases` named `cod`, `prepaid-goods`, `fully-prepaid`, `approved-waiver`. Each includes a reviewed immutable `prepare` native command and expected integer `goodsMinor`, `shippingMinor`, `totalMinor`. The waiver case must have been authorized through the typed incident fixture, with its original command ID retained; the public API cannot grant a waiver. Trial parcels must be physically controlled before the test asserts receipt. Never commit either credential/trial file.

The public smoke suite checks real snapshot/preparation/receipt and duplicate command results. It is **not sufficient alone** to close the remaining mandatory live drills: actual 49→51 planned-stop rejection (including branch stops), source stale revision, disabled driver, departure race, remote commit/lost acknowledgement with signed echo, and real issuer/device readiness. Record these separately against IP-AC-02/03/04/21/22 before full closure. Local fixtures do not establish Tawsel's capacity or departure behavior.

TAWSEL-CHECK-003 still blocks accepted-source branch mutation and returned A→B redispatch. Current code retains the original commercial shipment/cycle and refuses unsupported changes. Visit fees/commission/projection checkpoints are P13; actual received-driver returns and new receipt-funded cycles are P14; incident approval is P18; payout UI is P17. No production migration, deployment, commit, merge, payment, or Tawsel change was performed.

See [HANDOFF](HANDOFF.md), [TRACEABILITY](TRACEABILITY.md), and the [execution record](../../../phases/execution/P12.md).
