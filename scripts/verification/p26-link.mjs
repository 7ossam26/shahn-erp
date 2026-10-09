import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

if (process.env.APP_ENV !== 'test' || process.env.P26_APPROVED_ISOLATION !== 'true')
  throw Error('P26_APPROVED_ISOLATED_LINK_REQUIRED');
const state = JSON.parse(readFileSync('/run/p26/pilot-state.json', 'utf8'));
const session = JSON.parse(readFileSync('/run/p26/erp-admin-session.json', 'utf8'));
const browser = JSON.parse(readFileSync('/run/p26/erp-admin-browser.json', 'utf8'));
const cookie = browser.cookies
  .filter((c) => c.name === 'erp_session')
  .map((c) => c.name + '=' + c.value)
  .join('; ');
const actionPath = '/run/p26/link-commands.json';
if (!existsSync(actionPath)) {
  const envelope = (input) => ({
    schemaVersion: 1,
    companyId: state.companyId,
    commandId: randomUUID(),
    ...input,
  });
  writeFileSync(
    actionPath,
    JSON.stringify(
      [
        envelope({ type: 'integration.setup', selector: 'p26-live-pilot' }),
        envelope({
          type: 'integration.queue',
          operationId: 'integration.rotateSigningKey',
          nativeId: state.companyId,
          expectedVersion: 0,
          payload: { keyId: 'p26-live', overlapSeconds: 3600 },
        }),
        envelope({
          type: 'integration.queue',
          operationId: 'integration.configureWebhook',
          nativeId: state.companyId,
          expectedVersion: 0,
          payload: { url: state.callbackUrl, enabled: true, expectedRevision: 0 },
        }),
        ...Object.entries(state.branches).map(([name, id]) =>
          envelope({
            type: 'integration.queue',
            operationId: 'branch.provision',
            nativeId: id,
            expectedVersion: 0,
            payload: { name: 'P26 الفرع ' + name, enabled: true, location: null },
          }),
        ),
      ],
      null,
      2,
    ),
    { mode: 0o600 },
  );
}
const commands = JSON.parse(readFileSync(actionPath, 'utf8'));
const evidence = {
  boundary:
    'Actual native durable source commands, canonical public acceptance and signed callback; no shipment/payment or complete P22 conformance claim',
  passed: false,
  commands: [],
  events: [],
};
async function native(path, body) {
  const response = await fetch(state.origin + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: cookie,
      ...(body
        ? {
            Origin: state.origin,
            'Content-Type': 'application/json',
            'x-csrf-token': session.csrfToken,
          }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw Error('P26_NATIVE_LINK_HTTP_' + response.status);
  return response.json();
}
try {
  for (const command of commands) {
    const result = await native('/api/v1/integration/commands', command);
    if (!isDeepStrictEqual(await native('/api/v1/integration/commands', command), result))
      throw Error('P26_NATIVE_COMMAND_REPLAY_CHANGED');
    if (result.actionId) {
      let final;
      for (let i = 0; i < 120; i++) {
        const view = await native('/api/v1/integration?companyId=' + state.companyId);
        final = view.commands.find((c) => c.actionId === result.actionId);
        if (final?.state === 'accepted') break;
        if (final && ['rejected', 'review-required', 'configuration-blocked'].includes(final.state))
          throw Error('P26_PUBLIC_LINK_COMMAND_FAILED');
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (final?.state !== 'accepted') throw Error('P26_PUBLIC_LINK_TIMEOUT');
      evidence.commands.push({
        commandId: command.commandId,
        actionId: result.actionId,
        operationId: command.operationId,
        state: final.state,
      });
    }
  }
  let view;
  for (let i = 0; i < 120; i++) {
    view = await native('/api/v1/integration?companyId=' + state.companyId);
    if (view.events.length >= 3) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (view.events.length < 3) throw Error('P26_SIGNED_PUBLIC_CALLBACK_UNOBSERVED');
  evidence.events = view.events.map((e) => ({
    eventId: e.eventId,
    eventType: e.eventType,
    aggregateId: e.aggregateId,
    sequence: e.sequence,
    applicationState: e.applicationState,
  }));
  evidence.checkpoints = view.checkpoints;
  evidence.branchBindings = view.bindings.filter((b) => b.entity === 'branch');
  if (
    evidence.branchBindings.length !== 3 ||
    evidence.branchBindings.some((b) => !b.resourceId || b.acceptedRevision !== '1')
  )
    throw Error('P26_BRANCH_BINDING_ACCEPTANCE_MISMATCH');
  evidence.passed = true;
} catch (error) {
  evidence.failure =
    error instanceof Error && /^P26_[A-Z_]+[0-9]*$/.test(error.message)
      ? error.message
      : 'P26_LINK_OPERATION_FAILED';
  process.exitCode = 1;
} finally {
  writeFileSync('/run/p26/evidence/public-link.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}
