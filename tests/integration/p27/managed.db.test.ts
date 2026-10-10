import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { migrate } from '@shahn/database';
import { isolatedPostgres } from '@shahn/test-support';
import { setupFixture } from './setup-fixture.js';
import { authoritativeRuntime } from '../../../apps/api/src/modules/integration/connection-provider.js';
import { validateManagedConnection } from '../../../apps/api/src/modules/integration/managed-connection.js';
import { installedSourceEvidence } from '../../../apps/api/src/modules/integration/installed-source-evidence.js';
import Fastify from 'fastify';
import { senderFixture } from '../p11/fixtures.js';
import { registerSignedReceiver } from '../../../apps/api/src/modules/integration/signed-receiver.controller.js';
import { signatureFor } from '../../../apps/api/src/modules/integration/signature-verifier.js';
import { ProjectionWorker } from '../../../apps/api/src/modules/execution/projection-worker.js';
import { validateSenderEvent } from '@shahn/contracts/tawsel';
it('shared managed API/worker admission permits deliberate unbound setup, refuses accidental empty and never weakens bound recovery; installed history preserves its remote anchor', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const f = await setupFixture(db.pool),
      runtime = authoritativeRuntime(db.pool, { connections: [] }, f.installation);
    await expect(
      validateManagedConnection(db.pool, runtime, f.company, f.config.issuer, 'database'),
    ).rejects.toThrow('intentional Tawsel setup-required');
    await validateManagedConnection(db.pool, runtime, f.company, f.config.issuer, 'setup-required');
    const importId = randomUUID();
    await f.service.import(f.support.token, f.company, importId, f.p.metadata.apiUrl, f.p);
    await f.service.confirm(f.support.token, {
      schemaVersion: 1,
      type: 'integration.confirmConnection',
      companyId: f.company,
      commandId: randomUUID(),
      importId,
    });
    await validateManagedConnection(db.pool, runtime, f.company, f.config.issuer, 'database');
    await expect(
      validateManagedConnection(db.pool, runtime, randomUUID(), f.config.issuer, 'setup-required'),
    ).rejects.toThrow('bound Tawsel connection');
    await expect(
      validateManagedConnection(
        db.pool,
        authoritativeRuntime(db.pool, { connections: [] }, { ...f.installation, keys: {} }),
        f.company,
        f.config.issuer,
        'setup-required',
      ),
    ).rejects.toThrow('INTEGRATION_SECRET_RECOVERY_REQUIRED');
    const source = (
        await db.pool.query('SELECT id FROM integration.source WHERE company_id=$1', [f.company])
      ).rows[0].id,
      c = await db.pool.connect();
    try {
      const identity = {
        resourceId: f.p.metadata.integrationId,
        externalId: f.p.metadata.sourceExternalId,
        sourceRevision: 1,
        actionId: randomUUID(),
      };
      expect(await installedSourceEvidence(c, f.company, source, identity, true)).toBe(true);
      expect(await installedSourceEvidence(c, f.company, source, identity)).toBe(false);
      expect(
        await installedSourceEvidence(
          c,
          f.company,
          source,
          { ...identity, sourceRevision: 8 },
          true,
        ),
      ).toBe(false);
      expect(
        await installedSourceEvidence(
          c,
          f.company,
          source,
          { ...identity, resourceId: randomUUID() },
          true,
        ),
      ).toBe(false);
      expect(
        (
          await db.pool.query(
            "SELECT accepted_revision FROM integration.binding WHERE company_id=$1 AND entity='source'",
            [f.company],
          )
        ).rows[0].accepted_revision,
      ).toBe('7');
      expect(
        (await db.pool.query('SELECT count(*)::int n FROM integration.source_command')).rows[0].n,
      ).toBe(0);
    } finally {
      c.release();
    }
    const http = Fastify({ logger: false });
    registerSignedReceiver(http, db.pool, runtime);
    await http.ready();
    try {
      for (const [sequence, revision] of [
        [1, 1],
        [2, 7],
        [3, 8],
      ] as const) {
        const event = senderFixture();
        event.eventId = randomUUID();
        event.tenantId = f.p.metadata.tenantId;
        event.recipientIntegrationId = f.p.metadata.integrationId;
        event.aggregate = {
          type: 'integration',
          id: f.p.metadata.integrationId,
          recipientSequence: sequence,
        };
        event.versions = { sourceRevision: revision };
        const actionId = revision === 7 ? f.p.metadata.bootstrapActionId : randomUUID();
        event.correlation = { actionId };
        event.payload = {
          entity: 'source',
          externalId: f.p.metadata.sourceExternalId,
          resourceId: f.p.metadata.integrationId,
          sourceRevision: revision,
          actionId,
          service: {
            mode: 'service-operation',
            tenantId: f.p.metadata.tenantId,
            integrationId: f.p.metadata.integrationId,
            actorId: null,
          },
        };
        expect(validateSenderEvent(event)).toBe(true);
        const raw = Buffer.from(JSON.stringify(event, null, 2).replaceAll('\n', '\r\n')),
          timestamp = String(Date.now());
        const received = await http.inject({
          method: 'POST',
          url: '/api/v1/consumer/events',
          headers: {
            'content-type': 'application/json',
            'x-tawsel-tenant-id': event.tenantId,
            'x-tawsel-integration-id': event.recipientIntegrationId,
            'x-tawsel-key-id': 'initial',
            'x-tawsel-delivery-timestamp': timestamp,
            'x-tawsel-signature': signatureFor(
              raw,
              { tenantId: event.tenantId, integrationId: event.recipientIntegrationId },
              'initial',
              timestamp,
              f.p.signingKeys[0]!.secret,
            ),
          },
          payload: raw,
        });
        expect(received.statusCode).toBe(200);
      }
      const worker = new ProjectionWorker(db.pool);
      for (let n = 0; n < 8; n++) if (!(await worker.runOne())) break;
      expect(
        (
          await db.pool.query(
            'SELECT recipient_sequence::int AS sequence,application_state FROM integration.inbox ORDER BY recipient_sequence',
          )
        ).rows,
      ).toEqual([
        { sequence: 1, application_state: 'applied' },
        { sequence: 2, application_state: 'applied' },
        { sequence: 3, application_state: 'pending' },
      ]);
      expect(
        (
          await db.pool.query(
            "SELECT accepted_revision FROM integration.binding WHERE company_id=$1 AND entity='source'",
            [f.company],
          )
        ).rows[0].accepted_revision,
      ).toBe('7');
    } finally {
      await http.close();
    }
  } finally {
    await db.dispose();
  }
});
