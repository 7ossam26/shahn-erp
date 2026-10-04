import type { UnitOfWork } from '../kernel/unit-of-work.js';
import { WalletService } from '../kernel/wallet.js';
import { JournalPosting } from '../kernel/journals.js';
/** Caller has already locked sorted stock positions and all brand wallets. */
export async function reserveShippingCover(
  u: UnitOfWork,
  brandId: string,
  sourceId: string,
  amount: string,
  allowNegative: boolean,
) {
  const wallet = new WalletService(u, brandId);
  await wallet.reserve(sourceId, amount, allowNegative);
  return (
    await u.client.query<{ id: string }>(
      `SELECT id FROM kernel.shipping_cover WHERE company_id=$1 AND source_id=$2`,
      [u.access.companyId, sourceId],
    )
  ).rows[0]!.id;
}
export async function lockShippingWallets(u: UnitOfWork, brands: string[]) {
  const posting = new JournalPosting(u);
  for (const id of [...new Set(brands)].sort()) await posting.lock('brand', id);
}
/** P13 consumes once with a real earned fee; P14/P18 may release only on an authorized lifecycle fact. */
export async function closeShippingCover(
  u: UnitOfWork,
  brandId: string,
  coverSourceId: string,
  lifecycleSourceId: string,
  earnedFeeId: string | null,
  reason: string,
) {
  return new WalletService(u, brandId).closeCover(
    coverSourceId,
    lifecycleSourceId,
    earnedFeeId,
    reason,
  );
}
