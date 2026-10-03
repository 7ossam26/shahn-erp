import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
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
writeFileSync(
  contractPath,
  await format(JSON.stringify(openApi), {
    ...(await resolveConfig(contractPath)),
    filepath: contractPath,
  }),
);
