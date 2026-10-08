# UI review log

## UI-REV-001 - Initial interactive sample

Created: 2026-10-03, discovery session021. Updated: session022. Status: overall layout and design direction explicitly approved by the owner under ERP-D-198 / ERP-R-207. The exact palette variant and final specifications for unreviewed screens remain unresolved.

### Scope

Source: [ui-preview](ui-preview/README.md). Local route: http://127.0.0.1:4173/ while the preview server runs. No external hosting or production integration is involved.

| Screen ID | Route | Review focus |
| --- | --- | --- |
| UI-HOME-001 | #/ | Module-card entry, focused search, simple utility header and back navigation. |
| UI-INVENTORY-001 | #/inventory | Assigned-branch parcel/product monitoring, search/filter density, desktop rows and phone cards. |
| UI-TRACKING-001 | #/tracking | Company-wide operational search, including a branch outside the sample user's assignments. |
| UI-SHIPMENT-001 | #/shipment/10428 | Current custody, actual branch-transfer timeline and recipient/shipment detail. |

The appearance-review dialog compares a white/lime treatment with a warm brown treatment on identical screens. Both are proposals. It is a prototype review control, not a required production settings feature. The fictional company name, employee and wordmark are placeholders rather than approved product branding.

The sample uses actual React components, generated shadcn/ui primitives, an adapted upstream Smooth UI button, Cairo font and coherent static fixtures. Arabic numerals normalize during search. Inventory filter and palette preferences persist in sessionStorage; business data remains immutable sample data. The intended server authorization, custody transactions and connector behavior are not implemented by client-side filtering.

### Evidence sources and limits

- Existing selected ERP-V2 source reference and the owner's preserved shipment-timeline screenshot.
- Direct browser navigation to the metadata-listed ERP-V2 demo URL returned404 on2026-10-03. Its running design was not inspected or presented as verified. No credentials or alternate deployment were guessed.
- Current official shadcn Vite/RTL guidance and Smooth UI button registry were reviewed. Generated primitives were connected to the local cn utility and the dialog's close label localized. Smooth UI adaptations and license are recorded in THIRD-PARTY-NOTICES.md.
- The screenshot's percentage/ETA and unsupported fields were not added. Stock in transit is not shown as available at destination before receipt. Zero recipient amount and reported money remain distinct from a real settlement.

### Verification performed on 2026-10-03

| Check | Observed result |
| --- | --- |
| TypeScript and Vite build | Passed after the final visual corrections. |
| Desktop and phone layout | Inspected at 1440x1050 and 390x844 in Chromium. Small text and mobile information-card widths were corrected. |
| Search | Arabic-digit input found 10428; company-wide tracking found Alexandria shipment 10427; 99999 produced an empty state. |
| Inventory | Assigned branch choices were Cairo/Giza; carrier custody plus search found 10430; Products showed five assigned variants. |
| Appearance dialog | Both palettes worked. Escape closed the dialog and returned focus to its trigger. |
| Narrow viewport overflow | Observed inventory and shipment-detail states had document width equal to the 390px viewport. |
| Browser console | Final inspected console reported zero errors and zero warnings. |

Final white/lime review captures:

| Screen | Desktop | Phone |
| --- | --- | --- |
| Landing | [Capture](output/playwright/home-desktop.png) | [Capture](output/playwright/home-mobile.png) |
| Inventory | [Capture](output/playwright/inventory-desktop.png) | [Capture](output/playwright/inventory-mobile.png) |
| Shipment detail | [Capture](output/playwright/detail-desktop.png) | [Capture](output/playwright/detail-mobile.png) |

These are limited prototype checks. No Vitest suite, real database, connector, full accessibility audit, screen-reader check or physical-phone test was run. The earlier warm detail capture predates the mobile width correction and is not a final review baseline.

### Owner approval recorded in session022

