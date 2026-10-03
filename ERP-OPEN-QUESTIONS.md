# ERP Open Questions

Current authority, session025 (2026-10-03): ERP-D-205 / ERP-R-214 approve PLAN-001 and authorize phase authoring. Detailed plan mechanics below are adopted; original proposal/review wording is retained as drafting provenance, not a renewed approval gate. External contract gaps, unverified runtime targets and the unnamed palette remain explicitly limited. No production implementation is authorized by this authoring turn.

Updated: 2026-10-03, session 024. PLAN-001 remains a detailed owner-review draft. ERP-Q-171..175 are answered below under ERP-D-200..204. Detailed storage-credit allocation/refund mechanics remain plan proposals; the five answers do not approve the complete master plan. The approved UI direction and advanced-filter requirement remain settled. CHECK-002 remains closed for the excluded scenario; CHECK-003 remains a precise integration dependency, not a request to repeat branch-transfer discovery.

## Financial choices resolved during plan review

These questions arose from exact calculations in the draft. Session024 answers them explicitly; preserve their IDs and do not ask them again. Domain section17 and the master plan distinguish these approved choices from the remaining detailed proposals.

| Display | ID | Question | Resolution |
| --- | --- | --- | --- |
| 1 | ERP-Q-171 | Which wallet funds cover known brand-paid shipping for a brand that cannot operate on negative credit? | Closed: ERP-D-200 approves eligible-credit reservation excluding unremitted recipient money. Cover and competing payout cannot use the same funds. |
| 2 | ERP-Q-172 | How should a fixed anniversary storage fee enter calendar-month profit? | Closed: ERP-D-201 selects the entire fee in the service-start month and rejects daily allocation. Fee310 forJanuary20-February19 means310 January and0 February for that period. |
| 3 | ERP-Q-173 | How should salary deductions and manual money adjustments affect profit? | Closed for the asked distinction: ERP-D-202 accepts classification by actual meaning. Entitlement deductions reduce employee cost; advance recovery does not; incident recovery counts once. Salary6000/deduction200/advance1000 means cash4800 and cost5800. |
| 4 | ERP-Q-174 | What happens when the company bears replacement shipping under an incident agreement? | Closed: ERP-D-203 approves the explicit company-funded shipping waiver, zero recipient/brand shipping and net shipping revenue, with normal commission. Actual goods due remains. An employee-funded replacement flow was not selected. |
| 5 | ERP-Q-175 | Are partial and advance storage receipts required beyond full selected-period payments? | Closed: ERP-D-204 explicitly requires partial and advance payments. Proposed separate storage credit, oldest-due allocation, future-period application and explicit refund mechanics remain part of master-plan review; the full-only restriction is rejected. |

Architecture proposals P-ARCH-01..07, bounded test/recovery targets and detailed UI/API conventions are submitted through the plan review rather than recorded as prior approved decisions. They may be accepted together or amended explicitly. Existing canonical gaps are listed in the integration coverage document; an external contract fact must be resolved from source evidence or a documented change, not guessed by the owner or implementation agent.

## Current visual review

These questions refer to the rendered sample in UI-REVIEW-LOG.md. Session022 resolves layout feedback; the remaining palette detail does not block applying the approved layout direction.

| Previous display | ID | Current status |
| --- | --- | --- |
| 1 | ERP-Q-169 | Partially resolved: overall design direction is approved, but the owner did not name the white/lime or warm variant. Preserve that distinction in the design record; no repeated palette questionnaire is issued now. |
| 2 | ERP-Q-170 | Closed by ERP-D-198/199: the layout/design matches the owner's intent. The requested addition is advanced filters in later phases. No further general layout questionnaire is needed. |

The accepted direction is recorded as UI-REV-001 under ERP-D-198 / ERP-R-207. Advanced filters are ERP-D-199 / ERP-R-208. Unreviewed journeys and implementation phases retain their separate approval process.

## Parent topics

### ERP-Q-001 — Company scope, service model, and scale

Partially resolved. Separate company product first; later SaaS ambition. All three approved services remain in V1, with several enabled per brand and one choice/default per order. Brand identity/wallet is shared across branches under ERP-D-160/161. ERP-D-170 now includes actual physical transfer of shipments or brand-stock quantities between branches, replacing the former exclusion. Provisional sizing is 3 branches, 10 drivers, 150 orders/day and about ten or slightly more concurrent staff, in Egypt/EGP. ERP-D-169 closes first-client service-mix questioning. The transfer business workflow is settled by ERP-D-175 through ERP-D-189. Remaining: exact contract mapping, engineering capacity/acceptance evidence and deployment/isolation. ERP-D-011, ERP-D-046, ERP-D-065; ERP-R-006, ERP-R-047, ERP-R-049.

### ERP-Q-002 — Commercial shipment and stock journey

Partially resolved. Ready-parcel registration asserts branch receipt. Stock-order creation does not create a second receipt. Variant quantities, shortage-blocked confirmation and restocking sound returns after actual receipt/inspection are settled. Reservation/release, preparation completion, pre-handover cancellation and numeric references are now settled by ERP-D-091 through ERP-D-094. Compensation basis/confirmation, salary recovery and eligibility are settled; simple replacement linking is conditionally accepted. Dedicated found-after-compensation processing is excluded. ERP-D-120 excludes formal count sessions; daily monitoring and external physical comparison are selected. ERP-D-123/124/125/132 settle presentation, custody visibility, individual adjustment entry and reservation shortages. ERP-D-149/150 accept pre-handover recorded-branch/piece/service corrections and assigned-branch-only intake. Remaining: exact supported identity/state transitions and financial closure. ERP-D-041, ERP-D-068; ERP-R-049, ERP-R-069 through ERP-R-071.

### ERP-Q-003 — Brand account and access

Brand is the direct customer; its portal remains deferred. ERP-D-160/161 settle one company-level record/wallet across branches and authorized access to the eligible total; payout may occur at any branch with funds. Setup includes allowed services, partial policy, payout days, manually assigned tier, fixed packing increment and editable storage agreement. Storage is paid separately. Full prepaid cases, fixed anniversary subscription and per-brand negative-balance option are settled. Deposit administration is excluded. ERP-D-089/090 settle payment at period start, renewal until explicit stop and the no-debt new-handover gate; ERP-D-139/140/141 settle arrears continuation, stop-next-renewal and next-period rate edits. ERP-D-172 settles storage revenue attribution to the selected agreement branch. ERP-D-192 settles shorter-month anniversaries. ERP-D-201 settles recognition of the whole fee in its service-start month; ERP-D-204 includes partial/advance payment. Detailed storage-credit allocation/refund and statement/correction mechanics are now specified as plan proposals awaiting review. ERP-D-063 through ERP-D-067.

### ERP-Q-004 — Modular authority and support

One role plus inherit/allow/deny; consistent capabilities across allowed branches; screen access allows its operations within scope/business state. No hardcoded job titles. ERP-D-127 explicitly grants company-wide transfer creation through that screen; ERP-D-135 grants company-wide receipt through its separately permissioned screen. Expense scope remains assigned branches. ERP-D-151/152 settle support business/financial access and Technical Support audit visibility, with the account outside ordinary staff management. ERP-D-161 settles shared-wallet visibility/payout scope for permitted brands; funding-account authority still applies. ERP-D-179 also settles assigned-branch scope for goods sending/receiving, including multi-branch users. Remaining: module catalog, secure support session administration, delegation and issuer operations. ERP-D-013, ERP-D-015, ERP-D-032, ERP-D-061.

