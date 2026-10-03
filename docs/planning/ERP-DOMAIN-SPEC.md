# ERP Domain Specification

Current authority, session025 (2026-10-03): ERP-D-205 / ERP-R-214 approve PLAN-001 and authorize phase authoring. Detailed plan mechanics below are adopted; original proposal/review wording is retained as drafting provenance, not a renewed approval gate. External contract gaps, unverified runtime targets and the unnamed palette remain explicitly limited. No production implementation is authorized by this authoring turn.

Status: owner-review planning draft, updated in discovery session 024 on 2026-10-03. This document supports PLAN-001 `master-plan.md`; it is not an implementation phase or an assertion that the application implements these rules.

## 1. Authority and reading order

Read this document with [ERP-DATA-AND-TRANSACTIONS.md](ERP-DATA-AND-TRANSACTIONS.md), [ERP-DECISIONS.md](../../ERP-DECISIONS.md), the requirement register in [ERP-DISCOVERY-LOG.md](../../ERP-DISCOVERY-LOG.md), [ERP-REPORT-CATALOG.md](../../ERP-REPORT-CATALOG.md), and [ERP-TAWSEL-INTEGRATION-PLAN.md](../../ERP-TAWSEL-INTEGRATION-PLAN.md). The latter owns exact Tawsel wire fields, operations, event coverage, revisions, permissions and failure handling.

The source decisions were read through ERP-D-199 and requirements through ERP-R-208; the subsequent owner answers are incorporated as ERP-D-200 through ERP-D-204 and ERP-R-209 through ERP-R-213. Historical superseded rows remain evidence, not current requirements. ERP-V2 finance/HR notes explain reference observations; they do not authorize copying its business logic. Tawsel's phase/evidence documents were inspected as examples of specificity and honest test reporting, not as instructions to execute them.

Two labels distinguish authority:

- **Owner rule:** already approved in the cited decision register.
- **Plan proposal:** a concrete engineering or accounting-presentation detail submitted for master-plan review. It must not be reported as an earlier owner decision. The proposals are explicit so a later agent cannot silently choose a different rule.

Local status/type names below are proposed ERP names, not new Tawsel schema enums. Section 17 distinguishes the five newly approved financial policies from remaining engineering proposals and the contract dependency. No implementation prompt may substitute a guess for an item still awaiting its stated review.

## 2. Product boundary and terms

**Owner rules:** ERP-D-001/002/008/011/016/019/023/024/028/038/146/160/163/169.

V1 serves one shipping company per installation, in Egypt and EGP, with several branches. It includes all three agreed services, staff access, inventory and custody, preparation/dispatch coordination, actual returns, transfers, incidents, brand money, company accounts, simple HR, storage subscriptions, expenses, reports, adjustments and operational integration recovery. Later SaaS is an ambition, not a V1 shared control plane.

| Term | Meaning and owner |
| --- | --- |
| Brand | Company-level commercial customer. One account/wallet spans branches; product stock remains branch-specific. |
| Recipient | Person receiving a shipment. ERP does not administer their purchases/deposits with the brand. |
| Shipment | One commercial order, numeric reference, recipient/address and set of pieces. Never split concurrently between two drivers. |
| Visit | One evidenced actual customer visit within an execution attempt. It is not a shipment count, route forecast, transfer trip, event delivery or replay. |
| Recipient payment | Tawsel's effective driver-reported payment fact. It is not company receipt. |
| Driver remittance | Company's explicitly confirmed actual receipt of the complete reported recipient money after a round. |
| Brand payout | Company pays the brand from eligible money. The user-facing business term `tahseel` is reserved for this concept. |
| Brand entitlement | Signed commercial account value; some positive components may still await remittance or resolution before payout. |
| Custody | Who physically holds a parcel/product quantity, independent of commercial/execution/financial state. |
| Return offer | Driver-reported intent/claim. It is not physical branch receipt. |
| Adjustment | Authorized typed correction with original evidence, reason and links. It is not an editable arbitrary balance or direct database access. |

ERP owns the commercial and physical records it is authorized to assert. Tawsel owns driver execution, routing, attempt outcomes and their allowed corrections. No ERP administrator, including developer support, can override protected execution or impersonate the driver. ERP does not share Tawsel's database or call Engine directly.

## 3. Master data and setup

**Owner rules:** ERP-D-015/032/033/037/040/051/052/061/063/065/066/067/068/074/084/085/094/115/121/129/149/151/152/166/167/168/172.

### 3.1 Brand setup

The setup form has identity/contact, services/prices, payout settings and storage settings as focused sections. Required operating configuration before the relevant transaction can succeed:

- Brand name and active status; generated internal identity; optional business/contact fields do not become integration identifiers.
- Enabled services: `brand_packed`, `company_packed`, `stored_stock`. Select one enabled default. Each shipment chooses exactly one enabled service.
- Staff-selected tariff tier. Volume ranges describe negotiated tiers; measured order volume never changes the tier automatically.
- Partial-delivery permission, distinct from the shipment's inspection-before-receipt choice.
- Fixed packing uplift for applicable company-packed/stored-stock work. A configured zero is valid; absence of necessary configuration is an error.
- Agreed payout weekdays and `allow_negative_balance`.
- If storage is enabled: fixed monthly fee, start date, original anniversary day, agreement branch and active/stop settings. Multiple stock branches do not create multiple subscriptions.

**Plan proposal:** keep dated policy revisions. New orders snapshot selected service, partial policy, commercial tariff and relevant agreed settings. Later tariff/brand edits do not silently modify registered orders. Operational payout-day and debt settings are read as the current policy when their action occurs and are audited; they do not rewrite historic transactions.

### 3.2 Geography and tariffs

Require a configured governorate. Area is optional and must belong to the selected governorate. Use a matching tier/area override if present; otherwise the tier/governorate rate. Never substitute another tier, nearest area, zero or today's unrelated price. Distinguish a valid explicit zero from no configured price.

