import pg from 'pg';
export * from './repositories/integration.repository.js';
export * from './commercial.js';
export * from './inventory/index.js';
export { databaseConfig, loadEnvironment, type DatabaseConfig } from './config.js';
export { transaction, type TransactionClient } from './transaction.js';
export {
  readMigrations,
  migrationStatus,
  migrate,
  type Migration,
  type MigrationStatus,
} from './migrations.js';
export function createPool(connectionString: string, max = 5): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 1500,
    idleTimeoutMillis: 10000,
    statement_timeout: 5000,
    options: '-c timezone=UTC',
  });
  // Idle socket errors must not crash a healthy process or expose a connection string.
  pool.on('error', () => {
    process.stderr.write('{"event":"database_idle_connection_unavailable"}\n');
  });
  return pool;
}
export * from './shipments/index.js';

export * from './inventory/stock-reservations.repository.js';
export * from './employees/index.js';