### ERP-Q-005 — Money, visit fees and employee compensation

Full prepaid cases are now resolved: goods paid to brand leave shipping only; all paid to brand leaves zero driver due and a brand shipping debit. No duplicate credit for prepaid goods. Actual driver-held proceeds still require remittance before payout. Each actual visit earns shipping, including no-answer/retries; unpaid fees belong to the brand. Driver commission excludes packing. Simple HR covers all employees without Tawsel onboarding. Automatic commission is independent of brand payment; ERP-D-085/086 select percentage or fixed amount for each actual eligible visit. ERP-D-087/088 remove partial salary payouts and include advances in payroll recovery. Bonuses/overtime, deficit carry, past/paid-period locks and the credit gate remain settled. Loss compensation direction/basis/eligibility, salary recovery and incident-time amount input are settled. Company/branch profit and paid-only ordinary expense capture are selected; ERP-D-126 through ERP-D-133 settle separate transfer receipt, company-wide creation, optional generic-money reason, addable categories, backdating, employee-cost branch attribution and pending cash differences. ERP-D-134/138/143 settle generic money profit exclusion, full exact driver remittance and profit sources; ERP-D-136 excludes partial transfer receipt. Mixed remittance components are approved by ERP-D-142. ERP-D-190/191/194 settle visit-revenue branch, manual deduction for partial employment months and the complete tariff per visit. Remaining: exact period/correction rules, accepted fee evidence and carry design. ERP-D-064, ERP-D-069, ERP-D-071, ERP-D-072.

### ERP-Q-006 — Existing operating-tool assumption

Closed. No real legacy system or historical company metrics were supplied. Use provisional sizing for engineering validation under ERP-Q-007; ERP-D-169 excludes more first-client service-mix questions.

### ERP-Q-007 — V1 scope, acceptance, architecture, and pilot

Barcode/labels, Excel intake, brand portal and invoice/tax integration remain deferred. ERP-D-170 through ERP-D-189 settle the physical shipment/stock transfer workflow; exact contract compatibility remains open. Simple utility/back top bar is accepted; global module tabs, sidebar and crowded screens remain excluded. ERP-V2 received focused reference reviews, not wholesale business adoption. Report selection/output, HR history placement, daily inventory monitoring, adjustment input and treasury transfer screens are settled. ERP-D-144/145 require online-only ACID ERP; ERP-D-147 requires desktop/mobile operation. ERP-D-158 approves the stack; ERP-D-159 requires Vitest in every phase. Portable KVM 2/Dokploy hosting, sourced costs and all agreed V1 journeys remain required. Calendar payroll/report periods, retained history and commission effective dates are settled. Remaining: precise allocation/correction rules, compatible versions/data access, final deployment/services and concrete backup/restore design. No master plan/phases approved.

## Earlier questions: preserve IDs and close answered parts

| ID | Topic | Current status / remaining part |
| --- | --- | --- |
| ERP-Q-008 | Paper price | Answered: brand piece values, summed with shipping. Payout arithmetic now closed by ERP-D-049. |
| ERP-Q-009 | Tariff concept | Manually assigned negotiated tiers replace automatic selection. Governorate/optional-area rates and new-order-only changes remain. |
| ERP-Q-010 | Source of piece details | Answered: brand supplies all detail. Exact validation/mapping still needs design. |
| ERP-Q-011 | Inspection | Answered: explicit choice plus separate comments. No Tawsel field invented. |
| ERP-Q-012 | Method direction | Answered: company-to-brand payout. No recipient/driver methods inferred. |
| ERP-Q-013 | Driver remittance timing | After each round, separate from closure; ERP-D-138 requires full exact remittance and ERP-D-142 permits mixed methods. Later outcome corrections remain. |
| ERP-Q-014 | Payout schedule | Per-brand weekdays configured; ERP-D-137 permits off-day payout with reason and normal eligibility/funds checks. |
| ERP-Q-015 | Initial receipt assertion | Answered for ready parcels. Explicitly narrowed in session 006; stored-stock order creation is not new physical receipt. |
| ERP-Q-016 | Barcode and readable ID | Barcode/labels deferred. Human-readable shipment references are numeric under ERP-D-094; technical contract IDs retain their formats. |
| ERP-Q-017 | Branch transfers | Original exclusion explicitly superseded by ERP-D-170. Physical shipment/stock transfer and core ERP-only workflow are settled. Session 018 closes those business details. Exact customer-shipment source-branch revision/redispatch compatibility remains TAWSEL-CHECK-003. Correcting a wrongly recorded branch remains a distinct operation. |
| ERP-Q-018 | Excel intake | Intake deferred; ERP-D-106 separately approves screen, Excel and print/PDF report outputs. |
| ERP-Q-019 | Brand portal | Deferred; staff brand/finance screens remain in discovery. |

## Session 006 answers to the previous displayed batch

| Previous display | ID | Status / selected policy | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-020 | Closed: goods 250 + shipping 50 = recipient 300, company 50, brand 250. | Other fees/refunds and partial/refusal posting are separate rules. |
| 2 | ERP-Q-021 | Historical automatic choice superseded in session 007: manually assign the negotiated tier (ERP-D-063). | Pricing counting/window questions closed; reporting measures remain separate. |
| 3 | ERP-Q-022 | Closed: governorate rate plus optional area override. | ERP-D-173 closes missing-rate behavior: block the whole operation if no valid price applies, preserving input. ERP-D-168 preserves/deactivates referenced master records. Exact implementation remains design work. |
| 4 | ERP-Q-023 | Closed: rate/tier changes affect new orders only. | Exact price-capture point for new preparation flow; explicit correction policy. |
| 5 | ERP-Q-024 | Closed: actual driver remittance required for payout eligibility. | ERP-D-138 rejects partial remittance/allocation. Confirm actual full receipt; later permitted source corrections remain. |
| 6 | ERP-Q-025 | Closed: partial payout and carry-forward accepted. | Posting, concurrency, correction/reversal. |
| 7 | ERP-Q-026 | Closed: optional transaction reference, no images. | Verification/duplicate submission controls, no provider API implied. |
| 8 | ERP-Q-027 | Historical accept-950/record-50 policy explicitly superseded by ERP-D-138. | No incomplete driver receipt or ERP shortage-allocation flow. Full remittance is required; personal shortage cover is outside ERP. |
| 9 | ERP-Q-028 | Salary, shipping-percentage commission, or both, with advances/deductions, included and configured on employee creation. | Packing excluded from base; HR covers all staff. ERP-D-078/085 through ERP-D-088 settle earning, formula/unit, one net payout and advance deduction. ERP-D-167 settles prospective rate changes. Late/corrected facts and carry allocation remain. |
| 10 | ERP-Q-029 | Closed: explicit actual handover from branch back to brand. | Stored-stock restocking is a different decision under ERP-Q-038. |
| 11 | ERP-Q-030 | Visits including no-answer and repeated real visits charged; unvisited postponement not charged. | ERP-D-194 settles full tariff including packing per visit; ERP-D-193 settles reason scope/Other validation. Recipient repeat-payment semantics and evidence/corrections still need exact contract design. |
| 12 | ERP-Q-031 | Full-prepaid cases now answered: goods prepaid leaves shipping due; all prepaid leaves zero driver due and brand shipping debit. | ERP-Q-049 excludes administering the brand's deposits. Exact brand-supplied outstanding line/shipping inputs remain required; refund/correction rules still need design. |

