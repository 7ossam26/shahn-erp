# ERP screen and interaction specification

Current authority, session025 (2026-10-03): ERP-D-205 / ERP-R-214 approve PLAN-001 and authorize phase authoring. Detailed plan mechanics below are adopted; original proposal/review wording is retained as drafting provenance, not a renewed approval gate. External contract gaps, unverified runtime targets and the unnamed palette remain explicitly limited. No production implementation is authorized by this authoring turn.

Revision PLAN-001, 2026-10-03. Adopted screen specification under ERP-D-205; actual screens still need implementation and visual acceptance. ERP-D-198 approves UI-REV-001's overall layout/design direction; ERP-D-199 requires advanced filters. This document defines the additional screens and behavior to carry into later implementation prompts. New screen details below are proposals consistent with approved business rules, not claims of rendered owner approval.

## Shared visual reference

Read UI-DESIGN-BRIEF.md and UI-REVIEW-LOG.md, then inspect `ui-preview/src/App.tsx`, `src/styles.css`, shared components and the six desktop/phone captures in `output/playwright/`. Use the existing centered content, module cards, simple utility/back header, restrained borders, rounded white panels, readable type and current-state timeline. Preserve the Cairo font, Arabic RTL and logical CSS spacing. The prototype's company name and wordmark remain placeholders.

The existing style uses content width about 1180px and landing width 980px, a 320px minimum viewport, mobile inputs at least 16px, main touch controls at least 44px, and compact cards replacing desktop rows. Treat these as measured reference values to refine with actual forms, not a promise that every screen fits without testing. Keep responsive checks at 390x844 and 1440x1050 and add 320px/768px and long-content cases. The white/lime and warm palettes remain separate token variants; the owner's approval did not name one. Do not introduce a new global layout while finalizing palette tokens.

Only the current section's related views may use a local switch, such as Products/Parcels. Do not add a global module sidebar or module-tab bar. The utility header may contain company/user context, branch context where needed, account/session access and back navigation. Large forms get a dedicated page with clear grouped sections; short contextual confirmation or lookup may use a dialog. Each page names its purpose and one dominant next action; secondary actions go into a contextual menu or separate page.

## Screen catalog and authority

Screen IDs below are proposed stable identifiers. Capabilities are namespaced by screen/module; grants are applied through the approved one-role plus user exceptions model. They are not hardcoded job roles or an additional per-button permission system. A screen's operations still obey scope, state and contractual authority.

