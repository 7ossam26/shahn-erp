# P16 verification — full driver remittance

Date: 2026-10-06 (Africa/Cairo). Status: **native implementation, required public/human acceptance blocked**. No P16 completion commit or push is allowed while the required gate is blocked. Work is retained on `main`.

Start: clean checkout at `17c184ee9586a2a8286b147f26eacf94af77dc90` (`phase 15`); existing origin fetched and main/origin main were equal,0 ahead/0 behind. No branch/worktree or unrelated owner edit was created. Actual agent: Codex/GPT-6 family; an exact deployed model/effort identifier was not exposed, so the recommendation is not reported as an observed setting.

Runtime: Node24.21.0, npm12.2.0, PostgreSQL18.6 (disposable native clusters), Vitest5.0.3, Playwright1.63.0, TypeScript6.0.3. Dependencies were not upgraded. Pinned Tawsel source remains `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`; no Tawsel repository or production state was edited.

## What was read and reused

Phase/EXECUTION-CONTRACT/model guidance/catalog/master plan; exact assigned requirement/decision acceptance rows; domain8/9.1/9.2/14, data5.1–5.3/7–9, remittance/shared screen rules; integration5/10–14/16–18 and coverage ledger. Complete pinned05 monitoring/outcome/correction/workday-closure blocks and pinned04 source monitoring5476–5981 were inspected. All72 positive/negative `p17-*`, `p19-*`, `p23-*`, `p25-*`, `monitoring-*` bodies were read using full JSON and exact structural differences. Embedded06 digests and extracted fixture copies were compared successfully. These fixtures explain source shape/authority; they do not prove a live producer's permission or finality.

Actual P03 one-client UnitOfWork/CommandService/journal/wallet, P04 wallet initialization, P09 account funds and P11/P13 source reader/inbox/ordered projection interfaces were inspected and exercised. Prerequisite run:92 passed across kernel21, brands13, finance18, P11 boundary19, P13 execution13 and monitoring8. Generated P03/P04/P09 results were retained under [prerequisites](prerequisites/) and their prior tracked evidence restored. The later [expanded database run](database-expanded.txt) passes35 cases, including both P13 suites and P16 races/restart/upgrade.

## Cases and evidence

Final results: `npm run test:phase -- P16` passed79 unit/contract tests,15 real PostgreSQL tests and1 connected browser journey, then exited1 at the required public-integration gate (1 failed because the independent runtime/trial configuration is absent). Typecheck, lint, build and `git diff --check` passed. Final320px/390px and1440px captures were visually inspected; the browser also checked320/390/768/1440 widths for horizontal overflow. These native passes do not close the public/manual acceptance gate.

| Case | Observed native result |
| --- | --- |
| A01 | Ten assigned/eight paid: only eight effective positive reports sum; explicit zero and null remain distinct. |
| A02/A03 |1000 receipt requires exact800 Cash+200 InstaPay;999 and1001 fail with no receipt/account/eligibility effect. Exactly850 goods is released. |
| A04 | Complete controlled HTTP pages,409 restart,304 valid cached body,401/403/404/503, incomplete second page, conflicting round-end time and known predecessor gap. A separate round remains usable. |
| A05 | Two distinct commands compete under independent connections: one receipt/source coverage. Same command repeats; changed payload conflicts. |
| A06 | Correction before receipt and correction after remote read invalidate old witness. Reviewed effective amount can be received once. |
| A07 | Correction after receipt keeps actual cash, creates one linked review and affected lot hold; duplicated event does not add cash/review. |
| A08 | Zero-money round records checked state without movement or release. Goods prepaid/all-paid cases create no second goods credit. |
| A09 | A child process exits immediately after PostgreSQL commit without returning a response. A new process recovers the original command/coverage. |
| Atomicity | Faults after coverage, during account credits, after release and before result roll everything back, including audit/result. |
| Authorization | Current assigned branches/grants rechecked before refresh, command and retained result; denied B-only view. |
| Upgrade | Populated P15→0020 preserves existing accounts, wallets, journals, grants and command identities; no fictional historical remittance. |
| Browser | Real API/PostgreSQL, amount mismatch, missing page, preserved inputs, actual confirmation, interrupted response/reload/recovery, later review, assigned scope, Back filters,320/390/768/1440 widths. |

