import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from '@shahn/database';
import {
  AccessError,
  assertCapability,
  minor,
  normalizeShipmentDigits,
  type Capability,
} from '@shahn/domain';
import {
  reportDefinition,
  validateReportCommand,
  type ReportCommand,
  type ReportFilters,
  type ReportId,
  type ReportPage,
  type ReportRow,
  type ReportSnapshot,
  profitCategories,
  type ProfitCategory,
  type ProfitSummary,
  type ProfitActualMoney,
  type ProfitSourceIssue,
  type ProfitReconciliationFinding,
} from '@shahn/contracts';
import { loadAccess } from '../access/sessions.js';
import { canonical, digest } from '../access/crypto.js';
import { appendAudit } from '../access/repository.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { readReport } from './read-services.js';

export function normalizeReportFilters(id: ReportId, filters: ReportFilters): ReportFilters {
  const def = reportDefinition(id);
  if (!def) throw new AccessError('VALIDATION_FAILED', 400);
  if (Object.keys(filters).some((k) => !def.filters.includes(k as keyof ReportFilters)))
    throw new AccessError('INVALID_REPORT_FILTER', 400);
  const f: ReportFilters = {};
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v)) {
      if (v.length) (f as Record<string, unknown>)[k] = [...new Set(v)].sort();
    } else if (v !== undefined && v !== '')
      (f as Record<string, unknown>)[k] =
        k === 'search' ? normalizeShipmentDigits(v).trim().toLowerCase() : v;
  }
  if (!def.dateBases.includes(f.dateBasis ?? def.dateBases[0]!))
    throw new AccessError('INVALID_DATE_BASIS', 400);
  if (f.from && f.to && f.from > f.to) throw new AccessError('VALIDATION_FAILED', 400);
  if (f.minMinor) minor(f.minMinor, 'signed');
  if (f.maxMinor) minor(f.maxMinor, 'signed');
  if (f.minMinor && f.maxMinor && BigInt(f.minMinor) > BigInt(f.maxMinor))
    throw new AccessError('VALIDATION_FAILED', 400);
  return f;
}
export function reportScope(u: UnitOfWork, id: ReportId, f: ReportFilters) {
  const def = reportDefinition(id);
  for (const c of def.capabilities) assertCapability(u.access, c as Capability);
  const allowed = (def.scope === 'wallet' ? u.access.companyBranches : u.access.assignedBranches)
    .map((b) => b.id)
    .sort();
  if (f.branchIds?.some((b) => !allowed.includes(b))) throw new AccessError('FORBIDDEN_SCOPE');
  const branches = f.branchIds?.length ? f.branchIds : allowed;
  return {
    branchIds: branches,
    authorizationRevision: u.access.authorizationRevision,
    completeCompany:
      branches.length === u.access.companyBranches.length &&
      u.access.companyBranches.every((b) => branches.includes(b.id)),
    policy: def.scope,
  };
}
export async function authorizedSnapshot(u: UnitOfWork, id: string): Promise<ReportSnapshot> {
  const r = (
    await u.client.query<{ metadata: ReportSnapshot; principal_id: string }>(
      `SELECT metadata,principal_id FROM reporting.snapshot WHERE company_id=$1 AND id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!r || r.principal_id !== u.access.principalId) throw new AccessError('NOT_FOUND', 404);
  const current = reportScope(u, r.metadata.reportId, r.metadata.filters);
  if (r.metadata.scope.branchIds.some((b) => !current.branchIds.includes(b)))
    throw new AccessError('FORBIDDEN_SCOPE');
  if (r.metadata.reportId === 'REP-15') {
    const m = r.metadata.context['actualMoney'] as ProfitActualMoney;
    for (const [present, cap] of [
      [m.accounts.length > 0, 'finance.accounts'],
      [m.fundsInTransitMinor !== null, 'finance.accounts'],
      [m.unremittedRecipientMinor !== null, 'remittances'],
      [m.brandLiabilitiesMinor !== null, 'brand.payout'],
      [m.storageCreditMinor !== null, 'storage'],
    ] as const)
      if (present) assertCapability(u.access, cap);
  }
  return publicSnapshot(u, r.metadata);
}
/** Summary permission reveals amounts, while source targets retain their ordinary permission. */
function publicSnapshot(u: UnitOfWork, snapshot: ReportSnapshot): ReportSnapshot {
  if (snapshot.reportId !== 'REP-15') return snapshot;
  const redact = <
    T extends {
      sourceCapability: string;
      sourceIds: string[];
      targetId: string;
      observedVersion: string;
    },
  >(
    item: T,
  ): T =>
    u.access.grants.includes(item.sourceCapability as Capability)
      ? item
      : {
          ...item,
          targetId: 'restricted',
          sourceIds: [],
          observedVersion: 'restricted',
          ...('sourcePath' in item ? { sourcePath: null } : {}),
          ...('recoveryPath' in item ? { recoveryPath: null } : {}),
        };
  return {
    ...snapshot,
    context: {
      ...snapshot.context,
      sourceIssues: (snapshot.context['sourceIssues'] as Parameters<typeof redact>[0][]).map(
        redact,
      ),
      reconciliation: (snapshot.context['reconciliation'] as Parameters<typeof redact>[0][]).map(
        redact,
      ),
    },
  };
}
/** Full source exports require each source's ordinary grant at creation, recovery and download. */
export async function authorizedExportSnapshot(u: UnitOfWork, id: string) {
  const s = await authorizedSnapshot(u, id);
  if (s.reportId === 'REP-15') {
    const caps = (
      await u.client.query<{ cap: string }>(
        `SELECT DISTINCT row_data->'economicEffect'->>'sourceCapability' AS cap FROM reporting.snapshot_row WHERE company_id=$1 AND snapshot_id=$2`,
        [u.access.companyId, id],
      )
    ).rows;
    for (const { cap } of caps) assertCapability(u.access, cap as Capability);
    // Artifact workers read full frozen metadata, including warnings whose targets may have
    // an ordinary permission different from any computed row (for example source recovery).
    for (const item of [
      ...(s.context['sourceIssues'] as ProfitSourceIssue[]),
      ...(s.context['reconciliation'] as ProfitReconciliationFinding[]),
    ])
      assertCapability(u.access, item.sourceCapability as Capability);
  }
  return s;
}
const reportPublicRow = (row: ReportRow): ReportRow =>
  row.economicEffect
    ? {
        id: row.id,
        ...(row.ordinal ? { ordinal: row.ordinal } : {}),
        values: row.values,
        sourceIds: [],
        revision: row.revision,
        effectiveAt: row.effectiveAt,
        recordedAt: row.recordedAt,
        detail: null,
      }
    : row;
export async function snapshotRows(
  client: UnitOfWork['client'],
  company: string,
  id: string,
): Promise<ReportRow[]> {
  return (
    await client.query<{ row_data: ReportRow }>(
      `SELECT row_data FROM reporting.snapshot_row WHERE company_id=$1 AND snapshot_id=$2 ORDER BY ordinal`,
      [company, id],
    )
  ).rows.map((r) => r.row_data);
}
export class ReportingService {
  constructor(
    readonly pool: Pool,
    readonly hooks: { afterSourceRead?: () => Promise<void> } = {},
  ) {}
  async create(token: string, input: ReportCommand): Promise<ReportPage> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.createOnce(token, input);
      } catch (e) {
        const error = e as { code?: string; constraint?: string };
        if (
          attempt >= 2 ||
          !(
            error.code === '40001' ||
            error.code === '40P01' ||
            (error.code === '23505' &&
              error.constraint === 'snapshot_company_id_principal_id_command_id_key')
          )
        )
          throw e;
      }
    }
  }
  private async createOnce(token: string, input: ReportCommand): Promise<ReportPage> {
    if (!validateReportCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
    const filters = normalizeReportFilters(input.reportId, input.filters),
      payloadHash = digest(canonical({ ...input, filters }));
    return transaction(this.pool, async (client) => {
      // Must precede authentication queries: all source reads/context/coverage share this view.
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const access = await loadAccess(client, token, input.companyId),
        u = new UnitOfWork(client, access);
      const scope = reportScope(u, input.reportId, filters);
      // Serialize retries on one identity. Concurrent source writers remain independent.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        access.companyId + ':' + access.principalId + ':' + input.commandId,
      ]);
      const old = (
        await client.query<{ metadata: ReportSnapshot; payload_digest: string }>(
          `SELECT metadata,payload_digest FROM reporting.snapshot WHERE company_id=$1 AND principal_id=$2 AND command_id=$3`,
          [access.companyId, access.principalId, input.commandId],
        )
      ).rows[0];
      if (old) {
        if (old.payload_digest !== payloadHash)
          throw new AccessError('COMMAND_PAYLOAD_CONFLICT', 409);
        const authorized = await authorizedSnapshot(u, old.metadata.id);
        return this.pageIn(u, authorized, 1, 25);
      }
      const asOf = (
        await client.query<{ at: Date }>('SELECT transaction_timestamp() AS at')
      ).rows[0]!.at.toISOString();
      const { rows, context } = await readReport(
        u,
        input.reportId,
        scope.branchIds,
        filters,
        input.sort,
      );
      await this.hooks.afterSourceRead?.();
      if (rows.length > 20000 || Buffer.byteLength(JSON.stringify(rows)) > 24 * 1024 * 1024)
        throw new AccessError('REPORT_TOO_LARGE_NARROW_FILTERS', 409);
      const revisions = (
        await client.query(
          `SELECT cp.source_id::text,cp.aggregate_type,cp.aggregate_id::text,cp.revision::text,cp.received_high::text,cp.received_through::text,cp.applied_through::text,cp.history_complete,
        NOT cp.rebuild_required AND cp.applied_through>=greatest(cp.received_high,cp.projected_through,cp.snapshot_through) AS financial_ready,
        cp.received_high>cp.received_through OR cp.received_high>cp.applied_through AS gapped,
        to_char(cp.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS updated_at
        FROM integration.checkpoint cp WHERE cp.company_id=$1 AND ($3::boolean OR EXISTS(SELECT 1 FROM dispatch.cycle dc WHERE dc.company_id=$1 AND dc.source_id=cp.source_id AND dc.task_id=cp.aggregate_id AND dc.branch_id=ANY($2::uuid[])) OR EXISTS(SELECT 1 FROM execution.visit_fact v WHERE v.company_id=$1 AND v.source_id=cp.source_id AND v.round_id=cp.aggregate_id AND v.branch_id=ANY($2::uuid[]))) ORDER BY cp.source_id,cp.aggregate_type,cp.aggregate_id LIMIT 20001`,
          [access.companyId, scope.branchIds, scope.completeCompany],
        )
      ).rows;
      const flags: string[] = [];
      if (revisions.length > 20000) flags.push('SOURCE_COVERAGE_TRUNCATED');
      if (['REP-01', 'REP-05', 'REP-07', 'REP-08', 'REP-09', 'REP-10'].includes(input.reportId)) {
        if (!revisions.length) flags.push('SOURCE_COVERAGE_UNKNOWN');
      }
      if (input.reportId === 'REP-15') {
        const absent = (
          await client.query(
            `SELECT 1 FROM execution.visit_fact v WHERE v.company_id=$1 AND v.branch_id=ANY($2::uuid[]) AND NOT EXISTS(SELECT 1 FROM integration.checkpoint cp WHERE cp.company_id=$1 AND cp.source_id=v.source_id AND cp.aggregate_id=v.task_id) LIMIT 1`,
            [access.companyId, scope.branchIds],
          )
        ).rowCount;
        if (absent) flags.push('SOURCE_COVERAGE_UNKNOWN');
      }
      if (input.reportId !== 'REP-14') {
        if (revisions.some((r) => r.gapped || !r.history_complete))
          flags.push('SOURCE_HISTORY_INCOMPLETE');
        if (revisions.some((r) => !r.financial_ready))
          flags.push('SOURCE_FINANCIAL_READINESS_PENDING');
      }
      if (rows.some((r) => r.values['date'] === null)) flags.push('UNKNOWN_BUSINESS_DATE');
      if (input.reportId === 'REP-15') {
        const issues = context['sourceIssues'] as { code: string }[];
        flags.push(...new Set(issues.map((i) => i.code)));
        (context['profit'] as ProfitSummary).calculationComplete = !flags.length;
        const findings = context[
          'reconciliation'
        ] as import('@shahn/contracts').ProfitReconciliationFinding[];
        for (const r of revisions.filter(
          (r) => r.gapped || !r.history_complete || !r.financial_ready,
        ))
          findings.push({
            id: digest(
              canonical([access.companyId, r.source_id, r.aggregate_id, r.revision, asOf]),
            ),
            kind: 'source_checkpoint',
            targetType: r.aggregate_type,
            targetId: r.aggregate_id,
            sourceIds: [r.source_id],
            observedVersion: `${r.revision}:received=${r.received_high}:applied=${r.applied_through}`,
            expectedMinor: null,
            observedMinor: null,
            deltaMinor: null,
            asOf,
            branchIds: scope.branchIds,
            recoveryPath: '/integration/recovery',
            sourceCapability: 'integration',
            message: `تغطية المصدر غير مكتملة: استلم حتى ${r.received_high} وطبق حتى ${r.applied_through}؛ يلزم مسار الاستعادة دون قيد مالي تلقائي.`,
          });
      }
      const totals: Record<string, string> = {};
      for (const c of reportDefinition(input.reportId).columns.filter((c) => c.total))
        totals[c.key] = rows
          .filter((r) => input.reportId !== 'REP-18' || r.values['kind'] === 'stock')
          .reduce((n, r) => n + BigInt(r.values[c.key] ?? '0'), 0n)
          .toString();
      if (input.reportId === 'REP-18') {
        context['units'] = 'الإجماليات الرئيسية للقطع فقط؛ الطرود المغلقة في إجمالي مستقل';
        context['stockTotals'] = totals;
        context['parcelTotals'] = Object.fromEntries(
          ['onHand', 'carrier'].map((key) => [
            key,
            rows
              .filter((r) => r.values['kind'] === 'parcel')
              .reduce((n, r) => n + BigInt(r.values[key] ?? '0'), 0n)
              .toString(),
          ]),
        );
      }
      const dataDigest = digest(canonical({ rows, totals, context, revisions }));
      const snapshot: ReportSnapshot = {
        id: randomUUID(),
        reportId: input.reportId,
        companyName: access.companyName,
        asOf,
        filterDigest: digest(
          canonical({ reportId: input.reportId, filters, sort: input.sort, scope }),
        ),
        dataDigest,
        filters,
        sort: input.sort,
        dateBasis: filters.dateBasis ?? reportDefinition(input.reportId).dateBases[0]!,
        scope,
        totalRows: rows.length,
        totals,
        context,
        coverage: { complete: !flags.length, flags, revisions },
      };
      await client.query(
        `INSERT INTO reporting.snapshot(company_id,id,principal_id,command_id,payload_digest,metadata) VALUES($1,$2,$3,$4,$5,$6)`,
        [
          access.companyId,
          snapshot.id,
          access.principalId,
          input.commandId,
          payloadHash,
          JSON.stringify(snapshot),
        ],
      );
      await client.query(
        `INSERT INTO reporting.snapshot_row(company_id,snapshot_id,ordinal,row_data) SELECT $1,$2,ordinality::int,value FROM jsonb_array_elements($3::jsonb) WITH ORDINALITY`,
        [access.companyId, snapshot.id, JSON.stringify(rows)],
      );
      await appendAudit(
        client,
        access,
        access.companyId,
        'report.snapshot',
        snapshot.id,
        null,
        null,
        null,
        {
          reportId: input.reportId,
          filterDigest: snapshot.filterDigest,
          dataDigest,
          rowCount: rows.length,
        },
      );
      return {
        snapshot: publicSnapshot(u, snapshot),
        rows: rows.slice(0, 25).map(reportPublicRow),
        page: 1,
        limit: 25,
      };
    });
  }
  async pageIn(
    u: UnitOfWork,
    snapshot: ReportSnapshot,
    page: number,
    limit: number,
  ): Promise<ReportPage> {
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || ![25, 50, 100].includes(limit))
      throw new AccessError('VALIDATION_FAILED', 400);
    const rows = (
      await u.client.query<{ row_data: ReportRow }>(
        `SELECT row_data FROM reporting.snapshot_row WHERE company_id=$1 AND snapshot_id=$2 ORDER BY ordinal LIMIT $3 OFFSET $4`,
        [u.access.companyId, snapshot.id, limit, (page - 1) * limit],
      )
    ).rows.map((r) => r.row_data);
    return { snapshot, rows: rows.map(reportPublicRow), page, limit };
  }
  page(token: string, company: string, id: string, page = 1, limit = 25) {
    return UnitOfWork.run(this.pool, token, company, 'reports', async (u) =>
      this.pageIn(u, await authorizedSnapshot(u, id), page, limit),
    );
  }
  detail(token: string, company: string, id: string, ordinal: number) {
    return UnitOfWork.run(this.pool, token, company, 'reports', async (u) => {
      await authorizedSnapshot(u, id);
      if (!Number.isSafeInteger(ordinal) || ordinal < 1)
        throw new AccessError('VALIDATION_FAILED', 400);
      const row = (
        await u.client.query<{ row_data: ReportRow }>(
          `SELECT row_data FROM reporting.snapshot_row WHERE company_id=$1 AND snapshot_id=$2 AND ordinal=$3`,
          [company, id, ordinal],
        )
      ).rows[0];
      if (!row) throw new AccessError('NOT_FOUND', 404);
      if (row.row_data.economicEffect)
        assertCapability(u.access, row.row_data.economicEffect.sourceCapability as Capability);
      return row.row_data;
    });
  }
  category(
    token: string,
    company: string,
    id: string,
    category: ProfitCategory,
    page = 1,
    limit = 25,
  ) {
    return UnitOfWork.run(this.pool, token, company, 'reports', async (u) => {
      const snapshot = await authorizedSnapshot(u, id);
      if (
        snapshot.reportId !== 'REP-15' ||
        !profitCategories.includes(category) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        ![25, 50, 100].includes(limit)
      )
        throw new AccessError('VALIDATION_FAILED', 400);
      const all = (
        await u.client.query<{ row_data: ReportRow }>(
          `SELECT row_data FROM reporting.snapshot_row WHERE company_id=$1 AND snapshot_id=$2 AND row_data->'values'->>'category'=$3 ORDER BY ordinal`,
          [company, id, category],
        )
      ).rows.map((r) => r.row_data);
      for (const r of all)
        assertCapability(u.access, r.economicEffect!.sourceCapability as Capability);
      return {
        snapshot,
        rows: all.slice((page - 1) * limit, page * limit),
        page,
        limit,
        filteredTotalRows: all.length,
      };
    });
  }
}
