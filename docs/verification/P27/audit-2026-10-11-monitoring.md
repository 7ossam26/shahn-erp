# Monitoring outbound audit closure — 2026-10-11

This is additive local audit evidence. It does not replace earlier P27 records or establish live HTTPS, issuer, device, deployment or joint acceptance.

The production default monitoring transport now uses the independently approved root HTTPS origin, checks every DNS answer on every page/revision restart, pins the checked address in the TLS socket, verifies the hostname, refuses redirects, and bounds DNS/request/body reception to 15 seconds. Monitoring response bytes stop at 2 MiB while receiving; the command/recovery transport retains its 16 MiB transport ceiling. Explicitly injected isolated transports also have monitoring stream cancellation and body/deadline checks.

The same default connection transport now serves `TawselClient` and its `RecoveryClient` subclass. Missing independent approval fails closed outside the deliberately identified fixture seam: `APP_ENV=test`, `NODE_ENV` other than production, and a canonical root HTTP loopback origin (`127.0.0.1`, `::1`, or localhost). An unapproved public origin fails even in test mode. Explicit isolated test transport injection remains supported. Historical localhost integration fixtures therefore require `APP_ENV=test`; development/staging is not authorization to bypass the production policy.

Source inspection of API/worker outbound paths found Tawsel access through `MonitoringReader`, `TawselClient`, and `RecoveryClient`; the other direct runtime `fetch` calls belong to the identity provider. Remittance review and goods-transfer carrier callers inherit the protected monitoring default. No live/shared service or attack was used.

The approved transport also preserves response headers and handles bodyless 304 responses: 304 is cache validation, and is excluded from redirect rejection. This is needed for ETag and scope/revision/freshness checks.

## Observed red/green evidence

Pinned Node `24.21.0`, npm `12.2.0`, selected by dot-sourcing `scripts/use-pinned-runtime.ps1`.

1. Before production edits, `node node_modules/vitest/vitest.mjs run --config vitest.p27.config.ts tests/integration/p27/monitoring-transport.unit.test.ts` failed all 13 initial controlled tests. It reproduced default-fetch credential forwarding despite private DNS, unchecked pages/restarts, redirect/size policies, unbounded injected body reads, and missing-approval forwarding.
2. The first implementation rerun had 12 of those 13 green. The remaining 304 case exposed the existing approved transport's rejection of 304 as a redirect. A combined run additionally exposed the older socket fixture's omitted `headers` property; that fixture was corrected to match a real `IncomingMessage`. That run remained recorded as 14 passing, 2 failing, plus one uncaught fixture error and a 90-second test timeout. It is not a pass.
3. After the 304 and fixture corrections, both transport files passed 16/16. Added coverage checks bounded three-attempt restarts, approved slow-body aborts, retained command ceiling, and the explicit loopback-only admission boundary.
4. Final controlled command: `node node_modules/vitest/vitest.mjs run --config vitest.p27.config.ts tests/integration/p27/monitoring-transport.unit.test.ts tests/integration/p27/transport.unit.test.ts` — **27 passed in 2 files** (15 monitoring +12 approved transport).
5. Native regression command with `APP_ENV=test`, `NODE_ENV=test`, and `SHAHN_TEST_PG_BIN` set to the absolute `.tools/p18-postgresql/pgsql/bin` directory: `node node_modules/vitest/vitest.mjs run --config vitest.db.config.ts tests/integration/p13/monitoring.db.test.ts tests/integration/p16` — **23 passed in 3 files** (8 monitoring/cache/history/reauthorization +14 remittance/cash/concurrency/restart +1 populated migration). Each database was disposable local PostgreSQL18; cleanup completed.
6. `node node_modules/typescript/bin/tsc -b apps/api`, `node node_modules/typescript/bin/tsc -p tests/tsconfig.json --pretty false`, targeted ESLint for the five implementation/test files, and `git diff --check` exited zero.

Controlled socket tests use stubbed DNS and HTTPS socket creation to inspect whether a credential-bearing connection is opened and which address/TLS policy it uses. They do not prove a live internet TLS deployment. The separate native regression uses real disposable PostgreSQL and local fixture HTTP. Full audit gates and independent producer acceptance remain tracked by the parent audit execution and the single change-request register.
