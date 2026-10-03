# ERP Discovery Log

Current authority, session025 (2026-10-03): ERP-D-205 / ERP-R-214 approve PLAN-001 and authorize phase authoring. Detailed plan mechanics below are adopted; original proposal/review wording is retained as drafting provenance, not a renewed approval gate. External contract gaps, unverified runtime targets and the unnamed palette remain explicitly limited. No production implementation is authorized by this authoring turn.

Updated: 2026-10-03, session 024. This is an English record of an Egyptian Arabic discovery conversation.

## Current state

Session023 creates the detailed PLAN-001 owner-review package in master-plan.md and linked domain, data/transaction, screen, architecture/operations, integration and traceability documents. The owner asks to begin the plan/phases with enough detail to prevent invented product behavior, and points to Tawsel docs as a quality reference. Session024 closes ERP-Q-171..175 with explicit choices under ERP-D-200..204 / ERP-R-209..213: shipping cover, all storage revenue in the start month, typed employee-cost deductions, company-funded replacement-shipping waiver, and partial/advance storage payments. The detailed plan still requires owner review before implementation-phase prompts. Storage-credit allocation/refund mechanics and remaining engineering recommendations remain labeled plan proposals.

Session 022 explicitly approves the displayed UI-REV-001 layout and design direction (ERP-D-198) and requires advanced filters in later phases (ERP-D-199). The sample under [ui-preview/](ui-preview/README.md) covers module landing, assigned-branch inventory, company-wide tracking and shipment detail. Its existing build/browser observations remain recorded in [UI-REVIEW-LOG.md](UI-REVIEW-LOG.md). The specific palette variant and detailed unreviewed journeys are not inferred from this approval. [UI-DESIGN-BRIEF.md](UI-DESIGN-BRIEF.md) now binds later UI work to the accepted direction. This sample does not implement real transactions or Tawsel integration.

Session020 scope clarifications still govern: exclude the specific previous-attempt shipping-payment scenario raised in CHECK-002 while retaining prepaid-to-brand cases. Reaffirm ERP-only carrier transfer and inventory changes after destination receipt; CHECK-003 remains internal lifecycle/scope reconciliation, with no claimed Tawsel mapping or silent removal of the earlier subsequent-dispatch requirement. The owner's immediate priority remains a reviewable UI before implementation phases.

The owner is the developer and product decision-maker for a new shipping ERP integrating with the existing completed Tawsel system. Initial delivery is separate per company; SaaS is a future ambition. Session 006 explicitly expands service scope to ready parcels, company-packed orders, and stored brand stock with order preparation/packing/shipping. The old ready-parcels-only exclusion is superseded. Ready-parcel registration still asserts branch receipt; orders from already received stock need separate preparation semantics. Session 016 explicitly includes physical inter-branch transfer of whole shipments or stock quantities through an assigned driver and destination receipt, superseding the former exclusion. Brand remains the direct commercial customer.

Company operations manually assign each brand its negotiated tariff tier; session 007 explicitly replaces automatic tier selection. Counts remain analytics/reports. Governorate rates, optional area overrides and new-order-only tariff changes remain. Packing is a fixed negotiated increment per brand included in shipping; commission excludes it. Storage has an editable per-brand monthly agreement and is paid separately. Multiple allowed services with a per-order choice/default are approved. Variant stock, shortage-blocked confirmation and restocking only after actual receipt/inspection are settled.

Unpaid goods 250 plus shipping 50 produce recipient payment 300, company shipping 50 and brand credit 250. If goods were paid directly to the brand, only outstanding shipping is paid to the driver; if shipping was also prepaid to the brand, driver payment is zero and shipping is debited from the brand account. Each actual visit normally earns shipping, including no-answer and repeat visits; unpaid fees are borne by the brand. ERP-D-203 adds the explicit company-funded replacement-shipping waiver exception, preserving actual goods due and normal commission. Real driver-held proceeds still require actual remittance before payout; a zero-due order has no fictitious remittance gate. Partial brand payout and Cash/Bank deposit/InstaPay on agreed weekdays remain. Driver remittance is after each round; ERP-D-138 now requires the full exact actual recipient-money total and supersedes the earlier driver-shortage policy. Mixed methods may form one full receipt.

Prior decisions retain modular screen access, one role/user exceptions, multi-branch scope, ERP dispatch/native return receipt and Tawsel authority. Barcode/labels, Excel intake, brand portal and invoice/tax integration remain deferred. A simple utility/back top bar is allowed while global system-module tabs, sidebar navigation and crowded pages are excluded. The focused ERP-V2 reviews are complete within their recorded limits; only explicitly selected reference features are included. Driver-entered refusal reasons require the documented extension in TAWSEL-CHANGE-REQUESTS.md, now using a fixed product-level list. Core compensation/loss, preparation, storage and payout choices are settled below. The application stack and UI layout direction are approved. PLAN-001 now proposes concrete corrections, allocation/precision, integration, deployment and recovery design with explicit remaining choices; it awaits owner review. Production ERP implementation and phase prompts have not begun.

Session 009 current refinements: independent salary and commission sections support either or both; commission is configured as a percentage of base shipping or a fixed amount for each actual eligible visit, attributed to its performing driver. Partial salary payout is removed; early employee money is an advance. Recorded advances reduce the applicable month's net, superseding separate-manual-repayment-only recovery. Zero-net/residual carry, paid/past calculation protection, manual additions and work-schedule fields remain. Partial brand payout remains allowed. Storage is payable at the beginning of each anniversary period, recorded manually when received, and renews until explicitly stopped even with temporarily empty stock. The no-negative-balance rule blocks new driver handover while preserving actual intake and already incurred charges. Confirmed stock orders reserve immediately; company preparation requires completion before handover; pre-handover cancellation releases reservations without inventing a physical return. Human shipment references are numeric; brand references are optional. Session 010 further resolves compensation basis, eligibility and salary recovery; replacement linking is conditionally accepted if simple, and dedicated found-after-compensation processing is excluded. Selected reports and output formats are recorded below. The provisional pilot estimate is 3 branches, 10 drivers and 150 orders/day, not observed demand. Earlier session narratives preserve history; these latest choices govern current discovery.

Session 010 current refinements: confirmed goods-only compensation for affected items credits the brand payout wallet independently of driver recovery; the approved driver share is an ordinary salary deduction. Reporting an incident does not post those entries until explicit confirmation. Use simple signed balances, period histories and payout actions, preserving movement identity and existing payout rules. A linked replacement is conditionally accepted with simple ordinary entry; its shipping payer is chosen per incident. Found-after-compensation processing is outside V1. The selected report set is 1, 5, 7, 8, 9, 10, 12, 15, 18 and 20, with 15/18 most important; combine 9/10 and keep 24/25 inside HR. Screen, Excel and print/PDF are required. Manual adjustments have a separate page whose targets/correction rules remain open. No compulsory additional intake valuation field, accounting suite or automatic bank service is inferred. Session 011 below records the latest finance and inventory refinements.
Session 011 current refinements: staff enter a missing agreed compensation amount at confirmation. Company/branch period profit and separate actual cash position are accepted, with manual expenses recorded only after actual payment; unpaid ordinary expenses are not tracked or represented as known zero cost. Expense operations and REP-14 reporting are included, with branch attribution from the user's assigned branches. Branch cash/named company bank accounts, transfers, deposits/withdrawals, insufficient-funds blocking, all named adjustment targets and linked corrections are selected. Transfer lifecycle, general cash purposes and detailed adjustments remain open. Inventory is daily monitoring of products and parcels; physical comparison is outside ERP, and formal count sessions/freezes are excluded. Current selected reports are 1, 5, 7, 8, 9, 10, 12, 14, 15 and 18. Opening entries are optional. Payment methods expand to storage, employee salary/advances and expenses. Focused ERP-V2 finance source findings and limits are in docs/discovery/references/ERP-FINANCE-REFERENCE-NOTES.md.
Session 012 current refinements: daily inventory uses separate Products and Parcels views, defaulting to actual branch stock with explicit driver-custody visibility. Product adjustments enter actual quantity; parcel adjustments identify a shipment and the legitimate incident/correction. Reservation shortages hold affected pre-handover work. Treasury sending and receipt confirmation are separate screens; creation permits any source/destination branch within the company, a narrow exception to ordinary assigned-branch scope. Generic deposits/withdrawals require direction and an optional reason, with no compulsory purpose classification. Expense categories are addable, actual payment dates may be historical, and employee costs have approved branch attribution. Cash discrepancies remain pending explanation, without automatic loss or employee deduction. Profit treatment of generic cash entries, remittance allocation and remaining transfer/storage rules are under discovery.

Session 013 current refinements: require full exact driver remittance, explicitly replacing the earlier partial receipt/shortage policy. Expected money is actual reported recipient payments for the round, not all assigned shipment values. Mixed Cash/Bank deposit/InstaPay components may form one complete receipt. Partial remittance allocation and partial treasury-transfer receipt are excluded; partial brand payout remains allowed. Both transfer screens apply across company branches. Off-day brand payout is allowed with reason and normal eligibility/funds checks. General deposits/withdrawals are outside operating profit, and the proposed business-source profit formula is accepted. Storage overdue agreements continue pending explicit stop; stopping preserves the paid period and cancels next renewal, with price changes from the next period. ERP operations are online-only, with explicit ACID transaction requirements and real database verification. Existing broader treasury discrepancy review remains; it does not restore excluded driver-shortage handling.

Session 014 current refinements: launch is Egypt/EGP, with staff operations usable on computers and phones. Recipient location links are optional. Intake shows only assigned branches; pre-handover erroneous branch/piece/service entry can be corrected explicitly with history and reviewed effects. Developer support may use business/financial screens and appears as Technical Support in business audit while its account remains outside ordinary employee management. Node.js/PostgreSQL are preferred pending a complete-stack recommendation. Existing Hostinger KVM 2/Dokploy may initially host ERP beside Tawsel, but the deployment must move to a separate server without changing business architecture. Produce cost estimates without waiting for a budget cap. Concurrent staff estimate is about ten or slightly more. Backups are expected; propose a concrete restore policy without inventing an agreed zero-loss or recovery-time target.

Session 015 current refinements: the proposed React/TypeScript/Vite, shadcn/Smooth UI, Node/NestJS/Fastify, PostgreSQL modular backend/worker stack is approved. Vitest must cover important operations in every phase. A brand has a shared company wallet and can be paid at any branch; cash normally consolidates to the main branch, with normal transfer/funds rules. Shared-wallet payout visibility is approved. Service invoices/tax integration are deferred. One order is one shipment; payroll is calendar-month based and reporting uses Africa/Cairo calendar days. ERP intake/preparation may continue during Tawsel outage while handover waits for required acceptance. Refusal reasons are a fixed product list rather than a company-editable catalog. Commission changes apply prospectively; history is retained. Full agreed scope must be covered without further first-customer service questions. The owner's challenge to Tawsel money correction is a clarification request; ERP-Q-143 remains unapproved pending a precise explanation of reported facts versus ERP settlement.

Session 016 current refinements: actual branch-to-branch goods movement is a new included workflow, with details still open; it is separate from recorded-branch correction and treasury transfer. The owner acknowledges the existing Tawsel correction behavior but proposes a queue/retry approach rather than approving the previous financial-adjustment proposal. The fixed reason list gains missing pieces and no answer after arrival; the latter preserves canonical no-answer plus arrival evidence. Storage income belongs to the chosen storage-agreement branch independently of payment location. Missing applicable shipping pricing blocks the entire commercial commit while preserving uncommitted input. No final plan or implementation is authorized by these refinements.

Session 017 current refinements: ERP staff manage inter-branch transport without a Tawsel transport task. Grouped manifests, actual custody-based inventory updates, usable/unreserved goods, transfer reservations, assigned-branch sending/receiving, salary-covered driver work, actual subset/condition receipt and cancellation safeguards are approved. Multi-branch users choose/filter among all their assigned branches with the same capabilities. Searchable current shipment whereabouts/status/history uses the supplied mobile timeline as its visual reference. Technical retry, scoped known-gap eligibility holds and post-payment difference review are approved; no automatic financial adjustment follows. Brand transfer charging and a few carrier/custody/visibility details remain open.

Session 018 current refinements: goods transfer is internal and free to the brand. Any eligible company driver may be selected, preferring known at-branch/no-round drivers and showing ongoing round status; carrying a transfer during a Tawsel delivery round is allowed. Eligible returned shipments may relocate after actual receipt for a new customer dispatch from the destination; exact source-branch contract semantics still need targeted verification. Shipment tracking explicitly searches all company shipments and shows full operational history, while mutation/financial authority stays scoped. Sealed parcels receive identity/exterior checks, loose stock is counted, and each planned physical trip uses its own manifest.

Session 019 current refinements: the customer-dispatch/work branch receives the complete visit service revenue including packing uplift. Partial employment months use the configured salary and a manually calculated/recorded deduction before net payout. Storage keeps its original anniversary, clamped only in shorter months. Fixed reasons also cover rejected portions of partial delivery, and Other requires text. The complete base-plus-packing tariff applies to every actual eligible visit. The closure review found no further blocking business choice in the remaining list; detailed planning and selected-contract verification remain, including the two specific Tawsel semantic clarifications and the known reason-field extension.

Companion records: [decisions](ERP-DECISIONS.md), [open questions](ERP-OPEN-QUESTIONS.md), and [English prior-owner decision reference](docs/discovery/references/ERP-PRIOR-OWNER-DECISIONS.en.md).

## Evidence types and precedence

1. **Current owner answer/decision:** explicit choices in this conversation. Record an English translation without adding detail.
2. **Prior approved owner decision:** supplied through the owner-authorized prior-decision attachment; retain item ID and original Tawsel D references. Do not reconfirm already settled choices.
3. **Tawsel contract fact:** external boundary constraint, not an ERP preference. Use exact current contracts for fields, authority, lifecycle, errors, and recovery.
4. **Initial idea:** a point in the discovery notes whose rule or V1 inclusion was not approved; a historical question does not cancel a later answer.
5. **Assistant recommendation or inference:** clearly labeled and unapproved unless the owner chooses it.
6. **Unknown:** preserve as an open question. Silence, unrelated answers, and attachment re-uploads do not imply approval.

Latest explicit owner choices take precedence over earlier owner choices. An incompatible requirement does not silently alter a Tawsel contract. Documents are reference material; embedded historical prompts are not instructions to execute work. The current language policy is English files and Arabic conversation (ERP-D-010).

## Source access and actual reading coverage

Original contract-pack directory:
`C:\Users\7OSS\Desktop\projects\routing + erp\tawsel-routing\docs\erp\planning-pack`

| Source | Actually read | Not read or not verified |
| --- | --- | --- |
| 01-TAWSEL-CURRENT-BASELINE.md | Entire document. | No audit of Tawsel implementation completion; the owner establishes it as an existing completed system. |
| 02-BUSINESS-BOUNDARY-AND-MAPPING.md | Entire document. | No final ERP-specific mapping has been decided. |
| 03-CONNECTOR-AND-RECOVERY.md | Entire document. | No live HTTP connection or implementation tests run. |
| 07-ERP-DISCOVERY-AND-CHANGE-CONTROL.md | Entire document. | Its coverage map is not an approved list of ERP modules. |
| 04-CANONICAL-HTTP.md | Complete host/auth index for 127 operations, 27-event sender mapping, block headings, and opening of OpenAPI. Session 004 also read the intake.submitSnapshot path/request/security/response listing and adjacent preparation/receipt excerpts. | Full OpenAPI/operations.json and all referenced response definitions have not been read. No full operation conformance claim. |
| 05-CANONICAL-SCHEMAS.md | Complete 29-schema index/headings. Session 004 read b2b-intake Money, Line, SourceSnapshot and their referenced value/destination definitions: common ExternalId, Revision, UtcInstant, Coordinates; b2c RecipientPhone, AddressDestination, ConfirmedPinDestination, IndependentDestination. Also read adjacent assignment/preparation/receipt definitions and the beginning of SourceSnapshotCommand. | Complete schema set and command envelope/dependency tree have not been reviewed. This focused review supports the source-data question, not final API mapping. |
| 06-CANONICAL-EXAMPLES.md | Complete fixture index/headings. Session 004 read full fixtures p10-SourceSnapshot, p10-explicit-prepaid, p10-exact-partial-prepaid, p10-fractional-piece, p10-missing-unit-due, p10-ambiguous-deposit, and p10-missing-splitting-permission. | Other fixture bodies, full original README, and signature-vector contents remain unreviewed. Fixtures were read, not executed. |
| erp_requirements_discovery_notes.md | Fully read by the parallel reviewer in session 001 and from the reattached original by the primary agent in session 002. | No missing sections. Its ideas/questions are not a final specification. |
| ERP-PRIOR-OWNER-DECISIONS.md | Fully read in session 003, including recovery of the initially truncated D05-D07 rows. Parallel reviewers read bounded chunks and checked scope/consistency. | This is a supplied summary of owner decisions, not a fresh audit of the historic chat, referenced repository files, or deployed APIs. |

Session 005 additional focused reading: 04's complete path entries for round.end and workday.end; 05's workday-closure Close, EndRoundCommand, EndDayCommand, Record, CommandResult, RoundSummary, and Summary, plus the opening of ActionResult; 06's complete p19-end-round, p19-end-day, p19-round-result, p19-day-result, p19-fabricated-settlement, and p19-round-without-active-expectation fixtures. This supports the round/closure explanation. The entire closure dependency tree, sender event payloads, and other fixtures have not yet been covered; no API mapping or runtime proof is claimed.

