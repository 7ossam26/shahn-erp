import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';
import { AccessError } from '@shahn/domain';
import { tawselUuid } from '@shahn/contracts/tawsel';
import { sessionToken } from '../access/http.js';
import { sessionIdentity } from '../access/sessions.js';
import type { ConnectionInstallation } from './connection-provider.js';
import { ConnectionSetup, requireConnectionAuthority } from './connection-setup.service.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { RetainedCommandError } from '../kernel/commands.js';
import { enrollmentCommands, recordEnrollmentOperatorResult } from './enrollment.service.js';
import type { IntegrationRuntime } from './config.js';
import {
  validateConnectionSetupRequests,
  validateConnectionSetupResponses,
} from '@shahn/contracts';

export function registerConnectionSetup(
  app: FastifyInstance,
  pool: Pool,
  origin: string,
  installation: ConnectionInstallation | null,
  runtime: IntegrationRuntime = { connections: [] },
  service = installation ? new ConnectionSetup(pool, installation) : null,
) {
  for (const operation of [
    'status',
    'import',
    'verify',
    'confirm',
    'result',
    'enrollment',
    'enrollment-result',
    'enrollment-status',
    'enrollment-recover',
  ] as const)
    app.route({
      method: ['status', 'result', 'enrollment-status', 'enrollment-recover'].includes(operation)
        ? 'GET'
        : 'POST',
      url: '/api/v1/integration/connection/' + operation,
      bodyLimit: 65536,
      errorHandler: (error, _req, reply) =>
        reply.code(error.statusCode === 413 ? 413 : 400).send({
          code: 'CONNECTION_REQUEST_INVALID',
          messageKey: 'integration.invalidRequest',
          correlationId: randomUUID(),
        }),
      preSerialization: async (_req, reply, payload) => {
        const validator =
          validateConnectionSetupResponses[
            operation === 'enrollment-recover' ? 'enrollment' : operation
          ];
        if (reply.statusCode >= 400 || !validator || validator(JSON.parse(JSON.stringify(payload))))
          return payload;
        reply.code(503);
        return {
          code: 'CONNECTION_RESPONSE_INVALID',
          messageKey: 'integration.unavailable',
          correlationId: randomUUID(),
        };
      },
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store');
        try {
          if (req.headers.authorization || req.headers['x-company-id'])
            throw new AccessError('FORBIDDEN_SCOPE');
          const token = sessionToken(req),
            input = (req.method === 'GET' ? req.query : req.body) as Record<string, unknown>;
          if (!input || !tawselUuid(input.companyId))
            throw new AccessError('VALIDATION_FAILED', 400);
          const company = input.companyId;
          await UnitOfWork.run(pool, token, company, 'integration', async (u) =>
            requireConnectionAuthority(u),
          );
          if (req.method === 'POST' && !validateConnectionSetupRequests[operation]?.(input))
            throw new AccessError('VALIDATION_FAILED', 400);
          if (req.method === 'POST') {
            const session = await sessionIdentity(pool, token),
              a = Buffer.from(String(req.headers['x-csrf-token'] ?? '')),
              b = Buffer.from(session.csrf_token);
            if (req.headers.origin !== origin || a.length !== b.length || !timingSafeEqual(a, b))
              throw new AccessError('CSRF_FAILED');
          }
          if (operation === 'enrollment') {
            const r = await enrollmentCommands(pool).execute(
              token,
              input as unknown as Parameters<ReturnType<typeof enrollmentCommands>['execute']>[1],
            );
            return reply.code(r.status).send(r.body);
          }
          if (operation === 'enrollment-recover') {
            if (!tawselUuid(input.commandId) || Object.keys(input).length !== 2)
              throw new AccessError('VALIDATION_FAILED', 400);
            const r = await enrollmentCommands(pool).recover(
              token,
              company,
              'enrollment',
              input.commandId,
            );
            return reply.code(r.status).send(r.body);
          }
          if (operation === 'enrollment-result') {
            if (
              Object.keys(input).sort().join(',') !== 'companyId,requestId,result' ||
              !tawselUuid(input.requestId)
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            return recordEnrollmentOperatorResult(
              pool,
              runtime,
              token,
              company,
              input.requestId,
              input.result,
            );
          }
          if (operation === 'enrollment-status') {
            if (Object.keys(input).length !== 1) throw new AccessError('VALIDATION_FAILED', 400);
            return UnitOfWork.run(pool, token, company, 'integration', async (u) => ({
              items: (
                await u.client.query(
                  `SELECT r.id AS "requestId",r.requests,o.action_id AS "actionId",CASE WHEN o.action_id IS NULL THEN 'awaiting-tawsel-identity-authorization' ELSE 'operator-result-recorded-awaiting-user-provision' END AS state FROM integration.enrollment_request r LEFT JOIN integration.enrollment_operator_result o ON(o.company_id,o.request_id)=(r.company_id,r.id) WHERE r.company_id=$1 ORDER BY r.created_at DESC LIMIT 100`,
                  [company],
                )
              ).rows,
            }));
          }
          if (!service) return { state: 'operator-installation-required', configured: false };
          if (operation === 'confirm') {
            const r = await service.confirm(
              token,
              input as unknown as Parameters<ConnectionSetup['confirm']>[1],
            );
            return reply.code(r.status).send(r.body);
          }
          if (operation === 'result') {
            if (!tawselUuid(input.commandId) || Object.keys(input).length !== 2)
              throw new AccessError('VALIDATION_FAILED', 400);
            const r = await service
              .commands()
              .recover(token, company, 'connection', input.commandId);
            return reply.code(r.status).send(r.body);
          }
          if (operation === 'status') {
            if (
              Object.keys(input).sort().join(',') !== 'companyId' &&
              Object.keys(input).sort().join(',') !== 'companyId,importId'
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            if (input.importId) {
              if (!tawselUuid(input.importId)) throw new AccessError('VALIDATION_FAILED', 400);
              return service.safe(await service.read(token, company, input.importId));
            }
            return UnitOfWork.run(pool, token, company, 'integration', async (u) => {
              requireConnectionAuthority(u);
              const row = (
                await u.client.query(
                  `SELECT r.revision,p.metadata,p.key_version,p.credential_expires_at AS "credentialExpiresAt",c.configuration,c.configuration_checked_at,c.enabled,c.last_error FROM integration.connection_revision r JOIN integration.protected_import p ON(p.company_id,p.id)=(r.company_id,r.import_id) JOIN integration.source c ON(c.company_id,c.id)=(r.company_id,r.source_id) WHERE r.company_id=$1 ORDER BY r.revision DESC LIMIT 1`,
                  [company],
                )
              ).rows[0];
              const receipt = (
                await u.client.query(
                  `SELECT max(received_at) AS "lastSignedReceipt",count(*) FILTER(WHERE application_state='applied')::int AS applied FROM integration.inbox WHERE company_id=$1`,
                  [company],
                )
              ).rows[0];
              return {
                state: row ? 'configured' : 'setup-required',
                connection: row ?? null,
                receipt,
                grantsRequired: [
                  'identity.provision',
                  'integration.manage',
                  'intake.prepare',
                  'assignment.manage',
                  'monitor.read',
                  'return.receive',
                  'return.dispose',
                ],
                enrollment: 'operator-assisted-exact-subjects',
                issuerIndependent: true,
              };
            });
          }
          if (!tawselUuid(input.importId)) throw new AccessError('VALIDATION_FAILED', 400);
          if (operation === 'import') {
            if (
              Object.keys(input).sort().join(',') !== 'companyId,importId,origin,package' ||
              typeof input.origin !== 'string'
            )
              throw new AccessError('VALIDATION_FAILED', 400);
            return service.import(token, company, input.importId, input.origin, input.package);
          }
          if (Object.keys(input).length !== 2) throw new AccessError('VALIDATION_FAILED', 400);
          return service.verify(token, company, input.importId);
        } catch (e) {
          if (e instanceof RetainedCommandError)
            return reply.code(e.reply.status).send(e.reply.body);
          const known = [
            'CREDENTIAL_EXPIRED',
            'REMOTE_SCOPE_OR_GRANTS_MISMATCH',
            'REMOTE_SETUP_IDENTITY_MISMATCH',
            'INSTALLATION_APPROVAL_MISMATCH',
            'UNAPPROVED_ADDRESS',
            'UNAPPROVED_ORIGIN',
            'REDIRECT_REFUSED',
            'AUTHORIZATION_EXPIRED',
          ];
          return reply.code(e instanceof AccessError ? e.status : 503).send({
            code:
              e instanceof AccessError
                ? e.code
                : e instanceof Error && known.includes(e.message)
                  ? e.message
                  : 'CONNECTION_VERIFICATION_UNAVAILABLE',
            messageKey: 'integration.unavailable',
            correlationId: randomUUID(),
          });
        }
      },
    });
}
