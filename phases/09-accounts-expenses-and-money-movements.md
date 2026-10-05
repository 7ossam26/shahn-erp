# P09 — Accounts, paid expenses and general money movements

**Git workflow (owner instruction, 2026-10-05):** Execute P09 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 9: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

Status: standalone implementation prompt authored after PLAN-001 approval, ERP-D-205 / ERP-R-214. Execute only this phase when selected by the owner. Authored prompts are not implementation evidence.

## 1. Goal and result

Deliver real Cash/Bank account setup, paid expense entry and the separate general deposit/withdrawal page. Authorized staff can record an actual expense against an assigned business branch, choose a permitted funding account and inspect the resulting immutable movements. Concurrent withdrawals cannot overspend the account. Every mutation has a recoverable command result and audit.

Own UI-ACCOUNT-SETUP-001, UI-EXPENSE-001 and UI-CASH-MOVE-001. Supply the account service later used by transfers, remittance, payouts, storage, payroll and adjustments. Opening entries, those later workflows, unpaid expenses, bank integrations and the profit dashboard are outside this phase. Expense cost facts needed later are included now.

## 2. Model and execution setting

Recommended **gpt-6.1-sol / high**: a bounded financial slice using the existing transaction kernel, with explicit database evidence still required. Availability and official guidance were checked on 2026-10-03 in [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md). The owner selects the setting in Codex; a name in this prompt does not change the running model. Record the actual setting.

## 3. Reading and actual prerequisites

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md); [master-plan.md](../master-plan.md), Identity and authorization, Data and transactions, Verification; [ERP-DOMAIN-SPEC.md](../docs/planning/ERP-DOMAIN-SPEC.md), sections13–15; [ERP-DATA-AND-TRANSACTIONS.md](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md), sections5.1/5.4/7–9; [ERP-ARCHITECTURE-AND-OPERATIONS.md](../docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md), API conventions and Transactions and workers; [ERP-SCREEN-SPEC.md](../docs/planning/ERP-SCREEN-SPEC.md), account setup, financial screens, shared interaction and filters; and [UI-REVIEW-LOG.md](../UI-REVIEW-LOG.md).

Inspect P01–P03 execution records and actual code. Verify migration status and relevant existing phase tests. P02 must supply AccessContext, screen grants, company, assigned branches and authorization revision. P03 must supply a one-client UnitOfWork, stable command recovery, source-unique JournalPosting, immutable audit and EGP minor-unit validation. Verify company/branch data and the reviewed shell exist. A checkbox or mock transaction is insufficient.

Repair and record a small missing export/registration within scope. A missing identity system, transaction kernel or real PostgreSQL is a material prerequisite: continue independent contract/UI work, but identify blocked cases rather than pretending funds safety is proven. Preserve owner changes and dependency pins.

P04 is also a direct prerequisite: inspect its actual reference-catalog/screen registry and company/branch records, run its relevant registered checks, and verify the existing expense-category maintenance entry point before extending it. Reuse that registry and screen shell; do not create a parallel settings tree or hardcoded category list. Missing P04 reference infrastructure is a material dependency, while a small exported-registry adaptation can be repaired and recorded in this phase.

## 4. Requirements and business rules

Implement ERP-R-118/119/120/121/123/124/130/137/138/139/143/154/155 and their AC-R cases. Decisions: ERP-D-112/113/114/115/117/122/128/129/130/134/145/146. Consume ERP-R-019/033/106/126/153/156/177/208.

- Cash accounts belong to branches; named company bank accounts record allowed branch usage. Currency is EGP. Cash, Bank deposit and InstaPay are methods; InstaPay does not create a separate balance.
- Account setup requires name, type, scope and active state. Optional bank description is not a provider credential. New accounts start at zero; no hidden opening-balance field.
- Expenses describe actual paid money: positive amount, actual date, active category, business branch, method/account and description. Past dates, including previous months, are allowed. Preserve immutable entry time and actor. No unpaid-expense due/payment workflow.
- Single-branch users see only their branch; multi-branch users choose an assigned branch. Shared-bank funding does not change business attribution. Validate account use and business branch independently on the server.
- Categories are addable; used categories deactivate without losing history. Illustrative names are not a compulsory catalog.
- Generic deposit/withdrawal requires direction, account, amount and actual date; free-text reason is optional. It affects cash/history and never creates profit. A dedicated payment must not also require a generic withdrawal.
- Expense, account debit, paid-cost source, audit and result commit together. Outward actions recheck funds under the same account lock. A genuine past payment conflicting with current recorded funds needs discrepancy resolution; do not add an overdraft bypass.
- Preserve inactive accounts and their histories. Reject new ordinary use, and require a resolved path for outstanding obligations before deactivation. Later modules must join the same deactivation/funds guards.

## 5. Data, API and interface slice

Add ordered SQL migrations under packages/database/migrations for money accounts, allowed usage, account movements, lockable balance projection, expense categories, paid expenses and source-linked cost facts. Reuse P03 journal/audit/result primitives. Require company-preserving foreign keys, unique effect-source identities, positive amount constraints, actual/recorded dates and account/date/branch/category indexes. Migration from existing P03 data must preserve all prior journal rows.

Implement apps/api/src/modules/finance/accounts, expenses and money-movements. Publish AccountFundsService for authorized account reads, sorted account locks, available-funds validation and source-unique debit/credit posting inside the supplied UnitOfWork. It must not commit a nested transaction. Include projection-versus-journal reconciliation queries for later P24. Document exact signatures and the active-obligation guard consumed by later modules.