Price selection and its revision are captured on the confirmed order. Changing tier or tariff affects new orders only. An explicit pre-handover correction may adjust incorrect service/pieces with a reviewed before/after summary; simply editing a tariff is not such a correction.

### 3.3 Products and employees

Products/variants belong to a brand, with separate whole-piece quantity balances by variant and branch. Product/variant identity cannot be inferred from an arbitrary display label or recipient phone. No serial-number, lot, purchasing, product-cost valuation or manufacturing system is added.

Employee setup is independent of login and operational-driver setup. It includes identity/contact, branch, work days, hours, weekly day off and two independent switches: salary and commission. Commission selects either percentage of base shipping or a fixed EGP amount per eligible visit. A commissioned operational driver has an explicit, unambiguous effective employee association. Other employees need no Tawsel account.

Deactivate referenced master records; preserve names/codes as necessary to explain historical records. Historical driver associations and compensation rates are effective-dated, never silently reassigned by name matching.

## 4. Shipment intake and correction

**Owner rules:** ERP-D-012/021/031/035/037/041/046/052/064/065/068/075/089/091/092/093/094/149/150/163/173.

### 4.1 Common confirmation input

Capture brand, assigned receiving/stock branch, service, optional brand reference, recipient name, phone, written address, governorate, optional area, optional location link, pieces/whole quantities, brand-declared outstanding money, inspection choice and comment. A phone/address match is not a duplicate shipment key. An existing brand reference produces the agreed within-brand duplicate warning, not automatic merge or silent rejection.

The numeric shipment reference is assigned when confirmation commits, with uniqueness and no reuse. Its format does not change canonical Tawsel IDs. A failed operation does not become a registered shipment or a false physical receipt; preserved form input remains a draft.

**Plan proposal:** UI accepts human money in EGP with at most two decimal places, converts to integer piastres, and shows a final summary of goods outstanding, recipient shipping, recipient total, commercial tariff and any brand-paid portion. For ordinary unpaid goods, sum the declared piece amounts; do not add an inclusive total to those amounts again. When partial delivery is permitted, exact outstanding value must be available per whole piece/unit under the contract mapping. Never allocate an aggregate prepaid balance proportionally by guesswork.

Inspection choice and comments do not alter prices or partial-delivery authority. An optional map link is retained as input; it is not proof of valid geocoded coordinates.

### 4.2 Three service paths

| Service | Physical assertion at confirmation | Preparation | Stock treatment |
| --- | --- | --- | --- |
| Brand-packed ready parcel | Staff confirm actual branch receipt of that complete parcel. | Skip preparation queue. | Parcel custody record; no invented loose-product receipt. |
| Brand-supplied order, company packing | Staff confirm the actual brand-supplied goods/order at the branch. | Queue, then explicit preparation complete. | Shipment-bound custody; do not invent reusable loose stock from its contents. |
| Stored-stock fulfillment | Goods were already physically received into the brand's stock. | Reserve, queue, then explicit preparation complete. | Reserve all required available variants atomically. Do not record a second inbound receipt. |

No valid tariff means the entire commercial confirmation fails, including reservation, custody assertion and integration submission. Insufficient stored stock also fails the whole confirmation and names the short variant/quantity. Partial-delivery permission never authorizes short-stock confirmation.

### 4.3 Preparation and cancellation

Preparation completion records actor/time and permits later handover if all other gates pass. It does not assert driver receipt or earn shipping. Reserved stock stays physically on hand until a real handover.

Before driver handover, staff may cancel with a reason. Release active order reservations; retain externally received parcels in branch custody until actual return to brand. For physically packed stored goods, **plan proposal:** cancel the order reservation but mark the material unavailable for unpacking/condition confirmation; release it to loose available stock only after that actual action. This prevents the same sealed units being promised again before staff can use them. It adds no repacking fee.

Wrong branch correction is available only when the goods are actually at the corrected branch and no driver handover occurred. It is not a physical transfer shortcut. Recheck user's assigned branches, expected version, inventory allocations and Tawsel source constraints. Piece/quantity/service correction shows exact stock and money changes, revalidates the entire order, and records an immutable revision/reason. There is no after-departure override.

## 5. Preparation, customer dispatch and execution

**Owner rules:** ERP-D-018/019/020/021/024/025/026/028/089/092/163/165/174.

The dispatch screen distinguishes prepared work from confirmed physical driver receipt. Handover prerequisites are: known physical custody at the dispatch branch; complete preparation where required; sound/available contents; no competing reservation/transfer; allowed assigned branch and driver; commercial cover gate; valid source revision; and the required Tawsel acceptance. Additional prepared work stays at the branch.

During Tawsel outage, intake and preparation continue in ERP. Show pending/error/retry with the blocking reason; do not display successful driver assignment or branch-to-driver custody from an unaccepted action. Retrying an unknown response keeps the same action identity. Exact custody/outbox sequencing is specified in the integration plan.

Before departure, ordinary permitted remove/reassign actions retain their documented lightweight behavior, with background audit and no unnecessary mandatory reason. After departure, staff cannot edit protected assignment, prices, urgency or outcomes, or issue an invented remote cancellation. Contacting a driver does not change outcome/custody. A handover/start/reassign race must end with one accepted state under Tawsel's authority.

Keep one shipment independent from others at the same address. Handle Tawsel's 50 remaining planned stops, including branch stops, as atomic batch acceptance/rejection; this is not a daily ERP order cap.

Partial delivery operates on accepted whole-piece quantities. Rejected remainder returns; it is not deferred into another partial customer visit. A legitimate whole-order retry/new dispatch cycle retains previous history and observes exact receipt/eligibility rules. ERP does not rebuild driver routing, arrival, retry or workday closure.

## 6. Inventory, custody and inter-branch transfer

**Owner rules:** ERP-D-068/120/123/124/125/132/170/175–189/196.

### 6.1 Monitoring definitions

