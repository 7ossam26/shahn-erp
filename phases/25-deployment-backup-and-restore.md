# P25 — Portable deployment and a measured restore rehearsal

**Git workflow (owner instruction, 2026-10-05):** Execute P25 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 25: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Result and authority boundary

Implement this phase only. Produce versioned deployment artifacts and run a clean deployment, upgrade and encrypted backup/restore rehearsal in an isolated development/staging environment. The same release must support co-location with Tawsel and a separate host through configuration/data movement, without shared databases. Deliver measured recovery and capacity evidence plus an explicit production cutover runbook. This phase does not authorize touching a production host, changing DNS, buying services or releasing real money.

Model: `gpt-6-astra`, effort `xhigh`, verified2026-10-03. Restoring money/custody state while reconciling external actions has multiple failure boundaries and irreversible real-world effects. Select manually; see [model guidance](MODEL-GUIDANCE.md).

Coverage: ERP-D-007/014/145/154/155/156/157/158/168/169/205; ERP-R-005/006/007/154/162/163/164/165/166/167/177/178/214 and their AC cases. These include planning and evidence obligations; no benchmark or recovery guarantee is assumed from approval. Consume all P01–P24 runtime artifacts relevant to the release.

## Read and prove prerequisites

Read [master plan](../master-plan.md) Deployment/recovery and Verification, [architecture](../docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md) Deployment/Recovery/Capacity/Observability, [data](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) sections8/9/11, [integration](../ERP-TAWSEL-INTEGRATION-PLAN.md) sections9–15/18/19, [baseline](../TAWSEL-BASELINE.md), change log and [execution contract](EXECUTION-CONTRACT.md). Read the actual P22 conformance and P23/P24 report evidence, not only their catalog status.

Required: completed buildable application; migration sequence/checksums; dependency manifest; configured development issuer; isolated PostgreSQL and actual public Tawsel test deployment for integration restore checks; local/staging container runtime; a backup repository compatible with encryption/WAL restoration. Verify each by its real command/version/connectivity evidence. A local isolated S3-compatible test repository can prove mechanics; it does not prove the owner's remote provider permissions, bandwidth or offsite availability. If real offsite credentials are absent, preserve that exact deployment acceptance as pending and do independent drills locally. Do not search for or print unrelated credentials.

## Deployment artifacts and lifecycle

Create least-privilege web/API/worker container definitions and a Dokploy-compatible deployment specification under `deploy/`. Pin images by version/digest; build assets reproducibly from the lockfile. Keep frontend and `/api` on one HTTPS origin with secure cookie configuration. PostgreSQL is private, without a public host port. Give runtime, migration and backup roles separate credentials/privileges. API/worker may be separate processes from one image, with explicit graceful shutdown, connection limits and readiness.

Configuration must include application origin/company, database connection/limits, issuer/client/audience/redirect, Tawsel public origin/integration identity, callback signing-key versions and backup/encryption references. Validate inconsistent issuer/audience/origin and missing mandatory values at startup. `.env.example` contains placeholders. Web assets never contain credentials. Routine logs redact tokens, signatures, recipient addresses/phones and other unnecessary personal detail, retaining correlation/command/action/event IDs.

Application readiness checks local database/schema/configuration. Tawsel outage marks integration degraded and blocks dependent handover/return commands; it must not shut down unrelated intake/queries. Shutdown stops new admissions, drains safely and lets unfinished leases recover. Do not reset job tables during a deploy. Preserve encoded queued payload/schema versions across an upgrade.

Use expand/migrate/contract releases. Acquire one migration lock; test old/current data and queued jobs; build compatibility before removing a column or decoding path. Record release ID, schema version, baseline identity, config version and backup checkpoint. A previous binary may be restored only if compatible with the applied schema. Destructive down migrations cannot undo paid money or returned parcels. Provide a tested forward repair or an isolated restore path for an incompatible failure.

## Backup and restore mechanics

Implement the approved pgBackRest reference with encrypted repository, weekly full/daily differential backups, continuous WAL and a30-day window. Monitor archive freshness against the initial five-minute target and actionable failures. Those values are operational targets, not evidence of zero data loss or a promised outage duration. Keep encryption material and issuer/configuration recovery sources separate from the data repository, with operator instructions for access and key rotation.

Document scheduling as deployment configuration; actually test one full, one subsequent differential/WAL recovery and a failed archive alert in isolation. A copied live database volume is not a valid substitute. Retention checks must protect the WAL chain required by retained backups. Verify repository retrieval and decryption rather than reporting success from an upload command alone.

Restore procedure must start with production outbound integration, payouts and other consequential commands disabled. Restore into an isolated network/database with distinct credentials. Verify release/schema compatibility, then compare journal totals, eligible/pending/held wallets, storage credit, payroll obligations, stock/reservations/custody, native command identities and inbox/outbox cursors against recorded checkpoints. Reconcile Tawsel through permitted replay/reads and the same action identities. Do not fabricate receipt or replay ERP money because an external delivery event exists.

