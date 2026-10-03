import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const phase = process.argv[2];
const flags = process.argv.slice(3);
const registry = JSON.parse(readFileSync(new URL('./phase-suites.json', import.meta.url)));
if (!phase || !Object.hasOwn(registry, phase)) {
  console.error(`Unregistered phase: ${phase ?? '(missing)'}`);
  process.exit(1);
}
if (
  flags.some((flag) => !['--diagnostic-failure=unit', '--diagnostic-empty=unit'].includes(flag)) ||
  flags.length > 1
) {
  console.error('Unknown phase runner option');
  process.exit(1);
}
const suite = registry[phase];
function execute(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  return result.status ?? 1;
}
const commands = { unit: [['scripts/build-packages.mjs']], database: [], browser: [] };
for (const [layer, definition] of Object.entries(suite)) {
  if (definition.applicable === false) {
    console.log(`${phase} ${layer}: NOT APPLICABLE — ${definition.reason}`);
    continue;
  }
  const files = readdirSync(definition.directory, { recursive: true }).filter(
    (file) =>
      typeof file === 'string' &&
      file.includes(definition.extension) &&
      /\.(ts|tsx|mjs)$/.test(file) &&
      (!definition.filter ||
        definition.filter.some(
          (path) =>
            path.replaceAll('\\', '/') === definition.directory + '/' + file.replaceAll('\\', '/'),
        )),
  );
  if (!files.length) {
    console.error(`${phase} ${layer}: zero registered test files`);
    process.exit(1);
  }
  console.log(
    `${phase} ${layer}: ${definition.script}; ${files.length} registered test files (test framework must also reject zero cases)`,
  );
  for (const args of commands[layer] ?? []) if (execute(args) !== 0) process.exit(1);
  if (layer === 'unit' && flags.includes('--diagnostic-empty=unit')) {
    const code = execute([
      'node_modules/vitest/vitest.mjs',
      'run',
      '--config',
      'vitest.empty.config.ts',
    ]);
    console.error('Zero-test diagnostic propagated from unit layer');
    process.exit(code === 0 ? 1 : code);
  }
  const args =
    layer === 'unit'
      ? [
          'node_modules/vitest/vitest.mjs',
          'run',
          '--config',
          definition.config ?? 'vitest.unit.config.ts',
          ...(definition.filter ?? []),
        ]
      : layer === 'database'
        ? [
            'node_modules/vitest/vitest.mjs',
            'run',
            '--config',
            definition.config ?? 'vitest.db.config.ts',
            ...(definition.filter ?? []),
          ]
        : [
            'node_modules/@playwright/test/cli.js',
            'test',
            '--config',
            definition.config ?? 'playwright.config.ts',
          ];
  if (layer === 'browser' && execute(['scripts/build.mjs']) !== 0) process.exit(1);
  const code = execute(args);
  if (code !== 0) {
    console.error(`${phase} ${layer}: FAILED (${code})`);
    process.exit(code);
  }
  if (layer === 'unit' && flags.includes('--diagnostic-failure=unit')) {
    const diagnostic = execute([
      'node_modules/vitest/vitest.mjs',
      'run',
      '--config',
      'vitest.diagnostic.config.ts',
    ]);
    if (diagnostic === 0) {
      console.error('Controlled diagnostic unexpectedly passed');
      process.exit(1);
    }
    console.error('Controlled Vitest failure propagated from unit layer');
    process.exit(diagnostic);
  }
  console.log(`${phase} ${layer}: PASSED`);
}
console.log(`${phase}: all required layers passed`);
