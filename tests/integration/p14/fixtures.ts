import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction, sourceByCompany, readProducts, readBrand } from '@shahn/database';
import type {
  ReturnRequest,
  ReturnTransition,
  ReturnCommandResult,
  SourceEnvelope,
  IntakeTask,
} from '@shahn/contracts/tawsel';
import type {
  ReturnCommand,
  ReturnResult,
  InventoryCommand,
  InventoryResult,
} from '@shahn/contracts';
import { executionFixture } from '../p13/fixtures.js';
import { acceptedResult } from '../p11/fixtures.js';
import { SourceCommandWorker } from '../../../apps/api/src/modules/integration/source-command.service.js';
import { mergeReturnRequest } from '../../../apps/api/src/modules/returns/receipt.service.js';
import { returnCommands } from '../../../apps/api/src/modules/returns/returns.service.js';
import { inventoryCommands } from '../../../apps/api/src/modules/inventory/service.js';
import { commercialCommands } from '../../../apps/api/src/modules/brands/service.js';
import { cairoDate } from '@shahn/domain';
export async function returnFixture(
  pool: Pool,
  origin = 'http://127.0.0.1:5341',
  baseUrl = 'http://127.0.0.1:1',
) {
  const f = await executionFixture(pool, origin, baseUrl),
    commands = returnCommands(pool),
    sourceWorker = new SourceCommandWorker(pool, f.runtime);
  await pool.query(
    `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'returns') ON CONFLICT DO NOTHING`,
    [f.company, f.adminRole],
  );
  await pool.query(
    `UPDATE integration.source SET configuration=jsonb_set(configuration,'{allowedOperations}',(configuration->'allowedOperations')||$1::jsonb) WHERE company_id=$2`,
    [
      JSON.stringify([
        'return.confirmSubsetReceipt',
        'return.recordDisposition',
        'return.listPending',
        'return.getNativeRequest',
        'return.getNativeResult',
        'dispatch.listCycles',
      ]),
      f.company,
    ],
  );
  const command = (input: object) =>
    ({
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: f.company,
      branchId: f.a,
      ...input,
    }) as ReturnCommand;
  const drain = async () => {
    for (let n = 0; n < 20; n++) if (!(await f.worker.runOne())) break;
  };
  const setup = async (
    options: { stock?: boolean; outcome?: 'partial' | 'refused' | 'full'; early?: boolean } = {},
  ) => {
    let variant: string | undefined;
    if (options.stock) {
      const { id, version, ...fields } = (await readBrand(pool, f.company, f.seed.brand))!;
      // Preserve the selected tariff; enable the stored-stock service through its actual native command.
      if (!fields.services.includes('stored_stock'))
        await commercialCommands(pool).execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'brand.update',
          entityId: id,
          expectedVersion: version,
          fields: {
            ...fields,
            services: ['brand_packed', 'stored_stock'],
            defaultService: 'brand_packed',
            storage: {
              monthlyFeeMinor: '10000',
              branchId: f.a,
              startDate: cairoDate(new Date()),
              anniversaryDay: Number(cairoDate(new Date()).slice(-2)),
              active: true,
              stopDate: null,
            },
          },
        });
      const p = (
        await inventoryCommands(pool).execute(f.admin.token, {
          schemaVersion: 1,
          companyId: f.company,
          commandId: randomUUID(),
          type: 'product.create',
          brandId: f.seed.brand,
          fields: {
            name: 'مرتجع اختبار',
            active: true,
            variants: [{ name: 'قطعة سليمة', options: '', active: true }],
          },
        })
      ).body as InventoryResult;
      variant = (await readProducts(pool, f.company)).find((x) => x.id === p.entityId)!.variants[0]!
        .id;
      await inventoryCommands(pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'stock.receive',
        branchId: f.a,
        brandId: f.seed.brand,
        actualDate: cairoDate(new Date()),
        lines: [{ variantId: variant, quantity: 3, condition: 'sound' }],
      } as InventoryCommand);
    }
    // f.received uses real dispatch/outcome services; its source acceptance is an explicit controlled fixture.
    const lines = [
      {
        id: randomUUID(),
        ...(variant ? { variantId: variant } : {}),
        description: 'ثلاث قطع من نفس الصنف',
        quantity: 3,
        unitDue: { currency: 'EGP' as const, amountMinor: '10000' },
      },
    ];
    let x: Awaited<ReturnType<typeof f.received>>;
    if (!variant) x = await f.received({ lines });
    else {
      // Adapt P12's fixture create to the current brand policy and actual stored-stock preparation.
      // The shared P13 helper is expanded below to honor stored-stock preparation and current policy.
      x = await f.received({ service: 'stored_stock', lines });
    }
    const outcome = await x.outcome(options.outcome ?? 'partial');
    if (outcome.outcome === 'partial') {
      outcome.lines[0]!.delivered = 1;
      outcome.lines[0]!.heldReturnRequired = 2;
      outcome.collection.goods.amountMinor = 10000;
      outcome.collection.reported!.amountMinor = 10000 + outcome.collection.shipping.amountMinor;
    }
    const requested = outcome.lines[0]!.heldReturnRequired;
    const request: ReturnRequest = {
      requestId: randomUUID(),
      driverId: f.driverResource,
      sourceBranchId: outcome.branchId!,
      integrationId: f.connection.integrationId,
      roundId: x.roundId,
      requestedAt: new Date().toISOString(),
      items: [
        {
          itemId: randomUUID(),
          taskId: x.task.taskId,
          dispatchCycleId: x.task.dispatchCycleId,
          outcomeId: outcome.outcomeId,
          attemptId: x.attemptId,
          sourceLineId: lines[0]!.id,
          externalId: x.task.externalId,
          sourceDispatchCycleId: x.task.sourceDispatchCycleId,
          sourceRevision: x.task.sourceRevision,
          revision: 0,
          requested,
          received: 0,
          lost: 0,
          damaged: 0,
          unresolved: requested,
          eligibility: 'pending',
          custody: {
            sourceQuantity: 3,
            delivered: 3 - requested,
            held: requested,
            received: 0,
            lost: 0,
            damaged: 0,
          },
        },
      ],
    };
    const oe = f.event('outcome.recorded', { outcome }, x.task.taskId, 1),
      re = requested
        ? f.event('return.requested', { request }, request.requestId, 1, 'return-request')
        : null;
    if (!options.early) {
      await f.receive(oe);
      await drain();
    }
    if (re) {
      await f.receive(re);
      await drain();
    }
    return { ...x, request, outcome, oe, re, variant };
  };
  const receiveInput = (
    r: ReturnRequest,
    quantity = 1,
    condition: 'sound' | 'damaged' | 'uncertain' = 'sound',
    stock = false,
  ) =>
    command({
      type: 'return.receive',
      requestId: r.requestId,
      actualReceipt: true,
      observedAt: new Date().toISOString(),
      items: [
        {
          itemId: r.items[0]!.itemId,
          expectedRevision: r.items[0]!.revision,
          quantity,
          condition,
          inspection: stock ? 'counted-pieces' : 'parcel-exterior',
          suspectedShortage: false,
        },
      ],
    });
  const resultFor = async (e: SourceEnvelope): Promise<ReturnCommandResult> => {
    const r = structuredClone(
      (
        await pool.query(`SELECT original FROM returns.request WHERE company_id=$1 AND id=$2`, [
          f.company,
          e.payload.requestId,
        ])
      ).rows[0].original,
    ) as ReturnRequest;
    r.items = (
      await pool.query(
        `SELECT current_data FROM returns.item WHERE company_id=$1 AND request_id=$2 ORDER BY id`,
        [f.company, r.requestId],
      )
    ).rows.map((x) => x.current_data);
    const transitions: ReturnTransition[] = [];
    for (const selected of e.payload.items as {
      itemId: string;
      expectedRevision: number;
      quantity: number;
    }[]) {
      const item = r.items.find((i) => i.itemId === selected.itemId)!;
      const kind =
        e.operationId === 'return.confirmSubsetReceipt'
          ? 'received'
          : (e.payload.disposition as 'lost' | 'damaged');
      item[kind] += selected.quantity;
      item.unresolved -= selected.quantity;
      item.revision++;
      item.custody[kind] += selected.quantity;
      item.custody.held -= selected.quantity;
      item.eligibility = item.unresolved ? 'pending' : 'settled';
      transitions.push({
        transitionId: randomUUID(),
        requestId: r.requestId,
        itemId: item.itemId,
        taskId: item.taskId,
        dispatchCycleId: item.dispatchCycleId,
        outcomeId: item.outcomeId,
        sourceLineId: item.sourceLineId,
        sourceReference: {
          tenantId: f.connection.tenantId,
          integrationId: f.connection.integrationId,
          externalId: item.externalId,
        },
        sourceDispatchCycleId: item.sourceDispatchCycleId,
        sourceBranchId: r.sourceBranchId,
        kind,
        quantity: selected.quantity,
        revision: item.revision,
        time: { ...f.time(), actionId: e.actionId },
        identity: {
          mode: 'service-operation',
          actorId: null,
          tenantId: f.connection.tenantId,
          integrationId: f.connection.integrationId,
        },
      });
    }
    return { request: r, transitions };
  };
  const accept = async () => {
    const lease = (await sourceWorker.claim())!,
      e = JSON.parse(lease.request_body) as SourceEnvelope,
      body = await resultFor(e),
      result = acceptedResult(e);
    result.response!.body = { ...body };
    await sourceWorker.complete(lease, { result, status: 200 });
    return { lease, e, body, result };
  };
  const redispatch = async () => {
    const lease = (await sourceWorker.claim())!,
      e = JSON.parse(lease.request_body) as SourceEnvelope;
    const old = f.tasks.get(String(e.payload.externalId))!,
      snapshot = e.payload.snapshot as IntakeTask['snapshot'];
    const task: IntakeTask = {
      ...old,
      dispatchCycleId: randomUUID(),
      sourceDispatchCycleId: snapshot.sourceDispatchCycleId,
      sourceRevision: snapshot.sourceRevision,
      snapshot,
      previousDispatchCycleId: old.dispatchCycleId,
      latest: true,
      state: 'unassigned',
      assignmentRevision: 0,
      driverId: null,
      driverExternalId: null,
      receivedAt: null,
      planningEligible: false,
      planningStatus: 'not-requested',
    };
    f.tasks.set(task.externalId, task);
    await sourceWorker.complete(lease, { result: acceptedResult(e), status: 200, tasks: [task] });
    return { lease, e, task };
  };
  const readRequest = async (id: string) => {
    const r = (
      await pool.query(`SELECT original FROM returns.request WHERE company_id=$1 AND id=$2`, [
        f.company,
        id,
      ])
    ).rows[0].original as ReturnRequest;
    return {
      ...r,
      items: (
        await pool.query(
          `SELECT current_data FROM returns.item WHERE company_id=$1 AND request_id=$2`,
          [f.company, id],
        )
      ).rows.map((i) => i.current_data),
    };
  };
  const merge = (r: ReturnRequest) =>
    transaction(pool, async (c) => {
      const s = (await sourceByCompany(c, f.company, true))!;
      await mergeReturnRequest(c, s, r);
    });
  const receipt = async (r: ReturnRequest) => {
    const nativeResult = (await commands.execute(f.admin.token, receiveInput(r)))
      .body as ReturnResult;
    const accepted = await accept();
    return { nativeResult, ...accepted };
  };
  return {
    ...f,
    commands,
    sourceWorker,
    command,
    drain,
    setup,
    receiveInput,
    resultFor,
    accept,
    redispatch,
    readRequest,
    merge,
    receipt,
  };
}
