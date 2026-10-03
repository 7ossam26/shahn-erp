import { readFile } from 'node:fs/promises';
export default async function teardown() {
  try {
    const runtime = JSON.parse(await readFile('tests/.p04-runtime.json', 'utf8'));
    await fetch('http://127.0.0.1:4296/stop', {
      method: 'POST',
      headers: { 'x-test-secret': runtime.secret },
    });
    for (let i = 0; i < 200; i++) {
      try {
        await readFile('tests/.p04-runtime.json');
      } catch {
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw Error('P04_TEARDOWN_INCOMPLETE');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
