import { createApplication, DatabaseLifecycle } from '../../apps/api/src/app.js';
import { financeCommands } from '../../apps/api/src/modules/finance/service.js';
import type { FinanceCommand } from '@shahn/contracts';
const url = process.env['P09_TEST_DATABASE_URL']!;
const app = await createApplication(
  { environment: 'test', runtimeUrl: url, migrationUrl: url },
  null,
);
const commands = financeCommands(app.get(DatabaseLifecycle).pool, {
  afterPosting: async () => {
    if (process.env['P09_CRASH'] === 'before') process.exit(74);
  },
});
app
  .getHttpAdapter()
  .getInstance()
  .post('/api/test/finance-command', async (req, reply) => {
    const { token, command } = req.body as { token: string; command: FinanceCommand };
    const result = await commands.execute(token, command);
    if (process.env['P09_CRASH'] === 'after') process.exit(73);
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
