import { readFile, rm } from 'node:fs/promises';
export default async function () {
  try {
    const runtime = JSON.parse(await readFile('tests/.p02-runtime.json', 'utf8'));
    await fetch('http://127.0.0.1:4292/shutdown', {
      method: 'POST',
      headers: { Authorization: `Bearer ${runtime.controlSecret}` },
    });
  } catch {}
  await rm('tests/.p02-otp-steps.json', { force: true });
}
