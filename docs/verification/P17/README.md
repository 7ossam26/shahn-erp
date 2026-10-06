# P17 verification — shared brand wallet, shipping cover and payout

Date: 2026-10-06 (Africa/Cairo). Status: **implemented and verified within stated local script scope**; Playwright browser acceptance skipped by owner instruction; owner manual trial and the P16-owned independent public witness (IP-GAP-004) not executed.

Start: clean `main` at `7c16e327f029d9bf62953a645210629b900f5132` (`phase 16 not complete`), equal to `origin/main` (0 ahead/0 behind). The cloud session was checked out on the identical session branch; it switched to `main` without changes. No worktree/branch was created.

Runtime: Node 24.21.0 and npm 12.2.0 (pinned versions downloaded and checksum-verified into the session scratchpad; the host had Node 22), PostgreSQL 18.6 from the pinned `postgres:18.6-bookworm@sha256:3725f4e2…` image (pulled by digest through `mirror.gcr.io` because Docker Hub returned 429; digest identical), Vitest 5.0.3, TypeScript 6.0.3. Dependencies unchanged (`npm ci`). Tests use the P01 Docker isolation path (`SHAHN_TEST_PG_BIN` unset).

## Owner instruction during the run

"skip browser test, just scripts test" (2026-10-06). The P17 browser layer is registered as not applicable with that reason. Instead of Playwright, UI flows are covered by jsdom script tests against the real React components (`tests/integration/p17/ui.unit.test.tsx`), and the real API by HTTP process tests. **No 320/390/768/1440 captures, horizontal-overflow or real-browser focus checks were produced**; those remain unverified.

## Prerequisites (actual runs, not labels)

- P16 remittance DB suite: 15/15 ([log](prerequisites/P16-database.txt)).
- P03 kernel 21, P04 brands 13, P09 finance 18 passed; P12/P13 failed first with `ECONNRESET` after the restart case and cascaded ([first run](prerequisites/P03-P04-P09-P12-P13-database.txt), 73 passed/12 failed). Cause: the Docker test harness's `start()` returned before PostgreSQL accepted connections (the native harness waits with `pg_ctl -w`). Repaired in `packages/test-support/src/index.ts` (wait for `SELECT 1` after `docker start`); [rerun](prerequisites/P12-P13-database-rerun.txt) 33/33.
- Real P03 wallet/lot/hold/cover primitives, P04 one wallet per company brand, P09 AccountFundsService, P12 cover service, P13 source-unique fee/goods postings and review/hold, and P16 release were inspected and reused. Evidence files the prerequisite runs rewrote in other phases' folders were restored; copies are under `prerequisites/`.

## Final results

| Gate | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | passed ([log](lint.txt)) |
| Typecheck | `npm run typecheck` | passed ([log](typecheck.txt)) |
| Build | `npm run build` | passed ([log](build.txt); pre-existing large-chunk advisory) |
| Phase | `npm run test:phase -- P17` | passed: 25 unit/contract/UI script, 19 real PostgreSQL/HTTP/trial/migration; browser and public layers not applicable with reasons ([log](phase.txt)) |
| Unit regression | `npm run test:unit` | 589 passed, 1 failed — pre-existing, unrelated (below) ([log](regression-unit.txt)) |
| Database regression | `npm run test:db` | 280 passed, 3 failed ([log](regression-database.txt)): one caused by P17 and fixed (below, [rerun](migration-tests-rerun.txt)); two pre-existing, reproduced on the untouched base commit ([log](base-commit-reproduction.txt)) |
| Diff | `git diff --check` | passed ([log](diff-check.txt)) |

Regression findings:

