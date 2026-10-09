# P26 operator pilot and continuation pack

Version P26-SETUP-002, 2026-10-09, Africa/Cairo. **Setup verified; business walkthrough unrun**. The numbered outcomes below are expected values, not posted results. [Current readiness and cleanup](READINESS.md).

## Actual environment and account inventory

| Item | Actual observation |
| --- | --- |
| ERP login | `https://app.switch2tech.cloud:25426/`; company code `p26-20261009` |
| Company admin | Native login username `admin`; issuer username `p26-20261009.admin`; real login passed |
| A-only/B-only/A+B | Native usernames `staff-a`, `staff-b`, `staff-ab`; issuer prefix `p26-20261009.`; real logins passed |
| Support | Issuer `p26-20261009.support`; actual support MFA/native support enrollment pending, no support access pass |
| Driver identities | Issuer `p26-20261009.driver-a` / `.driver-b`; no operational-driver/employee-term mapping or actual human Tawsel session yet |
| Issuer/client | `https://auth.switch2tech.cloud/realms/tawsel-company`; login `shahn-p26-20261009`, worker `shahn-p26-identity-20261009` |
| ERP company/branches | [Access seed IDs](live/access-seed.json); branches A/B/C; no business/financial seed effects |
| Tawsel source | Tenant `4c7ea88a-c29f-41f0-833d-df7d915bf8c3`, integration `cccab5a7-11d6-44db-9669-cc533b32f48d`; service bearer remains in protected file |
| Callback | Bounded trial passed; test webhook now disabled, temporary shared proxy/destination/keys removed; signed4 receipts remain pending application |
| Physical phone | No device trial; screenshots are Chromium viewport emulation |

Test passwords and sessions are stored only in protected `/opt/shahn-p26/20261009/private/pilot-state.json` and role-specific session/browser files. An authorized server operator may retrieve a test password into their password manager; never paste the file into Git, logs or chat. Existing business accounts/data are untouched. Seven initially created test-only usernames were disabled after their format mismatch; use the corrected dot-format identities above.

## Actual setup and bounded collector invocation

The protected server root is `/opt/shahn-p26/20261009`. The release uses the existing official `source/deploy/compose.release.yml`, isolated `pilot.override.yml` and `release.env`. These contain private mount/config references and must not be published. The snapshot and immutable image IDs are in [versions](live/pilot-versions.json). Collector scripts executed with the official verification image and protected `/run/p26` mount; `p26-seed.mjs` and `p26-link.mjs` require `APP_ENV=test` and `P26_APPROVED_ISOLATION=true`. The seed refuses an existing company; reuse the existing fixture and saved command IDs instead of reseeding/recreating actions. `p26-login.mjs` records actual issuer logins; `p26-release.mjs` inspects the running isolated containers and drains/restarts only its own API. The retained private `link-run.sh` documents exact invocation. Do not rerun the link collector against the currently disabled callback without reactivating scoped destinations/keys/proxy and arranging guaranteed restoration.

No complete business seed or end-to-end P26 collector is registered. Finish P25 prerequisite acceptance before using the numeric walkthrough as a business trial. The original P22 trial file is not replaced by the narrower fresh branch/callback proof.

## Reproduce the completed preflight

Run from the checkout above in PowerShell:

```powershell
. ./scripts/use-pinned-runtime.ps1
npm run test:p25:operations
npm run test:p22:public
npm run test:phase -- P26
node scripts/verification/p26-inventory.mjs
npm run lint
npm run typecheck
npm run build
```

Observed results: operations 5/5 fail; public 8/8 fail; P26 unregistered; inventory exit 2 with explicit gaps; lint/typecheck/build pass. See [READINESS.md](READINESS.md) and immutable attempt transcripts. The inventory command writes source/file metadata, runs no service tests and always reports blocked readiness. It cannot close a gate by discovering a file. Its environment/failure notes describe this dated attempt.

## Fixture prerequisites for the later connected run

Create one isolated, versioned P26 batch through actual native commands or a documented safe seed. Record company and batch UUIDs; branches A/B/C; actual role/user/employee/driver identities; ready-parcel/company-packed/stored-stock brands; allow-negative/no-negative policies; payout weekdays; manual tier/governorate/area rate revisions; funded cash/bank account IDs and traceable opening/funding command sources. Assert initial stock, custody, wallet, payroll, storage and journal invariants before continuing.

Every fixture row needs its native reference, initial revision, command ID and expected minor-unit amount or whole quantity. Source actions/events additionally need canonical action/event/cycle/attempt identities. Record the fixed simulated business instants and actual Cairo period boundaries in the test clock; do not change host time. Storage needs explicit January 20–February 19 boundaries in the chosen fixture year. Price and employment revisions must reproduce historical branch/rate attribution. Only access-v1 is established; business fixtures and a fixed business clock remain unconfigured.

## Required walkthrough sheet — expected, unrun

Amounts use EGP minor-unit integer strings in the assertions. The readable EGP values below do not constitute posted money. For each row, fill in actual URLs/account-role/reference IDs, committed journals/custody/source identities and screenshot paths after the connected result exists.

