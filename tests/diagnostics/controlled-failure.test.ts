import { expect, it } from 'vitest';
// Deliberately failing, excluded from normal suites; used only by the explicit diagnostic switch.
it('P01 controlled diagnostic proves the phase runner propagates a real test failure', () => {
  expect('controlled failure').toBe('passing result');
});
