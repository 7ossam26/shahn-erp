# P04 — Brands, geography and immutable commercial pricing

**Git workflow (owner instruction, 2026-10-05):** Execute P04 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 4: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Result and boundary

Implement this phase only. Authorized staff can create a company-level brand, configure its services and agreed prices, maintain governorates/optional areas and manually assign a negotiated tier. A price preview explains its source and can produce an immutable order-policy snapshot for later intake. Updating tariffs changes future snapshots without rewriting earlier ones. Product stock, actual subscription receipts, dispatch and payouts remain in their owning phases.

Model: `gpt-6.1-sol`, effort `high`, checked2026-10-03. This is a bounded configuration/UI workflow with precise validation and historical pricing rules. Select it in Codex; [model guidance](MODEL-GUIDANCE.md) records evidence.

Owner rules include ERP-D-033/037/040/051/052/061/063/065/066/067/074/168/172/200/205. Read their exact statements and current AC-R mappings in [traceability](../REQUIREMENTS-TRACEABILITY.md); related requirements include ERP-R-010/034/036/037/041/047/048/050/053/054/062/063/072/073/075/169/181/182/209/214. Actual product receipt, storage payment and shipping-cover use remain later consumers of these settings. Screens: UI-REFERENCE-001, UI-BRAND-001 and UI-BRAND-SETUP-001.

## Independent reading and prerequisites

Read master plan scope/setup, [domain](../docs/planning/ERP-DOMAIN-SPEC.md) sections3/4/8/9.3/12, [data](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) identity/money/snapshot/transaction/correction rules, [screens](../docs/planning/ERP-SCREEN-SPEC.md) brand groups and advanced filters, and [execution contract](EXECUTION-CONTRACT.md). Inspect actual P01 UI and P02/P03 access/command/migration/journal interfaces; run their relevant registered suites. Verify that a company, at least one active branch, ordinary admin and scope-limited staff can sign in.

P03 must supply native idempotent commands, audit and safe wallet-row creation. Do not create a second per-branch wallet or save commercial settings only in browser state. A small missing repository export may be repaired; missing server authority or atomic persistence blocks confirmation capability.

## Records and precise rules

Create same-company brand, versioned commercial policy, geography and versioned tariff tables. Brand has readable name, active status and optional contact/reference fields. Internal brand identity is generated; user-entered display values are never Tawsel external identity. Preserve historical display data with source snapshots. A brand is company-level across branches; one atomic creation also establishes its single empty brand-wallet lock row through P03. That creates zero entitlement and no cash/revenue.

Use exactly three service keys: `brand_packed`, `company_packed`, `stored_stock`. At least one enabled service and one enabled default are required. Each later order chooses one enabled service. Keep partial-delivery permission separate from a shipment's explicit inspection-before-receipt choice. Do not introduce inspection as a new canonical property or silently default all shipments to inspection permission.

Tariff tiers are manually chosen negotiated categories, with optional descriptive monthly-volume ranges. Analytics does not select or move a brand's tier. Require a governorate; its optional area must belong to it. Lookup order is the selected tier's area override if present, else its governorate price. No arbitrary area, other tier or zero fallback. An explicit configured zero is distinct from missing price. Enforce one effective tariff revision per key/boundary and prevent overlapping active versions that would make selection ambiguous.

Packing uplift is a fixed per-brand amount for applicable company-packed/stored-stock services; zero is valid. Preserve base shipping and uplift separately so later percentage commission uses base only. Do not introduce packaging-material inventory or repacking counters. The full tariff is normally earned on every actual eligible visit, with the explicit incident-linked company-funded exception owned by P18.

Payout weekdays and allow-negative-balance are current operational policies read when their action occurs, with audit. New order snapshots retain applicable service, tier/rate identity, base tariff, uplift, partial policy, goods/recipient dues and source revision. Subsequent policy changes do not reprice those snapshots. A lawful pre-handover correction later creates an explicit reviewed revision; tariff maintenance alone cannot perform that correction.

If stored-stock service is enabled, configure one negotiated monthly storage fee, service start/original anniversary day, responsible agreement branch and active/stop configuration. Multiple physical stock branches do not duplicate the agreement. P19 owns period generation, separate partial/advance payment, credit and refunds; this phase must not claim storage revenue or receipts simply because configuration was saved. Preserve enough version identity for its later migration without inventing daily allocation or space-based pricing.

Governorates, areas, tiers and brands with references are deactivated rather than deleted. Prevent new ordinary use of inactive settings while retaining history and legitimate completion of existing work. Renaming a geography or brand does not change its technical identity, historical snapshots or custody. Reference-category administration uses screen grants, not developer-only pricing controls; company operations owns tariff decisions.

## API, migrations and user experience

Implement closed native contracts and real server commands for create/update/deactivate brand, geography and tariff revision plus an authorized pricing-preview query. Use `commandId` and `expectedVersion`; reject stale edits with current revision and retained input. The preview is explanatory, not a promise that later confirmation can skip revalidation. No remote Tawsel call is required for ordinary local brand setup; P11 owns the public provisioning/mapping boundary.

