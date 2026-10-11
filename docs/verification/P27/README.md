Latest all-findings audit continuation: [2026-10-11 exact adoption, corrections and fresh results](audit-2026-10-11/README.md). Earlier results below retain their original scope and source identity.

# P27 evidence: reviewed interoperability and protected connection

ERP-owned scope verified on disposable local systems; joint target/owner/device acceptance remains pending. No live/shared Tawsel or issuer was modified, deployed or accessed for this task. The approved public-contract pin and qualified source provenance are in [attachment 07 review](CONTRACT-ADOPTION.md); installation, migration, encrypted key recovery and isolated two-server trial are in [connection operations](../../integration/P27-CONNECTION-OPERATIONS.md). The single remaining handoff is [TAWSEL-CHANGE-REQUESTS.md](../../../TAWSEL-CHANGE-REQUESTS.md).

## Fresh checks

Pinned Node 24.21.0/npm12.2.0 and disposable PostgreSQL18 binaries under `.tools` were used; no installed database service/data was altered. Commands ran with the pinned Node directory first on PATH and `SHAHN_TEST_PG_BIN=.tools/p18-postgresql/pgsql/bin`.

| Check | Actual result and evidence |
| --- | --- |
| `npm run lint` | Pass, [transcript](lint-socket-final.txt). |
| `npm run typecheck` | Pass, [transcript](typecheck-socket-final.txt). |
| `npm run build` | Pass, [transcript](build-socket-final.txt); existing frontend chunk-size warning is recorded, not a failure. |
| `npm run test:phase -- P27` | Pass within ERP scope: 478 unit cases, 17 actual native DB cases, two connected browser journeys and one independent actual Tawsel HTTP business trial; named external acceptance separately deferred. [Complete runner](phase-socket-final.txt). |
| Extended actual signed cycle application | One independent candidate trial passes after final draining of actual relocation/return-backed v2 events with no pending dependencies and unchanged journals. [Transcript](independent-signed-cycles.txt), [safe identities/business observations](independent-business.json). |
| P11/P12/P13/P14 contract regression | 327 cases in four files pass. [Transcript](regression-unit-final.txt). |
| P11/P12/P13/P14/P15/P16/P17/P22 native regression | 125 cases in21 files pass with actual commits, HTTP boundaries, worker/DB restarts, receipt/remittance/payout/later review and isolated restore. [Transcript](regression-final.txt). Generated earlier-phase evidence was restored after the run; earlier evidence is not relabelled as fresh. |
| Recovery provenance after adoption | Five native P22 recovery cases pass again after updating new evidence to the adopted baseline and exact publisher replay/snapshot schema hashes; unchanged raw response bytes, gap/replay/application and rollback/fencing are checked. [Transcript](recovery-adoption-final.txt). |
| Original publisher archive | All799 original artifact byte lengths/SHA-256 match; exact ZIP/manifest retained. [Proof](original-archive-verification.json). |

Unit data includes279 canonical valid and179 invalid examples, retained/new sender versions and unsupported rejection, reason display states, encryption/AAD recovery, independent origin checks and private/loopback/metadata/DNS/redirect/credential-forwarding refusal. Transport socket tests inspect pinned lookup/address family and TLS hostname verification; they are controlled tests, not a public TLS deployment claim.

Native DB/HTTP tests cover ordinary/wrong-company/expired support, foreign issuer/scope/bundle, missing grants/bootstrap mismatch, secret-free commands/audit/responses, fixed malformed-JSON errors without private input excerpts, encrypted persistence/restart/API-worker consistency, lost import/confirm/rotation result recovery, immutable source/key IDs, file migration and retained old key material, deliberate managed setup-required versus bound recovery, operator batch/result and non-automatic issuer/driver authorization. Historical signed source1/7 events apply against the accepted7 anchor; unaccepted8 remains pending without a reset or invented command.

CR-001 tests include actual signed v2 partial reason, retained legacy refusal, no-answer with authoritative arrival, required Other failure, correction/replay/history, exact raw bytes and unchanged protected actual journals/wallet/earnings/cash and goods/fee effect identity. CHECK-003 tests cover pending/lost withdrawal fences, late original result/lease fencing, competing transfer/dispatch, unassigned and held-predeparture receipts, full/partial actual A receipts, physical B allocation and oldA/newB history/custody/permission/price preservation.

## Evidence classes and limits

- **Local native and controlled protocol:** real ERP PostgreSQL/HTTP/browser/worker boundaries; configured remote canonical read results in setup tests, controlled HTTPS socket/DNS tests and source fixtures in native custody tests. These do not prove a deployed remote identity.
- **Independent actual HTTP:** exact candidate Git source in an isolated copy, actual Tawsel API/services/provisioning/issuer/outbox workers, two separate PostgreSQL clusters and a separate HTTP issuer-admin/OIDC fixture. Real driver browser-session HTTP rejects missing Other/source impersonation, accepts refusal and reason correction, signs and delivers to native ERP, and supplies actual relocation and accepted-return→B cycle results/events. Planning/current actions use authorized domain fixtures; it is not a real mobile UI/Keycloak/device or public HTTPS server deployment. A disclosed isolated native opening credit supplies required next shipping cover; it is neither remittance, company cash nor a connectivity probe.
- **Publisher evidence:** original byte-verified returned artifacts and dated claimed runtime witnesses. These are distinct from fresh Shahn results. Four original source inventory file digests remain explicitly unreproduced; normalized semantic equality never replaces original byte provenance.
- **Owner/device/target:** not run. Three-origin/two-server HTTPS443/TLS/DNS/callback, actual target issuer clients/subjects/sessions, release-image/recipient reader witness, full human partial/return/financial review trial and jointly reviewed matrix remain pending in the single handoff. P25/P26 collectors remain unrun/incomplete; P27 neither waives nor inherits them.

The latest screenshots at320/390/768/1440 have zero horizontal overflow in connected browser assertions; mobile/desktop images were visually inspected. [Mobile verified identity](screenshots/verified-390.png), [desktop](screenshots/verified-1440.png), [connected independent readiness](screenshots/connected-768.png). Browser traces are disabled and no private import network/body artifact is saved. Browser persistence assertions contain only opaque IDs. Readiness separates configuration/source/issuer/grants/expiry/signature/application/checkpoints/recovery; no artificial business action was generated to mark connectivity ready.

Earlier failed and narrower attempts are retained under their original transcript names. They include stricter startup/setup authority exposing old fixtures, source metadata/package gaps, fixture browser cookie handling, old-migration compatibility, actual publisher schema failures from an incomplete two-line return offer, required shipping cover and a label expectation. Fixes preserve guards, original intent and custody rather than weakening checks. `phase-final.txt` failed the incomplete trial; later complete runners and extended independent proof pass. `phase-final-second.txt` captured a registry snapshot before P25/P26 wording correction; the latest runner expressly keeps their ERP collectors separately unrun, not externally waived.

The final private-input redaction change initially failed the formatting check for `connection-setup.http.ts`; the captured tool result identified only that file. Formatting was corrected before the final complete gate run linked above. API parser errors and browser file-parser errors now use fixed messages, and the actual HTTP regression sends a private generated credential as malformed JSON and verifies no reflection.

The final transport audit checked Node24's actual bundled network code and default automatic-family selection. The socket now specifies the checked address family, so Node uses the pinned single-address lookup contract. The controlled socket test asserts that option; no public TLS deployment is inferred.

No production readiness/100% claim. Deployment and writer activation need a separately authorized run.
