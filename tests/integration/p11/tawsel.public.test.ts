import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import type { IntegrationCommand, IntegrationView } from '@shahn/contracts';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
interface Trial {
  approvedTestEnvironment: true;
  erpOrigin: string;
  companyId: string;
  sessionToken: string;
  csrfToken: string;
  commands: IntegrationCommand[];
  eventId: string;
}
it('real independently running Tawsel configuration, native provisioning and signed callback acceptance', async () => {
  const missing = ['TAWSEL_CONFIG_FILE', 'TAWSEL_P11_TRIAL_FILE'].filter((k) => !process.env[k]);
  if (missing.length)
    throw Error(
      'BLOCKED P11 publicIntegration: required variables ' +
        missing.join(', ') +
        '. Supply an approved independent test Tawsel/issuer and reachable allowlisted HTTPS callback. No mocks substituted.',
    );
  const trial = JSON.parse(readFileSync(process.env['TAWSEL_P11_TRIAL_FILE']!, 'utf8')) as Trial;
  if (trial.approvedTestEnvironment !== true || !trial.commands?.length || !trial.eventId)
    throw Error('BLOCKED: approved test commands and real sender eventId are required.');
  const c = integrationRuntime().connections.find((c) => c.companyId === trial.companyId);
  if (!c) throw Error('BLOCKED: matching test source connection required.');
  const config = await new TawselClient(c).configuration();
  expect(config.humanDelegation).toBe(false);
  const native = async (path: string, body?: unknown) => {
    const r = await fetch(trial.erpOrigin + '/api/v1/integration' + path, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        Cookie: 'erp_session=' + trial.sessionToken,
        ...(body
          ? {
              'Content-Type': 'application/json',
              Origin: trial.erpOrigin,
              'X-CSRF-Token': trial.csrfToken,
            }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) throw Error('Real ERP test HTTP ' + r.status);
    return r.json();
  };
  for (const operation of ['branch.provision', 'user.provision', 'driver.provisionReference'])
    expect(trial.commands.some((x) => x.operationId === operation)).toBe(true);
  for (const command of trial.commands) {
    expect(command.companyId).toBe(trial.companyId);
    const result = await native('/commands', command);
    expect((await native('/commands', command)).actionId).toBe(result.actionId);
    let status;
    for (let i = 0; i < 40; i++) {
      status = await native('/commands/' + result.actionId + '?companyId=' + trial.companyId);
      if (status.state === 'accepted') break;
      if (['rejected', 'review-required', 'configuration-blocked'].includes(status.state))
        throw Error('Real source command did not pass: ' + status.state);
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(status.state).toBe('accepted');
  }
  const view = (await native('?companyId=' + trial.companyId)) as IntegrationView;
  expect(view.events.some((e) => e.eventId === trial.eventId)).toBe(true);
  expect(
    view.bindings.some(
      (b) => b.entity === 'user' && b.issuerStatus === 'ready' && b.enabled === true,
    ),
  ).toBe(true);
  // Real replay/lost-ack/key-rotation drills remain separately recorded manual acceptance gates.
});
