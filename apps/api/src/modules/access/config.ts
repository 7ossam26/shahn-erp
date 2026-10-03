export interface IdentityConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  origin: string;
  encryptionKey: string;
  adminClientId: string;
  adminClientSecret: string;
  environment: string;
}
export function identityConfig(env = process.env): IdentityConfig | null {
  if (!env['OIDC_ISSUER'] && env['APP_ENV'] !== 'production') return null;
  for (const key of [
    'OIDC_ISSUER',
    'OIDC_CLIENT_ID',
    'OIDC_CLIENT_SECRET',
    'APP_ORIGIN',
    'SESSION_ENCRYPTION_KEY',
    'OIDC_ADMIN_CLIENT_ID',
    'OIDC_ADMIN_CLIENT_SECRET',
  ])
    if (!env[key]) throw new Error(`Configuration: ${key} is required`);
  for (const key of ['OIDC_ISSUER', 'APP_ORIGIN']) {
    const url = new URL(env[key]!);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(
          env['APP_ENV'] !== 'production' &&
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        ))
    )
      throw new Error(`Configuration: ${key} requires HTTPS outside loopback development`);
  }
  if (!/^[a-f0-9]{64}$/.test(env['SESSION_ENCRYPTION_KEY']!))
    throw new Error('Configuration: SESSION_ENCRYPTION_KEY must be 32-byte hex');
  return {
    issuer: env['OIDC_ISSUER']!,
    clientId: env['OIDC_CLIENT_ID']!,
    clientSecret: env['OIDC_CLIENT_SECRET']!,
    origin: env['APP_ORIGIN']!,
    encryptionKey: env['SESSION_ENCRYPTION_KEY']!,
    adminClientId: env['OIDC_ADMIN_CLIENT_ID']!,
    adminClientSecret: env['OIDC_ADMIN_CLIENT_SECRET']!,
    environment: env['APP_ENV']!,
  };
}
