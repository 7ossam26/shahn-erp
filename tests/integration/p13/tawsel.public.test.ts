import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
interface Trial {
  approvedTestEnvironment: true;
  erpOrigin: string;
  companyId: string;
  sessionToken: string;
  cases: {
    name: string;
    shipmentId: string;
    taskId: string;
    eventIds: string[];
    expectedOutcome: string;
  }[];
}
it('independent Tawsel human execution, signed receipt and authorized ERP tracking evidence', async () => {
  const missing = ['TAWSEL_CONFIG_FILE', 'TAWSEL_P13_TRIAL_FILE'].filter((k) => !process.env[k]);
  if (missing.length)
    throw Error(
      'BLOCKED P13 publicIntegration: missing ' +
        missing.join(', ') +
        '. Requires an approved independent Tawsel, real driver session and signed callback. Controlled HTTP fixtures do not substitute for this gate.',
    );
  const t = JSON.parse(readFileSync(process.env['TAWSEL_P13_TRIAL_FILE']!, 'utf8')) as Trial;
  if (t.approvedTestEnvironment !== true || !t.cases?.length)
    throw Error('BLOCKED: approved human trial evidence required');
  const connection = integrationRuntime().connections.find((c) => c.companyId === t.companyId);
  if (!connection) throw Error('BLOCKED: matching test source required');
  expect((await new TawselClient(connection).configuration()).humanDelegation).toBe(false);
  for (const name of [
    'arrival-no-answer',
    'full',
    'partial',
    'retry-other-driver',
    'correction',
    'waived-replacement',
  ])
    expect(t.cases.some((c) => c.name === name)).toBe(true);
  for (const c of t.cases) {
    const r = await fetch(
      t.erpOrigin + '/api/v1/tracking/' + c.shipmentId + '?companyId=' + t.companyId,
      {
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: { Cookie: 'erp_session=' + t.sessionToken },
      },
    );
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.attempts.some((a: { outcome: string }) => a.outcome === c.expectedOutcome)).toBe(true);
    expect(c.eventIds.length).toBeGreaterThan(0);
    for (const eventId of c.eventIds)
      expect(
        d.timeline.some(
          (e: { id: string; origin: string }) => e.id === eventId && e.origin === 'Tawsel',
        ),
      ).toBe(true);
    expect(d.evidenceReceivedOnly).toBe(true);
    const source = await new TawselClient(connection).request(
      '/api/v1/erp/monitoring/tasks/' + c.taskId + '/history',
    );
    expect(source.status).toBe(200);
    expect((source.body as { resourceId: string }).resourceId).toBe(c.taskId);
  }
});
