import type { TransactionClient } from '@shahn/database';
/**
 * Cairo business date for storage. Production reads the database clock in Africa/Cairo (never a
 * fixed UTC offset). Tests and the isolated trial inject a controlled clock; they never change the
 * database server time.
 */
export interface StorageClock {
  today(client: TransactionClient): Promise<string>;
}
export const databaseStorageClock: StorageClock = {
  async today(client) {
    return (
      await client.query<{ today: string }>(
        `SELECT (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date::text AS today`,
      )
    ).rows[0]!.today;
  },
};
/** Controlled clock for isolated tests/trials only. */
export function controlledStorageClock(today: string | (() => string)): StorageClock {
  return { today: async () => (typeof today === 'function' ? today() : today) };
}
