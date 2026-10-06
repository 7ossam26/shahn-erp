import { createPool } from '@shahn/database';
import type { StoragePaymentCommand } from '@shahn/contracts';
import { controlledStorageClock } from '../../../apps/api/src/modules/storage/clock.js';
import { StorageService } from '../../../apps/api/src/modules/storage/service.js';
import { StorageRenewalService } from '../../../apps/api/src/modules/storage/renewal.js';
/** Separate OS process for commit-then-exit recovery cases. Isolated test databases only. */
let raw = '';
for await (const chunk of process.stdin) raw += String(chunk);
const config = JSON.parse(raw) as {
  url: string;
  token: string;
  today: string;
  mode: 'commit' | 'recover' | 'renew-then-exit';
  input?: StoragePaymentCommand;
  leaseSeconds?: number;
};
const database = new URL(config.url);
if (!database.username.includes('test') || database.hostname !== '127.0.0.1')
  throw Error('Isolated test database required');
const pool = createPool(config.url),
  clock = controlledStorageClock(config.today);
if (config.mode === 'commit') {
  await new StorageService(pool, clock).recordPayment(config.token, config.input!);
  // Deliberately exit after PostgreSQL committed, without delivering the command response.
  process.exit(88);
} else if (config.mode === 'recover') {
  const input = config.input!;
  const result = await new StorageService(pool, clock).recoverPayment(
    config.token,
    input.companyId,
    input.commandId,
  );
  process.stdout.write(JSON.stringify(result));
  await pool.end();
} else {
  // Renew one period, then die after its commit and before the job acknowledgement.
  const worker = new StorageRenewalService(pool, {
    clock,
    leaseSeconds: config.leaseSeconds ?? 2,
    hooks: {
      afterCommit: async (outcome, lease) => {
        process.stdout.write(
          JSON.stringify({ outcome, lease: { id: lease.id, fence: lease.fence } }),
        );
        process.exit(77);
      },
    },
  });
  await worker.discover();
  await worker.runOne();
  process.exit(1);
}
