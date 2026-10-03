# Shared execution contract

Authority: PLAN-001 approved for phase authoring in session025, ERP-D-205 / ERP-R-214. Each numbered Markdown file is a complete prompt for one later implementation result. This file defines the shared handoff conventions; it does not authorize running all phases in one turn.

## Starting a phase

Read the selected phase, the master plan, its named specification sections and this contract. Inspect the actual workspace and relevant instructions before edits. Planning paths are desired outputs, not claims that code exists. Preserve existing owner changes and `ui-preview/`. The prototype's fixtures and routing never become backend authority. Do not initialize a remote, publish, commit unrelated files or modify Tawsel as a side effect.

Check prerequisites by running/inspecting their stated evidence. A status label or an old screenshot is insufficient. A small missing export, migration registration or seed adaptation may be repaired inside scope and recorded; a missing issuer, canonical extension, actual prior subsystem or unsafe migration is a material dependency. Record its owner, exact observed failure and affected cases. Continue independent work, but do not call the blocked outcome complete or ask the owner to repeat settled product discovery.

Every future agent may resolve ordinary implementation details inside the specified architecture. It may not invent commercial behavior, substitute an unsupported Tawsel call, weaken an invariant or silently drop a selected journey. Where two source instructions conflict, the latest decision governs ERP policy; the pinned public contract governs current Tawsel capability.

## Common interface and commands established by P01–P03

P01 establishes Node24 LTS/npm workspaces and these root entry points: `npm ci`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit`, `npm run test:db`, `npm run test:browser`, `npm run test:phase -- P01`, `npm run db:migrate`, `npm run db:status`, and `npm run seed:dev`. Later phases register their own `Pxx` suite in `test:phase`. Until that phase is implemented, an unknown/unregistered suite must fail explicitly; zero matching tests is not success. The runner reports which unit, database, public-integration and browser suites actually ran and propagates failure. It never manufactures missing services or silently converts integration tests into mocks.

Development/test seeds are isolated, repeatable and identified by a test company/batch. Refuse to seed a production environment. Future prompts may add narrower commands when useful; document their exact invocation and actual result. Do not run destructive cleanup against an unverified database/host.

P02 owns `AccessContext` with authenticated principal, company, current screen grants, assigned branches and authorization revision. P03 owns `UnitOfWork` with one checked-out `pg` client, `commandId`/canonical payload identity, `expectedVersion`, stable command-result lookup, immutable audit/source identities and journal posting. Later modules join this local transaction through explicit service interfaces. They do not open nested independent transactions for effects that must commit together.

Native `Money` uses EGP and integer-string `amountMinor`; SQL uses bigint. Native UUIDs and digits-only display references are distinct. Canonical Tawsel `Money`, `actionId`, revisions, headers, signatures and host authority remain exact. P11 supplies the canonical adapter, signed receiver and source outbox; public network effects occur after local commit with durable recovery. No distributed-transaction claim, shared database or driver impersonation is allowed.

Each HTTP module writes closed request/response schemas and current OpenAPI under `packages/contracts/`, including validation/error cases. Runtime output paths below are implementation targets. Pin supported dependency versions during P01 and record any later justified change in the version manifest; do not silently upgrade the entire stack in a business phase.

## UI and verification obligations

Preserve UI-REV-001: focused Arabic RTL pages, Cairo, simple utility/back header, module-card entry, low action density, readable timeline and responsive layouts. No global module tabs or sidebar. Keep the reference's token variants; the owner did not select a final palette. Use the current white/lime default as a reversible implementation default, retaining the warm comparison. Do not claim the palette was separately approved. Every new form needs actual backend states, not just a polished happy-path screenshot.

Every numbered phase requires meaningful connected Vitest for its important behavior. Money, custody, durable jobs and concurrency claims need real PostgreSQL with commits and independent connections. Public contract claims need actual HTTP processes/identities and separate databases; fixtures/mocks have an explicitly narrower role. Browser journeys exercise the implemented API and mobile/desktop error states. Manual instructions name setup, inputs, actions and expected records/totals. Repeat testing only when a new change, failure or unresolved concern justifies it.

Capture UI at390x844 and1440x1050, plus relevant320/768-width and long-content checks. Store evidence under `docs/verification/Pxx/`. Check focus, labels, keyboard/touch, Arabic digits, stale/unknown results and no horizontal overflow. A screenshot alone does not prove authorization or atomicity.

## Execution records and stop

Update `phases/execution/Pxx.md`, the catalog and `IMPLEMENTATION-STATUS.md` with actual model/effort, starting state, prerequisite observations, migrations, changed paths, checkpoint results, exact commands, failures and corrected reruns, skipped/unavailable checks, screenshots and unresolved dependencies. Never overwrite earlier failed evidence to create a clean-looking history.

Allowed statuses: not started; in progress; blocked by a named prerequisite; implemented with verification pending; verified within stated scope; owner-reviewed where applicable. Separate authored-complete prompts from implemented-complete phases. Material blocked acceptance remains visible even when independent parts pass.

Implement and verify only the selected numbered phase, write its handoff and stop. No next phase, production rollout, purchase, payment, external message or merge follows automatically. P25 prepares and rehearses deployment in an isolated environment; actual production deployment needs its own explicit instruction. Approved Tawsel changes are executed separately in its repository, then adopted through baseline/change control.