| Screen ID / proposed route | Purpose and primary action | Scope / main data | Entry and exit |
| --- | --- | --- | --- |
| UI-AUTH-001 `/login` | Company login; Continue | Company code, username, issuer interaction; no public company enumeration | Return to authorized intended route after login |
| UI-HOME-001 `/` | Enter an available module or find a shipment | Only granted cards; tracking search requires tracking access | Card to focused list; no dense dashboard of every metric |
| UI-ACCESS-001 `/administration/users` | Manage ordinary users and activation | Company administration, one role, assigned branches, exceptions, identity readiness | User detail/setup page; preserve list filters on return |
| UI-ROLES-001 `/administration/roles` | Define module access | Module registry with screen descriptions; role assignment and exception preview | Saved role preview; no per-button permission editor |
| UI-SUPPORT-001 `/support` | Developer support company/session selection and branch creation | Support identity, MFA/session, explicit company, normal business audit | Enter selected company with visible support context; no user impersonation |
| UI-REFERENCE-001 `/settings` | Choose a reference catalog to maintain | Governorates/areas, price tiers/rates, expense categories, service configuration | One catalog editor at a time; referenced entries deactivate |
| UI-BRAND-001 `/brands` | Find/create a brand | Company-level identity, enabled services and active state | Brand detail; financial tabs require separate financial screen access |
| UI-BRAND-SETUP-001 `/brands/new` and `/brands/:id/setup` | Create/update commercial settings | Identity, services, manual tier, partial-delivery policy, payout weekdays, negative-credit option, storage agreement | Preview configuration then save atomically where local; show pending external setup separately |
| UI-INTAKE-001 `/shipments/new` | Register the physically received ready/packing parcel | Assigned intake branch, brand, recipient, line/value details, service and calculated charge | Created shipment detail, or explicit next-entry action |
| UI-PREPARATION-001 `/preparation` | Confirm stock order, reserve and finish preparation | Brand/variant quantities, available stock, line values, preparation states | Dedicated order entry/detail; clear shortage blocker |
| UI-INVENTORY-001 `/inventory` | Monitor Products/Parcels and actual custody | Assigned branches; distinguish available/reserved/damaged/carrier-held | Stock variant history or shipment detail; no formal count session |
| UI-STOCK-RECEIPT-001 `/inventory/receipts/new` | Record brand stock physically received | Assigned branch, brand, product/variant, whole quantities, condition, date | Receipt detail and affected availability |
| UI-PRODUCT-SETUP-001 `/brands/:id/products` | Create/update/deactivate brand products and variants | Product-setup screen grant; active same-company brand; names/options and stable variant identity; no stock created by setup | Entry from Brand or Products inventory; return to original filtered list |
| UI-DISPATCH-001 `/dispatch` | Prepare and confirm actual customer-driver handover | Eligible branch work, real driver references/status/freshness, price/credit/preparation blockers | Submission status and handover detail; link Tawsel separately for execution |
| UI-TRACKING-001 `/tracking` | Find any same-company shipment | Company-wide operational scope; current custodian and complete journey | UI-SHIPMENT-001; never grant mutation authority through search |
| UI-SHIPMENT-001 `/shipments/:reference` | Explain location, state, history and next expected step | Operational facts, scoped contact/detail, timeline, integration freshness | Contextual authorized correction/incident/transfer links; no action pile |
| UI-GOODS-SEND-001 `/goods-transfers` | Create one physical-trip manifest and record handover | Assigned source, other company destination, carrier, eligible whole parcels/stock quantities | Manifest detail with preparation/reservation/handover states |
| UI-GOODS-RECEIVE-001 `/goods-receipts` | Confirm what physically arrived | Assigned destination; sound/damaged quantities, unresolved missing balance; sealed-parcel identity/exterior | Posted receipt and explicit remainder/incident link |
| UI-RETURNS-001 `/returns` | Receive documented customer-delivery returns and dispose/handover to brand | Original dispatch branch, driver/request, actual subset and condition | Receipt status, remaining driver custody, brand handover or usable stock |
| UI-INCIDENT-001 `/incidents` | Confirm loss/damage and agreed compensation/liability | Shipment/stock, evidence facts, goods value or agreed amount, brand credit, employee/company split | Reviewed financial/custody effects and linked posted result |
| UI-REMITTANCE-001 `/driver-remittances` | Confirm complete actual recipient-money receipt for a round | Effective reports, known gaps, full amount, mixed method/account components | One confirmed receipt; no partial/shortfall option |
| UI-BRAND-PAYOUT-001 `/brand-payouts` | View eligible dues/calendar/history and pay a brand | Shared wallet, holds, paying account, funds, amount, method, optional reference, off-day reason | Payout confirmation and movement history |
| UI-STORAGE-001 `/storage` | Maintain agreement periods, arrears, partial receipts and advance credit | Brand, agreement branch, anchor, fixed fee, future change/stop, receipt amount/date/account, allocation preview and separate unapplied credit | Actual receipt and allocation history; partially paid period remains due; advance is not earned revenue |
| UI-EMPLOYEE-001 `/employees` | Setup employee and view monthly earnings/history | Salary/commission toggles, work schedule, branch attribution, optional driver link | Employee month view; not Tawsel driver onboarding |
| UI-PAYROLL-001 `/employees/:id/months/:month` | Explain salary/commission/additions/deductions/net and pay once | Period lock, advance obligations, carry, posted payout | Salary/commission shown separately, month history and receipt |
| UI-ADVANCE-001 `/employees/:id/advances/new` | Record actual employee advance | Employee, amount, date, funding account/method | Advance receipt and payroll recovery reference |
| UI-EXPENSE-001 `/expenses` | Record an expense already paid | Assigned branch, category, actual date including past date, amount, account/method | Expense record and period/category filters |
| UI-CASH-TRANSFER-001 `/treasury/transfers` | Send a complete treasury transfer | Any same-company branches under this screen grant; accounts, amount, date | Source debit/in-transit transfer; not destination receipt |
| UI-CASH-RECEIPT-001 `/treasury/receipts` | Accept a complete treasury transfer | Any company destination under separate screen grant | Full posted receipt; no partial receipt form |
| UI-CASH-MOVE-001 `/treasury/movements/new` | Record general deposit or withdrawal | Direction, authorized account, amount, date, optional free-text reason | Balance effect and history; exclude operating profit |
| UI-ACCOUNT-SETUP-001 `/treasury/accounts` | Create/deactivate branch cash and named company bank accounts | Account-setup screen grant; company, account type/name, branch association/allowed usage and active state; no automatic balance | Entry from Treasury; account detail with dated movement history |
| UI-OPENING-001 `/settings/opening-balances` | Optionally record existing starting balances/stock | Opening-entry screen grant; authorized target and branch, opening date/batch, source evidence and explicit eligibility classification | Optional setup action; preview all effects then one committed batch/result; zero-start company skips it |
| UI-ADJUSTMENT-001 `/settlements` | Review and post legitimate linked corrections or adjustments | Choose target first: brand, employee, cash, shipment/stock or source difference | Dedicated type form with before/after effects; no arbitrary database editor |
| UI-REPORTS-001 `/reports` | Choose one selected report and inspect/export it | Report permission and branch scope, explicit dates/filters/asOf/formula | Detail drill-down and same-scope export/print |
| UI-INTEGRATION-001 `/integration` | Resolve pending/rejected/gapped synchronization | Authorized status, source command, affected record, safe recovery action, retained reason | Retry same intent or create reviewed replacement after definite rejection; no driver outcome override |

