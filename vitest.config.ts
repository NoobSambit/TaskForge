import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        // Specific thresholds for gamification modules
        'lib/gamification/**/*.{js,ts}': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Lower thresholds for API handlers (more complex to test)
        'app/api/gamification/**/*.{js,ts}': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'coverage/**',
        'docs/**',
        'scripts/**',
        'workers/**',
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
