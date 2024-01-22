module.exports = {
  root: true,
  extends: ["plugin:eslint-plugin-export-scope/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { project: true, tsconfigRootDir: __dirname },
  ignorePatterns: ["!.scope.ts"],
};
