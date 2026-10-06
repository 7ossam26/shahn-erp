import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  readShipment,
  returnRequest,
  returnItems,
  StockPositionRepository,
  positionKey,
  safeStockNumber,
  type IntegrationSource,
  type TransactionClient,
  type ReturnIntentRow,
} from '@shahn/database';
import {
  validateSourceConfiguration,
  validateReturnRequest,
  validateReturnTransition,
  validReturnBalances,
  validateReturnCommand,
  validateReturnCommandResult,
  type ReturnRequest,
  type ReturnTransition,
  type ReturnItem,
  type SourceEnvelope,
  type ActionResult,
} from '@shahn/contracts/tawsel';
import type { ReturnCommand } from '@shahn/contracts';
import { AccessError, cairoDate } from '@shahn/domain';
import { canonical, digest } from '../access/crypto.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { DurableWork } from '../kernel/work.js';
import { sourceWorkRegistry } from '../integration/provisioning.service.js';
import { dispatchSource } from '../dispatch/dispatch.service.js';
import { executionCycle, ExecutionDependency } from '../execution/visit-facts.service.js';
import type { OutcomeRecord } from '@shahn/contracts/execution';
import { appendAudit } from '../access/repository.js';

/** Caller owns the source lock/transaction. A read updates counters, never physical inventory. */
export async function mergeReturnRequest(
  c: TransactionClient,
  s: IntegrationSource,
  r: ReturnRequest,
) {
  if (
    !validateReturnRequest(r) ||
    r.integrationId !== s.integration_id ||
    new Set(r.items.map((i) => i.itemId)).size !== r.items.length ||
    !r.items.every(validReturnBalances)
  )
    throw new ExecutionDependency('RETURN_REQUEST_INVALID');
  const branch = (
    await c.query(
      `SELECT native_id FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='branch' AND resource_id=$3`,
      [s.company_id, s.id, r.sourceBranchId],
    )
  ).rows[0];
  const driver = (
    await c.query(
      `SELECT native_id FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='driver' AND resource_id=$3`,
      [s.company_id, s.id, r.driverId],
    )
  ).rows[0];
  if (!branch || !driver) throw new ExecutionDependency('RETURN_MAPPING_REQUIRED');
  const existing = await returnRequest(c, s.company_id, s.id, r.requestId, true);
  if (
    existing &&
    ['requestId', 'driverId', 'sourceBranchId', 'integrationId', 'roundId', 'requestedAt'].some(
      (k) => existing.original[k as keyof ReturnRequest] !== r[k as keyof ReturnRequest],
    )
  )
    throw new ExecutionDependency('RETURN_REQUEST_IDENTITY_CONFLICT');
  for (const item of [...r.items].sort((a, b) => a.itemId.localeCompare(b.itemId))) {
    const cy = await executionCycle(c, s.company_id, s.id, item.taskId, item.dispatchCycleId);
    if (
      cy.branch_id !== branch.native_id ||
      cy.source_cycle_id !== item.sourceDispatchCycleId ||
      cy.external_id !== item.externalId ||
      Number(cy.accepted_revision) < item.sourceRevision
    )
      throw new ExecutionDependency('RETURN_CYCLE_CONFLICT');
    const o = (
      await c.query<{ record: OutcomeRecord }>(
        `SELECT record FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND outcome_id=$3 AND cycle_id=$4 AND attempt_id=$5 ORDER BY revision DESC LIMIT 1`,
        [s.company_id, s.id, item.outcomeId, cy.id, item.attemptId],
      )
    ).rows[0]?.record;
    const line = o?.lines.find((l) => l.sourceLineId === item.sourceLineId);
    if (!o || !line) throw new ExecutionDependency('RETURN_OUTCOME_REQUIRED');
    if (
      o.driverId !== r.driverId ||
      o.roundId !== r.roundId ||
      line.sourceQuantity !== item.custody.sourceQuantity ||
      item.requested > line.heldReturnRequired
    )
      throw new ExecutionDependency('RETURN_OUTCOME_CONFLICT');
  }
  if (!existing)
    await c.query(
      `INSERT INTO returns.request(company_id,source_id,id,branch_id,driver_id,original,requested_at) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        s.company_id,
        s.id,
        r.requestId,
        branch.native_id,
        driver.native_id,
        JSON.stringify(r),
        r.requestedAt,
      ],
    );
  for (const i of r.items) {
    const cy = await executionCycle(c, s.company_id, s.id, i.taskId, i.dispatchCycleId);
    const old = (await returnItems(c, s.company_id, s.id, r.requestId, true)).find(
      (x) => x.id === i.itemId,
    );
    if (old) {
      const immutable = [
        'itemId',
        'taskId',
        'dispatchCycleId',
        'outcomeId',
        'attemptId',
        'sourceLineId',
        'externalId',
        'sourceDispatchCycleId',
        'sourceRevision',
        'requested',
      ] as const;
      if (immutable.some((k) => old.original[k] !== i[k]))
        throw new ExecutionDependency('RETURN_ITEM_IDENTITY_CONFLICT');
      if (i.revision < Number(old.revision)) continue;
      if (i.received < old.received || i.lost < old.lost || i.damaged < old.damaged)
        throw new ExecutionDependency('RETURN_COUNTER_REGRESSION');
      if (i.revision === Number(old.revision) && canonical(i) !== canonical(old.current_data))
        throw new ExecutionDependency('RETURN_REVISION_COLLISION');
      await c.query(
        `UPDATE returns.item SET current_data=$1,revision=$2,received=$3,lost=$4,damaged=$5,unresolved=$6 WHERE company_id=$7 AND source_id=$8 AND id=$9`,
        [
          JSON.stringify(i),
          i.revision,
          i.received,
          i.lost,
          i.damaged,
          i.unresolved,
          s.company_id,
          s.id,
          i.itemId,
        ],
      );
    } else
      await c.query(
        `INSERT INTO returns.item(company_id,source_id,id,request_id,cycle_id,shipment_id,source_line_id,original,current_data,revision,requested,received,lost,damaged,unresolved) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14)`,
        [
          s.company_id,
          s.id,
          i.itemId,
          r.requestId,
          cy.id,
          cy.shipment_id,
          i.sourceLineId,
          JSON.stringify(i),
          i.revision,
          i.requested,
          i.received,
          i.lost,
          i.damaged,
          i.unresolved,
        ],
      );
  }
  await c.query(
    `UPDATE returns.request SET checked_at=clock_timestamp() WHERE company_id=$1 AND source_id=$2 AND id=$3`,
    [s.company_id, s.id, r.requestId],
  );
}

export async function queueReturnIntent(
  pool: Pool,
  u: UnitOfWork,
  input:
    | Extract<ReturnCommand, { type: 'return.receive' }>
    | {
        requestId: string;
        branchId: string;
        observedAt: string;
        items: { itemId: string; expectedRevision: number; quantity: number }[];
      },
  recordId: string,
  disposition?: { kind: 'lost' | 'damaged'; decisionId: string },
) {
  const s = await dispatchSource(u.client, u.access.companyId),
    c = u.client;
  u.lockOrder('aggregate', 'return:' + input.requestId);
  const r = await returnRequest(c, s.company_id, s.id, input.requestId, true);
  if (!r) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(r.branch_id);
  if (r.branch_id !== input.branchId) throw new AccessError('WRONG_RETURN_BRANCH', 409);
  if (!Number.isFinite(Date.parse(input.observedAt)) || Date.parse(input.observedAt) > Date.now())
    throw new AccessError('INVALID_OBSERVATION_TIME', 400);
  const items = await returnItems(c, s.company_id, s.id, r.id, true);
  if (!input.items.length || new Set(input.items.map((x) => x.itemId)).size !== input.items.length)
    throw new AccessError('DUPLICATE_RETURN_ITEM', 400);
  for (const shipmentId of [
    ...new Set(
      items.filter((i) => input.items.some((x) => x.itemId === i.id)).map((i) => i.shipment_id),
    ),
  ].sort())
    await c.query(`SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE`, [
      s.company_id,
      shipmentId,
    ]);
  for (const selected of input.items) {
    const i = items.find((x) => x.id === selected.itemId);
    if (!i) throw new AccessError('RETURN_ITEM_NOT_FOUND', 409);
    if (Number(i.revision) !== selected.expectedRevision)
      throw new AccessError('STALE_RETURN_REVISION', 409);
    if (
      !Number.isSafeInteger(selected.quantity) ||
      selected.quantity < 1 ||
      selected.quantity > 1000000 ||
      selected.quantity > i.unresolved
    )
      throw new AccessError('EXCESS_RETURN_QUANTITY', 409);
    if (i.current_data.eligibility !== 'pending')
      throw new AccessError('RETURN_LIFECYCLE_CONFLICT', 409);
    const newest = (
      await c.query(
        `SELECT outcome_id FROM execution.outcome_fact WHERE company_id=$1 AND source_id=$2 AND cycle_id=$3 AND attempt_id=$4 ORDER BY revision DESC LIMIT 1`,
        [s.company_id, s.id, i.cycle_id, i.current_data.attemptId],
      )
    ).rows[0];
    if (newest?.outcome_id !== i.current_data.outcomeId)
      throw new AccessError('RETURN_LIFECYCLE_CONFLICT', 409);
    const inflight = await c.query(
      `SELECT 1 FROM returns.observation_line l JOIN returns.intent n ON(n.company_id,n.id)=(l.company_id,l.intent_id) WHERE l.company_id=$1 AND l.source_id=$2 AND l.item_id=$3 AND n.state='pending'`,
      [s.company_id, s.id, i.id],
    );
    if (inflight.rowCount) throw new AccessError('PENDING_RETURN_CONFIRMATION', 409);
    if (!disposition) {
      if (
        (await c.query("SELECT to_regclass('incidents.affected_item') AS relation")).rows[0]
          .relation
      ) {
        const held = Number(
          (
            await c.query<{ quantity: string }>(
              `SELECT COALESCE(sum(a.quantity),0)::text quantity FROM incidents.affected_item a LEFT JOIN incidents.disposition d ON(d.company_id,d.affected_item_id)=(a.company_id,a.id) LEFT JOIN incidents.disposition_attempt p ON(p.company_id,p.affected_item_id)=(a.company_id,a.id) LEFT JOIN returns.intent r ON(r.company_id,r.id)=(a.company_id,COALESCE(p.return_intent_id,d.return_intent_id)) WHERE a.company_id=$1 AND a.source_key=$2 AND NOT a.released AND (r.state IS NULL OR r.state<>'accepted')`,
              [s.company_id, 'shipment_line:' + i.shipment_id + ':' + i.source_line_id],
            )
          ).rows[0]!.quantity,
        );
        if (selected.quantity > i.unresolved - held)
          throw new AccessError('INCIDENT_CUSTODY_HELD', 409);
      }
      const d = (await readShipment(c, s.company_id, i.shipment_id))!,
        observation = selected as Extract<
          ReturnCommand,
          { type: 'return.receive' }
        >['items'][number];
      if (
        observation.inspection !==
        (d.fields.service === 'stored_stock' ? 'counted-pieces' : 'parcel-exterior')
      )
        throw new AccessError('INSPECTION_KIND_REQUIRED', 409);
    }
  }
  const operation = disposition ? 'return.recordDisposition' : 'return.confirmSubsetReceipt';
  if (
    !validateSourceConfiguration(s.configuration) ||
    !s.configuration.allowedOperations.includes(operation)
  )
    throw new AccessError('OPERATION_NOT_ALLOWED', 409);
  const envelope: SourceEnvelope = {
    schemaVersion: '1.0.0',
    payloadVersion: '1.0.0',
    actionId: randomUUID(),
    operationId: operation,
    context: { kind: 'integration', tenantId: s.tenant_id, integrationId: s.integration_id },
    resources: {},
    baseVersions: {},
    dependsOnActionIds: [],
    observation: { observedAt: null, clock: { quality: 'unknown' } },
    payload: {
      requestId: r.id,
      receivingBranchId: r.original.sourceBranchId,
      items: input.items.map(({ itemId, expectedRevision, quantity }) => ({
        itemId,
        expectedRevision,
        quantity,
      })),
      ...(disposition ? { disposition: disposition.kind } : {}),
    },
  };
  if (!validateReturnCommand(envelope)) throw new AccessError('INVALID_SOURCE_COMMAND', 400);
  const raw = canonical(envelope);
  if (Buffer.byteLength(raw) > 2097152) throw new AccessError('SOURCE_REQUEST_TOO_LARGE', 400);
  const work = await new DurableWork(pool, sourceWorkRegistry).enqueue(c, {
    companyId: s.company_id,
    principalId: u.access.principalId,
    commandRecordId: recordId,
    entityId: envelope.actionId,
    entityVersion: 1,
    kind: 'integration.source',
    sourceIdentity: envelope.actionId,
    payload: { sourceId: s.id, actionId: envelope.actionId },
  });
  await c.query(
    `INSERT INTO integration.source_command(company_id,source_id,action_id,command_record_id,operation_id,request_body,request_hash,work_id,authority) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'service')`,
    [s.company_id, s.id, envelope.actionId, recordId, operation, raw, digest(raw), work],
  );
  const id = randomUUID();
  await c.query(
    `INSERT INTO returns.intent(company_id,id,source_id,request_id,branch_id,command_record_id,action_id,kind,actor_id,actor_name,observed_at,decision_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      s.company_id,
      id,
      s.id,
      r.id,
      r.branch_id,
      recordId,
      envelope.actionId,
      disposition?.kind ?? 'received',
      u.access.principalId,
      u.access.displayName,
      input.observedAt,
      disposition?.decisionId ?? null,
    ],
  );
  for (const x of input.items) {
    const o = x as Extract<ReturnCommand, { type: 'return.receive' }>['items'][number];
    await c.query(
      `INSERT INTO returns.observation_line(company_id,intent_id,source_id,item_id,expected_revision,quantity,condition,inspection,suspected_shortage) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        s.company_id,
        id,
        s.id,
        x.itemId,
        x.expectedRevision,
        x.quantity,
        disposition ? null : o.condition,
        disposition ? 'disposition' : o.inspection,
        disposition ? false : o.suspectedShortage,
      ],
    );
  }
  return { entityId: id, actionId: envelope.actionId, dispatchIntentId: null };
}

/** One semantic identity for result, event and replay. Never synthesizes a source transition. */
export async function postReturnTransition(
  c: TransactionClient,
  s: IntegrationSource,
  t: ReturnTransition,
  fault?: () => void,
) {
  if (
    !validateReturnTransition(t) ||
    t.sourceReference.tenantId !== s.tenant_id ||
    t.sourceReference.integrationId !== s.integration_id ||
    t.identity.tenantId !== s.tenant_id ||
    t.identity.integrationId !== s.integration_id
  )
    throw new ExecutionDependency('RETURN_TRANSITION_INVALID');
  const r = await returnRequest(c, s.company_id, s.id, t.requestId, true);
  if (!r) throw new ExecutionDependency('RETURN_REQUEST_REQUIRED');
  const i = (await returnItems(c, s.company_id, s.id, r.id, true)).find((x) => x.id === t.itemId);
  if (!i) throw new ExecutionDependency('RETURN_ITEM_REQUIRED');
  const old = (
    await c.query(
      `SELECT fact FROM returns.transition WHERE company_id=$1 AND source_id=$2 AND id=$3`,
      [s.company_id, s.id, t.transitionId],
    )
  ).rows[0];
  if (old) {
    if (canonical(old.fact) !== canonical(t))
      throw new ExecutionDependency('RETURN_TRANSITION_COLLISION');
    return;
  }
  if (
    t.taskId !== i.original.taskId ||
    t.dispatchCycleId !== i.original.dispatchCycleId ||
    t.outcomeId !== i.original.outcomeId ||
    t.sourceLineId !== i.source_line_id ||
    t.sourceDispatchCycleId !== i.original.sourceDispatchCycleId ||
    t.sourceReference.externalId !== i.original.externalId ||
    t.sourceBranchId !== r.original.sourceBranchId
  )
    throw new ExecutionDependency('RETURN_TRANSITION_IDENTITY_CONFLICT');
  const intent = (
    await c.query<ReturnIntentRow>(
      `SELECT * FROM returns.intent WHERE company_id=$1 AND source_id=$2 AND action_id=$3 FOR UPDATE`,
      [s.company_id, s.id, t.time.actionId],
    )
  ).rows[0];
  const observation = intent
    ? (
        await c.query(
          `SELECT * FROM returns.observation_line WHERE company_id=$1 AND intent_id=$2 AND item_id=$3`,
          [s.company_id, intent.id, i.id],
        )
      ).rows[0]
    : null;
  if (
    intent &&
    (!observation ||
      intent.kind !== t.kind ||
      observation.quantity !== t.quantity ||
      Number(observation.expected_revision) + 1 !== t.revision ||
      intent.request_id !== r.id)
  )
    throw new ExecutionDependency('RETURN_OBSERVATION_CONFLICT');
  const cy = await executionCycle(c, s.company_id, s.id, t.taskId, t.dispatchCycleId);
  await c.query(`SELECT id FROM dispatch.cycle WHERE company_id=$1 AND id=$2 FOR UPDATE`, [
    s.company_id,
    cy.id,
  ]);
  await c.query(`SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE`, [
    s.company_id,
    cy.shipment_id,
  ]);
  const posted = (
    await c.query(
      `SELECT COALESCE(sum(quantity),0)::int total FROM returns.transition WHERE company_id=$1 AND source_id=$2 AND item_id=$3`,
      [s.company_id, s.id, i.id],
    )
  ).rows[0].total;
  if (posted + t.quantity > i.requested)
    throw new ExecutionDependency('RETURN_CONSERVATION_CONFLICT');
  const cyclePosted = (
    await c.query(
      `SELECT COALESCE(sum(t.quantity),0)::int n FROM returns.transition t JOIN returns.item i ON(i.company_id,i.source_id,i.id)=(t.company_id,t.source_id,t.item_id) WHERE i.company_id=$1 AND i.source_id=$2 AND i.cycle_id=$3 AND i.source_line_id=$4`,
      [s.company_id, s.id, i.cycle_id, i.source_line_id],
    )
  ).rows[0].n;
  if (
    cyclePosted + t.quantity + i.current_data.custody.delivered >
    i.current_data.custody.sourceQuantity
  )
    throw new ExecutionDependency('RETURN_CYCLE_CONSERVATION_CONFLICT');
  if (t.revision > Number(i.revision) + 1)
    throw new ExecutionDependency('RETURN_PREDECESSOR_REQUIRED');
  if (t.revision <= Number(i.revision)) {
    const quantity = (
      await c.query(
        `SELECT COALESCE(sum(quantity),0)::int n FROM returns.transition WHERE company_id=$1 AND source_id=$2 AND item_id=$3 AND kind=$4`,
        [s.company_id, s.id, i.id, t.kind],
      )
    ).rows[0].n;
    if (quantity + t.quantity > i.current_data[t.kind])
      throw new ExecutionDependency('RETURN_ACCUMULATED_STATE_CONFLICT');
  }
  if (t.revision > Number(i.revision)) {
    const current: ReturnItem = structuredClone(i.current_data);
    if (t.quantity > current.unresolved)
      throw new ExecutionDependency('RETURN_CONSERVATION_CONFLICT');
    current[t.kind] += t.quantity;
    current.unresolved -= t.quantity;
    current.revision = t.revision;
    current.eligibility = current.unresolved ? 'pending' : 'settled';
    current.custody[t.kind] += t.quantity;
    current.custody.held -= t.quantity;
    if (!validReturnBalances(current))
      throw new ExecutionDependency('RETURN_CONSERVATION_CONFLICT');
    await c.query(
      `UPDATE returns.item SET current_data=$1,revision=$2,received=$3,lost=$4,damaged=$5,unresolved=$6 WHERE company_id=$7 AND source_id=$8 AND id=$9`,
      [
        JSON.stringify(current),
        current.revision,
        current.received,
        current.lost,
        current.damaged,
        current.unresolved,
        s.company_id,
        s.id,
        i.id,
      ],
    );
  }
  await c.query(
    `INSERT INTO returns.transition(company_id,source_id,id,item_id,request_id,action_id,kind,quantity,revision,fact,intent_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      s.company_id,
      s.id,
      t.transitionId,
      i.id,
      r.id,
      t.time.actionId,
      t.kind,
      t.quantity,
      t.revision,
      JSON.stringify(t),
      intent?.id ?? null,
    ],
  );
  if (t.kind === 'received') {
    const d = (await readShipment(c, s.company_id, cy.shipment_id))!;
    const originalLine = d.fields.lines.find((l) => l.id === t.sourceLineId);
    if (!originalLine) throw new ExecutionDependency('RETURN_SOURCE_LINE_REQUIRED');
    const variant = d.fields.service === 'stored_stock' ? originalLine.variantId : null;
    if (d.fields.service === 'stored_stock' && !variant)
      throw new ExecutionDependency('RETURN_VARIANT_REQUIRED');
    const condition = observation?.suspected_shortage
      ? 'uncertain'
      : (observation?.condition ?? 'uncertain');
    await c.query(
      `INSERT INTO returns.return_receipt(company_id,source_id,id,branch_id,actor_id,actor_name,accepted_at,observed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        s.company_id,
        s.id,
        t.transitionId,
        r.branch_id,
        intent?.actor_id ?? null,
        intent?.actor_name ?? null,
        t.time.recordedAt,
        intent?.observed_at ?? null,
      ],
    );
    await c.query(
      `INSERT INTO returns.return_receipt_line(company_id,id,source_id,item_id,receipt_id,shipment_id,cycle_id,source_line_id,brand_id,branch_id,variant_id,quantity,condition) VALUES($1,$2,$3,$4,$2,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        s.company_id,
        t.transitionId,
        s.id,
        i.id,
        cy.shipment_id,
        cy.id,
        t.sourceLineId,
        d.fields.brandId,
        r.branch_id,
        variant,
        t.quantity,
        condition,
      ],
    );
    if (variant) {
      const key = { branchId: r.branch_id, brandId: d.fields.brandId, variantId: variant },
        repo = new StockPositionRepository();
      const pos = (await repo.lock(c, s.company_id, [key]))[0]!;
      const stockSource = randomUUID();
      await c.query(
        `INSERT INTO inventory.stock_source(company_id,id,kind,source_system,source_identity,revision) VALUES($1,$2,'condition','tawsel-return',$3,1)`,
        [s.company_id, stockSource, s.id + ':' + t.transitionId],
      );
      const sound = condition === 'sound' ? t.quantity : 0,
        unavailable = condition === 'sound' ? 0 : t.quantity;
      await c.query(
        `INSERT INTO inventory.stock_movement(company_id,id,source_id,effect_key,branch_id,brand_id,variant_id,condition,sound_delta,unavailable_delta,actual_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          s.company_id,
          randomUUID(),
          stockSource,
          positionKey(key),
          key.branchId,
          key.brandId,
          key.variantId,
          condition,
          sound,
          unavailable,
          cairoDate(new Date(t.time.recordedAt)),
        ],
      );
      await repo.update(
        c,
        s.company_id,
        pos,
        safeStockNumber(pos.sound) + sound,
        safeStockNumber(pos.unavailable) + unavailable,
      );
    }
  }
  if (intent)
    await c.query(
      `UPDATE returns.intent n SET state='accepted',last_error=NULL WHERE company_id=$1 AND id=$2 AND NOT EXISTS(SELECT 1 FROM returns.observation_line o WHERE o.company_id=n.company_id AND o.intent_id=n.id AND NOT EXISTS(SELECT 1 FROM returns.transition t WHERE t.company_id=n.company_id AND t.intent_id=n.id AND t.item_id=o.item_id))`,
      [s.company_id, intent.id],
    );
  if (intent)
    await appendAudit(
      c,
      {
        principalId: intent.actor_id,
        displayName: intent.actor_name,
        sessionId: null,
        supportSessionId: null,
      },
      s.company_id,
      'return.' + t.kind + '.accepted',
      t.transitionId,
      intent.command_record_id,
      Number(observation.expected_revision),
      t.revision,
      {
        sourceId: s.id,
        actionId: t.time.actionId,
        requestId: r.id,
        itemId: i.id,
        quantity: t.quantity,
        sourceIdentity: t.identity,
      },
    );
  fault?.();
}

export async function applyReturnResult(
  c: TransactionClient,
  s: IntegrationSource,
  actionId: string,
  result: ActionResult | undefined,
  fault?: () => void,
) {
  if (!result) return;
  const i = (
    await c.query<ReturnIntentRow>(
      `SELECT * FROM returns.intent WHERE company_id=$1 AND source_id=$2 AND action_id=$3`,
      [s.company_id, s.id, actionId],
    )
  ).rows[0];
  if (!i) throw new ExecutionDependency('RETURN_INTENT_REQUIRED');
  if (result.receipt.businessStatus !== 'accepted') {
    await c.query(
      `UPDATE returns.intent SET state=$1,last_error=$2 WHERE company_id=$3 AND id=$4 AND state<>'accepted'`,
      [
        result.receipt.businessStatus,
        result.receipt.problem?.code ?? 'RETURN_REJECTED',
        s.company_id,
        i.id,
      ],
    );
    return;
  }
  const body = result.response?.body;
  if (
    !validateReturnCommandResult(body) ||
    body.request.requestId !== i.request_id ||
    body.transitions.some((t) => t.time.actionId !== actionId)
  )
    throw new ExecutionDependency('RETURN_ACCEPTED_DETAIL_REQUIRED');
  // Current request may already include all transitions; posting remains keyed by transition ID.
  await mergeReturnRequest(c, s, body.request);
  // Lock every affected shipment before any sorted stock position, including multi-item results.
  const items = await returnItems(c, s.company_id, s.id, i.request_id, true),
    keys = [];
  for (const cycleId of [...new Set(items.map((x) => x.cycle_id))].sort())
    await c.query(`SELECT id FROM dispatch.cycle WHERE company_id=$1 AND id=$2 FOR UPDATE`, [
      s.company_id,
      cycleId,
    ]);
  for (const id of [...new Set(items.map((x) => x.shipment_id))].sort()) {
    await c.query(`SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE`, [
      s.company_id,
      id,
    ]);
    const d = (await readShipment(c, s.company_id, id))!;
    if (d.fields.service === 'stored_stock')
      for (const line of d.fields.lines)
        if (
          line.variantId &&
          items.some((x) => x.shipment_id === id && x.source_line_id === line.id)
        )
          keys.push({
            branchId: i.branch_id,
            brandId: d.fields.brandId,
            variantId: line.variantId,
          });
  }
  await new StockPositionRepository().lock(
    c,
    s.company_id,
    keys.sort((a, b) => positionKey(a).localeCompare(positionKey(b))),
  );
  for (const t of [...body.transitions].sort(
    (a, b) => a.itemId.localeCompare(b.itemId) || a.revision - b.revision,
  ))
    await postReturnTransition(c, s, t, fault);
}