Brand setup, intake and employee setup use grouped sections with concise summaries. Their detailed groups are below. Administrative screens may have several fields; simplicity means understandable choices and scope, not hiding a required condition until submit.

## Shared interaction contract

Every mutable screen defines: initial/loading state; ready data and current revision; validation; submitting; server-confirmed success; definite business rejection; connection loss before submission; unknown outcome after submission; denied scope/deactivation; another user's revision change; duplicate/already-completed result. Buttons prevent accidental repetition, but server idempotency provides correctness.

On timeout after submission, keep the command identity, show that the result is being checked and offer recovery/status refresh. Do not invite a new payment, stock receipt or handover with a new ID. On stale data, show the changed facts and require review of the new revision. On no connection, reads may show clearly dated last-loaded data; new business commands wait for connectivity. Never label a saved browser draft as a registered order.

Confirmation shows only facts needed for the action: amount/branch/account for money; source/destination/custody for transfers; quantities/condition for receipt; compensation and recovery split for an incident. Required reasons apply to genuine configured exceptions and adjustments, not every routine action. Successful notices link to the committed record. Preserve navigation and filters after detail/back; keep keyboard focus on the new title or restored trigger, and announce validation errors.

## Brand and employee forms

### Product, account and optional opening setup

UI-PRODUCT-SETUP-001 requires brand, product name and at least one named variant or a single default variant. Optional variant option labels describe size/color or other owner-entered distinctions; they do not create manufacturing, serial or lot tracking. Internal identities remain stable through renaming. Before saving a repeated display combination, warn staff to inspect the existing variant; do not merge its stock automatically. Deactivation prevents new use while retaining stock/history and permitted completion/return of existing work. Product creation creates no quantity receipt and no cost valuation.

