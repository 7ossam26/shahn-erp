import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { integrationRuntime } from '../../../apps/api/src/modules/integration/config.js';
import { TawselClient } from '../../../apps/api/src/modules/integration/tawsel-client.js';
import { tawselValidator } from '@shahn/contracts/tawsel';
import {
  validateRemittanceViews,
  type RemittanceWitness,
  type RemittanceDetail,
} from '@shahn/contracts';
interface Trial {
  approvedTestEnvironment: true;
  erpOrigin: string;
  companyId: string;
  sessionToken: string;
  csrfToken: string;
  branchId: string;
  driverId: string;
  tawselDriverId: string;
  roundId: string;
  workdayId: string;
  remittanceId: string;
  humanFlowEvidence: {
    actorRole: 'driver';
    outcomeIds: string[];
    roundEndActionId: string;
    artifactPath: string;
  };
}
it('independent public source histories match the stored witness and the actual isolated 800+200 receipt', async () => {
  const missing = ['TAWSEL_CONFIG_FILE', 'TAWSEL_P16_TRIAL_FILE'].filter((k) => !process.env[k]);
  if (missing.length)
    throw Error(
      'BLOCKED P16 publicIntegration / IP-GAP-004: missing ' +
        missing.join(', ') +
        '. An approved independent Tawsel runtime and real driver outcome/round-end trial are required; controlled HTTP fixtures do not certify public acceptance.',
    );
  const trial = JSON.parse(readFileSync(process.env['TAWSEL_P16_TRIAL_FILE']!, 'utf8')) as Trial;
  if (
    trial.approvedTestEnvironment !== true ||
    trial.humanFlowEvidence?.actorRole !== 'driver' ||
    !trial.humanFlowEvidence.roundEndActionId ||
    !trial.humanFlowEvidence.outcomeIds?.length ||
    !readFileSync(trial.humanFlowEvidence.artifactPath, 'utf8').trim()
  )
    throw Error('BLOCKED P16: separately authorized human-flow evidence required');
  const connection = integrationRuntime().connections.find((c) => c.companyId === trial.companyId);
  if (!connection) throw Error('BLOCKED P16: matching monitor.read source configuration required');
  const source = new TawselClient(connection);
  const allPages = async (
    kind: 'trips' | 'workdays' | 'tasks',
    id: string,
  ): Promise<Record<string, unknown> & { items: Record<string, unknown>[] }> => {
    for (let restart = 0; restart < 3; restart++) {
      const items: Record<string, unknown>[] = [];
      let cursor: string | null = null,
        revision: number | undefined,
        scopeKey: string | undefined;
      const seen = new Set<string>();
      let first: Record<string, unknown> | null = null,
        changed = false;
      do {
        const response = await source.request(
          '/api/v1/erp/monitoring/' +
            kind +
            '/' +
            id +
            (kind === 'trips' ? '' : '/history') +
            '?' +
            new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) }),
        );
        if (response.status === 409) {
          changed = true;
          break;
        }
        expect(response.status).toBe(200);
        expect(
          tawselValidator(
            'monitoring.schema.json#/$defs/' + (kind === 'trips' ? 'Snapshot' : 'History'),
          )(response.body),
        ).toBe(true);
        const body = response.body as Record<string, unknown> & {
          snapshotRevision: number;
          scopeKey: string;
          items: Record<string, unknown>[];
          nextCursor: string | null;
        };
        if (!first) {
          first = body;
          revision = body.snapshotRevision;
          scopeKey = body.scopeKey;
        }
        expect(body.snapshotRevision).toBe(revision);
        expect(body.scopeKey).toBe(scopeKey);
        items.push(...body.items);
        cursor = body.nextCursor;
        if (cursor) {
          expect(seen.has(cursor)).toBe(false);
          seen.add(cursor);
        }
      } while (cursor);
      if (!changed) return { ...first, items };
    }
    throw Error('BLOCKED P16: unstable source history');
  };
  const api = async (path: string, body?: unknown) => {
    const response = await fetch(trial.erpOrigin + '/api/v1/finance/remittances' + path, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(60000),
      headers: {
        Cookie: 'erp_session=' + trial.sessionToken,
        ...(body
          ? {
              'Content-Type': 'application/json',
              'X-CSRF-Token': trial.csrfToken,
              Origin: trial.erpOrigin,
            }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    expect(response.status).toBe(200);
    return response.json();
  };
  const trip = await allPages('trips', trial.roundId);
  expect(trip['driverId']).toBe(trial.tawselDriverId);
  expect(trip['round']).toMatchObject({ roundId: trial.roundId, workdayId: trial.workdayId });
  expect(trip['freshness']).toMatchObject({ receivedEvidenceOnly: true, deviceContactAt: null });
  const day = await allPages('workdays', trial.workdayId);
  const witness = (await api('/review', {
    companyId: trial.companyId,
    driverId: trial.driverId,
    roundId: trial.roundId,
    branchId: trial.branchId,
  })) as RemittanceWitness;
  expect(validateRemittanceViews.witness(witness)).toBe(true);
  expect(witness.blockers).toEqual([]);
  const original = (await api(
    '/' + trial.remittanceId + '?companyId=' + trial.companyId,
  )) as RemittanceDetail;
  expect(validateRemittanceViews.detail(original)).toBe(true);
  expect(original.amountMinor).toBe('100000');
  expect(original.components.map((c) => [c.method, c.amountMinor])).toEqual([
    ['cash', '80000'],
    ['instapay', '20000'],
  ]);
  expect(original.witness.sources.reduce((sum, s) => sum + BigInt(s.goodsMinor), 0n)).toBe(85000n);
  for (const s of original.witness.sources) {
    expect(trial.humanFlowEvidence.outcomeIds).toContain(s.outcomeId);
    const history = await allPages('tasks', s.taskId);
    for (const read of [history, day])
      expect(
        read.items.some(
          (x) =>
            x.kind === 'outcome' && (x.outcome as { outcomeId: string }).outcomeId === s.outcomeId,
        ),
      ).toBe(true);
  }
  expect(witness.expectedMinor).toBe('0'); // already covered once, never a second receipt
});
