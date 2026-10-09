import { randomUUID, createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from '@shahn/database';
import { AccessError } from '@shahn/domain';
import {
  validateExportCommand,
  type ExportCommand,
  type ExportJob,
  type ReportSnapshot,
} from '@shahn/contracts';
import { CommandService } from '../kernel/commands.js';
import { DurableWork, lockLease, type Lease } from '../kernel/work.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { authorizedExportSnapshot as authorizedSnapshot, snapshotRows } from './service.js';
import { renderPdf, renderXlsx } from './render.js';

export const exportRegistry = [{ kind: 'report.export', lane: 'export' as const }];
export async function exportJob(u: UnitOfWork, id: string): Promise<ExportJob> {
  const r = (
    await u.client.query<{
      id: string;
      snapshot_id: string;
      format: 'xlsx' | 'pdf';
      expires_at: Date;
      state: string;
      attempts: number;
      last_error: string | null;
      artifact_id: string | null;
    }>(
      `SELECT j.*,w.state,w.attempts,w.last_error,a.id AS artifact_id FROM reporting.export_job j JOIN work_item w ON w.id=j.work_id LEFT JOIN reporting.artifact a ON(a.company_id,a.job_id)=(j.company_id,j.id) WHERE j.company_id=$1 AND j.id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!r) throw new AccessError('NOT_FOUND', 404);
  await authorizedSnapshot(u, r.snapshot_id);
  const expired = r.expires_at.getTime() <= Date.now(),
    state: ExportJob['state'] = expired
      ? 'expired'
      : r.state === 'ready' && r.artifact_id
        ? 'completed'
        : r.state === 'failed'
          ? 'failed'
          : r.state === 'leased'
            ? 'running'
            : 'pending';
  return {
    id: r.id,
    snapshotId: r.snapshot_id,
    format: r.format,
    state,
    attempts: r.attempts,
    error: r.last_error,
    artifactId: state === 'completed' ? r.artifact_id : null,
    expiresAt: r.expires_at.toISOString(),
    downloadUrl:
      state === 'completed'
        ? `/api/v1/reports/exports/${id}/download?companyId=${u.access.companyId}`
        : null,
  };
}
export function exportCommands(pool: Pool) {
  return new CommandService<ExportCommand>(pool, [
    {
      family: 'report.export',
      kind: 'report.export',
      capability: 'reports',
      async authorize(u, value) {
        const sid = String(value['snapshotId']);
        const s = await authorizedSnapshot(u, sid);
        if (value['filterDigest'] !== s.filterDigest)
          throw new AccessError('SNAPSHOT_DIGEST_CONFLICT', 409);
      },
      async execute(u, input, recordId) {
        if (!validateExportCommand(input)) throw new AccessError('VALIDATION_FAILED', 400);
        const s = await authorizedSnapshot(u, input.snapshotId),
          id = randomUUID();
        const workId = await new DurableWork(pool, exportRegistry).enqueue(u.client, {
          companyId: u.access.companyId,
          principalId: u.access.principalId,
          commandRecordId: recordId,
          entityId: id,
          entityVersion: 1,
          kind: 'report.export',
          sourceIdentity: id,
          payload: {
            jobId: id,
            snapshotId: s.id,
            dataDigest: s.dataDigest,
            filterDigest: s.filterDigest,
            format: input.format,
          },
        });
        await u.client.query(
          `INSERT INTO reporting.export_job(company_id,id,snapshot_id,command_record_id,format,work_id) VALUES($1,$2,$3,$4,$5,$6)`,
          [u.access.companyId, id, s.id, recordId, input.format, workId],
        );
        const body = await exportJob(u, id);
        return {
          reply: { status: 202, body },
          reference: { jobId: id, snapshotId: s.id, filterDigest: s.filterDigest },
          entityId: id,
          beforeVersion: null,
          afterVersion: 1,
        };
      },
      async resolve(u, ref) {
        return exportJob(u, String(ref['jobId']));
      },
      rejectionReference(input, u) {
        return {
          entityId: input.snapshotId,
          branchId: u.access.assignedBranches[0]?.id ?? u.access.companyBranches[0]!.id,
        };
      },
    },
  ]);
}
export class ExportWorker {
  readonly work: DurableWork;
  constructor(
    readonly pool: Pool,
    readonly hooks: {
      beforeRender?: (w: Lease) => Promise<void>;
      afterPublish?: (w: Lease) => Promise<void>;
    } = {},
  ) {
    this.work = new DurableWork(pool, exportRegistry);
  }
  async runOne(seconds = 300) {
    const w = await this.work.claim(seconds);
    if (!w) return false;
    try {
      const p = w.payload as {
        jobId: string;
        snapshotId: string;
        dataDigest: string;
        filterDigest: string;
        format: 'xlsx' | 'pdf';
      };
      const j = (
        await this.pool.query<{ expires_at: Date }>(
          `SELECT expires_at FROM reporting.export_job WHERE company_id=$1 AND id=$2`,
          [w.company_id, p.jobId],
        )
      ).rows[0];
      if (!j || j.expires_at.getTime() <= Date.now()) {
        await this.work.finish(w, { kind: 'definite', code: 'EXPORT_EXPIRED' });
        return true;
      }
      const old = (
        await this.pool.query(
          `SELECT id FROM reporting.artifact WHERE company_id=$1 AND job_id=$2`,
          [w.company_id, p.jobId],
        )
      ).rows[0];
      if (!old) {
        const s = (
          await this.pool.query<{ metadata: ReportSnapshot }>(
            `SELECT metadata FROM reporting.snapshot WHERE company_id=$1 AND id=$2`,
            [w.company_id, p.snapshotId],
          )
        ).rows[0]?.metadata;
        if (!s || s.dataDigest !== p.dataDigest || s.filterDigest !== p.filterDigest)
          throw new Error('EXPORT_SOURCE_IDENTITY_CONFLICT');
        const rows = await snapshotRows(this.pool, w.company_id, p.snapshotId);
        await this.hooks.beforeRender?.(w);
        // No database transaction held during workbook/PDF formatting.
        const bytes = p.format === 'xlsx' ? await renderXlsx(s, rows) : await renderPdf(s, rows);
        if (bytes.length > 64 * 1024 * 1024) throw new Error('EXPORT_ARTIFACT_TOO_LARGE');
        await transaction(this.pool, async (c) => {
          if (!(await lockLease(c, w, this.work.owner))) return;
          await c.query(
            `INSERT INTO reporting.artifact(company_id,job_id,id,snapshot_digest,sha256,media_type,byte_count,bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(company_id,job_id) DO NOTHING`,
            [
              w.company_id,
              p.jobId,
              randomUUID(),
              s.dataDigest,
              createHash('sha256').update(bytes).digest('hex'),
              p.format === 'xlsx'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/pdf',
              bytes.length,
              bytes,
            ],
          );
        });
        await this.hooks.afterPublish?.(w);
      }
      await this.work.finish(w, { kind: 'success' });
    } catch {
      await this.work.finish(
        w,
        w.attempts >= 3
          ? { kind: 'definite', code: 'EXPORT_RENDER_FAILED' }
          : { kind: 'retryable', code: 'EXPORT_RENDER_RETRY' },
      );
    }
    return true;
  }
  async expire() {
    return this.pool.query(
      `UPDATE reporting.artifact a SET bytes=NULL FROM reporting.export_job j WHERE (j.company_id,j.id)=(a.company_id,a.job_id) AND j.expires_at<=clock_timestamp() AND a.bytes IS NOT NULL`,
    );
  }
}
export async function downloadExport(u: UnitOfWork, id: string) {
  const job = await exportJob(u, id);
  if (job.state === 'expired') throw new AccessError('EXPORT_EXPIRED', 410);
  if (job.state !== 'completed') throw new AccessError('EXPORT_NOT_READY', 409);
  const a = (
    await u.client.query<{ bytes: Buffer | null; sha256: string; media_type: string }>(
      `SELECT bytes,sha256,media_type FROM reporting.artifact WHERE company_id=$1 AND job_id=$2`,
      [u.access.companyId, id],
    )
  ).rows[0];
  if (!a?.bytes || createHash('sha256').update(a.bytes).digest('hex') !== a.sha256)
    throw new AccessError('EXPORT_ARTIFACT_UNAVAILABLE', 503);
  return { ...a, filename: `${job.snapshotId}.${job.format}` };
}
