import { randomUUID } from 'node:crypto';
import { createServer, request } from 'node:http';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { createPool, migrate, readMigrations, transaction, sourceByCompany } from '@shahn/database';
import {
  validateIntegrationView,
  validateIntegrationError,
  type IntegrationCommand,
} from '@shahn/contracts';
import type { SourceEnvelope, ActionResult } from '@shahn/contracts/tawsel';
import { createApplication } from '../../../apps/api/src/app.js';
import { signatureFor } from '../../../apps/api/src/modules/integration/signature-verifier.js';
import {
  SourceCommandWorker,
  recordProvisioningStatus,
} from '../../../apps/api/src/modules/integration/source-command.service.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { integrationFixture, acceptedResult, senderFixture, validFixtures } from './fixtures.js';
import { accessFixture } from '../../support/access.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof integrationFixture>>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string;
const run = (input: Partial<IntegrationCommand>) =>
  f.commands.execute(f.admin.token, {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'integration.queue',
    ...input,
  } as IntegrationCommand);
function signed(raw: Buffer, key = 'trial', secret = f.secret) {
  const timestamp = String(Date.now());
  return {
    'Content-Type': 'application/json',
    'X-Tawsel-Tenant-Id': f.event.tenantId,
    'X-Tawsel-Integration-Id': f.event.recipientIntegrationId,
    'X-Tawsel-Key-Id': key,
    'X-Tawsel-Delivery-Timestamp': timestamp,
    'X-Tawsel-Signature': signatureFor(
      raw,
      { tenantId: f.event.tenantId, integrationId: f.event.recipientIntegrationId },
      key,
      timestamp,
      secret,
    ),
  };
}
const receive = (raw: Buffer, headers = signed(raw), base = origin) =>
  fetch(base + '/api/v1/consumer/events', { method: 'POST', headers, body: new Uint8Array(raw) });
