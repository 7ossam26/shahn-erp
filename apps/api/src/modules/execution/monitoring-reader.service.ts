import type { Pool } from 'pg';
import { sourceByCompany } from '@shahn/database';
import { AccessError, type Capability } from '@shahn/domain';
import { tawselValidator, tawselUuid } from '@shahn/contracts/tawsel';
import type { IntegrationRuntime } from '../integration/config.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
export type MonitoringKind = 'drivers' | 'trips' | 'tasks' | 'workdays' | 'actions';
export interface MonitoringBody {
  scopeKey: string;
  snapshotRevision: number;
  nextCursor: string | null;
  freshness: {
    refreshedAt: string;
    receivedEvidenceOnly: true;
    deviceContactAt: null;
    integrationDelivery: 'unavailable';
  };
  items?: Record<string, unknown>[];
  resourceId?: string;
  driverId?: string;
  round?: { roundId: string; workdayId: string; endedAt: string | null } | null;
  action?: { actionId: string; sourceId: string };
}
export interface MonitoringRead {
  body: MonitoringBody | null;
  stale: boolean;
  status: number;
  refreshedAt: string | null;
  pages: number;
}
const validators = {
  drivers: tawselValidator<MonitoringBody>('monitoring.schema.json#/$defs/Snapshot'),
  trips: tawselValidator<MonitoringBody>('monitoring.schema.json#/$defs/Snapshot'),
  tasks: tawselValidator<MonitoringBody>('monitoring.schema.json#/$defs/History'),
  workdays: tawselValidator<MonitoringBody>('monitoring.schema.json#/$defs/History'),
  actions: tawselValidator<MonitoringBody>('monitoring.schema.json#/$defs/ActionSnapshot'),
};
export class MonitoringReader {
  constructor(
    readonly pool: Pool,
    readonly runtime: IntegrationRuntime,
    readonly transport: typeof fetch = fetch,
  ) {}
  async read(
    token: string,
    company: string,
    kind: MonitoringKind,
    id: string,
    options: { sourceId?: string; capability?: Capability } = {},
  ): Promise<MonitoringRead> {
    if (
      !tawselUuid(id) ||
      (options.sourceId && !tawselUuid(options.sourceId)) ||
      (kind === 'actions' && !options.sourceId)
    )
      throw new AccessError('VALIDATION_FAILED', 400);
    const capability = options.capability ?? 'integration';
    const path = `/api/v1/erp/monitoring/${kind}/${id}${kind === 'tasks' || kind === 'workdays' ? '/history' : ''}`;
    const query = new URLSearchParams(kind === 'actions' ? { sourceId: options.sourceId! } : {}),
      cacheKey = path + '?' + query;
    const load = () =>
      UnitOfWork.run(this.pool, token, company, capability, async (u) => {
        const source = await sourceByCompany(u.client, company);
        if (!source?.enabled) throw new AccessError('SOURCE_NOT_READY', 409);
        const cache = (
          await u.client.query<{ body: MonitoringBody; etag: string | null; refreshed_at: Date }>(
            `SELECT * FROM execution.monitoring_cache WHERE company_id=$1 AND source_id=$2 AND path=$3`,
            [company, source.id, cacheKey],
          )
        ).rows[0];
        return { source, cache };
      });
    const { source, cache } = await load(),
      connection = this.runtime.connections.find(
        (x) =>
          x.companyId === company &&
          x.integrationId === source.integration_id &&
          x.tenantId === source.tenant_id,
      );
    if (
      !connection?.serviceBearer ||
      !connection.serviceExpiresAt ||
      Date.parse(connection.serviceExpiresAt) <= Date.now()
    )
      throw new AccessError('SOURCE_AUTHORIZATION_REQUIRED', 409);
    let body: MonitoringBody | null = null,
      etag: string | null = null,
      status = 503,
      refresh: string | null = null,
      pages = 0;
    for (let restart = 0; restart < 3; restart++) {
      body = null;
      pages = 0;
      const cursors = new Set<string>();
      let cursor: string | null = null,
        changed = false;
      do {
        const q = new URLSearchParams(query);
        if (cursor) q.set('cursor', cursor);
        q.set('limit', '100');
        let response: Response;
        try {
          response = await this.transport(new URL(path + '?' + q, connection.baseUrl), {
            redirect: 'error',
            signal: AbortSignal.timeout(15000),
            headers: {
              Authorization: 'Bearer ' + connection.serviceBearer,
              ...(!cursor && !restart && cache?.etag ? { 'If-None-Match': cache.etag } : {}),
            },
          });
        } catch {
          status = 503;
          break;
        }
        status = response.status;
        if (status === 409) {
          changed = true;
          break;
        }
        if (status === 304 && !cursor && cache) {
          const scope = response.headers.get('x-snapshot-scope'),
            revision = response.headers.get('x-snapshot-revision'),
            at = response.headers.get('x-refreshed-at');
          if (
            scope !== cache.body.scopeKey ||
            revision !== String(cache.body.snapshotRevision) ||
            !at ||
            !Number.isFinite(Date.parse(at))
          )
            throw new AccessError('INVALID_MONITORING_REFRESH', 502);
          body = cache.body;
          etag = cache.etag;
          refresh = at;
          pages = 1;
          break;
        }
        if (status !== 200) break;
        const raw = await response.text();
        if (Buffer.byteLength(raw) > 2097152) throw new AccessError('MONITORING_TOO_LARGE', 502);
        let page: unknown;
        try {
          page = JSON.parse(raw);
        } catch {
          throw new AccessError('INVALID_MONITORING_RESPONSE', 502);
        }
        if (!validators[kind](page)) throw new AccessError('INVALID_MONITORING_RESPONSE', 502);
        if (
          ((kind === 'tasks' || kind === 'workdays') && page.resourceId !== id) ||
          (kind === 'drivers' && page.driverId !== id) ||
          (kind === 'trips' && page.round?.roundId !== id) ||
          (kind === 'actions' &&
            (page.action?.actionId !== id || page.action.sourceId !== options.sourceId))
        )
          throw new AccessError('MONITORING_IDENTITY_CONFLICT', 502);
        const checkSource = (v: unknown): void => {
          if (!v || typeof v !== 'object') return;
          for (const [k, x] of Object.entries(v)) {
            if (k === 'sourceReference' && x && typeof x === 'object') {
              const r = x as { tenantId: string; integrationId: string };
              if (r.tenantId !== source.tenant_id || r.integrationId !== source.integration_id)
                throw new AccessError('MONITORING_SOURCE_CONFLICT', 502);
            }
            if (k === 'integrationId' && x !== null && x !== source.integration_id)
              throw new AccessError('MONITORING_SOURCE_CONFLICT', 502);
            checkSource(x);
          }
        };
        checkSource(page);
        if (
          body &&
          (body.scopeKey !== page.scopeKey || body.snapshotRevision !== page.snapshotRevision)
        ) {
          changed = true;
          break;
        }
        if (!body) {
          body = structuredClone(page);
          etag = response.headers.get('etag');
        } else body.items?.push(...(page.items ?? []));
        refresh = page.freshness.refreshedAt;
        pages++;
        cursor = page.nextCursor;
        body.nextCursor = cursor;
        if (cursor && (cursor.length > 512 || cursors.has(cursor) || pages >= 1000))
          throw new AccessError('INVALID_MONITORING_CURSOR', 502);
        if (cursor) cursors.add(cursor);
      } while (cursor);
      if (changed) {
        status = 409;
        body = null;
        continue;
      }
      break;
    }
    // Reauthorize after HTTP, including cached/304/stale paths and permission revocation races.
    return UnitOfWork.run(this.pool, token, company, capability, async (u) => {
      const currentSource = await sourceByCompany(u.client, company);
      if (
        !currentSource?.enabled ||
        currentSource.id !== source.id ||
        currentSource.integration_id !== source.integration_id ||
        currentSource.tenant_id !== source.tenant_id
      )
        throw new AccessError('SOURCE_NOT_READY', 409);
      if ((status === 200 || status === 304) && body && body.nextCursor === null) {
        await u.client.query(
          `INSERT INTO execution.monitoring_cache(company_id,source_id,path,scope_key,body,etag,snapshot_revision,refreshed_at,last_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT(company_id,source_id,path) DO UPDATE SET scope_key=EXCLUDED.scope_key,body=EXCLUDED.body,etag=EXCLUDED.etag,snapshot_revision=EXCLUDED.snapshot_revision,refreshed_at=EXCLUDED.refreshed_at,last_status=EXCLUDED.last_status`,
          [
            company,
            source.id,
            cacheKey,
            body.scopeKey,
            JSON.stringify(body),
            etag,
            String(body.snapshotRevision),
            refresh,
            status,
          ],
        );
        return { body, stale: false, status, refreshedAt: refresh, pages };
      }
      return {
        body: [401, 403, 404].includes(status) ? null : (cache?.body ?? null),
        stale: true,
        status,
        refreshedAt: cache?.refreshed_at.toISOString() ?? null,
        pages: 0,
      };
    });
  }
}
