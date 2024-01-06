"use strict";

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "export-scope"],
  // extends: [
  //   "eslint:recommended",
  //   "plugin:@typescript-eslint/recommended-type-checked",
  //   "plugin:@typescript-eslint/stylistic-type-checked",
  // ],
  ignorePatterns: [".eslintrc.js", "node_modules"],
  rules: { "export-scope/no-imports-outside-export-scope": "error" },
};
