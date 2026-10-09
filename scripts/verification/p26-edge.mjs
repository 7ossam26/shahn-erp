import { createServer } from 'node:https';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';

if (process.env.APP_ENV !== 'test' || process.env.P26_APPROVED_ISOLATION !== 'true')
  throw Error('P26_APPROVED_ISOLATED_EDGE_REQUIRED');
const permittedHost = new URL(process.env.APP_ORIGIN).host;
const server = createServer(
  {
    cert: readFileSync('/run/p26/pilot.crt'),
    key: readFileSync('/run/p26/pilot.key'),
    minVersion: 'TLSv1.2',
  },
  (incoming, outgoing) => {
    if (
      incoming.headers.host !== permittedHost ||
      !incoming.url?.startsWith('/') ||
      incoming.url.startsWith('//') ||
      incoming.url.includes('\\')
    ) {
      outgoing.writeHead(400).end();
      return;
    }
    const upstream = request(
      {
        hostname: 'web',
        port: 8080,
        path: incoming.url,
        method: incoming.method,
        headers: incoming.headers,
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    upstream.setTimeout(30000, () => upstream.destroy());
    upstream.on('error', () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.on('aborted', () => upstream.destroy());
    incoming.pipe(upstream);
  },
);
server.listen(8443, '0.0.0.0');
const stop = () => {
  server.close();
  server.closeIdleConnections();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
