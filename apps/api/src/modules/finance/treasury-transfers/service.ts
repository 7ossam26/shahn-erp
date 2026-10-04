import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError, assertCapability, minor } from '@shahn/domain';
import {
  validateTreasuryCommand,
  type TreasuryCommand,
  type TreasuryResult,
  type TreasuryTransfer,
  type TreasuryFilter,
  type TreasuryList,
  type TreasuryCatalog,
  type TreasuryScreen,
} from '@shahn/contracts';
import { UnitOfWork } from '../../kernel/unit-of-work.js';
import { JournalPosting } from '../../kernel/journals.js';
import { CommandService, type CommandDefinition } from '../../kernel/commands.js';
import { configurationLock } from '../../reference-data/service.js';
import { AccountFundsService, accountColumns } from '../accounts/service.js';

export interface TreasuryHooks {
  afterAccountLock?: () => Promise<void>;
  afterDebit?: () => Promise<void>;
  afterTransfer?: () => Promise<void>;
  afterTransit?: () => Promise<void>;
  beforeResult?: () => Promise<void>;
}
const capability = (screen: TreasuryScreen) =>
  screen === 'send' ? 'treasury.send' : 'treasury.receive';
function branch(u: UnitOfWork, id: string) {
  const b = u.access.companyBranches.find((b) => b.id === id);
  if (!b) throw new AccessError('FORBIDDEN_SCOPE');
  return b;
}
async function actualTime(u: UnitOfWork, input: string, sentAt?: string) {
  const milliseconds = Date.parse(input);
  const now = (await u.client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
  if (!Number.isFinite(milliseconds) || milliseconds > now.getTime())
    throw new AccessError('INVALID_ACTUAL_TIME', 400);
  if (sentAt && milliseconds < Date.parse(sentAt))
    throw new AccessError('RECEIPT_BEFORE_SEND', 400);
  return {
    time: new Date(milliseconds).toISOString(),
    date: (
      await u.client.query<{ date: string }>(
        "SELECT ($1::timestamptz AT TIME ZONE 'Africa/Cairo')::date::text AS date",
        [input],
      )
    ).rows[0]!.date,
  };
}
const projection = `jsonb_build_object(
 'id',t.id,'reference',t.reference::text,'state',t.state,'version',t.version,
 'sourceAccountId',t.source_account_id,'destinationAccountId',t.destination_account_id,
 'sourceBranchId',t.source_branch_id,'destinationBranchId',t.destination_branch_id,
 'sourceAccountName',t.source_account_name,'destinationAccountName',t.destination_account_name,
 'sourceBranchName',t.source_branch_name,'destinationBranchName',t.destination_branch_name,
 'amountMinor',t.amount_minor::text,'currency',t.currency,
 'transitMinor',(SELECT COALESCE(sum(x.amount_minor),0)::text FROM finance.treasury_transit_movement x WHERE x.company_id=t.company_id AND x.transfer_id=t.id),
 'actualSentAt',t.actual_sent_at,'recordedAt',t.recorded_at,'senderId',t.sender_id,'senderName',t.sender_name,
 'receipt',CASE WHEN t.state='received' THEN jsonb_build_object('actualReceivedAt',t.actual_received_at,'recordedAt',t.receipt_recorded_at,'receiverId',t.receiver_id,'receiverName',t.receiver_name) ELSE NULL END,
 'history',(SELECT jsonb_agg(jsonb_build_object('phase',x.phase,'sourceId',x.source_id,'movementId',m.id,'effectId',m.effect_id,'transitId',x.id,
 'commandRecordId',CASE WHEN x.phase='send' THEN t.send_command_record_id ELSE t.receipt_command_record_id END,
 'actorId',m.actor_id,'actorName',m.actor_name,'actualAt',CASE WHEN x.phase='send' THEN t.actual_sent_at ELSE t.actual_received_at END,'recordedAt',m.recorded_at) ORDER BY CASE WHEN x.phase='send' THEN 0 ELSE 1 END)
 FROM finance.treasury_transit_movement x JOIN finance.money_movement m ON m.company_id=x.company_id AND m.source_id=x.source_id WHERE x.company_id=t.company_id AND x.transfer_id=t.id)) AS body`;
export async function transferDetail(
  u: UnitOfWork,
  id: string,
  screen: TreasuryScreen,
): Promise<TreasuryTransfer> {
  assertCapability(u.access, capability(screen));
  const row = (
    await u.client.query<{ body: TreasuryTransfer }>(
      `SELECT ${projection} FROM finance.treasury_transfer t WHERE t.company_id=$1 AND t.id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  return row.body;
}
export async function treasuryCatalog(
  u: UnitOfWork,
  screen: TreasuryScreen,
): Promise<TreasuryCatalog> {
  assertCapability(u.access, capability(screen));
  return {
    branches: u.access.companyBranches,
    accounts:
      screen === 'receive'
        ? []
        : (
            await u.client.query<TreasuryCatalog['accounts'][number]>(
              `SELECT ${accountColumns} FROM finance.account a JOIN finance.account_balance b ON b.company_id=a.company_id AND b.account_id=a.id WHERE a.company_id=$1 ORDER BY a.name,a.id`,
              [u.access.companyId],
            )
          ).rows,
  };
}
export async function transferList(
  u: UnitOfWork,
  f: TreasuryFilter,
  screen: TreasuryScreen,
): Promise<TreasuryList> {
  assertCapability(u.access, capability(screen));
  if (f.sourceBranchId) branch(u, f.sourceBranchId);
  if (f.destinationBranchId) branch(u, f.destinationBranchId);
  if (f.from && f.to && f.from > f.to) throw new AccessError('VALIDATION_FAILED', 400);
  const time =
    f.dateBasis === 'sent'
      ? 't.actual_sent_at'
      : f.dateBasis === 'received'
        ? 't.actual_received_at'
        : 't.recorded_at';
  const predicate = `t.company_id=$1 AND ($2::uuid IS NULL OR t.source_branch_id=$2) AND ($3::uuid IS NULL OR t.destination_branch_id=$3)
   AND ($4='all' OR t.state=$4) AND ($5='' OR ($5 ~ '^[0-9]+$' AND t.reference::text=$5)
     OR ($5 !~ '^[0-9]+$' AND strpos(lower(t.source_account_name||' '||t.destination_account_name),lower($5))>0))
   AND ($6::date IS NULL OR ${time}>=($6::date::timestamp AT TIME ZONE 'Africa/Cairo'))
   AND ($7::date IS NULL OR ${time}<(($7::date+1)::timestamp AT TIME ZONE 'Africa/Cairo'))`;
  const values = [
    u.access.companyId,
    f.sourceBranchId,
    f.destinationBranchId,
    f.state,
    f.search,
    f.from,
    f.to,
  ];
  // One SQL statement keeps totals, transit and page on the same committed snapshot.
  const r = (
    await u.client.query<{ items: TreasuryTransfer[]; total: number; transitMinor: string }>(
      `WITH filtered AS (SELECT t.* FROM finance.treasury_transfer t WHERE ${predicate}), page_rows AS
   (SELECT ${projection} FROM filtered t ORDER BY t.actual_sent_at DESC,t.id DESC LIMIT $8 OFFSET $9)
   SELECT COALESCE((SELECT jsonb_agg(body) FROM page_rows),'[]'::jsonb) AS items,(SELECT count(*)::int FROM filtered) AS total,
   (SELECT COALESCE(sum(x.amount_minor),0)::text FROM finance.treasury_transit_movement x JOIN filtered t ON t.company_id=x.company_id AND t.id=x.transfer_id) AS "transitMinor"`,
      [...values, f.limit, (f.page - 1) * f.limit],
    )
  ).rows[0]!;
  return { ...r, page: f.page, limit: f.limit };
}
type Send = Extract<TreasuryCommand, { type: 'treasury.send' }>;
type Receive = Extract<TreasuryCommand, { type: 'treasury.receive' }>;
export async function sendTransfer(
  u: UnitOfWork,
  input: Send,
  recordId: string,
  hooks: TreasuryHooks = {},
): Promise<TreasuryResult> {
  assertCapability(u.access, 'treasury.send');
  if (input.companyId !== u.access.companyId) throw new AccessError('FORBIDDEN_SCOPE');
  if (!validateTreasuryCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
  const sourceBranch = branch(u, input.sourceBranchId),
    destinationBranch = branch(u, input.destinationBranchId);
  if (
    input.sourceAccountId === input.destinationAccountId ||
    input.sourceBranchId === input.destinationBranchId
  )
    throw new AccessError('SAME_TRANSFER_SCOPE', 400);
  minor(input.amountMinor, 'positive');
  const actual = await actualTime(u, input.actualSentAt);
  const journal = new JournalPosting(u),
    funds = new AccountFundsService(u, 'treasury.send');
  const semantic = {
    transferId: input.transferId,
    sourceAccountId: input.sourceAccountId,
    destinationAccountId: input.destinationAccountId,
    sourceBranchId: input.sourceBranchId,
    destinationBranchId: input.destinationBranchId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    actualSentAt: actual.time,
  };
  const source = await journal.source(
    { system: 'erp', identity: input.transferId, kind: 'treasury.send', revision: '1' },
    semantic,
  );
  u.lockOrder('aggregate', 'cash-transfer:' + input.transferId);
  const old = await u.client.query(
    'SELECT id FROM finance.treasury_transfer WHERE company_id=$1 AND id=$2 FOR UPDATE',
    [u.access.companyId, input.transferId],
  );
  if (old.rowCount)
    return {
      commandId: input.commandId,
      transferId: input.transferId,
      state: 'sent',
      version: 1,
      outcome: 'sent',
    };
  await configurationLock(u, false);
  await funds.lock([input.sourceAccountId, input.destinationAccountId]);
  await hooks.afterAccountLock?.();
  const a = await funds.read(input.sourceAccountId),
    b = await funds.read(input.destinationAccountId);
  if (a.version !== input.expectedSourceVersion || b.version !== input.expectedDestinationVersion)
    throw new AccessError('REVISION_CONFLICT', 409, Math.max(a.version, b.version));
  for (const [account, branchId] of [
    [a, input.sourceBranchId],
    [b, input.destinationBranchId],
  ] as const) {
    await funds.use({
      accountId: account.id,
      branchId,
      currency: 'EGP',
      amountMinor: input.amountMinor,
      actualDate: actual.date,
      method: account.type === 'cash' ? 'cash' : 'bank_deposit',
    });
  }
  const movement = await funds.postTransfer({
    sourceId: source.id,
    recordId,
    fields: {
      accountId: a.id,
      branchId: input.sourceBranchId,
      currency: 'EGP',
      amountMinor: input.amountMinor,
      actualDate: actual.date,
      method: a.type === 'cash' ? 'cash' : 'bank_deposit',
    },
    reason: 'تحويل أموال ' + input.transferId,
  });
  await hooks.afterDebit?.();
  await u.client.query(
    `INSERT INTO finance.treasury_transfer(company_id,id,source_account_id,destination_account_id,source_branch_id,destination_branch_id,
    source_account_name,destination_account_name,source_branch_name,destination_branch_name,amount_minor,currency,actual_sent_at,sender_id,sender_name,send_source_id,send_movement_id,send_command_record_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'EGP',$12,$13,$14,$15,$16,$17)`,
    [
      u.access.companyId,
      input.transferId,
      a.id,
      b.id,
      input.sourceBranchId,
      input.destinationBranchId,
      a.name,
      b.name,
      sourceBranch.name,
      destinationBranch.name,
      input.amountMinor,
      actual.time,
      u.access.principalId,
      u.access.displayName,
      source.id,
      movement.id,
      recordId,
    ],
  );
  await hooks.afterTransfer?.();
  await u.client.query(
    `INSERT INTO finance.treasury_transit_movement(company_id,id,transfer_id,phase,amount_minor,source_id,money_effect_id) VALUES($1,$2,$3,'send',$4,$5,$6)`,
    [
      u.access.companyId,
      randomUUID(),
      input.transferId,
      input.amountMinor,
      source.id,
      movement.effectId,
    ],
  );
  await hooks.afterTransit?.();
  for (const id of [a.id, b.id])
    await funds.registerObligation(id, 'treasury_transfer', input.transferId);
  return {
    commandId: input.commandId,
    transferId: input.transferId,
    state: 'sent',
    version: 1,
    outcome: 'sent',
  };
}
export async function receiveTransfer(
  u: UnitOfWork,
  input: Receive,
  recordId: string,
  hooks: TreasuryHooks = {},
): Promise<TreasuryResult> {
  assertCapability(u.access, 'treasury.receive');
  if (input.companyId !== u.access.companyId) throw new AccessError('FORBIDDEN_SCOPE');
  if (!validateTreasuryCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
  const journal = new JournalPosting(u),
    funds = new AccountFundsService(u, 'treasury.receive');
  const source = await journal.source(
    { system: 'erp', identity: input.transferId, kind: 'treasury.receive', revision: '1' },
    { transferId: input.transferId },
  );
  u.lockOrder('aggregate', 'cash-transfer:' + input.transferId);
  const row = (
    await u.client.query(
      'SELECT id FROM finance.treasury_transfer WHERE company_id=$1 AND id=$2 FOR UPDATE',
      [u.access.companyId, input.transferId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  const t = await transferDetail(u, input.transferId, 'receive');
  if (t.state === 'received')
    return {
      commandId: input.commandId,
      transferId: t.id,
      version: t.version,
      state: 'received',
      outcome: 'already_received',
    };
  if (input.expectedVersion !== t.version)
    throw new AccessError('REVISION_CONFLICT', 409, t.version);
  const actual = await actualTime(u, input.actualReceivedAt, t.actualSentAt);
  await configurationLock(u, false);
  await funds.lock([t.sourceAccountId, t.destinationAccountId]);
  await hooks.afterAccountLock?.();
  if (t.transitMinor !== t.amountMinor)
    throw new AccessError('TRANSFER_RECONCILIATION_REQUIRED', 409);
  const dest = await funds.read(t.destinationAccountId);
  const movement = await funds.postTransfer({
    sourceId: source.id,
    recordId,
    fields: {
      accountId: dest.id,
      branchId: t.destinationBranchId,
      currency: 'EGP',
      amountMinor: t.amountMinor,
      actualDate: actual.date,
      method: dest.type === 'cash' ? 'cash' : 'bank_deposit',
    },
    reason: 'استلام تحويل ' + t.reference,
  });
  await hooks.afterDebit?.();
  await u.client.query(
    `UPDATE finance.treasury_transfer SET state='received',version=2,actual_received_at=$3,receipt_recorded_at=clock_timestamp(),receiver_id=$4,receiver_name=$5,receipt_source_id=$6,receipt_movement_id=$7,receipt_command_record_id=$8 WHERE company_id=$1 AND id=$2`,
    [
      u.access.companyId,
      t.id,
      actual.time,
      u.access.principalId,
      u.access.displayName,
      source.id,
      movement.id,
      recordId,
    ],
  );
  await hooks.afterTransfer?.();
  await u.client.query(
    `INSERT INTO finance.treasury_transit_movement(company_id,id,transfer_id,phase,amount_minor,source_id,money_effect_id) VALUES($1,$2,$3,'receive',$4,$5,$6)`,
    [
      u.access.companyId,
      randomUUID(),
      t.id,
      (-minor(t.amountMinor, 'positive')).toString(),
      source.id,
      movement.effectId,
    ],
  );
  await hooks.afterTransit?.();
  for (const id of [t.sourceAccountId, t.destinationAccountId])
    await funds.resolveObligation(id, 'treasury_transfer', t.id);
  return {
    commandId: input.commandId,
    transferId: t.id,
    state: 'received',
    version: 2,
    outcome: 'received',
  };
}
export function treasuryCommands(pool: Pool, hooks: TreasuryHooks = {}) {
  const definitions: CommandDefinition<TreasuryCommand>[] = (
    ['treasury.send', 'treasury.receive'] as const
  ).map((kind) => ({
    kind,
    family: kind,
    capability: kind,
    authorize: async (u, value, recovery) => {
      if (!recovery && !validateTreasuryCommand(value))
        throw new AccessError('VALIDATION_FAILED', 400);
      const v = value as Record<string, unknown>;
      if (typeof v.sourceBranchId === 'string') branch(u, v.sourceBranchId);
      if (typeof v.destinationBranchId === 'string') branch(u, v.destinationBranchId);
      const funds = new AccountFundsService(u, kind);
      for (const key of ['sourceAccountId', 'destinationAccountId'])
        if (typeof v[key] === 'string') await funds.read(v[key]);
      if (!recovery && kind === 'treasury.receive')
        await transferDetail(u, String(v.transferId), 'receive');
    },
    rejectionReference: async (input) => ({
      entityId: input.transferId,
      branchId: 'sourceBranchId' in input ? input.sourceBranchId : input.transferId,
      transferId: input.transferId,
      ...(input.type === 'treasury.send'
        ? {
            sourceBranchId: input.sourceBranchId,
            destinationBranchId: input.destinationBranchId,
            sourceAccountId: input.sourceAccountId,
            destinationAccountId: input.destinationAccountId,
          }
        : {}),
    }),
    resolve: async (u, ref) => {
      const r = (
        await u.client.query<{ body: TreasuryResult }>(
          'SELECT body FROM finance.command_outcome WHERE company_id=$1 AND id=$2',
          [u.access.companyId, ref.outcomeId],
        )
      ).rows[0];
      if (!r) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
      return r.body;
    },
    execute: async (u, input, recordId) => {
      const result =
        input.type === 'treasury.send'
          ? await sendTransfer(u, input, recordId, hooks)
          : await receiveTransfer(u, input, recordId, hooks);
      const outcomeId = randomUUID();
      await u.client.query(
        'INSERT INTO finance.command_outcome(company_id,id,command_record_id,body) VALUES($1,$2,$3,$4)',
        [u.access.companyId, outcomeId, recordId, JSON.stringify(result)],
      );
      await hooks.beforeResult?.();
      return {
        reply: { status: 200, body: result },
        reference: { entityId: input.transferId, transferId: input.transferId, outcomeId },
        entityId: input.transferId,
        beforeVersion:
          input.type === 'treasury.send' ? null : result.outcome === 'already_received' ? 2 : 1,
        afterVersion: result.version,
      };
    },
  }));
  return new CommandService(pool, definitions);
}
