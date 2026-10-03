import type { IdentityConfig } from './config.js';
export interface IdentityIntent {
  username: string;
  name: string;
  enabled: boolean;
  correlationId: string;
  companyId: string;
  companyCode: string;
}
export class IssuerFailure extends Error {
  constructor(
    readonly kind: 'unknown' | 'invalid' | 'unavailable',
    readonly safeCode: string,
  ) {
    super(safeCode);
  }
}
interface RemoteUser {
  id: string;
  username: string;
  attributes?: Record<string, string[]>;
  email?: string;
  emailVerified?: boolean;
  lastName?: string;
  requiredActions?: string[];
}
export class KeycloakIdentityAdapter {
  constructor(readonly config: IdentityConfig) {}
  private async call(path: string, token: string, method = 'GET', body?: unknown) {
    try {
      return await fetch(this.config.issuer.replace('/realms/', '/admin/realms/') + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new IssuerFailure('unknown', 'ISSUER_RESULT_UNKNOWN');
    }
  }
  private async token() {
    try {
      const response = await fetch(this.config.issuer + '/protocol/openid-connect/token', {
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.adminClientId,
          client_secret: this.config.adminClientSecret,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { access_token: string };
      if (!body.access_token) throw new Error();
      return body.access_token;
    } catch {
      throw new IssuerFailure('unavailable', 'ISSUER_UNAVAILABLE');
    }
  }
  /** Exact stable correlation is the primary identity. Username alone can never bind a subject. */
  async reconcile(intent: IdentityIntent): Promise<string> {
    const token = await this.token(),
      username = intent.companyCode + '.' + intent.username;
    const find = async (): Promise<RemoteUser | null> => {
      const response = await this.call(
        '/users?' +
          new URLSearchParams({ q: 'erpCorrelationId:' + intent.correlationId, max: '2' }),
        token,
      );
      if (!response.ok) throw new IssuerFailure('unavailable', 'ISSUER_UNAVAILABLE');
      const users = (await response.json()) as RemoteUser[];
      if (users.length === 0) return null;
      const user = users[0]!;
      if (
        users.length !== 1 ||
        !user.id ||
        user.username !== username ||
        user.attributes?.['erpCorrelationId']?.[0] !== intent.correlationId ||
        user.attributes?.['erpCompanyId']?.[0] !== intent.companyId
      )
        throw new IssuerFailure('invalid', 'ISSUER_CORRELATION_CONFLICT');
      return user;
    };
    let found = await find();
    const representation = {
      username,
      enabled: intent.enabled,
      firstName: intent.name,
      attributes: { erpCorrelationId: [intent.correlationId], erpCompanyId: [intent.companyId] },
    };
    if (!found) {
      const result = await this.call('/users', token, 'POST', representation);
      if (!result.ok && result.status !== 409) {
        if (result.status === 400) throw new IssuerFailure('invalid', 'ISSUER_INVALID_REQUEST');
        throw new IssuerFailure('unknown', 'ISSUER_RESULT_UNKNOWN');
      }
      found = await find();
      if (!found)
        throw new IssuerFailure(
          result.status === 409 ? 'invalid' : 'unknown',
          result.status === 409 ? 'ISSUER_CORRELATION_CONFLICT' : 'ISSUER_RESULT_UNKNOWN',
        );
    }
    const updated = await this.call('/users/' + encodeURIComponent(found.id), token, 'PUT', {
      ...representation,
      // Keycloak's profile PUT clears omitted profile fields. Preserve issuer-owned
      // enrollment/contact data and unrelated attributes when ERP changes name/activation.
      ...(found.email !== undefined ? { email: found.email } : {}),
      ...(found.emailVerified !== undefined ? { emailVerified: found.emailVerified } : {}),
      ...(found.lastName !== undefined ? { lastName: found.lastName } : {}),
      ...(found.requiredActions !== undefined ? { requiredActions: found.requiredActions } : {}),
      attributes: { ...found.attributes, ...representation.attributes },
    });
    if (!updated.ok)
      throw new IssuerFailure(
        updated.status === 400 ? 'invalid' : 'unknown',
        updated.status === 400 ? 'ISSUER_INVALID_REQUEST' : 'ISSUER_RESULT_UNKNOWN',
      );
    return found.id;
  }
}
