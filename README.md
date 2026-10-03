# Shahn ERP — P01 foundation

This workspace implements **P01 only**: web, API and worker startup, real PostgreSQL migrations and transactions, exact EGP primitives, and the reviewed Arabic RTL shell. Commercial modules, identity, balances, shipment registration and Tawsel integration are not implemented.

Start with [the verified setup, commands and owner trial](docs/verification/P01/README.md). The [version manifest](docs/verification/P01/VERSIONS.md), [execution record](phases/execution/P01.md) and [phase catalog](phases/README.md) distinguish local evidence from future phase acceptance.

The original `ui-preview/` and its captures remain the design reference. The shared presentation source is in `packages/ui/`; white/lime is a reversible default and warm is retained for comparison.
