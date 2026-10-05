# P06 — Physically received parcel intake and company packing

**Git workflow (owner instruction, 2026-10-05):** Execute P06 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 6: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Execute this phase only

Deliver ordinary shipment registration for **brand-packed ready parcels** and **brand-supplied orders that the company packs**. Staff transcribe the brand's waybill, see exact goods/shipping totals, confirm actual branch receipt and find the resulting parcel with a numeric reference. Ready parcels skip preparation; company-packed orders enter a preparation queue and require explicit completion. This phase produces usable commercial/custody records, not Tawsel dispatch.

PLAN-001 approval is ERP-D-205 / ERP-R-214. Recommended model: **gpt-6.1-sol, high**, for a bounded but connected pricing, custody and form workflow. Availability was checked on 2026-10-03; read [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md). The owner chooses the actual setting manually.

## Read before implementing

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md) and current repository instructions. Required detailed sources:

- [Domain specification](../docs/planning/ERP-DOMAIN-SPEC.md), sections 3–5, 6.1, 8 and DOM-01/DOM-02/DOM-05.
- [Data specification](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md), sections 1–4, Confirm order/Correct order/Preparation/Cancel transaction rows, and sections 8–9.
- [Screen specification](../docs/planning/ERP-SCREEN-SPEC.md), UI-INTAKE-001, UI-PREPARATION-001, UI-SHIPMENT-001, shipment-entry validation and shared filters/states.
- [Integration plan](../ERP-TAWSEL-INTEGRATION-PLAN.md), source snapshot/line/money mapping and intake constraints. Read the retained canonical RecipientPhone, SourceSnapshot, Money and line definitions and their accepted/rejected examples referenced there. Reading this does not authorize an external command in P06.
- [UI brief](../UI-DESIGN-BRIEF.md), [UI review](../UI-REVIEW-LOG.md), the approved shipment detail/timeline sample and shared form presentation.

Owned/consumed requirements: ERP-R-011, ERP-R-024, ERP-R-031, ERP-R-032, ERP-R-033, ERP-R-036, ERP-R-038, ERP-R-042, ERP-R-047, ERP-R-048, ERP-R-051, ERP-R-053, ERP-R-054, ERP-R-064, ERP-R-072, ERP-R-076, ERP-R-077, ERP-R-094, ERP-R-095, ERP-R-096, ERP-R-156, ERP-R-157, ERP-R-158, ERP-R-159, ERP-R-172, ERP-R-182. Governing decisions: ERP-D-012, ERP-D-031, ERP-D-035, ERP-D-037, ERP-D-041, ERP-D-046, ERP-D-049, ERP-D-051, ERP-D-052, ERP-D-064, ERP-D-065, ERP-D-075, ERP-D-076, ERP-D-092, ERP-D-093, ERP-D-094, ERP-D-148, ERP-D-149, ERP-D-150, ERP-D-163, ERP-D-173. Preserve deferred barcode/labels, Excel entry and brand portal; do not create them here.

## Verify prerequisites

P01–P05 must provide the approved shell, real authenticated scope, native transaction/idempotency/audit services, company brands and tariff snapshots, and actual parcel/stock custody interfaces. Inspect execution evidence, run `db:status`, and demonstrate P04 pricing for a governorate base, optional area override, explicit zero and missing price. Verify P05 inventory scope with a restricted user. Brand policies must return enabled/default service, partial permission and fixed packing uplift with revisions.

Find P03 numeric-reference support or add the narrowly required sequence through this migration; never use a client counter or `MAX + 1`. Observe whether any real integration source mapping exists. P06 alone must not create a successful assignment, invoke an invented Tawsel intake API or start a driver round. Small missing exports are repairable with evidence; absent pricing, scope or transaction guarantees block dependent confirmation and must be recorded.

## Embedded business contract

