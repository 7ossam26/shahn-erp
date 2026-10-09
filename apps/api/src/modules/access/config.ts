export interface IdentityConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  origin: string;
  encryptionKey: string;
  adminClientId: string;
  adminClientSecret: string;
  adminOrigin?: string;
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
  const adminOrigin = env['OIDC_ADMIN_ORIGIN'];
  if (adminOrigin) {
    const url = new URL(adminOrigin);
    // An explicit private administration origin does not change the public issuer identity.
    const privateHost = /^[a-zA-Z0-9-]+$/.test(url.hostname);
    if (
      url.origin !== adminOrigin ||
      url.username ||
      url.password ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && privateHost))
    )
      throw new Error('Configuration: OIDC_ADMIN_ORIGIN requires HTTPS or a private DNS origin');
  }
  return {
    issuer: env['OIDC_ISSUER']!,
    clientId: env['OIDC_CLIENT_ID']!,
    clientSecret: env['OIDC_CLIENT_SECRET']!,
    origin: env['APP_ORIGIN']!,
    encryptionKey: env['SESSION_ENCRYPTION_KEY']!,
    adminClientId: env['OIDC_ADMIN_CLIENT_ID']!,
    adminClientSecret: env['OIDC_ADMIN_CLIENT_SECRET']!,
    ...(adminOrigin ? { adminOrigin } : {}),
    environment: env['APP_ENV']!,
  };
}

export function identityAdminBase(config: IdentityConfig): string {
  const issuer = new URL(config.issuer);
  return config.adminOrigin
    ? config.adminOrigin + issuer.pathname.replace('/realms/', '/admin/realms/')
    : config.issuer.replace('/realms/', '/admin/realms/');
}
