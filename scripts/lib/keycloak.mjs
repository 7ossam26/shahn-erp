import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
const exec = promisify(execFile);
export const keycloakImage =
  'quay.io/keycloak/keycloak:26.8.0@sha256:b0f60d489d51c5d113390bdf5461d4c06e6051be026c05549f2e1e10ec352bcc';
export const randomSecret = () => randomBytes(32).toString('hex');
export async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}
async function docker(args) {
  try {
    return (await exec('docker', args, { timeout: 90000, maxBuffer: 1048576 })).stdout.trim();
  } catch {
    throw new Error('P02 isolated Keycloak container operation failed');
  }
}
export function totp(secret, now = Date.now()) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((v) => parseInt(v, 2))),
    counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const hash = createHmac('sha1', key).update(counter).digest(),
    offset = hash[19] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}
export function otpSecret() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  return [...randomBytes(32)].map((v) => alphabet[v % 32]).join('');
}
export async function isolatedKeycloak(
  origin,
  { name = `shahn-p02-issuer-${randomUUID()}`, port, realm = 'p02', persistent = false } = {},
) {
  port ??= await freePort();
  const base = `http://127.0.0.1:${port}`,
    password = randomSecret(),
    clientSecret = randomSecret(),
    adminSecret = randomSecret();
  await docker([
    'run',
    '-d',
    '--name',
    name,
    '--label',
    'shahn.phase=P02-identity',
    '-p',
    `127.0.0.1:${port}:8080`,
    '-e',
    'KC_BOOTSTRAP_ADMIN_USERNAME=p02-operator',
    '-e',
    `KC_BOOTSTRAP_ADMIN_PASSWORD=${password}`,
    ...(persistent ? ['-v', `${name}-data:/opt/keycloak/data`] : []),
    keycloakImage,
    'start-dev',
    '--http-enabled=true',
  ]);
  let token;
  try {
    for (let i = 0; i < 150; i++) {
      try {
        const r = await fetch(base + '/realms/master/protocol/openid-connect/token', {
          method: 'POST',
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: 'admin-cli',
            username: 'p02-operator',
            password,
          }),
          signal: AbortSignal.timeout(1500),
        });
        if (r.ok) {
          token = (await r.json()).access_token;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!token) throw new Error('P02 Keycloak startup timeout');
    const admin = async (path, method = 'GET', body) => {
      // Operator token is local to this isolated setup harness and refreshed without logging it.
      const auth = await fetch(base + '/realms/master/protocol/openid-connect/token', {
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: 'p02-operator',
          password,
        }),
      });
      if (!auth.ok) throw new Error('P02 issuer operator unavailable');
      token = (await auth.json()).access_token;
      const r = await fetch(base + '/admin/realms' + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!r.ok) throw new Error(`P02 issuer setup failed: ${method} ${path} (${r.status})`);
      return r.status === 204 || r.status === 201 ? null : r.json();
    };
    await admin('', 'POST', {
      realm,
      enabled: true,
      sslRequired: 'none',
      registrationAllowed: false,
      resetPasswordAllowed: false,
      loginWithEmailAllowed: false,
      duplicateEmailsAllowed: false,
      bruteForceProtected: true,
      browserFlow: 'erp-mfa',
      otpPolicyType: 'totp',
      otpPolicyAlgorithm: 'HmacSHA1',
      otpPolicyDigits: 6,
      otpPolicyPeriod: 30,
      authenticationFlows: [
        {
          alias: 'erp-mfa',
          providerId: 'basic-flow',
          topLevel: true,
          builtIn: false,
          authenticationExecutions: [
            {
              authenticator: 'auth-username-password-form',
              requirement: 'REQUIRED',
              priority: 10,
              userSetupAllowed: false,
            },
            {
              authenticator: 'auth-otp-form',
              requirement: 'REQUIRED',
              priority: 20,
              userSetupAllowed: false,
            },
          ],
        },
      ],
      clients: [
        {
          clientId: 'erp',
          name: 'Shahn ERP development',
          enabled: true,
          protocol: 'openid-connect',
          publicClient: false,
          secret: clientSecret,
          standardFlowEnabled: true,
          directAccessGrantsEnabled: false,
          serviceAccountsEnabled: false,
          redirectUris: [origin + '/api/v1/access/callback'],
          webOrigins: [origin],
          attributes: {
            'pkce.code.challenge.method': 'S256',
            'post.logout.redirect.uris': origin + '/login',
          },
          protocolMappers: [
            {
              name: 'required-mfa-assurance',
              protocol: 'openid-connect',
              protocolMapper: 'oidc-hardcoded-claim-mapper',
              config: {
                'claim.name': 'amr',
                'claim.value': '["pwd","otp"]',
                'jsonType.label': 'JSON',
                'id.token.claim': 'true',
                'access.token.claim': 'false',
              },
            },
          ],
        },
        {
          clientId: 'erp-identity',
          enabled: true,
          protocol: 'openid-connect',
          publicClient: false,
          secret: adminSecret,
          standardFlowEnabled: false,
          directAccessGrantsEnabled: false,
          serviceAccountsEnabled: true,
        },
      ],
    });
    const clients = await admin('/' + realm + '/clients');
    const management = clients.find((c) => c.clientId === 'realm-management'),
      service = clients.find((c) => c.clientId === 'erp-identity');
    const serviceUser = await admin(`/${realm}/clients/${service.id}/service-account-user`);
    const roles = await admin(`/${realm}/clients/${management.id}/roles`);
    await admin(
      `/${realm}/users/${serviceUser.id}/role-mappings/clients/${management.id}`,
      'POST',
      roles.filter((r) => ['manage-users', 'view-users', 'query-users'].includes(r.name)),
    );
    // Correlation attributes are admin-only; the account console cannot rewrite native bindings.
    const profile = await admin(`/${realm}/users/profile`);
    profile.attributes.push(
      ...['erpCorrelationId', 'erpCompanyId'].map((name) => ({
        name,
        displayName: name,
        permissions: { view: ['admin'], edit: ['admin'] },
        multivalued: false,
      })),
    );
    await admin(`/${realm}/users/profile`, 'PUT', profile);
    const createUser = async (
      username,
      { id = randomUUID(), correlationId = id, companyId = randomUUID(), mfa = true } = {},
    ) => {
      const userPassword = randomSecret(),
        otp = otpSecret();
      await admin(`/${realm}/users`, 'POST', {
        id,
        username,
        enabled: true,
        email: `${id}@example.invalid`,
        emailVerified: true,
        firstName: username,
        lastName: 'Trial',
        attributes: { erpCorrelationId: [correlationId], erpCompanyId: [companyId] },
        credentials: [
          { type: 'password', value: userPassword, temporary: false },
          ...(mfa
            ? [
                {
                  type: 'otp',
                  secretData: JSON.stringify({ value: otp }),
                  credentialData: JSON.stringify({
                    subType: 'totp',
                    digits: 6,
                    counter: 0,
                    period: 30,
                    algorithm: 'HmacSHA1',
                    secretEncoding: 'BASE32',
                  }),
                },
              ]
            : []),
        ],
      });
      const created = await admin(
        `/${realm}/users?username=${encodeURIComponent(username)}&exact=true`,
      );
      if (created.length !== 1) throw new Error('Isolated issuer user identity not unique');
      return { id: created[0].id, username, password: userPassword, otp };
    };
    return {
      name,
      base,
      issuer: base + '/realms/' + realm,
      clientId: 'erp',
      clientSecret,
      adminClientId: 'erp-identity',
      adminClientSecret: adminSecret,
      createUser,
      admin,
      realm,
      operator: { username: 'p02-operator', password },
      stop: () => docker(['stop', '-t', '1', name]),
      start: () => docker(['start', name]),
      dispose: () => docker(['rm', '-f', '-v', name]),
    };
  } catch (error) {
    await docker(['rm', '-f', '-v', name]);
    throw error;
  }
}
