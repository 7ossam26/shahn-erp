import { randomUUID } from 'node:crypto';
import {
  employeeClock,
  lockPayrollControl,
  type TransactionClient,
  type DispatchIntentRow,
} from '@shahn/database';
import type { DispatchPrice } from '@shahn/contracts';
import type { NormalizedExecutionEvent, OutcomeRecord } from '@shahn/contracts/execution';
import { cairoDate, commissionPerVisit, minor, type JournalEffect } from '@shahn/domain';
import { acceptanceUnitOfWork } from '../dispatch/dispatch.service.js';
import { JournalPosting } from '../kernel/journals.js';
import { WalletService } from '../kernel/wallet.js';
import { resolveEmployeeTermsAt } from '../employees/service.js';

export interface ExecutionCycle {
  company_id: string;
  source_id: string;
  id: string;
  shipment_id: string;
  task_id: string;
  remote_cycle_id: string;
  branch_id: string;
  accepted_revision: string;
  assignment_revision: string;
  external_id: string;
  source_cycle_id: string;
  price: DispatchPrice;
  brand_id: string;
  cover_source_id: string | null;
  intent: DispatchIntentRow;
}
export class ExecutionDependency extends Error {}
export async function executionCycle(
  c: TransactionClient,
  company: string,
  source: string,
  task: string,
  remoteCycle?: string | null,
) {
  const row = (
    await c.query<ExecutionCycle>(
      `SELECT cy.*,i.price,i.cover_source_id,s.brand_id,row_to_json(d) AS intent FROM dispatch.cycle cy
     JOIN dispatch.item i ON(i.company_id,i.cycle_id,i.intent_id)=(cy.company_id,cy.id,cy.current_intent_id)
     JOIN dispatch.intent d ON(d.company_id,d.id)=(cy.company_id,cy.current_intent_id)
     JOIN shipments.shipment s ON(s.company_id,s.id)=(cy.company_id,cy.shipment_id)
     WHERE cy.company_id=$1 AND cy.source_id=$2 AND cy.task_id=$3 AND ($4::uuid IS NULL AND cy.latest OR cy.remote_cycle_id=$4)`,
      [company, source, task, remoteCycle ?? null],
    )
  ).rows[0];
  if (!row || Number(row.accepted_revision) < 1 || !row.remote_cycle_id)
    throw new ExecutionDependency('ACCEPTED_CYCLE_REQUIRED');
  return row;
}
export function commercialAllocation(price: DispatchPrice, outcome: OutcomeRecord) {
  const tariff = minor(price.tariffMinor, 'nonnegative'),
    waiver = minor(price.waiverMinor, 'nonnegative');
  const shipping = BigInt(outcome.collection.shipping.amountMinor),
    goods = BigInt(outcome.collection.goods.amountMinor);
  if (
    waiver > tariff ||
    shipping > tariff - waiver ||
    goods > minor(price.goodsDueMinor, 'nonnegative')
  )
    throw new ExecutionDependency('OUTCOME_PRICE_CONFLICT');
  if (
    outcome.collection.reported !== null &&
    BigInt(outcome.collection.reported.amountMinor) !== goods + shipping
  )
    throw new ExecutionDependency('OUTCOME_COLLECTION_CONFLICT');
  if (outcome.collection.reported === null && (goods !== 0n || shipping !== 0n))
    throw new ExecutionDependency('OUTCOME_COLLECTION_CONFLICT');
  if (!['full', 'partial'].includes(outcome.outcome) && goods !== 0n)
    throw new ExecutionDependency('OUTCOME_GOODS_CONFLICT');
  return { goods: goods.toString(), fee: (tariff - waiver - shipping).toString() };
}
/** Caller holds the integration source and recipient stream locks. All effects use this client. */
export type AcceptedExecutionEvidence = Pick<
  NormalizedExecutionEvent,
  'type' | 'outcome' | 'correction' | 'attemptId' | 'driverId' | 'roundId' | 'time'
