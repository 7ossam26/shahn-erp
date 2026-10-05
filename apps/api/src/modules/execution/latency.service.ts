import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { assertCapability } from '@shahn/domain';
export async function executionLatency(u: UnitOfWork, eventId: string) {
  assertCapability(u.access, 'integration');
  const row = (
    await u.client.query(
      `SELECT event_id AS "eventId",action_id AS "actionId",confirmed_at AS "canonicalConfirmationAt",received_at AS "receiverReceiptAt",projected_at AS "projectionWriteAt",projection_commit_observed_at AS "commitObservedAt",first_read_at AS "firstReadableObservationAt",extract(epoch FROM (projection_commit_observed_at-received_at))*1000 AS "localCommitVisibilityMs",extract(epoch FROM(first_read_at-received_at))*1000 AS "localReadableMs" FROM execution.timeline WHERE company_id=$1 AND event_id=$2`,
      [u.access.companyId, eventId],
    )
  ).rows[0];
  return row
    ? {
        ...row,
        remoteClockVerified: false,
        canonicalToVisibleMs: null,
        clockMethod: 'same database receipt / after-commit observer / authorized detail read',
        targetMs: 5000,
      }
    : null;
}
