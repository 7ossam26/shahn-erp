import { createPool, archiveHealth } from '@shahn/database';
const pool = createPool(process.env['DATABASE_URL'], 1);
try {
  const { rows } = await pool.query(
    'SELECT last_archived_time,last_failed_time,failed_count FROM pg_stat_archiver',
  );
  const row = rows[0];
  console.log(
    JSON.stringify(
      archiveHealth(
        row
          ? {
              lastArchivedAt: row.last_archived_time?.toISOString() ?? null,
              lastFailureAt: row.last_failed_time?.toISOString() ?? null,
              failedCount: Number(row.failed_count),
              latestBackupStop: process.env['VERIFIED_BACKUP_STOP'] ?? null,
            }
          : null,
      ),
    ),
  );
} catch {
  console.log(JSON.stringify(archiveHealth(null)));
  process.exitCode = 1;
} finally {
  await pool.end();
}
