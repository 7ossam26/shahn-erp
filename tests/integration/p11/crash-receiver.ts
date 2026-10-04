import { createApplication } from '../../../apps/api/src/app.js';
import type { IdentityConfig } from '../../../apps/api/src/modules/access/config.js';
import type { IntegrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
process.once(
  'message',
  async (message: { url: string; identity: IdentityConfig; runtime: IntegrationRuntime }) => {
    const app = await createApplication(
      { environment: 'test', runtimeUrl: message.url, migrationUrl: message.url },
      message.identity,
      message.runtime,
    );
    app
      .getHttpAdapter()
      .getInstance()
      .addHook('onSend', async (req, reply, payload) => {
        if (req.url === '/api/v1/consumer/events' && reply.statusCode === 200) {
          process.send?.({ committed: true });
          await new Promise(() => {});
        }
        return payload;
      });
    await app.listen(0, '127.0.0.1');
    process.send?.({ origin: await app.getUrl() });
  },
);
