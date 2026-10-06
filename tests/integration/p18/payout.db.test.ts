import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type { FinanceResult, BrandPayoutScope, BrandPayoutResult } from '@shahn/contracts';
import { incidentFixture } from './fixtures.js';
import { financeCommands } from '../../../apps/api/src/modules/finance/service.js';
import { BrandPayoutService } from '../../../apps/api/src/modules/finance/brand-payouts/service.js';
it('P17 pays the real incident credit from isolated test funds before employee recovery; review retains paid source history', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    const f = await incidentFixture(db.pool),
      money = financeCommands(db.pool),
      today = cairoDate(new Date());
    const base = () => ({
      schemaVersion: 1 as const,
      companyId: f.company,
      commandId: randomUUID(),
    });
    const account = (
      (
        await money.execute(f.admin.token, {
          ...base(),
          type: 'account.create',
          fields: {
            name: 'P18 خزنة اختبار معزولة',
            type: 'cash',
            currency: 'EGP',
            branchIds: [f.b],
            active: true,
            bankDescription: '',
          },
        })
      ).body as FinanceResult
    ).entityId;
    await money.execute(f.admin.token, {
      ...base(),
      type: 'movement.create',
      fields: {
        accountId: account,
        branchId: f.b,
        currency: 'EGP',
        amountMinor: '2000000',
        actualDate: today,
        method: 'cash',
        direction: 'deposit',
        reason: 'أموال اختبار في قاعدة مؤقتة فقط',
      },
    });
    const payouts = new BrandPayoutService(db.pool);
    const pay = async (amountMinor: string) => {
      const scope: BrandPayoutScope = {
        companyId: f.company,
        brandId: f.seed.brand,
        payingBranchId: f.b,
        accountId: account,
        amountMinor,
        actualDate: today,
        method: 'cash',
      };
      const p = await payouts.preview(f.admin.token, scope);
      expect(p.blockers).toEqual([]);
      return (
        await payouts.confirm(f.admin.token, {
          ...scope,
          ...base(),
          type: 'brand.payout.confirm',
          ...(p.offDay ? { offDayReason: 'اختبار قبل تحصيل حصة الموظف' } : {}),
          expectedReadinessRevision: p.readinessRevision,
        })
      ).body as BrandPayoutResult;
    };
    await pay('1000000');
    const x = await f.shipment(),
      r = await f.report(x.s.shipmentId);
    const before = await f.counts();
    await f.confirm(r.result.incidentId);
    expect((await f.counts()).cash).toBe(before.cash);
    const payout = await pay('40000');
    let d = await f.incidentDetail(r.result.incidentId);
    expect(d.payouts).toContainEqual({
      id: payout.payoutId,
      reference: payout.reference,
      amountMinor: '40000',
    });
    expect(d.recovery).toMatchObject({ status: 'awaiting_p20', amountMinor: '20000' });
    await f.service().execute(
      f.admin.token,
      f.incidentCommand({
        type: 'incident.review',
        incidentId: d.id,
        expectedVersion: 2,
        reason: 'تصحيح بعد تحصيل البراند يحتاج خدمة التسويات',
      }),
    );
    d = await f.incidentDetail(d.id);
    expect(d.review?.holdMinor).toBe('0');
    expect(d.payouts[0]!.id).toBe(payout.payoutId);
    expect(d.confirmation?.compensationMinor).toBe('40000');
  } finally {
    await db.dispose();
  }
});
