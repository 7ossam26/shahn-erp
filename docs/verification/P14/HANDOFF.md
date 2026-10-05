# P14 consumer interfaces

Local native behavior is implemented. Required independent source/human acceptance remains blocked; see [evidence](README.md). This handoff does not authorize starting a later phase.

## P15: exclusive returned-custody allocation

`apps/api/src/modules/returns/brand-handover.service.ts` exports `lockReceiptAllocation(uow, branchId, selections)` and `consumeReceiptAllocation(uow, rows, selections, kind, ownerId, cycleId?)`. Select using receipt-line ID, expected native version and integer quantity. In the same UnitOfWork, lock source then shipment/receipt aggregates and sorted `(branch, brand, variant)` positions; consume once and post the owning physical transfer/reservation effect before commit. `kind='transfer'` records a transfer claim; it alone is **not** transfer departure or destination receipt. P15 must use its own immutable movement evidence and P05 stock reservation/movement services. A transfer claim, redispatch and actual brand handover cannot all win the same quantity. Do not fake a Tawsel receipt at the destination or mutate the original source branch. Returned parcel identity is shipment/cycle/source-line, with no variant/SKU stock.

`returns.return_receipt_line` retains accepted quantity, inspected condition, consumed quantity and native version. `returns.receipt_allocation` retains owner/kind/cycle/quantity and optional stock reservation. Unconfirmed observations are stored separately and cannot supply this interface. Damaged/uncertain/suspected-shortage goods cannot fund it. Current sound availability is checked under the stock-position lock; if goods have left the position, receipt history alone does not authorize consumption.

## P18/P21: separately approved dispositions and actual handover

`recordApprovedDisposition(uow, ApprovedReturnDisposition)` accepts incident/decision identity, source request, source branch, lost/damaged kind and exact item revisions/quantities. Only an owning authorized incident service may call it after its legitimate decision; there is no public decision-creation route. `return.dispose` consumes that saved decision through `queueDisposition` and the exact canonical `DisposeCommand`. It moves no usable stock and issues no financial journal, employee deduction or compensation. Canonical conflicts retain original command identity and physical evidence. Later condition reviews require explicit actual review; migration/event-only unknown conditions remain unavailable.

`brandHandover(uow, command, commandRecordId)` is the separate actual native return-to-brand action. It requires sound available received custody, exact brand, named recipient, assigned branch, actual confirmation and recorded time. It writes receipt allocation, stock movement if applicable and immutable handover/audit in the caller's transaction. Planned pickup and an offered return are not handover. No Tawsel brand-return endpoint exists in this integration.

## P22: exact facts, accumulated balances and recovery

`mergeReturnRequest(client, source, request)` validates scoped request/outcome/cycle/source-line identities and monotonically merges current revisions/counters. It never posts inventory. Caller owns source lock and transaction. `postReturnTransition(client, source, transition)` is the common result/event/replay physical-effect gate; uniqueness is `(company, source, transitionId)` and `(company, source, itemId, revision)`. It retains source evidence, posts condition-specific stock/custody, attributes the original native actor when known, and settles the observed intent atomically. Unknown observation condition stays unavailable. `applyReturnResult` merges current state and posts the exact returned transition facts; it cannot invent a transition from accumulated quantities or a compacted receipt.

`snapshotReturnBalances` in `packages/contracts/src/tawsel/returns.ts` pairs original `state.returnRequest` identity with current `state.returnItems` balances. It does not overwrite accumulated received quantities with the original offer's zero counters and does not manufacture missing revisions or stock transitions. P22 must reconcile immutable transition evidence and current state under these identities; full snapshot orchestration is not implemented here.

`SourceCommandWorker` sends outside SQL transactions. Uncertain returns recover `return.getNativeResult` at the same action ID. Redispatch recovery uses P12 action lookup plus every scoped cycle page and exact new source cycle. A missing or compacted accepted detail stays unresolved rather than generating another command. `ProjectionWorker` routes all three return events explicitly, preserves ordered checkpoints and keeps dependency failures pending. Correction after accepted physical return cannot rewrite its stock fact.

## P12 extension

`prepareReceiptRedispatch` uses P12 `buildSourceSnapshot`, immutable captured pricing, `enqueueIntake`, stock reservation and shipping-cover services. Migration18 permits historical cycles with one current cycle and explicit previous-cycle linkage. P13 cycle resolution accepts canonical cycle identity so old history is not accidentally attached to the new cycle even when Tawsel keeps the same task ID. Receipt allocation remains reserved through uncertain/rejected source commands for explicit review; do not free it based on timeout. The standalone worker path is a reexport of the shared implementation, following the existing P12/API worker pattern.

CHECK-003 is not satisfied by this interface. Same-branch local acceptance and a transfer allocation claim are not proof of cross-branch canonical compatibility.
