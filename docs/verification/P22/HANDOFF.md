# P22 consumer handoff

Native recovery and selected actual live Tawsel scripts are verified; complete reviewed conformance/CR-001/CHECK-003 acceptance remains blocked. P23/P24 are unstarted. Consume these interfaces with current company/branch authority and their evidence limits.

- `@shahn/contracts/tawsel`: concrete `AggregateIdentity`, `ReplayPage`, `ReconciliationSnapshot`, `ReconciliationState`, `AppliedCheckpoint`, delivery/report validators. Snapshot history is `current-state-only`; sender receipt is separate from application.
- `@shahn/database`: `recoveryStream`, `committedCheckpoint`, `currentRecoveryProjection`. Current projection returns typed state, coverage and evidence ID; it is not a ledger producer. These functions require a caller-owned authorized transaction; native HTTP checks access.
- `integration.checkpoint`: independent receipt/application/snapshot/projected counters, `history_complete`, `rebuild_required`. A rebuild flag does not authorize overwriting history. Known gaps block affected eligibility only; no global token proves absence of unseen device facts.
- `integration.recovery_evidence`: immutable raw body/hash, scope/range, cursor, baseline/schema identity, retrieval time and basis revision. Current projection references it; staff views omit secrets.
- P13 visit/outcome/earning/allocation and scoped history witnesses remain financial basis. P14 actual return transitions/receipts/allocations remain custody basis. P16/P17 actual receipts/payouts and P20 protected payroll remain authoritative. P21 resolves linked reviews through its typed registry.

Worker facades `replay-job.ts`, `reconciliation-job.ts`, `checkpoint-report-job.ts` use P03/P11 scheduler/outbox. Retain source-before-lease/stream/native-aggregate locking and revalidate after network reads. A stale fenced response is never authoritative.

Native endpoints under `/api/v1/integration`: GET `/recovery`, `/recovery/jobs/{id}`, `/recovery/results/{id}`; POST `/recovery/commands`; GET `/deliveries`, `/deliveries/{id}`, `/applied-checkpoint`. Closed schemas are in current OpenAPI. Tawsel replay/reconciliation remain on Tawsel; signed consumer/native retained-command/status interfaces remain on ERP.

No urgency action, human/device/offline/Engine repair call, automatic refund, paid-history rewrite, arbitrary stream discovery, snapshot-derived money/history or mark-all-applied control. Unmapped known aggregates require all-company-branch authority until genuine mapping exists. Live test connection, limited measured performance, reviewed conformance, CR-001 and CHECK-003 limits remain in [README](README.md).

Owner2026-10-08 permits verified ERP implementation commits while explicitly deferring named Tawsel acceptance. The single TAWSEL-CHANGE-REQUESTS.md register owns later CR-001/CHECK-003 and joint full-matrix closure. Whole retry, interrupted source acceptance, live3-before1/2 recovery and runtime CI provenance now have identified script evidence; no Tawsel contract adoption occurred. P23/P24 may consume these typed native interfaces when separately selected; this handoff does not start them.
