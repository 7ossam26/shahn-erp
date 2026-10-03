# Tawsel integration context for a new shipping ERP

The planning task starts with Tawsel as an existing completed system. Discover and plan the separate commercial ERP against its documented public boundary. Completion does not imply that every imaginable API, permission, currency or workflow is supported; exact supported behavior comes from the supplied contracts.

## Attachments and reading order

| Attachment | Purpose |
| --- | --- |
| 01-TAWSEL-CURRENT-BASELINE.md | System boundary, source authority and package use |
| 02-BUSINESS-BOUNDARY-AND-MAPPING.md | Ownership, identities, states, quantities and business invariants |
| 03-CONNECTOR-AND-RECOVERY.md | Authentication, commands/events, durable delivery and recovery |
| 04-CANONICAL-HTTP.md | Endpoint/authentication/host index, exact OpenAPI and operation catalog |
| 05-CANONICAL-SCHEMAS.md | Complete original JSON Schema files, individually identified and hashed |
| 06-CANONICAL-EXAMPLES.md | Complete acceptance/rejection fixtures and public signature vector |
| 07-ERP-DISCOVERY-AND-CHANGE-CONTROL.md | ERP-specific discovery, outputs and controlled future contract updates |

Read 01, 02, 03 and 07 fully before detailed discovery. The larger 04–06 attachments are indexed technical references: inspect relevant sections and all referenced definitions before deciding exact behavior. Before finalizing the integration plan, account for every selected operation/event and its errors. If content is inaccessible, identify the missing section. Do not claim full reading from snippets.

The canonical attachments identify the source commit and SHA-256 of each embedded original. Resolve relative `$ref` values against the **original path printed above the block**, then locate that path's block in 05. The `schemas.tawsel.invalid` URLs are schema identifiers, not network services. Markdown attachments are readable references, not executable SDK files. The local package archive retains raw canonical paths for machine use.

## Systems and responsibilities

Tawsel is an Arabic RTL delivery PWA serving company drivers (B2B) and independent personal drivers (B2C). Its private Engine uses Nominatim/OSRM/VROOM. The real shipping ERP is a separate business system. Connect through public Tawsel HTTP and signed events; do not share its tables or depend on private frontend functions or direct Engine access.

The ERP owns commercial orders/customers, source prices/fees and exact prepaid allocation, its native staff/branch administration and authorization, actual branch receipt/disposition assertions, and inventory/accounting/settlement policies agreed during ERP discovery. Tawsel owns accepted delivery snapshots, execution identities, workdays/rounds/attempts, route forecasts, driver outcomes and reported collection. Each system keeps its own durable records and audit.

The boundary is ERP-agnostic. A connector can be implemented by the ERP owner, vendor or integration team using supported public mechanisms. It does not require source-code/database access to a vendor ERP and does not promise universal vendor compatibility. Here, the owner is planning a new ERP, so its actual data model and workflows must be discovered rather than copied from the mock reference.

## Integration capabilities to account for

| Area | Role in ERP planning |
| --- | --- |
| Identity/provisioning | Scoped service credentials; branches, roles, users, driver references and issuer readiness; independent human sessions |
| Intake/planning boundary | Explicit B2B snapshots, preparation, received assignment, atomic admission, location readiness and protected departure |
| Delivery facts | Current/arrival, whole/partial outcomes, exact collection, defer/retry/urgency, closure and bounded corrections |
| Branch custody | Offers, actual subset receipt, loss/damage, branch interruption/resume and receipt-funded new dispatch cycles |
| Monitoring | Authorized source-filtered progress and immutable/effective histories |
| Delivery/recovery | Source outbox, signed sender, durable receiver inbox, atomic projection, replay/reconciliation and applied checkpoints |
| Reporting inputs | Distinct shipment/attempt/piece counts, effective corrections, forecast identity and genuine observed/unknown times |

The complete catalog also covers local UI actions, human-session endpoints and reference-consumer endpoints. It is not the ERP source-service allowlist. Consult the generated host/authentication index in 04. In particular, service credentials do not impersonate drivers or access human reports by virtue of an endpoint existing.

## How to interpret the reference and contracts

The mock ERP demonstrates the public boundary with separate storage, native source command persistence, receiver application and recovery. Its private test-only deployment, one-line form and fixed test administrators are not production ERP requirements. The new ERP implements its own secure roles, data model, native UX, scaling and operations while preserving public behavior.

Examples establish schema cases; they do not independently grant authority or establish runtime availability. Broader foundational schemas can permit shapes that a particular feature rejects. Always use the operation-specific closed schema and sender-event allowlist. Catalog names or old descriptions do not authorize extra operations.

Do not confuse received commands/events with accepted business state, actual branch receipt with a return offer, or reported cash with ERP settlement. These distinctions apply even when the user-facing UI presents a simple summary. Detail and recovery evidence must remain available.

Current contract constraints such as supported currency/whole quantities, source scoping, departure locks, actor separation, bounded replay and callback requirements belong in the ERP integration plan. A new ERP requirement outside that boundary needs an explicit compatibility decision; it is not an excuse to assume a new Tawsel API.

## Authority and future maintenance

Exact field names/types/constraints are supplied in 04–06. Business interpretation is in 02–03. New ERP decisions belong in its own decision log. If attachments disagree materially, identify the operation/field and request clarification; do not silently change a contract or restart a historical Tawsel implementation plan.

Retain this package as a versioned baseline in the ERP project. Envelope version 1.0.0 or client package version alone may not identify all compatible behavior: preserve source commit and file digests. 07 describes how a later Tawsel update becomes a specific ERP plan/code change. There is no automatic synchronization between independent chats.

The user's ERP brain dump and answers determine commercial scope. Exclusions from Tawsel, such as ownership of accounting or settlement, are not bans on building them in the ERP. Any supplied screens guide visual layout; approved ERP journeys and decisions determine actions and behavior.
