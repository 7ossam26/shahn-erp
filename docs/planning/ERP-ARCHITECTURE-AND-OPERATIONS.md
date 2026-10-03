# ERP architecture and operations

Current authority, session025 (2026-10-03): ERP-D-205 / ERP-R-214 approve PLAN-001 and authorize phase authoring. Detailed plan mechanics below are adopted; original proposal/review wording is retained as drafting provenance, not a renewed approval gate. External contract gaps, unverified runtime targets and the unnamed palette remain explicitly limited. No production implementation is authorized by this authoring turn.

Revision: PLAN-001, 2026-10-03. Status: concrete design adopted for phase authoring under ERP-D-205. Approved business rules remain in ERP-DECISIONS.md; the proposals below are not retroactively recorded as owner decisions. This document specifies intended implementation, not deployed services or passed tests.

## Design choices

| Design ID | Adopted choice | Consequence |
| --- | --- | --- |
| P-ARCH-01 | A separate deployment and ERP PostgreSQL database for each company in V1; every business row still carries companyId and every relationship preserves company scope. | Fits separate-company sales. Later SaaS is a migration project, without building billing, signup or a shared control plane now. |
| P-ARCH-02 | npm workspaces; React/TypeScript/Vite frontend; NestJS with Fastify API; a worker entry point from the same backend modules; PostgreSQL durable work tables. | One codebase and transaction model; no Redis or message broker dependency in V1. The web/API/worker deploy independently. |
| P-ARCH-03 | Shared standards-based company OIDC issuer, separate ERP and Tawsel clients/sessions. Use Keycloak as the concrete issuer deployment reference, with administrative credentials restricted to the identity adapter. | Follows approved shared company identity without sharing application sessions, password hashes or application databases. Existing issuer availability/configuration must be checked before provisioning. |
| P-ARCH-04 | PostgreSQL 18, node-postgres (`pg`), parameterized SQL repositories and ordered versioned SQL migrations; no ORM for V1. | Explicit SQL makes row locks, constraints, ledger effects and migration review visible. One checked-out client owns each complete transaction. |
| P-ARCH-05 | React Router Data Mode for navigation, TanStack Query for server-read lifecycle, React Hook Form plus schema validation for forms; shared JSON Schema/OpenAPI contracts validated on the server. | UI caches are read aids. Financial and custody commands await confirmed server results. Library versions must be pinned and compatibility-tested before implementation. |
| P-ARCH-06 | UTC instants plus explicit Africa/Cairo business dates; integer EGP minor units and integer item quantities; technical UUIDs separate from numeric human references. | Avoid floating-point money, fixed UTC offsets and mixed identifier meanings. Canonical Tawsel field formats remain unchanged. |
| P-ARCH-07 | Encrypted offsite physical backup plus continuous WAL archive, a 30-day recovery window, five-minute archive freshness target and monthly isolated restore rehearsal. | A monitored proposal, not an approved RPO or guarantee of no lost payments. Recovery includes identity/configuration and business reconciliation. |

The stack direction is already approved by ERP-D-158. P-ARCH choices complete unresolved implementation details for review. The existing UI prototype locks are evidence for that sample only. Pin the exact Node 24 LTS patch, database image digest, compatible Nest/Fastify/React packages and package-manager version during the foundation implementation; write them to a version manifest. Do not install beta software merely because its version is higher. Recheck official supported releases when implementation starts.

## Repository and module boundaries

Proposed production paths, not files claimed to exist:

```text
apps/web/                 React routes, domain feature screens, API adapters
apps/api/                 Nest HTTP bootstrap and application modules
apps/worker/              Queue/schedule bootstrap using shared application modules
packages/contracts/      ERP JSON Schema/OpenAPI, generated client types, examples
packages/database/       Migrations, connection lifecycle, SQL repositories
packages/domain/         Pure money, quantity, policy and transition functions
packages/ui/             Reviewed tokens and reusable presentation components
packages/test-support/   Isolated PostgreSQL, identity and public HTTP harnesses
deploy/                  Container definitions, environment contract, restore scripts
docs/verification/       Actual evidence, commands, versions and known limitations
```

Preserve `ui-preview/` as the design reference. Extract presentation deliberately; never turn fixture data, client filtering or prototype hash navigation into production authority.