Products and Parcels are separate daily views. Default to goods physically at the selected permitted branch. Driver-held goods require an explicit view/filter and do not increase branch availability. Products show on-hand, reserved, available, unavailable and a visible shortage if reservations exceed sound physical stock. Parcels show numeric reference, brand, recipient, current status, current custodian/location and branch age.

Stock is custody quantity, not company-owned merchandise value. A packed stored-stock shipment and its underlying reserved product quantities must not be added as two independent inventories. Section 4 of the data specification defines the conservation model.

Searchable tracking shows every company shipment to users granted that screen, even outside their assigned branches. They may view its complete operational timeline. This read exception grants no transfer mutation, financial/HR data, public tracking or unrestricted report export. Use actual events/time and source freshness; no invented percentage, GPS, ETA or inner-piece verification.

### 6.2 Transfer lifecycle

One manifest means one planned physical trip, one source, one destination and one active company carrier. It can group multiple whole shipments and loose product/variant quantities from several brands. Source and destination must differ. Source choices are assigned branches; destination may be any company branch. Receipt requires assigned destination scope and the receipt-screen permission. The same multi-branch user can act at both ends when authorized; no mandatory second person.

1. **Reserve:** select only usable source-held goods. Loose quantities must be unreserved. A prepared order moves as a whole shipment with its existing component allocation protected; it cannot simultaneously be dispatched or reserved for another transfer.
2. **Select carrier:** allow active company drivers from any branch, including a driver on a Tawsel round. Rank known at-branch/no-round evidence first; within comparable availability prefer source-branch drivers. Display current round and evidence age/unknown status. Affiliation is not GPS or proof of physical presence.
3. **Actual handover:** staff attest physical handover. Source on-hand/custody leaves the branch; transfer custody holds the exact contents. Neither branch has these units available.
4. **Actual destination receipt:** inspect sealed parcel identity/exterior and count loose units. Record sound received, damaged received and unresolved missing quantities. Sound loose stock becomes available; damaged/uncertain material remains unavailable. Prepared shipment components stay allocated to that shipment.
5. **Resolve:** retain missing quantities for investigation/incident or later truthful receipt. Do not auto-confirm compensation or certify a sealed parcel's unseen contents.

Before handover, cancellation releases transfer reservations. After handover, cancellation cannot restore source stock. Actual destination receipt or actual physical return receipt at the source accounts for the contents. Unexpected short receipt stays a discrepancy; deliberately planned later trips use new manifests.

Internal transfer creates no brand fee, delivery revenue or extra driver commission. Salary already covers it. Any actual operating expense is entered once through Expenses.

An eligible returned shipment may physically transfer after actual branch receipt. Its later Tawsel customer redispatch from a different branch remains the explicitly qualified `TAWSEL-CHECK-003` dependency; ERP-only physical movement must not be misrepresented as proof of that integration behavior.

## 7. Customer returns and return to brand

**Owner rules:** ERP-D-008/021/024/025/058/068/188.

The native ERP receipt screen selects driver, inspects the documented return request and confirms only the actual received subset at the original dispatch branch. Returned items remain with the driver until accepted physical receipt or a legitimate documented disposition. Do not use a general all-returns-cleared gate; the documented claimed subset and departure/resume rules remain specific.

Record condition separately from receipt. Sound stored-stock returns may return to stock only after physical receipt and condition check. Damaged/uncertain goods remain unavailable. For a complete externally supplied parcel, receipt preserves parcel identity; it does not create loose SKU stock. Partial delivery history and accepted/rejected quantities remain intact.

The action returning goods to the brand records actual handover out of branch custody, recipient/brand identity, quantities, actor and time. A return offer, cancelled commercial order or planned pickup never creates this handover automatically. Loss/damage without receipt uses the supported disposition and ERP incident flow; never manufacture reusable stock.

## 8. Visits, charges and recipient money

**Owner rules:** ERP-D-021/022/049/053/059/064/069/071/075/078/086/190/194/195/203.

For each actual eligible visit, preserve base tariff `B`, packing uplift `U`, complete tariff `C = B + U`, dispatch/work branch, driver, effective work time and stable source evidence. Company-packed base 50 + uplift 5 earns 55 for each eligible visit; percentage commission uses 50. Ready parcels have no company-packing uplift.

ERP-D-203 adds the explicitly approved company-funded replacement exception: retain the standard fee and an equal linked shipping waiver, producing zero net shipping revenue and no recipient/brand shipping due while preserving goods due and normal commission. Section 10 specifies that exception; do not apply the ordinary brand-paid fee formula to a waived replacement.

An actual refused or no-answer visit earns the fee. A postponement before going to the recipient earns none. Missing arrival evidence means unknown and requires recovery/review, not a fabricated visit. The accepted integration mapping determines reliable visit identity; event delivery or correction revision is never itself another visit.

**Plan proposal:** an established arrival may establish earned fee while recipient-payment allocation is still pending. Do not interpret a missing outcome/payment report as zero payment and immediately charge the brand. Retain pending payer allocation until the supported effective outcome establishes recipient shipping paid or unpaid; then post the corresponding brand debit once. The existing known brand-funded cover remains reserved while its dependency is unresolved. This preserves earned revenue without inventing recipient payment or premature brand liability.

### 8.1 Ordinary financial examples

Amounts below are EGP displays; persistence uses piastres.

