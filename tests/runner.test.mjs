import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('unregistered phase P99 fails before any suite starts', () => {
  const result = spawnSync(process.execPath, ['scripts/test-phase.mjs', 'P99'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unregistered phase: P99/);
});
