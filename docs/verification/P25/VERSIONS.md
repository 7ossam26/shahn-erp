# P25 runtime and image inputs — 2026-10-09

No workspace dependency or root lockfile upgrade. Actual host Node24.21.0/npm12.2.0 use the repository's pinned runtime. PostgreSQL18.6, Playwright1.63.0 and Chromium153 are used in local container/browser verification; the local Windows native PostgreSQL18.3 binaries referenced in earlier phases are absent here.

| Input | Version and immutable identity |
| --- | --- |
| Node Debian slim | `24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20` |
| Deployment PostgreSQL Debian | `18.6-bookworm@sha256:afc7e2d441324c0388fa80c3d24f733b4194a4eb7f47dd8ee2b08eb1a24a647c` |
| Existing P01 isolated test PostgreSQL | `18.6-bookworm@sha256:3725f4e2499eef5134592b3b4ab79a543ed7f8e533b05b5b637af926630f6650` |
| pgBackRest source | `2.59.3`; tar SHA256 `14037901db002e5536a948bf9f0fc0ff6cde31f4e675d3e9b46f129071bf2e5f` verified during compilation |
| Verification Docker CLI | `29.1.3-cli@sha256:4fa0ee1f3a7e4354c4ea34558b6d4ee32859baf4973d4c8ccc8e7fe3dd730c04` |
| Host local runtime | Ubuntu24.04.3 WSL2, Docker29.1.3, Compose2.40.3; host apt pgBackRest2.50 is not the drill tool |
| Accepted Tawsel baseline | `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`, unchanged |

The deployment PostgreSQL digest is an explicitly selected current Debian build of the same18.6 version, separate from the existing test pin. pgBackRest is a new deployment tool built from the exact official source archive, not a business-library upgrade. See Dockerfiles and retained build transcripts. Debian package indexes/Chromium downloads remain build-time inputs; lockfile installation does not establish byte-identical image reproduction at different times. The runtime source label is `p25-working-tree-20261009`, never a published commit. Final local image IDs and input-file hashes are recorded separately when observed.

Earlier verification images have older application snapshots. Current Windows/WSL backup tests explicitly mount current source/packages, and are narrower than clean immutable release acceptance. An older successful image build cannot certify latest code, issuer setup, role privileges, portability or production readiness. Initial runtime-image rebuild failed because npm silently omitted a required optional native Lightning CSS package; corrected Docker installation includes optional packages and checks loading the renderer before accepting the install. The failure transcript is preserved.

Observed local runtime image: `sha256:8c1d070507225ef8307cf4b50eb64e77bfede0e57895404ae203e0881863da8a`, uid1000 and source label `p25-working-tree-20261009`. PostgreSQL/pgBackRest image: `sha256:daa7aa79bbb302ed982528868313336a721e04e638a557f9932489ac0e305001`. Old verification image: `9689804df37e` (abbreviated local ID, not full provenance). Latest migration timeout correction postdates the runtime image; final Linux tests mount that exact source and compile packages inside the disposable verification layer. No latest-source immutable release, registry publication or clean issuer deployment is claimed. The runtime/browser build shares one stage to avoid duplicate Chromium installation; its non-root runtime retains build/test dependencies, so image minimization and final least-privilege clean release remain pending acceptance.
