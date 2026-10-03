# P01 local verification and handoff

Date: 2026-10-03, Africa/Cairo. Scope: the runnable foundation and UI-REV-001 presentation extraction only. See [versions](VERSIONS.md), [traceability](TRACEABILITY.md), [visual comparison](VISUAL-COMPARISON.md) and [execution record](../../../phases/execution/P01.md).

## Supported setup

Use Node **24.21.0**, npm **12.2.0**, and a running Docker Linux-container engine. Exact engines, direct packages, PostgreSQL tag/digest and peer checks are pinned. Install Node from [the official distribution](https://nodejs.org/dist/v24.21.0/); use `npm install --global npm@12.2.0` if that Node installation's bundled npm differs. No machine-wide runtime was changed during this task.

On this Windows workspace, an official checksum-verified Node archive and npm are already available in ignored `.tools/` directories. Select them **for the current PowerShell terminal only**:

```powershell
. ./scripts/use-pinned-runtime.ps1
node --version
npm --version
docker version
```

This helper does not download anything or change permanent PATH. Other clean environments can use the same pinned versions installed normally. The prototype has its own existing lockfile; root workspaces exclude `ui-preview/`.

From the repository root:

```powershell
npm ci
npm run dev:setup
npm run db:up
npm run build
npm run db:status
npm run db:migrate
npm run db:status
npm run seed:dev
npm run dev
```

`dev:setup` creates an ignored `.env` with a random password and preserves an existing `.env`. The development runtime and migration URLs are **separate fields** that initially share one isolated local role. `.env.example` contains placeholders. Production credentials must use separate runtime/migration privileges. No company, user, parcel, stock or money records are seeded. P01's seed verifies current infrastructure and explicitly reports that there are no persistent fixtures to write; it refuses any non-development environment before accessing a database.

Build once before running database CLI commands on a clean checkout; their declared package imports resolve to built exports. `db:status` is read-only and exits **1** for a missing/incompatible schema. On a fresh database that outcome is expected; only `db:migrate` applies SQL. Repeating migration preserves its one version/checksum/UTC applied timestamp. `db:up` waits for Docker's PostgreSQL health check. The selected development port is **15418**; the first attempt at 55418 hit a Windows excluded-port range and is retained in the evidence.

## URLs and processes

| Process | Command | Local surface |
| --- | --- | --- |
| All three | `npm run dev` | Builds first, then supervises API, worker and Vite; Ctrl+C stops them |
| Web only | `npm run start:web` | [Home](http://127.0.0.1:5173/) |
| API only | `npm run start:api` | [Liveness](http://127.0.0.1:4100/api/v1/health), [readiness](http://127.0.0.1:4100/api/v1/readiness) |
| Worker only | `npm run start:worker` | Structured `started`, `idle`, `stopping`, `stopped` lifecycle output; no business queues |
| Development PostgreSQL | `npm run db:up` | Loopback port 15418, database `shahn_p01_dev`, separately named Docker volume |

The focused development routes are [list](http://127.0.0.1:5173/demo/list), [form](http://127.0.0.1:5173/demo/form), and [timeline](http://127.0.0.1:5173/demo/timeline). They require both Vite development mode and `VITE_ENABLE_DEMOS=true`; they do not exist in production routing. No commercial API endpoints exist. The global authentication guard allows only explicitly annotated status methods and rejects future protected methods until P02 supplies the real identity adapter.

Health returns process liveness with `dependenciesChecked:false`. Readiness returns 200 only for an available database and matching required migrations/schema identity; otherwise it returns a closed, safe 503 response. The web consumes that actual response and does not display a business dashboard, fixture company totals, successful save, or Tawsel status. Connection strings and raw errors are never status fields.

## Verification commands

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:db
npx playwright install chromium
npm run test:browser
npm run test:phase -- P01
npm run test:runner
```

The browser binary installation is needed on a clean machine; it was available for this run. Unit tests cover exact money/bigint boundaries, Cairo winter/summer/DST dates, closed contracts, readable startup errors, worker shutdown, seed refusal, and the connected form validation/confirmation/pending/error-retention flow.

Database tests create a UUID-owned, real PostgreSQL 18.6 container with a random password and stable loopback port. They never use `.env` or a production DSN. They prove two independent migration runners wait on the same advisory lock, repeat migration once, reject an actual modified SQL-file checksum, roll back committed-state inspection, reuse/release the client, reject nested independent transactions, and test real HTTP readiness while the database/schema is available, absent, incompatible or down. The SQL modification is a temporary source fixture; the applied database checksum is not rewritten to hide the failure.

Browser tests launch actual API/worker/Vite processes against a separate real test container, inspect a production build, and capture 390x844, 1440x1050, 320px and 768px layouts. Loopback ports 4201/4202/5201/5202 are reserved for that harness. The control server exists only in test source; its stop/start/shutdown handlers operate on its own UUID-created database. Windows teardown explicitly drains the processes and removes that container/anonymous volume.

`scripts/phase-suites.json` registers P01's required unit, database and browser layers. Each test framework rejects zero cases. Public Tawsel integration is explicitly **not applicable** to P01, with a reason printed by the runner. Unknown phases fail. The intentional failure fixture is excluded from all normal suites. Diagnostic proofs are:

```powershell
npm run test:phase -- P99
node scripts/test-phase.mjs P01 --diagnostic-empty=unit
node scripts/test-phase.mjs P01 --diagnostic-failure=unit
```

All three intentionally exit 1. The failure diagnostic runs the real unit suite, then an intentionally failing Vitest assertion and propagates its exit. Direct Node invocation avoids npm 12's rejection of the additional diagnostic CLI flags on this host. The initial npm diagnostics remain saved; they are not counted as failure-propagation evidence.

## Owner manual trial

1. Use the setup sequence above. Open the home at desktop width, then 390px and 320px in browser device tools. Expect a simple utility header, actual readiness and three clearly labeled demonstration cards. No global module tabs/sidebar or company counts appear.
2. Enter the form. Press **راجع المثال** with blank fields. Expect required-field messages and focus on the title field. Enter `مثال المالك`, amount **50.5** and a note. Expect exact **50.50 ج.م**; the domain representation is **5050** minor units.
3. Review the confirmation, close it with Escape, and confirm focus returns to **راجع المثال**. Reopen and press **ابدأ التجربة**. Expect disabled submission during pending, followed by an explicitly intentional demonstration error. All input remains and keyboard focus moves to the error. No record is saved.
4. Press **الرئيسية**. Expect the home title and title focus. Open the list, try a search with no match and reset it. On phone widths, cards replace desktop rows; long Arabic content wraps without sideways page scrolling. Open the timeline and compare its current-state rail with the preserved reference.
5. In a second terminal stop **only the P01 development database**:

   ```powershell
   npm run db:stop
   ```

   Refresh status. Expect **قاعدة البيانات غير متاحة**, readiness 503, and no invented totals or successful operation. Restart with `npm run db:up`, refresh status, then run `npm run db:status`. Expect readiness 200 and the same `0001_foundation` record, checksum and applied timestamp; no reinstall or new migration is required.
6. Open **مراجعة المظهر**, choose warm, and inspect the home, form and timeline. Shared tokens must change together. Close with Escape and verify trigger focus. Restore white/lime if desired. This comparison does **not** record a new owner palette approval.

The automated equivalent is evidence of local browser behavior; an owner walkthrough, physical phone, screen reader and production environment have not been independently reviewed. No production deployment, capacity measurement, restore rehearsal or Tawsel change belongs to this handoff.

## Evidence and failure history

Numbered files retain output and visual diagnostics from the attempt, including failures and repaired reruns. [72-final-phase-verified.txt](72-final-phase-verified.txt) is the final registered phase output: **29 unit, 5 real PostgreSQL and 8 browser cases passed**, with all required P01 layers passing. [73-final-lint-typecheck.txt](73-final-lint-typecheck.txt) records the final lint/typecheck success after that build; the phase run includes the successful production build. [46-final-clean-install.txt](46-final-clean-install.txt) records the clean lockfile install. [browser-results.json](browser-results.json) contains final browser results; `screenshots/` contains review captures.

[58-final-phase.txt](58-final-phase.txt) is an earlier **failed** full run, retained with [its browser results](58-browser-results-failure.json) and `58-production-build-failure/`. Production vendor chunks initially executed out of order. Explicit strict chunk execution order repaired the production page; [61-production-repair.txt](61-production-repair.txt) verifies that focused repair before the passing complete rerun. `18-browser-initial-results.json` and `initial-browser-failures/` preserve earlier browser diagnostics.

The sequence also records the initial install/build diagnostics, fixed contract/export typing, Docker restart port reassignment, development excluded port and health wait, Fastify hook registration before listen, a development reload during the first capture run, route-handler cleanup, and npm diagnostic-flag rejection. Later successful evidence is appended instead of deleting those observations. [67-development-recovery.txt](67-development-recovery.txt) proves the documented development pair's ready → database stopped → recovered sequence and unchanged migration record. A final inventory including stopped containers found one earlier stopped UUID fixture from the 15:26 UTC run. [75-stopped-fixture-cleanup.txt](75-stopped-fixture-cleanup.txt) records its inspected ownership/state and removal; no P01 test containers remain.

The last visual pass found that positioning the unfocused skip link above the viewport still painted it into a scrolled full-page capture. [68-skip-link-before.png](68-skip-link-before.png) preserves that observation. The shared link now uses focus-dependent opacity/pointer behavior, with an actual keyboard Enter/focus assertion; the final form-error capture is corrected. [70-final-lint-typecheck.txt](70-final-lint-typecheck.txt) retains a newly exposed build→lint failure: the generated OpenAPI JSON did not use the configured formatting. The generator now formats its output using the pinned Prettier configuration. The complete rerun and subsequent lint/typecheck in `72`/`73` pass with no manual reformatting between build and lint.

Future phases receive the package exports, single-client transaction helper, migration lifecycle, fail-closed guard integration point, isolated test harness and reviewed UI tokens/primitives. P02 and subsequent commercial phases remain unstarted.
