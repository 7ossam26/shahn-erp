import { randomUUID, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { createSession } from '../../apps/api/src/modules/access/sessions.js';
import { bootstrapSupport } from '../../apps/api/src/modules/access/bootstrap.js';
import type { IdentityConfig } from '../../apps/api/src/modules/access/config.js';
export const fixtureConfig = (
  origin = 'http://127.0.0.1:5291',
  issuer = 'http://127.0.0.1:18980/realms/p02',
): IdentityConfig => ({
  origin,
  issuer,
  clientId: 'erp',
  clientSecret: randomBytes(32).toString('hex'),
  adminClientId: 'erp-identity',
  adminClientSecret: randomBytes(32).toString('hex'),
  encryptionKey: randomBytes(32).toString('hex'),
  environment: 'test',
});
export async function accessFixture(pool: Pool, config = fixtureConfig()) {
  const company = randomUUID(),
    other = randomUUID(),
    a = randomUUID(),
    b = randomUUID(),
    foreign = randomUUID(),
    adminRole = randomUUID(),
    staffRole = randomUUID();
  await pool.query(
    "INSERT INTO access.company(id,code,name) VALUES($1,'trial','شركة التجربة'),($2,'other','شركة أخرى')",
    [company, other],
  );
  await pool.query(
    "INSERT INTO access.branch(id,company_id,name) VALUES($1,$4,'الفرع أ'),($2,$4,'الفرع ب'),($3,$5,'فرع الشركة الأخرى')",
    [a, b, foreign, company, other],
  );
  await pool.query(
    "INSERT INTO access.role(id,company_id,name) VALUES($1,$3,'مدير الشركة'),($2,$3,'فريق التشغيل')",
    [adminRole, staffRole, company],
  );
  await pool.query(`INSERT INTO access.role_grant SELECT $1,$2,id FROM access.screen_capability`, [
    company,
    adminRole,
  ]);
  for (const cap of [
    'access.roles',
    'inventory',
    'tracking',
    'intake',
    'goods.send',
    'goods.receive',
  ])
    await pool.query('INSERT INTO access.role_grant VALUES($1,$2,$3)', [company, staffRole, cap]);
  const make = async (
    username: string,
    branches: string[],
    role: string = staffRole,
    subject = randomUUID(),
  ) => {
    const id = randomUUID();
    await pool.query("INSERT INTO access.principal(id,kind) VALUES($1,'staff')", [id]);
    await pool.query(
      "INSERT INTO access.ordinary_user(id,company_id,role_id,username,name,correlation_id,identity_state) VALUES($1,$2,$3,$4,$4,$5,'ready')",
      [id, company, role, username, subject],
    );
    await pool.query('INSERT INTO access.issuer_binding VALUES($1,$2,$3)', [
      id,
      config.issuer,
      subject,
    ]);
    for (const branch of branches)
      await pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [company, id, branch]);
    const session = await createSession(
      pool,
      config,
      { issuer: config.issuer, subject, mfa: false, authenticatedAt: new Date(), tokens: {} },
      'trial',
      false,
    );
    return { id, subject, ...session };
  };
  const admin = await make('admin', [a, b], adminRole),
    staffA = await make('staff-a', [a]),
    staffB = await make('staff-b', [b]),
    staffAB = await make('staff-ab', [a, b]);
  const supportSubject = randomUUID(),
    supportId = await bootstrapSupport(pool, config.issuer, supportSubject);
  const support = {
    id: supportId,
    subject: supportSubject,
    ...(await createSession(
      pool,
      config,
      {
        issuer: config.issuer,
        subject: supportSubject,
        mfa: true,
        authenticatedAt: new Date(),
        tokens: {},
      },
      '',
      true,
    )),
  };
  return {
    company,
    other,
    a,
    b,
    foreign,
    adminRole,
    staffRole,
    admin,
    staffA,
    staffB,
    staffAB,
    support,
    config,
    make,
  };
}
