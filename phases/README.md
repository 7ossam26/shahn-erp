# ERP implementation phases

Revision PHASES-001, 2026-10-03; execution status updated2026-10-04. PLAN-001 is approved for phase authoring under ERP-D-205 / ERP-R-214. These are complete execution prompts. P01–P08 are **verified within their stated local scopes**, including P02's earlier isolated PostgreSQL/Keycloak evidence and P03/P04/P05/P06/P07/P08's PostgreSQL 18.3 checks. Owner manual review, customer live issuer and a fresh Keycloak browser regression on this host remain unverified. P09–P26 remain **not started**. Authoring a prompt does not run it.

## How to use

1. Keep this package, the pinned Tawsel references, UI prototype/captures and all linked specifications together when moving outside this chat. Paths in prompts are relative to the ERP root; no original Windows path is required by the implementation.
2. Read the [approved master plan](../master-plan.md) and the selected phase. Check [shared execution conventions](EXECUTION-CONTRACT.md), then select the recommended available model/effort using [verified model guidance](MODEL-GUIDANCE.md).
3. Copy the entire numbered phase prompt into a fresh Codex conversation in the ERP workspace. It names its exact reading and prerequisites; no chat-history knowledge is assumed. Do not copy the whole catalog as an instruction to execute every phase.
4. Follow the catalog order unless deliberately using the dependency graph. A prerequisite must be observed, not inferred from a completion label. Make small in-scope repairs and record them; keep material missing external capabilities explicitly blocked.
5. Review the actual result and its manual trial/evidence. The agent updates its execution record and stops after that phase. Start the next phase yourself.

The decomposition yields 26 results from the dependencies and demonstrable journeys. It was not copied from Tawsel or chosen as a target count. Foundation/identity/atomic primitives precede commercial writes; the real integration boundary precedes dispatch. Money receipt and brand payout are separate outcomes; storage/payroll/reporting have separate acceptance. Final operations/pilot prompts are as complete as the earlier prompts.

## Ordered catalog

| Phase | Observable result / complete prompt | Direct prerequisites | Recommended model / effort | Execution record |
| --- | --- | --- | --- | --- |
| P01 | [Runnable foundation and approved UI shell](01-foundation-and-ui-shell.md) | Existing approved documents and UI reference | `gpt-6.1-sol` / `xhigh` | [Verified within stated scope](execution/P01.md) |
| P02 | [Company access and shared identity](02-company-access-and-identity.md) | P01 | `gpt-6-astra` / `xhigh` | [Verified within stated scope](execution/P02.md) |
| P03 | [Atomic commands and shared journals](03-atomic-commands-and-journals.md) | P01, P02 | `gpt-6-astra` / `xhigh` | [Verified within stated scope](execution/P03.md) |
| P04 | [Brands, geography and immutable pricing](04-brands-geography-and-pricing.md) | P02, P03 | `gpt-6.1-sol` / `high` | [Verified within stated scope](execution/P04.md) |
| P05 | [Products, physical stock receipt and monitoring](05-products-stock-receipt-and-monitoring.md) | P03, P04 | `gpt-6.1-sol` / `high` | [Verified within stated scope](execution/P05.md) |
| P06 | [Ready and company-packed parcel intake](06-parcel-intake-and-packing.md) | P04, P05 | `gpt-6.1-sol` / `high` | [Verified within stated scope](execution/P06.md) |
| P07 | [Stored-stock reservation and preparation](07-stock-order-reservation-and-preparation.md) | P05, P06 | `gpt-6.1-sol` / `high` | [Verified within stated scope](execution/P07.md) |
| P08 | [Employee profiles and effective commission terms](08-employee-profiles-and-commission-terms.md) | P02, P03 | `gpt-6.1-sol` / `high` | [Verified within stated scope](execution/P08.md) |
| P09 | [Actual company money and paid expenses](09-accounts-expenses-and-money-movements.md) | P02, P03, P04 | `gpt-6.1-sol` / `high` | [Not started](execution/P09.md) |
| P10 | [Treasury sending and full receipt](10-treasury-transfers.md) | P09 | `gpt-6.1-sol` / `high` | [Not started](execution/P10.md) |
| P11 | [Tawsel bootstrap and durable command/event boundary](11-tawsel-bootstrap-and-durable-receiver.md) | P02, P03, P04, P08 | `gpt-6-astra` / `xhigh` | [Not started](execution/P11.md) |
| P12 | [Customer dispatch, actual handover and shipping cover](12-customer-dispatch-and-shipping-cover.md) | P06, P07, P08, P09, P11 | `gpt-6-astra` / `xhigh` | [Not started](execution/P12.md) |
| P13 | [Execution projections, visit facts and full tracking](13-execution-projections-and-tracking.md) | P08, P12 | `gpt-6.1-sol` / `high` | [Not started](execution/P13.md) |
| P14 | [Actual return receipt, disposition and redispatch](14-returns-and-redispatch.md) | P05, P13 | `gpt-6-astra` / `xhigh` | [Not started](execution/P14.md) |
| P15 | [Internal physical branch transfers](15-interbranch-goods-transfers.md) | P05, P07, P08, P11, P13, P14 | `gpt-6.1-sol` / `high` | [Not started](execution/P15.md) |
| P16 | [Full driver remittance with source evidence](16-full-driver-remittance.md) | P09, P13 | `gpt-6-astra` / `xhigh` | [Not started](execution/P16.md) |
| P17 | [Shared brand balance and actual payout](17-brand-wallet-and-payout.md) | P12, P16 | `gpt-6-astra` / `xhigh` | [Not started](execution/P17.md) |
| P18 | [Compensation, liability and replacement shipping](18-incidents-and-replacement-shipping.md) | P07, P08, P09, P13, P14, P15, P17 | `gpt-6-astra` / `xhigh` | [Not started](execution/P18.md) |
| P19 | [Storage periods, partial payments and advance credit](19-storage-subscriptions-and-credit.md) | P04, P09 | `gpt-6-astra` / `xhigh` | [Not started](execution/P19.md) |
| P20 | [Monthly payroll and advance recovery](20-payroll-and-advance-recovery.md) | P08, P09, P13, P18 | `gpt-6-astra` / `xhigh` | [Not started](execution/P20.md) |
| P21 | [Typed adjustments and optional openings](21-adjustments-and-opening-entries.md) | P05, P10, P14, P15, P16, P17, P18, P19, P20 | `gpt-6-astra` / `xhigh` | [Not started](execution/P21.md) |
| P22 | [Cross-system recovery and public conformance](22-integration-recovery-and-conformance.md) | P11, P12, P13, P14, P15, P16, P17, P18, P19, P20, P21 | `gpt-6-astra` / `xhigh` | [Not started](execution/P22.md) |
| P23 | [Selected operational reports and matching exports](23-operational-reports-and-exports.md) | P09, P10, P13, P16, P17, P19, P20, P21, P22 | `gpt-6.1-sol` / `high` | [Not started](execution/P23.md) |
| P24 | [Operating profit and source reconciliation](24-operating-profit-and-reconciliation.md) | P18, P19, P20, P21, P23 | `gpt-6-astra` / `xhigh` | [Not started](execution/P24.md) |
| P25 | [Portable deployment and isolated restore](25-deployment-backup-and-restore.md) | P22, P23, P24 | `gpt-6-astra` / `xhigh` | [Not started](execution/P25.md) |
| P26 | [Complete V1 pilot and evidence handoff](26-complete-pilot-and-handoff.md) | P22, P23, P24, P25 | `gpt-6-astra` / `xhigh` | [Not started](execution/P26.md) |