Before handlers, define closed request/response/error schemas and OpenAPI in packages/contracts/src/finance. Mutations carry commandId, expectedVersion where applicable, EGP amountMinor strings, actual date and explicit account/branch/method. Implement account create/update/deactivate, category management, paid expense create/detail/list, general movement create/detail/list and shared authorized command recovery. Use deterministic pagination and explicit actual-versus-recorded date filters. Permission names belong to the screen registry, not job titles.

Build focused real-data pages under apps/web/src/features/finance. Account setup has no editable balance; detail shows dated movements and availability. Expense creation preserves entered data on validation failure. Generic movement uses a direction choice and optional reason, not expense categories. Keep the approved Arabic RTL shell, simple back header and compact mobile cards. Use the current reversible white/lime default without claiming final palette approval.

Before migration acceptance, test an upgrade with retained historical source rows. Account creation must not replay those rows as new cash or hide an opening entry in a default value. Verify old expense dates, actors and category labels remain readable after account/category deactivation. Add active-obligation guard tests as downstream callers register, including pending transfers and unresolved cash observations. Document whether an existing record required an explicit data migration; never report a synthetic opening as an actual payment.

## 6. Ordered checkpoints

1. Verify prerequisites and define schema examples, scope matrix and posting identities. Run connected Vitest for amount/date validation, classification and account-versus-branch permission. Reject zero/negative/fractional amounts where disallowed, unsupported currency and changed payload under one command key.
2. Migrate clean and existing P03 test databases. Implement account/category lifecycle and journal posting. Verify zero initial balance, retained historical labels and exact projection/journal sums using real committed rows.
3. Implement paid expense and general movement transactions. Inject failure after expense insertion, after account posting and before result persistence; assert complete rollback. Race two withdrawals with separate connections and controlled barriers. The same account lock must protect all entry points.
4. Exercise the real API with single/multi-branch users, another company and a grant revoked after preview. Test duplicate submission, stale version, commit followed by response loss and recovery after process restart. No duplicate debit or fictional physical reversal.
5. Complete browser journeys on desktop and phone: past-date expense, new category, optional blank movement reason, insufficient funds, inactive account, stale/unknown result and connection loss. Verify advanced filters and back navigation preserve the query.
6. Register npm run test:phase -- P09 and run the relevant Vitest, real PostgreSQL and browser suites plus typecheck/lint/build. An unregistered or empty suite must fail. Record actual evidence, not planned command success.

## 7. Acceptance and rejection

| Case | Expected result |
| --- | --- |
| P09-A01 account creation | Balance0 with no opening or revenue movement; same command returns the same account. |
| P09-A02 deposit1000, expense200, withdrawal100 | Balance700, three cash movements and one expense cost200; funding/withdrawal creates no profit fact. |
| P09-A03 B-only user using shared bank | Expense remains attributed toB; forged branchA is rejected without effects. |
| P09-A04 prior-month paid expense | Correct actual-date report source with today's recorded time; protected payroll unchanged. |
| P09-A05 concurrent withdrawals700 against1000 | One succeeds, one fails; balance300 and one effective debit. |
| P09-A06 lost response and restart | Recover one committed result/movement; no invitation to repeat the actual payment. |
| P09-A07 inactive master data | History remains visible; prohibited new use fails clearly. |
| P09-A08 cross-company account ID | Denied on direct API and recovery read; no existence/details leaked through filters. |

Database tests use real migrations, independent competing connections and committed evidence. Do not wrap durability checks in an outer rollback. Browser tests call the real ERP API; mocks can isolate a visual error state but cannot certify account guarantees.

## 8. Manual trial

Create an isolated P09 seed company with branchesA/B, a B-only expense user and a multi-branch user. Label fixtures P09 and refuse production seeding. Create B Cash and Company Bank at zero. Record a test deposit1000 into B Cash with blank reason. Add an expense category and record a paid expense200 againstB with a previous-month date. Record generic withdrawal100.

Expect cash700 and exactly three money movements. Only expense200 has an operating-cost source. Log in as the B-only user: A is absent from the expense selector and a forged request fails. Try another expense800: no expense/movement is created. Simulate loss of the successful expense response, then reload and recover its command: the original record returns and cash remains700. Inspect actual and recorded timestamps, keyboard focus after errors and the mobile amount/confirmation layout. Store screenshots and source/result references.

## 9. Deliverables, evidence and stop

Deliver migrations, contracts/examples, posting/scope services, actual pages and focused tests. Evidence goes under docs/verification/P09. Document funds-service signatures, source uniqueness, lock order and deactivation hooks for P10/P16/P17/P19/P20/P21. Update phases/execution/P09.md, the catalog and IMPLEMENTATION-STATUS.md with actual model, starting state, files, migrations, command outputs, failures/reruns and skipped checks.

Completion requires these three workflows and their rejection/race/restart checks within stated scope. Implement P09 only, write the handoff and stop. Do not start P10, modify Tawsel, make real payments, create provider accounts, publish, deploy, purchase or merge without separate authorization.



## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-118`, `ERP-R-119`, `ERP-R-120`, `ERP-R-121`, `ERP-R-123`, `ERP-R-124`, `ERP-R-130`, `ERP-R-137`, `ERP-R-138`, `ERP-R-139`, `ERP-R-142`, `ERP-R-143`, `ERP-R-208`.

Decisions: `ERP-D-112`, `ERP-D-113`, `ERP-D-114`, `ERP-D-115`, `ERP-D-117`, `ERP-D-122`, `ERP-D-128`, `ERP-D-129`, `ERP-D-130`, `ERP-D-133`, `ERP-D-134`, `ERP-D-199`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
