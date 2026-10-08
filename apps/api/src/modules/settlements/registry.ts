import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import type { SettlementOperation, SettlementOperationName } from '@shahn/contracts';
import type { PayrollClock } from '../employees/payroll-period.service.js';
import type { StorageClock } from '../storage/clock.js';
import type { Resolver } from './framework.js';
import { productObserveResolver } from './resolvers/product.js';
import { accountObserveResolver, accountResolveResolver } from './resolvers/account.js';
import {
  brandAdjustResolver,
  brandCorrectResolver,
  incidentResolveResolver,
} from './resolvers/brand.js';
import { sourceResolveResolver } from './resolvers/source.js';
import { employeeAdjustResolver } from './resolvers/employee.js';
import { storageRefundResolver } from './resolvers/storage.js';
import { parcelCancelResolver, parcelIncidentResolver } from './resolvers/parcel.js';

export interface SettlementClocks {
  payrollClock?: PayrollClock;
  storageClock?: StorageClock;
}
/**
 * Explicit, closed resolver registry. Each operation name maps to exactly one typed resolver; there
 * is no generic table/column/ledger executor and no fallback for an unknown operation.
 */
export function settlementRegistry(pool: Pool, clocks: SettlementClocks = {}): Resolver[] {
  const resolvers = [
    productObserveResolver,
    accountObserveResolver,
    accountResolveResolver(clocks.payrollClock),
    brandCorrectResolver,
    brandAdjustResolver,
    employeeAdjustResolver(pool, clocks.payrollClock),
    sourceResolveResolver,
    incidentResolveResolver,
    storageRefundResolver(pool, clocks.storageClock),
    parcelIncidentResolver(pool),
    parcelCancelResolver(pool),
  ] as Resolver[];
  if (new Set(resolvers.map((r) => r.operation)).size !== resolvers.length)
    throw new Error('DUPLICATE_SETTLEMENT_RESOLVER');
  return resolvers;
}
export function resolverFor(registry: readonly Resolver[], op: SettlementOperation): Resolver {
  const r = registry.find((x) => x.matches(op));
  if (!r) throw new AccessError('UNKNOWN_SETTLEMENT_OPERATION', 400);
  return r;
}
export function resolverByName(
  registry: readonly Resolver[],
  name: SettlementOperationName | string,
) {
  return registry.find((r) => r.operation === name) ?? null;
}
/** The documented authority/state/effect matrix exposed for evidence and review. */
export function authorityMatrix(registry: readonly Resolver[]) {
  return registry.map((r) => ({
    operation: r.operation,
    target: r.targetKind,
    grants: ['settlements', ...r.capabilities],
    allowedStates: r.allowedStates,
    forbidden: [...r.forbidden],
  }));
}
