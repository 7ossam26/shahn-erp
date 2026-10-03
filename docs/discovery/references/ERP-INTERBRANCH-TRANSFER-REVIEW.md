# Inter-Branch Goods Transfer: Current Tawsel Boundary Review

Date: 2026-10-03, Africa/Cairo. Updated through discovery session 018.

Status: a verified reference review for discovery, not an implementation plan or a claim that Tawsel supports the new workflow. No runtime commands, schema tests, database tests or connector tests were run.

## Approved ERP scope and ownership

ERP-D-170 / ERP-R-179 add physical inter-branch goods transfers to V1 and supersede the exclusion in ERP-D-042 / ERP-R-043. The owner requests a dedicated screen, translated as **Transfer Shipment to Another Branch**. Staff select whole shipments or quantities from stored brand stock, assign an available driver, and destination-branch staff physically receive and confirm the goods.

ERP-D-175 / ERP-R-184 close ERP-Q-152: ERP staff assign the driver and record source handover; destination staff record actual receipt in ERP. No Tawsel transport task, driver screen or routing feature is selected. The historical conditional extension TAWSEL-CR-002 is therefore not selected. TAWSEL-CHECK-003 retains the separate compatibility review for an already published customer shipment that moves branches and its later customer dispatch.

ERP-D-176 allows one manifest with multiple whole shipments and loose stock quantities from different brands, for one source, destination and driver. ERP-D-178 requires physical source custody, usable unreserved stock, whole prepared shipments and a transfer reservation against competing dispatch/transfer. ERP-D-179 restricts sending to assigned source branches and receipt to assigned destination branches, while allowing any company destination. Multi-branch users use the union of their assigned branches with the same granted screen capabilities; this does not require two distinct employees. ERP-D-180 includes driver transport pay in salary. In session 018 the owner explicitly confirms that this internal movement has no brand charge. ERP-D-181 permits recording actual sound, damaged and missing quantities. ERP-D-182 permits pre-handover cancellation; after handover, goods remain in transit until actual destination receipt or actual return receipt.

ERP-D-184 / ERP-R-193 permit company drivers, listing source-branch drivers first. ERP-D-185 / ERP-R-194 allow an ERP transfer during a Tawsel customer-delivery round. Drivers known to be at the branch and without an active round receive display priority; others' round status and evidence freshness remain visible. ERP-D-186 / ERP-R-195 approve transfer of eligible actually returned whole shipments and subsequent customer dispatch from the destination, preserving shipment identity, captured price and history. ERP-Q-159/160/161 are closed business choices. This approval does not itself establish Tawsel's exact changed-branch semantics.

Existing treasury-transfer permissions and full-cash-receipt rules do not automatically apply to goods transfers. Whole-shipment transfer followed by customer delivery is sequential custody movement, not permission to split a customer order concurrently between drivers. Search/history must retain current custody, recorded events and physical receipt evidence rather than deriving a location from the mere confirmation of a planned transfer.

## Pinned source