| Module | Owns | Allowed dependencies |
| --- | --- | --- |
| Access | Company, branch assignments, configurable role, user exceptions, sessions, support audit | Issuer adapter; no finance writes |
| Reference data | Governorates, optional areas, tariffs/versions, expense categories, service settings | Access and audit |
| Brands | Company-level brand, service/partial/credit/payout/storage agreements | Reference data; finance statements by explicit service |
| Shipments | Commercial order, line values, reference, preparation and dispatch intent | Inventory, pricing, finance credit gate, integration public adapter |
| Inventory | Product/variant holdings, reservations, parcel custody, transfers, physical receipt | Shipment identity, incident workflow; never Tawsel database |
| Finance | Brand movements/eligibility, cash accounts, remittances, payouts, transfers, expenses, adjustments | Immutable business facts and explicit module services |
| Employees | Employee terms, driver link, entitlements, advances, deductions, payroll payout | Effective visit projection and finance posting |
| Storage | Fixed anniversary periods, charges, actual payments, stops/renewals | Brand agreement, finance posting |
| Integration | Native source outbox, Tawsel mappings, inbox, effective projections, gap recovery | Domain services via explicit transaction interfaces |
| Reporting | Authorized read models and snapshot exports | Stable read projections; never writes domain balances |

A module does not update another module's tables through ad hoc SQL. Its application service participates in the caller's explicit local transaction when effects must be atomic. Avoid synchronous event listeners that hide financial writes. Persist a projection job only when eventual consistency is safe; a payout funds check cannot depend on an eventually updated balance alone.

## Identity and sessions

Company staff enter company code and username/password through the approved company identity flow. ERP uses authorization code with PKCE/state/nonce and a server-side callback, validates issuer/audience/subject and binds the subject to an active native user. Keep access/refresh tokens server-side; use a Secure, HttpOnly, SameSite session cookie, CSRF protection on mutations and TLS. Never store issuer credentials in browser storage or send the user's password through the Tawsel connector.

Initial proposal: 30-minute idle ERP session, 12-hour absolute maximum; sensitive session operations require recent authentication. Active ordinary work extends idle expiry. Expired sessions preserve uncommitted form input in memory and require reauthentication before submission. Company/user deactivation and permission/branch changes take effect on every subsequent server authorization, including exports and recovered command results. An ERP logout ends its application session; a global identity signout is a separate explicit account action, not an incidental logout that silently terminates another application.

Identity creation is a recoverable workflow: commit native pending user, immutable issuer job and audit; create/bind issuer subject idempotently; provision Tawsel through the documented boundary when applicable. Show pending/failed state. Never mark a user ready based on only one side. An employee record does not require a login or Tawsel account. A delivery driver needs an explicit employee-to-driver reference only when ERP calculates commission; matching by name or phone is forbidden.

For developer support, use a separate support principal with MFA and a time-bounded company support session (proposed maximum one hour), an explicit selected company and a recorded support reason. Business audit displays Technical Support and the real principal/session reference. The account stays outside ordinary staff management as approved. All commercial invariants, funds checks, locks and Tawsel human/service restrictions remain in force. An ordinary company user cannot grant the support principal or impersonate it. Account recovery uses issuer-admin reset or configured issuer email; no default password or public self-registration.

Permission computation: company active AND user active AND screen capability allowed by the one role with `inherit/allow/deny` exception AND the screen's data scope AND the business-state rule. Explicit deny overrides inherited allow; explicit allow does not cross company or expand a narrow scope rule. Screen permission grants that screen's operations, not a separate invented per-button policy. Access-administration can manage ordinary company roles/users, but never platform support privileges. Persist an authorization revision and audit changes; revoke stale UI choices on refetch without trusting the UI to enforce them.

## Scope exceptions

| Surface | Scope |
| --- | --- |
| Intake, ordinary inventory, expense entry, goods-transfer sending | Assigned branches; one assignment is preselected and cannot expose unassigned choices |
| Goods-transfer destination selection | Any active other branch in the same company; receipt still requires assignment to the receiving branch |
| Goods-transfer receipt | Assigned destination branches; no manager-title bypass |
| Shipment operational tracking | All same-company shipments with full operational timeline; this grants neither financial history nor exports nor mutations |
| Treasury-transfer creation and receipt screens | Explicit company-wide branch scope, each with its own screen capability |
| Brand payout | Shared wallet of accessible company brands; paying account/branch authority and available funds are checked separately |
| Reports/exports | Report permission plus its authorized data scope; company-wide tracking does not grant a report or export |

