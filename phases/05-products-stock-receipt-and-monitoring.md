# P05 — Products, actual stock receipt and daily monitoring

**Git workflow (owner instruction, 2026-10-05):** Execute P05 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 5: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Execute this phase only

Implement the first usable inventory result: authorized staff can define a brand's products and variants, record stock actually received at an assigned branch, and inspect reliable Products/Parcels inventory views. This prompt is implementation authority only when the owner invokes P05. PLAN-001 was approved through ERP-D-205 / ERP-R-214; this authored prompt is not evidence that any implementation or test exists.

Recommended execution setting: **gpt-6.1-sol, high**. The bounded full-stack result needs careful quantity and permission handling. Availability and official guidance were checked on 2026-10-03 in [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md). The owner selects the setting manually; this text does not switch models.

## Required reading and traceability

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md), applicable repository instructions and the current implementation status. Then read these exact sources:

- [Domain specification](../docs/planning/ERP-DOMAIN-SPEC.md), sections 3.3, 4.2–4.3, 6.1, 14 and DOM-03/DOM-18.
- [Data specification](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md), sections 1–4, 7–10 and 11. Inventory equations, missing-row locks and retained history are required, not optional context.
- [Screen specification](../docs/planning/ERP-SCREEN-SPEC.md), UI-PRODUCT-SETUP-001, UI-STOCK-RECEIPT-001, UI-INVENTORY-001, shared interaction and advanced filters.
- [UI brief](../UI-DESIGN-BRIEF.md), [UI review](../UI-REVIEW-LOG.md), approved `ui-preview/` inventory presentation and desktop/mobile inventory captures under `output/playwright/`.
- [Decision register](../ERP-DECISIONS.md) and [requirements](../ERP-DISCOVERY-LOG.md): ERP-D-032, ERP-D-046, ERP-D-068, ERP-D-120, ERP-D-123, ERP-D-132, ERP-D-168, ERP-D-199; ERP-R-019, ERP-R-033, ERP-R-049, ERP-R-069, ERP-R-071, ERP-R-127, ERP-R-128, ERP-R-131, ERP-R-132, ERP-R-141, ERP-R-156, ERP-R-177, ERP-R-208. Update their P05 acceptance links in traceability without claiming later reservation/return workflows are implemented here.

## Observable prerequisites

P01–P04 must supply runnable workspaces, reviewed presentation components, actual authenticated company/branch scope, P03 `UnitOfWork`, audit/idempotency primitives and P04 active brands. Inspect their execution records and run `npm run db:status`, targeted prerequisite tests and a real API read as both a one-branch and multi-branch user. Confirm that a revoked branch is rejected by the server. Find the existing migration runner and current schema before adding tables.

The money conversion utility is not a stock valuation requirement. An empty shipment table or absent later shipment module must not require fake parcel fixtures in production. The Parcels view can truthfully explain that no parcels are registered until P06 exists; establish its read boundary without inventing custody. A small missing shared export or UI primitive may be repaired and recorded. Missing authenticated scope, transaction ownership or a running PostgreSQL test harness is a material prerequisite; do not substitute an in-memory map and certify inventory safety.

## Product and quantity rules

Products and variants belong to one company and brand. Product setup requires a name and at least one named or default variant. Optional option labels such as size/color are descriptive. Generate immutable IDs; renaming never merges stock. A repeated display combination produces a warning to inspect existing variants, not a fuzzy identity join. Deactivation prevents new ordinary use but preserves balances, history and completion/return of already accepted work. No product setup action receives stock, assigns company ownership value, or posts profit.

Actual receipt selects an assigned receiving branch, brand, active variants, positive whole quantities, actual receipt date and condition. Sound units increase sound on-hand. Damaged or uncertain units increase unavailable on-hand. One receipt can have several lines and commits all lines or none. A receipt is the staff member's assertion that goods physically arrived; an order, supplier promise, return offer or browser draft is insufficient. A past actual date retains the server's current recorded time; it does not overwrite a historical stock snapshot. Reject a future actual-receipt date. A later correction uses linked history rather than editing a posted receipt's quantity.

For each branch/brand/variant compute:

```text
physicalOnHand = soundOnHand + unavailableOnHand
reserved = activeOrderReservations + activeLooseTransferReservations
available = max(soundOnHand - reserved, 0)
reservationShortage = max(reserved - soundOnHand, 0)
```

