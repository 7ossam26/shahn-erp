# Connector contract, delivery and recovery obligations

Consult 04's generated operation/authentication/host index and original OpenAPI for exact paths and source identity; 05 contains all referenced schemas; 06 contains complete examples and the public signature vector.

## Separate the callers and servers

| Surface | Caller and authority |
| --- | --- |
| Tawsel provisioning bootstrap/recovery | Out-of-band `ProvisioningOperator` bearer. Operator binds source and subject reservations; it is not a token for ordinary ERP users. |
| Tawsel ERP service APIs | `ProvisioningService` bearer, expiring and bound to tenant/integration, plus required capability/resource/lifecycle checks. Rotation has a separately authorized operator recovery path. |
| Tawsel human APIs | Tawsel company/personal session cookies and relevant CSRF/device/capability checks. ERP service tokens do not substitute for these. |
| ERP webhook receiver | External consumer server receives Tawsel-signed bytes. Its callback URL is configured/allowlisted; it is not a Tawsel API endpoint. |
| Reference consumer/source status | External reference server GET `/api/v1/consumer/status` and `/api/v1/source/status`, authenticated with its own `ReceiverStatus` bearer. These are not source reads from Tawsel. |

Tawsel and ERP can use a shared OIDC issuer with separate clients/cookies/sessions. ERP owns its native staff permission checks and audit. Outgoing service operations have `actorId=null`; assertions naming a human cannot impersonate them. Generic `common.IntegrationContext` is wider than some feature command definitions: use each closed feature command, which rejects unsupported actor fields.

ERP/identity operators create/manage issuer users, passwords, enablement and recovery. Tawsel stores reserved immutable subjects and verifies readiness; it does not create/enable issuer accounts for the ERP. A company code is a login locator, not proof of permission. Provisioning acceptance does not equal issuer readiness. `ready` with enabled=false means disable reconciliation completed, not enabled access.

Provisioning credentials have form `twp_<credential UUID>.<64 lowercase hex characters>`. Generate/store the secret privately; bootstrap/rotation sends its SHA-256 hash, not the raw secret. Authentication is independent of webhook HMAC keys, consumer status tokens and database credentials. Recheck disable/expiry/current permissions on retries. Normal credential replacement preserves authenticated source identity and original command recovery.

## ERP-to-Tawsel source commands

Use a source outbox within the ERP's own durable transaction:

1. Authorize the native staff action and validate the ERP business state.
2. Commit local desired change, local revision/audit and the **exact immutable public command envelope** together. Record the actual native actor in ERP audit, not as an unsupported Tawsel human assertion.
3. After commit, a worker leases the command, commits the lease, calls public HTTP outside the DB transaction, then records the result in another fenced transaction.
4. On crash/timeout/lost response, recover the same `actionId`, operation, context, payload and expected versions. Do not reconstruct from the latest editable record or make a new ID to escape uncertainty.
5. Only a matching schema-valid durable `ActionResult` establishes accepted/rejected/review-required. Keep desired, pending and authoritative accepted states separate.

The canonical command envelope includes schemaVersion, payloadVersion, actionId, operationId, context, resources, baseVersions, dependsOnActionIds, observation and payload. Validate the exact feature-specific envelope, not just the generic envelope. Some source operations require empty resources/baseVersions/dependencies and carry expected revisions in their payload. Do not add fields because they look useful.

Same scoped ID and same semantic envelope recovers the established result. Different content under that identity conflicts. Bare HTTP errors (including 401/403 after an earlier accepted-but-lost response), invalid/mismatched bodies and timeouts do not prove business rejection. Keep status unknown/pending and repair authorization/connectivity before same-ID recovery. A genuine retained rejected/review-required decision is not retried as a new successful action automatically; a reviewed corrected business intent is a new command with current versions.

Provisioning and feature families have their own recovery paths. Do not call the human `action.getResult` with an ERP token. For provisioning, replay authenticated POST with the exact command; use current status reads for current state, not as the historical result of an arbitrary action. Intake/returns expose their specified result reads. Compacted results retain receipt/summary/identity; full bodies have a minimum retention policy, not an identity-expiration license to execute again.

The mock source uses a 20-second lease, one ordered lane and exponential 2–256 second retry delays. Those are reference choices, not a measured ERP throughput guarantee. The real ERP may use keyed ordering/concurrency after preserving source revision/dependency semantics and testing failure/restart behavior. Persistent history and visible errors must not disappear because a retry count was reached.

