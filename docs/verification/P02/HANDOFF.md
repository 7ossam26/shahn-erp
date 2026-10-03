# P02 interfaces and durable records

This is the identity/access handoff to later phases. P03 must extend the existing records below, not introduce a parallel command ledger. No money, shipment, Tawsel provisioning or journal behavior is supplied here.

## Transaction and authority boundary

`@shahn/database.transaction(pool, operation)` supplies the one checked-out `TransactionClient`. Services join it rather than opening a nested transaction. `loadAccess(client, opaqueSessionToken, companyId?, write?)` in `apps/api/src/modules/access/sessions.ts` returns `AccessContext` from current database facts. It validates the stored issuer/subject binding, principal, company, ordinary user/role activation and identity readiness, or the separate MFA support/company session. It takes a shared company lock for reads and an exclusive company lock for administration. It rechecks the session after acquiring that lock. Administration increments the company's durable `authorization_revision` in the same transaction.

`assertCapability(context, capability)`, `scopedBranches(context, capability)` and `authorizeResource(context, capability, resource)` are exported by `@shahn/domain`. The consuming service supplies the actual resource's company/branch, data class and business-state predicate from server records; never copy `stateAllowed`, funding authority or brand accessibility from client input. Query filters and totals must use the returned branch IDs. Apply the same boundary to exports, downloads and recovered results. Screen IDs are static server choices, not client-selected authority for arbitrary operations. Branch membership says nothing about a driver's physical presence.

`AccessRepository.read(token, capability, operation)` joins authorization and the read callback in one transaction. `AccessRepository.command` performs current authorization before both new execution and duplicate-result lookup. Access commands are serialized with authority changes using the company lock. This intentionally favors clear correctness over high throughput for V1 administration. Future domain transactions must select an appropriate lock strategy while preserving next-operation revocation semantics.

## SQL identities

Migration `0002_access.sql` adds the `access` schema. UUID technical identities are never display names or configurable role labels. Compound foreign keys enforce company consistency for roles, ordinary users, assignments, exceptions, command/audit/work links. A `staff` discriminator foreign key prevents putting a support principal in `ordinary_user`. Issuer/subject is unique globally in this deployment; one principal has one binding. There is no public signup or support privilege in the screen registry.

`server_session` contains a SHA-256 digest of the random browser session token, a CSRF value, encrypted issuer tokens, authentication time, MFA assurance and independent idle/absolute expiries. Tokens and PKCE verifier material use AES-256-GCM with a runtime-only 32-byte key. The browser cookie is Secure/HttpOnly/SameSite=Lax and contains only the opaque session secret. A callback login attempt is consumed atomically before token exchange. Support sessions retain company, authenticated server session, principal, reason, creation, expiry and end time; their database constraint caps duration at one hour.

## Shared records owned initially by P02

| Record | Identity and immutable fields | Mutable lifecycle fields |
| --- | --- | --- |
| `command_record` | `id`, `company_id`, `principal_id`, `family`, `command_id`, `capability`, canonical `payload`, SHA-256 `payload_digest`, creation time. Unique `(company_id, principal_id, family, command_id)` and `(company_id,id)`. | `state` (`pending`, `completed`, `rejected`), closed JSON `result` containing `commandId`, `entityId`, `version`, `state`, nullable `jobId` and nullable safe `errorCode`. |
| `audit_entry` | Entire row is append-only: company, true principal, server/support session IDs, visible actor label, action, entity, command-record link, before/after version, detail and occurrence time. Update/delete triggers reject mutation. | None. Technical Support remains the visible label; the internal principal/session is retained. |
| `work_item` | ID, company, originating principal/command, entity/version, lane, correlation UUID, canonical payload/digest, creation time. Unique `(company_id,entity_id,entity_version,lane)`. | `state` (`pending`, `leased`, `ready`, `failed`), attempts, availability, lease owner/expiry, fencing generation, safe error and completion time. |

Database triggers preserve immutable command/work identity fields and bootstrap completion. No automatic deletion of business/audit history is introduced. Command results retain their stable identity; future P03 retention may compact resolved response bodies only under its contract.

## Identity worker protocol

