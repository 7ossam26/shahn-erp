import { createServer } from 'node:http';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { ReturnRequest, SourceEnvelope } from '@shahn/contracts/tawsel';
import { returnFixture } from './fixtures.js';
import { acceptedResult } from '../p11/fixtures.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { SourceCommandWorker } from '../../../apps/api/src/modules/integration/source-command.service.js';
// Listening HTTP fixture proves ERP transport/restart semantics, not independent Tawsel acceptance.
it('paginated scoped reads and process death after receipt commit recover unchanged action exactly once', async () => {
  const db = await isolatedPostgres();
  let f: Awaited<ReturnType<typeof returnFixture>>,
    requests: ReturnRequest[] = [],
    saved: ReturnType<typeof acceptedResult> | undefined,
    posted = '',
    posts = 0,
    reads = 0;
  let commit!: () => void;
  const committed = new Promise<void>((r) => {
    commit = r;
  });
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization !== 'Bearer ' + f.connection.serviceBearer) {
      res.writeHead(401).end('{}');
      return;
    }
    const url = new URL(req.url!, 'http://localhost');
    if (url.pathname === '/api/v1/provisioning/configuration') {
      res.end(
        JSON.stringify({
          ...f.configuration,
          allowedOperations: [...f.configuration.allowedOperations, 'return.confirmSubsetReceipt'],
        }),
      );
      return;
    }
    if (url.pathname === '/api/v1/erp/returns/pending') {
      expect(url.searchParams.get('driverId')).toBe(requests[0]!.driverId);
      expect(url.searchParams.get('sourceBranchId')).toBe(requests[0]!.sourceBranchId);
      res.end(
        JSON.stringify({
          items: [requests[url.searchParams.has('cursor') ? 1 : 0]],
          nextCursor: url.searchParams.has('cursor') ? null : requests[1]!.requestId,
        }),
      );
      return;
    }
    if (url.pathname.startsWith('/api/v1/erp/returns/requests/')) {
      res.end(JSON.stringify(requests.find((r) => r.requestId === url.pathname.split('/').at(-1))));
      return;
    }
    if (url.pathname.startsWith('/api/v1/erp/returns/actions/')) {
      reads++;
      res.end(
        JSON.stringify({ actionId: saved!.receipt.actionId, status: 'accepted', result: saved }),
      );
      return;
    }
    if (url.pathname === '/api/v1/erp/returns/commands/return.confirmSubsetReceipt') {
      for await (const chunk of req) posted += String(chunk);
      const e = JSON.parse(posted) as SourceEnvelope;
      posts++;
      saved = acceptedResult(e);
      saved.response!.body = { ...(await f.resultFor(e)) };
      commit();
      return;
    }
    res.writeHead(404).end('{}');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  let child: ReturnType<typeof fork> | undefined;
  try {
    await migrate(db.pool);
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw Error('TEST_PORT');
    f = await returnFixture(db.pool, undefined, `http://127.0.0.1:${addr.port}`);
    const x = await f.setup(),
      y = await f.setup();
    requests = [x.request, y.request];
    const client = new TawselClient(f.connection);
    expect(await client.pendingReturns(x.request.driverId, x.request.sourceBranchId)).toHaveLength(
      2,
    );
    expect((await client.returnRequest(y.request.requestId)).requestId).toBe(y.request.requestId);
    await f.commands.execute(f.admin.token, f.receiveInput(x.request));
    child = fork('tests/integration/p11/crash-worker.ts', [], {
      execArgv: ['--import', 'tsx'],
      env: { ...process.env, TSX_TSCONFIG_PATH: 'tsconfig.base.json' },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    child.send({ url: db.url, runtime: f.runtime });
    await committed;
    const exited = once(child, 'exit');
    child.kill();
    await exited;
    expect((await f.readRequest(x.request.requestId)).items[0]!.received).toBe(0);
    expect(
      (
        await db.pool.query(`SELECT state FROM returns.intent WHERE request_id=$1`, [
          x.request.requestId,
        ])
      ).rows[0].state,
    ).toBe('pending');
    await db.pool.query(
      `UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second' WHERE state='leased'`,
    );
    expect(await new SourceCommandWorker(db.pool, f.runtime).runOne()).toBe(true);
    expect(posts).toBe(1);
    expect(reads).toBe(1);
    expect((await f.readRequest(x.request.requestId)).items[0]!.received).toBe(1);
    expect(
      (
        await db.pool.query(
          `SELECT request_body FROM integration.source_command WHERE action_id=$1`,
          [saved!.receipt.actionId],
        )
      ).rows[0].request_body,
    ).toBe(posted);
    const transition = (saved!.response!.body as unknown as { transitions: unknown[] })
      .transitions[0];
    await f.receive(
      f.event('return.subsetReceived', { transition }, x.request.requestId, 2, 'return-request'),
    );
    await f.drain();
    expect(
      (
        await db.pool.query(
          `SELECT count(*)::int n FROM returns.return_receipt_line WHERE shipment_id=$1`,
          [x.s.shipmentId],
        )
      ).rows[0].n,
    ).toBe(1);
  } finally {
    if (child && child.exitCode === null) child.kill();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await db.dispose();
  }
});
