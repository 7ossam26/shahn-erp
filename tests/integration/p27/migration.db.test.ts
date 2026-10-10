import { it, expect } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { setupFixture } from './setup-fixture.js';
import { ConnectionSetup } from '../../../apps/api/src/modules/integration/connection-setup.service.js';
import { packageConnection } from '../../../apps/api/src/modules/integration/connection-package.js';
import { authoritativeRuntime } from '../../../apps/api/src/modules/integration/connection-provider.js';
it('file migration keeps the original native source/selector/history and encrypted old verification material; file credentials cease to be authoritative', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const f = await setupFixture(db.pool),
      id = randomUUID(),
      oldSecret = randomBytes(32).toString('hex'),
      file = {
        connections: [
          {
            ...packageConnection(f.p),
            selector: 'installed-original',
            signingKeys: { legacy: oldSecret },
            initialKeyId: 'legacy',
            serviceBearer: 'twp_' + randomUUID() + '.' + randomBytes(32).toString('hex'),
          },
        ],
      };
    const provider = authoritativeRuntime(db.pool, file, f.installation);
    expect((await provider.resolve!(f.company))?.serviceBearer).toBe(
      file.connections[0]!.serviceBearer,
    );
    await db.pool.query(
      'INSERT INTO integration.source(company_id,id,tenant_id,integration_id,selector,external_id,base_url,issuer) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        f.company,
        id,
        f.p.metadata.tenantId,
        f.p.metadata.integrationId,
        'installed-original',
        f.p.metadata.sourceExternalId,
        f.p.metadata.apiUrl,
        f.p.metadata.issuer,
      ],
    );
    await db.pool.query(
      "INSERT INTO integration.verification_key(company_id,source_id,key_id,active_from,verify_until) VALUES($1,$2,'legacy','1970-01-01','2026-01-01')",
      [f.company, id],
    );
    const before = (
      await db.pool.query('SELECT row_to_json(s) value FROM integration.source s WHERE id=$1', [id])
    ).rows[0].value;
    const service = new ConnectionSetup(db.pool, f.installation, f.service.clientFor, file);
    const bad = randomUUID();
    await service.import(f.support.token, f.company, bad, f.p.metadata.apiUrl, f.p);
    await expect(
      service.confirm(f.support.token, {
        schemaVersion: 1,
        type: 'integration.confirmConnection',
        companyId: f.company,
        commandId: randomUUID(),
        importId: bad,
      }),
    ).rejects.toMatchObject({ code: 'LEGACY_SIGNING_KEYS_REQUIRED' });
    const p = {
        ...structuredClone(f.p),
        signingKeys: [
          { keyId: 'legacy', secret: oldSecret, verifyUntil: '2026-01-01T00:00:00Z' },
          ...f.p.signingKeys,
        ],
      },
      importId = randomUUID();
    await service.import(f.support.token, f.company, importId, p.metadata.apiUrl, p);
    await service.confirm(f.support.token, {
      schemaVersion: 1,
      type: 'integration.confirmConnection',
      companyId: f.company,
      commandId: randomUUID(),
      importId,
    });
    const loaded = await provider.resolve!(f.company);
    expect(loaded?.selector).toBe('installed-original');
    expect(loaded?.serviceBearer).toBe(p.credential.bearer);
    expect(loaded?.signingKeys).toEqual({ legacy: oldSecret, initial: p.signingKeys[1]!.secret });
    // Removing the reviewed file input after migration must not destroy old key recovery.
    expect(
      (await authoritativeRuntime(db.pool, { connections: [] }, f.installation).resolve!(f.company))
        ?.signingKeys,
    ).toEqual(loaded?.signingKeys);
    const after = (
      await db.pool.query('SELECT row_to_json(s) value FROM integration.source s WHERE id=$1', [id])
    ).rows[0].value;
    for (const field of [
      'id',
      'selector',
      'base_url',
      'tenant_id',
      'integration_id',
      'external_id',
      'issuer',
      'created_at',
    ])
      expect(after[field]).toBe(before[field]);
    expect((await db.pool.query('SELECT count(*)::int n FROM integration.source')).rows[0].n).toBe(
      1,
    );
    expect(
      (await db.pool.query('SELECT count(*)::int n FROM integration.source_command')).rows[0].n,
    ).toBe(0);
  } finally {
    await db.dispose();
  }
});