Each shipment has one brand, one recipient/address, one service, whole-piece lines and one immutable internal identity. Generate a digits-only human reference at committed confirmation; sequence gaps are acceptable and references are never reused. Optional brand reference may be blank. Within-brand repeated reference produces a visible warning and requires deliberate acknowledgement; it is not a unique key, automatic merge or reason to infer an existing order from the same phone.

Capture assigned receiving branch, brand, enabled service, recipient name, phone, address, governorate, optional area, optional safe HTTP/HTTPS location link, line descriptions/quantities, brand-declared outstanding amounts, explicit inspection choice and comment. Do not server-fetch a location URL or treat it as verified coordinates. Normalize supported Arabic digits and permitted phone display separators while retaining entered display text. Before confirmation validate the canonical phone shape `^(?:\+[1-9][0-9]{7,14}|01[0125][0-9]{8})$`; `01012345678` and `+201012345678` pass, `123`, missing phone, text and comma-separated numbers fail. This checks syntax, not ownership or reachability.

Use the pinned source's exact string/line bounds, including 1–100 lines, positive whole quantity at most 1,000,000 per line, recipient/line descriptions within documented limits, and checked money conversion. Reject overlong input rather than silently truncate it. Keep inspection distinct from partial-delivery policy; any later integration delivery-instruction rendering must follow its adapter, not a fabricated inspection wire field.

Native Money is `{currency: "EGP", amountMinor: "25000"}`. P03 exact decimal parsing converts user EGP to integer piastres without floating point. Preserve per-unit outstanding values needed for whole-piece partial delivery. When values differ, use distinct lines with stable identities; never allocate an aggregate prepaid total proportionally by guesswork. Do not administer the original purchase/deposit transaction with the brand.

Use manually assigned tariff tier, required governorate and optional matching area override. Snapshot base shipping, fixed packing uplift, complete tariff, payer/outstanding components and policy/rate revisions. Ready service has no packing uplift. Company packing adds the configured uplift once to the service tariff; completing or repeating packing earns no extra fee. Missing applicable tariff blocks the **entire confirmation**: no shipment, receipt, custody movement, queue item, reservation, source outbox or financial charge. Explicit configured zero is valid. A later tariff edit never reprices the old order silently.

Examples to preserve:

- Goods 100 + 150, ready shipping 50: recipient due 300, future goods entitlement basis 250, commercial fee 50. Registration itself earns no fee or brand credit.
- Company packing with base 50/uplift 5 and goods 250: recipient due 305; commission basis remains base 50 for later phases.
- Goods already paid to brand and shipping unpaid: goods outstanding 0, recipient shipping 50, total 50.
- Goods and shipping already paid to brand: recipient total 0, commercial shipping still 50 and future brand-paid liability 50. No goods credit or fictitious cash receipt is created now.

Confirmation of ready service asserts actual receipt of a complete parcel and sets preparation `not_required`. Company-packed service asserts actual receipt of shipment-bound goods and sets `awaiting_preparation`. Neither path receives reusable loose SKU stock. A form saved in memory is an uncommitted draft, not a physical assertion. Preparation completion records actor/time and marks ready for later dispatch; it does not transfer custody, post a visit fee or certify Tawsel readiness.

Before handover, reasoned cancellation changes commercial state but leaves externally supplied goods in branch custody until actual brand return in P14. Pre-handover correction may fix recipient/pieces/service or a wrongly recorded branch only when goods really are at the corrected branch. It is not a physical transfer. Review the complete before/after price/custody/preparation effects. Ordinary tariff changes alone preserve the snapshot; correction of erroneous service reuses the captured base and agreed applicable uplift, records a new explicit correction snapshot, and never hides repricing. If already integrated, require the later documented source-revision/cancellation adapter rather than silently overriding source state. Driver handover/departure forbids these local shortcuts.

## Data, API and UI targets

