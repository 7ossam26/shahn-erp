import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import {
  reportRegistry,
  validateReportCommand,
  validateExportCommand,
  reportingResponseValidators,
} from '@shahn/contracts';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { ReportingService } from './service.js';
import { downloadExport, exportCommands, exportJob } from './exports.js';

export function registerReporting(app: FastifyInstance, pool: Pool, origin: string) {
  const reporting = new ReportingService(pool),
    commands = exportCommands(pool),
    uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const [method, path, kind] of [
    ['GET', 'catalog', 'catalog'],
    ['POST', 'snapshots', 'snapshot'],
    ['GET', 'snapshots/:id', 'page'],
    ['GET', 'snapshots/:id/rows/:ordinal', 'detail'],
    ['GET', 'snapshots/:id/category/:category', 'category'],
    ['POST', 'exports', 'export'],
    ['GET', 'exports/:id', 'job'],
    ['GET', 'exports/:id/download', 'download'],
    ['GET', 'commands/:id', 'command'],
  ] as const)
    app.route({
      method,
      url: '/api/v1/reports/' + path,
      bodyLimit: 32768,
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          const checked = (kind: keyof typeof reportingResponseValidators, value: unknown) => {
            if (!reportingResponseValidators[kind](value))
              throw new AccessError('INVALID_RESPONSE', 500);
            return value;
          };
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
            if (
              Object.keys(q).length ||
              !(kind === 'snapshot'
                ? validateReportCommand(req.body)
                : validateExportCommand(req.body))
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            const s = await sessionIdentity(pool, token),
              a = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              b = Buffer.from(s.csrf_token);
            if (req.headers.origin !== origin || a.length !== b.length || !timingSafeEqual(a, b))
              throw new AccessError('CSRF_FAILED');
            if (kind === 'snapshot')
              return reply.send(checked('page', await reporting.create(token, req.body as never)));
            const result = await commands.execute(token, req.body as never);
            return reply.code(result.status).send(checked('job', result.body));
          }
          const allowed =
            kind === 'page' || kind === 'category' ? ['companyId', 'page', 'limit'] : ['companyId'];
          if (
            !uuid.test(q['companyId'] ?? '') ||
            Object.keys(q).some((k) => !allowed.includes(k)) ||
            (p['id'] && !uuid.test(p['id']))
          )
            throw new AccessError('VALIDATION_FAILED', 400);
          const company = q['companyId']!;
          if (kind === 'category')
            return reply.send(
              checked(
                'page',
                await reporting.category(
                  token,
                  company,
                  p['id']!,
                  p['category']! as never,
                  Number(q['page'] ?? 1),
                  Number(q['limit'] ?? 25),
                ),
              ),
            );
          if (kind === 'page')
            return reply.send(
              checked(
                'page',
                await reporting.page(
                  token,
                  company,
                  p['id']!,
                  Number(q['page'] ?? 1),
                  Number(q['limit'] ?? 25),
                ),
              ),
            );
          if (kind === 'detail')
            return reply.send(
              checked(
                'row',
                await reporting.detail(token, company, p['id']!, Number(p['ordinal'])),
              ),
            );
          if (kind === 'command') {
            const result = await commands.recover(token, company, 'report.export', p['id']!);
            return reply.code(result.status).send(checked('job', result.body));
          }
          const result = await UnitOfWork.run(pool, token, company, 'reports', async (u) => {
            if (kind === 'job') return exportJob(u, p['id']!);
            if (kind === 'download') return downloadExport(u, p['id']!);
            const list = async (sql: string, args: unknown[] = []) =>
              (await u.client.query(sql, [company, ...args])).rows;
            return {
              reports: reportRegistry.filter((d) =>
                d.capabilities.every((c) => u.access.grants.includes(c as never)),
              ),
              branches: u.access.assignedBranches,
              companyBranches: u.access.grants.includes('brand.payout')
                ? u.access.companyBranches
                : [],
              brands: await list(
                'SELECT id,name FROM commercial.brand WHERE company_id=$1 ORDER BY lower(name),id LIMIT 20000',
              ),
              drivers: await list(
                'SELECT id,name FROM employees.operational_driver WHERE company_id=$1 AND branch_id=ANY($2::uuid[]) ORDER BY name,id',
                [u.access.assignedBranches.map((b) => b.id)],
              ),
              accounts: u.access.grants.includes('finance.accounts')
                ? await list(
                    'SELECT a.id,a.name FROM finance.account a WHERE a.company_id=$1 AND EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=$1 AND x.account_id=a.id AND x.branch_id=ANY($2::uuid[])) ORDER BY a.name,a.id',
                    [u.access.assignedBranches.map((b) => b.id)],
                  )
                : [],
              references: await list(
                "SELECT id,name,kind FROM commercial.reference WHERE company_id=$1 AND kind IN ('expense_category','governorate','area') ORDER BY name,id LIMIT 20000",
              ),
            };
          });
          if (kind === 'download') {
            const a = result as Awaited<ReturnType<typeof downloadExport>>;
            return reply
              .header('Content-Type', a.media_type)
              .header('Content-Disposition', `attachment; filename="${a.filename}"`)
              .header('X-Content-Type-Options', 'nosniff')
              .send(a.bytes);
          }
          return reply.send(checked(kind === 'catalog' ? 'catalog' : 'job', result));
        } catch (e) {
          if (e instanceof RetainedCommandError)
            return reply.code(e.reply.status).send(e.reply.body);
          const error = e instanceof AccessError ? e : new AccessError('REQUEST_FAILED', 500);
          return reply.code(error.status).send({
            code: error.code,
            messageKey: 'reports.' + error.code.toLowerCase(),
            correlationId: randomUUID(),
          });
        }
      },
    });
}
