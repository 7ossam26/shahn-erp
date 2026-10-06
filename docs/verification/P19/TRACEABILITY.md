# P19 bounded traceability

Scope: P19's slice of each assigned row, verified 2026-10-07 with the evidence named below. A cross-domain row is complete only when its other phases' slices are verified; this file does not mark any whole row passed. Tests: `calendar.unit` (C), `contracts.unit` (K), `storage.db` (S), `worker.db` (W), `worker-process.db` (WP), `http.db` (H), `migration.db` (M), Playwright `storage.spec` (B).

## Requirements

| ID | P19 slice | Evidence | Remaining owner |
| --- | --- | --- | --- |
| ERP-R-050 | Agreed fixed monthly subscription per brand; payment recorded separately from payout funds; stock quantity does not change the fee | S AC-02/09 (no `brand` effects, one agreement per brand even with stock at B), B steps 1–3 | — |
| ERP-R-073 | Configure/edit via brand setup with anniversary periods; separate receipt; no payout offset; partial/advance | S terms test, AC-02/03, H, B | P23 report views |
| ERP-R-074 | Day-20 start covers through day 19; anniversary renewal independent of payroll | C (range), S AC-02, B period «٢٠ يناير ٢٠٢٧ – ١٩ فبراير ٢٠٢٧» | — |
| ERP-R-092 | Due at period start; manual actual receipt; renewal until explicit stop even at zero stock; no fabricated receipt | C, S AC-03/05, W catch-up, WP real worker | — |
| ERP-R-123 | Refund rejects beyond the funding account's funds with no storage/cash effect | S AC-08 (`INSUFFICIENT_FUNDS`, unchanged snapshot) | P20 payroll slice |
| ERP-R-130 | Cash, Bank deposit, InstaPay with a permitted account; method/account preserved; no provider automation | S AC-03 (InstaPay to bank), AC-02 (cash), K (closed methods), B | P20 slice |
| ERP-R-148 | Overdue visible; renewal/work continue until stop; no wallet offset or shipping block | S AC-04/05 (overdue, renewal continues), B filter «عليها متأخرات فقط» | — |
| ERP-R-149 | Stop protects current period, prevents next renewal, no prorated refund or deletion | C stop, S AC-05 and future-stop case, H stop, B step 7 | P21 exceptional refunds of allocated money |
| ERP-R-150 | Price edit only from the next period; history preserved | C, S terms test, W AC-01/DOM-15 | — |
| ERP-R-152 | Supplies full period-start storage revenue facts (no daily allocation) | `storageRevenueFacts`; S revenue-by-month; W | P24 computes profit |
| ERP-R-181 | Revenue at agreement branch independent of receiving branch/account | S AC-02/09 effects (operating at A, receipt at B), H list branch filter, B | P24 attribution |
| ERP-R-201 | Jan 31 → Feb 28/29 → Mar 31, leap years, no drift | C, W AC-01 (2027 and 2028), SQL `storage.period_start` probe | — |
| ERP-R-208 | Storage advanced filters (revenue branch, state, payment status, overdue, due range, payment date basis), reset, empty state, back navigation, phone dialog | K filter schema, S list filters, B second journey | P23 export parity |
| ERP-R-210 | Whole fee in the service-start month; 310 Jan 20–Feb 19 = January 310 / February 0 | C Example A, S AC-02, W revenue by month, B «إيراد يناير ٢٠٢٧ كاملًا» | P24 report |
| ERP-R-213 | Partial and advance receipts with auditable balances/allocation history; 400 against 1000 leaves 600; advance 500 → 310/190 | C, S AC-02/03/04, W races, B | P21 corrections |

## Decisions

| ID | P19 evidence |
| --- | --- |
| ERP-D-048 | Fixed negotiated subscription per brand agreement; one agreement per company brand (unique) — S AC-02/09, M. |
| ERP-D-067 | Actual payment recorded manually, separate from brand payout — S, H, B. |
| ERP-D-073 | Storage charges separate from the payout wallet; no automatic offset — S `walletEffects` 0. |
| ERP-D-090 | Due at anniversary period start, manual actual payment, renews until explicit stop even at zero stock (no stock input exists in renewal) — C, S AC-04/05, W, WP. |
| ERP-D-117 | An actual cash-out (storage refund) is blocked when the selected account lacks funds — S AC-08 (`INSUFFICIENT_FUNDS`, no effects). |
| ERP-D-122 | Cash, Bank deposit and InstaPay apply to storage receipts/refunds with a permitted account; no provider automation or proof image — S AC-02/03, K, B. |
| ERP-D-139 | Arrears visible, no automatic block/offset — S overdue, B. |
| ERP-D-140 | Stop keeps the paid/current period and stops next renewal without proration — S AC-05. |
| ERP-D-141 | Price change applies next period — S terms, W DOM-15. |
| ERP-D-143 | Profit formula input: complete storage period revenue at start — `storageRevenueFacts`. |
| ERP-D-172 | Revenue to the chosen agreement branch, not the payment branch — S AC-02/09. |
| ERP-D-190 | Consumed as an exclusion: visit revenue stays at the dispatch/work branch (P13); storage posts no visit revenue and keeps its own agreement-branch attribution (ERP-D-172), snapshotted per period — S terms. |
| ERP-D-192 | Original anchor retained with short-month clamp — C, W AC-01. |
| ERP-D-199 | Advanced filters per screen — B, H. |
| ERP-D-201 | No daily allocation; complete fee at period start — C, S, W, DB guard (exactly one operating effect per period). |
| ERP-D-202 | Not applicable to storage beyond keeping storage revenue separate from employee cost; no storage effect touches employee journals. |
| ERP-D-204 | Partial and advance storage payments supported; full-period-only restriction not revived — C, S, B. |

P-DOM-05's exact mechanics (oldest-due allocation, renewal-time credit application, explicit unallocated-credit refund with actual cash-out confirmation, no stop refund) are adopted under ERP-D-205 and implemented as above; they are not attributed to ERP-D-204 alone.

## Acceptance matrix

| Case | Result |
| --- | --- |
| P19-AC-01 | Passed: W (Jan 31 → Feb 28 → Mar 31; 2028 → Feb 29; duplicate period rejected 23505; one earning per period). |
| P19-AC-02 | Passed: S, B (January 310 / February 0, cash 100 at B, outstanding 210). |
| P19-AC-03 | Passed: S, B (credit 500/revenue 0 → allocation 310/credit 190/revenue 310, no new cash). |
| P19-AC-04 | Passed: S (oldest first, exact receipt→period rows, remaining 220, no wallet effect). |
| P19-AC-05 | Passed: S, B (stop, worker retries, arrears/credit/history persist, no refund/reversal). |
| P19-AC-06 | Passed: W both orders on independent pools (stale refund rejected or renewal applies only the remainder; no negative credit, reconciled). |
| P19-AC-07 | Passed: S child process commit/exit + recovery (one account credit); W killed worker after commit/before ack → `already_generated`, one period/charge/earning/allocation; B lost responses recovered. |
| P19-AC-08 | Passed: S, H, B (allocated, beyond credit, beyond funds, stale preview, forbidden/hidden account, missing grant — whole refund rejected, credit/cash/history unchanged). |
| P19-AC-09 | Passed: S (revenue A, cash B, single agreement; list branch filter A/B). |