- `packages/database/migrations/0006_p06_parcel_intake.sql`: shipment, immutable revisions/lines, price snapshot, preparation, receipt/custody relationship and numeric reference sequence/unique constraint. Use composite company/brand/branch FKs, unique command/source receipt identity and a version on mutable aggregate state. Do not backfill dummy shipments or financial entries. Install on fresh and existing P05 databases.
- `packages/domain/src/shipments/`: line totals, service gates, preparation and pre-handover transitions, correction preview and price snapshot policy.
- `packages/database/src/shipments/`: repositories taking the shared transaction; atomic shipment/revision/receipt/custody/preparation/audit/result writes. Expose a confirmation service that P07 can reuse with stored-stock allocation instead of a second receipt.
- `packages/contracts/src/shipments/`: closed schemas and examples. Routes: `POST /api/v1/shipments`, `GET /api/v1/shipments/{reference}`, `POST /api/v1/shipments/{id}/corrections/preview`, `POST /api/v1/shipments/{id}/corrections`, `POST /api/v1/shipments/{id}/cancel`, `GET /api/v1/preparation`, `POST /api/v1/shipments/{id}/preparation/complete`. Preview is nonmutating and not authorization for a later stale commit. Use command envelope/version and recover through the shared native command route.
- `apps/api/src/modules/shipments/` and preparation services: enforce assigned branch and screen capability; lock current aggregate and authoritative policy revisions before committing. Return stable typed field errors for missing tariff, invalid recipient/line, stale state or forbidden branch. Export a source-ready immutable snapshot interface, but do not create a fake accepted external task.
- `apps/web/src/features/shipments/` and `preparation/`: `/shipments/new`, numeric-reference detail, grouped entry sections, focused correction/cancel dialogs and preparation list. P05 Parcels reads real shipment custody. Display actual local timeline milestones only; no imagined progress percentage, ETA or driver state.

The entry page's main action is Register received parcel. Show missing setup beside its cause and retain input after rejection. Branch is fixed for a sole-branch user. Confirmation summarizes goods, base/uplift, recipient due, brand-funded shipping and actual receipt location. After success, open the committed detail with one clear next step. A duplicate-reference warning should not look like transport retry recovery. Preparation filters include branch, brand, service, creation period and waiting/complete state; later sync/credit blockers remain accurately unavailable until their owners implement them.

## Ordered checkpoints and focused checks

1. **Readiness and contracts:** inspect prerequisites; define all four money examples, valid/invalid phone and price snapshots. Connected Vitest must exercise the confirmation service with pricing, service choice and validation together.
2. **Migration and atomic confirmation:** run actual PostgreSQL migration/upgrade tests. Inject a failure after receipt creation and before commit; assert no shipment/custody/queue survives. Concurrent legitimate creations receive distinct numeric references. A replay returns the original reference.
3. **Preparation/correction:** implement versioned transitions and source-state guard. Test ready service skipping preparation, company-packed completion and stale cancellation/completion races. Confirm cancellation retains parcel custody and tariff edits do not change existing snapshots.
4. **Complete browser journey:** real backend entry, missing tariff, prepaid forms, duplicate-reference warning, correction preview, cancel and detail/back. Capture 390x844/1440x1050 plus narrow/long-text checks using the approved design. Avoid stacking every action on detail.
5. **Verification and handoff:** register P06 suites, run typecheck/lint/build and meaningful unit/DB/browser checks; document exact reusable shipment and custody interfaces for P07/P11/P12/P18.

## Acceptance cases

