import type { ClassicConfig } from "@typescript-eslint/utils/ts-eslint";

export = {
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { sourceType: "module" },
  plugins: ["export-scope"],
  rules: { "export-scope/no-imports-outside-export-scope": "error" },
  ignorePatterns: ["!.scope.*", "!.scope.default.*"],
  overrides: [
    {
      files: ["**/.scope.{ts,js}", "**/.scope.default.{ts,js}"],
      processor: "export-scope/export-scope",
    },
  ],
} satisfies ClassicConfig.Config;
