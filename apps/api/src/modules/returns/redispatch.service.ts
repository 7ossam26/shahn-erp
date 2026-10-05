import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { readShipment, readDispatchIntent, readDispatchItems, readBrand } from '@shahn/database';
import type { ReturnCommand, DispatchPrice, ShipmentDetail } from '@shahn/contracts';
import { AccessError } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { JournalPosting } from '../kernel/journals.js';
import { dispatchSource, readyBinding, enqueueIntake } from '../dispatch/dispatch.service.js';
import { buildSourceSnapshot } from '../dispatch/snapshot.js';
import { lockShippingWallets, reserveShippingCover } from '../dispatch/shipping-cover.service.js';
import { reserveStock } from '../inventory/service.js';
import { lockReceiptAllocation, consumeReceiptAllocation } from './brand-handover.service.js';
export async function prepareReceiptRedispatch(
  pool: Pool,
  u: UnitOfWork,
  input: Extract<ReturnCommand, { type: 'return.redispatch' }>,
  recordId: string,
) {
  const s = await dispatchSource(u.client, u.access.companyId),
    company = s.company_id;
  const previous = (
    await u.client.query(
      `SELECT * FROM dispatch.cycle WHERE company_id=$1 AND source_id=$2 AND id=$3 FOR UPDATE`,
      [company, s.id, input.previousCycleId],
    )
  ).rows[0];
  if (!previous) throw new AccessError('NOT_FOUND', 404);
  if (previous.branch_id !== input.branchId) throw new AccessError('TAWSEL_CHECK_003', 409);
  if (!previous.latest || !previous.remote_cycle_id)
    throw new AccessError('CURRENT_CYCLE_REQUIRED', 409);
  const branch = await readyBinding(u.client, company, s.id, 'branch', input.branchId),
    driver = await readyBinding(u.client, company, s.id, 'driver', input.driverId);
  const id = randomUUID(),
    cycle = randomUUID();
  const posting = new JournalPosting(u),
    coverSource = (
      await posting.source(
        {
          system: 'dispatch',
          identity: id + ':' + previous.shipment_id,
          kind: 'shipping-cover',
          revision: '1',
        },
        { intentId: id, shipmentId: previous.shipment_id },
      )
    ).id;
  const rows = await lockReceiptAllocation(u, input.branchId, input.allocations);
  if (rows.some((l) => l.cycle_id !== previous.id || l.shipment_id !== previous.shipment_id))
    throw new AccessError('INCOMPATIBLE_RETURN_RECEIPT', 409);
  const old = (await readDispatchItems(u.client, company, previous.current_intent_id)).find(
    (x) => x.cycle_id === previous.id,
  )!;
  const detail = (await readShipment(u.client, company, previous.shipment_id))!;
  const quantities = new Map<string, number>();
  for (const l of rows)
    quantities.set(
      l.source_line_id,
      (quantities.get(l.source_line_id) ?? 0) +
        input.allocations.find((a) => a.receiptLineId === l.id)!.quantity,
    );
  const lines = detail.fields.lines
    .filter((l) => quantities.has(l.id))
    .map((l) => ({ ...l, quantity: quantities.get(l.id)! }));
  if (
    lines.length !== quantities.size ||
    lines.some(
      (l) => l.quantity > old.snapshot.lines.find((x) => x.sourceLineId === l.id)!.quantity,
    )
  )
    throw new AccessError('INCOMPATIBLE_RETURN_LINES', 409);
  const goods = lines.reduce((n, l) => n + BigInt(l.quantity) * BigInt(l.unitDue.amountMinor), 0n);
  const price: DispatchPrice = {
    ...old.price,
    goodsDueMinor: goods.toString(),
    recipientDueMinor: (goods + BigInt(old.price.recipientShippingMinor)).toString(),
  };
  const snapshot = buildSourceSnapshot(
    { ...detail, fields: { ...detail.fields, lines } } as ShipmentDetail,
    price,
    {
      externalId: previous.external_id,
      sourceDispatchCycleId: 'cycle:' + cycle,
      sourceBranchExternalId: branch.external_id,
      sourceRevision: Number(previous.accepted_revision) + 1,
      expectedSourceRevision: Number(previous.accepted_revision),
    },
  );
  await u.client.query(
    `INSERT INTO dispatch.intent(company_id,id,source_id,branch_id,driver_id,driver_external_id,driver_resource_id,command_record_id,actor_id,actor_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      company,
      id,
      s.id,
      input.branchId,
      input.driverId,
      driver.external_id,
      driver.resource_id,
      recordId,
      u.access.principalId,
      u.access.displayName,
    ],
  );
  await u.client.query(`UPDATE dispatch.cycle SET latest=false WHERE company_id=$1 AND id=$2`, [
    company,
    previous.id,
  ]);
  await u.client.query(
    `INSERT INTO dispatch.cycle(company_id,id,shipment_id,source_id,branch_id,external_id,source_cycle_id,desired_revision,pending_revision,current_intent_id,previous_cycle_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10)`,
    [
      company,
      cycle,
      previous.shipment_id,
      s.id,
      input.branchId,
      snapshot.externalId,
      snapshot.sourceDispatchCycleId,
      snapshot.sourceRevision,
      id,
      previous.id,
    ],
  );
  await consumeReceiptAllocation(u, rows, input.allocations, 'redispatch', id, cycle);
  // Use P05 reservations; these same returned units remain physically at the branch until P12 receipt.
  const stockSource = randomUUID();
  if (rows.some((l) => l.variant_id))
    await u.client.query(
      `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'order','return-redispatch',$3,1)`,
      [company, stockSource, cycle],
    );
  for (const l of rows.filter((l) => l.variant_id)) {
    await reserveStock(
      u,
      { branchId: l.branch_id, brandId: l.brand_id, variantId: l.variant_id! },
      {
        sourceId: stockSource,
        kind: 'order',
        lineKey: l.id,
        quantity: input.allocations.find((a) => a.receiptLineId === l.id)!.quantity,
      },
    );
    await u.client.query(
      `UPDATE returns.receipt_allocation SET reservation_id=(SELECT id FROM inventory.stock_reservation WHERE company_id=$1 AND source_id=$2 AND line_key=$3::text) WHERE company_id=$1 AND receipt_line_id=$3::uuid AND owner_id=$4`,
      [company, stockSource, l.id, id],
    );
  }
  await lockShippingWallets(u, [detail.fields.brandId]);
  const brand = await readBrand(u.client, company, detail.fields.brandId);
  if (!brand?.active) throw new AccessError('BRAND_UNAVAILABLE', 409);
  const cover = await reserveShippingCover(
    u,
    detail.fields.brandId,
    coverSource,
    price.brandShippingMinor,
    brand.allowNegativeBalance,
  );
  await u.client.query(
    `INSERT INTO dispatch.item(company_id,intent_id,cycle_id,shipment_id,shipment_revision,snapshot,price,cover_source_id,cover_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      company,
      id,
      cycle,
      detail.id,
      detail.revision,
      JSON.stringify(snapshot),
      JSON.stringify(price),
      coverSource,
      cover,
    ],
  );
  const intent = (await readDispatchIntent(u.client, company, id))!;
  const action = await enqueueIntake(
    pool,
    u.client,
    s,
    intent,
    recordId,
    'dispatch.createFromReceipt',
    {
      externalId: previous.external_id,
      previousDispatchCycleId: previous.remote_cycle_id,
      snapshot,
    },
    detail.id,
  );
  return { entityId: cycle, actionId: action, dispatchIntentId: id };
}
