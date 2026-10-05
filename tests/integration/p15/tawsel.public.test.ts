import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { validateIntakeTask, tawselValidator } from '@shahn/contracts/tawsel';

interface Trial {
  approvedTestEnvironment: true;
  erpOrigin: string;
  companyId: string;
  sessionToken: string;
  sourceBranchId: string;
  destinationBranchId: string;
  destinationExternalBranchId: string;
  nativeDriverId: string;
  tawselDriverId: string;
  activeRoundId: string;
  manifestId: string;
  shipmentExternalId: string;
}
it('shows independent source-filtered active-round evidence and first B snapshot after native arrival', async () => {
  const missing = ['TAWSEL_CONFIG_FILE', 'TAWSEL_P15_TRIAL_FILE'].filter(
    (key) => !process.env[key],
  );
  if (missing.length)
    throw Error(
      'BLOCKED P15 publicIntegration: missing ' +
        missing.join(', ') +
        '. Approved independent Tawsel runtime, real driver round and first-dispatch trial are required.',
    );
  const trial = JSON.parse(readFileSync(process.env['TAWSEL_P15_TRIAL_FILE']!, 'utf8')) as Trial;
  if (
    trial.approvedTestEnvironment !== true ||
    !trial.activeRoundId ||
    !trial.manifestId ||
    !trial.shipmentExternalId
  )
    throw Error(
      'BLOCKED P15 publicIntegration: complete approved human/first-dispatch trial evidence required',
    );
  const connection = integrationRuntime().connections.find((c) => c.companyId === trial.companyId);
  if (!connection)
    throw Error('BLOCKED P15 publicIntegration: matching source configuration required');
  const source = new TawselClient(connection);
  const monitor = await source.request(
    '/api/v1/erp/monitoring/drivers/' + trial.tawselDriverId + '?limit=100',
  );
  expect(monitor.status).toBe(200);
  expect(tawselValidator('monitoring.schema.json#/$defs/Snapshot')(monitor.body)).toBe(true);
  const snapshot = monitor.body as {
    driverId: string;
    round: { roundId: string } | null;
    freshness: { receivedEvidenceOnly: boolean; deviceContactAt: null };
  };
  expect(snapshot.driverId).toBe(trial.tawselDriverId);
  expect(snapshot.round?.roundId).toBe(trial.activeRoundId);
  expect(snapshot.freshness).toMatchObject({ receivedEvidenceOnly: true, deviceContactAt: null });
  const api = async (path: string) => {
    const response = await fetch(trial.erpOrigin + path, {
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: { Cookie: 'erp_session=' + trial.sessionToken },
    });
    expect(response.status).toBe(200);
    return response.json();
  };
  const carriers = (await api(
    '/api/v1/goods-transfers/carriers?' +
      new URLSearchParams({
        companyId: trial.companyId,
        sourceBranchId: trial.sourceBranchId,
      }),
  )) as { items: { id: string; round: string | null; status: string }[] };
  expect(carriers.items.find((x) => x.id === trial.nativeDriverId)).toMatchObject({
    round: trial.activeRoundId,
  });
  const manifest = (await api(
    '/api/v1/goods-transfers/' + trial.manifestId + '?companyId=' + trial.companyId,
  )) as {
    state: string;
    destinationBranchId: string;
    handoverAt: string | null;
    receipts: { kind: string }[];
  };
  expect(manifest.destinationBranchId).toBe(trial.destinationBranchId);
  expect(manifest.handoverAt).not.toBeNull();
  expect(manifest.receipts.some((r) => r.kind === 'destination')).toBe(true);
  const task = await source.request(
    '/api/v1/intake/task?' + new URLSearchParams({ externalId: trial.shipmentExternalId }),
  );
  expect(task.status).toBe(200);
  expect(validateIntakeTask(task.body)).toBe(true);
  expect(
    (task.body as { snapshot: { sourceBranchExternalId: string } }).snapshot.sourceBranchExternalId,
  ).toBe(trial.destinationExternalBranchId);
});
