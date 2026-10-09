import { expect, it } from 'vitest';
import { identityConfig, identityAdminBase } from '../../../apps/api/src/modules/access/config.js';

const environment = {
  APP_ENV: 'production',
  APP_ORIGIN: 'https://erp.example.test',
  OIDC_ISSUER: 'https://auth.example.test/realms/company',
  OIDC_CLIENT_ID: 'erp',
  OIDC_CLIENT_SECRET: 'test-client-secret',
  OIDC_ADMIN_CLIENT_ID: 'erp-identity',
  OIDC_ADMIN_CLIENT_SECRET: 'test-admin-secret',
  SESSION_ENCRYPTION_KEY: 'a'.repeat(64),
};

it('uses the explicit private administration route while retaining the exact public issuer identity', () => {
  const config = identityConfig({ ...environment, OIDC_ADMIN_ORIGIN: 'http://issuer:8080' })!;
  expect(config.issuer).toBe(environment.OIDC_ISSUER);
  expect(identityAdminBase(config)).toBe('http://issuer:8080/admin/realms/company');
  expect(identityAdminBase(identityConfig(environment)!)).toBe(
    'https://auth.example.test/admin/realms/company',
  );
});

it('rejects credential-bearing, noncanonical and public plaintext administration origins', () => {
  for (const origin of [
    'http://auth.example.test',
    'https://user:password@auth.example.test',
    'https://auth.example.test/admin',
    'https://auth.example.test?token=private',
    'https://auth.example.test#fragment',
    'ftp://issuer',
  ])
    expect(() => identityConfig({ ...environment, OIDC_ADMIN_ORIGIN: origin })).toThrow();
});
