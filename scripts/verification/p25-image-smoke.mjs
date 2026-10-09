import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const exec = promisify(execFile);
if (
  process.platform !== 'linux' ||
  process.env['APP_ENV'] !== 'test' ||
  process.env['P25_ISOLATED_REHEARSAL'] !== 'true'
)
  throw Error('ISOLATED_LINUX_TEST_REQUIRED');
const image = 'shahn-p25-runtime';
const name = 'shahn-p25-web-smoke-' + randomUUID();
const docker = async (args) => (await exec('docker', args, { timeout: 60000 })).stdout.trim();
const evidence = {
  boundary:
    'Local image static web/config refusal only; no actual issuer, clean API/worker deployment or portability acceptance',
  passed: false,
};
let started = false;
try {
  evidence.releaseImageId = await docker(['image', 'inspect', image, '--format', '{{.Id}}']);
  evidence.nonRootUid = Number(
    await docker([
      'run',
      '--rm',
      '--network',
      'none',
      '--entrypoint',
      'node',
      image,
      '-e',
      'console.log(process.getuid())',
    ]),
  );
  if (evidence.nonRootUid !== 1000) throw Error('IMAGE_IS_NOT_EXPECTED_NONROOT_USER');
  try {
    await docker(['run', '--rm', '--network', 'none', image, 'api']);
    throw Error('INCOMPLETE_CONFIGURATION_ACCEPTED');
  } catch (error) {
    const result = error;
    if (result.code !== 1 || !/Configuration: RELEASE_ID is required/.test(result.stderr ?? ''))
      throw Error('EXPECTED_STARTUP_CONFIGURATION_REFUSAL_NOT_OBSERVED');
    evidence.incompleteApiConfigurationRejected = true;
  }
  await docker([
    'run',
    '-d',
    '--name',
    name,
    '--label',
    'shahn.phase=P25-test',
    '--network',
    'none',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges:true',
    '-e',
    'API_UPSTREAM=http://127.0.0.1:4100',
    image,
    'web',
  ]);
  started = true;
  let observations;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      observations = JSON.parse(
        await docker([
          'exec',
          name,
          'node',
          '-e',
          "(async()=>{const r=await fetch('http://127.0.0.1:8080/');const html=await r.text();const asset=html.match(/src=\"([^\"]+\.js)\"/);const a=asset?await fetch('http://127.0.0.1:8080'+asset[1]):null;const api=await fetch('http://127.0.0.1:8080/api/v1/readiness');const post=await fetch('http://127.0.0.1:8080/',{method:'POST'});console.log(JSON.stringify({status:r.status,assetStatus:a?.status,nosniff:r.headers.get('x-content-type-options'),indexCache:r.headers.get('cache-control'),apiStatus:api.status,staticWriteStatus:post.status,uid:process.getuid()}))})()",
        ]),
      );
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (
    !observations ||
    observations.status !== 200 ||
    observations.assetStatus !== 200 ||
    observations.nosniff !== 'nosniff' ||
    observations.indexCache !== 'no-store' ||
    observations.apiStatus !== 502 ||
    observations.staticWriteStatus !== 405 ||
    observations.uid !== 1000
  )
    throw Error('STATIC_WEB_SMOKE_FAILED');
  evidence.web = observations;
  await docker(['stop', '--time', '10', name]);
  const exitCode = Number(await docker(['inspect', name, '--format', '{{.State.ExitCode}}']));
  if (exitCode !== 0) throw Error('WEB_DID_NOT_DRAIN');
  evidence.webGracefulExitCode = exitCode;
  evidence.passed = true;
} catch (error) {
  evidence.failure = /^[A-Z_]+$/.test(error.message)
    ? error.message
    : 'IMAGE_SMOKE_OPERATION_FAILED';
  process.exitCode = 1;
} finally {
  if (started) {
    const label = await docker([
      'inspect',
      name,
      '--format',
      '{{index .Config.Labels "shahn.phase"}}',
    ]);
    if (label !== 'P25-test') throw Error('UNOWNED_CONTAINER');
    await docker(['rm', '-f', name]);
  }
  await mkdir('docs/verification/P25', { recursive: true });
  await writeFile(
    'docs/verification/P25/image-smoke.json',
    JSON.stringify(evidence, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({ passed: evidence.passed, evidence: 'docs/verification/P25/image-smoke.json' }),
  );
}
