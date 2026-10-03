import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  AccessError,
  ShipmentFieldError,
  validateShipmentInput,
  shipmentGoods,
  shipmentPrice,
  correctedPrice,
  preparationFor,
  assertLocalTransition,
  cairoDayRange,
  normalizeShipmentDigits,
} from '@shahn/domain';
import {
  readBrand,
  readReferences,
  readTariffs,
  readShipment,
  duplicateShipmentReference,
  createShipmentAggregate,
  appendShipmentRevision,
  receiveShipmentParcel,
  readParcels,
} from '@shahn/database';
import {
  validateShipmentCommand,
  type ShipmentCommand,
  type ShipmentFields,
  type ShipmentPrice,
  type ShipmentDetail,
  type ShipmentResult,
  type ShipmentPreview,
  type ShipmentFilter,
  type ShipmentCatalog,
} from '@shahn/contracts';
import { CommandService, type CommandDefinition } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { configurationLock, requireReference } from '../reference-data/service.js';
import { pricing } from '../brands/service.js';
export const defaultShipmentFilter = (branches: string[]): ShipmentFilter => ({
  branches,
  brands: [],
  service: 'all',
  preparation: 'all',
  state: 'all',
  search: '',
  from: null,
  to: null,
  page: 1,
  limit: 25,
});
export async function shipmentCatalog(uow: UnitOfWork): Promise<ShipmentCatalog> {
  await configurationLock(uow);
  const ids = (
    await uow.client.query<{ id: string }>(
      'SELECT id FROM commercial.brand WHERE company_id=$1 AND active ORDER BY name,id',
      [uow.access.companyId],
    )
  ).rows;
  const brands = [];
  for (const row of ids) {
    const brand = await readBrand(uow.client, uow.access.companyId, row.id);
    if (brand) brands.push(brand);
  }
  return {
    companyId: uow.access.companyId,
    brands,
    references: await readReferences(uow.client, uow.access.companyId),
    tariffs: await readTariffs(uow.client, uow.access.companyId),
    branches: uow.access.assignedBranches,
  };
}
async function validateSetup(uow: UnitOfWork, fields: ShipmentFields) {
  const phone = validateShipmentInput(fields);
  uow.assertBranch(fields.branchId);
  const active = (
    await uow.client.query(
      'SELECT id FROM access.branch WHERE company_id=$1 AND id=$2 AND active',
      [uow.access.companyId, fields.branchId],
    )
  ).rowCount;
  if (!active) throw new AccessError('FORBIDDEN_SCOPE');
  const brand = await readBrand(uow.client, uow.access.companyId, fields.brandId);
  if (!brand?.active || !brand.services.includes(fields.service))
    throw new ShipmentFieldError('SERVICE_UNAVAILABLE', 'service', 409);
  await requireReference(uow, fields.governorateId, 'governorate');
  if (fields.areaId) await requireReference(uow, fields.areaId, 'area', fields.governorateId);
  return { phone, brand };
}
export async function shipmentDetail(uow: UnitOfWork, key: string, byReference = false) {
  const detail = await readShipment(uow.client, uow.access.companyId, key, byReference);
  if (!detail) throw new AccessError('NOT_FOUND', 404);
  uow.assertBranch(detail.fields.branchId);
  return detail;
}
/** Native immutable input for P11's canonical adapter; this is neither an accepted source nor a wire command. */
export async function sourceReadyShipment(uow: UnitOfWork, id: string, revision: number) {
  const detail = await shipmentDetail(uow, id),
    selected = detail.revisions.find((r) => r.revision === revision);
  if (!selected) throw new AccessError('NOT_FOUND', 404);
  const value = structuredClone({
    shipmentId: id,
    reference: detail.reference,
    revision,
    fields: selected.fields,
    phoneCanonical: selected.phoneCanonical,
    price: selected.price,
  });
  const freeze = (object: object): void => {
    for (const child of Object.values(object))
      if (child && typeof child === 'object') freeze(child);
    Object.freeze(object);
  };
  freeze(value);
  return value;
}
async function lockShipment(uow: UnitOfWork, id: string) {
  uow.lockOrder('aggregate', 'shipment:' + id);
  await uow.client.query(
    'SELECT id FROM shipments.shipment WHERE company_id=$1 AND id=$2 FOR UPDATE',
    [uow.access.companyId, id],
  );
  return shipmentDetail(uow, id);
}
export async function correctionPreview(
  uow: UnitOfWork,
  detail: ShipmentDetail,
  fields: ShipmentFields,
  expectedVersion: number,
  actualAtCorrectedBranch: boolean,
): Promise<ShipmentPreview> {
  assertLocalTransition(detail, expectedVersion, detail.version);
  await validateSetup(uow, fields);
  if (fields.brandId !== detail.fields.brandId)
    throw new ShipmentFieldError('BRAND_IDENTITY_IMMUTABLE', 'brandId', 409);
  const branchChanged = fields.branchId !== detail.fields.branchId;
  if (branchChanged && !actualAtCorrectedBranch)
    throw new ShipmentFieldError('ACTUAL_BRANCH_ASSERTION_REQUIRED', 'branchId', 409);
  const contentsChanged =
    JSON.stringify(fields.lines) !== JSON.stringify(detail.fields.lines) ||
    fields.service !== detail.fields.service;
  return {
    expectedVersion: detail.version,
    before: detail.price,
    after: correctedPrice(detail.price, fields),
    beforeBranchId: detail.fields.branchId,
    afterBranchId: fields.branchId,
    beforePreparation: detail.preparation,
    afterPreparation: contentsChanged ? preparationFor(fields.service) : detail.preparation,
    custodyEffect: branchChanged ? 'recorded_branch_correction' : 'unchanged',
    duplicateReference: await duplicateShipmentReference(
      uow.client,
      uow.access.companyId,
      fields.brandId,
      fields.brandReference,
      detail.id,
    ),
  };
}
export async function listShipmentParcels(
  uow: UnitOfWork,
  filter: ShipmentFilter,
  custody: 'branch' | 'external' = 'branch',
  preparationOnly = false,
) {
  filter.branches.forEach((id) => uow.assertBranch(id));
  if (filter.from && filter.to && filter.from > filter.to)
    throw new ShipmentFieldError('INVALID_DATE_RANGE', 'from');
  return readParcels(
    uow.client,
    uow.access.companyId,
    { ...filter, search: normalizeShipmentDigits(filter.search) },
    filter.from ? cairoDayRange(filter.from).start : null,
    filter.to ? cairoDayRange(filter.to).end : null,
    custody,
    preparationOnly,
  );
}
async function appendEvent(
  uow: UnitOfWork,
  id: string,
  version: number,
  kind: string,
  reason = '',
) {
  await uow.client.query(
    'INSERT INTO shipments.event(company_id,shipment_id,version,kind,actor_id,actor_name,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [
      uow.access.companyId,
      id,
      version,
      kind,
      uow.access.principalId,
      uow.access.displayName,
      reason,
    ],
  );
}
/** Shared confirmation assembler: P07 supplies its stock-allocation effect in this same UnitOfWork instead of the external receipt effect. */
export async function confirmShipment(
  uow: UnitOfWork,
  recordId: string,
  fields: ShipmentFields,
  price: ShipmentPrice,
  physicalEffect: (id: string) => Promise<void>,
) {
  const id = randomUUID(),
    reference = await createShipmentAggregate(
      uow.client,
      uow.access.companyId,
      id,
      recordId,
      fields,
      validateShipmentInput(fields),
      price,
      preparationFor(fields.service),
    );
  await physicalEffect(id);
  await appendEvent(uow, id, 1, 'received');
  return { id, reference };
}
export function shipmentCommands(pool: Pool, hooks: { afterReceipt?: () => Promise<void> } = {}) {
  const kinds: ShipmentCommand['type'][] = [
    'shipment.confirm',
    'shipment.correct',
    'shipment.cancel',
    'shipment.prepare',
  ];
  const definitions: CommandDefinition<ShipmentCommand>[] = kinds.map((kind) => ({
    family: 'shipment',
    kind,
    capability: 'intake',
    authorize: async (uow, value, recovery) => {
      if (
        'fields' in value &&
        value.fields &&
        typeof value.fields === 'object' &&
        'branchId' in value.fields
      )
        uow.assertBranch(String(value.fields.branchId));
      if ('branchId' in value && typeof value.branchId === 'string')
        uow.assertBranch(value.branchId);
      if ('shipmentId' in value && typeof value.shipmentId === 'string')
        await shipmentDetail(uow, value.shipmentId);
      if (recovery && !('branchId' in value)) throw new AccessError('FORBIDDEN_SCOPE');
    },
    rejectionReference: async (input, uow) => ({
      entityId: 'shipmentId' in input ? input.shipmentId : input.commandId,
      branchId:
        'fields' in input
          ? input.fields.branchId
          : (await shipmentDetail(uow, input.shipmentId)).fields.branchId,
    }),
    resolve: async (uow, ref) => {
      const row = (
        await uow.client.query(
          'SELECT body FROM shipments.command_outcome WHERE company_id=$1 AND id=$2',
          [uow.access.companyId, ref.outcomeId],
        )
      ).rows[0];
      if (!row) throw new AccessError('RESULT_REFERENCE_UNAVAILABLE', 409);
      return row.body;
    },
    execute: async (uow, input, recordId) => {
      if (!validateShipmentCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
      await configurationLock(uow);
      let id: string,
        reference: string,
        version = 1,
        beforeVersion: number | null = null,
        branchId: string;
      if (input.type === 'shipment.confirm') {
        const { brand } = await validateSetup(uow, input.fields);
        // Materialized brand row protects absent duplicate-reference checks from concurrent creation.
        await uow.client.query(
          'SELECT id FROM commercial.brand WHERE company_id=$1 AND id=$2 FOR UPDATE',
          [uow.access.companyId, brand.id],
        );
        if (
          !input.duplicateAcknowledged &&
          (await duplicateShipmentReference(
            uow.client,
            uow.access.companyId,
            brand.id,
            input.fields.brandReference,
          ))
        )
          throw new ShipmentFieldError('DUPLICATE_BRAND_REFERENCE', 'brandReference', 409);
        const captured = await pricing(uow, {
          ...input.fields,
          goodsDueMinor: shipmentGoods(input.fields.lines),
          recipientShippingMinor: '0',
        });
        if (
          captured.policyVersion !== input.expectedPolicyVersion ||
          captured.tariffVersion !== input.expectedTariffVersion ||
          captured.tariffId !== input.expectedTariffId
        )
          throw new AccessError('PRICING_REVISION_CONFLICT', 409);
        const price = shipmentPrice(captured, brand.packingUpliftMinor, input.fields);
        const confirmed = await confirmShipment(
          uow,
          recordId,
          input.fields,
          price,
          async (shipmentId) => {
            await receiveShipmentParcel(
              uow.client,
              uow.access.companyId,
              shipmentId,
              recordId,
              input.fields,
              uow.access.principalId,
              uow.access.displayName,
            );
            await hooks.afterReceipt?.();
          },
        );
        id = confirmed.id;
        reference = confirmed.reference;
        branchId = input.fields.branchId;
      } else {
        const detail = await lockShipment(uow, input.shipmentId);
        assertLocalTransition(detail, input.expectedVersion, detail.version);
        id = detail.id;
        reference = detail.reference;
        branchId = detail.fields.branchId;
        beforeVersion = detail.version;
        version = detail.version + 1;
        if (input.type === 'shipment.correct') {
          await uow.client.query(
            'SELECT id FROM commercial.brand WHERE company_id=$1 AND id=$2 FOR UPDATE',
            [uow.access.companyId, detail.fields.brandId],
          );
          const preview = await correctionPreview(
            uow,
            detail,
            input.fields,
            input.expectedVersion,
            input.actualAtCorrectedBranch,
          );
          if (preview.duplicateReference && !input.duplicateAcknowledged)
            throw new ShipmentFieldError('DUPLICATE_BRAND_REFERENCE', 'brandReference', 409);
          branchId = input.fields.branchId;
          await appendShipmentRevision(
            uow.client,
            uow.access.companyId,
            id,
            detail.revision + 1,
            input.fields,
            validateShipmentInput(input.fields),
            preview.after,
          );
          await uow.client.query(
            'UPDATE shipments.shipment SET branch_id=$3,revision=revision+1,version=$4,preparation=$5 WHERE company_id=$1 AND id=$2',
            [uow.access.companyId, id, branchId, version, preview.afterPreparation],
          );
          await appendEvent(uow, id, version, 'corrected', input.reason);
          if (preview.custodyEffect !== 'unchanged') {
            await uow.client.query(
              'UPDATE shipments.parcel_custody SET branch_id=$3,version=version+1 WHERE company_id=$1 AND shipment_id=$2',
              [uow.access.companyId, id, branchId],
            );
            await uow.client.query(
              'INSERT INTO shipments.custody_correction(company_id,shipment_id,version,from_branch_id,to_branch_id,actual_at_corrected_branch) VALUES($1,$2,$3,$4,$5,true)',
              [uow.access.companyId, id, version, detail.fields.branchId, branchId],
            );
          }
        } else if (input.type === 'shipment.cancel') {
          await uow.client.query(
            "UPDATE shipments.shipment SET state='cancelled',version=$3 WHERE company_id=$1 AND id=$2",
            [uow.access.companyId, id, version],
          );
          await appendEvent(uow, id, version, 'cancelled', input.reason);
        } else {
          if (detail.preparation !== 'awaiting_preparation')
            throw new AccessError('PREPARATION_NOT_WAITING', 409, detail.version);
          await uow.client.query(
            "UPDATE shipments.shipment SET preparation='complete',version=$3 WHERE company_id=$1 AND id=$2",
            [uow.access.companyId, id, version],
          );
          await appendEvent(uow, id, version, 'prepared');
        }
      }
      const body: ShipmentResult = {
          commandId: input.commandId,
          shipmentId: id,
          reference,
          version,
          branchId,
        },
        outcomeId = randomUUID();
      await uow.client.query(
        'INSERT INTO shipments.command_outcome(company_id,id,command_record_id,body) VALUES($1,$2,$3,$4)',
        [uow.access.companyId, outcomeId, recordId, JSON.stringify(body)],
      );
      return {
        reply: { status: 200, body },
        reference: { outcomeId, shipmentId: id, branchId },
        entityId: id,
        beforeVersion,
        afterVersion: version,
      };
    },
  }));
  return new CommandService(pool, definitions);
}
