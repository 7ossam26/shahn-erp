import { readFile } from 'node:fs/promises';
export default async function () {
  try {
    const f = JSON.parse(await readFile('tests/.p20-runtime.json', 'utf8'));
    await fetch('http://127.0.0.1:4402/stop', { headers: { 'x-test-secret': f.secret } });
  } catch {}
}
