import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateBrandDuesFilter,
  validateBrandWalletViews,
  validatePayoutCalendarFilter,
  validateWalletLotFilter,
  validateWalletStatementFilter,
} from '@shahn/contracts';
import { sessionToken } from '../../access/http.js';
import { UnitOfWork } from '../../kernel/unit-of-work.js';
import { BrandWalletService } from './wallet.service.js';
import { brandDues, payoutCalendar, walletLots, walletStatement } from './queries.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function sendError(reply: FastifyReply, error: unknown) {
  const known = error instanceof AccessError;
  const body: Record<string, unknown> = {
    code: known ? error.code : 'REQUEST_FAILED',
    correlationId: randomUUID(),
  };
  if (known && 'details' in error) body.details = (error as { details: unknown }).details;
  return reply.code(known ? error.status : 500).send(body);
}
export function rejectHeaderIdentity(req: FastifyRequest) {
  if (
    req.headers.authorization ||
    req.headers['x-company-id'] ||
    req.headers['x-company'] ||
    req.headers['x-user-id']
  )
    throw new AccessError('FORBIDDEN_SCOPE');
}
function view(kind: keyof typeof validateBrandWalletViews, value: unknown) {
  const body: unknown = JSON.parse(JSON.stringify(value));
  if (!validateBrandWalletViews[kind](body)) throw Error('BRAND_WALLET_RESPONSE_CONTRACT');
  return body;
}
/** Shared company-level brand wallet reads under the brand payout screen grant (ERP-D-161). */
export function registerBrandWallets(app: FastifyInstance, pool: Pool) {
  for (const path of ['', 'calendar', ':brandId', ':brandId/lots', ':brandId/statement'] as const)
    app.get('/api/v1/finance/brand-wallets' + (path ? '/' + path : ''), async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        rejectHeaderIdentity(req);
        const q = req.query as Record<string, string>,
          p = req.params as Record<string, string>;
        if (path.startsWith(':') && !uuid.test(p.brandId ?? ''))
          throw new AccessError('VALIDATION_FAILED', 400);
        const valid =
          path === ''
            ? validateBrandDuesFilter(q)
            : path === 'calendar'
              ? validatePayoutCalendarFilter(q)
              : path === ':brandId'
                ? Object.keys(q).length === 1 && uuid.test(q.companyId ?? '')
                : path === ':brandId/lots'
                  ? validateWalletLotFilter(q)
                  : validateWalletStatementFilter(q) && !(q.from && q.to && q.from > q.to);
        if (!valid) throw new AccessError('VALIDATION_FAILED', 400);
        return await UnitOfWork.run(
          pool,
          sessionToken(req),
          q.companyId,
          'brand.payout',
          async (u) => {
            if (path === '') return view('dues', await brandDues(u, q));
            if (path === 'calendar')
              return view(
                'calendar',
                await payoutCalendar(u, {
                  from: q.from!,
                  to: q.to!,
                  ...(q.brandId ? { brandId: q.brandId } : {}),
                }),
              );
            if (path === ':brandId/lots') return view('lots', await walletLots(u, p.brandId!, q));
            if (path === ':brandId/statement')
              return view('statement', await walletStatement(u, p.brandId!, q));
            if (
              !(
                await u.client.query(
                  'SELECT 1 FROM commercial.brand WHERE company_id=$1 AND id=$2',
                  [u.access.companyId, p.brandId],
                )
              ).rowCount
            )
              throw new AccessError('NOT_FOUND', 404);
            await BrandWalletService.lock(u, [p.brandId!]);
            return view('summary', await new BrandWalletService(u, p.brandId!).summary());
          },
        );
      } catch (error) {
        return sendError(reply, error);
      }
    });
}