Faithful English translation: "This is very good. This is exactly the layout/design I had in mind. We will need to add advanced filters, but we can put those in the phases. As a direction, this is what I had in mind. Confirm this direction."

ERP-D-198 adopts this displayed revision's overall layout/design direction for subsequent ERP UI work. Preserve focused pages, module-card entry, a simple utility/back header, restrained actions, readable information hierarchy, responsive lists/cards and the shipment timeline treatment. The owner did not name a palette variant or device widths, so neither is inferred. Finance, HR, intake and transfer-operation specifications still require their applicable detailed design/review.

ERP-D-199 / ERP-R-208 require advanced filters in relevant later phases. The sample need not be changed immediately. Specify filters per screen and keep infrequent filter controls accessible without crowding the default view. A collapsible section or dialog is a design recommendation to evaluate for each screen, not a separately approved universal control.

### Next design work after feedback

Extend the approved direction through the shared components and remaining journey specifications in UI-DESIGN-BRIEF.md. Later UI-bearing prompts must cite this revision and the relevant screen references, include advanced-filter acceptance where applicable, and compare desktop/phone output with the approved direction. Retain the required master-plan review before implementation-phase prompts. This approval record changes documentation only; no new runtime test or production implementation is claimed.


## P20 implementation review — 2026-10-08

The payroll month, advance, bounded HR addition/deduction/review and immutable payment pages use the approved UI-REV-001 direction, shared Arabic RTL/Cairo tokens, readable exact EGP values and focused forms. Month totals separate earnings, original recovery, carry, employee cost and full net. Payout uses the server amount; zero closure has no account. Unknown responses retain command identity through reload; source histories preserve filters and historical branch attribution.

[P20 evidence](docs/verification/P20/README.md) retains earlier actual API/browser captures at desktop/mobile and long-history widths, including their failed attempts. The owner instructed “skip browser testing, just finish the phase”; final browser/device/manual review was therefore excluded or unrun. Script UI, actual HTTP and real PostgreSQL tests prove their separately stated behaviors. No final browser certification, physical-device review or new owner visual approval is claimed.

## P21 implementation review — 2026-10-08

The Settlements and optional opening-balance pages use the approved UI-REV-001 direction, shared Arabic RTL/Cairo tokens, exact EGP values and focused forms. Targets come first; no page offers a free-form balance or table edit. Each correction shows its before/after facts and effects, held dependents, warnings and blockers before a single confirmation with a required reason. A stale review re-previews instead of recording, and a lost response keeps its command identity across reloads. Opening batches state that they create no operating revenue or expense.

[P21 evidence](docs/verification/P21/README.md) contains real API/browser captures at 390 and 1440 px (plus 320 and 768 px for the picker, product preview, opening preview and case list), each asserted free of horizontal page scrolling, covering normal, stale, blocked, unknown-result, already-resolved and denied states. No physical-device review or new owner visual approval is claimed.

## P23 implementation review — 2026-10-08

The selected report picker/workspaces preserve UI-REV-001 focused Arabic RTL/Cairo pages, utility/back header and card/list hierarchy; compact frequent filters and collapsed advanced controls keep the approved direction. Query/sort changes create an explicit new snapshot and reset pagination; page/detail/back preserve filters. Combined9/10 stays within brand payouts, HR histories remain HR, and profit explicitly awaits P24. Export states retain unknown-response command identity and announce a file only after a completed artifact exists; expiry/failure/retry are visible.

Three UI script cases and real API/worker/PostgreSQL/export scripts pass. Earlier connected browser captures at320/390/768/1440 and partial exports remain under docs/verification/P23/screenshots, with their selector failures retained. Owner instructed “skip browser testing , focus on the scripts”; final browser/mobile/device review is excluded or unrun, not approved. Actual PDF19-page visual inspection confirms readable Arabic RTL wrapping, repeated headers, totals and page footers; that artifact review is distinct from UI/device review. White/lime remains the reversible default, no new palette approval. [P23 evidence](docs/verification/P23/README.md).
