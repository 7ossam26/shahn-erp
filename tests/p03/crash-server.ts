import { createApplication, DatabaseLifecycle } from '../../apps/api/src/app.js';
import { registerKernel } from '../../apps/api/src/modules/kernel/http.js';
const url = process.env['P03_TEST_DATABASE_URL']!;
const app = await createApplication(
  { environment: 'test', runtimeUrl: url, migrationUrl: url },
  null,
);
registerKernel(
  app.getHttpAdapter().getInstance(),
  app.get(DatabaseLifecycle).pool,
  'test',
  process.env['P03_TEST_ORIGIN']!,
  {
    afterPosting: async () => {
      if (process.env['P03_CRASH_BEFORE_COMMIT'] === 'true') {
        process.send?.({ position: 'posted-before-audit-and-commit' });
        process.exit(74);
      }
    },
    afterCommit: async () => {
      if (process.env['P03_CRASH_AFTER_COMMIT'] === 'true') {
        process.send?.({ position: 'committed-before-http-response' });
        process.exit(73);
      }
    },
  },
);
await app.listen(0, '127.0.0.1');
process.send?.({ origin: await app.getUrl() });
process.on('message', async (message) => {
  if (message === 'stop') {
    await app.close();
    process.exit(0);
  }
});
