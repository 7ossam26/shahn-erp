import { randomUUID } from 'node:crypto';
import {
  AccessError,
  addMinor,
  minor,
  validateEffect,
  type JournalEffect,
  type JournalFamily,
} from '@shahn/domain';
import { canonical, digest } from '../access/crypto.js';
import { UnitOfWork, type LockClass } from './unit-of-work.js';
export interface SourceIdentity {
  system: string;
  identity: string;
  kind: string;
  revision: string;
}
export interface SourceRecord {
  id: string;
  duplicate: boolean;
}
const resourceClass: Record<JournalFamily, LockClass> = {
  brand: 'wallet',
  storage: 'wallet',
  employee: 'employee',
  money: 'money',
  operating: 'aggregate',
};
export const resourceKey = (family: JournalFamily, id: string) => family + ':' + id;
export class JournalPosting {
  constructor(readonly uow: UnitOfWork) {}
  async source(source: SourceIdentity, semanticPayload: unknown): Promise<SourceRecord> {
    const { client, access } = this.uow;
    this.uow.lockOrder('identity', 'source:' + canonical(source));
    const hash = digest(canonical(semanticPayload));
    const inserted = await client.query(
      `INSERT INTO kernel.source_record(id,company_id,system,identity,kind,revision,payload_digest)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(company_id,system,identity,kind,revision) DO NOTHING RETURNING id`,
      [
        randomUUID(),
        access.companyId,
        source.system,
        source.identity,
        source.kind,
        source.revision,
        hash,
      ],
    );
    const row = (
      await client.query<{ id: string; payload_digest: string }>(
        `SELECT id,payload_digest FROM kernel.source_record WHERE company_id=$1 AND system=$2 AND identity=$3 AND kind=$4 AND revision=$5 FOR UPDATE`,
        [access.companyId, source.system, source.identity, source.kind, source.revision],
      )
    ).rows[0]!;
    if (row.payload_digest !== hash) throw new AccessError('SOURCE_PAYLOAD_CONFLICT', 409);
    return { id: row.id, duplicate: !inserted.rowCount };
  }
  /** Create with the owning master record in one transaction; never a public creation route. */
  async createResource(family: JournalFamily, id: string, fixture = false): Promise<void> {
    this.uow.lockOrder(resourceClass[family], resourceKey(family, id));
    await this.uow.client.query(
      `INSERT INTO kernel.resource(company_id,id,family,fixture) VALUES($1,$2,$3,$4)
      ON CONFLICT(company_id,id,family) DO NOTHING`,
      [this.uow.access.companyId, id, family, fixture],
    );
  }
  async lock(family: JournalFamily, id: string, expectedVersion?: number) {
    this.uow.lockOrder(resourceClass[family], resourceKey(family, id));
    const row = (
      await this.uow.client.query<{ version: number; fixture: boolean }>(
        'SELECT version,fixture FROM kernel.resource WHERE company_id=$1 AND id=$2 AND family=$3 FOR UPDATE',
        [this.uow.access.companyId, id, family],
      )
    ).rows[0];
    if (!row) throw new AccessError('NOT_FOUND', 404);
    if (expectedVersion !== undefined && row.version !== expectedVersion)
      throw new AccessError('REVISION_CONFLICT', 409);
    return row;
  }
  async append(
    sourceId: string,
    commandRecordId: string,
    effects: readonly JournalEffect[],
  ): Promise<{ batchId: string; ids: string[] }> {
    const { client, access } = this.uow;
    for (const effect of effects) {
      validateEffect(effect);
      this.uow.assertBranch(effect.branchId);
      this.uow.requireLock(
        resourceClass[effect.family],
        resourceKey(effect.family, effect.subjectId),
      );
      if (effect.supersedesId) {
        const old = await client.query(
          `SELECT id FROM kernel.journal_effect WHERE company_id=$1 AND id=$2 AND family=$3 AND subject_id=$4`,
          [access.companyId, effect.supersedesId, effect.family, effect.subjectId],
        );
        if (!old.rowCount) throw new AccessError('INVALID_CORRECTION_SOURCE', 409);
      }
    }
    this.uow.lockOrder('effects', 'append');
    const batchId = randomUUID();
    await client.query(
      `INSERT INTO kernel.posting_batch(id,company_id,source_id,command_record_id,actor_id) VALUES($1,$2,$3,$4,$5)`,
      [batchId, access.companyId, sourceId, commandRecordId, access.principalId],
    );
    const ids: string[] = [];
    for (const effect of effects) {
      const id = randomUUID();
      ids.push(id);
      await client.query(
        `INSERT INTO kernel.journal_effect(id,company_id,batch_id,source_id,family,kind,subject_id,amount_minor,
        branch_id,effective_date,actor_id,supersedes_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          id,
          access.companyId,
          batchId,
          sourceId,
          effect.family,
          effect.kind,
          effect.subjectId,
          effect.amountMinor,
          effect.branchId,
          effect.effectiveDate,
          access.principalId,
          effect.supersedesId,
          effect.reason,
        ],
      );
    }
    return { batchId, ids };
  }
  async moneyBalance(accountId: string): Promise<bigint> {
    this.uow.requireLock('money', resourceKey('money', accountId));
    const rows = await this.uow.client.query<{ amount_minor: string }>(
      `SELECT amount_minor FROM kernel.journal_effect WHERE company_id=$1 AND family='money' AND subject_id=$2 ORDER BY recorded_at,id`,
      [this.uow.access.companyId, accountId],
    );
    return rows.rows.reduce((total, row) => addMinor(total, minor(row.amount_minor)), 0n);
  }
  async requireFunds(accountId: string, amount: string): Promise<void> {
    if ((await this.moneyBalance(accountId)) < minor(amount, 'positive'))
      throw new AccessError('INSUFFICIENT_FUNDS', 409);
  }
}
