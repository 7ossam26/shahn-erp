import { AccessError, cairoDayRange } from '@shahn/domain';
import {
  readShipment,
  readBrand,
  readDispatchIntent,
  readDispatchItems,
  type IntegrationSource,
} from '@shahn/database';
import type { DispatchList, DispatchDetail, DispatchFilter, DispatchRow } from '@shahn/contracts';
import { validateSourceConfiguration } from '@shahn/contracts/tawsel';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { WalletService } from '../kernel/wallet.js';
import { lockShippingWallets } from './shipping-cover.service.js';
import { readyBinding } from './dispatch.service.js';
export const defaultDispatchFilter = (branches: string[]): DispatchFilter => ({
  branches,
  brands: [],
  preparations: [],
  blockers: [],
  services: [],
  drivers: [],
  from: null,
  to: null,
  page: 1,
});
export async function dispatchList(u: UnitOfWork, f: DispatchFilter): Promise<DispatchList> {
  for (const id of f.branches) u.assertBranch(id);
  if (f.from && f.to && f.from > f.to) throw new AccessError('INVALID_DATE_RANGE', 400);
  const company = u.access.companyId,
    from = f.from ? cairoDayRange(f.from).start : null,
    to = f.to ? cairoDayRange(f.to).end : null;
  const rows = (
    await u.client.query<{
      id: string;
      brand_id: string;
      brand_name: string;
      intent_id: string | null;
      state: DispatchRow['dispatchState'];
      driver_id: string | null;
      claim_kind: string | null;
    }>(
      `SELECT s.id,s.brand_id,b.name AS brand_name,c.current_intent_id AS intent_id,i.state,i.driver_id,pc.kind AS claim_kind FROM shipments.shipment s JOIN commercial.brand b ON(b.company_id,b.id)=(s.company_id,s.brand_id) LEFT JOIN dispatch.cycle c ON(c.company_id,c.shipment_id)=(s.company_id,s.id) AND c.latest LEFT JOIN dispatch.intent i ON(i.company_id,i.id)=(c.company_id,c.current_intent_id) LEFT JOIN shipments.parcel_claim pc ON(pc.company_id,pc.shipment_id)=(s.company_id,s.id) WHERE s.company_id=$1 AND s.branch_id=ANY($2::uuid[]) AND s.state='active' AND (cardinality($3::uuid[])=0 OR s.brand_id=ANY($3::uuid[])) AND ($4::timestamptz IS NULL OR s.received_at>=$4) AND ($5::timestamptz IS NULL OR s.received_at<$5) ORDER BY s.received_at DESC,s.id`,
      [company, f.branches, f.brands, from, to],
    )
  ).rows;
  const source = (
    await u.client.query<IntegrationSource>(
      'SELECT * FROM integration.source WHERE company_id=$1',
      [company],
    )
  ).rows[0];
  const sourceReady = !!source?.enabled && validateSourceConfiguration(source.configuration);
  const driverRows = (
    await u.client.query<{ id: string; name: string }>(
      `SELECT id,name FROM employees.operational_driver WHERE company_id=$1 AND active ORDER BY name,id`,
      [company],
    )
  ).rows;
  const drivers = [];
  for (const d of driverRows) {
    let ready = false,
      checkedAt: string | null = null;
    if (sourceReady)
      try {
        const b = await readyBinding(u.client, company, source!.id, 'driver', d.id);
        ready = !!b;
        const time = (
          await u.client.query(
            'SELECT checked_at FROM integration.binding WHERE company_id=$1 AND id=$2',
            [company, b.id],
          )
        ).rows[0]?.checked_at;
        checkedAt = time?.toISOString() ?? null;
      } catch {
        /* Display unready identity; writes still recheck. */
      }
    drivers.push({ ...d, ready, checkedAt });
  }
  await lockShippingWallets(
    u,
    rows.map((x) => x.brand_id),
  );
  const amounts = new Map<string, Awaited<ReturnType<WalletService['amounts']>>>();
  for (const brand of new Set(rows.map((x) => x.brand_id)))
    amounts.set(brand, await new WalletService(u, brand).amounts());
  const output: DispatchRow[] = [];
  for (const r of rows) {
    const d = (await readShipment(u.client, company, r.id))!,
      wallet = amounts.get(r.brand_id)!,
      brand = (await readBrand(u.client, company, r.brand_id))!,
      blockers: string[] = [];
    if (!brand.active) blockers.push('BRAND_UNAVAILABLE');
    if (d.preparation === 'awaiting_preparation') blockers.push('PREPARATION_REQUIRED');
    if (!d.stock.eligible) blockers.push('STOCK_SHORTAGE');
    if (d.handedOver) blockers.push('ALREADY_HANDED_OVER');
    if (r.claim_kind === 'transfer') blockers.push('COMPETING_PARCEL_CLAIM');
    if (r.intent_id && r.state !== 'withdrawn') blockers.push('EXISTING_DISPATCH');
    if (!sourceReady) blockers.push('SOURCE_NOT_READY');
    else
      try {
        await readyBinding(u.client, company, source!.id, 'branch', d.fields.branchId);
      } catch {
        blockers.push('BRANCH_NOT_READY');
      }
    if (
      !brand.allowNegativeBalance &&
      (BigInt(wallet.signedEntitlement) < 0n ||
        ((!r.intent_id || r.state === 'withdrawn') &&
          BigInt(wallet.eligibleToPay) < BigInt(d.price.brandShippingMinor)))
    )
      blockers.push('INSUFFICIENT_SHIPPING_COVER');
    if (
      (f.preparations.length && !f.preparations.includes(d.preparation)) ||
      (f.services.length && !f.services.includes(d.fields.service)) ||
      (f.drivers.length && (!r.driver_id || !f.drivers.includes(r.driver_id))) ||
      (f.blockers.length &&
        !f.blockers.some((b) => (b === 'ready' ? blockers.length === 0 : blockers.includes(b))))
    )
      continue;
    output.push({
      id: d.id,
      reference: d.reference,
      version: d.version,
      brandId: r.brand_id,
      brandName: r.brand_name,
      branchId: d.fields.branchId,
      branchName: d.branchName,
      recipientName: d.fields.recipientName,
      service: d.fields.service,
      preparation: d.preparation,
      quantity: d.fields.lines.reduce((n, l) => n + l.quantity, 0),
      recipientDueMinor: d.price.recipientDueMinor,
      brandShippingMinor: d.price.brandShippingMinor,
      tariffMinor: d.price.tariffMinor,
      eligibleToPay: wallet.eligibleToPay,
      pendingCredit: wallet.pending,
      blockers,
      intentId: r.intent_id,
      dispatchState: r.state,
      synchronization: r.state ?? 'local',
      createdAt: d.receivedAt,
    });
  }
  const brands = (
    await u.client.query<{ id: string; name: string }>(
      'SELECT id,name FROM commercial.brand WHERE company_id=$1 ORDER BY name,id',
      [company],
    )
  ).rows;
  return {
    items: output.slice((f.page - 1) * 25, f.page * 25),
    total: output.length,
    page: f.page,
    branches: u.access.assignedBranches,
    brands,
    drivers,
  };
}
export async function dispatchDetail(u: UnitOfWork, id: string): Promise<DispatchDetail> {
  const company = u.access.companyId,
    i = await readDispatchIntent(u.client, company, id);
  if (!i) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(i.branch_id);
  const names = (
    await u.client.query(
      `SELECT b.name AS branch,d.name AS driver FROM access.branch b JOIN employees.operational_driver d ON d.company_id=b.company_id AND d.id=$3 WHERE b.company_id=$1 AND b.id=$2`,
      [company, i.branch_id, i.driver_id],
    )
  ).rows[0];
  const items = [];
  for (const item of await readDispatchItems(u.client, company, id)) {
    const d = (await readShipment(u.client, company, item.shipment_id))!;
    const cover = item.cover_id
      ? ((
          await u.client.query(
            `SELECT c.amount_minor::text FROM kernel.shipping_cover c WHERE c.company_id=$1 AND c.id=$2 AND NOT EXISTS(SELECT 1 FROM kernel.cover_close x WHERE x.company_id=c.company_id AND x.cover_id=c.id)`,
            [company, item.cover_id],
          )
        ).rows[0]?.amount_minor ?? '0')
      : '0';
    items.push({
      shipmentId: d.id,
      reference: d.reference,
      recipientName: d.fields.recipientName,
      quantity: item.snapshot.lines.reduce((n, l) => n + l.quantity, 0),
      recipientDueMinor: item.price.recipientDueMinor,
      tariffMinor: item.price.tariffMinor,
      waiverMinor: item.price.waiverMinor,
      brandShippingMinor: item.price.brandShippingMinor,
      coverMinor: cover,
      acceptedRevision: Number(item.accepted_revision),
      pendingRevision: item.pending_revision === null ? null : Number(item.pending_revision),
      desiredRevision: Number(item.desired_revision),
      assignmentRevision: Number(item.assignment_revision),
      taskId: item.task_id,
      sourceCycleId: item.source_cycle_id,
      planningStatus: item.task?.planningStatus ?? 'not-requested',
      locationReadiness: item.task?.locationReadiness ?? 'needs-resolution',
    });
  }
  const actions = (
    await u.client.query<DispatchDetail['actions'][number]>(
      `SELECT a.action_id AS "actionId",cr.command_id AS "commandId",sc.operation_id AS operation,sc.state,sc.last_error AS error FROM dispatch.action a JOIN integration.source_command sc ON(sc.company_id,sc.action_id)=(a.company_id,a.action_id) JOIN command_record cr ON(cr.company_id,cr.id)=(sc.company_id,sc.command_record_id) WHERE a.company_id=$1 AND a.intent_id=$2 ORDER BY sc.created_at,a.action_id`,
      [company, id],
    )
  ).rows;
  return {
    id,
    branchId: i.branch_id,
    branchName: names.branch,
    driverId: i.driver_id,
    driverName: names.driver,
    version: i.version,
    state: i.state,
    lastError: i.last_error,
    createdAt: i.created_at.toISOString(),
    items,
    actions,
  };
}
