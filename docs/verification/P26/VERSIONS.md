# P26 observed versions and provenance

2026-10-09, Africa/Cairo. Starting ERP main/origin HEAD: `0ce1f983e1f2669515389b4fa6ee973f0b7a2cfd`. The attached worktree was clean and detached at the same HEAD; the existing main checkout was used without creating a branch/worktree.

Actual command runtime: Node `24.21.0`, npm `12.2.0`, selected with `scripts/use-pinned-runtime.ps1`. Default shell Node22.17.0/npm11.6.2 were observed before selection and were not used for the required checks. The root package/lockfile and business dependencies are unchanged. Installed Vitest `5.0.3` executed the two prerequisite suites.

The [machine inventory](coverage-inventory.json) records current source/lock hashes, all 28 migration files, the complete phase registry and owner execution records. Migration hashes are file inventory; no P26 database or applied-migration status was inspected. P25 image/backup versions remain historical evidence in [P25/VERSIONS.md](../P25/VERSIONS.md); no fresh release-image provenance or running PostgreSQL/issuer/Tawsel version is claimed.

Tawsel pin remains `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`. Working and pre-phase committed baseline hashes are recorded separately. The continuation recovers all35 embedded source blocks and restores all eight exact publisher files under the same identity; `.gitattributes` prevents checkout newline conversion. [Restoration](baseline-restoration.json) and [readiness](READINESS.md). No semantic contract change or new package adoption.

Later actual SSH inspection verifies running API/outbox/provisioner image `ghcr.io/7ossam26/tawsel-runtime@sha256:5ed185887f47cf66fcd01d8dd1acaa508d0ae5f6697551e82083994b8760b271` and issuer image `ghcr.io/7ossam26/tawsel-issuer@sha256:8fde824f20b681f61a5ff77a2357d28fbfcffa8890b975354897f13201538cd45`; all four observed services are1/1. Remote OS Ubuntu24.04.4 LTS/kernel6.8.0-111-generic. HTTP issuer discovery and Tawsel web return200; scoped service read without a bearer returns401. No source-commit reattestation or issuer login is inferred. [Actual metadata](live-host-access.json).

Actual agent: Codex, GPT-6 family. Exact model variant and reasoning selector are not exposed in the session; the phase's `gpt-6-astra`/`xhigh` recommendation is not evidence those settings were selected. No subagents were used.


## Authorized pilot setup continuation

Actual Linux release images and source snapshot digest: [pilot-versions.json](live/pilot-versions.json). PostgreSQL18.6/pgBackRest2.59.3, runtime image74b37d7edf43..., verification imageffc5e3b3f7e6...,28 applied migrations: [release proof](live/release-acceptance.json). The snapshot digest identifies the809-file build input; later collector scripts were mounted separately and are not silently covered by that immutable image digest. Their current source hashes are included in the inventory. Issuer recovery's exact original image/specification result is in [issuer-bootstrap.json](live/issuer-bootstrap.json); this actual record supersedes any transcribed digest typo above. Source/runtime pin remains unchanged. No complete V1, capacity or financial restore attestation is inferred.

The TLS edge script is a separate read-only bind mount, updated after the build to use a fixed internal upstream and strict Host/path admission. [Actual network checks](live/edge-admission.json). Its current source hash is recorded in the inventory; the immutable build digest does not attest this later mounted file.
