# P06 shipment and custody handoff

All interfaces are native ERP interfaces. No accepted Tawsel source, driver assignment, cover allocation, visit, wallet credit or cash receipt is produced.

## Atomic confirmation and P07

[Shipment service](../../../apps/api/src/modules/shipments/service.ts) exports:

- `shipmentCommands(pool, {afterReceipt?})`: P03 CommandService family `shipment`, intake capability. Confirm, correct, prepare and cancel share permanent command records/audit/result recovery. The failure hook exists for verification; HTTP never accepts it.
- `confirmShipment(uow, recordId, fields, price, physicalEffect)`: caller-owned UnitOfWork; creates immutable identity/reference/revision/price, calls the supplied physical effect on that same checked-out client, then appends a local event. The caller owns setup validation, reviewed policy/tariff locks, command result and final commit.
- `shipmentDetail(uow, key, byReference)`, `correctionPreview(...)`, `listShipmentParcels(...)` and `defaultShipmentFilter(branches)`: current company/assigned branch semantics. Preview is nonmutating and never substitutes for commit-time authorization/version checks.

The external-intake caller passes `receiveShipmentParcel`, which creates one shipment-bound receipt/custody relation. [Repository](../../../packages/database/src/shipments/index.ts) accepts a transaction client; it does not acquire/commit its own Pool transaction. P07 can reuse the assembler with its stock-allocation callback instead of this external receipt effect. It must extend service schemas/database constraints for `stored_stock`, implement stock-backed custody/preparation and distinguish the current assembler's `received` event from stored-stock registration. Those extensions remain P07 work; the present external-intake HTTP contract deliberately cannot register a stored-stock order. Do not call external receipt for already stored goods.

Prices retain base, fixed agreed uplift even when initially ready, commercial tariff, goods outstanding, recipient shipping, brand shipping, total, partial permission and policy/tariff revisions. Correction uses the captured base/agreed uplift, validates current enabled service/reference scope, and appends a new revision. Content/service changes reset required preparation; recipient-only corrections preserve it. Branch correction appends custody correction with an explicit actual-location assertion; the original receipt remains immutable.

## P11 source adapter

`sourceReadyShipment(uow, shipmentId, revision)` returns a deeply frozen clone of the selected immutable fields, canonical phone, price, identity/reference and revision. Unit/API tests prove native stability only. P11 must build the pinned canonical SourceSnapshot/commands, exact checked money conversion, deterministic technical identities, instruction rendering for inspection/comments, source revision/cancellation, durable outbox and accepted-state projection. It must reject any resulting wire-bound overflow rather than truncate. This projection is not a wire command, outbox item or acceptance record.

`source_state='integrated'` blocks the current local correction/cancel/prepare shortcuts. There is no user-facing toggle or adapter that marks successful integration. Outage-independent intake/preparation is local only; integration-pending recovery and required accepted handover belong to P11/P12.

## P12 handover and P18 replacements

P12 must lock the shipment aggregate under P03 lock order, revalidate version, active/prepared state, current scope/physical custody and required source acceptance, then atomically apply authoritative cover/handover effects. It must extend the custody model for actual driver custody and protect source/handover lifecycle facts. The present `handed_over` guard rejects local shortcuts; fixture coverage is not a handover implementation. Percentage commission consumes base shipping, excluding uplift, in its later owner.

P18 may compose ordinary intake/confirmation for a new replacement with independent identity and actual receipt. Incident/original linkage, company-funded waiver and related financial effects require P18's contracts/transaction. Brand-funded zero recipient shipping is not that waiver: it retains full commercial tariff. No compulsory intake valuation, original sale/deposit ledger or special prepaid-loss workflow was added.

## HTTP/read boundary

Closed schemas and routes are in [contracts](../../../packages/contracts/src/shipments/index.ts) and [generated OpenAPI](../../../packages/contracts/openapi.json). Detail accepts current intake **or** inventory capability with assigned branch; mutation, correction preview, preparation and command recovery require intake. Tracking alone does not broaden these reads. Every command route verifies session, company, screen, branch, CSRF, type and expected version. Recovered results are reauthorized against current scope, including compacted results.

`GET /shipments/commands/{commandId}?companyId=...` returns the authoritative result/rejection. The web keeps a stable principal/company/channel-scoped command identity through unknown outcomes and reload;404 permits replay of the exact payload. Duplicate brand-reference acknowledgement creates an independent order and is separate from this recovery.

P05 `/inventory/parcels` now reads real branch-held shipments, including cancellations. External custody is explicitly empty at this stage. Server filters combine categories by AND and multiple branch/brand choices by OR; Cairo registration-day ranges, normalized digit search, pagination and receipt-age semantics are explicit. Preparation excludes `not_required` records. UI advanced filters preserve query/back state. P13/P15 own external journey/custody projections; P23 owns report/export parity.
