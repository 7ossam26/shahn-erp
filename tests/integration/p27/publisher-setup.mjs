import { execFileSync } from 'node:child_process';
export default function () {
  execFileSync(process.execPath, ['scripts/prepare-p27-publisher-fixture.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });
}
