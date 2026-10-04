# P09 verification and isolated owner trial

P09 implements accounts, actual paid expenses and general deposits/withdrawals. [Consumer interfaces and scope](HANDOFF.md), [acceptance map](TRACEABILITY.md), [execution log](../../../phases/execution/P09.md). Automated verification uses disposable local databases and fixture logins; owner manual review and a live issuer are separate pending work.

Final registered [P09 suite](24-phase-final.txt):12 unit,18 PostgreSQL/API/process and9 browser cases passed. [Prerequisite regressions](25-prerequisite-regression.txt):63 DB/API cases passed; [workspace unit regression](32-unit-final.txt):131 passed. Lint, typecheck and production build passed in26–28, with closure lint in33. The empty-suite diagnostic rejects with exit1 in31; failed earlier attempts are retained rather than relabeled.

From repository root in PowerShell:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run test:phase -- P09
```

The registered runner must run nonempty unit, actual PostgreSQL/API/process and browser suites. Public/provider integration is explicitly inapplicable: no bank connector or Tawsel change is part of this phase. Exact outputs, including failures, are retained here. `database-results.json` includes retained upgrade rows, command/source/effect references, committed700 balance, controlled lock waits and restarted-process result. `browser-results.json` and `screenshots/` cover focused Arabic RTL pages and error/recovery states. `seed-ids-*.json` contains nonsecret fixture identities. Temporary runtime/session secrets are ignored and deleted on teardown.

## Manual trial

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run p09:trial
```

Open [isolated admin login](http://127.0.0.1:5313/api/test/p09-login/admin). This is an explicit disposable fixture session, not a customer issuer login. The trial marks its company and records P09, rejects production seeding, and creates B Cash/Company Bank at zero. Ctrl+C stops services and deletes the disposable database. Automated browser setup funds these same accounts; the manual trial leaves both at zero.

1. Open الإيداع والسحب from the module cards. Record deposit1000 EGP, branchB, B Cash, actual date today, Cash, blank optional reason. Review amount/account/branch and confirm.
2. Open البيانات المرجعية → تصنيفات المصروفات. Add a category, then open المصروفات and chooseB, B Cash,200 EGP, that category, a description and a previous-month actual date. Confirm actual payment.
3. Record a generic withdrawal100 EGP from B Cash with blank reason. Account detail must show700 EGP and exactly three movements. Only the expense200 has a paid operating-cost source. Inspect actual date, separate entry timestamp, actor and category label.
4. Try another expense800. Expect a focused insufficient-funds rejection, preserved input and unchanged700 balance. If actual cash was already paid but books disagree, use the later discrepancy workflow; there is no overdraft override.
5. Open [B-only fixture login](http://127.0.0.1:5313/api/test/p09-login/staff-b). OnlyB is offered for business attribution. A bank payment uses a real bank account and permitted branch; InstaPay has no separate balance. ForgedA/cross-company checks run in the real DB/API suite.
6. Inspect combined account/category/method/actual-versus-recorded filters, open a result and return using العودة للقائمة. The query remains. Try reset and an empty search. Check keyboard focus after rejection and phone confirmation at390×844; desktop1440×1050 and320/768 are also captured.

Response-loss simulation is automated in `tests/p09/finance.spec.ts`: it forwards a real command, discards the committed response, reloads and retrieves the original command. The result is the original expense and unchanged balance, with no second payment. The process test kills a real API before/after commit and restarts it against the same database. Browser coverage is not a claim of physical cash movement.

## Limits and stop

P09 has no unpaid-expense invoice/due workflow, editable/opening balance, provider credentials, bank API, profit report, payroll payment or treasury transfer. Customer live issuer, Docker regression, physical-device/owner review and production/capacity/restore checks are unrun. P10 onward remains unstarted. No production migration, payment, publishing, deployment, purchase, commit/push/merge or external message was performed.
