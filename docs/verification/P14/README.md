# P14 — actual returns and receipt-funded redispatch

Execution date: 2026-10-05. **Local implementation; required independent Tawsel/human acceptance blocked. No phase completion commit or push.** This record is not production readiness or full canonical conformance.

Work was performed directly on the initially clean `main` checkout at `3c283b2d32b0152dbd5b0e2d6d9e823e0320bd70`. The existing `origin` was fetched and `main` matched `origin/main`; no branch, worktree, reset, unrelated commit or production operation was made. The baseline remains `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`.

## Implemented behavior

- Arabic `/returns` first selects an assigned source branch and driver. Current request quantities, original offer, physical observations and individual accepted receipts remain separate. Branch, driver, brand, reference, state, condition and explicitly selected request/receipt dates are filterable; URL filters survive Back and changes reset pagination.
- Actual subset receipt saves the native staff actor, current item revisions, inspection, condition, suspected shortage and immutable source command/outbox in one PostgreSQL transaction. An offer creates no stock. Before source acceptance an observation is unavailable. A definite source rejection preserves it for review. An uncertain response retains the same action identity.
- The concrete canonical receive/dispose schemas are validated. Source service identity is retained; no human identity is injected into a closed envelope. Pending reads use required branch/driver scope and every cursor page; current-request and durable-action reads are implemented. The connector exposes no driver offer/correction operation.
- Ordered return events and accepted command results use the same unique transition posting. Request/item/cycle identities and cumulative balances are retained. A late original offer cannot reset received balances. Result, event, replay and concurrent duplicate posting have one physical effect. Missing dependencies stay pending. Correction after accepted physical movement requires review and preserves that movement.
- Migration `0018_p14_returns.sql` adds immutable observations, return facts, receipts, disposition linkage, allocation and brand handover, with company/source identity constraints and quantity checks. Populated migration creates no inferred historical return stock or new staff grant. Stock positions use P05 safe upsert/locking. Sound inspected stored goods become available; damaged, uncertain and suspected-shortage goods stay unavailable. Externally supplied parcel lines retain shipment/line identity and create no loose SKU stock.
- Receipt-funded redispatch reserves explicit compatible sound receipt quantities, P05 stock reservations and P12 shipping cover together with a fresh immutable command. It preserves the commercial external reference and prior cycles, uses P12 snapshot serialization/pricing and progresses through existing P12 preparation/actual driver receipt. Same-branch dispatch is implemented; CHECK-003 changes of source branch remain disabled.
- Actual branch-to-brand handover of received available pieces/parcels separately captures brand, named recipient, staff and time, consumes receipt custody once and posts stock movement when applicable. It has no invented Tawsel endpoint or compensation/payment effect. Typed incident disposition is exported for the owning P18/P21 workflow; the return form cannot invent a driver outcome or approve an incident.
- Existing tracking gains factual return balances, accepted transition timeline entries and authorized return-desk links. Stock movements use existing inventory services; source commands/events remain visible through existing integration detail services.

## Verification commands and evidence

