"use strict";

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:import-access/recommended"],
  ignorePatterns: [".eslintrc.js", "node_modules"],
  rules: {
    "import-access/no-imports-outside-package": [
      "error",
      {
        strictMode: true,
      },
    ],
  },
};
