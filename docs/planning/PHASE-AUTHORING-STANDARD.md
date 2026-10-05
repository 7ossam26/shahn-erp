# ERP Phase Authoring Standard

Current authority, session025 (2026-10-03): ERP-D-205 / ERP-R-214 approve PLAN-001 and authorize phase authoring. Detailed plan mechanics below are adopted; original proposal/review wording is retained as drafting provenance, not a renewed approval gate. External contract gaps, unverified runtime targets and the unnamed palette remain explicitly limited. No production implementation is authorized by this authoring turn.

Status: adopted authoring standard, applied to PHASES-001 in session025, 2026-10-03. This document defines how to write the implementation phases **after approval of `master-plan.md`**. It is not an implementation phase, an instruction to start development, a phase count, or approval to deploy.

## 1. Authority and purpose

The owner needs independent prompts that a new Codex agent can execute without this conversation. Each phase must deliver a usable, inspectable result with truthful verification. The approved product scope, current decisions, public Tawsel contracts and reviewed UI direction must remain consistent from the first phase to the last.

Read these sources when authoring the phase set:

- [Master plan](../../master-plan.md).
- [Decision register](../../ERP-DECISIONS.md), [requirement register](../../ERP-DISCOVERY-LOG.md), [open questions](../../ERP-OPEN-QUESTIONS.md) and [traceability](../../REQUIREMENTS-TRACEABILITY.md).
- [Domain specification](ERP-DOMAIN-SPEC.md), [data and transactions](ERP-DATA-AND-TRANSACTIONS.md), [architecture and operations](ERP-ARCHITECTURE-AND-OPERATIONS.md), and [screen specification](ERP-SCREEN-SPEC.md).
- [Integration plan](../../ERP-TAWSEL-INTEGRATION-PLAN.md), [contract coverage](INTEGRATION-CONTRACT-COVERAGE.md), [Tawsel baseline](../../TAWSEL-BASELINE.md), and [integration change log](../../INTEGRATION-CHANGELOG.md).
- The retained authoritative Tawsel contract excerpts and exact applicable schemas, examples and failure cases identified by the integration plan. A table of contents is not evidence of reading a definition.
- [UI review log](../../UI-REVIEW-LOG.md), the accepted UI-REV-001 artifact, and relevant detailed screen rules. The layout direction is approved; unreviewed journeys and an unnamed palette variant are not automatically approved.

The latest explicit owner decision prevails over earlier ERP decisions. A Tawsel contract conflict is a tracked dependency or scope decision; an ERP prompt cannot silently rewrite Tawsel. Historical prompts in either repository are reference material, not current execution authority.

## 2. Split work by an observable result

Do not choose a phase count in advance, copy Tawsel's count, or create only technology buckets such as “database,” “frontend,” and “integration.” Choose bounded results based on dependency order, transaction risk and the ability to run a meaningful trial. Infrastructure phases are valid when they produce demonstrable guarantees needed by later business work.

Each business result should include the necessary database, server, browser, integration and operational work together. Do not promise a working flow when its buttons write only mock state or when the mandatory Tawsel acceptance gate is missing. Introduce identity, source outbox, receiver inbox, projections and recovery as their first dependent operations appear. They must not be postponed to a final generic API phase.

Keep a dependency graph and an ordered catalog. A phase lists both its direct dependencies and the observable evidence required from them. A shared capability may have one owning phase and several consuming phases; all consumers still need relevant end-to-end acceptance cases. Preserve the complete scope when splitting a large phase. There is no permission to abbreviate the final phases or write “continue the same way.”

## 3. Mandatory contents of every future phase

### 3.1 Goal, result and scope

State the user or operational problem, the concrete result, the primary journey and the exact boundary. Name what the agent delivers and how the owner can recognize it. Cite all owned and consumed `ERP-R-###`, `ERP-D-###`, acceptance-case IDs and screen IDs. Include explicit deferred or excluded behavior only when it prevents an actual ambiguity in this phase.

A phase has an implementation scope and a verification scope. Both must be explicit. “Inventory works” is insufficient: identify the relevant product/parcel quantities, custody transition, reservation rule, authority and failure behavior.

### 3.2 Prerequisites and independent reading

List exact files and relevant headings or contract definition/example names. Distinguish required reading from optional context; do not require a new agent to infer a rule from chat history. Embed the essential rules and numbers in the prompt, with source links for the complete definition.

For each prerequisite state its expected artifact and how to verify it: an existing migration, a runnable command, an accepted API/schema version, a configured public endpoint, a previous result with evidence, or a reviewed UI component. A previous phase marked complete is not sufficient evidence that its required runtime capability exists.

