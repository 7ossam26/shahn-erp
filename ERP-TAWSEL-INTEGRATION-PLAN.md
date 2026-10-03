# ERP–Tawsel Integration Plan

Current authority, session025 (2026-10-03): ERP-D-205 / ERP-R-214 approve PLAN-001 and authorize phase authoring. Detailed plan mechanics below are adopted; original proposal/review wording is retained as drafting provenance, not a renewed approval gate. External contract gaps, unverified runtime targets and the unnamed palette remain explicitly limited. No production implementation is authorized by this authoring turn.

Updated: 2026-10-03. Status: **draft for owner review, not approved for implementation**.

Owner-rule synchronization: ERP-D-200 through ERP-D-204 / ERP-R-209 through ERP-R-213 are incorporated below. Their approval does not approve the complete master plan or implementation phases.

This document specifies the proposed ERP integration against an existing, completed Tawsel system. It does not reopen Tawsel's implementation phases. Existing owner decisions keep their recorded approval status; new ERP transaction, mapping and recovery choices below are proposals until the master plan is approved. An endpoint or schema described as current is a contract fact, not a proposed extension.

Read together with [master-plan.md](master-plan.md), [ERP domain specification](docs/planning/ERP-DOMAIN-SPEC.md), [architecture and operations](docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md), [screen specification](docs/planning/ERP-SCREEN-SPEC.md), [decisions](ERP-DECISIONS.md), [Tawsel change requests](TAWSEL-CHANGE-REQUESTS.md), and the [contract coverage ledger](docs/planning/INTEGRATION-CONTRACT-COVERAGE.md). Phase prompts follow owner approval of the master plan.

## 1. Contract baseline and evidence

The retained baseline is commit `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`, extracted `2026-09-25T08:22:32.982Z`, package kind `erp-planning-reference`. Its client package version `0.1.0` is insufficient as a compatibility identifier. The current envelopes and selected payloads use `1.0.0`. The baseline, artifact hashes and update process remain in [TAWSEL-BASELINE.md](TAWSEL-BASELINE.md) and [INTEGRATION-CHANGELOG.md](INTEGRATION-CHANGELOG.md).

In this document `01` through `07` mean the unchanged files under `docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/`. References such as `05:9528` are original one-based Markdown line numbers, followed where useful by the embedded schema name. They are source locations, not newly invented contract files. `schemas.tawsel.invalid` identifiers resolve within those embedded schemas; they are not download addresses.

Foundations 01, 02, 03 and 07 were read completely. The selected HTTP operations, all 27 sender payload families, their important schema dependencies and named success/rejection fixtures were examined as recorded in the coverage ledger. This is **not** a claim that all of 04–06 were read or that the fixtures were executed. No live HTTP, signature, database or two-system conformance test ran during planning. Unresolved semantics and coverage work are explicit in section 18.

## 2. Ownership and authority

| Data or action | Authoritative owner | ERP behavior |
| --- | --- | --- |
| Brands, commercial order, service choice, tariffs, prepaid-to-brand status, packing increment and incident-linked company shipping waiver | ERP | Capture the applicable commercial agreement and exact outstanding amounts. Preserve the original order, standard tariff, approved waiver and pricing history separately. |
| Loose stock, parcel custody inside ERP, internal branch transfer, actual handover to brand | ERP | Record physical movements, reservations, conditions and authorized corrections. Do not infer receipt from a proposed return or a cancelled order. |
| Driver assignment/accepted receipt for customer execution, departure, routing, attempts, arrival, execution outcomes and bounded execution corrections | Tawsel | Use permitted service commands for intake/assignment; project accepted execution facts. Human execution stays in Tawsel. |
| Driver-reported collection | Tawsel execution fact | Record its effective amount and history; derive ERP expected remittance separately. It is not company cash receipt. |
| Company cash accounts, actual remittance, brand payout, shipping cover reservation, compensation, expenses, storage payment/credit and payroll | ERP | Post auditable native transactions with their own permissions, identity and concurrency rules. Storage revenue/payment and typed employee cost remain native ERP facts; no settlement command to Tawsel is implied. |
| ERP employee record and pay agreement | ERP | Independent of a login or Tawsel user. An operational driver used for automatic commission has an explicit effective employee link. |
| Execution location/route revisions and workday/round identity | Tawsel | Keep separately from ERP address, accounting month and internal transfer trip. |
| Delivery of an event | Tawsel sender and ERP receiver each retain their evidence | Acknowledgement means durable receipt; application and business effects have separate state. |

ERP never shares Tawsel's database, invokes Engine directly, submits driver actions through a source account, or gains authority by inserting an arbitrary driver ID. The 04 authority index at lines 11–139 distinguishes source services, human sessions, operator bootstrap and operations hosted at the external receiver.

### 2.1 Native access versus connector authority

The ERP enforces module/screen capabilities and assigned branches on its own server. The worker acts under one scoped source-service identity. Native audit retains the real ERP actor, selected branch, reason, request identity and before/after versions; do not inject unsupported actor properties into closed service command schemas. The current provisioning change record has `actorId: null` for service-origin changes.

Shipment tracking has the approved company-wide read scope (ERP-D-187), while mutation screens retain their specific assigned-branch rules. Goods-transfer receiving is assigned-destination scoped; treasury-transfer receiving has a separately approved company-wide exception. Neither exception broadens Tawsel's source scope.

## 3. Identities, revisions and source mapping

### 3.1 Identity map

| ERP identity | Tawsel identity | Required rule |
| --- | --- | --- |
| Company integration installation | `tenantId`, `integrationId` | Store separately from company display number; every command, inbox row, stream and binding is scoped. |
| Branch | Provisioning external identity and returned branch UUID | Preserve mapping through deactivate/reactivate; never reuse an old external identity for another physical branch. |
| Role/user/operational driver | Provisioning external IDs and returned resource IDs | Preserve immutable issuer subject and driver reference. HR-only employees do not require these bindings. |
| Commercial shipment | `externalId` within `(tenantId, integrationId)` and stable `taskId` | One commercial identity across valid retries and cycles. Numeric public reference is a separate ERP field. |
| Optional brand reference | `sourceOrderReference` | Optional; does not replace uniqueness or idempotency keys. |
| Shipment line/variant allocation | `sourceLineId` | Stable within the shipment; retain original commercial line, exact quantity and outstanding unit allocation. |
| Customer dispatch cycle | `sourceDispatchCycleId` and returned `dispatchCycleId` | Separate external string and native UUID. A new cycle is not a new commercial shipment. |
| Actual execution attempt | `attemptId` with `roundId`, `workdayId`, `driverId` | Necessary for visit charges, commission, history and effective outcome. Do not derive from date or shipment alone. |
| Outcome and correction | `outcomeId`, `revision`, `correctionId`, previous identity/revision | Keep immutable originals plus one effective chain. Do not sum all revisions as independent collections. |
| Return | `requestId`, `itemId`, `transitionId`, item `revision` | Physical subset and disposition effects are unique by accepted transition identity. |
| Native business intent | ERP `commandId` mapped to each required remote `actionId` | Persist the native idempotency identity and explicit remote-action links. One intent can require distinct supported remote actions; each remote action retains its own immutable envelope and ID across retries. |
| Delivered fact | `eventId`, recipient aggregate identity and sequence | Transport identity and ordering are separate from the underlying business fact identity. |

`sourceRevision`, `assignmentRevision`, outcome revision, location revision, plan revision, device generation, monitoring `snapshotRevision` and recipient event sequence are different counters. No shared `version` field may stand in for them. Provisioning user changes share that user's source revision stream across role, exceptions, branches and disable operations; use the expected current revision, not a counter per form.

Tawsel workdays may cross midnight and contain multiple rounds. ERP calendar payroll and report periods do not start/end Tawsel workdays. Store instants in UTC, display with `Africa/Cairo`, and preserve an absent or uncertain observation rather than turning webhook arrival time into physical event time. [02 identity/lifecycle tables; 05:1607 common; 05:7759 monitoring; 05:17540 closure.]

### 3.2 Exact `SourceSnapshot` mapping

The current closed `b2b-intake.schema.json#/$defs/SourceSnapshot` begins in 05:156. Its fields describe the **outstanding recipient obligation**, not the complete ERP commercial ledger.

