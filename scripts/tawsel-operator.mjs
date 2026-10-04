import { readFileSync } from 'node:fs';
import { createPool, databaseConfig, loadEnvironment } from '@shahn/database';
import { integrationRuntime, SourceCommandWorker } from '@shahn/api/integration';
loadEnvironment();
// An explicit operator process only; the ordinary worker never loads this token.
const tokenFile = process.env.TAWSEL_OPERATOR_TOKEN_FILE;
if (!tokenFile)
  throw Error('TAWSEL_OPERATOR_TOKEN_FILE is required for the explicit operator process.');
const token = readFileSync(tokenFile, 'utf8').trim();
if (!token) throw Error('Operator token file is empty.');
const pool = createPool(databaseConfig().runtimeUrl);
try {
  const worker = new SourceCommandWorker(pool, integrationRuntime(), undefined, token);
  console.log(JSON.stringify({ operatorWorkProcessed: await worker.runOne() }));
} finally {
  await pool.end();
}
