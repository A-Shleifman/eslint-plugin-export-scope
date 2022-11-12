"use strict";

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:eslint-plugin/recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
  },
  ignorePatterns: [".eslintrc.js", "**/node_modules", "src/__tests__/project"],
};
