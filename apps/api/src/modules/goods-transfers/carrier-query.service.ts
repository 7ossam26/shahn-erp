import type { Pool } from 'pg';
import { sourceByCompany } from '@shahn/database';
import { AccessError } from '@shahn/domain';
import type { GoodsTransferDesk } from '@shahn/contracts';
import type { IntegrationRuntime } from '../integration/config.js';
import { MonitoringReader } from '../execution/monitoring-reader.service.js';
import { UnitOfWork } from '../kernel/unit-of-work.js';

type Candidate = GoodsTransferDesk['drivers'][number];
/** Monitoring is advisory received evidence. Unknown/stale never rejects a valid ERP carrier. */
export async function carrierCandidates(
  pool: Pool,
  token: string,
  company: string,
  sourceBranch: string,
  runtime: IntegrationRuntime,
): Promise<Candidate[]> {
  const base = await UnitOfWork.run(pool, token, company, 'goods.send', async (u) => {
    u.assertBranch(sourceBranch);
    const source = await sourceByCompany(u.client, company);
    const branchResource = source
      ? (
          await u.client.query<{ resource_id: string }>(
            `SELECT resource_id FROM integration.binding WHERE company_id=$1 AND source_id=$2 AND entity='branch' AND native_id=$3 AND enabled AND issuer_status IN ('ready','not-required') AND accepted_revision=submitted_revision AND accepted_revision>0`,
            [company, source.id, sourceBranch],
          )
        ).rows[0]?.resource_id
      : null;
    const drivers = (
      await u.client.query<{
        id: string;
        name: string;
        branch_id: string;
        resource_id: string | null;
      }>(
        `SELECT d.id,d.name,d.branch_id,b.resource_id FROM employees.operational_driver d
       LEFT JOIN integration.binding b ON(b.company_id,b.native_id,b.entity)=(d.company_id,d.id,'driver') AND b.source_id=$2 AND b.enabled AND b.issuer_status IN ('ready','not-required') AND b.accepted_revision=b.submitted_revision AND b.accepted_revision>0
       WHERE d.company_id=$1 AND d.active ORDER BY d.name,d.id`,
        [company, source?.id ?? null],
      )
    ).rows;
    return { drivers, branchResource };
  });
  const reader = new MonitoringReader(pool, runtime);
  const candidates = await Promise.all(
    base.drivers.map(async (driver): Promise<Candidate> => {
      const unknown: Candidate = {
        id: driver.id,
        name: driver.name,
        branchId: driver.branch_id,
        atSourceBranch: null,
        round: null,
        evidenceAt: null,
        status: 'unknown',
      };
      if (!driver.resource_id || !base.branchResource) return unknown;
      try {
        const read = await reader.read(token, company, 'drivers', driver.resource_id, {
          capability: 'goods.send',
        });
        const snapshot = read.body as
          | (typeof read.body & {
              current?: { kind: string; branchId: string | null; stage: string } | null;
            })
          | null;
        if (!snapshot) return unknown;
        const evidenceAt = read.refreshedAt;
        const status =
          read.stale || !evidenceAt || Date.now() - Date.parse(evidenceAt) > 300000
            ? 'stale'
            : 'known';
        return {
          ...unknown,
          evidenceAt,
          status,
          atSourceBranch:
            status === 'known' &&
            snapshot.current?.kind === 'branch' &&
            snapshot.current.branchId === base.branchResource &&
            snapshot.current.stage !== 'heading',
          round: snapshot.round && !snapshot.round.endedAt ? snapshot.round.roundId : null,
        };
      } catch (error) {
        if (error instanceof AccessError && error.code === 'FORBIDDEN_SCOPE') throw error;
        return unknown;
      }
    }),
  );
  await UnitOfWork.run(pool, token, company, 'goods.send', async (u) => {
    u.assertBranch(sourceBranch);
  });
  const rank = (d: Candidate) =>
    d.status === 'known' && d.atSourceBranch && !d.round
      ? 0
      : d.status === 'known' && !d.round
        ? 1
        : d.status === 'known'
          ? 2
          : d.status === 'stale'
            ? 3
            : 4;
  return candidates.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      Number(b.branchId === sourceBranch) - Number(a.branchId === sourceBranch) ||
      a.name.localeCompare(b.name),
  );
}
