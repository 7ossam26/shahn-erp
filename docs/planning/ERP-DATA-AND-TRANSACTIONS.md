# ERP Data, State and Transaction Specification

Current authority, session025 (2026-10-03): ERP-D-205 / ERP-R-214 approve PLAN-001 and authorize phase authoring. Detailed plan mechanics below are adopted; original proposal/review wording is retained as drafting provenance, not a renewed approval gate. External contract gaps, unverified runtime targets and the unnamed palette remain explicitly limited. No production implementation is authorized by this authoring turn.

Status: PLAN-001 adopted for phase authoring in session025, 2026-10-03. This is a proposed implementation design for the approved domain rules, not generated SQL, an implemented database or evidence that ACID/integration checks passed.

Owner policy updates ERP-D-200 through ERP-D-204 / ERP-R-209 through ERP-R-213 are incorporated below. Storage revenue is recognized in full at period start; partial/advance storage payments are required. Earlier daily allocation and full-period-only payment proposals are superseded.

Read [ERP-DOMAIN-SPEC.md](ERP-DOMAIN-SPEC.md) first, then [master-plan.md](../../master-plan.md) and [ERP-TAWSEL-INTEGRATION-PLAN.md](../../ERP-TAWSEL-INTEGRATION-PLAN.md). Exact canonical schemas and Tawsel authority belong to the integration plan. All type/table names here are local ERP proposals.

## 1. Authority, persistence conventions and dates

Owner-approved requirements include local ACID (ERP-D-145 / ERP-R-154), retained history (ERP-D-168), online-only ERP (ERP-D-144), EGP (ERP-D-146), calendar-month payroll/Cairo days (ERP-D-164), and source identity/deduplication rather than shared databases (ERP-D-002/028). The following technical mechanics are submitted with the plan:

- PostgreSQL with parameterized SQL through `pg`, versioned additive SQL migrations and explicit application transactions, consistent with the root architecture proposal. No ORM or raw client-supplied SQL.
- One company's dedicated deployment/database initially; keep `company_id` on business rows and composite same-company relationships. This protects scope and future portability without claiming a SaaS control plane.
- Internal immutable IDs are UUIDs; display shipment references are unique digits-only strings issued from a database-backed sequence. Sequence gaps after rollback are acceptable; never reuse a reference or implement `MAX(id)+1`. Canonical Tawsel IDs remain in dedicated mapping columns, never reformatted to satisfy display preferences.
- Monetary values are signed integer piastres in PostgreSQL `bigint`; positive-input business operations validate amounts before a signed journal effect is created. Never use binary floating-point arithmetic. The concrete native API representation is `Money { currency: 'EGP', amountMinor: <base-10 integer string> }`. Closed JSON Schema requires `currency` and `amountMinor`. For signed journal/output values, use the pattern `^(0|-?[1-9][0-9]*)$`; for nonnegative values, `^(0|[1-9][0-9]*)$`; for strictly positive command inputs, `^[1-9][0-9]*$`. Reject leading zeroes, negative zero, a plus sign, decimals, whitespace and exponent notation. Validate the PostgreSQL signed `bigint` range after parsing, and validate every intermediate result for overflow before persistence. Canonical Tawsel money retains its documented wire shape; conversion at that adapter checks its exact integer bounds and never coerces an unsafe JavaScript number.
- Convert displayed EGP input by decimal-string parsing: normalize supported Arabic/Latin digits, validate at most two fractional digits, multiply the integer part by 100 using integer arithmetic and pad the fractional part to two digits. For example, EGP `50.5` becomes `amountMinor: "5050"`. Never run `parseFloat(value) * 100`. Display is the exact inverse with a locale formatter that cannot lose integer precision.
- Native JSON uses camelCase, including the mutation envelope `commandId`, `schemaVersion` and `expectedVersion`; SQL names use snake_case with explicit repository mapping. `expectedVersion` is required on commands deciding from a previously displayed mutable aggregate and omitted only for new aggregate creation or a contract-defined nonversioned command. Native `commandId` and canonical Tawsel `actionId` are separate identities with a durable explicit mapping.
- Piece/variant quantities are nonnegative whole JSON safe integers, with minimum/maximum constraints in each schema and checked arithmetic (`0` through `9007199254740991` for a nonnegative safe integer; positive command quantities start at `1`). Persistence uses integer types large enough for the declared bound, never an unchecked narrowing cast. Decimal measures/weight are not inferred from the timeline image.
- Percent commission is proposed as integer basis points from 0 to 10,000; per-visit amount is rounded half up to the nearest piastre before aggregation. Fixed commission is integer piastres. Do not round an aggregate month's floating-point percentage or use today's rate for old work.
- All events/records retain `recorded_at` (server UTC), `effective_at` or a local business date where meaningful, actual actor, source identity and revision. Do not substitute webhook receipt time for the visit's work time. `Africa/Cairo` controls display and calendar grouping; storage persists local dates and its original anniversary day.
- Use half-open query boundaries `[from, to)` with timezone-aware UTC conversion for timestamp sources. A calendar day may not be exactly 24 UTC hours. A round crossing midnight keeps one round identity.
- Every mutable aggregate has `version`; commands include the expected version where stale decisions matter. Immutable source facts/journal entries are appended; corrections link originals rather than rewriting their meaning.
- No automatic business/audit deletion. Referenced master data is deactivated. Backup retention is a separate operational setting.

## 2. Aggregate and relationship inventory

These are minimum concepts, not permission to leave columns unspecified during implementation. A phase adding a concept must include its actual migration, constraints, server command/query validation, UI fields and verification. Proposed local names may be refined consistently in the approved schema document without changing business semantics.

