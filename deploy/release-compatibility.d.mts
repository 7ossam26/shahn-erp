import type { Pool } from 'pg';
export interface ReleaseManifest {
  migrations: { version: string; checksum: string }[];
}
export function assertBinaryCompatibility(
  binary: ReleaseManifest,
  applied: ReleaseManifest,
  reviewedForwardCompatibleVersions?: string[],
): void;
export function releaseManifest(
  pool: Pool,
  configuration: { releaseId: string; configVersion: string; backupCheckpoint: string },
): Promise<ReleaseManifest>;
