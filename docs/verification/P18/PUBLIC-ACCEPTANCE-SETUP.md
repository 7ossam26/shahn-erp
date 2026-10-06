# P18 public acceptance setup — 2026-10-07

Status: live intake preflight passed; complete registered public acceptance remains pending.

The owner supplied VPS/Dokploy access and confirmed that Tawsel Pilot contains test data only and is safe for isolated P18 records. Dokploy and SSH authentication both worked. No secret is stored in this evidence. No deployment, configuration change, service restart, Tawsel code change or Shahn deployment was performed during this investigation.

## Actual observations

- Public source: `https://app.switch2tech.cloud`; issuer: `https://auth.switch2tech.cloud/realms/tawsel-company`.
- Dokploy project `Tawsel Pilot` has one environment named `production`. The owner confirmed its disposable/test use; the environment label alone does not establish production data.
- Runtime image: `ghcr.io/7ossam26/tawsel-runtime@sha256:5ed185887f47cf66fcd01d8dd1acaa508d0ae5f6697551e82083994b8760b271`. The local Tawsel checkout is clean at `bbc977b6662a9093eabd0039661f4992a0e5f292`. These identities are different kinds of evidence; the running image has no source-revision label, so correspondence to that checkout is unverified.
- Real authenticated configuration reports version `1.0.0`, `humanDelegation: false`, and permits `intake.submitSnapshot` and `return.recordDisposition`.
- Current sender configuration has one signing-key scope and one callback destination, `https://mock.switch2tech.cloud/api/v1/consumer/events`.
- Shahn has no deployed application or dedicated callback/source connection in the inventoried project.
- API runtime configuration currently has no `TAWSEL_PROVISIONING_OPERATOR_TOKEN`. Provisioning-worker issuer administration is configured separately; operator bootstrap would require a controlled temporary configuration/restart or another already-authorized operator path.
- VPS snapshot: approximately 4.7 GiB available RAM, 75 GiB free disk, running motorcycle routing/VROOM and application/identity/mock workers. This snapshot does not certify capacity for a new stack.

## Live result and exact scope

[29-live-intake-preflight.json](29-live-intake-preflight.json) records real public HTTP calls with the pilot's existing Mock ERP service credential, the Shahn pinned validators/adapter, and a new isolated branch/task namespace.

1. Goods outstanding `25000` minor units, shipping outstanding `0`, total `25000`: accepted; canonical task read preserved the exact source snapshot.
2. Prepaid goods `0`, shipping `0`, total `0`: accepted; canonical task read preserved the exact source snapshot.
3. Original action replay and result recovery: identical accepted result for both tasks.
4. Unsafe integer money: HTTP 400 `validation_failed`.
5. Incorrect total: HTTP 422 `unsupported_price_allocation`.
6. Invented waiver field: HTTP 400 `validation_failed`.

Tasks remain unassigned. No driver custody, visit, outcome, available stock, compensation or actual-money effect was created. The existing Mock source credential is not a dedicated Shahn connection. This evidence does not pass the complete IP-AC-22/P18-AC-06/07/08 journey or the registered `tawsel.public.test.ts` suite.

## Proposed bounded activation

The following is a proposed setup, not an executed deployment:

1. Run the current Shahn API, projection/source workers and a disposable PostgreSQL database in an isolated test harness. Use one new native company, brand, received original shipment, commissioned employee and protected/allowed payroll periods. Keep its database independent of Tawsel.
2. Expose only the necessary test callback/tracking routes through a temporary HTTPS bridge under the existing pilot origin, with proposed prefix `/api/p18-acceptance/`. The external callback would be `https://app.switch2tech.cloud/api/p18-acceptance/api/v1/consumer/events`, forwarded without changing message bytes to Shahn's actual `/api/v1/consumer/events`. The bridge must use the existing TLS ingress and a private SSH tunnel; no new public database/SSH/API port is needed. This path is proposed infrastructure owned by the test receiver, not an invented Tawsel endpoint.
3. Bootstrap one dedicated Shahn test source with a new expiring service credential, new test branch/role/issuer subjects/driver reference, intake/assignment grants, return receive/dispose grants and source-scoped monitoring. If needed, temporarily enable the operator bootstrap token on the API, perform the documented `integration.bindSource`, then remove it. Preserve original configurations and use durable action identities/results throughout.
4. Append only the new test source's callback destination/signing-key scope to the API and outbox worker's protected sender configuration. Preserve the existing Mock destination. Activate the documented webhook command after the allowed destination/key exist. Any required service restart is an explicit activation step.
5. Store generated Shahn connection/trial credentials outside version control with restricted access. `TAWSEL_CONFIG_FILE` and `TAWSEL_P18_TRIAL_FILE` must identify the actual company/source, accepted snapshot actions, real arrival/outcome event IDs, invalid actions and the accepted permitted disposition action. Do not set the trial's approval flag or populate event IDs from fixtures.
6. Use real separately authenticated driver HTTP commands to execute the two zero-shipping cases and a distinct eligible return/disposition case. Run native report/confirmation/replacement, apply signed events through the actual receiver/worker and check fee + linked waiver + normal commission exactly once on replay. All financial records are test-only.
7. Run `npm run test:p18:public` with those private files. Record any actual compatibility failure and repair the ERP adapter under the pinned contract; do not change Tawsel as a side effect or weaken the public gate.
8. Remove the temporary public bridge, disable the dedicated test source/credential through the documented service operations, retain immutable test history/evidence, and restore any temporary operator configuration. Required gates still control any P18 completion commit/push.

## Authorization boundary

The owner has authorized isolated test records and supplied access. The original P18 prompt explicitly says: “Do not ... deploy ... automatically.” Publishing the temporary Shahn bridge and restarting Tawsel for the dedicated callback/operator configuration requires an explicit exception to that instruction. This exception has not yet been requested or approved. Ordinary read-only checks and the isolated live intake records above were completed first.

The remaining dependency is now a dedicated Shahn source/callback/driver trial setup, rather than lack of access to an independent Tawsel test system. No full integration success or P19 implementation is claimed.

## Executed 2026-10-07

The owner explicitly approved this bounded activation with “confirm, start.” Steps1–8 ran against test data. See [current run](README.md#2026-10-07-approved-public-run-and-script-verification), [phase runner](35-phase-scripts.txt), [native facts](30-live-native-journey.json), [actual driver/delivery evidence](36-live-driver-and-delivery-evidence.json), [disabled source/user](41-live-cleanup.json) and [restored VPS](42-vps-restoration.json). The earlier authorization/setup statements above describe the pre-approval investigation. The public blocker is resolved within this pilot/version/scope; the temporary connection is now disabled and no permanent deployment remains.
