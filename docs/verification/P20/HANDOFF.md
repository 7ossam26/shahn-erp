# P20 consuming interfaces

P20 owns monthly payroll, actual advances, bounded HR additions/deductions, source-linked late earning approval, full net payout and zero-net closure. P21/P23/P24 remain unimplemented by this phase.

## Storage and source identity

`0024_p20_payroll.sql` extends the existing P08 `employees.payroll_period`; it does not introduce another period lock table. Calculation JSON, source digest and frozen timestamp are immutable once set. `advance`, `payroll_adjustment`, `salary_payment` and original `payroll_obligation` records are immutable. A recovery allocation is identified by company/employee/month/original obligation and can only move from reserved to settled with the same amount. Original-row locks and SQL caps bound aggregate reserved plus settled recovery. Deferred SQL checks match snapshots, each original allocation, complete payment and actual cash sources.

The only backfill references already confirmed P18 `incident_obligation` rows using **the same original ID**, amount, source and incident branch. It creates neither a new debt identity nor an advance, salary payment or cash receipt. Previously stored legacy paid controls without calculation evidence return `LEGACY_PAYROLL_EVIDENCE_REQUIRED`; P20 does not fabricate them.

`employees.obligation_balance` exposes original amount, `outstanding_amount` (original less settled), `reserved_for_frozen_periods` and `available_for_new_allocation` (outstanding less reserved). Current previews reserve nothing. Past first processing freezes permissible immutable sources and reserves capacity. Payment settles reservations; zero closure settles without an account. A newer month cannot use an older frozen claim. Frozen snapshots retain their original totals while source drill-down shows current balances and recovery history.

## Same transaction boundaries

`payrollMonth`, `materializePayroll`, `payrollPreview` and `payrollCommands` use the caller's P03 `UnitOfWork`/checked-out PostgreSQL client. P09 `AccountFundsService` locks and validates funding in that same transaction. Command identity, original obligations, reservations, frozen calculation, actual movement, audit and retained result commit together.

Lock order: P02 authorization preamble; command/source identity; P08 company employee guard; employee/history; periods in calendar order; original obligations by sorted ID; employee journal resource; P09 account IDs in sorted order; effect append. The company guard serializes P08 term edits, P13 earning/correction classification, P18 confirmation and P20 processing. Incident flow takes its preceding custody/wallet locks before this shared employee guard; payroll never takes a brand wallet afterward. A command's rejected past edit can retain lawful historical materialization through P03's `prepareProtectedHistory` hook, outside its effects savepoint.

`acceptIncidentPayrollObligation(tx, companyId, originalId)` is exported from database and employee payroll service. P18 calls it immediately after its own confirmed original insertion, using the same transaction and guard. During an explicitly pre-P20 upgrade test it is absent-schema aware; production startup requires current migrations, and the migration imports those earlier actual originals.

`payrollEarnings(tx, company, employee, month)` consumes P13 `earning_basis` with a resolved captured employee/terms and a posted journal effect. It reads immutable visit work time, base shipping, policy/formula and work branch. Routing assignment and transfer cannot invent an earning. `payrollReviews` exposes typed late commission and broad source conflicts. P13's protected/source-revision records retain their own identities.

## Versioned HR routes

Closed contracts, validators and illustrative examples are under `packages/contracts/src/employees/payroll/`; paths are included in generated OpenAPI.

| Route | Meaning |
| --- | --- |
| GET `/api/v1/employees/{id}/months/{month}` | Authoritative categories, immutable calculation/source digest, live original balances, review and payment. Query requires company ID and HR/source branch scope. |
| GET `/api/v1/employees/payroll/catalog` | Accounts usable in the caller's assigned branches. Account/method/funds are revalidated at preview/payment. |
| POST `/api/v1/employees/{id}/advances` | Positive actual payment and original obligation, allowed current-unpaid/future recovery period. |
| POST `/api/v1/employees/{id}/period-adjustments` | Explicit bonus, overtime or ordinary earning deduction with positive amount, reason and work basis. No salary override or attendance input. |
| POST `/api/v1/employees/{id}/source-reviews/resolve` | Explicit linked late commission approval into current-unpaid/future period, preserving original work date/branch/captured amount. Unique visit resolution prevents duplicate settlement. |
| POST `/api/v1/employees/{id}/months/{month}/payout-preview` | Nonbinding full server net, selected actual funding and available funds; no amount field. |
| POST `/api/v1/employees/{id}/months/{month}/payout` | Full positive net once with command identity and expected version/digest; partial amount fields reject. |
| POST `/api/v1/employees/{id}/months/{month}/zero-close` | Zero net only, no funding fields or fake movement. |
| GET `/api/v1/employees/payroll/commands/{commandId}` | Scope-checked durable command-result recovery. A lost-response retry retains the same identity/payload. |

Online commands retain identity before submission. An unknown result disables a new submit, survives remount and checks the original command before retrying that exact payload. HR uses the existing `employees` screen grant, standard session/CSRF checks and actual source branch scope. Company-wide tracking never supplies HR access.

## P21 corrections

P20 permits ordinary current-unpaid/future monetary additions/deductions and explicit approval of an immutable captured late earning. It does not infer an amount for a broad P13 source conflict. Such review is visible and holds only the affected calculation. Paid cash, original debt and frozen reservations are retained. A broader financial reversal, negative/source conflict resolution, advance correction or frozen-reservation release needs P21's linked review/correction policy and P22 source recovery, using these original identities. Do not update protected payroll tables ad hoc or delete a reservation to make another month available.

## P23/P24 inputs

`PayrollMonth` contracts and the scoped employee filters expose employee/month/branch, salary/commission mode, unpaid/paid/zero-closed, available carry, advance status and typed source/date history. REP-24/25 remain HR operating histories; no report page was added. P23 owns reporting/export parity and any broader query optimization.

`employees.payroll_cost_source` is the classified P24 input: frozen full salary at its historical employee branch, manual earning additions/ordinary deductions at their historical work branch (deductions signed negative), and immutable posted visit commission at its work branch. Approved late adjustments keep the original work date for cost attribution and a distinct settlement month for cash processing. Salary cost is recognized by processing/freeze; an unprocessed legacy profile is not invented historical evidence. Advances, their cash issuance, reservations and settled recoveries are excluded from employee cost. P18's already recognized incident share stays in its own source class and incident branch; do not count a payroll recovery as a second incident gain. Actual treasury cash is independently available through `finance.money_movement` with `employee_advance`/`salary_payout` sources. The paying branch/account can differ from earning/incident branches.

Reconcile original = outstanding + settled; outstanding = reserved + available; period recovery = allocation sum; gross = recovery + net; payment = frozen net; actual cash = advance issuance + salary payout. These are different measures. No manual advance repayment receipt exists.

Known validation boundary: browser reruns were excluded by the owner. Script UI, PostgreSQL/native worker and actual HTTP evidence are described separately in README; no owner manual/device review or new independent Tawsel acceptance is claimed.
