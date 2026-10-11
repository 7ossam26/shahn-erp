import { readFile } from 'node:fs/promises';
export default async function teardown() {
  let runtime;
  try {
    runtime = JSON.parse(await readFile('tests/.returned-parcel-runtime.json', 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  await fetch('http://127.0.0.1:4352/stop', {
    headers: { 'x-test-secret': runtime.secret },
    signal: AbortSignal.timeout(10000),
  });
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      await readFile('tests/.returned-parcel-runtime.json');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw Error('RETURNED_PARCEL_TEARDOWN_INCOMPLETE');
}
