# ERP UI Reference Notes

Initial source review: 2026-09-27, discovery session 006. Updated through session 022, 2026-10-03. The owner explicitly approves the displayed [ui-preview/](../../../ui-preview/README.md) layout/design direction as UI-REV-001 under ERP-D-198 and requests advanced filters in later phases under ERP-D-199. The exact palette variant was not named. ERP-D-158 separately approves the application stack. [UI-DESIGN-BRIEF.md](../../../UI-DESIGN-BRIEF.md) governs continuing design, and [UI-REVIEW-LOG.md](../../../UI-REVIEW-LOG.md) records the approval and existing build/browser checks. Historical session notes below retain their original status at the time.

## Owner direction

ERP-D-060 selects shadcn/ui + Smooth UI. ERP-D-062 now permits a simple utility/back top bar and requires focused pages without global business-module tabs, sidebar navigation or clutter. ERP-V2 supplies visual/frontend/layout references only. Its business behavior, module list, permission code, backend, and dependencies are not the new ERP specification. ERP-D-061 separately requests consistent module metadata and configured business reference data.

## ERP-V2 source evidence

Repository: [7ossam26/ERP-V2](https://github.com/7ossam26/ERP-V2). Default branch observed: main. Reviewed commit: `7254e34b49acfbe394da3a889abe6e458084cb38`. Public recursive tree returned `truncated: false`.

Read these six files through the public raw-content endpoint at that commit:

| File | Relevant observation |
| --- | --- |
| frontend/src/layouts/MainLayout.jsx | Centered bounded content; responsive padding; branch/account controls; fixed top navigation. Session 007 accepts this kind of utility/back bar; global module tabs are excluded. |
| frontend/src/pages/MainDashboard.jsx | Responsive module-card grid, short titles/descriptions, centered heading, restrained hover treatment. |
| frontend/src/pages/CreatesDashboard.jsx | Separate reference-data entry hub using consistent cards; module visibility derives from metadata/access. Existing listed operations are not automatically ERP scope. |
| frontend/tailwind.config.js | Warm brown/neutral palette, Cairo font, rounded surfaces, light/dark tokens, soft shadows, and touch-size utilities. These describe the reference, not individually approved new tokens. |
| frontend/src/App.css | Contains starter root/logo styles. Its actual runtime use was not traced; do not treat every declaration as the observed application design. |
| frontend/package.json | Reference declares React 18.3.1, Vite 5.4.11 and Tailwind 4.1.18 ranges, plus several other UI libraries. No dependency set was copied. |

Source review only: no browser screenshot, authenticated screen, running component, or responsive/accessibility test was performed. Homepage `https://erp-v2-mocha.vercel.app` was observed in repository metadata only. No backend code/business rules were reviewed for adoption. No repository was installed or run.

## Smooth UI evidence and compatibility limits

Fetched [llms-full.txt](https://smoothui.dev/llms-full.txt). SHA-256 of the temporary downloaded bytes: `c2be985ccc9b9082864ef0fd980b96d121844e05e5d2eee516321883a0ce33c0`. Read selected catalog, installation, Vite prerequisites, animation, and reduced-motion sections; the full component catalog bodies were not read.

The [installation guide](https://smoothui.dev/docs/guides/installation) documents shadcn registry installation, supporting the requested library combination. Its [Vite guide](https://smoothui.dev/docs/guides/vite) lists React 19+, Vite 6+, Tailwind 4+, and Motion 12+. These differ from the reference project's React/Vite declarations. Verify actual selected package requirements and a supported runtime when architecture is chosen; do not copy the guide's minimum Node version as a deployment decision.

The accessibility guide describes reduced-motion behavior. Treat that as documentation, not proof for the eventual ERP composition. Arabic RTL, focus/keyboard behavior, contrast, dense forms, and reduced-motion use still need real checks. Avoid decorative effects that slow repetitive entry.

## Unapproved design recommendations

- Use a clear module landing page and focused task pages; choose local navigation/branch switching within the clarified simple-bar and no-global-module-tabs requirement.
- Keep consistent tokens and a single basic component vocabulary. Add purposeful Smooth UI behavior where it helps, with no decorative dependency mandate.
- Separate code-defined module descriptors from administrator-managed governorates, areas, and tariff records. A module registry is not a general no-code workflow builder.

The original visual-source review did not approve a stack. ERP-D-158 subsequently approves the application stack; this note does not select exact package versions, final screen inventory, theme, module engine or deployment details.

## Session 007 scope clarification

The owner now explicitly requests focused HR workflow review as well as the earlier visual reference. See ERP-HR-REFERENCE-NOTES.md for its findings and limits. This does not approve unrelated ERP-V2 business logic or its entire permission/financial model.

## Session 011 scope clarification

On 2026-10-01 the owner additionally requested focused expense/treasury/transfer/deposit-withdrawal and branch/user source review. See ERP-FINANCE-REFERENCE-NOTES.md for exact reading coverage and distinctions from the selected ERP policies. Use the explicit sole-branch or assigned-branch choice, focused operating pages and separate reports; retain the owner's modular permissions and history-preserving correction rules.

Daily inventory monitoring/search/filtering for products and parcels is now the clarified requirement. Formal count sessions and movement freezes are excluded; physical comparisons happen outside ERP and differences are handled through the adjustments page. No UI prototype or final screen implementation has been created by this clarification.

## Session 014 operational-device and technical direction

Date: 2026-10-02. ERP-D-147 explicitly requires usable desktop and phone operations: office staff mainly use computers while receiving/distribution staff often use phones. Mobile acceptance must cover actual forms, confirmation, feedback and navigation rather than reports alone. ERP remains online-only; no native app is selected.

ERP-D-149 restricts normal intake branch choices to assigned branches, using the sole branch directly or a permitted multi-branch selector. ERP-D-151/152 allow support to use normal business screens with Technical Support attribution; the support account stays outside ordinary employee management. Existing utility/back bar, no global module tabs, focused page purpose and shadcn/ui + Smooth UI direction remain.

At session 014 the researched React/TypeScript/Vite proposal in ERP-TECHNICAL-OPTIONS.md awaited ERP-Q-136. Session 015 resolved that question through ERP-D-158: the application stack is approved. The ERP-V2 dependency set was not copied, and exact compatible package versions still need verification. No responsive rendering, benchmark or usability test has been run.

## Session 017 shipment history and transfer reference

Date: 2026-10-03. ERP-D-177 / ERP-R-186 record the owner's requirement to search for a shipment and understand what happened to it, where it is now and its current state. The owner supplied the phone screenshot below and explicitly requested the same design direction for this experience.

Reference asset: [Owner-supplied shipment timeline](assets/shipment-timeline-owner-reference.png). The saved file is a byte-identical copy of the attachment `codex-clipboard-7f932b26-2b1e-4fee-baee-066c7bf342c0.png`. SHA-256: `6C987A6A1120227BC3BBFD58179FC0997B8F6BB38F150A5086777BE7418D0748`.

### Selected visual direction and limits

- Use a focused white page with a simple back/header area, a vertical timeline, strong black headings, light-gray supporting information, a lime accent for the current step, and a shipment-information section or card below it. Preserve the uncluttered mobile composition while adapting layout and reading order for Arabic RTL and desktop use.
- Show actual shipment history alongside an understandable current state and location or custodian. Inter-branch transport must distinguish the source branch, driver custody while in transit, and actual destination receipt. Repeated transfers, delivery attempts and corrections must remain understandable in the history.
- The screenshot's `Shipment Progress 60%`, expected dates, weight, dimensions, package type, USD fee and settings icon do not approve a progress formula, ETA promise, new mandatory data fields or settings behavior. Its `TRK-89452` example does not replace the approved numeric human-readable shipment reference.
- An exact stage vocabulary and final component/token choices remain design work. A visual stage is not evidence that a physical event occurred. Do not display destination receipt before confirmation or make in-transit goods simultaneously available at both branches.
- The requested history is an operational requirement. Session 018 resolves the originally open visibility question through ERP-D-187 / ERP-R-196: access to the tracking screen permits search across all shipments in the same company and their full operational journey. This is an explicit operational-read exception; it does not expand financial views, report/export access or write authority.

### Assigned-branch transfer screens

ERP-D-179 / ERP-R-188 accept the proposed assigned-branch scope for physical goods transfer. Read together with ERP-D-015, ERP-D-032 and ERP-D-149:

- A sender with one assigned branch uses that source directly. With multiple assigned branches, the sender selects a source from those branches. The destination can be any other branch in the same company.
- The receipt screen lists incoming transfers whose destination is one of the user's assigned branches. A user assigned multiple branches can filter among them; each item and confirmation must clearly identify its destination branch.
- A user's effective screen capabilities remain consistent across their assigned branches. Server-side authorization enforces company, screen and branch scope together with business-state rules. Do not introduce hardcoded job-title permissions, per-branch capability exceptions or a mandatory second person.
- Treasury transfer screens retain their separate, explicitly approved company-wide scope. That exception does not expand physical goods-transfer authority.

The owner selected ERP staff assignment and handover recording followed by destination staff receipt. This visual reference does not introduce a Tawsel inter-branch transport task or a new driver application. No UI code, mockup, browser rendering or usability test was produced in this review.

## Session 018 transfer selection and company-wide tracking

Date: 2026-10-03. The following requirements refine the accepted focused pages and timeline design. They do not replace the owner's screenshot or alter the selected visual language.

- ERP-D-187 / ERP-R-196 explicitly allow a user with tracking-screen access to find any shipment in the company and read its full journey, including branches outside the user's assignments. For example, branch A can explain when it held a shipment and that it is now at branch B. Current location/custodian, state and dated history must distinguish confirmed facts, pending work and corrections. This supersedes the earlier proposed restriction to shipments associated with assigned branches. Company isolation remains mandatory; this permission does not grant financial records, exports, transfer creation or receipt actions outside their existing authority.
- ERP-D-184 / ERP-R-193 allow active company drivers as carriers, showing source-branch drivers first while allowing another branch's driver when needed. ERP-D-185 / ERP-R-194 allow transfer assignment during an existing Tawsel delivery round. Prioritize drivers whose known state is at the branch with no ongoing round, and visibly identify an ongoing round during selection. Do not turn this preference into a prohibition on concurrent delivery work. Display the freshness of relevant evidence; absence of current data is not proof that a driver is available, physically at a branch or located by GPS.
- ERP-D-186 / ERP-R-195 permit a shipment that has already had a delivery attempt to move to another branch after actual source receipt and appropriate condition checks, followed by later dispatch from the destination. Preserve its numeric shipment reference, recorded price and full attempt/custody history. The Tawsel contract path for later destination dispatch still needs verification; a permitted ERP transfer does not by itself prove that Tawsel accepts that reassignment or redispatch.
- ERP-D-188 / ERP-R-197 require identity and exterior-condition inspection for a sealed complete parcel, without routinely opening it to recount its contents. Count loose stock quantities. The receipt UI must not imply that inner-piece completeness was verified just because a sealed parcel was received; suspicions use the agreed discrepancy/incident process.
- ERP-D-189 / ERP-R-198 select one manifest per physical trip. A planned second trip needs a separate manifest; expected contents of an unperformed later trip must not appear as an unexplained shortage in the completed trip. No automatic split or mandatory grouping mechanism is inferred.
- ERP-D-183 / ERP-R-192 keep inter-branch transport internal to the company with no additional brand charge. ERP-D-180 keeps driver remuneration within salary. These transfer pages must not invent a customer delivery fee, recipient-money amount or extra commission.

Assigned-source sending and assigned-destination receipt remain as defined above. A multi-branch user's selector and filters cover their assigned branches; company-wide operational tracking does not change those write boundaries. These are recorded discovery requirements only; no mockup, runtime UI, browser test or Tawsel-baseline change is claimed.

## Session 020 - UI definition before implementation

ERP-D-197 / ERP-R-206 record the owner's request to make the intended UI clear early and avoid a broad redesign after implementation phases. [UI-DESIGN-BRIEF.md](../../../UI-DESIGN-BRIEF.md) proposes concrete rendered samples, representative interactive journeys, explicit visual review and reusable shared screen/component references for later prompts.

The proposed review includes real Arabic RTL desktop/phone layouts, forms and dense lists, money/stock confirmation, shipment timeline and pending/error states. This proposal has not produced or obtained approval for a prototype. The previous ERP-V2 review remains source-only. No global palette is approved: the observed brown/neutral source tokens and the owner-selected white/lime timeline direction must be reconciled visually.

Session020 ERP-D-196 reaffirms carrier transfer and actual destination inventory updates. The earlier post-attempt destination customer-dispatch statement is qualified pending internal lifecycle/scope reconciliation; do not render it as a supported Tawsel operation merely because the visual transfer flow is approved.

## Session 021 - Available prototype and actual visual evidence

The first prototype contains a focused module landing page, assigned-branch inventory, company-wide tracking and shipment detail. White/lime and warm palettes can be compared through its appearance-review dialog. Neither is the approved global palette. The prototype uses Arabic RTL fixtures and reusable React presentation components; it does not implement production authentication, inventory transactions or a Tawsel connector.

The previously recorded ERP-V2 demo address was opened in a browser during this session and returned 404. Consequently, no rendered ERP-V2 operating screen was inspected. The source observations at the recorded reference commit and the preserved owner-supplied timeline remain the available design evidence. The new prototype's browser checks establish observations about the prototype only.

### Source and reuse record

- Shared shadcn/ui source was installed through shadcn CLI 4.21.1.
- The selected Smooth UI button comes from its official source, with MIT attribution and the prototype adaptations recorded in [THIRD-PARTY-NOTICES.md](../../../ui-preview/THIRD-PARTY-NOTICES.md).
- The isolated prototype package and lockfile record compatible dependencies used for this sample. Their versions do not freeze final ERP implementation or deployment decisions.
- The sample uses numeric reference 10428 for the main transfer-receipt timeline. It does not copy the reference image's percentage, expected date, USD, dimensions or prefixed identifier.

### Observed checks and limits

The TypeScript/Vite build passed. The prototype was inspected at desktop 1440x1050 and phone 390x844 viewports. Visual review found small-text and mobile-card-width issues, which were corrected. Recorded interactions covered Arabic-digit home search for 10428; the six branch-held/three carrier-held inventory totals; carrier search 10430; five assigned product variants; company-wide search for Alexandria shipment 10427; empty results for 99999; warm/lime palette selection; and Escape dismissal returning focus to the review trigger.

These checks preserve the business distinctions exposed by the sample: Cairo/Giza inventory versus company-wide operational tracking, carrier custody versus actual branch receipt, and expected recipient payment versus actual driver remittance. Static fixture filtering is not server-side authorization, and a timeline is not proof of a completed real transaction.

Full accessibility, screen-reader operation, real-device usability, complete journey coverage, backend behavior and integration were not tested. No Vitest run or ERP implementation phase is claimed. See [UI-REVIEW-LOG.md](../../../UI-REVIEW-LOG.md) for the current review record and [the prototype README](../../../ui-preview/README.md) for a manual walkthrough. Owner feedback and explicit approval of a revision remain the next visual-design decision.
