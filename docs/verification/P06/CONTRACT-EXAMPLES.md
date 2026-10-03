# P06 native contract examples

Money is exact EGP minor-unit text. These are native examples, not Tawsel payloads. Confirmation always adds the session-bound company/command envelope, reviewed current policy/tariff identity+versions, deliberate duplicate acknowledgement and `actualReceipt:true`. Unknown properties and caller-supplied identity/reference/price snapshots are rejected.

| Service and declared outstanding | Goods minor | Base / uplift minor | Recipient shipping / brand shipping minor | Recipient total minor |
| --- | --- | --- | --- | --- |
| Ready, quantities1 each/unit10000+15000 |25000|5000 /0|5000 /0|30000|
| Company packing, same goods |25000|5000 /500|5500 /0|30500|
| Ready, goods paid to brand |0|5000 /0|5000 /0|5000|
| Ready, all paid to brand |0|5000 /0|0 /5000|0|
| Ready, declared shipping remainder20 |25000|5000 /0|2000 /3000|27000|

`shippingPayer='recipient'` or `'brand'` requires null `recipientShippingDue`. `'shared'` requires exact EGP Money no greater than the full tariff. Shared amounts are declarations, not inferred deposits; no payout debit occurs at intake. Completing packing does not add another fee.

Lines carry stable UUIDs, nonblank descriptions up to200, whole positive quantity≤1,000,000 and nonnegative per-unit Money. Between1 and100 lines are required. Unit/product/goods/recipient totals must convert safely within the retained canonical numeric bound. Different outstanding unit values require different lines. Fractional quantity, duplicate line identity, negative amount, >2-decimal UI amount, overflow or excessive text rejects.

The phone pattern is `^(?:\\+[1-9][0-9]{7,14}|01[0125][0-9]{8})$` after supported Arabic/Persian digits and permitted literal separators are normalized. `01012345678`, `+201012345678` and `٠١٠ ١٢٣٤ ٥٦٧٨` pass; `123`, missing/text/comma-separated values fail. Original display and canonical phone are both stored. This is syntax validation.

Recipient name≤200, address≤500, optional brand reference≤256 and comment≤1000 follow pinned bounds. Optional location is blank or a safe absolute HTTP/HTTPS URL without userinfo or surrounding whitespace; it is never fetched or treated as validated coordinates. Inspection is a required boolean independent of comment and captured partial policy.

Corrections add shipmentId/expectedVersion/reason/fields/actual-location assertion/duplicate acknowledgement; preview carries before/after prices, branches, preparation and custody effect. Cancel adds reason; prepare adds expectedVersion. Stale, cancelled, integrated or handed-over transitions fail closed. Stable typed errors include field maps for invalid input, missing tariff and forbidden branch; business rejection creates no shipment/receipt/source/journal effects.

Executable examples: [unit](../../../tests/unit/shipments.test.ts), [HTTP/database](../../../tests/db/shipments.test.ts), [ordinary field helper](../../../tests/support/shipments.ts), [repeatable seeded confirmation](../../../apps/api/src/modules/shipments/seed.ts).
