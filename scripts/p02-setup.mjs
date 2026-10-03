import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createPool, migrate } from '@shahn/database';
import {
  AccessRepository,
  IdentityWorker,
  KeycloakIdentityAdapter,
  bootstrapSupport,
  createSession,
} from '@shahn/api/access';
import { isolatedKeycloak, randomSecret } from './lib/keycloak.mjs';
const exec = promisify(execFile),
  path = '.env.p02.local';
if (process.env.APP_ENV === 'production') throw new Error('P02 setup refuses production');
if (existsSync(path)) {
  console.log(
    'P02 local configuration already exists; preserved. Use npm run p02:up then npm run dev:p02.',
  );
  process.exit(0);
}
const dbName = 'shahn-p02-dev-db',
  issuerName = 'shahn-p02-dev-issuer',
  password = randomSecret(),
  origin = 'http://127.0.0.1:5293';
const existing = (
  await exec('docker', ['ps', '-a', '--filter', `name=^/${dbName}$`, '--format', '{{.Names}}'])
).stdout.trim();
if (existing)
  throw new Error(
    'P02 owned-name container already exists without configuration; operator recovery required, nothing overwritten',
  );
const image = (await readFile('deploy/postgres-image.txt', 'utf8')).trim();
await exec('docker', [
  'run',
  '-d',
  '--name',
  dbName,
  '--label',
  'shahn.phase=P02-development',
  '-p',
  '127.0.0.1:15419:5432',
  '-v',
  'shahn-p02-dev-db-data:/var/lib/postgresql',
  '-e',
  'POSTGRES_DB=shahn_p02_dev',
  '-e',
  'POSTGRES_USER=shahn_p02_dev',
  '-e',
  `POSTGRES_PASSWORD=${password}`,
  image,
]);
const url = `postgresql://shahn_p02_dev:${password}@127.0.0.1:15419/shahn_p02_dev`,
  pool = createPool(url);
// Save connection recovery before issuer setup; a partial attempt never destroys its database.
await mkdir('.tools/p02', { recursive: true });
await writeFile('.tools/p02/setup-recovery.json', JSON.stringify({ dbName, url, issuerName }), {
  mode: 0o600,
});
let issuer;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      await pool.query('SELECT 1');
      ready = true;
      break;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!ready) throw new Error('P02 PostgreSQL unavailable');
  await migrate(pool);
  issuer = await isolatedKeycloak(origin, { name: issuerName, port: 18981, persistent: true });
  const config = {
    issuer: issuer.issuer,
    clientId: issuer.clientId,
    clientSecret: issuer.clientSecret,
    adminClientId: issuer.adminClientId,
    adminClientSecret: issuer.adminClientSecret,
    encryptionKey: randomSecret(),
    environment: 'development',
    origin,
  };
  const support = await issuer.createUser('support');
  await bootstrapSupport(pool, config.issuer, support.id);
  const session = await createSession(
    pool,
    config,
    {
      issuer: config.issuer,
      subject: support.id,
      mfa: true,
      authenticatedAt: new Date(),
      tokens: {},
    },
    '',
    true,
  );
  const repository = new AccessRepository(pool),
    worker = new IdentityWorker(pool, new KeycloakIdentityAdapter(config)),
    companyId = randomUUID();
  const command = (body) =>
    repository.command(session.token, {
      schemaVersion: 1,
      commandId: randomUUID(),
      companyId,
      ...body,
    });
  await command({
    type: 'company.create',
    name: 'شركة تجربة الوصول',
    code: 'trial',
    reason: 'إعداد تطوير معزول بطلب المالك لتجربة P02',
  });
  const a = await command({ type: 'branch.create', name: 'الفرع أ' }),
    b = await command({ type: 'branch.create', name: 'الفرع ب' });
  const adminRole = await command({
      type: 'role.create',
      name: 'إدارة الشركة',
      active: true,
      grants: ['access.users', 'access.roles', 'tracking', 'inventory'],
    }),
    staffRole = await command({
      type: 'role.create',
      name: 'فريق التشغيل',
      active: true,
      grants: ['access.roles', 'intake', 'inventory', 'tracking', 'goods.send', 'goods.receive'],
    });
  const users = { support };
  for (const [username, branches, role] of [
    ['admin', [a.entityId, b.entityId], adminRole.entityId],
    ['staff-a', [a.entityId], staffRole.entityId],
    ['staff-b', [b.entityId], staffRole.entityId],
    ['staff-ab', [a.entityId, b.entityId], staffRole.entityId],
  ]) {
    const result = await command({
      type: 'user.create',
      username,
      name: username === 'admin' ? 'مسؤول الشركة' : username,
      roleId: role,
      branchIds: branches,
      exceptions: {},
      active: true,
    });
    const correlation = (
      await pool.query('SELECT correlation_id FROM access.ordinary_user WHERE id=$1', [
        result.entityId,
      ])
    ).rows[0].correlation_id;
    // Isolated operator enrollment only: secrets never pass through an ERP or Tawsel endpoint.
    users[username] = await issuer.createUser('trial.' + username, {
      correlationId: correlation,
      companyId,
    });
    await worker.runOne();
  }
  const readiness = await pool.query(
    "SELECT count(*)::int AS ready FROM access.ordinary_user WHERE company_id=$1 AND identity_state='ready'",
    [companyId],
  );
  if (readiness.rows[0].ready !== 4)
    throw new Error('Initial identity work requires operator reconciliation');
  await pool.query('UPDATE access.server_session SET revoked_at=clock_timestamp()');
  await pool.query(
    'UPDATE access.support_session SET ended_at=clock_timestamp() WHERE ended_at IS NULL',
  );
  const env = {
    APP_ENV: 'development',
    APP_ORIGIN: origin,
    API_HOST: '127.0.0.1',
    API_PORT: '4293',
    WEB_PORT: '5293',
    API_PROXY_TARGET: 'http://127.0.0.1:4293',
    DATABASE_URL: url,
    MIGRATION_DATABASE_URL: url,
    OIDC_ISSUER: config.issuer,
    OIDC_CLIENT_ID: config.clientId,
    OIDC_CLIENT_SECRET: config.clientSecret,
    OIDC_ADMIN_CLIENT_ID: config.adminClientId,
    OIDC_ADMIN_CLIENT_SECRET: config.adminClientSecret,
    SESSION_ENCRYPTION_KEY: config.encryptionKey,
    VITE_ENABLE_DEMOS: 'false',
    VITE_FOUNDATION_PREVIEW: 'false',
  };
  await writeFile(
    path,
    Object.entries(env)
      .map(([k, v]) => k + '=' + v)
      .join('\n') + '\n',
    { mode: 0o600 },
  );
  await writeFile(
    '.tools/p02/owner-credentials.json',
    JSON.stringify(
      { companyCode: 'trial', users, issuerOperator: issuer.operator, issuer: issuer.issuer },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    'P02 development setup ready: http://127.0.0.1:5293. Private trial credentials are in ignored .tools/p02/owner-credentials.json. No credentials printed.',
  );
} catch {
  throw new Error(
    'P02 setup interrupted. Preserve the isolated containers and ignored .tools/p02/setup-recovery.json; no automatic destructive reset was performed.',
  );
} finally {
  await pool.end();
}
