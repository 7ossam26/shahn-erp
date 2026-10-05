# P07 — Stored-stock orders, reservation and preparation

**Git workflow (owner instruction, 2026-10-05):** Execute P07 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 7: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Execute this phase only

Complete the third service: staff choose a brand's products already physically present at an assigned branch, confirm an order that reserves every required variant atomically, prepare it, and inspect where its quantities are committed. Short stock must stop confirmation clearly. The result extends P06's existing shipment model and P05's real inventory; it must not create a separate fulfillment application or a second receipt of the same goods.

PLAN-001 is approved through ERP-D-205 / ERP-R-214. Recommended execution setting: **gpt-6.1-sol, high** for the connected stock/order workflow. [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md) records availability checked 2026-10-03. The owner sets the model manually.

## Source contract and required reading

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md), relevant workspace instructions, P05/P06 prompts and their actual execution records. Read [Domain specification](../docs/planning/ERP-DOMAIN-SPEC.md) sections 3.3, 4, 5, 6.1 and DOM-01/DOM-02/DOM-03/DOM-18; [Data specification](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) sections 1–4, transaction rows for confirmation/correction/preparation/cancellation, and sections 8–11. Read [Screen specification](../docs/planning/ERP-SCREEN-SPEC.md) UI-PREPARATION-001, UI-INVENTORY-001, UI-SHIPMENT-001, stock-order entry and filter rules. Inspect the [UI brief](../UI-DESIGN-BRIEF.md), [review](../UI-REVIEW-LOG.md) and existing approved mobile/desktop components.

Requirements owned or materially consumed: ERP-R-024, ERP-R-047, ERP-R-049, ERP-R-054, ERP-R-064, ERP-R-065, ERP-R-069, ERP-R-070, ERP-R-071, ERP-R-072, ERP-R-077, ERP-R-093, ERP-R-094, ERP-R-095, ERP-R-096, ERP-R-131, ERP-R-132, ERP-R-141, ERP-R-158, ERP-R-159, ERP-R-172, ERP-R-182. Governing decisions: ERP-D-046, ERP-D-052, ERP-D-064, ERP-D-065, ERP-D-068, ERP-D-076, ERP-D-091, ERP-D-092, ERP-D-093, ERP-D-094, ERP-D-123, ERP-D-132, ERP-D-149, ERP-D-150, ERP-D-163, ERP-D-173. These identifiers come from the registers; do not resurrect automatic tier selection or insufficient-stock confirmation from earlier proposals.

## Prove prerequisites before dependent work

P05 must expose actual variant positions/movement history and transactional mutation methods. P06 must expose one common shipment confirmation/revision/price/preparation model. P04 must produce a valid tariff/policy snapshot. P03 must provide a real single-connection `UnitOfWork`, stable command identity and native result recovery. P02 must authorize an assigned branch on the server.

Run schema status and the focused P05 receipt/P06 missing-price cases on a real PostgreSQL database. Verify the seeded variant exists with known stock and that creating a shipment never independently commits an order before its inventory operation. Inspect repository services for hidden nested transactions. Reuse and fix a narrow shared interface if needed; record that change and rerun its affected checks. If the prior implementation is merely mocked or lacks actual row locking, record the exact missing guarantee and block stock confirmation until repaired. Do not claim concurrency from a single in-process mutex.

## Non-negotiable workflow and quantity rules

The brand must enable `stored_stock`; one order chooses exactly that service. Select active brand variants at one assigned stock branch, positive whole quantities, brand-declared outstanding unit values and the same recipient/address/inspection/tariff fields as P06. Repeated variant selection must be combined into one quantity requirement before availability checks; do not let two individually acceptable lines overbook one position. Preserve distinct commercial lines when unit outstanding values differ while using their summed variant requirement for reservation.

Before confirmation, show current available quantities and price. Confirmation rechecks every line and the captured reference revisions under the transaction. A shortage anywhere rejects the entire order, naming the missing variant and shortage; no waiting-stock order, partial successful reservation, reference-bearing false registration or automatic substitute variant is allowed. Partial-delivery permission affects later customer outcomes, not this gate. Missing price equally rolls back all effects, even if stock is sufficient.

For each branch/brand/variant retain P05 equations: physical equals sound plus unavailable; reserved is active order plus loose-transfer reservations; available is the nonnegative difference between sound and reserved; shortage is the nonnegative difference between reserved and sound. Confirming stored-stock order decreases available through reservation, but changes neither sound on-hand nor physical custody. It creates no inbound receipt and no goods/service earning. A zero-recipient-due order still requires actual stock and a valid commercial tariff.

