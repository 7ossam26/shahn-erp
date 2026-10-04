import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import {
  validateDispatchDetail,
  type DispatchCommand,
  type DispatchDetail,
  type DispatchResult,
} from '@shahn/contracts';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
interface Trial {
  approvedTestEnvironment: true;
  erpOrigin: string;
  companyId: string;
  sessionToken: string;
  csrfToken: string;
  cases: {
    name: 'cod' | 'prepaid-goods' | 'fully-prepaid' | 'approved-waiver';
    prepare: Extract<DispatchCommand, { type: 'dispatch.prepare' }>;
    goodsMinor: number;
    shippingMinor: number;
    totalMinor: number;
  }[];
}
it('real independent Tawsel accepts native snapshots, preparation and physical batch receipt', async () => {
  const missing = ['TAWSEL_CONFIG_FILE', 'TAWSEL_P12_TRIAL_FILE'].filter((k) => !process.env[k]);
  if (missing.length)
    throw Error(
      'BLOCKED P12 publicIntegration: ' +
        missing.join(', ') +
        '. Approved independent Tawsel/issuer, native test ERP/worker and physically controlled trial parcels required. Fixture HTTP is not a substitute.',
    );
  const t = JSON.parse(readFileSync(process.env['TAWSEL_P12_TRIAL_FILE']!, 'utf8')) as Trial;
  if (t.approvedTestEnvironment !== true || !Array.isArray(t.cases))
    throw Error('BLOCKED: explicit approved test trial required');
  expect(t.cases.map((c) => c.name).sort()).toEqual([
    'approved-waiver',
    'cod',
    'fully-prepaid',
    'prepaid-goods',
  ]);
  const connection = integrationRuntime().connections.find((c) => c.companyId === t.companyId);
  if (!connection) throw Error('BLOCKED: matching independent test connection required');
  const remote = new TawselClient(connection);
  await remote.configuration();
  const native = async (path: string, body?: unknown) => {
    const r = await fetch(t.erpOrigin + '/api/v1/dispatch' + path, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        Cookie: 'erp_session=' + t.sessionToken,
        ...(body
          ? { 'Content-Type': 'application/json', Origin: t.erpOrigin, 'X-CSRF-Token': t.csrfToken }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) throw Error('Real native dispatch HTTP ' + r.status);
    return r.json();
  };
  const until = async (id: string, state: string) => {
    let d: DispatchDetail | undefined;
    for (let n = 0; n < 40; n++) {
      const v = await native('/' + id + '?companyId=' + t.companyId);
      if (!validateDispatchDetail(v)) throw Error('INVALID_REAL_DETAIL');
      d = v;
      if (d.state === state) break;
      if (['rejected', 'review-required'].includes(d.state))
        throw Error('REAL_DISPATCH_' + d.state);
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(d?.state).toBe(state);
    return d!;
  };
  for (const c of t.cases) {
    expect(c.prepare.companyId).toBe(t.companyId);
    expect(c.prepare.items).toHaveLength(1);
    const r = (await native('/commands', c.prepare)) as DispatchResult;
    expect(await native('/commands', c.prepare)).toEqual(r);
    const prepared = await until(r.intentId, 'prepared'),
      shipmentId = prepared.items[0]!.shipmentId;
    const task = await remote.intakeTask('shipment:' + shipmentId);
    expect(task.state).toBe('prepared');
    expect(task.receivedAt).toBeNull();
    expect(
      task.snapshot.lines.reduce(
        (sum, l) => sum + BigInt(l.quantity) * BigInt(l.unitDue.amountMinor),
        0n,
      ),
    ).toBe(BigInt(c.goodsMinor));
    expect(task.snapshot.shippingDue.amountMinor).toBe(c.shippingMinor);
    expect(task.snapshot.totalDue.amountMinor).toBe(c.totalMinor);
    await native('/commands', {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId: t.companyId,
      type: 'dispatch.receive',
      intentId: prepared.id,
      expectedVersion: prepared.version,
      receiptAsserted: true,
    });
    const accepted = await until(r.intentId, 'accepted');
    expect((await remote.intakeTask('shipment:' + shipmentId)).state).toBe('held');
    const action = accepted.actions.find((a) => a.operation === 'assignment.receiveBatch')!;
    expect(action.state).toBe('accepted');
    expect(
      (await native('/' + r.intentId + '?companyId=' + t.companyId)).items[0].assignmentRevision,
    ).toBe(accepted.items[0]!.assignmentRevision);
  }
});
