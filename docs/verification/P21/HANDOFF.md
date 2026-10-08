# P21 consuming interfaces

P21 owns the Settlements page (UI-ADJUSTMENT-001, `/settlements`) and the optional opening-balance page (UI-OPENING-001, `/settings/opening-balances`). Every correction is a typed operation that delegates to the owning P05–P20 service inside the same P03 `UnitOfWork`; there is no generic table/column/ledger editor and no free-form fallback. P22/P23/P24 remain unimplemented by this phase.

## Storage and identity

`0025_p21_settlements.sql` (after actual P20 `0024`) adds:

| Record | Meaning |
| --- | --- |
| `settlements.adjustment_case` | One case per typed target. `target_kind`, `operation`, branch, reason, actual date, actor and command record. Only `open → resolved` with `version + 1` is allowed (trigger `protect_case`); nothing is deleted. |
| `settlements.resolution` | One immutable typed resolution per confirming command (`UNIQUE command_record_id`): closed `classification`, amount/quantity, reason, actual date, `effect_digest` and the exact reviewed preview JSON. |
| `settlements.case_link` | Permanent links (`original`, `dependent`, `result`) to the owner records: stock source, paid expense, money movement, journal effect, review, incident, employee obligation, storage refund, shipment. |
| `settlements.stock_observation` | Recorded/observed quantity, signed delta, reservation shortage before/after and the P07 stock source written as `kind='adjustment'`, `source_system='settlement'`. |
| `settlements.account_observation`, `account_hold`, `account_hold_release`, view `account_hold_balance` | Book at observation, observed actual, difference; an unexplained shortage hold and its capped releases (`SETTLEMENT_HOLD_OVER_RELEASED`). A surplus creates no spendable hold or money. |
| `settlements.employee_obligation` | Owner identity for an opening employee obligation or an approved account-shortage liability; recovered only through P20 payroll. |
| `settlements.opening_batch`, `opening_line` | Dated optional batch; one line per classified target, `UNIQUE(company_id, target_key)`; each line links its journal effect or stock source. |
| `settlements.command_outcome` | Retained typed result for command recovery. |

All P21 rows are immutable (`kernel.immutable`) except the case state transition. `kernel.journal_effect` classification is replaced by `p21_journal_classification`, adding only `brand.adjustment` (signed, commercial agreement) and `employee.opening` (signed). `finance.money_movement.source_kind` adds `opening` and `settlement`. P20 `payroll_obligation` gains a nullable `settlement_obligation_id` original link and kind `settlement`; `payroll_adjustment` gains `opening_entitlement`, which is paid once through net pay and excluded from `employeeCost` and `employees.payroll_cost_source`. No existing row is backfilled.

## Same transaction boundaries and lock order

`SettlementService.prepare` computes a nonbinding preview under the same resolver read path; its digest is `sha256(canonical({operation, body}))`. `confirm` re-runs the resolver under its locks, calls `verify` (different digest → `SETTLEMENT_PREVIEW_STALE` with current details; blockers → the first blocker, 409), records case + resolution before effects, appends permanent links and retains the result under the P03 command identity (family `settlements`, kind `settlement.confirm`). Rejections are retained via the P03 savepoint path, so a retried identity returns the same answer.

Lock order follows P03 ranks: identity (settlement case key / opening target keys) → aggregate → stock → wallet → employee → money → effects, sorted within each class. Delegations take the owner module's locks in the owner's own order and run `verify` inside the owner's hook (P19 `afterCreditLock`, P09 `beforeFunds`, P20 expected payroll version `version:digest`), so a concurrent payout, allocation, receipt or payroll freeze either precedes the review (stale) or waits.

`AccountFundsService.available()` is now `max(book − active settlement holds, 0)` for every outward money action (expenses, transfers, payouts, refunds, salary). `book()` and `held()` are exported for P22/P24.

## Typed operations and authority

The closed registry and its authority/state/effect matrix are exported by `apps/api/src/modules/settlements/registry.ts` and captured in [authority-matrix.json](authority-matrix.json). Each operation requires `settlements` plus the owning screen grant and the target's assigned branch.

