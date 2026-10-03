# Prior owner decisions: English context for ERP discovery

## Provenance and authority

- Document kind: English transfer of prior owner-decision context, with a separate current-answer overlay. This is not a contract update, an implementation instruction, or an approved master plan.
- Source file: `C:/Users/7OSS/Desktop/projects/routing + erp/tawsel-routing/docs/erp/ERP-PRIOR-OWNER-DECISIONS.md`.
- Source compilation date: 2026-09-26.
- Source review commit: `a891d189f38f24c4d73a3c9e2ac4e74016f8dc6a`.
- Source file size when read: 40,065 bytes.
- Source SHA-256: `882d9846086be94e6ba7796dfdf94407d93933f55c64cab242f6f92d1bc60c91`.
- Read coverage: all 176 source lines, read in complete ranges 1-62, 63-122, and 123-176 after an initial display was truncated. The complete reads govern this transfer.
- Existing Tawsel contract reference commit: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`, identified in `04-CANONICAL-HTTP.md`; its extraction date is `2026-09-25T08:22:32.982Z`.
- The newer decision-context commit does not advance that contract baseline. API fields, authorization, operations, versions, errors, and transaction behavior remain governed by the contract package until an explicit contract comparison and accepted update occur.
- IDs such as `A01` and `C07` identify items in the source context document. IDs such as `D-01` belong to Tawsel's decision register. They must retain that provenance rather than being presented as newly made ERP decisions.
- The source summarizes the meaning of owner answers from Tawsel discovery; it is not a verbatim transcript of every message. It reports reviewing Tawsel decisions `D-01` through `D-112` and their change map. This transfer preserves all 50 items, their Tawsel references, the superseded choices, and the resolved/open coverage map.
- The user authorized importing these prior decisions into the ongoing ERP discovery. Newer explicit answers in the current ERP conversation take priority. A conflict with a current Tawsel contract still requires an explicit impact assessment; current answers do not silently modify that contract.

Historical prompts and instructions in the source remain reference material. This document does not authorize implementing Tawsel work, choosing a stack, creating phases, or executing an old prompt.

Latest ERP answer overlay: section AC, session 020, recorded 2026-10-03. Earlier session overlays remain historical snapshots; the newest explicit amendment takes precedence. This does not change the source provenance or Tawsel contract baseline above.

## How this context informs the ongoing discovery

1. Carry relevant prior owner decisions into ERP records with both the context item and Tawsel `D-` reference. Preserve newer explicit ERP answers and record any actual amendment and its effect.
2. Close questions already answered; narrow partially answered questions to the remaining uncertainty. Do not ask the owner to approve every imported decision again.
3. Preserve scope: company-user administration and assignment decisions inform ERP product behavior; Tawsel execution decisions constrain integration. Tawsel B2C or hosting choices do not automatically become ERP choices.
4. Use current contracts for API details, technical permissions, and transaction semantics. This document explains approved intent and does not create an endpoint or prove present implementation status.
5. State a real conflict as the prior rule, the new need, and the precise choice required. Do not restore a superseded proposal or treat an old assistant recommendation as owner approval.
6. Continue discovery in short conversational batches numbered 1, 2, 3; keep stable tracking IDs in saved files. Master-plan approval and subsequent phase production still follow the current discovery workflow.

## A. Company, users, and branches

### A01 - Tawsel D-01, D-14, D-84

**Prior owner decision:** Company users, employees, drivers, and dispatch staff are managed in ERP. Drivers open Tawsel to find their assigned shipments. Tawsel does not duplicate the same company, user-management, and assignment screens.

**Remaining ERP detail:** Actual staff responsibilities, who may create or disable each user type, and the detailed ERP screens. A Company Admin does not automatically have permission to change every execution state.

### A02 - Tawsel D-02, D-03, D-16, D-59, D-90

**Prior owner decision:** ERP has flexible permissions and configurable roles. Behavior is not determined by fixed job names such as Accountant or Manager. Each company user has one role, inherits its permissions, and may have direct user exceptions.

**Remaining ERP detail:** The permission list for ERP modules, default job-role templates, and financial approvals. The agreed starting model is one role per user; multiple roles are not an unanswered starting question.

### A03 - Tawsel D-59, D-90

**Prior owner decision:** User exceptions use `inherit / allow / deny`. An exception can add a permission or remove an inherited permission. An explicit user choice overrides role inheritance within the user's permitted resources. Exceptions are edited in the user editor itself.

**Remaining ERP detail:** Additional ERP actions in the permission matrix. Permissions do not bypass business-state restrictions or grant access to another company's data.

### A04 - Tawsel D-04, D-25, D-90

**Prior owner decision:** A user may be assigned to multiple branches. The same effective role permissions and user exceptions apply across all their allowed branches. The agreed model has no different capability exceptions per branch.

**Remaining ERP detail:** Branch counts, hierarchy, and which users need which branches. The earlier single-branch choice in `D-17` was superseded.

### A05 - Tawsel D-01, D-25, D-59, D-84

**Prior owner decision:** A company may contain multiple branches. Branch scope, user permissions, and driver-work scope apply together. A driver sees their own assigned work; membership of a branch does not expose every shipment in that branch.

**Open in the source context:** Whether the new ERP product serves one shipping company or multiple independent companies was not determined by Tawsel's multi-company support. Access to historical commercial data and brand reports also remained open. See the separate current-answer overlay for the newer ERP product direction.

### A06 - Tawsel D-58, D-84

**Prior owner decision:** The agreed B2B sign-in experience uses company code plus username/password, a shared company identity authority, and an independent Tawsel session. User and role administration is in ERP. Password hashes are not copied between systems, and normal driver actions do not require ERP to be available each time.

**Remaining ERP detail:** User administration at the issuer and the sign-in policy for any other ERP portals. Current contracts govern OIDC and service-authentication details. This does not reopen identity separation from the beginning.

### A07 - Tawsel D-41, D-106

**Prior owner decision:** The system supports a small operations team without a separate button, approval, or written reason for every routine movement. Audit, concurrency, and protection are background responsibilities rather than paperwork imposed on the employee.

**Remaining ERP detail:** Identify the actual actions whose commercial meaning warrants a confirmation. Do not introduce an approval chain merely because the product is called ERP.

**Scope of A02-A04:** These are the approved starting rules for company-user administration designed in ERP to support Tawsel-related journeys. They do not prevent discovery of financial permissions or merchant-portal needs. A new need that conflicts with the model must be recorded as a specific amendment.

## B. Shipment entry, assignment, and staff/driver responsibility

### B01 - Tawsel D-14, D-33, D-39

**Prior owner decision:** Shipment selection and driver assignment happen in ERP. Preparing work for a driver and physical receipt by that driver are different facts. Final confirmed assignment in ERP means that the driver has received the shipment according to the existing workflow or handover sheet. Preparation alone does not establish custody.

**Remaining ERP detail:** Who confirms the receipt and what data and handover-sheet interface are appropriate. The system hosting assignment has already been decided; preserve the preparation/custody distinction.

### B02 - Tawsel D-07, D-18, D-39

**Prior owner decision:** Additional work can be prepared for a driver during the day. It stays waiting at the branch until received. Receipt makes it work physically with the driver and triggers the appropriate replanning.

**ERP implication:** Prepared work must not appear to be in driver custody or enter the executable delivery route before receipt.

### B03 - Tawsel D-33, D-40

**Prior owner decision:** Before departure, staff can remove a shipment from a driver's list and put it with another driver as a routine change. A mandatory written reason or extra handover procedure for that change was rejected.

**Remaining ERP detail:** The authorized employee and screen details. Race conditions between starting a round and changing its list are checked by the system, not extra paper forms.

### B04 - Tawsel D-35, D-52, D-91, D-95, D-101

**Prior owner decision:** After departure, staff cannot change the shipment's execution data, prices, execution state, outcome, or priority. It is the driver's responsibility. There is no general admin override to reopen these changes.

**ERP implication:** Commercial-edit permissions do not authorize rewriting a locked execution snapshot. Actual receipt from a driver and damage/loss dispositions are narrow exceptions described in the return section.

### B05 - Tawsel D-35, D-91

**Prior owner decision:** There is no ERP workflow to request remote cancellation during delivery. Staff contact the driver, and the driver records the appropriate execution outcome for returning the shipment. A phone call itself does not change system state.

**Remaining ERP detail:** Commercial cancellation before dispatch or commercial closure in ERP, while preserving shipments that have departed and avoiding cancellation that overwrites driver execution.

### B06 - Tawsel D-22, D-34, D-95

**Prior owner decision:** Custody cannot move directly between drivers while the goods remain with the first driver. They can be physically returned to the branch, receipt confirmed, and then sent with another driver.

**ERP implication:** Illness or inability to finish follows this branch-return path. Direct reassignment after departure is not a fresh unrestricted choice.

### B07 - Tawsel D-29, D-39

**Prior owner decision:** The driver explicitly prepares/starts the round. Each calculated route does not require an additional dispatcher's approval.

**ERP implication:** Do not add a mandatory ERP approval for each route that contradicts the agreed workflow.

### B08 - Tawsel D-56

**Prior owner decision:** Each shipment stays independent even when the recipient and destination are the same. Shipments are not automatically merged into one state or outcome.

**ERP implication:** Preserve each shipment's identity, outcome, and amounts. Adjacent route ordering does not merge identity or accounting. The commercial relationship between an order and multiple shipments is a separate ERP decision that remains open.

### B09 - Tawsel D-57, D-66

**Prior owner decision:** The agreed limit is 50 remaining stops on the route, including a planned branch visit. An addition that exceeds the limit is rejected in full: no partial acceptance, automatic splitting, or representation of rejected work as assigned.

**ERP implication:** This is not a limit of 50 shipments per day, ERP companies, or stored records. Assignment UI distinguishes proposed, waiting, accepted, and rejected work according to the actual result.

## C. Partial delivery and reported collection

### C01 - Tawsel D-23, D-36

**Prior owner decision:** A positive amount due is shown to the driver, who confirms collection of that required amount when delivering. Arbitrary underpayment is not allowed. Prepaid money is not collected again; a zero amount due represents that case.

**Remaining ERP detail:** Customer payment methods, driver cash hand-in, and merchant settlement are not all decided by this COD rule.

### C02 - Tawsel D-36, D-46, D-93

**Prior owner decision:** B2B partial delivery is permitted according to the merchant/brand policy sent by ERP. It concerns integer piece counts within a shipment, for example 2 out of 3, rather than fractions or a weight-based split.

**Remaining ERP detail:** Where brand policy is configured, who may change it, and ERP item details. Whether partial delivery is supported in principle is already decided.

### C03 - Tawsel D-47

**Prior owner decision:** Partial-delivery calculation uses the shipment details already sent, without a live request to ERP for pricing. The accepted example is three pieces at 100 each plus 50 shipping: delivering two pieces collects 250, and the third piece returns.

**Remaining ERP detail:** ERP owns pricing, taxes, and discounts before constructing the snapshot. The amounts 100 and 50 illustrate the calculation; they are not universal prices or a fixed fee.

### C04 - Tawsel D-48, D-49

**Prior owner decision:** Pieces rejected during partial delivery return. There is no later delivery visit for that rejected remainder. This differs from deferring an untouched whole shipment.

**Remaining ERP detail:** Return reasons and financial effects. Rescheduling a partially rejected remainder is not an undecided starting choice.

### C05 - Tawsel D-51

**Prior owner decision:** Shipping collection is still due when all goods are refused. If the customer also refuses to pay shipping, that exception is recorded explicitly, and the brand/merchant bears the consequence under ERP rules. No-answer does not automatically mean refusal to pay.

**Remaining ERP detail:** The merchant-account entry, when and how to deduct it, settlement, and disputes. The party bearing this exception is decided; the accounting mechanism is not.

### C06 - Tawsel D-52, D-92

**Prior owner decision:** Execution details and prices do not change after departure. Where a deposit or earlier payment exists, ERP sends the exact remaining amount with enough allocation across pieces and shipping to support partial delivery.

**Remaining ERP detail:** Equal or proportional deposit allocation, automatic refunds, and a separate deposit module were not approved. These are real financial choices to discover if needed, not implications of accepting the edge case.

### C07 - Tawsel D-24, D-51, D-96

**Prior owner decision:** The driver's collection amount or delivery report is not a settlement or proof that cash was handed to the company. Correcting an entry changes the effective report while retaining history; it does not execute a refund.

**Remaining ERP detail:** Timing and recipient of driver cash hand-in, merchant accounts, commissions, receipts, daily/weekly settlements, approvals, and disputes.

C03 does not require a pricing call from Tawsel for each attempt. C07 does not exclude finance from ERP: settlement was excluded from Tawsel execution scope, not from commercial ERP discovery.

## D. Returns, physical receipt, and redispatch

### D01 - Tawsel D-21, D-32, D-42

**Prior owner decision:** A shipment requiring return remains with the driver until actual receipt or an approved disposition. It returns to its original dispatch branch, not any branch that the employee can access.

**ERP implication:** `Returned`, `return-required`, and `branch-received` are distinct facts. Other commercial transfers between branches remain a separate question.

### D02 - Tawsel D-44, D-84, D-95

**Prior owner decision:** Staff receive returns through a native ERP screen: open the driver, see the return request, review what is present, and confirm what was received. The same receiving employee does not need an additional mandatory Tawsel screen.

**Remaining ERP detail:** Who has this permission, and counting/search tools. The screen's system and purpose are decided.

### D03 - Tawsel D-45, D-80, D-95

**Prior owner decision:** Staff may confirm receipt of a subset while other pieces remain unresolved. Closing the whole request is not a prerequisite to approving the received pieces or continuing the applicable work.

**ERP implication:** Do not require every return to be cleared before any progress. Do not clear or fictitiously receive the remainder. This rule does not remove the independent 50-stop limit.

### D04 - Tawsel D-45, D-95

**Prior owner decision:** Loss/theft and damage are handled in ERP, with the approved operational disposition communicated to Tawsel. Loss is not physical receipt. Damage does not automatically create stock fit for redispatch.

**Remaining ERP detail:** Responsible staff, permissions, and financial/inventory effects. ERP ownership of handling these cases is already decided.

### D05 - Tawsel D-68, D-80

**Prior owner decision:** The subset the driver claims to have handed to the branch requires receipt confirmation before leaving/resuming this path. No fake local confirmation is allowed when offline. Other unclaimed or disputed pieces do not require closing the entire group.

**ERP implication:** Distinguish the subset awaiting confirmation from the rest of the request. Do not propose continuation while a required claimed handover remains unconfirmed.

### D06 - Tawsel D-34, D-79, D-95

**Prior owner decision:** Following confirmed physical return, ERP may redispatch received pieces that are fit to send. Preserve the original shipment identity and attempt history, and create the new dispatch cycle according to the contract.

**Remaining ERP detail:** Who selects the next driver and the new fees. Do not reopen an old attempt or count missing/unreceived pieces as available stock.

### D07 - Tawsel D-43

**Prior owner decision:** A branch visit is an explicit interruption within the workday: stop eligible travel, resolve any customer interaction in progress, visit/receive at the branch, and resume from that branch. It does not fabricate an end of day.

**ERP implication:** Support the required confirmation without forcing a new workday or repeating driver notifications and confirmations unnecessarily.

**Identity boundary:** Permission for ERP staff to confirm receipt does not mean sending an arbitrary `actorId` to impersonate a Tawsel user. ERP audits the employee identity locally and submits the command using the allowed service authority. Current identity and receipt contracts provide the precise details.

## E. Tawsel execution decisions retained as integration context

These decisions help ERP represent execution and custody. They do not call for a second driver application inside ERP.

### E01 - Tawsel D-06, D-37, D-49

An untouched whole shipment can be deferred to an earliest permitted delivery date/time. No narrow appointment window is imposed by default. This is not postponement of pieces remaining after a partial acceptance.

### E02 - Tawsel D-64, D-65, D-79

Call counters and the three-call rule were removed entirely. A no-answer outcome exists. If the customer later responds, the same driver can retry an untouched whole shipment still in their custody before actual branch receipt, without new dispatcher approval and with history retained.

### E03 - Tawsel D-08, D-21, D-67

A day can end with unfinished work. The workday is explicit and may extend past midnight. Shipments still in custody continue without being re-entered from ERP. Ending the day is not delivery, return receipt, or settlement.

### E04 - Tawsel D-91, D-95, D-96

A driver can correct an outcome or piece count they entered incorrectly during an open workday and before dependencies such as branch receipt or redispatch. Preserve the original and correction. There is no general ERP-staff correction of execution after departure.

### E05 - Tawsel D-94, D-97, D-98, D-101

ERP controls `urgency` before departure; the assigned driver controls it after departure, including a customer's request by phone. Keep the current target, then eligible urgent work, then ordinary work, while respecting the earliest allowed delivery time. ERP has no priority override during execution.

### E06 - Tawsel D-05, D-09, D-19, D-29

Starting, heading to a customer, and arriving are explicit actions. Replanning occurs automatically for the appropriate changes and protects the current target. Being next in the list does not prove travel; opening calling or navigation does not record arrival.

### E07 - Tawsel D-30, D-55, D-91, D-99

The original location is preserved, with confirmed/correctable execution coordinates according to current authority. GPS is outside the agreed scope. After departure, permitted driver pin correction continues; staff cannot remotely edit execution data. An execution pin alone does not update ERP's customer master.

### E08 - Tawsel D-60, D-61, D-78, D-81, D-87

Every new round starts after synchronization, connectivity, and server confirmation. Already-started work can continue offline. Another device sees the same round; execution is on one device with explicit online transfer. Switching device/account must not create duplicate rounds or lose queued actions.

### E09 - Tawsel D-69

If optimization fails, execution can continue from the last valid order, or through a clear eligible-work/manual-order choice. Do not claim optimization succeeded when it did not. Engine failure does not reverse physical receipt or erase an outcome.

### E10 - Tawsel D-70, D-71, D-72

Supported planning inputs include `car / motorcycle / bicycle` and a default customer-service estimate of 10 minutes. The end is the last customer by default or an explicit branch visit, with an optional endpoint for a B2C route. These are planning inputs, not ERP fleet management or proof of arrival.

### E11 - Tawsel D-24, D-67, D-82, D-88, D-100

Workday reports include driver outcomes/amounts and expected-versus-actual comparisons per stop and route, retaining both initial and revised predictions. In-app and Excel views use the same permitted data and filters. There is no hard shift-end cutoff. An unknown arrival time must not be filled with the event-receipt timestamp.

### E12 - Tawsel D-12, D-62, D-63, D-86

Updates should be quick and show last-update time and stale-data state. Accepted goals were about 3 seconds for the Tawsel view and 5 seconds for the ERP projection on a healthy path after Tawsel confirmation. The owner wants to try and measure this before increasing resources. These are targets, not evidence of actual capacity or a client-count limit.

## F. System boundaries and prior preferences

### F01 - TAWSEL-ENGINE-CONTEXT sections 2, 6, 7; Tawsel D-13, D-111, D-112

ERP has an independent project and database. Tawsel is a shared execution product that can integrate with different ERPs. Integration uses HTTP/events, stable identifiers, revisions, retries, and recovery, rather than reading Tawsel tables or requiring knowledge of another ERP's internal schema.

### F02 - TAWSEL-ENGINE-CONTEXT sections 2, 6, 9

The Tawsel driver application and map/route views are shared rather than copied for every ERP. ERP keeps commercial summaries and can open allowed Tawsel views. Embedding is optional according to need and the identity contract; it is not a mandatory iframe or permission to expose a service token in the browser.

### F03 - TAWSEL-ENGINE-CONTEXT sections 7, 10, 12; Tawsel D-111, D-112

ERP owns the commercial source, pricing, inventory, and settlements. Tawsel owns confirmed execution. Persistent source outbox and receiver inbox, duplicate handling, and recovery are background correctness requirements. Receiving an event is not applying it. There is no single ACID transaction across the two databases.

### F04 - Tawsel D-102, D-106, D-109

Screens supplied by the owner are visual references; functionality and buttons follow decisions. UX has a clear action and explains what is required, missing, or waiting, with separate pages/modals as needed. Implementation uses small complete phases that do not assume an agent knows chat history; no one-shot delivery or abbreviated final phases.

### F05 - Tawsel D-103, D-105, D-110

The owner prefers shadcn/ui + Smooth UI, meaningful connected Vitest tests, understandable manual checks, and a proposed Codex model/reasoning effort for each eventual phase. Details must fit the selected project stack. An empty test file or an unsupported claim of passing is not verification.

### F06 - Tawsel D-104, D-107; D-77, D-86

Tawsel's own stack was previously accepted, as was Hostinger KVM 2 / Dokploy as its trial deployment target. Neither choice automatically applies to the new ERP, and the same server is not assumed sufficient for both workloads. Discover ERP's different needs without reopening the established Tawsel choice.

### F07 - Tawsel D-15, D-26, D-27, D-38, D-54, D-83, D-89

B2C is a separate personal flow with its own account, kept simple without partial pieces or branch returns; usage billing was deferred. These are Tawsel B2C boundaries. They do not prohibit ERP finance, invoices, or subscriptions if the owner chooses them.

### F08 - Tawsel D-11, D-30, D-64, D-76; TAWSEL-ENGINE-CONTEXT section 2

The agreed Tawsel journey excludes advanced POD/photo/OTP/signature, GPS, and call counters. PWA comes first; native mobile and learning capabilities are later. This does not silently exclude warehouse barcodes, bank-transfer attachments, or commercial reporting from ERP.

## G. Superseded choices: preserve the final decision

| Earlier idea | Final owner decision and source |
| --- | --- |
| One branch per user - D-17 | Multiple branches with the same effective permissions - D-25. |
| 1/3, 2/3, 3/3 indicators or a three-call rule - D-20, D-31, D-50 | Call counting removed entirely - D-64. |
| Absolute prohibition on reassignment - the initial reading of D-22 | Routine change before departure; after departure, physical branch return followed by redispatch - D-34, D-40, D-95. |
| ERP employee correcting the outcome of a departed shipment - D-73 | Prohibited after departure; driver correction under its conditions, with narrow receipt/damage/loss exceptions - D-91, D-95, D-96. |
| New start offline or without waiting for synchronization - earlier context associated with D-40 | Connectivity and synchronization before every new start - D-81. Continuing an existing round offline is different. |
| ERP changing urgency at any time - D-97 before final resolution | ERP before departure only; the driver afterward - D-101. |
| Deferring remaining pieces after accepting some - earlier proposal | The remainder returns; deferral concerns an untouched whole shipment - D-48, D-49. |
| Confirming all returns before any subset can continue | Confirm the actual received subset while leaving the rest in its real state - D-80. A claimed handover subset still requires confirmation - D-68. |
| Dispatcher approval for every route; live ERP partial-pricing calls; zero refusal shipping fees; or presenting a return request as receipt | Driver approval without an extra dispatcher step - D-29; local calculation from the snapshot - D-47; shipping due on refusal with an explicit nonpayment exception - D-51; receipt is a separate act - D-44, D-45, D-95. |

The old register retains questions, answers, and amendments. The latest decision with a clear relevant scope governs; an isolated early paragraph is not sufficient evidence of the current policy.

## H. Coverage against erp_requirements_discovery_notes.md

This map preserves what the supplied owner-decision source resolves. The current-answer overlay below further narrows remaining questions.

| Original notes section | Resolved by prior owner decisions | Useful remaining discovery |
| --- | --- | --- |
| Sections 2, 8, 16 - Users/Permissions/Branches | Multiple branches; one role; allow/deny exceptions; the same effective capabilities across allowed branches; driver scope - A01-A06. | Actual company jobs, detailed ERP action matrix, accountant/branch-manager/merchant permissions, and branch hierarchy. |
| Sections 6, 10 - Statuses/Drivers | Tawsel outcomes, partial delivery, refusal/no-answer/deferral, driver authority after departure, and limited correction - B04-B06, C02-C06, E01-E05. | Commercial order states before/after delivery and ERP presentation that preserves distinct facts. |
| Sections 9, 14 - Handover/Order to Driver | ERP assignment; prepared/received distinction; predeparture changes - B01-B03. Native ERP return receipt - D02. | Source of shipment data, responsible staff, sorting, receipt from the brand, and branch transfers before the last-mile stage. |
| Sections 11, 12 - Payments/Accounting | Exact COD, refusal shipping fee, no arbitrary underpayment, driver report distinct from settlement - C01-C07. | Which movement uses Cash/Bank deposit/Bank transfer; cash hand-in, merchant settlement, ledger/invoices/commissions/approvals. |
| Sections 13, 16 - Integration | ERP/Tawsel identity and ownership, both directions, assignment/outcomes/offline, and the system boundary - B01, E08, F01-F03. | ERP field mapping, selected operations, and implementation within existing contracts. HTTP integration versus shared databases is already decided. |
| Sections 3, 4 - Merchant/Brand | ERP/brand supplies partial-delivery policy and details - C02. | Merchant-to-brand relationship, merchant login and permissions, contracts, prices, and accounts. Tawsel discovery did not resolve these. |
| Sections 5, 7 - Shipment fields/Data entry | Sufficient execution data, independent shipment identity, valid prices/pieces for partial delivery - B08, C02-C06. | Additional commercial fields, manual/Excel/API entry, tracking labels, ERP weight/dimension uses, entry conditions, and data source. |
| Section 15 - Pricing/charging | No Tawsel decision establishes the meaning of the historical phrase about charging by money or time. | What service is priced, who pays, and who receives the payment. Do not choose a meaning by assumption. |

For the existing ERP register: A01-A06 resolve the permission-model part of `ERP-Q-004`, while actual responsibilities and detailed capabilities remain. C01-C07 resolve boundary rules within `ERP-Q-005`, while hand-in, settlement, and payment methods remain. Tawsel's multi-company support alone does not close `ERP-Q-001` on company/product type and scale.

## I. ERP matters not resolved by Tawsel discovery

At the time of the supplied decision context, the following still needed ERP discovery:

- One-company ERP versus multi-company SaaS; service regions, counts of branches/users/shipments, and V1 priorities.
- Receipt/delivery of prepared parcels versus product storage and order fulfillment; actual pickup, warehousing, sorting, and inter-branch-transfer stages.
- Merchant/Brand relationship, merchant portal and permissions, and the levels of commercial accounts, contracts, and pricing.
- Who enters data and how, who selects a branch, the Order-to-Shipment relationship, tracking codes/labels, and additional commercial data.
- Each employee's ERP action matrix, financial approval authority, documents, deletion, and permitted commercial corrections.
- Company tariffs, discounts, taxes/invoices where needed, driver cash hand-in, branch cash custody, merchant accounts/commissions/settlements, and refunds.
- Migration from current working methods, key problems, V1 success criteria, pilot, and manual trial.
- ERP stack, deployment, workload, backup/restore, and any shared services with Tawsel. Prior Tawsel choices are not automatic approval for ERP.

Discovery should start from the known rule and ask only the missing part: for example, after recording one role and user exceptions, ask whether an accountant reviews cash hand-in or can also approve settlement.

## J. Source trail retained from the supplied context

The source reports using:

- `TAWSEL-DISCOVERY-LOG.md`: Tawsel discovery rounds and decisions D-01 through D-112; 112 decision rows including superseded answers.
- `docs/phases/decision-map.md`: links decisions to final requirements and identifies amendments, particularly D-25, D-64, D-81, D-90, D-91, D-95, D-96, and D-101.
- `TAWSEL-ENGINE-CONTEXT.md` sections 2, 6, 7, 9, 10, 12: ERP/Engine/Tawsel separation, data ownership, and integration. Historical suggestions there must be interpreted through later decisions; old cancellation or route-approval proposals are not restored.
- Current handover documents, `docs/erp/erp_requirements_discovery_notes.md`, and ongoing ERP discovery records to understand overlap. Their unanswered questions were not treated as new approval, and the supplied context did not itself revise the current ERP answers.

Hashes reported by the supplied source at compilation time:

| Referenced source | Reported SHA-256 |
| --- | --- |
| `TAWSEL-DISCOVERY-LOG.md` | `8de78613181b5ae9db4547196974ec6a71e648345699d67b5d8436c5a089f4a7` |
| `docs/phases/decision-map.md` | `745cf00479f5623ad1b80b9084080c3bda4c5e85ffe8de2e9d77c511dc58f9a3` |
| `TAWSEL-ENGINE-CONTEXT.md` | `a650cd4e5df21f81aa61fa0b99b066a21b72f51c0d4c9090aa9c88ce8d8f96b8` |

These three hashes are reproduced source claims, not a claim that this translation task reread or independently rehashed those files. The owner-decision source file itself was directly read and hashed as recorded above.

This context belongs in the ongoing discovery. It does not require a new chat, replacement of the ERP plan, or reimplementation of Tawsel.

## K. Newer ERP answers: separate overlay supplied with this import task

This overlay records session 003. Session 004 updates are listed in section M; the main ERP decision and question registers contain current statuses. Historical open questions in the translated source are not automatically still open.

The following statements come from the current ERP conversation as supplied for this import. They are not represented as content of the older Arabic source or as new Tawsel decisions.

| Topic | Latest explicit answer | Effect on remaining discovery |
| --- | --- | --- |
| Initial product direction | Each company is separate initially; SaaS is a later ambition. | The initial commercial direction is answered. The precise deployment/data-isolation design and later SaaS migration remain architecture questions; do not infer a shared database or a specific hosting model from this statement. |
| Entry of orders | The brand brings its orders, with a waybill for each order; Data Entry transfers the information into ERP. | The initial source and responsible function are known. The owner expressed uncertainty about the ready-parcel versus product-stock distinction, which remains open. This does not decide every intake field, waybill format/identifier, physical receipt step, validation rule, or future import method. |
| Developer administration | A developer superadmin creates branches and supports the company; the owner said the customer would not know about this account. | Record the support/administration actor separately from company roles. The exact meaning of account visibility, support access, audit, and implementation needs definition. The statement does not authorize impersonating drivers or overriding Tawsel execution locks. |
| Company owner | The owner has an admin role and manages their company and people. | Carry this owner responsibility into the role matrix. The exact action scope, including branch-management boundaries relative to developer superadmin, must follow explicit answers; do not assume general execution overrides. |
| Operational estimates | The user is the developer building the product and has not supplied operating counts. | Do not invent branch/user/shipment counts or require the developer to supply historical company metrics they have not claimed to possess. Sizing assumptions or pilot targets must be labeled and later agreed. |

No direct contradiction is established between these current answers and the prior decisions in A-F. They answer some previously open commercial questions and identify additional administration detail. A company owner's admin role can fit the one-role model; the separate developer-support actor still needs an explicit scope. This document does not complete an API-level conformance comparison or claim a contract update.

## L. Import boundaries and next unresolved details

- All A01-A07, B01-B09, C01-C07, D01-D07, E01-E12, and F01-F08 are preserved above with their source references.
- All nine superseded-choice rows and all eight coverage-map rows are retained.
- Single-role administration, multiple branches, direct permission exceptions, ERP assignment, native ERP return receipt, driver authority after departure, and the partial-delivery rules should not be reopened as if unanswered.
- Company separation, brand-provided order/waybill entry through Data Entry, developer superadmin, and owner admin are carried as newer ERP answers without attributing them to a Tawsel decision ID.
- Remaining high-impact discovery includes Merchant/Brand structure, physical custody before dispatch, actual staff actions, commercial order/shipment identities, tariffs and financial settlement, and ERP architecture/operating assumptions.
- The branch-creation/support split needs precise permissions, not a claim of contradiction. Likewise, owner admin does not imply a right to modify locked execution states.
- Contract mapping must still check the selected operation definitions and both acceptance/rejection cases in the pinned canonical references. This document alone does not establish service permissions, an endpoint, a payload, or a transaction guarantee.
- No stack, service purchase, implementation phase, new commercial requirement, or baseline upgrade is selected by this transfer.

## M. Subsequent ERP clarifications in session 004

- Ready recipient-specific parcels are confirmed; the shipping company does not pick/pack from loose stock (ERP-D-030).
- Paper waybill fields are brand name, recipient name, phone, address, price, and comment, possibly describing inspection permission (ERP-D-031). Price meaning and additional execution line data remain open.
- Access is modular: a user granted a screen may perform its operations, without hardcoded job-title authority; one-role/user-exception and branch-scope rules remain (ERP-D-032).
- Brand is the direct commercial customer, closing the basic Merchant/Brand hierarchy question (ERP-D-033).
- The named collection/payment methods are Cash, Bank deposit, and InstaPay. Their applicable financial movements are not yet specified (ERP-D-034).
- The owner requests larger batches with simple numbering; the next batch has 12 questions (amended ERP-D-009).

These current-conversation clarifications do not rewrite the original Arabic attachment, its Tawsel D references, or the contract reference commit.

## N. Subsequent ERP clarifications in session 005

- Brand supplies all piece detail/values. ERP sums goods and adds shipping for recipient payment; brand payout deduction base remains subject to a numeric clarification. Partial-delivery permission is configured at brand creation (ERP-D-035).
- Regional tariffs reflect the brand's monthly-volume agreement and are company-admin operations, not developer-support settings. Manual rate cards versus automatic tiers remain unselected (ERP-D-036).
- Inspection is a clear choice, separate from comments (ERP-D-037).
- Cash, Bank deposit, and InstaPay apply to brand payout. The owner's term transliterated as tahseel is reserved for that movement; recipient payment and driver remittance use distinct terms. Canonical technical fields are not renamed (ERP-D-038).
- Driver remittance is due after each round; actual money receipt is separate from Tawsel's explicit round closure (ERP-D-039).
- Each brand has agreed payout weekdays configured on creation (ERP-D-040).
- Registration asserts physical receipt into the receiving branch's parcel inventory. No routine inter-branch transfer is required (ERP-D-041/042).
- Barcode/labels, bulk Excel intake, and the brand portal are deferred. This does not remove stable shipment IDs or decide report/export requirements (ERP-D-043/044/045).
- The owner supplied the public Tawsel repository link; opening its landing page did not change the pinned contract reference or initiate a completion/code review.

Sections K-N are earlier conversation snapshots. The main decision/question registers track current answers and open issues. The imported Tawsel A-F rules remain scoped as originally recorded.

## O. Subsequent ERP clarifications in session 006

The latest owner correction explicitly supersedes the ready-parcels-only exclusion in section M / ERP-D-030. ERP-D-046 adds company packing and fulfillment from stored brand stock; packing changes shipping price, and storage has monthly per-brand charges. Original ready-parcel receipt-on-registration remains, but creating an order from existing stock must not manufacture another receipt. Routine branch transfers remain excluded.

ERP-D-049 confirms goods 250 + shipping 50 = recipient 300, company 50, brand credit 250. Automatic monthly-volume tiers, governorate plus optional area override, and new-order-only price changes are selected. Actual brand payout requires actual driver remittance; partial payouts, optional electronic reference without images, and reasoned unresolved remittance differences are approved.

Driver salary/commission/both, deductions, and advances are now in ERP discovery scope. Actual return-to-brand handover is required. Visited refusal versus unvisited postponement charging is described, but repeated visits, no-answer after arrival, and reason capture remain open. No canonical Tawsel reason field or fabricated no-answer charge is inferred.

ERP-V2 was UI-only reference material in session 006; that session's no-sidebar/no-top-bar wording and shadcn/ui + Smooth UI choices were recorded. Session 007 below clarifies navigation and authorizes focused HR workflow review. None of these ERP refinements changes imported Tawsel authority, the pinned contract, or the historical source bytes.

## P. Subsequent ERP clarifications in session 007

- A simple utility/back top bar is accepted. Global system-module tabs, sidebar navigation and crowded choices remain excluded; use focused pages (ERP-D-062).
- Staff manually assign the brand's agreed tier. Automatic tier progression/reset is explicitly superseded; counts remain analytics/reports. Geographic tariffs and new-order-only price changes remain (ERP-D-063).
- Goods prepaid directly to the brand leave shipping due to the driver; all prepaid including shipping leaves zero driver due and a commercial shipping debit against the brand. Do not duplicate prepaid goods proceeds or invent driver remittance (ERP-D-064).
- Multiple enabled services with a default/per-order choice, a fixed per-brand packing increment, variant quantities, shortage-blocked confirmation and inspected-return restocking are selected (ERP-D-065/066/068).
- Storage agreements are configured and editable per brand; storage is paid separately. The fixed versus measured billing basis remains partially unanswered (ERP-D-067).
- Each actual visit, including no-answer and another actual visit, earns shipping. Uncollected shipping is charged to the brand. The driver's reason must originate in Tawsel and flow to ERP; required future contract changes are consolidated in TAWSEL-CHANGE-REQUESTS.md (ERP-D-069/070).
- Commission excludes packing. Simple HR covers all employees and does not require Tawsel driver onboarding. The owner requested HR reference review; exact fields, additions, payout and commission input rules still need agreement (ERP-D-071/072).

These are explicit ERP conversation amendments, not changes to the original source attachment or currently adopted Tawsel contract. Full translated answers and current questions live in the main discovery records.

## Q. Subsequent ERP clarifications in session 008

- Storage is a fixed monthly agreement with anniversary periods, e.g. 20th to following 19th. Each brand has an option to allow a negative balance; disabled-option gating remains to be defined (ERP-D-073/074).
- Recipient-to-brand deposit administration is outside ERP scope; brand supplies final delivery amounts. Existing exact outstanding piece/shipping requirements and full-prepaid cases remain. Packing is a fixed service-price uplift independent of repacking, without per-packing-operation billing (ERP-D-075/076).
- Driver refusal reasons use codes plus typed Other. The future catalog transport and reason fields remain in the consolidated Tawsel change request, not the adopted baseline (ERP-D-077).
- Commission is calculated automatically from ERP driver work, earned regardless of brand payment, and displayed separately from salary with a combined total. Fixed monetary amount versus earlier percentage and earning unit remain expressly unresolved (ERP-D-078).
- Simple HR includes manual bonus/overtime additions, partial payments, manually recorded advance repayment without automatic recovery, net-zero/deficit carry, and immutable paid/past months with permitted current-unpaid/future adjustments. Work days/hours and weekly day off are profile fields; no attendance payroll is inferred (ERP-D-079 through ERP-D-084).

Original Tawsel authority and prior decision provenance remain unchanged. These refinements do not authorize implementation or upgrade the canonical contract.

## R. Subsequent ERP clarifications in session 009

- Independent salary and commission sections support either or both. Commission chooses percentage of base shipping or fixed money per actual eligible visit, earned by that visit's performing driver (ERP-D-085/086).
- Partial salary payout is removed; early employee money is an advance. Recorded advances reduce payroll net: 6,000 salary minus 1,000 advance means 5,000 final payout. These explicitly supersede ERP-D-080/081. Partial brand payout, zero-net/residual carry and paid/past calculation protection remain (ERP-D-087/088).
- No-negative-balance brands may be physically received, but new driver handover is blocked without sufficient cover. Storage is payable at period start, actual payment is manually recorded, and renewal continues until stopped even with temporary zero stock (ERP-D-089/090).
- Stock confirmation reserves quantity; company preparation requires explicit completion; pre-handover cancellation records a reason and releases reservations without fabricating actual return. Human shipment references use digits only and brand references are optional (ERP-D-091 through ERP-D-094).
- Company custody loss/damage leads to brand compensation. Driver-held damage can be charged fully to the driver or split with the company. Valuation, timing, replacement and recovered goods require focused discovery; ambiguous warehouse wording is not silently interpreted as a brand charge (ERP-D-095).
- The owner requests detailed report filters and a candidate menu for selection. The initial 3 branches, 10 drivers and 150 orders/day are provisional estimates, not real operating data (ERP-D-096/097).

These are conversation amendments. Historical sections remain snapshots, and neither the original attachment nor the adopted Tawsel contract has been changed.

## S. Subsequent ERP clarifications in session 010

Date: 2026-10-01. These are current ERP owner answers, not changes to the original Tawsel decision source.

- Company pays the brand for warehouse loss. Compensation covers only affected goods value, excluding shipping; partial damage covers affected pieces only. Confirmed compensation is a positive, eligible brand wallet movement under its existing payout schedule, independent of driver recovery (ERP-D-098/099).
- Do not add the proposed compulsory intake valuation detail for fully prepaid compensation. The owner wants the ordinary positive compensation entry. Incident-time numeric amount input still needs a narrow clarification; fully prepaid delivery remains supported (ERP-D-100).
- The driver's approved share is an ordinary salary deduction. Brand and employee screens should use clear signed movements, balances, payout actions and period histories, while retaining different business meanings and the existing payroll/brand payout rules (ERP-D-101).
- Linked replacement entry is conditionally accepted if simple and visually clear. Propose the ordinary new-shipment form with a visible original reference. Staff select replacement shipping liability per incident. Dedicated found-after-compensation processing is outside V1 and settled between company and brand outside ERP (ERP-D-102 through ERP-D-104).
- Incident reporting precedes explicit confirmation of compensation and responsibility allocation; there is no mandatory new job role or second approver (ERP-D-105).
- Reports need screen, Excel and print/PDF outputs. Selected catalog items are 1, 5, 7, 8, 9, 10, 12, 15, 18 and 20, with profit and stock balances most important. Combine 9/10; keep 24/25 as HR records. Manual adjustments belong on a separate operations page, with precise targets still open (ERP-D-106 through ERP-D-109).

Company profit definitions, account/expense inputs, stock-count workflow and adjustment controls remain discovery topics. The selection does not imply a full accounting suite, bank automation or authority to override Tawsel execution.

## T. Subsequent ERP clarifications in session 011

Date: 2026-10-01. These latest ERP answers amend the earlier snapshots above without changing original Tawsel authority or the pinned contract.

- Missing compensation value may be entered by staff at incident confirmation. Company and branch period profit, with separate actual-money position, are selected. Ordinary expenses are recorded only after payment, with their date; unpaid-expense/AP tracking is explicitly excluded. Final profit definitions must retain this limitation (ERP-D-110/111/114).
- Expenses has a dedicated operations page and a separate report, adding REP-14. A single-branch user records against that branch; a multi-branch user chooses an assigned branch. Persist the expense's business branch independently of a shared funding account (ERP-D-112/113).
- Branch cash and named company bank accounts are selected, along with treasury transfers and a separate deposits/withdrawals page. Insufficient-funds blocking is accepted. Focused ERP-V2 source review is now authorized; the reference's transfer lifecycle, role gates and global treasury scopes are not wholesale requirements (ERP-D-115 through ERP-D-117).
- All named adjustment target families are selected: brand, employee, cash/bank, product quantities and parcel discrepancies. Confirmed financial mistakes use linked reasoned correction/reversal with the original retained (ERP-D-118/119).
- The owner clarifies that inventory means a daily search/filter monitoring screen for products and parcels. Actual comparison/counting is done outside ERP; differences use adjustments. Formal count sessions and freezes are excluded, superseding the earlier REP-20 interpretation (ERP-D-120).
- Opening entries are optional and dated, including a zero-start path. Cash/Bank deposit/InstaPay expand to storage, salary/advances and expenses; recipient/driver methods remain separately scoped (ERP-D-121/122).

Exact finance-source reading and differences are preserved in ERP-FINANCE-REFERENCE-NOTES.md. No running application, tests, source repository changes or contract upgrade was performed.

## U. Subsequent ERP clarifications in session 012

Date: 2026-10-02. These ERP choices refine previous snapshots without changing the original Tawsel source or canonical contract.

- Daily inventory uses Products/Parcels views, branch presence by default and explicit driver custody. Product adjustment enters actual quantity; parcel discrepancy identifies its shipment and actual case. A real reservation shortage holds affected pre-handover work (ERP-D-123/124/125/132).
- Transfer creation can choose any company source/destination branch when the screen is granted. Receipt confirmation is a separately granted screen. This is a narrow exception to ordinary branch membership scope; expense scope remains unchanged. Receipt-screen reach and incomplete/returned transfer details remain open (ERP-D-126/127).
- Generic cash movements require deposit/withdrawal direction and optional free-text reason, without mandatory purpose categories. Their profit treatment remains an explicit question (ERP-D-128).
- Expense categories are maintained and addable; actual payment dates may be historical. Employee fixed/manual costs belong to the employee branch; commissions belong to originating shipment/work branch, retaining historical attribution (ERP-D-129/130/131).
- Cash/bank differences remain pending explanation with actual balance visible, then resolve through linked corrections, legitimate movement, company loss or approved employee liability. No automatic loss or penalty is approved (ERP-D-133).

This is discovery, not implementation or final-plan approval. The current registers retain the remaining scope and source-formula questions.

## V. Subsequent ERP clarifications in session 013

Date: 2026-10-02. The owner answered ERP-Q-112 through ERP-Q-123. These are ERP business and operating decisions; the original Tawsel source and canonical contract remain unchanged.

- Generic deposits/withdrawals change account balances and history only, outside operating profit. Their free-text reason remains optional; do not add compulsory purpose categories. Dedicated expense and other operating records supply their financial effects once (ERP-D-134; ERP-R-143).
- A user granted the transfer-receipt screen may confirm transfers for any company branch, matching the separately permissioned company-wide creation screen. Receipt is for the fixed full transfer amount; the owner excludes short-transfer processing. No automatic rejection refund, actual-return workflow or mandatory second person is inferred (ERP-D-135/136; ERP-R-144/145).
- Brand payout weekdays organize work rather than prohibit all off-day payouts. A user with the payout screen may record an off-day payout with a reason, subject to eligible balance and sufficient company funds (ERP-D-137; ERP-R-146).
- Full driver remittance explicitly supersedes the earlier shortage acceptance in ERP-D-056 / ERP-R-057. If eight of ten orders produced recipient payments, the driver must remit that complete reported amount. The owner excludes incomplete remittance, cross-brand allocation and personal-shortage handling from ERP; the driver covers a shortage outside ERP. Confirm only actual full receipt. Unpaid visit fees and zero-recipient-due orders do not become reported cash, and partial brand payouts remain allowed (ERP-D-138; ERP-R-147).
- Overdue storage remains visible and service continues until an authorized explicit stop, without an automatic offset against brand payout funds. A stop prevents the next renewal while preserving the current paid period; no automatic prorated refund is required. Agreed rate changes start next period (ERP-D-139 through ERP-D-141; ERP-R-148 through ERP-R-150).
- One full driver remittance may combine Cash, Bank deposit and InstaPay, with components totaling the complete expected amount. Staff record actual receipt and destination accounts, with optional external references and no proof images. This does not approve automated bank/provider integration or recipient payment methods (ERP-D-142; ERP-R-151).
- Operating profit uses earned shipping including packing uplift plus storage revenue for the service period, less gross salary/commission/additions before advance recovery, paid ordinary expenses and confirmed brand compensation, plus approved employee compensation recovery once. The accepted example is 10,000 + 2,000 - 4,000 - 1,500 - 500 + 200 = 6,200. Keep unreceived amounts and actual company cash visible separately. Brand goods and payouts, generic funding, transfers, advances and final net salary payments do not create another revenue/cost entry (ERP-D-143; ERP-R-152).
- ERP users wait for internet connectivity; no offline ERP order, stock or money writes are required for V1. This does not change Tawsel's own existing offline execution contract (ERP-D-144; ERP-R-153).
- ACID database transactions are explicitly required. Local transaction guarantees must be verified with real database tests later; they do not imply an atomic ERP-plus-Tawsel transaction or replace outbox/inbox, idempotency, replay and reconciliation (ERP-D-145; ERP-R-154).

The original 50 source items and all historical overlays remain intact. No fresh external source review, implementation, runtime test, architecture approval, master plan or phase production occurred. Current questions now move toward the remaining operational, support, technical and launch constraints.

## W. Subsequent ERP clarifications in session 014

Date: 2026-10-02. These owner answers refine current ERP requirements; original Tawsel provenance and the pinned canonical contract remain unchanged.

- Launch is Egypt/EGP. Staff operations must work on desktop and phones; optional recipient location links are allowed. No native/offline ERP requirement follows (ERP-D-146/147/148).
- Ordinary intake shows only assigned branches. Wrong recorded branch and erroneous pieces/quantity/service may be corrected before handover, with history/reviewed effects and without automatic repricing from later tariffs. This does not authorize routine goods transfer or a new Tawsel mutation (ERP-D-149/150).
- Developer support may use business/financial screens with normal rules. Its account stays outside ordinary employee management; actions appear as Technical Support in authorized business history with true actor identity retained (ERP-D-151/152).
- Node.js/PostgreSQL are preferred; the complete-stack recommendation remains pending. Existing Hostinger KVM 2/Dokploy may be shared initially, but ERP deployment must support another host without rewriting business architecture (ERP-D-153/154).
- Produce expected costs without requiring a budget cap. About ten or slightly more simultaneous ERP staff is a provisional estimate. Backups are expected but numerical recovery targets are not selected; provide a bounded proposal and restore evidence plan (ERP-D-155/156/157).

Current technical source research and indicative costs are in ERP-TECHNICAL-OPTIONS.md. No installed server configuration, actual capacity, backup success, implementation or new Tawsel version has been verified by these choices.

## X. Subsequent ERP clarifications in session 015

Date: 2026-10-02. The latest owner answers govern current ERP requirements. The original attachment and earlier overlays remain historical evidence; they do not override these explicit refinements or change the pinned Tawsel contract.

- The owner accepts React/TypeScript/Vite, shadcn/ui with selected Smooth UI, Node.js with NestJS/Fastify, PostgreSQL, a modular backend and a worker from the same codebase. Every implementation phase must include Vitest coverage for important operations, alongside the already required real database, browser and manual checks. This closes the stack-direction question, without approving exact versions, final architecture or every backup proposal (ERP-D-158/159; ERP-R-167/168).
- One brand record and payout wallet are shared across company branches; movements retain branch attribution and stock remains branch-specific. Branches normally consolidate money to the main branch, but the brand may receive its payout at any branch. Authorized payout-screen users may view/pay the shared eligible total for accessible brands, with a branch breakdown and normal funding-account/funds controls. Concurrent payouts must not spend the same eligibility twice. Automatic sweeps and a main-branch-only payout restriction are not implied (ERP-D-160/161; ERP-R-169/170).
- The new wording about dispatch from a closer branch does not silently supersede the earlier exclusion of routine physical shipment transfers. ERP-Q-148 asks whether the brand supplies the appropriate branch directly or whether physical transfer between branches is now required. Ordinary intake remains limited to the employee's assigned branches.
- Issuing service invoices and tax/e-invoice integration are deferred beyond V1. Selected statements/reports remain. One order is one shipment/reference, recipient and address with its pieces; it is not divided between two drivers. Partial delivery and later legitimate retry/redispatch remain supported (ERP-D-162/163; ERP-R-171/172).
- Payroll uses calendar months; daily reports use Africa/Cairo midnight-to-midnight. A round may cross midnight without being split, and storage retains its anniversary period. If ERP is online while Tawsel is unavailable, intake/preparation may continue, but driver handover awaits required accepted synchronization with clear pending/retry status (ERP-D-164/165; ERP-R-173/174).
- Answer 8 requests verification and explanation of Tawsel corrections; it does not approve or reject an ERP post-settlement adjustment policy. Existing Tawsel `outcome.correct` changes effective driver-reported facts within contractual limits, and `outcome.corrected` reports the change. It does not modify ERP treasury, remittance, payroll, brand payouts or refunds. ERP-Q-143 remains open after the focused explanation in ERP-TAWSEL-CORRECTION-REVIEW.md; the full-driver-remittance rule remains intact.
- Refusal reasons become a fixed product-level list defined in ERP and used consistently across company deployments. This replaces the proposed company-editable add/disable catalog direction. The previously agreed driver entry in Tawsel and code-plus-Other representation remain. ERP-Q-149 covers the exact list, use for rejected pieces in partial delivery and required Other detail. Existing reason-field contract work remains necessary; a dynamic catalog-management endpoint is no longer assumed (ERP-D-166; ERP-R-175).
- Commission-rate changes apply to work from their effective date, preserving earlier visit rates. Late events use the authoritative work time, not arrival time. Business/audit history has no automatic V1 deletion; referenced master records are deactivated with history retained (ERP-D-167/168; ERP-R-176/177).
- Implement and verify the full agreed V1 scope, including all three services. The unknown first customer's service mix must not narrow scope or remain a discovery prerequisite. This does not bypass plan review/approval before phases and implementation (ERP-D-169; ERP-R-178).

Remaining narrow owner questions include the shared-brand storage-income branch attribution (ERP-Q-150) and tariff fallback/missing-price behavior (ERP-Q-151), alongside ERP-Q-143/148/149. These do not reopen the fixed subscription amount, shared wallet, manual tier selection, full remittance or the approved service scope. No implementation, runtime test, final master plan or phase files were produced by this overlay.

## Y. Subsequent ERP clarifications in session 016

Date: 2026-10-03. These owner answers amend the current ERP scope. Earlier sections remain historical snapshots; the original source provenance and pinned Tawsel contract remain unchanged.

- The owner accepts the explanation of existing bounded Tawsel corrections and recalls the earlier Tawsel choice. A permitted correction changes the effective driver report, not ERP money records. For the remaining ERP policy, the owner suggests a queue/retry approach and asks for a recommendation. ERP-Q-143 remains open: this is not approval of automatic settlement adjustment, refunds or rewriting completed payments. Existing durable delivery/replay requirements remain separate from the unresolved handling of a genuine financial difference.
- Physical branch-to-branch transport is now expressly required in V1, superseding ERP-D-042 / ERP-R-043. The new screen transfers a complete shipment or loose brand-stock quantities, assigns an available driver and records actual receipt confirmed at the destination branch (ERP-D-170; ERP-R-179). The new requirement is broader than correcting a wrongly recorded branch. It does not split one commercial shipment across drivers, change brand ownership or turn shared brand funds into branch-specific wallets.
- Pending/in-transit goods must be distinguishable from branch availability, but exact transfer lifecycle, eligibility/reservation, grouping, driver interaction, branch permission scope, fees/commission and receipt/cancellation exceptions remain under discovery. ERP-Q-152 through ERP-Q-158 cover the next transfer questions. Company-wide treasury-transfer permissions and full-money receipt rules do not automatically apply to physical goods. Current Tawsel returns still target the original dispatch branch; any different supported execution requirement needs an explicit contract comparison or change request.
- The owner adds missing pieces and no answer after arrival to the proposed fixed reason list (ERP-D-171; ERP-R-180). Preserve canonical no-answer semantics rather than recording recipient refusal or fabricated payment. Required Other detail and partial-refusal applicability remain ERP-Q-149. Driver entry remains in Tawsel under the existing decision, with compatible reason-field extensions still to be specified.
- Adopt the recommended storage revenue attribution: select one responsible branch on the storage agreement, independently of where payment is recorded. A brand storing at multiple locations still has its agreed single subscription without duplicate fees (ERP-D-172; ERP-R-181). ERP-Q-150 is closed; exact service-period allocation remains engineering design.
- A valid applicable shipping price is mandatory before the commercial operation can succeed. If pricing is missing or invalid, block the entire operation and its side effects; preserving entered form data does not record a successful order, receipt or reservation (ERP-D-173; ERP-R-182). ERP-Q-151 is closed. Governorate base plus an optional area override remains the agreed lookup rule; an absent optional override alone is not a missing price.

The next prepared owner batch contains eight questions: ERP-Q-143 and ERP-Q-152 through ERP-Q-158. Existing report selections, paid-period protection, full driver remittance and original Tawsel authority remain intact. This overlay records discovery only; no implementation, runtime test, final master plan or phase files are produced.

## Z. Subsequent ERP clarifications in session 017

Date: 2026-10-03. The latest owner answers settle the main physical-transfer workflow and correction-review policy. The 50 imported source items, original source provenance, prior historical overlays and pinned Tawsel contract remain unchanged.

- ERP-Q-143 is closed by ERP-D-174 / ERP-R-183. The owner accepts automatic duplicate-safe retry, suspension of affected payout eligibility when a known synchronization gap remains, and an existing Settlements review queue for accepted corrections that conflict with already posted money. Original movements remain intact and any resolution is authorized and linked. This does not authorize automatic refunds, global payout freezes, paid-history rewrites or a guarantee that an empty queue excludes unseen corrections. Exact readiness checks and adjustment transactions remain design work.
- ERP-Q-152 is closed by ERP-D-175 / ERP-R-184. Inter-branch transport uses ERP staff assignment and actual handover recording, followed by actual destination staff receipt in ERP. The proposed Tawsel driver transport surface is not selected. Existing customer-shipment synchronization, source identity/revisions, locks, later dispatch and returns still require precise contract compatibility; ERP-only transport does not authorize an unsupported Tawsel mutation.
- ERP-Q-153 is closed by ERP-D-176 / ERP-R-185. One transfer can contain several whole shipments and loose brand/product/variant stock quantities, including different brands, for one source, destination and assigned driver. Update inventory/location on the appropriate real custody confirmation. Source handover is distinct from destination receipt, and in-transit goods are not available at both branches. Preserve shipment identities and brand ownership; no splitting of a commercial shipment is approved.
- ERP-D-177 / ERP-R-186 add an explicit searchable shipment-history requirement: show what happened, current whereabouts/custodian and current state. The supplied mobile timeline establishes the visual direction described in [ERP-UI-REFERENCE-NOTES.md](ERP-UI-REFERENCE-NOTES.md), including the preserved reference asset. It does not adopt a numeric progress percentage, ETA, weight/dimensions, USD, prefixed reference or new settings behavior. Numeric shipment references and Egypt/EGP remain. This is operational detail, not a newly selected report; visibility is ERP-Q-162.
- ERP-Q-154 is closed by ERP-D-178 / ERP-R-187. Transfer only eligible goods physically held at the source; loose stock is usable and unreserved, and prepared orders move as whole shipments. Reserve selected contents against competing order, dispatch or transfer use. Driver-held, damaged or uncertain goods do not become available through a transfer selection.
- ERP-Q-155 is closed by ERP-D-179 / ERP-R-188. Senders act from assigned source branches to another company branch; receivers act only for assigned destination branches. A user assigned several branches selects among them, and the receiving list/filter covers those branches. The same effective screen permissions apply across assigned branches, with server-side company/branch/state checks. No manager-title override, branch-specific capability exception or distinct-person requirement is introduced. Company-wide treasury permissions remain a separate explicit exception.
- ERP-D-180 / ERP-R-189 resolve the driver-pay portion of ERP-Q-156: inter-branch transport is covered by salary, without additional transfer commission. Whether the brand is charged remains open. The owner did not select new transport revenue, recipient-visit commission or a compensation-model change.
- ERP-Q-157 is closed by ERP-D-181 / ERP-R-190. Record actual received quantity and condition: sound received stock becomes available, damaged received stock stays unavailable, and missing quantities remain unresolved pending investigation. Established incident confirmation decides any compensation or employee liability; neither is automatic. Whole-parcel opening and planned multiple trips remain separate questions.
- ERP-Q-158 is closed by ERP-D-182 / ERP-R-191. Before actual driver handover, cancellation releases the transfer reservation. After handover, goods remain in transit/custody until actual destination receipt or actual return receipt at the source. A cancellation button cannot restore stock without a physical receipt.

Remaining transfer questions are brand charging (ERP-Q-156), eligible carrier pool (ERP-Q-159), assignment concurrency (ERP-Q-160), previously attempted/returned shipments (ERP-Q-161), tracking search visibility (ERP-Q-162), whole-parcel opening (ERP-Q-163) and planned multiple trips (ERP-Q-164). Do not repeat questions about the already accepted ERP-only execution, grouping, eligibility, branch authority, salary coverage, discrepancy policy or custody-safe cancellation.

The 28-item report catalog and its selected set remain unchanged. No implementation, UI mockup, runtime test, final master plan, phase production or Tawsel-baseline change is claimed by this overlay.

## AA. Subsequent ERP clarifications in session 018

Date: 2026-10-03. The owner answers the seven remaining transfer and tracking questions. These are current ERP decisions; the original 50 source items, historical overlays and pinned Tawsel contract retain their provenance.

- ERP-Q-156 is closed by ERP-D-183 / ERP-R-192. Inter-branch transport is an internal company movement without a charge to the brand. Existing salary coverage remains; completing a transfer creates neither shipping revenue nor additional driver commission.
- ERP-Q-159 is closed by ERP-D-184 / ERP-R-193. Staff may select an eligible active company operational driver, including one associated with another branch. Present source-branch drivers first while retaining cross-branch selection. This does not turn every HR employee into an operational driver or create a new Tawsel identity automatically.
- ERP-Q-160 is closed by ERP-D-185 / ERP-R-194. A driver may carry an ERP inter-branch transfer while executing a customer-delivery round. Prioritize drivers shown at the branch and outside a round; show the current-round status during selection so staff can choose knowingly. Source and freshness of activity evidence remain explicit engineering concerns: do not infer exact physical presence from an HR branch assignment, an old event or a navigation link. ERP-only transport does not create a Tawsel transport task, alter its route automatically or claim a cross-system occupancy lock.
- ERP-Q-161 is closed by ERP-D-186 / ERP-R-195. Permit transfer of an intact customer shipment after an actual eligible return receipt, followed by customer dispatch from the receiving branch. Preserve its numeric shipment reference, original recorded price, previous attempts and full history. TAWSEL-CHECK-003 must establish the exact source identity, revisions, relocation, subsequent dispatch and return-branch behavior. The owner's requirement is approved; compatibility with the pinned Tawsel contract remains under verification rather than being declared categorically supported or unsupported.
- ERP-Q-162 is closed by ERP-D-187 / ERP-R-196. A user with the tracking screen may search all company shipments and see each shipment's complete operational journey, including previous and current branches, custodian and state. This explicitly rejects the proposed restriction to shipments connected with the user's assigned branches. The owner's example is a branch answering where a shipment previously held there is now. This grants company-wide operational tracking visibility, not access to unrelated financial records or permission to mutate another branch's work. Goods sending/receiving retains its assigned-branch rules.
- ERP-Q-163 is closed by ERP-D-188 / ERP-R-197. Receive a sealed whole shipment by checking its identity and exterior condition; count loose stock by quantity. Do not require opening every sealed parcel or treat external inspection as proof of every internal piece. A suspected internal shortage or damage follows the existing recorded incident and confirmation workflow.
- ERP-Q-164 is closed by ERP-D-189 / ERP-R-198. Each physical trip has its own transfer manifest. Additional trips use separate manifests, with linking where useful. An unexpected shortage remains an actual receipt discrepancy under the approved policy, rather than an implied planned later delivery of the same manifest.

All seven questions in the previous displayed batch are closed. The next prepared batch contains five narrower proposals; none is adopted by this overlay:

1. ERP-Q-165: attribute each actual visit's shipping revenue, including its agreed packing uplift, to the branch dispatching that customer-delivery work after any transfer. Internal transport itself remains free to the brand. This is a proposed revenue rule; earlier decisions already settle employee-cost and storage-revenue attribution.
2. ERP-Q-166: let responsible staff enter the agreed first/last-month salary when an employee starts or leaves partway through a month, using current unpaid-period rules rather than adding attendance or automatic salary proration.
3. ERP-Q-167: preserve the original storage anniversary day; use the last day of a shorter month when necessary, then return to the original day in a later month. The proposed calendar rule does not change the fixed subscription amount or create a prorated refund.
4. ERP-Q-149: apply the fixed reasons to rejected portions of partial delivery and require written detail for Other. Only these remaining validation/applicability choices are pending; the accepted list and its two additions are not reopened.
5. ERP-Q-168: close the repeated-visit tariff example explicitly. With base shipping 50 and packing uplift 5, recommend a company commercial fee of 55 for each actual eligible visit and a percentage-commission base of 50 each time, rather than charging the uplift only once. No separate repacking action fee is proposed. This is still a proposal; recipient money and the supported outstanding-price snapshot remain distinct from the company's earned fee.

Further source-contract coverage, exact financial posting and recovery, version compatibility, deployment and acceptance design remain planner work. These requirements do not authorize a final master plan, phase production or implementation before the agreed review sequence. No runtime test, live UI verification or Tawsel-baseline update is claimed by this overlay.

## AB. Subsequent ERP clarifications in session 019

Date: 2026-10-03. The owner answers all five questions from the preceding batch. The 50 imported source items, original provenance, historical overlays and pinned Tawsel contract remain unchanged.

- ERP-Q-165 is closed by ERP-D-190 / ERP-R-199. Attribute each actual customer-delivery visit's complete shipping revenue, including the agreed packing uplift, to the branch dispatching that work. When branch A registers/packs a shipment and branch B dispatches it to the recipient after an internal transfer, the visit revenue belongs to B. Preserve the historical work branch per visit. This is report attribution; it does not add a charge for the internal transfer or alter employee-cost and storage-agreement attribution.
- ERP-Q-166 is closed by ERP-D-191 / ERP-R-200. The owner rejects the proposed special first/last-month salary override and automatic proration. Keep the configured salary, let the responsible person calculate the required reduction manually, record it as an ordinary deduction and pay the resulting net. Preserve the reason, actor, period and salary/commission/deduction breakdown. Existing current-unpaid-period authority, paid/past-period protection, net-zero/carry behavior and single net payout remain. This does not revoke legitimate current-unpaid or future salary-setting changes for other reasons.
- ERP-Q-167 is closed by ERP-D-192 / ERP-R-201. Preserve the original storage anniversary day. When a shorter month lacks that day, renew on the month's last day, then return to the original day when it next exists: January 31, the last day of February, March 31. The agreed fixed subscription amount remains unchanged; no automatic proration or refund is introduced.
- ERP-Q-149 is closed by ERP-D-193 / ERP-R-202. Apply the same fixed product reason list to rejected portions of partial delivery, and require written detail for Other. Driver entry in Tawsel remains selected. The missing-pieces reason does not itself confirm loss or compensation, and no answer after arrival retains its distinct outcome and arrival evidence. Wire representation, including the placement and granularity of partial reasons, remains design work in TAWSEL-CR-001.
- ERP-Q-168 is closed by ERP-D-194 / ERP-R-203. With base shipping 50 and packing uplift 5, the complete company tariff is 55 for each actual eligible customer visit. The percentage-commission base remains 50. There is no separate repacking action counter or once-per-shipment uplift in this repeated-visit example. Preserve the distinction between the company's earned fee and money actually reported received; the later-recipient-amount mapping remains TAWSEL-CHECK-002, not an assumed new Tawsel pricing operation.

All five questions in the preceding batch are closed. The 28-item catalog and chosen report set remain unchanged. Remaining contract verification, precise posting and recovery transactions, deployment and acceptance design are planner work; this overlay neither advances the Tawsel baseline nor authorizes implementation or phase production. No new source review, application execution or runtime test is claimed.

## AC. Subsequent ERP clarifications in session 020

Date: 2026-10-03. ERP-D-195 / ERP-R-204 exclude the prior-attempt shipping-payment scenario asked in CHECK-002. This closes that selected-scope check without verifying its contract formula or revoking prepaid-to-brand cases.

ERP-D-196 / ERP-R-205 reaffirm ERP-managed carrier transfer and stock/custody updates after actual destination confirmation. The earlier ERP-D-186 subsequent customer-redispatch commitment is qualified pending internal scope/lifecycle reconciliation: neither its withdrawal nor Tawsel compatibility is established by this answer. CHECK-003 is internal design review, not a repeated owner questionnaire.

ERP-D-197 / ERP-R-206 prioritize making the intended UI concrete before implementation phases and avoiding late redesign. UI-DESIGN-BRIEF.md proposes rendered samples, an interactive prototype, explicit visual review and shared specifications/components referenced in later prompts. No final theme, rendered screen, prototype, master plan or phase is approved by this request. Existing visual sources and contract baseline remain unchanged.
