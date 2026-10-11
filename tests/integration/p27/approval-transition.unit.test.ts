import { it, expect, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connectionInstallation } from '../../../apps/api/src/modules/integration/connection-provider.js';
import type { InstallationApproval } from '../../../apps/api/src/modules/integration/connection-package.js';

it('protected approval file admits current plus reviewed same-scope replacement and refuses duplicate or scope-changing transitions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'shahn-approval-test-')),
    approval: InstallationApproval = {
      erpCompanyId: randomUUID(),
      tenantId: randomUUID(),
      integrationId: randomUUID(),
      sourceExternalId: 'shahn',
      companyCode: 'TRIAL',
      issuer: 'https://identity.example/realms/company',
      apiUrl: 'https://routing.example/',
      callbackUrl: 'https://erp.example/api/v1/consumer/events',
      sourceCommit: 'fff79bcb90aaba5676bbc0cd64d78d9ce93845b2',
      contractSha256: '1da953c86788247a1deaad49bec0c87b5170ab9d795cac8a50dc84c4a0cf869a',
    },
    next = { ...approval, apiUrl: 'https://replacement.example/' },
    approvalFile = join(directory, 'approval.json'),
    keyFile = join(directory, 'keys.json');
  try {
    writeFileSync(
      keyFile,
      JSON.stringify({ current: 'v1', keys: { v1: randomBytes(32).toString('hex') } }),
    );
    vi.stubEnv('TAWSEL_INSTALLATION_APPROVAL_FILE', approvalFile);
    vi.stubEnv('TAWSEL_ENCRYPTION_KEYS_FILE', keyFile);
    vi.stubEnv('APP_ORIGIN', 'https://erp.example');
    vi.stubEnv('OIDC_ISSUER', approval.issuer);
    writeFileSync(approvalFile, JSON.stringify([approval, next]));
    expect(connectionInstallation()!.approvals).toEqual([approval, next]);
    for (const invalid of [
      approval,
      { ...next, tenantId: randomUUID() },
      { ...next, integrationId: randomUUID() },
      { ...next, sourceExternalId: 'foreign' },
      { ...next, callbackUrl: 'https://foreign.example/api/v1/consumer/events' },
    ]) {
      writeFileSync(approvalFile, JSON.stringify([approval, invalid]));
      expect(() => connectionInstallation()).toThrow(
        'protected Tawsel installation approval/encryption key is invalid',
      );
    }
    writeFileSync(approvalFile, JSON.stringify([approval, next]));
    writeFileSync(
      keyFile,
      JSON.stringify({ current: 'v2', keys: { v1: randomBytes(32).toString('hex') } }),
    );
    expect(() => connectionInstallation()).toThrow(
      'protected Tawsel installation approval/encryption key is invalid',
    );
  } finally {
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true });
  }
});
