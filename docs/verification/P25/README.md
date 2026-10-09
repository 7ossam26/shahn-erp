# P25 partial implementation and verification — 2026-10-09

Status: **in progress, blocked by actual deployment/reconciliation prerequisites; full acceptance has not passed**. This is an isolated local implementation attempt. After reviewing that status, the owner explicitly requested committing the current P25 checkpoint and pushing main. That checkpoint preserves the failed/pending acceptance; it does not certify phase completion. No production deployment, DNS change, purchase, Tawsel edit or P26 work.

## Actual checks

| Check | Observed result and limit |
| --- | --- |
| Pinned host runtime | Node24.21.0/npm12.2.0 via `scripts/use-pinned-runtime.ps1`; root lockfile unchanged |
| Lint/typecheck/build | Corrected local runs pass; final transcripts are retained in `transcripts/`. Earlier flatMap/Ajv/type declaration failures are preserved |
| P25 unit | Four configuration/redaction/archive/closed-schema cases pass |
| PostgreSQL lifecycle | Concurrent independent migration runners apply all28 migrations once; retained authorized native command recovery, unchanged journal/source/work hashes, incompatible binary rejection, local readiness200 and restore write503 pass. Separate migration/runtime roles deny runtime DDL and migration-metadata writes; restore workers claim nothing. Migration session timeouts are restored. Persisted fixture sessions are not actual issuer login |
| Browser | One actual API/PostgreSQL restore journey passes at1440/768/390/320 widths, keyboard focus, banner, no horizontal overflow, rejected writes. `browser-results.json`, screenshots and corrected startup transcript. Actual degraded remote integration and owner/device trial unrun |
| Encrypted backup | Pass, including full/differential/WAL named-point recovery, wrong-key refusal, actual archive failure and archiving recovery. `backup-rehearsal.json` is the final suite run; `backup-verified-manual.json` preserves the earlier complete pass (restore5469ms, checkpoint2026-10-09T04:05:11.653Z). Checkpoint20-table hashes match and later2300minor withdrawal is absent. Native P24 fixtures have simulated source boundaries; no live source/offsite claim |
| Runtime image smoke | Pass in `image-smoke.json`: uid1000, read-only/no-capabilities isolated static HTML/assets200, headers, refused incomplete API configuration, missing API502, static POST405 and graceful web exit0. This does not prove clean API/worker/issuer deployment |
| Image builds / Compose | Local runtime `sha256:8c1d070507225ef8307cf4b50eb64e77bfede0e57895404ae203e0881863da8a` and pgBackRest/PostgreSQL `sha256:daa7aa79bbb302ed982528868313336a721e04e638a557f9932489ac0e305001` built. Static Compose validation passes using an isolated non-secret dummy env; direct release validation refuses absent private env. See build transcripts and versions caveats |
| Runner regression | Unknown P99 is rejected, one test passes; operations layer is registered with failure propagation |
| Required P25 runner | Final Linux run passes unit4, database2 and browser1, then fails publicIntegration8 for missing setup. `phase-linux-final.txt`. Earlier Windows/Linux transport and migration timeout failures preserved. Operations separately fail5. Full phase acceptance fails |
| Fresh independent public checks | Eight cases fail before live exercise: required `TAWSEL_CONFIG_FILE`/`TAWSEL_P22_TRIAL_FILE` unavailable. The owner does not know their paths |
| Required operations checkpoints | Five failures: clean actual-issuer release, queued payload/lease upgrade, live reconciliation after encrypted restore, representative/ramp capacity, second layout. Collectors/rehearsals remain unfinished |
| Optional whole unit regression | Both attempts produced passing subsets but no completed summary; interrupted. No whole-suite pass claim |
| Targeted regressions | Unit44 pass (P25 configuration, kernel, money, P24 contracts); foundation5 pass in `foundation-linux-final.txt`, including lock contention/checksum rejection/HTTP/shutdown. Failed Windows transport attempts remain in transcripts |