| Operation | Classification(s) | Owner path |
| --- | --- | --- |
| `product.observe` | `stock_observation` | P07 stock source + P07 `refreshHolds` (targeted holds of that variant's unhanded reservations). |
| `account.observe` | `account_observation` | Hold only; no money, gain or loss. |
| `account.resolve` | `missed_expense`, `missed_general_movement`, `company_loss_unclassified`, `employee_liability` | P09 expense/movement (`recordPaidMoney`), or a `settlement` withdrawal; liability → P20 obligation. Each replaces exactly its part of the hold. |
| `brand.correct` | `brand_correction` | P17 wallet linked correction keeping class/readiness; P03 `WalletService.allocateCorrection` consumes a pending lot remainder. |
| `brand.adjust` | `brand_commercial_unclassified` | `brand.adjustment` journal effect only; no cash and no operating effect. |
| `employee.adjust` | `payroll_addition`, `payroll_earning_deduction` | Delegates to P20 `payroll.adjustment` (current-unpaid/future only). |
| `source.resolve` | `source_review_correction`, `source_review_retained` | P13/P16/P17 settlement review: linked goods/fee corrections or retain-original; releases that review's hold only. |
| `incident.resolve` | `incident_review_correction`, `incident_review_retained` | P18 review at the incident branch, compensation not below the employee share. |
| `storage.refund` | `storage_credit_refund` | P19 refund definition; unallocated credit only; earned revenue unchanged. |
| `parcel.incident` | `parcel_incident_report` | P18 `incident.report` delegation (custody hold, no money). |
| `parcel.cancel` | `parcel_cancellation` | P06 `shipment.cancel` before handover; adapter-owned shipments are `SOURCE_ADAPTER_REQUIRED`. |

Deliberately routed elsewhere (no P21 resolver): missed actual transfer receipt → P15 `/goods-receipts`; storage charge correction of already allocated credit → not offered (blocked `STORAGE_CREDIT_ALLOCATED`); paid payroll month → no path (`PAYROLL_PERIOD_PROTECTED`); account `account.resolve` cannot be opened by itself, only from an observation case.

## Versioned routes

Closed Ajv contracts, examples and OpenAPI are in `packages/contracts/src/settlements/`.

| Route | Meaning |
| --- | --- |
| GET `/api/v1/settlements/catalog` | Granted targets, assigned branches, accounts/brands/employees/variants/categories and Cairo today. |
| GET `/api/v1/settlements/cases` | Filtered case list (target, state, branch, reference, recorded date range) plus pending P13/P18 reviews. |
| GET `/api/v1/settlements/cases/{caseId}` | Case, observation position (book now, active hold, available, remaining), resolutions and links. |
| POST `/api/v1/settlements/prepare` | Typed preview: facts before/after, effects, dependents, warnings, blockers, versions, digest. |
| POST `/api/v1/settlements/commands` | `settlement.confirm` with reason, operation, expected versions and digest. |
| GET `/api/v1/settlements/commands/{commandId}` | Scope-checked recovery of the retained result. |
| GET `/api/v1/settlements/opening/catalog`, `/opening/batches`, `/opening/batches/{batchId}` | Opening targets, batch list and detail with per-line source links. |
| POST `/api/v1/settlements/opening/prepare`, `/opening/commands`; GET `/opening/commands/{commandId}` | Opening preview (`DUPLICATE_OPENING_TARGET` with existing batch references), confirm (family `settlements.opening`) and recovery. |

POST routes require the session cookie, `X-CSRF-Token` and same origin. The web pages keep one command identity per reviewed intent in `sessionStorage` until a definite answer; a lost response disables a new submit, survives remount and is recovered with the same identity.

## P22 recovery

A case is a recoverable, auditable unit: `adjustment_case` state/version, `resolution.preview`/`effect_digest`, `command_outcome` and `case_link`. Open account cases are listed with their active hold (`account_hold_balance.active_minor`) and remaining unexplained amount. P22 must resolve through `SettlementService` (or a later typed resolver registered in the same registry), never by deleting a hold or editing the case row. Pending P13/P18 reviews remain in their owner tables and are listed by `/cases`.

## P23/P24 inputs

- Classifications are immutable on `settlements.resolution.classification`; join through `case_link` to the money movement, journal effect, stock source or obligation.
- Operating profit: only `missed_expense` posts a P09 expense (operating cost). `company_loss_unclassified`, `missed_general_movement` and `brand_commercial_unclassified` are explicitly outside operating profit until a justified classification. Opening lines (`money.opening`, `brand.opening`, `employee.opening`, opening stock source) are never operating revenue/expense; `opening_entitlement` is excluded from employee cost.
- Stock observations are `inventory.stock_source` rows (`kind='adjustment'`, `source_system='settlement'`) with signed deltas; an observation never creates a brand receipt.
- Account positions: `book` (finance balance), `held` (active settlement holds), `available` and the case's `estimatedActualMinor`.

Known validation boundary: automated Vitest, native PostgreSQL/HTTP and real-browser evidence are listed in [README](README.md). The owner manual/device trial is unrun; no Tawsel request or new independent public acceptance is part of P21.
