import type { TransactionClient } from '../transaction.js';
/** Read received/application progress without inventing a global sequence. */
export async function executionCheckpoints(
  c: TransactionClient,
  companyId: string,
  sourceId: string,
  aggregateIds: string[],
) {
  return (
    await c.query(
      `SELECT aggregate_type AS "aggregateType",aggregate_id AS "aggregateId",received_through::text AS "receivedThrough",received_high::text AS "receivedHigh",applied_through::text AS "appliedThrough",snapshot_through::text AS "snapshotThrough",projected_through::text AS "projectedThrough",history_complete AS "historyComplete" FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 AND aggregate_id=ANY($3::uuid[]) ORDER BY aggregate_type,aggregate_id`,
      [companyId, sourceId, aggregateIds],
    )
  ).rows;
}
