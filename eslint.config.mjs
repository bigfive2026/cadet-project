// ESLint flat config (ESLint 10).
//
// Next 16 deprecated `next lint`. eslint-config-next 16 bundles
// eslint-plugin-react@7, which still calls the `context.getFilename()` API that
// ESLint 10 removed — so it cannot load. We compose an ESLint-10-compatible
// config directly from the modern, flat-config-native pieces instead:
//   - typescript-eslint (recommended)
//   - @next/eslint-plugin-next (core-web-vitals rules)
//   - eslint-plugin-react-hooks (recommended-latest)
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "*.config.{js,mjs,ts}",
    ],
  },
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  {
    // Honor the project's `_`-prefix convention for intentionally unused
    // bindings (e.g. `_request`, `_ctx`, `_exhaustive`).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    // Test files: relax rules that conflict with mocking patterns.
    files: ["**/*.test.{ts,tsx}", "vitest.setup.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