## Reproduce the connected local checks

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_DOCKER_WSL_DISTRIBUTION='Ubuntu'
npm run lint
npm run typecheck
npm run build
npm run test:phase -- P25
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --config vitest.db.config.ts tests/integration/p25/lifecycle.db.test.ts
node node_modules/@playwright/test/cli.js test --config playwright.p25.config.ts
npm run test:p22:public
npm run test:p25:operations
```

The backup test needs the explicitly isolated Linux `shahn-p25-verification` and `shahn-p25-postgres` images and Docker daemon. On Windows its explicit WSL transport mounts this checkout's current apps/packages/scripts/tests and the host Docker CLI/socket and `/var/lib/shahn-p25-rehearsals` at the same path. This privileged local verification runner is not a release service. Linux direct execution requires `APP_ENV=test P25_ISOLATED_REHEARSAL=true P25_POSTGRES_IMAGE=shahn-p25-postgres`. No production DSN is accepted by the drill. Use the recorded image IDs/build transcripts, not a moving release tag as provenance.

The checkpoint hashes cover native journal/source, account/wallet credit/hold/allocation, expense/payout/payroll, storage, stock/reservation/custody, command/source-command, inbox/checkpoint and work rows. A named WAL target precedes a deliberate2300minor cash withdrawal. Recovery must match the checkpoint and omit the later withdrawal; the uncertain interval requires external financial evidence and typed reconciliation. The local recoverable point is measured, not a zero-loss or production RTO promise. Thirty-day retention is configured, not30days of aged empirical backup history.

## Failure preservation and limits

Earlier backup attempts exposed database unavailability, cleanup fixture mismatch, temporary-init archiving/key ownership, old Docker-client compatibility, wrong-key exit-status/invalid-JSON assertions and a statement timeout. Corrected runs do not erase these attempts. Startup archiving now begins after role initialization; secret configs/passwords are copied to restricted PostgreSQL-owned files. Wrong-key refusal is tested with an actual restore requiring a decryption or invalid-plaintext repository error, not an upload or `info` exit status. The intentional archive failure must emit review-required and retain the independently restored checkpoint.

The first browser attempt waited for API/control while Vite was not ready. The corrected readiness URL waits for Vite's actual operations proxy. The wrong `/ready` deployment/test URL was corrected to `/api/v1/readiness`.

The Linux suite exposed migration advisory-lock contention inheriting the runtime5second statement timeout. Migrations now use a separate120second statement budget and15second lock budget, then restore the checked-out connection's original settings, including failure paths. Real P25 verifies restoration of250ms/2s settings; foundation verifies actual independent lock contention and checksum rejection. Runtime query budgets are unchanged. The built smoke image predates this last source correction: the final Linux verification container explicitly mounts the current migration source and rebuilds packages inside its disposable layer. That verification is not a new immutable release build or clean deployment claim.

Failed backup attempt12 returned no new JSON; its runner transcript and interruption record identify that limit. Persistent test scratch moved to the restricted `/var/lib/shahn-p25-rehearsals` parent after prior temporary paths became unavailable. No disappearance cause is asserted. The intentional archive-failure test originally reset archive_command to its empty default; the corrected run reinstates the exact tested command, reloads and passes pgBackRest check. Cleanup now preserves failure evidence if owned-resource cleanup cannot be verified; failed cleanup never becomes a pass.

P25's five acceptance JSON ledger assertions supplement actual collectors; they do not implement the collectors. Never supply handcrafted passing metadata to close a gate. Current restore mode also blocks recovery workers/callbacks/typed settlement, so a controlled isolated reconciliation path still needs implementation/test. See [restore runbook](../../../deploy/runbooks/backup-restore.md).

Provider bucket/key access, retrieval/bandwidth/retention/failure-domain checks, actual issuer configuration, public trial identities and KVM2 spare capacity are unavailable. No second host/layout,55k capacity or full upgrade/live restore is certified. Costs are refreshed from official sources in [dated estimates](../../../deploy/runbooks/costs-2026-10-09.md); no service was bought. The inherited owner-deferred CR-001/CHECK-003/joint conformance gates remain in [the single handoff](../../../TAWSEL-CHANGE-REQUESTS.md). Missing required ERP services and acceptance are not waived.

Execution/Git details: [P25 record](../../../phases/execution/P25.md). The owner's later explicit checkpoint commit/push instruction applies to this partial snapshot. Finish the ordered acceptance before claiming P25 completion; the original standing completion workflow and remaining gates retain their meaning.
