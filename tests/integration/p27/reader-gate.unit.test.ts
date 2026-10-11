import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  readerContractDigest,
  adoptedCommit,
  requireCompatibleReaders,
} from '../../../scripts/verification/p27-reader-gate.mjs';
it('writer gate requires both deployed readers, actual migrations and signed application evidence for this recipient', () => {
  const d = readerContractDigest(),
    reader = {
      releaseId: 'isolated-test-witness',
      contractCommit: adoptedCommit,
      contractDigest: d,
      artifactSha256: '1'.repeat(64),
      measurementSha256: '2'.repeat(64),
      payloadVersions: ['1.0.0', '2.0.0'],
      observedRunning: true,
    },
    w = {
      authority: 'company-operator',
      companyId: randomUUID(),
      tenantId: randomUUID(),
      integrationId: randomUUID(),
      releaseId: reader.releaseId,
      checkedAt: new Date().toISOString(),
      api: reader,
      worker: reader,
      database: {
        migration: '0033_p27_unassigned.sql',
        observedApplied: true,
        measurementSha256: '3'.repeat(64),
      },
      signedReception: {
        legacyApplied: true,
        v2Applied: true,
        unsupportedRejected: true,
        measurementSha256: '4'.repeat(64),
      },
    };
  expect(requireCompatibleReaders(w).state).toBe('compatible-reader-gate-passed');
  expect(() =>
    requireCompatibleReaders({ ...w, worker: { ...reader, payloadVersions: ['1.0.0'] } }),
  ).toThrow('BOTH_DEPLOYED');
  expect(() =>
    requireCompatibleReaders({ ...w, database: { ...w.database, observedApplied: false } }),
  ).toThrow('ACTUAL_RECIPIENT');
  expect(() =>
    requireCompatibleReaders({ ...w, signedReception: { ...w.signedReception, v2Applied: false } }),
  ).toThrow('SIGNED_RECEIPT');
  expect(() => requireCompatibleReaders({ ...w, checkedAt: '2020-01-01T00:00:00Z' })).toThrow(
    'RECENT_RECIPIENT',
  );
  expect(() => requireCompatibleReaders(undefined)).toThrow();
});
