# P11 — local implementation and external acceptance dependency

P11 implements scoped Tawsel provisioning, a durable source outbox, exact-byte signed receipt and the Arabic integration pages. **Real connector acceptance remains blocked:** the owner confirmed that no usable local Tawsel project/configuration path is available. No independently running Tawsel, approved operator/service credentials, test issuer or public allowlisted callback was supplied. Local fixture HTTP responses are not live Tawsel evidence. P12 has not started.

[Execution and retained diagnostics](../../../phases/execution/P11.md) · [interfaces and setup](HANDOFF.md) · [bounded traceability](TRACEABILITY.md) · [baseline extraction](baseline-extraction.json).

The local tests use real disposable PostgreSQL 18.3, committed transactions, independent HTTP requests and separate killed Node processes. Canonical contract fixtures and the local remote-acceptance server are explicitly test data. Production API code has no fixture login routes. The browser harness alone supplies persisted test sessions.

[Final full phase run](26-final-phase.txt): **98 unit, 18 PostgreSQL/API/process and 5 browser passed**, including production build. The required public test failed explicitly as **BLOCKED**. [Additional upgrade-history check](34-upgrade-history.txt): **1 passed**, preserving existing native users and committed command/outbox bytes; the other 18 cases were intentionally excluded by that targeted run. [Full unit regression](32-unit-regression.txt): **245 passed**. [Typecheck](28-typecheck-final.txt), [lint](29-lint-final.txt) and [runner registration guard](30-runner.txt) passed.

[Final typecheck/lint recheck](36-final-checks.txt) also passed after the added upgrade test and credential-file path guard. Documentation links and original/extracted baseline hashes were checked; the [versions](versions.json) distinguish Windows checkout line endings from original source hashes.

## Run the checks

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run test:phase -- P11
```

The registered runner executes the nonempty unit, PostgreSQL, browser and real-public-integration layers in order. The public layer fails explicitly with `BLOCKED` and the required variable names when `TAWSEL_CONFIG_FILE` and `TAWSEL_P11_TRIAL_FILE` are unavailable. A green local layer does not override that failure. `npm run test:unit`, `npm run test:db` and the registered Playwright configuration include the new tests; no empty-suite bypass is enabled.

The suite proves exact canonical HMAC reproduction; all 27 sender payload mappings; raw tamper, duplicate security headers, bad key/scope/time/version rejection; eight simultaneous receipts producing one inbox row; signed identity/sequence conflicts; the exact 2 MiB ingress boundary; gap tracking with application watermarks at zero; native replay/conflict/current authorization; one user revision stream; fenced stale completion; worker death after fixture remote acceptance; receiver death after inbox commit before acknowledgement; database restart; accepted-versus-issuer-ready and completed disable; returned key overlap. Fresh and pre-P11 database upgrade are both exercised. Builds/typecheck/lint and the existing unit suite are recorded separately.

## Local browser trial

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run p11:trial
```

Open [the isolated admin trial](http://127.0.0.1:5317/api/test/p11-login/admin). This uses a disposable database, a deliberately unavailable Tawsel URL and an explicitly seeded unknown command/pending event. It does not run Tawsel or an issuer. Ctrl+C closes this trial and removes its own database.

1. Inspect connection verification, unbound identities, outgoing Unknown and Received/Pending separately. Opening a received event never claims application or changes stock/money.
2. Open the unknown branch command and retry. Its action ID and immutable request remain unchanged. No driver-outcome override exists.
3. Choose **إعداد هوية للربط**, select the second branch and save. The native intent commits immediately; remote acceptance remains pending without Tawsel. Branch/role/user/driver choices come from authorized native records.
4. Inspect entity/state/Cairo half-open date filters, clear them, and use detail/back navigation. Test 1440×1050, 390×844, 320 and 768 widths. The automated lost-response trial aborts only after the native server commits, reloads, then recovers the same saved command.
5. Open [the denied staff trial](http://127.0.0.1:5317/api/test/p11-login/staff); current API access is denied independently of navigation. Never reuse test login routes as actual authentication.

Captured pages are in [screenshots](screenshots/). Comparison uses UI-REV-001's existing utility shell, Cairo type, white/lime treatment, focused pages and mobile cards; the original prototype was not changed. Automated browser/visual inspection is distinct from owner, screen-reader and physical-device review.

## Real acceptance still required

Use an approved independent development Tawsel/issuer and the [setup sequence](HANDOFF.md). The source base URL may be local in development; the canonical callback still requires allowlisted public HTTPS on 443 and public unicast DNS. Running both applications locally does not relax that callback policy.

The public test file must contain approved test company/session/CSRF data, stable native branch/user/driver commands (include role/branch prerequisites), and a real sender event ID. Run it only against that approved test environment. It discovers the actual service identity/issuer/version/operations, executes commands through the ERP API, replays native IDs, waits for remote acceptance and checks the real receipt and ready user.

Record the remaining live manual drills separately: pending→ready issuer state and independent Tawsel login; public callback configuration and signed real event; duplicate delivery; interrupted first acknowledgement; tampering without a new signature; preprovisioned signing-key rotation, overlap and expiry; restoration of the approved test configuration. Also exercise denied service impersonation and reference lifecycle on the real service. These are **unrun**, not silently substituted by the passing local fixtures. The public smoke test alone is insufficient to certify all these manual gates.

No customer database migration, production deployment, external message, Tawsel source edit, purchase, commit, push, merge or publication occurred. Existing P10 worktree changes were preserved.
