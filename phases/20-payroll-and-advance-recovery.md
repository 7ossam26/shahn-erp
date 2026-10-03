# P20 — Monthly payroll, advances and one net salary payout

## Execute this phase only

Deliver the employee month screen with separate salary, visit commission, additions, deductions, advance recovery, incident recovery, carry and net. Staff can record an actual advance, review a complete monthly calculation, pay its full net once or close a zero-net month, and trace every recovery to its original obligation. Preserve past/paid calculations and historical work attribution. The result is simple HR with accountable money, not attendance, tax or a general payroll suite.

Authority: PLAN-001 approved through ERP-D-205 / ERP-R-214. Recommended setting: **gpt-6-astra, xhigh** for coupled earning/recovery/cash invariants, period protection and cross-branch source history. Availability was verified 2026-10-03 in [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md). The owner selects the actual model/effort manually.

## Read before edits

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md), [master-plan.md](../master-plan.md), current instructions and P08/P09/P13/P18 execution records. Required specifications:

- [Domain specification](../docs/planning/ERP-DOMAIN-SPEC.md), section 11, incident employee share, operating-profit classification, DOM-12/DOM-13/DOM-14/DOM-19/DOM-23 and P-DOM-03.
- [Data specification](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md), employee aggregates/state, section 6.1 formulas, advance/payroll transaction rows, global locking, immutable source identity and protected history.
- [Screen specification](../docs/planning/ERP-SCREEN-SPEC.md), UI-EMPLOYEE-001, UI-PAYROLL-001, UI-ADVANCE-001, employee/financial form distinctions and filters.
- [Report catalog](../ERP-REPORT-CATALOG.md), employee cost and REP-24/REP-25 retained inside HR. Read [UI brief](../UI-DESIGN-BRIEF.md), [review](../UI-REVIEW-LOG.md) and actual shared money/form components.

Requirements: ERP-R-058, ERP-R-065, ERP-R-066, ERP-R-079, ERP-R-080, ERP-R-081, ERP-R-084, ERP-R-085, ERP-R-086, ERP-R-087, ERP-R-088, ERP-R-089, ERP-R-090, ERP-R-105, ERP-R-126, ERP-R-140, ERP-R-176, ERP-R-177, ERP-R-200, ERP-R-211. Decisions: ERP-D-057, ERP-D-071, ERP-D-072, ERP-D-078, ERP-D-079, ERP-D-082, ERP-D-083, ERP-D-084, ERP-D-085, ERP-D-086, ERP-D-087, ERP-D-088, ERP-D-101, ERP-D-119, ERP-D-131, ERP-D-164, ERP-D-167, ERP-D-168, ERP-D-191, ERP-D-202. ERP-D-087 supersedes partial salary payout. ERP-D-088 supersedes separate-manual-repayment-only handling; recording an advance affects applicable payroll automatically through the original obligation.

## Observable prerequisites

P08 must supply effective employee/branch/driver terms, base-only commission resolution and the shared lockable employee-month guard. P13 supplies deduplicated actual-visit earning facts with source identity/revision, work time, base/rate/formula, employee and historical work branch. P18 supplies typed confirmed employee incident obligations and their already-recognized incident recovery classification. P03 supplies commands, audit, journal/source uniqueness and same-transaction services. P09 supplies permitted funding accounts, locked available funds and actual-money posting. P02 supplies employee/branch access.

Inspect these concrete artifacts and run real query/transaction tests. Confirm the 50 base + 5 packing at 10% commission source resolves to 5, not 5.50, and replay produces one earning. Confirm incident obligation 200 has one original identity and no cash receipt. Verify payout can join the same `UnitOfWork` as recoveries and freezing. A missing P13 real connector does not justify inventing delivered visits from assigned shipments; native salary work can proceed, but commissioned payroll acceptance remains explicitly blocked/unverified. Small shared exports may be repaired with recorded checks.

## Calculation contract

Employee payroll uses Cairo calendar months. Keep configured salary and each source category visible before the combined total. Workdays/hours/day off remain profile information; no attendance-derived money, automatic overtime or daily proration. Bonus and overtime are explicitly entered monetary additions. For a first/last partial month, start with the configured full salary and let staff enter the ordinary deduction they calculated; do not add a special month-salary override.

Commission comes from each actual eligible visit performed by the associated employee, independently of brand payment. It uses the term effective at work time, not webhook receipt or today's profile. Percentage uses base shipping only; fixed money applies per visit. Actual repeat visits can earn again, including different drivers; replay, transfer trips and routing assignment do not. P20 consumes P13's classified immutable earnings rather than recalculating all old work against current terms.

Use exact integer piastres and preserve these disjoint quantities:

