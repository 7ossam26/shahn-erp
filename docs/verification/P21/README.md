# P21 verification — typed settlements, corrections and optional openings

Scope: UI-ADJUSTMENT-001 `/settlements` and UI-OPENING-001 `/settings/opening-balances`, migration `0025_p21_settlements.sql`, closed contracts (`packages/contracts/src/settlements`), pure arithmetic (`packages/domain/src/settlements`), the typed resolver registry (`apps/api/src/modules/settlements`) and pages (`apps/web/src/features/settlements`). Interfaces for P22/P23/P24 are in [HANDOFF](HANDOFF.md); assigned requirement/decision slices are in [TRACEABILITY](TRACEABILITY.md); the run history is in [the execution record](../../../phases/execution/P21.md).

## Environment

- Linux container, Node 24.21.0 / npm 12.2.0 (pinned tarball unpacked outside the repository and put first on `PATH`), Vitest 5.0.3, TypeScript 6.0.3, Playwright 1.63.0. No dependency was added or upgraded.
- PostgreSQL 18.4 native binaries through the repository's `SHAHN_TEST_PG_BIN` harness. Docker is unavailable. The binaries run as the existing `postgres` OS account through small wrapper scripts outside the repository; no system user was created and no installed database service or production credential was used.
- Chromium: Playwright 1.63 pins build 1243 while the container provides build 1194. `playwright.p21.config.ts` accepts an optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; runs here set it to `/opt/pw-browsers/chromium`. Without the variable the config behaves like earlier phase configs.
- Every test and the trial use disposable isolated databases. No Tawsel request, real payment, deployment or production cleanup happened.

## Evidence keys and files

| Key | File | What it exercises |
| --- | --- | --- |
| C | `tests/integration/p21/contracts.unit.test.ts` (13) | Closed operation/opening schemas, forged/free-form payload rejection, reason/digest/piastre rules, OpenAPI routes; A01/A02/A03/A06 arithmetic; payroll opening entitlement/settlement recovery and pre-P21 frozen calculation readability. |
| U | `tests/integration/p21/ui.unit.test.tsx` (12) | jsdom pages: granted-target picker without inputs, normal confirm with reviewed versions, stale re-preview, blocked, warnings/dependents, unknown result across remount with identical command, already resolved, denied, storage cash-out assertion, opening batch, opening duplicate, opening lost response recovery. |
| S | `tests/integration/p21/settlements.db.test.ts` (10) | A01, A02, stale + independent-connection race (both orders), A03, rolling comparison/surplus/company loss, A04, A06, opening race on independent connections, fault injection after each stage, A08 (missing/out-of-scope/unsupported/cancelled parcel). |
| W | `tests/integration/p21/wallet.db.test.ts` (4) | A05 source correction after payout, retain-original, brand correction/commercial adjustment and correction-vs-payout race, fault injection in source resolution. |
| T | `tests/integration/p21/storage.db.test.ts` (2) | A07 credit 190 refund 100, refund vs period allocation race in both orders. |
| I | `tests/integration/p21/incidents.db.test.ts` (2) | Incident review compensation correction keeping the employee share; parcel loss/damage delegation to P18. |
| H | `tests/integration/p21/http.db.test.ts` (3) | Actual HTTP prepare → confirm → recover; stale/denied/CSRF/injected payloads; opening HTTP; database restart then same-identity recovery. |
| M | `tests/integration/p21/migration.db.test.ts` (2) | Populated pre-0025 upgrade leaves originals, money, journals, lots, balances and stock unchanged with nothing backfilled; fresh schema capabilities and journal classification. |
| B | `tests/integration/p21/settlements.spec.ts` (2) + `serve.ts` | Real API + web app in Chromium: normal, stale, blocked, unknown result, already resolved, denied scope, denied screen, opening batch/duplicate/pending; captures at 390 and 1440 (plus 320/768 for the target picker, product preview, opening preview and list) with a no-horizontal-scroll assertion at every captured width. |

Native evidence written by the database tests: [native-settlements.json](native-settlements.json) (A01–A04, A06, authority matrix, cases), [native-wallet.json](native-wallet.json) (A05, brand correction), [native-storage.json](native-storage.json) (A07), [native-incidents.json](native-incidents.json). Browser: [browser-results.json](browser-results.json), [browser-evidence.json](browser-evidence.json) (fixture IDs, counts), [screenshots](screenshots/). The authority/state/effect matrix is [authority-matrix.json](authority-matrix.json).

