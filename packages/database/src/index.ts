import pg from 'pg';
export * from './operations.js';
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
export function createPool(
  connectionString: string,
  max = Number(process.env['DATABASE_POOL_MAX'] ?? 5),
): pg.Pool {
  if (!Number.isInteger(max) || max < 1 || max > 32)
    throw new Error('Configuration: DATABASE_POOL_MAX must be 1..32');
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
export * from './employees/payroll.repository.js';
export * from './repositories/dispatch.repository.js';

export * from './repositories/execution.repository.js';
export * from './repositories/returns.repository.js';
export * from './repositories/goods-transfer.repository.js';
export * from './incidents/index.js';
export * from './storage/index.js';
export * from './repositories/recovery.repository.js';
