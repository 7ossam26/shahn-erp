import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
// Secret files are mounted only in the services that need them; never log their contents.
const role = process.argv[2];
const permitted = ['api', 'worker', 'web', 'migrate'];
if (!permitted.includes(role)) throw new Error('Unknown deployment process');
if (role !== 'web') {
  for (const name of [
    'DATABASE_URL',
    'OIDC_CLIENT_SECRET',
    'OIDC_ADMIN_CLIENT_SECRET',
    'SESSION_ENCRYPTION_KEY',
  ]) {
    if (process.env[name + '_FILE'])
      process.env[name] = readFileSync(process.env[name + '_FILE'], 'utf8').trim();
  }
  if (role === 'migrate') {
    if (!process.env['MIGRATION_DATABASE_URL_FILE'])
      throw new Error('Migration credential file is required');
    process.env['MIGRATION_DATABASE_URL'] = readFileSync(
      process.env['MIGRATION_DATABASE_URL_FILE'],
      'utf8',
    ).trim();
    process.argv[2] = 'migrate';
  }
}
const target = {
  api: 'apps/api/dist/main.js',
  worker: 'apps/worker/dist/main.js',
  web: 'deploy/web.mjs',
  migrate: 'packages/database/dist/cli.js',
}[role];
await import(pathToFileURL('/app/' + target).href);
