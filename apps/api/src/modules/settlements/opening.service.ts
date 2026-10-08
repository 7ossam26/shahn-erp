import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  AccessError,
  addMinor,
  assertUniqueOpeningTargets,
  cairoDate,
  minor,
  openingSignedMinor,
  type JournalEffect,
} from '@shahn/domain';
import {
  StockPositionRepository,
  positionKey,
  safeStockNumber,
  type PositionKey,
} from '@shahn/database';
import {
  validateOpeningCommand,
  validateOpeningPrepareInput,
  type OpeningBatchDetail,
  type OpeningBatchList,
  type OpeningCommand,
  type OpeningLine,
  type OpeningPrepareInput,
  type OpeningPreview,
  type OpeningPreviewLine,
  type OpeningResult,
} from '@shahn/contracts';
import { canonical, digest } from '../access/crypto.js';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { JournalPosting } from '../kernel/journals.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { WalletService } from '../kernel/wallet.js';
import { AccountFundsService, authorizedAccount } from '../finance/accounts/service.js';
import { BrandWalletService } from '../finance/brand-wallet/wallet.service.js';
import type { PayrollClock } from '../employees/payroll-period.service.js';
import { branchName } from './framework.js';
import {
  createOpeningEntitlement,
  createSettlementObligation,
  employeeLabel,
  lockEmployeeForSettlement,
  payrollMonthBlocker,
} from './payroll-links.js';

export const openingFamily = 'settlements.opening';
export type OpeningFaultStage = 'batch' | 'money' | 'brand' | 'employee' | 'stock' | 'result';
export interface OpeningHooks {
  fault?: (stage: OpeningFaultStage) => Promise<void>;
  afterLock?: (u: UnitOfWork) => Promise<void>;
}
const pad = (n: number) => String(n).padStart(3, '0');
const isStock = (l: OpeningLine): l is Extract<OpeningLine, { quantity: number }> =>
  l.classification === 'stock_sound' || l.classification === 'stock_unavailable';
const stockKey = (l: Extract<OpeningLine, { quantity: number }>): PositionKey => ({
  branchId: l.branchId,
  brandId: l.brandId,
  variantId: l.variantId,
});
/**
 * Lock every target of one batch in the global order before reading: duplicate-target identity →
 * line sources → stock positions → brand wallets → employees → money accounts. Openings never post
 * an operating fact; each target can open once (database unique target key).
 */