## Session 007 answers to the previous displayed batch

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-032 | Closed: multiple allowed services; one per-order choice with a default. | Changes after confirmation/packing need workflow rules. |
| 2 | ERP-Q-033 | Closed: fixed negotiated increment per brand, included in shipping. | ERP-Q-050 rejects per-packing-operation charging; keep a fixed service uplift. |
| 3 | ERP-Q-034 | Closed by ERP-D-073: fixed monthly amount, anniversary period, configurable and editable per brand. | ERP-D-090/139/140/141 settle timing/renewal, arrears, stopping and next-period price changes. ERP-D-192 closes shorter-month dates. Exact period allocation remains design work. |
| 4 | ERP-Q-035 | Closed: brand pays storage separately. | Anniversary, manual receipt, methods, arrears, stopping and price effective period are settled. Exact calendar/correction mechanics remain. |
| 5 | ERP-Q-036 | Closed: separate variants with separate quantities. | Catalog validation and stock transactions are later design work. |
| 6 | ERP-Q-037 | Closed: block confirmation when available stock is insufficient; show add-stock guidance. | No automatic split or waiting-stock confirmation selected. |
| 7 | ERP-Q-038 | Closed: restock sound returns after actual receipt and condition inspection; damaged/uncertain unavailable. | Quality adjustments/disposal and audit still need rules. |
| 8 | ERP-Q-039 | Superseded as a pricing-counter question: staff assign the agreed tier manually. | Counts remain analytics; exact reporting measures later. |
| 9 | ERP-Q-040 | Closed as no longer applicable: no automatic monthly tier progression/reset. | No further pricing-window question. |
| 10 | ERP-Q-041 | Closed: actual arrival with no answer earns shipping against the brand. | Current Tawsel no-answer collection is unchanged; accepted evidence and posting need design. |
| 11 | ERP-Q-042 | Closed: another actual visit earns another fee; uncollected shipping is charged to brand whether or not another attempt occurs. | Packing does not depend on repacking. Previous recipient-paid fees, rate snapshots and corrections remain integration/finance details. |
| 12 | ERP-Q-043 | Closed: driver enters reason in Tawsel; it returns to ERP. Consolidate Tawsel changes in one file for later owner handoff. | Codes plus Other, the fixed product list and session 016 additions are selected. ERP-D-193 closes partial-refusal scope/Other validation under ERP-Q-149; exact version/correction contract details remain engineering work. |
| 13 | ERP-Q-044 | Partial: commission uses base shipping 50, excluding packing increment 5. | Earning despite brand nonpayment and automatic ERP input settled. ERP-D-085/086 now resolve percentage or fixed amount per eligible actual visit. |
| 14 | ERP-Q-045 | Closed: simple HR for all staff, independent of Tawsel driver onboarding. | Work schedule, manual additions and period locks are settled by ERP-D-079 through ERP-D-084. ERP-D-085 through ERP-D-088 settle formula/unit and replace partial salary payout/manual-only recovery with one net payout and advance deduction. |

## Session 008 answers to the previous displayed batch

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-046 | Closed: fixed negotiated monthly amount per brand. | Fixed monthly amount confirmed. ERP-D-090/139/140/141 settle timing/arrears/stopping/effective rates; ERP-D-192 closes shorter-month calendar behavior. |
| 2 | ERP-Q-047 | Closed: anniversary subscription month, e.g. 20th through following 19th. | Payment/renewal closed by ERP-D-090; ERP-D-140 closes stopping and ERP-D-192 closes shorter-month dates. Exact application remains design work. |
| 3 | ERP-Q-048 | Partly resolved: allow-negative-balance option per brand. | ERP-D-089 closes the new-handover gate. Real incurred fees still recorded. |
| 4 | ERP-Q-049 | Closed as ERP deposit administration: the brand owns that relationship and supplies final delivery amounts. | Preserve exact outstanding piece/shipping amounts and full-prepaid cases; no original sale/deposit ledger required. |
| 5 | ERP-Q-050 | Closed: fixed service uplift independent of repacking; no separate per-packing-operation charge. | ERP-D-194 settles the complete tariff per visit without a packing counter. ERP-D-195 now excludes the prior-paid-attempt scenario in CHECK-002; no fabricated wire repricing. |
| 6 | ERP-Q-051 | Closed representation: coded reasons plus typed Other. | ERP-D-166/171 settle the fixed list/additions. ERP-D-193 closes required partial-refusal cases/Other detail under ERP-Q-149. Exact field compatibility remains TAWSEL-CR-001; no dynamic management API. |
| 7 | ERP-Q-052 | Closed: driver earns commission even when brand has not paid. | ERP-D-085/086 resolve formula and per-visit attribution; rate/correction design remains. |
| 8 | ERP-Q-053 | Closed input: automatic calculation from ERP driver work; setup configuration; salary/commission/total shown separately. | ERP-D-085 explicitly supports percentage or fixed amount. Stable ERP identity attribution is still needed. |
| 9 | ERP-Q-054 | Closed: include manual bonus and overtime amounts. | No attendance-based calculation selected. |
| 10 | ERP-Q-055 | Superseded: partial salary payment removed by ERP-D-087. | Early money is an advance; partial brand payout is unaffected. |
| 11 | ERP-Q-056 | Superseded: ERP-D-088 now includes recorded advances in the applicable payroll net. | Preserve distinct issuance/recovery and avoid duplicate deduction. |
| 12 | ERP-Q-057 | Closed: net payable zero, valid excess obligation carried next month. | Apply the latest ERP-D-088 advance rule with explicit recovery/carry allocation to prevent duplicate deduction. |
| 13 | ERP-Q-058 | Closed: no edits to past/paid months; current unpaid or future adjustments only. | Partial salary payout removed; preserve late accrued obligations through allowed current-unpaid/future adjustments. |
| 14 | ERP-Q-059 | Closed: add work days, hours and weekly day off to employee setup. | Field validation later; no attendance/time-derived payroll inferred. |

