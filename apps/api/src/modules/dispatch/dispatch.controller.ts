import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { AccessError } from '@shahn/domain';
import {
  validateDispatchCommand,
  validateDispatchFilter,
  validateDispatchList,
  validateDispatchDetail,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { dispatchCommands } from './dispatch.service.js';
import type { IntegrationRuntime } from '../integration/config.js';
import { TawselClient } from '../integration/tawsel-client.js';
import { readDispatchIntent, readDispatchItems, sourceByCompany } from '@shahn/database';
import { dispatchList, dispatchDetail, defaultDispatchFilter } from './dispatch-query.service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerDispatch(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  runtime: IntegrationRuntime,
) {
  const commands = dispatchCommands(pool);
  for (const [method, url, kind] of [
    ['GET', '/api/v1/dispatch', 'list'],
    ['GET', '/api/v1/dispatch/commands/:commandId', 'recover'],
    ['GET', '/api/v1/dispatch/:id', 'detail'],
    ['POST', '/api/v1/dispatch/commands', 'command'],
  ] as const)
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
          const query = req.query as Record<string, string>,
            params = req.params as Record<string, string>;
          if (kind === 'command') {
            const session = await sessionIdentity(pool, sessionToken(req)),
              actual = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              expected = Buffer.from(session.csrf_token);
            if (
              req.headers.origin !== origin ||
              actual.length !== expected.length ||
              !timingSafeEqual(actual, expected)
            )
              throw new AccessError('CSRF_FAILED');
            if (Object.keys(query).length || !validateDispatchCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const input = req.body;
            let selected = commands;
            if (input.type === 'dispatch.review') {
              const saved = await UnitOfWork.run(
                pool,
                sessionToken(req),
                input.companyId,
                'dispatch',
                async (u) => {
                  const i = await readDispatchIntent(u.client, input.companyId, input.intentId);
                  if (!i) throw new AccessError('NOT_FOUND', 404);
                  u.assertBranch(i.branch_id);
                  return {
                    source: await sourceByCompany(u.client, input.companyId),
                    items: await readDispatchItems(u.client, input.companyId, i.id),
                  };
                },
              );
              const connection = runtime.connections.find(
                (x) =>
                  x.companyId === input.companyId &&
                  x.selector === saved.source?.selector &&
                  x.tenantId === saved.source.tenant_id &&
                  x.integrationId === saved.source.integration_id &&
                  x.baseUrl === saved.source.base_url &&
                  x.issuer === saved.source.issuer,
              );
              if (!connection) throw new AccessError('SOURCE_NOT_READY', 409);
              const remote = new TawselClient(connection),
                tasks = [];
              for (const item of saved.items) tasks.push(await remote.intakeTask(item.external_id));
              selected = dispatchCommands(pool, { review: { commandId: input.commandId, tasks } });
            }
            const result = await selected.execute(sessionToken(req), input);
            return reply.code(result.status).send(result.body);
          }
          if (!uuid.test(query.companyId ?? '') || Object.values(params).some((x) => !uuid.test(x)))
            throw new AccessError('VALIDATION_FAILED', 400);
          const allowed =
            kind === 'list'
              ? ['companyId', ...Object.keys(defaultDispatchFilter([]))]
              : ['companyId'];
          if (Object.keys(query).some((k) => !allowed.includes(k)))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (kind === 'recover') {
            const result = await commands.recover(
              sessionToken(req),
              query.companyId!,
              'dispatch',
              params.commandId!,
            );
            return reply.code(result.status).send(result.body);
          }
          const body = await UnitOfWork.run(
            pool,
            sessionToken(req),
            query.companyId,
            'dispatch',
            async (u) => {
              if (kind === 'detail') return dispatchDetail(u, params.id!);
              const f = {
                ...defaultDispatchFilter(u.access.assignedBranches.map((b) => b.id)),
                ...Object.fromEntries(
                  ['branches', 'brands', 'preparations', 'blockers', 'services', 'drivers']
                    .filter((k) => query[k])
                    .map((k) => [k, query[k]!.split(',')]),
                ),
                from: query.from || null,
                to: query.to || null,
                page: Number(query.page ?? 1),
              };
              if (!validateDispatchFilter(f)) throw new AccessError('VALIDATION_FAILED', 400);
              return dispatchList(u, f);
            },
          );
          if (!(kind === 'detail' ? validateDispatchDetail(body) : validateDispatchList(body)))
            throw Error('INVALID_DISPATCH_RESPONSE');
          return reply.send(body);
        } catch (error) {
          if (error instanceof RetainedCommandError)
            return reply.code(error.reply.status).send(error.reply.body);
          const status = error instanceof AccessError ? error.status : 500;
          return reply.code(status).send({
            code: error instanceof AccessError ? error.code : 'REQUEST_FAILED',
            correlationId: randomUUID(),
            ...(error instanceof AccessError && error.currentVersion !== undefined
              ? { currentVersion: error.currentVersion }
              : {}),
          });
        }
      },
    });
}
