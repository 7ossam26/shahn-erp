# Integration phase coverage

P22 owner-ordered ERP-first closure, 2026-10-08: verified ERP recovery implementation and selected actual public scripts may commit under the explicit owner exception in phases/EXECUTION-CONTRACT.md. Named Tawsel acceptance is deferred, not passed: CR-001 reviewed baseline/07/IP-AC-18; CHECK-003 exact accepted-A→B and receipt-A→cycle-B; complete jointly reviewed43+1/27 matrix. Single later handoff: TAWSEL-CHANGE-REQUESTS.md. Actual whole-retry/correction/replay, interrupted source worker retained-result recovery,3-before1/2 current/history recovery, and CI runtime source provenance now have evidence in docs/verification/P22/README.md. No Tawsel code/baseline adoption, full integration-readiness claim or P23 start.

Authority: PLAN-001, ERP-D-205 / ERP-R-214. Updated 2026-10-03. This is an authored ownership and future verification matrix. **No ERP implementation or runtime conformance is claimed by a row below.**

Execution addition 2026-10-08: P22 [44-operation/27-event evidence](../docs/verification/P22/OPERATION-EVENT-EVIDENCE.md) and [IP-AC/gap ledger](../docs/verification/P22/TRACEABILITY.md) record native scripts and owner-authorized actual isolated Tawsel/issuer/two-human/callback recovery, rotation/proxy, financial correction/resolution, live-source restore and six latency samples. Fourteen sender types and fourteen native outbox operation IDs plus selected public reads have actual positive proof; complete reviewed producer/authority/rejection/recovery matrix remains pending. Authored inventory unchanged. CR-001/CHECK-003 and runtime source-commit attestation remain gated. Browser excluded by owner; initial failures retained. No unconditional completion or baseline upgrade.

The exact inventory is **43 scoped Tawsel service operations plus one operator-bootstrap operation, 44 named operations total, and 27 current sender event types**. External ERP receiver/status operations are listed separately and are not counted as Tawsel service calls. Conditional support is retained explicitly; the presence of a contract operation does not select a new product action.

## 1. Sources and reading keys

