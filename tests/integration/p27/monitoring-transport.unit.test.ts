import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { Pool } from 'pg';
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('node:https', () => ({ request: vi.fn() }));
vi.mock('@shahn/database', () => ({ sourceByCompany: vi.fn() }));
vi.mock('../../../apps/api/src/modules/kernel/unit-of-work.js', () => ({
  UnitOfWork: { run: vi.fn() },
}));
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { sourceByCompany } from '@shahn/database';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { MonitoringReader } from '../../../apps/api/src/modules/execution/monitoring-reader.service.js';
import type { IntegrationConnection } from '../../../apps/api/src/modules/integration/config.js';
import { validFixtures } from '../p11/fixtures.js';

const company = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const connection: IntegrationConnection = {
  selector: 'fixture',
  companyId: company,
  tenantId: company,
  integrationId: id,
  externalId: 'fixture',
  baseUrl: 'https://routing.example/',
  approvedOrigin: 'https://routing.example/',
  issuer: 'https://issuer.example/',
  serviceBearer: 'isolated-monitoring-credential',
  serviceExpiresAt: '2099-01-01T00:00:00Z',
  signingKeys: {},
  initialKeyId: null,
  allowedCallbackUrls: [],
};
type Options = {
  headers: Record<string, string>;
  signal: AbortSignal;
  servername: string;
  rejectUnauthorized: boolean;
  lookup: (
    host: string,
    opts: object,
    done: (error: null, address: string, family: number) => void,
  ) => void;
};
let captured: Options[] = [];
let streams: PassThrough[] = [];
let cache: { body: unknown; etag: string; refreshed_at: Date } | undefined;
function page(cursor: string | null = null) {
  const value = structuredClone(
    validFixtures.find((f) => f.id === 'monitoring-scoped')!.data,
  ) as Record<string, unknown>;
  return { ...value, driverId: id, items: [], nextCursor: cursor };
}
function sockets(
  replies: {
    status?: number;
    data?: string | Buffer;
    headers?: Record<string, string>;
    slow?: boolean;
  }[],
) {
  vi.mocked(request).mockImplementation(((
    url: URL,
    options: Options,
    callback: (response: PassThrough) => void,
  ) => {
    expect(url.origin).toBe('https://routing.example');
    captured.push(options);
    const reply = replies.shift()!;
    const req = new EventEmitter() as EventEmitter & { end(): void; write(value: string): void };
    req.write = () => {};
    req.end = () => {
      const response = Object.assign(new PassThrough(), {
        statusCode: reply.status ?? 200,
        headers: reply.headers ?? {},
      });
      streams.push(response);
      options.signal.addEventListener(
        'abort',
        () => {
          response.destroy(Error('fixture-aborted'));
          req.emit('error', Error('fixture-aborted'));
        },
        { once: true },
      );
      callback(response);
      if (!reply.slow) response.end(reply.data ?? JSON.stringify(page()));
    };
    return req;
  }) as unknown as typeof request);
}
function reader(transport?: typeof fetch, c = connection) {
  return new MonitoringReader({} as Pool, { connections: [c] }, transport);
}
beforeEach(() => {
  captured = [];
  streams = [];
  cache = undefined;
  vi.mocked(lookup).mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as never);
  vi.mocked(sourceByCompany).mockResolvedValue({
    id,
    enabled: true,
    tenant_id: company,
    integration_id: id,
  } as never);
  const client = { query: async () => ({ rows: cache ? [cache] : [] }) };
  vi.mocked(UnitOfWork.run).mockImplementation(async (...args) => args[4]({ client } as never));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.mocked(request).mockReset();
  for (const stream of streams) stream.destroy();
});
it('default monitoring connects through the checked address with TLS hostname verification', async () => {
  const bypass = vi.fn(async () => new Response(JSON.stringify(page())));
  vi.stubGlobal('fetch', bypass);
  sockets([{}]);
  const read = await reader().read('token', company, 'drivers', id);
  expect(read.stale).toBe(false);
  expect(bypass).not.toHaveBeenCalled();
  expect(captured).toHaveLength(1);
  expect(captured[0]).toMatchObject({
    servername: 'routing.example',
    rejectUnauthorized: true,
    headers: { authorization: 'Bearer isolated-monitoring-credential' },
  });
  const checked = vi.fn();
  captured[0]!.lookup('routing.example', {}, checked);
  expect(checked).toHaveBeenCalledExactlyOnceWith(null, '8.8.8.8', 4);
});
it.each(['127.0.0.1', '169.254.169.254', '::1', 'fd00::1'])(
  'never opens a credential-bearing monitoring socket for private DNS %s',
  async (address) => {
    const bypass = vi.fn(async () => new Response(JSON.stringify(page())));
    vi.stubGlobal('fetch', bypass);
    vi.mocked(lookup).mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address, family: address.includes(':') ? 6 : 4 },
    ] as never);
    const read = await reader().read('token', company, 'drivers', id);
    expect(read).toMatchObject({ stale: true, status: 503, pages: 0 });
    expect(captured).toHaveLength(0);
    expect(bypass).not.toHaveBeenCalled();
  },
);
it('rechecks DNS for a cursor page and discards partial data when DNS becomes private', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(page()))),
  );
  vi.mocked(lookup)
    .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }] as never)
    .mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }] as never);
  sockets([{ data: JSON.stringify(page('next-page')) }]);
  expect(await reader().read('token', company, 'drivers', id)).toMatchObject({
    stale: true,
    status: 503,
    body: null,
    pages: 0,
  });
  expect(captured).toHaveLength(1);
  expect(lookup).toHaveBeenCalledTimes(2);
});
it('rechecks DNS on revision restart before sending credentials again', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(page()))),
  );
  vi.mocked(lookup)
    .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }] as never)
    .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }] as never);
  sockets([{ status: 409 }]);
  expect(await reader().read('token', company, 'drivers', id)).toMatchObject({
    stale: true,
    status: 503,
  });
  expect(captured).toHaveLength(1);
  expect(lookup).toHaveBeenCalledTimes(2);
});
it('refuses redirects without forwarding a credential to another socket', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(page()))),
  );
  sockets([{ status: 302, headers: { location: 'https://foreign.example/' } }]);
  expect(await reader().read('token', company, 'drivers', id)).toMatchObject({
    stale: true,
    status: 503,
  });
  expect(captured).toHaveLength(1);
  expect(streams[0]!.destroyed).toBe(true);
});
it('stops receiving a monitoring body above 2 MiB before a valid response can be returned', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(page()))),
  );
  sockets([{ data: Buffer.alloc(2097153, 32) }]);
  await expect(reader().read('token', company, 'drivers', id)).rejects.toThrow(
    'MONITORING_TOO_LARGE',
  );
  expect(streams[0]!.destroyed).toBe(true);
});
it('retains ETag and bodyless 304 scope metadata through approved transport', async () => {
  const body = page() as ReturnType<typeof page> & { scopeKey: string; snapshotRevision: number };
  cache = { body, etag: '"fixture"', refreshed_at: new Date() };
  sockets([
    {
      status: 304,
      headers: {
        'x-snapshot-scope': body.scopeKey,
        'x-snapshot-revision': String(body.snapshotRevision),
        'x-refreshed-at': '2026-10-11T10:00:00Z',
      },
    },
  ]);
  expect(await reader().read('token', company, 'drivers', id)).toMatchObject({
    stale: false,
    status: 304,
    body,
    refreshedAt: '2026-10-11T10:00:00Z',
  });
  expect(captured[0]!.headers['if-none-match']).toBe('"fixture"');
});
it('bounds an injected isolated response while receiving and cancels it immediately on overflow', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(2097153));
    },
    cancel() {
      cancelled = true;
    },
  });
  const work = reader(async () => new Response(body)).read('token', company, 'drivers', id);
  const settled = work.then(
    () => 'accepted',
    (error: Error) => error.message,
  );
  await new Promise((r) => setTimeout(r, 30));
  expect(cancelled).toBe(true);
  expect(await settled).toBe('MONITORING_TOO_LARGE');
});
it('keeps the monitoring deadline active through an injected slow body and cancels pending reads', async () => {
  const realTimeout = AbortSignal.timeout;
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(25));
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const work = reader(async () => new Response(body)).read('token', company, 'drivers', id);
  const result = await Promise.race([
    work,
    new Promise((resolve) => setTimeout(() => resolve('unbounded'), 150)),
  ]);
  expect(result).toMatchObject({ stale: true, status: 503 });
  expect(cancelled).toBe(true);
});
it('never defaults to fetch for an unapproved production connection', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const bypass = vi.fn(async () => new Response(JSON.stringify(page())));
  vi.stubGlobal('fetch', bypass);
  const c = { ...connection };
  delete c.approvedOrigin;
  await expect(reader(undefined, c).read('token', company, 'drivers', id)).rejects.toThrow(
    'INSTALLATION_APPROVAL_REQUIRED',
  );
  expect(bypass).not.toHaveBeenCalled();
});
it('caps monitoring revision restarts at three independently checked attempts', async () => {
  sockets([{ status: 409 }, { status: 409 }, { status: 409 }]);
  expect(await reader().read('token', company, 'drivers', id)).toMatchObject({
    stale: true,
    status: 409,
    pages: 0,
  });
  expect(captured).toHaveLength(3);
  expect(lookup).toHaveBeenCalledTimes(3);
});
it('aborts an approved slow response body at the monitoring deadline', async () => {
  const realTimeout = AbortSignal.timeout;
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(25));
  sockets([{ slow: true }]);
  expect(await reader().read('token', company, 'drivers', id)).toMatchObject({
    stale: true,
    status: 503,
  });
  expect(captured).toHaveLength(1);
  expect(streams[0]!.destroyed).toBe(true);
});