| Aggregate / child records | Required data and relationships | Invariants |
| --- | --- | --- |
| `company`, `branch` | Company identity; numeric/display codes; names; active flags; Cairo/EGP defaults. | Branch belongs to one company; deactivation preserves references. |
| `user`, `role`, `user_module_exception`, `user_branch` | One role; inherit/allow/deny per module; permitted branches; actual identity/session links. | Effective capability is the same across assigned branches; no authority from job-title strings. Support identity remains genuine and auditable. |
| `employee`, `employee_branch_history`, `compensation_policy` | Independent employee identity; schedule fields; salary switch/amount; commission switch/type/rate; effective dates and branch. | Past/paid payroll snapshots remain immutable; effective intervals for one policy axis do not overlap. |
| `operational_driver`, `employee_driver_link` | ERP driver reference, Tawsel mapping, active status, dated employee association. | At a work time, exactly one applicable employee attribution or an explicit unresolved association; no fuzzy name matching. HR staff need no driver link. |
| `brand`, `brand_policy_revision` | Shared commercial identity; enabled/default services; manually chosen tier; partial policy; packing uplift; payout weekdays; negative-balance option. | One company brand/wallet, not one per branch; default is in enabled set; valid dated snapshots. |
| `governorate`, `area`, `tariff_tier`, `tariff_rate_revision` | Company reference data; area's governorate; tier ranges/labels; governorate base and optional area override. | One applicable revision per key/effective interval; no automatic tier selection from counts; retained old values. |
| `product`, `product_variant` | Brand, stable product/variant IDs, display names/options, active state. | Same brand/company through every stock/order relation. No inventory identity derived from free text. |
| `shipment`, `shipment_revision`, `shipment_line` | Numeric reference; optional brand reference; brand/service; physical/intake branch; recipient/contact/address/location link; inspection/comment; policy/tariff snapshot; whole quantities and explicit outstanding money. | One recipient/address shipment; no simultaneous commercial split. Brand-reference duplicate is a warning, not a unique constraint. Lines/revisions used by departed work remain immutable. |
| `shipment_price_snapshot` | Base shipping, uplift, complete tariff, recipient-shipping outstanding, declared goods outstanding, tariff/policy revision, commercial payer evidence and any approved replacement-shipping waiver link. | `complete_tariff = base + uplift`; zero is explicit; waived shipping never zeroes actual goods outstanding. Recipient due and compensation value are not synonyms. |
| `shipment_preparation`, `shipment_dispatch_intent` | Queue/complete times; selected driver/source branch; reservations; expected revisions; stable integration action link and state. | Preparation is not custody handover; successful external acceptance cannot be fabricated. |
| `custody_movement`, `parcel_current_custody` | Shipment/line/quantity references; from/to physical holder; condition; actual and recorded time; operation/receipt/disposition source. | Exactly one current holder per complete parcel or outstanding quantity allocation; history never disappears. |
| `stock_position`, `stock_movement`, `stock_reservation` | Branch+brand+variant; sound/unavailable on-hand; order/transfer reservations; quantity movement source; version. | No duplicate movement effect; quantities conserved; shortages remain representable after actual correction. |
| `goods_transfer`, `goods_transfer_line`, `goods_transfer_receipt_line` | One source/destination/carrier/trip; whole shipments or unreserved variant quantities; handover time; actual sound/damaged/missing quantities; receipt/correction links. | No source=destination; one active transfer reservation per whole shipment; cumulative disposition never exceeds handed-over quantity. |
| `execution_projection`, `visit_fact`, `outcome_fact`, `reported_money_fact` | Exact Tawsel source IDs/revisions; accepted effective facts; received/applied timestamps; work branch/driver/time; arrival evidence; quantity/payment breakdown. | Distinct received/applied/effective states. Raw source facts retained; monotonic application rules follow the actual stream contract, not guessed global order. |
| `return_receipt`, `return_receipt_line`, `return_to_brand` | Source request/cycle; actual accepted subset and condition; ERP actor; accepted integration action link; later actual brand handover. | Offered return is not receipt; receipt cannot exceed supported unresolved quantities; source-branch authority respected. |
| `incident`, `incident_affected_item`, `incident_confirmation` | Reported facts, affected subset, agreed goods amount, company/employee shares, responsible business branch, confirmed actor/time, optional replacement relation. | One effective confirmed liability version; shares sum to compensation; initial report posts no money; proposed branch attribution follows P-DOM-07. |
| `brand_wallet`, `brand_movement`, `brand_credit_lot`, `brand_lot_allocation`, `eligibility_hold`, `shipping_cover_reservation` | Shared signed entitlement; typed immutable source effects; credit readiness; allocations to payouts/debits; affected-source holds; dispatch cover. | Allocations never exceed lots; positive unremitted goods are ineligible; payout/cover share one locking boundary. |
| `remittance`, `remittance_source`, `payment_component` | Driver/round; source version set/digest; complete expected amount; actual receiving branch/account/method/amount/reference; confirmation. | Exact sum and unique source inclusion; no partial installments/shortage acceptance. |
| `brand_payout`, `payout_allocation` | Brand, amount, actual payment date, paying branch/account/method/reference; off-day reason; immutable lot allocations. | Amount positive and no greater than locked eligible/funded amounts; partial brand payout permitted. |
| `payroll_period`, `employee_earning`, `employee_obligation`, `recovery_allocation`, `employee_advance`, `salary_payout` | Calendar month; frozen earning snapshot; work-source commission; additions/deductions/carry; actual advance issue; one net payout. | One effective payout per employee/period; recovery capped by original obligation; no past calculation rewrite. |
| `storage_agreement`, `storage_rate_revision`, `storage_period` | Brand/agreement branch; original anchor; fixed price; exact period range; next-stop status; full period-start earning fact. | One agreed subscription per brand; unique period start; no overlapping generated periods; renewal earns the full fee once but never creates receipt. |
| `storage_credit_account`, `storage_credit_movement`, `storage_payment_allocation`, `storage_credit_refund` | One `(company, brand)` storage credit subledger separate from brand payout; agreement/period references, actual receipts, immutable allocations, unallocated remainder, explicit refunds/corrections and account links. | Partial payments and advances allowed; allocations/refunds never exceed available credit; one actual receipt is not repeated at renewal. Unallocated advance credit is not revenue or payout eligibility and survives an agreement stop. |
| `money_account`, `account_allowed_branch`, `account_movement`, `account_balance` | Branch cash or company bank; authorized usage; typed signed immutable actual-money effects; derived/checked balance. | Funds cannot be spent twice; method does not create its own account; business branch stored independently. |
| `expense_category`, `expense` | Maintained category; actual paid date, amount, branch, account, method, description, actor. | No unpaid due state; permitted backdate is not payroll editing; correction links original payment. |
| `treasury_transfer`, `treasury_transfer_receipt` | Source/destination accounts/branches; fixed amount; send/receipt actual dates; transit position. | Full exact receipt only; source debit once, destination credit once; rejection cannot refund automatically. |
| `generic_money_movement` | Deposit/withdrawal, account, amount, actual date, optional reason. | No operating profit classification from direction; cannot duplicate dedicated source posting. |
| `adjustment_case`, `adjustment_resolution`, `opening_batch` | Target/source, observed values/version, reason/evidence, proposed typed effects, accepted actor and links. | No arbitrary ledger/custody overwrite; posted history preserved; opening entries do not create current earnings. |
| `command_result`, `outbox`, `inbox`, `projection_checkpoint`, `audit_event` | Stable command/event IDs, payload digest, status, attempts, dependencies, recorded result and actor. | Business effects/audit/outbox commit locally together where relevant; external communication is outside that transaction. |