UI-ACCOUNT-SETUP-001 requires a readable account name, Cash or Bank type, EGP currency and scope: a cash account belongs to a branch; a named company bank account records its allowed branch usage. Bank-identifying description/reference is optional and is not a provider credential. InstaPay is a payment method selecting an existing account, not an automatically separate ledger. Account creation starts at zero; use the explicit opening workflow for existing money. Deactivate only when outstanding transfer/use obligations have a resolved path; retain all balances and movements. Reject new ordinary transactions on inactive accounts without hiding prior money.

UI-OPENING-001 is optional and visibly separate from ordinary receipts/income. Choose Stock, Company account, Brand balance or Employee obligation/entitlement first, then a focused target form. Require actual opening date, target identity, authorized branch where applicable, quantities/condition or signed amount as appropriate and a source/batch description. Brand openings must distinguish already eligible credit from unresolved driver-held money; employee openings distinguish an obligation from an earning. Stock openings use actual branch/brand/variant quantities. Preview affected ledgers and state explicitly that openings do not earn operating profit. Commit each reviewed batch atomically with stable identity and duplicate-target/batch checks. An existing posted opening changes only through a linked adjustment; repeated setup cannot add it again. This is not an Excel import or mandatory onboarding prerequisite.

Brand setup groups:

1. Identity/contact and active state. One company-level brand; no duplicate branch wallets.
2. Enabled services, default service, brand partial-delivery policy and relevant defaults. Multiple allowed services are possible; each order chooses one.
3. Manually assigned negotiated tier and the fixed packing uplift. Show the currently applicable governorate/area tariff preview without promising automatic volume reclassification.
4. Payout weekdays and negative-balance option. Explain the new-handover gate in plain copy. Payment methods remain actual recorded cash/bank/InstaPay, without gateway setup.
5. Optional storage agreement: fixed monthly fee, original anniversary date, revenue branch, active/stop-next-period state and prospective rate change. Payment recording belongs to its own operation.

Employee setup groups:

1. Personal/work information, branch attribution, active/employment dates, workdays, hours and weekly day off.
2. Salary toggle and fixed monthly amount. No automatic attendance or partial-month proration.
3. Commission toggle and mutually exclusive percentage-of-base-shipping or fixed-per-eligible-visit input; effective date and explicit driver-reference linkage for automatic calculation.
4. Month detail separately displays salary, commission, additions, deductions, advances recovered, prior carry and net. Negative net is zero payable with carried residual. No partial salary payout control.

Brand and employee form changes show prospective effect and preserve historical snapshots. Editing the current unpaid salary is permitted within approved rules; paid/past months are immutable. Repeating a brand/employee name does not bind identities automatically.

## Shipment entry and custody forms

Ready/packing entry requires an assigned branch, active brand, chosen enabled service, recipient name, phone, governorate, optional area, readable address, optional location link, line quantities/brand-supplied values, explicit inspection choice, partial-policy snapshot and comments. Optional brand reference may be blank. ERP assigns the human numeric reference. Preview goods total, base shipping, packing uplift, expected recipient payment and the prepaid-to-brand mode without asking the operator to reconstruct fees manually.

The optional URL accepts only safe HTTP/HTTPS URLs and is never a server-side fetch target. For recipient phone, normalize Arabic digits and strip permitted display spaces/hyphens/parentheses, preserve the entered display text, then require the canonical `RecipientPhone` pattern `^(?:\+[1-9][0-9]{7,14}|01[0125][0-9]{8})$` before confirming the order. It permits E.164-shaped input or an Egyptian mobile. Do not infer a missing country/area code for a local landline; request its complete international form. Examples `01012345678` and `+201012345678` pass; a missing phone, `call me`, `123` and multiple comma-separated numbers fail. This checks shape, not allocation or reachability. Source: pinned05 `b2c-intake.schema.json#/$defs/RecipientPhone` at1194, referenced by B2B SourceSnapshot; pinned06 `p09-create-address-task` and invalid `p09-phone-required`. Governorate is required for pricing; area is optional and must belong to that governorate. Missing applicable tariff blocks registration/receipt/reservation as one operation while retaining form input.

