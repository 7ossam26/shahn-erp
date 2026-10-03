# Shahn ERP — foundation, access, brands and pricing

This workspace implements P01 foundation, P02 company access/identity, P03 shared transaction kernel and P04 brands/geography/pricing. P04 adds company brands, reference/tariff history, storage configuration and immutable pricing snapshots through P03's atomic commands and shared wallet primitive. Real payment, stock, shipment, storage billing, payroll and Tawsel workflows belong to later phases.

Start with the [P04 verification and isolated trial](docs/verification/P04/README.md), [pricing consumer interface](docs/verification/P04/HANDOFF.md), [kernel interfaces](docs/verification/P03/HANDOFF.md), or [P02 access setup](docs/verification/P02/README.md).

Start with [the verified setup, commands and owner trial](docs/verification/P01/README.md). The [version manifest](docs/verification/P01/VERSIONS.md), [execution record](phases/execution/P01.md) and [phase catalog](phases/README.md) distinguish local evidence from future phase acceptance.

The original `ui-preview/` and its captures remain the design reference. The shared presentation source is in `packages/ui/`; white/lime is a reversible default and warm is retained for comparison.
