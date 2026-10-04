import { createServer } from 'node:http';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import type { SourceEnvelope, IntakeTask } from '@shahn/contracts/tawsel';
import { dispatchFixture, acceptedResult } from './fixtures.js';
import { SourceCommandWorker } from '../../../apps/api/src/modules/integration/source-command.service.js';
// This is an explicitly controlled HTTP fixture, not a live Tawsel acceptance claim.
it('kills a worker after HTTP fixture commit, then recovers the exact action over real HTTP once', async () => {
  const db = await isolatedPostgres();
  let f: Awaited<ReturnType<typeof dispatchFixture>>;
  let stored: ReturnType<typeof acceptedResult> | undefined,
    task: IntakeTask | undefined,
    postBody = '',
    postCount = 0,
    resultReads = 0;
  let signalCommit!: () => void;
  const committed = new Promise<void>((resolve) => {
    signalCommit = resolve;
  });
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization !== 'Bearer ' + f.connection.serviceBearer) {
      res.writeHead(401).end('{}');
      return;
    }
    if (req.url === '/api/v1/provisioning/configuration') {
      res.end(JSON.stringify(f.configuration));
      return;
    }
    if (req.url?.startsWith('/api/v1/intake/results/')) {
      resultReads++;
      res.end(
        JSON.stringify({ actionId: stored!.receipt.actionId, status: 'accepted', result: stored }),
      );
      return;
    }
    if (req.url?.startsWith('/api/v1/intake/task?')) {
      res.end(JSON.stringify(task));
      return;
    }
    if (req.url === '/api/v1/intake/commands/assignment.receiveBatch') {
      for await (const chunk of req) postBody += String(chunk);
      const e = JSON.parse(postBody) as SourceEnvelope,
        ref = (e.payload.items as { externalId: string; assignmentRevision: number }[])[0]!;
      postCount++;
      stored = acceptedResult(e);
      task = {
        ...f.tasks.get(ref.externalId)!,
        assignmentRevision: ref.assignmentRevision,
        state: 'held',
        receivedAt: new Date().toISOString(),
        planningEligible: true,
        planningStatus: 'failed',
      };
      signalCommit();
      return; // Deliberately lose acknowledgement after the fixture committed.
    }
    res.writeHead(404).end('{}');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  let child: ReturnType<typeof fork> | undefined;
  try {
    await migrate(db.pool);
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw Error('TEST_PORT');
    f = await dispatchFixture(db.pool, undefined, `http://127.0.0.1:${addr.port}`);
    await f.credit(f.seed.brand);
    const s = await f.create({ shippingPayer: 'brand' }),
      d = await f.prepared([s]);
    await f.commands.execute(
      f.admin.token,
      f.command({
        type: 'dispatch.receive',
        intentId: d.id,
        expectedVersion: d.version,
        receiptAsserted: true,
      }),
    );
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
    expect((await f.detail(d.id)).state).toBe('receiving');
    expect((await f.wallet()).cover).toBe('5000');
    await db.pool.query(
      `UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second' WHERE state='leased'`,
    );
    const restarted = new SourceCommandWorker(db.pool, f.runtime);
    expect(await restarted.runOne()).toBe(true);
    expect(resultReads).toBe(1);
    expect(postCount).toBe(1);
    expect((await f.detail(d.id)).state).toBe('accepted');
    const saved = (
      await db.pool.query(
        'SELECT request_body,action_id FROM integration.source_command WHERE action_id=$1',
        [stored!.receipt.actionId],
      )
    ).rows[0];
    expect(saved.request_body).toBe(postBody);
    expect(
      (
        await db.pool.query(
          'SELECT count(*)::int AS n FROM dispatch.custody_effect WHERE action_id=$1',
          [saved.action_id],
        )
      ).rows[0].n,
    ).toBe(1);
    expect((await f.read(s.shipmentId))?.price.recipientDueMinor).toBe('25000');
    expect((await f.wallet()).cover).toBe('5000');
  } finally {
    if (child && child.exitCode === null) child.kill();
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await db.dispose();
  }
});