| Contract field | Proposed ERP source and validation |
| --- | --- |
| `externalId` | Immutable integration shipment reference. A numeric display reference can be rendered to a stable string, but technical identity must remain unambiguous for the installation lifetime. |
| `sourceDispatchCycleId` | Durable ERP customer-dispatch cycle identity created before the command. Do not use the internal branch-transfer manifest number. |
| `sourceRevision`, `expectedSourceRevision` | Desired new source revision and last accepted source revision. Initial expected revision is zero; later commands use the actual accepted value and lifecycle. |
| `sourceBranchExternalId` | Actual customer-dispatch branch's provisioned external ID. Ordinary branch changes on an already accepted shipment remain CHECK-003; presence of this property alone does not authorize them. |
| `recipientName` | Nonblank name, maximum 200 characters. |
| `recipientPhone` | Contract-valid E.164 or Egyptian mobile shape. Preserve human input for correction; do not silently invent missing digits. |
| `destination` | `{kind:"address", addressText}` or `{kind:"confirmed-pin", coordinates, addressText?}`. Address maximum 500 characters; latitude/longitude use the documented bounds. |
| `splittingAllowed` | Captured shipment policy from the brand agreement. Does not allow one order to be assigned to two drivers. |
| `allocation` | Literal `"exact-outstanding-per-unit"`. No arbitrary aggregate deposit allocation. |
| `lines[]` | 1–100 lines, each with stable `sourceLineId`, nonblank `description` up to 200, integer `quantity` from 1 to 1,000,000, and exact `unitDue`. |
| `shippingDue` | Explicit recipient shipping still owed for this cycle. This is distinct from ERP's standard per-visit tariff, base/packing components and any approved company-funded replacement waiver. Under ERP-D-203, company-funded replacement shipping is explicitly zero here while actual goods due is preserved. |
| `totalDue` | Exact sum of quantity × `unitDue` plus `shippingDue`, with consistent currency/exponent. |
| `priority` | Contract `ordinary` or `urgent`. No new urgent-operation business feature is approved merely because the API exists. |
| `sourceOrderReference?` | Optional brand-supplied reference; contract maximum 256. |
| `earliestAt?` | Optional existing business timing constraint when applicable; UTC contract timestamp, not an invented scheduling module. |
| `instructions?` | Explicit inspection choice rendered as clear driver instruction plus the separate comment; maximum 1,000 characters. Validate length and preserve input; do not silently truncate important instructions. |

The source snapshot has no dedicated `inspectionAllowed`, map-URL, brand-wallet, tariff-tier, commission, storage, packing-cost or replacement-waiver field. ERP retains those native properties. An optional recipient location link does not prove a confirmed pin; pass an address unless real validated coordinates and the required confirmation exist. The current driver-facing result of instruction text must be demonstrated in the end-to-end acceptance journey.

`Money` uses nonnegative safe integer `amountMinor`, `currency: "EGP"`, `exponent: 2`. Use integer arithmetic and validate intermediate products and totals before serialization; do not round floating-point totals into validity. ERP ledgers may have signed movements, but do not send negative contract money. Different outstanding amounts per otherwise identical piece require distinct source lines with stable identities. [05:1607 common; 06:9380, 9620, 9667 and the P10 invalid allocation/unsafe-money examples.]

Approved ordinary prepaid cases remain: goods prepaid to brand means zero `unitDue` and shipping-only recipient due; goods and shipping prepaid to brand means explicit zeros for the outstanding goods/shipping amounts and an ERP brand shipping debit for an eligible visit under the normal payer rules. Do not create a second goods credit for already prepaid goods. ERP-D-195 excludes shipping previously paid on an earlier recipient attempt; it does not remove prepaid-to-brand cases. Apply the separately approved company-funded replacement waiver below where selected; it creates no brand shipping debit.

ERP-D-203 / ERP-R-212 separately approve **company-funded replacement shipping** linked to an incident. Send the actual outstanding `lines[].unitDue` unchanged, `shippingDue: {amountMinor:0,currency:"EGP",exponent:2}`, and `totalDue` equal to outstanding goods only. Example: goods due250 and standard shipping50 means contract goods due250, shipping due0, total due250. ERP retains standard tariff50, linked waiver50, zero brand shipping liability and the normal driver commission rule. Zero the goods component only when a separate actual prepaid-goods fact justifies it. Do not add a canonical payer/waiver field, convert a shipping waiver into an all-COD waiver, or infer an employee-funded replacement option. Current Money/SourceSnapshot definitions support explicit zero shipping; the complete business journey still requires IP-AC-22 runtime acceptance.

### 3.3 Submission point and immutable snapshots — proposal

Create and physically receive/prep the ERP order independently of Tawsel availability. Submit the first customer-execution snapshot when staff prepare that order for customer dispatch, using the actual dispatch branch at that point. This keeps ordinary ERP-only transfers before first submission independent of branch mutation in Tawsel. It does not resolve an accepted-source branch change or a returned shipment's later cross-branch redispatch.

Persist separate desired, pending and accepted source revisions. Price/tier changes affect new commercial orders only, as approved. An authorized pre-handover correction must produce a new supported snapshot/revision and show synchronization pending. Once the lifecycle protects departed execution, do not edit quantities/prices/branch through an invented override. Resolve an incorrect commercial posting through the ERP's legitimate correction/settlement flow, preserving Tawsel facts.

## 4. Identity bootstrap and lifecycle

1. An operator creates/binds the source with `integration.bindSource`. Ordinary workers never hold the `ProvisioningOperator` credential. Keep the returned scoped source identity and supported versions.
2. Generate the raw service credential privately; bootstrap sends the required SHA-256 hash, not a raw secret. The service bearer has the current `twp_<credential UUID>.<64 lowercase hex>` shape and expiry. It is separate from receiver signing secrets and status credentials.
3. Call `integration.getConfiguration` and validate verified identity, issuer, supported versions, allowed operations and `humanDelegation: false`. A successful login does not grant every operation in OpenAPI.
4. Provision branches, roles, users and driver references through the selected service family, preserving expected revisions. Issuer user creation/enabling/password recovery remains an issuer responsibility. Tawsel subject reservation and issuer readiness are distinct from command acceptance.
5. Track issuer readiness through `provisioning.getStatus`. Accepted provision with pending/retry/failed issuer state does not make the user ready. A successfully disabled user can be ready with `enabled: false`; do not interpret readiness as enabled.
6. ERP employees can exist without login or driver identities. A commission-bearing operational driver requires an explicit, effective-dated employee association with no overlapping competing employee mappings. Name/phone matching is prohibited. Store the mapped employee and captured pay agreement on the earning; later relinking cannot move historical earnings silently.
7. On disable, preserve history, unresolved custody, old IDs and native audits. Stop newly unauthorized work; do not delete prior bindings or regenerate identities to evade lifecycle restrictions.

Provisioning commands: 04:1283–1713; schemas 05:12566–14051; P08 positive/negative fixtures. Version errors, duplicate subject, disabled/missing references, stale revisions, cross-source identity and lost response must each be verified. The worker retries the same accepted-or-unknown action; current provisioning status is not a substitute for an arbitrary old action's retained result.

## 5. Exact permitted service inventory

This inventory contains **43 scoped service operations plus one operator-bootstrap operation (`integration.bindSource`), 44 named operations in total**. An operation can be supported operationally without a general business screen. In particular, `intake.setUrgencyBeforeDeparture` retains conditional adapter/conformance coverage and does not authorize a new ERP action or UI by itself. The runtime allowlist is narrowed by `integration.getConfiguration` and the actual credential's capabilities. All listed paths are on Tawsel except the receiver paths in section 10.

Common notation: **P** = `/api/v1/provisioning/commands/`; **I** = `/api/v1/intake/commands/`; **R** = `/api/v1/erp/returns/commands/`; **W** = `/api/v1/integration/commands/`. Append the exact operation ID to a command prefix. Schemas are the named `$defs` within the embedded contract. All normal commands preserve the exact approved envelope and `actionId` during recovery.