Proposal for company-level master data: brands and reference catalogs are company-wide to users with their respective screen access; financial details require finance/report screen access. For employee records and branch reports, use assigned branches; an authorized user sees a company total only when assigned all its branches. This avoids accidental company-wide financial access through an operational tracking exception. Make the scope visible in report headings.

## API conventions

ERP-native routes use `/api/v1/`; Tawsel routes/types remain exactly as documented in the integration plan. Before feature implementation, define request/response/error JSON Schema and valid/invalid examples in `packages/contracts`. Use closed schemas, explicit nullable/optional fields, positive quantity constraints and safe integer bounds. Generate the ERP client from the same schema source; do not mirror hand-maintained frontend/server types with divergent rules.

Proposed native money representation is `{currency: "EGP", amountMinor: "25000"}`: base-10 integer strings with operation-specific positive/nonnegative/signed validation, no exponent/decimal/plus notation, and checked PostgreSQL bigint bounds. Quantities are JSON safe integers. Native JSON field names are camelCase; SQL columns use snake_case with explicit repository mapping. Convert to Tawsel's own canonical Money representation with checked exact bounds; never replace its field names or round a string into a different amount.

Every business mutation carries an immutable `commandId`, a schema version and the expected aggregate revision where applicable. The browser creates the identity once per confirmed intent. Persist its pending reference by session/identity until status is recovered; do not queue a new business write offline. Scope idempotency by company, authenticated native principal and command family. Store a canonical payload digest, result, affected records and audit. A repeated key/payload returns the same authorized outcome; changed payload returns a conflict. Reauthorize before exposing an old result.

Proposed ERP error vocabulary: `VALIDATION_FAILED`, `FORBIDDEN_SCOPE`, `REVISION_CONFLICT`, `INSUFFICIENT_STOCK`, `INSUFFICIENT_FUNDS`, `MISSING_TARIFF`, `SYNC_REQUIRED`, `ALREADY_COMPLETED`, `COMMAND_PAYLOAD_CONFLICT`, `DEPENDENCY_REJECTED`. Responses include `code`, `messageKey`, safe field details, `commandId` and an opaque support correlation ID. Map canonical Tawsel errors without changing their retained evidence. A timeout is an unknown result, not one of these definite business rejections.

Successful local completion returns its result and current revision. Work durably accepted for remote delivery returns a pending operation identity and readable next step. Do not show successful driver handover merely because an outbox row exists. `GET /api/v1/commands/{commandId}` is the proposed native authorized recovery route; it does not imply such an endpoint exists on Tawsel.

Lists use server-side filtering/sorting and bounded pagination (default 25, selectable 50/100), a stable tie-breaker and a consistent `asOf` when needed. Filters combine with AND between fields, OR within multi-select values. Date ranges are Cairo calendar ranges converted into `[start,end)` UTC boundaries. Query endpoints validate sort/filter names against an allowlist and use parameterized SQL. Numeric reference/phone search normalizes Arabic/Latin digits, while names/addresses retain their original form. Do not infer identity from normalized text.

## Transactions and workers

The full transaction catalog is in ERP-DATA-AND-TRANSACTIONS.md. Use PostgreSQL constraints and deterministic locking, not browser locks or a single Node process, to protect stock, shared wallet funds, account balances and command uniqueness. Retries for deadlock/serialization failure reuse the original command and stop after a bounded attempt count with recoverable status. Retry only before a confirmed commit result; never repeat external money disbursement.

Jobs live in dedicated PostgreSQL work tables with `availableAt`, attempt count, leased owner, lease expiry and fencing generation. Acquire short batches with row locks/skip-locked semantics; commit claims before network calls. Persist completion only if the fencing token still matches. Backoff, jitter, maximum concurrency and dead-letter/review states are explicit configuration; authorization/business rejections do not retry forever. Per-entity revision ordering survives parallel workers. Queue age, pending reason and retained result are visible to authorized integration staff.

