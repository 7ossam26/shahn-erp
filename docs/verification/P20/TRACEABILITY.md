# P20 bounded traceability

This file covers P20's implementation, consumption and exclusion slices of the assigned assertions in [the matrix](../../../REQUIREMENTS-TRACEABILITY.md). It does not mark a cross-domain requirement complete or replace earlier phases' independent public/human acceptance. Verification is within the owner's requested script scope; final browser reruns were expressly excluded. Evidence abbreviations are defined in [README](README.md); exact commands/results are in [the execution record](../../../phases/execution/P20.md).

## Requirements

| ID | P20 slice and evidence | Remaining boundary |
| --- | --- | --- |
| ERP-R-058 | Configured salary plus immutable eligible commission; original advance/deduction and full net — C/P/S/H. | P13 independent source acceptance retained. |
| ERP-R-066 | Native office staff need no driver mapping; commissioned work consumes the explicit P08/P13 association — P/S, P08 regression. | P13 public source boundary. |
| ERP-R-079 | Commission consumes actual eligible visit earning, not brand receipt — S/P13 regression. | P13 live source acceptance. |
| ERP-R-080 | Separate salary, commission, additions, earning deductions, advance/incident recovery, carry/net and cost — C/P/U, actual month screen. | Final browser/device review excluded/unrun. |
| ERP-R-081 | Explicit monetary bonus/overtime with reason/work basis/period — schemas/examples, P/U; profile hours cannot produce money. | General corrections belong to P21. |
| ERP-R-082 | Superseded behavior excluded: no partial salary amount in payout schema/form — C/H/U. | R089 governs. |
| ERP-R-083 | Superseded manual-only repayment excluded: actual advance automatically allocates from the original — C/P. | R090 governs. |
| ERP-R-084 | Zero floor, capped original allocation, 500 carry once; reservations are unavailable to newer periods — C/P. | — |
| ERP-R-085 | Past/paid snapshots protected; valid current/future correction and explicit late adjustment — P/S and SQL constraints. | P21 broad reversal/frozen reservation correction. |
| ERP-R-087 | Independently configured salary/commission consumed as exact terms; disabled components contribute zero; fixed and percentage supported by P08 resolver — C/S, P08 regression. | P08 owns profile configuration. |
| ERP-R-088 | Two visits earn twice, replay earns none; original performer/work branch preserved — S/P13 different-driver regression. | P13 independent source acceptance. |
| ERP-R-089 | Positive net in full once; actual early money is an advance — C/P/H/U, independent payout race. | Brand partial payout remains P17. |
| ERP-R-090 | Actual advance issuance plus net payout, automatic original recovery, no second salary cost/cash receipt — C/P. | — |
| ERP-R-098 | Consume confirmed original P18 employee share and agreed split without recomputing incident — S. | P18 owns incident valuation/confirmation. |
| ERP-R-105 | Same original incident obligation, ordinary period/carry allocation, no direct repayment module — S/P. | — |
| ERP-R-106 | Typed employee sources, work/posting dates, original balances, reservation/settlement history and immutable payment within HR — P/H/U and month UI. | Brand side P17; browser/device review excluded. |
| ERP-R-114 | REP-24/25 remain month/advance/adjustment histories in HR; no standalone reports introduced — routes/UI. | REP-09/10 brand side P17. |
| ERP-R-123 | P09 same-UoW funding locks and complete insufficient-funds rollback — P/H, P09 account race regression. | Other payment domains retain their slices. |
| ERP-R-130 | Closed Cash/Bank deposit/InstaPay methods, permitted account validation and recorded method/date/account — contracts, P/U and P09 method regression. | Provider automation excluded. |
| ERP-R-140 | Salary/manual cost retains employee historical branch; commission retains work branch; incident/paying branch remain distinct — S, immutable cost view, P08 historical branch regression. | P24 aggregation/report. |
| ERP-R-152 | Expose classified salary/commission/manual cost and separate actual cash; advances/recoveries never duplicate employee cost — C/P/S, `payroll_cost_source`. | P24 computes the complete profit formula. |
| ERP-R-173 | Cairo calendar payroll months and source work dates; no round splitting — C/P/S, shared Cairo guard. | P13/P23 daily reporting. |
| ERP-R-176 | Captured immutable effective rate; future change cannot reprice old earning; late current/future approval retains work date — S, P08 regression. | P13 live source acceptance. |
| ERP-R-189 | Transport generates no payroll commission; fixed salary remains configured — C, consumed P13 classification. | P15 transport. |
| ERP-R-200 | Full configured salary plus staff-entered ordinary deduction; closed schemas exclude override/proration/attendance — C/P/U. | — |
| ERP-R-203 | Consume base-only commission 5 against complete tariff 55, without recreating service revenue — S/P13 regression. | P13 earns tariff; P24 reports it. |
| ERP-R-208 | Employee month/state/carry/advance filters, source type/work versus posting date and retained detail scope — H, UI routing/source details. | Final browser review excluded; P23 export parity later. |
| ERP-R-211 | 6,000/200/1,000 => cash 4,800/cost 5,800; incident recoveries preserve cost and gain classification — C/P/S. | P24 profit report. |
| ERP-R-212 | Consume eligible normal commission despite P18 shipping waiver; payroll does not recreate waived service revenue — P13/P18 regression and source classification. | P18 replacement/public scope retained. |

