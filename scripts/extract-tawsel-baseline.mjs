import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const baseline = 'docs/integration/tawsel-baseline/32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada/';
const manifest = JSON.parse(await readFile(baseline + 'planning-manifest.json', 'utf8'));
const extracted = [];
for (const name of ['05-CANONICAL-SCHEMAS.md', '06-CANONICAL-EXAMPLES.md']) {
  const text = await readFile(baseline + name, 'utf8');
  for (const match of text.matchAll(
    /<!-- SOURCE-BEGIN ([^\r\n]+) -->\r?\n````json\r?\n([\s\S]*?)\r?\n````\r?\n<!-- SOURCE-END \1 -->/g,
  )) {
    const [, original, embedded] = match;
    const expected = manifest.sourceFiles.find((f) => f.path === original);
    // Markdown checkout can normalize line endings. Recover only bytes whose published digest matches.
    const raw = [
      embedded,
      embedded.replace(/\r\n/g, '\n'),
      embedded.replace(/\r?\n/g, '\r\n'),
    ].find(
      (candidate) => createHash('sha256').update(candidate).digest('hex') === expected?.sha256,
    );
    if (raw === undefined) throw new Error('BASELINE_HASH_MISMATCH: ' + original);
    const sha256 = expected.sha256;
    const value = JSON.parse(raw);
    const destination = original.startsWith('contracts/examples/')
      ? 'packages/test-support/fixtures/tawsel/' + original.slice('contracts/examples/'.length)
      : original.startsWith('contracts/')
        ? 'packages/contracts/src/tawsel/canonical/' + original.slice('contracts/'.length)
        : 'packages/test-support/fixtures/tawsel/' + original;
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, raw);
    extracted.push({ original, destination, sha256, schema: value.$id ?? null });
  }
}
await mkdir('docs/verification/P11', { recursive: true });
await writeFile(
  'docs/verification/P11/baseline-extraction.json',
  JSON.stringify({ sourceCommit: manifest.sourceCommit, extracted }, null, 2) + '\n',
);
const schemas = extracted.filter((x) => x.schema);
await writeFile(
  'packages/contracts/src/tawsel/registry.ts',
  '// Generated from the hash-verified pinned baseline. Run scripts/extract-tawsel-baseline.mjs.\n' +
    schemas
      .map(
        (x, i) => `import s${i} from './canonical/${x.original.slice(10)}' with { type: 'json' };`,
      )
      .join('\n') +
    '\nexport const canonicalSchemas = [' +
    schemas.map((_, i) => 's' + i).join(',') +
    '];\n',
);
console.log(
  JSON.stringify({
    verifiedFiles: extracted.length,
    schemas: extracted.filter((x) => x.schema).length,
  }),
);