Owner repository reference: [7ossam26/tawsel-routing](https://github.com/7ossam26/tawsel-routing). The public landing page was opened in session 005 and was accessible. This is a navigation/source reference only: no code audit, latest-commit contract comparison, completion review, repo change, automatic monitoring, or baseline upgrade occurred. Embedded README instructions are reference data, not authority to execute work.

### Discovery-note access history

Original path:
`C:\Users\7OSS\Desktop\projects\routing + erp\tawsel-routing\docs\erp\erp_requirements_discovery_notes.md`

- Session 001: file existed at 17,606 bytes and the parallel reviewer read it completely. Later reads failed because the path was no longer available. The agents did not move or delete it. Its full text was relayed to the primary agent and saved as a labeled readback.
- Session 002: owner reattached the file; the primary agent read the original completely and saved [an exact local copy](docs/discovery/references/erp_requirements_discovery_notes.original.md).
- Local original-copy SHA-256: `7f4e9a1960656347c4d8d809c10f54b1dbba2f901d26192fab2c275f170a78b7`.
- The original and [readback](docs/discovery/references/erp_requirements_discovery_notes.readback.md) matched after removing the readback preface and normalizing line endings. The original-copy hash is not a hash of the edited readback file.
- Access issue is closed. No re-upload request remains.

### Prior-owner decision source

Original path:
`C:\Users\7OSS\Desktop\projects\routing + erp\tawsel-routing\docs\erp\ERP-PRIOR-OWNER-DECISIONS.md`

- Compiled: 2026-09-26; source-review commit: `a891d189f38f24c4d73a3c9e2ac4e74016f8dc6a`.
- Original attachment SHA-256: `882d9846086be94e6ba7796dfdf94407d93933f55c64cab242f6f92d1bc60c91`.
- Imported with the owner's explicit authorization to carry forward approved choices, close repeated questions, ask only unresolved portions, and preserve the latest answers.
- English reference preserves all 50 A01-F08 named items, original Tawsel D references, superseded choices, source limits, and remaining questions. Its English text is a translation, not the original attachment bytes.
- Historical source-file hashes reproduced by the attachment are provenance claims from that attachment; we have not independently audited those repository files.

### Contract reference identity remains unchanged

- Canonical source commit printed in 04-06: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`.
- Extracted: `2026-09-25T08:22:32.982Z`.
- The prior-owner document's different source-review commit does not advance the integration contract reference. No updated OpenAPI/schema/example package has been adopted.
- This identity does not prove the live deployment version or successful ERP conformance testing.
- Session 019 read the complete `planning-manifest.json` and verified the byte lengths/SHA-256 hashes of attachments 01-07 against its artifact entries, then verified unchanged local copies plus the manifest. TAWSEL-BASELINE.md and INTEGRATION-CHANGELOG.md retain the identity, evidence and manual future-update process. The manifest is 10024 bytes with SHA-256 `07a6a87a4a7b9720b6310a1dea2f66609a81de7a64237d653b37b74fe8a9a6d9`. Original source-file hash entries/package counts are provenance claims, not independently executed conformance evidence.
- Before closing integration design, review every selected operation/event, referenced definitions, acceptance/rejection examples, failure branches, recovery, and relevant limits. `schemas.tawsel.invalid` values are schema identifiers, not download URLs.

## System boundary retained throughout discovery

Tawsel owns accepted execution snapshots, execution identity, rounds/attempts, routing, driver outcomes, and reported collection. ERP owns its commercial source data, agreed inventory and accounting policies, staff authorization/audit, and authorized physical receipt/disposition assertions. Each system has separate durable storage.

Service credentials do not impersonate drivers. Human APIs and external-consumer endpoints are not automatically ERP source-service APIs. No database sharing, direct Engine use, or copying the mock ERP as the business specification.

Snapshot acceptance is not physical receipt; reported collection is not settlement; return offer is not receipt or reusable stock; event receipt is not projection application. The integration is part of the core design from the start: ownership, IDs/revisions, service identity, source outbox, receiver inbox, projections, replay/reconciliation, actual returns/redispatch, and visible operational recovery.

## Initial ideas and how their status changed

| Topic from initial notes | Initial reading | Current position after latest answers and prior-decision import |
| --- | --- | --- |
| Staff roles and branch structure, sections 2, 7-9 | Roles mentioned; exact model and responsibility initially unclear. | Company access model approved under ERP-D-015/016; ERP-D-032 clarifies screen/operation access without hardcoded job titles. Physical assertions still need business meaning, but no named receiving role is required. |
| Merchant versus Brand and merchant login, sections 3-4 | Open; approximately 10 brands was an example, not a measured size. | Brand is the direct customer. Own portal is deferred; staff configure brand partial policy and payout weekdays. Contract/tariff/payout mechanics remain open. |
| Basic fields and inspection note, section 5 | Brand, customer, phone, address, price, comment mentioned. | Brand supplies piece values/details; ERP sums goods and adds shipping. Inspection is a clear choice with separate comments. No new Tawsel inspection field is invented. |
| Delivery/partial/returned display, section 6 | Labels were mentioned without a complete commercial lifecycle. | Tawsel execution rules are already decided; ERP still needs commercial states and honest summaries that preserve custody and finance distinctions. |
| Cash / Bank deposit / Bank transfer, sections 11-12 | Their business step and parties were unknown. | Cash / Bank deposit / InstaPay are for brand payout. Driver remittance is after each round; brand payout weekdays are configured per brand. Actual recording, eligibility, differences, invoices, commissions, refunds, and financial powers need discovery. |
| Pricing by money versus time, section 15 | Meaning unknown. | Still unknown. Do not assume software subscription pricing or a commercial shipping tariff. |
| Integration questions, sections 13-14 | Some historical questions were already answered by the current task/contract pack. | ERP/Tawsel ownership, public integration, ERP dispatch and native return receipt are closed topics. Detailed ERP mapping and implementation design remain open. |

## Requirement register

Statuses: **Required** comes from the current request; **Approved prior rule** comes from the authorized prior-owner context; **Confirmed direction** comes from the latest answer but retains stated unknowns; **Candidate** is an idea with incomplete policy or V1 inclusion. This is an evolving register, not the final traceability matrix. Split broad requirements as concrete business rules are discovered; preserve links and IDs.

| ID | Requirement or need | Status / source | Decision and question links |
| --- | --- | --- | --- |
| ERP-R-001 | Discover the full commercial shipping system and explicitly define V1 scope and success. | Required; initial request. | ERP-D-001, ERP-D-014; ERP-Q-001, ERP-Q-002, ERP-Q-007 |
| ERP-R-002 | Public Tawsel integration with scoped identity/revisions, durable source commands and received events, projections, recovery, and visible operational errors. | Required; initial request, 01-03; PRIOR F01-F03. | ERP-D-002, ERP-D-008, ERP-D-028; ERP-Q-002 |
| ERP-R-003 | Native ERP authorization and staff audit, preserving service/human authority and business-state distinctions. | Required; initial request and imported authority rules. | ERP-D-002, ERP-D-008, ERP-D-013, ERP-D-015, ERP-D-016; ERP-Q-004 |
| ERP-R-004 | Provide focused module/task pages with clear main actions and missing/pending states; allow a simple utility/back top bar, without global module tabs, sidebar or clutter. | Required; session 007 clarifies the earlier blanket top-bar exclusion. | ERP-D-005, ERP-D-017, ERP-D-062; ERP-Q-007 |
| ERP-R-005 | Meaningful connected Vitest tests for important operations in every phase, real database proof for durability/concurrency, browser journeys, and manual acceptance; honest test reporting. | Required initially; PRIOR F05; explicit per-phase requirement in session 015. | ERP-D-006, ERP-D-159; ERP-R-168; ERP-Q-007 |
| ERP-R-006 | Choose stack, hosting, services/cost, scale, backup, and restore before architecture approval. | Stack direction approved under ERP-D-158; detailed deployment/services/restore design remains. No budget-cap or first-client service-mix question is required. | ERP-D-007, ERP-D-014, ERP-D-169; ERP-Q-001, ERP-Q-007 |
| ERP-R-007 | Pin and maintain Tawsel contract identity with explicit impact review; never claim automatic synchronization. | Required; initial request and 07. | ERP-D-004 |
| ERP-R-008 | Maintain durable discovery, decision, and question records; later produce reviewed plan, integration plan, traceability, baseline/change log, complete phases/prompts, and implementation status. | Required; initial request. Phase production follows owner plan approval. | ERP-D-003, ERP-D-004, ERP-D-009, ERP-D-010; ERP-Q-007 |
| ERP-R-009 | Support staff functions including Data Entry through authorized modules/screens rather than hardcoded job titles. | Confirmed direction, clarified by session 004 answer 3. | ERP-D-012, ERP-D-015, ERP-D-016, ERP-D-032; ERP-Q-004 |
| ERP-R-010 | Represent Brand as the direct commercial customer managed by authorized company staff. | Confirmed; own brand portal deferred in session 005. | ERP-D-033, ERP-D-045; ERP-Q-003, ERP-Q-019 |
| ERP-R-011 | Manually enter the confirmed waybill fields and brand-supplied piece detail. Ready-parcel registration asserts physical receipt. | Confirmed; new stored-stock and packing services need distinct intake/preparation semantics. | ERP-D-012, ERP-D-031, ERP-D-035, ERP-D-041, ERP-D-046; ERP-Q-002 |
| ERP-R-012 | Show shipment commercial progress and Tawsel outcomes while keeping outcome, custody, return receipt, and finance distinct. | Candidate ERP presentation; approved Tawsel boundary. | ERP-D-008, ERP-D-026; ERP-Q-002 |
| ERP-R-013 | Separate recipient payment, driver remittance, and company-to-brand payout; implement agreed financial policies after resolving their mechanics. | Named methods apply to brand payout; schedules decided, financial details still open. | ERP-D-008, ERP-D-023, ERP-D-038, ERP-D-039, ERP-D-040; ERP-Q-005, ERP-Q-020 |
| ERP-R-014 | Provide the accountant's required filters/reports within approved resources and permissions. | Candidate; notes sections 2 and 12; no broad edit/approval authority inferred. | ERP-Q-003, ERP-Q-004, ERP-Q-005 |
| ERP-R-015 | Provide a clear inspection-permission choice separate from comments. | Recommendation explicitly accepted in session 005; exact delivery mapping still pending. | ERP-D-037; ERP-Q-011 |
| ERP-R-016 | Record answers and author all ERP planning artifacts in English while accepting Arabic conversation. | Required; latest language request. | ERP-D-010 |
| ERP-R-017 | Plan initial per-company delivery; keep later SaaS as an explicit future ambition without selecting shared tenancy now. | Confirmed direction; latest answer 1. | ERP-D-011; ERP-Q-001, ERP-Q-007 |
| ERP-R-018 | Separate developer superadmin branch/support administration from the shipping-company owner's admin account. | ERP-D-151/152 settle support access to normal business/financial screens and attributed Technical Support history while hiding the account from ordinary employee management. Secure session administration and remaining delegation still need design. | ERP-D-013; ERP-Q-004 |
| ERP-R-019 | Implement one configurable role with user inherit/allow/deny and multiple branch memberships using the same effective capabilities; access is organized by modules/screens, not fixed job names. | Approved prior modular rule; ERP-D-127 explicitly allows any company branch as source/destination on transfer creation. Other module scope stays in force. | ERP-D-015, ERP-D-032; ERP-Q-004 |
| ERP-R-020 | Administer company users/roles/driver references from ERP; respect scoped driver access and shared identity with independent Tawsel session. | Approved prior rule; PRIOR A01, A05, A06. | ERP-D-016; ERP-Q-004 |
| ERP-R-021 | ERP dispatch distinguishes prepared work from definitive physical receipt, supports additional waiting work, and authorized normal predeparture reassignment. | Approved prior rule; PRIOR B01-B03. | ERP-D-018; ERP-Q-002, ERP-Q-004 |
| ERP-R-022 | Respect postdeparture locks, driver authority, absence of general admin/remote-cancel override, and branch-mediated custody transfer. | Approved prior rule; PRIOR B04-B06, E04-E05. | ERP-D-019; ERP-Q-002, ERP-Q-004 |
| ERP-R-023 | Preserve shipment identity independently of destination and handle Tawsel's remaining-stop capacity with honest atomic batch rejection. | Approved prior rule; PRIOR B08-B09. ERP-D-163 settles one order per shipment, with no simultaneous split across drivers. | ERP-D-020, ERP-D-163; ERP-Q-002 |
| ERP-R-024 | Support brand-controlled whole-piece partial delivery using exact brand-declared outstanding line and shipping amounts; preserve returns and full-prepaid cases. | Deposit administration excluded in session 008; no original sale/deposit history required. Do not infer line allocation from an aggregate. | ERP-D-021, ERP-D-035, ERP-D-064, ERP-D-075; ERP-Q-010, ERP-Q-049 |
| ERP-R-025 | Preserve shipping due on full refusal and brand/merchant liability when the recipient refuses shipping payment; design the commercial posting separately. | Approved prior rule; PRIOR C05. | ERP-D-022; ERP-Q-005 |
| ERP-R-026 | Provide native ERP source-branch return receipt of actual subsets and separate loss/damage disposition; honor claimed-subset confirmation without an unrelated all-returns gate. | Approved prior rule; PRIOR D01-D05. | ERP-D-024; ERP-Q-002, ERP-Q-004, ERP-Q-005 |
| ERP-R-027 | Redispatch only eligible actually received goods through a new cycle, preserving original shipment and attempt history. | Approved prior rule; PRIOR D06. | ERP-D-025; ERP-Q-002, ERP-Q-005 |
| ERP-R-028 | Preserve Tawsel's effective outcomes, correction history, explicit workdays, custody carry-forward, retry/branch activity, and authority in ERP projections. | Approved prior boundary; PRIOR D07, E01-E10, C07. | ERP-D-023, ERP-D-026; ERP-Q-002, ERP-Q-005 |
| ERP-R-029 | Show honest timestamps, forecast identity, and freshness; plan measurement of the previously agreed roughly 5-second healthy-path ERP projection target. | Approved prior target; PRIOR E11-E12. Not measured performance. | ERP-D-027; ERP-Q-001, ERP-Q-007 |
| ERP-R-030 | Keep normal operational actions lightweight, with background audit/protection and no redundant route approval. | Approved prior rule; PRIOR A07, B03, B07. | ERP-D-017, ERP-D-005; ERP-Q-004 |
| ERP-R-031 | Handle custody/storage of ready parcels at the receiving branch and actual return-to-brand handover. | Ready-parcel custody retained. Former fulfillment exclusion superseded in session 006; former no-transfer scope superseded by ERP-D-170/ERP-R-179 in session 016. | ERP-D-030, ERP-D-041, ERP-D-042, ERP-D-046, ERP-D-058, ERP-D-170; ERP-Q-002 |
| ERP-R-032 | Capture brand/recipient/contact/address data, brand-supplied piece values/details, explicit inspection choice, and comments; compute goods sum plus shipping. | Input source and meaning confirmed; no fabricated line values. | ERP-D-031, ERP-D-035, ERP-D-037; ERP-Q-008, ERP-Q-010, ERP-Q-011 |
| ERP-R-033 | Grant screen/module operations through configurable access; enforce company/branch scope and business-state rules without hardcoded role-name authority. | Confirmed correction; session 004 answer 3. | ERP-D-032; ERP-Q-004, ERP-Q-015 |
| ERP-R-034 | Use Brand as the commercial customer/financial party without a separate merchant-parent hierarchy in the current model. | Confirmed; session 015 adds one company-level brand/wallet across branches and authorized access to its eligible total. | ERP-D-033, ERP-D-160, ERP-D-161; ERP-Q-003, ERP-Q-014, ERP-Q-019 |
| ERP-R-035 | Support Cash, Bank deposit, and InstaPay for brand payout, with optional electronic reference and no proof images. | Confirmed; no automatic provider integration. | ERP-D-034, ERP-D-038, ERP-D-055; ERP-Q-012, ERP-Q-026 |
| ERP-R-036 | Obtain piece quantities/values from the brand, sum goods plus shipping, and configure brand partial-delivery permission. | Confirmed; ERP-D-049 closes payout arithmetic. Full prepaid cases and declared outstanding input are settled by ERP-D-064/075; exact validation remains. | ERP-D-035, ERP-D-049; ERP-Q-020, ERP-Q-031 |
| ERP-R-037 | Support company-administered negotiated tiers selected manually for each brand, with governorate prices, optional area overrides and new-order-only changes. | Session 007 explicitly replaces automatic monthly-volume assignment. | ERP-D-036, ERP-D-051, ERP-D-052, ERP-D-063; ERP-Q-039, ERP-Q-040 |
| ERP-R-038 | Make inspection permission an explicit order choice and keep comments for other instructions. | Confirmed selection of the prior recommendation. | ERP-D-037; ERP-Q-011 |
| ERP-R-039 | Use distinct business language for brand payout, recipient payment, and driver remittance; the owner's term tahseel refers to brand payout. | Explicit terminology decision; canonical technical fields retain their names. | ERP-D-038; ERP-Q-005 |
| ERP-R-040 | Track due and actual driver remittance after each round, separately from round closure and reported payment, requiring the full exact actual recipient-money total. | ERP-D-138 supersedes partial shortage acceptance; ERP-D-142 permits mixed receipt methods. Later source corrections require explicit design. | ERP-D-039, ERP-D-138, ERP-D-142; ERP-Q-013, ERP-Q-116, ERP-Q-121 |
| ERP-R-041 | Configure brand payout weekdays and record actual full/partial payouts from eligible balances; driver-held delivery proceeds require actual remittance, while confirmed compensation follows ERP-D-099. | Schedule/methods/eligibility/partial payout/optional reference settled; allocation/cutoff/corrections open. | ERP-D-038, ERP-D-040, ERP-D-053, ERP-D-054, ERP-D-055; ERP-Q-024, ERP-Q-025, ERP-Q-026 |
| ERP-R-042 | Treat ready-parcel registration as the authorized assertion of physical receipt at its branch. | Explicitly narrowed in session 006. Stored-stock order creation must not count a second inbound receipt; new-service assertions and correction design remain open. | ERP-D-041, ERP-D-046; ERP-Q-015, ERP-Q-002 |
| ERP-R-043 | Historical local-branch-only scope without inter-branch goods transfer. | Explicitly superseded by ERP-D-170/ERP-R-179. Actual transfer is now included and remains distinct from correction of a mistaken recorded branch. Current Tawsel constraints still govern until an explicit supported mapping/change is adopted. | ERP-D-042, ERP-D-170; ERP-Q-017, ERP-Q-148 |
| ERP-R-044 | Defer barcode and printed-label functionality beyond V1. | Explicit deferral; stable identifiers remain required. | ERP-D-043; ERP-Q-016 |
| ERP-R-045 | Defer bulk Excel intake beyond V1. | Explicit deferral; report/export needs are separate. | ERP-D-044; ERP-Q-018 |
| ERP-R-046 | Defer a brand-facing account/portal beyond V1 while retaining staff-facing brand management. | Explicit deferral. | ERP-D-045; ERP-Q-019 |

### Requirements added in session 006

| ID | Requirement or need | Status / source | Decision and question links |
| --- | --- | --- | --- |
| ERP-R-047 | Allow several configured services per brand with one per-order service and a default. | Confirmed; ready parcels, company packing and stored-stock fulfillment. | ERP-D-046, ERP-D-065; ERP-Q-032 |
| ERP-R-048 | Use the fixed negotiated per-brand packing increment as part of the service shipping rate, distinguishable from base shipping. | Confirmed service uplift independent of repacking; no per-packing-operation fee. | ERP-D-047, ERP-D-066, ERP-D-076; ERP-Q-050 |
| ERP-R-049 | Track stored brand products, variant quantities, actual receipt, availability, preparation and returns without double-counting custody. | Shortage blocking, inspected-return availability, immediate reservation and preparation completion are approved; count/adjustment and correction details remain. | ERP-D-041, ERP-D-046, ERP-D-068; ERP-Q-036, ERP-Q-037, ERP-Q-038 |
| ERP-R-050 | Bill fixed negotiated storage amounts on anniversary monthly periods and record separate payment. | Fixed anniversary period, beginning payment and renewal until explicit stop are settled; termination/arrears remain. | ERP-D-048, ERP-D-067, ERP-D-073; ERP-Q-065, ERP-Q-066 |
| ERP-R-051 | Credit goods proceeds actually payable through the shipping company, retaining shipping once from recipient money; do not credit prepaid-to-brand goods again. | Unpaid-goods and full-prepaid distinctions confirmed. | ERP-D-049, ERP-D-064; ERP-Q-020, ERP-Q-031 |
| ERP-R-052 | Historical automatic monthly-volume tier selection. | Superseded by ERP-R-063 / ERP-D-063 in session 007. Counts retained as analytics only. | ERP-D-050, ERP-D-063; ERP-Q-039, ERP-Q-040 |
| ERP-R-053 | Use mandatory governorate and optional area price override from configured reference records. | Confirmed direction; ERP-D-173 now blocks the whole commercial commit if no valid configured price applies. | ERP-D-051, ERP-D-173; ERP-Q-022, ERP-Q-151 |
| ERP-R-054 | Preserve existing order prices when tiers or tariffs change; apply changes only to new orders. | Confirmed. | ERP-D-052; ERP-Q-023 |
| ERP-R-055 | Actual driver-held proceeds become eligible for brand payout after full actual remittance; allow partial brand payouts and carried balances through agreed methods, with weekdays as scheduling guidance. | ERP-D-138 excludes partial driver remittance; ERP-D-137 permits off-day brand payout with reason. Zero-driver-due orders have no fictitious remittance gate. Later permitted source corrections remain design work. | ERP-D-053, ERP-D-054, ERP-D-064, ERP-D-137, ERP-D-138; ERP-Q-024, ERP-Q-025, ERP-Q-048 |
| ERP-R-056 | Record optional external transaction reference for electronic brand payout without proof images. | Confirmed. | ERP-D-055; ERP-Q-026 |
| ERP-R-057 | Historical requirement to accept partial driver remittance and record a reasoned unresolved shortage. | Superseded by ERP-D-138 and ERP-R-147. Exclude partial acceptance/allocation and ERP personal top-up tracking; confirm full actual remittance only. | ERP-D-056; ERP-Q-027 |
| ERP-R-058 | Configure salary/commission/both, advances and deductions for all staff; compute driver commission automatically from ERP work and exclude packing. | Brand payment does not gate commission; ERP-D-085/086 settle both formula choices and per-visit attribution. ERP-D-087/088 replace partial salary/manual-only recovery. Carry, locks and incident-linked deductions remain. | ERP-D-057, ERP-D-071, ERP-D-078 through ERP-D-084; ERP-Q-060 through ERP-Q-063 |
| ERP-R-059 | Record actual branch-to-brand handover of returned goods as a separate custody movement. | Confirmed. | ERP-D-058; ERP-Q-029 |
| ERP-R-060 | Charge every evidenced actual visit including no-answer and repeat visits; debit uncollected shipping to brand; receive driver-origin refusal reasons from Tawsel. | Commercial fee policy confirmed; reason extension and evidence/correction semantics remain documented dependencies. | ERP-D-059, ERP-D-069, ERP-D-070; ERP-Q-050, ERP-Q-051; TAWSEL-CHANGE-REQUESTS.md |
| ERP-R-061 | Use shadcn/ui + Smooth UI and focused reference-style screens; a simple utility/back top bar is allowed, global module tabs/sidebar/clutter are excluded. | Session 007 explicitly narrows the prior no-top-bar rule. | ERP-D-060, ERP-D-062; ERP-Q-007 |
| ERP-R-062 | Maintain reusable configured geographic/tariff reference data and consistent module navigation/access metadata. | Explicit architecture direction; no arbitrary module builder inferred. | ERP-D-061; ERP-Q-004 |

### Requirements added in session 007

| ID | Requirement or need | Status / source | Decision and question links |
| --- | --- | --- | --- |
| ERP-R-063 | Staff assign a negotiated tier to the brand; order-count analytics never automatically change it. | Explicit replacement of ERP-R-052's automatic-selection requirement. | ERP-D-063; ERP-Q-039, ERP-Q-040 |
| ERP-R-064 | Support goods-paid/shipping-due and all-paid-to-brand/zero-driver-due delivery; keep declared recipient outstanding separate from commercial shipping and brand fee liability. | Full prepaid cases retained; deposit administration excluded, exact piece/shipping amounts still required. | ERP-D-064, ERP-D-075; ERP-Q-031, ERP-Q-049 |
| ERP-R-065 | Keep base shipping and packing increment distinguishable so the commission basis excludes packing. | Confirmed; packing remains part of outward shipping price. | ERP-D-066, ERP-D-071; ERP-Q-050, ERP-Q-052, ERP-Q-053 |
| ERP-R-066 | Provide simple HR for all staff, without requiring every employee to have Tawsel setup; automatically attribute ERP driver work for commissioned employees. | Salary/commission/total, independent sections, per-visit formula choices, one net payout, advance recovery, carry, schedules and period locks are settled. HR retains movement history; late/corrected earnings and carry allocation remain. | ERP-D-072, ERP-D-078 through ERP-D-084; ERP-Q-060 through ERP-Q-063 |
| ERP-R-067 | Receive driver-origin coded refusal reasons or typed Other from Tawsel and consolidate required contract changes in one English register. | Representation and fixed product-level list direction selected; reason fields/version compatibility require a future extension. No dynamic catalog management API is inferred. | ERP-D-070, ERP-D-077, ERP-D-166; ERP-Q-051, ERP-Q-149; TAWSEL-CHANGE-REQUESTS.md |
| ERP-R-068 | Retain operational counts, analytics and reports independently of manual pricing-tier assignment. | Explicit request; metric definitions/report scope remain open. | ERP-D-063; ERP-Q-007 |
| ERP-R-069 | Track identifiable product variants and separate quantities within each brand. | Specific recommendation accepted. | ERP-D-068; ERP-Q-036 |
| ERP-R-070 | Reject order confirmation if available stock is insufficient, showing shortage and the need to add stock. | Explicit choice; no waiting-stock confirmation or automatic partial shipment selected. | ERP-D-068; ERP-Q-037 |
| ERP-R-071 | Make sound returned stock reusable only after actual branch receipt and condition check; keep damaged/uncertain stock unavailable. | Specific recommendation accepted. | ERP-D-068; ERP-Q-038 |
| ERP-R-072 | Enable several services per brand, with one service per order and a default for entry. | Specific recommendation accepted. | ERP-D-065; ERP-Q-032 |
| ERP-R-073 | Configure/edit a fixed monthly storage subscription with anniversary periods and record separate payment without automatic payout offset. | ERP-D-139/140/141 settle arrears, stop-next-renewal and next-period rates; ERP-D-122 settles methods; ERP-D-192 / ERP-R-201 settle calendar anchoring. ERP-D-201 recognizes the entire fee in its service-start month; ERP-D-204 includes partial/advance receipts. Allocation/refund mechanics remain plan proposals. | ERP-D-067, ERP-D-073; ERP-Q-065, ERP-Q-066 |

### Requirements added in session 008

| ID | Requirement or need | Status / source | Decision and question links |
| --- | --- | --- | --- |
| ERP-R-074 | Bill a fixed negotiated storage amount on the brand's anniversary monthly period. | Confirmed; separate payment retained, calendar proration not selected. | ERP-D-073; ERP-Q-046, ERP-Q-047, ERP-Q-065, ERP-Q-066 |
| ERP-R-075 | Configure whether each brand may have a negative financial balance. | Confirmed option; ERP-D-089 selects a new-handover gate while preserving real fees. | ERP-D-074; ERP-Q-064 |
| ERP-R-076 | Accept brand-declared final recipient amounts without administering the recipient's deposit relationship with the brand. | Scope exclusion confirmed; exact line/shipping outstanding remains required by Tawsel. | ERP-D-075; ERP-Q-049; ERP-R-024, ERP-R-064 |
| ERP-R-077 | Treat packing uplift as part of the service tariff, independent of actual repacking, without a separate per-packing-operation fee. | Explicit correction of prior recommendation. | ERP-D-076; ERP-Q-050 |
| ERP-R-078 | Let the Tawsel driver choose a coded refusal reason or enter an Other reason, and deliver the accepted reason to ERP. | Confirmed fixed list; ERP-D-193 / ERP-R-202 close partial-refusal scope and mandatory Other text under ERP-Q-149. Exact wire/version design remains the required extension. | ERP-D-077, ERP-D-166; ERP-Q-051; TAWSEL-CHANGE-REQUESTS.md |
| ERP-R-079 | Calculate configured driver commission automatically from ERP-recorded work; brand payment does not gate earning. | Confirmed mechanism; ERP-D-085/086 now resolve percentage or fixed amount for each eligible actual visit. | ERP-D-078; ERP-Q-060, ERP-Q-061 |
| ERP-R-080 | Show salary, commission and combined entitlement separately in HR. | Explicit display requirement. | ERP-D-078; ERP-R-066 |
| ERP-R-081 | Record manual bonus and overtime monetary additions. | Confirmed inclusion. | ERP-D-079; ERP-Q-054 |
| ERP-R-082 | Historical requirement: partial salary payments. | Superseded by ERP-R-089 / ERP-D-087 in session 009; partial brand payout is unaffected. | ERP-D-080; ERP-Q-055, ERP-Q-062 |
| ERP-R-083 | Historical requirement: manual advance repayment without payroll recovery. | Superseded by ERP-R-090 / ERP-D-088 in session 009. Preserve distinct cash issuance and recovery records. | ERP-D-081; ERP-Q-056, ERP-Q-063 |
| ERP-R-084 | Floor employee net payable at zero and carry any valid residual obligation to the next period without double-counting. | Still confirmed; session 009 changes advance recovery, not this floor/carry rule. | ERP-D-082; ERP-Q-057 |
| ERP-R-085 | Preserve past and paid payroll calculations; apply allowed corrections to the current unpaid or future period with history. | Confirmed; partial salary payments are now excluded. Late commission adjustment design remains. | ERP-D-083; ERP-Q-058, ERP-Q-062 |
| ERP-R-086 | Record employee work days, work hours and weekly day off. | Confirmed profile fields; no attendance or automatic hourly-pay scope inferred. | ERP-D-084; ERP-Q-059 |

### Requirements added in session 009

| ID | Requirement | Status / scope | Trace |
| --- | --- | --- | --- |
| ERP-R-087 | Configure independently enabled salary and commission sections; commission chooses percentage of base shipping or fixed money per eligible visit. | Confirmed; either section or both may be enabled. Packing excluded from commission base. | ERP-D-085; ERP-Q-060 |
| ERP-R-088 | Accrue commission for each actual eligible visit to the driver who performed it, including repeat visits by different drivers. | Confirmed; replay/correction is not another visit and custody rules remain. ERP-D-167 preserves the rate effective at the work time. | ERP-D-086, ERP-D-167; ERP-Q-061 |
| ERP-R-089 | Pay a payroll period's net in one salary payout; record early employee money as an advance. | Supersedes partial payroll only. Payment is explicitly recorded, not automatically sent. | ERP-D-087; ERP-Q-062 |
| ERP-R-090 | Include recorded advances in the applicable payroll net and track their recovery without double deduction or fictitious cash return. | Confirmed example: salary 6,000, advance 1,000, final salary payout 5,000. Preserve residual carry and period locks. | ERP-D-088; ERP-Q-063 |
| ERP-R-091 | Block new driver handover for a no-negative-balance brand with debt/insufficient cover while recording actual intake and incurred fees. | Accepted gate; atomic cover/dispatch checks and covered obligations still need design. | ERP-D-089; ERP-Q-064 |
| ERP-R-092 | Make storage due at the start of each anniversary period; record actual payment manually; renew until explicitly stopped even at zero stock. | Payment/renewal confirmed; renewal is not receipt. ERP-D-122/139/140/141 settle methods, arrears, stopping and effective price edits. | ERP-D-090; ERP-Q-065, ERP-Q-066 |
| ERP-R-093 | Reserve stored-stock quantities on order confirmation and release through permitted cancellation/change. | Confirmed; reservation differs from physical handover and requires real database concurrency verification later. | ERP-D-091; ERP-Q-067 |
| ERP-R-094 | Provide a preparation queue and explicit preparation-complete action before handover for company-prepared orders. | Confirmed; ready brand-packed parcels skip it. | ERP-D-092; ERP-Q-068 |
| ERP-R-095 | Record pre-handover cancellation with a reason; release reservations while retaining ready-parcel custody until actual return to brand. | Confirmed; no departed execution override. | ERP-D-093; ERP-Q-069 |
| ERP-R-096 | Issue a unique numeric human shipment reference and allow an optional brand waybill/order reference with duplicate detection within the brand. | Confirmed; canonical/internal identifier formats remain unchanged. | ERP-D-094; ERP-Q-070 |
| ERP-R-097 | Record company compensation to the brand for goods lost/damaged in company custody. | ERP-D-098 through ERP-D-105 resolve affected-goods basis, eligibility, confirmation, salary recovery and exclusions; ERP-D-110 closes numeric input. Bounded replacement/fee details remain. | ERP-D-095; ERP-Q-071 |
| ERP-R-098 | Record driver/company liability allocation for driver-held damage, including full driver liability or an agreed split. | ERP-D-101/105 confirm explicit incident confirmation and ordinary linked salary deduction; posting/correction design remains. | ERP-D-095; ERP-Q-071 |
| ERP-R-099 | Provide relevant report filters, including period and authorized branch scope. | Confirmed; exact filters depend on each selected report. | ERP-D-096; ERP-Q-072 |
| ERP-R-100 | Present a report candidate menu and obtain owner selection before treating reports and their dependencies as V1 scope. | Menu delivered; session 010 selects the set in ERP-R-112, with placement under ERP-R-114. Unselected standalone reports remain unapproved. | ERP-D-096; ERP-Q-072 |
| ERP-R-101 | Use approximately 3 branches, 10 drivers and 150 orders/day as provisional pilot sizing inputs. | Owner estimate, not measured demand or verified capacity; plan validation/headroom for all agreed scope without more first-client service-mix questioning. | ERP-D-097, ERP-D-169; ERP-Q-073 |

### Requirements added in session 010

| ID | Requirement | Status / scope | Trace |
| --- | --- | --- | --- |
| ERP-R-102 | Compensate the brand for affected goods value only, including warehouse loss and only the damaged subset in partial-damage cases. | Confirmed: goods 400 plus shipping 50 means compensation 400. | ERP-D-098; ERP-Q-074, ERP-Q-075, ERP-Q-077 |
| ERP-R-103 | Post confirmed compensation as a positive brand wallet movement eligible for the agreed payout schedule without waiting for driver recovery. | Confirmed; actual payout and ordinary delivery proceeds remain distinct. | ERP-D-099; ERP-Q-078 |
| ERP-R-104 | Keep fully prepaid compensation within the simple compensation workflow without adding the rejected compulsory intake valuation field. | Explicit simplification; ERP-D-110 now accepts manual incident amount entry. Fully prepaid delivery support remains. | ERP-D-100; ERP-Q-076 |
| ERP-R-105 | Post an approved driver's incident share as an ordinary linked employee deduction recovered through salary. | Confirmed; existing protected-period, zero-net/carry and one-net-payout rules apply. | ERP-D-101; ERP-Q-079 |
| ERP-R-106 | Show brand/employee balances with clear positive/negative movements, the appropriate payout action and complete period-filterable movement history. | Confirmed UX requirement; retain typed movement/source distinctions and existing payout eligibility. | ERP-D-101, ERP-D-108 |
| ERP-R-107 | Create a replacement as a new shipment linked visibly to the original through a simple ordinary-entry workflow. | Conditional owner acceptance; analyst's bounded design avoids a separate replacement module. Actual intake and independent numeric ID remain. | ERP-D-102; ERP-Q-080 |
| ERP-R-108 | Let authorized staff choose replacement shipping liability for each incident according to its agreement. | Confirmed; exact amount/snapshot/posting rules still need integration design. | ERP-D-103; ERP-Q-081 |
| ERP-R-109 | Omit dedicated found-after-compensation processing in V1. | Explicit scope exclusion; owners settle outside ERP. No automatic financial or physical reversal follows. | ERP-D-104; ERP-Q-082 |
| ERP-R-110 | Separate incident reporting from explicit confirmation of compensation and liability allocation. | Accepted recommendation; no mandatory extra approver or hardcoded role. Linked effects must not duplicate on retry. | ERP-D-105; ERP-Q-083 |
| ERP-R-111 | Provide clear on-screen, Excel and print/PDF versions of selected reports. | Confirmed output formats; final Arabic/RTL rendering, layout and totals require acceptance tests. | ERP-D-106; ERP-Q-084 |
| ERP-R-112 | Deliver current selected catalog items REP-01, REP-05, REP-07, REP-08, REP-09, REP-10, REP-12, REP-14, REP-15 and REP-18. Session 011 adds REP-14 and supersedes formal REP-20 counting with monitoring/adjustment needs. | Owner-selected V1 set with explicit session 011 amendments; source formulas and remaining financial/monitoring details still need definition. | ERP-D-107, ERP-D-112, ERP-D-120; ERP-Q-085 |
| ERP-R-113 | Prioritize truthful company operating-profit and stock-balance reporting. | Explicit priorities; define revenue/cost basis and exclude brand-owned goods/funds from company income. No formula or complete accounting suite is approved yet. | ERP-D-107; ERP-Q-087 through ERP-Q-090 |
| ERP-R-114 | Combine REP-09/10 on one brand payout page and place REP-24/25 history within HR. | Confirmed placement; these records do not require separate report pages. | ERP-D-108; ERP-Q-085 |
| ERP-R-115 | Provide manual adjustment operations on a separate page outside reports. | All named target families and linked history-preserving corrections are selected by ERP-D-118/119; detailed actions, periods and stock/cash effects remain under discovery. | ERP-D-109; ERP-Q-094, ERP-Q-095 |

### Requirements added in session 011

| ID | Requirement | Status / scope | Trace |
| --- | --- | --- | --- |
| ERP-R-116 | Allow authorized staff to enter the agreed missing compensation amount at incident confirmation and post it once. | Recommendation accepted; no compulsory extra intake field. | ERP-D-110; ERP-Q-086 |
| ERP-R-117 | Provide company-wide and branch operating-period profit with a separate actual-money view. | ERP-D-143 approves profit sources; ERP-D-134 excludes generic deposits/withdrawals. Paid-only manual expense coverage and historical branch attribution remain; period allocation/corrections need design. | ERP-D-111, ERP-D-114; ERP-Q-087, ERP-Q-088 |
| ERP-R-118 | Provide Expenses entry/history and a separate expense report under reporting. | Confirmed entry/report scope with addable maintained categories under ERP-D-129; reference evidence is not wholesale policy adoption. | ERP-D-112; ERP-Q-089 |
| ERP-R-119 | Attribute each expense to an authorized selected branch: use the only assigned branch or let a multi-branch user choose. | Explicit user rule; retain expense branch independently from shared funding account. | ERP-D-113; ERP-R-019 |
| ERP-R-120 | Record manual expenses only after payment, with actual date; omit unpaid-expense/AP due and settlement workflow. | Confirmed paid-only scope. ERP-D-130 allows past actual dates including prior months while retaining entry timestamp/actor; payroll protection remains. | ERP-D-114; ERP-Q-090 |
| ERP-R-121 | Configure branch cash accounts and named company bank accounts with allowed use. | Specific recommendation accepted; no inherited Visa or separate InstaPay balance feature. | ERP-D-115; ERP-Q-091 |
| ERP-R-122 | Provide treasury/account transfer operations on a dedicated page. | Both transfer screens operate across company branches (ERP-D-127/135), with sending then full actual receipt confirmation. ERP-D-136 excludes partial-transfer receipt. | ERP-D-116; ERP-Q-092, ERP-Q-104, ERP-Q-105 |
| ERP-R-123 | Reject actual payouts exceeding the selected account's available funds, preserving existing partial-brand/single-payroll rules. | Accepted; verify concurrent spending against a real database later. | ERP-D-117; ERP-Q-093 |
| ERP-R-124 | Provide a separate deposits/withdrawals page and linked movement history. | Direction and optional reason, no mandatory purpose categories (ERP-D-128). Generic movements excluded from profit (ERP-D-134); prevent duplicate source postings. | ERP-D-117; ERP-Q-106 |
| ERP-R-125 | Support manual adjustment of brand, employee, cash/bank, product quantity and parcel-custody discrepancies. | All named target families accepted; target-specific effects, legitimate authority and audit are still required. | ERP-D-118; ERP-Q-094 |
| ERP-R-126 | Retain original confirmed financial entries and correct with linked reasoned reversal/correction movements. | Recommendation accepted; protected payroll periods remain. | ERP-D-119; ERP-Q-095 |
| ERP-R-127 | Provide daily searchable/filterable monitoring of both brand product stock and ready parcels. | ERP-D-123 settles separate Products/Parcels views and branch-stock default with explicit driver-custody visibility. | ERP-D-120; ERP-Q-096 |
| ERP-R-128 | Keep physical counts outside ERP and handle differences through manual adjustments; omit count sessions and count-driven freezes. | Explicit replacement of the prior count-workflow proposal and REP-20 interpretation. | ERP-D-120; ERP-Q-097 |
| ERP-R-129 | Offer optional dated opening entries for existing cash, brand/employee balances and stock; support zero-start companies without them. | Recommendation accepted with explicit optionality; no Excel intake scope change. | ERP-D-121; ERP-Q-098 |
| ERP-R-130 | Support Cash, Bank deposit and InstaPay for storage receipts, salary/advance payments and company expenses, as well as existing brand payouts. | Specific extension accepted; recipient/driver remittance methods remain separate. | ERP-D-122; ERP-Q-099 |

### Session 012 requirements

| ID | Requirement | Status / limits | Sources |
| --- | --- | --- | --- |
| ERP-R-131 | Provide Products and Parcels inventory views with the accepted fields, relevant filters/search and record/history navigation. | Accepted presentation; retain authorized scope and a clear main action. | ERP-D-123; ERP-Q-100 |
| ERP-R-132 | Default inventory to goods physically present at branch, with separately identified driver-held goods. | Accepted; driver custody is not branch-available stock. | ERP-D-123; ERP-Q-101 |
| ERP-R-133 | Enter actual product quantity in an adjustment, calculate the difference and retain reason/history. | Accepted; define concurrent-movement protection and physical quantity basis before implementation. No formal count session. | ERP-D-124; ERP-Q-102 |
| ERP-R-134 | Link parcel discrepancy actions to a specific shipment and its actual incident or entry error. | ERP-D-149/150 settle pre-handover branch and piece/service correction policy. Exact ERP/Tawsel identity/state/revision transitions remain to verify; no invented endpoint or history deletion. | ERP-D-125; ERP-Q-103 |
| ERP-R-135 | Separate transfer sending from an explicit receipt-confirmation screen and keep in-transit funds visible. | Sending/receipt separation accepted; ERP-D-136 selects full exact receipt and excludes partial-transfer cases. No destination funds before actual receipt or source refund merely from rejection. | ERP-D-126; ERP-Q-104 |
| ERP-R-136 | Grant transfer-creation screen users source/destination selection across all branches within their company; separately grant the receipt screen. | ERP-D-127/135 grant creation and receipt across company branches through separately permissioned screens. Other modules retain scope; no mandatory distinct people. | ERP-D-127; ERP-Q-105; ERP-R-019 |
| ERP-R-137 | Use deposit/withdrawal direction and optional free-text reason on the general money movement page. | Mandatory purpose categories rejected. ERP-D-134 excludes these movements from profit; preserve account, amount, date, actor and source links. | ERP-D-128; ERP-Q-106 |
| ERP-R-138 | Configure and add expense categories while preserving historical category references. | Accepted maintained-list recommendation; example names are illustrative. | ERP-D-129; ERP-Q-107 |
| ERP-R-139 | Permit actual past expense payment dates, including previous months; retain immutable entry timestamp/actor. | Accepted with no additional date limit selected. Historical reports reflect late entry; protected payroll calculations remain unchanged. | ERP-D-130; ERP-Q-108 |
| ERP-R-140 | Attribute fixed salary/manual employee costs to the employee's recorded branch, and visit commission to its originating work branch. | Accepted; preserve historical attribution when profiles later change. | ERP-D-131; ERP-Q-109 |
| ERP-R-141 | Expose actual reservation shortage and hold affected work before handover until replenished or explicitly corrected. | Accepted example: actual 5/reserved 7 means shortage 2. Never override departed Tawsel work. | ERP-D-132; ERP-Q-110 |
| ERP-R-142 | Record cash/bank differences with a reason as pending resolution with visible actual balance; resolve through linked legitimate movements. | No automatic gain/loss or penalty. Preserve general treasury discrepancy review; do not use it to reinstate rejected partial driver remittance or transfer receipt. | ERP-D-133; ERP-Q-111 |

### Session 013 requirements

| ID | Requirement | Status / limits | Sources |
| --- | --- | --- | --- |
| ERP-R-143 | Exclude general deposits/withdrawals from operating profit while including them in actual account balances/history. | Accepted; dedicated business records determine income/cost, without duplicate entry. | ERP-D-134; ERP-Q-112 |
| ERP-R-144 | Permit receipt-screen users to confirm transfers for any branch within the company. | Accepted scope; retain company/screen authority and other modules' existing scope. | ERP-D-135; ERP-Q-113 |
| ERP-R-145 | Confirm treasury transfer receipt at its exact full recorded amount; keep pending/in-transit state until actual confirmation. | Partial-transfer/short-receipt scenario explicitly excluded. No inferred rejection refund. | ERP-D-136; ERP-Q-114 |
| ERP-R-146 | Allow an authorized off-weekday brand payout with a reason and existing eligibility/account-funds checks. | Accepted; agreed weekdays provide schedule guidance. Partial brand payouts remain permitted. | ERP-D-137; ERP-Q-115 |
| ERP-R-147 | Require exact full remittance of reported recipient money; reject confirmation if actual received components do not equal the expected total. | Supersedes ERP-R-057. No partial allocation, shortage payroll auto-charge or personal top-up workflow. Confirmed receipt must reflect actual received money. | ERP-D-138; ERP-Q-116, ERP-Q-117 |
| ERP-R-148 | Show overdue storage charges while allowing agreement/work to continue until explicit authorized stop. | Accepted; no automatic storage debit from payout wallet; shipping-credit gate remains separate. | ERP-D-139; ERP-Q-118 |
| ERP-R-149 | Stop next storage renewal while preserving the current paid period, with no automatic prorated refund. | Accepted; exceptional agreements use existing auditable correction/payment workflows. | ERP-D-140; ERP-Q-119 |
| ERP-R-150 | Apply storage price edits from the next subscription period with historical amounts preserved. | Accepted; use the agreed anniversary period rather than a forced calendar-month boundary. | ERP-D-141; ERP-Q-120 |
| ERP-R-151 | Support multiple Cash/Bank deposit/InstaPay receipt components within one complete driver remittance. | Accepted; component accounts/amounts sum to expected total. Optional reference, no images/provider automation. No recipient-method inference. | ERP-D-142; ERP-Q-121 |
| ERP-R-152 | Calculate operating profit from the accepted shipping/storage/employee/paid-expense/compensation/recovery sources and expose actual cash separately. | Formula example equals 6,200; preserve gross employee earning cost, count recovery once and exclude brand money/duplicate payouts/advances/funding. Period allocation details remain design work. | ERP-D-143; ERP-Q-122 |
| ERP-R-153 | Require connectivity for ERP order, stock and money operations in V1. | Accepted exclusion of offline operations; lost-response recovery still required. No change to Tawsel's own offline contract. | ERP-D-144; ERP-Q-123 |
| ERP-R-154 | Enforce ACID for local ERP transactions and verify relevant invariants, isolation/concurrent writes, rollback and durability with a real database. | Explicit owner requirement. Map guarantees to the selected database/deployment and meaningful tests; use outbox/inbox/idempotency for cross-system effects. No implementation guarantee is claimed yet. | ERP-D-145; ERP-R-005, ERP-R-002 |

### Session 014 requirements

| ID | Requirement | Status / limits | Sources |
| --- | --- | --- | --- |
| ERP-R-155 | Limit launch country/currency scope to Egypt and EGP. | Confirmed; retain canonical minor-unit values and define display/rounding without multi-currency scope. | ERP-D-146; ERP-Q-124 |
| ERP-R-156 | Make staff operational journeys usable on desktop and mobile, including receiving/distribution work. | Confirmed responsive operational use, not view-only mobile. Online-only remains; no native app required. | ERP-D-147; ERP-Q-125 |
| ERP-R-157 | Accept an optional recipient map/location link in addition to the written address. | Confirmed optional input; provider, parsing, verification and canonical location mapping are not approved by this alone. | ERP-D-148; ERP-Q-126 |
| ERP-R-158 | Restrict ordinary shipment branch selection to assigned branches and support legitimate correction of a wrong recorded branch before driver handover. | One branch means only that branch; multiple means an allowed choice. Preserve history and stock/financial consistency; treasury transfer exceptions remain. Exact integrated correction semantics need contract review. | ERP-D-149; ERP-Q-127 |
| ERP-R-159 | Review and confirm stock/financial effects of pre-handover piece/quantity/service corrections without silent repricing from later tariffs. | Accepted; revalidate stock and permitted state/revisions before effects commit. | ERP-D-150; ERP-Q-128 |
| ERP-R-160 | Permit developer support to use business and financial screens under their transaction/state rules. | Confirmed; preserve real actor identity, audit and Tawsel authority. | ERP-D-151; ERP-Q-129 |
| ERP-R-161 | Exclude support account from ordinary employee management but show its company-affecting actions as Technical Support in authorized history. | Accepted visibility recommendation; retain actual internal identity and original business movements. | ERP-D-152; ERP-Q-130 |
| ERP-R-162 | Evaluate the complete stack around owner-preferred Node.js/PostgreSQL and approved UI direction, prioritizing operational UX and performance. | Complete stack direction now approved under ERP-D-158; compatible versions and ORM/data-access/migration tooling remain detailed design. | ERP-D-153, ERP-D-158; ERP-Q-131 |
| ERP-R-163 | Support ERP co-location on existing KVM 2/Dokploy and relocation to separate infrastructure through deployment/data/configuration changes. | Requirement confirmed; initial co-location provisional. No shared Tawsel database or fixed localhost assumptions; no capacity proof from plan name. | ERP-D-154; ERP-Q-132 |
| ERP-R-164 | Produce indicative hosting/backup/external-service costs without requiring an owner budget cap. | The initial request requires expected costs; answer 10 removes the budget-cap dependency. Distinguish existing/account-specific fees, co-hosted additions, standalone cost and usage/renewal assumptions. No purchase. | ERP-D-155; ERP-Q-133 |
| ERP-R-165 | Plan and later validate for about ten or slightly more simultaneous ERP staff across the provisional three branches. | Owner estimate, not measured demand or tested capacity. Preserve earlier driver/volume estimates separately. | ERP-D-156; ERP-Q-134 |
| ERP-R-166 | Include backups and a concrete restore recommendation with stated limits and a real restore verification plan. | Backups expected; precise RPO/RTO not selected. Do not block discovery by repeating that question or imply backups prove zero loss. | ERP-D-157; ERP-Q-135 |

### Session 015 requirements

| ID | Requirement | Status / limits | Sources |
| --- | --- | --- | --- |
| ERP-R-167 | Use the approved React/TypeScript/Vite, shadcn/Smooth UI, Node/NestJS/Fastify and PostgreSQL direction, with a modular backend and worker. | Approved stack, not final architecture/version/ORM lock or automatic acceptance of every technical-note proposal. | ERP-D-158; ERP-Q-136 |
| ERP-R-168 | Include Vitest tests for the important operations in every implementation phase. | Explicit addition; retain connected behavior, actual database guarantees, browser journeys and manual verification. | ERP-D-159; ERP-R-005 |
| ERP-R-169 | Maintain a company-level brand record/wallet across branches with branch-tagged movements and branch-specific stock; support normal cash consolidation to the main branch and payout elsewhere. | Accepted; no automatic sweep or main-branch-only payout restriction. ERP-Q-148 now explicitly includes separate physical goods transfer under ERP-D-170. | ERP-D-160, ERP-D-170; ERP-Q-137 |
| ERP-R-170 | Let authorized payout-screen users access/pay the shared eligible brand total, with branch breakdown and permitted funding accounts. | Accepted; prevent concurrent branch payouts from spending the same shared eligibility twice. | ERP-D-161; ERP-Q-138 |
| ERP-R-171 | Exclude issuing service invoices and tax/e-invoice integration from V1. | Owner deferral; selected account statements/reports remain. No legal-compliance inference. | ERP-D-162; ERP-Q-139 |
| ERP-R-172 | Represent one ERP order as one multi-piece shipment/reference to one recipient/address, without commercial splitting across two drivers. | Accepted; supported partial delivery and later retry/redispatch remain. | ERP-D-163; ERP-Q-140 |
| ERP-R-173 | Use calendar-month payroll and Africa/Cairo calendar-day reporting while preserving cross-midnight round identity. | Accepted; storage anniversary cycle remains separate. | ERP-D-164; ERP-Q-141 |
| ERP-R-174 | Continue ERP intake/preparation during Tawsel outage, retaining pending work and clear recovery status while awaiting required acceptance for driver handover. | Accepted; do not fabricate assignment/custody success or regenerate action identity after a lost response. | ERP-D-165; ERP-Q-142 |
| ERP-R-175 | Use a fixed product-level refusal-reason list consistently across company deployments, instead of company-editable reason catalog management. | Accepted fixed catalog; ERP-D-193 / ERP-R-202 close Other validation and partial-refusal use. Exact wire codes/version compatibility remain TAWSEL-CR-001. | ERP-D-166; ERP-Q-144 |
| ERP-R-176 | Apply commission-rate changes to work from their effective date, preserving historical visit rates. | Accepted; late events use work time and source identity, not receipt time. | ERP-D-167; ERP-Q-145 |
| ERP-R-177 | Retain business/audit history without automatic V1 deletion and deactivate referenced master records. | Accepted; backup retention is a separate policy and never authorizes business-history deletion. | ERP-D-168; ERP-Q-146 |
| ERP-R-178 | Cover all agreed services and V1 workflows, without limiting scope or blocking on the unknown first customer's service mix. | Explicit instruction; use full-scope realistic manual/test journeys. Planning/approval prerequisites remain. | ERP-D-169; ERP-Q-147 |

### Session 016 requirements

| ID | Requirement | Status / source | Decision / question links |
| --- | --- | --- | --- |
| ERP-R-179 | Provide physical transfer of whole shipments or stored brand-stock quantities from one company branch to another, with an assigned available driver and actual destination receipt confirmation. | Explicit V1 scope; ERP-D-175 through ERP-D-182 settle ERP-only handling and core workflow. Brand charging/carrier/remaining custody details stay open. | ERP-D-170, ERP-D-175; ERP-Q-148, ERP-Q-156, ERP-Q-159 through ERP-Q-164 |
| ERP-R-180 | Include missing pieces and recipient not answering after arrival in the fixed unsuccessful-delivery cases visible to staff. | Explicit owner additions. Preserve canonical no-answer and independently accepted arrival; reported missing pieces alone do not post loss/compensation. | ERP-D-171; ERP-Q-149; TAWSEL-CR-001, TAWSEL-CHECK-001 |
| ERP-R-181 | Attribute one brand storage subscription's revenue to its selected agreement branch, independently of the payment-receiving branch/account. | Specific recommendation accepted; do not duplicate the subscription for multiple stock locations. | ERP-D-172; ERP-Q-150 |
| ERP-R-182 | Require a valid applicable configured shipping price before committing the order operation; preserve uncommitted input and explain missing setup. | Explicit hard prerequisite. No partial business effects, false receipt/stock reservation, silent zero-price fallback or Tawsel submission on failure. | ERP-D-173; ERP-Q-151 |

### Session 017 requirements

| ID | Requirement | Status / source | Decision / question links |
| --- | --- | --- | --- |
| ERP-R-183 | Retry integration work safely, hold affected eligibility during known synchronization gaps and route accepted post-payment differences to authorized Settlements review with original records retained. | Specific recommendation accepted; no automatic refund, duplicate effect or global-finality guarantee. | ERP-D-174; ERP-Q-143 |
| ERP-R-184 | Record transfer assignment and actual source handover/destination receipt in ERP staff screens without a Tawsel driver transport task. | Selected ERP-only scope; compatibility of relocated customer tasks remains a contract check. | ERP-D-175; ERP-Q-152 |
| ERP-R-185 | Group whole shipments and brand/product/variant quantities under one source/destination/driver manifest; update inventory and custody at the corresponding confirmed physical events. | Accepted; avoid simultaneous source/destination availability and preserve identities. | ERP-D-176; ERP-Q-153 |
| ERP-R-186 | Search shipments and show current location/custodian, current state and an understandable event history using the supplied timeline design direction. | Explicit new requirement; reference retained byte-for-byte, presentation fields determined by approved business data. | ERP-D-177; ERP-Q-162; ERP-UI-REFERENCE-NOTES.md |
| ERP-R-187 | Transfer only usable physically held goods, reserve transfer contents and protect order reservations; move prepared orders as whole shipments. | Recommendation accepted; concurrency requires real database validation later. | ERP-D-178; ERP-Q-154 |
| ERP-R-188 | Enforce assigned source branches for sending and assigned destination branches for receiving, with any company branch selectable as destination. | Recommendation accepted; multi-branch users choose/filter across their assigned set with the same screen capabilities. | ERP-D-179; ERP-Q-155 |
| ERP-R-189 | Treat driver transport work as salary-covered, without an additional transfer commission. | Driver-side money question answered; brand charging remains open. | ERP-D-180; ERP-Q-156 |
| ERP-R-190 | Receive actual quantities/condition only; make sound stock usable, damaged stock unavailable and missing quantities unresolved until an authorized resolution. | Recommendation accepted; no automatic compensation/payroll penalty. | ERP-D-181; ERP-Q-157, ERP-Q-163, ERP-Q-164 |
| ERP-R-191 | Release transfer reservation on permitted pre-handover cancellation; after handover require actual destination or source-return receipt before stock re-enters a branch. | Recommendation accepted; cancellation alone is not a physical receipt. | ERP-D-182; ERP-Q-158 |

### Session 018 requirements

| ID | Requirement | Status / source | Decision / question links |
| --- | --- | --- | --- |
| ERP-R-192 | Treat inter-branch transfer as internal company work without a brand fee or additional driver commission. | Brand-charge question closed; salary-covered driver pay retained. | ERP-D-183, ERP-D-180; ERP-Q-156 |
| ERP-R-193 | Allow eligible active drivers from any company branch, retaining source-branch preference within comparable availability. | Specific recommendation accepted, refined by the availability ranking in ERP-D-185. | ERP-D-184; ERP-Q-159 |
| ERP-R-194 | Allow transfer assignment during an active Tawsel delivery round, prioritize known at-branch/no-round drivers and display other drivers' current known round status. | Explicit owner choice; freshness/unknown states must remain honest and no cross-system lock is implied. | ERP-D-185; ERP-Q-160 |
| ERP-R-195 | Support transferring eligible returned whole shipments after actual receipt and dispatching from the destination, preserving stable identity, price and history. | Earlier approved workflow is qualified by ERP-D-196: latest answer reaffirms ERP movement but does not establish whether subsequent Tawsel dispatch is withdrawn. Internal scope/lifecycle reconciliation remains; no unsupported mapping promise. | ERP-D-186, ERP-D-196; ERP-Q-161; TAWSEL-CHECK-003 |
| ERP-R-196 | Grant tracking-screen users company-wide shipment search with the full operational journey/current custody and state. | Explicit amendment of proposed assigned-branch search scope; mutations and unrelated financial/HR access remain separately scoped. | ERP-D-187; ERP-Q-162 |
| ERP-R-197 | Check sealed parcel identity/exterior at transfer receipt; count loose stock and record suspected shortage/damage for review. | Recommendation accepted; no implied certification of unseen parcel contents. | ERP-D-188; ERP-Q-163 |
| ERP-R-198 | Use one manifest per planned physical trip, with separate records for additional trips and honest unexpected-shortage handling. | Explicit owner choice; preserve shipment identity and existing actual-subset receipt rules. | ERP-D-189; ERP-Q-164 |

### Session 019 requirements

| ID | Requirement | Status / source | Decision / question links |
| --- | --- | --- | --- |
| ERP-R-199 | Attribute each complete customer-visit service charge to its historical work/dispatch branch for branch profit, including the agreed packing uplift. | Recommendation accepted; no internal-transfer revenue or duplicate attribution to intake branch. | ERP-D-190; ERP-Q-165 |
| ERP-R-200 | Handle a first/last partial salary month through a staff-calculated ordinary deduction from configured salary, then the existing net-payout process. | Explicit amendment of the proposed special month salary input. No automatic prorating or attendance engine. | ERP-D-191; ERP-Q-166 |
| ERP-R-201 | Keep the original storage anniversary day, using the last day of a shorter month temporarily and restoring the anchor when possible. | Recommendation accepted; fixed period amount and existing renewal/payment policies remain. | ERP-D-192; ERP-Q-167 |
| ERP-R-202 | Capture the agreed fixed reason for partial refusal as well as whole refusal, requiring explanation text for Other. | Recommendation accepted; exact Tawsel schema/event/correction compatibility still requires the documented extension. | ERP-D-193; ERP-Q-149; TAWSEL-CR-001 |
| ERP-R-203 | Earn the complete configured base-shipping-plus-packing service charge on every actual eligible customer visit, preserving the base-only percentage commission rule. | Default per-visit rule; base50 plus packing5 produces55. ERP-D-203 / ERP-R-212 add the explicit company-funded replacement-shipping waiver exception. Recipient money remains a separate fact. | ERP-D-194; ERP-Q-168; TAWSEL-CHECK-002 |

## Session 020 requirements

| ID | Requirement | Status / constraint | Source |
| --- | --- | --- | --- |
| ERP-R-204 | Keep the excluded earlier-attempt recipient shipping-payment scenario out of the selected business workflow. | CHECK-002 closes by scope exclusion; explicit prepaid-to-brand cases and actual per-visit company fees remain. No claim about unverified Tawsel aggregation semantics. | ERP-D-195; session020 answer1 |
| ERP-R-205 | Keep branch transfer as ERP carrier assignment, physical handover and actual destination receipt updating stock/custody. | Reconfirmed; no inferred Tawsel transport operation. The earlier subsequent-dispatch commitment requires internal reconciliation under the latest clarification. | ERP-D-196; session020 answer2 |
| ERP-R-206 | Make the intended UI concrete and reviewable early, then preserve the reviewed design in later implementation prompts and acceptance. | UI-REV-001 exists and its overall layout/design direction is approved in session022. Detailed screen coverage continues under UI-DESIGN-BRIEF.md. | ERP-D-197; ERP-D-198 |

## Session 022 requirements

| ID | Requirement | Status / constraint | Source |
| --- | --- | --- | --- |
| ERP-R-207 | Preserve UI-REV-001's approved layout/design direction across subsequent ERP screens, shared components and UI-bearing phase prompts. | Approved overall direction; link the applicable sample, specification and visual comparison in later prompts. A different global layout requires an explicit recorded amendment. | ERP-D-198; session022 owner approval |
| ERP-R-208 | Provide advanced filters on relevant operational and reporting screens without overcrowding their default layout. | Required for later phases. Define each screen's applicable fields, combinations, reset/empty states, responsive presentation and authorized scope during detailed design; verify important filter behavior and include a manual walkthrough. Exact filter lists remain screen-specific engineering/design work. | ERP-D-199; session022 filter request |

## Session 024 requirements

| ID | Requirement | Status / constraint | Source |
| --- | --- | --- | --- |
| ERP-R-209 | Reserve eligible brand-wallet funds for known brand-paid shipping when negative credit is disallowed, preventing competing payout or dispatch from consuming that cover. | Approved; exclude unremitted recipient proceeds and consume/release cover once with retained source identity. | ERP-D-200; ERP-Q-171; session024 answer1 |
| ERP-R-210 | Recognize the whole fixed storage period fee in its service-start calendar month, independently of payment timing. | Approved; replaces daily allocation proposal. Fee310 for January20-February19 contributes310 to January and0 to February for that period. | ERP-D-201; ERP-Q-172; session024 answer2 |
| ERP-R-211 | Distinguish employee entitlement deductions, advance recovery and incident recovery in payroll and operating profit. | Approved; salary6000, deduction200 and advance1000 produce cash4800 and cost5800; incident recovery counted once. | ERP-D-202; ERP-Q-173; session024 answer3 |
| ERP-R-212 | Support an explicit incident-linked company-funded replacement-shipping waiver while preserving normal driver commission and actual goods due. | Approved exception to ordinary full visit tariff; no recipient/brand shipping charge, zero net shipping revenue and no fabricated receipt. | ERP-D-203; ERP-Q-174; session024 answer4 |
| ERP-R-213 | Accept partial storage payments and advance storage credit with auditable balances and allocation history. | Capability approved; detailed separate-credit allocation/refund mechanics are submitted for plan review. No automatic brand-payout-wallet offset or revenue on an advance before period start. | ERP-D-204; ERP-Q-175; session024 answer5 |

## Session 025 requirement

| ID | Requirement | Status / constraint | Source |
| --- | --- | --- | --- |
| ERP-R-214 | Turn approved PLAN-001 into a complete dependency-ordered phase catalog and a standalone detailed English prompt for each result, assigning requirement/decision/screen/contract coverage and recording future execution evidence. | Authoring authorized now. Include prerequisites, exact rules, data/server/UI/integration/migrations, checkpoint verification, important Vitest, real dependencies, manual trials, verified model/effort recommendations and single-phase stops. No implementation is claimed by authoring. | ERP-D-205; session025 owner instruction |

## Session 001 — Initial reading and proposed first round

Read the required foundational documents and the large-reference indexes. The initial notes described ideas rather than a final specification. Recorded ERP-D-001 through ERP-D-008 and candidate requirements, without selecting a stack or writing a master plan.

Originally presented ERP-Q-001 through ERP-Q-007 together: company/service/scale, shipment journey, Merchant/Brand, people, money flow, current problems, and V1 success. No answers were available then. Their current statuses below supersede that historic all-open state.

## Session 002 — Simplified question presentation and restored original notes

The owner requested ordinary numbers such as 1 and 2, and asked whether zero-padded IDs implied hundreds of questions. ERP-D-009 separates simple chat numbering from stable internal IDs. No fixed total question count was chosen.

Read the reattached original fully, saved it, checked it against the readback, and closed the access issue. Displayed four questions: (1) one company versus multiple independent companies, (2) ready parcels versus product storage/fulfillment, (3) geography and scale, (4) current tools and main problems.

## Session 003 — Latest owner answers, English records, and prior choices

### English translations of the latest answers

These are meaning-preserving translations, not claims of verbatim English speech.

| Owner display answer | Recorded English answer | Actual topic / treatment |
| --- | --- | --- |
| 1 | Initially it will be separate for each company. If the product succeeds, I intend to turn it into SaaS later. | Resolves initial product scope within ERP-Q-001; ERP-D-011. No deployment topology inferred. |
| 2 | I do not fully understand the distinction, but it is supposed to store the brand's orders. The brand owner brings their orders, with a waybill containing each order's information. A Data Entry employee then enters the orders into the system by copying the information the brand owner wrote. | Partially resolves ERP-Q-001 and ERP-Q-002; ERP-D-012. Preserve the owner's uncertainty about product stock versus prepared parcels. |
| 3 | There will be a superadmin user for me on the developer side. I will use it to create branches and handle important support matters for the shipping company. The client or shipping-company owner will not know about it; the owner gets an admin role to manage their company and staff. | Answers administration under ERP-Q-004, not the displayed geography/scale question; ERP-D-013. Scale remains unanswered. Detailed support powers and visibility remain open. |
| 4 | I am a developer and I am still building the project. | Corrects the discovery context under ERP-Q-006; ERP-D-014. No real company pain, usage figures, or existing migration source was supplied. |

Additional explicit requests: all saved answers/files in English while owner answers in Arabic; read/import the full prior-owner attachment, close repeated questions, ask only unresolved portions, preserve latest answers, and continue the current discovery rather than restarting.

### Reconciliation outcome

- **Resolved or narrowed by latest answers:** per-company initial product model; brand-provided paper waybills and Data Entry; developer/company-admin distinction; greenfield developer context.
- **Imported without reapproval:** single role plus user exceptions; multiple branches with consistent capabilities; ERP staff/driver administration; ERP dispatch/preparation/receipt; predeparture versus postdeparture authority; exact/partial collection and refusal charge responsibility; native subset return receipt/disposition; actual-receipt-funded redispatch; execution and reporting boundaries.
- **Repeated subquestions closed:** multiple roles, single versus multiple branch membership, per-branch capability exceptions, which system assigns drivers, which system hosts return receipt, whether partial delivery exists, who bears refused shipping when the customer will not pay, service versus driver authority, and API versus shared-database integration.
- **Remaining partial questions:** intake/stock semantics, waybill detail, responsible actors, financial posting/remittance/settlement, Merchant/Brand, support scope, business states, pilot/scale, and architecture.
- **No actual owner-policy or boundary conflict identified in this comparison.** Developer superadmin is an additional ERP administration need, not an override of Tawsel authority. Exact support permissions are not yet chosen. A future choice contradicting the existing limits must be recorded explicitly.
- **Version distinction:** prior decisions cite `a891d189...`; supplied canonical contracts remain `32aad03e...`. No contract replacement is inferred.
- **Scope distinction:** Tawsel's approved stack/hosting and B2C/POD/GPS exclusions retain their own scope; they do not determine ERP stack or exclude ERP accounting, barcode scanning, or financial attachments.

### Internal question status at the end of session 003

| ID | Status | What remains |
| --- | --- | --- |
| ERP-Q-001 | Partially resolved | Ready parcels versus stock/fulfillment; planned geography/scale; later isolation/deployment detail. |
| ERP-Q-002 | Partially resolved | Brand intake/counting, waybill data, sorting/transfers, actors, commercial states/closure. ERP dispatch and return ownership are closed. |
| ERP-Q-003 | Open with known partial-policy boundary | Merchant/Brand relation, portal, accounts/contracts/reporting ownership. |
| ERP-Q-004 | Partially resolved | Role/branch model and admin distinction known; detailed responsibilities, permissions, support visibility/powers, financial authority remain. |
| ERP-Q-005 | Partially resolved | Delivery collection boundaries known; payment methods, posting, remittance, settlement, prices/fees/invoices/refunds remain. |
| ERP-Q-006 | Original operating-tool assumption corrected/closed | Pilot evidence and planned product priorities continue under ERP-Q-007. |
| ERP-Q-007 | Open | V1 scope, pilot participants, success/acceptance and representative operating envelope. |

Session 003 displayed four questions about parcel-versus-stock handling, a waybill example, the physical intake actor, and Merchant/Brand ownership. They were answered or corrected in session 004 below. The current batch is in ERP-OPEN-QUESTIONS.md.

## Recommendations and unresolved assumptions

- Unapproved recommendation retained from session 001: define V1 around a complete journey within a bounded pilot, including its custody and money consequences.
- No equal/proportional prepaid allocation, automatic refunds, full accounting ledger, merchant portal, barcode workflow, or SaaS billing model has been approved by silence or by a historical question list.
- No unrestricted developer access, password visibility, impersonation, hidden mutation, financial-history editing, or Tawsel override has been inferred from the superadmin request. Record the stated visibility intent faithfully, then discover exact powers and safeguards.
- Exact ERP fields, commands/events, error branches, callback limits, and recovery design await focused canonical review. No new technical mapping was approved in session 003.

## Work and verification performed

Only discovery documentation and English reference material were created/updated. Foundational references and prior-owner context were read as described; prior-owner source completeness and authority/scope comparison were independently reviewed in session 003. Session 003 document checks covered six Markdown files and 66 defined ERP IDs, with no Arabic text or undefined ERP references. The English prior reference retained all 50 named source items and their original Tawsel D references. No application implementation, database migration, live connector request, business transaction, deployment, or implementation test was performed. The master plan and phases remain gated by the agreed discovery and approval process.

## Session 004 — Ready parcels, paper fields, modular authority, and brand account

### English translations of the latest answers

| Display answer | Meaning-preserving English record | Resolution |
| --- | --- | --- |
| 1 | Yes, they are already ready. We are not the ones who will split or prepare each order. | ERP-D-030 closes ready parcels versus fulfillment under ERP-Q-001/002. |
| 2 | Waybill details: brand name, name, phone number, address, price, and a comment, for example whether inspection before receipt is allowed. | ERP-D-031 confirms the six described paper fields. No quantities, per-piece amounts, or separate shipping fee were supplied in the list. |
| 3 | We already said this is not a hardcoded role assigned to a particular person's task. It is modular: whoever is allowed a screen can perform that screen's operations; whoever is not allowed cannot. | ERP-D-032 corrects the assistant's question framing. It does not require a named Data Entry or receiving job to own the operation. |
| 4 | Brand is the customer involved in the money/collection relationship. The collection methods are Cash, Bank deposit, or InstaPay transfer. | ERP-D-033 resolves the commercial party. ERP-D-034 records methods while leaving the exact payer/payee movement unspecified. |

The owner also requested substantially more questions per batch to accelerate progress. ERP-D-009 now supersedes the assistant's previous 3-4-question batching choice; simple chat numbering and internal IDs are unchanged.

### Explicit amendments and closed subquestions

- Ready-parcel service is settled; do not ask about loose SKU stock or add fulfillment modules from the word storage.
- Paper-waybill fields are known; do not repeat the same field-list question. Ask only about meanings, supplementary data, and policy needed to implement it.
- Authority is modular and configurable. Do not infer behavior from Accountant, Manager, or Data Entry labels, and do not ask which fixed job title must perform receipt. Discover which screen action constitutes the physical assertion instead.
- Brand is the direct customer. The basic Merchant-versus-Brand question is closed. Brand portal and financial account behavior remain open.
- The chosen method list replaces the earlier generic Bank transfer candidate with the explicitly named InstaPay option. Electronic method names alone do not establish an API or automatic settlement.
- One role plus user exceptions, multi-branch scope, and Tawsel departure/actor restrictions remain valid. No permission correction grants an execution override.

### Source-data gap identified in session 004 and contract evidence

The described six paper fields do not supply piece quantities or exact outstanding per-piece amounts. Existing partial-delivery approval remains in force. This is a source-data gap requiring an ERP intake/business decision, not proof that the brand cannot supply more detail or that Tawsel is incomplete.

Focused canonical review in session 004 verified `SourceSnapshot.lines`, `Line.quantity`, `Line.unitDue`, `shippingDue`, `totalDue`, and `allocation: exact-outstanding-per-unit`, with their definitions and relevant referenced value schemas. Read complete positive examples for normal, prepaid, and partially prepaid source snapshots, and rejection examples for fractional quantity, missing unitDue, ambiguous aggregate deposit, and missing splitting permission. See the reading table for exact fixture IDs and limits.

In session 004, ERP-Q-010 asked how the missing source detail would be obtained. Session 005 answers 1/3 resolve that source: all piece details/values come from the brand. The original warning against invented quantities/equal allocations remains valid. ERP computes goods plus shipping; exact outgoing snapshot mapping and prepaid allocation are still unapproved. No runtime acceptance was claimed.

### Next displayed batch and remaining scope

Session 004 presented 12 prompts, ERP-Q-008 through ERP-Q-019: price meaning, shipping tariff, source of piece detail, inspection display, financial-method direction, driver remittance timing, brand settlement timing, initial receipt assertion, tracking labels, pre-dispatch branch transfers, Excel intake, and brand portal. Their session 005 outcomes are recorded below and in ERP-OPEN-QUESTIONS.md.

The original ERP-Q-001 through ERP-Q-007 remain parent topics with updated partial/closed statuses. Scale, pilot, support powers, architecture, costs, backup/restore, and remaining exception/financial policies are still open. No new feature among the next batch is approved by being asked.

## Session 005 — Pricing inputs, schedules, branch inventory, and V1 exclusions

### English translations of the owner's answers

| Display / internal question | Meaning-preserving answer | Decision / remaining detail |
| --- | --- | --- |
| 1 / ERP-Q-008 | The brand owner writes the piece values. The company totals them and adds delivery fees. After the order completes, the brand gets the money minus shipping costs. This supports configuring, at brand creation, whether its products allow partial delivery. | ERP-D-035. Goods values and recipient addition are clear; the base from which shipping is deducted for brand payout needs the numeric check ERP-Q-020. |
| 2 / ERP-Q-009 | Price depends on the brand's order volume and the area. For example, Cairo might be 60, but a brand above a monthly order count could get 55 or 50. The owner does not yet know how to implement that; company admin controls it as operations, not superadmin. | ERP-D-036. Examples are not tariffs/thresholds to hardcode. Assistant must propose a concrete mechanism for owner choice. |
| 3 / ERP-Q-010 | All piece details come from the brand. | Source-data question closed by ERP-D-035. |
| 4 / ERP-Q-011 | Use a clear inspection choice; comments are for other side details. | ERP-D-037 explicitly selects the recommended option. |
| 5 / ERP-Q-012 | These methods are for the brand to receive money from the shipping company. From now on, use the term tahseel for this specific movement. | ERP-D-038. Do not reuse that Arabic business label for recipient payment or driver remittance. |
| 6 / ERP-Q-013 | Initially end of workday, but choose after every round because there may be more than one round in a day. The owner asks whether a round is receiving ten orders, optimizing, starting deliveries, and finishing those orders. | Final timing choice ERP-D-039; explain explicit round closure and distinction from cash receipt, without changing the choice silently. |
| 7 / ERP-Q-014 | Specific weekdays agreed with each brand separately; configure them on brand creation. | ERP-D-040. Calendar configuration is not a scheduled automatic funds transfer. |
| 8 / ERP-Q-015 | Registration in the system means it was received immediately. | ERP-D-041. No separate pre-arrival order state is selected. |
| 9 / ERP-Q-016 | No barcode now; it may be added in future versions. | ERP-D-043. Human-readable reference was not rejected or specified. |
| 10 / ERP-Q-017 | No shipment transfer between branches is needed. Each branch receives/records its orders into its own inventory, dispatches from that inventory to drivers, then Tawsel/routing continues the execution. The owner supplied the Tawsel GitHub repository URL. | ERP-D-042. Branch inventory is parcel custody, not fulfillment stock. Source-branch return rules remain. |
| 11 / ERP-Q-018 | Defer Excel intake. | ERP-D-044. |
| 12 / ERP-Q-019 | Brand login/portal comes in a later phase. | ERP-D-045; no phase count or production of phase prompts authorized. |

### Round explanation and remittance boundary

The example is a normal round, but processing its last order does not automatically close it. Tawsel has an explicit driver round.end action. A round may end with unfinished/held work preserved; a workday may have multiple rounds; re-optimization alone is not another round. This is established behavior, not a new ERP choice.

Reviewed closure contracts and examples as listed in the reading section. The example p19-round-result closes a round after explicitly pausing heading and leaves workdayEndedAt null. End-round and end-day are distinct; human authentication is required. The rejected fabricated-settlement example confirms that adding settled=true to day closure is not a supported shortcut. These are fixture readings, not freshly executed tests.

Record remittance due after each round as the chosen ERP policy. Actual received money must be recorded separately; round.ended is not a cash receipt. No automatic cash-settlement event, ERP driver impersonation, or unpaid-cash start gate is assumed. Later accepted driver corrections within an open workday can affect effective amounts, so post-remittance adjustment policy remains a required future question.

### Financial ambiguity to resolve, not an adopted formula

Known: brand piece values form goods value, and shipping is added for recipient payment. The phrase money minus shipping could refer to that gross payment or to goods value. Ask ERP-Q-020 with goods 500, fee 60, recipient payment 560: is brand payout 500 and company retention 60? This is the likely interpretation presented for confirmation, not approved policy. Do not silently subtract a further 60 from the goods value, or declare that the owner intended a double charge.

### Unapproved tariff recommendation

For V1, propose a negotiated regional rate card per brand, maintained by company admin according to the monthly-volume agreement. The applied rate is known when entering an order. This avoids a retrospective adjustment just because the final monthly count changes. The alternative is automatic tiers with explicit counting/window/effective-date rules. ERP-Q-021 asks the owner to choose; no tariff engine, volume threshold, retroactive discount, or rate has been approved.

ERP-Q-023 separately asks whether a later rate edit affects only new orders or also registered, not-yet-departed orders. Recommend new orders only for clear recorded prices. Existing Tawsel postdeparture locks are unchanged in either case.

### New question batch and scope status

ERP-Q-020 through ERP-Q-031 cover the numeric payout check, tariff mechanism, geographic price granularity, rate-change effect, payout eligibility, partial payout, bank evidence, remittance shortfall, driver commission scope, return-to-brand handover, redispatch fees, and prepaid-order scope. Each has one simple display number in the next chat batch.

Closed or materially narrowed: piece-data source, inspection choice, method direction/terminology, remittance timing, payout weekdays, receipt-on-registration, branch transfer, barcode, Excel intake, and brand portal. Still open: precise financial rules/exceptions, reporting/scope acceptance, technical architecture/hosting/costs, support permissions, and coherent recovery.

## Session 006 — Service expansion, automatic tariffs, brand balances, and employee compensation

Date: 2026-09-27. Earlier sessions are historical snapshots; their ready-parcels-only exclusion is explicitly superseded here.

### Owner's service-model correction, translated into English

1. A brand can write the waybill and pack/seal its own recipient order; Data Entry enters it directly.
2. A brand can send an order for the shipping company to pack. Price this through higher shipping, for example an extra EGP 5, rather than a separate packaging charge.
3. A brand can leave product stock in the warehouse, send order details later, and have the shipping company prepare, pack, and deliver. Monthly storage fees differ according to the agreement with each brand.
4. These service options are configured when creating the brand. The owner has not yet specified whether one brand may enable several concurrently.

ERP-D-046 explicitly replaces ERP-D-030. ERP-D-041's receipt-on-registration rule now applies to the original parcel intake, not blindly to an order prepared from already received stock. Stock receipt, availability, allocation, packing, actual dispatch, returned quality, discrepancies, and storage billing become necessary discovery topics; their detailed workflow is not inferred. No new branch-transfer, barcode, portal, or bulk-import scope was selected.

### English translations of the 12 numbered answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-020 | No double deduction. With pieces worth 100 and 150 and shipping 50, the recipient pays 300; company keeps 50 and the brand account receives 250. Delivered orders accumulate, and the brand can receive the money on agreed days. | ERP-D-049. Distinguish account credit from actual payout eligibility under answer 5. |
| 2 / ERP-Q-021 | The system automatically chooses a tier from monthly order count. Company admin creates ranges and prices for each preconfigured region. Use registry/reference-data architecture. Inspect ERP-V2 only for UI/frontend/design/layout. Use shadcn + Smooth UI; no sidebars, top bars, or clutter. Fetch smoothui.dev/llms-full.txt. | ERP-D-050, ERP-D-060, ERP-D-061. No counter/window policy or complete stack selected. |
| 3 / ERP-Q-022 | Governorate and optional area. Selecting governorate alone uses its price; selecting a configured area can use a different price. An area need not be selected on every order. | ERP-D-051. Numeric/place examples are illustrative. |
| 4 / ERP-Q-023 | New orders only. Brand growth may move it to a cheaper tier, and shipping prices can later be renewed or increased; apply changes to new orders. | ERP-D-052. No rewriting existing prices. |
| 5 / ERP-Q-024 | Only after the driver actually remits the money to the company. | ERP-D-053. |
| 6 / ERP-Q-025 | Agreed. | ERP-D-054 explicitly accepts partial payout and carrying the remainder, as stated in the question. |
| 7 / ERP-Q-026 | Optional transaction reference; no images. | ERP-D-055. |
| 8 / ERP-Q-027 | Your recommendation is accepted. | ERP-D-056 records the actual recommendation: receive 950 against 1,000 reported; keep the reasoned 50 difference unresolved; no invented full receipt/automatic penalty. |
| 9 / ERP-Q-028 | Drivers may receive monthly salary, a percentage of shipping, or both. Monthly-pay employees need recorded deductions and advances. Configure this when creating the employee. | ERP-D-057. Other staff scope and formulas remain open. |
| 10 / ERP-Q-029 | Exactly, yes. | ERP-D-058 accepts actual branch-to-brand handover recording. |
| 11 / ERP-Q-030 | If the driver goes to the recipient and the recipient refuses, shipping is charged; reasons will be recorded. If the recipient postpones before the driver goes, no shipping charge yet; driver retains the order for another delivery attempt. | ERP-D-059. Does not establish repeated-visit/new-cycle fees or no-answer-after-arrival charging. |
| 12 / ERP-Q-031 | This is called tahseel. The owner does not understand the connection to the question and restates delivered balances, payout days, and methods. | No prepaid-order scope answer. Keep the question unanswered and parked, not approved/rejected. Explain separately that it concerned recipient money already paid to the brand before delivery. |

### Targeted contract review and compatibility conditions

- Re-read 02's physical-arrival/outcome boundary. Calls/navigation and phone-only outcomes do not establish arrival.
- Read 04's complete refusal and no-answer HTTP path entries: human company/personal sessions, CSRF, requests, and listed 200/400/401/403/409 responses. Referenced result/error dependency trees remain incomplete. These endpoints are not source-service connector capabilities.
- Read complete 05 definitions: outcomes.Refusal, NoAnswer, Collection, Calculation, Record, RefusalCommand, NoAnswerCommand; current-activity.Arrival, ArrivalEvent, PhysicalOrigin. Read the outcomes schema description. Envelope/time/reference dependencies and all related event paths still need later review.
- Read complete 06 fixtures p17-refused-paid-command, p17-refused-unpaid-command, p17-no-answer-command, p17-no-answer-record, p17-invalid-no-answer-arrival, and p17-no-answer-fabricated-collection, including the initially omitted tail of the last negative fixture. They were read, not executed.
- Canonical `Refusal` has no reason field and `additionalProperties: false`. ERP reason capture is possible as its own commercial record; requiring driver-native reason entry would need identified Tawsel support or an explicit contract change. No field is silently invented.
- `no-answer` has `reported: null`, zero shipping/unpaidShipping, and `shippingStatus: not-attempted` for company work. Do not translate it into recipient refusal or money received. If the owner chooses a commercial fee for arrival with no answer, design a distinct ERP charge supported by accepted evidence; do not alter the canonical outcome. Whether that commercial policy is wanted is still open.
- Record arrival may be null. Missing arrival must stay unknown; no visit-based fee mapping is finalized. Repeated attempts and new dispatch cycles still require their own pricing decision and canonical retry/redispatch review.
- Contract reference remains 32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada. No Tawsel code, deployment, or baseline changed.

### UI evidence and reading limits

See [UI reference notes](docs/discovery/references/ERP-UI-REFERENCE-NOTES.md). Public ERP-V2 metadata/tree and six selected frontend files were reviewed at commit 7254e34b49acfbe394da3a889abe6e458084cb38. No backend/business rules were adopted and no running UI was visually tested. The live homepage URL was observed in repository metadata, not tested.

Fetched the full Smooth UI text to a temporary local reference and read selected catalog, installation/registry, Vite prerequisites, animation, and reduced-motion sections. Fetching the file does not mean reading every component/example. Compatibility is documentary evidence; no dependency install, build, RTL, keyboard, or browser verification was performed.

### Next questions and verification boundary

The next batch is ERP-Q-032 through ERP-Q-045, shown as 1-14. It asks only unresolved service, stock, tariff timing, fee, reason-entry, and compensation details. Recommendations remain unapproved. Later finance/architecture/recovery coverage remains active; this is not a final plan or phase breakdown. Only English discovery/reference documents were changed; no application tests or live connector calls were run.

Document validation covered seven Markdown files: 61 decision definitions, 62 requirement definitions, and 45 question definitions, totaling 168 distinct IDs. No duplicate definitions, undefined ERP-ID references, or Arabic-script text were found. The current batch contains 14 questions. No master-plan.md or phases directory was created. These are document consistency checks, not implementation tests or completeness approval.

## Session 007 — Manual tiers, prepaid orders, visit charges and simple HR

Date: 2026-09-27. Changes are recorded explicitly; prior session narratives are historical snapshots.

### Opening clarifications translated into English

- A top bar like the old application is acceptable. The owner objects to global system/module tabs and confusing crowded screens, not Back/navigation utilities. Pages should minimize choices and make the next action clear. This is a product preference for the intended audience, not an established demographic usability fact.
- If the recipient paid goods to the brand, the recipient owes only shipping to the driver, and no goods proceeds are newly owed through the ERP brand payout account for that order. If the recipient also paid shipping to the brand, the driver delivers without taking money; debit shipping from the brand's payout balance.

### English translations of the numbered answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-032 | Your recommendation is good; accepted. | ERP-D-065: several enabled services, one per-order choice and a default. |
| 2 / ERP-Q-033 | Your recommendation is right: a fixed agreed amount. | ERP-D-066: per-brand packing increment added to applicable shipping. |
| 3 / ERP-Q-034 | It differs by brand, is set during brand creation, and can be updated later. | ERP-D-067 confirms configuration/editability. Fixed monthly amount versus stock/space formula was not explicitly selected. |
| 4 / ERP-Q-035 | It is paid separately. | ERP-D-067: no automatic storage offset against payout. |
| 5 / ERP-Q-036 | Your recommendation is accepted. | ERP-D-068: separate variant quantities within the brand. |
| 6 / ERP-Q-037 | Block confirmation and show that there is no stock and stock needs to be added. | ERP-D-068: prevent confirming an understocked order. |
| 7 / ERP-Q-038 | Your recommendation is accepted. | ERP-D-068: actual receipt and condition inspection before sound stock is available again; damaged/uncertain excluded. |
| 8 / ERP-Q-039 | Do not calculate and assign the tier automatically. At brand creation, the brand states its expected volume range and staff record its tier. Still track the counts for analytics and reports. Automatic selection would be unnecessary complexity. | ERP-D-063 explicitly supersedes ERP-D-050 / ERP-R-052. |
| 9 / ERP-Q-040 | The method was explained in answer 8. | Close automatic monthly counting/reset design for pricing. No automatic tier movement is retained. |
| 10 / ERP-Q-041 | Charge the visit because the driver spent fuel and time reaching the recipient. | ERP-D-069: visited no-answer earns a commercial charge. |
| 11 / ERP-Q-042 | Another visit is charged again. Whenever the driver arrives and receives no money, charge the brand and deduct from payout, whether or not it will be delivered again. | ERP-D-069: physical visits, not retry commands or events, are the trigger. |
| 12 / ERP-Q-043 | The driver records the reason in Tawsel and it comes back to ERP. Gather all Tawsel amendments in one file; after the plan, the owner will send it to Codex in the Tawsel repository. | ERP-D-070. Current contract is not silently changed and ERP-only entry is not selected. |
| 13 / ERP-Q-044 | Apply the percentage to 50 only; packing does not concern the driver. | ERP-D-071 excludes the packing increment; earning/receipt timing still unanswered. |
| 14 / ERP-Q-045 | Make it for all company employees. This simple HR module will not depend on linking Tawsel drivers; add a person and set up their information/entitlements. Inspect the ERP-V2 HR page as the reference. | ERP-D-072. Commission attribution/input and exact reference features remain open. |

### Financial distinctions to preserve

| Example with goods 250 and base shipping 50 | Recipient pays driver | New goods credit in the ERP brand account | Shipping consequence |
| --- | --- | --- | --- |
| Nothing prepaid | 300 | 250, with payout available after actual driver remittance | Company retains 50 once. |
| Goods paid directly to brand | 50 | 0 for those prepaid goods | Company receives shipping through actual driver remittance. |
| Goods and shipping paid directly to brand | 0 | 0 for those prepaid goods | Debit the brand 50 for commercial shipping; no invented driver remittance. |

These are confirmed full-delivery examples, not complete refund/partial-deposit/partial-delivery accounting rules. Every real visit may produce a separate fee under ERP-D-069. Avoid duplicate charges from replay, outcome correction or multiple events describing the same visit. Commission base must use commercial base shipping, not blindly read outstanding Tawsel shippingDue: a zero-due recipient can still generate company shipping revenue and potentially commission under the eventual compensation rule.

### Reference reviews and contract findings

A delegated read-only HR review inspected public ERP-V2 main at 7254e34b49acfbe394da3a889abe6e458084cb38. See docs/discovery/references/ERP-HR-REFERENCE-NOTES.md for exact frontend files, selected helper/route excerpts and limits. Observed employee setup, month/branch HR view, manual adjustments, history and payment dialogs. The reviewed reference has no shipping-percentage commission. No app was run or source behavior adopted as tested guarantees.

A separate delegated read-only canonical review checked full relevant definitions/fixtures for prepayment, refusal reasons, explicit arrival, retry identity and corrections. See TAWSEL-CHANGE-REQUESTS.md for the exact reading ledger. Full prepaid modes fit existing outstanding SourceSnapshot allocation. Explicit arrival events already exist. A driver refusal-reason extension is a confirmed gap; complete arrival/no-answer/replay acceptance and repeat recipient-shipping semantics need further verification, not an invented new API.

Current no-answer still reports no collected money or unpaid shipping; ERP commercial brand liability stays separate. Existing integration.replayEvents and integration.getTaskHistory are relevant source-service recovery reads. Outcome/arrival/correction commands retain human authority. Cross-stream ordering cannot be assumed and current-state reconciliation cannot manufacture historical visits.

### Pending next round and work boundary

ERP-Q-046 through ERP-Q-059 ask the remaining storage, balance, payment, fee, reason and HR details, displayed as 1-14. No repeated automatic tier/counter question is retained. The reason model and any proposed HR policies are recommendations until answered.

Only English discovery/reference/change-request documents were edited. No Tawsel or ERP application code, master plan, phases, dependency installation, purchase, runtime integration or implementation test was performed. The requested future Tawsel handoff remains in one evolving file; no baseline upgrade or automatic repository monitoring is claimed.

Document checks covered nine Markdown files, with 72 decision, 73 requirement and 59 question definitions (204 distinct IDs). No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next batch has 14 questions. No master-plan.md or phases directory exists. This validates document consistency only, not requirement completeness or runtime behavior.

## Session 008 — Storage subscription, declared delivery amounts and payroll rules

Date: 2026-09-28. Current owner answers supersede incompatible prior recommendations; no final plan or implementation is authorized at this stage.

### English translations of the owner's answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-046 | A fixed amount agreed monthly. | ERP-D-073 closes storage price basis. |
| 2 / ERP-Q-047 | Its month runs from the 20th to the next 19th; treat it as a subscription. | ERP-D-073 selects anniversary billing, not calendar-month proration or ERP SaaS subscription billing. |
| 3 / ERP-Q-048 | It depends on the brand. Make allowing a negative balance an option enabled for some brands and disabled for others. | ERP-D-074; disabled-option gate still needs definition. |
| 4 / ERP-Q-049 | The brand-recipient payment arrangement is not the shipping company's concern. The brand supplies the order value and shipping/recipient-agreed inclusive amount; do not complicate that relationship. | ERP-D-075 excludes deposit administration. Preserve full-prepaid cases and already supplied piece detail. Do not infer equal allocation from aggregate amounts. |
| 5 / ERP-Q-050 | Do not model that detail. If the brand sends orders for company packing there is a small fixed increase, whether repacking occurred or not. | ERP-D-076 rejects charging per physical packing operation. Keep the agreed service-price uplift. |
| 6 / ERP-Q-051 | Coded reasons, plus the ability to write another reason. | ERP-D-077: codes plus Other. Catalog owner/transport and required cases were not specified by this answer alone. |
| 7 / ERP-Q-052 | The driver earns it normally; whether the brand paid does not concern the driver. This is an edge case. | ERP-D-078: unpaid brand fees do not gate earning. |
| 8 / ERP-Q-053 | Calculate it from the driver's work recorded in ERP. Configure on driver creation whether commission applies and its value, usually a fixed number. The system counts their completed work and shows the commission. HR must show full entitlement and separately show salary and commission. | ERP-D-078. Automatic calculation and display are settled. Fixed monetary amount versus the earlier percentage, and per-order/per-visit unit, need a numeric clarification. |
| 9 / ERP-Q-054 | Yes, add them. | ERP-D-079 accepts manual bonus and overtime monetary additions from the question. |
| 10 / ERP-Q-055 | Allow partial payment. | ERP-D-080. |
| 11 / ERP-Q-056 | Advances are not repaid automatically. The responsible employee records repayment manually. | ERP-D-081. Do not subtract every advance from payroll automatically. |
| 12 / ERP-Q-057 | This is unlikely, but if it occurs net payable is zero and the remaining 500 is carried into the following month. | ERP-D-082. Does not authorize automatic advance recovery. |
| 13 / ERP-Q-058 | A paid month or a past month cannot be changed. Amounts can increase/decrease in the current month while unpaid, or in future months. | ERP-D-083. Paid-period immutability is stronger than simply linking an adjustment; partial-payment locking still needs definition. |
| 14 / ERP-Q-059 | Add work days, number of work hours and weekly day off. | ERP-D-084. These fields do not create attendance/hour-derived payroll requirements. |

### Resolutions and remaining material ambiguities

- Fixed anniversary storage fee, negative-balance option, manual advance repayment, bonuses/overtime, partial payroll, deficit carry, paid/past period protection and work-schedule fields are settled.
- Automatic commission and payment independence are settled. The phrase usually a fixed number may replace the earlier percentage model, but does not supply a numeric unit. Preserve that explicit tension under ERP-Q-060, rather than silently implementing a fixed amount or both modes.
- Automatic commission can arrive after a partial salary payment, including through delayed accepted execution events. Define when that period locks and where a valid late adjustment is posted; do not erase it or edit protected history.
- A negative-balance switch controls future operation according to the selected gate. It cannot prevent recording a real already-earned charge. No remote Tawsel cancellation or financial start gate is inferred.
- The brand owns its deposit relationship. ERP needs only declared outstanding amounts, stable line identities/quantities and shipping to build the supported delivery snapshot. Original retail price and brand deposit records are not mandatory for that purpose. Existing full-prepaid cases remain valid; zero recipient shipping is not zero company fee or commission base.
- Packing uplift remains part of service pricing independent of repacking. The rejected operation-count recommendation must not reappear as an approved requirement.

### Focused contract and consistency reviews

Two delegated read-only reviews checked the latest decisions against the ERP registers and the pinned canonical boundary. No agent edited files or ran runtime tests.

The contract review rechecked 02's amount boundary and 05's b2b-intake Money/Line/SourceSnapshot definitions against the previously read full p10-explicit-prepaid, p10-exact-partial-prepaid, p10-missing-unit-due and p10-ambiguous-deposit fixtures. Exact outstanding unitDue and shippingDue are required; an arbitrary aggregate deposit cannot be allocated silently. The earlier brand-supplied piece-data decision remains in force, so do not repeat the rejected deposit-administration question.

The review also checked the complete 04 operation inventory, 03 caller/server boundaries and 05 provisioning SourceConfiguration/ProvisioningChanged. Existing external consumer.receiveSignedEvent, consumer.getStatus and source.getCommandStatus are transport/status boundaries, not generic master-data catalog delivery. ProvisioningChanged.entity is limited to source/branch/role/user/driver. Coded refusal reasons plus Other remain in TAWSEL-CR-001; if ERP manages that catalog, authorized delivery/versioning/offline/historical behavior must be added explicitly. No endpoint name or supported capability is invented.

The consistency review flagged percentage versus fixed commission, partial-payment locking, manual-repayment arithmetic and future-operation credit gating. These are targeted unresolved details, not reasons to restart discovery or review Tawsel completion.

### Next round and work boundary

ERP-Q-060 through ERP-Q-073 cover the remaining commission/payroll/credit/subscription decisions, then continue stock preparation/cancellation, identifiers, loss handling, report priorities and initial scale. They are displayed as 1-14. Recommendations remain unapproved until answered.

Only English discovery/reference/change-request documents were updated. No application code, master plan, phases, dependency installation, live API request or implementation test was performed. The Tawsel canonical baseline remains unchanged.

Session 008 document checks covered nine Markdown files, 84 decisions, 86 requirements and 73 questions (243 distinct defined IDs). No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next batch contains 14 questions. No master-plan.md or phases directory was created. These are document checks, not implementation tests or completeness approval.

## Session 009 — Compensation setup, stock preparation, custody liability and report selection

Date: 2026-09-29. The owner's instruction to continue resumes discovery; it does not authorize a final plan or implementation.

### English translations of the owner's answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-060 | There are three compensation arrangements. Have one independently enabled section for a fixed salary and another for commission. Inside commission, choose percentage or a fixed amount per order. Enable either section or both. | ERP-D-085 resolves the formula tension. Answer 2 defines the eligible counting unit as each actual visit. |
| 2 / ERP-Q-061 | Count it twice; the two visits may even be performed by different drivers. | ERP-D-086 attributes each eligible visit to its own performing driver. |
| 3 / ERP-Q-062 | Cancel partial salary payout. If someone needs money early, use an advance instead of another partial-payment workflow. | ERP-D-087 explicitly supersedes ERP-D-080 / ERP-R-082. Partial brand payout stays approved. |
| 4 / ERP-Q-063 | Staff record that an employee took an advance of 1,000. With salary 6,000, the employee receives 5,000 at month end. Recheck this part of ERP-V2. | ERP-D-088 explicitly supersedes ERP-D-081 / ERP-R-083. Advance issuance, recovery allocation and net salary payout remain distinct records. |
| 5 / ERP-Q-064 | Accepted. | ERP-D-089 records the specific recommendation: accept truthful physical intake but block new driver handover until the no-debt brand has sufficient cover. |
| 6 / ERP-Q-065 | At the beginning. Staff do it manually: when the brand pays, the responsible person selects that brand and adds its payment. | ERP-D-090: storage due at period start, actual receipt recorded manually. |
| 7 / ERP-Q-066 | Accepted. | ERP-D-090 records renewal until explicit termination, including temporary zero stock. |
| 8 / ERP-Q-067 | Exactly. | ERP-D-091: reserve stock on confirmation; retain physical branch on-hand until handover. |
| 9 / ERP-Q-068 | Yes, that is good. | ERP-D-092: preparation queue and explicit ready action; ready parcels skip preparation. |
| 10 / ERP-Q-069 | Accepted. | ERP-D-093: pre-handover cancellation with reason, reservation release, and separate physical return of ready parcels. |
| 11 / ERP-Q-070 | Yes, but use easy numeric identifiers without letters or punctuation. Make the brand's reference optional; it is fine if absent. | ERP-D-094: numeric readable shipment number, optional brand reference. Technical contract identifiers keep their formats. |
| 12 / ERP-Q-071 | While the order is in company custody, the company bears its value and compensates the brand. For driver-held damage, charge the driver, or share liability: value 400 may be company 200 and driver 200. For warehouse loss, mark it lost, settle with the customer, and ask the customer to send a replacement. This is important; ask until everything is clear. | ERP-D-095. The warehouse phrase could mean paying or charging the client; its translation deliberately leaves that direction unresolved. Preserve the preceding explicit company-compensates-brand rule and ask ERP-Q-074. |
| 13 / ERP-Q-072 | Include specialized filters wherever useful, such as periods and branches. Send the important/common reports and I will choose which we need. | ERP-D-096. Candidate menu is ERP-REPORT-CATALOG.md; selection remains open. |
| 14 / ERP-Q-073 | We will try the first client. I do not know actual usage; maybe 3 branches, 10 drivers and 150 orders/day. This is an estimate only. | ERP-D-097; provisional sizing, not measured usage. |

### Explicit amendments and financial boundaries

- Payroll now has one final net payout. The partial-payroll lock question is obsolete, while actual paid/past calculations remain protected. Late commission/corrections still need a current-unpaid/future adjustment policy.
- Advance issuance is an actual earlier payment. Deducting its recovery in payroll is not a second company cash payment or a fictitious cash receipt. A 1,000 advance and 5,000 final salary payout total 6,000 cash paid in the simple example. Carry allocation must prevent repeated recovery.
- Company compensation owed to a brand and a driver's share of loss are separate obligations. Neither is reported recipient payment or actual driver remittance. No financial amount or stock recovery is inferred merely from an incident label.
- A lost item cannot fund a replacement dispatch as if it were available stock. New physical replacement intake, any accepted disposition, financial compensation and recovery of goods require distinct, traceable facts. No new Tawsel command is asserted by this business discussion.
- Storage renewal creates a due period according to the agreement; it does not assert actual money receipt. A temporary empty-stock balance does not end the agreement.

### Fresh reference review and limits

The primary agent rechecked public ERP-V2 main at 7254e34b49acfbe394da3a889abe6e458084cb38. Read the complete backend/utils/payrollMath.js and backend/routes/employees.js lines 57-127, 168-307 and 536-687 for monthly filtering, adjustment creation and net salary payment. HRPage.jsx was retrieved and searched for relevant payment actions, not fully reread in this session. See the HR reference notes for links and boundaries.

The helper deducts advances and deductions from salary and adds bonuses/overtime. The selected route records advance issuance as a cash outflow and calculates the final payroll net. Its rejection of negative net differs from the owner's retained zero-net/residual-carry policy. Its POS-shift/manager gates and treasury design are not adopted automatically. No source inspection proves transaction safety, cross-month recovery or the new ERP's behavior.

Relevant loss/custody passages in 02-BUSINESS-BOUNDARY-AND-MAPPING.md were rechecked: delivered, held, branch-received, lost and damaged quantities have distinct accounting meanings. Actual receipt/disposition exceptions do not grant unrestricted departed-task editing. No new full 04-06 schema/fixture coverage or runtime conformance is claimed in this session.

### Next round and work boundary

ERP-Q-074 through ERP-Q-085 focus on compensation, replacement/recovered goods, report output and report selection, displayed as 1-12. Proposals remain unapproved. ERP-REPORT-CATALOG.md lists 28 candidates covering discovered and conditional supporting workflows; selecting them does not silently approve missing accounting or stock-count processes.

Only English discovery/reference documents were edited. No application code, master plan, phases, dependency installation, deployment, source-repository mutation or implementation test was performed. Contract baseline remains unchanged. No automated repository monitoring or synchronization is claimed.

Session 009 document checks passed across ten Markdown files: 97 decision definitions, 101 requirement definitions and 85 question definitions (283 distinct IDs). No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next batch contains 12 questions and the proposed report menu contains 28 candidates. No master-plan.md or phases directory exists. These are document consistency checks, not application tests, final coverage approval or verified runtime behavior.

## Session 010 — Simple money movements, compensation confirmation and selected reports

Date: 2026-10-01. Discovery continues from the existing records; this is not a restart or implementation authorization.

### English translations of the owner's answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-074 | Yes, the company pays the brand the value of the lost goods. | ERP-D-098 closes the warehouse payment-direction ambiguity. |
| 2 / ERP-Q-075 | Yes to your recommendation; it should be 400. | ERP-D-098 selects goods value only, excluding the example's shipping 50. |
| 3 / ERP-Q-076 | Do not complicate this case. In that situation the order's money is added positively to the brand account in its payout wallet. | ERP-D-099/100. Ordinary compensation credit is confirmed; the proposed compulsory intake valuation detail is not accepted. How staff supply the numeric compensation amount remains a narrow question; do not silently infer zero or remove fully prepaid delivery support. |
| 4 / ERP-Q-077 | Your recommendation is accepted. | ERP-D-098: compensate only the affected pieces in a partially damaged order. |
| 5 / ERP-Q-078 | Your recommendation is accepted; that is what I meant in answer 3. | ERP-D-099: after confirmation, positive compensation becomes eligible on the existing brand payout schedule, without waiting for driver recovery. |
| 6 / ERP-Q-079 | It goes onto the driver's account as an ordinary deduction and is deducted from salary. Treat these screens as positive/negative money with a payout button, whether driver salary or brand payout. Every movement must be recorded in the monthly or other period history, covering deductions, compensation, additions and similar changes. | ERP-D-101: simple balance UI, ordinary salary deduction and complete movement history. Underlying event/movement types and previously agreed payout/period rules remain. |
| 7 / ERP-Q-080 | The idea is very good, but omit it if it will make things complicated. Check that; it needs a clear UI explaining the relationship. | ERP-D-102 is conditional, not unconditional approval of a new subsystem. Bounded response: ordinary new-shipment entry with a visible original-shipment link and new numeric reference. |
| 8 / ERP-Q-081 | The responsible employee decides according to the agreement for each incident. | ERP-D-103: case-specific replacement shipping liability. |
| 9 / ERP-Q-082 | This is a rare edge case and outside the system's responsibility. The company owner and brand should settle it outside ERP. | ERP-D-104 excludes a dedicated found-after-compensation workflow in V1. Do not keep asking for its detailed process. |
| 10 / ERP-Q-083 | Your recommendation is accepted. | ERP-D-105: report first, then explicitly confirm compensation and responsibility allocation. No hardcoded manager or second-person approval is inferred. |
| 11 / ERP-Q-084 | All three output options, with very clear, good formatting. | ERP-D-106: screen, Excel and print/PDF. |
| 12 / ERP-Q-085 | Distinguish records, which important workflows need anyway, from reports for monitoring where the company makes/loses money. Select 1, 5, 7, 8, 9 and 10 together, 12, 15 (especially important), 18 (also especially important), and 20. Adjustments must have a separate operational page outside reports, with manual adjustment capability. Items 24/25 belong in HR anyway. | ERP-D-107 through ERP-D-109. Selected report set and placement are explicit; the full scope of manual adjustments and financial/count inputs remains under discovery. |

### Resolved choices, conditional acceptance and exclusions

- Confirmed warehouse compensation, goods-only/affected-subset basis, positive brand account entry, post-confirmation eligibility and ordinary salary deduction for the approved driver share. Numeric incident amount entry is the only remaining valuation-input question; do not reopen payout direction or insist on a new intake field.
- Confirming a compensation event is separate from actually paying the brand. The positive wallet entry is not company cash received, recipient payment, driver remittance or duplicate ordinary goods proceeds. Driver recovery is a separate linked obligation; no automatic penalty follows from an unreviewed loss report.
- Signed movements simplify the UI. Preserve their reason/source/type and a recorded payout, so advances, net salary, fees, compensation and corrections cannot silently duplicate or erase one another. Historical payroll protection, zero-net/carry and the different employee-versus-brand partial-payment rules remain.
- The linked replacement is conditionally accepted if simple. Reusing the ordinary creation form with a visible link bounds the proposed ERP surface; it does not prove implementation effort or authorize a new Tawsel operation. New replacement goods require actual intake and must not be confused with redispatch of a lost item.
- Dedicated found-after-compensation recovery and negotiation are explicitly outside V1. No automatic reversal, stock availability or historical rewrite follows from an off-system agreement. General manual adjustments are a separate requested feature with targets still to define.
- Selected reports and their output formats are now closed choices. Required operational histories remain in their working screens. REP-09/10 share a page and REP-24/25 stay in HR. REP-15/18 are the owner's highest stated report priorities. The adjustment page is an operational surface, not a report with arbitrary write controls.

### Why the next financial questions are necessary

The selected profit report cannot be defined from the visible positive/negative balances alone. Company shipping/storage/service revenue, brand-owned proceeds, employee advances, salary cost, compensation, driver recovery and transfers need distinct meanings. Actual cash position and period profit may differ. Expense timing, account structure, branch attribution and opening balances remain owner choices; no general ledger, accounting standard, tax feature or automated bank service is silently selected.

Likewise, selecting stock balances and count differences requires deciding what is counted and how movements during the count are handled. The manual-adjustment request requires a bounded list of targets and explicit correction history, while preserving known inventory, payroll and Tawsel authority rules.

### Sources, reading and work boundary

Reconciled the current English discovery/decision/question/report registers and the existing HR/prior-owner/Tawsel change notes. No new external source or canonical HTTP/schema/fixture body was needed to record these business answers. No new mapping or API behavior is fixed by this session; baseline 32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada remains unchanged. Selected-command/event failure and recovery coverage is still required before closing integration design.

ERP-Q-086 through ERP-Q-099 are displayed as 1-14. They cover the remaining incident amount input, financial report basis, expenses/accounts, manual adjustments, stock counting, opening balances and payment-method scope. Recommendations remain unapproved until answered. No silence is treated as acceptance.

Only English Markdown discovery/reference documents were changed. No application code, master plan, implementation phases, UI prototype, dependency install, transaction, external message, deployment or application test was produced or run.

Session 010 document checks passed across ten Markdown files: 109 decision definitions, 115 requirement definitions and 99 question definitions (323 distinct IDs). No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next batch has 14 questions. The 28-item catalog has exactly the ten selected report items (1, 5, 7, 8, 9, 10, 12, 15, 18, 20), plus items 24/25 assigned to HR history; catalog table structure was checked. No master-plan.md or phases directory exists. These checks establish document consistency only, not application behavior, runtime integration, final report formulas or completed discovery.

## Session 011 — Branch-scoped expenses, treasury operations and daily inventory monitoring

Date: 2026-10-01. This session follows session 010 on the same date. The final empty numbered line in the owner's message supplies no additional answer or requirement.

### English translations of the owner's answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-086 | Yes, accepted. | ERP-D-110: enter the agreed compensation amount at incident confirmation if missing, and post the positive brand movement once. |
| 2 / ERP-Q-087 | Your recommendation is accepted. | ERP-D-111: work-period profit and a separate actual-money position, qualified by answer 5's paid-only manual expense capture. |
| 3 / ERP-Q-088 | Accepted; that is sufficient for V1. | ERP-D-111: company and branch profit; no V1 brand/area allocation requirement. |
| 4 / ERP-Q-089 | There will be an Expenses page for recording these items and an expense page in reports. Record against the current user's branch. If the user is assigned several branches, they choose the branch for the expense. Review ERP-V2's expense and branch/user handling to understand the intended behavior. | ERP-D-112/113 add REP-14 and explicit assigned-branch attribution. Configurable category policy is still a proposal; source review is authorized, not wholesale business adoption. |
| 5 / ERP-Q-090 | That is not how it works. Record the expense and its date when it is paid. Do not introduce when it becomes due; record the completed action. | ERP-D-114 explicitly excludes unpaid expense/AP workflow and narrows the broad report proposal accepted in answer 2. |
| 6 / ERP-Q-091 | Exactly. Review the reference again for the details. | ERP-D-115 accepts branch cash accounts and named company bank accounts with method/account distinction. Reference scopes do not automatically replace that choice. |
| 7 / ERP-Q-092 | There is a treasury transfer page; inspect its features and details in ERP-V2. | ERP-D-116 includes the page. Send/receive confirmation versus immediate recording remains a material workflow choice after source review. |
| 8 / ERP-Q-093 | Accepted. There is also a separate deposits/withdrawals page; inspect it in ERP-V2. | ERP-D-117: insufficient-funds blocking and the separate page. General movement purposes remain to define. |
| 9 / ERP-Q-094 | All of them. The adjustments page is very important and should cover most or all important operations, so an authorized person can reconcile the system with reality when something happens that the ordinary workflow did not anticipate. | ERP-D-118 selects all named target families. Preserve legitimate target-specific correction, history and existing authority boundaries; do not convert this into unrestricted deletion or arbitrary Tawsel state changes. |
| 10 / ERP-Q-095 | Your recommendation is accepted. | ERP-D-119: linked reasoned reversal/correction, preserving the original record. |
| 11 / ERP-Q-096 | Both. This screen is important and used daily. What I mean is more an inventory monitoring page with filters and search than just stock counting. Ask about this because I may be mixing the terms and do not want to confuse the design. | ERP-D-120: products and parcels in daily monitoring; ask focused presentation/custody questions. |
| 12 / ERP-Q-097 | I do not want that kind of system stock count. I will compare physically outside the system; if something needs adding or removing, I will correct it from the adjustments page. | ERP-D-120 replaces the formal-count interpretation: no count sessions or count-driven freeze. Individual discrepancy adjustments remain. |
| 13 / ERP-Q-098 | Exactly, and make it optional, such as an optional action, because a new shipping company may start from zero. | ERP-D-121: optional dated opening balances/stock, not mandatory setup/migration. |
| 14 / ERP-Q-099 | Accepted. | ERP-D-122 extends Cash/Bank deposit/InstaPay to storage, salary/advances and company expenses. Recipient/driver methods are not answered by this acceptance. |

### Explicit scope amendments and remaining financial definition

- REP-14 expense reporting is added. The earlier nonselection is superseded. Expense operations and reporting are distinct pages; the actual expense branch is selected from assigned branches and must remain clear when a shared bank account funds it.
- REP-20 must not produce a formal count workflow. Daily inventory monitoring is the priority, with actual comparisons outside ERP and reasoned corrections through the adjustments page. Product quantities and individual parcels require different adjustment semantics. Counting pauses, sessions and approvals are excluded.
- The period-profit preference remains, but ordinary expense inputs exist only when paid. Payroll/work/confirmed compensation facts can exist before their cash settlement, while unrecorded unpaid ordinary expenses cannot be included. The final report must disclose this data boundary and use a consistent source-based formula; it is neither automatically a full accrual statement nor automatically a cash-only total. Do not add rejected payable workflows to make an imagined accounting model complete.
- All proposed adjustment target families are included, and linked reversal/correction is selected. Each action still needs a defined reason, actor, branch/resource scope, effect and source relationship. A manual financial entry is not an accepted driver outcome, actual receipt or license to bypass Tawsel authority. Record any specific unsupported desired operation as a bounded contract request if it arises later.
- Opening balances are optional; payment methods expand only to the named flows. Cash/bank account choices are selected, but transfer confirmation, source/destination scope and general deposit/withdrawal purpose remain open.

### ERP-V2 source review

Public main was independently verified at 7254e34b49acfbe394da3a889abe6e458084cb38. The primary agent read the complete expense page/modal/report, expense API, BranchContext and BranchFilterHelper. A delegated read-only review inspected treasury setup, transfer creation/management, deposit/withdrawal pages/forms/APIs, branch switching, complete treasury routes and selected branch/auth/schema sections. Exact file/line coverage and exclusions are in docs/discovery/references/ERP-FINANCE-REFERENCE-NOTES.md.

Reference findings relevant to discovery:

- Expense entry has treasury/date/description/amount/method/category; reporting groups by category/branch. The source derives expense branch through treasury, whereas the new ERP's selected business branch must remain independent of shared bank funding.
- The reference transfer is send/PENDING then destination approval, or rejection with a source refund. Do not treat source behavior as the owner's selected lifecycle or as proof of cash physically returning.
- Deposits/withdrawals have a combined history page and separate entry forms. Their unstructured purposes can mix funding, loans or expenses; the new ERP needs clear movement meanings to avoid false profit or duplicate cash entries.
- Reference global treasury scopes, manager/POS-shift gates, broad account selectors and direct edit/delete behavior are not approved ERP requirements. The reviewed code is not proof of server-wide branch authorization or concurrent-spend safety.

This was source inspection only. No application installation, running UI, transaction, test, reference repository mutation or live integration occurred. A truncated combined source output was reread for its omitted section; no missing reference section is concealed as complete reading.

### Next round and work boundary

ERP-Q-100 through ERP-Q-111 are shown as 1-12: inventory presentation/custody, product and parcel adjustments, transfer lifecycle/scope, general money movement purpose, expense categories/backdating, employee-cost branch attribution, reservation shortages and cash differences. No question repeats formal stock-counting or unpaid-expense workflow proposals.

Only English Markdown planning/reference records were changed. No final master plan, implementation phases or ERP/Tawsel code was produced. Existing canonical Tawsel baseline remains 32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada; no new HTTP/schema behavior has been adopted from this business round.

Session 011 document checks passed across eleven Markdown files: 122 decision definitions, 130 requirement definitions and 111 question definitions (363 distinct IDs). No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next batch has 12 questions. The catalog retains 28 stable items and currently selects exactly 1, 5, 7, 8, 9, 10, 12, 14, 15 and 18; REP-20 is explicitly superseded as a formal count workflow, and REP-24/25 remain HR history. Catalog table structure was checked. No master-plan.md or phases directory exists. These are document consistency checks, not application tests, source security/concurrency proof or discovery completion.

## Session 012 — Inventory views, transfer authority and explicit money differences

Date: 2026-10-02. The owner answered the twelve questions displayed after session 011; answers map to ERP-Q-100 through ERP-Q-111.

### English translations of the owner's answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-100 | Yes, that is good. | ERP-D-123 accepts the proposed Products/Parcels fields, filters, search and detail/history. |
| 2 / ERP-Q-101 | Yes, accepted. | ERP-D-123 accepts physical branch stock as default and explicitly separate driver-custody visibility. |
| 3 / ERP-Q-102 | Yes, accepted. | ERP-D-124 accepts actual quantity input, calculated difference, reason and retained history. |
| 4 / ERP-Q-103 | Yes, accepted. | ERP-D-125 accepts shipment-specific actual discrepancy cases routed to the appropriate legitimate workflow. |
| 5 / ERP-Q-104 | No, I also want a screen for confirming receipt. | ERP-D-126 explicitly selects the separate receipt-confirmation screen after sending; the opening No does not reject receipt confirmation. |
| 6 / ERP-Q-105 | No. Whoever has the screen may choose any branch to any branch. Who accepts it has a different page granted to whoever can do that. | ERP-D-127 rejects the proposed assigned-source restriction: transfer creation is company-wide, receipt has its own screen permission. No mandatory different people or receipt branch restriction is inferred. |
| 7 / ERP-Q-106 | It does not matter; the important thing is deposit versus withdrawal. The reason should be optional text. | ERP-D-128 rejects mandatory financial-purpose categories and selects direction plus optional free-text reason. Profit treatment remains open. |
| 8 / ERP-Q-107 | Accepted; make it an addable coded list. | ERP-D-129 accepts maintained configurable expense categories with historical references retained. |
| 9 / ERP-Q-108 | Yes. Expense entry has a date choice, and I may choose an old date. | ERP-D-130 accepts historical actual payment dates, including earlier months, with separate entry timestamp/actor. |
| 10 / ERP-Q-109 | Yes, accepted. | ERP-D-131 accepts fixed salary/manual costs to employee branch and driver commission to originating work branch, with historical attribution retained. |
| 11 / ERP-Q-110 | Yes, accepted. | ERP-D-132 accepts actual shortage visibility and a hold on affected pre-handover work until corrected or replenished. |
| 12 / ERP-Q-111 | Your recommendation is accepted. | ERP-D-133 accepts cash/bank differences pending explanation, visible actual balance, and later linked resolution without automatic penalty or gain/loss. |

### Changes and remaining parts

- Company-wide transfer creation is an explicit narrow exception to normal assigned-branch scope. Expense attribution and access retain the previously selected sole/assigned-branch rules. A separate receipt screen is approved; branch reach of that screen is a remaining narrow question.
- The deposit/withdrawal form must stay simple. Optional reason applies there; it does not remove required reasons from corrections or incident decisions. Account, amount, date, actor and movement identity remain necessary. No mandatory generic purpose catalog is adopted. Profit exclusion is a recommendation awaiting an answer.
- Product quantities, individual parcels and money differences retain distinct correction rules. Acceptance of a parcel business case does not invent an ERP-service endpoint in Tawsel. Reserved-stock holds apply before handover; actual driver execution stays with Tawsel.
- Past-dated expenses change reports for their actual payment period. Entry time/actor remain visible and paid/past payroll calculations are not reopened. Salary/commission branch attribution is settled and must not follow later profile edits retroactively.
- Transfer rejection is not proof that funds returned. Partial remittance allocation is not a price change, a reduced brand entitlement or a written-off shortage. Those remaining choices are explicitly separated in the next batch.

### Review, next round and work boundary

A delegated read-only consistency review checked explicit amendments, stale current status cells and the proposed next questions. Current decision/requirement/question summaries were reconciled; historical session narratives remain dated snapshots. Earlier stale references to unsettled numeric IDs, export formats, HR rules and storage payment methods were corrected where relevant.

The already supplied 07 discovery/change-control reference was reread completely. No new HTTP/schema/example mapping was fixed by this business round. Existing reading limits for 04/05/06 remain unchanged; no new source-code review, live repository synchronization or contract upgrade is claimed. Tawsel baseline remains 32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada. ERP-V2 observations remain the bounded 2026-10-01 review of 7254e34b49acfbe394da3a889abe6e458084cb38.

ERP-Q-112 through ERP-Q-123 are displayed as 1-12. They cover generic cash profit treatment, receipt scope, incomplete transfers, payout-day enforcement, remittance allocation, storage arrears/termination/rate changes, driver-remittance methods, profit sources and the need for offline operations. Recommendations remain unapproved. Shorter-month storage anniversary handling, exact financial corrections and full integration recovery coverage remain documented design work; no final architecture is selected.

Only English Markdown discovery/reference artifacts changed. No application code, final master plan, implementation phases, runtime tests, deployment or financial transaction was produced or run.

Session 012 document checks passed across eleven Markdown files: 133 decision definitions, 142 requirement definitions and 123 question definitions (398 distinct IDs). No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next displayed batch contains twelve questions. The report catalog retains 28 stable items and exactly the selected set 1, 5, 7, 8, 9, 10, 12, 14, 15 and 18; its table column structure was checked. No master-plan.md or phases directory exists. These are document consistency checks only, not application tests or completed discovery.

## Session 013 — Full remittance, mixed methods, profit sources and online ACID requirements

Date: 2026-10-02. The owner answered the twelve displayed questions ERP-Q-112 through ERP-Q-123 and requested an estimate of the remaining discovery questions.

### English translations of the owner's answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-112 | Yes, adopt it. | ERP-D-134: general deposits/withdrawals affect balances/history and stay outside operating profit. |
| 2 / ERP-Q-113 | Your recommendation is accepted; whoever has the screen can accept any transfer. | ERP-D-135: receipt-screen access grants company-wide transfer confirmation. |
| 3 / ERP-Q-114 | Do not handle this case. The amount is definite, counted and sent. | ERP-D-136 excludes short/partial transfer receipt; retain full receipt confirmation and history. The rejected compound proposal does not approve its rejection/refund branch. |
| 4 / ERP-Q-115 | Your recommendation is accepted. | ERP-D-137: off-day brand payout is allowed with a reason and the existing eligibility/funds checks. |
| 5 / ERP-Q-116 | There is no partial handover of brands' money. If the driver takes 10 orders and 8 recipients pay, the driver remits that received amount. If money is missing, the driver must complete it personally and hand over the same amount. | ERP-D-138 explicitly replaces ERP-D-056: complete actual expected recipient money only; no partial allocation. Assigned shipments without recipient payment do not create fictitious received money. |
| 6 / ERP-Q-117 | Do not implement anything for this. As stated, incomplete remittance is not allowed; it is the driver's problem, not a system workflow. | ERP-D-138 excludes partial goods/shipping allocation and driver personal shortage/top-up bookkeeping. No automatic HR penalty or invented full receipt. |
| 7 / ERP-Q-118 | Yes, your recommendation is accepted. | ERP-D-139: show overdue storage and continue until explicit authorized stop; no automatic payout-wallet offset. |
| 8 / ERP-Q-119 | Accepted; that is good. | ERP-D-140: preserve the paid period, stop next renewal, no automatic prorated refund. |
| 9 / ERP-Q-120 | Exactly, next month. | ERP-D-141: next anniversary subscription period, preserving current period/history. |
| 10 / ERP-Q-121 | Some can be InstaPay and some cash, for example. Yes, accepted. | ERP-D-142 expands the proposed Cash/Bank deposit/InstaPay methods to mixed components of one full remittance. Manual receipt, optional reference and no images/provider automation remain the accepted proposal. |
| 11 / ERP-Q-122 | Accepted; good. | ERP-D-143 accepts the exact source formula and 6,200 example, with separate actual cash and no duplicate advances/recovery/cash payout cost. |
| 12 / ERP-Q-123 | They must wait for the connection to return. Do not forget ACID principles in the system. | ERP-D-144 requires online-only ERP; ERP-D-145 adds explicit ACID transaction requirements and real database evidence. |

### Explicit supersession and implementation implications

- The earlier accepted 950 receipt/50 unresolved driver difference is historical and superseded. Do not keep it as an alternative default or restore it under the general adjustments page. Full required remittance is calculated from relevant accepted reported recipient-payment facts, including supported partial-delivery amounts and zero-due cases. Unpaid commercial visit fees are not recipient cash received.
- Mixed receipt components are not partial settlements. Before confirming one complete remittance, validate the total and record its component accounts/methods and dependent eligibility effects consistently. A missing response must not cause a second credit on retry. A changed source revision must not silently preserve an obsolete expected amount; exact integration/correction design remains to verify.
- Partial company-to-brand payout remains approved. Broader company treasury/account discrepancies also remain in their original scope. No payroll deduction is created merely because the driver personally covers missing money outside this ERP flow.
- Full-value treasury sending/receipt confirmation remains. The owner excluded the short-transfer scenario and did not adopt automatic refund on rejection. Preserve legitimate history/correction semantics without adding an excluded exception subsystem.
- Profit sources and generic cash exclusion are now approved; period allocation, integer/rounding rules and source corrections still need precise design. Approved employee liability recovery is counted once, not once at assessment and again at payroll recovery. Ordinary unrecorded unpaid expenses remain absent from the report.
- ACID is required for related local database effects: all-or-nothing commits, business invariants, safe concurrency and durability within the selected database failure model. Future tests must exercise relevant concurrent remittance/payout/stock actions, rollback/retry identity and persistence with a real database; mock success is insufficient. No database or isolation mode has been selected and no runtime guarantee is claimed. ERP/Tawsel coordination still requires outbox/inbox, stable identity, idempotency, replay/reconciliation and visible pending states.

### Remaining discovery estimate and next round

A read-only coverage review against current registers and the full 07 coverage map estimated approximately 25-35 material owner questions remaining, including the next round, likely around three focused rounds. The estimate can shrink or change when an answer reveals a real decision. Contract mapping, detailed failure coverage, design and source verification remain planner work, not a quota of questions for the owner. Historical stable IDs do not represent questions remaining.

The next twelve questions ERP-Q-124 through ERP-Q-135 cover launch country/currency, staff devices, available address input, legitimate pre-handover entry correction, support powers/audit, technical preferences, hosting, budget, ERP staff concurrency and disaster-recovery objectives. Existing login is already settled and is not asked again. No stack or architecture is selected before these constraints and current primary-source research.

The primary agent updated the discovery/decision/question registers; a delegated agent updated only the report catalog and finance/prior-owner reference overlays. The supplied 07 coverage map was reviewed; no new canonical API behavior or schema mapping was selected in this round. ERP-V2 source inspection retains its previous date/limits. Tawsel baseline remains 32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada, with no automatic monitoring or upgrade.

Only English Markdown discovery artifacts changed. No final master plan, implementation phases, application code, deployment, external payment or application test was produced or run.

Session 013 document checks passed across eleven Markdown files: 145 decision definitions, 154 requirement definitions and 135 question definitions (434 distinct IDs). No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next displayed batch contains twelve questions. The catalog retains 28 stable items and exactly the selected set 1, 5, 7, 8, 9, 10, 12, 14, 15 and 18, with valid table columns. Targeted review verified that ERP-D-056/ERP-R-057 are marked superseded, full-remittance rules retain mixed methods without partial allocation, and current source summaries link the amended decisions. No master-plan.md or phases directory exists. These checks concern document consistency only; no application/ACID/integration test was run.

## Session 014 — Mobile operations, support authority and deployable technical options

Date: 2026-10-02. Answers map to ERP-Q-124 through ERP-Q-135. Conversation remains Egyptian Arabic; this is the English record.

### English translations of the owner's answers

| Display / question | Meaning-preserving answer | Resolution |
| --- | --- | --- |
| 1 / ERP-Q-124 | Everything is in Egypt and in Egyptian pounds. | ERP-D-146 confirms launch geography/currency. |
| 2 / ERP-Q-125 | Both. Office staff mostly use computers; people receiving and distributing mostly use phones. Make the application mobile friendly too. | ERP-D-147 requires desktop/mobile staff operations, not view-only mobile. |
| 3 / ERP-Q-126 | Sometimes there is a link; make it optional. | ERP-D-148 adds optional recipient location-link input, without assuming verified coordinates/provider. |
| 4 / ERP-Q-127 | Yes, correct it, but prevent this mistake initially. A user assigned branch B should only see B while entering an order; show several branches only when assigned several. | ERP-D-149 accepts pre-handover wrong-recorded-branch correction with assigned-branch-only intake. Treasury-transfer screen exceptions remain. |
| 5 / ERP-Q-128 | Yes, accepted. | ERP-D-150 accepts reviewed pre-handover piece/quantity/service corrections and the no-silent-repricing constraint. |
| 6 / ERP-Q-129 | Yes, I can access the screens and financial operations. | ERP-D-151 grants support ordinary business/financial operation access under normal rules and audit. |
| 7 / ERP-Q-130 | Your recommendation is accepted. | ERP-D-152 records the specific recommendation: hide support from ordinary employee management but attribute actions as Technical Support in business history, retaining true internal identity. |
| 8 / ERP-Q-131 | I generally prefer PostgreSQL and Node.js, but tell me what is best for this project. UX, performance and UI matter most. | ERP-D-153 records a preference and asks for a researched complete-stack recommendation. No full framework/version selection is inferred. |
| 9 / ERP-Q-132 | I have Hostinger KVM 2 with Dokploy. It will probably be shared with Tawsel for now, but separate hosting is also possible; account for that now so architecture need not change later. | ERP-D-154 requires independently deployable ERP with provisional co-location and a normal relocation path. No spare-capacity or shared-database assumption. |
| 10 / ERP-Q-133 | Do not worry about its cost; just deliver it and I will arrange things. | ERP-D-155 closes the cap question; the initial planning request still calls for expected costs. It is not purchase authorization. |
| 11 / ERP-Q-134 | About ten, or slightly more, for three branches. | ERP-D-156 adds a provisional ERP staff concurrency estimate, distinct from driver count. |
| 12 / ERP-Q-135 | I do not know; it is not important because we will have backups. | ERP-D-157 records backup expectations but no precise recovery/loss target. Propose concrete limits and restore verification without repeating the same target question or inventing zero loss. |

### Meaning and limits

- Ordinary intake selection is prevented from escaping assigned branches both in the UI and server authorization. This is distinct from the specifically granted company-wide treasury transfer screens. Correcting a mistaken recorded branch is not an actual goods transfer.
- Pre-handover business corrections are approved but do not establish a new canonical update operation or bypass accepted-snapshot/revision locks. Review exact branch/identity/content/location contract constraints before fixing the mapping. Optional map links do not automatically supply validated coordinates or select a paid geocoding service.
- Developer support may operate business screens, with their state/transaction constraints and an attributable history. This resolves earlier hidden-account ambiguity: hide the account from ordinary staff management, not its financial effects.
- The owner wants an ERP that can move hosts. Keep ERP storage, configuration, secrets and service boundary independent of Tawsel; host relocation will still require configuration/data migration, not zero operational work. Existing server resources and installed versions have not been inspected.
- Backups are a requirement, not evidence of successful restoration. The technical note proposes independent encrypted backups, physical/WAL recovery, monitored archival freshness and a restore rehearsal. These specific defaults are recommendations for review, not accepted numeric guarantees or tests already run.

### Current primary-source research

A delegated research pass created docs/discovery/references/ERP-TECHNICAL-OPTIONS.md. It compares React/Vite and Next.js, NestJS/Fastify and direct Fastify, records supported runtime/component compatibility, and proposes a modular Node.js/PostgreSQL ERP with an independent worker and portable containers. It also distinguishes PostgreSQL transactions from cross-system outbox/inbox recovery and Dokploy application database backups from its own control-plane backup.

Official sources checked include Node release documentation, Nest migration/Fastify guides, Vite and Next.js guides, Smooth UI selected compatibility sections, shadcn Vite setup, PostgreSQL version/transaction/backup guides, Dokploy backup/restore documentation, Hostinger pricing/specifications and Cloudflare R2 pricing. Exact links and reading limits are in the technical note; no full Smooth UI or pgBackRest guide review is claimed. No owner server/account inspection, package installation, benchmark, deployment, backup or restore was performed.

Indicative USD cost observations are source-dated 2026-10-02: an additional KVM 2 is advertised at 8.99/month equivalent, with 14.99/month two-year renewal and upfront billing; initial promotional term and the owner's actual bill are unverified. No second VPS charge is needed for co-location if measured available capacity suffices. R2 Standard storage examples are 1.35/month at 100 GB-month and 7.35/month at 500 GB-month after its 10 GB-month free allowance, excluding chargeable operations/taxes/other services. Domain and any optional maps/messaging services are not yet selected or fully costed. No currency conversion or purchase occurred.

### Remaining discovery and next round

A separate read-only coverage review identified the still-open multi-branch brand relationship and wallet-access question. Current branch and transfer permissions do not settle this by implication. The estimated remainder is approximately 13-23 material owner choices including the next twelve, with engineering/contract review handled by the planner rather than converted into a questionnaire.

ERP-Q-136 through ERP-Q-147 cover the proposed stack, multi-branch brand wallet and access, invoice scope, order/shipment identity, payroll/report periods, ERP behavior during Tawsel unavailability, permissible late financial corrections, reason-catalog ownership/Other validation, commission effective dates, history retention and first-client pilot service mix. Recommendations remain unapproved. No new final plan, execution phases or implementation has been created.

Session 014 document checks passed across twelve Markdown files: 157 decision definitions, 166 requirement definitions and 147 question definitions (470 distinct IDs). No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next displayed batch contains twelve questions. The report catalog retains 28 stable items and selected items 1, 5, 7, 8, 9, 10, 12, 14, 15 and 18, with valid columns. The latest prior-owner overlay points to section W/session 014; technical recommendations remain explicitly unapproved. No master-plan.md or phases directory exists. These are document checks, not application, performance, backup, ACID or integration tests.

## Session 015 — Approved stack, shared brand wallet and Tawsel correction clarification

Recorded: 2026-10-02. The owner answered the twelve questions ERP-Q-136 through ERP-Q-147. Answer 8 requested an explanation and source reread; it is not an approval or rejection of the proposed ERP financial policy.

### English translations of the owner's answers

| Previous display / question | Faithful English translation | Recorded meaning |
| --- | --- | --- |
| 1 / ERP-Q-136 | Yes, that is good. Also include Vitest for the important operations in every phase. | ERP-D-158 approves the exact proposed stack direction; ERP-D-159 adds explicit per-phase Vitest. Exact versions, data access and final plan remain undecided. |
| 2 / ERP-Q-137 | Exactly. Some orders may go out from the closer branch. Each branch also collects and sends money to the main branch, and money is paid from there; however, I can go to any branch and receive my payout. | ERP-D-160 accepts the shared brand/wallet and any-branch payout, with normal main-branch consolidation. Physical parcel transfer is not inferred; ERP-Q-148 clarifies the closer-branch wording. |
| 3 / ERP-Q-138 | Yes, that is good. | ERP-D-161 accepts the proposed permitted-brand shared-wallet visibility and access to the eligible total, with normal funding-account authority. |
| 4 / ERP-Q-139 | Not initially. | ERP-D-162 defers service invoices, tax/e-invoice integration. Selected reports and statements remain. |
| 5 / ERP-Q-140 | Your recommendation is good. We will not split one order across two drivers. | ERP-D-163 accepts one order as one shipment/reference/recipient/address containing its pieces. Partial delivery and legitimate later retries remain. |
| 6 / ERP-Q-141 | Your recommendation is fine. | ERP-D-164 accepts calendar-month payroll and Africa/Cairo calendar-day reporting; rounds may cross midnight and storage anniversary periods remain. |
| 7 / ERP-Q-142 | That is very suitable. | ERP-D-165 accepts continued ERP intake/preparation during Tawsel outage, visible pending/retry and handover waiting for required acceptance. |
| 8 / ERP-Q-143 | What does that mean? I do not understand. Tawsel does not correct money; it routes and sends what ERP should receive. Can Tawsel do that at all? Read the files we started with again. | Clarification request only. Review the current correction contracts, distinguish reported facts from ERP settlement, and retain ERP-Q-143 as open. |
| 9 / ERP-Q-144 | I think the reasons should be fixed in ERP, so the same product can be sold to another shipping company. | ERP-D-166 replaces proposed company-editable catalog management with a fixed product-level list. Previous Tawsel driver entry remains; exact entries, partial refusal and required Other text remain ERP-Q-149. |
| 10 / ERP-Q-145 | Yes, from the date of the change. | ERP-D-167 applies commission rates prospectively by effective work date. Earlier work and protected payroll history retain their rates. |
| 11 / ERP-Q-146 | Yes, that is fine. | ERP-D-168 accepts retained business/audit history and deactivation of referenced master records, without automatic V1 purge. |
| 12 / ERP-Q-147 | I do not know. Do not impose limits; include everything we agreed on. I do not want you to keep focusing on this part. | ERP-D-169 closes first-client service-mix questioning and preserves all agreed V1 scope. This is not authorization to skip plan approval or start implementation. |

### Explicit amendments and boundaries

- The earlier Node.js/PostgreSQL preference is now an approved React/TypeScript/Vite, shadcn/ui with selected Smooth UI, Node.js/NestJS/Fastify and PostgreSQL direction, with a modular backend and worker. Specific backup defaults in the technical note remain proposals for plan review.
- Brand identity and payout balance are shared across company branches; stock and transaction attribution remain branch-specific. Normal main-branch money consolidation does not add an automatic sweep, an HQ-only payout gate or a physical parcel transfer workflow.
- Refusal reasons use a fixed product-level list. The previous driver-origin capture requirement remains; the proposed company-editable catalog is not adopted. TAWSEL-CHANGE-REQUESTS.md now avoids an unnecessary dynamic-catalog API requirement while retaining required reason fields/event/correction compatibility.
- Prospective commission-rate changes and calendar payroll/reporting periods are settled. Service invoices/tax integration are deferred. All agreed V1 services and journeys remain in scope, without further first-customer service selection.
- The earlier question about financial corrections was insufficiently precise. Tawsel corrects bounded driver-reported execution/payment facts; it does not alter ERP actual remittance, brand payout, treasury, payroll or refund records. The owner's challenge does not approve a post-settlement ERP adjustment policy.

### Rereading and canonical evidence

The primary agent reread 01-TAWSEL-CURRENT-BASELINE.md, 02-BUSINESS-BOUNDARY-AND-MAPPING.md and 03-CONNECTOR-AND-RECOVERY.md completely. The opening coverage map of 07 was revisited; full 07 had been read earlier. Parallel reviewers inspected focused authority/recovery sections in 04, the complete corrections schema and dependent outcome definitions in 05, and accepted/rejected correction examples in 06. Exact sections and line references are recorded in docs/discovery/references/ERP-TAWSEL-CORRECTION-REVIEW.md. Unrelated bodies of the large canonical files were not reread in full.

Verified facts include the existing human-only `outcome.correct` operation with `correction.own`, the emitted `outcome.corrected` event, immutable source prices, retained original reports, and closed-workday/physical-dependency constraints. ERP service credentials cannot submit this driver operation. A reference fixture changes two delivered pieces at EGP100 plus shipping EGP50, reported EGP250, to one piece plus shipping, reported EGP150. Another fixture denies correction because of `dependent-receipt`. These are corrected reported facts and availability examples, not refund instructions or proof of a correction after ERP payout.

At-least-once delivery, replay and delayed application can expose a previously accepted correction later. Durable receiver receipt and atomic projection application remain distinct. ERP-Q-143 asks how to resolve a resulting difference against already posted ERP money; it does not weaken full exact driver remittance or claim Tawsel permits a new correction after its workday closes.

Canonical baseline remains `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`, extracted `2026-09-25T08:22:32.982Z`. No newer runtime version, endpoint, schema or implementation behavior is inferred. No live API call, application test, deployment, purchase or repository synchronization was performed.

### Next round and work boundary

The next displayed batch contains five questions: the clarified ERP-Q-143 plus ERP-Q-148 through ERP-Q-151 for closer-branch physical custody, the fixed refusal list/Other/partial coverage, storage-revenue branch attribution and missing area/governorate pricing. The proposed missing-price rule uses the governorate base when no area override exists; it does not require an override for every optional area. These are proposals until answered.

The earlier remaining-question estimate is historical rather than a quota. Further engineering and selected-contract coverage remain planner work. Ask additional owner questions only when a material choice or concrete conflict requires one. No final plan, implementation phases or code were created.

Session 015 document checks passed across thirteen Markdown files. The authoritative registers contain 169 decision definitions, 178 requirement definitions and 151 question definitions, totaling 498 distinct IDs, with no duplicates or undefined ERP-ID references. Historical session-status references are not counted as additional definitions. ERP-Q-143 has one current definition and remains open. All files contain English text without Arabic script. The next batch contains five questions; missing-price confirmation asks only the unresolved error behavior, without reopening the agreed governorate/optional-area rule. The report catalog retains 28 correctly shaped rows and the same selected reports: 1, 5, 7, 8, 9, 10, 12, 14, 15 and 18. The prior-owner pointer now names section X/session 015. No master-plan.md or phases directory exists. These are document consistency checks, not runtime, financial, ACID or integration tests.

## Session 016 — Physical inter-branch transport and queue proposal

Recorded: 2026-10-03, Africa/Cairo. The owner acknowledges that Tawsel's bounded driver-report correction matches their earlier Tawsel decision. This resolves the misunderstanding about the current contract while preserving the separation from actual ERP financial records.

### English translations of the owner's answers

| Previous display / question | Faithful English translation | Recorded meaning |
| --- | --- | --- |
| Opening clarification | Yes, I remember saying that in Tawsel. I misunderstood your explanation; keep the existing behavior. | Reaffirms the current bounded driver-report correction and ERP money ownership; no Tawsel amendment or ERP adjustment policy follows. |
| 1 / ERP-Q-143 | I am not sure. Could it go into a queue and be retried so we avoid these problems? What do you think? | A proposal and request for advice. Technical retry is already required, but a real accepted difference after money is posted still needs an ERP policy. The proposed scoped eligibility hold/review queue is not yet approved. |
| 2 / ERP-Q-148 | Yes, it moves from one branch's inventory to another. This is an important new part I have only just learned about. Add a screen named Transfer Shipment to Another Branch, select a whole shipment or pieces from stock, assign an available driver, and have someone at the other branch receive and confirm. Ask about this until everything is clear. | ERP-D-170 / ERP-R-179 explicitly supersede the previous physical-transfer exclusion. Whole shipment versus stock quantities, assigned transport and destination actual receipt are included; exact execution and exception rules remain open. |
| 3 / ERP-Q-149 | Add the case where the shipment is missing pieces, and where the recipient does not answer after the driver arrives. | ERP-D-171 / ERP-R-180 amend the proposed fixed business list. Preserve no-answer as a distinct existing outcome and missing-piece reason as a report rather than automatic confirmed loss. |
| 4 / ERP-Q-150 | Your recommendation is fine. | ERP-D-172 / ERP-R-181 adopt one selected storage-agreement branch for revenue attribution, independently of payment location, without a duplicate subscription. |
| 5 / ERP-Q-151 | That is good, but this is essential and must not be forgotten. If it is not configured, the whole operation must not complete. | ERP-D-173 / ERP-R-182 require valid applicable pricing before the entire commercial commit. Preserved input has no successful order, stock/custody, financial or external-submission effects. |

### Explicit supersession and unresolved details

- ERP-D-042 / ERP-R-043 are historical exclusions, explicitly replaced by ERP-D-170 / ERP-R-179. Update current coverage rather than pretending physical movement is just branch-field correction. New movement does not split a commercial shipment, change brand ownership or create separate branch payout wallets.
- Existing treasury transfer authority and full exact money receipt remain scoped to money. They do not settle the new inventory-transfer sender/receiver permissions or partial goods receipt.
- The proposed fixed reason list now includes changed mind/no longer needed, amount differs from agreement, product differs from order, product/package condition problem, agreed inspection could not be provided, missing pieces, Other, and the separately represented no-answer-after-arrival case. These are business descriptions, not approved wire codes. Required Other detail and rejected-portion applicability remain open; the missing-piece label alone must not trigger loss/compensation.
- Valid governorate/optional-area pricing remains prerequisite data. Preserve entered input on failure without representing an actual ready-parcel receipt or a successful stock order. An absent optional area override alone is not missing configuration.
- Storage revenue branch attribution is closed. Exact historical attribution/effective changes and service-period allocation remain engineering design. No fee duplication is introduced by stock spanning branches.

### Queue recommendation and limits

The durable outbox/inbox and recovery design already provides same-identity retry, sequence-gap buffering and separate event receipt/application. Full 03 was reread for this question. Its lines 23-37 and 75-108 distinguish identities, acknowledgements, application checkpoints and replay; line 87 explicitly excludes global ordering across all domain streams.

Proposed ERP policy, still ERP-Q-143: retry interrupted transport/application automatically without repeating a financial effect; hold only affected payout eligibility while a known synchronization gap is unresolved; place a genuine conflict with already posted money in the existing Settlements review queue and preserve the original movement until an authorized linked resolution. A local empty queue does not prove that no unseen correction exists. Retrying an event cannot undo a payout, guarantee finality or replace legitimate financial correction. No automatic refund, payroll rewrite or partial driver-remittance flow is approved.

### Focused Tawsel boundary review and actual coverage

The transfer reviewer reread 01, 02, 03 and 07 completely and inspected the relevant authority/event indexes, preparation/assignment, source snapshot, return receipt, branch interruption/arrival/resume and redispatch definitions and examples in 04-06. Exact sections, accepted/rejected examples and limits are recorded in docs/discovery/references/ERP-INTERBRANCH-TRANSFER-REVIEW.md. Unrelated bodies of the large canonical references were not read in full.

Current `receivingBranchId` belongs to source-branch returns; a wrong source branch receives `409` and does not consume held goods. The positive receipt examples use the same source and receiving branch. The interruption schema rejects an injected arbitrary branch, and before-departure reassignment is not live custody transfer. Existing recipient snapshots/outcomes do not define a transport manifest for unallocated warehouse stock. Do not disguise the target branch as a recipient or invent a transfer endpoint/event.

If transport execution appears in Tawsel, an explicit extension is needed. TAWSEL-CR-002 records this conditional dependency in the single consolidated change-request file; ERP-Q-152 asks the execution-surface choice. Even ERP-only physical movement needs compatibility review for customer shipments already accepted by Tawsel, including later cross-branch dispatch, source identity/revisions and return location. This is new requested capability, not an audit of Tawsel completion.

The reason reviewer also read 03 fully and the focused no-answer input/record definitions in 05 and accepted/rejected no-answer fixtures in 06. Existing `outcome.recordNoAnswer` is a human operation (04, line 3106 onward). The closed NoAnswer input (05, lines 9751-9805) and record constraints (10146 onward) do not carry refused-payment facts; accepted examples are at 06, lines 11587-11634 and 11722-11813. Rejections at 3492-3579 reject `shippingPayment` and embedded `arrivalAt`; following rejection coverage rejects fabricated reported collection. The after-arrival display needs separately accepted arrival evidence. No-answer alone does not prove arrival, and its canonical zero/null money fields do not suppress a separately justified ERP visit fee.

The adopted baseline remains `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`, extracted `2026-09-25T08:22:32.982Z`. No live API, private database, implementation source change, runtime/schema/database test, deployment or automatic synchronization was performed.

### Next round and work boundary

The next batch is ERP-Q-143 plus ERP-Q-152 through ERP-Q-158: queue/financial review, transfer execution surface, grouping, eligible/reserved stock, branch authority, transfer charges/driver entitlement, actual shortage/damage receipt and cancellation. Recommendations in those questions remain proposals. Depending on answers, follow-up will cover driver availability/current-round interaction, cross-branch customer dispatch identity, pricing units and the remaining reason details. Do not invent an arbitrary question quota or reopen the first client's service mix.

All records remain English; the user-facing conversation remains Egyptian Arabic. No master plan, final integration plan, execution phases or application code has been created in this round.

Session 016 document checks passed across fourteen Markdown files: 173 decision definitions, 182 requirement definitions and 158 question definitions in the authoritative registers, totaling 513 distinct IDs. No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next displayed batch contains eight questions. The report catalog retains 28 valid rows and selected reports 1, 5, 7, 8, 9, 10, 12, 14, 15 and 18. The prior-owner overlay points to section Y/session 016. No master-plan.md or phases directory exists. These checks validate the discovery documents only; they do not establish implemented inventory, finance, concurrency or connector behavior.

## Session 017 — ERP-managed transfers, multi-branch users and shipment timeline

Recorded: 2026-10-03, Africa/Cairo. The owner answered the eight-question batch and supplied a shipment-timeline screenshot as a visual reference. These choices refine discovery; they do not authorize implementation or phase production.

### English translations of the owner's answers

| Previous display / question | Faithful English translation | Recorded meaning |
| --- | --- | --- |
| 1 / ERP-Q-143 | Yes, that is fine. | ERP-D-174 / ERP-R-183 accept safe automatic retry, a hold on affected eligibility during a known synchronization gap and review of differences after posted money. No automatic refund or paid-history rewrite. |
| 2 / ERP-Q-152 | It is enough for branch staff to assign the driver and record handing the goods to them, and for the other branch to confirm receipt in ERP. | ERP-D-175 / ERP-R-184 select ERP-only transport handling. The earlier Tawsel transport-task extension is not selected. |
| 3 / ERP-Q-153 | Exactly. At confirmation, inventory quantities and locations must update. If anything happens to a shipment, I want to search for it and know what happened, where it is now and its state. I will send an image showing the idea and design I want. | ERP-D-176 / ERP-R-185 accept grouping and custody-based updates; ERP-D-177 / ERP-R-186 add searchable current whereabouts/state and timeline with the supplied visual direction. Source handover and destination receipt remain distinct confirmations. |
| 4 / ERP-Q-154 | Very suitable. | ERP-D-178 / ERP-R-187 adopt physically held usable goods, unreserved loose stock, prepared whole shipments and protective transfer reservations. |
| 5 / ERP-Q-155 | Yes, use your recommendation. But how will we handle users or managers assigned to several branches? | ERP-D-179 / ERP-R-188 adopt assigned-source and assigned-destination scope. The remaining sentence requests an explanation of multi-branch behavior already governed by the accepted capability model, not a new company-wide grant. |
| 6 / ERP-Q-156 | It is included in the driver's salary. | ERP-D-180 / ERP-R-189 settle driver compensation without extra transfer commission. The separate brand-charge question remains unanswered. |
| 7 / ERP-Q-157 | Suitable. | ERP-D-181 / ERP-R-190 accept actual quantities/condition receipt, usable versus damaged stock and unresolved shortage pending legitimate resolution. |
| 8 / ERP-Q-158 | Yes, that is good. | ERP-D-182 / ERP-R-191 adopt cancellation/release before handover and actual destination/source-return receipt after handover. |

### Multi-branch interpretation and custody updates

Existing ERP-D-015/032 plus the newly approved ERP-D-179 mean that a user assigned A and B can select either as source and receive transfers addressed to either. The destination selector may contain other company branches. Receipt filtering can show A, B or all assigned branches, always with a clear destination label. Each operation still requires its screen permission and server-side company/branch checks. A manager title adds no authority by itself. The same person can perform both permitted actions when assigned both branches; no distinct-person restriction was selected. This explanation does not grant unrestricted company-wide shipment search.

Manifest confirmation/reservation is distinct from actual driver handover and destination receipt. Reserved source goods cannot be assigned twice; actual handover moves custody to the driver/in-transit state; only actual destination receipt makes received goods part of that branch's stock, subject to condition. Updates must be atomic within the corresponding ERP operation and retain movement history. A partial receipt can leave quantities at different explicit custody/condition states; do not claim the entire manifest has arrived merely because some contents did.

### Image evidence and design boundary

The primary agent viewed the supplied PNG. It shows a phone shipment detail page with a back/header area, a vertical Delivery Timeline, black headings, quiet gray details, lime highlighting on the active step and a Shipment Information section below. The owner explicitly selected this idea/design for shipment tracking.

The image was copied without modification from `C:/Users/7OSS/AppData/Local/Temp/codex-clipboard-7f932b26-2b1e-4fee-baee-066c7bf342c0.png` into `docs/discovery/references/assets/shipment-timeline-owner-reference.png`. The copied bytes have SHA-256 `6C987A6A1120227BC3BBFD58179FC0997B8F6BB38F150A5086777BE7418D0748`. A reference copy preserves this evidence beyond the temporary attachment path. No generated or edited image was produced.

ERP-UI-REFERENCE-NOTES.md records the selected design, Arabic RTL/mobile/desktop adaptation and evidence limits. Screenshot examples such as 60 percent progress, estimated dates, weight, dimensions, package type, USD fees, prefixed tracking ID and settings icon do not become approved requirements. The shipment page will use actual state/custody/history and agreed data. Stock transfers retain brand/product/variant quantities; the picture does not require serializing every individual stock piece.

### Tawsel compatibility refinement

TAWSEL-CR-002 is now an explicitly historical, unselected proposal: the owner does not require a Tawsel transfer task, driver screen or transport routing extension. TAWSEL-CHECK-003 preserves the narrower unresolved compatibility question for customer shipments already published to Tawsel that are physically relocated, especially previously attempted/returned shipments and later dispatch/return branch. Do not assume either a supported source-branch edit or the need for a new API before completing exact mapping.

The delegated reviewer used the existing source snapshot/revision, predeparture withdrawal/reassignment and original-source return/redispatch evidence. A focused additional read inspected `integration.getExecutionProjection` and driver provisioning definitions: the projection is received-evidence monitoring, not a booking/availability lock, and its freshness limits do not establish real-time device status. A generic HR employee record alone is not a Tawsel driver identity. Exact source locations and actual coverage are retained in ERP-INTERBRANCH-TRANSFER-REVIEW.md and TAWSEL-CHANGE-REQUESTS.md. No runtime or fresh full-pack reading claim follows.

### Next round and work boundary

The next seven questions retain ERP-Q-156 for brand charging only, then ERP-Q-159 through ERP-Q-164 for carrier selection, concurrent delivery work, previously attempted/returned whole shipments, shipment-search visibility, sealed-parcel inspection and planned multiple trips. Recommendations remain proposals until answered. Do not reask assigned-branch permissions, grouped contents, core reservations, salary-covered driver remuneration, actual subset receipt, cancellation or the accepted queue policy.

The report catalog remains unchanged in selection; shipment tracing is operational detail rather than a newly added report. English files now carry the new decisions/requirements and section Z of the prior-owner overlay. No final plan, phases, application code, live API call, database test, UI rendering test or deployment was produced.

Session 017 document checks passed across fourteen Markdown files and the preserved reference image. The authoritative registers contain 182 decision definitions, 191 requirement definitions and 164 question definitions, totaling 537 distinct IDs. No duplicate definitions, undefined ERP-ID references or Arabic-script text were found. The next batch has seven questions. The report catalog retains 28 correctly shaped rows and selected reports 1, 5, 7, 8, 9, 10, 12, 14, 15 and 18. The prior-owner pointer names section Z/session 017. The screenshot exists at its durable reference path and its copy hash was verified. No master-plan.md or phases directory exists. These are document/asset checks rather than implementation or runtime evidence.

## Session 018 — Company-wide tracking and completed transfer business choices

Recorded: 2026-10-03, Africa/Cairo. The owner answered all seven displayed questions. The stated product purpose is accurate, practical company-wide operational traceability that makes tampering harder without hiding a shipment's journey from an authorized enquiry user.

### English translations of the owner's answers

| Previous display / question | Faithful English translation | Recorded meaning |
| --- | --- | --- |
| 1 / ERP-Q-156 | No, this is internal company work. Why would the brand be involved in that cost? | ERP-D-183 / ERP-R-192: no brand charge for inter-branch movement. Salary-covered driver work is already settled. |
| 2 / ERP-Q-159 | Your recommendation is fine. | ERP-D-184 / ERP-R-193: eligible company drivers across branches, with source-branch preference when otherwise comparable. |
| 3 / ERP-Q-160 | A driver may take a transfer while working on a customer-delivery round. Prioritize drivers at the branch and not in a round, and show the status of those currently in a round so it is known when selecting them. | ERP-D-185 / ERP-R-194: concurrent delivery/transfer is allowed; known at-branch/no-round status has ranking priority, with explicit status for working drivers. Preserve freshness and unknown states rather than inferring physical presence from affiliation. |
| 4 / ERP-Q-161 | Yes, your recommendation is correct, and connecting that correctly with Tawsel is important. | ERP-D-186 / ERP-R-195: after actual eligible receipt, a returned shipment may relocate and be dispatched to the recipient from the destination while retaining reference, price and history. Exact contract semantics remain a separate verification task. |
| 5 / ERP-Q-162 | They must see the complete journey and all company shipments. Someone can ask branch A about a shipment; staff should find that it was there on a given date and is now at another branch. The system should prevent tampering as far as possible, remain accurate and also be realistic. | ERP-D-187 / ERP-R-196 explicitly replace the proposed assigned-branch tracking limit with company-wide operational read access through the tracking screen. Existing mutation/financial scope is unchanged. |
| 6 / ERP-Q-163 | Your recommendation is correct. | ERP-D-188 / ERP-R-197: identity/exterior checking for sealed parcels, quantity counting for loose stock, suspected internal issues through incident review. |
| 7 / ERP-Q-164 | Every trip should have its own separate transfer. | ERP-D-189 / ERP-R-198: one manifest per planned physical trip; unplanned shortages remain discrepancies. |

### Scope, authority and inventory implications

Company-wide tracking is an explicit screen-specific operational-read exception, alongside separately scoped sending/receiving. A staff member can trace a shipment through other company branches without gaining permission to mutate those branches, inspect all treasury/HR records, export unrelated reports or access another company. Complete journey means retained actual events/custody and corrections, with current location/custodian and state explained from those records. No new public/brand portal or hidden record rewrite is inferred.

Availability ranking and carrier selection preserve both answers: known at-branch/no-active-round drivers are prioritized, with source-branch preference among otherwise comparable candidates. A driver in an active Tawsel round remains selectable and visibly marked. Last received evidence, its timestamp and unknown state must remain honest; branch membership alone is not proof of being physically at the branch, and no atomic cross-system driver booking has been approved or proven.

Internal movement changes physical custody and branch inventory through the already approved reservation/handover/receipt rules. It creates no brand shipping charge or additional transport commission. Each physical trip has its own manifest. Sealed-parcel receipt checks identity/exterior rather than certifying unseen contents; loose stock is counted and condition remains explicit.

### Targeted cross-branch contract verification

The review distinguishes ordinary return receipt at the original source branch from selecting a source branch for a later new delivery cycle. `dispatch.createFromReceipt` accepts a complete new SourceSnapshot, and the reviewed schema has no explicit equality rule requiring the new sourceBranchExternalId to equal the old branch. The captured same-branch example establishes neither changed-branch acceptance nor prohibition. The arbitrary-branch rejection fixture targets branch.interruptRound; it is not a rejection example for cross-branch redispatch.

TAWSEL-CHECK-003 now requests precise existing-operation semantics: changing sourceBranchExternalId before departure, required withdrawal/preparation handling, consuming A's actual received balance after an ERP-confirmed transfer to B, the next return branch, rejection codes/side effects and durable recovery. Acceptance/rejection examples are needed before final mapping. Add a specific change request only if verified behavior cannot support the approved business workflow. Do not create a new shipment identity or alter a frozen earlier cycle to bypass the issue.

Focused review coverage is recorded in ERP-INTERBRANCH-TRANSFER-REVIEW.md and TAWSEL-CHANGE-REQUESTS.md: relevant 02 identity/lifecycle/return sections; 03 command recovery and receiver semantics; complete 04 intake operations (lines 1714-1935) and relevant return/branch/redispatch operations (4254-4718); complete 05 b2b-intake.schema.json (160-1181) plus branch/return/error definitions; 06 P10 commands (9380-9620), all six P10 input rejections (1863-2118), error cases (9714-9758), all four P22 rejections (5099-5290) and captured commands/cycle history (14934-15242). These are source reads, not runtime tests. Canonical baseline remains unchanged at `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`.

### Remaining business coverage and next round

A separate coverage review used the current records, HR/report references, initial-notes readback, all of 07 and relevant 02 passages. Most remaining work is detailed engineering and selected-contract coverage, not another large owner questionnaire. The next five questions address shipping-revenue branch attribution after a transfer, first/last salary month, storage anniversaries in shorter months, remaining partial-refusal/Other validation, and a concrete repeated-visit packing-uplift amount. The last example closes a recorded charging ambiguity; it does not introduce repacking counters or reopen whether actual visits earn a fee.

ERP-Q-165 through ERP-Q-168 are new questions; ERP-Q-149 retains its existing identity. Their recommendations remain unapproved. Full V1 scope, stack, backup expectation, core transfer workflow, company-wide tracking and the accepted correction queue policy are not reopened. Final integration design still requires complete selected-operation/event success/failure/recovery coverage and the targeted missing branch semantics.

The report selection and image asset remain unchanged. The English prior-owner reference now has section AA/session018; current decision, requirement and question summaries are reconciled. No final master plan, phases, application code, source implementation audit, live API/database access, runtime test or deployment was produced.

Session 018 document checks passed across fourteen Markdown files: 189 decision definitions, 198 requirement definitions and 168 question definitions in their authoritative registers, totaling 555 distinct IDs. There were no duplicate definitions, undefined ERP-ID references or Arabic-script text. The next batch contains five questions, including the retained ERP-Q-149. The report catalog keeps 28 valid rows and unchanged selections. No master-plan.md or phases directory exists. This is document validation only; no application or integration test result is claimed.

## Session 019 - Final displayed commercial choices and contract coverage audit

Recorded: 2026-10-03, Africa/Cairo. The owner answered all five displayed questions. No further blocking business questionnaire is identified by the current discovery review. This closes the displayed questions, not the final integration design or the owner's future master-plan review.

### English translations of the owner's answers

| Previous display / question | Faithful English translation | Recorded meaning |
| --- | --- | --- |
| 1 / ERP-Q-165 | Suitable. | ERP-D-190 / ERP-R-199 adopt the customer-dispatch/work branch for the complete visit service revenue, including packing uplift. Retain each visit's historical branch and original intake/packing history. |
| 2 / ERP-Q-166 | No, we do not need to handle that. The responsible person calculates the salary themselves, records a deduction and pays the remainder. We do not want complexity here. | ERP-D-191 / ERP-R-200 explicitly amend the recommendation: keep configured salary and use the existing ordinary manual deduction and net-payout workflow. No special first/last-month salary override or automatic proration. |
| 3 / ERP-Q-167 | Yes, that is fine. | ERP-D-192 / ERP-R-201 adopt a temporary month-end clamp while preserving the original anniversary, for example January31, February's last day, March31. Fixed amount and existing renewal/payment rules remain. |
| 4 / ERP-Q-149 | Your recommendation is fine. | ERP-D-193 / ERP-R-202 adopt both partial-refusal reason coverage and mandatory written explanation for Other. Exact Tawsel fields/versioning remain TAWSEL-CR-001. |
| 5 / ERP-Q-168 | For each visit. | ERP-D-194 / ERP-R-203 settle base50 plus packing5 as55 per actual eligible visit. Percentage commission remains based on50. This does not invent recipient money or override immutable source amounts. |

### Current policy and explicit amendment

Salary setup remains the ordinary configured salary. Staff who need to reduce a first or last month's entitlement calculate the amount outside an automatic calculator, record a normal deduction and pay the period's net once. The display retains salary, commission, additions/deductions and resulting net separately. Existing advances, zero-net/residual carry, current-unpaid/future edits and past/paid-period protection remain. The rejected special month-salary field must not reappear as a supposed accepted recommendation.

The complete visit tariff belongs to that visit's historical dispatch/work branch. Internal company movement creates no brand fee, customer visit or extra driver commission. Company packing remains a fixed service uplift independent of repacking; it now explicitly recurs with every actual eligible customer visit. Actual recipient collection, brand liability, driver remittance and brand payout remain different facts. TAWSEL-CHECK-002 still requires verification of the supported outstanding shipping/payment semantics across attempts/cycles.

The fixed failure-reason list now covers rejected quantities in partial delivery, with Other text required. A missing-piece report is not confirmed loss, and no-answer after arrival remains the canonical no-answer outcome plus accepted arrival evidence. No reason field was added to the current closed contracts. Storage retains the original calendar anchor with no permanent drift, automatic discount or prorated refund.

### Reference preservation and actual coverage

The complete supplied manifest was read. Attachments 01-07 matched their declared byte lengths and SHA-256 hashes before copying; unchanged copies and the complete manifest were verified afterward. They are retained under docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/. TAWSEL-BASELINE.md and INTEGRATION-CHANGELOG.md record the pin and manual change-control process. Source commit and extraction time remain unchanged. This is local preservation of the same reference, not a Tawsel upgrade or final integration approval.

The retained source files preserve original bytes, including original non-English fixture content. All newly authored discovery/planning notes remain English. The manifest's source-file entries and declared package counts remain provenance; they are not an independent source-code audit or runtime test. Source client version0.1.0 does not prove the installed runtime version. No automatic repository monitoring or synchronization is configured.

The delegated integration audit read 01/02/03/07 fully, 04's authority/event index and relevant complete provisioning, signed-delivery/replay/detail, reconciliation/applied-report, receiver/status and security sections. It read the entire consumer and outbox schemas in05, the examples README and signature vector in06, six complete P25/P26 rejection fixtures and two complete receipt/report positive fixtures. Nested dependencies and many other bodies still need review; adjacent prefixes in tool output do not count as completed reads. Exact locations, operation/event inventories and outstanding dependencies are recorded in docs/discovery/references/ERP-INTEGRATION-COVERAGE-AUDIT.md.

No blanket full-pack claim follows from these reads. The signature vector and fixtures were read, not executed. No live API, source implementation, database, runtime, rendering or conformance test was run. The remaining supplied definitions/examples are planner work, not an attachment request. TAWSEL-CHECK-003 retains the specific changed-source-branch/redispatch semantics request, and TAWSEL-CR-001 retains the known reason extension; the unselected Tawsel transport-task candidate remains closed.

### Next work boundary

The next work is selected-contract coverage, exact data/state/transaction mapping and concrete architecture/UX/operations proposals. No new numbered business batch is issued here. Ask the owner only for a newly discovered material business conflict, and request precise missing contract semantics rather than re-uploading available references or auditing whether Tawsel is complete.

A further focused session 019 read narrows TAWSEL-CHECK-002: a new receipt-funded cycle already accepts its own complete outstanding-price snapshot and preserves the old one (captured5000 to0); a same-cycle whole retry preserves cycle/source revision without replacement-price input; correction availability excludes the replaced attempt from prior collections. Complete applicable money/source/retry/outcome/calculation/correction/delivery definitions and cited positive/negative examples were inspected. The remaining missing rule is the scope/formula of prior shipping aggregation in `DeliveryAffordance.shippingDue`, including correction effects and the resulting amount after paid refusal in a retry or a new nonzero cycle. Exact request and read references are consolidated in TAWSEL-CHANGE-REQUESTS.md. No runtime behavior is inferred from schema shape alone.

ERP-DECISIONS.md and ERP-OPEN-QUESTIONS.md reconcile the current answers while preserving historical sessions. The prior-owner reference now points to section AB/session019; the report and HR notes and the consolidated Tawsel change register reflect the same choices. Report selection is unchanged. No final master plan, implementation phases, application code, deployment or phase approval has been produced.

Session 019 document validation passed across seventeen authored Markdown files: 194 decision definitions, 203 requirement definitions and 168 retained question definitions, totaling565 unique IDs. No duplicate definitions, undefined ERP-ID references or Arabic-script text were found in authored notes. The seven unchanged canonical reference files were deliberately excluded from authored-language/ID checks. The report catalog keeps28 correctly shaped rows with unchanged selection. No next business batch, master-plan.md or phases directory exists. Separate source-copy byte/hash checks passed as recorded in TAWSEL-BASELINE.md. These are documentation/integrity checks, not software behavior or integration tests.

## Session 020 - Scope clarification and early UI review

Recorded: 2026-10-03, Africa/Cairo. English translations of the latest answers:

1. There is no previously paid payment.
2. That will not happen. Once the branch and driver are selected, the goods are transported and the other branch confirms receipt, inventory values update.
3. The UI is now the main concern. The owner fears implementation phases will produce an unattractive or different result, and that redesigning it afterward will cause significant rework. The owner asks what will be done now to prevent that.

ERP-D-195 / ERP-R-204 interpret answer1 within the technical question actually asked: prior-attempt recipient shipping already paid. TAWSEL-CHECK-002 closes for selected scope by exclusion, not verified contract semantics. This does not delete the separately agreed prepaid-to-brand cases or legitimate charges per visit.

ERP-D-196 / ERP-R-205 reaffirm ERP-only carrier transfer and actual destination receipt updating custody/stock. No new Tawsel operation or changed-branch compatibility is established. The earlier ERP-D-186 commitment to subsequent customer dispatch after relocating a returned shipment is explicitly qualified: this answer does not clearly say whether it is withdrawn or assumed to follow from ERP receipt. Retain the tension for internal engineering reconciliation; do not silently delete scope or promise an unsupported path. No repeated technical questionnaire is issued, and this does not block UI design.

ERP-D-197 / ERP-R-206 record early UI certainty as the owner's current priority. Created UI-DESIGN-BRIEF.md with a proposed concrete process: inspect the actual visual reference, review rendered desktop/phone samples, exercise representative journeys in an interactive prototype, preserve reviewed tokens/components/screens and reference them in each later implementation prompt. Shared React presentation work should be reusable; sample data is not production integration proof. Owner approval of a future visual revision must be explicit.

Current visual evidence remains selected ERP-V2 source reads and the preserved timeline image. No live browser review, prototype, visual acceptance or responsive/accessibility test occurred this session. Observed brown/neutral reference tokens and the selected white/lime timeline direction do not establish a single approved global theme; visual comparison will resolve that. No final master plan, implementation phases, application code, runtime test or deployment was produced.

The current decision/question registers, source overlays and integration-check statuses have been reconciled. All authored records remain English. Canonical source bytes and Tawsel baseline identity remain unchanged.

## Session 021 - First interactive UI review sample

Recorded: 2026-10-03, Africa/Cairo. Faithful translation of the owner's latest message: "Fine. What do you need from me, or what is the next step?" This continues the agreed design-review work; it does not approve a rendered design, final palette, master plan or implementation phases.

### Concrete review output

Created an isolated prototype under [ui-preview/](ui-preview/README.md), with a module landing page, assigned-branch Products/Parcels inventory, company-wide shipment tracking and shipment detail. It uses fictional Arabic data, numeric shipment references, a utility/back header and focused pages without a sidebar or global module tabs. The appearance-review dialog compares white/lime and warm palettes on the same content. Both remain proposals awaiting explicit owner feedback.

The sample user's inventory covers Cairo and Giza: six branch-held parcels, three carrier-held parcels and five stock variants. Company-wide tracking also includes Alexandria. Shipment 10428 shows actual sample intake in Cairo, carrier handover and confirmed Giza receipt. Shipment 10430 remains in transit; shipment 10425 is a pending return still with the driver. These are presentation fixtures, not evidence of real physical movements or accepted Tawsel commands. The zero-recipient-payment case remains distinct from driver remittance and brand settlement.

The ERP-V2 demo was opened in the browser and returned 404. No running ERP-V2 business screen was inspected. The existing source observations and preserved owner-supplied timeline image therefore remain the visual references. The new prototype is an original proposed composition based on that evidence, not a claim to reproduce an inspected live ERP-V2 interface.

### Build and observed browser checks

- TypeScript and Vite build passed for the isolated prototype.
- Desktop1440x1050 and phone 390x844 browser viewports were inspected. Small-text and mobile-card-width issues found during visual review were corrected.
- Home search accepted Arabic digits for reference 10428. Inventory showed the six branch-held and three carrier-held fixtures; the carrier filter plus search found 10430. The Products view showed five assigned-branch variants.
- Global tracking found Alexandria shipment 10427. Reference 99999 produced the empty state.
- The appearance dialog switched between warm and lime palettes. Escape closed it and returned focus to its review trigger.

These observations are recorded in [UI-REVIEW-LOG.md](UI-REVIEW-LOG.md). They do not establish full accessibility or screen-reader compliance, real-device usability, production authorization, database behavior, transactional guarantees or a working Tawsel connector. No Vitest tests or ERP implementation phases were added or run in this design sample.

### Reuse, provenance and next review

The prototype uses React, shared shadcn/ui source installed through shadcn CLI 4.21.1 and the official Smooth UI button source with recorded MIT notices and prototype adaptations. See [third-party notices](ui-preview/THIRD-PARTY-NOTICES.md). Its dependency lock supports this review sample; it is not a final ERP architecture/version freeze.

The owner can now review the rendered screens and choose or amend the visual direction. Further journey samples, complete screen specifications and final implementation prompts remain later work under UI-DESIGN-BRIEF.md. The present sample and limited checks do not approve a global theme or resolve outstanding integration semantics. No production deployment or business mutation was performed.

## Session 022 - Owner approves the layout and design direction

Recorded: 2026-10-03, Africa/Cairo. Faithful English translation: "This is very good. This is exactly the layout/design I had in mind. We will need to add advanced filters, but we can put those in the phases. As a direction, this is what I had in mind. Confirm this direction."

ERP-D-198 / ERP-R-207 record explicit approval of the displayed UI-REV-001 overall layout/design direction. This replaces the prior pending-layout-review status. Use the prototype, its shared presentation components and captured layouts as references for subsequent screens and UI-bearing phase prompts. Preserve focused pages, module-card entry, simple utility/back navigation, restrained actions, readable information hierarchy, responsive presentation and the shipment timeline treatment. General layout discovery is closed; later changes to the accepted direction require a recorded amendment.

ERP-D-199 / ERP-R-208 add advanced filters to the relevant later phases. Define their fields and behavior per screen while keeping the default view clear. No immediate prototype filter implementation is requested. ERP-Q-170 closes with this approval and addition. ERP-Q-169 remains only partially resolved because no palette variant was named; no repeated question is issued now, and this does not block continued design within the approved direction.

Updated the decision, requirement and question registers, UI design brief, UI review log, reference-note status and prototype README. All authored records remain English. Detailed unreviewed workflows, final palette tokens, master-plan approval and phase authoring retain their existing process. This session changes documentation only; no application behavior, Tawsel contract, new test run or deployment is claimed.

## Session 023 - Detailed master-plan drafting and phase-quality reference

Recorded: 2026-10-03, Africa/Cairo. Faithful English translation: "Shall we start writing the phases and plan now, or what do you think? Most importantly, the phases must get the detail they need. We do not want to leave the agent room to invent things. Also look at the Tawsel routing docs directory; that will show what I mean."

The request authorizes a concrete planning package. ERP-D-003's sequence remains: owner review/approval of the master plan before complete implementation-phase prompts. No current message explicitly waives that sequence. The Tawsel docs were read as examples of detailed prerequisites, embedded rules, ordered checks, accepted/rejected scenarios, evidence and handoff; historical execution instructions were not followed and their phase count/models were not imported as ERP choices.

Created PLAN-001 master-plan.md and its domain, data/transaction, architecture/operations, screen, integration and contract-coverage specifications. Added complete requirement/decision traceability with phase assignments explicitly pending, a phase-authoring standard and an honest implementation-status starting record. The approved UI direction remains required and advanced filters are included per relevant screen. The documents contain normal/error/recovery journeys, exact money examples, atomic boundaries, scope exceptions, source identity and actual-versus-projected custody/money distinctions.

Five bounded financial choices are recorded as ERP-Q-171..175 with concrete proposals, not assumed approval. P-DOM-07 incident branch attribution and P-ARCH-01..07 are additional explicit plan proposals. The contract-specific reason extension and qualified cross-branch redispatch dependency remain visible; a selected source gap must not turn into an invented endpoint or a successful test claim.

Official technical/pricing sources were checked for the cited architecture/cost details, with failures and version-lock limitations recorded. No production backend, connector, migration, new UI behavior, Vitest suite, database transaction, live HTTP conformance, server deployment or restore test was run by writing this package. Only document checks are claimed for this session. Owner approval of PLAN-001 is pending.

## Session 024 - Owner resolves five financial choices

Recorded: 2026-10-03, Africa/Cairo. The owner answered the five asynchronous choices raised while the detailed plan was being written. These are approvals/amendments of the specific financial outcomes below, not approval of the complete master plan or authorization to start implementation.

| Display / question | Faithful English translation | Decision and effect |
| --- | --- | --- |
| 1 / ERP-Q-171 | Approve reserving the known shipping charges. | ERP-D-200 / ERP-R-209: reserve eligible wallet cover for known brand-paid shipping; exclude unremitted recipient proceeds and prevent competing payout from consuming the same credit. |
| 2 / ERP-Q-172 | All revenue goes into the month in which the subscription starts. | ERP-D-201 / ERP-R-210: reject daily allocation; recognize the entire fixed fee in the service-period start month, independently of receipt timing. |
| 3 / ERP-Q-173 | Approve distinguishing by movement type. | ERP-D-202 / ERP-R-211: entitlement deductions reduce employee cost; advances do not; incident recovery counts once. The asked6000/200/1000 example means4800 cash and5800 cost. |
| 4 / ERP-Q-174 | Approve the shipping-on-company exception. | ERP-D-203 / ERP-R-212: explicit linked replacement-shipping waiver, zero recipient/brand shipping and net shipping revenue, normal commission. Actual goods due is preserved. No employee-funded replacement option was selected. |
| 5 / ERP-Q-175 | We also need partial or advance payment. | ERP-D-204 / ERP-R-213: reject full-period-only storage payment. Support partial and advance receipts with separate auditable storage balances. |

The resulting storage proposal records an advance as unapplied storage credit, separate from the brand payout wallet. Allocate to oldest due periods, then apply remaining credit to new periods when they start; payment and revenue post once through independent sources. A100 partial receipt against310 leaves210 due. Advance500 before start creates0 revenue; a310 period later creates310 revenue and uses310 credit, leaving190. Stopping preserves remaining credit; an actual refund, if chosen, requires a separate linked cash-out with balance/funds checks. These allocation/refund mechanics are concrete planner proposals for master-plan review, not extra owner approvals inferred from the capability request.

Updated the master plan, domain/data/screen/integration specifications, report catalog, registers and traceability. P-DOM-07 incident branch attribution, P-ARCH-01..07 and other detailed engineering choices remain reviewable proposals. CR-001 and CHECK-003 remain precise external-contract dependencies. No new application behavior or runtime verification is claimed; phase prompts still await master-plan approval.

## Session 025 - Approved plan and complete phase authoring

Recorded: 2026-10-03, Africa/Cairo. Faithful translation of the owner instruction: "Go ahead, start." The immediately preceding handoff states that master-plan approval is followed by detailed phase writing. ERP-D-205 / ERP-R-214 record approval in that context. The current task is to author the complete phase package, not run its future implementation prompts. Detailed architecture, storage-credit allocation/refund and incident branch attribution are adopted; CR-001/CHECK-003 and unrun evidence remain named dependencies.

Use a dependency-ordered set of bounded results, with an independent full prompt and future execution record for each. The phase count follows the completed scope decomposition. Preserve UI-REV-001 and specify advanced filters in each relevant flow. Verify model recommendations against current local metadata and official documentation; do not change the running model by writing its name. All documents stay English.

Completed PHASES-001: 26 independent prompts, 26 not-started execution records, an ordered catalog, shared execution conventions and current model guidance. Assigned all 214 requirements, 205 decisions, 35 screen identities, 44 named Tawsel operations (43 scoped service operations and one operator bootstrap) and 27 sender events. Cross-domain and integration coverage retain conditional scope and external gates. Independent domain and integration reviews corrected dependency, report-identity, source-path and financial-evidence inconsistencies. Frozen unpaid payroll periods reserve their recovery allocations so another period cannot recover the same obligation twice.

Final document verification is recorded in [PHASES-001-DOCUMENT-CHECKS.md](docs/verification/PHASES-001-DOCUMENT-CHECKS.md). No production application code, migration, Vitest suite, database behavior, public integration, deployment, backup or restore was executed in this authoring session.
