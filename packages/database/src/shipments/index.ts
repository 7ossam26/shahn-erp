import { readShipmentStock } from '../inventory/stock-reservations.repository.js';
import { randomUUID } from 'node:crypto';
import type { TransactionClient } from '../transaction.js';
import type {
  ShipmentDetail,
  ShipmentFields,
  ShipmentPrice,
  ShipmentFilter,
  ParcelList,
  PreparationState,
} from '@shahn/contracts';
/** All repository writes use the caller's checked-out transaction; no independent commit. */
export async function appendShipmentRevision(
  client: TransactionClient,
  company: string,
  id: string,
  revision: number,
  fields: ShipmentFields,
  phone: string,
  price: ShipmentPrice,
) {
  await client.query(
    'INSERT INTO shipments.revision(company_id,shipment_id,brand_id,revision,fields,phone_canonical) VALUES($1,$2,$3,$4,$5,$6)',
    [company, id, fields.brandId, revision, JSON.stringify(fields), phone],
  );
  await client.query(
    'INSERT INTO shipments.price_snapshot(company_id,shipment_id,revision,snapshot) VALUES($1,$2,$3,$4)',
    [company, id, revision, JSON.stringify(price)],
  );
  for (const line of fields.lines)
    await client.query(
      'INSERT INTO shipments.line(company_id,shipment_id,revision,id,description,quantity,unit_due_minor) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [company, id, revision, line.id, line.description, line.quantity, line.unitDue.amountMinor],
    );
}
export async function createShipmentAggregate(
  client: TransactionClient,
  company: string,
  id: string,
  recordId: string,
  fields: ShipmentFields,
  phone: string,
  price: ShipmentPrice,
  preparation: PreparationState,
) {
  const row = (
    await client.query<{ reference: string }>(
      'INSERT INTO shipments.shipment(company_id,id,brand_id,branch_id,command_record_id,preparation) VALUES($1,$2,$3,$4,$5,$6) RETURNING reference',
      [company, id, fields.brandId, fields.branchId, recordId, preparation],
    )
  ).rows[0]!;
  await appendShipmentRevision(client, company, id, 1, fields, phone, price);
  return row.reference;
}
export async function receiveShipmentParcel(
  client: TransactionClient,
  company: string,
  id: string,
  recordId: string,
  fields: ShipmentFields,
  actorId: string,
  actorName: string,
) {
  const receipt = randomUUID();
  await client.query(
    'INSERT INTO shipments.receipt(company_id,id,shipment_id,brand_id,branch_id,command_record_id,actor_id,actor_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [company, receipt, id, fields.brandId, fields.branchId, recordId, actorId, actorName],
  );
  await client.query(
    'INSERT INTO shipments.parcel_custody(company_id,shipment_id,receipt_id,branch_id) VALUES($1,$2,$3,$4)',
    [company, id, receipt, fields.branchId],
  );
}
export async function readShipment(
  client: TransactionClient,
  company: string,
  key: string,
  byReference = false,
): Promise<ShipmentDetail | undefined> {
  const row = (
    await client.query<{
      id: string;
      reference: string;
      version: number;
      revision: number;
      state: 'active' | 'cancelled';
      preparation: PreparationState;
      source_state: 'local' | 'integrated';
      handed_over: boolean;
      received_at: Date;
      branch_name: string;
      fields: ShipmentFields;
      phone_canonical: string;
      snapshot: ShipmentPrice;
    }>(
      `SELECT s.*,r.fields,r.phone_canonical,p.snapshot,b.name AS branch_name FROM shipments.shipment s JOIN shipments.revision r ON (r.company_id,r.shipment_id,r.revision)=(s.company_id,s.id,s.revision) JOIN shipments.price_snapshot p ON (p.company_id,p.shipment_id,p.revision)=(s.company_id,s.id,s.revision) JOIN access.branch b ON (b.company_id,b.id)=(s.company_id,s.branch_id) WHERE s.company_id=$1 AND s.${byReference ? 'reference' : 'id'}=$2`,
      [company, key],
    )
  ).rows[0];
  if (!row) return undefined;
  const timeline = (
    await client.query<{
      version: number;
      kind: ShipmentDetail['timeline'][number]['kind'];
      at: Date;
      actor: string;
      reason: string;
    }>(
      'SELECT version,kind,recorded_at AS at,actor_name AS actor,reason FROM shipments.event WHERE company_id=$1 AND shipment_id=$2 ORDER BY version',
      [company, row.id],
    )
  ).rows.map((e) => ({ ...e, at: e.at.toISOString() }));
  const revisions = (
    await client.query<ShipmentDetail['revisions'][number]>(
      `SELECT r.revision,r.fields,r.phone_canonical AS "phoneCanonical",p.snapshot AS price FROM shipments.revision r JOIN shipments.price_snapshot p USING(company_id,shipment_id,revision) WHERE r.company_id=$1 AND r.shipment_id=$2 ORDER BY r.revision`,
      [company, row.id],
    )
  ).rows;
  return {
    id: row.id,
    reference: row.reference,
    version: row.version,
    revision: row.revision,
    state: row.state,
    preparation: row.preparation,
    fields: row.fields,
    phoneCanonical: row.phone_canonical,
    price: row.snapshot,
    branchName: row.branch_name,
    receivedAt: row.received_at.toISOString(),
    sourceState: row.source_state,
    handedOver: row.handed_over,
    timeline,
    revisions,
    stock: await readShipmentStock(client, company, row.id),
  };
}
export async function duplicateShipmentReference(
  client: TransactionClient,
  company: string,
  brand: string,
  reference: string,
  exceptId: string | null = null,
) {
  if (!reference.trim()) return false;
  return !!(
    await client.query(
      `SELECT 1 FROM shipments.shipment s JOIN shipments.revision r ON (r.company_id,r.shipment_id,r.revision)=(s.company_id,s.id,s.revision) WHERE s.company_id=$1 AND s.brand_id=$2 AND r.fields->>'brandReference'=$3 AND ($4::uuid IS NULL OR s.id<>$4) LIMIT 1`,
      [company, brand, reference, exceptId],
    )
  ).rowCount;
}
export async function readParcels(
  client: TransactionClient,
  company: string,
  filter: ShipmentFilter,
  from: string | null,
  to: string | null,
  custody: 'branch' | 'external' = 'branch',
  preparationOnly = false,
): Promise<ParcelList> {
  if (custody === 'external')
    return {
      items: [],
      total: 0,
      page: filter.page,
      limit: filter.limit,
      custody,
      boundary: 'LOCAL_CUSTODY_ONLY',
    };
  const args = [
    company,
    filter.branches,
    filter.brands,
    filter.service,
    filter.preparation,
    filter.state,
    filter.search,
    from,
    to,
    preparationOnly,
  ];
  const join = `FROM shipments.shipment s JOIN shipments.parcel_custody c ON (c.company_id,c.shipment_id)=(s.company_id,s.id) JOIN shipments.revision r ON (r.company_id,r.shipment_id,r.revision)=(s.company_id,s.id,s.revision) JOIN commercial.brand b ON (b.company_id,b.id)=(s.company_id,s.brand_id) JOIN access.branch br ON (br.company_id,br.id)=(c.company_id,c.branch_id)`;
  const blocked = `EXISTS(SELECT 1 FROM shipments.stock_allocation a JOIN inventory.stock_reservation sr ON (sr.company_id,sr.id)=(a.company_id,a.reservation_id) WHERE a.company_id=s.company_id AND a.shipment_id=s.id AND sr.active AND sr.shortage_held)`;
  const where = `s.company_id=$1 AND c.holder='branch' AND c.branch_id=ANY($2::uuid[]) AND (cardinality($3::uuid[])=0 OR s.brand_id=ANY($3::uuid[])) AND ($4='all' OR r.fields->>'service'=$4) AND ($5='all' OR s.preparation=$5 OR ($5='blocked' AND ${blocked})) AND ($6='all' OR s.state=$6) AND ($7='' OR strpos(translate(lower(concat_ws(' ',s.reference,r.fields->>'brandReference',r.fields->>'recipientName',r.fields->>'phoneDisplay')),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),lower($7))>0) AND ($8::timestamptz IS NULL OR s.received_at>=$8) AND ($9::timestamptz IS NULL OR s.received_at<$9) AND (NOT $10::boolean OR s.preparation<>'not_required')`;
  const total = Number(
    (await client.query(`SELECT count(*)::text AS n ${join} WHERE ${where}`, args)).rows[0].n,
  );
  const items = (
    await client.query<ParcelList['items'][number] & { receivedAt: Date }>(
      `SELECT s.id,s.reference,s.brand_id AS "brandId",b.name AS "brandName",r.fields->>'recipientName' AS "recipientName",c.branch_id AS "branchId",br.name AS "branchName",r.fields->>'service' AS service,s.state,s.preparation,${blocked} AS blocked,s.received_at AS "receivedAt",GREATEST(0,(clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date-(s.received_at AT TIME ZONE 'Africa/Cairo')::date)::int AS "ageDays",'branch' AS custody ${join} WHERE ${where} ORDER BY s.received_at DESC,s.id LIMIT $11 OFFSET $12`,
      [...args, filter.limit, (filter.page - 1) * filter.limit],
    )
  ).rows.map((r) => ({ ...r, receivedAt: r.receivedAt.toISOString() }));
  return {
    items,
    total,
    page: filter.page,
    limit: filter.limit,
    custody,
    boundary: 'LOCAL_CUSTODY_ONLY',
  };
}