| Operation(s) | Method/path; authority | ERP purpose and recovery boundary |
| --- | --- | --- |
| `integration.bindSource` | POST P; `ProvisioningOperator` | Initial source bootstrap. Read `BindSourceCommand`; retain accepted identity, never repeatedly create a different source after an ambiguous response. |
| `integration.rotateCredential`, `integration.disableSource` | POST P; `integration.manage`; rotation also permits operator recovery | Planned rotation/revocation or controlled disable. `RotateCredentialCommand` / `DisableSourceCommand`. Same-envelope replay; do not store secrets in audit output. |
| `branch.provision`, `branch.disable` | POST P; `identity.provision` | Branch master-data sync. `BranchCommand` / `DisableBranchCommand`; preserve history and source revision. |
| `role.defineCapabilities` | POST P; `identity.provision` | Explicit mapping from ERP operational access to permitted Tawsel capability set. `RoleCommand`; do not send ERP-only finance capabilities or hardcode a job-title bypass. |
| `user.provision`, `user.setRole`, `user.setCapabilityExceptions`, `user.setBranchMemberships`, `user.disable` | POST P; `identity.provision` | `UserCommand`, `UserRoleCommand`, `UserExceptionsCommand`, `UserBranchesCommand`, `DisableUserCommand`. Serialize the shared user revision stream; issuer readiness remains separate. |
| `driver.provisionReference` | POST P; `identity.provision` | `DriverCommand`. Explicit operational driver setup; does not create a salary contract. |
| `integration.getConfiguration` | GET `/api/v1/provisioning/configuration`; `integration.manage` | Read `SourceConfiguration`, including identity/version/operation allowlist. No write or business receipt implied. |
| `provisioning.getStatus` | GET `/api/v1/provisioning/status`; `identity.provision` | Read `ProvisioningStatus` for issuer synchronization readiness; retain failed/retry status visibly. |
| `intake.submitSnapshot` | POST I; `intake.prepare` | `SourceSnapshotCommand`. Accept or reject complete exact snapshot; recover through identical command and native intake result/read. |
| `intake.prepare` | POST I; `intake.prepare` | `PrepareCommand`: selected driver and assignment references. Preparation does not assert physical driver receipt. |
| `assignment.receiveBatch` | POST I; `assignment.manage` | `ReceiveBatchCommand`, including `receiptAsserted: true`. Atomic actual customer-dispatch handover; no silent partial success. |
| `assignment.withdraw` | POST I; `assignment.manage` | `WithdrawCommand`. Supported predeparture withdrawal only; not cancellation of physical goods already departed. |
| `assignment.reassignBeforeDeparture` | POST I; `assignment.manage` | `ReassignCommand` with documented `receiptAsserted` meaning. Preserve physical truth; no active-route handover shortcut. |
| `intake.setUrgencyBeforeDeparture` | POST I; `intake.prepare` | `UrgencyCommand`. Documented support only if a corresponding permitted ERP operation is selected; never a postdeparture source override. |
| `intake.getTask`, `intake.listTasks` | GET `/api/v1/intake/task`, `/api/v1/intake/tasks`; `intake.prepare` | `Task`/`TaskList`, external reference and scoped pagination. Reconcile known tasks and find pending source revisions. Current task state is not full event history. |
| `intake.getBatchResult` | GET `/api/v1/intake/results/{actionId}`; `assignment.manage` | `BatchResult`. `202`/pending is not accepted or rejected. Match action/result and preserve unknown state until authoritative resolution. |
| `dispatch.createFromReceipt` | POST I; `assignment.manage` | `RedispatchCommand`. Fresh explicit snapshot and actual compatible unallocated receipt. Cross-branch compatibility remains section 8. |
| `dispatch.listCycles` | GET `/api/v1/intake/cycles`; `assignment.manage` | `CycleList` for a scoped `externalId`, bounded pagination. Preserve old cycles and their original branch/price history. |
| `return.listPending` | GET `/api/v1/erp/returns/pending`; `return.receive` | `RequestList`, required driver and source-branch scope; page through results. No assumption that the first 100 are all returns. |
| `return.getNativeRequest` | GET `/api/v1/erp/returns/requests/{requestId}`; `return.receive` | `RequestView`, quantities and revisions for actual receipt/disposition preparation. |
| `return.getNativeResult` | GET `/api/v1/erp/returns/actions/{actionId}`; `return.receive` | Recover a submitted native return action. Pending does not authorize stock posting. |
| `return.confirmSubsetReceipt` | POST R; `return.receive` | `ReceiveCommand`. Assert only the physically received subset at its permitted source branch. Same action after lost response; effects unique by accepted transition. |
| `return.recordDisposition` | POST R; `return.dispose` | `DisposeCommand`, `lost` or `damaged`. No reusable stock or automatic compensation from a disposition alone. |
| `integration.getExecutionProjection`, `integration.getTripProjection` | GET `/api/v1/erp/monitoring/drivers/{id}`, `/trips/{id}`; `monitor.read` | Source-filtered received execution evidence, `Snapshot`. Driver assignment aid and read-only tracking, not GPS or a reservation. |
| `integration.getTaskHistory`, `integration.getWorkdayHistory` | GET `/api/v1/erp/monitoring/tasks/{id}/history`, `/workdays/{id}/history`; `monitor.read` | `History`: preserve immutable attempts, original/effective outcomes and corrections. Restart pagination on a changed snapshot. |
| `integration.getMonitoringAction` | GET `/api/v1/erp/monitoring/actions/{id}`; `monitor.read` | `ActionSnapshot`, with required source identity query. Restricted action investigation; not the human result endpoint. |
| `integration.configureWebhook`, `integration.rotateSigningKey` | POST W; `integration.manage` | `ConfigureWebhookCommand` / `RotateSigningKeyCommand` in outbox schema. Select preprovisioned signing keys; validate callback and overlap. |
| `integration.retryDelivery` | POST W; `integration.manage` | `RetryDeliveryCommand`: explicit delivery retry, preserving immutable event identity/body. Does not mean reapply financial effects. |
| `integration.getDeliveryStatus`, `integration.getDeliveryDetail` | GET `/api/v1/integration/deliveries`, `/deliveries/{eventId}`; `integration.manage` | `Queue`/`Detail`, delivery attempts and receipt status. `projectionStatus` remains `unknown`; ERP uses its own application evidence. |
| `integration.replayEvents` | GET `/api/v1/integration/replay`; `integration.manage` | `Replay` for recipient aggregate identity/sequence. Pages up to 100; handle unavailable history explicitly. |
| `integration.getReconciliationSnapshot` | GET `/api/v1/integration/reconciliation`; `integration.manage` | Consumer `Snapshot`; current-state coverage only. No invented historical charges or receipts. |
| `integration.reportAppliedCheckpoint`, `integration.getAppliedCheckpoint` | POST W; GET `/api/v1/integration/applied-checkpoint`; `integration.manage` | Consumer `ReportCommand` and checkpoint report. Sent from actual committed ERP counters; `receiver-reported` is not an independent audit. |

Sources: authority/capabilities 04:16–58 and operator entry; detailed service HTTP 04:196–550, 1283–2024, 4254–4467, 4631–4730, 5476–6158. Corresponding complete schema blocks are indexed in the coverage ledger. The exact operation-specific command schema, not the generic envelope alone, is the validation authority.

### 5.1 Human and external-host exclusions

The connector does not call `round.start`, planning preview/replan/manual order, `current.recordArrival`, outcome full/partial/refusal/no-answer commands, whole retry/defer/activate, `outcome.correct`, branch interruption/arrival/resume, `round.end`, `workday.end`, device takeover or offline driver sync. It does not call the human `action.getResult` to recover a source action. These require the documented human session/capability/device/lifecycle.

`consumer.receiveSignedEvent`, `consumer.getStatus` and `source.getCommandStatus` run on the external ERP/reference server. They are not extra reads at Tawsel. ERP may implement its own protected operational status screens; the mock reference status UI is not the ERP's product specification.

## 6. Dispatch, handover and command uncertainty

The ERP dispatch screen separates local preparation, Tawsel synchronization, proposed assignment and actual physical driver handover. Required gates include native branch/capability, actual goods availability, complete preparation, no conflicting reservation/transfer, applicable commercial cover gate, ready identities, accepted current snapshot and valid expected assignment revision.

ERP-D-200 / ERP-R-209 settle that commercial cover basis: for a brand that may not go negative, reject new handover if signed commercial entitlement is negative or if eligible wallet credit, after posted debits, affected holds and existing shipping reservations, cannot cover the new **known brand-paid shipping**. Reserve that known portion atomically against the same wallet used for payouts; unremitted/pending goods proceeds and storage credit cannot fund cover. A normal recipient-funded order does not require the whole tariff prepaid by the brand. A company-funded replacement shipping waiver has zero brand-paid shipping exposure; the otherwise applicable existing-debt gate still applies. Existing cover is subtracted once, not both in `eligible_to_pay` and again from that already-net value.

An `AssignmentReference` carries `externalId`, `sourceDispatchCycleId`, `expectedSourceRevision`, `expectedAssignmentRevision`, `assignmentRevision`. Do not replace these with a generic last-updated timestamp. `assignment.receiveBatch` asserts real receipt with `receiptAsserted: true`; a staff action must not mark a prepared list as received merely because the driver was selected.

**Proposed transaction boundary:** commit a durable handover intent and immutable command while retaining the goods as unavailable to competing actions. Send outside the database transaction. Confirm the integration handover locally only from authoritative acceptance. A timeout leaves the action **awaiting confirmation**, retains its lock/reservation and recovers the same `actionId`. It neither rolls back a possible actual handover nor enables handing the same goods to another driver. Staff must see the uncertainty and keep the batch identifiable.

