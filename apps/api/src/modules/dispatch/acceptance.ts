import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  readDispatchIntent,
  readDispatchItems,
  readShipment,
  StockPositionRepository,
  safeStockNumber,
  transaction,
  type TransactionClient,
  type IntegrationSource,
  type DispatchItemRow,
} from '@shahn/database';
import {
  validateIntakeTask,
  validateSenderEvent,
  type SourceEnvelope,
  type IntakeTask,
  type ActionResult,
} from '@shahn/contracts/tawsel';
import { cairoDate } from '@shahn/domain';
import { canonical } from '../access/crypto.js';
import {
  acceptanceUnitOfWork,
  lockDispatchShipments,
  enqueueIntake,
  assignmentReference,
} from './dispatch.service.js';
import { releaseStockReservation } from '../inventory/service.js';
import { assertStockPreparation } from '../inventory/stock-fulfillment.js';
import { JournalPosting } from '../kernel/journals.js';
import { lockShippingWallets, closeShippingCover } from './shipping-cover.service.js';
import type { SourceLease } from '../integration/source-command.service.js';
/** Both authenticated result reads and signed event echoes enter this semantic acceptance gate. */
export async function applyDispatchAcceptance(
  pool: Pool,
  c: TransactionClient,
  work: Pick<SourceLease, 'company_id' | 'action_id' | 'operation_id' | 'request_body'>,
  result: ActionResult | undefined,
  tasks: IntakeTask[] = [],
) {
  if (!result && !tasks.length) return true;
  const company = work.company_id,
    link = (
      await c.query<{ intent_id: string }>(
        `SELECT intent_id FROM dispatch.action WHERE company_id=$1 AND action_id=$2`,
        [company, work.action_id],
      )
    ).rows[0];
  if (!link) return true;
  if (
    (
      await c.query(
        `SELECT 1 FROM dispatch.item i JOIN dispatch.cycle cy ON(cy.company_id,cy.id)=(i.company_id,i.cycle_id) WHERE i.company_id=$1 AND i.intent_id=$2 AND cy.current_intent_id<>i.intent_id`,
        [company, link.intent_id],
      )
    ).rowCount
  )
    return true;
  const intent = (await readDispatchIntent(c, company, link.intent_id, true))!,
    items = await readDispatchItems(c, company, intent.id),
    envelope = JSON.parse(work.request_body) as SourceEnvelope;
  const recorded = new Set(
    (
      await c.query<{ cycle_id: string }>(
        'SELECT cycle_id FROM dispatch.acceptance WHERE company_id=$1 AND action_id=$2',
        [company, work.action_id],
      )
    ).rows.map((x) => x.cycle_id),
  );
  // A late result/event for an earlier action cannot overwrite a later assignment.
  const references = Array.isArray(envelope.payload.items)
    ? (envelope.payload.items as Record<string, unknown>[])
    : [envelope.payload];
  const targetItems = items.filter((x) => references.some((r) => r.externalId === x.external_id));
  if (targetItems.length && targetItems.every((x) => recorded.has(x.cycle_id))) return true;
  if (result && result.receipt.businessStatus !== 'accepted') {
    await c.query(
      `UPDATE dispatch.intent SET state=$1,last_error=$2,version=version+1 WHERE company_id=$3 AND id=$4`,
      [
        result.receipt.businessStatus,
        result.receipt.problem?.code ?? 'REMOTE_REJECTED',
        company,
        intent.id,
      ],
    );
    // A rejection does not assert that physically counted goods were returned or free cover.
    return true;
  }
  await c.query('SAVEPOINT dispatch_acceptance');
  const u = acceptanceUnitOfWork(c, intent);
  const releaseSources = new Map<string, string>();
  if (work.operation_id === 'assignment.withdraw')
    for (const item of items) {
      const task = tasks.find((t) => t.externalId === item.external_id);
      if (task && item.cover_source_id && !recorded.has(item.cycle_id))
        releaseSources.set(
          item.shipment_id,
          (
            await new JournalPosting(u).source(
              {
                system: 'dispatch',
                identity: item.cycle_id,
                kind: 'predeparture-withdrawal',
                revision: String(task.assignmentRevision),
              },
              {
                actionId: work.action_id,
                cycleId: item.cycle_id,
                assignmentRevision: task.assignmentRevision,
              },
            )
          ).id,
        );
    }
  const details = await lockDispatchShipments(
    u,
    items.map((i) => i.shipment_id),
  );
  if (releaseSources.size)
    await lockShippingWallets(
      u,
      details.map((d) => d.fields.brandId),
    );
  let mismatch =
    !!result &&
    targetItems.some(
      (i) => !recorded.has(i.cycle_id) && !tasks.some((t) => t.externalId === i.external_id),
    );
  for (const task of tasks) {
    const item = items.find(
      (i) => i.external_id === task.externalId && i.source_cycle_id === task.sourceDispatchCycleId,
    );
    if (item && recorded.has(item.cycle_id)) continue;
    const payload = envelope.payload;
    const reference = references.find((r) => r.externalId === task.externalId);
    const expectedAssignment =
      work.operation_id === 'intake.submitSnapshot'
        ? Number(item?.assignment_revision ?? 0)
        : Number(reference?.assignmentRevision);
    const expectedState =
      work.operation_id === 'intake.submitSnapshot'
        ? 'unassigned'
        : work.operation_id === 'assignment.receiveBatch'
          ? 'held'
          : work.operation_id === 'assignment.withdraw'
            ? 'withdrawn'
            : 'prepared';
    if (
      !validateIntakeTask(task) ||
      !item ||
      !reference ||
      task.sourceRevision !== item.snapshot.sourceRevision ||
      task.assignmentRevision !== expectedAssignment ||
      task.state !== expectedState ||
      canonical(task.snapshot) !== canonical(item.snapshot) ||
      (item.task_id && task.taskId !== item.task_id) ||
      (item.remote_cycle_id && task.dispatchCycleId !== item.remote_cycle_id) ||
      (['held', 'prepared'].includes(task.state) &&
        (task.driverExternalId !== String(payload.driverExternalId) ||
          task.driverId !== intent.driver_resource_id)) ||
      (task.state === 'held' && !task.receivedAt)
    ) {
      mismatch = true;
      continue;
    }
    const inserted = await c.query(
      `INSERT INTO dispatch.acceptance(company_id,cycle_id,action_id,operation_id,source_revision,assignment_revision,task) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING cycle_id`,
      [
        company,
        item.cycle_id,
        work.action_id,
        work.operation_id,
        task.sourceRevision,
        task.assignmentRevision,
        JSON.stringify(task),
      ],
    );
    if (!inserted.rowCount) continue;
    if (task.assignmentRevision < Number(item.assignment_revision)) continue; // Retained older echoes cannot regress current custody.
    await c.query(
      `UPDATE dispatch.cycle SET task_id=$1,remote_cycle_id=$2,accepted_revision=$3,pending_revision=NULL,assignment_revision=$4,task=$5 WHERE company_id=$6 AND id=$7`,
      [
        task.taskId,
        task.dispatchCycleId,
        task.sourceRevision,
        task.assignmentRevision,
        JSON.stringify(task),
        company,
        item.cycle_id,
      ],
    );
    if (work.operation_id === 'intake.submitSnapshot')
      await c.query(
        `UPDATE shipments.shipment SET source_state='integrated',version=version+1 WHERE company_id=$1 AND id=$2 AND source_state='local'`,
        [company, item.shipment_id],
      );
    if (task.state === 'withdrawn') {
      if (item.cover_source_id)
        await closeShippingCover(
          u,
          details.find((d) => d.id === item.shipment_id)!.fields.brandId,
          item.cover_source_id,
          releaseSources.get(item.shipment_id)!,
          null,
          'Accepted predeparture withdrawal; goods remained at branch',
        );
      await c.query(
        `DELETE FROM shipments.parcel_claim WHERE company_id=$1 AND shipment_id=$2 AND kind='dispatch' AND owner_id=$3`,
        [company, item.shipment_id, intent.id],
      );
    }
    if (task.state === 'held') {
      const d = (await readShipment(c, company, item.shipment_id))!;
      await assertStockPreparation(u, d);
      const effect = await c.query(
        `INSERT INTO dispatch.custody_effect(company_id,cycle_id,assignment_revision,action_id,shipment_id,driver_id,received_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING cycle_id`,
        [
          company,
          item.cycle_id,
          task.assignmentRevision,
          work.action_id,
          item.shipment_id,
          intent.driver_id,
          task.receivedAt,
        ],
      );
      if (effect.rowCount) {
        if (d.handedOver) throw Error('DISPATCH_CUSTODY_CONFLICT');
        const source = randomUUID();
        await c.query(
          `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'order','dispatch',$3,$4)`,
          [company, source, item.cycle_id, task.assignmentRevision],
        );
        for (const a of d.stock.allocations.filter((a) => a.active)) {
          const key = { branchId: a.branchId, brandId: d.fields.brandId, variantId: a.variantId },
            repo = new StockPositionRepository(),
            pos = (await repo.lock(c, company, [key]))[0]!;
          const sound = safeStockNumber(pos.sound) - a.quantity;
          if (sound < 0) throw Error('DISPATCH_STOCK_RECONCILIATION_REQUIRED');
          await releaseStockReservation(u, key, a.reservationId, source);
          await c.query(
            `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,$4,$5,$6,$7,'sound',$8,0,$9)`,
            [
              company,
              randomUUID(),
              source,
              a.variantId,
              a.branchId,
              d.fields.brandId,
              a.variantId,
              -a.quantity,
              cairoDate(new Date(task.receivedAt!)),
            ],
          );
          await repo.update(c, company, pos, sound, safeStockNumber(pos.unavailable));
        }
        const moved = await c.query(
          `UPDATE shipments.parcel_custody SET holder='driver',driver_id=$1,version=version+1 WHERE company_id=$2 AND shipment_id=$3 AND holder='branch' AND branch_id=$4 RETURNING shipment_id`,
          [intent.driver_id, company, item.shipment_id, intent.branch_id],
        );
        if (!moved.rowCount) throw Error('DISPATCH_CUSTODY_CONFLICT');
        await c.query(
          `UPDATE shipments.shipment SET handed_over=true,version=version+1 WHERE company_id=$1 AND id=$2`,
          [company, item.shipment_id],
        );
      }
    }
  }
  if (mismatch) {
    await c.query('ROLLBACK TO SAVEPOINT dispatch_acceptance');
    await c.query(
      `UPDATE dispatch.intent SET state='review-required',last_error='AUTHORITATIVE_TASK_RECONCILIATION_REQUIRED',version=version+1 WHERE company_id=$1 AND id=$2 AND state<>'accepted'`,
      [company, intent.id],
    );
    return false;
  }
  const current = await readDispatchItems(c, company, intent.id);
  const all = (state: IntakeTask['state']) => current.every((x) => x.task?.state === state);
  if (
    intent.state === 'synchronizing' &&
    current.every((x) => Number(x.accepted_revision) === x.snapshot.sourceRevision)
  ) {
    const source = (
      await c.query<IntegrationSource>(
        'SELECT * FROM integration.source WHERE company_id=$1 AND id=$2',
        [company, intent.source_id],
      )
    ).rows[0]!;
    await enqueueIntake(pool, c, source, intent, intent.command_record_id, 'intake.prepare', {
      driverExternalId: intent.driver_external_id,
      items: current.map(assignmentReference),
    });
    await c.query(
      `UPDATE dispatch.intent SET state='preparing',version=version+1 WHERE company_id=$1 AND id=$2`,
      [company, intent.id],
    );
  } else {
    const state = all('held')
      ? 'accepted'
      : intent.state === 'withdrawing' && all('withdrawn')
        ? 'withdrawn'
        : ['preparing', 'reassigning'].includes(intent.state) && all('prepared')
          ? 'prepared'
          : null;
    if (state)
      await c.query(
        `UPDATE dispatch.intent SET state=$1,last_error=NULL,version=version+1 WHERE company_id=$2 AND id=$3 AND state<>$1`,
        [state, company, intent.id],
      );
  }
  return true;
}
/** P12 handles only its own correlated intake facts. Other execution/visit events remain P13-owned. */
export async function applyOneDispatchEvent(pool: Pool) {
  return transaction(pool, async (c) => {
    const candidate = (
      await c.query(
        `SELECT b.company_id,b.source_id,b.event_id FROM integration.inbox b JOIN dispatch.action a ON a.company_id=b.company_id AND a.action_id=(b.envelope->'correlation'->>'actionId')::uuid WHERE b.application_state='pending' AND b.pending_reason<>'P12_RECONCILIATION_REQUIRED' AND b.event_type IN ('task.snapshotAccepted','assignment.prepared','assignment.received','assignment.withdrawn','assignment.reassigned') ORDER BY b.received_at LIMIT 1`,
      )
    ).rows[0];
    if (!candidate) return false;
    await c.query('SELECT id FROM integration.source WHERE company_id=$1 AND id=$2 FOR UPDATE', [
      candidate.company_id,
      candidate.source_id,
    ]);
    const row = (
      await c.query(
        `SELECT * FROM integration.inbox WHERE company_id=$1 AND source_id=$2 AND event_id=$3 AND application_state='pending' FOR UPDATE`,
        [candidate.company_id, candidate.source_id, candidate.event_id],
      )
    ).rows[0];
    if (!row || !validateSenderEvent(row.envelope)) return false;
    const event = row.envelope,
      payload = event.payload as { actionId?: string; task?: IntakeTask };
    if (!payload.actionId || !validateIntakeTask(payload.task)) return false;
    const work = (
      await c.query<
        Pick<SourceLease, 'company_id' | 'action_id' | 'operation_id' | 'request_body'>
      >(
        'SELECT company_id,action_id,operation_id,request_body FROM integration.source_command WHERE company_id=$1 AND action_id=$2',
        [candidate.company_id, payload.actionId],
      )
    ).rows[0];
    if (!work) return false;
    const types: Record<string, string> = {
      'intake.submitSnapshot': 'task.snapshotAccepted',
      'intake.prepare': 'assignment.prepared',
      'assignment.receiveBatch': 'assignment.received',
      'assignment.withdraw': 'assignment.withdrawn',
      'assignment.reassignBeforeDeparture': 'assignment.reassigned',
    };
    const applied =
      types[work.operation_id] === event.eventType &&
      (await applyDispatchAcceptance(pool, c, work, undefined, [payload.task]));
    if (!applied) {
      await c.query(
        `UPDATE integration.inbox SET pending_reason='P12_RECONCILIATION_REQUIRED' WHERE company_id=$1 AND source_id=$2 AND event_id=$3`,
        [candidate.company_id, candidate.source_id, candidate.event_id],
      );
      return true;
    }
    await c.query(
      `UPDATE integration.inbox SET application_state='applied',applied_at=clock_timestamp(),pending_reason='' WHERE company_id=$1 AND source_id=$2 AND event_id=$3`,
      [candidate.company_id, candidate.source_id, candidate.event_id],
    );
    // Do not advance through earlier unhandled events; P13 owns the broader projection checkpoint.
    return true;
  });
}
export type { DispatchItemRow };