## Public integration surfaces to include in the plan

- Provisioning: source bind/rotate/disable, branches, roles/capabilities, users/role/exceptions/branch memberships/disable, driver references, configuration and issuer status.
- Intake: submit snapshot, prepare, receive batch, withdraw/reassign before departure, source urgency, task/task-list/batch-result reads.
- Returns and cycles: pending/request/result reads, actual subset receipt, separate disposition, receipt-funded new dispatch and cycle reads.
- Source monitoring: driver/trip projections, task/workday history and action monitoring with source filtering.
- Delivery operations: webhook setup, signing-key activation/rotation, delivery list/detail/retry, replay, reconciliation, applied checkpoint report/read.

04 enumerates actual methods, paths, capabilities and host classifications directly from canonical OpenAPI/catalog. Do not infer a missing method/path from an operation name: some catalog entries have their binding only in OpenAPI. Driver planning/start/outcome/urgency/correction/adoption/device actions and human workday reports require their documented human path and must stay out of the source-worker credential's allowlist.

## Tawsel-to-ERP signing and receipt

The sender publishes only committed integration intent. Event ID and exact serialized UTF-8 body survive retries/restarts; delivery timestamp/signature and current signing key can change. This is at-least-once delivery with idempotent application, not exactly-once networking.

Header names are case-insensitive; reject duplicate/ambiguous values:

| Header | Exact value shape |
| --- | --- |
| X-Tawsel-Tenant-Id | Expected lowercase tenant UUID |
| X-Tawsel-Integration-Id | Expected recipient integration UUID |
| X-Tawsel-Key-Id | 1–64 ASCII letters/digits/underscore/hyphen |
| X-Tawsel-Delivery-Timestamp | 13 decimal Unix-millisecond digits |
| X-Tawsel-Signature | `v1=` then 64 lowercase HMAC-SHA256 hex digits |

Decode the 64-hex secret into 32 bytes. Sign the UTF-8 prefix below with LF after **each** line, then immediately concatenate the unmodified raw body bytes (no added trailing newline):

```text
tawsel-webhook-v1
<tenant UUID>
<recipient integration UUID>
<key ID>
<delivery timestamp>
```

Verify timestamp against the receiver's current clock within ±300,000 ms and compare equal-length signatures in constant time. Do not reserialize parsed JSON, sign a digest string or normalize Arabic text. Then validate the closed sender-event schema, versions, expected nested source/tenant identities, aggregate and correlation. The signature vector in 06 uses an explicitly public test key, never production material. Replaying that vector at its recorded time is a test; a live receiver must use current time.

Receiver transaction: enforce scoped unique event ID and aggregate sequence, durably store verified raw body/hash/envelope, commit, then acknowledge. A closed receipt body is:

```json
{"schemaVersion":"1.0.0","tenantId":"TENANT_UUID","recipientIntegrationId":"INTEGRATION_UUID","eventId":"EVENT_UUID","acknowledgement":"received"}
```

UUID strings above are placeholders, not a valid fixture. Empty 204, mismatched IDs or extra “applied” fields are not valid acknowledgements. Same ID/same authenticated bytes returns the prior receipt; changed bytes/payload or sequence collision conflicts. Authentication/schema failures do not enter the accepted inbox. A lost acknowledgement causes redelivery, not another business fact.

A separate worker atomically commits projection changes, transition history and the processed marker. Rollback must remove all three tentative effects. Current effective outcomes can change after correction, while original history remains. Receiving an event and applying it are separate states; neither implies ERP settlement.

## Ordering, gaps and current-state recovery

Stream key: `(tenant, recipient integration, aggregate type, aggregate ID)`. Sequence starts at 1 after recipient visibility filtering. There is no global ordering across task, return-request, trip, workday and integration streams. A receiver must buffer out-of-order events, preserve duplicates safely and resolve cross-stream dependencies through scoped replay/reads.

| Field | Meaning |
| --- | --- |
| receivedThrough | Contiguous durable received sequence from 1 |
| receivedHigh | Maximum durable received sequence, even with gaps |
| appliedThrough | Contiguous processed sequence from 1 |
| projectedThrough | Coverage of current projection state |
| snapshotThrough | Coverage adopted from replacement reconciliation |
| historyComplete | Whether historical transitions through the covered state are actually complete locally |