ERP can accept local registration/preparation while Tawsel is unavailable; it cannot display final handover success without required accepted integration (ERP-D-165). Do not promise distributed ACID across a physical act, ERP database and Tawsel HTTP. PostgreSQL transactions make each ERP commit atomic; the persisted state machine and same-action recovery bridge the systems.

The contract limits remaining planned stops to 50, including a branch stop. It is not a daily order limit or a cap on every item ever held. The `49 + 2` receive case rejects the whole batch; the ERP must show affected input without silently selecting one item. Planning/location failure after an accepted receipt does not undo custody. `planningStatus` and `locationReadiness` are displayed independently from accepted receipt. [05:156–1181; 06 P10 command/capacity/stale/allocation examples.]

Read `Task.state` as the cycle lifecycle (`unassigned`, `prepared`, `held`, `withdrawn`) with its other fields. A historical cycle can retain `state: held` after its effective outcome has delivered all pieces. Use outcome/custody quantities for present physical responsibility; never show every historically held task as currently on the driver.

## 7. Returns, disposition and stock

1. Receive `return.requested` as an offer/request. Show expected pieces with driver, source branch, cycle, original source line and item revision; create no branch stock.
2. Authorized staff inspect actual goods at the original customer-dispatch source branch and select the real received subset. Before acceptance, a local physical observation may be retained as pending/quarantined evidence, unavailable for reuse. It does not fabricate a Tawsel accepted transition.
3. Submit `return.confirmSubsetReceipt` with `requestId`, permitted `receivingBranchId` and nonempty items of `itemId`, `expectedRevision`, integer `quantity`. A wrong receiving branch, duplicate item, excess/zero/fractional quantity, stale revision or incompatible lifecycle cannot be hidden behind a general adjustment.
4. Accepted `Transition` records have unique `transitionId`, task/cycle/outcome/source line, quantity, revision, identity and action time. Normalize the command result and later `return.subsetReceived` echo into one fact identity before posting native custody. There must be one physical/inventory effect even if HTTP result, event, replay and reconciliation all expose it.
5. Receipt and condition are distinct. Sound stocked goods may become available after actual receipt and inspection; damaged/uncertain goods remain unavailable. Returning an externally supplied parcel preserves parcel identity and does not create loose SKU stock.
6. `return.recordDisposition` records legitimate `lost` or `damaged` quantities against the request/revision. It settles that custody balance; ERP incident confirmation, compensation and employee deduction are separate authorized business transactions.
7. A new customer cycle via `dispatch.createFromReceipt` consumes compatible, actually received, unallocated quantities. Unreceived, lost, damaged or already allocated pieces cannot fund redispatch. Partial-delivery remainder is not an arbitrary whole retry on the old attempt.

Conservation checks are per source line/cycle: dispatched quantity = delivered + driver-held + branch-received + lost + damaged; `returnRequired` is a subset of held custody, not another additive quantity. For a request, requested = received + unresolved + lost + damaged. A received subset is usable independently of unresolved remaining pieces when otherwise eligible; do not invent an all-returns-cleared rule.

Concurrent return receipt, correction, whole retry, disposition and redispatch must respect the authoritative revision/dependency result. If one wins, reread and show why the other needs review; never change the submitted payload under the same `actionId`. [04:4254–4467; 05:15217–16091; 06:14304–14932 P21 and 14934–15723 P22.]

## 8. Internal branch transfers and CHECK-003

The approved internal goods-transfer workflow is fully ERP-owned: reserve eligible source goods, assign a carrier, record actual handover, then destination staff confirm actual received/condition/missing quantities. Mixed brands, whole parcels and loose stock are permitted. Each physical trip gets its own manifest. It generates no customer delivery, brand shipping charge, ordinary visit commission or Tawsel transport task.

Drivers active in customer rounds remain selectable. Source-branch drivers appear first; show received round evidence and freshness. Prefer known branch-present/no-active-round drivers only when the evidence supports those labels. Unknown is visible. This is a selection aid, not a Tawsel route lock, new stop, GPS assertion or guarantee of present availability. Source/destination staff permissions follow ERP-D-179; multi-branch staff select among their assigned branches.

| Case | Supported conclusion | Remaining constraint |
| --- | --- | --- |
| Transfer before the shipment's first Tawsel acceptance | Under the proposed submission point, first customer snapshot can identify the actual dispatch branch B after ERP receipt at B. | Test ordinary branch provisioning, stock reservation and first intake. This does not require changing a prior Tawsel branch. |
| Shipment already accepted as unassigned/prepared under A, then physically transferred to B before customer departure | Generic `sourceBranchExternalId` and revision fields are present. | The supplied prose/examples do not establish the exact allowed branch-change sequence, required withdrawal, or branch compatibility. Do not assert support or prohibition. |
| Actual customer return received at A, then ERP transfer/receipt at B, then intended customer redispatch from B | Existing redispatch accepts a new explicit snapshot and requires a compatible actual unallocated receipt. | P22 demonstrates same-branch reuse, not that an A receipt funds a B cycle. Preserve old history and hold the affected customer-dispatch action pending verified support. |

ERP-D-196 reconfirms actual internal transfer/receipt and qualifies the earlier ERP-D-186 returned-shipment redispatch choice; it does not unambiguously revoke that choice or prove contract compatibility. CHECK-003 remains an internal engineering dependency, not a repeated business questionnaire.

Required Tawsel clarification/conformance evidence: a documented public command sequence for both accepted-predeparture A→B and receipt-funded A→B cases; exact withdrawal/source/assignment revisions; line and quantity compatibility; disposition of old receipt allocation; original-cycle history and new-cycle return branch; duplicate/lost-response recovery; positive A→B example; negative wrong branch/state/insufficient balance/unreceived/lost/damaged/already allocated cases. If the existing implementation cannot support the retained business scope, record that exact mismatch as a change request. Do not request a transport API merely because ERP transfers exist. `p22-arbitrary-branch` rejects an injected property on `branch.interruptRound`; it is not evidence about redispatch branch compatibility.

Until resolved, do not create a different commercial shipment, invent a receipt at B, call a driver endpoint, or change a departed snapshot to bypass the dependency. The rest of ERP transfer and integration work can proceed; full cross-branch customer-dispatch closure cannot be claimed. [04:4631–4730; 05 B2B `Redispatch`; 06:15045–15242; consolidated TAWSEL-CHECK-003.]

## 9. Source outbox and command recovery — proposed ERP design

Every native operation that requires a source command commits its business intent, actor audit, version check and immutable outbox envelope in one PostgreSQL transaction. Do not first call Tawsel and then attempt to create the native business record. Outbox rows include scoped `actionId`, exact operation/payload version, immutable serialized request/hash, related entity/cycle, expected revisions, dependency identities, native initiating actor, attempt count, next attempt, lease identity/expiry, last transport result, retained business result and visible state.

States distinguish queued, sending, awaiting authoritative result, accepted, rejected, review-required and configuration-blocked. An expired worker lease is recoverable; it is not a domain rejection. Keep transport attempts separate from one command identity. A revision-sensitive lane serializes commands for the same source entity/cycle; unrelated lanes may proceed. A lease token/fence prevents an old worker from overwriting a newer completion after timeout. Do network I/O outside the database transaction.

Operation-specific closed source command wrappers require their documented integration context, usually empty `resources`, `baseVersions` and `dependsOnActionIds`; expected domain revisions live in their payload. Do not add human/device context, an unsupported asserted actor or invented generic revision fields. Validate the concrete feature command, not only `action-envelope.v1.schema.json`.

### 9.1 Result interpretation

`ActionResult` contains a durable receipt and operation identity; `retention: full` requires the response body, while `retention: compacted` forbids that body and retains receipt/summary. The full-response window is at least 30 days; durable action identity outlives that window. A compacted result is not permission to create a new action and repeat the business operation. Inspect the receipt's status, matching action/operation, committed time and resource versions rather than treating HTTP success alone as business acceptance. [05:43–155 and common result definitions; 06 full/compacted accepted/rejected fixtures.]

| Observed result | Required behavior |
| --- | --- |
| Known accepted result | Atomically persist result, update accepted native mapping/status and normalize returned business facts. Later event echoes deduplicate. |
| Known rejected result or review-required receipt | Preserve input, failure code and attempted revisions. Show corrective action. A changed intent after review gets a new action identity; the rejected action remains retained. |
| Timeout, connection loss, malformed response, `5xx`, worker crash after send | Acceptance is unknown. Retry/recover the exact same action. Do not compensate, unlock goods, change revision, or issue a new ID solely because no response was seen. |
| Native result is pending/`202` | Retain awaiting-confirmation state and bounded retry. Absence of a visible committed result is not rejection. |
| Same `actionId`, changed semantic payload | `idempotency_conflict` is a fault needing investigation. Never deliberately mutate the stored envelope. |
| `stale_revision`/lifecycle conflict | Fetch authorized current evidence, retain the rejected request and ask the native workflow to review its new state. Do not blindly increase counters and resend changed data. |
| Authentication/capability/source disabled | Stop that configuration's sends and expose a support task. Do not churn secrets, widen roles, impersonate a user or loop indefinitely. |
| Valid compacted receipt | Use retained receipt plus authorized current/history reads for presentation; do not claim unavailable historical response content or reexecute the command. |