Start with independent lanes for source delivery, inbox application/reconciliation, identity provisioning, storage renewals and exports. Each lane has bounded concurrency so a large export cannot starve custody updates. The issuer, Tawsel HTTP and object storage never participate in a held money/stock transaction. Restarting workers recovers persisted intents, not memory-only schedules.

Keep full native command responses for 30 days initially, with permanent compact identity/digest/affected-record/outcome references for retained business records. Never purge unresolved actions. Retain audit/domain history according to ERP-D-168; this is separate from short-lived operational logs or generated export files. Tawsel-specific replay and compaction retention follows its contract, not this native ERP proposal.

## Deployment

Deploy frontend assets and `/api` behind the same HTTPS origin; ERP API, worker and PostgreSQL use a private container network. Expose no database port publicly. Give runtime, migration and backup processes distinct credentials; only migrations can perform schema changes. Bind a deployment to one configured company identity, canonical integration identity and issuer configuration. Encrypt backups and restrict secrets to the relevant service.

The deployable units are web, API, worker, ERP database and the configured shared issuer connection. The issuer may be a separately managed service with its own database. ERP never reads Tawsel or issuer tables. Colocation changes only URLs/resources; the same containers and restored ERP data must work on a separate VPS.

Use expand/migrate/contract releases: backup verified, migration preview, maintenance only where an incompatible migration requires it, one migration runner with a lock, API compatibility with queued payload schema versions, then worker rollout. Immutable outbox payloads retain their original encoder/schema version. Rollback to a prior binary is allowed only with a compatible schema; destructive down migrations do not restore already committed money. Keep a tested forward repair path and release-specific recovery instructions.

Readiness requires database/schema and required local configuration; liveness tests the process. Tawsel outage marks integration degraded and blocks dependent actions, not all ERP reads/intake. Frontend loses no user input merely because a status poll failed. Stop accepting new work on shutdown, drain or release leased jobs safely, and let unfinished leases expire.

Required environment categories: application origin and company identity; database DSNs/limits; issuer/client/audience/redirect data; Tawsel public base URL and integration credentials; webhook signing key versions; backup repository and encryption references; operational log/alert destinations. `.env.example` contains placeholders only. Validate missing or inconsistent configuration at startup.

## Recovery

Propose pgBackRest with encrypted S3-compatible offsite storage, weekly full and daily differential backup plus continuous WAL, retaining a 30-day recovery window. Monitor archive age against a five-minute initial target and failures against an actionable alert; no target is a proven RPO. Store deployment config, identity realm/client configuration and necessary recovery secrets independently. A database-consistent physical backup and unbroken WAL are required for PITR; a copied live Docker volume is not equivalent.

Restore rehearsal before launch and monthly:

1. Record backup IDs, archive continuity, software versions and the latest recoverable time; provision an isolated network with production outbound integration and money actions disabled.
2. Restore ERP database, required identity configuration and credentials from their separate approved recovery sources; apply only compatible migrations.
3. Verify financial journal sums, stock/reservations/custody, unpaid payroll, eligible/held brand amounts, command identities and inbox/outbox cursors against known checkpoints.
4. Reconcile authoritative Tawsel state using documented replay/reads. Never replay an ERP cash payout from a Tawsel event. Review any real-world payouts/expenses after the recovery point against external evidence before releasing funds screens.
5. Prove a retained command after process restart recovers its original result. Prove an uncertain source action recovers with the same public action identity. Resolve the gap list before resuming outbound workers.
6. Record actual elapsed restore time, latest recovered transaction, lost/uncertain interval, human reconciliation needed and tested limitations. Only then authorize traffic/DNS cutover.

A deployment rollback cannot undo money physically handed out. A restore that loses a recorded cash movement requires review before further disbursement, even if every database constraint passes. Do not claim that Tawsel replay can reconstruct ERP-only money, employee or storage records. The owner has not approved a numerical maximum outage; the trial must produce a measured recommendation.

## Capacity and costs

Use the owner's estimate: 3 branches, 10 drivers, about 150 shipments/day and 10 or slightly more simultaneous staff. This is a test envelope, not a product limit. Proposed fixtures: one year of about 55,000 shipments with multiple lines/visits, 15 concurrent sessions and background webhook/export load; include a documented higher ramp to discover limits without truncating V1 scope.