Minimum schema protections: composite foreign keys ensure company/brand/branch ownership; unique indexes implement stable identity and one-source posting; `CHECK` constraints validate positive input amounts, nonnegative quantities, status-compatible required values and source/destination difference. Application authorization remains necessary; a foreign key alone is not permission.

## 3. State is several independent dimensions

Do not implement one mutable `status` field that drives all money and stock. The following dimensions may be presented in a concise derived UI label, with their individual histories retained.

| Dimension | Proposed states / transitions | Forbidden shortcut |
| --- | --- | --- |
| Commercial order | `confirmed → cancelled_before_handover` or active/completed with linked incidents/returns. | Cancelled does not mean goods physically returned or money refunded. |
| Preparation | `not_required`, `awaiting_preparation → complete`; correction may require preparation again. | Complete does not mean driver received it. |
| Integration command | `queued → sending → accepted`; `unknown_response`, `retryable`, `conflict`, `rejected`, `superseded_after_resolution`. | Timeout does not mean rejected or safe to create another action ID. |
| Parcel custody | Branch / customer-delivery driver / transfer carrier / recipient / brand / documented lost/disposed, with unresolved quantities explicit. | Outcome or projected planned route does not teleport custody. |
| Transfer | `reserved → in_transit → received` or `received_with_discrepancy`; before handover `cancelled`; after handover actual source receipt can close as `returned_to_source`. | Cancellation after handover cannot increment source stock. |
| Return | Offered / physical receipt pending canonical acceptance / accepted actual subset / condition checked / eligible restock or returned-to-brand/disposed. | Offer alone never adds on-hand or clears all pending returns. |
| Incident | `reported → confirmed` or `dismissed_with_reason`; later linked amendment. | Report cannot auto-debit driver or credit brand. |
| Brand credit | Pending remittance / eligible / held by known dependency / allocated to payout; source-linked correction. | A delivered shipment or received event cannot make its goods payout eligible alone. |
| Remittance | `awaiting_full_receipt → confirmed`; exceptional posted-source mismatch creates linked review. | No `partially_remitted` successful business state. |
| Payroll | Current editable unpaid / calculation frozen unpaid / paid / zero-net closed, with later linked adjustments. | Past calculation cannot reopen merely because payout is still unpaid. |
| Storage period and credit | Due/unpaid, partially paid, paid via allocations, overdue; agreement active or stop-after-current-period; unallocated credit remains separate. | Full period fee is earned at period start, independently of partial/advance receipt. Stop does not erase credit or refund it automatically. |
| Treasury transfer | Sent/in transit → full received; exceptional correction review retains actual custody. | No partial success or rejection=source refund. |

## 4. Inventory conservation and reservation mechanics

### 4.1 Quantity equations

For each `(company, branch, brand, variant)`:

- `physical_on_hand = sound_on_hand + unavailable_on_hand`.
- `reserved = active_order_reservations + active_loose_transfer_reservations`.
- `available = max(sound_on_hand - reserved, 0)`.
- `reservation_shortage = max(reserved - sound_on_hand, 0)`.

Reserved is a subset claim on sound stock, not another quantity added to on-hand. If an actual correction reduces stock below reservations, `reserved` may temporarily exceed sound on-hand; keep that truthful state and hold affected work. Do not enforce an impossible database constraint that forces the correction to lie.

Stored-stock components packed into a shipment remain reserved sound physical stock until handover. The parcel view references the same component allocations; company totals must not add those components a second time. On whole prepared-shipment transfer, move the existing component custody/branch allocation, retaining its order claim at the destination. An externally supplied ready/company-packed parcel has shipment-line custody but does not become reusable product inventory.

Actual source handover decrements source physical stock, closes its reservation and creates equal carrier custody. Actual destination receipt removes only received quantities from carrier custody and increments destination sound/unavailable by condition. Missing remains unresolved carrier/incident quantity until legitimate disposition, not automatically lost or back at the source. A physical shipment return follows equivalent quantity conservation with its source receipt identity.

### 4.2 Concurrency and shortages