Use `intake.getBatchResult` for native intake actions, `return.getNativeResult` for native return actions, and identical operation replay where documented for provisioning/integration administration. `integration.getMonitoringAction` aids investigation but is not a universal human action-result API. Backoff is bounded and jittered; manual Retry reuses the stored action and cannot make invalid input valid. Terminal configuration/domain failures remain visible instead of silently discarding a job after an arbitrary retry count.

## 10. Signed receiver and durable inbox — proposed ERP design

Expose the canonical-style `POST /api/v1/consumer/events` on the ERP's public HTTPS origin. Configure its exact allowed URL in Tawsel. Current sender restrictions require HTTPS on port 443, public unicast resolution, and no credentials/query/fragment/redirect-based routing. Hosting the systems on one Dokploy server does not make a private LAN callback part of the documented production contract. Keep identity and permissions separated even on the same host.

### 10.1 Verification before acceptance

Read raw bytes before JSON parsing/normalization. Header names are case-insensitive; reject ambiguous duplicate security headers. Validate:

- `X-Tawsel-Tenant-Id`: canonical tenant UUID;
- `X-Tawsel-Integration-Id`: recipient integration UUID;
- `X-Tawsel-Key-Id`: configured bounded key selector;
- `X-Tawsel-Delivery-Timestamp`: 13-digit Unix milliseconds, within the documented ±300,000 ms window;
- `X-Tawsel-Signature`: `v1=` followed by the lowercase SHA-256 hexadecimal signature.

HMAC input is the UTF-8 prefix below, with an LF after each prefix line, immediately followed by the unchanged raw body bytes. Do not add a final newline to the body or reserialize JSON:

```text
UTF8("tawsel-webhook-v1\n" + tenantId + "\n" + recipientIntegrationId + "\n"
     + keyId + "\n" + deliveryTimestamp + "\n") || rawBodyBytes
```

Here `\n` means one LF byte and `||` means byte concatenation; the visual line wrap adds no bytes.

Decode the configured 32-byte signing secret according to the contract and compare fixed-length signatures in constant time. Keep current and still-valid previous key material according to the returned rotation `verifyUntil`; a source bearer token is not the webhook secret. Rotation overlap supports the documented 300–86,400 second range. Old in-flight deliveries may still use the previous endpoint/key identity.

Then validate the current closed `events/sender-event.v1.schema.json`, not only the permissive generic event envelope. Validate nested source/tenant/recipient identity correlations and supported event/payload versions. `progress.snapshot`, `integration.applicationReported` and every other unlisted event are not emitted sender mappings. A generic schema accepting a string does not approve it for business processing.

The sender supports bodies up to 2 MiB while the reference receiver has a smaller 1 MiB default. Proposed ERP receiver/proxy limits must accept documented sender bodies up to 2 MiB, with exact-boundary and oversized tests. Do not copy the mock limit and silently reject valid signed events. Bounded limits protect the parser; they are protocol limits, not arbitrary business-order quotas. [03 delivery protocol; 04:6159 onward; 05:6381–7022 and 8807–9526; 06 signature vector beginning 20434.]

### 10.2 Receipt transaction and response

In one short PostgreSQL transaction, insert immutable scoped event identity, aggregate/sequence, raw bytes/hash, validated payload, key/delivery metadata and receipt time. Unique constraints protect `(tenantId, recipientIntegrationId, eventId)` and the scoped aggregate sequence. The same event with the same immutable body returns the existing acknowledgement; changed content under one ID or another event occupying the same sequence is rejected and investigated. No money or stock is posted in the HTTP handler.

Commit durable receipt before returning exactly the documented acknowledgement shape:

```json
{
  "schemaVersion": "1.0.0",
  "tenantId": "<tenant UUID>",
  "recipientIntegrationId": "<recipient UUID>",
  "eventId": "<event UUID>",
  "acknowledgement": "received"
}
```

Do not use an empty `204`, add `applied: true`, or acknowledge before commit. If commit fails, return a retryable receiver failure. Invalid signature, unsupported event/version, malformed JSON, identity mismatch, payload mismatch and sequence collision follow their documented problem categories. Retain limited diagnostic metadata separately where appropriate; do not put rejected content in the accepted inbox or leak recipient data/secrets in logs.

An authorized replay response can establish the canonical event identity without fabricating a webhook signature. Keep retrieval provenance. A later first actual webhook can bind verified raw delivery bytes to that already-known event; a different semantic event or subsequent changed immutable body cannot replace it. Test webhook-first, replay-first and simultaneous arrival.

## 11. Event allowlist and native effects

All 27 current sender event types are retained below. `payload` references point to feature schemas in 05; the wrapper correlates event type, version, scope and payload. “No direct money/stock” means the event records evidence/readiness only; a later authorized workflow may use that evidence. Dependencies must be satisfied before a business handler advances its applied checkpoint.

| Exact event type | Payload definition | Native projection and effect |
| --- | --- | --- |
| `provisioning.changed` | provisioning `ProvisioningChanged` | Update accepted binding/source revision and synchronization status. No automatic issuer-ready assertion. No direct money/stock. |
| `task.snapshotAccepted` | B2B `ChangedEvent` | Preserve accepted `Task`/snapshot and cycle identity; compare desired revision. No physical handover or charge. |
| `assignment.prepared` | B2B `ChangedEvent` | Prepared assignment/readiness. Goods remain subject to actual handover. |
| `assignment.received` | B2B `ChangedEvent` | Accepted driver receipt evidence; normalize with the source result and update custody once. No visit revenue or company cash receipt. |
| `assignment.withdrawn` | B2B `ChangedEvent` | Accepted withdrawal/lifecycle history; release only native reservations allowed by actual custody. No false physical return. |
| `assignment.reassigned` | B2B `ChangedEvent` | Accepted predeparture driver/assignment revision; use documented receipt assertion. No duplicate handover or commission. |
| `task.urgencyChanged` | B2B `ChangedEvent` | Accepted urgency/source revision display. No physical or financial effect. |
| `dispatch.createdFromReceipt` | B2B `ChangedEvent` | New customer cycle using accepted receipt allocation; preserve stable shipment and old cycle. Do not duplicate prior return receipt. |
| `location.pinConfirmed` | location `ConfirmedEvent` | Confirmed execution pin/location revision and readiness. Keep source address separate; do not reprice or imply arrival. |
| `plan.revisionPublished` | planning `PublishedEvent` | Planning notice/revision/status; not an ERP instruction to optimize or fetch a human-only plan. Notice does not contain full ETA/route geometry. |
| `round.started` | round-start `StartedEvent` | Driver/round/workday and initial task identity. No visit charge, remittance or goods return. |
| `current.headingSelected` | current-activity `HeadingEvent` | Heading/paused evidence for the attempt. Not arrival and not a fee trigger. |
| `current.arrivalRecorded` | current-activity `ArrivalEvent` | Accepted actual-arrival evidence. Feed the unique visit fact described in section 12; preserve source uncertainty/time. |
| `outcome.recorded` | outcomes `Event` containing `Record` | Accepted delivered/held quantities and reported collection, one effective revision per attempt. Update execution/custody and pending financial basis; no company receipt. |
| `task.deferred` | eligibility `Event` | Deferral state and earliest time. No fee merely for a telephone postponement. |
| `task.retryAdmitted` | eligibility `Event` | Record `previousAttemptId` and new `attemptId`. A retry request is not another actual visit or new receipt. |
| `task.deferredActivated` | eligibility `Event` | Eligibility/activity transition; retain its attempt/cycle and source revisions. No automatic fee. |
| `task.driverUrgencyChanged` | eligibility `Event` | Driver's accepted urgency decision, distinct from ERP source snapshot revision. No direct money/stock. |
| `round.ended` | workday-closure `Event` | Round boundary/evidence for remittance preparation. Does not prove all events arrived, money was remitted or returns received. |
| `workday.ended` | workday-closure `Event` | Workday closure and applicable correction boundary; not payroll closure or settlement. |
| `return.requested` | returns `RequestedEvent` | Proposed return request/items; no branch receipt. |
| `return.subsetReceived` | returns `ReceivedEvent` | Accepted `received` transition; native custody/stock only once and with condition policy. |
| `return.dispositionRecorded` | returns `DispositionEvent` | Accepted lost/damaged custody transition; link incident review. Do not automatically pay compensation or restock. |
| `branch.roundInterrupted` | branch-activity `Event` | Tawsel source-branch service interruption in a customer round. No internal ERP transfer identity is inferred. |
| `branch.arrivalRecorded` | branch-activity `Event` | Arrival at the documented source-branch stop; not actual item receipt and not a customer-visit fee. |
| `branch.roundResumed` | branch-activity `Event` | Resumed execution after allowed branch workflow; no implied all-returns-clear or internal transport completion. |
| `outcome.corrected` | corrections `Event` | Preserve previous outcome and correction chain; update the effective execution projection once. Any conflict with posted money enters explicit settlement review. |

