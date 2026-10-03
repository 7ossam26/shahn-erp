# Business boundary and mapping for ERP discovery

This explains the existing Tawsel integration boundary; it does not decide the new ERP's entire commercial model. Exact payloads, accepted enums and source identity are in 04–06. Conceptual words in this document are not new wire fields.

## Ownership and authority

| Concern | Authority and ERP planning implication |
| --- | --- |
| Commercial order, merchant/customer, pricing, prepaid allocation | ERP. Translate an explicit delivery snapshot; do not ask Tawsel to infer deposits, discounts, invoice balances or stock valuation. |
| Company branches, roles, users, driver references | ERP administration with shared issuer setup; Tawsel stores scoped projections and enforces its own authorization. ERP must also authorize/audit its native staff actions. |
| Delivery snapshot before departure | Source ERP can submit/revise within current versions and lifecycle. Separate source truth, pending proposed edit and last Tawsel-accepted snapshot. |
| Actual assignment receipt | Authorized source command asserts physical receipt by a driver; accepted preparation alone is not custody. |
| Route/current activity/outcomes | Tawsel driver execution. ERP service tokens do not act as a driver or bypass departure locks. |
| Source-branch return receipt and loss/damage | Narrow native source-service actions, with actual quantities, scope and revisions. Receiving an event is not physical receipt. |
| Reported collection | Tawsel driver-reported effective result with history. ERP defines remittance, cash reconciliation, settlement, refund, invoice and ledger treatment separately. |
| Inventory | ERP policy. A request to return, missing piece or lost/damaged disposition must not become received sellable stock automatically. |
| Routing Engine | Tawsel private dependency. ERP sends delivery requirements through Tawsel, not OSRM/VROOM jobs or direct database writes. |
| B2C personal work | Separate personal tenant/account in Tawsel. Same phone/contact does not merge it with company work or create ERP access. |

## Identity mapping: retain each level

Persist explicit ERP-to-Tawsel mapping records with tenant/source scope and current revisions. Do not derive identity from customer phone, address, name or coordinates. Same-address shipments are separate stops.

| Identity | Meaning and lifetime |
| --- | --- |
| `(tenantId, integrationId, externalId)` | Scoped source shipment/reference identity. Entity type supplies namespace for provisioning; source line IDs are additionally scoped to their shipment. |
| ERP order vs shipment | ERP decides their relationship. A source order reference is not a substitute for a stable shipment reference. |
| `taskId` | Stable Tawsel shipment/execution task UUID across attempts and redispatch cycles. |
| `sourceDispatchCycleId`, `dispatchCycleId` | Source and Tawsel identities of one physical dispatch cycle. Actual returned goods dispatched again require new cycle identities. |
| `assignmentId` / generation | Holder/assignment authority in a cycle. Do not reuse an old holder's authority. |
| `workdayId`, round/`tripId` | Explicit driver work period and round. A workday can span midnight and contain multiple rounds. Wire names vary by operation; use its schema. |
| `planId`, route revision, forecast ID | Plan/publication and immutable forecast identities; not shipment/source/assignment versions. |
| `stopId`, `attemptId` | Shipment-specific execution stop/attempt. A whole retry creates another attempt without inventing a new commercial shipment. |
| Outcome/correction IDs | Immutable original result and later corrective records; maintain effective state plus original history. |
| Return request/item/receipt/disposition IDs | Offer, actual accepted subset and separate loss/damage evidence. They are different facts. |
| `actionId` | Immutable command identity used across ambiguous HTTP retries. A network attempt does not get a new action ID. |
| `eventId`, recipient sequence | Immutable integration fact and its order within one recipient aggregate stream, not a global sequence or resource revision. |

Independent concurrency dimensions include source revision, resource/outcome revision, assignment generation, route revision, location revision, device generation, snapshot revision and recipient sequence. Compare each only in its own scope. Route reorder alone does not invalidate an otherwise compatible outcome. Clock timestamps never select the winning write.

Provisioning user commands share that user's monotonic source revision stream; integration-management provisioning commands share the source entity stream. A local ERP edit counter is not automatically one of these versions. Preserve durable outgoing order where revisions/dependencies require it.

## Source snapshot and financial inputs

