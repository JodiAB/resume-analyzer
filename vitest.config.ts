import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  // Bound native PDF/jsdom startup contention on shared developer machines.
  test: { environment: 'jsdom', restoreMocks: true, maxWorkers: 2, include: ['tests/**/*.test.{ts,tsx}'] },
});
