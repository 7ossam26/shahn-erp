# P19 verification — storage subscriptions, partial payments and advance credit

Date: 2026-10-07 (Africa/Cairo). Status: **implemented and verified within its stated local scope** (real PostgreSQL, real API/worker processes, real web app in Playwright). The owner manual trial is provided (`npm run p19:trial`) but not executed by the owner. No Tawsel call, real money, deployment or external message is involved.

Start: clean `main` at `39544ddc08202f87d192d61da0fa386b3cdec497` (`phase 18: …`), equal to `origin/main` after `git fetch` (0 ahead/0 behind). Work was done directly on `main`; no branch or worktree.

Runtime: pinned Node 24.21.0 / npm 12.2.0 from `.tools/`; Docker 29.7.2 with the pinned `postgres:18.6-bookworm` image (server `18.6 (Debian 18.6-1.pgdg12+2)`); Vitest 5.0.3; Playwright 1.63.0; TypeScript 6.0.3. Dependencies unchanged.

## Prerequisites (actual runs)

- `npm run db:status` on a fresh migrated database: `current` through `0022_p18_incidents` ([log](prerequisites/01-db-status.txt)).
- Actual-money atomic posting, kernel journals/leases and brand/account scope: `tests/db/kernel.test.ts` 21, `tests/db/finance.test.ts` 18, `tests/db/brands.test.ts` 13 and the worker kill/restart case `tests/integration/p12/transport.db.test.ts` 1 — 53/53 passed ([log](prerequisites/02-kernel-finance-brands-worker-db.txt)). Byproduct evidence they rewrite in P03/P09 was copied here and restored.
- Code inspection: `AccountFundsService` joins the caller's `UnitOfWork` client and never commits; storage receipts/refunds post their cash movement and storage effects in the same batch (proven by the fault-injection case below). P03 already reserved journal family `storage` (`receipt`/`allocation`/`refund`/`correction`), operating kind `storage` and work lane `storage`.

## Design summary

See [HANDOFF.md](HANDOFF.md) for paths, lock order, commands, worker and consumer interfaces, and [TRACEABILITY.md](TRACEABILITY.md) for the bounded requirement/decision mapping. Key choices:

- Migration `0023_p19_storage.sql` (planned `0019`; next free number). P04 configuration carries over as one agreement per brand with revision 1; **nothing is paid, received, allocated, refunded or earned**, and periods that began before the migration (or before a backdated brand-setup entry) are historical and left to P21 openings.
- Periods are generated from the original start/anchor/index (domain and SQL agree), are half-open, unique, contiguous and gist-exclusive; each earns exactly one complete fee at its start at the snapshotted agreement branch.
- One dedicated `(company, brand)` storage-credit subledger (`kernel.resource` family `storage`), separate from the payout wallet. Receipts are lots; allocations persist receipt→period amounts; refunds draw only unallocated credit with explicit cash-out confirmation.
- Renewal runs in the existing worker on the PostgreSQL `work_item` lane, one period per job, with lease fencing and acknowledgement in a separate commit.

## Final results

| Gate | Command | Result |
| --- | --- | --- |
| Phase | `npm run test:phase -- P19` | passed: unit 24 (18 calendar/accounting, 6 contracts), database 29 (13 storage, 9 worker/race, 1 real worker process, 5 HTTP, 1 populated upgrade), browser 2 journeys; public layer not applicable (no Tawsel call) ([final](11-phase-final.txt), [first](02-phase-first.txt)) |
| Lint | `npm run lint` | passed ([log](08-lint.txt)) |
| Typecheck | `npm run typecheck` | passed ([log](09-typecheck.txt)) |
| Build | `npm run build` | passed ([log](10-build.txt); pre-existing large-chunk advisory) |
| Unit regression | `npm run test:unit` | 626 passed, 0 failed ([log](04-regression-unit.txt)) |
| Database regression | `npm run test:db` | 38 files / 329 cases passed, 0 failed, including every earlier upgrade test now running through 0023 ([log](05-regression-database.txt)); the new worker-process file was added afterwards and runs in the final phase log |
| P04 browser regression | `npm run test:p04:browser` | first run 10/11 ([log](06-p04-browser-regression.txt)): stale selector `/البراندات/` also matched P17's «تحصيل البراندات» card; anchored to `/^البراندات/`; rerun 11/11 ([log](07-p04-browser-regression-rerun.txt)). P04 evidence it rewrites was restored. |
| Diff | `git diff --check` / `git diff --cached --check` | passed (see execution record) |