Do not raise receivedThrough/appliedThrough merely because a snapshot covers a later state. Replay pages are 1–100 events. The reference recovery pass handles at most 10 pages/1,000 events, scans up to 100 streams and 50 missing task dependencies. Continue bounded work on later passes. Store known stream/resource IDs; no general account-wide stream discovery endpoint is promised.

Default history retention is indefinite with no automatic purge. `410 replay_expired` represents a real missing retained sequence, not an assumed 30-day event policy. A scoped reconciliation checkpoint can recover current state only when sufficient authoritative checkpoint/history exists. Reads process at most 10,000 new events and bound effective attempts/return items/notice keys at 1,000; unsupported/excessive/incomplete coverage returns 503. No periodic snapshot scheduler or archival feature is implied.

Snapshot adoption must be newer and atomic. It creates no invented inbox events, historic receipts, cash movement or corrections. Missing history stays visible. Late mandatory transitions below snapshot coverage still need once-only historical processing without adding their quantities again to already-covered current state. An older snapshot cannot regress confirmed data.

Replay is authenticated public HTTP data, not invented signed webhook bytes. The reference compares semantic canonical identity; first later webhook can bind raw bytes, after which raw-byte changes conflict. Preserve that distinction when testing mixed webhook/replay recovery.

## Applied reports and supported events

Receiver submits its own retained, idempotent `integration.reportAppliedCheckpoint` command. This is authenticated **receiver-reported** evidence, not Tawsel reading/verifying the ERP database. Delivery `projectionStatus=unknown` still describes transport; the applied-checkpoint read is separate. Keep report commands durable across lost responses.

The sender supports the 27 mappings enumerated from `events/sender-event.v1.schema.json` in 04 and fully defined in 05. All current ones are transitions/notices. `progress.snapshot` and `integration.applicationReported` may appear in broader catalog/examples but are **not emitted** by the current sender. Current-state and application recovery use their HTTP interfaces. Never use the generic event envelope alone as an accepted-type allowlist.

## Configuration, limits and operator responsibilities

- Deployment operators preprovision scoped signing secrets/encryption configuration and allowlist exact normalized receiver URLs. Service setup selects known keys; raw signing secrets are not command payloads. The new ERP must arrange secret exchange/storage and receiver key acceptance.
- Public sender destinations require HTTPS/443 and validated public-unicast addresses, with no URL credentials/query/fragment or redirects. Private loopback exceptions are explicit test-only settings, refused in production. A private ERP deployment therefore needs a supported reachable callback design or an explicitly reviewed alternative; do not assume a LAN callback will work.
- Provision new verifier key, configure receiver overlap, then rotate sender key with the canonical command. Signing overlap is 300–86,400 seconds; follow returned verifyUntil. In-flight sends may use the old captured key/endpoint; keep deduplication and bounded overlap. Provisioning bearer overlap has its own rules, not these signing-key bounds.
- Sender permits up to 2 MiB while the reference receiver limit is 1 MiB. This observed mismatch needs an explicit effective connector limit and maximum-payload test; do not advertise 2 MiB end-to-end support from the reference.
- Sender defaults include 30-second leases, four workers, bounded HTTP/DNS deadline and exponential jittered retry capped at five minutes. No retry-count purge or unreviewed deletion is part of the contract. ERP workers need supervision, bounded queues, safe error visibility and reconciliation operators.
- Define backup/restore for source outbox, inbox, processed identities, mapping/revisions, projections, history and secret material as a coherent recovery problem. Restoring business rows without deduplication/command history can repeat effects.
- Reference source status is bounded (latest 200 commands/first 200 local record identities with truncation flag), not a complete export or production ERP audit UI.

## Acceptance evidence the ERP phases must supply

Use Vitest plus real isolated database transactions for persistence/locking guarantees; public HTTP against Tawsel or an explicitly labelled fixture for appropriate stages. Include source commit rollback; same-ID recovery after accepted response loss; credential expiry/rotation while acceptance is unknown; duplicate/mismatched event; crash before/after durable receipt; projection rollback; out-of-order and cross-stream dependency; gap replay and unavailable history; snapshot adoption without invented history/double counting; tenant isolation; actual subset receipt versus loss; receipt-funded new cycle; departure edit denial; exact collection/prepaid arithmetic; and restore/restart behavior. Add the agreed largest payload and operational load cases.

Provide a public-only two-task demonstration with separate ERP/Tawsel storage and native staff/driver authority. Mocks, schema validation and existing mock ERP evidence cannot replace testing the real connector implementation. The production ERP may choose different tables/frameworks/workers while preserving public behavior and demonstrating those invariants.
