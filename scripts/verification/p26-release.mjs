import { readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createPool } from '@shahn/database';

if (
  process.platform !== 'linux' ||
  process.env.APP_ENV !== 'test' ||
  process.env.P26_APPROVED_ISOLATION !== 'true'
)
  throw Error('P26_APPROVED_ISOLATED_RELEASE_CHECK_REQUIRED');
const execute = promisify(execFile);
const docker = async (args) => (await execute('docker', args, { timeout: 90000 })).stdout.trim();
const project = 'shahn-p26-20261009';
const state = JSON.parse(readFileSync('/run/p26/pilot-state.json', 'utf8'));
const source = JSON.parse(readFileSync('/run/p26/source-manifest.json', 'utf8'));
const logins = JSON.parse(readFileSync('/run/p26/evidence/issuer-login.json', 'utf8'));
const image = await docker([
  'image',
  'inspect',
  'shahn-p26-runtime:20261009',
  '--format',
  '{{.Id}}',
]);
const evidence = {
  boundary:
    'Clean isolated release/issuer/roles/admission/drain proof; no load, upgrade or live restore claim',
  passed: false,
  releaseImageId: image,
  sourceTreeDigest: source.sourceTreeDigest,
  origin: state.origin,
  services: [],
};
let pool;
let apiStopped = false;
try {
  if (!logins.passed || logins.issuerLogins.length !== 4)
    throw Error('P26_REAL_ISSUER_LOGIN_REQUIRED');
  const containers = {};
  for (const service of ['db', 'api', 'worker', 'web', 'edge']) {
    const name = project + '-' + service + '-1';
    const spec = JSON.parse(await docker(['inspect', name]))[0];
    if (
      spec.Config.Labels['com.docker.compose.project'] !== project ||
      !spec.State.Running ||
      (spec.State.Health && spec.State.Health.Status !== 'healthy')
    )
      throw Error('P26_OWNED_RUNNING_SERVICE_REQUIRED');
    if (service !== 'db') {
      const uid = Number(
        await docker(['exec', name, 'node', '-e', 'console.log(process.getuid())']),
      );
      if (
        spec.Image !== image ||
        uid !== 1000 ||
        !spec.HostConfig.ReadonlyRootfs ||
        !spec.HostConfig.CapDrop.includes('ALL') ||
        !spec.HostConfig.SecurityOpt.includes('no-new-privileges:true')
      )
        throw Error('P26_NONROOT_IMMUTABLE_HARDENED_SERVICE_REQUIRED');
    } else if (Object.values(spec.NetworkSettings.Ports).some((ports) => ports?.length))
      throw Error('P26_DATABASE_PUBLIC_PORT_FORBIDDEN');
    containers[service] = spec;
    evidence.services.push({
      service,
      imageId: spec.Image,
      running: true,
      configuredHealth: spec.State.Health?.Status ?? 'none',
    });
  }
  const databaseUrl = new URL(readFileSync('/run/p26/runtime-dsn', 'utf8').trim());
  if (databaseUrl.hostname !== 'db' || databaseUrl.pathname !== '/shahn_erp')
    throw Error('P26_OWNED_DATABASE_REQUIRED');
  databaseUrl.hostname = containers.db.NetworkSettings.Networks[project + '_private'].IPAddress;
  pool = createPool(databaseUrl.href);
  evidence.roles = (
    await pool.query(
      "SELECT rolname,rolsuper,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname IN ('shahn_runtime','shahn_migration','shahn_backup') ORDER BY rolname",
    )
  ).rows;
  if (
    evidence.roles.length !== 3 ||
    evidence.roles.some((r) => r.rolsuper || r.rolcreaterole || r.rolcreatedb)
  )
    throw Error('P26_SEPARATE_LEAST_PRIVILEGE_ROLES_REQUIRED');
  for (const sql of [
    'CREATE TABLE public.p26_forbidden(id int)',
    'DELETE FROM erp_infrastructure.migrations',
  ]) {
    let denied = false;
    try {
      await pool.query(sql);
    } catch (error) {
      denied = error.code === '42501';
    }
    if (!denied) throw Error('P26_RUNTIME_PRIVILEGE_BOUNDARY_FAILED');
  }
  evidence.runtimeDdlAndMigrationWritesDenied = true;
  const ready = await fetch(state.origin + '/api/v1/readiness');
  if (!ready.ok) throw Error('P26_READINESS_FAILED');
  evidence.readiness = await ready.json();
  const web = await fetch(state.origin);
  const html = await web.text();
  const asset = html.match(/src="([^" ]+\.js)"/);
  if (
    !web.ok ||
    web.headers.get('x-content-type-options') !== 'nosniff' ||
    web.headers.get('cache-control') !== 'no-store' ||
    !asset
  )
    throw Error('P26_STATIC_RELEASE_FAILED');
  const assetResponse = await fetch(new URL(asset[1], state.origin));
  if (!assetResponse.ok || !assetResponse.headers.get('cache-control')?.includes('immutable'))
    throw Error('P26_IMMUTABLE_ASSET_FAILED');
  evidence.staticWebAndAsset = true;
  const started = Date.now();
  await docker(['stop', '--time', '45', project + '-api-1']);
  apiStopped = true;
  const stopped = JSON.parse(await docker(['inspect', project + '-api-1']))[0];
  const closeLogged = (
    await docker(['logs', '--since', new Date(started).toISOString(), project + '-api-1'])
  ).includes('"event":"api_stopped"');
  evidence.apiShutdown = {
    exitCode: stopped.State.ExitCode,
    elapsedMs: Date.now() - started,
    closeLogged,
  };
  // Nest closes its HTTP server/database, then re-raises SIGTERM (143 on Linux).
  // Require its actual close hook and a bounded stop; a forced SIGKILL (137) fails.
  if (
    ![0, 143].includes(stopped.State.ExitCode) ||
    !closeLogged ||
    evidence.apiShutdown.elapsedMs >= 45000
  )
    throw Error('P26_API_GRACEFUL_STOP_FAILED');
  await docker(['start', project + '-api-1']);
  apiStopped = false;
  let restored = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(state.origin + '/api/v1/readiness')).ok) {
        restored = true;
        break;
      }
    } catch {
      /* bounded startup */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!restored) throw Error('P26_READINESS_AFTER_RESTART_FAILED');
  const browser = JSON.parse(readFileSync('/run/p26/erp-admin-browser.json', 'utf8'));
  const cookies = browser.cookies
    .filter((c) => c.name === 'erp_session')
    .map((c) => c.name + '=' + c.value)
    .join('; ');
  const session = await fetch(state.origin + '/api/v1/access/session', {
    headers: { Cookie: cookies },
  });
  if (!session.ok || (await session.json()).companyId !== state.companyId)
    throw Error('P26_DURABLE_SESSION_AFTER_RESTART_FAILED');
  evidence.durableIssuerSessionAfterApiRestart = true;
  evidence.passed = true;
} catch (error) {
  evidence.failure =
    error instanceof Error && /^P26_[A-Z_]+$/.test(error.message)
      ? error.message
      : 'P26_RELEASE_OPERATION_FAILED';
  process.exitCode = 1;
} finally {
  if (apiStopped) await docker(['start', project + '-api-1']);
  await pool?.end();
  writeFileSync('/run/p26/evidence/release-acceptance.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}
