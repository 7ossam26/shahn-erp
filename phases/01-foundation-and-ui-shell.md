# P01 — Runnable foundation and approved UI shell

## Task and boundary

Implement this phase only. Establish a runnable, version-pinned web/API/worker workspace with PostgreSQL migrations, meaningful verification commands and the approved Arabic RTL presentation system. The owner must be able to launch it, open a focused module home and a demonstrative form, and see an honest API/database status. Do not implement commercial balances, parcel registration or a simulated working Tawsel connection.

Model: `gpt-6.1-sol`, effort `xhigh`, checked2026-10-03. The first UI extraction combines several sources and determines the visual consistency of every later phase. Select this setting in Codex; this text does not switch it. See [model evidence](MODEL-GUIDANCE.md).

Authority and coverage: ERP-D-158/159/197/198/199/205; ERP-R-004/005/006/155/156/162/167/168/206/207/208/214, with their AC-R cases. Read the actual register statements; a listed shared requirement is only satisfied here within this phase's foundation scope. Later phases complete its business coverage.

## Read and check before editing

Read [master plan](../master-plan.md), [execution contract](EXECUTION-CONTRACT.md), [architecture](../docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md) through repository, API and testing/deployment conventions, and [screens](../docs/planning/ERP-SCREEN-SPEC.md) shared visual/interaction rules. Read [UI review](../UI-REVIEW-LOG.md), [design brief](../UI-DESIGN-BRIEF.md), `ui-preview/README.md`, `ui-preview/THIRD-PARTY-NOTICES.md`, actual `ui-preview/src/App.tsx`/styles/components and the six `output/playwright/` captures. Inspect local instructions and files before creation. A source path in a plan is not evidence that production code exists.

Prerequisites: Node/npm and a development PostgreSQL18/container runtime must actually be available. Inspect their versions and the existing prototype lockfile; preserve the prototype. Recheck official supported stable package releases and React/shadcn/Smooth UI compatibility before selecting exact versions. Record the chosen Node24 LTS patch, npm version, database image digest and package versions in `docs/verification/P01/VERSIONS.md`. If containers or PostgreSQL are unavailable, make independent source/UI progress and record the exact unavailable database checks; do not claim a completed database foundation.

## Required implementation

Create npm workspaces for `apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/database`, `packages/domain`, `packages/ui`, and `packages/test-support`. Use TypeScript, React/Vite, NestJS with Fastify, direct `pg` and versioned SQL migrations. Introduce no ORM, Redis or SaaS tenancy service. Keep environments explicit and no real secret in committed examples. Configure strict compilation, formatting/linting, stable package exports and browser/server separation.

The database package exposes a checked-out-client transaction helper that commits once, rolls back on failure and always releases its connection; nested independent transactions are forbidden for one atomic operation. Establish migration checksum/order tracking and a migration lock. The initial migration is infrastructure only; later feature phases own business schemas. Persist UTC instants and support Cairo calendar conversion; no fixed+02 assumption. Read/write credentials and migration credentials are distinct configuration fields even if isolated test credentials initially share a role.

The API serves versioned health/readiness responses with database and migration state. Liveness must not pretend the database is healthy; readiness fails when the required schema is absent or incompatible. The worker can start/stop gracefully and report its own lifecycle, without inventing business queues. Do not expose environment variables, connection strings or raw errors through status. Future protected modules must have a clear authentication guard integration point; there are no unprotected commercial mutation endpoints in this phase.

Extract the prototype's reviewed presentation into `packages/ui`: token variables, Cairo typography, RTL logical spacing, utility/back header, centered page container, module card, table-to-card responsive list, status/empty/error/pending panels, form groups, amount display, confirmation dialog and timeline primitives. Retain licenses for copied/adapted shadcn and Smooth UI source. Preserve white/lime and warm variants; the white/lime default is a reversible implementation default, not a separately approved palette. Avoid a broad component library project: build the pieces needed for the sample and add domain-specific pieces later.

The frontend must use actual API status and clearly labeled development-only demonstration data for visual review. Do not publish fixture counts as company totals or show unimplemented actions as successful. Home navigation presents only implemented demonstration entries until P02 grants real modules. No global sidebar or global module tabs. A focused demonstration form must show required-field validation, disabled submission while pending, error retention and keyboard focus without pretending to save a shipment. Place it behind the development environment flag and keep it out of production routes.

