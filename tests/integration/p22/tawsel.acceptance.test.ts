import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
// This verifies recorded, reviewed acceptance evidence; it does not manufacture a
// producer flow or turn the bounded live reads above into full public acceptance.
// The operator supplies this native evidence index after the actual trial. Wire
// contracts and their adoption remain owned by the unchanged 07 workflow.
interface AcceptanceIndex {
  kind: 'reviewed-public-trial';
  baselineCommit: string;
  runtimeCommit: string;
  reviewedBy: string;
  reviewedAt: string;
  records: {
    id: string;
    result: 'passed';
    evidenceKind: 'actual-http' | 'reviewed-contract';
    path: string;
    sha256: string;
  }[];
}
async function evidenceIndex() {
  const path = process.env['TAWSEL_P22_ACCEPTANCE_FILE'];
  if (!path)
    throw Error(
      'BLOCKED P22 acceptance: TAWSEL_P22_ACCEPTANCE_FILE absent. Complete reviewed producer/authority/recovery/rotation/performance/restore evidence and CR-001/CHECK-003 artifacts are required. Local fixtures cannot close these gates.',
    );
  const index = JSON.parse(await readFile(path, 'utf8')) as AcceptanceIndex;
  expect(index.kind).toBe('reviewed-public-trial');
  expect(index.baselineCommit).toMatch(/^[a-f0-9]{40}$/);
  expect(index.runtimeCommit).toMatch(/^[a-f0-9]{40}$/);
  expect(index.reviewedBy.length).toBeGreaterThan(0);
  expect(Number.isFinite(Date.parse(index.reviewedAt))).toBe(true);
  expect(new Set(index.records.map((r) => r.id)).size).toBe(index.records.length);
  for (const r of index.records) {
    expect(r.result, r.id).toBe('passed');
    const bytes = await readFile(resolve(dirname(path), r.path));
    expect(createHash('sha256').update(bytes).digest('hex'), r.id).toBe(r.sha256);
  }
  return index;
}
it('requires complete reviewed actual public evidence beyond the bounded reader smoke test', async () => {
  const index = await evidenceIndex();
  const inventory = await readFile('phases/INTEGRATION-PHASE-COVERAGE.md', 'utf8');
  const rows = [...inventory.matchAll(/^\| (?:0|[1-9]\d*) \| `([^`]+)`/gm)].map((m) => m[1]!);
  const operations = ['integration.bindSource', ...rows.slice(0, 43)];
  expect(operations).toHaveLength(44);
  const events = rows.slice(43);
  expect(events).toHaveLength(27);
  for (const id of [
    ...operations,
    ...events,
    'IP-GAP-003',
    'IP-GAP-004',
    'IP-GAP-006',
    'ERP-R-029',
    'restored-source-redelivery',
  ]) {
    expect(index.records.find((r) => r.id === id)?.evidenceKind, id).toBe('actual-http');
  }
  const trialPath = process.env['TAWSEL_P22_TRIAL_FILE'];
  if (!trialPath) throw Error('BLOCKED: identified live trial required for evidence comparison.');
  const trial = JSON.parse(await readFile(trialPath, 'utf8')) as { runtimeCommit: string };
  expect(index.runtimeCommit).toBe(trial.runtimeCommit);
});
it('requires reviewed CR-001 baseline adoption and the exact CHECK-003 public sequences', async () => {
  const index = await evidenceIndex();
  for (const id of ['CR-001-approved-baseline', 'CR-001-07-adoption', 'CHECK-003-exact-sequence'])
    expect(index.records.find((r) => r.id === id)?.evidenceKind, 'BLOCKED ' + id).toBe(
      'reviewed-contract',
    );
  for (const id of ['IP-AC-18', 'CHECK-003-accepted-A-to-B', 'CHECK-003-receipt-A-to-cycle-B'])
    expect(index.records.find((r) => r.id === id)?.evidenceKind, 'BLOCKED ' + id).toBe(
      'actual-http',
    );
});