Use feature paths under `apps/api/src/modules/brands` and `reference-data`, `apps/web/src/features/brands` and `reference-data`, matching contracts/domain/SQL repository modules and an additive phase migration. Include same-company composite foreign keys, unique effective tariff keys, branch/service validation, indexed brand search and immutable revision history. Upgrade tests preserve existing company/users/empty wallets and source identities.

Build the focused brand list, brand setup and separate reference editors with approved UI patterns. Brand form sections: identity; services; tier/pricing; payout/credit; storage. Explain what is missing for each enabled service. Use one primary Save action and a concise preview; do not squeeze every catalog into global tabs. Add search, active/service/tier filters and optional advanced groups, active-filter chips/reset, authorized server pagination and meaningful empty/loading/error states. An ungranted financial screen is not exposed through a brand detail link.

## Ordered checkpoints

1. **Schema and domain validation.** Add relationships/versions and source-preserving updates. Real migration tests reject a cross-company area/tier/branch, duplicate effective rate and invalid default service. Run connected validation tests before enabling Save.
2. **Pricing service.** Implement lookup and snapshot API with exact integer money. Verify governorate50, area override60, missing override fallback50, absent governorate price rejection and explicit zero acceptance. Include service uplift and base-only commission inputs without posting earnings.
3. **Atomic brand setup.** Create policy and one empty shared wallet in one transaction. Concurrent duplicate command requests cannot create duplicate wallets. Failure after brand insert rolls back policy/wallet/audit together.
4. **Forms and history.** Implement reference editors and brand form, stale-revision recovery and deactivation constraints. Reuse approved design and test on desktop/mobile with long Arabic names.
5. **Acceptance/handoff.** Register P04 suites, record exact snapshot schema and seed a representative brand/geography set for P05/P06. Document unimplemented period/payment actions as unavailable, not fictitious successes.

## Acceptance and owner trial

Create Cairo base50 and area Dokki60, a manually assigned tier, and a brand allowing ready/company-packed services with uplift5. Preview ready Cairo with no area:50; Dokki:60; company-packed Cairo:55 with base50 and uplift5. Select an area belonging to a different governorate: reject. Remove the optional override: governorate fallback applies. Remove required governorate rate: confirmation/snapshot creation fails without partial writes. A zero explicitly configured rate remains valid.

Take snapshotA, then change the governorate price to70 and the brand's negotiated tier. New snapshotB reflects the new applicable policy; A remains unchanged. Increasing measured volume must not change the manual tier. Repeat brand creation after a lost response and inspect one brand/one empty wallet. Two sessions editing the same policy yield one accepted edit and a clear stale-revision rejection, without silent last-write-wins.

Meaningful Vitest tests cover the complete lookup/validation/snapshot flow. Real PostgreSQL proves atomic setup, version uniqueness and replay; browser tests cover grouped setup, missing-price explanations, filters and mobile retention after failure. Manual instructions supply actual seeded IDs, login, clicks and expected amounts. No stock or cash is created by these trials.

## Deliverables and stop

Deliver schema/contracts/server/UI, seed additions, history and pricing tests, actual screenshots and `docs/verification/P04/README.md`. Update [P04 execution](execution/P04.md), catalog and implementation status. Completion requires a usable configuration journey and immutable snapshot evidence; later stock/subscription/dispatch behavior remains unclaimed.

Stop after P04. Do not execute P05, change Tawsel, purchase, deploy production, pay or merge.

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-010`, `ERP-R-034`, `ERP-R-036`, `ERP-R-037`, `ERP-R-041`, `ERP-R-046`, `ERP-R-047`, `ERP-R-048`, `ERP-R-052`, `ERP-R-053`, `ERP-R-054`, `ERP-R-062`, `ERP-R-063`, `ERP-R-065`, `ERP-R-072`, `ERP-R-073`, `ERP-R-075`, `ERP-R-077`, `ERP-R-138`, `ERP-R-169`, `ERP-R-177`, `ERP-R-181`, `ERP-R-182`.

Decisions: `ERP-D-021`, `ERP-D-030`, `ERP-D-033`, `ERP-D-035`, `ERP-D-036`, `ERP-D-040`, `ERP-D-045`, `ERP-D-046`, `ERP-D-047`, `ERP-D-049`, `ERP-D-050`, `ERP-D-051`, `ERP-D-052`, `ERP-D-053`, `ERP-D-061`, `ERP-D-063`, `ERP-D-065`, `ERP-D-066`, `ERP-D-067`, `ERP-D-071`, `ERP-D-073`, `ERP-D-074`, `ERP-D-076`, `ERP-D-089`, `ERP-D-092`, `ERP-D-129`, `ERP-D-137`, `ERP-D-139`, `ERP-D-160`, `ERP-D-168`, `ERP-D-169`, `ERP-D-172`, `ERP-D-173`, `ERP-D-194`, `ERP-D-201`, `ERP-D-204`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
