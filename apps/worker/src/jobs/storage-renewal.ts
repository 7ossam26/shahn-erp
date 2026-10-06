import type { Pool } from 'pg';
import { StorageRenewalService, type RenewalOutcome, type StorageClock } from '@shahn/api/storage';
/**
 * Scheduled storage renewal on the existing PostgreSQL durable-work lane (no Redis and no second
 * scheduler). Discovery runs periodically and enqueues at most the next single due period per
 * agreement; each claimed job renews one period, and catch-up after downtime chains period by
 * period. Queue age and the last error are visible through the storage screens.
 */
export class StorageRenewalJob {
  private lastDiscovery = Number.NEGATIVE_INFINITY;
  readonly service: StorageRenewalService;
  constructor(
    pool: Pool,
    private readonly options: {
      discoveryMs?: number;
      leaseSeconds?: number;
      clock?: StorageClock;
    } = {},
  ) {
    this.service = new StorageRenewalService(pool, {
      leaseSeconds: options.leaseSeconds ?? 60,
      ...(options.clock ? { clock: options.clock } : {}),
    });
  }
  async runOne(): Promise<RenewalOutcome | null> {
    const now = Date.now();
    if (now - this.lastDiscovery >= (this.options.discoveryMs ?? 30000)) {
      this.lastDiscovery = now;
      await this.service.discover();
    }
    return this.service.runOne();
  }
}