The phase prompt additionally names ERP-R-065 (base-only commission: C/S), ERP-R-086 (profile schedules descriptive: C/schema and P08 regression), ERP-R-126 (linked history retention: S/immutable records, broad corrections P21) and ERP-R-177 (no payroll history deletion: M/SQL and P08 retained-history regression). These are bounded consumption/exclusion checks; phase ownership in the central matrix is unchanged.

## Decisions

| ID | P20 evidence or exclusion |
| --- | --- |
| ERP-D-057 | Salary/commission/advances/deductions consumed through explicit typed aggregates — C/P/S. |
| ERP-D-071 | Base 50 excluding uplift 5 yields commission 5 — C/S. |
| ERP-D-072 | Native simple HR uses P08 employees without Tawsel dependence for salary — P/H. |
| ERP-D-078 | Actual work earns commission independently of brand payment; subtotals visible — S/U. |
| ERP-D-079 | Explicit bonus/overtime monetary additions — schemas/examples, P/U. |
| ERP-D-080 | Historical partial salary excluded by closed schema/UI — C/H/U; D087 governs. |
| ERP-D-081 | Historical manual-only repayment excluded — P; D088 governs. |
| ERP-D-082 | Zero floor and remaining original carry — C/P. |
| ERP-D-083 | Past/paid immutable, permitted current/future correction — P/S/M. |
| ERP-D-084 | P08 schedules remain profile information; no attendance-derived pay — C/closed schemas. |
| ERP-D-085 | Independent salary/commission sections and effective percentage/fixed sources — P08 regression/C/S. |
| ERP-D-086 | Repeat visits earn, replay does not, original performer retained — S/P13 regression. |
| ERP-D-087 | Full positive net once, zero explicit closure, early cash as advance — P/H/U. |
| ERP-D-088 | 6,000 salary/1,000 advance => 5,000 payout; one original recovery — C/P. |
| ERP-D-095 | Consume one P18 agreed employee share, retain incident source — S. |
| ERP-D-101 | Incident original enters ordinary recovery and HR histories — S/P/UI. |
| ERP-D-103 | Consume commission on replacement without editing incident shipping choice — P18/P13 regressions; P18 owns waiver. |
| ERP-D-108 | HR movement/advance histories, no separate REP-24/25 report modules — routes/UI. |
| ERP-D-117 | Same-transaction available-funds protection, no partial side effects — P/P09 regression. |
| ERP-D-119 | Reasoned linked late approval preserves old work/payment — S; broader financial reversal remains P21. |
| ERP-D-122 | Cash/Bank deposit/InstaPay with permitted accounts — contracts/U/P09 regression. |
| ERP-D-131 | Historical salary/manual branch and commission work branch preserved — S/cost view/P08 regression. |
| ERP-D-143 | Employee cost input separate from advance/recovery cash; incident classification once — C/P/S, P24 interface. |
| ERP-D-164 | Cairo calendar month; consume work date without splitting trips — shared clock/C/P/S. |
| ERP-D-167 | Historical effective commission remains captured — S/P08 regression. |
| ERP-D-172 | Exclusion/consumption: payroll does not create storage revenue or change its agreement branch — distinct source classes; P19 owns storage. |
| ERP-D-180 | No extra transfer commission — C/P13 classification. |
| ERP-D-190 | Preserve commission's originating work branch, separate from payment/incident — S; visit revenue remains P13/P24. |
| ERP-D-191 | Full salary plus ordinary staff-calculated deduction for partial first/last month — C/P/U. |
| ERP-D-194 | Consume base-only commission against immutable complete visit tariff; no new visit fee — S/P13 regression. |
| ERP-D-199 | Sparse advanced employee/history filters and scope — H/UI; final browser review excluded. |
| ERP-D-201 | Exclusion: calendar payroll neither prorates nor reclassifies full period-start storage revenue — distinct payroll sources. |
| ERP-D-202 | Earning deductions reduce cost, advances do not, incident recovery once — C/P/S/cost view. |
| ERP-D-203 | Eligible normal commission retained under company-funded replacement waiver — consumed P13/P18 behavior. |

ERP-D-168, additionally named in the phase prompt, is consumed as retained business/audit history and deactivation protection (M/P08 regression); no live business history deletion was added. P-DOM-03 adopts original-obligation capped allocation/reservation semantics, verified by C/P and deferred SQL links. DOM-12/13/14/19/23 are covered by AC-05/01/03/08/02 respectively.

No general adjustments, unrelated reporting, deployment, Tawsel modification, external money transfer or subsequent phase is included.
