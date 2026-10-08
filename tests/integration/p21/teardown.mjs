import { readFile } from 'node:fs/promises';
export default async function () {
  try {
    const f = JSON.parse(await readFile('tests/.p21-runtime.json', 'utf8'));
    const reply = await fetch('http://127.0.0.1:4422/stop', {
      headers: { 'x-test-secret': f.secret },
    });
    await reply.text();
  } catch {}
}
