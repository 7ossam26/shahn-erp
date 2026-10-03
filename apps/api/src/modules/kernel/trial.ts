import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError, minor, cairoDate, type JournalEffect } from '@shahn/domain';
import { kernelOperations, type KernelCommand } from '@shahn/contracts';
import { CommandService, type CommandDefinition } from './commands.js';
import { JournalPosting } from './journals.js';
import { WalletService } from './wallet.js';
import type { UnitOfWork } from './unit-of-work.js';

export interface TrialHooks {
  afterPosting?: () => Promise<void>;
  afterWalletLock?: (uow: UnitOfWork, input: KernelCommand) => Promise<void>;
}
export function trialCommands(pool: Pool, environment: string, hooks: TrialHooks = {}) {
  if (!['development', 'test'].includes(environment)) throw new Error('KERNEL_FIXTURE_DISABLED');
  const authorize: CommandDefinition<KernelCommand>['authorize'] = async (uow, value) => {
    if (typeof value.branchId !== 'string') throw new AccessError('FORBIDDEN_SCOPE');
    uow.assertBranch(value.branchId);
  };
  const resolve = async (uow: UnitOfWork, reference: Record<string, unknown>) => {
    const row = (
      await uow.client.query<{ body: unknown }>(
        `SELECT body FROM kernel.operation_result
      WHERE company_id=$1 AND id=$2 AND branch_id=$3`,
        [uow.access.companyId, reference.resultId, reference.branchId],
      )
    ).rows[0];
    if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
    return row.body;
  };
  const definitions: CommandDefinition<KernelCommand>[] = kernelOperations.map((kind) => ({
    family: 'kernel.trial',
    kind,
    capability: 'access.users',
    authorize,
    resolve,
    rejectionReference: (input) => ({ entityId: input.brandId, branchId: input.branchId }),
    execute: async (uow, input, recordId) => {
      const posting = new JournalPosting(uow),
        wallet = new WalletService(uow, input.brandId);
      const amount = input.money ? minor(input.money.amountMinor, 'positive').toString() : null;
      const source = await posting.source(
        { system: 'kernel.fixture', identity: input.sourceId, kind: input.type, revision: '1' },
        {
          type: input.type,
          brandId: input.brandId,
          branchId: input.branchId,
          amountMinor: amount,
          coverSourceId: input.coverSourceId ?? null,
        },
      );
      const reference = (resultId: string) => ({
        resultId,
        branchId: input.branchId,
        brandId: input.brandId,
      });
      if (source.duplicate) {
        const prior = (
          await uow.client.query<{ id: string; body: Record<string, unknown> }>(
            'SELECT id,body FROM kernel.operation_result WHERE company_id=$1 AND source_id=$2',
            [uow.access.companyId, source.id],
          )
        ).rows[0];
        if (!prior) throw new Error('SOURCE_WITHOUT_RESULT');
        return {
          reply: { status: 200, body: prior.body },
          reference: reference(prior.id),
          entityId: input.brandId,
          beforeVersion: null,
          afterVersion: Number(prior.body.version),
        };
      }
      if (input.type === 'kernel.seed') {
        const exists = await uow.client.query(
          'SELECT id FROM kernel.resource WHERE company_id=$1 AND id=$2',
          [uow.access.companyId, input.brandId],
        );
        if (exists.rowCount) throw new AccessError('FIXTURE_ALREADY_EXISTS', 409);
        await posting.createResource('operating', input.brandId, true);
        await posting.lock('operating', input.brandId);
        await posting.createResource('brand', input.brandId, true);
      } else if (input.type === 'kernel.fee') await posting.lock('operating', input.brandId);
      const resource = await posting.lock('brand', input.brandId, input.expectedVersion);
      if (!resource.fixture) throw new AccessError('FIXTURE_REQUIRED', 403);
      if (input.type === 'kernel.seed') await posting.createResource('money', input.brandId, true);
      if (input.type === 'kernel.seed' || input.type === 'kernel.payout')
        await posting.lock('money', input.brandId);
      await hooks.afterWalletLock?.(uow, input);
      if (input.type === 'kernel.payout') {
        await wallet.requirePayout(amount!);
        await posting.requireFunds(input.brandId, amount!);
      }
      if (input.type === 'kernel.reserve') await wallet.reserve(source.id, amount!, false);
      let cover: string | null = null;
      if (input.coverSourceId) {
        cover =
          (
            await uow.client.query<{ id: string }>(
              `SELECT id FROM kernel.source_record WHERE company_id=$1 AND system='kernel.fixture'
          AND identity=$2 AND kind='kernel.reserve' AND revision='1'`,
              [uow.access.companyId, input.coverSourceId],
            )
          ).rows[0]?.id ?? null;
        if (!cover) throw new AccessError('COVER_NOT_FOUND', 404);
      }
      const base = {
        subjectId: input.brandId,
        branchId: input.branchId,
        effectiveDate: cairoDate(new Date()),
        supersedesId: null,
        reason: null,
      };
      const effects: JournalEffect[] =
        input.type === 'kernel.seed'
          ? [
              { ...base, family: 'brand', kind: 'opening', amountMinor: '10000' },
              { ...base, family: 'brand', kind: 'goods', amountMinor: '25000' },
              { ...base, family: 'money', kind: 'opening', amountMinor: '100000' },
            ]
          : input.type === 'kernel.fee'
            ? [
                { ...base, family: 'brand', kind: 'fee', amountMinor: '-' + amount },
                { ...base, family: 'operating', kind: 'shipping', amountMinor: amount! },
              ]
            : input.type === 'kernel.payout'
              ? [
                  { ...base, family: 'brand', kind: 'payout', amountMinor: '-' + amount },
                  { ...base, family: 'money', kind: 'payment', amountMinor: '-' + amount },
                ]
              : [];
      const posted = await posting.append(source.id, recordId, effects);
      if (input.type === 'kernel.seed') {
        await wallet.credit(posted.ids[0]!, 'eligible');
        await wallet.credit(posted.ids[1]!, 'pending');
      }
      if (input.type === 'kernel.fee') {
        await wallet.closeCover(
          cover!,
          source.id,
          posted.ids[0]!,
          'Controlled kernel fee; no real shipment',
        );
        await wallet.offsetDebits();
      }
      if (input.type === 'kernel.release')
        await wallet.closeCover(cover!, source.id, null, 'Controlled kernel release');
      if (input.type === 'kernel.payout') await wallet.payout(posted.ids[0]!, amount!);
      await hooks.afterPosting?.();
      const version = input.type === 'kernel.seed' ? 1 : resource.version + 1;
      await uow.client.query(
        `UPDATE kernel.resource SET version=$1 WHERE company_id=$2 AND id=$3 AND family='brand'`,
        [version, uow.access.companyId, input.brandId],
      );
      const resultId = randomUUID();
      const human = (
        await uow.client.query<{ reference: string }>(
          "SELECT nextval('kernel.human_reference')::text AS reference",
        )
      ).rows[0]!.reference;
      const body = {
        fixture: true,
        resultId,
        brandId: input.brandId,
        branchId: input.branchId,
        version,
        wallet: await wallet.amounts(),
        reference: human,
      };
      await uow.client.query(
        `INSERT INTO kernel.operation_result(id,company_id,source_id,branch_id,body,reference) VALUES($1,$2,$3,$4,$5,$6)`,
        [resultId, uow.access.companyId, source.id, input.branchId, JSON.stringify(body), human],
      );
      return {
        reply: { status: 200, body },
        reference: reference(resultId),
        entityId: input.brandId,
        beforeVersion: input.type === 'kernel.seed' ? null : resource.version,
        afterVersion: version,
      };
    },
  }));
  return new CommandService(pool, definitions);
}