Create a deliberate ERP-only actual-money movement after the chosen recoverable checkpoint. Restore to the earlier point and prove the movement is absent and the lost/uncertain interval is reported. Tawsel cannot reconstruct that expense/payout/storage/employee movement. The runbook must require external evidence and typed reconciliation before reopening disbursement. Restore may pass database constraints yet remain unsafe for financial operation; preserve that distinction.

## Capacity, logs and operational UX

Seed a representative year of about55,000 shipments with multiple lines/attempts, three branches, ten drivers,15 concurrent staff and background inbox/export load. This is a test envelope, not a product quota. Measure API p95 list/detail target500ms and local money/stock command target800ms excluding explicit remote waits; measure UI cached-route navigation target1second on the recorded client/network. Run a higher ramp to find limits and identify indexes/worker limits through real plans/metrics. Do not drop V1 modules to meet a number or use an unrelated Fastify benchmark as proof.

Monitor lease expiry, retry/unknown source age, oldest unapplied event, known gaps, database lock/deadlock/connection pressure, invariant discrepancies, export load, disk use and backup freshness. Each alert links to its actual runbook/screen. Prevent unbounded worker retries from exhausting database connections and blocking operator actions. A restore/read-only banner must clearly explain why an action is unavailable and who can release it after review.

Refresh dated hosting/backup cost estimates from official sources before final deployment instructions, distinguishing existing VPS, separate host, storage and operations. Do not purchase or configure an unselected gateway, geocoder, SMS or monitoring subscription. Actual KVM2 free capacity beside Tawsel must be measured with authorized access; absent access, report this exact limitation.

## Ordered checkpoints

1. **Release artifact.** Build immutable images, configuration validator, credential roles and local deploy manifests. Inspect ports/secrets and run clean startup/readiness/shutdown. Continue only when the app works without host-specific Tawsel database access or fixed localhost assumptions.
2. **Upgrade compatibility.** Upgrade the previous phase fixture with pending outbox/inbox and committed money. Verify migrations once, payload decode, source identity and authorized rollback/forward repair. Test the incompatible rollback rejection.
3. **Backup chain.** Produce encrypted backups/WAL, restore a sampled checkpoint and verify decryptability/continuity. Simulate archival failure and demonstrate the alert includes last recoverable time rather than an unconditional healthy label.
4. **Full isolated restore.** Run the restoration/reconciliation scenario above, including native response recovery, uncertain remote action and ERP-only lost movement. Measure elapsed time and record which human decisions remain before traffic could resume.
5. **Load and portability.** Run representative/ramp workloads and deploy the same image/configuration contract to a second isolated host/network layout. Compare counts and source identities. Changing URLs/credentials is expected; changing business code or sharing databases is not.
6. **Runbook handoff.** Record commands/results, costs, operating targets, unresolved provider/production checks and an explicit cutover checklist. Do not perform the cutover as part of this phase.

## Tests and owner manual rehearsal

Vitest exercises configuration validation, redaction and guarded restore-mode command behavior through application services. Real PostgreSQL/container tests prove migration concurrency, committed-state recovery and lease resumption. Real public HTTP verifies source-action recovery after restore. Browser checks show degraded integration and restore-mode restrictions without fake successful actions. Load tests compare invariants before/after, not latency alone.

The owner trial starts from a named isolated seed/checkpoint: record an expense, submit a source command, capture snapshot totals, take a backup, create a later isolated cash movement, then restore the earlier checkpoint. Expect the earlier totals and explicit missing-later-movement review. Replay permitted Tawsel facts; verify no duplicate fee/receipt and no recovery of the ERP-only cash record. Keep money screens disabled until the documented reconciliation completes. Repeat on the second isolated deployment layout and capture measured duration/latest recovered record.

Deliver `deploy/` artifacts, scripts with environment/target guards, `docs/verification/P25/` versioned evidence, backup/restore/load/upgrade runbooks and operator prerequisites. Update [P25 execution](execution/P25.md), catalog and implementation status. Mark actual production/provider checks not run when unavailable. Completion requires the bounded isolated rehearsal; production readiness remains conditional on named external prerequisites.

Stop after P25. No production rollout, DNS change, purchase, payment, merge, Tawsel modification or automatic P26 execution.

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-006`, `ERP-R-007`, `ERP-R-017`, `ERP-R-029`, `ERP-R-101`, `ERP-R-162`, `ERP-R-163`, `ERP-R-164`, `ERP-R-165`, `ERP-R-166`, `ERP-R-167`, `ERP-R-177`.

Decisions: `ERP-D-004`, `ERP-D-007`, `ERP-D-011`, `ERP-D-014`, `ERP-D-027`, `ERP-D-097`, `ERP-D-144`, `ERP-D-153`, `ERP-D-154`, `ERP-D-155`, `ERP-D-156`, `ERP-D-157`, `ERP-D-158`, `ERP-D-168`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
