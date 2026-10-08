import { it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { payoutFixture } from '../p17/fixtures.js';
import { ProjectionWorker } from '../../../apps/api/src/modules/execution/projection-worker.js';
import { createApplication } from '../../../apps/api/src/app.js';
import { signatureFor } from '../../../apps/api/src/modules/integration/signature-verifier.js';
import { restoreIsolatedRecoveryDatabase } from '../../../scripts/verification/p22-restore.js';
it('backs up disposable ERP, restores a separate DB, rebuilds API/worker and redelivers original messages without additional ledger/custody/visit effects', async () => {
  const db = await isolatedPostgres();
  let f: Awaited<ReturnType<typeof payoutFixture>> | undefined;
  try {
    await migrate(db.pool);
    f = await payoutFixture(db.pool);
    const fixture = f;
    const brand = await f.brand('P22 restore brand'),
      round = await f.brandRound(brand, [{ kind: 'full', goodsMinor: '25000' }]);
    await f.remit(round.scope);
    await f.payoutService.confirm(
      f.payB.token,
      await f.command(f.scope(brand, '10000'), {}, f.payB.token),
    );
    for (let i = 0; i < 20; i++) if (!(await f.worker.runOne())) break;
    const originals = (
      await db.pool.query<{ raw_body: Buffer }>(
        `SELECT raw_body FROM integration.inbox WHERE company_id=$1 ORDER BY aggregate_type,aggregate_id,recipient_sequence`,
        [f.company],
      )
    ).rows;
    expect(originals.length).toBeGreaterThan(0);
    const result = await restoreIsolatedRecoveryDatabase(db, f.company, async (pool, url) => {
      const app = await createApplication(
        { environment: 'test', runtimeUrl: url, migrationUrl: url },
        fixture.config,
        fixture.runtime,
      );
      try {
        await app.listen(0, '127.0.0.1');
        const origin = await app.getUrl(),
          worker = new ProjectionWorker(pool);
        for (const e of [...originals, ...originals]) {
          const bytes = e.raw_body,
            ts = String(Date.now());
          const r = await fetch(origin + '/api/v1/consumer/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tawsel-Tenant-Id': fixture.connection.tenantId,
              'X-Tawsel-Integration-Id': fixture.connection.integrationId,
              'X-Tawsel-Key-Id': 'trial',
              'X-Tawsel-Delivery-Timestamp': ts,
              'X-Tawsel-Signature': signatureFor(
                bytes,
                {
                  tenantId: fixture.connection.tenantId,
                  integrationId: fixture.connection.integrationId,
                },
                'trial',
                ts,
                fixture.connection.signingKeys['trial']!,
              ),
            },
            body: bytes.toString('utf8'),
          });
          expect(r.status).toBe(200);
          expect((await r.json()).acknowledgement).toBe('received');
          for (let i = 0; i < 20; i++) if (!(await worker.runOne())) break;
        }
      } finally {
        await app.close();
      }
    });
    expect(result.equal).toBe(true);
    expect(result.before['finance.remittance']?.count).toBe(1);
    expect(result.before['finance.brand_payout']?.count).toBe(1);
    await mkdir('docs/verification/P22', { recursive: true });
    await writeFile(
      'docs/verification/P22/restore-comparison.json',
      JSON.stringify(result, null, 2) + '\n',
    );
  } finally {
    await f?.close();
    await db.dispose();
  }
});
