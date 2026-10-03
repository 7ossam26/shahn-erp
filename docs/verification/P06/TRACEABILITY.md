# P06 bounded traceability

P06 verifies external parcel intake, exact declared pricing, local preparation/correction/cancellation and branch custody monitoring. It consumes the P02/P03/P04/P05 interfaces; it does not complete multi-phase integration, stock, money, return, reporting or incident assertions. Exact assigned source assertions remain in the [requirements/decision matrix](../../../REQUIREMENTS-TRACEABILITY.md). [Acceptance cases and evidence](README.md#acceptance-evidence) link the real checks; [handoff](HANDOFF.md) states the downstream prerequisites.

| Assigned assertions | Bounded P06 contribution | Remaining owner |
| --- | --- | --- |
| R011/032/015/038; D012/031/035/037 | Manual brand waybill fields, independent inspection/comments, exact goods sum, one confirmed physical receipt | P07 stored stock; P11 instruction adapter |
| R023/172; D020/163 | One independent identity/reference/recipient/address with stable piece identities, no phone/address merge | P12 atomic source batch/50 remaining-stop capacity and split-assignment guard |
| R024/036/064/076; D021/049/064/075 | Whole-piece per-unit outstanding amounts, captured partial policy, exact recipient/brand shipping and300/305/50/0 cases, no original-sale/deposit accounting | P13 accepted partial results/price freeze, P14 remainder return, P17 financial credits/debits |
| R031/042/095; D030/041/058/093 | Actual external receipt once, cancellation retains physical branch custody and reason; obsolete ready-only exclusion not revived | P07 reservation release, P12 driver custody, P14 actual handback |
| R044/045; D043/044/100 | Deferred barcode/labels/Excel entry excluded; ordinary entry works with numeric references, no compulsory valuation | P23 selected report exports; P18 ordinary compensation |
| R047/048/072/077; D046/047/065/066/076/169 | One enabled ready/company-packed service, allowed default, captured fixed uplift as shipping component; packing not separately billed | P07 third service; later visit commission uses base |
| R053/054/182; D051/052/061/173 | Configured references, area match/override/fallback/zero, complete missing-price rejection; shared policy/tariff locks/reviewed revision conflict; old snapshots preserved | Reference administration consumed from P04; no live repricing |
| R094; D092 | Ready skips queue, company packing requires versioned explicit completion once | P07 stock preparation and P12 handover gate |
| R096; D094 | Numeric sequence/global uniqueness, optional brand reference, deliberate within-brand duplicate warning distinct from retry recovery | P11 source technical identities |
| R107; D102/203 | Ordinary new-shipment/physical confirmation interface available, with separate identity and no incident waiver inferred | P18 visible incident/original linkage, company waiver and normal driver commission |
| R127/131/208; D107/120/123/199 | Real Products/Parcels switch, branch-held records/age/history, search/advanced combined filters, query/back/reset/pagination; no count/freeze workflow | P13 journey/external custody, P21 adjustments, P23 reports/export parity |
| R157/158/159; D148/149/150 | Optional unverified location; assigned branch only; reasoned actual-location correction with immutable receipt; reviewed price/preparation/custody effects | P07 stock correction; P11 integrated source revision/cancel; P15 actual transfer |
| R174; D165 | Local intake/preparation independent of Tawsel connectivity; source-ready immutable native revision; honest local timeline | P11 durable pending/outage recovery, P12 acceptance/handover |
| R156/R033/R051/R053/R054 (shared consuming obligations) | Approved responsive Arabic shell, current capability/branch security, captured full tariff/goods entitlement basis; no earned fee/credit at intake | Whole financial and owner device scopes remain their owners |

All identifiers above use the ERP-R-/ERP-D- prefixes; the matrix retains each full stable ID and acceptance wording. All complete assignment IDs in the P06 prompt are covered here as implemented, consuming or exclusion slices. Superseded rules are retained as exclusion/replacement checks; later owners are not marked complete. Stable canonical line/phone/string/money constraints are consumed from retained sources without modifying Tawsel.

DOM-01/DOM-02/DOM-05 are verified only for native intake/packing/snapshots and no-financial-effect semantics. Departure, visits, refunds, goods entitlement realization and brand payout remain later-owned. Local Chromium and persisted authenticated fixture sessions do not certify customer issuer, physical device/assistive technology, owner review or production deployment.
