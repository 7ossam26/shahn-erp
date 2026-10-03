import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { transaction } from '@shahn/database';
import {
  AccessError,
  ShipmentFieldError,
  normalizeShipmentDigits,
  assertCapability,
} from '@shahn/domain';
import {
  validateShipmentCommand,
  validateShipmentPreviewRequest,
  validateShipmentFilter,
  validateShipmentViews,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity, loadAccess } from '../access/sessions.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import {
  shipmentCommands,
  shipmentCatalog,
  shipmentDetail,
  correctionPreview,
  defaultShipmentFilter,
  listShipmentParcels,
} from './service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const errorFields: Record<string, string> = {
  PRICE_MISSING: 'governorateId',
  INVALID_GEOGRAPHY_OR_TIER: 'areaId',
  SERVICE_UNAVAILABLE: 'service',
  DUPLICATE_BRAND_REFERENCE: 'brandReference',
  ACTUAL_BRANCH_ASSERTION_REQUIRED: 'branchId',
  FORBIDDEN_SCOPE: 'branchId',
  SOURCE_MONEY_OVERFLOW: 'lines',
};
async function csrf(pool: Pool, req: FastifyRequest, origin: string) {
  const session = await sessionIdentity(pool, sessionToken(req)),
    given = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
    expected = Buffer.from(session.csrf_token);
  if (
    req.headers.origin !== origin ||
    given.length !== expected.length ||
    !timingSafeEqual(given, expected)
  )
    throw new AccessError('CSRF_FAILED');
}
export function shipmentFilter(query: Record<string, string>, branches: string[]) {
  const filter = {
    ...defaultShipmentFilter(branches),
    branches: query.branches ? query.branches.split(',') : branches,
    brands: query.brands ? query.brands.split(',') : [],
    service: query.service ?? 'all',
    preparation: query.preparation ?? 'all',
    state: query.state ?? 'all',
    search: query.search ?? '',
    from: query.from || null,
    to: query.to || null,
    page: Number(query.page ?? 1),
    limit: Number(query.limit ?? 25),
  };
  if (!validateShipmentFilter(filter)) throw new AccessError('VALIDATION_FAILED', 400);
  return filter;
}
export function registerShipments(app: FastifyInstance, pool: Pool, origin: string) {
  const commands = shipmentCommands(pool);
  const routes = [
    ['POST', '/api/v1/shipments', 'shipment.confirm'],
    ['GET', '/api/v1/shipments/catalog', 'catalog'],
    ['POST', '/api/v1/shipments/:id/corrections/preview', 'preview'],
    ['POST', '/api/v1/shipments/:id/corrections', 'shipment.correct'],
    ['POST', '/api/v1/shipments/:id/cancel', 'shipment.cancel'],
    ['POST', '/api/v1/shipments/:id/preparation/complete', 'shipment.prepare'],
    ['GET', '/api/v1/preparation', 'list'],
    ['GET', '/api/v1/shipments/commands/:commandId', 'recover'],
    ['GET', '/api/v1/shipments/:reference', 'detail'],
  ] as const;
  for (const [method, url, operation] of routes)
    app.route({
      method,
      url,
      bodyLimit: 131072,
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          if (
            req.headers.authorization ||
            req.headers['x-company-id'] ||
            req.headers['x-company'] ||
            req.headers['x-user-id']
          )
            throw new AccessError('FORBIDDEN_SCOPE');
          const params = req.params as Record<string, string>,
            query = req.query as Record<string, string>;
          let body: unknown;
          if (method === 'POST') {
            await csrf(pool, req, origin);
            if (Object.keys(query).length || (params.id && !uuid.test(params.id)))
              throw new AccessError('VALIDATION_FAILED', 400);
            if (operation === 'preview') {
              if (!validateShipmentPreviewRequest(req.body) || req.body.shipmentId !== params.id)
                throw new AccessError('VALIDATION_FAILED', 400);
              const input = req.body;
              body = await UnitOfWork.run(
                pool,
                sessionToken(req),
                input.companyId,
                'intake',
                async (uow) => {
                  const { configurationLock } = await import('../reference-data/service.js');
                  await configurationLock(uow);
                  return correctionPreview(
                    uow,
                    await shipmentDetail(uow, input.shipmentId),
                    input.fields,
                    input.expectedVersion,
                    input.actualAtCorrectedBranch,
                  );
                },
              );
            } else {
              if (
                !validateShipmentCommand(req.body) ||
                req.body.type !== operation ||
                ('shipmentId' in req.body && req.body.shipmentId !== params.id)
              )
                throw new AccessError('VALIDATION_FAILED', 400);
              body = (await commands.execute(sessionToken(req), req.body)).body;
            }
          } else {
            if (!uuid.test(query.companyId ?? '')) throw new AccessError('VALIDATION_FAILED', 400);
            const allowed =
              operation === 'list'
                ? ['companyId', ...Object.keys(defaultShipmentFilter([]))]
                : ['companyId'];
            if (Object.keys(query).some((k) => !allowed.includes(k)))
              throw new AccessError('VALIDATION_FAILED', 400);
            if (operation === 'recover') {
              if (!uuid.test(params.commandId ?? ''))
                throw new AccessError('VALIDATION_FAILED', 400);
              const result = await commands.recover(
                sessionToken(req),
                query.companyId!,
                'shipment',
                params.commandId!,
              );
              if (result.status >= 400) throw new RetainedCommandError(result);
              body = result.body;
            } else if (operation === 'detail') {
              const reference = normalizeShipmentDigits(params.reference ?? '');
              if (!/^[0-9]{1,20}$/.test(reference)) throw new AccessError('INVALID_REFERENCE', 400);
              body = await transaction(pool, async (client) => {
                const access = await loadAccess(client, sessionToken(req), query.companyId);
                assertCapability(access, access.grants.includes('intake') ? 'intake' : 'inventory');
                return shipmentDetail(new UnitOfWork(client, access), reference, true);
              });
            } else
              body = await UnitOfWork.run(
                pool,
                sessionToken(req),
                query.companyId,
                'intake',
                async (uow) => {
                  if (operation === 'catalog') return shipmentCatalog(uow);
                  const filter = shipmentFilter(
                    query,
                    uow.access.assignedBranches.map((b) => b.id),
                  );
                  return listShipmentParcels(uow, filter, 'branch', true);
                },
              );
          }
          const view =
            operation.startsWith('shipment.') || operation === 'recover' ? 'result' : operation;
          if (!validateShipmentViews[view]?.(body)) throw Error('INVALID_SHIPMENT_RESPONSE');
          return reply.send(body);
        } catch (error) {
          const retained =
            error instanceof RetainedCommandError
              ? (error.reply.body as {
                  code: string;
                  currentVersion?: number;
                  commandId: string;
                  correlationId: string;
                  messageKey: string;
                })
              : null;
          const known = error instanceof AccessError,
            code = retained?.code ?? (known ? error.code : 'REQUEST_FAILED'),
            field = error instanceof ShipmentFieldError ? error.field : errorFields[code];
          const schemaErrors =
            code === 'VALIDATION_FAILED'
              ? Object.fromEntries(
                  (validateShipmentCommand.errors ?? [])
                    .filter((e) => e.instancePath.startsWith('/fields/'))
                    .map((e) => [
                      e.instancePath.replace('/fields/', '').replaceAll('/', '.'),
                      'VALIDATION_FAILED',
                    ]),
                )
              : {};
          return reply.code(known ? error.status : 500).send({
            code,
            messageKey: retained?.messageKey ?? 'shipments.' + code.toLowerCase(),
            commandId:
              retained?.commandId ??
              (validateShipmentCommand(req.body) ? req.body.commandId : null),
            correlationId: retained?.correlationId ?? randomUUID(),
            fieldErrors: field ? { [field]: code } : schemaErrors,
            ...((retained?.currentVersion ?? (known ? error.currentVersion : undefined)) ===
            undefined
              ? {}
              : {
                  currentVersion:
                    retained?.currentVersion ?? (known ? error.currentVersion : undefined),
                }),
          });
        }
      },
    });
}
