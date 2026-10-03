# Shahn ERP — foundation, access and transaction kernel

This workspace implements P01 foundation, P02 company access/identity, and the P03 shared transaction kernel. P03 adds atomic commands, retained recovery, typed journals, wallet/cover primitives and durable worker fencing. Real commercial payment, shipment, payroll and Tawsel workflows belong to later phases.

Start with the [P03 verification and isolated trial](docs/verification/P03/README.md), [consumer interfaces](docs/verification/P03/HANDOFF.md), or [P02 access setup](docs/verification/P02/README.md).

Start with [the verified setup, commands and owner trial](docs/verification/P01/README.md). The [version manifest](docs/verification/P01/VERSIONS.md), [execution record](phases/execution/P01.md) and [phase catalog](phases/README.md) distinguish local evidence from future phase acceptance.

The original `ui-preview/` and its captures remain the design reference. The shared presentation source is in `packages/ui/`; white/lime is a reversible default and warm is retained for comparison.