> & { event: { eventId: string | null; payload: Record<string, unknown> }; evidenceId?: string };
export async function applyVisitAndOutcome(
  c: TransactionClient,
  cy: ExecutionCycle,
  n: AcceptedExecutionEvidence,
  round: { workdayId: string },
  failAfterPosting?: () => void,
) {
  const company = cy.company_id,
    source = cy.source_id,
    outcome = n.outcome;
  const attempt = n.attemptId!,
    driverSource = n.driverId!;
  const driver = (
    await c.query<{ native_id: string }>(
      `SELECT native_id FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='driver' AND resource_id=$3 AND accepted_revision>0`,
      [company, source, driverSource],
    )
  ).rows[0];
  if (!driver) throw new ExecutionDependency('DRIVER_MAPPING_REQUIRED');
  if (outcome) {
    if (
      outcome.kind !== 'company' ||
      outcome.dispatchCycleId !== cy.remote_cycle_id ||
      outcome.sourceDispatchCycleId !== cy.source_cycle_id ||
      outcome.sourceReference?.externalId !== cy.external_id ||
      outcome.sourceRevision !== Number(cy.accepted_revision) ||
      outcome.assignmentRevision > Number(cy.assignment_revision)
    )
      throw new ExecutionDependency('OUTCOME_ACCEPTED_SNAPSHOT_REQUIRED');
    const branch = (
      await c.query(
        `SELECT 1 FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='branch' AND native_id=$3 AND resource_id=$4`,
        [company, source, cy.branch_id, outcome.branchId],
      )
    ).rowCount;
    if (!branch) throw new ExecutionDependency('BRANCH_MAPPING_REQUIRED');
    const snapshot = (
      await c.query<{
        snapshot: {
          lines: { sourceLineId: string; quantity: number; unitDue: { amountMinor: number } }[];
        };
      }>(
        `SELECT snapshot FROM dispatch.item WHERE company_id=$1 AND cycle_id=$2 AND intent_id=$3`,
        [company, cy.id, cy.intent.id],
      )
    ).rows[0]!.snapshot;
    if (
      outcome.lines.length !== snapshot.lines.length ||
      new Set(outcome.lines.map((x) => x.sourceLineId)).size !== outcome.lines.length ||
      outcome.lines.some((l) => {
        const s = snapshot.lines.find((x) => x.sourceLineId === l.sourceLineId);
        return (
          !s ||
          s.quantity !== l.sourceQuantity ||
          s.unitDue.amountMinor !== l.unitDue.amountMinor ||
          l.delivered + l.heldReturnRequired > s.quantity
        );
      })
    )
      throw new ExecutionDependency('OUTCOME_LINE_CONFLICT');
    const lineGoods = outcome.lines.reduce(
      (sum, l) => sum + BigInt(l.delivered) * BigInt(l.unitDue.amountMinor),
      0n,
    );
    if (lineGoods !== BigInt(outcome.collection.goods.amountMinor))
      throw new ExecutionDependency('OUTCOME_GOODS_CONFLICT');
    commercialAllocation(cy.price, outcome);
    if (n.correction) {
      const physical = await c.query(
        `SELECT 1 FROM returns.transition t JOIN returns.item i ON(i.company_id,i.source_id,i.id)=(t.company_id,t.source_id,t.item_id) WHERE i.company_id=$1 AND i.source_id=$2 AND i.cycle_id=$3 AND i.original->>'attemptId'=$4 LIMIT 1`,
        [company, source, cy.id, attempt],
      );
      if (
        physical.rowCount &&
        !(
          await c.query(
            `SELECT 1 FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND outcome_id=$3 AND revision=$4 AND record=$5::jsonb`,
            [company, source, outcome.outcomeId, outcome.revision, JSON.stringify(outcome)],
          )
        ).rowCount
      )
        throw new ExecutionDependency('CORRECTION_AFTER_RETURN_REQUIRES_REVIEW');
      const prior = (
        await c.query<{ record: OutcomeRecord }>(
          `SELECT record FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND outcome_id=$3 AND revision=$4`,
          [company, source, n.correction.previousOutcomeId, n.correction.previousRevision],
        )
      ).rows[0];
      if (!prior) throw new ExecutionDependency('PREDECESSOR_OUTCOME_REQUIRED');
      if (
        prior.record.taskId !== outcome.taskId ||
        prior.record.attemptId !== outcome.attemptId ||
        JSON.stringify(prior.record) !== JSON.stringify(n.event.payload.previousOutcome)
      ) {
        // JSONB key order is not transport order; structural comparison is done below in SQL.
        const equal = (
          await c.query(
            `SELECT 1 FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND outcome_id=$3 AND revision=$4 AND record=$5::jsonb`,
            [
              company,
              source,
              n.correction.previousOutcomeId,
              n.correction.previousRevision,
              JSON.stringify(n.event.payload.previousOutcome),
            ],
          )
        ).rowCount;
        if (!equal) throw new ExecutionDependency('PREDECESSOR_OUTCOME_CONFLICT');
      }
    }
  }
  const oldVisit = (
    await c.query<{ id: string; work_at: Date; source_driver_id: string }>(
      `SELECT * FROM execution.visit_fact WHERE company_id=$1 AND source_id=$2 AND task_id=$3 AND dispatch_cycle_id=$4 AND attempt_id=$5`,
      [company, source, cy.task_id, cy.remote_cycle_id, attempt],
    )
  ).rows[0];
  if (oldVisit && oldVisit.source_driver_id !== driverSource)
    throw new ExecutionDependency('VISIT_DRIVER_CONFLICT');
  const arrival = n.type === 'current.arrivalRecorded' ? n.time : outcome?.arrival;
  const visitId = oldVisit?.id ?? (arrival ? randomUUID() : null);
  const u = acceptanceUnitOfWork(c, cy.intent),
    posting = new JournalPosting(u);
  const identity = [source, cy.task_id, cy.remote_cycle_id, attempt].join(':');
  // Both identities precede aggregate/wallet/employee locks, in canonical key order.
  const allocationSource =
    outcome && visitId
      ? await posting.source(
          { system: 'execution', identity, kind: 'outcome', revision: String(outcome.revision) },
          outcome,
        )
      : null;
  const visitSource =
    !oldVisit && arrival
      ? await posting.source(
          { system: 'execution', identity, kind: 'visit', revision: '1' },
          {
            taskId: cy.task_id,
            cycleId: cy.remote_cycle_id,
            attemptId: attempt,
            driverId: driverSource,
            arrival,
          },
        )
      : null;
  if (outcome) {
    await c.query(
      `INSERT INTO execution.outcome_fact(company_id,source_id,outcome_id,revision,task_id,cycle_id,attempt_id,round_id,previous_outcome_id,previous_revision,correction_id,record,event_id,evidence_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT DO NOTHING`,
      [
        company,
        source,
        outcome.outcomeId,
        outcome.revision,
        cy.task_id,
        cy.id,
        attempt,
        outcome.roundId,
        n.correction?.previousOutcomeId ?? null,
        n.correction?.previousRevision ?? null,
        n.correction?.correctionId ?? null,
        JSON.stringify(outcome),
        n.event.eventId,
        n.evidenceId ?? null,
      ],
    );
    const exact = (
      await c.query(
        `SELECT 1 FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND outcome_id=$3 AND revision=$4 AND record=$5::jsonb`,
        [company, source, outcome.outcomeId, outcome.revision, JSON.stringify(outcome)],
      )
    ).rowCount;
    if (!exact) throw new ExecutionDependency('OUTCOME_IDENTITY_CONFLICT');
    const money = outcome.collection;
    await c.query(
      `INSERT INTO execution.reported_money_fact VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [
        company,
        source,
        outcome.outcomeId,
        outcome.revision,
        money.reported?.amountMinor ?? null,
        money.goods.amountMinor,
        money.shipping.amountMinor,
        money.unpaidShipping.amountMinor,
        money.shippingStatus,
        JSON.stringify(money),
      ],
    );
  }
  if (!visitId) return; // Preserve financial basis awaiting accepted visit evidence.
  if (visitSource) await posting.createResource('operating', visitId);
  await posting.lock('brand', cy.brand_id);
  const wallet = new WalletService(u, cy.brand_id);
  const workAt = oldVisit?.work_at ?? new Date(arrival!.recordedAt);
  const effects: JournalEffect[] = [];
  const effect = (
    family: JournalEffect['family'],
    kind: string,
    subjectId: string,
    amount: string,
    supersedesId: string | null = null,
  ): JournalEffect =>
    ({
      family,
      kind,
      subjectId,
      amountMinor: amount,
      branchId: cy.branch_id,
      effectiveDate: cairoDate(workAt),
      supersedesId,
      reason: supersedesId ? 'Accepted Tawsel outcome correction' : null,
    }) as JournalEffect;
  if (visitSource) {
    await c.query(
      `INSERT INTO execution.visit_fact(company_id,source_id,id,task_id,cycle_id,dispatch_cycle_id,attempt_id,round_id,workday_id,driver_id,source_driver_id,branch_id,shipment_id,brand_id,action_id,arrival,work_at,price,source_record_id,event_id,evidence_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        company,
        source,
        visitId,
        cy.task_id,
        cy.id,
        cy.remote_cycle_id,
        attempt,
        n.roundId,
        round.workdayId,
        driver.native_id,
        driverSource,
        cy.branch_id,
        cy.shipment_id,
        cy.brand_id,
        arrival!.actionId,
        JSON.stringify(arrival),
        workAt,
        JSON.stringify(cy.price),
        visitSource.id,
        n.event.eventId,
        n.evidenceId ?? null,
      ],
    );
    if (minor(cy.price.tariffMinor) > 0n)
      effects.push(effect('operating', 'shipping', visitId, cy.price.tariffMinor));
    if (minor(cy.price.waiverMinor) > 0n)
      effects.push(
        effect('operating', 'waiver', visitId, (-minor(cy.price.waiverMinor)).toString()),
      );
    u.lockOrder('employee', '0:company:' + company);
    const resolution = await resolveEmployeeTermsAt(c, company, driver.native_id, workAt, {
      acceptWork: true,
    });
    const amount =
      resolution.status === 'resolved'
        ? commissionPerVisit(cy.price.baseShippingMinor, resolution.commission)
        : null;
    if (resolution.status === 'resolved') await posting.lock('employee', resolution.employeeId);
    let payrollProtected = false;
    if (resolution.status === 'resolved' && amount !== '0') {
      const month = cairoDate(workAt).slice(0, 7),
        clock = await employeeClock(c),
        control = await lockPayrollControl(c, company, resolution.employeeId, month);
      payrollProtected = month < clock.month || control.state !== 'editable_unpaid';
    }
    const earningIndex = effects.length;
    if (resolution.status === 'resolved' && amount !== '0' && !payrollProtected)
      effects.push(effect('employee', 'earning', resolution.employeeId, amount!));
    const posted = effects.length
      ? await posting.append(visitSource.id, cy.intent.command_record_id, effects)
      : null;
    await c.query(
      `INSERT INTO execution.earning_basis(company_id,visit_id,resolution,amount_minor,journal_effect_id) VALUES($1,$2,$3,$4,$5)`,
      [
        company,
        visitId,
        JSON.stringify(
          payrollProtected
            ? { status: 'unresolved', reason: 'protected_payroll_period', captured: resolution }
            : resolution,
        ),
        amount,
        posted?.ids[earningIndex] ?? null,
      ],
    );
  }
  // Allocation reuses the already-held brand lock and the same UnitOfWork/client.
  if (outcome && allocationSource && !allocationSource.duplicate) {
    const previous = (
      await c.query<{
        outcome_revision: string;
        goods_minor: string;
        brand_fee_minor: string;
        goods_effect_id: string | null;
        fee_effect_id: string | null;
      }>(
        `SELECT * FROM execution.allocation WHERE company_id=$1 AND visit_id=$2 ORDER BY outcome_revision DESC LIMIT 1`,
        [company, visitId],
      )
    ).rows[0];
    if (previous && Number(previous.outcome_revision) >= outcome.revision) return;
    const basis = commercialAllocation(cy.price, outcome);
    const protectedRow = (
      await c.query(
        `SELECT 1 FROM execution.protected_basis WHERE company_id=$1 AND visit_id=$2 UNION ALL SELECT 1 FROM kernel.credit_release WHERE company_id=$1 AND lot_id=$3`,
        [company, visitId, previous?.goods_effect_id ?? null],
      )
    ).rowCount;
    const remittedRound = (
      await c.query<{ id: string }>(
        `SELECT id FROM finance.remittance WHERE company_id=$1 AND source_id=$2 AND round_id=$3`,
        [company, source, outcome.roundId],
      )
    ).rows[0];
    if ((n.correction && protectedRow) || remittedRound) {
      await c.query(
        `INSERT INTO execution.settlement_review(company_id,id,source_id,correction_id,visit_id,basis) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [
          company,
          randomUUID(),
          source,
          n.correction?.correctionId ?? outcome.outcomeId,
          visitId,
          JSON.stringify({
            previous,
            basis,
            outcome,
            remittanceId: remittedRound?.id ?? null,
            reason: n.correction
              ? 'Accepted outcome correction conflicts with protected settlement'
              : 'Later received evidence after company receipt',
          }),
        ],
      );
      if (previous?.goods_effect_id) {
        const lot = (
          await c.query<{ remaining: string }>(
            `SELECT (l.amount_minor-COALESCE((SELECT sum(amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=l.company_id AND a.lot_id=l.id),0)-COALESCE((SELECT sum(amount_minor) FROM kernel.wallet_hold h WHERE h.company_id=l.company_id AND h.lot_id=l.id AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id)),0))::text AS remaining FROM kernel.credit_lot l WHERE company_id=$1 AND id=$2 AND (readiness='eligible' OR EXISTS(SELECT 1 FROM kernel.credit_release cr WHERE cr.company_id=l.company_id AND cr.lot_id=l.id))`,
            [company, previous.goods_effect_id],
          )
        ).rows[0];
        if (lot && BigInt(lot.remaining) > 0n)
          await wallet.hold(
            previous.goods_effect_id,
            allocationSource.id,
            lot.remaining,
            'Accepted correction requires linked settlement review',
          );
      }
      return;
    }
    const allocationEffects: JournalEffect[] = [];
    const cancelGoodsIndex =
      previous?.goods_effect_id && BigInt(previous.goods_minor) > 0n
        ? allocationEffects.length
        : -1;
    if (cancelGoodsIndex >= 0)
      allocationEffects.push(
        effect(
          'brand',
          'correction',
          cy.brand_id,
          (-BigInt(previous!.goods_minor)).toString(),
          previous!.goods_effect_id,
        ),
      );
    const cancelFeeIndex =
      previous?.fee_effect_id && BigInt(previous.brand_fee_minor) > 0n
        ? allocationEffects.length
        : -1;
    if (cancelFeeIndex >= 0)
      allocationEffects.push(
        effect(
          'brand',
          'correction',
          cy.brand_id,
          previous!.brand_fee_minor,
          previous!.fee_effect_id,
        ),
      );
    const goodsIndex = BigInt(basis.goods) > 0n ? allocationEffects.length : -1;
    if (goodsIndex >= 0) allocationEffects.push(effect('brand', 'goods', cy.brand_id, basis.goods));
    const feeIndex = BigInt(basis.fee) > 0n ? allocationEffects.length : -1;
    if (feeIndex >= 0)
      allocationEffects.push(effect('brand', 'fee', cy.brand_id, (-BigInt(basis.fee)).toString()));
    const posted = allocationEffects.length
      ? await posting.append(allocationSource.id, cy.intent.command_record_id, allocationEffects)
      : null;
    const goodsEffect = goodsIndex >= 0 ? posted!.ids[goodsIndex]! : null,
      feeEffect = feeIndex >= 0 ? posted!.ids[feeIndex]! : null;
    if (cancelGoodsIndex >= 0)
      await wallet.cancelPendingCredit(
        previous!.goods_effect_id!,
        posted!.ids[cancelGoodsIndex]!,
        previous!.goods_minor,
      );
    if (cancelFeeIndex >= 0) {
      await wallet.credit(posted!.ids[cancelFeeIndex]!, 'eligible');
      await wallet.offsetDebits();
    }
    if (goodsEffect) await wallet.credit(goodsEffect, 'pending');
    await c.query(
      `INSERT INTO execution.allocation(company_id,visit_id,outcome_id,outcome_revision,source_record_id,goods_minor,brand_fee_minor,goods_effect_id,fee_effect_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        company,
        visitId,
        outcome.outcomeId,
        outcome.revision,
        allocationSource.id,
        basis.goods,
        basis.fee,
        goodsEffect,
        feeEffect,
      ],
    );
    if (
      cy.cover_source_id &&
      !(
        await c.query(
          `SELECT 1 FROM kernel.cover_close x JOIN kernel.shipping_cover s ON(s.company_id,s.id)=(x.company_id,x.cover_id) WHERE s.company_id=$1 AND s.source_id=$2`,
          [company, cy.cover_source_id],
        )
      ).rowCount
    )
      await wallet.closeCover(
        cy.cover_source_id,
        allocationSource.id,
        BigInt(basis.fee) > 0n ? feeEffect : null,
        'Accepted visit payer allocation',
      );
  }
  failAfterPosting?.();
}
