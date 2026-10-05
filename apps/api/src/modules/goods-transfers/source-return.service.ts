import type { GoodsTransferCommand } from '@shahn/contracts';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { receiveGoods } from './receipt.service.js';

/** An actual source receipt competes with destination receipt for the same carrier balance. */
export const receiveSourceReturn = (
  u: UnitOfWork,
  input: Extract<GoodsTransferCommand, { type: 'goods.sourceReturn' }>,
  recordId: string,
) => receiveGoods(u, input, recordId);
