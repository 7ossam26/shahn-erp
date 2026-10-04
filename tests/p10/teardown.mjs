import { readFile } from 'node:fs/promises';
export default async function teardown() {
  try {
    const runtime = JSON.parse(await readFile('tests/.p10-runtime.json', 'utf8'));
    await fetch('http://127.0.0.1:4316/stop', {
      method: 'POST',
      headers: { 'x-test-secret': runtime.secret },
    });
    for (let i = 0; i < 200; i++) {
      try {
        await readFile('tests/.p10-runtime.json');
      } catch {
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw Error('P10_TEARDOWN_INCOMPLETE');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