## Session 009 answers to the previous displayed batch

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-060 | Closed: independent salary/commission sections; commission can be percentage or fixed amount. | Rate version/effective period and rounding are design details; packing remains excluded. |
| 2 | ERP-Q-061 | Closed: each actual eligible visit earns commission for its performing driver, including repeat visits by different drivers. | Stable identity, delayed/corrected facts and deduplication; no direct custody-transfer override. |
| 3 | ERP-Q-062 | Superseded question: partial salary payout is explicitly removed. | Pay the period's net once; use advances for early money. Partial brand payout remains allowed. |
| 4 | ERP-Q-063 | Closed by amendment: recorded advance reduces the applicable month's net, e.g. 6,000 minus 1,000 gives 5,000. | Allocation/carry/reversal design must prevent double recovery; paid/past calculations stay protected. |
| 5 | ERP-Q-064 | Closed: accept actual intake but block new handover for a no-negative-balance brand without sufficient cover. | Atomic balance/handover checks, covered obligations and existing-work charges. |
| 6 | ERP-Q-065 | Closed: storage payable at period beginning; staff manually record actual brand payment. | Methods settled by ERP-D-122 and overdue continuation by ERP-D-139. Renewal never fabricates receipt. |
| 7 | ERP-Q-066 | Closed: renewal until explicitly stopped, even if stock is temporarily zero. | ERP-D-140/141 settle paid-period-preserving stop and next-period price changes. No automatic prorated refund. |
| 8 | ERP-Q-067 | Closed: reserve immediately on stock-order confirmation; physical on-hand remains until handover. | Concurrent reservation and permitted corrections require design and real database tests. |
| 9 | ERP-Q-068 | Closed: preparation queue and explicit preparation-complete action; ready brand parcels skip it. | Detailed correction/quality workflow only. |
| 10 | ERP-Q-069 | Closed: cancel before handover with reason and release reservations; ready parcels stay in custody until actual brand handover. | Changed/prepared goods and departed execution require distinct rules. |
| 11 | ERP-Q-070 | Closed: unique numeric human shipment reference and optional brand reference with within-brand duplicate detection. | Technical IDs retain contract formats; uniqueness/issuance/reuse design. |
| 12 | ERP-Q-071 | Partly resolved: company compensates the brand; driver-held damage can be charged to driver or split. Warehouse loss prompts a replacement request. | ERP-D-098 through ERP-D-105 settle affected-goods basis, warehouse wording, eligibility, salary recovery, confirmation and scope. ERP-D-110 closes incident-time amount input; found-after-compensation remains excluded. |
| 13 | ERP-Q-072 | Filters requested and a report selection menu requested. | ERP-D-106 through ERP-D-109 settle formats, selected items, placement and a separate adjustments page. Definitions/inputs remain under discovery. |
| 14 | ERP-Q-073 | Answered provisionally: 3 branches, 10 drivers and 150 orders/day are estimates for the first client. | Egypt/EGP, about ten or slightly more simultaneous staff, portable hosting and backup expectations are settled. Validate capacity and all agreed V1 journeys; ERP-D-169 excludes further first-client service-mix questions. |

## Session 010 answers to the previous displayed batch

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-074 | Closed: company pays the brand the value of goods lost in the warehouse. | Ambiguous payment direction is resolved; do not ask again. |
| 2 | ERP-Q-075 | Closed: compensate goods value only, 400 rather than 450 including shipping. | Already-earned original visit fees remain a separate financial policy. |
| 3 | ERP-Q-076 | Partly resolved: reject added fully prepaid valuation complexity; use a positive compensation credit in the brand wallet. | No compulsory new intake value/deposit record. ERP-D-110 accepts incident-time numeric amount entry; fully prepaid delivery support remains. |
| 4 | ERP-Q-077 | Closed: compensate affected pieces only in partial damage. | Exact confirmed amount/source validation still required; no whole-order payment inferred. |
| 5 | ERP-Q-078 | Closed: confirmed compensation becomes eligible in the brand wallet, on the existing payout schedule, independently of driver recovery. | Preserve compensation identity and actual payout history; never fabricate driver remittance. |
| 6 | ERP-Q-079 | Closed: ordinary employee deduction recovered from salary; simple signed movements, payout and period history. | Retain period locks/carry; no additional direct cash-repayment option selected. |
| 7 | ERP-Q-080 | Conditionally accepted if simple and visually clear. | Bounded proposal: ordinary new-shipment form with new reference and a visible original-shipment link. No dedicated replacement subsystem or implemented UX claimed. |
| 8 | ERP-Q-081 | Closed: authorized staff choose replacement shipping payer according to each incident's agreement. | Define ERP posting and supported outstanding recipient snapshot without postdeparture overrides. |
| 9 | ERP-Q-082 | Excluded from V1: company owner and brand handle found-after-compensation cases outside ERP. | Do not add a dedicated recovery process or reopen this rare case. Generic adjustments remain within their separately agreed scope. |
| 10 | ERP-Q-083 | Closed: incident report followed by explicit compensation/allocation confirmation. | Existing modular access; no mandatory second person. Atomic effect/retry/correction design later. |
| 11 | ERP-Q-084 | Closed: screen, Excel and print/PDF, all clearly formatted. | Layout/RTL, pagination, scope and total consistency need implementation acceptance later. |
| 12 | ERP-Q-085 | Closed selection: 1, 5, 7, 8, 9, 10, 12, 15, 18 and 20; 15/18 highest priority. Combine 9/10. Keep 24/25 inside HR; adjustment operations on a separate page. | Define the chosen report measures and financial/count inputs. Unselected standalone reports do not remove required operating records. |

## Session 011 answers to the previous displayed batch

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-086 | Closed: enter the agreed missing compensation amount at incident confirmation, then post once. | Validation/history and duplicate protection are implementation-design work. |
| 2 | ERP-Q-087 | Accepted: operating-period company profit and separate actual-money position. | ERP-D-143 settles source formula and ERP-D-134 generic cash exclusion. Paid-only manual expense data limits remain; exact period/correction design still required. |
| 3 | ERP-Q-088 | Closed V1 breakdown: company total and each branch suffice. | Cost/source attribution still needs definition; no brand/area profit requirement. |
| 4 | ERP-Q-089 | Expenses page, separate expense report, sole-branch default/multi-branch choice approved. | ERP-D-129 settles configurable addable categories. ERP-V2 reviewed as a workflow/branch reference; no wholesale permission adoption. |
| 5 | ERP-Q-090 | Closed as exclusion: record paid expenses and their date only; no unpaid-expense due/payment workflow. | ERP-D-130 settles historical actual dates and separate entry timestamp/actor; final profit formula respects missing unpaid data. |
| 6 | ERP-Q-091 | Closed: separate branch cash accounts and named shared company bank accounts; method distinct from account. | Preserve account/method distinction. Company-wide transfer authority is now explicit; access to other account data follows its own screen/resource scope. |
| 7 | ERP-Q-092 | Transfer page included; reference inspection requested. | ERP-D-126/127/135/136 settle separate screens, company-wide transfer creation/receipt and exact full transfer confirmation. |
| 8 | ERP-Q-093 | Closed: insufficient-funds blocking accepted; separate deposits/withdrawals page added. | Generic direction/optional reason are settled, with profit exclusion under ERP-D-134. Duplicate posting prevention remains required. |
| 9 | ERP-Q-094 | Closed target families: brand, employee, treasury/bank, product quantities and parcel discrepancies all included. | Target-specific adjustment actions, linked effects and permitted Tawsel behavior remain; never an arbitrary database editor. |
| 10 | ERP-Q-095 | Closed: linked reasoned correction/reversal retaining original history. | Date/period rules and side effects still need design; protected HR periods remain. |
| 11 | ERP-Q-096 | Both products and ready parcels included; daily inventory monitoring/search/filtering is the actual need. | ERP-D-123 settles separate views and custody visibility. |
| 12 | ERP-Q-097 | Excluded: system count sessions and pauses. Physical comparison happens outside ERP; correct differences through adjustments. | No follow-up on freezing or running physical count sessions. ERP-D-124/125/132 settle actual-quantity input, shipment-specific discrepancy routing and reservation shortage policy; exact supported transitions still need design. |
| 13 | ERP-Q-098 | Closed: optional dated opening entries for existing businesses, skipped for zero-start companies. | Prevent duplicate setup/corrections without inventing revenue/expense; Excel import remains deferred. |
| 14 | ERP-Q-099 | Closed: same Cash/Bank deposit/InstaPay set for storage, salary/advance and expense payments. | ERP-D-142 separately adds driver-remittance methods and mixed components. Recipient methods remain independently scoped. |

