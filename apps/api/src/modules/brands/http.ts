import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateCommercialCommand,
  validateCommercialViews,
  validatePricingInput,
  validateBrandFilter,
  type BrandFilter,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { catalog, configurationLock } from '../reference-data/service.js';
import { brandDetail, brandList, commercialCommands, pricing } from './service.js';
import type { StorageClock } from '../storage/clock.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
export function registerBrands(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  options: { storageClock?: StorageClock } = {},
) {
  const commands = commercialCommands(
    pool,
    options.storageClock ? { storageClock: options.storageClock } : {},
  );
  const routes = [
    ['GET', '/api/v1/brands', 'list'],
    ['GET', '/api/v1/brands/catalog', 'catalog'],
    ['GET', '/api/v1/reference-data', 'catalog'],
    ['GET', '/api/v1/brands/:id', 'detail'],
    ['POST', '/api/v1/brands/pricing-preview', 'preview'],
    ['POST', '/api/v1/brands/commands', 'result'],
    ['GET', '/api/v1/brands/commands/:commandId', 'result'],
  ] as const;
  for (const [method, url, view] of routes)
    app.route({
      method,
      url,
      bodyLimit: 32768,
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
          let body: unknown,
            status = 200;
          const query = req.query as Record<string, string>,
            params = req.params as Record<string, string>;
          if (method === 'POST') await csrfCheck(pool, req, origin);
          if (method === 'POST' && view === 'result') {
            if (!validateCommercialCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const result = await commands.execute(sessionToken(req), req.body);
            body = result.body;
            status = result.status;
          } else if (method === 'POST') {
            const value = req.body as { companyId?: string; input?: unknown };
            if (
              !value ||
              !uuid.test(value.companyId ?? '') ||
              Object.keys(value).sort().join(',') !== 'companyId,input' ||
              !validatePricingInput(value.input)
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            const input = value.input;
            body = await UnitOfWork.run(
              pool,
              sessionToken(req),
              value.companyId,
              'brands',
              async (uow) => {
                await configurationLock(uow);
                return pricing(uow, input);
              },
            );
          } else {
            if (!uuid.test(query.companyId ?? '')) throw new AccessError('VALIDATION_FAILED', 400);
            const allowed =
              view === 'list'
                ? ['companyId', 'search', 'active', 'service', 'tierId', 'partial', 'page', 'limit']
                : view === 'result'
                  ? ['companyId', 'family']
                  : ['companyId'];
            if (Object.keys(query).some((k) => !allowed.includes(k)))
              throw new AccessError('VALIDATION_FAILED', 400);
            if (view === 'result') {
              if (
                !uuid.test(params.commandId ?? '') ||
                ![
                  'commercial.brand',
                  'commercial.reference',
                  'commercial.tariff',
                  'commercial.snapshot',
                ].includes(query.family ?? '')
              )
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
                url.includes('reference-data') ? 'reference-data' : 'brands',
                async (uow) => {
                  await configurationLock(uow);
                  if (view === 'catalog') return catalog(uow);
                  if (view === 'detail') {
                    if (!uuid.test(params.id ?? ''))
                      throw new AccessError('VALIDATION_FAILED', 400);
                    return brandDetail(uow, params.id!);
                  }
                  const filter = {
                    search: (query.search ?? '').replace(/[٠-٩۰-۹]/g, (c) =>
                      String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632)),
                    ),
                    active: query.active ?? 'all',
                    service: query.service ?? 'all',
                    tierId: query.tierId || null,
                    partial: query.partial ?? 'all',
                    page: Number(query.page ?? 1),
                    limit: Number(query.limit ?? 20),
                  };
                  if (!validateBrandFilter(filter)) throw new AccessError('VALIDATION_FAILED', 400);
                  return brandList(uow, filter as BrandFilter);
                },
              );
          }
          if (!validateCommercialViews[status >= 400 ? 'error' : view]!(body))
            throw Error('INVALID_COMMERCIAL_RESPONSE');
          return reply.code(status).send(body);
        } catch (error) {
          if (error instanceof RetainedCommandError)
            return reply.code(error.reply.status).send(error.reply.body);
          const known = error instanceof AccessError;
          return reply.code(known ? error.status : 500).send({
            code: known ? error.code : 'REQUEST_FAILED',
            messageKey: known ? 'brands.' + error.code.toLowerCase() : 'request.failed',
            commandId: validateCommercialCommand(req.body) ? req.body.commandId : null,
            correlationId: randomUUID(),
            ...(known && error.currentVersion !== undefined
              ? { currentVersion: error.currentVersion }
              : {}),
          });
        }
      },
    });
}
