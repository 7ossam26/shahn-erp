import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { writeFile, unlink } from 'node:fs/promises';
import { randomUUID, randomBytes } from 'node:crypto';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { isolatedKeycloak, type TestIssuerUser } from '../../scripts/lib/keycloak.mjs';
import { accessFixture, fixtureConfig } from '../support/access.js';
const origin = 'http://127.0.0.1:5291',
  controlSecret = randomBytes(32).toString('hex');
const db = await isolatedPostgres();
await migrate(db.pool);
const issuer = await isolatedKeycloak(origin);
const config = {
  ...fixtureConfig(origin, issuer.issuer),
  clientSecret: issuer.clientSecret,
  adminClientSecret: issuer.adminClientSecret,
};
const fixture = await accessFixture(db.pool, config);
const users: Record<string, TestIssuerUser> = {};
for (const key of ['admin', 'staffA', 'staffB', 'staffAB', 'support'] as const) {
  const user = fixture[key];
  const username =
    key === 'support'
      ? 'support'
      : key === 'admin'
        ? 'trial.admin'
        : `trial.staff-${key === 'staffAB' ? 'ab' : key === 'staffA' ? 'a' : 'b'}`;
  users[key] = await issuer.createUser(username, { id: user.subject, companyId: fixture.company });
  // Keycloak Admin POST chooses its own subject UUID. Native correlation and issuer subject are distinct.
  await db.pool.query('DELETE FROM access.server_session WHERE principal_id=$1', [user.id]);
  await db.pool.query('UPDATE access.issuer_binding SET subject=$1 WHERE principal_id=$2', [
    users[key]!.id,
    user.id,
  ]);
}
const environment = {
  ...process.env,
  APP_ENV: 'test',
  DATABASE_URL: db.url,
  MIGRATION_DATABASE_URL: db.url,
  API_HOST: '127.0.0.1',
  API_PORT: '4291',
  APP_ORIGIN: origin,
  API_PROXY_TARGET: 'http://127.0.0.1:4291',
  OIDC_ISSUER: config.issuer,
  OIDC_CLIENT_ID: config.clientId,
  OIDC_CLIENT_SECRET: config.clientSecret,
  OIDC_ADMIN_CLIENT_ID: config.adminClientId,
  OIDC_ADMIN_CLIENT_SECRET: config.adminClientSecret,
  SESSION_ENCRYPTION_KEY: config.encryptionKey,
  VITE_ENABLE_DEMOS: 'false',
  VITE_FOUNDATION_PREVIEW: 'false',
};
const children = [
  spawn(process.execPath, ['apps/api/dist/main.js'], {
    env: environment,
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  }),
  spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--config',
      'apps/web/vite.config.ts',
      '--port',
      '5291',
      '--strictPort',
    ],
    { env: environment, stdio: 'inherit' },
  ),
];
await writeFile(
  'tests/.p02-runtime.json',
  JSON.stringify({
    issuer: issuer.issuer,
    users,
    company: fixture.company,
    a: fixture.a,
    b: fixture.b,
    adminRole: fixture.adminRole,
    staffRole: fixture.staffRole,
    controlSecret,
  }),
  { mode: 0o600 },
);
async function worker(crash = false) {
  return new Promise<number | null>((resolve, reject) => {
    const child = spawn(process.execPath, ['tests/p02/worker.mjs'], {
      env: { ...environment, P02_CRASH: String(crash) },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    child.on('error', reject);
    child.on('message', (message) => {
      if ((message as { event: string }).event === 'remote_created') child.kill('SIGKILL');
    });
    child.on('exit', (code) => resolve(code));
  });
}
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  control.close();
  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolve) => {
          if (child.exitCode !== null) {
            resolve();
            return;
          }
          child.once('exit', () => resolve());
          if (child.connected) child.send('shutdown');
          else child.kill('SIGTERM');
        }),
    ),
  );
  await issuer.dispose();
  await db.dispose();
  await unlink('tests/.p02-runtime.json').catch(() => {});
}
const control = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/health') {
    res.end('{}');
    return;
  }
  if (req.headers.authorization !== `Bearer ${controlSecret}`) {
    res.statusCode = 403;
    res.end('{}');
    return;
  }
  try {
    if (req.url === '/shutdown') {
      await stop();
      res.end('{}');
      return;
    }
    if (req.url === '/worker') {
      await worker();
      res.end('{}');
      return;
    }
    if (req.url === '/worker/crash') {
      await worker(true);
      res.end('{}');
      return;
    }
    if (req.url === '/leases/expire') {
      await db.pool.query(
        "UPDATE work_item SET lease_until=clock_timestamp()-interval '1 second',available_at=clock_timestamp() WHERE state IN ('leased','pending')",
      );
      res.end('{}');
      return;
    }
    if (req.url === '/support/expire') {
      await db.pool.query(
        "UPDATE access.support_session SET expires_at=clock_timestamp()-interval '1 second' WHERE ended_at IS NULL",
      );
      res.end('{}');
      return;
    }
    if (req.url === '/sessions/expire') {
      await db.pool.query(
        "UPDATE access.server_session SET idle_expires_at=clock_timestamp()-interval '1 second' WHERE principal_id=$1",
        [fixture.staffA.id],
      );
      res.end('{}');
      return;
    }
    if (req.url === '/sessions/expire-admin') {
      await db.pool.query(
        "UPDATE access.server_session SET idle_expires_at=clock_timestamp()-interval '1 second' WHERE principal_id=$1",
        [fixture.admin.id],
      );
      res.end('{}');
      return;
    }
    if (req.url === '/issuer/stop') {
      await issuer.stop();
      res.end('{}');
      return;
    }
    if (req.url === '/issuer/start') {
      await issuer.start();
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(issuer.issuer + '/.well-known/openid-configuration')).ok) break;
        } catch {}
        await new Promise((r) => setTimeout(r, 300));
      }
      res.end('{}');
      return;
    }
    if (req.url === '/proof') {
      const counts = (
        await db.pool.query(
          `SELECT u.id,u.username,u.identity_state AS state,b.subject,(SELECT count(*) FROM work_item w WHERE w.entity_id=u.id)::integer AS jobs FROM access.ordinary_user u LEFT JOIN access.issuer_binding b ON b.principal_id=u.id WHERE u.username IN ('lost-result','offline-user') ORDER BY u.username`,
        )
      ).rows;
      const remote = await issuer.admin<{ id: string; username: string }[]>('/p02/users?max=100');
      const audit = (
        await db.pool.query(
          "SELECT actor_label,principal_id,support_session_id,action FROM audit_entry WHERE actor_label='Technical Support'",
        )
      ).rows;
      res.end(
        JSON.stringify({
          users: counts,
          remote: remote
            .filter((u) => ['trial.lost-result', 'trial.offline-user'].includes(u.username))
            .map((u) => ({ id: u.id, username: u.username })),
          audit,
        }),
      );
      return;
    }
    if (req.url === '/oidc/nonce') {
      await db.pool.query('UPDATE access.login_attempt SET nonce=$1 WHERE consumed_at IS NULL', [
        randomUUID(),
      ]);
      res.end('{}');
      return;
    }
    res.statusCode = 404;
    res.end('{}');
  } catch {
    res.statusCode = 500;
    res.end('{"error":"test_control_failed"}');
  }
});
for (const url of [origin, 'http://127.0.0.1:4291/api/v1/readiness']) {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) {
    await stop();
    throw new Error('P02 services unavailable');
  }
}
control.listen(4292, '127.0.0.1');
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
for (const child of children)
  child.once('exit', () => {
    if (!stopping) void stop();
  });
