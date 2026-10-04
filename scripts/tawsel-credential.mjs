import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { writeFile, realpath } from 'node:fs/promises';
import { resolve, dirname, basename, join, sep } from 'node:path';
const destination = process.argv[2],
  expiresAt = process.argv[3];
if (
  !destination ||
  !expiresAt ||
  !Number.isFinite(Date.parse(expiresAt)) ||
  Date.parse(expiresAt) <= Date.now()
)
  throw Error(
    'Usage: node scripts/tawsel-credential.mjs <private-file-outside-repository> <future-UTC-expiry>',
  );
const target = join(await realpath(dirname(resolve(destination))), basename(destination)),
  root = await realpath('.'),
  normalize = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);
if (normalize(target) === normalize(root) || normalize(target).startsWith(normalize(root) + sep))
  throw Error('Choose a private location outside the repository.');
const credentialId = randomUUID(),
  raw = randomBytes(32).toString('hex');
await writeFile(
  target,
  JSON.stringify(
    {
      credentialId,
      secretHash: createHash('sha256').update(raw, 'utf8').digest('hex'),
      serviceBearer: `twp_${credentialId}.${raw}`,
      expiresAt: new Date(expiresAt).toISOString(),
    },
    null,
    2,
  ),
  { flag: 'wx', mode: 0o600 },
);
console.log(
  'Private service credential created. Use only credentialId, secretHash and expiresAt in the bootstrap command. Raw bearer was not printed.',
);
