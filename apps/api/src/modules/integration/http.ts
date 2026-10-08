import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { AccessError } from '@shahn/domain';
import {
  validateIntegrationCommand,
  validateIntegrationView,
  validateIntegrationReply,
  validateIntegrationCommandDetail,
  validateIntegrationEventDetail,
  validateIntegrationRefresh,
  validateIntegrationError,
} from '@shahn/contracts';
import { tawselUuid } from '@shahn/contracts/tawsel';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { provisioningCommands } from './provisioning.service.js';
import {
  integrationStatus,
  integrationDetail,
  refreshIntegration,
} from './integration-query.service.js';
import { registerSignedReceiver } from './signed-receiver.controller.js';
import type { IntegrationRuntime } from './config.js';
import { registerRecovery } from './recovery.http.js';
export function registerIntegration(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  runtime: IntegrationRuntime,
) {
  registerSignedReceiver(app, pool, runtime);
  registerRecovery(app, pool, origin, runtime);
  const commands = provisioningCommands(pool, runtime);
  for (const [method, url] of [
    ['GET', '/api/v1/integration'],
    ['GET', '/api/v1/integration/commands/:id'],
    ['GET', '/api/v1/integration/events/:id'],
    ['GET', '/api/v1/integration/results/:id'],
    ['POST', '/api/v1/integration/commands'],
    ['POST', '/api/v1/integration/refresh'],
  ] as const) {
    app.route({
      method,
      url,
      bodyLimit: 32768,
      preSerialization: async (_req, reply, payload) => {
        const validate =
          reply.statusCode >= 400
            ? validateIntegrationError
            : url.endsWith('/refresh')
              ? validateIntegrationRefresh
              : url === '/api/v1/integration'
                ? validateIntegrationView
                : url.includes('/events/')
                  ? validateIntegrationEventDetail
                  : url.includes('/commands/')
                    ? validateIntegrationCommandDetail
                    : validateIntegrationReply;
        if (validate(JSON.parse(JSON.stringify(payload)))) return payload;
        reply.code(503);
        return {
          code: 'INTEGRATION_RESPONSE_INVALID',
          messageKey: 'integration.unavailable',
          correlationId: randomUUID(),
        };
      },
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
          const token = sessionToken(req),
            q = req.query as Record<string, string>,
            p = req.params as Record<string, string>;
          if (method === 'POST') {
            const session = await sessionIdentity(pool, token),
              given = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              expected = Buffer.from(session.csrf_token);
            if (
              req.headers.origin !== origin ||
              given.length !== expected.length ||
              !timingSafeEqual(given, expected)
            )
              throw new AccessError('CSRF_FAILED');
            if (Object.keys(q).length) throw new AccessError('VALIDATION_FAILED', 400);
            if (url.endsWith('/refresh')) {
              const body = req.body as Record<string, unknown>;
              if (!body || Object.keys(body).length !== 1 || !tawselUuid(body.companyId))
                throw new AccessError('VALIDATION_FAILED', 400);
              return await refreshIntegration(pool, token, body.companyId, runtime);
            }
            if (!validateIntegrationCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const result = await commands.execute(token, req.body);
            return reply.code(result.status).send(result.body);
          }
          if (!tawselUuid(q.companyId) || (p.id && !tawselUuid(p.id)))
            throw new AccessError('VALIDATION_FAILED', 400);
          const allowed =
            url === '/api/v1/integration'
              ? ['companyId', 'entity', 'state', 'from', 'to', 'page']
              : ['companyId'];
          if (Object.keys(q).some((k) => !allowed.includes(k)))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (url.includes('/results/')) {
            const result = await commands.recover(token, q.companyId, 'integration', p.id!);
            return reply.code(result.status).send(result.body);
          }
          if (p.id)
            return await UnitOfWork.run(pool, token, q.companyId, 'integration', (u) =>
              integrationDetail(u, p.id!, url.includes('/events/') ? 'events' : 'commands'),
            );
          const entity = q.entity ?? 'all',
            state = q.state ?? 'all',
            page = Number(q.page ?? 1);
          if (
            !['all', 'source', 'branch', 'role', 'user', 'driver'].includes(entity) ||
            ![
              'all',
              'pending',
              'sending',
              'accepted',
              'rejected',
              'review-required',
              'unknown',
              'retryable',
              'configuration-blocked',
              'applied',
            ].includes(state) ||
            !Number.isSafeInteger(page) ||
            page < 1 ||
            page > 100000 ||
            (q.from !== undefined &&
              q.to !== undefined &&
              Date.parse(q.from) >= Date.parse(q.to)) ||
            [q.from, q.to].some(
              (x) =>
                x !== undefined &&
                (!/^\d{4}-\d{2}-\d{2}T/.test(x) || !Number.isFinite(Date.parse(x))),
            )
          )
            throw new AccessError('VALIDATION_FAILED', 400);
          return await UnitOfWork.run(pool, token, q.companyId, 'integration', (u) =>
            integrationStatus(u, runtime, {
              entity,
              state,
              page,
              from: q.from ?? null,
              to: q.to ?? null,
            }),
          );
        } catch (error) {
          if (error instanceof RetainedCommandError)
            return reply.code(error.reply.status).send(error.reply.body);
          const e =
            error instanceof AccessError ? error : new AccessError('INTEGRATION_UNAVAILABLE', 503);
          return reply.code(e.status).send({
            code: e.code,
            messageKey: 'integration.' + e.code.toLowerCase(),
            correlationId: randomUUID(),
          });
        }
      },
    });
  }
}
