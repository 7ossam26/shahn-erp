import * as oidc from 'openid-client';
import type { Pool } from 'pg';
import { AccessError } from '@shahn/domain';
import type { LoginInput } from '@shahn/contracts';
import type { IdentityConfig } from './config.js';
import { secret, digest, encrypt, decrypt } from './crypto.js';
import { createSession } from './sessions.js';
export class OidcSessionAdapter {
  private discovered: Promise<oidc.Configuration> | undefined;
  constructor(
    private readonly pool: Pool,
    readonly config: IdentityConfig,
  ) {}
  async configuration() {
    this.discovered ??= oidc
      .discovery(
        new URL(this.config.issuer),
        this.config.clientId,
        this.config.clientSecret,
        undefined,
        {
          timeout: 10,
          execute: this.config.issuer.startsWith('http:')
            ? [oidc.allowInsecureRequests, oidc.enableNonRepudiationChecks]
            : [oidc.enableNonRepudiationChecks],
        },
      )
      .catch(() => {
        this.discovered = undefined;
        throw new AccessError('IDENTITY_UNAVAILABLE', 503);
      });
    const config = await this.discovered;
    if (config.serverMetadata().issuer !== this.config.issuer)
      throw new AccessError('LOGIN_FAILED', 401);
    return config;
  }
  async begin(input: LoginInput) {
    const config = await this.configuration(),
      state = secret(),
      browser = secret(),
      nonce = oidc.randomNonce(),
      verifier = oidc.randomPKCECodeVerifier();
    const safePath =
      /^\/(?:administration\/(?:users|roles)(?:\/[a-f0-9-]+)?|support|auth-complete)?$/.test(
        input.returnPath,
      )
        ? input.returnPath
        : '/';
    await this.pool.query(
      `INSERT INTO access.login_attempt(state_hash,browser_hash,verifier_ciphertext,nonce,company_code,support,return_path,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,clock_timestamp()+interval '5 minutes')`,
      [
        digest(state),
        digest(browser),
        encrypt(verifier, this.config.encryptionKey),
        nonce,
        input.companyCode.toLowerCase(),
        input.support,
        safePath,
      ],
    );
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: this.config.origin + '/api/v1/access/callback',
      scope: 'openid profile',
      state,
      nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
      login_hint: input.support
        ? input.username
        : input.companyCode.toLowerCase() + '.' + input.username,
      max_age: input.support ? '0' : '300',
      ...(input.support ? { acr_values: '2' } : {}),
    });
    return { url: url.href, browser };
  }
  async callback(url: URL, browser: string) {
    const state = url.searchParams.get('state') ?? '';
    // Atomic consumption before external exchange makes concurrent/replayed callbacks fail closed.
    const attempt = (
      await this.pool.query<{
        verifier_ciphertext: string;
        nonce: string;
        company_code: string;
        support: boolean;
        return_path: string;
      }>(
        `UPDATE access.login_attempt SET consumed_at=clock_timestamp() WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>clock_timestamp() AND consumed_at IS NULL RETURNING *`,
        [digest(state), digest(browser)],
      )
    ).rows[0];
    if (!attempt) {
      console.info(
        JSON.stringify({ event: 'oidc_rejected', stage: 'attempt', browserPresent: !!browser }),
      );
      throw new AccessError('LOGIN_FAILED', 401);
    }
    let stage = 'exchange';
    try {
      const tokens = await oidc.authorizationCodeGrant(await this.configuration(), url, {
        pkceCodeVerifier: decrypt(attempt.verifier_ciphertext, this.config.encryptionKey),
        expectedState: state,
        expectedNonce: attempt.nonce,
        idTokenExpected: true,
        maxAge: attempt.support ? 60 : 300,
      });
      stage = 'claims';
      const claims = tokens.claims();
      if (!claims?.sub || claims.iss !== this.config.issuer || !claims.auth_time)
        throw new Error('claims');
      // ACR 2 must be mapped by the issuer to a REQUIRED MFA flow, not a user-editable attribute.
      const mfa = claims.acr === '2' || (Array.isArray(claims.amr) && claims.amr.includes('otp'));
      stage = 'binding';
      const session = await createSession(
        this.pool,
        this.config,
        {
          issuer: claims.iss,
          subject: claims.sub,
          mfa,
          authenticatedAt: new Date(claims.auth_time * 1000),
          tokens,
        },
        attempt.company_code,
        attempt.support,
      );
      return {
        ...session,
        returnPath:
          attempt.support && attempt.return_path !== '/auth-complete'
            ? '/support'
            : attempt.return_path,
      };
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      console.info(
        JSON.stringify({
          event: 'oidc_rejected',
          stage,
          code: typeof code === 'string' && /^[A-Z_]+$/.test(code) ? code : 'VALIDATION_FAILED',
        }),
      );
      throw new AccessError('LOGIN_FAILED', 401);
    }
  }
}
