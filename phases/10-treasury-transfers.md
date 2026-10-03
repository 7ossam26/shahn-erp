# P10 — Treasury transfers with separate actual receipt

Status: standalone implementation prompt under approved PLAN-001, ERP-D-205 / ERP-R-214. Execute this result only when selected. This document is not evidence that the workflow exists.

## 1. Goal and boundaries

Deliver a dedicated money-transfer sending page and a separately permissioned full-receipt page. Sending decreases source spendable funds and records money in transit. Destination cash becomes spendable only when an authorized user confirms its complete actual receipt. Both screens intentionally operate across company branches; this does not broaden expense, inventory or goods-transfer permissions.

Own UI-CASH-TRANSFER-001 and UI-CASH-RECEIPT-001, plus their pending/detail/history states. Use P09's accounts and P03's transaction kernel. Do not implement partial receipt, driver remittance, physical goods transfer, automatic rejection refund, bank APIs or automatic consolidation to the main branch. A transfer is not revenue or expense. These distinctions must be visible in behavior, not only comments.

## 2. Model

Use **gpt-6.1-sol / high** as the recommended setting: a bounded state transition built on tested account primitives, with explicit concurrency and physical-receipt rules. Availability/guidance checked2026-10-03: [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md). The owner selects the model and effort in Codex; prompt text does not select them. Record the actual setting and any verified alternative.

## 3. Reading and prerequisite proof

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md); [master-plan.md](../master-plan.md), Identity and authorization, Employees/storage/operating money and Data and transactions; [ERP-DOMAIN-SPEC.md](../docs/planning/ERP-DOMAIN-SPEC.md), sections13.2–13.4 and15; [ERP-DATA-AND-TRANSACTIONS.md](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md), sections5.1/5.4/7–9; [ERP-SCREEN-SPEC.md](../docs/planning/ERP-SCREEN-SPEC.md), treasury send/receipt and shared interaction/filter contracts; and [UI-REVIEW-LOG.md](../UI-REVIEW-LOG.md).

Inspect phases/execution/P02.md, P03.md and P09.md and actual implementations. Run npm run db:status and the relevant P09 phase suite against real PostgreSQL. Verify account scope, inactive guards, source-unique JournalPosting, sorted money-account locking, current available balance and command recovery. Verify separate screen grants can be assigned to one person or different people. P09 must expose a transaction-taking AccountFundsService; do not bypass it with ad hoc balance updates.

If a missing interface adapter is small and the invariant exists, repair and document it. Missing real account posting or authorization is a material prerequisite. Continue independent schema/presentation work but keep send/receipt acceptance unverified until the prerequisite exists.

## 4. Rules and traceability

Implement ERP-R-122/123/135/136/144/145 and AC-R-122/123/135/136/144/145. Governing decisions: ERP-D-116/117/126/127/135/136. Consume ERP-R-019/106/121/126/143/153/154/155/156/177/208.

A send-screen grant permits any eligible source/destination branch in the same company. Receipt has its own screen grant and the same company-wide reach. Ordinary branch assignment does not restrict these two screens; another company remains prohibited. There is no hardcoded manager role, separate per-button authority or mandatory different sender/receiver person.

A transfer has exact source, destination, amount and actual send time. Source and destination must differ; prohibit a no-op same-account transfer. Validate active accounts and their permitted relationship to the selected branches. Display the resulting scope clearly before confirmation. Do not turn the treasury exception into permission to use all accounts on other business screens.

Sending records actual staff assertion and commits source debit, transit position, immutable transfer, actor/audit and result atomically. Destination remains unchanged. Receipt commits the exact remaining sent amount, transit reduction, destination credit, actual receipt time, audit and result once. Normal states are sent/in transit and fully received, retaining timestamps and versions. No partial-success state or editable “amount received” that accepts less than the fixed amount.

Do not offer an automatic Reject-and-refund button. Clicking a status control does not return physical money. Wrong records or money physically returned require the legitimate linked correction workflow delivered in P21; provide a truthful reference to that route when available, not a fake reversal now. Pending transfers remain visible; no timer completes them. A sender/receiver may be the same person when holding both grants.

Cash conservation spans source, transit and destination. Transfer-in-transit is not source or destination available funds. Sending and receiving do not create operating-profit facts. Account deactivation while a pending transfer needs it must be refused with the transfer link or follow an explicit safe completion policy already in the approved account service; never strand hidden money.

## 5. Implementation contract

Add migrations in packages/database/migrations for treasury_transfer, its immutable source/destination/account snapshots, state/version, send/receipt identities and transit journal references. Use company-preserving foreign keys, positive amount constraints, unique send identity and one effective receipt per transfer. Index company/state/destination/date for pending receipt queries. Derive transit from source-linked movements, not an independently editable number.

Implement apps/api/src/modules/finance/treasury-transfers. Publish sendTransfer and receiveTransfer application services that use the caller's UnitOfWork and P09 AccountFundsService. Follow the global order: command/transfer identity, relevant account locks in immutable-ID order, then append-only movements. Use source effect keys separate from HTTP idempotency so a repeated receipt with a new commandId still cannot credit twice.

