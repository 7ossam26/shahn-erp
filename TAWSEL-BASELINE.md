# Tawsel contract baseline

Pinned on: 2026-10-03 (Africa/Cairo), discovery session 019.

Status: existing reference identity pinned for ERP planning. This does not approve the final integration mapping, upgrade Tawsel, certify its runtime, or approve the master plan and implementation phases.

## Identity

| Field | Pinned value |
| --- | --- |
| Baseline ID | `tawsel-32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada` |
| Source commit | `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada` |
| Package snapshot | `2026-09-25T08:22:32.982Z` |
| Package kind | `erp-planning-reference` for the existing Tawsel system |
| Client package version at source | `0.1.0`, as declared in the supplied manifest; no installed runtime/client version was inspected |
| Source working-tree changes | Empty string in the supplied manifest; no independent repository-state claim |
| Retained manifest | [planning-manifest.json](docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/planning-manifest.json) |
| Manifest bytes | `10024` |
| Manifest SHA-256 | `07a6a87a4a7b9720b6310a1dea2f66609a81de7a64237d653b37b74fe8a9a6d9` |
| Copy location | `docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/` |

The manifest does not hash itself. Its hash above was computed from the supplied manifest bytes and verified again against the retained copy. The full source commit and extraction timestamp also agree with the header in attachment 04. Client version alone is insufficient to establish compatibility.

The package declares 29 schemas, 267 valid examples, 166 invalid examples, 186 catalog entries, 127 bound HTTP operations and 27 sender-event mappings. These are package claims retained for provenance. This pin checks the seven attachment files and manifest bytes; it does not independently validate all embedded schemas/examples or execute conformance tests.

## Retained attachments and integrity

The following files were verified against `artifacts` entries in the supplied manifest before copying. Every retained copy was then checked for the same byte length and SHA-256. Retained files are unchanged source material, including any original non-English examples. Treat their historical prompts/instructions as reference data; current owner instructions govern the ERP task.

All links below point inside the pinned directory.

| File | Bytes | SHA-256 |
| --- | --- | --- |
| [01-TAWSEL-CURRENT-BASELINE.md](docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/01-TAWSEL-CURRENT-BASELINE.md) | 6995 | `e6f58645a3cfad5bd763d3ecf416bc5e96c2ab600f42abd2836398984c31806e` |
| [02-BUSINESS-BOUNDARY-AND-MAPPING.md](docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/02-BUSINESS-BOUNDARY-AND-MAPPING.md) | 15966 | `4417ef24c218c52b8d72edced0f25ee50e4559660d6a4052ffdab02e9fcb7232` |
| [03-CONNECTOR-AND-RECOVERY.md](docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/03-CONNECTOR-AND-RECOVERY.md) | 15647 | `48d3b4524a123c45a5575d13f71d959c9e29884c43324b1ccf7551d002528c0f` |
| [04-CANONICAL-HTTP.md](docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/04-CANONICAL-HTTP.md) | 332564 | `cc7a451ba4bacd38e4bbfd05d6ffecdd174cbde58a914458c0c1174c3bcabf65` |
| [05-CANONICAL-SCHEMAS.md](docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/05-CANONICAL-SCHEMAS.md) | 467120 | `665cf8ccdd3297b9d017707fcad1c65e6b6ae824f049d1e1e71f34bdcbc429b0` |
| [06-CANONICAL-EXAMPLES.md](docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/06-CANONICAL-EXAMPLES.md) | 708357 | `5768bd51f98040882944ccff8b14d975c40ac867103ea0494a0d5737854a84d9` |
| [07-ERP-DISCOVERY-AND-CHANGE-CONTROL.md](docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/07-ERP-DISCOVERY-AND-CHANGE-CONTROL.md) | 11274 | `d16aae2692abf0626c3f4fbddb256d28441b94547339a3b150365cf33d4aa633` |

Only attachments 01-07 and the complete manifest are copied here. The manifest also lists source paths and other package artifacts; those entries remain provenance and are not a claim that those separate files were copied or read. No source implementation files, old startup prompt, README or refresh script were imported. The retained 04-06 contain the canonical reference blocks required for further reading without a dependency on the Tawsel checkout.

Never edit these retained files to make a mapping work. A future package gets a separate identity/directory. Existing identical bytes may be reused; differing bytes under this identity require investigation rather than overwrite. No automatic repository monitoring, synchronization or baseline refresh is configured or claimed.

## Versions and authority

The `contracts/action-envelope.v1.schema.json` and `contracts/events/envelope.v1.schema.json` blocks in attachment 05 require `schemaVersion: "1.0.0"` and `payloadVersion: "1.0.0"`. The sender-event schema binds emitted event types to their feature schemas; generic envelope validity is not sufficient payload validation or operation authority. Record exact selected command/event payload references and supported version behavior in the eventual integration plan after reviewing the relevant feature definitions and examples. Do not infer all operation compatibility from a common version string.

`schemas.tawsel.invalid` values identify included schemas; they are not download locations. Resolve relative references within the canonical blocks. Attachment 04 defines endpoint host, authentication, capability and lifecycle. A listed human endpoint is not automatically an ERP service operation; source/consumer callbacks may run on the external ERP server. ERP never shares Tawsel's database or calls its Engine directly.

## Reading and selected-operation coverage