Stock-order entry selects brand variants and whole quantities already received in the assigned branch. Show available stock beside each line and server-check all lines together. Confirmation reserves every valid line atomically; any shortage prevents the whole confirmation. Preparing goods does not add another stock receipt. Ready-for-handover requires explicit preparation completion for company-handled services.

Dispatch selects eligible prepared parcels, driver and actual handover context. Show unavailable tariff, negative-credit restriction, reservation shortage, pending Tawsel acceptance, protected departure state and driver status freshness separately. Do not recreate route optimization or driver execution screens. Confirming a received assignment has physical meaning under Tawsel; a draft selection or pending source action must not claim the driver holds the goods.

Goods transfer uses one source, one destination and one carrier per physical trip. Show known at-branch/no-round drivers first and label drivers already in a Tawsel round; stale/unknown status remains visible. A source selection change clears ineligible lines with an explanation, never silently moves a previous reservation. Receipt counts loose stock and checks sealed-parcel identity/exterior; it does not certify hidden contents. Pending/missing/damaged quantities stay explicit.

Customer returns remain a separate screen tied to the original Tawsel dispatch branch and return request. An ERP inter-branch receipt cannot consume a Tawsel return balance or silently switch its branch identity. Actual brand handover also has its own dated confirmation and remaining quantity history.

## Financial forms added by session024

The dispatch and brand-payout views show eligible wallet credit, known shipping cover and currently available payout separately. For100 eligible and50 cover, show50 available; unremitted money is separately pending. A conflicting payout or handover reloads the committed balance and explains the shortfall instead of silently accepting both operations (ERP-D-200).

Storage shows one period per row with service start/end, fixed charge, allocated amount and remainder, plus a separate unapplied-credit total. Record payment is the primary action: actual amount/date/method/account and an allocation preview. Partial100 against310 leaves210 due. Advance500 before service starts shows500 credit and0 revenue; the first310 period applies310 and leaves190 credit. The proposed oldest-due order is explicit, with future credit applied when a period starts. Never label unallocated credit as wallet payout balance, profit or a fully paid future service period. Show recognition in the service-start month, including310 January revenue forJanuary20-February19. A proposed separate refund action opens a focused form with original receipt/credit evidence, amount, account/funds, reason and actual cash-out confirmation; stopping an agreement is not a refund. Allocation/refund mechanics are plan proposals; partial/advance support and recognition are approved ERP-D-201/204.

In incident-linked replacement entry, show the ordinary tariff, explicit company-funded shipping waiver, shipping due0, actual goods due and retained driver commission basis. The confirmation explains zero net shipping revenue and prevents a second brand shipping debit. Waiving50 shipping with250 goods due leaves recipient due250. Keep ordinary recipient/brand funding as the normal path; no employee-funded replacement option was selected (ERP-D-203).

Employee history labels entitlement deductions, advance recovery and incident recovery separately. A6000 salary,200 entitlement deduction and1000 advance recovery show4800 cash net and5800 employee cost; incident recovery does not reduce cost again if already counted as recovery. The same linked source can be opened from payroll and profit without appearing as two economic effects (ERP-D-202).

## Advanced filter specification

Use a compact frequent-filter row and an Advanced filters button showing an active count. On desktop, an expandable panel is the default proposal; on phone, a focused dialog with Apply and Reset. Entering filters does not mutate data. Show active chips and a clear-all action after apply. Preserve query state on navigation/back, authorize all values server-side and never store a broader last-used branch after permission revocation.

