module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:eslint-plugin/recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
  },
  ignorePatterns: ["**/node_modules", "test-project", "dist"],
  rules: { "@typescript-eslint/ban-types": "off" },
  overrides: [{ env: { node: true }, files: [".eslintrc.{js,cjs}"], parserOptions: { sourceType: "script" } }],
};
