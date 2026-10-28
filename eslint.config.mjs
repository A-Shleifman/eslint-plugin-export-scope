import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import eslintPlugin from "eslint-plugin-eslint-plugin";
import tseslint from "typescript-eslint";
import globals from "globals";

export default defineConfig(
  eslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/esLintPlugin/**/*.ts"],
    extends: [eslintPlugin.configs.recommended],
  },
  {
    files: ["tests/**/*.ts", "*.config.{ts,mts,cts}"],
    extends: [tseslint.configs.recommended],
  },
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  { ignores: ["**/node_modules", "dist", "test-project", "test-project-eslint-v8"] },
);
