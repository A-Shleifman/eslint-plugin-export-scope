"use strict";

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "import-access"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: [".eslintrc.js", "node_modules"],
  rules: {
    "import-access/private-export": [
      "error",
      {
        strictMode: true,
      },
    ],
  },
};
