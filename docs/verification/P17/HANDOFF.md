# P17 interfaces and boundaries

Native implementation dated 2026-10-06. It extends the single P03 wallet (`kernel.credit_lot`, `lot_allocation`, `wallet_hold`, `shipping_cover`); there is no second balance model, no cached wallet balance and no backfill. Browser (Playwright) acceptance was skipped by owner instruction; script tests cover the UI flows.

## Implemented paths

- `packages/database/migrations/0021_p17_brand_payouts.sql`: `finance.brand_payout` (snapshotted brand/policy/weekdays, paying branch/account/method, actual date, weekday, off-day + reason, optional reference, before/after payable, readiness revision, command/source/effect/movement links) and immutable `finance.payout_allocation` (one row per consumed lot, FK to `kernel.lot_allocation`). Deferred constraint triggers prove movement/effect/allocation equality at commit; a real-brand `payout` journal effect or `brand_payout` cash movement cannot commit without its payout record (P03 `fixture` resources exempt). `money_movement.source_kind` gains `brand_payout`; capability `brand.payout` becomes implemented and titled تحصيل البراندات.
- `packages/contracts/src/finance/brand-wallet/index.ts`, `.../brand-payouts/index.ts`: closed schemas, validators, examples and OpenAPI (generated into `packages/contracts/openapi.json`).
- `apps/api/src/modules/finance/brand-wallet/wallet.service.ts`: `BrandWalletService` (stable interface below) and Cairo weekday helpers.
- `apps/api/src/modules/finance/brand-wallet/queries.ts`: `brandDues` (REP-09), `walletLots`, `walletStatement` (REP-08), `payoutCalendar`, `walletTotals`.
- `apps/api/src/modules/finance/brand-payouts/service.ts`: `BrandPayoutService.preview/confirm/recover`, `payoutDetail`, `payoutList` (REP-10), `payoutCatalog`.
- `apps/api/src/modules/finance/brand-wallet/http.ts`, `.../brand-payouts/http.ts`: routes registered in `apps/api/src/app.ts`.
- `apps/web/src/features/finance/brand-payouts/`: `/brand-payouts` (dues), `/brand-payouts/calendar`, `/brand-payouts/history`, `/brand-payouts/brands/:brandId` (wallet with المستحقات/كشف الحساب/التحصيلات local views), `/brand-payouts/brands/:brandId/pay` (form + review dialog), `/brand-payouts/payouts/:payoutId`.
- Small in-scope repairs: `AccountFundsService.post` source-kind type gains `brand_payout`; P09 account history labels it تحصيل براند; `packages/test-support` Docker `start()` now waits for readiness (matches native `pg_ctl -w`).

## BrandWalletService (stable P17 interface)

Construct `new BrandWalletService(uow, brandId)` only after `BrandWalletService.lock(uow, brandIds)` (sorted `wallet`-class locks through `JournalPosting.lock('brand', id)`). All methods join the caller's checked-out UnitOfWork transaction.

| Method | Meaning |
| --- | --- |
| `amounts()` | E, P, D, H, C, signed `E+P-D`, payable `max(0,E-D-H-C)`, historical paid. |
| `readiness()` | Amounts plus a SHA-256 readiness revision over everything that changes payability/allocation (eligible, debits, held, cover, payable, active hold IDs, active cover IDs, open reviews, policy version/weekdays). Pending/signed are deliberately excluded so a new driver-held delivery does not stale a payout review. |
| `branches()` | Source-branch breakdown of the same lot/debit/cover rows (cover branch = dispatch intent branch); totals equal `amounts()`. |
| `summary()` | Contract `BrandWalletSummary` (reasons, today, next agreed day, open reviews, active holds). |
| `reconcile()` | Sum of signed brand journal effects vs lot-model signed entitlement. |
| `postCompensation({sourceId, recordId, amountMinor, branchId, effectiveDate, reason?, additionalEffects?})` | **P18 typed producer.** Appends one `compensation` brand effect (plus caller's same-source employee/operating effects) and creates an immediately eligible lot, then offsets existing debits. Source-unique through the P03 batch/effect keys. P18 owns the incident source identity, locks for any additional resources and the confirmation workflow. |
| `hold / releaseHold` | Source-specific holds (kernel bounds; already-paid exposure goes to review, never a rewrite). |
| `reserveCover / closeCover` | The same P12 cover API (`shipping-cover.service.ts` already uses the kernel methods on the same lock). |
| `allocatePayout(effectId, amountMinor)` | Offsets debits, then consumes eligible lots oldest effective date → movement ID; returns exact lot/branch allocations. |

## Payout transaction

`BrandPayoutService.confirm(token, BrandPayoutCommand)` (family `brand.payouts`, capability `brand.payout`): authorize paying branch → command identity → payout source (`brand-payout`/payoutId) → shared P04 configuration lock → brand wallet → paying account. Under those locks: off-day rule from the current policy, eligibility (409 `INSUFFICIENT_ELIGIBLE_CREDIT` with current amounts), readiness revision (409 `WALLET_CHANGED`), funds (409 `INSUFFICIENT_FUNDS` with available), then one posting batch (money `payment` + brand `payout`), allocations, payout row, payout allocations, audit and retained result. 409 rejections are retained under the same commandId; a corrected decision needs a new identity. Fault hooks (`debit`, `allocation`, `payout`, `result`) prove full rollback. Recovery: `recover(token, companyId, commandId)` — same principal, current grant and current assignment to the paying branch.

Lock-order note: payout never locks visit rows; P13 corrections see the P16 `credit_release` as protected basis, and payout detail links later reviews through `payout_allocation.lot_id = execution.allocation.goods_effect_id`.

## Consumers

| Phase | Use | Still owned there |
| --- | --- | --- |
| P18 | `postCompensation` for confirmed compensation; eligible immediately, independent of employee recovery. | Incident confirmation, shares, payroll obligation, UI. |
| P21 | Typed brand correction/adjustment through `JournalPosting` + `BrandWalletService` locks; resolve P13 reviews with `resolveSettlementReview`; a wrong payout is corrected by a linked typed adjustment, never by deleting `brand_payout`/allocations (immutable) or a fake cash reversal. | Adjustment screens and policies. |
| P22 | Readiness/holds already reflect P13/P16 gaps and reviews. | Replay/recovery orchestration, public conformance. |
| P23 | `walletStatement`, `brandDues`, `payoutCalendar`, `payoutList` give the same predicates/totals for REP-08/09/10 export/print. | Excel/print/PDF parity and report authorization. |

## Remaining external evidence

Owner manual trial (`npm run p17:trial`, see README) and the P16-owned independent public witness (IP-GAP-004) are not executed. Browser viewport captures (320/390/768/1440) were not produced because the owner skipped browser tests.