| Screen family | Frequent controls | Advanced fields for detailed implementation |
| --- | --- | --- |
| Parcels inventory | Search, assigned branch, custody | Brand, service, recorded/received date basis, parcel state, source/destination transfer branch, preparation state, return/incident state |
| Products inventory | Search, assigned branch, brand | Product/variant, available/reserved/damaged category, no-available-stock toggle, last-movement date; do not mix movement period with current balance semantics |
| Shipment tracking | Numeric reference/brand reference/phone/name | Brand, current branch/custodian, actual state, service, governorate/area, created date or last-event date with explicit selector; company-wide operational scope |
| Preparation/dispatch | Branch, ready/blocked state | Brand, service, created date, shortage/price/credit/sync blocker, intended driver where already assigned |
| Goods transfers/receipts | Manifest/reference, branch, state | Source/destination, carrier, brand, parcel vs stock, handover/receipt date basis, outstanding discrepancy |
| Driver remittance | Driver, round, unremitted state | Branch, round/end date, reported total, sync hold; amount filters never create partial remittance |
| Brand payout/statements | Brand, period, eligible/held status | Paying/revenue branch basis, method, movement type, off-day, reference, adjustment link |
| Expenses/treasury | Branch/account, period | Category where applicable, method, actor, deposit/withdrawal/transfer status, actual-date vs recorded-date selector |
| Employees/payroll | Employee, month, branch | Salary/commission modes, paid/unpaid, additions/deductions, carry and advance status |
| Settlements | Target type, unresolved state | Linked shipment/brand/employee/account, period, reason/type, source difference, recorded actor/date |
| Reports | Report-specific date range and authorized branches | Applicable brand/driver/service/region/category/account dimensions; expose only dimensions used by the stated formula |

These are adopted screen requirements, not an implemented generic query engine. Define each filter's accepted values, date basis, null behavior and SQL indexes in the implementing phase. Amount-range fields use inclusive bounds and integer minor units; date endpoints use Cairo half-open ranges. Changing filters resets pagination. An empty result explains the filters and offers reset. A loading failure retains the query and does not display a misleading zero.

Filter acceptance: multiple selected brands use OR, combined branch/state filters use AND; an unassigned branch in a tampered inventory request is rejected; the same branch may remain searchable through authorized company-wide tracking; exported rows/totals match the authorized filter snapshot; back navigation restores the same query; mobile controls expose all active filters; original names/phone values are retained while digit-normalized search works.

## Reports and printable output

Selected standalone reports are REP-01, REP-05, REP-07, REP-08, REP-12, REP-14, REP-15 and REP-18. REP-09/10 share the brand payout surface. REP-24/25 remain within HR. Settlements is an operating screen, not a report action hidden in a totals page. Use ERP-REPORT-CATALOG.md for exact meanings and supersessions.

Each report shows company, authorized scope, date basis, filters, generated/asOf time, amount units, totals and links to the underlying records. REP-15 profit and REP-18 stock monitoring have highest owner priority. Profit must distinguish brand goods proceeds, earned service revenue, employee costs, actual paid expenses and recoveries; a cash-balance card is not a profit measure. Mark incomplete/gapped source data visibly without erasing unrelated valid amounts.

Provide screen, real XLSX and print/PDF layouts. Print uses the same snapshot/filter/formula with repeatable headers, readable Arabic text, page numbers, right-aligned numeric columns and no clipped totals. Exports require permission at creation and download. Protect spreadsheet formulas in user-controlled cells. Large exports show a background job and expiry; never fabricate a file-download success.

## Design acceptance per UI-bearing phase

Every future phase names these screen IDs, the approved shell/captures and relevant field/state/filter tables. It must implement the complete bounded journey through real API data, run focused Vitest behavior tests and browser checks, and capture desktop/phone output for comparison. A form screenshot alone does not verify validation, an unknown command outcome, cross-branch scope or financial concurrency.

Owner walkthroughs must name an actual fixture/reference, input values, clicks, visible result and one important rejection/recovery branch. Include long brand/recipient/address text, zero amounts, large EGP totals, missing optional fields, no results, stale data and permission changes. No browser horizontal overflow, hover-only essential action or color-only financial/state meaning is acceptable. Maintain reduced motion, labeled controls, predictable focus and keyboard operation.

Review additional form and money/custody patterns in complete batches using this established direction. General layout approval is not a reason to ask the owner to redesign the home page again, and it is not blanket approval for unreviewed transactional behavior.