async function lockBatch(
  u: UnitOfWork,
  input: OpeningPrepareInput,
  keys: string[],
  sources?: { batchId: string; recordId: string; payload: unknown },
) {
  for (const k of [...keys].sort()) {
    u.lockOrder('identity', 'opening-target:' + k);
    await u.client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,2101))`, [
      u.access.companyId + ':' + k,
    ]);
  }
  const lineSources: string[] = [];
  if (sources) {
    const posting = new JournalPosting(u);
    for (let i = 0; i < input.lines.length; i++)
      lineSources.push(
        (
          await posting.source(
            {
              system: 'opening',
              identity: `${sources.batchId}:${pad(i + 1)}`,
              kind: input.lines[i]!.classification,
              revision: '1',
            },
            { openingDate: input.openingDate, line: input.lines[i] },
          )
        ).id,
      );
  }
  const stock = input.lines.filter(isStock).map(stockKey);
  const unique = [...new Map(stock.map((k) => [positionKey(k), k])).values()].sort((a, b) =>
    positionKey(a).localeCompare(positionKey(b)),
  );
  for (const k of unique) {
    u.assertBranch(k.branchId);
    u.lockOrder('stock', positionKey(k));
  }
  const positions = await new StockPositionRepository().lock(u.client, u.access.companyId, unique);
  const brands = input.lines.flatMap((l) => ('brandId' in l && !isStock(l) ? [l.brandId] : []));
  await BrandWalletService.lock(u, brands);
  const employees = input.lines.flatMap((l) => ('employeeId' in l ? [l.employeeId] : []));
  await lockEmployeeForSettlement(u, employees);
  const accounts = input.lines.flatMap((l) => ('accountId' in l ? [l.accountId] : []));
  for (const a of accounts) await authorizedAccount(u, a);
  await new AccountFundsService(u).lock(accounts);
  return { positions, lineSources };
}
async function plan(
  u: UnitOfWork,
  input: OpeningPrepareInput,
  keys: string[],
  positions: Awaited<ReturnType<StockPositionRepository['lock']>>,
  clock?: PayrollClock,
): Promise<OpeningPreview> {
  const company = u.access.companyId,
    blockers: string[] = [],
    versions: string[] = [];
  if (input.openingDate > cairoDate(new Date())) blockers.push('FUTURE_ACTUAL_DATE');
  const existing = (
    await u.client.query<{ targetKey: string; batchReference: string }>(
      `SELECT l.target_key AS "targetKey",b.reference AS "batchReference" FROM settlements.opening_line l JOIN settlements.opening_batch b ON(b.company_id,b.id)=(l.company_id,l.batch_id)
       WHERE l.company_id=$1 AND l.target_key=ANY($2::text[]) ORDER BY l.target_key`,
      [company, keys],
    )
  ).rows;
  if (existing.length) blockers.push('DUPLICATE_OPENING_TARGET');
  const totals = {
    money: 0n,
    eligible: 0n,
    pending: 0n,
    debt: 0n,
    obligation: 0n,
    entitlement: 0n,
    stock: 0,
  };
  const lines: OpeningPreviewLine[] = [];
  for (let i = 0; i < input.lines.length; i++) {
    const l = input.lines[i]!;
    u.assertBranch(l.branchId);
    let label: string,
      ledger: OpeningPreviewLine['ledger'],
      readiness: OpeningPreviewLine['readiness'];
    if (l.classification === 'account_balance') {
      const a = await authorizedAccount(u, l.accountId);
      if (!a.branchIds.includes(l.branchId)) throw new AccessError('ACCOUNT_USAGE_FORBIDDEN');
      if (!a.active) blockers.push('ACCOUNT_INACTIVE');
      label = a.name;
      ledger = 'money';
      readiness = 'available';
      totals.money = addMinor(totals.money, minor(l.amountMinor, 'positive'));
    } else if (isStock(l)) {
      const v = (
        await u.client.query<{ label: string }>(
          `SELECT concat_ws(' · ',b.name,p.name,v.name) AS label FROM inventory.product_variant v JOIN inventory.product p ON(p.company_id,p.id)=(v.company_id,v.product_id)
           JOIN commercial.brand b ON(b.company_id,b.id)=(v.company_id,v.brand_id) WHERE v.company_id=$1 AND v.brand_id=$2 AND v.id=$3`,
          [company, l.brandId, l.variantId],
        )
      ).rows[0];
      if (!v) throw new AccessError('NOT_FOUND', 404);
      const pos = positions.find((p) => positionKey(p) === positionKey(stockKey(l)))!;
      versions.push(positionKey(pos) + '@' + pos.version);
      label = v.label;
      ledger = 'stock';
      readiness = l.classification === 'stock_sound' ? 'available' : 'unavailable';
      totals.stock += l.quantity;
      if (!Number.isSafeInteger(totals.stock)) throw new AccessError('QUANTITY_OVERFLOW', 409);
    } else if ('brandId' in l) {
      const b = (
        await u.client.query<{ name: string }>(
          'SELECT name FROM commercial.brand WHERE company_id=$1 AND id=$2',
          [company, l.brandId],
        )
      ).rows[0];
      if (!b) throw new AccessError('NOT_FOUND', 404);
      label = b.name;
      ledger = 'brand';
      const amount = minor(l.amountMinor, 'positive');
      readiness =
        l.classification === 'brand_eligible_credit'
          ? 'eligible'
          : l.classification === 'brand_pending_driver_held'
            ? 'pending'
            : 'debt';
      if (readiness === 'eligible') totals.eligible = addMinor(totals.eligible, amount);
      else if (readiness === 'pending') totals.pending = addMinor(totals.pending, amount);
      else totals.debt = addMinor(totals.debt, amount);
    } else {
      const e = await employeeLabel(u, l.employeeId);
      const m = await payrollMonthBlocker(u, l.employeeId, l.month, clock);
      if (m.blocker) blockers.push(m.blocker);
      versions.push(`employee:${l.employeeId}:${l.month}@${m.month.version}:${m.month.digest}`);
      label = `${e.name} · ${l.month}`;
      ledger = 'employee';
      const amount = minor(l.amountMinor, 'positive');
      readiness = l.classification === 'employee_obligation' ? 'obligation' : 'entitlement';
      if (readiness === 'obligation') totals.obligation = addMinor(totals.obligation, amount);
      else totals.entitlement = addMinor(totals.entitlement, amount);
    }
    lines.push({
      lineNumber: i + 1,
      classification: l.classification,
      targetKey: keys[i]!,
      label,
      branchName: branchName(u, l.branchId),
      amountMinor: isStock(l) ? null : l.amountMinor,
      quantity: isStock(l) ? l.quantity : null,
      ledger,
      readiness,
    });
  }
  const body = {
    openingDate: input.openingDate,
    lines,
    totals: {
      moneyMinor: totals.money.toString(),
      brandEligibleMinor: totals.eligible.toString(),
      brandPendingMinor: totals.pending.toString(),
      brandDebtMinor: totals.debt.toString(),
      employeeObligationMinor: totals.obligation.toString(),
      employeeEntitlementMinor: totals.entitlement.toString(),
      stockQuantity: totals.stock,
    },
    existing,
    blockers: [...new Set(blockers)],
  };
  return { ...body, digest: digest(canonical({ input: input.lines, body, versions })) };
}
/**
 * UI-OPENING-001 (ERP-D-121, ERP-R-129): optional, dated, one reviewed atomic batch. A zero-start
 * company never needs it. Brand openings distinguish eligible credit from unresolved driver-held
 * proceeds (pending, never payout-ready) and debt; employee openings distinguish obligation from
 * entitlement; stock names branch/brand/variant/condition. No revenue, cost or Excel engine.
 */
export class OpeningService {
  constructor(
    readonly pool: Pool,
    readonly hooks: OpeningHooks = {},
    readonly clock?: PayrollClock,
  ) {}
  async prepare(token: string, input: OpeningPrepareInput): Promise<OpeningPreview> {
    if (!validateOpeningPrepareInput(input)) throw new AccessError('VALIDATION_FAILED', 400);
    const keys = assertUniqueOpeningTargets(input.lines);
    return UnitOfWork.run(this.pool, token, input.companyId, 'opening', async (u) => {
      const { positions } = await lockBatch(u, input, keys);
      return plan(u, input, keys, positions, this.clock);
    });
  }
  commands() {
    const { hooks, clock } = this;
    const definition: CommandDefinition<OpeningCommand> = {
      family: openingFamily,
      kind: 'opening.confirm',
      capability: 'opening',
      authorize: async (u, value, recovery) => {
        if (recovery) {
          const ref = value as { branchIds?: unknown };
          if (!Array.isArray(ref.branchIds)) throw new AccessError('FORBIDDEN_SCOPE');
          for (const b of ref.branchIds) u.assertBranch(String(b));
          return;
        }
        if (!validateOpeningCommand(value)) throw new AccessError('VALIDATION_FAILED', 400);
        for (const l of value.lines) u.assertBranch(l.branchId);
      },
      rejectionReference: (input) => ({
        entityId: input.commandId,
        branchId: input.lines[0]!.branchId,
        branchIds: [...new Set(input.lines.map((l) => l.branchId))],
      }),
      resolve: async (u, ref) => {
        const row = (
          await u.client.query<{ result: OpeningResult }>(
            'SELECT result FROM settlements.command_outcome WHERE company_id=$1 AND command_record_id=$2',
            [u.access.companyId, ref.recordId],
          )
        ).rows[0];
        if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
        return row.result;
      },
      execute: async (u, input, recordId) => {
        if (!validateOpeningCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
        const keys = assertUniqueOpeningTargets(input.lines),
          company = u.access.companyId,
          batchId = randomUUID();
        const scope = {
          companyId: input.companyId,
          openingDate: input.openingDate,
          lines: input.lines,
        };
        const { positions, lineSources } = await lockBatch(u, scope, keys, {
          batchId,
          recordId,
          payload: input,
        });
        await hooks.afterLock?.(u);
        const preview = await plan(u, scope, keys, positions, clock);
        // A target opened meanwhile is the definite answer, independently of the reviewed digest.
        if (preview.existing.length)
          throw Object.assign(new AccessError('DUPLICATE_OPENING_TARGET', 409), {
            details: { existing: preview.existing },
          });
        if (preview.digest !== input.expectedDigest)
          throw Object.assign(new AccessError('SETTLEMENT_PREVIEW_STALE', 409), {
            details: {
              currentDigest: preview.digest,
              blockers: preview.blockers,
              existing: preview.existing,
            },
          });
        if (preview.blockers.length)
          throw Object.assign(new AccessError(preview.blockers[0]!, 409), {
            details: { blockers: preview.blockers, existing: preview.existing },
          });
        const reference = (
          await u.client.query<{ reference: string }>(
            `INSERT INTO settlements.opening_batch(company_id,id,opening_date,description,evidence,effect_digest,preview,command_record_id,actor_id,actor_name)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING reference`,
            [
              company,
              batchId,
              input.openingDate,
              input.description.trim(),
              input.evidence.trim(),
              preview.digest,
              JSON.stringify(preview),
              recordId,
              u.access.principalId,
              u.access.displayName,
            ],
          )
        ).rows[0]!.reference;
        await hooks.fault?.('batch');
        const posting = new JournalPosting(u),
          funds = new AccountFundsService(u),
          reason = `رصيد افتتاحي رقم ${reference}: ${input.description.trim()}`.slice(0, 1000);
        const resultLines: OpeningResult['lines'] = [];
        const order = (l: OpeningLine) =>
          isStock(l) ? 0 : 'brandId' in l ? 1 : 'employeeId' in l ? 2 : 3;
        const indexes = input.lines
          .map((_, i) => i)
          .sort((a, b) => order(input.lines[a]!) - order(input.lines[b]!) || a - b);
        for (const i of indexes) {
          const l = input.lines[i]!,
            sourceId = lineSources[i]!,
            line = i + 1;
          let effectId: string | null = null,
            stockSourceId: string | null = null,
            obligationId: string | null = null,
            adjustmentId: string | null = null;
          if (isStock(l)) {
            stockSourceId = randomUUID();
            await u.client.query(
              `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'adjustment','opening',$3,1)`,
              [company, stockSourceId, `${batchId}:${pad(line)}`],
            );
            const pos = (
              await new StockPositionRepository().lock(u.client, company, [stockKey(l)])
            )[0]!;
            const sound = safeStockNumber(pos.sound),
              unavailable = safeStockNumber(pos.unavailable),
              soundDelta = l.classification === 'stock_sound' ? l.quantity : 0,
              unavailableDelta = l.classification === 'stock_unavailable' ? l.quantity : 0;
            await u.client.query(
              `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,'opening',$4,$5,$6,$7,$8,$9,$10)`,
              [
                company,
                randomUUID(),
                stockSourceId,
                l.branchId,
                l.brandId,
                l.variantId,
                soundDelta ? 'sound' : 'uncertain',
                soundDelta,
                unavailableDelta,
                input.openingDate,
              ],
            );
            await new StockPositionRepository().update(
              u.client,
              company,
              pos,
              sound + soundDelta,
              unavailable + unavailableDelta,
            );
            await hooks.fault?.('stock');
          } else if (l.classification === 'account_balance') {
            const account = await funds.read(l.accountId);
            const posted = await funds.post({
              sourceId,
              recordId,
              fields: {
                accountId: l.accountId,
                branchId: l.branchId,
                currency: 'EGP',
                amountMinor: l.amountMinor,
                actualDate: input.openingDate,
                method: account.type === 'cash' ? 'cash' : 'bank_deposit',
              },
              direction: 'deposit',
              sourceKind: 'opening',
              reason,
              moneyKind: 'opening',
            });
            effectId = posted.effectId;
            await hooks.fault?.('money');
          } else if ('brandId' in l) {
            const signed = openingSignedMinor(l.classification, l.amountMinor);
            const posted = await posting.append(sourceId, recordId, [
              {
                family: 'brand',
                kind: 'opening',
                subjectId: l.brandId,
                amountMinor: signed,
                branchId: l.branchId,
                effectiveDate: input.openingDate,
                supersedesId: null,
                reason,
              },
            ]);
            effectId = posted.ids[0]!;
            // Unknown driver-held money is never defaulted to eligible cash-backed credit.
            if (l.classification !== 'brand_debt')
              await new WalletService(u, l.brandId).credit(
                effectId,
                l.classification === 'brand_eligible_credit' ? 'eligible' : 'pending',
              );
            await hooks.fault?.('brand');
          } else {
            const signed = openingSignedMinor(l.classification, l.amountMinor);
            const effect: JournalEffect = {
              family: 'employee',
              kind: 'opening',
              subjectId: l.employeeId,
              amountMinor: signed,
              branchId: l.branchId,
              effectiveDate: input.openingDate,
              supersedesId: null,
              reason,
            };
            effectId = (await posting.append(sourceId, recordId, [effect])).ids[0]!;
            const id = randomUUID();
            if (l.classification === 'employee_obligation') {
              await createSettlementObligation(u, {
                id,
                employeeId: l.employeeId,
                month: l.month,
                amountMinor: l.amountMinor,
                effectiveDate: input.openingDate,
                branchId: l.branchId,
                sourceId,
                kind: 'opening',
                label: `رصيد افتتاحي على الموظف (دفعة ${reference})`,
                clock,
              });
              obligationId = id;
            } else {
              await createOpeningEntitlement(u, {
                id,
                employeeId: l.employeeId,
                month: l.month,
                amountMinor: l.amountMinor,
                workDate: input.openingDate,
                branchId: l.branchId,
                sourceId,
                recordId,
                reason: `مستحق افتتاحي للموظف (دفعة ${reference})`,
                clock,
              });
              adjustmentId = id;
            }
            await hooks.fault?.('employee');
          }
          await u.client.query(
            `INSERT INTO settlements.opening_line(company_id,batch_id,line_number,target_kind,target_key,classification,branch_id,account_id,brand_id,employee_id,variant_id,payroll_month,
             amount_minor,quantity,source_id,effect_id,stock_source_id,employee_obligation_id,payroll_adjustment_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
            [
              company,
              batchId,
              line,
              isStock(l)
                ? 'stock'
                : 'accountId' in l
                  ? 'account'
                  : 'brandId' in l
                    ? 'brand'
                    : 'employee',
              keys[i],
              l.classification,
              l.branchId,
              'accountId' in l ? l.accountId : null,
              'brandId' in l ? l.brandId : null,
              'employeeId' in l ? l.employeeId : null,
              isStock(l) ? l.variantId : null,
              'month' in l ? l.month + '-01' : null,
              isStock(l) ? null : l.amountMinor,
              isStock(l) ? l.quantity : null,
              sourceId,
              effectId,
              stockSourceId,
              obligationId,
              adjustmentId,
            ],
          );
          resultLines.push({
            lineNumber: line,
            classification: l.classification,
            targetKey: keys[i]!,
            effectId,
            stockSourceId,
          });
        }
        resultLines.sort((a, b) => a.lineNumber - b.lineNumber);
        const result: OpeningResult = {
          commandId: input.commandId,
          batchId,
          reference,
          openingDate: input.openingDate,
          lines: resultLines,
          preview,
        };
        await u.client.query(
          'INSERT INTO settlements.command_outcome(company_id,command_record_id,result) VALUES($1,$2,$3)',
          [company, recordId, JSON.stringify(result)],
        );
        await hooks.fault?.('result');
        return {
          reply: { status: 200, body: result },
          reference: {
            recordId,
            batchId,
            branchId: input.lines[0]!.branchId,
            branchIds: [...new Set(input.lines.map((l) => l.branchId))],
          },
          entityId: batchId,
          beforeVersion: null,
          afterVersion: 1,
        };
      },
    };
    return new CommandService(this.pool, [definition]);
  }
  async confirm(token: string, input: OpeningCommand) {
    if (!validateOpeningCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
    return this.commands().execute(token, input);
  }
  recover(token: string, companyId: string, commandId: string) {
    return this.commands().recover(token, companyId, openingFamily, commandId);
  }
}
const batchColumns = `b.id,b.reference,b.opening_date::text AS "openingDate",b.description,b.evidence,
 (SELECT count(*)::int FROM settlements.opening_line l WHERE l.company_id=b.company_id AND l.batch_id=b.id) AS "lineCount",b.recorded_at AS "recordedAt",b.actor_name AS "actorName"`;
