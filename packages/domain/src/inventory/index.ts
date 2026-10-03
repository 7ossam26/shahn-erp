import type { StockBalance, StockCondition, ProductFields } from '@shahn/contracts';
import { AccessError } from '../access.js';
export function wholeQuantity(value: number, positive = false): number {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0))
    throw new AccessError('INVALID_QUANTITY', 400);
  return value;
}
export function addQuantity(...values: number[]): number {
  return values.reduce((sum, value) => {
    wholeQuantity(value);
    const next = sum + value;
    if (!Number.isSafeInteger(next)) throw new AccessError('QUANTITY_OVERFLOW', 409);
    return next;
  }, 0);
}
export function stockBalance(
  soundOnHand: number,
  unavailableOnHand: number,
  orderReserved = 0,
  transferReserved = 0,
): StockBalance {
  wholeQuantity(soundOnHand);
  wholeQuantity(unavailableOnHand);
  const reserved = addQuantity(orderReserved, transferReserved);
  return {
    soundOnHand,
    unavailableOnHand,
    physicalOnHand: addQuantity(soundOnHand, unavailableOnHand),
    reserved,
    available: Math.max(soundOnHand - reserved, 0),
    reservationShortage: Math.max(reserved - soundOnHand, 0),
  };
}
export function receiptEffect(quantity: number, condition: StockCondition) {
  wholeQuantity(quantity, true);
  if (!['sound', 'damaged', 'uncertain'].includes(condition))
    throw new AccessError('INVALID_CONDITION', 400);
  return {
    sound: condition === 'sound' ? quantity : 0,
    unavailable: condition === 'sound' ? 0 : quantity,
  };
}
export function validateProduct(fields: ProductFields) {
  if (!fields.name.trim() || !fields.variants.length || fields.variants.some((v) => !v.name.trim()))
    throw new AccessError('VALIDATION_FAILED', 400);
  const ids = fields.variants.map((v) => v.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new AccessError('DUPLICATE_VARIANT_ID', 400);
}
