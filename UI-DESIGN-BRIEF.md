# ERP UI design and review brief

Date: 2026-10-03, updated through discovery session 022.

Status: the owner explicitly approves the displayed UI-REV-001 layout and design direction under ERP-D-198 / ERP-R-207. The runnable reference is [ui-preview/](ui-preview/README.md); approval and existing build/browser evidence are in [UI-REVIEW-LOG.md](UI-REVIEW-LOG.md). Advanced filters are required in later phases under ERP-D-199 / ERP-R-208. A palette variant was not named, and detailed unreviewed screens still need specifications. This is not the master plan or an implementation phase.

## Purpose

Make the visual language and important user journeys reviewable before implementation prompts commit them to the application. The owner wants to avoid discovering a substantially different UI after completing the implementation phases. ERP-D-197 / ERP-R-206 record this requirement; the concrete workflow here is the planner's proposal.

## First review sample now available

The first sample covers module entry, assigned-branch inventory with Products/Parcels views, company-wide shipment tracking and a focused detail/timeline page. Its overall layout/design direction is approved and must guide forms, finance and other journeys below. The appearance dialog compares white/lime and warm palettes; the owner has not named one variant as the final global palette.

The sample uses fictional Arabic data. Cairo/Giza inventory shows six branch-held parcels, three parcels outside branch custody and five stock variants; tracking also finds Alexandria shipments. Reference 10428 demonstrates confirmed sample intake, inter-branch handover and destination receipt. These views do not execute real transactions or validate any Tawsel mapping.

The TypeScript/Vite build passed, and browser inspection covered desktop 1440x1050 and phone 390x844. Recorded interactions include Arabic-digit search, custody/product filtering, global tracking, empty results, both palettes and Escape returning dialog focus to its trigger. Small-text and mobile-card-width issues were found and corrected. Full accessibility, screen-reader checks, real-device tests, backend/integration verification and Vitest runs remain unperformed for this sample. The detailed record is [UI-REVIEW-LOG.md](UI-REVIEW-LOG.md).

## Established direction and source limits

- Arabic RTL, with actual desktop and phone usability. Authored planning documents remain English; prototype interface copy represents the intended Arabic product.
- Focused pages with a clear task, primary action and visible missing or pending information. Keep infrequent or unrelated actions in an appropriate separate page or dialog.
- A simple utility/back bar is allowed. No sidebar or global business-module tabs. Navigation, branch selection and back behavior must be consistent.
- Use the approved React stack, shadcn/ui and selected Smooth UI components. A library choice does not determine the finished design or prove RTL, accessibility or performance.
- ERP-V2 is the layout/frontend reference. Its prior review inspected selected source files. A session 021 browser visit to its demo returned 404, so no running ERP-V2 operating screen was inspected. Its dependencies and unrelated business behavior are not the new ERP specification. The prototype's own browser checks are separate evidence.
- The owner-selected shipment timeline supplies a white surface, strong black text, quiet gray details and lime current-state emphasis. Its example progress percentage, ETA, dimensions and settings button are not requirements.
- ERP-V2's observed brown/neutral palette is not an approved global theme. Reconcile it with the timeline direction through visual comparison of the same representative screens. Do not silently choose one reference for every screen.

Detailed provenance and the preserved image are in [ERP-UI-REFERENCE-NOTES.md](docs/discovery/references/ERP-UI-REFERENCE-NOTES.md).

The first sample uses shared shadcn/ui source installed through shadcn CLI 4.21.1 and the official Smooth UI button source with MIT notices and recorded adaptations. See [THIRD-PARTY-NOTICES.md](ui-preview/THIRD-PARTY-NOTICES.md). Its locked package versions support the isolated prototype and are not a final ERP architecture/version freeze.

## Design work before implementation prompts

### 1. Inspect the visual reference and define the screen map

Inspect the referenced interface in a browser when available, recording the exact pages/states actually seen. If the deployed reference is unavailable, use its available source and the supplied image with that limitation stated. Do not claim source inspection is visual approval.

Create a screen map tied to the approved journeys. For each screen, record its audience and access scope, purpose, primary action, necessary data, entry/exit navigation and the reason for any separate page or dialog. Define how a one-branch user and a multi-branch user see the same operation. Tracking's company-wide read exception must remain distinct from mutation authority.

### 2. Extend the approved visual sample

The first layout/design-direction review is complete in session022. Reuse UI-REV-001 instead of repeating general layout discovery. The following review steps apply to unresolved details and additional screen patterns.

Show actual rendered desktop and phone versions of a simple landing/detail screen and a demanding form/list screen. Resolve typography, palette, spacing, content width, density, controls, table behavior and mobile adaptation by looking at these screens. If palette direction needs comparison, present alternatives on the same content rather than adding a text questionnaire about isolated colors.

Record the owner's exact feedback and the approved sample revision. No silence, component selection or reference screenshot alone approves the whole system.

### 3. Build an interactive design prototype

Use coherent representative Arabic data and the intended shared React components so the approved visual work can be reused. The prototype demonstrates navigation, forms, confirmations and states. It uses clearly identified sample data and does not claim real balances, stock transactions, authentication or Tawsel integration.