1. Claim one eligible identity job with `FOR UPDATE SKIP LOCKED`, a 60-second lease, owner UUID and incremented fence; commit the claim. The lease exceeds the adapter's five sequential eight-second request deadlines. Fencing protects local acknowledgement; correlation and the issuer's unique username protect remote identity creation.
2. Call the issuer **outside any database transaction**. Keycloak chooses its own subject UUID. The remote user carries admin-only `erpCorrelationId` and `erpCompanyId` attributes; the native correlation UUID remains distinct from the returned subject. Its unique immutable login name is `companyCode.username`.
3. Query the exact external correlation attribute before creating a user. Require exactly one result and verify its subject, login name and both correlation attributes. Existing username alone never authorizes binding. The issuer's unique login name also fences competing creations. A lost create result is recovered through the same correlation query before any retry; an unrelated account collision becomes a definite conflict.
4. Apply native name/enabled state while preserving the issuer's email, verification flag, last name, required actions and unrelated attributes. Keycloak's profile PUT can clear omitted fields; dropping them would divert a returning person into profile enrollment. Then commit binding, user readiness, job outcome, command result and authorization revision only if lease owner/fence still match. A killed or superseded worker cannot acknowledge under an old fence.
5. Timeout/unavailability stays pending with exponential backoff and jitter capped near five minutes. A definite invalid request or correlation conflict becomes failed/rejected and is not automatically retried. A corrected user edit is a reviewed new command/version. Editing an unresolved user is rejected to preserve per-entity ordering.

The worker concurrency is one per process. Additional workers claim with skip-locked/fencing. Issuer HTTP has an eight-second timeout. The API sees only safe error codes; no issuer-admin token or raw error is returned. Issuer account readiness does not claim Tawsel provisioning or that the customer has completed password/MFA enrollment.

## Native HTTP

Closed request/response schemas and OpenAPI are in `packages/contracts`. Access endpoints are under `/api/v1/access/`. The Fastify registration is an explicit allowlist; each protected handler obtains database authorization. Unregistered Nest routes still fail closed. Forged company/user headers and bearer-service authority are rejected.

- `POST /login`: same-origin JSON, company code and username hint, support selector, safe intended return path; uniform behavior without public company/user lookup. `GET /callback` consumes state/nonce/PKCE and creates a new server session only after validated OIDC.
- `GET /session`, `/context`: principal ID, CSRF/identity kind and current company context/registry. Issuer tokens are never response fields.
- `GET /users`, `/users/:id`, `/roles`, `/audit`: currently authorized ordinary administration. Users accept only `search` (literal name/username substring, max 180 characters), `page` (0–99999, default 0) and `limit` (25/50/100, default 25). SQL escapes wildcard characters, returns the same-filter company total and sorts by name/UUID. Detail lookup uses an explicit UUID and returns 404 when unavailable in company scope. Support never appears in the ordinary user list. Audit is the latest 100 rows in the current company with retained true principal/session identities in SQL.
- `GET /support`, `/support/branches`: separate support identity, MFA and selected company session as applicable.
- `GET /scope/:capability`: authorized policy branch choices only; no future commercial action or data is simulated.
- `POST /commands`: `schemaVersion:1`, UUID `commandId`, explicit `companyId`, discriminated type; edits require `expectedVersion`. Families cover ordinary user/role create/update, support branch create/update, company setup/settings and explicit support-session start. All mutations require same-origin CSRF.
- `GET /commands/:id` and `/commands/:id/download`: original principal/company/capability is reauthorized before returning or downloading the retained result. A changed payload for a used command identity conflicts. If a caller reuses a UUID across command families, lookup rejects `COMMAND_FAMILY_REQUIRED` instead of choosing one arbitrarily; resubmit the exact original family/payload to retrieve that family's retained outcome.
- `POST /logout`: end ERP session. `POST /global-signout`: explicit issuer signout redirect using client ID and issuer SSO interaction; no ID token is sent through the browser URL.

Business consumers remain responsible for money/state restrictions, actual domain read models, authorized file ownership, exports and domain-specific exception cases. P02's policy tests do not mark those consuming phases complete.

Authorized native conflicts (`REVISION_CONFLICT`, `IDENTITY_PENDING`, `IDENTITY_CONFLICT`) use a savepoint to roll back effects, then retain a rejected command and rejection audit in the enclosing transaction. Repeating that intent remains rejected. Authorization/foreign-scope rejection writes nothing. Migration `0003_access_result_error.sql` additively supplies `errorCode:null` on earlier P02 results; `0002` was already applied and was not rewritten.

The browser retains only a pending command UUID in `sessionStorage`, keyed by principal, before sending. Recovery still requires the original company/principal/capability at the server. Keeping the marker independent of the current UI company is deliberate: a support-company selection may commit before its response is lost. Refetching that selected company must not hide the unresolved request. A refresh blocks new submission until authorized recovery resolves it. Full payload and form values stay in memory, including during popup reauthentication; only the exact in-memory intent can be resent. An unknown result is never queued as a new offline write. If the tab was reloaded and no committed result exists, an operator must investigate the retained reference before a new intent; the lost in-memory payload is not reconstructed speculatively.

Support company switching locks the authenticated server-session row after the company lock, rechecks current session/MFA after waiting, ends earlier support scopes, then inserts the new scope. Concurrent selection of two companies therefore leaves one current scope. Ordinary readers/commands require the currently valid scope and cannot reuse the superseded support session.