Reserve and mutate stock rows in sorted `(branch_id, brand_id, variant_id)` order using `FOR UPDATE`, then recheck available quantity and aggregate versions. A multi-line order/transfer is all-or-nothing. Any missing tariff, stale revision, unauthorized row or stock shortage rolls back every reservation and side effect.

**Plan proposal:** after actual sound stock decreases below reserved quantity, hold all unhanded reservations involving that affected variant until the shortage is resolved or staff explicitly revise/cancel specific work. Do not arbitrarily assign the loss to the newest order or silently release a competing reservation. This is a targeted safety hold, not a company-wide count freeze. Replenishment or explicit correction recalculates the hold atomically; unrelated variants continue.

An actual-quantity adjustment reads a stock version, shows recorded/observed/difference, then requires that expected version on commit. If a legitimate movement occurred meanwhile, return a conflict showing the new position and require a new observed confirmation. Do not apply an old observed total over a newer receipt/dispatch. The user conducts physical counting outside the ERP; this introduces no count-session engine.

For condition corrections, preserve quantity: sound→unavailable or unavailable→sound requires an actual inspection decision and reason. Increasing total stock requires an actual missed receipt/observed correction, never just changing a condition enum.

## 5. Money and eligibility model

### 5.1 Independent journals

Use typed append-only source movements with a `posting_batch_id`. Related journals commit together but mean different things:

1. **Commercial brand journal:** goods payable to brand, commercial brand-paid fees, compensation, approved adjustments and payouts.
2. **Company actual-money journal:** actual receipts/payments/transfers and general funding, per holding account.
3. **Employee earning/obligation journal:** salary, commission, additions, deductions and advance-recovery allocations.
4. **Operating-result facts:** approved earning/cost source classes and their period/branch attribution.
5. **Storage credit subledger:** actual storage receipts, period allocations, unallocated advance credit and explicit refunds/corrections, entirely separate from the brand payout wallet.

This is an internal typed posting system, not a general-ledger/chart-of-accounts/tax module. Do not sum all positive account movements as income, or all negative wallet movements as expense. A single source can have related effects in several journals, each identified and deduplicated.

### 5.2 Wallet formulas and allocations

Let `E` be remaining eligible positive brand credit, `P` pending positive credit, `D` unallocated posted brand debits, `H` held eligible credit and `C` active required shipping-cover reservations. The proposed spendable view is:

`signed_entitlement = remaining_credits(E + P) - unallocated_debits(D)`

`eligible_to_pay = max(0, E - D - H - C)`

Already paid/offset credit is removed from remaining lots by immutable allocations; do not subtract payouts again in the formula if they already consumed those lots. Alternatively deriving totals directly from all signed movements is acceptable only if it is provably equal to this lot model. Store/check the shared wallet projection under a wallet row lock.

For clarity, a negative fee of 50 against only pending goods credit of 250 gives signed entitlement 200 but eligible amount 0. After full remittance, the eligible amount is 200. For ordinary goods 250 plus recipient shipping 50, the brand has credit 250 and no fee debit; after remittance, its eligible amount is 250. For a prepaid-to-brand visit, there is no goods credit, and a brand fee of 50 can create debt of 50.

**Plan proposal:** consume debit offsets and payout allocations oldest eligible effective date, then movement ID. Preserve explicit source links and branch attribution. Pending goods cannot finance a payout. A source-specific hold excludes its affected positive amount; do not freeze unrelated brands or erase the debit. If the correction affects an already-paid amount, a review records the exposure rather than pretending the historical payment never occurred.

Shipping-cover reservation uses the owner-approved ERP-D-200 / ERP-R-209 basis in domain section 9.3. Pending handover, payout and fee application all lock the same wallet; cover is an encumbrance, not earned revenue or a brand fee. For allow-negative brands the commercial gate is bypassed, but payout may still never exceed eligible positive balance/account funds. Storage credit never supplies this wallet's eligible credit automatically.

### 5.3 Expected remittance

Build an immutable confirmation snapshot of the round's effective reported positive recipient payments and their source revisions, excluding already confirmed remittance coverage. Never use all assigned-order totals or company fee accrual. The UI version/digest must match again under the round-remittance lock immediately before confirmation. Known source gaps prevent confirmation until resolved; a merely quiet queue is not proof no future correction can arrive.

On full actual confirmation, atomically create remittance, source coverage and method/account components; post account credits; release the corresponding ordinary goods credit from pending to eligible; append audit. Components must equal the snapshot total. A unique relation prevents the same reported payment being covered twice. Corrections to a paid source create review, not automatic second receipt or negative remittance.

### 5.4 Account funds

Each money account has a lockable balance projection verified against immutable movements. Every outward action rechecks available funds under the same lock. A transaction involving several accounts locks them by immutable ID. Transfers reduce source available funds at actual send and hold the exact amount in transit until actual full destination receipt; do not count transit as destination spendable funds.

**Plan proposal:** unresolved negative actual-balance observations create a funds hold equal to the unexplained shortage; positive observations do not create spendable funds until a legitimate movement resolves them. Display book, observed/adjusted actual, hold and available separately. A later genuine movement after the observation changes the rolling comparison, retaining the original observation; a stale observed total must not overwrite it. Resolution replaces the hold with its typed posting, not both deductions.

Backdated actual expenses post one current database movement with their past effective date, preserving current entry time. Historical balance reports are recalculated from effective dates; current spendable funds still account for the movement now. No default account overdraft is added. If recording a genuine past cash movement conflicts with current funds/history, route to discrepancy resolution rather than allowing an unreviewed negative-balance bypass.

## 6. Payroll and storage details

### 6.1 Payroll calculation

For employee/period, preserve category totals rather than just net:

`gross_earning = salary + commission + bonus + overtime + approved_positive_earning_adjustments`

`obligations = new_period_advances_due + new_period_ordinary_deductions + new_period_incident_deductions + prior_period_carried_unrecovered_obligations`

