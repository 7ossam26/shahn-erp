# ERP technical options

Research date: 2026-10-02. Updated for discovery session 015. Status: stack direction approved under ERP-D-158; detailed architecture, versions, tooling and backup targets remain under design/review. This document is not an implementation plan or a version lock. This update adds owner decisions without new web research.

## Owner inputs

- The owner approved React/TypeScript/Vite, shadcn/ui with selected Smooth UI, Node.js with NestJS/Fastify and PostgreSQL, using a modular ERP backend and a worker from the same codebase (ERP-D-158; ERP-R-167). UX and performance remain priorities.
- Every implementation phase must include Vitest coverage for its important operations (ERP-D-159; ERP-R-168). Real database verification, browser journeys and clear manual acceptance remain required where relevant.
- The ERP serves Egypt and uses EGP. Office staff use computers; receiving/distribution staff also use phones. The web application must support both.
- The provisional pilot estimate is three branches, ten drivers, about 150 shipments per day, and about ten or slightly more simultaneous ERP users. These are estimates, not measured workloads.
- The owner already has Hostinger KVM 2 with Dokploy. Initial colocation with Tawsel is likely, but moving the ERP to another server must not require changing its business architecture.
- The owner wants cost estimates without setting a budget ceiling. No service purchase is authorized by this note.
- The ERP is online-only. ACID behavior is required. The owner has not selected numerical disaster-recovery targets; mentioning backups does not establish a recovery-time or data-loss guarantee.

## Approved stack and remaining implementation details

| Area | Approved direction / remaining detail | Reason for this ERP |
| --- | --- | --- |
| Web UI | React, TypeScript and Vite; a client router and a query/cache library selected during detailed design | The application is authenticated operational software. Static frontend delivery and a clear API boundary fit the current deployment and Tawsel integration. |
| UI components | shadcn/ui for forms, dialogs and tables; selected Smooth UI interactions; shared design tokens | Supports the owner's visual direction while keeping repetitive entry, stock and money screens focused. |
| Backend | Node.js with NestJS and its Fastify adapter | Module organization, dependency injection, authorization boundaries and transaction services are useful across finance, inventory, HR and integration. |
| Database | PostgreSQL; select a supported major and data-access/migration tooling during detailed design | Relational constraints and explicit transaction boundaries fit money, stock reservation, journals, source outbox and receiver inbox. |
| Application structure | One modular ERP backend and one ERP database; a worker from the same codebase for durable integration/background work | The estimated load does not establish a need for microservices. Modules remain business boundaries; workers do not create another source of financial truth. |
| Deployment | Portable Dokploy/container deployment remains required; the exact layout, resource limits and recovery configuration below remain proposals | Supports Dokploy now and another host later, with separately owned ERP data and credentials. |

The owner approved the stack direction, not a benchmark result or the complete architecture. Framework choice alone will not guarantee fast screens. Plan server-side pagination/filtering, suitable indexes, bounded reports, lazy-loaded routes, predictable pending/error states and mobile browser checks. Keep money and stock success states tied to server confirmation. Do not add an offline mutation queue. Router/query libraries, ORM or other data-access tooling, migration conventions and exact compatible versions remain design choices.

### Vite versus Next.js

