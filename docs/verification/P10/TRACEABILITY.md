# P10 bounded acceptance traceability

The selected contribution covers ERP-R-122/123/135/136/144/145/169/208 and ERP-D-116/117/126/127/135/136/160/199. Cross-domain payout, wallet, goods transfer and report/export acceptance remains with its other assigned phases. [Handoff](HANDOFF.md) defines the narrow exception and later-owned correction/report/reconciliation interfaces. Actual outputs and failed reruns are retained in [execution](../../../phases/execution/P10.md).

| Acceptance | Concrete connected checks |
| --- | --- |
| P10-A01 / AC-R-122/135 | Send300 from source1000. Query actual kernel money and transit journals: source700, transit300, destination0;0 operating facts. Reload pending detail. |
| P10-A02 | Full receipt leaves source700, transit0, destination300, one linked receipt actor/time and two immutable history entries. |
| P10-A03 | Distinct commandIds, principals/sessions and connections contend on the same source identity/transfer. An observed PostgreSQL lock waiter resumes as already_received, with one destination credit. |
| P10-A04 / AC-R-123 | Competing sends700 against1000 produce one source debit, source300/transit700. Send versus ordinary withdrawal700 also tests both lock-winning orders; loser has no money effect. |
| P10-A05 / AC-R-136/144 | Sender and receiver assigned only unrelatedC can send/receive A→B with their separate grants. The same receiver's B expense and general account-history access remain denied. Actual HTTP cross-company company/branch requests fail. |
| P10-A06 | Sender-only cannot receive, receiver-only cannot send, through real command/list/detail endpoints. Revoked grant prevents recovery. Both-grant ordinary staff may perform both assertions. |
| P10-A07 / AC-R-145 | Closed schema rejects299 received amount, changed destination/source, false full-confirmation, rejection and extra fields. Positive bounds, active account, permitted usage, same-account/branch and expected versions are server checks. SQL constrains positive amounts/company/source links and immutable snapshots. |
| P10-A08 | Real API process exits74 after transit work before commit: all receipt effects disappear. Exit73 after commit loses response. Restart/same-command recovery returns original receipt and one credit; browser also loses a committed response, reloads and recovers once. Compaction retains permanent results. |
| Lifecycle | Both pending account obligations block deactivation with transfer references. Shared-bank usage removal and premature obligation resolution fail in API/SQL. Harmless rename succeeds while immutable snapshots retain the old label. Receipt resolves obligations atomically. |
| AC-R-208 / AC-D-199 | Combined branch/state/date/reference filters, pagination, default/reset/empty behavior and detail/back retention. Arabic digits, labels, focus and320/390/768/1440 overflow checks with focused RTL/Cairo screenshots. Export remains P23. |

Consumed infrastructure: ERP-R-019/106/121/126/143/153/154/155/156/177/208 through current AccessContext/company grants, P03 UnitOfWork/source uniqueness/command recovery/audit and P09 funds/obligation service. Fault injection after account debit, transfer record, transit record and before result proves rollback of send and receipt; lower-level constraint failures cannot leave a committed partial transition. No mock funds service certifies concurrency.

ERP-R-169 / ERP-D-160: P10 supplies explicit branch cash consolidation through an ordinary treasury transfer. No timer or worker automatically consolidates accounts; brand wallet/payout and goods-stock slices remain later-owned. No partial treasury receipt, automatic Reject-and-refund, bank API, driver remittance, goods transfer, opening entry or operating-profit fact was introduced.
