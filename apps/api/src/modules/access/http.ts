import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import { transaction } from '@shahn/database';
import { AccessError, scopedBranches, capabilityPolicies, type Capability } from '@shahn/domain';
import {
  validateAccessCommand,
  validateLogin,
  validateAccessResponse,
  accessResponseKey,
} from '@shahn/contracts';
import { AccessRepository } from './repository.js';
import { identityConfig, type IdentityConfig } from './config.js';
import { OidcSessionAdapter } from './oidc.js';
import { sessionIdentity } from './sessions.js';

export const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
function cookies(request: FastifyRequest): Record<string, string> {
  return Object.fromEntries(
    (request.headers.cookie ?? '')
      .split(';')
      .map((v) => v.trim().split('='))
      .filter((v) => v.length === 2) as [string, string][],
  );
}
export function sessionToken(request: FastifyRequest) {
  return cookies(request)['erp_session'] ?? '';
}
function same(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function registerAccess(
  app: FastifyInstance,
  pool: Pool,
  config: IdentityConfig | null = identityConfig(),
) {
  const repository = new AccessRepository(pool),
    oidc = config ? new OidcSessionAdapter(pool, config) : null;
  const origin = config?.origin ?? process.env['APP_ORIGIN'];
  async function csrf(request: FastifyRequest) {
    if (!origin || request.headers.origin !== origin) throw new AccessError('CSRF_FAILED');
    const s = await sessionIdentity(pool, sessionToken(request));
    if (!same(String(request.headers['x-csrf-token'] ?? ''), s.csrf_token))
      throw new AccessError('CSRF_FAILED');
  }
  function route(
    method: 'GET' | 'POST',
    url: string,
    handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>,
    mutate = false,
  ) {
    app.route({
      method,
      url: '/api/v1/access' + url,
      bodyLimit: 65536,
      handler: async (req, reply) => {
        reply
          .header('Cache-Control', 'no-store')
          .header('Pragma', 'no-cache')
          .header('Referrer-Policy', 'no-referrer');
        try {
          if (
            req.headers['x-company-id'] ||
            req.headers['x-company'] ||
            req.headers['x-user-id'] ||
            req.headers.authorization
          )
            throw new AccessError('FORBIDDEN_SCOPE');
          if (mutate) await csrf(req);
          const result = await handler(req, reply);
          if (reply.sent) return result;
          const normalized = JSON.parse(JSON.stringify(result));
          const schema = accessResponseKey(url);
          const validate = validateAccessResponse[schema];
          if (!validate || !validate(normalized)) throw new Error('INVALID_ACCESS_RESPONSE');
          return normalized;
        } catch (error) {
          const known = error instanceof AccessError;
          return reply.code(known ? error.status : 500).send({
            code: known ? error.code : 'REQUEST_FAILED',
            messageKey: known ? 'access.' + error.code.toLowerCase() : 'request.failed',
            commandId: validateAccessCommand(req.body) ? req.body.commandId : null,
            correlationId: randomUUID(),
          });
        }
      },
    });
  }
  route('POST', '/login', async (req, reply) => {
    if (!origin || req.headers.origin !== origin) throw new AccessError('CSRF_FAILED');
    if (!validateLogin(req.body)) throw new AccessError('VALIDATION_FAILED', 400);
    if (!oidc) throw new AccessError('IDENTITY_UNAVAILABLE', 503);
    const result = await oidc.begin(req.body);
    reply.header('Set-Cookie', cookie('erp_login', result.browser, 300));
    return { url: result.url };
  });
  route('GET', '/callback', async (req, reply) => {
    if (!oidc) throw new AccessError('IDENTITY_UNAVAILABLE', 503);
    try {
      const result = await oidc.callback(
        new URL(req.url, oidc.config.origin),
        cookies(req)['erp_login'] ?? '',
      );
      reply.header('Set-Cookie', [
        cookie('erp_session', result.token, 43200),
        cookie('erp_login', '', 0),
      ]);
      return reply.redirect(result.returnPath);
    } catch {
      reply.header('Set-Cookie', cookie('erp_login', '', 0));
      return reply.redirect('/login?error=login_failed');
    }
  });
  route('GET', '/session', async (req) => {
    const s = await sessionIdentity(pool, sessionToken(req));
    return {
      principalId: s.principal_id,
      csrfToken: s.csrf_token,
      kind: s.kind,
      companyId: s.company_id,
    };
  });
  route('GET', '/context', async (req) => repository.registry(sessionToken(req)));
  route('GET', '/users', async (req) => {
    const q = req.query as Record<string, string>;
    if (
      Object.keys(q).some((k) => !['search', 'page', 'limit'].includes(k)) ||
      (q['search']?.length ?? 0) > 180 ||
      (q['page'] && !/^\d{1,5}$/.test(q['page'])) ||
      (q['limit'] && !['25', '50', '100'].includes(q['limit']))
    )
      throw new AccessError('VALIDATION_FAILED', 400);
    return repository.users(
      sessionToken(req),
      q['search'] ?? '',
      Number(q['page'] ?? 0),
      Number(q['limit'] ?? 25),
    );
  });
  route('GET', '/roles', async (req) => repository.roles(sessionToken(req)));
  route('GET', '/users/:id', async (req) => {
    const { id } = req.params as { id: string };
    if (!uuidPattern.test(id)) throw new AccessError('VALIDATION_FAILED', 400);
    return repository.users(sessionToken(req), '', 0, 25, id);
  });
  route('GET', '/support', async (req) => repository.support(sessionToken(req)));
  route('GET', '/support/branches', async (req) => repository.supportBranches(sessionToken(req)));
  route('GET', '/audit', async (req) => repository.audit(sessionToken(req)));
  route('GET', '/scope/:capability', async (req) => {
    const { capability } = req.params as { capability: string };
    if (!(capability in capabilityPolicies)) throw new AccessError('NOT_FOUND', 404);
    return repository.read(sessionToken(req), capability as Capability, async (_client, ctx) => ({
      branchIds: scopedBranches(ctx, capability as Capability),
      authorizationRevision: ctx.authorizationRevision,
    }));
  });
  route(
    'POST',
    '/commands',
    async (req) => {
      if (!validateAccessCommand(req.body)) throw new AccessError('VALIDATION_FAILED', 400);
      return repository.command(sessionToken(req), req.body);
    },
    true,
  );
  for (const suffix of ['', '/download'])
    route('GET', '/commands/:id' + suffix, async (req, reply) => {
      const { id } = req.params as { id: string };
      if (!uuidPattern.test(id)) throw new AccessError('VALIDATION_FAILED', 400);
      const result = await repository.recover(sessionToken(req), id);
      if (suffix) reply.header('Content-Disposition', `attachment; filename="command-${id}.json"`);
      return result;
    });
  for (const global of [false, true])
    route(
      'POST',
      global ? '/global-signout' : '/logout',
      async (req, reply) => {
        if (
          req.body !== undefined &&
          (typeof req.body !== 'object' || req.body === null || Object.keys(req.body).length)
        )
          throw new AccessError('VALIDATION_FAILED', 400);
        const token = sessionToken(req);
        let redirectUrl = '/login';
        if (global) {
          if (!oidc) throw new AccessError('IDENTITY_UNAVAILABLE', 503);
          // Do not send the ID token through a browser redirect. Keycloak confirms global logout using its own SSO cookie.
          const configuration = await oidc.configuration();
          const endpoint = configuration.serverMetadata().end_session_endpoint;
          if (!endpoint) throw new AccessError('IDENTITY_UNAVAILABLE', 503);
          const url = new URL(endpoint);
          url.searchParams.set('client_id', oidc.config.clientId);
          url.searchParams.set('post_logout_redirect_uri', oidc.config.origin + '/login');
          redirectUrl = url.href;
        }
        await transaction(pool, async (client) => {
          const s = await sessionIdentity(client, token);
          await client.query(
            'UPDATE access.server_session SET revoked_at=clock_timestamp() WHERE id=$1',
            [s.id],
          );
          await client.query(
            'UPDATE access.support_session SET ended_at=clock_timestamp() WHERE session_id=$1 AND ended_at IS NULL',
            [s.id],
          );
        });
        reply.header('Set-Cookie', cookie('erp_session', '', 0));
        return { url: redirectUrl };
      },
      true,
    );
}
