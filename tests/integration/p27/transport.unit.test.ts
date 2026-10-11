import { it, expect, vi, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
vi.mock('node:https', () => ({ request: vi.fn() }));
import { request } from 'node:https';
import {
  approvedTransport,
  connectionTransport,
} from '../../../apps/api/src/modules/integration/approved-transport.js';
import type { IntegrationConnection } from '../../../apps/api/src/modules/integration/config.js';
type SocketOptions = {
  servername: string;
  rejectUnauthorized: boolean;
  family: number;
  headers: Record<string, string>;
  lookup: (
    host: string,
    options: object,
    done: (error: null, address: string, family: number) => void,
  ) => void;
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.mocked(request).mockReset();
  vi.unstubAllEnvs();
});
function socket(status: number, captured: SocketOptions[]) {
  vi.mocked(request).mockImplementation(((
    url: URL,
    options: SocketOptions,
    callback: (response: PassThrough) => void,
  ) => {
    captured.push(options);
    expect(url.hostname).toBe('routing.example');
    const req = new EventEmitter() as EventEmitter & { write(s: string): void; end(): void };
    req.write = () => {};
    req.end = () => {
      const response = Object.assign(new PassThrough(), { statusCode: status, headers: {} });
      callback(response);
      if (status < 300) response.end('{}');
    };
    return req;
  }) as unknown as typeof request);
}
it('uses the checked DNS address for the TLS socket and rechecks DNS on every retry before credentials', async () => {
  const captured: SocketOptions[] = [];
  socket(200, captured);
  let calls = 0;
  const resolve = (async () => {
    calls++;
    return [{ address: calls === 1 ? '8.8.8.8' : '169.254.169.254', family: 4 }];
  }) as unknown as typeof import('node:dns/promises').lookup;
  const transport = approvedTransport('https://routing.example/', resolve);
  expect(
    (
      await transport('https://routing.example/api/v1/provisioning/configuration', {
        headers: { authorization: 'Bearer protected-fixture' },
      })
    ).status,
  ).toBe(200);
  const options = captured[0]!;
  expect(options).toMatchObject({
    servername: 'routing.example',
    rejectUnauthorized: true,
    family: 4,
  });
  const address = vi.fn();
  options.lookup('routing.example', {}, address);
  expect(address).toHaveBeenCalledExactlyOnceWith(null, '8.8.8.8', 4);
  await expect(
    transport('https://routing.example/api/v1/provisioning/configuration', {
      headers: { authorization: 'Bearer protected-fixture' },
    }),
  ).rejects.toThrow('UNAPPROVED_ADDRESS');
  expect(captured).toHaveLength(1);
  expect(calls).toBe(2);
});
it('refuses redirects without a second socket or credential forwarding', async () => {
  const captured: SocketOptions[] = [];
  socket(302, captured);
  const resolve = (async () => [
    { address: '8.8.8.8', family: 4 },
  ]) as unknown as typeof import('node:dns/promises').lookup;
  await expect(
    approvedTransport('https://routing.example/', resolve)(
      'https://routing.example/api/v1/provisioning/configuration',
      { headers: { authorization: 'Bearer protected-fixture' } },
    ),
  ).rejects.toThrow('REDIRECT_REFUSED');
  expect(captured).toHaveLength(1);
});
it('mixed public/private DNS answers fail closed before opening any socket', async () => {
  const resolve = (async () => [
    { address: '8.8.8.8', family: 4 },
    { address: '127.0.0.1', family: 4 },
  ]) as unknown as typeof import('node:dns/promises').lookup;
  await expect(
    approvedTransport('https://routing.example/', resolve)('https://routing.example/', {
      headers: { authorization: 'Bearer protected-fixture' },
    }),
  ).rejects.toThrow('UNAPPROVED_ADDRESS');
  expect(request).not.toHaveBeenCalled();
});
it('retains the command transport 16 MiB limit while monitoring may request a stricter bound', async () => {
  const captured: SocketOptions[] = [];
  vi.mocked(request).mockImplementation(((
    _url: URL,
    options: SocketOptions,
    callback: (response: PassThrough) => void,
  ) => {
    captured.push(options);
    const req = new EventEmitter() as EventEmitter & { end(): void };
    req.end = () => {
      const response = Object.assign(new PassThrough(), { statusCode: 200, headers: {} });
      callback(response);
      response.end(Buffer.alloc(2097153, 32));
    };
    return req;
  }) as unknown as typeof request);
  const resolve = (async () => [
    { address: '8.8.8.8', family: 4 },
  ]) as unknown as typeof import('node:dns/promises').lookup;
  expect(
    (await approvedTransport('https://routing.example/', resolve)('https://routing.example/'))
      .status,
  ).toBe(200);
  await expect(
    approvedTransport('https://routing.example/', resolve, { maxBytes: 2097152 })(
      'https://routing.example/',
    ),
  ).rejects.toThrow('REMOTE_RESULT_TOO_LARGE');
  expect(captured).toHaveLength(2);
});
it.each([
  ['test', 'test', 'https://routing.example/'],
  ['test', 'test', 'http://routing.example/'],
  ['development', 'development', 'http://127.0.0.1:1234/'],
  ['production', 'production', 'http://127.0.0.1:1234/'],
  ['staging', 'development', 'http://127.0.0.1:1234/'],
  ['test', 'production', 'http://127.0.0.1:1234/'],
  ['test', 'test', 'http://127.0.0.1:1234/path'],
])('missing approval fails closed in APP_ENV=%s NODE_ENV=%s for %s', (appEnv, nodeEnv, baseUrl) => {
  vi.stubEnv('APP_ENV', appEnv);
  vi.stubEnv('NODE_ENV', nodeEnv);
  expect(() => connectionTransport({ baseUrl } as IntegrationConnection)).toThrow(
    'INSTALLATION_APPROVAL_REQUIRED',
  );
});
it('allows only the explicit isolated APP_ENV=test loopback fixture seam', () => {
  vi.stubEnv('APP_ENV', 'test');
  vi.stubEnv('NODE_ENV', 'test');
  for (const baseUrl of [
    'http://127.0.0.1:1234',
    'http://127.0.0.1:1234/',
    'http://[::1]:1234/',
    'http://localhost:1234/',
  ])
    expect(connectionTransport({ baseUrl } as IntegrationConnection)).toBe(fetch);
});
