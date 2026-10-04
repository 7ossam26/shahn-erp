# P08 — employee setup verification and isolated trial

Verified within the stated local scope on 2026-10-04, Africa/Cairo. P08 provides employee profiles, independent salary/commission configuration, effective history, explicit local driver association, exact commission preview and the shared payroll edit guard. Actual visits/earnings are P13-owned; payroll/advances/payment are P20-owned. Tawsel mapping is visibly pending P11.

## Observed checks

| Command / evidence                                                                                                                                             | Observed result                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run test:phase -- P08` — [registered suite](24-phase-final.txt)                                                                                           | 9 connected unit, 12 real PostgreSQL/API and 8 browser cases pass; production build passes; external integration explicitly not applicable |
| `npm run test:unit` — [workspace regression](25-unit-regression.txt)                                                                                           | 119 cases in 11 files pass                                                                                                                 |
| `npm run lint` — [lint](27-lint.txt)                                                                                                                           | Pass                                                                                                                                       |
| `npm run typecheck` — [compiler](28-typecheck.txt)                                                                                                             | Pass                                                                                                                                       |
| `npm run test:runner` — [phase runner](29-runner.txt)                                                                                                          | Pass; unknown phase cannot silently run zero cases                                                                                         |
| `npm run test:db -- tests/db/employees.test.ts tests/db/access.test.ts tests/db/kernel.test.ts` — [prerequisite regression](30-prerequisite-db-regression.txt) | 50 cases pass:12 employee,17 access,21 kernel; includes protection of superseded historical branch data                                    |
| `npm run db:status` on the disposable actual database — [status](03-live-db-status.txt)                                                                        | Current, all 12 migrations applied                                                                                                         |

[Database results](database-results.json) record actual denied branch HTTP, exact effective resolution, genuine PostgreSQL lock waits and both edit/freeze orders, conflicts, rollback and retained result/audit. [Browser report](browser-results.json) records the final eight journeys. [Acceptance traceability](TRACEABILITY.md) bounds each claim. [Consumer handoff](HANDOFF.md) defines the transaction/identity/guard interfaces for P11/P13/P18/P20; [deterministic fixtures](fixtures.json) give exact formulas and date boundaries.

Final `npm run lint`, `npm run typecheck` and explicit `npm run build` pass after the historical-scope assertion ([lint](33-final-lint.txt), [compiler](34-final-typecheck.txt), [build](35-final-build.txt)). [Final consistency](36-final-consistency.txt) confirms42 bounded matrix rows,52 local links, unchanged normative assertions/prior migration/prototype/kernel evidence, `git diff --check` and removed trial runtime secret.

Node24.21.0/npm12.2.0 and native PostgreSQL18.3 were actually used. No dependency upgrade, payment, login creation or Tawsel provisioning occurred. Browser/API tests use persisted authenticated P02 sessions in a disposable marked company. They do not claim fresh Keycloak login, customer live issuer/connector, owner approval, physical-device review or production deployment. The original prototype and earlier migration bytes remain unchanged.

Initial failed checks remain alongside their repaired reruns; [execution record](../../../phases/execution/P08.md) explains AJV resolution, SQL ordering, immutable fixture retention, initial browser recovery/section-state issues and formatting repairs. `16-browser-results-failed.json` preserves the first browser failure report separately from the final report.

## Run the isolated trial

From the repository root in PowerShell:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run p08:trial
```

After startup, open [the isolated P08 fixture login](http://127.0.0.1:5311/api/test/employees-login). It creates a disposable PostgreSQL cluster, actual API on4311 and browser UI on5311; ports must be free. The fixture login belongs only to this test harness. Ctrl+C shuts down its services/cluster. No production seed or live-company data is used. In the application, choose **الموظفون** from the module home.

1. Inspect Salma: salary6000 only. Inspect Karim: fixed7 commission only, explicitly pending local driver mapping. Inspect Mona: salary6000 plus10% commission. Create another employee with both toggles off and observe the plain no-automatic-earning explanation.
2. Create a combined profile with a long Arabic name, workdays, hours and weekly day off. Remove the selected day off from workdays and save: validation focuses its notice and retains values. Restore the valid schedule and save. Schedule fields remain descriptive; no attendance calculation appears.
3. Open **تغيير الشروط**, select commission and preview base50/uplift5 at10%. Commission is5. Switch to fixed7 and preview7. Schedule a future effective date with a reason and inspect both old and new history. Exact resolution on either side is also exercised in the database suite.
4. Select salary and preview a current full unpaid-month correction; save and inspect the preserved revision. A past month is rejected even without a prior period row. Paid/frozen/zero-closed cases and both competing freeze/edit orders are available in the automated database fixture; no Pay control is invented to manufacture them in the UI.
5. Create a duplicate display name/contact. Its employee UUID/reference remains distinct; no driver/login matching occurs. Use **ربط مندوب** to make an explicit local identity association and inspect pending external mapping.
6. Inspect branch, active, salary/commission and effective-date filters. Returning from a detail preserves the filter query. Branch choices come from current assignments. Reassignment requires both branches and a reason; P08 supports current-day branch changes, while future commission/salary changes have their own effective fields.
7. Deactivate an employee and inspect retained terms/profile history. The browser suite deliberately drops committed create/deactivation responses, reloads retained intent, recovers the same command and checks no duplicate result/history. It also revokes branch access before recovery and observes a real403. Run `npm run test:p08:browser` to repeat these fault journeys.

## Visual review

Reviewed [mobile saved profile](screenshots/saved-390.png), [desktop saved profile](screenshots/saved-1440.png), [mobile unknown result](screenshots/unknown-390.png), [mobile validation](screenshots/setup-error-390.png) and [desktop preview](screenshots/base-preview-1440.png). Separate salary/commission groups, wrapped long Arabic names, readable units, disabled unknown-save controls and retained input are visible. Browser assertions cover320/390/768/1440 widths, focus and no horizontal overflow. These are local Chromium viewport checks, not physical-device approval.

P08 stops here. P09–P26 remain unstarted.