## Acceptance mapping

| Case | Result | Evidence |
| --- | --- | --- |
| A01 12→10 posts one −2 | One stock source `kind='adjustment'`, observation and links; position 10. | C, S, B (with a stale review first) |
| A02 actual 5 / reserved 7 | Shortage 2; every unhanded reservation of that variant held, other variant dispatches; receipt 2 clears holds; observation retained. | C, S |
| A03 cash 1000 / observed 900 | Hold 100, available 900; one missed paid expense 100 → book 900, hold 0, available 900, never 800; one cost 100; replay posts nothing. | C, S, H, B |
| A04 paid payroll edit | `PAYROLL_PERIOD_PROTECTED`; no bypass offered. | S |
| A05 source correction after payout | Payout retained; one linked review resolved; a second resolution `SETTLEMENT_ALREADY_RESOLVED`. | W |
| A06 duplicate opening/resolution | Same identity replays once; a different identity for the same target `DUPLICATE_OPENING_TARGET`; racing commands post exactly once. | S, H, U, B |
| A07 storage 190 refund 100 | Credit 90, account −100 once, earned revenue unchanged; race with allocation never double-spends. | T |
| A08 missing / out-of-scope / unsupported | Rejected atomically, no case; adapter-owned/cancelled parcel blocked. | S, H |

## Commands and results (this attempt)

Logs are the commands' captured output with trailing whitespace removed (required by `git diff --check`).

| # | Command | Result |
| --- | --- | --- |
| 01 | `npm run test:db` (full regression, first) | [01](01-full-db-regression-first.txt): 368 passed / **2 failed** of 370 across 49 files. P20 migration test asserted that `0024` is the latest migration; P11 crash-receiver test timed out. |
| 02 | `npx vitest run -c vitest.db.config.ts tests/integration/p20/migration.db.test.ts tests/integration/p11/boundary.db.test.ts` | [02](02-p11-p20-rerun.txt): P20 passes after asserting `0024` is applied (not last); P11 still times out. |
| 03 | `npx vitest run -c vitest.db.config.ts tests/integration/p11/boundary.db.test.ts` | [03](03-p11-boundary-sigkill.txt): 19/19 after the crash simulation uses `SIGKILL`. Diagnosis: since P01 the API registers `enableShutdownHooks(['SIGINT','SIGTERM'])`; on Linux `child.kill()` sends SIGTERM, so graceful shutdown waits forever for the test's deliberately unacknowledged request. On Windows (P19's run) kill terminates immediately. Not caused by P21. |
| 04 | `npm run build` | [04](04-build-first.txt): passed (existing chunk-size advisory only). |
| 05 | `playwright test --config playwright.p21.config.ts` | [05](05-browser-first.txt): 2/2 passed, but teardown logged `TEST_POSTGRES_CONTROL_FAILED:null` and left one test cluster running: the runner's SIGTERM to the server process group interrupted `pg_ctl stop` started by teardown. The cluster was stopped and its temporary directory removed. `serve.ts` now answers `/stop` only after disposal and `teardown.mjs` awaits the answer. |
| 06 | same | [06](06-browser-rerun.txt): 2/2 passed, no teardown error, zero clusters left. |
| 07 | `npm run lint` | [07](07-lint.txt): passed. |
| 08 | `npm run typecheck` | [08](08-typecheck.txt): passed. |
| 09 | `npm run test:phase -- P21` | [09](09-phase.txt): unit 25/25, database 23/23, browser 2/2, public integration not applicable (no Tawsel request); zero clusters left. |
| 10 | `npm run test:unit` | [10](10-unit-regression.txt): 661/661 across 30 files. |
| 11 | `npm run test:db` | [11](11-db-regression.txt): 370/370 across 49 files (P21 included); zero clusters left. |
| 12 | `npm run lint` (final) | [12](12-lint-final.txt): passed. |
| 13 | `npm run typecheck` (final) | [13](13-typecheck-final.txt): passed. |
| 14 | `npm run build` (final) | [14](14-build-final.txt): passed. |
| 15 | `npm run test:phase -- P21` (final) | [15](15-phase-final.txt): unit 25/25, database 23/23, browser 2/2, public integration not applicable; zero clusters left. |

