import type { TransactionClient } from '@shahn/database';
/** Accepted operator-installed source evidence is separate from native commands.
 * Signed historical revisions covered by the installed anchor may apply without
 * rewriting the current source configuration or inventing bootstrap commands. */
export async function installedSourceEvidence(
  c: TransactionClient,
  company: string,
  source: string,
  identity: {
    actionId?: unknown;
    sourceRevision: unknown;
    resourceId: unknown;
    externalId: unknown;
  },
  historical = false,
) {
  if (
    !(
      await c.query(
        "SELECT to_regclass('integration.import_verification') IS NOT NULL AS installed",
      )
    ).rows[0].installed
  )
    return false;
  const evidence = (
    await c.query<{
      source_status: {
        lastActionId: string;
        sourceRevision: number;
        resourceId: string;
        externalId: string;
      };
    }>(
      `SELECT v.source_status FROM integration.import_verification v JOIN integration.connection_revision r ON(r.company_id,r.import_id)=(v.company_id,v.import_id) WHERE r.company_id=$1 AND r.source_id=$2 UNION ALL SELECT o.source_status FROM integration.enrollment_operator_result o JOIN integration.enrollment_request r ON(r.company_id,r.id)=(o.company_id,o.request_id) WHERE r.company_id=$1 AND r.source_id=$2`,
      [company, source],
    )
  ).rows;
  return evidence.some(
    ({ source_status: s }) =>
      s.resourceId === identity.resourceId &&
      s.externalId === identity.externalId &&
      (historical
        ? Number(identity.sourceRevision) <= s.sourceRevision &&
          Number(identity.sourceRevision) >= 1
        : s.sourceRevision === identity.sourceRevision && s.lastActionId === identity.actionId),
  );
}
