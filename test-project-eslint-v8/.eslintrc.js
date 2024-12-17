module.exports = {
  root: true,
  extends: ["plugin:@typescript-eslint/eslint-recommended", "plugin:eslint-plugin-export-scope/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { project: true, tsconfigRootDir: __dirname, sourceType: "module" },
  ignorePatterns: ["!.scope.ts"],

  overrides: [{ env: { node: true }, files: [".eslintrc.{js,cjs}"], parserOptions: { sourceType: "script" } }],
};
