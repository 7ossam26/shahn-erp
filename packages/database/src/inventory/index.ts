import type { TransactionClient } from '../transaction.js';
import type { InventoryFilter, ProductRecord, StockRow, StockList } from '@shahn/contracts';
export interface PositionKey {
  branchId: string;
  brandId: string;
  variantId: string;
}
export interface LockedPosition extends PositionKey {
  sound: string;
  unavailable: string;
  reserved: string;
  version: number;
}
export const positionKey = (key: PositionKey) => `${key.branchId}/${key.brandId}/${key.variantId}`;
/** No transactions opened here. Caller owns transaction, scope, order and checked arithmetic. */
export class StockPositionRepository {
  async lock(
    client: TransactionClient,
    company: string,
    keys: PositionKey[],
  ): Promise<LockedPosition[]> {
    const unique = [...new Map(keys.map((k) => [positionKey(k), k])).values()].sort((a, b) =>
      positionKey(a).localeCompare(positionKey(b)),
    );
    const result: LockedPosition[] = [];
    for (const key of unique) {
      await client.query(
        `INSERT INTO inventory.stock_position(company_id,branch_id,brand_id,variant_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [company, key.branchId, key.brandId, key.variantId],
      );
      const row = (
        await client.query<{ sound: string; unavailable: string; version: number }>(
          `SELECT sound_on_hand::text AS sound,unavailable_on_hand::text AS unavailable,version FROM inventory.stock_position WHERE company_id=$1 AND branch_id=$2 AND brand_id=$3 AND variant_id=$4 FOR UPDATE`,
          [company, key.branchId, key.brandId, key.variantId],
        )
      ).rows[0]!;
      const reserved = (
        await client.query<{ quantity: string }>(
          `SELECT COALESCE(sum(quantity),0)::text AS quantity FROM inventory.stock_reservation WHERE company_id=$1 AND branch_id=$2 AND brand_id=$3 AND variant_id=$4 AND active`,
          [company, key.branchId, key.brandId, key.variantId],
        )
      ).rows[0]!.quantity;
      result.push({ ...key, ...row, reserved });
    }
    return result;
  }
  async update(
    client: TransactionClient,
    company: string,
    position: LockedPosition,
    sound: number,
    unavailable: number,
  ) {
    const args = [
      company,
      position.branchId,
      position.brandId,
      position.variantId,
      sound,
      unavailable,
    ];
    await client.query(
      `UPDATE inventory.stock_position SET sound_on_hand=$5,unavailable_on_hand=$6,version=version+1,last_movement_at=clock_timestamp(),updated_at=clock_timestamp() WHERE company_id=$1 AND branch_id=$2 AND brand_id=$3 AND variant_id=$4`,
      args,
    );
    await this.refreshHolds(client, company, position);
  }
  async refreshHolds(client: TransactionClient, company: string, key: PositionKey) {
    await client.query(
      `UPDATE inventory.stock_reservation r SET shortage_held=(s.sound_on_hand<(SELECT COALESCE(sum(quantity),0) FROM inventory.stock_reservation x WHERE (x.company_id,x.branch_id,x.brand_id,x.variant_id)=(r.company_id,r.branch_id,r.brand_id,r.variant_id) AND x.active)),version=r.version+1,updated_at=clock_timestamp() FROM inventory.stock_position s WHERE (s.company_id,s.branch_id,s.brand_id,s.variant_id)=(r.company_id,r.branch_id,r.brand_id,r.variant_id) AND r.company_id=$1 AND r.branch_id=$2 AND r.brand_id=$3 AND r.variant_id=$4 AND r.active`,
      [company, key.branchId, key.brandId, key.variantId],
    );
  }
}
export async function readProducts(
  client: TransactionClient,
  company: string,
  brandId?: string,
): Promise<ProductRecord[]> {
  return (
    await client.query<ProductRecord>(
      `SELECT p.id,p.brand_id AS "brandId",p.name,p.active,p.version,COALESCE(jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'options',v.options,'active',v.active) ORDER BY v.recorded_at,v.id) FILTER(WHERE v.id IS NOT NULL),'[]') AS variants FROM inventory.product p LEFT JOIN inventory.product_variant v ON v.company_id=p.company_id AND v.product_id=p.id WHERE p.company_id=$1 AND ($2::uuid IS NULL OR p.brand_id=$2) GROUP BY p.company_id,p.id ORDER BY p.name,p.id`,
      [company, brandId ?? null],
    )
  ).rows;
}
// Integer aggregates stay numeric/string until bounds have been checked; never narrow SQL bigint.
export function safeStockNumber(value: string): number {
  const parsed = BigInt(value);
  if (parsed < 0n || parsed > 9007199254740991n) throw Error('QUANTITY_OVERFLOW');
  return Number(parsed);
}
const base = `FROM inventory.product_variant v JOIN inventory.product p ON (p.company_id,p.id)=(v.company_id,v.product_id) JOIN commercial.brand b ON (b.company_id,b.id)=(v.company_id,v.brand_id) JOIN access.branch br ON br.company_id=v.company_id AND br.id=ANY($2::uuid[]) LEFT JOIN inventory.stock_position s ON (s.company_id,s.branch_id,s.brand_id,s.variant_id)=(v.company_id,br.id,v.brand_id,v.id) LEFT JOIN LATERAL (SELECT COALESCE(sum(quantity),0) AS reserved FROM inventory.stock_reservation r WHERE (r.company_id,r.branch_id,r.brand_id,r.variant_id)=(v.company_id,br.id,v.brand_id,v.id) AND active) r ON true`;
const columns = `br.id AS "branchId",br.name AS "branchName",b.id AS "brandId",b.name AS "brandName",p.id AS "productId",p.name AS "productName",v.id AS "variantId",v.name AS "variantName",v.options,(b.active AND p.active AND v.active) AS active,COALESCE(s.version,0) AS version,s.last_movement_at AS "lastMovementAt",COALESCE(s.sound_on_hand,0)::text AS "soundOnHand",COALESCE(s.unavailable_on_hand,0)::text AS "unavailableOnHand",r.reserved::text AS reserved`;
const where = `v.company_id=$1 AND (cardinality($3::uuid[])=0 OR b.id=ANY($3::uuid[])) AND ($4='' OR strpos(translate(lower(concat_ws(' ',b.name,p.name,v.name,v.options)),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),lower($4))>0) AND ($5::uuid IS NULL OR p.id=$5) AND ($6::uuid IS NULL OR v.id=$6) AND (cardinality($7::text[])=0 OR ('available'=ANY($7) AND COALESCE(s.sound_on_hand,0)>r.reserved) OR ('reserved'=ANY($7) AND r.reserved>0) OR ('unavailable'=ANY($7) AND COALESCE(s.unavailable_on_hand,0)>0) OR ('shortage'=ANY($7) AND r.reserved>COALESCE(s.sound_on_hand,0))) AND (NOT $8 OR COALESCE(s.sound_on_hand,0)<=r.reserved) AND (($9::timestamptz IS NULL AND $10::timestamptz IS NULL) OR EXISTS(SELECT 1 FROM inventory.stock_movement m WHERE (m.company_id,m.branch_id,m.brand_id,m.variant_id)=(v.company_id,br.id,v.brand_id,v.id) AND ($9::timestamptz IS NULL OR m.recorded_at >= $9) AND ($10::timestamptz IS NULL OR m.recorded_at < $10)))`;
interface RawStock extends Omit<
  StockRow,
  | 'soundOnHand'
  | 'unavailableOnHand'
  | 'reserved'
  | 'physicalOnHand'
  | 'available'
  | 'reservationShortage'
  | 'lastMovementAt'
> {
  soundOnHand: string;
  unavailableOnHand: string;
  reserved: string;
  lastMovementAt: Date | null;
}
export async function readStock(
  client: TransactionClient,
  company: string,
  filter: InventoryFilter,
  from: string | null,
  to: string | null,
): Promise<StockList> {
  // One SQL statement gives rows and count the same MVCC snapshot.
  const args = [
    company,
    filter.branches,
    filter.brands,
    filter.search,
    filter.productId,
    filter.variantId,
    filter.categories,
    filter.noAvailable,
    from,
    to,
    filter.limit,
    (filter.page - 1) * filter.limit,
  ];
  const row = (
    await client.query<{ items: RawStock[]; total: string; asOf: Date }>(
      `WITH filtered AS (SELECT ${columns} ${base} WHERE ${where}) SELECT (SELECT count(*)::text FROM filtered) AS total,COALESCE((SELECT jsonb_agg(t) FROM (SELECT * FROM filtered ORDER BY "productName","variantName","branchId","variantId" LIMIT $11 OFFSET $12) t),'[]') AS items,clock_timestamp() AS "asOf"`,
      args,
    )
  ).rows[0]!;
  return {
    total: Number(row.total),
    page: filter.page,
    limit: filter.limit,
    asOf: row.asOf.toISOString(),
    items: row.items.map((r) => {
      const soundOnHand = safeStockNumber(r.soundOnHand),
        unavailableOnHand = safeStockNumber(r.unavailableOnHand),
        reserved = safeStockNumber(r.reserved),
        physicalOnHand = safeStockNumber(
          (BigInt(r.soundOnHand) + BigInt(r.unavailableOnHand)).toString(),
        );
      return {
        ...r,
        soundOnHand,
        unavailableOnHand,
        reserved,
        physicalOnHand,
        available: Math.max(soundOnHand - reserved, 0),
        reservationShortage: Math.max(reserved - soundOnHand, 0),
        lastMovementAt: r.lastMovementAt ? String(r.lastMovementAt) : null,
      };
    }),
  };
}
