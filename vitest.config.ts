import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest configuration for ArtBridge (Next.js 16 App Router + TS).
// Server-logic tests run in node; React component tests opt into jsdom
// via the `// @vitest-environment jsdom` docblock at the top of their file.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/lib/auth.ts",
        "src/lib/session.ts",
        "src/lib/utils.ts",
        "src/lib/queries/**/*.ts",
        "src/lib/validation/**/*.ts",
        "src/app/login/actions.ts",
        "src/app/api/studio/route.ts",
        "src/components/creators/**/*.tsx",
        "src/components/studio/**/*.tsx",
      ],
      exclude: ["src/lib/types.ts", "src/lib/prisma.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