Use PowerShell from the repository root:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run lint
npm run typecheck
npm run build
npm run test:phase -- P14
```

Runtime: Node **24.21.0**, npm **12.2.0**, PostgreSQL **18.6** in disposable test clusters, Vitest **5.0.3**, Playwright **1.63.0**, TypeScript **6.0.3**. No installed database was migrated. Node's official Windows archive SHA256 was checked against `158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541`. Initial host Node24.11.1/npm11.6.2 failed `npm ci --ignore-scripts` with EBADENGINE; after selecting the pinned runtime, `npm ci` installed442 packages with no audit vulnerabilities. The dependency lockfile was not changed.

The P14 runner registers real unit, PostgreSQL, listening-HTTP, browser and independent public layers. A missing public runtime throws a named BLOCKED failure; it is neither skipped nor replaced by a mock connector. The final complete run (`37-phase.txt`) passed39 unit,13 PostgreSQL/HTTP and5 browser cases, then exited1 at the required public gate: missing `TAWSEL_CONFIG_FILE` and `TAWSEL_P14_TRIAL_FILE`. No local case was skipped in that run. This prohibits the phase completion commit and push.

| Evidence | Observed result |
| --- | --- |
| `13-unit.txt` | 39 canonical P21/P22 success/rejection and P26 accumulated-balance cases passed. |
| `21-stock-retry.txt` | Nine PostgreSQL cases passed, including sound/damaged stock and fresh-cycle handover. |
| `18-database.txt` | Listening HTTP pagination and process-crash recovery passed; earlier stored-stock SQL cast defect failed, then was repaired and verified in `21-stock-retry.txt`. |
| `25-regression-db.txt` | 42 P12/P13 database/HTTP regressions passed across dispatch, crash recovery, execution, correction and monitoring. Database idle-connection messages are expected during explicit restart cases. |
| `29-typecheck.txt` | Type checking passed. |
| `31-lint.txt` | ESLint and Prettier passed. |
| `32-build.txt` | Production build passed; existing bundle-size advisory remains. |
| `34-phase.txt` | Full runner passed39 unit,13 DB/HTTP and4 browser cases, then failed the named required public gate. |
| `37-phase.txt` | Final runner includes the separate approved-disposition screen:39 unit,13 DB/HTTP and5 browser cases passed; required public gate BLOCKED, exit1. |
| `39-lint.txt`, `40-typecheck.txt`, `41-build.txt` | Final lint, typecheck and production build passed after disposition, explicit Cairo rendering and explicit cycle lock ordering. |
| `43-diff-check.txt` | `git diff --check` passed; only informational checkout line-ending warnings. |
| `42-final-receipt-locks.txt` | All11 receipt/allocation database cases passed again after adding explicit cycle locks before stock locks. |
| `45-final-diff-check.txt`, `46-git-result.txt` | Final whitespace check exit0; still on original `main` HEAD, nothing staged, no completion commit or push. |

Earlier failures and retries are retained: `01`/`03` found fixture event correlation and shipping-cover identity issues; `02`/`04`/`08` found typed fixture/UI errors; `10` found a fixture table-name error; `12`/`16`/`22` found browser readiness, exact label matching, Secure localhost cookie behavior in Playwright's separate request client, and an asynchronous filter assertion; `14` found incorrect fixture stock fields and a non-UUID cursor; `18` found a SQL text/UUID cast and the reservation release required a fresh position version. These were repaired without weakening schema/authentication checks. `20-lint.txt` reported76 existing checkout files with CRLF while Git stored LF; only working-tree line endings were normalized, leaving their Git content unchanged. `27-phase.txt` failed because the native PostgreSQL environment variable was omitted, causing the Docker-only fallback to fail and setup-dependent cases to skip. Subsequent runs explicitly select the isolated native PostgreSQL runtime. `30-phase.txt` found shared-fixture counting/worker-order assumptions after adding correction cases; assertions were scoped and the fault test now waits through unrelated blocked streams.

## Connected trial and scope limits

The automated local trial dispatches3 units, records1 delivered and2 offered, verifies zero return stock before acceptance, then receives1 sound unit and retains1 unresolved with the driver. Duplicate receipt/result/event/replay does not add stock. Wrong branch, duplicate item, excess and stale revision fail without physical effects. The accepted unit can fund one fresh same-branch cycle, retaining the original cycle and exact captured price. Separate damaged stock stays unavailable; a received parcel handed to its brand cannot be allocated again. The listening HTTP fixture deliberately withholds the receipt response after its simulated server commit, kills the ERP worker and verifies recovery through the original action lookup with one POST and one receipt. This proves ERP behavior against an explicit controlled server, **not** independent Tawsel acceptance.

The browser suite uses real API/PostgreSQL at390×844,1440×1050,320px and768px, including long Arabic brand/recipient text, pending and accepted receipt, damaged goods, brand handover, separate execution of a saved incident decision and branch authorization. Captures are in `screenshots/`; `received-390.png`, `list-320.png` and `disposition-1440.png` were visually inspected. The owner/driver manual trial has **not** been performed.

No `TAWSEL_CONFIG_FILE` or `TAWSEL_P14_TRIAL_FILE` was available. Therefore real source-return authority, real driver human offer, source-credential rejection by driver-only endpoints, signed callback/result equivalence, canonical correction/receipt/disposition/whole-retry races and connected customer redispatch remain required blocked acceptance. Configure an approved disposable independent Tawsel and real driver session, execute the documented cases, supply the trial manifest consumed by `tests/integration/p14/tawsel.public.test.ts`, and rerun the full suite. A schema fixture is not proof of those outcomes.

TAWSEL-CHECK-003 remains open for (1) accepted source A moving to B before departure and (2) accepted actual return at A moving to B before a new customer cycle. Required artifact: documented allowed public sequence, expected source/assignment/item revisions, source-line compatibility and explicit receipt allocation, original/new return branch, positive A-to-B result, rejection cases and uncertain-response recovery. The P22 arbitrary-branch fixture rejects an injected field on `branch.interruptRound`; it is not A-to-B redispatch evidence. ERP-D-196 does not erase this selected scope.

P15 owns the complete native interbranch transfer workflow. P14 supplies a tested exclusive receipt-allocation interface, independently of CHECK-003; this is not a claim that P15 transfer departure/receipt screens were built. P18/P21 own incident approval, compensation and later condition review. P22 owns full snapshot/replay orchestration. Those phases were not started.

See [handoff](HANDOFF.md), [bounded traceability](TRACEABILITY.md), [implementation path inventory](paths.txt), and [execution record](../../../phases/execution/P14.md).
