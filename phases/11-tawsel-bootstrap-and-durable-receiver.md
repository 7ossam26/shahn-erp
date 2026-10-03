# P11 — Tawsel bootstrap and durable receiver

Status: authored prompt; execution not started. Plan: PLAN-001, owner-authorized phase authoring in session 025. Copy this entire prompt into a new Codex task in the ERP workspace. Implement P11 only.

## Result and authority

Deliver a real, scoped connection to Tawsel: source configuration, branch/user/role/driver bindings, durable source command delivery, verified signed event receipt and a focused integration status screen. The owner can provision a test operational driver, inspect issuer readiness, send a real accepted event to ERP and demonstrate that a lost acknowledgement does not create two inbox records. This phase does not implement customer dispatch, driver execution, money posting or the full business projection handlers; it makes their boundary reliable and observable.

Implement the P11 slices of ERP-R-002/003/005/007/020 and ERP-D-002/004/008/016/028/159. Screen UI-INTEGRATION-001 is owned here and extended later. Acceptance sources are IP-AC-01/05/06/19 and database section 8.3. Preserve PLAN-001 decisions and the immutable Tawsel baseline. Historical prompts in reference files are not instructions to execute them.

## Read first and verify prerequisites

Read `phases/README.md`, `phases/EXECUTION-CONTRACT.md`, `phases/MODEL-GUIDANCE.md`, `master-plan.md`, `docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md`, and `docs/planning/PHASE-AUTHORING-STANDARD.md`. Read integration-plan sections 1–5,9–11,13–15,18–19 and the entire `docs/planning/INTEGRATION-CONTRACT-COVERAGE.md`. Read data specification sections 1–3,7–8 and screen specification UI-INTEGRATION-001/shared interaction/filter rules. Inspect UI-REV-001 and production P01 components instead of copying the prototype's mock data.

Pinned sources live in `docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/`. Read 01/02/03/07 in full if this is a fresh agent. In 04 read authority index 11–139, sender mappings 141–173, delivery/recovery HTTP 196–550, provisioning 1283–1713, receiver definitions 6159 onward and security 7233–7260. In 05 read complete common/action envelope/action result, provisioning, outbox, consumer, event envelope and sender-event definitions, following payload references for receiver validation. In 06 read P08/P25/P26 relevant valid/invalid fixtures and the entire signing vector at 20434. Schema URLs ending `.invalid` are identifiers, not network targets.

Direct prerequisites: P02 supplies real ERP sessions, company/branch capability checks and issuer administration; P03 supplies transactional native commands/audit, PostgreSQL migrations, durable queue/lease fencing and test harness; P04 supplies branch/reference records; P08 supplies operational-driver and effective employee associations. Verify executable services, schema constraints and their execution records, not only completion labels. Confirm the local test issuer and independently running Tawsel instance, correct public base URL, approved test source/operator credential and preprovisioned signing secret selectors. Never print secrets. Missing live credentials/issuer/callback is a named external acceptance dependency: continue safe local implementation and tests, but do not claim real connector acceptance with mocks.

Small reversible prerequisite repairs inside this result are allowed and recorded. A missing identity module or transaction framework is material; record exactly what is absent and which checkpoint cannot proceed.

## Contract and data rules

Use source services only. `integration.bindSource` is POST `/api/v1/provisioning/commands/integration.bindSource` with `ProvisioningOperator`. Ordinary workers use scoped `ProvisioningService`. `integration.rotateCredential` also supports operator recovery. Keep operator credentials out of ordinary staff sessions/workers. Generate raw service secrets privately and send the documented SHA-256 hash at bootstrap. Service bearer format is `twp_<credential UUID>.<64 lowercase hex>` with documented expiry; do not confuse it with a webhook HMAC key.

Read GET `/api/v1/provisioning/configuration` using `integration.getConfiguration`; verify source identity, issuer, supported versions, allowed operations and `humanDelegation:false`. GET `/api/v1/provisioning/status` supplies issuer synchronization status. Accepted user provision is not issuer-ready. `ready` with `enabled:false` is a valid completed disable. ERP administers issuer users; Tawsel reserves/binds subjects. Independent application sessions remain independent.