| Group / action | Expected committed result | Required rejection or recovery |
| --- | --- | --- |
| 1. Register goods 100+150, shipping 50; actual Tawsel delivery/payment 300; full remittance 300; brand payout 100 | Initially pending goods `25000`; after remittance/payout eligible `15000`, shipping revenue `5000`, account net increase `20000` | Replay events and original remittance/payout commands: unchanged identities and totals; recover a lost response without a second physical payout |
| 2. Company-packed base 50/uplift 5; two eligible reached visits and an unvisited postponement | Each evidenced visit earns `5500`, attributed to historical branch/actual driver; percentage commission basis `5000`; postponement earns 0 | No arrival evidence means no visit fee; preserve missing reason as unavailable until authoritative reason extension acceptance; exclude prior-paid-attempt scenario |
| 3. Two independent requests compete for final stored-stock unit; prepare, hand over, receive return, inspect/dispose | One confirmation reserves it; sound quantity reusable only through proper release; damaged quantity unavailable; prepared claim remains singular through transfer | Deterministic PostgreSQL barriers in both orders; losing command cannot reserve or post partial effects; return offer alone creates no availability |
| 4. Loose stock 10 A→B; separate whole named parcel transfer, C tracking search, cancellation/source return | B receives 8 sound/1 damaged/1 unresolved missing; custody/availability reconcile; no brand charge/extra commission; C sees full operational journey | C direct mutation denied; cancellation only before handover; after handover recover through actual source-return receipt, without teleporting goods |
| 5. Full remittance 1000 as 800 cash + 200 InstaPay | One receipt `100000`, components `80000` + `20000`; zero-due work creates no cash | `99900` rejects with no receipt; changed source evidence holds/refreshes; correction after payout preserves original payment and opens bounded review |
| 6. Eligible wallet 100, known cover 50; race payout 60 | Available `5000`; cover consumption and reservation release atomic, no double subtraction | Independent committed race in both orders; never spend same credit twice; pending goods cannot fund cover |
| 7. Confirm goods 400 incident split 200 company/200 employee; linked replacement goods 250/waiver 50 | Eligible brand credit `40000`, employee obligation `20000`, net incident cost `20000` once; replacement recipient due `25000`, net shipping revenue 0, ordinary commission retained | Suspected incident posts nothing; replay confirmation has no extra credit/obligation; source waiver preserves goods due |
| 8. Storage 310 January20–February19; partial100; separate advance500 before start, stop/refund | January revenue `31000`, February 0; due `21000`; advance credit `50000` and initial revenue 0; start allocates/earns `31000`, residual `19000` | Stop retains credit; explicit unallocated-credit refund moves real cash once without reversing unrelated service revenue |
| 9. Salary6000/deduction200/advance1000; separate earnings3000/obligations3500 | Payout `480000`, employee cost `580000`; separate month zero payout/carry `50000`; next `300000` earnings leaves `250000` absent other entries | Race duplicate payouts; later terms preserve paid/past rate/branch; verify one payout and identified carry/recovery sources |
| 10. Historical paid expense, general funding, full treasury transfer, opening and typed correction; selected reports | Actual cash/profit classification; approved aggregate profit `620000`; generic funding/transfers/openings/brand goods excluded from income | Forged/revoked/foreign-company requests denied; permission changed before export download denies it; screen/XLSX/PDF share authorized snapshot and visible source incompleteness |

The selected report surfaces are REP-01/05/07/08/12/14/15/18, combined REP-09/10 and HR-contained REP-24/25. Catalog exclusions remain visible in the inventory and need replacement/exclusion review; they are not new report work.

## Cross-module failure and screen checks

After environment/starting-state checkpoints pass, use P22's exact public cases for lost local-commit response, worker death after source acceptance, duplicate/out-of-order events, source revision conflict, key rotation, authentication expiry, receiver restart and compaction/reconciliation. Record actual interruption points and durable state. A receiver acknowledgement proves receipt only. Known gaps hold affected eligibility; unrelated brands remain usable. Historical held status with zero effective held quantity is not a stock hold.

Exercise ordinary access, treasury scope exceptions, company-wide tracking read, shared-wallet payout and developer support audit separately. A tracking grant does not supply contacts/payroll/exports or mutation scope. Run direct negative requests independently of UI visibility.

Capture connected screens at 390x844 and 1440x1050, with 320/768 widths and long Arabic content. Include loading/empty/stale/unknown/denied/recovery states, actual labels/focus/keyboard/touch paths, Arabic-digit input and no horizontal overflow. The actual-phone trial has its own device/account/date and limitations; viewport emulation does not replace it. Access-only home screenshots exist at390x844/1440x1050 viewports; the required business/state/device matrix remains unrun.

## Operator glossary

- **Recipient payment:** money reported by the driver as collected from the recipient; it is not yet cash received by the company.
- **Driver remittance:** confirmation of the complete effective recipient-money receipt into the company's cash/bank accounts.
- **Brand payout:** actual disbursement from an authorized funded account against eligible shared brand credit.
- **Storage credit:** received money not yet allocated to a started/due storage period; separate from brand payout wallet credit and earned revenue.
- **Payroll advance:** actual cash paid to an employee and linked to later obligation recovery; it does not reduce employee operating cost like an entitlement deduction.

Operator use begins only after the remaining P25 gates and shared business fixture are closed and actual P26 references replace the unavailable entries. Named Tawsel acceptance remains in the single [handoff](../../../TAWSEL-CHANGE-REQUESTS.md); this pack authorizes no Tawsel edit or production rollout.
