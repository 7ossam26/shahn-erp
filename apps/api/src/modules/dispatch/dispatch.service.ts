import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { AccessError, type AccessContext } from '@shahn/domain';
import {
  readShipment,
  readBrand,
  readDispatchIntent,
  readDispatchItems,
  claimParcel,
  type IntegrationSource,
  type IntegrationBinding,
  type DispatchIntentRow,
  type DispatchItemRow,
  type TransactionClient,
} from '@shahn/database';
import {
  validateDispatchCommand,
  type DispatchCommand,
  type ShipmentDetail,
} from '@shahn/contracts';
import {
  validateIntakeCommand,
  validateSourceConfiguration,
  validateIntakeTask,
  type IntakeTask,
  type SourceEnvelope,
  type AssignmentReference,
} from '@shahn/contracts/tawsel';
import { canonical, digest } from '../access/crypto.js';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { DurableWork } from '../kernel/work.js';
import { JournalPosting } from '../kernel/journals.js';
import { sourceWorkRegistry } from '../integration/provisioning.service.js';
import { lockOrderPositions, assertStockPreparation } from '../inventory/stock-fulfillment.js';
import { buildSourceSnapshot, dispatchPrice, type ApprovedShippingWaiver } from './snapshot.js';
import { lockShippingWallets, reserveShippingCover } from './shipping-cover.service.js';
export const assignmentReference = (i: DispatchItemRow): AssignmentReference => ({
  externalId: i.external_id,
  sourceDispatchCycleId: i.source_cycle_id,
  expectedSourceRevision: Number(i.accepted_revision),
  expectedAssignmentRevision: Number(i.assignment_revision),
  assignmentRevision: Number(i.assignment_revision) + 1,
});
export async function dispatchSource(c: TransactionClient, company: string) {
  const s = (
    await c.query<IntegrationSource>(
      'SELECT * FROM integration.source WHERE company_id=$1 FOR UPDATE',
      [company],
    )
  ).rows[0];
  if (
    !s?.enabled ||
    !validateSourceConfiguration(s.configuration) ||
    s.configuration.identity.tenantId !== s.tenant_id ||
    s.configuration.identity.integrationId !== s.integration_id
  )
    throw new AccessError('SOURCE_NOT_READY', 409);
  return s;
}
export async function readyBinding(
  c: TransactionClient,
  company: string,
  source: string,
  entity: 'branch' | 'driver',
  native: string,
) {
  const b = (
    await c.query<IntegrationBinding>(
      `SELECT * FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity=$3 AND native_id=$4`,
      [company, source, entity, native],
    )
  ).rows[0];
  if (
    !b?.resource_id ||
    b.enabled !== true ||
    !['ready', 'not-required'].includes(b.issuer_status) ||
    Number(b.accepted_revision) < 1 ||
    b.accepted_revision !== b.submitted_revision
  )
    throw new AccessError(entity === 'driver' ? 'DRIVER_NOT_READY' : 'BRANCH_NOT_READY', 409);
  if (
    entity === 'branch' &&
    !(
      await c.query('SELECT 1 FROM access.branch WHERE company_id=$1 AND id=$2 AND active', [
        company,
        native,
      ])
    ).rowCount
  )
    throw new AccessError('BRANCH_NOT_READY', 409);
  if (entity === 'driver') {
    const driver = (
      await c.query(
        `SELECT * FROM employees.operational_driver WHERE company_id=$1 AND id=$2 AND active AND tawsel_driver_id=$3`,
        [company, native, b.resource_id],
      )
    ).rows[0];
    if (!driver) throw new AccessError('DRIVER_NOT_READY', 409);
    // Driver mapping acceptance cannot substitute for the linked user's issuer readiness.
    const user = (
      await c.query(
        `SELECT u.* FROM integration.binding u JOIN access.ordinary_user n ON(n.company_id,n.id)=(u.company_id,u.native_id) JOIN integration.source_command sc ON sc.company_id=u.company_id AND sc.binding_id=$3 WHERE u.company_id=$1 AND u.source_id=$2 AND u.entity='user' AND u.external_id=sc.request_body::jsonb->'payload'->>'userExternalId' AND sc.state='accepted' AND n.active AND u.enabled AND u.issuer_status='ready' AND u.accepted_revision=u.submitted_revision LIMIT 1`,
        [company, source, b.id],
      )
    ).rows[0];
    if (!user) throw new AccessError('DRIVER_ISSUER_NOT_READY', 409);
  }
  return b;
}
export async function enqueueIntake(
  pool: Pool,
  c: TransactionClient,
  s: IntegrationSource,
  intent: DispatchIntentRow,
  recordId: string,
  operation: string,
  payload: Record<string, unknown>,
  shipmentId: string | null = null,
) {
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
    payload,
  };
  if (!validateIntakeCommand(envelope)) throw new AccessError('INVALID_SOURCE_COMMAND', 409);
  const workId = await new DurableWork(pool, sourceWorkRegistry).enqueue(c, {
    companyId: s.company_id,
    principalId: intent.actor_id,
    commandRecordId: recordId,
    entityId: envelope.actionId,
    entityVersion: 1,
    kind: 'integration.source',
    sourceIdentity: envelope.actionId,
    payload: { sourceId: s.id, actionId: envelope.actionId },
  });
  const raw = canonical(envelope);
  await c.query(
    `INSERT INTO integration.source_command(company_id,source_id,action_id,command_record_id,operation_id,request_body,request_hash,work_id,authority) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'service')`,
    [s.company_id, s.id, envelope.actionId, recordId, operation, raw, digest(raw), workId],
  );
  await c.query(
    `INSERT INTO dispatch.action(company_id,intent_id,action_id,shipment_id) VALUES($1,$2,$3,$4)`,
    [s.company_id, intent.id, envelope.actionId, shipmentId],
  );
  return envelope.actionId;
}
export async function lockDispatchShipments(u: UnitOfWork, ids: string[]) {
  const details: ShipmentDetail[] = [];
  for (const id of [...new Set(ids)].sort()) {
    u.lockOrder('aggregate', 'shipment:' + id);
    await u.client.query(
      'SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE',
      [u.access.companyId, id],
    );
    const d = await readShipment(u.client, u.access.companyId, id);
    if (!d) throw new AccessError('NOT_FOUND', 404);
    u.assertBranch(d.fields.branchId);
    details.push(d);
  }
  await lockOrderPositions(
    u,
    details.flatMap((d) =>
      d.stock.allocations
        .filter((a) => a.active)
        .map((a) => ({ branchId: a.branchId, brandId: d.fields.brandId, variantId: a.variantId })),
    ),
  );
  return details;
}
async function assertPhysical(u: UnitOfWork, d: ShipmentDetail, branch: string, version?: number) {
  if (version !== undefined && d.version !== version)
    throw new AccessError('REVISION_CONFLICT', 409, d.version);
  if (d.fields.branchId !== branch || d.state !== 'active' || d.handedOver)
    throw new AccessError('SHIPMENT_UNAVAILABLE', 409);
  if (d.preparation === 'awaiting_preparation') throw new AccessError('PREPARATION_REQUIRED', 409);
  const custody = (
    await u.client.query(
      `SELECT 1 FROM shipments.parcel_custody WHERE company_id=$1 AND shipment_id=$2 AND branch_id=$3 AND holder='branch'`,
      [u.access.companyId, d.id, branch],
    )
  ).rowCount;
  if (!custody) throw new AccessError('BRANCH_CUSTODY_REQUIRED', 409);
  await assertStockPreparation(u, d);
}
export async function prepareDispatch(
  pool: Pool,
  u: UnitOfWork,
  input: Extract<DispatchCommand, { type: 'dispatch.prepare' }>,
  recordId: string,
  waivers: ReadonlyMap<string, ApprovedShippingWaiver> = new Map(),
) {
  const company = u.access.companyId,
    s = await dispatchSource(u.client, company),
    id = randomUUID();
  if (new Set(input.items.map((i) => i.shipmentId)).size !== input.items.length)
    throw new AccessError('DUPLICATE_SHIPMENT', 400);
  const branch = await readyBinding(u.client, company, s.id, 'branch', input.branchId),
    driver = await readyBinding(u.client, company, s.id, 'driver', input.driverId);
  const details = await lockDispatchShipments(
    u,
    input.items.map((i) => i.shipmentId),
  );
  const reusable = new Map<string, DispatchItemRow>();
  for (const d of details) {
    await assertPhysical(
      u,
      d,
      input.branchId,
      input.items.find((i) => i.shipmentId === d.id)!.expectedVersion,
    );
    const prior = (
      await u.client.query(
        'SELECT branch_id,current_intent_id,task FROM dispatch.cycle WHERE company_id=$1 AND shipment_id=$2',
        [company, d.id],
      )
    ).rows[0];
    if (prior) {
      if (prior.branch_id !== input.branchId) throw new AccessError('TAWSEL_CHECK_003', 409);
      if (prior.task?.state !== 'withdrawn' || !prior.task.editable)
        throw new AccessError('EXISTING_CYCLE_REVIEW_REQUIRED', 409);
      const old = (await readDispatchItems(u.client, company, prior.current_intent_id)).find(
        (x) => x.shipment_id === d.id,
      )!;
      if (old.shipment_revision !== d.revision)
        throw new AccessError('SOURCE_CORRECTION_REVIEW_REQUIRED', 409);
      reusable.set(d.id, old);
    }
    if (!(await claimParcel(u.client, company, d.id, 'dispatch', id)))
      throw new AccessError('COMPETING_PARCEL_CLAIM', 409);
  }
  await u.client.query(
    `INSERT INTO dispatch.intent(company_id,id,source_id,branch_id,driver_id,driver_external_id,driver_resource_id,command_record_id,actor_id,actor_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      company,
      id,
      s.id,
      input.branchId,
      input.driverId,
      driver.external_id,
      driver.resource_id,
      recordId,
      u.access.principalId,
      u.access.displayName,
    ],
  );
  const intent = (await readDispatchIntent(u.client, company, id))!;
  for (const d of details) {
    const old = reusable.get(d.id),
      cycle = old?.cycle_id ?? randomUUID(),
      price = old?.price ?? dispatchPrice(d.price, d.id, waivers.get(d.id));
    const snapshot =
      old?.snapshot ??
      buildSourceSnapshot(d, price as ReturnType<typeof dispatchPrice>, {
        externalId: 'shipment:' + d.id,
        sourceDispatchCycleId: 'cycle:' + cycle,
        sourceBranchExternalId: branch.external_id,
        sourceRevision: 1,
        expectedSourceRevision: 0,
      });
    if (old)
      await u.client.query(
        'UPDATE dispatch.cycle SET current_intent_id=$1 WHERE company_id=$2 AND id=$3',
        [id, company, cycle],
      );
    else
      await u.client.query(
        `INSERT INTO dispatch.cycle(company_id,id,shipment_id,source_id,branch_id,external_id,source_cycle_id,pending_revision,current_intent_id) VALUES($1,$2,$3,$4,$5,$6,$7,1,$8)`,
        [
          company,
          cycle,
          d.id,
          s.id,
          input.branchId,
          snapshot.externalId,
          snapshot.sourceDispatchCycleId,
          id,
        ],
      );
    await u.client.query(
      `INSERT INTO dispatch.item(company_id,intent_id,cycle_id,shipment_id,shipment_revision,snapshot,price) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [company, id, cycle, d.id, d.revision, JSON.stringify(snapshot), JSON.stringify(price)],
    );
    if (!old)
      await enqueueIntake(
        pool,
        u.client,
        s,
        intent,
        recordId,
        'intake.submitSnapshot',
        { ...snapshot },
        d.id,
      );
  }
  if (reusable.size === details.length) {
    await enqueueIntake(pool, u.client, s, intent, recordId, 'intake.prepare', {
      driverExternalId: intent.driver_external_id,
      items: (await readDispatchItems(u.client, company, id)).map(assignmentReference),
    });
    await u.client.query(
      `UPDATE dispatch.intent SET state='preparing' WHERE company_id=$1 AND id=$2`,
      [company, id],
    );
  }
  return intent;
}
export function dispatchCommands(
  pool: Pool,
  options: {
    review?: { commandId: string; tasks: IntakeTask[] };
    approvedWaivers?: ReadonlyMap<string, ApprovedShippingWaiver>;
  } = {},
) {
  const kinds = [
    'dispatch.prepare',
    'dispatch.receive',
    'dispatch.withdraw',
    'dispatch.reassign',
    'dispatch.retry',
    'dispatch.review',
  ] as const;
  const defs: CommandDefinition<DispatchCommand>[] = kinds.map((kind) => ({
    family: 'dispatch',
    kind,
    capability: 'dispatch',
    authorize: async (u, value, recovery) => {
      if (!recovery && !validateDispatchCommand(value))
        throw new AccessError('VALIDATION_FAILED', 400);
      if ('branchId' in value && typeof value.branchId === 'string') u.assertBranch(value.branchId);
      if ('intentId' in value && typeof value.intentId === 'string') {
        const i = await readDispatchIntent(u.client, u.access.companyId, value.intentId);
        if (!i) throw new AccessError('NOT_FOUND', 404);
        u.assertBranch(i.branch_id);
      }
      if (!recovery && value.type === 'dispatch.prepare')
        for (const item of (value as Extract<DispatchCommand, { type: 'dispatch.prepare' }>)
          .items) {
          const d = await readShipment(u.client, u.access.companyId, item.shipmentId);
          if (!d) throw new AccessError('NOT_FOUND', 404);
          u.assertBranch(d.fields.branchId);
        }
    },
    execute: async (u, input, recordId) => {
      let i: DispatchIntentRow;
      if (input.type === 'dispatch.prepare')
        i = await prepareDispatch(pool, u, input, recordId, options.approvedWaivers);
      else {
        const company = u.access.companyId,
          s = await dispatchSource(u.client, company);
        i = (await readDispatchIntent(u.client, company, input.intentId, true))!;
        if (i.version !== input.expectedVersion)
          throw new AccessError('REVISION_CONFLICT', 409, i.version);
        const items = await readDispatchItems(u.client, company, i.id);
        if (input.type === 'dispatch.retry') {
          const action = (
            await u.client.query(
              `SELECT sc.* FROM dispatch.action a JOIN integration.source_command sc ON(sc.company_id,sc.action_id)=(a.company_id,a.action_id) WHERE a.company_id=$1 AND a.intent_id=$2 AND a.action_id=$3 FOR UPDATE OF sc`,
              [company, i.id, input.actionId],
            )
          ).rows[0];
          if (!action || ['accepted', 'rejected', 'review-required'].includes(action.state))
            throw new AccessError('REVIEW_NEW_INTENT_REQUIRED', 409);
          const changed = await u.client.query(
            `UPDATE work_item SET state='pending',available_at=clock_timestamp(),last_error=NULL WHERE id=$1 AND state<>'leased' RETURNING id`,
            [action.work_id],
          );
          if (!changed.rowCount) throw new AccessError('COMMAND_IN_FLIGHT', 409);
          await u.client.query(
            `UPDATE integration.source_command SET state='pending',last_error=NULL WHERE company_id=$1 AND action_id=$2`,
            [company, input.actionId],
          );
        } else {
          if (
            (
              await u.client.query(
                `SELECT 1 FROM dispatch.action a JOIN integration.source_command sc ON(sc.company_id,sc.action_id)=(a.company_id,a.action_id) WHERE a.company_id=$1 AND a.intent_id=$2 AND sc.state NOT IN ('accepted','rejected','review-required')`,
                [company, i.id],
              )
            ).rowCount
          )
            throw new AccessError('PENDING_REMOTE_CONFIRMATION', 409);
          const refs = items.map(assignmentReference);
          if (input.type === 'dispatch.review') {
            if (
              !['rejected', 'review-required', 'withdrawn'].includes(i.state) ||
              options.review?.commandId !== input.commandId ||
              options.review.tasks.length !== items.length
            )
              throw new AccessError('AUTHORITATIVE_REVIEW_REQUIRED', 409);
            for (const item of items) {
              const task = options.review.tasks.find((t) => t.externalId === item.external_id);
              if (
                !validateIntakeTask(task) ||
                task.sourceDispatchCycleId !== item.source_cycle_id ||
                task.taskId !== item.task_id ||
                task.dispatchCycleId !== item.remote_cycle_id ||
                canonical(task.snapshot) !== canonical(item.snapshot) ||
                task.driverId !== i.driver_resource_id ||
                task.state !== 'prepared' ||
                !task.editable
              )
                throw new AccessError('PROTECTED_LIFECYCLE', 409);
              await u.client.query(
                `UPDATE dispatch.cycle SET accepted_revision=$1,assignment_revision=$2,task=$3 WHERE company_id=$4 AND id=$5`,
                [
                  task.sourceRevision,
                  task.assignmentRevision,
                  JSON.stringify(task),
                  company,
                  item.cycle_id,
                ],
              );
            }
            i.state = 'prepared';
          } else if (input.type === 'dispatch.receive') {
            if (
              i.state !== 'prepared' ||
              items.some((x) => x.task?.state !== 'prepared' || !x.task.editable)
            )
              throw new AccessError('ACCEPTED_PREPARATION_REQUIRED', 409);
            await readyBinding(u.client, company, s.id, 'branch', i.branch_id);
            await readyBinding(u.client, company, s.id, 'driver', i.driver_id);
            // Source identities precede aggregate, stock and shared wallet locks.
            const sources = new Map<string, string>();
            for (const item of items)
              sources.set(
                item.shipment_id,
                (
                  await new JournalPosting(u).source(
                    {
                      system: 'dispatch',
                      identity: i.id + ':' + item.shipment_id,
                      kind: 'shipping-cover',
                      revision: '1',
                    },
                    { intentId: i.id, shipmentId: item.shipment_id, price: item.price },
                  )
                ).id,
              );
            const details = await lockDispatchShipments(
              u,
              items.map((x) => x.shipment_id),
            );
            for (const d of details) {
              await assertPhysical(u, d, i.branch_id);
              if (d.revision !== items.find((x) => x.shipment_id === d.id)!.shipment_revision)
                throw new AccessError('SNAPSHOT_REVISION_CONFLICT', 409);
            }
            await lockShippingWallets(
              u,
              details.map((d) => d.fields.brandId),
            );
            for (const d of details) {
              const item = items.find((x) => x.shipment_id === d.id)!,
                brand = await readBrand(u.client, company, d.fields.brandId);
              if (!brand?.active) throw new AccessError('BRAND_UNAVAILABLE', 409);
              if (!item.cover_id) {
                const cover = await reserveShippingCover(
                  u,
                  d.fields.brandId,
                  sources.get(d.id)!,
                  item.price.brandShippingMinor,
                  brand.allowNegativeBalance,
                );
                await u.client.query(
                  `UPDATE dispatch.item SET cover_source_id=$1,cover_id=$2 WHERE company_id=$3 AND intent_id=$4 AND shipment_id=$5`,
                  [sources.get(d.id), cover, company, i.id, d.id],
                );
              } else {
                if (
                  (
                    await u.client.query(
                      'SELECT 1 FROM kernel.cover_close WHERE company_id=$1 AND cover_id=$2',
                      [company, item.cover_id],
                    )
                  ).rowCount
                )
                  throw new AccessError('COVER_ALREADY_CLOSED', 409);
                const { WalletService } = await import('../kernel/wallet.js');
                if (
                  !brand.allowNegativeBalance &&
                  BigInt(
                    (await new WalletService(u, d.fields.brandId).amounts()).signedEntitlement,
                  ) < 0n
                )
                  throw new AccessError('INSUFFICIENT_SHIPPING_COVER', 409);
              }
            }
            await enqueueIntake(pool, u.client, s, i, recordId, 'assignment.receiveBatch', {
              driverExternalId: i.driver_external_id,
              items: refs,
              receiptAsserted: true,
            });
            i.state = 'receiving';
          } else if (input.type === 'dispatch.withdraw') {
            // A received parcel must use the actual branch-return lifecycle (P14); never teleport it.
            if (items.some((x) => x.task?.state === 'held') || i.state === 'accepted')
              throw new AccessError('ACTUAL_RETURN_LIFECYCLE_REQUIRED', 409);
            if (items.some((x) => !x.task?.editable))
              throw new AccessError('PROTECTED_LIFECYCLE', 409);
            for (const item of items)
              await enqueueIntake(
                pool,
                u.client,
                s,
                i,
                recordId,
                'assignment.withdraw',
                { ...assignmentReference(item) },
                item.shipment_id,
              );
            i.state = 'withdrawing';
          } else {
            if (
              i.state !== 'prepared' ||
              items.some((x) => !x.task?.editable || x.task.state !== 'prepared')
            )
              throw new AccessError('PROTECTED_LIFECYCLE', 409);
            const driver = await readyBinding(u.client, company, s.id, 'driver', input.driverId);
            await u.client.query(
              `UPDATE dispatch.intent SET driver_id=$1,driver_external_id=$2,driver_resource_id=$3 WHERE company_id=$4 AND id=$5`,
              [input.driverId, driver.external_id, driver.resource_id, company, i.id],
            );
            for (const item of items)
              await enqueueIntake(
                pool,
                u.client,
                s,
                i,
                recordId,
                'assignment.reassignBeforeDeparture',
                {
                  ...assignmentReference(item),
                  driverExternalId: driver.external_id,
                  receiptAsserted: false,
                },
                item.shipment_id,
              );
            i.state = 'reassigning';
          }
        }
        await u.client.query(
          `UPDATE dispatch.intent SET version=version+1,state=$1,last_error=NULL WHERE company_id=$2 AND id=$3`,
          [i.state, company, i.id],
        );
      }
      const body = { commandId: input.commandId, intentId: i.id, branchId: i.branch_id };
      return {
        reply: { status: 202, body },
        reference: body,
        entityId: i.id,
        beforeVersion: input.type === 'dispatch.prepare' ? null : input.expectedVersion,
        afterVersion: i.version + 1,
      };
    },
    resolve: async (_u, r) => ({
      commandId: r.commandId,
      intentId: r.intentId,
      branchId: r.branchId,
    }),
    rejectionReference: async (input, u) => ({
      entityId: input.type === 'dispatch.prepare' ? input.items[0]!.shipmentId : input.intentId,
      branchId:
        input.type === 'dispatch.prepare'
          ? input.branchId
          : (await readDispatchIntent(u.client, u.access.companyId, input.intentId))!.branch_id,
    }),
  }));
  return new CommandService(pool, defs);
}
/** Source acceptance runs even after the initiating user is revoked. This context attributes the
 * already-authorized durable action; it cannot authorize another staff command. */
export function acceptanceUnitOfWork(c: TransactionClient, i: DispatchIntentRow) {
  const access: AccessContext = {
    companyId: i.company_id,
    principalId: i.actor_id,
    displayName: i.actor_name,
    principalKind: 'staff',
    sessionId: '',
    companyName: '',
    companyActive: true,
    userActive: true,
    issuer: 'source-acceptance',
    subject: i.actor_id,
    authorizationRevision: '',
    grants: [],
    assignedBranches: [{ id: i.branch_id, name: '' }],
    companyBranches: [{ id: i.branch_id, name: '' }],
    supportSessionId: null,
    supportExpiresAt: null,
  };
  return new UnitOfWork(c, access);
}