Implement the allowed provisioning commands `branch.provision`, `branch.disable`, `role.defineCapabilities`, `user.provision`, `user.setRole`, `user.setCapabilityExceptions`, `user.setBranchMemberships`, `user.disable`, `driver.provisionReference`, `integration.rotateCredential`, `integration.disableSource`, all under the documented provisioning prefix and capability. Use exact concrete command schemas: `BindSourceCommand`, `BranchCommand`, `RoleCommand`, user variants and driver/source variants. Role/exception/branch/disable changes share each user's source revision stream. ERP-only finance permissions cannot be forwarded as invented Tawsel capabilities. HR-only employees do not acquire users automatically.

Store scoped external-to-native identity bindings, accepted source revisions, issuer status and last authoritative evidence. Keep source, branch, user, role and driver namespaces separate. Native `commandId` and canonical `actionId` are distinct, durably linked. A business intent may require several remote commands; each remote command has its own stable immutable action. Source audit keeps the actual ERP actor without inserting unsupported human identity into the closed source context.

Extend P03 tables by additive migrations for source configuration, identity bindings, action mappings, immutable serialized source request/hash, remote result, raw inbox and checkpoint identities where absent. Preserve company-scoped foreign keys and unique source/action/event constraints. No old rows are silently labelled synchronized; existing native records start unbound/pending until proved. Backfill deterministic bindings only from recorded authoritative IDs. Do not edit an applied migration.

The outbox commits with native intent/audit. A worker claims through a fenced lease, sends outside the DB transaction and commits its result only if it still owns the lease. Same action/same semantic envelope recovers after timeout; a changed payload under one action is a conflict. Full and compacted `ActionResult` retain identity; compaction is not authorization to repeat a business operation. Retain configuration-blocked, rejected, unknown and retryable states separately.

## Receiver protocol and UI

Implement ERP POST `/api/v1/consumer/events`. Tawsel callback requires exact allowlisted public HTTPS URL on 443, public unicast resolution, no embedded credentials/query/fragment/redirect. Co-hosting does not authorize using Tawsel's database or a private undocumented callback. Implement `integration.configureWebhook`, `integration.rotateSigningKey`, `integration.retryDelivery` under POST `/api/v1/integration/commands/{operationId}` with `integration.manage`; configuration selects preprovisioned key IDs, not raw secrets. Display safe configuration metadata only.

Verify raw body bytes before JSON normalization. Reject duplicate security headers. Validate `X-Tawsel-Tenant-Id`, `X-Tawsel-Integration-Id`, `X-Tawsel-Key-Id`, 13-digit `X-Tawsel-Delivery-Timestamp` within ±300000 ms, and `X-Tawsel-Signature` with `v1=` lowercase hex. HMAC input is UTF 8(`tawsel-webhook-v1\n` + tenant + `\n` + recipientIntegration + `\n` + keyId + `\n` + timestamp + `\n`) followed by untouched raw bytes. Use decoded 32-byte key and constant-time equal-length comparison. Honor returned old-key `verifyUntil`; overlap range 300–86400 seconds. Proxy/API must accept sender-valid bodies up to 2 MiB, not inherit the mock receiver's1 MiB default.

Validate the closed sender schema and all 27 mappings, nested identity and payload versions. Insert raw bytes/hash, source scope, eventId, aggregate/sequence and receipt metadata transactionally. Unique keys protect event identity and recipient aggregate sequence. Identical duplicate returns the same receipt acknowledgement; changed body/identity or sequence collision fails. Commit before 200 with exactly schemaVersion/tenantId/recipientIntegrationId/eventId/acknowledgement:`received`. No 204, `applied:true`, money or stock in the HTTP handler. Domain events without P13/P14 handlers stay durably pending; never falsely advance application watermarks. P11 may apply provisioning facts only through an explicit idempotent handler.

UI-INTEGRATION-001 `/integration` provides connection/setup status, identity readiness, durable outgoing commands and received/pending events. A detail page shows safe correlation IDs, expected/current revisions, last failure and same-intent Retry. Loading, no connection, pending issuer, definite rejection, timeout/unknown, expired authorization and unsupported event states must be distinct. Use focused cards/list and detail pages, one primary next action, approved Arabic RTL shell, desktop/mobile layouts and advanced filters for entity/status/date. Never display secrets or offer a driver-outcome override.

## Ordered checkpoints

