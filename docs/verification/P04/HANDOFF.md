# P04 consumer interface

`@shahn/api/brands` exports `commercialCommands(pool)` and `pricing(uow,input)`; `@shahn/api/reference-data` exports the configuration lock and reference service. Commands join P03's `CommandService` and `UnitOfWork`; their server definitions own `commercial.brand`, `.reference`, `.tariff` and `.snapshot`. Inputs/results are closed and versioned in `packages/contracts/src/brands.ts` and the generated OpenAPI. Edit/deactivation uses `expectedVersion` and a full reviewed `fields` object. A 409 stale rejection retains the original payload and `currentVersion`; no last-write-wins update occurs. Recovery rechecks principal, company, screen grant and, for snapshots, current assigned branch. Permanent outcomes remain resolvable after transport-result compaction.

`configurationLock(uow)` takes a shared transaction-scoped commercial configuration lock. Writers call `configurationLock(uow,true)`. Future order confirmation takes the shared lock in the aggregate stage **before stock/wallet locks**, runs `pricing(uow,input)` inside the same checked-out transaction, persists its returned source snapshot together with shipment/stock/custody/audit, and commits once. Standalone `pricing.snapshot` is a persisted configuration acceptance artifact, not an order, physical receipt or journal posting. HTTP preview is explanatory and never authorizes later confirmation to skip validation.

Native EGP fields ending `Minor` are exact integer piastre strings within signed PostgreSQL bigint bounds. UI human money uses decimal-string conversion with Arabic digit normalization. SQL uses bigint; no float pricing arithmetic. Snapshot schema version 1 contains:

| Fields | Meaning |
| --- | --- |
| `companyId`, `brandId`, `brandName`, `policyVersion` | Same-company identity and captured brand display/policy revision |
| `branchId`, `service`, `partialDelivery` | Authorized assigned intake branch, one allowed service and partial policy |
| `tierId`, `tierName` | Manually selected negotiated tier; analytics cannot move it |
| `governorateId`, `governorateName`, `areaId`, `areaName` | Required governorate, optional belonging area, captured labels |
| `tariffId`, `tariffVersion`, `source` | Exact immutable price revision, `area_override` or `governorate` |
| `baseShippingMinor`, `packingUpliftMinor`, `tariffMinor`, `commissionBaseMinor` | Base, applicable fixed uplift, checked sum, base-only percentage input |
| `goodsDueMinor`, `recipientShippingMinor`, `recipientDueMinor` | Caller-validated declared outstanding goods/shipping and checked sum |
| `schemaVersion`, `currency`, `capturedAt` | Versioned shape, fixed EGP currency and capture instant; revision identity remains authoritative |

P06 must validate unit-level declared dues, inspection choice, receiving scope and all physical/stock prerequisites. P04's aggregate due input does not supply per-piece partial calculations. P18 owns explicit incident-linked company-funded waivers. No P04 path edits an existing snapshot; a later lawful correction creates an explicitly reviewed revision through its owning phase.

`readBrand(client,companyId,id)` exposes the current operational policy and immutable version identity. P12/P17 read current allow-negative/payout-weekday settings **at action time**, under their owning locks/audit, rather than treating old order settings as current permission. `commercial.brand` links directly to its **one** P03 `kernel.resource` family `brand` row; creation creates no economic effect or per-branch wallet. Use that same wallet for later cover/payout.

Storage settings retain negotiated monthly fee, start date/original anniversary, responsible agreement branch, active/stop state and policy version. P19 migrates these version identities into effective agreement periods and owns prospective fee/stop boundaries, earning recognition, separate partial/advance receipts, credit/refund allocation. P04 does not earn storage revenue or reset an existing billing anchor automatically. Reference/tariff revisions take effect immediately on new snapshots; no scheduled tariff overlap is supported.

`seedCommercial` is explicit development/test-only, repeatable by command identity and company, and never called on application startup. Existing roles are not silently granted new screens by migration. Ordinary role administration can grant `brands` / `reference-data`; trial fixtures grant their isolated admin both. No external provisioning occurs.
