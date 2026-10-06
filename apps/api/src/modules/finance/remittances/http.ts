import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validateRemittanceScope,
  validateRemittanceCommand,
  validateRemittanceFilter,
  validateRemittanceViews,
  validateFinanceViews,
} from '@shahn/contracts';
import { sessionToken } from '../../access/http.js';
import { sessionIdentity } from '../../access/sessions.js';
import { UnitOfWork } from '../../kernel/unit-of-work.js';
import { RetainedCommandError } from '../../kernel/commands.js';
import { MonitoringReader } from '../../execution/monitoring-reader.service.js';
import type { IntegrationRuntime } from '../../integration/config.js';
import { financeCatalog } from '../service.js';
import { RemittanceEvidenceService } from './evidence.service.js';
import { RemittanceService, remittanceDetail } from './service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function view(kind: keyof typeof validateRemittanceViews | 'catalog', value: unknown) {
  const body: unknown = JSON.parse(JSON.stringify(value));
  const validate =
    kind === 'catalog' ? validateFinanceViews['catalog']! : validateRemittanceViews[kind];
  if (!validate(body)) throw Error('REMITTANCE_RESPONSE_CONTRACT');
  return body;
}
export function registerRemittances(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  runtime: IntegrationRuntime,
) {
  const evidence = new RemittanceEvidenceService(pool, new MonitoringReader(pool, runtime)),
    service = new RemittanceService(pool, evidence);
  for (const [method, path] of [
    ['GET', ''],
    ['GET', 'catalog'],
    ['GET', 'rounds'],
    ['GET', ':id'],
    ['POST', 'review'],
    ['POST', 'commands'],
    ['GET', 'commands/:commandId'],
  ] as const)
    app.route({
      method,
      url: '/api/v1/finance/remittances' + (path ? '/' + path : ''),
      bodyLimit: 65536,
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
            if (path === 'review') {
              if (!validateRemittanceScope(req.body))
                throw new AccessError('VALIDATION_FAILED', 400);
              return view('witness', (await evidence.refresh(token, req.body)).witness);
            }
            if (!validateRemittanceCommand(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const result = await service.confirm(token, req.body);
            return reply
              .code(result.status)
              .send(result.status < 400 ? view('result', result.body) : result.body);
          }
          if (!validateRemittanceFilter(q) || (q.from && q.to && q.from > q.to))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (path === 'commands/:commandId') {
            if (!uuid.test(p.commandId ?? '')) throw new AccessError('VALIDATION_FAILED', 400);
            const r = await service.recover(token, q.companyId!, p.commandId!);
            return reply.code(r.status).send(r.status < 400 ? view('result', r.body) : r.body);
          }
          return await UnitOfWork.run(pool, token, q.companyId, 'remittances', async (u) => {
            if (q.branchId) u.assertBranch(q.branchId);
            if (path === 'catalog') return view('catalog', await financeCatalog(u));
            if (path === ':id') {
              if (!uuid.test(p.id ?? '')) throw new AccessError('VALIDATION_FAILED', 400);
              return view('detail', await remittanceDetail(u, p.id!));
            }
            const items = (
              await u.client.query(
                `SELECT st.identity AS "roundId",b.native_id AS "driverId",d.name AS "driverName",st.data->>'startedAt' AS "startedAt",cl.data->>'roundEndedAt' AS "endedAt",r.id AS "remittanceId",r.reference,r.kind AS state,r.amount_minor::text AS "receivedMinor"
          FROM execution.state st JOIN integration.binding b ON b.company_id=st.company_id AND b.source_id=st.source_id AND b.entity='driver' AND b.resource_id=(st.data->>'driverId')::uuid
          JOIN employees.operational_driver d ON(d.company_id,d.id)=(b.company_id,b.native_id)
          LEFT JOIN execution.state cl ON(cl.company_id,cl.source_id,cl.identity)=(st.company_id,st.source_id,st.identity) AND cl.kind='round.ended'
          LEFT JOIN finance.remittance r ON(r.company_id,r.source_id,r.round_id)=(st.company_id,st.source_id,st.identity)
          WHERE st.company_id=$1 AND st.kind='round'
          AND NOT EXISTS(SELECT 1 FROM dispatch.cycle c WHERE c.company_id=st.company_id AND c.source_id=st.source_id AND c.task_id IN(SELECT jsonb_array_elements_text(st.data->'taskIds')::uuid) AND NOT(c.branch_id=ANY($2::uuid[])))
          AND ($3::uuid IS NULL OR b.native_id=$3) AND ($4::uuid IS NULL OR st.identity=$4)
          AND ($5::uuid IS NULL OR EXISTS(SELECT 1 FROM dispatch.cycle c WHERE c.company_id=st.company_id AND c.task_id IN(SELECT jsonb_array_elements_text(st.data->'taskIds')::uuid) AND c.branch_id=$5))
          AND ($6='all' OR ($6='unremitted' AND r.id IS NULL) OR r.kind=$6)
          AND ($7::date IS NULL OR (cl.data->>'roundEndedAt')::timestamptz >= ($7::date::timestamp AT TIME ZONE 'Africa/Cairo'))
          AND ($8::date IS NULL OR (cl.data->>'roundEndedAt')::timestamptz < (($8::date+1)::timestamp AT TIME ZONE 'Africa/Cairo'))
          ORDER BY st.data->>'startedAt' DESC,st.identity LIMIT 25 OFFSET $9`,
                [
                  u.access.companyId,
                  u.access.assignedBranches.map((b) => b.id),
                  q.driverId || null,
                  q.roundId || null,
                  q.branchId || null,
                  q.state ?? 'all',
                  q.from || null,
                  q.to || null,
                  (Number(q.page ?? 1) - 1) * 25,
                ],
              )
            ).rows;
            return view('rounds', { items, page: Number(q.page ?? 1), limit: 25 });
          });
        } catch (e) {
          if (e instanceof RetainedCommandError)
            return reply.code(e.reply.status).send(e.reply.body);
          const known = e instanceof AccessError;
          return reply
            .code(known ? e.status : 500)
            .send({ code: known ? e.code : 'REQUEST_FAILED', correlationId: randomUUID() });
        }
      },
    });
}
