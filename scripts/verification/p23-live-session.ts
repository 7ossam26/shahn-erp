// Read-only live probe; optional renewal of the explicitly identified isolated ERP test staff
// session. Never logs secrets, touches human driver sessions or alters business/source rows.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createPool } from '@shahn/database';
import { digest } from '../../apps/api/src/modules/access/crypto.js';
import { createSession } from '../../apps/api/src/modules/access/sessions.js';
const file = process.env['TAWSEL_P22_TRIAL_FILE'];
if (!file) throw Error('IDENTIFIED_TRIAL_REQUIRED');
const trial = JSON.parse(await readFile(file, 'utf8'));
const nativePath = resolve(dirname(file), trial.nativeDatabaseReference);
const native = JSON.parse(await readFile(nativePath, 'utf8'));
if (
  !trial.approvedTestEnvironment ||
  new URL(native.databaseUrl).hostname !== '127.0.0.1' ||
  !native.databaseName.includes('shahn-p03-test-')
)
  throw Error('OWNED_ISOLATED_TRIAL_REQUIRED');
const probe = async () => {
  const r = await fetch(`${trial.nativeOrigin}/api/v1/access/session`, {
    headers: { Cookie: 'erp_session=' + native.admin.token },
  });
  const body = await r.json();
  return { status: r.status, code: body.code ?? 'session-valid' };
};
const before = await probe();
let renewed = false;
if (before.status === 401 && process.argv.includes('--renew-isolated-staff')) {
  const pool = createPool(native.databaseUrl);
  try {
    const s = (
      await pool.query(
        `SELECT s.issuer,s.subject,s.mfa,s.authenticated_at,c.code,p.kind,s.revoked_at FROM access.server_session s JOIN access.principal p ON p.id=s.principal_id JOIN access.company c ON c.id=s.company_id WHERE s.token_hash=$1 AND s.company_id=$2`,
        [digest(native.admin.token), trial.companyId],
      )
    ).rows[0];
    if (!s || s.kind !== 'staff' || s.revoked_at) throw Error('ISOLATED_UNREVOKED_STAFF_REQUIRED');
    const session = await createSession(
      pool,
      native.identityConfig,
      {
        issuer: s.issuer,
        subject: s.subject,
        mfa: s.mfa,
        authenticatedAt: s.authenticated_at,
        tokens: {},
      },
      s.code,
      false,
    );
    native.admin = { ...native.admin, ...session };
    await writeFile(nativePath, JSON.stringify(native, null, 2), { mode: 0o600 });
    renewed = true;
  } finally {
    await pool.end();
  }
}
console.log(
  JSON.stringify({
    before,
    renewed,
    after: await probe(),
    scope: 'existing isolated ERP staff test session only',
  }),
);
