import { execFileSync } from 'node:child_process';
for (const name of ['shahn-p02-dev-db', 'shahn-p02-dev-issuer']) {
  const label = execFileSync(
    'docker',
    ['inspect', '--format', '{{index .Config.Labels "shahn.phase"}}', name],
    { encoding: 'utf8' },
  ).trim();
  if (!['P02-development', 'P02-identity'].includes(label))
    throw new Error('P02 ownership label mismatch');
  execFileSync('docker', ['start', name], { stdio: 'inherit' });
}
