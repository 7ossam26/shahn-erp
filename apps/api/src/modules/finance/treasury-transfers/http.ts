import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateTreasuryCommand,
  validateTreasuryFilter,
  validateTreasuryViews,
  type TreasuryFilter,
  type TreasuryScreen,
} from '@shahn/contracts';
import { sessionToken } from '../../access/http.js';
import { sessionIdentity } from '../../access/sessions.js';
import { UnitOfWork } from '../../kernel/unit-of-work.js';
import { RetainedCommandError } from '../../kernel/commands.js';
import { treasuryCommands, treasuryCatalog, transferList, transferDetail } from './service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerTreasury(app: FastifyInstance, pool: Pool, origin: string) {
  const commands = treasuryCommands(pool);
  for (const [method, path, view] of [
    ['POST', 'commands', 'result'],
    ['GET', 'commands/:commandId', 'result'],
    ['GET', 'catalog', 'catalog'],
    ['GET', 'transfers', 'list'],
    ['GET', 'transfers/:id', 'detail'],
    ['GET', 'receipts', 'list'],
    ['GET', 'receipts/:id', 'detail'],
  ] as const)
    app.route({
      method,
      url: '/api/v1/treasury/' + path,
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
            if (Object.keys(q).length || !validateTreasuryCommand(req.body))
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
            const allowed =
              view === 'list'
                ? [
                    'companyId',
                    'search',
                    'sourceBranchId',
                    'destinationBranchId',
                    'state',
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
                !['treasury.send', 'treasury.receive'].includes(q.family ?? '')
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
              const screen: TreasuryScreen =
                view === 'catalog'
                  ? (q.screen as TreasuryScreen)
                  : path.startsWith('receipts')
                    ? 'receive'
                    : 'send';
              if (!['send', 'receive'].includes(screen))
                throw new AccessError('VALIDATION_FAILED', 400);
              body = await UnitOfWork.run(
                pool,
                sessionToken(req),
                q.companyId,
                screen === 'send' ? 'treasury.send' : 'treasury.receive',
                async (u) => {
                  if (view === 'catalog') return treasuryCatalog(u, screen);
                  if (view === 'detail') return transferDetail(u, p.id!, screen);
                  const f: TreasuryFilter = {
                    search: (q.search ?? '').replace(/[٠-٩۰-۹]/g, (c) =>
                      String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632)),
                    ),
                    sourceBranchId: q.sourceBranchId || null,
                    destinationBranchId: q.destinationBranchId || null,
                    state: (q.state ??
                      (screen === 'receive' ? 'sent' : 'all')) as TreasuryFilter['state'],
                    dateBasis: (q.dateBasis ?? 'sent') as TreasuryFilter['dateBasis'],
                    from: q.from || null,
                    to: q.to || null,
                    page: Number(q.page ?? 1),
                    limit: Number(q.limit ?? 25),
                  };
                  if (!validateTreasuryFilter(f)) throw new AccessError('VALIDATION_FAILED', 400);
                  return transferList(u, f, screen);
                },
              );
            }
          }
          if (status < 400 && !validateTreasuryViews[view]!(body))
            throw Error('INVALID_TREASURY_RESPONSE');
          return reply.code(status).send(body);
        } catch (e) {
          if (e instanceof RetainedCommandError)
            return reply.code(e.reply.status).send(e.reply.body);
          const known = e instanceof AccessError;
          return reply.code(known ? e.status : 500).send({
            code: known ? e.code : 'REQUEST_FAILED',
            messageKey: known ? 'treasury.' + e.code.toLowerCase() : 'request.failed',
            commandId: validateTreasuryCommand(req.body) ? req.body.commandId : null,
            correlationId: randomUUID(),
            ...(known && e.currentVersion !== undefined
              ? { currentVersion: e.currentVersion }
              : {}),
          });
        }
      },
    });
}
