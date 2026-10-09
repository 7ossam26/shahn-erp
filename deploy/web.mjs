import { createServer, request } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('/app/apps/web/dist');
const upstream = new URL(process.env['API_UPSTREAM'] ?? 'http://api:4100');
if (
  upstream.protocol !== 'http:' ||
  upstream.username ||
  upstream.password ||
  upstream.pathname !== '/'
)
  throw new Error('Invalid private API upstream');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  const url = new URL(req.url, 'http://web');
  if (url.pathname.startsWith('/api/')) {
    const proxy = request(
      new URL(req.url, upstream),
      { method: req.method, headers: { ...req.headers, host: upstream.host } },
      (remote) => {
        res.writeHead(remote.statusCode ?? 502, remote.headers);
        remote.pipe(res);
      },
    );
    proxy.setTimeout(30000, () => proxy.destroy());
    proxy.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.on('aborted', () => proxy.destroy());
    req.pipe(proxy);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + sep) && path !== root) {
      res.writeHead(404);
      res.end();
      return;
    }
    let file = path;
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) file = resolve(root, 'index.html');
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.setHeader(
      'Cache-Control',
      file.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
    );
    if (req.method === 'HEAD') res.end();
    else
      createReadStream(file)
        .on('error', () => res.destroy())
        .pipe(res);
  } catch {
    res.writeHead(400);
    res.end();
  }
});
server.listen(8080, '0.0.0.0');
const stop = () => {
  server.close();
  server.closeIdleConnections();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
