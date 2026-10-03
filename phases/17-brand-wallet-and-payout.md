# P17 — Shared brand wallet, shipping cover and payout

Status: standalone implementation prompt under approved PLAN-001, ERP-D-205 / ERP-R-214. Implement this phase only when selected. It extends the existing wallet primitive; it must not create a second balance model.

## 1. Goal and bounded result

Give finance a clear shared company-level brand statement, eligible-dues/calendar/history page and real full/partial payout operation. The interface separates signed entitlement, pending driver-held proceeds, known holds, shipping cover, available payout and paid history. A brand can be paid at any authorized paying branch/account; simultaneous branches cannot spend the same credit.

Own UI-BRAND-PAYOUT-001 and the wallet views required by REP-08/09/10. Reuse P03/P04 wallet records, P12 shipping-cover reservations, P13 typed fees/pending goods and P16 actual-remittance eligibility. Expose the stable typed credit interface for P18 compensation, but do not implement incident confirmation here. Do not add a brand portal, provider API, automatic cash sweep, storage-wallet offset or editable balance box.

## 2. Recommended execution setting

Use **gpt-6-astra / xhigh** for competing wallet/account allocations, scoped financial holds and correction-sensitive history. [MODEL-GUIDANCE.md](MODEL-GUIDANCE.md) records local availability and official checks dated2026-10-03. The owner chooses the model/effort in Codex; this prompt does not switch it. Record actual settings and preserve all tests if an alternative is required.

## 3. Reading and verified prerequisites

Read [EXECUTION-CONTRACT.md](EXECUTION-CONTRACT.md); [master-plan.md](../master-plan.md) Brand entitlement and payout, Identity and authorization, Data and transactions; [ERP-DOMAIN-SPEC.md](../docs/planning/ERP-DOMAIN-SPEC.md) sections8–10/14/15; [ERP-DATA-AND-TRANSACTIONS.md](../docs/planning/ERP-DATA-AND-TRANSACTIONS.md) sections5.1–5.4/7–9; [ERP-SCREEN-SPEC.md](../docs/planning/ERP-SCREEN-SPEC.md) brand payout, financial forms, filters and shared interaction; [ERP-TAWSEL-INTEGRATION-PLAN.md](../ERP-TAWSEL-INTEGRATION-PLAN.md) sections12–14; and [ERP-REPORT-CATALOG.md](../ERP-REPORT-CATALOG.md) REP-08/09/10. Preserve UI-REV-001 from UI-REVIEW-LOG.md.

Inspect actual P03/P04/P09/P12/P13/P16 outputs and execution records. Run relevant phase suites and migration status. Verify exactly one wallet per company brand, lockable lot/cover primitives, source-unique fee/goods postings, effective revision/gap holds, full remittance release and permitted funded accounts. P12 must already reserve/consume/release known brand-paid shipping cover; P17 tests and exposes that same service rather than deferring it until after dispatch.

A missing adapter can be repaired within scope and recorded. Missing actual remittance or wallet identities is a material dependency, not a reason to replace it with arbitrary eligible fixture balances in the product. Use controlled source fixtures only to isolate a stated native test; separately verify the real P16 journey.

## 4. Requirements and rules

Own ERP-R-034/035/039/041/055/056/106/114/146/169/170/209 and their acceptance cases. Decisions: ERP-D-033/034/040/054/055/064/074/089/099/108/137/160/161/174/200. Consume ERP-R-013/051/064/075/091/103/123/126/151/153/154/155/183/208.

One company brand has one wallet across branches. Movements retain business-source branches; the paying branch/account is independent. Screen access grants the shared permitted brand total with branch detail, not all account histories, HR or reports. Funding account authorization and funds remain mandatory.

The commercial wallet is not company cash. Ordinary goods250 plus recipient shipping50 produces goods credit250 and no second shipping deduction. Before full remittance it is pending; afterward it is eligible. Goods already paid to the brand create no new goods credit. A zero-recipient-due shipment cannot wait for imaginary cash. Confirmed compensation is independently eligible through its typed source; recovery from an employee does not delay it.

