import { expect, it } from 'vitest';
import { validateReadiness, validateLiveness } from '@shahn/contracts';
import { databaseConfig } from '@shahn/database';
it('validates safe versioned status and refuses extra secret fields', () => {
  const value = {
    schemaVersion: 1,
    service: 'api',
    status: 'not_ready',
    database: 'unavailable',
    checkedAt: '2026-10-03T10:00:00Z',
    migrations: { state: 'unknown', required: ['0001_foundation'], applied: [] },
  };
  expect(validateReadiness(value)).toBe(true);
  expect(validateReadiness({ ...value, databaseUrl: 'secret' })).toBe(false);
  expect(validateReadiness({ ...value, checkedAt: 'not a date' })).toBe(false);
  expect(
    validateLiveness({
      schemaVersion: 1,
      service: 'api',
      status: 'alive',
      dependenciesChecked: false,
      checkedAt: value.checkedAt,
    }),
  ).toBe(true);
});
it('reports only configuration field names, never credential values', () => {
  expect(() =>
    databaseConfig({ APP_ENV: 'test', DATABASE_URL: 'postgres://username:SECRET@localhost/test' }),
  ).toThrow('MIGRATION_DATABASE_URL is required');
  try {
    databaseConfig({
      APP_ENV: 'test',
      DATABASE_URL: 'SECRET',
      MIGRATION_DATABASE_URL: 'postgres://localhost/test',
    });
  } catch (error) {
    expect(String(error)).not.toContain('SECRET');
  }
});