Preparation state is `awaiting_preparation` until authorized staff explicitly complete it. Completion checks the current revision, physical allocation and absence of shortage. Packed components remain sound and reserved at the branch until actual handover. The parcel monitoring row references these same units. Do not add parcel quantity to component stock or create an extra movement on completion. Later P12 accepted handover and P15 physical transfer will consume/move these allocations through the exported inventory service.

Cancellation is permitted only before driver handover and uses a reason. An unprepared cancellation releases its reservations, returning available quantity. A physically prepared cancellation releases order reservations but moves the affected quantities from sound to unavailable with reason `awaiting_unpack_inspection`; total physical stock stays unchanged. This selected plan mechanic prevents sealed goods being promised before staff have made them usable. Provide a focused actual unpack/condition confirmation in preparation history: sound confirmed units move unavailable→sound, damaged/uncertain units remain unavailable. No packing/refurbishing fee, new inbound receipt or monetary effect follows. This narrowly scoped confirmation is not P21's general adjustment page.

Pre-handover correction of quantities/service/branch must preview and commit one complete delta. Lock the union of old and new positions in stable order; release/replace claims atomically. An increase that is short must leave the old valid order and reservation intact. A corrected branch requires goods actually at that branch and authority over the affected branches; it must not simulate a physical transfer. Prepared contents that change need explicit renewed preparation/inspection, not a stale complete flag. Reuse P06 pricing-snapshot/correction rules, preserving unrelated old tariff values. Once canonical source/dispatch authority exists, honor its documented state/version guard; do not bypass it because the order originated in this phase.

If a later true stock correction yields sound 5/reserved 7, hold all unhanded reservations involving that variant. Display shortage 2 and allow replenishment or explicit authorized order revision/cancel; do not silently release the newest reservation or block unrelated variants. P21 owns the observation entry; P07 must make its resulting hold effective in preparation and expose it to P12 handover.

## Concrete implementation targets

- `packages/database/migrations/0007_p07_stock_fulfillment.sql`: order reservation/allocation links, unique active reservation source, preparation condition/unpack records and shortage-hold relationships. Extend existing shipment tables rather than fork them. Same-company/brand/branch relationships and positive quantity checks are required. Existing ready/company-packed shipments remain intact and receive no invented component allocation.
- `packages/database/src/inventory/stock-reservations.repository.ts`: transactional reserve/replace/release/condition methods, plus deterministic multi-position locking. Use safe upsert for missing position locks and recheck availability after waiting. Permit truthful shortage state in constraints. One source transition cannot produce two movements.
- `packages/domain/src/inventory/reservation-policy.ts` and `packages/domain/src/shipments/preparation-policy.ts`: checked aggregation, stock effects, cancellation/unpack and eligibility rules. No frontend-only invariant and no hardcoded employee role.
- `packages/contracts/src/shipments/` and `inventory/`: extend common `POST /api/v1/shipments` for stored-stock service, versioned correction preview/commit, cancellation and preparation completion. Add `POST /api/v1/shipments/{id}/unpack-inspection` for the bounded actual condition confirmation, with exact remaining quantities and `expectedVersion`. Add reservation explanations to authorized variant/order reads. Define error details for stock shortage, preparation held and invalid state.
- `apps/api/src/modules/shipments/` and `inventory/`: orchestrate confirmation through one shared `UnitOfWork`. Commit shipment/revision/price snapshot, all reservations, queue item, audit and command result together. No external HTTP belongs inside that transaction.
- `apps/web/src/features/preparation/`: `/preparation` main queue and a focused new stock-order page `/preparation/orders/new`; reuse recipient and pricing form sections. Add per-line availability, shortage summary, explicit preparation action and focused cancel/unpack flows. Extend shipment/inventory details with linked allocation history.

Preparation list frequent filters are assigned branch and awaiting/ready/blocked state. Advanced filters include brand, service, creation date and shortage; later credit/sync blockers must report only actual available facts. Branch changes in an uncommitted form must revalidate selections and explain invalid lines, not silently reserve from a different branch. Use the shared sparse RTL shell, clear next action and mobile cards. Amounts, counts, pending state and connection errors must be readable without hover.

## Ordered checkpoints

