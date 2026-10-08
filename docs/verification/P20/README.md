# P20 payroll evidence

Scope: P20 only, implemented directly on `main`. Verification resumed on 2026-10-08. The owner instructed **“skip browser testing, just finish the phase”** on 2026-10-07; subsequent verification therefore uses script tests, actual HTTP and disposable PostgreSQL. That exclusion is recorded in the phase registry. It is not a browser pass or owner/device review.

The employee month page separates configured full salary, immutable visit commission, bonus/overtime, linked earning corrections, ordinary earning deductions, advance recovery, incident recovery, prior carry, remaining carry, employee cost and full net. Advances use a separate actual-payment form. Full positive net is paid once; zero net is explicitly closed without a cash component. HR retains REP-24/25 histories. No attendance, tax, partial salary installment, manual advance repayment or separate reporting module was introduced.

## Runtime and commands

Run from the repository root in PowerShell:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN=(Resolve-Path '.tools/p18-postgresql/pgsql/bin').Path
npm run test:phase -- P20
```

The native harness verifies PostgreSQL 18, creates a random local disposable cluster, enables fsync/synchronous commit and deletes only its verified temporary directory. This run used PostgreSQL 18.3, Node 24.21.0, npm 12.2.0, Vitest 5.0.3 and TypeScript 6.0.3. Earlier checks also used the existing Docker harness. No production DSN, actual company payment or remote deployment was used. Dependencies remain pinned.

Required commands are `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:phase -- P20` and the affected P03/P08/P09/P13/P18 regression files. Exact final outcomes are in [the execution record](../../../phases/execution/P20.md). [24-unit-regression.txt](24-unit-regression.txt) records 634 passing workspace unit tests. [63-final-lint.txt](63-final-lint.txt), [64-final-typecheck.txt](64-final-typecheck.txt) and [65-final-build.txt](65-final-build.txt) record passing final checks. [62-final-phase.txt](62-final-phase.txt) records 10 unit and 17 real PostgreSQL/HTTP cases passing, with no failed or skipped applicable tests. [55-final-shared-db-regression.txt](55-final-shared-db-regression.txt) records 87 affected foundation/P03/P08/P09/P13/P18 cases passing with the repaired harness. The build retains its existing large-chunk advisory.

## Acceptance evidence

`C` means `calculation.unit.test.ts`; `U` means the jsdom `ui.unit.test.tsx`; `P` means real PostgreSQL `payroll.db.test.ts`; `S` means real PostgreSQL/native P13 worker `sources.db.test.ts`; `H` means actual API `http.db.test.ts`; `M` means populated upgrade `migration.db.test.ts`. The script UI transport is simulated; H/S/P prove server and money behavior separately. U also verifies Cairo posting-date boundaries and filter retention on source navigation.

| Case | Evidence and observed rule |
| --- | --- |
| P20-AC-01 | C/P: salary 6,000 and actual advance 1,000 leave net 5,000/cost 6,000. Cash issuance and full payout have distinct sources; recovery has no cash receipt. |
| P20-AC-02 | C/P: ordinary earning deduction 200 plus advance 1,000 leave cash 4,800/cost 5,800, with separate typed originals and allocations. |
| P20-AC-03 | C/P: 3,000 against original advance 3,500 closes at zero; original outstanding 500 appears once in the next period's 2,500 net, is settled by its full payout and does not recur in the following month. Zero closure has null account/method/movement. |
| P20-AC-04 | S and P13 regression: two actual visits at base 50/uplift 5 earn 5 each; source replay adds none. Immutable work branch and captured terms survive a future rate change. P13 regression covers different performers and unvisited/internal transfer exclusions. |
| P20-AC-05 | S: original confirmed P18 incident share 200 retains its identity and branch; payroll recovers it, preserves salary cost and creates no second incident gain. |
| P20-AC-06 | C/P/H: closed schemas reject arbitrary payout amount/override/attendance fields; protected edit, unsupported method/account and future actual date reject without effects. |
| P20-AC-07 | P/H/U: independent command race produces one payout. Winning command recovery returns its retained result; unknown UI response retains identity through remount and retry. |
| P20-AC-08 | S: paid calculation/payment remain unchanged after late work; one source-linked future adjustment is approved and duplicate resolution rejects. A protected correction creates one visible review, retains actual money and holds only the affected month. |
| P20-AC-09 | P/S: salary correction versus payout, adjustment versus freeze and incident versus payout choose a guarded order. A missing/unprocessed past calculation is materialized before rejecting an edit. Frozen unpaid amount is paid unchanged. |
| P20-AC-10 | P: faults after advance debit and payout allocation/cash/result roll back the complete transaction. Actual backend termination before commit rolls back; committed payment survives database restart and identity recovery. |
| P20-AC-11 | C/P: older freeze versus newer month uses independent backends and an observed PostgreSQL lock waiter. Recovery 1,000 is reserved for the old 5,000 net; newer net remains 6,000; later old payment settles exactly one reservation. |

Final native evidence includes [native-reconciliation.json](native-reconciliation.json) (company, employee/period, original obligation, allocation, payment and cash source IDs) and [native-sources.json](native-sources.json) (visit identities, historical terms, source/work branches, original incident obligations and classified cost inputs). These contain disposable fixture identities. `node docs/verification/P20/reconciliation-check.mjs` verifies originals/outstanding/reservations, each frozen allocation, full cash links, zero closures and source cost classes against those actual exports; [66-final-reconciliation.txt](66-final-reconciliation.txt) and [reconciliation-summary.json](reconciliation-summary.json) pass. [migration-status.json](migration-status.json) records current migration status through `0024_p20_payroll`.

## Earlier attempts retained

Logs 03–05 retain the invalid cash-account fixture, SQL UUID cast and recovery-effect uniqueness failures. These were corrected without changing money rules; 07 passes. Log 12 retains a test querying a nonexistent session table; the actual fixture CSRF token replaced it. Log 15 retains an overbroad test count and asynchronous socket-error failure; employee-scoped assertions and the transaction client's error listener corrected them. Log 16 retains Docker unavailability; 17 passes with the explicitly selected native harness. Log 19 retains the incident-race fixture's missing historical driver link; 22 uses the actual linked employee and passes both race orders. Logs 26/27 retain a PowerShell argument-array formatting failure; 28/32/33 correct formatting. Logs 25/34 retain the unavailable native database/worker at the previous session boundary and the P08 timestamp fixture failure. Log35 retains an HTTP count that included another employee's zero closure and a shutdown checkpoint exceeding the shell's 30-second timeout. The count is employee-scoped; the native harness now permits pg_ctl's bounded 60-second durable wait with fsync enabled. Log44 retains native startup hook timeouts: Windows PostgreSQL inherited pg_ctl's pipes after its process exited. Control now uses bounded pg_ctl exit status with ignored pipes and a hidden window; fsync/synchronous commit remain enabled. The four leaked disposable clusters were stopped and their logs retained. Log46 retains Docker unavailability from a command that omitted the explicit native environment; log47 sets it and passes. Log48 retains a final test formatting failure; log49 formats it and log50 passes. Final review corrected UTC slicing in history filters to use Cairo dates and retained filters on profile/payment/review/action return links; logs56–62 include the new unit case and passing final phase rerun. Log63–65 pass final lint/typecheck/build. No failed log was overwritten.

Earlier actual API/browser journeys ran before the owner's exclusion. [11-browser-first.txt](11-browser-first.txt) passed two journeys with advance 1,000, deduction 200, full 4,800 payment, dropped response recovery, zero closure/carry and stale preview. [20-browser-expanded.txt](20-browser-expanded.txt) failed duplicate test-company setup; [21-browser-single-fixture.txt](21-browser-single-fixture.txt) passed two journeys and failed the late-adjustment assertion because its text locator also matched an option. The locator was corrected but not rerun under the browser exclusion. Screenshots at 320/390/768/1440, long histories, payment, unknown response, stale preview and commission/review are retained as historical captures, not final-version browser certification. [browser-fixtures.json](browser-fixtures.json) records actual disposable fixture IDs; [browser-reconciliation.json](browser-reconciliation.json) records the first salary journey's one payout/one advance/two cash movements/no invalid balances. `browser-results.json` belongs to the last pre-exclusion run and records its failure honestly.

## Safe optional owner trial (unexecuted after the browser exclusion)

`npm run p20:trial` starts an isolated company/API/web at `http://127.0.0.1:5401/api/test/p20-login`. The printed login is a test-only session. The source fixture login is `/api/test/p20-source-login`. No trial helper is registered in production.

1. Open the 6,000 salary employee. Issue an actual 1,000 cash advance from the funded trial account. Inspect its original ID, actual payment date, method/account/movement and balance on the month page.
2. Add an ordinary earning deduction 200 with reason and work date. Check salary 6,000, advance recovered 1,000, earning deduction 200, net 4,800 and cost 5,800. Preview and pay full net; the amount cannot be edited. Inspect immutable payment and settled original allocation.
3. Retry the same command identity after a dropped response. Confirm the same result and one debit. Paid-period edit and an arbitrary smaller payout body must reject.
4. For the 3,000 employee issue advance 3,500, close zero net without selecting an account, and view next month's original carry 500/net 2,500.
5. Inspect the actual-visit source's base 50, uplift 5 and captured 10% commission 5. A protected late source must preserve the old payment, show a review and use an explicit current-unpaid/future linked settlement. Broad unresolved corrections remain held for P21/P22 review.

No owner manual/device review, independent live Tawsel visit acceptance, fresh browser run or deployment is claimed. P20 consumes an implemented native P13 connector with controlled canonical facts; existing P13 independent/public limitations remain with P13/P22. See [handoff interfaces](HANDOFF.md) and [bounded traceability](TRACEABILITY.md).
