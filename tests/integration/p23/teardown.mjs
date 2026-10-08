import { readFile } from 'node:fs/promises';
export default async function () {
  try {
    const f = JSON.parse(await readFile('tests/.p23-runtime.json', 'utf8'));
    await (
      await fetch('http://127.0.0.1:4426/stop', { headers: { 'x-test-secret': f.secret } })
    ).text();
  } catch {
    /* failed setup remains a Playwright failure */
  }
}
