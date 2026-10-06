import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateBrandPayoutCommand,
  validateBrandPayoutFilter,
  validateBrandPayoutPreviewInput,
  validateBrandPayoutViews,
} from '@shahn/contracts';
import { sessionToken } from '../../access/http.js';
import { sessionIdentity } from '../../access/sessions.js';
import { RetainedCommandError } from '../../kernel/commands.js';
import { UnitOfWork } from '../../kernel/unit-of-work.js';
import { rejectHeaderIdentity, sendError } from '../brand-wallet/http.js';
import {
  BrandPayoutService,
  payoutCatalog,
  payoutDetail,
  payoutList,
  type BrandPayoutHooks,
} from './service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function view(kind: keyof typeof validateBrandPayoutViews, value: unknown) {
  const body: unknown = JSON.parse(JSON.stringify(value));
  if (!validateBrandPayoutViews[kind](body)) throw Error('BRAND_PAYOUT_RESPONSE_CONTRACT');
  return body;
}
export function registerBrandPayouts(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  hooks: BrandPayoutHooks = {},
) {
  const service = new BrandPayoutService(pool, hooks);
  for (const [method, path] of [
    ['GET', ''],
    ['GET', 'catalog'],
    ['GET', ':payoutId'],
    ['POST', 'preview'],
    ['POST', 'commands'],
    ['GET', 'commands/:commandId'],
  ] as const)
    app.route({
      method,
      url: '/api/v1/finance/brand-payouts' + (path ? '/' + path : ''),
      bodyLimit: 16384,
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          rejectHeaderIdentity(req);
          const q = req.query as Record<string, string>,
            p = req.params as Record<string, string>,
            token = sessionToken(req);
          if (method === 'POST') {
            if (Object.keys(q).length) throw new AccessError('VALIDATION_FAILED', 400);
            const session = await sessionIdentity(pool, token),
              given = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              expected = Buffer.from(session.csrf_token);
            if (
              req.headers.origin !== origin ||
              given.length !== expected.length ||
              !timingSafeEqual(given, expected)
            )
              throw new AccessError('CSRF_FAILED');
            if (path === 'preview') {
              if (!validateBrandPayoutPreviewInput(req.body))
                throw new AccessError('VALIDATION_FAILED', 400);
              return view('preview', await service.preview(token, req.body));
            }
            if (!validateBrandPayoutCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const result = await service.confirm(token, req.body);
            return reply.code(result.status).send(view('result', result.body));
          }
          if (path === 'commands/:commandId') {
            if (
              !uuid.test(p.commandId ?? '') ||
              Object.keys(q).length !== 1 ||
              !uuid.test(q.companyId ?? '')
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            const r = await service.recover(token, q.companyId!, p.commandId!);
            if (r.status >= 400) throw new RetainedCommandError(r);
            return reply.code(r.status).send(view('result', r.body));
          }
          if (path === ':payoutId' && !uuid.test(p.payoutId ?? ''))
            throw new AccessError('VALIDATION_FAILED', 400);
          const valid =
            path === ''
              ? validateBrandPayoutFilter(q) && !(q.from && q.to && q.from > q.to)
              : Object.keys(q).length === 1 && uuid.test(q.companyId ?? '');
          if (!valid) throw new AccessError('VALIDATION_FAILED', 400);
          return await UnitOfWork.run(pool, token, q.companyId, 'brand.payout', async (u) => {
            if (path === 'catalog') return view('catalog', await payoutCatalog(u));
            if (path === ':payoutId') return view('detail', await payoutDetail(u, p.payoutId!));
            return view('list', await payoutList(u, q));
          });
        } catch (error) {
          if (error instanceof RetainedCommandError) {
            if (!validateBrandPayoutViews.error(error.reply.body))
              return sendError(reply, Error('BRAND_PAYOUT_ERROR_CONTRACT'));
            return reply.code(error.reply.status).send(error.reply.body);
          }
          return sendError(reply, error);
        }
      },
    });
}
