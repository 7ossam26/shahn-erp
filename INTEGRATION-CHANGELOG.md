# Integration changelog

P22 owner-ordered ERP-first closure, 2026-10-08: verified ERP recovery implementation and selected actual public scripts may commit under the explicit owner exception in phases/EXECUTION-CONTRACT.md. Named Tawsel acceptance is deferred, not passed: CR-001 reviewed baseline/07/IP-AC-18; CHECK-003 exact accepted-A→B and receipt-A→cycle-B; complete jointly reviewed43+1/27 matrix. Single later handoff: TAWSEL-CHANGE-REQUESTS.md. Actual whole-retry/correction/replay, interrupted source worker retained-result recovery,3-before1/2 current/history recovery, and CI runtime source provenance now have evidence in docs/verification/P22/README.md. No Tawsel code/baseline adoption, full integration-readiness claim or P23 start.

This log records deliberate reference adoption and later reviewed integration changes. It does not monitor Tawsel automatically or certify runtime compatibility from documentation alone.

## INT-CHG-001 - Initial reference pin

| Field | Record |
| --- | --- |
| Change date | 2026-10-03 (Africa/Cairo), discovery session 019 |
| Change type | Initial local preservation of the already used planning reference; no runtime or contract upgrade |
| Old source identity | No earlier independently retained ERP baseline bundle; discovery already cited source commit `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada` |
| New/pinned source identity | `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`, snapshot `2026-09-25T08:22:32.982Z` |
| Manifest identity | `planning-manifest.json`, 10024 bytes, SHA-256 `07a6a87a4a7b9720b6310a1dea2f66609a81de7a64237d653b37b74fe8a9a6d9` |
| Version information | Manifest declares source client package `0.1.0`; action/event envelope `schemaVersion` and `payloadVersion` are `1.0.0` in the reviewed canonical definitions. No runtime/client version change is asserted. |
| Contract difference | None. Attachments 01-07 and the manifest are retained unchanged. No schema, operation, event, authentication, error, status or retention behavior was changed. |
| Compatibility | Not a new compatibility delta. Current selected-operation coverage and known dependencies remain open; this preservation is not integration acceptance. |
| ERP impact | Establishes [TAWSEL-BASELINE.md](TAWSEL-BASELINE.md) and a self-contained reference directory. Existing ERP decisions/requirements are unchanged by the pin. No phase files are created or updated. |
| Implementation state | Planning/reference preservation only. No connector, migration, runtime modification, deployment or tests implemented by this entry. |
| Decision and owner | Initial request requires a retained baseline and controlled future changes. The ERP planner preserves the supplied identity; the product owner retains business decisions. Final integration and master-plan review remain pending. |
| Evidence executed | Seven source attachment byte lengths and SHA-256 values matched their manifest entries before copying. All seven copied attachments matched again. The copied manifest matched the computed hash and byte length of the supplied manifest. Source commit/extraction header in 04 matched the manifest. Read 07 in full for this preservation step. |
| Evidence limits | No independent verification of manifest source-file entries or declared package counts; no schema/fixture execution, live HTTP conformance, database, installed client or deployment check. Earlier focused reading is documented separately. |
| Open dependencies | `TAWSEL-CR-001` reason extension; selected acceptance/recovery coverage including `TAWSEL-CHECK-001`; recipient repeat-payment semantics `TAWSEL-CHECK-002`; changed-branch snapshot/redispatch semantics `TAWSEL-CHECK-003`. See [TAWSEL-CHANGE-REQUESTS.md](TAWSEL-CHANGE-REQUESTS.md). |
| Baseline result | The same source reference remains pinned for planning. Final integration design is not closed, and no newer Tawsel baseline is adopted. |

Retained directory: `docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/`.

## Future entries

### INT-CHG-006 — P22 native ERP recovery (2026-10-08)

Old/new accepted baseline remain32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada /1.0.0; no reviewed replacement adoption or Tawsel source change. ERP migration0026 adds immutable recovery/projection/checkpoint/report references on P03/P11. Owner-authorized dedicated test pilot config and scoped signed callback connect to isolated ERP; temporary bootstrap operator removed. [Evidence](docs/verification/P22/README.md) records native and selected actual public recovery/issuer/two-human/proxy/rotation, posted-money correction/typed resolution, live-source isolated restore and six measured healthy samples. Valid fractional source data uses existing wire canonicalization for source/recovery digests; native money hashing unchanged. Image digest observed, source commit unattested. Full reviewed44/27 conformance and CR-001/CHECK-003 remain blocked; browser excluded by owner. No baseline upgrade, production ERP deployment or completion commit/push.

Use a new stable change ID. Record full old/new commits, manifest hashes, actual versions, exact contract differences, compatibility classification and reasons, affected requirement/decision IDs and phase files, implementation/migration state, owner choices, executed evidence and the baseline result. Keep candidate changes visibly pending until reviewed dependencies and required checks permit adoption. Preserve earlier entries and packages; do not rewrite a historical entry to imply its planned checks ran later.

