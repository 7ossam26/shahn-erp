# P08 — Employee profiles and effective commission terms

**Git workflow (owner instruction, 2026-10-05):** Execute P08 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 8: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Execute this phase only

Deliver a usable employee setup screen for all company staff. It must keep salary and commission as independent sections, preserve effective terms and branch history, and provide an explicit association between commissioned delivery work and an employee. Staff can inspect what a term change will affect without altering past or paid calculations. P13 will create visit earnings; P20 will implement actual advances, monthly calculation and salary payment. Do not add working-looking payment buttons before those capabilities exist.

Authority: PLAN-001, ERP-D-205 / ERP-R-214. Recommended execution setting: **gpt-6.1-sol, high**, because the scope is a bounded profile workflow with consequential historical attribution. [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md) records checked availability on 2026-10-03. The owner selects the setting in Codex; a Markdown model name does not change it.

## Read these sources completely for this scope

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md), actual workspace instructions and P01–P04 handoff evidence. Then read:

- [Domain specification](../docs/planning/ERP-DOMAIN-SPEC.md), sections 3.3, 8, 11, 15 and DOM-13/DOM-14/DOM-23 for future interfaces.
- [Data specification](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md), sections 1–3, 6.1, payroll transaction boundary and sections 8–9. Read the distinction between employee earning cost, advance recovery and incident recovery even though P08 posts none of those payments.
- [Screen specification](../docs/planning/ERP-SCREEN-SPEC.md), UI-EMPLOYEE-001, employee setup groups, shared interaction and employee filters.
- [Architecture](../docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md), identity, employee/module boundaries and scope exceptions; [integration plan](../ERP-TAWSEL-INTEGRATION-PLAN.md), employee/driver identity mapping only.
- [UI brief](../UI-DESIGN-BRIEF.md), [UI review](../UI-REVIEW-LOG.md) and the actual shared form components extracted in P01.

Requirements: ERP-R-019, ERP-R-033, ERP-R-058, ERP-R-065, ERP-R-066, ERP-R-079, ERP-R-080, ERP-R-085, ERP-R-086, ERP-R-087, ERP-R-088, ERP-R-140, ERP-R-156, ERP-R-176, ERP-R-177, ERP-R-200. Governing decisions: ERP-D-032, ERP-D-057, ERP-D-071, ERP-D-072, ERP-D-078, ERP-D-083, ERP-D-084, ERP-D-085, ERP-D-086, ERP-D-131, ERP-D-164, ERP-D-167, ERP-D-168, ERP-D-191. Consume ERP-D-202 / ERP-R-211 as the future classification contract, without claiming P08 implements salary payout.

## Required observable prerequisites

P02 must provide authenticated screen grants, assigned branch scope, current permission revisions and genuine audit actor. P03 must provide command/result recovery, checked EGP Money and transactional source identities. P01 must provide Arabic RTL presentation, schema/client generation and real PostgreSQL/browser test harnesses. Verify these by current commands and requests, not merely phase labels. Run `db:status` and a real denied branch query.

Inspect whether the local operational-driver identity registry was established by an earlier access module. Reuse its immutable ID if present. Otherwise create the minimal local registry described below, with external mapping explicitly pending until P11. An employee needs neither a login nor a Tawsel user. Commission work must never be attributed by matching names or phone numbers. If a real external driver list is unavailable now, show pending linkage clearly; do not invent driver-ready status or credentials. Small schema exports can be fixed and recorded, but do not implement Tawsel provisioning in this phase.

## Exact profile and term rules

Employee profile contains name/contact, active/employment dates, current business branch, work days, hours and weekly day off. These schedule fields are descriptive. They do not create attendance records, automatic overtime, holiday deductions, tax, leave accounting or partial-month proration. Phone/name duplication is not identity equality. Referenced employees are deactivated with history retained, not deleted.

Salary and commission are two independent toggles. Salary only, commission only and both are valid configurations. Both off is a valid profile with no automatic salary/commission earning until terms are enabled; show that effect plainly rather than forcing an invented salary. Enabling salary requires a nonnegative EGP fixed monthly amount; explicit zero is distinguishable from unset. Enabling commission requires exactly one formula: integer basis-point percentage of **base shipping**, or nonnegative fixed EGP per eligible actual visit. Reject ambiguous payloads with both formula values active. A percentage is bounded 0–10,000 basis points. Compute per-visit piastres with half-up rounding using integer arithmetic, then sum; never apply floating-point percent to an entire month's total.

