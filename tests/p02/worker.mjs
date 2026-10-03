import { createPool } from '@shahn/database';
import { IdentityWorker, KeycloakIdentityAdapter, identityConfig } from '@shahn/api/access';
const pool = createPool(process.env.DATABASE_URL),
  adapter = new KeycloakIdentityAdapter(identityConfig());
const real = adapter.reconcile.bind(adapter);
if (process.env.P02_CRASH === 'true')
  adapter.reconcile = async (intent) => {
    const subject = await real(intent);
    process.send({ event: 'remote_created', subject });
    await new Promise(() => setInterval(() => {}, 1000));
    return subject;
  };
try {
  await new IdentityWorker(pool, adapter).runOne();
} finally {
  await pool.end();
  if (process.connected) process.disconnect();
}
