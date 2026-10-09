import { readFileSync } from 'node:fs';
import { createPool } from '@shahn/database';

if (process.env.APP_ENV !== 'test' || process.env.P26_APPROVED_ISOLATION !== 'true')
  throw Error('P26_APPROVED_ISOLATED_SEED_REQUIRED');
const state = JSON.parse(readFileSync('/run/p26/pilot-state.json', 'utf8'));
const dsn = readFileSync('/run/secrets/runtime_dsn', 'utf8').trim();
const url = new URL(dsn);
if (url.hostname !== 'db' || url.pathname !== '/shahn_erp' || url.username !== 'shahn_runtime')
  throw Error('P26_OWNED_NATIVE_DATABASE_REQUIRED');
const pool = createPool(dsn);
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const prior = await client.query('SELECT code FROM access.company WHERE id=$1', [
    state.companyId,
  ]);
  if (prior.rowCount) throw Error('P26_SEED_ALREADY_EXISTS_PRESERVE_FOR_REVIEW');
  await client.query('INSERT INTO access.company(id,code,name) VALUES($1,$2,$3)', [
    state.companyId,
    state.companyCode.toLowerCase(),
    'شركة تجربة المرحلة 26 — بيانات اختبار معزولة',
  ]);
  for (const [name, id] of Object.entries(state.branches))
    await client.query('INSERT INTO access.branch(id,company_id,name) VALUES($1,$2,$3)', [
      id,
      state.companyId,
      'P26 الفرع ' + name,
    ]);
  for (const [name, id] of Object.entries(state.roles))
    await client.query('INSERT INTO access.role(id,company_id,name) VALUES($1,$2,$3)', [
      id,
      state.companyId,
      'P26 ' + name,
    ]);
  await client.query(
    'INSERT INTO access.role_grant SELECT $1,$2,id FROM access.screen_capability',
    [state.companyId, state.roles.admin],
  );
  for (const capability of ['inventory', 'tracking', 'intake', 'goods.send', 'goods.receive'])
    await client.query('INSERT INTO access.role_grant VALUES($1,$2,$3)', [
      state.companyId,
      state.roles.operations,
      capability,
    ]);
  for (const user of state.users.filter((u) => u.role !== 'support')) {
    await client.query("INSERT INTO access.principal(id,kind) VALUES($1,'staff')", [
      user.principalId,
    ]);
    await client.query(
      "INSERT INTO access.ordinary_user(id,company_id,role_id,username,name,correlation_id,identity_state) VALUES($1,$2,$3,$4,$5,$6,'ready')",
      [
        user.principalId,
        state.companyId,
        user.role === 'admin' ? state.roles.admin : state.roles.operations,
        user.role,
        'P26 ' + user.role,
        user.correlationId,
      ],
    );
    await client.query('INSERT INTO access.issuer_binding VALUES($1,$2,$3)', [
      user.principalId,
      'https://auth.switch2tech.cloud/realms/tawsel-company',
      user.subject,
    ]);
    const branches =
      user.role === 'admin' || user.role === 'staff-ab'
        ? Object.values(state.branches)
        : [state.branches[user.role.endsWith('-b') ? 'B' : 'A']];
    for (const branch of branches)
      await client.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [
        state.companyId,
        user.principalId,
        branch,
      ]);
  }
  // No synthetic login session, stock, employee obligation, opening balance or money is inserted.
  // Support admission awaits actual issuer MFA enrollment and its documented bootstrap.
  await client.query('COMMIT');
  console.log(
    JSON.stringify({
      fixtureVersion: 'P26-access-v1',
      companyId: state.companyId,
      companyCode: state.companyCode.toLowerCase(),
      branches: state.branches,
      ordinaryPrincipals: state.users.filter((u) => u.role !== 'support').length,
      generatedSessions: 0,
      businessEffects: 0,
      supportMfa: 'enrollment and bootstrap pending',
    }),
  );
} catch (error) {
  await client.query('ROLLBACK');
  console.error(
    error instanceof Error && /^P26_[A-Z_]+$/.test(error.message)
      ? error.message
      : 'P26_ACCESS_SEED_FAILED',
  );
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
