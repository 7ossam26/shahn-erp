import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction, type TransactionClient } from '@shahn/database';
import { AccessError, workState, type WorkOutcome } from '@shahn/domain';
import { canonical, digest } from '../access/crypto.js';
export interface Lease {
  id: string;
  company_id: string;
  principal_id: string;
  command_record_id: string;
  entity_id: string;
  entity_version: number;
  kind: string;
  lane: string;
  payload: unknown;
  fence: number;
  attempts: number;
  lease_owner: string;
}
export interface WorkRegistration {
  kind: string;
  lane: 'identity' | 'source' | 'inbox' | 'storage' | 'export' | 'kernel';
}
export async function claimWork<T extends Lease>(
  pool: Pool,
  owner: string,
  kinds: readonly string[],
  seconds = 60,
): Promise<T | null> {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300)
    throw new Error('INVALID_LEASE_DURATION');
  return transaction(
    pool,
    async (client) =>
      (
        await client.query<T>(
          `WITH candidate AS (
    SELECT id FROM work_item WHERE kind=ANY($2::text[]) AND ((state='pending' AND available_at<=clock_timestamp())
      OR (state='leased' AND lease_until<=clock_timestamp())) ORDER BY available_at,created_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
    UPDATE work_item w SET state='leased',lease_owner=$1,lease_until=clock_timestamp()+($3*interval '1 second'),fence=fence+1,attempts=attempts+1
    FROM candidate c WHERE w.id=c.id RETURNING w.*`,
          [owner, kinds, seconds],
        )
      ).rows[0] ?? null,
  );
}
export async function lockLease(
  client: TransactionClient,
  work: Pick<Lease, 'id' | 'fence'>,
  owner: string,
): Promise<boolean> {
  return !!(
    await client.query(
      `SELECT id FROM work_item WHERE id=$1 AND fence=$2 AND lease_owner=$3
    AND state='leased' AND lease_until>clock_timestamp() FOR UPDATE`,
      [work.id, work.fence, owner],
    )
  ).rowCount;
}
export class DurableWork {
  readonly owner = randomUUID();
  constructor(
    readonly pool: Pool,
    readonly registry: readonly WorkRegistration[],
  ) {}
  async enqueue(
    client: TransactionClient,
    input: {
      companyId: string;
      principalId: string;
      commandRecordId: string;
      entityId: string;
      entityVersion: number;
      kind: string;
      sourceIdentity: string;
      payload: unknown;
    },
  ) {
    const registration = this.registry.find((r) => r.kind === input.kind);
    if (!registration) throw new Error('UNREGISTERED_WORK_KIND');
    const payload = canonical(input.payload),
      hash = digest(payload),
      id = randomUUID();
    await client.query(
      `INSERT INTO work_item(id,company_id,principal_id,command_record_id,entity_id,entity_version,lane,
      correlation_id,payload,payload_digest,kind,source_identity) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT(company_id,kind,source_identity) DO NOTHING`,
      [
        id,
        input.companyId,
        input.principalId,
        input.commandRecordId,
        input.entityId,
        input.entityVersion,
        registration.lane,
        randomUUID(),
        payload,
        hash,
        input.kind,
        input.sourceIdentity,
      ],
    );
    const row = (
      await client.query<{ id: string; payload_digest: string }>(
        `SELECT id,payload_digest FROM work_item WHERE company_id=$1 AND kind=$2 AND source_identity=$3`,
        [input.companyId, input.kind, input.sourceIdentity],
      )
    ).rows[0]!;
    if (row.payload_digest !== hash) throw new AccessError('WORK_PAYLOAD_CONFLICT', 409);
    return row.id;
  }
  claim(seconds = 60) {
    return claimWork(
      this.pool,
      this.owner,
      this.registry.map((r) => r.kind),
      seconds,
    );
  }
  async finish(
    work: Lease,
    outcome: WorkOutcome,
    apply: (client: TransactionClient) => Promise<void> = async () => {},
  ) {
    const state = workState(outcome);
    return transaction(this.pool, async (client) => {
      if (!(await lockLease(client, work, this.owner))) return false;
      await apply(client);
      await client.query(
        `UPDATE work_item SET state=$1,outcome_kind=$2,last_error=$3,lease_owner=NULL,lease_until=NULL,
        completed_at=CASE WHEN $1 IN ('ready','failed') THEN clock_timestamp() ELSE NULL END,
        available_at=clock_timestamp()+($4*interval '1 second') WHERE id=$5`,
        [
          state,
          outcome.kind,
          outcome.kind === 'success' ? null : outcome.code,
          Math.min(300, 2 ** Math.min(work.attempts, 8)),
          work.id,
        ],
      );
      return true;
    });
  }
}
