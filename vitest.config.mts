import { defineConfig } from 'vitest/config';

// The domain layer is pure TypeScript with no React Native imports, so it
// tests without a device, a simulator, or an RN preset. That is deliberate:
// the two pieces of real logic in v0 are verifiable on their own.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
