import { createPool, databaseConfig, loadEnvironment, migrate, migrationStatus } from './index.js';
import { readFile } from 'node:fs/promises';
loadEnvironment();
try {
  const command = process.argv[2];
  if (!['migrate', 'status', 'seed'].includes(command ?? ''))
    throw new Error('Use migrate, status or seed');
  const config = databaseConfig(process.env, command === 'migrate' ? 'migration' : 'runtime');
  if (command === 'seed' && config.environment !== 'development')
    throw new Error('seed:dev refuses non-development configuration');
  const pool = createPool(command === 'migrate' ? config.migrationUrl : config.runtimeUrl);
  try {
    const status = command === 'migrate' ? await migrate(pool) : await migrationStatus(pool);
    if (command === 'migrate' && process.env['DEPLOYMENT_MANAGED'] === 'true')
      await pool.query(
        await readFile(new URL('../../../deploy/postgres/grants.sql', import.meta.url), 'utf8'),
      );
    console.log(JSON.stringify(status, null, 2));
    if (status.state !== 'current') process.exitCode = 1;
    if (command === 'seed' && status.state === 'current')
      console.log(
        'P01: no persistent development fixtures are registered; visual examples are explicitly labeled, deterministic browser fixtures. No rows written.',
      );
  } finally {
    await pool.end();
  }
} catch (error) {
  const message =
    error instanceof Error &&
    /^(Configuration:|seed:dev|Use |MIGRATION_|NO_REGISTERED_)/.test(error.message)
      ? error.message
      : 'Database command failed; verify local database availability and configuration.';
  console.error(message);
  process.exitCode = 1;
}
