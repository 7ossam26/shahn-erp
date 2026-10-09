Current status: **authorized setup executed and shared configuration restored**. Latest measured results are in [READINESS.md](READINESS.md). The proposal below is retained history; its pending-approval statements are superseded by the dated execution at the end.

# P26 live connection findings and remaining setup

2026-10-09, Africa/Cairo. The owner supplied access after the first preflight. [Actual SSH/HTTP evidence](live-host-access.json) establishes that Tawsel and its issuer are reachable on the recorded images. Access credentials remain out of repository files/evidence.

The old P22 source callback and signing selectors remain configured. However, the corresponding restricted local credential/trial directory is absent, the isolated native ERP database is not available, and no listener exists at the bridge's remote loopback port24481. Bridge health200 is a static Nginx response, not receiver/application proof. The actual service configuration endpoint returns401 without a scoped bearer, as required. SSH/Dokploy administration access does not replace that authenticated service identity.

The active API runtime is995bytes with SHA-256 `dd9fcdedece81287cbc491bdd05d1edd0ece30f61677e87c1f489b1ff6c30326`; its bootstrap operator is disabled. The prior temporary operator setting exists only in a protected old setup backup. No active runtime or service was modified/restarted, and no Tawsel/issuer database was read.

## Concrete next setup boundary

Before a connected pilot, establish a new isolated ERP web/API/worker/database with a current separate ERP issuer client, P26 roles and real driver-to-employee mappings. A lost old native trial cannot be replaced with metadata while reusing its previous financial/history assertions. A new P26 run needs its own fixture and evidence.

For a renewed source connection, use the existing canonical operator bootstrap (`integration.bindSource`) or exact scoped credential recovery (`integration.rotateCredential`, `recover:true`). Reserve fresh test identity/command IDs, create credentials in a restricted private location outside the repository, and preserve the action after an unknown result. Do not read/write Tawsel tables or inject a service bearer into a human driver command. The current live API has no enabled operator; any temporary runtime/operator enablement and restart needs explicit scope under the phase's restriction on Tawsel changes. A host access grant does not constitute a reviewed production rollout.

If such setup is separately authorized, the reviewable operation is limited to the Tawsel API service `app-reboot-open-source-port-yzf61j`: retain its exact original environment bytes/ownership/mode and service specification, enable a temporary bootstrap credential only for the test-source operation, prove current image/configuration/readiness, restore the original operator-disabled runtime immediately, and verify all three API/outbox/provisioner services are1/1. Existing other sources/configurations remain outside the operation. This is a proposal, not an executed change. No password/token or proposed raw secret appears in this record.

Restore an SSH reverse tunnel to the existing allowlisted callback only after the dedicated receiver is configured with the matching source/key identities and closed schemas. Then prove real signed receipt and projection application separately. Provision actual independent human test sessions through issuer/public operations and record scoped source configuration before any pilot journey. Preserve old trials as history; never manufacture their database or claim recovered money from a newly seeded fixture.

P25's clean release, queued upgrade, controlled live restore, representative/ramp capacity and second-layout collectors still have to run. These are material preceding ERP acceptance, not waived by live server access. P26's complete fixture/journeys and named reviewed Tawsel gates remain independently required.


## Authorized execution and current result — 2026-10-09

The owner explicitly approved the described isolated setup and temporary operator/API restarts, then approved the brief issuer restart/temporary administrator. Execution is complete within that limited scope; the earlier pending-approval prose is historical. See [current readiness](READINESS.md), [issuer cleanup](live/issuer-bootstrap.json), [administrator deletion](live/issuer-setup.json), [source runtime restoration](live/source-bootstrap-2.json) and [callback restoration](live/callback-restoration.json). New test identities/clients and source/branch records remain for reuse. No existing business row or Tawsel code was changed. The canonical callback requires HTTPS default443; the trial temporarily routed only the existing ERP signed event endpoint through a scoped exact-path proxy, then disabled the webhook and removed that route. The ERP remains on its separate TLS port25426.