Use the approved lot model: signed entitlement equals remaining eligible plus pending positive credits minus unallocated posted debits. Eligible-to-pay is max(0, eligible remaining credits minus unallocated debits, affected eligible holds and active shipping cover). Credits already allocated to payout/offset are not subtracted again. Allocate eligible debits/payouts by oldest eligible effective date, then movement ID, retaining exact source/branch links.

For no-negative brands, existing debt blocks new handover. Reserve only the known brand-paid shipping portion from eligible cash-backed credit; pending recipient money and separate storage credit cannot supply it. Eligible100 with cover50 leaves50 for payout. Payout, cover creation, cover consumption and fee application serialize on the same wallet. Actual incurred unexpected fees remain recorded even if they create debt; no remote driver stop follows.

Payout may be any positive amount no greater than eligible funds and account availability. Partial brand payout is approved; partial salary/remittance rules do not apply here. Agreed weekdays organize work; off-day payout requires a reason. Cash/Bank deposit/InstaPay and optional reference are supported; no images/provider verification. Never fake a payout or cash reversal to correct a browser timeout. Known source gaps hold affected eligibility only; a correction conflicting with posted money creates linked review, preserving the paid record.

## 5. Data, server, interface and migrations

Extend existing wallet/credit/hold/cover tables only where necessary. Add brand_payout and immutable payout_allocation with source-credit amounts, paying branch/account/method, actual/recorded dates, optional reference, off-day reason and source posting links. Unique command and source keys protect retries; company/brand/account relationships must remain scoped. Backfill no legacy unknown credit as eligible by default. Prove migrated wallet projections reconcile to source lots.

Implement apps/api/src/modules/finance/brand-wallet and brand-payouts using P03 UnitOfWork and P09 AccountFundsService. Define a stable WalletService interface for signed/readiness summaries, locked eligibility, source-unique typed credit/debit, hold management, cover and payout allocations. Application services must join one transaction with account debit, payout, allocations, audit and result. The source producer determines eligibility class; an ordinary UI cannot set eligible=true.

Write packages/contracts/src/finance/brand-wallet and brand-payouts closed schemas before handlers. Provide statement/dues/calendar/history/detail, payout preview and confirm with commandId, expected wallet revision/source readiness, amountMinor, paying branch/account, method/date/reference and required off-day reason. The client cannot submit authoritative eligibility or hide a hold. Queries paginate immutable history with stable ordering and authorize detail/recovery again.

Build the focused brand payout page with local dues/history views, source drill-down and separate primary payout form. Clearly label pending, held, reserved cover and payable rather than one attractive but misleading balance. Show shortage/source-wait reasons and the next valid action. Preserve filters by brand/period, source-versus-paying branch, method/type/reference and actual-date basis. Arabic RTL, mobile dialogs, error focus and the approved shell are mandatory.

## 6. Checkpoints and validation

1. Inspect source/lot/cover interfaces and settle one reconciliation formula against actual records. Vitest cases cover normal300/250 accounting, prepaid zero goods, pending credit with debt, held credit and partial allocations. Reject a double shipping debit and double subtraction of an already consumed lot.
2. Implement migrations and statement/readiness queries. Test empty wallets, only-pending funds, independent eligible compensation source and cross-branch totals. Immutable history must explain the displayed totals to the piastre.
3. Implement payout transaction and oldest-eligible allocations. Inject failure after allocation, account debit, payout and result steps. Race two branches paying one wallet and payout versus P12 cover reservation with real PostgreSQL independent connections and committed evidence, including rollback and restart recovery. Test both commit orders and account lock ordering.
4. Verify live P16 release and P13 correction hooks. A stale preview fails or reopens review without losing entered intent; a later accepted correction creates scoped hold/review while retaining original payout. A source replay with another transport identity produces no extra credit.
5. Build browser flows for scheduled/off-day partial payout, insufficient funds, held credit, zero due, cancelled form, revoked grant, unknown result and repeated submit. Non-optimistic success must follow the committed server response. No offline business write queue.
6. Register npm run test:phase -- P17; run important Vitest, real database, public integration consumers where applicable and browser suites plus lint/typecheck/build. Report fixture-only versus real-source coverage separately.

