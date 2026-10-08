import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { AccessError } from '@shahn/domain';
import {
  validateEmployeeCommand,
  validateEmployeeFilter,
  validateEmployeePreviewInput,
  validateEmployeeViews,
} from '@shahn/contracts';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import {
  employeeCommands,
  employeeDetail,
  employeeList,
  employeeCatalog,
  termPreview,
} from './service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerEmployees(app: FastifyInstance, pool: Pool, origin: string) {
  const commands = employeeCommands(pool);
  const routes = [
    ['GET', '/api/v1/employees', 'list'],
    ['GET', '/api/v1/employees/catalog', 'catalog'],
    ['GET', '/api/v1/employees/:id', 'detail'],
    ['POST', '/api/v1/employees', 'result'],
    ['POST', '/api/v1/employees/:id', 'result'],
    ['POST', '/api/v1/employees/:id/terms', 'result'],
    ['POST', '/api/v1/employees/:id/driver-links', 'result'],
    ['POST', '/api/v1/employees/:id/terms/preview', 'preview'],
    ['GET', '/api/v1/employees/commands/:commandId', 'result'],
  ] as const;
  for (const [method, url, view] of routes)
    app.route({
      method,
      url,
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
          if (p.id && !uuid.test(p.id)) throw new AccessError('VALIDATION_FAILED', 400);
          if (method === 'POST') {
            if (Object.keys(q).length) throw new AccessError('VALIDATION_FAILED', 400);
            const session = await sessionIdentity(pool, sessionToken(req)),
              given = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              expected = Buffer.from(session.csrf_token);
            if (
              req.headers.origin !== origin ||
              given.length !== expected.length ||
              !timingSafeEqual(given, expected)
            )
              throw new AccessError('CSRF_FAILED');
          }
          let body: unknown,
            status = 200;
          if (view === 'preview') {
            if (!validateEmployeePreviewInput(req.body))
              throw new AccessError('VALIDATION_FAILED', 400);
            const input = req.body;
            body = await UnitOfWork.run(
              pool,
              sessionToken(req),
              input.companyId,
              'employees',
              (u) =>
                termPreview(
                  u,
                  p.id!,
                  input.expectedVersion,
                  input.change,
                  input.base,
                  input.packingUplift,
                ),
            );
          } else if (method === 'POST') {
            if (!validateEmployeeCommand(req.body)) throw new AccessError('VALIDATION_FAILED', 400);
            const input = req.body;
            const allowed = url.endsWith('/terms')
              ? 'employee.terms'
              : url.endsWith('/driver-links')
                ? 'employee.link'
                : p.id
                  ? ['employee.update', 'employee.deactivate']
                  : ['employee.create'];
            if (
              !(Array.isArray(allowed) ? allowed.includes(input.type) : allowed === input.type) ||
              (p.id && (!('employeeId' in input) || input.employeeId !== p.id))
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            const result = await commands.execute(sessionToken(req), input);
            body = result.body;
            status = result.status;
          } else {
            if (!uuid.test(q.companyId ?? '')) throw new AccessError('VALIDATION_FAILED', 400);
            const keys =
              view === 'list'
                ? [
                    'companyId',
                    'search',
                    'branchId',
                    'active',
                    'salary',
                    'commission',
                    'effectiveDate',
                    'page',
                    'limit',
                    'payrollMonth',
                    'payrollState',
                    'carry',
                    'advanceStatus',
                  ]
                : ['companyId'];
            if (Object.keys(q).some((k) => !keys.includes(k)))
              throw new AccessError('VALIDATION_FAILED', 400);
            if (view === 'result') {
              if (!uuid.test(p.commandId ?? '')) throw new AccessError('VALIDATION_FAILED', 400);
              const result = await commands.recover(
                sessionToken(req),
                q.companyId!,
                'employees.profile',
                p.commandId!,
              );
              body = result.body;
              status = result.status;
            } else
              body = await UnitOfWork.run(
                pool,
                sessionToken(req),
                q.companyId,
                'employees',
                async (u) => {
                  if (view === 'catalog') return employeeCatalog(u);
                  if (view === 'detail') return employeeDetail(u, p.id!);
                  const filter = {
                    search: q.search ?? '',
                    branchId: q.branchId || null,
                    active: q.active ?? 'all',
                    salary: q.salary ?? 'all',
                    commission: q.commission ?? 'all',
                    effectiveDate: q.effectiveDate || null,
                    page: Number(q.page ?? 1),
                    limit: Number(q.limit ?? 20),
                    ...(q.payrollMonth ? { payrollMonth: q.payrollMonth } : {}),
                    payrollState: q.payrollState ?? 'all',
                    carry: q.carry ?? 'all',
                    advanceStatus: q.advanceStatus ?? 'all',
                  };
                  if (!validateEmployeeFilter(filter))
                    throw new AccessError('VALIDATION_FAILED', 400);
                  return employeeList(u, filter);
                },
              );
          }
          if (!validateEmployeeViews[view]!(body)) throw Error('INVALID_EMPLOYEE_RESPONSE');
          return reply.code(status).send(body);
        } catch (e) {
          if (e instanceof RetainedCommandError)
            return reply.code(e.reply.status).send(e.reply.body);
          const known = e instanceof AccessError;
          return reply.code(known ? e.status : 500).send({
            code: known ? e.code : 'REQUEST_FAILED',
            messageKey: known ? 'employees.' + e.code.toLowerCase() : 'request.failed',
            commandId: validateEmployeeCommand(req.body) ? req.body.commandId : null,
            correlationId: randomUUID(),
            ...(known && e.currentVersion !== undefined
              ? { currentVersion: e.currentVersion }
              : {}),
          });
        }
      },
    });
}