Define packages/contracts/src/finance/treasury-transfers schemas before route code. Native commands carry commandId, source/destination identities, positive amountMinor, actual dates and expectedVersion as applicable. Receipt identifies the transfer and confirms full actual receipt; it cannot change source/destination or value. Queries return permitted pending lists, detail, transit amount and immutable history. Return structured scope, funds, version and already-completed results through common conventions.

Build focused Arabic RTL send and receipt pages under apps/web/src/features/finance/treasury-transfers. Sending previews accounts, branch names, amount and source available funds. Receipt shows the fixed amount and one main confirmation action. Show pending age, source sender/date, actual destination and confirmed receiver/date. Add relevant branch/state/date/reference filters without globally exposing account history. Keep stale/unknown result and connection-loss behavior from the shared shell.

A pending transfer is an active obligation for account lifecycle checks: unsafe source/destination deactivation must not strand receipt. Preserve historical account and branch references when names change. Reconcile one transfer identity across its source debit, transit amount and destination credit; links are part of the handoff to P24. The company-wide treasury permission exception applies only to its defined send/receipt operation and necessary transfer detail. It does not grant unrelated branch expense, payroll or general account-history access.

## 6. Checkpoints and focused validation

1. Inspect prerequisites, document lifecycle and permissions, and add positive/negative schema fixtures. Vitest must distinguish company-wide transfer authority from assigned-branch expense authority. Test amount precision, same-account rejection and inactive accounts before writing UI.
2. Apply migrations on clean/upgraded test databases and implement transit posting. Query the journal directly to prove conservation. Inject failures between source debit, transfer record, transit posting and audit/result; none may survive a failed transaction.
3. Implement receipt with transfer lock and source uniqueness. Race two receipts using different commands/connections; only one destination credit can exist. Race send against another spending operation on the same source; combined successful spending must remain within funds.
4. Expose API and pending queries, test sender-only/receiver-only/both-grant users including someone assigned an unrelated branch. Direct cross-company requests and revoked grants fail. Receiving an unknown, already received or stale transfer returns a definite safe result without another credit.
5. Build and exercise both pages at390x844 and1440x1050, including clear pending state, no partial option, no automatic refund, long account names, focus, filters and timeout recovery. Capture committed detail after reload.
6. Register npm run test:phase -- P10 and run important Vitest, real database and browser tests plus relevant build/typecheck/lint. Add execution evidence and service handoff for P21/P23/P24.

## 7. Required acceptance cases

| Case | Expected result |
| --- | --- |
| P10-A01 source1000, destination0, send300 | Source700, transit300, destination0; no profit change. |
| P10-A02 receive the300 | Source700, transit0, destination300; one actual receipt history. |
| P10-A03 two concurrent receives | One receipt effect; duplicate result or conflict for the other, never destination600. |
| P10-A04 two sends700 against1000 | One successful send; source300; total transit700. |
| P10-A05 receiver assigned unrelated branch | Receipt succeeds with its separately granted company-wide screen; unrelated expense entry remains denied. |
| P10-A06 sender lacks receipt screen | Send works, receipt command and UI are denied; a hidden button alone is insufficient. |
| P10-A07 partial299 or altered destination | Closed schema/business validation rejects with no journal movement. |
| P10-A08 lost response after receipt commit | Same command recovers the prior receipt after restart; source/transit/destination stay conserved. |

Tests use committed transactions and independent connections; no outer rollback may conceal persistence. A mocked AccountFundsService is insufficient for concurrency acceptance. Test both orderings of competing send/withdrawal operations, not a single timing accident.

## 8. Manual trial and handoff

Seed an isolated P10 company using actual P09 development helpers: A Cash1000 and B Cash0, a user assigned onlyC with transfer-send permission, and another user assigned onlyC with receipt permission. The balances may be funded with clearly labelled actual test deposits; do not invent production opening data.

Send300 fromA toB. Inspect source700, pending transit300 and destination0. Reload and confirm it remains pending; a quiet page does not imply receipt. Switch to the receipt user, inspect the exact300 and confirm actual receipt. Expect destination300 and transit0 with sender/receiver timestamps. Submit the receipt again and recover its original command: destination remains300. Confirm this same user still cannot create a B expense without ordinary branch/screen authority.

Try send800 from source700 and an attempted partial receipt in the API harness; neither creates effects. Inspect journal conservation and absence of income/expense facts. Capture both mobile pages and the pending-to-received timeline.

Deliver migrations, schemas, services, pages, tests and docs/verification/P10 evidence. Update phases/execution/P10.md, catalog and IMPLEMENTATION-STATUS.md with actual commands/results, failed reruns, limitations and model. Document the transfer/discrepancy hooks P21 may consume and the read model P23 uses.

Complete only P10 and stop after the handoff. Do not automatically run P11, refund real money, perform external bank transfers, modify Tawsel, publish, deploy, purchase or merge.



## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-122`, `ERP-R-123`, `ERP-R-135`, `ERP-R-136`, `ERP-R-144`, `ERP-R-145`, `ERP-R-169`, `ERP-R-208`.

Decisions: `ERP-D-116`, `ERP-D-117`, `ERP-D-126`, `ERP-D-127`, `ERP-D-135`, `ERP-D-136`, `ERP-D-160`, `ERP-D-199`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
