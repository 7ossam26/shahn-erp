import { createHash } from 'node:crypto';
import { readMigrations, migrationStatus } from '@shahn/database';
export async function releaseManifest(pool, { releaseId, configVersion, backupCheckpoint }) {
  const migrations = await readMigrations();
  const status = await migrationStatus(pool, migrations);
  if (status.state !== 'current') throw new Error('RELEASE_SCHEMA_NOT_CURRENT');
  return {
    schemaVersion: 1,
    releaseId,
    configVersion,
    backupCheckpoint,
    tawselBaseline: '32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada',
    migrations: migrations.map(({ version, checksum }) => ({ version, checksum })),
    migrationDigest: createHash('sha256')
      .update(JSON.stringify(migrations.map(({ version, checksum }) => ({ version, checksum }))))
      .digest('hex'),
  };
}
/** Fail closed: additive columns do not alone establish old binary compatibility. */
export function assertBinaryCompatibility(binary, applied, reviewedForwardCompatibleVersions = []) {
  if (!Array.isArray(binary.migrations) || !Array.isArray(applied.migrations))
    throw new Error('INVALID_RELEASE_MANIFEST');
  for (let i = 0; i < applied.migrations.length; i++) {
    const row = applied.migrations[i],
      expected = binary.migrations[i];
    if (!expected) {
      if (!reviewedForwardCompatibleVersions.includes(row.version))
        throw new Error('INCOMPATIBLE_BINARY_ROLLBACK');
    } else if (expected.version !== row.version || expected.checksum !== row.checksum)
      throw new Error('INCOMPATIBLE_BINARY_ROLLBACK');
  }
  if (binary.migrations.length > applied.migrations.length)
    throw new Error('BINARY_NEEDS_MIGRATION');
}
