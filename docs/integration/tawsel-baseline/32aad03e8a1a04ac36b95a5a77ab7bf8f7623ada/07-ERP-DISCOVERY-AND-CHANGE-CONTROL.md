# ERP discovery and controlled Tawsel updates

This is a planning method and question map, not an approved ERP feature list. The user wants rounds of questions, explicit decisions, a complete master plan and then independently executable Codex phase prompts. Do not skip discovery because the connector already has contracts.

## Discover the ERP business itself

Ask according to the user's initial ideas and earlier answers. These areas are prompts for coverage; include/defer/exclude each explicitly rather than implementing all of them automatically.

| Area | Decisions to discover |
| --- | --- |
| Company and product | One company or multiple tenants? Branches/regions? Internal employees, merchants, customers or public portal? Countries/currencies? Current pain and V1 success criteria? |
| Commercial shipment lifecycle | Who creates orders/shipments? Order-to-shipment relationship, identifiers/labels, pickup, warehousing, sorting, branch transfer, last mile, failed delivery, return and cancellation? Which steps are actually needed? |
| Pricing and payments | Merchant contracts, shipping charges, discounts, prepaid/COD allocation, partial delivery policy, taxes/invoicing if needed, who pays refusal/return fees? Keep ERP policy separate from supported Tawsel snapshot inputs. |
| Finance and settlement | What cash is reported, physically handed in, approved, disputed or settled? Merchant receivables/payables, driver balances, refunds, accounting export versus ledger? Authorization and correction trails? |
| Custody and stock | Parcels versus owned inventory, branch/driver handover, actual counting, damage/loss, disputed balance, inventory availability and redispatch eligibility? |
| Roles and controls | Owner/admin/branch staff/cashier/dispatcher/driver/merchant responsibilities; branch visibility; approvals; audit; disable/reassignment; action actor identity in ERP and service identity at Tawsel? |
| Customer/contact data | Source of truth, address verification, pin correction flow, editing after dispatch, duplicate detection without accidental shipment merging, data retention/import/export? |
| Integration experience | Native ERP actions that queue commands, pending/error/review UI, retry ownership, source/event lag, support tools, conflict resolution, key rotation and recovery ownership? |
| Reporting | Operational vs commercial vs cash reports, business-day definitions, effective corrections, shipment/attempt/piece denominators, exports and permissions? |
| UX and design | Most frequent tasks per role, one main action, pending/empty/error states, search/scanning, keyboard/mobile, Arabic/RTL, reference layout and accessible modals/pages? |
| Technical choices | Stack, repository separation, supported service boundary, database/transactions, auth/issuer administration, deployment/hosting, observability, background jobs and external services? |
| Operating scale | Real initial/expected shipment volume, concurrent staff/drivers, event size, availability target, recovery objective, pilot/load evidence and affordability? |
| Implementation/pilot | V1 exclusions, seed/demo scenarios, real data migration, owner manual checks, rollout/rollback, accepted operational risk and support responsibilities? |

Ask roughly 5–8 related questions per round, fewer for complex questions. Give recommendations with a brief tradeoff when helpful. Record which option “your recommendation” refers to. Do not reopen fixed Tawsel behavior as an unrestricted ERP preference; if a new need conflicts, create a Tawsel change request and assess impact.

## Durable planning records

Maintain independently understandable records that can be saved outside chat:

- `ERP-DISCOVERY-LOG.md`: question IDs, answers and short context, including decisions replaced later.
- `ERP-DECISIONS.md`: ID, approved rule, owner/scope, reason, related requirement IDs, superseded decision and unresolved conditions.
- `ERP-OPEN-QUESTIONS.md`: ID, unknown, why it matters, options, which decisions/phases depend on it and whether it blocks V1.
- `master-plan.md`: agreed scope, personas/journeys, authority, entities/state machines, transaction/concurrency boundaries, integration, UX, architecture, rollout and acceptance.
- `ERP-TAWSEL-INTEGRATION-PLAN.md`: field/state mapping, selected actual service operations/events, source authorization, callbacks, persistence/recovery, errors and public-only proof.
- `REQUIREMENTS-TRACEABILITY.md`: every agreed requirement/decision → phase/checkpoint → acceptance scenario → automated/manual evidence. Separate planned verification from executed evidence.
- `phases/README.md` and individual phase prompts: dependency order, concrete outputs, exact inputs and stopping points. Do not copy Tawsel's 42 phases or choose an arbitrary phase count.
- `IMPLEMENTATION-STATUS.md`: later Codex execution results, changes, commands, evidence and genuine blockers.

Model/effort selection belongs in each eventual phase prompt. Verify the models actually available to the owner at that time; do not freeze obsolete names or pretend a prompt can change the picker. Complex identity, transaction, reconciliation and finance work warrants a reasoned recommendation and stronger checks. This is not a guarantee of correctness.

