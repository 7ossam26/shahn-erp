import { existsSync } from 'node:fs';
export function loadEnvironment(): void {
  if (process.env['APP_ENV'] && process.env['APP_ENV'] !== 'development') return;
  if (existsSync('.env')) process.loadEnvFile('.env');
}
export interface DatabaseConfig {
  environment: 'development' | 'test' | 'production';
  runtimeUrl: string;
  migrationUrl: string;
}
export function databaseConfig(
  env: NodeJS.ProcessEnv = process.env,
  purpose: 'runtime' | 'migration' = 'migration',
): DatabaseConfig {
  const environment = env['APP_ENV'];
  if (!['development', 'test', 'production'].includes(environment ?? ''))
    throw new Error('Configuration: APP_ENV must be development, test or production');
  for (const key of purpose === 'runtime'
    ? ['DATABASE_URL']
    : ['DATABASE_URL', 'MIGRATION_DATABASE_URL']) {
    if (!env[key]) throw new Error(`Configuration: ${key} is required`);
    try {
      const url = new URL(env[key]);
      if (
        !['postgres:', 'postgresql:'].includes(url.protocol) ||
        !url.hostname ||
        !url.pathname.slice(1)
      )
        throw new Error();
    } catch {
      throw new Error(`Configuration: ${key} must be a valid PostgreSQL URL`);
    }
  }
  return {
    environment: environment as DatabaseConfig['environment'],
    runtimeUrl: env['DATABASE_URL']!,
    migrationUrl: env['MIGRATION_DATABASE_URL'] ?? env['DATABASE_URL']!,
  };
}
