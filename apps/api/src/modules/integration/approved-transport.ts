import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { publicUnicast } from './callback-policy.js';
import type { IntegrationConnection } from './config.js';

export function approvedOrigin(raw: string): URL {
  const u = new URL(raw);
  if (
    u.protocol !== 'https:' ||
    u.port ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== '/' ||
    u.href !== raw
  )
    throw Error('UNAPPROVED_ORIGIN');
  return u;
}
/** Resolve and check every attempt, then use those same addresses for the socket.
 * The protected installation record establishes host identity before credentials. */
export function approvedTransport(
  origin: string,
  resolve = lookup,
  { maxBytes = 16777216, timeoutMs = 15000 }: { maxBytes?: number; timeoutMs?: number } = {},
): typeof fetch {
  const approved = approvedOrigin(origin);
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1
  )
    throw Error('INVALID_TRANSPORT_LIMIT');
  return async (input, init) => {
    const target = new URL(String(input));
    if (target.origin !== approved.origin || target.username || target.password || target.hash)
      throw Error('UNAPPROVED_ORIGIN');
    const signal = AbortSignal.any([
      AbortSignal.timeout(timeoutMs),
      ...(init?.signal ? [init.signal] : []),
    ]);
    const addresses = await new Promise<{ address: string; family: number }[]>((accept, reject) => {
      signal.throwIfAborted();
      const stop = () => reject(Error('REMOTE_RESULT_UNKNOWN'));
      signal.addEventListener('abort', stop, { once: true });
      resolve(target.hostname, { all: true })
        .then(accept, reject)
        .finally(() => signal.removeEventListener('abort', stop));
    });
    if (!addresses.length || addresses.some((a) => !publicUnicast(a.address)))
      throw Error('UNAPPROVED_ADDRESS');
    signal.throwIfAborted();
    return new Promise<Response>((accept, reject) => {
      const selected = addresses[0]!;
      const r = request(
        target,
        {
          method: init?.method ?? 'GET',
          headers: Object.fromEntries(new Headers(init?.headers).entries()),
          servername: target.hostname,
          rejectUnauthorized: true,
          family: selected.family,
          lookup: (_host, _options, done) => done(null, selected.address, selected.family),
          signal,
        },
        (response) => {
          const code = response.statusCode ?? 503;
          if (code >= 300 && code < 400 && code !== 304) {
            response.destroy();
            reject(Error('REDIRECT_REFUSED'));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > maxBytes) {
              response.destroy();
              reject(Error('REMOTE_RESULT_TOO_LARGE'));
            } else chunks.push(chunk);
          });
          response.on('error', () => reject(Error('REMOTE_RESULT_UNKNOWN')));
          response.on('aborted', () => reject(Error('REMOTE_RESULT_UNKNOWN')));
          response.on('end', () => {
            const headers = new Headers();
            for (const [key, value] of Object.entries(response.headers))
              if (value !== undefined)
                headers.set(key, Array.isArray(value) ? value.join(', ') : value);
            accept(
              new Response([204, 205, 304].includes(code) ? null : Buffer.concat(chunks), {
                status: code,
                headers,
              }),
            );
          });
        },
      );
      r.on('error', () => reject(Error('REMOTE_RESULT_UNKNOWN')));
      if (typeof init?.body === 'string') r.write(init.body);
      r.end();
    });
  };
}

/** Production/staging requests require the independently approved installation.
 * The only implicit fixture seam is a canonical loopback HTTP origin in APP_ENV=test.
 * Explicitly injected isolated transports remain available at client/reader boundaries. */
export function connectionTransport(
  connection: IntegrationConnection,
  maxBytes = 16777216,
): typeof fetch {
  if (connection.approvedOrigin)
    return approvedTransport(connection.approvedOrigin, lookup, { maxBytes });
  const origin = new URL(connection.baseUrl);
  if (
    process.env['APP_ENV'] === 'test' &&
    process.env['NODE_ENV'] !== 'production' &&
    origin.protocol === 'http:' &&
    ['127.0.0.1', '[::1]', 'localhost'].includes(origin.hostname) &&
    !origin.username &&
    !origin.password &&
    !origin.search &&
    !origin.hash &&
    origin.pathname === '/' &&
    [origin.origin, origin.href].includes(connection.baseUrl)
  )
    return fetch;
  throw Error('INSTALLATION_APPROVAL_REQUIRED');
}
