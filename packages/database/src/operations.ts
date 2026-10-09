/** Process-local deployment controls. Reopening traffic requires a reviewed redeploy. */
export type OperationsMode = 'normal' | 'restore' | 'read-only';
export function operationsMode(env = process.env): OperationsMode {
  const mode = env['OPERATIONS_MODE'] ?? 'normal';
  if (!['normal', 'restore', 'read-only'].includes(mode))
    throw new Error('Configuration: OPERATIONS_MODE is invalid');
  return mode as OperationsMode;
}
export function mutationsEnabled(env = process.env): boolean {
  return operationsMode(env) === 'normal';
}
export interface DeploymentConfiguration {
  releaseId: string;
  configVersion: string;
  companyId: string;
  poolMax: number;
  mode: OperationsMode;
}
/** Called by API/worker before admission. Development fixtures remain explicitly separate. */
export function deploymentConfiguration(env = process.env): DeploymentConfiguration | null {
  const mode = operationsMode(env);
  if (env['DEPLOYMENT_MANAGED'] !== 'true') return null;
  const required = [
    'RELEASE_ID',
    'CONFIG_VERSION',
    'APP_COMPANY_ID',
    'APP_ORIGIN',
    'DATABASE_URL',
    'DATABASE_POOL_MAX',
    'OIDC_ISSUER',
    'OIDC_CLIENT_ID',
    'OIDC_AUDIENCE',
    'OIDC_REDIRECT_URI',
    'OIDC_CLIENT_SECRET',
    'SESSION_ENCRYPTION_KEY',
    'OIDC_ADMIN_CLIENT_ID',
    'OIDC_ADMIN_CLIENT_SECRET',
    'TAWSEL_CONFIG_FILE',
    'BACKUP_REPOSITORY_REFERENCE',
    'BACKUP_KEY_REFERENCE',
  ];
  for (const key of required)
    if (!env[key] || env[key]!.includes('REPLACE_'))
      throw new Error(`Configuration: ${key} is required`);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      env['APP_COMPANY_ID']!,
    )
  )
    throw new Error('Configuration: APP_COMPANY_ID must be a UUID');
  for (const key of ['RELEASE_ID', 'CONFIG_VERSION'])
    if (!/^[a-zA-Z0-9._-]{1,128}$/.test(env[key]!))
      throw new Error(`Configuration: ${key} is invalid`);
  const origin = new URL(env['APP_ORIGIN']!),
    issuer = new URL(env['OIDC_ISSUER']!);
  if (
    origin.protocol !== 'https:' ||
    origin.origin !== env['APP_ORIGIN'] ||
    origin.username ||
    origin.password ||
    issuer.protocol !== 'https:' ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash
  )
    throw new Error('Configuration: deployment origins/issuer require canonical HTTPS URLs');
  if (
    env['OIDC_AUDIENCE'] !== env['OIDC_CLIENT_ID'] ||
    env['OIDC_REDIRECT_URI'] !== origin.origin + '/api/v1/access/callback'
  )
    throw new Error('Configuration: issuer client/audience/redirect are inconsistent');
  const max = env['DATABASE_POOL_MAX']!;
  if (!/^[1-9][0-9]?$/.test(max) || Number(max) > 32)
    throw new Error('Configuration: DATABASE_POOL_MAX must be 1..32');
  const db = new URL(env['DATABASE_URL']!);
  if (db.username === 'postgres' || !db.username || !db.password)
    throw new Error('Configuration: runtime requires a dedicated credential');
  if (env['MIGRATION_DATABASE_URL']) {
    const migration = new URL(env['MIGRATION_DATABASE_URL']);
    if (
      migration.username === db.username ||
      migration.host !== db.host ||
      migration.pathname !== db.pathname
    )
      throw new Error(
        'Configuration: migration/runtime must use separate roles on the same ERP database',
      );
  }
  return {
    releaseId: env['RELEASE_ID']!,
    configVersion: env['CONFIG_VERSION']!,
    companyId: env['APP_COMPANY_ID']!,
    poolMax: Number(max),
    mode,
  };
}
/** Allowlist routine logs: never traverse arbitrary request/error objects. */
export function operationalLog(event: string, values: Record<string, unknown> = {}): string {
  const allowed = [
    'correlationId',
    'commandId',
    'actionId',
    'eventId',
    'releaseId',
    'configVersion',
    'state',
    'durationMs',
    'attempt',
  ];
  return JSON.stringify({
    event: /^[a-z0-9_]{1,64}$/.test(event) ? event : 'operational_event',
    ...Object.fromEntries(
      allowed
        .filter((k) => Object.hasOwn(values, k))
        .flatMap<[string, string | number]>((k) => {
          const v = values[k];
          return typeof v === 'number' && Number.isFinite(v)
            ? [[k, v]]
            : typeof v === 'string' && /^[a-zA-Z0-9._:-]{1,128}$/.test(v)
              ? [[k, v]]
              : [];
        }),
    ),
  });
}
export interface ArchiveObservation {
  lastArchivedAt: string | null;
  failedCount: number;
  lastFailureAt: string | null;
  latestBackupStop: string | null;
}
/** A stopped database or failed poll never manufactures a last recoverable time. */
export function archiveHealth(value: ArchiveObservation | null, now = Date.now()) {
  const archived = value?.lastArchivedAt ? Date.parse(value.lastArchivedAt) : NaN;
  const failed = value?.lastFailureAt ? Date.parse(value.lastFailureAt) : NaN;
  const healthy =
    Number.isFinite(archived) &&
    archived <= now &&
    now - archived <= 300000 &&
    !(Number.isFinite(failed) && failed >= archived);
  return {
    state: healthy ? 'within-target' : 'review-required',
    targetSeconds: 300,
    lastArchivedAt: value?.lastArchivedAt ?? null,
    latestBackupStop: value?.latestBackupStop ?? null,
    lastRecoverableTime: null,
    explanation:
      'Archive time is an observation, not a proven recoverable transaction. Verify the backup and complete WAL chain.',
    runbook: 'deploy/runbooks/backup-restore.md',
  };
}
