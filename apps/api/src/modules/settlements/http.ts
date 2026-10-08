import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateOpeningCommand,
  validateOpeningPrepareInput,
  validateSettlementCaseFilter,
  validateSettlementCommand,
  validateSettlementPrepareInput,
  validateSettlementViews,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { rejectHeaderIdentity, sendError } from '../finance/brand-wallet/http.js';
import { SettlementService } from './service.js';
import {
  OpeningService,
  openingBatchDetail,
  openingBatches,
  type OpeningHooks,
} from './opening.service.js';
import { caseDetail, caseList, settlementCatalog } from './queries.js';
import type { SettlementHooks } from './framework.js';
import type { SettlementClocks } from './registry.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function view(kind: keyof typeof validateSettlementViews, value: unknown) {
  const body: unknown = JSON.parse(JSON.stringify(value));
  if (!validateSettlementViews[kind](body)) throw Error('SETTLEMENT_RESPONSE_CONTRACT');
  return body;
}
async function csrf(pool: Pool, req: FastifyRequest, origin: string, token: string) {
  const session = await sessionIdentity(pool, token),
    given = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
    expected = Buffer.from(session.csrf_token);
  if (
    req.headers.origin !== origin ||
    given.length !== expected.length ||
    !timingSafeEqual(given, expected)
  )
    throw new AccessError('CSRF_FAILED');
}
const companyOnly = (q: Record<string, string>) =>
  Object.keys(q).length === 1 && uuid.test(q.companyId ?? '');
type Route =
  | 'openingCatalog'
  | 'catalog'
  | 'list'
  | 'detail'
  | 'prepare'
  | 'confirm'
  | 'recover'
  | 'openingList'
  | 'openingDetail'
  | 'openingPrepare'
  | 'openingConfirm'
  | 'openingRecover';
const routes: readonly [method: 'GET' | 'POST', url: string, route: Route][] = [
  ['GET', '/api/v1/settlements/catalog', 'catalog'],
  ['GET', '/api/v1/settlements/cases', 'list'],
  ['GET', '/api/v1/settlements/cases/:caseId', 'detail'],
  ['POST', '/api/v1/settlements/prepare', 'prepare'],
  ['POST', '/api/v1/settlements/commands', 'confirm'],
  ['GET', '/api/v1/settlements/commands/:commandId', 'recover'],
  ['GET', '/api/v1/settlements/opening/catalog', 'openingCatalog'],
  ['GET', '/api/v1/settlements/opening/batches', 'openingList'],
  ['GET', '/api/v1/settlements/opening/batches/:batchId', 'openingDetail'],
  ['POST', '/api/v1/settlements/opening/prepare', 'openingPrepare'],
  ['POST', '/api/v1/settlements/opening/commands', 'openingConfirm'],
  ['GET', '/api/v1/settlements/opening/commands/:commandId', 'openingRecover'],
];
/** UI-ADJUSTMENT-001 and UI-OPENING-001. No Tawsel call; results are recovered by commandId. */
export function registerSettlements(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  options: SettlementClocks & { hooks?: SettlementHooks; openingHooks?: OpeningHooks } = {},
) {
  const service = new SettlementService(pool, options.hooks, options),
    opening = new OpeningService(pool, options.openingHooks, options.payrollClock);
  for (const [method, url, route] of routes)
    app.route({
      method,
      url,
      bodyLimit: 65536,
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          rejectHeaderIdentity(req);
          const q = req.query as Record<string, string>,
            p = req.params as Record<string, string>,
            token = sessionToken(req);
          for (const k of ['caseId', 'commandId', 'batchId'])
            if (p[k] !== undefined && !uuid.test(p[k]!))
              throw new AccessError('VALIDATION_FAILED', 400);
          if (method === 'POST') {
            if (Object.keys(q).length) throw new AccessError('VALIDATION_FAILED', 400);
            await csrf(pool, req, origin, token);
            const body = req.body;
            if (route === 'prepare') {
              if (!validateSettlementPrepareInput(body))
                throw new AccessError('VALIDATION_FAILED', 400);
              return view('preview', await service.prepare(token, body));
            }
            if (route === 'confirm') {
              if (!validateSettlementCommand(body)) throw new AccessError('VALIDATION_FAILED', 400);
              const r = await service.confirm(token, body);
              return reply.code(r.status).send(view('result', r.body));
            }
            if (route === 'openingPrepare') {
              if (!validateOpeningPrepareInput(body))
                throw new AccessError('VALIDATION_FAILED', 400);
              return view('openingPreview', await opening.prepare(token, body));
            }
            if (!validateOpeningCommand(body)) throw new AccessError('VALIDATION_FAILED', 400);
            const r = await opening.confirm(token, body);
            return reply.code(r.status).send(view('openingResult', r.body));
          }
          if (route === 'recover' || route === 'openingRecover') {
            if (!companyOnly(q)) throw new AccessError('VALIDATION_FAILED', 400);
            const r =
              route === 'recover'
                ? await service.recover(token, q.companyId!, p.commandId!)
                : await opening.recover(token, q.companyId!, p.commandId!);
            if (r.status >= 400) throw new RetainedCommandError(r);
            return reply
              .code(r.status)
              .send(view(route === 'recover' ? 'result' : 'openingResult', r.body));
          }
          if (route === 'list') {
            if (!validateSettlementCaseFilter(q)) throw new AccessError('VALIDATION_FAILED', 400);
          } else if (!companyOnly(q)) throw new AccessError('VALIDATION_FAILED', 400);
          const capability = route.startsWith('opening') ? 'opening' : 'settlements';
          return await UnitOfWork.run(pool, token, q.companyId, capability, async (u) => {
            if (route === 'catalog') return view('catalog', await settlementCatalog(u));
            if (route === 'openingCatalog')
              return view('catalog', await settlementCatalog(u, 'opening'));
            if (route === 'detail')
              return view('detail', await caseDetail(u, service.registry, p.caseId!));
            if (route === 'openingList') return view('openingList', await openingBatches(u));
            if (route === 'openingDetail')
              return view('openingDetail', await openingBatchDetail(u, p.batchId!));
            return view('list', await caseList(u, service.registry, q as never));
          });
        } catch (error) {
          if (error instanceof RetainedCommandError) {
            if (!validateSettlementViews.error(error.reply.body))
              return sendError(reply, Error('SETTLEMENT_ERROR_CONTRACT'));
            return reply.code(error.reply.status).send(error.reply.body);
          }
          return sendError(reply, error);
        }
      },
    });
}
