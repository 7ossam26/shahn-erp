import { readFileSync } from 'node:fs';
import { tawselUuid } from '@shahn/contracts/tawsel';
export interface IntegrationConnection {
  selector: string;
  companyId: string;
  tenantId: string;
  integrationId: string;
  externalId: string;
  baseUrl: string;
  issuer: string;
  serviceBearer: string | null;
  serviceExpiresAt: string | null;
  signingKeys: Record<string, string>;
  initialKeyId: string | null;
  allowedCallbackUrls: string[];
}
export interface IntegrationRuntime {
  connections: IntegrationConnection[];
}
export function integrationRuntime(): IntegrationRuntime {
  const file = process.env['TAWSEL_CONFIG_FILE'];
  if (!file) return { connections: [] };
  try {
    const runtime = JSON.parse(readFileSync(file, 'utf8')) as IntegrationRuntime;
    if (!Array.isArray(runtime.connections)) throw new Error();
    for (const c of runtime.connections) {
      const url = new URL(c.baseUrl),
        issuer = new URL(c.issuer);
      const local =
        process.env['NODE_ENV'] !== 'production' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (
        !/^[a-zA-Z0-9_-]{1,64}$/.test(c.selector) ||
        ![c.companyId, c.tenantId, c.integrationId].every((x) => tawselUuid(x)) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        !['https:', 'http:'].includes(issuer.protocol) ||
        issuer.username ||
        issuer.password ||
        issuer.search ||
        issuer.hash ||
        !Array.isArray(c.allowedCallbackUrls) ||
        !c.externalId ||
        c.externalId.length > 256 ||
        (c.serviceBearer !== null &&
          (!c.serviceExpiresAt ||
            !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(c.serviceExpiresAt) ||
            !Number.isFinite(Date.parse(c.serviceExpiresAt)))) ||
        (c.serviceBearer !== null && !/^twp_[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(c.serviceBearer)) ||
        Object.entries(c.signingKeys).some(
          ([k, v]) => !/^[a-zA-Z0-9_-]{1,64}$/.test(k) || !/^[a-f0-9]{64}$/.test(v),
        ) ||
        (c.initialKeyId !== null && !Object.hasOwn(c.signingKeys, c.initialKeyId))
      )
        throw new Error();
    }
    if (new Set(runtime.connections.map((c) => c.selector)).size !== runtime.connections.length)
      throw new Error();
    return runtime;
  } catch {
    throw new Error('Configuration: TAWSEL_CONFIG_FILE is invalid; no credentials were logged.');
  }
}
