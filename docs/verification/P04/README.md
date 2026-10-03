# P04 — commercial configuration and immutable pricing

Date: 2026-10-03, Africa/Cairo. **Verified within the stated local scope.** Scope: staff-managed company brands, governorates/areas, manually negotiated tiers, immediate tariff revisions, current payout/credit settings, storage agreement configuration and immutable pricing snapshots. Final attempts and limitations are recorded in [execution](../../../phases/execution/P04.md).

## Run and review

Use the existing isolated Node 24.21.0/npm 12.2.0 runtime and PostgreSQL 18.3 installation:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run test:phase -- P04
npm run p04:trial
```

The manual trial uses disposable PostgreSQL with fsync/synchronous commit, authenticated persisted P02 fixture sessions and the actual API. Open [the isolated trial entry](http://127.0.0.1:5295/api/test/brands-login). It selects the ordinary test administrator; there is no production fixture-login endpoint or password. The test company is **شركة التجربة**, branches **الفرع أ / الفرع ب**. Ctrl+C stops the API/web processes and removes this disposable cluster. Do not point this seed at a customer database. The customer's live issuer and a new real OIDC password/MFA login are outside this local harness; P02 retains its earlier actual Keycloak evidence. Docker/Keycloak is unavailable on this host, so no new issuer browser regression is claimed.

The seed produces one brand, one empty shared wallet, Cairo base 50 EGP, the requested Dokki test area override 60 EGP, uplift 5 EGP and two negotiated tiers. Dokki under Cairo is deliberately the phase's supplied pricing fixture, not a geographic assertion. [Final browser seed IDs](seed-ids-1791056977086.json) identify that disposable run's actual brand `a495895e-13e7-4fb6-b531-19cadbc116a6`, Cairo `2e28b118-5c12-46fd-8811-228b4a14db8b`, Dokki `71c510c0-c19e-4057-8d3b-c335ff9ba95e` and negotiated tier `89a95eeb-e4aa-47c3-8564-994917fdeae3`. A new trial generates new IDs; use its on-screen brand link. [Final database evidence](database-results-1791057077053.json) contains committed snapshot A/B IDs and bodies. The running harness's ignored `tests/.p04-runtime.json` includes its current IDs and session secrets; never share that file.

1. Open the seeded brand. In **معاينة السعر**, select branch A, ready service, Cairo and no area. **معاينة السعر الحالي** shows **50.00 ج.م** and governorate source. Select the Dokki test area: **60.00**. Clear the area and choose company packing: **55.00**, with base **50.00**, uplift **5.00** and percentage commission basis **50.00**.
2. Select Giza: a missing-price explanation appears, with no confirmed price. Configure a tariff through **أسعار الشحن**, selecting the tier and Giza. Enter `٠`: the configured zero is a valid price. Deactivating an area override restores governorate fallback; deactivating the governorate rate blocks snapshots when no override applies.
3. **إضافة براند** groups identity, services, tier/pricing, payout/credit and storage. Enter a long Arabic name, enable company packing, remove ready service while leaving the ready default, and Save. Expect a default-service rejection and retained input. Choose the enabled default and save: one brand/policy/empty wallet commits.
4. Enable stored stock. Supply monthly fee **310**, service start **2026-01-31**, agreement branch A and active agreement. The original anniversary remains **31**. Save only configures the agreement; period generation, receipts, advances, refunds, stock and payouts are unavailable in this phase.
5. Open a saved brand in two tabs. Save an edit in A, then save a different edit from the older tab B. B reports the current revision and retains its text. Use **احتفظ بمدخلاتي وراجع النسخة الحالية**, inspect current history and save deliberately.
6. Search/filter the brand list by status, enabled service and negotiated tier. Advanced filters include partial policy. Chips/reset and back navigation keep the selected query; results/totals are paginated by the server. No ungranted wallet/financial link is introduced.
7. Use **البيانات المرجعية** for separate governorate, area and tier editors. Rename/deactivate a referenced record; its UUID and earlier snapshot labels remain fixed. Tariff decisions use the ordinary `brands` screen grant. Reference maintenance uses `reference-data`; neither requires developer support.

## Evidence and boundaries

| Check | Observed result | Evidence |
| --- | --- | --- |
| Registered P04 suite | 4 unit, 13 PostgreSQL/API, 11 browser passed; production build passed | [Final registered phase](30-phase-final.txt) |
| Final browser UI | 11 passed after limiting preview services to the saved enabled/default service | [Final browser/build](41-browser-final.txt), [structured result](browser-results.json) |
| Final authorization | 13 PostgreSQL/API passed after hiding tariff values from reference-only roles | [Final DB](44-catalog-scope-db.txt), [committed data](database-results-1791057077053.json) |
| Shared regression | 85 unit, 52 PostgreSQL/API, 6 kernel browser passed | [Unit](26-all-unit-regression.txt), [DB](27-prerequisite-db-regression.txt), [kernel browser](32-kernel-browser-regression.txt) |
| Foundation browser | 7 passed initially; corrected native outage/restart case passed separately | [Initial 7-pass/1-fail](31-foundation-browser-regression.txt), [repair 1-pass](38-foundation-recovery-repaired.txt) |
| Quality | Final typecheck and lint/format passed | [Typecheck](45-final-typecheck.txt), [lint](46-final-lint.txt) |
| Final build | Passed after the last authorization change | [Production build](47-final-build.txt) |

The runtime remains Node 24.21.0/npm 12.2.0. PostgreSQL 18.3 and its bundled `pg_trgm` extension supplied the native database verification. No external dependency version was upgraded; the domain workspace now depends on the existing contracts workspace. Earlier tracked P01/P03 results/captures were restored byte-for-byte after preserving new regression outputs under `regression-artifacts/`.

Visual review covered the actual retained-error and saved screens at 320/390/768/1440 widths, including long Arabic text and the grouped service/storage sections. Open [390px retained error](screenshots/setup-error-390.png), [390px saved form](screenshots/setup-saved-390.png), [1440px saved form](screenshots/setup-saved-1440.png) and [pricing/source preview](screenshots/price-preview-1440.png). This is automated capture and agent visual review; owner physical-device review remains pending.

Meaningful unit tests exercise closed schemas, service/default/storage validation, exact 50/60/55/zero/missing lookup and overflow. Committed PostgreSQL/HTTP tests exercise atomic creation/replay, failure rollback, immutable A/B snapshots, stale concurrent edits, same-company constraints, history, grants, CSRF and query pagination. Browser tests use the real local API and cover 390×844, 1440×1050, 320 and 768 widths, retained rejection input, lost committed responses, explicit stale recovery, reference/tariff/storage forms and filter/back behavior. Screenshots are under `screenshots/`; owner physical-device and manual review remain pending.

Earlier failures remain numbered: initial Docker prerequisite attempt; initial type errors; the first native access run with changing build outputs; tariff BEFORE-trigger comparisons of generated fields; initial form-label/browser checks; lint prefer-const; transient OneDrive OpenAPI file access; a fixture header selector; and native foundation restart timeout/obsolete migration expectations. Corrected reruns are recorded separately. The P04 migration narrows P02 command defaults to P02 kinds and P02 recovery excludes consumer command kinds. Earlier SQL files are unchanged.

Only P04 is implemented. No shipping confirmation/custody, real stock, storage periods/payments, visit earnings, cash, payout, Tawsel request, production deployment, merge or P05 work is claimed. See [consumer interface](HANDOFF.md) and [bounded traceability](TRACEABILITY.md).
