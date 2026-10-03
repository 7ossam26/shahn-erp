import type { Pool } from 'pg';
import type { BrandFields, CommercialCommand } from '@shahn/contracts';
import { commercialCommands } from './service.js';
import { digest } from '../access/crypto.js';
/** Repeatable, explicitly isolated development/test company data. Never called by startup. */
export async function seedCommercial(
  pool: Pool,
  token: string,
  companyId: string,
  branchId: string,
  environment: string,
) {
  if (!['development', 'test'].includes(environment))
    throw Error('COMMERCIAL_SEED_PRODUCTION_REFUSED');
  const commands = commercialCommands(pool);
  type SeedCommand = CommercialCommand extends infer C
    ? C extends CommercialCommand
      ? Omit<C, 'schemaVersion' | 'companyId' | 'commandId'>
      : never
    : never;
  const run = async (key: string, fields: SeedCommand) => {
    const h = digest(companyId + ':P04:' + key);
    const commandId = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
    const reply = await commands.execute(token, {
      schemaVersion: 1,
      companyId,
      commandId,
      ...fields,
    } as CommercialCommand);
    return (reply.body as { entityId: string }).entityId;
  };
  const cairo = await run('cairo', {
    type: 'reference.create',
    fields: {
      kind: 'governorate',
      name: 'القاهرة',
      active: true,
      parentId: null,
      volumeRange: null,
    },
  });
  const giza = await run('giza', {
    type: 'reference.create',
    fields: {
      kind: 'governorate',
      name: 'الجيزة',
      active: true,
      parentId: null,
      volumeRange: null,
    },
  });
  // Dokki under Cairo is the explicitly requested pricing acceptance fixture, not a geographic claim.
  const dokki = await run('dokki', {
    type: 'reference.create',
    fields: {
      kind: 'area',
      name: 'الدقي · منطقة تجربة التسعير',
      active: true,
      parentId: cairo,
      volumeRange: null,
    },
  });
  const foreignArea = await run('other-area', {
    type: 'reference.create',
    fields: { kind: 'area', name: 'منطقة الجيزة', active: true, parentId: giza, volumeRange: null },
  });
  const tier = await run('tier', {
    type: 'reference.create',
    fields: {
      kind: 'tier',
      name: 'الشريحة المتفق عليها',
      active: true,
      parentId: null,
      volumeRange: 'وصف تفاوضي · ١٠٠–٥٠٠ طلب شهريًا',
    },
  });
  const otherTier = await run('other-tier', {
    type: 'reference.create',
    fields: {
      kind: 'tier',
      name: 'شريحة اتفاق أخرى',
      active: true,
      parentId: null,
      volumeRange: null,
    },
  });
  const base = await run('base', {
    type: 'tariff.create',
    fields: { tierId: tier, governorateId: cairo, areaId: null, amountMinor: '5000', active: true },
  });
  const override = await run('override', {
    type: 'tariff.create',
    fields: {
      tierId: tier,
      governorateId: cairo,
      areaId: dokki,
      amountMinor: '6000',
      active: true,
    },
  });
  await run('other-base', {
    type: 'tariff.create',
    fields: {
      tierId: otherTier,
      governorateId: cairo,
      areaId: null,
      amountMinor: '7000',
      active: true,
    },
  });
  const brandFields: BrandFields = {
    name: 'براند التجربة — منتجات القاهرة والخدمات المتفق عليها',
    active: true,
    contact: null,
    externalReference: 'P04-DEMO',
    services: ['brand_packed', 'company_packed'],
    defaultService: 'brand_packed',
    tierId: tier,
    packingUpliftMinor: '500',
    partialDelivery: true,
    payoutWeekdays: [0, 3],
    allowNegativeBalance: false,
    storage: null,
  };
  const brand = await run('brand', { type: 'brand.create', fields: brandFields });
  return {
    companyId,
    branchId,
    cairo,
    giza,
    dokki,
    foreignArea,
    tier,
    otherTier,
    base,
    override,
    brand,
    brandFields,
  };
}