Reserved quantities are claims within physical stock, not extra units. Do not create an invariant `reserved <= soundOnHand`: later truthful observations can reveal actual 5 versus reserved 7. That result must show shortage 2 and hold affected unhanded work, not fabricate stock or arbitrarily release one order. P05 establishes the reusable shortage calculation and storage; P07 creates reservations and P21 owns ordinary actual-quantity adjustments. There is no count-session engine, inventory freeze, barcode/printed-label workflow, purchasing, serial/lot tracking or manufacturing.

Default inventory scope is goods physically at selected assigned branches. Driver/carrier-held material is a separately labeled view and cannot increase branch available stock. Packed stored-stock components will remain the same reserved product allocation; Parcels is a custody presentation of that allocation, never a second company inventory quantity. Authorized company-wide tracking is a separate later screen, not an exception to this inventory API's branch scope.

## Planned implementation slices

Use these targets, adapting only mechanical conventions already established by P01–P03 and recording that adaptation:

- `packages/database/migrations/0005_p05_products_stock.sql`: `product`, `product_variant`, `stock_position`, `stock_receipt`, `stock_receipt_line`, `stock_movement` and the reservation/condition source relationships needed by the agreed model. Add same-company/brand composite foreign keys; unique stock-position key; nonnegative physical quantities; source-effect uniqueness; version and timestamp fields. Do not backfill stock from names or create fictional receipt history. Existing installations start with no new stock rows.
- `packages/database/src/inventory/`: explicit SQL repositories and `StockPositionRepository` methods accepting the caller's transaction. Create a missing position safely under its unique key, then lock it; locking an empty result is not protection. Acquire affected positions in sorted branch/brand/variant order. Persist all line movements, updated positions, receipt, audit and command result together.
- `packages/domain/src/inventory/`: checked whole-quantity arithmetic, condition rules, position equations and source-effect rules. JSON quantities must be safe integers and every aggregate addition checked before database persistence; never narrow a safe integer into an overflowing SQL integer.
- `packages/contracts/src/inventory/`: closed request/response schemas, invalid examples and generated client types. Native routes: `POST /api/v1/brands/{brandId}/products`, `PATCH /api/v1/products/{productId}`, `POST /api/v1/inventory/receipts`, `GET /api/v1/inventory/products`, `GET /api/v1/inventory/parcels`, and receipt/variant detail-history queries. Mutations use `commandId`, `schemaVersion`, and `expectedVersion` for existing records. Define deactivate as an explicit versioned product update, not DELETE.
- `apps/api/src/modules/inventory/`: authorization, command services and read queries. Module access grants its operations while scope/state still apply. Unknown variants, mixed brands, inactive new-use targets, fractional/negative/unsafe quantities and forbidden branches reject before commit. Read filters are parameterized and allowlisted.
- `apps/web/src/features/inventory/` and `products/`: actual API-backed setup, receipt, monitoring and movement details. Add module-card navigation through the existing registry, preserving the reviewed shell. Keep developer SQL controls and unsupported financial buttons out of the UI.

Native command deduplication uses P03's company/principal/command-family/command-ID scope. Repeating the same receipt request after a lost response returns its original receipt; changing the payload with that key conflicts. Reauthorize before reading an old result. Source movement uniqueness additionally prevents duplicate business effects if a later handler references the same receipt through a different transport request.

## User journey and filters

The Products page answers what is here, what can be promised and what is unavailable. Its main action is Record stock receipt. Product setup is a separate focused route at `/brands/:id/products`; receipt is `/inventory/receipts/new`. For a single assigned branch display only that branch. For multiple assignments require an explicit current choice and show it in confirmation. After receipt, link its immutable detail and affected variant history; offer a deliberate new receipt action with a new identity.

Use Products/Parcels only as a local switch. Desktop rows become readable mobile cards; do not add a global sidebar. Display on-hand, reserved, available, unavailable and shortage with words, not color alone. Frequent filters are search, branch and brand. Advanced product filters are product/variant, available/reserved/unavailable category, no-available-stock and last-movement date. State clearly that a movement-date filter selects positions with movement in that interval; balances remain current. Parcels filters are service/custody/preparation/received date when those fields exist after P06. Unsupported later filters must not claim to filter nonexistent facts.

Apply filters server-side: AND between fields, OR within a multi-select, stable tie-breaker pagination, default 25 with 50/100 options. Reset pagination when filters change; preserve query state on detail/back. Permission changes invalidate previously selected branches. Loading failure is distinct from no results. Unknown receipt outcome retains the command ID and checks its result. Offline commands wait for connectivity; never display a browser draft as received stock.

## Ordered checkpoints

