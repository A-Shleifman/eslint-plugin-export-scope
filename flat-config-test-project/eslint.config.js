// @ts-check

import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import exportScope from "eslint-plugin-export-scope";

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  plugins: { "export-scope": exportScope.plugin },
  rules: { "export-scope/no-imports-outside-export-scope": "error" },
  languageOptions: { parser: tseslint.parser, parserOptions: { project: true } },
  ignores: ["!.scope.ts"],
});
