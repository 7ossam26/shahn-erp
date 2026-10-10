import { readFile } from 'node:fs/promises';
export default async function teardown() {
  let r;
  try {
    r = JSON.parse(await readFile('tests/.p27-runtime.json', 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return;
    throw e;
  }
  await fetch('http://127.0.0.1:4338/stop', {
    method: 'POST',
    headers: { 'x-test-secret': r.secret },
  });
  for (let i = 0; i < 200; i++) {
    try {
      await readFile('tests/.p27-runtime.json');
    } catch {
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error('P27_TEARDOWN_INCOMPLETE');
}
