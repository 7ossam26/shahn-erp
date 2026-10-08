import { it, expect } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import { createPool } from '@shahn/database';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { signatureFor } from '../../../apps/api/src/modules/integration/signature-verifier.js';
import { normalizedRecoveryState } from '../../../scripts/verification/p22-restore.js';
import { restoreIsolatedRecoveryDatabase } from '../../../scripts/verification/p22-restore.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { ProjectionWorker } from '../../../apps/api/src/modules/execution/projection-worker.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { canonicalTawselJson, type SourceEnvelope } from '@shahn/contracts/tawsel';

async function setup() {
  const file = process.env['TAWSEL_P22_TRIAL_FILE'];
  if (!file) throw Error('BLOCKED P22 live scripts: identified approved test trial required.');
  const trial = JSON.parse(await readFile(file, 'utf8')) as {
    approvedTestEnvironment: boolean;
    companyId: string;
    callbackUrl: string;
    aggregate: { type: string; id: string };
    nativeOrigin: string;
    nativeDatabaseReference: string;
  };
  if (!trial.approvedTestEnvironment || !trial.nativeOrigin.startsWith('http://127.0.0.1:'))
    throw Error('P22_APPROVED_ISOLATED_NATIVE_TRIAL_REQUIRED');
  const native = JSON.parse(
    await readFile(resolve(dirname(file), trial.nativeDatabaseReference), 'utf8'),
  ) as {
    databaseUrl: string;
    databaseName: string;
    admin: { token: string; csrfToken: string };
    identityConfig: Parameters<typeof createApplication>[1];
  };
  if (
    new URL(native.databaseUrl).hostname !== '127.0.0.1' ||
    !native.databaseName.includes('shahn-p03-test-')
  )
    throw Error('P22_OWNED_TEST_DATABASE_REQUIRED');
  const c = integrationRuntime().connections.find((c) => c.companyId === trial.companyId);
  if (!c || !c.allowedCallbackUrls.includes(trial.callbackUrl))
    throw Error('P22_MATCHING_CALLBACK_SCOPE_REQUIRED');
  return { file, trial, native, c, pool: createPool(native.databaseUrl) };
}
it('runs native durable replay, reconciliation and checkpoint reporting against actual Tawsel without changing committed business identities', async () => {
  const s = await setup();
  const nativeRead = async (path: string, body?: object) => {
    const r = await fetch(s.trial.nativeOrigin + path, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      headers: {
        Cookie: 'erp_session=' + s.native.admin.token,
        ...(body
          ? {
              'content-type': 'application/json',
              Origin: s.trial.nativeOrigin,
              'x-csrf-token': s.native.admin.csrfToken,
            }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    expect(r.ok).toBe(true);
    return r.json() as Promise<Record<string, unknown>>;
  };
  const business = async () =>
    Object.fromEntries(
      Object.entries(await normalizedRecoveryState(s.pool, s.trial.companyId)).filter(
        ([k]) => !k.startsWith('integration.'),
      ),
    );
  try {
    const before = await business(),
      jobs = [];
    for (const kind of ['replay', 'reconcile']) {
      const cmd = {
        schemaVersion: 1,
        companyId: s.trial.companyId,
        commandId: randomUUID(),
        type: 'recovery.' + kind,
        aggregateType: s.trial.aggregate.type,
        aggregateId: s.trial.aggregate.id,
      };
      const reply = await nativeRead('/api/v1/integration/recovery/commands', cmd);
      expect(await nativeRead('/api/v1/integration/recovery/commands', cmd)).toEqual(reply);
      let detail: Record<string, unknown> = {};
      for (let i = 0; i < 80; i++) {
        detail = await nativeRead(
          '/api/v1/integration/recovery/jobs/' + reply.jobId + '?companyId=' + s.trial.companyId,
        );
        const state = (detail['job'] as { state: string }).state;
        if (state === 'complete') break;
        expect(['pending', 'running', 'retryable']).toContain(state);
        await new Promise((r) => setTimeout(r, 250));
      }
      expect((detail['job'] as { state: string }).state).toBe('complete');
      jobs.push(detail);
    }
    const report = await nativeRead('/api/v1/integration/recovery/commands', {
      schemaVersion: 1,
      companyId: s.trial.companyId,
      commandId: randomUUID(),
      type: 'recovery.report',
      aggregateType: s.trial.aggregate.type,
      aggregateId: s.trial.aggregate.id,
    });
    let state = '';
    for (let i = 0; i < 80; i++) {
      state = (
        await s.pool.query('SELECT state FROM integration.source_command WHERE action_id=$1', [
          report.actionId,
        ])
      ).rows[0]?.state;
      if (state === 'accepted') break;
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(state).toBe('accepted');
    expect(await business()).toEqual(before);
    await writeFile(
      'docs/verification/P22/live-connected-script.json',
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          jobs,
          reportActionId: report.actionId,
          businessBefore: before,
          businessAfter: await business(),
          equal: true,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await s.pool.end();
  }
});
it('restores the actual isolated ERP trial and repeats original live source actions and signed events with posted receipt, payout and hold preserved', async () => {
  const s = await setup();
  try {
    expect(
      Number((await s.pool.query('SELECT count(*) n FROM finance.remittance')).rows[0].n),
    ).toBe(1);
    expect(
      Number((await s.pool.query('SELECT count(*) n FROM finance.brand_payout')).rows[0].n),
    ).toBe(1);
    const originals = (
      await s.pool.query<{ raw_body: Buffer }>(
        `SELECT COALESCE(w.raw_body,i.raw_body) raw_body FROM integration.inbox i LEFT JOIN integration.webhook_bytes w USING(company_id,source_id,event_id) WHERE i.company_id=$1 ORDER BY i.aggregate_type,i.aggregate_id,i.recipient_sequence`,
        [s.trial.companyId],
      )
    ).rows;
    const actions = (
      await s.pool.query<{ request_body: string; remote_result: unknown }>(
        "SELECT request_body,remote_result FROM integration.source_command WHERE company_id=$1 AND state='accepted' AND operation_id<>'integration.bindSource' ORDER BY created_at",
        [s.trial.companyId],
      )
    ).rows;
    let actionReplayCount = 0,
      eventRedeliveryCount = 0;
    const result = await restoreIsolatedRecoveryDatabase(
      { name: s.native.databaseName, url: s.native.databaseUrl, pool: s.pool },
      s.trial.companyId,
      async (pool, url) => {
        const app = await createApplication(
          { environment: 'test', runtimeUrl: url, migrationUrl: url },
          s.native.identityConfig,
          integrationRuntime(),
        );
        try {
          await app.listen(0, '127.0.0.1');
          const origin = await app.getUrl(),
            worker = new ProjectionWorker(pool),
            source = new TawselClient(s.c);
          for (const action of actions) {
            const r = await source.send(
              JSON.parse(action.request_body) as SourceEnvelope,
              action.request_body,
            );
            expect(canonicalTawselJson(r.result)).toBe(canonicalTawselJson(action.remote_result));
            actionReplayCount++;
          }
          for (const original of [...originals, ...originals]) {
            const raw = original.raw_body,
              ts = String(Date.now()),
              key = s.c.initialKeyId!,
              scope = { tenantId: s.c.tenantId, integrationId: s.c.integrationId };
            const r = await fetch(origin + '/api/v1/consumer/events', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Tawsel-Tenant-Id': scope.tenantId,
                'X-Tawsel-Integration-Id': scope.integrationId,
                'X-Tawsel-Key-Id': key,
                'X-Tawsel-Delivery-Timestamp': ts,
                'X-Tawsel-Signature': signatureFor(raw, scope, key, ts, s.c.signingKeys[key]!),
              },
              body: raw.toString('utf8'),
            });
            expect(r.status).toBe(200);
            expect((await r.json()).acknowledgement).toBe('received');
            eventRedeliveryCount++;
            for (let n = 0; n < 30; n++) if (!(await worker.runOne())) break;
          }
        } finally {
          await app.close();
        }
      },
    );
    expect(result.equal).toBe(true);
    await writeFile(
      'docs/verification/P22/live-restore-comparison.json',
      JSON.stringify(
        {
          ...result,
          actionReplayCount,
          eventRedeliveryCount,
          sourceProvenance:
            'Actual accepted public Tawsel source actions replayed exactly against the live service; original live event bodies re-signed by the scoped test harness and redelivered to a freshly created restored ERP HTTP API/worker. ERP OS process restart is separately observed; no Tawsel or issuer restart claimed.',
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await s.pool.end();
  }
});
it('checks real service authorization and bounded request rejection, including distinct real human driver sessions', async () => {
  const s = await setup();
  try {
    const first = JSON.parse(
      await readFile(resolve(dirname(s.file), 'driver-session.json'), 'utf8'),
    );
    const second = JSON.parse(
      await readFile(resolve(dirname(s.file), 'second-driver-session.json'), 'utf8'),
    );
    expect(first.context.access.driverId).not.toBe(second.context.access.driverId);
    const cases = [];
    for (const [path, authorized, expected] of [
      ['/api/v1/integration/deliveries?limit=1', false, [401, 403]],
      ['/api/v1/integration/deliveries?limit=0', true, [400]],
      ['/api/v1/integration/deliveries?limit=101', true, [400]],
      // Delivery lookup deliberately returns a scope denial for an unowned ID.
      ['/api/v1/integration/deliveries/' + randomUUID(), true, [403]],
      [
        '/api/v1/integration/replay?aggregateType=global&aggregateId=' +
          randomUUID() +
          '&afterSequence=0&limit=1',
        true,
        [400],
      ],
      [
        '/api/v1/integration/reconciliation?aggregateType=task&aggregateId=' + randomUUID(),
        true,
        [403],
      ],
      ['/api/session/context?kind=company', true, [401]],
    ] as const) {
      const r = await fetch(s.c.baseUrl + path, {
        redirect: 'error',
        headers: authorized ? { authorization: 'Bearer ' + s.c.serviceBearer } : {},
      });
      expect(expected, path).toContain(r.status);
      cases.push({ path, status: r.status, serviceAuthorized: authorized });
    }
    await writeFile(
      'docs/verification/P22/live-authority.json',
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          distinctDriverIds: [first.context.access.driverId, second.context.access.driverId],
          cases,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await s.pool.end();
  }
});
it('verifies actual TLS proxy body limit and signed receiver negatives using original live event bytes', async () => {
  const s = await setup();
  try {
    const original = (
      await s.pool.query(
        'SELECT raw_body FROM integration.inbox WHERE company_id=$1 AND key_id IS NOT NULL ORDER BY received_at LIMIT 1',
        [s.trial.companyId],
      )
    ).rows[0]?.raw_body as Buffer;
    expect(original).toBeDefined();
    const key = s.c.initialKeyId!,
      secret = s.c.signingKeys[key]!,
      scope = { tenantId: s.c.tenantId, integrationId: s.c.integrationId };
    const headers = (raw: Buffer, ts = String(Date.now())) => ({
      'Content-Type': 'application/json',
      'X-Tawsel-Tenant-Id': scope.tenantId,
      'X-Tawsel-Integration-Id': scope.integrationId,
      'X-Tawsel-Key-Id': key,
      'X-Tawsel-Delivery-Timestamp': ts,
      'X-Tawsel-Signature': signatureFor(raw, scope, key, ts, secret),
    });
    const send = (raw: Buffer, h: Record<string, string | string[]>) =>
      new Promise<number>((accept, reject) => {
        const req = httpsRequest(
          s.trial.callbackUrl,
          {
            method: 'POST',
            headers: { ...h, 'Content-Length': String(raw.length) },
            timeout: 30000,
          },
          (r) => {
            r.resume();
            r.on('end', () => accept(r.statusCode!));
          },
        );
        req.on('error', reject);
        req.on('timeout', () => req.destroy(Error('PUBLIC_CALLBACK_TIMEOUT')));
        req.end(raw);
      });
    const results: { name: string; status: number; bytes: number; sha256: string }[] = [];
    const check = async (
      name: string,
      raw: Buffer,
      h: Record<string, string | string[]>,
      expected: number,
    ) => {
      const status = await send(raw, h);
      expect(status, name).toBe(expected);
      results.push({
        name,
        status,
        bytes: raw.length,
        sha256: createHash('sha256').update(raw).digest('hex'),
      });
    };
    await check('original-byte duplicate', original, headers(original), 200);
    await check(
      'duplicate security header',
      original,
      { ...headers(original), 'X-Tawsel-Key-Id': [key, key] },
      401,
    );
    await check(
      'wrong scope',
      original,
      { ...headers(original), 'X-Tawsel-Integration-Id': randomUUID() },
      401,
    );
    await check(
      'wrong key selector',
      original,
      { ...headers(original), 'X-Tawsel-Key-Id': 'p22-unknown' },
      401,
    );
    await check(
      'tampered bytes',
      Buffer.concat([original, Buffer.from(' ')]),
      headers(original),
      401,
    );
    await check(
      'outside clock window',
      original,
      headers(original, String(Date.now() - 301000)),
      401,
    );
    await check(
      'inside clock window',
      original,
      headers(original, String(Date.now() - 299000)),
      200,
    );
    const wrong = Buffer.from(
      JSON.stringify({ ...JSON.parse(original.toString('utf8')), payloadVersion: '2.0.0' }),
    );
    await check('unsupported version', wrong, headers(wrong), 422);
    const atLimit = Buffer.concat([original, Buffer.alloc(2 * 1024 * 1024 - original.length, 32)]);
    await check(
      '2 MiB signed body reaches receiver collision check',
      atLimit,
      headers(atLimit),
      409,
    );
    const above = Buffer.concat([atLimit, Buffer.from(' ')]);
    await check('2 MiB plus one rejected by public proxy', above, headers(above), 413);
    await writeFile(
      'docs/verification/P22/live-proxy-security.json',
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          scope:
            'Generated transport variants of original live event; duplicate/collision causes no posting. Boundary unit test covers exact ±300000ms; public clock tests allow network transit.',
          results,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await s.pool.end();
  }
});
