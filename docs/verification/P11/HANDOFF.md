# P11 interfaces and operator setup

The source pin remains `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`. Action/event versions remain `1.0.0`. The original LF manifest remains SHA-256 `07a6a87a4a7b9720b6310a1dea2f66609a81de7a64237d653b37b74fe8a9a6d9`. This Windows checkout has CRLF manifest bytes with hash `ae2842ddf684f91b638d9c3fa2865badd1fa94b4e81286d58322fa2fa8c57072`; normalizing only its line endings reproduces the original manifest hash. No baseline content was edited. The extractor verifies all 29 schema files and three fixture/vector files against their original byte hashes before writing. Canonical extracted bytes have Git `-text` and Prettier exclusions. URLs under `schemas.tawsel.invalid` are identifiers and are never fetched.

## Exported boundaries

| Boundary | Implemented interface and invariant |
| --- | --- |
| Contracts | `@shahn/contracts/tawsel`: concrete provisioning/delivery validators, source configuration/status/result types, all 27 closed sender mappings and semantic identity checks, signing-key response and receipt acknowledgement. Native schemas and safe read/recovery responses are in `@shahn/contracts`. |
| Native intent | `provisioningCommands(pool,runtime)`: P03 `CommandService` with `integration.setup`, `integration.queue`, `integration.retry`; real session/current company and branch authority, stable native command ID, separate generated canonical action ID, actor audit, immutable request/hash and work row in one transaction. |
| Source transport | `TawselClient`: public HTTP only; scoped `ProvisioningService` discovery/status, bounded no-redirect requests, concrete command validation, exact retained action/operation checks and full/compacted result handling. |
| Worker | `SourceCommandWorker` / `SourceLease`, re-exported under `apps/worker/src/integration/source-command.worker.ts`; P03 work table/lease fencing, send outside transaction, fenced completion. Normal worker claims service work only. Explicit operator process handles bootstrap/recovery rotation. |
| Receipt | `registerSignedReceiver` and `verifySignature`: isolated raw buffer parser, 2 MiB, duplicate-header rejection, exact UTF-8 prefix/decoded 32-byte key HMAC, clock/key window, closed schema and nested identity validation, transaction commit before exact 200 acknowledgement. |
| Database | `sourceByCompany`, `insertReceivedEvent`, `IntegrationSource`, `IntegrationBinding`, `InboxConflict`; additive `0015_p11_integration.sql`. Source/action/event identity and raw bytes are immutable; company FKs, request digest, scope, unique event and aggregate sequence are enforced. |
| Readiness | `recordProvisioningStatus` applies only validated status matching a locally recorded **accepted** action/revision. Driver resource IDs map only from that evidence. Accepted user commands do not imply issuer-ready. Ready/disabled is valid. |
| UI | `/integration`, `/integration/provision`, `/integration/delivery`, `/integration/commands/:id`, `/integration/events/:id`; no raw source requests/results, service/operator bearer or signing secret in read models. |

P12–P15 must add only their selected canonical operations/handlers; the P11 native queue intentionally rejects other operations. Reuse the stable action/outbox/fence and source binding interfaces rather than introducing another queue. Domain payloads remain **durably pending**; receipt does not post journals, change custody or populate a business projection. P11 intentionally does not run a provisioning inbox handler: readiness is reconciled through authenticated status reads. Even provisioning inbox events therefore remain pending until an explicit idempotent handler is introduced. `received_through`/`received_high` track transport; applied/projected/snapshot counters remain separate. Gaps are visible and must not be inferred away by later handlers.

## Local secure configuration

`TAWSEL_CONFIG_FILE` points to an administrator-controlled JSON file outside the repository. It contains `connections`, each with:

| Field | Meaning |
| --- | --- |
| `selector` | Stable safe name, unique per configured source. |
| `companyId`, `tenantId`, `integrationId`, `externalId` | Real ERP company and approved Tawsel source identities. Source identities/endpoint/issuer become immutable when set up. |
| `baseUrl`, `issuer` | Expected public Tawsel API origin and independently configured shared issuer URL; discovery must match. Only development permits a loopback HTTP API origin. |
| `serviceBearer`, `serviceExpiresAt` | Privately generated `twp_<credential UUID>.<64 lowercase hex>` plus explicit UTC expiry, or null before bootstrap. |
| `signingKeys`, `initialKeyId` | Map of preprovisioned key selector to 64 lowercase hex secret; initial selector or null. Webhook keys are independent of service credentials. |
| `allowedCallbackUrls` | Exact administrator-approved public HTTPS callback URLs; no userinfo/query/fragment/redirect/private DNS. |

Grant the new **integration** screen capability through P02 administration to the appropriate company role. Migration 0015 creates the capability but does not silently grant existing roles or mark existing records synchronized. Apply migrations via the normal administrator migration connection; the worker/API use the ordinary runtime connection.

1. Generate a service secret privately with `npm run tawsel:credential -- <private-file-outside-repository> <future-UTC-expiry>`. The file is created exclusively, never overwritten. It contains credential ID, SHA-256 of the 64-hex secret string, raw service bearer and expiry. Nothing secret is printed. On Windows, place it in a directory with an account-restricted ACL; POSIX mode bits alone are not a Windows ACL guarantee.
2. Load the connection file into API and worker processes. Use the native setup page to record the configured selector. It creates no remote side effect.
3. Through authenticated native `POST /api/v1/integration/commands`, queue `integration.bindSource` with company as `nativeId`, the current source binding version as `expectedVersion` (0 initially), and one new persisted native `commandId`. Payload contains exactly `companyCode`, `displayName`, `subjectIds`, `credentialId`, `secretHash`, `expiresAt` and any approved optional intake/return/monitoring grants. The adapter adds `externalId` and `sourceRevision`; do not provide them or an `issuer` field. Only the hash is sent, never the raw secret.
4. Set `TAWSEL_OPERATOR_TOKEN_FILE` in a dedicated administrator process, then `npm run tawsel:operator`. It sends one already durable operator action with the separate `ProvisioningOperator`. Ordinary service workers never load that file. A lost operator response remains recoverable by rerunning the same queued action after its lease/backoff. Do not create a new bootstrap to resolve uncertainty.
5. Install the generated service bearer/expiry in the private connection file and restart the service process with the refreshed configuration. **تحديث حالة الاتصال** verifies real identity, issuer, supported version and allowed operations with `humanDelegation:false`.
6. Provision native branch and role, then user, wait for authenticated issuer-ready status, then provision the operational driver reference. Current native role, subject, branches, enabled state and namespace bindings are checked. HR-only employees are untouched. The API also supports branch/user disable, user role/exceptions/membership changes and source credential rotation/disable. All user changes share one revision stream. Operator recovery credential rotation requires `recover:true`; routine credential rotation uses the service bearer.
7. Configure the real public callback and rotate only to preprovisioned signing-key IDs using the delivery page. Returned old-key `verifyUntil` is persisted. If an accepted compacted rotation lacks overlap metadata, the result stays final, old keys fail closed and `KEY_ROTATION_RECONCILIATION_REQUIRED` is shown; do not repeat rotation with a new action to guess an expiry.

Native request shape:

```json
{
  "schemaVersion": 1,
  "commandId": "<persisted native UUID>",
  "companyId": "<ERP company UUID>",
  "type": "integration.queue",
  "operationId": "branch.provision",
  "nativeId": "<existing native branch UUID>",
  "expectedVersion": 0,
  "payload": { "name": "<current native name>", "enabled": true, "location": null }
}
```

Use the current ERP HttpOnly session plus same-origin/CSRF authorization. These endpoints do not accept Tawsel bearer credentials or caller-supplied company headers. The 202 result is native durability, not remote acceptance. Same native command and payload replay/recovery returns the retained native result; retries of an unknown remote result preserve the original canonical action and bytes. Definite results remain retained, including compaction, and require review before a new intent.

Read lists paginate commands/events in groups of 25 and cap identity/checkpoint summaries at 100. Identity refresh checks up to 20 least-recently-checked bindings per request and preserves previous evidence on temporary status failure. Record later scale/operational requirements before increasing these bounds. No capacity claim is made.
