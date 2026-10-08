import type { Pool } from 'pg';
import { sourceByCompany } from '@shahn/database';
import { AccessError } from '@shahn/domain';
import type { IntegrationRuntime } from './config.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RecoveryClient } from './recovery-client.js';
import { recoveryConnection } from './recovery.service.js';
async function authorizedSource(pool: Pool, token: string, companyId: string) {
  return UnitOfWork.run(pool, token, companyId, 'integration', async (u) => {
    const denied = await u.client.query(
      `SELECT 1 FROM access.branch WHERE company_id=$1 AND NOT id=ANY($2::uuid[]) LIMIT 1`,
      [companyId, u.access.assignedBranches.map((b) => b.id)],
    );
    if (denied.rowCount) throw new AccessError('FORBIDDEN_SCOPE');
    const s = await sourceByCompany(u.client, companyId);
    if (!s) throw new AccessError('CONNECTION_REQUIRED', 409);
    return s;
  });
}
/** The sender list has no branch filter: require all-branch authority, then recheck after network I/O. */
export async function deliveryQuery(
  pool: Pool,
  token: string,
  companyId: string,
  runtime: IntegrationRuntime,
  q: {
    limit: number;
    cursor?: string | undefined;
    eventId?: string | undefined;
    beforeAttempt?: number | undefined;
  },
) {
  const s = await authorizedSource(pool, token, companyId),
    c = new RecoveryClient(recoveryConnection(runtime, s));
  const r = q.eventId
    ? await c.delivery(q.eventId, q.limit, q.beforeAttempt)
    : await c.deliveries(q.limit, q.cursor);
  const current = await authorizedSource(pool, token, companyId);
  if (current.id !== s.id || !current.enabled) throw new AccessError('FORBIDDEN_SCOPE');
  return r.body;
}
