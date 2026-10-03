import { spawnSync } from 'node:child_process';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { format, resolveConfig } from 'prettier';
const result = spawnSync(
  process.execPath,
  [
    'node_modules/typescript/bin/tsc',
    '-b',
    'packages/contracts',
    'packages/domain',
    'packages/database',
    'packages/ui',
    'packages/test-support',
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const { openApi } = await import('@shahn/contracts');
const contractPath = 'packages/contracts/openapi.json';
const generated = await format(JSON.stringify(openApi), {
  ...(await resolveConfig(contractPath)),
  filepath: contractPath,
});
const transient = (error) => ['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code);
let current;
try {
  current = await readFile(contractPath, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT' && !transient(error)) throw error;
}
if (current !== generated) {
  // Keep an existing complete schema intact when Windows temporarily locks a generated file.
  const temporary = `${contractPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, generated);
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(temporary, contractPath);
        break;
      } catch (error) {
        if (attempt >= 7 || !transient(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