Permit a small, reversible prerequisite repair when it is necessary and inside the phase's authorized result. Record it and rerun the affected checks. When a material dependency is absent, document the exact missing artifact, what was checked, its owner and the affected acceptance cases. Continue genuinely independent work, but do not substitute mocks and declare the blocked result complete.

### 3.3 Rules the agent can implement without guessing

Include the relevant lifecycle, permissions, branch/company scope, money/quantity formula, units, state transitions, immutable snapshots, period rules, idempotency identity and error states. Specify who owns each fact. Preserve the distinctions between driver-reported recipient payment, actual driver remittance, brand payout eligibility and actual payout; offered returns, actual receipt and usable stock; received events and applied projections.

For proposed technical defaults, link the approved plan decision or identify the precise pending review. Do not describe a recommendation as an owner-approved product rule. Preserve current and superseded IDs in traceability rather than deleting contradictory history.

### 3.4 Implementation slices

Identify the exact data, constraints, migrations, transaction boundaries, server commands/queries, jobs, public contract mapping, UI states and logging required by the result. Explain their relationship rather than providing an unqualified list of libraries.

For data changes, include backfill/default behavior, old data compatibility, required indexes and reversibility limits. For money or custody, state the source identity and uniqueness rules, lock or concurrency strategy, commit boundary and duplicate effect prevention. Cross-system HTTP is not part of a distributed ACID database transaction; use the documented durable recovery design.

For UI work, define the user's purpose, entry and return path, primary action, what is missing or pending, validation placement and permission-sensitive actions. Include loading, empty, failure, stale, lost-response and blocked states relevant to the flow. Use separate pages or focused dialogs when needed. Do not add an action simply because a reference screenshot shows a button.

### 3.5 Ordered checkpoints

Use an ordered sequence appropriate to the result. Every checkpoint includes its output, focused verification and the condition for continuing. Examples of useful ordering are invariants before writes, transaction behavior before enabling a consequential button, and recovery evidence before claiming the external operation is reliable. These are examples, not a compulsory count or universal sequence.

Keep the agent's next step clear. A failed checkpoint must state whether to repair within scope, record a material dependency, or stop dependent work. Do not use broad repeated test runs instead of resolving the particular failed guarantee. After the relevant checks pass, broaden testing only when a new change or unresolved concern justifies it.

### 3.6 Acceptance, rejection and failure evidence

Give concrete Given/When/Then cases with expected values and visible effects. Include the negative cases that can invalidate the claimed result: unauthorized scope, invalid input, stale revision, duplicate request, simultaneous conflicting operations, lost response, process restart and irreversible downstream effects as relevant. State the completion criterion in terms of those cases, not merely “all tests pass.”

Use the following verification levels deliberately:

| Level | Evidence required | Does not prove |
| --- | --- | --- |
| Vitest behavior | Important connected domain/service behavior, using realistic input and observable results; required in every implementation phase for its important operations | Database isolation, persistence, deployed connectivity or usable browser interaction by itself |
| Real PostgreSQL | Actual migrations and constraints, independent connections for races, controlled ordering/barriers, real commits and relevant restart/retry checks | Tawsel behavior or browser usability by itself |
| Public contract integration | Permitted ERP service identity, real HTTP boundary, separate systems/databases, selected accepted and rejected contracts and recovery cases | Untested operations/events, production configuration or all deployment combinations |
| Browser journey | Real app and required backend; Arabic RTL, desktop and mobile layouts, keyboard/touch paths, pending/error/empty states and reviewed visual comparison | Unexecuted devices, source-contract semantics or durability under failures not exercised |
| Manual trial | Exact setup, actions, expected records/balances/history and recovery steps the owner can perform | Automated repeatability unless an automated test also exists |
| Operations drill | Clean deployment/migration or isolated restore with measured results, access and secrets checks appropriate to the change | A future zero-loss/instant recovery guarantee |

Do not use an outer test rollback to claim committed durability. For concurrency, show that competing requests use separate transactions/connections and assert the invariant after both finish. For a crash, name where execution is interrupted and show the durable state after restart. Mocked HTTP and valid JSON fixtures are useful but cannot certify a real connector. Never claim a command, browser journey or restore was run when it was not.

### 3.7 Manual verification, deliverables and execution record

Give a short reproducible manual trial for each important result: prerequisites/test identities, sample data, actions, expected screen state, exact money/stock effect, visible history and one meaningful failure/retry path. Keep it safe for a development/test environment. Include how to reset or distinguish test records without destructive production cleanup.

List deliverable paths and documentation updates. Each phase updates its execution record with status, actual commands and outcomes, relevant evidence paths, migration/contract version, known limitations, outstanding dependencies and the next phase's verified prerequisite artifacts. Record failed or skipped checks honestly with their impact.