Examples: base shipping 50 plus packing 5 at 10% gives commission 5, not 5.50. Fixed commission 7 gives 7 for each eligible visit. Two actual visits by different drivers earn for their respective employees. Replay, a transport retry, an order merely assigned, preparation and an internal branch-transfer trip are not additional visits. Whether the brand paid does not gate commission. A company-funded replacement shipping waiver still retains normal base/fixed commission; the fee's net revenue is a separate later concern.

Store effective revisions for salary policy, commission policy, branch attribution and driver association. Intervals are half-open, non-overlapping for their relevant employee/driver axis, and selected by authoritative work time rather than webhook arrival. A later branch/rate/name change cannot move old earning facts. Percentage/fixed type and value are snapshotted on future earning rows together with effective policy/link IDs. Export a deterministic policy resolver that returns either one exact policy/association or an explicit unresolved condition; never guess which of two overlapping links is intended.

Salary changes differ from work-time commission changes. Staff may correct the **current unpaid** month's configured salary with an audited full-month revision or schedule a future month. They may not edit a paid or past month's calculation. Do not prorate days for join/leave dates; staff later enter an ordinary deduction when they choose a partial-month reduction. A prior month may be unpaid but still frozen. Commission changes take effect from their chosen valid work date, preserving earlier work; do not backdate a new term to rewrite already accepted visit earnings. A correction needing historical financial changes belongs to the reviewed adjustment path, not a profile editor.

The same guard must later serialize profile edits with payroll finalization. Establish a lockable employee-month control record or reuse the existing one: current editable unpaid, frozen unpaid, paid, zero-net closed. P08 needs the guard and history, not P20's salary calculation. Absence of a period record does not authorize editing a past month. Check Cairo month boundaries server-side at command time, materialize/lock the relevant control row and recheck current status. Document this exact interface for P20 so a competing term edit cannot land after its payout snapshot.

Employee master data uses assigned-branch scope. A multi-branch user can select only authorized branches; an A-only user must not read another employee's finance through company-wide shipment tracking. Reassigning an employee requires authority over affected branches and a reasoned dated revision, while prior branch attribution remains unchanged. Module grants authorize their screen operations; no hardcoded HR/admin job-title check or separate per-button permission engine is added.

## Planned files, data and endpoints

- `packages/database/migrations/0008_p08_employee_terms.sql`: `employee`, `employee_branch_history`, effective `compensation_policy`, `employee_driver_link` and the minimal shared `payroll_period` control state. Reuse or create stable `operational_driver` identity with an explicit external-mapping readiness field, not a fabricated Tawsel ID. Add same-company FKs, unique effective association protections, interval validity, checked Money/rate constraints and versions. No automatic conversion of ordinary users into employees; no salary/advance backfill from profiles.
- `packages/database/src/employees/`: repositories using P03 transactions. Lock employee/control/link keys before validating intervals; use database constraints plus deterministic locks to prevent concurrent overlaps. For missing link/period rows use a materialized guard or unique constraint, not an empty `FOR UPDATE` query.
- `packages/domain/src/employees/`: term validation, per-visit commission formula, policy/association resolution, period-edit guard and branch history selection. Return typed unresolved associations for future P13 review; this is not a zero-commission fallback.
- `packages/contracts/src/employees/`: closed schemas/examples for `POST /api/v1/employees`, `GET /api/v1/employees`, `GET /api/v1/employees/{id}`, `POST /api/v1/employees/{id}/terms/preview`, `POST /api/v1/employees/{id}/terms`, `POST /api/v1/employees/{id}/driver-links`, and versioned profile/deactivation updates. Expose allowed effective boundaries and protected-period explanations. Use the standard native command envelope and error vocabulary.
- `apps/api/src/modules/employees/`: scope checks, atomic profile/terms/link/audit/result services and explicit exported `resolveEmployeeTermsAt`/`guardEditablePayrollPeriod` interfaces. These are internal services accepting a transaction where required, not public Tawsel endpoints. Join the later P13/P20 transaction instead of nesting a separately committed earning write.
- `apps/web/src/features/employees/`: `/employees`, `/employees/new`, employee detail/setup, effective history and a focused term-change preview. Display salary and commission in separate panels with their switch, units and effect. A future monthly-earnings destination may explain that P20 is not implemented in development; no fictitious balance or enabled Pay button.

Filters use name/reference search, assigned branch and active state, with advanced salary/commission modes and effective-date history. Monthly paid/unpaid filters become operative when P20 provides real period data. Do not show fabricated zero salary history from today's profile. The main setup action is Save employee; after success show saved terms and remaining driver-association readiness. Preserve entered fields on validation and unknown outcomes, reuse the command ID, and reauthorize result recovery.

## Ordered checkpoints and continuation gates

