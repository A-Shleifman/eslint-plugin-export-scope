"use strict";

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "export-scope"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: [".eslintrc.js", "node_modules"],
  rules: {
    "export-scope/no-imports-outside-export-scope": [
      "error",
      {
        strictMode: true,
      },
    ],
  },
};
