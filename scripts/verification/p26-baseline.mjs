import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const pin = '32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada';
const directory = resolve(root, 'docs/integration/tawsel-baseline', pin);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const restore = process.argv.slice(2).length === 1 && process.argv[2] === '--restore';
if (process.argv.slice(2).length && !restore) throw Error('Usage: p26-baseline.mjs [--restore]');
const manifestPath = resolve(directory, 'planning-manifest.json');
const originalManifest = readFileSync(manifestPath);
const manifestBytes = Buffer.from(originalManifest.toString('utf8').replaceAll('\r\n', '\n'));
if (sha(manifestBytes) !== '07a6a87a4a7b9720b6310a1dea2f66609a81de7a64237d653b37b74fe8a9a6d9')
  throw Error('AUTHORITATIVE_MANIFEST_MISMATCH');
const manifest = JSON.parse(manifestBytes);
if (manifest.sourceCommit !== pin) throw Error('BASELINE_IDENTITY_MISMATCH');
const targets = [
  { path: manifestPath, before: originalManifest, bytes: manifestBytes, blocks: [] },
];
for (const artifact of manifest.artifacts.filter((a) => /^0[1-7]-/.test(a.path))) {
  const path = resolve(directory, artifact.path);
  const before = readFileSync(path);
  let text = before.toString('utf8').replaceAll('\r\n', '\n');
  const blocks = [];
  text = text.replace(
    /<!-- SOURCE-BEGIN ([^\r\n]+) -->\n(`{4}[^\n]*)\n([\s\S]*?)\n`{4}\n<!-- SOURCE-END \1 -->/g,
    (_block, source, fence, embedded) => {
      const expected = manifest.sourceFiles.find((file) => file.path === source);
      const raw = [embedded, embedded.replaceAll('\n', '\r\n')].find(
        (candidate) =>
          sha(candidate) === expected?.sha256 && Buffer.byteLength(candidate) === expected.bytes,
      );
      if (raw === undefined) throw Error('CANONICAL_SOURCE_HASH_MISMATCH: ' + source);
      blocks.push({ source, bytes: expected.bytes, sha256: expected.sha256 });
      return `<!-- SOURCE-BEGIN ${source} -->\n${fence}\n${raw}\n\`\`\`\`\n<!-- SOURCE-END ${source} -->`;
    },
  );
  const bytes = Buffer.from(text);
  if (bytes.length !== artifact.bytes || sha(bytes) !== artifact.sha256)
    throw Error('PUBLISHER_BUNDLE_HASH_MISMATCH: ' + artifact.path);
  targets.push({ path, before, bytes, blocks });
}
if (targets.length !== 8) throw Error('EXPECTED_SEVEN_ATTACHMENTS_AND_MANIFEST');
// Prove every original source and complete publisher bundle before writing any target.
if (restore)
  for (const target of targets)
    if (!target.before.equals(target.bytes)) writeFileSync(target.path, target.bytes);
const evidence = {
  capturedAt: new Date().toISOString(),
  pin,
  mode: restore ? 'restore exact publisher bytes' : 'read-only reconstruction',
  method:
    'Recover each embedded LF/CRLF form only when its independent published source hash matches; the wrapper and complete bundle must then match the original manifest exactly.',
  semanticChange: false,
  baselineAdoption: false,
  files: targets.map((target) => ({
    path: target.path.slice(root.length + 1).replaceAll('\\', '/'),
    beforeBytes: target.before.length,
    beforeSha256: sha(target.before),
    publisherBytes: target.bytes.length,
    publisherSha256: sha(target.bytes),
    originallyMatched: target.before.equals(target.bytes),
    currentRawBytesMatchPublisher: readFileSync(target.path).equals(target.bytes),
    blocks: target.blocks,
  })),
};
mkdirSync(resolve(root, 'docs/verification/P26'), { recursive: true });
writeFileSync(
  resolve(
    root,
    `docs/verification/P26/baseline-${restore ? 'restoration' : 'reconstruction'}.json`,
  ),
  JSON.stringify(evidence, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    mode: evidence.mode,
    verifiedBundles: targets.length,
    verifiedSourceBlocks: targets.reduce((n, t) => n + t.blocks.length, 0),
    currentRawBytesAllMatch: evidence.files.every((f) => f.currentRawBytesMatchPublisher),
  }),
);
