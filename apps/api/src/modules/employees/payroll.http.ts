import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  validatePayrollCommand,
  validatePayrollMonth,
  validatePayrollPreviewInput,
  validatePayrollPreview,
  validatePayrollResult,
  validatePayrollCatalog,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { rejectHeaderIdentity, sendError } from '../finance/brand-wallet/http.js';
import { payrollCommands, payrollMonth, payrollPreview, payrollFamily } from './payroll.service.js';
import { databasePayrollClock, type PayrollClock } from './payroll-period.service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerPayroll(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  clock: PayrollClock = databasePayrollClock,
) {
  const commands = payrollCommands(pool, {}, clock);
  const routes = [
    ['GET', '/api/v1/employees/payroll/catalog', 'catalog'],
    ['GET', '/api/v1/employees/payroll/commands/:commandId', 'recovery'],
    ['GET', '/api/v1/employees/:id/months/:month', 'month'],
    ['POST', '/api/v1/employees/:id/advances', 'payroll.advance'],
    ['POST', '/api/v1/employees/:id/period-adjustments', 'payroll.adjustment'],
    ['POST', '/api/v1/employees/:id/source-reviews/resolve', 'payroll.resolve'],
    ['POST', '/api/v1/employees/:id/months/:month/payout-preview', 'preview'],
    ['POST', '/api/v1/employees/:id/months/:month/payout', 'payroll.payout'],
    ['POST', '/api/v1/employees/:id/months/:month/zero-close', 'payroll.zero-close'],
  ] as const;
  for (const [method, url, kind] of routes)
    app.route({
      method,
      url,
      bodyLimit: 16384,
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          rejectHeaderIdentity(req);
          const p = req.params as Record<string, string>,
            q = req.query as Record<string, string>,
            token = sessionToken(req);
          if (
            (p.id && !uuid.test(p.id)) ||
            (p.commandId && !uuid.test(p.commandId)) ||
            (p.month && !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(p.month))
          )
            throw new AccessError('VALIDATION_FAILED', 400);
          if (method === 'POST') {
            if (Object.keys(q).length) throw new AccessError('VALIDATION_FAILED', 400);
            const s = await sessionIdentity(pool, token),
              a = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              b = Buffer.from(s.csrf_token);
            if (req.headers.origin !== origin || a.length !== b.length || !timingSafeEqual(a, b))
              throw new AccessError('CSRF_FAILED');
            if (kind === 'preview') {
              if (!validatePayrollPreviewInput(req.body))
                throw new AccessError('VALIDATION_FAILED', 400);
              const input = req.body,
                result = await UnitOfWork.run(pool, token, input.companyId, 'employees', (u) =>
                  payrollPreview(u, p.id!, p.month!, input, clock),
                );
              if (!validatePayrollPreview(result)) throw Error('PAYROLL_RESPONSE_CONTRACT');
              return result;
            }
            if (
              !validatePayrollCommand(req.body) ||
              req.body.type !== kind ||
              req.body.employeeId !== p.id ||
              (p.month && req.body.month !== p.month)
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            const result = await commands.execute(token, req.body);
            if (result.status === 200 && !validatePayrollResult(result.body))
              throw Error('PAYROLL_RESPONSE_CONTRACT');
            return reply.code(result.status).send(result.body);
          }
          if (Object.keys(q).length !== 1 || !uuid.test(q.companyId ?? ''))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (kind === 'recovery') {
            const r = await commands.recover(token, q.companyId!, payrollFamily, p.commandId!);
            return reply.code(r.status).send(r.body);
          }
          return await UnitOfWork.run(pool, token, q.companyId, 'employees', async (u) => {
            if (kind === 'catalog') {
              const result = {
                accounts: (
                  await u.client.query(
                    `SELECT a.id,a.name,a.type,b.amount_minor::text AS "balanceMinor",ARRAY(SELECT x.branch_id FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id AND x.branch_id=ANY($2::uuid[]) ORDER BY x.branch_id) AS "branchIds" FROM finance.account a JOIN finance.account_balance b ON(b.company_id,b.account_id)=(a.company_id,a.id) WHERE a.company_id=$1 AND a.active AND EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id AND x.branch_id=ANY($2::uuid[])) ORDER BY a.name,a.id`,
                    [u.access.companyId, u.access.assignedBranches.map((b) => b.id)],
                  )
                ).rows,
              };
              if (!validatePayrollCatalog(result)) throw Error('PAYROLL_RESPONSE_CONTRACT');
              return result;
            }
            const result = await payrollMonth(u, p.id!, p.month!, clock);
            if (!validatePayrollMonth(result)) throw Error('PAYROLL_RESPONSE_CONTRACT');
            return result;
          });
        } catch (e) {
          return sendError(reply, e);
        }
      },
    });
}