Follow the controlled update workflow in [TAWSEL-BASELINE.md](TAWSEL-BASELINE.md) and retained attachment 07. Ordinary technical changes preserving approved policy can be documented directly; material new business choices return to the owner. No automatic monitoring or synchronization is configured.

## INT-CHG-002 - Session020 selected-scope clarification

Date: 2026-10-03. Planning-only scope/status amendment under ERP-D-195/196; no contract, runtime, baseline or retained artifact changed.

TAWSEL-CHECK-002 closes for the owner's excluded prior-attempt paid-shipping scenario. The aggregation formula is not declared verified. Distinct prepaid-to-brand cases remain selected.

TAWSEL-CHECK-003 moves from a requested owner technical answer to internal engineering scope/lifecycle reconciliation. ERP-only carrier transfer and actual destination inventory receipt are reaffirmed. The earlier subsequent customer-redispatch commitment is qualified without assuming withdrawal or supported Tawsel mapping. Historical evidence remains in the consolidated register.

No phase file, migration, API operation or test was created. The unchanged pinned reference remains 32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada. UI planning proceeds independently; unresolved selected mapping must still be stated honestly before final integration approval.

## INT-CHG-003 - PLAN-001 integration design draft

Date: 2026-10-03, session023. Added [ERP-TAWSEL-INTEGRATION-PLAN.md](ERP-TAWSEL-INTEGRATION-PLAN.md) and [contract coverage](docs/planning/INTEGRATION-CONTRACT-COVERAGE.md) as owner-review design documents. They deepen selected operation/event/schema/example reading and define proposed ERP persistence, mapping, financial/custody effects and recovery. Their coverage ledger records actual read limits and remaining dependencies.

No new Tawsel baseline is adopted. The pinned source commit, manifest and attachment bytes remain unchanged. The newly inspected Tawsel docs/phases are authoring-quality references, not a contract refresh or implementation instruction. CR-001 remains a required reason-field extension; CHECK-003 retains its bounded customer-redispatch compatibility question. CHECK-002 remains closed by the selected scenario's exclusion, not by an invented aggregation rule.

No Tawsel or ERP runtime code, API schema, database migration or deployment is changed by this entry. Proposed test scenarios are not executed evidence. The final integration design and dependent phase readiness remain subject to the review gates in PLAN-001 and the coverage ledger.

## INT-CHG-004 - Phase authoring under approved PLAN-001

Date2026-10-03, session025. ERP-D-205 authorizes the complete phase prompt package. P11-P15 introduce the real boundary and operational integration, P16/P17 consume its evidence, and P22/P26 verify recovery/conformance. The operation inventory has44 names:43 scoped service operations and one operator bootstrap; urgency remains conditional. All27 sender event types retain explicit ownership. No canonical bytes, Tawsel source code or runtime have changed. CR-001 and CHECK-003 remain named prerequisites; accepted plan mechanics are not proof of these external capabilities. See phases/INTEGRATION-PHASE-COVERAGE.md and the unchanged baseline.

## INT-CHG-005 — P11 ERP implementation against the existing pin

Date: 2026-10-04. Old and new accepted baseline are both `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`; original LF manifest SHA-256 remains `07a6a87a4a7b9720b6310a1dea2f66609a81de7a64237d653b37b74fe8a9a6d9`. The current Windows CRLF checkout hashes to `ae2842ddf684f91b638d9c3fa2865badd1fa94b4e81286d58322fa2fa8c57072`; LF normalization reproduces the pinned manifest exactly. No baseline content, canonical contract or Tawsel source code changed and no candidate revision was adopted.

ERP now implements the P11 source provisioning/delivery operations, durable action mapping/outbox and signed raw-byte inbox with all 27 sender mappings. Additive migration `0015_p11_integration.sql` does not label prior native records synchronized. The exact extraction of 29 canonical schemas and three fixture/vector files is checked against original hashes in [baseline-extraction.json](docs/verification/P11/baseline-extraction.json). The adapter uses AJV validation and no remote `.invalid` resolution. Source/API/UI/durability proof, runtime and migration hashes, failed attempts and consumer interfaces are in the [P11 evidence](docs/verification/P11/README.md) and [execution](phases/execution/P11.md).

Compatibility disposition: locally implemented against the unchanged public contract; **real runtime acceptance pending**. No usable independently running Tawsel, approved credentials, issuer or public callback was supplied. Fixture remote acceptance does not close that dependency. IP-AC-01/05/06/19 remain bounded by the explicit live trial gates. R-002/003/007/020/174/183/193/194 and corresponding decisions have linked P11 slices; later business application, financial/custody effects and live conformance remain unclaimed. CR-001 and the bounded CHECK-003 question are unchanged. Owner manual/device review is still pending; P12 was not started.