1. **Contract and invariant slice.** Define schemas, source identities and quantity examples first. Run focused Vitest for mixed conditions, shortage calculations, invalid quantities and duplicate command behavior. Continue only when the UI and server share exact units and field meanings.
2. **Migration and repositories.** Apply to a fresh real test database and an existing P04 database. Inspect constraints/indexes and prove company/brand mismatch rejection. Use separate committed transactions for simultaneous first receipt of the same previously absent position. Both legitimate receipts must survive, with their quantities added exactly once.
3. **Atomic receipt API.** Add audit and result recovery using P03. Interrupt between first line and final commit: no line or receipt may persist. Interrupt after commit before response: retry recovers the same reference. Reconcile positions to movements. Repair any invariant failure before enabling the confirmation button.
4. **Monitoring and setup UI.** Implement the complete Arabic RTL forms and histories with real API data. Run a denied-scope browser request, stale product edit and receipt connection-loss recovery. Capture mobile/desktop and verify long labels, condition explanations and focus.
5. **Handoff boundary.** Expose reusable stock read/reserve/condition interfaces for P07/P15/P21 with explicit transaction ownership. Register P05 in the phase runner, execute scoped checks and record remaining later-owned behaviors honestly.

## Acceptance and verification

| ID | Given / When | Then and required evidence |
| --- | --- | --- |
| P05-AC-01 | Brand A has no products; staff create variant Blue. | Stable IDs exist, quantity remains zero and no movement/profit fact exists. Connected Vitest plus PostgreSQL. |
| P05-AC-02 | Receive 10 sound and 2 damaged Blue at branch A. | On-hand 12, unavailable 2, sound/available 10, reserved 0; one receipt and exact history. API, real DB, browser/manual. |
| P05-AC-03 | Two connections receive 3 and 4 units into a missing position concurrently. | Final sound 7 and two unique receipts; no lost update or duplicate position. Real PostgreSQL barriers. |
| P05-AC-04 | Multi-line receipt has one unauthorized or fractional line. | No receipt, movement, position increment or successful audit effect commits. Real DB and Vitest. |
| P05-AC-05 | Response is dropped after the 12-unit receipt commit; repeat the original command. | Same receipt/result and on-hand 12; changed payload conflicts; revoked access cannot recover its data. Real API/DB. |
| P05-AC-06 | A test fixture has sound 5 and active reservations 7. | Available 0, shortage 2, affected work held; unrelated variant usable. This checks the shared model without claiming P07/P21 UI exists. |
| P05-AC-07 | User assigned only A tampers inventory query or receipt to B. | Server rejects; no B quantity or name leaks. Tracking permission does not alter this result. |
| P05-AC-08 | Apply branch/brand/condition filters, open history, then Back on phone. | Filters restore; current balances retain their meaning; no overflow, misleading zero or hidden active filter. Browser plus captures. |

Use important connected Vitest tests for receipt service behavior, not only getter snapshots. Real PostgreSQL tests use actual commits and independent connections; an outer rollback fixture does not prove durability. Run `npm run test:phase -- P05`, typecheck, lint and build, recording exact commands and outcomes. An unavailable DB/browser leaves the corresponding claim unverified.

## Manual trial, deliverables and stop

In a marked development company seed branches A/B, an A-only inventory user and a multi-branch user, plus one active brand. Create Blue and Red; verify zero balances. Receive Blue 10 sound/2 damaged and Red 3 sound at A. Search Blue, inspect 12 physical/10 available/2 unavailable, open the receipt and return with filters retained. Attempt a negative receipt and a tampered B request; confirm no additional movement. Submit a valid receipt with a controlled lost response, recover its command and verify one result. Record the exact fixture IDs and reset only the isolated test batch through the safe harness.

Deliver migrations, repositories, schemas/examples, API, complete screens, meaningful tests and captures under `docs/verification/P05/`. Update `phases/execution/P05.md`, implementation status and relevant traceability with actual commands, failures, corrected reruns and skipped checks. Document reusable stock interfaces and the fact that reservations, transfers, actual returns and manual adjustment screens remain their later phases' work. **Implement and verify P05 only, write the truthful handoff, and stop. Do not begin P06, modify Tawsel, deploy, purchase, pay, publish or merge automatically.**

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-049`, `ERP-R-069`, `ERP-R-113`, `ERP-R-127`, `ERP-R-131`, `ERP-R-132`, `ERP-R-169`, `ERP-R-208`.

Decisions: `ERP-D-030`, `ERP-D-041`, `ERP-D-046`, `ERP-D-068`, `ERP-D-091`, `ERP-D-107`, `ERP-D-111`, `ERP-D-120`, `ERP-D-123`, `ERP-D-160`, `ERP-D-199`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
