import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { readShipment, transaction } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type {
  ShipmentFields,
  ShipmentCommand,
  ShipmentResult,
  DispatchCommand,
  DispatchResult,
} from '@shahn/contracts';
import {
  intakeOperations,
  type SourceEnvelope,
  type IntakeTask,
  type SourceConfiguration,
  type BindingKind,
} from '@shahn/contracts/tawsel';
import { integrationFixture, acceptedResult } from '../p11/fixtures.js';
import { SourceCommandWorker } from '../../../apps/api/src/modules/integration/source-command.service.js';
import { seedCommercial } from '../../../apps/api/src/modules/brands/seed.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
import { dispatchCommands } from '../../../apps/api/src/modules/dispatch/dispatch.service.js';
import { dispatchDetail } from '../../../apps/api/src/modules/dispatch/dispatch-query.service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { JournalPosting } from '../../../apps/api/src/modules/kernel/journals.js';
import { WalletService } from '../../../apps/api/src/modules/kernel/wallet.js';
import { shipmentFields } from '../../support/shipments.js';
export async function dispatchFixture(
  pool: Pool,
  origin = 'http://127.0.0.1:5321',
  baseUrl = 'http://127.0.0.1:1',
) {
  const f = await integrationFixture(pool, origin, baseUrl),
    seed = await seedCommercial(pool, f.admin.token, f.company, f.a, 'test'),
    worker = new SourceCommandWorker(pool, f.runtime);
  const configuration: SourceConfiguration = {
    identity: {
      mode: 'service-operation',
      tenantId: f.connection.tenantId,
      integrationId: f.connection.integrationId,
      actorId: null,
    },
    issuer: f.config.issuer,
    supportedVersions: ['1.0.0'],
    allowedOperations: [
      ...Object.keys(intakeOperations),
      'intake.getTask',
      'intake.listTasks',
      'intake.getBatchResult',
    ],
    humanDelegation: false,
  };
  await pool.query(
    'UPDATE integration.source SET configuration=$1,configuration_checked_at=clock_timestamp() WHERE company_id=$2',
    [JSON.stringify(configuration), f.company],
  );
  const provision = async (
    entity: BindingKind,
    nativeId: string,
    operationId: string,
    payload: Record<string, unknown>,
  ) => {
    await f.commands.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'integration.queue',
      operationId,
      nativeId,
      expectedVersion: 0,
      payload,
    });
    const lease = (await worker.claim())!,
      e = JSON.parse(lease.request_body) as SourceEnvelope,
      resourceId = randomUUID();
    await worker.complete(lease, {
      result: acceptedResult(e),
      status: 200,
      identity: {
        entity,
        externalId: String(e.payload.externalId),
        resourceId,
        sourceRevision: 1,
        lastActionId: e.actionId,
        issuerStatus: entity === 'user' ? 'ready' : 'not-required',
        attempts: 1,
        nextAttemptAt: null,
        lastError: null,
        enabled: entity === 'role' ? null : true,
      },
    });
    return resourceId;
  };
  await provision('branch', f.a, 'branch.provision', {
    name: 'الفرع أ',
    enabled: true,
    location: null,
  });
  await provision('branch', f.b, 'branch.provision', {
    name: 'الفرع ب',
    enabled: true,
    location: null,
  });
  await provision('role', f.adminRole, 'role.defineCapabilities', {
    name: 'مدير الشركة',
    capabilities: [],
  });
  await provision('user', f.admin.id, 'user.provision', {
    subject: f.admin.subject,
    roleExternalId: 'role:' + f.adminRole,
    branchExternalIds: ['branch:' + f.a, 'branch:' + f.b],
    enabled: true,
  });
  const driverResource = await provision('driver', f.driver, 'driver.provisionReference', {
    userExternalId: 'user:' + f.admin.id,
    enabled: true,
    vehicleReference: null,
    profile: 'car',
  });
  const create = async (extra: Partial<ShipmentFields> = {}) => {
    const tariff = (
      await pool.query<{ id: string; version: number }>(
        `SELECT t.id,t.version FROM commercial.tariff t JOIN commercial.brand_policy b
       ON b.company_id=t.company_id AND b.tier_id=t.tier_id
       WHERE b.company_id=$1 AND b.brand_id=$2 AND b.version=(SELECT max(version) FROM commercial.brand_policy WHERE company_id=$1 AND brand_id=$2)
       AND t.governorate_id=$3 AND (t.area_id=$4 OR t.area_id IS NULL) AND t.active ORDER BY t.area_id NULLS LAST LIMIT 1`,
        [
          f.company,
          extra.brandId ?? seed.brand,
          extra.governorateId ?? seed.cairo,
          extra.areaId ?? null,
        ],
      )
    ).rows[0];
    const input: ShipmentCommand = {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'shipment.confirm',
      fields: shipmentFields(
        { branchId: f.a, brandId: seed.brand, governorateId: seed.cairo },
        extra,
      ),
      actualReceipt: extra.service !== 'stored_stock',
      duplicateAcknowledged: false,
      expectedPolicyVersion: Number(
        (
          await pool.query('SELECT version FROM commercial.brand WHERE company_id=$1 AND id=$2', [
            f.company,
            extra.brandId ?? seed.brand,
          ])
        ).rows[0].version,
      ),
      expectedTariffVersion: tariff?.version ?? 1,
      expectedTariffId: tariff?.id ?? seed.base,
    };
    return (await shipmentCommands(pool).execute(f.admin.token, input)).body as ShipmentResult;
  };
  const commands = dispatchCommands(pool),
    command = (v: object) =>
      ({
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        ...v,
      }) as DispatchCommand;
  const prepareInput = (shipments: ShipmentResult[]) =>
    command({
      type: 'dispatch.prepare',
      branchId: f.a,
      driverId: f.driver,
      items: shipments.map((s) => ({ shipmentId: s.shipmentId, expectedVersion: s.version })),
    });
  const detail = (id: string) =>
    UnitOfWork.run(pool, f.admin.token, f.company, 'dispatch', (u) => dispatchDetail(u, id));
  const tasks = new Map<string, IntakeTask>();
  const completeNext = async (options: { planningFailed?: boolean; reject?: string } = {}) => {
    const lease = await worker.claim();
    if (!lease) return null;
    const e = JSON.parse(lease.request_body) as SourceEnvelope,
      result = acceptedResult(e);
    if (options.reject) {
      result.receipt.businessStatus = 'rejected';
      result.receipt.problem = {
        type: 'https://schemas.tawsel.invalid/problems/stale-revision',
        title: 'Source command rejected',
        status: 409,
        code: options.reject,
        detail: 'Controlled P12 fixture rejection',
        correlationId: randomUUID(),
        actionId: e.actionId,
        retryable: false,
      };
      await worker.complete(lease, { result, status: 409 });
      return lease;
    }
    const selected: IntakeTask[] = [];
    const refs = Array.isArray(e.payload.items)
      ? (e.payload.items as Record<string, unknown>[])
      : [e.payload];
    for (const ref of refs) {
      const externalId = String(ref.externalId);
      let task = tasks.get(externalId);
      if (e.operationId === 'intake.submitSnapshot') {
        task = {
          taskId: randomUUID(),
          dispatchCycleId: randomUUID(),
          externalId,
          sourceDispatchCycleId: String(ref.sourceDispatchCycleId),
          sourceRevision: Number(ref.sourceRevision),
          assignmentRevision: 0,
          state: 'unassigned',
          driverId: null,
          driverExternalId: null,
          receivedAt: null,
          editable: true,
          planningEligible: false,
          planningStatus: 'not-requested',
          locationReadiness: 'needs-resolution',
          snapshot: e.payload as unknown as IntakeTask['snapshot'],
        };
      } else {
        if (!task) throw Error('FIXTURE_TASK_NOT_FOUND');
        task = structuredClone(task);
        task.assignmentRevision = Number(ref.assignmentRevision);
        task.state =
          e.operationId === 'assignment.receiveBatch'
            ? 'held'
            : e.operationId === 'assignment.withdraw'
              ? 'withdrawn'
              : 'prepared';
        task.driverId = task.state === 'withdrawn' ? null : driverResource;
        task.driverExternalId =
          task.state === 'withdrawn'
            ? null
            : String(e.payload.driverExternalId ?? 'driver:' + f.driver);
        if (task.state === 'held') {
          task.receivedAt = new Date().toISOString();
          task.planningEligible = true;
          task.planningStatus = options.planningFailed ? 'failed' : 'pending';
        }
      }
      tasks.set(externalId, task);
      selected.push(task);
    }
    await worker.complete(lease, { result, status: 200, tasks: selected });
    return lease;
  };
  const prepared = async (shipments: ShipmentResult[]) => {
    const r = (await commands.execute(f.admin.token, prepareInput(shipments)))
      .body as DispatchResult;
    for (let n = 0; n < shipments.length + 1; n++) await completeNext();
    return detail(r.intentId);
  };
  const credit = async (brandId: string, eligible = '10000', pending = '50000') => {
    for (const [amount, readiness] of [
      [eligible, 'eligible'],
      [pending, 'pending'],
    ] as const) {
      if (amount === '0') continue;
      await UnitOfWork.run(pool, f.admin.token, f.company, 'dispatch', async (u) => {
        const posting = new JournalPosting(u),
          source = await posting.source(
            { system: 'p12-fixture', identity: randomUUID(), kind: 'opening', revision: '1' },
            { eligible, pending },
          );
        await posting.lock('brand', brandId);
        const record = (
          await u.client.query('SELECT id FROM command_record WHERE company_id=$1 LIMIT 1', [
            f.company,
          ])
        ).rows[0].id;
        const effects = await posting.append(source.id, record, [
          {
            family: 'brand',
            kind: 'opening',
            subjectId: brandId,
            amountMinor: amount,
            branchId: f.a,
            effectiveDate: cairoDate(new Date()),
            supersedesId: null,
            reason: 'P12 isolated credit fixture',
          },
        ]);
        await new WalletService(u, brandId).credit(effects.ids[0]!, readiness);
      });
    }
  };
  const wallet = (brand = seed.brand) =>
    UnitOfWork.run(pool, f.admin.token, f.company, 'dispatch', async (u) => {
      await new JournalPosting(u).lock('brand', brand);
      return new WalletService(u, brand).amounts();
    });
  return {
    ...f,
    seed,
    worker,
    configuration,
    driverResource,
    create,
    commands,
    command,
    prepareInput,
    detail,
    completeNext,
    prepared,
    tasks,
    credit,
    wallet,
    read: (id: string) => readShipment(pool, f.company, id),
  };
}
export { acceptedResult, transaction };
