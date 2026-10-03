# Complete canonical examples and webhook signature vector

Source commit: `32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada`. Extracted: 2026-09-25T08:22:32.982Z.

Original blocks below are verbatim source text, not rewritten contracts. Their SHA-256 hashes refer to original bytes. Resolve relative schema references using the original path above the block and the companion schema attachment. No repo/network access is needed to read those blocks. Descriptions/fixtures do not override operation authentication or lifecycle.

## Fixture index

267 acceptance examples and 166 rejection examples. These are schema fixtures, not proof that every shown operation/event is emitted or callable by an ERP service. Read the authentication and sender index in 04 first. The signature vector contains an explicitly public test key, not a production secret.

| Set | Example ID | Original schema reference | Expected invalid keyword |
| --- | --- | --- | --- |
| valid | common-Uuid | common.schema.json#/$defs/Uuid |  |
| valid | common-SchemaVersion | common.schema.json#/$defs/SchemaVersion |  |
| valid | common-Revision | common.schema.json#/$defs/Revision |  |
| valid | common-Generation | common.schema.json#/$defs/Generation |  |
| valid | common-Sequence | common.schema.json#/$defs/Sequence |  |
| valid | common-PieceCount | common.schema.json#/$defs/PieceCount |  |
| valid | common-PositivePieceCount | common.schema.json#/$defs/PositivePieceCount |  |
| valid | common-UtcInstant | common.schema.json#/$defs/UtcInstant |  |
| valid | common-ExternalId | common.schema.json#/$defs/ExternalId |  |
| valid | common-OperationId | common.schema.json#/$defs/OperationId |  |
| valid | common-SourceReference | common.schema.json#/$defs/SourceReference |  |
| valid | common-Money | common.schema.json#/$defs/Money |  |
| valid | common-Coordinates | common.schema.json#/$defs/Coordinates |  |
| valid | common-ContactSnapshot | common.schema.json#/$defs/ContactSnapshot |  |
| valid | common-LocationSnapshot | common.schema.json#/$defs/LocationSnapshot |  |
| valid | common-TimeWindow | common.schema.json#/$defs/TimeWindow |  |
| valid | common-DeliveryRequirements | common.schema.json#/$defs/DeliveryRequirements |  |
| valid | common-DeliverySnapshot | common.schema.json#/$defs/DeliverySnapshot |  |
| valid | common-ResourceContext | common.schema.json#/$defs/ResourceContext |  |
| valid | common-Versions | common.schema.json#/$defs/Versions |  |
| valid | common-ClockEvidence | common.schema.json#/$defs/ClockEvidence |  |
| valid | common-Observation | common.schema.json#/$defs/Observation |  |
| valid | common-DeviceContext | common.schema.json#/$defs/DeviceContext |  |
| valid | common-IntegrationContext | common.schema.json#/$defs/IntegrationContext |  |
| valid | common-CommandContext | common.schema.json#/$defs/CommandContext |  |
| valid | common-EvidenceStatus | common.schema.json#/$defs/EvidenceStatus |  |
| valid | common-BusinessStatus | common.schema.json#/$defs/BusinessStatus |  |
| valid | common-DeliveryStatus | common.schema.json#/$defs/DeliveryStatus |  |
| valid | common-ApplicationStatus | common.schema.json#/$defs/ApplicationStatus |  |
| valid | common-ErrorCode | common.schema.json#/$defs/ErrorCode |  |
| valid | common-Problem | common.schema.json#/$defs/Problem |  |
| valid | common-Capability | common.schema.json#/$defs/Capability |  |
| valid | common-PageRequest | common.schema.json#/$defs/PageRequest |  |
| valid | common-PageInfo | common.schema.json#/$defs/PageInfo |  |
| valid | action-partial-envelope | action-envelope.v1.schema.json |  |
| valid | action-source-envelope | action-envelope.v1.schema.json |  |
| valid | evidence-pending | evidence-receipt.v1.schema.json |  |
| valid | evidence-accepted | evidence-receipt.v1.schema.json |  |
| valid | evidence-old-device-review | evidence-receipt.v1.schema.json |  |
| valid | event-outcome-transition | events/envelope.v1.schema.json |  |
| valid | event-progress-snapshot | events/envelope.v1.schema.json |  |
| valid | event-return-request | events/envelope.v1.schema.json |  |
| valid | event-correction-transition | events/envelope.v1.schema.json |  |
| valid | error-validation_failed | common.schema.json#/$defs/Problem |  |
| valid | error-idempotency_conflict | common.schema.json#/$defs/Problem |  |
| valid | error-capacity_exceeded | common.schema.json#/$defs/Problem |  |
| valid | error-invalid_pin | common.schema.json#/$defs/Problem |  |
| valid | error-unauthorized | common.schema.json#/$defs/Problem |  |
| valid | error-forbidden_resource | common.schema.json#/$defs/Problem |  |
| valid | error-departed_edit_forbidden | common.schema.json#/$defs/Problem |  |
| valid | error-stale_revision | common.schema.json#/$defs/Problem |  |
| valid | error-stale_device | common.schema.json#/$defs/Problem |  |
| valid | error-unsupported_price_allocation | common.schema.json#/$defs/Problem |  |
| valid | error-dependency_missing | common.schema.json#/$defs/Problem |  |
| valid | error-dependency_unavailable | common.schema.json#/$defs/Problem |  |
| valid | error-unassigned_route | common.schema.json#/$defs/Problem |  |
| valid | error-result_unknown | common.schema.json#/$defs/Problem |  |
| valid | error-unsupported_schema_version | common.schema.json#/$defs/Problem |  |
| valid | error-replay_expired | common.schema.json#/$defs/Problem |  |
| valid | error-correction_dependency_conflict | common.schema.json#/$defs/Problem |  |
| valid | action-result-full | action-result.v1.schema.json |  |
| valid | action-result-compacted | action-result.v1.schema.json |  |
| valid | access-effect | common.schema.json#/$defs/CapabilityEffect |  |
| valid | access-inherit | common.schema.json#/$defs/CapabilityOverride |  |
| valid | access-allow | common.schema.json#/$defs/CapabilityOverride |  |
| valid | access-deny | common.schema.json#/$defs/CapabilityOverride |  |
| valid | access-company | common.schema.json#/$defs/AccessContext |  |
| valid | access-personal | common.schema.json#/$defs/AccessContext |  |
| valid | access-integration | common.schema.json#/$defs/AccessContext |  |
| valid | access-lifecycle-problem | common.schema.json#/$defs/Problem |  |
| valid | session-company-entry | session.schema.json#/$defs/CompanyRequest |  |
| valid | session-login | session.schema.json#/$defs/LoginRequest |  |
| valid | session-personal-register | session.schema.json#/$defs/LoginRequest |  |
| valid | session-csrf | session.schema.json#/$defs/BootstrapResponse |  |
| valid | session-kind | session.schema.json#/$defs/KindRequest |  |
| valid | session-denied | session.schema.json#/$defs/AuthError |  |
| valid | p08-integration.bindSource | provisioning.schema.json#/$defs/BindSourceCommand |  |
| valid | p08-integration.rotateCredential | provisioning.schema.json#/$defs/RotateCredentialCommand |  |
| valid | p08-integration.disableSource | provisioning.schema.json#/$defs/DisableSourceCommand |  |
| valid | p08-branch.provision | provisioning.schema.json#/$defs/BranchCommand |  |
| valid | p08-branch.disable | provisioning.schema.json#/$defs/DisableBranchCommand |  |
| valid | p08-role.defineCapabilities | provisioning.schema.json#/$defs/RoleCommand |  |
| valid | p08-user.provision | provisioning.schema.json#/$defs/UserCommand |  |
| valid | p08-user.setRole | provisioning.schema.json#/$defs/UserRoleCommand |  |
| valid | p08-user.setCapabilityExceptions | provisioning.schema.json#/$defs/UserExceptionsCommand |  |
| valid | p08-user.setBranchMemberships | provisioning.schema.json#/$defs/UserBranchesCommand |  |
| valid | p08-user.disable | provisioning.schema.json#/$defs/DisableUserCommand |  |
| valid | p08-driver.provisionReference | provisioning.schema.json#/$defs/DriverCommand |  |
| valid | p08-status-retry | provisioning.schema.json#/$defs/ProvisioningStatus |  |
| valid | p08-provisioning.changed | provisioning.schema.json#/$defs/ProvisioningChanged |  |
| valid | p09-create-address-task | b2c-intake.schema.json#/$defs/CreateIndependentCommand |  |
| valid | p09-confirmed-pin-task | b2c-intake.schema.json#/$defs/IndependentTask |  |
| valid | p10-SourceSnapshot | b2b-intake.schema.json#/$defs/SourceSnapshotCommand |  |
| valid | p10-Prepare | b2b-intake.schema.json#/$defs/PrepareCommand |  |
| valid | p10-ReceiveBatch | b2b-intake.schema.json#/$defs/ReceiveBatchCommand |  |
| valid | p10-Withdraw | b2b-intake.schema.json#/$defs/WithdrawCommand |  |
| valid | p10-Reassign | b2b-intake.schema.json#/$defs/ReassignCommand |  |
| valid | p10-Urgency | b2b-intake.schema.json#/$defs/UrgencyCommand |  |
| valid | p10-explicit-prepaid | b2b-intake.schema.json#/$defs/SourceSnapshot |  |
| valid | p10-exact-partial-prepaid | b2b-intake.schema.json#/$defs/SourceSnapshot |  |
| valid | p10-error-capacity_exceeded | common.schema.json#/$defs/Problem |  |
| valid | p10-error-unsupported_price_allocation | common.schema.json#/$defs/Problem |  |
| valid | p10-error-stale_revision | common.schema.json#/$defs/Problem |  |
| valid | p10-received-event-intent | b2b-intake.schema.json#/$defs/ChangedEvent |  |
| valid | location-valid-confirmation | location.schema.json#/$defs/Confirm |  |
| valid | routing-bicycle-input | routing.schema.json#/$defs/OptimizationInput |  |
| valid | routing-unreachable-table | routing.schema.json#/$defs/TableResult |  |
| valid | routing-profile-metadata | routing.schema.json#/$defs/Profiles |  |
| valid | p13-settings | planning.schema.json#/$defs/Settings |  |
| valid | p13-input | planning.schema.json#/$defs/Input |  |
| valid | p13-pending | planning.schema.json#/$defs/Job |  |
| valid | p13-partial | planning.schema.json#/$defs/Plan |  |
| valid | p13-save-draft | planning.schema.json#/$defs/SaveDraftCommand |  |
| valid | p13-request | planning.schema.json#/$defs/RequestReplanCommand |  |
| valid | p13-publication-event | planning.schema.json#/$defs/PublishedEvent |  |
| valid | p14-partial-urgent | planning.schema.json#/$defs/Plan |  |
| valid | p14-ready | planning.schema.json#/$defs/Plan |  |
| valid | p14-manual | planning.schema.json#/$defs/Plan |  |
| valid | p14-manual-order | planning.schema.json#/$defs/ManualOrderCommand |  |
| valid | p14-manual-first | planning.schema.json#/$defs/ManualOrderCommand |  |
| valid | p15-readiness | round-start.schema.json#/$defs/Readiness |  |
| valid | p15-start | round-start.schema.json#/$defs/StartCommand |  |
| valid | p15-current | round-start.schema.json#/$defs/Current |  |
| valid | p15-start-result | round-start.schema.json#/$defs/StartResult |  |
| valid | p15-action-accepted | round-start.schema.json#/$defs/ActionStatus |  |
| valid | p15-action-pending | round-start.schema.json#/$defs/ActionStatus |  |
| valid | p15-action-rejected | round-start.schema.json#/$defs/ActionStatus |  |
| valid | current-heading | current-activity.schema.json#/$defs/Activity |  |
| valid | current-arrived | current-activity.schema.json#/$defs/Activity |  |
| valid | current-manual-origin | current-activity.schema.json#/$defs/PhysicalOrigin |  |
| valid | p16-select-heading | current-activity.schema.json#/$defs/SelectHeadingCommand |  |
| valid | p16-arrival | current-activity.schema.json#/$defs/ArrivalCommand |  |
| valid | p16-correct-origin | current-activity.schema.json#/$defs/CorrectOriginCommand |  |
| valid | p16-heading-action-accepted | current-activity.schema.json#/$defs/ActionStatus |  |
| valid | p16-action-pending | current-activity.schema.json#/$defs/ActionStatus |  |
| valid | p16-arrival-action-accepted | current-activity.schema.json#/$defs/ActionStatus |  |
| valid | p16-snapshot-arrived | current-activity.schema.json#/$defs/Snapshot |  |
| valid | p17-full-command | outcomes.schema.json#/$defs/FullCommand |  |
| valid | p17-partial-command | outcomes.schema.json#/$defs/PartialCommand |  |
| valid | p17-refused-paid-command | outcomes.schema.json#/$defs/RefusalCommand |  |
| valid | p17-refused-unpaid-command | outcomes.schema.json#/$defs/RefusalCommand |  |
| valid | p17-no-answer-command | outcomes.schema.json#/$defs/NoAnswerCommand |  |
| valid | p17-partial-record | outcomes.schema.json#/$defs/Record |  |
| valid | p17-no-answer-record | outcomes.schema.json#/$defs/Record |  |
| valid | p17-two-task-progress | outcomes.schema.json#/$defs/Snapshot |  |
| valid | p17-action-accepted | outcomes.schema.json#/$defs/ActionStatus |  |
| valid | p17-action-pending | outcomes.schema.json#/$defs/ActionStatus |  |
| valid | p17-event-payload | outcomes.schema.json#/$defs/Event |  |
| valid | p18-retry-command | eligibility.schema.json#/$defs/RetryCommand |  |
| valid | p18-defer-command | eligibility.schema.json#/$defs/DeferCommand |  |
| valid | p18-urgency-command | eligibility.schema.json#/$defs/UrgencyCommand |  |
| valid | p18-activate-command | eligibility.schema.json#/$defs/ActivateCommand |  |
| valid | p18-snapshot | eligibility.schema.json#/$defs/Snapshot |  |
| valid | p18-action-status | eligibility.schema.json#/$defs/ActionStatus |  |
| valid | p18-pending | eligibility.schema.json#/$defs/ActionStatus |  |
| valid | p18-accepted | eligibility.schema.json#/$defs/ActionResult |  |
| valid | p18-denied | eligibility.schema.json#/$defs/ActionResult |  |
| valid | p18-event-0 | eligibility.schema.json#/$defs/Event |  |
| valid | p18-event-1 | eligibility.schema.json#/$defs/Event |  |
| valid | p18-event-2 | eligibility.schema.json#/$defs/Event |  |
| valid | p18-state | eligibility.schema.json#/$defs/State |  |
| valid | p18-record | eligibility.schema.json#/$defs/Record |  |
| valid | p19-end-round | workday-closure.schema.json#/$defs/EndRoundCommand |  |
| valid | p19-end-day | workday-closure.schema.json#/$defs/EndDayCommand |  |
| valid | p19-round-result | workday-closure.schema.json#/$defs/ActionResult |  |
| valid | p19-day-result | workday-closure.schema.json#/$defs/ActionResult |  |
| valid | p19-action-status | workday-closure.schema.json#/$defs/ActionStatus |  |
| valid | p19-summary | workday-closure.schema.json#/$defs/Summary |  |
| valid | p19-carry-forward | workday-closure.schema.json#/$defs/CarryForward |  |
| valid | p19-round-event | workday-closure.schema.json#/$defs/Event |  |
| valid | p19-day-event | workday-closure.schema.json#/$defs/Event |  |
| valid | p19-pending | workday-closure.schema.json#/$defs/ActionStatus |  |
| valid | p20-view | device-ownership.schema.json#/$defs/Context |  |
| valid | p20-takeover-command | device-ownership.schema.json#/$defs/TakeoverCommand |  |
| valid | p20-action-status | device-ownership.schema.json#/$defs/ActionStatus |  |
| valid | p20-takeover-result | action-result.v1.schema.json |  |
| valid | p20-snapshot | device-ownership.schema.json#/$defs/Snapshot |  |
| valid | p20-received | device-ownership.schema.json#/$defs/EvidenceSubmissionResult |  |
| valid | p20-duplicate | device-ownership.schema.json#/$defs/EvidenceSubmissionResult |  |
| valid | p20-evidence | device-ownership.schema.json#/$defs/Evidence |  |
| valid | p20-former-outcome | device-ownership.schema.json#/$defs/FormerSubmission |  |
| valid | p20-adoption-designed-only | device-ownership.schema.json#/$defs/AdoptionCommand |  |
| valid | p20-notification-1 | device-ownership.schema.json#/$defs/TransferEvent |  |
| valid | p20-notification-2 | device-ownership.schema.json#/$defs/EvidenceEvent |  |
| valid | p20-notification-3 | device-ownership.schema.json#/$defs/EvidenceEvent |  |
| valid | p21-offer-command | returns.schema.json#/$defs/RequestCommand |  |
| valid | p21-receive-command | returns.schema.json#/$defs/ReceiveCommand |  |
| valid | p21-loss-command | returns.schema.json#/$defs/DisposeCommand |  |
| valid | p21-offered | returns.schema.json#/$defs/RequestView |  |
| valid | p21-received | returns.schema.json#/$defs/RequestView |  |
| valid | p21-disposed | returns.schema.json#/$defs/RequestView |  |
| valid | p21-waiting | returns.schema.json#/$defs/Confirmation |  |
| valid | p21-confirmed | returns.schema.json#/$defs/Confirmation |  |
| valid | p21-unconfirmed | returns.schema.json#/$defs/Confirmation |  |
| valid | p21-requested | returns.schema.json#/$defs/RequestedEvent |  |
| valid | p21-subsetReceived | returns.schema.json#/$defs/ReceivedEvent |  |
| valid | p21-dispositionRecorded | returns.schema.json#/$defs/DispositionEvent |  |
| valid | p21-accepted | returns.schema.json#/$defs/ActionResult |  |
| valid | p21-recovered | returns.schema.json#/$defs/ActionStatus |  |
| valid | p22-interrupt | branch-activity.schema.json#/$defs/InterruptCommand |  |
| valid | p22-arrive | branch-activity.schema.json#/$defs/ArrivalCommand |  |
| valid | p22-resume | branch-activity.schema.json#/$defs/ResumeCommand |  |
| valid | p22-redispatch | b2b-intake.schema.json#/$defs/RedispatchCommand |  |
| valid | p22-cycles | b2b-intake.schema.json#/$defs/CycleList |  |
| valid | p22-resumed-current | current-activity.schema.json#/$defs/Snapshot |  |
| valid | p22-interrupted | branch-activity.schema.json#/$defs/Result |  |
| valid | p22-arrived | branch-activity.schema.json#/$defs/Result |  |
| valid | p22-resumed | branch-activity.schema.json#/$defs/Result |  |
| valid | p22-event-0 | branch-activity.schema.json#/$defs/Event |  |
| valid | p22-event-1 | branch-activity.schema.json#/$defs/Event |  |
| valid | p22-event-2 | b2b-intake.schema.json#/$defs/ChangedEvent |  |
| valid | p22-event-3 | branch-activity.schema.json#/$defs/Event |  |
| valid | p23-correct-one-piece | corrections.schema.json#/$defs/CorrectCommand |  |
| valid | p23-captured-outcome.corrected-0 | corrections.schema.json#/$defs/Event |  |
| valid | p23-captured-outcome.corrected-1 | corrections.schema.json#/$defs/Event |  |
| valid | p23-captured-evidence.adoptionResolved-2 | corrections.schema.json#/$defs/AdoptionEvent |  |
| valid | p23-receipt-denied-availability | corrections.schema.json#/$defs/Availability |  |
| valid | monitoring-scoped | monitoring.schema.json#/$defs/Snapshot |  |
| valid | monitoring-own | monitoring.schema.json#/$defs/Snapshot |  |
| valid | monitoring-corrected | monitoring.schema.json#/$defs/Snapshot |  |
| valid | monitoring-history | monitoring.schema.json#/$defs/History |  |
| valid | monitoring-workday | monitoring.schema.json#/$defs/History |  |
| valid | p25-provisioning.changed | events/sender-event.v1.schema.json |  |
| valid | p25-task.snapshotAccepted | events/sender-event.v1.schema.json |  |
| valid | p25-assignment.received | events/sender-event.v1.schema.json |  |
| valid | p25-round.started | events/sender-event.v1.schema.json |  |
| valid | p25-outcome.recorded | events/sender-event.v1.schema.json |  |
| valid | p25-outcome.corrected | events/sender-event.v1.schema.json |  |
| valid | p25-return.requested | events/sender-event.v1.schema.json |  |
| valid | p25-return.subsetReceived | events/sender-event.v1.schema.json |  |
| valid | p25-plan.revisionPublished | events/sender-event.v1.schema.json |  |
| valid | p25-queue-received | outbox.schema.json#/$defs/Queue |  |
| valid | p25-receipt-only | outbox.schema.json#/$defs/Acknowledgement |  |
| valid | p26-captured-current-task-0 | consumer.schema.json#/$defs/Snapshot |  |
| valid | p26-captured-current-integration-1 | consumer.schema.json#/$defs/Snapshot |  |
| valid | p26-captured-current-task-2 | consumer.schema.json#/$defs/Snapshot |  |
| valid | p26-captured-current-trip-3 | consumer.schema.json#/$defs/Snapshot |  |
| valid | p26-captured-current-return-request-4 | consumer.schema.json#/$defs/Snapshot |  |
| valid | p26-captured-applied-report-0 | consumer.schema.json#/$defs/ReportRead |  |
| valid | p26-captured-applied-report-1 | consumer.schema.json#/$defs/ReportRead |  |
| valid | p26-captured-applied-report-2 | consumer.schema.json#/$defs/ReportRead |  |
| valid | p26-captured-applied-report-3 | consumer.schema.json#/$defs/ReportRead |  |
| valid | p26-captured-applied-report-4 | consumer.schema.json#/$defs/ReportRead |  |
| valid | p26-captured-consumer-status | consumer.schema.json#/$defs/Status |  |
| valid | p26-report-command-fixture | consumer.schema.json#/$defs/ReportCommand |  |
| valid | p27-source-pending | source.schema.json#/$defs/Status |  |
| valid | p27-source-completed-capture | source.schema.json#/$defs/Status |  |
| valid | p30-frozen-piece-delivery | current-activity.schema.json#/$defs/DeliveryAffordance |  |
| valid | p30-correction-view-retained-original | corrections.schema.json#/$defs/Availability |  |
| valid | p31-recovered-pending-requests | returns.schema.json#/$defs/Groups |  |
| valid | p31-ended-round-activity-revision | workday-closure.schema.json#/$defs/RoundSummary |  |
| valid | local-started-download-v1 | local-work.schema.json#/$defs/Download |  |
| valid | local-immutable-capture-v1 | local-work.schema.json#/$defs/Action |  |
| valid | p33-plan-with-downloaded-road-context | planning.schema.json#/$defs/Plan |  |
| valid | p34-batch | sync.schema.json#/$defs/Batch |  |
| valid | p34-waiting | sync.schema.json#/$defs/Entry |  |
| valid | p34-mixed-results | sync.schema.json#/$defs/BatchResult |  |
| valid | p34-conflicts-empty | sync.schema.json#/$defs/Conflicts |  |
| valid | p35-same-account-recovery-fixture | session.schema.json#/$defs/LoginRequest |  |
| valid | p35-sealed-selection-fixture | local-work.schema.json#/$defs/Selection |  |
| valid | p35-scoped-form-draft-fixture | local-work.schema.json#/$defs/Draft |  |
| valid | report-Counts | reporting.schema.json#/$defs/Counts |  |
| valid | report-Collection | reporting.schema.json#/$defs/Collection |  |
| valid | report-Time | reporting.schema.json#/$defs/Time |  |
| valid | report-Measurement | reporting.schema.json#/$defs/Measurement |  |
| valid | report-Filters | reporting.schema.json#/$defs/Filters |  |
| valid | report-Pieces | reporting.schema.json#/$defs/Pieces |  |
| invalid | piece--1 | common.schema.json#/$defs/PieceCount | minimum |
| invalid | piece-1.5 | common.schema.json#/$defs/PieceCount | type |
| invalid | piece-2 | common.schema.json#/$defs/PieceCount | type |
| invalid | piece-9007199254740992 | common.schema.json#/$defs/PieceCount | maximum |
| invalid | positive-piece-zero | common.schema.json#/$defs/PositivePieceCount | minimum |
| invalid | money-fraction | common.schema.json#/$defs/Money | type |
| invalid | money-decimal-string | common.schema.json#/$defs/Money | type |
| invalid | money-negative | common.schema.json#/$defs/Money | minimum |
| invalid | money-unsafe-integer | common.schema.json#/$defs/Money | maximum |
| invalid | money-missing-currency | common.schema.json#/$defs/Money | required |
| invalid | money-invalid-currency | common.schema.json#/$defs/Money | pattern |
| invalid | money-egp-wrong-exponent | common.schema.json#/$defs/Money | const |
| invalid | uuid-not-uuid | common.schema.json#/$defs/Uuid | format |
| invalid | source-missing-scope | common.schema.json#/$defs/SourceReference | required |
| invalid | revision-zero | common.schema.json#/$defs/Revision | minimum |
| invalid | time-local-offset | common.schema.json#/$defs/UtcInstant | pattern |
| invalid | time-invalid-date | common.schema.json#/$defs/UtcInstant | format |
| invalid | pin-outside-latitude | common.schema.json#/$defs/Coordinates | maximum |
| invalid | action-future-envelope | action-envelope.v1.schema.json | const |
| invalid | action-future-payload | action-envelope.v1.schema.json | const |
| invalid | action-missing-device-generation | action-envelope.v1.schema.json | required |
| invalid | action-extra-authority | action-envelope.v1.schema.json | additionalProperties |
| invalid | action-duplicate-dependency | action-envelope.v1.schema.json | uniqueItems |
| invalid | evidence-received-not-accepted | evidence-receipt.v1.schema.json | not |
| invalid | evidence-accepted-without-commit | evidence-receipt.v1.schema.json | required |
| invalid | evidence-not-erp-applied | evidence-receipt.v1.schema.json | enum |
| invalid | evidence-review-without-problem | evidence-receipt.v1.schema.json | required |
| invalid | event-unsupported-version | events/envelope.v1.schema.json | const |
| invalid | event-sequence-zero | events/envelope.v1.schema.json | minimum |
| invalid | event-missing-recipient | events/envelope.v1.schema.json | required |
| invalid | event-snapshot-without-revision | events/envelope.v1.schema.json | required |
| invalid | event-transition-not-snapshot | events/envelope.v1.schema.json | not |
| invalid | unknown-null-is-not-zero | common.schema.json#/$defs/Money | type |
| invalid | conflict-must-be-409 | common.schema.json#/$defs/Problem | const |
| invalid | location-has-no-destination | common.schema.json#/$defs/LocationSnapshot | anyOf |
| invalid | action-result-full-missing-response | action-result.v1.schema.json | required |
| invalid | action-result-compacted-with-response | action-result.v1.schema.json | not |
| invalid | action-result-pending | action-result.v1.schema.json | enum |
| invalid | access-unknown-effect | common.schema.json#/$defs/CapabilityOverride | enum |
| invalid | access-branch-override | common.schema.json#/$defs/CapabilityOverride | additionalProperties |
| invalid | access-role-name-capability | common.schema.json#/$defs/CapabilityOverride | enum |
| invalid | access-personal-branch | common.schema.json#/$defs/AccessContext | maxItems |
| invalid | access-integration-driver | common.schema.json#/$defs/AccessContext | type |
| invalid | access-integration-own | common.schema.json#/$defs/AccessContext | not |
| invalid | access-duplicate-grants | common.schema.json#/$defs/AccessContext | uniqueItems |
| invalid | session-forged-redirect | session.schema.json#/$defs/LoginRequest | additionalProperties |
| invalid | session-unknown-kind | session.schema.json#/$defs/KindRequest | enum |
| invalid | session-extra-scope | session.schema.json#/$defs/KindRequest | additionalProperties |
| invalid | session-no-state | session.schema.json#/$defs/CallbackQuery | required |
| invalid | p08-actor | provisioning.schema.json#/$defs/UserCommand | additionalProperties |
| invalid | p08-raw-actor | provisioning.schema.json#/$defs/UserCommand | additionalProperties |
| invalid | p08-password | provisioning.schema.json#/$defs/UserCommand | additionalProperties |
| invalid | p08-revision-zero | provisioning.schema.json#/$defs/UserCommand | minimum |
| invalid | p08-multiple-roles | provisioning.schema.json#/$defs/UserCommand | additionalProperties |
| invalid | p08-duplicate-branch | provisioning.schema.json#/$defs/UserCommand | uniqueItems |
| invalid | p08-future-version | provisioning.schema.json#/$defs/UserCommand | const |
| invalid | p08-scope-omitted | provisioning.schema.json#/$defs/UserCommand | required |
| invalid | p08-unhandled-dependency | provisioning.schema.json#/$defs/UserCommand | maxItems |
| invalid | p09-phone-required | b2c-intake.schema.json#/$defs/CreateIndependentPayload | required |
| invalid | p09-amount-must-use-supported-exponent | b2c-intake.schema.json#/$defs/CreateIndependentPayload | const |
| invalid | p10-fractional-piece | b2b-intake.schema.json#/$defs/SourceSnapshot | type |
| invalid | p10-missing-unit-due | b2b-intake.schema.json#/$defs/SourceSnapshot | required |
| invalid | p10-ambiguous-deposit | b2b-intake.schema.json#/$defs/SourceSnapshot | additionalProperties |
| invalid | p10-missing-splitting-permission | b2b-intake.schema.json#/$defs/SourceSnapshot | required |
| invalid | p10-mixed-currency | b2b-intake.schema.json#/$defs/SourceSnapshot | const |
| invalid | p10-unasserted-receipt | b2b-intake.schema.json#/$defs/ReceiveBatch | const |
| invalid | location-invalid-confirmation | location.schema.json#/$defs/Confirm | maximum |
| invalid | routing-gps-origin | routing.schema.json#/$defs/OptimizationInput | enum |
| invalid | routing-provider-label | routing.schema.json#/$defs/OptimizationInput | enum |
| invalid | routing-positional-coordinate | routing.schema.json#/$defs/OptimizationInput | type |
| invalid | p13-fake-active | planning.schema.json#/$defs/Plan | enum |
| invalid | p13-fake-policy | planning.schema.json#/$defs/Plan | const |
| invalid | p13-gps-origin | planning.schema.json#/$defs/Settings | const |
| invalid | p13-missing-attempt | planning.schema.json#/$defs/Input | required |
| invalid | p13-fake-status | planning.schema.json#/$defs/Job | enum |
| invalid | p13-negative-revision | planning.schema.json#/$defs/SaveDraftCommand | minimum |
| invalid | p13-impossible-complete | planning.schema.json#/$defs/Job | type |
| invalid | p13-impossible-running | planning.schema.json#/$defs/Job | type |
| invalid | p14-manual-fake-road | planning.schema.json#/$defs/Plan | type |
| invalid | p14-partial-ready | planning.schema.json#/$defs/Plan | const |
| invalid | p14-manual-eta | planning.schema.json#/$defs/Plan | type |
| invalid | p14-no-policy | planning.schema.json#/$defs/Plan | const |
| invalid | p14-duplicate-manual | planning.schema.json#/$defs/ManualOrderCommand | uniqueItems |
| invalid | p15-no-client-sync-flag | round-start.schema.json#/$defs/StartCommand | additionalProperties |
| invalid | p15-local-draft-not-active | round-start.schema.json#/$defs/Round | const |
| invalid | arrived-without-recorded-action | current-activity.schema.json#/$defs/Activity | type |
| invalid | heading-with-inferred-arrival | current-activity.schema.json#/$defs/Activity | type |
| invalid | current-next-is-not-stage | current-activity.schema.json#/$defs/Activity | enum |
| invalid | p16-no-arbitrary-selection | current-activity.schema.json#/$defs/SelectHeadingCommand | required |
| invalid | p16-arrival-must-identify-current | current-activity.schema.json#/$defs/ArrivalCommand | type |
| invalid | p17-invalid-fraction | outcomes.schema.json#/$defs/PartialCommand | type |
| invalid | p17-invalid-negative | outcomes.schema.json#/$defs/PartialCommand | minimum |
| invalid | p17-invalid-unsafe-money | outcomes.schema.json#/$defs/FullCommand | maximum |
| invalid | p17-invalid-unlike-currency | outcomes.schema.json#/$defs/FullCommand | const |
| invalid | p17-invalid-no-answer-fee-refusal | outcomes.schema.json#/$defs/NoAnswerCommand | additionalProperties |
| invalid | p17-invalid-no-answer-arrival | outcomes.schema.json#/$defs/NoAnswerCommand | additionalProperties |
| invalid | p17-no-answer-fabricated-collection | outcomes.schema.json#/$defs/Record | type |
| invalid | p17-personal-piece-result | outcomes.schema.json#/$defs/Record | maxItems |
| invalid | p18-call-counter | eligibility.schema.json#/$defs/RetryCommand | additionalProperties |
| invalid | p18-negative-revision | eligibility.schema.json#/$defs/RetryCommand | minimum |
| invalid | p18-fractional-revision | eligibility.schema.json#/$defs/RetryCommand | type |
| invalid | p18-overflow-revision | eligibility.schema.json#/$defs/RetryCommand | maximum |
| invalid | p18-appointment-window | eligibility.schema.json#/$defs/RetryCommand | additionalProperties |
| invalid | p18-bad-date | eligibility.schema.json#/$defs/DeferCommand | format |
| invalid | p18-bad-urgency | eligibility.schema.json#/$defs/UrgencyCommand | enum |
| invalid | p18-missing-revision | eligibility.schema.json#/$defs/RetryCommand | required |
| invalid | p18-operation-mismatch | eligibility.schema.json#/$defs/RetryCommand | const |
| invalid | p19-missing-current-choice | workday-closure.schema.json#/$defs/EndDayCommand | required |
| invalid | p19-fabricated-settlement | workday-closure.schema.json#/$defs/EndDayCommand | additionalProperties |
| invalid | p19-round-without-active-expectation | workday-closure.schema.json#/$defs/EndRoundCommand | type |
| invalid | p19-negative-revision | workday-closure.schema.json#/$defs/EndRoundCommand | minimum |
| invalid | p19-non-utc-server-time | workday-closure.schema.json#/$defs/Record | pattern |
| invalid | p19-negative-denominator | workday-closure.schema.json#/$defs/Summary | minimum |
| invalid | p19-deferred-cannot-be-executable | workday-closure.schema.json#/$defs/CarryItem | type |
| invalid | p19-closure-not-receipt | workday-closure.schema.json#/$defs/Event | additionalProperties |
| invalid | p20-takeover-missing-generation | device-ownership.schema.json#/$defs/TakeoverCommand | required |
| invalid | p20-takeover-staff-override | device-ownership.schema.json#/$defs/TakeoverCommand | additionalProperties |
| invalid | p20-takeover-client-time-winner | device-ownership.schema.json#/$defs/TakeoverCommand | additionalProperties |
| invalid | p20-takeover-fraction-generation | device-ownership.schema.json#/$defs/TakeoverCommand | type |
| invalid | p20-bad-snapshot-token | device-ownership.schema.json#/$defs/FormerSubmission | format |
| invalid | p20-adoption-no-receipt | device-ownership.schema.json#/$defs/AdoptionCommand | required |
| invalid | p21-fractional-receipt | returns.schema.json#/$defs/ReceiveCommand | type |
| invalid | p21-empty-subset | returns.schema.json#/$defs/ReceiveCommand | minItems |
| invalid | p21-forged-human | returns.schema.json#/$defs/ReceiveCommand | additionalProperties |
| invalid | p21-stock-claim | returns.schema.json#/$defs/ReceiveCommand | additionalProperties |
| invalid | p21-receipt-as-loss | returns.schema.json#/$defs/ReceivedEvent | const |
| invalid | p21-loss-as-receipt | returns.schema.json#/$defs/DispositionEvent | enum |
| invalid | p22-empty-claims | branch-activity.schema.json#/$defs/InterruptCommand | minItems |
| invalid | p22-fractional-claim | branch-activity.schema.json#/$defs/InterruptCommand | type |
| invalid | p22-arbitrary-branch | branch-activity.schema.json#/$defs/InterruptCommand | additionalProperties |
| invalid | p22-fractional-redispatch | b2b-intake.schema.json#/$defs/RedispatchCommand | type |
| invalid | p23-deny-price-edit | corrections.schema.json#/$defs/CorrectCommand | additionalProperties |
| invalid | p23-deny-fraction | corrections.schema.json#/$defs/CorrectCommand | type |
| invalid | p23-deny-revision | corrections.schema.json#/$defs/CorrectCommand | required |
| invalid | p23-event-reject-0 | corrections.schema.json#/$defs/Event | minimum |
| invalid | p23-event-reject-1 | corrections.schema.json#/$defs/Event | minimum |
| invalid | p23-event-reject-2 | corrections.schema.json#/$defs/AdoptionEvent | required |
| invalid | monitoring-hidden-count | monitoring.schema.json#/$defs/Snapshot | additionalProperties |
| invalid | monitoring-false-presence | monitoring.schema.json#/$defs/Snapshot | additionalProperties |
| invalid | monitoring-false-applied | monitoring.schema.json#/$defs/Snapshot | const |
| invalid | monitoring-fractional-count | monitoring.schema.json#/$defs/Snapshot | type |
| invalid | monitoring-missing-revision | monitoring.schema.json#/$defs/Snapshot | required |
| invalid | p25-ack-is-not-applied | outbox.schema.json#/$defs/Acknowledgement | additionalProperties |
| invalid | p25-unsupported-payload | events/sender-event.v1.schema.json | const |
| invalid | p25-unknown-event | events/sender-event.v1.schema.json | const |
| invalid | p26-status-without-applied-watermark | consumer.schema.json#/$defs/Status | required |
| invalid | p26-snapshot-invents-history | consumer.schema.json#/$defs/Snapshot | const |
| invalid | p26-invalid-report-source | consumer.schema.json#/$defs/ReportCommand | format |
| invalid | p27-source-phantom-acceptance | source.schema.json#/$defs/Status | type |
| invalid | p27-source-rejection-cannot-be-accepted | source.schema.json#/$defs/Status | const |
| invalid | p30-fractional-frozen-pieces | current-activity.schema.json#/$defs/DeliveryAffordance | type |
| invalid | p31-malformed-pending-request | returns.schema.json#/$defs/Groups | required |
| invalid | p31-negative-round-activity-revision | workday-closure.schema.json#/$defs/RoundSummary | minimum |
| invalid | local-unsupported-download-format | local-work.schema.json#/$defs/Download | const |
| invalid | p33-plan-fabricated-road-provenance | planning.schema.json#/$defs/Plan | const |
| invalid | p34-empty-batch | sync.schema.json#/$defs/Batch | minItems |
| invalid | p34-batch-limit | sync.schema.json#/$defs/Batch | maxItems |
| invalid | p34-blanket-success | sync.schema.json#/$defs/BatchResult | required |
| invalid | p34-received-without-receipt | sync.schema.json#/$defs/Entry | required |
| invalid | p35-account-restriction-without-reauth | session.schema.json#/$defs/LoginRequest | required |
| invalid | p35-account-restriction-not-an-auth-grant | session.schema.json#/$defs/LoginRequest | additionalProperties |
| invalid | p35-unknown-payload-not-v1 | sync.schema.json#/$defs/Batch | const |
| invalid | report-no-invented-actual | reporting.schema.json#/$defs/Time | type |
| invalid | report-null-needs-reason | reporting.schema.json#/$defs/Measurement | oneOf |
| invalid | report-money-is-exact | reporting.schema.json#/$defs/Collection | type |
| invalid | report-no-cross-tenant-filter | reporting.schema.json#/$defs/Filters | additionalProperties |

## Original file: contracts/examples/invalid.json

SHA-256: `3234326d04ff99b777232ac833bed319ad08158e18653016d34243ce6c2b8827` · Bytes: 225344.

<!-- SOURCE-BEGIN contracts/examples/invalid.json -->
````json
[
  {
    "id": "piece--1",
    "schema": "common.schema.json#/$defs/PieceCount",
    "valid": false,
    "keyword": "minimum",
    "data": -1
  },
  {
    "id": "piece-1.5",
    "schema": "common.schema.json#/$defs/PieceCount",
    "valid": false,
    "keyword": "type",
    "data": 1.5
  },
  {
    "id": "piece-2",
    "schema": "common.schema.json#/$defs/PieceCount",
    "valid": false,
    "keyword": "type",
    "data": "2"
  },
  {
    "id": "piece-9007199254740992",
    "schema": "common.schema.json#/$defs/PieceCount",
    "valid": false,
    "keyword": "maximum",
    "data": 9007199254740992
  },
  {
    "id": "positive-piece-zero",
    "schema": "common.schema.json#/$defs/PositivePieceCount",
    "valid": false,
    "keyword": "minimum",
    "data": 0
  },
  {
    "id": "money-fraction",
    "schema": "common.schema.json#/$defs/Money",
    "valid": false,
    "keyword": "type",
    "data": {
      "amountMinor": 250.5,
      "currency": "EGP",
      "exponent": 2
    }
  },
  {
    "id": "money-decimal-string",
    "schema": "common.schema.json#/$defs/Money",
    "valid": false,
    "keyword": "type",
    "data": {
      "amountMinor": "250.00",
      "currency": "EGP",
      "exponent": 2
    }
  },
  {
    "id": "money-negative",
    "schema": "common.schema.json#/$defs/Money",
    "valid": false,
    "keyword": "minimum",
    "data": {
      "amountMinor": -1,
      "currency": "EGP",
      "exponent": 2
    }
  },
  {
    "id": "money-unsafe-integer",
    "schema": "common.schema.json#/$defs/Money",
    "valid": false,
    "keyword": "maximum",
    "data": {
      "amountMinor": 9007199254740992,
      "currency": "EGP",
      "exponent": 2
    }
  },
  {
    "id": "money-missing-currency",
    "schema": "common.schema.json#/$defs/Money",
    "valid": false,
    "keyword": "required",
    "data": {
      "amountMinor": 25000,
      "exponent": 2
    }
  },
  {
    "id": "money-invalid-currency",
    "schema": "common.schema.json#/$defs/Money",
    "valid": false,
    "keyword": "pattern",
    "data": {
      "amountMinor": 25000,
      "currency": "egp",
      "exponent": 2
    }
  },
  {
    "id": "money-egp-wrong-exponent",
    "schema": "common.schema.json#/$defs/Money",
    "valid": false,
    "keyword": "const",
    "data": {
      "amountMinor": 25000,
      "currency": "EGP",
      "exponent": 3
    }
  },
  {
    "id": "uuid-not-uuid",
    "schema": "common.schema.json#/$defs/Uuid",
    "valid": false,
    "keyword": "format",
    "data": "shipment-001"
  },
  {
    "id": "source-missing-scope",
    "schema": "common.schema.json#/$defs/SourceReference",
    "valid": false,
    "keyword": "required",
    "data": {
      "externalId": "shipment-001"
    }
  },
  {
    "id": "revision-zero",
    "schema": "common.schema.json#/$defs/Revision",
    "valid": false,
    "keyword": "minimum",
    "data": 0
  },
  {
    "id": "time-local-offset",
    "schema": "common.schema.json#/$defs/UtcInstant",
    "valid": false,
    "keyword": "pattern",
    "data": "2026-09-22T13:00:00+03:00"
  },
  {
    "id": "time-invalid-date",
    "schema": "common.schema.json#/$defs/UtcInstant",
    "valid": false,
    "keyword": "format",
    "data": "2026-02-30T10:00:00Z"
  },
  {
    "id": "pin-outside-latitude",
    "schema": "common.schema.json#/$defs/Coordinates",
    "valid": false,
    "keyword": "maximum",
    "data": {
      "latitude": 91,
      "longitude": 31
    }
  },
  {
    "id": "action-future-envelope",
    "schema": "action-envelope.v1.schema.json",
    "valid": false,
    "keyword": "const",
    "data": {
      "schemaVersion": "2.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.recordPartial",
      "context": {
        "kind": "device",
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "accountId": "10000000-0000-4000-8000-000000000003",
        "deviceId": "10000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "baseVersions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "dependsOnActionIds": [
        "10000000-0000-4000-8000-000000000039"
      ],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "deliveredPieces": 2,
        "reportedCollection": {
          "amountMinor": 25000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "action-future-payload",
    "schema": "action-envelope.v1.schema.json",
    "valid": false,
    "keyword": "const",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "2.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.recordPartial",
      "context": {
        "kind": "device",
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "accountId": "10000000-0000-4000-8000-000000000003",
        "deviceId": "10000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "baseVersions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "dependsOnActionIds": [
        "10000000-0000-4000-8000-000000000039"
      ],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "deliveredPieces": 2,
        "reportedCollection": {
          "amountMinor": 25000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "action-missing-device-generation",
    "schema": "action-envelope.v1.schema.json",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.recordPartial",
      "context": {
        "kind": "device",
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "accountId": "10000000-0000-4000-8000-000000000003",
        "deviceId": "10000000-0000-4000-8000-000000000004",
        "deviceSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "baseVersions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "dependsOnActionIds": [
        "10000000-0000-4000-8000-000000000039"
      ],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "deliveredPieces": 2,
        "reportedCollection": {
          "amountMinor": 25000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "action-extra-authority",
    "schema": "action-envelope.v1.schema.json",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.recordPartial",
      "context": {
        "kind": "device",
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "accountId": "10000000-0000-4000-8000-000000000003",
        "deviceId": "10000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "baseVersions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "dependsOnActionIds": [
        "10000000-0000-4000-8000-000000000039"
      ],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "deliveredPieces": 2,
        "reportedCollection": {
          "amountMinor": 25000,
          "currency": "EGP",
          "exponent": 2
        }
      },
      "adminOverride": true
    }
  },
  {
    "id": "action-duplicate-dependency",
    "schema": "action-envelope.v1.schema.json",
    "valid": false,
    "keyword": "uniqueItems",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.recordPartial",
      "context": {
        "kind": "device",
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "accountId": "10000000-0000-4000-8000-000000000003",
        "deviceId": "10000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "baseVersions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "dependsOnActionIds": [
        "10000000-0000-4000-8000-000000000039",
        "10000000-0000-4000-8000-000000000039"
      ],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "deliveredPieces": 2,
        "reportedCollection": {
          "amountMinor": 25000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "evidence-received-not-accepted",
    "schema": "evidence-receipt.v1.schema.json",
    "valid": false,
    "keyword": "not",
    "data": {
      "schemaVersion": "1.0.0",
      "receiptId": "10000000-0000-4000-8000-000000000070",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "evidenceStatus": "received",
      "businessStatus": "pending",
      "receivedAt": "2026-09-22T10:00:00Z",
      "committedAt": "2026-09-22T10:00:00Z"
    }
  },
  {
    "id": "evidence-accepted-without-commit",
    "schema": "evidence-receipt.v1.schema.json",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "receiptId": "10000000-0000-4000-8000-000000000070",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "evidenceStatus": "received",
      "businessStatus": "accepted",
      "receivedAt": "2026-09-22T10:00:00Z"
    }
  },
  {
    "id": "evidence-not-erp-applied",
    "schema": "evidence-receipt.v1.schema.json",
    "valid": false,
    "keyword": "enum",
    "data": {
      "schemaVersion": "1.0.0",
      "receiptId": "10000000-0000-4000-8000-000000000070",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "evidenceStatus": "received",
      "businessStatus": "applied",
      "receivedAt": "2026-09-22T10:00:00Z"
    }
  },
  {
    "id": "evidence-review-without-problem",
    "schema": "evidence-receipt.v1.schema.json",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "receiptId": "10000000-0000-4000-8000-000000000070",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "evidenceStatus": "received",
      "businessStatus": "review-required",
      "receivedAt": "2026-09-22T10:00:00Z"
    }
  },
  {
    "id": "event-unsupported-version",
    "schema": "events/envelope.v1.schema.json",
    "valid": false,
    "keyword": "const",
    "data": {
      "schemaVersion": "9.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000050",
      "eventType": "outcome.recorded",
      "eventKind": "transition",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "recipientIntegrationId": "10000000-0000-4000-8000-000000000002",
      "aggregate": {
        "type": "task",
        "id": "10000000-0000-4000-8000-000000000010",
        "recipientSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "10000000-0000-4000-8000-000000000040",
        "sourceReference": {
          "tenantId": "10000000-0000-4000-8000-000000000001",
          "integrationId": "10000000-0000-4000-8000-000000000002",
          "externalId": "shipment-001"
        }
      },
      "committedAt": "2026-09-22T10:00:00Z",
      "payload": {
        "outcomeId": "10000000-0000-4000-8000-000000000060"
      }
    }
  },
  {
    "id": "event-sequence-zero",
    "schema": "events/envelope.v1.schema.json",
    "valid": false,
    "keyword": "minimum",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000050",
      "eventType": "outcome.recorded",
      "eventKind": "transition",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "recipientIntegrationId": "10000000-0000-4000-8000-000000000002",
      "aggregate": {
        "type": "task",
        "id": "10000000-0000-4000-8000-000000000010",
        "recipientSequence": 0
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "10000000-0000-4000-8000-000000000040",
        "sourceReference": {
          "tenantId": "10000000-0000-4000-8000-000000000001",
          "integrationId": "10000000-0000-4000-8000-000000000002",
          "externalId": "shipment-001"
        }
      },
      "committedAt": "2026-09-22T10:00:00Z",
      "payload": {
        "outcomeId": "10000000-0000-4000-8000-000000000060"
      }
    }
  },
  {
    "id": "event-missing-recipient",
    "schema": "events/envelope.v1.schema.json",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000050",
      "eventType": "outcome.recorded",
      "eventKind": "transition",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "aggregate": {
        "type": "task",
        "id": "10000000-0000-4000-8000-000000000010",
        "recipientSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "10000000-0000-4000-8000-000000000040",
        "sourceReference": {
          "tenantId": "10000000-0000-4000-8000-000000000001",
          "integrationId": "10000000-0000-4000-8000-000000000002",
          "externalId": "shipment-001"
        }
      },
      "committedAt": "2026-09-22T10:00:00Z",
      "payload": {
        "outcomeId": "10000000-0000-4000-8000-000000000060"
      }
    }
  },
  {
    "id": "event-snapshot-without-revision",
    "schema": "events/envelope.v1.schema.json",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000050",
      "eventType": "outcome.recorded",
      "eventKind": "replacement-snapshot",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "recipientIntegrationId": "10000000-0000-4000-8000-000000000002",
      "aggregate": {
        "type": "task",
        "id": "10000000-0000-4000-8000-000000000010",
        "recipientSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "10000000-0000-4000-8000-000000000040",
        "sourceReference": {
          "tenantId": "10000000-0000-4000-8000-000000000001",
          "integrationId": "10000000-0000-4000-8000-000000000002",
          "externalId": "shipment-001"
        }
      },
      "committedAt": "2026-09-22T10:00:00Z",
      "payload": {
        "outcomeId": "10000000-0000-4000-8000-000000000060"
      }
    }
  },
  {
    "id": "event-transition-not-snapshot",
    "schema": "events/envelope.v1.schema.json",
    "valid": false,
    "keyword": "not",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000050",
      "eventType": "outcome.recorded",
      "eventKind": "transition",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "recipientIntegrationId": "10000000-0000-4000-8000-000000000002",
      "aggregate": {
        "type": "task",
        "id": "10000000-0000-4000-8000-000000000010",
        "recipientSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "10000000-0000-4000-8000-000000000040",
        "sourceReference": {
          "tenantId": "10000000-0000-4000-8000-000000000001",
          "integrationId": "10000000-0000-4000-8000-000000000002",
          "externalId": "shipment-001"
        }
      },
      "committedAt": "2026-09-22T10:00:00Z",
      "payload": {
        "outcomeId": "10000000-0000-4000-8000-000000000060"
      },
      "snapshotRevision": 8
    }
  },
  {
    "id": "unknown-null-is-not-zero",
    "schema": "common.schema.json#/$defs/Money",
    "valid": false,
    "keyword": "type",
    "data": {
      "amountMinor": null,
      "currency": "EGP",
      "exponent": 2
    }
  },
  {
    "id": "conflict-must-be-409",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": false,
    "keyword": "const",
    "data": {
      "type": "urn:tawsel:problem:idempotency_conflict",
      "title": "Action identity already has a different payload",
      "status": 400,
      "code": "idempotency_conflict",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "location-has-no-destination",
    "schema": "common.schema.json#/$defs/LocationSnapshot",
    "valid": false,
    "keyword": "anyOf",
    "data": {
      "provenance": "source"
    }
  },
  {
    "id": "action-result-full-missing-response",
    "schema": "action-result.v1.schema.json",
    "valid": false,
    "keyword": "required",
    "data": {
      "receipt": {
        "schemaVersion": "1.0.0",
        "receiptId": "10000000-0000-4000-8000-000000000070",
        "actionId": "10000000-0000-4000-8000-000000000040",
        "evidenceStatus": "received",
        "businessStatus": "accepted",
        "receivedAt": "2026-09-22T10:00:00Z",
        "committedAt": "2026-09-22T10:00:01Z",
        "resourceVersions": {
          "sourceRevision": 1,
          "resourceRevision": 1,
          "outcomeRevision": 1,
          "assignmentGeneration": 1,
          "routeRevision": 2,
          "deviceGeneration": 1,
          "snapshotRevision": 5
        }
      },
      "operationId": "outcome.recordPartial",
      "retention": "full",
      "summary": {
        "outcomeId": "10000000-0000-4000-8000-000000000080",
        "outcomeRevision": 1
      }
    }
  },
  {
    "id": "action-result-compacted-with-response",
    "schema": "action-result.v1.schema.json",
    "valid": false,
    "keyword": "not",
    "data": {
      "receipt": {
        "schemaVersion": "1.0.0",
        "receiptId": "10000000-0000-4000-8000-000000000070",
        "actionId": "10000000-0000-4000-8000-000000000040",
        "evidenceStatus": "received",
        "businessStatus": "accepted",
        "receivedAt": "2026-09-22T10:00:00Z",
        "committedAt": "2026-09-22T10:00:01Z",
        "resourceVersions": {
          "sourceRevision": 1,
          "resourceRevision": 1,
          "outcomeRevision": 1,
          "assignmentGeneration": 1,
          "routeRevision": 2,
          "deviceGeneration": 1,
          "snapshotRevision": 5
        }
      },
      "operationId": "outcome.recordPartial",
      "retention": "compacted",
      "summary": {
        "outcomeId": "10000000-0000-4000-8000-000000000080",
        "outcomeRevision": 1
      },
      "response": {
        "status": 200,
        "body": {
          "outcomeId": "10000000-0000-4000-8000-000000000080",
          "deliveredPieces": 2
        }
      }
    }
  },
  {
    "id": "action-result-pending",
    "schema": "action-result.v1.schema.json",
    "valid": false,
    "keyword": "enum",
    "data": {
      "receipt": {
        "schemaVersion": "1.0.0",
        "receiptId": "10000000-0000-4000-8000-000000000070",
        "actionId": "10000000-0000-4000-8000-000000000040",
        "evidenceStatus": "received",
        "businessStatus": "pending",
        "receivedAt": "2026-09-22T10:00:00Z"
      },
      "operationId": "outcome.recordPartial",
      "retention": "full",
      "summary": {
        "outcomeId": "10000000-0000-4000-8000-000000000080",
        "outcomeRevision": 1
      },
      "response": {
        "status": 200,
        "body": {
          "outcomeId": "10000000-0000-4000-8000-000000000080",
          "deliveredPieces": 2
        }
      }
    }
  },
  {
    "id": "access-unknown-effect",
    "schema": "common.schema.json#/$defs/CapabilityOverride",
    "valid": false,
    "keyword": "enum",
    "data": {
      "capability": "planning.manage",
      "effect": "admin"
    }
  },
  {
    "id": "access-branch-override",
    "schema": "common.schema.json#/$defs/CapabilityOverride",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "capability": "planning.manage",
      "effect": "allow",
      "branchId": "60000000-0000-4000-8000-000000000010"
    }
  },
  {
    "id": "access-role-name-capability",
    "schema": "common.schema.json#/$defs/CapabilityOverride",
    "valid": false,
    "keyword": "enum",
    "data": {
      "capability": "Admin",
      "effect": "allow"
    }
  },
  {
    "id": "access-personal-branch",
    "schema": "common.schema.json#/$defs/AccessContext",
    "valid": false,
    "keyword": "maxItems",
    "data": {
      "tenantId": "60000000-0000-4000-8000-000000000003",
      "tenantKind": "personal",
      "principalKind": "account",
      "sourceId": "60000000-0000-4000-8000-000000000024",
      "branchIds": [
        "60000000-0000-4000-8000-000000000010"
      ],
      "driverId": "60000000-0000-4000-8000-000000000043",
      "effectiveCapabilities": [
        "execution.own",
        "reports.read"
      ]
    }
  },
  {
    "id": "access-integration-driver",
    "schema": "common.schema.json#/$defs/AccessContext",
    "valid": false,
    "keyword": "type",
    "data": {
      "tenantId": "60000000-0000-4000-8000-000000000001",
      "tenantKind": "company",
      "principalKind": "integration",
      "sourceId": "60000000-0000-4000-8000-000000000050",
      "branchIds": [
        "60000000-0000-4000-8000-000000000010"
      ],
      "driverId": "60000000-0000-4000-8000-000000000040",
      "effectiveCapabilities": [
        "monitor.read",
        "reports.export"
      ]
    }
  },
  {
    "id": "access-integration-own",
    "schema": "common.schema.json#/$defs/AccessContext",
    "valid": false,
    "keyword": "not",
    "data": {
      "tenantId": "60000000-0000-4000-8000-000000000001",
      "tenantKind": "company",
      "principalKind": "integration",
      "sourceId": "60000000-0000-4000-8000-000000000050",
      "branchIds": [
        "60000000-0000-4000-8000-000000000010"
      ],
      "driverId": null,
      "effectiveCapabilities": [
        "execution.own"
      ]
    }
  },
  {
    "id": "access-duplicate-grants",
    "schema": "common.schema.json#/$defs/AccessContext",
    "valid": false,
    "keyword": "uniqueItems",
    "data": {
      "tenantId": "60000000-0000-4000-8000-000000000001",
      "tenantKind": "company",
      "principalKind": "account",
      "sourceId": "60000000-0000-4000-8000-000000000020",
      "branchIds": [
        "60000000-0000-4000-8000-000000000010",
        "60000000-0000-4000-8000-000000000011"
      ],
      "driverId": null,
      "effectiveCapabilities": [
        "monitor.read",
        "monitor.read"
      ]
    }
  },
  {
    "id": "session-forged-redirect",
    "schema": "session.schema.json#/$defs/LoginRequest",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "kind": "company",
      "redirect_uri": "https://evil.invalid"
    }
  },
  {
    "id": "session-unknown-kind",
    "schema": "session.schema.json#/$defs/KindRequest",
    "valid": false,
    "keyword": "enum",
    "data": {
      "kind": "linked"
    }
  },
  {
    "id": "session-extra-scope",
    "schema": "session.schema.json#/$defs/KindRequest",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "kind": "personal",
      "tenantId": "other"
    }
  },
  {
    "id": "session-no-state",
    "schema": "session.schema.json#/$defs/CallbackQuery",
    "valid": false,
    "keyword": "required",
    "data": {
      "code": "code"
    }
  },
  {
    "id": "p08-actor",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002",
        "assertedActorId": "81000000-0000-4000-8000-000000000009"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true
      }
    }
  },
  {
    "id": "p08-raw-actor",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true,
        "actor_id": "81000000-0000-4000-8000-000000000009"
      }
    }
  },
  {
    "id": "p08-password",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true,
        "password": "not-a-real-password"
      }
    }
  },
  {
    "id": "p08-revision-zero",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "minimum",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 0,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true
      }
    }
  },
  {
    "id": "p08-multiple-roles",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true,
        "roleIds": [
          "a",
          "b"
        ]
      }
    }
  },
  {
    "id": "p08-duplicate-branch",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "uniqueItems",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "cairo"
        ],
        "enabled": true
      }
    }
  },
  {
    "id": "p08-future-version",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "const",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "2.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true
      }
    }
  },
  {
    "id": "p08-scope-omitted",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true
      }
    }
  },
  {
    "id": "p08-unhandled-dependency",
    "valid": false,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "keyword": "maxItems",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [
        "81000000-0000-4000-8000-000000000008"
      ],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true
      }
    }
  },
  {
    "id": "p09-phone-required",
    "valid": false,
    "schema": "b2c-intake.schema.json#/$defs/CreateIndependentPayload",
    "keyword": "required",
    "data": {
      "recipientName": "منى أحمد",
      "destination": {
        "kind": "address",
        "addressText": "١٢ شارع التحرير"
      }
    }
  },
  {
    "id": "p09-amount-must-use-supported-exponent",
    "valid": false,
    "schema": "b2c-intake.schema.json#/$defs/CreateIndependentPayload",
    "keyword": "const",
    "data": {
      "recipientName": "منى أحمد",
      "recipientPhone": "01012345678",
      "destination": {
        "kind": "address",
        "addressText": "١٢ شارع التحرير"
      },
      "collectionAmount": {
        "amountMinor": 125,
        "currency": "EGP",
        "exponent": 3
      }
    }
  },
  {
    "id": "p10-fractional-piece",
    "schema": "b2b-intake.schema.json#/$defs/SourceSnapshot",
    "valid": false,
    "keyword": "type",
    "data": {
      "externalId": "shipment-100",
      "sourceDispatchCycleId": "dispatch-100-1",
      "sourceRevision": 1,
      "expectedSourceRevision": 0,
      "sourceBranchExternalId": "cairo",
      "recipientName": "أحمد",
      "recipientPhone": "01012345678",
      "destination": {
        "kind": "confirmed-pin",
        "addressText": "القاهرة",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "splittingAllowed": true,
      "allocation": "exact-outstanding-per-unit",
      "lines": [
        {
          "sourceLineId": "order-line-7",
          "description": "قطعة",
          "quantity": 1.5,
          "unitDue": {
            "amountMinor": 10000,
            "currency": "EGP",
            "exponent": 2
          }
        }
      ],
      "shippingDue": {
        "amountMinor": 5000,
        "currency": "EGP",
        "exponent": 2
      },
      "totalDue": {
        "amountMinor": 35000,
        "currency": "EGP",
        "exponent": 2
      },
      "priority": "ordinary"
    }
  },
  {
    "id": "p10-missing-unit-due",
    "schema": "b2b-intake.schema.json#/$defs/SourceSnapshot",
    "valid": false,
    "keyword": "required",
    "data": {
      "externalId": "shipment-100",
      "sourceDispatchCycleId": "dispatch-100-1",
      "sourceRevision": 1,
      "expectedSourceRevision": 0,
      "sourceBranchExternalId": "cairo",
      "recipientName": "أحمد",
      "recipientPhone": "01012345678",
      "destination": {
        "kind": "confirmed-pin",
        "addressText": "القاهرة",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "splittingAllowed": true,
      "allocation": "exact-outstanding-per-unit",
      "lines": [
        {
          "sourceLineId": "line",
          "description": "قطعة",
          "quantity": 3
        }
      ],
      "shippingDue": {
        "amountMinor": 5000,
        "currency": "EGP",
        "exponent": 2
      },
      "totalDue": {
        "amountMinor": 35000,
        "currency": "EGP",
        "exponent": 2
      },
      "priority": "ordinary"
    }
  },
  {
    "id": "p10-ambiguous-deposit",
    "schema": "b2b-intake.schema.json#/$defs/SourceSnapshot",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "externalId": "shipment-100",
      "sourceDispatchCycleId": "dispatch-100-1",
      "sourceRevision": 1,
      "expectedSourceRevision": 0,
      "sourceBranchExternalId": "cairo",
      "recipientName": "أحمد",
      "recipientPhone": "01012345678",
      "destination": {
        "kind": "confirmed-pin",
        "addressText": "القاهرة",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "splittingAllowed": true,
      "allocation": "exact-outstanding-per-unit",
      "lines": [
        {
          "sourceLineId": "order-line-7",
          "description": "قطعة",
          "quantity": 3,
          "unitDue": {
            "amountMinor": 10000,
            "currency": "EGP",
            "exponent": 2
          }
        }
      ],
      "shippingDue": {
        "amountMinor": 5000,
        "currency": "EGP",
        "exponent": 2
      },
      "totalDue": {
        "amountMinor": 35000,
        "currency": "EGP",
        "exponent": 2
      },
      "priority": "ordinary",
      "depositMinor": 5000
    }
  },
  {
    "id": "p10-missing-splitting-permission",
    "schema": "b2b-intake.schema.json#/$defs/SourceSnapshot",
    "valid": false,
    "keyword": "required",
    "data": {
      "externalId": "shipment-100",
      "sourceDispatchCycleId": "dispatch-100-1",
      "sourceRevision": 1,
      "expectedSourceRevision": 0,
      "sourceBranchExternalId": "cairo",
      "recipientName": "أحمد",
      "recipientPhone": "01012345678",
      "destination": {
        "kind": "confirmed-pin",
        "addressText": "القاهرة",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "allocation": "exact-outstanding-per-unit",
      "lines": [
        {
          "sourceLineId": "order-line-7",
          "description": "قطعة",
          "quantity": 3,
          "unitDue": {
            "amountMinor": 10000,
            "currency": "EGP",
            "exponent": 2
          }
        }
      ],
      "shippingDue": {
        "amountMinor": 5000,
        "currency": "EGP",
        "exponent": 2
      },
      "totalDue": {
        "amountMinor": 35000,
        "currency": "EGP",
        "exponent": 2
      },
      "priority": "ordinary"
    }
  },
  {
    "id": "p10-mixed-currency",
    "schema": "b2b-intake.schema.json#/$defs/SourceSnapshot",
    "valid": false,
    "keyword": "const",
    "data": {
      "externalId": "shipment-100",
      "sourceDispatchCycleId": "dispatch-100-1",
      "sourceRevision": 1,
      "expectedSourceRevision": 0,
      "sourceBranchExternalId": "cairo",
      "recipientName": "أحمد",
      "recipientPhone": "01012345678",
      "destination": {
        "kind": "confirmed-pin",
        "addressText": "القاهرة",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "splittingAllowed": true,
      "allocation": "exact-outstanding-per-unit",
      "lines": [
        {
          "sourceLineId": "order-line-7",
          "description": "قطعة",
          "quantity": 3,
          "unitDue": {
            "amountMinor": 10000,
            "currency": "EGP",
            "exponent": 2
          }
        }
      ],
      "shippingDue": {
        "amountMinor": 50,
        "currency": "USD",
        "exponent": 2
      },
      "totalDue": {
        "amountMinor": 35000,
        "currency": "EGP",
        "exponent": 2
      },
      "priority": "ordinary"
    }
  },
  {
    "id": "p10-unasserted-receipt",
    "schema": "b2b-intake.schema.json#/$defs/ReceiveBatch",
    "valid": false,
    "keyword": "const",
    "data": {
      "driverExternalId": "driver-1",
      "receiptAsserted": false,
      "items": [
        {
          "externalId": "shipment-100",
          "sourceDispatchCycleId": "dispatch-100-1",
          "expectedSourceRevision": 1,
          "expectedAssignmentRevision": 1,
          "assignmentRevision": 2
        }
      ]
    }
  },
  {
    "id": "location-invalid-confirmation",
    "schema": "location.schema.json#/$defs/Confirm",
    "valid": false,
    "data": {
      "taskId": "60000000-0000-4000-8000-000000000060",
      "expectedSourceRevision": 1,
      "expectedLocationRevision": 0,
      "confirmed": true,
      "selection": {
        "kind": "manual",
        "coordinates": {
          "latitude": 91,
          "longitude": 31.23
        }
      }
    },
    "keyword": "maximum"
  },
  {
    "id": "routing-gps-origin",
    "schema": "routing.schema.json#/$defs/OptimizationInput",
    "valid": false,
    "data": {
      "mode": "bicycle",
      "accountKind": "personal",
      "origin": {
        "kind": "gps",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "endpoint": {
        "kind": "last-customer"
      },
      "tasks": [
        {
          "taskId": "task-a",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          }
        }
      ]
    },
    "keyword": "enum"
  },
  {
    "id": "routing-provider-label",
    "schema": "routing.schema.json#/$defs/OptimizationInput",
    "valid": false,
    "data": {
      "mode": "bike",
      "accountKind": "personal",
      "origin": {
        "kind": "manual-pin",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "endpoint": {
        "kind": "last-customer"
      },
      "tasks": [
        {
          "taskId": "task-a",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          }
        }
      ]
    },
    "keyword": "enum"
  },
  {
    "id": "routing-positional-coordinate",
    "schema": "routing.schema.json#/$defs/OptimizationInput",
    "valid": false,
    "data": {
      "mode": "bicycle",
      "accountKind": "personal",
      "origin": {
        "kind": "manual-pin",
        "coordinates": [
          31.2357,
          30.0444
        ]
      },
      "endpoint": {
        "kind": "last-customer"
      },
      "tasks": [
        {
          "taskId": "task-a",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          }
        }
      ]
    },
    "keyword": "type"
  },
  {
    "id": "p13-fake-active",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": false,
    "keyword": "enum",
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "active",
      "current": true,
      "inputCurrent": true,
      "policyValidated": false,
      "candidate": {
        "mode": "car",
        "status": "partial",
        "policyValidated": false,
        "visits": [],
        "unassignedTaskIds": [
          "13000000-0000-4000-8000-000000000003"
        ],
        "travelDurationSeconds": 0,
        "distanceMetres": 0,
        "customerServiceEstimateSeconds": 0,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 0,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "ordinary",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": null,
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "unassigned",
            "exclusionReason": null,
            "position": null,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z"
    }
  },
  {
    "id": "p13-fake-policy",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": false,
    "keyword": "const",
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "draft",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": {
        "mode": "car",
        "status": "partial",
        "policyValidated": false,
        "visits": [],
        "unassignedTaskIds": [
          "13000000-0000-4000-8000-000000000003"
        ],
        "travelDurationSeconds": 0,
        "distanceMetres": 0,
        "customerServiceEstimateSeconds": 0,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 0,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "ordinary",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": null,
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "unassigned",
            "exclusionReason": null,
            "position": null,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z"
    }
  },
  {
    "id": "p13-gps-origin",
    "schema": "planning.schema.json#/$defs/Settings",
    "valid": false,
    "keyword": "const",
    "data": {
      "mode": "car",
      "origin": {
        "kind": "gps",
        "coordinates": {
          "latitude": 30.04,
          "longitude": 31.23
        }
      },
      "endpoint": {
        "kind": "last-customer"
      },
      "plannedStartAt": "2026-09-23T10:00:00.000Z"
    }
  },
  {
    "id": "p13-missing-attempt",
    "schema": "planning.schema.json#/$defs/Input",
    "valid": false,
    "keyword": "required",
    "data": {
      "version": 1,
      "tenantId": "13000000-0000-4000-8000-000000000001",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "accountKind": "personal",
      "inputRevision": 3,
      "settingsRevision": 1,
      "executionRevision": 0,
      "manualRevision": 0,
      "currentTarget": null,
      "locationInputRevision": 1,
      "settings": {
        "mode": "car",
        "origin": {
          "kind": "manual-pin",
          "coordinates": {
            "latitude": 30.04,
            "longitude": 31.23
          }
        },
        "endpoint": {
          "kind": "last-customer"
        },
        "plannedStartAt": "2026-09-23T10:00:00.000Z"
      },
      "members": [
        {
          "taskId": "13000000-0000-4000-8000-000000000003",
          "dispatchCycleId": null,
          "branchId": null,
          "integrationId": null,
          "sourceRevision": 1,
          "assignmentRevision": 0,
          "pinRevision": 1,
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "priority": "ordinary",
          "earliestAt": null,
          "departureAt": null,
          "reservationState": null,
          "eligible": true,
          "exclusionReason": null,
          "serviceEstimateSeconds": 600
        }
      ]
    }
  },
  {
    "id": "p13-fake-status",
    "schema": "planning.schema.json#/$defs/Job",
    "valid": false,
    "keyword": "enum",
    "data": {
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "status": "ready",
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "settingsRevision": 1,
      "blockedReason": null,
      "attempts": 0,
      "leaseExpiresAt": null,
      "nextAttemptAt": "2026-09-23T10:00:00.000Z",
      "error": null,
      "planId": null,
      "supersededByJobId": null,
      "createdAt": "2026-09-23T10:00:00.000Z",
      "finishedAt": null
    }
  },
  {
    "id": "p13-negative-revision",
    "schema": "planning.schema.json#/$defs/SaveDraftCommand",
    "valid": false,
    "keyword": "minimum",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "13000000-0000-4000-8000-000000000009",
      "operationId": "planning.saveDraft",
      "context": {
        "kind": "device",
        "tenantId": "90000000-0000-4000-8000-000000000002",
        "accountId": "90000000-0000-4000-8000-000000000003",
        "deviceId": "90000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverId": "13000000-0000-4000-8000-000000000002",
        "expectedSettingsRevision": -1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        }
      }
    }
  },
  {
    "id": "p13-impossible-complete",
    "schema": "planning.schema.json#/$defs/Job",
    "valid": false,
    "keyword": "type",
    "data": {
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "status": "complete",
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "settingsRevision": 1,
      "blockedReason": null,
      "attempts": 0,
      "leaseExpiresAt": null,
      "nextAttemptAt": "2026-09-23T10:00:00.000Z",
      "error": null,
      "planId": null,
      "supersededByJobId": null,
      "createdAt": "2026-09-23T10:00:00.000Z",
      "finishedAt": null
    }
  },
  {
    "id": "p13-impossible-running",
    "schema": "planning.schema.json#/$defs/Job",
    "valid": false,
    "keyword": "type",
    "data": {
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "status": "running",
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "settingsRevision": 1,
      "blockedReason": null,
      "attempts": 1,
      "leaseExpiresAt": null,
      "nextAttemptAt": "2026-09-23T10:00:00.000Z",
      "error": null,
      "planId": null,
      "supersededByJobId": null,
      "createdAt": "2026-09-23T10:00:00.000Z",
      "finishedAt": null
    }
  },
  {
    "id": "p14-manual-fake-road",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": false,
    "keyword": "type",
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": null,
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "manual",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": {
        "mode": "car",
        "status": "partial",
        "policyValidated": false,
        "visits": [],
        "unassignedTaskIds": [
          "13000000-0000-4000-8000-000000000003"
        ],
        "travelDurationSeconds": 0,
        "distanceMetres": 0,
        "customerServiceEstimateSeconds": 0,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 0,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 1,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "urgent",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": null,
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "manual",
            "exclusionReason": null,
            "position": 1,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "manual",
        "orderedTaskIds": [
          "13000000-0000-4000-8000-000000000003"
        ],
        "exceptions": []
      }
    }
  },
  {
    "id": "p14-partial-ready",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": false,
    "keyword": "const",
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "ready",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": {
        "mode": "car",
        "status": "partial",
        "policyValidated": false,
        "visits": [],
        "unassignedTaskIds": [
          "13000000-0000-4000-8000-000000000003"
        ],
        "travelDurationSeconds": 0,
        "distanceMetres": 0,
        "customerServiceEstimateSeconds": 0,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 0,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "urgent",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": null,
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "unassigned",
            "exclusionReason": null,
            "position": null,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "grouped-heuristic",
        "orderedTaskIds": [],
        "exceptions": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "reason": "unassigned-urgent"
          }
        ]
      }
    }
  },
  {
    "id": "p14-manual-eta",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": false,
    "keyword": "type",
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": null,
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "manual",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": null,
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 1,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "urgent",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": "2026-09-23T11:00:00Z",
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "manual",
            "exclusionReason": null,
            "position": 1,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "manual",
        "orderedTaskIds": [
          "13000000-0000-4000-8000-000000000003"
        ],
        "exceptions": []
      }
    }
  },
  {
    "id": "p14-no-policy",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": false,
    "keyword": "const",
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "ready",
      "current": true,
      "inputCurrent": true,
      "policyValidated": false,
      "candidate": {
        "mode": "car",
        "status": "complete",
        "policyValidated": false,
        "visits": [],
        "unassignedTaskIds": [],
        "travelDurationSeconds": 0,
        "distanceMetres": 0,
        "customerServiceEstimateSeconds": 0,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 0,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": []
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": "2026-09-23T10:00:00.000Z",
        "members": []
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "grouped-heuristic",
        "orderedTaskIds": [],
        "exceptions": []
      }
    }
  },
  {
    "id": "p14-duplicate-manual",
    "schema": "planning.schema.json#/$defs/ManualOrderCommand",
    "valid": false,
    "keyword": "uniqueItems",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "13000000-0000-4000-8000-000000000009",
      "operationId": "planning.setManualOrder",
      "context": {
        "kind": "device",
        "tenantId": "90000000-0000-4000-8000-000000000002",
        "accountId": "90000000-0000-4000-8000-000000000003",
        "deviceId": "90000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverId": "13000000-0000-4000-8000-000000000002",
        "expectedSettingsRevision": 1,
        "expectedInputRevision": 3,
        "expectedManualRevision": 0,
        "selection": {
          "kind": "order",
          "taskIds": [
            "13000000-0000-4000-8000-000000000003",
            "13000000-0000-4000-8000-000000000003"
          ]
        }
      }
    }
  },
  {
    "id": "p15-no-client-sync-flag",
    "schema": "round-start.schema.json#/$defs/StartCommand",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "round.start",
      "actionId": "15000000-0000-4000-8000-000000000010",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverId": "15000000-0000-4000-8000-000000000002",
        "readinessId": "15000000-0000-4000-8000-000000000001",
        "planId": "15000000-0000-4000-8000-000000000004",
        "expectedPlanRevision": 1,
        "alreadySynced": true
      }
    }
  },
  {
    "id": "p15-local-draft-not-active",
    "schema": "round-start.schema.json#/$defs/Round",
    "valid": false,
    "keyword": "const",
    "data": {
      "roundId": "15000000-0000-4000-8000-000000000006",
      "workdayId": "15000000-0000-4000-8000-000000000005",
      "driverId": "15000000-0000-4000-8000-000000000002",
      "state": "draft",
      "startedAt": "2026-09-23T10:00:00.000Z",
      "owner": {
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "generation": 1
      },
      "firstPlanId": "15000000-0000-4000-8000-000000000004",
      "firstForecastId": "15000000-0000-4000-8000-000000000008",
      "firstWorkloadId": "15000000-0000-4000-8000-000000000009",
      "currentActivity": null
    }
  },
  {
    "id": "arrived-without-recorded-action",
    "schema": "current-activity.schema.json#/$defs/Activity",
    "valid": false,
    "data": {
      "taskId": "16000000-0000-4000-8000-000000000002",
      "attemptId": "16000000-0000-4000-8000-000000000003",
      "revision": 1,
      "stage": "arrived",
      "heading": {
        "actionId": "16000000-0000-4000-8000-000000000001",
        "recordedAt": "2026-09-23T20:00:00Z",
        "observation": {
          "observedAt": null,
          "clock": {
            "quality": "unknown"
          }
        }
      },
      "arrival": null
    },
    "keyword": "type"
  },
  {
    "id": "heading-with-inferred-arrival",
    "schema": "current-activity.schema.json#/$defs/Activity",
    "valid": false,
    "data": {
      "taskId": "16000000-0000-4000-8000-000000000002",
      "attemptId": "16000000-0000-4000-8000-000000000003",
      "revision": 1,
      "stage": "heading",
      "heading": {
        "actionId": "16000000-0000-4000-8000-000000000001",
        "recordedAt": "2026-09-23T20:00:00Z",
        "observation": {
          "observedAt": null,
          "clock": {
            "quality": "unknown"
          }
        }
      },
      "arrival": {
        "actionId": "16000000-0000-4000-8000-000000000001",
        "recordedAt": "2026-09-23T20:00:00Z",
        "observation": {
          "observedAt": null,
          "clock": {
            "quality": "unknown"
          }
        }
      }
    },
    "keyword": "type"
  },
  {
    "id": "current-next-is-not-stage",
    "schema": "current-activity.schema.json#/$defs/Activity",
    "valid": false,
    "data": {
      "taskId": "16000000-0000-4000-8000-000000000002",
      "attemptId": "16000000-0000-4000-8000-000000000003",
      "revision": 1,
      "stage": "next",
      "heading": {
        "actionId": "16000000-0000-4000-8000-000000000001",
        "recordedAt": "2026-09-23T20:00:00Z",
        "observation": {
          "observedAt": null,
          "clock": {
            "quality": "unknown"
          }
        }
      },
      "arrival": null
    },
    "keyword": "enum"
  },
  {
    "id": "p16-no-arbitrary-selection",
    "schema": "current-activity.schema.json#/$defs/SelectHeadingCommand",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "current.selectHeading",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002"
      }
    }
  },
  {
    "id": "p16-arrival-must-identify-current",
    "schema": "current-activity.schema.json#/$defs/ArrivalCommand",
    "valid": false,
    "keyword": "type",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "current.recordArrival",
      "actionId": "16000000-0000-4000-8000-000000000004",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0
      }
    }
  },
  {
    "id": "p17-invalid-fraction",
    "schema": "outcomes.schema.json#/$defs/PartialCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordPartial",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "pieces": [
          {
            "sourceLineId": "pieces",
            "delivered": 1.5
          }
        ],
        "reportedCollection": {
          "amountMinor": 25000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    },
    "keyword": "type"
  },
  {
    "id": "p17-invalid-negative",
    "schema": "outcomes.schema.json#/$defs/PartialCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordPartial",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "pieces": [
          {
            "sourceLineId": "pieces",
            "delivered": 2
          }
        ],
        "reportedCollection": {
          "amountMinor": -1,
          "currency": "EGP",
          "exponent": 2
        }
      }
    },
    "keyword": "minimum"
  },
  {
    "id": "p17-invalid-unsafe-money",
    "schema": "outcomes.schema.json#/$defs/FullCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordFull",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "reportedCollection": {
          "amountMinor": 9007199254740992,
          "currency": "EGP",
          "exponent": 2
        }
      }
    },
    "keyword": "maximum"
  },
  {
    "id": "p17-invalid-unlike-currency",
    "schema": "outcomes.schema.json#/$defs/FullCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordFull",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "reportedCollection": {
          "amountMinor": 35000,
          "currency": "USD",
          "exponent": 2
        }
      }
    },
    "keyword": "const"
  },
  {
    "id": "p17-invalid-no-answer-fee-refusal",
    "schema": "outcomes.schema.json#/$defs/NoAnswerCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordNoAnswer",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "shippingPayment": "refused"
      }
    },
    "keyword": "additionalProperties"
  },
  {
    "id": "p17-invalid-no-answer-arrival",
    "schema": "outcomes.schema.json#/$defs/NoAnswerCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordNoAnswer",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "arrivalAt": "2026-09-24T00:00:00Z"
      }
    },
    "keyword": "additionalProperties"
  },
  {
    "id": "p17-no-answer-fabricated-collection",
    "schema": "outcomes.schema.json#/$defs/Record",
    "valid": false,
    "keyword": "type",
    "data": {
      "kind": "company",
      "time": {
        "actionId": "17000000-0000-4000-8000-000000000019",
        "recordedAt": "2026-09-24T08:00:00.000Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "lines": [
        {
          "unitDue": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 10000
          },
          "delivered": 0,
          "sourceLineId": "pieces",
          "sourceQuantity": 3,
          "heldReturnRequired": 3
        }
      ],
      "taskId": "17000000-0000-4000-8000-000000000013",
      "arrival": null,
      "heading": null,
      "outcome": "no-answer",
      "roundId": "17000000-0000-4000-8000-000000000003",
      "branchId": "17000000-0000-4000-8000-000000000022",
      "driverId": "17000000-0000-4000-8000-000000000004",
      "revision": 1,
      "attemptId": "17000000-0000-4000-8000-000000000014",
      "outcomeId": "17000000-0000-4000-8000-000000000026",
      "workdayId": "17000000-0000-4000-8000-000000000005",
      "collection": {
        "goods": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 0
        },
        "reported": {
          "amountMinor": 0,
          "currency": "EGP",
          "exponent": 2
        },
        "shipping": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 0
        },
        "shippingStatus": "not-attempted",
        "unpaidShipping": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 0
        }
      },
      "returnRequired": true,
      "sourceRevision": 1,
      "dispatchCycleId": "17000000-0000-4000-8000-000000000027",
      "sourceReference": {
        "tenantId": "17000000-0000-4000-8000-000000000018",
        "externalId": "shipment-1",
        "integrationId": "17000000-0000-4000-8000-000000000024"
      },
      "assignmentRevision": 1,
      "sourceDispatchCycleId": "cycle"
    }
  },
  {
    "id": "p17-personal-piece-result",
    "schema": "outcomes.schema.json#/$defs/Record",
    "valid": false,
    "keyword": "maxItems",
    "data": {
      "kind": "personal",
      "time": {
        "actionId": "17000000-0000-4000-8000-000000000017",
        "recordedAt": "2026-09-24T08:00:00.000Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "lines": [
        {
          "unitDue": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 10000
          },
          "delivered": 2,
          "sourceLineId": "pieces",
          "sourceQuantity": 3,
          "heldReturnRequired": 1
        }
      ],
      "taskId": "17000000-0000-4000-8000-000000000011",
      "arrival": {
        "actionId": "17000000-0000-4000-8000-000000000016",
        "recordedAt": "2026-09-24T08:00:00.000Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "heading": {
        "actionId": "17000000-0000-4000-8000-000000000015",
        "recordedAt": "2026-09-24T08:00:00.000Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "outcome": "partial",
      "roundId": "17000000-0000-4000-8000-000000000003",
      "branchId": "17000000-0000-4000-8000-000000000022",
      "driverId": "17000000-0000-4000-8000-000000000004",
      "revision": 1,
      "attemptId": "17000000-0000-4000-8000-000000000012",
      "outcomeId": "17000000-0000-4000-8000-000000000021",
      "workdayId": "17000000-0000-4000-8000-000000000005",
      "collection": {
        "goods": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 20000
        },
        "reported": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 25000
        },
        "shipping": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 5000
        },
        "shippingStatus": "collected",
        "unpaidShipping": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 0
        }
      },
      "returnRequired": true,
      "sourceRevision": 1,
      "dispatchCycleId": "17000000-0000-4000-8000-000000000023",
      "sourceReference": {
        "tenantId": "17000000-0000-4000-8000-000000000018",
        "externalId": "shipment-0",
        "integrationId": "17000000-0000-4000-8000-000000000024"
      },
      "assignmentRevision": 1,
      "sourceDispatchCycleId": "cycle"
    }
  },
  {
    "id": "p18-call-counter",
    "schema": "eligibility.schema.json#/$defs/RetryCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "operationId": "task.retryWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "attemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 0,
        "callCounter": 3
      }
    },
    "keyword": "additionalProperties"
  },
  {
    "id": "p18-negative-revision",
    "schema": "eligibility.schema.json#/$defs/RetryCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "operationId": "task.retryWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "attemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": -1
      }
    },
    "keyword": "minimum"
  },
  {
    "id": "p18-fractional-revision",
    "schema": "eligibility.schema.json#/$defs/RetryCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "operationId": "task.retryWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "attemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 1.5
      }
    },
    "keyword": "type"
  },
  {
    "id": "p18-overflow-revision",
    "schema": "eligibility.schema.json#/$defs/RetryCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "operationId": "task.retryWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "attemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 9007199254740992
      }
    },
    "keyword": "maximum"
  },
  {
    "id": "p18-appointment-window",
    "schema": "eligibility.schema.json#/$defs/RetryCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "operationId": "task.retryWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "attemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 0,
        "appointmentEnd": "2026-09-26T13:00:00Z"
      }
    },
    "keyword": "additionalProperties"
  },
  {
    "id": "p18-bad-date",
    "schema": "eligibility.schema.json#/$defs/DeferCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "97203a2c-3224-47dd-8edd-0b51baff234f",
      "operationId": "task.deferWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
        "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 0,
        "earliestAt": "tomorrow"
      }
    },
    "keyword": "format"
  },
  {
    "id": "p18-bad-urgency",
    "schema": "eligibility.schema.json#/$defs/UrgencyCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "d48b59bf-49da-4532-8322-193e0eb5f222",
      "operationId": "task.setDriverUrgency",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
        "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 1,
        "urgency": "critical"
      }
    },
    "keyword": "enum"
  },
  {
    "id": "p18-missing-revision",
    "schema": "eligibility.schema.json#/$defs/RetryCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "operationId": "task.retryWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "attemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0
      }
    },
    "keyword": "required"
  },
  {
    "id": "p18-operation-mismatch",
    "schema": "eligibility.schema.json#/$defs/RetryCommand",
    "valid": false,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "operationId": "task.deferWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "attemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 0
      }
    },
    "keyword": "const"
  },
  {
    "id": "p19-missing-current-choice",
    "schema": "workday-closure.schema.json#/$defs/EndDayCommand",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
      "operationId": "workday.end",
      "context": {
        "kind": "device",
        "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
        "accountId": "01efa9b6-cfd2-4000-80ae-bccae5f26073",
        "deviceId": "d697d232-9738-4455-9218-343b1d1cdf25",
        "deviceGeneration": 2,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
        "roundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
        "expectedActiveRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null
      }
    }
  },
  {
    "id": "p19-fabricated-settlement",
    "schema": "workday-closure.schema.json#/$defs/EndDayCommand",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
      "operationId": "workday.end",
      "context": {
        "kind": "device",
        "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
        "accountId": "01efa9b6-cfd2-4000-80ae-bccae5f26073",
        "deviceId": "d697d232-9738-4455-9218-343b1d1cdf25",
        "deviceGeneration": 2,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
        "roundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
        "expectedActiveRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "currentAction": "require-none",
        "settled": true
      }
    }
  },
  {
    "id": "p19-round-without-active-expectation",
    "schema": "workday-closure.schema.json#/$defs/EndRoundCommand",
    "valid": false,
    "keyword": "type",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "ae98765b-8f68-4c67-8e4e-a89da6bc42b3",
      "operationId": "round.end",
      "context": {
        "kind": "device",
        "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
        "accountId": "01efa9b6-cfd2-4000-80ae-bccae5f26073",
        "deviceId": "d697d232-9738-4455-9218-343b1d1cdf25",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
        "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
        "expectedActiveRoundId": null,
        "expectedActivityRevision": 3,
        "expectedCurrentAttemptId": "c11d2b33-5010-4459-bb2f-815471de86ae",
        "currentAction": "pause-heading"
      }
    }
  },
  {
    "id": "p19-negative-revision",
    "schema": "workday-closure.schema.json#/$defs/EndRoundCommand",
    "valid": false,
    "keyword": "minimum",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "ae98765b-8f68-4c67-8e4e-a89da6bc42b3",
      "operationId": "round.end",
      "context": {
        "kind": "device",
        "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
        "accountId": "01efa9b6-cfd2-4000-80ae-bccae5f26073",
        "deviceId": "d697d232-9738-4455-9218-343b1d1cdf25",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
        "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
        "expectedActiveRoundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
        "expectedActivityRevision": -1,
        "expectedCurrentAttemptId": "c11d2b33-5010-4459-bb2f-815471de86ae",
        "currentAction": "pause-heading"
      }
    }
  },
  {
    "id": "p19-non-utc-server-time",
    "schema": "workday-closure.schema.json#/$defs/Record",
    "valid": false,
    "keyword": "pattern",
    "data": {
      "time": {
        "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
        "recordedAt": "2026-09-24T08:00:46.461Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "driverId": "577af791-9729-42ce-986b-41632d45b72e",
      "closureId": "608b5d55-ab17-4730-a5e6-2bd4ce6da2c8",
      "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
      "operationId": "workday.end",
      "endedRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
      "ownerRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
      "roundEndedAt": "2026-09-24T08:00:46.461Z",
      "pausedActivity": null,
      "workdayEndedAt": "2026-09-24T14:00:00+03:00",
      "activityRevision": 0
    }
  },
  {
    "id": "p19-negative-denominator",
    "schema": "workday-closure.schema.json#/$defs/Summary",
    "valid": false,
    "keyword": "minimum",
    "data": {
      "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
      "driverId": "577af791-9729-42ce-986b-41632d45b72e",
      "displayTimeZone": "Africa/Cairo",
      "openedAt": "2026-09-24T08:00:45.714Z",
      "endedAt": "2026-09-24T08:00:46.461Z",
      "asOf": "2026-09-24T08:00:46.532Z",
      "rounds": [
        {
          "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
          "startedAt": "2026-09-24T08:00:45.716Z",
          "endedAt": "2026-09-24T08:00:46.163Z",
          "firstPlanId": "8a034001-a3f2-406a-b7c6-a02f311ca136",
          "firstForecastId": "d50f23d8-9b79-41d0-9344-51a5a8d74727",
          "firstWorkloadId": "d60eecfd-d878-4359-876a-264af8caa8d7"
        },
        {
          "roundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
          "startedAt": "2026-09-24T08:00:46.398Z",
          "endedAt": "2026-09-24T08:00:46.461Z",
          "firstPlanId": "7d525169-86f8-41d6-bc5b-5cb5cce3bdc4",
          "firstForecastId": "57316909-a393-4fc1-bc20-aaafe002038b",
          "firstWorkloadId": "107f3f89-5b1a-4b14-a549-a56b12469ebb"
        }
      ],
      "scope": {
        "shipments": 4,
        "attempts": -1,
        "processedAttempts": 2,
        "fullShipments": 1,
        "partialShipments": 0,
        "refusedShipments": 1,
        "noAnswerShipments": 0,
        "unfinishedShipments": 2
      },
      "collection": [
        {
          "currency": "EGP",
          "exponent": 2,
          "reportedMinor": "35000",
          "unreportedAttempts": 0
        }
      ],
      "outcomes": [
        {
          "kind": "company",
          "time": {
            "actionId": "cef29c59-351f-4385-87a0-391b76a6d025",
            "recordedAt": "2026-09-24T08:00:45.800Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 3,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 0
            }
          ],
          "taskId": "454fd69a-7038-54b9-ada7-d859bdfd4c9a",
          "arrival": null,
          "heading": null,
          "outcome": "full",
          "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
          "branchId": "d0cd0606-5b37-4713-9639-2d7c50bc4347",
          "driverId": "577af791-9729-42ce-986b-41632d45b72e",
          "revision": 1,
          "attemptId": "1c17d992-d2d1-40a6-897d-e061529a9794",
          "outcomeId": "eba3d148-1d84-44a8-a0f2-52026dc13f3d",
          "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 30000
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 35000
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "shippingStatus": "collected",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": false,
          "sourceRevision": 1,
          "dispatchCycleId": "59ddb5c0-324b-49b0-b5de-322b570761b8",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-0",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        {
          "kind": "company",
          "time": {
            "actionId": "27a6e937-f183-4855-8f21-9b68e1cc56ed",
            "recordedAt": "2026-09-24T08:00:45.900Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 0,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 3
            }
          ],
          "taskId": "730a1809-b4d3-55a8-a42e-8ff70377d3c1",
          "arrival": null,
          "heading": null,
          "outcome": "refused",
          "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
          "branchId": "d0cd0606-5b37-4713-9639-2d7c50bc4347",
          "driverId": "577af791-9729-42ce-986b-41632d45b72e",
          "revision": 1,
          "attemptId": "44f02168-97f9-4089-a13e-5db213d740b1",
          "outcomeId": "61774f7f-4cee-43e5-9f52-90441bda1088",
          "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "shippingStatus": "explicitly-unpaid",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "314b83e1-2db3-40d6-b94d-b3905e52b5ad",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-1",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        }
      ],
      "carryForward": {
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
        "driverId": "577af791-9729-42ce-986b-41632d45b72e",
        "asOf": "2026-09-24T08:00:46.532Z",
        "items": [
          {
            "taskId": "336a3f2d-1db4-5fe8-ada7-c299af082eca",
            "attemptId": "26318815-d73f-4b40-814e-57ee3bbec56c",
            "dispatchCycleId": "f2feceb8-00f6-435d-b48b-55972a58da62",
            "sourceReference": {
              "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
              "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
              "externalId": "shipment-3"
            },
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "pinRevision": 0,
            "earliestAt": "2026-09-25T08:00:45.915Z",
            "deferred": true,
            "admittedInWorkday": true,
            "outcome": null,
            "disposition": "unfinished",
            "eligibleNow": false,
            "blocker": "deferred",
            "heldReturnRequiredPieces": 0,
            "heldPieces": 3,
            "unpaidShippingMinor": "0"
          },
          {
            "taskId": "730a1809-b4d3-55a8-a42e-8ff70377d3c1",
            "attemptId": "44f02168-97f9-4089-a13e-5db213d740b1",
            "dispatchCycleId": "314b83e1-2db3-40d6-b94d-b3905e52b5ad",
            "sourceReference": {
              "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
              "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
              "externalId": "shipment-1"
            },
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "pinRevision": 0,
            "earliestAt": null,
            "deferred": false,
            "admittedInWorkday": true,
            "outcome": "refused",
            "disposition": "return-required",
            "eligibleNow": false,
            "blocker": "result-required",
            "heldReturnRequiredPieces": 3,
            "heldPieces": 3,
            "unpaidShippingMinor": "5000"
          },
          {
            "taskId": "91116103-f626-57a0-a16d-766cce068b8b",
            "attemptId": "c11d2b33-5010-4459-bb2f-815471de86ae",
            "dispatchCycleId": "99d6636a-5e7d-47ce-863a-37b0175a3077",
            "sourceReference": {
              "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
              "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
              "externalId": "shipment-2"
            },
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "pinRevision": 0,
            "earliestAt": null,
            "deferred": false,
            "admittedInWorkday": true,
            "outcome": null,
            "disposition": "unfinished",
            "eligibleNow": true,
            "blocker": null,
            "heldReturnRequiredPieces": 0,
            "heldPieces": 3,
            "unpaidShippingMinor": "0"
          }
        ]
      }
    }
  },
  {
    "id": "p19-deferred-cannot-be-executable",
    "schema": "workday-closure.schema.json#/$defs/CarryItem",
    "valid": false,
    "keyword": "type",
    "data": {
      "taskId": "336a3f2d-1db4-5fe8-ada7-c299af082eca",
      "attemptId": "26318815-d73f-4b40-814e-57ee3bbec56c",
      "dispatchCycleId": "f2feceb8-00f6-435d-b48b-55972a58da62",
      "sourceReference": {
        "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
        "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
        "externalId": "shipment-3"
      },
      "sourceDispatchCycleId": "cycle",
      "sourceRevision": 1,
      "assignmentRevision": 1,
      "pinRevision": 0,
      "earliestAt": "2026-09-25T08:00:45.915Z",
      "deferred": true,
      "admittedInWorkday": false,
      "outcome": null,
      "disposition": "unfinished",
      "eligibleNow": true,
      "blocker": "deferred",
      "heldReturnRequiredPieces": 0,
      "heldPieces": 3,
      "unpaidShippingMinor": "0"
    }
  },
  {
    "id": "p19-closure-not-receipt",
    "schema": "workday-closure.schema.json#/$defs/Event",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "time": {
        "actionId": "ae98765b-8f68-4c67-8e4e-a89da6bc42b3",
        "recordedAt": "2026-09-24T08:00:46.163Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "tasks": [
        {
          "taskId": "336a3f2d-1db4-5fe8-ada7-c299af082eca",
          "dispatchCycleId": "f2feceb8-00f6-435d-b48b-55972a58da62",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-3",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "454fd69a-7038-54b9-ada7-d859bdfd4c9a",
          "dispatchCycleId": "59ddb5c0-324b-49b0-b5de-322b570761b8",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-0",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "730a1809-b4d3-55a8-a42e-8ff70377d3c1",
          "dispatchCycleId": "314b83e1-2db3-40d6-b94d-b3905e52b5ad",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-1",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "91116103-f626-57a0-a16d-766cce068b8b",
          "dispatchCycleId": "99d6636a-5e7d-47ce-863a-37b0175a3077",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-2",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        }
      ],
      "driverId": "577af791-9729-42ce-986b-41632d45b72e",
      "closureId": "f440877d-ae01-41a6-8cf5-b68bd81a5d45",
      "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
      "endedRoundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
      "roundEndedAt": "2026-09-24T08:00:46.163Z",
      "workdayEndedAt": null,
      "received": true
    }
  },
  {
    "id": "p20-takeover-missing-generation",
    "schema": "device-ownership.schema.json#/$defs/TakeoverCommand",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "device.takeOver",
      "actionId": "4d5355fe-c12c-4389-9fd1-c70160b1fda3",
      "context": {
        "kind": "device",
        "tenantId": "1ca98984-b3b3-43ed-807c-faf20a9f5d7c",
        "accountId": "2f8f221d-5de3-4e52-9c2d-fb61cd34785d",
        "deviceId": "c78f6af5-a71c-444c-887a-4bdee8085322",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "d2e6b119-4c58-4dd3-b275-90fe91f1576c"
      }
    }
  },
  {
    "id": "p20-takeover-staff-override",
    "schema": "device-ownership.schema.json#/$defs/TakeoverCommand",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "device.takeOver",
      "actionId": "4d5355fe-c12c-4389-9fd1-c70160b1fda3",
      "context": {
        "kind": "device",
        "tenantId": "1ca98984-b3b3-43ed-807c-faf20a9f5d7c",
        "accountId": "2f8f221d-5de3-4e52-9c2d-fb61cd34785d",
        "deviceId": "c78f6af5-a71c-444c-887a-4bdee8085322",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "d2e6b119-4c58-4dd3-b275-90fe91f1576c",
        "expectedGeneration": 1,
        "staffOverride": true
      }
    }
  },
  {
    "id": "p20-takeover-client-time-winner",
    "schema": "device-ownership.schema.json#/$defs/TakeoverCommand",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "device.takeOver",
      "actionId": "4d5355fe-c12c-4389-9fd1-c70160b1fda3",
      "context": {
        "kind": "device",
        "tenantId": "1ca98984-b3b3-43ed-807c-faf20a9f5d7c",
        "accountId": "2f8f221d-5de3-4e52-9c2d-fb61cd34785d",
        "deviceId": "c78f6af5-a71c-444c-887a-4bdee8085322",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "d2e6b119-4c58-4dd3-b275-90fe91f1576c",
        "expectedGeneration": 1,
        "useOldestTimestamp": true
      }
    }
  },
  {
    "id": "p20-takeover-fraction-generation",
    "schema": "device-ownership.schema.json#/$defs/TakeoverCommand",
    "valid": false,
    "keyword": "type",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "device.takeOver",
      "actionId": "4d5355fe-c12c-4389-9fd1-c70160b1fda3",
      "context": {
        "kind": "device",
        "tenantId": "1ca98984-b3b3-43ed-807c-faf20a9f5d7c",
        "accountId": "2f8f221d-5de3-4e52-9c2d-fb61cd34785d",
        "deviceId": "c78f6af5-a71c-444c-887a-4bdee8085322",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "d2e6b119-4c58-4dd3-b275-90fe91f1576c",
        "expectedGeneration": 1.5
      }
    }
  },
  {
    "id": "p20-bad-snapshot-token",
    "schema": "device-ownership.schema.json#/$defs/FormerSubmission",
    "valid": false,
    "keyword": "format",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordNoAnswer",
      "actionId": "25a9c463-0f64-41a4-af5a-002265c2b6b7",
      "context": {
        "kind": "device",
        "tenantId": "1ca98984-b3b3-43ed-807c-faf20a9f5d7c",
        "accountId": "2f8f221d-5de3-4e52-9c2d-fb61cd34785d",
        "deviceId": "81e4daa5-991d-467c-a8ee-ebf683cd25b0",
        "deviceGeneration": 1,
        "deviceSequence": 7,
        "snapshotToken": "not-a-token"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": "2020-01-01T00:00:00Z",
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "d2e6b119-4c58-4dd3-b275-90fe91f1576c",
        "taskId": "73a64008-1fe7-4b35-a27b-107aed322abf",
        "attemptId": "64278f37-d8c1-4937-a1d0-00d7004d95ae",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": "64278f37-d8c1-4937-a1d0-00d7004d95ae",
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0
      }
    }
  },
  {
    "id": "p20-adoption-no-receipt",
    "schema": "device-ownership.schema.json#/$defs/AdoptionCommand",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "evidence.adoptCompatible",
      "actionId": "20000000-0000-4000-8000-000000000020",
      "context": {
        "kind": "device",
        "tenantId": "1ca98984-b3b3-43ed-807c-faf20a9f5d7c",
        "accountId": "2f8f221d-5de3-4e52-9c2d-fb61cd34785d",
        "deviceId": "c78f6af5-a71c-444c-887a-4bdee8085322",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "d2e6b119-4c58-4dd3-b275-90fe91f1576c",
        "evidenceActionId": "25a9c463-0f64-41a4-af5a-002265c2b6b7",
        "expectedGeneration": 2,
        "expectedOutcomeRevision": 1,
        "expectedActivityRevision": 3,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0
      }
    }
  },
  {
    "id": "p21-fractional-receipt",
    "schema": "returns.schema.json#/$defs/ReceiveCommand",
    "valid": false,
    "keyword": "type",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "return.confirmSubsetReceipt",
      "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
      "context": {
        "kind": "integration",
        "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
        "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "receivingBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "items": [
          {
            "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
            "expectedRevision": 0,
            "quantity": 0.5
          }
        ]
      }
    }
  },
  {
    "id": "p21-empty-subset",
    "schema": "returns.schema.json#/$defs/ReceiveCommand",
    "valid": false,
    "keyword": "minItems",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "return.confirmSubsetReceipt",
      "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
      "context": {
        "kind": "integration",
        "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
        "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "receivingBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "items": []
      }
    }
  },
  {
    "id": "p21-forged-human",
    "schema": "returns.schema.json#/$defs/ReceiveCommand",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "return.confirmSubsetReceipt",
      "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
      "context": {
        "kind": "integration",
        "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
        "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc",
        "assertedActorId": "77777777-7777-4777-8777-777777777777"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "receivingBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "items": [
          {
            "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
            "expectedRevision": 0,
            "quantity": 2
          }
        ]
      }
    }
  },
  {
    "id": "p21-stock-claim",
    "schema": "returns.schema.json#/$defs/ReceiveCommand",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "return.confirmSubsetReceipt",
      "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
      "context": {
        "kind": "integration",
        "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
        "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "receivingBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "items": [
          {
            "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
            "expectedRevision": 0,
            "quantity": 2
          }
        ],
        "availableStock": true
      }
    }
  },
  {
    "id": "p21-receipt-as-loss",
    "schema": "returns.schema.json#/$defs/ReceivedEvent",
    "valid": false,
    "keyword": "const",
    "data": {
      "transition": {
        "kind": "lost",
        "time": {
          "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
          "recordedAt": "2026-09-24T09:49:05.197Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
        "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
        "identity": {
          "mode": "service-operation",
          "actorId": null,
          "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
        },
        "quantity": 2,
        "revision": 1,
        "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "sourceLineId": "pieces",
        "transitionId": "e80ce45b-71aa-444a-9a25-5467467ba7ac",
        "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
        "sourceReference": {
          "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
          "externalId": "shipment-0",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
        },
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p21-loss-as-receipt",
    "schema": "returns.schema.json#/$defs/DispositionEvent",
    "valid": false,
    "keyword": "enum",
    "data": {
      "transition": {
        "kind": "received",
        "time": {
          "actionId": "52cdfe05-5e9e-47c8-84a2-51cfb3e53e21",
          "recordedAt": "2026-09-24T09:49:05.294Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
        "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
        "identity": {
          "mode": "service-operation",
          "actorId": null,
          "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
        },
        "quantity": 1,
        "revision": 2,
        "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "sourceLineId": "pieces",
        "transitionId": "d05758d7-6c58-4200-9a4d-a13a7d893277",
        "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
        "sourceReference": {
          "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
          "externalId": "shipment-0",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
        },
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p22-empty-claims",
    "schema": "branch-activity.schema.json#/$defs/InterruptCommand",
    "valid": false,
    "keyword": "minItems",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "5e688fc2-fc4f-477d-ab4f-b2bb7c001d1f",
      "operationId": "branch.interruptRound",
      "context": {
        "kind": "device",
        "tenantId": "ac60e92f-ea64-432d-b41a-15259b0f8f97",
        "accountId": "047406a8-8ea7-4eb1-87b3-e9e2456a3ce8",
        "deviceId": "5ec13102-7aa9-4c2f-a445-64bd9f100be4",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688",
        "requestId": "0bcfc092-983d-48fe-8674-a4783da6435b",
        "claims": [],
        "serviceEstimateSeconds": 300
      }
    }
  },
  {
    "id": "p22-fractional-claim",
    "schema": "branch-activity.schema.json#/$defs/InterruptCommand",
    "valid": false,
    "keyword": "type",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "5e688fc2-fc4f-477d-ab4f-b2bb7c001d1f",
      "operationId": "branch.interruptRound",
      "context": {
        "kind": "device",
        "tenantId": "ac60e92f-ea64-432d-b41a-15259b0f8f97",
        "accountId": "047406a8-8ea7-4eb1-87b3-e9e2456a3ce8",
        "deviceId": "5ec13102-7aa9-4c2f-a445-64bd9f100be4",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688",
        "requestId": "0bcfc092-983d-48fe-8674-a4783da6435b",
        "claims": [
          {
            "itemId": "96f3c91c-aa52-414e-a7fa-23a5ba7f49ab",
            "quantity": 0.5
          }
        ],
        "serviceEstimateSeconds": 300
      }
    }
  },
  {
    "id": "p22-arbitrary-branch",
    "schema": "branch-activity.schema.json#/$defs/InterruptCommand",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "5e688fc2-fc4f-477d-ab4f-b2bb7c001d1f",
      "operationId": "branch.interruptRound",
      "context": {
        "kind": "device",
        "tenantId": "ac60e92f-ea64-432d-b41a-15259b0f8f97",
        "accountId": "047406a8-8ea7-4eb1-87b3-e9e2456a3ce8",
        "deviceId": "5ec13102-7aa9-4c2f-a445-64bd9f100be4",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688",
        "requestId": "0bcfc092-983d-48fe-8674-a4783da6435b",
        "claims": [
          {
            "itemId": "96f3c91c-aa52-414e-a7fa-23a5ba7f49ab",
            "quantity": 2
          }
        ],
        "serviceEstimateSeconds": 300,
        "sourceBranchId": "00000000-0000-4000-8000-000000000001"
      }
    }
  },
  {
    "id": "p22-fractional-redispatch",
    "schema": "b2b-intake.schema.json#/$defs/RedispatchCommand",
    "valid": false,
    "keyword": "type",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "context": {
        "kind": "integration",
        "tenantId": "ac60e92f-ea64-432d-b41a-15259b0f8f97",
        "integrationId": "39b30496-c78f-4d4d-a657-efbfe4e7bf70"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "actionId": "b6c51493-7433-4959-be8d-7cb6b4b0f6b0",
      "operationId": "dispatch.createFromReceipt",
      "payload": {
        "externalId": "shipment-0",
        "previousDispatchCycleId": "d9b1e377-0c92-46a9-b3b5-c8feba1b48b8",
        "snapshot": {
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "quantity": 1.5,
              "description": "قطع",
              "sourceLineId": "pieces"
            }
          ],
          "priority": "ordinary",
          "totalDue": {
            "amountMinor": 20000,
            "currency": "EGP",
            "exponent": 2
          },
          "allocation": "exact-outstanding-per-unit",
          "externalId": "shipment-0",
          "destination": {
            "kind": "confirmed-pin",
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            }
          },
          "shippingDue": {
            "amountMinor": 0,
            "currency": "EGP",
            "exponent": 2
          },
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "sourceRevision": 2,
          "splittingAllowed": true,
          "sourceDispatchCycleId": "public-cycle-e57adcf2-868a-4033-a364-eb4b3fc02b1f",
          "expectedSourceRevision": 1,
          "sourceBranchExternalId": "branch"
        }
      }
    }
  },
  {
    "id": "p23-deny-price-edit",
    "schema": "corrections.schema.json#/$defs/CorrectCommand",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.correct",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "tripId": "15000000-0000-4000-8000-000000000006"
      },
      "baseVersions": {
        "outcomeRevision": 1,
        "deviceGeneration": 1
      },
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "expectedOutcomeRevision": 1,
        "replacement": {
          "outcome": "partial",
          "pieces": [
            {
              "sourceLineId": "pieces",
              "delivered": 1
            }
          ],
          "reportedCollection": {
            "amountMinor": 15000,
            "currency": "EGP",
            "exponent": 2
          },
          "unitDue": 1
        },
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      }
    }
  },
  {
    "id": "p23-deny-fraction",
    "schema": "corrections.schema.json#/$defs/CorrectCommand",
    "valid": false,
    "keyword": "type",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.correct",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "tripId": "15000000-0000-4000-8000-000000000006"
      },
      "baseVersions": {
        "outcomeRevision": 1,
        "deviceGeneration": 1
      },
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "expectedOutcomeRevision": 1,
        "replacement": {
          "outcome": "partial",
          "pieces": [
            {
              "sourceLineId": "pieces",
              "delivered": 1.5
            }
          ],
          "reportedCollection": {
            "amountMinor": 15000,
            "currency": "EGP",
            "exponent": 2
          }
        },
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      }
    }
  },
  {
    "id": "p23-deny-revision",
    "schema": "corrections.schema.json#/$defs/CorrectCommand",
    "valid": false,
    "keyword": "required",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.correct",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "tripId": "15000000-0000-4000-8000-000000000006"
      },
      "baseVersions": {
        "outcomeRevision": 1,
        "deviceGeneration": 1
      },
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "replacement": {
          "outcome": "partial",
          "pieces": [
            {
              "sourceLineId": "pieces",
              "delivered": 1
            }
          ],
          "reportedCollection": {
            "amountMinor": 15000,
            "currency": "EGP",
            "exponent": 2
          }
        },
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      }
    }
  },
  {
    "id": "p23-event-reject-0",
    "schema": "corrections.schema.json#/$defs/Event",
    "valid": false,
    "keyword": "minimum",
    "data": {
      "correction": {
        "outcome": {
          "kind": "company",
          "time": {
            "actionId": "0f78f5e4-d8dc-4228-a290-7a44a266566b",
            "recordedAt": "2026-09-24T11:33:56.120Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 1,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 2
            }
          ],
          "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
          "arrival": null,
          "heading": null,
          "outcome": "partial",
          "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
          "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
          "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
          "revision": 2,
          "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
          "outcomeId": "a3a62257-a0b0-4fbe-ae6e-1c00d39e111f",
          "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 15000
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "shippingStatus": "collected",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
          "sourceReference": {
            "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
            "externalId": "shipment-0",
            "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        "correctionId": "5f2c1b2d-5278-4de6-8542-45c639af8d32",
        "evidenceActionId": null,
        "previousRevision": -1,
        "evidenceReceiptId": null,
        "previousOutcomeId": "bf8d6579-2dc1-4d42-b36b-65f8f95302a9"
      },
      "previousOutcome": {
        "kind": "company",
        "time": {
          "actionId": "11d3b921-94a9-417d-8762-7cf8045816c1",
          "recordedAt": "2026-09-24T11:33:55.980Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "lines": [
          {
            "unitDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "delivered": 2,
            "sourceLineId": "pieces",
            "sourceQuantity": 3,
            "heldReturnRequired": 1
          }
        ],
        "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
        "arrival": null,
        "heading": null,
        "outcome": "partial",
        "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
        "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
        "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
        "revision": 1,
        "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
        "outcomeId": "bf8d6579-2dc1-4d42-b36b-65f8f95302a9",
        "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
        "collection": {
          "goods": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 20000
          },
          "reported": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 25000
          },
          "shipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 5000
          },
          "shippingStatus": "collected",
          "unpaidShipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          }
        },
        "returnRequired": true,
        "sourceRevision": 1,
        "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
        "sourceReference": {
          "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
          "externalId": "shipment-0",
          "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
        },
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p23-event-reject-1",
    "schema": "corrections.schema.json#/$defs/Event",
    "valid": false,
    "keyword": "minimum",
    "data": {
      "correction": {
        "outcome": {
          "kind": "company",
          "time": {
            "actionId": "a640dfb0-d5c7-41d6-b150-6c457f8eee16",
            "recordedAt": "2026-09-24T11:33:56.458Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 2,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 1
            }
          ],
          "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
          "arrival": null,
          "heading": null,
          "outcome": "partial",
          "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
          "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
          "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
          "revision": 3,
          "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
          "outcomeId": "c6b8f2a9-c57c-4096-a464-e10fd1af14b8",
          "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 20000
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 25000
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "shippingStatus": "collected",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
          "sourceReference": {
            "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
            "externalId": "shipment-0",
            "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        "correctionId": "db2f357f-b0ca-4281-8a3f-ea3a1c4b74a7",
        "evidenceActionId": "95f6598a-1ea3-4eb4-bfaf-cd7f442ef0dd",
        "previousRevision": -1,
        "evidenceReceiptId": "eda0efa0-3df3-4e51-b4ae-b4b2cc784316",
        "previousOutcomeId": "a3a62257-a0b0-4fbe-ae6e-1c00d39e111f"
      },
      "previousOutcome": {
        "kind": "company",
        "time": {
          "actionId": "0f78f5e4-d8dc-4228-a290-7a44a266566b",
          "recordedAt": "2026-09-24T11:33:56.120Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "lines": [
          {
            "unitDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "delivered": 1,
            "sourceLineId": "pieces",
            "sourceQuantity": 3,
            "heldReturnRequired": 2
          }
        ],
        "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
        "arrival": null,
        "heading": null,
        "outcome": "partial",
        "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
        "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
        "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
        "revision": 2,
        "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
        "outcomeId": "a3a62257-a0b0-4fbe-ae6e-1c00d39e111f",
        "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
        "collection": {
          "goods": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 10000
          },
          "reported": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 15000
          },
          "shipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 5000
          },
          "shippingStatus": "collected",
          "unpaidShipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          }
        },
        "returnRequired": true,
        "sourceRevision": 1,
        "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
        "sourceReference": {
          "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
          "externalId": "shipment-0",
          "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
        },
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p23-event-reject-2",
    "schema": "corrections.schema.json#/$defs/AdoptionEvent",
    "valid": false,
    "keyword": "required",
    "data": {
      "outcomeId": "c6b8f2a9-c57c-4096-a464-e10fd1af14b8",
      "correctionId": "db2f357f-b0ca-4281-8a3f-ea3a1c4b74a7",
      "outcomeRevision": 3,
      "evidenceActionId": "95f6598a-1ea3-4eb4-bfaf-cd7f442ef0dd"
    }
  },
  {
    "id": "monitoring-hidden-count",
    "schema": "monitoring.schema.json#/$defs/Snapshot",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
      "workday": {
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "openedAt": "2026-09-24T12:19:59.849Z",
        "endedAt": null
      },
      "round": {
        "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "startedAt": "2026-09-24T12:19:59.850Z",
        "endedAt": null
      },
      "current": null,
      "nextSuggestion": null,
      "plan": {
        "planId": null,
        "revision": null,
        "orderedTaskIds": [
          "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "d0b2c730-68bc-5590-adaf-2f4a82499d62"
        ]
      },
      "owner": null,
      "progress": {
        "shipments": 2,
        "attempts": 2,
        "processedAttempts": 0,
        "processedShipments": 0,
        "fullDeliveredShipments": 0,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 2,
        "hiddenShipments": 1
      },
      "groups": {
        "preparedShipments": 0,
        "heldShipments": 2,
        "deferredShipments": 0,
        "returnRequiredShipments": 0,
        "heldPieces": 6,
        "returnRequiredPieces": 0
      },
      "items": [
        {
          "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
          "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        },
        {
          "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
          "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
          "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        }
      ],
      "scopeKey": "607c38c17df8d70fb0b2f00a3618b8e2acea2eb98a09e3e49e702a8d89cf5d48",
      "snapshotRevision": 1,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:19:59.863Z",
        "correlationId": "2c899e242acbba308a26ab90d097bf89"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.062Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:19:59.670Z",
        "integrationDelivery": "unavailable"
      }
    }
  },
  {
    "id": "monitoring-false-presence",
    "schema": "monitoring.schema.json#/$defs/Snapshot",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
      "workday": {
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "openedAt": "2026-09-24T12:19:59.849Z",
        "endedAt": null
      },
      "round": {
        "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "startedAt": "2026-09-24T12:19:59.850Z",
        "endedAt": null
      },
      "current": null,
      "nextSuggestion": null,
      "plan": {
        "planId": null,
        "revision": null,
        "orderedTaskIds": [
          "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "d0b2c730-68bc-5590-adaf-2f4a82499d62"
        ]
      },
      "owner": null,
      "progress": {
        "shipments": 2,
        "attempts": 2,
        "processedAttempts": 0,
        "processedShipments": 0,
        "fullDeliveredShipments": 0,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 2
      },
      "groups": {
        "preparedShipments": 0,
        "heldShipments": 2,
        "deferredShipments": 0,
        "returnRequiredShipments": 0,
        "heldPieces": 6,
        "returnRequiredPieces": 0
      },
      "items": [
        {
          "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
          "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        },
        {
          "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
          "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
          "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        }
      ],
      "scopeKey": "607c38c17df8d70fb0b2f00a3618b8e2acea2eb98a09e3e49e702a8d89cf5d48",
      "snapshotRevision": 1,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:19:59.863Z",
        "correlationId": "2c899e242acbba308a26ab90d097bf89"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.062Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:19:59.670Z",
        "integrationDelivery": "unavailable",
        "offline": true
      }
    }
  },
  {
    "id": "monitoring-false-applied",
    "schema": "monitoring.schema.json#/$defs/Snapshot",
    "valid": false,
    "keyword": "const",
    "data": {
      "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
      "workday": {
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "openedAt": "2026-09-24T12:19:59.849Z",
        "endedAt": null
      },
      "round": {
        "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "startedAt": "2026-09-24T12:19:59.850Z",
        "endedAt": null
      },
      "current": null,
      "nextSuggestion": null,
      "plan": {
        "planId": null,
        "revision": null,
        "orderedTaskIds": [
          "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "d0b2c730-68bc-5590-adaf-2f4a82499d62"
        ]
      },
      "owner": null,
      "progress": {
        "shipments": 2,
        "attempts": 2,
        "processedAttempts": 0,
        "processedShipments": 0,
        "fullDeliveredShipments": 0,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 2
      },
      "groups": {
        "preparedShipments": 0,
        "heldShipments": 2,
        "deferredShipments": 0,
        "returnRequiredShipments": 0,
        "heldPieces": 6,
        "returnRequiredPieces": 0
      },
      "items": [
        {
          "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
          "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        },
        {
          "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
          "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
          "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        }
      ],
      "scopeKey": "607c38c17df8d70fb0b2f00a3618b8e2acea2eb98a09e3e49e702a8d89cf5d48",
      "snapshotRevision": 1,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:19:59.863Z",
        "correlationId": "2c899e242acbba308a26ab90d097bf89"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.062Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:19:59.670Z",
        "integrationDelivery": "applied"
      }
    }
  },
  {
    "id": "monitoring-fractional-count",
    "schema": "monitoring.schema.json#/$defs/Snapshot",
    "valid": false,
    "keyword": "type",
    "data": {
      "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
      "workday": {
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "openedAt": "2026-09-24T12:19:59.849Z",
        "endedAt": null
      },
      "round": {
        "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "startedAt": "2026-09-24T12:19:59.850Z",
        "endedAt": null
      },
      "current": null,
      "nextSuggestion": null,
      "plan": {
        "planId": null,
        "revision": null,
        "orderedTaskIds": [
          "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "d0b2c730-68bc-5590-adaf-2f4a82499d62"
        ]
      },
      "owner": null,
      "progress": {
        "shipments": 1.5,
        "attempts": 2,
        "processedAttempts": 0,
        "processedShipments": 0,
        "fullDeliveredShipments": 0,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 2
      },
      "groups": {
        "preparedShipments": 0,
        "heldShipments": 2,
        "deferredShipments": 0,
        "returnRequiredShipments": 0,
        "heldPieces": 6,
        "returnRequiredPieces": 0
      },
      "items": [
        {
          "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
          "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        },
        {
          "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
          "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
          "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        }
      ],
      "scopeKey": "607c38c17df8d70fb0b2f00a3618b8e2acea2eb98a09e3e49e702a8d89cf5d48",
      "snapshotRevision": 1,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:19:59.863Z",
        "correlationId": "2c899e242acbba308a26ab90d097bf89"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.062Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:19:59.670Z",
        "integrationDelivery": "unavailable"
      }
    }
  },
  {
    "id": "monitoring-missing-revision",
    "schema": "monitoring.schema.json#/$defs/Snapshot",
    "valid": false,
    "keyword": "required",
    "data": {
      "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
      "workday": {
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "openedAt": "2026-09-24T12:19:59.849Z",
        "endedAt": null
      },
      "round": {
        "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "startedAt": "2026-09-24T12:19:59.850Z",
        "endedAt": null
      },
      "current": null,
      "nextSuggestion": null,
      "plan": {
        "planId": null,
        "revision": null,
        "orderedTaskIds": [
          "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "d0b2c730-68bc-5590-adaf-2f4a82499d62"
        ]
      },
      "owner": null,
      "progress": {
        "shipments": 2,
        "attempts": 2,
        "processedAttempts": 0,
        "processedShipments": 0,
        "fullDeliveredShipments": 0,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 2
      },
      "groups": {
        "preparedShipments": 0,
        "heldShipments": 2,
        "deferredShipments": 0,
        "returnRequiredShipments": 0,
        "heldPieces": 6,
        "returnRequiredPieces": 0
      },
      "items": [
        {
          "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
          "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        },
        {
          "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
          "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
          "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        }
      ],
      "scopeKey": "607c38c17df8d70fb0b2f00a3618b8e2acea2eb98a09e3e49e702a8d89cf5d48",
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:19:59.863Z",
        "correlationId": "2c899e242acbba308a26ab90d097bf89"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.062Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:19:59.670Z",
        "integrationDelivery": "unavailable"
      }
    }
  },
  {
    "id": "p25-ack-is-not-applied",
    "schema": "outbox.schema.json#/$defs/Acknowledgement",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "eventId": "da22db3d-9d3c-44fe-8886-7e3ca3ac2b9e",
      "acknowledgement": "received",
      "projectionStatus": "applied"
    }
  },
  {
    "id": "p25-unsupported-payload",
    "schema": "events/sender-event.v1.schema.json",
    "valid": false,
    "keyword": "const",
    "data": {
      "aggregate": {
        "id": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
        "recipientSequence": 1,
        "type": "task"
      },
      "committedAt": "2026-09-24T13:28:47.763Z",
      "correlation": {
        "actionId": "664c5484-d514-4c2f-aa55-efef75e768ff"
      },
      "eventId": "da22db3d-9d3c-44fe-8886-7e3ca3ac2b9e",
      "eventKind": "transition",
      "eventType": "task.snapshotAccepted",
      "payload": {
        "actionId": "664c5484-d514-4c2f-aa55-efef75e768ff",
        "task": {
          "assignmentRevision": 0,
          "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
          "driverExternalId": null,
          "driverId": null,
          "editable": true,
          "externalId": "shipment-1",
          "latest": true,
          "locationReadiness": "confirmed",
          "planningEligible": false,
          "planningStatus": "not-requested",
          "previousDispatchCycleId": null,
          "receivedAt": null,
          "snapshot": {
            "allocation": "exact-outstanding-per-unit",
            "destination": {
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              },
              "kind": "confirmed-pin"
            },
            "expectedSourceRevision": 0,
            "externalId": "shipment-1",
            "lines": [
              {
                "description": "قطع",
                "quantity": 3,
                "sourceLineId": "pieces",
                "unitDue": {
                  "amountMinor": 10000,
                  "currency": "EGP",
                  "exponent": 2
                }
              }
            ],
            "priority": "ordinary",
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "shippingDue": {
              "amountMinor": 5000,
              "currency": "EGP",
              "exponent": 2
            },
            "sourceBranchExternalId": "branch",
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "totalDue": {
              "amountMinor": 35000,
              "currency": "EGP",
              "exponent": 2
            }
          },
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "state": "unassigned",
          "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
        }
      },
      "payloadVersion": "2.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
        "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p25-unknown-event",
    "schema": "events/sender-event.v1.schema.json",
    "valid": false,
    "keyword": "const",
    "data": {
      "aggregate": {
        "id": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
        "recipientSequence": 1,
        "type": "task"
      },
      "committedAt": "2026-09-24T13:28:47.763Z",
      "correlation": {
        "actionId": "664c5484-d514-4c2f-aa55-efef75e768ff"
      },
      "eventId": "da22db3d-9d3c-44fe-8886-7e3ca3ac2b9e",
      "eventKind": "transition",
      "eventType": "unknown.changed",
      "payload": {
        "actionId": "664c5484-d514-4c2f-aa55-efef75e768ff",
        "task": {
          "assignmentRevision": 0,
          "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
          "driverExternalId": null,
          "driverId": null,
          "editable": true,
          "externalId": "shipment-1",
          "latest": true,
          "locationReadiness": "confirmed",
          "planningEligible": false,
          "planningStatus": "not-requested",
          "previousDispatchCycleId": null,
          "receivedAt": null,
          "snapshot": {
            "allocation": "exact-outstanding-per-unit",
            "destination": {
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              },
              "kind": "confirmed-pin"
            },
            "expectedSourceRevision": 0,
            "externalId": "shipment-1",
            "lines": [
              {
                "description": "قطع",
                "quantity": 3,
                "sourceLineId": "pieces",
                "unitDue": {
                  "amountMinor": 10000,
                  "currency": "EGP",
                  "exponent": 2
                }
              }
            ],
            "priority": "ordinary",
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "shippingDue": {
              "amountMinor": 5000,
              "currency": "EGP",
              "exponent": 2
            },
            "sourceBranchExternalId": "branch",
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "totalDue": {
              "amountMinor": 35000,
              "currency": "EGP",
              "exponent": 2
            }
          },
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "state": "unassigned",
          "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
        }
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
        "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p26-status-without-applied-watermark",
    "schema": "consumer.schema.json#/$defs/Status",
    "valid": false,
    "keyword": "required",
    "data": {
      "checkpoint": {
        "revision": 39,
        "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
        "aggregate": {
          "id": "9b17903d-a45d-5953-a979-1602ba81f89b",
          "type": "task"
        },
        "appliedAt": "2026-09-24T14:58:42.514Z",
        "lastError": null,
        "receivedAt": "2026-09-24T14:58:41.315Z",
        "pendingCount": 0,
        "receivedHigh": 3,
        "schemaVersion": "1.0.0",
        "historyComplete": true,
        "receivedThrough": 3,
        "snapshotThrough": 0,
        "projectedThrough": 3,
        "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
      },
      "state": {
        "task": {
          "state": "held",
          "latest": true,
          "taskId": "9b17903d-a45d-5953-a979-1602ba81f89b",
          "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
          "editable": true,
          "snapshot": {
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "quantity": 3,
                "description": "قطع",
                "sourceLineId": "pieces"
              }
            ],
            "priority": "ordinary",
            "totalDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 35000
            },
            "allocation": "exact-outstanding-per-unit",
            "externalId": "shipment-1",
            "destination": {
              "kind": "confirmed-pin",
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              }
            },
            "shippingDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "sourceDispatchCycleId": "cycle",
            "expectedSourceRevision": 0,
            "sourceBranchExternalId": "branch"
          },
          "externalId": "shipment-1",
          "receivedAt": "2026-09-24T14:58:28.583Z",
          "planningStatus": "pending",
          "sourceRevision": 1,
          "dispatchCycleId": "1f7b4139-e310-4fb1-a2ef-177a2e90e0cd",
          "driverExternalId": "policy-driver",
          "planningEligible": true,
          "locationReadiness": "confirmed",
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle",
          "previousDispatchCycleId": null
        },
        "notices": [],
        "outcomes": [
          {
            "kind": "company",
            "time": {
              "actionId": "75b8bae6-daaa-48e1-93c2-25fad9ba4b58",
              "recordedAt": "2026-09-24T14:58:29.293Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 0,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 3
              }
            ],
            "taskId": "9b17903d-a45d-5953-a979-1602ba81f89b",
            "arrival": null,
            "heading": null,
            "outcome": "no-answer",
            "roundId": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
            "branchId": "80c1cfe8-e95e-4e97-851c-92c81aa7d9cf",
            "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
            "revision": 1,
            "attemptId": "623ec0f0-92be-4793-92ad-5509af3a72f0",
            "outcomeId": "fc0ac285-c3dc-453f-b924-7cc88ed6c974",
            "workdayId": "10b90bdc-99b4-4a22-bd6c-7075947e6a21",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              },
              "reported": null,
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              },
              "shippingStatus": "not-attempted",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": true,
            "sourceRevision": 1,
            "dispatchCycleId": "1f7b4139-e310-4fb1-a2ef-177a2e90e0cd",
            "sourceReference": {
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "externalId": "shipment-1",
              "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          }
        ],
        "returnItems": [],
        "returnRequest": null
      }
    }
  },
  {
    "id": "p26-snapshot-invents-history",
    "schema": "consumer.schema.json#/$defs/Snapshot",
    "valid": false,
    "keyword": "const",
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
      "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
      "aggregate": {
        "type": "task",
        "id": "9b17903d-a45d-5953-a979-1602ba81f89b"
      },
      "throughSequence": 3,
      "capturedAt": "2026-09-24T14:58:43.679Z",
      "state": {
        "task": {
          "state": "held",
          "latest": true,
          "taskId": "9b17903d-a45d-5953-a979-1602ba81f89b",
          "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
          "editable": true,
          "snapshot": {
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "quantity": 3,
                "description": "قطع",
                "sourceLineId": "pieces"
              }
            ],
            "priority": "ordinary",
            "totalDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 35000
            },
            "allocation": "exact-outstanding-per-unit",
            "externalId": "shipment-1",
            "destination": {
              "kind": "confirmed-pin",
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              }
            },
            "shippingDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "sourceDispatchCycleId": "cycle",
            "expectedSourceRevision": 0,
            "sourceBranchExternalId": "branch"
          },
          "externalId": "shipment-1",
          "receivedAt": "2026-09-24T14:58:28.583Z",
          "planningStatus": "pending",
          "sourceRevision": 1,
          "dispatchCycleId": "1f7b4139-e310-4fb1-a2ef-177a2e90e0cd",
          "driverExternalId": "policy-driver",
          "planningEligible": true,
          "locationReadiness": "confirmed",
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle",
          "previousDispatchCycleId": null
        },
        "notices": [],
        "outcomes": [
          {
            "kind": "company",
            "time": {
              "actionId": "75b8bae6-daaa-48e1-93c2-25fad9ba4b58",
              "recordedAt": "2026-09-24T14:58:29.293Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 0,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 3
              }
            ],
            "taskId": "9b17903d-a45d-5953-a979-1602ba81f89b",
            "arrival": null,
            "heading": null,
            "outcome": "no-answer",
            "roundId": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
            "branchId": "80c1cfe8-e95e-4e97-851c-92c81aa7d9cf",
            "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
            "revision": 1,
            "attemptId": "623ec0f0-92be-4793-92ad-5509af3a72f0",
            "outcomeId": "fc0ac285-c3dc-453f-b924-7cc88ed6c974",
            "workdayId": "10b90bdc-99b4-4a22-bd6c-7075947e6a21",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              },
              "reported": null,
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              },
              "shippingStatus": "not-attempted",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": true,
            "sourceRevision": 1,
            "dispatchCycleId": "1f7b4139-e310-4fb1-a2ef-177a2e90e0cd",
            "sourceReference": {
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "externalId": "shipment-1",
              "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          }
        ],
        "returnItems": [],
        "returnRequest": null
      },
      "history": "complete-financial-history",
      "retention": "indefinite-no-purge"
    }
  },
  {
    "id": "p26-invalid-report-source",
    "schema": "consumer.schema.json#/$defs/ReportCommand",
    "valid": false,
    "keyword": "format",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "31274284-d534-4f52-b6fc-da94b469b50d",
      "operationId": "integration.reportAppliedCheckpoint",
      "context": {
        "kind": "integration",
        "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
        "integrationId": "wrong-source"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "revision": 39,
        "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
        "aggregate": {
          "id": "9b17903d-a45d-5953-a979-1602ba81f89b",
          "type": "task"
        },
        "appliedAt": "2026-09-24T14:58:42.514Z",
        "lastError": null,
        "receivedAt": "2026-09-24T14:58:41.315Z",
        "pendingCount": 0,
        "receivedHigh": 3,
        "schemaVersion": "1.0.0",
        "appliedThrough": 3,
        "historyComplete": true,
        "receivedThrough": 3,
        "snapshotThrough": 0,
        "projectedThrough": 3,
        "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
      }
    }
  },
  {
    "id": "p27-source-phantom-acceptance",
    "schema": "source.schema.json#/$defs/Status",
    "valid": false,
    "keyword": "type",
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "11111111-1111-4111-8111-111111111111",
      "integrationId": "22222222-2222-4222-8222-222222222222",
      "truncated": false,
      "commands": [
        {
          "actionId": "33333333-3333-4333-8333-333333333333",
          "operationId": "assignment.receiveBatch",
          "status": "accepted",
          "attempts": 1,
          "lastError": "connection_unavailable_acceptance_unknown",
          "result": null
        }
      ],
      "records": [
        {
          "kind": "shipment",
          "externalId": "reference-1",
          "localRevision": 2,
          "commandId": "33333333-3333-4333-8333-333333333333",
          "status": "pending"
        }
      ]
    }
  },
  {
    "id": "p27-source-rejection-cannot-be-accepted",
    "schema": "source.schema.json#/$defs/Status",
    "valid": false,
    "keyword": "const",
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "84fd7e35-6404-49b6-a7d0-6c1819c502ea",
      "integrationId": "745f1b8c-b01b-490f-b9d5-4a23ab1d7a85",
      "truncated": false,
      "records": [
        {
          "kind": "branch",
          "externalId": "cairo",
          "localRevision": 1,
          "commandId": "0422e804-3d26-4d87-b6af-2085c6e09194",
          "status": "accepted"
        }
      ],
      "commands": [
        {
          "actionId": "716861ca-4584-4957-bc38-55e7be631bcc",
          "operationId": "assignment.withdraw",
          "status": "accepted",
          "attempts": 1,
          "lastError": "departed_edit_forbidden",
          "result": {
            "receipt": {
              "problem": {
                "code": "departed_edit_forbidden",
                "type": "https://schemas.tawsel.invalid/problems/departed-edit-forbidden",
                "title": "Source command rejected",
                "detail": "Shipment is frozen by departure; ordinary ERP edits are unavailable.",
                "status": 409,
                "actionId": "716861ca-4584-4957-bc38-55e7be631bcc",
                "retryable": false,
                "correlationId": "6b976fa4-f2ab-458d-8809-7473cc12b657"
              },
              "actionId": "716861ca-4584-4957-bc38-55e7be631bcc",
              "receiptId": "9830995d-d701-468a-bf8f-d1028d88ba96",
              "receivedAt": "2026-09-24T16:28:20.756Z",
              "schemaVersion": "1.0.0",
              "businessStatus": "rejected",
              "evidenceStatus": "received"
            },
            "summary": {
              "code": "departed_edit_forbidden"
            },
            "response": {
              "body": {
                "code": "departed_edit_forbidden",
                "type": "https://schemas.tawsel.invalid/problems/departed-edit-forbidden",
                "title": "Source command rejected",
                "detail": "Shipment is frozen by departure; ordinary ERP edits are unavailable.",
                "status": 409,
                "actionId": "716861ca-4584-4957-bc38-55e7be631bcc",
                "retryable": false,
                "correlationId": "6b976fa4-f2ab-458d-8809-7473cc12b657"
              },
              "status": 409
            },
            "retention": "full",
            "operationId": "assignment.withdraw"
          }
        },
        {
          "actionId": "0422e804-3d26-4d87-b6af-2085c6e09194",
          "operationId": "branch.provision",
          "status": "accepted",
          "attempts": 1,
          "lastError": null,
          "result": {
            "receipt": {
              "actionId": "0422e804-3d26-4d87-b6af-2085c6e09194",
              "receiptId": "2a66a4dd-66fc-4d9b-ba2a-90a76d608776",
              "receivedAt": "2026-09-24T16:27:49.791Z",
              "committedAt": "2026-09-24T16:27:49.827Z",
              "schemaVersion": "1.0.0",
              "businessStatus": "accepted",
              "evidenceStatus": "received",
              "resourceVersions": {
                "sourceRevision": 1
              }
            },
            "summary": {
              "entity": "branch",
              "externalId": "cairo",
              "resourceId": "adc3d6b6-8a08-4d8c-a3df-ab9b3df36466",
              "issuerStatus": "not-required",
              "sourceRevision": 1
            },
            "response": {
              "body": {
                "entity": "branch",
                "externalId": "cairo",
                "resourceId": "adc3d6b6-8a08-4d8c-a3df-ab9b3df36466",
                "issuerStatus": "not-required",
                "sourceRevision": 1
              },
              "status": 200
            },
            "retention": "full",
            "operationId": "branch.provision"
          }
        }
      ]
    }
  },
  {
    "id": "p30-fractional-frozen-pieces",
    "schema": "current-activity.schema.json#/$defs/DeliveryAffordance",
    "valid": false,
    "keyword": "type",
    "data": {
      "kind": "company",
      "allowedActions": [
        "full",
        "partial",
        "refusal",
        "no-answer"
      ],
      "fullCollection": {
        "amountMinor": 35000,
        "currency": "EGP",
        "exponent": 2
      },
      "goodsDue": {
        "amountMinor": 30000,
        "currency": "EGP",
        "exponent": 2
      },
      "shippingDue": {
        "amountMinor": 5000,
        "currency": "EGP",
        "exponent": 2
      },
      "lines": [
        {
          "sourceLineId": "pieces",
          "description": "قطع",
          "quantity": 1.5,
          "unitDue": {
            "amountMinor": 10000,
            "currency": "EGP",
            "exponent": 2
          }
        }
      ]
    }
  },
  {
    "id": "p31-malformed-pending-request",
    "schema": "returns.schema.json#/$defs/Groups",
    "valid": false,
    "data": {
      "groups": [],
      "pendingRequests": [
        {
          "requestId": "invented"
        }
      ]
    },
    "keyword": "required"
  },
  {
    "id": "p31-negative-round-activity-revision",
    "schema": "workday-closure.schema.json#/$defs/RoundSummary",
    "valid": false,
    "data": {
      "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
      "startedAt": "2026-09-24T08:00:45.716Z",
      "endedAt": "2026-09-24T08:00:46.163Z",
      "firstPlanId": "8a034001-a3f2-406a-b7c6-a02f311ca136",
      "firstForecastId": "d50f23d8-9b79-41d0-9344-51a5a8d74727",
      "firstWorkloadId": "d60eecfd-d878-4359-876a-264af8caa8d7",
      "activityRevision": -1
    },
    "keyword": "minimum"
  },
  {
    "id": "local-unsupported-download-format",
    "schema": "local-work.schema.json#/$defs/Download",
    "valid": false,
    "keyword": "const",
    "data": {
      "scope": "[\"personal\",\"33000000-0000-4000-8000-000000000001\",\"33000000-0000-4000-8000-000000000002\",\"33000000-0000-4000-8000-000000000003\"]",
      "roundId": "33000000-0000-4000-8000-000000000005",
      "format": 2,
      "downloadedAt": "2026-09-25T08:00:00Z",
      "session": {
        "kind": "personal",
        "expiresAt": "2026-09-25T20:00:00Z",
        "loginIdentifier": "+201012345678",
        "recoveryEmailVerified": true,
        "phoneOwnershipVerified": false,
        "access": {
          "principalKind": "account",
          "tenantId": "33000000-0000-4000-8000-000000000001",
          "tenantKind": "personal",
          "sourceId": "33000000-0000-4000-8000-000000000002",
          "branchIds": [],
          "driverId": "33000000-0000-4000-8000-000000000004",
          "effectiveCapabilities": [
            "execution.own"
          ]
        }
      },
      "ownership": {
        "roundId": "33000000-0000-4000-8000-000000000005",
        "workdayId": "33000000-0000-4000-8000-000000000008",
        "driverId": "33000000-0000-4000-8000-000000000004",
        "owner": {
          "accountId": "33000000-0000-4000-8000-000000000002",
          "deviceId": "33000000-0000-4000-8000-000000000003",
          "generation": 1
        },
        "viewerDeviceId": "33000000-0000-4000-8000-000000000003",
        "mode": "owner",
        "roundState": "active",
        "workdayState": "open",
        "mayTakeover": false,
        "snapshotRequired": false
      },
      "snapshotToken": null,
      "current": {
        "roundId": "33000000-0000-4000-8000-000000000005",
        "driverId": "33000000-0000-4000-8000-000000000004",
        "owner": {
          "accountId": "33000000-0000-4000-8000-000000000002",
          "deviceId": "33000000-0000-4000-8000-000000000003",
          "generation": 1
        },
        "revision": 0,
        "currentActivity": null,
        "physicalOrigin": null,
        "planningOrigin": {
          "kind": "manual-pin",
          "coordinates": {
            "latitude": 30,
            "longitude": 31
          }
        },
        "nextSuggestion": null,
        "planning": {
          "planId": null,
          "updating": false
        },
        "branchActivity": null,
        "targets": [
          {
            "taskId": "33000000-0000-4000-8000-000000000006",
            "attemptId": "33000000-0000-4000-8000-000000000007",
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.1,
              "longitude": 31.1
            },
            "recipientName": "عميل محفوظ",
            "recipientPhone": "01012345678",
            "address": "عنوان محفوظ",
            "delivery": {
              "kind": "personal",
              "allowedActions": [
                "full",
                "refusal",
                "no-answer"
              ],
              "fullCollection": null,
              "goodsDue": null,
              "shippingDue": null,
              "lines": []
            }
          }
        ]
      },
      "outcomes": {
        "roundId": "33000000-0000-4000-8000-000000000005",
        "items": [],
        "history": [],
        "custody": [],
        "progress": {
          "processed": 0,
          "full": 0,
          "partial": 0,
          "refused": 0,
          "noAnswer": 0,
          "deliveredPieces": 0,
          "heldReturnRequiredPieces": 0,
          "collection": []
        }
      },
      "plan": null,
      "road": null
    }
  },
  {
    "id": "p33-plan-fabricated-road-provenance",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": false,
    "keyword": "const",
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "ready",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": {
        "mode": "car",
        "status": "complete",
        "policyValidated": false,
        "visits": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "arrivalOffsetSeconds": 10,
            "travelDurationSeconds": 10,
            "distanceMetres": 100,
            "serviceEstimateSeconds": 600,
            "waitingSeconds": 0
          }
        ],
        "unassignedTaskIds": [],
        "travelDurationSeconds": 10,
        "distanceMetres": 100,
        "customerServiceEstimateSeconds": 600,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 610,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "ordinary",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": "2026-09-23T10:10:10.000Z",
        "members": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "assigned",
            "exclusionReason": null,
            "position": 1,
            "expectedArrivalAt": "2026-09-23T10:00:10.000Z",
            "expectedCompletionAt": "2026-09-23T10:10:10.000Z"
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "grouped-heuristic",
        "orderedTaskIds": [
          "14000000-0000-4000-8000-000000000001"
        ],
        "exceptions": [],
        "roadRoute": {
          "mode": "car",
          "status": "complete",
          "geometrySource": "straight-line-assumption",
          "geometry": [
            {
              "latitude": 30.04,
              "longitude": 31.23
            },
            {
              "latitude": 30.05,
              "longitude": 31.24
            }
          ],
          "durationSeconds": 25,
          "distanceMetres": 250,
          "legs": [
            {
              "durationSeconds": 25,
              "distanceMetres": 250
            }
          ]
        }
      }
    }
  },
  {
    "id": "p34-empty-batch",
    "schema": "sync.schema.json#/$defs/Batch",
    "valid": false,
    "data": {
      "actions": []
    },
    "keyword": "minItems"
  },
  {
    "id": "p34-batch-limit",
    "schema": "sync.schema.json#/$defs/Batch",
    "valid": false,
    "data": {
      "actions": [
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        {}
      ]
    },
    "keyword": "maxItems"
  },
  {
    "id": "p34-blanket-success",
    "schema": "sync.schema.json#/$defs/BatchResult",
    "valid": false,
    "data": {
      "success": true
    },
    "keyword": "required"
  },
  {
    "id": "p34-received-without-receipt",
    "schema": "sync.schema.json#/$defs/Entry",
    "valid": false,
    "data": {
      "actionId": "16000000-0000-4000-8000-000000000001",
      "status": "received"
    },
    "keyword": "required"
  },
  {
    "id": "p35-account-restriction-without-reauth",
    "schema": "session.schema.json#/$defs/LoginRequest",
    "valid": false,
    "keyword": "required",
    "data": {
      "kind": "personal",
      "expectedAccount": {
        "tenantId": "35000000-0000-4000-8000-000000000001",
        "accountId": "35000000-0000-4000-8000-000000000002"
      }
    }
  },
  {
    "id": "p35-account-restriction-not-an-auth-grant",
    "schema": "session.schema.json#/$defs/LoginRequest",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "kind": "personal",
      "reauthenticate": true,
      "expectedAccount": {
        "tenantId": "35000000-0000-4000-8000-000000000001",
        "accountId": "35000000-0000-4000-8000-000000000002"
      },
      "authenticated": true
    }
  },
  {
    "id": "p35-unknown-payload-not-v1",
    "schema": "sync.schema.json#/$defs/Batch",
    "valid": false,
    "keyword": "const",
    "data": {
      "actions": [
        {
          "schemaVersion": "1.0.0",
          "payloadVersion": "9.0.0",
          "operationId": "current.selectHeading",
          "actionId": "16000000-0000-4000-8000-000000000001",
          "context": {
            "kind": "device",
            "tenantId": "15000000-0000-4000-8000-000000000011",
            "accountId": "15000000-0000-4000-8000-000000000007",
            "deviceId": "15000000-0000-4000-8000-000000000003",
            "deviceGeneration": 1,
            "deviceSequence": 1
          },
          "resources": {
            "tripId": "15000000-0000-4000-8000-000000000006",
            "taskId": "16000000-0000-4000-8000-000000000002",
            "attemptId": "16000000-0000-4000-8000-000000000003"
          },
          "baseVersions": {},
          "dependsOnActionIds": [],
          "observation": {
            "observedAt": null,
            "clock": {
              "quality": "unknown"
            }
          },
          "payload": {
            "roundId": "15000000-0000-4000-8000-000000000006",
            "taskId": "16000000-0000-4000-8000-000000000002",
            "attemptId": "16000000-0000-4000-8000-000000000003",
            "expectedActivityRevision": 0,
            "expectedCurrentAttemptId": null,
            "expectedSourceRevision": 1,
            "expectedAssignmentRevision": 0,
            "expectedPinRevision": 0
          }
        }
      ]
    }
  },
  {
    "id": "report-no-invented-actual",
    "schema": "reporting.schema.json#/$defs/Time",
    "valid": false,
    "keyword": "type",
    "data": {
      "status": "available",
      "observedAt": null,
      "recordedAt": null,
      "actionId": null,
      "clock": null
    }
  },
  {
    "id": "report-null-needs-reason",
    "schema": "reporting.schema.json#/$defs/Measurement",
    "valid": false,
    "keyword": "oneOf",
    "data": {
      "seconds": null,
      "reason": null
    }
  },
  {
    "id": "report-money-is-exact",
    "schema": "reporting.schema.json#/$defs/Collection",
    "valid": false,
    "keyword": "type",
    "data": {
      "currency": "EGP",
      "exponent": 2,
      "reportedMinor": 25000,
      "goodsMinor": "20000",
      "shippingMinor": "5000",
      "unpaidShippingMinor": "0",
      "unreportedAttempts": 0
    }
  },
  {
    "id": "report-no-cross-tenant-filter",
    "schema": "reporting.schema.json#/$defs/Filters",
    "valid": false,
    "keyword": "additionalProperties",
    "data": {
      "roundId": null,
      "driverId": null,
      "branchId": null,
      "outcome": "partial",
      "tenantId": "60000000-0000-4000-8000-000000000001"
    }
  }
]

````
<!-- SOURCE-END contracts/examples/invalid.json -->

## Original file: contracts/examples/README.md

SHA-256: `3a3a748a4d5f9298f2f03ee46270da31258c27cea582ff8b787d31af733e85e7` · Bytes: 12733.

<!-- SOURCE-BEGIN contracts/examples/README.md -->
````markdown
# Canonical foundation examples

P35 adds labelled valid same-account reauthentication, sealed local selection and scoped draft examples, plus invalid recovery-without-reauthentication, asserted-authentication-grant and unsupported-sync-payload examples. These are schema fixtures; actual auth/queue/migration/browser proof is separately recorded in [Phase 35 evidence](../../docs/phase-35-evidence.md). Canonical totals are 261 valid and 162 invalid examples across 28 schemas; generated references remain derived.

P27 `p27-source-completed-capture` is a compact schema fixture assembled from selected public accepted/rejected command entries from the independently installed two-way demonstration; it is not a complete source inventory. The unabridged source read is retained in the demo's redacted evidence. `p27-source-pending` is an explicit schema fixture. Negative examples reject acceptance without a durable result and acceptance contradicting its rejection receipt. [Actual process/browser evidence](../../docs/phase-27-evidence.md). Local source revisions and source acceptance remain distinct from receiver application.

P26 examples: p26-captured-current-*, p26-captured-applied-report-* and p26-captured-consumer-status are public outputs from the separate-process, separately installed durable receiver demonstration on 24 September 2026. p26-report-command-fixture and the invalid cases are labelled schema fixtures. Capture provenance and exact commands: [integration evidence](../../docs/verification/integration.md). Current snapshots explicitly carry current-state-only history semantics; they are not synthetic transition history.

P25 `p25-*` valid examples are captured from the real isolated PostgreSQL/HTTP sender demo (controlled receiver, projection unknown). They include actual intake/outcome/correction/return events and delivery reads. Invalid examples reject unknown types/versions and receipt/application conflation. [webhook-signature.v1.json](webhook-signature.v1.json) is a published exact-byte vector with a **public test-only zero key**; the fast protocol test verifies it. Never use that key in deployment.

P24 monitoring examples are captured from the isolated PostgreSQL/loopback HTTP demo: scoped/own/corrected snapshots and task/workday history. Negative examples reject hidden count fields, false presence/applied claims, fractional counters and missing revisions. Semantic arithmetic/isolation is also tested through real APIs and the portable monitoring conformance consumer.

P23 correction examples include a designed closed correction command and captured local HTTP demo correction/adoption events plus receipt-denied availability. Negative cases reject extra price fields, fractional pieces, missing expected revision and invalid event linkage fields. Semantic money/ownership/dependency checks are real PostgreSQL tests, not claims made by JSON Schema alone. See [evidence](../../docs/phase-23-evidence.md).

## P22 captured examples

The `p22-*` valid examples were captured from `npm run branches:demo` against real HTTP/PostgreSQL: interruption, arrival, waiting/resume flow, new-cycle command, preserved cycle list, current state and durable event payloads. Driver identity/bootstrap are fixtures. Invalid p22 mutations cover empty/fractional claims, arbitrary branch injection and fractional redispatch quantities; they are schema rejection fixtures, not live commands. See [evidence](../../docs/phase-22-evidence.md) for database/consumer guarantees and exact limits. No signed-delivery/native-ERP/UI claim is implied.

## P21 captures

`p21-*` valid examples are captured from the real isolated PostgreSQL/listening-HTTP `npm run returns:demo`: driver offer, native receipt/loss commands, offered/two-received/disposed reads, claimed-subset waiting/confirmation, durable action recovery and separate local event intents. Driver identity/bootstrap are fixtures; the native consumer uses real scoped service credentials through public HTTP. Invalid examples mutate the canonical captures (fractional/empty pieces, asserted actor, stock field and receipt/disposition confusion). Runtime scope/over-receipt/retry-race rejection belongs to `partial-return-correction.test.ts`, not a claim that JSON Schema enforces arithmetic. No native ERP UI or signed-delivery proof.


P17 `p17-*` examples define full/partial/refusal/no-answer commands, exact frozen amounts and whole lines, effective records/progress, action status and source event payload. Negative fixtures reject fractional/negative/unsafe/unlike-currency inputs, B2C piece results and fabricated no-answer collection/arrival. [Outcome semantics](../../docs/outcomes.md) distinguish schema fixtures from the actual two-task HTTP/PostgreSQL report produced by `npm run outcomes:demo`. The `event-outcome-transition` envelope now contains the canonical P17 payload; its sequence/signature/delivery remains an illustrative P25 boundary.

P15 `p15-*` examples define readiness, start command/result, current workday/round, accepted/rejected/pending start status, and invalid caller sync flags/local drafts. The HTTP demo records actual equivalents in `.local/phase-15-demo.json`; canonical examples are schema fixtures. See [start contract and queue limits](../../docs/round-start.md).

P14 `p14-*` examples cover a ready route, an unassigned urgent exception, complete manual order and select-first command. Negative examples reject fake road/finish estimates, partial-as-ready, missing policy approval and duplicate manual IDs. Examples are canonical contract data; behavioral PostgreSQL/HTTP evidence is separate in [P14 evidence](../../docs/phase-14-evidence.md).

P13 `p13-*` examples cover explicit planning settings, revisioned snapshots/commands, durable job status, partial candidate forecasts and source-scoped draft notice. Invalid examples reject invented GPS provenance, missing attempt identity, false active/policy claims, invalid revisions/statuses and impossible running/completed status fields. These are canonical data examples; PostgreSQL/HTTP/process acceptance evidence is in [Phase 13](../../docs/phase-13-evidence.md).

P10 p10-* entries now cover closed snapshot/prepare/receive/withdraw/reassign/urgency envelopes, explicit prepaid and exact partial-prepaid allocations, typed event intent and capacity/allocation/stale errors. Invalid examples cover fractional pieces, missing due/splitting permission, ambiguous deposits, mixed currency and unasserted receipt. Schemas own shape; connected PostgreSQL tests additionally enforce exact sums, scope, revision and capacity. [Public consumer demo](../../docs/b2b-intake.md) executes real HTTP; examples alone are not acceptance evidence.


`valid.json` and `invalid.json` contain `{id, schema, valid, data}` records, with an expected failing keyword for invalid cases. `schema` resolves locally under `contracts/`; `.invalid` IDs are identifiers, never network dependencies. `npm run contracts:demo` validates all examples and checks generated artifacts without running an Engine or business service.

Most foundation examples are **designed examples**. Common values and envelope structure are fully validated here. P08 provisioning and P09 independent intake add exact implemented feature schemas/examples; other illustrative action/event payloads are not completed feature schemas. Feature owners replace them before accepting or emitting messages. Envelope validity never establishes authorization or business acceptance.

`action-partial-envelope` uses distinct task/cycle/assignment/workday/trip/plan/stop/attempt IDs and EGP 25,000 integer minor units. `event-return-request` offers one piece and asserts only `requested`, never branch receipt or available stock. Transition event IDs differ from a newer progress replacement snapshot. `evidence-old-device-review` preserves receipt without a commit or ERP-applied claim. See the complete correction/subset/fresh-dispatch [state walkthrough](../../docs/tracking-and-consistency.md).

No endpoint URL, credential or automatic ERP compatibility is claimed. Real consumer quickstart and conformance arrive in P26–27; this phase's portable types example is in `packages/api-client/examples/consumer.ts`.

P09 adds `p09-create-address-task`, `p09-confirmed-pin-task` and invalid missing-phone/wrong-EGP-exponent cases. The runtime additionally enforces personal-tenant ownership, positive collection, revision/departure locking and location readiness through real PostgreSQL tests; see [P09 evidence](../../docs/phase-09-evidence.md).

P06 adds `access-*`: explicit inherit/allow/deny overrides; company, personal and integration `AccessContext`; lifecycle denial; invalid role-name grants, branch-specific overrides, personal branches, integration driver/own-work grants and duplicate capabilities. These are schema conformance fixtures. Real PostgreSQL isolation tests use labelled principals/synthetic resource rows and are documented in [P06 evidence](../../docs/phase-06-evidence.md); no example is a production authentication mechanism.

P05 adds `action-result-full` and `action-result-compacted`, plus invalid missing-response, compacted-with-response and pending-result cases. These use illustrative delivery data for schema conformance only. Actual database tests exercise explicitly synthetic counters and real migrations. Compacted results preserve the original receipt/stable summary, omit full response status/body, and never authorize a new action ID. The public `action.getResult` route still awaits authenticated P06–P08 bindings.

P12 adds normalized routing input, unreachable-table and profile-metadata examples, plus invalid GPS origin, provider-only bike mode and positional coordinates. Provider fixtures live separately in apps/api/test/support/engine-fixtures.ts and are never public payloads. `npm run test:engine` exercises private conversion; `npm run test:erp:routing` checks consumer semantics.

P16 adds `current-heading`, `current-arrived`, `current-manual-origin`, `p16-select-heading`, `p16-arrival`, `p16-correct-origin`, accepted/pending current action statuses and `p16-snapshot-arrived`. Negative examples reject inferred arrival/next stage, missing relevant selection versions and arrival without a current attempt. Exact schema ownership is [current-activity.schema.json](../current-activity.schema.json). Fixed-ID examples are contract fixtures; `npm run current:demo` writes actual browser/API/PostgreSQL state and stable action IDs to `.local/phase-16-browser-demo.json`.

## P18 captured examples

`p18-*` valid examples capture request/result/status/read/source-event shapes from the real local HTTP/PostgreSQL eligibility demo (fixture identity; manual plan; no signed transport). They include whole retry recovery and a future urgent task with a denied activation. Nine invalid examples reject counters, windows, invalid time/urgency and missing/fractional/negative/overflow revisions. Run `npm run eligibility:demo` for fresh dynamic IDs/times and `npm run test:erp:eligibility -- .local/phase-18-demo.json`; checked-in examples are reproducible contract fixtures, not production data.

P19 examples (`p19-*`) capture the actual disposable HTTP/PostgreSQL demonstration for closure commands/results/status, workday summary, retained holder work and source-filtered event payloads. `p19-pending` is a contract shape; future offline/device behavior remains unverified. Invalid examples reject generic current disappearance, non-UTC server timestamps, invented settlement/receipt and inconsistent deferred eligibility.
# Phase 20 evidence provenance

`p20-view`, takeover command/result/status, snapshot, received/duplicate/evidence, former outcome and three account-notification payloads are captured from `npm run devices:demo` (real HTTP, separate application sessions, isolated PostgreSQL and API restart; signed issuer fixture). `p20-adoption-designed-only` is a shape fixture with no handler. P20 invalid examples exercise absent generations/receipts, malformed tokens and forbidden override/time-winner fields. Canonical JSON examples remain owned here; ERP guides link to them.
## Phase 33 examples

`local-started-download-v1` and `local-immutable-capture-v1` describe browser-only records; `local-unsupported-download-format` must fail. `p33-plan-with-downloaded-road-context` extends a valid public plan with optional verified road data; `p33-plan-fabricated-road-provenance` must fail. Local saved evidence is not an accepted server/ERP result. Canonical ownership remains the corresponding schemas, with transactional/real-browser evidence in `docs/phase-33-evidence.md`.

````
<!-- SOURCE-END contracts/examples/README.md -->

## Original file: contracts/examples/valid.json

SHA-256: `30e2b0b097903a8394a1d80aa380b450beb6d20e2591b8d49b3bdf12ffde1da7` · Bytes: 429233.

<!-- SOURCE-BEGIN contracts/examples/valid.json -->
````json
[
  {
    "id": "common-Uuid",
    "schema": "common.schema.json#/$defs/Uuid",
    "valid": true,
    "data": "10000000-0000-4000-8000-000000000001"
  },
  {
    "id": "common-SchemaVersion",
    "schema": "common.schema.json#/$defs/SchemaVersion",
    "valid": true,
    "data": "1.0.0"
  },
  {
    "id": "common-Revision",
    "schema": "common.schema.json#/$defs/Revision",
    "valid": true,
    "data": 2
  },
  {
    "id": "common-Generation",
    "schema": "common.schema.json#/$defs/Generation",
    "valid": true,
    "data": 1
  },
  {
    "id": "common-Sequence",
    "schema": "common.schema.json#/$defs/Sequence",
    "valid": true,
    "data": 4
  },
  {
    "id": "common-PieceCount",
    "schema": "common.schema.json#/$defs/PieceCount",
    "valid": true,
    "data": 0
  },
  {
    "id": "common-PositivePieceCount",
    "schema": "common.schema.json#/$defs/PositivePieceCount",
    "valid": true,
    "data": 3
  },
  {
    "id": "common-UtcInstant",
    "schema": "common.schema.json#/$defs/UtcInstant",
    "valid": true,
    "data": "2026-09-22T10:00:00Z"
  },
  {
    "id": "common-ExternalId",
    "schema": "common.schema.json#/$defs/ExternalId",
    "valid": true,
    "data": "shipment-001"
  },
  {
    "id": "common-OperationId",
    "schema": "common.schema.json#/$defs/OperationId",
    "valid": true,
    "data": "outcome.recordPartial"
  },
  {
    "id": "common-SourceReference",
    "schema": "common.schema.json#/$defs/SourceReference",
    "valid": true,
    "data": {
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "integrationId": "10000000-0000-4000-8000-000000000002",
      "externalId": "shipment-001"
    }
  },
  {
    "id": "common-Money",
    "schema": "common.schema.json#/$defs/Money",
    "valid": true,
    "data": {
      "amountMinor": 25000,
      "currency": "EGP",
      "exponent": 2
    }
  },
  {
    "id": "common-Coordinates",
    "schema": "common.schema.json#/$defs/Coordinates",
    "valid": true,
    "data": {
      "latitude": 30.0444,
      "longitude": 31.2357
    }
  },
  {
    "id": "common-ContactSnapshot",
    "schema": "common.schema.json#/$defs/ContactSnapshot",
    "valid": true,
    "data": {
      "name": "عميل تجريبي",
      "phone": "+201000000000"
    }
  },
  {
    "id": "common-LocationSnapshot",
    "schema": "common.schema.json#/$defs/LocationSnapshot",
    "valid": true,
    "data": {
      "originalAddress": "عنوان تجريبي بالقاهرة",
      "provenance": "source"
    }
  },
  {
    "id": "common-TimeWindow",
    "schema": "common.schema.json#/$defs/TimeWindow",
    "valid": true,
    "data": {
      "earliestAt": "2026-09-22T10:00:00Z"
    }
  },
  {
    "id": "common-DeliveryRequirements",
    "schema": "common.schema.json#/$defs/DeliveryRequirements",
    "valid": true,
    "data": {
      "priority": "urgent",
      "serviceDurationSeconds": 600
    }
  },
  {
    "id": "common-DeliverySnapshot",
    "schema": "common.schema.json#/$defs/DeliverySnapshot",
    "valid": true,
    "data": {
      "sourceTaskReference": {
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "integrationId": "10000000-0000-4000-8000-000000000002",
        "externalId": "shipment-001"
      },
      "sourceOrderReference": {
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "integrationId": "10000000-0000-4000-8000-000000000002",
        "externalId": "order-001"
      },
      "sourceRevision": 1,
      "customer": {
        "name": "عميل تجريبي",
        "phone": "+201000000000"
      },
      "location": {
        "originalAddress": "عنوان تجريبي بالقاهرة",
        "provenance": "source"
      },
      "requirements": {
        "priority": "ordinary",
        "serviceDurationSeconds": 600
      }
    }
  },
  {
    "id": "common-ResourceContext",
    "schema": "common.schema.json#/$defs/ResourceContext",
    "valid": true,
    "data": {
      "taskId": "10000000-0000-4000-8000-000000000010",
      "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
      "assignmentId": "10000000-0000-4000-8000-000000000012",
      "workdayId": "10000000-0000-4000-8000-000000000013",
      "tripId": "10000000-0000-4000-8000-000000000014",
      "planId": "10000000-0000-4000-8000-000000000015",
      "stopId": "10000000-0000-4000-8000-000000000016",
      "attemptId": "10000000-0000-4000-8000-000000000017"
    }
  },
  {
    "id": "common-Versions",
    "schema": "common.schema.json#/$defs/Versions",
    "valid": true,
    "data": {
      "sourceRevision": 1,
      "resourceRevision": 1,
      "outcomeRevision": 1,
      "assignmentGeneration": 1,
      "routeRevision": 2,
      "deviceGeneration": 1,
      "snapshotRevision": 5
    }
  },
  {
    "id": "common-ClockEvidence",
    "schema": "common.schema.json#/$defs/ClockEvidence",
    "valid": true,
    "data": {
      "quality": "unknown"
    }
  },
  {
    "id": "common-Observation",
    "schema": "common.schema.json#/$defs/Observation",
    "valid": true,
    "data": {
      "observedAt": "2026-09-22T09:58:00Z",
      "clock": {
        "quality": "uncertain"
      }
    }
  },
  {
    "id": "common-DeviceContext",
    "schema": "common.schema.json#/$defs/DeviceContext",
    "valid": true,
    "data": {
      "kind": "device",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "accountId": "10000000-0000-4000-8000-000000000003",
      "deviceId": "10000000-0000-4000-8000-000000000004",
      "deviceGeneration": 1,
      "deviceSequence": 4
    }
  },
  {
    "id": "common-IntegrationContext",
    "schema": "common.schema.json#/$defs/IntegrationContext",
    "valid": true,
    "data": {
      "kind": "integration",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "integrationId": "10000000-0000-4000-8000-000000000002"
    }
  },
  {
    "id": "common-CommandContext",
    "schema": "common.schema.json#/$defs/CommandContext",
    "valid": true,
    "data": {
      "kind": "device",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "accountId": "10000000-0000-4000-8000-000000000003",
      "deviceId": "10000000-0000-4000-8000-000000000004",
      "deviceGeneration": 1,
      "deviceSequence": 4
    }
  },
  {
    "id": "common-EvidenceStatus",
    "schema": "common.schema.json#/$defs/EvidenceStatus",
    "valid": true,
    "data": "received"
  },
  {
    "id": "common-BusinessStatus",
    "schema": "common.schema.json#/$defs/BusinessStatus",
    "valid": true,
    "data": "review-required"
  },
  {
    "id": "common-DeliveryStatus",
    "schema": "common.schema.json#/$defs/DeliveryStatus",
    "valid": true,
    "data": "received"
  },
  {
    "id": "common-ApplicationStatus",
    "schema": "common.schema.json#/$defs/ApplicationStatus",
    "valid": true,
    "data": "applied"
  },
  {
    "id": "common-ErrorCode",
    "schema": "common.schema.json#/$defs/ErrorCode",
    "valid": true,
    "data": "idempotency_conflict"
  },
  {
    "id": "common-Problem",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:idempotency_conflict",
      "title": "Action identity already has a different payload",
      "status": 409,
      "code": "idempotency_conflict",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "common-Capability",
    "schema": "common.schema.json#/$defs/Capability",
    "valid": true,
    "data": "execution.own"
  },
  {
    "id": "common-PageRequest",
    "schema": "common.schema.json#/$defs/PageRequest",
    "valid": true,
    "data": {
      "limit": 50
    }
  },
  {
    "id": "common-PageInfo",
    "schema": "common.schema.json#/$defs/PageInfo",
    "valid": true,
    "data": {
      "nextCursor": null,
      "snapshotRevision": 5
    }
  },
  {
    "id": "action-partial-envelope",
    "schema": "action-envelope.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.recordPartial",
      "context": {
        "kind": "device",
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "accountId": "10000000-0000-4000-8000-000000000003",
        "deviceId": "10000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "baseVersions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "dependsOnActionIds": [
        "10000000-0000-4000-8000-000000000039"
      ],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "deliveredPieces": 2,
        "reportedCollection": {
          "amountMinor": 25000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "action-source-envelope",
    "schema": "action-envelope.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "intake.prepare",
      "context": {
        "kind": "integration",
        "tenantId": "10000000-0000-4000-8000-000000000001",
        "integrationId": "10000000-0000-4000-8000-000000000002"
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "baseVersions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "sourceTaskReference": {
          "tenantId": "10000000-0000-4000-8000-000000000001",
          "integrationId": "10000000-0000-4000-8000-000000000002",
          "externalId": "shipment-001"
        }
      }
    }
  },
  {
    "id": "evidence-pending",
    "schema": "evidence-receipt.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "receiptId": "10000000-0000-4000-8000-000000000070",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "evidenceStatus": "received",
      "businessStatus": "pending",
      "receivedAt": "2026-09-22T10:00:00Z"
    }
  },
  {
    "id": "evidence-accepted",
    "schema": "evidence-receipt.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "receiptId": "10000000-0000-4000-8000-000000000070",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "evidenceStatus": "received",
      "businessStatus": "accepted",
      "receivedAt": "2026-09-22T10:00:00Z",
      "committedAt": "2026-09-22T10:00:01Z",
      "resourceVersions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      }
    }
  },
  {
    "id": "evidence-old-device-review",
    "schema": "evidence-receipt.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "receiptId": "10000000-0000-4000-8000-000000000070",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "evidenceStatus": "received",
      "businessStatus": "review-required",
      "receivedAt": "2026-09-22T10:00:00Z",
      "problem": {
        "type": "urn:tawsel:problem:stale_device",
        "title": "Former-device evidence retained",
        "status": 409,
        "code": "stale_device",
        "correlationId": "10000000-0000-4000-8000-000000000041",
        "actionId": "10000000-0000-4000-8000-000000000040",
        "retryable": false
      }
    }
  },
  {
    "id": "event-outcome-transition",
    "schema": "events/envelope.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000050",
      "eventType": "outcome.recorded",
      "eventKind": "transition",
      "tenantId": "17000000-0000-4000-8000-000000000018",
      "recipientIntegrationId": "17000000-0000-4000-8000-000000000024",
      "aggregate": {
        "type": "task",
        "id": "17000000-0000-4000-8000-000000000011",
        "recipientSequence": 4
      },
      "resources": {
        "taskId": "17000000-0000-4000-8000-000000000011",
        "attemptId": "17000000-0000-4000-8000-000000000012",
        "tripId": "17000000-0000-4000-8000-000000000003",
        "workdayId": "17000000-0000-4000-8000-000000000005",
        "dispatchCycleId": "17000000-0000-4000-8000-000000000023"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "17000000-0000-4000-8000-000000000017",
        "sourceReference": {
          "tenantId": "17000000-0000-4000-8000-000000000018",
          "externalId": "shipment-0",
          "integrationId": "17000000-0000-4000-8000-000000000024"
        }
      },
      "committedAt": "2026-09-24T08:00:00.000Z",
      "payload": {
        "outcome": {
          "kind": "company",
          "time": {
            "actionId": "17000000-0000-4000-8000-000000000017",
            "recordedAt": "2026-09-24T08:00:00.000Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 2,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 1
            }
          ],
          "taskId": "17000000-0000-4000-8000-000000000011",
          "arrival": {
            "actionId": "17000000-0000-4000-8000-000000000016",
            "recordedAt": "2026-09-24T08:00:00.000Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "heading": {
            "actionId": "17000000-0000-4000-8000-000000000015",
            "recordedAt": "2026-09-24T08:00:00.000Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "outcome": "partial",
          "roundId": "17000000-0000-4000-8000-000000000003",
          "branchId": "17000000-0000-4000-8000-000000000022",
          "driverId": "17000000-0000-4000-8000-000000000004",
          "revision": 1,
          "attemptId": "17000000-0000-4000-8000-000000000012",
          "outcomeId": "17000000-0000-4000-8000-000000000021",
          "workdayId": "17000000-0000-4000-8000-000000000005",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 20000
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 25000
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "shippingStatus": "collected",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "17000000-0000-4000-8000-000000000023",
          "sourceReference": {
            "tenantId": "17000000-0000-4000-8000-000000000018",
            "externalId": "shipment-0",
            "integrationId": "17000000-0000-4000-8000-000000000024"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        }
      }
    }
  },
  {
    "id": "event-progress-snapshot",
    "schema": "events/envelope.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000051",
      "eventType": "progress.snapshot",
      "eventKind": "replacement-snapshot",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "recipientIntegrationId": "10000000-0000-4000-8000-000000000002",
      "aggregate": {
        "type": "task",
        "id": "10000000-0000-4000-8000-000000000010",
        "recipientSequence": 6
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "10000000-0000-4000-8000-000000000040",
        "sourceReference": {
          "tenantId": "10000000-0000-4000-8000-000000000001",
          "integrationId": "10000000-0000-4000-8000-000000000002",
          "externalId": "shipment-001"
        }
      },
      "committedAt": "2026-09-22T10:00:00Z",
      "payload": {
        "processedStops": 1
      },
      "snapshotRevision": 8
    }
  },
  {
    "id": "event-return-request",
    "schema": "events/envelope.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000052",
      "eventType": "return.requested",
      "eventKind": "transition",
      "tenantId": "10000000-0000-4000-8000-000000000001",
      "recipientIntegrationId": "10000000-0000-4000-8000-000000000002",
      "aggregate": {
        "type": "task",
        "id": "10000000-0000-4000-8000-000000000010",
        "recipientSequence": 5
      },
      "resources": {
        "taskId": "10000000-0000-4000-8000-000000000010",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000011",
        "assignmentId": "10000000-0000-4000-8000-000000000012",
        "workdayId": "10000000-0000-4000-8000-000000000013",
        "tripId": "10000000-0000-4000-8000-000000000014",
        "planId": "10000000-0000-4000-8000-000000000015",
        "stopId": "10000000-0000-4000-8000-000000000016",
        "attemptId": "10000000-0000-4000-8000-000000000017"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 1,
        "outcomeRevision": 1,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "10000000-0000-4000-8000-000000000042",
        "sourceReference": {
          "tenantId": "10000000-0000-4000-8000-000000000001",
          "integrationId": "10000000-0000-4000-8000-000000000002",
          "externalId": "shipment-001"
        }
      },
      "committedAt": "2026-09-22T10:00:00Z",
      "payload": {
        "returnRequestId": "10000000-0000-4000-8000-000000000080",
        "offeredPieces": 1,
        "state": "requested"
      }
    }
  },
  {
    "id": "event-correction-transition",
    "schema": "events/envelope.v1.schema.json",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "eventId": "10000000-0000-4000-8000-000000000053",
      "eventType": "outcome.corrected",
      "eventKind": "transition",
      "tenantId": "17000000-0000-4000-8000-000000000018",
      "recipientIntegrationId": "17000000-0000-4000-8000-000000000024",
      "aggregate": {
        "type": "task",
        "id": "17000000-0000-4000-8000-000000000011",
        "recipientSequence": 7
      },
      "resources": {
        "taskId": "17000000-0000-4000-8000-000000000011",
        "attemptId": "17000000-0000-4000-8000-000000000012",
        "tripId": "17000000-0000-4000-8000-000000000003",
        "workdayId": "17000000-0000-4000-8000-000000000005",
        "dispatchCycleId": "17000000-0000-4000-8000-000000000023"
      },
      "versions": {
        "sourceRevision": 1,
        "resourceRevision": 2,
        "outcomeRevision": 2,
        "assignmentGeneration": 1,
        "routeRevision": 2,
        "deviceGeneration": 1,
        "snapshotRevision": 5
      },
      "correlation": {
        "actionId": "10000000-0000-4000-8000-000000000044",
        "sourceReference": {
          "tenantId": "17000000-0000-4000-8000-000000000018",
          "externalId": "shipment-0",
          "integrationId": "17000000-0000-4000-8000-000000000024"
        }
      },
      "committedAt": "2026-09-24T08:05:00.000Z",
      "payload": {
        "supersedesOutcomeId": "17000000-0000-4000-8000-000000000021",
        "outcomeId": "10000000-0000-4000-8000-000000000061"
      }
    }
  },
  {
    "id": "error-validation_failed",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:validation_failed",
      "title": "validation failed",
      "status": 400,
      "code": "validation_failed",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-idempotency_conflict",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:idempotency_conflict",
      "title": "idempotency conflict",
      "status": 409,
      "code": "idempotency_conflict",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-capacity_exceeded",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:capacity_exceeded",
      "title": "capacity exceeded",
      "status": 409,
      "code": "capacity_exceeded",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-invalid_pin",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:invalid_pin",
      "title": "invalid pin",
      "status": 422,
      "code": "invalid_pin",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-unauthorized",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:unauthorized",
      "title": "unauthorized",
      "status": 401,
      "code": "unauthorized",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-forbidden_resource",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:forbidden_resource",
      "title": "forbidden resource",
      "status": 403,
      "code": "forbidden_resource",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-departed_edit_forbidden",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:departed_edit_forbidden",
      "title": "departed edit forbidden",
      "status": 409,
      "code": "departed_edit_forbidden",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-stale_revision",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:stale_revision",
      "title": "stale revision",
      "status": 409,
      "code": "stale_revision",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-stale_device",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:stale_device",
      "title": "stale device",
      "status": 409,
      "code": "stale_device",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-unsupported_price_allocation",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:unsupported_price_allocation",
      "title": "unsupported price allocation",
      "status": 422,
      "code": "unsupported_price_allocation",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-dependency_missing",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:dependency_missing",
      "title": "dependency missing",
      "status": 409,
      "code": "dependency_missing",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": true
    }
  },
  {
    "id": "error-dependency_unavailable",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:dependency_unavailable",
      "title": "dependency unavailable",
      "status": 503,
      "code": "dependency_unavailable",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": true
    }
  },
  {
    "id": "error-unassigned_route",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:unassigned_route",
      "title": "unassigned route",
      "status": 422,
      "code": "unassigned_route",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-result_unknown",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:result_unknown",
      "title": "result unknown",
      "status": 503,
      "code": "result_unknown",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": true
    }
  },
  {
    "id": "error-unsupported_schema_version",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:unsupported_schema_version",
      "title": "unsupported schema version",
      "status": 422,
      "code": "unsupported_schema_version",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-replay_expired",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:replay_expired",
      "title": "replay expired",
      "status": 410,
      "code": "replay_expired",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "error-correction_dependency_conflict",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "urn:tawsel:problem:correction_dependency_conflict",
      "title": "correction dependency conflict",
      "status": 409,
      "code": "correction_dependency_conflict",
      "correlationId": "10000000-0000-4000-8000-000000000041",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "retryable": false
    }
  },
  {
    "id": "action-result-full",
    "schema": "action-result.v1.schema.json",
    "valid": true,
    "data": {
      "receipt": {
        "schemaVersion": "1.0.0",
        "receiptId": "10000000-0000-4000-8000-000000000070",
        "actionId": "10000000-0000-4000-8000-000000000040",
        "evidenceStatus": "received",
        "businessStatus": "accepted",
        "receivedAt": "2026-09-22T10:00:00Z",
        "committedAt": "2026-09-22T10:00:01Z",
        "resourceVersions": {
          "sourceRevision": 1,
          "resourceRevision": 1,
          "outcomeRevision": 1,
          "assignmentGeneration": 1,
          "routeRevision": 2,
          "deviceGeneration": 1,
          "snapshotRevision": 5
        }
      },
      "operationId": "outcome.recordPartial",
      "retention": "full",
      "summary": {
        "outcomeId": "10000000-0000-4000-8000-000000000080",
        "outcomeRevision": 1
      },
      "response": {
        "status": 200,
        "body": {
          "outcomeId": "10000000-0000-4000-8000-000000000080",
          "deliveredPieces": 2
        }
      }
    }
  },
  {
    "id": "action-result-compacted",
    "schema": "action-result.v1.schema.json",
    "valid": true,
    "data": {
      "receipt": {
        "schemaVersion": "1.0.0",
        "receiptId": "10000000-0000-4000-8000-000000000070",
        "actionId": "10000000-0000-4000-8000-000000000040",
        "evidenceStatus": "received",
        "businessStatus": "accepted",
        "receivedAt": "2026-09-22T10:00:00Z",
        "committedAt": "2026-09-22T10:00:01Z",
        "resourceVersions": {
          "sourceRevision": 1,
          "resourceRevision": 1,
          "outcomeRevision": 1,
          "assignmentGeneration": 1,
          "routeRevision": 2,
          "deviceGeneration": 1,
          "snapshotRevision": 5
        }
      },
      "operationId": "outcome.recordPartial",
      "retention": "compacted",
      "summary": {
        "outcomeId": "10000000-0000-4000-8000-000000000080",
        "outcomeRevision": 1
      }
    }
  },
  {
    "id": "access-effect",
    "schema": "common.schema.json#/$defs/CapabilityEffect",
    "valid": true,
    "data": "inherit"
  },
  {
    "id": "access-inherit",
    "schema": "common.schema.json#/$defs/CapabilityOverride",
    "valid": true,
    "data": {
      "capability": "planning.manage",
      "effect": "inherit"
    }
  },
  {
    "id": "access-allow",
    "schema": "common.schema.json#/$defs/CapabilityOverride",
    "valid": true,
    "data": {
      "capability": "planning.manage",
      "effect": "allow"
    }
  },
  {
    "id": "access-deny",
    "schema": "common.schema.json#/$defs/CapabilityOverride",
    "valid": true,
    "data": {
      "capability": "planning.manage",
      "effect": "deny"
    }
  },
  {
    "id": "access-company",
    "schema": "common.schema.json#/$defs/AccessContext",
    "valid": true,
    "data": {
      "tenantId": "60000000-0000-4000-8000-000000000001",
      "tenantKind": "company",
      "principalKind": "account",
      "sourceId": "60000000-0000-4000-8000-000000000020",
      "branchIds": [
        "60000000-0000-4000-8000-000000000010",
        "60000000-0000-4000-8000-000000000011"
      ],
      "driverId": null,
      "effectiveCapabilities": [
        "monitor.read",
        "reports.export"
      ]
    }
  },
  {
    "id": "access-personal",
    "schema": "common.schema.json#/$defs/AccessContext",
    "valid": true,
    "data": {
      "tenantId": "60000000-0000-4000-8000-000000000003",
      "tenantKind": "personal",
      "principalKind": "account",
      "sourceId": "60000000-0000-4000-8000-000000000024",
      "branchIds": [],
      "driverId": "60000000-0000-4000-8000-000000000043",
      "effectiveCapabilities": [
        "execution.own",
        "reports.read"
      ]
    }
  },
  {
    "id": "access-integration",
    "schema": "common.schema.json#/$defs/AccessContext",
    "valid": true,
    "data": {
      "tenantId": "60000000-0000-4000-8000-000000000001",
      "tenantKind": "company",
      "principalKind": "integration",
      "sourceId": "60000000-0000-4000-8000-000000000050",
      "branchIds": [
        "60000000-0000-4000-8000-000000000010"
      ],
      "driverId": null,
      "effectiveCapabilities": [
        "monitor.read",
        "reports.export"
      ]
    }
  },
  {
    "id": "access-lifecycle-problem",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "https://schemas.tawsel.invalid/problems/lifecycle-forbidden",
      "title": "Operation unavailable in the current state",
      "status": 409,
      "code": "lifecycle_forbidden",
      "correlationId": "60000000-0000-4000-8000-000000000099",
      "retryable": false
    }
  },
  {
    "id": "session-company-entry",
    "schema": "session.schema.json#/$defs/CompanyRequest",
    "valid": true,
    "data": {
      "code": "LOCAL"
    }
  },
  {
    "id": "session-login",
    "schema": "session.schema.json#/$defs/LoginRequest",
    "valid": true,
    "data": {
      "kind": "company",
      "companyCode": "LOCAL"
    }
  },
  {
    "id": "session-personal-register",
    "schema": "session.schema.json#/$defs/LoginRequest",
    "valid": true,
    "data": {
      "kind": "personal",
      "intent": "register",
      "phone": "+201000000000"
    }
  },
  {
    "id": "session-csrf",
    "schema": "session.schema.json#/$defs/BootstrapResponse",
    "valid": true,
    "data": {
      "csrfToken": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  },
  {
    "id": "session-kind",
    "schema": "session.schema.json#/$defs/KindRequest",
    "valid": true,
    "data": {
      "kind": "personal"
    }
  },
  {
    "id": "session-denied",
    "schema": "session.schema.json#/$defs/AuthError",
    "valid": true,
    "data": {
      "error": {
        "code": "access_disabled",
        "message": "الوصول غير متاح"
      }
    }
  },
  {
    "id": "p08-integration.bindSource",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/BindSourceCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "integration.bindSource",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "erp",
        "sourceRevision": 1,
        "companyCode": "COMPANY",
        "displayName": "شركة",
        "subjectIds": [
          "issuer-subject-1"
        ],
        "credentialId": "81000000-0000-4000-8000-000000000004",
        "secretHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "expiresAt": "2027-01-01T00:00:00Z"
      }
    }
  },
  {
    "id": "p08-integration.rotateCredential",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/RotateCredentialCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "integration.rotateCredential",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "erp",
        "sourceRevision": 1,
        "credentialId": "81000000-0000-4000-8000-000000000004",
        "secretHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "expiresAt": "2027-01-01T00:00:00Z",
        "overlapSeconds": 300,
        "recover": false
      }
    }
  },
  {
    "id": "p08-integration.disableSource",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/DisableSourceCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "integration.disableSource",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "erp",
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p08-branch.provision",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/BranchCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "branch.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "cairo",
        "sourceRevision": 1,
        "name": "القاهرة",
        "enabled": true,
        "location": null
      }
    }
  },
  {
    "id": "p08-branch.disable",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/DisableBranchCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "branch.disable",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "cairo",
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p08-role.defineCapabilities",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/RoleCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "role.defineCapabilities",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-role",
        "sourceRevision": 1,
        "name": "دور",
        "capabilities": [
          "execution.own",
          "monitor.read"
        ]
      }
    }
  },
  {
    "id": "p08-user.provision",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/UserCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.provision",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "subject": "issuer-subject-1",
        "roleExternalId": "driver-role",
        "branchExternalIds": [
          "cairo",
          "giza"
        ],
        "enabled": true
      }
    }
  },
  {
    "id": "p08-user.setRole",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/UserRoleCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.setRole",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "roleExternalId": "driver-role"
      }
    }
  },
  {
    "id": "p08-user.setCapabilityExceptions",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/UserExceptionsCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.setCapabilityExceptions",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "exceptions": [
          {
            "capability": "monitor.read",
            "effect": "deny"
          },
          {
            "capability": "reports.read",
            "effect": "allow"
          }
        ]
      }
    }
  },
  {
    "id": "p08-user.setBranchMemberships",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/UserBranchesCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.setBranchMemberships",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "branchExternalIds": [
          "cairo",
          "giza"
        ]
      }
    }
  },
  {
    "id": "p08-user.disable",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/DisableUserCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "user.disable",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p08-driver.provisionReference",
    "valid": true,
    "schema": "provisioning.schema.json#/$defs/DriverCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "81000000-0000-4000-8000-000000000003",
      "operationId": "driver.provisionReference",
      "context": {
        "kind": "integration",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "driver-1",
        "sourceRevision": 1,
        "userExternalId": "driver-1",
        "enabled": true,
        "vehicleReference": "vehicle-01",
        "profile": "car"
      }
    }
  },
  {
    "id": "p08-status-retry",
    "schema": "provisioning.schema.json#/$defs/ProvisioningStatus",
    "valid": true,
    "data": {
      "entity": "user",
      "externalId": "driver-1",
      "resourceId": "81000000-0000-4000-8000-000000000005",
      "sourceRevision": 1,
      "lastActionId": "81000000-0000-4000-8000-000000000003",
      "issuerStatus": "retry",
      "attempts": 1,
      "nextAttemptAt": "2026-09-22T20:00:00Z",
      "lastError": "issuer_unavailable",
      "enabled": true
    }
  },
  {
    "id": "p08-provisioning.changed",
    "schema": "provisioning.schema.json#/$defs/ProvisioningChanged",
    "valid": true,
    "data": {
      "entity": "user",
      "externalId": "driver-1",
      "resourceId": "81000000-0000-4000-8000-000000000005",
      "sourceRevision": 1,
      "actionId": "81000000-0000-4000-8000-000000000003",
      "service": {
        "mode": "service-operation",
        "tenantId": "81000000-0000-4000-8000-000000000001",
        "integrationId": "81000000-0000-4000-8000-000000000002",
        "actorId": null
      }
    }
  },
  {
    "id": "p09-create-address-task",
    "valid": true,
    "schema": "b2c-intake.schema.json#/$defs/CreateIndependentCommand",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "90000000-0000-4000-8000-000000000001",
      "operationId": "task.createIndependent",
      "context": {
        "kind": "device",
        "tenantId": "90000000-0000-4000-8000-000000000002",
        "accountId": "90000000-0000-4000-8000-000000000003",
        "deviceId": "90000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "recipientName": "منى أحمد",
        "recipientPhone": "01012345678",
        "destination": {
          "kind": "address",
          "addressText": "١٢ شارع التحرير، الدقي"
        }
      }
    }
  },
  {
    "id": "p09-confirmed-pin-task",
    "valid": true,
    "schema": "b2c-intake.schema.json#/$defs/IndependentTask",
    "data": {
      "taskId": "90000000-0000-4000-8000-000000000005",
      "revision": 1,
      "recipientName": "عمر علي",
      "recipientPhone": "+201112345678",
      "destination": {
        "kind": "confirmed-pin",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "collectionAmount": {
        "amountMinor": 12550,
        "currency": "EGP",
        "exponent": 2
      },
      "locationReadiness": "confirmed",
      "executionReady": true,
      "editable": true,
      "createdAt": "2026-09-22T20:00:00Z",
      "updatedAt": "2026-09-22T20:00:00Z"
    }
  },
  {
    "id": "p10-SourceSnapshot",
    "schema": "b2b-intake.schema.json#/$defs/SourceSnapshotCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "operationId": "intake.submitSnapshot",
      "context": {
        "kind": "integration",
        "tenantId": "10000000-0000-4000-8000-000000000002",
        "integrationId": "10000000-0000-4000-8000-000000000003"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "shipment-100",
        "sourceDispatchCycleId": "dispatch-100-1",
        "sourceRevision": 1,
        "expectedSourceRevision": 0,
        "sourceBranchExternalId": "cairo",
        "recipientName": "أحمد",
        "recipientPhone": "01012345678",
        "destination": {
          "kind": "confirmed-pin",
          "addressText": "القاهرة",
          "coordinates": {
            "latitude": 30.0444,
            "longitude": 31.2357
          }
        },
        "splittingAllowed": true,
        "allocation": "exact-outstanding-per-unit",
        "lines": [
          {
            "sourceLineId": "order-line-7",
            "description": "قطعة",
            "quantity": 3,
            "unitDue": {
              "amountMinor": 10000,
              "currency": "EGP",
              "exponent": 2
            }
          }
        ],
        "shippingDue": {
          "amountMinor": 5000,
          "currency": "EGP",
          "exponent": 2
        },
        "totalDue": {
          "amountMinor": 35000,
          "currency": "EGP",
          "exponent": 2
        },
        "priority": "ordinary"
      }
    }
  },
  {
    "id": "p10-Prepare",
    "schema": "b2b-intake.schema.json#/$defs/PrepareCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "operationId": "intake.prepare",
      "context": {
        "kind": "integration",
        "tenantId": "10000000-0000-4000-8000-000000000002",
        "integrationId": "10000000-0000-4000-8000-000000000003"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverExternalId": "driver-1",
        "items": [
          {
            "externalId": "shipment-100",
            "sourceDispatchCycleId": "dispatch-100-1",
            "expectedSourceRevision": 1,
            "expectedAssignmentRevision": 0,
            "assignmentRevision": 1
          }
        ]
      }
    }
  },
  {
    "id": "p10-ReceiveBatch",
    "schema": "b2b-intake.schema.json#/$defs/ReceiveBatchCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "operationId": "assignment.receiveBatch",
      "context": {
        "kind": "integration",
        "tenantId": "10000000-0000-4000-8000-000000000002",
        "integrationId": "10000000-0000-4000-8000-000000000003"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverExternalId": "driver-1",
        "receiptAsserted": true,
        "items": [
          {
            "externalId": "shipment-100",
            "sourceDispatchCycleId": "dispatch-100-1",
            "expectedSourceRevision": 1,
            "expectedAssignmentRevision": 1,
            "assignmentRevision": 2
          }
        ]
      }
    }
  },
  {
    "id": "p10-Withdraw",
    "schema": "b2b-intake.schema.json#/$defs/WithdrawCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "operationId": "assignment.withdraw",
      "context": {
        "kind": "integration",
        "tenantId": "10000000-0000-4000-8000-000000000002",
        "integrationId": "10000000-0000-4000-8000-000000000003"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "shipment-100",
        "sourceDispatchCycleId": "dispatch-100-1",
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 2,
        "assignmentRevision": 3
      }
    }
  },
  {
    "id": "p10-Reassign",
    "schema": "b2b-intake.schema.json#/$defs/ReassignCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "operationId": "assignment.reassignBeforeDeparture",
      "context": {
        "kind": "integration",
        "tenantId": "10000000-0000-4000-8000-000000000002",
        "integrationId": "10000000-0000-4000-8000-000000000003"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "shipment-100",
        "sourceDispatchCycleId": "dispatch-100-1",
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 2,
        "assignmentRevision": 3,
        "driverExternalId": "driver-2",
        "receiptAsserted": true
      }
    }
  },
  {
    "id": "p10-Urgency",
    "schema": "b2b-intake.schema.json#/$defs/UrgencyCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "operationId": "intake.setUrgencyBeforeDeparture",
      "context": {
        "kind": "integration",
        "tenantId": "10000000-0000-4000-8000-000000000002",
        "integrationId": "10000000-0000-4000-8000-000000000003"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "externalId": "shipment-100",
        "sourceDispatchCycleId": "dispatch-100-1",
        "expectedSourceRevision": 1,
        "sourceRevision": 2,
        "priority": "urgent"
      }
    }
  },
  {
    "id": "p10-explicit-prepaid",
    "schema": "b2b-intake.schema.json#/$defs/SourceSnapshot",
    "valid": true,
    "data": {
      "externalId": "shipment-100",
      "sourceDispatchCycleId": "dispatch-100-1",
      "sourceRevision": 1,
      "expectedSourceRevision": 0,
      "sourceBranchExternalId": "cairo",
      "recipientName": "أحمد",
      "recipientPhone": "01012345678",
      "destination": {
        "kind": "confirmed-pin",
        "addressText": "القاهرة",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "splittingAllowed": true,
      "allocation": "exact-outstanding-per-unit",
      "lines": [
        {
          "sourceLineId": "order-line-7",
          "description": "قطعة",
          "quantity": 3,
          "unitDue": {
            "amountMinor": 0,
            "currency": "EGP",
            "exponent": 2
          }
        }
      ],
      "shippingDue": {
        "amountMinor": 0,
        "currency": "EGP",
        "exponent": 2
      },
      "totalDue": {
        "amountMinor": 0,
        "currency": "EGP",
        "exponent": 2
      },
      "priority": "ordinary"
    }
  },
  {
    "id": "p10-exact-partial-prepaid",
    "schema": "b2b-intake.schema.json#/$defs/SourceSnapshot",
    "valid": true,
    "data": {
      "externalId": "shipment-100",
      "sourceDispatchCycleId": "dispatch-100-1",
      "sourceRevision": 1,
      "expectedSourceRevision": 0,
      "sourceBranchExternalId": "cairo",
      "recipientName": "أحمد",
      "recipientPhone": "01012345678",
      "destination": {
        "kind": "confirmed-pin",
        "addressText": "القاهرة",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "splittingAllowed": true,
      "allocation": "exact-outstanding-per-unit",
      "lines": [
        {
          "sourceLineId": "order-line-7",
          "description": "قطعة",
          "quantity": 3,
          "unitDue": {
            "amountMinor": 5000,
            "currency": "EGP",
            "exponent": 2
          }
        }
      ],
      "shippingDue": {
        "amountMinor": 2000,
        "currency": "EGP",
        "exponent": 2
      },
      "totalDue": {
        "amountMinor": 17000,
        "currency": "EGP",
        "exponent": 2
      },
      "priority": "ordinary"
    }
  },
  {
    "id": "p10-error-capacity_exceeded",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "https://schemas.tawsel.invalid/problems/capacity-exceeded",
      "title": "Source command rejected",
      "status": 409,
      "code": "capacity_exceeded",
      "detail": "49 remaining stops + incoming batch of 2: entire batch rejected; both source tasks remain unassigned.",
      "correlationId": "10000000-0000-4000-8000-000000000004",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "retryable": false
    }
  },
  {
    "id": "p10-error-unsupported_price_allocation",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "https://schemas.tawsel.invalid/problems/unsupported-price-allocation",
      "title": "Source command rejected",
      "status": 422,
      "code": "unsupported_price_allocation",
      "detail": "Supply exact outstanding unitDue, shippingDue and matching totalDue; no aggregate deposit allocation is inferred.",
      "correlationId": "10000000-0000-4000-8000-000000000004",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "retryable": false
    }
  },
  {
    "id": "p10-error-stale_revision",
    "schema": "common.schema.json#/$defs/Problem",
    "valid": true,
    "data": {
      "type": "https://schemas.tawsel.invalid/problems/stale-revision",
      "title": "Source command rejected",
      "status": 409,
      "code": "stale_revision",
      "detail": "expectedAssignmentRevision must match the accepted assignment.",
      "correlationId": "10000000-0000-4000-8000-000000000004",
      "actionId": "10000000-0000-4000-8000-000000000001",
      "retryable": false
    }
  },
  {
    "id": "p10-received-event-intent",
    "schema": "b2b-intake.schema.json#/$defs/ChangedEvent",
    "valid": true,
    "data": {
      "actionId": "10000000-0000-4000-8000-000000000001",
      "task": {
        "taskId": "10000000-0000-4000-8000-000000000005",
        "dispatchCycleId": "10000000-0000-4000-8000-000000000006",
        "externalId": "shipment-100",
        "sourceDispatchCycleId": "dispatch-100-1",
        "sourceRevision": 1,
        "assignmentRevision": 2,
        "state": "held",
        "driverId": "10000000-0000-4000-8000-000000000007",
        "driverExternalId": "driver-1",
        "receivedAt": "2026-09-22T10:00:00Z",
        "editable": true,
        "planningEligible": true,
        "planningStatus": "pending",
        "locationReadiness": "confirmed",
        "snapshot": {
          "externalId": "shipment-100",
          "sourceDispatchCycleId": "dispatch-100-1",
          "sourceRevision": 1,
          "expectedSourceRevision": 0,
          "sourceBranchExternalId": "cairo",
          "recipientName": "أحمد",
          "recipientPhone": "01012345678",
          "destination": {
            "kind": "confirmed-pin",
            "addressText": "القاهرة",
            "coordinates": {
              "latitude": 30.0444,
              "longitude": 31.2357
            }
          },
          "splittingAllowed": true,
          "allocation": "exact-outstanding-per-unit",
          "lines": [
            {
              "sourceLineId": "order-line-7",
              "description": "قطعة",
              "quantity": 3,
              "unitDue": {
                "amountMinor": 10000,
                "currency": "EGP",
                "exponent": 2
              }
            }
          ],
          "shippingDue": {
            "amountMinor": 5000,
            "currency": "EGP",
            "exponent": 2
          },
          "totalDue": {
            "amountMinor": 35000,
            "currency": "EGP",
            "exponent": 2
          },
          "priority": "ordinary"
        }
      }
    }
  },
  {
    "id": "location-valid-confirmation",
    "schema": "location.schema.json#/$defs/Confirm",
    "valid": true,
    "data": {
      "taskId": "60000000-0000-4000-8000-000000000060",
      "expectedSourceRevision": 1,
      "expectedLocationRevision": 0,
      "confirmed": true,
      "selection": {
        "kind": "manual",
        "coordinates": {
          "latitude": 30.04,
          "longitude": 31.23
        }
      }
    }
  },
  {
    "id": "routing-bicycle-input",
    "schema": "routing.schema.json#/$defs/OptimizationInput",
    "valid": true,
    "data": {
      "mode": "bicycle",
      "accountKind": "personal",
      "origin": {
        "kind": "manual-pin",
        "coordinates": {
          "latitude": 30.0444,
          "longitude": 31.2357
        }
      },
      "endpoint": {
        "kind": "last-customer"
      },
      "tasks": [
        {
          "taskId": "task-a",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          }
        }
      ]
    }
  },
  {
    "id": "routing-unreachable-table",
    "schema": "routing.schema.json#/$defs/TableResult",
    "valid": true,
    "data": {
      "mode": "bicycle",
      "status": "partial",
      "cells": [
        [
          {
            "status": "reachable",
            "durationSeconds": 0,
            "distanceMetres": 0
          },
          {
            "status": "unreachable"
          }
        ],
        [
          {
            "status": "unreachable"
          },
          {
            "status": "reachable",
            "durationSeconds": 0,
            "distanceMetres": 0
          }
        ]
      ]
    }
  },
  {
    "id": "routing-profile-metadata",
    "schema": "routing.schema.json#/$defs/Profiles",
    "valid": true,
    "data": {
      "modes": [
        "car",
        "motorcycle",
        "bicycle"
      ],
      "defaultCustomerServiceSeconds": 600,
      "liveVerification": "not-checked"
    }
  },
  {
    "id": "p13-settings",
    "schema": "planning.schema.json#/$defs/Settings",
    "valid": true,
    "data": {
      "mode": "car",
      "origin": {
        "kind": "manual-pin",
        "coordinates": {
          "latitude": 30.04,
          "longitude": 31.23
        }
      },
      "endpoint": {
        "kind": "last-customer"
      },
      "plannedStartAt": "2026-09-23T10:00:00.000Z"
    }
  },
  {
    "id": "p13-input",
    "schema": "planning.schema.json#/$defs/Input",
    "valid": true,
    "data": {
      "version": 1,
      "tenantId": "13000000-0000-4000-8000-000000000001",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "accountKind": "personal",
      "inputRevision": 3,
      "settingsRevision": 1,
      "executionRevision": 0,
      "manualRevision": 0,
      "currentTarget": null,
      "locationInputRevision": 1,
      "settings": {
        "mode": "car",
        "origin": {
          "kind": "manual-pin",
          "coordinates": {
            "latitude": 30.04,
            "longitude": 31.23
          }
        },
        "endpoint": {
          "kind": "last-customer"
        },
        "plannedStartAt": "2026-09-23T10:00:00.000Z"
      },
      "members": [
        {
          "taskId": "13000000-0000-4000-8000-000000000003",
          "attemptId": "13000000-0000-4000-8000-000000000004",
          "dispatchCycleId": null,
          "branchId": null,
          "integrationId": null,
          "sourceRevision": 1,
          "assignmentRevision": 0,
          "pinRevision": 1,
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "priority": "ordinary",
          "earliestAt": null,
          "departureAt": null,
          "reservationState": null,
          "eligible": true,
          "exclusionReason": null,
          "serviceEstimateSeconds": 600
        }
      ]
    }
  },
  {
    "id": "p13-pending",
    "schema": "planning.schema.json#/$defs/Job",
    "valid": true,
    "data": {
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "status": "pending",
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "settingsRevision": 1,
      "blockedReason": null,
      "attempts": 0,
      "leaseExpiresAt": null,
      "nextAttemptAt": "2026-09-23T10:00:00.000Z",
      "error": null,
      "planId": null,
      "supersededByJobId": null,
      "createdAt": "2026-09-23T10:00:00.000Z",
      "finishedAt": null
    }
  },
  {
    "id": "p13-partial",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": true,
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "draft",
      "current": true,
      "inputCurrent": true,
      "policyValidated": false,
      "candidate": {
        "mode": "car",
        "status": "partial",
        "policyValidated": false,
        "visits": [],
        "unassignedTaskIds": [
          "13000000-0000-4000-8000-000000000003"
        ],
        "travelDurationSeconds": 0,
        "distanceMetres": 0,
        "customerServiceEstimateSeconds": 0,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 0,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "ordinary",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": null,
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "unassigned",
            "exclusionReason": null,
            "position": null,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z"
    }
  },
  {
    "id": "p13-save-draft",
    "schema": "planning.schema.json#/$defs/SaveDraftCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "13000000-0000-4000-8000-000000000009",
      "operationId": "planning.saveDraft",
      "context": {
        "kind": "device",
        "tenantId": "90000000-0000-4000-8000-000000000002",
        "accountId": "90000000-0000-4000-8000-000000000003",
        "deviceId": "90000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverId": "13000000-0000-4000-8000-000000000002",
        "expectedSettingsRevision": 0,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        }
      }
    }
  },
  {
    "id": "p13-request",
    "schema": "planning.schema.json#/$defs/RequestReplanCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "13000000-0000-4000-8000-000000000009",
      "operationId": "planning.requestReplan",
      "context": {
        "kind": "device",
        "tenantId": "90000000-0000-4000-8000-000000000002",
        "accountId": "90000000-0000-4000-8000-000000000003",
        "deviceId": "90000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverId": "13000000-0000-4000-8000-000000000002",
        "expectedSettingsRevision": 1
      }
    }
  },
  {
    "id": "p13-publication-event",
    "schema": "planning.schema.json#/$defs/PublishedEvent",
    "valid": true,
    "data": {
      "jobId": "13000000-0000-4000-8000-000000000005",
      "planId": "13000000-0000-4000-8000-000000000008",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "forecastId": "13000000-0000-4000-8000-000000000006",
      "workloadId": "13000000-0000-4000-8000-000000000007",
      "state": "draft",
      "status": "partial",
      "policyValidated": false
    }
  },
  {
    "id": "p14-partial-urgent",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": true,
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "partial",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": {
        "mode": "car",
        "status": "partial",
        "policyValidated": false,
        "visits": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "arrivalOffsetSeconds": 10,
            "travelDurationSeconds": 10,
            "distanceMetres": 100,
            "serviceEstimateSeconds": 600,
            "waitingSeconds": 0
          }
        ],
        "unassignedTaskIds": [
          "13000000-0000-4000-8000-000000000003"
        ],
        "travelDurationSeconds": 10,
        "distanceMetres": 100,
        "customerServiceEstimateSeconds": 600,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 610,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "urgent",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          },
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "ordinary",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": null,
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "unassigned",
            "exclusionReason": null,
            "position": null,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          },
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "assigned",
            "exclusionReason": null,
            "position": 1,
            "expectedArrivalAt": "2026-09-23T10:00:10.000Z",
            "expectedCompletionAt": "2026-09-23T10:10:10.000Z"
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "grouped-heuristic",
        "orderedTaskIds": [
          "14000000-0000-4000-8000-000000000001"
        ],
        "exceptions": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "reason": "unassigned-urgent"
          }
        ]
      }
    }
  },
  {
    "id": "p14-ready",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": true,
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "ready",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": {
        "mode": "car",
        "status": "complete",
        "policyValidated": false,
        "visits": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "arrivalOffsetSeconds": 10,
            "travelDurationSeconds": 10,
            "distanceMetres": 100,
            "serviceEstimateSeconds": 600,
            "waitingSeconds": 0
          }
        ],
        "unassignedTaskIds": [],
        "travelDurationSeconds": 10,
        "distanceMetres": 100,
        "customerServiceEstimateSeconds": 600,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 610,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "ordinary",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": "2026-09-23T10:10:10.000Z",
        "members": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "assigned",
            "exclusionReason": null,
            "position": 1,
            "expectedArrivalAt": "2026-09-23T10:00:10.000Z",
            "expectedCompletionAt": "2026-09-23T10:10:10.000Z"
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "grouped-heuristic",
        "orderedTaskIds": [
          "14000000-0000-4000-8000-000000000001"
        ],
        "exceptions": []
      }
    }
  },
  {
    "id": "p14-manual",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": true,
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": null,
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "manual",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": null,
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 1,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "urgent",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          },
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "ordinary",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": null,
        "members": [
          {
            "taskId": "13000000-0000-4000-8000-000000000003",
            "attemptId": "13000000-0000-4000-8000-000000000004",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "manual",
            "exclusionReason": null,
            "position": 1,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          },
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "manual",
            "exclusionReason": null,
            "position": 2,
            "expectedArrivalAt": null,
            "expectedCompletionAt": null
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "manual",
        "orderedTaskIds": [
          "13000000-0000-4000-8000-000000000003",
          "14000000-0000-4000-8000-000000000001"
        ],
        "exceptions": []
      }
    }
  },
  {
    "id": "p14-manual-order",
    "schema": "planning.schema.json#/$defs/ManualOrderCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "13000000-0000-4000-8000-000000000009",
      "operationId": "planning.setManualOrder",
      "context": {
        "kind": "device",
        "tenantId": "90000000-0000-4000-8000-000000000002",
        "accountId": "90000000-0000-4000-8000-000000000003",
        "deviceId": "90000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverId": "13000000-0000-4000-8000-000000000002",
        "expectedSettingsRevision": 1,
        "expectedInputRevision": 3,
        "expectedManualRevision": 0,
        "selection": {
          "kind": "order",
          "taskIds": [
            "13000000-0000-4000-8000-000000000003",
            "14000000-0000-4000-8000-000000000001"
          ]
        }
      }
    }
  },
  {
    "id": "p14-manual-first",
    "schema": "planning.schema.json#/$defs/ManualOrderCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "13000000-0000-4000-8000-000000000009",
      "operationId": "planning.setManualOrder",
      "context": {
        "kind": "device",
        "tenantId": "90000000-0000-4000-8000-000000000002",
        "accountId": "90000000-0000-4000-8000-000000000003",
        "deviceId": "90000000-0000-4000-8000-000000000004",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverId": "13000000-0000-4000-8000-000000000002",
        "expectedSettingsRevision": 1,
        "expectedInputRevision": 3,
        "expectedManualRevision": 0,
        "selection": {
          "kind": "select-first",
          "taskId": "13000000-0000-4000-8000-000000000003"
        }
      }
    }
  },
  {
    "id": "p15-readiness",
    "schema": "round-start.schema.json#/$defs/Readiness",
    "valid": true,
    "data": {
      "readinessId": "15000000-0000-4000-8000-000000000001",
      "driverId": "15000000-0000-4000-8000-000000000002",
      "deviceId": "15000000-0000-4000-8000-000000000003",
      "planId": "15000000-0000-4000-8000-000000000004",
      "planRevision": 1,
      "inputFingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "verifiedActionIds": [],
      "issuedAt": "2026-09-23T10:00:00.000Z",
      "expiresAt": "2026-09-23T10:01:00.000Z"
    }
  },
  {
    "id": "p15-start",
    "schema": "round-start.schema.json#/$defs/StartCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "round.start",
      "actionId": "15000000-0000-4000-8000-000000000010",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "driverId": "15000000-0000-4000-8000-000000000002",
        "readinessId": "15000000-0000-4000-8000-000000000001",
        "planId": "15000000-0000-4000-8000-000000000004",
        "expectedPlanRevision": 1
      }
    }
  },
  {
    "id": "p15-current",
    "schema": "round-start.schema.json#/$defs/Current",
    "valid": true,
    "data": {
      "workday": {
        "workdayId": "15000000-0000-4000-8000-000000000005",
        "driverId": "15000000-0000-4000-8000-000000000002",
        "state": "open",
        "openedAt": "2026-09-23T10:00:00.000Z"
      },
      "round": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "workdayId": "15000000-0000-4000-8000-000000000005",
        "driverId": "15000000-0000-4000-8000-000000000002",
        "state": "active",
        "startedAt": "2026-09-23T10:00:00.000Z",
        "owner": {
          "accountId": "15000000-0000-4000-8000-000000000007",
          "deviceId": "15000000-0000-4000-8000-000000000003",
          "generation": 1
        },
        "firstPlanId": "15000000-0000-4000-8000-000000000004",
        "firstForecastId": "15000000-0000-4000-8000-000000000008",
        "firstWorkloadId": "15000000-0000-4000-8000-000000000009",
        "currentActivity": null
      }
    }
  },
  {
    "id": "p15-start-result",
    "schema": "round-start.schema.json#/$defs/StartResult",
    "valid": true,
    "data": {
      "disposition": "started",
      "workday": {
        "workdayId": "15000000-0000-4000-8000-000000000005",
        "driverId": "15000000-0000-4000-8000-000000000002",
        "state": "open",
        "openedAt": "2026-09-23T10:00:00.000Z"
      },
      "round": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "workdayId": "15000000-0000-4000-8000-000000000005",
        "driverId": "15000000-0000-4000-8000-000000000002",
        "state": "active",
        "startedAt": "2026-09-23T10:00:00.000Z",
        "owner": {
          "accountId": "15000000-0000-4000-8000-000000000007",
          "deviceId": "15000000-0000-4000-8000-000000000003",
          "generation": 1
        },
        "firstPlanId": "15000000-0000-4000-8000-000000000004",
        "firstForecastId": "15000000-0000-4000-8000-000000000008",
        "firstWorkloadId": "15000000-0000-4000-8000-000000000009",
        "currentActivity": null
      }
    }
  },
  {
    "id": "p15-action-accepted",
    "schema": "round-start.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "15000000-0000-4000-8000-000000000010",
      "status": "accepted",
      "result": {
        "receipt": {
          "schemaVersion": "1.0.0",
          "receiptId": "15000000-0000-4000-8000-000000000012",
          "actionId": "15000000-0000-4000-8000-000000000010",
          "evidenceStatus": "received",
          "businessStatus": "accepted",
          "receivedAt": "2026-09-23T10:00:00.000Z",
          "committedAt": "2026-09-23T10:00:00.000Z",
          "resourceVersions": {
            "deviceGeneration": 1
          }
        },
        "operationId": "round.start",
        "retention": "full",
        "summary": {
          "driverId": "15000000-0000-4000-8000-000000000002",
          "roundId": "15000000-0000-4000-8000-000000000006",
          "workdayId": "15000000-0000-4000-8000-000000000005"
        },
        "response": {
          "status": 200,
          "body": {
            "disposition": "started",
            "workday": {
              "workdayId": "15000000-0000-4000-8000-000000000005",
              "driverId": "15000000-0000-4000-8000-000000000002",
              "state": "open",
              "openedAt": "2026-09-23T10:00:00.000Z"
            },
            "round": {
              "roundId": "15000000-0000-4000-8000-000000000006",
              "workdayId": "15000000-0000-4000-8000-000000000005",
              "driverId": "15000000-0000-4000-8000-000000000002",
              "state": "active",
              "startedAt": "2026-09-23T10:00:00.000Z",
              "owner": {
                "accountId": "15000000-0000-4000-8000-000000000007",
                "deviceId": "15000000-0000-4000-8000-000000000003",
                "generation": 1
              },
              "firstPlanId": "15000000-0000-4000-8000-000000000004",
              "firstForecastId": "15000000-0000-4000-8000-000000000008",
              "firstWorkloadId": "15000000-0000-4000-8000-000000000009",
              "currentActivity": null
            }
          }
        }
      }
    }
  },
  {
    "id": "p15-action-pending",
    "schema": "round-start.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "15000000-0000-4000-8000-000000000013",
      "status": "pending"
    }
  },
  {
    "id": "p15-action-rejected",
    "schema": "round-start.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "15000000-0000-4000-8000-000000000010",
      "status": "rejected",
      "result": {
        "receipt": {
          "schemaVersion": "1.0.0",
          "receiptId": "15000000-0000-4000-8000-000000000012",
          "actionId": "15000000-0000-4000-8000-000000000010",
          "evidenceStatus": "received",
          "businessStatus": "rejected",
          "receivedAt": "2026-09-23T10:00:00.000Z",
          "problem": {
            "type": "https://schemas.tawsel.invalid/problems/sync-required",
            "title": "Round start rejected",
            "code": "sync_required",
            "status": 409,
            "detail": "Refresh server readiness before starting.",
            "actionId": "15000000-0000-4000-8000-000000000010",
            "correlationId": "15000000-0000-4000-8000-000000000014",
            "retryable": false
          }
        },
        "operationId": "round.start",
        "retention": "full",
        "summary": {
          "driverId": "15000000-0000-4000-8000-000000000002",
          "code": "sync_required"
        },
        "response": {
          "status": 409,
          "body": {
            "type": "https://schemas.tawsel.invalid/problems/sync-required",
            "title": "Round start rejected",
            "code": "sync_required",
            "status": 409,
            "detail": "Refresh server readiness before starting.",
            "actionId": "15000000-0000-4000-8000-000000000010",
            "correlationId": "15000000-0000-4000-8000-000000000014",
            "retryable": false
          }
        }
      }
    }
  },
  {
    "id": "current-heading",
    "schema": "current-activity.schema.json#/$defs/Activity",
    "valid": true,
    "data": {
      "taskId": "16000000-0000-4000-8000-000000000002",
      "attemptId": "16000000-0000-4000-8000-000000000003",
      "revision": 1,
      "stage": "heading",
      "heading": {
        "actionId": "16000000-0000-4000-8000-000000000001",
        "recordedAt": "2026-09-23T20:00:00Z",
        "observation": {
          "observedAt": null,
          "clock": {
            "quality": "unknown"
          }
        }
      },
      "arrival": null
    }
  },
  {
    "id": "current-arrived",
    "schema": "current-activity.schema.json#/$defs/Activity",
    "valid": true,
    "data": {
      "taskId": "16000000-0000-4000-8000-000000000002",
      "attemptId": "16000000-0000-4000-8000-000000000003",
      "revision": 2,
      "stage": "arrived",
      "heading": {
        "actionId": "16000000-0000-4000-8000-000000000001",
        "recordedAt": "2026-09-23T20:00:00Z",
        "observation": {
          "observedAt": null,
          "clock": {
            "quality": "unknown"
          }
        }
      },
      "arrival": {
        "actionId": "16000000-0000-4000-8000-000000000004",
        "recordedAt": "2026-09-23T20:00:00Z",
        "observation": {
          "observedAt": null,
          "clock": {
            "quality": "unknown"
          }
        }
      }
    }
  },
  {
    "id": "current-manual-origin",
    "schema": "current-activity.schema.json#/$defs/PhysicalOrigin",
    "valid": true,
    "data": {
      "kind": "manual-pin",
      "coordinates": {
        "latitude": 30.04,
        "longitude": 31.23
      },
      "revision": 1,
      "roundId": "16000000-0000-4000-8000-000000000005",
      "taskId": null,
      "attemptId": null,
      "time": {
        "actionId": "16000000-0000-4000-8000-000000000001",
        "recordedAt": "2026-09-23T20:00:00Z",
        "observation": {
          "observedAt": null,
          "clock": {
            "quality": "unknown"
          }
        }
      }
    }
  },
  {
    "id": "p16-select-heading",
    "schema": "current-activity.schema.json#/$defs/SelectHeadingCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "current.selectHeading",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0
      }
    }
  },
  {
    "id": "p16-arrival",
    "schema": "current-activity.schema.json#/$defs/ArrivalCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "current.recordArrival",
      "actionId": "16000000-0000-4000-8000-000000000004",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": "16000000-0000-4000-8000-000000000003",
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0
      }
    }
  },
  {
    "id": "p16-correct-origin",
    "schema": "current-activity.schema.json#/$defs/CorrectOriginCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "current.correctOrigin",
      "actionId": "16000000-0000-4000-8000-000000000006",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "expectedOriginRevision": 0,
        "coordinates": {
          "latitude": 30.04,
          "longitude": 31.23
        }
      }
    }
  },
  {
    "id": "p16-heading-action-accepted",
    "schema": "current-activity.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "16000000-0000-4000-8000-000000000001",
      "status": "accepted",
      "result": {
        "receipt": {
          "schemaVersion": "1.0.0",
          "receiptId": "15000000-0000-4000-8000-000000000012",
          "actionId": "16000000-0000-4000-8000-000000000001",
          "evidenceStatus": "received",
          "businessStatus": "accepted",
          "receivedAt": "2026-09-23T10:00:00.000Z",
          "committedAt": "2026-09-23T10:00:00.000Z",
          "resourceVersions": {
            "deviceGeneration": 1,
            "resourceRevision": 1
          }
        },
        "operationId": "current.selectHeading",
        "retention": "full",
        "summary": {
          "roundId": "15000000-0000-4000-8000-000000000006",
          "driverId": "15000000-0000-4000-8000-000000000002",
          "taskId": "16000000-0000-4000-8000-000000000002",
          "activityRevision": 1
        },
        "response": {
          "status": 200,
          "body": {
            "roundId": "15000000-0000-4000-8000-000000000006",
            "revision": 1,
            "currentActivity": {
              "taskId": "16000000-0000-4000-8000-000000000002",
              "attemptId": "16000000-0000-4000-8000-000000000003",
              "revision": 1,
              "stage": "heading",
              "heading": {
                "actionId": "16000000-0000-4000-8000-000000000001",
                "recordedAt": "2026-09-23T20:00:00Z",
                "observation": {
                  "observedAt": null,
                  "clock": {
                    "quality": "unknown"
                  }
                }
              },
              "arrival": null
            },
            "physicalOrigin": null
          }
        }
      }
    }
  },
  {
    "id": "p16-action-pending",
    "schema": "current-activity.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "16000000-0000-4000-8000-000000000004",
      "status": "pending"
    }
  },
  {
    "id": "p16-arrival-action-accepted",
    "schema": "current-activity.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "16000000-0000-4000-8000-000000000004",
      "status": "accepted",
      "result": {
        "receipt": {
          "schemaVersion": "1.0.0",
          "receiptId": "15000000-0000-4000-8000-000000000012",
          "actionId": "16000000-0000-4000-8000-000000000004",
          "evidenceStatus": "received",
          "businessStatus": "accepted",
          "receivedAt": "2026-09-23T10:00:00.000Z",
          "committedAt": "2026-09-23T10:00:00.000Z",
          "resourceVersions": {
            "resourceRevision": 2,
            "deviceGeneration": 1
          }
        },
        "operationId": "current.recordArrival",
        "retention": "full",
        "summary": {
          "roundId": "15000000-0000-4000-8000-000000000006",
          "driverId": "15000000-0000-4000-8000-000000000002",
          "taskId": "16000000-0000-4000-8000-000000000002",
          "activityRevision": 2
        },
        "response": {
          "status": 200,
          "body": {
            "roundId": "15000000-0000-4000-8000-000000000006",
            "revision": 2,
            "currentActivity": {
              "taskId": "16000000-0000-4000-8000-000000000002",
              "attemptId": "16000000-0000-4000-8000-000000000003",
              "revision": 2,
              "stage": "arrived",
              "heading": {
                "actionId": "16000000-0000-4000-8000-000000000001",
                "recordedAt": "2026-09-23T20:00:00Z",
                "observation": {
                  "observedAt": null,
                  "clock": {
                    "quality": "unknown"
                  }
                }
              },
              "arrival": {
                "actionId": "16000000-0000-4000-8000-000000000004",
                "recordedAt": "2026-09-23T20:00:00Z",
                "observation": {
                  "observedAt": null,
                  "clock": {
                    "quality": "unknown"
                  }
                }
              }
            },
            "physicalOrigin": {
              "kind": "last-confirmed-stop",
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              },
              "revision": 1,
              "roundId": "15000000-0000-4000-8000-000000000006",
              "taskId": "16000000-0000-4000-8000-000000000002",
              "attemptId": "16000000-0000-4000-8000-000000000003",
              "time": {
                "actionId": "16000000-0000-4000-8000-000000000004",
                "recordedAt": "2026-09-23T20:00:00Z",
                "observation": {
                  "observedAt": null,
                  "clock": {
                    "quality": "unknown"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  {
    "id": "p16-snapshot-arrived",
    "schema": "current-activity.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "roundId": "15000000-0000-4000-8000-000000000006",
      "driverId": "15000000-0000-4000-8000-000000000002",
      "owner": {
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "generation": 1
      },
      "revision": 2,
      "currentActivity": {
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "revision": 2,
        "stage": "arrived",
        "heading": {
          "actionId": "16000000-0000-4000-8000-000000000001",
          "recordedAt": "2026-09-23T20:00:00Z",
          "observation": {
            "observedAt": null,
            "clock": {
              "quality": "unknown"
            }
          }
        },
        "arrival": {
          "actionId": "16000000-0000-4000-8000-000000000004",
          "recordedAt": "2026-09-23T20:00:00Z",
          "observation": {
            "observedAt": null,
            "clock": {
              "quality": "unknown"
            }
          }
        }
      },
      "physicalOrigin": {
        "kind": "last-confirmed-stop",
        "coordinates": {
          "latitude": 30.05,
          "longitude": 31.24
        },
        "revision": 1,
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "time": {
          "actionId": "16000000-0000-4000-8000-000000000004",
          "recordedAt": "2026-09-23T20:00:00Z",
          "observation": {
            "observedAt": null,
            "clock": {
              "quality": "unknown"
            }
          }
        }
      },
      "planningOrigin": {
        "kind": "last-confirmed-stop",
        "coordinates": {
          "latitude": 30.05,
          "longitude": 31.24
        }
      },
      "nextSuggestion": null,
      "planning": {
        "planId": "15000000-0000-4000-8000-000000000004",
        "updating": true
      },
      "targets": [
        {
          "taskId": "16000000-0000-4000-8000-000000000002",
          "attemptId": "16000000-0000-4000-8000-000000000003",
          "sourceRevision": 1,
          "assignmentRevision": 0,
          "pinRevision": 0,
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "recipientName": "منى عبد الرحمن",
          "recipientPhone": "+201012345678",
          "address": null,
          "delivery": {
            "kind": "personal",
            "allowedActions": [
              "full",
              "no-answer"
            ],
            "fullCollection": null,
            "goodsDue": null,
            "shippingDue": null
          }
        }
      ]
    }
  },
  {
    "id": "p17-full-command",
    "schema": "outcomes.schema.json#/$defs/FullCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordFull",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "reportedCollection": {
          "amountMinor": 35000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "p17-partial-command",
    "schema": "outcomes.schema.json#/$defs/PartialCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordPartial",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "pieces": [
          {
            "sourceLineId": "pieces",
            "delivered": 2
          }
        ],
        "reportedCollection": {
          "amountMinor": 25000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "p17-refused-paid-command",
    "schema": "outcomes.schema.json#/$defs/RefusalCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordRefusal",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "shippingPayment": "collected",
        "reportedCollection": {
          "amountMinor": 5000,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "p17-refused-unpaid-command",
    "schema": "outcomes.schema.json#/$defs/RefusalCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordRefusal",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0,
        "shippingPayment": "refused",
        "reportedCollection": {
          "amountMinor": 0,
          "currency": "EGP",
          "exponent": 2
        }
      }
    }
  },
  {
    "id": "p17-no-answer-command",
    "schema": "outcomes.schema.json#/$defs/NoAnswerCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordNoAnswer",
      "actionId": "16000000-0000-4000-8000-000000000001",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "tripId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      },
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0
      }
    }
  },
  {
    "id": "p17-partial-record",
    "schema": "outcomes.schema.json#/$defs/Record",
    "valid": true,
    "data": {
      "kind": "company",
      "time": {
        "actionId": "17000000-0000-4000-8000-000000000017",
        "recordedAt": "2026-09-24T08:00:00.000Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "lines": [
        {
          "unitDue": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 10000
          },
          "delivered": 2,
          "sourceLineId": "pieces",
          "sourceQuantity": 3,
          "heldReturnRequired": 1
        }
      ],
      "taskId": "17000000-0000-4000-8000-000000000011",
      "arrival": {
        "actionId": "17000000-0000-4000-8000-000000000016",
        "recordedAt": "2026-09-24T08:00:00.000Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "heading": {
        "actionId": "17000000-0000-4000-8000-000000000015",
        "recordedAt": "2026-09-24T08:00:00.000Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "outcome": "partial",
      "roundId": "17000000-0000-4000-8000-000000000003",
      "branchId": "17000000-0000-4000-8000-000000000022",
      "driverId": "17000000-0000-4000-8000-000000000004",
      "revision": 1,
      "attemptId": "17000000-0000-4000-8000-000000000012",
      "outcomeId": "17000000-0000-4000-8000-000000000021",
      "workdayId": "17000000-0000-4000-8000-000000000005",
      "collection": {
        "goods": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 20000
        },
        "reported": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 25000
        },
        "shipping": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 5000
        },
        "shippingStatus": "collected",
        "unpaidShipping": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 0
        }
      },
      "returnRequired": true,
      "sourceRevision": 1,
      "dispatchCycleId": "17000000-0000-4000-8000-000000000023",
      "sourceReference": {
        "tenantId": "17000000-0000-4000-8000-000000000018",
        "externalId": "shipment-0",
        "integrationId": "17000000-0000-4000-8000-000000000024"
      },
      "assignmentRevision": 1,
      "sourceDispatchCycleId": "cycle"
    }
  },
  {
    "id": "p17-no-answer-record",
    "schema": "outcomes.schema.json#/$defs/Record",
    "valid": true,
    "data": {
      "kind": "company",
      "time": {
        "actionId": "17000000-0000-4000-8000-000000000019",
        "recordedAt": "2026-09-24T08:00:00.000Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "lines": [
        {
          "unitDue": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 10000
          },
          "delivered": 0,
          "sourceLineId": "pieces",
          "sourceQuantity": 3,
          "heldReturnRequired": 3
        }
      ],
      "taskId": "17000000-0000-4000-8000-000000000013",
      "arrival": null,
      "heading": null,
      "outcome": "no-answer",
      "roundId": "17000000-0000-4000-8000-000000000003",
      "branchId": "17000000-0000-4000-8000-000000000022",
      "driverId": "17000000-0000-4000-8000-000000000004",
      "revision": 1,
      "attemptId": "17000000-0000-4000-8000-000000000014",
      "outcomeId": "17000000-0000-4000-8000-000000000026",
      "workdayId": "17000000-0000-4000-8000-000000000005",
      "collection": {
        "goods": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 0
        },
        "reported": null,
        "shipping": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 0
        },
        "shippingStatus": "not-attempted",
        "unpaidShipping": {
          "currency": "EGP",
          "exponent": 2,
          "amountMinor": 0
        }
      },
      "returnRequired": true,
      "sourceRevision": 1,
      "dispatchCycleId": "17000000-0000-4000-8000-000000000027",
      "sourceReference": {
        "tenantId": "17000000-0000-4000-8000-000000000018",
        "externalId": "shipment-1",
        "integrationId": "17000000-0000-4000-8000-000000000024"
      },
      "assignmentRevision": 1,
      "sourceDispatchCycleId": "cycle"
    }
  },
  {
    "id": "p17-two-task-progress",
    "schema": "outcomes.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "roundId": "17000000-0000-4000-8000-000000000003",
      "items": [
        {
          "kind": "company",
          "time": {
            "actionId": "17000000-0000-4000-8000-000000000017",
            "recordedAt": "2026-09-24T08:00:00.000Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 2,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 1
            }
          ],
          "taskId": "17000000-0000-4000-8000-000000000011",
          "arrival": {
            "actionId": "17000000-0000-4000-8000-000000000016",
            "recordedAt": "2026-09-24T08:00:00.000Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "heading": {
            "actionId": "17000000-0000-4000-8000-000000000015",
            "recordedAt": "2026-09-24T08:00:00.000Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "outcome": "partial",
          "roundId": "17000000-0000-4000-8000-000000000003",
          "branchId": "17000000-0000-4000-8000-000000000022",
          "driverId": "17000000-0000-4000-8000-000000000004",
          "revision": 1,
          "attemptId": "17000000-0000-4000-8000-000000000012",
          "outcomeId": "17000000-0000-4000-8000-000000000021",
          "workdayId": "17000000-0000-4000-8000-000000000005",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 20000
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 25000
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "shippingStatus": "collected",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "17000000-0000-4000-8000-000000000023",
          "sourceReference": {
            "tenantId": "17000000-0000-4000-8000-000000000018",
            "externalId": "shipment-0",
            "integrationId": "17000000-0000-4000-8000-000000000024"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        {
          "kind": "company",
          "time": {
            "actionId": "17000000-0000-4000-8000-000000000019",
            "recordedAt": "2026-09-24T08:00:00.000Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 0,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 3
            }
          ],
          "taskId": "17000000-0000-4000-8000-000000000013",
          "arrival": null,
          "heading": null,
          "outcome": "no-answer",
          "roundId": "17000000-0000-4000-8000-000000000003",
          "branchId": "17000000-0000-4000-8000-000000000022",
          "driverId": "17000000-0000-4000-8000-000000000004",
          "revision": 1,
          "attemptId": "17000000-0000-4000-8000-000000000014",
          "outcomeId": "17000000-0000-4000-8000-000000000026",
          "workdayId": "17000000-0000-4000-8000-000000000005",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "reported": null,
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "shippingStatus": "not-attempted",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "17000000-0000-4000-8000-000000000027",
          "sourceReference": {
            "tenantId": "17000000-0000-4000-8000-000000000018",
            "externalId": "shipment-1",
            "integrationId": "17000000-0000-4000-8000-000000000024"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        }
      ],
      "progress": {
        "processed": 2,
        "full": 0,
        "partial": 1,
        "refused": 0,
        "noAnswer": 1,
        "deliveredPieces": 2,
        "heldReturnRequiredPieces": 4,
        "collection": [
          {
            "currency": "EGP",
            "exponent": 2,
            "reportedMinor": "25000",
            "unpaidShippingMinor": "0"
          }
        ]
      }
    }
  },
  {
    "id": "p17-action-accepted",
    "schema": "outcomes.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "17000000-0000-4000-8000-000000000017",
      "status": "accepted",
      "result": {
        "receipt": {
          "actionId": "17000000-0000-4000-8000-000000000017",
          "receiptId": "17000000-0000-4000-8000-000000000020",
          "receivedAt": "2026-09-24T08:00:00.000Z",
          "committedAt": "2026-09-24T08:00:00.000Z",
          "schemaVersion": "1.0.0",
          "businessStatus": "accepted",
          "evidenceStatus": "received",
          "resourceVersions": {
            "outcomeRevision": 1,
            "deviceGeneration": 1,
            "resourceRevision": 3
          }
        },
        "operationId": "outcome.recordPartial",
        "retention": "full",
        "summary": {
          "taskId": "17000000-0000-4000-8000-000000000011",
          "roundId": "17000000-0000-4000-8000-000000000003",
          "driverId": "17000000-0000-4000-8000-000000000004",
          "outcomeId": "17000000-0000-4000-8000-000000000021",
          "outcomeRevision": 1
        },
        "response": {
          "status": 200,
          "body": {
            "current": {
              "roundId": "17000000-0000-4000-8000-000000000003",
              "revision": 3,
              "physicalOrigin": {
                "kind": "last-confirmed-stop",
                "time": {
                  "actionId": "17000000-0000-4000-8000-000000000016",
                  "recordedAt": "2026-09-24T08:00:00.000Z",
                  "observation": {
                    "clock": {
                      "quality": "unknown"
                    },
                    "observedAt": null
                  }
                },
                "taskId": "17000000-0000-4000-8000-000000000011",
                "roundId": "17000000-0000-4000-8000-000000000003",
                "revision": 1,
                "attemptId": "17000000-0000-4000-8000-000000000012",
                "coordinates": {
                  "latitude": 30.05,
                  "longitude": 31.24
                }
              },
              "currentActivity": null
            },
            "outcome": {
              "kind": "company",
              "time": {
                "actionId": "17000000-0000-4000-8000-000000000017",
                "recordedAt": "2026-09-24T08:00:00.000Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "lines": [
                {
                  "unitDue": {
                    "currency": "EGP",
                    "exponent": 2,
                    "amountMinor": 10000
                  },
                  "delivered": 2,
                  "sourceLineId": "pieces",
                  "sourceQuantity": 3,
                  "heldReturnRequired": 1
                }
              ],
              "taskId": "17000000-0000-4000-8000-000000000011",
              "arrival": {
                "actionId": "17000000-0000-4000-8000-000000000016",
                "recordedAt": "2026-09-24T08:00:00.000Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "heading": {
                "actionId": "17000000-0000-4000-8000-000000000015",
                "recordedAt": "2026-09-24T08:00:00.000Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "outcome": "partial",
              "roundId": "17000000-0000-4000-8000-000000000003",
              "branchId": "17000000-0000-4000-8000-000000000022",
              "driverId": "17000000-0000-4000-8000-000000000004",
              "revision": 1,
              "attemptId": "17000000-0000-4000-8000-000000000012",
              "outcomeId": "17000000-0000-4000-8000-000000000021",
              "workdayId": "17000000-0000-4000-8000-000000000005",
              "collection": {
                "goods": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 20000
                },
                "reported": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 25000
                },
                "shipping": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 5000
                },
                "shippingStatus": "collected",
                "unpaidShipping": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 0
                }
              },
              "returnRequired": true,
              "sourceRevision": 1,
              "dispatchCycleId": "17000000-0000-4000-8000-000000000023",
              "sourceReference": {
                "tenantId": "17000000-0000-4000-8000-000000000018",
                "externalId": "shipment-0",
                "integrationId": "17000000-0000-4000-8000-000000000024"
              },
              "assignmentRevision": 1,
              "sourceDispatchCycleId": "cycle"
            }
          }
        }
      }
    }
  },
  {
    "id": "p17-action-pending",
    "schema": "outcomes.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "17000000-0000-4000-8000-000000000099",
      "status": "pending"
    }
  },
  {
    "id": "p17-event-payload",
    "schema": "outcomes.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "outcome": {
        "kind": "company",
        "time": {
          "actionId": "17000000-0000-4000-8000-000000000017",
          "recordedAt": "2026-09-24T08:00:00.000Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "lines": [
          {
            "unitDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "delivered": 2,
            "sourceLineId": "pieces",
            "sourceQuantity": 3,
            "heldReturnRequired": 1
          }
        ],
        "taskId": "17000000-0000-4000-8000-000000000011",
        "arrival": {
          "actionId": "17000000-0000-4000-8000-000000000016",
          "recordedAt": "2026-09-24T08:00:00.000Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "heading": {
          "actionId": "17000000-0000-4000-8000-000000000015",
          "recordedAt": "2026-09-24T08:00:00.000Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "outcome": "partial",
        "roundId": "17000000-0000-4000-8000-000000000003",
        "branchId": "17000000-0000-4000-8000-000000000022",
        "driverId": "17000000-0000-4000-8000-000000000004",
        "revision": 1,
        "attemptId": "17000000-0000-4000-8000-000000000012",
        "outcomeId": "17000000-0000-4000-8000-000000000021",
        "workdayId": "17000000-0000-4000-8000-000000000005",
        "collection": {
          "goods": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 20000
          },
          "reported": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 25000
          },
          "shipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 5000
          },
          "shippingStatus": "collected",
          "unpaidShipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          }
        },
        "returnRequired": true,
        "sourceRevision": 1,
        "dispatchCycleId": "17000000-0000-4000-8000-000000000023",
        "sourceReference": {
          "tenantId": "17000000-0000-4000-8000-000000000018",
          "externalId": "shipment-0",
          "integrationId": "17000000-0000-4000-8000-000000000024"
        },
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p18-retry-command",
    "schema": "eligibility.schema.json#/$defs/RetryCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "operationId": "task.retryWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "attemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "expectedActivityRevision": 1,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 0
      }
    }
  },
  {
    "id": "p18-defer-command",
    "schema": "eligibility.schema.json#/$defs/DeferCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "97203a2c-3224-47dd-8edd-0b51baff234f",
      "operationId": "task.deferWhole",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
        "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 0,
        "earliestAt": "2026-09-24T22:55:01.456Z"
      }
    }
  },
  {
    "id": "p18-urgency-command",
    "schema": "eligibility.schema.json#/$defs/UrgencyCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "d48b59bf-49da-4532-8322-193e0eb5f222",
      "operationId": "task.setDriverUrgency",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
        "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 1,
        "urgency": "urgent"
      }
    }
  },
  {
    "id": "p18-activate-command",
    "schema": "eligibility.schema.json#/$defs/ActivateCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "20e4cf41-2928-46ff-9698-91782ace33d6",
      "operationId": "task.activateDeferred",
      "context": {
        "kind": "device",
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "accountId": "7caa2ec2-f31a-4ffc-9a74-0037315211f7",
        "deviceId": "33a81752-a43d-45c6-9f1f-ea1a17ff465c",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
        "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": null,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 1,
        "expectedPinRevision": 0,
        "expectedEligibilityRevision": 2
      }
    }
  },
  {
    "id": "p18-snapshot",
    "schema": "eligibility.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
      "activityRevision": 2,
      "currentAttemptId": null,
      "items": [
        {
          "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
          "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
          "revision": 1,
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "pinRevision": 0,
          "earliestAt": null,
          "urgency": "ordinary",
          "deferred": false,
          "latestOutcomeId": "d12f704a-05e9-41c5-8c1a-4900f193ac33",
          "actions": {
            "defer": {
              "allowed": false,
              "blocker": "partial-or-delivered",
              "message": "لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي."
            },
            "retry": {
              "allowed": false,
              "blocker": "partial-or-delivered",
              "message": "لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي."
            },
            "activate": {
              "allowed": false,
              "blocker": "partial-or-delivered",
              "message": "لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي."
            },
            "urgency": {
              "allowed": false,
              "blocker": "partial-or-delivered",
              "message": "لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي."
            }
          }
        },
        {
          "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
          "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
          "revision": 2,
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "pinRevision": 0,
          "earliestAt": "2026-09-24T22:55:01.456Z",
          "urgency": "urgent",
          "deferred": true,
          "latestOutcomeId": null,
          "actions": {
            "defer": {
              "allowed": true,
              "blocker": null,
              "message": null
            },
            "retry": {
              "allowed": false,
              "blocker": "result-required",
              "message": "سجّل نتيجة المحاولة قبل طلب إعادة المحاولة."
            },
            "activate": {
              "allowed": false,
              "blocker": "earliest-time",
              "message": "لم يحن وقت الإتاحة بعد."
            },
            "urgency": {
              "allowed": true,
              "blocker": null,
              "message": null
            }
          }
        }
      ],
      "history": [
        {
          "time": {
            "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
            "recordedAt": "2026-09-23T22:55:01.348Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
          "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
          "urgency": "ordinary",
          "deferred": false,
          "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
          "revision": 1,
          "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
          "earliestAt": null,
          "operationId": "task.retryWhole",
          "sourceRevision": 1,
          "dispatchCycleId": "68804436-01e1-4ea6-9128-8557d3682684",
          "sourceReference": {
            "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
            "externalId": "shipment-0",
            "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
          },
          "previousAttemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        {
          "time": {
            "actionId": "97203a2c-3224-47dd-8edd-0b51baff234f",
            "recordedAt": "2026-09-23T22:55:01.488Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
          "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
          "urgency": "ordinary",
          "deferred": true,
          "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
          "revision": 1,
          "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
          "earliestAt": "2026-09-24T22:55:01.456Z",
          "operationId": "task.deferWhole",
          "sourceRevision": 1,
          "dispatchCycleId": "fa38236a-36c1-42b3-9973-e12a44a6f70c",
          "sourceReference": {
            "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
            "externalId": "shipment-1",
            "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
          },
          "previousAttemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        {
          "time": {
            "actionId": "d48b59bf-49da-4532-8322-193e0eb5f222",
            "recordedAt": "2026-09-23T22:55:01.536Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
          "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
          "urgency": "urgent",
          "deferred": true,
          "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
          "revision": 2,
          "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
          "earliestAt": "2026-09-24T22:55:01.456Z",
          "operationId": "task.setDriverUrgency",
          "sourceRevision": 1,
          "dispatchCycleId": "fa38236a-36c1-42b3-9973-e12a44a6f70c",
          "sourceReference": {
            "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
            "externalId": "shipment-1",
            "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
          },
          "previousAttemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        }
      ]
    }
  },
  {
    "id": "p18-action-status",
    "schema": "eligibility.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "status": "accepted",
      "result": {
        "receipt": {
          "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
          "receiptId": "7a80b6ae-2801-4029-a4a9-11783c9a431d",
          "receivedAt": "2026-09-23T22:55:01.335Z",
          "committedAt": "2026-09-23T22:55:01.381Z",
          "schemaVersion": "1.0.0",
          "businessStatus": "accepted",
          "evidenceStatus": "received",
          "resourceVersions": {
            "deviceGeneration": 1,
            "resourceRevision": 1
          }
        },
        "operationId": "task.retryWhole",
        "retention": "full",
        "summary": {
          "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
          "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
          "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
          "revision": 1
        },
        "response": {
          "status": 200,
          "body": {
            "state": {
              "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
              "actions": {
                "defer": {
                  "allowed": true,
                  "blocker": null,
                  "message": null
                },
                "retry": {
                  "allowed": false,
                  "blocker": "result-required",
                  "message": "سجّل نتيجة المحاولة قبل طلب إعادة المحاولة."
                },
                "urgency": {
                  "allowed": true,
                  "blocker": null,
                  "message": null
                },
                "activate": {
                  "allowed": false,
                  "blocker": "not-deferred",
                  "message": "هذا العمل ليس مؤجلاً بلا نتيجة؛ راجع الإجراء المتاح."
                }
              },
              "urgency": "ordinary",
              "deferred": false,
              "revision": 1,
              "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
              "earliestAt": null,
              "pinRevision": 0,
              "sourceRevision": 1,
              "latestOutcomeId": null,
              "assignmentRevision": 1
            },
            "change": {
              "time": {
                "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
                "recordedAt": "2026-09-23T22:55:01.348Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
              "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
              "urgency": "ordinary",
              "deferred": false,
              "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
              "revision": 1,
              "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
              "earliestAt": null,
              "operationId": "task.retryWhole",
              "sourceRevision": 1,
              "dispatchCycleId": "68804436-01e1-4ea6-9128-8557d3682684",
              "sourceReference": {
                "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
                "externalId": "shipment-0",
                "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
              },
              "previousAttemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
              "assignmentRevision": 1,
              "sourceDispatchCycleId": "cycle"
            }
          }
        }
      }
    }
  },
  {
    "id": "p18-pending",
    "schema": "eligibility.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
      "status": "pending"
    }
  },
  {
    "id": "p18-accepted",
    "schema": "eligibility.schema.json#/$defs/ActionResult",
    "valid": true,
    "data": {
      "receipt": {
        "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
        "receiptId": "7a80b6ae-2801-4029-a4a9-11783c9a431d",
        "receivedAt": "2026-09-23T22:55:01.335Z",
        "committedAt": "2026-09-23T22:55:01.381Z",
        "schemaVersion": "1.0.0",
        "businessStatus": "accepted",
        "evidenceStatus": "received",
        "resourceVersions": {
          "deviceGeneration": 1,
          "resourceRevision": 1
        }
      },
      "operationId": "task.retryWhole",
      "retention": "full",
      "summary": {
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
        "revision": 1
      },
      "response": {
        "status": 200,
        "body": {
          "state": {
            "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
            "actions": {
              "defer": {
                "allowed": true,
                "blocker": null,
                "message": null
              },
              "retry": {
                "allowed": false,
                "blocker": "result-required",
                "message": "سجّل نتيجة المحاولة قبل طلب إعادة المحاولة."
              },
              "urgency": {
                "allowed": true,
                "blocker": null,
                "message": null
              },
              "activate": {
                "allowed": false,
                "blocker": "not-deferred",
                "message": "هذا العمل ليس مؤجلاً بلا نتيجة؛ راجع الإجراء المتاح."
              }
            },
            "urgency": "ordinary",
            "deferred": false,
            "revision": 1,
            "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
            "earliestAt": null,
            "pinRevision": 0,
            "sourceRevision": 1,
            "latestOutcomeId": null,
            "assignmentRevision": 1
          },
          "change": {
            "time": {
              "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
              "recordedAt": "2026-09-23T22:55:01.348Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
            "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
            "urgency": "ordinary",
            "deferred": false,
            "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
            "revision": 1,
            "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
            "earliestAt": null,
            "operationId": "task.retryWhole",
            "sourceRevision": 1,
            "dispatchCycleId": "68804436-01e1-4ea6-9128-8557d3682684",
            "sourceReference": {
              "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
              "externalId": "shipment-0",
              "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
            },
            "previousAttemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          }
        }
      }
    }
  },
  {
    "id": "p18-denied",
    "schema": "eligibility.schema.json#/$defs/ActionResult",
    "valid": true,
    "data": {
      "receipt": {
        "problem": {
          "code": "lifecycle_forbidden",
          "type": "https://schemas.tawsel.invalid/problems/lifecycle-forbidden",
          "title": "Eligibility change rejected",
          "detail": "earliest-time: لم يحن وقت الإتاحة بعد.",
          "status": 409,
          "actionId": "20e4cf41-2928-46ff-9698-91782ace33d6",
          "retryable": false,
          "correlationId": "e111e436-c776-4adf-a1a0-b4d333fed887"
        },
        "actionId": "20e4cf41-2928-46ff-9698-91782ace33d6",
        "receiptId": "b46cfde1-c906-4b95-b372-fef222da20c7",
        "receivedAt": "2026-09-23T22:55:01.574Z",
        "schemaVersion": "1.0.0",
        "businessStatus": "rejected",
        "evidenceStatus": "received"
      },
      "operationId": "task.activateDeferred",
      "retention": "full",
      "summary": {
        "code": "lifecycle_forbidden",
        "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d"
      },
      "response": {
        "status": 409,
        "body": {
          "code": "lifecycle_forbidden",
          "type": "https://schemas.tawsel.invalid/problems/lifecycle-forbidden",
          "title": "Eligibility change rejected",
          "detail": "earliest-time: لم يحن وقت الإتاحة بعد.",
          "status": 409,
          "actionId": "20e4cf41-2928-46ff-9698-91782ace33d6",
          "retryable": false,
          "correlationId": "e111e436-c776-4adf-a1a0-b4d333fed887"
        }
      }
    }
  },
  {
    "id": "p18-event-0",
    "schema": "eligibility.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "change": {
        "time": {
          "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
          "recordedAt": "2026-09-23T22:55:01.348Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "urgency": "ordinary",
        "deferred": false,
        "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
        "revision": 1,
        "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
        "earliestAt": null,
        "operationId": "task.retryWhole",
        "sourceRevision": 1,
        "dispatchCycleId": "68804436-01e1-4ea6-9128-8557d3682684",
        "sourceReference": {
          "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
          "externalId": "shipment-0",
          "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
        },
        "previousAttemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p18-event-1",
    "schema": "eligibility.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "change": {
        "time": {
          "actionId": "97203a2c-3224-47dd-8edd-0b51baff234f",
          "recordedAt": "2026-09-23T22:55:01.488Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "urgency": "ordinary",
        "deferred": true,
        "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
        "revision": 1,
        "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "earliestAt": "2026-09-24T22:55:01.456Z",
        "operationId": "task.deferWhole",
        "sourceRevision": 1,
        "dispatchCycleId": "fa38236a-36c1-42b3-9973-e12a44a6f70c",
        "sourceReference": {
          "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
          "externalId": "shipment-1",
          "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
        },
        "previousAttemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p18-event-2",
    "schema": "eligibility.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "change": {
        "time": {
          "actionId": "d48b59bf-49da-4532-8322-193e0eb5f222",
          "recordedAt": "2026-09-23T22:55:01.536Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "taskId": "5ca69a2f-94e8-50bf-a433-3549794246fa",
        "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
        "urgency": "urgent",
        "deferred": true,
        "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
        "revision": 2,
        "attemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "earliestAt": "2026-09-24T22:55:01.456Z",
        "operationId": "task.setDriverUrgency",
        "sourceRevision": 1,
        "dispatchCycleId": "fa38236a-36c1-42b3-9973-e12a44a6f70c",
        "sourceReference": {
          "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
          "externalId": "shipment-1",
          "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
        },
        "previousAttemptId": "26330fcd-63d9-46cb-ba59-1d50f3359927",
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p18-state",
    "schema": "eligibility.schema.json#/$defs/State",
    "valid": true,
    "data": {
      "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
      "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
      "revision": 1,
      "sourceRevision": 1,
      "assignmentRevision": 1,
      "pinRevision": 0,
      "earliestAt": null,
      "urgency": "ordinary",
      "deferred": false,
      "latestOutcomeId": "d12f704a-05e9-41c5-8c1a-4900f193ac33",
      "actions": {
        "defer": {
          "allowed": false,
          "blocker": "partial-or-delivered",
          "message": "لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي."
        },
        "retry": {
          "allowed": false,
          "blocker": "partial-or-delivered",
          "message": "لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي."
        },
        "activate": {
          "allowed": false,
          "blocker": "partial-or-delivered",
          "message": "لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي."
        },
        "urgency": {
          "allowed": false,
          "blocker": "partial-or-delivered",
          "message": "لا يمكن إعادة تسليم الباقي المرفوض أو العمل المنتهي."
        }
      }
    }
  },
  {
    "id": "p18-record",
    "schema": "eligibility.schema.json#/$defs/Record",
    "valid": true,
    "data": {
      "time": {
        "actionId": "a8ff8fc7-957f-4a60-a9f7-e6daac5992ef",
        "recordedAt": "2026-09-23T22:55:01.348Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "taskId": "4936c297-c99c-5d29-af92-e410b307978a",
      "roundId": "90014a24-016e-455b-8c56-8983b05bc5bf",
      "urgency": "ordinary",
      "deferred": false,
      "driverId": "0ab536d2-da8d-4f8e-83b8-876e9834942d",
      "revision": 1,
      "attemptId": "4d327c01-11c8-4056-a42d-84263379fb7f",
      "earliestAt": null,
      "operationId": "task.retryWhole",
      "sourceRevision": 1,
      "dispatchCycleId": "68804436-01e1-4ea6-9128-8557d3682684",
      "sourceReference": {
        "tenantId": "a8af1cba-4f60-4c10-a625-b07bbb8707a6",
        "externalId": "shipment-0",
        "integrationId": "b253cc1d-e831-4e70-8e37-c77982760cd0"
      },
      "previousAttemptId": "ae567b65-98dc-4183-b2b2-9c19153883c8",
      "assignmentRevision": 1,
      "sourceDispatchCycleId": "cycle"
    }
  },
  {
    "id": "p19-end-round",
    "schema": "workday-closure.schema.json#/$defs/EndRoundCommand",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "ae98765b-8f68-4c67-8e4e-a89da6bc42b3",
      "operationId": "round.end",
      "context": {
        "kind": "device",
        "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
        "accountId": "01efa9b6-cfd2-4000-80ae-bccae5f26073",
        "deviceId": "d697d232-9738-4455-9218-343b1d1cdf25",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
        "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
        "expectedActiveRoundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
        "expectedActivityRevision": 3,
        "expectedCurrentAttemptId": "c11d2b33-5010-4459-bb2f-815471de86ae",
        "currentAction": "pause-heading"
      }
    }
  },
  {
    "id": "p19-end-day",
    "schema": "workday-closure.schema.json#/$defs/EndDayCommand",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
      "operationId": "workday.end",
      "context": {
        "kind": "device",
        "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
        "accountId": "01efa9b6-cfd2-4000-80ae-bccae5f26073",
        "deviceId": "d697d232-9738-4455-9218-343b1d1cdf25",
        "deviceGeneration": 2,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
        "roundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
        "expectedActiveRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
        "expectedActivityRevision": 0,
        "expectedCurrentAttemptId": null,
        "currentAction": "require-none"
      }
    }
  },
  {
    "id": "p19-round-result",
    "schema": "workday-closure.schema.json#/$defs/ActionResult",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "receipt": {
        "actionId": "ae98765b-8f68-4c67-8e4e-a89da6bc42b3",
        "receiptId": "153292d4-9309-4a60-9804-66e30627310a",
        "receivedAt": "2026-09-24T08:00:46.150Z",
        "committedAt": "2026-09-24T08:00:46.193Z",
        "schemaVersion": "1.0.0",
        "businessStatus": "accepted",
        "evidenceStatus": "received",
        "resourceVersions": {
          "deviceGeneration": 1,
          "resourceRevision": 4
        }
      },
      "operationId": "round.end",
      "retention": "full",
      "summary": {
        "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
        "driverId": "577af791-9729-42ce-986b-41632d45b72e",
        "closureId": "f440877d-ae01-41a6-8cf5-b68bd81a5d45",
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225"
      },
      "response": {
        "status": 200,
        "body": {
          "closure": {
            "time": {
              "actionId": "ae98765b-8f68-4c67-8e4e-a89da6bc42b3",
              "recordedAt": "2026-09-24T08:00:46.163Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "driverId": "577af791-9729-42ce-986b-41632d45b72e",
            "closureId": "f440877d-ae01-41a6-8cf5-b68bd81a5d45",
            "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
            "operationId": "round.end",
            "endedRoundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
            "ownerRoundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
            "roundEndedAt": "2026-09-24T08:00:46.163Z",
            "pausedActivity": {
              "stage": "heading",
              "taskId": "91116103-f626-57a0-a16d-766cce068b8b",
              "arrival": null,
              "heading": {
                "actionId": "c715cb52-bbf0-473d-bc18-826abac45fa9",
                "recordedAt": "2026-09-24T08:00:46.063Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "revision": 3,
              "attemptId": "c11d2b33-5010-4459-bb2f-815471de86ae"
            },
            "workdayEndedAt": null,
            "activityRevision": 4
          },
          "disposition": "closed"
        }
      }
    }
  },
  {
    "id": "p19-day-result",
    "schema": "workday-closure.schema.json#/$defs/ActionResult",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "receipt": {
        "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
        "receiptId": "f77bda35-406b-44f9-9fa0-f72d1040e864",
        "receivedAt": "2026-09-24T08:00:46.451Z",
        "committedAt": "2026-09-24T08:00:46.475Z",
        "schemaVersion": "1.0.0",
        "businessStatus": "accepted",
        "evidenceStatus": "received",
        "resourceVersions": {
          "deviceGeneration": 2
        }
      },
      "operationId": "workday.end",
      "retention": "full",
      "summary": {
        "roundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
        "driverId": "577af791-9729-42ce-986b-41632d45b72e",
        "closureId": "608b5d55-ab17-4730-a5e6-2bd4ce6da2c8",
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225"
      },
      "response": {
        "status": 200,
        "body": {
          "closure": {
            "time": {
              "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
              "recordedAt": "2026-09-24T08:00:46.461Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "driverId": "577af791-9729-42ce-986b-41632d45b72e",
            "closureId": "608b5d55-ab17-4730-a5e6-2bd4ce6da2c8",
            "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
            "operationId": "workday.end",
            "endedRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
            "ownerRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
            "roundEndedAt": "2026-09-24T08:00:46.461Z",
            "pausedActivity": null,
            "workdayEndedAt": "2026-09-24T08:00:46.461Z",
            "activityRevision": 0
          },
          "disposition": "closed"
        }
      }
    }
  },
  {
    "id": "p19-action-status",
    "schema": "workday-closure.schema.json#/$defs/ActionStatus",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
      "status": "accepted",
      "result": {
        "receipt": {
          "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
          "receiptId": "f77bda35-406b-44f9-9fa0-f72d1040e864",
          "receivedAt": "2026-09-24T08:00:46.451Z",
          "committedAt": "2026-09-24T08:00:46.475Z",
          "schemaVersion": "1.0.0",
          "businessStatus": "accepted",
          "evidenceStatus": "received",
          "resourceVersions": {
            "deviceGeneration": 2
          }
        },
        "operationId": "workday.end",
        "retention": "full",
        "summary": {
          "roundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
          "driverId": "577af791-9729-42ce-986b-41632d45b72e",
          "closureId": "608b5d55-ab17-4730-a5e6-2bd4ce6da2c8",
          "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225"
        },
        "response": {
          "status": 200,
          "body": {
            "closure": {
              "time": {
                "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
                "recordedAt": "2026-09-24T08:00:46.461Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "driverId": "577af791-9729-42ce-986b-41632d45b72e",
              "closureId": "608b5d55-ab17-4730-a5e6-2bd4ce6da2c8",
              "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
              "operationId": "workday.end",
              "endedRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
              "ownerRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
              "roundEndedAt": "2026-09-24T08:00:46.461Z",
              "pausedActivity": null,
              "workdayEndedAt": "2026-09-24T08:00:46.461Z",
              "activityRevision": 0
            },
            "disposition": "closed"
          }
        }
      }
    }
  },
  {
    "id": "p19-summary",
    "schema": "workday-closure.schema.json#/$defs/Summary",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
      "driverId": "577af791-9729-42ce-986b-41632d45b72e",
      "displayTimeZone": "Africa/Cairo",
      "openedAt": "2026-09-24T08:00:45.714Z",
      "endedAt": "2026-09-24T08:00:46.461Z",
      "asOf": "2026-09-24T08:00:46.532Z",
      "rounds": [
        {
          "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
          "startedAt": "2026-09-24T08:00:45.716Z",
          "endedAt": "2026-09-24T08:00:46.163Z",
          "firstPlanId": "8a034001-a3f2-406a-b7c6-a02f311ca136",
          "firstForecastId": "d50f23d8-9b79-41d0-9344-51a5a8d74727",
          "firstWorkloadId": "d60eecfd-d878-4359-876a-264af8caa8d7"
        },
        {
          "roundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
          "startedAt": "2026-09-24T08:00:46.398Z",
          "endedAt": "2026-09-24T08:00:46.461Z",
          "firstPlanId": "7d525169-86f8-41d6-bc5b-5cb5cce3bdc4",
          "firstForecastId": "57316909-a393-4fc1-bc20-aaafe002038b",
          "firstWorkloadId": "107f3f89-5b1a-4b14-a549-a56b12469ebb"
        }
      ],
      "scope": {
        "shipments": 4,
        "attempts": 4,
        "processedAttempts": 2,
        "fullShipments": 1,
        "partialShipments": 0,
        "refusedShipments": 1,
        "noAnswerShipments": 0,
        "unfinishedShipments": 2
      },
      "collection": [
        {
          "currency": "EGP",
          "exponent": 2,
          "reportedMinor": "35000",
          "unreportedAttempts": 0
        }
      ],
      "outcomes": [
        {
          "kind": "company",
          "time": {
            "actionId": "cef29c59-351f-4385-87a0-391b76a6d025",
            "recordedAt": "2026-09-24T08:00:45.800Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 3,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 0
            }
          ],
          "taskId": "454fd69a-7038-54b9-ada7-d859bdfd4c9a",
          "arrival": null,
          "heading": null,
          "outcome": "full",
          "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
          "branchId": "d0cd0606-5b37-4713-9639-2d7c50bc4347",
          "driverId": "577af791-9729-42ce-986b-41632d45b72e",
          "revision": 1,
          "attemptId": "1c17d992-d2d1-40a6-897d-e061529a9794",
          "outcomeId": "eba3d148-1d84-44a8-a0f2-52026dc13f3d",
          "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 30000
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 35000
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "shippingStatus": "collected",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": false,
          "sourceRevision": 1,
          "dispatchCycleId": "59ddb5c0-324b-49b0-b5de-322b570761b8",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-0",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        {
          "kind": "company",
          "time": {
            "actionId": "27a6e937-f183-4855-8f21-9b68e1cc56ed",
            "recordedAt": "2026-09-24T08:00:45.900Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 0,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 3
            }
          ],
          "taskId": "730a1809-b4d3-55a8-a42e-8ff70377d3c1",
          "arrival": null,
          "heading": null,
          "outcome": "refused",
          "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
          "branchId": "d0cd0606-5b37-4713-9639-2d7c50bc4347",
          "driverId": "577af791-9729-42ce-986b-41632d45b72e",
          "revision": 1,
          "attemptId": "44f02168-97f9-4089-a13e-5db213d740b1",
          "outcomeId": "61774f7f-4cee-43e5-9f52-90441bda1088",
          "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "shippingStatus": "explicitly-unpaid",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "314b83e1-2db3-40d6-b94d-b3905e52b5ad",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-1",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        }
      ],
      "carryForward": {
        "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
        "driverId": "577af791-9729-42ce-986b-41632d45b72e",
        "asOf": "2026-09-24T08:00:46.532Z",
        "items": [
          {
            "taskId": "336a3f2d-1db4-5fe8-ada7-c299af082eca",
            "attemptId": "26318815-d73f-4b40-814e-57ee3bbec56c",
            "dispatchCycleId": "f2feceb8-00f6-435d-b48b-55972a58da62",
            "sourceReference": {
              "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
              "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
              "externalId": "shipment-3"
            },
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "pinRevision": 0,
            "earliestAt": "2026-09-25T08:00:45.915Z",
            "deferred": true,
            "admittedInWorkday": true,
            "outcome": null,
            "disposition": "unfinished",
            "eligibleNow": false,
            "blocker": "deferred",
            "heldReturnRequiredPieces": 0,
            "heldPieces": 3,
            "unpaidShippingMinor": "0"
          },
          {
            "taskId": "730a1809-b4d3-55a8-a42e-8ff70377d3c1",
            "attemptId": "44f02168-97f9-4089-a13e-5db213d740b1",
            "dispatchCycleId": "314b83e1-2db3-40d6-b94d-b3905e52b5ad",
            "sourceReference": {
              "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
              "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
              "externalId": "shipment-1"
            },
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "pinRevision": 0,
            "earliestAt": null,
            "deferred": false,
            "admittedInWorkday": true,
            "outcome": "refused",
            "disposition": "return-required",
            "eligibleNow": false,
            "blocker": "result-required",
            "heldReturnRequiredPieces": 3,
            "heldPieces": 3,
            "unpaidShippingMinor": "5000"
          },
          {
            "taskId": "91116103-f626-57a0-a16d-766cce068b8b",
            "attemptId": "c11d2b33-5010-4459-bb2f-815471de86ae",
            "dispatchCycleId": "99d6636a-5e7d-47ce-863a-37b0175a3077",
            "sourceReference": {
              "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
              "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
              "externalId": "shipment-2"
            },
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "pinRevision": 0,
            "earliestAt": null,
            "deferred": false,
            "admittedInWorkday": true,
            "outcome": null,
            "disposition": "unfinished",
            "eligibleNow": true,
            "blocker": null,
            "heldReturnRequiredPieces": 0,
            "heldPieces": 3,
            "unpaidShippingMinor": "0"
          }
        ]
      }
    }
  },
  {
    "id": "p19-carry-forward",
    "schema": "workday-closure.schema.json#/$defs/CarryForward",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "workdayId": "1cde66f1-8633-4292-8028-692dc04058b5",
      "driverId": "577af791-9729-42ce-986b-41632d45b72e",
      "asOf": "2026-09-24T08:00:46.783Z",
      "items": [
        {
          "taskId": "336a3f2d-1db4-5fe8-ada7-c299af082eca",
          "attemptId": "26318815-d73f-4b40-814e-57ee3bbec56c",
          "dispatchCycleId": "f2feceb8-00f6-435d-b48b-55972a58da62",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
            "externalId": "shipment-3"
          },
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "pinRevision": 0,
          "earliestAt": "2026-09-25T08:00:45.915Z",
          "deferred": true,
          "admittedInWorkday": false,
          "outcome": null,
          "disposition": "unfinished",
          "eligibleNow": false,
          "blocker": "deferred",
          "heldReturnRequiredPieces": 0,
          "heldPieces": 3,
          "unpaidShippingMinor": "0"
        },
        {
          "taskId": "730a1809-b4d3-55a8-a42e-8ff70377d3c1",
          "attemptId": "44f02168-97f9-4089-a13e-5db213d740b1",
          "dispatchCycleId": "314b83e1-2db3-40d6-b94d-b3905e52b5ad",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
            "externalId": "shipment-1"
          },
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "pinRevision": 0,
          "earliestAt": null,
          "deferred": false,
          "admittedInWorkday": false,
          "outcome": "refused",
          "disposition": "return-required",
          "eligibleNow": false,
          "blocker": "result-required",
          "heldReturnRequiredPieces": 3,
          "heldPieces": 3,
          "unpaidShippingMinor": "5000"
        },
        {
          "taskId": "91116103-f626-57a0-a16d-766cce068b8b",
          "attemptId": "c11d2b33-5010-4459-bb2f-815471de86ae",
          "dispatchCycleId": "99d6636a-5e7d-47ce-863a-37b0175a3077",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1",
            "externalId": "shipment-2"
          },
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "pinRevision": 0,
          "earliestAt": null,
          "deferred": false,
          "admittedInWorkday": true,
          "outcome": null,
          "disposition": "unfinished",
          "eligibleNow": true,
          "blocker": null,
          "heldReturnRequiredPieces": 0,
          "heldPieces": 3,
          "unpaidShippingMinor": "0"
        }
      ]
    }
  },
  {
    "id": "p19-round-event",
    "schema": "workday-closure.schema.json#/$defs/Event",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "time": {
        "actionId": "ae98765b-8f68-4c67-8e4e-a89da6bc42b3",
        "recordedAt": "2026-09-24T08:00:46.163Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "tasks": [
        {
          "taskId": "336a3f2d-1db4-5fe8-ada7-c299af082eca",
          "dispatchCycleId": "f2feceb8-00f6-435d-b48b-55972a58da62",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-3",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "454fd69a-7038-54b9-ada7-d859bdfd4c9a",
          "dispatchCycleId": "59ddb5c0-324b-49b0-b5de-322b570761b8",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-0",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "730a1809-b4d3-55a8-a42e-8ff70377d3c1",
          "dispatchCycleId": "314b83e1-2db3-40d6-b94d-b3905e52b5ad",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-1",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "91116103-f626-57a0-a16d-766cce068b8b",
          "dispatchCycleId": "99d6636a-5e7d-47ce-863a-37b0175a3077",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-2",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        }
      ],
      "driverId": "577af791-9729-42ce-986b-41632d45b72e",
      "closureId": "f440877d-ae01-41a6-8cf5-b68bd81a5d45",
      "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
      "endedRoundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
      "roundEndedAt": "2026-09-24T08:00:46.163Z",
      "workdayEndedAt": null
    }
  },
  {
    "id": "p19-day-event",
    "schema": "workday-closure.schema.json#/$defs/Event",
    "valid": true,
    "description": "Captured from the real local Phase 19 HTTP/PostgreSQL demonstration; fixture identity and manual plans.",
    "data": {
      "time": {
        "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
        "recordedAt": "2026-09-24T08:00:46.461Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "tasks": [
        {
          "taskId": "336a3f2d-1db4-5fe8-ada7-c299af082eca",
          "dispatchCycleId": "f2feceb8-00f6-435d-b48b-55972a58da62",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-3",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "454fd69a-7038-54b9-ada7-d859bdfd4c9a",
          "dispatchCycleId": "59ddb5c0-324b-49b0-b5de-322b570761b8",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-0",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "730a1809-b4d3-55a8-a42e-8ff70377d3c1",
          "dispatchCycleId": "314b83e1-2db3-40d6-b94d-b3905e52b5ad",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-1",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        },
        {
          "taskId": "91116103-f626-57a0-a16d-766cce068b8b",
          "dispatchCycleId": "99d6636a-5e7d-47ce-863a-37b0175a3077",
          "sourceReference": {
            "tenantId": "2d21b2ea-1d24-4d7e-ab91-f417a979a0a6",
            "externalId": "shipment-2",
            "integrationId": "d1c0ed4c-119a-44c9-a964-9be87cdd8fc1"
          },
          "sourceDispatchCycleId": "cycle"
        }
      ],
      "driverId": "577af791-9729-42ce-986b-41632d45b72e",
      "closureId": "608b5d55-ab17-4730-a5e6-2bd4ce6da2c8",
      "workdayId": "0d5e7399-b87d-4d5f-a774-9f5b60585225",
      "endedRoundId": "4f20a6ee-d40e-4b49-9fd4-a7f4d3cbcebe",
      "roundEndedAt": "2026-09-24T08:00:46.461Z",
      "workdayEndedAt": "2026-09-24T08:00:46.461Z"
    }
  },
  {
    "id": "p19-pending",
    "schema": "workday-closure.schema.json#/$defs/ActionStatus",
    "valid": true,
    "description": "Pending response shape; no accepted closure implied.",
    "data": {
      "actionId": "f86e61d3-06c8-4b97-9207-f2e585436a30",
      "status": "pending"
    }
  },
  {
    "id": "p20-view",
    "schema": "device-ownership.schema.json#/$defs/Context",
    "valid": true,
    "data": {
      "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
      "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd",
      "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
      "owner": {
        "accountId": "194968b3-a95d-4a9d-a926-ed31f31d3dcd",
        "deviceId": "93ff0067-a153-4d1e-9d98-14af64d400fa",
        "generation": 1
      },
      "viewerDeviceId": "a72c4b0a-21aa-4137-b761-40d6a59d0419",
      "mode": "view-only",
      "roundState": "active",
      "workdayState": "open",
      "mayTakeover": true,
      "snapshotRequired": false
    }
  },
  {
    "id": "p20-takeover-command",
    "schema": "device-ownership.schema.json#/$defs/TakeoverCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "device.takeOver",
      "actionId": "e86d8e6d-bceb-48da-812c-f1f044280b1f",
      "context": {
        "kind": "device",
        "tenantId": "07665749-74f8-4ff5-b177-82bc624c5ac5",
        "accountId": "194968b3-a95d-4a9d-a926-ed31f31d3dcd",
        "deviceId": "a72c4b0a-21aa-4137-b761-40d6a59d0419",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
        "expectedGeneration": 1
      }
    }
  },
  {
    "id": "p20-action-status",
    "schema": "device-ownership.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "e86d8e6d-bceb-48da-812c-f1f044280b1f",
      "status": "accepted",
      "result": {
        "receipt": {
          "actionId": "e86d8e6d-bceb-48da-812c-f1f044280b1f",
          "receiptId": "ae7db83d-a47e-4bae-b492-3021b46e64b2",
          "receivedAt": "2026-09-24T08:53:31.403Z",
          "committedAt": "2026-09-24T08:53:31.418Z",
          "schemaVersion": "1.0.0",
          "businessStatus": "accepted",
          "evidenceStatus": "received",
          "resourceVersions": {
            "deviceGeneration": 2
          }
        },
        "operationId": "device.takeOver",
        "retention": "full",
        "summary": {
          "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
          "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
          "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd",
          "generation": 2
        },
        "response": {
          "status": 200,
          "body": {
            "owner": {
              "deviceId": "a72c4b0a-21aa-4137-b761-40d6a59d0419",
              "accountId": "194968b3-a95d-4a9d-a926-ed31f31d3dcd",
              "generation": 2
            },
            "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
            "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
            "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd",
            "snapshotRequired": true
          }
        }
      }
    }
  },
  {
    "id": "p20-takeover-result",
    "schema": "action-result.v1.schema.json",
    "valid": true,
    "data": {
      "receipt": {
        "actionId": "e86d8e6d-bceb-48da-812c-f1f044280b1f",
        "receiptId": "ae7db83d-a47e-4bae-b492-3021b46e64b2",
        "receivedAt": "2026-09-24T08:53:31.403Z",
        "committedAt": "2026-09-24T08:53:31.418Z",
        "schemaVersion": "1.0.0",
        "businessStatus": "accepted",
        "evidenceStatus": "received",
        "resourceVersions": {
          "deviceGeneration": 2
        }
      },
      "operationId": "device.takeOver",
      "retention": "full",
      "summary": {
        "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
        "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
        "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd",
        "generation": 2
      },
      "response": {
        "status": 200,
        "body": {
          "owner": {
            "deviceId": "a72c4b0a-21aa-4137-b761-40d6a59d0419",
            "accountId": "194968b3-a95d-4a9d-a926-ed31f31d3dcd",
            "generation": 2
          },
          "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
          "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
          "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd",
          "snapshotRequired": true
        }
      }
    }
  },
  {
    "id": "p20-snapshot",
    "schema": "device-ownership.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "context": {
        "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
        "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd",
        "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
        "owner": {
          "accountId": "194968b3-a95d-4a9d-a926-ed31f31d3dcd",
          "deviceId": "a72c4b0a-21aa-4137-b761-40d6a59d0419",
          "generation": 2
        },
        "viewerDeviceId": "a72c4b0a-21aa-4137-b761-40d6a59d0419",
        "mode": "owner",
        "roundState": "active",
        "workdayState": "open",
        "mayTakeover": false,
        "snapshotRequired": true
      },
      "confirmedAt": "2026-09-24T08:53:31.588Z",
      "current": {
        "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
        "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
        "owner": {
          "accountId": "194968b3-a95d-4a9d-a926-ed31f31d3dcd",
          "deviceId": "a72c4b0a-21aa-4137-b761-40d6a59d0419",
          "generation": 2
        },
        "revision": 1,
        "currentActivity": {
          "taskId": "dab8ef13-3f48-4c90-8a92-2f5d38948b3b",
          "attemptId": "e49d88e0-39f4-46e9-a286-7dcd310a09c5",
          "stage": "heading",
          "revision": 1,
          "heading": {
            "actionId": "dde4b5d8-09f8-4342-ac94-9c5b596c5428",
            "recordedAt": "2026-09-24T08:53:31.260Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "arrival": null
        },
        "physicalOrigin": null,
        "planningOrigin": {
          "kind": "manual-pin",
          "coordinates": {
            "latitude": 30.04,
            "longitude": 31.23
          }
        },
        "nextSuggestion": null,
        "planning": {
          "planId": "83691e2c-d7b5-47c6-a3ce-295c1344a6be",
          "updating": true
        },
        "targets": [
          {
            "taskId": "dab8ef13-3f48-4c90-8a92-2f5d38948b3b",
            "attemptId": "e49d88e0-39f4-46e9-a286-7dcd310a09c5",
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 0,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "recipientName": "عميل التجربة",
            "recipientPhone": "+201012345678",
            "address": null,
            "delivery": {
              "kind": "personal",
              "allowedActions": [
                "full",
                "no-answer"
              ],
              "fullCollection": null,
              "goodsDue": null,
              "shippingDue": null
            }
          }
        ]
      },
      "snapshotToken": "a7984fcf-66b3-4120-a760-17e82157f30e"
    }
  },
  {
    "id": "p20-received",
    "schema": "device-ownership.schema.json#/$defs/EvidenceSubmissionResult",
    "valid": true,
    "data": {
      "submissionStatus": "received",
      "result": {
        "receipt": {
          "problem": {
            "code": "stale_device",
            "type": "https://schemas.tawsel.invalid/problems/stale-device",
            "title": "Device execution unavailable",
            "detail": "حُفظ سجل الهاتف السابق للمراجعة؛ لم يُطبّق.",
            "status": 409,
            "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
            "retryable": false,
            "correlationId": "461c147a-31f1-47ea-9e31-ec29d8a81834"
          },
          "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
          "receiptId": "a355a541-6463-40dc-91db-ac959b02b97c",
          "receivedAt": "2026-09-24T08:53:31.917Z",
          "schemaVersion": "1.0.0",
          "businessStatus": "review-required",
          "evidenceStatus": "received"
        },
        "operationId": "outcome.recordNoAnswer",
        "retention": "full",
        "summary": {
          "code": "stale_device",
          "taskId": "dab8ef13-3f48-4c90-8a92-2f5d38948b3b",
          "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
          "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
          "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd"
        },
        "response": {
          "status": 409,
          "body": {
            "code": "stale_device",
            "type": "https://schemas.tawsel.invalid/problems/stale-device",
            "title": "Device execution unavailable",
            "detail": "حُفظ سجل الهاتف السابق للمراجعة؛ لم يُطبّق.",
            "status": 409,
            "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
            "retryable": false,
            "correlationId": "461c147a-31f1-47ea-9e31-ec29d8a81834"
          }
        }
      }
    }
  },
  {
    "id": "p20-duplicate",
    "schema": "device-ownership.schema.json#/$defs/EvidenceSubmissionResult",
    "valid": true,
    "data": {
      "submissionStatus": "duplicate",
      "result": {
        "receipt": {
          "problem": {
            "code": "stale_device",
            "type": "https://schemas.tawsel.invalid/problems/stale-device",
            "title": "Device execution unavailable",
            "detail": "حُفظ سجل الهاتف السابق للمراجعة؛ لم يُطبّق.",
            "status": 409,
            "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
            "retryable": false,
            "correlationId": "461c147a-31f1-47ea-9e31-ec29d8a81834"
          },
          "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
          "receiptId": "a355a541-6463-40dc-91db-ac959b02b97c",
          "receivedAt": "2026-09-24T08:53:31.917Z",
          "schemaVersion": "1.0.0",
          "businessStatus": "review-required",
          "evidenceStatus": "received"
        },
        "operationId": "outcome.recordNoAnswer",
        "retention": "full",
        "summary": {
          "code": "stale_device",
          "taskId": "dab8ef13-3f48-4c90-8a92-2f5d38948b3b",
          "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
          "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
          "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd"
        },
        "response": {
          "status": 409,
          "body": {
            "code": "stale_device",
            "type": "https://schemas.tawsel.invalid/problems/stale-device",
            "title": "Device execution unavailable",
            "detail": "حُفظ سجل الهاتف السابق للمراجعة؛ لم يُطبّق.",
            "status": 409,
            "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
            "retryable": false,
            "correlationId": "461c147a-31f1-47ea-9e31-ec29d8a81834"
          }
        }
      }
    }
  },
  {
    "id": "p20-evidence",
    "schema": "device-ownership.schema.json#/$defs/Evidence",
    "valid": true,
    "data": {
      "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
      "result": {
        "receipt": {
          "problem": {
            "code": "stale_device",
            "type": "https://schemas.tawsel.invalid/problems/stale-device",
            "title": "Device execution unavailable",
            "detail": "حُفظ سجل الهاتف السابق للمراجعة؛ لم يُطبّق.",
            "status": 409,
            "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
            "retryable": false,
            "correlationId": "461c147a-31f1-47ea-9e31-ec29d8a81834"
          },
          "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
          "receiptId": "a355a541-6463-40dc-91db-ac959b02b97c",
          "receivedAt": "2026-09-24T08:53:31.917Z",
          "schemaVersion": "1.0.0",
          "businessStatus": "review-required",
          "evidenceStatus": "received"
        },
        "operationId": "outcome.recordNoAnswer",
        "retention": "full",
        "summary": {
          "code": "stale_device",
          "taskId": "dab8ef13-3f48-4c90-8a92-2f5d38948b3b",
          "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
          "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
          "workdayId": "182ed354-6ad6-482b-ada3-55a0be15dabd"
        },
        "response": {
          "status": 409,
          "body": {
            "code": "stale_device",
            "type": "https://schemas.tawsel.invalid/problems/stale-device",
            "title": "Device execution unavailable",
            "detail": "حُفظ سجل الهاتف السابق للمراجعة؛ لم يُطبّق.",
            "status": 409,
            "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
            "retryable": false,
            "correlationId": "461c147a-31f1-47ea-9e31-ec29d8a81834"
          }
        }
      },
      "envelope": {
        "context": {
          "kind": "device",
          "deviceId": "93ff0067-a153-4d1e-9d98-14af64d400fa",
          "tenantId": "07665749-74f8-4ff5-b177-82bc624c5ac5",
          "accountId": "194968b3-a95d-4a9d-a926-ed31f31d3dcd",
          "deviceSequence": 7,
          "deviceGeneration": 1
        },
        "payload": {
          "taskId": "dab8ef13-3f48-4c90-8a92-2f5d38948b3b",
          "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
          "attemptId": "e49d88e0-39f4-46e9-a286-7dcd310a09c5",
          "expectedPinRevision": 0,
          "expectedSourceRevision": 1,
          "expectedActivityRevision": 2,
          "expectedCurrentAttemptId": "e49d88e0-39f4-46e9-a286-7dcd310a09c5",
          "expectedAssignmentRevision": 0
        },
        "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
        "resources": {},
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": "2020-01-01T00:00:00Z"
        },
        "operationId": "outcome.recordNoAnswer",
        "baseVersions": {},
        "schemaVersion": "1.0.0",
        "payloadVersion": "1.0.0",
        "dependsOnActionIds": []
      },
      "durableReceipt": true,
      "recovery": {
        "adoptionImplemented": true,
        "state": "requires-validation",
        "constraints": [],
        "currentGeneration": 2,
        "effectiveOutcomeRevision": 1,
        "activityRevision": 3,
        "adoptedOutcomeId": null
      }
    }
  },
  {
    "id": "p20-former-outcome",
    "schema": "device-ownership.schema.json#/$defs/FormerSubmission",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "outcome.recordNoAnswer",
      "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
      "context": {
        "kind": "device",
        "tenantId": "07665749-74f8-4ff5-b177-82bc624c5ac5",
        "accountId": "194968b3-a95d-4a9d-a926-ed31f31d3dcd",
        "deviceId": "93ff0067-a153-4d1e-9d98-14af64d400fa",
        "deviceGeneration": 1,
        "deviceSequence": 7
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": "2020-01-01T00:00:00Z",
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
        "taskId": "dab8ef13-3f48-4c90-8a92-2f5d38948b3b",
        "attemptId": "e49d88e0-39f4-46e9-a286-7dcd310a09c5",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": "e49d88e0-39f4-46e9-a286-7dcd310a09c5",
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0
      }
    }
  },
  {
    "id": "p20-adoption-designed-only",
    "schema": "device-ownership.schema.json#/$defs/AdoptionCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "evidence.adoptCompatible",
      "actionId": "20000000-0000-4000-8000-000000000020",
      "context": {
        "kind": "device",
        "tenantId": "1ca98984-b3b3-43ed-807c-faf20a9f5d7c",
        "accountId": "2f8f221d-5de3-4e52-9c2d-fb61cd34785d",
        "deviceId": "c78f6af5-a71c-444c-887a-4bdee8085322",
        "deviceGeneration": 1,
        "deviceSequence": 4
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "d2e6b119-4c58-4dd3-b275-90fe91f1576c",
        "evidenceActionId": "25a9c463-0f64-41a4-af5a-002265c2b6b7",
        "evidenceReceiptId": "adac757d-8306-48a9-8966-4a6430ed9a44",
        "expectedGeneration": 2,
        "expectedOutcomeRevision": 1,
        "expectedActivityRevision": 3,
        "expectedSourceRevision": 1,
        "expectedAssignmentRevision": 0,
        "expectedPinRevision": 0
      }
    }
  },
  {
    "id": "p20-notification-1",
    "schema": "device-ownership.schema.json#/$defs/TransferEvent",
    "valid": true,
    "data": {
      "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
      "actionId": "e86d8e6d-bceb-48da-812c-f1f044280b1f",
      "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
      "generation": 2
    }
  },
  {
    "id": "p20-notification-2",
    "schema": "device-ownership.schema.json#/$defs/EvidenceEvent",
    "valid": true,
    "data": {
      "code": "stale_device",
      "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
      "actionId": "b567d447-32e9-4b64-ab35-de666670190e",
      "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
      "businessStatus": "review-required"
    }
  },
  {
    "id": "p20-notification-3",
    "schema": "device-ownership.schema.json#/$defs/EvidenceEvent",
    "valid": true,
    "data": {
      "code": "stale_device",
      "roundId": "6e8b1baf-c58a-464d-8b9d-e72f21780e98",
      "actionId": "1dfa3075-bf05-4609-b621-0b6e9a05d6de",
      "driverId": "95d31b5c-8ac9-4f70-a2e7-39395b1922f2",
      "businessStatus": "review-required"
    }
  },
  {
    "id": "p21-offer-command",
    "schema": "returns.schema.json#/$defs/RequestCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "8a4b0f1a-a63f-44fe-909a-d5b7be4217a1",
      "operationId": "return.requestHandover",
      "context": {
        "kind": "device",
        "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
        "accountId": "6edd53dc-00f8-4626-9dbf-06dde76fbb5a",
        "deviceId": "d6d98987-42bc-4e08-a1c2-41625cf2a310",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "0cd465eb-227d-448a-8b15-bc18e5fffa3c",
        "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "items": [
          {
            "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
            "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
            "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
            "sourceLineId": "pieces",
            "quantity": 3
          }
        ]
      }
    }
  },
  {
    "id": "p21-receive-command",
    "schema": "returns.schema.json#/$defs/ReceiveCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "return.confirmSubsetReceipt",
      "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
      "context": {
        "kind": "integration",
        "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
        "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "receivingBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "items": [
          {
            "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
            "expectedRevision": 0,
            "quantity": 2
          }
        ]
      }
    }
  },
  {
    "id": "p21-loss-command",
    "schema": "returns.schema.json#/$defs/DisposeCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "operationId": "return.recordDisposition",
      "actionId": "52cdfe05-5e9e-47c8-84a2-51cfb3e53e21",
      "context": {
        "kind": "integration",
        "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
        "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "receivingBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "items": [
          {
            "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
            "expectedRevision": 1,
            "quantity": 1
          }
        ],
        "disposition": "lost"
      }
    }
  },
  {
    "id": "p21-offered",
    "schema": "returns.schema.json#/$defs/RequestView",
    "valid": true,
    "data": {
      "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
      "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
      "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
      "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc",
      "roundId": "0cd465eb-227d-448a-8b15-bc18e5fffa3c",
      "requestedAt": "2026-09-24T09:49:04.825Z",
      "items": [
        {
          "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
          "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
          "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
          "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
          "attemptId": "03308e54-4446-4d77-91bd-f54e5c17425c",
          "sourceLineId": "pieces",
          "externalId": "shipment-0",
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "revision": 0,
          "requested": 3,
          "received": 0,
          "lost": 0,
          "damaged": 0,
          "unresolved": 3,
          "eligibility": "pending",
          "custody": {
            "sourceQuantity": 3,
            "delivered": 0,
            "held": 3,
            "received": 0,
            "lost": 0,
            "damaged": 0
          }
        }
      ]
    }
  },
  {
    "id": "p21-received",
    "schema": "returns.schema.json#/$defs/RequestView",
    "valid": true,
    "data": {
      "items": [
        {
          "lost": 0,
          "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
          "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
          "custody": {
            "held": 1,
            "lost": 0,
            "damaged": 0,
            "received": 2,
            "delivered": 0,
            "sourceQuantity": 3
          },
          "damaged": 0,
          "received": 2,
          "revision": 1,
          "attemptId": "03308e54-4446-4d77-91bd-f54e5c17425c",
          "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
          "requested": 3,
          "externalId": "shipment-0",
          "unresolved": 1,
          "eligibility": "pending",
          "sourceLineId": "pieces",
          "sourceRevision": 1,
          "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
          "sourceDispatchCycleId": "cycle"
        }
      ],
      "roundId": "0cd465eb-227d-448a-8b15-bc18e5fffa3c",
      "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
      "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
      "requestedAt": "2026-09-24T09:49:04.825Z",
      "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc",
      "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad"
    }
  },
  {
    "id": "p21-disposed",
    "schema": "returns.schema.json#/$defs/RequestView",
    "valid": true,
    "data": {
      "items": [
        {
          "lost": 1,
          "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
          "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
          "custody": {
            "held": 0,
            "lost": 1,
            "damaged": 0,
            "received": 2,
            "delivered": 0,
            "sourceQuantity": 3
          },
          "damaged": 0,
          "received": 2,
          "revision": 2,
          "attemptId": "03308e54-4446-4d77-91bd-f54e5c17425c",
          "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
          "requested": 3,
          "externalId": "shipment-0",
          "unresolved": 0,
          "eligibility": "settled",
          "sourceLineId": "pieces",
          "sourceRevision": 1,
          "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
          "sourceDispatchCycleId": "cycle"
        }
      ],
      "roundId": "0cd465eb-227d-448a-8b15-bc18e5fffa3c",
      "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
      "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
      "requestedAt": "2026-09-24T09:49:04.825Z",
      "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc",
      "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad"
    }
  },
  {
    "id": "p21-waiting",
    "schema": "returns.schema.json#/$defs/Confirmation",
    "valid": true,
    "data": {
      "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
      "state": "waiting",
      "message": "بانتظار تأكيد الفرع للقطع التي سلّمتها.",
      "claims": [
        {
          "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
          "claimed": 2,
          "confirmed": 0,
          "waiting": 2
        }
      ]
    }
  },
  {
    "id": "p21-confirmed",
    "schema": "returns.schema.json#/$defs/Confirmation",
    "valid": true,
    "data": {
      "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
      "state": "confirmed",
      "message": "أكد الفرع استلام القطع المحددة. الباقي ظاهر بحالته.",
      "claims": [
        {
          "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
          "claimed": 2,
          "confirmed": 2,
          "waiting": 0
        }
      ]
    }
  },
  {
    "id": "p21-unconfirmed",
    "schema": "returns.schema.json#/$defs/Confirmation",
    "valid": true,
    "data": {
      "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
      "state": "waiting",
      "message": "بانتظار تأكيد الفرع للقطع التي سلّمتها.",
      "claims": [
        {
          "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
          "claimed": 3,
          "confirmed": 2,
          "waiting": 1
        }
      ]
    }
  },
  {
    "id": "p21-requested",
    "schema": "returns.schema.json#/$defs/RequestedEvent",
    "valid": true,
    "data": {
      "request": {
        "items": [
          {
            "lost": 0,
            "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
            "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
            "custody": {
              "held": 3,
              "lost": 0,
              "damaged": 0,
              "received": 0,
              "delivered": 0,
              "sourceQuantity": 3
            },
            "damaged": 0,
            "received": 0,
            "revision": 0,
            "attemptId": "03308e54-4446-4d77-91bd-f54e5c17425c",
            "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
            "requested": 3,
            "externalId": "shipment-0",
            "unresolved": 3,
            "eligibility": "pending",
            "sourceLineId": "pieces",
            "sourceRevision": 1,
            "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
            "sourceDispatchCycleId": "cycle"
          }
        ],
        "roundId": "0cd465eb-227d-448a-8b15-bc18e5fffa3c",
        "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "requestedAt": "2026-09-24T09:49:04.825Z",
        "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc",
        "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad"
      }
    }
  },
  {
    "id": "p21-subsetReceived",
    "schema": "returns.schema.json#/$defs/ReceivedEvent",
    "valid": true,
    "data": {
      "transition": {
        "kind": "received",
        "time": {
          "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
          "recordedAt": "2026-09-24T09:49:05.197Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
        "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
        "identity": {
          "mode": "service-operation",
          "actorId": null,
          "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
        },
        "quantity": 2,
        "revision": 1,
        "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "sourceLineId": "pieces",
        "transitionId": "e80ce45b-71aa-444a-9a25-5467467ba7ac",
        "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
        "sourceReference": {
          "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
          "externalId": "shipment-0",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
        },
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p21-dispositionRecorded",
    "schema": "returns.schema.json#/$defs/DispositionEvent",
    "valid": true,
    "data": {
      "transition": {
        "kind": "lost",
        "time": {
          "actionId": "52cdfe05-5e9e-47c8-84a2-51cfb3e53e21",
          "recordedAt": "2026-09-24T09:49:05.294Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
        "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
        "identity": {
          "mode": "service-operation",
          "actorId": null,
          "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
        },
        "quantity": 1,
        "revision": 2,
        "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "sourceLineId": "pieces",
        "transitionId": "d05758d7-6c58-4200-9a4d-a13a7d893277",
        "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
        "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
        "sourceReference": {
          "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
          "externalId": "shipment-0",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
        },
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p21-accepted",
    "schema": "returns.schema.json#/$defs/ActionResult",
    "valid": true,
    "data": {
      "receipt": {
        "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
        "receiptId": "7d8faea4-fd3c-410d-80fc-0f0102ca7931",
        "receivedAt": "2026-09-24T09:49:05.191Z",
        "committedAt": "2026-09-24T09:49:05.222Z",
        "schemaVersion": "1.0.0",
        "businessStatus": "accepted",
        "evidenceStatus": "received",
        "resourceVersions": {}
      },
      "operationId": "return.confirmSubsetReceipt",
      "retention": "full",
      "summary": {
        "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
        "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
        "transitionIds": [
          "e80ce45b-71aa-444a-9a25-5467467ba7ac"
        ]
      },
      "response": {
        "status": 200,
        "body": {
          "request": {
            "items": [
              {
                "lost": 0,
                "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
                "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
                "custody": {
                  "held": 1,
                  "lost": 0,
                  "damaged": 0,
                  "received": 2,
                  "delivered": 0,
                  "sourceQuantity": 3
                },
                "damaged": 0,
                "received": 2,
                "revision": 1,
                "attemptId": "03308e54-4446-4d77-91bd-f54e5c17425c",
                "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
                "requested": 3,
                "externalId": "shipment-0",
                "unresolved": 1,
                "eligibility": "pending",
                "sourceLineId": "pieces",
                "sourceRevision": 1,
                "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
                "sourceDispatchCycleId": "cycle"
              }
            ],
            "roundId": "0cd465eb-227d-448a-8b15-bc18e5fffa3c",
            "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
            "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
            "requestedAt": "2026-09-24T09:49:04.825Z",
            "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc",
            "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad"
          },
          "transitions": [
            {
              "kind": "received",
              "time": {
                "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
                "recordedAt": "2026-09-24T09:49:05.197Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
              "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
              "identity": {
                "mode": "service-operation",
                "actorId": null,
                "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
                "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
              },
              "quantity": 2,
              "revision": 1,
              "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
              "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
              "sourceLineId": "pieces",
              "transitionId": "e80ce45b-71aa-444a-9a25-5467467ba7ac",
              "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
              "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
              "sourceReference": {
                "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
                "externalId": "shipment-0",
                "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
              },
              "sourceDispatchCycleId": "cycle"
            }
          ]
        }
      }
    }
  },
  {
    "id": "p21-recovered",
    "schema": "returns.schema.json#/$defs/ActionStatus",
    "valid": true,
    "data": {
      "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
      "status": "accepted",
      "result": {
        "receipt": {
          "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
          "receiptId": "7d8faea4-fd3c-410d-80fc-0f0102ca7931",
          "receivedAt": "2026-09-24T09:49:05.191Z",
          "committedAt": "2026-09-24T09:49:05.222Z",
          "schemaVersion": "1.0.0",
          "businessStatus": "accepted",
          "evidenceStatus": "received",
          "resourceVersions": {}
        },
        "operationId": "return.confirmSubsetReceipt",
        "retention": "full",
        "summary": {
          "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
          "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
          "transitionIds": [
            "e80ce45b-71aa-444a-9a25-5467467ba7ac"
          ]
        },
        "response": {
          "status": 200,
          "body": {
            "request": {
              "items": [
                {
                  "lost": 0,
                  "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
                  "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
                  "custody": {
                    "held": 1,
                    "lost": 0,
                    "damaged": 0,
                    "received": 2,
                    "delivered": 0,
                    "sourceQuantity": 3
                  },
                  "damaged": 0,
                  "received": 2,
                  "revision": 1,
                  "attemptId": "03308e54-4446-4d77-91bd-f54e5c17425c",
                  "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
                  "requested": 3,
                  "externalId": "shipment-0",
                  "unresolved": 1,
                  "eligibility": "pending",
                  "sourceLineId": "pieces",
                  "sourceRevision": 1,
                  "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
                  "sourceDispatchCycleId": "cycle"
                }
              ],
              "roundId": "0cd465eb-227d-448a-8b15-bc18e5fffa3c",
              "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
              "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
              "requestedAt": "2026-09-24T09:49:04.825Z",
              "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc",
              "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad"
            },
            "transitions": [
              {
                "kind": "received",
                "time": {
                  "actionId": "8cf24011-6cd1-4dbf-a75b-457aeaf3c114",
                  "recordedAt": "2026-09-24T09:49:05.197Z",
                  "observation": {
                    "clock": {
                      "quality": "unknown"
                    },
                    "observedAt": null
                  }
                },
                "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
                "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
                "identity": {
                  "mode": "service-operation",
                  "actorId": null,
                  "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
                  "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
                },
                "quantity": 2,
                "revision": 1,
                "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
                "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
                "sourceLineId": "pieces",
                "transitionId": "e80ce45b-71aa-444a-9a25-5467467ba7ac",
                "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
                "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
                "sourceReference": {
                  "tenantId": "0823e06e-0d1d-40d8-bf31-23db0f02faea",
                  "externalId": "shipment-0",
                  "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc"
                },
                "sourceDispatchCycleId": "cycle"
              }
            ]
          }
        }
      }
    }
  },
  {
    "id": "p22-interrupt",
    "schema": "branch-activity.schema.json#/$defs/InterruptCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "5e688fc2-fc4f-477d-ab4f-b2bb7c001d1f",
      "operationId": "branch.interruptRound",
      "context": {
        "kind": "device",
        "tenantId": "ac60e92f-ea64-432d-b41a-15259b0f8f97",
        "accountId": "047406a8-8ea7-4eb1-87b3-e9e2456a3ce8",
        "deviceId": "5ec13102-7aa9-4c2f-a445-64bd9f100be4",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "expectedActivityRevision": 2,
        "expectedCurrentAttemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688",
        "requestId": "0bcfc092-983d-48fe-8674-a4783da6435b",
        "claims": [
          {
            "itemId": "96f3c91c-aa52-414e-a7fa-23a5ba7f49ab",
            "quantity": 2
          }
        ],
        "serviceEstimateSeconds": 300
      }
    }
  },
  {
    "id": "p22-arrive",
    "schema": "branch-activity.schema.json#/$defs/ArrivalCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "d40ae37c-c1de-463c-8e2a-6b2c5aa98812",
      "operationId": "branch.recordArrival",
      "context": {
        "kind": "device",
        "tenantId": "ac60e92f-ea64-432d-b41a-15259b0f8f97",
        "accountId": "047406a8-8ea7-4eb1-87b3-e9e2456a3ce8",
        "deviceId": "5ec13102-7aa9-4c2f-a445-64bd9f100be4",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "expectedActivityRevision": 3,
        "expectedCurrentAttemptId": null,
        "segmentId": "0262759b-0c24-424c-8e4a-27c9e3df094f",
        "expectedBranchRevision": 1
      }
    }
  },
  {
    "id": "p22-resume",
    "schema": "branch-activity.schema.json#/$defs/ResumeCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "5e569ea1-c5ee-4724-a3bf-3bd85656eefa",
      "operationId": "branch.resumeRound",
      "context": {
        "kind": "device",
        "tenantId": "ac60e92f-ea64-432d-b41a-15259b0f8f97",
        "accountId": "047406a8-8ea7-4eb1-87b3-e9e2456a3ce8",
        "deviceId": "5ec13102-7aa9-4c2f-a445-64bd9f100be4",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "expectedActivityRevision": 4,
        "expectedCurrentAttemptId": null,
        "segmentId": "0262759b-0c24-424c-8e4a-27c9e3df094f",
        "expectedBranchRevision": 2
      }
    }
  },
  {
    "id": "p22-redispatch",
    "schema": "b2b-intake.schema.json#/$defs/RedispatchCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "context": {
        "kind": "integration",
        "tenantId": "ac60e92f-ea64-432d-b41a-15259b0f8f97",
        "integrationId": "39b30496-c78f-4d4d-a657-efbfe4e7bf70"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "actionId": "b6c51493-7433-4959-be8d-7cb6b4b0f6b0",
      "operationId": "dispatch.createFromReceipt",
      "payload": {
        "externalId": "shipment-0",
        "previousDispatchCycleId": "d9b1e377-0c92-46a9-b3b5-c8feba1b48b8",
        "snapshot": {
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "quantity": 2,
              "description": "قطع",
              "sourceLineId": "pieces"
            }
          ],
          "priority": "ordinary",
          "totalDue": {
            "amountMinor": 20000,
            "currency": "EGP",
            "exponent": 2
          },
          "allocation": "exact-outstanding-per-unit",
          "externalId": "shipment-0",
          "destination": {
            "kind": "confirmed-pin",
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            }
          },
          "shippingDue": {
            "amountMinor": 0,
            "currency": "EGP",
            "exponent": 2
          },
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "sourceRevision": 2,
          "splittingAllowed": true,
          "sourceDispatchCycleId": "public-cycle-e57adcf2-868a-4033-a364-eb4b3fc02b1f",
          "expectedSourceRevision": 1,
          "sourceBranchExternalId": "branch"
        }
      }
    }
  },
  {
    "id": "p22-cycles",
    "schema": "b2b-intake.schema.json#/$defs/CycleList",
    "valid": true,
    "data": {
      "items": [
        {
          "latest": true,
          "previousDispatchCycleId": "d9b1e377-0c92-46a9-b3b5-c8feba1b48b8",
          "taskId": "613e29a9-f8e3-5534-afd6-6af4ec35f1cd",
          "dispatchCycleId": "8fee508c-e6a6-4030-a24d-ebcec82262f5",
          "externalId": "shipment-0",
          "sourceDispatchCycleId": "public-cycle-e57adcf2-868a-4033-a364-eb4b3fc02b1f",
          "sourceRevision": 2,
          "assignmentRevision": 0,
          "state": "unassigned",
          "driverId": null,
          "driverExternalId": null,
          "receivedAt": null,
          "editable": true,
          "planningEligible": false,
          "planningStatus": "not-requested",
          "locationReadiness": "confirmed",
          "snapshot": {
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "quantity": 2,
                "description": "قطع",
                "sourceLineId": "pieces"
              }
            ],
            "priority": "ordinary",
            "totalDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 20000
            },
            "allocation": "exact-outstanding-per-unit",
            "externalId": "shipment-0",
            "destination": {
              "kind": "confirmed-pin",
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              }
            },
            "shippingDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            },
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "sourceRevision": 2,
            "splittingAllowed": true,
            "sourceDispatchCycleId": "public-cycle-e57adcf2-868a-4033-a364-eb4b3fc02b1f",
            "expectedSourceRevision": 1,
            "sourceBranchExternalId": "branch"
          }
        },
        {
          "latest": false,
          "previousDispatchCycleId": null,
          "taskId": "613e29a9-f8e3-5534-afd6-6af4ec35f1cd",
          "dispatchCycleId": "d9b1e377-0c92-46a9-b3b5-c8feba1b48b8",
          "externalId": "shipment-0",
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "state": "held",
          "driverId": "f6c70d6d-a3f9-4cbd-9338-b2e2fd06a2b9",
          "driverExternalId": "policy-driver",
          "receivedAt": "2026-09-24T10:38:59.962Z",
          "editable": false,
          "planningEligible": false,
          "planningStatus": "pending",
          "locationReadiness": "confirmed",
          "snapshot": {
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "quantity": 3,
                "description": "قطع",
                "sourceLineId": "pieces"
              }
            ],
            "priority": "ordinary",
            "totalDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 35000
            },
            "allocation": "exact-outstanding-per-unit",
            "externalId": "shipment-0",
            "destination": {
              "kind": "confirmed-pin",
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              }
            },
            "shippingDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "sourceDispatchCycleId": "cycle",
            "expectedSourceRevision": 0,
            "sourceBranchExternalId": "branch"
          }
        }
      ],
      "nextCursor": null
    }
  },
  {
    "id": "p22-resumed-current",
    "schema": "current-activity.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
      "driverId": "f6c70d6d-a3f9-4cbd-9338-b2e2fd06a2b9",
      "branchActivity": null,
      "owner": {
        "accountId": "047406a8-8ea7-4eb1-87b3-e9e2456a3ce8",
        "deviceId": "5ec13102-7aa9-4c2f-a445-64bd9f100be4",
        "generation": 1
      },
      "revision": 5,
      "currentActivity": null,
      "physicalOrigin": {
        "kind": "branch-pin",
        "time": {
          "actionId": "d40ae37c-c1de-463c-8e2a-6b2c5aa98812",
          "recordedAt": "2026-09-24T10:39:00.649Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "taskId": null,
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "revision": 1,
        "attemptId": null,
        "coordinates": {
          "latitude": 30.1,
          "longitude": 31.3
        }
      },
      "planningOrigin": {
        "kind": "branch-pin",
        "coordinates": {
          "latitude": 30.1,
          "longitude": 31.3
        }
      },
      "nextSuggestion": {
        "taskId": "1c0d2caf-c56a-5d7c-ac5f-574b177f4ca0",
        "attemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688",
        "sourceRevision": 1,
        "assignmentRevision": 1,
        "pinRevision": 0,
        "coordinates": {
          "latitude": 30.05,
          "longitude": 31.24
        },
        "recipientName": "عميل بنفس العنوان",
        "recipientPhone": "+201012345678",
        "address": null,
        "delivery": {
          "kind": "company",
          "allowedActions": [
            "full",
            "partial",
            "refusal",
            "no-answer"
          ],
          "fullCollection": {
            "amountMinor": 35000,
            "currency": "EGP",
            "exponent": 2
          },
          "goodsDue": {
            "amountMinor": 30000,
            "currency": "EGP",
            "exponent": 2
          },
          "shippingDue": {
            "amountMinor": 5000,
            "currency": "EGP",
            "exponent": 2
          }
        }
      },
      "planning": {
        "planId": "ed5b0215-f934-4774-a541-a56263ab8d1e",
        "updating": true
      },
      "targets": [
        {
          "taskId": "1c0d2caf-c56a-5d7c-ac5f-574b177f4ca0",
          "attemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "pinRevision": 0,
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "+201012345678",
          "address": null,
          "delivery": {
            "kind": "company",
            "allowedActions": [
              "full",
              "partial",
              "refusal",
              "no-answer"
            ],
            "fullCollection": {
              "amountMinor": 35000,
              "currency": "EGP",
              "exponent": 2
            },
            "goodsDue": {
              "amountMinor": 30000,
              "currency": "EGP",
              "exponent": 2
            },
            "shippingDue": {
              "amountMinor": 5000,
              "currency": "EGP",
              "exponent": 2
            }
          }
        }
      ]
    }
  },
  {
    "id": "p22-interrupted",
    "schema": "branch-activity.schema.json#/$defs/Result",
    "valid": true,
    "data": {
      "planId": "e4307da7-f326-4057-a49a-73fb6a2e8672",
      "branchActivity": {
        "stage": "heading",
        "claims": [
          {
            "itemId": "96f3c91c-aa52-414e-a7fa-23a5ba7f49ab",
            "quantity": 2
          }
        ],
        "arrival": null,
        "heading": {
          "actionId": "5e688fc2-fc4f-477d-ab4f-b2bb7c001d1f",
          "recordedAt": "2026-09-24T10:39:00.565Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "resumed": null,
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "revision": 1,
        "requestId": "0bcfc092-983d-48fe-8674-a4783da6435b",
        "segmentId": "0262759b-0c24-424c-8e4a-27c9e3df094f",
        "coordinates": {
          "latitude": 30.1,
          "longitude": 31.3
        },
        "pausedActivity": {
          "stage": "heading",
          "taskId": "1c0d2caf-c56a-5d7c-ac5f-574b177f4ca0",
          "arrival": null,
          "heading": {
            "actionId": "6484a0c8-1abd-48cc-ac59-9dabbd0cb67a",
            "recordedAt": "2026-09-24T10:39:00.449Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "revision": 2,
          "attemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688"
        },
        "retainedPlanId": "94b3849b-cfc7-4992-bda0-37bbf7fd9e36",
        "sourceBranchId": "0c335ebd-6af9-4998-8095-c99ab9e777cf",
        "retainedSequence": [
          {
            "taskId": "1c0d2caf-c56a-5d7c-ac5f-574b177f4ca0",
            "attemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688"
          }
        ],
        "serviceEstimateSeconds": 300
      },
      "activityRevision": 3
    }
  },
  {
    "id": "p22-arrived",
    "schema": "branch-activity.schema.json#/$defs/Result",
    "valid": true,
    "data": {
      "planId": "73140700-1669-41c9-802d-5259a7152275",
      "branchActivity": {
        "stage": "arrived",
        "claims": [
          {
            "itemId": "96f3c91c-aa52-414e-a7fa-23a5ba7f49ab",
            "quantity": 2
          }
        ],
        "arrival": {
          "actionId": "d40ae37c-c1de-463c-8e2a-6b2c5aa98812",
          "recordedAt": "2026-09-24T10:39:00.649Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "heading": {
          "actionId": "5e688fc2-fc4f-477d-ab4f-b2bb7c001d1f",
          "recordedAt": "2026-09-24T10:39:00.565Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "resumed": null,
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "revision": 2,
        "requestId": "0bcfc092-983d-48fe-8674-a4783da6435b",
        "segmentId": "0262759b-0c24-424c-8e4a-27c9e3df094f",
        "coordinates": {
          "latitude": 30.1,
          "longitude": 31.3
        },
        "pausedActivity": {
          "stage": "heading",
          "taskId": "1c0d2caf-c56a-5d7c-ac5f-574b177f4ca0",
          "arrival": null,
          "heading": {
            "actionId": "6484a0c8-1abd-48cc-ac59-9dabbd0cb67a",
            "recordedAt": "2026-09-24T10:39:00.449Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "revision": 2,
          "attemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688"
        },
        "retainedPlanId": "94b3849b-cfc7-4992-bda0-37bbf7fd9e36",
        "sourceBranchId": "0c335ebd-6af9-4998-8095-c99ab9e777cf",
        "retainedSequence": [
          {
            "taskId": "1c0d2caf-c56a-5d7c-ac5f-574b177f4ca0",
            "attemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688"
          }
        ],
        "serviceEstimateSeconds": 300
      },
      "activityRevision": 4
    }
  },
  {
    "id": "p22-resumed",
    "schema": "branch-activity.schema.json#/$defs/Result",
    "valid": true,
    "data": {
      "planId": "ed5b0215-f934-4774-a541-a56263ab8d1e",
      "branchActivity": {
        "stage": "resumed",
        "claims": [
          {
            "itemId": "96f3c91c-aa52-414e-a7fa-23a5ba7f49ab",
            "quantity": 2
          }
        ],
        "arrival": {
          "actionId": "d40ae37c-c1de-463c-8e2a-6b2c5aa98812",
          "recordedAt": "2026-09-24T10:39:00.649Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "heading": {
          "actionId": "5e688fc2-fc4f-477d-ab4f-b2bb7c001d1f",
          "recordedAt": "2026-09-24T10:39:00.565Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "resumed": {
          "actionId": "5e569ea1-c5ee-4724-a3bf-3bd85656eefa",
          "recordedAt": "2026-09-24T10:39:01.263Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
        "revision": 3,
        "requestId": "0bcfc092-983d-48fe-8674-a4783da6435b",
        "segmentId": "0262759b-0c24-424c-8e4a-27c9e3df094f",
        "coordinates": {
          "latitude": 30.1,
          "longitude": 31.3
        },
        "pausedActivity": {
          "stage": "heading",
          "taskId": "1c0d2caf-c56a-5d7c-ac5f-574b177f4ca0",
          "arrival": null,
          "heading": {
            "actionId": "6484a0c8-1abd-48cc-ac59-9dabbd0cb67a",
            "recordedAt": "2026-09-24T10:39:00.449Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "revision": 2,
          "attemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688"
        },
        "retainedPlanId": "94b3849b-cfc7-4992-bda0-37bbf7fd9e36",
        "sourceBranchId": "0c335ebd-6af9-4998-8095-c99ab9e777cf",
        "retainedSequence": [
          {
            "taskId": "1c0d2caf-c56a-5d7c-ac5f-574b177f4ca0",
            "attemptId": "f88f21db-f1c5-416f-8d29-1d2446b7d688"
          }
        ],
        "serviceEstimateSeconds": 300
      },
      "activityRevision": 5
    }
  },
  {
    "id": "p22-event-0",
    "schema": "branch-activity.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "time": {
        "actionId": "5e688fc2-fc4f-477d-ab4f-b2bb7c001d1f",
        "recordedAt": "2026-09-24T10:39:00.565Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "stage": "heading",
      "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
      "driverId": "f6c70d6d-a3f9-4cbd-9338-b2e2fd06a2b9",
      "segmentId": "0262759b-0c24-424c-8e4a-27c9e3df094f",
      "sourceBranchId": "0c335ebd-6af9-4998-8095-c99ab9e777cf",
      "activityRevision": 3
    }
  },
  {
    "id": "p22-event-1",
    "schema": "branch-activity.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "time": {
        "actionId": "d40ae37c-c1de-463c-8e2a-6b2c5aa98812",
        "recordedAt": "2026-09-24T10:39:00.649Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "stage": "arrived",
      "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
      "driverId": "f6c70d6d-a3f9-4cbd-9338-b2e2fd06a2b9",
      "segmentId": "0262759b-0c24-424c-8e4a-27c9e3df094f",
      "sourceBranchId": "0c335ebd-6af9-4998-8095-c99ab9e777cf",
      "activityRevision": 4
    }
  },
  {
    "id": "p22-event-2",
    "schema": "b2b-intake.schema.json#/$defs/ChangedEvent",
    "valid": true,
    "data": {
      "task": {
        "state": "unassigned",
        "latest": true,
        "taskId": "613e29a9-f8e3-5534-afd6-6af4ec35f1cd",
        "driverId": null,
        "editable": true,
        "snapshot": {
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "quantity": 2,
              "description": "قطع",
              "sourceLineId": "pieces"
            }
          ],
          "priority": "ordinary",
          "totalDue": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 20000
          },
          "allocation": "exact-outstanding-per-unit",
          "externalId": "shipment-0",
          "destination": {
            "kind": "confirmed-pin",
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            }
          },
          "shippingDue": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          },
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "sourceRevision": 2,
          "splittingAllowed": true,
          "sourceDispatchCycleId": "public-cycle-e57adcf2-868a-4033-a364-eb4b3fc02b1f",
          "expectedSourceRevision": 1,
          "sourceBranchExternalId": "branch"
        },
        "externalId": "shipment-0",
        "receivedAt": null,
        "planningStatus": "not-requested",
        "sourceRevision": 2,
        "dispatchCycleId": "8fee508c-e6a6-4030-a24d-ebcec82262f5",
        "driverExternalId": null,
        "planningEligible": false,
        "locationReadiness": "confirmed",
        "assignmentRevision": 0,
        "sourceDispatchCycleId": "public-cycle-e57adcf2-868a-4033-a364-eb4b3fc02b1f",
        "previousDispatchCycleId": "d9b1e377-0c92-46a9-b3b5-c8feba1b48b8"
      },
      "actionId": "b6c51493-7433-4959-be8d-7cb6b4b0f6b0"
    }
  },
  {
    "id": "p22-event-3",
    "schema": "branch-activity.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "time": {
        "actionId": "5e569ea1-c5ee-4724-a3bf-3bd85656eefa",
        "recordedAt": "2026-09-24T10:39:01.263Z",
        "observation": {
          "clock": {
            "quality": "unknown"
          },
          "observedAt": null
        }
      },
      "stage": "resumed",
      "roundId": "6cd9c8a2-86ea-40b3-9416-8e3810f5c4fd",
      "driverId": "f6c70d6d-a3f9-4cbd-9338-b2e2fd06a2b9",
      "segmentId": "0262759b-0c24-424c-8e4a-27c9e3df094f",
      "sourceBranchId": "0c335ebd-6af9-4998-8095-c99ab9e777cf",
      "activityRevision": 5
    }
  },
  {
    "id": "p23-correct-one-piece",
    "schema": "corrections.schema.json#/$defs/CorrectCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "10000000-0000-4000-8000-000000000040",
      "operationId": "outcome.correct",
      "context": {
        "kind": "device",
        "tenantId": "15000000-0000-4000-8000-000000000011",
        "accountId": "15000000-0000-4000-8000-000000000007",
        "deviceId": "15000000-0000-4000-8000-000000000003",
        "deviceGeneration": 1,
        "deviceSequence": 1
      },
      "resources": {
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003",
        "tripId": "15000000-0000-4000-8000-000000000006"
      },
      "baseVersions": {
        "outcomeRevision": 1,
        "deviceGeneration": 1
      },
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": "2026-09-22T09:58:00Z",
        "clock": {
          "quality": "uncertain"
        }
      },
      "payload": {
        "expectedOutcomeRevision": 1,
        "replacement": {
          "outcome": "partial",
          "pieces": [
            {
              "sourceLineId": "pieces",
              "delivered": 1
            }
          ],
          "reportedCollection": {
            "amountMinor": 15000,
            "currency": "EGP",
            "exponent": 2
          }
        },
        "roundId": "15000000-0000-4000-8000-000000000006",
        "taskId": "16000000-0000-4000-8000-000000000002",
        "attemptId": "16000000-0000-4000-8000-000000000003"
      }
    }
  },
  {
    "id": "p23-captured-outcome.corrected-0",
    "schema": "corrections.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "correction": {
        "outcome": {
          "kind": "company",
          "time": {
            "actionId": "0f78f5e4-d8dc-4228-a290-7a44a266566b",
            "recordedAt": "2026-09-24T11:33:56.120Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 1,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 2
            }
          ],
          "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
          "arrival": null,
          "heading": null,
          "outcome": "partial",
          "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
          "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
          "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
          "revision": 2,
          "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
          "outcomeId": "a3a62257-a0b0-4fbe-ae6e-1c00d39e111f",
          "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 15000
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "shippingStatus": "collected",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
          "sourceReference": {
            "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
            "externalId": "shipment-0",
            "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        "correctionId": "5f2c1b2d-5278-4de6-8542-45c639af8d32",
        "evidenceActionId": null,
        "previousRevision": 1,
        "evidenceReceiptId": null,
        "previousOutcomeId": "bf8d6579-2dc1-4d42-b36b-65f8f95302a9"
      },
      "previousOutcome": {
        "kind": "company",
        "time": {
          "actionId": "11d3b921-94a9-417d-8762-7cf8045816c1",
          "recordedAt": "2026-09-24T11:33:55.980Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "lines": [
          {
            "unitDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "delivered": 2,
            "sourceLineId": "pieces",
            "sourceQuantity": 3,
            "heldReturnRequired": 1
          }
        ],
        "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
        "arrival": null,
        "heading": null,
        "outcome": "partial",
        "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
        "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
        "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
        "revision": 1,
        "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
        "outcomeId": "bf8d6579-2dc1-4d42-b36b-65f8f95302a9",
        "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
        "collection": {
          "goods": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 20000
          },
          "reported": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 25000
          },
          "shipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 5000
          },
          "shippingStatus": "collected",
          "unpaidShipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          }
        },
        "returnRequired": true,
        "sourceRevision": 1,
        "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
        "sourceReference": {
          "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
          "externalId": "shipment-0",
          "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
        },
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p23-captured-outcome.corrected-1",
    "schema": "corrections.schema.json#/$defs/Event",
    "valid": true,
    "data": {
      "correction": {
        "outcome": {
          "kind": "company",
          "time": {
            "actionId": "a640dfb0-d5c7-41d6-b150-6c457f8eee16",
            "recordedAt": "2026-09-24T11:33:56.458Z",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            }
          },
          "lines": [
            {
              "unitDue": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 10000
              },
              "delivered": 2,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "heldReturnRequired": 1
            }
          ],
          "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
          "arrival": null,
          "heading": null,
          "outcome": "partial",
          "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
          "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
          "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
          "revision": 3,
          "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
          "outcomeId": "c6b8f2a9-c57c-4096-a464-e10fd1af14b8",
          "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
          "collection": {
            "goods": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 20000
            },
            "reported": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 25000
            },
            "shipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "shippingStatus": "collected",
            "unpaidShipping": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 0
            }
          },
          "returnRequired": true,
          "sourceRevision": 1,
          "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
          "sourceReference": {
            "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
            "externalId": "shipment-0",
            "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
          },
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle"
        },
        "correctionId": "db2f357f-b0ca-4281-8a3f-ea3a1c4b74a7",
        "evidenceActionId": "95f6598a-1ea3-4eb4-bfaf-cd7f442ef0dd",
        "previousRevision": 2,
        "evidenceReceiptId": "eda0efa0-3df3-4e51-b4ae-b4b2cc784316",
        "previousOutcomeId": "a3a62257-a0b0-4fbe-ae6e-1c00d39e111f"
      },
      "previousOutcome": {
        "kind": "company",
        "time": {
          "actionId": "0f78f5e4-d8dc-4228-a290-7a44a266566b",
          "recordedAt": "2026-09-24T11:33:56.120Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "lines": [
          {
            "unitDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "delivered": 1,
            "sourceLineId": "pieces",
            "sourceQuantity": 3,
            "heldReturnRequired": 2
          }
        ],
        "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
        "arrival": null,
        "heading": null,
        "outcome": "partial",
        "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
        "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
        "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
        "revision": 2,
        "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
        "outcomeId": "a3a62257-a0b0-4fbe-ae6e-1c00d39e111f",
        "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
        "collection": {
          "goods": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 10000
          },
          "reported": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 15000
          },
          "shipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 5000
          },
          "shippingStatus": "collected",
          "unpaidShipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          }
        },
        "returnRequired": true,
        "sourceRevision": 1,
        "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
        "sourceReference": {
          "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
          "externalId": "shipment-0",
          "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
        },
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      }
    }
  },
  {
    "id": "p23-captured-evidence.adoptionResolved-2",
    "schema": "corrections.schema.json#/$defs/AdoptionEvent",
    "valid": true,
    "data": {
      "outcomeId": "c6b8f2a9-c57c-4096-a464-e10fd1af14b8",
      "correctionId": "db2f357f-b0ca-4281-8a3f-ea3a1c4b74a7",
      "outcomeRevision": 3,
      "evidenceActionId": "95f6598a-1ea3-4eb4-bfaf-cd7f442ef0dd",
      "evidenceReceiptId": "eda0efa0-3df3-4e51-b4ae-b4b2cc784316"
    }
  },
  {
    "id": "p23-receipt-denied-availability",
    "schema": "corrections.schema.json#/$defs/Availability",
    "valid": true,
    "data": {
      "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
      "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
      "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
      "effectiveOutcomeRevision": 3,
      "effectiveOutcome": {
        "kind": "company",
        "time": {
          "actionId": "a640dfb0-d5c7-41d6-b150-6c457f8eee16",
          "recordedAt": "2026-09-24T11:33:56.458Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "lines": [
          {
            "unitDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "delivered": 2,
            "sourceLineId": "pieces",
            "sourceQuantity": 3,
            "heldReturnRequired": 1
          }
        ],
        "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
        "arrival": null,
        "heading": null,
        "outcome": "partial",
        "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
        "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
        "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
        "revision": 3,
        "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
        "outcomeId": "c6b8f2a9-c57c-4096-a464-e10fd1af14b8",
        "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
        "collection": {
          "goods": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 20000
          },
          "reported": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 25000
          },
          "shipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 5000
          },
          "shippingStatus": "collected",
          "unpaidShipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          }
        },
        "returnRequired": true,
        "sourceRevision": 1,
        "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
        "sourceReference": {
          "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
          "externalId": "shipment-0",
          "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
        },
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      },
      "allowed": false,
      "constraints": [
        "dependent-receipt"
      ],
      "nextSteps": [
        "view-history",
        "erp-commercial-review"
      ],
      "message": "أكد الفرع استلامًا أو تصرفًا في القطع؛ السجل محفوظ والمراجعة التجارية لدى الشركة."
    }
  },
  {
    "id": "monitoring-scoped",
    "schema": "monitoring.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
      "workday": {
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "openedAt": "2026-09-24T12:19:59.849Z",
        "endedAt": null
      },
      "round": {
        "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "startedAt": "2026-09-24T12:19:59.850Z",
        "endedAt": null
      },
      "current": null,
      "nextSuggestion": null,
      "plan": {
        "planId": null,
        "revision": null,
        "orderedTaskIds": [
          "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "d0b2c730-68bc-5590-adaf-2f4a82499d62"
        ]
      },
      "owner": null,
      "progress": {
        "shipments": 2,
        "attempts": 2,
        "processedAttempts": 0,
        "processedShipments": 0,
        "fullDeliveredShipments": 0,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 2
      },
      "groups": {
        "preparedShipments": 0,
        "heldShipments": 2,
        "deferredShipments": 0,
        "returnRequiredShipments": 0,
        "heldPieces": 6,
        "returnRequiredPieces": 0
      },
      "items": [
        {
          "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
          "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        },
        {
          "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
          "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
          "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        }
      ],
      "scopeKey": "607c38c17df8d70fb0b2f00a3618b8e2acea2eb98a09e3e49e702a8d89cf5d48",
      "snapshotRevision": 1,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:19:59.863Z",
        "correlationId": "2c899e242acbba308a26ab90d097bf89"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.062Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:19:59.670Z",
        "integrationDelivery": "unavailable"
      }
    }
  },
  {
    "id": "monitoring-own",
    "schema": "monitoring.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
      "workday": {
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "openedAt": "2026-09-24T12:19:59.849Z",
        "endedAt": null
      },
      "round": {
        "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "startedAt": "2026-09-24T12:19:59.850Z",
        "endedAt": null
      },
      "current": null,
      "nextSuggestion": {
        "taskId": "80b67d20-7870-5086-a948-b1ab93dd6a14",
        "dispatchCycleId": "34a4b9d1-4d4f-486c-b1e2-39b72a27a49b",
        "attemptId": "1d372040-b061-4c58-8e97-4ce689c948d9",
        "branchId": "bd99c8e9-bf83-4f59-a61e-2e7a7ef1e0d7",
        "integrationId": "65b8066b-d84d-4dbb-be37-1d4affeb76f6",
        "sourceRevision": 1,
        "assignmentRevision": 1,
        "recipientName": "SECRET RECIPIENT B",
        "recipientPhone": "01099999999",
        "coordinates": {
          "latitude": 30.987,
          "longitude": 31.987
        },
        "state": "held",
        "earliestAt": null,
        "deferred": false,
        "outcome": null,
        "outcomeRevision": 0,
        "heldPieces": 3,
        "returnRequiredPieces": 0,
        "eligible": true
      },
      "plan": {
        "planId": "d5a6fe01-aea4-4aca-9f4e-5aefccf0fa8a",
        "revision": 2,
        "orderedTaskIds": [
          "80b67d20-7870-5086-a948-b1ab93dd6a14",
          "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "d0b2c730-68bc-5590-adaf-2f4a82499d62"
        ]
      },
      "owner": {
        "accountId": "015d637a-f0e6-4b6e-9cc2-f19bbc66c5a9",
        "deviceId": "1f4a4a50-ba61-416f-bbe1-b7cb37995675",
        "generation": 1
      },
      "progress": {
        "shipments": 3,
        "attempts": 3,
        "processedAttempts": 0,
        "processedShipments": 0,
        "fullDeliveredShipments": 0,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 3
      },
      "groups": {
        "preparedShipments": 0,
        "heldShipments": 3,
        "deferredShipments": 0,
        "returnRequiredShipments": 0,
        "heldPieces": 9,
        "returnRequiredPieces": 0
      },
      "items": [
        {
          "taskId": "80b67d20-7870-5086-a948-b1ab93dd6a14",
          "dispatchCycleId": "34a4b9d1-4d4f-486c-b1e2-39b72a27a49b",
          "attemptId": "1d372040-b061-4c58-8e97-4ce689c948d9",
          "branchId": "bd99c8e9-bf83-4f59-a61e-2e7a7ef1e0d7",
          "integrationId": "65b8066b-d84d-4dbb-be37-1d4affeb76f6",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "SECRET RECIPIENT B",
          "recipientPhone": "01099999999",
          "coordinates": {
            "latitude": 30.987,
            "longitude": 31.987
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        },
        {
          "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
          "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        },
        {
          "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
          "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
          "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        }
      ],
      "scopeKey": "0e6955005bb2411feabf36b9a38922abd43580c7e3b13078a8b0a4016377ad0b",
      "snapshotRevision": 1,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:19:59.971Z",
        "correlationId": "352e3695977f5339a11802b0ae71cae8"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.142Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:19:59.914Z",
        "integrationDelivery": "unavailable"
      }
    }
  },
  {
    "id": "monitoring-corrected",
    "schema": "monitoring.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
      "workday": {
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "openedAt": "2026-09-24T12:19:59.849Z",
        "endedAt": null
      },
      "round": {
        "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
        "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
        "startedAt": "2026-09-24T12:19:59.850Z",
        "endedAt": null
      },
      "current": null,
      "nextSuggestion": null,
      "plan": {
        "planId": null,
        "revision": null,
        "orderedTaskIds": [
          "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "d0b2c730-68bc-5590-adaf-2f4a82499d62"
        ]
      },
      "owner": null,
      "progress": {
        "shipments": 2,
        "attempts": 2,
        "processedAttempts": 1,
        "processedShipments": 1,
        "fullDeliveredShipments": 1,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 1
      },
      "groups": {
        "preparedShipments": 0,
        "heldShipments": 1,
        "deferredShipments": 0,
        "returnRequiredShipments": 0,
        "heldPieces": 3,
        "returnRequiredPieces": 0
      },
      "items": [
        {
          "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
          "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
          "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": "full",
          "outcomeRevision": 2,
          "heldPieces": 0,
          "returnRequiredPieces": 0,
          "eligible": false
        },
        {
          "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
          "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
          "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
          "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
          "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
          "sourceRevision": 1,
          "assignmentRevision": 1,
          "recipientName": "عميل بنفس العنوان",
          "recipientPhone": "01012345678",
          "coordinates": {
            "latitude": 30.05,
            "longitude": 31.24
          },
          "state": "held",
          "earliestAt": null,
          "deferred": false,
          "outcome": null,
          "outcomeRevision": 0,
          "heldPieces": 3,
          "returnRequiredPieces": 0,
          "eligible": true
        }
      ],
      "scopeKey": "607c38c17df8d70fb0b2f00a3618b8e2acea2eb98a09e3e49e702a8d89cf5d48",
      "snapshotRevision": 3,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:20:00.441Z",
        "correlationId": "95f88a8c661c64278cbb2bede54490ef5069a60629c4ab4e0ea6736b9f9fcca9"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.482Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:20:00.389Z",
        "integrationDelivery": "unavailable"
      }
    }
  },
  {
    "id": "monitoring-history",
    "schema": "monitoring.schema.json#/$defs/History",
    "valid": true,
    "data": {
      "resourceId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
      "progress": {
        "shipments": 1,
        "attempts": 1,
        "processedAttempts": 1,
        "processedShipments": 1,
        "fullDeliveredShipments": 1,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 0
      },
      "items": [
        {
          "kind": "cycle",
          "cycle": {
            "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
            "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
            "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "state": "held",
            "receivedAt": "2026-09-24T12:19:59.628Z",
            "departureAt": "2026-09-24T12:19:59.860Z",
            "latest": true
          }
        },
        {
          "kind": "attempt",
          "attempt": {
            "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
            "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
            "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
            "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
            "admittedAt": "2026-09-24T12:19:59.860Z",
            "stage": "resolved"
          }
        },
        {
          "kind": "outcome",
          "outcome": {
            "kind": "company",
            "time": {
              "actionId": "0cc40c71-f0e6-488c-80c0-e1984d376bd8",
              "recordedAt": "2026-09-24T12:20:00.221Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 2,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 1
              }
            ],
            "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
            "arrival": null,
            "heading": null,
            "outcome": "partial",
            "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
            "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
            "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
            "revision": 1,
            "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
            "outcomeId": "55aa7108-f4ae-452a-b7d5-8cdfbcffd815",
            "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 20000
              },
              "reported": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 25000
              },
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 5000
              },
              "shippingStatus": "collected",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": true,
            "sourceRevision": 1,
            "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
            "sourceReference": {
              "tenantId": "c81068eb-447d-4dd9-9787-93e93cec206c",
              "externalId": "shipment-0",
              "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          },
          "effective": false
        },
        {
          "kind": "outcome",
          "outcome": {
            "kind": "company",
            "time": {
              "actionId": "53aa361c-4a5d-43b2-9cd1-8246f65f0744",
              "recordedAt": "2026-09-24T12:20:00.423Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 3,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 0
              }
            ],
            "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
            "arrival": null,
            "heading": null,
            "outcome": "full",
            "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
            "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
            "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
            "revision": 2,
            "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
            "outcomeId": "68241063-d069-45d9-b4e4-a74de9115876",
            "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 30000
              },
              "reported": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 35000
              },
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 5000
              },
              "shippingStatus": "collected",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": false,
            "sourceRevision": 1,
            "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
            "sourceReference": {
              "tenantId": "c81068eb-447d-4dd9-9787-93e93cec206c",
              "externalId": "shipment-0",
              "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          },
          "effective": true
        },
        {
          "kind": "correction",
          "correction": {
            "outcome": {
              "kind": "company",
              "time": {
                "actionId": "53aa361c-4a5d-43b2-9cd1-8246f65f0744",
                "recordedAt": "2026-09-24T12:20:00.423Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "lines": [
                {
                  "unitDue": {
                    "currency": "EGP",
                    "exponent": 2,
                    "amountMinor": 10000
                  },
                  "delivered": 3,
                  "sourceLineId": "pieces",
                  "sourceQuantity": 3,
                  "heldReturnRequired": 0
                }
              ],
              "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
              "arrival": null,
              "heading": null,
              "outcome": "full",
              "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
              "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
              "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
              "revision": 2,
              "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
              "outcomeId": "68241063-d069-45d9-b4e4-a74de9115876",
              "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
              "collection": {
                "goods": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 30000
                },
                "reported": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 35000
                },
                "shipping": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 5000
                },
                "shippingStatus": "collected",
                "unpaidShipping": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 0
                }
              },
              "returnRequired": false,
              "sourceRevision": 1,
              "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
              "sourceReference": {
                "tenantId": "c81068eb-447d-4dd9-9787-93e93cec206c",
                "externalId": "shipment-0",
                "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1"
              },
              "assignmentRevision": 1,
              "sourceDispatchCycleId": "cycle"
            },
            "correctionId": "7b68c711-cc3d-4eb5-9ee5-44ddbe84d71b",
            "evidenceActionId": null,
            "previousRevision": 1,
            "evidenceReceiptId": null,
            "previousOutcomeId": "55aa7108-f4ae-452a-b7d5-8cdfbcffd815"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
            "actionId": "a6d8439c-b79c-4a38-8701-01f7ae9a45cf",
            "operationId": "intake.submitSnapshot",
            "receivedAt": "2026-09-24T12:19:59.599Z",
            "acceptedAt": "2026-09-24T12:19:59.613Z",
            "businessStatus": "accepted"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
            "actionId": "e0a75ce4-88c8-41e5-8918-2c594772edb9",
            "operationId": "assignment.receiveBatch",
            "receivedAt": "2026-09-24T12:19:59.622Z",
            "acceptedAt": "2026-09-24T12:19:59.654Z",
            "businessStatus": "accepted"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "015d637a-f0e6-4b6e-9cc2-f19bbc66c5a9",
            "actionId": "0cc40c71-f0e6-488c-80c0-e1984d376bd8",
            "operationId": "outcome.recordPartial",
            "receivedAt": "2026-09-24T12:20:00.199Z",
            "acceptedAt": "2026-09-24T12:20:00.287Z",
            "businessStatus": "accepted"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "015d637a-f0e6-4b6e-9cc2-f19bbc66c5a9",
            "actionId": "53aa361c-4a5d-43b2-9cd1-8246f65f0744",
            "operationId": "outcome.correct",
            "receivedAt": "2026-09-24T12:20:00.389Z",
            "acceptedAt": "2026-09-24T12:20:00.441Z",
            "businessStatus": "accepted"
          }
        }
      ],
      "scopeKey": "9bfb6089227fae46897f3efb3862b66d8c4d4a2ef95b6e3edcf4b654e68e6c77",
      "snapshotRevision": 1,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:20:00.441Z",
        "correlationId": "95f88a8c661c64278cbb2bede54490ef5069a60629c4ab4e0ea6736b9f9fcca9"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.517Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:20:00.389Z",
        "integrationDelivery": "unavailable"
      }
    }
  },
  {
    "id": "monitoring-workday",
    "schema": "monitoring.schema.json#/$defs/History",
    "valid": true,
    "data": {
      "resourceId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
      "progress": {
        "shipments": 2,
        "attempts": 2,
        "processedAttempts": 1,
        "processedShipments": 1,
        "fullDeliveredShipments": 1,
        "partialShipments": 0,
        "failedShipments": 0,
        "remainingShipments": 1
      },
      "items": [
        {
          "kind": "round",
          "round": {
            "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
            "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
            "startedAt": "2026-09-24T12:19:59.850Z",
            "endedAt": null
          }
        },
        {
          "kind": "cycle",
          "cycle": {
            "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
            "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
            "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "state": "held",
            "receivedAt": "2026-09-24T12:19:59.628Z",
            "departureAt": "2026-09-24T12:19:59.860Z",
            "latest": true
          }
        },
        {
          "kind": "cycle",
          "cycle": {
            "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
            "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
            "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
            "sourceRevision": 1,
            "assignmentRevision": 1,
            "state": "held",
            "receivedAt": "2026-09-24T12:19:59.675Z",
            "departureAt": "2026-09-24T12:19:59.863Z",
            "latest": true
          }
        },
        {
          "kind": "attempt",
          "attempt": {
            "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
            "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
            "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
            "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
            "admittedAt": "2026-09-24T12:19:59.860Z",
            "stage": "resolved"
          }
        },
        {
          "kind": "attempt",
          "attempt": {
            "attemptId": "2aa9ba60-62e0-46c5-855b-1481af89c65f",
            "taskId": "d0b2c730-68bc-5590-adaf-2f4a82499d62",
            "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
            "dispatchCycleId": "af5f1cb0-ee40-4337-b495-beff1eb1c907",
            "admittedAt": "2026-09-24T12:19:59.863Z",
            "stage": "available"
          }
        },
        {
          "kind": "outcome",
          "outcome": {
            "kind": "company",
            "time": {
              "actionId": "0cc40c71-f0e6-488c-80c0-e1984d376bd8",
              "recordedAt": "2026-09-24T12:20:00.221Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 2,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 1
              }
            ],
            "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
            "arrival": null,
            "heading": null,
            "outcome": "partial",
            "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
            "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
            "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
            "revision": 1,
            "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
            "outcomeId": "55aa7108-f4ae-452a-b7d5-8cdfbcffd815",
            "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 20000
              },
              "reported": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 25000
              },
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 5000
              },
              "shippingStatus": "collected",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": true,
            "sourceRevision": 1,
            "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
            "sourceReference": {
              "tenantId": "c81068eb-447d-4dd9-9787-93e93cec206c",
              "externalId": "shipment-0",
              "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          },
          "effective": false
        },
        {
          "kind": "outcome",
          "outcome": {
            "kind": "company",
            "time": {
              "actionId": "53aa361c-4a5d-43b2-9cd1-8246f65f0744",
              "recordedAt": "2026-09-24T12:20:00.423Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 3,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 0
              }
            ],
            "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
            "arrival": null,
            "heading": null,
            "outcome": "full",
            "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
            "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
            "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
            "revision": 2,
            "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
            "outcomeId": "68241063-d069-45d9-b4e4-a74de9115876",
            "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 30000
              },
              "reported": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 35000
              },
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 5000
              },
              "shippingStatus": "collected",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": false,
            "sourceRevision": 1,
            "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
            "sourceReference": {
              "tenantId": "c81068eb-447d-4dd9-9787-93e93cec206c",
              "externalId": "shipment-0",
              "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          },
          "effective": true
        },
        {
          "kind": "correction",
          "correction": {
            "outcome": {
              "kind": "company",
              "time": {
                "actionId": "53aa361c-4a5d-43b2-9cd1-8246f65f0744",
                "recordedAt": "2026-09-24T12:20:00.423Z",
                "observation": {
                  "clock": {
                    "quality": "unknown"
                  },
                  "observedAt": null
                }
              },
              "lines": [
                {
                  "unitDue": {
                    "currency": "EGP",
                    "exponent": 2,
                    "amountMinor": 10000
                  },
                  "delivered": 3,
                  "sourceLineId": "pieces",
                  "sourceQuantity": 3,
                  "heldReturnRequired": 0
                }
              ],
              "taskId": "c79ce8c9-6f4b-55e3-ac93-747367e22f60",
              "arrival": null,
              "heading": null,
              "outcome": "full",
              "roundId": "ba7c403e-e6e1-4793-a9bc-39767c06beb5",
              "branchId": "9c6c8d0f-85f9-492f-bfc8-12a4a22bb01c",
              "driverId": "4f8b6076-c226-44dc-816f-cadc4ab5c517",
              "revision": 2,
              "attemptId": "059a5006-addf-42e2-99dd-86a4d6c7270f",
              "outcomeId": "68241063-d069-45d9-b4e4-a74de9115876",
              "workdayId": "643f0648-1ba5-471a-a17c-a22933a8cf97",
              "collection": {
                "goods": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 30000
                },
                "reported": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 35000
                },
                "shipping": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 5000
                },
                "shippingStatus": "collected",
                "unpaidShipping": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 0
                }
              },
              "returnRequired": false,
              "sourceRevision": 1,
              "dispatchCycleId": "7c453587-5159-48f5-8979-5f51c1a50a9a",
              "sourceReference": {
                "tenantId": "c81068eb-447d-4dd9-9787-93e93cec206c",
                "externalId": "shipment-0",
                "integrationId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1"
              },
              "assignmentRevision": 1,
              "sourceDispatchCycleId": "cycle"
            },
            "correctionId": "7b68c711-cc3d-4eb5-9ee5-44ddbe84d71b",
            "evidenceActionId": null,
            "previousRevision": 1,
            "evidenceReceiptId": null,
            "previousOutcomeId": "55aa7108-f4ae-452a-b7d5-8cdfbcffd815"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
            "actionId": "a6d8439c-b79c-4a38-8701-01f7ae9a45cf",
            "operationId": "intake.submitSnapshot",
            "receivedAt": "2026-09-24T12:19:59.599Z",
            "acceptedAt": "2026-09-24T12:19:59.613Z",
            "businessStatus": "accepted"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
            "actionId": "e0a75ce4-88c8-41e5-8918-2c594772edb9",
            "operationId": "assignment.receiveBatch",
            "receivedAt": "2026-09-24T12:19:59.622Z",
            "acceptedAt": "2026-09-24T12:19:59.654Z",
            "businessStatus": "accepted"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
            "actionId": "4e26bf3d-2b4f-45d5-854d-19cd78dc6f7c",
            "operationId": "intake.submitSnapshot",
            "receivedAt": "2026-09-24T12:19:59.659Z",
            "acceptedAt": "2026-09-24T12:19:59.666Z",
            "businessStatus": "accepted"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "3de3ac9b-dc3d-423d-aec7-2fefab0c8cf1",
            "actionId": "6c9033d7-57a0-462a-86a2-abc2b1242e87",
            "operationId": "assignment.receiveBatch",
            "receivedAt": "2026-09-24T12:19:59.670Z",
            "acceptedAt": "2026-09-24T12:19:59.690Z",
            "businessStatus": "accepted"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "015d637a-f0e6-4b6e-9cc2-f19bbc66c5a9",
            "actionId": "0cc40c71-f0e6-488c-80c0-e1984d376bd8",
            "operationId": "outcome.recordPartial",
            "receivedAt": "2026-09-24T12:20:00.199Z",
            "acceptedAt": "2026-09-24T12:20:00.287Z",
            "businessStatus": "accepted"
          }
        },
        {
          "kind": "action",
          "action": {
            "sourceId": "015d637a-f0e6-4b6e-9cc2-f19bbc66c5a9",
            "actionId": "53aa361c-4a5d-43b2-9cd1-8246f65f0744",
            "operationId": "outcome.correct",
            "receivedAt": "2026-09-24T12:20:00.389Z",
            "acceptedAt": "2026-09-24T12:20:00.441Z",
            "businessStatus": "accepted"
          }
        }
      ],
      "scopeKey": "3f9554c816ee6599d9c4fca8de68144b1659f459c0aa4d6969d72810f0cc2bbe",
      "snapshotRevision": 1,
      "lastCommittedChange": {
        "recordedAt": "2026-09-24T12:20:00.441Z",
        "correlationId": "95f88a8c661c64278cbb2bede54490ef5069a60629c4ab4e0ea6736b9f9fcca9"
      },
      "nextCursor": null,
      "freshness": {
        "refreshedAt": "2026-09-24T12:20:00.585Z",
        "receivedEvidenceOnly": true,
        "deviceContactAt": null,
        "lastReceivedActionAt": "2026-09-24T12:20:00.389Z",
        "integrationDelivery": "unavailable"
      }
    }
  },
  {
    "id": "p25-provisioning.changed",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
        "recipientSequence": 9,
        "type": "integration"
      },
      "committedAt": "2026-09-24T13:28:48.199Z",
      "correlation": {
        "actionId": "56669355-992c-4b6c-9032-5948231a1cc1"
      },
      "eventId": "8475eacb-d53b-404f-849e-63b46e6ea21a",
      "eventKind": "transition",
      "eventType": "provisioning.changed",
      "payload": {
        "actionId": "56669355-992c-4b6c-9032-5948231a1cc1",
        "entity": "role",
        "externalId": "role",
        "resourceId": "808d25d1-39c7-4497-a76d-de06fb0bdde2",
        "service": {
          "actorId": null,
          "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
          "mode": "service-operation",
          "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
        },
        "sourceRevision": 2
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {},
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {
        "sourceRevision": 2
      }
    }
  },
  {
    "id": "p25-task.snapshotAccepted",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
        "recipientSequence": 1,
        "type": "task"
      },
      "committedAt": "2026-09-24T13:28:47.763Z",
      "correlation": {
        "actionId": "664c5484-d514-4c2f-aa55-efef75e768ff"
      },
      "eventId": "da22db3d-9d3c-44fe-8886-7e3ca3ac2b9e",
      "eventKind": "transition",
      "eventType": "task.snapshotAccepted",
      "payload": {
        "actionId": "664c5484-d514-4c2f-aa55-efef75e768ff",
        "task": {
          "assignmentRevision": 0,
          "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
          "driverExternalId": null,
          "driverId": null,
          "editable": true,
          "externalId": "shipment-1",
          "latest": true,
          "locationReadiness": "confirmed",
          "planningEligible": false,
          "planningStatus": "not-requested",
          "previousDispatchCycleId": null,
          "receivedAt": null,
          "snapshot": {
            "allocation": "exact-outstanding-per-unit",
            "destination": {
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              },
              "kind": "confirmed-pin"
            },
            "expectedSourceRevision": 0,
            "externalId": "shipment-1",
            "lines": [
              {
                "description": "قطع",
                "quantity": 3,
                "sourceLineId": "pieces",
                "unitDue": {
                  "amountMinor": 10000,
                  "currency": "EGP",
                  "exponent": 2
                }
              }
            ],
            "priority": "ordinary",
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "shippingDue": {
              "amountMinor": 5000,
              "currency": "EGP",
              "exponent": 2
            },
            "sourceBranchExternalId": "branch",
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "totalDue": {
              "amountMinor": 35000,
              "currency": "EGP",
              "exponent": 2
            }
          },
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "state": "unassigned",
          "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
        }
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
        "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p25-assignment.received",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
        "recipientSequence": 2,
        "type": "task"
      },
      "committedAt": "2026-09-24T13:28:47.809Z",
      "correlation": {
        "actionId": "abf88b67-e0e6-4083-bf47-65c3a30dbbb5"
      },
      "eventId": "c65911e6-b199-4eb1-b06f-ce2ddfc81009",
      "eventKind": "transition",
      "eventType": "assignment.received",
      "payload": {
        "actionId": "abf88b67-e0e6-4083-bf47-65c3a30dbbb5",
        "task": {
          "assignmentRevision": 1,
          "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
          "driverExternalId": "policy-driver",
          "driverId": "a3bf570d-53fb-41c3-8f57-cede24571230",
          "editable": true,
          "externalId": "shipment-1",
          "latest": true,
          "locationReadiness": "confirmed",
          "planningEligible": true,
          "planningStatus": "pending",
          "previousDispatchCycleId": null,
          "receivedAt": "2026-09-24T13:28:47.784Z",
          "snapshot": {
            "allocation": "exact-outstanding-per-unit",
            "destination": {
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              },
              "kind": "confirmed-pin"
            },
            "expectedSourceRevision": 0,
            "externalId": "shipment-1",
            "lines": [
              {
                "description": "قطع",
                "quantity": 3,
                "sourceLineId": "pieces",
                "unitDue": {
                  "amountMinor": 10000,
                  "currency": "EGP",
                  "exponent": 2
                }
              }
            ],
            "priority": "ordinary",
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "shippingDue": {
              "amountMinor": 5000,
              "currency": "EGP",
              "exponent": 2
            },
            "sourceBranchExternalId": "branch",
            "sourceDispatchCycleId": "cycle",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "totalDue": {
              "amountMinor": 35000,
              "currency": "EGP",
              "exponent": 2
            }
          },
          "sourceDispatchCycleId": "cycle",
          "sourceRevision": 1,
          "state": "held",
          "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
        }
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
        "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p25-round.started",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
        "recipientSequence": 1,
        "type": "trip"
      },
      "committedAt": "2026-09-24T13:28:48.166Z",
      "correlation": {
        "actionId": "bb7c4f22-b8c8-4a7a-9977-b4bfde053b2d"
      },
      "eventId": "9cc47884-9265-4435-8cd9-d1a9c2b6491d",
      "eventKind": "transition",
      "eventType": "round.started",
      "payload": {
        "driverId": "a3bf570d-53fb-41c3-8f57-cede24571230",
        "firstForecastId": "cc045528-58a0-47b7-9ded-726e8a7fe407",
        "firstPlanId": "a3e3d9fd-5bb9-46b4-96b8-749addd6bf32",
        "firstWorkloadId": "a648786b-07cf-42b1-b5df-badb6de88f5f",
        "roundId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
        "startedAt": "2026-09-24T13:28:48.135Z",
        "taskIds": [
          "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
          "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01"
        ],
        "workdayId": "1e965ee2-895c-44bc-8aa6-30ea04d615c9"
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "tripId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
        "workdayId": "1e965ee2-895c-44bc-8aa6-30ea04d615c9"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {}
    }
  },
  {
    "id": "p25-outcome.recorded",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
        "recipientSequence": 3,
        "type": "task"
      },
      "committedAt": "2026-09-24T13:28:48.423Z",
      "correlation": {
        "actionId": "660a2b2f-14db-47f4-9bc8-953c7840f669",
        "sourceReference": {
          "externalId": "shipment-1",
          "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
          "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
        }
      },
      "eventId": "7c6e03bc-19bf-48c1-8282-c2d7adcff7bf",
      "eventKind": "transition",
      "eventType": "outcome.recorded",
      "payload": {
        "outcome": {
          "arrival": null,
          "assignmentRevision": 1,
          "attemptId": "154af79d-8371-4ff2-a752-f0a69e472a63",
          "branchId": "cc2109a1-b6ad-41c3-9aef-3be0a5085ed3",
          "collection": {
            "goods": {
              "amountMinor": 0,
              "currency": "EGP",
              "exponent": 2
            },
            "reported": null,
            "shipping": {
              "amountMinor": 0,
              "currency": "EGP",
              "exponent": 2
            },
            "shippingStatus": "not-attempted",
            "unpaidShipping": {
              "amountMinor": 0,
              "currency": "EGP",
              "exponent": 2
            }
          },
          "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
          "driverId": "a3bf570d-53fb-41c3-8f57-cede24571230",
          "heading": null,
          "kind": "company",
          "lines": [
            {
              "delivered": 0,
              "heldReturnRequired": 3,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "unitDue": {
                "amountMinor": 10000,
                "currency": "EGP",
                "exponent": 2
              }
            }
          ],
          "outcome": "no-answer",
          "outcomeId": "20a5dab8-458d-4ce3-9b6e-96e1a5fd38be",
          "returnRequired": true,
          "revision": 1,
          "roundId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
          "sourceDispatchCycleId": "cycle",
          "sourceReference": {
            "externalId": "shipment-1",
            "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
          },
          "sourceRevision": 1,
          "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
          "time": {
            "actionId": "660a2b2f-14db-47f4-9bc8-953c7840f669",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            },
            "recordedAt": "2026-09-24T13:28:48.397Z"
          },
          "workdayId": "1e965ee2-895c-44bc-8aa6-30ea04d615c9"
        }
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "attemptId": "154af79d-8371-4ff2-a752-f0a69e472a63",
        "dispatchCycleId": "ae49d330-638b-4042-af32-a2fca1e61dfb",
        "taskId": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
        "tripId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
        "workdayId": "1e965ee2-895c-44bc-8aa6-30ea04d615c9"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {
        "outcomeRevision": 1,
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p25-outcome.corrected",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
        "recipientSequence": 4,
        "type": "task"
      },
      "committedAt": "2026-09-24T13:28:48.584Z",
      "correlation": {
        "actionId": "123a6619-4925-4fdf-ba0a-f852d9b041de",
        "sourceReference": {
          "externalId": "shipment-0",
          "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
          "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
        }
      },
      "eventId": "48da7d14-baea-4af1-b0e1-9f18cefcb9f8",
      "eventKind": "transition",
      "eventType": "outcome.corrected",
      "payload": {
        "correction": {
          "correctionId": "d9dab4cb-4c4e-47f9-81ba-65e046f814f7",
          "evidenceActionId": null,
          "evidenceReceiptId": null,
          "outcome": {
            "arrival": null,
            "assignmentRevision": 1,
            "attemptId": "683f31da-d067-4e36-96df-55a74491cae7",
            "branchId": "cc2109a1-b6ad-41c3-9aef-3be0a5085ed3",
            "collection": {
              "goods": {
                "amountMinor": 20000,
                "currency": "EGP",
                "exponent": 2
              },
              "reported": {
                "amountMinor": 25000,
                "currency": "EGP",
                "exponent": 2
              },
              "shipping": {
                "amountMinor": 5000,
                "currency": "EGP",
                "exponent": 2
              },
              "shippingStatus": "collected",
              "unpaidShipping": {
                "amountMinor": 0,
                "currency": "EGP",
                "exponent": 2
              }
            },
            "dispatchCycleId": "b867f088-f735-477f-8492-78bb9f65974e",
            "driverId": "a3bf570d-53fb-41c3-8f57-cede24571230",
            "heading": null,
            "kind": "company",
            "lines": [
              {
                "delivered": 2,
                "heldReturnRequired": 1,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "unitDue": {
                  "amountMinor": 10000,
                  "currency": "EGP",
                  "exponent": 2
                }
              }
            ],
            "outcome": "partial",
            "outcomeId": "dd23cbd7-da23-4365-882d-be337a971b53",
            "returnRequired": true,
            "revision": 2,
            "roundId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
            "sourceDispatchCycleId": "cycle",
            "sourceReference": {
              "externalId": "shipment-0",
              "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
              "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
            },
            "sourceRevision": 1,
            "taskId": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
            "time": {
              "actionId": "123a6619-4925-4fdf-ba0a-f852d9b041de",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              },
              "recordedAt": "2026-09-24T13:28:48.554Z"
            },
            "workdayId": "1e965ee2-895c-44bc-8aa6-30ea04d615c9"
          },
          "previousOutcomeId": "dde20a72-fc57-49f6-9123-3bb64b52616a",
          "previousRevision": 1
        },
        "previousOutcome": {
          "arrival": null,
          "assignmentRevision": 1,
          "attemptId": "683f31da-d067-4e36-96df-55a74491cae7",
          "branchId": "cc2109a1-b6ad-41c3-9aef-3be0a5085ed3",
          "collection": {
            "goods": {
              "amountMinor": 0,
              "currency": "EGP",
              "exponent": 2
            },
            "reported": null,
            "shipping": {
              "amountMinor": 0,
              "currency": "EGP",
              "exponent": 2
            },
            "shippingStatus": "not-attempted",
            "unpaidShipping": {
              "amountMinor": 0,
              "currency": "EGP",
              "exponent": 2
            }
          },
          "dispatchCycleId": "b867f088-f735-477f-8492-78bb9f65974e",
          "driverId": "a3bf570d-53fb-41c3-8f57-cede24571230",
          "heading": null,
          "kind": "company",
          "lines": [
            {
              "delivered": 0,
              "heldReturnRequired": 3,
              "sourceLineId": "pieces",
              "sourceQuantity": 3,
              "unitDue": {
                "amountMinor": 10000,
                "currency": "EGP",
                "exponent": 2
              }
            }
          ],
          "outcome": "no-answer",
          "outcomeId": "dde20a72-fc57-49f6-9123-3bb64b52616a",
          "returnRequired": true,
          "revision": 1,
          "roundId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
          "sourceDispatchCycleId": "cycle",
          "sourceReference": {
            "externalId": "shipment-0",
            "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
          },
          "sourceRevision": 1,
          "taskId": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
          "time": {
            "actionId": "7805a808-ca4f-4317-b0cb-9b0e57bfb7f9",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            },
            "recordedAt": "2026-09-24T13:28:48.274Z"
          },
          "workdayId": "1e965ee2-895c-44bc-8aa6-30ea04d615c9"
        }
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "attemptId": "683f31da-d067-4e36-96df-55a74491cae7",
        "dispatchCycleId": "b867f088-f735-477f-8492-78bb9f65974e",
        "taskId": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
        "tripId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
        "workdayId": "1e965ee2-895c-44bc-8aa6-30ea04d615c9"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {
        "outcomeRevision": 2,
        "sourceRevision": 1
      }
    }
  },
  {
    "id": "p25-return.requested",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "7491b2f7-4e1a-4362-ab06-883c7ad0999c",
        "recipientSequence": 1,
        "type": "return-request"
      },
      "committedAt": "2026-09-24T13:28:48.686Z",
      "correlation": {
        "actionId": "2ab98454-49d1-45a2-a290-1c5f1cdd9a8f"
      },
      "eventId": "ac830ff4-017b-445e-8b39-36185141f250",
      "eventKind": "transition",
      "eventType": "return.requested",
      "payload": {
        "request": {
          "driverId": "a3bf570d-53fb-41c3-8f57-cede24571230",
          "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
          "items": [
            {
              "attemptId": "683f31da-d067-4e36-96df-55a74491cae7",
              "custody": {
                "damaged": 0,
                "delivered": 2,
                "held": 1,
                "lost": 0,
                "received": 0,
                "sourceQuantity": 3
              },
              "damaged": 0,
              "dispatchCycleId": "b867f088-f735-477f-8492-78bb9f65974e",
              "eligibility": "pending",
              "externalId": "shipment-0",
              "itemId": "b88b4fd5-ba16-4693-b1b1-ad787cfc8ea6",
              "lost": 0,
              "outcomeId": "dd23cbd7-da23-4365-882d-be337a971b53",
              "received": 0,
              "requested": 1,
              "revision": 0,
              "sourceDispatchCycleId": "cycle",
              "sourceLineId": "pieces",
              "sourceRevision": 1,
              "taskId": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
              "unresolved": 1
            }
          ],
          "requestId": "7491b2f7-4e1a-4362-ab06-883c7ad0999c",
          "requestedAt": "2026-09-24T13:28:48.648Z",
          "roundId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
          "sourceBranchId": "cc2109a1-b6ad-41c3-9aef-3be0a5085ed3"
        }
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "tripId": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {}
    }
  },
  {
    "id": "p25-return.subsetReceived",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "7491b2f7-4e1a-4362-ab06-883c7ad0999c",
        "recipientSequence": 2,
        "type": "return-request"
      },
      "committedAt": "2026-09-24T13:28:48.770Z",
      "correlation": {
        "actionId": "31c09021-5375-4e7e-8131-782be8527a8e",
        "sourceReference": {
          "externalId": "shipment-0",
          "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
          "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
        }
      },
      "eventId": "5ffe71a8-dc5a-439c-8b93-9ef345d06389",
      "eventKind": "transition",
      "eventType": "return.subsetReceived",
      "payload": {
        "transition": {
          "dispatchCycleId": "b867f088-f735-477f-8492-78bb9f65974e",
          "identity": {
            "actorId": null,
            "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "mode": "service-operation",
            "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
          },
          "itemId": "b88b4fd5-ba16-4693-b1b1-ad787cfc8ea6",
          "kind": "received",
          "outcomeId": "dd23cbd7-da23-4365-882d-be337a971b53",
          "quantity": 1,
          "requestId": "7491b2f7-4e1a-4362-ab06-883c7ad0999c",
          "revision": 1,
          "sourceBranchId": "cc2109a1-b6ad-41c3-9aef-3be0a5085ed3",
          "sourceDispatchCycleId": "cycle",
          "sourceLineId": "pieces",
          "sourceReference": {
            "externalId": "shipment-0",
            "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f"
          },
          "taskId": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
          "time": {
            "actionId": "31c09021-5375-4e7e-8131-782be8527a8e",
            "observation": {
              "clock": {
                "quality": "unknown"
              },
              "observedAt": null
            },
            "recordedAt": "2026-09-24T13:28:48.719Z"
          },
          "transitionId": "e0170417-39cc-4f2d-8f9a-c03ff54454a3"
        }
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "dispatchCycleId": "b867f088-f735-477f-8492-78bb9f65974e",
        "taskId": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {}
    }
  },
  {
    "id": "p25-plan.revisionPublished",
    "schema": "events/sender-event.v1.schema.json",
    "valid": true,
    "data": {
      "aggregate": {
        "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
        "recipientSequence": 7,
        "type": "integration"
      },
      "committedAt": "2026-09-24T13:28:48.019Z",
      "correlation": {
        "actionId": "931eec10-d46e-4568-8ccb-4b22ec673cc5"
      },
      "eventId": "99ad1c3f-2505-4ba2-ba3d-b4cb1afbd0f5",
      "eventKind": "transition",
      "eventType": "plan.revisionPublished",
      "payload": {
        "driverId": "a3bf570d-53fb-41c3-8f57-cede24571230",
        "forecastId": "cc045528-58a0-47b7-9ded-726e8a7fe407",
        "jobId": null,
        "planId": "a3e3d9fd-5bb9-46b4-96b8-749addd6bf32",
        "policyValidated": true,
        "revision": 1,
        "state": "manual",
        "status": "manual",
        "workloadId": "a648786b-07cf-42b1-b5df-badb6de88f5f"
      },
      "payloadVersion": "1.0.0",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "resources": {
        "planId": "a3e3d9fd-5bb9-46b4-96b8-749addd6bf32"
      },
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "versions": {}
    }
  },
  {
    "id": "p25-queue-received",
    "schema": "outbox.schema.json#/$defs/Queue",
    "valid": true,
    "data": {
      "items": [
        {
          "eventId": "06b7c9e6-66bc-4725-b245-2b2e5484752b",
          "eventType": "provisioning.changed",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 6
          },
          "createdAt": "2026-09-24T13:28:47.570Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.385Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.857Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "3a120baa-e7dd-4d47-b2f8-a9f0d788ad73",
          "eventType": "provisioning.changed",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 3
          },
          "createdAt": "2026-09-24T13:28:47.493Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.427Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.764Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "48da7d14-baea-4af1-b0e1-9f18cefcb9f8",
          "eventType": "outcome.corrected",
          "aggregate": {
            "type": "task",
            "id": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
            "recipientSequence": 4
          },
          "createdAt": "2026-09-24T13:28:48.584Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.490Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.574Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "5ffe71a8-dc5a-439c-8b93-9ef345d06389",
          "eventType": "return.subsetReceived",
          "aggregate": {
            "type": "return-request",
            "id": "7491b2f7-4e1a-4362-ab06-883c7ad0999c",
            "recipientSequence": 2
          },
          "createdAt": "2026-09-24T13:28:48.770Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.551Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.661Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "62cffc03-2643-456d-8746-5cdd55d66053",
          "eventType": "provisioning.changed",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 4
          },
          "createdAt": "2026-09-24T13:28:47.517Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.745Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.799Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "791c0e56-a7be-4b08-a828-4129a266c1e6",
          "eventType": "provisioning.changed",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 5
          },
          "createdAt": "2026-09-24T13:28:47.550Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.791Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.820Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "7c6e03bc-19bf-48c1-8282-c2d7adcff7bf",
          "eventType": "outcome.recorded",
          "aggregate": {
            "type": "task",
            "id": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
            "recipientSequence": 3
          },
          "createdAt": "2026-09-24T13:28:48.423Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.092Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.525Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "8475eacb-d53b-404f-849e-63b46e6ea21a",
          "eventType": "provisioning.changed",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 9
          },
          "createdAt": "2026-09-24T13:28:48.199Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.743Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.948Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "99ad1c3f-2505-4ba2-ba3d-b4cb1afbd0f5",
          "eventType": "plan.revisionPublished",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 7
          },
          "createdAt": "2026-09-24T13:28:48.019Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.464Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.885Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "9cc47884-9265-4435-8cd9-d1a9c2b6491d",
          "eventType": "round.started",
          "aggregate": {
            "type": "trip",
            "id": "c54a799c-febe-4650-8f1e-fbcf0a78a2bc",
            "recipientSequence": 1
          },
          "createdAt": "2026-09-24T13:28:48.166Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.289Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.434Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "ac830ff4-017b-445e-8b39-36185141f250",
          "eventType": "return.requested",
          "aggregate": {
            "type": "return-request",
            "id": "7491b2f7-4e1a-4362-ab06-883c7ad0999c",
            "recipientSequence": 1
          },
          "createdAt": "2026-09-24T13:28:48.686Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.475Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.617Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "b4360dd6-117e-4515-915e-28e009c6c9d5",
          "eventType": "provisioning.changed",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 2
          },
          "createdAt": "2026-09-24T13:28:47.469Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.660Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.733Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "b76ff331-0882-4df8-94e3-f3626e9181e6",
          "eventType": "provisioning.changed",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 1
          },
          "createdAt": "2026-09-24T13:28:47.412Z",
          "status": "received",
          "attempts": 2,
          "nextAttemptAt": "2026-09-24T13:28:50.899Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.705Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "c65911e6-b199-4eb1-b06f-ce2ddfc81009",
          "eventType": "assignment.received",
          "aggregate": {
            "type": "task",
            "id": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
            "recipientSequence": 2
          },
          "createdAt": "2026-09-24T13:28:47.809Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:49.905Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.390Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "c7d79915-eadb-4f47-9b2e-97f6ae785301",
          "eventType": "provisioning.changed",
          "aggregate": {
            "type": "integration",
            "id": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
            "recipientSequence": 8
          },
          "createdAt": "2026-09-24T13:28:48.189Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.504Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.914Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "c80d04ff-cd18-4e1c-9a30-7174419dafb2",
          "eventType": "assignment.received",
          "aggregate": {
            "type": "task",
            "id": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
            "recipientSequence": 2
          },
          "createdAt": "2026-09-24T13:28:47.739Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:49.859Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.302Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "da22db3d-9d3c-44fe-8886-7e3ca3ac2b9e",
          "eventType": "task.snapshotAccepted",
          "aggregate": {
            "type": "task",
            "id": "6ad5b957-2cdd-56c6-a3ec-7b78ddb42c01",
            "recipientSequence": 1
          },
          "createdAt": "2026-09-24T13:28:47.763Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.251Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.346Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "f1842964-e5fb-49cc-954a-4ba9c2a6dfcf",
          "eventType": "outcome.recorded",
          "aggregate": {
            "type": "task",
            "id": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
            "recipientSequence": 3
          },
          "createdAt": "2026-09-24T13:28:48.356Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:50.071Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.486Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        },
        {
          "eventId": "ff011193-e875-4265-a2a7-670863dbfa8c",
          "eventType": "task.snapshotAccepted",
          "aggregate": {
            "type": "task",
            "id": "2374bf61-cd41-5bd4-a30d-ca62d8ee8c45",
            "recipientSequence": 1
          },
          "createdAt": "2026-09-24T13:28:47.655Z",
          "status": "received",
          "attempts": 1,
          "nextAttemptAt": "2026-09-24T13:28:49.851Z",
          "leaseUntil": null,
          "receivedAt": "2026-09-24T13:28:49.240Z",
          "lastError": null,
          "projectionStatus": "unknown",
          "blockedBy": null
        }
      ],
      "nextCursor": null,
      "counts": {
        "pending": 0,
        "sending": 0,
        "failed": 0,
        "received": 19
      },
      "oldestUnreceivedAt": null,
      "projectionStatus": "unknown"
    }
  },
  {
    "id": "p25-receipt-only",
    "schema": "outbox.schema.json#/$defs/Acknowledgement",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
      "recipientIntegrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e",
      "eventId": "da22db3d-9d3c-44fe-8886-7e3ca3ac2b9e",
      "acknowledgement": "received"
    }
  },
  {
    "id": "p26-captured-current-task-0",
    "schema": "consumer.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
      "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
      "aggregate": {
        "type": "task",
        "id": "9b17903d-a45d-5953-a979-1602ba81f89b"
      },
      "throughSequence": 3,
      "capturedAt": "2026-09-24T14:58:43.679Z",
      "state": {
        "task": {
          "state": "held",
          "latest": true,
          "taskId": "9b17903d-a45d-5953-a979-1602ba81f89b",
          "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
          "editable": true,
          "snapshot": {
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "quantity": 3,
                "description": "قطع",
                "sourceLineId": "pieces"
              }
            ],
            "priority": "ordinary",
            "totalDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 35000
            },
            "allocation": "exact-outstanding-per-unit",
            "externalId": "shipment-1",
            "destination": {
              "kind": "confirmed-pin",
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              }
            },
            "shippingDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "sourceDispatchCycleId": "cycle",
            "expectedSourceRevision": 0,
            "sourceBranchExternalId": "branch"
          },
          "externalId": "shipment-1",
          "receivedAt": "2026-09-24T14:58:28.583Z",
          "planningStatus": "pending",
          "sourceRevision": 1,
          "dispatchCycleId": "1f7b4139-e310-4fb1-a2ef-177a2e90e0cd",
          "driverExternalId": "policy-driver",
          "planningEligible": true,
          "locationReadiness": "confirmed",
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle",
          "previousDispatchCycleId": null
        },
        "notices": [],
        "outcomes": [
          {
            "kind": "company",
            "time": {
              "actionId": "75b8bae6-daaa-48e1-93c2-25fad9ba4b58",
              "recordedAt": "2026-09-24T14:58:29.293Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 0,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 3
              }
            ],
            "taskId": "9b17903d-a45d-5953-a979-1602ba81f89b",
            "arrival": null,
            "heading": null,
            "outcome": "no-answer",
            "roundId": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
            "branchId": "80c1cfe8-e95e-4e97-851c-92c81aa7d9cf",
            "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
            "revision": 1,
            "attemptId": "623ec0f0-92be-4793-92ad-5509af3a72f0",
            "outcomeId": "fc0ac285-c3dc-453f-b924-7cc88ed6c974",
            "workdayId": "10b90bdc-99b4-4a22-bd6c-7075947e6a21",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              },
              "reported": null,
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              },
              "shippingStatus": "not-attempted",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": true,
            "sourceRevision": 1,
            "dispatchCycleId": "1f7b4139-e310-4fb1-a2ef-177a2e90e0cd",
            "sourceReference": {
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "externalId": "shipment-1",
              "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          }
        ],
        "returnItems": [],
        "returnRequest": null
      },
      "history": "current-state-only",
      "retention": "indefinite-no-purge"
    }
  },
  {
    "id": "p26-captured-current-integration-1",
    "schema": "consumer.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
      "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
      "aggregate": {
        "type": "integration",
        "id": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
      },
      "throughSequence": 9,
      "capturedAt": "2026-09-24T14:58:43.689Z",
      "state": {
        "task": null,
        "notices": [
          {
            "key": "provisioning.changed/branch/80c1cfe8-e95e-4e97-851c-92c81aa7d9cf",
            "event": {
              "eventId": "94805f60-3037-4769-ad84-6661031166c8",
              "payload": {
                "entity": "branch",
                "service": {
                  "mode": "service-operation",
                  "actorId": null,
                  "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
                  "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
                },
                "actionId": "3198232a-41c2-4d5b-a479-506c37ef3ae7",
                "externalId": "branch",
                "resourceId": "80c1cfe8-e95e-4e97-851c-92c81aa7d9cf",
                "sourceRevision": 1
              },
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "versions": {
                "sourceRevision": 1
              },
              "aggregate": {
                "id": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
                "type": "integration",
                "recipientSequence": 3
              },
              "eventKind": "transition",
              "eventType": "provisioning.changed",
              "resources": {},
              "committedAt": "2026-09-24T14:58:28.261Z",
              "correlation": {
                "actionId": "3198232a-41c2-4d5b-a479-506c37ef3ae7"
              },
              "schemaVersion": "1.0.0",
              "payloadVersion": "1.0.0",
              "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            }
          },
          {
            "key": "provisioning.changed/user/b3e1668a-5dd8-4e8e-a4c3-fcc06fe561a7",
            "event": {
              "eventId": "81a7aad8-b903-4cc7-962b-29877281e81f",
              "payload": {
                "entity": "user",
                "service": {
                  "mode": "service-operation",
                  "actorId": null,
                  "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
                  "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
                },
                "actionId": "ba5aad27-2600-45be-9f84-381168e61fd1",
                "externalId": "policy-driver",
                "resourceId": "b3e1668a-5dd8-4e8e-a4c3-fcc06fe561a7",
                "sourceRevision": 1
              },
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "versions": {
                "sourceRevision": 1
              },
              "aggregate": {
                "id": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
                "type": "integration",
                "recipientSequence": 5
              },
              "eventKind": "transition",
              "eventType": "provisioning.changed",
              "resources": {},
              "committedAt": "2026-09-24T14:58:28.326Z",
              "correlation": {
                "actionId": "ba5aad27-2600-45be-9f84-381168e61fd1"
              },
              "schemaVersion": "1.0.0",
              "payloadVersion": "1.0.0",
              "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            }
          },
          {
            "key": "provisioning.changed/driver/995bed0f-6892-476a-9514-4b0a4a14576f",
            "event": {
              "eventId": "15807b13-6f86-402e-bf0c-cec506a66fba",
              "payload": {
                "entity": "driver",
                "service": {
                  "mode": "service-operation",
                  "actorId": null,
                  "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
                  "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
                },
                "actionId": "1c68c4cc-1e5e-44a5-b2de-703001bc11db",
                "externalId": "policy-driver",
                "resourceId": "995bed0f-6892-476a-9514-4b0a4a14576f",
                "sourceRevision": 1
              },
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "versions": {
                "sourceRevision": 1
              },
              "aggregate": {
                "id": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
                "type": "integration",
                "recipientSequence": 6
              },
              "eventKind": "transition",
              "eventType": "provisioning.changed",
              "resources": {},
              "committedAt": "2026-09-24T14:58:28.347Z",
              "correlation": {
                "actionId": "1c68c4cc-1e5e-44a5-b2de-703001bc11db"
              },
              "schemaVersion": "1.0.0",
              "payloadVersion": "1.0.0",
              "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            }
          },
          {
            "key": "plan.revisionPublished",
            "event": {
              "eventId": "70a0f2ea-86cb-4425-900b-86ff822b3281",
              "payload": {
                "jobId": null,
                "state": "manual",
                "planId": "d843087a-d155-4bbf-8287-177d6c41a211",
                "status": "manual",
                "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
                "revision": 1,
                "forecastId": "7ac0351e-8d3d-4950-b0c2-8b6c3a3157f8",
                "workloadId": "eb2c7734-624e-477d-833a-495dd28e15b0",
                "policyValidated": true
              },
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "versions": {},
              "aggregate": {
                "id": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
                "type": "integration",
                "recipientSequence": 7
              },
              "eventKind": "transition",
              "eventType": "plan.revisionPublished",
              "resources": {
                "planId": "d843087a-d155-4bbf-8287-177d6c41a211"
              },
              "committedAt": "2026-09-24T14:58:28.872Z",
              "correlation": {
                "actionId": "a3e4b2c6-9825-4503-93fb-01e0aac2a091"
              },
              "schemaVersion": "1.0.0",
              "payloadVersion": "1.0.0",
              "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            }
          },
          {
            "key": "provisioning.changed/source/5f338a1d-4bdf-4f18-83cb-981b16076ceb",
            "event": {
              "eventId": "56c0adbb-59ef-40d1-9f09-41e47245dd2e",
              "payload": {
                "entity": "source",
                "service": {
                  "mode": "service-operation",
                  "actorId": null,
                  "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
                  "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
                },
                "actionId": "06f50efa-a90b-4f46-83ab-b111c61ad9d8",
                "externalId": "erp",
                "resourceId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
                "sourceRevision": 3
              },
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "versions": {
                "sourceRevision": 3
              },
              "aggregate": {
                "id": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
                "type": "integration",
                "recipientSequence": 8
              },
              "eventKind": "transition",
              "eventType": "provisioning.changed",
              "resources": {},
              "committedAt": "2026-09-24T14:58:29.073Z",
              "correlation": {
                "actionId": "06f50efa-a90b-4f46-83ab-b111c61ad9d8"
              },
              "schemaVersion": "1.0.0",
              "payloadVersion": "1.0.0",
              "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            }
          },
          {
            "key": "provisioning.changed/role/aa457999-72ca-4ef6-840f-ac16d32ccb36",
            "event": {
              "eventId": "37427985-335f-4b4d-b4c6-67f35a248d76",
              "payload": {
                "entity": "role",
                "service": {
                  "mode": "service-operation",
                  "actorId": null,
                  "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
                  "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
                },
                "actionId": "94cf1a5f-d74d-4bda-ba47-052eeee61e72",
                "externalId": "role",
                "resourceId": "aa457999-72ca-4ef6-840f-ac16d32ccb36",
                "sourceRevision": 2
              },
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "versions": {
                "sourceRevision": 2
              },
              "aggregate": {
                "id": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
                "type": "integration",
                "recipientSequence": 9
              },
              "eventKind": "transition",
              "eventType": "provisioning.changed",
              "resources": {},
              "committedAt": "2026-09-24T14:58:29.085Z",
              "correlation": {
                "actionId": "94cf1a5f-d74d-4bda-ba47-052eeee61e72"
              },
              "schemaVersion": "1.0.0",
              "payloadVersion": "1.0.0",
              "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            }
          }
        ],
        "outcomes": [],
        "returnItems": [],
        "returnRequest": null
      },
      "history": "current-state-only",
      "retention": "indefinite-no-purge"
    }
  },
  {
    "id": "p26-captured-current-task-2",
    "schema": "consumer.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
      "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
      "aggregate": {
        "type": "task",
        "id": "4b75cb9c-7371-565b-a4df-c15e5c22669b"
      },
      "throughSequence": 4,
      "capturedAt": "2026-09-24T14:58:43.709Z",
      "state": {
        "task": {
          "state": "held",
          "latest": true,
          "taskId": "4b75cb9c-7371-565b-a4df-c15e5c22669b",
          "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
          "editable": true,
          "snapshot": {
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "quantity": 3,
                "description": "قطع",
                "sourceLineId": "pieces"
              }
            ],
            "priority": "ordinary",
            "totalDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 35000
            },
            "allocation": "exact-outstanding-per-unit",
            "externalId": "shipment-0",
            "destination": {
              "kind": "confirmed-pin",
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              }
            },
            "shippingDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "sourceDispatchCycleId": "cycle",
            "expectedSourceRevision": 0,
            "sourceBranchExternalId": "branch"
          },
          "externalId": "shipment-0",
          "receivedAt": "2026-09-24T14:58:28.466Z",
          "planningStatus": "pending",
          "sourceRevision": 1,
          "dispatchCycleId": "037f1d8a-e0fd-47d5-9d2e-609538e76c75",
          "driverExternalId": "policy-driver",
          "planningEligible": true,
          "locationReadiness": "confirmed",
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle",
          "previousDispatchCycleId": null
        },
        "notices": [],
        "outcomes": [
          {
            "kind": "company",
            "time": {
              "actionId": "3a4c38cc-14e2-4681-8d96-8485c16a2829",
              "recordedAt": "2026-09-24T14:58:29.488Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 2,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 1
              }
            ],
            "taskId": "4b75cb9c-7371-565b-a4df-c15e5c22669b",
            "arrival": null,
            "heading": null,
            "outcome": "partial",
            "roundId": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
            "branchId": "80c1cfe8-e95e-4e97-851c-92c81aa7d9cf",
            "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
            "revision": 2,
            "attemptId": "1788f2e9-45fe-4ea2-ae1e-ab1f509e1bb2",
            "outcomeId": "1791b337-fa38-4fa9-b6e3-f5844887c6dc",
            "workdayId": "10b90bdc-99b4-4a22-bd6c-7075947e6a21",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 20000
              },
              "reported": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 25000
              },
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 5000
              },
              "shippingStatus": "collected",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": true,
            "sourceRevision": 1,
            "dispatchCycleId": "037f1d8a-e0fd-47d5-9d2e-609538e76c75",
            "sourceReference": {
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "externalId": "shipment-0",
              "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          }
        ],
        "returnItems": [],
        "returnRequest": null
      },
      "history": "current-state-only",
      "retention": "indefinite-no-purge"
    }
  },
  {
    "id": "p26-captured-current-trip-3",
    "schema": "consumer.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
      "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
      "aggregate": {
        "type": "trip",
        "id": "eeceb60a-784c-461f-b4e8-1bdd6b341e45"
      },
      "throughSequence": 1,
      "capturedAt": "2026-09-24T14:58:43.724Z",
      "state": {
        "task": null,
        "notices": [
          {
            "key": "round.started",
            "event": {
              "eventId": "321a5727-8589-4c3e-837c-29b923d50b67",
              "payload": {
                "roundId": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
                "taskIds": [
                  "4b75cb9c-7371-565b-a4df-c15e5c22669b",
                  "9b17903d-a45d-5953-a979-1602ba81f89b"
                ],
                "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
                "startedAt": "2026-09-24T14:58:29.004Z",
                "workdayId": "10b90bdc-99b4-4a22-bd6c-7075947e6a21",
                "firstPlanId": "d843087a-d155-4bbf-8287-177d6c41a211",
                "firstForecastId": "7ac0351e-8d3d-4950-b0c2-8b6c3a3157f8",
                "firstWorkloadId": "eb2c7734-624e-477d-833a-495dd28e15b0"
              },
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "versions": {},
              "aggregate": {
                "id": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
                "type": "trip",
                "recipientSequence": 1
              },
              "eventKind": "transition",
              "eventType": "round.started",
              "resources": {
                "tripId": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
                "workdayId": "10b90bdc-99b4-4a22-bd6c-7075947e6a21"
              },
              "committedAt": "2026-09-24T14:58:29.053Z",
              "correlation": {
                "actionId": "16a4761f-dd8a-496f-bd45-dab605547ff7"
              },
              "schemaVersion": "1.0.0",
              "payloadVersion": "1.0.0",
              "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            }
          }
        ],
        "outcomes": [],
        "returnItems": [],
        "returnRequest": null
      },
      "history": "current-state-only",
      "retention": "indefinite-no-purge"
    }
  },
  {
    "id": "p26-captured-current-return-request-4",
    "schema": "consumer.schema.json#/$defs/Snapshot",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
      "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
      "aggregate": {
        "type": "return-request",
        "id": "9b9a235d-e5d0-4100-bbe4-d6dd437ad60c"
      },
      "throughSequence": 2,
      "capturedAt": "2026-09-24T14:58:43.739Z",
      "state": {
        "task": null,
        "notices": [],
        "outcomes": [],
        "returnItems": [
          {
            "lost": 0,
            "itemId": "ce759e17-94be-4d8b-ae5b-c1743fae6e43",
            "taskId": "4b75cb9c-7371-565b-a4df-c15e5c22669b",
            "damaged": 0,
            "received": 1,
            "requested": 1,
            "unresolved": 0,
            "sourceLineId": "pieces"
          }
        ],
        "returnRequest": {
          "items": [
            {
              "lost": 0,
              "itemId": "ce759e17-94be-4d8b-ae5b-c1743fae6e43",
              "taskId": "4b75cb9c-7371-565b-a4df-c15e5c22669b",
              "custody": {
                "held": 1,
                "lost": 0,
                "damaged": 0,
                "received": 0,
                "delivered": 2,
                "sourceQuantity": 3
              },
              "damaged": 0,
              "received": 0,
              "revision": 0,
              "attemptId": "1788f2e9-45fe-4ea2-ae1e-ab1f509e1bb2",
              "outcomeId": "1791b337-fa38-4fa9-b6e3-f5844887c6dc",
              "requested": 1,
              "externalId": "shipment-0",
              "unresolved": 1,
              "eligibility": "pending",
              "sourceLineId": "pieces",
              "sourceRevision": 1,
              "dispatchCycleId": "037f1d8a-e0fd-47d5-9d2e-609538e76c75",
              "sourceDispatchCycleId": "cycle"
            }
          ],
          "roundId": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
          "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
          "requestId": "9b9a235d-e5d0-4100-bbe4-d6dd437ad60c",
          "requestedAt": "2026-09-24T14:58:29.636Z",
          "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
          "sourceBranchId": "80c1cfe8-e95e-4e97-851c-92c81aa7d9cf"
        }
      },
      "history": "current-state-only",
      "retention": "indefinite-no-purge"
    }
  },
  {
    "id": "p26-captured-applied-report-0",
    "schema": "consumer.schema.json#/$defs/ReportRead",
    "valid": true,
    "data": {
      "report": {
        "checkpoint": {
          "revision": 39,
          "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
          "aggregate": {
            "id": "9b17903d-a45d-5953-a979-1602ba81f89b",
            "type": "task"
          },
          "appliedAt": "2026-09-24T14:58:42.514Z",
          "lastError": null,
          "receivedAt": "2026-09-24T14:58:41.315Z",
          "pendingCount": 0,
          "receivedHigh": 3,
          "schemaVersion": "1.0.0",
          "appliedThrough": 3,
          "historyComplete": true,
          "receivedThrough": 3,
          "snapshotThrough": 0,
          "projectedThrough": 3,
          "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
        },
        "reportedAt": "2026-09-24T14:58:42.926Z",
        "evidence": "receiver-reported"
      }
    }
  },
  {
    "id": "p26-captured-applied-report-1",
    "schema": "consumer.schema.json#/$defs/ReportRead",
    "valid": true,
    "data": {
      "report": {
        "checkpoint": {
          "revision": 39,
          "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
          "aggregate": {
            "id": "5f338a1d-4bdf-4f18-83cb-981b16076ceb",
            "type": "integration"
          },
          "appliedAt": "2026-09-24T14:58:42.497Z",
          "lastError": null,
          "receivedAt": "2026-09-24T14:58:41.249Z",
          "pendingCount": 0,
          "receivedHigh": 9,
          "schemaVersion": "1.0.0",
          "appliedThrough": 9,
          "historyComplete": true,
          "receivedThrough": 9,
          "snapshotThrough": 0,
          "projectedThrough": 9,
          "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
        },
        "reportedAt": "2026-09-24T14:58:42.884Z",
        "evidence": "receiver-reported"
      }
    }
  },
  {
    "id": "p26-captured-applied-report-2",
    "schema": "consumer.schema.json#/$defs/ReportRead",
    "valid": true,
    "data": {
      "report": {
        "checkpoint": {
          "revision": 39,
          "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
          "aggregate": {
            "id": "4b75cb9c-7371-565b-a4df-c15e5c22669b",
            "type": "task"
          },
          "appliedAt": "2026-09-24T14:58:42.518Z",
          "lastError": null,
          "receivedAt": "2026-09-24T14:58:41.347Z",
          "pendingCount": 0,
          "receivedHigh": 4,
          "schemaVersion": "1.0.0",
          "appliedThrough": 4,
          "historyComplete": true,
          "receivedThrough": 4,
          "snapshotThrough": 0,
          "projectedThrough": 4,
          "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
        },
        "reportedAt": "2026-09-24T14:58:42.966Z",
        "evidence": "receiver-reported"
      }
    }
  },
  {
    "id": "p26-captured-applied-report-3",
    "schema": "consumer.schema.json#/$defs/ReportRead",
    "valid": true,
    "data": {
      "report": {
        "checkpoint": {
          "revision": 39,
          "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
          "aggregate": {
            "id": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
            "type": "trip"
          },
          "appliedAt": "2026-09-24T14:58:42.485Z",
          "lastError": null,
          "receivedAt": "2026-09-24T14:58:41.199Z",
          "pendingCount": 0,
          "receivedHigh": 1,
          "schemaVersion": "1.0.0",
          "appliedThrough": 1,
          "historyComplete": true,
          "receivedThrough": 1,
          "snapshotThrough": 0,
          "projectedThrough": 1,
          "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
        },
        "reportedAt": "2026-09-24T14:58:42.643Z",
        "evidence": "receiver-reported"
      }
    }
  },
  {
    "id": "p26-captured-applied-report-4",
    "schema": "consumer.schema.json#/$defs/ReportRead",
    "valid": true,
    "data": {
      "report": {
        "checkpoint": {
          "revision": 39,
          "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
          "aggregate": {
            "id": "9b9a235d-e5d0-4100-bbe4-d6dd437ad60c",
            "type": "return-request"
          },
          "appliedAt": "2026-09-24T14:58:42.530Z",
          "lastError": null,
          "receivedAt": "2026-09-24T14:58:41.399Z",
          "pendingCount": 0,
          "receivedHigh": 2,
          "schemaVersion": "1.0.0",
          "appliedThrough": 2,
          "historyComplete": true,
          "receivedThrough": 2,
          "snapshotThrough": 0,
          "projectedThrough": 2,
          "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
        },
        "reportedAt": "2026-09-24T14:58:42.999Z",
        "evidence": "receiver-reported"
      }
    }
  },
  {
    "id": "p26-captured-consumer-status",
    "schema": "consumer.schema.json#/$defs/Status",
    "valid": true,
    "data": {
      "checkpoint": {
        "revision": 39,
        "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
        "aggregate": {
          "id": "9b17903d-a45d-5953-a979-1602ba81f89b",
          "type": "task"
        },
        "appliedAt": "2026-09-24T14:58:42.514Z",
        "lastError": null,
        "receivedAt": "2026-09-24T14:58:41.315Z",
        "pendingCount": 0,
        "receivedHigh": 3,
        "schemaVersion": "1.0.0",
        "appliedThrough": 3,
        "historyComplete": true,
        "receivedThrough": 3,
        "snapshotThrough": 0,
        "projectedThrough": 3,
        "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
      },
      "state": {
        "task": {
          "state": "held",
          "latest": true,
          "taskId": "9b17903d-a45d-5953-a979-1602ba81f89b",
          "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
          "editable": true,
          "snapshot": {
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "quantity": 3,
                "description": "قطع",
                "sourceLineId": "pieces"
              }
            ],
            "priority": "ordinary",
            "totalDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 35000
            },
            "allocation": "exact-outstanding-per-unit",
            "externalId": "shipment-1",
            "destination": {
              "kind": "confirmed-pin",
              "coordinates": {
                "latitude": 30.05,
                "longitude": 31.24
              }
            },
            "shippingDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 5000
            },
            "recipientName": "عميل بنفس العنوان",
            "recipientPhone": "01012345678",
            "sourceRevision": 1,
            "splittingAllowed": true,
            "sourceDispatchCycleId": "cycle",
            "expectedSourceRevision": 0,
            "sourceBranchExternalId": "branch"
          },
          "externalId": "shipment-1",
          "receivedAt": "2026-09-24T14:58:28.583Z",
          "planningStatus": "pending",
          "sourceRevision": 1,
          "dispatchCycleId": "1f7b4139-e310-4fb1-a2ef-177a2e90e0cd",
          "driverExternalId": "policy-driver",
          "planningEligible": true,
          "locationReadiness": "confirmed",
          "assignmentRevision": 1,
          "sourceDispatchCycleId": "cycle",
          "previousDispatchCycleId": null
        },
        "notices": [],
        "outcomes": [
          {
            "kind": "company",
            "time": {
              "actionId": "75b8bae6-daaa-48e1-93c2-25fad9ba4b58",
              "recordedAt": "2026-09-24T14:58:29.293Z",
              "observation": {
                "clock": {
                  "quality": "unknown"
                },
                "observedAt": null
              }
            },
            "lines": [
              {
                "unitDue": {
                  "currency": "EGP",
                  "exponent": 2,
                  "amountMinor": 10000
                },
                "delivered": 0,
                "sourceLineId": "pieces",
                "sourceQuantity": 3,
                "heldReturnRequired": 3
              }
            ],
            "taskId": "9b17903d-a45d-5953-a979-1602ba81f89b",
            "arrival": null,
            "heading": null,
            "outcome": "no-answer",
            "roundId": "eeceb60a-784c-461f-b4e8-1bdd6b341e45",
            "branchId": "80c1cfe8-e95e-4e97-851c-92c81aa7d9cf",
            "driverId": "995bed0f-6892-476a-9514-4b0a4a14576f",
            "revision": 1,
            "attemptId": "623ec0f0-92be-4793-92ad-5509af3a72f0",
            "outcomeId": "fc0ac285-c3dc-453f-b924-7cc88ed6c974",
            "workdayId": "10b90bdc-99b4-4a22-bd6c-7075947e6a21",
            "collection": {
              "goods": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              },
              "reported": null,
              "shipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              },
              "shippingStatus": "not-attempted",
              "unpaidShipping": {
                "currency": "EGP",
                "exponent": 2,
                "amountMinor": 0
              }
            },
            "returnRequired": true,
            "sourceRevision": 1,
            "dispatchCycleId": "1f7b4139-e310-4fb1-a2ef-177a2e90e0cd",
            "sourceReference": {
              "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
              "externalId": "shipment-1",
              "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
            },
            "assignmentRevision": 1,
            "sourceDispatchCycleId": "cycle"
          }
        ],
        "returnItems": [],
        "returnRequest": null
      }
    }
  },
  {
    "id": "p26-report-command-fixture",
    "schema": "consumer.schema.json#/$defs/ReportCommand",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "payloadVersion": "1.0.0",
      "actionId": "31274284-d534-4f52-b6fc-da94b469b50d",
      "operationId": "integration.reportAppliedCheckpoint",
      "context": {
        "kind": "integration",
        "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
        "integrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
      },
      "resources": {},
      "baseVersions": {},
      "dependsOnActionIds": [],
      "observation": {
        "observedAt": null,
        "clock": {
          "quality": "unknown"
        }
      },
      "payload": {
        "revision": 39,
        "tenantId": "758fec21-37ca-44a1-9979-7c95246672b4",
        "aggregate": {
          "id": "9b17903d-a45d-5953-a979-1602ba81f89b",
          "type": "task"
        },
        "appliedAt": "2026-09-24T14:58:42.514Z",
        "lastError": null,
        "receivedAt": "2026-09-24T14:58:41.315Z",
        "pendingCount": 0,
        "receivedHigh": 3,
        "schemaVersion": "1.0.0",
        "appliedThrough": 3,
        "historyComplete": true,
        "receivedThrough": 3,
        "snapshotThrough": 0,
        "projectedThrough": 3,
        "recipientIntegrationId": "5f338a1d-4bdf-4f18-83cb-981b16076ceb"
      }
    }
  },
  {
    "id": "p27-source-pending",
    "schema": "source.schema.json#/$defs/Status",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "11111111-1111-4111-8111-111111111111",
      "integrationId": "22222222-2222-4222-8222-222222222222",
      "truncated": false,
      "commands": [
        {
          "actionId": "33333333-3333-4333-8333-333333333333",
          "operationId": "assignment.receiveBatch",
          "status": "pending",
          "attempts": 1,
          "lastError": "connection_unavailable_acceptance_unknown",
          "result": null
        }
      ],
      "records": [
        {
          "kind": "shipment",
          "externalId": "reference-1",
          "localRevision": 2,
          "commandId": "33333333-3333-4333-8333-333333333333",
          "status": "pending"
        }
      ]
    }
  },
  {
    "id": "p27-source-completed-capture",
    "schema": "source.schema.json#/$defs/Status",
    "valid": true,
    "data": {
      "schemaVersion": "1.0.0",
      "tenantId": "84fd7e35-6404-49b6-a7d0-6c1819c502ea",
      "integrationId": "745f1b8c-b01b-490f-b9d5-4a23ab1d7a85",
      "truncated": false,
      "records": [
        {
          "kind": "branch",
          "externalId": "cairo",
          "localRevision": 1,
          "commandId": "0422e804-3d26-4d87-b6af-2085c6e09194",
          "status": "accepted"
        }
      ],
      "commands": [
        {
          "actionId": "716861ca-4584-4957-bc38-55e7be631bcc",
          "operationId": "assignment.withdraw",
          "status": "rejected",
          "attempts": 1,
          "lastError": "departed_edit_forbidden",
          "result": {
            "receipt": {
              "problem": {
                "code": "departed_edit_forbidden",
                "type": "https://schemas.tawsel.invalid/problems/departed-edit-forbidden",
                "title": "Source command rejected",
                "detail": "Shipment is frozen by departure; ordinary ERP edits are unavailable.",
                "status": 409,
                "actionId": "716861ca-4584-4957-bc38-55e7be631bcc",
                "retryable": false,
                "correlationId": "6b976fa4-f2ab-458d-8809-7473cc12b657"
              },
              "actionId": "716861ca-4584-4957-bc38-55e7be631bcc",
              "receiptId": "9830995d-d701-468a-bf8f-d1028d88ba96",
              "receivedAt": "2026-09-24T16:28:20.756Z",
              "schemaVersion": "1.0.0",
              "businessStatus": "rejected",
              "evidenceStatus": "received"
            },
            "summary": {
              "code": "departed_edit_forbidden"
            },
            "response": {
              "body": {
                "code": "departed_edit_forbidden",
                "type": "https://schemas.tawsel.invalid/problems/departed-edit-forbidden",
                "title": "Source command rejected",
                "detail": "Shipment is frozen by departure; ordinary ERP edits are unavailable.",
                "status": 409,
                "actionId": "716861ca-4584-4957-bc38-55e7be631bcc",
                "retryable": false,
                "correlationId": "6b976fa4-f2ab-458d-8809-7473cc12b657"
              },
              "status": 409
            },
            "retention": "full",
            "operationId": "assignment.withdraw"
          }
        },
        {
          "actionId": "0422e804-3d26-4d87-b6af-2085c6e09194",
          "operationId": "branch.provision",
          "status": "accepted",
          "attempts": 1,
          "lastError": null,
          "result": {
            "receipt": {
              "actionId": "0422e804-3d26-4d87-b6af-2085c6e09194",
              "receiptId": "2a66a4dd-66fc-4d9b-ba2a-90a76d608776",
              "receivedAt": "2026-09-24T16:27:49.791Z",
              "committedAt": "2026-09-24T16:27:49.827Z",
              "schemaVersion": "1.0.0",
              "businessStatus": "accepted",
              "evidenceStatus": "received",
              "resourceVersions": {
                "sourceRevision": 1
              }
            },
            "summary": {
              "entity": "branch",
              "externalId": "cairo",
              "resourceId": "adc3d6b6-8a08-4d8c-a3df-ab9b3df36466",
              "issuerStatus": "not-required",
              "sourceRevision": 1
            },
            "response": {
              "body": {
                "entity": "branch",
                "externalId": "cairo",
                "resourceId": "adc3d6b6-8a08-4d8c-a3df-ab9b3df36466",
                "issuerStatus": "not-required",
                "sourceRevision": 1
              },
              "status": 200
            },
            "retention": "full",
            "operationId": "branch.provision"
          }
        }
      ]
    }
  },
  {
    "id": "p30-frozen-piece-delivery",
    "schema": "current-activity.schema.json#/$defs/DeliveryAffordance",
    "valid": true,
    "data": {
      "kind": "company",
      "allowedActions": [
        "full",
        "partial",
        "refusal",
        "no-answer"
      ],
      "fullCollection": {
        "amountMinor": 35000,
        "currency": "EGP",
        "exponent": 2
      },
      "goodsDue": {
        "amountMinor": 30000,
        "currency": "EGP",
        "exponent": 2
      },
      "shippingDue": {
        "amountMinor": 5000,
        "currency": "EGP",
        "exponent": 2
      },
      "lines": [
        {
          "sourceLineId": "pieces",
          "description": "قطع",
          "quantity": 3,
          "unitDue": {
            "amountMinor": 10000,
            "currency": "EGP",
            "exponent": 2
          }
        }
      ]
    }
  },
  {
    "id": "p30-correction-view-retained-original",
    "schema": "corrections.schema.json#/$defs/Availability",
    "valid": true,
    "data": {
      "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
      "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
      "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
      "effectiveOutcomeRevision": 3,
      "effectiveOutcome": {
        "kind": "company",
        "time": {
          "actionId": "a640dfb0-d5c7-41d6-b150-6c457f8eee16",
          "recordedAt": "2026-09-24T11:33:56.458Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "lines": [
          {
            "unitDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "delivered": 2,
            "sourceLineId": "pieces",
            "sourceQuantity": 3,
            "heldReturnRequired": 1
          }
        ],
        "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
        "arrival": null,
        "heading": null,
        "outcome": "partial",
        "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
        "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
        "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
        "revision": 3,
        "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
        "outcomeId": "c6b8f2a9-c57c-4096-a464-e10fd1af14b8",
        "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
        "collection": {
          "goods": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 20000
          },
          "reported": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 25000
          },
          "shipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 5000
          },
          "shippingStatus": "collected",
          "unpaidShipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          }
        },
        "returnRequired": true,
        "sourceRevision": 1,
        "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
        "sourceReference": {
          "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
          "externalId": "shipment-0",
          "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
        },
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      },
      "allowed": false,
      "constraints": [
        "dependent-receipt"
      ],
      "nextSteps": [
        "view-history",
        "erp-commercial-review"
      ],
      "message": "أكد الفرع استلامًا أو تصرفًا في القطع؛ السجل محفوظ والمراجعة التجارية لدى الشركة.",
      "delivery": {
        "kind": "company",
        "allowedActions": [
          "full",
          "partial",
          "refusal",
          "no-answer"
        ],
        "fullCollection": {
          "amountMinor": 35000,
          "currency": "EGP",
          "exponent": 2
        },
        "goodsDue": {
          "amountMinor": 30000,
          "currency": "EGP",
          "exponent": 2
        },
        "shippingDue": {
          "amountMinor": 5000,
          "currency": "EGP",
          "exponent": 2
        },
        "lines": [
          {
            "sourceLineId": "pieces",
            "description": "قطع",
            "quantity": 3,
            "unitDue": {
              "amountMinor": 10000,
              "currency": "EGP",
              "exponent": 2
            }
          }
        ]
      },
      "originalOutcome": {
        "kind": "company",
        "time": {
          "actionId": "11d3b921-94a9-417d-8762-7cf8045816c1",
          "recordedAt": "2026-09-24T11:33:55.980Z",
          "observation": {
            "clock": {
              "quality": "unknown"
            },
            "observedAt": null
          }
        },
        "lines": [
          {
            "unitDue": {
              "currency": "EGP",
              "exponent": 2,
              "amountMinor": 10000
            },
            "delivered": 2,
            "sourceLineId": "pieces",
            "sourceQuantity": 3,
            "heldReturnRequired": 1
          }
        ],
        "taskId": "5e0542e2-a971-5a1b-ac50-e15ab08b503b",
        "arrival": null,
        "heading": null,
        "outcome": "partial",
        "roundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9",
        "branchId": "3a8948d2-107a-424f-ba46-733d4b401439",
        "driverId": "f1d2b12d-fdbd-4362-bbf2-450ef18a440b",
        "revision": 1,
        "attemptId": "e711b576-a9b3-4b97-a3e2-6e9177dad1d2",
        "outcomeId": "bf8d6579-2dc1-4d42-b36b-65f8f95302a9",
        "workdayId": "3a67ceb3-5fdf-4915-95f0-eabeaf128b1e",
        "collection": {
          "goods": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 20000
          },
          "reported": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 25000
          },
          "shipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 5000
          },
          "shippingStatus": "collected",
          "unpaidShipping": {
            "currency": "EGP",
            "exponent": 2,
            "amountMinor": 0
          }
        },
        "returnRequired": true,
        "sourceRevision": 1,
        "dispatchCycleId": "9c842f19-2bea-4664-97cc-aa57b38d00d7",
        "sourceReference": {
          "tenantId": "e35269cb-c0af-416b-9b8e-2e9f16188f77",
          "externalId": "shipment-0",
          "integrationId": "7e3ab24d-d38b-40ad-be5d-e4cf63c8dbb4"
        },
        "assignmentRevision": 1,
        "sourceDispatchCycleId": "cycle"
      },
      "executionRoundId": "c0028d75-ff9d-4028-a3bb-b1a50e755af9"
    }
  },
  {
    "id": "p31-recovered-pending-requests",
    "schema": "returns.schema.json#/$defs/Groups",
    "valid": true,
    "data": {
      "groups": [],
      "pendingRequests": [
        {
          "requestId": "4a1583fd-b294-4c79-ac0f-7446bdb633c2",
          "driverId": "1a5dd8b8-2949-428e-8ac6-586124d4a8ea",
          "sourceBranchId": "ee1cf434-da2f-46e4-a8bc-a21863263bad",
          "integrationId": "3e40e2fd-3af6-4b47-b16e-2ab04459afcc",
          "roundId": "0cd465eb-227d-448a-8b15-bc18e5fffa3c",
          "requestedAt": "2026-09-24T09:49:04.825Z",
          "items": [
            {
              "itemId": "dd27ed0a-f5b5-4b22-ada7-5f91bb42d255",
              "taskId": "54ebc86b-17c4-5cd4-a502-3ae201e87b33",
              "dispatchCycleId": "aa489647-277a-42ab-8503-829b5b7a593a",
              "outcomeId": "8b01e1d3-c24d-4ec9-a8da-ac307e7f5f40",
              "attemptId": "03308e54-4446-4d77-91bd-f54e5c17425c",
              "sourceLineId": "pieces",
              "externalId": "shipment-0",
              "sourceDispatchCycleId": "cycle",
              "sourceRevision": 1,
              "revision": 0,
              "requested": 3,
              "received": 0,
              "lost": 0,
              "damaged": 0,
              "unresolved": 3,
              "eligibility": "pending",
              "custody": {
                "sourceQuantity": 3,
                "delivered": 0,
                "held": 3,
                "received": 0,
                "lost": 0,
                "damaged": 0
              }
            }
          ]
        }
      ]
    }
  },
  {
    "id": "p31-ended-round-activity-revision",
    "schema": "workday-closure.schema.json#/$defs/RoundSummary",
    "valid": true,
    "data": {
      "roundId": "e3d0d0cb-0faa-4366-86d0-0558435a5a5e",
      "startedAt": "2026-09-24T08:00:45.716Z",
      "endedAt": "2026-09-24T08:00:46.163Z",
      "firstPlanId": "8a034001-a3f2-406a-b7c6-a02f311ca136",
      "firstForecastId": "d50f23d8-9b79-41d0-9344-51a5a8d74727",
      "firstWorkloadId": "d60eecfd-d878-4359-876a-264af8caa8d7",
      "activityRevision": 9
    }
  },
  {
    "id": "local-started-download-v1",
    "schema": "local-work.schema.json#/$defs/Download",
    "valid": true,
    "data": {
      "scope": "[\"personal\",\"33000000-0000-4000-8000-000000000001\",\"33000000-0000-4000-8000-000000000002\",\"33000000-0000-4000-8000-000000000003\"]",
      "roundId": "33000000-0000-4000-8000-000000000005",
      "format": 1,
      "downloadedAt": "2026-09-25T08:00:00Z",
      "session": {
        "kind": "personal",
        "expiresAt": "2026-09-25T20:00:00Z",
        "loginIdentifier": "+201012345678",
        "recoveryEmailVerified": true,
        "phoneOwnershipVerified": false,
        "access": {
          "principalKind": "account",
          "tenantId": "33000000-0000-4000-8000-000000000001",
          "tenantKind": "personal",
          "sourceId": "33000000-0000-4000-8000-000000000002",
          "branchIds": [],
          "driverId": "33000000-0000-4000-8000-000000000004",
          "effectiveCapabilities": [
            "execution.own"
          ]
        }
      },
      "ownership": {
        "roundId": "33000000-0000-4000-8000-000000000005",
        "workdayId": "33000000-0000-4000-8000-000000000008",
        "driverId": "33000000-0000-4000-8000-000000000004",
        "owner": {
          "accountId": "33000000-0000-4000-8000-000000000002",
          "deviceId": "33000000-0000-4000-8000-000000000003",
          "generation": 1
        },
        "viewerDeviceId": "33000000-0000-4000-8000-000000000003",
        "mode": "owner",
        "roundState": "active",
        "workdayState": "open",
        "mayTakeover": false,
        "snapshotRequired": false
      },
      "snapshotToken": null,
      "current": {
        "roundId": "33000000-0000-4000-8000-000000000005",
        "driverId": "33000000-0000-4000-8000-000000000004",
        "owner": {
          "accountId": "33000000-0000-4000-8000-000000000002",
          "deviceId": "33000000-0000-4000-8000-000000000003",
          "generation": 1
        },
        "revision": 0,
        "currentActivity": null,
        "physicalOrigin": null,
        "planningOrigin": {
          "kind": "manual-pin",
          "coordinates": {
            "latitude": 30,
            "longitude": 31
          }
        },
        "nextSuggestion": null,
        "planning": {
          "planId": null,
          "updating": false
        },
        "branchActivity": null,
        "targets": [
          {
            "taskId": "33000000-0000-4000-8000-000000000006",
            "attemptId": "33000000-0000-4000-8000-000000000007",
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.1,
              "longitude": 31.1
            },
            "recipientName": "عميل محفوظ",
            "recipientPhone": "01012345678",
            "address": "عنوان محفوظ",
            "delivery": {
              "kind": "personal",
              "allowedActions": [
                "full",
                "refusal",
                "no-answer"
              ],
              "fullCollection": null,
              "goodsDue": null,
              "shippingDue": null,
              "lines": []
            }
          }
        ]
      },
      "outcomes": {
        "roundId": "33000000-0000-4000-8000-000000000005",
        "items": [],
        "history": [],
        "custody": [],
        "progress": {
          "processed": 0,
          "full": 0,
          "partial": 0,
          "refused": 0,
          "noAnswer": 0,
          "deliveredPieces": 0,
          "heldReturnRequiredPieces": 0,
          "collection": []
        }
      },
      "plan": null,
      "road": null
    }
  },
  {
    "id": "local-immutable-capture-v1",
    "schema": "local-work.schema.json#/$defs/Action",
    "valid": true,
    "data": {
      "scope": "[\"personal\",\"33000000-0000-4000-8000-000000000001\",\"33000000-0000-4000-8000-000000000002\",\"33000000-0000-4000-8000-000000000003\"]",
      "actionId": "33000000-0000-4000-8000-000000000009",
      "sequence": 1,
      "roundId": "33000000-0000-4000-8000-000000000005",
      "envelope": {
        "schemaVersion": "1.0.0",
        "payloadVersion": "1.0.0",
        "actionId": "33000000-0000-4000-8000-000000000009",
        "operationId": "current.selectHeading",
        "context": {
          "kind": "device",
          "tenantId": "33000000-0000-4000-8000-000000000001",
          "accountId": "33000000-0000-4000-8000-000000000002",
          "deviceId": "33000000-0000-4000-8000-000000000003",
          "deviceGeneration": 1,
          "deviceSequence": 1
        },
        "resources": {
          "tripId": "33000000-0000-4000-8000-000000000005",
          "taskId": "33000000-0000-4000-8000-000000000006",
          "attemptId": "33000000-0000-4000-8000-000000000007"
        },
        "baseVersions": {},
        "dependsOnActionIds": [],
        "observation": {
          "observedAt": "2026-09-25T08:02:00Z",
          "clock": {
            "quality": "uncertain"
          }
        },
        "payload": {
          "roundId": "33000000-0000-4000-8000-000000000005",
          "taskId": "33000000-0000-4000-8000-000000000006",
          "attemptId": "33000000-0000-4000-8000-000000000007",
          "expectedActivityRevision": 0,
          "expectedCurrentAttemptId": null,
          "expectedSourceRevision": 1,
          "expectedAssignmentRevision": 0,
          "expectedPinRevision": 1
        }
      },
      "bytes": "{\"schemaVersion\":\"1.0.0\",\"payloadVersion\":\"1.0.0\",\"actionId\":\"33000000-0000-4000-8000-000000000009\",\"operationId\":\"current.selectHeading\",\"context\":{\"kind\":\"device\",\"tenantId\":\"33000000-0000-4000-8000-000000000001\",\"accountId\":\"33000000-0000-4000-8000-000000000002\",\"deviceId\":\"33000000-0000-4000-8000-000000000003\",\"deviceGeneration\":1,\"deviceSequence\":1},\"resources\":{\"tripId\":\"33000000-0000-4000-8000-000000000005\",\"taskId\":\"33000000-0000-4000-8000-000000000006\",\"attemptId\":\"33000000-0000-4000-8000-000000000007\"},\"baseVersions\":{},\"dependsOnActionIds\":[],\"observation\":{\"observedAt\":\"2026-09-25T08:02:00Z\",\"clock\":{\"quality\":\"uncertain\"}},\"payload\":{\"roundId\":\"33000000-0000-4000-8000-000000000005\",\"taskId\":\"33000000-0000-4000-8000-000000000006\",\"attemptId\":\"33000000-0000-4000-8000-000000000007\",\"expectedActivityRevision\":0,\"expectedCurrentAttemptId\":null,\"expectedSourceRevision\":1,\"expectedAssignmentRevision\":0,\"expectedPinRevision\":1}}",
      "capturedAt": "2026-09-25T08:02:00Z",
      "href": "/rounds/current?kind=personal"
    }
  },
  {
    "id": "p33-plan-with-downloaded-road-context",
    "schema": "planning.schema.json#/$defs/Plan",
    "valid": true,
    "data": {
      "planId": "13000000-0000-4000-8000-000000000008",
      "jobId": "13000000-0000-4000-8000-000000000005",
      "driverId": "13000000-0000-4000-8000-000000000002",
      "revision": 1,
      "fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "state": "ready",
      "current": true,
      "inputCurrent": true,
      "policyValidated": true,
      "candidate": {
        "mode": "car",
        "status": "complete",
        "policyValidated": false,
        "visits": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "arrivalOffsetSeconds": 10,
            "travelDurationSeconds": 10,
            "distanceMetres": 100,
            "serviceEstimateSeconds": 600,
            "waitingSeconds": 0
          }
        ],
        "unassignedTaskIds": [],
        "travelDurationSeconds": 10,
        "distanceMetres": 100,
        "customerServiceEstimateSeconds": 600,
        "branchServiceEstimateSeconds": 0,
        "waitingSeconds": 0,
        "finishOffsetSeconds": 610,
        "endpoint": {
          "kind": "last-customer"
        }
      },
      "input": {
        "version": 1,
        "tenantId": "13000000-0000-4000-8000-000000000001",
        "driverId": "13000000-0000-4000-8000-000000000002",
        "accountKind": "personal",
        "inputRevision": 3,
        "settingsRevision": 1,
        "executionRevision": 0,
        "manualRevision": 0,
        "currentTarget": null,
        "locationInputRevision": 1,
        "settings": {
          "mode": "car",
          "origin": {
            "kind": "manual-pin",
            "coordinates": {
              "latitude": 30.04,
              "longitude": 31.23
            }
          },
          "endpoint": {
            "kind": "last-customer"
          },
          "plannedStartAt": "2026-09-23T10:00:00.000Z"
        },
        "members": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "branchId": null,
            "integrationId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "coordinates": {
              "latitude": 30.05,
              "longitude": 31.24
            },
            "priority": "ordinary",
            "earliestAt": null,
            "departureAt": null,
            "reservationState": null,
            "eligible": true,
            "exclusionReason": null,
            "serviceEstimateSeconds": 600
          }
        ]
      },
      "forecast": {
        "forecastId": "13000000-0000-4000-8000-000000000006",
        "workloadId": "13000000-0000-4000-8000-000000000007",
        "kind": "planning-estimate",
        "timeOrigin": "2026-09-23T10:00:00.000Z",
        "expectedFinishAt": "2026-09-23T10:10:10.000Z",
        "members": [
          {
            "taskId": "14000000-0000-4000-8000-000000000001",
            "attemptId": "14000000-0000-4000-8000-000000000002",
            "dispatchCycleId": null,
            "sourceRevision": 1,
            "assignmentRevision": 0,
            "pinRevision": 1,
            "membership": "assigned",
            "exclusionReason": null,
            "position": 1,
            "expectedArrivalAt": "2026-09-23T10:00:10.000Z",
            "expectedCompletionAt": "2026-09-23T10:10:10.000Z"
          }
        ]
      },
      "createdAt": "2026-09-23T10:00:00.000Z",
      "routePolicy": {
        "version": 1,
        "method": "grouped-heuristic",
        "orderedTaskIds": [
          "14000000-0000-4000-8000-000000000001"
        ],
        "exceptions": [],
        "roadRoute": {
          "mode": "car",
          "status": "complete",
          "geometrySource": "osrm-road",
          "geometry": [
            {
              "latitude": 30.04,
              "longitude": 31.23
            },
            {
              "latitude": 30.05,
              "longitude": 31.24
            }
          ],
          "durationSeconds": 25,
          "distanceMetres": 250,
          "legs": [
            {
              "durationSeconds": 25,
              "distanceMetres": 250
            }
          ]
        }
      }
    }
  },
  {
    "id": "p34-batch",
    "schema": "sync.schema.json#/$defs/Batch",
    "valid": true,
    "data": {
      "actions": [
        {
          "schemaVersion": "1.0.0",
          "payloadVersion": "1.0.0",
          "operationId": "current.selectHeading",
          "actionId": "16000000-0000-4000-8000-000000000001",
          "context": {
            "kind": "device",
            "tenantId": "15000000-0000-4000-8000-000000000011",
            "accountId": "15000000-0000-4000-8000-000000000007",
            "deviceId": "15000000-0000-4000-8000-000000000003",
            "deviceGeneration": 1,
            "deviceSequence": 1
          },
          "resources": {
            "tripId": "15000000-0000-4000-8000-000000000006",
            "taskId": "16000000-0000-4000-8000-000000000002",
            "attemptId": "16000000-0000-4000-8000-000000000003"
          },
          "baseVersions": {},
          "dependsOnActionIds": [],
          "observation": {
            "observedAt": null,
            "clock": {
              "quality": "unknown"
            }
          },
          "payload": {
            "roundId": "15000000-0000-4000-8000-000000000006",
            "taskId": "16000000-0000-4000-8000-000000000002",
            "attemptId": "16000000-0000-4000-8000-000000000003",
            "expectedActivityRevision": 0,
            "expectedCurrentAttemptId": null,
            "expectedSourceRevision": 1,
            "expectedAssignmentRevision": 0,
            "expectedPinRevision": 0
          }
        }
      ]
    }
  },
  {
    "id": "p34-waiting",
    "schema": "sync.schema.json#/$defs/Entry",
    "valid": true,
    "data": {
      "actionId": "16000000-0000-4000-8000-000000000001",
      "status": "waiting",
      "dependencies": [
        "10000000-0000-4000-8000-000000000040"
      ]
    }
  },
  {
    "id": "p34-mixed-results",
    "schema": "sync.schema.json#/$defs/BatchResult",
    "valid": true,
    "data": {
      "results": [
        {
          "actionId": "10000000-0000-4000-8000-000000000040",
          "status": "received",
          "result": {
            "receipt": {
              "schemaVersion": "1.0.0",
              "receiptId": "10000000-0000-4000-8000-000000000070",
              "actionId": "10000000-0000-4000-8000-000000000040",
              "evidenceStatus": "received",
              "businessStatus": "accepted",
              "receivedAt": "2026-09-22T10:00:00Z",
              "committedAt": "2026-09-22T10:00:01Z",
              "resourceVersions": {
                "sourceRevision": 1,
                "resourceRevision": 1,
                "outcomeRevision": 1,
                "assignmentGeneration": 1,
                "routeRevision": 2,
                "deviceGeneration": 1,
                "snapshotRevision": 5
              }
            },
            "operationId": "outcome.recordPartial",
            "retention": "full",
            "summary": {
              "outcomeId": "10000000-0000-4000-8000-000000000080",
              "outcomeRevision": 1
            },
            "response": {
              "status": 200,
              "body": {
                "outcomeId": "10000000-0000-4000-8000-000000000080",
                "deliveredPieces": 2
              }
            }
          }
        },
        {
          "actionId": "16000000-0000-4000-8000-000000000001",
          "status": "not-received",
          "code": "validation_failed",
          "message": "Unsupported operation; keep the original locally.",
          "retryable": false
        }
      ]
    }
  },
  {
    "id": "p34-conflicts-empty",
    "schema": "sync.schema.json#/$defs/Conflicts",
    "valid": true,
    "data": {
      "items": [],
      "nextActionId": null
    }
  },
  {
    "id": "p35-same-account-recovery-fixture",
    "schema": "session.schema.json#/$defs/LoginRequest",
    "valid": true,
    "data": {
      "kind": "personal",
      "reauthenticate": true,
      "expectedAccount": {
        "tenantId": "35000000-0000-4000-8000-000000000001",
        "accountId": "35000000-0000-4000-8000-000000000002"
      }
    }
  },
  {
    "id": "p35-sealed-selection-fixture",
    "schema": "local-work.schema.json#/$defs/Selection",
    "valid": true,
    "data": {
      "id": "active",
      "scope": "[\"personal\",\"tenant\",\"account\",\"device\"]",
      "exiting": true
    }
  },
  {
    "id": "p35-scoped-form-draft-fixture",
    "schema": "local-work.schema.json#/$defs/Draft",
    "valid": true,
    "data": {
      "scope": "[\"personal\",\"tenant\",\"account\",\"device\"]",
      "key": "tawsel:exception:tenant:account:attempt:1:partial",
      "value": {
        "quantities": {
          "shirt": "1"
        },
        "outcome": "partial"
      },
      "savedAt": "2026-09-25T08:00:00Z"
    }
  },
  {
    "id": "report-Counts",
    "schema": "reporting.schema.json#/$defs/Counts",
    "valid": true,
    "data": {
      "shipments": 18,
      "attempts": 18,
      "processedAttempts": 18,
      "failedAttempts": 2,
      "deferredAttempts": 0,
      "processedShipments": 18,
      "fullShipments": 16,
      "partialShipments": 0,
      "refusedShipments": 0,
      "noAnswerShipments": 2,
      "unfinishedShipments": 0,
      "deferredShipments": 0,
      "fullDeliveryPercent": 88.9
    }
  },
  {
    "id": "report-Collection",
    "schema": "reporting.schema.json#/$defs/Collection",
    "valid": true,
    "data": {
      "currency": "EGP",
      "exponent": 2,
      "reportedMinor": "25000",
      "goodsMinor": "20000",
      "shippingMinor": "5000",
      "unpaidShippingMinor": "0",
      "unreportedAttempts": 0
    }
  },
  {
    "id": "report-Time",
    "schema": "reporting.schema.json#/$defs/Time",
    "valid": true,
    "data": {
      "status": "missing",
      "observedAt": null,
      "recordedAt": null,
      "actionId": null,
      "clock": null
    }
  },
  {
    "id": "report-Measurement",
    "schema": "reporting.schema.json#/$defs/Measurement",
    "valid": true,
    "data": {
      "seconds": null,
      "reason": "missing-boundary"
    }
  },
  {
    "id": "report-Filters",
    "schema": "reporting.schema.json#/$defs/Filters",
    "valid": true,
    "data": {
      "roundId": null,
      "driverId": null,
      "branchId": null,
      "outcome": "partial"
    }
  },
  {
    "id": "report-Pieces",
    "schema": "reporting.schema.json#/$defs/Pieces",
    "valid": true,
    "data": {
      "dispatched": 3,
      "delivered": 0,
      "held": 1,
      "returnRequired": 1,
      "received": 1,
      "lost": 1,
      "damaged": 0
    }
  }
]

````
<!-- SOURCE-END contracts/examples/valid.json -->

## Original file: contracts/examples/webhook-signature.v1.json

SHA-256: `dd11d4d8427895e2c58a26665890c0031a39023f46246e0bd36d1efc5ccf63df` · Bytes: 3068.

<!-- SOURCE-BEGIN contracts/examples/webhook-signature.v1.json -->
````json
{
  "description": "Published test key only; exact-byte HMAC-SHA256 vector. Never use this secret in a deployment.",
  "scope": {
    "tenantId": "3e6f6150-b2d5-4041-8c4e-069962bb5e2f",
    "integrationId": "b9a3adb2-b05d-4867-a248-38b4a1e2271e"
  },
  "keyId": "published_test_v1",
  "secret": "0000000000000000000000000000000000000000000000000000000000000000",
  "timestamp": "1790254800000",
  "bodyBase64": "eyJhZ2dyZWdhdGUiOnsiaWQiOiI2YWQ1Yjk1Ny0yY2RkLTU2YzYtYTNlYy03Yjc4ZGRiNDJjMDEiLCJyZWNpcGllbnRTZXF1ZW5jZSI6MSwidHlwZSI6InRhc2sifSwiY29tbWl0dGVkQXQiOiIyMDI2LTA5LTI0VDEzOjI4OjQ3Ljc2M1oiLCJjb3JyZWxhdGlvbiI6eyJhY3Rpb25JZCI6IjY2NGM1NDg0LWQ1MTQtNGMyZi1hYTU1LWVmZWY3NWU3NjhmZiJ9LCJldmVudElkIjoiZGEyMmRiM2QtOWQzYy00NGZlLTg4ODYtN2UzY2EzYWMyYjllIiwiZXZlbnRLaW5kIjoidHJhbnNpdGlvbiIsImV2ZW50VHlwZSI6InRhc2suc25hcHNob3RBY2NlcHRlZCIsInBheWxvYWQiOnsiYWN0aW9uSWQiOiI2NjRjNTQ4NC1kNTE0LTRjMmYtYWE1NS1lZmVmNzVlNzY4ZmYiLCJ0YXNrIjp7ImFzc2lnbm1lbnRSZXZpc2lvbiI6MCwiZGlzcGF0Y2hDeWNsZUlkIjoiYWU0OWQzMzAtNjM4Yi00MDQyLWFmMzItYTJmY2ExZTYxZGZiIiwiZHJpdmVyRXh0ZXJuYWxJZCI6bnVsbCwiZHJpdmVySWQiOm51bGwsImVkaXRhYmxlIjp0cnVlLCJleHRlcm5hbElkIjoic2hpcG1lbnQtMSIsImxhdGVzdCI6dHJ1ZSwibG9jYXRpb25SZWFkaW5lc3MiOiJjb25maXJtZWQiLCJwbGFubmluZ0VsaWdpYmxlIjpmYWxzZSwicGxhbm5pbmdTdGF0dXMiOiJub3QtcmVxdWVzdGVkIiwicHJldmlvdXNEaXNwYXRjaEN5Y2xlSWQiOm51bGwsInJlY2VpdmVkQXQiOm51bGwsInNuYXBzaG90Ijp7ImFsbG9jYXRpb24iOiJleGFjdC1vdXRzdGFuZGluZy1wZXItdW5pdCIsImRlc3RpbmF0aW9uIjp7ImNvb3JkaW5hdGVzIjp7ImxhdGl0dWRlIjozMC4wNSwibG9uZ2l0dWRlIjozMS4yNH0sImtpbmQiOiJjb25maXJtZWQtcGluIn0sImV4cGVjdGVkU291cmNlUmV2aXNpb24iOjAsImV4dGVybmFsSWQiOiJzaGlwbWVudC0xIiwibGluZXMiOlt7ImRlc2NyaXB0aW9uIjoi2YLYt9i5IiwicXVhbnRpdHkiOjMsInNvdXJjZUxpbmVJZCI6InBpZWNlcyIsInVuaXREdWUiOnsiYW1vdW50TWlub3IiOjEwMDAwLCJjdXJyZW5jeSI6IkVHUCIsImV4cG9uZW50IjoyfX1dLCJwcmlvcml0eSI6Im9yZGluYXJ5IiwicmVjaXBpZW50TmFtZSI6Iti52YXZitmEINio2YbZgdizINin2YTYudmG2YjYp9mGIiwicmVjaXBpZW50UGhvbmUiOiIwMTAxMjM0NTY3OCIsInNoaXBwaW5nRHVlIjp7ImFtb3VudE1pbm9yIjo1MDAwLCJjdXJyZW5jeSI6IkVHUCIsImV4cG9uZW50IjoyfSwic291cmNlQnJhbmNoRXh0ZXJuYWxJZCI6ImJyYW5jaCIsInNvdXJjZURpc3BhdGNoQ3ljbGVJZCI6ImN5Y2xlIiwic291cmNlUmV2aXNpb24iOjEsInNwbGl0dGluZ0FsbG93ZWQiOnRydWUsInRvdGFsRHVlIjp7ImFtb3VudE1pbm9yIjozNTAwMCwiY3VycmVuY3kiOiJFR1AiLCJleHBvbmVudCI6Mn19LCJzb3VyY2VEaXNwYXRjaEN5Y2xlSWQiOiJjeWNsZSIsInNvdXJjZVJldmlzaW9uIjoxLCJzdGF0ZSI6InVuYXNzaWduZWQiLCJ0YXNrSWQiOiI2YWQ1Yjk1Ny0yY2RkLTU2YzYtYTNlYy03Yjc4ZGRiNDJjMDEifX0sInBheWxvYWRWZXJzaW9uIjoiMS4wLjAiLCJyZWNpcGllbnRJbnRlZ3JhdGlvbklkIjoiYjlhM2FkYjItYjA1ZC00ODY3LWEyNDgtMzhiNGExZTIyNzFlIiwicmVzb3VyY2VzIjp7ImRpc3BhdGNoQ3ljbGVJZCI6ImFlNDlkMzMwLTYzOGItNDA0Mi1hZjMyLWEyZmNhMWU2MWRmYiIsInRhc2tJZCI6IjZhZDViOTU3LTJjZGQtNTZjNi1hM2VjLTdiNzhkZGI0MmMwMSJ9LCJzY2hlbWFWZXJzaW9uIjoiMS4wLjAiLCJ0ZW5hbnRJZCI6IjNlNmY2MTUwLWIyZDUtNDA0MS04YzRlLTA2OTk2MmJiNWUyZiIsInZlcnNpb25zIjp7InNvdXJjZVJldmlzaW9uIjoxfX0=",
  "prefix": "tawsel-webhook-v1\n3e6f6150-b2d5-4041-8c4e-069962bb5e2f\nb9a3adb2-b05d-4867-a248-38b4a1e2271e\npublished_test_v1\n1790254800000\n",
  "signature": "v1=42c3f28b6e844af8a22955ad87622fe6d33c01cb462fd890d49437e7c0577fc0"
}

````
<!-- SOURCE-END contracts/examples/webhook-signature.v1.json -->