`recovery_this_period = min(gross_earning, obligations)`

`net_payable = gross_earning - recovery_this_period`

`carry_remaining = obligations - recovery_this_period`.

The four obligation sets are disjoint: an advance or deduction carried from a prior period appears only in the carry set, never again as a new period obligation. Every recovery allocation points to the original obligation and never exceeds its outstanding amount. Carry is a derived remainder, not another duplicate deduction. Advances cause actual cash outflow on issue; their recovery causes no cash receipt. Net salary payout causes one actual cash outflow.

**Implementation clarification:** distinguish nonbinding current previews, committed recovery reservations for frozen unpaid periods, and settled recovery allocations. Under the employee-period/original-obligation locks, freezing an unpaid period reserves its exact calculated recoveries and snapshots its net. Enforce `settled_recovery + active_frozen_reservations <= original_obligation_amount`; new-period allocation capacity excludes both amounts. Payment converts that period's reservation to settled recovery atomically with its one net cash payout. Zero-net closure settles its allocations without cash. No new debt, repayment receipt or profit fact is created by the reservation/conversion. A protected reservation changes only through the linked adjustment/review policy.

Required concrete check: freeze January salary 6,000 with advance 1,000 unpaid at net 5,000. Process, freeze and pay February salary 6,000 before January is paid. February must not recover January's reserved 1,000 again; January's eventual payment remains 5,000 and settles its original recovery exactly once. Race these operations using independent connections. Preserve separate `outstanding_amount`, `reserved_for_frozen_periods` and `available_for_new_allocation` views so unpaid old salary cannot silently alter later carry or force a rewrite of its own frozen calculation.

ERP-D-202 / ERP-R-211 approve the distinct earning-cost calculation: subtract approved salary-earning deductions from salary/commission/additions, but never subtract advance issuance or recovery as a cost reduction. Salary 6,000, earning deduction 200 and advance recovery 1,000 produces net salary cash 4,800 and employee earning cost 5,800. Incident recovery remains its own profit classification counted once; do not also reduce salary cost by it. A carried obligation remains linked to its original classified source and cannot create the same cost reduction again when carried or recovered.

The full expected net is recalculated/validated under `(company, employee, payroll_month)` lock before payout, then its calculation and source version set are frozen in the same transaction. Payout amount cannot be user-reduced into an installment. A zero-net closure records no payment component. A prior unpaid frozen month may be paid at its frozen amount with a current actual payment date. New transactions cannot change its calculation.

Current unpaid compensation edits preserve a revision and recalculate only the permitted current period. Future policies apply from their effective boundary. Late old-work commission uses the historical rate, but its employee settlement effect becomes an authorized current/future linked adjustment; original work date stays available for profit/history. Paid/past periods never reopen. Incident share is recognized once for profit and then recovered through this obligation model without another profit gain on each recovery.

### 6.2 Storage generation, full period-start earning and credit

Generate period boundaries from `(original_start_date, original_anniversary_day, period_index)`, never repeatedly add one month to a clamped date. For anchor 31: January 31 → February 28/29 → March 31. Persist local start/end dates and snapshotted fee/branch/rate. Unique `(company, agreement, period_start)` makes worker retry harmless.

Stop means do not generate a new period starting at or after the current protected period's exclusive end. Retain already due periods, payment allocations and unallocated credit; never delete arrears or forfeit credit. A price/branch-attribution change is proposed to take effect on the next period, preserving earlier rows. Renewal can catch up after downtime in one period at a time, atomically with its charge, full earned-fee fact, credit allocation where available and audit, without creating a money receipt.

ERP-D-201 / ERP-R-210 explicitly select full recognition at period start and reject daily allocation. Each unique `storage_period` posts exactly its complete fixed fee to the agreement branch's operating revenue with `effective_date = period_start_date`. A January 20–February 19 period with fee 310 contributes all 310 to January and none to February, independently of actual receipt timing. Do not generate daily revenue rows or a day-based apportionment formula.

ERP-D-204 / ERP-R-213 require partial and advance storage payments. The following precise allocation/refund mechanics are plan proposals implementing those approved capabilities:

- Lock the brand's dedicated storage credit account. A confirmed actual payment posts company account cash once and an equal positive storage credit movement. It does not itself post revenue or change the brand payout wallet.
- Allocate that credit to existing unpaid periods in ascending due date, then period ID, capped by each period's outstanding amount. Persist each source-receipt/period allocation and its amount. Partial coverage produces `partially_paid`; an amount above all existing dues remains unallocated advance credit. Show the allocation preview and resulting credit to staff.
- On period creation, earn the complete fixed fee at its start once. Under the same storage-account lock, allocate available unallocated credit to the period using the same oldest-due rule. Allocation creates neither another cash receipt nor another revenue event.
- Compute `period_outstanding = period_fee + linked_charge_adjustments - net_allocated_payments`. Compute `unallocated_storage_credit = actual_storage_receipts + linked_credit_corrections - net_period_allocations - actual_credit_refunds`. Allocations and refunds cannot make unallocated credit negative. Any approved charge correction that changes an allocation records a linked deallocation/reallocation; do not edit away the receipt.
- A payment of 100 against fee 310 leaves outstanding 210; the complete 310 remains earned at period start. An advance of 500 before any period starts gives cash +500, credit 500 and revenue 0. At the first period start for fee 310, revenue becomes 310, allocate credit 310 and retain 190 unallocated; cash remains unchanged at that step.
- A stop preserves unallocated credit. Proposed refund action requires explicit actual cash-out confirmation, authorized account/funds, reason and source-credit allocation. It atomically reduces unallocated credit and company account funds, retains linked history and creates no automatic revenue reversal. Refund only unallocated credit in this ordinary action. Previously allocated money requires the justified linked charge/allocation correction first; stopping alone is not that correction.
- Payment, allocation, period creation and refund each have stable command/source identity. Concurrent renewal, payment and refund serialize on the storage credit account, so the same credit cannot pay a period and be refunded. Retrying a receipt never duplicates money; retrying renewal never duplicates the charge or earning.

