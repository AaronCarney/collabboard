import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // No explicit any — use unknown or proper types
      "@typescript-eslint/no-explicit-any": "error",
      // Type-only imports must use 'import type'
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // No console in production code (use a logger)
      "no-console": "warn",
      // Disallow non-null assertions (use proper null checks)
      "@typescript-eslint/no-non-null-assertion": "error",
      // Require explicit return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "warn",
      // No unused variables
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Relax rules for test and config infrastructure files
    files: [
      "vitest.config.ts",
      "vitest.setup.tsx",
      "playwright.config.ts",
      "__tests__/**/*.{ts,tsx}",
      "e2e/**/*.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/dot-notation": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-console": "off",
    },
  },
  {
    // Ignore build outputs and generated files
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "load-tests/**",
    ],
  }
);
