import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { validateKernelCommand, validateKernelResult, validateKernelError } from '@shahn/contracts';
import { RetainedCommandError } from './commands.js';
import { AccessError } from '@shahn/domain';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import { trialCommands, type TrialHooks } from './trial.js';
export function registerKernel(
  app: FastifyInstance,
  pool: Pool,
  environment: string,
  origin: string,
  hooks: TrialHooks & { afterCommit?: () => Promise<void> } = {},
) {
  if (!['development', 'test'].includes(environment)) return;
  const service = trialCommands(pool, environment, hooks);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const method of ['GET', 'POST'] as const)
    app.route({
      method,
      url: '/api/v1/kernel/commands' + (method === 'GET' ? '/:commandId' : ''),
      bodyLimit: 16384,
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
          let result;
          if (method === 'POST') {
            const session = await sessionIdentity(pool, sessionToken(req));
            const csrf = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              expected = Buffer.from(session.csrf_token);
            if (
              req.headers.origin !== origin ||
              csrf.length !== expected.length ||
              !timingSafeEqual(csrf, expected)
            )
              throw new AccessError('CSRF_FAILED');
            if (!validateKernelCommand(req.body)) throw new AccessError('VALIDATION_FAILED', 400);
            result = await service.execute(sessionToken(req), req.body);
            await hooks.afterCommit?.();
          } else {
            const params = req.params as { commandId: string },
              query = req.query as Record<string, string>;
            if (
              !uuid.test(params.commandId) ||
              !uuid.test(query.companyId ?? '') ||
              Object.keys(query).length !== 1
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            result = await service.recover(
              sessionToken(req),
              query.companyId!,
              'kernel.trial',
              params.commandId,
            );
          }
          if (
            !(result.status >= 400
              ? validateKernelError(result.body)
              : validateKernelResult(result.body))
          )
            throw new Error('INVALID_KERNEL_RESPONSE');
          return reply.code(result.status).send(result.body);
        } catch (error) {
          if (error instanceof RetainedCommandError)
            return reply.code(error.reply.status).send(error.reply.body);
          const known = error instanceof AccessError;
          return reply.code(known ? error.status : 500).send({
            code: known ? error.code : 'REQUEST_FAILED',
            messageKey: known ? 'kernel.' + error.code.toLowerCase() : 'request.failed',
            commandId: validateKernelCommand(req.body) ? req.body.commandId : null,
            correlationId: randomUUID(),
          });
        }
      },
    });
}
