import { createPool } from '@shahn/database';
import { MonitoringReader } from '../../../apps/api/src/modules/execution/monitoring-reader.service.js';
import { RemittanceEvidenceService } from '../../../apps/api/src/modules/finance/remittances/evidence.service.js';
import { RemittanceService } from '../../../apps/api/src/modules/finance/remittances/service.js';
import type { IntegrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import type { RemittanceCommand } from '@shahn/contracts';
let raw = '';
for await (const chunk of process.stdin) raw += String(chunk);
const config = JSON.parse(raw) as {
  url: string;
  token: string;
  runtime: IntegrationRuntime;
  input: RemittanceCommand;
  mode: 'commit' | 'recover';
};
const database = new URL(config.url);
if (!database.username.includes('test') || database.hostname !== '127.0.0.1')
  throw Error('Isolated test database required');
const pool = createPool(config.url),
  service = new RemittanceService(
    pool,
    new RemittanceEvidenceService(pool, new MonitoringReader(pool, config.runtime)),
  );
if (config.mode === 'commit') {
  await service.confirm(config.token, config.input);
  // Deliberately exit without sending a command response, after PostgreSQL committed.
  process.exit(88);
} else {
  const result = await service.recover(
    config.token,
    config.input.companyId,
    config.input.commandId,
  );
  process.stdout.write(JSON.stringify(result));
  await pool.end();
}
