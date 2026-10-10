import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
const commit = 'fff79bcb90aaba5676bbc0cd64d78d9ce93845b2';
const root = `docs/integration/tawsel-baseline/${commit}`;
const manifest = JSON.parse(await readFile(`${root}/release-manifest.json`, 'utf8'));
const extracted = [];
for (const entry of manifest.artifacts.filter(
  (e) => e.path.startsWith('contracts/') && e.path.endsWith('.schema.json'),
)) {
  const raw = await readFile(`${root}/${entry.path}`);
  if (raw.length !== entry.bytes || createHash('sha256').update(raw).digest('hex') !== entry.sha256)
    throw new Error('PUBLISHER_BYTE_MISMATCH');
  const destination = 'packages/contracts/src/tawsel/canonical/' + entry.path.slice(10);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, raw);
  extracted.push({ ...entry, destination, id: JSON.parse(raw).$id });
}
await writeFile(
  'packages/contracts/src/tawsel/registry.ts',
  '// Generated from exact publisher bytes by scripts/extract-tawsel-candidate.mjs.\n' +
    extracted
      .map((e, i) => `import s${i} from './canonical/${e.path.slice(10)}' with { type: 'json' };`)
      .join('\n') +
    '\nexport const canonicalSchemas = [' +
    extracted.map((_, i) => `s${i}`).join(',') +
    '];\n',
);
await writeFile(
  'docs/verification/P27/candidate-extraction.json',
  JSON.stringify({ candidateCommit: commit, extracted }, null, 2) + '\n',
);
console.log(JSON.stringify({ candidateCommit: commit, schemas: extracted.length }));