`b2b-intake.schema.json#/$defs/SourceSnapshot` is the implemented snapshot definition. It includes source shipment/cycle/branch references, source and expected source revisions, recipient name/phone, destination, splitting flag, `allocation: exact-outstanding-per-unit`, lines, shippingDue, totalDue and priority. Source order reference, earliestAt and instructions have their own optional rules. Use the exact `required` lists in 05; do not infer optionality from this paragraph.

Each of 1–100 lines has stable `sourceLineId`, description, **whole quantity 1–1,000,000**, and exact outstanding `unitDue`. Current monetary inputs use nonnegative safe-integer `amountMinor`, `currency: EGP`, `exponent: 2`. Validate arithmetic and totals; using integer storage alone does not make an inconsistent total valid. Generic common money schemas are broader than actual current source writers.

ERP must allocate any already-paid amount into the outstanding per-unit and shipping snapshot before sending. Tawsel does not infer a split of an arbitrary deposit. Full/partial outcomes use these accepted amounts and supported shipping-payment states, not arbitrary underpayment. Do not collect prepaid amounts again. Later correction changes the effective driver report; it is not a refund transaction.

The native mock UI deliberately supports one line; the public contract supports multiple lines. The real ERP need not copy that form limitation. Foreign currency, fractional quantities, another allocation policy or unsupported payment behavior require a reviewed Tawsel boundary change if they must cross this connector; they can be separate ERP-only concerns where appropriate.

## Intake, preparation, receipt and departure

1. Submit a versioned source snapshot. Accepted means Tawsel stored this execution projection, not physical receipt or delivery.
2. Prepare an assignment when appropriate. Prepared work is upcoming; it is not executable held work.
3. Submit definitive received assignment with the required physical assertion. Admission and assignment acceptance are atomic.
4. Tawsel confirms a usable execution pin and eligible plan. A driver starts online after synchronization and fresh server readiness.
5. Departure protects the accepted snapshot/assignment. Subsequent newly admitted active work obtains its own departure protection.

Predeparture source commands can withdraw or reassign within authorization and current versions. After departure, staff cannot edit recipient, contents, amounts, assignment, outcome or urgency through this boundary. Authorized driver pin/urgency/correction paths are separate. Actual source-branch receipt/disposition remains a narrow permitted exception; identity administration is also separate. A stale ERP screen must handle the server's rejection, not overwrite custody.

Capacity is **50 remaining planned stops**, including planned branch stops. It is not a daily shipment quota or a cap on all held records. An over-capacity batch rejects atomically; no silent partial acceptance/splitting/backlog is promised. Same-address tasks count independently. Retry/reactivation also checks current capacity. Routing-provider failure cannot undo accepted physical receipt; routing readiness and intake acceptance are separate states.

## Location, planning, activity and devices

Preserve original source address separately from confirmed execution coordinates/provenance/location revision. A changed source snapshot can invalidate a prior pin; never silently present an outdated confirmation as current. First origin is explicitly confirmed branch/manual origin. Later physical origin advances only from explicit physical activity, not a navigation link or phone call.

Current activity is explicit heading, arrived or branch service, or absent. Next planned task is a suggestion, not automatic movement. Call/WhatsApp/navigation are local UI actions, not outcomes or proof of arrival. Phone-only no-answer/outcomes leave physical arrival unknown. Current task protection, eligible urgent work and earliest availability constrain replanning; urgency does not bypass eligibility. ERP source urgency is predeparture; driver-owned urgency can reflect a customer request later under Tawsel's rules.

At most one active round per driver; several devices can view it, with one current execution generation. Takeover requires server confirmation and fences stale-device actions. Former-device evidence may be retained for review/adoption; it is not authorized to overwrite current state. Every new start requires online synchronization, including pending local work barriers. Allowed already-started downloaded execution can capture offline; the ERP cannot treat unsent device actions as server-accepted facts. “About 24 hours” is a support target, not a deletion/acceptance guarantee.

## Outcomes, retry, correction and closure

- B2B supports full/partial delivery, refusal and no-answer with exact whole quantities and reported collection. Partial delivery depends on the accepted splitting policy. B2C does not share item splitting or branch custody.
- Untouched whole work can be deferred/activated/retried through driver rules; a retry gets a new attempt and respects eligibility/capacity. A rejected partial remainder cannot be revisited as a whole retry. Actual branch receipt/disposition or other dependencies can block retry.
- Corrections are bounded actions by the authorized owning driver in the open workday. Keep original outcome plus correction history and recompute the effective result once. Dependent actual receipt/disposition/redispatch/day closure can forbid correction. No generic staff “edit delivered” bypass exists.
- Round/day closure is explicit; midnight does not close a workday. Ending a round/day does not mean all work delivered or physically returned. Held work carries forward with its original identity rather than source re-entry or daily task copies. Ending the workday blocks later day-bound corrections.
- A general ERP commercial cancellation policy is still to be discovered. It cannot be implemented as an unauthorized postdeparture Tawsel mutation.