| Case | Recipient report | Company earned fee | Brand movement | Payout readiness |
| --- | --- | --- | --- | --- |
| Goods 100 + 150; shipping 50; delivered | 300, including 250 goods and 50 shipping | +50 | +250 goods entitlement; do not subtract 50 again | Goods credit waits for full actual remittance. |
| Goods prepaid to brand, shipping payable to driver | 50 shipping; zero goods | +50 | No second goods credit; no brand shipping debit when recipient paid it | No fictitious goods payout or duplicate collection. |
| Goods and shipping prepaid to brand | Zero recipient money | +50 | -50 brand shipping | No fictitious driver remittance prerequisite. |
| Refused after actual visit; recipient pays no shipping | Zero | +50 | -50 brand shipping | Brand may become negative; facts are still recorded. |
| Full refusal but recipient pays the owed shipping | 50 shipping only | +50 | Zero goods credit; no additional -50 debit | Money remains driver-held until remittance. |
| No answer after arrived visit, no payment | Zero | +50 | -50 brand shipping | Distinct no-answer outcome, not an invented refusal/payment refusal. |
| No visit; postponed before travelling | Zero | Zero | Zero visit debit | Custody stays truthful; no commission. |
| Two eligible visits, company-packed B50/U5; first unpaid, second pays 55 shipping | Second report includes only its supported current shipping obligation | +110 across two visits | -55 for first unpaid visit; second fee not deducted again if paid by recipient | Distinct visit identity; no replay duplication. |

For supported partial delivery, credit only accepted delivered goods outstanding and use the exact reported shipping/payment facts. For example, three unpaid whole pieces at 100 each and shipping 50, with two accepted pieces, produces recipient total 250, goods entitlement 200 and fee 50; one rejected piece remains in return custody. Do not recollect goods already paid to the brand or split an aggregate deposit arbitrarily.

**Plan proposal:** a normal visit's brand-paid shipping debit is the earned commercial tariff less the recipient shipping amount actually reported for that visit, within the supported snapshot/mapping. Contract inconsistency or an amount exceeding its applicable tariff is an exception, not an automatic negative debit or refund. These calculations do not approve the excluded prior-attempt recipient-shipping-already-paid scenario. Existing prepaid-to-brand cases remain approved.

Fixed failure reasons include the approved missing-pieces and no-answer-after-arrival cases; Other requires text and applies to partial rejected portions too. The complete chosen vocabulary and wire compatibility live in `TAWSEL-CR-001`. A missing-pieces reason is evidence for review, not confirmed loss or automatic compensation.

## 9. Driver remittance and shared brand wallet

**Owner rules:** ERP-D-039/040/053/054/055/064/074/089/099/117/137/138/142/160/161/174.

### 9.1 Full remittance

Use the complete effective actual recipient payments reported for the round, not assigned shipment totals, commercial visit fees or brand debts. A round crossing midnight remains one round. Ten assigned shipments with eight actual paid outcomes means remitting those eight payments only.

The screen shows expected total, source breakdown, synchronization readiness, driver and round. Staff enter actual receipt components, each with Cash/Bank deposit/InstaPay, destination account, amount and optional reference. Components must sum exactly to expected money. One 800 cash + 200 InstaPay receipt is one complete 1,000 remittance, not installments. No proof images/provider verification are required.

Reject incomplete receipt without posting funds, eligibility or a payroll deduction. The driver personally covers any shortage outside this flow. Do not record a personal top-up module or hide a shortage using general account adjustment. Known missing source facts block only the dependent confirmation; source corrections after confirmation enter the review policy below. A zero-money round may be marked checked/settled with zero movement, without a fictitious cash receipt.

### 9.2 Wallet meaning and payouts

Show separately: total signed entitlement, pending driver-held proceeds, temporarily held items, shipping cover reserved, eligible payable amount, payouts and any debt. A single editable total is insufficient.

One shared company-level wallet carries branch-tagged movements. Eligible ordinary goods credit requires full actual remittance. Confirmed compensation is independently eligible. Zero-recipient-due work cannot wait for nonexistent remittance. Applicable debits reduce money available to pay, even when they arise at another branch.

Authorized staff can pay any positive amount up to eligible balance, using an allowed funded company account. Partial brand payout is allowed. Weekdays organize scheduling; off-day payout requires a reason. Electronic reference is optional; no images. Store paying branch/account independently of source earning branches. Normal consolidation to the main branch is a treasury process, not a payout restriction or automatic sweep.

Both wallet eligibility and funding are locked/rechecked in the posting transaction. Two branches paying the same wallet cannot both spend its last balance. A timeout returns an unknown state that is resolved by the same action identity, never a fresh payout request.

### 9.3 Shipping credit gate — approved cover basis

ERP-D-200 / ERP-R-209 approve reserving eligible credit for known brand-funded shipping before the definitive customer handover. For a no-negative-balance brand, reject new handover when signed commercial entitlement is below zero or when eligible credit after posted debits, affected holds and existing cover reservations is below the new known brand-paid portion. Existing cover is subtracted once, using the data specification's `eligible_to_pay` formula. Do not count unremitted goods proceeds as cash-backed cover. A new normal recipient-funded order does not require full tariff prepayment, but existing debt still blocks its new handover.

Consume the reservation into the actual earned brand fee when a visit occurs; release unused cover if the goods return without an earned visit or an authorized predeparture unassignment removes the exposure. Competing payout and handover actions lock the same wallet. Do not reserve an infinite estimate of possible later attempts. Fees actually earned after dispatch still post even if an unexpected refusal creates debt; this setting cannot erase facts or remotely stop Tawsel.

The cover basis is now owner-approved. Its database reservation, consumption and release mechanics remain the concrete implementation design in the data specification. Storage arrears and storage credit stay separate and do not automatically consume this wallet.

## 10. Loss, damage, compensation and replacements

**Owner rules:** ERP-D-095/098–105/110/118/119/181/188.

An incident report identifies affected shipment/product quantities, current known custody, reported condition/cause and evidence. Reporting can block unsafe reuse but does not create brand compensation or employee liability. Explicit confirmation records affected goods value and responsibility allocation. Goods 400 plus shipping 50 means compensation 400; partial damage compensates only affected goods. If unavailable, staff enter the agreed goods amount at confirmation; do not infer it from zero recipient due or require a rejected compulsory intake valuation field.

Confirmed compensation posts one positive brand-wallet credit, immediately eligible under ordinary payout/funds rules, independently of employee recovery. Company/employee shares sum to compensation. Warehouse loss is borne by the company; driver-held damage can be wholly driver-funded or split. The approved driver share becomes an ordinary linked employee deduction in an allowed payroll period, with carry rules. No separate cash repayment is inferred.

