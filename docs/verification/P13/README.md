# P13 — execution projections, visits and tracking

2026-10-04. **Implemented locally; required independent Tawsel/human acceptance remains blocked.** P14–P26 were not started. Baseline: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`. All source payloads use that baseline's closed schemas. Controlled source fixtures are not independent Tawsel conformance.

## Implemented scope

- Explicit ownership of all 27 subscribed events; ordered source/recipient-stream projection, immutable visits/outcomes/correction lineage, retained canonical money and timestamps, atomic journal/checkpoint commit, explicit dependency reasons, P14 return-handler pending state.
- Actual-arrival visit recognition, immutable accepted prices and employee terms, base-only percentage commission, pending goods credit, outcome-dependent payer allocation, shipping-cover consumption, linked unprotected corrections and protected settlement reviews. No company cash receipt, payout or payroll command is made by this worker.
- Authorized monitoring GETs with stable complete pagination, cache reauthorization, 304/404/409/503 handling; explicit source-history recovery without invented event sequences; a versioned received-evidence witness for P16.
- Company-wide operational tracking with its own grant; home search, query/Back state, advanced filters, Arabic/Cairo timestamps, current custodian and source-labelled timeline. Earnings and reviews have separately authorized read pages. No tracking access to HR or financial accounts.
- Local latency observations preserve confirmation, receipt, projection write, after-commit observation and first authorized detail read. Remote-clock offset has not been measured; canonical-to-visible latency is **unknown**, not a passing five-second claim.

## Commands and evidence

Use the pinned runtime and a disposable PostgreSQL installation:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run typecheck
npm run lint
npm run test:phase -- P13
```

Node 24.21.0, npm 12.2.0, PostgreSQL 18.3. The phase runner requires unit, database, browser and independent-public layers; it must not pass when public acceptance is absent.

| Evidence | What it establishes |
| --- | --- |
| [01-prerequisites.txt](01-prerequisites.txt) | 33 prerequisite cases: P08 employee mapping/terms, P12 dispatch and migration checks. Real isolated PostgreSQL; P12 source responses are fixtures. |
| [04-unit.txt](04-unit.txt) | 167 closed-contract/ownership/valid-invalid fixture cases. |
| [15-history-database.txt](15-history-database.txt) | Earlier 17-case local DB/HTTP run, including history recovery and witness invalidation. |
| [19-phase.txt](19-phase.txt) | First registered phase run: contracts passed; one new second-driver test exposed incomplete external mapping in its fixture. Other 19 DB cases passed. |
| [24-phase.txt](24-phase.txt) | Final registered phase attempt; exact per-layer results, including required public blocker. |
| [22-kernel-regression.txt](22-kernel-regression.txt) | All 21 P03 kernel cases passed, including actual killed-process recovery and committed persistence. |
| [26-typecheck.txt](26-typecheck.txt), [27-lint.txt](27-lint.txt) | Static checks after implementation fixes. |
| [29-monitoring-final.txt](29-monitoring-final.txt), [30-browser-final.txt](30-browser-final.txt) | Follow-up source reauthorization and navigation fixes:8 monitoring/HTTP and4 browser cases passed; production rebuild succeeded. |
| [31-final-static.txt](31-final-static.txt) | Final lint, typecheck and worker/build verification. |
| [33-round-membership-final.txt](33-round-membership-final.txt), [34-final-typecheck-lint.txt](34-final-typecheck-lint.txt) | Final21 database/HTTP cases and repeated static checks passed after adding explicit round/task membership rejection. |
| [screenshots/](screenshots/) | Current mobile/desktop browser captures; seed identities in `seed-ids.json`. |
| [screenshots-before-style-fix/](screenshots-before-style-fix/) | Retained initial visual evidence: search styling collided with an existing class; renamed to a P13-specific class and recaptured. |

Earlier failed checks remain in this folder: 03/13 TypeScript errors were fixed, 05 used the wrong native shipment identifier in a test, 07 expected the wrong denial code, and 12 had an ESLint expression error. They are not counted as passes. The populated migration test creates P12 data through migration 0016, then applies 0017. The restart case stops and restarts a real database after commit; it does not rely on an outer rollback.

Final local totals:167 contract tests,21 database/HTTP tests,4 browser tests, plus21 kernel regression cases and33 prerequisite checks. The required public test is **blocked/failing**, so the phase command intentionally exits nonzero. Screenshots were visually reviewed for readable Arabic, visible search controls, long text and no mobile horizontal overflow. The final detail has one contextual Back link; loading/empty/error/pending states preserve their distinct meanings. No live-device or owner approval is inferred from browser automation.

## Local owner trial

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run p13:trial
```

Open `http://127.0.0.1:5331/api/test/p13-login/admin` or `/api/test/p13-login/staff`. These login routes exist only in the isolated trial harness. API 4331, browser 5331, protected test control 4332. Ctrl+C stops the disposable harness. `tests/.p13-runtime.json` is ignored and removed at shutdown; do not publish it.

The harness seeds a company-packed arrived/no-answer shipment, a long Arabic record and a known sequence gap. Search from Home, inspect the timeline, return to the same results, combine/reset filters, try 320/390/768/1440 widths and follow employee commission visibility. The staff session belongs to another branch: tracking is visible, the restricted shipment mutation link is absent. Browser tests also simulate a failed read and check that it does not become an empty result. These are local fixture journeys, not real driver actions.

## Required independent acceptance — blocked

No `TAWSEL_CONFIG_FILE` or `TAWSEL_P13_TRIAL_FILE` was supplied, and no independent driver session or signed public callback journey was available. Run the established P11/P12 test-source setup first, then use the real driver application for arrival→no-answer, full/partial delivery, a second driver retry, permitted correction and approved waived replacement. Do not impersonate a driver with a service credential.

`npm run test:p13:public` requires the existing protected source config plus a protected trial JSON:

```json
{
  "approvedTestEnvironment": true,
  "erpOrigin": "https://approved-test-erp.example",
  "companyId": "actual-company-uuid",
  "sessionToken": "actual-authorized-session-kept-out-of-git",
  "cases": [
    {"name": "arrival-no-answer", "shipmentId": "native-uuid", "taskId": "canonical-uuid", "eventIds": ["actual-signed-event-uuid"], "expectedOutcome": "no-answer"}
  ]
}
```

All six names required by the test are `arrival-no-answer`, `full`, `partial`, `retry-other-driver`, `correction`, `waived-replacement`. This read-only smoke compares retained real event IDs and outcomes with authorized source history. Passing it alone does not establish all owner acceptance: record actual sender signature/callback logs, financial facts, employee/driver identities, remittance witness changes and synchronized timing observations from the real trial.

Owner acceptance still needs: packed tariff 55/commission 5 on actual no-answer; duplicate delivery unchanged; phone-only deferral zero; later different-driver actual visit earns another 55/5; goods250 stays pending until P16; replacement tariff/waiver50 or55 with normal commission and goods250; cross-branch operational-only reads; deliberately withheld evidence and history recovery changing the witness; measured confirmation-to-visible timing with verified clocks.

IP-GAP-003 / CHECK-001 and IP-GAP-004 remain open pending those demonstrations. TAWSEL-CR-001 remains absent from the pinned contract: historical reasons are shown as unavailable; no fabricated reason codes or Other text are introduced. P22 owns broad recovery/operator UI and representative p50/p95/load/network measurements. See [handoff](HANDOFF.md), [bounded traceability](TRACEABILITY.md) and [execution record](../../../phases/execution/P13.md).
