import { createApplication, DatabaseLifecycle } from '../../apps/api/src/app.js';
import { treasuryCommands } from '../../apps/api/src/modules/finance/treasury-transfers/service.js';
import type { TreasuryCommand } from '@shahn/contracts';
const url = process.env['P10_TEST_DATABASE_URL']!;
const app = await createApplication(
  { environment: 'test', runtimeUrl: url, migrationUrl: url },
  null,
);
const commands = treasuryCommands(app.get(DatabaseLifecycle).pool, {
  afterTransit: async () => {
    if (process.env['P10_CRASH'] === 'before') process.exit(74);
  },
});
app
  .getHttpAdapter()
  .getInstance()
  .post('/api/test/treasury-command', async (req, reply) => {
    const { token, command } = req.body as { token: string; command: TreasuryCommand };
    const result = await commands.execute(token, command);
    if (process.env['P10_CRASH'] === 'after') process.exit(73);
    return reply.send(result.body);
  });
await app.listen(0, '127.0.0.1');
process.send?.({ origin: await app.getUrl() });
process.on('message', async (m) => {
  if (m === 'stop') {
    await app.close();
    process.exit(0);
  }
});