- Caused by P17 and fixed: `tests/integration/p16/migration.db.test.ts` built its "before 0020" database by excluding only migrations named `0020…`, so the new `0021` was applied out of order (`MIGRATION_CHECKSUM_OR_ORDER_MISMATCH`). The filter is now `version < '0020'` (and P17's own upgrade test uses `< '0021'`); both pass.
- Pre-existing, unrelated, left for their owners (P17 touches none of these files):
  - `tests/unit/process-lifecycle.test.ts` expects `"businessQueues":1`; since `df5b300` (phase 13) `apps/worker/src/main.ts` reports `worker ? 3 : 2`.
  - `tests/db/inventory.test.ts` expects parcel boundary `LOCAL_CUSTODY_ONLY`; since `17c184e` (phase 15) the read model returns `NATIVE_TRANSFER_ONLY`. Reproduced on the base commit.
  - `tests/integration/p11/boundary.db.test.ts` "kills receiver after committed inbox…" times out at 30 s in this Docker environment. Reproduced on the base commit (where the DB-restart case also fails without the harness readiness repair).

## Acceptance cases

| Case | Evidence | Observed |
| --- | --- | --- |
| P17-A01 | `payout.db.test.ts` A01; `trial.db.test.ts` | Real P12→P13 delivery: pending 250, payout of 100 rejected (retained 409, no money). Real P16 receipt 300 into bank → eligible 250, no shipping debit. Both payout users see 250 with branch-A source. Payout 100 from B Cash → payable 150, B Cash −100, A Cash unchanged; same command replays; changed payload conflicts; statement goods +250, payout −100, closing 150, reconciled. |
| P17-A02 | A02 | Eligible 300; two 200 payouts from A and B on independent connections, both commit orders forced by a held wallet row: one commits, the other gets `INSUFFICIENT_ELIGIBLE_CREDIT` with current payable 100; one payout row; total debit 200. |
| P17-A03 | A03; cover race | Eligible 100 + real P12 `dispatch.receive` cover 50 → payable 50; preview/confirm 60 rejected without debit; 50 paid; cover 50 still active. Payout-first: payout commits, handover rejected `INSUFFICIENT_SHIPPING_COVER`; cover-first: cover commits, payout rejected. |
| P17-A04 | A04 | Real refused visit posts brand fee 50 while goods 250 pending: signed 200, payable 0; after real full remittance payable 200; payout 200 consumes the lot (fee offset first), signed 0. |
| P17-A05 | A05; trial | Off-day without reason → retained 409; same intent repeats the rejection; reason with an empty InstaPay account → `INSUFFICIENT_FUNDS`; reason on an agreed day → `OFF_DAY_REASON_NOT_APPLICABLE`; valid off-day payout stores reason/reference; a reason cannot spend held credit. |
| P17-A06 | A06 | Typed compensation 400 is eligible immediately; a second posting on the same source is rejected; payout 400 succeeds. Controlled producer source (P18 owns incident confirmation). |
| P17-A07 | A07 | After payout 100 of a released 250 lot, an accepted correction keeps the payout, opens one linked review and holds the remaining 150; duplicate delivery adds nothing; a preview reviewed before an unrelated credit fails `WALLET_CHANGED`; the unrelated compensation stays payable. |
| P17-A08 | A08 | Child process commits and exits 88 without a response; a new process recovers the same result; replay returns it; denied grant and removed paying-branch assignment both get `FORBIDDEN_SCOPE`; another principal gets `NOT_FOUND`. |
| Atomicity | fault test | Faults after debit, allocation, payout and result roll back payout, movement, allocation, audit, balance and command record. |
| Account lock | account race | A payout of 70 and a P09 withdrawal of 70 compete for one account holding 100: exactly one succeeds; balance 30; the loser gets `INSUFFICIENT_FUNDS` with no wallet effect. |
| Guards | DB guard test | A raw real-brand payout effect without a payout record cannot commit (`BRAND_PAYOUT_RECORD_REQUIRED`). |
| Queries | queries test | Empty wallet zeros; pending-only; cross-branch breakdown sums to totals; single-snapshot list SQL equals the locked lot model for every company brand; every statement reconciles and opening + credits − debits = closing. |
| Migration | `migration.db.test.ts` | Populated P16-era database (eligible, pending, partially offset debit, account and movement) upgraded to 0021 unchanged; no payout/eligibility created; projections reconcile. |
| HTTP | `http.db.test.ts` | Session, forged header, missing grant, unknown filter, 404, calendar range, statement dates, CSRF/origin, paying-branch scope, five forged command shapes rejected, retained results/recovery, contract-shaped 409 with amounts, history filters, P09 account history shows `brand_payout`, revocation. |
| UI scripts | `ui.unit.test.tsx` | Separate payable/pending/held/cover labels; closed preview scope; double click sends one command; off-day reason gating; server blockers; unknown result retained and recovered with the same ID; changed wallet reopens review keeping inputs; empty-filter reset; wallet local views and reconciled statement. |

Native evidence: [native-payout-evidence.json](native-payout-evidence.json) (A01–A07, race outcomes), [automated-trial.json](automated-trial.json). Coverage classes: real P12/P13/P16 code paths with **controlled source HTTP** (not independent Tawsel); compensation and hold isolation use **labelled controlled sources** through P17/P03 typed interfaces; no arbitrary eligible balance is inserted into product tables.

## Attempt history (failures retained)

1. Prerequisite P12/P13 cascade (`ECONNRESET`) → Docker harness readiness repair → 33/33.
2. [First P17 DB run](attempts/01-database-first-failed.txt): 8/14. Causes: the fixture's payout `command` helper shadowed P12's dispatch `command` (UNKNOWN_COMMAND_KIND); B Cash exhausted by earlier scenarios; a failing race left its blocking connection open, timing out later loops and leaving one Docker container (removed after inspection). Fixed: `dispatchCommand` alias, P09 top-up deposits, idempotent release in `finally`. [Rerun](attempts/02-database-rerun-passed.txt) 14/14.
3. Contract test found `\S` in the off-day-reason pattern accepted a leading NUL; both text patterns now require a non-space, non-control character.
4. [First lint](attempts/03-lint-first-failed.txt) failed on an unknown `react-hooks/exhaustive-deps` directive; removed.
5. Earlier full [phase](attempts/06-phase-before-final-fixes.txt) and [build](attempts/07-build-before-final-fixes.txt) passes preceded the regression run; the final gates were rerun after the last UI and migration-test changes.
6. UI script tests found a real defect: a fast double click submitted two payout commands with different IDs, and a click after commit but before navigation could submit again. Fixed with a synchronous in-flight guard and a post-commit latch; the native `required` attribute on the off-day reason was removed so the server's off-day review and message are shown.

## Manual trial (owner, not executed by the agent)

```bash
npm run p17:trial
```

Starts disposable PostgreSQL, the API on 4371 and the web app on 5371 (smoke-checked by the agent: login redirect, dues API, page and module transform). Company: branches A/B, A Cash 1000, B Cash 1000, Company Test Bank 0; one shared brand whose agreed day is today, already given the real goods 250 + shipping 50 journey and a 300 receipt into the bank.

1. Open `/api/test/p17-login/payA`, then `/api/test/p17-login/payB` (separate browsers). Both see the brand with **المتاح للتحصيل الآن 250**, source branch A.
2. As payB, تسجيل تحصيل: branch B, نقدي, B Cash, 100, today → review → confirm. Expect payable 150, B Cash 900, A Cash 1000, one statement payout line.
3. Choose yesterday's date: the off-day reason appears. Review without a reason: confirmation is disabled with the reason message. Add a reason and pay 50 → payable 100, B Cash 850.
4. Reserve cover through the real P12 service: `curl -H "x-test-secret: <secret printed at start>" http://127.0.0.1:4372/cover`. Reload: محجوز لتغطية الشحن 50, payable 50.
5. As payA from A Cash, review 60 → blocked (no debit); pay 50 → payable 0, cover 50 intact, A Cash 950.
6. Reload during/after confirmation or use استرداد نتيجة التحصيل: no extra payment. `curl … /pending` adds another unremitted delivery: pending 250 shown separately, payable stays 0.
7. Check phone width, history filters, source links and that staffA (`/api/test/p17-login/staffA`) cannot open the screen. Stop with `curl … /stop` or Ctrl+C.

Do not treat clicking quickly as concurrency evidence; the races are proven only by the independent-connection tests above.
