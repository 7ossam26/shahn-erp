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
  'docs/verification/P27/publisher-source-fixture.json',
  JSON.stringify(
    {
      classification:
        'Isolated test source uses exact candidate Git objects; current checkout semantically compared after newline normalization. Publisher source inventory is a separately retained declaration: mixed historical filesystem line endings mean some source digests cannot be reproduced from current checkout/Git. No normalized hash replaces publisher-byte provenance. Original package/manifest/schema/client attachments are verified independently. Installed dependencies reused; no publisher service/build mutation.',
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