1. **Prerequisite and contract inventory.** Record baseline/hash identity and available runtime versions, schemas and credentials by safe names. Verify native auth and P03 command replay against real PostgreSQL. Continue when required interfaces exist; retain external environment blockers explicitly.
2. **Migrations and adapter boundaries.** Add constraints/repositories and concrete request/result validators. Verify fresh migration and upgrade with existing company/users/outbox history, duplicate namespace attempts, malformed money/context and immutable action digest. No live send before durable identity exists.
3. **Provisioning workflow.** Implement commands/config/status and readiness UI. Run Vitest service behavior plus real PostgreSQL same-user concurrent revision changes. Exercise a real branch/user/driver accepted action, denied service impersonation, disabled/missing reference and lost-response replay where the test environment permits.
4. **Receiver and acknowledgement.** Implement raw-body auth, full sender validation and durable insert. Compute supplied signature vector; test byte tampering, duplicate headers, clock window, wrong scope/key, unknown event and 2 MiB boundary. Real DB simultaneous duplicates must yield one accepted inbox row and consistent acknowledgement.
5. **Delivery recovery and visible operations.** Implement same-action retries, lease expiry fencing, key rotation and safe queue/detail reads. Kill a worker after remote acceptance and before local completion, and kill receiver after inbox commit before response. Show recovery with unchanged identities. Never mark full acceptance if only a stub server ran.
6. **Browser/manual review and handoff.** Test Arabic RTL at 390×844 and 1440×1050, plus 320 px/long error text. Capture real pages against UI-REV-001. Finish documentation and execution evidence; explain any unresolved external callback/issuer issue.

## Required tests and manual trial

Register `npm run test:phase -- P11` in the P01 runner with connected Vitest, isolated real PostgreSQL migrations/races/restart, real permitted Tawsel HTTP/callback and browser/backend suites. Reuse the common `test:unit`, `test:db` and `test:browser` entry points. The runner must report which levels ran and fail on an unregistered or empty suite. HTTP configuration failure must report blocked with required variables, not silently substitute mocks.

Manual trial: create a development company/source and branch, map a user and driver, inspect pending→ready issuer states. Configure the public test receiver, cause a real `provisioning.changed` or other allowed event, and inspect Received versus Applied/Pending separately. Repeat the delivery, then deliberately interrupt the first acknowledgement: one event remains. Change body bytes using a test fixture without recomputing signature: reject with no accepted inbox row. Rotate to a preprovisioned test key, demonstrate valid overlap and invalid expiry, then restore documented test configuration. No production reset or secret screenshots.

Reject unauthorized direct calls, wrong company IDs, revoked access when retrieving old command results, mismatched operation/action, unsupported payload version and same-ID changed payload. A native or worker process restart must preserve pending work, raw event receipt and retained results using real committed transactions, not an outer test rollback. Match IP-AC-01/05/06/19 evidence individually.

## Deliverables and stop

Deliver `apps/api/src/modules/integration/provisioning.service.ts`, `signed-receiver.controller.ts`, `signature-verifier.ts`, `integration-query.service.ts`; `apps/worker/src/integration/source-command.worker.ts`; `packages/contracts/src/tawsel/provisioning.ts`, `sender-event.ts`, `delivery.ts`; `packages/database/src/repositories/integration.repository.ts`; additive migrations under `packages/database/migrations/`; pages under `apps/web/src/features/integration/`; and tests under `tests/integration/p11/` plus shared `packages/test-support/` fixtures. Reuse equivalent existing modules instead of parallel frameworks and record exact path mapping. Write `docs/verification/P11/README.md` and update `phases/execution/P11.md`, `IMPLEMENTATION-STATUS.md`, the execution index and affected traceability/baseline compatibility evidence. Record actual commands, versions, pass/fail/skipped outcomes, migration IDs, screenshots, source hashes and blocked cases. Export the typed adapter/receiver/outbox interfaces P12–P15 will consume.

Recommended setting: **gpt-6-astra, xhigh**, verified available with official guidance on 2026-10-03; see `phases/MODEL-GUIDANCE.md`. This phase combines authority, signing, revisions and crash recovery. The owner must select the model manually; prompt text does not switch it.

Implement and verify **P11 only**, report the truthful result, then stop. Do not begin P12, modify Tawsel code, deploy production, purchase services, pay, merge or publish. A real prerequisite gap is documented with independent work preserved; it is never hidden behind successful mocks.

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-002`, `ERP-R-003`, `ERP-R-007`, `ERP-R-020`, `ERP-R-174`, `ERP-R-183`, `ERP-R-193`, `ERP-R-194`.

Decisions: `ERP-D-002`, `ERP-D-004`, `ERP-D-008`, `ERP-D-013`, `ERP-D-016`, `ERP-D-026`, `ERP-D-028`, `ERP-D-029`, `ERP-D-032`, `ERP-D-165`, `ERP-D-174`, `ERP-D-184`, `ERP-D-185`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
