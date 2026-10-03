export const keycloakImage: string;
export function randomSecret(): string;
export function freePort(): Promise<number>;
export function totp(secret: string, now?: number): string;
export function otpSecret(): string;
export interface TestIssuerUser {
  id: string;
  username: string;
  password: string;
  otp: string;
}
export function isolatedKeycloak(
  origin: string,
  options?: { name?: string; port?: number; realm?: string; persistent?: boolean },
): Promise<{
  name: string;
  base: string;
  issuer: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  adminClientId: string;
  adminClientSecret: string;
  operator: { username: string; password: string };
  createUser(
    username: string,
    options?: { id?: string; correlationId?: string; companyId?: string; mfa?: boolean },
  ): Promise<TestIssuerUser>;
  admin<T = unknown>(path: string, method?: string, body?: unknown): Promise<T>;
  stop(): Promise<string>;
  start(): Promise<string>;
  dispose(): Promise<string>;
}>;