## Session 012 answers to the previous displayed batch

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-100 | Closed: accept Products and Parcels views, proposed fields, relevant filters/search and detail/history. | Quantity/status semantics, authorization and implementation acceptance remain; no new presentation choice required. |
| 2 | ERP-Q-101 | Closed: physical branch stock is the default; explicitly separate driver-custody view/filter. | Do not count driver-held goods as branch available. |
| 3 | ERP-Q-102 | Closed: actual quantity input with calculated difference, reason and history. | Concurrent stock movement protection and distinct physical/available figures need design. |
| 4 | ERP-Q-103 | Closed business direction: shipment-specific loss/damage/missed actual receipt/incorrect or duplicate entry, routed to legitimate workflows. | Exact supported ERP/Tawsel transitions must be reviewed; no invented endpoint or history deletion. |
| 5 | ERP-Q-104 | Closed: a separate receipt-confirmation screen after sending; show money in transit. | ERP-D-136 excludes short/partial transfer handling. Confirm full actual receipt; no automatic rejection refund inferred. |
| 6 | ERP-Q-105 | Closed by explicit amendment: transfer-screen user may select any source/destination company branch; receipt has a separately granted screen. | ERP-D-135 settles receipt-screen reach across company branches. Other modules retain scope; distinct screens do not require distinct people. |
| 7 | ERP-Q-106 | Closed input policy: deposit/withdrawal direction, optional free-text reason; no mandatory purpose categories. | ERP-D-134 settles generic cash exclusion from operating profit. Preserve source-linked histories without duplicate posting. |
| 8 | ERP-Q-107 | Closed: configurable addable expense-category reference data, preserving history. | Catalog examples are illustrative; no role-name gates inherited. |
| 9 | ERP-Q-108 | Closed: actual date picker, past dates including previous month allowed, entry timestamp/actor retained. | Reports reflect late entries; this does not reopen protected payroll periods. |
| 10 | ERP-Q-109 | Closed: fixed salary/manual employee costs to employee branch, driver commission to originating shipment/work branch. | Snapshot attribution and source formulas need design, not renewed branch-choice discovery. |
| 11 | ERP-Q-110 | Closed: actual 5/reserved 7 yields shortage 2 and holds affected pre-handover work. | Choose affected reservations consistently; replenish or explicitly correct without overriding departed execution. |
| 12 | ERP-Q-111 | Closed: cash/bank discrepancy pending explanation, with actual balance and reason; later resolve legitimate movement/loss/approved liability. | Linked resolution and reversal must avoid duplicate cash/cost. |

## Session 013 answers to the previous displayed batch

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-112 | Closed: general deposits/withdrawals affect balances/history, outside operating profit. | Dedicated source posting and duplicate prevention remain implementation work. |
| 2 | ERP-Q-113 | Closed: receipt-screen user may accept any company transfer. | Enforce company/screen scope; do not extend other modules. |
| 3 | ERP-Q-114 | Excluded: no partial/short transfer-receipt workflow. Amount is definite, counted and sent. | Confirm full actual receipt only; no inferred automatic rejection refund. Do not reask the rejected shortage case. |
| 4 | ERP-Q-115 | Closed: payout weekdays guide scheduling; authorized off-day payout allowed with reason and normal eligibility/funds checks. | Actual postings and corrections remain auditable. |
| 5 | ERP-Q-116 | Rejected: no incomplete driver remittance or allocation across brands/orders. Driver must deliver the complete expected recipient money. | ERP-D-138 supersedes ERP-D-056. Personal shortage cover is outside this ERP flow; expected total derives from paid outcomes, not all assigned shipment values. |
| 6 | ERP-Q-117 | Rejected: no partial shipping/goods allocation of driver remittance. | A full confirmation matches actual total; no write-off, fake receipt or added top-up module. Partial brand payout remains allowed. |
| 7 | ERP-Q-118 | Closed: show storage arrears and continue agreement/work until authorized explicit stop, without automatic payout-wallet offset. | Independent shipping-credit gate remains. |
| 8 | ERP-Q-119 | Closed: preserve current paid storage period, stop next renewal; no automatic prorated refund. | Exceptional agreed correction follows existing linked history/payment rules. |
| 9 | ERP-Q-120 | Closed: storage price changes start next subscription period. | Anniversary remains, with historical price preserved. |
| 10 | ERP-Q-121 | Closed and expanded: Cash/Bank deposit/InstaPay, including mixed components of one full remittance; manual actual receipt and optional reference, no images. | Components must total the expected full amount. No recipient-method or provider automation inference. |
| 11 | ERP-Q-122 | Closed source formula: accepted shipping/storage/gross employee/paid expenses/compensation net of recovery example, result 6,200. | Exact period allocation/rounding/corrections need design; do not reask the agreed sources or cash distinction. |
| 12 | ERP-Q-123 | Closed: ERP waits for internet; no offline operations in V1. ACID explicitly required. | Local transaction guarantees need real database evidence; cross-system recovery and catastrophic backup targets remain. |

## Remaining discovery estimate — session 013

Owner requested a remaining-question estimate. Approximately 25-35 material owner questions remain, including the next twelve; about three focused rounds depending on the answers. This is a coverage estimate, not a fixed quota or promise. Existing IDs count historical questions, not remaining work. Main topics are remaining operational/custody choices, support authority/audit, technical/hosting/cost/recovery constraints, specific integration business conflicts and pilot acceptance. Contract reading, mapping, source verification and technical consistency work belong to the planner and should not become unnecessary owner questions. No final plan or phases are approved.

