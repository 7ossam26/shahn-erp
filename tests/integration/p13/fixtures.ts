import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction, insertReceivedEvent, sourceByCompany, employeeClock } from '@shahn/database';
import { validateSenderEvent, type SenderEvent } from '@shahn/contracts/tawsel';
import type { OutcomeRecord } from '@shahn/contracts/execution';
import { dispatchFixture } from '../p12/fixtures.js';
import { employeeCommands } from '../../../apps/api/src/modules/employees/service.js';
import type { EmployeeResult } from '@shahn/contracts';
import { ProjectionWorker } from '../../../apps/api/src/modules/execution/projection-worker.js';
import { shipmentCommands } from '../../../apps/api/src/modules/shipments/service.js';
import { dispatchCommands } from '../../../apps/api/src/modules/dispatch/dispatch.service.js';
import type { DispatchResult } from '@shahn/contracts';
export async function executionFixture(
  pool: Pool,
  origin = 'http://127.0.0.1:5331',
  baseUrl = 'http://127.0.0.1:1',
) {
  const f = await dispatchFixture(pool, origin, baseUrl),
    ec = employeeCommands(pool),
    today = (await employeeClock(pool)).today;
  const employee = (
    await ec.execute(f.admin.token, {
      schemaVersion: 1,
      companyId: f.company,
      commandId: randomUUID(),
      type: 'employee.create',
      fields: {
        name: 'مندوب التجربة',
        contact: '',
        active: true,
        employmentStart: today,
        employmentEnd: null,
        branchId: f.a,
        workDays: [0, 1, 2, 3, 4],
        hoursPerDay: 8,
        weeklyDayOff: 5,
      },
      terms: {
        salary: { enabled: false, monthly: null },
        commission: { enabled: true, formula: 'percentage', basisPoints: 1000, perVisit: null },
      },
    })
  ).body as EmployeeResult;
  await ec.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'employee.link',
    employeeId: employee.employeeId,
    expectedVersion: employee.version,
    effectiveDate: today,
    endDate: null,
    driverId: f.driver,
    localDriver: null,
    reason: 'Explicit P13 test association',
  });
  await f.credit(f.seed.brand, '1000000', '0');
  const worker = new ProjectionWorker(pool),
    time = () => ({
      actionId: randomUUID(),
      recordedAt: new Date().toISOString(),
      observation: { observedAt: null, clock: { quality: 'unknown' } },
    });
  const event = (
    type: string,
    payload: Record<string, unknown>,
    aggregateId: string,
    sequence: number,
    aggregateType = 'task',
  ): SenderEvent => {
    const p = (payload.outcome ??
      (payload.correction as { outcome?: unknown })?.outcome ??
      payload.change ??
      payload) as Record<string, unknown>;
    const e: SenderEvent = {
      schemaVersion: '1.0.0',
      payloadVersion: '1.0.0',
      eventId: randomUUID(),
      eventType: type,
      eventKind: 'transition',
      tenantId: f.connection.tenantId,
      recipientIntegrationId: f.connection.integrationId,
      aggregate: { type: aggregateType, id: aggregateId, recipientSequence: sequence },
      resources: {},
      versions: {},
      correlation: {
        ...((p.time as { actionId?: string })?.actionId
          ? { actionId: (p.time as { actionId: string }).actionId }
          : {}),
      },
      committedAt: new Date().toISOString(),
      payload,
    };
    if (!validateSenderEvent(e)) throw Error('INVALID_P13_FIXTURE:' + type);
    return e;
  };
  const receive = async (e: SenderEvent) =>
    transaction(pool, async (c) =>
      insertReceivedEvent(
        c,
        (await sourceByCompany(c, f.company))!,
        e,
        Buffer.from(JSON.stringify(e)),
        { keyId: 'trial', deliveryTimestamp: String(Date.now()) },
      ),
    );
  const received = async (extra: Parameters<typeof f.create>[0] = {}, waived = false) => {
    const s = await f.create(extra);
    if (extra.service === 'company_packed')
      await shipmentCommands(pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'shipment.prepare',
        shipmentId: s.shipmentId,
        expectedVersion: s.version,
      });
    if (extra.service === 'company_packed') s.version = (await f.read(s.shipmentId))!.version;
    let d: Awaited<ReturnType<typeof f.prepared>>;
    if (waived) {
      const commands = dispatchCommands(pool, {
        approvedWaivers: new Map([
          [
            s.shipmentId,
            {
              incidentId: randomUUID(),
              approvalId: randomUUID(),
              originalShipmentId: randomUUID(),
              replacementShipmentId: s.shipmentId,
            },
          ],
        ]),
      });
      const r = (await commands.execute(f.admin.token, f.prepareInput([s]))).body as DispatchResult;
      await f.completeNext();
      await f.completeNext();
      d = await f.detail(r.intentId);
    } else d = await f.prepared([s]);
    await f.commands.execute(
      f.admin.token,
      f.command({
        type: 'dispatch.receive',
        intentId: d.id,
        expectedVersion: d.version,
        receiptAsserted: true,
      }),
    );
    await f.completeNext();
    const task =
      [...f.tasks.values()].find((x) => x.externalId === 'shipment:' + s.shipmentId) ??
      [...f.tasks.values()].at(-1)!;
    const roundId = randomUUID(),
      workdayId = randomUUID(),
      attemptId = randomUUID();
    const start = event(
      'round.started',
      {
        roundId,
        workdayId,
        driverId: f.driverResource,
        startedAt: new Date().toISOString(),
        firstPlanId: randomUUID(),
        firstForecastId: randomUUID(),
        firstWorkloadId: randomUUID(),
        taskIds: [task.taskId],
      },
      roundId,
      1,
      'trip',
    );
    await receive(start);
    await worker.runOne();
    const arrival = () =>
      event(
        'current.arrivalRecorded',
        {
          roundId,
          driverId: f.driverResource,
          taskId: task.taskId,
          attemptId,
          activityRevision: 2,
          stage: 'arrived',
          time: time(),
        },
        task.taskId,
        1,
      );
    const outcome = async (
      kind: OutcomeRecord['outcome'] = 'full',
      arrivalEvidence: OutcomeRecord['arrival'] = null,
    ): Promise<OutcomeRecord> => {
      const branch = (
        await pool.query(
          `SELECT resource_id FROM integration.binding WHERE company_id=$1 AND entity='branch' AND native_id=$2`,
          [f.company, f.a],
        )
      ).rows[0].resource_id;
      const money = (amountMinor: number) => ({
        amountMinor,
        currency: 'EGP' as const,
        exponent: 2 as const,
      });
      const delivered = kind === 'full' || kind === 'partial';
      const goods = delivered
          ? task.snapshot.lines.reduce((n, l) => n + l.quantity * l.unitDue.amountMinor, 0)
          : 0,
        shipping = delivered ? task.snapshot.shippingDue.amountMinor : 0;
      return {
        kind: 'company',
        outcome: kind,
        outcomeId: randomUUID(),
        revision: 1,
        taskId: task.taskId,
        attemptId,
        dispatchCycleId: task.dispatchCycleId,
        sourceDispatchCycleId: task.sourceDispatchCycleId,
        roundId,
        workdayId,
        driverId: f.driverResource,
        branchId: branch,
        sourceRevision: task.sourceRevision,
        assignmentRevision: task.assignmentRevision,
        sourceReference: {
          tenantId: f.connection.tenantId,
          integrationId: f.connection.integrationId,
          externalId: task.externalId,
        },
        time: time(),
        arrival: arrivalEvidence,
        heading: null,
        returnRequired: kind !== 'full',
        lines: task.snapshot.lines
          .map((l) => ({
            ...l,
            sourceQuantity: l.quantity,
            sourceLineId: l.sourceLineId,
            delivered: delivered ? l.quantity : 0,
            heldReturnRequired: delivered ? 0 : l.quantity,
          }))
          .map(({ sourceQuantity, sourceLineId, delivered, heldReturnRequired, unitDue }) => ({
            sourceQuantity,
            sourceLineId,
            delivered,
            heldReturnRequired,
            unitDue,
          })),
        collection: {
          reported: kind === 'no-answer' ? null : money(goods + shipping),
          goods: money(goods),
          shipping: money(shipping),
          unpaidShipping: money(kind === 'refused' ? task.snapshot.shippingDue.amountMinor : 0),
          shippingStatus:
            kind === 'no-answer'
              ? 'not-attempted'
              : delivered
                ? shipping
                  ? 'collected'
                  : 'not-due'
                : 'explicitly-unpaid',
        },
      };
    };
    return { s, d, task, roundId, workdayId, attemptId, start, arrival, outcome };
  };
  return { ...f, employee, worker, time, event, receive, received };
}
