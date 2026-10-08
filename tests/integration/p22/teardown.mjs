import { readFile } from 'node:fs/promises';
export default async function () {
  try {
    const f = JSON.parse(await readFile('tests/.p22-runtime.json', 'utf8'));
    const r = await fetch('http://127.0.0.1:4424/stop', { headers: { 'x-test-secret': f.secret } });
    await r.text();
  } catch {
    /* failed setup reported by Playwright */
  }
}
