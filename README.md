# Shahn ERP — foundation through company money

This workspace implements P01 foundation, P02 company access/identity, P03 shared transaction kernel, P04 brands/geography/pricing, P05 products/actual stock receipt/monitoring, P06 parcel intake/packing, P07 stored-stock fulfillment, P08 employee profiles/effective terms and P09 accounts/paid expenses/general money movements. Employee setup keeps salary and commission independent, preserves history and supplies exact formula/identity/payroll-guard interfaces. Tawsel mapping, actual delivery visits, returns/transfers, remittance/payouts, storage billing and payroll remain owned by later phases.

Start with the [P09 verification and isolated trial](docs/verification/P09/README.md), [account/funds consumer interfaces](docs/verification/P09/HANDOFF.md), [P08 verification and isolated trial](docs/verification/P08/README.md), [employee consumer interfaces](docs/verification/P08/HANDOFF.md), [P07 fulfillment trial](docs/verification/P07/README.md), [P06 parcel trial](docs/verification/P06/README.md), [P05 stock trial](docs/verification/P05/README.md), [pricing consumer interface](docs/verification/P04/HANDOFF.md), [kernel interfaces](docs/verification/P03/HANDOFF.md), or [P02 access setup](docs/verification/P02/README.md).

Start with [the verified setup, commands and owner trial](docs/verification/P01/README.md). The [version manifest](docs/verification/P01/VERSIONS.md), [execution record](phases/execution/P01.md) and [phase catalog](phases/README.md) distinguish local evidence from future phase acceptance.

The original `ui-preview/` and its captures remain the design reference. The shared presentation source is in `packages/ui/`; white/lime is a reversible default and warm is retained for comparison.
