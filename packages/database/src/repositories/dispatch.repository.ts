import type { TransactionClient } from '../transaction.js';
import type { DispatchState } from '@shahn/contracts';
import type { IntakeTask, SourceSnapshot } from '@shahn/contracts/tawsel';
export interface DispatchIntentRow {
  company_id: string;
  id: string;
  source_id: string;
  branch_id: string;
  driver_id: string;
  driver_external_id: string;
  driver_resource_id: string;
  command_record_id: string;
  actor_id: string;
  actor_name: string;
  version: number;
  state: DispatchState;
  last_error: string | null;
  created_at: Date;
}
export interface DispatchItemRow {
  company_id: string;
  intent_id: string;
  cycle_id: string;
  shipment_id: string;
  shipment_revision: number;
  snapshot: SourceSnapshot;
  price: import('@shahn/contracts').DispatchPrice;
  cover_source_id: string | null;
  cover_id: string | null;
  external_id: string;
  source_cycle_id: string;
  accepted_revision: string;
  desired_revision: string;
  pending_revision: string | null;
  assignment_revision: string;
  task_id: string | null;
  remote_cycle_id: string | null;
  task: IntakeTask | null;
}
export async function readDispatchIntent(
  c: TransactionClient,
  company: string,
  id: string,
  lock = false,
) {
  return (
    await c.query<DispatchIntentRow>(
      'SELECT * FROM dispatch.intent WHERE company_id=$1 AND id=$2' + (lock ? ' FOR UPDATE' : ''),
      [company, id],
    )
  ).rows[0];
}
export async function readDispatchItems(c: TransactionClient, company: string, id: string) {
  return (
    await c.query<DispatchItemRow>(
      `SELECT i.*,c.external_id,c.source_cycle_id,c.accepted_revision::text,c.pending_revision::text,c.desired_revision::text,c.assignment_revision::text,c.task_id,c.remote_cycle_id,c.task FROM dispatch.item i JOIN dispatch.cycle c ON(c.company_id,c.id)=(i.company_id,i.cycle_id) WHERE i.company_id=$1 AND i.intent_id=$2 ORDER BY i.shipment_id`,
      [company, id],
    )
  ).rows;
}
/** Caller must lock the shipment before claiming it, including future transfer consumers. */
export async function claimParcel(
  c: TransactionClient,
  company: string,
  shipment: string,
  kind: 'dispatch' | 'transfer',
  owner: string,
) {
  return !!(
    await c.query(
      `INSERT INTO shipments.parcel_claim(company_id,shipment_id,kind,owner_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING shipment_id`,
      [company, shipment, kind, owner],
    )
  ).rowCount;
}
