import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import { incidentCandidate } from '@shahn/database';
import type {
  IncidentCommand,
  IncidentResult,
  SettlementOperation,
  ShipmentCommand,
  ShipmentResult,
} from '@shahn/contracts';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { incidentCommands } from '../../incidents/service.js';
import { shipmentCommands, shipmentDetail } from '../../shipments/service.js';
import { branchName, type PreviewBody, type Resolver } from '../framework.js';

type ParcelIncident = Extract<SettlementOperation, { operation: 'parcel.incident' }>;
type ParcelCancel = Extract<SettlementOperation, { operation: 'parcel.cancel' }>;
async function incidentBody(u: UnitOfWork, op: ParcelIncident): Promise<PreviewBody> {
  const items = [];
  for (const s of op.report.items) {
    const c = await incidentCandidate(u.client, u.access.companyId, s);
    if (!c || c.brandId !== op.report.brandId)
      throw new AccessError('INCIDENT_SOURCE_UNAVAILABLE', 409);
    u.assertBranch(c.branchId);
    items.push({ s, c });
  }
  const first = items[0]!.c;
  const blockers: string[] = [];
  for (const { s, c } of items)
    if (
      s.offset + s.quantity > c.capacity ||
      c.claimed.some((a) => s.offset < a.offset + a.quantity && a.offset < s.offset + s.quantity)
    )
      blockers.push('INCIDENT_QUANTITY_CLAIMED');
  if (Date.parse(op.report.observedAt) > Date.now()) blockers.push('FUTURE_INCIDENT_OBSERVATION');
  return {
    operation: 'parcel.incident',
    classification: 'parcel_incident_report',
    target: {
      kind: 'parcel',
      id: first.shipmentId ?? first.sourceId,
      label: first.label,
      branchId: first.branchId,
      branchName: branchName(u, first.branchId),
    },
    facts: [
      { key: 'incidentKind', unit: 'text', before: null, after: op.report.kind },
      {
        key: 'affectedQuantity',
        unit: 'quantity',
        before: null,
        after: String(op.report.items.reduce((t, i) => t + i.quantity, 0)),
      },
      { key: 'custodyHolder', unit: 'text', before: first.holder, after: first.holder },
    ],
    effects: [
      {
        ledger: 'incident',
        kind: 'reported',
        label: 'بلاغ حادث مرتبط؛ لا تعويض ولا خصم قبل التأكيد في صفحة الحوادث',
        amountMinor: null,
        quantity: op.report.items.reduce((t, i) => t + i.quantity, 0),
        effectiveDate: op.report.observedAt.slice(0, 10),
      },
    ],
    dependents: items.map(({ c }) => ({
      kind: c.shipmentId ? 'shipment' : 'stock_position',
      id: c.shipmentId ?? c.sourceId,
      label: c.label,
      state: 'held_for_incident',
    })),
    warnings: ['NO_MONEY_UNTIL_INCIDENT_CONFIRMATION'],
    blockers: [...new Set(blockers)],
    versions: items.map(({ c }) => ({
      key: 'incident.source.' + c.key.replace(/[^a-zA-Z0-9_.:-]/g, '-').slice(0, 140),
      version:
        String(c.capacity) + ':' + c.claimed.map((x) => x.offset + '-' + x.quantity).join('.'),
    })),
  };
}
/** Parcel loss/damage: the legitimate P18 report (custody hold only; no money, no deletion). */
export function parcelIncidentResolver(pool: Pool): Resolver<ParcelIncident> {
  const definition = incidentCommands(pool).definitions.find((d) => d.kind === 'incident.report')!;
  return {
    operation: 'parcel.incident',
    targetKind: 'parcel',
    capabilities: ['incidents'],
    allowedStates:
      'Unclaimed branch- or driver-held shipment/stock quantity in an assigned branch.',
    forbidden: [
      'deleting or teleporting custody',
      'compensation or employee liability at report time',
      'already claimed quantities — INCIDENT_QUANTITY_CLAIMED',
    ],
    matches: (op): op is ParcelIncident => op.operation === 'parcel.incident',
    branchOf: async (u, op) => {
      const c = await incidentCandidate(u.client, u.access.companyId, op.report.items[0]!);
      if (!c) throw new AccessError('INCIDENT_SOURCE_UNAVAILABLE', 409);
      return c.branchId;
    },
    preview: (u, op) => incidentBody(u, op),
    confirm: async (u, op, ctx) => {
      // P18 rechecks custody/claims under its own source and physical locks.
      const preview = await ctx.verify(await incidentBody(u, op));
      await ctx.record({
        classification: 'parcel_incident_report',
        amountMinor: null,
        quantity: op.report.items.reduce((t, i) => t + i.quantity, 0),
        sourceId: null,
      });
      const input: IncidentCommand = {
        schemaVersion: 1,
        companyId: u.access.companyId,
        commandId: randomUUID(),
        type: 'incident.report',
        report: op.report,
      };
      await definition.authorize(u, input, false);
      const reply = await definition.execute(u, input, ctx.recordId);
      await ctx.hooks.fault?.('effects');
      const result = reply.reply.body as IncidentResult;
      for (const d of preview.dependents) ctx.link('original', d.kind, d.id, d.label);
      ctx.link('result', 'incident', result.incidentId, 'بلاغ حادث ' + result.reference);
      return { state: 'resolved' };
    },
  };
}
async function cancelBody(u: UnitOfWork, op: ParcelCancel): Promise<PreviewBody> {
  const d = await shipmentDetail(u, op.shipmentId);
  u.assertBranch(d.fields.branchId);
  const blockers: string[] = [];
  if (d.state !== 'active') blockers.push('SHIPMENT_CANCELLED');
  // Departed work and Tawsel-integrated sources have no native rewrite path here.
  if (d.handedOver) blockers.push('HANDED_OVER_PROTECTED');
  if (d.sourceState !== 'local') blockers.push('SOURCE_ADAPTER_REQUIRED');
  const active = d.stock.allocations.filter((a) => a.active);
  return {
    operation: 'parcel.cancel',
    classification: 'parcel_cancellation',
    target: {
      kind: 'parcel',
      id: d.id,
      label: 'شحنة ' + d.reference,
      branchId: d.fields.branchId,
      branchName: branchName(u, d.fields.branchId),
    },
    facts: [
      { key: 'shipmentState', unit: 'text', before: d.state, after: 'cancelled' },
      { key: 'preparation', unit: 'text', before: d.preparation, after: d.preparation },
      {
        key: 'reservedUnits',
        unit: 'quantity',
        before: String(active.reduce((t, a) => t + a.quantity, 0)),
        after: '0',
      },
    ],
    effects: [
      {
        ledger: 'shipment',
        kind: 'cancelled_before_handover',
        label: 'إلغاء تسجيل مكرر أو خاطئ قبل التسليم للمندوب؛ السجل يبقى في التاريخ',
        amountMinor: null,
        quantity: null,
        effectiveDate: new Date().toISOString().slice(0, 10),
      },
      ...active.map((a) => ({
        ledger: 'stock' as const,
        kind: d.preparation === 'complete' ? 'packed_units_unavailable' : 'reservation_released',
        label: a.variantName,
        amountMinor: null,
        quantity: a.quantity,
        effectiveDate: new Date().toISOString().slice(0, 10),
      })),
    ],
    dependents: active.map((a) => ({
      kind: 'order_reservation',
      id: a.reservationId,
      label: a.variantName,
      state: 'released',
    })),
    warnings: ['RECORD_RETAINED_NOT_DELETED'],
    blockers,
    versions: [{ key: 'shipment', version: String(d.version) }],
  };
}
/** Duplicate/incorrect registration before driver handover: P06's own reasoned cancellation. */
export function parcelCancelResolver(pool: Pool): Resolver<ParcelCancel> {
  const definition = shipmentCommands(pool).definitions.find((d) => d.kind === 'shipment.cancel')!;
  return {
    operation: 'parcel.cancel',
    targetKind: 'parcel',
    capabilities: ['intake'],
    allowedStates: 'An active shipment still at the branch before any driver handover.',
    forbidden: [
      'hard deletion of the shipment or its history',
      'after-departure override — HANDED_OVER_PROTECTED',
      'unsupported Tawsel source mutation — SOURCE_ADAPTER_REQUIRED',
      'restoring packed units to sound stock without inspection',
    ],
    matches: (op): op is ParcelCancel => op.operation === 'parcel.cancel',
    branchOf: async (u, op) => (await shipmentDetail(u, op.shipmentId)).fields.branchId,
    preview: (u, op) => cancelBody(u, op),
    confirm: async (u, op, ctx) => {
      const preview = await ctx.verify(await cancelBody(u, op));
      await ctx.record({
        classification: 'parcel_cancellation',
        amountMinor: null,
        quantity: null,
        sourceId: null,
      });
      const reviewed = Number(ctx.expectedVersions.find((v) => v.key === 'shipment')?.version ?? 0);
      const input: ShipmentCommand = {
        schemaVersion: 1,
        companyId: u.access.companyId,
        commandId: randomUUID(),
        type: 'shipment.cancel',
        shipmentId: op.shipmentId,
        expectedVersion: reviewed,
        reason: ctx.reason,
      } as ShipmentCommand;
      await definition.authorize(u, input, false);
      const reply = await definition.execute(u, input, ctx.recordId);
      await ctx.hooks.fault?.('effects');
      const result = reply.reply.body as ShipmentResult;
      ctx.link('original', 'shipment', op.shipmentId, preview.target.label);
      for (const d of preview.dependents) ctx.link('dependent', d.kind, d.id, d.label);
      ctx.link(
        'result',
        'shipment_revision',
        result.shipmentId,
        'إلغاء قبل التسليم · ' + result.version,
      );
      return { state: 'resolved' };
    },
  };
}