## 7. Acceptance matrix

| Case | Expected result |
| --- | --- |
| P17-A01 normal goods250/shipping50 | Pending250 before full receipt, eligible250 afterward; payout100 leaves150 and debits paying account100. |
| P17-A02 eligible300, simultaneous payouts200 from two branches | One succeeds; the other sees100 and fails; no negative eligibility or duplicate payment. |
| P17-A03 eligible100, shipping cover50 | Payable50; payout60 fails; payout50 succeeds and leaves cover50 intact. |
| P17-A04 pending250 and brand debit50 | Signed entitlement200, payable0; after actual full remittance payable200. |
| P17-A05 off-day payout | Missing reason fails; valid reason does not bypass funds or source holds. |
| P17-A06 eligible compensation400 | Eligible through its confirmed typed source independently of recovery; actual incident UI integration belongs to P18. |
| P17-A07 source correction after payout | Original payout unchanged, one review/affected hold; unrelated eligible sources remain usable where safe. |
| P17-A08 timeout/restart/revoked scope | Original result persists; current unauthorized actor cannot recover its sensitive details. |

## 8. Manual trial

Use an isolated company with branchesA/B, one shared brand, A Cash1000, B Cash1000 and Company Test Bank0. Use the real P13/P16 test journey to generate goods250 plus shipping50 and remit300 into Company Test Bank. That separate receiving account now has300; A/B Cash remain1000 each before payouts. Inspect the brand once from each permitted payout user: both show the same eligible250 with source branch detail.

Pay100 from B Cash on an agreed day. Expect brand150, B Cash900, A Cash unchanged by that payout, and one linked statement movement. On an off-day attempt, omit the reason and observe rejection, then provide the reason and pay50: brand100, B Cash850. Reserve50 known brand-paid shipping through the real P12 service; payable becomes50. Attempt payout60 and observe no debit. Pay50 from A Cash: brand eligible credit50 is fully encumbered by cover and payable0; A Cash950.

Reload/retry the last command and verify no extra payment. Show pending goods separately using another unremitted order. Inspect mobile history, source links and consistent balances across branches. Use independent automated connections for the exact concurrent race; do not claim manually clicking fast proves concurrency.

## 9. Deliverables and stop

Deliver migrations, closed contracts, one shared WalletService/payout implementation, actual screens, source-link histories, tests and docs/verification/P17 evidence. Document typed compensation credit consumed by P18, adjustment hooks for P21 and statement queries for P23. Update phases/execution/P17.md, catalog and IMPLEMENTATION-STATUS.md with actual model, commands, results, failures and unresolved external checks.

Complete this phase's outcomes and stop. Do not implement incidents, storage, payroll or adjustments next; do not change Tawsel, send real payments, deploy, publish, purchase or merge automatically.




## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-012`, `ERP-R-013`, `ERP-R-035`, `ERP-R-039`, `ERP-R-041`, `ERP-R-051`, `ERP-R-055`, `ERP-R-056`, `ERP-R-064`, `ERP-R-075`, `ERP-R-091`, `ERP-R-103`, `ERP-R-106`, `ERP-R-114`, `ERP-R-123`, `ERP-R-130`, `ERP-R-146`, `ERP-R-153`, `ERP-R-169`, `ERP-R-170`, `ERP-R-183`, `ERP-R-208`, `ERP-R-209`.

Decisions: `ERP-D-008`, `ERP-D-023`, `ERP-D-026`, `ERP-D-034`, `ERP-D-038`, `ERP-D-040`, `ERP-D-049`, `ERP-D-053`, `ERP-D-054`, `ERP-D-055`, `ERP-D-064`, `ERP-D-074`, `ERP-D-075`, `ERP-D-089`, `ERP-D-099`, `ERP-D-101`, `ERP-D-108`, `ERP-D-117`, `ERP-D-119`, `ERP-D-122`, `ERP-D-137`, `ERP-D-138`, `ERP-D-144`, `ERP-D-160`, `ERP-D-161`, `ERP-D-174`, `ERP-D-199`, `ERP-D-200`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
