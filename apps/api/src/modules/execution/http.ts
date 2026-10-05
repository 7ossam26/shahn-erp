import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { AccessError } from '@shahn/domain';
import { validateExecutionRecords } from '@shahn/contracts/execution';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { sessionToken } from '../access/http.js';
export function registerExecutionReads(app: FastifyInstance, pool: Pool) {
  for (const kind of ['earnings', 'reviews'] as const)
    app.get('/api/v1/execution/' + kind, async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        const q = req.query as Record<string, string>;
        if (
          Object.keys(q).some((k) => !['companyId', 'page'].includes(k)) ||
          req.headers.authorization ||
          req.headers['x-company-id']
        )
          throw new AccessError('VALIDATION_FAILED', 400);
        const page = Number(q.page ?? 1);
        if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
          throw new AccessError('VALIDATION_FAILED', 400);
        const items = await UnitOfWork.run(
          pool,
          sessionToken(req),
          q.companyId,
          kind === 'earnings' ? 'employees' : 'integration',
          async (u) => {
            if (kind === 'reviews')
              return (
                await u.client.query(
                  `SELECT r.id,v.shipment_id AS "shipmentId",s.reference,r.state,r.created_at AS "createdAt",'legacy reason unavailable' AS reason FROM execution.settlement_review r JOIN execution.visit_fact v ON(v.company_id,v.id)=(r.company_id,r.visit_id) JOIN shipments.shipment s ON(s.company_id,s.id)=(v.company_id,v.shipment_id) WHERE r.company_id=$1 AND v.branch_id=ANY($2::uuid[]) ORDER BY r.created_at DESC,r.id LIMIT 25 OFFSET $3`,
                  [u.access.companyId, u.access.assignedBranches.map((b) => b.id), (page - 1) * 25],
                )
              ).rows;
            return (
              await u.client.query(
                `SELECT v.id,s.reference,v.work_at AS "workAt",v.branch_id AS "branchId",e.amount_minor::text AS "amountMinor",e.resolution->>'status' AS status,e.resolution->>'reason' AS reason,COALESCE(e.resolution->>'employeeName',e.resolution->'captured'->>'employeeName') AS "employeeName" FROM execution.earning_basis e JOIN execution.visit_fact v ON(v.company_id,v.id)=(e.company_id,e.visit_id) JOIN shipments.shipment s ON(s.company_id,s.id)=(v.company_id,v.shipment_id) WHERE e.company_id=$1 AND v.branch_id=ANY($2::uuid[]) AND NOT EXISTS(SELECT 1 FROM employees.employee_branch_history h WHERE h.company_id=e.company_id AND h.employee_id=COALESCE(e.resolution->>'employeeId',e.resolution->'captured'->>'employeeId')::uuid AND NOT h.branch_id=ANY($2::uuid[])) ORDER BY v.work_at DESC,v.id LIMIT 25 OFFSET $3`,
                [u.access.companyId, u.access.assignedBranches.map((b) => b.id), (page - 1) * 25],
              )
            ).rows;
          },
        );
        const body = JSON.parse(JSON.stringify({ items, page })) as unknown;
        if (!validateExecutionRecords[kind](body)) throw Error('INVALID_EXECUTION_RESPONSE');
        return reply.send(body);
      } catch (e) {
        return reply.code(e instanceof AccessError ? e.status : 500).send({
          code: e instanceof AccessError ? e.code : 'REQUEST_FAILED',
          correlationId: randomUUID(),
        });
      }
    });
}
