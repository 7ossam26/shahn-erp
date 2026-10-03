# P02 bounded traceability

Exact requirement rows and AC assertions were read from `REQUIREMENTS-TRACEABILITY.md` before implementation, together with People/authority, identity/session/scope architecture, shared screens and integration sections 2/4. This file records the bounded implementation contribution; it does not rewrite cross-domain requirements as fully executed.

[Source row snapshot](source-rows.json) retains the exact 43 requirement/decision rows, source line numbers and source document hash for the assigned and shared slices. Historical matrix labels are preserved; the evidence below records P02's narrower execution rather than replacing every cross-domain planned/unrun cell.

| Assigned requirement slice | P02 contribution and evidence boundary |
| --- | --- |
| R-003,009,018,019,033 | Configurable screen registry, one role and inherit/allow/deny; server company/branch/state kernel; separate support; real SQL/HTTP denial and revocation tests. Intake's actual command remains P06/P07. |
| R-017 | Separate local development database/issuer configuration and persistent company IDs. Production per-company deployment remains P25. |
| R-020 | Native pending user and recoverable issuer binding; separate server-side OIDC sessions. Employee/driver linking is P08 and Tawsel provisioning is P11. |
| R-046 | Brand portal/account/public signup absent. Staff-facing brand behavior remains P04 and later. |
| R-062 | Consistent screen/navigation registry and stable references. Geographic/tariff data remains P04. |
| R-119,136,144,158,188,196 | Explicit assigned branches, independent company-wide treasury send/receipt, goods source/destination/receipt, and operational-only company tracking policies. Tested before consumers exist; actual expenses/transfers/tracking/correction remain in consuming phases. |
| R-160,161 | Separate MFA support principal and reasoned session, expiry, visible Technical Support audit and true internal identity. Actual financial invariants remain P09 onward. |
| R-177 | Deactivation APIs, stable foreign keys, append-only audit/intent identity, durable bootstrap. No live history purge. Financial history and backup retention remain P03/P25. |

Shared R-004/156 UI requirements apply to the implemented Arabic pages and responsive/keyboard checks. R-214/D-205 applies to evidence and the one-phase stop. Initial prompt references D-150 concern commercial corrections; P02 supplies the state/scope gate only, with no correction workflow.

Decision rows read: D-002,008,011,012,013,015,016,028,032,045,061,113,127,135,149,150,151,152,168,179,187,205. The D-002/008/016/028 human/service distinctions are preserved through no Tawsel calls, no connector credentials in the browser, no driver impersonation and separate issuer jobs. D-045 is an exclusion check. D-149/150 physical/correction semantics await their consuming phases.

Automated evidence is enumerated in the execution record and README. Real Keycloak browser acceptance, bootstrap/security review and customer live-issuer configuration must retain distinct statuses. No test fixture or passing pure policy assertion proves the customer's shared issuer, P11 provisioning or later financial behavior.
