import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateStorageAgreementFilter,
  validateStoragePaymentCommand,
  validateStoragePaymentPreviewInput,
  validateStorageRefundCommand,
  validateStorageRefundPreviewInput,
  validateStorageStopCommand,
  validateStorageViews,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { rejectHeaderIdentity, sendError } from '../finance/brand-wallet/http.js';
import { agreementDetail, agreementList, storageCatalog } from './agreements.js';
import { databaseStorageClock, type StorageClock } from './clock.js';
import { StorageService, type StorageHooks } from './service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function view(kind: keyof typeof validateStorageViews, value: unknown) {
  const body: unknown = JSON.parse(JSON.stringify(value));
  if (!validateStorageViews[kind](body)) throw Error('STORAGE_RESPONSE_CONTRACT');
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
  | 'list'
  | 'catalog'
  | 'detail'
  | 'stopPreview'
  | 'stop'
  | 'stopRecovery'
  | 'paymentPreview'
  | 'payment'
  | 'paymentRecovery'
  | 'refundPreview'
  | 'refund'
  | 'refundRecovery';
const routes: readonly [method: 'GET' | 'POST', url: string, route: Route][] = [
  ['GET', '/api/v1/storage/agreements', 'list'],
  ['GET', '/api/v1/storage/catalog', 'catalog'],
  ['GET', '/api/v1/storage/agreements/commands/:commandId', 'stopRecovery'],
  ['GET', '/api/v1/storage/agreements/:agreementId', 'detail'],
  ['GET', '/api/v1/storage/agreements/:agreementId/stop/preview', 'stopPreview'],
  ['POST', '/api/v1/storage/agreements/:agreementId/stop', 'stop'],
  ['POST', '/api/v1/storage/payments/preview', 'paymentPreview'],
  ['POST', '/api/v1/storage/payments', 'payment'],
  ['GET', '/api/v1/storage/payments/commands/:commandId', 'paymentRecovery'],
  ['POST', '/api/v1/storage/credit-refunds/preview', 'refundPreview'],
  ['POST', '/api/v1/storage/credit-refunds', 'refund'],
  ['GET', '/api/v1/storage/credit-refunds/commands/:commandId', 'refundRecovery'],
];
/** UI-STORAGE-001. Storage makes no Tawsel call; native results are recovered by commandId. */
export function registerStorage(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  options: { clock?: StorageClock; hooks?: StorageHooks } = {},
) {
  const clock = options.clock ?? databaseStorageClock,
    service = new StorageService(pool, clock, options.hooks);
  for (const [method, url, route] of routes)
    app.route({
      method,
      url,
      bodyLimit: 16384,
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          rejectHeaderIdentity(req);
          const q = req.query as Record<string, string>,
            p = req.params as Record<string, string>,
            token = sessionToken(req);
          if (p.agreementId !== undefined && !uuid.test(p.agreementId))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (p.commandId !== undefined && !uuid.test(p.commandId))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (method === 'POST') {
            if (Object.keys(q).length) throw new AccessError('VALIDATION_FAILED', 400);
            await csrf(pool, req, origin, token);
            const body = req.body;
            if (route === 'paymentPreview') {
              if (!validateStoragePaymentPreviewInput(body))
                throw new AccessError('VALIDATION_FAILED', 400);
              return view('paymentPreview', await service.paymentPreview(token, body));
            }
            if (route === 'refundPreview') {
              if (!validateStorageRefundPreviewInput(body))
                throw new AccessError('VALIDATION_FAILED', 400);
              return view('refundPreview', await service.refundPreview(token, body));
            }
            if (route === 'payment') {
              if (!validateStoragePaymentCommand(body))
                throw new AccessError('VALIDATION_FAILED', 400);
              const r = await service.recordPayment(token, body);
              return reply.code(r.status).send(view('paymentResult', r.body));
            }
            if (route === 'refund') {
              if (!validateStorageRefundCommand(body))
                throw new AccessError('VALIDATION_FAILED', 400);
              const r = await service.refund(token, body);
              return reply.code(r.status).send(view('refundResult', r.body));
            }
            if (!validateStorageStopCommand(body) || body.agreementId !== p.agreementId)
              throw new AccessError('VALIDATION_FAILED', 400);
            const r = await service.stop(token, body);
            return reply.code(r.status).send(view('stopResult', r.body));
          }
          if (
            route === 'paymentRecovery' ||
            route === 'refundRecovery' ||
            route === 'stopRecovery'
          ) {
            if (!companyOnly(q)) throw new AccessError('VALIDATION_FAILED', 400);
            const r =
              route === 'paymentRecovery'
                ? await service.recoverPayment(token, q.companyId!, p.commandId!)
                : route === 'refundRecovery'
                  ? await service.recoverRefund(token, q.companyId!, p.commandId!)
                  : await service.recoverStop(token, q.companyId!, p.commandId!);
            if (r.status >= 400) throw new RetainedCommandError(r);
            return reply
              .code(r.status)
              .send(
                view(
                  route === 'paymentRecovery'
                    ? 'paymentResult'
                    : route === 'refundRecovery'
                      ? 'refundResult'
                      : 'stopResult',
                  r.body,
                ),
              );
          }
          if (route === 'stopPreview') {
            if (!companyOnly(q)) throw new AccessError('VALIDATION_FAILED', 400);
            return view(
              'stopPreview',
              await service.stopPreview(token, q.companyId!, p.agreementId!),
            );
          }
          const valid =
            route === 'list'
              ? validateStorageAgreementFilter(q) &&
                !(q.dueFrom && q.dueTo && q.dueFrom > q.dueTo) &&
                !(q.paidFrom && q.paidTo && q.paidFrom > q.paidTo)
              : companyOnly(q);
          if (!valid) throw new AccessError('VALIDATION_FAILED', 400);
          return await UnitOfWork.run(pool, token, q.companyId, 'storage', async (u) => {
            if (route === 'catalog') return view('catalog', await storageCatalog(u, clock));
            if (route === 'detail')
              return view('detail', await agreementDetail(u, p.agreementId!, clock));
            if (q.branchId && !u.access.companyBranches.some((b) => b.id === q.branchId))
              throw new AccessError('FORBIDDEN_SCOPE');
            return view('list', await agreementList(u, q, clock));
          });
        } catch (error) {
          if (error instanceof RetainedCommandError) {
            if (!validateStorageViews.error(error.reply.body))
              return sendError(reply, Error('STORAGE_ERROR_CONTRACT'));
            return reply.code(error.reply.status).send(error.reply.body);
          }
          return sendError(reply, error);
        }
      },
    });
}