The authoritative operation inventory is [integration plan section 5](../ERP-TAWSEL-INTEGRATION-PLAN.md#5-exact-permitted-service-inventory); event effects are [section 11](../ERP-TAWSEL-INTEGRATION-PLAN.md#11-event-allowlist-and-native-effects). Exact selected static reading, dependencies and fixture limits are in [contract coverage sections 2–6](../docs/planning/INTEGRATION-CONTRACT-COVERAGE.md#2-foundation-and-schema-reading). Acceptance rows are [IP-AC-01–23](../ERP-TAWSEL-INTEGRATION-PLAN.md#17-acceptance-and-manual-verification-plan); unresolved gates are [section 18](../ERP-TAWSEL-INTEGRATION-PLAN.md#18-remaining-dependencies-and-closure-conditions).

`04`, `05`, `06` and line references below mean unchanged files in [the pinned baseline directory](../docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/), commit `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`. Definitions are embedded source blocks; `.invalid` URLs are schema identities. All schemas behind selected payload references must be followed. The table names source families to keep each operation row readable without discarding its exact definition.

| Reading key | Exact HTTP and schema authority | Relevant supplied positive/negative examples |
| --- | --- | --- |
| A — Common | 04 authority 11–139; 05 action envelope 43–110, result 112–154, common 1607–2763 | Full/compacted action result and invalid retained-body/pending variants; all concrete commands additionally use their family schema |
| P — Provisioning | 04:1283–1713; 05 `provisioning.schema.json`12566–14051 | Entire `p08-*` valid/invalid family and relevant P25 sender fixtures |
| I — Intake/cycles | 04:1714–2024 and 4631–4734; 05 `b2b-intake.schema.json`156–1181, shared phone/destination starting 1183 | Entire `p10-*` and `p22-*` families; positive P10 begins 9380, P22 begins 14934 |
| R — Returns | 04:4254–4467; 05 `returns.schema.json`15217–16091 | Entire `p21-*` valid/invalid family; positives 14304–14932; relevant P26 return state |
| M — Monitoring | 04:5476–5981; 05 `monitoring.schema.json`7759–8805 and its selected execution dependencies | Entire `monitoring-*` valid/invalid family; positives 16191–17287, negatives 5783–6337 |
| W — Signed delivery/replay | 04:196–550 with trailing response tail; 05 `outbox.schema.json`8807–9526 and closed sender 6381–7022 | Entire `p25-*` family; signature vector at 06:20434. No dedicated captured body for each configure/rotate/retry command; P22 constructs labelled contract-derived cases |
| C — Consumer reconciliation | 04:5982–6158; 05 `consumer.schema.json`2765–3287 and current-state dependencies | Entire `p26-*` valid/invalid family; positives 18389 onward. Current-state-only is not historical proof |
| E — Event wrapper | 04 sender map 141–173; 05 event envelope 6236–6379 and sender 6381–7022 | P25 has nine positive sender examples, not one for each of 27; exact nested feature examples are also required |
| X — Execution payloads | 05 location 7395–7757, planning 10776–12564, round-start 16093–16545, current 3685–4840, outcomes 9528–10774, eligibility 5412–6234, closure 17540 through end, branch 1339–1605, corrections 3289–3683 | Selected location confirmation and P13 publication examples; complete P15/P16/P17/P18/P19/P22/P23 families plus corrected monitoring |

Every operation uses its concrete closed schema and actual capability; the common envelope is insufficient alone. Every command includes same-action immutable retry, source isolation, invalid version/context, current authority, retained result and timeout/unknown handling. Every query includes its documented scope, cursor/error alternatives and native permission checks. The phase-specific acceptance column names the cases that demonstrate these rules in that workflow.

## 2. Operator bootstrap — one operation

| Operation | First owner | Consumers / final verification | Definition / source | Acceptance and failure focus |
| --- | --- | --- | --- | --- |
| `integration.bindSource` | P11 | P22; P25 environment setup | P+A, `BindSourceCommand`; `ProvisioningOperator` only | IP-AC-01/19: source/issuer/version/credential-hash validation, duplicate/conflicting identity and ambiguous response recovery without another source |

## 3. Scoped service inventory — 43 operations

Ordinary workers use `ProvisioningService` with the actual integration configuration/capability allowlist. `integration.rotateCredential` additionally permits documented operator recovery. No row authorizes the connector to impersonate the driver.

| # | Exact operation | First implementation owner | Later consumers / verifier | Concrete definition and source | Acceptance / rejection / recovery |
| --- | --- | --- | --- | --- | --- |
| 1 | `integration.rotateCredential` | P11 | P22, P25 | P+A `RotateCredentialCommand`; `integration.manage` or allowed operator recovery | IP-AC-01/19: expiry/hash/source revision, in-flight old credential, immutable unknown-action recovery, no secret logging |
| 2 | `integration.disableSource` | P11 | P22, P25 | P+A `DisableSourceCommand`; `integration.manage` | IP-AC-01/19: current authority/revision, no new source work after disable, retained history and pending custody |
| 3 | `branch.provision` | P11 | P12/P15; P22 verifies | P+A `BranchCommand`; `identity.provision` | IP-AC-01: duplicate/cross-source/stale branch identity; same action after lost response |
| 4 | `branch.disable` | P11 | P12/P15; P22 | P+A `DisableBranchCommand`; `identity.provision` | IP-AC-01/03: disabled branch cannot authorize new dispatch; history remains |
| 5 | `role.defineCapabilities` | P11 | P02 operational mapping; P22 | P+A `RoleCommand`; `identity.provision` | IP-AC-01: closed actual capability set; no ERP finance permission forwarded as invented Tawsel capability |
| 6 | `user.provision` | P11 | P02/P08 identity setup; P22 | P+A `UserCommand`; `identity.provision` | IP-AC-01: accepted versus issuer-ready, subject conflict, disabled/missing reference and source revision |
| 7 | `user.setRole` | P11 | P02 identity changes; P22 | P+A `UserRoleCommand`; `identity.provision` | IP-AC-01: shared user revision stream, missing role, competing update and lost response |
| 8 | `user.setCapabilityExceptions` | P11 | P02 identity changes; P22 | P+A `UserExceptionsCommand`; `identity.provision` | IP-AC-01: permitted exceptions only, shared revision fencing, rejected impersonation |
| 9 | `user.setBranchMemberships` | P11 | P02/P15 scope; P22 | P+A `UserBranchesCommand`; `identity.provision` | IP-AC-01: company/source branch identity, disabled references, concurrent same-user changes |
| 10 | `user.disable` | P11 | P02/P08; P22 | P+A `DisableUserCommand`; `identity.provision` | IP-AC-01/19: ready with enabled:false is valid, no history deletion, revoked access respected |
| 11 | `driver.provisionReference` | P11 | P08/P12/P15; P22 | P+A `DriverCommand`; `identity.provision` | IP-AC-01/17: stable driver identity, disabled/missing references, no automatic employee/login creation |
| 12 | `integration.getConfiguration` | P11 | Every source adapter; P22 | P `SourceConfiguration`; `integration.manage` | IP-AC-01/19: identity/version/allowed operations, humanDelegation:false,401/403 configuration block |
| 13 | `provisioning.getStatus` | P11 | P12 readiness; P22 | P `ProvisioningStatus`; `identity.provision` | IP-AC-01: accepted/pending/retry/failed/disabled readiness distinctions; no substitute for an old arbitrary action result |
| 14 | `intake.submitSnapshot` | P12 | P14/P18; P22 | I+A `SourceSnapshotCommand`; `intake.prepare` | IP-AC-02/04/21/22: exact outstanding money, bounded fields, immutable revisions, goods preserved under waiver, unknown action |
| 15 | `intake.prepare` | P12 | P14; P22 | I+A `PrepareCommand`; `intake.prepare` | IP-AC-03/04: source/assignment revision, ready driver, preparation is not physical receipt, atomic capacity |
| 16 | `assignment.receiveBatch` | P12 | P14/P18; P22 | I+A `ReceiveBatchCommand`; `assignment.manage` | IP-AC-03/04/21: receiptAsserted:true,49+2 atomic rejection, departure race, one stock/cover effect under response loss |
| 17 | `assignment.withdraw` | P12 | P14/P15 compatibility gate; P22 | I+A `WithdrawCommand`; `assignment.manage` | IP-AC-03/04: predeparture lifecycle, actual custody, no timeout rollback or implied physical return; CHECK-003 unresolved |
| 18 | `assignment.reassignBeforeDeparture` | P12 | P14; P22 | I+A `ReassignCommand`; `assignment.manage` | IP-AC-03/04: receipt assertion, version/departure race, no direct postdeparture driver-to-driver transfer |
| 19 | `intake.setUrgencyBeforeDeparture` | P12 conditional adapter/conformance | P22 conditional verification | I+A `UrgencyCommand`; `intake.prepare` | IP-AC-03: stale/departed/unauthorized write rejected. No new ERP urgency action/UI is selected by this row; require existing explicit scope evidence before enabling a business write |
| 20 | `intake.getTask` | P12 | P13/P14/P22 | I `Task`; `intake.prepare` | IP-AC-03/04: scoped external reference/current accepted revision, hidden/missing versus deletion, current state is not full history |
| 21 | `intake.listTasks` | P12 | P22 known-stream recovery | I `TaskList`; `intake.prepare` | IP-AC-03/14: bounded scoped pagination, no first-page completeness claim or all-tenant discovery |
| 22 | `intake.getBatchResult` | P12 | P14/P22 | I `BatchResult`; `assignment.manage` | IP-AC-03/04/11: pending 202 is unresolved, retained exact action/operation, no new command identity to repeat acceptance |
| 23 | `dispatch.createFromReceipt` | P14 | P18; P22 | I+A `RedispatchCommand`; `assignment.manage` | IP-AC-11/22: actual compatible unallocated receipt, new cycle/stable shipment, unavailable/lost/damaged/double allocation rejected; A→B gate CHECK-003 |
| 24 | `dispatch.listCycles` | P14 | P13/P22 | I `CycleList`; `assignment.manage` | IP-AC-11: scoped externalId and complete bounded pagination; retain old cycle/branch/price history |
| 25 | `return.listPending` | P14 | P18/P22 | R `RequestList`; `return.receive` | IP-AC-10: required driver/source branch, cursor pages, no global-clearance or first-page claim |
| 26 | `return.getNativeRequest` | P14 | P18/P22 | R `RequestView`; `return.receive` | IP-AC-10: current item revisions/actual unresolved balances, wrong scope and stale display |
| 27 | `return.getNativeResult` | P14 | P18/P22 | R native action result; `return.receive` | IP-AC-10: same action after response loss, pending is not receipt, result/event normalization |
| 28 | `return.confirmSubsetReceipt` | P14 | P15/P18; P22 | R+A `ReceiveCommand`; `return.receive` | IP-AC-09/10: actual source-branch subset; wrong branch, duplicate/excess/fraction/stale quantities rejected; receipt/correction/disposition race |
| 29 | `return.recordDisposition` | P14 typed interface | P18 incident workflow; P22 | R+A `DisposeCommand`; `return.dispose` | IP-AC-10: lost/damaged only, authoritative revision, no imaginary stock or automatic compensation; race/retry deduplication |
| 30 | `integration.getExecutionProjection` | P13 | P15 carrier aid; P22 | M `Snapshot`; `monitor.read` | IP-AC-15/16: received-evidence-only driver state, source filtering,304/404/409/503, no GPS or availability lock |
| 31 | `integration.getTripProjection` | P13 | P16 round witness; P22 | M `Snapshot`; `monitor.read` | IP-AC-12/15: stable scoped round evidence, incomplete/changed snapshot, closure is not remittance |
| 32 | `integration.getTaskHistory` | P13 | P14/P16/P21/P22 | M `History`; `monitor.read` | IP-AC-09/12/13/15: original/effective outcome chain, complete stable pages, scoped correction and known gaps |
| 33 | `integration.getWorkdayHistory` | P13 | P16/P21/P22 | M `History`; `monitor.read` | IP-AC-12/13/15: complete source history and basis revision/digest,409 restarts, no unseen-device finality |
| 34 | `integration.getMonitoringAction` | P13 | P16/P21/P22 investigation | M `ActionSnapshot`; `monitor.read` | IP-AC-12/15: required source query, scoped retained action evidence, no human result endpoint fallback |
| 35 | `integration.configureWebhook` | P11 | P22/P25 | W+A `ConfigureWebhookCommand`; `integration.manage` | IP-AC-05/19: exact allowed public HTTPS 443 callback, key selector, revision/auth failure, no redirects/private-host workaround |
| 36 | `integration.rotateSigningKey` | P11 | P22/P25 | W+A `RotateSigningKeyCommand`; `integration.manage` | IP-AC-05/19: preprovisioned selector, overlap bounds and verifyUntil, in-flight old valid key versus expired key |
| 37 | `integration.retryDelivery` | P11 adapter/basic control | P22 full recovery UI | W+A `RetryDeliveryCommand`; `integration.manage` | IP-AC-05/06/19: committed immutable event retry, no business reapplication, wrong source/revision/idempotency rejection |
| 38 | `integration.getDeliveryStatus` | P22 | P25/P26 operational proof | W `Queue`; `integration.manage` | IP-AC-06/07/14: scoped cursor/limit, received versus applied, projectionStatus remains unknown |
| 39 | `integration.getDeliveryDetail` | P22 | P25/P26 diagnostics | W `Detail`; `integration.manage` | IP-AC-06/14: scoped event and bounded attempt history, no secret output or accounting success inference |
| 40 | `integration.replayEvents` | P22 | P25/P26 restore/conformance | W `Replay`; `integration.manage` | IP-AC-07/14/20: exact aggregate/range, nextAfterSequence,410 history gap/503 retained uncertainty, live/replay deduplication |
| 41 | `integration.getReconciliationSnapshot` | P22 | P25/P26 restore/conformance | C `Snapshot`; `integration.manage` | IP-AC-14/20: current-state-only, bounded 503, P26 returnItems versus original request, no invented money/history |
| 42 | `integration.reportAppliedCheckpoint` | P22 | P25/P26 | C+A `ReportCommand`; `integration.manage` | IP-AC-14/20: committed independent counters, durable report retry, wrong identity/version, receiver-reported only |
| 43 | `integration.getAppliedCheckpoint` | P22 | P25/P26 | C `ReportRead`; `integration.manage` | IP-AC-14/20: exact aggregate scope, distinct receipt/application/current coverage, no independent accounting attestation |

P02/P08 mentioned as consumers means their identity setup receives the P11 connector extension; it does not add a backwards prerequisite that blocks P11. P25/P26 consume completed evidence and deployment configuration, not permission to auto-deploy production. Every source row gets conformance completion in P22 within its selected scope, with unresolved material cases retained.

## 4. Sender events — 27 exact types

P11 validates the complete closed sender union and durably receives all 27 from the outset. “First owner” below means the business/projection handler, not permission to acknowledge unknown schemas. A handler absent before its owning phase leaves the event durably pending and does not falsely advance application. All rows use E+A plus the named feature definition; P22 performs final reorder/replay/reconciliation/restore verification. Every event requires scope/version/identity and duplicate-body/sequence-collision checks under IP-AC-05/06/07; the final column adds its specific semantic failures.

| # | Exact event | Concrete payload / source | First handler owner | Consumers | Semantic acceptance and failure cases |
| --- | --- | --- | --- | --- | --- |
| 1 | `provisioning.changed` | P `ProvisioningChanged` | P11 | P12/P15/P22 | IP-AC-01/19: accepted revision/binding does not assert issuer-ready; disabled history retained |
| 2 | `task.snapshotAccepted` | I `ChangedEvent` | P12 | P13/P14/P22 | IP-AC-02/04: accepted snapshot/cycle and desired revision, no physical receipt or earning; result/event dedup |
| 3 | `assignment.prepared` | I `ChangedEvent` | P12 | P13/P22 | IP-AC-03/04: preparation never asserts physical receipt; stale assignment cannot overwrite newer state |
| 4 | `assignment.received` | I `ChangedEvent` | P12 | P13/P16/P22 | IP-AC-03/04: one accepted custody transition, no visit fee or company cash receipt |
| 5 | `assignment.withdrawn` | I `ChangedEvent` | P12 | P13/P14/P22 | IP-AC-03/04: preserve actual custody; release only legitimate native reservation/cover, not false physical return |
| 6 | `assignment.reassigned` | I `ChangedEvent` | P12 | P13/P22 | IP-AC-03/04: accepted predeparture revision/receipt meaning, no second stock move or commission |
| 7 | `task.urgencyChanged` | I `ChangedEvent` | P12 | P13/P22 | IP-AC-03: retain accepted urgency/source revision without inventing a selected ERP urgency action or financial effect |
| 8 | `dispatch.createdFromReceipt` | I `ChangedEvent` | P14 | P13/P18/P22 | IP-AC-11: one receipt allocation/new cycle, old shipment/history retained, no repeated receipt; CHECK-003 remains |
| 9 | `location.pinConfirmed` | X location `ConfirmedEvent` | P13 | P12 readiness/P22 | IP-AC-03/15: execution pin distinct from source address; no inferred arrival or repricing |
| 10 | `plan.revisionPublished` | X planning `PublishedEvent` | P13 | P12 status/P22 | IP-AC-03/15: notice/revision only, no human plan endpoint, invented ETA/GPS or custody rollback after planning failure |
| 11 | `round.started` | X round-start `StartedEvent` | P13 | P15/P16/P22 | IP-AC-08/12/16: actual round/workday/task identities, no visit fee, receipt or remittance |
| 12 | `current.headingSelected` | X current-activity `HeadingEvent` | P13 | Tracking/P22 | IP-AC-08: heading is not arrival; time/provenance preserved |
| 13 | `current.arrivalRecorded` | X current-activity `ArrivalEvent` | P13 | P16/P20/P22 | IP-AC-08/09/17/22: unique task/cycle/attempt visit, delayed embedded/history evidence dedup, normal/waived tariff policy |
| 14 | `outcome.recorded` | X outcomes `Event` containing `Record` | P13 | P14/P16/P17/P20/P22 | IP-AC-08/09/12/22: exact delivered/held/reported money; nullable arrival and null report; pending goods never actual cash |
| 15 | `task.deferred` | X eligibility `Event` | P13 | Tracking/P16/P22 | IP-AC-08: telephone postponement creates no visit; earliest time/current attempt retained |
| 16 | `task.retryAdmitted` | X eligibility `Event` | P13 | P16/P20/P22 | IP-AC-08/09: previous/new attempt identities; a retry is not an actual second visit or branch receipt |
| 17 | `task.deferredActivated` | X eligibility `Event` | P13 | Tracking/P22 | IP-AC-08: activation changes eligibility, not money/stock or arrival |
| 18 | `task.driverUrgencyChanged` | X eligibility `Event` | P13 | Tracking/P22 | IP-AC-08: driver's accepted urgency is distinct from ERP source revision; no service impersonation |
| 19 | `round.ended` | X workday-closure `Event` | P13 | P16/P22 | IP-AC-12/13: closure anchors evidence witness, not all-stream completeness, remittance or automatic returns |
| 20 | `workday.ended` | X workday-closure `Event` | P13 | P16/P20/P22 | IP-AC-09/12/13: preserve held carry-forward and correction boundary; not payroll closure |
| 21 | `return.requested` | R `RequestedEvent` | P14 | P13/P15/P18/P22 | IP-AC-07/10/14: offer only, no stock; missing predecessor waits, original request does not overwrite accumulated balances |
| 22 | `return.subsetReceived` | R `ReceivedEvent` | P14 | P13/P15/P18/P22 | IP-AC-10/11/14: actual unique transition and condition, accepted subset reusable independently, result/replay/snapshot dedup |
| 23 | `return.dispositionRecorded` | R `DispositionEvent` | P14 | P13/P18/P21/P22 | IP-AC-10/14: lost/damaged custody, no reusable stock or automatic compensation/payroll deduction |
| 24 | `branch.roundInterrupted` | X branch-activity `Event` | P13 | Tracking/P14/P22 | IP-AC-10/16: source-branch customer-round service, never an ERP transport manifest |
| 25 | `branch.arrivalRecorded` | X branch-activity `Event` | P13 | P14/P22 | IP-AC-10/16: branch arrival neither item receipt nor chargeable customer visit |
| 26 | `branch.roundResumed` | X branch-activity `Event` | P13 | P14/P22 | IP-AC-10/16: documented claimed-subset rules, not all-returns-clear or internal transport completion |
| 27 | `outcome.corrected` | X corrections `Event` | P13 | P14/P16/P17/P20/P21/P22 | IP-AC-07/09/13: predecessor/effective chain, unchanged prices, one visit, posted-money review/hold; no automatic refund or paid-period rewrite |

## 5. External-host operations and exclusions

| Interface | Owner | Verification and boundary |
| --- | --- | --- |
| `consumer.receiveSignedEvent`, ERP POST `/api/v1/consumer/events` | P11, final P22 | IP-AC-05/06/19/20: exact raw-byte HMAC/header/body/scope checks, commit before received acknowledgement,2 MiB boundary; it is not a Tawsel endpoint |
| `consumer.getStatus` reference behavior | P11/P22 native operational status | Native protected status UI may expose truthful receipt/application counters. Do not copy the mock app's business model or assume reference status authorization is the ERP permission model |
| `source.getCommandStatus` reference behavior | P11/P12/P14/P22 native command status | Recover native queued/unknown commands with current ERP permission and retained identities. Do not call this path on Tawsel or replace allowed source result APIs |

Human round/current/outcome/retry/defer/branch/correction/device/offline/Engine endpoints remain excluded from service calls. Real conformance may use separate legitimate human test sessions to produce events; that is not connector authority. `evidence.adoptionResolved`, `progress.snapshot` and `integration.applicationReported` are not sender event subscriptions on this baseline.

## 6. Gates, performance and evidence completion

| Gate | First affected phases | Exact closure artifact and preserved limit |
| --- | --- | --- |
| IP-GAP-001 / TAWSEL-CR-001 | P13 reason display; P22 IP-AC-18 | Reviewed updated Tawsel schema/version/driver flow and reason/correction/history/replay/reconciliation fixtures plus actual human-to-ERP acceptance. Current closed refusal/partial/Record/Replacement have no selected reason fields. Keep one consolidated change handoff; no invented current enum or endpoint |
| IP-GAP-002 / TAWSEL-CHECK-003 | P12/P14/P15; P22 IP-AC-11 | Exact allowed accepted-A→B and receipt-A→cycle-B public sequences, source/assignment/item revisions, compatibility/allocation, original/new return branch and positive/negative/lost-response evidence. Ordinary ERP physical transfer is independently implementable; do not hide the blocked subsequent customer dispatch |
| IP-GAP-003 / CHECK-001 | P13; P22 IP-AC-08/09 | Real arrival→no-answer/retry/correction/replay with one fee/commission per actual attempt. Separate canonical zero/null report from native earned fee; no redundant API assumed |
| IP-GAP-004 | P13/P16; P22 IP-AC-12/13 | Stable complete source-filtered history and effective outcome witness, persisted basis revision/digest, known gaps and later-correction hold behavior. No unseen-device/global financial-finality guarantee |
| IP-GAP-005 | P11–P14; P22 | Exact missing configure/rotate/retry and per-variant signed fixtures generated from supplied definitions, then actual scoped conformance. Do not relabel runtime evidence gaps as unread contracts or claim every example was supplied |
| IP-GAP-006 | P11/P22/P25 | Actual public callback/issuer, body limits, key/credential rotation, restart/restore evidence; both same-host and separate-host architecture retain public authority boundary |
| ERP-R-029 healthy projection target | P13 instrumentation; P22 measurement | Approximately 5 seconds from authoritative confirmation to committed readable/visible ERP projection; report sample/load/network, same-clock or measured-offset method, p50/p95/max. Target is measured, not guaranteed; missing it does not justify early false acknowledgement |

Each future row records implementation path, actual schema/runtime version, test IDs/commands, unit/DB/public-HTTP/browser/manual evidence separately, dates, pass/fail/skipped result and remaining dependency. `npm run test:phase -- Pxx` must execute registered suites and reject empty selection. Generated fixtures and mocks are useful but never certify a real connector. P22 updates this matrix by evidence, P25 rehearses its deployment boundary and P26 audits final traceability; none automatically authorizes production rollout.
