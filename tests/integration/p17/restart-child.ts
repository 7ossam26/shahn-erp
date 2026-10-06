import { createPool } from '@shahn/database';
import type { BrandPayoutCommand } from '@shahn/contracts';
import { BrandPayoutService } from '../../../apps/api/src/modules/finance/brand-payouts/service.js';
let raw = '';
for await (const chunk of process.stdin) raw += String(chunk);
const config = JSON.parse(raw) as {
  url: string;
  token: string;
  input: BrandPayoutCommand;
  mode: 'commit' | 'recover';
};
const database = new URL(config.url);
if (!database.username.includes('test') || database.hostname !== '127.0.0.1')
  throw Error('Isolated test database required');
const pool = createPool(config.url),
  service = new BrandPayoutService(pool);
if (config.mode === 'commit') {
  await service.confirm(config.token, config.input);
  // Deliberately exit after PostgreSQL committed, without delivering the command response.
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