Cover these representative journeys:

| Journey | What the review must expose |
| --- | --- |
| Module entry, back navigation and branch context | Few clear choices, understandable current page and safe return to the previous task. |
| Ready-parcel entry and stored-stock order preparation | A realistic long form, explicit prices and inspection choice, reservation/shortage feedback and preparation completion. |
| Brand setup | Service choices, negotiated pricing, payout schedule and storage settings without crowding one undifferentiated form. |
| Inventory monitoring and shipment tracking | Useful search/filters, Products versus Parcels, full timeline, current custodian and pending transfer state. |
| Inter-branch sending and receiving | Separate screens, assigned-branch rules, carrier state and actual received quantities/condition. In-transit goods are not available in both branches. |
| Driver remittance and brand payout | Distinct workflows, full remittance with mixed methods, eligible brand balance and clear actual-payment confirmation. |
| Employee payment | Salary, commission, additions, deductions and net shown separately; ordinary manual deduction and one net salary payout. |
| Financial report | Useful period/branch filters, totals, long data and a readable print preview. |

These are coverage samples, not a fixed implementation-phase count. Every approved screen must eventually have a specification; representative patterns reduce duplicate design work. Financial, custody and irreversible-in-practice confirmations need explicit review even when they reuse a familiar layout.

Show loading, empty results, validation, insufficient stock/funds, pending Tawsel synchronization, lost connectivity, unknown result after timeout, denied scope and an already-completed action where relevant. Pair visual states with a short explanation of what the user can do next. Do not display success until the represented server-confirmed result is known.

### 4. Preserve the reviewed design as an implementation reference

The proposed design package will include:

- A screen inventory and navigation map, with stable screen identifiers and links to requirements/decisions.
- Concrete design tokens: colors, type scale, spacing, radii, shadows and responsive behavior.
- Shared component examples for forms, buttons, search/filter controls, lists/tables, dialogs, money summaries, status messages and timelines.
- Per-screen specifications: fields, required/optional rules, primary/secondary actions, visibility, state transitions and exact shared components.
- Desktop/phone captures of approved revisions plus the runnable prototype used for review.
- A design review log naming what was approved, what remains open and any later explicit amendment.

The runnable first prototype and UI-REVIEW-LOG.md form the approved direction reference. Session023 adds a proposed operating screen inventory, fields, states and advanced-filter specification in [ERP-SCREEN-SPEC.md](docs/planning/ERP-SCREEN-SPEC.md), linked from the owner-review master plan. Additional transactional screens have not all been rendered or reviewed; the written specifications do not claim that evidence. Continue in complete reviewable batches within the approved direction. Final implementation prompts follow master-plan approval and cite the applicable design references.

## How later phases preserve the design

Every UI-bearing prompt must name the relevant screen specification, approved captures, shared component paths and revision. It must describe the actual states and behavior to implement, including permissions, branch scope, loading/error/pending states and mobile layout. Reuse the approved shell and components; do not create an independent visual language for each module.

Plan an early implementation deliverable that establishes the approved reusable UI foundation. Later work connects approved screens to real APIs and adds only the specified behavior. Keep presentation and domain transactions behind clear boundaries so normal visual changes do not require rewriting financial or inventory rules. This reduces rework; it does not guarantee no later product change.

Treat a required structural or visual change as an explicit amendment to the screen/design record before carrying it through later prompts. Do not quietly replace approved navigation, tokens or components because an implementation agent prefers another template. Routine fixes within the approved design can proceed without a new approval round.

## Verification and owner walkthrough

- Run the relevant screen in a real browser at the documented desktop and phone viewports. Capture the same states as the approved reference and compare them.
- Check Arabic RTL, long Arabic text, EGP/numeric readability, keyboard focus, touch targets, scroll behavior and reduced motion where used.
- Use browser interaction checks for important journeys and meaningful Vitest behavior tests for relevant UI state logic. Visual comparison is additional evidence, not a replacement for functional tests or real database verification.
- Give the owner a concrete manual walkthrough: which page to open, what to enter/click and what should appear, including at least the material failure/pending state.
- Record checks actually run, observed differences and any untested state. A mock prototype validates a design discussion; it does not prove a real connector, authorization boundary or transaction.

The overall rendered layout/design direction is approved. Final palette tokens, complete responsive specifications and component APIs remain detailed design work; preserve the accepted direction while completing them.

## Advanced filters in later phases

ERP-D-199 / ERP-R-208 explicitly require advanced filters. Include them in the relevant screen specifications and later UI-bearing phases rather than treating the prototype's small filter set as complete. Specify each screen's fields and supported combinations from its approved business data, visible active-filter state, reset behavior, empty results, desktop/phone treatment and authorization scope. Dates, branches and other dimensions apply only where relevant to the screen and permitted for the user.

Keep frequent search/filter controls easy to reach and place additional controls in an appropriate expandable area or dialog when useful. This presentation is a design recommendation serving the approved simplicity requirement. Do not infer saved searches, universal filter fields or broader data permissions. Later acceptance must include meaningful filter behavior checks and a clear owner-run example.
