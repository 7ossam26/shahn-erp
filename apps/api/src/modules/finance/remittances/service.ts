import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { sourceByCompany } from '@shahn/database';
import { AccessError, addMinor, minor } from '@shahn/domain';
import {
  validateRemittanceCommand,
  type RemittanceCommand,
  type RemittanceDetail,
  type RemittanceResult,
  type RemittanceScope,
} from '@shahn/contracts';
import { canonical } from '../../access/crypto.js';
import { CommandService, type CommandDefinition } from '../../kernel/commands.js';
import type { UnitOfWork } from '../../kernel/unit-of-work.js';
import { JournalPosting } from '../../kernel/journals.js';
import { WalletService } from '../../kernel/wallet.js';
import { AccountFundsService } from '../accounts/service.js';
import { assertRoundEvidenceBasis } from '../../execution/round-evidence.service.js';
import { protectVisitBasis } from '../../execution/settlement-review.service.js';
import {
  RemittanceEvidenceService,
  authorizeRound,
  currentSources,
  readWitness,
} from './evidence.service.js';

export async function remittanceDetail(u: UnitOfWork, id: string): Promise<RemittanceDetail> {
  const r = (
    await u.client.query<RemittanceDetail & { witnessId: string }>(
      `SELECT r.id,r.reference,r.kind,r.amount_minor::text AS "amountMinor",r.company_id AS "companyId",r.driver_id AS "driverId",r.round_id AS "roundId",r.branch_id AS "branchId",r.actual_date::text AS "actualDate",r.recorded_at AS "recordedAt",r.actor_name AS "actorName",r.witness_id AS "witnessId",c.command_id AS "commandId" FROM finance.remittance r JOIN command_record c ON c.id=r.command_record_id WHERE r.company_id=$1 AND r.id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!r) throw new AccessError('NOT_FOUND', 404);
  await authorizeRound(u, r);
  const components = (
    await u.client.query(
      `SELECT c.method,c.account_id AS "accountId",c.amount_minor::text AS "amountMinor",c.reference,c.movement_id AS "movementId",m.account_name AS "accountName" FROM finance.remittance_component c JOIN finance.money_movement m ON(m.company_id,m.id)=(c.company_id,c.movement_id) WHERE c.company_id=$1 AND c.remittance_id=$2 ORDER BY c.ordinal`,
      [u.access.companyId, id],
    )
  ).rows;
  const reviews = (
    await u.client.query(
      `SELECT DISTINCT r.id,r.state,r.visit_id AS "visitId",r.created_at AS "createdAt" FROM execution.settlement_review r LEFT JOIN execution.protected_basis p ON(p.company_id,p.visit_id)=(r.company_id,r.visit_id) AND p.kind='remittance' WHERE r.company_id=$1 AND (p.reference_id=$2 OR r.basis->>'remittanceId'=$2::text) ORDER BY "createdAt",r.id`,
      [u.access.companyId, id],
    )
  ).rows;
  const { witnessId, ...detail } = r;
  return { ...detail, witness: await readWitness(u, witnessId), components, reviews };
}
export type RemittanceHooks = {
  fault?: (stage: 'coverage' | 'money' | 'release' | 'result') => Promise<void>;
};
export class RemittanceService {
  constructor(
    readonly pool: Pool,
    readonly evidence: RemittanceEvidenceService,
    readonly hooks: RemittanceHooks = {},
  ) {}
  private commands(refreshId?: string) {
    const d: CommandDefinition<RemittanceCommand> = {
      family: 'remittances',
      kind: 'remittance.confirm',
      capability: 'remittances',
      authorize: async (u, value, recovery) => {
        const v = value as unknown as RemittanceScope;
        if (!recovery && !validateRemittanceCommand(value))
          throw new AccessError('VALIDATION_FAILED', 400);
        await authorizeRound(u, v);
      },
      rejectionReference: (input) => ({
        entityId: input.roundId,
        ...input,
      }),
      resolve: async (u, ref) => {
        const r = await remittanceDetail(u, String(ref.id));
        return {
          commandId: r.commandId,
          id: r.id,
          reference: r.reference,
          kind: r.kind,
          amountMinor: r.amountMinor,
        };
      },
      execute: async (u, input, recordId) => {
        const source = await sourceByCompany(u.client, input.companyId, true);
        if (!source) throw new AccessError('SOURCE_NOT_READY', 409);
        const witness = await readWitness(u, input.witnessId);
        const refreshed = (
          await u.client.query(
            `SELECT 1 FROM finance.remittance_refresh WHERE company_id=$1 AND id=$2 AND witness_id=$3 AND actor_id=$4`,
            [input.companyId, refreshId ?? null, witness.id, u.access.principalId],
          )
        ).rowCount;
        if (
          !refreshed ||
          witness.roundId !== input.roundId ||
          witness.driverId !== input.driverId ||
          witness.branchId !== input.branchId ||
          witness.revision !== input.expectedRevision ||
          witness.digest !== input.expectedDigest ||
          witness.blockers.length
        )
          throw new AccessError('REMITTANCE_WITNESS_CHANGED', 409);
        await assertRoundEvidenceBasis(
          u,
          input.roundId,
          witness.basisRevision,
          witness.basisDigest,
        );
        const sources = await currentSources(u, source.id, input.roundId);
        if (canonical(sources) !== canonical(witness.sources))
          throw new AccessError('REMITTANCE_WITNESS_CHANGED', 409);
        if (
          (
            await u.client.query(
              `SELECT 1 FROM finance.remittance WHERE company_id=$1 AND source_id=$2 AND round_id=$3`,
              [input.companyId, source.id, input.roundId],
            )
          ).rowCount
        )
          throw new AccessError('ROUND_ALREADY_REMITTED', 409);
        const total = input.components.reduce(
          (n, c) => addMinor(n, minor(c.amountMinor, 'positive')),
          0n,
        );
        if (total !== minor(witness.expectedMinor, 'nonnegative'))
          throw new AccessError('EXACT_REMITTANCE_REQUIRED', 409);
        const today = (
          await u.client.query<{ today: string }>(
            `SELECT (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date::text AS today`,
          )
        ).rows[0]!.today;
        if (input.actualDate > today) throw new AccessError('FUTURE_PAYMENT_DATE', 400);
        const id = randomUUID(),
          posting = new JournalPosting(u);
        const native = await posting.source(
          { system: 'remittance', identity: id, kind: 'confirmation', revision: '1' },
          input,
        );
        const componentSources = [];
        for (let i = 0; i < input.components.length; i++)
          componentSources.push(
            await posting.source(
              {
                system: 'remittance',
                identity: id + ':' + String(i).padStart(3, '0'),
                kind: 'component',
                revision: '1',
              },
              input.components[i],
            ),
          );
        for (const visitId of [
          ...new Set(sources.flatMap((s) => (s.visitId ? [s.visitId] : []))),
        ].sort()) {
          u.lockOrder('aggregate', 'visit:' + visitId);
          await protectVisitBasis(u, visitId, 'remittance', id);
        }
        const brands = [...new Set(sources.map((s) => s.brandId))].sort();
        for (const brand of brands) await posting.lock('brand', brand);
        const accounts = new AccountFundsService(u);
        await accounts.lock(input.components.map((c) => c.accountId));
        const resultRow = (
          await u.client.query<{ reference: string }>(
            `INSERT INTO finance.remittance(company_id,id,source_id,round_id,driver_id,branch_id,witness_id,refresh_id,amount_minor,kind,actual_date,command_record_id,actor_id,actor_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING reference`,
            [
              input.companyId,
              id,
              source.id,
              input.roundId,
              input.driverId,
              input.branchId,
              witness.id,
              refreshId,
              witness.expectedMinor,
              total === 0n ? 'checked' : 'received',
              input.actualDate,
              recordId,
              u.access.principalId,
              u.access.displayName,
            ],
          )
        ).rows[0]!;
        for (const s of sources.filter((s) => !s.covered))
          await u.client.query(
            `INSERT INTO finance.remittance_source(company_id,remittance_id,source_id,task_id,cycle_id,attempt_id,outcome_id,outcome_revision,visit_id,reported_minor,goods_minor,shipping_minor,credit_lot_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              input.companyId,
              id,
              source.id,
              s.taskId,
              s.cycleId,
              s.attemptId,
              s.outcomeId,
              s.outcomeRevision,
              s.visitId,
              s.reportedMinor,
              s.goodsMinor,
              s.shippingMinor,
              s.creditLotId,
            ],
          );
        await this.hooks.fault?.('coverage');
        for (let i = 0; i < input.components.length; i++) {
          const c = input.components[i]!;
          const movement = await accounts.post({
            sourceId: componentSources[i]!.id,
            recordId,
            fields: {
              ...c,
              branchId: input.branchId,
              actualDate: input.actualDate,
              currency: 'EGP',
            },
            direction: 'deposit',
            sourceKind: 'remittance',
            reason: 'Full driver remittance ' + resultRow.reference,
          });
          await u.client.query(
            `INSERT INTO finance.remittance_component(company_id,remittance_id,ordinal,movement_id,method,account_id,amount_minor,reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              input.companyId,
              id,
              i,
              movement.id,
              c.method,
              c.accountId,
              c.amountMinor,
              c.reference ?? '',
            ],
          );
          await this.hooks.fault?.('money');
        }
        for (const s of sources.filter((s) => !s.covered && s.creditLotId)) {
          if (!s.reportedMinor || minor(s.reportedMinor) <= 0n)
            throw new AccessError('GOODS_CREDIT_BASIS_REQUIRED', 409);
          await new WalletService(u, s.brandId).releaseCredit(s.creditLotId!, native.id);
        }
        await this.hooks.fault?.('release');
        const result: RemittanceResult = {
          commandId: input.commandId,
          id,
          reference: resultRow.reference,
          kind: total === 0n ? 'checked' : 'received',
          amountMinor: witness.expectedMinor,
        };
        await this.hooks.fault?.('result');
        return {
          reply: { status: 200, body: result },
          reference: { ...input, id },
          entityId: id,
          beforeVersion: null,
          afterVersion: 1,
        };
      },
    };
    return new CommandService(this.pool, [d]);
  }
  recover(token: string, company: string, commandId: string) {
    return this.commands().recover(token, company, 'remittances', commandId);
  }
  async confirm(token: string, input: RemittanceCommand) {
    if (!validateRemittanceCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
    try {
      await this.recover(token, input.companyId, input.commandId);
      return this.commands().execute(token, input); // checks immutable payload even on an echo
    } catch (e) {
      if (!(e instanceof AccessError) || e.code !== 'NOT_FOUND') throw e;
    }
    const { companyId, driverId, roundId, branchId } = input;
    const refresh = await this.evidence.refresh(token, { companyId, driverId, roundId, branchId });
    return this.commands(refresh.refreshId).execute(token, input);
  }
}
