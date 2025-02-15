import type { ClassicConfig } from "@typescript-eslint/utils/ts-eslint";

export = {
  parser: "@typescript-eslint/parser",
  parserOptions: { sourceType: "module" },
  plugins: ["export-scope"],
  rules: { "export-scope/no-imports-outside-export-scope": "error" },
} satisfies ClassicConfig.Config;
