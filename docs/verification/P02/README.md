# P02 company access and shared identity

Date: 2026-10-03, Africa/Cairo. Scope: native identity, screen/branch authorization, ordinary administration, separate support, real local OIDC and recoverable issuer work. See [handoff interfaces](HANDOFF.md), [bounded traceability](TRACEABILITY.md) and [execution record](../../../phases/execution/P02.md).

Verified within this isolated development scope: 37 unit, 26 PostgreSQL/HTTP and 10 actual-Keycloak browser cases across the documented runs. [Full phase run](53-phase-verified.txt), [support/ordinary reauthentication](59-support-reauth.txt), [post-synchronization issuer login](68-real-profile-preservation.txt) and [persistent owner-setup smoke](70-owner-setup-smoke.json) are separate evidence. The owner trial remains unreviewed.

The customer's live/shared OIDC issuer is **not configured or verified**. No issuer variables or running issuer were present initially. P02 uses an isolated Keycloak reference. Its successful login does not prove the customer's live issuer, a Tawsel client or P11 provisioning. Production rollout, financial/shipment workflows and P03 remain outside this phase.

## Local setup

Use P01's pinned Node 24.21.0/npm 12.2.0 and Docker Linux engine:

```powershell
. ./scripts/use-pinned-runtime.ps1
npm ci
npm run p02:setup
npm run dev:p02
```

`p02:setup` creates only the named P02 development containers, database and volumes. It refuses production, preserves an existing `.env.p02.local`, refuses unexplained container-name collisions, migrates the isolated database and provisions a random-secret development realm. It seeds two branches, an administrator and A/B/A+B users via the native command repository and real issuer worker. Support bootstrap completion is durable. No default password is committed or printed. Secrets are in ignored `.env.p02.local` and `.tools/p02/owner-credentials.json`; protect these files as local credentials and never attach them to evidence or source control. The partial-setup recovery file is also ignored. An interrupted setup preserves its containers/database for operator recovery rather than resetting them.

| Component | Local address / identity |
| --- | --- |
| Web | `http://127.0.0.1:5293` |
| API | `http://127.0.0.1:4293` |
| Keycloak | `http://127.0.0.1:18981`, realm `p02` |
| PostgreSQL | Loopback 15419, database `shahn_p02_dev`, container `shahn-p02-dev-db` |
| Issuer container | `shahn-p02-dev-issuer`, development H2 storage in a dedicated volume; not a production database design |

Use `npm run p02:up` after stopping the two owned containers. Run `npm run dev:p02` to start API, identity worker and web. Company code is `trial`; enter `admin`, `staff-a`, `staff-b` or `staff-ab` in ERP. The issuer uses `trial.admin`, etc., and ERP supplies that hint. The separate support entry uses `support`. Read that user's random password and Base32 OTP enrollment secret privately from the ignored credentials file; add the secret to an authenticator using SHA-1, six digits, 30-second period. Do not copy passwords or OTP secrets into screenshots, logs or chat. The dev realm requires OTP for all sample users, and rejects code reuse.

The trial staff role deliberately includes the implemented role-administration screen so the P02 pilot has a real granted card before operating modules exist. This is a fixture grant, not a job-title rule or a recommended production employee role. Remove it for an ordinary operational-only role. Future capability entries are marked unavailable and never appear as working home cards.

## Actual issuer configuration

Required server variables are `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ADMIN_CLIENT_ID`, `OIDC_ADMIN_CLIENT_SECRET`, `SESSION_ENCRYPTION_KEY` and `APP_ORIGIN`, in addition to P01 database/runtime configuration. `SESSION_ENCRYPTION_KEY` is 64 lowercase hex characters representing 32 random bytes. Back it up with protected configuration; rotating it without migration requires reauthentication. TLS is required for issuer/app origins outside loopback development, and always in production.

The reference is Keycloak **26.8.0**, image digest `sha256:b0f60d489d51c5d113390bdf5461d4c06e6051be026c05549f2e1e10ec352bcc`; OIDC uses pinned `openid-client` **6.8.8** with ID-token signature verification enabled. `jose` **6.2.12** supplies the malicious-token validation test fixture. Existing dependencies were not broadly upgraded.

Register a confidential ERP client with exact callback `${APP_ORIGIN}/api/v1/access/callback`, authorization-code flow, PKCE S256, no direct password grant, no public signup and an explicit logout redirect `${APP_ORIGIN}/login`. Use a separate issuer administrative service client restricted to the intended realm's user management/query operations. These are issuer credentials, never Tawsel source credentials. The adapter's native login convention is `companyCode.username`; its admin-only attributes `erpCorrelationId` and `erpCompanyId` must remain searchable and uneditable by users.

Support admission requires a signed MFA assurance (`amr` includes `otp`, or an issuer-assured ACR 2). In the isolated reference, the only ERP login flow has REQUIRED password and REQUIRED OTP, with no cookie/password-grant alternative; its server-owned mapper attests that completed flow. Do not copy that mapper onto a weaker flow. The customer's security owner must verify the actual MFA assurance semantics before live acceptance. ERP idle/absolute limits are 30 minutes/12 hours. Beginning a support session requires authentication within five minutes; its explicit reasoned company session lasts at most one hour. Ordinary requests do not prolong its fixed expiry.

## One-time operator bootstrap

There is **no setup HTTP endpoint**, before or after completion. On a fresh deployment, an authorized issuer operator creates a separate enabled support subject, enrolls MFA and configures the mandatory MFA assurance flow. Then, from the trusted server/migration environment:

