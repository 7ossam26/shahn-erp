import { AsyncLocalStorage } from 'node:async_hooks';
import type { Pool, PoolClient } from 'pg';
export type TransactionClient = Pick<PoolClient, 'query'>;
const active = new AsyncLocalStorage<boolean>();
/** Join an existing client in services. Never open an independent transaction inside this callback. */
export async function transaction<T>(
  pool: Pool,
  operation: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  if (active.getStore()) throw new Error('NESTED_INDEPENDENT_TRANSACTION_FORBIDDEN');
  const client = await pool.connect();
  let broken = false;
  // A socket can fail while a same-transaction service is between queries (for example waiting
  // on a barrier). Keep that asynchronous error from becoming an unhandled process exception.
  const disconnected = () => {
    broken = true;
  };
  client.on('error', disconnected);
  try {
    await client.query('BEGIN');
    const result = await active.run(true, () => operation({ query: client.query.bind(client) }));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      broken = true;
    }
    throw error;
  } finally {
    client.removeListener('error', disconnected);
    client.release(broken);
  }
}
