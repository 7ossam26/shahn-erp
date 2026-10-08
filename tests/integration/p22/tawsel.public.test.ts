import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { RecoveryClient } from '../../../apps/api/src/modules/integration/recovery-client.js';
import type { AggregateIdentity } from '@shahn/contracts/tawsel';
it('reads the actual public recovery boundary with a dedicated service and identified scoped stream', async () => {
  const missing = ['TAWSEL_CONFIG_FILE', 'TAWSEL_P22_TRIAL_FILE'].filter((k) => !process.env[k]);
  if (missing.length)
    throw Error(
      'BLOCKED P22 publicIntegration: ' +
        missing.join(', ') +
        '. Dedicated source/service, issuer, separate human-driver sessions and allowed public callback are required. P18 pilot was disabled after its bounded trial. No mock substituted.',
    );
  const trial = JSON.parse(await readFile(process.env['TAWSEL_P22_TRIAL_FILE']!, 'utf8')) as {
    approvedTestEnvironment: boolean;
    companyId: string;
    aggregate: AggregateIdentity;
    afterSequence: number;
    eventId: string;
    runtimeVersion: string;
    runtimeCommit: string | null;
    humanDriverSessions: number;
    callbackUrl: string;
    issuerProof: string;
  };
  if (
    trial.approvedTestEnvironment !== true ||
    !trial.runtimeVersion ||
    trial.humanDriverSessions < 2 ||
    !trial.issuerProof
  )
    throw Error('BLOCKED: identified actual runtime and human/issuer setup required.');
  const c = integrationRuntime().connections.find((c) => c.companyId === trial.companyId);
  if (!c || !c.allowedCallbackUrls.includes(trial.callbackUrl))
    throw Error('BLOCKED: allowed callback and matching service configuration required.');
  const client = new RecoveryClient(c);
  expect((await client.configuration()).humanDelegation).toBe(false);
  expect((await client.deliveries(100)).body.projectionStatus).toBe('unknown');
  expect((await client.delivery(trial.eventId, 100)).body.delivery.eventId).toBe(trial.eventId);
  expect(
    (await client.replay(trial.aggregate, trial.afterSequence, 100)).body.projectionStatus,
  ).toBe('unknown');
  expect((await client.reconciliation(trial.aggregate)).body.history).toBe('current-state-only');
  await client.appliedCheckpoint(trial.aggregate);
});