```text
grossEarning = salary + commission + bonus + overtime + positiveEarningAdjustments
obligations = newAdvancesDue + newOrdinaryDeductions + newIncidentDeductions
              + priorCarriedUnrecoveredObligations
recoveryThisPeriod = min(grossEarning, obligations)
netPayable = grossEarning - recoveryThisPeriod
carryRemaining = obligations - recoveryThisPeriod
```

Each original obligation belongs in either new-period amounts or prior carry, never both. Recover in original effective-date, creation-time and ID order, capped by each outstanding balance. Store allocations referencing the original obligation; carry is its remaining balance, not a copied new deduction each month. A current editable preview is nonbinding and reserves nothing. Freezing an unpaid period creates committed recovery reservations against the original obligations; later periods exclude those reserved amounts. Full payout converts that period's reserved allocations to settled recovery; zero-net closure settles its allocations without cash. A recalculation/page refresh cannot recover an advance again.

Track `outstandingAmount`, `reservedForFrozenPeriods` and `availableForNewAllocation` distinctly. A frozen January salary of 6,000 less advance recovery 1,000 has net 5,000 even if it remains unpaid. Its 1,000 recovery reservation prevents February from deducting the same advance again; February salary 6,000 therefore remains 6,000 absent other obligations. Paying January later settles the reserved 1,000 once and pays its frozen 5,000. No advance repayment cash receipt exists. This reservation is an internal guarantee of the approved fixed unpaid calculation, not a second debt or another financial movement. A correction to a frozen reservation needs the linked adjustment/review policy, never silent reuse by a newer month.

Employee earning cost is a separate operating-result formula. Salary-earning deductions reduce cost; advances and advance recovery do not. Incident recovery is classified once through its source and must not also reduce salary cost or create a new gain on every recovery. Salary 6,000 minus earning deduction 200 minus advance recovery 1,000 gives cash payout 4,800 and employee cost 5,800. Salary 6,000/advance 1,000 alone gives final cash 5,000, with actual advance cash 1,000 and total cash 6,000. Do not count advance issuance as another salary expense.

Example of carry: earnings 3,000 and valid outstanding advance obligations 3,500 produce net zero, recovery 3,000 and remaining original obligation 500. Next month's earnings 3,000 produce net 2,500 absent other changes. That 500 is not a second earning-cost deduction or a new advance receipt. Incident share retains its responsible incident branch; fixed salary/manual employee cost retains historical employee branch; commission retains work branch; paying account may differ from all of them.

## Advances, additions and period protection

An advance is actual company money paid to an employee. Require positive amount, actual payment date, method (Cash/Bank deposit/InstaPay), permitted funded account, optional reference and an allowed current-unpaid/future recovery period. Commit account debit, advance record, original obligation and audit together. Account failure leaves no advance or debt. Recording a payroll recovery is **not** a cash receipt. Do not create a separate manual repayment process or partial salary installment UI to duplicate this model. If actual historic advance evidence is being entered now, preserve its date but select an allowed recovery period; never rewrite a protected calculation.

Manual bonus/overtime, ordinary earning deduction and allowed linked earning correction require amount, reason, effective/work basis and current-unpaid/future settlement period. Their source type controls cost treatment; a generic positive/negative number is insufficient. Use dedicated HR actions under the existing screen grant, not a new per-button role policy. P21 will provide the general adjustments page; P20 owns these bounded employee actions so payroll is usable without it.

Current unpaid calculations may change with permitted current salary corrections and valid earnings/obligations. Future policies/adjustments retain effective boundaries. Past months freeze on first processing after the Cairo month boundary; a current month freezes when its one payout/zero close commits. Reuse P08's period guard, not a competing lock table. Absence of a stored period row does not authorize editing a past month. Materialize it from the effective policy and available immutable sources, then freeze under the same guard before any attempted edit can proceed.

One positive net is paid **in full once**. The UI displays the server-calculated net as read-only; it cannot be reduced into an installment. Revalidate calculation/source digest, outstanding obligations and account funds under the same transaction immediately before payment. Create the frozen calculation, allocations/carry references, salary payout/account debit, audit and command result together. Zero net has an explicit close action with no account or fictitious payment component. A prior frozen unpaid month can be paid at its frozen amount using the actual payment date; it cannot be recalculated merely because payment is late.

Late/corrected old-work commission never silently reopens paid/past payroll. Preserve the historical rate and work date, create a source-linked review item, and allow an authorized explicit current-unpaid/future adjustment with its original work-period attribution. Display already posted earnings/recoveries and the proposed delta before approval. Unique source-revision resolution prevents the same late fact being settled twice. If a broader source conflict requires P21/P22 handling, keep the review visible and hold the affected unresolved calculation only; do not freeze every employee or invent a zero earning. Actual paid money remains paid until a legitimate linked correction records reality.

## Planned implementation slices

