# P17 bounded traceability

2026-10-06. Native local slices only. Evidence: real PostgreSQL 18.6 (isolated Docker clusters), real API/HTTP processes and jsdom script tests. Playwright browser tests were **skipped by owner instruction** ("skip browser test, just scripts test"); no viewport captures exist. Owner manual review and the P16-owned independent Tawsel witness (IP-GAP-004) remain unexecuted. No whole cross-domain requirement is marked complete by this file.

| Requirement / acceptance | Native contribution and evidence | Remaining owner |
| --- | --- | --- |
| R012 | Payout history, lot states and statement keep recipient money, driver-held pending credit, company receipt and brand payout as distinct sources/links (statement `remittance`/`shipment`/`payout` links). | Custody/tracking slices remain with P13–P15. |
| R013, R039 | Payout is a separate transaction after full remittance; A01 rejects payout of pending 250, pays only after the real P16 receipt. Arabic business term تحصيل used for brand payout; driver remittance/recipient payment labels unchanged. | P23 reports/exports. |
| R035, R056, R130 | Cash/Bank deposit/InstaPay with method/account type check, optional reference (blank allowed, printable, ≤120), no images/provider API; A05, contract and HTTP tests. | — |
| R041, R146 | Agreed weekdays from brand policy, Cairo weekday of the actual date, off-day reason required and rejected when not applicable; reason cannot bypass funds or holds (A05, trial). Partial payout carries the remainder (A01, trial). | — |
| R051, R064 | Goods 250 + shipping 50 → credit 250 and no second shipping debit (unit + A01); prepaid-all → zero goods credit and one brand debit (unit); A04 real refused-visit debit. | P18/P21 other payer/correction slices. |
| R055 | Pending goods cannot fund a payout; after full remittance they become payable; partial/off-day/shared payout implemented (A01, A04, trial). | P18 compensation producer; owner manual trial. |
| R075, R091, R209 | No-negative brand: payout and real P12 cover reservation serialize on the wallet row; cover reduces payable once (A03); both commit orders with independent connections (cover race). | Independent Tawsel handover acceptance stays P12-owned. |
| R103 | Typed `postCompensation` producer posts an immediately eligible lot independent of employee recovery; source-unique (A06). | P18 incident confirmation UI/workflow. |
| R106, R114 | Combined dues/calendar/history page (REP-09/10) and statement (REP-08) with signed movements, running balance, opening/closing, source vs paying branch; statement reconciles to the lot model (A01, query test, trial). | P23 export/print parity. |
| R123 | Account funds checked under the money lock; payout vs P09 withdrawal for the last funds cannot overdraw (account race); insufficient funds rejected without wallet/cash effect (A05). | — |
| R153 | Unknown result keeps one command identity; same-ID replay/recovery after process death (A08); browser-equivalent recovery and no duplicate on double click (ui script tests). No offline write queue. | Owner device check. |
| R169, R170 | One company-level wallet with branch-tagged movements; any assigned paying branch; two branches cannot spend the same credit (A02 both orders); branch breakdown sums to totals. | — |
| R183 | Accepted correction after payout: original payout unchanged, one linked review and affected hold; unrelated credit usable; stale preview fails with WALLET_CHANGED (A07). | P21 resolution; P22 orchestration. |
| R208 | Frequent filters + advanced filters (desktop panel / phone dialog) for dues, history (brand, paying/source branch, method, date basis, reference, off-day) and statement (period, kind, basis); empty state with reset. | P23 export parity. |
| R012/R013 public witness | Not claimed. | P16 IP-GAP-004. |

Decision coverage:

- D008/D023/D026: no money or eligibility is inferred from transport; payout consumes only released/typed eligible lots.
- D034/D038/D053/D054/D055: methods, tahseel term, actual-remittance eligibility, partial payout, optional reference without images.
- D040/D137: weekdays from P04 policy; off-day reason with unchanged funds/eligibility checks.
- D049/D064/D075: goods credited once; prepaid/zero-due cases create no fictitious remittance wait; recipient outstanding vs brand liability retained.
- D089/D099/D119: compensation independently eligible via typed producer (P18 consumes).
- D101/D108/D117/D122: shared wallet, branch provenance, paying branch independent of source branch.
- D138/D144: full remittance prerequisite consumed from P16; online-only commands with recovery.
- D160/D161: one company wallet; payout screen shows the shared total with branch detail; funding authority still applies.
- D174/D199: post-payment correction review/hold without rewriting payouts; focused filters, no saved-filter engine.
- D200: cover encumbrance subtracted once; payout and cover serialize.
