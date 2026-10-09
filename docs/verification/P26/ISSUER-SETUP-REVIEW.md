Current status: **authorized setup executed and shared configuration restored**. Latest measured results are in [READINESS.md](READINESS.md). The proposal below is retained history; its pending-approval statements are superseded by the dated execution at the end.

# P26 issuer client setup review

The owner authorized the isolated ERP pilot, test issuer identities and temporary Tawsel API bootstrap/restart on 2026-10-09. No further approval is needed for those operations.

The actual `tawsel-provisioning` issuer service account has `manage-users`, `view-users`, `query-groups` and `query-users`; `/users` returns 200. It has no client-management authority; `/clients` returns 403. The public issuer gateway does not publish administration routes (404). An existing local-development administrator reference did not authenticate to the deployed issuer (400). No existing account permissions or identity data were changed by these probes.

A separate ERP login client and least-privilege identity worker client must be registered in the same actual company realm. The accepted source's issuer identity cannot be replaced with a fixture issuer or arbitrary credential.

Preferred closure: use an existing deployed issuer administrator through its private administration API. Accept a protected credential-file path rather than a token/password in chat. Create only the fresh `shahn-p26-20261009` login client and its own identity-worker client; retain scoped test identities outside the repository.

If no administrator is available, the concrete alternative is Keycloak's supported temporary administrator recovery. It requires stopping all issuer nodes first: <https://www.keycloak.org/server/bootstrap-admin-recovery>. This has a separate shared login outage and is beyond the reviewed Tawsel API-only restart.

For that alternative, snapshot the issuer service specification and current replica/image/configuration metadata in a restricted directory; stop only `app-copy-virtual-circuit-83h9mz`; run the identical issuer image with the original DB/TLS environment and official `bootstrap-admin service --client-id shahn-p26-bootstrap-20261009 --client-secret:env=P26_BOOTSTRAP_SECRET --no-prompt`; restore its original replica/specification immediately even if bootstrap fails. Do not run SQL, modify realm policy, reset existing passwords/MFA or change existing business identities. Once discovery and private administration recover, register the two ERP clients, delete the temporary administrator through Keycloak's administration API, and prove all original Tawsel services remain on their prior images and expected replicas. Keep secrets and full specifications private; publish only nonsecret results and hashes.

Status: proposal awaiting either deployed administrator access or separate issuer-outage authorization. Independent ERP image/database setup continues. No issuer restart or administrator recovery has run.


## Authorized execution and current result — 2026-10-09

The owner explicitly approved the described isolated setup and temporary operator/API restarts, then approved the brief issuer restart/temporary administrator. Execution is complete within that limited scope; the earlier pending-approval prose is historical. See [current readiness](READINESS.md), [issuer cleanup](live/issuer-bootstrap.json), [administrator deletion](live/issuer-setup.json), [source runtime restoration](live/source-bootstrap-2.json) and [callback restoration](live/callback-restoration.json). New test identities/clients and source/branch records remain for reuse. No existing business row or Tawsel code was changed. The canonical callback requires HTTPS default443; the trial temporarily routed only the existing ERP signed event endpoint through a scoped exact-path proxy, then disabled the webhook and removed that route. The ERP remains on its separate TLS port25426.
