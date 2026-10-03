# Shahn UI review prototype

## Purpose and review status

This isolated prototype makes the first ERP screens reviewable before final implementation prompts are written. The owner approved its overall layout/design direction as UI-REV-001 in discovery session022. See [the approval record](../UI-REVIEW-LOG.md). Advanced filters are required in later phases. This remains a static design prototype; detailed unreviewed screens and the exact palette variant are not covered by that approval.

The interface uses Arabic RTL with React, shared shadcn/ui components and a selected Smooth UI button. It offers two proposed palettes on the same screens. The owner can review layout, typography, density, navigation and mobile use without choosing a theme from a text description.

## Included screens

| Screen | Route | What can be reviewed |
| --- | --- | --- |
| Module landing | `#/` | Focused module cards, company context and company-wide shipment search. |
| Inventory | `#/inventory` | Parcels versus brand products, search, branch/brand filters and physical custody. |
| Company-wide tracking | `#/tracking` | Operational search across all company branches. |
| Shipment detail | `#/shipment/10428` | Current custodian, confirmed event timeline and shipment/recipient information. |

The landing cards for brands, finance, employees and reports are clearly marked as future design work. They do not open implemented modules. Sending/receiving transfers and other business mutations are also outside this first sample.

## Run locally

Open a terminal in the `ui-preview` directory. Install the locked dependencies:

```powershell
npm ci
```

Start the development preview:

```powershell
npm run dev
```

Open [the local preview](http://127.0.0.1:4173/). The development script binds only to `127.0.0.1` on port `4173`. Its strict-port option reports an occupied port rather than choosing a different one. Keep the terminal running while reviewing; stop it with `Ctrl+C`.

To type-check and create a production-shaped static build:

```powershell
npm run build
```

To inspect that build locally after stopping the development server:

```powershell
npm run preview
```

The preview script also uses only `127.0.0.1:4173`. These commands do not publish or deploy the application. Package versions and reproducible dependency resolution are recorded in `package.json` and `package-lock.json`; they do not approve the final ERP dependency choices.

## Data and scope

All records come from `src/data.ts`. They are fictional, static design fixtures: 12 shipments, 6 stock variants and 3 branches. Numeric shipment reference `10428` is the main timeline example. Fixture references and state names are local presentation data, not Tawsel IDs or a proposed wire contract.

- The sample user's assigned branches are Cairo and Giza. Inventory filters and records use those branches.
- Tracking deliberately includes Alexandria as well, demonstrating the approved company-wide operational-read exception. That exception does not grant transaction, financial or HR authority.
- Inventory quantities distinguish physically on-hand, available, reserved and damaged units. Here, `onHand = available + reserved + damaged`.
- Shipments in carrier custody are outside branch inventory. A completed destination receipt places a shipment in the destination branch. A pending return does not claim a branch receipt.
- `recipientDue` is the commercial amount expected from the recipient at delivery. It is not a brand wallet balance, current outstanding debt or payout eligibility.
- A reported delivery/payment is separate from actual driver remittance and financial settlement. There is no simulated wallet or treasury posting.
- Timelines show recorded sample events. They contain no inferred GPS position, progress percentage or promised arrival time.

Search, filters, navigation and palette selection work in the browser. There is no backend, production authentication, real permission enforcement, database transaction, persistence workflow or Tawsel connector. Client-side scope filtering demonstrates the intended presentation; it cannot establish a security boundary. Refreshing keeps the static fixtures. Palette and inventory-filter preferences persist within the browser session; no business records are persisted or changed.

## Manual review walkthrough

1. Open the landing page. Review whether the primary search, module choices and utility header are understandable without a sidebar. Open Inventory, then return to the landing page.
2. Open the appearance-review dialog in the top preview strip. Compare the white/lime and warm palettes on the same screens. Changing this selection is a preview action, not design approval.
3. In Inventory, keep all assigned branches selected. Switch between parcels and brand products. Confirm that the branch choices are Cairo/Giza and that Alexandria stock is absent.
4. Search for shipment `10431`: it is being prepared from reserved stock. Inspect product `501` through the product name/brand filters: one unit is reserved, one is damaged and sixteen are available out of eighteen physically present.
5. In the parcels view, select the custody filter for goods outside the branch and search for `10430`. It is with an inter-branch carrier, awaiting actual receipt in Giza. Reset filters to return to branch-held parcels.
6. Open shipment `10428`. Follow its timeline from Cairo intake through carrier handover to confirmed Giza receipt. Review the current-location panel and whether the next expected step is clear.
7. Open company-wide tracking and find `10427`, an Alexandria shipment absent from the assigned inventory view. Its recipient owes zero because payment including delivery was made to the brand. This demonstrates read scope and the prepaid case, not a cash movement.
8. Compare `10425` and `10424`. The first is a refused shipment still with the driver and waiting for branch return receipt; the second is physically in Cairo under damage review. Neither implies an automatic compensation or payroll deduction.
9. Open `10426`, the delivered Alexandria example. Its timeline records the reported recipient payment and explicitly keeps actual driver remittance separate.
10. Search for a nonexistent reference, such as `99999`, and use the empty-state reset action. Repeat the main search, inventory and timeline review at a narrow phone width and with keyboard navigation.

Useful review feedback names the screen, palette and device width, then the specific issue: unclear action, excessive spacing, cramped rows, difficult reading, hidden information or awkward return navigation. Final design approval and changes should be recorded explicitly in the design review log.

## Verification record

The TypeScript/Vite build passed. Limited Chromium checks covered desktop and phone viewports, search, inventory filters, company-wide tracking, empty results and the appearance dialog. See the [dated verification record and captures](../UI-REVIEW-LOG.md) for exact observations and limits. No Vitest suite, full accessibility audit or real-device test was run. This prototype cannot validate ERP financial transactions, inventory concurrency, durable recovery or Tawsel integration guarantees.
