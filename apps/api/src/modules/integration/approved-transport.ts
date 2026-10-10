import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { publicUnicast } from './callback-policy.js';

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
export function approvedTransport(origin: string, resolve = lookup): typeof fetch {
  const approved = approvedOrigin(origin);
  return async (input, init) => {
    const target = new URL(String(input));
    if (target.origin !== approved.origin || target.username || target.password || target.hash)
      throw Error('UNAPPROVED_ORIGIN');
    const signal = AbortSignal.any([
      AbortSignal.timeout(15000),
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
          if (code >= 300 && code < 400) {
            response.destroy();
            reject(Error('REDIRECT_REFUSED'));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > 16777216) {
              response.destroy();
              reject(Error('REMOTE_RESULT_TOO_LARGE'));
            } else chunks.push(chunk);
          });
          response.on('error', () => reject(Error('REMOTE_RESULT_UNKNOWN')));
          response.on('end', () => accept(new Response(Buffer.concat(chunks), { status: code })));
        },
      );
      r.on('error', () => reject(Error('REMOTE_RESULT_UNKNOWN')));
      if (typeof init?.body === 'string') r.write(init.body);
      r.end();
    });
  };
}