Establish the root scripts listed in EXECUTION-CONTRACT.md. `test:phase -- P01` runs registered P01 suites and fails on zero tests, an unknown phase or a failing required layer. `test:db` uses an isolated real PostgreSQL database, not SQLite or an in-memory replacement. `test:browser` starts/uses the actual web/API pair. Fixtures are deterministic and never target production. `db:status` reports applied versions without changing them; `db:migrate` is explicit. `seed:dev` initially creates only development fixtures supported by existing tables and refuses production configuration.

## Ordered checkpoints

1. **Workspace and versions.** Create package boundaries, lockfile and version manifest. Run a clean install, strict typecheck and package build. Continue only when imports resolve through declared package dependencies rather than private relative source paths.
2. **Database lifecycle.** Implement migration lock/checksum and transaction helper. Run fresh migration, repeat it, inspect status, and reject a deliberately modified applied checksum in an isolated database. Verify helper failure rolls back actual writes and releases the connection. Restore only that test fixture.
3. **Runnable processes.** Launch API, worker and web through documented commands. Verify readiness with database up, down and schema missing. Shut down during an idle request and confirm no leaked client. No secret values may appear in logs or HTTP errors.
4. **Visual extraction.** Reproduce the approved home, list/card and form/timeline patterns. Capture390x844 and1440x1050 and compare to the actual reference. Check320px/768px, long Arabic text, reduced motion, focus return and absence of sideways scrolling. Fix mismatches before treating the shared shell as a stable prerequisite.
5. **Evidence and handoff.** Register the real P01 suites, run the relevant scripts, record commands and outputs, and document exact startup/test environment instructions. A failed or skipped layer remains visible in the execution record.

## Acceptance and meaningful tests

- A clean supported environment installs from the lockfile and starts all three processes; a missing mandatory variable produces a readable startup error without its secret value.
- With PostgreSQL unavailable, API readiness reports not ready and web shows the unavailable state; it does not render a false zero-data business dashboard.
- Two migration runners cannot apply the same migration twice; checksum mismatch is rejected. A transaction that inserts then throws leaves no committed row. Use actual committed database inspection after the transaction ends.
- Connected Vitest covers EGP decimal-string parsing and display round-trip (`50.5`→`5050`), invalid decimals/negative-zero/overflow boundaries, and the demonstrative form's validation→pending→error retention flow. These tests must assert behavior, not merely check that a helper reproduces its own constants.
- Browser checks verify Arabic RTL, keyboard dialog close/focus return, long labels, responsive cards, loading and real status failure. No essential action depends only on hover or color.
- The registered phase runner propagates a controlled test failure and rejects an unregistered `P99`; record the repaired final result without deleting the initial diagnostic.

## Owner manual trial

Document exact commands and local URLs actually established. Start the development database and run install/migrate/dev. Open the home on desktop and phone widths; enter the demonstration form, trigger its required-field error, enter50.5 and inspect its exact displayed EGP amount. Use Back and verify the expected title/focus. Stop only the test database and refresh status: expect an unavailable message and no fake successful save. Restart it and confirm readiness recovers without reinstalling or losing the migration record. Switch the retained comparison palette to verify tokens are shared; do not record a new owner palette approval.

## Deliverables and completion

Deliver the workspace/configuration, initial migration runner/helper, shared UI source with notices, actual scripts, `docs/verification/P01/VERSIONS.md`, `docs/verification/P01/README.md`, test outputs and screenshots. Update [P01 execution record](execution/P01.md), catalog and implementation status. Completion requires the runnable result and the stated checks; unavailable real dependencies leave their acceptance pending. Future phases receive the transaction helper, test harness, package boundaries and reviewed visual baseline, not a fictional completed ERP.

Stop after P01 and its evidence. Do not run P02, deploy, purchase, pay, merge or change Tawsel.

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-004`, `ERP-R-005`, `ERP-R-006`, `ERP-R-017`, `ERP-R-061`, `ERP-R-153`, `ERP-R-155`, `ERP-R-156`, `ERP-R-162`, `ERP-R-167`, `ERP-R-168`, `ERP-R-206`, `ERP-R-207`.

Decisions: `ERP-D-005`, `ERP-D-006`, `ERP-D-007`, `ERP-D-011`, `ERP-D-014`, `ERP-D-017`, `ERP-D-060`, `ERP-D-062`, `ERP-D-097`, `ERP-D-144`, `ERP-D-145`, `ERP-D-146`, `ERP-D-147`, `ERP-D-153`, `ERP-D-154`, `ERP-D-155`, `ERP-D-156`, `ERP-D-157`, `ERP-D-158`, `ERP-D-159`, `ERP-D-197`, `ERP-D-198`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