1. **Terms and schema examples.** Model all toggle/formula combinations, base-only commission and temporal resolution in connected Vitest. Verify salary/commission fields have exact money versus basis-point units. Continue only when ambiguous combinations reject consistently in generated client/server schemas.
2. **Migration and temporal integrity.** Apply on fresh and P07 databases. Run two independent SQL transactions attempting overlapping effective links/terms; only one valid final interval may exist. Inspect historical branch/name preservation and deactivation behavior.
3. **Profile/guard API.** Test current unpaid correction, future schedule and past/paid rejection against real control rows. Introduce a barrier between profile edit and simulated P20 freeze on the shared guard; the committed order determines one consistent result. Do not use a fake mutex to claim this guarantee.
4. **UI and identity readiness.** Build complete Arabic grouped setup with real API data, accessible switches and mobile layout. Test pending link, revoked branch, stale revision, unknown response and duplicate-name independence. Capture desktop/mobile and long name/formula descriptions.
5. **Handoff interfaces.** Register P08 tests, execute focused checks and publish resolver/control contracts with deterministic fixtures for P11/P13/P18/P20. Leave actual payments/visit ingestion to their owners.

## Acceptance matrix

| ID | Given / When | Then and evidence |
| --- | --- | --- |
| P08-AC-01 | Create salary-only, commission-only and combined employees. | Independent correct settings, no login requirement and no actual payment/earning posted. Vitest/API/browser. |
| P08-AC-02 | Base 50/uplift 5 at 10%, then fixed 7. | Resolver calculates 5 or 7 per eligible visit; no packing inclusion or monthly floating rounding. Vitest with precise piastres. |
| P08-AC-03 | Rate changes on work date D; an earlier work fact is resolved later. | Earlier fact uses prior rate/branch/link; D and later use new terms. No event-arrival repricing. |
| P08-AC-04 | Two concurrent overlapping driver-to-employee associations. | One valid association or explicit conflict; no ambiguous attribution. Real PostgreSQL. |
| P08-AC-05 | Edit salary in current unpaid month, past unpaid month and paid month. | First allowed with revision; latter two reject unchanged. Profile edit versus freeze uses one common lock. |
| P08-AC-06 | Same-name employees, one without login/driver association. | Distinct identities and truthful pending/no-link state; no fuzzy binding or forced Tawsel setup. |
| P08-AC-07 | A-only user requests B employee or resubmits after branch revocation. | Server denies without finance/profile leakage; former successful-command recovery is reauthorized. |
| P08-AC-08 | Deactivate an employee with historical terms; retry lost response. | One deactivation/history entry, references retained, no term duplication or deleted history. |

Important connected Vitest tests are mandatory. Real PostgreSQL tests prove interval, guard and idempotency claims. Browser tests prove actual responsive form behavior. Run `npm run test:phase -- P08`, typecheck, lint and build; log skipped external-link validation as pending P11, not connector success.

## Manual trial, deliverables and stop

Use a marked test company and authorized A/B staff. Create Salma at A with salary 6,000 only, then Karim with fixed commission 7 only, then Mona with salary 6,000 plus 10% commission. Enter workdays/hours/day off and verify they do not calculate attendance money. Preview base 50/uplift 5 and inspect commission 5. Schedule a future rate, resolve dates on either side and inspect preserved history. Change a current unpaid salary, attempt the same edit in a past/paid fixture and observe rejection. Create a duplicate display name and verify no automatic identity link. Deactivate and recover a deliberately dropped save response without duplicate records.

Deliver migration, services, schemas/examples, actual forms, tests and captures under `docs/verification/P08/`. Update `phases/execution/P08.md`, status and traceability with actual commands, failed/repaired checks, exact resolver/control interfaces and pending external mapping. **Implement and verify P08 only, write the handoff and stop. Do not begin accounts/integration/payroll, create Tawsel users, deploy, publish, purchase, pay or merge automatically.**

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-020`, `ERP-R-058`, `ERP-R-065`, `ERP-R-066`, `ERP-R-079`, `ERP-R-085`, `ERP-R-086`, `ERP-R-087`, `ERP-R-140`, `ERP-R-176`, `ERP-R-189`, `ERP-R-193`.

Decisions: `ERP-D-016`, `ERP-D-057`, `ERP-D-066`, `ERP-D-071`, `ERP-D-072`, `ERP-D-076`, `ERP-D-078`, `ERP-D-083`, `ERP-D-084`, `ERP-D-085`, `ERP-D-086`, `ERP-D-087`, `ERP-D-088`, `ERP-D-131`, `ERP-D-167`, `ERP-D-180`, `ERP-D-184`, `ERP-D-185`, `ERP-D-191`, `ERP-D-194`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
