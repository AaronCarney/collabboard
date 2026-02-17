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
    ],
  }
);
