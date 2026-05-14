import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 10000,
        include: ['__tests__/**/*.test.mjs'],
        setupFiles: ['./__tests__/setup.mjs'],
    },
});
