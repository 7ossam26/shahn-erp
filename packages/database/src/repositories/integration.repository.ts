import { createHash } from 'node:crypto';
import type { SenderEvent, ReceiptAcknowledgement, BindingKind } from '@shahn/contracts/tawsel';
import type { TransactionClient } from '../transaction.js';
export interface IntegrationSource {
  company_id: string;
  id: string;
  tenant_id: string;
  integration_id: string;
  selector: string;
  external_id: string;
  base_url: string;
  issuer: string;
  enabled: boolean;
  configuration: unknown;
  last_error: string | null;
}
export interface IntegrationBinding {
  company_id: string;
  source_id: string;
  id: string;
  entity: BindingKind;
  native_id: string;
  external_id: string;
  version: number;
  submitted_revision: string;
  accepted_revision: string;
  resource_id: string | null;
  issuer_status: string;
  enabled: boolean | null;
}
export class InboxConflict extends Error {
  constructor(readonly code: 'payload_mismatch' | 'sequence_collision') {
    super(code);
  }
}
export async function insertReceivedEvent(
  client: TransactionClient,
  source: IntegrationSource,
  event: SenderEvent,
  rawBody: Buffer,
  metadata: { keyId: string; deliveryTimestamp: string },
): Promise<ReceiptAcknowledgement> {
  const key = [source.company_id, source.id, event.aggregate.type, event.aggregate.id];
  await client.query(
    `INSERT INTO integration.checkpoint(company_id,source_id,aggregate_type,aggregate_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
    key,
  );
  await client.query(
    `SELECT 1 FROM integration.checkpoint WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4 FOR UPDATE`,
    key,
  );
  const hash = createHash('sha256').update(rawBody).digest('hex');
  const acknowledgement: ReceiptAcknowledgement = {
    schemaVersion: '1.0.0',
    tenantId: event.tenantId,
    recipientIntegrationId: event.recipientIntegrationId,
    eventId: event.eventId,
    acknowledgement: 'received',
  };
  const inserted = await client.query(
    `INSERT INTO integration.inbox(company_id,source_id,event_id,event_type,aggregate_type,aggregate_id,recipient_sequence,raw_body,body_hash,envelope,acknowledgement,key_id,delivery_timestamp,pending_reason)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT DO NOTHING RETURNING event_id`,
    [
      source.company_id,
      source.id,
      event.eventId,
      event.eventType,
      event.aggregate.type,
      event.aggregate.id,
      event.aggregate.recipientSequence,
      rawBody,
      hash,
      JSON.stringify(event),
      JSON.stringify(acknowledgement),
      metadata.keyId,
      metadata.deliveryTimestamp,
      event.eventType === 'provisioning.changed' ? 'provisioning_pending' : 'handler_pending',
    ],
  );
  if (!inserted.rowCount) {
    const old = (
      await client.query<{
        body_hash: string;
        raw_body: Buffer;
        acknowledgement: ReceiptAcknowledgement;
      }>(
        `SELECT body_hash,raw_body,acknowledgement FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND event_id=$3`,
        [source.company_id, source.id, event.eventId],
      )
    ).rows[0];
    if (!old) throw new InboxConflict('sequence_collision');
    if (old.body_hash !== hash || !old.raw_body.equals(rawBody))
      throw new InboxConflict('payload_mismatch');
    return old.acknowledgement;
  }
  // Advance only the contiguous received prefix. Application counters stay unchanged.
  await client.query(
    `WITH ordered AS (
    SELECT recipient_sequence,row_number() OVER(ORDER BY recipient_sequence) AS n FROM integration.inbox
    WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4), stats AS (
      SELECT COALESCE(min(recipient_sequence-1) FILTER(WHERE recipient_sequence<>n),max(recipient_sequence),0) AS prefix,
      COALESCE(max(recipient_sequence),0) AS high FROM ordered)
    UPDATE integration.checkpoint SET received_through=LEAST(stats.prefix,COALESCE((SELECT min(n)-1 FROM ordered WHERE recipient_sequence<>n),stats.high)),
    received_high=stats.high,updated_at=clock_timestamp() FROM stats WHERE company_id=$1 AND source_id=$2 AND aggregate_type=$3 AND aggregate_id=$4`,
    key,
  );
  return acknowledgement;
}
export async function sourceByCompany(client: TransactionClient, companyId: string, lock = false) {
  return (
    (
      await client.query<IntegrationSource>(
        'SELECT * FROM integration.source WHERE company_id=$1' + (lock ? ' FOR UPDATE' : ''),
        [companyId],
      )
    ).rows[0] ?? null
  );
}
