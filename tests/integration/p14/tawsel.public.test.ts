import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { validateReturnDesk } from '@shahn/contracts';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
interface Trial {
  approvedTestEnvironment: true;
  companyId: string;
  erpOrigin: string;
  sessionToken: string;
  driverId: string;
  sourceBranchId: string;
  cases: {
    name: string;
    requestId: string;
    actionId: string;
    expectedReceived: number;
    expectedUnresolved: number;
    externalId?: string;
    previousCycleId?: string;
    newCycleId?: string;
    eventIds: string[];
  }[];
  driverOfferDenialBody: unknown;
  driverCorrectionDenialPath: string;
  driverCorrectionDenialBody: unknown;
}
it('independent Tawsel driver offer, source authority negatives, actual subset, echo and same-branch fresh cycle', async () => {
  const missing = ['TAWSEL_CONFIG_FILE', 'TAWSEL_P14_TRIAL_FILE'].filter((k) => !process.env[k]);
  if (missing.length)
    throw Error(
      'BLOCKED P14 publicIntegration: missing ' +
        missing.join(', ') +
        '. Requires independent test Tawsel source-return authority, real driver offer and signed delivery. Controlled fixtures cannot satisfy this gate.',
    );
  const t = JSON.parse(readFileSync(process.env['TAWSEL_P14_TRIAL_FILE']!, 'utf8')) as Trial;
  if (t.approvedTestEnvironment !== true || !t.cases?.length)
    throw Error('BLOCKED: approved human trial evidence required');
  const c = integrationRuntime().connections.find((c) => c.companyId === t.companyId);
  if (!c) throw Error('BLOCKED: matching test source required');
  const client = new TawselClient(c),
    config = await client.configuration();
  expect(config.humanDelegation).toBe(false);
  for (const op of [
    'return.confirmSubsetReceipt',
    'return.recordDisposition',
    'return.listPending',
    'return.getNativeRequest',
    'return.getNativeResult',
    'dispatch.createFromReceipt',
  ])
    expect(config.allowedOperations).toContain(op);
  // Explicit negative test payloads must be authorized disposable test-driver actions.
  for (const [path, body] of [
    ['/api/v1/returns/request', t.driverOfferDenialBody],
    [t.driverCorrectionDenialPath, t.driverCorrectionDenialBody],
  ] as const) {
    if (!path?.startsWith('/api/v1/') || !body)
      throw Error('BLOCKED: exact driver-only rejection fixtures required');
    const denied = await client.request(path, JSON.stringify(body));
    expect([401, 403]).toContain(denied.status);
  }
  await client.pendingReturns(t.driverId, t.sourceBranchId);
  for (const name of [
    'partial-subset',
    'refused-subset',
    'damaged-receipt',
    'brand-handover',
    'lost-response',
    'same-branch-redispatch',
    'wrong-branch',
    'stale-revision',
    'excess-subset',
    'correction-race',
    'disposition-race',
  ])
    expect(t.cases.some((c) => c.name === name)).toBe(true);
  for (const item of t.cases) {
    const source = await client.returnRequest(item.requestId);
    expect(source.driverId).toBe(t.driverId);
    expect(source.sourceBranchId).toBe(t.sourceBranchId);
    expect(source.items.reduce((n, i) => n + i.received, 0)).toBe(item.expectedReceived);
    expect(source.items.reduce((n, i) => n + i.unresolved, 0)).toBe(item.expectedUnresolved);
    const response = await fetch(
      t.erpOrigin + '/api/v1/returns/requests/' + item.requestId + '?companyId=' + t.companyId,
      {
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: { Cookie: 'erp_session=' + t.sessionToken },
      },
    );
    expect(response.status).toBe(200);
    const native: unknown = await response.json();
    expect(validateReturnDesk(native)).toBe(true);
    if (!validateReturnDesk(native)) throw Error('INVALID_NATIVE_RETURN');
    expect(native.items[0]!.items.reduce((n, i) => n + i.current.received, 0)).toBe(
      item.expectedReceived,
    );
    expect(item.eventIds.length).toBeGreaterThan(0);
    for (const eventId of item.eventIds) {
      const r = await fetch(
        t.erpOrigin + '/api/v1/integration/events/' + eventId + '?companyId=' + t.companyId,
        {
          headers: { Cookie: 'erp_session=' + t.sessionToken },
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
        },
      );
      expect(r.status).toBe(200);
      const detail = JSON.stringify(await r.json());
      expect(detail).toContain('applied');
    }
    if (item.name === 'same-branch-redispatch') {
      const cycles = await client.intakeCycles(item.externalId!);
      expect(cycles.some((c) => c.dispatchCycleId === item.previousCycleId)).toBe(true);
      expect(
        cycles.some(
          (c) =>
            c.dispatchCycleId === item.newCycleId &&
            c.previousDispatchCycleId === item.previousCycleId,
        ),
      ).toBe(true);
      expect(item.previousCycleId).not.toBe(item.newCycleId);
    }
  }
});