These ordering and refund defaults remain master-plan proposals. The approved facts are partial/advance support and full period-start earning; their acceptance must not be misreported as approval of every proposed allocation UI or exceptional refund action.

## 7. Required transaction boundaries

Every row below also requires company/module/branch/account authorization, current business-state validation and stable command identity. The table states local atomic effects; no physical handover, human money movement or external Tawsel call becomes part of a PostgreSQL transaction.

| Command family | Lock/read consistency boundary | Commit together | Rejection / recovery |
| --- | --- | --- | --- |
| Confirm order | Brand/policy/tariff revision, sorted stock positions, numeric reference generation, idempotency row. | Shipment, lines and price snapshot; real service-specific receipt or stock reservations; preparation queue; audit; source outbox if needed. | Missing price, stock shortage, stale version or scope error rolls back all effects. The same command ID returns the original result. |
| Correct pre-handover order | Shipment/version, affected stock positions, price/source revisions and integration lifecycle. | Immutable correction revision, released/replaced reservations, explicit custody correction if actual, audited price delta, supported outbox command. | Departed/handed-over/protected revision rejects; no partial stock release. |
| Preparation complete | Shipment/preparation version and active reservations/shortage hold. | Completion fact and audit. | No implicit handover or money. |
| Customer dispatch intent | Shipment/custody/reservations, wallet cover, driver/source revisions. | Local durable intent+cover+audit+outbox. | Pending until canonical acceptance; do not hold DB transaction open on HTTP. Integration plan owns reconciliation of unknown outcomes and acceptance. |
| Apply accepted dispatch fact | Unique source fact, shipment/custody/version, relevant stock and cover. | Apply accepted projection, actual accepted custody/reservation transition, operation result, audit. | Duplicate has no extra movement; incompatible actual facts hold/review rather than invent rollback. |
| Cancel before handover | Shipment/preparation/reservations/custody/source lifecycle. | Reasoned commercial cancellation, eligible releases and physical unavailable material hold if packed; audit/outbox as supported. | Driver receipt/start race rejects stale cancellation. Retain actual goods. |
| Reserve goods transfer | Manifest, selected parcel versions and sorted source product positions. | Manifest/lines, content reservations, actor/version audit. | Any ineligible content rejects whole selection. |
| Handover goods transfer | Manifest/carrier-active state, content custody/reservations and positions. | Source decrement, carrier custody, reservation closure, handover fact and audit. | Retry unique source; no destination availability yet. |
| Receive goods transfer | Manifest/line remaining quantities, destination scope, destination positions. | Actual sound/damaged receipt, carrier remainder, destination inventory/allocations, discrepancy and audit. | Receipt above the remaining quantity, wrong branch, stale version or absent handover rejects; missing quantities remain unresolved. |
| Actual return receipt / disposition | Shipment/cycle/return request and quantity versions, custody and stock. | ERP staff assertion/condition record and supported source action intent; accepted projection applies verified quantities once. | Pending canonical acceptance cannot be claimed as complete supported lifecycle. Details follow integration plan. |
| Apply effective visit/outcome | Unique fact/revision, shipment/visit projection, wallet, employee earning/source identity. | Effective projection; uniquely sourced fee, pending goods entitlement, commission and audit; or review of conflicting posted money with a scoped hold. | Never apply newer facts by receive-time order alone. A correction cannot rewrite protected payments. |
| Confirm full remittance | Driver/round coverage, source revision digest, relevant wallets and destination accounts. | Full receipt/components, account credits, source coverage, goods eligibility release, audit and command result. | Component mismatch or changed source digest rejects atomically; replay of the same command ID returns its result. |
| Brand payout | Shared wallet, eligibility/holds/cover, funding account and source allocations. | Payout, lot allocations, account debit, reason/reference/audit. | Insufficient eligibility/funds, missing off-day reason or stale version prevents all effects. A partial amount is otherwise allowed. |
| Confirm incident | Incident/version, affected custody, wallet and employee obligation period/source. | Confirmed amount/shares, eligible brand credit, employee obligation, profit facts, legitimate disposition intents and audit. | Invalid shares or duplicate confirmation rejects. Protected payroll requires an allowed current/future period; no silent partial credit. |
| Issue employee advance | Employee, current or chosen allowed recovery period, and account. | Actual account debit, advance obligation and audit. | Funds/state failure leaves no obligation or payout. |
| Payroll payout/zero close | Employee period snapshot/obligations and account when the net is positive. | Recovery allocations, frozen calculation, carry references, one actual net payment or zero-net closure, audit. | Partial or stale payment rejects; duplicate intent returns the original result; lost response uses the same command ID. |
| Renew storage | Agreement/version/period key, storage credit account, oldest due periods. | Period, full period-start earned fee, available-credit allocation, retained remainder and audit. | Duplicate renewal returns the existing period; no actual cash receipt. |
| Record partial/advance storage payment | Storage credit account, oldest due periods and actual receiving account. | Actual account credit, storage credit receipt, partial/full period allocations, unallocated advance remainder and audit. | No full-period-only amount gate; no revenue or brand-wallet credit from payment itself; retry cannot duplicate receipt. |
| Refund unallocated storage credit — proposed | Storage credit account, source receipts/remaining allocations, funding account and expected versions. | Explicit actual account debit, storage credit debit/refund, linked source allocations and audit. | Insufficient credit/funds or competing period allocation rejects; no automatic refund on stop or revenue reversal. |
| Record paid expense | Assigned business branch, active category and account. | Expense, account debit, period cost fact and audit. | Historical effective date is allowed; insufficient funds or stale account discrepancy follows truthful resolution. |
| Send treasury transfer | Source account, fixed destination identity and stable command. | Source debit, transit credit, transfer record and audit. | Same account, insufficient funds or forbidden scope rejects. |
| Receive treasury transfer | Transfer/version, transit and destination account. | Transit debit, destination credit, full receipt and audit. | A short receipt rejects; replay cannot partially credit or duplicate credit. |
| Generic deposit/withdrawal | Account/version/scope and positive input amount. | Actual account movement, history/audit; no profit fact. | Withdrawal beyond funds rejects; no duplicate dedicated source posting. |
| Manual correction/opening | Target/version, original source/dependents, all affected wallets/accounts/stock/payroll in stable order. | Typed linked corrections, proper classification/holds, audit/result; actual money only when explicitly asserted. | No arbitrary cross-company edit, protected payroll rewrite, hard deletion or unsupported Tawsel action. |

