import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { AccessError } from '@shahn/domain';
import {
  validateRecoveryCommand,
  validateRecoveryView,
  validateRecoveryDetail,
  validateRecoveryReply,
  validateIntegrationError,
} from '@shahn/contracts';
import {
  aggregateTypes,
  tawselUuid,
  validateDeliveryQueue,
  validateDeliveryDetail,
  validateReportRead,
} from '@shahn/contracts/tawsel';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import {
  recoveryCommands,
  recoveryList,
  recoveryDetail,
  readReportedCheckpoint,
} from './recovery.service.js';
import { deliveryQuery } from './delivery-query.service.js';
import { classifyRecoveryFailure } from './recovery-client.js';
import type { IntegrationRuntime } from './config.js';
export function registerRecovery(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  runtime: IntegrationRuntime,
) {
  const commands = recoveryCommands(pool);
  for (const [method, url] of [
    ['GET', '/api/v1/integration/recovery'],
    ['GET', '/api/v1/integration/recovery/jobs/:id'],
    ['GET', '/api/v1/integration/recovery/results/:id'],
    ['POST', '/api/v1/integration/recovery/commands'],
    ['GET', '/api/v1/integration/deliveries'],
    ['GET', '/api/v1/integration/deliveries/:id'],
    ['GET', '/api/v1/integration/applied-checkpoint'],
  ] as const)
    app.route({
      method,
      url,
      bodyLimit: 16384,
      preSerialization: async (_req, reply, payload) => {
        const v =
          reply.statusCode >= 400
            ? validateIntegrationError
            : url.endsWith('/applied-checkpoint')
              ? validateReportRead
              : url.includes('/deliveries')
                ? url.endsWith('/:id')
                  ? validateDeliveryDetail
                  : validateDeliveryQueue
                : url.includes('/jobs/')
                  ? validateRecoveryDetail
                  : url.endsWith('/recovery')
                    ? validateRecoveryView
                    : validateRecoveryReply;
        if (v(JSON.parse(JSON.stringify(payload)))) return payload;
        reply.code(503);
        return {
          code: 'RECOVERY_RESPONSE_INVALID',
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
              actual = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              expected = Buffer.from(session.csrf_token);
            if (
              req.headers.origin !== origin ||
              actual.length !== expected.length ||
              !timingSafeEqual(actual, expected)
            )
              throw new AccessError('CSRF_FAILED');
            if (Object.keys(q).length || !validateRecoveryCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const r = await commands.execute(token, req.body);
            return reply.code(r.status).send(r.body);
          }
          if (!tawselUuid(q.companyId) || (p.id && !tawselUuid(p.id)))
            throw new AccessError('VALIDATION_FAILED', 400);
          const allowed = url.endsWith('/applied-checkpoint')
            ? ['companyId', 'aggregateType', 'aggregateId']
            : url.includes('/deliveries')
              ? ['companyId', 'limit', ...(p.id ? ['beforeAttempt'] : ['cursor'])]
              : url.endsWith('/recovery')
                ? [
                    'companyId',
                    'page',
                    'aggregateType',
                    'aggregateId',
                    'state',
                    'failureClass',
                    'from',
                    'to',
                    'branchId',
                  ]
                : ['companyId'];
          if (Object.keys(q).some((k) => !allowed.includes(k)))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (url.endsWith('/applied-checkpoint')) {
            if (
              !q.aggregateType ||
              !aggregateTypes.includes(q.aggregateType as (typeof aggregateTypes)[number]) ||
              !tawselUuid(q.aggregateId)
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            return await readReportedCheckpoint(pool, token, q.companyId!, runtime, {
              type: q.aggregateType as (typeof aggregateTypes)[number],
              id: q.aggregateId!,
            });
          }
          if (url.includes('/deliveries')) {
            const limit = Number(q.limit ?? 25),
              before = q.beforeAttempt === undefined ? undefined : Number(q.beforeAttempt);
            if (
              !Number.isSafeInteger(limit) ||
              limit < 1 ||
              limit > 100 ||
              (before !== undefined && (!Number.isSafeInteger(before) || before < 0)) ||
              (q.cursor !== undefined && !tawselUuid(q.cursor))
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            return await deliveryQuery(pool, token, q.companyId!, runtime, {
              limit,
              cursor: q.cursor,
              eventId: p.id,
              beforeAttempt: before,
            });
          }
          if (url.includes('/results/')) {
            const r = await commands.recover(token, q.companyId!, 'integration-recovery', p.id!);
            return reply.code(r.status).send(r.body);
          }
          if (p.id)
            return await UnitOfWork.run(pool, token, q.companyId!, 'integration', (u) =>
              recoveryDetail(u, p.id!),
            );
          const page = Number(q.page ?? 1);
          if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            page > 100000 ||
            (q.branchId && !tawselUuid(q.branchId)) ||
            (q.aggregateType &&
              !aggregateTypes.includes(q.aggregateType as (typeof aggregateTypes)[number])) ||
            (q.aggregateId && !tawselUuid(q.aggregateId)) ||
            (q.state &&
              ![
                'pending',
                'running',
                'complete',
                'retryable',
                'expired',
                'configuration-blocked',
                'review-required',
              ].includes(q.state)) ||
            (q.failureClass &&
              ![
                'outage',
                'authentication',
                'configuration',
                'semantic-conflict',
                'history-expired',
                'reconstruction-limit',
                'invalid-response',
                'basis-changed',
              ].includes(q.failureClass)) ||
            [q.from, q.to].some(
              (x) =>
                x !== undefined &&
                (!/^\d{4}-\d{2}-\d{2}T/.test(x) || !Number.isFinite(Date.parse(x))),
            ) ||
            (q.from && q.to && Date.parse(q.from) >= Date.parse(q.to))
          )
            throw new AccessError('VALIDATION_FAILED', 400);
          return await UnitOfWork.run(pool, token, q.companyId!, 'integration', (u) =>
            recoveryList(u, {
              page,
              aggregateType: q.aggregateType,
              aggregateId: q.aggregateId,
              state: q.state,
              failureClass: q.failureClass,
              from: q.from,
              to: q.to,
              branchId: q.branchId,
            }),
          );
        } catch (error) {
          if (error instanceof RetainedCommandError)
            return reply.code(error.reply.status).send(error.reply.body);
          const e =
            error instanceof AccessError
              ? error
              : new AccessError(classifyRecoveryFailure(error).code, 503);
          return reply.code(e.status).send({
            code: e.code,
            messageKey: 'integration.' + e.code.toLowerCase(),
            correlationId: randomUUID(),
          });
        }
      },
    });
}