## Acceptance cases

| Case | Evidence | Observed |
| --- | --- | --- |
| P19-AC-01 | `worker.db.test.ts` | Anchor Jan 31 2027: Jan 31–Feb 27 (310), Feb 28–Mar 30 (350 after a rate change entered Feb 10), Mar 31–Apr 29 (350); replay ×3 adds nothing; duplicate period insert rejected 23505; one earning per period. 2028: Feb 29 then Mar 31. |
| P19-AC-02 | `storage.db.test.ts`, browser step 2 | Jan 20 2027 fee 310 at branch A; receipt 100 into B Cash: outstanding 210, status partial, revenue `{2027-01: 310}`, B Cash +100, A Cash unchanged, effects operating 310@A Jan 20, storage receipt 100@B, allocation −100@B. |
| P19-AC-03 | storage DB, browser steps 1/3 | Advance 500 (InstaPay to bank) on Jan 10: credit 500, revenue `{}`, no period. Feb 1 renewal: period paid by a `renewal` allocation of 310, credit 190, revenue `{2027-02: 310}`, no new cash movement. |
| P19-AC-04 | storage DB | Two unpaid 310 periods (Mar 5, Apr 5), receipt 400: 310 to Mar 5, 90 to Apr 5 (220 left), exact receipt→period rows, no wallet effect. |
| P19-AC-05 | storage DB, browser step 7 | Setup cannot stop silently (`STORAGE_STOP_USE_STORAGE_FLOW`); stop on Jul 20 → boundary Aug 10; worker on Aug 9/Aug 10/Dec 31 generates nothing; arrears 230 and history kept; no refund/proration/revenue reversal; second stop retained 409 `STORAGE_ALREADY_STOPPED`; arrears still payable. Future agreement stopped before start earns nothing and keeps credit 200. |
| P19-AC-06 | `worker.db.test.ts` both orders | Renewal first: stale refund → `STORAGE_CREDIT_CHANGED`, fresh retry → `STORAGE_CREDIT_ALLOCATED`, credit 190, cash unchanged. Refund first: refund 300 commits, renewal allocates the remaining 200 (period outstanding 110), credit 0. Independent pools; reconciliation exact; never negative. Payment/renewal races likewise: one receipt, no duplicated cash. |
| P19-AC-07 | storage DB (child process), `worker.db.test.ts` (child process), browser steps 5/8 | Payment process exits 88 after commit: account +50 once; a new process recovers the original result; replay identical; changed payload `COMMAND_PAYLOAD_CONFLICT`; another principal `NOT_FOUND`. Worker exits 77 after the period commit, job still leased (fence 1); after lease expiry a restarted worker gets `already_generated` (fence 2, ready) — one period/earning/allocation/audit. Browser: dropped payment and refund responses recovered with the same command, one receipt and one cash-out. |
| P19-AC-08 | storage DB, HTTP, browser step 9 | `STORAGE_CREDIT_ALLOCATED`, `INSUFFICIENT_STORAGE_CREDIT`, `STORAGE_CREDIT_CHANGED` (stale), `NOT_FOUND` (account invisible to B), `ACCOUNT_USAGE_FORBIDDEN` (A account for branch B), `INSUFFICIENT_FUNDS` (empty bank), `FORBIDDEN_SCOPE` (no grant): counts, balances and credit unchanged. |
| P19-AC-09 | storage DB, HTTP | Revenue stays at A, cash at B; a second agreement for the brand is rejected (23505); list branch filter A finds it, B does not. |
| Atomicity | storage DB fault case | Faults after movement/receipt/allocation/result (payment) and movement/refund/result (refund) roll back every journal, movement, record, audit, command and version; a renewal fault after the period insert leaves nothing and the job retries visibly (`pending`, attempt 1, last error shown on the agreement). |
| Terms/migration | storage DB, `migration.db.test.ts` | Change before start applies to period 0; mid-period fee/branch change applies next period only; anchor change after a period and storage removal rejected; backdated entry bills from the first period on/after entry. Populated 0022 upgrade: brands, policies, balances, movements, journals, lots and commands byte-identical; agreements carried with `first_billable_index` from the migration date; no periods/receipts; renewal starts at the first billable period only. |
| Real worker | `worker-process.db.test.ts` | The actual `apps/worker` process, using the Cairo database date, discovers and renews a due agreement (one ready job, fence 1, revenue in the current month) and stops with exit 0. |
| HTTP | `http.db.test.ts` | Session, forged header, missing grant, closed filters, foreign branch filter 403, contract-valid list/detail/catalog, 404/400, no generation endpoint, CSRF/origin, forged money/allocation/revenue fields, assigned receiving branch, retained/recovered results, stale version error contract, P09 history shows `storage_receipt`, refund/stop previews and commands with version/branch checks, OpenAPI paths. |