- Source commit: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`.
- Extracted: `2026-09-25T08:22:32.982Z`.
- Pack: `C:/Users/7OSS/Desktop/projects/routing + erp/tawsel-routing/docs/erp/planning-pack`.
- This review does not advance or modify the baseline.
- Source line numbers below refer to the supplied Markdown attachments. They are evidence locations, not new API definitions.

## Verified boundary findings

| Subject | Current supported behavior | Consequence for the new transfer workflow | Evidence |
| --- | --- | --- | --- |
| System ownership | ERP owns inventory and commercial records; Tawsel owns accepted execution snapshots, driver execution and routing. Service tokens cannot act as drivers. | ERP inventory movement needs its own approved transaction and custody model. Choosing Tawsel for the transport leg requires an explicit compatible execution contract. | 01, lines 23-25; 02, lines 7-18; 03, lines 5-15. |
| Initial source snapshot | `SourceSnapshot` carries `externalId`, `sourceDispatchCycleId`, source revisions, `sourceBranchExternalId`, recipient, destination, lines and exact outstanding amounts. Its closed schema has no transfer kind or destination-branch custody reference. `destination` is address or confirmed pin. | A branch address can resemble an ordinary address syntactically, but that does not provide a warehouse-transfer workflow. Do not disguise the destination branch as a customer and call its receipt customer delivery. | 05, lines 156-311 and 1199-1224. |
| Preparation and driver receipt | `intake.prepare` is upcoming work. `assignment.receiveBatch` asserts definitive physical driver receipt, including `receiptAsserted: true`, and checks all-or-none current admission. | Existing assignment semantics must not be relabeled as destination warehouse receipt. Selecting a driver alone is not proof that goods left the source branch. | 02, lines 53-63; 04, lines 1763-1817; 05, lines 308-392. |
| Reassignment | `assignment.reassignBeforeDeparture` changes driver and assignment authority before departure; OpenAPI explicitly says no live transfer. | It cannot move stock between branches or pass an already departed shipment directly to another driver. | 04, lines 1847-1874; 05, lines 414-458; 02, line 61. |
| Return destination | Existing return offers are grouped by the driver and original source branch. `Receive` includes `receivingBranchId`, but the HTTP contract rejects the wrong source branch with `409`, leaving held goods unchanged. | The field is not authority to choose any warehouse. This is not a general inter-branch receipt API. | 02, line 83; 04, lines 4254-4292; 05, lines 15217-15367. |
| Branch arrival and resume | `branch.interruptRound`, `branch.recordArrival` and `branch.resumeRound` are driver-session actions for a source-bound return stop. Interruption references a return `requestId` and claimed item quantities. Arrival is separate from actual receipt; resume waits for the claimed subset. | They do not establish a new arbitrary destination-branch transport task. The ERP service cannot invoke these human actions. | 04, lines 61-63 and 4468-4629; complete `branch-activity.schema.json` in 05, lines 1339-1605. |
| Return quantities | Actual received subsets, unresolved quantities, lost quantities and damaged quantities remain distinct, with expected item revisions. Service operations use `actorId: null`; ERP retains its native employee audit. | These principles inform discovery, but the existing return operation must not be reused for an unsupported stock transfer. A newly planned destination receipt must preserve actual counts and authority. | 02, lines 83-91; 05, lines 15217-15677; 03, line 15. |
| New delivery cycle | `dispatch.createFromReceipt` uses actual compatible received balance, a new source cycle, a complete new explicit snapshot including `sourceBranchExternalId`, and the previous cycle identity. Stable shipment identity and historical custody remain. The schema contains no explicit same-branch equality rule. | ERP-D-186 requires later dispatch from the receiving branch. The supplied pack does not define receipt compatibility for that changed branch precisely enough to claim acceptance or prohibition. This is missing contract detail, not yet a proven gap or need for a new API. | 02, lines 25-39 and 89; 04, lines 4631-4680; 05, lines 218-306 and 1102-1181. |
| Published events | The closed sender list includes existing assignment, return, branch-activity and redispatch transitions. No general inter-branch goods-transfer event is in that list. | Do not invent a transfer event name, infer support from a generic envelope, or turn a return event into a different business event. | 04, lines 141-173; 03, lines 109-111. |

### Acceptance and rejection examples checked

- `p21-offer-command` and `p21-receive-command` use the same originating `sourceBranchId` and `receivingBranchId`. The offered three pieces become an actual received subset of two; the remaining piece stays unresolved until a separate loss disposition. See 06, lines 14304-14540.
- `p21-fractional-receipt`, `p21-empty-subset`, `p21-forged-human` and `p21-stock-claim` reject fractional pieces, an empty received subset, an asserted human actor, and an invented `availableStock` field. Receipt/loss event substitutions are also rejected. See 06, lines 4869-5097.
- `p22-interrupt`, `p22-arrive` and `p22-resume` carry a return request/claimed subset or the resulting branch segment, not an arbitrary destination branch. See 06, lines 14934-15044.
- `p22-arbitrary-branch` rejects an injected `sourceBranchId` property in `branch.interruptRound`. Empty and fractional claims are also rejected. This is not a rejection fixture for changed-branch redispatch. See 06, lines 5099-5220.
- `p22-redispatch` shows a new cycle and explicit snapshot for the same shipment and source branch. This demonstrates neither acceptance nor rejection of cross-branch relocation. `p22-fractional-redispatch` rejects fractional quantities, not a changed branch. See 06, lines 15045-15114 and 5221-5290.
- The fixture evidence notes distinguish captured HTTP/PostgreSQL examples from schema-only invalid mutations and explain their limits. See 06, lines 7610-7616. Reading those historical captures does not constitute running them now.

## Historical conditional change category — not selected

Before the session 017 choice, a Tawsel-executed transport task would have required review of a **new inter-branch transport capability** in the consolidated `TAWSEL-CHANGE-REQUESTS.md`. ERP-D-175 rejects that candidate for the selected workflow. The following list retains its historical rationale only; it is not an active implementation requirement or a missing Tawsel completion phase:

1. Distinguish a customer shipment from a transport manifest carrying whole shipments and/or stock quantities. Unallocated stock has no customer-delivery task, `outcomeId` or dispatch cycle to reuse.
2. Carry explicit source and destination branch authority, stable transfer and line identities, assignment/custody history, and independent revisions. Exact wire fields and operation names remain undesigned.
3. Define driver acceptance/departure, explicit arrival, destination employee receipt, discrepancies, cancellation and failure/recovery without allowing service impersonation or fake receipt.
4. Define routing admission and interaction with a driver's current round. Existing one-active-round and planned-stop constraints cannot be silently bypassed by creating a second transport round.
5. Preserve customer-shipment identity, recipient details, accepted prices and history across relocation; decide how later last-mile dispatch and returns identify their valid branch. Existing departure locks remain authoritative until an accepted contract update changes a specific rule.
6. Keep transfer completion out of customer delivery, recipient-money, visit-fee and commission totals unless an explicit ERP business decision authorizes the appropriate separate effect.
7. Specify durable source commands, authenticated events, scoped reads, deduplication, revisions, replay/reconciliation and public success/failure examples for every chosen transition. No new sender types are approved by this review.

The owner has selected ERP-only transport operations. Retain Tawsel for its documented customer-delivery boundary. ERP-only movement does not by itself solve compatibility for a shipment already accepted by Tawsel, particularly after departure or where later cross-branch redispatch is needed. Do not rebuild Tawsel routing or call its private Engine. Resolve the specific customer-shipment mapping under TAWSEL-CHECK-003 before deciding whether any additional contract change is necessary.

## Current customer-shipment and driver boundaries, updated in session 018

- Before first Tawsel acceptance, a proposed sequence is to submit the initial customer snapshot using the actual later dispatch branch after ERP transfer receipt. Exact submission timing remains integration design; it must not hide a required synchronization step.
- A snapshot already accepted by Tawsel carries `sourceBranchExternalId` and source/assignment revisions. `intake.submitSnapshot` is a generic source-revision operation; predeparture withdrawal and reassignment are documented. Their descriptions and schema shape alone do not prove that changing source branch is supported in every state. Retain rejected/stale/unknown-result handling and prohibit simultaneous transfer and customer handover.
- Current return receipt is source-branch constrained, and reviewed redispatch fixtures use that same branch. ERP-D-186 / ERP-R-195 close ERP-Q-161 by selecting transfer after actual eligible return receipt, then customer dispatch from the destination branch. Verify the existing operations' exact changed-branch behavior without rewriting the original cycle or inventing cross-branch return-receipt support.
- Preserve the original shipment reference, intake branch history and captured order price under ERP-D-052. Current location, last-mile dispatch branch and historical intake branch are distinct facts. Shipping revenue attribution after transfer is an ERP policy, not a Tawsel return rule.
- `integration.getExecutionProjection` is available to the ERP service through the documented monitoring boundary. It provides received-evidence monitoring, not a driver reservation, occupancy lock or proof of uninterrupted real-time availability. The `Freshness` definition includes `receivedEvidenceOnly: true`, `deviceContactAt: null` and `integrationDelivery: unavailable`. Do not create an automatic free-driver claim from absent activity alone.
- The canonical provisioning `Driver` links `externalId`, `userExternalId`, enabled state and vehicle/profile. A generic ERP employee is not automatically a Tawsel driver. ERP-only transport may use an ERP operational driver reference; where the person also performs Tawsel deliveries, maintain explicit identity linkage. ERP-D-184/185 close ERP-Q-159/160: company drivers may carry transfers during customer rounds. Show source-branch drivers first and prioritize known branch presence without an active round; do not infer present physical location or guaranteed availability from missing projection activity. Concurrent driver assignments do not permit competing handovers of the same goods.

Source evidence for the additional focused review: 04 host index line 36, intake operations approximately 1713-2010; 05 SourceSnapshot and assignment definitions 219-458, Redispatch 1102-1181, monitoring freshness approximately 7790-7828, Driver 12927-12975. These are source-reading references, not newly executed acceptance results.

## Missing contract detail for the later Tawsel handoff

Keep the actionable clarification in the single consolidated `TAWSEL-CHANGE-REQUESTS.md`, under TAWSEL-CHECK-003. The concrete case is shipment source A, an actual eligible receipt at A where needed, an ERP-only physical transfer confirmed at B, and later customer dispatch from B. Ask the Tawsel contract owner to specify:

1. Whether `intake.submitSnapshot` may change `sourceBranchExternalId` on an unassigned or withdrawn/prepared predeparture task; the required withdrawal/reprepare sequence, revision checks, and preparation/location-readiness effects.
2. Whether `dispatch.createFromReceipt` may consume actual unallocated receipt from a predecessor at A while its new snapshot names B; what makes the branch/line/quantity/lifecycle balance compatible; and whether an existing source assertion suffices or evidence of completed ERP custody movement is required. No new field or endpoint is assumed.
3. Whether old-cycle history stays bound to A and new-cycle returns bind to B; the exact error results for invalid branch, lifecycle, revision, already allocated balance, unreceived/lost/damaged quantities and competing commands.
4. Durable results, same-action recovery after lost responses, retained rejection handling, permitted read verification, and positive/negative examples for the changed-branch cases.

If these existing operations satisfy the required behavior, close the check without a new extension. If a precise mismatch is established, add only that bounded change to the consolidated register. An absent cross-branch example is not evidence of prohibition.

## ERP mapping safeguards and remaining design work

- Initial customer dispatch may use the actual destination branch in its first valid source snapshot. An already accepted snapshot needs the exact allowed changed-branch sequence above; a departed cycle stays protected.
- Do not use `assignment.receiveBatch` to record ERP transport-driver handover. Do not confirm the old cycle's return directly at B to bypass its source-branch rule, invent a new shipment to escape balance checks, or treat transfer receipt as customer delivery.
- Preserve commercial price history. A new dispatch still needs a complete explicit outstanding-amount snapshot; copying previously paid amounts could collect them again.
- Recover uncertain commands using the same immutable action and current authoritative result. Keep customer dispatch pending until required accepted state is known. Retained business rejection needs reviewed intent and current versions, not automatic repeated new identities.
- Cover successful A-to-B source changes, subsequent return to B, withdrawal/revision races, duplicate recovery, insufficient/already allocated receipt, incompatible state and old-cycle preservation with real integration acceptance checks before claiming support.
- Shipping-revenue branch attribution remains a distinct ERP accounting question if not resolved elsewhere. The business choices about driver pool, concurrent work, returned-shipment eligibility, no brand charge, and ERP-only transport are settled and must not be asked again.

ERP-only execution, manifest batching, physical/unreserved eligibility, sending/receiving branch scope, actual discrepancy receipt and cancellation boundaries are selected. Remaining transaction/identity/recovery details are engineering work.

## Reading ledger

- Re-read 01, 02, 03 and 07 completely. A truncated combined output was completed through bounded rereads.
- Read 04's complete host/authority and closed sender-event indexes, plus the focused preparation/assignment, return receipt, branch interruption/arrival/resume and redispatch operations cited above.
- Read 05's complete file index; the full `branch-activity.schema.json`; focused complete money/line/source-snapshot, assignment-reference, preparation/receipt/reassignment and redispatch definitions; referenced destination definitions; and the return offer/request/subset/receive/dispose/service-command/item/request/group definitions relevant to these findings. Did not claim the full 05 attachment or full returns schema was read this turn.
- Inspected the relevant 06 index entries and the cited P21/P22 acceptance/rejection bodies and evidence notes. Did not read every fixture in 06.
- Read current ERP decision entries relevant to assignment, source-branch return, prior transfer exclusion, treasury-transfer scope and one-order/one-shipment identity. These are ERP policy references, not extra Tawsel authority.

In the session 016 source review, no source repository implementation, live Tawsel service or private database was accessed. That reviewer changed only this discovery reference.

Session 017 addendum: reread this reference and focused 04 intake/task operations and the permitted monitoring index; 05 source/assignment/redispatch definitions, monitoring freshness and complete Driver definition. Searched 06 source-branch references without establishing a cross-branch acceptance example; the earlier return/redispatch fixture bodies were not fully reread or executed. This session updated this reference, the consolidated change register and the correction-policy reference only. No full reading of all 04-06 content, runtime test, live availability guarantee or baseline change is claimed.

### Session 018 reading ledger

- Read 02 ownership, identity, source lifecycle, returns and redispatch sections; 03 lines 26-110 for command recovery, permitted source surfaces and receiver ordering.
- Read the relevant 04 operation index; complete intake operations at 1714-1935; return receipt/disposition/results, branch operations and redispatch/cycle material at 4254-4718.
- Read the complete `b2b-intake.schema.json`, 05 lines 160-1181; branch-activity definition; return offer/request/subset/receipt definitions at 15221-15385; and the relevant ErrorCode list at 2111-2140.
- Read 06 P10 command examples at 9380-9620, all six P10 input rejection fixtures at 1863-2118, capacity/allocation/stale errors at 9714-9758, all four P22 rejection fixtures at 5099-5290, captured P22 commands and preserved cycles at 14934-15242, and provenance notes at 7612 and 7627.
- Snapshot and redispatch schemas permit the branch field syntactically, but this reading does not establish changed-branch domain acceptance. The same-branch captured example and interruption-specific rejection are not contrary proof.
- No source implementation, runtime service or database was inspected or tested. No fixture was executed. Only this reference and the consolidated change register were edited in this delegated review; the pinned baseline remains unchanged.
