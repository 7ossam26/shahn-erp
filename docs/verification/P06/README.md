# P06 parcel intake and company packing

P06 implements physically received brand-packed parcels and company packing of brand-supplied goods. Registration creates a numeric reference, immutable commercial revision and one actual branch receipt/custody record. Ready parcels bypass preparation; company-packed orders require explicit completion. Corrections are reviewed/versioned; cancellation keeps external goods in custody.

The [final registered phase](19-phase-final.txt) passed17 unit,17 PostgreSQL/API and10 browser cases. After the final UI refinements, [P06 browser](22-p06-browser-final.txt) passed10 and [P05 browser regression](21-p05-browser-repaired.txt) passed11. Final [typecheck](27-typecheck-final.txt), [lint](28-lint-final.txt) and [production build](25-build-final.txt) passed. The final deferred history guard passed all17 DB cases again in [26](26-db-history-guard-final.txt); [runner](29-runner.txt) and [provenance/diff](30-final-provenance-and-diff.txt) checks passed. The [execution record](../../../phases/execution/P06.md) preserves failed attempts and repaired checks. [Handoff](HANDOFF.md), [bounded traceability](TRACEABILITY.md) and [contract examples](CONTRACT-EXAMPLES.md) describe the interfaces and their limits.

## Reproduce verification

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run test:phase -- P06
npm run typecheck
npm run lint
npm run build
```

Node 24.21.0/npm 12.2.0 and the existing pinned dependencies are unchanged. PostgreSQL 18.3 runs in explicitly opted-in disposable native clusters with real committed transactions. Tests migrate both a fresh database and an existing P05 fixture through `0010_p06_parcel_intake.sql`; the actual CLI status is in [live-db-status.txt](live-db-status.txt). Migrations 0001–0009 are unchanged. An unconfigured default `db:status` and the initial wrong native opt-in/Docker setup failure are retained in 01–02; corrected prerequisite P04/P05 checks passed 30 cases in [03](03-prerequisites-native.txt).

The complete unit regression passed 106 cases in [15](15-unit-regression.txt). P02/P03/P05/P06 database/API/process regression passed 72 cases in [16](16-db-regression.txt). These fixture sessions enforce native request-time grants/branches; they do not exercise the customer's live OIDC issuer. Public Tawsel integration is explicitly not applicable to this phase.

The initial P05 browser regression passed7/11 in [20](20-p05-browser-regression.txt), exposing a real product-category filter leak into the parcel query. The repaired switch preserves branch/search and removes product-only criteria; [21](21-p05-browser-repaired.txt) passed11/11. Initial report/error contexts remain in [attempt20](attempt20/). Final regression reports/captures from earlier phases are under [regression-artifacts](regression-artifacts/) while their original tracked evidence is preserved.

## Acceptance evidence

| Case | Actual connected verification |
| --- | --- |
| P06-AC-01 | Ready goods100+150, shipping50: due300, goods250, one receipt/parcel/reference, no loose stock or journal effect |
| P06-AC-02 | Company-packed equivalent: due305, base50/uplift5, explicit completion once; repeated command has no additional fee or custody |
| P06-AC-03 | Missing tariff rejects every business effect and retains entered form; configured zero registers; injected failure after receipt rolls everything back |
| P06-AC-04 | Goods prepaid: due50; goods/shipping prepaid: due0, commercial tariff50/brand-funded50 retained without an invented payment |
| P06-AC-05 | Duplicate brand reference requires a visible independent-order acknowledgement; concurrent legitimate orders get different numeric references, same-command replay returns the original |
| P06-AC-06 | Tariff/policy edit preserves old snapshots; stale reviewed price rejects new confirmation; fresh confirmation uses new revision; explicit service correction uses the captured base/agreed uplift |
| P06-AC-07 | Prepared external cancellation keeps branch custody/reason/history; two cancellation/completion race launch orders each have one version winner; handed-over and integrated fixtures reject local shortcuts |
| P06-AC-08 | Phone/URL/line/money bounds, unknown fields, company/module/branch/CSRF and revoked-scope recovery fail closed; optional URLs are stored without fetching |
| P06-AC-09 | Browser forwards a real POST to commit then drops its response; reload/recovery keeps the original identity and one receipt. Packing response loss also recovers from a waiting-only queue |

Evidence comes from [connected unit checks](../../../tests/unit/shipments.test.ts), [PostgreSQL/API checks](../../../tests/db/shipments.test.ts) and [real-backend Chromium journeys](../../../tests/p06/shipments.spec.ts). Additional checks cover immutable revision/FK enforcement, exact brand-declared shared shipping remainder, frozen native source-ready projection, current inventory-only detail access, Cairo date ranges, AND/OR filters and actual P05 parcel reads. Source-integrated/handed-over guard tests use explicitly marked local fixtures, not accepted Tawsel work.

[Screenshots](screenshots/) show entry, confirmation, missing tariff, duplicate warning, detail, preparation, filters, correction and retained cancelled custody. Viewports are 390×844 and 1440×1050, plus 320/768 and long Arabic content. Checks cover horizontal overflow, named controls, error focus, detail focus, URL filters/back/reset and lost-response recovery. First browser attempt11 passed9/10 with a focus failure and accidentally named default1280 captures as1440; its original artifacts remain in [attempt11](attempt11/). Subsequent captures use an explicit1440 viewport. Captures were visually inspected against the approved shell/timeline direction; physical-device, assistive-technology and owner walkthrough remain unclaimed.

## Isolated owner trial

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run p06:trial
```

