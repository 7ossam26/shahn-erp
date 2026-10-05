# P02 — Company access, shared identity and scoped administration

**Git workflow (owner instruction, 2026-10-05):** Execute P02 directly on `main` in the existing checkout; do not create a branch or worktree. Follow [the shared Git workflow](EXECUTION-CONTRACT.md#git-workflow-main-phase-commit-and-push). After implementation, evidence and all required checks/acceptance gates pass, commit only this phase's changes with `phase 2: <summary>`, then run `git push origin main` without asking again. Required failed, skipped, unavailable or blocked gates prevent the completion commit/push; preserve the work and report the blocker. Report the actual commit hash and push result, then stop after this phase.

## Result and scope

Implement this phase only. Company staff can sign in, see their granted module cards, and use real user/role/branch administration. Developer support has a separately attributable support session. Prove authorization at the server, including changes made while another session is open. This phase supplies identity and scope to every later operation; it does not add shipment or financial workflows.

Model: `gpt-6-astra`, `xhigh`, verified2026-10-03; identity boundaries, recoverable issuer provisioning and cross-branch exceptions require careful multi-step reasoning. Select it manually using [model guidance](MODEL-GUIDANCE.md).

Cover ERP-D-013/015/032/061/127/135/150/151/152/179/187/205 and corresponding ERP-R/AC cases in [traceability](../REQUIREMENTS-TRACEABILITY.md), including ERP-R-003/004/009/018/019/020/033/156/158/160/161/188/196/214 where applicable. Read each exact source row before implementation; financial/transfer use of these scopes is verified in its consuming phase. Screens: UI-AUTH-001, UI-HOME-001, UI-ACCESS-001, UI-ROLES-001 and UI-SUPPORT-001.

## Read and prerequisites

Read [execution contract](EXECUTION-CONTRACT.md), master plan People/authority, [architecture](../docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md) Identity and sessions/Scope exceptions, [screens](../docs/planning/ERP-SCREEN-SPEC.md) catalog/shared interaction, and [integration plan](../ERP-TAWSEL-INTEGRATION-PLAN.md) sections2/4 for human/service separation. Inspect P01 evidence and run its startup/typecheck/database checks. Confirm actual shared OIDC issuer configuration; use the selected Keycloak reference in an isolated development deployment if no configured issuer exists. A test issuer is not proof that the customer's live issuer is configured.

P01 must supply the transaction helper, migrations, real database tests and UI primitives. There is no P03 dependency: this phase introduces the initial native command/audit/identity-work records it needs; P03 extends and hardens those same records for all modules. Do not create throwaway in-memory identity mutations because generic financial infrastructure comes later.

## Exact authority and data

Create company, branch, ordinary user, role, screen-capability registry, role grants, per-user inherit/allow/deny exceptions, assigned branches, issuer-subject binding, server session, support session and audit records. All identities are stable and same-company relationships enforced. Company/branch creation is developer support scope as approved; ordinary company admin manages its people and settings without seeing or granting the support account. Deactivate referenced identities; preserve histories. Human role names are configurable, not hardcoded job titles.

Compute authority on every request: company/user active, authenticated issuer/subject, one role plus explicit user exception, requested screen capability, that screen's data scope, and business-state rule. Deny overrides inherited allow; an allow exception does not grant another company or bypass state. Screen access grants its operations inside this boundary; no per-button permission editor is added. Persist an authorization revision and invalidate/refetch stale grants. Query totals, exports, command-result recovery and direct URLs require authorization too.

Use explicit scope policies, with unit and server-negative tests now even before their domain screens exist: ordinary intake/inventory/expenses and goods-transfer source/receipt use assigned branches; a sole assignment is fixed and multiple assignments permit a choice. Goods destination may be another active company branch. Treasury transfer creation and receipt have separate company-wide screen grants. Shipment tracking is company-wide operational read; it does not grant money, employee details, exports or writes. Brand payout sees the shared accessible brand wallet while account funding checks remain separate. No policy derives physical driver presence from branch membership.

OIDC authorization code with PKCE/state/nonce, validated issuer/audience/subject and server-side tokens is mandatory. Browser receives only Secure/HttpOnly/SameSite session cookie; state-changing requests require CSRF protection. Use TLS outside loopback development. Defaults adopted in PLAN-001:30-minute idle,12-hour absolute ERP session; explicit global identity signout separate from ERP logout. Do not send a human password through Tawsel or use the connector's credential for a human screen.

Support uses a separate principal, MFA and an explicit company session with reason and maximum one hour. Show Technical Support in the business audit with retained real internal principal/session identity. Never impersonate an ordinary user. Its account is omitted from normal employee management, but its actions are not hidden. Initial support bootstrap must use a documented one-time operator procedure without a committed default password or public signup. Store bootstrap completion durably and disable the setup endpoint afterward.

## Recoverable administration and UI

Implement mutations under `/api/v1/access/` with closed schemas, `commandId`, `expectedVersion` on edits, company scope and typed errors. User creation commits native pending user, command identity, audit and durable issuer job together. Worker creates/binds the subject idempotently using an explicit external correlation identity and reconciles a lost result before retry. Issuer success with failed local response must not create another subject. Jobs never expose issuer-admin secrets to the browser. Changes/deactivation have visible pending/failed/ready state. Tawsel provisioning itself belongs to P11 and must not be marked complete here.

Initial reusable records are `command_record`, `audit_entry` and `work_item` with company/principal scope, immutable payload identity, result/job state and unique identity constraints. Document their exact schema and API so P03 extends them rather than creating another command ledger. External calls happen after the transaction, with lease/retry state. A source operation's timeout is unknown, not a new request. No external call belongs inside a held database transaction.

Build focused Arabic forms using the approved shell: company login, ordinary users list/detail, role screen-grant editor, assignment control and separate support entry. Display only granted implemented module cards; future modules remain absent or explicitly unavailable, never working-looking dummy actions. Keep form data in memory when reauthentication is needed. Do not reveal whether an arbitrary public company code/user exists through different unauthenticated responses.

## Ordered checkpoints

1. **Schema and scope kernel.** Migrate stable identities, grants, sessions and initial durable admin records. Verify same-company constraints and permission truth table using Vitest and real API/database negative tests.
2. **OIDC sessions.** Implement actual issuer flow, callback validation, CSRF and logout. Test mismatched issuer/audience/state/nonce, expired session and replayed callback. Continue only with an actual development issuer path, while naming any live-issuer dependency separately.
3. **Recoverable user provisioning.** Implement durable issuer jobs, explicit pending UI and idempotent correlation. Interrupt after remote creation but before local acknowledgement; restart and prove one linked subject and one native user. Record the actual interruption technique.
4. **Administrative screens and revocation.** Implement roles/user exceptions/branch assignment and support session. Open two sessions, revoke a grant and confirm the old session's next direct request is rejected. Preserve input and explain state change.
5. **Evidence.** Register P02 tests, exercise desktop/mobile/keyboard paths and document bootstrap/recovery. Never store secrets in screenshots/logs.

## Required acceptance and rejection

Given branches A/B and users assigned A, B and A+B, policy queries return the proper ordinary scope. A tampered ordinary request for B by A-only user fails; authorized company-wide tracking can read B operationally but cannot read B payroll or mutate its shipment. Treasury receipt permission is independent from transfer creation.

An inherited grant, user deny and explicit user allow produce their specified results without crossing company. Revocation/deactivation takes effect on the next server operation, including recovered command results and file-download authorization. Cross-company IDs, forged company headers and support-role self-grant fail atomically with no partial administration.

An issuer timeout after successful creation remains pending; retry reconciles the same correlation, never duplicates identity. A definite invalid request remains rejected until a corrected new intent is reviewed. Support expiry or missing MFA prevents a new support action; completed audit remains attributed to its real actor. No hidden business mutation may bypass normal money/state rules in later consumers.

Meaningful Vitest covers full grant+scope computation and provisioning state transitions; PostgreSQL tests cover duplicate/stale admin commands and persisted pending work; browser tests use real local OIDC and API for login, role change and support expiry. Mocks of OIDC alone are insufficient for the actual login claim.

## Owner manual trial and deliverables

Seed two branches, an admin and three scoped users through the isolated setup. Log in as A-only staff: see assigned context and granted cards. As admin, deny one screen and add branch B; return to the old staff session and verify denial and updated choices after refetch. Try an unauthorized direct URL and show a clear denial. Create a pending user while issuer is unavailable, restore issuer and observe a single ready user. Start a support company session and verify its visible audit identity; expire it and reject another mutation.

Deliver `apps/api/src/modules/access`, identity adapter/worker, contracts, additive migrations, SQL repositories, access web features and tests. Record actual configuration requirements and admin-job reconciliation in `docs/verification/P02/README.md`; update [execution record](execution/P02.md), catalog, implementation status and exact handoff interfaces. If real issuer or bootstrap security checks are missing, leave their acceptance pending.

Stop after P02. Do not start P03, change Tawsel, deploy production, purchase, pay or merge.

## Complete traceability assignment for this phase

The matrix assigns the following implementation/consuming/exclusion slices to this phase. Read their exact acceptance assertions in [REQUIREMENTS-TRACEABILITY.md](../REQUIREMENTS-TRACEABILITY.md); the rules and checkpoints above define this phase's bounded contribution. A cross-domain requirement is complete only after all its required slices are verified. Superseded/deferred rows are replacement/exclusion checks, not authorization to build the old feature. Shared UI, scope, testing and documentation obligations apply through EXECUTION-CONTRACT.md in every phase.

Requirements: `ERP-R-003`, `ERP-R-009`, `ERP-R-017`, `ERP-R-018`, `ERP-R-019`, `ERP-R-020`, `ERP-R-033`, `ERP-R-046`, `ERP-R-062`, `ERP-R-119`, `ERP-R-136`, `ERP-R-144`, `ERP-R-158`, `ERP-R-160`, `ERP-R-161`, `ERP-R-177`, `ERP-R-188`, `ERP-R-196`.

Decisions: `ERP-D-002`, `ERP-D-008`, `ERP-D-011`, `ERP-D-012`, `ERP-D-013`, `ERP-D-015`, `ERP-D-016`, `ERP-D-028`, `ERP-D-032`, `ERP-D-045`, `ERP-D-061`, `ERP-D-113`, `ERP-D-127`, `ERP-D-135`, `ERP-D-149`, `ERP-D-151`, `ERP-D-152`, `ERP-D-168`, `ERP-D-179`, `ERP-D-187`.

This index does not expand the single-phase stop boundary or claim executed acceptance.
