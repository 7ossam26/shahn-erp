import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import adoptedRelease from '../../packages/contracts/src/tawsel/adopted-release.json' with { type: 'json' };
export const adoptedCommit = adoptedRelease.sourceCommit;
export function readerContractDigest() {
  const extraction = JSON.parse(readFileSync(adoptedRelease.extractionRecord, 'utf8'));
  if (extraction.candidateCommit !== adoptedCommit) throw Error('READER_BASELINE_MISMATCH');
  for (const x of extraction.extracted) {
    const b = readFileSync(x.destination);
    if (b.length !== x.bytes || createHash('sha256').update(b).digest('hex') !== x.sha256)
      throw Error('READER_BYTES_MISMATCH');
  }
  return createHash('sha256')
    .update(JSON.stringify(extraction.extracted.map((x) => [x.path, x.sha256])))
    .digest('hex');
}
/** This gate evaluates externally measured deployment witnesses. A local green
 * build is never a substitute for both independently deployed ERP readers. */
export function requireCompatibleReaders(w) {
  const digest = readerContractDigest(),
    sha = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
  if (
    !w ||
    w.authority !== 'company-operator' ||
    !w.companyId ||
    !w.tenantId ||
    !w.integrationId ||
    !w.releaseId ||
    !Number.isFinite(Date.parse(w.checkedAt)) ||
    Date.now() - Date.parse(w.checkedAt) > 86400000 ||
    Date.parse(w.checkedAt) > Date.now() + 60000
  )
    throw Error('RECENT_RECIPIENT_DEPLOYMENT_WITNESS_REQUIRED');
  for (const name of ['api', 'worker']) {
    const x = w[name];
    if (
      !x ||
      x.releaseId !== w.releaseId ||
      x.contractCommit !== adoptedCommit ||
      x.contractDigest !== digest ||
      !sha(x.artifactSha256) ||
      !sha(x.measurementSha256) ||
      JSON.stringify(x.payloadVersions) !== JSON.stringify(['1.0.0', '2.0.0']) ||
      x.observedRunning !== true
    )
      throw Error('BOTH_DEPLOYED_COMPATIBLE_READERS_REQUIRED');
  }
  if (
    w.database?.migration !== '0033_p27_unassigned.sql' ||
    w.database?.observedApplied !== true ||
    !sha(w.database?.measurementSha256)
  )
    throw Error('ACTUAL_RECIPIENT_MIGRATION_REQUIRED');
  if (
    w.signedReception?.legacyApplied !== true ||
    w.signedReception?.v2Applied !== true ||
    w.signedReception?.unsupportedRejected !== true ||
    !sha(w.signedReception?.measurementSha256)
  )
    throw Error('SIGNED_RECEIPT_AND_APPLICATION_WITNESS_REQUIRED');
  return {
    state: 'compatible-reader-gate-passed',
    companyId: w.companyId,
    tenantId: w.tenantId,
    integrationId: w.integrationId,
    releaseId: w.releaseId,
    contractCommit: adoptedCommit,
    contractDigest: digest,
    writerActivation: 'separate Tawsel operator authorization required',
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = requireCompatibleReaders(
      JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8')),
    );
    if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } catch (e) {
    console.error(
      'Writer activation blocked: ' + (e instanceof Error ? e.message : 'witness unavailable'),
    );
    process.exitCode = 1;
  }
}