**Plan proposal:** incident confirmation includes the responsible business branch, defaulting to the last accountable custody/dispatch branch and explicitly reviewable from permitted branches. Attribute compensation cost and its matching approved employee share to that same incident branch so their net company loss is not accidentally split between unrelated branch results. Preserve the employee's payroll branch and the brand payout's paying branch separately. This allocation is a proposed reporting detail, not a prior owner choice.

Maintain simple balance/movement UI but preserve separate source types: compensation, goods proceeds, fee, advance, employee recovery and payout. A retry cannot duplicate any share. Correction retains the incident and its original postings with linked reversing/correcting entries; it does not automatically recover money already physically paid.

A replacement uses the ordinary new shipment form, a new numeric reference and a clear original-shipment link. Actual intake, pricing and availability validation still apply. Staff record the agreed payer for replacement shipping under ERP-D-203 / ERP-R-212. Do not reopen an old delivery attempt as the replacement. Dedicated found-after-compensation processing is excluded from V1.

**Owner-approved P-DOM-04, ERP-D-203 / ERP-R-212:** recipient-funded and brand-funded replacements use the normal captured tariff and payer rules. If the company agrees to fund replacement delivery, set only recipient shipping outstanding and brand shipping liability to zero, retain the standard commercial tariff, and post a linked service-charge waiver against that tariff. Net shipping revenue for that replacement visit is zero, while ordinary driver commission still uses the normal base/fixed rule. This is the owner's explicit exception to ERP-D-194's complete per-visit tariff rule. Preserve any actual goods outstanding: goods due 250 with waived shipping 50 still means recipient goods due 250, not recipient total zero. The Tawsel source snapshot must support the exact zero shipping component independently of the ERP commercial tariff snapshot; owner approval does not prove that wire mapping.

Employee-funded replacement shipping was not selected. Do not add its payer option or an employee obligation from this rule. The replacement form exposes only the approved payer choices. A company waiver may never be disguised as an ordinary paid expense because no payment occurred.

## 11. Simple HR and payroll

**Owner rules:** ERP-D-057/071/072/078/079/082–088/101/122/131/164/167/180/191.

Calendar-month payroll contains salary, visit commission, bonus, overtime, ordinary deductions, incident-linked deductions, recorded advances, prior carry and net. Salary and commission show separately before the combined total. Schedule fields are profile data; no attendance, automatic overtime, leave, tax or day-based salary engine.

- Commission accrues once per actual eligible visit for its performing employee, whether or not the brand has paid. Percentage applies only to base shipping; fixed amount applies once per visit. Internal branch transport earns no extra commission.
- Use the compensation rate effective at the work time, not event-arrival time. Preserve its formula/rate/base on the earning record.
- Staff explicitly record an advance as actual company money paid to the employee. Its payroll recovery is an allocation, not another cash movement. Example: gross salary 6,000, advance 1,000, final net payment 5,000. Total cash is 6,000; salary cost is not counted twice.
- ERP-D-202 / ERP-R-211 approve reducing employee earning cost for salary-earning deductions, while advance recovery does not reduce cost. Salary 6,000 minus a salary deduction of 200 and advance recovery of 1,000 produces salary cash payout 4,800 and employee earning cost 5,800. Incident recovery is classified separately and counted once.
- Bonus/overtime are entered monetary additions; deductions retain reason, actor and source. For first/last partial month, staff calculate a deduction themselves against configured salary. No special month-salary override or automatic proration.
- If obligations exceed earnings, net is zero and the residual obligation carries to the next month with the original identity. Example: 3,000 earnings and 3,500 obligations gives net zero and carry 500, not negative payout.
- One period net is paid in one salary action. No partial salary payout. Cash/Bank deposit/InstaPay and funding checks apply. Early money uses Advances.
- Past and paid calculations are protected. Current unpaid or future adjustments are permitted; payment of a prior frozen unpaid balance is not editing its calculation.

**Plan proposal:** freeze each past calendar month on first processing after the Cairo month boundary and freeze a current month when its one net payout is confirmed. Zero net receives an explicit zero-net closure rather than a fictitious payment. Late commission and corrected old facts create source-linked review items, then an authorized current-unpaid/future adjustment; never silently reopen the old payroll. The entry retains original work period for audit/profit attribution and separate posting period for employee settlement.

An authorized salary configuration correction for the current unpaid month replaces that month's full configured salary snapshot with an audited revision; it does not prorate days. Future changes choose the future effective month. Rate changes for commission remain work-date based. If a user starts mid-month, the ordinary full configured salary still applies and the staff-calculated deduction supplies the intended reduction.

**Implementation clarification of the approved protected-period/no-double-recovery rules:** a current editable preview is nonbinding. When a period freezes while still unpaid, reserve its calculated recovery amounts against the original obligations. Later periods exclude these reserved amounts from their allocation capacity. Actual payment settles those reservations without changing the frozen net; zero-net closure settles its allocations without a cash movement. For example, January salary 6,000 less advance recovery 1,000 freezes unpaid at net 5,000. February salary 6,000 must not deduct that same reserved 1,000 again, even if February is paid first. January can later pay its fixed 5,000 and settle its one recovery. Show outstanding debt, recovery reserved for frozen periods and genuinely unallocated carry separately; do not create a new debt or infer an advance repayment receipt.

**Plan proposal:** recover outstanding obligations in original effective-date, creation-time and ID order, with each allocation capped by its unrecovered balance. Use one category-aware carry register, not a new independent deduction copy each month. The salary-deduction/advance distinction above is owner-approved; other manual financial adjustments still require explicit typed classification.

## 12. Storage subscriptions

**Owner rules:** ERP-D-048/067/073/090/122/139/140/141/172/192/201/204; ERP-R-210/213.