## Dependency and shared-interface rules

`phase-manifest.json` supplies the same graph in machine-readable form. Numbers provide one valid execution order; independent branches may be developed separately only when shared schema/interface ownership is respected.

- P01 supplies the real transaction helper and UI/test workspace. P02 introduces minimal durable command/audit/identity jobs; P03 extends those same records with shared typed journals, source deduplication, lock order and worker fencing. Do not create two competing command ledgers.
- P03 owns the single wallet/cover/allocation primitive; P04 initializes it per brand. P12 uses cover, P13 posts pending credits/visit facts, P16 releases eligible funds, and P17 provides payout. No second wallet at P17.
- P08 owns effective employee terms/driver association and the period guard. P13 supplies source-deduplicated eligible visits; P18 adds linked incident obligations; P20 completes monthly calculation/recovery/payout.
- P11 establishes real public identity, outbox and signed inbox before P12 dispatch. Basic recovery is required in each dependent phase. P22 proves broader replay/correction/conformance; it is not a deferred generic API implementation phase.
- P09 owns actual account/funds operations. Storage credit remains separate from wallet/account/revenue meaning. Every outward money flow locks the same authoritative account service; filters and UI caches are not safety checks.
- Each module implements its applicable advanced filters and pending/error states when introduced. P23 unifies export/report parity; it must not be the first time ordinary screens gain their requested filters.

## Explicit external dependencies

TAWSEL-CR-001 is the required reason/correction contract extension. TAWSEL-CHECK-003 is the qualified already-accepted/returned shipment changing branch before another customer dispatch. Current source reading does not prove these paths. Their owning phase files identify exact acceptance gates and independent work. The single consolidated [Tawsel change register](../TAWSEL-CHANGE-REQUESTS.md) remains the later Tawsel handoff; an ERP phase cannot modify Tawsel implicitly.

The owner-approved full scope is retained. A required external dependency can make a slice blocked; it cannot be silently deferred out of V1 or counted as passing. P26's full readiness claim requires its required acceptance. No automatic repository monitoring or baseline adoption exists.

## Coverage and evidence

[Requirements and decisions](../REQUIREMENTS-TRACEABILITY.md) map every stable ID to implementation ownership and acceptance. [Phase coverage](PHASE-COVERAGE.md) assigns screens, selected operations/events and cross-domain verification. Superseded/deferred rows remain exclusion checks. [Implementation status](../IMPLEMENTATION-STATUS.md) distinguishes prompt authoring from runtime progress.

Every phase has important Vitest, real PostgreSQL where transactional/durable claims are made, public-service evidence where needed, browser checks and an exact owner manual trial. `docs/verification/Pxx/` contains actual execution evidence. Do not pre-fill passing results or mark a phase complete just because its prompt is written.