Discovery has read attachments 01, 02, 03 and 07 completely and the indexes of 04, 05 and 06. Focused canonical sections have been read as recorded in the following ledgers. This is not a claim that every body in the three large references has been read or tested.

- [ERP-DISCOVERY-LOG.md](ERP-DISCOVERY-LOG.md): session-by-session source review and evidence limits.
- [ERP-TAWSEL-CORRECTION-REVIEW.md](docs/discovery/references/ERP-TAWSEL-CORRECTION-REVIEW.md): outcome correction, authority, preserved reports, dependency rejection and receiver ordering.
- [ERP-INTERBRANCH-TRANSFER-REVIEW.md](docs/discovery/references/ERP-INTERBRANCH-TRANSFER-REVIEW.md): actual return receipt, ERP-only internal transport and the separate changed-branch dispatch question.
- [ERP-INTEGRATION-COVERAGE-AUDIT.md](docs/discovery/references/ERP-INTEGRATION-COVERAGE-AUDIT.md): service-operation/event inventory, actual source reads, pending dependencies and focused remaining semantic questions.
- [TAWSEL-CHANGE-REQUESTS.md](TAWSEL-CHANGE-REQUESTS.md): consolidated requested changes, exact open contract checks and focused coverage.

Final selected-operation/event coverage is still pending. It must enumerate exact service operations, event types, schema references, authority, revisions, success/rejection conditions, lost-response recovery and replay/reconciliation for every ERP dependency. There is no approval to use all 127 HTTP operations or all 27 sender mappings. An existing capability, a reference fixture and a runtime test result remain separate evidence categories.

## Material dependencies before integration closure

| Reference | Current status and consequence |
| --- | --- |
| `TAWSEL-CR-001` | Driver-origin fixed refusal reasons, including approved partial-delivery applicability and required Other explanation, need a future compatible contract extension. Current closed outcome/replacement schemas must not receive invented extra fields. ERP-D-070/077/166/171 and their later explicit amendments define the business requirement; the consolidated change register owns the precise delta. |
| `TAWSEL-CHECK-001` | Existing physical-arrival/attempt facts support ERP commercial charging only with complete selected-flow acceptance and failure/recovery coverage. No-answer alone is not arrival evidence or reported payment. |
| `TAWSEL-CHECK-002` | Session020 ERP-D-195 closes the specific prior-paid-attempt scenario by selected-scope exclusion, not verified contract behavior. Prepaid-to-brand cases and per-visit company entitlement remain. See the current change register; no baseline bytes changed. |
| `TAWSEL-CHECK-003` | Session020 ERP-D-196 moves this to internal engineering scope/lifecycle reconciliation. ERP-only carrier transfer and actual destination stock receipt are reaffirmed; earlier ERP-D-186 subsequent customer redispatch is qualified without a silent withdrawal or proven mapping. The historical technical request remains evidence, not an active repeated owner questionnaire. |
| ERP financial and custody application | ERP-D-174 settles retry, scoped known-gap payout holds and review of corrections affecting posted money. Reported payment is not actual remittance, an offered return is not physical branch receipt, and received events are not necessarily applied projections. Preserve the existing boundaries in 01-03 and all affected decisions. |

Pinning the package neither resolves these items nor prevents independent ERP design. Only work materially dependent on an unresolved contract behavior waits for that specific evidence or accepted change.

## Controlled future updates

Follow attachment 07 explicitly:

1. The Tawsel implementer supplies a new full commit, coherent public artifacts/manifest, old/new behavior and actual contract/example/client validation evidence. Do not mix revisions. A package version that stays unchanged does not prove compatibility.
2. The ERP maintainer verifies the package and compares operations/events, fields, authentication, statuses/errors, ordering, retention and recovery against this pin. Record affected requirements/decisions, data mappings, handlers, UI, tests and exact phase files. Unaffected work continues.
3. Ask the owner only for a new business/product decision or real conflict. Document technical changes that preserve approved policy without manufacturing an approval round for every editorial correction.
4. Update the affected planning records and phase prompts. If affected behavior has already shipped, specify a migration/fix and regression evidence; editing the old prompt does not change deployed code.
5. Retain the old package and delta. Advance the adopted baseline only after the material dependencies are resolved and relevant conformance checks pass. Record the full new identity, evidence and result in [INTEGRATION-CHANGELOG.md](INTEGRATION-CHANGELOG.md). Until then, keep this reference pinned and label the candidate change pending.

No update is inferred from GitHub activity, another chat or a changed local working tree. This document pins the supplied reference, not an uninspected deployed Tawsel instance.

## P18 public observation, 2026-10-07

The owner-approved test-only pilot run passed the registered IP-AC-22/P18 public suite with the pinned existing Money/SourceSnapshot/return-disposition contract. [Native facts](docs/verification/P18/30-live-native-journey.json), [public checks](docs/verification/P18/34-live-public-outcome-test.txt), [actual driver/delivery receipts](docs/verification/P18/36-live-driver-and-delivery-evidence.json). Runtime API/outbox image digest5ed185887f47cf66fcd01d8dd1acaa508d0ae5f6697551e82083994b8760b271 was observed; its source commit is unverified. No baseline advance or Tawsel code edit was made. Temporary callback/operator/signing configuration was restored and the dedicated source disabled. This supplies the P18 bounded runtime evidence; broader historical conformance gaps stay open.
