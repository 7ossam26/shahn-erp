import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { AccessError } from '@shahn/domain';
import { readReferences, readTariffs } from '@shahn/database';
export async function configurationLock(uow: UnitOfWork, write = false) {
  uow.lockOrder('aggregate', 'commercial-configuration');
  await uow.client.query(
    `SELECT ${write ? 'pg_advisory_xact_lock' : 'pg_advisory_xact_lock_shared'}(hashtextextended($1,404))`,
    [uow.access.companyId],
  );
}
export async function catalog(uow: UnitOfWork) {
  return {
    references: await readReferences(uow.client, uow.access.companyId),
    tariffs: uow.access.grants.includes('brands')
      ? await readTariffs(uow.client, uow.access.companyId)
      : [],
    branches: uow.access.companyBranches,
  };
}
export async function requireReference(
  uow: UnitOfWork,
  id: string,
  kind: string,
  parentId?: string,
  allowInactive = false,
) {
  const row = (
    await uow.client.query<{ name: string; parent_id: string | null }>(
      `SELECT name,parent_id FROM commercial.reference WHERE company_id=$1 AND id=$2 AND kind=$3 AND (active OR $4)`,
      [uow.access.companyId, id, kind, allowInactive],
    )
  ).rows[0];
  if (!row || (parentId !== undefined && row.parent_id !== parentId))
    throw new AccessError('INVALID_GEOGRAPHY_OR_TIER', 409);
  return row;
}