These `$defs` references match the pinned sender mapping. Sources: sender map 04:141–173; closed wrapper 05:6381–7022; feature blocks indexed in the coverage ledger. No receiver switch may silently accept an unknown event with a generic “success” default.

## 12. Money, arrival evidence and employee earnings

### 12.1 Three distinct money layers

1. **Recipient obligation and report:** exact current Tawsel snapshot and effective `Record.collection`. Fields `reported`, `goods`, `shipping`, `unpaidShipping` and `shippingStatus` retain their execution meaning. `reported: null` differs from an explicit zero monetary report.
2. **ERP commercial entitlement and earning:** delivered-goods credit, earned visit tariff, unpaid-brand liability, compensation and employee commission, with native business identities and agreed formulas.
3. **Actual company receipt/payout:** staff-confirmed cash/bank/InstaPay remittance, then authorized brand payout or employee payroll. Event receipt and outcome acceptance perform neither physical financial transaction.

Goods 100 + 150 and shipping 50 produce recipient report 300, company earned shipping 50 and brand goods entitlement 250. The brand's ordinary goods entitlement waits for actual full remittance; shipping must not be deducted again. On a refused visit with shipping paid, company earning is 50 and no duplicate -50 brand debit is added. Under the normal payer rules, an actual visit with no recipient payment makes the unpaid agreed visit fee a brand debit. The approved company-funded replacement exception below leaves that replacement's brand shipping liability zero. Storage is separately paid and does not enter this snapshot.

The standard company tariff is base shipping plus the captured fixed packing increment on **each eligible actual visit** (ERP-D-194), qualified by ERP-D-203's explicit company-funded replacement shipping waiver. That incident-linked waiver offsets the standard replacement-visit shipping charge, so recipient shipping0, brand shipping liability0 and net shipping revenue0. Preserve the standard tariff and waiver as separate native records; this is not an ordinary paid expense. Actual goods outstanding and delivered-goods credit/remittance rules continue independently.

A percentage driver commission applies only to the normal captured base shipping; a fixed per-visit commission uses its captured employee agreement. Both remain normal for the approved company-funded replacement visit despite its zero net shipping revenue, and neither waits for the brand to pay. Employee-funded replacement shipping is not selected. Internal branch transport generates neither tariff nor ordinary visit commission.

Under ERP-D-200, consume reserved brand shipping cover into the actual earned brand fee once; release unused cover after a truthful return without an earned visit or an authorized predeparture removal of the exposure. Do not reserve unlimited possible future attempts. An unexpected fee legitimately earned after dispatch still posts even if it creates debt; the credit option cannot erase Tawsel execution facts or remotely stop its driver. A later changed payer/waiver before departure must reconcile native exposure and the accepted source snapshot through the ordinary supported revision workflow.

ERP-D-201 / ERP-R-210 recognize the complete fixed storage-period fee in its start month, independently of actual payment. ERP-D-204 / ERP-R-213 allow partial and advance storage receipts; unallocated advance credit is neither revenue nor brand-payout eligibility and does not require a Tawsel command. ERP-D-202 / ERP-R-211 distinguish salary-earning deductions, which reduce employee cost, from advance recovery, which does not; incident recovery counts once. These native classifications must survive integration-fed commission and late correction processing without changing the original Tawsel money report.

### 12.2 Evidence and unique visit identity

Proposed visit key: company/source scope + `taskId` + `dispatchCycleId` + `attemptId`. Store accepted arrival `actionId`, driver, round, source branch, observation/recorded times and provenance. The same `current.arrivalRecorded`, embedded accepted outcome arrival, history read or replay must resolve to one evidence record. Heading/navigation, branch arrival, retry admission, `no-answer` by itself or a browser click do not establish customer arrival.

`outcomes.Record.arrival` is nullable. Current company no-answer explicitly has `reported: null`, zero shipping/unpaid shipping and `shippingStatus: "not-attempted"`. Under normal payer rules, ERP records a brand shipping debit and company earned visit charge when separate accepted arrival evidence proves the commercial trigger; it must retain those Tawsel values unchanged. For an explicitly approved company-funded replacement, apply its retained tariff/waiver instead: no recipient or brand shipping, net shipping revenue zero and normal driver commission. Missing evidence stays “awaiting visit evidence,” not zero-cost certainty or a fabricated arrival. CHECK-001 needs the full real arrival→no-answer→delayed/replay acceptance demonstration.

For the same physical attempt, a correction changing delivered quantities does not create another visit. `task.retryWhole` supplies a distinct attempt; only that attempt's own accepted arrival can earn a second visit. Another receipt-funded cycle is likewise a separate execution identity, not automatic proof of a second visit. Repeated visits may belong to different drivers; use the driver on the visit and its explicit employee mapping. Unlinked/ambiguous mapping queues the earning for review instead of silently dropping it or assigning by name.

The complete snapshot tariff and source branch are retained with each visit; later tariff/employee-rate edits cannot reprice old earnings silently. If evidence conflicts or lacks the source snapshot required to calculate money, hold the affected earning until resolved. Historical corrections use linked compensating financial entries according to native period rules, never mutation of an already paid payroll record.

### 12.3 Full round remittance and its evidence witness — proposal

After each accepted round end, prepare a remittance review using the effective reported recipient money for the driver/round. Keep a **local evidence witness**: known task/cycle/attempt identities, effective outcome IDs/revisions, authoritative round end, fetched source-filtered history/snapshot identity and revision, relevant stream checkpoints, unresolved gaps/conflicts and the calculated total. This is an ERP record of exactly what was checked, not a new Tawsel API or a promise that no unseen device fact exists.

Before confirming, refresh authorized round/workday/task evidence using bounded stable pagination; resolve known missing events/dependencies and effective correction chains. `409` during pagination restarts the read under a consistent snapshot. A quiet webhook queue, a `round.ended` event or one projection page is insufficient evidence of completeness. Tawsel monitoring is explicitly received-evidence-only and does not publish device-contact/future-action guarantees. Do not call human sync endpoints to attempt to manufacture such a guarantee.

Lock the native remittance basis/version and relevant financial rows when staff confirm the actual full receipt. Require components in the selected methods/accounts to sum exactly to the expected total; no partial/short remittance, automatic employee shortage deduction or new personal-top-up workflow. Confirmed receipt posts funds and releases its mapped ordinary goods credits once. A zero-recipient-money round has no fictitious cash receipt and no nonexistent remittance gate.

Known gaps/conflicts block the affected round confirmation or entitlement only. Unrelated brands/rounds continue. If a later accepted correction changes the basis after remittance/payout, preserve actual cash and past postings, create one linked review item and hold only newly affected payout eligibility until an authorized settlement resolves the difference. Do not auto-refund a recipient, withdraw cash, edit Tawsel money, reverse an already paid brand amount or freeze the whole company.

The exact sufficiency of this received-evidence witness for the real round-close/remittance workflow must be demonstrated with Tawsel before claiming complete integration closure (IP-GAP-004). The design deliberately supports later corrections; it does not assert distributed financial finality that the contract does not provide.

## 13. Projection transactions and ordering — proposed ERP design

One event stream is scoped by `(tenantId, recipientIntegrationId, aggregate.type, aggregate.id)`. Recipient sequences start at one and preserve order within that recipient aggregate. They are neither global company sequence numbers nor proof that another aggregate's prerequisites already arrived.

Persist a stream row with `receivedThrough` (contiguous received prefix), `receivedHigh` (highest received sequence), `appliedThrough` (contiguous processed events), `snapshotThrough` (accepted reconciliation coverage), `projectedThrough` (current-state coverage), and `historyComplete`. Use the contract definitions when reporting these values; do not set them all to the same maximum.

The worker locks/claims the stream, validates the next applicable sequence/dependencies, inserts immutable native fact/history, updates the relevant current projection and any permitted domain posting, and marks processing/checkpoint in one transaction. Unique native fact identities protect effects even if the same fact is obtained through command results, event envelopes, replay, history and snapshot recovery. Failed transactions leave no applied marker. Retry after restart resumes from committed state.

