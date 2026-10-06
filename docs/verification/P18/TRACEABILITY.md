# P18 bounded traceability

Updated2026-10-07. Native evidence uses real PostgreSQL18.6/HTTP and jsdom scripts; controlled P12–P14 fixtures remain explicitly narrower than public conformance. The registered public gate now passes against the actual owner-approved pilot with a dedicated source, real issuer driver, independent native DB and signed projection ([30](30-live-native-journey.json), [35](35-phase-scripts.txt), [36](36-live-driver-and-delivery-evidence.json)). Browser reruns exempted by owner; prior browser evidence remains historical and manual device review unrun. Later-owned slices remain incomplete.

Final native regression [50](50-final-regression-database.txt) passed301 cases, including18 P18 DB/HTTP cases. The added dismissal cases preserve immutable hold history, release only dismissed holds, keep another active incident blocking, and require a new command after the original retained rejection. The public witness predates this native-only correction; its adapter/mapping and confirmed incident state are unchanged.

## Acceptance cases

| ID | Evidence | Status |
| --- | --- | --- |
| P18-AC-01 | `incidents.db` AC-01/02 (counts unchanged after report), `custody.db` stock hold, browser journey (counts unchanged after partial and full reports). | Local pass |
| P18-AC-02 | `incidents.db` AC-01/02: effects brand compensation 400, employee obligation 200, operating cost −400, employee compensation share 200, one eligible lot, zero money movements; browser counts +4 effects/+1 lot/+1 obligation/0 cash. | Local pass |
| P18-AC-03 | `incidents.db` AC-03 (goods due 0, agreed 400, corrected responsible branch snapshotted); UI has no intake valuation field (`ui.unit` partial case). | Local pass |
| P18-AC-04 | `incidents.db` 399 shares, frozen period, wrong scope, claimed subset and injected failure after wallet posting (full rollback); `ui.unit` and browser protected period → allowed month. | Local pass |
| P18-AC-05 | `incidents.db` AC-05 (concurrent reports on independent connections → one winner; lost confirm response recovers the original once); browser dropped response → "check result" → one confirmation. | Local pass |
| P18-AC-06 | `replacement.db` AC-06/07 (price goods 250/recipient shipping 0/brand 0/waiver 50/total 250; snapshot `shippingDue` 0, goods `unitDue` 25000; real P13 projection posts fee + waiver + commission, no brand shipping debit); browser review dialog. Actual public intake/full outcomes preserve goods250/0 and shipping0; signed native visits post fee/waiver/commission once ([30](30-live-native-journey.json), [35](35-phase-scripts.txt), [36](36-live-driver-and-delivery-evidence.json)). | Native and bounded public pass |
| P18-AC-07 | `replacement.db` (event replay and replacement resubmission after lost response create no second earning or reference; creation earns nothing); browser creation adds no effects. Actual public arrival/outcome/source replays and native form resubmission retain the original effects/reference ([30](30-live-native-journey.json), [36](36-live-driver-and-delivery-evidence.json)). | Native and bounded public pass |
| P18-AC-08 | `incidents.db` AC-08 (exact P14 disposition queued durably, no receipt/available stock) and unavailable-operation follow-up; confirmed page shows financial confirmation separately from pending disposition. Actual documented damage disposition accepted under the dedicated source and replayed exactly ([30](30-live-native-journey.json), [35](35-phase-scripts.txt)). | Native and bounded public pass |
| P18-AC-09 | Contract rejects `payer: employee`; `incidents.db` AC-09 (immutable history, review + hold); `payout.db` (paid compensation keeps history, review holds only the unpaid remainder). | Local pass |
| IP-AC-22 | `tawsel.public.test.ts` passed with actual private source/trial files; canonical histories preserve goods/shipping, bad snapshots rejected, accepted disposition and exact replays. [35](35-phase-scripts.txt). | Bounded public pass |

## Requirements

| Requirement | Native contribution and evidence | Remaining owner |
| --- | --- | --- |
| R055 | Compensation is eligible immediately and payable through P17 before employee recovery (`payout.db`); driver-held proceeds rules unchanged. | — |
| R060, R203 | Company-funded replacement visit posts standard fee plus equal waiver and normal commission once (`replacement.db`); ordinary visits unchanged. | — (bounded public visit evidence now passed). |
| R065 | Waiver keeps base/uplift/tariff; commission basis unchanged (`replacement.db`, price summary). | — |
| R097, R102 | Warehouse loss is company-only; compensation = affected goods value only, partial subsets by piece range (`incidents.db`, `custody.db`, browser partial report). | — |
| R098, R105 | Explicit 200/200 split creates one typed linked employee obligation in an allowed unpaid/future period; no cash repayment. | P20 recovery and carry. |
| R103 | One eligible lot via `postCompensation` at confirmation (`incidents.db`, `payout.db`). | — |
| R104, R116 | Agreed amount entered at confirmation; zero recipient due does not block 400 compensation; no intake valuation field. | — |
| R107, R108 | Replacement uses ordinary intake with a new numeric reference, visible incident link and recipient/brand/company payer choice (browser, `replacement.db`). | — (bounded public dispatch now passed). |
| R109 | No found-after-compensation workflow; history retained, review routes to P21. | — |
| R110 | Report and confirmation are separate commands; duplicate/double click cannot confirm twice (`incidents.db`, `ui.unit`, browser). | — |
| R134 | Reports select the exact shipment line, stock movement or transfer line; custody facts are held, never deleted. | — |
| R152, R211 | Compensation cost and employee compensation share are typed operating facts at the incident branch; the obligation is classified `incident_compensation` for P20. | P20 recovery, P24 profit. |
| R190, R197 | Transfer-line loss uses actual driver custody/source branch, blocks receipt of held units and preserves the uncompensated remainder (`custody.db`). | — |
| R208 | List filters: state/branch frequent; brand, kind, employee, date basis and range advanced; reset and empty state. | P23 export parity. |
| R212 | Goods 250 + shipping 50 waived → recipient total 250, brand shipping 0, net shipping 0, normal commission. | — (bounded IP-AC-22 now passed). |

## Decision coverage

- D095/D098/D099/D100/D101/D102/D103/D104/D105: report vs explicit confirmation, warehouse/company and split responsibility, immediate eligibility, affected value only, typed employee obligation.
- D110/D119/D131: agreed amount at confirmation, no compulsory valuation, deterministic incident-branch attribution (P-DOM-07) snapshotted separately from payroll and paying branches.
- D168/D194/D202/D203: company-funded waiver as the bounded exception; no employee-funded payer.
- D053/D054/D059/D066/D069/D070/D071/D076/D125/D138/D143/D161/D172/D181/D188/D190/D199/D201: consumed through existing P06/P12–P17 behavior (ordinary intake, visit fees, custody, wallet, filters); P18 adds only the incident/waiver slices above.