1. **Connected business examples.** Define schemas and quantity/price/cancellation examples in Vitest using actual command orchestration interfaces. Assert no duplicate receipt, no aggregate line undercount and no partial confirmation before writing the live form.
2. **Real atomic reservation.** Apply migration and run two independent database connections against the last unit. Use a barrier so both contend; one order succeeds and one receives the shortage, with exact persisted counts. Repeat multi-line race in reverse input order to exercise stable locking.
3. **Preparation and correction safety.** Prove successful completion does not move physical stock. Test correction failure leaves old reservations unchanged, prepared cancellation preserves quantity through unavailable state, and unpack reuses only sound inspected units. Use real transactions, not mocked repositories, for these claims.
4. **User journey and recovery.** Implement API-backed screens, stale stock/version explanation, missing tariff and unknown-response recovery. Revoke a branch between load/submit and verify server denial with preserved input. Capture mobile and desktop, including long variant names and a blocked order.
5. **Handoff.** Register P07 tests, run relevant unit/DB/browser checks, typecheck/lint/build, and publish explicit allocation/hold interfaces consumed by P12/P14/P15/P21. Do not claim those later workflows work yet.

## Required acceptance cases

| ID | Given / When | Then and verification |
| --- | --- | --- |
| P07-AC-01 | Stock Blue 5/Red 3; confirm quantities Blue 2/Red 1. | On-hand remains 5/3; reserved 2/1; available 3/2; one awaiting-preparation shipment and no receipt. Vitest, DB, browser. |
| P07-AC-02 | One line is unavailable or tariff missing. | Entire new order fails with zero new reservations/custody/outbox/charge, input retained. DOM-02. |
| P07-AC-03 | Two orders compete for last Blue unit. | Exactly one confirmation, no negative availability and no partially committed losing order. DOM-03, independent DB connections. |
| P07-AC-04 | Two commercial lines reference Blue, quantities 3 and 3, with only 5 available. | Aggregate shortage 1 rejects even when values differ; no line-by-line overbooking. |
| P07-AC-05 | Complete packing then cancel Blue 2/Red 1. | Order claims released; same units unavailable pending actual unpack; physical quantity unchanged. Inspect sound Blue 1/damaged Blue 1: only 1 becomes available. |
| P07-AC-06 | Increase Blue reservation from 2 to 6 with insufficient stock. | Original reservation 2 and shipment revision survive unchanged; error explains incremental shortage. |
| P07-AC-07 | A fixture has actual 5/reserved 7. | Shortage 2 visible and affected completion/handover eligibility false; unrelated variant can prepare. DOM-18. |
| P07-AC-08 | Commit confirmation and lose response, then replay. | Original numeric reference/reservations returned once; different payload with same ID conflicts. |
| P07-AC-09 | Attempt cancellation/correction against stale or handed-over state. | No release/stock change; latest state explained and no local override of execution. |

Run `npm run test:phase -- P07` and the recorded scoped verification commands. Connected Vitest is mandatory, real PostgreSQL establishes all-or-none persistence/races, and browser tests establish the actual Arabic responsive journey. No successful mock count replaces a missing database result.

## Owner's manual trial and truthful finish

In a safe test company receive Blue 5/Red 3 through P05. Register a stock order for Blue 2/Red 1 with goods 250/base 50/uplift 5. Confirm recipient 305, unchanged on-hand, reservations and visible queue. Finish preparation, inspect Products and Parcels without adding their totals together, then cancel with a reason. Observe unavailable packed units and confirm actual unpack with one damaged Blue. Open two sessions competing for the last available unit and verify one clear rejection. Retry a committed confirmation after a simulated lost response using the retained identity and inspect unchanged counts. Include an insufficient tariff attempt and preserved input.

Deliver source, migration, schemas, tests and evidence under `docs/verification/P07/`; update `phases/execution/P07.md`, implementation status and source traceability with exact actual commands/outcomes. Record any unrun concurrency/browser check and its impact. **Stop after this phase's verified scope and handoff. Do not begin P08, make external shipments, alter Tawsel, deploy, publish, purchase, pay or merge automatically.**

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-011`, `ERP-R-032`, `ERP-R-036`, `ERP-R-047`, `ERP-R-049`, `ERP-R-070`, `ERP-R-072`, `ERP-R-076`, `ERP-R-093`, `ERP-R-094`, `ERP-R-095`, `ERP-R-107`, `ERP-R-141`, `ERP-R-159`, `ERP-R-172`, `ERP-R-174`, `ERP-R-182`, `ERP-R-187`, `ERP-R-208`.

Decisions: `ERP-D-012`, `ERP-D-021`, `ERP-D-030`, `ERP-D-031`, `ERP-D-035`, `ERP-D-041`, `ERP-D-046`, `ERP-D-049`, `ERP-D-065`, `ERP-D-068`, `ERP-D-075`, `ERP-D-091`, `ERP-D-092`, `ERP-D-093`, `ERP-D-100`, `ERP-D-102`, `ERP-D-132`, `ERP-D-148`, `ERP-D-150`, `ERP-D-163`, `ERP-D-165`, `ERP-D-169`, `ERP-D-173`, `ERP-D-178`, `ERP-D-199`, `ERP-D-203`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
