# P03 verification and trial

Scope: atomic native commands, retained recovery, typed source journals, one shared wallet lock, exact EGP arithmetic and fenced durable work. This is an isolated development kernel. See [interfaces](HANDOFF.md), [execution record](../../../phases/execution/P03.md) and [traceability](TRACEABILITY.md).

**Verified within stated local scope:** the [final registered run](30-phase-final.txt) passed 37 unit/money,21 real PostgreSQL/API/process and6 browser cases. Full regressions passed [81 unit tests](26-all-unit-regression.txt) and [52 database/API tests](27-all-database-regression.txt). Typecheck, lint, production build and the runner check passed. See [versions](VERSIONS.md).

## Environment

This run uses the existing pinned Node 24.21.0/npm 12.2.0 dependencies and local PostgreSQL **18.3** binaries. Earlier P01/P02 evidence used Docker PostgreSQL 18.6. Docker is unavailable on this host. `SHAHN_TEST_PG_BIN` explicitly selects disposable PostgreSQL 18 clusters; no existing service, database or credentials are used. The fixture enables fsync and synchronous commit, listens on loopback with random credentials, and is stopped/deleted on teardown. The pinned Docker path remains the default when this variable is absent.

The runtime was installed only in ignored `.tools/`; system Node 22 was unchanged. No dependencies were upgraded. The full phase invokes real unit, database/API/process and browser checks; unknown or empty phase registration still fails.

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm ci
npm run typecheck
npm run lint
npm run test:phase -- P03
```

## Manual trial

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run p03:trial
```

Open [the isolated fixture login](http://127.0.0.1:5293/api/test/kernel-login). This route exists only in the disposable test harness and selects a precreated, database-backed test session. It is not an OIDC login or production endpoint. Current P02 principal/company/role/branch checks still run on every request. Ctrl+C stops the harness and removes its disposable data. Use ports 4293/4294/5293 only when free.

1. Select **ابدأ محفظة اختبار**. The eligible credit is 100 EGP and pending credit is 250 EGP. The funding account is artificial; this is not an actual opening balance or payment.
2. Enter `50` or `٥٠`, then **احجز غطاء شحن**. Cover becomes 50; available becomes 50; pending stays 250. The source ID fills automatically.
3. Enter `60`, then **جرّب تخصيص صرف**. Expect insufficient eligible credit, focused error and preserved input. Another cover of 60 also rejects. Nothing economic posts.
4. Enter `50`, then **طبّق الرسم واستهلك الغطاء**. Cover becomes zero, eligible credit and available both become 50, pending stays 250. The fee is allocated once. Repeating a source via API returns its retained result.
5. Refresh, then use **استرد نتيجة الطلب**. The result is recovered under current authority. The page keeps only the command UUID in session storage. It does not queue offline writes. A lost result disables new submissions until recovery.
6. Inspect 390px and 1440px views, keyboard focus and source/reference wrapping. Additional automated captures cover 320px and 768px.

Actual process interruption is automated in `tests/p03/crash-server.ts`: terminate after posting but before audit/commit (exit 74), and terminate after commit but before HTTP response (exit 73). Restart a separate API process against the same database and recover by the original command UUID. No production failure switch is exposed.

## Evidence and limits

- [Prerequisites](01-prerequisites.txt): initial unsupported runtime, isolated native database adaptation, 66 existing unit tests and prior access/foundation checks.
- [Initial database failures](09-upgraded-access-regression.txt): generated identity column was unavailable in a BEFORE trigger. Additive migration 0006 compares its immutable inputs instead; later regression passed.
- [Test fixture repair](12-kernel-db.txt): current API code was incorrectly invoked against a historical schema. Upgrade verification now inserts actual P02-shaped stored fixtures before applying P03 migrations.
- [Crash harness repair](14-kernel-access-db.txt): child TypeScript transformation lacked the decorator configuration. The isolated child now explicitly selects `tsconfig.base.json`; [repaired process test](17-kernel-db-repaired.txt) passed.
- [Formatting failure](20-lint.txt): Windows autocrlf conflicted with Prettier in untouched files. `.gitattributes` makes linted code/config text use LF; the format run made no unrelated semantic edits and did not modify old SQL migration bytes. [Lint rerun](24-lint.txt) passed.
- [Earlier registered run](22-phase.txt), [final registered run](30-phase-final.txt), [database facts and identities](database-results.json), [browser results](browser-results.json), [captures](screenshots/recovered-1440.png).

Database concurrency tests use independent sessions/connections and a barrier after the wallet row lock. They observe the second connection waiting in `pg_stat_activity` before releasing the first. Both payout-first and cover-first outcomes and committed journal/source IDs are recorded. Worker fencing explicitly expires A's database lease, commits B's higher-fence completion, then resumes A and verifies its callback is not invoked. These are committed fixtures, not outer-rollback assertions or sleep-only races.

The browser trial uses persisted isolated identity sessions; new live-issuer login is outside this phase. The customer's live issuer, full P02 Keycloak browser suite on this host, owner physical-device/manual review, production deployment, disaster recovery and later business outcomes remain unverified. No Tawsel request was made. The installed PostgreSQL patch version difference is explicit; no 18.6 run is claimed here.

One disposable cluster from the initial failed upgrade check was stopped during cleanup. Automatic approval review blocked its directory deletion, so its files remain at `C:/Users/ahmed/AppData/Local/Temp/shahn-p03-test-JBQ5SW`; [stop evidence](32-fixture-cleanup.txt). Final normal runs cleaned up their own clusters. The evidence callback now guarantees cleanup with `finally`.
