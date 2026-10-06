import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateIncidentCommand,
  validateIncidentFilter,
  validateIncidentPreviewInput,
  validateIncidentViews,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { rejectHeaderIdentity, sendError } from '../finance/brand-wallet/http.js';
import {
  incidentCommands,
  incidentCatalog,
  incidentCandidates,
  incidentDetail,
  incidentList,
  incidentPreview,
  type IncidentHooks,
} from './service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function view(kind: string, body: unknown) {
  if (!validateIncidentViews[kind]?.(body)) throw Error('INCIDENT_RESPONSE_CONTRACT');
  return body;
}
export function registerIncidents(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  hooks: IncidentHooks = {},
) {
  const commands = incidentCommands(pool, hooks);
  for (const [method, path] of [
    ['GET', ''],
    ['POST', ''],
    ['GET', '/catalog'],
    ['GET', '/candidates'],
    ['GET', '/commands/:commandId'],
    ['GET', '/:id'],
    ['POST', '/:id/confirmation-preview'],
    ['POST', '/:id/confirm'],
    ['POST', '/:id/dismiss'],
    ['POST', '/:id/review'],
    ['POST', '/:id/disposition'],
  ] as const) {
    app.route({
      method,
      url: '/api/v1/incidents' + path,
      bodyLimit: 131072,
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          rejectHeaderIdentity(req);
          const token = sessionToken(req),
            q = req.query as Record<string, string>,
            p = req.params as Record<string, string>;
          if (p.id && !uuid.test(p.id)) throw new AccessError('VALIDATION_FAILED', 400);
          if (method === 'POST') {
            if (Object.keys(q).length) throw new AccessError('VALIDATION_FAILED', 400);
            const session = await sessionIdentity(pool, token),
              a = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              b = Buffer.from(session.csrf_token);
            if (req.headers.origin !== origin || a.length !== b.length || !timingSafeEqual(a, b))
              throw new AccessError('CSRF_FAILED');
            if (path === '/:id/confirmation-preview') {
              if (!validateIncidentPreviewInput(req.body))
                throw new AccessError('VALIDATION_FAILED', 400);
              const body = req.body;
              return view(
                'preview',
                await UnitOfWork.run(pool, token, body.companyId, 'incidents', (u) =>
                  incidentPreview(u, p.id!, body.confirmation),
                ),
              );
            }
            if (!validateIncidentCommand(req.body)) throw new AccessError('VALIDATION_FAILED', 400);
            const body = req.body;
            if (
              path === ''
                ? body.type !== 'incident.report'
                : body.type !== 'incident.' + path.split('/').at(-1) ||
                  !('incidentId' in body) ||
                  body.incidentId !== p.id
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            const r = await commands.execute(token, body);
            return reply.code(r.status).send(view('result', r.body));
          }
          if (!uuid.test(q.companyId ?? '')) throw new AccessError('VALIDATION_FAILED', 400);
          if (path === '/commands/:commandId') {
            if (Object.keys(q).length !== 1 || !uuid.test(p.commandId ?? ''))
              throw new AccessError('VALIDATION_FAILED', 400);
            const r = await commands.recover(token, q.companyId!, 'incidents', p.commandId!);
            return reply.code(r.status).send(r.status >= 400 ? r.body : view('result', r.body));
          }
          return await UnitOfWork.run(pool, token, q.companyId, 'incidents', async (u) => {
            if (path === '') {
              if (!validateIncidentFilter(q)) throw new AccessError('VALIDATION_FAILED', 400);
              return view('list', await incidentList(u, q));
            }
            if (path === '/candidates') {
              if (
                !uuid.test(q.brandId ?? '') ||
                (q.shipmentId && !uuid.test(q.shipmentId)) ||
                Object.keys(q).some((k) => !['companyId', 'brandId', 'shipmentId'].includes(k))
              )
                throw new AccessError('VALIDATION_FAILED', 400);
              return view('candidates', await incidentCandidates(u, q.brandId!, q.shipmentId));
            }
            if (Object.keys(q).length !== 1) throw new AccessError('VALIDATION_FAILED', 400);
            return path === '/catalog'
              ? view('catalog', await incidentCatalog(u))
              : view('detail', await incidentDetail(u, p.id!));
          });
        } catch (e) {
          if (e instanceof RetainedCommandError)
            return reply.code(e.reply.status).send(e.reply.body);
          return sendError(reply, e);
        }
      },
    });
  }
}
