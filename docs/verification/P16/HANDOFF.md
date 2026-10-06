# P16 interfaces and boundaries

Native implementation dated 2026-10-06. Independent Tawsel/human acceptance is still required. No global financial finality claim is made.

## Implemented paths

- `apps/api/src/modules/finance/remittances/evidence.service.ts`: `RemittanceEvidenceService.refresh`, `authorizeRound`, `currentSources`, `expectedSources`, `readWitness`.
- `apps/api/src/modules/finance/remittances/service.ts`: `RemittanceService.confirm/recover`, `remittanceDetail`; real P03 CommandService/UnitOfWork, WalletService/JournalPosting and P09 AccountFundsService.
- `apps/api/src/modules/finance/remittances/http.ts`: authenticated closed input/output, current grants, assigned branches, native cookie/CSRF and retained command lookup.
- `packages/contracts/src/finance/remittances/index.ts`: scope, component, immutable command, witness/source, result/detail and list/filter schemas, validators and OpenAPI paths.
- `packages/database/migrations/0020_p16_remittances.sql`: immutable witness, refresh, receipt, source coverage and components; company-scoped foreign keys, unique round/source coverage, account movement links and deferred exact-sum/basis constraints. No historical receipt or eligibility backfill.
- `apps/web/src/features/finance/remittances/remittances.tsx` and `.css`: list, review and detail; `/remittances` with `/driver-remittances` screen-spec aliases.
- `tests/integration/p16/`: contracts/72 exact canonical fixtures, real database/races/restart/upgrade, browser/API and separately blocked independent public trial.

Registration extends `app.ts`, web `main.tsx`, domain/contracts capabilities, root contract/OpenAPI exports, phase registry and Vitest/Playwright configs. P09 account movement types and Arabic labels now identify remittance receipts explicitly.

## Source witness

`refresh(token, {companyId, driverId, roundId, branchId})` authorizes before network reads, uses P13 `RoundEvidenceService`/P11 authenticated `MonitoringReader`, then persists an immutable semantic witness plus a separate checked-at refresh fact. All complete trip/workday/task pages are fetched outside money transactions. Snapshot409 restarts a bounded read,304 retains its validated complete body,401/403 stops further reads,404 does not assert absence, and outage/missing pages block readiness.

P13 is extended to include start/closure task identities, workday outcome/attempt task membership, scoped checkpoint/review status and cross-read effective outcome comparisons. A nullable missing workday identity is represented as null. The witness includes task/native-cycle/attempt/outcome revisions, actual goods/shipping/reported amounts (null remains null), pending goods lot links, round-end event/action identity, source snapshot/history scope and revisions, checkpoints, blockers and total. Scope/digest/revision are rechecked at confirmation. Refresh time is distinct from semantic witness revision; an unchanged304 does not invalidate a reviewed amount solely because a clock advanced.

This establishes consistency of the received evidence checked, not absence of unseen device work. Neither closure, an empty queue nor a successful first page is a finality token. No driver-human command is issued by this module. Original source bodies remain technical evidence; native staff identity is audited separately.

## Receipt and eligibility for P17

`confirm(token, RemittanceCommand)` accepts a reviewed witness ID/revision/digest, actual date and positive Cash/Bank-deposit/InstaPay components; no arbitrary expected total or eligibility flag. Optional references may be absent/blank. Under the shared source lock, it checks current basis, source coverage, current permissions and exact sum. It locks visits, brand wallets and sorted accounts and commits account credits, unique source coverage, goods-credit releases, protection/audit and retained result together. Zero expected amount creates a checked record without money movement or eligibility release.

`finance.remittance_source` is the immutable bridge from each effective payment to its receipt and `kernel.credit_lot`; `finance.remittance_component` links exact `finance.money_movement` records. `kernel.credit_release` is the existing shared-wallet eligibility API: only the corresponding ordinary goods lots are released, never shipping or prepaid goods. P17 must use the same locked WalletService, current scoped integration gaps/reviews and holds; a historical release is not permanent clearance for every future payout. P16 does not implement payout or independent wallet storage.

Retained native result lookup is `/api/v1/finance/remittances/commands/{commandId}?companyId=…`. It reauthorizes on every read, including compacted result resolution. An identical command returns its result; changed payload conflicts. The browser retains the original immutable command through unknown submission/reload and resends only that payload when no retained result exists.

## Corrections, review and P21/P22

P13 `visit-facts.service.ts` uses existing `execution.settlement_review` and `kernel.wallet_hold`, linking the remittance ID in native review basis. Accepted corrections to protected remittances and later newly received outcomes after a checked/remitted round create a real linked review. Original account movements and witness stay immutable. Holds are limited to the remaining affected lot; no unrelated brand/company freeze or automatic refund. The review contains original allocation and new effective outcome/basis, source correction identity, visit and receipt reference; duplicate application cannot repeat it. Native review classification is descriptive and adds no reason field to Tawsel.

Race orders tested with independent database connections:

1. Correction commits after remote refresh but before confirmation obtains the source lock: current outcome/basis differs, old command rejects without money or release.
2. Confirmation holds the source lock first: cash/coverage/release commits once, concurrent correction follows and opens its linked review/hold without changing cash.

P21 retains ownership of authorized resolution through its existing typed review-resolution primitive. P22 retains full replay/snapshot orchestration and public conformance. No human outcome/correction endpoint, payout, payroll shortage, compensation, production migration or real payment is introduced.

## Required remaining external evidence

IP-GAP-004 remains open: an approved independent Tawsel environment, matching source `monitor.read` credential, native ERP test company/session and legitimate separately authorized human driver facts are not configured on this host. The public test requires `TAWSEL_CONFIG_FILE` and `TAWSEL_P16_TRIAL_FILE` and fails explicitly when absent. The trial interface is in `tawsel.public.test.ts`; store credential files outside Git. It reads all public pages and compares real human outcome IDs with the original ERP witness and actual isolated800/200 receipt. The complete human gap/recovery/correction journey and owner device/manual review remain mandatory and unexecuted. CHECK-003 is unchanged and unrelated to this remittance completion gate.