## Integration must be distributed through the ERP plan

Mapping/IDs and accepted-snapshot ownership affect the core data model. Native authorization/audit affect administration. Source transactions/outbox affect every integrated write. Inbox/projection/replay affect status/reporting. Return receipt affects inventory and redispatch. Collection corrections affect finance inputs. Recovery and versioning affect operations. These responsibilities need implementation owners and acceptance criteria at the relevant phases, not one unspecified final “connect Tawsel” phase.

Split large work into demonstrable vertical outcomes with dependency checks. Include the agreed domain/UI/service/data changes for that outcome and relevant connected tests. Each phase must carry enough context for an agent without chat history, while naming canonical plan files as durable references. A phase should not duplicate the entire plan or invent implementation details before decisions exist. Generate complete phase files in batches if necessary; never replace late phases with one-line summaries.

## Pin this baseline before starting

Create `TAWSEL-BASELINE.md` in the eventual ERP project with:

```text
Baseline ID: derive from the attached contract source commit
Source commit: copy the full source commit printed in attachment 04
Snapshot date: copy the package preparation date
Package kind: ERP planning reference for the existing Tawsel system
Manifest: planning-manifest.json (retain with the local ERP planning files)
Schema/envelope/payload versions: use the included canonical definitions
Client package version at source: copy from the manifest (not sufficient alone for compatibility)
Selected operations/events: record exact IDs and schema references when agreed
Known limitations/dependencies: reference 01 and each ERP decision affected
```

Keep the downloaded/attached baseline unchanged while planning. Don't mix a newer OpenAPI with older schemas/examples or silently point “latest” at a different revision. The package manifest identifies source files and attachments by SHA-256; it does not certify production readiness.

## When Tawsel changes after ERP planning starts

There is no automatic synchronization between chats. Use this explicit workflow:

1. **Tawsel implementer** identifies the new commit and changed public artifacts, validates contracts/examples/client, and provides old/new behavior plus evidence. A UI-only change may have no connector impact; an enum, auth, retention or error change may matter even if package version stayed the same.
2. **ERP planner/maintainer** compares against the pinned baseline, classifies compatibility and identifies affected decisions, data mappings, handlers, UI, tests and phases. Unaffected work continues; only dependent work waits on a material unresolved change.
3. **Owner** decides any new business/product choice. Technical mapping updates that preserve approved policy are documented; do not manufacture a new approval round for every typo.
4. Apply the accepted update to master plan, integration plan, decision/requirement records and the actual affected phase prompts. If a phase has already shipped, create a concrete migration/fix phase with regression evidence; never merely edit its old prompt and call implementation updated.
5. After affected conformance checks pass, advance the ERP baseline and archive the old baseline/delta. Keep unsupported or pending changes visible until delivered.

Use an `INTEGRATION-CHANGELOG.md` entry with this shape:

| Field | Required content |
| --- | --- |
| Change ID/date | Stable integration change identifier |
| Old/new source identity | Full commits, manifest hashes and actual version changes |
| Contract difference | Operations/events/fields/auth/status/error/retention semantics affected |
| Compatibility | Additive-compatible, reader change required, migration required or incompatible; with reason |
| ERP impact | Requirement/decision IDs, mappings, modules, UI, tests and exact phase files |
| Implementation state | Planned only, in progress or already implemented; required repair/migration |
| Decision and owner | Accepted choice, unresolved question and responsible maintainer |
| Evidence | Actual validation/regression/conformance results; unavailable checks remain explicit |
| Baseline result | Adopted or still pinned to old version, and why |

### Copyable message when providing a future update to the planning chat

> أنا أرفقت تحديثًا لـTawsel بعد baseline الموجود في `TAWSEL-BASELINE.md`. قارن العقود والسلوك القديم والجديد، وسجل ما تغير فعليًا وحدود أدلة التحقق. حدد أثره على قرارات ومتطلبات ومراحل الـERP قبل التعديل. حدّث الأجزاء المتأثرة من master plan وخطة الربط والـphase prompts وسجل التغييرات؛ لو جزء اتنفذ بالفعل حدد migration/fix واختبارات لازمة. اسألني فقط عن قرار تجاري جديد أو تعارض يحتاج اختياري. لا تغيّر الأجزاء غير المتأثرة، ولا تدّعِ أن تعديل البلان عدّل الكود، ولا تعتمد baseline الجديد قبل حسم الاعتماديات والتحقق المناسب.

## Closing discovery and plan review

Before finalizing the plan, reconcile all answers with requirements and integration behavior, identify explicit exclusions and any unresolved launch-critical questions, and walk through realistic end-to-end success/failure examples. Before finalizing phases, verify every included requirement has an implementation owner and acceptance evidence plan, each dependency produces the artifact consumed next, and the final ERP can demonstrate the public integration independently. The user reviews the master plan before phase production. Production deployment remains a distinct readiness decision.