## Session 014 answers to the previous displayed batch

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-124 | Closed: Egypt and EGP only at launch. | Exact money display/rounding is implementation design; no multi-currency scope. |
| 2 | ERP-Q-125 | Closed: desktop and mobile operational use; office users mainly computers, receiving/distribution users often phones. | Responsive journey/keyboard/touch acceptance still required. No native app or offline mode inferred. |
| 3 | ERP-Q-126 | Closed input policy: map/location link sometimes supplied, optional. | Verify actual address/link/coordinate mapping and any selected geocoding service before integration design closes. |
| 4 | ERP-Q-127 | Closed business policy: wrong recorded branch can be corrected before handover; intake only lists assigned branches with sole-branch default or multi-branch choice. | Exact supported source identity/state/revision correction remains to verify. ERP-D-170 adds physical transfer; ERP-D-175 through ERP-D-189 settle its workflow/authority without inheriting treasury scope. Exact customer-shipment mapping remains TAWSEL-CHECK-003. |
| 5 | ERP-Q-128 | Closed: review and confirm pre-handover piece/quantity/service correction effects; no silent update to later tariffs. | Revalidate inventory and supported integration state/revisions. |
| 6 | ERP-Q-129 | Closed: developer support may use ordinary business and financial screens. | Normal rules, audit and Tawsel authority apply; secure support session administration remains design work. |
| 7 | ERP-Q-130 | Closed: account outside ordinary staff list; actions attributed as Technical Support in business history with actual internal actor identity retained. | No invisible business corrections or employee impersonation. |
| 8 | ERP-Q-131 | Initial PostgreSQL/Node.js preference is now followed by approved complete stack direction under ERP-D-158. | Framework selection closed by ERP-Q-136; compatible versions/data access and detailed architecture remain engineering work. |
| 9 | ERP-Q-132 | Closed hosting constraint: existing KVM 2/Dokploy, initial co-location likely; support separate hosting from the beginning without changing business architecture. | Measure shared capacity and finalize deployment/restore configuration; no shared database or local-engine coupling. |
| 10 | ERP-Q-133 | Closed as a budget-cap question: owner asks to proceed and will handle the costs. Expected-cost analysis remains part of the initial request. | Provide sourced indicative costs and unknown account-specific charges; no purchase or unlimited-resource assumption. |
| 11 | ERP-Q-134 | Answered provisionally: about ten or slightly more simultaneous ERP staff for three branches. | Not observed load; growth/headroom and actual performance tests remain. |
| 12 | ERP-Q-135 | Owner expects backups but does not choose precise loss/outage targets. | Do not reask numerical targets as a blocker. Propose bounded backup/restore defaults for plan review; no zero-loss or instant-recovery promise. |

## Remaining discovery estimate — session 014 update

Approximately 13-23 material owner choices remain after this answered batch, including the next twelve. This is the previous estimate reduced by answered questions, checked against remaining coverage; it is not a quota. Source-contract reading, detailed schema/error mapping and internal engineering choices remain planner work. New material conflicts may change the estimate. Backup numerical targets are not a repeated owner questionnaire; a concrete bounded proposal is now provided for later plan review.

## Session 015 answers to the previous displayed batch

| Previous display | ID / reference | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-136 | Closed: proposed stack adopted, with explicit Vitest coverage for important operations in every phase. | Compatible versions, ORM/data access and detailed architecture remain engineering work; no master-plan/phase approval implied. |
| 2 | ERP-Q-137 | Closed shared brand model: one record/wallet across branches, branch-tagged work/stock, cash normally consolidated to main branch; brand may receive payout at any branch. | ERP-Q-148 is now closed for inclusion: physical goods transfer is explicitly selected by ERP-D-170. The shared wallet remains settled. |
| 3 | ERP-Q-138 | Closed: payout-screen user can access/pay the shared eligible total for permitted brands, with branch breakdown. | Account funding authorization and shared-balance concurrency still apply. |
| 4 | ERP-Q-139 | Deferred: no service invoice/tax/e-invoice integration initially. | Selected statements/reports stay included; no compliance claim. |
| 5 | ERP-Q-140 | Closed: one order is one shipment/reference to one recipient/address; no split across two drivers. | Supported partial delivery and legitimate later retry/redispatch remain. |
| 6 | ERP-Q-141 | Closed: calendar-month payroll and Cairo-local calendar-day reporting; rounds can cross midnight. | Exact implementation uses timezone rules and actual timestamps; storage anniversary unchanged. |
| 7 | ERP-Q-142 | Closed: ERP intake/preparation continues while Tawsel is unavailable, with pending/retry visibility and handover awaiting required acceptance. | Exact command sequencing, lost-response recovery and current-state checks require contract design. |
| 8 | See ERP-Q-143 below | Clarification requested; not approved or rejected as an ERP financial policy. Owner asks whether Tawsel can correct money and requests rereading the initial files. | Canonical review confirms bounded driver-reported outcome/amount correction, never ERP settlement. Explain evidence, then ask only the remaining ERP effect. |
| 9 | ERP-Q-144 | Amended: fixed product-level reasons defined in ERP for all companies, rather than company-editable management. | Driver-origin reason entry stays selected. ERP-D-171 amends the fixed list; ERP-D-193 closes partial-refusal use and mandatory Other detail under ERP-Q-149. No new dynamic catalog endpoint is required by these choices. |
| 10 | ERP-Q-145 | Closed: new commission rate applies from effective change date onward. | Preserve historical visit rate and handle delayed facts by work time; paid/past payroll remains protected. |
| 11 | ERP-Q-146 | Closed: retain business/audit history without automatic V1 purge; deactivate referenced master records. | Retention/access design is distinct from backup-copy retention and any later legal deletion request. |
| 12 | ERP-Q-147 | Closed as unnecessary discovery: cover all agreed scope and do not ask about first-client service mix again. | Acceptance covers all three services and included workflows. No artificial pilot subset or final-plan approval inferred. |

## Correction clarification — contract fact, not a new owner decision

The primary agent reread 01, 02 and 03 completely; delegated reviewers inspected the relevant 04 authority/events/history and 05/06 correction schemas, accepted/rejected examples and dependencies. The detailed coverage is in docs/discovery/references/ERP-TAWSEL-CORRECTION-REVIEW.md. No full reading of every 04/05/06 body or new runtime test is claimed.

Current `outcome.correct` is a human owning-driver operation with `correction.own`; ERP service credentials cannot call it. A permitted correction appends a new effective driver-report revision. `outcome.corrected` is emitted by the current sender. A recorded fixture changes two delivered pieces plus shipping, reported EGP250, to one piece plus shipping, reported EGP150, with unchanged unit price and retained previous report. Closed workday and dependent receipt/disposition/redispatch constrain corrections. This never instructs ERP to refund, change a treasury entry, pay a brand or alter payroll. A previously accepted correction may arrive late; the fixture is not proof of arbitrary correction after ERP payout or after workday closure. Session 017 ERP-D-174 closes the ERP retry/affected-hold/review policy while preserving this contract distinction.

## Session 016 answers and explicit scope change

The owner acknowledges the Tawsel correction explanation. This settles the misunderstanding about source authority, not the ERP policy for a later financial difference.

