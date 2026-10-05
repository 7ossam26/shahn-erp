import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/integration/p14/**/*.public.test.ts'],environment:'node',passWithNoTests:false,testTimeout:120000,reporters:['default']}});