## 8. Idempotency, locking, retries and durability

### 8.1 Stable command identity

The UI creates `commandId` once for a confirmed native intent and persists it while that intent's outcome is unknown. Scope the native key by `(companyId, authenticated native principalId, commandFamily, commandId)` and retain the normalized request digest. A same key/same payload returns the recorded result without re-executing. Same key/different payload returns a conflict. Reauthorize current company, principal, module and resource scope before reading any original result; a retained command does not preserve revoked access. A deliberate changed user decision creates a new intent after the previous result is known or reconciled. Canonical Tawsel `actionId` follows its own documented scope and is linked explicitly to this native intent, never assumed identical.

Insert/read the command result and perform its local mutation under one transaction. Durable failure results may record authoritative validation rejection; transient connection/process failures must not claim the business transaction was rejected. If the client response is lost after commit, status/replay retrieves the committed reference. Never create a second payout to repair a missing toast.

Source-generated effects additionally have unique business keys, such as `(source_system, source_identity, effect_kind, effective_revision)` plus explicit supersession. Idempotency of request transport alone does not protect replay through a different worker/action ID. One source fact cannot enter several remittances or duplicate a fee because it arrived by polling and event delivery.

### 8.2 Isolation strategy

Use explicit row locks and database constraints for balance/reservation/aggregate invariants. Lock parent aggregates before their children; within the same type lock IDs in sorted order. A documented global order for cross-domain actions is proposed: command/source identity → shipment/manifest/round/incident/storage agreement → stock positions → brand wallets/storage credit accounts → employee periods/obligations → money accounts → append-only effects. Review any command needing a different order before implementation; otherwise deadlock retry can conceal design flaws.

Queries whose invariant involves a missing row use a unique constraint or a materialized lock row, not `SELECT ... FOR UPDATE` on an empty result. For example, create/lock wallet and stock-position keys through safe upsert before competing mutations. Payroll unique-period and storage unique-period constraints prevent concurrent first creation.

Use serializable transactions only where a specified invariant cannot be protected clearly with aggregate locks/constraints. Retry PostgreSQL serialization/deadlock failures for the same stable command with bounded backoff; do not replay an untracked physical/provider side effect. No external HTTP inside a long-held transaction. Test both race orders for handover/cancel, payout/cover and receipt/duplicate.

### 8.3 Transactional outbox/inbox

Write source intent/outbox in the same ERP transaction as its intended local state/audit. A worker claims durable work, sends the documented command with its stable identity and records acceptance/unknown/rejection. Store received signed events durably before acknowledging; applying them is a separate transaction with dependency/revision checks and business effects. Exact sender acknowledgments, replay cursors, signatures and operation schemas remain in the integration plan.

A worker crash before commit leaves no partial local effects. A crash after commit but before acknowledgment is recovered by duplicate recognition. A pending outbox row after external acceptance is reconciled through documented action status/read/replay, not a newly generated command. No global exactly-once delivery or distributed ACID claim is made; the design targets once-per-source local effects under retry.

### 8.4 Unknown physical outcomes

Database ACID cannot attest that cash or goods actually moved. Staff confirmation records their assertion; a lost response may leave them unsure whether the record committed. Recover by native `commandId` or its documented mapped canonical `actionId`, then compare physical reality. If actual movement occurred but no valid record can be found, use the scoped missed-movement/correction workflow with source evidence. Do not fabricate a physical reversal because an HTTP request failed.

## 9. Correction, dates and protected history

| Source or record | Date rule | Correction rule |
| --- | --- | --- |
| Tariff/brand policy | New orders snapshot applicable policy. | Later edits do not reprice old orders; explicit pre-handover correction is audited and constrained. |
| Visit/outcome | Original authoritative work/effective time and revision. | Append new effective projection; apply safe unposted deltas or create linked review if posted-money/protected state conflicts. |
| Driver remittance / payout | Actual receipt/payment date plus immutable entry time. | No deletion or fictitious cash reversal. Wrong record and actual money returned are separate typed cases. |
| Payroll | Cairo calendar work period; paid/past calculation frozen. | Current-unpaid/future linked adjustment only; retain original work date/rate and allocation identity. |
| Expense | Actual paid date may be in a prior month. | Linked correction/reversal with reason; historical report may change with entry time exposed. No global payroll lock applied to expense entry. |
| Storage | Exact anniversary interval and snapshotted price/branch; full fee earned on period start. | Future period changes only in ordinary flow; linked partial/advance receipt allocations retained; unallocated credit survives stop; refund is explicit actual cash out, not an automatic stop effect. |
| Inventory observation | Actual observation time, version and immutable record time. | Stale observation conflicts; legitimate intervening movement cannot be overwritten. |
| Opening | Explicit opening date and batch/source. | Correct through linked entries; no current earning created and no repeated opening import. |

