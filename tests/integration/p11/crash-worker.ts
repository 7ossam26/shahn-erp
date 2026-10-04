import { createPool } from '@shahn/database';
import type { IntegrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { SourceCommandWorker } from '../../../apps/api/src/modules/integration/source-command.service.js';
process.once('message', async (message: { url: string; runtime: IntegrationRuntime }) => {
  const pool = createPool(message.url);
  const worker = new SourceCommandWorker(pool, message.runtime);
  const lease = await worker.claim(1);
  if (!lease) throw new Error('TEST_WORK_MISSING');
  await worker.deliver(lease);
  await pool.end();
});