## Returns, physical balance and redispatch

Group return offers by the actual driver and original source branch. A request asserts proposed handover, not received stock. ERP staff inspect actual items and confirm only the received subset with each item's current expected revision. Omit unreceived/zero items. Other unresolved portions stay explicit; there is no requirement to wait until every offered item is accounted for before accepting a received subset.

Lost/damaged disposition is a separate explicit command and history. Do not turn it into a receipt. Corrections and retries race with actual receipt/disposition under Tawsel's invariants; ERP must handle conflicting outcomes honestly.

Per cycle, preserve: **dispatched = delivered + held + branch-received + lost + damaged**. Return-required is a classification of held goods, not another additive quantity. Per request: requested = received + unresolved + lost + damaged. Original outcome quantities describe that historical outcome; current custody can subsequently change.

For redispatch, use actual compatible received balance not already allocated, a new source/Tawsel cycle, and a complete new explicit outstanding-price snapshot. Keep the stable shipment identity and all previous cycles, attempts, amounts and custody history. Unreceived, lost/damaged or already allocated portions cannot fund new dispatch. A new cycle is not reopening an old attempt.

During branch interruption, customer work can be explicitly paused within the same round; branch arrival is explicit. Resume waits for accepted receipt of the **claimed subset**, without letting unrelated unresolved items block the entire batch. Do not create a second active round, silently discard customers or invent branch arrival from receiver events.

### Worked arithmetic, not a fresh runtime proof

Three pieces, each EGP 100 due, shipping EGP 50: two delivered with shipping collected yields EGP 250 reported and one held for return. If a permitted correction before receipt establishes one delivered instead, effective collection becomes EGP 150 and two remain held; the original report stays in history. Offering the two changes no stock. Receiving one makes custody 1 delivered / 1 held / 1 received; marking the missing held piece lost yields 1 delivered / 0 held / 1 received / 1 lost. Only that received piece can fund a new cycle. ERP cash settlement and stock disposition policy remain separate decisions.

## Monitoring, reports and UX consequences

Do not map every state into one ERP shipment-status enum. Preserve at least the distinctions needed for source command pending/accepted/rejected, snapshot/assignment/departure, attempt outcome, current custody, return receipt/disposition, event receipt/application and ERP financial settlement. A simple user-facing summary can be derived while details retain these facts.

Use scoped conditional monitoring and authorized histories. Source integration views expose only the recipient's data, even when a driver/round contains work from multiple sources. Do not infer missing hidden work or use another source's UUID as access authority.

Workday report reads use human sessions and `reports.read`; an ERP bearer must not call them. ERP-native reports can use its authorized projections and its own finance, with honest definitions. Count shipments, attempts, pieces and processed stops separately. A correction replaces effective results without duplicating totals; count physical pieces once per cycle. Exact aggregate amounts may be strings in report schemas even when input amounts are integers. Preserve currency separation.

Forecast comparison uses immutable first-start baseline and identified later forecasts tied to workload/attempt/route. Different workload or branch pause must be visible. Record UTC observations, server receipt and business acceptance separately; render with `Africa/Cairo`, not a fixed offset. Missing arrival/uncertain clock/version identity must stay unavailable or uncertain; never substitute webhook receipt time as physical completion.

ERP screens should expose clear next action and blocker, with details progressively available: “saved locally/pending send,” “accepted by Tawsel,” “driver received,” “event received,” “projection applied,” and “cash settled” are distinct. A pending command must not be presented as a completed physical or financial action.

## Sources for deeper verification

This curated interpretation comes from the pinned `docs/erp/ERP-PLANNING-INPUT.md`, `field-and-status-mapping.md`, `docs/tracking-and-consistency.md`, provisioning/intake/start/current/outcomes/eligibility/closure/returns/branch/corrections/monitoring/reporting runbooks, and their canonical schemas. These path labels do not require the planning chat to have repo access; exact definitions are included in 04–06. Unspecified commercial policy remains a question for the ERP owner, not an instruction to copy Tawsel internals.