[Native committed journals](native-journal-evidence.json) contain the isolated witness, source IDs/revisions, component movements, account balances and mapped credit releases. No secret/session/credential is exported. [Browser results](browser-results.json) and [captures](screenshots/) are native evidence with controlled source HTTP. Earlier layout captures are retained in `screenshots/first-layout/`.

## Commands and attempt history

Use PowerShell from repository root:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run test:db -- tests/integration/p16/remittance.db.test.ts tests/integration/p16/migration.db.test.ts tests/integration/p13/monitoring.db.test.ts tests/integration/p13/execution.db.test.ts
npm run test:phase -- P16
npm run typecheck
npm run lint
npm run build
git diff --check
```

1. Initial database fixture setup rejected a Giza shipment because the shared P12 test helper assumed Cairo tariff identity. The helper now reads the applicable policy/tariff identity/version. This is a test-support repair, not production pricing behavior.
2. Denied source reads exposed an undefined workday in P13 canonical basis serialization. It is now explicit null; the first nine P16 DB cases then passed.
3. Typecheck found duplicate object key/required shared UI props, then a public-test inferred return type; corrected. Lint found a conditional-expression statement and a const declaration, then P12 fixture formatting; corrected. Failed lint logs are retained.
4. First browser command was invoked before script registration and reported missing script. After registration, [first browser trial](browser-first.txt) passed. Visual inspection found the shared form grid spread sequential receipt components across desktop columns; scoped CSS now keeps the reading/confirmation flow sequential.
5. [First phase attempt](phase-first.txt) passed7 unit cases but failed database startup because that invocation omitted `SHAHN_TEST_PG_BIN`;13 cases were consequently skipped. This is retained as failed evidence, not a pass. The explicit native-PG rerun executed all cases.
6. [Expanded DB run](database-expanded.txt):35 passed. Subsequent [phase selector failure](phase-selector-failure.txt) passed79 unit and15 DB cases but caught an ambiguous browser selector among three fixture rounds; it now targets the exact intended round. The [final phase log](phase-final.txt) records the corrected rerun and required public-gate result.
7. Final static evidence: [typecheck](typecheck-final.txt), [lint](lint-final.txt), [build](build-final.txt), [diff check](diff-check.txt). Existing large-chunk build advisory is retained, not a build failure.

## Manual trial and public gate

`npm run p16:trial` creates an isolated native PostgreSQL/API/web trial with controlled source monitoring. It is useful for native inspection only. Open `http://127.0.0.1:5361/api/test/p16-login/admin`, choose the ended round at `/remittances`, refresh evidence, enter800 Cash and199 InstaPay, and observe blocked confirmation. Use200 instead, explicitly confirm actual complete receipt and inspect1000 received/850 goods. Browser tests also interrupt the command response after server commit, reload/recover, then apply a controlled later correction. Test-only login/control routes exist only in `tests/integration/p16/serve.ts`, not the product app.

The user-required independent trial remains unexecuted: legitimate human test-driver deliveries250+50 and600+100, round end with its permitted correction window, withholding/recovering required source evidence, rejecting999, recording800+200, retry, and a legitimately accepted later correction. The host has no configured `TAWSEL_CONFIG_FILE` or `TAWSEL_P16_TRIAL_FILE`; no external environment or credentials are invented. `npm run test:p16:public` fails explicitly in that condition. Required artifacts: approved isolated source configuration with monitor.read; real test company/driver/session; original outcome/closure identities; actual complete public histories/cursor and signed-event evidence; original ERP witness/account/eligibility records; accepted supported correction or its genuine lifecycle rejection; browser/manual captures. See `tawsel.public.test.ts` for the trial-file shape. Keep secrets outside Git.

IP-GAP-004 stays open. The source supplies received evidence, not a global token proving that no unseen device work exists. Required public/manual acceptance blocks completion commit/push even though native cases pass. [Handoff](HANDOFF.md) defines the immutable P17 bridge and P21/P22 review/recovery boundaries; [traceability](TRACEABILITY.md) records bounded claims. P17 was not started.

Final Git state: uncommitted P16 implementation/evidence preserved on `main`; HEAD remains `17c184ee9586a2a8286b147f26eacf94af77dc90`. No P16 commit was created and no push was attempted because required acceptance remains blocked.
