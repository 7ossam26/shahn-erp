import type {
  ShipmentDetail,
  ShipmentPrice,
  ApprovedShippingWaiver,
  DispatchPrice,
} from '@shahn/contracts';
export type { ApprovedShippingWaiver, DispatchPrice } from '@shahn/contracts';
import {
  validSnapshotSemantics,
  type SourceSnapshot,
  type WireMoney,
} from '@shahn/contracts/tawsel';
import { AccessError, recipientPhone } from '@shahn/domain';
/** P18 supplies this only after its incident approval. This is deliberately absent from HTTP input. */
export function dispatchPrice(
  price: ShipmentPrice,
  shipmentId: string,
  waiver?: ApprovedShippingWaiver,
): DispatchPrice {
  if (
    waiver &&
    (waiver.replacementShipmentId !== shipmentId ||
      waiver.originalShipmentId === shipmentId ||
      ![waiver.incidentId, waiver.approvalId, waiver.originalShipmentId].every((x) =>
        /^[0-9a-f-]{36}$/i.test(x),
      ))
  )
    throw new AccessError('INVALID_APPROVED_WAIVER', 409);
  return {
    ...price,
    ...(waiver
      ? {
          recipientShippingMinor: '0',
          brandShippingMinor: '0',
          recipientDueMinor: price.goodsDueMinor,
        }
      : {}),
    waiverMinor: waiver ? price.tariffMinor : '0',
    waiver: waiver ?? null,
    commissionPolicy: 'normal',
  };
}
export function wireMoney(value: string): WireMoney {
  if (!/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER))
    throw new AccessError('SOURCE_MONEY_OVERFLOW', 409);
  return { amountMinor: Number(value), currency: 'EGP', exponent: 2 };
}
export function buildSourceSnapshot(
  d: ShipmentDetail,
  price: DispatchPrice,
  identity: {
    externalId: string;
    sourceDispatchCycleId: string;
    sourceBranchExternalId: string;
    sourceRevision: number;
    expectedSourceRevision: number;
  },
): SourceSnapshot {
  const snapshot: SourceSnapshot = {
    ...identity,
    recipientName: d.fields.recipientName,
    recipientPhone: recipientPhone(d.fields.phoneDisplay),
    destination: { kind: 'address', addressText: d.fields.address },
    splittingAllowed: price.partialDelivery,
    allocation: 'exact-outstanding-per-unit',
    lines: d.fields.lines.map((l) => ({
      sourceLineId: l.id,
      description: l.description,
      quantity: l.quantity,
      unitDue: wireMoney(l.unitDue.amountMinor),
    })),
    shippingDue: wireMoney(price.recipientShippingMinor),
    totalDue: wireMoney(price.recipientDueMinor),
    priority: 'ordinary',
    instructions:
      (d.fields.inspectionAllowed
        ? 'المعاينة قبل الاستلام مسموحة.'
        : 'المعاينة قبل الاستلام غير مسموحة.') + (d.fields.comment ? '\n' + d.fields.comment : ''),
    ...(d.fields.brandReference ? { sourceOrderReference: d.fields.brandReference } : {}),
  };
  if (!validSnapshotSemantics(snapshot)) throw new AccessError('INVALID_SOURCE_SNAPSHOT', 409);
  return snapshot;
}
