export default async function teardown() {
  // Windows process termination cannot deliver a graceful SIGTERM to Node.
  // Ask the UUID-owned loopback harness to drain its processes and delete only its fixture.
  const response = await fetch('http://127.0.0.1:4202/shutdown', { method: 'POST' });
  if (!response.ok) throw new Error('P01 browser fixture cleanup failed');
}
