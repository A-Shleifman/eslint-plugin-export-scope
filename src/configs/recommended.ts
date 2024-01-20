export = {
  parser: "@typescript-eslint/parser",
  plugins: ["export-scope"],
  rules: { "export-scope/no-imports-outside-export-scope": "error" },
};
