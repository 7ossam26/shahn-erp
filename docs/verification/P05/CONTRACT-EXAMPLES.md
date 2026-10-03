# P05 contract examples

These UUIDs illustrate request shape; they are not registered production entities. Native routes accept the closed command envelopes generated in `packages/contracts/openapi.json`. Authentication, current company/module/branch scope and CSRF validation still apply.

```json
{
  "schemaVersion": 1,
  "commandId": "22222222-2222-4222-8222-222222222222",
  "companyId": "11111111-1111-4111-8111-111111111111",
  "type": "stock.receive",
  "branchId": "33333333-3333-4333-8333-333333333333",
  "brandId": "44444444-4444-4444-8444-444444444444",
  "actualDate": "2026-10-03",
  "lines": [
    { "variantId": "55555555-5555-4555-8555-555555555555", "quantity": 10, "condition": "sound" },
    { "variantId": "55555555-5555-4555-8555-555555555555", "quantity": 2, "condition": "damaged" }
  ]
}
```

POST this envelope to `/api/v1/inventory/receipts`. For active authorized entities and a nonfuture Cairo date, it adds 10 sound and 2 unavailable units atomically. `uncertain` also adds unavailable units. Actual date describes arrival; recorded time is the server's current time.

| Changed example | Required rejection or behavior |
| --- | --- |
| Quantity `0`, `-1`, `0.5`, `9007199254740992` or `"10"` | Reject: positive safe JSON integer required |
| Condition `good`, additional `profit` field, missing branch or empty lines | Reject closed schema |
| Date `2026-02-30` | Reject invalid calendar date |
| Actual date after today's Cairo date | Reject before commit; do not rewrite recorded time |
| Unknown/inactive variant, variant from another brand/company | Reject entire receipt |
| Receiving branch outside current assignments | Reject; expose no branch stock or names |
| Same command ID and identical payload | Recover original result after current authorization |
| Same command ID with changed quantity | Conflict; no second stock effect |
| Addition exceeding `Number.MAX_SAFE_INTEGER` | Roll back all lines, receipt and successful outcome |
| Existing product update with obsolete `expectedVersion` | Conflict; require explicit review before retry |

Product create uses `type: "product.create"`, `brandId`, and `fields: { name, active, variants: [{ name, options, active }] }`. Product update uses `type: "product.update"`, `productId`, positive `expectedVersion`, and the complete fields; existing variant entries retain their generated `id`. Deactivation is a versioned update. Repeated display labels warn without merging identities. Neither operation creates stock or money.

Inventory query multi-selects use comma-separated UUIDs/categories. Fields combine with AND and values within a field with OR. At least one assigned branch is required. Pagination defaults to 25 with 50/100 alternatives and stable ties. Recorded movement-date bounds select positions with movement in that inclusive Cairo interval; displayed balances remain current.

Executable quantity/schema examples are in `tests/unit/inventory.test.ts`; connected authorization, replay, overflow, version and transaction examples are in `tests/db/inventory.test.ts`. See [verification](README.md) for observed runs and [handoff](HANDOFF.md) for caller-owned stock effects.
