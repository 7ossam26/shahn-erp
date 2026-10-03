import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateInventoryCommand,
  validateInventoryFilter,
  validateInventoryViews,
  type InventoryFilter,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { listShipmentParcels } from '../shipments/service.js';
import { shipmentFilter } from '../shipments/http.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import {
  authorizeInventoryBranches,
  defaultInventoryFilter,
  inventoryCatalog,
  inventoryCommands,
  inventoryList,
  productDetail,
  receiptDetail,
  variantHistory,
} from './service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerInventory(app: FastifyInstance, pool: Pool, origin: string) {
  const commands = inventoryCommands(pool);
  const routes = [
    ['POST', '/api/v1/brands/:brandId/products', 'result'],
    ['PATCH', '/api/v1/products/:productId', 'result'],
    ['POST', '/api/v1/inventory/receipts', 'result'],
    ['GET', '/api/v1/inventory/catalog', 'catalog'],
    ['GET', '/api/v1/inventory/products', 'products'],
    ['GET', '/api/v1/inventory/parcels', 'parcels'],
    ['GET', '/api/v1/products/:id', 'product'],
    ['GET', '/api/v1/inventory/receipts/:id', 'receipt'],
    ['GET', '/api/v1/inventory/variants/:id/history', 'history'],
    ['GET', '/api/v1/inventory/commands/:commandId', 'result'],
  ] as const;
  for (const [method, url, view] of routes)
    app.route({
      method,
      url,
      bodyLimit: 65536,
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
          const query = req.query as Record<string, string>,
            params = req.params as Record<string, string>;
          let body: unknown,
            status = 200;
          if (method !== 'GET') {
            await csrfCheck(pool, req, origin);
            if (!validateInventoryCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const input = req.body;
            if (
              (method === 'PATCH' &&
                (input.type !== 'product.update' || input.productId !== params.productId)) ||
              (url.includes('brands') &&
                (input.type !== 'product.create' || input.brandId !== params.brandId)) ||
              (url.includes('receipts') && input.type !== 'stock.receive')
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            const result = await commands.execute(sessionToken(req), input);
            body = result.body;
            status = result.status;
          } else {
            if (
              !uuid.test(query.companyId ?? '') ||
              Object.values(params).some((v) => !uuid.test(v))
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            const allowed =
              view === 'products'
                ? ['companyId', ...Object.keys(defaultInventoryFilter([]))]
                : view === 'parcels'
                  ? [
                      'companyId',
                      'branches',
                      'custody',
                      'brands',
                      'service',
                      'preparation',
                      'state',
                      'search',
                      'from',
                      'to',
                      'page',
                      'limit',
                    ]
                  : view === 'history'
                    ? ['companyId', 'branchId', 'page', 'limit']
                    : view === 'result'
                      ? ['companyId', 'family']
                      : ['companyId'];
            if (Object.keys(query).some((k) => !allowed.includes(k)))
              throw new AccessError('VALIDATION_FAILED', 400);
            if (view === 'result') {
              if (!['inventory.product', 'inventory.receipt'].includes(query.family ?? ''))
                throw new AccessError('VALIDATION_FAILED', 400);
              const result = await commands.recover(
                sessionToken(req),
                query.companyId!,
                query.family!,
                params.commandId!,
              );
              body = result.body;
              status = result.status;
            } else
              body = await UnitOfWork.run(
                pool,
                sessionToken(req),
                query.companyId,
                'inventory',
                async (uow) => {
                  if (view === 'catalog') return inventoryCatalog(uow);
                  if (view === 'receipt') return receiptDetail(uow, params.id!);
                  if (view === 'product') return productDetail(uow, params.id!);
                  if (view === 'history') {
                    const page = Number(query.page ?? 1),
                      limit = Number(query.limit ?? 25);
                    if (
                      !uuid.test(query.branchId ?? '') ||
                      !Number.isInteger(page) ||
                      page < 1 ||
                      page > 1000000 ||
                      ![25, 50, 100].includes(limit)
                    )
                      throw new AccessError('VALIDATION_FAILED', 400);
                    return variantHistory(uow, params.id!, query.branchId!, page, limit);
                  }
                  const branches =
                    query.branches?.split(',') ??
                    (uow.access.assignedBranches.length === 1
                      ? [uow.access.assignedBranches[0]!.id]
                      : []);
                  if (!branches.length || branches.some((b) => !uuid.test(b)))
                    throw new AccessError('BRANCH_REQUIRED', 400);
                  authorizeInventoryBranches(uow, branches);
                  if (view === 'parcels') {
                    const custody = query.custody ?? 'branch';
                    if (!['branch', 'external'].includes(custody))
                      throw new AccessError('VALIDATION_FAILED', 400);
                    return listShipmentParcels(
                      uow,
                      shipmentFilter(query, branches),
                      custody as 'branch' | 'external',
                    );
                  }
                  const filter = {
                    ...defaultInventoryFilter(branches),
                    search: (query.search ?? '').replace(/[٠-٩۰-۹]/g, (c) =>
                      String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632)),
                    ),
                    brands: query.brands ? query.brands.split(',') : [],
                    productId: query.productId || null,
                    variantId: query.variantId || null,
                    categories: query.categories ? query.categories.split(',') : [],
                    noAvailable: query.noAvailable === 'true',
                    movementFrom: query.movementFrom || null,
                    movementTo: query.movementTo || null,
                    page: Number(query.page ?? 1),
                    limit: Number(query.limit ?? 25),
                  };
                  if (
                    (query.noAvailable !== undefined &&
                      !['true', 'false'].includes(query.noAvailable)) ||
                    !validateInventoryFilter(filter)
                  )
                    throw new AccessError('VALIDATION_FAILED', 400);
                  return inventoryList(uow, filter as InventoryFilter);
                },
              );
          }
          if (!validateInventoryViews[status >= 400 ? 'error' : view]!(body))
            throw Error('INVALID_INVENTORY_RESPONSE');
          return reply.code(status).send(body);
        } catch (error) {
          if (error instanceof RetainedCommandError)
            return reply.code(error.reply.status).send(error.reply.body);
          const known = error instanceof AccessError;
          return reply.code(known ? error.status : 500).send({
            code: known ? error.code : 'REQUEST_FAILED',
            messageKey: known ? 'inventory.' + error.code.toLowerCase() : 'request.failed',
            commandId: validateInventoryCommand(req.body) ? req.body.commandId : null,
            correlationId: randomUUID(),
            ...(known && error.currentVersion !== undefined
              ? { currentVersion: error.currentVersion }
              : {}),
          });
        }
      },
    });
}
async function csrfCheck(pool: Pool, req: FastifyRequest, origin: string) {
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
