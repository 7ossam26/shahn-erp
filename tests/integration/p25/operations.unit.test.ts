import { it, expect } from 'vitest';
import {
  deploymentConfiguration,
  operationalLog,
  archiveHealth,
  databaseConfig,
} from '@shahn/database';
import { validateOperations } from '@shahn/contracts';
const env = () => ({
  DEPLOYMENT_MANAGED: 'true',
  APP_ENV: 'production',
  RELEASE_ID: 'p25-test',
  CONFIG_VERSION: '1',
  APP_COMPANY_ID: '11111111-1111-4111-8111-111111111111',
  APP_ORIGIN: 'https://erp.example',
  DATABASE_URL: 'postgresql://runtime:fixture@db/erp',
  DATABASE_POOL_MAX: '8',
  OIDC_ISSUER: 'https://identity.example/realms/company',
  OIDC_CLIENT_ID: 'erp',
  OIDC_AUDIENCE: 'erp',
  OIDC_REDIRECT_URI: 'https://erp.example/api/v1/access/callback',
  OIDC_CLIENT_SECRET: 'test-secret',
  OIDC_ADMIN_CLIENT_ID: 'erp-admin',
  OIDC_ADMIN_CLIENT_SECRET: 'admin-test',
  SESSION_ENCRYPTION_KEY: 'a'.repeat(64),
  TAWSEL_CONFIG_FILE: '/run/secrets/tawsel.json',
  BACKUP_REPOSITORY_REFERENCE: 'repo-test',
  BACKUP_KEY_REFERENCE: 'vault-test',
});
it('managed startup validates company, pool, separate credentials, origin and exact callback/audience', () => {
  expect(deploymentConfiguration(env())?.poolMax).toBe(8);
  for (const overrides of [
    { DATABASE_POOL_MAX: '100' },
    { OIDC_AUDIENCE: 'tawsel' },
    { OIDC_REDIRECT_URI: 'https://wrong.example/callback' },
    { APP_ORIGIN: 'http://erp.example' },
    { DATABASE_URL: 'postgresql://postgres:fixture@db/erp' },
    { MIGRATION_DATABASE_URL: 'postgresql://runtime:fixture@db/erp' },
    { BACKUP_KEY_REFERENCE: '' },
  ])
    expect(() => deploymentConfiguration({ ...env(), ...overrides })).toThrow();
  expect(databaseConfig(env(), 'runtime').runtimeUrl).toContain('runtime:fixture');
  expect(() => databaseConfig(env(), 'migration')).toThrow('MIGRATION_DATABASE_URL');
});
it('routine logs discard contact, address, cookies, credentials, signature and arbitrary error text', () => {
  const output = operationalLog('recovered', {
    commandId: 'abc-123',
    durationMs: 12,
    token: 'SECRET',
    signature: 'SECRET',
    phone: '01000000000',
    address: 'address',
    recipient: 'customer',
    error: new Error('postgresql://SECRET'),
    state: 'Bearer SECRET',
  });
  expect(JSON.parse(output)).toEqual({ event: 'recovered', commandId: 'abc-123', durationMs: 12 });
  expect(output).not.toContain('SECRET');
});
it('archive failure/stale/missing observations require review with no fabricated recoverable time', () => {
  const now = Date.parse('2026-10-09T00:10:00Z');
  const good = {
    lastArchivedAt: '2026-10-09T00:09:00Z',
    failedCount: 0,
    lastFailureAt: null,
    latestBackupStop: null,
  };
  expect(archiveHealth(good, now).state).toBe('within-target');
  for (const observation of [
    null,
    { ...good, lastArchivedAt: '2026-10-09T00:01:00Z' },
    { ...good, lastFailureAt: '2026-10-09T00:09:30Z', failedCount: 1 },
  ]) {
    expect(archiveHealth(observation, now).state).toBe('review-required');
    expect(archiveHealth(observation, now).lastRecoverableTime).toBeNull();
  }
});
it('operational HTTP contract rejects leaked data and unknown modes', () => {
  const body = {
    schemaVersion: 1,
    mode: 'restore',
    mutationsEnabled: false,
    releaseId: null,
    releaseAuthority: 'company operator after documented reconciliation',
  };
  expect(validateOperations(body)).toBe(true);
  expect(validateOperations({ ...body, token: 'SECRET' })).toBe(false);
  expect(validateOperations({ ...body, mode: 'anything' })).toBe(false);
});
