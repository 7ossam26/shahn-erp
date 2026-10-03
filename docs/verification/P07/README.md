# P07 verification and owner trial

Status: verified within stated local scope. See the [execution record](../../../phases/execution/P07.md) for actual attempts and the [handoff](HANDOFF.md) for consuming interfaces.

Use the existing pinned runtime from the repository root:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run test:phase -- P07
```

This explicitly opts into disposable native PostgreSQL 18 clusters. Each test uses real commits and independent clients; fixture sessions are persisted P02 sessions. No customer/live identity or Tawsel connection is represented. The default schema-status attempt lacks configured APP_ENV/DSN; `live-db-status.txt` is the actual CLI against the disposable upgraded P06 cluster. Public integration is not applicable to this local phase.

## Automated evidence

| Check | Actual result | Evidence |
| --- | --- | --- |
| `npm run test:phase -- P07` | 4 connected unit, 15 real PostgreSQL/API and 6 Arabic browser cases passed; public integration not applicable | [Final registered suite](28-phase-final.txt), [schema status](live-db-status.txt), [persisted quantities](db-results.json), [browser report](browser-results.json) |
| `npm run test:unit` | 110 passed | [Unit regression](20-unit-regression.txt) |
| `npm run test:db -- tests/db/brands.test.ts tests/db/kernel.test.ts tests/db/shipments.test.ts tests/db/inventory.test.ts` | 68 passed | [Real database/API/process regression](19-db-regression.txt) |
| `npm run test:p05:browser` / `npm run test:p06:browser` | 11 / 10 passed | [P05 regression](31-p05-browser-regression.txt), [P06 regression](32-p06-browser-regression.txt) |
| `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:runner` | All passed; runner1 case | [Typecheck](33-final-typecheck.txt), [Lint](34-final-lint.txt), [Build](35-final-build.txt), [Runner](30-runner.txt) |

AC01/02/04 cover real receipt Blue5/Red3, aggregate stock requirements with distinct commercial values, missing tariff and rollback. AC03 uses independent clients behind a database position-lock barrier, plus reverse-input multi-line contention. AC05/06 cover prepared cancellation, actual sound/damaged inspection, failed increase retaining old revision/claims and destination-stock correction. AC07 holds all affected claims at sound5/reserved7, permits unrelated preparation and clears holds after actual replenishment. AC08/09 cover stable recovery/conflicting payload, stale versions, accepted-source/handed-over guards and request-time branch denial. Additional cases exercise zero recipient due, prepared correction, bounded partial inspection, injected rollback, inactive variant and actual service changes without duplicate receipt/custody.

The final database summary contains one external receipt deliberately introduced by the service-correction case. Initial stored-stock confirmation still creates none; the service-change assertions prove that existing receipt is not repeated. All money counts remain zero.

Arabic browser captures include long recipient/variant names, mobile390, shortage/blocked states at320/768/1440 and desktop recovery. [Prepared cancellation and actual unpack](screenshots/unpack-390.png), [blocked desktop queue](screenshots/blocked-queue-1440.png), [server shortage with preserved input](screenshots/server-stock-shortage-1440.png). Visually reviewed mobile detail/unpack and desktop blocked queue. Review caught an English blocked-filter value and company-only subtitle; both are corrected in the final suite. Horizontal-overflow assertions passed at all tested widths. These captures do not replace owner/device/assistive-technology review.

Earlier failures are retained: initial setup/type errors, observation fixture cast, missing selector label, transient database setup timeout and browser assertion/routing synchronization errors. Attempt23's original report and error contexts remain in `attempt23/`; attempt13 remains in `attempt13/`. Dated execution records distinguish skipped checks from passed cases. New P03/P04/P05/P06 regression artifacts are copied into `regression-artifacts/`; their earlier evidence is preserved unchanged.

## Isolated owner trial

```powershell
npm run p07:trial
```

Open [fixture login](http://127.0.0.1:5309/api/test/intake-login), then `/preparation/orders/new`. This harness alone exposes fixture login and authenticated test control; production startup does neither. The test company has assigned branches A/B, a brand enabling all services with base50/uplift5, a missing Giza tariff, and an actual P05 receipt of Blue5/Red3. A separate Held variant demonstrates observed sound5/reserved7. Timestamped seed evidence contains exact identities/references without session secrets. Ctrl+C disposes the isolated harness.

1. Choose branch A and the trial brand; choose Blue2 at unit outstanding50 and Red1 at150. Enter recipient/address/phone, Cairo and inspection choice. Review recipient305 and confirm reservation. On-hand remains Blue5/Red3; reservations2/1 and available3/2. No second receipt appears.
2. In preparation select branch A, find the numeric reference and explicitly complete packing. Product and parcel views reference the same goods. Preparation creates no stock movement or earning.
3. Open the order, expand its actions and cancel with a reason. Blue2/Red1 become unavailable pending actual unpack; reservations are released and physical quantity is unchanged. Actually inspect Blue1 sound/Blue1 damaged and record those quantities with a reason. Only the sound Blue1 returns available. Red remains unavailable until inspected.
4. Request too much Blue, or choose missing-tariff Giza. Observe the explanation and preserved input. Change the uncommitted branch to B; existing selections stay visible but availability is revalidated against zero destination stock.
5. Filter preparation by blocked state and open the Held order: shortage2 is visible and completion is unavailable. This is a marked observation fixture, not an adjustment UI.
6. For a manual last-unit race, receive an isolated variant through `/inventory/receipts/new` with quantity1, open two sessions at the stock-order page, choose one unit in each and submit. Exactly one should confirm; the other names its shortage. Automated DB evidence uses independent clients and a database barrier.
7. Browser tests simulate loss of a committed response and reload recovery. The retained native command identity returns the original reference without creating another reservation. A changed payload with that identity conflicts.

Owner execution, real devices and assistive-technology review remain pending. Automated browser/DB evidence is recorded separately and does not claim a physical owner trial. P08 and later workflows are outside this handoff.