| Previous display | ID / reference | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | See ERP-Q-143 below | Owner proposes a queue/retry approach and asks for advice; no financial-adjustment policy adopted. | Explain transport/application retry versus an accepted correction affecting posted money; recommend scoped known-gap holds and a review queue, without claiming global event finality or automatic refunds. |
| 2 | ERP-Q-148 | Closed inclusion: physical transfer from one branch's inventory to another is required; whole shipment or stock quantities, assigned available driver and destination staff actual receipt. | Explicitly supersedes ERP-D-042/ERP-R-043. Session 017 closes ERP-only execution, grouping, eligibility, assigned-branch scope, salary-covered carrier pay, actual receipt and cancellation. ERP-D-183 through ERP-D-189 now close brand charging and the remaining carrier/tracking/receipt/trip choices. |
| 3 | See ERP-Q-149 below | Fixed proposed list amended with missing pieces and no answer after arrival under ERP-D-171. | ERP-D-193 now closes partial-refusal use and required Other detail. A reported missing-piece reason is distinct from confirmed loss under existing incident rules. Keep no-answer as its existing outcome with separate arrival evidence; do not reask the two added labels. |
| 4 | ERP-Q-150 | Closed: select one storage-agreement branch for revenue attribution, independently of actual payment branch/account. | ERP-D-172. Historical branch attribution and exact service-period allocation are design work, not permission to duplicate the charge. |
| 5 | ERP-Q-151 | Closed: valid applicable price is essential; the entire commercial operation must fail to complete if missing, with entered data preserved. | ERP-D-173. No confirmed order, stock/custody posting or external submission on failed validation. Missing override alone still uses the agreed governorate base. |

## Session 017 answers and accepted visual reference

| Previous display | ID / reference | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-143 | Closed: safe automatic retry, scoped known-gap payout hold and Settlements review of genuine differences after posted money are accepted. | ERP-D-174. Design exact readiness and linked resolution transactions without automatic refunds or claiming an empty queue proves finality. |
| 2 | ERP-Q-152 | Closed: ERP staff assignment/handover and destination actual receipt are sufficient; no Tawsel driver transport task/UI. | ERP-D-175. Retain a compatibility check for relocating customer shipments already known to Tawsel and subsequent dispatch/return branch. |
| 3 | ERP-Q-153 | Closed: grouped manifest across brands is accepted, with inventory/location updates on custody confirmation. Owner additionally requires searchable current shipment state/whereabouts/history using the attached timeline design. | ERP-D-176/177. Separate actual handover from actual destination receipt; screenshot fields are not automatic business requirements. ERP-D-187 now settles company-wide operational tracking visibility under ERP-Q-162. |
| 4 | ERP-Q-154 | Closed: physically held usable goods, unreserved stock, prepared orders as whole shipments and transfer reservation are accepted. | ERP-D-178. ERP-D-186 now includes previously attempted, actually received eligible shipments; exact cross-branch Tawsel mapping remains under review. |
| 5 | ERP-Q-155 | Closed: sending from assigned branches to any company branch; receiving only assigned destination branches. Owner asks how multiple assigned branches work. | ERP-D-179. Explain existing consistent capabilities, source selector and assigned-destination receipt filters; do not reask authority or infer manager powers. |
| 6 | See ERP-Q-156 below | Driver remuneration resolved: transport is covered by salary without extra transfer commission. | ERP-D-180. Ask only the unanswered brand-charge part. |
| 7 | ERP-Q-157 | Closed: record actual received quantities/condition; usable, damaged and missing quantities remain distinct pending legitimate resolution. | ERP-D-181. ERP-D-188/189 settle exterior parcel checks and one physical trip per manifest. |
| 8 | ERP-Q-158 | Closed: cancel/release before handover; after handover require actual destination or source-return receipt before stock re-enters a branch. | ERP-D-182. Concurrency and exact correction/recovery design remain. |

## Multi-branch explanation — already covered by accepted decisions

A user assigned branches A and B may choose A or B as source, send to any company destination, and receive incoming transfers addressed to A or B. Receiving filters may show A, B or all assigned branches. A single branch is selected directly. Sending and receipt each require their screen access; server checks enforce the same branch set as the UI. A manager follows these grants rather than a hardcoded job title. If one user has both screens and both relevant branches, no existing decision requires a different person to perform receipt. These mutation rules do not inherit treasury's company-wide exceptions. ERP-D-187 separately grants company-wide operational shipment tracking to users with that screen.

## Session 018 answers and scope amendment

| Previous display | ID | Current status | Remaining part only |
| --- | --- | --- | --- |
| 1 | ERP-Q-156 | Closed: internal company transport is free to the brand. | ERP-D-183; driver work remains salary-covered, with no transfer commission or customer-delivery fee. |
| 2 | ERP-Q-159 | Closed: eligible active company drivers may be selected across branches, retaining source-branch preference. | ERP-D-184/185 refine ranking with known at-branch/no-round priority. Identity and current-state provenance remain engineering work. |
| 3 | ERP-Q-160 | Closed: carrying a transfer during a Tawsel customer round is allowed; prioritize drivers at the branch without an active round and show working drivers' round status. | ERP-D-185. Do not pretend branch membership proves physical presence or received-evidence monitoring is a live occupancy lock. |
| 4 | ERP-Q-161 | Closed business need: eligible returned shipments may relocate after actual branch receipt and undergo the next customer dispatch from the destination, retaining reference, captured price and history. | ERP-D-196 qualifies the earlier ERP-D-186 commitment: latest answer reaffirms ERP receipt/inventory movement but does not settle whether subsequent customer redispatch was withdrawn. Reconcile internally without an unverified mapping or repeated questionnaire. |
| 5 | ERP-Q-162 | Closed by amendment: tracking-screen users search all same-company shipments and view the complete operational journey/current state and custody. | ERP-D-187 explicitly replaces the proposed assigned-branch search limit. Mutation and unrelated finance/HR/report access remain separately scoped. |
| 6 | ERP-Q-163 | Closed: check whole sealed parcel identity/exterior; count loose stock by quantity. | ERP-D-188. Suspected shortage/damage uses existing review; do not certify unseen parcel contents or routinely open every parcel. |
| 7 | ERP-Q-164 | Closed: every planned physical trip has a separate transfer manifest. | ERP-D-189. Unexpected shortage stays visible and is not automatically a planned later trip. |

## Session 019 answers — commercial consistency choices closed

The owner answered the displayed 1-5 batch. No new business batch is needed now. Recommendations are adopted only where the answer accepts them; the salary recommendation is explicitly amended.

| Previous display | ID | Approved outcome | Remaining design or contract work | Links |
| --- | --- | --- | --- | --- |
| 1 | ERP-Q-165 | Closed: the actual customer-dispatch/work branch earns the full visit service charge including packing uplift; each visit retains its historical branch. | Exact posting/report allocation and correction transactions. Internal movement creates no brand fee. | ERP-D-190; ERP-R-199 |
| 2 | ERP-Q-166 | Closed by amendment: keep configured salary; responsible staff calculate and enter an ordinary deduction for a partial first/last month, then pay the net. The proposed special month-salary input is not selected. | Existing single payout, protected periods, advances and deficit carry still apply. No automatic proration or attendance engine. | ERP-D-191; ERP-R-200 |
| 3 | ERP-Q-167 | Closed: preserve the original storage anniversary day, temporarily use month-end when absent, then return to the original day. | Calendar/leap-year/timezone implementation and exact period allocation. Fixed charge; no automatic discount/refund. | ERP-D-192; ERP-R-201 |
| 4 | ERP-Q-149 | Closed: reason choices apply to partial refusal as well as whole refusal; Other requires an explanation. | TAWSEL-CR-001 still needs compatible exact schema/event/correction changes. Missing-piece report does not confirm loss; no-answer needs separate arrival evidence. | ERP-D-193; ERP-R-202 |
| 5 | ERP-Q-168 | Closed: base50 plus packing5 means55 for every actual eligible customer visit; percentage commission uses base50 each time. | ERP-D-195 closes CHECK-002 for the excluded prior-paid-attempt scenario. No repacking counter or fee for unvisited postponement/internal movement. | ERP-D-194; ERP-R-203 |