Open [admin intake login](http://127.0.0.1:5299/api/test/intake-login) or [A-only staff login](http://127.0.0.1:5299/api/test/intake-staff-login). These endpoints exist only in the isolated harness. It seeds **شركة التجربة**, **الفرع أ / الفرع ب**, a brand enabling both services, base50/uplift5, a zero tariff and a missing-price governorate. It also seeds the prior P05 stock fixture, which parcel intake does not change. Session secrets remain only in ignored `tests/.p06-runtime.json`, removed by teardown.

Fresh trial parcel references are10000 ready/due300,10001 packed/due305,10002 shipping-only/due50 and10003 fully prepaid/due0. Each run writes exact IDs to `seed-ids-*.json`. Automated journey references are in [browser-trial-references.json](browser-trial-references.json); database effects and IDs are in `database-results-*.json`. Relaunching starts a new isolated batch.

1. Visit `/shipments/new`. Select A and the trial brand; use its priced القاهرة governorate. Enter a recipient, `01012345678`, written address, explicit inspection and two lines: quantity1/unit100, quantity1/unit150. Keep recipient-funded shipping. Review due300 and actual receiving branch, assert physical receipt and confirm. The committed detail has a unique numeric reference; `/inventory?view=parcels` shows the same branch-held parcel.
2. Register another order with company packing. Review base50/uplift5/due305. Open `/preparation`, complete it explicitly, then refresh: there is one completion and no extra receipt/money. Ready parcels are absent from this preparation queue.
3. Set both unit outstanding amounts to0 and recipient shipping unpaid: due50. Register again with brand-funded shipping: due0 while tariff50 and brand-funded50 remain visible. This records the declaration, not a payment to the brand.
4. Select the missing-price governorate: confirmation is blocked and the form retained. Return to the priced governorate. Try invalid phone `123` or `javascript:` location: errors retain input and focus the cause. A blank safe location remains allowed.
5. Enter the same nonblank brand reference on two separate orders. The second requires deliberate acknowledgement and gets its own reference. Lost-response recovery is a separate procedure: automated tests abort only the committed response and then recover the original command. Do not enter a new identity to imitate a retry.
6. At `/brands/tariffs`, edit the configured base50 to60 using the existing P04 screen. Open an earlier order: its base remains50. Preview changing ready service to company packing: base50+captured uplift5, due305 and preparation effects are shown. Supply a correction reason and confirm. A branch correction also requires actual goods at the corrected assigned branch; it does not transfer them.
7. Complete packing, cancel before handover with a reason and return to Parcels: commercial state is cancelled and custody is still A. Actual handback is a later P14 operation.
8. Try combined brand/date/preparation filters, reset, detail/back and staff's fixed A scope on phone and desktop. Stop with Ctrl+C; the harness stops its processes and removes its own disposable cluster/runtime file.

This is a reproducible guide supported by automated journeys, not a claim that the owner performed it. P07 stored-stock fulfillment, P11 source adapter/recovery, P12 dispatch/cover/handover, P13 execution/visit fees, P14 returns and P18 incident-linked replacements remain later-owned. No external source command, successful assignment, driver round, deployment, publication or merge was performed.