Proposed pilot acceptance: common authorized list/detail reads p95 <=500ms API time; local money/stock command responses p95 <=800ms excluding explicit remote waits; searchable UI interaction <=1 second after a normal cached-route navigation on the measured client/network; no failed invariant under concurrent load. Report cache/warmup/data volume, network, hardware and tail latency. Measure real operator journeys; do not convert a Fastify benchmark into an ERP promise. These are engineering targets for review, not observed results.

Indexes follow company/branch/status/date/brand/driver/reference queries; inspect EXPLAIN plans for selected advanced filters. Use projections for expensive history totals with explicit freshness. Financial authorization and payout safety read transactional authoritative balances. Exports are worker jobs on an authorized snapshot with progress/status; downloads reauthorize, expire after 24 hours by default and neutralize spreadsheet-formula input. Use streaming/chunking and explicit oversized-request guidance rather than freezing API workers. Export expiry does not delete underlying business history.

Current price observations on 2026-10-03, USD before taxes or regional checkout differences:

| Item | Planning amount | Limit |
| --- | --- | --- |
| Existing KVM 2 | No new VPS subscription if existing capacity suffices | Published 2 vCPU/8GB RAM/100GB NVMe; free capacity beside Tawsel is unmeasured |
| Separate KVM 2 | Advertised $8.99/month equivalent; renewal $14.99/month for two years | Paid upfront; initial promotion term not established here; two-year renewal equivalent $359.76 |
| R2 Standard offsite storage | First 10GB-month included; then $0.015/GB-month | 100GB retained storage is about $1.35/month; requests may add cost |
| Domain, issuer recovery email, monitoring | Existing resources or later provider quote | No SMS, payment gateway, map/geocoding or paid monitoring subscription selected |

No purchase or deployment is authorized by this plan. Colocation capacity must be measured before relying on it. Optional location links remain plain validated links; ERP does not call Tawsel's Engine or require a paid geocoder. New external services require a specific need and priced proposal.

## Observability and acceptance

Record structured correlation IDs and command/action/event references with secrets and recipient contact/address redacted from routine logs. Business audit contains authorized detail. Metrics include worker lease expiry/retries, oldest unapplied event, source rejection/gap age, database lock/deadlock/connection pressure, financial invariant checks, export load, backup freshness and disk use. Alerts link to a concrete recovery screen/runbook. Business reconciliation and technical log retention are separate.

Required evidence: real independent-connection transaction races; process death after commit; worker fencing/duplicate HTTP; permissions changed before download/retry; separate API/worker/Tawsel public-service processes; clean-database migration and upgrade; actual encrypted backup/isolated restore; measured initial and ramp capacity; desktop and real-phone owner walkthrough. Record unavailable environment checks as not run. The design sample's successful build/browser inspection proves none of these production guarantees.

## Primary documentation checked

Reviewed 2026-10-03. These sources support implementation choices, not owner approval or claims that a target host was tested:

- [Nest Fastify adapter](https://docs.nestjs.com/techniques/performance): choose Fastify-compatible plugins; do not apply Express-specific recipes unchanged.
- [Node releases](https://nodejs.org/en/about/previous-releases) and [PostgreSQL support policy](https://www.postgresql.org/support/versioning/): recheck supported patches before pinning.
- [node-postgres transactions](https://node-postgres.com/features/transactions): use one client for the complete transaction.
- [React Router Data Mode](https://reactrouter.com/start/data/installation) and [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview): router/server-state responsibilities.
- React Hook Form remains a proposed form helper; its documentation fetch did not succeed in this session. Verify current installation/API compatibility before locking it; the server schema and field behavior do not depend on trusting that failed fetch.
- [Keycloak OIDC endpoints](https://www.keycloak.org/securing-apps/oidc-layers): issuer/client integration reference.
- [PostgreSQL isolation](https://www.postgresql.org/docs/18/transaction-iso.html) and [continuous archiving](https://www.postgresql.org/docs/18/continuous-archiving.html): transaction/recovery mechanics.
- [Dokploy database backups](https://docs.dokploy.com/docs/core/databases/backups) and [pgBackRest guide](https://pgbackrest.org/user-guide.html): selected backup/repository/PITR sections, not a tested Dokploy integration.
- [Hostinger VPS prices](https://www.hostinger.com/vps-hosting) and [R2 pricing](https://developers.cloudflare.com/r2/pricing/): dated cost indications above.
