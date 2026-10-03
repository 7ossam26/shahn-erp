import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { OidcSessionAdapter } from '../../apps/api/src/modules/access/oidc.js';
import { accessFixture, fixtureConfig } from '../support/access.js';
import { identityConfig } from '../../apps/api/src/modules/access/config.js';
let server: Server,
  db: Awaited<ReturnType<typeof isolatedPostgres>>,
  adapter: OidcSessionAdapter,
  fixture: Awaited<ReturnType<typeof accessFixture>>;
let mode = 'valid',
  nonce = '';
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  const key = await generateKeyPair('RS256', { extractable: true }),
    wrong = await generateKeyPair('RS256', { extractable: true }),
    jwk = await exportJWK(key.publicKey);
  jwk.kid = 'fixture';
  jwk.alg = 'RS256';
  server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const issuer = adapter.config.issuer;
    if (req.url?.includes('.well-known')) {
      res.end(
        JSON.stringify({
          issuer: mode === 'discovery-issuer' ? issuer + '/wrong' : issuer,
          authorization_endpoint: issuer + '/authorize',
          token_endpoint: issuer + '/token',
          jwks_uri: issuer + '/jwks',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['client_secret_post'],
          code_challenge_methods_supported: ['S256'],
        }),
      );
      return;
    }
    if (req.url === '/jwks') {
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    if (req.url === '/token') {
      const seconds = Math.floor(Date.now() / 1000);
      const claims = {
        iss: mode === 'issuer' ? issuer + '/forged' : issuer,
        aud: mode === 'audience' ? 'other-client' : 'erp',
        sub: mode === 'subject' ? 'unbound-subject' : fixture.admin.subject,
        nonce: mode === 'nonce' ? 'wrong' : nonce,
        iat: seconds,
        exp: mode === 'expired' ? seconds - 100 : seconds + 60,
        auth_time: seconds,
        acr: '1',
      };
      const idToken = await new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
        .sign(mode === 'signature' ? wrong.privateKey : key.privateKey);
      res.end(
        JSON.stringify({
          access_token: 'narrow-fixture-only',
          token_type: 'Bearer',
          id_token: idToken,
          expires_in: 60,
        }),
      );
      return;
    }
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error();
  fixture = await accessFixture(
    db.pool,
    fixtureConfig('http://127.0.0.1:5291', `http://127.0.0.1:${address.port}`),
  );
  adapter = new OidcSessionAdapter(db.pool, fixture.config);
});
afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  await db?.dispose();
});
// This malicious protocol fixture proves rejection validation only. Actual successful login uses Keycloak in Playwright.
for (const invalid of [
  'issuer',
  'audience',
  'subject',
  'nonce',
  'expired',
  'signature',
  'state',
  'discovery-issuer',
])
  it(`P02 rejects ${invalid} at the OIDC server boundary`, async () => {
    mode = invalid === 'discovery-issuer' ? 'valid' : invalid;
    const local = new OidcSessionAdapter(db.pool, fixture.config);
    const start = await local.begin({
        companyCode: 'trial',
        username: 'admin',
        support: false,
        returnPath: '/',
      }),
      url = new URL(start.url);
    nonce = url.searchParams.get('nonce')!;
    mode = invalid;
    const callback = new URL(fixture.config.origin + '/api/v1/access/callback');
    callback.searchParams.set(
      'state',
      invalid === 'state' ? randomUUID() : url.searchParams.get('state')!,
    );
    callback.searchParams.set('code', 'fixture-code');
    const before = (await db.pool.query('SELECT count(*) FROM access.server_session')).rows[0]
      .count;
    const target =
      invalid === 'discovery-issuer' ? new OidcSessionAdapter(db.pool, fixture.config) : local;
    await expect(target.callback(callback, start.browser)).rejects.toMatchObject({
      code: 'LOGIN_FAILED',
    });
    expect((await db.pool.query('SELECT count(*) FROM access.server_session')).rows[0].count).toBe(
      before,
    );
  });
it('P02 only allows insecure transport for loopback development; production config fails closed', () => {
  const env = {
    APP_ENV: 'production',
    OIDC_ISSUER: 'http://example.com',
    OIDC_CLIENT_ID: 'erp',
    OIDC_CLIENT_SECRET: 'fixture',
    OIDC_ADMIN_CLIENT_ID: 'admin',
    OIDC_ADMIN_CLIENT_SECRET: 'fixture',
    APP_ORIGIN: 'https://example.com',
    SESSION_ENCRYPTION_KEY: 'a'.repeat(64),
  };
  expect(() => identityConfig(env)).toThrow('requires HTTPS');
  expect(() => identityConfig({ ...env, OIDC_ISSUER: 'https://id.example.com' })).not.toThrow();
  expect(() => identityConfig({ APP_ENV: 'production' })).toThrow('OIDC_ISSUER');
});
