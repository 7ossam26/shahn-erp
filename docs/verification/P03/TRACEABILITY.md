# P03 bounded traceability

| Requirement / decision | Evidence in this phase | Remaining consumer |
| --- | --- | --- |
| R-154; D-145 | Real multi-journal rollback, crashes before/after commit, competing connections, migration upgrade | Later domain transaction catalogs and P26 |
| R-155; D-146 | Closed EGP integer-string schemas, signed bigint bounds and checked intermediate arithmetic | Business-specific rates/rounding, reports/exports |
| R-153; D-144 | Persisted identity/result; lost-response browser state; process restart and authorized recovery | All later operations retain the same recovery behavior |
| R-177; D-168 | Append-only effects/audit/allocations; permanent compact identity after 30 days; no unresolved compaction | Production retention/backup/deactivation workflows |
| R-091/R-209; D-089/D-200 | 100 eligible + 250 pending; cover50 and fee50 leave50; both cover/payout race orders; unexpected fee persists; allow-negative cannot bypass funding | P12 actual handover policy and P17 real payout |
| R-169; D-160 | Company/brand lock, independently branch-tagged journal effects and composite company constraints | P04 brand master, P09 accounts, P16 remittance, P17 payout |
| R-096; D-094/D-102 | Database-issued unique digits-only sequence; rollback gaps not reused | P06 actual shipment display reference and duplicate brand-reference warning; P18 replacement linkage |
| R-126; D-119 | Immutable original effects with explicit linked corrections and reason | P21 review, period constraints and business-specific reversal |
| R-005/R-168 | Registered unit, real database/API/process, browser cases with persisted evidence | Phase-specific public integrations and owner review |
| D-002/D-028 | Generic durable jobs and source uniqueness; no distributed transaction claim | P11 actual canonical transport/signatures/inbox and P22 conformance |

`tests/unit/kernel.test.ts`, `tests/db/kernel.test.ts`, and `tests/p03/kernel.spec.ts` are the P03 behavioral suites. Existing money/DST tests are part of the registered phase. The kernel does **not** complete AC-R-055: only P16 can prove real full-remittance release, followed by P17's actual payment behavior. Storage receipt/advance facts remain separate from revenue and payout eligibility; P19 owns their real detail and allocation workflow. The phase does not add arbitrary production journal or balance-editing endpoints.