- `packages/database/migrations/0020_p20_payroll.sql`: extend P08 `payroll_period` control with calculation/version/digest/frozen state; employee earning/obligation relationships, recovery reservations and immutable settled allocations, advance and salary-payout/zero-close records. Reuse P03/P13/P18 typed sources. Add unique effective payout/employee-period, unique allocation source, same-company FKs, positive input checks and aggregate reserved-plus-settled caps enforced under locked originals. Existing profiles do not imply historical paid salaries or advances. Backfill only control metadata from actual evidence, with no invented cash.
- `packages/domain/src/employees/payroll-calculation.ts`: exact category formulas, deterministic capped allocation, carry, period guards and source classification. Explicitly distinguish net cash from earning cost.
- `packages/database/src/employees/payroll.repository.ts`: transaction-aware period/source/obligation locks and frozen snapshots. Document lock order with account repositories; use sorted employee/period/obligation/account IDs. Profile edit, incident confirmation, late-earning review and payout must share guards.
- `packages/contracts/src/employees/payroll/`: closed schemas/examples for `GET /api/v1/employees/{id}/months/{month}`, `POST /api/v1/employees/{id}/advances`, `POST /api/v1/employees/{id}/period-adjustments`, `POST /api/v1/employees/{id}/months/{month}/payout-preview`, `POST /api/v1/employees/{id}/months/{month}/payout`, and `POST /api/v1/employees/{id}/months/{month}/zero-close`. Add explicit late-source review resolution through a versioned HR route. Standard command identity and expected calculation/source version are required; reject arbitrary partial payout fields/amounts.
- `apps/api/src/modules/employees/`: orchestrate period reads/freezes, permitted adjustments, advance issue and actual net payout with P09 in one transaction. Export source-obligation acceptance and review interfaces rather than letting incident/integration modules update payroll tables ad hoc.
- `apps/web/src/features/employees/payroll/`: `/employees/:id/months/:month`, `/employees/:id/advances/new`, focused addition/deduction/review forms and immutable payment detail. Integrate HR movement/advance histories here; do not add separate REP-24/REP-25 report modules.

The month screen explains Salary, Commission, Additions, Earning deductions, Advance recovered, Incident recovered, Carry and Net with source links. Its primary action is Pay full net, Close zero net or View payment according to real state. Put Issue advance in a separate focused page; do not crowd the payout confirmation with profile controls. Show protected period and pending source review explicitly. Payment preview displays employee/month, complete net, method/account, available funds and actual date. A timeout says result unknown/checking, retaining command identity; it never offers an unqualified second Pay action. Online-only commands wait for connection.

Employee/month/branch filters are scope checked. Advanced filters include salary/commission mode, unpaid/paid/zero closed, carry, advance status, adjustment type and work versus posting date where shown. Source drill-down preserves filters and cannot expose another branch's HR through company-wide tracking. Use approved Arabic RTL tokens, sparse pages, mobile cards, accessible labels and exact readable EGP values.

## Ordered checkpoints

1. **Connected calculation and classification.** Write Vitest examples for 6,000/1,000, 6,000/200/1,000 and 3,000/3,500 carry, source replay and historical rate selection. Verify each visible subtotal and both cash/cost measures, not only the final net.
2. **Migration and actual advance.** Run fresh/upgrade migrations and real PostgreSQL issue/recovery tests. Fail after account debit before obligation insertion and assert full rollback. Recover a committed advance after lost response by the same command identity.
3. **Freeze/payout concurrency.** Race two full payouts, payout versus a current adjustment, profile correction versus freeze, and incident obligation versus payout using independent connections and controlled barriers. One consistent snapshot/payment survives; losing operations get a clear revised/protected result. Interrupt before commit and after commit to test both durability boundaries.
4. **Late facts and carry.** Freeze a prior month, apply a historical visit correction, create/approve a current linked adjustment and prove old payment unchanged. Close zero net, advance month and recover only the original remaining obligation once. Verify current editable previews reserve nothing; explicit past-period freezing reserves its exact recovery, and a newer month cannot reuse that claim while the older net remains unpaid.
5. **Actual browser and reconciliation.** Run salary/commission detail, advance, manual addition/deduction, positive payout, zero close, stale preview and unknown response journeys. Capture phone/desktop and long histories. Reconcile cash movements, obligations, allocation totals and profit source classes before declaring completion.
6. **Handoff.** Register P20 suites, run scoped checks/typecheck/lint/build and expose exact typed sources for P21/P23/P24 without implementing unrelated reporting or recovery pages.

## Required acceptance cases