An accepted Tawsel correction does not authorize ERP refunds, company money receipt, extra driver remittance, re-opened payroll or available stock. The Settlements review must show original/effective facts, amount/quantity differences, affected source IDs, posted allocations and allowed resolution. Preserve unaffected brands/accounts/shipments and processing. Known source gaps hold only affected eligibility; no blanket financial freeze.

**Plan proposal:** when an effective source correction occurs before all related financial effects have been settled, the application can propose source-linked compensating entries and updated pending projections, but no final-money side effect is auto-created. Where the owner-approved rule permits automatic current earning projection, preserve old fact/revision and calculate only the delta; do not create another whole visit. Any ambiguity, negative dependency or protected period goes to review. The integration plan must specify the exact event-by-event application matrix before implementation.

## 10. Database and manual verification obligations

These describe future evidence. No database, money, payroll, custody or integration test was executed by writing this plan.

### 10.1 Real PostgreSQL scenarios

1. Two independent connections reserve the same last stock; one confirmation commits and the other rejects with all non-stock effects rolled back.
2. Two branches payout the same brand wallet while a third command reserves brand-paid shipping cover; total successful allocations never exceed eligible credit.
3. Expense, payroll payout and treasury transfer spend one account concurrently; aggregate successful debit is bounded by available funds.
4. Duplicate remittance commands/events/polling with the same source money create one account credit and one eligibility release; mismatched method sum commits nothing.
5. Transfer handover races cancellation and customer dispatch; one physical-custody transition wins. Destination duplicate/subset receipt never exceeds sent quantity or counts it at both branches.
6. Stock adjustment races real receipt/handover; stale observed version fails, while a legitimate actual shortage may leave reserved greater than sound without hiding it.
7. Source correction arrives before/after payout in both race orders. Protected records remain immutable, affected holds/review appear exactly once, unrelated wallets proceed.
8. Payroll payout races current adjustment and duplicate payout; one consistent full snapshot wins. Recovery allocations across zero-net/carry months never exceed the original advance/deduction.
9. Two workers generate the same storage period and retry after a crash. One period/charge/full earning exists, with correct January 31, February leap/non-leap and March boundaries, no duplicate cash and no daily revenue allocation. Fee 310 starting January 20 is entirely January revenue.
10. Backdated expense changes the proper historical report once, keeps current entry time and does not alter frozen payroll. Report exports and screen use the same authorized query and aggregate.
11. For each high-impact command inject failures after each logical effect before commit; assert no partial wallet/account/stock/audit/outbox results. Then simulate a committed result with the response lost; the same command ID returns one result.
12. Restart database/application workers with committed intents/events and confirm recovery, constraints and persisted results. This proves the tested local recovery case, not an untested hardware-failure RPO.
13. Attempt cross-company/cross-branch foreign references, unauthorized direct command IDs, re-enabled stale roles and forbidden report exports. Rejections must not reveal private financial/HR data or create partial effects.
14. Receive partial storage payment 100 against period 310, then advance credit and a new period; assert outstanding 210 after the partial payment and separate revenue/receipt/credit values. For advance 500 before start, verify revenue 0 before start, revenue 310 at start, remaining credit 190 and only one cash receipt.
15. Race proposed storage credit refund with period generation/allocation using independent connections. The same credit cannot be allocated and refunded. Stop retains unallocated credit; duplicate refund command returns its original result without another cash debit.
16. Apply a salary-earning deduction 200 and recover advance 1,000 against salary 6,000. Assert salary payout 4,800, earning cost 5,800 and no repeated cost reduction from recovery/carry. Company-funded replacement with goods due 250 and tariff 50 preserves goods due 250, waives only shipping 50 and retains normal commission.

### 10.2 Connected behavioral and browser checks

Vitest covers the domain examples in the domain specification through public application services/commands, not helper functions that merely repeat formulas. Real database tests cover transaction and concurrency claims. Browser checks cover confirmation summaries, pending/unknown/error states, return/custody truth, guarded actions, Arabic/RTL mobile entry and filter/export parity.

Each later phase supplies reproducible seed data, starting permissions/branch, exact clicks/inputs, expected references/totals/states, relevant failure cases and cleanup limited to that test data. A screenshot alone is not proof of a financial invariant; a mock connector success is not proof of Tawsel integration. Record commands actually run, versions, failures fixed and limitations honestly.

## 11. Migration and reporting integrity

Apply versioned additive migrations in order, with a migration lock and checksum history. Test fresh schema and upgrade from the previous phase's fixture with existing transactions/history. Do not edit an already-applied migration to erase evidence. Backfill new projection fields with source identities and verified aggregate checks before exposing them to financial decisions.

Balances/materialized read models are rebuildable from typed immutable movements and explicit allocations. Rebuild in isolation, compare totals, then atomically switch/checkpoint; do not let an incomplete rebuild temporarily make money eligible or stock available. Keep source event receipt, successful application and report projection version visible separately.

For a report request/export, capture filters, authorized scope, date basis and consistent database snapshot/read watermark. Page totals and exported totals must not use different scopes or count mutable records at unrelated points in time. A later transaction may change a subsequent report; show generation time instead of claiming a permanently frozen financial statement.

## 12. Review dependencies

P-DOM-01 through P-DOM-05 in the domain specification now record the owner's ERP-D-200 through ERP-D-204 answers; daily storage earning and full-period-only payment proposals are explicitly superseded. P-DOM-05's detailed credit-allocation/refund mechanics are adopted under ERP-D-205. P-DOM-06 remains the qualified contract dependency and P-DOM-07 the proposed incident branch attribution. This file's choices for UUIDs/numeric display references, integer money/commission rounding, deterministic locks, current-period payroll handling, shortage holds and observation-based funds holds are engineering proposals for master-plan approval. They must be reproduced in later phase specifications after adoption; no agent may silently replace them with arbitrary balance updates, floating-point money, generic event-triggered payouts or reference-repository shortcuts.
