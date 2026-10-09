import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
// Required downstream checkpoints are deliberately fail-closed until actual collectors exist/run.
// These assertions supplement real scripts; they never replace a measurement or public trial.
for (const [file, label] of [
  ['release-acceptance.json', 'clean deployment with actual issuer and pinned image'],
  [
    'upgrade-acceptance.json',
    'old/current data, queued payloads, compatible repair and lease resumption',
  ],
  ['live-restore-acceptance.json', 'real public same-action recovery after encrypted restore'],
  ['capacity-acceptance.json', '55000 shipments/15 staff plus ramp and invariant comparison'],
  ['portability-acceptance.json', 'same immutable release on the second isolated layout'],
]) {
  it('P25 required checkpoint: ' + label, async () => {
    let evidence: Record<string, unknown>;
    try {
      evidence = JSON.parse(await readFile('docs/verification/P25/' + file, 'utf8'));
    } catch {
      throw Error(
        'BLOCKED P25: ' +
          label +
          ' has not run. See docs/verification/P25/README.md. No substitute or skipped pass.',
      );
    }
    expect(evidence['passed']).toBe(true);
    expect(evidence['releaseImageId']).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(evidence['sourceTreeDigest']).toMatch(/^[0-9a-f]{64}$/);
  });
}