Evidence JSON: [native-storage-evidence.json](native-storage-evidence.json), [native-worker-evidence.json](native-worker-evidence.json), [migration-upgrade-db-status.txt](migration-upgrade-db-status.txt).

## Browser evidence (actual API/DB/web)

`playwright.p19.config.ts` starts `tests/integration/p19/serve.ts` (disposable PostgreSQL, real API with a controlled storage date, Vite web app, real P04/P09 setup) and runs two journeys: (1) advance → partial → renewal allocation → stale review → lost response → denied scope → stop → refund 50 with a dropped response → allocated refund blocked → no renewal after stop; (2) advanced filter with back navigation, phone filter dialog/reset, unauthorized user. Captures at 320/390/768/1440 in [screenshots/](screenshots/) with horizontal-overflow assertions. Results: [browser-results.json](browser-results.json).

## Manual trial (owner, not executed by the agent)

```bash
npm run p19:trial
```

It prints the control URL/secret and login links. Isolated company: branches أ/ب, خزنة الفرع أ (1000), خزنة الفرع ب (200), بنك الشركة التجريبي (0, usable by both); brands «براند التخزين الجزئي» (Jan 20 2027, 310, branch أ), «براند الدفع المقدم للتخزين» (Feb 1 2027, 310, branch أ), «براند نهاية الشهر» (Jan 31 2027, 310, branch ب). Storage date starts at 2027-01-01. Control (header `x-test-secret`): `GET /clock?today=YYYY-MM-DD`, `GET /renew` (runs the real renewal service), `GET /counts`, `GET /reconcile`, `GET /stop`.

1. `/clock?today=2027-01-10`. Open `/api/test/p19-login/storA` → «براند الدفع المقدم» → تسجيل تحصيل: InstaPay, بنك الشركة التجريبي, 500 → مراجعة التوزيع shows no due periods → confirm. Expect credit 500 and «لم تبدأ أي فترة بعد».
2. `/clock?today=2027-01-20`, `/renew`. Login storB → «براند التخزين الجزئي»: period «٢٠ يناير ٢٠٢٧ – ١٩ فبراير ٢٠٢٧», غير مدفوعة, إيراد يناير. Record 100 cash into خزنة الفرع ب → remaining 210; `/counts` shows B Cash +100.
3. `/clock?today=2027-02-01`, `/renew`. «براند الدفع المقدم»: period Feb 1–28 paid at period start, credit 190; `/counts` movements unchanged.
4. As storA on «براند الدفع المقدم» → إجراءات أخرى → إيقاف التجديد: last protected day 28 Feb. Credit 190 remains.
5. إجراءات أخرى → استرداد رصيد: 50 from خزنة الفرع أ with a reason and the cash-out confirmation. Reload during confirmation or use «التحقق من النتيجة»: `/counts` shows one refund and A Cash −50. Then try 200: the review blocks it as allocated money.
6. After step 3, «براند نهاية الشهر» already has its Jan 31–Feb 27 period. Run `/clock?today=2027-02-28` → `/renew` and `/clock?today=2027-03-31` → `/renew` to see Feb 28–Mar 30 and then Mar 31; repeat `/renew` and confirm nothing new appears.
7. Check phone width, filters (عليها متأخرات فقط), back navigation, and that `/api/test/p19-login/staffA` sees no storage money. Stop with `/stop` or Ctrl+C.

Do not treat clicking quickly as concurrency evidence; races are proven only by the independent-connection tests above.

## Attempt history (failures retained or described)

Details and corrections are in the [execution record](../../../phases/execution/P19.md). Summary: storage DB 10/13 → 12/13 → 13/13 (test-design fixes for the shared test company, a funded bank account and a job assertion scope); worker DB 8/9 → 9/9 (duplicate-period case first hit the fee/effect CHECK); browser 0/2 ([log](attempts/01-browser-first-failed.txt)) → 2/2 (strict-mode locator scope); P04 browser regression 10/11 → 11/11 (stale selector predating P19). Intermediate storage/worker logs were kept only in the session scratch area.
