# P05 products, actual stock receipt and daily monitoring

Implementation is bounded to P05. The complete registered run in [28-phase-final.txt](28-phase-final.txt) passed 4 unit, 17 real PostgreSQL/API and 11 browser cases. The latest visual fixes passed all 11 browser cases again in [32-browser-visual-repaired.txt](32-browser-visual-repaired.txt), followed by final [typecheck](33-typecheck-final.txt), [lint](34-lint-final.txt), [production build](35-build-final.txt) and [diff check](36-diff-check.txt). [Execution](../../../phases/execution/P05.md) retains failed attempts and exact corrected runs. No P06 work, Tawsel changes, production rollout, purchase, payment, commit or merge is part of this result.

The feature uses the existing Arabic RTL/Cairo shell and inventory module card. Product setup lives at `/brands/:id/products`; an existing product is edited/deactivated at `/products/:id/edit`. Actual receipt is `/inventory/receipts/new`. Monitoring is `/inventory` with a local Products/Parcels switch; receipt and variant histories retain source links. Company inventory access grants these operations with current receiving-branch scope. Product definition creates no stock or money.

## Reproduce checks

Use the pinned runtime and explicitly opted-in disposable native PostgreSQL harness on this Windows host:

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run test:phase -- P05
npm run typecheck
npm run lint
npm run build
```

`test:phase` registers real unit, database/native HTTP and browser layers, rejecting absent/zero suites. Public Tawsel integration is explicitly not applicable. Tests create independent clusters and committed transactions; no outer rollback fixture substitutes for concurrency/durability. PostgreSQL is 18.3 with synchronous commit/fsync; existing dependency versions are unchanged.

## Acceptance evidence

| Case | Connected verification |
| --- | --- |
| P05-AC-01 | Product/Blue/Red generated identities, virtual zero positions, no receipts/movements/journal effects; API/DB plus phone setup |
| P05-AC-02 | Blue 10 sound + 2 damaged = 12 physical / 10 sound and available / 2 unavailable / 0 reserved; Red 3; one multi-line receipt with saved labels and actual/recorded dates |
| P05-AC-03 | Two independent principal/connection transactions synchronize before locking a previously absent position; legitimate receipts 3+4 yield one position, 7 sound and distinct receipts |
| P05-AC-04 | Negative/fractional/unsafe quantities, mixed real brands and forbidden branch reject; injected failure after first movement leaves no receipt/movement/increment/successful audit or command result |
| P05-AC-05 | Actual HTTP commit followed by deliberately dropped browser response; reload keeps original command ID, recovery finds one receipt and one stock increment. Changed payload conflicts. Compacted result and revoked-scope recovery tested in PostgreSQL/API |
| P05-AC-06 | Marked model fixture receives 7, creates claims 4+3, appends a truthful observed −2 movement: physical 5/reserved 7/available 0/shortage 2; both claims held, unrelated Red usable; replenishment releases holds |
| P05-AC-07 | A-only and multi-branch authenticated reads; A-only B tampering rejects without B names. Tracking grant does not broaden inventory. Real branch revocation rejects duplicate/recovery/detail; browser refresh invalidates selection |
| P05-AC-08 | Server AND/OR filters, current quantities under recorded movement-date selection, stable order, detail/back filter restoration; 320/390/768/1440 layouts with long labels and active filters |

Additional real database cases cover immutable source history, composite company/brand constraints, receipt-line effect uniqueness, >SQL-integer safe quantities and aggregate overflow rollback, current module grant/CSRF, duplicate display warning, rename/deactivation, version conflicts and source-idempotent reusable condition/reserve/release interfaces. See [contract examples](CONTRACT-EXAMPLES.md). Shared regression results (51 cases) are in [29-prerequisite-regression.txt](29-prerequisite-regression.txt), earlier prerequisite checks in 01–03, and 89 unit tests in [20-unit-regression.txt](20-unit-regression.txt).

Screenshots are in [screenshots/](screenshots/): inventory and advanced-filter states at 320/390/768/1440, phone receipt confirmation/history, connection error and unknown receipt recovery. Viewports are 390×844 and 1440×1050, with 320/768 checks. Tests assert no horizontal document overflow, named controls, validation focus and history-title focus. These are local Chromium checks; physical device, assistive technology and owner walkthrough are not claimed.

## Isolated manual trial

```powershell
. ./scripts/use-pinned-runtime.ps1
$env:SHAHN_TEST_PG_BIN = 'C:/Program Files/PostgreSQL/18/bin'
npm run p05:trial
```

Open [the isolated admin fixture](http://127.0.0.1:5297/api/test/inventory-login) or [the A-only staff fixture](http://127.0.0.1:5297/api/test/inventory-staff-login). This creates a marked **شركة التجربة** company with branches **الفرع أ / الفرع ب**, admin, staff-a and staff-ab fixture sessions and one active P04 brand. The initial seeded demonstration has Blue 10 sound/2 damaged and Red 3 at A. Exact company/branch/user/brand/product/variant/receipt IDs are retained in `seed-ids-*.json`; database fixture IDs/outcomes/reconciliation are in `database-results-*.json`. Session secrets are held only in the ignored runtime file and removed by teardown. Real OIDC login is not exercised by these persisted P02 fixture sessions.

1. From inventory, select A explicitly as admin. Confirm Blue 12 physical / 10 available / 2 unavailable and Red 3. Staff-a sees only A, with no receiving-branch choice.
2. Open the brand's product setup link. Define a new product **قميص المراجعة اليدوية** with **Blue** and **Red** variants. Search that exact product from inventory: both balances are zero. Product setup did not receive stock.
3. Choose **تسجيل استلام مخزون**. Select A, the trial brand and this new Blue variant. Enter 10 / sound, add Blue 2 / damaged, and Red 3 / sound. Review branch/date/condition before **تأكيد الاستلام الفعلي**. Open the resulting immutable receipt and affected variant history.
4. Search Blue, choose the trial brand and unavailable category, apply advanced filters, open history and return through **العودة بنفس الفلاتر**. Search and filters remain; balances are current. Phone advanced filters have Apply/Reset; Escape closes the dialog.
5. Enter a negative quantity: validation retains input and posts nothing. As staff-a request `/api/v1/inventory/products?companyId=<trial-company-id>&branches=<B-id>` through a browser fetch: server 403, no B data. The automated denied-scope test uses actual browser credentials.
6. The controlled response-loss procedure is automated in `tests/p05/inventory.spec.ts`: it forwards the real POST to commit, then aborts only its response. It reloads, recovers the original command and checks one increment. Do not imitate a lost response by entering another receipt with a new identity.
7. Stop the trial with Ctrl+C. The harness stops Vite/API and removes only its newly created disposable cluster/runtime file. Relaunching creates a fresh marked batch; business history has no delete/reset UI.

## Scope and remaining review

Reservations/holds in P05 tests are explicit shared-model fixtures, not real shipment work. P07 owns order confirmation/preparation, P14 actual returns, P15 transfer custody, P21 ordinary observations/adjustments, and P23/P24 report/export/profit completion. Parcels is truthfully empty until P06 and labels external custody separately without inventing holdings. No count sessions/freezes, barcode/label rollout, product valuation or procurement was added. See [handoff](HANDOFF.md) and [bounded traceability](TRACEABILITY.md).

Owner device/manual review, customer live issuer and a fresh real OIDC login/browser regression remain pending. Local automation does not certify production readiness. Initial `db:status` had no configured environment; the real disposable-cluster CLI status is preserved in [07-live-db-status.txt](07-live-db-status.txt). Docker was unavailable, so tests explicitly opted into installed PostgreSQL; no in-memory substitute was used.
