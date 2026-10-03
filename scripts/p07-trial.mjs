import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['--import', 'tsx', 'tests/p07/serve.ts'], {
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, TSX_TSCONFIG_PATH: 'tsconfig.base.json', P07_MANUAL_TRIAL: 'true' },
});
child.once('exit', (code) => process.exit(code ?? 1));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
