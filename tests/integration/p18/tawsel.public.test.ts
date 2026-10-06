import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import {
  validSnapshotSemantics,
  type SourceEnvelope,
  type SourceSnapshot,
} from '@shahn/contracts/tawsel';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
interface Trial {
  approvedTestEnvironment: true;
  companyId: string;
  erpOrigin: string;
  sessionToken: string;
  cases: {
    name: 'goods-250' | 'prepaid-goods';
    shipmentId: string;
    snapshotCommand: SourceEnvelope;
    arrivalEventId: string;
    outcomeEventId: string;
  }[];
  rejectedSnapshots: {
    name: 'unsafe-money' | 'wrong-total' | 'invented-waiver';
    command: SourceEnvelope;
  }[];
  dispositionCommand: SourceEnvelope;
}
it('IP-AC-22 / P18-AC-06/07/08 independent public source accepts zero shipping, preserves goods outcome, rejects invalid commands and replays exact actions', async () => {
  const missing = ['TAWSEL_CONFIG_FILE', 'TAWSEL_P18_TRIAL_FILE'].filter((k) => !process.env[k]);
  if (missing.length)
    throw Error(
      'BLOCKED P18 publicIntegration: missing ' +
        missing.join(', ') +
        '. Owner: Tawsel test environment/source-service identity and P11/P14 integration owner. Actual zero-shipping intake, driver visit/outcome, signed projection and disposition acceptance cannot be certified by JSON fixtures.',
    );
  const t = JSON.parse(readFileSync(process.env['TAWSEL_P18_TRIAL_FILE']!, 'utf8')) as Trial;
  if (t.approvedTestEnvironment !== true)
    throw Error('APPROVED_DISPOSABLE_TEST_ENVIRONMENT_REQUIRED');
  const connection = integrationRuntime().connections.find((c) => c.companyId === t.companyId);
  if (!connection) throw Error('MATCHING_TEST_SOURCE_REQUIRED');
  const client = new TawselClient(connection),
    config = await client.configuration();
  expect(config.humanDelegation).toBe(false);
  expect(config.allowedOperations).toContain('intake.submitSnapshot');
  expect(config.allowedOperations).toContain('return.recordDisposition');
  expect(t.cases.map((c) => c.name).sort()).toEqual(['goods-250', 'prepaid-goods']);
  for (const c of t.cases) {
    const e = c.snapshotCommand;
    expect(e.operationId).toBe('intake.submitSnapshot');
    const source = e.payload as unknown as SourceSnapshot;
    expect(validSnapshotSemantics(source)).toBe(true);
    expect(source.shippingDue.amountMinor).toBe(0);
    const goods = c.name === 'goods-250' ? 25000 : 0;
    expect(source.totalDue.amountMinor).toBe(goods);
    const result = await client.intakeResult(e);
    expect(result?.receipt.businessStatus).toBe('accepted');
    const replay = await client.send(e, JSON.stringify(e));
    expect(replay.result).toEqual(result);
    const task = await client.intakeTask(source.externalId);
    expect(task.snapshot).toEqual(source);
    const tracking = await fetch(
      t.erpOrigin + '/api/v1/tracking/' + c.shipmentId + '?companyId=' + t.companyId,
      {
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: { Cookie: 'erp_session=' + t.sessionToken },
      },
    );
    expect(tracking.status).toBe(200);
    const d = await tracking.json();
    for (const eventId of [c.arrivalEventId, c.outcomeEventId])
      expect(
        d.timeline.some(
          (e: { id: string; origin: string }) => e.id === eventId && e.origin === 'Tawsel',
        ),
      ).toBe(true);
    expect(d.attempts.some((a: { outcome: string }) => a.outcome === 'full')).toBe(true);
    const history = await client.request(
      '/api/v1/erp/monitoring/tasks/' + task.taskId + '/history',
    );
    expect(history.status).toBe(200);
    expect((history.body as { resourceId: string }).resourceId).toBe(task.taskId);
    const outcomes = (
      history.body as {
        items: { kind: string; effective?: boolean; outcome?: unknown }[];
      }
    ).items.filter((item) => item.kind === 'outcome' && item.effective);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.outcome).toMatchObject({
      taskId: task.taskId,
      outcome: 'full',
      collection: {
        goods: { currency: 'EGP', exponent: 2, amountMinor: goods },
        shipping: { currency: 'EGP', exponent: 2, amountMinor: 0 },
        reported: { currency: 'EGP', exponent: 2, amountMinor: goods },
        shippingStatus: 'not-due',
      },
    });
  }
  expect(t.rejectedSnapshots.map((c) => c.name).sort()).toEqual([
    'invented-waiver',
    'unsafe-money',
    'wrong-total',
  ]);
  for (const c of t.rejectedSnapshots) {
    expect(c.command.operationId).toBe('intake.submitSnapshot');
    expect(c.command.context).toEqual({
      kind: 'integration',
      tenantId: connection.tenantId,
      integrationId: connection.integrationId,
    });
    const denied = await client.request(
      '/api/v1/intake/commands/intake.submitSnapshot',
      JSON.stringify(c.command),
    );
    expect([400, 409, 422]).toContain(denied.status);
  }
  expect(t.dispositionCommand.operationId).toBe('return.recordDisposition');
  const disposition = await client.returnResult(t.dispositionCommand);
  expect(disposition?.receipt.businessStatus).toBe('accepted');
  expect(
    (await client.send(t.dispositionCommand, JSON.stringify(t.dispositionCommand))).result,
  ).toEqual(disposition);
});