| ID | Given / When | Then and evidence |
| --- | --- | --- |
| P20-AC-01 | Salary 6,000, actual advance 1,000, full payout. | Advance cash 1,000 plus salary cash 5,000, one recovery, salary cost 6,000; no repayment cash receipt. DOM-13. |
| P20-AC-02 | Salary 6,000, earning deduction 200, advance 1,000. | Net cash 4,800, employee cost 5,800, separate source categories. DOM-23. |
| P20-AC-03 | Earnings 3,000, advance obligations 3,500, close zero net then next month 3,000. | First recovery 3,000/carry 500/no payout; next net 2,500; original debt recovered once. DOM-14. |
| P20-AC-04 | Base 50/uplift 5 at 10%, two actual visits and a replay. | Two respective visit commissions of 5, no replay commission; historical employee/work branch retained. |
| P20-AC-05 | Employee incident share 200 previously recognized by P18, then recovered here. | Net reduces 200; no second incident gain or salary-cost reduction. DOM-12 classification. |
| P20-AC-06 | User attempts partial salary, past/paid edit or unsupported account. | Whole operation rejected; no payment, allocation or rewritten calculation. |
| P20-AC-07 | Concurrent payout requests with distinct commands and lost winner response. | One full actual debit/payout; original command recovers it, other sees already paid; no double recovery. |
| P20-AC-08 | Late old-work earning/correction arrives after paid month. | Old calculation/payment intact, review and explicit current/future linked adjustment; source resolution deduplicated. DOM-19. |
| P20-AC-09 | Prior frozen unpaid month is paid later, or current adjustment races freeze. | Frozen amount paid once; guard chooses one valid order, with no stale calculation silently paid. |
| P20-AC-10 | Insufficient funds or injected failure between allocation and cash commit. | No partial payout/freeze/recovery; original outstanding obligations remain correct. Real PostgreSQL rollback. |
| P20-AC-11 | January salary 6,000/advance 1,000 freezes unpaid, then February salary 6,000 is processed before January is paid. | January net stays 5,000 with reserved recovery 1,000; February does not deduct it again; later January payment settles its one reservation and pays 5,000. Independent DB race and manual evidence. |

Important Vitest behavior is required for every main rule. Real PostgreSQL with committed transactions and independent connections proves payout/carry/lock claims. Browser tests must use the actual API and capture Arabic desktop/mobile. Run `npm run test:phase -- P20`; log all commands, failures and unavailable prerequisites. Do not describe unexecuted canonical visit ingestion or browser tests as passed.

## Manual trial, deliverables and stop

In a safe test company use P08 employee salary 6,000, a funded allowed account and known P13 visit fixtures. Issue advance 1,000 through the actual form; inspect its cash movement and original obligation. Add ordinary earning deduction 200, inspect cash net 4,800/cost 5,800, then pay the complete net. Repeat the dropped-response request and verify one payout and recovery. Try to edit the paid month and to pay a smaller amount; both reject. For another employee enter valid advance 3,500 against earnings 3,000, close zero net and inspect carried original balance 500 in the next month's 2,500 net. Show a late prior-work commission review and source-linked adjustment without changing the old payment. Record actual fixture IDs, source periods and screenshots.

Deliver migration, services, schemas/examples, actual screens, tests and evidence under `docs/verification/P20/`. Update `phases/execution/P20.md`, implementation status and traceability with exact test commands/results, known limitations, skipped checks and P21/P24 interfaces. **Implement and verify P20 only, write its truthful handoff, and stop. Do not start general adjustments/reports, modify Tawsel, transfer real money, deploy, publish, purchase or merge automatically.**

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-058`, `ERP-R-066`, `ERP-R-079`, `ERP-R-080`, `ERP-R-081`, `ERP-R-082`, `ERP-R-083`, `ERP-R-084`, `ERP-R-085`, `ERP-R-087`, `ERP-R-088`, `ERP-R-089`, `ERP-R-090`, `ERP-R-098`, `ERP-R-105`, `ERP-R-106`, `ERP-R-114`, `ERP-R-123`, `ERP-R-130`, `ERP-R-140`, `ERP-R-152`, `ERP-R-173`, `ERP-R-176`, `ERP-R-189`, `ERP-R-200`, `ERP-R-203`, `ERP-R-208`, `ERP-R-211`, `ERP-R-212`.

Decisions: `ERP-D-057`, `ERP-D-071`, `ERP-D-072`, `ERP-D-078`, `ERP-D-079`, `ERP-D-080`, `ERP-D-081`, `ERP-D-082`, `ERP-D-083`, `ERP-D-084`, `ERP-D-085`, `ERP-D-086`, `ERP-D-087`, `ERP-D-088`, `ERP-D-095`, `ERP-D-101`, `ERP-D-103`, `ERP-D-108`, `ERP-D-117`, `ERP-D-119`, `ERP-D-122`, `ERP-D-131`, `ERP-D-143`, `ERP-D-164`, `ERP-D-167`, `ERP-D-172`, `ERP-D-180`, `ERP-D-190`, `ERP-D-191`, `ERP-D-194`, `ERP-D-199`, `ERP-D-201`, `ERP-D-202`, `ERP-D-203`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
