import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile, cp, symlink, lstat } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
const publisher = resolve('../tawsel-routing'),
  candidate = resolve(publisher, 'dist/erp-handoff'),
  target = resolve('.tools/p27-tawsel-source');
const identity = JSON.parse(
  await readFile(resolve(candidate, 'metadata/source-identity.json'), 'utf8'),
);
const adopted = JSON.parse(
  await readFile('packages/contracts/src/tawsel/adopted-release.json', 'utf8'),
);
if (
  identity.baseCommit !== adopted.sourceCommit ||
  identity.sourceSha256 !== adopted.contractSha256
)
  throw Error('UNADOPTED_PUBLISHER_SOURCE');
const sha = (b) => createHash('sha256').update(b).digest('hex');
await mkdir(target, { recursive: true });
const origins = [];
for (const x of identity.files) {
  const destination = resolve(target, x.path);
  if (!destination.startsWith(target + sep) || x.path.includes('..'))
    throw Error('UNSAFE_PUBLISHER_PATH');
  const git = execFileSync('git', ['show', identity.baseCommit + ':' + x.path], {
      cwd: publisher,
      maxBuffer: 16777216,
    }),
    checkout = await readFile(resolve(publisher, x.path));
  if (git.toString().replaceAll('\r\n', '\n') !== checkout.toString().replaceAll('\r\n', '\n'))
    throw Error('PUBLISHER_SOURCE_SEMANTIC_CHANGE ' + x.path);
  if (identity.format === 'git-blobs-v1' && sha(git) !== x.sha256)
    throw Error('PUBLISHER_SOURCE_BYTE_MISMATCH ' + x.path);
  const bytes = git;
  origins.push({
    path: x.path,
    origin: 'exact-candidate-git-object',
    gitSha256: sha(git),
    checkoutSha256: sha(checkout),
    publisherInventorySha256: x.sha256,
    publisherByteMatch: sha(git) === x.sha256 || sha(checkout) === x.sha256,
    semanticCheckoutMatchesCandidate: true,
  });
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}
// Publisher attachments carry generated client bytes independently of Git source.
await cp(
  resolve(candidate, 'packages/api-client/dist'),
  resolve(target, 'packages/api-client/dist'),
  { recursive: true },
);
await cp(resolve(publisher, 'packages/shared/dist'), resolve(target, 'packages/shared/dist'), {
  recursive: true,
});
const modules = resolve(target, 'node_modules');
try {
  await lstat(modules);
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  await symlink(resolve(publisher, 'node_modules'), modules, 'junction');
}
for (const path of ['tsconfig.base.json'])
  await writeFile(
    resolve(target, path),
    execFileSync('git', ['show', identity.baseCommit + ':' + path], { cwd: publisher }),
  );
await writeFile(
  'docs/verification/P27/audit-2026-10-11/publisher-source-fixture.json',
  JSON.stringify(
    {
      classification:
        identity.format === 'git-blobs-v1'
          ? 'Exact immutable Git source bytes match every publisher declared digest; checkout comparison handles Git EOL filters only. Current adopted identity verified; generated client separately copied from exact verified bundle. Dependencies reused; isolated databases/processes only.'
          : 'Legacy exact Git source fixture with explicitly retained original raw-byte mismatch disclosures; no normalized digest replaces publisher declaration.',
      sourceCommit: identity.baseCommit,
      publisherDeclaredSourceSha256: identity.sourceSha256,
      files: identity.files.length,
      publisherSourceByteMismatches: origins
        .filter((x) => !x.publisherByteMatch)
        .map((x) => x.path),
      origins,
    },
    null,
    2,
  ) + '\n',
);
console.log('Verified exact candidate source files: ' + identity.files.length);
