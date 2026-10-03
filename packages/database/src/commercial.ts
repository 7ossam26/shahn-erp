import type { TransactionClient } from './transaction.js';
import type { BrandRecord, ReferenceRecord, TariffRecord } from '@shahn/contracts';
/** Parameterized read models; caller supplies the authenticated company and transaction. */
export async function readBrand(
  client: TransactionClient,
  companyId: string,
  id: string,
): Promise<BrandRecord | undefined> {
  const row = (
    await client.query<{ id: string; version: number; fields: BrandRecord }>(
      `SELECT b.id,b.version,p.fields FROM commercial.brand b JOIN commercial.brand_policy p ON (p.company_id,p.brand_id,p.version)=(b.company_id,b.id,b.version) WHERE b.company_id=$1 AND b.id=$2`,
      [companyId, id],
    )
  ).rows[0];
  return row ? { ...row.fields, id: row.id, version: row.version } : undefined;
}
export async function readReferences(
  client: TransactionClient,
  companyId: string,
): Promise<ReferenceRecord[]> {
  return (
    await client.query<ReferenceRecord>(
      `SELECT id,version,kind,name,active,parent_id AS "parentId",volume_range AS "volumeRange" FROM commercial.reference WHERE company_id=$1 ORDER BY kind,name,id`,
      [companyId],
    )
  ).rows;
}
export async function readTariffs(
  client: TransactionClient,
  companyId: string,
): Promise<TariffRecord[]> {
  return (
    await client.query<TariffRecord>(
      `SELECT id,version,tier_id AS "tierId",governorate_id AS "governorateId",area_id AS "areaId",amount_minor::text AS "amountMinor",active FROM commercial.tariff WHERE company_id=$1 ORDER BY tier_id,governorate_id,area_id NULLS FIRST`,
      [companyId],
    )
  ).rows;
}
