# P04 bounded traceability

The exact owner statements and AC mappings were read from [traceability](../../../REQUIREMENTS-TRACEABILITY.md). These are P04 implementation/consumption/exclusion slices; cross-domain requirements remain incomplete until their other owning phases pass.

| P04 contribution | Requirements | Decisions | Evidence owner |
| --- | --- | --- | --- |
| Direct company-level Brand; generated UUID, one empty shared wallet across branches; no merchant hierarchy | R-010/034/169 | D-033/160 | Committed PostgreSQL replay/rollback and composite wallet FK |
| Three allowed services, enabled default, partial policy separate from later inspection; fixed applicable packing uplift | R-036/047/048/065/072/077 | D-021/035/046/047/065/066/071/076/092/194 | Domain, closed contracts, real brand setup and 50/55 pricing; later preparation/visits unclaimed |
| Staff-selected tier, optional descriptive range, governorate/area lookup; explicit zero, missing-price rejection; immutable new-snapshot source revisions | R-037/052/053/054/063/182 | D-036/050/051/052/063/173 | Unit/DB A/B lookup/history and browser explanations; R-052/D-050 obsolete automatic selection excluded |
| Current payout weekdays/negative option and storage agreement fee/start/anchor/branch/stop; no payment or earning from setup | R-041/073/075/181 | D-040/053/067/073/074/089/137/139/172/200/201/204 | Typed policy, branch validation and UI; P12/P17/P19 own gate/payout/period/receipt behavior |
| Ordinary reference screen grants, stable reference identities, deactivation/history; isolated API/UI/seed | R-062/177 | D-061/168 | Screen registry, server authorization, SQL guards and reference editor |
| No brand portal; no ready-only restriction; no auto tier; no packing inventory/counters; no goods credit or payments | R-046/047/138 | D-030/045/049/129/169/194/201/204/205 | Closed service keys and zero journal effects. Expense categories R-138/D-129 are future consumers of the reference administration pattern, not implemented expense records |

R identifiers above mean `ERP-R-`; D identifiers mean `ERP-D-`. Full assigned IDs remain in the phase file. Shared UI/scope/test obligations come from EXECUTION-CONTRACT. P05/P06/P08/P12/P13/P17/P18/P19/P21/P23 consume these settings or own later behavior; this handoff does not mark their acceptance complete.
