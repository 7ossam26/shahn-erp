import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { sourceByCompany } from '@shahn/database';
import {
  validateReturnNativeCommand,
  validateReturnFilter,
  validateReturnDesk,
  validateReturnRefresh,
  type ReturnFilter,
} from '@shahn/contracts';
import type { ReturnRequest } from '@shahn/contracts/tawsel';
import { AccessError } from '@shahn/domain';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import type { IntegrationRuntime } from '../integration/config.js';
import { TawselClient, SourceFailure } from '../integration/tawsel-client.js';
import { readyBinding } from '../dispatch/dispatch.service.js';
import { returnCommands } from './returns.service.js';
import { returnDesk } from './query.service.js';
import { mergeReturnRequest } from './receipt.service.js';
import { ExecutionDependency } from '../execution/visit-facts.service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerReturns(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  runtime: IntegrationRuntime,
) {
  const commands = returnCommands(pool);
  for (const [method, url, kind] of [
    ['GET', '/api/v1/returns', 'list'],
    ['GET', '/api/v1/returns/requests/:id', 'detail'],
    ['GET', '/api/v1/returns/commands/:commandId', 'recover'],
    ['POST', '/api/v1/returns/commands', 'command'],
    ['POST', '/api/v1/returns/refresh', 'refresh'],
  ] as const)
    app.route({
      method,
      url,
      bodyLimit: 2097152,
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          if (
            req.headers.authorization ||
            req.headers['x-company-id'] ||
            req.headers['x-user-id'] ||
            req.headers['x-company']
          )
            throw new AccessError('FORBIDDEN_SCOPE');
          const token = sessionToken(req),
            q = req.query as Record<string, string>,
            params = req.params as Record<string, string>;
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
            if (Object.keys(q).length) throw new AccessError('VALIDATION_FAILED', 400);
          }
          if (kind === 'command') {
            if (!validateReturnNativeCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const result = await commands.execute(token, req.body);
            return reply.code(result.status).send(result.body);
          }
          if (kind === 'refresh') {
            if (!validateReturnRefresh(req.body)) throw new AccessError('VALIDATION_FAILED', 400);
            const b = req.body;
            const saved = await UnitOfWork.run(pool, token, b.companyId, 'returns', async (u) => {
              u.assertBranch(b.branchId!);
              const s = await sourceByCompany(u.client, u.access.companyId);
              if (!s) throw new AccessError('SOURCE_NOT_READY', 409);
              const branch = await readyBinding(
                  u.client,
                  u.access.companyId,
                  s.id,
                  'branch',
                  b.branchId!,
                ),
                driver = await readyBinding(
                  u.client,
                  u.access.companyId,
                  s.id,
                  'driver',
                  b.driverId!,
                );
              const known = (
                await u.client.query<{ id: string }>(
                  `SELECT id FROM returns.request WHERE company_id=$1 AND source_id=$2 AND branch_id=$3 AND driver_id=$4`,
                  [u.access.companyId, s.id, b.branchId, b.driverId],
                )
              ).rows;
              return { s, branch, driver, known };
            });
            const connection = runtime.connections.find(
              (x) =>
                x.companyId === b.companyId &&
                x.selector === saved.s.selector &&
                x.tenantId === saved.s.tenant_id &&
                x.integrationId === saved.s.integration_id &&
                x.baseUrl === saved.s.base_url &&
                x.issuer === saved.s.issuer,
            );
            if (!connection) throw new AccessError('SOURCE_NOT_READY', 409);
            const client = new TawselClient(connection),
              pending = await client.pendingReturns(
                saved.driver.resource_id!,
                saved.branch.resource_id!,
              );
            const ids = [
                ...new Set([...pending.map((r) => r.requestId), ...saved.known.map((r) => r.id)]),
              ],
              current: ReturnRequest[] = [];
            for (const id of ids) current.push(await client.returnRequest(id));
            // No public network request runs inside the local transaction; reauthorize after all pages.
            await UnitOfWork.run(pool, token, b.companyId, 'returns', async (u) => {
              u.assertBranch(b.branchId!);
              const s = await sourceByCompany(u.client, u.access.companyId, true);
              if (s?.id !== saved.s.id) throw new AccessError('SOURCE_CHANGED', 409);
              for (const r of current) {
                if (
                  r.sourceBranchId !== saved.branch.resource_id ||
                  r.driverId !== saved.driver.resource_id
                )
                  throw new AccessError('RETURN_SCOPE_CONFLICT', 409);
                await mergeReturnRequest(u.client, s, r);
              }
            });
            return reply.send({ checked: true, requests: current.length });
          }
          if (!uuid.test(q.companyId ?? '') || Object.values(params).some((x) => !uuid.test(x)))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (kind === 'recover') {
            const r = await commands.recover(token, q.companyId!, 'returns', params.commandId!);
            return reply.code(r.status).send(r.body);
          }
          const allowed = [
            'companyId',
            ...(kind === 'list'
              ? [
                  'branchId',
                  'driverId',
                  'brands',
                  'search',
                  'state',
                  'condition',
                  'dateBasis',
                  'from',
                  'to',
                  'page',
                ]
              : []),
          ];
          if (Object.keys(q).some((k) => !allowed.includes(k)))
            throw new AccessError('VALIDATION_FAILED', 400);
          let filter: ReturnFilter | null = null;
          if (kind === 'list' && (q.branchId || q.driverId)) {
            const f = {
              branchId: q.branchId,
              driverId: q.driverId,
              brands: q.brands ? q.brands.split(',') : [],
              search: q.search ?? '',
              state: q.state ?? 'all',
              condition: q.condition ?? 'all',
              dateBasis: q.dateBasis ?? 'request',
              from: q.from || null,
              to: q.to || null,
              page: Number(q.page ?? 1),
            };
            if (!validateReturnFilter(f)) throw new AccessError('VALIDATION_FAILED', 400);
            filter = f;
          }
          const body = await UnitOfWork.run(pool, token, q.companyId, 'returns', (u) =>
            returnDesk(u, filter, params.id),
          );
          if (!validateReturnDesk(body)) throw Error('INVALID_RETURN_RESPONSE');
          return reply.send(body);
        } catch (e) {
          if (e instanceof RetainedCommandError)
            return reply.code(e.reply.status).send(e.reply.body);
          return reply
            .code(
              e instanceof AccessError
                ? e.status
                : e instanceof SourceFailure
                  ? 503
                  : e instanceof ExecutionDependency
                    ? 409
                    : 500,
            )
            .send({
              code:
                e instanceof AccessError
                  ? e.code
                  : e instanceof SourceFailure
                    ? e.code
                    : e instanceof ExecutionDependency
                      ? e.message
                      : 'REQUEST_FAILED',
              correlationId: randomUUID(),
            });
        }
      },
    });
}
