import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from '@shahn/database';
import { provisioningOutcome } from '@shahn/domain';
import { IssuerFailure, type IdentityIntent, type KeycloakIdentityAdapter } from './identity.js';
import { claimWork, lockLease, type Lease } from '../kernel/work.js';
interface Work extends Lease {
  id: string;
  company_id: string;
  entity_id: string;
  entity_version: number;
  command_record_id: string;
  payload: IdentityIntent;
  fence: number;
  attempts: number;
}
export class IdentityWorker {
  readonly owner = randomUUID();
  constructor(
    readonly pool: Pool,
    readonly adapter: Pick<KeycloakIdentityAdapter, 'reconcile' | 'config'>,
  ) {}
  async claim(): Promise<Work | null> {
    return claimWork<Work>(this.pool, this.owner, ['identity.reconcile']);
  }
  async runOne(): Promise<boolean> {
    const work = await this.claim();
    if (!work) return false;
    let subject: string | undefined, error: IssuerFailure | undefined;
    // Network runs only after the claim transaction commits. A killed process leaves its lease recoverable.
    try {
      subject = await this.adapter.reconcile(work.payload);
    } catch (failure) {
      error =
        failure instanceof IssuerFailure
          ? failure
          : new IssuerFailure('unknown', 'ISSUER_RESULT_UNKNOWN');
    }
    await transaction(this.pool, async (client) => {
      await client.query('SELECT id FROM access.company WHERE id=$1 FOR UPDATE', [work.company_id]);
      if (!(await lockLease(client, work, this.owner))) return;
      if (subject) {
        const binding = (
          await client.query<{ principal_id: string; issuer: string; subject: string }>(
            'SELECT * FROM access.issuer_binding WHERE principal_id=$1 OR (issuer=$2 AND subject=$3)',
            [work.entity_id, this.adapter.config.issuer, subject],
          )
        ).rows;
        if (
          binding.some(
            (b) =>
              b.principal_id !== work.entity_id ||
              b.issuer !== this.adapter.config.issuer ||
              b.subject !== subject,
          )
        )
          error = new IssuerFailure('invalid', 'ISSUER_BINDING_CONFLICT');
        else
          await client.query(
            'INSERT INTO access.issuer_binding(principal_id,issuer,subject) VALUES($1,$2,$3) ON CONFLICT(principal_id) DO NOTHING',
            [work.entity_id, this.adapter.config.issuer, subject],
          );
      }
      const outcome = provisioningOutcome(error?.kind ?? 'success');
      const delay = Math.min(300, 2 ** Math.min(work.attempts, 8)) + Math.floor(Math.random() * 3);
      await client.query(
        `UPDATE work_item SET state=$1,last_error=$2,lease_owner=NULL,lease_until=NULL,available_at=clock_timestamp()+($3*interval '1 second'),completed_at=CASE WHEN $1 IN ('ready','failed') THEN clock_timestamp() ELSE NULL END WHERE id=$4`,
        [outcome, error?.safeCode ?? null, delay, work.id],
      );
      await client.query(
        `UPDATE access.ordinary_user SET identity_state=$1,identity_error=$2 WHERE company_id=$3 AND id=$4 AND version=$5`,
        [outcome, error?.safeCode ?? null, work.company_id, work.entity_id, work.entity_version],
      );
      const commandState =
        outcome === 'ready' ? 'completed' : outcome === 'failed' ? 'rejected' : 'pending';
      await client.query(
        `UPDATE command_record SET state=$1,result=jsonb_set(jsonb_set(result,'{state}',to_jsonb($1::text)),'{errorCode}',COALESCE(to_jsonb($3::text),'null'::jsonb)) WHERE id=$2`,
        [commandState, work.command_record_id, error?.safeCode ?? null],
      );
      await client.query(
        'UPDATE access.company SET authorization_revision=authorization_revision+1 WHERE id=$1',
        [work.company_id],
      );
    });
    return true;
  }
}
