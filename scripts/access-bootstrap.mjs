import { createPool, databaseConfig, loadEnvironment, migrationStatus } from '@shahn/database';
import { bootstrapSupport, identityConfig } from '@shahn/api/access';
loadEnvironment();
const config = identityConfig(),
  subject = process.env.BOOTSTRAP_SUPPORT_SUBJECT;
if (!config || !subject)
  throw new Error(
    'Configuration: verified OIDC configuration and BOOTSTRAP_SUPPORT_SUBJECT are required',
  );
const tokenResponse = await fetch(config.issuer + '/protocol/openid-connect/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.adminClientId,
    client_secret: config.adminClientSecret,
  }),
  signal: AbortSignal.timeout(8000),
});
if (!tokenResponse.ok) throw new Error('Operator bootstrap: issuer administration unavailable');
const token = (await tokenResponse.json()).access_token;
const admin = config.issuer.replace('/realms/', '/admin/realms/');
const options = {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(8000),
};
const userResponse = await fetch(admin + '/users/' + encodeURIComponent(subject), options),
  credentialResponse = await fetch(
    admin + '/users/' + encodeURIComponent(subject) + '/credentials',
    options,
  );
if (!userResponse.ok || !credentialResponse.ok)
  throw new Error('Operator bootstrap: subject not verified');
const user = await userResponse.json(),
  credentials = await credentialResponse.json();
if (
  !user.enabled ||
  !credentials.some((c) => ['otp', 'webauthn', 'webauthn-passwordless'].includes(c.type))
)
  throw new Error('Operator bootstrap: enabled subject with enrolled MFA required');
const pool = createPool(databaseConfig().migrationUrl);
try {
  if ((await migrationStatus(pool)).state !== 'current')
    throw new Error('Operator bootstrap: migrate first');
  await bootstrapSupport(pool, config.issuer, subject);
  console.log('Support bootstrap completed durably. There is no setup HTTP endpoint.');
} finally {
  await pool.end();
}
