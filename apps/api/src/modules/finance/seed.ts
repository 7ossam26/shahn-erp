import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import type { FinanceResult } from '@shahn/contracts';
import { financeCommands } from './service.js';
import { commercialCommands } from '../brands/service.js';
/** Repeatable fixture intent IDs are separate from any production command. */
function seedId(companyId: string, label: string) {
  const h = createHash('sha256')
    .update('P09:' + companyId + ':' + label)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function seedFinance(
  pool: Pool,
  token: string,
  companyId: string,
  branches: { a: string; b: string },
  environment: string,
) {
  if (!['test', 'development'].includes(environment)) throw Error('P09_PRODUCTION_SEED_REFUSED');
  const company = (
    await pool.query<{ name: string }>('SELECT name FROM access.company WHERE id=$1', [companyId])
  ).rows[0];
  if (!company?.name.startsWith('P09 ')) throw Error('P09_ISOLATED_COMPANY_REQUIRED');
  const service = financeCommands(pool),
    base = { schemaVersion: 1 as const, companyId };
  const cash = (
    await service.execute(token, {
      ...base,
      commandId: seedId(companyId, 'cash'),
      type: 'account.create',
      fields: {
        name: 'P09 خزينة ب',
        type: 'cash',
        currency: 'EGP',
        branchIds: [branches.b],
        active: true,
        bankDescription: '',
      },
    })
  ).body as FinanceResult;
  const bank = (
    await service.execute(token, {
      ...base,
      commandId: seedId(companyId, 'bank'),
      type: 'account.create',
      fields: {
        name: 'P09 بنك الشركة',
        type: 'bank',
        currency: 'EGP',
        branchIds: [branches.a, branches.b],
        active: true,
        bankDescription: 'حساب تجريبي',
      },
    })
  ).body as FinanceResult;
  const category = (
    await commercialCommands(pool).execute(token, {
      ...base,
      commandId: seedId(companyId, 'category'),
      type: 'reference.create',
      fields: {
        kind: 'expense_category',
        name: 'P09 مصروف تجريبي',
        active: true,
        parentId: null,
        volumeRange: null,
      },
    })
  ).body as { entityId: string };
  return { cash, bank, categoryId: category.entityId };
}