```powershell
# Set the verified, non-secret subject UUID in this operator shell.
$env:BOOTSTRAP_SUPPORT_SUBJECT = '<verified issuer subject>'
npm run access:bootstrap
Remove-Item Env:BOOTSTRAP_SUPPORT_SUBJECT
```

The command checks the actual issuer subject is enabled and has enrolled MFA, then binds it under an advisory database lock and writes `access.bootstrap_completion` atomically. Repeating it fails with `BOOTSTRAP_ALREADY_COMPLETED`; completion cannot be updated/deleted through runtime SQL. No password is accepted by the ERP bootstrap command. Recovery of a locked-out support user belongs to the authorized issuer operator, preserving its stable subject; it does not reactivate public setup or create an ordinary employee impersonation. The isolated `p02:setup` performs this trusted local procedure automatically using newly created random development credentials.

## Owner trial

1. Start the isolated setup and log in as `staff-a`. Complete real issuer password/OTP. Expect the fixed **الفرع أ** context and the granted role-administration card. Future operating modules remain absent.
2. In a separate browser profile log in as `admin`. Open users, select `staff-a`, set **المخزون** and **الأدوار والصلاحيات** to explicit deny, and assign branch B as well as A. Review and save. Observe pending identity state, then ready after the worker completes.
3. Return to the existing staff tab. Refetch via **الحساب والجلسة → تحديث الصلاحيات** or refocus. Expect two branch choices and removal of the denied card. Open `/administration/roles` directly: the server denies it. The `inventory` policy endpoint must also return 403, even with an old page.
4. As admin, stop only the isolated development issuer (`docker stop shahn-p02-dev-issuer`). Create a new ordinary user with a valid role and branch. Expect a saved pending user, retained command identity and pending issuer work. Restart it (`docker start shahn-p02-dev-issuer`) and wait for the bounded retry/backoff; **تحديث حالة الهويات** eventually shows one ready user. Credential/MFA enrollment for that new human remains an issuer operator action. A ready native binding is not proof of Tawsel provisioning.
5. Open the separate support entry, sign in with its real OTP, choose the company and enter a reason of at least ten characters. Start the session and add a branch. Open the visible audit: expect **الدعم الفني · Technical Support**. The ordinary user list must not contain the support account. After expiry, another support mutation must fail; its earlier audit remains.
6. Begin a user form and type data. Let the session expire (or use a separate tab to end ERP's session). A submission requires reauthentication and retains the values. Use **إعادة تسجيل الدخول مع إبقاء النموذج**, return to the original tab, refresh and review before resubmitting. Do not create a replacement intent when the result is unknown; use result recovery or resend the exact retained request. A page reload retains only the pending command reference and blocks another submission until recovery; it does not persist human form data or an offline write queue.
7. At 390×844 and 1440×1050, and at 320/768 widths, verify labels, focus, touch controls, long Arabic names and no sideways page scroll. The automated trial uses the same real local API/issuer; owner review and physical-device/screen-reader acceptance remain separate.

## Recovery and verification

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run test:db
npm run test:p02:browser
npm run test:phase -- P02
```

The browser suite starts a fresh UUID-owned PostgreSQL and Keycloak, actual API/Vite processes, and separate worker processes. It does not reuse the development secrets or database. Its loopback control server exists only under `tests/p02` and requires a random fixture bearer; no such route is compiled into the application. Browser traces and automatic failure screenshots are disabled around authentication; evidence captures show empty ERP login fields or authenticated business pages and contain no credentials. Transient issuer authentication query parameters in early failure logs are redacted without removing failure diagnoses.

The remote-success/local-acknowledgement test sends an IPC signal only after the real Keycloak adapter returns from creation/reconciliation, then the parent kills that worker with SIGKILL before the local completion transaction. The test observes a remote subject and native pending user with no local binding, expires only that fixture's lease, starts a fresh worker, and asserts one user and one linked subject. [Interruption proof](interruption-proof.json) records the actual technique and non-secret record identities. Production recovery waits for the lease naturally; do not manually reset command identity or recreate users to recover a timeout.

Authorized native revision/identity conflicts and definite issuer rejection retain their intent identity. Malformed closed-schema or unauthorized requests make no partial administration. Corrections use a reviewed new command; timeout/unavailability stays pending. The worker never opens a network call inside a held transaction. SQL tests independently verify rollback after an injected audit-write failure and that a late worker cannot acknowledge over a newer fencing generation. Worker leases are 60 seconds; ordinary retry backoff is capped near five minutes.

The login adapter supports configured OIDC discovery; the provisioning adapter and bootstrap command deliberately implement the selected Keycloak reference's Admin API. A customer's different issuer needs a verified administrative adapter with equivalent immutable correlation/search semantics before provisioning acceptance. Merely pointing `OIDC_ISSUER` at another product does not establish that compatibility.

Numbered evidence retains initial failures and corrected reruns. Final counts, actual commands and any remaining verification are recorded in the execution record; a passing source/build alone is not issuer acceptance. Customer live-issuer binding/MFA, owner manual review, production TLS/infrastructure and later domain consumption remain explicitly unverified.

Implementation sources: [OIDC code flow](https://github.com/panva/openid-client/blob/main/examples/oidc.ts), [Keycloak containers](https://www.keycloak.org/server/containers), [Keycloak Admin REST](https://www.keycloak.org/docs-api/latest/rest-api/index.html), and [OTP encoding implementation](https://github.com/keycloak/keycloak/blob/26.8.0/server-spi/src/main/java/org/keycloak/models/credential/OTPCredentialModel.java). The application libraries and actual local issuer were tested in this phase; these links alone are not acceptance evidence.