| ID | Given / When | Then |
| --- | --- | --- |
| P06-AC-01 | Confirm ready goods 100 + 150 and fee 50. | Numeric reference, branch receipt and parcel exist once; recipient 300, goods 250, preparation not required; no earned money. DOM-01. |
| P06-AC-02 | Confirm company-packed equivalent with uplift 5, then finish preparation twice. | Recipient 305, base 50/uplift 5, one receipt, one completion; no loose stock or per-packing charge. |
| P06-AC-03 | Price absent versus explicit price zero. | Missing blocks all effects and preserves form; explicit zero registers correctly. DOM-02, real DB rollback. |
| P06-AC-04 | Submit the two prepaid variants. | Goods 0/shipping 50 or goods 0/shipping 0; commercial tariff retained; no fabricated payment or goods credit. |
| P06-AC-05 | Two new commands with the same brand reference after warning, versus retrying one lost-response command. | Legitimate warned orders have distinct references; retry returns the same original order. |
| P06-AC-06 | Edit tariff after registration, then preview/commit an allowed service correction. | Existing price unchanged by tariff edit; explicit correction shows its exact revised snapshot and custody/preparation effects. |
| P06-AC-07 | Cancel a prepared external parcel before handover. | Reason/history retained and goods remain at branch; no fictitious return. Stale or handed-over state rejects. |
| P06-AC-08 | Invalid phone/unsafe URL/mixed branch scope or quantity exceeds bound. | Field error and zero business effects; no URL fetch, trimming or fallback price. |
| P06-AC-09 | Drop response after commit, reload and recover with the original command identity. | One record/receipt, authorized result recovery and clear UI; changed payload conflicts. |

Automate important service behavior in Vitest, real transactional/race tests in PostgreSQL and browser flows against the API. Fixture JSON proves only schema behavior, not Tawsel connectivity. Do not claim an unrun integration test.

## Manual trial and completion

Use isolated seeded company A, branch A, active brand with both services, base 50/uplift 5 and one tariff gap. Register the 300 ready parcel and 305 company-packed parcel. Confirm separate numeric references and physical parcel rows, then finish packing and verify no quantity/money duplication. Register a shipping-only and a zero-recipient-due shipment. Attempt the missing-price governorate, correct it, submit once with a dropped response and recover the same record. Edit the tariff and verify previous shipping snapshots. Cancel one unhanded parcel and observe it still physically held. Record fixture references and screen captures so the owner can repeat this without chat history.

Deliver code/contracts/migration/tests and `docs/verification/P06/`; update `phases/execution/P06.md`, status and traceability with actual evidence, limitations and any source-adapter prerequisite. Declare dispatch/visit fees/returns as later-owned capabilities, not working buttons. **Stop after P06 and its truthful handoff. Do not run P07, change Tawsel, deploy, publish, pay, purchase or merge automatically.**

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-011`, `ERP-R-015`, `ERP-R-023`, `ERP-R-024`, `ERP-R-031`, `ERP-R-032`, `ERP-R-036`, `ERP-R-038`, `ERP-R-042`, `ERP-R-044`, `ERP-R-045`, `ERP-R-047`, `ERP-R-048`, `ERP-R-053`, `ERP-R-054`, `ERP-R-064`, `ERP-R-072`, `ERP-R-076`, `ERP-R-077`, `ERP-R-094`, `ERP-R-095`, `ERP-R-096`, `ERP-R-107`, `ERP-R-127`, `ERP-R-131`, `ERP-R-157`, `ERP-R-158`, `ERP-R-159`, `ERP-R-172`, `ERP-R-174`, `ERP-R-182`, `ERP-R-208`.

Decisions: `ERP-D-012`, `ERP-D-020`, `ERP-D-021`, `ERP-D-030`, `ERP-D-031`, `ERP-D-035`, `ERP-D-037`, `ERP-D-041`, `ERP-D-043`, `ERP-D-044`, `ERP-D-046`, `ERP-D-047`, `ERP-D-049`, `ERP-D-051`, `ERP-D-052`, `ERP-D-058`, `ERP-D-061`, `ERP-D-064`, `ERP-D-065`, `ERP-D-066`, `ERP-D-075`, `ERP-D-076`, `ERP-D-092`, `ERP-D-093`, `ERP-D-094`, `ERP-D-100`, `ERP-D-102`, `ERP-D-107`, `ERP-D-120`, `ERP-D-123`, `ERP-D-148`, `ERP-D-149`, `ERP-D-150`, `ERP-D-163`, `ERP-D-165`, `ERP-D-169`, `ERP-D-173`, `ERP-D-199`, `ERP-D-203`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
