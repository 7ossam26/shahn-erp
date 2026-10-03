# P02 dependency and migration identities

Checked 2026-10-03. P01's pinned Node 24.21.0, npm 12.2.0, PostgreSQL 18.6 and other direct dependency versions are retained. See the historical [P01 manifest](../P01/VERSIONS.md). Clean `npm ci` installed 442 packages and reported zero audit vulnerabilities in [27-clean-install.txt](27-clean-install.txt); this is an install-time result, not a perpetual security guarantee.

| Addition | Exact version / identity | Purpose |
| --- | --- | --- |
| `openid-client` | 6.8.8 | OIDC discovery, authorization code, PKCE and signed ID-token validation |
| `jose` | 6.2.12 | Signed malicious-token protocol test fixture |
| Keycloak | 26.8.0, `sha256:b0f60d489d51c5d113390bdf5461d4c06e6051be026c05549f2e1e10ec352bcc` | Isolated actual development/reference issuer |
| `0001_foundation.sql` | `76e06daf1100a47ac61387f39e1563fe4ad84fb90d1327dcad212c268a354c4e` | P01 migration preserved |
| `0002_access.sql` | `2b9c6c2573573012727a32fedb92a8ff808fd5a5cc92b1903d953d38d3a7e39f` | Stable identity, grants, sessions, bootstrap, initial durable records |
| `0003_access_result_error.sql` | `a3c3292b687266c97ab06e7538b58d8ce45e8fb5044eccc4ba2f74924ae478d1` | Additive safe error-code result backfill after initial P02 deployment |

The root lockfile pins transitive dependencies. The checked-in SQL was not rewritten after application to the persistent development database. [35-development-security.json](35-development-security.json) records actual PostgreSQL version, current migrations, ready user count and the real issuer image. `artifact-hashes.json` identifies the final contract, lockfile and migration bytes.