One brand agreement carries a fixed fee, agreement branch and original anniversary day. A start on the 20th gives a period from the 20th through the following 19th. Persist half-open date ranges: `[start_date, next_start_date)`. January 31 renews on February's last day, then March 31; retain the original anchor, including leap years and Cairo dates.

The fee becomes due and the full fixed period fee is earned at period start. ERP-D-201 rejects daily revenue allocation: a fee of 310 for January 20 through February 19 belongs entirely to January's revenue, independently of payment date. Renewal is not receipt and continues at zero physical stock or overdue payment until explicit stop. Show arrears; no automatic storage offset against brand payout and no automatic shipping stop for storage arrears. Actual payment is recorded manually against brand, method, permitted receiving account and date. Storage's agreement branch receives the revenue attribution even if another branch/account receives cash.

Changing price affects the next period only. Stop prevents the next renewal and preserves the current paid period through its end, without automatic prorated refund. Retain all prior periods/payments. Exceptional money returned requires its own actual-money record and linked correction, not deleting a paid period.

ERP-D-204 / ERP-R-213 require both partial storage payments and advance storage payments. A partial payment of 100 against a period charge of 310 leaves 210 outstanding; revenue remains the complete 310 earned at the period start. Advance money received before a period starts is storage credit, not earned revenue and not brand-payout eligibility.

**Plan proposal for allocation mechanics:** use a dedicated storage credit subledger, separate from the brand payout wallet. On an actual storage receipt, add the credit and allocate it to existing unpaid periods in oldest due-date order, then period ID; show the allocation preview and retained remainder. Keep any surplus as unallocated advance credit. When a later period is created, earn its full fixed fee once and allocate available storage credit to it without another cash receipt or second revenue entry. Generate missed renewal periods idempotently after worker downtime.

Example: receive an advance of 500 before any service period starts. Account cash increases by 500, storage credit is 500 and earned revenue is zero. When the first period of 310 begins, recognize 310 of revenue and allocate 310 of that credit; the period is paid and 190 remains unallocated credit. Do not report another 310 cash receipt.

**Plan proposal for stop/refund mechanics:** stopping prevents future renewal but preserves existing due charges, allocations and unallocated credit. Credit is not forfeited or moved into the brand payout wallet. A refund is an explicit authorized storage/settlement action against unallocated credit, with an actual account cash outflow, funds check and linked history. Refunding credit does not automatically reverse service revenue. Refund of money already allocated to an earned period first requires the separately justified linked charge/allocation correction; it is not the ordinary stop action. These ordering/refund defaults are adopted by ERP-D-205, separately from ERP-D-204's earlier approval of partial/advance capability.

## 13. Company accounts, expenses and treasury

**Owner rules:** ERP-D-112–117/122/126–130/133–136/142/143.

Branch cash accounts and named company bank accounts identify funds. InstaPay is a method using an actual account, not a separate invented treasury balance. Account allowed-use scope is separate from transaction business branch. No Visa, POS-shift or automatic bank connector is selected.

### 13.1 Expenses

Expenses are entered only after actual payment. Capture actual date, positive amount, maintained category, business branch, method, funding account and description. A sole-branch user sees that branch; a multi-branch user chooses one assigned branch. Shared bank funding does not change expense attribution. Categories may be added through authorized reference-data management and deactivated without losing history.

Past payment dates, including a prior month, are allowed with separate immutable entry time and actor. A late-recorded expense changes the relevant historical expense/profit report; it does not reopen protected payroll. No unpaid invoice, due-date, AP or later expense-settlement module is included.

### 13.2 Treasury transfer

Creation and receipt are separately permissioned screens; both have company-wide source/destination reach. This exception does not widen other screen/report access. Record exact source/destination accounts, amount, actual send date and actor. Sending reduces source spendable funds and creates transfer-in-transit. Only explicit full actual receipt credits the destination. The amount is fixed; partial/short receipt is excluded.

Do not implement automatic source refund when a user clicks Reject. Rejection is not physical cash return. A mistaken record or actual money returned uses authorized linked correction/actual receipt evidence; the ordinary UI has send, pending and full receipt, with discrepancy review outside that happy path. No mandatory different sender/receiver people.

### 13.3 General deposits/withdrawals

The separate page requires direction, account, positive amount and actual date; reason is optional free text. No mandatory purpose taxonomy. Deposit/withdrawal affects account position and history but not operating profit. A dedicated expense, salary, payout, advance, remittance or transfer already posts its account effect; never enter it again here. Withdrawals and actual payouts cannot exceed available funds.

### 13.4 Account discrepancy

Record book balance, observed actual balance, observation time, version and reason. Show the difference pending explanation; no automatic company gain/loss or employee penalty. Resolve through a missed real movement, explicit company loss or authorized employee liability, with links and no duplicate funds effect. This is general account reconciliation and does not restore excluded partial driver remittance or short-transfer processing.

## 14. Adjustments and opening entries

**Owner rules:** ERP-D-109/118/119/121/124/125/130/132/133/174.

The separate Settlements/Adjustments page starts with a target and actual case, then shows current values, proposed linked effects and a confirmation. It is the operating recovery page, not an extra editable column in reports. Screen authority permits its operations within target scope; state locks, physical reality and Tawsel authority still apply.

| Target | Allowed correction design | Never infer |
| --- | --- | --- |
| Brand | Reverse/correct wrong typed movement; independent agreed commercial adjustment with reason/source; preserve payout links and eligibility class. | Cash received, refund completed, remittance proven or automatic profit from a positive balance. |
| Employee | Current-unpaid/future typed addition/deduction or linked correction with carried obligation allocation. | Edit a protected month, partial salary payout or cash repayment from a payroll deduction. |
| Company account | Observed difference, then linked actual missed movement or explicit approved resolution. | Automatic receipt, loss, employee blame or revenue from direction alone. |
| Product quantity | Enter observed quantity and reason; calculate difference against a validated version; retain actual stock and reservation shortage. | Silently releasing another order's reservation or creating an inbound brand delivery. |
| Parcel | Select loss, damage, missed actual receipt or duplicate/wrong entry; execute its legitimate bounded workflow. | Hard deletion, after-departure override or teleporting physical stock. |
| Source correction | Display old/effective Tawsel facts, dependent posted records and proposed authorized linked resolution. | An event correction automatically changes money, refunds or paid payroll. |

