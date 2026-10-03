# Canonical HTTP, authentication and operation reference

Source commit: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`. Extracted: 2026-09-25T08:22:32.982Z.

Original blocks below are verbatim source text, not rewritten contracts. Their SHA-256 hashes refer to original bytes. Resolve relative schema references using the original path above the block and the companion schema attachment. No repo/network access is needed to read those blocks. Descriptions/fixtures do not override operation authentication or lifecycle.

## Host and authority index

127 bound HTTP operations below. Alternatives in the authentication column are OpenAPI alternatives, not blanket permission: current capability, resource, actor and lifecycle checks still apply. The three external receiver/source endpoints run on the consumer base URL. A service credential cannot call a human endpoint. The complete catalog additionally contains events/local actions/unbound operations.

| Operation ID | Method and path | Server / caller category | Authentication alternatives | Capability | Lifecycle |
| --- | --- | --- | --- | --- | --- |
| consumer.getStatus | GET /api/v1/consumer/status | External ERP/reference consumer server | ReceiverStatus | external-consumer | verified-local |
| consumer.receiveSignedEvent | POST /api/v1/consumer/events | External ERP/reference consumer server | WebhookSignature | external-consumer | verified-local |
| source.getCommandStatus | GET /api/v1/source/status | External ERP/reference consumer server | ReceiverStatus | external-consumer | verified-local |
| assignment.reassignBeforeDeparture | POST /api/v1/intake/commands/assignment.reassignBeforeDeparture | Tawsel ERP service | ProvisioningService | assignment.manage | verified-local |
| assignment.receiveBatch | POST /api/v1/intake/commands/assignment.receiveBatch | Tawsel ERP service | ProvisioningService | assignment.manage | verified-local |
| assignment.withdraw | POST /api/v1/intake/commands/assignment.withdraw | Tawsel ERP service | ProvisioningService | assignment.manage | verified-local |
| branch.disable | POST /api/v1/provisioning/commands/branch.disable | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| branch.provision | POST /api/v1/provisioning/commands/branch.provision | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| dispatch.createFromReceipt | POST /api/v1/intake/commands/dispatch.createFromReceipt | Tawsel ERP service | ProvisioningService | assignment.manage | verified-local |
| dispatch.listCycles | GET /api/v1/intake/cycles | Tawsel ERP service | ProvisioningService | assignment.manage | verified-local |
| driver.provisionReference | POST /api/v1/provisioning/commands/driver.provisionReference | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| intake.getBatchResult | GET /api/v1/intake/results/{actionId} | Tawsel ERP service | ProvisioningService | assignment.manage | verified-local |
| intake.getTask | GET /api/v1/intake/task | Tawsel ERP service | ProvisioningService | intake.prepare | verified-local |
| intake.listTasks | GET /api/v1/intake/tasks | Tawsel ERP service | ProvisioningService | intake.prepare | verified-local |
| intake.prepare | POST /api/v1/intake/commands/intake.prepare | Tawsel ERP service | ProvisioningService | intake.prepare | verified-local |
| intake.setUrgencyBeforeDeparture | POST /api/v1/intake/commands/intake.setUrgencyBeforeDeparture | Tawsel ERP service | ProvisioningService | intake.prepare | verified-local |
| intake.submitSnapshot | POST /api/v1/intake/commands/intake.submitSnapshot | Tawsel ERP service | ProvisioningService | intake.prepare | verified-local |
| integration.configureWebhook | POST /api/v1/integration/commands/integration.configureWebhook | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.disableSource | POST /api/v1/provisioning/commands/integration.disableSource | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.getAppliedCheckpoint | GET /api/v1/integration/applied-checkpoint | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.getConfiguration | GET /api/v1/provisioning/configuration | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.getDeliveryDetail | GET /api/v1/integration/deliveries/{eventId} | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.getDeliveryStatus | GET /api/v1/integration/deliveries | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.getExecutionProjection | GET /api/v1/erp/monitoring/drivers/{id} | Tawsel ERP service | ProvisioningService | monitor.read | verified-local |
| integration.getMonitoringAction | GET /api/v1/erp/monitoring/actions/{id} | Tawsel ERP service | ProvisioningService | monitor.read | verified-local |
| integration.getReconciliationSnapshot | GET /api/v1/integration/reconciliation | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.getTaskHistory | GET /api/v1/erp/monitoring/tasks/{id}/history | Tawsel ERP service | ProvisioningService | monitor.read | verified-local |
| integration.getTripProjection | GET /api/v1/erp/monitoring/trips/{id} | Tawsel ERP service | ProvisioningService | monitor.read | verified-local |
| integration.getWorkdayHistory | GET /api/v1/erp/monitoring/workdays/{id}/history | Tawsel ERP service | ProvisioningService | monitor.read | verified-local |
| integration.replayEvents | GET /api/v1/integration/replay | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.reportAppliedCheckpoint | POST /api/v1/integration/commands/integration.reportAppliedCheckpoint | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.retryDelivery | POST /api/v1/integration/commands/integration.retryDelivery | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| integration.rotateCredential | POST /api/v1/provisioning/commands/integration.rotateCredential | Tawsel ERP service | ProvisioningService OR ProvisioningOperator | integration.manage | verified-local |
| integration.rotateSigningKey | POST /api/v1/integration/commands/integration.rotateSigningKey | Tawsel ERP service | ProvisioningService | integration.manage | verified-local |
| provisioning.getStatus | GET /api/v1/provisioning/status | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| return.confirmSubsetReceipt | POST /api/v1/erp/returns/commands/return.confirmSubsetReceipt | Tawsel ERP service | ProvisioningService | return.receive | verified-local |
| return.getNativeRequest | GET /api/v1/erp/returns/requests/{requestId} | Tawsel ERP service | ProvisioningService | return.receive | verified-local |
| return.getNativeResult | GET /api/v1/erp/returns/actions/{actionId} | Tawsel ERP service | ProvisioningService | return.receive | verified-local |
| return.listPending | GET /api/v1/erp/returns/pending | Tawsel ERP service | ProvisioningService | return.receive | verified-local |
| return.recordDisposition | POST /api/v1/erp/returns/commands/return.recordDisposition | Tawsel ERP service | ProvisioningService | return.dispose | verified-local |
| role.defineCapabilities | POST /api/v1/provisioning/commands/role.defineCapabilities | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| user.disable | POST /api/v1/provisioning/commands/user.disable | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| user.provision | POST /api/v1/provisioning/commands/user.provision | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| user.setBranchMemberships | POST /api/v1/provisioning/commands/user.setBranchMemberships | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| user.setCapabilityExceptions | POST /api/v1/provisioning/commands/user.setCapabilityExceptions | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| user.setRole | POST /api/v1/provisioning/commands/user.setRole | Tawsel ERP service | ProvisioningService | identity.provision | verified-local |
| account.getStatus | GET /api/account/status | Tawsel human session | companySession OR personalSession | authenticated | verified-local |
| action.getResult | GET /api/v1/actions/{actionId} | Tawsel human session | companySession OR personalSession | authenticated | verified-local |
| branch.interruptRound | POST /api/v1/branches/commands/branch.interruptRound | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| branch.recordArrival | POST /api/v1/branches/commands/branch.recordArrival | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| branch.resumeRound | POST /api/v1/branches/commands/branch.resumeRound | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| closure.getResult | GET /api/v1/closure/actions/{actionId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| correction.getResult | GET /api/v1/corrections/actions/{actionId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| current.correctOrigin | POST /api/v1/current/origin | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| current.getActivity | GET /api/v1/current/rounds/{roundId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| current.getResult | GET /api/v1/current/actions/{actionId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| current.recordArrival | POST /api/v1/current/arrival | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| current.selectHeading | POST /api/v1/current/heading | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| device.getContext | GET /api/v1/devices/rounds/{roundId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| device.getSnapshot | GET /api/v1/devices/rounds/{roundId}/snapshot | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| device.takeOver | POST /api/v1/devices/takeover | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| evidence.adoptCompatible | POST /api/v1/corrections/adopt | Tawsel human session | companySession OR personalSession | correction.own | verified-local |
| evidence.receiveFormerDevice | POST /api/v1/evidence/former-device | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| location.confirmPin | PUT /api/v1/locations/{taskId} | Tawsel human session | personalSession OR companySession | location.review | verified-local |
| location.getSnapshot | GET /api/v1/locations/{taskId} | Tawsel human session | personalSession OR companySession | monitor.read | verified-local |
| location.list | GET /api/v1/locations | Tawsel human session | personalSession OR companySession | location.review | verified-local |
| location.searchCandidates | POST /api/v1/locations/{taskId}/candidates | Tawsel human session | personalSession OR companySession | location.review | verified-local |
| map.getAssetConfiguration | GET /api/v1/maps/configuration | Tawsel human session | personalSession OR companySession | authenticated | verified-local |
| monitoring.getAction | GET /api/v1/monitoring/actions/{id} | Tawsel human session | companySession OR personalSession | monitor.read | verified-local |
| monitoring.getDriverSnapshot | GET /api/v1/monitoring/drivers/{id} | Tawsel human session | companySession OR personalSession | monitor.read | verified-local |
| monitoring.getTaskHistory | GET /api/v1/monitoring/tasks/{id}/history | Tawsel human session | companySession OR personalSession | monitor.read | verified-local |
| monitoring.getTripSnapshot | GET /api/v1/monitoring/trips/{id} | Tawsel human session | companySession OR personalSession | monitor.read | verified-local |
| monitoring.getWorkdayHistory | GET /api/v1/monitoring/workdays/{id}/history | Tawsel human session | companySession OR personalSession | monitor.read | verified-local |
| outcome.correct | POST /api/v1/corrections/outcomes | Tawsel human session | companySession OR personalSession | correction.own | verified-local |
| outcome.getCorrectionAvailability | GET /api/v1/corrections/attempts/{attemptId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| outcome.getResult | GET /api/v1/outcomes/actions/{actionId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| outcome.getRound | GET /api/v1/outcomes/rounds/{roundId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| outcome.recordFull | POST /api/v1/outcomes/full | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| outcome.recordNoAnswer | POST /api/v1/outcomes/no-answer | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| outcome.recordPartial | POST /api/v1/outcomes/partial | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| outcome.recordRefusal | POST /api/v1/outcomes/refusal | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| planning.getJob | GET /api/v1/planning/jobs/{jobId} | Tawsel human session | companySession OR personalSession | planning.manage | verified-local |
| planning.getPlan | GET /api/v1/planning/drivers/{driverId}/plans | Tawsel human session | companySession OR personalSession | planning.manage | verified-local |
| planning.requestPreview | POST /api/v1/planning/commands/planning.requestPreview | Tawsel human session | companySession OR personalSession | planning.manage | verified-local |
| planning.requestReplan | POST /api/v1/planning/commands/planning.requestReplan | Tawsel human session | companySession OR personalSession | planning.manage | verified-local |
| planning.saveDraft | POST /api/v1/planning/commands/planning.saveDraft | Tawsel human session | companySession OR personalSession | planning.manage | verified-local |
| planning.setManualOrder | POST /api/v1/planning/commands/planning.setManualOrder | Tawsel human session | companySession OR personalSession | planning.manage | verified-local |
| report.getRoundTiming | GET /api/v1/reports/workdays/{workdayId}/rounds/{roundId}/timing | Tawsel human session | personalSession OR companySession | reports.read | verified-local |
| report.getWorkday | GET /api/v1/reports/workdays/{workdayId} | Tawsel human session | personalSession OR companySession | reports.read | verified-local |
| report.listWorkdays | GET /api/v1/reports/workdays | Tawsel human session | personalSession OR companySession | reports.read | verified-local |
| return.checkConfirmation | POST /api/v1/returns/requests/{requestId}/confirmation | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| return.getRequest | GET /api/v1/returns/requests/{requestId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| return.getResult | GET /api/v1/returns/actions/{actionId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| return.listSourceBranchGroups | GET /api/v1/returns/groups | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| return.requestHandover | POST /api/v1/returns/request | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| round.end | POST /api/v1/closure/round | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| round.getCurrent | GET /api/v1/rounds/current | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| round.getStartResult | GET /api/v1/rounds/actions/{actionId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| round.prepareStart | POST /api/v1/rounds/readiness | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| round.start | POST /api/v1/rounds/start | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| routing.getVehicleProfiles | GET /api/v1/routing/profiles | Tawsel human session | personalSession OR companySession | planning.manage | verified-local |
| session.getContext | GET /api/session/context | Tawsel human session | companySession OR personalSession | authenticated | verified-local |
| session.logout | POST /api/session/logout | Tawsel human session | companySession OR personalSession | authenticated | verified-local |
| session.refresh | POST /api/session/refresh | Tawsel human session | companySession OR personalSession | authenticated | verified-local |
| sync.getEvidenceReceipt | GET /api/v1/evidence/{actionId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| sync.listConflicts | GET /api/v1/sync/conflicts | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| sync.submitActions | POST /api/v1/sync/actions | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| task.activateDeferred | POST /api/v1/eligibility/activate | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| task.createIndependent | POST /api/v1/independent/tasks | Tawsel human session | personalSession | execution.own | verified-local |
| task.deferWhole | POST /api/v1/eligibility/defer | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| task.getEligibility | GET /api/v1/eligibility/rounds/{roundId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| task.getEligibilityAction | GET /api/v1/eligibility/actions/{actionId} | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| task.getIndependent | GET /api/v1/independent/tasks/{taskId} | Tawsel human session | personalSession | execution.own | verified-local |
| task.listIndependent | GET /api/v1/independent/tasks | Tawsel human session | personalSession | execution.own | verified-local |
| task.retryWhole | POST /api/v1/eligibility/retry | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| task.reviseIndependent | PUT /api/v1/independent/tasks/{taskId} | Tawsel human session | personalSession | execution.own | verified-local |
| task.setDriverUrgency | POST /api/v1/eligibility/urgency | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| workday.end | POST /api/v1/closure/day | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| workday.getCarryForward | GET /api/v1/workdays/{workdayId}/carry-forward | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| workday.getSummary | GET /api/v1/workdays/{workdayId}/summary | Tawsel human session | companySession OR personalSession | execution.own | verified-local |
| integration.bindSource | POST /api/v1/provisioning/commands/integration.bindSource | Tawsel operator bootstrap | ProvisioningOperator | integration.manage | verified-local |
| account.beginRecovery | POST /api/session/recover | Tawsel public/account entry | public | public | verified-local |
| account.registerIndependent | POST /api/session/register | Tawsel public/account entry | public | public | verified-local |
| session.beginLogin | POST /api/session/login | Tawsel public/account entry | public | public | verified-local |
| session.bootstrap | GET /api/session/bootstrap | Tawsel public/account entry | public | public | verified-local |
| session.completeLogin | GET /api/session/callback | Tawsel public/account entry | public | public | verified-local |
| session.resolveCompany | POST /api/session/company | Tawsel public/account entry | public | public | verified-local |

## Closed emitted-event payload mapping

Use this list for sender event types, not the broader generic envelope or fixture catalog.

| Event type | Kind | Payload version | Original payload reference (relative to contracts/events/) |
| --- | --- | --- | --- |
| provisioning.changed | transition | 1.0.0 | ../provisioning.schema.json#/$defs/ProvisioningChanged |
| task.snapshotAccepted | transition | 1.0.0 | ../b2b-intake.schema.json#/$defs/ChangedEvent |
| assignment.prepared | transition | 1.0.0 | ../b2b-intake.schema.json#/$defs/ChangedEvent |
| assignment.received | transition | 1.0.0 | ../b2b-intake.schema.json#/$defs/ChangedEvent |
| assignment.withdrawn | transition | 1.0.0 | ../b2b-intake.schema.json#/$defs/ChangedEvent |
| assignment.reassigned | transition | 1.0.0 | ../b2b-intake.schema.json#/$defs/ChangedEvent |
| task.urgencyChanged | transition | 1.0.0 | ../b2b-intake.schema.json#/$defs/ChangedEvent |
| dispatch.createdFromReceipt | transition | 1.0.0 | ../b2b-intake.schema.json#/$defs/ChangedEvent |
| location.pinConfirmed | transition | 1.0.0 | ../location.schema.json#/$defs/ConfirmedEvent |
| plan.revisionPublished | transition | 1.0.0 | ../planning.schema.json#/$defs/PublishedEvent |
| round.started | transition | 1.0.0 | ../round-start.schema.json#/$defs/StartedEvent |
| current.headingSelected | transition | 1.0.0 | ../current-activity.schema.json#/$defs/HeadingEvent |
| current.arrivalRecorded | transition | 1.0.0 | ../current-activity.schema.json#/$defs/ArrivalEvent |
| outcome.recorded | transition | 1.0.0 | ../outcomes.schema.json#/$defs/Event |
| task.deferred | transition | 1.0.0 | ../eligibility.schema.json#/$defs/Event |
| task.retryAdmitted | transition | 1.0.0 | ../eligibility.schema.json#/$defs/Event |
| task.deferredActivated | transition | 1.0.0 | ../eligibility.schema.json#/$defs/Event |
| task.driverUrgencyChanged | transition | 1.0.0 | ../eligibility.schema.json#/$defs/Event |
| round.ended | transition | 1.0.0 | ../workday-closure.schema.json#/$defs/Event |
| workday.ended | transition | 1.0.0 | ../workday-closure.schema.json#/$defs/Event |
| return.requested | transition | 1.0.0 | ../returns.schema.json#/$defs/RequestedEvent |
| return.subsetReceived | transition | 1.0.0 | ../returns.schema.json#/$defs/ReceivedEvent |
| return.dispositionRecorded | transition | 1.0.0 | ../returns.schema.json#/$defs/DispositionEvent |
| branch.roundInterrupted | transition | 1.0.0 | ../branch-activity.schema.json#/$defs/Event |
| branch.arrivalRecorded | transition | 1.0.0 | ../branch-activity.schema.json#/$defs/Event |
| branch.roundResumed | transition | 1.0.0 | ../branch-activity.schema.json#/$defs/Event |
| outcome.corrected | transition | 1.0.0 | ../corrections.schema.json#/$defs/Event |

## Original file: contracts/openapi.yaml

SHA-256: `ceb8d0e127d55938439c0ff14c19ca096ebc58cb47b662057407eeb6de70736f` · Bytes: 233705.

<!-- SOURCE-BEGIN contracts/openapi.yaml -->
````yaml
openapi: 3.1.1
info:
  title: Tawsel public contract — identity, intake, planning and execution
  version: 0.1.0
  description: P07–P26 locally implemented identity, intake, planning, execution, closure, device
    takeover, source returns, branch resume/redispatch and bounded driver correction/adoption.
    Evidence distinguishes PostgreSQL and HTTP from provider fixtures. Coherent monitoring and
    history, signed durable sender and independent receiver projection are implemented. Full offline
    capture and native ERP source UI remain later phases.
  license:
    name: Private development contract; no public release
jsonSchemaDialect: https://json-schema.org/draft/2020-12/schema
x-lifecycle: implemented
x-owner-phase: 2
paths:
  /api/v1/integration/commands/integration.configureWebhook:
    post:
      operationId: integration.configureWebhook
      summary: Authorize callback destination and recipient network restrictions.
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      responses:
        "200":
          description: Scoped durable result; receipt is distinct from projection application
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OutboxConfigureWebhookCommand"
  /api/v1/integration/commands/integration.rotateSigningKey:
    post:
      operationId: integration.rotateSigningKey
      summary: Rotate integration-scoped webhook secret/key ID with overlap.
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      responses:
        "200":
          description: Scoped durable result; receipt is distinct from projection application
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OutboxRotateSigningKeyCommand"
  /api/v1/integration/commands/integration.retryDelivery:
    post:
      operationId: integration.retryDelivery
      summary: Controlled retry retaining committed event identity.
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      responses:
        "200":
          description: Scoped durable result; receipt is distinct from projection application
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OutboxRetryDeliveryCommand"
  /api/v1/integration/deliveries:
    get:
      operationId: integration.getDeliveryStatus
      summary: Read outbound pending/sending/received/failed independently of application.
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      responses:
        "200":
          description: Scoped durable result; receipt is distinct from projection application
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutboxQueue"
        "400":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
      parameters:
        - in: query
          name: limit
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
        - in: query
          name: cursor
          required: false
          schema:
            type: string
            format: uuid
  /api/v1/integration/replay:
    get:
      operationId: integration.replayEvents
      summary: Scoped aggregate sequence replay with explicit retained-window/expired
        status.
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      responses:
        "200":
          description: Scoped durable result; receipt is distinct from projection application
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutboxReplay"
        "400":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "410":
          description: Retained history unavailable; use scoped checkpoint and preserve
            historical gap
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
      parameters:
        - in: query
          name: aggregateType
          required: true
          schema:
            enum:
              - task
              - assignment
              - trip
              - workday
              - return-request
              - integration
        - in: query
          name: aggregateId
          required: true
          schema:
            type: string
            format: uuid
        - in: query
          name: afterSequence
          required: false
          schema:
            type: integer
            minimum: 0
            maximum: 9007199254740991
        - in: query
          name: limit
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
  /api/v1/integration/deliveries/{eventId}:
    get:
      operationId: integration.getDeliveryDetail
      summary: Inspect one scoped delivery and retained attempts
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      parameters:
        - in: path
          name: eventId
          required: true
          schema:
            type: string
            format: uuid
        - in: query
          name: beforeAttempt
          required: false
          schema:
            type: integer
            minimum: 1
        - in: query
          name: limit
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
      responses:
        "200":
          description: Scoped delivery and attempt history
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutboxDetail"
        "400":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Scoped protocol error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/session/company:
    post:
      operationId: session.resolveCompany
      summary: Resolve company code to safe login context; company selection grants no authority.
      tags:
        - Sessions
      security: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CompanyResponse"
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CompanyRequest"
      parameters:
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
        - name: Origin
          in: header
          required: true
          schema:
            type: string
            format: uri
  /api/session/login:
    post:
      operationId: session.beginLogin
      summary: Begin OIDC authorization code / PKCE login.
      description: Optional expectedAccount with reauthenticate=true restricts the verified callback to the server-resolved account, including after cookie loss. It grants no authentication or execution authority. Retain queued work on any failure; deliberately switching accounts requires the browser's durable exit gate.
      tags:
        - Sessions
      security: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RedirectResponse"
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/LoginRequest"
      parameters:
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
        - name: Origin
          in: header
          required: true
          schema:
            type: string
            format: uri
  /api/session/register:
    post:
      operationId: account.registerIndependent
      summary: Register a separate B2C phone/password identity with recovery email.
      tags:
        - Sessions
      security: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RedirectResponse"
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/LoginRequest"
      parameters:
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
        - name: Origin
          in: header
          required: true
          schema:
            type: string
            format: uri
  /api/session/recover:
    post:
      operationId: account.beginRecovery
      summary: Initiate email recovery without account enumeration.
      tags:
        - Sessions
      security: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RedirectResponse"
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/LoginRequest"
      parameters:
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
        - name: Origin
          in: header
          required: true
          schema:
            type: string
            format: uri
  /api/session/callback:
    get:
      operationId: session.completeLogin
      summary: Validate OIDC callback and establish independent Tawsel session.
      tags:
        - Sessions
      security: []
      responses:
        "302":
          description: Fixed same-origin account destination or safe login error; never a request-selected
            redirect.
          headers:
            Location:
              schema:
                type: string
                format: uri
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      parameters:
        - name: state
          in: query
          required: true
          schema:
            type: string
            minLength: 43
            maxLength: 43
        - name: code
          in: query
          required: false
          schema:
            type: string
            minLength: 1
            maxLength: 2048
        - name: iss
          in: query
          required: false
          schema:
            type: string
            maxLength: 2048
        - name: session_state
          in: query
          required: false
          schema:
            type: string
            maxLength: 512
        - name: error
          in: query
          required: false
          schema:
            type: string
            maxLength: 128
        - name: error_description
          in: query
          required: false
          schema:
            type: string
            maxLength: 1024
  /api/session/context:
    get:
      operationId: session.getContext
      summary: Read current issuer-validated session and P06 access context. Display fields are never
        request authority.
      tags:
        - Sessions
      security:
        - companySession: []
        - personalSession: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionContext"
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            $ref: "#/components/schemas/AccountKind"
  /api/account/status:
    get:
      operationId: account.getStatus
      summary: Read own activation/recovery state.
      tags:
        - Sessions
      security:
        - companySession: []
        - personalSession: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionContext"
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            $ref: "#/components/schemas/AccountKind"
  /api/session/refresh:
    post:
      operationId: session.refresh
      summary: Refresh authenticated backend session; no tokens in URLs.
      tags:
        - Sessions
      security:
        - companySession: []
        - personalSession: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SessionContext"
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/KindRequest"
      parameters:
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
        - name: Origin
          in: header
          required: true
          schema:
            type: string
            format: uri
  /api/session/logout:
    post:
      operationId: session.logout
      summary: End session; P35 adds durable pending-action/account-switch guards.
      tags:
        - Sessions
      security:
        - companySession: []
        - personalSession: []
      responses:
        "204":
          description: Local session ended. No global ERP logout.
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/KindRequest"
      parameters:
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
        - name: Origin
          in: header
          required: true
          schema:
            type: string
            format: uri
  /api/session/bootstrap:
    get:
      operationId: session.bootstrap
      summary: Issue browser-bound CSRF token; grants no account access.
      tags:
        - Sessions
      security: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/BootstrapResponse"
        "400":
          description: Invalid input or OIDC response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "401":
          description: Session expired; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "403":
          description: CSRF or current access denied
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "429":
          description: Rate limited
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
        "503":
          description: Issuer unavailable; retain local evidence
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthError"
  /api/v1/independent/tasks:
    get:
      operationId: task.listIndependent
      summary: List the authenticated independent driver's own persisted tasks.
      tags:
        - Independent intake
      security:
        - personalSession: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 50
            default: 20
        - name: cursor
          in: query
          schema:
            type: string
            minLength: 1
            maxLength: 512
      responses:
        "200":
          description: Own tasks only; unresolved addresses remain visible and non-executable.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IndependentTaskList"
        "400": &a1
          description: Validation, session or scoped-access failure.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "401": *a1
        "403": *a1
    post:
      operationId: task.createIndependent
      summary: Persist one simple task for the authenticated independent driver.
      tags:
        - Independent intake
      security:
        - personalSession: []
      parameters: &a2
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
        - name: Origin
          in: header
          required: true
          schema:
            type: string
            format: uri
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateIndependentCommand"
      responses:
        "201":
          description: Durable idempotent command result containing the created task.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a1
        "401": *a1
        "403": *a1
        "409": *a1
  /api/v1/independent/tasks/{taskId}:
    parameters:
      - name: taskId
        in: path
        required: true
        schema:
          $ref: "#/components/schemas/Uuid"
    get:
      operationId: task.getIndependent
      summary: Inspect one own independent task without disclosing guessed cross-account IDs.
      tags:
        - Independent intake
      security:
        - personalSession: []
      responses:
        "200":
          description: Own task snapshot.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IndependentTask"
        "400": *a1
        "401": *a1
        "403": *a1
        "404": *a1
    put:
      operationId: task.reviseIndependent
      summary: Replace editable predeparture fields with an expected revision guard.
      tags:
        - Independent intake
      security:
        - personalSession: []
      parameters: *a2
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ReviseIndependentCommand"
      responses:
        "200":
          description: Durable idempotent command result containing the revised task.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a1
        "401": *a1
        "403": *a1
        "404": *a1
        "409": *a1
  /api/v1/provisioning/commands/integration.bindSource:
    post:
      operationId: integration.bindSource
      summary: Bootstrap authorized tenant/integration binding and supported protocol versions.
      tags:
        - ERP provisioning
      security:
        - ProvisioningOperator: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/BindSourceCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": &a3
          description: Safe validation/access/dependency failure
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "401": &a4
          description: Safe validation/access/dependency failure
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "403": &a5
          description: Safe validation/access/dependency failure
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "404": &a6
          description: Safe validation/access/dependency failure
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "409": &a7
          description: Version or command conflict; inspect retained receipt
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "503": &a8
          description: Safe validation/access/dependency failure
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
  /api/v1/provisioning/commands/integration.rotateCredential:
    post:
      operationId: integration.rotateCredential
      summary: Rotate scoped command credential with explicit overlap/recovery.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
        - ProvisioningOperator: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RotateCredentialCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/integration.disableSource:
    post:
      operationId: integration.disableSource
      summary: Disable source credentials without erasing audit or queued evidence.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DisableSourceCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/branch.provision:
    post:
      operationId: branch.provision
      summary: Apply versioned branch identity/location reference.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/BranchCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/branch.disable:
    post:
      operationId: branch.disable
      summary: Apply explicit versioned branch disable without deleting custody history.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DisableBranchCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/role.defineCapabilities:
    post:
      operationId: role.defineCapabilities
      summary: Apply versioned ERP role capability definition.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RoleCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/user.provision:
    post:
      operationId: user.provision
      summary: Bind ERP user reference to trusted issuer subject; no copied passwords.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UserCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/user.setRole:
    post:
      operationId: user.setRole
      summary: Assign exactly one role per company user.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UserRoleCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/user.setCapabilityExceptions:
    post:
      operationId: user.setCapabilityExceptions
      summary: Apply inherit/allow/deny overrides without bypassing resource scope.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UserExceptionsCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/user.setBranchMemberships:
    post:
      operationId: user.setBranchMemberships
      summary: Version branch membership; common effective capabilities across branches.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UserBranchesCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/user.disable:
    post:
      operationId: user.disable
      summary: Revoke access without resurrecting via stale source revision.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DisableUserCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/commands/driver.provisionReference:
    post:
      operationId: driver.provisionReference
      summary: Apply minimal execution driver/vehicle profile reference.
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DriverCommand"
      responses:
        "200":
          description: Durable command result; user acceptance is separate from issuer readiness
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/configuration:
    get:
      operationId: integration.getConfiguration
      summary: Discover this source, supported protocol and explicitly permitted service operations
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SourceConfiguration"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/provisioning/status:
    get:
      operationId: provisioning.getStatus
      summary: Read source-scoped current projection and separate issuer reconciliation status
      tags:
        - ERP provisioning
      security:
        - ProvisioningService: []
      parameters:
        - name: entity
          in: query
          required: true
          schema:
            enum:
              - source
              - branch
              - role
              - user
              - driver
        - name: externalId
          in: query
          required: true
          schema:
            $ref: ./common.schema.json#/$defs/ExternalId
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ProvisioningStatus"
        "400": *a3
        "401": *a4
        "403": *a5
        "404": *a6
        "409": *a7
        "503": *a8
  /api/v1/intake/commands/intake.submitSnapshot:
    post:
      operationId: intake.submitSnapshot
      summary: Accept generic source task/order/contact/location/content/policy revision.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/B2bSourceSnapshotCommand"
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": &a9
          description: Source validation, authorization or dependency error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                oneOf:
                  - $ref: "#/components/schemas/ActionResult"
                  - $ref: "#/components/schemas/Problem"
        "401": *a9
        "403": *a9
        "404": *a9
        "409": &a10
          description: Retained business rejection or idempotency conflict
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: "#/components/schemas/ActionResult"
                  - $ref: "#/components/schemas/Problem"
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "422": *a9
        "503": *a9
  /api/v1/intake/commands/intake.prepare:
    post:
      operationId: intake.prepare
      summary: Prepare upcoming work without driver receipt/custody.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/B2bPrepareCommand"
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a9
        "401": *a9
        "403": *a9
        "404": *a9
        "409": *a10
        "422": *a9
        "503": *a9
  /api/v1/intake/commands/assignment.receiveBatch:
    post:
      operationId: assignment.receiveBatch
      summary: Definitive ERP receipt assertion with all-or-none 50-stop admission.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/B2bReceiveBatchCommand"
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a9
        "401": *a9
        "403": *a9
        "404": *a9
        "409": *a10
        "422": *a9
        "503": *a9
  /api/v1/intake/commands/assignment.withdraw:
    post:
      operationId: assignment.withdraw
      summary: Ordinary predeparture withdrawal with history; no mandatory reason. Departure field guard
        exists; full start-race proof belongs to P15.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/B2bWithdrawCommand"
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a9
        "401": *a9
        "403": *a9
        "404": *a9
        "409": *a10
        "422": *a9
        "503": *a9
  /api/v1/intake/commands/assignment.reassignBeforeDeparture:
    post:
      operationId: assignment.reassignBeforeDeparture
      summary: Change predeparture driver and assignment generation; no live transfer.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/B2bReassignCommand"
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a9
        "401": *a9
        "403": *a9
        "404": *a9
        "409": *a10
        "422": *a9
        "503": *a9
  /api/v1/intake/commands/intake.setUrgencyBeforeDeparture:
    post:
      operationId: intake.setUrgencyBeforeDeparture
      summary: ERP priority update only before execution lock.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/B2bUrgencyCommand"
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": *a9
        "401": *a9
        "403": *a9
        "404": *a9
        "409": *a10
        "422": *a9
        "503": *a9
  /api/v1/intake/task:
    get:
      operationId: intake.getTask
      summary: Read current source snapshot, holder, readiness and dispatch identifiers.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      parameters:
        - in: query
          name: externalId
          required: true
          schema:
            type: string
            minLength: 1
            maxLength: 256
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/B2bTask"
        "400": *a9
        "401": *a9
        "403": *a9
        "404": *a9
        "409": *a10
        "422": *a9
        "503": *a9
  /api/v1/intake/tasks:
    get:
      operationId: intake.listTasks
      summary: List source-scoped held/prepared and unassigned/withdrawn work, filtered before pagination.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      parameters:
        - in: query
          name: state
          required: false
          schema:
            enum:
              - unassigned
              - prepared
              - held
              - withdrawn
        - in: query
          name: driverExternalId
          required: false
          schema:
            type: string
            minLength: 1
            maxLength: 256
        - in: query
          name: limit
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - in: query
          name: cursor
          required: false
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/B2bTaskList"
        "400": *a9
        "401": *a9
        "403": *a9
        "404": *a9
        "409": *a10
        "422": *a9
        "503": *a9
  /api/v1/intake/results/{actionId}:
    get:
      operationId: intake.getBatchResult
      summary: Recover durable accepted/rejected source results; 202 pending means no committed result is
        visible, not proof of receipt.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      parameters:
        - in: path
          name: actionId
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/B2bBatchResult"
        "202":
          description: No committed result visible; keep source command pending and retry the exact envelope.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/B2bBatchResult"
        "400": *a9
        "401": *a9
        "403": *a9
        "404": *a9
        "409": *a10
        "422": *a9
        "503": *a9
  /api/v1/locations:
    get:
      operationId: location.list
      tags:
        - Locations
      summary: Scoped focused location review list.
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
      responses:
        "200":
          description: Scoped result
          content:
            application/json:
              schema:
                $ref: ./location.schema.json#/$defs/List
        "400":
          description: Invalid request
        "403":
          description: Not authorized
        "404":
          description: Hidden or missing task
        "409":
          description: Revision or lifecycle conflict
        "503":
          description: Geocoder unavailable; retain current input and pin
  /api/v1/locations/{taskId}:
    get:
      operationId: location.getSnapshot
      tags:
        - Locations
      summary: Read original address and separate confirmed execution pin/revision.
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: taskId
          in: path
          required: true
          schema: &a11
            type: string
            format: uuid
      responses:
        "200":
          description: Scoped result
          content:
            application/json:
              schema:
                $ref: ./location.schema.json#/$defs/Snapshot
        "400":
          description: Invalid request
        "403":
          description: Not authorized
        "404":
          description: Hidden or missing task
        "409":
          description: Revision or lifecycle conflict
        "503":
          description: Geocoder unavailable; retain current input and pin
    put:
      operationId: location.confirmPin
      tags:
        - Locations
      summary: Authorized predeparture confirmation or assigned-driver execution correction.
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: taskId
          in: path
          required: true
          schema: *a11
      responses:
        "200":
          description: Scoped result
          content:
            application/json:
              schema:
                $ref: ./action-result.v1.schema.json
        "400":
          description: Invalid request
        "403":
          description: Not authorized
        "404":
          description: Hidden or missing task
        "409":
          description: Revision or lifecycle conflict
        "503":
          description: Geocoder unavailable; retain current input and pin
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: ./location.schema.json#/$defs/ConfirmCommand
  /api/v1/locations/{taskId}/candidates:
    post:
      operationId: location.searchCandidates
      tags:
        - Locations
      summary: Scoped Nominatim candidates with provenance; never GPS/accuracy percentage.
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: taskId
          in: path
          required: true
          schema: *a11
      responses:
        "200":
          description: Scoped result
          content:
            application/json:
              schema:
                $ref: ./location.schema.json#/$defs/Candidates
        "400":
          description: Invalid request
        "403":
          description: Not authorized
        "404":
          description: Hidden or missing task
        "409":
          description: Revision or lifecycle conflict
        "503":
          description: Geocoder unavailable; retain current input and pin
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: ./location.schema.json#/$defs/Search
  /api/v1/maps/configuration:
    get:
      operationId: map.getAssetConfiguration
      tags:
        - Locations
      summary: Read configured self-hosted style/archive/attribution; no invented map coverage.
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
      responses:
        "200":
          description: Scoped result
          content:
            application/json:
              schema:
                $ref: ./location.schema.json#/$defs/MapConfiguration
        "400":
          description: Invalid request
        "403":
          description: Not authorized
        "404":
          description: Hidden or missing task
        "409":
          description: Revision or lifecycle conflict
        "503":
          description: Geocoder unavailable; retain current input and pin
  /api/v1/routing/profiles:
    get:
      operationId: routing.getVehicleProfiles
      tags:
        - Routing
      summary: Read supported application modes; availability is not checked.
      description: Requires planning.manage or own-driver execution.own in the selected authenticated
        account. No provider URLs or runtime-health claim.
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
      responses:
        "200":
          description: Supported modes, not live verification.
          content:
            application/json:
              schema:
                $ref: ./routing.schema.json#/$defs/Profiles
        "400":
          description: Invalid account selection or query.
        "401":
          description: Session missing or expired.
        "403":
          description: Current capability denied.
        "503":
          description: Identity dependency unavailable.
  /api/v1/planning/commands/planning.saveDraft:
    post:
      operationId: planning.saveDraft
      tags:
        - Planning
      summary: Save or request a revisioned planning candidate
      security: &a12
        - companySession: []
        - personalSession: []
      parameters:
        - &a13
          name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PlanningSaveDraftCommand"
      responses:
        "202":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "401":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "403":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "404":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "409":
          description: Revision or idempotency conflict
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
  /api/v1/planning/commands/planning.requestPreview:
    post:
      operationId: planning.requestPreview
      tags:
        - Planning
      summary: Save or request a revisioned planning candidate
      security: *a12
      parameters:
        - *a13
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PlanningRequestPreviewCommand"
      responses:
        "202":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "401":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "403":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "404":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "409":
          description: Revision or idempotency conflict
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
  /api/v1/planning/commands/planning.requestReplan:
    post:
      operationId: planning.requestReplan
      tags:
        - Planning
      summary: Save or request a revisioned planning candidate
      security: *a12
      parameters:
        - *a13
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PlanningRequestReplanCommand"
      responses:
        "202":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "401":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "403":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "404":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "409":
          description: Revision or idempotency conflict
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
  /api/v1/planning/jobs/{jobId}:
    get:
      operationId: planning.getJob
      tags:
        - Planning
      summary: Read persisted planning status
      security: *a12
      parameters:
        - *a13
        - name: jobId
          in: path
          required: true
          schema: &a14
            $ref: common.schema.json#/$defs/Uuid
      responses:
        "200":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PlanningJob"
        "401":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "403":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "404":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
  /api/v1/planning/drivers/{driverId}/plans:
    get:
      operationId: planning.getPlan
      tags:
        - Planning
      summary: Read immutable draft and forecast history
      security: *a12
      parameters:
        - *a13
        - name: driverId
          in: path
          required: true
          schema: *a14
        - name: beforeRevision
          in: query
          schema:
            type: integer
            minimum: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 50
      responses:
        "200":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PlanningPlans"
        "401":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "403":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "404":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
  /api/v1/planning/commands/planning.setManualOrder:
    post:
      operationId: planning.setManualOrder
      tags:
        - Planning
      summary: Prepare an eligible manual order or select its first suggestion
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PlanningManualOrderCommand"
      responses:
        "200":
          description: Idempotent confirmed manual revision; no round start or computed road estimate.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "401":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "403":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "404":
          description: Durable result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
        "409":
          description: Revision or idempotency conflict
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IntakeError"
  /api/v1/rounds/readiness:
    post:
      operationId: round.prepareStart
      summary: round.prepareStart
      tags:
        - Round start
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - &a15
          name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RoundReadinessRequest"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RoundReadiness"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Sync, revision or lifecycle conflict; start business rejection is a retained
            ActionResult.
  /api/v1/rounds/start:
    post:
      operationId: round.start
      summary: round.start
      tags:
        - Round start
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - *a15
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RoundStartCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RoundStartActionResult"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Sync, revision or lifecycle conflict; start business rejection is a retained
            ActionResult.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RoundStartActionResult"
  /api/v1/rounds/current:
    get:
      operationId: round.getCurrent
      summary: round.getCurrent
      tags:
        - Round start
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - *a15
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RoundCurrent"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Sync, revision or lifecycle conflict; start business rejection is a retained
            ActionResult.
  /api/v1/rounds/actions/{actionId}:
    get:
      operationId: round.getStartResult
      summary: round.getStartResult
      tags:
        - Round start
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - *a15
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RoundActionStatus"
        "202":
          description: Unknown or uncommitted action; keep the original action pending.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RoundActionStatus"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Sync, revision or lifecycle conflict; start business rejection is a retained
            ActionResult.
  /api/v1/current/heading:
    post:
      operationId: current.selectHeading
      summary: current.selectHeading
      tags:
        - Current activity
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CurrentSelectHeadingCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentActionResult"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained activity, ownership, eligibility or relevant revision rejection. Query or
            retry the same stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentActionResult"
  /api/v1/current/arrival:
    post:
      operationId: current.recordArrival
      summary: current.recordArrival
      tags:
        - Current activity
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CurrentArrivalCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentActionResult"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained activity, ownership, eligibility or relevant revision rejection. Query or
            retry the same stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentActionResult"
  /api/v1/current/origin:
    post:
      operationId: current.correctOrigin
      summary: current.correctOrigin
      tags:
        - Current activity
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CurrentCorrectOriginCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentActionResult"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained activity, ownership, eligibility or relevant revision rejection. Query or
            retry the same stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentActionResult"
  /api/v1/current/rounds/{roundId}:
    get:
      operationId: current.getActivity
      summary: current.getActivity
      tags:
        - Current activity
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: roundId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentSnapshot"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Sync, revision or lifecycle conflict; start business rejection is a retained
            ActionResult.
  /api/v1/current/actions/{actionId}:
    get:
      operationId: current.getResult
      summary: current.getResult
      tags:
        - Current activity
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentActionStatus"
        "202":
          description: Unknown/uncommitted is pending, never acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CurrentActionStatus"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Sync, revision or lifecycle conflict; start business rejection is a retained
            ActionResult.
  /api/v1/outcomes/full:
    post:
      operationId: outcome.recordFull
      summary: Record full outcome with exact collection
      tags:
        - Outcomes
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OutcomeFullCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionResult"
        "400":
          description: Closed schema invalid, or retained quantity/collection rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionResult"
  /api/v1/outcomes/partial:
    post:
      operationId: outcome.recordPartial
      summary: Record partial outcome with exact collection
      tags:
        - Outcomes
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OutcomePartialCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionResult"
        "400":
          description: Closed schema invalid, or retained quantity/collection rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionResult"
  /api/v1/outcomes/refusal:
    post:
      operationId: outcome.recordRefusal
      summary: Record refusal outcome with exact collection
      tags:
        - Outcomes
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OutcomeRefusalCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionResult"
        "400":
          description: Closed schema invalid, or retained quantity/collection rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionResult"
  /api/v1/outcomes/no-answer:
    post:
      operationId: outcome.recordNoAnswer
      summary: Record noanswer outcome with exact collection
      tags:
        - Outcomes
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OutcomeNoAnswerCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionResult"
        "400":
          description: Closed schema invalid, or retained quantity/collection rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionResult"
  /api/v1/outcomes/rounds/{roundId}:
    get:
      operationId: outcome.getRound
      summary: Effective own-round outcomes and exact reported progress
      tags:
        - Outcomes
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: roundId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeSnapshot"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
  /api/v1/outcomes/actions/{actionId}:
    get:
      operationId: outcome.getResult
      summary: Recover retained outcome command by stable action ID
      tags:
        - Outcomes
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionStatus"
        "202":
          description: Unknown/uncommitted is pending, never acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutcomeActionStatus"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
  /api/v1/eligibility/defer:
    post:
      operationId: task.deferWhole
      summary: Change whole-work eligibility explicitly
      tags:
        - Eligibility
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/EligibilityDeferCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionResult"
        "400":
          description: Closed schema invalid, or retained eligibility rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionResult"
  /api/v1/eligibility/retry:
    post:
      operationId: task.retryWhole
      summary: Change whole-work eligibility explicitly
      tags:
        - Eligibility
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/EligibilityRetryCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionResult"
        "400":
          description: Closed schema invalid, or retained eligibility rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionResult"
  /api/v1/eligibility/activate:
    post:
      operationId: task.activateDeferred
      summary: Change whole-work eligibility explicitly
      tags:
        - Eligibility
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/EligibilityActivateCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionResult"
        "400":
          description: Closed schema invalid, or retained eligibility rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionResult"
  /api/v1/eligibility/urgency:
    post:
      operationId: task.setDriverUrgency
      summary: Change whole-work eligibility explicitly
      tags:
        - Eligibility
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/EligibilityUrgencyCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionResult"
        "400":
          description: Closed schema invalid, or retained eligibility rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionResult"
  /api/v1/eligibility/rounds/{roundId}:
    get:
      operationId: task.getEligibility
      summary: Read server-derived task eligibility and preserved transition history
      tags:
        - Eligibility
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: roundId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilitySnapshot"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
  /api/v1/eligibility/actions/{actionId}:
    get:
      operationId: task.getEligibilityAction
      summary: Recover retained eligibility command by stable action ID
      tags:
        - Eligibility
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionStatus"
        "202":
          description: Unknown/uncommitted is pending, never acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EligibilityActionStatus"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
  /api/v1/closure/round:
    post:
      operationId: round.end
      summary: End round explicitly with held unfinished work preserved.
      tags:
        - Workday closure
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            enum:
              - personal
              - company
      responses:
        "200":
          description: Authoritative accepted result or scoped read; closure implies no delivery, receipt or
            settlement.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ClosureActionResult"
        "202":
          description: No accepted closure yet. Keep original action pending; dependency replay or result
            recovery required.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ClosureActionStatus"
        "400":
          description: Invalid request.
        "403":
          description: Current authorization denied.
        "409":
          description: Lifecycle, revision, ownership or idempotency conflict; business rejection is retained.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ClosureEndRoundCommand"
  /api/v1/closure/day:
    post:
      operationId: workday.end
      summary: Close open workday/active round after resolving or pausing current; carry held work.
      tags:
        - Workday closure
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            enum:
              - personal
              - company
      responses:
        "200":
          description: Authoritative accepted result or scoped read; closure implies no delivery, receipt or
            settlement.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ClosureActionResult"
        "202":
          description: No accepted closure yet. Keep original action pending; dependency replay or result
            recovery required.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ClosureActionStatus"
        "400":
          description: Invalid request.
        "403":
          description: Current authorization denied.
        "409":
          description: Lifecycle, revision, ownership or idempotency conflict; business rejection is retained.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ClosureEndDayCommand"
  /api/v1/workdays/{workdayId}/summary:
    get:
      operationId: workday.getSummary
      summary: Basic explicit-workday outcome/collection summary with admission denominators.
      tags:
        - Workday closure
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            enum:
              - personal
              - company
        - name: workdayId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative accepted result or scoped read; closure implies no delivery, receipt or
            settlement.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ClosureSummary"
        "400":
          description: Invalid request.
        "403":
          description: Current authorization denied.
        "409":
          description: Lifecycle, revision, ownership or idempotency conflict; business rejection is retained.
  /api/v1/workdays/{workdayId}/carry-forward:
    get:
      operationId: workday.getCarryForward
      summary: Current held work for the workday holder; no per-day cloning or implicit retry.
      tags:
        - Workday closure
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            enum:
              - personal
              - company
        - name: workdayId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative accepted result or scoped read; closure implies no delivery, receipt or
            settlement.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ClosureCarryForward"
        "400":
          description: Invalid request.
        "403":
          description: Current authorization denied.
        "409":
          description: Lifecycle, revision, ownership or idempotency conflict; business rejection is retained.
  /api/v1/closure/actions/{actionId}:
    get:
      operationId: closure.getResult
      summary: Recover a retained closure result; unknown action remains pending.
      tags:
        - Workday closure
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            enum:
              - personal
              - company
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative accepted result or scoped read; closure implies no delivery, receipt or
            settlement.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ClosureActionStatus"
        "202":
          description: No accepted closure yet. Keep original action pending; dependency replay or result
            recovery required.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ClosureActionStatus"
        "400":
          description: Invalid request.
        "403":
          description: Current authorization denied.
        "409":
          description: Lifecycle, revision, ownership or idempotency conflict; business rejection is retained.
  /api/v1/devices/takeover:
    post:
      operationId: device.takeOver
      summary: device.takeOver
      description: Explicit online transfer to a different installation of the same authenticated driver;
        expected generation CAS; stable retry. Fetch snapshot before commands.
      tags:
        - Device ownership
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DeviceTakeoverCommand"
      responses:
        "200": &a16
          description: Durable receipt and business result are separate. Pending is not evidence receipt.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Account scope or CSRF denied
        "404":
          description: Resource unavailable
        "409": *a16
  /api/v1/devices/rounds/{roundId}:
    get:
      operationId: device.getContext
      summary: device.getContext
      description: Scoped view/owner state; no execution token is disclosed.
      tags:
        - Device ownership
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: roundId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: deviceId
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Durable receipt and business result are separate. Pending is not evidence receipt.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DeviceContext"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Account scope or CSRF denied
        "404":
          description: Resource unavailable
        "409":
          description: Lifecycle or ownership conflict
  /api/v1/devices/rounds/{roundId}/snapshot:
    get:
      operationId: device.getSnapshot
      summary: device.getSnapshot
      description: Download current confirmed activity/targets under the owner lock. Only the matching
        logical owner receives the generation snapshot token.
      tags:
        - Device ownership
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: roundId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: deviceId
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Durable receipt and business result are separate. Pending is not evidence receipt.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DeviceSnapshot"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Account scope or CSRF denied
        "404":
          description: Resource unavailable
        "409":
          description: Lifecycle or ownership conflict
  /api/v1/actions/{actionId}:
    get:
      operationId: action.getResult
      summary: action.getResult
      description: P20 scoped execution/takeover action result. Other operation families keep their
        feature adapters; unknown action IDs return pending without leaking another account.
      tags:
        - Device ownership
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200": &a17
          description: Durable receipt and business result are separate. Pending is not evidence receipt.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DeviceActionStatus"
        "202": *a17
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Account scope or CSRF denied
        "404":
          description: Resource unavailable
        "409":
          description: Lifecycle or ownership conflict
  /api/v1/evidence/former-device:
    post:
      operationId: evidence.receiveFormerDevice
      summary: evidence.receiveFormerDevice
      description: Durably receive an original former-device envelope, without applying business state.
        Exact repeat is duplicate and returns its established result.
      tags:
        - Device ownership
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DeviceFormerSubmission"
      responses:
        "200": &a18
          description: Durable receipt and business result are separate. Pending is not evidence receipt.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DeviceEvidenceSubmissionResult"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Account scope or CSRF denied
        "404":
          description: Resource unavailable
        "409": *a18
  /api/v1/evidence/{actionId}:
    get:
      operationId: sync.getEvidenceReceipt
      summary: sync.getEvidenceReceipt
      description: Authenticated source/driver evidence and dynamically checked recovery constraints. A
        durable receipt is not business acceptance or an adoption permission. No P20 adoption
        endpoint.
      tags:
        - Device ownership
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: deviceId
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Durable receipt and business result are separate. Pending is not evidence receipt.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DeviceEvidence"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Account scope or CSRF denied
        "404":
          description: Resource unavailable
        "409":
          description: Lifecycle or ownership conflict
  /api/v1/returns/request:
    post:
      operationId: return.requestHandover
      tags:
        - Returns
      summary: Driver offers source-branch pieces; request is not receipt/stock.
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - company
              - personal
          description: Company only; personal is rejected by domain rules.
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ReturnRequestCommand"
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnActionResult"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/returns/groups:
    get:
      operationId: return.listSourceBranchGroups
      tags:
        - Returns
      summary: Group held return-required portions by originating branch.
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - company
              - personal
          description: Company only; personal is rejected by domain rules.
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnGroups"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/returns/requests/{requestId}:
    get:
      operationId: return.getRequest
      tags:
        - Returns
      summary: Scoped request, offered/received/unresolved subsets and revisions.
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - company
              - personal
          description: Company only; personal is rejected by domain rules.
        - name: requestId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnRequestView"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/returns/actions/{actionId}:
    get:
      operationId: return.getResult
      tags:
        - Returns
      summary: Recover own driver offer command; pending is not physical receipt.
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - company
              - personal
          description: Company only; personal is rejected by domain rules.
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnActionStatus"
        "202":
          description: No committed action result visible.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnActionStatus"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/returns/requests/{requestId}/confirmation:
    post:
      operationId: return.checkConfirmation
      tags:
        - Returns
      summary: Read server confirmation for an explicit cumulative claimed subset. Waiting never grants
        resume; P22 rechecks under lock.
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - company
              - personal
          description: Company only; personal is rejected by domain rules.
        - name: requestId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ReturnConfirmationQuery"
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnConfirmation"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/erp/returns/commands/return.confirmSubsetReceipt:
    post:
      operationId: return.confirmSubsetReceipt
      tags:
        - Returns
      summary: Native ERP trusted actor confirms actually received requested subset.
      security:
        - ProvisioningService: []
      parameters: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ReturnReceiveCommand"
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnActionResult"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/erp/returns/commands/return.recordDisposition:
    post:
      operationId: return.recordDisposition
      tags:
        - Returns
      summary: ERP loss/damage disposition distinct from physical receipt and inventory.
      security:
        - ProvisioningService: []
      parameters: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ReturnDisposeCommand"
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnActionResult"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/erp/returns/pending:
    get:
      operationId: return.listPending
      tags:
        - Returns
      summary: Native source-scoped pending requests for one driver and originating branch, paginated in
        pages of 100 without a returns quota.
      security:
        - ProvisioningService: []
      parameters:
        - name: driverId
          in: query
          required: true
          schema:
            type: string
            format: uuid
        - name: sourceBranchId
          in: query
          required: true
          schema:
            type: string
            format: uuid
        - name: cursor
          in: query
          required: false
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnRequestList"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/erp/returns/requests/{requestId}:
    get:
      operationId: return.getNativeRequest
      tags:
        - Returns
      summary: Native source-scoped accurate requested/received/unresolved/lost/damaged state per item.
      security:
        - ProvisioningService: []
      parameters:
        - name: requestId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnRequestView"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/erp/returns/actions/{actionId}:
    get:
      operationId: return.getNativeResult
      tags:
        - Returns
      summary: Recover durable native source receipt/disposition command results; 202 means unknown pending.
      security:
        - ProvisioningService: []
      parameters:
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnActionStatus"
        "202":
          description: No committed action result visible.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReturnActionStatus"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/branches/commands/branch.interruptRound:
    post:
      operationId: branch.interruptRound
      tags:
        - Returns
      summary: Pause heading sequence and enter source-branch service within same round/capacity.
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - company
              - personal
          description: Company only; personal is rejected by domain rules.
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/BranchInterruptCommand"
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/branches/commands/branch.recordArrival:
    post:
      operationId: branch.recordArrival
      tags:
        - Returns
      summary: Explicit arrival at the source-bound branch; records physical origin without inferring
        receipt.
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - company
              - personal
          description: Company only; personal is rejected by domain rules.
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/BranchArrivalCommand"
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/branches/commands/branch.resumeRound:
    post:
      operationId: branch.resumeRound
      tags:
        - Returns
      summary: Resume retained sequence after authoritative claimed-subset receipt; no whole-batch gate.
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - company
              - personal
          description: Company only; personal is rejected by domain rules.
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/BranchResumeCommand"
      responses:
        "200":
          description: Committed result or authoritative scoped read.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Invalid canonical input.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Authentication required.
        "403":
          description: Scope/capability/CSRF denied.
        "404":
          description: Resource unavailable.
        "409":
          description: Stale item, wrong source branch, incompatible lifecycle or excess quantity. Held goods
            are unchanged.
        "503":
          description: No assumed receipt. Recover the action and retry the same envelope.
  /api/v1/intake/commands/dispatch.createFromReceipt:
    post:
      operationId: dispatch.createFromReceipt
      summary: Create fresh execution from compatible actual receipt; preserve shipment and old custody.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/B2bRedispatchCommand"
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400": &a19
          description: Source validation, authorization or dependency error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                oneOf:
                  - $ref: "#/components/schemas/ActionResult"
                  - $ref: "#/components/schemas/Problem"
        "401": *a19
        "403": *a19
        "404": *a19
        "409":
          description: Retained business rejection or idempotency conflict
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: "#/components/schemas/ActionResult"
                  - $ref: "#/components/schemas/Problem"
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "422": *a19
        "503": *a19
  /api/v1/intake/cycles:
    get:
      operationId: dispatch.listCycles
      summary: List preserved source shipment cycles and their frozen snapshots.
      tags:
        - ERP intake
      security:
        - ProvisioningService: []
      parameters:
        - in: query
          name: externalId
          required: true
          schema:
            type: string
            minLength: 1
            maxLength: 256
        - name: cursor
          in: query
          required: false
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Canonical response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/B2bCycleList"
        "400": &a20
          description: Source validation, authorization or dependency error
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
            application/json:
              schema:
                oneOf:
                  - $ref: "#/components/schemas/ActionResult"
                  - $ref: "#/components/schemas/Problem"
        "401": *a20
        "403": *a20
        "404": *a20
        "409":
          description: Retained business rejection or idempotency conflict
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: "#/components/schemas/ActionResult"
                  - $ref: "#/components/schemas/Problem"
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "422": *a20
        "503": *a20
  /api/v1/corrections/outcomes:
    post:
      operationId: outcome.correct
      summary: Driver appends correction in open day before dependent receipt/redispatch.
      tags:
        - Corrections
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CorrectionCorrectCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CorrectionActionResult"
        "400":
          description: Closed schema invalid, or retained quantity/collection rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CorrectionActionResult"
  /api/v1/corrections/adopt:
    post:
      operationId: evidence.adoptCompatible
      summary: Current owner adopts eligible former-device evidence under correction bounds.
      tags:
        - Corrections
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DeviceAdoptionCommand"
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CorrectionActionResult"
        "400":
          description: Closed schema invalid, or retained quantity/collection rejection (ActionResult).
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
        "409":
          description: Retained ownership, current activity, eligibility, outcome or relevant source revision
            rejection; stable action ID.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CorrectionActionResult"
  /api/v1/corrections/attempts/{attemptId}:
    get:
      operationId: outcome.getCorrectionAvailability
      summary: Read original/effective correction eligibility and permitted next steps.
      tags:
        - Corrections
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: attemptId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: deviceId
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CorrectionAvailability"
        "202":
          description: Unknown/uncommitted is pending, never acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CorrectionAvailability"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
  /api/v1/corrections/actions/{actionId}:
    get:
      operationId: correction.getResult
      summary: Recover the same driver correction result by action ID.
      tags:
        - Corrections
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: actionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Authoritative response; pending is not acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CorrectionActionStatus"
        "202":
          description: Unknown/uncommitted is pending, never acceptance.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CorrectionActionStatus"
        "400":
          description: Invalid request
        "401":
          description: Session required
        "403":
          description: Current scope or CSRF denied
  /api/v1/monitoring/drivers/{id}:
    get:
      operationId: monitoring.getDriverSnapshot
      summary: Coherent authorized driver read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a21
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringSnapshot"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a21
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/monitoring/trips/{id}:
    get:
      operationId: monitoring.getTripSnapshot
      summary: Coherent authorized trip read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a22
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringSnapshot"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a22
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/monitoring/tasks/{id}/history:
    get:
      operationId: monitoring.getTaskHistory
      summary: Coherent authorized task read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a23
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringHistory"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a23
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/monitoring/workdays/{id}/history:
    get:
      operationId: monitoring.getWorkdayHistory
      summary: Coherent authorized workday read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a24
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringHistory"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a24
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/monitoring/actions/{id}:
    get:
      operationId: monitoring.getAction
      summary: Coherent authorized action read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - companySession: []
        - personalSession: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
        - name: sourceId
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a25
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringActionSnapshot"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a25
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/erp/monitoring/drivers/{id}:
    get:
      operationId: integration.getExecutionProjection
      summary: Coherent authorized driver read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - ProvisioningService: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a26
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringSnapshot"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a26
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/erp/monitoring/trips/{id}:
    get:
      operationId: integration.getTripProjection
      summary: Coherent authorized trip read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - ProvisioningService: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a27
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringSnapshot"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a27
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/erp/monitoring/tasks/{id}/history:
    get:
      operationId: integration.getTaskHistory
      summary: Coherent authorized task read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - ProvisioningService: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a28
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringHistory"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a28
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/erp/monitoring/workdays/{id}/history:
    get:
      operationId: integration.getWorkdayHistory
      summary: Coherent authorized workday read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - ProvisioningService: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a29
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringHistory"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a29
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/erp/monitoring/actions/{id}:
    get:
      operationId: integration.getMonitoringAction
      summary: Coherent authorized action read; source-safe counters/history, conditional revision and
        refresh timing. No sender/application claim.
      tags:
        - Monitoring
      security:
        - ProvisioningService: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: branchId
          in: query
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
        - name: If-None-Match
          in: header
          schema:
            type: string
        - name: sourceId
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: One coherent authorized snapshot. Revisions compare only within scopeKey.
          headers: &a30
            ETag:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Scope:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Snapshot-Revision:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
            X-Refreshed-At:
              schema:
                type: string
              description: Scoped validator/revision and successful server refresh metadata.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/MonitoringActionSnapshot"
        "304":
          description: Unchanged authorized meaning; retain previous body and refresh metadata.
          headers: *a30
        "400":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "404":
          description: Hidden or missing resource.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Cursor snapshot changed; restart pagination.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Read failed; retain last confirmed view.
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/integration/reconciliation:
    get:
      operationId: integration.getReconciliationSnapshot
      summary: getReconciliationSnapshot
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      parameters: &a1
        - in: query
          name: aggregateType
          required: true
          schema:
            enum:
              - task
              - assignment
              - trip
              - workday
              - return-request
              - integration
        - in: query
          name: aggregateId
          required: true
          schema:
            $ref: "#/components/schemas/Uuid"
      responses:
        "200":
          description: Scoped integration result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ConsumerSnapshot"
        "400":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "422":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/integration/commands/integration.reportAppliedCheckpoint:
    post:
      operationId: integration.reportAppliedCheckpoint
      summary: reportAppliedCheckpoint
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ConsumerReportCommand"
      responses:
        "200":
          description: Scoped integration result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ActionResult"
        "400":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "422":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/integration/applied-checkpoint:
    get:
      operationId: integration.getAppliedCheckpoint
      summary: getAppliedCheckpoint
      tags:
        - Signed delivery
      security:
        - ProvisioningService: []
      parameters: *a1
      responses:
        "200":
          description: Scoped integration result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ConsumerReportRead"
        "400":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "401":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "403":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "409":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "422":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
        "503":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/Problem"
  /api/v1/consumer/events:
    post:
      operationId: consumer.receiveSignedEvent
      summary: "External receiver: exact-byte signature validation and durable inbox
        receipt"
      tags:
        - Signed delivery
      servers:
        - url: https://receiver.example.invalid
          description: Consumer-owned base URL, not a Tawsel API route
      security:
        - WebhookSignature: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SenderEvent"
      responses:
        "200":
          description: Durable reference consumer result; receipt and application remain
            separate
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OutboxAcknowledgement"
        "400":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "401":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "403":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "409":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "422":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "503":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
  /api/v1/consumer/status:
    get:
      operationId: consumer.getStatus
      summary: "External receiver: read durable receipt and application checkpoint"
      tags:
        - Signed delivery
      servers:
        - url: https://receiver.example.invalid
          description: Consumer-owned base URL, not a Tawsel API route
      security:
        - ReceiverStatus: []
      parameters: *a1
      responses:
        "200":
          description: Durable reference consumer result; receipt and application remain
            separate
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ConsumerStatus"
        "400":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "401":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "403":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "409":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "422":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
        "503":
          description: Explicit rejected or unavailable operation
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ConsumerProblem"
  /api/v1/source/status:
    get:
      operationId: source.getCommandStatus
      summary: "External mock source: durable command status, distinct from execution projection"
      tags:
        - ERP intake
      servers:
        - url: https://receiver.example.invalid
          description: Consumer-owned base URL, not a Tawsel API route
      security:
        - ReceiverStatus: []
      responses:
        "200":
          description: Bounded source status; truncation is explicit
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SourceStatus"
        "401":
          description: Missing consumer status credential
        "503":
          description: Consumer unavailable
  /api/v1/sync/actions:
    post:
      operationId: sync.submitActions
      summary: Replay immutable device actions independently
      tags:
        - Device ownership
      security: &a1
        - companySession: []
        - personalSession: []
      parameters:
        - &a2
          name: kind
          in: query
          required: true
          schema:
            type: string
            enum:
              - personal
              - company
        - name: X-CSRF-Token
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SyncBatch"
      responses:
        "200":
          description: Per-action durable receipt is separate from business acceptance.
            Missing or invalid entries are not acknowledged.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SyncBatchResult"
        "400":
          description: Malformed batch
        "401":
          description: Fresh same-account authentication required
        "403":
          description: Session or CSRF denied
  /api/v1/sync/conflicts:
    get:
      operationId: sync.listConflicts
      summary: Inspect own driver received conflicts on the current phone
      tags:
        - Device ownership
      security: *a1
      parameters:
        - *a2
        - name: deviceId
          in: query
          required: true
          schema:
            type: string
            format: uuid
        - name: afterActionId
          in: query
          required: false
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Per-action durable receipt is separate from business acceptance.
            Missing or invalid entries are not acknowledged.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SyncConflicts"
        "401":
          description: Authentication required
        "403":
          description: Own driver access required
  /api/v1/reports/workdays:
    get:
      operationId: report.listWorkdays
      summary: Authorized effective report using stored action and forecast evidence
      tags: [Reporting]
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema: {"enum":["personal","company"]}
        - name: driverId
          in: query
          required: false
          schema: {"type":"string","format":"uuid"}
        - name: branchId
          in: query
          required: false
          schema: {"type":"string","format":"uuid"}
        - name: before
          in: query
          required: false
          schema: {"type":"string","format":"date-time"}
      responses:
        "200":
          description: One authorized coherent snapshot; local pending work is excluded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReportDayList"
        "400":
          description: Invalid filter
        "401":
          description: Session required
        "403":
          description: Report capability or branch denied
        "404":
          description: Workday or round unavailable in current scope
        "409":
          description: Requested snapshot changed; refresh before exporting
  /api/v1/reports/workdays/{workdayId}:
    get:
      operationId: report.getWorkday
      summary: Authorized effective report using stored action and forecast evidence
      tags: [Reporting]
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema: {"enum":["personal","company"]}
        - name: workdayId
          in: path
          required: true
          schema: {"type":"string","format":"uuid"}
        - name: driverId
          in: query
          required: false
          schema: {"type":"string","format":"uuid"}
        - name: branchId
          in: query
          required: false
          schema: {"type":"string","format":"uuid"}
        - name: roundId
          in: query
          required: false
          schema: {"type":"string","format":"uuid"}
        - name: outcome
          in: query
          required: false
          schema: {"enum":["full","partial","refused","no-answer","unfinished","deferred"]}
        - name: snapshotId
          in: query
          required: false
          schema: {"type":"string","pattern":"^[a-f0-9]{64}$"}
      responses:
        "200":
          description: One authorized coherent snapshot; local pending work is excluded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReportWorkday"
        "400":
          description: Invalid filter
        "401":
          description: Session required
        "403":
          description: Report capability or branch denied
        "404":
          description: Workday or round unavailable in current scope
        "409":
          description: Requested snapshot changed; refresh before exporting
  /api/v1/reports/workdays/{workdayId}/rounds/{roundId}/timing:
    get:
      operationId: report.getRoundTiming
      summary: Authorized effective report using stored action and forecast evidence
      tags: [Reporting]
      security:
        - personalSession: []
        - companySession: []
      parameters:
        - name: kind
          in: query
          required: true
          schema: {"enum":["personal","company"]}
        - name: workdayId
          in: path
          required: true
          schema: {"type":"string","format":"uuid"}
        - name: roundId
          in: path
          required: true
          schema: {"type":"string","format":"uuid"}
        - name: driverId
          in: query
          required: false
          schema: {"type":"string","format":"uuid"}
        - name: branchId
          in: query
          required: false
          schema: {"type":"string","format":"uuid"}
        - name: outcome
          in: query
          required: false
          schema: {"enum":["full","partial","refused","no-answer","unfinished","deferred"]}
        - name: snapshotId
          in: query
          required: false
          schema: {"type":"string","pattern":"^[a-f0-9]{64}$"}
      responses:
        "200":
          description: One authorized coherent snapshot; local pending work is excluded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ReportTimingSnapshot"
        "400":
          description: Invalid filter
        "401":
          description: Session required
        "403":
          description: Report capability or branch denied
        "404":
          description: Workday or round unavailable in current scope
        "409":
          description: Requested snapshot changed; refresh before exporting
components:
  schemas:
    ReportFilters:
      $ref: ./reporting.schema.json#/$defs/Filters
    ReportCounts:
      $ref: ./reporting.schema.json#/$defs/Counts
    ReportCollection:
      $ref: ./reporting.schema.json#/$defs/Collection
    ReportPieces:
      $ref: ./reporting.schema.json#/$defs/Pieces
    ReportReturn:
      $ref: ./reporting.schema.json#/$defs/Return
    ReportTime:
      $ref: ./reporting.schema.json#/$defs/Time
    ReportMeasurement:
      $ref: ./reporting.schema.json#/$defs/Measurement
    ReportForecastStop:
      $ref: ./reporting.schema.json#/$defs/ForecastStop
    ReportAttempt:
      $ref: ./reporting.schema.json#/$defs/Attempt
    ReportStopTiming:
      $ref: ./reporting.schema.json#/$defs/StopTiming
    ReportForecast:
      $ref: ./reporting.schema.json#/$defs/Forecast
    ReportBranchVisit:
      $ref: ./reporting.schema.json#/$defs/BranchVisit
    ReportRoundTiming:
      $ref: ./reporting.schema.json#/$defs/RoundTiming
    ReportRound:
      $ref: ./reporting.schema.json#/$defs/Round
    ReportWorkday:
      $ref: ./reporting.schema.json#/$defs/Workday
    ReportDayList:
      $ref: ./reporting.schema.json#/$defs/DayList
    ReportTimingSnapshot:
      $ref: ./reporting.schema.json#/$defs/TimingSnapshot
    SyncBatch:
      $ref: ./sync.schema.json#/$defs/Batch
    SyncEntry:
      $ref: ./sync.schema.json#/$defs/Entry
    SyncBatchResult:
      $ref: ./sync.schema.json#/$defs/BatchResult
    SyncConflicts:
      $ref: ./sync.schema.json#/$defs/Conflicts
    SourceStatus:
      $ref: ./source.schema.json#/$defs/Status
    ConsumerProblem:
      $ref: ./consumer.schema.json#/$defs/Problem
    ConsumerAggregate:
      $ref: ./consumer.schema.json#/$defs/Aggregate
    ConsumerState:
      $ref: ./consumer.schema.json#/$defs/State
    ConsumerCheckpoint:
      $ref: ./consumer.schema.json#/$defs/Checkpoint
    ConsumerStatus:
      $ref: ./consumer.schema.json#/$defs/Status
    ConsumerSnapshot:
      $ref: ./consumer.schema.json#/$defs/Snapshot
    ConsumerReportCommand:
      $ref: ./consumer.schema.json#/$defs/ReportCommand
    ConsumerReport:
      $ref: ./consumer.schema.json#/$defs/Report
    ConsumerReportRead:
      $ref: ./consumer.schema.json#/$defs/ReportRead
    OutboxConfigureWebhook:
      $ref: ./outbox.schema.json#/$defs/ConfigureWebhook
    OutboxRotateSigningKey:
      $ref: ./outbox.schema.json#/$defs/RotateSigningKey
    OutboxRetryDelivery:
      $ref: ./outbox.schema.json#/$defs/RetryDelivery
    OutboxConfiguration:
      $ref: ./outbox.schema.json#/$defs/Configuration
    OutboxKeyRotation:
      $ref: ./outbox.schema.json#/$defs/KeyRotation
    OutboxRetryResult:
      $ref: ./outbox.schema.json#/$defs/RetryResult
    OutboxAcknowledgement:
      $ref: ./outbox.schema.json#/$defs/Acknowledgement
    OutboxAttempt:
      $ref: ./outbox.schema.json#/$defs/Attempt
    OutboxDelivery:
      $ref: ./outbox.schema.json#/$defs/Delivery
    OutboxQueue:
      $ref: ./outbox.schema.json#/$defs/Queue
    OutboxDetail:
      $ref: ./outbox.schema.json#/$defs/Detail
    OutboxReplay:
      $ref: ./outbox.schema.json#/$defs/Replay
    OutboxConfigureWebhookCommand:
      $ref: ./outbox.schema.json#/$defs/ConfigureWebhookCommand
    OutboxRotateSigningKeyCommand:
      $ref: ./outbox.schema.json#/$defs/RotateSigningKeyCommand
    OutboxRetryDeliveryCommand:
      $ref: ./outbox.schema.json#/$defs/RetryDeliveryCommand
    SenderEvent:
      $ref: ./events/sender-event.v1.schema.json
    Uuid:
      $ref: ./common.schema.json#/$defs/Uuid
    SchemaVersion:
      $ref: ./common.schema.json#/$defs/SchemaVersion
    Revision:
      $ref: ./common.schema.json#/$defs/Revision
    Generation:
      $ref: ./common.schema.json#/$defs/Generation
    Sequence:
      $ref: ./common.schema.json#/$defs/Sequence
    PieceCount:
      $ref: ./common.schema.json#/$defs/PieceCount
    PositivePieceCount:
      $ref: ./common.schema.json#/$defs/PositivePieceCount
    UtcInstant:
      $ref: ./common.schema.json#/$defs/UtcInstant
    ExternalId:
      $ref: ./common.schema.json#/$defs/ExternalId
    OperationId:
      $ref: ./common.schema.json#/$defs/OperationId
    SourceReference:
      $ref: ./common.schema.json#/$defs/SourceReference
    Money:
      $ref: ./common.schema.json#/$defs/Money
    Coordinates:
      $ref: ./common.schema.json#/$defs/Coordinates
    ContactSnapshot:
      $ref: ./common.schema.json#/$defs/ContactSnapshot
    LocationSnapshot:
      $ref: ./common.schema.json#/$defs/LocationSnapshot
    TimeWindow:
      $ref: ./common.schema.json#/$defs/TimeWindow
    DeliveryRequirements:
      $ref: ./common.schema.json#/$defs/DeliveryRequirements
    DeliverySnapshot:
      $ref: ./common.schema.json#/$defs/DeliverySnapshot
    ResourceContext:
      $ref: ./common.schema.json#/$defs/ResourceContext
    Versions:
      $ref: ./common.schema.json#/$defs/Versions
    ClockEvidence:
      $ref: ./common.schema.json#/$defs/ClockEvidence
    Observation:
      $ref: ./common.schema.json#/$defs/Observation
    DeviceContext:
      $ref: ./device-ownership.schema.json#/$defs/Context
    IntegrationContext:
      $ref: ./common.schema.json#/$defs/IntegrationContext
    CommandContext:
      $ref: ./common.schema.json#/$defs/CommandContext
    EvidenceStatus:
      $ref: ./common.schema.json#/$defs/EvidenceStatus
    BusinessStatus:
      $ref: ./common.schema.json#/$defs/BusinessStatus
    DeliveryStatus:
      $ref: ./common.schema.json#/$defs/DeliveryStatus
    ApplicationStatus:
      $ref: ./common.schema.json#/$defs/ApplicationStatus
    ErrorCode:
      $ref: ./common.schema.json#/$defs/ErrorCode
    Problem:
      $ref: ./common.schema.json#/$defs/Problem
    Capability:
      $ref: ./common.schema.json#/$defs/Capability
    CapabilityEffect:
      $ref: ./common.schema.json#/$defs/CapabilityEffect
    CapabilityOverride:
      $ref: ./common.schema.json#/$defs/CapabilityOverride
    AccessContext:
      $ref: ./common.schema.json#/$defs/AccessContext
    PageRequest:
      $ref: ./common.schema.json#/$defs/PageRequest
    PageInfo:
      $ref: ./common.schema.json#/$defs/PageInfo
    ActionEnvelope:
      $ref: ./action-envelope.v1.schema.json
    EvidenceReceipt:
      $ref: ./evidence-receipt.v1.schema.json
    ActionResult:
      $ref: ./action-result.v1.schema.json
    EventEnvelope:
      $ref: ./events/envelope.v1.schema.json
    AccountKind:
      $ref: ./session.schema.json#/$defs/AccountKind
    KindRequest:
      $ref: ./session.schema.json#/$defs/KindRequest
    CompanyRequest:
      $ref: ./session.schema.json#/$defs/CompanyRequest
    CompanyResponse:
      $ref: ./session.schema.json#/$defs/CompanyResponse
    LoginRequest:
      $ref: ./session.schema.json#/$defs/LoginRequest
    RedirectResponse:
      $ref: ./session.schema.json#/$defs/RedirectResponse
    BootstrapResponse:
      $ref: ./session.schema.json#/$defs/BootstrapResponse
    CallbackQuery:
      $ref: ./session.schema.json#/$defs/CallbackQuery
    SessionContext:
      $ref: ./session.schema.json#/$defs/SessionContext
    AuthError:
      $ref: ./session.schema.json#/$defs/AuthError
    BindSource:
      $ref: ./provisioning.schema.json#/$defs/BindSource
    RotateCredential:
      $ref: ./provisioning.schema.json#/$defs/RotateCredential
    DisableSource:
      $ref: ./provisioning.schema.json#/$defs/DisableSource
    Branch:
      $ref: ./provisioning.schema.json#/$defs/Branch
    DisableBranch:
      $ref: ./provisioning.schema.json#/$defs/DisableBranch
    Role:
      $ref: ./provisioning.schema.json#/$defs/Role
    User:
      $ref: ./provisioning.schema.json#/$defs/User
    UserRole:
      $ref: ./provisioning.schema.json#/$defs/UserRole
    UserExceptions:
      $ref: ./provisioning.schema.json#/$defs/UserExceptions
    UserBranches:
      $ref: ./provisioning.schema.json#/$defs/UserBranches
    DisableUser:
      $ref: ./provisioning.schema.json#/$defs/DisableUser
    Driver:
      $ref: ./provisioning.schema.json#/$defs/Driver
    VerifiedService:
      $ref: ./provisioning.schema.json#/$defs/VerifiedService
    ProvisioningStatus:
      $ref: ./provisioning.schema.json#/$defs/ProvisioningStatus
    SourceConfiguration:
      $ref: ./provisioning.schema.json#/$defs/SourceConfiguration
    ProvisioningChanged:
      $ref: ./provisioning.schema.json#/$defs/ProvisioningChanged
    BindSourceCommand:
      $ref: ./provisioning.schema.json#/$defs/BindSourceCommand
    RotateCredentialCommand:
      $ref: ./provisioning.schema.json#/$defs/RotateCredentialCommand
    DisableSourceCommand:
      $ref: ./provisioning.schema.json#/$defs/DisableSourceCommand
    BranchCommand:
      $ref: ./provisioning.schema.json#/$defs/BranchCommand
    DisableBranchCommand:
      $ref: ./provisioning.schema.json#/$defs/DisableBranchCommand
    RoleCommand:
      $ref: ./provisioning.schema.json#/$defs/RoleCommand
    UserCommand:
      $ref: ./provisioning.schema.json#/$defs/UserCommand
    UserRoleCommand:
      $ref: ./provisioning.schema.json#/$defs/UserRoleCommand
    UserExceptionsCommand:
      $ref: ./provisioning.schema.json#/$defs/UserExceptionsCommand
    UserBranchesCommand:
      $ref: ./provisioning.schema.json#/$defs/UserBranchesCommand
    DisableUserCommand:
      $ref: ./provisioning.schema.json#/$defs/DisableUserCommand
    DriverCommand:
      $ref: ./provisioning.schema.json#/$defs/DriverCommand
    IndependentDestination:
      $ref: ./b2c-intake.schema.json#/$defs/IndependentDestination
    IndependentTask:
      $ref: ./b2c-intake.schema.json#/$defs/IndependentTask
    IndependentTaskList:
      $ref: ./b2c-intake.schema.json#/$defs/IndependentTaskList
    CreateIndependentCommand:
      $ref: ./b2c-intake.schema.json#/$defs/CreateIndependentCommand
    ReviseIndependentCommand:
      $ref: ./b2c-intake.schema.json#/$defs/ReviseIndependentCommand
    IntakeError:
      $ref: ./b2c-intake.schema.json#/$defs/IntakeError
    B2bMoney:
      $ref: ./b2b-intake.schema.json#/$defs/Money
    B2bLine:
      $ref: ./b2b-intake.schema.json#/$defs/Line
    B2bSourceSnapshot:
      $ref: ./b2b-intake.schema.json#/$defs/SourceSnapshot
    B2bAssignmentReference:
      $ref: ./b2b-intake.schema.json#/$defs/AssignmentReference
    B2bPrepare:
      $ref: ./b2b-intake.schema.json#/$defs/Prepare
    B2bReceiveBatch:
      $ref: ./b2b-intake.schema.json#/$defs/ReceiveBatch
    B2bWithdraw:
      $ref: ./b2b-intake.schema.json#/$defs/Withdraw
    B2bReassign:
      $ref: ./b2b-intake.schema.json#/$defs/Reassign
    B2bUrgency:
      $ref: ./b2b-intake.schema.json#/$defs/Urgency
    B2bSourceSnapshotCommand:
      $ref: ./b2b-intake.schema.json#/$defs/SourceSnapshotCommand
    B2bPrepareCommand:
      $ref: ./b2b-intake.schema.json#/$defs/PrepareCommand
    B2bReceiveBatchCommand:
      $ref: ./b2b-intake.schema.json#/$defs/ReceiveBatchCommand
    B2bWithdrawCommand:
      $ref: ./b2b-intake.schema.json#/$defs/WithdrawCommand
    B2bReassignCommand:
      $ref: ./b2b-intake.schema.json#/$defs/ReassignCommand
    B2bUrgencyCommand:
      $ref: ./b2b-intake.schema.json#/$defs/UrgencyCommand
    B2bTask:
      $ref: ./b2b-intake.schema.json#/$defs/Task
    B2bTaskList:
      $ref: ./b2b-intake.schema.json#/$defs/TaskList
    B2bBatchResult:
      $ref: ./b2b-intake.schema.json#/$defs/BatchResult
    B2bChangedEvent:
      $ref: ./b2b-intake.schema.json#/$defs/ChangedEvent
    LocationCandidate:
      $ref: ./location.schema.json#/$defs/Candidate
    LocationSearch:
      $ref: ./location.schema.json#/$defs/Search
    LocationCandidates:
      $ref: ./location.schema.json#/$defs/Candidates
    LocationConfirm:
      $ref: ./location.schema.json#/$defs/Confirm
    LocationPin:
      $ref: ./location.schema.json#/$defs/Pin
    LocationList:
      $ref: ./location.schema.json#/$defs/List
    LocationMapConfiguration:
      $ref: ./location.schema.json#/$defs/MapConfiguration
    LocationConfirmCommand:
      $ref: ./location.schema.json#/$defs/ConfirmCommand
    LocationExecutionSnapshot:
      $ref: ./location.schema.json#/$defs/Snapshot
    LocationConfirmedEvent:
      $ref: ./location.schema.json#/$defs/ConfirmedEvent
    RoutingMode:
      $ref: ./routing.schema.json#/$defs/Mode
    RoutingOrigin:
      $ref: ./routing.schema.json#/$defs/Origin
    RoutingEndpoint:
      $ref: ./routing.schema.json#/$defs/Endpoint
    RoutingJob:
      $ref: ./routing.schema.json#/$defs/Job
    RoutingOptimizationInput:
      $ref: ./routing.schema.json#/$defs/OptimizationInput
    RoutingRouteInput:
      $ref: ./routing.schema.json#/$defs/RouteInput
    RoutingTableInput:
      $ref: ./routing.schema.json#/$defs/TableInput
    RoutingLeg:
      $ref: ./routing.schema.json#/$defs/Leg
    RoutingRouteResult:
      $ref: ./routing.schema.json#/$defs/RouteResult
    RoutingTableCell:
      $ref: ./routing.schema.json#/$defs/TableCell
    RoutingTableResult:
      $ref: ./routing.schema.json#/$defs/TableResult
    RoutingVisit:
      $ref: ./routing.schema.json#/$defs/Visit
    RoutingOptimizationResult:
      $ref: ./routing.schema.json#/$defs/OptimizationResult
    RoutingFailure:
      $ref: ./routing.schema.json#/$defs/Failure
    RoutingProfiles:
      $ref: ./routing.schema.json#/$defs/Profiles
    PlanningRoutePolicy:
      $ref: ./planning.schema.json#/$defs/RoutePolicy
    PlanningStatus:
      $ref: ./planning.schema.json#/$defs/Status
    PlanningSettings:
      $ref: ./planning.schema.json#/$defs/Settings
    PlanningSaveDraft:
      $ref: ./planning.schema.json#/$defs/SaveDraft
    PlanningRequest:
      $ref: ./planning.schema.json#/$defs/Request
    PlanningMember:
      $ref: ./planning.schema.json#/$defs/Member
    PlanningInput:
      $ref: ./planning.schema.json#/$defs/Input
    PlanningJob:
      $ref: ./planning.schema.json#/$defs/Job
    PlanningDraftResult:
      $ref: ./planning.schema.json#/$defs/DraftResult
    PlanningForecastMember:
      $ref: ./planning.schema.json#/$defs/ForecastMember
    PlanningForecast:
      $ref: ./planning.schema.json#/$defs/Forecast
    PlanningPlan:
      $ref: ./planning.schema.json#/$defs/Plan
    PlanningPlans:
      $ref: ./planning.schema.json#/$defs/Plans
    PlanningPublishedEvent:
      $ref: ./planning.schema.json#/$defs/PublishedEvent
    PlanningSaveDraftCommand:
      $ref: ./planning.schema.json#/$defs/SaveDraftCommand
    PlanningRequestPreviewCommand:
      $ref: ./planning.schema.json#/$defs/RequestPreviewCommand
    PlanningRequestReplanCommand:
      $ref: ./planning.schema.json#/$defs/RequestReplanCommand
    PlanningManualOrder:
      $ref: ./planning.schema.json#/$defs/ManualOrder
    PlanningManualOrderCommand:
      $ref: ./planning.schema.json#/$defs/ManualOrderCommand
    PlanningManualResult:
      $ref: ./planning.schema.json#/$defs/ManualResult
    PlanningContinuation:
      $ref: ./planning.schema.json#/$defs/Continuation
    RoundReadinessRequest:
      $ref: ./round-start.schema.json#/$defs/ReadinessRequest
    RoundReadiness:
      $ref: ./round-start.schema.json#/$defs/Readiness
    RoundStart:
      $ref: ./round-start.schema.json#/$defs/Start
    RoundWorkday:
      $ref: ./round-start.schema.json#/$defs/Workday
    RoundRound:
      $ref: ./round-start.schema.json#/$defs/Round
    RoundCurrent:
      $ref: ./round-start.schema.json#/$defs/Current
    RoundStartResult:
      $ref: ./round-start.schema.json#/$defs/StartResult
    RoundStartCommand:
      $ref: ./round-start.schema.json#/$defs/StartCommand
    RoundActionStatus:
      $ref: ./round-start.schema.json#/$defs/ActionStatus
    RoundStartedEvent:
      $ref: ./round-start.schema.json#/$defs/StartedEvent
    RoundStartActionResult:
      $ref: ./round-start.schema.json#/$defs/StartActionResult
    CurrentActionTime:
      $ref: ./current-activity.schema.json#/$defs/ActionTime
    CurrentActivity:
      $ref: ./current-activity.schema.json#/$defs/Activity
    CurrentPhysicalOrigin:
      $ref: ./current-activity.schema.json#/$defs/PhysicalOrigin
    CurrentTarget:
      $ref: ./current-activity.schema.json#/$defs/Target
    CurrentSelectHeading:
      $ref: ./current-activity.schema.json#/$defs/SelectHeading
    CurrentArrival:
      $ref: ./current-activity.schema.json#/$defs/Arrival
    CurrentCorrectOrigin:
      $ref: ./current-activity.schema.json#/$defs/CorrectOrigin
    CurrentSnapshot:
      $ref: ./current-activity.schema.json#/$defs/Snapshot
    CurrentCommandResult:
      $ref: ./current-activity.schema.json#/$defs/CommandResult
    CurrentSelectHeadingCommand:
      $ref: ./current-activity.schema.json#/$defs/SelectHeadingCommand
    CurrentArrivalCommand:
      $ref: ./current-activity.schema.json#/$defs/ArrivalCommand
    CurrentCorrectOriginCommand:
      $ref: ./current-activity.schema.json#/$defs/CorrectOriginCommand
    CurrentActionResult:
      $ref: ./current-activity.schema.json#/$defs/ActionResult
    CurrentActionStatus:
      $ref: ./current-activity.schema.json#/$defs/ActionStatus
    CurrentEvent:
      $ref: ./current-activity.schema.json#/$defs/Event
    PlanningInputSettings:
      $ref: ./planning.schema.json#/$defs/InputSettings
    CurrentHeadingEvent:
      $ref: ./current-activity.schema.json#/$defs/HeadingEvent
    CurrentArrivalEvent:
      $ref: ./current-activity.schema.json#/$defs/ArrivalEvent
    OutcomeMoney:
      $ref: ./outcomes.schema.json#/$defs/Money
    OutcomePiece:
      $ref: ./outcomes.schema.json#/$defs/Piece
    OutcomeFull:
      $ref: ./outcomes.schema.json#/$defs/Full
    OutcomePartial:
      $ref: ./outcomes.schema.json#/$defs/Partial
    OutcomeRefusal:
      $ref: ./outcomes.schema.json#/$defs/Refusal
    OutcomeNoAnswer:
      $ref: ./outcomes.schema.json#/$defs/NoAnswer
    OutcomeFullCommand:
      $ref: ./outcomes.schema.json#/$defs/FullCommand
    OutcomePartialCommand:
      $ref: ./outcomes.schema.json#/$defs/PartialCommand
    OutcomeRefusalCommand:
      $ref: ./outcomes.schema.json#/$defs/RefusalCommand
    OutcomeNoAnswerCommand:
      $ref: ./outcomes.schema.json#/$defs/NoAnswerCommand
    OutcomeLineResult:
      $ref: ./outcomes.schema.json#/$defs/LineResult
    OutcomeCollection:
      $ref: ./outcomes.schema.json#/$defs/Collection
    OutcomeCalculation:
      $ref: ./outcomes.schema.json#/$defs/Calculation
    OutcomeRecord:
      $ref: ./outcomes.schema.json#/$defs/Record
    OutcomeCommandResult:
      $ref: ./outcomes.schema.json#/$defs/CommandResult
    OutcomeActionResult:
      $ref: ./outcomes.schema.json#/$defs/ActionResult
    OutcomeActionStatus:
      $ref: ./outcomes.schema.json#/$defs/ActionStatus
    OutcomeProgress:
      $ref: ./outcomes.schema.json#/$defs/Progress
    OutcomeSnapshot:
      $ref: ./outcomes.schema.json#/$defs/Snapshot
    OutcomeEvent:
      $ref: ./outcomes.schema.json#/$defs/Event
    EligibilityDefer:
      $ref: ./eligibility.schema.json#/$defs/Defer
    EligibilityDeferCommand:
      $ref: ./eligibility.schema.json#/$defs/DeferCommand
    EligibilityRetry:
      $ref: ./eligibility.schema.json#/$defs/Retry
    EligibilityRetryCommand:
      $ref: ./eligibility.schema.json#/$defs/RetryCommand
    EligibilityActivate:
      $ref: ./eligibility.schema.json#/$defs/Activate
    EligibilityActivateCommand:
      $ref: ./eligibility.schema.json#/$defs/ActivateCommand
    EligibilityUrgency:
      $ref: ./eligibility.schema.json#/$defs/Urgency
    EligibilityUrgencyCommand:
      $ref: ./eligibility.schema.json#/$defs/UrgencyCommand
    EligibilityAllowedAction:
      $ref: ./eligibility.schema.json#/$defs/AllowedAction
    EligibilityState:
      $ref: ./eligibility.schema.json#/$defs/State
    EligibilityRecord:
      $ref: ./eligibility.schema.json#/$defs/Record
    EligibilityCommandResult:
      $ref: ./eligibility.schema.json#/$defs/CommandResult
    EligibilityEvent:
      $ref: ./eligibility.schema.json#/$defs/Event
    EligibilityActionResult:
      $ref: ./eligibility.schema.json#/$defs/ActionResult
    EligibilityActionStatus:
      $ref: ./eligibility.schema.json#/$defs/ActionStatus
    EligibilitySnapshot:
      $ref: ./eligibility.schema.json#/$defs/Snapshot
    ClosureClose:
      $ref: ./workday-closure.schema.json#/$defs/Close
    ClosureEndRoundCommand:
      $ref: ./workday-closure.schema.json#/$defs/EndRoundCommand
    ClosureEndDayCommand:
      $ref: ./workday-closure.schema.json#/$defs/EndDayCommand
    ClosureRecord:
      $ref: ./workday-closure.schema.json#/$defs/Record
    ClosureCommandResult:
      $ref: ./workday-closure.schema.json#/$defs/CommandResult
    ClosureActionResult:
      $ref: ./workday-closure.schema.json#/$defs/ActionResult
    ClosureActionStatus:
      $ref: ./workday-closure.schema.json#/$defs/ActionStatus
    ClosureSourceItem:
      $ref: ./workday-closure.schema.json#/$defs/SourceItem
    ClosureEvent:
      $ref: ./workday-closure.schema.json#/$defs/Event
    ClosureCarryItem:
      $ref: ./workday-closure.schema.json#/$defs/CarryItem
    ClosureCarryForward:
      $ref: ./workday-closure.schema.json#/$defs/CarryForward
    ClosureRoundSummary:
      $ref: ./workday-closure.schema.json#/$defs/RoundSummary
    ClosureSummary:
      $ref: ./workday-closure.schema.json#/$defs/Summary
    DeviceTakeover:
      $ref: ./device-ownership.schema.json#/$defs/Takeover
    DeviceTakeoverCommand:
      $ref: ./device-ownership.schema.json#/$defs/TakeoverCommand
    DeviceTakeoverResult:
      $ref: ./device-ownership.schema.json#/$defs/TakeoverResult
    DeviceSnapshot:
      $ref: ./device-ownership.schema.json#/$defs/Snapshot
    DeviceActionStatus:
      $ref: ./device-ownership.schema.json#/$defs/ActionStatus
    DeviceFormerSubmission:
      $ref: ./device-ownership.schema.json#/$defs/FormerSubmission
    DeviceEvidenceSubmissionResult:
      $ref: ./device-ownership.schema.json#/$defs/EvidenceSubmissionResult
    DeviceRecovery:
      $ref: ./device-ownership.schema.json#/$defs/Recovery
    DeviceEvidence:
      $ref: ./device-ownership.schema.json#/$defs/Evidence
    DeviceAdoption:
      $ref: ./device-ownership.schema.json#/$defs/Adoption
    DeviceAdoptionCommand:
      $ref: ./device-ownership.schema.json#/$defs/AdoptionCommand
    DeviceTransferEvent:
      $ref: ./device-ownership.schema.json#/$defs/TransferEvent
    DeviceEvidenceEvent:
      $ref: ./device-ownership.schema.json#/$defs/EvidenceEvent
    ReturnOffer:
      $ref: ./returns.schema.json#/$defs/Offer
    ReturnRequest:
      $ref: ./returns.schema.json#/$defs/Request
    ReturnSubsetItem:
      $ref: ./returns.schema.json#/$defs/SubsetItem
    ReturnReceive:
      $ref: ./returns.schema.json#/$defs/Receive
    ReturnDispose:
      $ref: ./returns.schema.json#/$defs/Dispose
    ReturnRequestCommand:
      $ref: ./returns.schema.json#/$defs/RequestCommand
    ReturnReceiveCommand:
      $ref: ./returns.schema.json#/$defs/ReceiveCommand
    ReturnDisposeCommand:
      $ref: ./returns.schema.json#/$defs/DisposeCommand
    ReturnCustody:
      $ref: ./returns.schema.json#/$defs/Custody
    ReturnItem:
      $ref: ./returns.schema.json#/$defs/Item
    ReturnRequestView:
      $ref: ./returns.schema.json#/$defs/RequestView
    ReturnRequestList:
      $ref: ./returns.schema.json#/$defs/RequestList
    ReturnGroupLine:
      $ref: ./returns.schema.json#/$defs/GroupLine
    ReturnGroup:
      $ref: ./returns.schema.json#/$defs/Group
    ReturnGroups:
      $ref: ./returns.schema.json#/$defs/Groups
    ReturnClaim:
      $ref: ./returns.schema.json#/$defs/Claim
    ReturnConfirmationQuery:
      $ref: ./returns.schema.json#/$defs/ConfirmationQuery
    ReturnConfirmation:
      $ref: ./returns.schema.json#/$defs/Confirmation
    ReturnTransition:
      $ref: ./returns.schema.json#/$defs/Transition
    ReturnCommandResult:
      $ref: ./returns.schema.json#/$defs/CommandResult
    ReturnActionResult:
      $ref: ./returns.schema.json#/$defs/ActionResult
    ReturnActionStatus:
      $ref: ./returns.schema.json#/$defs/ActionStatus
    ReturnRequestedEvent:
      $ref: ./returns.schema.json#/$defs/RequestedEvent
    ReturnReceivedEvent:
      $ref: ./returns.schema.json#/$defs/ReceivedEvent
    ReturnDispositionEvent:
      $ref: ./returns.schema.json#/$defs/DispositionEvent
    BranchInterrupt:
      $ref: ./branch-activity.schema.json#/$defs/Interrupt
    BranchTransition:
      $ref: ./branch-activity.schema.json#/$defs/Transition
    BranchResult:
      $ref: ./branch-activity.schema.json#/$defs/Result
    BranchEvent:
      $ref: ./branch-activity.schema.json#/$defs/Event
    BranchInterruptCommand:
      $ref: ./branch-activity.schema.json#/$defs/InterruptCommand
    BranchArrivalCommand:
      $ref: ./branch-activity.schema.json#/$defs/ArrivalCommand
    BranchResumeCommand:
      $ref: ./branch-activity.schema.json#/$defs/ResumeCommand
    CurrentBranchActivity:
      $ref: ./current-activity.schema.json#/$defs/BranchActivity
    B2bRedispatch:
      $ref: ./b2b-intake.schema.json#/$defs/Redispatch
    B2bRedispatchCommand:
      $ref: ./b2b-intake.schema.json#/$defs/RedispatchCommand
    B2bCycleList:
      $ref: ./b2b-intake.schema.json#/$defs/CycleList
    CorrectionReplacement:
      $ref: ./corrections.schema.json#/$defs/Replacement
    CorrectionCorrect:
      $ref: ./corrections.schema.json#/$defs/Correct
    CorrectionCorrectCommand:
      $ref: ./corrections.schema.json#/$defs/CorrectCommand
    CorrectionConstraint:
      $ref: ./corrections.schema.json#/$defs/Constraint
    CorrectionAvailability:
      $ref: ./corrections.schema.json#/$defs/Availability
    CorrectionRecord:
      $ref: ./corrections.schema.json#/$defs/Record
    CorrectionResult:
      $ref: ./corrections.schema.json#/$defs/Result
    CorrectionEvent:
      $ref: ./corrections.schema.json#/$defs/Event
    CorrectionAdoptionEvent:
      $ref: ./corrections.schema.json#/$defs/AdoptionEvent
    CorrectionActionResult:
      $ref: ./corrections.schema.json#/$defs/ActionResult
    CorrectionActionStatus:
      $ref: ./corrections.schema.json#/$defs/ActionStatus
    MonitoringChange:
      $ref: ./monitoring.schema.json#/$defs/Change
    MonitoringFreshness:
      $ref: ./monitoring.schema.json#/$defs/Freshness
    MonitoringProgress:
      $ref: ./monitoring.schema.json#/$defs/Progress
    MonitoringGroups:
      $ref: ./monitoring.schema.json#/$defs/Groups
    MonitoringRound:
      $ref: ./monitoring.schema.json#/$defs/Round
    MonitoringWorkday:
      $ref: ./monitoring.schema.json#/$defs/Workday
    MonitoringTask:
      $ref: ./monitoring.schema.json#/$defs/Task
    MonitoringCurrent:
      $ref: ./monitoring.schema.json#/$defs/Current
    MonitoringPlan:
      $ref: ./monitoring.schema.json#/$defs/Plan
    MonitoringOwner:
      $ref: ./monitoring.schema.json#/$defs/Owner
    MonitoringAction:
      $ref: ./monitoring.schema.json#/$defs/Action
    MonitoringCycle:
      $ref: ./monitoring.schema.json#/$defs/Cycle
    MonitoringAttempt:
      $ref: ./monitoring.schema.json#/$defs/Attempt
    MonitoringHistoryItem:
      $ref: ./monitoring.schema.json#/$defs/HistoryItem
    MonitoringSnapshot:
      $ref: ./monitoring.schema.json#/$defs/Snapshot
    MonitoringHistory:
      $ref: ./monitoring.schema.json#/$defs/History
    MonitoringActionSnapshot:
      $ref: ./monitoring.schema.json#/$defs/ActionSnapshot
  securitySchemes:
    ReceiverStatus:
      type: http
      scheme: bearer
      description: Consumer-owned status token bound to one recipient; never a Tawsel service token.
    WebhookSignature:
      type: apiKey
      in: header
      name: X-Tawsel-Signature
      description: Exact-byte HMAC plus scope, key ID and fresh timestamp headers; see outbox-delivery.md.
    companySession:
      type: apiKey
      in: cookie
      name: __Host-tawsel-company
    personalSession:
      type: apiKey
      in: cookie
      name: __Host-tawsel-personal
    ProvisioningService:
      type: http
      scheme: bearer
      description: twp_<credential UUID>.<32 random bytes lowercase hex>. Hashed server-side;
        tenant/integration bound, expiring, rotatable. TLS required outside loopback.
    ProvisioningOperator:
      type: http
      scheme: bearer
      description: Out-of-band server operator token; bootstrap and recovery rotation only. Never
        distribute to ERP application users.
tags:
  - name: Reporting
    description: Workday reports with accepted quantities, reported collection and preserved forecasts.
  - name: Sessions
    description: P07 same-origin browser session and issuer journeys.
  - name: Independent intake
    description: P09 personal-tenant task creation, inspection and predeparture correction.
  - name: ERP provisioning
    description: Versioned ERP-owned identity projections and explicit service authority
  - name: ERP intake
    description: Source-authoritative snapshots, prepared/held distinction and atomic remaining-stop admission.
  - name: Locations
    description: Explicit execution pins and private geocoding.
  - name: Routing
    description: Authenticated application profile metadata; provider routing remains internal.
  - name: Planning
    description: Durable asynchronous candidates and preserved forecasts; no round activation.
  - name: Round start
    description: Online readiness, authoritative start, current workday/round and start action recovery.
  - name: Current activity
    description: Explicit heading, arrival and manual origin, with stable attempts and retained action recovery.
  - name: Outcomes
    description: Whole-piece results, exact reported collection, effective progress and durable action recovery.
  - name: Eligibility
    description: Explicit earliest deferral, whole retry, activation, assigned-driver urgency and
      durable recovery.
  - name: Workday closure
    description: Explicit round/day closure, current-holder carry-forward and basic workday summary.
  - name: Device ownership
    description: Same-driver online takeover, confirmed snapshots and evidence-only recovery.
  - name: Returns
    description: Source-branch offers, native actual subset receipt and separate loss/damage; no stock claim.
  - name: Monitoring
    description: Coherent conditional snapshots and scoped history; no presence or commercial settlement claim.
  - name: Signed delivery
    description: Scoped durable sender, recovery, exact-byte signatures and receipt visibility.

````
<!-- SOURCE-END contracts/openapi.yaml -->

## Original file: contracts/operations.json

SHA-256: `b8c7943ad38d3c1365231e5a6e43494cb74b1cc4bd3637ea35f63cf58f7a7d3b` · Bytes: 74881.

<!-- SOURCE-BEGIN contracts/operations.json -->
````json
{
  "schemaVersion": "1.0.0",
  "description": "Canonical operation ownership catalog. Designed rows are unavailable; method/path/payload/auth binding finalized by owner before implementation.",
  "operations": [
    {
      "id": "session.bootstrap",
      "family": "session-context",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "public",
      "description": "Issue browser-bound CSRF token; grants no account access.",
      "method": "GET",
      "path": "/api/session/bootstrap"
    },
    {
      "id": "session.resolveCompany",
      "family": "session-context",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "public",
      "description": "Resolve company code to safe login context; company selection grants no authority.",
      "method": "POST",
      "path": "/api/session/company"
    },
    {
      "id": "account.registerIndependent",
      "family": "session-context",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "public",
      "description": "Register a separate B2C phone/password identity with recovery email.",
      "method": "POST",
      "path": "/api/session/register"
    },
    {
      "id": "account.verifyRecoveryEmail",
      "family": "session-context",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "public",
      "description": "Complete recovery-email verification; no SMS claim. Implemented by configured Keycloak single-use action links; no Tawsel proof/password endpoint.",
      "delivery": "issuer-hosted"
    },
    {
      "id": "session.beginLogin",
      "family": "session-context",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "public",
      "description": "Begin OIDC authorization code / PKCE login.",
      "method": "POST",
      "path": "/api/session/login"
    },
    {
      "id": "session.completeLogin",
      "family": "session-context",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "public",
      "description": "Validate OIDC callback and establish independent Tawsel session.",
      "method": "GET",
      "path": "/api/session/callback"
    },
    {
      "id": "session.getContext",
      "family": "session-context",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "authenticated",
      "description": "Read current issuer-validated session and P06 access context. Display fields are never request authority.",
      "method": "GET",
      "path": "/api/session/context"
    },
    {
      "id": "session.refresh",
      "family": "session-context",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "authenticated",
      "description": "Refresh authenticated backend session; no tokens in URLs.",
      "method": "POST",
      "path": "/api/session/refresh"
    },
    {
      "id": "account.getStatus",
      "family": "session-context",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "authenticated",
      "description": "Read own activation/recovery state.",
      "method": "GET",
      "path": "/api/account/status"
    },
    {
      "id": "account.beginRecovery",
      "family": "session-context",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "public",
      "description": "Initiate email recovery without account enumeration.",
      "method": "POST",
      "path": "/api/session/recover"
    },
    {
      "id": "account.completeRecovery",
      "family": "session-context",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "public",
      "description": "Consume verified recovery proof through the issuer. Implemented by configured Keycloak single-use action links; no Tawsel proof/password endpoint.",
      "delivery": "issuer-hosted"
    },
    {
      "id": "session.logout",
      "family": "session-context",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 7,
      "capability": "authenticated",
      "description": "End session; P35 adds durable pending-action/account-switch guards.",
      "method": "POST",
      "path": "/api/session/logout"
    },
    {
      "id": "device.getContext",
      "family": "session-context",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 20,
      "capability": "execution.own",
      "description": "Scoped view/owner state; no execution token is disclosed.",
      "method": "GET",
      "path": "/api/v1/devices/rounds/{roundId}"
    },
    {
      "id": "integration.bindSource",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "integration.manage",
      "description": "Bootstrap authorized tenant/integration binding and supported protocol versions."
    },
    {
      "id": "integration.rotateCredential",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "integration.manage",
      "description": "Rotate scoped command credential with explicit overlap/recovery."
    },
    {
      "id": "integration.disableSource",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "integration.manage",
      "description": "Disable source credentials without erasing audit or queued evidence."
    },
    {
      "id": "integration.getConfiguration",
      "family": "integration-provisioning",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "integration.manage",
      "description": "Read authorized source configuration without secret disclosure."
    },
    {
      "id": "branch.provision",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Apply versioned branch identity/location reference."
    },
    {
      "id": "branch.disable",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Apply explicit versioned branch disable without deleting custody history."
    },
    {
      "id": "role.defineCapabilities",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Apply versioned ERP role capability definition."
    },
    {
      "id": "user.provision",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Bind ERP user reference to trusted issuer subject; no copied passwords."
    },
    {
      "id": "user.setRole",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Assign exactly one role per company user."
    },
    {
      "id": "user.setCapabilityExceptions",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Apply inherit/allow/deny overrides without bypassing resource scope."
    },
    {
      "id": "user.setBranchMemberships",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Version branch membership; common effective capabilities across branches."
    },
    {
      "id": "user.disable",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Revoke access without resurrecting via stale source revision."
    },
    {
      "id": "driver.provisionReference",
      "family": "integration-provisioning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Apply minimal execution driver/vehicle profile reference."
    },
    {
      "id": "provisioning.getStatus",
      "family": "integration-provisioning",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "identity.provision",
      "description": "Read application acceptance and separate issuer reconciliation state."
    },
    {
      "id": "task.createIndependent",
      "family": "intake",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 9,
      "capability": "execution.own",
      "description": "Create own simple B2C name/phone/destination/optional collection."
    },
    {
      "id": "task.reviseIndependent",
      "family": "intake",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 9,
      "capability": "execution.own",
      "description": "Correct own eligible B2C task with revision guards."
    },
    {
      "id": "task.getIndependent",
      "family": "intake",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 9,
      "capability": "execution.own",
      "description": "Inspect own persisted B2C task."
    },
    {
      "id": "task.listIndependent",
      "family": "intake",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 9,
      "capability": "execution.own",
      "description": "List own intake/preparation work with bounded pagination."
    },
    {
      "id": "intake.submitSnapshot",
      "family": "intake",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "intake.prepare",
      "description": "Accept generic source task/order/contact/location/content/policy revision.",
      "method": "POST",
      "path": "/api/v1/intake/commands/intake.submitSnapshot"
    },
    {
      "id": "intake.prepare",
      "family": "intake",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "intake.prepare",
      "description": "Prepare upcoming work without driver receipt/custody.",
      "method": "POST",
      "path": "/api/v1/intake/commands/intake.prepare"
    },
    {
      "id": "assignment.receiveBatch",
      "family": "intake",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "assignment.manage",
      "description": "Definitive ERP receipt assertion with all-or-none 50-stop admission.",
      "method": "POST",
      "path": "/api/v1/intake/commands/assignment.receiveBatch"
    },
    {
      "id": "assignment.withdraw",
      "family": "intake",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "assignment.manage",
      "description": "Ordinary predeparture withdrawal with history; no mandatory reason. Departure field guard exists; full start-race proof belongs to P15.",
      "method": "POST",
      "path": "/api/v1/intake/commands/assignment.withdraw"
    },
    {
      "id": "assignment.reassignBeforeDeparture",
      "family": "intake",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "assignment.manage",
      "description": "Change predeparture driver and assignment generation; no live transfer.",
      "method": "POST",
      "path": "/api/v1/intake/commands/assignment.reassignBeforeDeparture"
    },
    {
      "id": "intake.setUrgencyBeforeDeparture",
      "family": "intake",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "intake.prepare",
      "description": "ERP priority update only before execution lock.",
      "method": "POST",
      "path": "/api/v1/intake/commands/intake.setUrgencyBeforeDeparture"
    },
    {
      "id": "intake.getBatchResult",
      "family": "intake",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "assignment.manage",
      "description": "Recover durable accepted/rejected source results; 202 pending means no committed result is visible, not proof of receipt.",
      "method": "GET",
      "path": "/api/v1/intake/results/{actionId}"
    },
    {
      "id": "location.searchCandidates",
      "family": "locations",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 11,
      "capability": "location.review",
      "description": "Scoped Nominatim candidates with provenance; never GPS/accuracy percentage.",
      "method": "POST",
      "path": "/api/v1/locations/{taskId}/candidates"
    },
    {
      "id": "location.getSnapshot",
      "family": "locations",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 11,
      "capability": "monitor.read",
      "description": "Read original address and separate confirmed execution pin/revision.",
      "method": "GET",
      "path": "/api/v1/locations/{taskId}"
    },
    {
      "id": "location.confirmPin",
      "family": "locations",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 11,
      "capability": "location.review",
      "description": "Authorized predeparture confirmation or assigned-driver execution correction.",
      "method": "PUT",
      "path": "/api/v1/locations/{taskId}"
    },
    {
      "id": "map.getAssetConfiguration",
      "family": "locations",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 11,
      "capability": "authenticated",
      "description": "Read configured self-hosted style/archive/attribution; no invented map coverage.",
      "method": "GET",
      "path": "/api/v1/maps/configuration"
    },
    {
      "id": "routing.getVehicleProfiles",
      "family": "planning",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 12,
      "capability": "planning.manage",
      "description": "Authenticated car/motorcycle/bicycle modes and 600-second default; explicitly not a live Engine availability claim.",
      "method": "GET",
      "path": "/api/v1/routing/profiles"
    },
    {
      "id": "routing.computeRoadRoute",
      "family": "planning",
      "kind": "internal-work",
      "lifecycle": "verified-local",
      "ownerPhase": 12,
      "capability": "internal",
      "description": "Private OSRM route/table conversion, seconds/metres and explicit unreachable cells; controlled HTTP verified, actual Engine unavailable."
    },
    {
      "id": "routing.optimize",
      "family": "planning",
      "kind": "internal-work",
      "lifecycle": "verified-local",
      "ownerPhase": 12,
      "capability": "internal",
      "description": "Private VROOM candidate validates exhaustive IDs, unassigned work, coordinates, relative timing and separate service estimates; controlled HTTP verified, live Engine unavailable. P14 validates route policy."
    },
    {
      "id": "planning.saveDraft",
      "family": "planning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 13,
      "capability": "planning.manage",
      "description": "Save preview inputs: origin, vehicle, endpoint, service/time requirements; no start.",
      "method": "POST",
      "path": "/api/v1/planning/commands/planning.saveDraft",
      "payloadSchema": "./planning.schema.json#/$defs/SaveDraft"
    },
    {
      "id": "planning.requestPreview",
      "family": "planning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 13,
      "capability": "planning.manage",
      "description": "Queue durable asynchronous planning from coherent input revisions.",
      "method": "POST",
      "path": "/api/v1/planning/commands/planning.requestPreview",
      "payloadSchema": "./planning.schema.json#/$defs/Request"
    },
    {
      "id": "planning.getJob",
      "family": "planning",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 13,
      "capability": "planning.manage",
      "description": "Read queued/running/complete/partial/failed/obsolete result.",
      "method": "GET",
      "path": "/api/v1/planning/jobs/{jobId}"
    },
    {
      "id": "planning.getPlan",
      "family": "planning",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 13,
      "capability": "planning.manage",
      "description": "Read plan ID, route revision, order, pending/manual status and forecasts.",
      "method": "GET",
      "path": "/api/v1/planning/drivers/{driverId}/plans"
    },
    {
      "id": "planning.requestReplan",
      "family": "planning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 13,
      "capability": "planning.manage",
      "description": "Request optimization without clearing current or undoing accepted facts.",
      "method": "POST",
      "path": "/api/v1/planning/commands/planning.requestReplan",
      "payloadSchema": "./planning.schema.json#/$defs/Request"
    },
    {
      "id": "planning.setManualOrder",
      "family": "planning",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 14,
      "capability": "planning.manage",
      "description": "Revision-checked complete eligible order or first suggestion; current/urgent/capacity constraints, unknown road metrics, immutable manual forecast membership and stale-optimizer fence. No heading or round start.",
      "method": "POST",
      "path": "/api/v1/planning/commands/planning.setManualOrder",
      "payloadSchema": "./planning.schema.json#/$defs/ManualOrder"
    },
    {
      "id": "planning.publishRevision",
      "family": "planning",
      "kind": "internal-work",
      "lifecycle": "verified-local",
      "ownerPhase": 13,
      "capability": "internal",
      "description": "Fence lease/current input, validate complete grouped route and atomically append ready/partial plan, forecast and source-scoped intent. Manual publication uses the same driver fence; no round start."
    },
    {
      "id": "round.start",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 15,
      "capability": "execution.own",
      "description": "Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20.",
      "method": "POST",
      "path": "/api/v1/rounds/start"
    },
    {
      "id": "current.selectHeading",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 16,
      "capability": "execution.own",
      "description": "Explicitly select/change eligible target; protect arrived work until resolved.",
      "method": "POST",
      "path": "/api/v1/current/heading"
    },
    {
      "id": "current.recordArrival",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 16,
      "capability": "execution.own",
      "description": "Explicit arrival and physical-origin evidence; never inferred from outcome.",
      "method": "POST",
      "path": "/api/v1/current/arrival"
    },
    {
      "id": "outcome.recordFull",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 17,
      "capability": "execution.own",
      "description": "Full result with exact permitted collection and coherent progress/outbox.",
      "method": "POST",
      "path": "/api/v1/outcomes/full"
    },
    {
      "id": "outcome.recordPartial",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 17,
      "capability": "execution.own",
      "description": "B2B whole pieces only; rejected remainder is held return-required.",
      "method": "POST",
      "path": "/api/v1/outcomes/partial"
    },
    {
      "id": "outcome.recordRefusal",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 17,
      "capability": "execution.own",
      "description": "Refusal with shipping collection or explicit unpaid-shipping exception.",
      "method": "POST",
      "path": "/api/v1/outcomes/refusal"
    },
    {
      "id": "outcome.recordNoAnswer",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 17,
      "capability": "execution.own",
      "description": "Simple no-answer; no call counters or implied fee refusal/arrival.",
      "method": "POST",
      "path": "/api/v1/outcomes/no-answer"
    },
    {
      "id": "task.deferWhole",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 18,
      "capability": "execution.own",
      "description": "Defer untouched whole work to earliest time; no narrow appointment guarantee.",
      "method": "POST",
      "path": "/api/v1/eligibility/defer"
    },
    {
      "id": "task.retryWhole",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 18,
      "capability": "execution.own",
      "description": "Same-driver eligible untouched whole held return work, new attempt, before receipt.",
      "method": "POST",
      "path": "/api/v1/eligibility/retry"
    },
    {
      "id": "task.setDriverUrgency",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 18,
      "capability": "execution.own",
      "description": "Assigned-driver urgency after departure; protect current/earliest eligibility.",
      "method": "POST",
      "path": "/api/v1/eligibility/urgency"
    },
    {
      "id": "round.end",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 19,
      "capability": "execution.own",
      "description": "End round explicitly with held unfinished work preserved.",
      "method": "POST",
      "path": "/api/v1/closure/round"
    },
    {
      "id": "workday.end",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 19,
      "capability": "execution.own",
      "description": "Close open workday/active round after resolving or pausing current; carry held work.",
      "method": "POST",
      "path": "/api/v1/closure/day"
    },
    {
      "id": "device.takeOver",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 20,
      "capability": "execution.own",
      "description": "Explicit online transfer to a different installation of the same authenticated driver; expected generation CAS; stable retry. Fetch snapshot before commands.",
      "method": "POST",
      "path": "/api/v1/devices/takeover"
    },
    {
      "id": "outcome.correct",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 23,
      "capability": "correction.own",
      "description": "Driver appends correction in open day before dependent receipt/redispatch.",
      "method": "POST",
      "path": "/api/v1/corrections/outcomes"
    },
    {
      "id": "evidence.adoptCompatible",
      "family": "execution",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 23,
      "capability": "correction.own",
      "description": "Current owner adopts eligible former-device evidence under correction bounds.",
      "method": "POST",
      "path": "/api/v1/corrections/adopt"
    },
    {
      "id": "return.listSourceBranchGroups",
      "family": "returns",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "execution.own",
      "description": "Group held return-required portions by originating branch, with display labels and authorized unresolved requests for cross-phone recovery (P31).",
      "method": "GET",
      "path": "/api/v1/returns/groups"
    },
    {
      "id": "return.requestHandover",
      "family": "returns",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "execution.own",
      "description": "Driver offers source-branch pieces; request is not receipt/stock.",
      "method": "POST",
      "path": "/api/v1/returns/request"
    },
    {
      "id": "return.getRequest",
      "family": "returns",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "execution.own",
      "description": "Scoped request, offered/received/unresolved subsets and revisions.",
      "method": "GET",
      "path": "/api/v1/returns/requests/{requestId}"
    },
    {
      "id": "return.confirmSubsetReceipt",
      "family": "returns",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "return.receive",
      "description": "Native ERP trusted actor confirms actually received requested subset.",
      "method": "POST",
      "path": "/api/v1/erp/returns/commands/return.confirmSubsetReceipt"
    },
    {
      "id": "return.recordDisposition",
      "family": "returns",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "return.dispose",
      "description": "ERP loss/damage disposition distinct from physical receipt and inventory.",
      "method": "POST",
      "path": "/api/v1/erp/returns/commands/return.recordDisposition"
    },
    {
      "id": "branch.interruptRound",
      "family": "returns",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "capability": "execution.own",
      "description": "Pause heading sequence and enter source-branch service within same round/capacity.",
      "method": "POST",
      "path": "/api/v1/branches/commands/branch.interruptRound"
    },
    {
      "id": "branch.resumeRound",
      "family": "returns",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "capability": "execution.own",
      "description": "Resume retained sequence after authoritative claimed-subset receipt; no whole-batch gate.",
      "method": "POST",
      "path": "/api/v1/branches/commands/branch.resumeRound"
    },
    {
      "id": "dispatch.createFromReceipt",
      "family": "returns",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "capability": "assignment.manage",
      "description": "Redispatch only confirmed branch-received goods in new cycle/assignment.",
      "method": "POST",
      "path": "/api/v1/intake/commands/dispatch.createFromReceipt"
    },
    {
      "id": "monitoring.getDriverSnapshot",
      "family": "monitoring-history",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "description": "Coherent authorized driver read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim.",
      "method": "GET",
      "path": "/api/v1/monitoring/drivers/{id}"
    },
    {
      "id": "monitoring.getTripSnapshot",
      "family": "monitoring-history",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "description": "Coherent authorized trip read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim.",
      "method": "GET",
      "path": "/api/v1/monitoring/trips/{id}"
    },
    {
      "id": "monitoring.getTaskHistory",
      "family": "monitoring-history",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "description": "Coherent authorized task read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim.",
      "method": "GET",
      "path": "/api/v1/monitoring/tasks/{id}/history"
    },
    {
      "id": "monitoring.getWorkdayHistory",
      "family": "monitoring-history",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "description": "Coherent authorized workday read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim.",
      "method": "GET",
      "path": "/api/v1/monitoring/workdays/{id}/history"
    },
    {
      "id": "integration.getExecutionProjection",
      "family": "monitoring-history",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "description": "Coherent authorized driver read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim.",
      "method": "GET",
      "path": "/api/v1/erp/monitoring/drivers/{id}"
    },
    {
      "id": "action.getResult",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 5,
      "capability": "authenticated",
      "description": "P20 scoped execution/takeover action result. Other operation families keep their feature adapters; unknown action IDs return pending without leaking another account.",
      "method": "GET",
      "path": "/api/v1/actions/{actionId}"
    },
    {
      "id": "evidence.receiveFormerDevice",
      "family": "sync-recovery",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 20,
      "capability": "execution.own",
      "description": "Durably receive an original former-device envelope, without applying business state. Exact repeat is duplicate and returns its established result.",
      "method": "POST",
      "path": "/api/v1/evidence/former-device"
    },
    {
      "id": "sync.submitActions",
      "family": "sync-recovery",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 34,
      "capability": "execution.own",
      "description": "Dependency-ordered replay batch with per-action result, original identity/version.",
      "method": "POST",
      "path": "/api/v1/sync/actions"
    },
    {
      "id": "sync.getEvidenceReceipt",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 34,
      "capability": "execution.own",
      "description": "Own driver evidence with durable original receipt, current recovery constraints and adopted outcome linkage. Outcome adoption is implemented under P23 correction bounds.",
      "method": "GET",
      "path": "/api/v1/evidence/{actionId}"
    },
    {
      "id": "sync.listConflicts",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 34,
      "capability": "execution.own",
      "description": "Read preserved conflicts and currently permitted resolution choices.",
      "method": "GET",
      "path": "/api/v1/sync/conflicts"
    },
    {
      "id": "integration.configureWebhook",
      "family": "sync-recovery",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 25,
      "capability": "integration.manage",
      "description": "Authorize callback destination and recipient network restrictions.",
      "method": "POST",
      "path": "/api/v1/integration/commands/integration.configureWebhook"
    },
    {
      "id": "integration.rotateSigningKey",
      "family": "sync-recovery",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 25,
      "capability": "integration.manage",
      "description": "Rotate integration-scoped webhook secret/key ID with overlap.",
      "method": "POST",
      "path": "/api/v1/integration/commands/integration.rotateSigningKey"
    },
    {
      "id": "integration.getDeliveryStatus",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 25,
      "capability": "integration.manage",
      "description": "Read outbound pending/sending/received/failed independently of application.",
      "method": "GET",
      "path": "/api/v1/integration/deliveries"
    },
    {
      "id": "integration.retryDelivery",
      "family": "sync-recovery",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 25,
      "capability": "integration.manage",
      "description": "Controlled retry retaining committed event identity.",
      "method": "POST",
      "path": "/api/v1/integration/commands/integration.retryDelivery"
    },
    {
      "id": "integration.replayEvents",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 25,
      "capability": "integration.manage",
      "description": "Scoped aggregate sequence replay with explicit retained-window/expired status.",
      "method": "GET",
      "path": "/api/v1/integration/replay"
    },
    {
      "id": "integration.getReconciliationSnapshot",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 26,
      "capability": "integration.manage",
      "description": "Scoped authoritative checkpoint/snapshot recovery after gaps/expired replay.",
      "method": "GET",
      "path": "/api/v1/integration/reconciliation"
    },
    {
      "id": "integration.reportAppliedCheckpoint",
      "family": "sync-recovery",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 26,
      "capability": "integration.manage",
      "description": "Authenticated receiver reports separately durable applied/failed state.",
      "method": "POST",
      "path": "/api/v1/integration/commands/integration.reportAppliedCheckpoint"
    },
    {
      "id": "integration.getAppliedCheckpoint",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 26,
      "capability": "integration.manage",
      "description": "Read receiver processing checkpoint without inferring it from HTTP receipt.",
      "method": "GET",
      "path": "/api/v1/integration/applied-checkpoint"
    },
    {
      "id": "consumer.receiveSignedEvent",
      "family": "sync-recovery",
      "kind": "http-command",
      "lifecycle": "verified-local",
      "ownerPhase": 26,
      "capability": "external-consumer",
      "description": "External ERP callback: verify, durable inbox, then acknowledge receipt.",
      "method": "POST",
      "path": "/api/v1/consumer/events"
    },
    {
      "id": "consumer.applyInboxEvent",
      "family": "sync-recovery",
      "kind": "internal-work",
      "lifecycle": "verified-local",
      "ownerPhase": 26,
      "capability": "external-consumer",
      "description": "ERP-local atomic projection plus processed marker, deduplication and gap recovery."
    },
    {
      "id": "source.deliverCommandIntent",
      "family": "sync-recovery",
      "kind": "internal-work",
      "lifecycle": "verified-local",
      "ownerPhase": 27,
      "capability": "external-consumer",
      "description": "ERP-local native change plus command outbox, durable pending/accepted/rejected status."
    },
    {
      "id": "source.getCommandStatus",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 27,
      "capability": "external-consumer",
      "description": "Consumer-owned authenticated read of durable source command and local record status; acceptance remains separate from receiver application.",
      "method": "GET",
      "path": "/api/v1/source/status"
    },
    {
      "id": "report.getWorkday",
      "family": "reporting",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 36,
      "capability": "reports.read",
      "description": "Authorized workday results/quantities/collection with explicit denominators/currency.",
      "method": "GET",
      "path": "/api/v1/reports/workdays/{workdayId}"
    },
    {
      "id": "report.getRoundTiming",
      "family": "reporting",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 36,
      "capability": "reports.read",
      "description": "Initial/revised forecast versus matching actual observations and uncertainty.",
      "method": "GET",
      "path": "/api/v1/reports/workdays/{workdayId}/rounds/{roundId}/timing"
    },
    {
      "id": "report.requestExcelExport",
      "family": "reporting",
      "kind": "http-command",
      "lifecycle": "designed",
      "ownerPhase": 37,
      "capability": "reports.export",
      "description": "Create authorized export bound to same filter/snapshot/timezone as report."
    },
    {
      "id": "report.getExportStatus",
      "family": "reporting",
      "kind": "http-read",
      "lifecycle": "designed",
      "ownerPhase": 37,
      "capability": "reports.export",
      "description": "Read pending/ready/failed/expired export status."
    },
    {
      "id": "report.downloadExport",
      "family": "reporting",
      "kind": "http-read",
      "lifecycle": "designed",
      "ownerPhase": 37,
      "capability": "reports.export",
      "description": "Reauthorize and download text-safe Excel artifact before expiry."
    },
    {
      "id": "diagnostics.getHealth",
      "family": "diagnostics",
      "kind": "http-read",
      "lifecycle": "designed",
      "ownerPhase": 38,
      "capability": "diagnostics.read",
      "description": "Separate readiness/database/worker/Engine/integration health; scoped operational evidence."
    },
    {
      "id": "diagnostics.getCapacityAndFreshness",
      "family": "diagnostics",
      "kind": "http-read",
      "lifecycle": "designed",
      "ownerPhase": 38,
      "capability": "diagnostics.read",
      "description": "Measured latency/lag/load/queue/lease/resource view with stated conditions."
    },
    {
      "id": "ui.callRecipient",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 29,
      "capability": "local",
      "description": "Open dialer; no call count, contact outcome or movement event."
    },
    {
      "id": "ui.messageRecipient",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 29,
      "capability": "local",
      "description": "Open WhatsApp; no execution transition."
    },
    {
      "id": "ui.openNavigation",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 29,
      "capability": "local",
      "description": "Open external navigation; does not set heading/arrival."
    },
    {
      "id": "ui.filterAndInspect",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "designed",
      "ownerPhase": 3,
      "capability": "local",
      "description": "Inspect details, select driver, filter/map/list, open focused dialogs; reads use catalog APIs."
    },
    {
      "id": "ui.prepareDraft",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "designed",
      "ownerPhase": 28,
      "capability": "local",
      "description": "Enter unsaved forms/pin/route input; saving uses intake/location/planning operations."
    },
    {
      "id": "ui.captureOfflineAction",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 33,
      "capability": "local",
      "description": "Atomic local journal and pending projection for allowed downloaded started work."
    },
    {
      "id": "ui.requestPersistentStorage",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 33,
      "capability": "local",
      "description": "Request browser storage persistence and report actual availability."
    },
    {
      "id": "ui.retrySynchronization",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 34,
      "capability": "local",
      "description": "Trigger authenticated replay using original action identities."
    },
    {
      "id": "ui.reauthenticateSameAccount",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 35,
      "capability": "local",
      "description": "Preserve queue and invoke session login for its owning account."
    },
    {
      "id": "ui.switchAccount",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 35,
      "capability": "local",
      "description": "Block unsynchronized exit; otherwise use safe logout/login, no identity merge."
    },
    {
      "id": "ui.applySafeUpdate",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 35,
      "capability": "local",
      "description": "Apply versioned shell/storage update only at safe pending-work boundary."
    },
    {
      "id": "ui.downloadStartedWork",
      "family": "local-ui",
      "kind": "local-ui",
      "lifecycle": "verified-local",
      "ownerPhase": 33,
      "capability": "local",
      "description": "Store authorized snapshots/geometry for confirmed round; not offline new-round start."
    },
    {
      "id": "provisioning.changed",
      "family": "integration-provisioning",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 8,
      "capability": "recipient-scope",
      "description": "Versioned branch/user/role/membership/driver-reference acceptance.",
      "payloadSchema": "./provisioning.schema.json#/$defs/ProvisioningChanged",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "task.snapshotAccepted",
      "family": "intake",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "recipient-scope",
      "description": "Stable generic source task snapshot revision accepted. P10 durable own-source event intent; transport remains P25.",
      "payloadSchema": "./b2b-intake.schema.json#/$defs/ChangedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "task.independentCreated",
      "family": "intake",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 9,
      "capability": "recipient-scope",
      "description": "Own B2C task recorded; no ERP recipient unless separately authorized."
    },
    {
      "id": "task.independentRevised",
      "family": "intake",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 9,
      "capability": "recipient-scope",
      "description": "Own B2C task revision; preserve prior audit."
    },
    {
      "id": "assignment.prepared",
      "family": "intake",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "recipient-scope",
      "description": "Upcoming preparation, no possession. P10 durable own-source event intent; transport remains P25.",
      "payloadSchema": "./b2b-intake.schema.json#/$defs/ChangedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "assignment.received",
      "family": "intake",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "recipient-scope",
      "description": "Definitive batch received/admitted; not prepared. P10 durable own-source event intent; transport remains P25.",
      "payloadSchema": "./b2b-intake.schema.json#/$defs/ChangedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "assignment.withdrawn",
      "family": "intake",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "recipient-scope",
      "description": "Predeparture removal. P10 durable own-source event intent; transport remains P25.",
      "payloadSchema": "./b2b-intake.schema.json#/$defs/ChangedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "assignment.reassigned",
      "family": "intake",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "recipient-scope",
      "description": "Predeparture generation change. P10 durable own-source event intent; transport remains P25.",
      "payloadSchema": "./b2b-intake.schema.json#/$defs/ChangedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "task.urgencyChanged",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "recipient-scope",
      "description": "Predeparture ERP urgency acceptance in P10; assigned-driver producer extends this contract in P18. P10 durable own-source event intent; transport remains P25.",
      "payloadSchema": "./b2b-intake.schema.json#/$defs/ChangedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "location.pinConfirmed",
      "family": "locations",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 11,
      "capability": "recipient-scope",
      "description": "Durable source-scoped execution pin/provenance intent; source retained. Signed delivery is P25.",
      "payloadSchema": "./location.schema.json#/$defs/ConfirmedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "plan.revisionPublished",
      "family": "planning",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 13,
      "capability": "recipient-scope",
      "description": "Source-scoped immutable plan/forecast/workload identity notice: historical draft or validated ready/partial/manual. Pending outbox intent; signed delivery remains P25.",
      "payloadSchema": "./planning.schema.json#/$defs/PublishedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "round.started",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 15,
      "capability": "recipient-scope",
      "description": "Accepted start/departure/owner and baseline forecast.",
      "payloadSchema": "./round-start.schema.json#/$defs/StartedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "current.headingSelected",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 16,
      "capability": "recipient-scope",
      "description": "Explicit selection/change, not a next suggestion.",
      "payloadSchema": "./current-activity.schema.json#/$defs/HeadingEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "current.arrivalRecorded",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 16,
      "capability": "recipient-scope",
      "description": "Explicit observed arrival; time provenance retained.",
      "payloadSchema": "./current-activity.schema.json#/$defs/ArrivalEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "outcome.recorded",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 17,
      "capability": "recipient-scope",
      "description": "Full/partial/refused/no-answer with quantity/collection transition.",
      "payloadSchema": "./outcomes.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "task.deferred",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 18,
      "capability": "recipient-scope",
      "description": "Untouched whole work earliest-time change.",
      "payloadSchema": "./eligibility.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "task.retryAdmitted",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 18,
      "capability": "recipient-scope",
      "description": "New attempt on eligible whole held work; preserve prior outcome.",
      "payloadSchema": "./eligibility.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "round.ended",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 19,
      "capability": "recipient-scope",
      "description": "Ended round, held work unchanged unless explicitly transitioned.",
      "payloadSchema": "./workday-closure.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "workday.ended",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 19,
      "capability": "recipient-scope",
      "description": "Explicit day closure/carryover; not automatic midnight.",
      "payloadSchema": "./workday-closure.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "device.executionTransferred",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 20,
      "capability": "recipient-scope",
      "description": "Durable account-recipient notification intent; no shipment transfer, device secret or ERP business mutation. Transport is P25."
    },
    {
      "id": "evidence.received",
      "family": "sync-recovery",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 20,
      "capability": "recipient-scope",
      "description": "Durable submitting-account notification after rejected domain writes roll back. Query the scoped original action receipt; never imply business acceptance. No envelope/contact/money data in the notification."
    },
    {
      "id": "return.requested",
      "family": "returns",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "recipient-scope",
      "description": "Offered pieces only, never stock/received.",
      "payloadSchema": "./returns.schema.json#/$defs/RequestedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "return.subsetReceived",
      "family": "returns",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "recipient-scope",
      "description": "Actual confirmed source-branch subset transition.",
      "payloadSchema": "./returns.schema.json#/$defs/ReceivedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "return.dispositionRecorded",
      "family": "returns",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "recipient-scope",
      "description": "Loss/damage separate from receipt.",
      "payloadSchema": "./returns.schema.json#/$defs/DispositionEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "branch.roundInterrupted",
      "family": "returns",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "capability": "recipient-scope",
      "description": "Visible branch segment with retained customer sequence.",
      "payloadSchema": "./branch-activity.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "branch.roundResumed",
      "family": "returns",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "capability": "recipient-scope",
      "description": "Confirmed claimed subsets and retained work resume.",
      "payloadSchema": "./branch-activity.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "dispatch.createdFromReceipt",
      "family": "returns",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "capability": "recipient-scope",
      "description": "New dispatch cycle linked to prior confirmed receipt.",
      "payloadSchema": "./b2b-intake.schema.json#/$defs/ChangedEvent",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "outcome.corrected",
      "family": "execution",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 23,
      "capability": "recipient-scope",
      "description": "Append-only correction; consumers keep original transition identity.",
      "payloadSchema": "./corrections.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "evidence.adoptionResolved",
      "family": "sync-recovery",
      "kind": "event",
      "lifecycle": "verified-local",
      "ownerPhase": 23,
      "capability": "recipient-scope",
      "description": "Own-account notification of an accepted explicit adoption, linked to preserved evidence and effective outcome; blocked proposals emit evidence.received."
    },
    {
      "id": "progress.snapshot",
      "family": "monitoring-history",
      "kind": "event",
      "lifecycle": "designed",
      "ownerPhase": 24,
      "capability": "recipient-scope",
      "description": "Replacement scoped snapshot; never erases missing business events."
    },
    {
      "id": "integration.applicationReported",
      "family": "sync-recovery",
      "kind": "event",
      "lifecycle": "designed",
      "ownerPhase": 26,
      "capability": "recipient-scope",
      "description": "Reserved future application notification; P26 implements separately authenticated checkpoint HTTP reporting without recursive outbound events."
    },
    {
      "id": "workspace.getHealth",
      "family": "workspace",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 1,
      "capability": "public",
      "description": "Existing GET /health: scope=workspace, engine=not-checked; not the public integration API.",
      "path": "/health",
      "method": "GET"
    },
    {
      "id": "intake.getTask",
      "family": "intake",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "intake.prepare",
      "description": "Read current source snapshot, holder, readiness and dispatch identifiers.",
      "method": "GET",
      "path": "/api/v1/intake/task"
    },
    {
      "id": "intake.listTasks",
      "family": "intake",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 10,
      "capability": "intake.prepare",
      "description": "List source-scoped held/prepared and unassigned/withdrawn work, filtered before pagination.",
      "method": "GET",
      "path": "/api/v1/intake/tasks"
    },
    {
      "id": "location.list",
      "family": "locations",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 11,
      "capability": "location.review",
      "description": "Scoped focused location review list.",
      "method": "GET",
      "path": "/api/v1/locations"
    },
    {
      "id": "round.prepareStart",
      "family": "execution",
      "kind": "http-command",
      "ownerPhase": 15,
      "capability": "execution.own",
      "lifecycle": "verified-local",
      "method": "POST",
      "path": "/api/v1/rounds/readiness",
      "description": "Server-issued evidence expires after 60 seconds and is bound to account/device/plan/input. Start rechecks authority, accepted dependencies and the locked fingerprint. It does not activate work."
    },
    {
      "id": "round.getCurrent",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 15,
      "capability": "execution.own",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/rounds/current",
      "description": "Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20."
    },
    {
      "id": "round.getStartResult",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 15,
      "capability": "execution.own",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/rounds/actions/{actionId}",
      "description": "Authoritative server round only. The immutable selected forecast retains its original planning time origin; startedAt is separate. No heading or arrival is implied. Takeover belongs to P20."
    },
    {
      "id": "current.correctOrigin",
      "family": "execution",
      "kind": "http-command",
      "ownerPhase": 16,
      "capability": "execution.own",
      "description": "Explicit owner-fenced manual physical-origin correction; no current activity or arrival is inferred.",
      "lifecycle": "verified-local",
      "method": "POST",
      "path": "/api/v1/current/origin"
    },
    {
      "id": "current.getActivity",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 16,
      "capability": "execution.own",
      "lifecycle": "verified-local",
      "description": "Read explicit current activity, separate next suggestion and physical-origin evidence for the assigned driver. P30 includes frozen source piece quantities/unit due and simple personal refusal in delivery choices; command-time checks remain authoritative.",
      "method": "GET",
      "path": "/api/v1/current/rounds/{roundId}"
    },
    {
      "id": "current.getResult",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 16,
      "capability": "execution.own",
      "lifecycle": "verified-local",
      "description": "Recover only own current activity action results with current scope reauthorization.",
      "method": "GET",
      "path": "/api/v1/current/actions/{actionId}"
    },
    {
      "id": "outcome.getRound",
      "family": "execution",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 17,
      "capability": "execution.own",
      "description": "Effective own-round outcomes and exact reported progress",
      "method": "GET",
      "path": "/api/v1/outcomes/rounds/{roundId}"
    },
    {
      "id": "outcome.getResult",
      "family": "execution",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 17,
      "capability": "execution.own",
      "description": "Recover retained outcome command by stable action ID",
      "method": "GET",
      "path": "/api/v1/outcomes/actions/{actionId}"
    },
    {
      "id": "task.activateDeferred",
      "family": "execution",
      "kind": "http-command",
      "ownerPhase": 18,
      "capability": "execution.own",
      "description": "Explicit eligibility transition; retained history and driver authority.",
      "lifecycle": "verified-local",
      "method": "POST",
      "path": "/api/v1/eligibility/activate"
    },
    {
      "id": "task.getEligibility",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 18,
      "capability": "execution.own",
      "description": "Server-derived permissions/history or stable action recovery.",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/eligibility/rounds/{roundId}"
    },
    {
      "id": "task.getEligibilityAction",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 18,
      "capability": "execution.own",
      "description": "Server-derived permissions/history or stable action recovery.",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/eligibility/actions/{actionId}"
    },
    {
      "id": "task.deferredActivated",
      "family": "execution",
      "kind": "event",
      "ownerPhase": 18,
      "capability": "recipient-scope",
      "description": "Committed assigned-driver eligibility change; source-scoped durable intent.",
      "lifecycle": "verified-local",
      "payloadSchema": "./eligibility.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "task.driverUrgencyChanged",
      "family": "execution",
      "kind": "event",
      "ownerPhase": 18,
      "capability": "recipient-scope",
      "description": "Committed assigned-driver eligibility change; source-scoped durable intent.",
      "lifecycle": "verified-local",
      "payloadSchema": "./eligibility.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "workday.getSummary",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 19,
      "capability": "execution.own",
      "description": "Basic explicit-workday outcome/collection summary, held carry-forward and retained per-round activity revisions for between-round closure (P31).",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/workdays/{workdayId}/summary"
    },
    {
      "id": "workday.getCarryForward",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 19,
      "capability": "execution.own",
      "description": "Current held work for the workday holder; no per-day cloning or implicit retry.",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/workdays/{workdayId}/carry-forward"
    },
    {
      "id": "closure.getResult",
      "family": "execution",
      "kind": "http-read",
      "ownerPhase": 19,
      "capability": "execution.own",
      "description": "Recover a retained closure result; unknown action remains pending.",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/closure/actions/{actionId}"
    },
    {
      "id": "device.getSnapshot",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 20,
      "capability": "execution.own",
      "description": "Download current confirmed activity/targets under the owner lock. Only the matching logical owner receives the generation snapshot token. P33 brackets authorized download reads with this locked owner/activity snapshot; local durability is a separate client transaction.",
      "method": "GET",
      "path": "/api/v1/devices/rounds/{roundId}/snapshot"
    },
    {
      "id": "return.getResult",
      "family": "returns",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "execution.own",
      "description": "Recover own driver offer command; pending is not physical receipt.",
      "method": "GET",
      "path": "/api/v1/returns/actions/{actionId}"
    },
    {
      "id": "return.checkConfirmation",
      "family": "returns",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "execution.own",
      "description": "Read server confirmation for an explicit cumulative claimed subset. Waiting never grants resume; P22 rechecks under lock.",
      "method": "POST",
      "path": "/api/v1/returns/requests/{requestId}/confirmation"
    },
    {
      "id": "return.listPending",
      "family": "returns",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "return.receive",
      "description": "Native source-scoped pending requests for one driver and originating branch, paginated in pages of 100 without a returns quota.",
      "method": "GET",
      "path": "/api/v1/erp/returns/pending"
    },
    {
      "id": "return.getNativeRequest",
      "family": "returns",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "return.receive",
      "description": "Native source-scoped accurate requested/received/unresolved/lost/damaged state per item.",
      "method": "GET",
      "path": "/api/v1/erp/returns/requests/{requestId}"
    },
    {
      "id": "return.getNativeResult",
      "family": "returns",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 21,
      "capability": "return.receive",
      "description": "Recover durable native source receipt/disposition command results; 202 means unknown pending.",
      "method": "GET",
      "path": "/api/v1/erp/returns/actions/{actionId}"
    },
    {
      "id": "branch.recordArrival",
      "kind": "http-command",
      "capability": "execution.own",
      "description": "Explicit arrival at the source-bound branch; records physical origin without inferring receipt.",
      "family": "returns",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "method": "POST",
      "path": "/api/v1/branches/commands/branch.recordArrival"
    },
    {
      "id": "branch.arrivalRecorded",
      "kind": "event",
      "capability": "recipient-scope",
      "description": "Confirmed branch arrival; no physical receipt or stock implication.",
      "family": "returns",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "payloadSchema": "./branch-activity.schema.json#/$defs/Event",
      "delivery": "P25 signed sender; P26 durable receiver/projection remains separate"
    },
    {
      "id": "dispatch.listCycles",
      "kind": "http-read",
      "capability": "assignment.manage",
      "description": "Source-scoped preserved dispatch snapshots, holders and predecessor identities.",
      "family": "returns",
      "lifecycle": "verified-local",
      "ownerPhase": 22,
      "method": "GET",
      "path": "/api/v1/intake/cycles"
    },
    {
      "id": "outcome.getCorrectionAvailability",
      "family": "execution",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 23,
      "capability": "execution.own",
      "description": "Read original/effective correction eligibility and permitted next steps. P30 includes original outcome and replacement delivery inputs excluding the replaced attempt from prior shipping; allowed/constraints remain the authority.",
      "method": "GET",
      "path": "/api/v1/corrections/attempts/{attemptId}"
    },
    {
      "id": "correction.getResult",
      "family": "execution",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 23,
      "capability": "execution.own",
      "description": "Recover the same driver correction result by action ID.",
      "method": "GET",
      "path": "/api/v1/corrections/actions/{actionId}"
    },
    {
      "id": "monitoring.getAction",
      "family": "monitoring-history",
      "kind": "http-read",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/monitoring/actions/{id}",
      "description": "Coherent authorized action read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim."
    },
    {
      "id": "integration.getTripProjection",
      "family": "monitoring-history",
      "kind": "http-read",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/erp/monitoring/trips/{id}",
      "description": "Coherent authorized trip read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim."
    },
    {
      "id": "integration.getTaskHistory",
      "family": "monitoring-history",
      "kind": "http-read",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/erp/monitoring/tasks/{id}/history",
      "description": "Coherent authorized task read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim."
    },
    {
      "id": "integration.getWorkdayHistory",
      "family": "monitoring-history",
      "kind": "http-read",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/erp/monitoring/workdays/{id}/history",
      "description": "Coherent authorized workday read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim."
    },
    {
      "id": "integration.getMonitoringAction",
      "family": "monitoring-history",
      "kind": "http-read",
      "ownerPhase": 24,
      "capability": "monitor.read",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/erp/monitoring/actions/{id}",
      "description": "Coherent authorized action read; source-safe counters/history, conditional revision and refresh timing. No sender/application claim."
    },
    {
      "id": "integration.getDeliveryDetail",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 25,
      "capability": "integration.manage",
      "description": "Inspect one scoped delivery and bounded retained attempts.",
      "method": "GET",
      "path": "/api/v1/integration/deliveries/{eventId}"
    },
    {
      "id": "consumer.getStatus",
      "family": "sync-recovery",
      "kind": "http-read",
      "lifecycle": "verified-local",
      "ownerPhase": 26,
      "capability": "external-consumer",
      "description": "Authenticated external receiver status with separate durable received/applied watermarks and historical limitations.",
      "method": "GET",
      "path": "/api/v1/consumer/status"
    },
    {
      "id": "report.listWorkdays",
      "family": "reporting",
      "kind": "http-read",
      "ownerPhase": 36,
      "capability": "reports.read",
      "description": "List explicit authorized workdays; never a calendar-day aggregate.",
      "lifecycle": "verified-local",
      "method": "GET",
      "path": "/api/v1/reports/workdays"
    }
  ],
  "authorizationFoundation": {
    "ownerPhase": 6,
    "lifecycle": "verified-local",
    "evidence": "docs/phase-06-evidence.md",
    "permissionContract": "docs/authorization.md",
    "schemas": [
      "common.schema.json#/$defs/Capability",
      "common.schema.json#/$defs/CapabilityOverride",
      "common.schema.json#/$defs/AccessContext"
    ],
    "boundary": "P06 PostgreSQL authorization is bound to P07 verified issuer subjects/browser sessions. ERP service/delegation and provisioning remain P08."
  }
}

````
<!-- SOURCE-END contracts/operations.json -->

