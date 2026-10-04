# P10 treasury consumer handoff

P10 owns actual money transfer sending and full receipt. A transfer never creates revenue, cost, a driver remittance or a goods movement. It has no rejection/refund/partial-receipt action. The two existing registry grants are now implemented: `treasury.send` at `/treasury/transfers` and `treasury.receive` at `/treasury/receipts`. Each independently authorizes company-wide transfer operations and their necessary detail. Assigned-branch expense, ordinary movement, account-history and goods-transfer authority remains unchanged. One person can hold both grants.

## Commands and recovery

Closed shared schemas/types/validators and generated OpenAPI live in `packages/contracts/src/finance/treasury-transfers/index.ts`. POST `/api/v1/treasury/commands` requires the authenticated session, matching Origin and CSRF token. Both commands have schemaVersion1, companyId, commandId and transferId.

| Command | Additional immutable intent fields |
| --- | --- |
| `treasury.send` | sourceAccountId, destinationAccountId, sourceBranchId, destinationBranchId, positive EGP amountMinor, actualSentAt, expectedSourceVersion and expectedDestinationVersion |
| `treasury.receive` | expectedVersion, actualReceivedAt, confirmFullReceipt=true |

Source/destination accounts and branches must differ; accounts must be active and permitted for the respective branches. Actual timestamps carry a timezone; future assertions and receipt before sending are rejected. The UI explicitly converts Cairo input independently of browser timezone, including winter/summer offsets. A receipt payload cannot contain amount, changed accounts, rejection or partial-receipt fields.

GET `/api/v1/treasury/commands/{commandId}?companyId=…&family=treasury.send|treasury.receive` recovers the original outcome after rechecking the current grant. P03's company/principal/family/commandId identity is permanent and distinct from business source identity. Changing the original command payload conflicts. Reusing a transfer identity with changed send facts conflicts even with a new commandId. A new receipt command for an already received transfer returns200 with outcome `already_received`, version2 and no additional credit; the original receipt actor/time remains unchanged. Unknown transfer returns404; stale pending version returns409 with currentVersion. Compacted command results resolve through immutable `finance.command_outcome` rather than reconstructing an earlier response from current state.

## Caller-owned transactions and lock order

Import `sendTransfer`, `receiveTransfer`, `treasuryCommands`, `transferDetail`, `transferList`, and `treasuryCatalog` from `apps/api/src/modules/finance/treasury-transfers/service.ts`.

```ts
sendTransfer(u: UnitOfWork, input: Extract<TreasuryCommand, {type:'treasury.send'}>, commandRecordId: string): Promise<TreasuryResult>
receiveTransfer(u: UnitOfWork, input: Extract<TreasuryCommand, {type:'treasury.receive'}>, commandRecordId: string): Promise<TreasuryResult>
treasuryCommands(pool): CommandService<TreasuryCommand>
transferDetail(u, transferId, screen: 'send'|'receive'): Promise<TreasuryTransfer>
transferList(u, filter: TreasuryFilter, screen): Promise<TreasuryList>
treasuryCatalog(u, screen): Promise<TreasuryCatalog>
```

Application services join the supplied checked-out client; no nested transaction or commit occurs. Production HTTP uses the registered CommandService to retain outcome and append actor/version audit in that transaction. A caller consuming the lower-level application services must supply a genuine same-company command record and retain its own audited command outcome in that same transaction.

Order: authorization preamble → command identity → source identity → transfer aggregate (`cash-transfer:{id}`) → shared commercial configuration lock → deduplicated money resources sorted by immutable account ID → append-only effects. The aggregate key deliberately sorts before `commercial-configuration`. Receipt locks its transfer row. Send's unique source row serializes repeated transfer creation before the row exists. Both operations lock source and destination accounts through the existing P09 AccountFundsService, and ordinary spending locks these same resources. Tests use distinct sessions and independent PostgreSQL connections so session-idle updates do not conceal account contention.

The P09 adapter is `new AccountFundsService(u, 'treasury.send'|'treasury.receive')`. Its company-wide reads/use require that explicit grant. `postTransfer({sourceId,recordId,fields,reason})` chooses the appropriate money transfer kind and source kind. Ordinary `post` rejects a treasury-scoped adapter; default construction retains assigned-branch authority. JournalPosting's optional treasury scope accepts exactly one matching money/transfer_out or money/transfer_in effect, with a same-company branch and the relevant current grant. It cannot post unrelated expense, operating or wallet effects through the exception.

## Sources, conservation and lifecycle

Migration0014 is additive to P09; no production opening/backfill is synthesized. `finance.treasury_transfer` retains source/destination/account/branch/actor snapshots, a digits-only display reference, actual and recorded timestamps, command/source/movement references, state and version. The only normal transition is sent/version1 → received/version2. Send facts and received history cannot be edited/deleted.

| Phase | Kernel account effect | Separate append-only transit journal |
| --- | --- | --- |
| Send | money/transfer_out, source account −amount | `finance.treasury_transit_movement`, send +amount |
| Full receipt | money/transfer_in, destination +amount | same transfer, receive −amount |

Sources are `(erp, transferId, treasury.send|treasury.receive, revision1)`. Transit rows identify the exact same source and money effect; unique company/transfer/phase and source keys prohibit another effective receipt independently of HTTP identity. Deferred constraints require exact amounts, account/branch/date/actor/command links, one money effect per transfer phase, conserved transit and both lifecycle obligations. Transit is always derived by summing linked immutable movements; it is not a mutable balance or spendable account. Account projection and source debit/credit still use P09 funds reconciliation and guarded posting.

Pending transfers register unresolved obligations on both accounts with owner `treasury_transfer`, sourceIdentity=transferId. Account deactivation/usage changes return ACCOUNT_OBLIGATIONS_PENDING with structured obligation references; account UI links the transfer when a treasury grant exists. Receipt resolves both in the same transaction. Deferred SQL guards prevent removal of a pending branch usage or premature obligation resolution while permitting harmless account renames. Historical names remain snapshotted. Do not resolve these obligations manually to bypass pending money.

## P21/P23/P24 boundaries

P21 may consume the immutable transfer, source/movement/effect/transit/command identities and original actor/timestamps to propose a legitimate linked correction with evidence. P10 has no correction endpoint, physical return assertion, loss/liability classification or automated reversal. It truthfully says that the settlements route has not yet been implemented. P21 must define its typed compensating movement, scope, conservation and safe lifecycle transition before extending the sent/received state machine; do not edit existing transfer facts or pretend partial money was fully received.

P23 can consume the permitted transfer read model and history. Sending and receipt list/detail routes require their respective grants. Receipt defaults to pending; both lists support source/destination branch, state, search, actual send/receipt or recorded date basis, inclusive Cairo from/to dates and pagination. Digits-only reference search is exact; Arabic digits normalize at the HTTP boundary. Text searches snapshotted account labels. Reset restores send=all/receipt=sent. List page and filtered transit total share one SQL snapshot. A receipt-only catalog returns branches and no account balances/general history. Future reports/export still need their own report authority and consistent snapshot; treasury does not grant report access.

P24 can join transfer → send/receipt movement → kernel source/effect and transit rows. Reconcile kernel money sums to P09 account projections, then each transfer's linked transit to amount when sent or0 when received. Exclude treasury source kinds from operating profit. The history response contains commandRecordId, sourceId, movementId, effectId and transitId for each phase; this is the consumer drill-down identity, not permission to open unrelated account history.

Stop at P10. P11 and later workflows, customer issuer integration, bank providers, production deployment and owner physical-device review remain separate.
