# Tawsel driver-report correction review

Initial review: 2026-10-02, session 015. Policy update: 2026-10-03, session 017. Status: verified contract clarification; ERP-D-174 / ERP-R-183 now resolve ERP-Q-143 with durable retry, affected-amount holds for known gaps and Settlements review for differences affecting posted money.

Canonical baseline: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`, extracted `2026-09-25T08:22:32.982Z`. This review does not change the baseline, approve a new API, or define implementation phases.

## Why this review was needed

The owner challenged the earlier question about a Tawsel correction after an ERP payout. The phrase "financial correction" blurred two different responsibilities. Tawsel can correct a driver's reported delivery outcome and associated reported recipient-payment facts. ERP treasury movements, actual driver remittance, brand payouts, payroll, refunds and commercial adjustments remain ERP responsibilities. A Tawsel report is not an instruction to rewrite those records.

The original owner request asked for contract verification, not approval of an ERP financial policy. ERP-Q-143 therefore remained open in sessions 015-016. The owner explicitly accepted the clarified queue/recovery recommendation in session 017; the resulting policy is recorded below. The existing full-remittance rule is not replaced with partial-remittance allocation.

## Verified current contract

`contracts/corrections.schema.json` describes an appended effective report revision. Its description explicitly distinguishes corrected reported monetary facts from refund or settlement instructions. Source prices are immutable, and there is no staff execution override. Received, disposed or redispatched pieces and closed workdays cannot be undone through this correction operation.

`outcome.correct` is a human company/personal session operation requiring `correction.own`, CSRF and the applicable device context. It is not a `ProvisioningService` operation available to the ERP connector. ERP consumes the documented `outcome.corrected` event and permitted history/recovery interfaces; it must not impersonate a driver to submit a correction.

The replacement choices are `full`, `partial`, `refused` and `no-answer`. A correction requires `roundId`, `taskId`, `attemptId`, `expectedOutcomeRevision` and `replacement`. Partial replacement requires whole-piece quantities and `reportedCollection`. This is not a generic delete, void, price-edit or refund interface.

The record retains `correctionId`, `previousOutcomeId`, `previousRevision`, the new outcome, and evidence linkage when relevant. The event also carries `previousOutcome`. Availability can expose both `originalOutcome` and the latest `effectiveOutcome`; the former is not silently overwritten.

## Concrete accepted example

Fixture `p23-captured-outcome.corrected-0` keeps the same attempt, source revision and unit prices:

| Reported fact | Previous outcome, revision 1 | Corrected outcome, revision 2 |
| --- | --- | --- |
| Pieces delivered | 2 | 1 |
| Price per piece | EGP 100 | EGP 100 |
| Reported goods amount | EGP 200 | EGP 100 |
| Reported shipping amount | EGP 50 | EGP 50 |
| `collection.reported.amountMinor` | `25000` | `15000` |
| Held pieces requiring return | 1 | 2 |

This corrects the reported result from EGP 250 to EGP 150. It neither changes the unit price nor asserts that EGP 100 was refunded, remitted or recovered. The earlier outcome remains linked in the event. The subsequent adoption fixture records revision 3 with evidence identifiers.

The sender fixture `p25-outcome.corrected` independently demonstrates an emitted transition from `no-answer` with `collection.reported: null` to a partial outcome with two delivered pieces and EGP 250 reported. The event carries a recipient sequence and outcome revision. It does not establish that an ERP payout had already happened.

## Availability and rejection boundaries

Availability constraints include `closed-workday`, `dependent-receipt`, `dependent-redispatch`, `changed-assignment`, `changed-source`, `changed-attempt`, `not-current-owner`, `correction-not-authorized`, `outcome-required` and `claimed-handover`. A displayed replacement choice does not override `availability.allowed`.

Fixture `p23-receipt-denied-availability` explicitly returns `allowed: false` with `dependent-receipt`; its next steps are `view-history` and `erp-commercial-review`. `p30-correction-view-retained-original` retains this denial even while showing frozen replacement choices and the original outcome.

Rejection fixtures cover extra `unitDue`, fractional delivered quantities, a missing expected outcome revision, negative previous revision, and missing adoption receipt linkage. JSON Schema rejection coverage does not independently prove runtime arithmetic, authorization or concurrency behavior. The reference describes separate PostgreSQL tests; this review did not run them.

Outcome `Collection` separates `reported`, `goods`, `shipping`, `unpaidShipping` and `shippingStatus`. For `no-answer`, reported collection is `null`, shipping and unpaid shipping are zero, and shipping status is `not-attempted` for company work. Null is not evidence that money was received. ERP visit charges remain a separate commercial rule.

## Delivery and ERP consequences

A `202` pending action response is not acceptance. The connector must recover the documented final action status rather than assume success or manufacture another correction.

The receiver first durably stores a valid event, then applies the projection and its checkpoint atomically. Receipt and application remain distinct. Retries, replay and delayed application mean a committed report correction may reach ERP later. This does not mean Tawsel allows a new correction after its workday has closed, and the reviewed fixtures do not prove a correction-after-ERP-payout scenario.

ERP must preserve the corrected execution facts, event identity and report revision. Session 017 adopts the following policy under ERP-D-174 / ERP-R-183:

1. Retry failed delivery/application durably with the same identity and apply an accepted transition once. Do not turn a repeated event into another charge or financial movement.
2. While a known synchronization gap affects an amount, hold that amount's payout eligibility until the gap is resolved. This is scoped to the affected amount, not a company-wide payout freeze.
3. If an accepted correction affects money already posted, create a visible review item in Settlements. Preserve original remittance/payout records; an authorized linked resolution records the legitimate difference. Do not automatically refund, rewrite a paid record or alter protected payroll.

An empty queue does not prove that no unseen event exists. Durable event receipt is not projection application; current state is not proof of complete historical recovery. Exact hold identity, release/reconciliation conditions, adjustment transaction rules and acceptance scenarios remain detailed design work. No cross-system ACID, absolute financial-finality guarantee or new Tawsel operation is approved.

## Source and reading ledger

All line references below refer to the supplied planning pack at the unchanged baseline.

| Source | Reading scope relevant to this review |
| --- | --- |
| [01-TAWSEL-CURRENT-BASELINE.md](<C:/Users/7OSS/Desktop/projects/routing + erp/tawsel-routing/docs/erp/planning-pack/01-TAWSEL-CURRENT-BASELINE.md>) | Read in full by the discovery reviewer; existing system and baseline boundary. |
| [02-BUSINESS-BOUNDARY-AND-MAPPING.md](<C:/Users/7OSS/Desktop/projects/routing + erp/tawsel-routing/docs/erp/planning-pack/02-BUSINESS-BOUNDARY-AND-MAPPING.md>) | Read in full by the discovery reviewer; responsibility boundary and worked EGP 250 to EGP 150 example. |
| [03-CONNECTOR-AND-RECOVERY.md](<C:/Users/7OSS/Desktop/projects/routing + erp/tawsel-routing/docs/erp/planning-pack/03-CONNECTOR-AND-RECOVERY.md:75>) | Read in full by the discovery reviewer; lines 75-83 distinguish durable receipt from atomic application. |
| [04-CANONICAL-HTTP.md](<C:/Users/7OSS/Desktop/projects/routing + erp/tawsel-routing/docs/erp/planning-pack/04-CANONICAL-HTTP.md:4735>) | Operation index lines 86-93; correction operation 4735-4783; availability/action recovery 4833-4924; emitted-event index line 173 and event 8798-8806; task history 5676-5775; replay 408-492, including conflict/pagination/restart and expired-replay handling. Reviewed by the parallel HTTP reviewer. |
| [05-CANONICAL-SCHEMAS.md](<C:/Users/7OSS/Desktop/projects/routing + erp/tawsel-routing/docs/erp/planning-pack/05-CANONICAL-SCHEMAS.md:3289>) | Full schema index; complete corrections block 3289-3683; B2B Money/Line and initial SourceSnapshot 156-253; DeliveryAffordance 3940-4032; outcome definitions through Record and constraints 9533-10511. |
| [06-CANONICAL-EXAMPLES.md](<C:/Users/7OSS/Desktop/projects/routing + erp/tawsel-routing/docs/erp/planning-pack/06-CANONICAL-EXAMPLES.md:15780>) | Full fixture index; all six P23 rejection bodies 5291-5781; P23 correction/adoption/denied-availability examples 15724-16188; emitted correction 17660-17841; retained-original availability 19618 onward; fixture evidence limitations 7604-7608. Truncated combined output was reread in separate bounded reads. |

This is a focused canonical review. Unrelated schema/example bodies were not reread. No runtime tests, live API calls, deployment checks or source implementation edits were performed. No automatic repository monitoring or synchronization is claimed.

The session 017 addition reconciles an explicit owner decision with this existing source review. It does not claim a fresh execution of fixtures, a new full-pack reading or a baseline upgrade.
