import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AccessError, type Capability } from '@shahn/domain';
import {
  validateFinanceCommand,
  validateFinanceFilter,
  validateFinanceViews,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import {
  financeCommands,
  financeCatalog,
  accountList,
  expenseDetail,
  movementDetail,
} from './service.js';
import { authorizedAccount } from './accounts/service.js';
import { expenseList } from './expenses/service.js';
import { movementList } from './money-movements/service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerFinance(app: FastifyInstance, pool: Pool, origin: string) {
  const commands = financeCommands(pool);
  const routes = [
    ['POST', 'commands', 'result'],
    ['GET', 'commands/:commandId', 'result'],
    ['GET', 'catalog', 'catalog'],
    ['GET', 'accounts', 'accounts'],
    ['GET', 'accounts/:id', 'account'],
    ['GET', 'accounts/:id/movements', 'movements'],
    ['GET', 'expenses', 'expenses'],
    ['GET', 'expenses/:id', 'expense'],
    ['GET', 'movements', 'movements'],
    ['GET', 'movements/:id', 'movement'],
  ] as const;
  for (const [method, path, view] of routes)
    app.route({
      method,
      url: '/api/v1/finance/' + path,
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
          const q = req.query as Record<string, string>,
            p = req.params as Record<string, string>;
          let body: unknown,
            status = 200;
          if (method === 'POST') {
            if (Object.keys(q).length || !validateFinanceCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const session = await sessionIdentity(pool, sessionToken(req)),
              given = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              expected = Buffer.from(session.csrf_token);
            if (
              req.headers.origin !== origin ||
              given.length !== expected.length ||
              !timingSafeEqual(given, expected)
            )
              throw new AccessError('CSRF_FAILED');
            const result = await commands.execute(sessionToken(req), req.body);
            body = result.body;
            status = result.status;
          } else {
            if (!uuid.test(q.companyId ?? '') || (p.id && !uuid.test(p.id)))
              throw new AccessError('VALIDATION_FAILED', 400);
            const isList = ['accounts', 'expenses', 'movements'].includes(view);
            const allowed =
              view === 'accounts'
                ? ['companyId', 'search', 'branchId', 'accountId', 'active', 'page', 'limit']
                : isList
                  ? [
                      'companyId',
                      'search',
                      'branchId',
                      'accountId',
                      'categoryId',
                      'actorId',
                      'method',
                      'direction',
                      'dateBasis',
                      'from',
                      'to',
                      'page',
                      'limit',
                    ]
                  : view === 'result'
                    ? ['companyId', 'family']
                    : view === 'catalog'
                      ? ['companyId', 'screen']
                      : ['companyId'];
            if (Object.keys(q).some((k) => !allowed.includes(k)))
              throw new AccessError('VALIDATION_FAILED', 400);
            if (view === 'result') {
              if (
                !uuid.test(p.commandId ?? '') ||
                !['finance.accounts', 'finance.expenses', 'finance.movements'].includes(
                  q.family ?? '',
                )
              )
                throw new AccessError('VALIDATION_FAILED', 400);
              const result = await commands.recover(
                sessionToken(req),
                q.companyId!,
                q.family!,
                p.commandId!,
              );
              body = result.body;
              status = result.status;
            } else {
              const cap: Capability =
                path === 'accounts/:id/movements'
                  ? 'finance.accounts'
                  : view === 'catalog'
                    ? (q.screen as Capability)
                    : view.startsWith('account')
                      ? 'finance.accounts'
                      : view.startsWith('expense')
                        ? 'expenses'
                        : 'finance.movements';
              if (!['finance.accounts', 'finance.movements', 'expenses'].includes(cap))
                throw new AccessError('VALIDATION_FAILED', 400);
              body = await UnitOfWork.run(pool, sessionToken(req), q.companyId, cap, async (u) => {
                if (view === 'catalog') return financeCatalog(u);
                if (view === 'account') return authorizedAccount(u, p.id!);
                if (view === 'expense') return expenseDetail(u, p.id!);
                if (view === 'movement') return movementDetail(u, p.id!);
                const f = {
                  search: (q.search ?? '').replace(/[٠-٩۰-۹]/g, (c) =>
                    String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632)),
                  ),
                  branchId: q.branchId || null,
                  accountId: q.accountId || null,
                  categoryId: q.categoryId || null,
                  actorId: q.actorId || null,
                  method: q.method ?? 'all',
                  direction: q.direction ?? 'all',
                  dateBasis: q.dateBasis ?? 'actual',
                  from: q.from || null,
                  to: q.to || null,
                  page: Number(q.page ?? 1),
                  limit: Number(q.limit ?? 25),
                };
                if (path === 'accounts/:id/movements') f.accountId = p.id!;
                if (!validateFinanceFilter(f)) throw new AccessError('VALIDATION_FAILED', 400);
                if (view === 'accounts') {
                  if (!['all', 'true', 'false'].includes(q.active ?? 'all'))
                    throw new AccessError('VALIDATION_FAILED', 400);
                  return accountList(u, {
                    ...f,
                    active: (q.active ?? 'all') as 'all' | 'true' | 'false',
                  });
                }
                return view === 'expenses' ? expenseList(u, f) : movementList(u, f);
              });
            }
          }
          if (status < 400 && !validateFinanceViews[view]!(body))
            throw Error('INVALID_FINANCE_RESPONSE');
          return reply.code(status).send(body);
        } catch (e) {
          if (e instanceof RetainedCommandError)
            return reply.code(e.reply.status).send(e.reply.body);
          const known = e instanceof AccessError;
          return reply.code(known ? e.status : 500).send({
            code: known ? e.code : 'REQUEST_FAILED',
            messageKey: known ? 'finance.' + e.code.toLowerCase() : 'request.failed',
            commandId: validateFinanceCommand(req.body) ? req.body.commandId : null,
            correlationId: randomUUID(),
            ...(known && e.currentVersion !== undefined
              ? { currentVersion: e.currentVersion }
              : {}),
          });
        }
      },
    });
}
