# P13 consumer handoff

Local implementation only; independent acceptance limits are in [README](README.md). This does not authorize or implement a later phase.

## Storage and transaction boundary

`packages/database/migrations/0017_p13_execution.sql` adds `execution.state`, immutable `source_evidence`, `timeline`, `visit_fact`, `outcome_fact`, `reported_money_fact`, `earning_basis`, `allocation`, protected-basis/review tables and monitoring/witness storage. No historical unproven shipment is backfilled as an earned visit. The migration extends the P03 allocation validator only for exact linked cancellation of an unreleased pending credit; it does not make pending lots spendable.

`ProjectionWorker` is implemented in `apps/api/src/modules/execution/projection-worker.ts` and exported by the required worker wrapper and handlers. This follows the existing P12 shared-service pattern and permits real API/worker tests to use the same domain implementation. The worker locks the source, then recipient stream/inbox; all visit/journal/effective state/application markers commit together. `ExecutionDependency` retains a pending reason without advancing application. Source ownership prevents a blocked stream from starving unrelated streams. `received_through`, high water, applied, projected, snapshot and history-completeness remain separate.

`applyVisitAndOutcome(client, acceptedCycle, evidence, round)` joins the caller's transaction. The durable P12 intent supplies command/actor attribution, not a new staff mutation grant. Source locks precede aggregate/brand/employee locks. `HistoryEvidenceService.refresh` uses authorized complete cached history and one transaction per semantic fact; it never invents a sender event ID or recipient sequence. Original/corrected facts keep immutable evidence IDs even if a later event duplicates them.

## Event ownership

| Owner | Exact subscribed names |
| --- | --- |
| P11 provisioning | `provisioning.changed`; requires matching accepted source-command/binding evidence before application. |
| P12 accepted dispatch facts | `task.snapshotAccepted`, `assignment.prepared`, `assignment.received`, `assignment.withdrawn`, `assignment.reassigned`, `task.urgencyChanged`, `dispatch.createdFromReceipt`. A response and echo share their semantic identity. Missing accepted native cycles/revisions stay pending, including P14-created redispatch not yet implemented. |
| P13 execution | `location.pinConfirmed`, `plan.revisionPublished`, `round.started`, `current.headingSelected`, `current.arrivalRecorded`, `outcome.recorded`, `task.deferred`, `task.retryAdmitted`, `task.deferredActivated`, `task.driverUrgencyChanged`, `round.ended`, `workday.ended`, `branch.roundInterrupted`, `branch.arrivalRecorded`, `branch.roundResumed`. |
| P13 correction | `outcome.corrected`, with original outcome and predecessor revision required. |
| P14 pending | `return.requested`, `return.subsetReceived`, `return.dispositionRecorded`; `P14_PENDING_DOMAIN_HANDLER`, no false applied checkpoint. |

The closed parser is `packages/contracts/src/execution/index.ts`; canonical JSON Schema validation precedes normalization. Excluded `evidence.adoptionResolved`, `progress.snapshot`, `integration.applicationReported` are not accepted subscriptions.

## P14 / P15

P14 consumes native/canonical cycle, task, attempt, outcome line/held-return identities; P13 does not write return stock or physical receipt. P15 can call `MonitoringReader.read(token,company,kind,id,{capability,...})` with its authorized native screen capability. Supported kinds: drivers, trips, tasks, workdays, actions (requires sourceId). Returned freshness is received evidence only, device contact unknown. Source 404 hides source data without deleting native facts; 503 retains stale cached evidence. No physical-presence, GPS or availability guarantee follows from a round.

## P16 / P17

`RoundEvidenceService.refresh` fetches complete scoped trip/workday/task evidence and persists a stable digest and local revision with closure, outcomes, checkpoints, gaps/reviews and expected recipient total. `assertRoundEvidenceBasis` rejects outdated/incomplete saved basis and changes in outcomes, gaps, open reviews or closure. P16 must refresh immediately before preparing confirmation, then call the assertion under the same source lock in its posting transaction. A quiet inbox is never a completeness certificate, nor proof that unseen device facts do not exist.

`execution.allocation.goods_effect_id` identifies P03 pending goods lots. Only actual full remittance may release eligibility. Use the existing wallet/account services; do not recreate lots or subtract shipping a second time. `protectVisitBasis(u,visitId,'remittance'|'payout'|'payroll',referenceId)` joins downstream transactions after source/visit/brand locking and checks branch authority/open reviews. P16/P17/P20 must call it when their postings make a basis protected.

## P20 / P21

`earning_basis` retains exact resolution, employee/profile/link/agreement versions, base commission formula and amount. Journal effects retain work branch and Cairo effective day. Missing/ambiguous mappings remain unresolved, never zero. Protected/past payroll periods retain captured basis for resolution without altering that period's employee ledger.

Corrections of protected visits keep the old postings/cash, add one source-linked settlement review and hold any remaining eligible affected goods lot. Pending goods were already ineligible and do not need a spendability hold. `resolveSettlementReview(u,{reviewId,resolutionSourceId,linkedAdjustmentIds,holdReleaseIds})` has no public mutation route. P21 must supply authorized typed posting; linked corrections must supersede affected prior goods/fee effects in the visit's branch. Hold-release IDs mean affected hold IDs, whose existing P03 release rows must name that same resolution source. P21 owns resolution calculation, review UI actions and their full integration tests.

## Authorized reads and frontend paths

`GET /api/v1/tracking` and `/api/v1/tracking/:nativeShipmentUuid` require tracking; list schema includes operational filters/page and no price/HR/wallet. The native editable shipment path still uses numeric reference and its branch/intake authority. `GET /api/v1/execution/earnings` requires employees and relevant historical branch scope; `/reviews` requires integration and assigned visit branch. Closed response schemas are in `packages/contracts/src/execution/tracking.ts` and OpenAPI.

Web paths: `/tracking`, `/tracking/:id`, `/execution/earnings`, `/execution/reviews`. The timeline lives within `apps/web/src/features/tracking/tracking.tsx` because company-wide operational tracking is intentionally separate from the restricted shipment editor; there is no duplicated `shipments/timeline` component. P12 result evidence is displayed even before its event echo; history-only outcomes retain explicit history identities.

`executionLatency(u,eventId)` exposes same-database-clock receipt, post-commit observation and authorized read timings. It returns `canonicalToVisibleMs:null` and `remoteClockVerified:false` until an independent clock method is verified. Do not report the five-second target as achieved from these local observations.
