import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transaction, sourceByCompany, insertReplayedEvent } from '@shahn/database';
import type { ReconciliationSnapshot } from '@shahn/contracts/tawsel';
import { returnFixture } from '../p14/fixtures.js';
import { RecoveryClient } from '../../../apps/api/src/modules/integration/recovery-client.js';
import { RecoveryWorker } from '../../../apps/api/src/modules/integration/recovery-worker.js';
import { recoveryCommands } from '../../../apps/api/src/modules/integration/recovery.service.js';
import { recoveryDetail } from '../../../apps/api/src/modules/integration/recovery.service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { normalizedRecoveryState } from '../../../scripts/verification/p22-restore.js';
it('reconciles original return identity with accumulated balances, rejects a zero reset and deduplicates later receipt history', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const f = await returnFixture(db.pool),
      x = await f.setup({ stock: true });
    await f.commands.execute(f.admin.token, f.receiveInput(x.request, 1, 'sound', true));
    const accepted = await f.accept(),
      item = accepted.body.request.items[0]!;
    const before = await normalizedRecoveryState(db.pool, f.company);
    let snapshot: ReconciliationSnapshot = {
      schemaVersion: '1.0.0',
      tenantId: f.connection.tenantId,
      recipientIntegrationId: f.connection.integrationId,
      aggregate: { type: 'return-request', id: x.request.requestId },
      throughSequence: 2,
      capturedAt: new Date().toISOString(),
      history: 'current-state-only',
      retention: 'indefinite-no-purge',
      state: {
        task: null,
        outcomes: [],
        returnRequest: x.request,
        returnItems: [
          {
            itemId: item.itemId,
            taskId: item.taskId,
            sourceLineId: item.sourceLineId,
            requested: item.requested,
            received: item.received,
            lost: item.lost,
            damaged: item.damaged,
            unresolved: item.unresolved,
          },
        ],
        notices: [],
      },
    };
    class Client extends RecoveryClient {
      override async reconciliation() {
        return {
          body: snapshot,
          rawBody: Buffer.from(JSON.stringify(snapshot)),
          retrievedAt: new Date().toISOString(),
        };
      }
    }
    const queue = () =>
      recoveryCommands(db.pool).execute(f.admin.token, {
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        type: 'recovery.reconcile',
        aggregateType: 'return-request',
        aggregateId: x.request.requestId,
      });
    const worker = new RecoveryWorker(db.pool, f.runtime, () => new Client(f.connection));
    await queue();
    await worker.runOne();
    const checkpoint = () =>
      db.pool.query(
        `SELECT applied_through,snapshot_through,history_complete FROM integration.checkpoint WHERE company_id=$1 AND aggregate_id=$2`,
        [f.company, x.request.requestId],
      );
    expect((await checkpoint()).rows[0]).toEqual({
      applied_through: '1',
      snapshot_through: '2',
      history_complete: false,
    });
    expect(await normalizedRecoveryState(db.pool, f.company)).toEqual(before);
    snapshot = structuredClone(snapshot);
    snapshot.state.returnItems[0]!.received = 0;
    snapshot.state.returnItems[0]!.unresolved = item.requested;
    const rejected = (await queue()).body as { jobId: string };
    const detail = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'integration', (u) =>
      recoveryDetail(u, rejected.jobId),
    );
    expect(detail.relatedShipments).toHaveLength(1);
    expect(detail.relatedShipments[0]!.id).toBe(x.s.shipmentId);
    await worker.runOne();
    expect(
      (
        await db.pool.query(`SELECT state,last_error FROM integration.recovery_job WHERE id=$1`, [
          rejected.jobId,
        ])
      ).rows[0],
    ).toEqual({ state: 'review-required', last_error: 'SNAPSHOT_RETURN_BALANCE_REGRESSION' });
    expect((await checkpoint()).rows[0]).toMatchObject({
      snapshot_through: '2',
      history_complete: false,
    });
    const event = f.event(
      'return.subsetReceived',
      { transition: accepted.body.transitions[0]! },
      x.request.requestId,
      2,
      'return-request',
    );
    await f.receive(event);
    await f.drain();
    await f.receive(event);
    await transaction(db.pool, async (c) =>
      insertReplayedEvent(c, (await sourceByCompany(c, f.company, true))!, event),
    );
    await f.drain();
    expect((await checkpoint()).rows[0]).toEqual({
      applied_through: '2',
      snapshot_through: '2',
      history_complete: true,
    });
    expect(await normalizedRecoveryState(db.pool, f.company)).toEqual(before);
  } finally {
    await db.dispose();
  }
});
