# Phase coverage and completion criteria

Revision PHASES-001, session025, 2026-10-03. PLAN-001 is approved under ERP-D-205. This is an authoring coverage map, not passing runtime evidence.

## Requirements and decisions

[REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md) maps all214 requirements and205 decisions to implementation/consuming phases and acceptance. [Machine-readable assignments](requirement-phase-map.json) retain those same mappings. The first linked phase leads the stated slice; later links consume or verify it. A shared requirement can require all linked slices before it is complete.

Cross-cutting scope, UI, English documentation, meaningful Vitest, real transaction/integration proof and honest status apply to every phase through [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), even where their matrix uses P01/P26 as the setup/final-verification owner. Planning-only requirements receive document evidence, not invented application mutations. Superseded/deferred entries point to the replacement or an exclusion check; this does not implement excluded scope.

## Screen and action ownership

The first owner builds the core screen; additional owners extend only their named workflow. Use [ERP-SCREEN-SPEC.md](../docs/planning/ERP-SCREEN-SPEC.md) for exact fields, scopes and advanced filters. No page gets an unowned button because an endpoint or reference screenshot happens to contain it.

| Screen | Purpose / primary action | Owning and consuming phases | Final evidence |
| --- | --- | --- | --- |
| `UI-AUTH-001` | Company login; Continue | [P02](02-company-access-and-identity.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-HOME-001` | Enter an available module or find a shipment | [P01](01-foundation-and-ui-shell.md), [P02](02-company-access-and-identity.md), [P13](13-execution-projections-and-tracking.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-ACCESS-001` | Manage ordinary users and activation | [P02](02-company-access-and-identity.md), [P11](11-tawsel-bootstrap-and-durable-receiver.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-ROLES-001` | Define module access | [P02](02-company-access-and-identity.md), [P11](11-tawsel-bootstrap-and-durable-receiver.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-SUPPORT-001` | Developer support company/session selection and branch creation | [P02](02-company-access-and-identity.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-REFERENCE-001` | Choose a reference catalog to maintain | [P04](04-brands-geography-and-pricing.md), [P09](09-accounts-expenses-and-money-movements.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-BRAND-001` | Find/create a brand | [P04](04-brands-geography-and-pricing.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-BRAND-SETUP-001` | Create/update commercial settings | [P04](04-brands-geography-and-pricing.md), [P19](19-storage-subscriptions-and-credit.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-INTAKE-001` | Register the physically received ready/packing parcel | [P06](06-parcel-intake-and-packing.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-PREPARATION-001` | Confirm stock order, reserve and finish preparation | [P06](06-parcel-intake-and-packing.md), [P07](07-stock-order-reservation-and-preparation.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-INVENTORY-001` | Monitor Products/Parcels and actual custody | [P05](05-products-stock-receipt-and-monitoring.md), [P06](06-parcel-intake-and-packing.md), [P13](13-execution-projections-and-tracking.md), [P15](15-interbranch-goods-transfers.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-STOCK-RECEIPT-001` | Record brand stock physically received | [P05](05-products-stock-receipt-and-monitoring.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-PRODUCT-SETUP-001` | Create/update/deactivate brand products and variants | [P05](05-products-stock-receipt-and-monitoring.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-DISPATCH-001` | Prepare and confirm actual customer-driver handover | [P12](12-customer-dispatch-and-shipping-cover.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-TRACKING-001` | Find any same-company shipment | [P13](13-execution-projections-and-tracking.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-SHIPMENT-001` | Explain location, state, history and next expected step | [P06](06-parcel-intake-and-packing.md), [P13](13-execution-projections-and-tracking.md), [P14](14-returns-and-redispatch.md), [P15](15-interbranch-goods-transfers.md), [P18](18-incidents-and-replacement-shipping.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-GOODS-SEND-001` | Create one physical-trip manifest and record handover | [P15](15-interbranch-goods-transfers.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-GOODS-RECEIVE-001` | Confirm what physically arrived | [P15](15-interbranch-goods-transfers.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-RETURNS-001` | Receive documented customer-delivery returns and dispose/handover to brand | [P14](14-returns-and-redispatch.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-INCIDENT-001` | Confirm loss/damage and agreed compensation/liability | [P18](18-incidents-and-replacement-shipping.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-REMITTANCE-001` | Confirm complete actual recipient-money receipt for a round | [P16](16-full-driver-remittance.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-BRAND-PAYOUT-001` | View eligible dues/calendar/history and pay a brand | [P17](17-brand-wallet-and-payout.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-STORAGE-001` | Maintain agreement periods, arrears, partial receipts and advance credit | [P19](19-storage-subscriptions-and-credit.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-EMPLOYEE-001` | Setup employee and view monthly earnings/history | [P08](08-employee-profiles-and-commission-terms.md), [P20](20-payroll-and-advance-recovery.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-PAYROLL-001` | Explain salary/commission/additions/deductions/net and pay once | [P20](20-payroll-and-advance-recovery.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-ADVANCE-001` | Record actual employee advance | [P20](20-payroll-and-advance-recovery.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-EXPENSE-001` | Record an expense already paid | [P09](09-accounts-expenses-and-money-movements.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-CASH-TRANSFER-001` | Send a complete treasury transfer | [P10](10-treasury-transfers.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-CASH-RECEIPT-001` | Accept a complete treasury transfer | [P10](10-treasury-transfers.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-CASH-MOVE-001` | Record general deposit or withdrawal | [P09](09-accounts-expenses-and-money-movements.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-ACCOUNT-SETUP-001` | Create/deactivate branch cash and named company bank accounts | [P09](09-accounts-expenses-and-money-movements.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-OPENING-001` | Optionally record existing starting balances/stock | [P21](21-adjustments-and-opening-entries.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-ADJUSTMENT-001` | Review and post legitimate linked corrections or adjustments | [P21](21-adjustments-and-opening-entries.md), [P22](22-integration-recovery-and-conformance.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-REPORTS-001` | Choose one selected report and inspect/export it | [P23](23-operational-reports-and-exports.md), [P24](24-operating-profit-and-reconciliation.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |
| `UI-INTEGRATION-001` | Resolve pending/rejected/gapped synchronization | [P11](11-tawsel-bootstrap-and-durable-receiver.md), [P12](12-customer-dispatch-and-shipping-cover.md), [P13](13-execution-projections-and-tracking.md), [P14](14-returns-and-redispatch.md), [P22](22-integration-recovery-and-conformance.md) | P26; relevant real-API browser path, negative scope, mobile/error states and filter/export parity |

Every relevant operational/report screen implements its own advanced predicates, active-filter display/reset, empty/error states, server authorization and responsive controls in its owning phase. P23 supplies shared snapshot exports; P26 compares actual screen/export scopes. Product/parcel physical custody, company-wide operational tracking and financial/report scope remain different.

## Contract operations, events and failure branches

[INTEGRATION-PHASE-COVERAGE.md](INTEGRATION-PHASE-COVERAGE.md) maps all44 named operations (43 scoped service operations plus one operator bootstrap) and all27 sender event types to first owner, consumers and failure/recovery acceptance. Its conditional urgency adapter does not create an unselected ERP action. [Canonical reading coverage](../docs/planning/INTEGRATION-CONTRACT-COVERAGE.md) identifies exact definitions, fixtures and genuine source/evidence limits. The mapping is complete only if every required operation/event has both its ordinary path and its meaningful authority/revision/retry/recovery path.

CR-001 is a Tawsel contract-extension dependency for reason fields and their correction/history propagation. CHECK-003 is the qualified changed-branch customer-redispatch dependency. Their blocked slices remain in scope; no independent ERP transfer or current JSON-schema validation establishes them. P11/P12/P13/P14 supply required recovery as features arrive; P22 adds cross-feature conformance, and P26 audits the actual result.

## Critical cross-domain chains

| Chain | Implementation owners | Failure that must remain in the demonstration | Final verification |
| --- | --- | --- | --- |
| Shared identity and mutable authority | P02, P11 | Lost issuer/provisioning response, deactivation and scope change affect the next real request; no service-driver impersonation | P22, P26 |
| Ready/company-packed order to payout | P04, P06, P12, P13, P16, P17 | Missing tariff, unknown handover, late outcome, full-receipt mismatch and competing payout cannot create partial/duplicate economic effects | P22, P26 |
| Stored stock to delivery/return | P05, P07, P12, P13, P14 | Last-unit race, condition uncertainty and unreceived return never create available stock | P15, P21, P26 |
| Known shipping cover and shared wallet | P03, P04, P12, P13, P16, P17 | Payout/cover race and cover consumption cannot use the same eligible credit twice; pending goods/storage credit excluded | P21, P22, P26 |
| Internal transfer and cross-branch tracking | P05, P07, P08, P11, P13, P14, P15 | Actual subset/discrepancy, cancel after handover, active-round carrier, unauthorized receipt and CHECK-003 remain distinct | P21, P22, P26 |
| Incident, compensation and replacement | P18, P17, P20 | Suspected incident posts nothing; confirmed credit does not wait for recovery; waiver affects shipping only and preserves normal commission | P21, P24, P26 |
| Storage revenue and credit | P04, P09, P19 | Partial debt, advance before service, concurrent renewal/refund, stop with credit and duplicate allocation preserve cash/revenue distinction | P21, P24, P26 |
| Payroll and protected unpaid periods | P08, P13, P18, P20 | Freeze reserves recovery; a newer month cannot recover an old frozen month obligation again; paid/past net stays unchanged | P21, P24, P26 |
| Actual accounts and treasury | P09, P10, P16, P17, P19, P20 | Funds race, wrong account/scope, duplicate full receipt and lost response; no invented physical return | P21, P24, P26 |
| Accepted outcome correction after posting | P13, P16, P17, P20, P21, P22 | Retain original payout/payroll, hold affected source only, no automatic refund or repeated receipt | P24, P26 |
| Reports and exports | P23, P24 | Same authorized snapshot, source dates, typed exclusions, safe spreadsheet cells, expired/revoked downloads and incomplete-source flags | P26 |
| Release and recovery | P25 | Uncertain remote action, ERP-only cash beyond recovery point, migration incompatibility and unavailable offsite provider stay visible | P26 |

## Selected report ownership

| Report / placement | Primary implementation | Source consumers and acceptance |
| --- | --- | --- |
| REP-01 shipment register and status | P23 | P06/P07/P13/P15 shipment state, custody and business dates; count shipments versus visits honestly |
| REP-05 driver activity and rounds | P23 | P13 canonical round/work/activity facts; no invented GPS, attendance or transfer commission |
| REP-07 returns and handover to brands | P23 | P14 offered versus actual receipt, condition and physical brand handover |
| REP-08 brand account statement | P23 | P13/P16/P17/P18/P21 credits, fees, compensation, corrections and payout balances |
| REP-09/10 combined brand payout surface | P17, P23 | Shared wallet pending/eligible/held/cover/payout and branch breakdown |
| REP-12 company accounts | P23 | P09/P10 actual movements and transit; not operating profit |
| REP-14 expenses | P23 | P09 paid-only category/business-date/branch facts |
| REP-15 operating profit | P24 | P13/P18/P19/P20/P21 typed facts; all storage fee at period start; no double recovery |
| REP-18 stock monitoring | P05, P23 | P06/P07/P14/P15/P21 physical/reserved/unavailable/carrier quantities |
| REP-24/25 within HR | P20 | Monthly earning/obligation/recovery/payout histories; no extra standalone report |

Use the authoritative [report catalog](../ERP-REPORT-CATALOG.md) for exact labels and definitions; this compact index does not amend selection. Settlements is P21's operating page. Formal stock-count sessions, Excel intake, barcode labels, brand portal and invoice/tax modules remain excluded.

## Authoring completion gate and runtime gate

Before calling PHASES-001 fully authored, verify all26 numbered files exist, have full prerequisites/rules/slices/checkpoints/acceptance/manual/model/stop sections, and match the acyclic manifest. Verify214 requirement and205 decision assignments, all35 screen entries, operation/event coverage, no broken local links/undefined IDs and unchanged pinned baseline. Review actual content, not only headings or word count. Record discovered contradictions and corrections in document evidence.

Authoring completeness does not mean executable external prerequisites are all present. Each implementation phase must later show its real required evidence. A phase with missing material acceptance is blocked or verification-pending, and P26 cannot certify complete V1 while required acceptance remains unresolved. No status becomes passed automatically from this coverage table.
