import type { Pool } from 'pg';
import { transaction, type TransactionClient } from '@shahn/database';
import { AccessError, assertCapability, type AccessContext, type Capability } from '@shahn/domain';
import { loadAccess } from '../access/sessions.js';

export const lockClasses = [
  'identity',
  'aggregate',
  'stock',
  'wallet',
  'employee',
  'money',
  'effects',
] as const;
export type LockClass = (typeof lockClasses)[number];
export class UnitOfWork {
  private rank = -1;
  private lastId = '';
  private readonly held = new Set<string>();
  constructor(
    readonly client: TransactionClient,
    readonly access: AccessContext,
  ) {}
  /** Services call this before locking. Caller must sort all IDs in a class, across services. */
  lockOrder(kind: LockClass, id: string): void {
    const key = kind + ':' + id;
    if (this.held.has(key)) return;
    const rank = lockClasses.indexOf(kind);
    if (rank < this.rank || (rank === this.rank && id < this.lastId))
      throw new Error('LOCK_ORDER_VIOLATION');
    this.rank = rank;
    this.lastId = id;
    this.held.add(key);
  }
  requireLock(kind: LockClass, id: string): void {
    if (!this.held.has(kind + ':' + id)) throw new Error('REQUIRED_LOCK_NOT_HELD');
  }
  assertBranch(branchId: string): void {
    if (!this.access.assignedBranches.some((branch) => branch.id === branchId))
      throw new AccessError('FORBIDDEN_SCOPE');
  }
  static async run<T>(
    pool: Pool,
    token: string,
    companyId: string | undefined,
    capability: Capability,
    operation: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await transaction(pool, async (client) => {
          // Authorization preamble precedes domain lock order; SHARE prevents grant changes
          // until commit without serializing every wallet in the company.
          const access = await loadAccess(client, token, companyId);
          assertCapability(access, capability);
          return operation(new UnitOfWork(client, access));
        });
      } catch (error) {
        if (attempt >= 2 || !['40001', '40P01'].includes((error as { code?: string }).code ?? ''))
          throw error;
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
      }
    }
  }
}
