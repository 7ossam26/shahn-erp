import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['tests/diagnostics/no-such-suite-*.test.ts'],passWithNoTests:false}});