The future `phases/README.md` owns the phase catalog and execution index. Each phase has a stable status record: not started, in progress, blocked by a named dependency, ready for review, or complete with evidence. A label alone is not proof. A review may use a concise checklist, but it must not become an unrequested approval ceremony for routine reversible fixes.

### 3.8 Model and reasoning recommendation

At phase-authoring time, inspect the models actually available to the owner and current official OpenAI guidance. Record the checked date, available model name and supported reasoning setting, and give one brief task-specific reason for the recommendation. Use the current model selector or trusted local model metadata plus official guidance; do not copy model names from Tawsel's older phase documents.

PHASES-001 now assigns recommendations using [current model evidence](../../phases/MODEL-GUIDANCE.md), checked2026-10-03. Model availability can change before execution. Writing a model name in a prompt does not change the Codex model automatically; the owner selects the recommended available setting. If the suggested combination is unavailable, record a valid available alternative rather than inventing a model.

### 3.9 Stop boundary

Every prompt must state the owner's 2026-10-05 Git instruction: work directly on `main` in the existing checkout, without creating a branch or worktree; after all required checks and acceptance gates pass, commit with the phase number and push to the existing `origin` without asking again. Include the phase-specific commit example and link to [the shared Git workflow](../../phases/EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). A required failed, skipped, unavailable or blocked gate prevents the completion commit/push; preserve the work and report the blocker.

End every prompt with a precise boundary: implement and verify this phase only, write the truthful handoff, complete the authorized phase commit/push when eligible, and stop. Do not automatically run the next phase or publish a deployment, purchase, pay, merge a feature branch or deploy outside the owner's specific authorization. Do not change Tawsel code as a side effect of an ERP phase. A separately approved Tawsel change has its own owner, baseline update and compatibility evidence.

## 4. Coverage gate before the phase set is complete

The latest commercial amendments, ERP-D-200 through ERP-D-204 / ERP-R-209 through ERP-R-213, are settled inputs to future prompts. Use eligible cash-backed credit for known brand-paid shipping cover; recognize the whole storage subscription fee in the service-period start month; distinguish entitlement deductions from advance and incident recovery; preserve the approved incident-linked company-funded replacement shipping waiver and normal commission; and support partial and advance storage payments through a separate storage-credit balance. Do not revive daily storage-revenue allocation or a full-period-only storage receipt rule as defaults. Advance storage cash is not revenue before the corresponding service period starts. Shipping waived for a company-funded replacement does not erase genuine goods due.

1. Every current included requirement and decision has an implementation owner, an assigned phase, an acceptance case and a verification method in [traceability](../../REQUIREMENTS-TRACEABILITY.md).
2. Every superseded item points to the current replacement. Deferred/excluded items have an explicit exclusion check where relevant, rather than an implementation phase that resurrects them.
3. Each critical business journey includes its exception and correction path, not only its successful creation screen.
4. Every selected Tawsel command/query/event has exact contract authority, request/response or event mapping, revisions/identity, accepted/rejected examples, dependency/failure handling and recovery evidence. Contract coverage distinguishes fully reviewed sections from index-only or unresolved areas.
5. `TAWSEL-CR-001` and any remaining compatibility dependency are resolved or clearly bound to dependent acceptance cases. `TAWSEL-CHECK-002` is closed by scope exclusion; it is not a verified general payment formula. `TAWSEL-CHECK-003` must not be hidden by a phase completion label.
6. Daily stock monitoring, company-wide operational tracking, assigned-branch goods mutations, company-wide treasury-transfer permissions and shared brand wallet concurrency remain separate, explicit scopes.
7. Selected reports reconcile with their operational sources; brand goods and generic cash funding do not become company profit. Browser/Excel/print output uses the same authorized filters and totals.
8. Every phase has a practical manual trial and important Vitest behavior checks. Database, browser, contract and restore evidence are added where their guarantees are claimed.
9. The last phases have the same level of detail as the first. Delivery in several complete batches is permitted; placeholder later prompts are not completion.

ERP-D-205 now records master-plan approval; phase fields are assigned in traceability and the complete prompt catalog. Document authoring and approval still do not prove implementation acceptance.

## 5. Reference-format lessons applied

The historical Tawsel phase README, review checklist, coverage matrix and decision map were inspected for structure. Representative database atomicity, driver UI, inbox projection recovery and deployment/migration phases were read for depth. Their useful patterns are concrete prerequisites, embedded invariants, checkpoint checks, failure cases, manual review and evidence-bearing completion.

Their phase count, business exclusions, model names, implementation instructions and historical completion claims are not ERP requirements. This standard uses the owner's ERP scope and current registers. It makes no claim that the complete Tawsel phase set or every canonical reference body was read or that any runtime verification was performed during this documentation task.
