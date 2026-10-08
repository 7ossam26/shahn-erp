import { randomUUID } from 'node:crypto';
import { AccessError, cairoDate, stockObservation } from '@shahn/domain';
import { StockPositionRepository, positionKey, safeStockNumber } from '@shahn/database';
import type { SettlementOperation } from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { branchName, type PreviewBody, type Resolver } from '../framework.js';

type Observe = Extract<SettlementOperation, { operation: 'product.observe' }>;
async function variantLabel(u: UnitOfWork, op: Observe) {
  const row = (
    await u.client.query<{ label: string }>(
      `SELECT concat_ws(' · ',b.name,p.name,v.name) AS label FROM inventory.product_variant v
       JOIN inventory.product p ON(p.company_id,p.id)=(v.company_id,v.product_id)
       JOIN commercial.brand b ON(b.company_id,b.id)=(v.company_id,v.brand_id)
       WHERE v.company_id=$1 AND v.brand_id=$2 AND v.id=$3`,
      [u.access.companyId, op.brandId, op.variantId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  return row.label;
}
/** Lock the one position in the P05/P07 stock class; the caller already holds identity locks. */
async function lockPosition(u: UnitOfWork, op: Observe) {
  u.assertBranch(op.branchId);
  const key = { branchId: op.branchId, brandId: op.brandId, variantId: op.variantId };
  u.lockOrder('stock', positionKey(key));
  const repo = new StockPositionRepository();
  const position = (await repo.lock(u.client, u.access.companyId, [key]))[0]!;
  return { key, repo, position };
}
async function body(
  u: UnitOfWork,
  op: Observe,
  position: Awaited<ReturnType<typeof lockPosition>>['position'],
): Promise<PreviewBody> {
  const company = u.access.companyId;
  const label = await variantLabel(u, op);
  const plan = stockObservation({
    soundOnHand: safeStockNumber(position.sound),
    unavailableOnHand: safeStockNumber(position.unavailable),
    reserved: safeStockNumber(position.reserved),
    condition: op.condition,
    observed: op.observedQuantity,
  });
  const reservations = (
    await u.client.query<{
      id: string;
      quantity: string;
      source_kind: string;
      reference: string | null;
      held: boolean;
    }>(
      `SELECT r.id,r.quantity::text,r.source_kind,sh.reference,r.shortage_held AS held FROM inventory.stock_reservation r
       LEFT JOIN shipments.stock_allocation a ON(a.company_id,a.reservation_id)=(r.company_id,r.id)
       LEFT JOIN shipments.shipment sh ON(sh.company_id,sh.id)=(a.company_id,a.shipment_id)
       WHERE r.company_id=$1 AND r.branch_id=$2 AND r.brand_id=$3 AND r.variant_id=$4 AND r.active ORDER BY r.recorded_at,r.id`,
      [company, op.branchId, op.brandId, op.variantId],
    )
  ).rows;
  const blockers: string[] = [],
    warnings: string[] = [];
  if (op.actualDate > cairoDate(new Date())) blockers.push('FUTURE_ACTUAL_DATE');
  if (op.condition === 'unavailable' && plan.delta < 0) {
    // Incident-held damaged custody leaves only through the incident workflow, never by count.
    const held = safeStockNumber(
      (
        await u.client.query<{ quantity: string }>(
          `SELECT COALESCE(sum(a.quantity),0)::text quantity FROM incidents.affected_item a JOIN incidents.incident i ON(i.company_id,i.id)=(a.company_id,a.incident_id)
           WHERE a.company_id=$1 AND a.snapshot->>'branchId'=$2 AND a.snapshot->>'variantId'=$3 AND a.snapshot->>'holder'='branch'
           AND i.state<>'dismissed' AND NOT(i.state='confirmed' AND i.kind='loss')`,
          [company, op.branchId, op.variantId],
        )
      ).rows[0]!.quantity,
    );
    if (op.observedQuantity < held) blockers.push('INCIDENT_CUSTODY_HELD');
  }
  if (plan.shortageAfter > 0) warnings.push('RESERVATION_SHORTAGE_HOLDS_AFFECTED_WORK');
  if (plan.delta > 0) warnings.push('POSITIVE_OBSERVATION_IS_NOT_A_BRAND_RECEIPT');
  const q = (n: number) => String(n);
  return {
    operation: 'product.observe',
    classification: 'stock_observation',
    target: {
      kind: 'product',
      id: op.variantId,
      label,
      branchId: op.branchId,
      branchName: branchName(u, op.branchId),
    },
    facts: [
      {
        key: op.condition === 'sound' ? 'soundOnHand' : 'unavailableOnHand',
        unit: 'quantity',
        before: q(plan.recorded),
        after: q(plan.observed),
      },
      { key: 'delta', unit: 'quantity', before: null, after: q(plan.delta) },
      {
        key: 'physicalOnHand',
        unit: 'quantity',
        before: q(plan.soundBefore + plan.unavailableBefore),
        after: q(plan.soundAfter + plan.unavailableAfter),
      },
      { key: 'reserved', unit: 'quantity', before: q(plan.reserved), after: q(plan.reserved) },
      {
        key: 'available',
        unit: 'quantity',
        before: q(plan.availableBefore),
        after: q(plan.availableAfter),
      },
      {
        key: 'reservationShortage',
        unit: 'quantity',
        before: q(plan.shortageBefore),
        after: q(plan.shortageAfter),
      },
    ],
    effects: [
      {
        ledger: 'stock',
        kind: plan.delta < 0 ? 'observed_decrease' : 'observed_increase',
        label: `${op.condition === 'sound' ? 'سليم' : 'غير صالح'} ${label}`,
        amountMinor: null,
        quantity: plan.delta,
        effectiveDate: op.actualDate,
      },
      ...(plan.shortageAfter > 0
        ? [
            {
              ledger: 'hold' as const,
              kind: 'reservation_shortage_hold',
              label: 'إيقاف كل الحجوزات غير المسلمة لهذا الصنف حتى التعويض أو التعديل',
              amountMinor: null,
              quantity: plan.shortageAfter,
              effectiveDate: op.actualDate,
            },
          ]
        : []),
    ],
    dependents: reservations.map((r) => ({
      kind: r.source_kind === 'order' ? 'order_reservation' : 'transfer_reservation',
      id: r.id,
      label: (r.reference ? 'شحنة ' + r.reference : 'حجز تحويل') + ` · ${r.quantity}`,
      state: plan.shortageAfter > 0 ? 'held' : r.held ? 'released' : 'unaffected',
    })),
    warnings,
    blockers,
    versions: [{ key: 'stock.position', version: String(position.version) }],
  };
}
/**
 * Product observation (ERP-D-124/132, ERP-R-133/141). Observed quantity for one condition against
 * the locked validated position version; one signed movement; P07 holds recalculated for every
 * unhanded reservation of that variant. No receipt, release, order assignment or count session.
 */
export const productObserveResolver: Resolver<Observe> = {
  operation: 'product.observe',
  targetKind: 'product',
  capabilities: ['inventory'],
  allowedStates: 'Any current branch position of a company variant within assigned branches.',
  forbidden: [
    'stale position version (concurrent receipt/dispatch/reservation) — SETTLEMENT_PREVIEW_STALE',
    'reducing incident-held unavailable custody — INCIDENT_CUSTODY_HELD',
    'releasing, reassigning or cancelling another reservation',
    'creating a brand stock receipt',
  ],
  matches: (op): op is Observe => op.operation === 'product.observe',
  branchOf: async (_u, op) => op.branchId,
  preview: async (u, op) => body(u, op, (await lockPosition(u, op)).position),
  confirm: async (u, op, ctx) => {
    const { key, repo, position } = await lockPosition(u, op);
    const preview = await ctx.verify(await body(u, op, position));
    const delta = Number(preview.facts.find((f) => f.key === 'delta')!.after);
    const recorded = await ctx.record({
      classification: 'stock_observation',
      amountMinor: null,
      quantity: delta,
      sourceId: null,
    });
    const company = u.access.companyId,
      sourceId = randomUUID();
    await u.client.query(
      `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'adjustment','settlement',$3,1)`,
      [company, sourceId, recorded.caseId],
    );
    const sound = safeStockNumber(position.sound),
      unavailable = safeStockNumber(position.unavailable);
    const soundAfter = op.condition === 'sound' ? op.observedQuantity : sound,
      unavailableAfter = op.condition === 'unavailable' ? op.observedQuantity : unavailable;
    await u.client.query(
      `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,'observation',$4,$5,$6,$7,$8,$9,$10)`,
      [
        company,
        randomUUID(),
        sourceId,
        op.branchId,
        op.brandId,
        op.variantId,
        op.condition === 'sound' ? 'sound' : 'uncertain',
        soundAfter - sound,
        unavailableAfter - unavailable,
        op.actualDate,
      ],
    );
    // P05 repository persists checked quantities and recalculates P07 shortage holds together.
    await repo.update(u.client, company, position, soundAfter, unavailableAfter);
    await ctx.hooks.fault?.('effects');
    const reserved = safeStockNumber(position.reserved);
    await u.client.query(
      `INSERT INTO settlements.stock_observation(company_id,case_id,branch_id,brand_id,variant_id,condition,recorded_quantity,observed_quantity,delta,position_version,reserved_quantity,shortage_after,stock_source_id,observed_date)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        company,
        recorded.caseId,
        key.branchId,
        key.brandId,
        key.variantId,
        op.condition,
        op.condition === 'sound' ? sound : unavailable,
        op.observedQuantity,
        delta,
        position.version,
        reserved,
        Math.max(reserved - soundAfter, 0),
        sourceId,
        op.actualDate,
      ],
    );
    ctx.link('original', 'product_variant', op.variantId, preview.target.label);
    for (const d of preview.dependents) ctx.link('dependent', d.kind, d.id, d.label);
    ctx.link('result', 'stock_source', sourceId, 'حركة ملاحظة الجرد');
    return { state: 'resolved' };
  },
};
