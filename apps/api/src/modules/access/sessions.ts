import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction, type TransactionClient } from '@shahn/database';
import {
  AccessError,
  effectiveGrants,
  capabilityPolicies,
  type AccessContext,
  type Capability,
  type ExceptionEffect,
} from '@shahn/domain';
import { digest, secret, encrypt } from './crypto.js';
import type { IdentityConfig } from './config.js';
export interface SessionIdentity {
  id: string;
  principal_id: string;
  kind: 'staff' | 'support';
  company_id: string | null;
  csrf_token: string;
  mfa: boolean;
  authenticated_at: Date;
  issuer: string;
  subject: string;
  tokens_ciphertext: string;
}
export async function sessionIdentity(
  client: TransactionClient,
  token: string,
): Promise<SessionIdentity> {
  const result = await client.query<SessionIdentity>(
    `SELECT s.*,p.kind FROM access.server_session s
    JOIN access.principal p ON p.id=s.principal_id
    JOIN access.issuer_binding b ON b.principal_id=p.id AND b.issuer=s.issuer AND b.subject=s.subject
    WHERE s.token_hash=$1 AND p.active AND s.revoked_at IS NULL
      AND s.idle_expires_at>clock_timestamp() AND s.absolute_expires_at>clock_timestamp()`,
    [digest(token)],
  );
  const session = result.rows[0];
  if (!session) throw new AccessError('AUTHENTICATION_REQUIRED', 401);
  return session;
}
export function requireMfa(session: SessionIdentity, recent = false): void {
  if (session.kind !== 'support' || !session.mfa) throw new AccessError('SUPPORT_MFA_REQUIRED');
  if (recent && Date.now() - session.authenticated_at.getTime() > 5 * 60 * 1000)
    throw new AccessError('REAUTHENTICATION_REQUIRED', 401);
}
/** Call inside the operation's transaction. Company lock serializes authority changes with commands. */
export async function loadAccess(
  client: TransactionClient,
  token: string,
  companyId?: string,
  write = false,
): Promise<AccessContext> {
  const session = await sessionIdentity(client, token);
  const target = companyId ?? session.company_id;
  if (!target || (session.kind === 'staff' && target !== session.company_id))
    throw new AccessError('FORBIDDEN_SCOPE');
  const company = (
    await client.query<{
      id: string;
      name: string;
      active: boolean;
      authorization_revision: string;
    }>(`SELECT * FROM access.company WHERE id=$1 FOR ${write ? 'UPDATE' : 'SHARE'}`, [target])
  ).rows[0];
  if (!company?.active) throw new AccessError('FORBIDDEN_SCOPE');
  // Re-read after waiting for the authority lock: a concurrent revocation may have committed.
  await sessionIdentity(client, token);
  let displayName = 'Technical Support',
    grants: Capability[] = [],
    assigned: { id: string; name: string }[] = [];
  let supportSessionId: string | null = null,
    supportExpiresAt: string | null = null;
  const branches = (
    await client.query<{ id: string; name: string }>(
      'SELECT id,name FROM access.branch WHERE company_id=$1 AND active ORDER BY name,id',
      [target],
    )
  ).rows;
  if (session.kind === 'support') {
    requireMfa(session);
    const support = (
      await client.query<{ id: string; expires_at: Date }>(
        `SELECT id,expires_at FROM access.support_session WHERE company_id=$1 AND session_id=$2 AND principal_id=$3 AND ended_at IS NULL AND expires_at>clock_timestamp() ORDER BY created_at DESC LIMIT 1`,
        [target, session.id, session.principal_id],
      )
    ).rows[0];
    if (!support) throw new AccessError('SUPPORT_SESSION_REQUIRED');
    supportSessionId = support.id;
    supportExpiresAt = support.expires_at.toISOString();
    grants = Object.keys(capabilityPolicies) as Capability[];
    assigned = branches;
  } else {
    const user = (
      await client.query<{ id: string; name: string; role_id: string }>(
        `SELECT u.id,u.name,u.role_id FROM access.ordinary_user u JOIN access.role r ON r.company_id=u.company_id AND r.id=u.role_id WHERE u.id=$1 AND u.company_id=$2 AND u.active AND r.active AND u.identity_state='ready'`,
        [session.principal_id, target],
      )
    ).rows[0];
    if (!user) throw new AccessError('FORBIDDEN_SCOPE');
    const role = (
      await client.query<{ capability: string }>(
        'SELECT capability FROM access.role_grant WHERE company_id=$1 AND role_id=$2',
        [target, user.role_id],
      )
    ).rows;
    const exceptions = (
      await client.query<{ capability: string; effect: ExceptionEffect }>(
        'SELECT capability,effect FROM access.user_exception WHERE company_id=$1 AND user_id=$2',
        [target, user.id],
      )
    ).rows;
    grants = effectiveGrants(
      role.map((r) => r.capability),
      Object.fromEntries(exceptions.map((e) => [e.capability, e.effect])),
    );
    assigned = (
      await client.query<{ id: string; name: string }>(
        `SELECT b.id,b.name FROM access.user_branch ub JOIN access.branch b ON b.id=ub.branch_id AND b.company_id=ub.company_id WHERE ub.company_id=$1 AND ub.user_id=$2 AND b.active ORDER BY b.name,b.id`,
        [target, user.id],
      )
    ).rows;
    displayName = user.name;
  }
  await client.query(
    `UPDATE access.server_session SET idle_expires_at=LEAST(absolute_expires_at,clock_timestamp()+interval '30 minutes') WHERE id=$1`,
    [session.id],
  );
  return {
    principalId: session.principal_id,
    principalKind: session.kind,
    sessionId: session.id,
    companyId: target,
    companyName: company.name,
    companyActive: true,
    userActive: true,
    issuer: session.issuer,
    subject: session.subject,
    displayName,
    authorizationRevision: company.authorization_revision,
    grants,
    assignedBranches: assigned,
    companyBranches: branches,
    supportSessionId,
    supportExpiresAt,
  };
}
export async function createSession(
  pool: Pool,
  config: IdentityConfig,
  identity: {
    issuer: string;
    subject: string;
    mfa: boolean;
    authenticatedAt: Date;
    tokens: unknown;
  },
  companyCode: string,
  support: boolean,
) {
  const token = secret(),
    csrfToken = secret();
  await transaction(pool, async (client) => {
    const binding = (
      await client.query<{ id: string; kind: string; company_id: string | null }>(
        `SELECT p.id,p.kind,u.company_id FROM access.issuer_binding b JOIN access.principal p ON p.id=b.principal_id LEFT JOIN access.ordinary_user u ON u.id=p.id LEFT JOIN access.company c ON c.id=u.company_id WHERE b.issuer=$1 AND b.subject=$2 AND p.active AND (($3 AND p.kind='support') OR (NOT $3 AND p.kind='staff' AND u.active AND u.identity_state='ready' AND c.active AND c.code=$4))`,
        [identity.issuer, identity.subject, support, companyCode],
      )
    ).rows[0];
    if (!binding || (support && !identity.mfa)) throw new AccessError('LOGIN_FAILED', 401);
    await client.query(
      `INSERT INTO access.server_session(id,token_hash,principal_id,company_id,issuer,subject,csrf_token,tokens_ciphertext,mfa,authenticated_at,idle_expires_at,absolute_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,clock_timestamp()+interval '30 minutes',clock_timestamp()+interval '12 hours')`,
      [
        randomUUID(),
        digest(token),
        binding.id,
        binding.company_id,
        identity.issuer,
        identity.subject,
        csrfToken,
        encrypt(JSON.stringify(identity.tokens), config.encryptionKey),
        identity.mfa,
        identity.authenticatedAt,
      ],
    );
  });
  return { token, csrfToken };
}
