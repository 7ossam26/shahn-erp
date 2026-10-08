# P21 bounded traceability

This file covers P21's implementation, consumption and exclusion slices of the assigned assertions in [the matrix](../../../REQUIREMENTS-TRACEABILITY.md). It does not mark a cross-domain requirement complete or replace other phases' independent public/human acceptance. Evidence abbreviations are defined in [README](README.md); exact commands/results are in [the execution record](../../../phases/execution/P21.md). The owner manual/device trial is unrun.

Evidence keys: **C** contracts/arithmetic/payroll Vitest; **U** jsdom page Vitest; **S** `settlements.db`; **W** `wallet.db`; **T** `storage.db`; **I** `incidents.db`; **H** `http.db` (actual HTTP, CSRF, restart); **M** `migration.db`; **B** real-browser Playwright (desktop 1440, mobile 390, 320/768 overflow checks).

## Requirements

| ID | P21 slice and evidence | Remaining boundary |
| --- | --- | --- |
| ERP-R-054 | A settlement never reprices an order: brand corrections keep the original movement and class; no tariff field exists in any closed operation — C/W. | P04/P06 own tariff capture. |
| ERP-R-085 | Paid/frozen/past month offers no path; current-unpaid/future additions delegate to P20 with the reviewed payroll version — S (A04), C. | P20 owns payroll; P22 source recovery. |
| ERP-R-095 | Mistaken pre-handover registration cancels through P06 `shipment.cancel` (classification `parcel_cancellation`); an already cancelled parcel is blocked without a case — S (A08). Handed-over (`HANDED_OVER_PROTECTED`) and adapter-owned (`SOURCE_ADAPTER_REQUIRED`) blockers are resolver rules in the authority matrix, not separately exercised by a P21 test. | Ready-parcel brand handback stays P14. |
| ERP-R-115 | Dedicated `/settlements` page outside reports; target-first typed forms, reason, history — U/B. | P23 reports stay read-only. |
| ERP-R-123 | Settlement holds reduce available funds for every outward action; refunds/expenses lock P09 funds in the same UoW; insufficient funds roll back — S/T, A03/A07. | Other payment domains retain their slices. |
| ERP-R-125 | Brand, employee, cash/bank, product quantity and parcel targets, each with its own resolver and invariants; no generic ledger edit; departed/adapter state rejected — C/S/W/I/B, A08. | Further typed targets need a new resolver. |
| ERP-R-126 | Originals retained; linked corrections (wallet, incident, source review, hold release) with reason and permanent links; no cash/goods claimed without an actual movement — S/W/I, A05. | P22 broader source recovery. |
| ERP-R-128 | Counting happens outside ERP; one observed quantity for one position/condition; no count session or freeze — C/S (A01), B. | — |
| ERP-R-129 | Optional dated opening batch for cash, brand eligible/pending/debt, employee obligation/entitlement and stock; zero-start company needs nothing; no operating fact — S (A06), H, M, B. | Owner trial in a clean company unrun. |
| ERP-R-133 | Actual 10 vs 12 previews −2 with reason; a concurrent receipt makes the preview stale — C/S (A01, race), U/B stale. | — |
| ERP-R-134 | Parcel target selects the exact shipment; loss/damage → P18 report, duplicate/wrong entry → P06 cancel, missed receipt → P15 page; no custody deletion — I/B route list. | Missed transfer receipt remains P15's workflow. |
| ERP-R-141 | Actual 5 vs reserved 7 keeps shortage 2, holds that variant's unhanded reservations only; receipt 2 clears — S (A02). | Driver custody untouched by design. |
| ERP-R-142 | Cash/bank observation with reason → pending hold with visible book/actual/available; resolved through one typed path (missed expense/movement, company loss, approved employee liability); no automatic penalty — S (A03, rolling), H, B. | Short driver remittance stays P16. |
| ERP-R-158 | Every target is restricted to assigned branches; revocation after the form loaded rejects with no effect — H/B denied. | Branch correction before handover stays P06's correction page. |
| ERP-R-159 | Every settlement shows a before/after preview with stock/money/wallet effects and confirms atomically under the same locks; no newer tariff adoption — C/S/U/B. | P06 piece/service correction page retained. |
| ERP-R-183 | Accepted post-payment source differences resolve from the existing review queue: linked correction or retain-original, payout retained, one hold released, no refund/Tawsel call — W (A05, retain, faults). | P11/P13 live public acceptance pending; P22. |
| ERP-R-208 | Case list filters (target, state, branch, reference, recorded dates) with reset, empty states and mobile disclosure — B/U. | P23 export parity. |

## Decisions

| ID | P21 slice and evidence |
| --- | --- |
| ERP-D-052 | Existing order price is never changed by a settlement; only linked typed corrections — W/C. |
| ERP-D-083 | Paid/past payroll calculations unchanged; current-unpaid/future only — S (A04). |
| ERP-D-093 | Pre-handover cancellation through P06 with reason; reservations released by the owner — S (A08), authority matrix. |
| ERP-D-107 | No settlement action is placed inside reports; REP pages untouched — routes. |
| ERP-D-109 | Separate Settlements page with broad but typed correction capability — U/B. |
| ERP-D-117 | Insufficient funds block refunds/expenses/liability withdrawals; holds reduce available funds — S/T. |
| ERP-D-118 | Brand, employee, cash/bank, product quantity and parcel-custody targets — registry, S/W/I/B. |
| ERP-D-119 | Linked reasoned correction movements; originals retained — W/I. |
| ERP-D-120 | Physical count outside ERP; difference corrected through the Settlements page; no count session — S/B. |
| ERP-D-121 | Opening money/brand/employee/stock optional, with a clear opening date; skippable — S/H/B, empty state. |
| ERP-D-124 | Recorded 12, actual 10 → −2 with reason and history — C/S/B. |
| ERP-D-125 | Parcel discrepancy: select shipment and actual case; legitimate workflow — I/B. |
| ERP-D-132 | Actual 5, reserved 7 → shortage 2, affected pre-handover work held until replenished — S. |
| ERP-D-133 | Cash/bank difference pending explanation with actual balance visible; resolved as missed movement, company loss or approved employee liability — S/H/B. |
| ERP-D-149 | Assigned-branch scope enforced on every target and at confirmation — H/B. |
| ERP-D-150 | Effects shown before confirmation; no silent repricing — C/U/B. |
| ERP-D-174 | Post-payment accepted corrections enter the existing review queue and resolve through linked typed decisions — W. |
| ERP-D-191 | Partial-month deduction remains a staff-entered P20 earning deduction: `employee.adjust` accepts only `bonus`/`overtime`/`earning_deduction` (C) and delegates to P20 (S A04 exercises the addition path). |
| ERP-D-199 | Advanced filters behind a disclosure on the case list, default layout simple — B. |
