# P08 transaction and temporal interfaces

`@shahn/api/employees` exports `employeeCommands(pool)`, employee queries, `termPreview`, `resolveEmployeeTermsAt` and `guardEditablePayrollPeriod`. Shared types/closed JSON schemas/examples are exported by `@shahn/contracts`; exact formula, validation and half-open resolution are exported by `@shahn/domain`. Repository functions accept an existing `TransactionClient`. No consumer opens a nested transaction.

## P11 identity registry

`employees.operational_driver` is the shared local registry because no earlier driver registry existed. Its UUID is independent from employee, ERP principal, name, phone and display reference. P08 creates only local references with `external_mapping='pending'` and `tawsel_driver_id=NULL`. P11 must preserve that UUID, establish a verified company-scoped mapping through its own boundary, then atomically mark `mapped` with a nonempty external ID. The unique company/external-ID key prevents reused identities. Nothing in P08 logs into or provisions Tawsel. P15 may select eligible active drivers company-wide under its own screen authority; the HR catalog remains assigned-branch scoped and contains no fabricated round/location/readiness information.

An employee can have no link. `employee.link` accepts exactly one existing driver UUID or a clearly labeled new local reference, dated `[effectiveDate,endDate)` with a reason. Replacing this employee's existing association closes/supersedes its interval; another employee's overlapping association conflicts. Future associations are not silently deleted. Both driver and employee interval axes have real PostgreSQL exclusions. Names/contact are never matching keys.

## P13 policy resolution and acceptance

```ts
resolveEmployeeTermsAt(
  tx: TransactionClient, companyId: string, driverId: string, workAt: Date,
  options?: { acceptWork?: boolean },
): Promise<EmployeeTermsResolution>
```

It uses the authoritative instant's Cairo date, the exact effective driver link, commission policy and employee branch history. Returned resolution includes employee/driver IDs, link ID, commission policy ID/formula, historical employee name/profile version, branch-history ID and historical employee branch/name. Missing driver, pending mapping, missing/overlapping link/policy/branch, missing historical profile or inactive/out-of-employment profile at work time are explicit `unresolved` reasons. They are not zero-commission fallbacks. Today's deactivation/name change does not erase valid past attribution; later work with an inactive employee requires review. Current name or webhook arrival time never selects a historical rate.

P13 calls this in its source/visit transaction after source/aggregate/stock/wallet locks, before employee/money/effect writes. It must account for `employee` lock class key `0:company:<companyId>` in `UnitOfWork`, acquire the company guard before employee/driver/control resources, and use this same client. The coarse materialized company guard deliberately serializes employee terms/link acceptance for V1; it is a PostgreSQL row lock, not a process mutex or empty-row lock. It also prevents concurrent first-link ambiguity.

For an accepted, uniquely evidenced earning, call with `acceptWork:true` and persist the returned IDs/formula/name together with the source fact/earning in the same transaction. It advances employee/driver accepted-work date watermarks. Ordinary changes cannot begin on/before those dates or before command-time Cairo today. A late correction requiring financial history changes goes to reviewed adjustment. P13 owns unique visit identity, actual-arrival eligibility, replay/revision handling and the originating shipment **work branch** snapshot; the employee's HR branch returned here must not replace that commission work branch.

`commissionPerVisit(baseMinor, commissionTerms, kind='actual_visit')` uses checked piastres and integer basis points, half-up per visit before summing. Base5000 at1000bp →500; fixed700 →700. Uplift500, brand payment, and replacement waiver do not enter this function. Assignment/preparation/internal-transfer kinds return0; this helper does not deduplicate actual visits or create earnings. P13 must reject/hold unresolved attribution and deduplicate source identities, not treat retries as visits.

## P20 shared payroll guard

```ts
guardEditablePayrollPeriod(
  tx: TransactionClient, companyId: string, employeeId: string, month: string,
): Promise<{ state: PayrollState; version: number; month: string; currentMonth: string }>
```

The month is `YYYY-MM`. `lockPayrollControl(tx,company,employee,month)` safely upserts the unique `(company,employee,month)` row and takes `FOR UPDATE`. Its states are `editable_unpaid`, `frozen_unpaid`, `paid`, `zero_net_closed`. The exported edit guard reads database clock time **after** lock acquisition and rejects past months even if no period previously existed; frozen/paid/closed reject regardless of unpaid status. P08 rechecks after its barrier and before policy insertion. A rejected command's savepoint can roll back newly materialized rows; absence still never authorizes a past edit.

P20 authorizes its own payroll scope, locks resources in P03 order, materializes/locks this exact control row, reads salary policy and source versions, then commits freeze/snapshot/status with the same transaction. It must not make a separate payroll lock/table or snapshot before acquiring the row. If P08 holds it first, its full-month salary revision commits before P20 reads; if freeze holds it first, P08's edit rejects. Both orders are real independent PostgreSQL transactions in the P08 suite. Paid/zero closure transitions cannot reopen the period; version increments are constrained. P20 owns earning snapshots, obligation reservations, allocations, actual payout and zero-net closure.

Salary policies are a separate axis with month-start boundaries and half-open intervals. A current full-month correction supersedes the old row while retaining it; future scheduling splits intervals without erasing earlier values. There is no day proration. P20 resolves the exact unsuperseded salary policy for the month and snapshots its ID/value and the appropriate historical employee branch. For a first midmonth employment, branch selection begins at the employment start rather than inventing a pre-employment branch. Manual deductions, bonus/overtime, advances and earning-cost classification remain P20/P18-owned: salary6000 - earning deduction200 - advance recovery1000 gives cash4800 and cost5800; this phase posts neither.

## Commands, scope and recovery

All commands use family `employees.profile`, P03 canonical identity/digest/result/audit and P02 current `employees` screen grant. Expected employee version governs edits. Outcomes are immutable in `employees.command_outcome`, and remain recoverable after transport-result compaction. Resource scope is reauthorized on new requests and recovered commands. The complete employee detail/history requires assignments for **all recorded employee branches**, including superseded same-day histories; otherwise the profile is denied/omitted. Tracking's company-wide grant cannot expose HR finance. A reassignment needs current and destination branch authority and a reasoned dated revision; current-day changes preserve accepted work through the shared guard.

Native routes: list/create `/api/v1/employees`, catalog, detail/profile/deactivation `/{id}`, `/{id}/terms/preview`, `/{id}/terms`, `/{id}/driver-links`, and `commands/{commandId}?companyId=...`. HTTP uses closed schemas, origin/CSRF, UUID validation, allowed filters and no forged authority headers. UI preserves an unknown intent in sessionStorage keyed by principal/company/form, restores its fields on reload, blocks another save, reauthorizes lookup and resends the exact same intent only after an authorized404. It never generates a replacement identity for an unknown result.

## Migration and future ownership

`0012_p08_employee_terms.sql` is additive after the actual P07 registry. `0008` is already P04 and was not renamed or edited. Employee identity references its one `kernel.resource` family employee; setup creates no journal effect. Profile/name/contact/schedule versions, effective branch/policy/link rows and command outcomes retain history. Original profile revisions and outcomes cannot update/delete; interval inputs cannot change, only bounded closure/supersession. Referenced employees/drivers deactivate; no hard deletion.

Deterministic contract/formula fixtures are in [fixtures.json](fixtures.json); committed native test IDs, historical resolution/lock results and captures are in this directory. P11 owns external mapping; P13 owns visits/earnings; P18 owns incidents/obligations/waivers; P20 owns advances, calculations and payments. P08 stops at setup/preview/history/guards.
