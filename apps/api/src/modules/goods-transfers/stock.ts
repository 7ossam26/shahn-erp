import { randomUUID } from 'node:crypto';
import {
  StockPositionRepository,
  positionKey,
  safeStockNumber,
  type PositionKey,
} from '@shahn/database';
import { AccessError, cairoDate } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';

export type StockDelta = PositionKey & {
  sound: number;
  unavailable: number;
  effectKey: string;
  condition: 'sound' | 'damaged' | 'uncertain';
};
export async function lockTransferPositions(u: UnitOfWork, keys: PositionKey[]) {
  const unique = [...new Map(keys.map((k) => [positionKey(k), k])).values()].sort((a, b) =>
    positionKey(a).localeCompare(positionKey(b)),
  );
  for (const k of unique) u.lockOrder('stock', positionKey(k));
  return new StockPositionRepository().lock(u.client, u.access.companyId, unique);
}
export async function stockSource(
  u: UnitOfWork,
  identity: string,
  revision: number,
  kind: 'condition' | 'loose_transfer' = 'condition',
) {
  const id = randomUUID();
  await u.client.query(
    `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,$3,'goods-transfer',$4,$5)`,
    [u.access.companyId, id, kind, identity, revision],
  );
  return id;
}
/** Caller holds all affected stock locks. Position mutation and immutable movements share the command transaction. */
export async function postTransferStock(
  u: UnitOfWork,
  sourceId: string,
  deltas: StockDelta[],
  at: string,
) {
  const repo = new StockPositionRepository();
  const grouped = new Map<string, { key: PositionKey; sound: number; unavailable: number }>();
  for (const d of deltas) {
    const key = { branchId: d.branchId, brandId: d.brandId, variantId: d.variantId };
    u.requireLock('stock', positionKey(key));
    const row = grouped.get(positionKey(key)) ?? { key, sound: 0, unavailable: 0 };
    row.sound += d.sound;
    row.unavailable += d.unavailable;
    grouped.set(positionKey(key), row);
  }
  for (const row of [...grouped.values()].sort((a, b) =>
    positionKey(a.key).localeCompare(positionKey(b.key)),
  )) {
    const pos = (await repo.lock(u.client, u.access.companyId, [row.key]))[0]!;
    const sound = safeStockNumber(pos.sound) + row.sound;
    const unavailable = safeStockNumber(pos.unavailable) + row.unavailable;
    if (
      !Number.isSafeInteger(sound) ||
      !Number.isSafeInteger(unavailable) ||
      sound < 0 ||
      unavailable < 0
    )
      throw new AccessError('STOCK_SHORTAGE', 409);
    await repo.update(u.client, u.access.companyId, pos, sound, unavailable);
  }
  for (const d of deltas) {
    if (!d.sound && !d.unavailable) continue;
    await u.client.query(
      `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        u.access.companyId,
        randomUUID(),
        sourceId,
        d.effectKey,
        d.branchId,
        d.brandId,
        d.variantId,
        d.condition,
        d.sound,
        d.unavailable,
        cairoDate(new Date(at)),
      ],
    );
  }
}
