# P10 verification and isolated trial

P10 implements separate treasury send and full actual receipt, with money in transit. [Consumer handoff](HANDOFF.md), [bounded acceptance](TRACEABILITY.md), [attempts and exact results](../../../phases/execution/P10.md). Owner review and customer live issuer are separate from the disposable PostgreSQL/API/browser evidence.

The complete registered [P10 run](25-phase.txt) passed **16 unit,22 committed PostgreSQL/API/process and6 browser cases**, including build. [Lint](27-lint.txt), [typecheck](28-typecheck.txt) and [147 workspace unit cases](29-unit-regression.txt) passed. Prior failures and corrected reruns remain visible in the execution record. [Runtime/migration identities](VERSIONS.md) preserve the unchanged dependency pins and exact migration.

[Current prerequisite regression](26-prerequisite-regression.txt) passed56 committed DB/API cases across authorization, transaction kernel and P09 finance. Automated owner-trial steps succeeded; owner manual/device approval remains unreviewed.

Run the registered suite from the repository root:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run test:phase -- P10
```

The runner registers nonempty Vitest, real PostgreSQL/API/process and Playwright layers and propagates failure. No bank provider or Tawsel network operation is applicable. The initial unconfigured `npm run db:status` failed; the isolated fixture subsequently executes that same database CLI with explicit test configuration and records current migration status in04. Fresh browser databases and a committed pre-P10→P10 upgrade are both exercised; prior money effects are compared byte-for-byte as JSON.

## Manual trial

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run p10:trial
```

This creates a disposable, explicitly labelled P09/P10 company using P09's actual finance seed and commands: source A Cash1000 funded by a labelled actual test deposit, B Cash0, company bank0, branchC, a sender assigned onlyC with treasury.send, and a receiver assigned onlyC with treasury.receive. It uses persisted fixture sessions, not a customer issuer login. Ctrl+C stops the services and the fixture's normal teardown removes its own disposable database. Never use the fixture login routes as production authentication.

1. Open [sender trial](http://127.0.0.1:5315/api/test/p10-login/sender). Choose إرسال تحويل, source branchA/source cash, destination branchB/B cash,300 EGP and the actual send time in Cairo. Review and confirm actual sending.
2. Inspect the committed numeric transfer reference, sender/time, fixed amount300 and قيد النقل. Reload: it remains pending. Source cash is700, destination0 and transit300. [Admin trial](http://127.0.0.1:5315/api/test/p10-login/admin) can inspect assigned-branch account balances/history; deactivating either needed account is refused with the pending-transfer link.
3. Open [receiver trial](http://127.0.0.1:5315/api/test/p10-login/receiver), then the pending transfer. There is one fixed full amount, no editable receipt amount or refund/rejection control. Set actual receipt time after send, review the actual B account and confirm only after full physical arrival. Destination becomes300, transit0, source stays700; sender/receiver/actual/recorded timestamps remain visible.
4. Reload and submit the original receipt again through the API harness, or recover its same command. It returns the original or already_received outcome; B remains300. [Both-grant trial](http://127.0.0.1:5315/api/test/p10-login/both) may send and receive itself.
5. Try sending800 from remaining700. Expect a focused insufficient-funds rejection and retained input. The API harness's attempted299 receipt and altered destination fail before posting. The receiver remains unable to enter a B expense without assigned-branch authority despite holding that screen grant.
6. Inspect combined branch/state/date/reference filters, Arabic digit search, empty/reset behavior and detail/back retention. Check the fixed receipt and timeline at390×844 and1440×1050; automated evidence also covers320/768 and long account names.

`tests/db/treasury-transfers.test.ts` queries committed journals directly, controls independent lock contenders and restarts real API processes. `tests/p10/treasury.spec.ts` drives the implemented HTTP/UI, aborts the response only after commit, reloads and recovers. `database-results.json`, `browser-results.json`, nonsecret `seed-ids.json` and `screenshots/` carry concrete evidence. Earlier failed JSON/output remains separate.

No production payment, bank transfer, Tawsel edit, deployment, publish, purchase, commit, push or merge occurs. P21 legitimate correction, P23 reports/exports, P24 reconciliation and all later phases remain separate. Customer live issuer, fresh Keycloak login, owner manual/physical-device/screen-reader review and production/capacity/restore are unverified.
