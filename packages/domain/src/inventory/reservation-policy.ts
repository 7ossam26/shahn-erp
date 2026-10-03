import type { ShipmentFields } from '@shahn/contracts';
import { AccessError } from '../access.js';
import { addQuantity } from './index.js';
export interface StockRequirement {
  variantId: string;
  quantity: number;
}
/** Commercial lines retain their own values; inventory claims aggregate by identity. */
export function stockRequirements(fields: ShipmentFields): StockRequirement[] {
  if (fields.service !== 'stored_stock') return [];
  const totals = new Map<string, number>();
  for (const line of fields.lines) {
    if (!line.variantId) throw new AccessError('STOCK_VARIANT_REQUIRED', 400);
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1)
      throw new AccessError('INVALID_QUANTITY', 400);
    totals.set(line.variantId, addQuantity(totals.get(line.variantId) ?? 0, line.quantity));
  }
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([variantId, quantity]) => ({ variantId, quantity }));
}
export class StockEligibilityError extends AccessError {
  constructor(
    code: 'STOCK_SHORTAGE' | 'PREPARATION_HELD',
    readonly details: {
      variantId: string;
      variantName: string;
      required: number;
      available: number;
      shortage: number;
    }[],
  ) {
    super(code, 409);
  }
}