Corrections found by the new tests before the final run (not separately logged; the output stayed in the session): the UI test showed that after a lost response the recovery button sat behind the still-open confirmation dialog, so both dialogs now offer “التحقق من النتيجة”; the contract test used a non-numeric case reference and a dotted link kind (fixtures corrected, schema unchanged); the opening detail page now shows each line's permanent source reference (journal effect or stock source). After checkpoint 11, dependent states `unaffected`, `held_for_incident` and `refund_source` were found to render as raw codes in the preview and now have Arabic labels; checkpoints 12–15 cover that change. Earlier development failures in P21's own database tests (missing storage configuration and funding in fixtures, opening race returning stale before duplicate, synchronous throws inside async resolvers, duplicate posting batch per source in grouped source corrections, absolute wallet assertions instead of deltas, HTTP stale replay expectation, an upgrade test running new code against the old schema, `exactOptionalPropertyTypes` clock typing) were corrected before the runs above; their raw logs were not retained.

Regression-generated historical evidence (P03–P10, P16, P17, P19, P20 status/result files) was copied into [regressions/](regressions/) — `prerequisite/` from the start of the attempt and `db-regression-runs/` from checkpoints 01 and 11 — and the original historical files restored unchanged.

## Owner trial (unrun)

Start `npm run p21:trial` (requires `SHAHN_TEST_PG_BIN` or Docker). It prints the logins, the control endpoint and the fixture IDs; each start is a new disposable database and company. The automated browser run's IDs are recorded in [browser-evidence.json](browser-evidence.json); a new start produces new IDs, which the console prints.

1. Log in as `admin` (`/api/test/p21-login/admin`). Product **أسود** has 12 sound units in الفرع أ, with orders `10000` (4) and `10001` (3) reserving 7; **أبيض** has 3 units and order `10002` (1).
2. Settlements → كمية منتج → أسود, actual 5 → preview: recorded 12 → 5, difference −7, reserved 7, reservation shortage 2, dependents “ستُوقف”. Give a reason and confirm. Expected: case resolved; both black orders held at dispatch; order `10002` still dispatches.
3. Inventory → receive 2 black (`/inventory/receipts/new`). Expected: shortage clears and holds release; the observation and case remain.
4. Settlements → حساب نقدي أو بنكي → “خزنة الفرع أ للتسويات” (book 1000.00), actual 900 → hold 100, available 900. Confirm. Open the case → “تسوية الفرق” → مصروف مدفوع فعلًا ولم يسجل, 100, category “P21 مصروف فائت”. Expected: book 900, hold 0, available 900, one expense 100. Opening the same case again shows “سُويت بالفعل” and offers no confirmation.
5. A04 by hand: deposit enough into a trial account (Finance → movements), pay an employee's month in full on the HR payroll page (`/employees/<id>/months/<month>/payout`), then choose that month in Settlements → استحقاق موظف. Expected: the preview is blocked with `PAYROLL_PERIOD_PROTECTED` and no confirmation or bypass is offered. The automated equivalent is S A04.
6. Opening (use a freshly started trial so the opening comes first; its only prior records are the fixture funding deposit and the settlement products' stock): `/settings/opening-balances` → new batch dated today: “خزنة رصيد البداية” 500, براند التجربة eligible 200, “موظف رصيد افتتاحي” obligation 100, product **أخضر** stock 3. Review (check the 390 px before/after preview), confirm. Expected: one batch with four linked lines, no operating effect. Repeat the same batch → blocked “مسجل سابقًا في الدفعة رقم 1”. A separate batch with براند التجربة “لدى المناديب غير محصل” 50 shows “معلق لدى المناديب” and stays non-payable in brand payouts.

Expected rows can be read through the control endpoint `GET http://127.0.0.1:4422/counts` with the printed `x-test-secret`.

## Limitations

- Owner manual/device trial unrun. No public Tawsel acceptance is part of P21; P13/P22 inherited public limitations remain.
- A storage charge correction of credit already allocated to an earned period is not offered (`STORAGE_CREDIT_ALLOCATED`).
- A missed actual transfer receipt is routed to the P15 goods-receipt page rather than a P21 resolver.
- `HANDED_OVER_PROTECTED` and `SOURCE_ADAPTER_REQUIRED` parcel blockers are resolver rules not separately exercised by a P21 test (the cancelled-parcel blocker is).
- Company loss, general missed movement and brand commercial adjustments stay unclassified outside operating profit until P24 or a later justified classification.
- An approved employee liability is recovered only through P20 payroll (no manual repayment receipt).
- CHECK-003 (branch revision support) is untouched; no branch-revision resolver was invented.
