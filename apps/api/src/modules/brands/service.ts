import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  AccessError,
  calculatePrice,
  validateBrand,
  validateReference,
  minor,
} from '@shahn/domain';
import { readBrand, readReferences, readTariffs } from '@shahn/database';
import {
  validateCommercialCommand,
  type BrandFields,
  type BrandFilter,
  type BrandList,
  type CommercialCommand,
  type CommercialResult,
  type PriceSnapshot,
  type PricingInput,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { JournalPosting } from '../kernel/journals.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { configurationLock, requireReference } from '../reference-data/service.js';
export async function pricing(uow: UnitOfWork, input: PricingInput): Promise<PriceSnapshot> {
  await configurationLock(uow);
  uow.assertBranch(input.branchId);
  const brand = await readBrand(uow.client, uow.access.companyId, input.brandId);
  if (!brand) throw new AccessError('NOT_FOUND', 404);
  const tier = await requireReference(uow, brand.tierId, 'tier'),
    governorate = await requireReference(uow, input.governorateId, 'governorate'),
    area = input.areaId
      ? await requireReference(uow, input.areaId, 'area', input.governorateId)
      : null;
  const price = calculatePrice(brand, input, await readTariffs(uow.client, uow.access.companyId));
  return {
    schemaVersion: 1,
    currency: 'EGP',
    companyId: uow.access.companyId,
    brandId: brand.id,
    brandName: brand.name,
    policyVersion: brand.version,
    branchId: input.branchId,
    service: input.service,
    partialDelivery: brand.partialDelivery,
    tierId: brand.tierId,
    tierName: tier.name,
    governorateId: input.governorateId,
    governorateName: governorate.name,
    areaId: input.areaId,
    areaName: area?.name ?? null,
    ...price,
    capturedAt: new Date().toISOString(),
  };
}
export async function brandDetail(uow: UnitOfWork, id: string) {
  const brand = await readBrand(uow.client, uow.access.companyId, id);
  if (!brand) throw new AccessError('NOT_FOUND', 404);
  const history = (
    await uow.client.query<{ fields: BrandFields; version: number }>(
      `SELECT fields,version FROM commercial.brand_policy WHERE company_id=$1 AND brand_id=$2 ORDER BY version DESC`,
      [uow.access.companyId, id],
    )
  ).rows.map((r) => ({ ...r.fields, id, version: r.version }));
  return { brand, history };
}
export async function brandList(uow: UnitOfWork, filter: BrandFilter): Promise<BrandList> {
  const args = [
    uow.access.companyId,
    filter.search,
    filter.active,
    filter.service,
    filter.tierId,
    filter.partial,
  ];
  const where = `b.company_id=$1 AND ($2='' OR translate(lower(b.name),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789') LIKE '%' || replace(replace(replace(lower($2),chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_') || '%' OR strpos(translate(lower(COALESCE(p.fields->>'externalReference','')),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),lower($2))>0) AND ($3='all' OR b.active::text=$3) AND ($4='all' OR $4=ANY(p.services)) AND ($5::uuid IS NULL OR p.tier_id=$5) AND ($6='all' OR p.fields->>'partialDelivery'=$6)`;
  const join = `FROM commercial.brand b JOIN commercial.brand_policy p ON (p.company_id,p.brand_id,p.version)=(b.company_id,b.id,b.version)`;
  const total = Number(
    (
      await uow.client.query<{ total: string }>(
        `SELECT count(*)::text AS total ${join} WHERE ${where}`,
        args,
      )
    ).rows[0]!.total,
  );
  const rows = (
    await uow.client.query<{ id: string; version: number; fields: BrandFields }>(
      `SELECT b.id,b.version,p.fields ${join} WHERE ${where} ORDER BY b.name,b.id LIMIT $7 OFFSET $8`,
      [...args, filter.limit, (filter.page - 1) * filter.limit],
    )
  ).rows;
  return {
    items: rows.map((r) => ({ ...r.fields, id: r.id, version: r.version })),
    total,
    page: filter.page,
    limit: filter.limit,
  };
}
async function validatePolicy(uow: UnitOfWork, fields: BrandFields) {
  validateBrand(fields);
  await requireReference(uow, fields.tierId, 'tier', undefined, !fields.active);
  if (fields.storage) {
    const row = await uow.client.query(
      'SELECT id FROM access.branch WHERE company_id=$1 AND id=$2 AND (active OR $3)',
      [uow.access.companyId, fields.storage.branchId, !fields.active],
    );
    if (!row.rowCount) throw new AccessError('INVALID_STORAGE_BRANCH', 409);
  }
}
export function commercialCommands(
  pool: Pool,
  hooks: { afterBrandInsert?: () => Promise<void> } = {},
) {
  const kinds: CommercialCommand['type'][] = [
    'brand.create',
    'brand.update',
    'reference.create',
    'reference.update',
    'tariff.create',
    'tariff.update',
    'pricing.snapshot',
  ];
  const definitions: CommandDefinition<CommercialCommand>[] = kinds.map((kind) => ({
    family: kind.startsWith('reference.')
      ? 'commercial.reference'
      : kind.startsWith('tariff.')
        ? 'commercial.tariff'
        : kind === 'pricing.snapshot'
          ? 'commercial.snapshot'
          : 'commercial.brand',
    kind,
    capability: kind.startsWith('reference.') ? 'reference-data' : 'brands',
    authorize: async (uow, value, recovery) => {
      if (
        kind === 'pricing.snapshot' &&
        recovery &&
        'branchId' in value &&
        typeof value.branchId === 'string'
      )
        uow.assertBranch(value.branchId);
      if (
        !recovery &&
        'input' in value &&
        value.input &&
        typeof value.input === 'object' &&
        'branchId' in value.input
      )
        uow.assertBranch(String(value.input.branchId));
    },
    rejectionReference: (input) => ({
      entityId:
        'entityId' in input
          ? input.entityId
          : 'input' in input
            ? input.input.brandId
            : input.commandId,
      branchId: 'input' in input ? input.input.branchId : input.companyId,
    }),
    resolve: async (uow, reference) => {
      const row = (
        await uow.client.query<{ body: unknown }>(
          'SELECT body FROM commercial.command_outcome WHERE company_id=$1 AND id=$2',
          [uow.access.companyId, reference.outcomeId],
        )
      ).rows[0];
      if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
      return row.body;
    },
    execute: async (uow, input, recordId) => {
      if (!validateCommercialCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
      await configurationLock(uow, input.type !== 'pricing.snapshot');
      const company = uow.access.companyId,
        client = uow.client;
      const entityId = 'entityId' in input ? input.entityId : randomUUID();
      let beforeVersion: number | null = null,
        version = 1,
        snapshot: PriceSnapshot | null = null;
      if (input.type === 'pricing.snapshot') {
        snapshot = await pricing(uow, input.input);
        await client.query(
          `INSERT INTO commercial.price_snapshot(company_id,id,brand_id,policy_version,tariff_id,tariff_version,branch_id,body) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            company,
            entityId,
            snapshot.brandId,
            snapshot.policyVersion,
            snapshot.tariffId,
            snapshot.tariffVersion,
            snapshot.branchId,
            JSON.stringify(snapshot),
          ],
        );
      } else {
        const table = input.type.startsWith('brand.')
          ? 'brand'
          : input.type.startsWith('reference.')
            ? 'reference'
            : 'tariff';
        if ('entityId' in input) {
          const row = (
            await client.query<{ version: number }>(
              `SELECT version FROM commercial.${table} WHERE company_id=$1 AND id=$2 FOR UPDATE`,
              [company, entityId],
            )
          ).rows[0];
          if (!row) throw new AccessError('NOT_FOUND', 404);
          if (row.version !== input.expectedVersion)
            throw new AccessError('REVISION_CONFLICT', 409, row.version);
          beforeVersion = row.version;
          version = row.version + 1;
        }
        if (input.type === 'brand.create' || input.type === 'brand.update') {
          const fields = input.fields;
          await validatePolicy(uow, fields);
          if (input.type === 'brand.create') {
            await client.query(
              'INSERT INTO commercial.brand(company_id,id,name,active,version) VALUES($1,$2,$3,$4,$5)',
              [company, entityId, fields.name, fields.active, version],
            );
            await hooks.afterBrandInsert?.();
            await new JournalPosting(uow).createResource('brand', entityId);
          } else
            await client.query(
              'UPDATE commercial.brand SET name=$3,active=$4,version=$5 WHERE company_id=$1 AND id=$2',
              [company, entityId, fields.name, fields.active, version],
            );
          const s = fields.storage;
          await client.query(
            `INSERT INTO commercial.brand_policy(company_id,brand_id,version,tier_id,services,default_service,packing_uplift_minor,storage_fee_minor,storage_branch_id,storage_start,anniversary_day,fields) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              company,
              entityId,
              version,
              fields.tierId,
              fields.services,
              fields.defaultService,
              fields.packingUpliftMinor,
              s?.monthlyFeeMinor ?? null,
              s?.branchId ?? null,
              s?.startDate ?? null,
              s?.anniversaryDay ?? null,
              JSON.stringify(fields),
            ],
          );
        } else if (input.type === 'reference.create' || input.type === 'reference.update') {
          const f = input.fields;
          validateReference(f);
          if (f.parentId)
            await requireReference(uow, f.parentId, 'governorate', undefined, !f.active);
          if (input.type === 'reference.create')
            await client.query(
              'INSERT INTO commercial.reference(company_id,id,version,kind,name,active,parent_id,volume_range) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
              [company, entityId, version, f.kind, f.name, f.active, f.parentId, f.volumeRange],
            );
          else {
            const old = (await readReferences(client, company)).find((r) => r.id === entityId)!;
            if (old.kind !== f.kind || old.parentId !== f.parentId)
              throw new AccessError('REFERENCE_IDENTITY_IMMUTABLE', 409);
            await client.query(
              'UPDATE commercial.reference SET name=$3,active=$4,volume_range=$5,version=$6 WHERE company_id=$1 AND id=$2',
              [company, entityId, f.name, f.active, f.volumeRange, version],
            );
          }
          await client.query(
            'INSERT INTO commercial.reference_revision(company_id,entity_id,version,fields) VALUES($1,$2,$3,$4)',
            [company, entityId, version, JSON.stringify(f)],
          );
        } else if (input.type === 'tariff.create' || input.type === 'tariff.update') {
          const f = input.fields;
          minor(f.amountMinor, 'nonnegative');
          await requireReference(uow, f.tierId, 'tier', undefined, !f.active);
          await requireReference(uow, f.governorateId, 'governorate', undefined, !f.active);
          if (f.areaId) await requireReference(uow, f.areaId, 'area', f.governorateId, !f.active);
          if (input.type === 'tariff.create') {
            const exists = await client.query(
              'SELECT id FROM commercial.tariff WHERE company_id=$1 AND tier_id=$2 AND governorate_id=$3 AND area_id IS NOT DISTINCT FROM $4',
              [company, f.tierId, f.governorateId, f.areaId],
            );
            if (exists.rowCount) throw new AccessError('TARIFF_KEY_EXISTS', 409);
            await client.query(
              'INSERT INTO commercial.tariff(company_id,id,version,tier_id,governorate_id,area_id,amount_minor,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
              [
                company,
                entityId,
                version,
                f.tierId,
                f.governorateId,
                f.areaId,
                f.amountMinor,
                f.active,
              ],
            );
          } else {
            const old = (await readTariffs(client, company)).find((r) => r.id === entityId)!;
            if (
              old.tierId !== f.tierId ||
              old.governorateId !== f.governorateId ||
              old.areaId !== f.areaId
            )
              throw new AccessError('TARIFF_KEY_IMMUTABLE', 409);
            await client.query(
              'UPDATE commercial.tariff SET amount_minor=$3,active=$4,version=$5 WHERE company_id=$1 AND id=$2',
              [company, entityId, f.amountMinor, f.active, version],
            );
          }
          await client.query(
            'INSERT INTO commercial.tariff_revision(company_id,entity_id,version,amount_minor,active) VALUES($1,$2,$3,$4,$5)',
            [company, entityId, version, f.amountMinor, f.active],
          );
        }
      }
      const outcomeId = randomUUID(),
        body: CommercialResult = { commandId: input.commandId, entityId, version, snapshot };
      await client.query(
        'INSERT INTO commercial.command_outcome(company_id,id,command_record_id,body) VALUES($1,$2,$3,$4)',
        [company, outcomeId, recordId, JSON.stringify(body)],
      );
      return {
        reply: { status: 200, body },
        reference: { outcomeId, entityId, ...(snapshot ? { branchId: snapshot.branchId } : {}) },
        entityId,
        beforeVersion,
        afterVersion: version,
      };
    },
  }));
  return new CommandService(pool, definitions);
}
