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
        "src/lib/membership.ts",
        "src/lib/post-access.ts",
        "src/lib/community-access.ts",
        "src/lib/applications.ts",
        "src/lib/notifications.ts",
        "src/lib/notification-types.ts",
        "src/lib/contracts.ts",
        "src/lib/format.ts",
        "src/lib/payment/**/*.ts",
        "src/lib/queries/**/*.ts",
        "src/lib/validation/**/*.ts",
        "src/app/login/actions.ts",
        "src/app/api/studio/route.ts",
        "src/app/api/membership-plans/route.ts",
        "src/app/api/posts/route.ts",
        "src/app/api/community-posts/route.ts",
        "src/app/api/community-posts/[id]/route.ts",
        "src/app/api/programs/[id]/applications/route.ts",
        "src/app/api/applications/[id]/route.ts",
        "src/app/api/applications/[id]/contract/route.ts",
        "src/app/api/contracts/**/*.ts",
        "src/app/api/notifications/**/*.ts",
        "src/app/(app)/creators/[creatorId]/actions.ts",
        "src/components/creators/**/*.tsx",
        "src/components/studio/**/*.tsx",
        "src/components/posts/**/*.tsx",
        "src/components/dashboard/**/*.tsx",
        "src/components/contracts/**/*.tsx",
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