Cross-stream prerequisites include provisioned branch/driver mapping, accepted snapshot/cycle, attempt identity, previous outcome revision, return request/item, receipt transition and employee link. An early return/correction is held with its reason and authorized targeted recovery; it does not become an orphan stock credit. Lower revisions never overwrite later effective state. Original facts remain visible when superseded.

A source result may prove that its own command committed before its event is delivered. Normalize that fact for the relevant native workflow, but do not invent an event row/sequence or advance event checkpoints. Conversely, an event can resolve an unknown command if authoritative action/resource identity matches; persist that evidence without assuming a random similar task update proves the command.

## 14. Replay, snapshots and incomplete history

1. Keep a registry of known streams from accepted source results, scoped task listings and received/replayed events. There is no documented general all-tenant stream-discovery service in this plan. A stream the ERP has never learned about is not proven absent.
2. On a known gap, call `integration.replayEvents` with exact `aggregateType`, `aggregateId`, `afterSequence` and bounded limit. Validate identity/schema and deduplicate each event. Follow `nextAfterSequence`; do not skip to the largest seen sequence.
3. Normal retained replay is not a 30-day purge policy. A `410 replay_expired` represents unavailable required history and requires explicit handling. A retryable `503` is not a complete empty stream.
4. Fetch `integration.getReconciliationSnapshot` only for the scoped aggregate needing recovery. Its `history: "current-state-only"` can restore a current projection through a reported sequence; it cannot manufacture the missing event chain, individual visits, cash receipts or complete financial history.
5. Apply a newer compatible snapshot transactionally, preserving raw snapshot/provenance and prior history. Update current projection coverage separately from received/applied history. Do not jump `receivedThrough` or `appliedThrough` over missing events merely because `projectedThrough` advanced.
6. The captured P26 return snapshot illustrates an important merge rule: `state.returnRequest` retains the original request representation, while `state.returnItems` contains accumulated current received/disposed balances. Rehydrate request identity from the request; use current return-item state for balances. Do not overwrite a received quantity with the earlier request's zero received value.
7. Late historical events at/below snapshot coverage still require identity validation and history processing, with business-fact deduplication. They must not re-add current stock or money already represented. Recover missing original financial detail before finalizing dependent money; current totals cannot invent per-attempt charges.
8. Report applied checkpoints only from committed ERP counters through a durable source command. Reports are `receiver-reported`. A sender delivery marked received retains `projectionStatus: unknown`; delivery status does not certify ERP accounting.

Snapshots are bounded. Current source limits include bounded newly scanned events, attempts/items/notice sets; an oversized or unavailable reconstruction may return `503`. The ERP must present incomplete recovery and a support task, retaining last confirmed state. It must not convert a partial response into “fully synchronized.” [04:5982–6158; 05:2765–3287; 06:18389 onward P26.]

## 15. Monitoring and daily user experience

Use source-service monitoring paths, with their source filtering, `scopeKey`, `snapshotRevision`, cursor and freshness. For `304`, retain the previous response body and update valid refresh metadata. A `404` may hide a resource outside scope; it is not permission to delete native history. A changed-page `409` restarts the complete authorized pagination. `401`/`403` stops access, and a stale cached page must still respect current native permissions. Network failure retains last confirmed values with visible age/uncertainty.

`freshness.receivedEvidenceOnly` is true, `deviceContactAt` is null, and integration delivery is unavailable in monitoring. Do not label a driver “offline,” show inferred GPS, expose counts belonging to another source, or promise live availability from that data. The captured `monitoring-own` human view contains additional-source data that the service-scoped view intentionally omits; never use it as the source account's expected shape/content.

The ERP shipment timeline combines native registration/preparation/transfers/receipts with accepted Tawsel execution events. Label the origin, branch/custodian, observed/recorded time and any pending confirmation. Read-only company-wide tracking shows a full available journey without enabling out-of-scope mutations. Do not fabricate a percentage or predicted delivery date merely to imitate the reference image. The approved visual language is applied through the screen specification.

Ordinary users see actionable states: waiting for routing-system confirmation, input rejected with a reason, ready to hand over, waiting for actual return, received with condition pending, or review required. Support details reveal action/event IDs, expected/current revision, retry history and checkpoint gaps on a separate detail screen. A primary retry action reuses the existing identity. Resolve-input creates a reviewed new intent only after the earlier outcome is known.

The integration operations page exposes durable source queue, event receipt/application, known sequence gaps, failed identity sync, signing configuration/expiry, reconciliation age and affected business actions. It does not offer “force success,” “mark all received,” “apply payment” or arbitrary JSON editing. Native Settlements remains the authorized place for legitimate commercial corrections; it cannot override physical or Tawsel execution truth.

## 16. Corrections and the requested reason extension

Current Tawsel supports a bounded human `outcome.correct` flow. It retains previous outcome/revision and may replace effective delivered quantities/reported collection under current authority and lifecycle. Price editing is forbidden. Dependent receipt/disposition/redispatch and workday closure can deny a correction; the source-service connector cannot bypass those checks. ERP projections must consume both `outcome.recorded` and `outcome.corrected`, including compatible adopted evidence represented in the correction chain. `evidence.adoptionResolved` appears in feature examples but is not one of the 27 current sender events; do not invent a subscription for it.

When correction arrives before its predecessor, retain it awaiting ordered identity/history recovery. When it arrives after financial posting, retain original accounting entries and generate the linked review in section 12. A refused→partial/full correction is not an automatic refund or additional physical receipt. Existing native stock effects constrained by accepted receipt/disposition cannot be silently rewritten by changing an outcome display.

**TAWSEL-CR-001 is confirmed and remains required for the approved reasons feature.** Current `outcomes.Refusal`, `outcomes.Partial`, accepted `Record` and `corrections.Replacement` are closed and do not include the requested coded reason. The owner selected fixed product reasons, the same set for the rejected portion of partial delivery and mandatory Other detail. Missing pieces is a reason/discrepancy, not automatic company loss. No-answer-after-arrival retains the existing distinct `no-answer` outcome plus real arrival evidence.

The future Tawsel handoff must specify exact enum/field names, scope/granularity, required/optional rules, Other detail bounds, historical/older-client compatibility, driver UI/human commands, durable results, correction history, sender mapping, history/replay/reconciliation and positive/negative cases. A static shared versioned code list may suffice; no generic catalog-management endpoint or service impersonation is presumed. Keep the single consolidated request in [TAWSEL-CHANGE-REQUESTS.md](TAWSEL-CHANGE-REQUESTS.md); this plan does not pretend those future fields already exist.

## 17. Acceptance and manual verification plan

These are **required future checks, not tests already run**. Every resulting implementation phase must select its relevant rows, run connected Vitest behavior tests and state its actual result. Real PostgreSQL tests are mandatory for claims about transactions, contention, restart durability, unique effects and lease fencing. Browser/manual checks cover visible operations; mocks alone do not prove a real connector.