Known integration gaps hold affected payout eligibility only. An accepted correction conflicting with posted money creates a review item, preserves original entries and requires linked resolution. Replay/apply status never proves physical receipt or financial finality.

Optional dated opening entries support a company starting with existing balances/stock, but a zero-start company skips them. Identify each opening batch/target; reject accidental replay/duplicate opening. Opening money, stock, brand and employee balances are not current revenue/expense. Opening brand liability must distinguish already eligible balance from unresolved driver-held proceeds; do not default an unknown imported total to eligible cash-backed money. No Excel intake/migration engine is added.

## 15. Reports and exact measures

**Owner rules:** ERP-D-096/106–108/111/120/131/134/143/160/164/168/172/190/199.

Selected pages: REP-01, REP-05, REP-07, REP-08, combined REP-09/10, REP-12, REP-14, REP-15 and REP-18. Advance recovery/employee adjustment history stays inside HR. Daily inventory and operating profit are priorities. Other necessary working histories still exist; they do not become unselected standalone reports.

Every report declares its date basis and authorized scope. Count shipments by shipment identity, visits by evidenced visit identity, and payouts/remittances by confirmed transaction identity. Receiving the same event twice does not change any measure. Show pending facts separately; do not silently equate absence with zero.

Operating profit's accepted core is:

`earned shipping including packing - approved replacement shipping waivers + full storage period fees earned at their period starts - employee earning cost after approved salary-earning deductions but before advance recovery - paid ordinary expenses - confirmed brand compensation + approved employee compensation share, counted once`.

The original approved example remains `10,000 + 2,000 - 4,000 - 1,500 - 500 + 200 = 6,200`. ERP-D-201/202/203 now specify storage period-start recognition, earning deductions and the explicit company-funded replacement waiver. An advance or its recovery does not reduce employee earning cost; an unallocated storage advance does not create revenue.

Brand goods proceeds, brand payouts, generic funding/withdrawals, treasury transfers, opening balances, employee advances and net salary payments are not additional revenue/cost. Ordinary expenses are paid-only records; the report cannot claim unrecorded unpaid costs or complete accrual/tax accounts. Keep actual-money position and unreceived amounts visible separately.

Revenue branch is the historical customer-dispatch branch per visit, including packing uplift. Commission follows that work branch. Salary/manual employee cost follows historical employee branch. Storage follows agreement branch; expenses follow chosen expense branch. Moving an employee, changing a branch name or paying from a shared account does not relocate old profit.

**Plan proposals:** use actual visit effective date for earned shipping; incident-confirmation date for compensation; original service/work period for late earning adjustments, with entry/posting dates visible. Monthly salary cost belongs to its payroll period. Storage uses the owner-approved period-start date for its complete fee. Show report `asOf` generation time and a notice when later-entered facts changed a prior period; do not falsely promise a closed general-ledger period. Other manual adjustment and storage credit/refund mechanics retain the explicit review boundaries below.

Advanced filters are per-screen, additive and constrained by authorization: explicit period/date basis, branch, brand, service, shipment state/custody, driver, geography, reason, payment method/account or category only where applicable. Preserve selection on detail/back; Reset restores documented defaults; empty results explain filters without exposing unauthorized existence. Implement server-side query/pagination/export parity. No saved-filter feature is implied.

Selected reports support screen, Excel and well-formatted Arabic RTL print/PDF. Export uses the same predicates/formulas/snapshot as displayed results, with period, filters, generation time and readable money totals. It cannot widen permissions or silently truncate totals to one page.

## 16. Business acceptance examples

These are required future checks, not tests already run. Each important implementation result needs a manual path using its actual screens and a corresponding connected Vitest test; database claims need real PostgreSQL tests.

