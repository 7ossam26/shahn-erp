import type { ReturnItem, ReturnRequest } from '@shahn/contracts/tawsel';
import type { ReturnCondition } from '@shahn/contracts';
import type { TransactionClient } from '../transaction.js';
export interface ReturnRequestRow {
  company_id: string;
  source_id: string;
  id: string;
  branch_id: string;
  driver_id: string;
  original: ReturnRequest;
  requested_at: Date;
  checked_at: Date;
}
export interface ReturnItemRow {
  company_id: string;
  source_id: string;
  id: string;
  request_id: string;
  cycle_id: string;
  shipment_id: string;
  source_line_id: string;
  original: ReturnItem;
  current_data: ReturnItem;
  revision: string;
  requested: number;
  received: number;
  lost: number;
  damaged: number;
  unresolved: number;
}
export interface ReturnIntentRow {
  company_id: string;
  id: string;
  source_id: string;
  request_id: string;
  branch_id: string;
  command_record_id: string;
  action_id: string;
  kind: 'received' | 'lost' | 'damaged';
  actor_id: string;
  actor_name: string;
  observed_at: Date;
  state: string;
  decision_id: string | null;
}
export interface ReceiptLineRow {
  company_id: string;
  id: string;
  source_id: string;
  item_id: string;
  receipt_id: string;
  shipment_id: string;
  cycle_id: string;
  source_line_id: string;
  brand_id: string;
  branch_id: string;
  variant_id: string | null;
  quantity: number;
  consumed: number;
  condition: ReturnCondition;
  version: number;
}
export async function returnRequest(
  c: TransactionClient,
  company: string,
  source: string,
  id: string,
  lock = false,
) {
  return (
    await c.query<ReturnRequestRow>(
      `SELECT * FROM returns.request WHERE company_id=$1 AND source_id=$2 AND id=$3${lock ? ' FOR UPDATE' : ''}`,
      [company, source, id],
    )
  ).rows[0];
}
export async function returnItems(
  c: TransactionClient,
  company: string,
  source: string,
  request: string,
  lock = false,
) {
  return (
    await c.query<ReturnItemRow>(
      `SELECT * FROM returns.item WHERE company_id=$1 AND source_id=$2 AND request_id=$3 ORDER BY id${lock ? ' FOR UPDATE' : ''}`,
      [company, source, request],
    )
  ).rows;
}
export async function receiptLines(
  c: TransactionClient,
  company: string,
  ids: string[],
  lock = false,
) {
  return (
    await c.query<ReceiptLineRow>(
      `SELECT * FROM returns.return_receipt_line WHERE company_id=$1 AND id=ANY($2::uuid[]) ORDER BY id${lock ? ' FOR UPDATE' : ''}`,
      [company, ids],
    )
  ).rows;
}
