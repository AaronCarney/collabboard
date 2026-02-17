import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use globals (describe, it, expect) without importing
    globals: true,
    // happy-dom is faster than jsdom for most tests; use jsdom if you need full DOM APIs
    environment: "happy-dom",
    // Run this file before each test file
    setupFiles: ["./vitest.setup.tsx"],
    // Include test files matching these patterns
    include: [
      "apps/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "apps/**/*.{test,spec}.{ts,tsx}",
      "packages/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "packages/**/*.{test,spec}.{ts,tsx}",
      "__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
    // Exclude these from test discovery
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "e2e/**",
      "load-tests/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["apps/*/src/**", "apps/*/lib/**", "packages/*/src/**"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.{ts,js,mjs}",
        "**/node_modules/**",
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
      ],
      // MVP coverage thresholds — raise as codebase matures
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 35,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
      "@collabboard/shared": path.resolve(__dirname, "./packages/shared/src"),
      "@collabboard/ui": path.resolve(__dirname, "./packages/ui/src"),
      "@collabboard/db": path.resolve(__dirname, "./packages/db/src"),
    },
  },
});