Business questions currently requiring a new owner answer: none identified. This does not close the integration design or approve the future master plan. Continue selected-contract reading and concrete engineering proposals; ask only if a material new conflict or business choice is found.

## Session 020 response to the technical checks

TAWSEL-CHECK-002 is closed for the selected scope by ERP-D-195 / ERP-R-204: the owner excludes the earlier-attempt shipping-payment scenario that prompted the question. This does not claim the unresolved contract aggregation formula was verified, and it does not revoke prepaid-to-brand cases or per-visit company fees. Historical evidence remains in the change register; no further owner answer is requested for this case.

TAWSEL-CHECK-003 is now internal engineering scope/lifecycle reconciliation under ERP-D-196 / ERP-R-205. The latest answer says the posed case will not occur and reaffirms ERP carrier transfer with actual destination receipt updating stock. That answer neither proves changed-branch Tawsel compatibility nor clearly revokes the earlier subsequent customer-redispatch requirement in ERP-D-186. Preserve that tension explicitly, suspend any unsupported mapping promise and resolve the selected lifecycle during design. This is not another owner questionnaire or a reason to delay visual work.

Historical technical questions and current statuses remain consolidated in TAWSEL-CHANGE-REQUESTS.md. ERP-INTEGRATION-COVERAGE-AUDIT.md distinguishes actual source reads from remaining planner review. TAWSEL-CR-001 remains the reason-field extension; the unselected transport-task CR-002 does not become a dependency. UI-DESIGN-BRIEF.md contains the proposed visual samples, prototype, review references and later phase acceptance controls, not implementation phases.

## Known contract boundaries

- Tawsel owns execution/driver outcomes and explicit rounds. A round is not an immutable ten-order batch; closure may leave held work, several rounds can occur per day, and closure is not cash receipt.
- Reported collection is not remittance; return offer is not actual receipt or reusable stock; event receipt is not successful projection.
- Reviewed Refusal has no reason field and rejects extra properties. Driver codes plus typed Other and a fixed product-level list are selected; compatible fields/version behavior remain an explicit extension in TAWSEL-CHANGE-REQUESTS.md. Dynamic catalog management is not required by the current decision.
- Reviewed no-answer has no reported payment or unpaid shipping claim. The owner now requires a separate ERP commercial visit charge when actual arrival is established.
- Missing physical arrival stays unknown. Service credentials cannot call driver-human outcome endpoints or invent physical evidence.

## Later coverage without restarting discovery

- Physical inter-branch business choices are settled: ERP-only movement, grouping, reservations/eligibility, assigned-branch mutations, no brand fee or extra commission, company carrier pool/concurrent delivery, actual receipt, sealed-parcel checks, cancellation and one-trip manifests. Tracking is explicitly company-wide operational read. Exact source-branch revision/cross-branch redispatch compatibility remains TAWSEL-CHECK-003, not an unanswered business inclusion question.
- Exact supported parcel/custody correction transitions, individual adjustment audit and stock-origin returns. Quantity/parcel input, inventory presentation, custody visibility, reservation shortages and employee-cost branch attribution are settled. Formal count sessions/freezes are excluded; numeric compensation input is settled. Compensation basis, confirmation, eligibility and salary recovery are settled; found-after-compensation workflow is excluded. Reservation, preparation completion and pre-handover cancellation/release remain settled. Partial recipient delivery is not permission to silently ship a short-stock order.
- Exact service-period revenue allocation, corrections/statements and actual payment record design. ERP-D-192 settles shorter-month anniversary dates. Fixed price, timing/renewal, overdue continuation, paid-period-preserving stop, next-period price changes and payment methods are settled.
- Manual tier/rate changes, missing/disabled rates, effective price snapshots and concurrent creation. ERP-D-173 settles whole-operation blocking when no valid price applies; the optional area override rule remains unchanged. Analytics counters and time windows do not control pricing.
- ERP-D-174 settles technical retry, affected payout holds for known gaps and review of a genuine difference after posted money. Exact linked adjustment transactions, profit allocation and financial-record scope remain design work; automatic money changes are not approved. Full driver remittance, mixed receipt methods, full transfer receipt, company-wide transfer screens, off-day brand payouts and generic cash profit exclusion are settled. Partial money-remittance/treasury-transfer workflows are excluded; actual physical-goods subset/condition receipt, sealed-parcel checking and one manifest per planned physical trip are approved. Reports/output formats remain selected; service invoices/tax integration are explicitly deferred.
- Commission rounding and stable attribution, advance recovery/carry allocation, late/corrected outcomes and current/future payroll adjustments. ERP-D-191 selects ordinary manual deduction for partial first/last months. Effective-date prospective rates, calendar-month payroll, formula/unit, one net salary payout and advance deduction are settled. Past and paid calculations remain protected.
- Final screen/module inventory, responsive operational journeys, Arabic RTL/library compatibility, issuer operations and secure support sessions. Support business access, visible audit and shared brand wallet/payout scope are settled. Existing mutation permissions remain; company-wide treasury-transfer and operational tracking scopes are explicit exceptions for their own screens.
- Use the provisional Egypt/EGP, three-branch, about ten simultaneous staff envelope for engineering capacity/acceptance evidence across all agreed V1 scope. Stack, retained business history, KVM 2/Dokploy portability and cost-estimate direction are settled. Finish optional services and operational design. Propose bounded backup/restore defaults for review without repeating numerical targets, narrowing scope to first-client services or promising zero loss.
- Exact selected commands/events, revisions/IDs, outbox/inbox, projections, replay/reconciliation, all failure branches and owner-visible recovery. Include optional map-link validation and accepted pre-handover branch/content correction policy; any real unsupported behavior becomes a specific change request, not an assumed endpoint.
- Meaningful Vitest for important operations in every phase, actual database guarantees, browser journeys, and owner-run manual acceptance. No tests claimed from reference fixtures alone.

## Source and access status

Tawsel canonical reference remains 32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada. Prior owner provenance a891d189... does not advance it. TAWSEL-BASELINE.md now records the verified local unchanged copies and manual update process, with INTEGRATION-CHANGELOG.md. Required foundations and indexes were read; focused review limits and remaining supplied sections are in the discovery log and docs/discovery/references/ERP-INTEGRATION-COVERAGE-AUDIT.md. No missing attachment is pending; targeted contract semantics remain open.

ERP-V2 commit 7254e34b49acfbe394da3a889abe6e458084cb38 was inspected through selected frontend sources. Smooth UI llms-full.txt was fetched, with selected sections read. See docs/discovery/references/ERP-UI-REFERENCE-NOTES.md and ERP-FINANCE-REFERENCE-NOTES.md for exact review limits. The owner separately authorized focused HR/finance source review; no running UI, dependency compatibility proof or wholesale business-logic adoption is claimed.
