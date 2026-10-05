import { randomUUID } from 'node:crypto';
import {
  appendShipmentRevision,
  readManifest,
  readShipment,
  readTransferLines,
  StockPositionRepository,
  type PositionKey,
} from '@shahn/database';
import { AccessError } from '@shahn/domain';
import type { GoodsTransferCommand } from '@shahn/contracts';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { reserveStock } from '../inventory/service.js';
import { lockTransferPositions, postTransferStock, stockSource, type StockDelta } from './stock.js';

export async function receiveGoods(
  u: UnitOfWork,
  input: Extract<GoodsTransferCommand, { type: 'goods.receive' | 'goods.sourceReturn' }>,
  recordId: string,
) {
  if (
    !Number.isFinite(Date.parse(input.actualAt)) ||
    Date.parse(input.actualAt) > Date.now() + 60000
  )
    throw new AccessError('INVALID_ACTUAL_TIME', 400);
  u.lockOrder('aggregate', 'manifest:' + input.manifestId);
  const m = await readManifest(u.client, u.access.companyId, input.manifestId, true);
  if (!m) throw new AccessError('NOT_FOUND', 404);
  const branch = input.type === 'goods.receive' ? m.destination_branch_id : m.source_branch_id;
  u.assertBranch(branch);
  if (input.branchId !== branch) throw new AccessError('WRONG_RECEIPT_BRANCH', 409);
  if (m.version !== input.expectedVersion)
    throw new AccessError('REVISION_CONFLICT', 409, m.version);
  if (m.state !== 'in_transit') throw new AccessError('NOT_IN_TRANSIT', 409, m.version);
  const lines = await readTransferLines(u.client, u.access.companyId, m.id);
  const ids = input.lines.map((x) => x.lineId);
  if (new Set(ids).size !== ids.length) throw new AccessError('DUPLICATE_TRANSFER_LINE', 400);
  const selected = input.lines.map((x) => {
    const line = lines.find((l) => l.id === x.lineId);
    if (!line) throw new AccessError('NOT_FOUND', 404);
    const total = x.sound + x.damaged + x.uncertain;
    if (!Number.isSafeInteger(total) || total < 1 || total > line.remaining)
      throw new AccessError('RECEIPT_QUANTITY_EXCEEDED', 409);
    if (line.kind === 'parcel' && (total !== 1 || x.inspection !== 'parcel-exterior'))
      throw new AccessError('PARCEL_INSPECTION_REQUIRED', 409);
    if (line.kind === 'loose' && x.inspection !== 'counted-pieces')
      throw new AccessError('LOOSE_COUNT_REQUIRED', 409);
    return { line, input: x, total };
  });
  for (const id of [
    ...new Set(selected.flatMap((x) => (x.line.shipment_id ? [x.line.shipment_id] : []))),
  ].sort()) {
    u.lockOrder('aggregate', 'shipment:' + id);
    await u.client.query(
      `SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE`,
      [u.access.companyId, id],
    );
  }
  const components = (
    await u.client.query<{
      line_id: string;
      brand_id: string;
      variant_id: string;
      quantity: number;
    }>(
      `SELECT c.line_id,c.brand_id,c.variant_id,c.quantity FROM goods_transfer.component c
     WHERE c.company_id=$1 AND c.line_id=ANY($2::uuid[]) ORDER BY c.line_id,c.variant_id`,
      [u.access.companyId, ids],
    )
  ).rows;
  const keys: PositionKey[] = [
    ...selected
      .filter((x) => x.line.kind === 'loose')
      .map(({ line }) => ({
        branchId: branch,
        brandId: line.brand_id,
        variantId: line.variant_id!,
      })),
    ...components.map((c) => ({ branchId: branch, brandId: c.brand_id, variantId: c.variant_id })),
  ];
  await lockTransferPositions(u, keys);
  for (const { line } of selected.filter((x) => x.line.kind === 'parcel')) {
    const custody = await u.client.query(
      `SELECT 1 FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2 AND holder='driver' AND driver_id=$3 AND transfer_id=$4`,
      [u.access.companyId, line.shipment_id, m.driver_id, m.id],
    );
    if (!custody.rowCount) throw new AccessError('PARCEL_CUSTODY_CONFLICT', 409);
  }
  const receiptId = randomUUID();
  await u.client.query(
    `INSERT INTO goods_transfer.receipt(company_id,id,manifest_id,kind,branch_id,command_record_id,actor_id,actor_name,actual_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      u.access.companyId,
      receiptId,
      m.id,
      input.type === 'goods.receive' ? 'destination' : 'source_return',
      branch,
      recordId,
      u.access.principalId,
      u.access.displayName,
      input.actualAt,
    ],
  );
  const deltas: StockDelta[] = [];
  for (const { line, input: observed, total } of selected) {
    await u.client.query(
      `INSERT INTO goods_transfer.receipt_line(company_id,receipt_id,manifest_id,line_id,sound,damaged,uncertain,inspection,suspected_internal_issue)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        u.access.companyId,
        receiptId,
        m.id,
        line.id,
        observed.sound,
        observed.damaged,
        observed.uncertain,
        observed.inspection,
        observed.suspectedInternalIssue,
      ],
    );
    await u.client.query(
      `UPDATE goods_transfer.line SET remaining=remaining-$3 WHERE company_id=$1 AND id=$2`,
      [u.access.companyId, line.id, total],
    );
    if (line.kind === 'loose') {
      if (observed.sound)
        deltas.push({
          branchId: branch,
          brandId: line.brand_id,
          variantId: line.variant_id!,
          sound: observed.sound,
          unavailable: 0,
          effectKey: line.id + ':sound',
          condition: 'sound',
        });
      if (observed.damaged)
        deltas.push({
          branchId: branch,
          brandId: line.brand_id,
          variantId: line.variant_id!,
          sound: 0,
          unavailable: observed.damaged,
          effectKey: line.id + ':damaged',
          condition: 'damaged',
        });
      if (observed.uncertain)
        deltas.push({
          branchId: branch,
          brandId: line.brand_id,
          variantId: line.variant_id!,
          sound: 0,
          unavailable: observed.uncertain,
          effectKey: line.id + ':uncertain',
          condition: 'uncertain',
        });
    } else
      for (const c of components.filter((x) => x.line_id === line.id)) {
        const sound = observed.sound === 1 && !observed.suspectedInternalIssue;
        deltas.push({
          branchId: branch,
          brandId: c.brand_id,
          variantId: c.variant_id,
          sound: sound ? c.quantity : 0,
          unavailable: sound ? 0 : c.quantity,
          effectKey: line.id + ':' + c.variant_id,
          condition: sound ? 'sound' : observed.damaged ? 'damaged' : 'uncertain',
        });
      }
  }
  const source = await stockSource(u, receiptId, 1);
  await postTransferStock(u, source, deltas, input.actualAt);
  for (const { line, input: observed } of selected.filter((x) => x.line.kind === 'parcel')) {
    const d = await readShipment(u.client, u.access.companyId, line.shipment_id!);
    if (!d) throw new AccessError('NOT_FOUND', 404);
    const revision = d.revision + 1;
    await appendShipmentRevision(
      u.client,
      u.access.companyId,
      d.id,
      revision,
      { ...d.fields, branchId: branch },
      d.phoneCanonical,
      d.price,
    );
    if (d.fields.service === 'stored_stock') {
      const allocationSource = randomUUID();
      await u.client.query(
        `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'order','shipment',$3,$4)`,
        [u.access.companyId, allocationSource, d.id, revision],
      );
      for (const c of components.filter((x) => x.line_id === line.id)) {
        const key = { branchId: branch, brandId: c.brand_id, variantId: c.variant_id };
        let reservationId: string;
        if (observed.sound === 1 && !observed.suspectedInternalIssue) {
          await reserveStock(u, key, {
            sourceId: allocationSource,
            kind: 'order',
            lineKey: c.variant_id,
            quantity: c.quantity,
          });
          reservationId = (
            await u.client.query<{ id: string }>(
              `SELECT id FROM inventory.stock_reservation WHERE company_id=$1 AND source_id=$2 AND line_key=$3`,
              [u.access.companyId, allocationSource, c.variant_id],
            )
          ).rows[0]!.id;
        } else {
          reservationId = randomUUID();
          await u.client.query(
            `INSERT INTO inventory.stock_reservation(company_id,id,source_id,source_kind,line_key,branch_id,brand_id,variant_id,quantity,shortage_held)
             VALUES($1,$2,$3,'order',$4,$5,$6,$7,$8,true)`,
            [
              u.access.companyId,
              reservationId,
              allocationSource,
              c.variant_id,
              branch,
              c.brand_id,
              c.variant_id,
              c.quantity,
            ],
          );
          await u.client.query(
            `INSERT INTO inventory.reservation_event(company_id,id,reservation_id,kind,source_id) VALUES($1,$2,$3,'reserved',$4)`,
            [u.access.companyId, randomUUID(), reservationId, allocationSource],
          );
          await new StockPositionRepository().refreshHolds(u.client, u.access.companyId, key);
        }
        await u.client.query(
          `INSERT INTO shipments.stock_allocation(company_id,shipment_id,revision,brand_id,branch_id,variant_id,reservation_id)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [u.access.companyId, d.id, revision, c.brand_id, branch, c.variant_id, reservationId],
        );
      }
    }
    await u.client.query(
      `UPDATE shipments.shipment SET branch_id=$3,revision=$4,version=version+1,preparation=$5 WHERE company_id=$1 AND id=$2`,
      [
        u.access.companyId,
        d.id,
        branch,
        revision,
        observed.sound === 1 && !observed.suspectedInternalIssue
          ? d.preparation
          : 'awaiting_preparation',
      ],
    );
    await u.client.query(
      `UPDATE shipments.parcel_custody SET branch_id=$3,holder='branch',driver_id=NULL,transfer_id=NULL,exterior_condition=$4,version=version+1 WHERE company_id=$1 AND shipment_id=$2`,
      [
        u.access.companyId,
        d.id,
        branch,
        observed.sound === 1 && !observed.suspectedInternalIssue
          ? 'sound'
          : observed.damaged
            ? 'damaged'
            : 'uncertain',
      ],
    );
    await u.client.query(
      `DELETE FROM shipments.parcel_claim WHERE company_id=$1 AND shipment_id=$2 AND kind='transfer' AND owner_id=$3`,
      [u.access.companyId, d.id, m.id],
    );
    await u.client.query(
      `INSERT INTO shipments.event(company_id,shipment_id,version,kind,actor_id,actor_name,reason)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        u.access.companyId,
        d.id,
        d.version + 1,
        input.type === 'goods.receive' ? 'transfer_received' : 'transfer_source_return',
        u.access.principalId,
        u.access.displayName,
        m.id,
      ],
    );
  }
  const remaining = Number(
    (
      await u.client.query<{ remaining: string }>(
        `SELECT COALESCE(sum(remaining),0)::text AS remaining FROM goods_transfer.line WHERE company_id=$1 AND manifest_id=$2`,
        [u.access.companyId, m.id],
      )
    ).rows[0]!.remaining,
  );
  const state = remaining === 0 ? 'closed' : 'in_transit';
  await u.client.query(
    `UPDATE goods_transfer.manifest SET state=$3,version=version+1 WHERE company_id=$1 AND id=$2`,
    [u.access.companyId, m.id, state],
  );
  return { manifestId: m.id, reference: m.reference, version: m.version + 1, state } as const;
}