/** Batches whose every line branch is within the caller's assigned branches. */
const scoped = `NOT EXISTS(SELECT 1 FROM settlements.opening_line l WHERE l.company_id=b.company_id AND l.batch_id=b.id AND NOT l.branch_id=ANY($2::uuid[]))`;
export async function openingBatches(u: UnitOfWork): Promise<OpeningBatchList> {
  const rows = (
    await u.client.query<OpeningBatchList['items'][number] & { recordedAt: Date }>(
      `SELECT ${batchColumns} FROM settlements.opening_batch b WHERE b.company_id=$1 AND ${scoped} ORDER BY b.recorded_at DESC,b.id`,
      [u.access.companyId, u.access.assignedBranches.map((b) => b.id)],
    )
  ).rows;
  return { items: rows.map((r) => ({ ...r, recordedAt: new Date(r.recordedAt).toISOString() })) };
}
export async function openingBatchDetail(u: UnitOfWork, id: string): Promise<OpeningBatchDetail> {
  const row = (
    await u.client.query<
      OpeningBatchList['items'][number] & { recordedAt: Date; preview: OpeningPreview }
    >(
      `SELECT ${batchColumns},b.preview FROM settlements.opening_batch b WHERE b.company_id=$1 AND b.id=$3 AND ${scoped}`,
      [u.access.companyId, u.access.assignedBranches.map((b) => b.id), id],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  const lines = (
    await u.client.query<OpeningResult['lines'][number]>(
      `SELECT line_number AS "lineNumber",classification,target_key AS "targetKey",effect_id AS "effectId",stock_source_id AS "stockSourceId"
       FROM settlements.opening_line WHERE company_id=$1 AND batch_id=$2 ORDER BY line_number`,
      [u.access.companyId, id],
    )
  ).rows;
  const { preview, ...batch } = row;
  return {
    batch: { ...batch, recordedAt: new Date(batch.recordedAt).toISOString() },
    preview,
    lines,
  };
}
