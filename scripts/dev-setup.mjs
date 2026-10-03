import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) {
  console.log('.env already exists; preserved.');
  process.exit(0);
}
const password = randomBytes(24).toString('hex');
const url = `postgresql://shahn_p01_dev:${password}@127.0.0.1:15418/shahn_p01_dev`;
writeFileSync(
  '.env',
  `APP_ENV=development\nAPP_ORIGIN=http://127.0.0.1:5173\nAPI_HOST=127.0.0.1\nAPI_PORT=4100\nDATABASE_URL=${url}\nMIGRATION_DATABASE_URL=${url}\nDEV_DB_USER=shahn_p01_dev\nDEV_DB_PASSWORD=${password}\nDEV_DB_PORT=15418\nVITE_ENABLE_DEMOS=true\n`,
  { mode: 0o600 },
);
console.log(
  'Created ignored .env with random isolated local credentials. Runtime and migration fields share this local role only.',
);
