import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { AccessError } from '@shahn/domain';
import { tawselUuid } from '@shahn/contracts/tawsel';
import {
  validateTrackingFilter,
  validateTrackingList,
  validateTrackingDetail,
} from '@shahn/contracts/execution';
import { sessionToken } from '../access/http.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { trackingList, trackingDetail } from './tracking.service.js';
export function registerTracking(app: FastifyInstance, pool: Pool) {
  for (const url of ['/api/v1/tracking', '/api/v1/tracking/:id'])
    app.get(url, async (req, reply) => {
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
          p = req.params as { id?: string };
        const allowed = [
          'companyId',
          'query',
          'brands',
          'branches',
          'custodians',
          'states',
          'services',
          'governorates',
          'areas',
          'dateBasis',
          'from',
          'to',
          'page',
        ];
        if (Object.keys(q).some((k) => !allowed.includes(k)) || (p.id && !tawselUuid(p.id)))
          throw new AccessError('VALIDATION_FAILED', 400);
        const body = await UnitOfWork.run(
          pool,
          sessionToken(req),
          q.companyId,
          'tracking',
          async (u) => {
            if (p.id) return trackingDetail(u, p.id);
            const f = {
              query: q.query ?? '',
              ...Object.fromEntries(
                [
                  'brands',
                  'branches',
                  'custodians',
                  'states',
                  'services',
                  'governorates',
                  'areas',
                ].map((k) => [k, q[k] ? q[k]!.split(',') : []]),
              ),
              dateBasis: q.dateBasis ?? 'created',
              from: q.from || null,
              to: q.to || null,
              page: Number(q.page ?? 1),
            };
            if (!validateTrackingFilter(f)) throw new AccessError('VALIDATION_FAILED', 400);
            return trackingList(u, f);
          },
        );
        if (!(p.id ? validateTrackingDetail(body) : validateTrackingList(body)))
          throw Error('INVALID_TRACKING_RESPONSE');
        return reply.send(body);
      } catch (e) {
        return reply.code(e instanceof AccessError ? e.status : 500).send({
          code: e instanceof AccessError ? e.code : 'REQUEST_FAILED',
          correlationId: randomUUID(),
        });
      }
    });
}
