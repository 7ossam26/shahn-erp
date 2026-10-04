# P09 bounded acceptance traceability

Evidence is local, using Node24.21.0/npm12.2.0, disposable PostgreSQL18.3, independent competing connections and persisted P02 fixture sessions. Customer issuer, owner/device review and later workflow acceptance remain pending. See [execution](../../../phases/execution/P09.md) for failures and corrected reruns.

| Case | Implemented evidence |
| --- | --- |
| P09-A01 zero creation/replay | DB account creation at0, no journal effect, same native command result; repeatable isolated seed produces no new cash. Browser creates a real zero bank account. |
| P09-A02 1000−200−100=700 | DB and browser commit70000 minor units, exactly3 movements and one cost20000. Deposit/withdrawal have no operating fact. |
| P09-A03 B/shared bank | B-only persisted session funds an expense through Company Bank/InstaPay; branch remainsB, forgedA fails; frontend selector has onlyB. |
| P09-A04 past actual date | Actual2026-09-01 with current recorded timestamp/actor, actual/recorded filters. A real P08 salary period marked paid remains unchanged. |
| P09-A05 funds contention | Both expense-first and general-withdrawal-first races: distinct sessions, independent DB connections, observed PostgreSQL lock waiter, one700 debit from1000, remaining300. |
| P09-A06 response/restart | Real child exits before commit74 and after commit73; restart retrieves one retained movement. Browser loses a committed expense response, reloads, restores payload and recovers once; before-commit connection loss replays the same command ID. Compaction recovery also passes. |
| P09-A07 inactive master data | Current category/account use rejects; historical labels/actors/dates survive rename/deactivation. Registered pending transfer and unresolved observation obligations block account deactivation until both resolve. |
| P09-A08 company isolation | Actual foreign-company account ID returns404 under local company in detail/filter/command; foreign-company recovery denies403. Composite branch FK rejection and revoked branch/grant recovery checks have no effects. |

Requirement slices: ERP-R-118/119/120/121/123/124/130/137/138/139/143 are implemented for P09's three workflows. ERP-R-154/155/019/033/106/126/153/156/177 are consumed through shared transaction/authority/exact-money infrastructure; the relevant phase regressions remain separately identified. ERP-R-208 and ERP-D-199 have combined server filters, reset/empty states, preserved query on detail/back,320/390/768/1440 captures and overflow checks. ERP-R-142 / ERP-D-133 consume the unresolved-obligation/deactivation boundary only; actual cash observations and discrepancy resolutions remain P21. ERP-D-112/113/114/115/117/122/128/129/130/134 govern the implemented workflow/classification choices. Expense reports/export/profit dashboard, other payment sources, opening entries and later workflows retain their original phase ownership; this record does not mark a cross-domain requirement globally complete.

Rollback injection after expense insertion, after posting and before result persistence checks complete removal of transient effects, unchanged account projection and no command/audit success. Permanent business rejection retains its authorized result/audit. Schemas reject zero, negative, fractional, exponent, unsupported currency, extra opening fields and impossible dates. Funds service validates bigint bounds and source changes. SQL rejects negative balances, removed cash scope and historical mutation.
