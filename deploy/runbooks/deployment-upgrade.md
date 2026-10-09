# Isolated release and upgrade

P25 prepares a portable release. Production deployment, DNS changes and purchases need a separate owner instruction. Never point a rehearsal at a production DSN or attach a Tawsel database. Use this same image/configuration contract on either a co-located or separate host; only endpoints, credentials and resource allocation change.

## Prerequisites

Linux Docker/Compose, the pinned Node/npm lockfile, a dedicated ERP database, the configured company issuer/client/audience/redirect, a separate identity-management client, a scoped public Tawsel service and signing-key versions, independent key/config/issuer recovery sources, and a tested encrypted repository are required. This checkout's prior public trial references are unavailable; historical P22/P24 evidence is not a fresh connectivity check.

Build from a reviewed source checkout, with the release ID identifying its exact source. For an uncommitted rehearsal use a working-tree ID and retain a diff hash; do not label it a published commit.

```sh
docker build --target runtime --build-arg RELEASE_ID="$RELEASE_ID" -t shahn-erp:rehearsal -f deploy/Dockerfile .
docker build -t shahn-p25-postgres -f deploy/postgres/Dockerfile .
```

Record the resulting image IDs and immutable registry digests before selecting `SHAHN_IMAGE`/`SHAHN_POSTGRES_IMAGE`. The Node base and database base/source are digest/SHA pinned in their Dockerfiles. npm uses `npm ci`, the exact npm12.2.0 and committed lockfile. Image package installations and Chromium versions are part of the build transcript; no reproducible digest equality across time is claimed for changing Debian package indexes.

Create `deploy/private/` outside Git with restricted owner access. Copy `runtime.env.example`, replacing all placeholders. Create separate mounted files for runtime/migration DSNs, database bootstrap/runtime/migration/backup passwords, OIDC clients, session key, canonical Tawsel configuration and pgBackRest configuration. Never put secret values into web build arguments or evidence. Set `OPERATIONS_MODE=restore` initially. No migration DSN is mounted in API/worker/web.

Use `compose.release.yml` as a Dokploy Compose specification. Attach one HTTPS domain to web:8080 using the selected Dokploy project's domain controls. API/database have no public host ports; `/api` is proxied at the same origin and existing session cookies are Secure/HttpOnly/SameSite=Lax. Confirm TLS and client redirect with the actual issuer before calling this a clean deployment. A successful local readiness response proves the local database/schema only.

```sh
docker compose --env-file deploy/private/release.env -f deploy/compose.release.yml up -d db
docker compose --env-file deploy/private/release.env -f deploy/compose.release.yml --profile maintenance run --rm migrate
docker compose --env-file deploy/private/release.env -f deploy/compose.release.yml up -d api worker web
```

The one migration runner uses the existing PostgreSQL advisory lock and checksum/order validation. Migration statements have a120second budget and lock waits15seconds, separate from runtime5second queries; original connection settings are restored before release. The migration role creates schemas; post-migration grants provide runtime DML/usage without DDL or infrastructure tracking-table writes. Verify runtime cannot create/drop tables or change migration identities, backup has only backup-control/read-settings privileges, and all three login credentials differ. Verify worker PDF rendering in the actual image; its existing export bytes live in the database, not a new public file store.

## Upgrade, shutdown and repair

1. Capture the current release ID, image digest, configuration revision, baseline identity, migration checksums, immutable queued payloads/action IDs/fences, committed journal/custody totals and a verified backup point.
2. Build the next release with decoders for every retained queued payload. Use expand/migrate/contract; data compatibility precedes removal. Never delete/reset queues during release.
3. Drain API admissions and workers with SIGTERM. Allow45seconds for local work and60seconds for PostgreSQL. An unfinished lease must expire and resume with its original payload/action and a higher fence; no ad-hoc re-enqueue or new action ID.
4. Run the one migration runner, verify checksums and runtime grants, then start API/worker/web and exercise local readiness plus actual public independent checks. Remote Tawsel/issuer failure is separately visible and does not establish local database failure.
5. Use `releaseManifest` and `assertBinaryCompatibility` in `deploy/release-compatibility.mjs` to compare ordered version/checksum pairs. A prior binary is rejected against extra migrations unless those precise versions have explicit reviewed compatibility evidence. A down migration does not undo physical cash or custody.
6. For an incompatible failure keep traffic/money/outbound closed, prepare a reviewed forward fix and test it on the isolated restored copy. Otherwise restore the last compatible image/database together, then follow the financial reconciliation runbook before reopening. Never perform automatic destructive down migrations.

The P25 acceptance ledger must identify which of these steps actually ran. Draft manifests/runbooks and guard tests alone do not establish a completed upgrade, deployment or rollback rehearsal.