const branch = (id = f.a, version = 0): Partial<IntegrationCommand> => ({
  nativeId: id,
  expectedVersion: version,
  operationId: 'branch.provision',
  payload: { name: id === f.a ? 'الفرع أ' : 'الفرع ب', enabled: true, location: null },
});
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 14));
  // Upgrade an existing company/user/history database; migration never labels native records synced.
  await db.pool.query(
    `INSERT INTO access.company(id,code,name) VALUES($1,'upgrade-p11','شركة قبل الترقية')`,
    [randomUUID()],
  );
  await migrate(db.pool);
  f = await integrationFixture(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
    f.runtime,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
}, 90000);
afterAll(async () => {
  await app?.close();
  await db?.dispose();
}, 60000);
it('fresh and upgrade migrations preserve old native identities and add no fake synchronized bindings', async () => {
  expect(
    (await db.pool.query('SELECT count(*)::int AS n FROM integration.binding')).rows[0].n,
  ).toBe(0);
  expect(
    (await db.pool.query(`SELECT count(*)::int AS n FROM access.company WHERE code='upgrade-p11'`))
      .rows[0].n,
  ).toBe(1);
  await db.pool.query('CREATE DATABASE p11_fresh');
  const url = new URL(db.url);
  url.pathname = '/p11_fresh';
  const pool = createPool(url.toString());
  try {
    expect((await migrate(pool)).state).toBe('current');
  } finally {
    await pool.end();
  }
});
it('upgrades existing native users and committed command/outbox history without relabelling them synchronized', async () => {
  await db.pool.query('CREATE DATABASE p11_upgrade_history');
  const url = new URL(db.url);
  url.pathname = '/p11_upgrade_history';
  const pool = createPool(url.toString());
  try {
    await migrate(pool, (await readMigrations()).slice(0, 14));
    const native = await accessFixture(pool),
      record = randomUUID(),
      work = randomUUID();
    await pool.query(
      `INSERT INTO command_record(id,company_id,principal_id,command_id,family,kind,capability,payload_digest,payload,result,state) VALUES($1,$2,$3,$4,'upgrade-test','kernel.upgrade-test','access.users',encode(sha256(convert_to('{}','UTF8')),'hex'),'{}','{"retained":true}','completed')`,
      [record, native.company, native.admin.id, randomUUID()],
    );
    await pool.query(
      `INSERT INTO work_item(id,company_id,principal_id,command_record_id,entity_id,entity_version,lane,correlation_id,payload,payload_digest,kind,source_identity) VALUES($1,$2,$3,$4,$5,1,'source',$5,'{}',encode(sha256(convert_to('{}','UTF8')),'hex'),'upgrade.source','old-intent')`,
      [work, native.company, native.admin.id, record, randomUUID()],
    );
    const snapshot = async () =>
      JSON.stringify(
        (
          await pool.query(
            `SELECT (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM access.ordinary_user u) AS users,(SELECT to_jsonb(c) FROM command_record c WHERE id=$1) AS command,(SELECT to_jsonb(w) FROM work_item w WHERE id=$2) AS work`,
            [record, work],
          )
        ).rows[0],
      );
    const before = await snapshot();
    await migrate(pool);
    expect(await snapshot()).toBe(before);
    expect((await pool.query('SELECT count(*)::int AS n FROM integration.binding')).rows[0].n).toBe(
      0,
    );
  } finally {
    await pool.end();
  }
});
it('serves closed safe native responses and denies direct spoofed, cross-company and CSRF calls', async () => {
  const cookie = 'erp_session=' + f.admin.token;
  const view = await fetch(origin + '/api/v1/integration?companyId=' + f.company, {
    headers: { cookie },
  });
  expect(view.status).toBe(200);
  const body = await view.json();
  expect(validateIntegrationView(body)).toBe(true);
  expect(JSON.stringify(body)).not.toContain(f.connection.serviceBearer);
  for (const headers of [
    { cookie: 'erp_session=' + f.staffA.token },
    { cookie, authorization: 'Bearer fake' },
    { cookie, 'X-Company-Id': f.company },
  ]) {
    const result = await fetch(origin + '/api/v1/integration?companyId=' + f.company, { headers });
    expect(result.status).toBe(403);
    expect(validateIntegrationError(await result.json())).toBe(true);
  }
  expect(
    (await fetch(origin + '/api/v1/integration?companyId=' + f.other, { headers: { cookie } }))
      .status,
  ).toBe(403);
  expect(
    (
      await fetch(origin + '/api/v1/integration/commands', {
        method: 'POST',
        headers: { cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: 1,
          commandId: randomUUID(),
          companyId: f.company,
          type: 'integration.setup',
          selector: 'local-trial',
        }),
      })
    ).status,
  ).toBe(403);
});
it('commits one native intent/audit/immutable action, rejects changed native replay and denies cross-company', async () => {
  const input = {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'integration.queue',
    ...branch(),
  } as IntegrationCommand;
  const a = await f.commands.execute(f.admin.token, input),
    b = await f.commands.execute(f.admin.token, input);
  expect(b).toEqual(a);
  const id = (a.body as { actionId: string }).actionId;
  expect(id).not.toBe(input.commandId);
  expect(
    (
      await db.pool.query(
        'SELECT count(*)::int AS n FROM integration.source_command WHERE action_id=$1',
        [id],
      )
    ).rows[0].n,
  ).toBe(1);
  await expect(
    f.commands.execute(f.admin.token, {
      ...input,
      payload: { ...input.payload, location: { latitude: 30, longitude: 31 } },
    }),
  ).rejects.toMatchObject({ code: 'COMMAND_PAYLOAD_CONFLICT' });
  await expect(
    f.commands.execute(f.admin.token, { ...input, companyId: f.other, commandId: randomUUID() }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN_SCOPE' });
  await expect(
    db.pool.query(
      `UPDATE integration.source_command SET request_body=request_body||' ' WHERE action_id=$1`,
      [id],
    ),
  ).rejects.toThrow('IMMUTABLE_INTEGRATION_IDENTITY');
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int AS n FROM audit_entry a JOIN integration.source_command c ON c.command_record_id=a.command_record_id WHERE c.action_id=$1`,
        [id],
      )
    ).rows[0].n,
  ).toBe(1);
});
it('retains unknown response, replays the same action and fences expired worker completion', async () => {
  const calls: string[] = [];
  let lost = true;
  const remote = new Map<string, ActionResult>();
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/configuration'))
      return new Response(
        JSON.stringify({
          identity: {
            mode: 'service-operation',
            tenantId: f.connection.tenantId,
            integrationId: f.connection.integrationId,
            actorId: null,
          },
          issuer: f.connection.issuer,
          supportedVersions: ['1.0.0'],
          allowedOperations: ['branch.provision'],
          humanDelegation: false,
        }),
      );
    if (url.includes('/status')) return new Response('{}', { status: 503 });
    const raw = String(init?.body),
      e = JSON.parse(raw) as SourceEnvelope;
    calls.push(raw);
    if (!remote.has(e.actionId)) remote.set(e.actionId, acceptedResult(e));
    if (lost) {
      lost = false;
      throw Error('simulated lost response after fixture acceptance');
    }
    return new Response(JSON.stringify(remote.get(e.actionId)));
  };
  const worker = new SourceCommandWorker(db.pool, f.runtime, (c) => new TawselClient(c, transport));
  await worker.runOne();
  expect(
    (
      await db.pool.query(
        `SELECT state FROM integration.source_command WHERE operation_id='branch.provision'`,
      )
    ).rows[0].state,
  ).toBe('unknown');
  await db.pool.query(
    `UPDATE work_item SET available_at=clock_timestamp() WHERE kind='integration.source'`,
  );
  const lease = await worker.claim(1);
  expect(lease).not.toBeNull();
  await db.pool.query(
    `UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1`,
    [lease!.id],
  );
  const replacement = new SourceCommandWorker(
    db.pool,
    f.runtime,
    (c) => new TawselClient(c, transport),
  );
  const current = await replacement.claim();
  expect(current!.fence).toBeGreaterThan(lease!.fence);
  expect(
    await worker.complete(lease!, {
      result: acceptedResult(JSON.parse(lease!.request_body) as SourceEnvelope),
    }),
  ).toBe(false);
  await replacement.deliver(current!);
  expect(remote.size).toBe(1);
  expect(calls[1]).toBe(calls[0]);
});
it('kills a real worker after fixture HTTP acceptance and recovers the same action from a compacted result', async () => {
  await db.pool.query('CREATE DATABASE p11_worker_crash');
  const crashUrl = new URL(db.url);
  crashUrl.pathname = '/p11_worker_crash';
  const crashPool = createPool(crashUrl.toString());
  await migrate(crashPool);
  let confirmAccepted!: () => void;
  const accepted = new Promise<void>((resolve) => {
    confirmAccepted = resolve;
  });
  const rawRequests: string[] = [],
    results = new Map<string, ActionResult>();
  const remote = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.includes('/configuration')) {
      res.end(
        JSON.stringify({
          identity: {
            mode: 'service-operation',
            tenantId: trial.connection.tenantId,
            integrationId: trial.connection.integrationId,
            actorId: null,
          },
          issuer: trial.connection.issuer,
          supportedVersions: ['1.0.0'],
          allowedOperations: ['branch.provision'],
          humanDelegation: false,
        }),
      );
      return;
    }
    if (req.url?.includes('/status')) {
      res.statusCode = 503;
      res.end('{}');
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString('utf8'),
      envelope = JSON.parse(raw) as SourceEnvelope;
    rawRequests.push(raw);
    if (!results.has(envelope.actionId)) {
      results.set(envelope.actionId, acceptedResult(envelope));
      confirmAccepted();
      return; // Remote committed, response deliberately interrupted.
    }
    const result = { ...results.get(envelope.actionId)!, retention: 'compacted' };
    delete result.response;
    res.end(JSON.stringify(result));
  });
  await new Promise<void>((r) => remote.listen(0, '127.0.0.1', r));
  const address = remote.address() as { port: number };
  const trial = await integrationFixture(crashPool, undefined, 'http://127.0.0.1:' + address.port);
  const queued = await trial.commands.execute(trial.admin.token, {
    schemaVersion: 1,
    companyId: trial.company,
    commandId: randomUUID(),
    type: 'integration.queue',
    nativeId: trial.a,
    expectedVersion: 0,
    operationId: 'branch.provision',
    payload: { name: 'الفرع أ', enabled: true, location: null },
  });
  const child = fork('tests/integration/p11/crash-worker.ts', [], {
    execArgv: ['--import', 'tsx'],
    env: { ...process.env, TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  try {
    child.send({ url: crashUrl.toString(), runtime: trial.runtime });
    await Promise.race([
      accepted,
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject(Error('WORKER_DID_NOT_SEND')), 15000);
        timer.unref();
      }),
    ]);
    const exited = once(child, 'exit');
    child.kill();
    await exited;
    await crashPool.query(
      `UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second' WHERE company_id=$1 AND kind='integration.source'`,
      [trial.company],
    );
    const worker = new SourceCommandWorker(crashPool, trial.runtime);
    expect(await worker.runOne()).toBe(true);
    const row = (
      await crashPool.query(
        `SELECT state,remote_result FROM integration.source_command WHERE company_id=$1 AND action_id=$2`,
        [trial.company, (queued.body as { actionId: string }).actionId],
      )
    ).rows[0];
    expect(row.state).toBe('accepted');
    expect(row.remote_result.retention).toBe('compacted');
    expect(results.size).toBe(1);
    expect(rawRequests).toHaveLength(2);
    expect(rawRequests[1]).toBe(rawRequests[0]);
    expect(await worker.runOne()).toBe(false);
  } finally {
    if (child.exitCode === null) child.kill();
    remote.closeAllConnections();
    await new Promise<void>((r) => remote.close(() => r()));
    await crashPool.end();
  }
});
it('queues exact operator bootstrap without making operator credentials available to the ordinary worker', async () => {
  const canonical = structuredClone(
    validFixtures.find((x) => x.id === 'p08-integration.bindSource')!.data,
  ) as SourceEnvelope;
  const payload = { ...canonical.payload };
  delete payload.externalId;
  delete payload.sourceRevision;
  const queued = await run({
    nativeId: f.company,
    expectedVersion: 0,
    operationId: 'integration.bindSource',
    payload,
  });
  const ordinary = new SourceCommandWorker(db.pool, f.runtime);
  expect(await ordinary.claim()).toBeNull();
  const operator = new SourceCommandWorker(db.pool, f.runtime, undefined, 'operator-test-only'),
    lease = await operator.claim();
  expect(lease!.action_id).toBe((queued.body as { actionId: string }).actionId);
  expect(lease!.authority).toBe('operator');
  const envelope = JSON.parse(lease!.request_body) as SourceEnvelope;
  expect(envelope.context).toEqual({
    kind: 'integration',
    tenantId: f.connection.tenantId,
    integrationId: f.connection.integrationId,
  });
  expect(envelope.payload.secretHash).toBe(payload.secretHash);
  await operator.complete(lease!, { result: acceptedResult(envelope) });
});
it('serializes all operations on one user revision stream with independent transactions', async () => {
  const payload = { exceptions: [] };
  const results = await Promise.allSettled([
    run({
      nativeId: f.staffA.id,
      expectedVersion: 0,
      operationId: 'user.setCapabilityExceptions',
      payload,
    }),
    run({
      nativeId: f.staffA.id,
      expectedVersion: 0,
      operationId: 'user.setCapabilityExceptions',
      payload,
    }),
  ]);
  expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((x) => x.status === 'rejected')).toHaveLength(1);
  expect(
    (
      await db.pool.query(
        `SELECT count(*)::int AS n FROM integration.source_command c JOIN integration.binding b ON b.company_id=c.company_id AND b.id=c.binding_id WHERE b.native_id=$1`,
        [f.staffA.id],
      )
    ).rows[0].n,
  ).toBe(1);
  await expect(
    run({
      nativeId: f.staffA.id,
      expectedVersion: 1,
      operationId: 'user.setRole',
      payload: { roleExternalId: 'role:' + f.staffRole },
    }),
  ).rejects.toMatchObject({ code: 'SYNC_REQUIRED' });
});
it('rejects missing/disabled references, unsupported operations and finance capability forwarding', async () => {
  await expect(
    run({
      nativeId: f.driver,
      expectedVersion: 0,
      operationId: 'driver.provisionReference',
      payload: {
        enabled: true,
        userExternalId: 'user:' + f.admin.id,
        vehicleReference: null,
        profile: 'car',
      },
    }),
  ).rejects.toMatchObject({ code: 'REFERENCE_NOT_READY' });
  await expect(
    run({
      nativeId: f.staffRole,
      expectedVersion: 0,
      operationId: 'role.defineCapabilities',
      payload: { name: 'فريق التشغيل', capabilities: ['finance.accounts'] },
    }),
  ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  await expect(
    run({
      nativeId: f.company,
      expectedVersion: 0,
      operationId: 'outcome.recordFull',
      payload: {},
    }),
  ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  await expect(
    db.pool.query(
      `INSERT INTO integration.binding(company_id,source_id,id,entity,native_id,external_id) VALUES($1,$2,$3,'branch',$4,'foreign')`,
      [f.company, f.sourceId, randomUUID(), f.foreign],
    ),
  ).rejects.toThrow();
});
it('keeps accepted user separate from issuer-ready and accepts authoritative completed disable', async () => {
  const worker = new SourceCommandWorker(db.pool, f.runtime),
    lease = await worker.claim();
  expect(lease).not.toBeNull();
  const envelope = JSON.parse(lease!.request_body) as SourceEnvelope;
  const status = {
    entity: 'user' as const,
    externalId: 'user:' + f.staffA.id,
    resourceId: randomUUID(),
    sourceRevision: 1,
    lastActionId: envelope.actionId,
    issuerStatus: 'pending' as const,
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    enabled: true,
  };
  const source = (await transaction(db.pool, (c) => sourceByCompany(c, f.company)))!;
  expect(await transaction(db.pool, (c) => recordProvisioningStatus(c, source, status))).toBe(
    false,
  );
  await worker.complete(lease!, { result: acceptedResult(envelope), identity: status });
  let binding = (
    await db.pool.query(
      'SELECT issuer_status,enabled FROM integration.binding WHERE native_id=$1',
      [f.staffA.id],
    )
  ).rows[0];
  expect(binding).toEqual({ issuer_status: 'pending', enabled: true });
  expect(
    await transaction(db.pool, (c) =>
      recordProvisioningStatus(c, source, {
        ...status,
        lastActionId: randomUUID(),
        issuerStatus: 'ready',
      }),
    ),
  ).toBe(false);
  expect(
    await transaction(db.pool, (c) =>
      recordProvisioningStatus(c, source, { ...status, issuerStatus: 'ready', enabled: false }),
    ),
  ).toBe(true);
  binding = (
    await db.pool.query(
      'SELECT issuer_status,enabled FROM integration.binding WHERE native_id=$1',
      [f.staffA.id],
    )
  ).rows[0];
  expect(binding).toEqual({ issuer_status: 'ready', enabled: false });
});
it('accepts simultaneous identical callbacks once with byte-identical acknowledgements and pending application', async () => {
  const e = structuredClone(f.event);
  e.aggregate.recipientSequence = 1;
  const raw = Buffer.from(JSON.stringify(e));
  const responses = await Promise.all(Array.from({ length: 8 }, () => receive(raw)));
  expect(responses.map((r) => r.status)).toEqual(Array(8).fill(200));
  const bodies = await Promise.all(responses.map((r) => r.json()));
  for (const body of bodies)
    expect(body).toEqual({
      schemaVersion: '1.0.0',
      tenantId: e.tenantId,
      recipientIntegrationId: e.recipientIntegrationId,
      eventId: e.eventId,
      acknowledgement: 'received',
    });
  const row = (
    await db.pool.query('SELECT * FROM integration.inbox WHERE event_id=$1', [e.eventId])
  ).rows[0];
  expect(row.raw_body.equals(raw)).toBe(true);
  expect(row.application_state).toBe('pending');
  const checkpoint = (
    await db.pool.query('SELECT * FROM integration.checkpoint WHERE aggregate_id=$1', [
      e.aggregate.id,
    ])
  ).rows[0];
  expect(checkpoint.received_through).toBe('1');
  expect(checkpoint.applied_through).toBe('0');
});
it('rejects signed changed bytes under one event and recipient sequence collisions', async () => {
  const e = structuredClone(f.event);
  e.aggregate.recipientSequence = 1;
  const changed = Buffer.from(JSON.stringify(e, null, 2));
  expect((await receive(changed)).status).toBe(409);
  e.eventId = randomUUID();
  const collision = Buffer.from(JSON.stringify(e));
  expect((await receive(collision)).status).toBe(409);
});
it('rejects tampering, duplicate security headers, wrong scope/key and unknown event without accepted rows', async () => {
  const e = structuredClone(f.event);
  e.eventId = randomUUID();
  e.aggregate.recipientSequence = 2;
  const raw = Buffer.from(JSON.stringify(e)),
    h = signed(raw);
  expect((await receive(Buffer.concat([raw, Buffer.from(' ')]), h)).status).toBe(401);
  expect((await receive(raw, { ...h, 'X-Tawsel-Key-Id': 'missing' })).status).toBe(401);
  const duplicate = await new Promise<number>((resolve, reject) => {
    const req = request(
      origin + '/api/v1/consumer/events',
      {
        method: 'POST',
        headers: [
          'Host',
          new URL(origin).host,
          'Content-Length',
          String(raw.length),
          ...Object.entries(h).flat(),
          'x-tawsel-signature',
          h['X-Tawsel-Signature'],
        ],
      },
      (res) => {
        res.resume();
        resolve(res.statusCode!);
      },
    );
    req.on('error', reject);
    req.end(raw);
  });
  expect(duplicate).toBe(401);
  e.eventType = 'progress.snapshot';
  expect((await receive(Buffer.from(JSON.stringify(e)))).status).toBe(422);
  expect(
    (
      await db.pool.query('SELECT count(*)::int AS n FROM integration.inbox WHERE event_id=$1', [
        e.eventId,
      ])
    ).rows[0].n,
  ).toBe(0);
});
it('accepts exactly 2 MiB at actual HTTP ingress and rejects an extra byte', async () => {
  const e = senderFixture('p25-task.snapshotAccepted');
  e.eventId = randomUUID();
  const json = Buffer.from(JSON.stringify(e));
  const raw = Buffer.concat([json, Buffer.alloc(2097152 - json.length, 32)]);
  expect((await receive(raw)).status).toBe(200);
  expect((await receive(Buffer.concat([raw, Buffer.from(' ')]))).status).toBe(413);
});
it('keeps gaps visible and never advances applied through unhandled domain events', async () => {
  const e = structuredClone(f.event);
  e.eventId = randomUUID();
  e.aggregate.recipientSequence = 3;
  expect((await receive(Buffer.from(JSON.stringify(e)))).status).toBe(200);
  let row = (
    await db.pool.query('SELECT * FROM integration.checkpoint WHERE aggregate_id=$1', [
      e.aggregate.id,
    ])
  ).rows[0];
  expect([row.received_through, row.received_high, row.applied_through]).toEqual(['1', '3', '0']);
  e.eventId = randomUUID();
  e.aggregate.recipientSequence = 2;
  expect((await receive(Buffer.from(JSON.stringify(e)))).status).toBe(200);
  row = (
    await db.pool.query('SELECT * FROM integration.checkpoint WHERE aggregate_id=$1', [
      e.aggregate.id,
    ])
  ).rows[0];
  expect([row.received_through, row.received_high, row.applied_through]).toEqual(['3', '3', '0']);
});
it('enforces recorded old-key expiry while accepting the preprovisioned next key', async () => {
  await db.pool.query(
    `INSERT INTO integration.verification_key(company_id,source_id,key_id,active_from) VALUES($1,$2,'next',clock_timestamp()-interval '1 minute')`,
    [f.company, f.sourceId],
  );
  await db.pool.query(
    `UPDATE integration.verification_key SET active_from=clock_timestamp()-interval '1 minute',verify_until=clock_timestamp()-interval '1 second' WHERE company_id=$1 AND key_id='trial'`,
    [f.company],
  );
  const e = structuredClone(f.event);
  e.eventId = randomUUID();
  e.aggregate.recipientSequence = 4;
  const raw = Buffer.from(JSON.stringify(e));
  expect((await receive(raw)).status).toBe(401);
  expect((await receive(raw, signed(raw, 'next', f.connection.signingKeys.next))).status).toBe(200);
  await db.pool.query(
    `UPDATE integration.verification_key SET verify_until=NULL WHERE company_id=$1 AND key_id='trial'`,
    [f.company],
  );
});
it('records returned key rotation overlap without exposing secret values', async () => {
  await run({
    nativeId: f.company,
    expectedVersion: 0,
    operationId: 'integration.rotateSigningKey',
    payload: { keyId: 'next', overlapSeconds: 300 },
  });
  const worker = new SourceCommandWorker(db.pool, f.runtime),
    lease = await worker.claim();
  const envelope = JSON.parse(lease!.request_body) as SourceEnvelope,
    result = acceptedResult(envelope);
  const activatedAt = new Date().toISOString(),
    verifyUntil = new Date(Date.now() + 300000).toISOString();
  result.response!.body = { keyId: 'next', activatedAt, previousKeyId: 'trial', verifyUntil };
  await worker.complete(lease!, { result });
  const keys = (
    await db.pool.query(
      'SELECT key_id,verify_until FROM integration.verification_key WHERE source_id=$1',
      [f.sourceId],
    )
  ).rows;
  expect(keys.find((k) => k.key_id === 'trial').verify_until.toISOString()).toBe(verifyUntil);
  expect(keys.find((k) => k.key_id === 'next').verify_until).toBeNull();
});
it('kills receiver after committed inbox before acknowledgement, then redelivers once after restart', async () => {
  const child = fork('tests/integration/p11/crash-receiver.ts', [], {
    execArgv: ['--import', 'tsx'],
    env: { ...process.env, TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  try {
    const ready = once(child, 'message');
    child.send({ url: db.url, identity: f.config, runtime: f.runtime });
    const [message] = (await ready) as [{ origin: string }];
    const e = structuredClone(f.event);
    e.eventId = randomUUID();
    e.aggregate.recipientSequence = 5;
    const raw = Buffer.from(JSON.stringify(e));
    const committed = once(child, 'message');
    const pending = receive(raw, signed(raw), message.origin).catch(() => null);
    expect((await committed)[0]).toEqual({ committed: true });
    // SIGKILL simulates a crash on every platform; SIGTERM would run graceful shutdown and wait
    // for the deliberately unacknowledged request.
    child.kill('SIGKILL');
    await once(child, 'exit');
    await pending;
    expect((await receive(raw)).status).toBe(200);
    expect(
      (
        await db.pool.query('SELECT count(*)::int AS n FROM integration.inbox WHERE event_id=$1', [
          e.eventId,
        ])
      ).rows[0].n,
    ).toBe(1);
  } finally {
    if (child.exitCode === null) child.kill();
  }
});
it('retains committed inbox/outbox after database restart and denies revoked command recovery', async () => {
  const before = (await db.pool.query('SELECT count(*)::int AS n FROM integration.inbox')).rows[0]
    .n;
  await db.stop();
  await db.start();
  expect((await db.pool.query('SELECT count(*)::int AS n FROM integration.inbox')).rows[0].n).toBe(
    before,
  );
  const command = (
    await db.pool.query(
      `SELECT r.command_id FROM command_record r JOIN integration.source_command c ON c.command_record_id=r.id WHERE r.principal_id=$1 LIMIT 1`,
      [f.admin.id],
    )
  ).rows[0];
  await db.pool.query(
    `DELETE FROM access.role_grant WHERE company_id=$1 AND role_id=$2 AND capability='integration'`,
    [f.company, f.adminRole],
  );
  await expect(
    f.commands.recover(f.admin.token, f.company, 'integration', command.command_id),
  ).rejects.toMatchObject({ code: 'FORBIDDEN_SCOPE' });
  await db.pool.query(`INSERT INTO access.role_grant VALUES($1,$2,'integration')`, [
    f.company,
    f.adminRole,
  ]);
  const source = await transaction(db.pool, (c) => sourceByCompany(c, f.company));
  expect(source?.id).toBe(f.sourceId);
});
