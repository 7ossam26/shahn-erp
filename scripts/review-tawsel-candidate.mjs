import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const source = resolve(process.argv[2] ?? '../tawsel-routing/dist/erp-handoff');
const hash = (b) => createHash('sha256').update(b).digest('hex');
const { verifyRelease } = await import(
  pathToFileURL(resolve(source, 'scripts/verify-erp-release.mjs'))
);
const verification = await verifyRelease(source);
const manifestBytes = await readFile(resolve(source, 'docs/erp/release-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const commit = manifest.release.baseCommit;
const retained = `docs/integration/tawsel-baseline/${commit}`;
const entries = manifest.artifacts.filter(
  (e) =>
    e.path.startsWith('contracts/') ||
    e.path.startsWith('metadata/') ||
    e.path === 'packages/api-client/dist/schema.d.ts' ||
    e.path === 'packages/api-client/package.json' ||
    e.path.startsWith('docs/verification/interoperability-') ||
    e.path === 'docs/verification/integration-local-2026-10-10.json' ||
    e.path === 'docs/erp/interoperability-2026-10-10.md' ||
    e.path === 'docs/erp/connection-metadata.example.json' ||
    e.path === 'docs/erp/enrollment-request.example.json',
);
for (const entry of entries) {
  const destination = resolve(retained, entry.path);
  await mkdir(dirname(destination), { recursive: true });
  const bytes = await readFile(resolve(source, entry.path));
  try {
    if (!bytes.equals(await readFile(destination))) throw new Error('RETAINED_CANDIDATE_CONFLICT');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await copyFile(resolve(source, entry.path), destination);
  }
}
await mkdir(retained, { recursive: true });
await writeFile(`${retained}/release-manifest.json`, manifestBytes);
await mkdir('docs/verification/P27', { recursive: true });
await writeFile(
  'docs/verification/P27/publisher-review.json',
  JSON.stringify(
    {
      candidateCommit: commit,
      approvedPinUnchanged: '32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada',
      manifestBytes: manifestBytes.length,
      manifestSha256: hash(manifestBytes),
      verification,
      retained: entries.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
      classification:
        'Exact publisher byte verification; publisher runtime claims are retained evidence, not fresh native Shahn tests',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ retained: entries.length, commit, ...verification }));
