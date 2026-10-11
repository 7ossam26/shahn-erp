import { it, expect, vi } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, mutationsEnabled } from '@shahn/database';
import {
  releaseManifest,
  assertBinaryCompatibility,
} from '../../../deploy/release-compatibility.mjs';
import { adoptedCommit } from '../../../scripts/verification/p27-reader-gate.mjs';

it('records the adopted contract in an actual current-schema release manifest and keeps restore mutations closed', async () => {
  const db = await isolatedPostgres();
  try {
    await migrate(db.pool);
    vi.stubEnv('OPERATIONS_MODE', 'restore');
    const manifest = await releaseManifest(db.pool, {
      releaseId: 'isolated-audit-release',
      configVersion: 'isolated-audit-config',
      backupCheckpoint: 'isolated-audit-checkpoint',
    });
    expect(manifest).toMatchObject({ tawselBaseline: adoptedCommit });
    expect(mutationsEnabled()).toBe(false);
    expect(() => assertBinaryCompatibility(manifest, manifest)).not.toThrow();
    expect(() =>
      assertBinaryCompatibility({ migrations: manifest.migrations.slice(0, -1) }, manifest),
    ).toThrow('INCOMPATIBLE_BINARY_ROLLBACK');
    expect(() =>
      assertBinaryCompatibility(manifest, { migrations: manifest.migrations.slice(0, -1) }),
    ).toThrow('BINARY_NEEDS_MIGRATION');
  } finally {
    vi.unstubAllEnvs();
    await db.dispose();
  }
});