| ID | Scenario | Required observable result |
| --- | --- | --- |
| DOM-01 | Create one shipment through each service using goods 100/150, base 50 and uplift 5 where applicable. | Three independent numeric references; correct receipt/reservation/preparation differences; packing included once per visit and base retained separately. |
| DOM-02 | Remove applicable tariff, then confirm a form containing stocked products. | Clear missing-price error; preserved input; zero order/receipt/reservation/outbox/charge effects. |
| DOM-03 | Confirm two orders concurrently competing for the last variant unit. | One succeeds, other explains shortage; no negative available stock or split successful order. |
| DOM-04 | Confirm normal delivery of goods 250 + shipping 50, then remit 300 and pay the brand 100. | Brand total 250; eligible 0 before remittance, 250 after, 150 after payout. Company earned 50, account balance increased by 200 after payout; no second shipping deduction. |
| DOM-05 | Fully prepaid-to-brand delivery with recipient due 0 and shipping 50. | No goods credit or fake receipt; brand debit 50 and earned fee 50 after actual visit; correct no-debt handover gate. |
| DOM-06 | Company-packed refused visit with no payment, then eligible second successful visit; replay both events. | Two fee earnings of 55 each; correct driver/base-only commission per visit; replay adds nothing. Excluded earlier-paid-shipping retry is not inserted. |
| DOM-07 | Expected driver remittance 1,000; enter 800 cash + 200 InstaPay, then repeat the same request after a lost response. | One full receipt with two components, one eligibility release. Entering 999 rejects with no financial effects. |
| DOM-08 | Two branches concurrently attempt payout 200 against eligible 300; both accounts have funds. | One payout of 200 succeeds; the other sees remaining 100 and cannot pay 200. |
| DOM-09 | Send 10 stock units from A to B; receive 8 sound, 1 damaged and 1 missing. | A availability reduced at actual handover; B receives 8 available and 1 unavailable; 1 remains unresolved; no transfer fee/commission. |
| DOM-10 | Cancel a transfer before handover, then separately attempt cancellation after handover. | First releases reservation; second cannot restore stock without actual return receipt. |
| DOM-11 | Receive one returned sound stored-stock unit and one damaged unit. | Only sound inspected unit becomes reusable; offered-but-unreceived quantity remains with driver. |
| DOM-12 | Confirm a goods incident of 400 with company share 200 and employee share 200. | Brand receives one eligible credit of 400; linked employee deduction 200 in an allowed period; company net compensation cost 200, independently of recovery payment timing. |
| DOM-13 | Salary 6,000, advance 1,000, then salary payout. | Advance cash 1,000 plus net cash 5,000; one payout; one recovery; salary/commission shown separately. |
| DOM-14 | Earnings 3,000 versus obligations 3,500; next month earnings 3,000. | Month 1 has zero net and carry 500; month 2 net is 2,500 absent other changes; obligation never recovered twice. |
| DOM-15 | Storage anchor January 31, rate change before February renewal, worker replay. | February clamp then March 31; one period per boundary; old fee preserved and chosen next fee applied; no fake payment/duplicate revenue. |
| DOM-16 | Enter a previous-month paid expense using a shared bank account from assigned branch B. | Expense/profit attributed to B and prior actual date; account decreases once; current entry time retained; old payroll unchanged. |
| DOM-17 | Send a treasury transfer of 1,000, confirm destination receipt, then replay receipt. | Source decreases by 1,000; 1,000 stays in transit until actual receipt; destination increases by 1,000 once; no profit or automatic rejection refund. |
| DOM-18 | Actual stock 5 versus reserved 7, and a shipment search from another branch. | Shortage 2 visible, affected handover held, no invented stock; tracking can read the other branch's journey but cannot mutate it without scope. |
| DOM-19 | Accepted source correction arrives after payout/payroll, then recovery replay. | Original payments retained; affected review/hold only; no automatic refund/rewrite/duplicate commission. |
| DOM-20 | Run the approved profit example with advances, transfers and brand payouts also recorded. | Profit remains 6,200; cash view explains additional real movements separately; exported filtered totals match screen. |
| DOM-21 | Create storage period January 20–February 19 with fee 310; receive a partial payment of 100. | January earns the complete 310, February receives none of this period's revenue; actual receipt is 100 and period outstanding is 210. |
| DOM-22 | Receive storage advance 500 before the first period starts, then generate a period of 310. | Before start: cash +500, credit 500, revenue 0. At start: revenue +310 once, credit allocation 310, unallocated credit 190, no new cash receipt. |
| DOM-23 | Salary 6,000, salary-earning deduction 200 and advance recovery 1,000. | Net salary payout 4,800; employee earning cost 5,800; advance issuance/recovery is not another cost reduction. |
| DOM-24 | Company-funded replacement has standard shipping 50 and actual goods due 250. | Recipient shipping due 0, brand shipping liability 0, goods due remains 250; tariff 50 and waiver 50 yield net shipping revenue 0; ordinary driver commission remains. No employee-funded option. |

## 17. Bounded policy decisions and remaining design proposals

The owner has answered the five financial policy questions identified during drafting. Their outcomes below supersede the corresponding initial proposals. Implementation mechanics and contract dependencies remain explicit; they do not reopen the approved choices or require rediscovery of the company.

| Policy ID | Current status / authority | Selected rule or remaining bounded proposal |
| --- | --- | --- |
| P-DOM-01 | Approved: ERP-D-200 / ERP-R-209. | Section 9.3 reserves cash-backed eligible wallet credit for known brand-paid shipping, excluding pending goods, with atomic payout/handover competition and no duplicate cover subtraction. |
| P-DOM-02 | Owner rejected daily allocation; selected ERP-D-201 / ERP-R-210. | Earn the full fixed fee in the calendar month containing its service period start, independently of cash receipt. January 20–February 19 fee 310 is entirely January revenue. No daily report allocation. |
| P-DOM-03 | Salary deduction classification approved: ERP-D-202 / ERP-R-211. | Salary-earning deductions reduce employee cost; advances/recovery do not; incident recovery counts once. Salary 6,000 less deduction 200 and advance 1,000 gives payout 4,800, cost 5,800. Other manual balance adjustments still use the proposed explicit typed classification; unclassified entries remain visibly outside profit pending classification. |
| P-DOM-04 | Company-funded exception approved: ERP-D-203 / ERP-R-212, explicitly qualifying ERP-D-194. | Retain standard tariff and linked shipping waiver; recipient/brand shipping due 0, net shipping revenue 0, normal driver commission. Preserve any goods due. Employee-funded replacement was not selected. Verify the zero shipping component in Tawsel independently of commercial pricing. |
| P-DOM-05 | Partial and advance storage payment required: ERP-D-204 / ERP-R-213. | Dedicated storage credit separate from the payout wallet; partial payments leave period balances, advances remain unearned until a service period starts. Proposed oldest-due allocation, future-period credit application and explicit actual-cash refund mechanics appear in section 12. These mechanics are adopted under ERP-D-205. Disputed runtime/external facts still need evidence. |
| P-DOM-06 | Qualified cross-branch redispatch after return. | Preserve ERP transfer and earlier requirement history; resolve `TAWSEL-CHECK-003` against the adopted contract before any dependent phase promises successful destination dispatch. This can change source revision/dispatch mapping or require a documented Tawsel extension. |
| P-DOM-07 | Which branch bears incident compensation and the matched employee share in branch-profit reports? | Record the confirmed responsible incident branch and attribute both entries there, independently of payroll and paying-account branch. Default to the last accountable custody/dispatch branch and retain any explicit reasoned correction. This keeps incident net loss coherent across branch reports. |

The data specification supplies deterministic technical proposals for IDs, reservation shortage handling, retries, calendar locks and correction mechanics. They become part of the accepted implementation contract only through plan review; no implementation is asserted here.