| ID | Scenario and meaningful acceptance | Verification / owner demonstration |
| --- | --- | --- |
| IP-AC-01 | Provision source/branch/user/driver; pending issuer is not ready; stale/conflicting/cross-source changes fail; lost response does not create a second identity. | Schema fixtures + real Tawsel setup. Stop response after acceptance, retry and show one binding/history. |
| IP-AC-02 | Create goods100+150/shipping50 snapshot; exact totals accepted. Goods prepaid to brand gives unitDue0 with shipping still due; goods and shipping prepaid gives explicit zero outstanding goods/shipping. Invalid currency, unsafe/fractional amounts, extra fields or unsupported allocation fail. | Vitest fixture/serializer tests + actual accepted/rejected HTTP cases; show recipient due and retained commercial price separately. |
| IP-AC-03 | Prepare then physically receive a batch. A 49+2 capacity case rejects atomically. Stale/disabled driver or departed edit fails. Planning failure does not undo accepted custody. | Real Tawsel + PostgreSQL + browser; compare both systems and branch/driver custody. |
| IP-AC-04 | Kill worker before send, after server commit and before local acknowledgement. Same action recovers once; competing stock/assignment actions cannot double-spend goods. | Real database process-restart/lease fencing tests; manual pending→accepted recovery with original action ID. |
| IP-AC-05 | Compute the supplied signature vector; raw-byte/UTF-8 changes, bad timestamp, wrong tenant/key, duplicate security headers and unsupported sender payload fail. Test 2 MiB boundary. | Vitest cryptographic/schema tests + actual signed callback through intended proxy. No accepted inbox row on rejection. |
| IP-AC-06 | Simultaneous identical callbacks, response loss after inbox commit, changed body under same ID and stream sequence collision. | Real PostgreSQL concurrency tests; exactly one inbox identity and one eventual business effect, repeat acknowledgement only for identical event. |
| IP-AC-07 | Deliver sequence3 before1/2, correction before outcome and return before its dependent task. | Connected handler tests + real DB; pending reasons visible, applied prefix advances only after dependencies, no premature cash/stock. |
| IP-AC-08 | Under normal payer rules, accepted customer arrival→no-answer with zero canonical collection; replay duplicates; phone postpone without arrival; distinct later attempt/driver arrival. | Actual Tawsel human flow + ERP projections. First real visit earns one full tariff and one commission, no fake collection; phone postpone earns none; later real visit earns once. Company-funded replacement waiver is verified separately in IP-AC-22. |
| IP-AC-09 | Partial delivery reports exact delivered goods and remaining custody; correction before receipt; correction after dependent receipt is denied. | Real Tawsel + fixture tests; original/effective history preserved and no duplicate visit fee or stock. |
| IP-AC-10 | Return offer creates no stock. Receive actual subset once through result/event/replay. Wrong branch, excess, stale revision, fraction and duplicate item fail. Race receipt against disposition/redispatch. | Real two-system + PostgreSQL tests; demonstrate conservation and usable/suspect condition split. |
| IP-AC-11 | Redispatch actually received unallocated pieces; reject unavailable/lost/damaged/already allocated quantities. Preserve old cycle and explicit fresh outstanding prices. | Real Tawsel same-branch scenario; CHECK-003 A→B acceptance remains separately required before claiming that feature. |
| IP-AC-12 | End round, expose a known missing outcome, then recover and remit full total using800 cash+200 InstaPay. 999 against1000 fails with no posting. Duplicate submit does not double funds/eligibility. | Browser + real DB; show witness, complete receipt and affected brand release. Round end alone never posts funds. |
| IP-AC-13 | Correct accepted money after remittance or payout. | Real correction feed + native settlement review: preserve original receipt/payout, one linked review, affected eligibility hold only, no automatic refund/debit to cash. |
| IP-AC-14 | Current snapshot after missing history, late earlier events, P26 original returnRequest versus accumulated returnItems, duplicate replay/webhook. | Real DB + fixture tests; current state never regresses/doubles, missing history remains visible, financial history is not invented. |
| IP-AC-15 | Monitoring service scope, 304 cache, 409 pagination restart, 404 hidden resource, 503 outage. | Actual service reads + browser; no cross-source counts, live presence/GPS claims or deletion on 404. |
| IP-AC-16 | ERP-only transfer selects active-round carrier, actual source handover/destination receipt and multi-branch staff permissions. | Browser + real DB; no Tawsel transport command, stock once at destination, no customer charge/commission. |
| IP-AC-17 | Driver-to-employee link absent/ambiguous/changed prospectively. | Vitest + real DB; pending earning stays visible, accepted historical earning retains original employee/rate, no name match. |
| IP-AC-18 | New reason extension: refusal/partial/Other, unknown/legacy reason, correction, replay and rejected service impersonation. | Requires reviewed new Tawsel baseline and real human flow; current baseline cannot pass the requested feature. |
| IP-AC-19 | Rotate signing/service credentials while an old delivery or command attempt is in flight; expiry and disabled source. | Controlled real configuration exercise; valid overlap works, expired credentials fail, no secrets in UI/logs. |
| IP-AC-20 | Restore ERP database and queue/inbox state from backup, then replay/resent HTTP under original identities. | Isolated restore rehearsal; no repeated stock, remittance, visit, commission or payout effects. No production deployment is authorized by this test plan. |
| IP-AC-21 | Nonnegative brand has eligible wallet100 and pending unremitted goods500; compete a payout with a handover requiring known brand-paid shipping60. Separately try handover with only the pending500. | Real PostgreSQL race tests + browser: payout and cover cannot both spend the same balance; pending goods never provide cover; reservation/consumption/release count once. Normal recipient-funded shipping and company-waived shipping have no invented full-tariff reservation. Existing debt still blocks the applicable new handover. |
| IP-AC-22 | Incident-linked company-funded replacement has actual goods due250 and normal shipping50; driver records actual arrival and full delivery. Retry delivery of its result/event and contrast a separate goods-prepaid replacement. | Contract/real Tawsel + native ledger tests: first snapshot goods250/shipping0/total250; actual delivered-goods report/remittance unchanged; tariff50/waiver50/net shipping0; no brand shipping debit and normal driver commission. Goods become zero only from the separate prepaid fact. No employee-funded payer or unsupported wire property. |
| IP-AC-23 | Storage period Jan20–Feb19 fee310 receives100 now or advance500 before start; employee salary6000 has salary deduction200 and advance recovery1000 alongside integration-fed commission. | Connected native domain tests, referencing the domain acceptance cases: storage revenue310 entirely at Jan20, actual receipts/remaining credit separate; salary cost5800 and salary payout4800 before separate commission. No extra Tawsel operation, duplicate commission, cash receipt or profit effect. |

Manual scripts in later phases must give exact setup records, clicks, expected visible numbers/statuses, failure injection and cleanup. A final acceptance report names actual runtime/baseline, timestamps, commands run, results and limitations; successful mocked tests cannot be presented as two-system acceptance.

## 18. Remaining dependencies and closure conditions

| Gap ID | Type / exact remaining issue | Effect and next evidence |
| --- | --- | --- |
| IP-GAP-001 | **Confirmed contract extension:** TAWSEL-CR-001 driver reasons in refusal/partial/correction/history. | Blocks claiming the agreed reasons feature works on the pinned baseline. Produce/review the single Tawsel change handoff, receive an updated versioned contract/fixtures and run IP-AC-18. No invented current fields. |
| IP-GAP-002 | **Unresolved contract semantics:** TAWSEL-CHECK-003 accepted-source branch change and A-receipt→B-customer-cycle compatibility. | Blocks unconditional closure of that cross-branch customer-dispatch mapping. Exact required positive/negative/public sequence is in section8. ERP-only transfer and first-ever snapshot at actual branch remain independently designable. |
| IP-GAP-003 | **Engineering acceptance:** TAWSEL-CHECK-001 actual-arrival evidence through no-answer/retry/correction/replay and fee identity. | Existing fields support the design, but no complete runtime journey was demonstrated. Run IP-AC-08/09 with nullable arrival and delayed facts; do not request a redundant endpoint merely because acceptance is pending. |
| IP-GAP-004 | **Financial integration acceptance/design boundary:** sufficient received-evidence witness at round remittance, including stable complete pagination, corrections and known gaps. | Proposed witness/holds are section12.3. Demonstrate the real round-end→source history→effective collection workflow and document its lack of unseen-device guarantees. If exact service read semantics are insufficient, request that precise contract clarification; never claim global finality. |
| IP-GAP-005 | **Specific fixture/conformance evidence:** supplied selected service HTTP, schemas, dependencies and applicable success/rejection examples have been read. The catalog has no dedicated captured ConfigureWebhookCommand/RotateSigningKeyCommand/RetryDeliveryCommand examples or one signed positive/negative fixture for every one of the27 sender variants. | Coverage ledger section6 names these limits precisely. Build conformance cases from the read closed definitions and exercise actual scoped reads, command results and signatures. This is not an unread-source blocker or a request for an invented endpoint; no runtime or universal per-variant fixture coverage is claimed. |
| IP-GAP-006 | **Deployment proof:** public callback, issuer/service setup, body limits, key rollover, database restart/restore and real two-way environment. | Complete setup/conformance evidence under architecture/operations plan. Same-host and separate-host configurations must obey the same public authority boundary. |

IP-GAP-001 and IP-GAP-002 are material to unconditional approval of the complete requested integration scope. The owner may review the master plan with these explicitly named dependencies; their presence must not be hidden by marking the integration complete or producing execution prompts that expect nonexistent behavior. IP-GAP-003 through006 distinguish planned engineering evidence from current contract absence. CHECK-002 remains closed for the excluded earlier-recipient-payment scenario; TAWSEL-CR-002 transport execution remains unselected.

## 19. Change control and handoff rules

Retain the pinned package unchanged. A supplied Tawsel update gets its own baseline identity and a reviewed diff of selected commands, events, authority, fields, error/recovery behavior and examples. Update mapping, coverage, change log and affected acceptance cases together. Existing local data migration/replay compatibility must be specified before adopting new versions. Do not infer compatibility from a package version or silently accept extra payload fields on an old closed schema.

There is no automatic repository monitoring/synchronization promise. A future execution agent reads this plan, the approved master/domain/screen/architecture documents, decisions, relevant pinned schema/HTTP/fixture sections and the consolidated change register. It implements only its later approved phase. It must record tests actually run, unresolved external dependencies and exact observed results, and stop at that phase's boundary.