Vite has an official React/TypeScript path and produces frontend assets for production. Next.js also supports SPAs, route prefetching and progressive server features; it is a valid alternative. Prefer Vite here because the ERP already needs a durable backend/worker boundary and its first release has no agreed public SEO or server-rendering requirement. This is a scope and operational simplicity judgment, not a claim that Next.js is slow or incompatible. [Vite guide](https://vite.dev/guide/), [Vite production build](https://vite.dev/guide/build), [Next.js SPA guide](https://nextjs.org/docs/app/guides/single-page-applications).

### NestJS versus direct Fastify

Direct Fastify is viable and gives fewer framework conventions. It would require the project to define module composition, authorization wiring, validation and testing conventions itself. Prefer NestJS for a long-lived ERP implemented in separate Codex stages. Nest officially supports Fastify through `FastifyAdapter`; Express-specific plugins and recipes must be replaced by Fastify-compatible equivalents. Do not convert framework HTTP benchmarks into an ERP performance promise. [Nest Fastify adapter](https://docs.nestjs.com/techniques/performance).

### Compatibility checked, versions not frozen

- Node.js 24 is Active LTS on the research date. Node.js 26 is Current, with LTS scheduled for 2026-10-28. Use a maintained LTS release when implementation begins and recheck then. [Official release schedule](https://github.com/nodejs/Release).
- The current Nest migration guide describes version 12, ESM packages and Vitest as the default for generated ESM projects. CLI prerequisites are stricter than runtime prerequisites; a current Node 24 patch satisfies the published line requirement. Do not assume an old Nest 11 starter without checking the chosen versions. [Nest migration guide](https://docs.nestjs.com/migration-guide).
- Smooth UI's Vite guide lists React 19+, Tailwind CSS 4+ and Motion 12+. shadcn/ui has its own Vite installation guide. Review the selected component dependencies, token names, RTL behavior, keyboard focus and reduced-motion behavior before adoption. The complete Smooth UI component catalog was not audited. [Smooth UI reference, selected installation/Vite/compatibility sections](https://smoothui.dev/llms-full.txt), [shadcn/ui Vite guide](https://ui.shadcn.com/docs/installation/vite).
- PostgreSQL's supported-major policy provides five years of support for a major release. Choose and pin an image major and tested patch during implementation; the owner's installed database version is unknown. [PostgreSQL version policy](https://www.postgresql.org/support/versioning/).

## ACID and integration implications

PostgreSQL transactions provide all-or-nothing changes. The application must still put every related financial/stock/journal/outbox write in the right transaction and enforce database constraints. Concurrent stock reservation, payout and full driver-remittance confirmation need deliberate locking or conditional updates and retry handling. The default isolation level does not automatically make every business read-then-write sequence safe. Verify these claims against a real database using competing requests, rollback and process-restart cases. [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html), [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

An ERP database transaction does not include a remote Tawsel HTTP call. Commit the ERP business change and source outbox together, then deliver idempotently. Persist incoming events before applying projections, with deduplication and replay/reconciliation. A browser timeout after server commit must lead to status lookup or an idempotent retry, not an assumed failure. These remain subject to the exact Tawsel contracts and later integration mapping.

ERP-D-159 requires each implementation phase to identify and test its important connected behaviors with Vitest. ACID, concurrency and durable recovery claims require real isolated PostgreSQL tests; mocks alone cannot establish them. Browser checks and an owner-executable manual journey remain part of acceptance for relevant user flows. No phase files or implementation tests have been produced or run during this discovery update.

## Portable Dokploy deployment

Proposed layout: frontend assets, ERP API, ERP worker and PostgreSQL, with independent configuration, credentials and persistent storage. Use Tawsel's documented network endpoints whether colocated or remote. Do not share Tawsel's database, filesystem or internal Engine access.

Moving hosts should require deployment configuration, secret provisioning, database restore/migration, endpoint configuration and DNS changes; it should not rewrite ERP business modules. Verify this in a clean-host restore rehearsal. Resource limits, database connection limits and backup scheduling must account for Tawsel's routing workload when colocated. No existing server metrics or capacity tests were inspected.

## Indicative costs

USD figures observed on 2026-10-02; they are not the owner's bill or an Egyptian checkout quote. Taxes, promotions, payment currency and future renewals can differ.

| Item | Published or calculated indication | Qualification |
| --- | --- | --- |
| Existing KVM 2 | Published specification: 2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB bandwidth | Remaining resources after Tawsel/Dokploy are unmeasured. Colocation adds no second VPS subscription if the existing capacity suffices. |
| Additional KVM 2 if separated | Advertised USD 8.99/month equivalent; renewal USD 14.99/month for two years | Hostinger says plans are paid upfront. The fetched page did not expose the initial promotional term, so no initial upfront total is asserted. The two-year renewal equivalent is USD 359.76 before applicable taxes. |
| Offsite R2 Standard backup storage | First 10 GB-month free; then USD 0.015/GB-month | At 100 GB-month total, storage alone is approximately USD 1.35/month; at 500 GB-month, USD 7.35/month. Usage means retained copies/WAL, not just current database size. |
| R2 operations | 1 million Class A and 10 million Class B requests/month included; paid rates USD 4.50/million and USD 0.36/million | Direct R2 egress is free. Other connected services can charge separately. |
| Domain and optional third-party services | Not priced yet | Existing domain ownership and exact selected services are unconfirmed. No paid maps, messaging, payment gateway or monitoring vendor is implicitly selected. |

Primary pricing sources: [Hostinger VPS](https://www.hostinger.com/vps-hosting), [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/). Arithmetic above is illustrative. There is no exchange-rate conversion or purchase recommendation based on an assumed Egyptian tax treatment.

## Backup proposal and its limits

### What the documented Dokploy features cover

- Database backups can be scheduled to an S3 destination. Its PostgreSQL restore documentation shows `pg_dump` in custom format as the default backup command. This is a logical database snapshot; a completed backup job is not evidence that a restore succeeded. [Database backup](https://docs.dokploy.com/docs/core/databases/backups), [database restore](https://docs.dokploy.com/docs/core/databases/restore).
- The separate Dokploy system backup includes `dokploy-postgres` and `/etc/dokploy`. Do not assume it includes every deployed application's database. [Dokploy system backup](https://docs.dokploy.com/docs/core/backups).
- Volume backups support Docker named volumes, not bind mounts. Copying a live database volume while writes continue is not a substitute for a database-consistent backup. [Dokploy volume backups](https://docs.dokploy.com/docs/core/volume-backups).
- `pg_dump` represents a consistent snapshot from the start of the dump. Recovering later transactions requires a different strategy. PostgreSQL point-in-time recovery uses a physical base backup plus an unbroken WAL archive; configuration files require their own backup. Archive lag and failures must be monitored. [SQL dump](https://www.postgresql.org/docs/current/backup-dump.html), [PostgreSQL PITR](https://www.postgresql.org/docs/current/continuous-archiving.html).

### Proposed production default, pending acceptance and a restore trial

ERP-D-158 approves the stack only. It does not approve the numerical targets, retention window, backup tool or vendor below. ERP-D-157 still leaves recovery-time and acceptable-data-loss targets unspecified for later plan review.

1. Keep encrypted backups outside the VPS, with separately stored recovery credentials.
2. Prefer weekly full physical backups, daily differential backups and continuous WAL archival, with an initial 30-day recovery window. A tool such as pgBackRest supports retention, client-side repository encryption, S3-compatible repositories and PITR; its selected sections were reviewed, but no Dokploy/container/R2 setup was tested. [pgBackRest guide](https://pgbackrest.org/user-guide.html).
3. Use an initial WAL archival freshness target of five minutes, with alerts for stale archives, failed backups and disk growth. This is a proposed monitored target, not a zero-loss guarantee or an owner-approved RPO. Tune it after observing the pilot workload.
4. Back up deployment configuration, required database roles and secrets separately. Preserve the ERP's inbox, outbox, financial movements and audit history inside its database backup.
5. Restore into an isolated environment before launch and monthly afterward. Check logins, balances, stock, outstanding driver remittances and integration cursors. Keep outward Tawsel delivery disabled during restore verification; reconcile before resuming it so a restored queue does not create duplicate business effects.
6. Record the measured restore duration and most recent recoverable transaction. The owner has not agreed to a numerical maximum outage; do not promise one before this rehearsal.

A simpler scheduled-dump-only setup is possible, but its recovery point is the last successful dump's snapshot. It should be presented with that concrete limitation rather than called equivalent to continuous recovery. Hostinger weekly server backups are an additional layer, not sufficient evidence that ERP transactional recovery has been designed or tested.

## Evidence and remaining checks

Only primary public documentation was used. Pages and sections named above were inspected for the stated claims. The Smooth UI and pgBackRest full references were searched and relevant sections read; their entire catalogs/guides were not reviewed. No server login, installed-version inventory, package installation, performance benchmark, deployment, backup execution or restore test occurred.

Before architecture approval: complete the recovery proposal and review its limits; choose compatible versions and data-access/migration tooling; finish Tawsel operation coverage; identify optional address/map services; specify authentication and session behavior; and plan measurable mobile, transaction, concurrency and restore acceptance checks. The stack direction is already approved and does not need another selection question. No additional business scope follows automatically from these technical options. ERP-D-169 requires coverage of all agreed V1 services and journeys, regardless of the first customer's unknown service mix.
