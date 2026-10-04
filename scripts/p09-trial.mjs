import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['--import', 'tsx', 'tests/p09/serve.ts'], {
  stdio: 'inherit',
  env: { ...process.env, TSX_TSCONFIG_PATH: 'tsconfig.base.json', P09_MANUAL_TRIAL: 'true' },
  windowsHide: true,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => (process.exitCode = code ?? 1));
