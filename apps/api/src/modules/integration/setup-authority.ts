import { AccessError } from '@shahn/domain';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
export function requireConnectionAuthority(u: UnitOfWork) {
  if (
    u.access.principalKind !== 'support' ||
    !u.access.supportSessionId ||
    !u.access.supportExpiresAt ||
    Date.parse(u.access.supportExpiresAt) <= Date.now()
  )
    throw new AccessError('CONNECTION_SETUP_AUTHORITY_REQUIRED');
}
